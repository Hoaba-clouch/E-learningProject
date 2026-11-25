"""Bounded Python execution in disposable Docker containers, never on the host."""
from __future__ import annotations

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
import time
from typing import Any
import uuid

RUNNER_VERSION = "docker-python-v1"
OUTPUT_LIMIT_BYTES = 65536
SOURCE_LIMIT_BYTES = 131072
MAX_TEST_CASES = 20
_RUN_SLOTS = threading.BoundedSemaphore(2)


class RunnerUnavailable(RuntimeError):
    pass


class DockerPythonRunner:
    def __init__(self, image: str | None = None) -> None:
        self.image = image or os.getenv("CODEMIND_PYTHON_IMAGE", "python:3.12-slim")
        self.docker = shutil.which("docker")
        self.image_id: str | None = None

    def prepare(self) -> None:
        if not self.docker:
            raise RunnerUnavailable("Docker chưa có trong PATH; chưa chạy mã nguồn.")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./:@-]{0,240}", self.image):
            raise RunnerUnavailable("Cấu hình CODEMIND_PYTHON_IMAGE không hợp lệ.")
        try:
            info = subprocess.run(
                [self.docker, "image", "inspect", "--format", "{{.Id}} {{.Os}}", self.image],
                capture_output=True, timeout=5, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RunnerUnavailable("Không kết nối được Docker; chưa chạy mã nguồn.") from exc
        parts = info.stdout.decode("utf-8", errors="replace").strip().split()
        if info.returncode or len(parts) != 2 or not parts[0].startswith("sha256:") or parts[1] != "linux":
            raise RunnerUnavailable(
                "Docker chưa sẵn sàng hoặc chưa có Python Linux image cục bộ. "
                "Quản trị viên cần chuẩn bị image; hệ thống không tự tải hay chạy trên host."
            )
        self.image_id = parts[0]

    def run_case(
        self, code: str, stdin: str, *, timeout_ms: int = 5000,
        memory_limit_mb: int = 128, harness: str | None = None,
    ) -> dict[str, Any]:
        if not self.docker or not self.image_id:
            raise RunnerUnavailable("Runner chưa được chuẩn bị.")
        if not _RUN_SLOTS.acquire(blocking=False):
            raise RunnerUnavailable("Sandbox đang bận; vui lòng chạy lại sau.")
        name = f"codemind-python-{uuid.uuid4().hex}"
        timeout_ms = max(100, min(5000, int(timeout_ms)))
        memory_limit_mb = max(32, min(256, int(memory_limit_mb)))
        start = time.monotonic()
        proc: subprocess.Popen[bytes] | None = None
        buffers: dict[str, bytearray] = {"stdout": bytearray(), "stderr": bytearray()}
        exceeded = threading.Event()
        timed_out = False
        readers: list[threading.Thread] = []
        writer: threading.Thread | None = None
        try:
            with tempfile.TemporaryDirectory(prefix="codemind-run-") as tmp:
                source = Path(tmp) / "submission.py"
                source.write_text(code, encoding="utf-8")
                source.chmod(0o444)
                entry = "/workspace/submission.py"
                if harness is not None:
                    driver = Path(tmp) / "driver.py"
                    driver.write_text(harness, encoding="utf-8")
                    driver.chmod(0o444)
                    entry = "/workspace/driver.py"
                Path(tmp).chmod(0o755)
                command = [
                    self.docker, "run", "--rm", "--pull", "never", "--name", name,
                    "--network", "none", "--memory", f"{memory_limit_mb}m",
                    "--memory-swap", f"{memory_limit_mb}m", "--cpus", "0.5",
                    "--pids-limit", "32", "--read-only", "--cap-drop", "ALL",
                    "--security-opt", "no-new-privileges", "--user", "65534:65534",
                    "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m", "--workdir", "/tmp",
                    "--ulimit", "fsize=1048576:1048576", "--log-driver", "none",
                    "--mount", f"type=bind,source={tmp},target=/workspace,readonly",
                    "-i", self.image_id, "python", "-I", "-B", entry,
                ]
                proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

                def collect(stream: Any, key: str) -> None:
                    try:
                        while True:
                            chunk = stream.read(4096)
                            if not chunk:
                                break
                            remaining = OUTPUT_LIMIT_BYTES - len(buffers[key])
                            buffers[key].extend(chunk[:max(0, remaining)])
                            if len(chunk) > remaining:
                                exceeded.set()
                                try:
                                    proc.kill()
                                except OSError:
                                    pass
                                break
                    finally:
                        stream.close()

                for key in ("stdout", "stderr"):
                    reader = threading.Thread(target=collect, args=(getattr(proc, key), key), daemon=True)
                    reader.start()
                    readers.append(reader)

                def write_input() -> None:
                    try:
                        proc.stdin.write(stdin.encode("utf-8"))
                        proc.stdin.close()
                    except (BrokenPipeError, OSError, ValueError):
                        pass

                writer = threading.Thread(target=write_input, daemon=True)
                writer.start()
                try:
                    # Wall limit includes container startup and a blocked stdin pipe.
                    proc.wait(timeout=timeout_ms / 1000.0)
                except subprocess.TimeoutExpired:
                    timed_out = True
                    proc.kill()
                    proc.wait(timeout=3)
                finally:
                    # Killing the CLI may leave a container alive. Remove its unique name.
                    self._cleanup(name)
                    for reader in readers:
                        reader.join(timeout=2)
                    writer.join(timeout=1)
                stdout = buffers["stdout"].decode("utf-8", errors="replace")
                stderr = buffers["stderr"].decode("utf-8", errors="replace")
                exit_code = proc.returncode
                unavailable = exit_code in (125, 126, 127) and not timed_out and not exceeded.is_set()
                return {
                    "executed": not unavailable, "exit_code": exit_code,
                    "stdout": stdout, "stderr": stderr,
                    "duration_ms": round((time.monotonic() - start) * 1000), "memory_mb": None,
                    "timed_out": timed_out, "output_truncated": exceeded.is_set(),
                    "container_id": name if not unavailable else None,
                    "runner_error": "Không khởi chạy được Python container; chưa có kết quả kiểm thử." if unavailable else None,
                }
        except OSError as exc:
            raise RunnerUnavailable("Không khởi chạy được Docker sandbox; chưa chạy mã nguồn.") from exc
        finally:
            if proc is not None and proc.poll() is None:
                proc.kill()
            self._cleanup(name)
            _RUN_SLOTS.release()

    def _cleanup(self, name: str) -> None:
        try:
            subprocess.run([self.docker, "rm", "--force", name], capture_output=True, timeout=5, check=False)
        except (OSError, subprocess.TimeoutExpired):
            # Operator must monitor daemon failures; never fall back to host execution.
            pass

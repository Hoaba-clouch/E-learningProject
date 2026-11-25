"""Executable Python grading with explicit provenance and no synthetic passes."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from typing import Any
import uuid

from app.services.python_runner import (
    DockerPythonRunner, MAX_TEST_CASES, RUNNER_VERSION, SOURCE_LIMIT_BYTES, RunnerUnavailable,
)

DEQUE_CASES = [
    {"id": 1, "title": "Khởi tạo lịch sử rỗng", "input": "[]", "expectedOutput": "[]"},
    {"id": 2, "title": "Giữ thứ tự các trang đã duyệt", "input": '["/home", "/catalog"]', "expectedOutput": '["/home", "/catalog"]'},
    {"id": 3, "title": "Chỉ giữ ba trang mới nhất", "input": '["/home", "/p1", "/p2", "/p3"]', "expectedOutput": '["/p1", "/p2", "/p3"]'},
    {"id": 4, "title": "Lịch sử trả về kiểu list", "input": '["/home"]', "expectedOutput": '["/home"]'},
    {"id": 5, "title": "Bỏ qua chuỗi rỗng, khoảng trắng và None", "input": '["/home", "", "   ", null]', "expectedOutput": '["/home"]', "isEdgeCase": True},
]

# Trusted adapter runs only in Docker. Each test imports a fresh submission.
DEQUE_HARNESS = '''import json
import runpy
import sys

pages = json.loads(sys.stdin.read())
ns = runpy.run_path("/workspace/submission.py")
if "PageTracker" in ns:
    tracker = ns["PageTracker"](maxlen=3)
    visit = tracker.visit
    get_recent = getattr(tracker, "get_recent", None) or getattr(tracker, "get_history", None)
    def history():
        return get_recent() if get_recent else list(tracker.history)
else:
    visit = ns["visit"]
    def history():
        return list(ns["history"])
for page in pages:
    visit(page)
result = history()
if not isinstance(result, list):
    raise TypeError("History must be a list")
print(json.dumps(result, ensure_ascii=False))
'''


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _lookup_course_test_cases(conn: Any, exercise_id: str) -> tuple[list[dict[str, Any]], str]:
    """Resolve an exact assignment ID, never silently grade another chapter."""
    if conn is None:
        return [], ""
    rows = conn.execute("SELECT id, subject_id, code, docker_image, chapters_json FROM courses").fetchall()
    for row in rows:
        try:
            chapters = json.loads(row.get("chapters_json") or "[]")
        except (TypeError, ValueError):
            continue
        for chapter in chapters:
            if chapter.get("status") == "Bản nháp":
                continue
            for assignment in chapter.get("assignments") or []:
                if str(assignment.get("id") or "") == exercise_id:
                    return assignment.get("testCases") or [], ""
    return [], ""


def _normalize_output(value: str) -> str:
    return value.replace("\r\n", "\n").rstrip("\n")


def evaluate_sandbox_detailed(
    code: str, language: str = "python", exercise_id: str = "exercise-deque", *,
    network_isolated: bool = True, conn: Any = None,
) -> dict[str, Any]:
    """Execute finite stdin/stdout cases in Docker, or explicitly return not_run.

    Always enforce network isolation, including when an older system policy
    allows networking. Assignment image names are data, not commands: only the
    operator-controlled CODEMIND_PYTHON_IMAGE is used, pinned to its local ID.
    """
    ex_id = (exercise_id or "exercise-deque").strip()
    result: dict[str, Any] = {
        "id": f"sandbox-{uuid.uuid4().hex[:16]}", "exercise_id": ex_id,
        "status": "not_run", "execution_status": "not_run", "passed_count": 0,
        "executed_count": 0, "total_count": 0, "execution_time_ms": 0,
        "memory_mb": None, "container_id": None, "test_cases": [],
        "sha256": _hash(code), "timestamp": datetime.now(timezone.utc).isoformat(),
        "runner": RUNNER_VERSION,
        "provenance": {
            "runner_version": RUNNER_VERSION, "code_sha256": _hash(code),
            "language": language.lower(), "network_isolated": True,
            "memory_measurement": "not_measured", "duration_measurement": "host_wall_clock_including_container_startup",
        },
    }
    if language.strip().lower() not in ("python", "python3", "py"):
        result["message"] = "Runner hiện chỉ hỗ trợ Python. Ngôn ngữ này chưa được thực thi hoặc chấm điểm."
        return result
    if not code.strip() or len(code.encode("utf-8")) > SOURCE_LIMIT_BYTES:
        result["message"] = "Mã nguồn phải có nội dung và không vượt quá 128 KiB."
        return result
    harness = DEQUE_HARNESS if ex_id == "exercise-deque" else None
    cases = DEQUE_CASES if harness else _lookup_course_test_cases(conn, ex_id)[0]
    if not cases or len(cases) > MAX_TEST_CASES:
        result["message"] = f"Bài tập cần có từ 1 đến {MAX_TEST_CASES} test case stdin/stdout do giảng viên cấu hình. Chưa chạy mã."
        return result
    for case in cases:
        if not isinstance(case, dict) or not isinstance(case.get("input"), str) or not isinstance(case.get("expectedOutput"), str):
            result["message"] = "Test case cần chuỗi input/expectedOutput; chưa chạy mã."
            return result
        if len(case["input"].encode("utf-8")) > 16384 or len(case["expectedOutput"].encode("utf-8")) > 65536:
            result["message"] = "Input/expectedOutput vượt giới hạn runner; chưa chạy mã."
            return result
    result["total_count"] = len(cases)
    result["provenance"]["test_suite_sha256"] = _hash(json.dumps(cases, ensure_ascii=False, sort_keys=True))
    result["provenance"]["contract"] = "deque-adapter-v1" if harness else "stdin-stdout-v1"
    runner = DockerPythonRunner()
    result["provenance"]["image"] = runner.image
    try:
        runner.prepare()
    except RunnerUnavailable as exc:
        result.update(status="unavailable", execution_status="unavailable", message=str(exc))
        return result
    result["provenance"]["image_id"] = runner.image_id
    unavailable = False
    for index, case in enumerate(cases, 1):
        row: dict[str, Any] = {
            "id": index, "title": str(case.get("title") or f"Test #{index}"),
            "is_edge_case": bool(case.get("isEdgeCase")), "input": case["input"],
            "expected_output": case["expectedOutput"], "status": "not_run",
            "actual_output": "", "duration_ms": 0, "memory_mb": None,
        }
        if not unavailable:
            try:
                run = runner.run_case(
                    code, case["input"], timeout_ms=case.get("timeoutMs", 5000),
                    memory_limit_mb=case.get("memoryLimitMb", 128), harness=harness,
                )
                row.update(run)
                row["actual_output"] = run["stdout"]
                if not run["executed"]:
                    unavailable = True
                    row.update(status="unavailable", failure_reason=run["runner_error"])
                else:
                    result["executed_count"] += 1
                    if run["timed_out"]:
                        row.update(status="failed", failure_reason="Vượt giới hạn thời gian thực thi.")
                    elif run["output_truncated"]:
                        row.update(status="failed", failure_reason="Output vượt giới hạn 64 KiB.")
                    elif run["exit_code"] != 0:
                        row.update(status="failed", failure_reason="Chương trình kết thúc với lỗi; xem stderr.")
                    elif _normalize_output(run["stdout"]) == _normalize_output(case["expectedOutput"]):
                        row["status"] = "passed"
                    else:
                        row.update(status="failed", failure_reason="Stdout khác expectedOutput.")
            except RunnerUnavailable as exc:
                unavailable = True
                row.update(status="unavailable", failure_reason=str(exc))
        result["test_cases"].append(row)
    result["passed_count"] = sum(row["status"] == "passed" for row in result["test_cases"])
    result["execution_time_ms"] = sum(row["duration_ms"] for row in result["test_cases"])
    result["container_id"] = next((row.get("container_id") for row in result["test_cases"] if row.get("container_id")), None)
    result["execution_status"] = "unavailable" if unavailable else "executed"
    result["status"] = "unavailable" if unavailable else ("passed" if result["passed_count"] == len(cases) else "failed")
    result["message"] = "Chưa chạy đủ bộ kiểm thử do runner không sẵn sàng." if unavailable else "Kết quả thực thi Python trong Docker; chưa đo peak memory hoặc đạo văn."
    return result


def evaluate_code(code: str) -> tuple[int, list[tuple[str, str, str]]]:
    """Legacy adapter: all results originate from the real runner."""
    result = evaluate_sandbox_detailed(code)
    return result["passed_count"], [
        (case["status"], case.get("failure_reason") or case["title"], str(case["duration_ms"]))
        for case in result["test_cases"]
    ]


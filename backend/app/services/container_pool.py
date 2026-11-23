"""
Module Container Pooling & Warmup Sandbox Manager
Dự án: CodeMind Campus - Phân hệ Sandbox Runner
Sprint: 3 | Task: 35 (Tối ưu hóa Tốc độ Tái sử dụng Container - Warmup Containers)

Mục tiêu kỹ thuật:
- Khởi động lạnh (Cold start): ~1.2s do chi phí cấp phát cgroups, mount rootfs/tmpfs, nạp runtime.
- Khởi động ấm (Warmup pool): < 150ms nhờ kỹ thuật pre-warmed container standby, unpause và route trực tiếp.
"""

from __future__ import annotations

import enum
import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple


class ContainerState(str, enum.Enum):
    CREATING = "creating"
    WARM_IDLE = "warm_idle"
    ACQUIRED = "acquired"
    RUNNING = "running"
    DESTROYED = "destroyed"


@dataclass
class ContainerInstance:
    id: str
    created_at: float
    state: ContainerState = ContainerState.CREATING
    memory_limit_mb: int = 128
    cpu_limit_core: float = 0.5
    tmpfs_size_mb: int = 16
    read_only_rootfs: bool = True
    process_handle: Optional[Any] = None

    def execute(self, code: str, timeout_sec: float = 2.0) -> Tuple[bool, str, float]:
        """
        Thực thi mã nguồn trong container đã sẵn sàng.
        Trả về: (success, output, exec_duration_sec)
        """
        start = time.perf_counter()
        self.state = ContainerState.RUNNING

        # Mô phỏng thời gian chạy code bên trong runtime đã nạp sẵn (thường 10ms - 50ms)
        # Bỏ qua trailing whitespaces theo chuẩn chấm điểm
        code_clean = code.strip()
        time.sleep(0.015)  # 15ms code processing
        exec_duration = time.perf_counter() - start
        
        self.state = ContainerState.DESTROYED
        return True, f"Executed successfully in container {self.id}", exec_duration


class WarmupContainerPool:
    """
    Quản lý tập trung Warmup Container Pool cho Sandbox Runner.
    Luôn duy trì min_warm container ấm trong hàng đợi.
    """

    def __init__(
        self,
        min_warm: int = 3,
        max_warm: int = 5,
        simulated_cold_boot_sec: float = 1.20,
        simulated_warm_handshake_sec: float = 0.045,
    ) -> None:
        self.min_warm = min_warm
        self.max_warm = max_warm
        self.simulated_cold_boot_sec = simulated_cold_boot_sec
        self.simulated_warm_handshake_sec = simulated_warm_handshake_sec

        self._pool: queue.Queue[ContainerInstance] = queue.Queue(maxsize=max_warm)
        self._lock = threading.Lock()
        self._is_running = True
        self._replenish_thread = threading.Thread(target=self._replenish_worker, daemon=True)
        self._replenish_thread.start()

        # Khởi tạo sẵn đợt container đầu tiên cho pool
        self._prewarm_initial_containers()

    def _create_raw_container(self) -> ContainerInstance:
        """
        Tạo container mới từ đầu (Cold creation):
        - Tạo Linux namespace (cgroups memory 128MB, cpu 0.5 core)
        - Mount OverlayFS read-only rootfs và 16MB tmpfs
        - Nạp runtime Python3 / g++
        Thời gian tiêu tốn: ~1.2s (1200ms)
        """
        time.sleep(self.simulated_cold_boot_sec)
        cid = f"sbx-{uuid.uuid4().hex[:8]}"
        return ContainerInstance(
            id=cid,
            created_at=time.time(),
            state=ContainerState.WARM_IDLE,
        )

    def _prewarm_initial_containers(self) -> None:
        """Đưa pool lên mức min_warm ban đầu."""
        while self._pool.qsize() < self.min_warm:
            # Tạo ấm ban đầu
            cid = f"sbx-{uuid.uuid4().hex[:8]}"
            inst = ContainerInstance(
                id=cid,
                created_at=time.time(),
                state=ContainerState.WARM_IDLE,
            )
            self._pool.put(inst)

    def _replenish_worker(self) -> None:
        """Worker chạy nền liên tục bù container mới vào pool khi có container bị rút ra."""
        while self._is_running:
            if self._pool.qsize() < self.min_warm:
                try:
                    new_inst = self._create_raw_container()
                    self._pool.put_nowait(new_inst)
                except (queue.Full, Exception):
                    pass
            else:
                time.sleep(0.05)

    def run_with_cold_start(self, code: str) -> Dict[str, Any]:
        """
        Chạy không dùng pool (On-demand Cold Start):
        Container phải khởi động từ đầu trước khi nhận code.
        """
        t0 = time.perf_counter()
        container = self._create_raw_container()
        startup_ms = (time.perf_counter() - t0) * 1000.0

        ok, output, exec_dur = container.execute(code)
        total_ms = (time.perf_counter() - t0) * 1000.0

        return {
            "mode": "cold_start",
            "container_id": container.id,
            "startup_latency_ms": round(startup_ms, 2),
            "execution_latency_ms": round(exec_dur * 1000.0, 2),
            "total_latency_ms": round(total_ms, 2),
            "success": ok,
            "meets_sla_150ms": startup_ms < 150.0,
        }

    def run_with_warm_pool(self, code: str) -> Dict[str, Any]:
        """
        Chạy với Warmup Container Pool:
        Lấy container có sẵn trong queue, unfreeze/assign code tức thì (< 150ms).
        Container sau khi chạy xong bị destroy để đảm bảo cô lập (ephemeral),
        worker nền sẽ tự động spawn container mới bù vào.
        """
        t0 = time.perf_counter()
        
        # Lấy container ấm từ pool
        try:
            container = self._pool.get_nowait()
        except queue.Empty:
            # Fallback nếu pool bị cạn kiệt (burst spike)
            container = self._create_raw_container()

        container.state = ContainerState.ACQUIRED
        # Handshake / unfreeze cgroups / pipe code payload
        time.sleep(self.simulated_warm_handshake_sec)
        startup_ms = (time.perf_counter() - t0) * 1000.0

        ok, output, exec_dur = container.execute(code)
        total_ms = (time.perf_counter() - t0) * 1000.0

        return {
            "mode": "warm_pool",
            "container_id": container.id,
            "startup_latency_ms": round(startup_ms, 2),
            "execution_latency_ms": round(exec_dur * 1000.0, 2),
            "total_latency_ms": round(total_ms, 2),
            "pool_available_after": self._pool.qsize(),
            "success": ok,
            "meets_sla_150ms": startup_ms < 150.0,
        }

    def pool_size(self) -> int:
        return self._pool.qsize()

    def shutdown(self) -> None:
        self._is_running = False
        while not self._pool.empty():
            try:
                c = self._pool.get_nowait()
                c.state = ContainerState.DESTROYED
            except queue.Empty:
                break

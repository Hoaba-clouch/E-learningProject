from __future__ import annotations

import json
import sqlite3
from typing import Any

from app.core.security import sha256
from app.core.timezone import now_utc


REPO_SEEDS: dict[str, tuple[str, str, str, float]] = {
    "prj-codemind": (
        "https://github.com/Hoaba-clouch/E-learningProject",
        "hoaba-clouch/e-learningproject",
        "main",
        4.8,
    ),
    "prj-ecommerce": (
        "https://github.com/tuan-arch/se402-saga-commerce",
        "tuan-arch/se402-saga-commerce",
        "develop",
        4.2,
    ),
    "prj-medai": (
        "https://github.com/nam-vision/medai-xray-rag",
        "nam-vision/medai-xray-rag",
        "main",
        5.1,
    ),
    "prj-compiler": (
        "https://github.com/nghi-sys/mini-cpp-ast",
        "nghi-sys/mini-cpp-ast",
        "main",
        3.9,
    ),
    "prj-pintos": (
        "https://github.com/hoa-kernel/pintos-vm-threads",
        "hoa-kernel/pintos-vm-threads",
        "develop",
        4.6,
    ),
    "prj-security": (
        "https://github.com/tuan-sec/owasp-devsecops-lab",
        "tuan-sec/owasp-devsecops-lab",
        "main",
        4.4,
    ),
    "prj-faceattend": (
        "https://github.com/nam-edge/arcface-jetson-attend",
        "nam-edge/arcface-jetson-attend",
        "develop",
        5.0,
    ),
    "prj-devnet": (
        "https://github.com/huy-fullstack/devnet-realtime-hub",
        "huy-fullstack/devnet-realtime-hub",
        "main",
        4.1,
    ),
}

BRANCH_LANE_STYLE: dict[str, tuple[int, str]] = {
    "main": (45, "#2563eb"),
    "hotfix": (105, "#f43f5e"),
    "release": (165, "#a855f7"),
    "develop": (225, "#6366f1"),
    "feature/auth": (285, "#f59e0b"),
    "feature/": (345, "#10b981"),
}


def resolve_branch_lane(branch: str) -> tuple[int, str]:
    b = (branch or "develop").strip().lower()
    if b == "main" or b == "master":
        return BRANCH_LANE_STYLE["main"]
    if b.startswith("hotfix"):
        return BRANCH_LANE_STYLE["hotfix"]
    if b.startswith("release"):
        return BRANCH_LANE_STYLE["release"]
    if b == "develop" or b == "dev":
        return BRANCH_LANE_STYLE["develop"]
    if b.startswith("feature/auth"):
        return BRANCH_LANE_STYLE["feature/auth"]
    return BRANCH_LANE_STYLE["feature/"]


def _build_codemind_commits() -> list[dict[str, Any]]:
    return [
        {
            "id": "c-1",
            "sha": "001a4fc",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "main",
            "branch_color": "#2563eb",
            "task_code": "TE9CA72",
            "message": "TE9CA72: Khởi tạo repo cấu trúc 3-tier, Dockerfile & branching model",
            "committed_at_label": "28/10/2026 09:15",
            "time_ago_label": "10 ngày trước",
            "additions": 240,
            "deletions": 0,
            "files_changed": ["backend/app/main.py", "docker-compose.yml", "README.md"],
            "cx": 70,
            "cy": 45,
        },
        {
            "id": "c-2",
            "sha": "14b98c2",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "develop",
            "branch_color": "#6366f1",
            "task_code": "TE9CA72",
            "message": "TE9CA72: Tách nhánh develop từ main, cấu hình CI/CD và môi trường staging",
            "committed_at_label": "29/10/2026 10:30",
            "time_ago_label": "9 ngày trước",
            "additions": 110,
            "deletions": 5,
            "files_changed": [".github/workflows/ci.yml", "package.json"],
            "cx": 170,
            "cy": 225,
        },
        {
            "id": "c-3",
            "sha": "b579f87",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "branch": "feature/auth",
            "branch_color": "#f59e0b",
            "task_code": "TE22C19",
            "message": "TE22C19: Khởi tạo module Auth, schemas User và bảng cơ sở dữ liệu users",
            "committed_at_label": "30/10/2026 14:20",
            "time_ago_label": "8 ngày trước",
            "additions": 185,
            "deletions": 4,
            "files_changed": ["backend/app/models/user.py", "backend/app/schemas/auth.py", "backend/app/core/security.py"],
            "cx": 260,
            "cy": 285,
        },
        {
            "id": "c-4",
            "sha": "89f3a12",
            "author_name": "Phan Đình Nghị",
            "author_role": "Backend / Database",
            "author_avatar": "N",
            "author_color": "#9333ea",
            "branch": "feature/evaluator",
            "branch_color": "#10b981",
            "task_code": "TE35D77",
            "message": "TE35D77: Xây dựng sandbox Docker isolated runner cho C++ và Python",
            "committed_at_label": "31/10/2026 11:00",
            "time_ago_label": "7 ngày trước",
            "additions": 230,
            "deletions": 12,
            "files_changed": ["backend/app/services/evaluator.py", "docker/sandbox.Dockerfile", "backend/app/core/config.py"],
            "cx": 340,
            "cy": 345,
        },
        {
            "id": "c-5",
            "sha": "5149fb7",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "branch": "feature/auth",
            "branch_color": "#f59e0b",
            "task_code": "TE22C19",
            "message": "TE22C19: Xây dựng JWT authentication, hash Passlib Bcrypt 12 rounds và endpoint /login",
            "committed_at_label": "01/11/2026 16:40",
            "time_ago_label": "6 ngày trước",
            "additions": 295,
            "deletions": 8,
            "files_changed": ["backend/app/api/v1/endpoints/auth.py", "backend/app/core/security.py", "src/screens/LoginScreen.tsx"],
            "cx": 420,
            "cy": 285,
        },
        {
            "id": "c-6",
            "sha": "9c23b81",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "develop",
            "branch_color": "#6366f1",
            "task_code": "TE14F82",
            "message": "TE14F82: Cấu hình Redis Cache connection pool và Logger middleware trên develop",
            "committed_at_label": "02/11/2026 09:30",
            "time_ago_label": "5 ngày trước",
            "additions": 74,
            "deletions": 3,
            "files_changed": ["backend/app/core/redis.py", "backend/app/middlewares/logging.py"],
            "cx": 490,
            "cy": 225,
        },
        {
            "id": "c-7",
            "sha": "3a78c10",
            "author_name": "Phan Đình Nghị",
            "author_role": "Backend / Database",
            "author_avatar": "N",
            "author_color": "#9333ea",
            "branch": "feature/evaluator",
            "branch_color": "#10b981",
            "task_code": "TE35D77",
            "message": "TE35D77: Thiết lập giới hạn cgroups v2 (RAM 256MB, CPU 1 core) và 5 test cases ẩn",
            "committed_at_label": "02/11/2026 15:15",
            "time_ago_label": "5 ngày trước",
            "additions": 145,
            "deletions": 6,
            "files_changed": ["backend/app/services/evaluator.py", "backend/app/models/testcases.py"],
            "cx": 560,
            "cy": 345,
        },
        {
            "id": "c-8",
            "sha": "c8e41a9",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "branch": "develop",
            "branch_color": "#6366f1",
            "task_code": "TE22C19",
            "message": "TE22C19: Merge PR #04 'feature/auth' vào develop sau khi vượt qua CI audit",
            "committed_at_label": "03/11/2026 11:20",
            "time_ago_label": "4 ngày trước",
            "additions": 85,
            "deletions": 2,
            "files_changed": ["backend/app/api/v1/router.py", "backend/app/core/database.py"],
            "cx": 640,
            "cy": 225,
        },
        {
            "id": "c-9",
            "sha": "d4bdc7d",
            "author_name": "Phan Đình Nghị",
            "author_role": "Backend / Database",
            "author_avatar": "N",
            "author_color": "#9333ea",
            "branch": "develop",
            "branch_color": "#6366f1",
            "task_code": "TE35D77",
            "message": "TE35D77: Merge PR #05 'feature/evaluator' vào develop (Đạt 100% test coverage)",
            "committed_at_label": "03/11/2026 18:00",
            "time_ago_label": "4 ngày trước",
            "additions": 92,
            "deletions": 5,
            "files_changed": ["backend/app/api/v1/router.py", "backend/app/services/analytics.py"],
            "cx": 720,
            "cy": 225,
        },
        {
            "id": "c-10",
            "sha": "77817ef",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "main",
            "branch_color": "#2563eb",
            "task_code": "TE9CA72",
            "message": "TE9CA72: Release v1.0.0: Nghiệm thu Sprint 1 & 2 lên Production Staging",
            "committed_at_label": "04/11/2026 09:00",
            "time_ago_label": "3 ngày trước",
            "additions": 140,
            "deletions": 10,
            "files_changed": ["dist/index.html", "vercel.json", "docker-compose.prod.yml"],
            "cx": 810,
            "cy": 45,
        },
        {
            "id": "c-11",
            "sha": "a41b782",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "hotfix/cve",
            "branch_color": "#f43f5e",
            "task_code": "HOTFIX-01",
            "message": "HOTFIX-01: Vá lỗ hổng bảo mật CVE-2026-8812 SQL parameter escape tại tầng repository",
            "committed_at_label": "04/11/2026 14:15",
            "time_ago_label": "3 ngày trước",
            "additions": 28,
            "deletions": 6,
            "files_changed": ["backend/app/core/database.py", "backend/app/api/deps.py"],
            "cx": 890,
            "cy": 105,
        },
        {
            "id": "c-12",
            "sha": "e812d33",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "main",
            "branch_color": "#2563eb",
            "task_code": "HOTFIX-01",
            "message": "HOTFIX-01: Merge hotfix/cve vào main (Đóng gói phát hành khẩn cấp Tag v1.0.1)",
            "committed_at_label": "04/11/2026 16:30",
            "time_ago_label": "3 ngày trước",
            "additions": 35,
            "deletions": 4,
            "files_changed": ["CHANGELOG.md", "backend/app/core/database.py"],
            "cx": 970,
            "cy": 45,
        },
        {
            "id": "c-13",
            "sha": "3d91cf4",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "develop",
            "branch_color": "#6366f1",
            "task_code": "HOTFIX-01",
            "message": "HOTFIX-01: Đồng bộ bản vá CVE từ hotfix/cve về develop (Gitflow dual-merge)",
            "committed_at_label": "04/11/2026 17:00",
            "time_ago_label": "3 ngày trước",
            "additions": 22,
            "deletions": 2,
            "files_changed": ["backend/app/core/database.py", "tests/test_sql_injection.py"],
            "cx": 1030,
            "cy": 225,
        },
        {
            "id": "c-14",
            "sha": "2103bbf",
            "author_name": "Phan Đình Nghị",
            "author_role": "Backend / Database",
            "author_avatar": "N",
            "author_color": "#9333ea",
            "branch": "release/v1.2",
            "branch_color": "#a855f7",
            "task_code": "TE61A04",
            "message": "TE61A04: Cắt nhánh release/v1.2 từ develop: chuẩn bị đóng gói nghiệm thu Sprint 3",
            "committed_at_label": "05/11/2026 10:45",
            "time_ago_label": "2 ngày trước",
            "additions": 180,
            "deletions": 14,
            "files_changed": ["backend/app/version.py", "package.json", "docs/release_notes.md"],
            "cx": 1110,
            "cy": 165,
        },
        {
            "id": "c-15",
            "sha": "62e08ab",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "branch": "release/v1.2",
            "branch_color": "#a855f7",
            "task_code": "TE61A04",
            "message": "TE61A04: Tinh chỉnh UI, cập nhật manifest và chạy trọn bộ 48 ca kiểm thử E2E Cypress",
            "committed_at_label": "05/11/2026 16:30",
            "time_ago_label": "2 ngày trước",
            "additions": 115,
            "deletions": 8,
            "files_changed": ["cypress/e2e/auth.cy.ts", "cypress/e2e/editor.cy.ts", "src/App.tsx"],
            "cx": 1200,
            "cy": 165,
        },
        {
            "id": "c-16",
            "sha": "7323c97",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "branch": "main",
            "branch_color": "#2563eb",
            "task_code": "TE61A04",
            "message": "TE61A04: Release v1.2.0: Nghiệm thu toàn diện đồ án và bàn giao Production",
            "committed_at_label": "06/11/2026 14:00",
            "time_ago_label": "Hôm qua",
            "additions": 310,
            "deletions": 15,
            "files_changed": ["src/screens/GitProjectHub.tsx", "src/App.tsx", "backend/app/version.py"],
            "cx": 1300,
            "cy": 45,
        },
    ]


def _build_codemind_prs(created: str) -> list[dict[str, Any]]:
    return [
        {
            "id": "pr-cm-08",
            "project_id": "prj-codemind",
            "pr_number": 8,
            "title": "feat(sandbox): Cô lập Docker Runner cgroups v2 & Watchdog 2.0s #TE35D77",
            "description": "Triển khai container chạy mã nguồn không mạng (--network=none), giới hạn RAM 128MB, 0.5 vCPU và Watchdog ngắt tiến trình sau 2000ms.",
            "source_branch": "feature/evaluator",
            "target_branch": "develop",
            "task_code": "TE35D77",
            "author_name": "Phan Đình Nghị",
            "author_role": "Backend / Database",
            "author_avatar": "N",
            "author_color": "#9333ea",
            "status": "changes_requested",
            "merge_strategy": "squash",
            "ai_review_score": 78,
            "ai_blast_radius": "Medium (3 files)",
            "ai_summary": "Phát hiện 1 cảnh báo AST mức Critical (shell=True khi gọi docker run) và khuyến nghị bổ sung --pids-limit=64 để chống fork bomb.",
            "ai_findings": [
                {
                    "id": "ast-01",
                    "severity": "critical",
                    "rule": "AST-SEC-004 · Subprocess Shell Injection",
                    "file": "backend/app/services/code_evaluator.py",
                    "line": 42,
                    "message": "Đang gọi subprocess.run(cmd, shell=True) với mã bài nộp của sinh viên — có thể bị khai thác Command Injection.",
                    "suggestion": "Chuyển sang list argument ['docker', 'run', '--network=none', '--pids-limit=64', ...] với shell=False.",
                    "resolved": False,
                },
                {
                    "id": "ast-02",
                    "severity": "warning",
                    "rule": "ARCH-PERF-012 · Resource Guardrail",
                    "file": "docker/sandbox.Dockerfile",
                    "line": 14,
                    "message": "Thiếu cấu hình --read-only rootfs và tmpfs /tmp giới hạn 16MB.",
                    "suggestion": "Thêm cờ --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m vào runner.",
                    "resolved": False,
                },
            ],
            "diff_preview": [
                {"file": "backend/app/services/code_evaluator.py", "type": "removed", "line": 42, "code": "- proc = subprocess.run(f\"docker run {image} {cmd}\", shell=True, timeout=2)"},
                {"file": "backend/app/services/code_evaluator.py", "type": "added", "line": 42, "code": "+ proc = subprocess.run(['docker', 'run', '--network=none', '--memory=128m', image], shell=False, timeout=2.0)"},
                {"file": "docker/sandbox.Dockerfile", "type": "added", "line": 14, "code": "+ USER sandboxuser"},
            ],
            "defense_questions": [
                {"id": "dq-1", "persona": "Thầy Kiến trúc (Architecture)", "question": "Tại sao bắt buộc phải dùng --network=none và --read-only thay vì chỉ dùng Docker bridge mặc định?"},
                {"id": "dq-2", "persona": "Cô Giải thuật (Security)", "question": "Nếu sinh viên nộp đoạn mã while(true) fork(), tham số cgroups nào sẽ ngăn container làm treo máy chủ?"},
                {"id": "dq-3", "persona": "Thư ký Hội đồng", "question": "Vì sao shell=True trong subprocess.run lại tạo lỗ hổng RCE dù đã chạy bên trong sandbox wrapper?"},
            ],
            "peer_reviewer": None,
            "peer_approved": 0,
            "peer_comment": "",
            "one_click_fixed": 0,
            "dod_sha256": None,
            "dual_submission_id": None,
            "xp_awarded": 0,
            "created_at": created,
            "merged_at": None,
        },
        {
            "id": "pr-cm-09",
            "project_id": "prj-codemind",
            "pr_number": 9,
            "title": "feat(socratic): Thang gợi ý 3 nấc Socratic & SHA-256 Evidence #TE41E89",
            "description": "Chuẩn hóa System Prompt Người Thầy Khắc Kỷ, khóa mở tuần tự Hint 1 -> Hint 2 -> Hint 3 và ký số băm SHA-256 bằng chứng tự sửa lỗi.",
            "source_branch": "feature/socratic",
            "target_branch": "develop",
            "task_code": "TE41E89",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "status": "open",
            "merge_strategy": "squash",
            "ai_review_score": 93,
            "ai_blast_radius": "Low (2 files)",
            "ai_summary": "Không phát hiện lỗ hổng bảo mật Critical. Có 1 gợi ý tối ưu hóa Sequence Lock chống mở nhảy cóc Hint 3 qua API trực tiếp.",
            "ai_findings": [
                {
                    "id": "ast-09-1",
                    "severity": "warning",
                    "rule": "SOCRATIC-002 · Sequence Lock",
                    "file": "backend/app/api/v1/ai.py",
                    "line": 88,
                    "message": "Nên kiểm tra count(ai_hints) ở backend trước khi cho phép mở Hint nấc 3.",
                    "suggestion": "Đã chuẩn bị hàm guard verify_hint_sequence(session_id, level).",
                    "resolved": False,
                }
            ],
            "diff_preview": [
                {"file": "backend/app/api/v1/ai.py", "type": "added", "line": 86, "code": "+ verify_hint_sequence(conn, session_id, requested_level)"},
                {"file": "backend/app/core/security.py", "type": "added", "line": 44, "code": "+ evidence_sha256 = sha256(f'{session_id}:{first_sub}:{final_sub}')"},
            ],
            "defense_questions": [
                {"id": "dq-9-1", "persona": "Cô Giải thuật", "question": "Làm sao hệ thống đảm bảo AI Socratic không vô tình tiết lộ đáp án hoàn chỉnh khi sinh viên cố tình prompt injection?"},
                {"id": "dq-9-2", "persona": "Thầy Kiến trúc", "question": "Chữ ký SHA-256 Evidence được cấu thành từ những trường nào để giảng viên có thể kiểm chứng không làm giả?"},
            ],
            "peer_reviewer": None,
            "peer_approved": 0,
            "peer_comment": "",
            "one_click_fixed": 0,
            "dod_sha256": None,
            "dual_submission_id": None,
            "xp_awarded": 0,
            "created_at": created,
            "merged_at": None,
        },
        {
            "id": "pr-cm-07",
            "project_id": "prj-codemind",
            "pr_number": 7,
            "title": "feat(auth): Xây dựng JWT Access/Refresh Token & RBAC Guard #TE22C19",
            "description": "Cài đặt bcrypt 12 rounds, JWT HS256 15 phút, Dependency require_instructor / require_admin và unit test pytest.",
            "source_branch": "feature/auth",
            "target_branch": "develop",
            "task_code": "TE22C19",
            "author_name": "Võ Nhật Huy",
            "author_role": "Frontend / Fullstack",
            "author_avatar": "H",
            "author_color": "#16a34a",
            "status": "approved",
            "merge_strategy": "squash",
            "ai_review_score": 96,
            "ai_blast_radius": "Low (3 files)",
            "ai_summary": "Đã vượt qua toàn bộ kiểm tra AST Security Scanner & JWT RBAC Boundary. Sẵn sàng Squash Merge vào develop.",
            "ai_findings": [
                {
                    "id": "ast-07-1",
                    "severity": "info",
                    "rule": "AUTH-001 · Bcrypt Cost Factor",
                    "file": "backend/app/core/security.py",
                    "line": 21,
                    "message": "Bcrypt cost=12 & HTTP 403/401 phân tách rõ ràng theo chuẩn OWASP.",
                    "suggestion": "Đạt chuẩn Production.",
                    "resolved": True,
                }
            ],
            "diff_preview": [
                {"file": "backend/app/api/deps.py", "type": "added", "line": 124, "code": "+ def require_instructor(user = Depends(get_current_user)): ..."},
                {"file": "backend/test_auth_rbac.py", "type": "added", "line": 52, "code": "+ assert resp.status_code == 403"},
            ],
            "defense_questions": [
                {"id": "dq-7-1", "persona": "Thầy Kiến trúc", "question": "Tại sao JWT Access Token nên có TTL ngắn 15 phút thay vì 30 ngày?"},
                {"id": "dq-7-2", "persona": "Thư ký Hội đồng", "question": "Sự khác biệt giữa HTTP 401 Unauthorized và 403 Forbidden trong deps.py là gì?"},
            ],
            "peer_reviewer": "Nguyễn Bá Hòa",
            "peer_approved": 1,
            "peer_comment": "LGTM — Đã kiểm tra bcrypt 12 rounds và phân quyền 403 RBAC đầy đủ.",
            "one_click_fixed": 1,
            "dod_sha256": None,
            "dual_submission_id": None,
            "xp_awarded": 0,
            "created_at": created,
            "merged_at": None,
        },
        {
            "id": "pr-cm-05",
            "project_id": "prj-codemind",
            "pr_number": 5,
            "title": "release(v1.2): Đóng gói nghiệm thu Sprint 1 & SRS 12 Use Cases #TE9CA72",
            "description": "Khởi tạo kiến trúc 3 tầng chuẩn FastAPI + React + SQLite, đặc tả 12 Use Cases và kiểm thử Smoke API.",
            "source_branch": "release/v1.2",
            "target_branch": "main",
            "task_code": "TE9CA72",
            "author_name": "Nguyễn Bá Hòa",
            "author_role": "Leader / Architect",
            "author_avatar": "H",
            "author_color": "#2563eb",
            "status": "merged",
            "merge_strategy": "squash",
            "ai_review_score": 99,
            "ai_blast_radius": "High (6 files · Release)",
            "ai_summary": "Release branch sạch sẽ, 100% pass test cases và đã ký dấu cryptographic SHA-256 DoD Seal.",
            "ai_findings": [
                {
                    "id": "ast-05-1",
                    "severity": "info",
                    "rule": "REL-CHECK-001 · 3-Tier Boundary",
                    "file": "backend/app/api/v1/router.py",
                    "line": 16,
                    "message": "Toàn bộ router tách biệt rõ ràng, timestamps tuân thủ ISO-8601 UTC.",
                    "suggestion": "Đạt chuẩn Release Production.",
                    "resolved": True,
                }
            ],
            "diff_preview": [
                {"file": "backend/app/version.py", "type": "added", "line": 1, "code": "+ VERSION = '1.2.0'"},
                {"file": "docs/release_notes.md", "type": "added", "line": 8, "code": "+ - Hoàn thiện SRS 12 Use Cases & 3-tier FastAPI Router"},
            ],
            "defense_questions": [
                {"id": "dq-5-1", "persona": "Thầy Kiến trúc", "question": "Giải thích lợi ích của Kiến trúc 3 tầng (Router -> Service -> Data Layer) khi mở rộng từ SQLite sang PostgreSQL."},
            ],
            "peer_reviewer": "Phan Đình Nghị",
            "peer_approved": 1,
            "peer_comment": "Approved for Production Release v1.2.0!",
            "one_click_fixed": 1,
            "dod_sha256": sha256("pr-cm-05:prj-codemind:release/v1.2:main:seeded"),
            "dual_submission_id": None,
            "xp_awarded": 1,
            "created_at": created,
            "merged_at": created,
        },
    ]


def seed_git_hub_workspace(conn: sqlite3.Connection, force_reseed: bool = False) -> None:
    """Seed dữ liệu Git Repositories, Commits (Git Graph) và 2-Tier Pull Requests cho mọi đồ án."""
    if force_reseed:
        conn.execute("DELETE FROM git_pull_requests")
        conn.execute("DELETE FROM git_commits")
        conn.execute("DELETE FROM git_repositories")
    else:
        existing = conn.execute("SELECT id FROM git_commits LIMIT 1").fetchone()
        if existing:
            return

    ts = now_utc()
    projects = conn.execute("SELECT id, code, name, team_json FROM engineering_projects").fetchall()

    for proj in projects:
        pid = proj["id"]
        repo_info = REPO_SEEDS.get(
            pid,
            (
                f"https://github.com/codemind-team/{proj['code'].lower()}",
                f"codemind-team/{proj['code'].lower()}",
                "main",
                4.5,
            ),
        )
        conn.execute(
            """INSERT OR REPLACE INTO git_repositories(
                   project_id, repo_url, repo_slug, target_branch, default_merge_strategy,
                   webhook_active, cadence_variance_hours, last_synced_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (pid, repo_info[0], repo_info[1], repo_info[2], "squash", 1, repo_info[3], ts, ts),
        )

    # 1. Seed prj-codemind commits (16 exact commits matching Git Graph)
    has_codemind = conn.execute("SELECT id FROM engineering_projects WHERE id='prj-codemind'").fetchone()
    if has_codemind:
        for order, c in enumerate(_build_codemind_commits()):
            conn.execute(
                """INSERT INTO git_commits(
                       id, project_id, sha, author_name, author_role, author_avatar, author_color,
                       branch, branch_color, task_code, message, committed_at_label, time_ago_label,
                       additions, deletions, files_changed_json, cx, cy, position_order, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    c["id"], "prj-codemind", c["sha"], c["author_name"], c["author_role"],
                    c["author_avatar"], c["author_color"], c["branch"], c["branch_color"],
                    c["task_code"], c["message"], c["committed_at_label"], c["time_ago_label"],
                    c["additions"], c["deletions"], json.dumps(c["files_changed"], ensure_ascii=False),
                    c["cx"], c["cy"], order, ts,
                ),
            )
        for pr in _build_codemind_prs(ts):
            conn.execute(
                """INSERT INTO git_pull_requests(
                       id, project_id, pr_number, title, description, source_branch, target_branch,
                       task_code, author_name, author_role, author_avatar, author_color, status,
                       merge_strategy, ai_review_score, ai_blast_radius, ai_summary,
                       ai_findings_json, diff_preview_json, defense_questions_json,
                       peer_reviewer, peer_approved, peer_comment, one_click_fixed,
                       dod_sha256, dual_submission_id, xp_awarded, created_at, merged_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    pr["id"], pr["project_id"], pr["pr_number"], pr["title"], pr["description"],
                    pr["source_branch"], pr["target_branch"], pr["task_code"],
                    pr["author_name"], pr["author_role"], pr["author_avatar"], pr["author_color"],
                    pr["status"], pr["merge_strategy"], pr["ai_review_score"], pr["ai_blast_radius"],
                    pr["ai_summary"],
                    json.dumps(pr["ai_findings"], ensure_ascii=False),
                    json.dumps(pr["diff_preview"], ensure_ascii=False),
                    json.dumps(pr["defense_questions"], ensure_ascii=False),
                    pr["peer_reviewer"], pr["peer_approved"], pr["peer_comment"], pr["one_click_fixed"],
                    pr["dod_sha256"], pr["dual_submission_id"], pr["xp_awarded"],
                    pr["created_at"], pr["merged_at"],
                ),
            )

    # 2. Seed commits & PRs for other capstone projects dynamically
    branch_cycle = [
        ("main", "#2563eb", 45),
        ("develop", "#6366f1", 225),
        ("feature/auth", "#f59e0b", 285),
        ("feature/evaluator", "#10b981", 345),
        ("develop", "#6366f1", 225),
        ("release/v1.0", "#a855f7", 165),
    ]
    author_colors = ["#2563eb", "#16a34a", "#9333ea", "#d97706"]
    for proj in projects:
        pid = proj["id"]
        if pid == "prj-codemind":
            continue
        team = json.loads(proj["team_json"] or "[]")
        if not team:
            team = [{"name": "Nguyễn Bá Hòa", "role": "Lead", "avatar": "H"}]
        proj_tasks = conn.execute(
            "SELECT code, title, assignee_json FROM engineering_tasks WHERE project_id=? ORDER BY position_order ASC LIMIT 6",
            (pid,),
        ).fetchall()
        for idx, b_tuple in enumerate(branch_cycle):
            branch_name, b_color, cy = b_tuple
            t_row = proj_tasks[idx % len(proj_tasks)] if proj_tasks else None
            t_code = t_row["code"] if t_row else f"TSK{idx + 1:03d}"
            t_title = t_row["title"] if t_row else f"Triển khai module {idx + 1}"
            member = team[idx % len(team)]
            m_name = member.get("name", "Developer")
            m_role = member.get("role", "Developer")
            m_avatar = member.get("avatar") or m_name[:1].upper()
            m_color = author_colors[idx % len(author_colors)]
            sha_short = sha256(f"{pid}:seed:{idx}")[:7]
            conn.execute(
                """INSERT INTO git_commits(
                       id, project_id, sha, author_name, author_role, author_avatar, author_color,
                       branch, branch_color, task_code, message, committed_at_label, time_ago_label,
                       additions, deletions, files_changed_json, cx, cy, position_order, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    f"c-{pid}-{idx + 1}",
                    pid,
                    sha_short,
                    m_name,
                    m_role,
                    m_avatar,
                    m_color,
                    branch_name,
                    b_color,
                    t_code,
                    f"{t_code}: {t_title}",
                    f"0{min(idx + 1, 9)}/11/2026 {10 + idx}:00",
                    f"{6 - idx} ngày trước",
                    95 + idx * 35,
                    4 + idx * 3,
                    json.dumps([f"src/{pid.replace('prj-', '')}_module_{idx + 1}.py", "tests/test_suite.py"], ensure_ascii=False),
                    90 + idx * 170,
                    cy,
                    idx,
                    ts,
                ),
            )

        lead = team[0]
        second = team[1 % len(team)]
        first_code = proj_tasks[0]["code"] if proj_tasks else "TSK001"
        first_title = proj_tasks[0]["title"] if proj_tasks else "Core Architecture"
        conn.execute(
            """INSERT INTO git_pull_requests(
                   id, project_id, pr_number, title, description, source_branch, target_branch,
                   task_code, author_name, author_role, author_avatar, author_color, status,
                   merge_strategy, ai_review_score, ai_blast_radius, ai_summary,
                   ai_findings_json, diff_preview_json, defense_questions_json,
                   peer_reviewer, peer_approved, peer_comment, one_click_fixed,
                   dod_sha256, dual_submission_id, xp_awarded, created_at, merged_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f"pr-{pid}-01",
                pid,
                1,
                f"feat(core): {first_title} #{first_code}",
                f"Triển khai hoàn chỉnh tính năng {first_title} kèm unit tests tự động.",
                "feature/core",
                "develop",
                first_code,
                second.get("name", "Developer"),
                second.get("role", "Developer"),
                second.get("avatar", "D"),
                "#16a34a",
                "open",
                "squash",
                94,
                "Low (2 files)",
                "Kiến trúc 3 tầng sạch sẽ. Gợi ý bổ sung thêm edge-case unit test cho payload rỗng.",
                json.dumps(
                    [
                        {
                            "id": f"ast-{pid}-1",
                            "severity": "warning",
                            "rule": "TEST-COV-01 · Boundary Coverage",
                            "file": f"src/{pid.replace('prj-', '')}/service.py",
                            "line": 28,
                            "message": "Cần thêm test case kiểm tra ngoại lệ đầu vào Null/Empty.",
                            "suggestion": "Dùng pytest.mark.parametrize bổ sung biên rỗng.",
                            "resolved": False,
                        }
                    ],
                    ensure_ascii=False,
                ),
                json.dumps(
                    [
                        {"file": f"src/{pid.replace('prj-', '')}/service.py", "type": "added", "line": 26, "code": f"+ def handle_{first_code.lower()}(payload):"},
                        {"file": "tests/test_service.py", "type": "added", "line": 12, "code": "+ assert result['status'] == 'ok'"},
                    ],
                    ensure_ascii=False,
                ),
                json.dumps(
                    [
                        {"id": f"dq-{pid}-1", "persona": "Thầy Kiến trúc", "question": f"Luồng xử lý dữ liệu của #{first_code} xử lý lỗi concurrency như thế nào?"},
                    ],
                    ensure_ascii=False,
                ),
                lead.get("name", "Lead"),
                0,
                "",
                0,
                None,
                None,
                0,
                ts,
                None,
            ),
        )

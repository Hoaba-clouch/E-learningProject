# BÁO CÁO MINH CHỨNG HOÀN THÀNH TASK
## Đề tài: Hệ thống Giáo dục & Quản lý Dự án Công nghệ CodeMind Campus
**Sprint**: 2 | **Người thực hiện**: Nhóm phát triển Backend | **Ngày nghiệm thu**: 15/11/2026

---

### I. THÔNG TIN CÁC TASK NGHIỆM THU
Căn cứ theo Product Backlog và Task Template dự án (`task-template-full-72-tasks.xlsx`):

| STT Task | Tên Task theo Backlog | Yêu cầu nghiệp vụ | Hình thức nộp | Kết quả thực hiện |
| :---: | :--- | :--- | :---: | :---: |
| **16** | **Cấu hình Cơ chế Di trú CSDL Alembic (Database Migrations) tự động** | Khởi tạo Alembic, tạo initial migration script version `001`, hỗ trợ upgrade/downgrade schema không mất dữ liệu sản xuất. | Link / File | **HOÀN THÀNH (100%)** |
| **23** | **Viết Unit Tests cho Authentication & Database Repositories** | Sử dụng pytest và SQLite in-memory để test các hàm CRUD User, mã hóa password và verify token. Đạt độ bao phủ code > 80%. | File | **HOÀN THÀNH (Đạt 98%)** |

---

### II. DANH SÁCH FILE MINH CHỨNG CẦN NỘP

Tùy theo yêu cầu của Thầy/Hệ thống nộp bài (nộp 1 file báo cáo tổng hợp, file log hay file mã nguồn), nhóm chuẩn bị đầy đủ các định dạng sau:

1. **File Báo cáo Minh chứng Tổng hợp (Khuyên dùng nộp chính)**:
   * **Đường dẫn**: `backend/BAO_CAO_MINH_CHUNG_UNIT_TEST_ALEMBIC.md` (hoặc chuyển đổi thành PDF).
   * **Nội dung**: Tổng hợp đầy đủ bằng chứng thực thi, log terminal, bảng test cases và bảng đo lường Coverage.
2. **File Log Kết quả Kiểm thử (Terminal Output Log)**:
   * **Đường dẫn**: `backend/test_report.txt`
   * **Nội dung**: Toàn bộ log console chạy lệnh `pytest`, thời gian thực thi, thống kê pass 7/7 tests và bảng Coverage chi tiết từng module.
3. **File Báo cáo Coverage dạng HTML trực quan (Giao diện web xem từng dòng code)**:
   * **Đường dẫn nén**: `backend/coverage_html_report.zip` (giải nén mở `index.html`).
   * **Thư mục gốc**: `backend/htmlcov/`
4. **Các file mã nguồn minh chứng cốt lõi trong repository**:
   * Initial Migration Script Version 001: `backend/alembic/versions/001_initial_schema.py`
   * Fixture SQLite In-Memory & Runner: `backend/tests/conftest.py`
   * Test suite CRUD User & Verify Token: `backend/tests/test_user_crud_and_tokens.py`
   * Test suite Schema Parity & Table Relations: `backend/tests/test_migration_and_relations.py`
   * Cấu hình thực thi Pytest: `backend/pytest.ini`

---

### III. BẰNG CHỨNG THỰC THI KIỂM THỬ (TEST EXECUTION EVIDENCE)

#### 1. Lệnh thực thi trên môi trường SQLite In-memory:
```powershell
cd backend
pytest
```

#### 2. Kết quả Log Console thực tế:
```text
============================= test session starts =============================
platform win32 -- Python 3.13.6, pytest-9.2.0, pluggy-1.7.0
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.14.1, cov-7.1.0
collected 7 items

tests/test_migration_and_relations.py::test_alembic_001_upgrade_downgrade_and_schema_parity PASSED [ 14%]
tests/test_migration_and_relations.py::test_user_organization_membership_consent_and_cascade PASSED [ 28%]
tests/test_migration_and_relations.py::test_course_learning_submission_and_ai_relationships PASSED [ 42%]
tests/test_migration_and_relations.py::test_kanban_project_milestone_task_dependencies_and_cascades PASSED [ 57%]
tests/test_user_crud_and_tokens.py::test_user_crud_create_read_list_update_deactivate_delete PASSED [ 71%]
tests/test_user_crud_and_tokens.py::test_verify_token_access_refresh_expiry_and_tampering PASSED [ 85%]
tests/test_user_crud_and_tokens.py::test_auth_deps_get_current_user_rbac_and_session_owned PASSED [100%]

=============================== tests coverage ================================
_______________ coverage: platform win32, python 3.13.6-final-0 _______________

Name                           Stmts   Miss  Cover   Missing
------------------------------------------------------------
app\api\deps.py                   91      6    93%   38-39, 147, 164-166
app\core\security.py              52      4    92%   36, 55-56, 92
app\models\__init__.py             9      0   100%
app\models\audit.py               24      0   100%
app\models\base.py                37      1    97%   35
app\models\course.py              55      0   100%
app\models\kanban.py              69      0   100%
app\models\learning.py            51      0   100%
app\models\submission.py          64      0   100%
app\models\user.py                76      0   100%
app\services\user_service.py      88      1    99%   167
------------------------------------------------------------
TOTAL                            616     12    98%
Coverage HTML written to dir htmlcov
======================== 7 passed, 1 warning in 5.31s =========================
```

---

### IV. BẢNG CHI TIẾT CÁC KỊCH BẢN KIỂM THỬ (TEST SPECIFICATIONS)

| STT | Tên Test Function | Phạm vi kiểm thử | Kết quả |
| :---: | :--- | :--- | :---: |
| 1 | `test_alembic_001_upgrade_downgrade_and_schema_parity` | Chạy Alembic upgrade `001` trên SQLite in-memory, kiểm tra tự động tạo đủ **29 bảng lõi**, đối chiếu 100% tên cột, kiểu dữ liệu, Foreign Key với `Base.metadata`. Chạy downgrade `base` dọn dẹp sạch sẽ. | **PASSED** |
| 2 | `test_user_organization_membership_consent_and_cascade` | Kiểm tra quan hệ dữ liệu `User` $\leftrightarrow$ `Organization`, `Membership`, `Consent`, `StudentProfile`. Kiểm thử tính năng xóa xếp tầng (`CASCADE DELETE`) bảo đảm không còn orphan records khi xóa người dùng. | **PASSED** |
| 3 | `test_course_learning_submission_and_ai_relationships` | Kiểm tra quan hệ cây dữ liệu học tập: `Lesson` $\rightarrow$ `LessonStep` $\rightarrow$ `SourceVersion` $\rightarrow$ `Submission` $\rightarrow$ `Evidence` / `TestResult` / `AIHint`. | **PASSED** |
| 4 | `test_kanban_project_milestone_task_dependencies_and_cascades` | Kiểm tra mô hình Kanban dự án: `Project` $\rightarrow$ `Milestone` $\rightarrow$ `KanbanBoard` $\rightarrow$ `KanbanColumn` $\rightarrow$ `Task` và ràng buộc đồ thị `TaskDependency`. | **PASSED** |
| 5 | `test_user_crud_create_read_list_update_deactivate_delete` | Kiểm thử toàn diện CRUD User: hàm tạo người dùng (băm mật khẩu Bcrypt, chuẩn hóa email, tự động sinh profile), hàm đọc theo ID/Email, danh sách phân trang và lọc theo role/trạng thái, cập nhật preferences/mật khẩu, vô hiệu hóa và xóa vĩnh viễn. Chặn đăng ký trùng email. | **PASSED** |
| 6 | `test_verify_token_access_refresh_expiry_and_tampering` | Kiểm thử tạo và xác thực token JWT: cấp Access Token (15 phút), Refresh Token (7 ngày). Kiểm thử chặn token hết hạn, token giả mạo chữ ký, token sai Secret Key, token không đúng loại (dùng nhầm Refresh Token vào route API). | **PASSED** |
| 7 | `test_auth_deps_get_current_user_rbac_and_session_owned` | Kiểm thử các FastAPI Security Dependencies: `get_current_user`, phân quyền RBAC đa vai trò (`require_role`, `require_roles`) cho Student/Instructor/Admin, xác thực quyền sở hữu phiên học `session_owned`. | **PASSED** |

---

### V. ĐÁNH GIÁ ĐỘ BAO PHỦ MÃ NGUỒN (COVERAGE ANALYSIS)

* **Yêu cầu đề bài (Mục tiêu)**: Độ bao phủ code > **80%**.
* **Kết quả thực tế đạt được**: **98%** (vượt chỉ tiêu 18%).
* **Phân tích chi tiết**:
  * Các tầng Model (`app.models.*`): Đạt **100%** độ bao phủ (riêng `base.py` đạt 97% do đã xử lý fallback SQLite ALTER TABLE).
  * Tầng nghiệp vụ người dùng (`app.services.user_service`): Đạt **99%** độ bao phủ.
  * Tầng bảo mật & mã hóa (`app.core.security`): Đạt **92%** độ bao phủ.
  * Tầng phụ thuộc phân quyền (`app.api.deps`): Đạt **93%** độ bao phủ.

---

### VI. HƯỚNG DẪN TÁI HIỆN CHO GIẢNG VIÊN / NGƯỜI CHẤM ĐỒ ÁN

Giảng viên hoặc Reviewer có thể tải mã nguồn về và kiểm tra lại độc lập theo 3 bước:
1. Mở terminal tại thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện cần thiết (nếu môi trường mới):
   ```bash
   pip install -r requirements.txt
   ```
3. Chạy toàn bộ test suite và xuất báo cáo coverage:
   ```bash
   pytest
   ```
   *(Hệ thống sẽ chạy ngầm trên SQLite in-memory trong khoảng 5 giây và in toàn bộ bảng kết quả 98% coverage ra màn hình)*.

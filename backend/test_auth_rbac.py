"""
Test Suite toàn diện kiểm thử:
1. Băm mật khẩu bằng Bcrypt (hash + salt + verify)
2. Đăng ký (Register) người dùng mới (student, instructor, admin)
3. Chống đăng ký trùng email
4. Đăng nhập (Login) bằng mật khẩu đã băm
5. Cấp cặp Access Token (15 phút) và Refresh Token (7 ngày)
6. Cấp lại Access Token mới qua Refresh Token endpoint
7. Phân quyền RBAC 3 vai trò (Student, Instructor, Admin) qua FastAPI dependencies
"""

from __future__ import annotations

import time
from fastapi.testclient import TestClient
import jwt

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, REFRESH_TOKEN_EXPIRE_DAYS, SECRET_KEY
from app.core.database import db, init_db
from app.core.security import decode_token, hash_password, verify_password
from app.main import app


def test_auth_and_rbac_suite():
    # 0. Khởi tạo CSDL
    init_db()
    client = TestClient(app)

    print("\n--- 1. KIỂM THỬ BĂM MẬT KHẨU BCRYPT ---")
    raw_pwd = "StrongStudentPass@2026"
    pwd_hash1 = hash_password(raw_pwd)
    pwd_hash2 = hash_password(raw_pwd)

    # Đảm bảo bcrypt hash bắt đầu bằng $2b$
    assert pwd_hash1.startswith("$2b$"), "Bcrypt hash phải bắt đầu bằng $2b$"
    assert pwd_hash2.startswith("$2b$")
    # Đảm bảo 2 lần hash cùng 1 mật khẩu cho ra salt khác nhau
    assert pwd_hash1 != pwd_hash2, "Bcrypt salt ngẫu nhiên phải sinh chuỗi hash khác nhau"
    # Kiểm tra verify đúng/sai
    assert verify_password(raw_pwd, pwd_hash1) is True, "Xác minh mật khẩu đúng phải trả về True"
    assert verify_password("WrongPassword123", pwd_hash1) is False, "Mật khẩu sai phải trả về False"
    assert verify_password("", pwd_hash1) is False, "Mật khẩu rỗng phải trả về False"
    print("✓ Bcrypt hashing & verification: PASS")

    print("\n--- 2. KIỂM THỬ ĐĂNG KÝ (REGISTER) 3 VAI TRÒ ---")
    ts = int(time.time())
    student_email = f"student_{ts}@codemind.edu.vn"
    instructor_email = f"instructor_{ts}@codemind.edu.vn"
    admin_email = f"admin_{ts}@codemind.edu.vn"

    # Đăng ký Student
    r_student = client.post(
        "/v1/auth/register",
        json={
            "email": student_email,
            "password": "PasswordStudent@123",
            "full_name": "Nguyễn Văn Sinh Viên",
            "role": "student",
            "timezone": "Asia/Ho_Chi_Minh",
        },
    )
    assert r_student.status_code == 201, r_student.text
    student_data = r_student.json()
    assert student_data["role"] == "student"
    assert student_data["token_type"] == "bearer"
    assert "access_token" in student_data
    assert "refresh_token" in student_data
    student_token = student_data["access_token"]
    student_refresh = student_data["refresh_token"]

    # Đảm bảo student_profiles được tự động khởi tạo trong CSDL
    with db() as conn:
        profile = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (student_data["user"]["id"],)).fetchone()
        assert profile is not None, "Sinh viên phải có bản ghi student_profiles"
        assert profile["current_streak"] == 0
        assert profile["exp_points"] == 0

    # Đăng ký Instructor
    r_inst = client.post(
        "/v1/auth/register",
        json={
            "email": instructor_email,
            "password": "PasswordInstructor@123",
            "full_name": "Thầy Nguyễn Phước",
            "role": "instructor",
            "timezone": "Asia/Ho_Chi_Minh",
        },
    )
    assert r_inst.status_code == 201, r_inst.text
    inst_data = r_inst.json()
    assert inst_data["role"] == "instructor"
    instructor_token = inst_data["access_token"]

    # Đăng ký Admin
    r_admin = client.post(
        "/v1/auth/register",
        json={
            "email": admin_email,
            "password": "PasswordAdmin@123",
            "full_name": "Quản Trị Viên CodeMind",
            "role": "admin",
            "timezone": "Asia/Ho_Chi_Minh",
        },
    )
    assert r_admin.status_code == 201, r_admin.text
    admin_data = r_admin.json()
    assert admin_data["role"] == "admin"
    admin_token = admin_data["access_token"]

    # Chống đăng ký trùng email
    r_dup = client.post(
        "/v1/auth/register",
        json={
            "email": student_email,
            "password": "AnotherPassword@123",
            "full_name": "Trùng Email",
            "role": "student",
        },
    )
    assert r_dup.status_code == 400, "Phải từ chối đăng ký khi trùng email"
    print("✓ Đăng ký tài khoản (Student, Instructor, Admin) & chống trùng email: PASS")

    print("\n--- 3. KIỂM THỬ ĐĂNG NHẬP (LOGIN) & BẢO MẬT ---")
    # Đăng nhập thành công
    r_login = client.post(
        "/v1/auth/login",
        json={"email": student_email, "password": "PasswordStudent@123"},
    )
    assert r_login.status_code == 200, r_login.text
    login_data = r_login.json()
    assert login_data["role"] == "student"
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    assert login_data["expires_in"] == 15 * 60  # 15 phút (900 giây)

    # Đăng nhập sai mật khẩu -> 401
    r_wrong_pwd = client.post(
        "/v1/auth/login",
        json={"email": student_email, "password": "WrongPassword999"},
    )
    assert r_wrong_pwd.status_code == 401, "Mật khẩu sai phải trả về 401"

    # Đăng nhập email không tồn tại -> 401
    r_unknown_email = client.post(
        "/v1/auth/login",
        json={"email": "nonexistent@codemind.edu.vn", "password": "AnyPassword123"},
    )
    assert r_unknown_email.status_code == 401, "Email lạ phải trả về 401"
    print("✓ Đăng nhập đúng/sai thông tin & phản hồi bảo mật: PASS")

    print("\n--- 4. KIỂM THỬ THỜI HẠN TOKEN: ACCESS (15 PHÚT) & REFRESH (7 NGÀY) ---")
    acc_payload = decode_token(login_data["access_token"])
    ref_payload = decode_token(login_data["refresh_token"])

    assert acc_payload["type"] == "access", "Loại token phải là access"
    assert ref_payload["type"] == "refresh", "Loại token phải là refresh"

    acc_duration = acc_payload["exp"] - acc_payload["iat"]
    ref_duration = ref_payload["exp"] - ref_payload["iat"]

    # 15 phút = 900 giây
    assert acc_duration == 15 * 60, f"Access token phải có thời hạn chính xác 15 phút ({acc_duration}s)"
    # 7 ngày = 604800 giây
    assert ref_duration == 7 * 24 * 3600, f"Refresh token phải có thời hạn chính xác 7 ngày ({ref_duration}s)"
    print(f"✓ Thời hạn Access Token ({acc_duration // 60} phút) & Refresh Token ({ref_duration // 86400} ngày): PASS")

    print("\n--- 5. KIỂM THỬ ENDPOINT REFRESH TOKEN ---")
    r_refresh = client.post(
        "/v1/auth/refresh",
        json={"refresh_token": student_refresh},
    )
    assert r_refresh.status_code == 200, r_refresh.text
    refresh_res = r_refresh.json()
    assert "access_token" in refresh_res
    assert refresh_res["access_token"] != student_token, "Access token mới phải khác token cũ"

    # Dùng Access Token để refresh -> Phải bị từ chối 401
    r_invalid_refresh = client.post(
        "/v1/auth/refresh",
        json={"refresh_token": student_token},
    )
    assert r_invalid_refresh.status_code == 401, "Không được dùng Access Token để refresh"

    # Refresh Token rác -> 401
    r_garbage_refresh = client.post(
        "/v1/auth/refresh",
        json={"refresh_token": "garbage.token.here"},
    )
    assert r_garbage_refresh.status_code == 401
    print("✓ Cấp lại Access Token qua Refresh Token & Token Rotation: PASS")

    print("\n--- 6. KIỂM THỬ PHÂN QUYỀN RBAC QUA FASTAPI DEPENDENCIES ---")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    instructor_headers = {"Authorization": f"Bearer {instructor_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 6.1. Endpoint chung: GET /v1/users/me (Tất cả vai trò hợp lệ đều truy cập được)
    me_student = client.get("/v1/users/me", headers=student_headers)
    assert me_student.status_code == 200, me_student.text
    assert me_student.json()["role"] == "student"

    me_inst = client.get("/v1/users/me", headers=instructor_headers)
    assert me_inst.status_code == 200, me_inst.text
    assert me_inst.json()["role"] == "instructor"

    me_admin = client.get("/v1/users/me", headers=admin_headers)
    assert me_admin.status_code == 200, me_admin.text
    assert me_admin.json()["role"] == "admin"

    # 6.2. Endpoint Giảng viên: GET /v1/instructor/sessions (Bảo vệ bởi Depends(require_instructor))
    # Student gọi -> BỊ CHẶN 403 Forbidden!
    s_call_inst = client.get("/v1/instructor/sessions", headers=student_headers)
    assert s_call_inst.status_code == 403, f"Student phải bị từ chối 403, nhận: {s_call_inst.status_code}"

    # Instructor gọi -> THÀNH CÔNG 200 OK
    inst_call_inst = client.get("/v1/instructor/sessions", headers=instructor_headers)
    assert inst_call_inst.status_code == 200, inst_call_inst.text

    # Admin gọi -> THÀNH CÔNG 200 OK (Admin có quyền xem phiên học)
    admin_call_inst = client.get("/v1/instructor/sessions", headers=admin_headers)
    assert admin_call_inst.status_code == 200, admin_call_inst.text

    # 6.3. Endpoint Quản trị viên: GET /v1/admin/users & POST /v1/admin/reset-demo (Bảo vệ bởi Depends(require_admin))
    # Student gọi -> BỊ CHẶN 403 Forbidden!
    s_call_admin = client.get("/v1/admin/users", headers=student_headers)
    assert s_call_admin.status_code == 403, "Student không được phép truy cập admin route"

    # Instructor gọi -> BỊ CHẶN 403 Forbidden!
    inst_call_admin = client.get("/v1/admin/users", headers=instructor_headers)
    assert inst_call_admin.status_code == 403, "Instructor không được phép truy cập admin route"

    # Admin gọi -> THÀNH CÔNG 200 OK!
    admin_call_admin = client.get("/v1/admin/users", headers=admin_headers)
    assert admin_call_admin.status_code == 200, admin_call_admin.text
    assert "users" in admin_call_admin.json()

    # 6.4. Chưa đăng nhập (Không có Authorization header) -> 401 Unauthorized
    unauth_call = client.get("/v1/users/me")
    assert unauth_call.status_code == 401, "Chưa gửi token phải trả về 401"

    # Token sai chữ ký -> 401 Unauthorized
    tampered_headers = {"Authorization": f"Bearer {student_token}tampered"}
    tampered_call = client.get("/v1/users/me", headers=tampered_headers)
    assert tampered_call.status_code == 401, "Token giả mạo phải trả về 401"

    print("✓ Phân quyền RBAC 3 vai trò (Student, Instructor, Admin) qua FastAPI Dependencies: PASS")
    print("\n=======================================================")
    print(">>> TẤT CẢ CÁC BÀI KIỂM THỬ AUTH & RBAC ĐÃ ĐẠT 100%! <<<")
    print("=======================================================")


if __name__ == "__main__":
    test_auth_and_rbac_suite()


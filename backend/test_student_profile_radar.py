# ==============================================================================
# KIỂM THỬ TỰ ĐỘNG: TRANG HỒ SƠ NĂNG LỰC SINH VIÊN (STUDENT PROFILE) & BIỂU ĐỒ RADAR 5 KỸ NĂNG
# Hệ thống: CodeMind Campus (v3.1 Master Blueprint)
# ==============================================================================

import json
import sys
import os

# Đảm bảo đường dẫn import đúng
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import db, init_db, _ensure_mysql_db_exists
from app.core.security import create_access_token

client = TestClient(app)

def run_all_tests():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN STUDENT PROFILE & BIỂU ĐỒ RADAR 5 KỸ NĂNG")
    print("=" * 70)

    # 1. Khởi tạo DB nếu cần
    _ensure_mysql_db_exists()
    init_db()

    # 2. Lấy thông tin tài khoản demo student
    with db() as conn:
        student = conn.execute("SELECT * FROM users WHERE email='student.demo@codemind.local'").fetchone()
        assert student is not None, "Tài khoản student.demo@codemind.local phải tồn tại"
        student_id = student["id"]

    token = create_access_token({"sub": student_id, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    # TEST 1: Lấy thông tin Overview / Profile qua GET /v1/student/learning-overview
    print("\n[TEST 1] Kiểm tra lấy thông tin học viên qua /v1/student/learning-overview...")
    res = client.get("/v1/student/learning-overview", headers=headers)
    assert res.status_code == 200, f"Status code {res.status_code}: {res.text}"
    data = res.json()
    assert "user" in data, "Response phải có key 'user'"
    assert "profile" in data, "Response phải có key 'profile'"
    assert data["user"]["email"] == "student.demo@codemind.local"
    assert data["user"]["code"] is not None
    print(f"  -> OK: Học viên={data['user']['name']}, MSSV={data['user']['code']}, Email={data['user']['email']}")

    # TEST 2: Kiểm tra định tuyến tương thích SRS Section 7.1 (/v1/students/profile)
    print("\n[TEST 2] Kiểm tra endpoint chuẩn SRS /v1/students/profile...")
    res_srs = client.get("/v1/students/profile", headers=headers)
    assert res_srs.status_code == 200, f"SRS route failed: {res_srs.status_code}"
    data_srs = res_srs.json()
    assert data_srs["profile"]["exp_points"] is not None
    print(f"  -> OK: Endpoint /v1/students/profile phản hồi 200 chuẩn SRS!")

    # TEST 3: Kiểm tra các chỉ số Streak, XP, Danh hiệu
    print("\n[TEST 3] Kiểm tra thông số Gamification (XP, Streak, Danh hiệu)...")
    prof = data["profile"]
    assert "exp_points" in prof and isinstance(prof["exp_points"], int)
    assert "current_streak" in prof and isinstance(prof["current_streak"], int)
    assert "longest_streak" in prof and isinstance(prof["longest_streak"], int)
    assert "selected_title" in prof and isinstance(prof["selected_title"], str)
    print(f"  -> OK: XP={prof['exp_points']}, Streak={prof['current_streak']} ngày, Kỷ lục={prof['longest_streak']} ngày, Title='{prof['selected_title']}'")

    # TEST 4: Kiểm tra Biểu đồ Radar 5 kỹ năng kỹ thuật chuẩn
    print("\n[TEST 4] Kiểm tra Biểu đồ Radar 5 Kỹ năng (Thuật toán, Debugging, Clean Code, Teamwork, Phản biện)...")
    radar = prof.get("radar", {})
    expected_skills = ["algorithm", "debugging", "cleancode", "teamwork", "defense"]
    for skill in expected_skills:
        assert skill in radar, f"Thiếu kỹ năng {skill} trong radar"
        val = radar[skill]
        assert 0.0 <= val <= 100.0, f"Điểm {skill} ({val}) phải nằm trong khoảng [0, 100]"
        print(f"     * {skill.capitalize()}: {val}%")
    print("  -> OK: Đầy đủ 5 chỉ số kỹ năng, giá trị hợp lệ trên thang đo 100%!")

    # TEST 5: Cập nhật danh hiệu hiện tại qua POST /v1/student/profile/title
    print("\n[TEST 5] Kiểm tra đổi danh hiệu học viên (POST /v1/student/profile/title)...")
    new_title = "Thuật toán Sư (Algorithm Master)"
    res_title = client.post("/v1/student/profile/title", json={"title": new_title}, headers=headers)
    assert res_title.status_code == 200, f"Failed to update title: {res_title.text}"
    res_title_data = res_title.json()
    assert res_title_data["success"] is True
    assert res_title_data["selected_title"] == new_title

    # Xác thực lưu trực tiếp xuống MySQL
    with db() as conn:
        db_prof = conn.execute("SELECT selected_title FROM student_profiles WHERE user_id=?", (student_id,)).fetchone()
        assert db_prof["selected_title"] == new_title, f"DB title ({db_prof['selected_title']}) không khớp {new_title}"
    print(f"  -> OK: Đã cập nhật danh hiệu thành công thành '{new_title}' và lưu chuẩn MySQL!")

    # TEST 6: Cập nhật toàn diện cấu hình giao diện cá nhân (POST /v1/student/profile/preferences)
    print("\n[TEST 6] Kiểm tra cập nhật cấu hình giao diện cá nhân (Theme, Avatar, Badge, Title)...")
    pref_payload = {
        "theme": "blueprint",
        "avatar": "pixel",
        "badge": "quiz",
        "title": "Clean Code Builder"
    }
    res_pref = client.post("/v1/student/profile/preferences", json=pref_payload, headers=headers)
    assert res_pref.status_code == 200, f"Failed preferences: {res_pref.text}"
    pref_data = res_pref.json()
    assert pref_data["success"] is True
    assert pref_data["equipped_items"]["theme"] == "blueprint"
    assert pref_data["equipped_items"]["avatar"] == "pixel"
    assert pref_data["equipped_items"]["badge"] == "quiz"
    assert pref_data["selected_title"] == "Clean Code Builder"

    # Kiểm tra database sau khi lưu
    with db() as conn:
        p_row = conn.execute("SELECT equipped_items_json, selected_title FROM student_profiles WHERE user_id=?", (student_id,)).fetchone()
        u_row = conn.execute("SELECT theme_preference FROM users WHERE id=?", (student_id,)).fetchone()
        saved_eq = json.loads(p_row["equipped_items_json"] or "{}")
        assert saved_eq.get("theme") == "blueprint"
        assert saved_eq.get("avatar") == "pixel"
        assert saved_eq.get("badge") == "quiz"
        assert p_row["selected_title"] == "Clean Code Builder"
        assert "blueprint" in u_row["theme_preference"]
    print("  -> OK: Toàn bộ cấu hình Theme, Avatar, Badge, Title đã lưu vĩnh viễn xuống MySQL!")

    # TEST 7: Kiểm tra tính năng Reload / Persistence
    print("\n[TEST 7] Kiểm tra tính nhất quán sau khi tải lại trang (Persistence Verification)...")
    res_reload = client.get("/v1/student/learning-overview", headers=headers)
    assert res_reload.status_code == 200
    reload_data = res_reload.json()
    assert reload_data["profile"]["selected_title"] == "Clean Code Builder"
    assert reload_data["user"]["background_theme"] == "blueprint"
    assert reload_data["user"]["avatar"] == "pixel"
    assert reload_data["user"]["badge_frame"] == "quiz"
    print("  -> OK: Reload trang vẫn bảo toàn 100% giao diện đã áp dụng!")

    # TEST 8: Kiểm tra validation bảo mật (Title không được rỗng)
    print("\n[TEST 8] Kiểm tra validation bảo mật dữ liệu đầu vào...")
    res_invalid = client.post("/v1/student/profile/title", json={"title": "   "}, headers=headers)
    assert res_invalid.status_code in (400, 422), "Phải chặn danh hiệu rỗng"
    print("  -> OK: Chặn thành công dữ liệu đầu vào không hợp lệ!")

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 8/8 BÀI KIỂM THỬ STUDENT PROFILE & RADAR 5 KỸ NĂNG ĐÃ ĐẠT 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()

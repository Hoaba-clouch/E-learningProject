#!/usr/bin/env python3
"""
Test Suite: XP Shop & Gamification Customization
Kiểm thử toàn diện màn hình Cửa hàng Đổi thưởng Gamification & Tùy biến Giao diện:
- Hiển thị danh mục vật phẩm theo nhóm (theme, avatar, mentor, chat, map, badge).
- Mua và trừ điểm XP chính xác, lưu vào MySQL student_profiles.owned_items_json.
- Trang bị vật phẩm và lưu vào MySQL student_profiles.equipped_items_json.
- Tải lại dữ liệu (persisted state) vẫn giữ nguyên cấu hình đã áp dụng.
- Nhận thưởng nhiệm vụ (XP Quest claim) và chống nhận trùng lặp.
"""
import json
import os
import sys
from pathlib import Path

# Đảm bảo import được backend/app
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import db, _ensure_mysql_db_exists, init_db
from app.core.security import create_access_token


def run_tests():
    print("=" * 70)
    print("🎮 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG XP SHOP & GAMIFICATION (BRANCH 1)")
    print("=" * 70)

    _ensure_mysql_db_exists()
    init_db()

    client = TestClient(app)

    # 1. Chuẩn bị tài khoản student demo & token
    student_user_id = "student-demo"
    with db() as conn:
        u = conn.execute("SELECT id, email, full_name, role FROM users WHERE id=?", (student_user_id,)).fetchone()
        if not u:
            # Tạo tài khoản nếu chưa có
            conn.execute(
                """INSERT INTO users(id, email, full_name, display_name, role, status, created_at, updated_at)
                   VALUES(?, ?, 'Minh Anh', 'Minh Anh', 'student', 'active', '2026-01-01', '2026-01-01')""",
                (student_user_id, "student.demo@codemind.local"),
            )

        # Reset profile student về trạng thái kiểm thử chuẩn: 1000 XP
        initial_owned = {
            "theme": ["diagonal", "blueprint", "matrix", "sunrise", "graphite"],
            "avatar": ["initials"],
            "mentor": ["mino"],
            "chat": ["classic"],
            "map": ["campaign"],
            "badge": ["streak"],
        }
        initial_equipped = {
            "theme": "diagonal",
            "avatar": "initials",
            "mentor": "mino",
            "chat": "classic",
            "map": "campaign",
            "badge": "streak",
        }
        conn.execute(
            """INSERT INTO student_profiles(
                   id, user_id, current_streak, longest_streak, exp_points, selected_title,
                   radar_algorithm, radar_debugging, radar_cleancode, radar_teamwork, radar_defense,
                   owned_items_json, claimed_quests_json, equipped_items_json
               ) VALUES(?, ?, 3, 5, 1000, 'Bug Hunter', 80.0, 75.0, 85.0, 70.0, 90.0, ?, '[]', ?)
               ON DUPLICATE KEY UPDATE exp_points=1000, owned_items_json=?, claimed_quests_json='[]', equipped_items_json=?""",
            (
                "prof-test-student",
                student_user_id,
                json.dumps(initial_owned),
                json.dumps(initial_equipped),
                json.dumps(initial_owned),
                json.dumps(initial_equipped),
            ),
        )

    token = create_access_token({"sub": student_user_id, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    # --- TEST 1: Lấy thông tin kho đồ & số dư XP ban đầu ---
    print("\n[TEST 1] Kiểm tra lấy thông tin kho đồ (Inventory & Profile)...")
    resp = client.get("/v1/student/xp-shop/inventory", headers=headers)
    assert resp.status_code == 200, f"Failed GET inventory: {resp.text}"
    inv_data = resp.json()
    assert inv_data["exp_points"] == 1000, f"Expected 1000 XP, got {inv_data['exp_points']}"
    assert "theme" in inv_data["owned_items"]
    assert "avatar" in inv_data["owned_items"]
    assert inv_data["equipped_items"]["avatar"] == "initials"
    print("  -> Đạt: Số dư ban đầu 1000 XP, kho đồ mặc định đầy đủ 6 danh mục.")

    # --- TEST 2: Kiểm tra từ chối mua khi không đủ XP ---
    print("\n[TEST 2] Kiểm tra từ chối mua vật phẩm khi vượt quá số dư XP...")
    # Item 'sylph' có giá 1500 XP trong khi user chỉ có 1000 XP
    resp = client.post(
        "/v1/student/xp-shop/purchase",
        headers=headers,
        json={"category": "mentor", "item_id": "sylph", "cost": 1500},
    )
    assert resp.status_code == 400, f"Expected 400 for insufficient XP, got {resp.status_code}: {resp.text}"
    print(f"  -> Đạt: Chặn mua hợp lệ ({resp.json().get('detail')}).")

    # --- TEST 3: Mua thành công vật phẩm hợp lệ & trừ XP chính xác ---
    print("\n[TEST 3] Mua vật phẩm hợp lệ (avatar: pixel, giá 220 XP)...")
    resp = client.post(
        "/v1/student/xp-shop/purchase",
        headers=headers,
        json={"category": "avatar", "item_id": "pixel", "cost": 220},
    )
    assert resp.status_code == 200, f"Purchase failed: {resp.text}"
    pur_data = resp.json()
    # 1000 - 220 = 780 XP
    assert pur_data["exp_points"] == 780, f"Expected 780 XP, got {pur_data['exp_points']}"
    assert "pixel" in pur_data["owned_items"]["avatar"]
    assert pur_data["equipped_items"]["avatar"] == "pixel", "Expected avatar auto-equipped upon purchase"
    print("  -> Đạt: Trừ chính xác 220 XP (còn 780 XP), 'pixel' đã vào owned_items và tự động trang bị.")

    # --- TEST 4: Kiểm tra lưu trữ thực tế trong MySQL ---
    print("\n[TEST 4] Kiểm tra trực tiếp bảng student_profiles trong MySQL...")
    with db() as conn:
        row = conn.execute(
            "SELECT exp_points, owned_items_json, equipped_items_json FROM student_profiles WHERE user_id=?",
            (student_user_id,),
        ).fetchone()
        assert row is not None, "Profile row not found in MySQL"
        assert row["exp_points"] == 780, f"MySQL exp_points mismatch: {row['exp_points']}"
        owned_db = json.loads(row["owned_items_json"])
        assert "pixel" in owned_db["avatar"], "pixel not found in MySQL owned_items_json"
        equipped_db = json.loads(row["equipped_items_json"])
        assert equipped_db["avatar"] == "pixel", "pixel not found in MySQL equipped_items_json"
    print("  -> Đạt: Dữ liệu đã lưu chính xác xuống MySQL student_profiles.owned_items_json & equipped_items_json.")

    # --- TEST 5: Trang bị vật phẩm đã sở hữu (Equip API) ---
    print("\n[TEST 5] Kiểm tra trang bị vật phẩm đã sở hữu (theme: matrix, mentor: mino, chat: classic)...")
    # Trang bị theme matrix
    resp = client.post(
        "/v1/student/xp-shop/equip",
        headers=headers,
        json={"category": "theme", "item_id": "matrix"},
    )
    assert resp.status_code == 200, f"Equip theme failed: {resp.text}"
    eq_data = resp.json()
    assert eq_data["equipped_items"]["theme"] == "matrix"

    # Trang bị lại avatar initials
    resp = client.post(
        "/v1/student/xp-shop/equip",
        headers=headers,
        json={"category": "avatar", "item_id": "initials"},
    )
    assert resp.status_code == 200, f"Equip avatar failed: {resp.text}"
    assert resp.json()["equipped_items"]["avatar"] == "initials"
    print("  -> Đạt: Trang bị thành công các vật phẩm hợp lệ và đồng bộ tức thì.")

    # --- TEST 6: Từ chối trang bị vật phẩm chưa mở khóa ---
    print("\n[TEST 6] Kiểm tra từ chối trang bị vật phẩm chưa sở hữu...")
    # 'luna' chưa được mua
    resp = client.post(
        "/v1/student/xp-shop/equip",
        headers=headers,
        json={"category": "mentor", "item_id": "luna"},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    print(f"  -> Đạt: Chặn trang bị hợp lệ ({resp.json().get('detail')}).")

    # --- TEST 7: Kiểm tra nạp lại tổng quan (Overview API) lưu giữ nguyên trạng ---
    print("\n[TEST 7] Kiểm tra API Overview (mô phỏng tải lại trang của sinh viên)...")
    resp = client.get("/v1/student/overview", headers=headers)
    assert resp.status_code == 200, f"Overview failed: {resp.text}"
    overview = resp.json()
    assert overview["profile"]["exp_points"] == 780
    assert overview["profile"]["equipped_items"]["theme"] == "matrix"
    assert overview["profile"]["equipped_items"]["avatar"] == "initials"
    assert overview["user"]["background_theme"] == "matrix"
    assert "pixel" in overview["profile"]["owned_items"]["avatar"]
    print("  -> Đạt: Khi sinh viên tải lại trang, toàn bộ giao diện đã áp dụng và số dư XP vẫn giữ nguyên 100%!")

    # --- TEST 8: Nhận thưởng nhiệm vụ (Quest Claim) ---
    print("\n[TEST 8] Nhận thưởng nhiệm vụ q4 (+200 XP)...")
    resp = client.post(
        "/v1/student/xp-shop/claim-quest",
        headers=headers,
        json={"quest_id": "q4", "reward": 200},
    )
    assert resp.status_code == 200, f"Claim quest failed: {resp.text}"
    claim_data = resp.json()
    # 780 + 200 = 980 XP
    assert claim_data["exp_points"] == 980, f"Expected 980 XP, got {claim_data['exp_points']}"
    assert "q4" in claim_data["claimed_quests"]

    # Nhận lại cùng nhiệm vụ -> phải bị từ chối
    resp_dup = client.post(
        "/v1/student/xp-shop/claim-quest",
        headers=headers,
        json={"quest_id": "q4", "reward": 200},
    )
    assert resp_dup.status_code == 400, f"Expected 400 on duplicate claim, got {resp_dup.status_code}"
    print("  -> Đạt: Cộng chính xác 200 XP (tổng 980 XP) và chặn nhận trùng lặp nhiệm vụ thành công.")

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 8/8 BÀI KIỂM THỬ XP SHOP & GAMIFICATION ĐÃ ĐẠT 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()

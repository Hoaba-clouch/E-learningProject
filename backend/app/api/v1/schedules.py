from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc

router = APIRouter(prefix="/v1/schedules", tags=["schedules"])


class CreateScheduleIn(BaseModel):
    course_id: str
    project_id: str | None = None
    category: str = Field("exam", description="exam | defense | office_hours")
    title: str
    room_or_link: str
    schedule_date: str  # YYYY-MM-DD
    start_hour: float   # 8.0 = 08:00
    end_hour: float     # 11.5 = 11:30
    break_hour: float = 0.0
    max_capacity: int = 30
    note: str = ""


class BookScheduleIn(BaseModel):
    topic: str
    repo_or_doc_url: str = ""
    student_note: str = ""


class UpdateBookingIn(BaseModel):
    status: str = Field(..., description="confirmed | rejected | completed")
    instructor_reply: str = ""


@router.get("", status_code=status.HTTP_200_OK)
def get_schedules(
    course_id: str | None = None,
    category: str | None = None,
    schedule_date: str | None = None,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy danh sách ca thi, hội đồng bảo vệ và lịch tư vấn 1-on-1 theo bộ lọc."""
    role = user.get("role", "student")
    user_id = user["id"]

    query = "SELECT * FROM academic_schedules WHERE 1=1"
    params: list[Any] = []

    if course_id:
        query += " AND course_id = ?"
        params.append(course_id)
    if category:
        query += " AND category = ?"
        params.append(category)
    if schedule_date:
        query += " AND schedule_date = ?"
        params.append(schedule_date)

    query += " ORDER BY schedule_date ASC, start_hour ASC"

    with db() as conn:
        sch_rows = conn.execute(query, tuple(params)).fetchall()
        schedules = [row_dict(r) for r in sch_rows]

        # Lấy bookings tương ứng
        for s in schedules:
            sch_id = s["id"]
            if role in ("instructor", "admin"):
                # Giảng viên / Admin xem được toàn bộ danh sách đăng ký
                b_rows = conn.execute(
                    "SELECT * FROM schedule_bookings WHERE schedule_id = ? ORDER BY created_at DESC",
                    (sch_id,),
                ).fetchall()
                s["bookings"] = [row_dict(b) for b in b_rows]
            else:
                # Học viên chỉ xem booking của chính mình
                b_rows = conn.execute(
                    "SELECT * FROM schedule_bookings WHERE schedule_id = ? AND student_id = ?",
                    (sch_id, user_id),
                ).fetchall()
                s["bookings"] = [row_dict(b) for b in b_rows]
                s["my_booking"] = s["bookings"][0] if s["bookings"] else None

    return {"schedules": schedules}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: CreateScheduleIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên hoặc Admin tạo ca thi, hội đồng bảo vệ hoặc khung giờ tư vấn 1-on-1."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền mở ca lịch mới.",
        )

    sch_id = f"sch-{payload.category}-{uid()[:8]}"
    instructor_name = user.get("display_name") or user.get("name") or "Giảng viên Phụ trách"
    instructor_id = user["id"]
    timestamp = now_utc()

    with db() as conn:
        conn.execute(
            """INSERT INTO academic_schedules (
                id, course_id, project_id, instructor_id, instructor_name,
                category, title, room_or_link, schedule_date, start_hour, end_hour,
                break_hour, max_capacity, current_booked, is_locked, status, note,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'confirmed', ?, ?, ?)""",
            (
                sch_id,
                payload.course_id,
                payload.project_id,
                instructor_id,
                instructor_name,
                payload.category,
                payload.title,
                payload.room_or_link,
                payload.schedule_date,
                payload.start_hour,
                payload.end_hour,
                payload.break_hour,
                payload.max_capacity,
                payload.note,
                timestamp,
                timestamp,
            ),
        )

        # Gửi thông báo tới toàn thể học viên môn này
        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, NULL, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
            (
                f"notif-{uid()}",
                f"Lịch mới: {payload.title}",
                f"{instructor_name} đã mở ca '{payload.title}' vào ngày {payload.schedule_date} ({payload.start_hour:04.1f}h - {payload.end_hour:04.1f}h) tại {payload.room_or_link}.",
                timestamp,
            ),
        )
        conn.commit()

    return {"message": "Tạo lịch thành công", "schedule_id": sch_id}


@router.post("/{schedule_id}/book", status_code=status.HTTP_201_CREATED)
def book_schedule_slot(
    schedule_id: str,
    payload: BookScheduleIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Học viên đăng ký giữ chỗ / đặt lịch hẹn tư vấn 1-on-1 với Giảng viên."""
    student_id = user["id"]
    student_name = user.get("display_name") or user.get("name") or "Học viên CodeMind"
    timestamp = now_utc()

    with db() as conn:
        sch_row = conn.execute(
            "SELECT * FROM academic_schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()

        if not sch_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ca lịch yêu cầu.",
            )

        sch = row_dict(sch_row)

        if sch.get("is_locked"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ca lịch này đã bị khóa, không nhận thêm đăng ký.",
            )

        if sch.get("current_booked", 0) >= sch.get("max_capacity", 30):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ca lịch này đã đủ sĩ số tối đa.",
            )

        # Kiểm tra xem học viên đã đăng ký ca này chưa
        existing = conn.execute(
            "SELECT id FROM schedule_bookings WHERE schedule_id = ? AND student_id = ?",
            (schedule_id, student_id),
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Huynh/Bạn đã đăng ký ca này rồi, vui lòng kiểm tra mục Lịch hẹn của tôi.",
            )

        booking_id = f"bkg-{uid()}"
        initial_status = "pending" if sch.get("category") == "office_hours" else "confirmed"

        conn.execute(
            """INSERT INTO schedule_bookings (
                id, schedule_id, student_id, student_name, instructor_id,
                topic, repo_or_doc_url, student_note, booking_status,
                instructor_reply, confirmed_at, completed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, NULL, ?)""",
            (
                booking_id,
                schedule_id,
                student_id,
                student_name,
                sch["instructor_id"],
                payload.topic,
                payload.repo_or_doc_url,
                payload.student_note,
                initial_status,
                timestamp if initial_status == "confirmed" else None,
                timestamp,
            ),
        )

        # Tăng số lượng đã đăng ký
        conn.execute(
            "UPDATE academic_schedules SET current_booked = current_booked + 1, updated_at = ? WHERE id = ?",
            (timestamp, schedule_id),
        )

        # Gửi thông báo đến Giảng viên
        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, ?, 'instructor', ?, ?, 'schedule', 0, '/schedule', ?)""",
            (
                f"notif-{uid()}",
                sch["instructor_id"],
                f"Lịch hẹn mới: {student_name}",
                f"Học viên {student_name} vừa đặt lịch '{payload.topic}' cho ca '{sch['title']}'.",
                timestamp,
            ),
        )
        conn.commit()

    return {
        "message": "Đăng ký ca lịch thành công",
        "booking_id": booking_id,
        "status": initial_status,
    }


@router.patch("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def update_booking_status(
    booking_id: str,
    payload: UpdateBookingIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên duyệt, từ chối hoặc phản hồi ghi chú cho lịch hẹn của Học viên."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền duyệt lịch hẹn.",
        )

    timestamp = now_utc()

    with db() as conn:
        b_row = conn.execute(
            "SELECT * FROM schedule_bookings WHERE id = ?",
            (booking_id,),
        ).fetchone()

        if not b_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bản ghi đăng ký lịch hẹn.",
            )

        booking = row_dict(b_row)

        confirmed_time = timestamp if payload.status == "confirmed" else booking.get("confirmed_at")
        completed_time = timestamp if payload.status == "completed" else booking.get("completed_at")

        conn.execute(
            """UPDATE schedule_bookings SET
                booking_status = ?,
                instructor_reply = ?,
                confirmed_at = ?,
                completed_at = ?
            WHERE id = ?""",
            (
                payload.status,
                payload.instructor_reply,
                confirmed_time,
                completed_time,
                booking_id,
            ),
        )

        # Gửi thông báo phản hồi về cho sinh viên
        status_text_map = {
            "confirmed": "ĐÃ ĐƯỢC CHẤP THUẬN",
            "rejected": "ĐÃ TỪ CHỐI / YÊU CẦU DỜI LỊCH",
            "completed": "ĐÃ HOÀN THÀNH TƯ VẤN",
        }
        st_text = status_text_map.get(payload.status, payload.status.upper())

        reply_snippet = f" Lời nhắn: '{payload.instructor_reply}'" if payload.instructor_reply else ""
        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, ?, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
            (
                f"notif-{uid()}",
                booking["student_id"],
                f"Lịch hẹn {st_text}",
                f"Lịch hẹn chuyên môn '{booking['topic']}' {st_text}.{reply_snippet}",
                timestamp,
            ),
        )
        conn.commit()

    return {"message": "Cập nhật trạng thái lịch hẹn thành công", "booking_id": booking_id}


@router.delete("/{schedule_id}", status_code=status.HTTP_200_OK)
def delete_schedule(
    schedule_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên hoặc Admin xóa ca lịch."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền hủy ca lịch.",
        )

    with db() as conn:
        conn.execute("DELETE FROM academic_schedules WHERE id = ?", (schedule_id,))
        conn.commit()

    return {"message": "Đã hủy ca lịch thành công", "schedule_id": schedule_id}

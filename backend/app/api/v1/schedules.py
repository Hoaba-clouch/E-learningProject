from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc

router = APIRouter(prefix="/schedules", tags=["schedules"])

ALLOWED_CATEGORIES = {"exam", "defense", "office_hours", "review", "lab"}
ALLOWED_BOOKING_STATUSES = {"confirmed", "rejected", "completed"}
ALLOWED_SCHEDULE_STATUSES = {"confirmed", "pending", "completed", "cancelled"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _fmt_hour(hour: float) -> str:
    total_mins = max(0, int(round(float(hour) * 60)))
    hh, mm = divmod(total_mins, 60)
    return f"{hh:02d}:{mm:02d}"


def _is_online_room(room: str | None) -> bool:
    val = (room or "").strip().lower()
    return any(tok in val for tok in ("meet", "zoom", "teams", "trực tuyến", "online"))


def _validate_date(schedule_date: str) -> str:
    val = (schedule_date or "").strip()
    if not DATE_RE.fullmatch(val):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ngày tổ chức phải có định dạng YYYY-MM-DD.",
        )
    try:
        datetime.strptime(val, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ngày tổ chức không hợp lệ.",
        )
    return val


def _validate_hours(start_hour: float, end_hour: float) -> None:
    if not (0.0 <= start_hour < end_hour <= 24.0) or (end_hour - start_hour) < 0.25:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Giờ kết thúc phải lớn hơn giờ bắt đầu ít nhất 15 phút (trong khung 00:00 - 24:00).",
        )


def _check_room_conflict(
    conn: Any,
    room_or_link: str,
    schedule_date: str,
    start_hour: float,
    end_hour: float,
    exclude_id: str | None = None,
) -> None:
    if _is_online_room(room_or_link):
        return
    sql = (
        "SELECT id, title, start_hour, end_hour FROM academic_schedules "
        "WHERE schedule_date = ? AND LOWER(TRIM(room_or_link)) = LOWER(TRIM(?)) "
        "AND COALESCE(status, 'confirmed') != 'cancelled' "
        "AND start_hour < ? AND end_hour > ?"
    )
    params: list[Any] = [schedule_date, room_or_link, end_hour, start_hour]
    if exclude_id:
        sql += " AND id != ?"
        params.append(exclude_id)
    hit = conn.execute(sql, tuple(params)).fetchone()
    if hit:
        c = row_dict(hit)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Phòng '{room_or_link}' đã có ca '{c['title']}' vào khung "
                f"{_fmt_hour(c['start_hour'])} - {_fmt_hour(c['end_hour'])} ngày {schedule_date}."
            ),
        )


def _load_lookups(conn: Any) -> tuple[
    list[dict[str, Any]],
    dict[str, dict[str, Any]],
    list[dict[str, Any]],
    dict[str, dict[str, Any]],
    list[dict[str, Any]],
]:
    proj_rows = conn.execute(
        """SELECT ep.id, ep.code, ep.name, ep.course, ep.status, gr.repo_url
           FROM engineering_projects ep
           LEFT JOIN git_repositories gr ON gr.project_id = ep.id
           ORDER BY ep.name ASC"""
    ).fetchall()
    projects_list = [row_dict(r) for r in proj_rows]
    projects_map = {p["id"]: p for p in projects_list}

    course_rows = conn.execute(
        "SELECT id, code, name, name AS title FROM courses ORDER BY code ASC"
    ).fetchall()
    courses_list = [row_dict(r) for r in course_rows]
    courses_map = {c["id"]: c for c in courses_list}

    inst_rows = conn.execute(
        "SELECT id, email, display_name FROM users WHERE role = 'instructor' ORDER BY display_name ASC"
    ).fetchall()
    instructors_list = [row_dict(r) for r in inst_rows]

    return projects_list, projects_map, courses_list, courses_map, instructors_list


def _enrich_schedule(
    conn: Any,
    sched: dict[str, Any],
    role: str,
    user_id: str,
    projects_map: dict[str, dict[str, Any]],
    courses_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    s = dict(sched)
    proj = projects_map.get(s.get("project_id") or "")
    course = courses_map.get(s.get("course_id") or "")

    s["project_name"] = proj["name"] if proj else None
    s["project_code"] = proj["code"] if proj else None
    s["project_repo_url"] = proj.get("repo_url") if proj else None
    s["course_code"] = (course["code"] if course else None) or (
        proj["course"].split("·")[0].strip() if proj and proj.get("course") else None
    )

    sch_id = s["id"]
    if role in ("instructor", "admin"):
        b_rows = conn.execute(
            "SELECT * FROM schedule_bookings WHERE schedule_id = ? ORDER BY created_at DESC",
            (sch_id,),
        ).fetchall()
        bookings = [row_dict(b) for b in b_rows]
        s["bookings"] = bookings
        s["pending_bookings_count"] = sum(
            1 for b in bookings if b.get("booking_status") == "pending"
        )
        s["my_booking"] = None
    else:
        b_rows = conn.execute(
            "SELECT * FROM schedule_bookings WHERE schedule_id = ? AND student_id = ? ORDER BY created_at DESC",
            (sch_id, user_id),
        ).fetchall()
        bookings = [row_dict(b) for b in b_rows]
        s["bookings"] = bookings
        active_booking = next(
            (b for b in bookings if b.get("booking_status") in ("pending", "confirmed", "completed")),
            None,
        )
        s["my_booking"] = active_booking or (bookings[0] if bookings else None)
        s["pending_bookings_count"] = 0

    return s


class CreateScheduleIn(BaseModel):
    course_id: str = "class-capstone"
    project_id: str | None = None
    category: str = Field("exam", description="exam | defense | office_hours | review | lab")
    title: str
    room_or_link: str
    schedule_date: str  # YYYY-MM-DD
    start_hour: float
    end_hour: float
    break_hour: float = 0.0
    max_capacity: int = 30
    note: str = ""
    instructor_id: str | None = None
    instructor_name: str | None = None


class UpdateScheduleIn(BaseModel):
    course_id: str | None = None
    project_id: str | None = None
    category: str | None = None
    title: str | None = None
    room_or_link: str | None = None
    schedule_date: str | None = None
    start_hour: float | None = None
    end_hour: float | None = None
    break_hour: float | None = None
    max_capacity: int | None = None
    is_locked: bool | int | None = None
    status: str | None = None
    note: str | None = None
    instructor_id: str | None = None
    instructor_name: str | None = None


class BookScheduleIn(BaseModel):
    topic: str
    repo_or_doc_url: str = ""
    student_note: str = ""


class UpdateBookingIn(BaseModel):
    status: str = Field(..., description="confirmed | rejected | completed")
    instructor_reply: str = ""
    switch_to_online: bool = False
    online_link: str | None = None


@router.get("", status_code=status.HTTP_200_OK)
def get_schedules(
    course_id: str | None = None,
    category: str | None = None,
    schedule_date: str | None = None,
    project_id: str | None = None,
    search: str | None = None,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy danh sách lịch học vụ, hội đồng, phòng thi & cố vấn kèm project/course/bookings theo quyền."""
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
    if project_id:
        query += " AND project_id = ?"
        params.append(project_id)

    query += " ORDER BY schedule_date ASC, start_hour ASC"

    with db() as conn:
        projects_list, projects_map, courses_list, courses_map, instructors_list = _load_lookups(conn)
        sch_rows = conn.execute(query, tuple(params)).fetchall()
        schedules = [
            _enrich_schedule(conn, row_dict(r), role, user_id, projects_map, courses_map)
            for r in sch_rows
        ]

    kw = (search or "").strip().lower()
    if kw:
        schedules = [
            s
            for s in schedules
            if kw in (s.get("title") or "").lower()
            or kw in (s.get("room_or_link") or "").lower()
            or kw in (s.get("instructor_name") or "").lower()
            or kw in (s.get("note") or "").lower()
            or kw in (s.get("project_name") or "").lower()
            or kw in (s.get("project_code") or "").lower()
            or kw in (s.get("course_code") or "").lower()
        ]

    return {
        "schedules": schedules,
        "projects": projects_list,
        "courses": courses_list,
        "instructors": instructors_list,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: CreateScheduleIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên hoặc Admin tạo ca thi, hội đồng bảo vệ, lab hoặc khung giờ tư vấn 1-on-1."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền mở ca lịch mới.",
        )

    title = payload.title.strip()
    room_or_link = payload.room_or_link.strip()
    if not title or not room_or_link:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vui lòng nhập đầy đủ tiêu đề ca lịch và phòng tổ chức / link Meet.",
        )
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Loại lịch không hợp lệ. Chỉ chấp nhận: {', '.join(sorted(ALLOWED_CATEGORIES))}.",
        )
    schedule_date = _validate_date(payload.schedule_date)
    _validate_hours(payload.start_hour, payload.end_hour)
    if payload.max_capacity < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sĩ số tối đa của ca lịch phải lớn hơn hoặc bằng 1.",
        )

    sch_id = f"sch-{payload.category}-{uid()[:8]}"
    default_name = user.get("display_name") or user.get("name") or "Giảng viên Phụ trách"
    instructor_id = (payload.instructor_id or "").strip() if role == "admin" and payload.instructor_id else user["id"]
    instructor_name = (payload.instructor_name or "").strip() if payload.instructor_name else default_name
    project_id = payload.project_id.strip() if isinstance(payload.project_id, str) and payload.project_id.strip() else None
    timestamp = now_utc()

    with db() as conn:
        if role == "admin" and payload.instructor_id and not payload.instructor_name:
            inst_row = conn.execute(
                "SELECT display_name FROM users WHERE id = ?",
                (instructor_id,),
            ).fetchone()
            if inst_row:
                instructor_name = row_dict(inst_row).get("display_name") or default_name

        _check_room_conflict(conn, room_or_link, schedule_date, payload.start_hour, payload.end_hour)

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
                project_id,
                instructor_id,
                instructor_name,
                payload.category,
                title,
                room_or_link,
                schedule_date,
                payload.start_hour,
                payload.end_hour,
                payload.break_hour,
                payload.max_capacity,
                payload.note.strip(),
                timestamp,
                timestamp,
            ),
        )

        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, NULL, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
            (
                f"notif-{uid()}",
                f"Lịch mới: {title}",
                (
                    f"{instructor_name} đã mở ca '{title}' vào ngày {schedule_date} "
                    f"({_fmt_hour(payload.start_hour)} - {_fmt_hour(payload.end_hour)}) tại {room_or_link}."
                ),
                timestamp,
            ),
        )
        conn.commit()

        _, projects_map, _, courses_map, _ = _load_lookups(conn)
        created_row = conn.execute("SELECT * FROM academic_schedules WHERE id = ?", (sch_id,)).fetchone()
        enriched = _enrich_schedule(conn, row_dict(created_row), role, user["id"], projects_map, courses_map)

    return {"message": "Tạo ca lịch thành công", "schedule_id": sch_id, "schedule": enriched}


@router.patch("/{schedule_id}", status_code=status.HTTP_200_OK)
def update_schedule(
    schedule_id: str,
    payload: UpdateScheduleIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên hoặc Admin chỉnh sửa khung giờ, phòng, sĩ số, dự án hoặc khóa/mở khóa ca lịch."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền chỉnh sửa ca lịch.",
        )

    fields_set = payload.model_fields_set

    with db() as conn:
        existing_row = conn.execute(
            "SELECT * FROM academic_schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()
        if not existing_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ca lịch cần cập nhật.",
            )
        cur = row_dict(existing_row)

        next_course_id = payload.course_id.strip() if "course_id" in fields_set and payload.course_id else cur["course_id"]
        if "project_id" in fields_set:
            next_project_id = payload.project_id.strip() if isinstance(payload.project_id, str) and payload.project_id.strip() else None
        else:
            next_project_id = cur.get("project_id")

        next_category = payload.category if "category" in fields_set and payload.category is not None else cur["category"]
        if next_category not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Loại lịch không hợp lệ: {next_category}.",
            )

        next_title = payload.title.strip() if "title" in fields_set and payload.title is not None else cur["title"]
        next_room = payload.room_or_link.strip() if "room_or_link" in fields_set and payload.room_or_link is not None else cur["room_or_link"]
        if not next_title or not next_room:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Tiêu đề ca lịch và phòng tổ chức không được để trống.",
            )

        next_date = _validate_date(payload.schedule_date) if "schedule_date" in fields_set and payload.schedule_date is not None else cur["schedule_date"]
        next_start = float(payload.start_hour) if "start_hour" in fields_set and payload.start_hour is not None else float(cur["start_hour"])
        next_end = float(payload.end_hour) if "end_hour" in fields_set and payload.end_hour is not None else float(cur["end_hour"])
        _validate_hours(next_start, next_end)

        next_break = float(payload.break_hour) if "break_hour" in fields_set and payload.break_hour is not None else float(cur.get("break_hour") or 0.0)
        next_max = int(payload.max_capacity) if "max_capacity" in fields_set and payload.max_capacity is not None else int(cur["max_capacity"])
        current_booked = int(cur.get("current_booked") or 0)
        if next_max < 1 or next_max < current_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sĩ số tối đa ({next_max}) không được nhỏ hơn số lượng sinh viên đã đăng ký hiện tại ({current_booked}).",
            )

        next_locked = int(bool(payload.is_locked)) if "is_locked" in fields_set and payload.is_locked is not None else int(bool(cur.get("is_locked")))
        next_status = payload.status if "status" in fields_set and payload.status is not None else cur.get("status", "confirmed")
        if next_status not in ALLOWED_SCHEDULE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Trạng thái ca lịch không hợp lệ.",
            )

        next_note = payload.note.strip() if "note" in fields_set and payload.note is not None else (cur.get("note") or "")
        next_inst_id = (payload.instructor_id or "").strip() if "instructor_id" in fields_set and payload.instructor_id else cur["instructor_id"]
        next_inst_name = (payload.instructor_name or "").strip() if "instructor_name" in fields_set and payload.instructor_name else cur["instructor_name"]

        _check_room_conflict(conn, next_room, next_date, next_start, next_end, exclude_id=schedule_id)

        timestamp = now_utc()
        conn.execute(
            """UPDATE academic_schedules SET
                course_id = ?, project_id = ?, instructor_id = ?, instructor_name = ?,
                category = ?, title = ?, room_or_link = ?, schedule_date = ?,
                start_hour = ?, end_hour = ?, break_hour = ?, max_capacity = ?,
                is_locked = ?, status = ?, note = ?, updated_at = ?
               WHERE id = ?""",
            (
                next_course_id,
                next_project_id,
                next_inst_id,
                next_inst_name,
                next_category,
                next_title,
                next_room,
                next_date,
                next_start,
                next_end,
                next_break,
                next_max,
                next_locked,
                next_status,
                next_note,
                timestamp,
                schedule_id,
            ),
        )

        changed_core = (
            next_date != cur["schedule_date"]
            or abs(next_start - float(cur["start_hour"])) > 1e-6
            or abs(next_end - float(cur["end_hour"])) > 1e-6
            or next_room != cur["room_or_link"]
            or next_locked != int(bool(cur.get("is_locked")))
        )
        if changed_core:
            active_students = conn.execute(
                "SELECT DISTINCT student_id FROM schedule_bookings WHERE schedule_id = ? AND booking_status IN ('pending', 'confirmed')",
                (schedule_id,),
            ).fetchall()
            lock_note = " (Ca đã bị khóa nhận thêm đăng ký)" if next_locked else ""
            for st in active_students:
                conn.execute(
                    """INSERT INTO notifications (
                        id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                    ) VALUES (?, ?, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
                    (
                        f"notif-{uid()}",
                        st["student_id"],
                        f"Cập nhật lịch: {next_title}",
                        f"Ca '{next_title}' cập nhật sang {next_date} ({_fmt_hour(next_start)} - {_fmt_hour(next_end)}) tại {next_room}{lock_note}.",
                        timestamp,
                    ),
                )

        conn.commit()
        _, projects_map, _, courses_map, _ = _load_lookups(conn)
        updated_row = conn.execute("SELECT * FROM academic_schedules WHERE id = ?", (schedule_id,)).fetchone()
        enriched = _enrich_schedule(conn, row_dict(updated_row), role, user["id"], projects_map, courses_map)

    return {"message": "Cập nhật ca lịch thành công", "schedule": enriched}


@router.post("/{schedule_id}/book", status_code=status.HTTP_201_CREATED)
def book_schedule_slot(
    schedule_id: str,
    payload: BookScheduleIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Học viên đăng ký giữ chỗ ca thi/hội đồng hoặc đặt lịch hẹn tư vấn 1-on-1 với Giảng viên."""
    role = user.get("role", "student")
    if role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Học viên mới được phép đăng ký tham gia hoặc đặt lịch hẹn 1-1.",
        )

    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vui lòng nhập chủ đề / nội dung cần trao đổi hoặc đăng ký.",
        )

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

        if sch.get("status") in ("completed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ca lịch này đã kết thúc hoặc bị hủy.",
            )

        if int(sch.get("current_booked") or 0) >= int(sch.get("max_capacity") or 30):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ca lịch này đã đủ sĩ số tối đa.",
            )

        existing = conn.execute(
            "SELECT id FROM schedule_bookings WHERE schedule_id = ? AND student_id = ? AND booking_status IN ('pending', 'confirmed', 'completed')",
            (schedule_id, student_id),
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã đăng ký ca lịch này rồi. Vui lòng kiểm tra mục Lịch Cố Vấn 1-1.",
            )

        overlap = conn.execute(
            """SELECT s.title, s.schedule_date, s.start_hour, s.end_hour
               FROM schedule_bookings sb
               JOIN academic_schedules s ON s.id = sb.schedule_id
               WHERE sb.student_id = ?
                 AND sb.booking_status IN ('pending', 'confirmed')
                 AND s.id != ?
                 AND s.schedule_date = ?
                 AND s.start_hour < ?
                 AND s.end_hour > ?""",
            (student_id, schedule_id, sch["schedule_date"], sch["end_hour"], sch["start_hour"]),
        ).fetchone()
        if overlap:
            ov = row_dict(overlap)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Bạn bị trùng lịch cá nhân với '{ov['title']}' vào khung "
                    f"{_fmt_hour(ov['start_hour'])} - {_fmt_hour(ov['end_hour'])} ngày {ov['schedule_date']}."
                ),
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
                topic,
                payload.repo_or_doc_url.strip(),
                payload.student_note.strip(),
                initial_status,
                timestamp if initial_status == "confirmed" else None,
                timestamp,
            ),
        )

        conn.execute(
            "UPDATE academic_schedules SET current_booked = current_booked + 1, updated_at = ? WHERE id = ?",
            (timestamp, schedule_id),
        )

        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, ?, 'instructor', ?, ?, 'schedule', 0, '/schedule', ?)""",
            (
                f"notif-{uid()}",
                sch["instructor_id"],
                f"Lịch hẹn mới: {student_name}",
                f"Học viên {student_name} vừa đặt lịch '{topic}' cho ca '{sch['title']}'.",
                timestamp,
            ),
        )
        conn.commit()
        created_booking = row_dict(
            conn.execute("SELECT * FROM schedule_bookings WHERE id = ?", (booking_id,)).fetchone()
        )

    return {
        "message": "Đăng ký ca lịch thành công",
        "booking_id": booking_id,
        "status": initial_status,
        "booking": created_booking,
    }


@router.patch("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def update_booking_status(
    booking_id: str,
    payload: UpdateBookingIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên/Admin duyệt, từ chối, chuyển Online hoặc đánh dấu hoàn thành lịch hẹn."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền duyệt lịch hẹn.",
        )

    if payload.status not in ALLOWED_BOOKING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Trạng thái phản hồi không hợp lệ. Chấp nhận: {', '.join(sorted(ALLOWED_BOOKING_STATUSES))}.",
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

        sch_row = conn.execute(
            "SELECT * FROM academic_schedules WHERE id = ?",
            (booking["schedule_id"],),
        ).fetchone()
        if not sch_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ca lịch gốc.",
            )
        sch = row_dict(sch_row)

        prev_status = booking.get("booking_status")
        next_status = payload.status

        if prev_status in ("pending", "confirmed") and next_status == "rejected":
            conn.execute(
                """UPDATE academic_schedules
                   SET current_booked = CASE WHEN current_booked > 0 THEN current_booked - 1 ELSE 0 END,
                       updated_at = ?
                   WHERE id = ?""",
                (timestamp, sch["id"]),
            )
        elif prev_status == "rejected" and next_status in ("confirmed", "completed"):
            if int(sch.get("current_booked") or 0) >= int(sch.get("max_capacity") or 30):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ca lịch hiện đã đủ sĩ số tối đa, không thể khôi phục lịch hẹn này.",
                )
            conn.execute(
                "UPDATE academic_schedules SET current_booked = current_booked + 1, updated_at = ? WHERE id = ?",
                (timestamp, sch["id"]),
            )

        reply = (payload.instructor_reply or "").strip()
        if payload.switch_to_online:
            meet_url = (payload.online_link or "").strip() or "https://meet.google.com/codemind-mentor-1on1"
            if meet_url not in reply:
                reply = f"Hình thức: Trực tuyến ({meet_url}). {reply}".strip()

        confirmed_time = timestamp if next_status == "confirmed" else booking.get("confirmed_at")
        completed_time = timestamp if next_status == "completed" else booking.get("completed_at")

        conn.execute(
            """UPDATE schedule_bookings SET
                booking_status = ?,
                instructor_reply = ?,
                confirmed_at = ?,
                completed_at = ?
               WHERE id = ?""",
            (next_status, reply, confirmed_time, completed_time, booking_id),
        )

        status_text_map = {
            "confirmed": "ĐÃ ĐƯỢC CHẤP THUẬN",
            "rejected": "ĐÃ TỪ CHỐI / YÊU CẦU DỜI LỊCH",
            "completed": "ĐÃ HOÀN THÀNH TƯ VẤN",
        }
        st_text = status_text_map.get(next_status, next_status.upper())
        reply_snippet = f" Lời nhắn: '{reply}'" if reply else ""

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

        _, projects_map, _, courses_map, _ = _load_lookups(conn)
        updated_booking = row_dict(
            conn.execute("SELECT * FROM schedule_bookings WHERE id = ?", (booking_id,)).fetchone()
        )
        updated_sch = row_dict(
            conn.execute("SELECT * FROM academic_schedules WHERE id = ?", (sch["id"],)).fetchone()
        )
        enriched_sch = _enrich_schedule(conn, updated_sch, role, user["id"], projects_map, courses_map)

    return {
        "message": "Cập nhật trạng thái lịch hẹn thành công",
        "booking_id": booking_id,
        "booking": updated_booking,
        "schedule": enriched_sch,
    }


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def cancel_booking(
    booking_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Học viên tự hủy đăng ký đang chờ/đã duyệt hoặc Giảng viên/Admin hủy lượt đặt."""
    role = user.get("role", "student")
    user_id = user["id"]
    timestamp = now_utc()

    with db() as conn:
        b_row = conn.execute(
            "SELECT * FROM schedule_bookings WHERE id = ?",
            (booking_id,),
        ).fetchone()
        if not b_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lượt đăng ký lịch hẹn.",
            )
        booking = row_dict(b_row)

        if role == "student" and booking["student_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền hủy đăng ký của học viên khác.",
            )

        if booking.get("booking_status") == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hủy lịch hẹn đã hoàn thành.",
            )

        sch_row = conn.execute(
            "SELECT * FROM academic_schedules WHERE id = ?",
            (booking["schedule_id"],),
        ).fetchone()
        sch = row_dict(sch_row) if sch_row else None

        if booking.get("booking_status") in ("pending", "confirmed") and sch:
            conn.execute(
                """UPDATE academic_schedules
                   SET current_booked = CASE WHEN current_booked > 0 THEN current_booked - 1 ELSE 0 END,
                       updated_at = ?
                   WHERE id = ?""",
                (timestamp, sch["id"]),
            )

        conn.execute("DELETE FROM schedule_bookings WHERE id = ?", (booking_id,))

        if sch:
            if role == "student":
                conn.execute(
                    """INSERT INTO notifications (
                        id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                    ) VALUES (?, ?, 'instructor', ?, ?, 'schedule', 0, '/schedule', ?)""",
                    (
                        f"notif-{uid()}",
                        booking["instructor_id"],
                        f"Học viên hủy lịch: {booking['student_name']}",
                        f"{booking['student_name']} đã hủy đăng ký '{booking['topic']}' ở ca '{sch['title']}'.",
                        timestamp,
                    ),
                )
            else:
                conn.execute(
                    """INSERT INTO notifications (
                        id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                    ) VALUES (?, ?, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
                    (
                        f"notif-{uid()}",
                        booking["student_id"],
                        f"Đã hủy lượt đăng ký: {sch['title']}",
                        f"Lượt đăng ký '{booking['topic']}' cho ca '{sch['title']}' đã được quản trị/giảng viên hủy.",
                        timestamp,
                    ),
                )

        conn.commit()

    return {"message": "Đã hủy đăng ký lịch hẹn thành công", "booking_id": booking_id}


@router.delete("/{schedule_id}", status_code=status.HTTP_200_OK)
def delete_schedule(
    schedule_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên hoặc Admin xóa ca lịch và thông báo cho các học viên đã đăng ký."""
    role = user.get("role", "student")
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền hủy ca lịch.",
        )

    timestamp = now_utc()

    with db() as conn:
        sch_row = conn.execute(
            "SELECT * FROM academic_schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()
        if not sch_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ca lịch để xóa.",
            )
        sch = row_dict(sch_row)

        active_students = conn.execute(
            "SELECT DISTINCT student_id FROM schedule_bookings WHERE schedule_id = ? AND booking_status IN ('pending', 'confirmed')",
            (schedule_id,),
        ).fetchall()
        for st in active_students:
            conn.execute(
                """INSERT INTO notifications (
                    id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                ) VALUES (?, ?, 'student', ?, ?, 'schedule', 0, '/schedule', ?)""",
                (
                    f"notif-{uid()}",
                    st["student_id"],
                    f"Hủy ca lịch: {sch['title']}",
                    f"Ca '{sch['title']}' ngày {sch['schedule_date']} tại {sch['room_or_link']} đã được hủy.",
                    timestamp,
                ),
            )

        conn.execute("DELETE FROM academic_schedules WHERE id = ?", (schedule_id,))
        conn.commit()

    return {"message": "Đã hủy ca lịch thành công", "schedule_id": schedule_id}

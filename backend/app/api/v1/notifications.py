from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc

router = APIRouter(prefix="/notifications", tags=["notifications"])


class BroadcastIn(BaseModel):
    title: str
    desc_text: str
    target_role: str = "all"
    action_url: str = ""


def _is_notification_visible_to_user(row: dict[str, Any], user_id: str, role: str) -> bool:
    rec = str(row.get("recipient_user_id") or "").strip()
    if rec:
        return rec == user_id
    t_role = str(row.get("target_role") or "").strip().lower()
    cat = str(row.get("category") or "").strip().lower()
    return t_role == role or t_role == "all" or cat == "broadcast"


@router.get("", status_code=status.HTTP_200_OK)
def get_notifications(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy danh sách thông báo của người dùng và vai trò tương ứng (trạng thái đọc lưu riêng từng tài khoản)."""
    user_id = str(user["id"])
    role = str(user.get("role") or "student").strip().lower()

    with db() as conn:
        rows = conn.execute(
            """SELECT * FROM notifications
               WHERE recipient_user_id = ?
                  OR ((recipient_user_id IS NULL OR recipient_user_id = '')
                      AND (target_role = ? OR target_role = 'all' OR category = 'broadcast'))
               ORDER BY created_at DESC
               LIMIT 30""",
            (user_id, role),
        ).fetchall()
        read_rows = conn.execute(
            "SELECT notification_id FROM notification_reads WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        read_ids = {str(r["notification_id"]) for r in read_rows}

        notifs: list[dict[str, Any]] = []
        for r in rows:
            n = row_dict(r) or {}
            nid = str(n.get("id") or "")
            rec = str(n.get("recipient_user_id") or "").strip()
            is_user_read = nid in read_ids or (rec == user_id and int(n.get("is_read") or 0) == 1)
            n["is_read"] = 1 if is_user_read else 0
            notifs.append(n)

        unread_count = sum(1 for n in notifs if not n.get("is_read"))

    return {
        "notifications": notifs,
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(notification_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Đánh dấu một thông báo đã đọc cho riêng tài khoản hiện tại."""
    user_id = str(user["id"])
    role = str(user.get("role") or "student").strip().lower()
    now = now_utc()
    with db() as conn:
        n_row = conn.execute("SELECT * FROM notifications WHERE id = ?", (notification_id,)).fetchone()
        if not n_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo")
        nd = row_dict(n_row) or {}
        if not _is_notification_visible_to_user(nd, user_id, role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập thông báo này")

        conn.execute(
            "INSERT OR IGNORE INTO notification_reads(user_id, notification_id, read_at) VALUES(?,?,?)",
            (user_id, notification_id, now),
        )
        if str(nd.get("recipient_user_id") or "").strip() == user_id:
            conn.execute(
                "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?",
                (notification_id, user_id),
            )
    return {"status": "ok", "id": notification_id}


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Đánh dấu tất cả thông báo hiển thị với tài khoản hiện tại là đã đọc (không ảnh hưởng tài khoản khác)."""
    user_id = str(user["id"])
    role = str(user.get("role") or "student").strip().lower()
    now = now_utc()
    with db() as conn:
        rows = conn.execute(
            """SELECT id, recipient_user_id FROM notifications
               WHERE recipient_user_id = ?
                  OR ((recipient_user_id IS NULL OR recipient_user_id = '')
                      AND (target_role = ? OR target_role = 'all' OR category = 'broadcast'))""",
            (user_id, role),
        ).fetchall()
        for r in rows:
            conn.execute(
                "INSERT OR IGNORE INTO notification_reads(user_id, notification_id, read_at) VALUES(?,?,?)",
                (user_id, r["id"], now),
            )
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?",
            (user_id,),
        )
    return {"status": "ok"}


@router.post("/broadcast", status_code=status.HTTP_201_CREATED)
def create_broadcast(payload: BroadcastIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Admin phát thông báo toàn trường hoặc cho nhóm vai trò."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Admin mới có quyền phát thông báo toàn trường")

    notif_id = f"notif-bc-{uid()[:8]}"
    timestamp = now_utc()
    with db() as conn:
        conn.execute(
            """INSERT INTO notifications(
                   id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                notif_id,
                None,
                payload.target_role,
                payload.title,
                payload.desc_text,
                "broadcast",
                0,
                payload.action_url,
                timestamp,
            ),
        )
    return {"status": "created", "id": notif_id}

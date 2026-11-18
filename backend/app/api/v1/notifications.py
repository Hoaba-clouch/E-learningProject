from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])


class BroadcastIn(BaseModel):
    title: str
    desc_text: str
    target_role: str = "all"
    action_url: str = ""


@router.get("", status_code=status.HTTP_200_OK)
def get_notifications(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy danh sách thông báo của người dùng và vai trò tương ứng (bao gồm thông báo toàn trường)."""
    user_id = user["id"]
    role = user.get("role", "student")

    with db() as conn:
        rows = conn.execute(
            """SELECT * FROM notifications
               WHERE recipient_user_id = ?
                  OR target_role = ?
                  OR target_role = 'all'
                  OR category = 'broadcast'
               ORDER BY created_at DESC
               LIMIT 30""",
            (user_id, role),
        ).fetchall()

        notifs = [row_dict(r) for r in rows]
        unread_count = sum(1 for n in notifs if not n.get("is_read"))

    return {
        "notifications": notifs,
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(notification_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Đánh dấu một thông báo đã đọc."""
    with db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ?",
            (notification_id,),
        )
    return {"status": "ok", "id": notification_id}


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Đánh dấu tất cả thông báo thuộc người dùng / vai trò đã đọc."""
    user_id = user["id"]
    role = user.get("role", "student")
    with db() as conn:
        conn.execute(
            """UPDATE notifications
               SET is_read = 1
               WHERE recipient_user_id = ? OR target_role = ? OR target_role = 'all'""",
            (user_id, role),
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

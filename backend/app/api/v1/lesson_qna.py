from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc

router = APIRouter(prefix="/qna", tags=["Lesson Q&A Discussions"])

_QNA_TABLES_READY = False

VALID_REACTIONS = {"like", "love", "care", "haha", "wow", "sad", "helpful"}


def _empty_reaction_counts() -> dict[str, int]:
    return {
        "like": 0,
        "love": 0,
        "care": 0,
        "haha": 0,
        "wow": 0,
        "sad": 0,
        "helpful": 0,
    }


def _ensure_qna_tables(conn: Any) -> None:
    global _QNA_TABLES_READY
    if _QNA_TABLES_READY:
        return

    conn.execute(
        """CREATE TABLE IF NOT EXISTS lesson_qna_comments (
            id VARCHAR(64) PRIMARY KEY,
            subject_id VARCHAR(64) NOT NULL,
            lesson_id VARCHAR(64) NOT NULL,
            lesson_title VARCHAR(190) NOT NULL DEFAULT '',
            parent_id VARCHAR(64) NULL,
            reply_to_name VARCHAR(140) NULL,
            user_id VARCHAR(64) NOT NULL,
            author_name VARCHAR(140) NOT NULL,
            author_role VARCHAR(32) NOT NULL DEFAULT 'student',
            author_avatar_url LONGTEXT NULL,
            content TEXT NOT NULL,
            code_snippet TEXT NULL,
            video_timestamp VARCHAR(16) NULL,
            is_pinned TINYINT(1) NOT NULL DEFAULT 0,
            is_resolved TINYINT(1) NOT NULL DEFAULT 0,
            created_at VARCHAR(40) NOT NULL,
            updated_at VARCHAR(40) NOT NULL,
            INDEX idx_qna_subj_lesson (subject_id, lesson_id, created_at),
            INDEX idx_qna_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""
    )

    conn.execute(
        """CREATE TABLE IF NOT EXISTS lesson_qna_reactions (
            comment_id VARCHAR(64) NOT NULL,
            user_id VARCHAR(64) NOT NULL,
            reaction_type VARCHAR(16) NOT NULL DEFAULT 'like',
            created_at VARCHAR(40) NOT NULL,
            PRIMARY KEY (comment_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""
    )

    existing = conn.execute("SELECT id FROM lesson_qna_comments LIMIT 1").fetchone()
    if not existing:
        ts = now_utc()
        inst_row = conn.execute(
            "SELECT full_name FROM users WHERE id = 'user-instructor'"
        ).fetchone()
        inst_name = (inst_row["full_name"] if inst_row and inst_row.get("full_name") else "Giảng viên Hướng dẫn")
        seed_comments = [
            # Thread 1 in OOP 1.1 (Pinned with Instructor verified answer + nested peer reply)
            (
                "qna-oop-1",
                "oop",
                "1.1",
                "Tư duy Hướng đối tượng & Đóng gói dữ liệu",
                None,
                None,
                "usr-sv-04",
                "Võ Nhật Huy",
                "student",
                None,
                "Mọi người cho mình hỏi ở đoạn phút 04:15 khi khai báo thuộc tính `balance` là `private`, nếu class con kế thừa muốn đọc trực tiếp mà không qua getter thì dùng `protected` có vi phạm tính đóng gói không ạ?",
                "class BankAccount {\nprivate:\n    double balance;\npublic:\n    double getBalance() const { return balance; }\n};",
                "04:15",
                1,
                1,
                "2026-11-25T08:15:00Z",
                "2026-11-25T08:15:00Z",
            ),
            (
                "qna-oop-1-r1",
                "oop",
                "1.1",
                "Tư duy Hướng đối tượng & Đóng gói dữ liệu",
                "qna-oop-1",
                "Võ Nhật Huy",
                "user-instructor",
                inst_name,
                "instructor",
                None,
                "Câu hỏi rất hay nhé Huy! Với dữ liệu nhạy cảm như `balance` (số dư tài khoản), em vẫn nên giữ `private` tuyệt đối và cung cấp hàm `deposit()` / `withdraw()` có kiểm tra điều kiện biên. Nếu mở `protected`, bất kỳ class con nào cũng sửa thẳng được `balance = -9999` làm vỡ bất biến (invariant) của class cha nhé.",
                None,
                None,
                1,
                1,
                "2026-11-25T08:28:00Z",
                "2026-11-25T08:28:00Z",
            ),
            (
                "qna-oop-1-r2",
                "oop",
                "1.1",
                "Tư duy Hướng đối tượng & Đóng gói dữ liệu",
                "qna-oop-1",
                inst_name,
                "usr-sv-04",
                "Võ Nhật Huy",
                "student",
                None,
                "Dạ em hiểu rõ bản chất bất biến rồi ạ, em cảm ơn giảng viên nhiều!",
                None,
                None,
                0,
                0,
                "2026-11-25T08:35:00Z",
                "2026-11-25T08:35:00Z",
            ),
            # Thread 2 in OOP 1.1 (Unanswered student question so Instructor can demo replying live!)
            (
                "qna-oop-2",
                "oop",
                "1.1",
                "Tư duy Hướng đối tượng & Đóng gói dữ liệu",
                None,
                None,
                "usr-sv-05",
                "Phan Đình Nghị",
                "student",
                None,
                "Anh em nào làm tới câu Quiz số 2 với bài Lab cuối chương cho mình hỏi: khi hàm tạo (Constructor) nhận chuỗi rỗng thì mình ném `std::invalid_argument` hay gán giá trị mặc định sẽ đúng chuẩn test trên hệ thống hơn nhỉ?",
                None,
                "07:50",
                0,
                0,
                "2026-11-25T14:10:00Z",
                "2026-11-25T14:10:00Z",
            ),
            # Thread in DSA 1.1
            (
                "qna-dsa-1",
                "dsa",
                "1.1",
                "Độ phức tạp Thuật toán Big-O & Mảng động",
                None,
                None,
                "usr-sv-03",
                "Nguyễn Bá Hòa",
                "student",
                None,
                "Phút 05:20 giải thích `std::vector` nhân đôi dung lượng (amortized O(1)) cực dễ hiểu luôn. Trước giờ đi phỏng vấn cứ bị nhầm `push_back` lúc nào cũng tốn O(n)!",
                None,
                "05:20",
                0,
                1,
                ts,
                ts,
            ),
        ]
        for row in seed_comments:
            conn.execute(
                """INSERT INTO lesson_qna_comments(
                    id, subject_id, lesson_id, lesson_title, parent_id, reply_to_name,
                    user_id, author_name, author_role, author_avatar_url, content,
                    code_snippet, video_timestamp, is_pinned, is_resolved, created_at, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                row,
            )

        seed_reactions = [
            ("qna-oop-1", "user-student", "helpful", ts),
            ("qna-oop-1", "user-instructor", "like", ts),
            ("qna-oop-1-r1", "user-student", "love", ts),
            ("qna-oop-1-r1", "usr-sv-04", "helpful", ts),
            ("qna-oop-1-r1", "usr-sv-05", "like", ts),
            ("qna-oop-2", "usr-sv-04", "like", ts),
            ("qna-dsa-1", "user-student", "love", ts),
        ]
        for r_row in seed_reactions:
            conn.execute(
                """INSERT INTO lesson_qna_reactions(comment_id, user_id, reaction_type, created_at)
                   VALUES(?,?,?,?)""",
                r_row,
            )
        conn.commit()

    _QNA_TABLES_READY = True


def _normalize_lesson_key(raw: str | None) -> str:
    if not raw:
        return ""
    clean = raw.strip()
    # Normalize ids like "oop-1.1" or "ch1-1.1" -> "1.1" if ending with X.Y
    parts = clean.split("-")
    if len(parts) >= 2 and "." in parts[-1]:
        tail = parts[-1]
        if all(seg.isdigit() for seg in tail.split(".") if seg):
            return tail
    return clean


class CreateQnaCommentIn(BaseModel):
    subject_id: str = Field(..., min_length=1, max_length=64)
    lesson_id: str = Field(..., min_length=1, max_length=64)
    lesson_title: str = Field(default="", max_length=190)
    parent_id: str | None = Field(default=None, max_length=64)
    reply_to_name: str | None = Field(default=None, max_length=140)
    content: str = Field(..., min_length=2, max_length=4000)
    code_snippet: str | None = Field(default=None, max_length=6000)
    video_timestamp: str | None = Field(default=None, max_length=16)


class UpdateQnaCommentIn(BaseModel):
    content: str = Field(..., min_length=2, max_length=4000)
    code_snippet: str | None = Field(default=None, max_length=6000)


class ReactQnaCommentIn(BaseModel):
    reaction_type: str = Field(default="like")


@router.get("/threads")
def list_qna_threads(
    subject_id: str = Query(..., min_length=1, max_length=64),
    lesson_id: str | None = Query(default=None, max_length=64),
    filter_mode: str = Query(default="all"),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    norm_lesson = _normalize_lesson_key(lesson_id)
    with db() as conn:
        _ensure_qna_tables(conn)

        if norm_lesson and norm_lesson.lower() != "all":
            rows = conn.execute(
                """SELECT * FROM lesson_qna_comments
                   WHERE subject_id = ? AND lesson_id = ?
                   ORDER BY created_at ASC""",
                (subject_id.strip(), norm_lesson),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM lesson_qna_comments
                   WHERE subject_id = ?
                   ORDER BY created_at ASC""",
                (subject_id.strip(),),
            ).fetchall()

        all_comments = [row_dict(r) for r in rows]
        comment_ids = [c["id"] for c in all_comments]

        # Live avatar lookup for authors if available in users table
        author_ids = sorted({c["user_id"] for c in all_comments if c.get("user_id")})
        avatar_map: dict[str, str] = {}
        if author_ids:
            ph = ",".join("?" for _ in author_ids)
            u_rows = conn.execute(
                f"SELECT id, avatar_url FROM users WHERE id IN ({ph})",
                tuple(author_ids),
            ).fetchall()
            for ur in u_rows:
                if ur.get("avatar_url"):
                    avatar_map[ur["id"]] = ur["avatar_url"]

        reactions_by_comment: dict[str, list[dict[str, Any]]] = {}
        if comment_ids:
            ph = ",".join("?" for _ in comment_ids)
            r_rows = conn.execute(
                f"SELECT comment_id, user_id, reaction_type FROM lesson_qna_reactions WHERE comment_id IN ({ph})",
                tuple(comment_ids),
            ).fetchall()
            for rr in r_rows:
                reactions_by_comment.setdefault(rr["comment_id"], []).append(row_dict(rr))

    def _format_item(c: dict[str, Any]) -> dict[str, Any]:
        reacs = reactions_by_comment.get(c["id"], [])
        counts = _empty_reaction_counts()
        my_reaction = None
        for rc in reacs:
            rt = rc.get("reaction_type") or "like"
            if rt in counts:
                counts[rt] += 1
            else:
                counts["like"] += 1
            if rc.get("user_id") == user["id"]:
                my_reaction = rt if rt in counts else "like"
        return {
            "id": c["id"],
            "subject_id": c["subject_id"],
            "lesson_id": c["lesson_id"],
            "lesson_title": c.get("lesson_title") or "",
            "parent_id": c.get("parent_id"),
            "reply_to_name": c.get("reply_to_name"),
            "user_id": c["user_id"],
            "author_name": c["author_name"],
            "author_role": c.get("author_role") or "student",
            "author_avatar_url": avatar_map.get(c["user_id"]) or c.get("author_avatar_url"),
            "content": c["content"],
            "code_snippet": c.get("code_snippet"),
            "video_timestamp": c.get("video_timestamp"),
            "is_pinned": bool(c.get("is_pinned")),
            "is_resolved": bool(c.get("is_resolved")),
            "reaction_counts": counts,
            "total_reactions": sum(counts.values()),
            "my_reaction": my_reaction,
            "can_edit": c["user_id"] == user["id"],
            "can_delete": c["user_id"] == user["id"]
            or (user.get("role") or "").lower() in ("instructor", "admin"),
            "created_at": c["created_at"],
            "updated_at": c["updated_at"],
        }

    formatted = [_format_item(c) for c in all_comments]
    roots = [c for c in formatted if not c["parent_id"]]
    replies_by_parent: dict[str, list[dict[str, Any]]] = {}
    for c in formatted:
        if c["parent_id"]:
            replies_by_parent.setdefault(c["parent_id"], []).append(c)

    threads: list[dict[str, Any]] = []
    unanswered_count = 0
    for root in roots:
        reps = replies_by_parent.get(root["id"], [])
        # Sort pinned instructor replies first if needed, otherwise chronological like Facebook
        has_instructor_reply = any(
            r["author_role"] in ("instructor", "admin") or r["is_pinned"] for r in reps
        )
        is_answered = root["is_resolved"] or root["is_pinned"] or has_instructor_reply or len(reps) > 0
        if not is_answered and root["author_role"] == "student":
            unanswered_count += 1
        root_out = {
            **root,
            "has_instructor_reply": has_instructor_reply,
            "replies": reps,
        }
        if filter_mode == "unanswered" and is_answered:
            continue
        if filter_mode == "pinned" and not (root["is_pinned"] or any(r["is_pinned"] for r in reps)):
            continue
        threads.append(root_out)

    # Pinned threads first, then newest root questions first (exact F8 order)
    threads.sort(key=lambda t: (1 if t["is_pinned"] else 0, t["created_at"]), reverse=True)

    return {
        "subject_id": subject_id,
        "lesson_id": norm_lesson or "all",
        "total_comments": len(formatted),
        "total_threads": len(roots),
        "unanswered_count": unanswered_count,
        "threads": threads,
    }


@router.post("/comments", status_code=status.HTTP_201_CREATED)
def create_qna_comment(
    payload: CreateQnaCommentIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    clean_content = payload.content.strip()
    if len(clean_content) < 2:
        raise HTTPException(status_code=422, detail="Nội dung bình luận quá ngắn.")

    norm_lesson = _normalize_lesson_key(payload.lesson_id) or "1.1"
    clean_code = (payload.code_snippet or "").strip() or None
    clean_ts = (payload.video_timestamp or "").strip() or None
    role = (user.get("role") or "student").lower()
    author_name = (
        user.get("full_name")
        or user.get("display_name")
        or user.get("name")
        or ("Giảng viên" if role == "instructor" else "Học viên")
    )
    comment_id = f"qna-{uid()[:10]}"
    ts = now_utc()

    with db() as conn:
        _ensure_qna_tables(conn)
        parent_row = None
        root_parent_id = None
        if payload.parent_id:
            parent_row = conn.execute(
                "SELECT * FROM lesson_qna_comments WHERE id = ?",
                (payload.parent_id.strip(),),
            ).fetchone()
            if not parent_row:
                raise HTTPException(status_code=404, detail="Bình luận gốc không còn tồn tại.")
            # Flatten 2-level tree like Facebook/F8 (replies attach to top-level root, preserving @reply_to_name)
            root_parent_id = parent_row["parent_id"] or parent_row["id"]
            norm_lesson = parent_row["lesson_id"]

        conn.execute(
            """INSERT INTO lesson_qna_comments(
                id, subject_id, lesson_id, lesson_title, parent_id, reply_to_name,
                user_id, author_name, author_role, author_avatar_url, content,
                code_snippet, video_timestamp, is_pinned, is_resolved, created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                comment_id,
                payload.subject_id.strip(),
                norm_lesson,
                payload.lesson_title.strip(),
                root_parent_id,
                (payload.reply_to_name or "").strip() or None,
                user["id"],
                author_name,
                role,
                user.get("avatar_url"),
                clean_content,
                clean_code,
                clean_ts,
                0,
                1 if (root_parent_id and role in ("instructor", "admin")) else 0,
                ts,
                ts,
            ),
        )

        if root_parent_id and role in ("instructor", "admin"):
            conn.execute(
                "UPDATE lesson_qna_comments SET is_resolved = 1, updated_at = ? WHERE id = ?",
                (ts, root_parent_id),
            )

        # Send notification to parent comment author if someone else replied
        if parent_row and parent_row["user_id"] != user["id"]:
            try:
                conn.execute(
                    """INSERT INTO notifications(id, user_id, title, body, category, is_read, created_at)
                       VALUES(?,?,?,?,?,0,?)""",
                    (
                        f"ntf-{uid()[:10]}",
                        parent_row["user_id"],
                        f"{author_name} đã phản hồi bình luận của bạn",
                        f"Bài {norm_lesson}: {clean_content[:110]}",
                        "learning",
                        ts,
                    ),
                )
            except Exception:
                pass

        conn.commit()

    return {
        "id": comment_id,
        "subject_id": payload.subject_id.strip(),
        "lesson_id": norm_lesson,
        "lesson_title": payload.lesson_title.strip(),
        "parent_id": root_parent_id,
        "reply_to_name": (payload.reply_to_name or "").strip() or None,
        "user_id": user["id"],
        "author_name": author_name,
        "author_role": role,
        "author_avatar_url": user.get("avatar_url"),
        "content": clean_content,
        "code_snippet": clean_code,
        "video_timestamp": clean_ts,
        "is_pinned": False,
        "is_resolved": bool(root_parent_id and role in ("instructor", "admin")),
        "reaction_counts": _empty_reaction_counts(),
        "total_reactions": 0,
        "my_reaction": None,
        "can_edit": True,
        "can_delete": True,
        "created_at": ts,
        "updated_at": ts,
        "replies": [],
    }


@router.post("/comments/{comment_id}/react")
def toggle_qna_reaction(
    comment_id: str,
    payload: ReactQnaCommentIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    rtype = (payload.reaction_type or "like").strip().lower()
    if rtype not in VALID_REACTIONS:
        raise HTTPException(status_code=422, detail="Loại cảm xúc không hợp lệ.")

    with db() as conn:
        _ensure_qna_tables(conn)
        target = conn.execute(
            "SELECT id FROM lesson_qna_comments WHERE id = ?", (comment_id,)
        ).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")

        existing = conn.execute(
            "SELECT reaction_type FROM lesson_qna_reactions WHERE comment_id = ? AND user_id = ?",
            (comment_id, user["id"]),
        ).fetchone()

        my_reaction: str | None = rtype
        if existing and existing["reaction_type"] == rtype:
            conn.execute(
                "DELETE FROM lesson_qna_reactions WHERE comment_id = ? AND user_id = ?",
                (comment_id, user["id"]),
            )
            my_reaction = None
        elif existing:
            conn.execute(
                "UPDATE lesson_qna_reactions SET reaction_type = ?, created_at = ? WHERE comment_id = ? AND user_id = ?",
                (rtype, now_utc(), comment_id, user["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO lesson_qna_reactions(comment_id, user_id, reaction_type, created_at) VALUES(?,?,?,?)",
                (comment_id, user["id"], rtype, now_utc()),
            )
        conn.commit()

        rows = conn.execute(
            "SELECT reaction_type FROM lesson_qna_reactions WHERE comment_id = ?",
            (comment_id,),
        ).fetchall()
        counts = _empty_reaction_counts()
        for r in rows:
            rt = r["reaction_type"]
            if rt in counts:
                counts[rt] += 1
            else:
                counts["like"] += 1

    return {
        "comment_id": comment_id,
        "my_reaction": my_reaction,
        "reaction_counts": counts,
        "total_reactions": sum(counts.values()),
    }


@router.patch("/comments/{comment_id}")
def update_qna_comment(
    comment_id: str,
    payload: UpdateQnaCommentIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    with db() as conn:
        _ensure_qna_tables(conn)
        row = conn.execute(
            "SELECT * FROM lesson_qna_comments WHERE id = ?", (comment_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")
        if row["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Bạn chỉ có thể chỉnh sửa bình luận của chính mình.")

        clean_content = payload.content.strip()
        clean_code = (payload.code_snippet or "").strip() or None
        ts = now_utc()
        conn.execute(
            "UPDATE lesson_qna_comments SET content = ?, code_snippet = ?, updated_at = ? WHERE id = ?",
            (clean_content, clean_code, ts, comment_id),
        )
        conn.commit()

    return {"ok": True, "id": comment_id, "content": clean_content, "code_snippet": clean_code, "updated_at": ts}


@router.delete("/comments/{comment_id}")
def delete_qna_comment(
    comment_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    role = (user.get("role") or "student").lower()
    with db() as conn:
        _ensure_qna_tables(conn)
        row = conn.execute(
            "SELECT * FROM lesson_qna_comments WHERE id = ?", (comment_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")
        if row["user_id"] != user["id"] and role not in ("instructor", "admin"):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này.")

        child_rows = conn.execute(
            "SELECT id FROM lesson_qna_comments WHERE parent_id = ?", (comment_id,)
        ).fetchall()
        ids_to_remove = [comment_id, *[c["id"] for c in child_rows]]
        ph = ",".join("?" for _ in ids_to_remove)
        conn.execute(f"DELETE FROM lesson_qna_reactions WHERE comment_id IN ({ph})", tuple(ids_to_remove))
        conn.execute(f"DELETE FROM lesson_qna_comments WHERE id IN ({ph})", tuple(ids_to_remove))
        conn.commit()

    return {"ok": True, "deleted_ids": ids_to_remove}


@router.post("/comments/{comment_id}/pin")
def toggle_pin_qna_comment(
    comment_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    role = (user.get("role") or "student").lower()
    if role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền ghim câu trả lời chuẩn.",
        )

    with db() as conn:
        _ensure_qna_tables(conn)
        row = conn.execute(
            "SELECT * FROM lesson_qna_comments WHERE id = ?", (comment_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")

        next_pin = 0 if row["is_pinned"] else 1
        ts = now_utc()
        conn.execute(
            "UPDATE lesson_qna_comments SET is_pinned = ?, is_resolved = ?, updated_at = ? WHERE id = ?",
            (next_pin, 1 if next_pin else row["is_resolved"], ts, comment_id),
        )
        if row.get("parent_id") and next_pin == 1:
            conn.execute(
                "UPDATE lesson_qna_comments SET is_resolved = 1, updated_at = ? WHERE id = ?",
                (ts, row["parent_id"]),
            )
        conn.commit()

    return {"ok": True, "id": comment_id, "is_pinned": bool(next_pin)}

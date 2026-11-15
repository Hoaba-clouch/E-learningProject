from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, uid, verify_password
from app.models.user import Consent, Membership, Organization, StudentProfile, User

DEFAULT_ORG_ID = "org-demo-codemind"


def ensure_default_org(db: Session, org_id: str = DEFAULT_ORG_ID) -> Organization:
    """Đảm bảo tổ chức mặc định tồn tại trong CSDL trước khi tạo membership."""
    org = db.get(Organization, org_id)
    if org is None:
        now = datetime.now(timezone.utc)
        org = Organization(
            id=org_id,
            name="CodeMind Demo Campus",
            status="active",
            created_at=now,
            updated_at=now,
        )
        db.add(org)
        db.flush()
    return org


def get_user_by_id(db: Session, user_id: str) -> User | None:
    """Truy vấn người dùng theo khóa chính id."""
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    """Truy vấn người dùng theo email (không phân biệt hoa/thường)."""
    clean_email = email.strip().lower()
    if not clean_email:
        return None
    return db.scalar(select(User).where(func.lower(User.email) == clean_email))


def list_users(
    db: Session,
    *,
    role: str | None = None,
    active_only: bool = False,
) -> list[User]:
    """Lấy danh sách người dùng sắp xếp mới nhất trước, hỗ trợ lọc theo role và is_active."""
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if active_only:
        stmt = stmt.where(User.is_active.is_(True), User.status == "active")
    stmt = stmt.order_by(User.created_at.desc())
    return list(db.scalars(stmt).all())


def create_user(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    role: str = "student",
    timezone_name: str = "Asia/Ho_Chi_Minh",
    organization_id: str = DEFAULT_ORG_ID,
) -> User:
    """
    Tạo mới User kèm Membership; nếu là student tự động tạo StudentProfile và Consent mặc định.
    Ném ValueError nếu email đã tồn tại.
    """
    clean_email = email.strip().lower()
    if get_user_by_email(db, clean_email) is not None:
        raise ValueError("Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.")

    ensure_default_org(db, org_id=organization_id)
    now = datetime.now(timezone.utc)
    user_id = uid()

    user = User(
        id=user_id,
        email=clean_email,
        password_hash=hash_password(password),
        full_name=full_name,
        display_name=full_name,
        role=role,
        status="active",
        is_active=True,
        locale="vi-VN",
        timezone=timezone_name,
        theme_preference="one-dark",
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.flush()

    membership_role = "org_admin" if role == "admin" else role
    db.add(
        Membership(
            id=uid(),
            organization_id=organization_id,
            user_id=user_id,
            role=membership_role,
            status="active",
            created_at=now,
            updated_at=now,
        )
    )

    if role == "student":
        db.add(
            StudentProfile(
                id=uid(),
                user_id=user_id,
                current_streak=0,
                longest_streak=0,
                streak_freezes_available=1,
                exp_points=0,
                selected_title="Novice Developer",
                radar_algorithm=10.0,
                radar_debugging=10.0,
                radar_cleancode=10.0,
                radar_teamwork=10.0,
                radar_defense=10.0,
                created_at=now,
                updated_at=now,
            )
        )
        for purpose in ("academic_integrity", "teacher_visibility"):
            db.add(
                Consent(
                    id=uid(),
                    user_id=user_id,
                    purpose=purpose,
                    policy_version="2026-08-01",
                    granted=1,
                    granted_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )

    db.flush()
    return user


def update_user(
    db: Session,
    user: User,
    *,
    full_name: str | None = None,
    display_name: str | None = None,
    timezone_name: str | None = None,
    theme_preference: str | None = None,
    role: str | None = None,
    status: str | None = None,
    is_active: bool | None = None,
    password: str | None = None,
) -> User:
    """Cập nhật thông tin User và làm mới updated_at theo chuẩn H4 UTC."""
    if full_name is not None:
        user.full_name = full_name
        if display_name is None:
            user.display_name = full_name
    if display_name is not None:
        user.display_name = display_name
    if timezone_name is not None:
        user.timezone = timezone_name
    if theme_preference is not None:
        user.theme_preference = theme_preference
    if role is not None:
        user.role = role
    if status is not None:
        user.status = status
        if is_active is None:
            user.is_active = status == "active"
    if is_active is not None:
        user.is_active = is_active
        if status is None:
            user.status = "active" if is_active else "inactive"
    if password is not None:
        user.password_hash = hash_password(password)

    user.updated_at = datetime.now(timezone.utc)
    db.flush()
    return user


def deactivate_user(db: Session, user: User) -> User:
    """Vô hiệu hóa mềm (soft-delete) tài khoản người dùng."""
    return update_user(db, user, status="inactive", is_active=False)


def delete_user(db: Session, user_id: str) -> bool:
    """Xóa cứng User theo id (tự động cascade sang membership/consent/profile/note)."""
    user = get_user_by_id(db, user_id)
    if user is None:
        return False
    db.delete(user)
    db.flush()
    return True


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Xác thực email và mật khẩu plain-text qua Bcrypt; trả về None nếu sai thông tin."""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

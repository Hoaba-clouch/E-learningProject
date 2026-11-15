from __future__ import annotations

from datetime import timedelta

import jwt
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.deps import (
    RoleChecker,
    _extract_bearer_token,
    get_current_user,
    require_role,
    require_roles,
    session_owned,
)
from app.core.config import ALGORITHM, SECRET_KEY
from app.core.security import (
    TOKENS,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    uid,
    verify_password,
    verify_token,
)
from app.models.audit import AuditEvent
from app.models.course import Lesson
from app.models.learning import LearningSession
from app.models.user import Consent, Membership, StudentProfile, User
from app.services.user_service import (
    DEFAULT_ORG_ID,
    authenticate_user,
    create_user,
    deactivate_user,
    delete_user,
    ensure_default_org,
    get_user_by_email,
    get_user_by_id,
    list_users,
    update_user,
)


def test_user_crud_create_read_list_update_deactivate_delete(db_session: Session) -> None:
    """Kiểm tra đầy đủ các hàm CRUD User trên SQLite in-memory."""
    org_first = ensure_default_org(db_session)
    org_second = ensure_default_org(db_session)
    assert org_first.id == DEFAULT_ORG_ID
    assert org_second.id == org_first.id

    # Create student user (auto-creates Membership, StudentProfile, Consent)
    student = create_user(
        db_session,
        email="  Student.CRUD@CodeMind.EDU.VN ",
        password="Password@123",
        full_name="Nguyen Van A",
        role="student",
        timezone_name="Asia/Ho_Chi_Minh",
    )
    db_session.commit()

    assert student.email == "student.crud@codemind.edu.vn"
    assert student.password_hash is not None
    assert student.password_hash != "Password@123"
    assert verify_password("Password@123", student.password_hash) is True
    assert student.is_active is True
    assert student.status == "active"

    # Student has Membership, StudentProfile, and Consents (learning_analytics + ai_tutor)
    assert db_session.query(Membership).filter_by(user_id=student.id).count() == 1
    assert db_session.query(StudentProfile).filter_by(user_id=student.id).count() == 1
    assert db_session.query(Consent).filter_by(user_id=student.id).count() == 2

    # Create instructor user (does NOT create StudentProfile)
    instructor = create_user(
        db_session,
        email="instructor.crud@codemind.edu.vn",
        password="Instructor@123",
        full_name="Giang Vien B",
        role="instructor",
    )
    db_session.commit()
    assert db_session.query(StudentProfile).filter_by(user_id=instructor.id).count() == 0

    # Duplicate email raises ValueError
    with pytest.raises(ValueError, match="Email"):
        create_user(
            db_session,
            email="STUDENT.CRUD@codemind.edu.vn",
            password="Other@123",
            full_name="Duplicate",
        )

    # Read by id & email
    assert get_user_by_id(db_session, student.id) is not None
    assert get_user_by_id(db_session, "non-existent") is None
    assert get_user_by_email(db_session, " STUDENT.CRUD@codemind.edu.vn ").id == student.id
    assert get_user_by_email(db_session, "") is None
    assert get_user_by_email(db_session, "missing@codemind.edu.vn") is None

    # List users with role and active filters
    all_users = list_users(db_session)
    assert len(all_users) == 2
    assert [u.id for u in list_users(db_session, role="instructor")] == [instructor.id]

    # Authenticate user
    assert authenticate_user(db_session, "student.crud@codemind.edu.vn", "Password@123").id == student.id
    assert authenticate_user(db_session, "student.crud@codemind.edu.vn", "WrongPass") is None
    assert authenticate_user(db_session, "unknown@codemind.edu.vn", "Password@123") is None

    # Update user fields & password
    updated = update_user(
        db_session,
        student,
        full_name="Nguyen Van A Updated",
        display_name="Van A",
        timezone_name="UTC",
        theme_preference="dark",
        role="student",
        password="NewPassword@456",
    )
    db_session.commit()
    assert updated.full_name == "Nguyen Van A Updated"
    assert updated.display_name == "Van A"
    assert updated.timezone == "UTC"
    assert updated.theme_preference == "dark"
    assert verify_password("Password@123", updated.password_hash) is False
    assert verify_password("NewPassword@456", updated.password_hash) is True

    # Status <-> is_active synchronization
    update_user(db_session, student, is_active=False)
    assert student.status == "inactive"
    update_user(db_session, student, status="active")
    assert student.is_active is True

    # Deactivate user & active_only filter
    deactivate_user(db_session, student)
    db_session.commit()
    assert student.is_active is False
    assert student.status == "inactive"
    active_list = list_users(db_session, active_only=True)
    assert [u.id for u in active_list] == [instructor.id]

    # Delete user (cascades Membership/Profile/Consent) & non-existent delete
    assert delete_user(db_session, "does-not-exist") is False
    assert delete_user(db_session, student.id) is True
    db_session.commit()
    assert get_user_by_id(db_session, student.id) is None
    assert db_session.query(StudentProfile).filter_by(user_id=student.id).count() == 0
    assert db_session.query(Consent).filter_by(user_id=student.id).count() == 0


def test_verify_token_access_refresh_expiry_and_tampering() -> None:
    """Kiểm tra tạo, giải mã và verify JWT Access/Refresh token & edge cases."""
    access = create_access_token({"sub": "user-123", "role": "student"})
    refresh = create_refresh_token({"sub": "user-123", "role": "student"})

    # decode_token & verify_token valid cases
    raw_decoded = decode_token(access)
    assert raw_decoded["sub"] == "user-123"
    assert raw_decoded["type"] == "access"

    verified_access = verify_token(access, expected_type="access")
    assert verified_access["sub"] == "user-123"

    verified_refresh = verify_token(refresh, expected_type="refresh")
    assert verified_refresh["sub"] == "user-123"

    # Unchecked expected_type accepts both access & refresh
    assert verify_token(refresh)["type"] == "refresh"

    # Type mismatch rejected
    with pytest.raises(jwt.InvalidTokenError, match="không đúng loại"):
        verify_token(refresh, expected_type="access")
    with pytest.raises(jwt.InvalidTokenError, match="không đúng loại"):
        verify_token(access, expected_type="refresh")

    # Missing 'sub' claim rejected
    no_sub = jwt.encode({"role": "student", "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)
    with pytest.raises(jwt.InvalidTokenError, match="sub"):
        verify_token(no_sub, expected_type="access")

    # Expired token rejected
    expired = create_access_token(
        {"sub": "user-123"},
        expires_delta=timedelta(seconds=-5),
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        verify_token(expired, expected_type="access")

    # Tampered signature or wrong secret rejected
    wrong_secret = jwt.encode(
        {"sub": "user-123", "type": "access"},
        "wrong-secret-key-that-is-at-least-32-bytes-long",
        algorithm=ALGORITHM,
    )
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(wrong_secret, expected_type="access")
    with pytest.raises(jwt.InvalidTokenError):
        verify_token("not.a.valid.jwt", expected_type="access")

    # Password helper edge cases
    assert verify_password("plain", None) is False
    assert verify_password("plain", hash_password("plain")) is True


def test_auth_deps_get_current_user_rbac_and_session_owned(db_session: Session) -> None:
    """Kiểm tra FastAPI auth/RBAC dependencies với SQLite in-memory."""
    student = create_user(
        db_session,
        email="deps-student@codemind.edu.vn",
        password="User@1234",
        full_name="Deps Student",
        role="student",
    )
    org_admin = User(
        id=uid(),
        email="org-admin@codemind.edu.vn",
        password_hash=hash_password("Admin@123"),
        full_name="Org Admin",
        display_name="Org Admin",
        role="org_admin",
        status="active",
        is_active=True,
    )
    lesson = Lesson(
        id=uid(),
        slug="deps-lesson",
        version=1,
        title="Deps Lesson",
        objective="Obj",
        status="published",
    )
    db_session.add_all([org_admin, lesson])
    db_session.flush()
    session_obj = LearningSession(
        id=uid(),
        user_id=student.id,
        lesson_id=lesson.id,
        status="active",
    )
    db_session.add(session_obj)
    db_session.commit()

    # _extract_bearer_token validation
    with pytest.raises(HTTPException) as exc_missing:
        _extract_bearer_token(None)
    assert exc_missing.value.status_code == 401
    assert _extract_bearer_token("Bearer abc123") == "abc123"

    # Valid JWT resolution
    student_token = create_access_token({"sub": student.id, "role": "student"})
    resolved_student = get_current_user(authorization=f"Bearer {student_token}", db=db_session)
    assert resolved_student["id"] == student.id
    assert resolved_student["role"] == "student"

    # Demo in-memory token resolution + org_admin -> admin normalization
    TOKENS["demo-tok"] = {"user_id": org_admin.id}
    resolved_admin = get_current_user(authorization="Bearer demo-tok", db=db_session)
    assert resolved_admin["role"] == "admin"

    # Invalid JWT / non-existent user
    with pytest.raises(HTTPException) as exc_bad_tok:
        get_current_user(authorization="Bearer invalid.jwt.token", db=db_session)
    assert exc_bad_tok.value.status_code == 401

    ghost_token = create_access_token({"sub": "ghost-id", "role": "student"})
    with pytest.raises(HTTPException) as exc_ghost:
        get_current_user(authorization=f"Bearer {ghost_token}", db=db_session)
    assert exc_ghost.value.status_code == 401

    # RoleChecker & require_role allow/deny + AuditEvent
    checker_inst = require_roles("instructor")
    assert checker_inst(resolved_admin)["id"] == org_admin.id
    require_role(resolved_admin, "instructor")

    with pytest.raises(HTTPException) as exc_rbac:
        checker_inst(resolved_student)
    assert exc_rbac.value.status_code == 403

    with pytest.raises(HTTPException) as exc_imp:
        require_role(resolved_student, "admin")
    assert exc_imp.value.status_code == 403

    # Verify audit event was written into SQLite in-memory via patched db_session
    denies = db_session.query(AuditEvent).filter_by(decision="deny").all()
    assert len(denies) >= 2

    # session_owned allow / 403 / 404
    owned = session_owned(session_obj.id, student.id, db=db_session)
    assert owned["id"] == session_obj.id

    with pytest.raises(HTTPException) as exc_not_owner:
        session_owned(session_obj.id, org_admin.id, db=db_session)
    assert exc_not_owner.value.status_code == 403

    with pytest.raises(HTTPException) as exc_not_found:
        session_owned("no-such-session", student.id, db=db_session)
    assert exc_not_found.value.status_code == 404

    # Deactivated user gets 403
    deactivate_user(db_session, student)
    db_session.commit()
    with pytest.raises(HTTPException) as exc_inactive:
        get_current_user(authorization=f"Bearer {student_token}", db=db_session)
    assert exc_inactive.value.status_code == 403

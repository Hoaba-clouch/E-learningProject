from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, H4DateTime, TimestampMixin


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="student", index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    locale: Mapped[str] = mapped_column(String(32), nullable=False, default="vi-VN")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Ho_Chi_Minh")
    theme_preference: Mapped[str] = mapped_column(String(32), nullable=False, default="one-dark")
    role_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    consents: Mapped[list["Consent"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    student_profile: Mapped["StudentProfile | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["StudentNote"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Membership(TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_membership_org_user"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    organization: Mapped["Organization"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships")


class Consent(TimestampMixin, Base):
    __tablename__ = "consents"
    __table_args__ = (UniqueConstraint("user_id", "purpose", name="uq_consent_user_purpose"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(String(64), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    granted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    granted_at: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="consents")


class StudentProfile(TimestampMixin, Base):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    streak_freezes_available: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_activity_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    exp_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    selected_title: Mapped[str] = mapped_column(String(128), nullable=False, default="Novice Developer")
    radar_algorithm: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    radar_debugging: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    radar_cleancode: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    radar_teamwork: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    radar_defense: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)

    user: Mapped["User"] = relationship(back_populates="student_profile")


class StudentNote(TimestampMixin, Base):
    __tablename__ = "student_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    assignment_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    code_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="notes")

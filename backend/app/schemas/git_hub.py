from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.services.github_evidence import GitHubEvidenceError, parse_github_repo


class GitRepoUpdateIn(BaseModel):
    repo_url: str = Field(min_length=8, max_length=500)
    target_branch: str = Field(default="main", min_length=1, max_length=120)
    default_merge_strategy: str = Field(default="squash", min_length=2, max_length=40)

    @field_validator("repo_url")
    @classmethod
    def validate_repository(cls, value: str) -> str:
        try:
            return parse_github_repo(value)[0]
        except GitHubEvidenceError as exc:
            raise ValueError(str(exc)) from exc


class GitCommitCreateIn(BaseModel):
    branch: str = Field(default="feature/auth", min_length=1, max_length=120)
    message: str = Field(min_length=4, max_length=500)
    task_code: str | None = Field(default=None, max_length=40)
    author_name: str | None = Field(default=None, max_length=120)
    files_changed: list[str] = Field(default_factory=list)
    additions: int = Field(default=48, ge=0, le=50000)
    deletions: int = Field(default=6, ge=0, le=50000)


class GitPullRequestCreateIn(BaseModel):
    title: str = Field(min_length=4, max_length=300)
    description: str = Field(default="", max_length=2000)
    source_branch: str = Field(default="feature/new-module", min_length=1, max_length=120)
    target_branch: str = Field(default="develop", min_length=1, max_length=120)
    task_code: str | None = Field(default=None, max_length=40)
    author_name: str | None = Field(default=None, max_length=120)
    merge_strategy: str = Field(default="squash", min_length=2, max_length=40)
    code_snippet: str = Field(default="", max_length=8000)


class GitPrPeerApproveIn(BaseModel):
    reviewer_name: str | None = Field(default=None, max_length=120)
    comment: str = Field(
        default="LGTM — Đạt chuẩn Clean Code & Kiến trúc 3 tầng.",
        max_length=1000,
    )


class GitPrRequestChangesIn(BaseModel):
    reviewer_name: str | None = Field(default=None, max_length=120)
    comment: str = Field(min_length=4, max_length=1000)


class GitPrMergeIn(BaseModel):
    merge_strategy: str = Field(default="squash", min_length=2, max_length=40)

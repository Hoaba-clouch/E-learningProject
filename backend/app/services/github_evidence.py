"""Read-only GitHub evidence. A failed fetch never becomes an empty/successful sync.

Only this module's snapshots are evidence; legacy demo Git rows are not trusted.
The public API is deliberately bounded and exposes its sampling limits.
"""
from __future__ import annotations

import json
import os
import re
import socket
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import quote, urlparse


class GitHubEvidenceError(Exception):
    def __init__(self, code: str, message: str, status: int = 502):
        super().__init__(message)
        self.code = code
        self.status = status


def parse_github_repo(value: str) -> tuple[str, str]:
    """Accept a repository URL only, never a credential, arbitrary host or path."""
    parsed = urlparse(str(value).strip())
    parts = parsed.path.strip("/").split("/")
    if (parsed.scheme != "https" or parsed.netloc.lower() != "github.com"
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or len(parts) != 2):
        raise GitHubEvidenceError("invalid_url", "Use https://github.com/OWNER/REPOSITORY.", 422)
    owner, repo = parts[0], parts[1].removesuffix(".git")
    if (not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})", owner)
            or not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repo)
            or repo in (".", "..")):
        raise GitHubEvidenceError("invalid_url", "Invalid GitHub repository owner or name.", 422)
    slug = f"{owner}/{repo}".lower()
    return f"https://github.com/{slug}", slug


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Repository redirects must be explicitly configured, not silently followed.
        return None


def github_json(path: str) -> tuple[Any, bool]:
    headers = {
        "User-Agent": "CodeMind-Git-Evidence/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    # Operator-managed credential, only sent to the fixed GitHub API origin.
    # The opener rejects redirects and every request remains a read-only GET.
    token = (os.getenv("CODEMIND_GITHUB_TOKEN") or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request("https://api.github.com" + path, headers=headers)
    try:
        with urllib.request.build_opener(_NoRedirect()).open(req, timeout=10) as response:
            # Refuse oversized responses instead of parsing arbitrary remote input.
            raw = response.read(4_000_001)
            if len(raw) > 4_000_000:
                raise GitHubEvidenceError("response_too_large", "GitHub response exceeds the evidence limit.")
            return json.loads(raw.decode("utf-8")), 'rel="next"' in response.headers.get("Link", "")
    except urllib.error.HTTPError as exc:
        code, message = {
            401: ("authentication", "GitHub authentication failed."),
            403: ("forbidden_or_rate_limited", "GitHub denied access or its API rate limit was reached."),
            404: ("not_found_or_private", "GitHub repository/resource was not found or is private."),
            409: ("empty_repository", "GitHub reports an empty repository."),
            429: ("rate_limited", "GitHub API rate limit was reached."),
            301: ("repository_moved", "GitHub repository moved. Update its URL first."),
        }.get(exc.code, ("remote_http_error", f"GitHub returned HTTP {exc.code}."))
        raise GitHubEvidenceError(code, message) from exc
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        raise GitHubEvidenceError("network_error", "GitHub is unreachable or timed out. Previous evidence was preserved.") from exc
    except (ValueError, UnicodeError) as exc:
        raise GitHubEvidenceError("invalid_response", "GitHub returned invalid JSON.") from exc


def explicit_task(text: str, task_codes: list[str]) -> str | None:
    """Never assign a task by position, message theme or contributor identity."""
    matches = [code.strip().lstrip("#").upper() for code in task_codes if code and re.search(
        rf"(?<![A-Za-z0-9_-])#?{re.escape(code.strip().lstrip('#'))}(?![A-Za-z0-9_-])",
        text or "", re.IGNORECASE)]
    return matches[0] if len(set(matches)) == 1 else None


def summarize_reviews(reviews: list[dict[str, Any]], head_sha: str, author: str, complete: bool) -> dict[str, Any]:
    latest: dict[str, dict[str, Any]] = {}
    for review in sorted(reviews, key=lambda item: (str(item.get("submitted_at") or ""), int(item.get("id") or 0))):
        login = str((review.get("user") or {}).get("login") or "")
        state = str(review.get("state") or "").upper()
        if (login and login.lower() != author.lower() and (review.get("user") or {}).get("type") != "Bot"
                and state in ("APPROVED", "CHANGES_REQUESTED", "DISMISSED")):
            latest[login.lower()] = review
    current = [r for r in latest.values() if r.get("commit_id") == head_sha]
    approvers = [str(r["user"]["login"]) for r in current if r.get("state") == "APPROVED"]
    changes = any(r.get("state") == "CHANGES_REQUESTED" for r in latest.values())
    return {"complete": complete, "approved": bool(complete and approvers and not changes),
            "approvers": approvers, "changesRequested": changes,
            "reviews": [{"id": r.get("id"), "reviewer": (r.get("user") or {}).get("login"),
                         "state": r.get("state"), "commitSha": r.get("commit_id"),
                         "url": r.get("html_url"), "submittedAt": r.get("submitted_at")} for r in reviews]}


def summarize_checks(checks: list[dict[str, Any]], statuses: list[dict[str, Any]], head_sha: str, complete: bool) -> dict[str, Any]:
    evidence = [{"name": c.get("name"), "status": c.get("status"), "conclusion": c.get("conclusion"),
                 "url": c.get("html_url"), "sha": c.get("head_sha")} for c in checks if c.get("head_sha") == head_sha]
    evidence.extend({"name": s.get("context"), "status": "completed" if s.get("state") != "pending" else "pending",
                     "conclusion": s.get("state"), "url": s.get("target_url"), "sha": head_sha} for s in statuses)
    tests = [c for c in evidence if re.search(r"(?:^|[^a-z])(?:tests?|pytest|unittest|ctest|jest|vitest|specs?|e2e)(?:[^a-z]|$)", str(c.get("name") or ""), re.I)]
    all_green = bool(evidence) and all(c["status"] == "completed" and c["conclusion"] == "success" for c in evidence)
    return {"complete": complete, "headSha": head_sha,
            "state": "success" if complete and all_green else ("unknown" if not complete or not evidence else "not_passing"),
            "testsKnown": bool(complete and tests), "testsPassed": bool(complete and tests and all_green),
            "checks": evidence}


def has_completed_task_proof(pr: dict[str, Any]) -> bool:
    ci, review = pr.get("testEvidence") or {}, pr.get("reviewEvidence") or {}
    return bool(pr.get("evidenceSource") == "github-rest" and pr.get("taskCode")
                and pr.get("targetBranch") == pr.get("evidenceBranch")
                and pr.get("status") == "merged" and re.fullmatch(r"[0-9a-f]{40}", str(pr.get("headSha") or ""))
                and ci.get("headSha") == pr.get("headSha") and ci.get("complete")
                and ci.get("testsPassed") and review.get("complete") and review.get("approved"))


def load_snapshot(conn: Any, project_id: str, repo_slug: str) -> tuple[dict[str, Any] | None, str | None]:
    row = conn.execute("SELECT * FROM git_evidence_snapshots WHERE project_id=?", (project_id,)).fetchone()
    if not row or str(row["repo_slug"]).lower() != repo_slug.lower():
        return None, None
    try:
        data = json.loads(row["snapshot_json"])
        if (data.get("source") != "github-rest" or data.get("repoSlug") != repo_slug.lower()
                or not row["verified_at"] or not isinstance(data.get("commits"), list)
                or not isinstance(data.get("pullRequests"), list)):
            return None, "Stored evidence could not be verified. Sync GitHub again."
        return data, row["last_error"]
    except (ValueError, TypeError, AttributeError):
        return None, "Stored evidence is invalid. Sync GitHub again."


def save_snapshot(conn: Any, project_id: str, snapshot: dict[str, Any]) -> None:
    # One atomic upsert; fetch_snapshot must finish before this is called.
    conn.execute("""INSERT INTO git_evidence_snapshots(project_id, repo_slug, snapshot_json, verified_at, last_error)
                    VALUES(?,?,?,?,NULL)
                    ON DUPLICATE KEY UPDATE repo_slug=VALUES(repo_slug), snapshot_json=VALUES(snapshot_json),
                                            verified_at=VALUES(verified_at), last_error=NULL""",
                 (project_id, snapshot["repoSlug"], json.dumps(snapshot, ensure_ascii=False), snapshot["fetchedAt"]))


def fetch_snapshot(repo_url: str, project_id: str, task_codes: list[str], *, branch: str | None = None,
                   request_json: Callable = github_json) -> dict[str, Any]:
    repo_url, slug = parse_github_repo(repo_url)
    base = f"/repos/{slug}"
    def get(path: str, expected: type):
        value, more = request_json(path)
        if not isinstance(value, expected):
            raise GitHubEvidenceError("invalid_response", "Unexpected GitHub response shape.")
        return value, more
    meta, _ = get(base, dict)
    branch = branch or str(meta.get("default_branch") or "")
    if not branch:
        raise GitHubEvidenceError("invalid_response", "GitHub did not report a default branch.")
    try:
        commits_raw, commits_more = get(f"{base}/commits?sha={quote(branch, safe='')}&per_page=30", list)
    except GitHubEvidenceError as exc:
        if exc.code != "empty_repository":
            raise
        commits_raw, commits_more = [], False
    prs_raw, prs_more = get(base + "/pulls?state=all&sort=updated&direction=desc&per_page=10", list)
    fetched_at = datetime.now(timezone.utc).isoformat()
    commits = []
    for index, raw in enumerate(commits_raw):
        sha = str(raw.get("sha") or "")
        if not re.fullmatch(r"[0-9a-f]{40}", sha):
            raise GitHubEvidenceError("invalid_response", "GitHub returned an invalid commit SHA.")
        commit, account = raw.get("commit") or {}, raw.get("author") or {}
        author = commit.get("author") or {}
        name = str(author.get("name") or account.get("login") or "Unknown Git author")
        message = str(commit.get("message") or "")
        commits.append({"id": f"gh:{slug}:{sha}", "projectId": project_id, "sha": sha,
                        "author": {"name": name, "login": account.get("login"), "role": "Git author", "avatar": name[:1], "color": "#2563eb"},
                        "branch": branch, "branchLabel": branch, "branchColor": "#2563eb",
                        "taskCode": explicit_task(message, task_codes), "message": message,
                        "date": author.get("date") or "", "timeAgo": "", "stats": {"additions": 0, "deletions": 0, "files": 0},
                        "statsKnown": False, "filesChanged": [], "cx": 70 + index * 75, "cy": 225,
                        "parentShas": [p["sha"] for p in raw.get("parents", []) if p.get("sha")],
                        "url": f"{repo_url}/commit/{sha}", "evidenceSource": "github-rest", "verifiedAt": fetched_at})
    prs = []
    for raw in prs_raw:
        number = raw.get("number")
        head = raw.get("head") or {}
        head_sha = str(head.get("sha") or "")
        if not isinstance(number, int) or not re.fullmatch(r"[0-9a-f]{40}", head_sha):
            raise GitHubEvidenceError("invalid_response", "GitHub returned an invalid pull request identity.")
        author = str((raw.get("user") or {}).get("login") or "Unknown GitHub author")
        reviews, review_more = get(f"{base}/pulls/{number}/reviews?per_page=100", list)
        check_data, check_more = get(f"{base}/commits/{head_sha}/check-runs?per_page=100&filter=latest", dict)
        status_data, status_more = get(f"{base}/commits/{head_sha}/status?per_page=100", dict)
        check_runs, statuses = check_data.get("check_runs"), status_data.get("statuses")
        if not isinstance(check_runs, list) or not isinstance(statuses, list):
            raise GitHubEvidenceError("invalid_response", "GitHub did not return check/status evidence.")
        reviews_out = summarize_reviews(reviews, head_sha, author, not review_more)
        if status_data.get("sha") != head_sha:
            raise GitHubEvidenceError("invalid_response", "GitHub status evidence does not match the PR head SHA.")
        tests_out = summarize_checks(check_runs, statuses, head_sha,
                                    not check_more and not status_more and isinstance(check_data.get("total_count"), int)
                                    and check_data["total_count"] <= len(check_runs))
        title, description = str(raw.get("title") or ""), str(raw.get("body") or "")
        pr = {"id": f"gh:{slug}:pr:{number}", "projectId": project_id, "prNumber": number,
              "title": title, "description": description, "sourceBranch": head.get("ref") or "",
              "targetBranch": (raw.get("base") or {}).get("ref") or "", "headSha": head_sha, "evidenceBranch": branch,
              "taskCode": explicit_task(f"{title}\n{description}\n{head.get('ref') or ''}", task_codes),
              "author": {"name": author, "login": author, "role": "GitHub author", "avatar": author[:1], "color": "#2563eb"},
              "status": "merged" if raw.get("merged_at") else ("closed" if raw.get("state") == "closed" else "open"),
              "mergeStrategy": "unknown", "aiReviewScore": 0, "aiReviewAvailable": False,
              "aiBlastRadius": "Unknown", "aiSummary": "Remote GitHub evidence; no AI code review has been run.",
              "aiFindings": [], "diffPreview": [], "defenseQuestions": [],
              "peerReviewer": ", ".join(reviews_out["approvers"]) or None,
              "peerApproved": reviews_out["approved"], "peerComment": "", "oneClickFixed": False,
              "dodSha256": None, "dualSubmissionId": None, "xpAwarded": False,
              "createdAt": raw.get("created_at"), "mergedAt": raw.get("merged_at"),
              "url": f"{repo_url}/pull/{number}", "testEvidence": tests_out, "reviewEvidence": reviews_out,
              "evidenceSource": "github-rest", "verifiedAt": fetched_at}
        # Refuse to publish a mixed snapshot if the PR changes during the requests above.
        fresh, _ = get(f"{base}/pulls/{number}", dict)
        if ((fresh.get("head") or {}).get("sha") != head_sha or fresh.get("state") != raw.get("state")
                or fresh.get("merged_at") != raw.get("merged_at")):
            raise GitHubEvidenceError("remote_changed", "The GitHub PR changed while syncing. Retry to verify its current head.")
        pr["hasCompletedTaskProof"] = has_completed_task_proof(pr)
        prs.append(pr)
    return {"source": "github-rest", "repoSlug": slug, "repoUrl": repo_url, "branch": branch,
            "fetchedAt": fetched_at, "commits": commits, "pullRequests": prs,
            "sampleLimits": {"commits": 30, "pullRequests": 10},
            "truncated": bool(commits_more or prs_more), "commitsTruncated": commits_more, "pullRequestsTruncated": prs_more}

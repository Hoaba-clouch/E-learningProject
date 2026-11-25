"""Offline regression tests: real evidence must fail closed without fabricating data."""
import copy
import json
import unittest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from app.services.github_evidence import (
    GitHubEvidenceError, explicit_task, fetch_snapshot, github_json, has_completed_task_proof,
    load_snapshot, parse_github_repo, summarize_checks, summarize_reviews,
)

SHA = "a" * 40
OLD_SHA = "b" * 40


def remote_fixture():
    data = {
        "/repos/team/project": ({"default_branch": "main"}, False),
        "/repos/team/project/commits?sha=main&per_page=30": ([{
            "sha": SHA, "commit": {"author": {"name": "Actual Author", "date": "2026-01-02T03:04:05Z"},
                                        "message": "fix: #TASK-12 preserve evidence"},
            "author": {"login": "actual-author"}, "parents": [{"sha": OLD_SHA}],
        }], False),
        "/repos/team/project/pulls?state=all&sort=updated&direction=desc&per_page=10": ([{
            "number": 7, "title": "fix #TASK-12", "body": "Actual description",
            "head": {"sha": SHA, "ref": "fix/TASK-12"}, "base": {"ref": "main"},
            "state": "closed", "merged_at": "2026-01-03T00:00:00Z", "user": {"login": "actual-author"},
        }], False),
        "/repos/team/project/pulls/7/reviews?per_page=100": ([{
            "id": 4, "state": "APPROVED", "commit_id": SHA, "user": {"login": "independent-reviewer"},
        }], False),
        f"/repos/team/project/commits/{SHA}/check-runs?per_page=100&filter=latest": ({
            "total_count": 1, "check_runs": [{"name": "unit tests", "head_sha": SHA,
                                             "status": "completed", "conclusion": "success"}],
        }, False),
        f"/repos/team/project/commits/{SHA}/status?per_page=100": ({"sha": SHA, "statuses": []}, False),
    }
    data["/repos/team/project/pulls/7"] = (data["/repos/team/project/pulls?state=all&sort=updated&direction=desc&per_page=10"][0][0], False)
    return data


class GitHubEvidenceTests(unittest.TestCase):
    def test_operator_token_is_optional_header_only_on_read_only_github_request(self):
        for token in (None, "", "  test-only-scoped-token  "):
            with self.subTest(configured=bool(token)):
                response = MagicMock()
                response.read.return_value = b'{"id": 1}'
                response.headers.get.return_value = ""
                opener = MagicMock()
                opener.open.return_value.__enter__.return_value = response
                with patch("app.services.github_evidence.os.getenv", return_value=token) as getenv, \
                        patch("app.services.github_evidence.urllib.request.build_opener", return_value=opener):
                    result = github_json("/repos/team/project")
                getenv.assert_called_once_with("CODEMIND_GITHUB_TOKEN")
                req = opener.open.call_args.args[0]
                self.assertEqual(req.full_url, "https://api.github.com/repos/team/project")
                self.assertEqual(req.get_method(), "GET")
                self.assertIsNone(req.data)
                self.assertEqual(req.get_header("Authorization"), "Bearer test-only-scoped-token" if token else None)
                self.assertEqual(result, ({"id": 1}, False))

    def test_strict_repo_url(self):
        self.assertEqual(parse_github_repo("https://github.com/Team/Project.git"),
                         ("https://github.com/team/project", "team/project"))
        for url in ("http://github.com/a/b", "https://github.com.evil.test/a/b", "https://evil.test/github.com/a/b",
                    "https://user:secret@github.com/a/b", "https://github.com:443/a/b", "https://github.com/a/b/pull/1",
                    "https://github.com/a/b?x=1", "https://github.com/a/..", "git@github.com:a/b.git"):
            with self.subTest(url=url), self.assertRaises(GitHubEvidenceError):
                parse_github_repo(url)

    def test_only_explicit_unambiguous_task(self):
        codes = ["TASK-12", "TASK-123", "TASK-14"]
        self.assertEqual(explicit_task("fix #task-12", codes), "TASK-12")
        self.assertIsNone(explicit_task("fix #TASK-1234", codes))
        self.assertIsNone(explicit_task("fix #TASK-12 and #TASK-14", codes))
        self.assertIsNone(explicit_task("unrelated auth implementation", codes))

    def test_real_author_full_sha_status_and_proof(self):
        data = remote_fixture()
        snapshot = fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=data.__getitem__)
        commit, pr = snapshot["commits"][0], snapshot["pullRequests"][0]
        self.assertEqual(commit["sha"], SHA)
        self.assertEqual(commit["author"]["name"], "Actual Author")
        self.assertEqual(commit["author"]["login"], "actual-author")
        self.assertEqual(commit["parentShas"], [OLD_SHA])
        self.assertFalse(commit["statsKnown"])
        self.assertEqual(pr["status"], "merged")
        self.assertTrue(has_completed_task_proof(pr))
        self.assertFalse(pr["xpAwarded"])
        self.assertIsNone(pr["dodSha256"])
        self.assertFalse(pr["aiReviewAvailable"])

    def test_closed_is_not_merged_or_approved(self):
        data = remote_fixture()
        data["/repos/team/project/pulls?state=all&sort=updated&direction=desc&per_page=10"][0][0]["merged_at"] = None
        snapshot = fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=data.__getitem__)
        self.assertEqual(snapshot["pullRequests"][0]["status"], "closed")
        self.assertFalse(snapshot["pullRequests"][0]["hasCompletedTaskProof"])

    def test_a_pr_merged_to_another_branch_is_not_completion_proof(self):
        data = remote_fixture()
        data["/repos/team/project/pulls/7"][0]["base"]["ref"] = "unrelated-branch"
        snapshot = fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=data.__getitem__)
        self.assertFalse(snapshot["pullRequests"][0]["hasCompletedTaskProof"])

    def test_pr_head_changed_during_sync_aborts_snapshot(self):
        data = remote_fixture()
        changed = copy.deepcopy(data["/repos/team/project/pulls/7"][0])
        changed["head"]["sha"] = OLD_SHA
        data["/repos/team/project/pulls/7"] = (changed, False)
        with self.assertRaises(GitHubEvidenceError) as caught:
            fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=data.__getitem__)
        self.assertEqual(caught.exception.code, "remote_changed")

    def test_empty_repository_is_valid_empty_snapshot(self):
        def empty(path):
            if path.endswith("/project"):
                return {"default_branch": "main"}, False
            if "/commits?" in path:
                raise GitHubEvidenceError("empty_repository", "Repository is empty")
            return [], False
        data = fetch_snapshot("https://github.com/team/project", "p", [], request_json=empty)
        self.assertEqual(data["commits"], [])
        self.assertEqual(data["pullRequests"], [])
        self.assertEqual(data["source"], "github-rest")

    def test_any_partial_failure_aborts_snapshot(self):
        data = remote_fixture()
        def request(path):
            if "/status?" in path:
                raise GitHubEvidenceError("rate_limited", "Rate limited")
            return data[path]
        with self.assertRaises(GitHubEvidenceError):
            fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=request)

    def test_stale_self_dismissed_or_incomplete_approval_never_passes(self):
        for author, sha, state, complete in (("author", OLD_SHA, "APPROVED", True),
                                            ("reviewer", SHA, "APPROVED", True),
                                            ("author", SHA, "DISMISSED", True),
                                            ("author", SHA, "APPROVED", False)):
            with self.subTest(author=author, sha=sha, state=state, complete=complete):
                result = summarize_reviews([{"id": 1, "state": state, "commit_id": sha,
                                             "user": {"login": "reviewer"}}], SHA, author, complete)
                self.assertFalse(result["approved"])

    def test_later_dismissal_invalidates_old_approval(self):
        result = summarize_reviews([
            {"id": 1, "state": "APPROVED", "commit_id": SHA, "user": {"login": "reviewer"}},
            {"id": 2, "state": "DISMISSED", "commit_id": SHA, "user": {"login": "reviewer"}},
        ], SHA, "author", True)
        self.assertFalse(result["approved"])

    def test_checks_need_same_sha_completed_explicit_test_and_full_evidence(self):
        check = {"name": "unit tests", "head_sha": SHA, "status": "completed", "conclusion": "success"}
        self.assertTrue(summarize_checks([check], [], SHA, True)["testsPassed"])
        for changed, complete in (({**check, "head_sha": OLD_SHA}, True),
                                  ({**check, "status": "in_progress"}, True),
                                  ({**check, "conclusion": "failure"}, True),
                                  ({**check, "name": "lint"}, True), (check, False)):
            self.assertFalse(summarize_checks([changed], [], SHA, complete)["testsPassed"])

    def test_cached_snapshot_requires_matching_repository_and_provenance(self):
        class Connection:
            row = {"repo_slug": "team/project", "verified_at": "2026-01-01", "last_error": "rate limited",
                   "snapshot_json": json.dumps({"source": "github-rest", "repoSlug": "team/project", "commits": [], "pullRequests": []})}
            def execute(self, *_): return self
            def fetchone(self): return self.row
        conn = Connection()
        snapshot, error = load_snapshot(conn, "p", "team/project")
        self.assertIsNotNone(snapshot)
        self.assertEqual(error, "rate limited")
        self.assertIsNone(load_snapshot(conn, "p", "other/project")[0])
        conn.row = {**conn.row, "snapshot_json": '{"source":"demo"}'}
        self.assertIsNone(load_snapshot(conn, "p", "team/project")[0])


class GitHubRouteTests(unittest.TestCase):
    def setUp(self):
        from app.api.v1 import git_hub, kanban
        self.route, self.kanban = git_hub, kanban

    def test_failed_sync_preserves_records_and_last_success_timestamp(self):
        writes = []
        repo = {"repo_url": "https://github.com/team/project", "repo_slug": "team/project", "target_branch": "main"}
        class Connection:
            def execute(self, sql, params=()):
                if sql.startswith("UPDATE"): writes.append((sql, params))
                return self
            def fetchall(self): return [{"code": "TASK-12"}]
        @contextmanager
        def database(): yield Connection()
        with patch.object(self.route, "db", database), patch.object(self.route, "_ensure_git_project_access"), \
                patch.object(self.route, "_ensure_project_and_repo", return_value=({}, repo)), \
                patch.object(self.route, "_fetch_remote_github_data", side_effect=GitHubEvidenceError("network_error", "offline")):
            with self.assertRaises(self.route.HTTPException) as caught:
                self.route.sync_github_live("p", {}, {"id": "u", "role": "student"})
        self.assertEqual(caught.exception.status_code, 502)
        self.assertEqual(len(writes), 1)
        self.assertIn("SET last_error=", writes[0][0])
        self.assertNotIn("snapshot_json", writes[0][0])
        self.assertNotIn("last_synced_at", writes[0][0])

    def test_simulated_mutations_fail_before_database_access(self):
        with patch.object(self.route, "db", side_effect=AssertionError("No DB mutations allowed")):
            for method, args in ((self.route.push_git_commit, ("p", None, {})),
                                 (self.route.create_pull_request, ("p", None, {})),
                                 (self.route.peer_approve_pr, ("pr", None, {})),
                                 (self.route.merge_pull_request, ("pr", None, {})),
                                 (self.route.apply_pr_ai_fix, ("pr", {}))):
                with self.subTest(method=method.__name__), self.assertRaises(self.route.HTTPException) as caught:
                    method(*args)
                self.assertEqual(caught.exception.status_code, 409)

    def test_no_data_does_not_generate_a_100_percent_contributor(self):
        team = {"team_json": '[{"name":"Actual Student"}]'}
        members, metrics = self.route._compute_analytics_and_metrics(team, {}, [], [], [])
        self.assertEqual(members[0]["sharePct"], 0)
        self.assertFalse(metrics["scoresAvailable"])

    def test_repo_url_and_unverified_legacy_rows_are_not_task_proof(self):
        activity = self.kanban._build_task_git_activity("https://github.com/team/project/pull/7",
            {"evidenceVerified": False}, [{"sha": SHA}], [{"prNumber": 7, "status": "merged", "prUrl": "url"}])
        self.assertFalse(activity["hasValidGitProof"])
        repo = {"repo_slug": "team/project"}
        self.assertFalse(self.kanban._url_matches_project_repo("https://evil.test/github.com/team/project/pull/7", repo))
        self.assertFalse(self.kanban._url_matches_project_repo("https://github.com/team/project", repo))
        self.assertFalse(self.kanban._url_matches_project_repo("https://github.com/team/project-evil/pull/7", repo))
        self.assertTrue(self.kanban._url_matches_project_repo("https://github.com/team/project/pull/7", repo))

    def test_done_gate_requires_current_snapshot_pr_test_and_review(self):
        fixture = remote_fixture()
        snapshot = fetch_snapshot("https://github.com/team/project", "p", ["TASK-12"], request_json=fixture.__getitem__)
        class Connection:
            def execute(self, sql, *_):
                if "git_commits" in sql or "git_pull_requests" in sql:
                    raise AssertionError("Legacy local rows must not be queried as proof")
                return self
            def fetchone(self): return {"repo_slug": "team/project", "target_branch": "main"}
        task = {"project_id": "p", "code": "TASK-12", "column_id": "in-progress", "submission_url": ""}
        with patch.object(self.kanban, "load_snapshot", return_value=(snapshot, None)):
            self.kanban._check_git_proof_for_done(Connection(), {"role": "student"}, task, "done")
        broken = copy.deepcopy(snapshot)
        broken["pullRequests"][0]["testEvidence"]["headSha"] = OLD_SHA
        for evidence in (None, broken):
            with self.subTest(evidence=bool(evidence)), patch.object(self.kanban, "load_snapshot", return_value=(evidence, None)):
                with self.assertRaises(self.kanban.HTTPException) as caught:
                    self.kanban._check_git_proof_for_done(Connection(), {"role": "student"}, task, "done")
                self.assertEqual(caught.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()

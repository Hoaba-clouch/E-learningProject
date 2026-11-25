"""Regression tests use an isolated in-memory DB; never the configured MySQL."""
import json
from contextlib import contextmanager
from pathlib import Path
import sqlite3
import sys
import unittest
from unittest.mock import patch
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import HTTPException
from app.api.v1 import student_learning as learning
from app.schemas.student import ChapterExerciseSubmitIn


class ChapterEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = lambda cur, row: {d[0]: row[i] for i, d in enumerate(cur.description)}
        self.conn.executescript("""
            CREATE TABLE student_profiles(user_id TEXT, exp_points INTEGER);
            INSERT INTO student_profiles VALUES('student-a',100);
            CREATE TABLE student_chapter_submissions(
                id TEXT PRIMARY KEY,user_id TEXT,subject_id TEXT,chapter_number INTEGER,exercise_id TEXT,exercise_title TEXT,
                repo_url TEXT,student_note TEXT,score REAL,max_score REAL,tests_passed INTEGER,tests_total INTEGER,
                execution_time_ms INTEGER,anti_plagiarism_score REAL,rubric_json TEXT,ai_feedback_json TEXT,
                xp_awarded INTEGER,dual_submission_id TEXT,submitted_at TEXT,status TEXT,student_name TEXT,student_code TEXT,
                valgrind_leaks INTEGER,evidence_json TEXT,instructor_grade REAL,instructor_feedback TEXT,graded_by TEXT,graded_at TEXT);
            CREATE TABLE dual_submissions(id TEXT PRIMARY KEY,class_id TEXT,user_id TEXT,student_name TEXT,student_code TEXT,
                chapter_title TEXT,repo_url TEXT,submitted_at TEXT,passed_tests INTEGER,total_tests INTEGER,exec_time_ms INTEGER,
                memory_mb REAL,commit_hash TEXT,commit_count INTEGER,similarity_pct REAL,test_details_json TEXT,
                defense_status TEXT,defense_score REAL,coherence_summary TEXT,transcript_json TEXT,status TEXT,final_score REAL,
                instructor_feedback TEXT,updated_at TEXT);
        """)
        @contextmanager
        def db():
            yield self.conn
            self.conn.commit()
        self.course = {"id": "course-a", "chapters_json": json.dumps([{"id": "ch1", "status": "Đã phát hành", "assignments": [{"id": "ex-1", "title": "Bài thật"}]}])}
        self.patches = [patch.object(learning, "db", db),
                        patch.object(learning, "_require_student_course_enrollment", return_value=(self.course, {"id": "section-a"})),
                        patch.object(learning, "_ensure_profile", return_value={"exp_points": 100}),
                        patch.object(learning, "_recalculate_pending_dual_reviews"), patch.object(learning, "record_audit_log")]
        for p in self.patches: p.start()
        self.user = {"id": "student-a", "role": "student", "full_name": "Student A"}
        self.payload = ChapterExerciseSubmitIn(subject_id="oop", chapter_number=1, exercise_id="ex-1",
            exercise_title="Bài", repo_url="https://github.com/example/repo", student_note="A long note should never buy a better score", xp=300)

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.conn.close()

    def test_repo_verification_never_means_tests_passed_or_xp(self):
        with patch.object(learning, "_verify_github_repo", return_value={"commit_sha": "a"*40, "note": "Verified remote SHA"}):
            response = learning.submit_chapter_exercise(self.payload, self.user)
        sub = response["submission"]
        self.assertEqual(sub["evaluation_status"], "pending_review")
        self.assertEqual((sub["testsPassed"], sub["testsTotal"], sub["xp_awarded"]), (0, 0, 0))
        self.assertFalse(sub["metrics_verified"])
        self.assertEqual(sub["evidence"]["commit_sha"], "a"*40)
        self.assertEqual(response["total_xp"], 100)
        dual = self.conn.execute("SELECT * FROM dual_submissions").fetchone()
        self.assertEqual(dual["commit_hash"], "a"*40)
        self.assertEqual(dual["test_details_json"], "[]")

    def test_resubmit_keeps_previous_teacher_feedback_and_commit(self):
        with patch.object(learning, "_verify_github_repo", return_value={"commit_sha": "a"*40, "note": "Verified"}):
            old = learning.submit_chapter_exercise(self.payload, self.user)["submission"]
        self.conn.execute("UPDATE student_chapter_submissions SET instructor_grade=7.5,instructor_feedback='Fix input validation' WHERE id=?", (old["id"],))
        with patch.object(learning, "_verify_github_repo", return_value={"commit_sha": "b"*40, "note": "Verified"}):
            new = learning.submit_chapter_exercise(self.payload, self.user)["submission"]
        self.assertNotEqual(old["id"], new["id"])
        previous = self.conn.execute("SELECT * FROM student_chapter_submissions WHERE id=?", (old["id"],)).fetchone()
        self.assertEqual(previous["instructor_feedback"], "Fix input validation")
        self.assertEqual(previous["instructor_grade"], 7.5)
        self.assertEqual(json.loads(previous["evidence_json"])["commit_sha"], "a"*40)

    def test_unavailable_github_still_pending_not_a_pass(self):
        with patch.object(learning, "_verify_github_repo", return_value={"commit_sha": "", "note": "Connection unavailable"}):
            sub = learning.submit_chapter_exercise(self.payload, self.user)["submission"]
        self.assertEqual(sub["status"], "pending")
        self.assertEqual(sub["evidence"]["execution_status"], "not_run")
        self.assertEqual(sub["testsPassed"], 0)

    def test_unknown_assignment_is_rejected_before_remote_call(self):
        with patch.object(learning, "_verify_github_repo") as verify:
            with self.assertRaises(HTTPException):
                learning.submit_chapter_exercise(self.payload.model_copy(update={"exercise_id": "forged"}), self.user)
        verify.assert_not_called()

    def test_network_error_cannot_claim_verified_commit(self):
        with patch.object(learning.urllib.request, "urlopen", side_effect=urllib.error.URLError("offline")):
            result = learning._verify_github_repo("example", "repo")
        self.assertEqual(result["commit_sha"], "")
        self.assertNotIn("9.5", result["note"])


if __name__ == "__main__":
    unittest.main()

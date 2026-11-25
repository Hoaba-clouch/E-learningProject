"""Exercise the actual quiz route bodies against an isolated in-memory database.

AST loading excludes application imports/startup, so tests cannot read .env,
connect to MySQL, or invoke provider/network services.
"""
from __future__ import annotations

import ast
from contextlib import contextmanager
import itertools
import json
from pathlib import Path
import re
import sqlite3
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.quiz_grading import grade_answer, public_attempt, public_course_chapters, quiz_questions, quiz_version, resolve_lesson


class RouteError(Exception):
    def __init__(self, status_code, detail):
        self.status_code, self.detail = status_code, detail
        super().__init__(detail)


class Payload(SimpleNamespace):
    def model_copy(self, update):
        return Payload(**{**vars(self), **update})


class MemoryQuizDb:
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = lambda cursor, row: {col[0]: row[i] for i, col in enumerate(cursor.description)}
        self.conn.create_function("LEAST", -1, min)
        self.conn.create_function("GREATEST", -1, max)
        self.conn.executescript("""
          CREATE TABLE courses(id TEXT,subject_id TEXT,code TEXT,name TEXT,chapters_json TEXT);
          CREATE TABLE class_sections(id TEXT,course_id TEXT,status TEXT);
          CREATE TABLE class_enrollments(id TEXT,student_id TEXT,section_id TEXT,status TEXT);
          CREATE TABLE student_quiz_attempts(id TEXT PRIMARY KEY,user_id TEXT,subject_id TEXT,lesson_id TEXT,
            chapter_id TEXT,section_id TEXT,quiz_version TEXT,questions_json TEXT,answers_json TEXT,
            results_json TEXT,score INTEGER,total INTEGER,status TEXT,created_at TEXT,submitted_at TEXT);
          CREATE TABLE student_lesson_progress(id TEXT PRIMARY KEY,user_id TEXT,subject_id TEXT,chapter_id TEXT,
            lesson_id TEXT,status TEXT,quiz_score INTEGER,quiz_total INTEGER,xp_earned INTEGER,completed_at TEXT,
            UNIQUE(user_id,subject_id,lesson_id));
          CREATE TABLE student_profiles(user_id TEXT PRIMARY KEY,exp_points INTEGER,current_streak INTEGER,radar_algorithm REAL);
          INSERT INTO student_profiles VALUES('student-a',0,1,0);
          INSERT INTO class_sections VALUES('section-1','class-oop','active');
          INSERT INTO class_enrollments VALUES('enroll-1','student-a','section-1','active');
        """)
        self.chapters = [{"id": "chapter-1", "status": "Đã phát hành", "lessons": [{
            "id": "lesson-1", "title": "1.1 Constructor", "status": "Đã phát hành", "xp": 75,
            "content": {"quizzes": [
                {"question": "Question " + str(i), "options": ["Correct " + str(i), "Wrong " + str(i)], "correctIndex": 0,
                 "explanation": "EXPLANATION " + str(i)} for i in range(1, 4)]},
        }]}]
        self.execute("INSERT INTO courses VALUES(?,?,?,?,?)", ("class-oop", "oop", "CS201", "OOP", json.dumps(self.chapters)))
        self.conn.commit()

    def execute(self, sql, params=()):
        return self.conn.execute(sql.replace(" FOR UPDATE", ""), params)

    @contextmanager
    def transaction(self):
        try:
            yield self
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    def publish(self):
        self.execute("UPDATE courses SET chapters_json=? WHERE id='class-oop'", (json.dumps(self.chapters),))
        self.conn.commit()


def route_namespace(db):
    names = {"_require_student_course_enrollment", "_ensure_profile", "_lookup_lesson_xp",
             "start_quiz_attempt", "answer_quiz_question", "complete_student_lesson"}
    path = Path(__file__).resolve().parents[1] / "app/api/v1/student_learning.py"
    tree = ast.parse(path.read_text(encoding="utf-8"))
    functions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    if {node.name for node in functions} != names:
        raise AssertionError("Quiz route functions changed; update isolated test loader.")
    for node in functions:
        node.decorator_list = []
    module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), *functions], type_ignores=[])
    ast.fix_missing_locations(module)
    ids, timestamps = itertools.count(1), itertools.count(1)
    env = {"json": json, "re": re, "Any": object, "Depends": lambda value: None, "current_user": None,
           "db": db.transaction, "HTTPException": RouteError, "uid": lambda: f"test-{next(ids):04d}",
           "now_utc": lambda: f"2026-11-26T01:00:{next(timestamps):02d}Z",
           "SUBJECT_TO_CLASS_ID": {"oop": "class-oop"},
           "resolve_lesson": resolve_lesson, "quiz_questions": quiz_questions, "quiz_version": quiz_version,
           "grade_answer": grade_answer, "public_attempt": public_attempt,
           "_update_streak_on_activity": Mock(), "_recalculate_course_avg_progress": Mock(), "track_event": Mock()}
    exec(compile(module, str(path), "exec"), env)
    return env


class QuizServerTests(unittest.TestCase):
    def setUp(self):
        self.db = MemoryQuizDb()
        self.routes = route_namespace(self.db)
        self.user = {"id": "student-a", "role": "student"}

    def tearDown(self):
        self.db.conn.close()

    def start(self, restart=False, subject="oop", lesson="lesson-1"):
        return self.routes["start_quiz_attempt"](Payload(subject_id=subject, lesson_id=lesson, restart=restart), self.user)

    def answer(self, attempt, question="q-1", option="a", user=None):
        return self.routes["answer_quiz_question"](attempt["id"], Payload(question_id=question, option_id=option), user or self.user)

    def finish(self, correct=3):
        attempt = self.start()
        for index in range(1, 4):
            attempt = self.answer(attempt, "q-" + str(index), "a" if index <= correct else "b")
        return attempt

    def complete(self, attempt=None, subject="oop", lesson="lesson-1", user=None):
        payload = Payload(subject_id=subject, chapter_id="FORGED CHAPTER", lesson_id=lesson,
                          quiz_attempt_id=attempt["id"] if attempt else None, quiz_score=100, quiz_total=100, xp=300)
        return self.routes["complete_student_lesson"](payload, user or self.user)

    def assert_route_error(self, expected, call):
        with self.assertRaises(RouteError) as raised:
            call()
        self.assertEqual(raised.exception.status_code, expected)

    def test_start_uses_canonical_lesson_and_does_not_disclose_unanswered_keys(self):
        attempt = self.start(lesson="1.1")
        self.assertEqual(attempt["lesson_id"], "lesson-1")
        self.assertEqual(attempt["results"], [])
        for question in attempt["questions"]:
            self.assertNotIn("correct", question)
            self.assertNotIn("explanation", question)
        self.assertNotIn("EXPLANATION", json.dumps(attempt))

    def test_unfinished_attempt_resumes_and_explicit_retest_preserves_history(self):
        old = self.start()
        self.answer(old, option="b")
        resumed = self.start()
        self.assertEqual(resumed["id"], old["id"])
        new = self.start(restart=True)
        self.assertNotEqual(new["id"], old["id"])
        self.assertEqual(new["results"], [])
        self.assertEqual(self.db.execute("SELECT COUNT(*) n FROM student_quiz_attempts").fetchone()["n"], 2)

    def test_crossuser_attempt_cannot_be_answered_or_used_to_complete(self):
        attempt = self.finish()
        other_user = {"id": "student-b", "role": "student"}
        self.assert_route_error(404, lambda: self.answer(attempt, user=other_user))
        self.db.execute("INSERT INTO class_enrollments VALUES('enroll-2','student-b','section-1','active')")
        self.db.conn.commit()
        self.assert_route_error(422, lambda: self.complete(attempt, user=other_user))

    def test_answer_is_immutable_but_same_answer_retry_is_idempotent(self):
        attempt = self.start()
        first = self.answer(attempt, option="b")
        second = self.answer(attempt, option="b")
        self.assertEqual(second["results"], first["results"])
        self.assert_route_error(409, lambda: self.answer(attempt, option="a"))
        persisted = self.db.execute("SELECT * FROM student_quiz_attempts WHERE id=?", (attempt["id"],)).fetchone()
        self.assertEqual(json.loads(persisted["answers_json"]), {"q-1": "b"})
        self.assertEqual(persisted["score"], 0)

    def test_invalid_option_is_not_recorded(self):
        attempt = self.start()
        self.assert_route_error(409, lambda: self.answer(attempt, option="forged-option"))
        row = self.db.execute("SELECT answers_json FROM student_quiz_attempts WHERE id=?", (attempt["id"],)).fetchone()
        self.assertEqual(json.loads(row["answers_json"]), {})

    def test_forged_client_score_without_server_attempt_is_rejected(self):
        self.assert_route_error(422, self.complete)
        self.assertEqual(self.db.execute("SELECT exp_points FROM student_profiles WHERE user_id='student-a'").fetchone()["exp_points"], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) n FROM student_lesson_progress").fetchone()["n"], 0)

    def test_partial_or_failed_attempt_cannot_complete_even_with_forged_client_score(self):
        partial = self.start()
        self.answer(partial)
        self.assert_route_error(422, lambda: self.complete(partial))
        failed = self.finish(correct=1)
        self.assertEqual(failed["score"], 1)
        self.assertFalse(failed["passed"])
        self.assert_route_error(422, lambda: self.complete(failed))

    def test_real_server_score_canonical_chapter_and_server_xp_are_persisted(self):
        attempt = self.finish(correct=2)
        result = self.complete(attempt)
        self.assertEqual(result["xp_awarded"], 75)
        row = self.db.execute("SELECT * FROM student_lesson_progress").fetchone()
        self.assertEqual((row["quiz_score"], row["quiz_total"]), (2, 3))
        self.assertEqual(row["chapter_id"], "chapter-1")

    def test_changed_quiz_revision_invalidates_completion(self):
        attempt = self.finish()
        self.db.chapters[0]["lessons"][0]["content"]["quizzes"][0]["correctIndex"] = 1
        self.db.publish()
        self.assert_route_error(422, lambda: self.complete(attempt))
        self.assertEqual(self.db.execute("SELECT COUNT(*) n FROM student_lesson_progress").fetchone()["n"], 0)

    def test_repeated_completion_awards_xp_once(self):
        attempt = self.finish()
        first, second = self.complete(attempt), self.complete(attempt)
        self.assertEqual((first["xp_awarded"], second["xp_awarded"]), (75, 0))
        self.assertEqual(second["total_xp"], 75)

    def test_lesson_without_configured_quiz_can_complete_without_fake_score(self):
        self.db.chapters[0]["lessons"][0]["content"]["quizzes"] = []
        self.db.publish()
        result = self.complete()
        row = self.db.execute("SELECT quiz_score,quiz_total FROM student_lesson_progress").fetchone()
        self.assertEqual((row["quiz_score"], row["quiz_total"]), (0, 0))
        self.assertEqual(result["xp_awarded"], 75)

    def test_lesson_alias_cannot_award_duplicate_xp(self):
        attempt = self.finish()
        self.complete(attempt)
        second = self.complete(attempt, lesson="1.1")
        self.assertEqual(second["xp_awarded"], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) n FROM student_lesson_progress").fetchone()["n"], 1)

    def test_course_alias_stores_canonical_subject(self):
        attempt = self.start(subject="CS201")
        self.assertEqual(attempt["subject_id"], "oop")

    def test_legacy_display_code_progress_cannot_collect_xp_again(self):
        attempt = self.finish()
        self.db.execute("INSERT INTO student_lesson_progress VALUES(?,?,?,?,?,?,?,?,?,?)", ("legacy-progress", "student-a", "oop", "chapter-1", "1.1", "done", 3, 3, 75, "2026-11-25"))
        self.db.execute("UPDATE student_profiles SET exp_points=75 WHERE user_id='student-a'")
        self.db.conn.commit()
        result = self.complete(attempt)
        self.assertEqual(result["xp_awarded"], 0)
        self.assertEqual(result["total_xp"], 75)
        self.assertEqual(self.db.execute("SELECT COUNT(*) n FROM student_lesson_progress").fetchone()["n"], 1)

    def test_new_revision_stores_real_score_pair_instead_of_merging_denominators(self):
        quizzes = self.db.chapters[0]["lessons"][0]["content"]["quizzes"]
        quizzes.extend([{"question": "Question 4", "options": ["Yes", "No"], "correctIndex": 0}, {"question": "Question 5", "options": ["Yes", "No"], "correctIndex": 0}])
        self.db.publish()
        old = self.start()
        for index in range(1, 6):
            old = self.answer(old, "q-" + str(index), "a" if index <= 3 else "b")
        self.complete(old)
        quizzes.pop()
        self.db.publish()
        new = self.start(restart=True)
        for index in range(1, 5):
            new = self.answer(new, "q-" + str(index))
        self.complete(new)
        row = self.db.execute("SELECT quiz_score, quiz_total FROM student_lesson_progress").fetchone()
        self.assertEqual((row["quiz_score"], row["quiz_total"]), (4, 4))

    def test_reopening_completed_quiz_shows_result_until_explicit_restart(self):
        old = self.finish()
        reopened = self.start()
        self.assertEqual(reopened["id"], old["id"])
        self.assertEqual(reopened["status"], "submitted")
        self.assertNotEqual(self.start(restart=True)["id"], old["id"])

    def test_public_course_content_strips_both_quiz_shapes_without_mutating_keys(self):
        source = self.db.chapters
        source[0]["lessons"][0]["quizzes"] = [{"question": "Top level", "correct": "a", "answer": "Yes", "correctIndex": 0, "explanation": "KEY", "options": [{"id": "a", "text": "Yes", "isCorrect": True, "explanation": "KEY"}, {"id": "b", "text": "No"}]}]
        public = public_course_chapters(source)
        top = public[0]["lessons"][0]["quizzes"][0]
        nested = public[0]["lessons"][0]["content"]["quizzes"][0]
        for question in (top, nested):
            for key in ("correct", "answer", "correctIndex", "explanation"):
                self.assertNotIn(key, question)
        self.assertNotIn("isCorrect", top["options"][0])
        self.assertNotIn("explanation", top["options"][0])
        self.assertEqual(source[0]["lessons"][0]["quizzes"][0]["correct"], "a")
        self.assertEqual(len(quiz_questions(source[0]["lessons"][0])), 3)
        self.assertEqual(public_course_chapters(json.dumps(source)), public)


if __name__ == "__main__":
    unittest.main()

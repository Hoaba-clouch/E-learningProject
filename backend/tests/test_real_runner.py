"""Runner tests never initialize or connect to the application database."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services import code_evaluator as evaluator
from app.services import python_runner


def configured_conn(cases=None):
    cases = cases if cases is not None else [{"title": "sum", "input": "2 3\n", "expectedOutput": "5"}]
    row = {"chapters_json": json.dumps([{"assignments": [{"id": "py-sum", "testCases": cases}]}])}
    return SimpleNamespace(execute=lambda *args: SimpleNamespace(fetchall=lambda: [row]))


def executed(stdout="5\n", **overrides):
    result = dict(executed=True, exit_code=0, stdout=stdout, stderr="", duration_ms=17,
                  memory_mb=None, timed_out=False, output_truncated=False,
                  container_id="codemind-python-test", runner_error=None)
    return {**result, **overrides}


def mock_runner(monkeypatch, outputs):
    iterator = iter(outputs)
    class Runner:
        image = "python:test"
        image_id = "sha256:trusted"
        def prepare(self):
            pass
        def run_case(self, *args, **kwargs):
            return next(iterator)
    monkeypatch.setattr(evaluator, "DockerPythonRunner", Runner)


def test_no_docker_never_uses_keyword_heuristics(monkeypatch):
    monkeypatch.setattr(python_runner.shutil, "which", lambda _: None)
    code = "# if not page: history.append(page)\nprint('wrong')"
    result = evaluator.evaluate_sandbox_detailed(code)
    assert result["status"] == "unavailable"
    assert result["execution_status"] == "unavailable"
    assert result["passed_count"] == result["executed_count"] == 0
    assert result["sha256"] == hashlib.sha256(code.encode()).hexdigest()
    assert result["memory_mb"] is None and result["container_id"] is None


@pytest.mark.parametrize("language,exercise", [("cpp", "exercise-deque"), ("python", "not-configured")])
def test_unsupported_language_or_missing_suite_not_graded(monkeypatch, language, exercise):
    monkeypatch.setattr(evaluator, "DockerPythonRunner", lambda: pytest.fail("Must not launch runner"))
    result = evaluator.evaluate_sandbox_detailed("print(5)", language, exercise)
    assert result["status"] == "not_run" and result["passed_count"] == 0


def test_exact_assignment_required():
    assert evaluator._lookup_course_test_cases(configured_conn(), "py-other") == ([], "")


@pytest.mark.parametrize("output,passed", [("5\n", True), ("6\n", False), (" 5\n", False)])
def test_compares_real_stdout_and_records_provenance(monkeypatch, output, passed):
    mock_runner(monkeypatch, [executed(output)])
    result = evaluator.evaluate_sandbox_detailed("print(5)", "python", "py-sum", conn=configured_conn())
    assert result["status"] == ("passed" if passed else "failed")
    assert result["passed_count"] == int(passed)
    assert result["execution_status"] == "executed"
    assert result["test_cases"][0]["actual_output"] == output
    assert result["provenance"]["image_id"] == "sha256:trusted"
    assert len(result["provenance"]["test_suite_sha256"]) == 64


@pytest.mark.parametrize("overrides", [
    {"timed_out": True, "exit_code": -9},
    {"output_truncated": True, "exit_code": -9},
    {"stderr": "SyntaxError", "exit_code": 1},
])
def test_errors_cannot_pass_even_if_stdout_matches(monkeypatch, overrides):
    mock_runner(monkeypatch, [executed(**overrides)])
    result = evaluator.evaluate_sandbox_detailed("print(5)", "python", "py-sum", conn=configured_conn())
    assert result["status"] == "failed" and result["passed_count"] == 0


def test_partial_runner_failure_is_not_complete_evidence(monkeypatch):
    mock_runner(monkeypatch, [executed(), executed("", executed=False, runner_error="daemon down")])
    cases = [{"input": "", "expectedOutput": "5"}] * 3
    result = evaluator.evaluate_sandbox_detailed("print(5)", "python", "py-sum", conn=configured_conn(cases))
    assert result["execution_status"] == "unavailable"
    assert result["passed_count"] == 1 and result["executed_count"] == 1
    assert result["test_cases"][2]["status"] == "not_run"


class FakeProcess:
    output = b"hello\n"
    timeout = False
    def __init__(self, command, **kwargs):
        self.command = command
        self.stdin = io.BytesIO()
        self.stdout = io.BytesIO(self.output)
        self.stderr = io.BytesIO()
        self.returncode = None
    def wait(self, timeout):
        if self.timeout and self.returncode is None:
            raise subprocess.TimeoutExpired(self.command, timeout)
        self.returncode = self.returncode if self.returncode is not None else 0
        return self.returncode
    def poll(self):
        return self.returncode
    def kill(self):
        self.returncode = -9


def mock_docker(monkeypatch, process_type=FakeProcess):
    commands = []
    monkeypatch.setattr(python_runner.shutil, "which", lambda _: "docker")
    def run(command, **kwargs):
        commands.append(command)
        return SimpleNamespace(returncode=0, stdout=b"sha256:local linux\n", stderr=b"")
    def popen(command, **kwargs):
        commands.append(command)
        assert "shell" not in kwargs
        return process_type(command, **kwargs)
    monkeypatch.setattr(python_runner.subprocess, "run", run)
    monkeypatch.setattr(python_runner.subprocess, "Popen", popen)
    return commands


def test_container_isolation_immutable_image_and_cleanup(monkeypatch):
    commands = mock_docker(monkeypatch)
    runner = python_runner.DockerPythonRunner()
    runner.prepare()
    result = runner.run_case("print('hello')", "")
    command = next(c for c in commands if c[1] == "run")
    for option, value in [("--network", "none"), ("--memory", "128m"), ("--cpus", "0.5"),
                          ("--pids-limit", "32"), ("--cap-drop", "ALL"),
                          ("--security-opt", "no-new-privileges"), ("--user", "65534:65534"), ("--pull", "never")]:
        assert command[command.index(option) + 1] == value
    assert "--read-only" in command and "sha256:local" in command
    assert "readonly" in command[command.index("--mount") + 1]
    assert result["stdout"] == "hello\n" and result["executed"]
    assert any(c[1:3] == ["rm", "--force"] and c[-1] == result["container_id"] for c in commands)


def test_timeout_kills_cli_and_removes_container(monkeypatch):
    class TimeoutProcess(FakeProcess):
        timeout = True
    commands = mock_docker(monkeypatch, TimeoutProcess)
    runner = python_runner.DockerPythonRunner()
    runner.prepare()
    result = runner.run_case("while True: pass", "", timeout_ms=100)
    assert result["timed_out"] and result["exit_code"] == -9
    assert any(c[1:3] == ["rm", "--force"] for c in commands)


def test_output_is_bounded_and_container_removed(monkeypatch):
    class FloodProcess(FakeProcess):
        output = b"x" * (python_runner.OUTPUT_LIMIT_BYTES + 4096)
    commands = mock_docker(monkeypatch, FloodProcess)
    runner = python_runner.DockerPythonRunner()
    runner.prepare()
    result = runner.run_case("while True: print('x')", "")
    assert result["output_truncated"]
    assert len(result["stdout"].encode()) == python_runner.OUTPUT_LIMIT_BYTES
    assert any(c[1:3] == ["rm", "--force"] for c in commands)


def test_invalid_image_cannot_be_a_docker_option(monkeypatch):
    monkeypatch.setattr(python_runner.shutil, "which", lambda _: "docker")
    with pytest.raises(python_runner.RunnerUnavailable):
        python_runner.DockerPythonRunner("--privileged").prepare()


def test_real_docker_python_and_isolation_when_available():
    runner = python_runner.DockerPythonRunner()
    try:
        runner.prepare()
    except python_runner.RunnerUnavailable as exc:
        pytest.skip(str(exc))
    code = """import socket
from pathlib import Path
assert not Path('/workspace/.env').exists()
assert not Path('/var/run/docker.sock').exists()
try:
    Path('/workspace/mutate.py').write_text('bad')
    raise AssertionError('writable source')
except OSError:
    pass
try:
    socket.create_connection(('1.1.1.1', 80), timeout=0.2)
    raise AssertionError('network accessible')
except OSError:
    pass
print('isolated')
"""
    result = runner.run_case(code, "")
    assert result["exit_code"] == 0 and result["stdout"].strip() == "isolated", result
    timeout = runner.run_case("while True: pass", "", timeout_ms=500)
    assert timeout["timed_out"], timeout


def test_real_deque_correct_and_incorrect_when_available():
    runner = python_runner.DockerPythonRunner()
    try:
        runner.prepare()
    except python_runner.RunnerUnavailable as exc:
        pytest.skip(str(exc))
    good = "from collections import deque\nhistory=deque(maxlen=3)\ndef visit(page):\n    if page and page.strip():\n        history.append(page)\n    return list(history)\n"
    bad = "from collections import deque\nhistory=deque(maxlen=3)\ndef visit(page):\n    history.append(page)\n    return list(history)\n"
    correct = evaluator.evaluate_sandbox_detailed(good)
    incorrect = evaluator.evaluate_sandbox_detailed(bad)
    assert correct["status"] == "passed" and correct["passed_count"] == 5, correct
    assert incorrect["status"] == "failed" and incorrect["passed_count"] == 4, incorrect

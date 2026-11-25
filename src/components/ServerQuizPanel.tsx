import { useCallback, useEffect, useRef, useState } from "react";
import { answerStudentQuizApi, completeStudentLessonApi, startStudentQuizApi, type StudentQuizAttempt } from "../api";

interface Props {
  subjectId: string;
  lessonId: string;
  initialRestart?: boolean;
  onRestartConsumed?: () => void;
  onContext: (attempt: StudentQuizAttempt | null, questionIndex: number) => void;
  onCompleted: () => void;
  onAskTutor: () => void;
}

export default function ServerQuizPanel({ subjectId, lessonId, initialRestart = false, onRestartConsumed, onContext, onCompleted, onAskTutor }: Props) {
  const [attempt, setAttempt] = useState<StudentQuizAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState("");
  const generation = useRef(0);
  const restartOnMount = useRef(initialRestart);
  const start = useCallback(async (restart = false) => {
    const ticket = ++generation.current;
    setBusy(true); setError(""); setCompletion(""); setAttempt(null); setIndex(0); setSelected("");
    onContext(null, 0);
    try {
      const result = await startStudentQuizApi(subjectId, lessonId, restart);
      if (ticket !== generation.current) return;
      setAttempt(result);
      setIndex(Math.min(result.results.length, result.questions.length - 1));
    } catch (err) {
      if (ticket === generation.current) setError(err instanceof Error ? err.message : "Không thể tải Quiz.");
    } finally { if (ticket === generation.current) setBusy(false); }
  }, [subjectId, lessonId, onContext]);
  useEffect(() => {
    const restart = restartOnMount.current;
    restartOnMount.current = false;
    if (restart) onRestartConsumed?.();
    void start(restart);
    return () => { generation.current += 1; };
  }, [start]);
  useEffect(() => { onContext(attempt, index); }, [attempt, index, onContext]);
  const question = attempt?.questions[index];
  const feedback = attempt?.results.find(r => r.question_id === question?.id);

  const answer = async () => {
    if (!attempt || !question || !selected || busy) return;
    const ticket = generation.current;
    setBusy(true); setError("");
    try {
      const next = await answerStudentQuizApi(attempt.id, question.id, selected);
      if (ticket !== generation.current) return;
      setAttempt(next);
      if (next.status === "submitted" && next.passed) {
        const completed = await completeStudentLessonApi({ subject_id: subjectId, lesson_id: lessonId,
          chapter_id: next.chapter_id, quiz_attempt_id: next.id });
        if (ticket !== generation.current) return;
        if (completed) { setCompletion(`Hoàn thành bài học. +${completed.xp_awarded} XP`); onCompleted(); }
        else setError("Đã lưu kết quả Quiz, nhưng chưa ghi nhận hoàn thành bài học. Bấm thử lại ghi nhận.");
      }
    } catch (err) {
      if (ticket === generation.current) setError(err instanceof Error ? err.message : "Chưa lưu được đáp án. Hãy thử lại.");
    } finally { if (ticket === generation.current) setBusy(false); }
  };
  const retryCompletion = async () => {
    if (!attempt || busy) return;
    const ticket = generation.current;
    setBusy(true);
    const result = await completeStudentLessonApi({ subject_id: subjectId, lesson_id: lessonId,
      chapter_id: attempt.chapter_id, quiz_attempt_id: attempt.id });
    if (ticket !== generation.current) return;
    setBusy(false);
    if (result) { setError(""); setCompletion(`Hoàn thành bài học. +${result.xp_awarded} XP`); onCompleted(); }
  };
  const button = "rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed";
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" aria-busy={busy}>
    <div>
      <h2 className="text-lg font-bold">Checkpoint Quiz</h2>
      <p className="mt-1 text-sm text-slate-500">Đáp án được chấm và lưu trên server. Đạt tối thiểu 60% để hoàn thành bài học.</p>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
    {!attempt && <button className={button} disabled={busy} onClick={() => void start()}>{busy ? "Đang tải câu hỏi…" : "Thử tải lại Quiz"}</button>}
    {attempt && question && <>
      <p className="text-sm text-slate-500">Câu {index + 1}/{attempt.total} · Đã trả lời {attempt.results.length}/{attempt.total} · Đúng {attempt.score} câu</p>
      <nav className="flex flex-wrap gap-2" aria-label="Xem lại câu hỏi">
        {attempt.questions.map((q, i) => {
          const answer = attempt.results.find(r => r.question_id === q.id);
          return <button key={q.id} disabled={busy || (!answer && i > attempt.results.length)} onClick={() => { setIndex(i); setSelected(""); }}
            aria-current={i === index ? "step" : undefined}
            className={`rounded-lg border px-3 py-1 text-xs disabled:opacity-40 ${i === index ? "border-amber-500 font-bold" : "border-slate-200 dark:border-slate-700"}`}>
            {i + 1}{answer ? answer.is_correct ? " ✓" : " · sai" : ""}
          </button>;
        })}
      </nav>
      <h3 className="font-semibold">{question.question}</h3>
      <div className="space-y-2" role="radiogroup" aria-label="Phương án trả lời">
        {question.options.map(option => <button key={option.id} role="radio" aria-checked={(feedback?.selected_option || selected) === option.id}
          disabled={busy || !!feedback} onClick={() => setSelected(option.id)}
          className={`w-full rounded-xl border p-3 text-left text-sm disabled:cursor-default ${feedback?.correct_option === option.id ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : (feedback?.selected_option || selected) === option.id ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-slate-200 dark:border-slate-700"}`}>
          <strong className="mr-2">{option.id.toUpperCase()}.</strong>{option.text}
        </button>)}
      </div>
      {feedback && <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800" aria-live="polite">
        <strong>{feedback.is_correct ? "Chính xác." : "Chưa chính xác."}</strong> {feedback.explanation}
      </div>}
      <div className="flex flex-wrap gap-3">
        {!feedback && <button className={button} disabled={busy || !selected} onClick={() => void answer()}>{busy ? "Đang lưu…" : "Kiểm tra đáp án"}</button>}
        {feedback && index + 1 < attempt.total && <button className={button} disabled={busy} onClick={() => { setIndex(i => i + 1); setSelected(""); }}>Câu tiếp theo</button>}
        <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={onAskTutor}>Hỏi trợ giảng về phần này</button>
      </div>
      {attempt.status === "submitted" && <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800" aria-live="polite">
        <p className="font-bold">Kết quả đã lưu: {attempt.score}/{attempt.total} ({Math.round(attempt.score / attempt.total * 100)}%) · {attempt.passed ? "Đạt" : "Cần luyện tập thêm"}</p>
        {completion && <p className="text-sm text-emerald-700 dark:text-emerald-300">{completion}</p>}
        <p className="text-sm text-slate-500">{attempt.passed ? "Có thể luyện lại để kiểm tra mức độ ghi nhớ. Lịch sử lần làm trước được giữ nguyên." : "Xem lại các câu sai hoặc hỏi trợ giảng, sau đó bắt đầu một lần làm mới."}</p>
        <div className="flex flex-wrap gap-3">
          <button className={button} disabled={busy} onClick={() => void start(true)}>Làm lại Quiz</button>
          {attempt.passed && !completion && <button className={button} disabled={busy} onClick={() => void retryCompletion()}>Thử lại ghi nhận hoàn thành</button>}
        </div>
      </div>}
    </>}
  </section>;
}

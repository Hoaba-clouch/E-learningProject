import { useRef, useState } from "react";
import { submitCodeToSandbox, type SubmissionResult } from "../api";

export default function PythonLabPanel({ exerciseId, initialCode, onAskTutor }: { exerciseId: string; initialCode: string; onAskTutor: () => void }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const run = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setResult(null);
    try { setResult(await submitCodeToSandbox(code, "python", "demo-session", exerciseId)); }
    catch (err) { setError(err instanceof Error ? err.message : "Chưa kết nối được runner; chưa có kết quả."); }
    finally { running.current = false; setBusy(false); }
  };
  return <section className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-bold">Chạy thử Python</h2>
    <p className="text-xs text-slate-500">Mỗi test chạy trong container cô lập, dùng input/output do giảng viên cấu hình. Chỉ hỗ trợ thư viện chuẩn Python; bài nộp repository vẫn chờ giảng viên chấm.</p>
    <label className="block text-sm font-medium" htmlFor="python-lab-source">Mã Python (đọc stdin, in kết quả ra stdout)</label>
    <textarea id="python-lab-source" value={code} onChange={e => setCode(e.target.value)} disabled={busy} spellCheck={false}
      className="min-h-64 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs text-slate-100 dark:border-slate-700" />
    <div className="flex flex-wrap gap-3">
      <button disabled={busy || !code.trim()} onClick={() => void run()} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "Đang chạy kiểm thử…" : "Chạy test trên server"}</button>
      <button onClick={onAskTutor} className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Nhờ trợ giảng phân tích kết quả</button>
    </div>
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    {result && <div className="space-y-2 text-sm" aria-live="polite">
      <p className="font-semibold">{result.execution_status === "executed" ? `${result.passed_count}/${result.total_count} test đạt` : "Chưa thực thi kiểm thử"}</p>
      {result.message && <p>{result.message}</p>}
      {result.sha256 && <p className="break-all font-mono text-xs text-slate-500">SHA-256 mã đã gửi: {result.sha256}</p>}
      {result.test_cases.map(test => <details key={test.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <summary>{test.title} · {test.status}</summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs">Kỳ vọng: {test.expected_output}{"\n"}Thực tế: {test.actual_output}{"\n"}{test.failure_reason}</p>
      </details>)}
    </div>}
  </section>;
}

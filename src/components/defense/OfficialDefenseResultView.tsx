import React from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { DefenseProjectDossier } from "../../api";

interface Props {
  dossier: DefenseProjectDossier | null;
  practiceCount?: number;
  onGoToPractice?: () => void;
  onNotify?: (msg: string) => void;
}

export default function OfficialDefenseResultView({
  dossier,
  practiceCount = 0,
  onGoToPractice,
  onNotify,
}: Props) {
  if (!dossier) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
        Đang tải thông tin kết quả bảo vệ đồ án...
      </div>
    );
  }

  const ev = dossier.officialEvaluation;
  const { project } = dossier;

  const handlePrintOfficial = () => {
    if (!ev?.isGraded) return;
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const rowsHtml = (ev.memberScores || [])
      .map(
        (m) => `<tr>
          <td><b>${esc(m.name)}</b><br/><small>${esc(m.role)}</small></td>
          <td>${m.contribution_pct}% SP</td>
          <td><b>${Number(m.individual_score).toFixed(1)} / 10</b></td>
          <td>${esc(m.asked_question || "—")}</td>
          <td>${esc(m.live_qa_note || "—")}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Kết quả Bảo vệ Đồ án - ${esc(project.code)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 820px; margin: 32px auto; padding: 20px; line-height: 1.55; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f8fafc; }
</style>
</head>
<body>
  <h1>BIÊN BẢN KẾT QUẢ BẢO VỆ ĐỒ ÁN CHÍNH THỨC</h1>
  <p>Đề tài: <b>${esc(project.code)} — ${esc(project.name)}</b><br/>
  Hội đồng chấm: ${esc(ev.councilMembers || ev.graderName)} · Ngày chốt: ${esc(ev.gradedAt)}</p>
  <p style="font-size:18px;">Điểm tổng hợp nhóm: <b>${(ev.finalScore ?? 0).toFixed(2)} / 10</b></p>
  <p>Demo trực tiếp (35%): <b>${(ev.demoScore ?? 0).toFixed(1)}</b> · Kiến trúc & Code (25%): <b>${(ev.architectureScore ?? 0).toFixed(1)}</b> · Quy trình (15%): <b>${(ev.processScore ?? 0).toFixed(1)}</b> · Phản biện Q&A (25%): <b>${(ev.defenseScore ?? 0).toFixed(1)}</b></p>
  <p><b>Nhận xét Hội đồng:</b> ${esc(ev.feedback)}</p>
  <table>
    <thead><tr><th>Thành viên</th><th>Đóng góp</th><th>Điểm</th><th>Câu hỏi trực tiếp</th><th>Nhận xét Q&A</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } else {
      onNotify?.("Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup.");
    }
  };

  if (!ev?.isGraded) {
    const readyItems = [
      { label: "Đã nộp Link Live Demo", ok: Boolean(dossier.package.demoUrl) },
      { label: "Đã nộp Slide / Báo cáo", ok: Boolean(dossier.package.slideUrl || dossier.package.reportUrl) },
      { label: "Đã đóng băng dự án (Freeze)", ok: project.isFrozen },
      { label: "Đã tập Phản biện AI", ok: practiceCount > 0 || dossier.practiceSessions.length > 0 },
    ];

    return (
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950">
            <Clock size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Chưa có Kết quả Bảo vệ Chính thức cho {project.code}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Điểm bảo vệ chính thức sẽ được Giảng viên & Hội đồng chấm trực tiếp sau khi nhóm trình diễn sản phẩm Demo và trả lời hỏi-đáp. Phòng Phản biện AI chỉ là nơi luyện tập để chuẩn bị kiến thức và không thay thế điểm Hội đồng.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {readyItems.map((it) => (
            <div
              key={it.label}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  it.ok ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                }`}
              />
              <span>{it.label}</span>
            </div>
          ))}
        </div>

        {onGoToPractice && (
          <div>
            <button
              type="button"
              onClick={onGoToPractice}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Quay lại Hồ sơ Bảo vệ & Phòng tập AI</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const verdictBadge =
    ev.verdict === "fail"
      ? { label: "Yêu cầu bảo vệ lại", dot: "bg-rose-500" }
      : ev.verdict === "pass_with_revisions"
      ? { label: "Đạt · Cần bổ sung nhẹ", dot: "bg-amber-500" }
      : { label: "Đạt · Đã nghiệm thu", dot: "bg-emerald-500" };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-500">{project.code}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <span className={`w-1.5 h-1.5 rounded-full ${verdictBadge.dot}`} />
                <span>{verdictBadge.label}</span>
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Kết quả Bảo vệ Đồ án Trực tiếp — {project.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hội đồng: <b className="text-slate-700 dark:text-slate-200">{ev.councilMembers || ev.graderName}</b>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right px-4 py-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950">
              <span className="text-[10px] font-bold uppercase opacity-75 block">Điểm Chính thức</span>
              <span className="text-2xl font-black font-mono">
                {(ev.finalScore ?? 0).toFixed(2)}<span className="text-xs font-semibold opacity-75">/10</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handlePrintOfficial}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>In Biên bản</span>
            </button>
          </div>
        </div>

        {/* 4 Criteria Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Demo Sản phẩm Trực tiếp", weight: "35%", score: ev.demoScore ?? 0 },
            { label: "Kiến trúc & Chất lượng Code", weight: "25%", score: ev.architectureScore ?? 0 },
            { label: "Quy trình Kanban & Git", weight: "15%", score: ev.processScore ?? 0 },
            { label: "Trả lời Phản biện Q&A", weight: "25%", score: ev.defenseScore ?? 0 },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">{c.label}</span>
                <span className="font-mono text-[11px] text-slate-500">{c.weight}</span>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {c.score.toFixed(1)}<span className="text-xs font-medium text-slate-400"> / 10</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, c.score * 10)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Nhận xét Hội đồng */}
        {ev.feedback && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-4 text-xs space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award size={14} className="text-amber-500" />
              Nhận xét chung của Hội đồng
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {ev.feedback}
            </p>
          </div>
        )}

        {/* Bảng điểm cá nhân & Q&A */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users size={14} className="text-slate-500" />
            Điểm Cá nhân & Nhận xét Vấn đáp Từng Thành viên
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(ev.memberScores || []).map((m) => (
              <div
                key={m.member_id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-slate-900 dark:text-white">{m.name}</b>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">
                      ({m.role} · {m.contribution_pct}% SP)
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {Number(m.individual_score).toFixed(1)}/10
                  </span>
                </div>
                {m.asked_question && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <b>Câu hỏi Hội đồng:</b> {m.asked_question}
                  </p>
                )}
                {m.live_qa_note && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <b>Đánh giá Q&A:</b> {m.live_qa_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

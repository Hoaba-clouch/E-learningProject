import React, { useEffect, useMemo, useState } from "react";
import MarloSelect from "../MarloSelect";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode2,
  FileText,
  FolderGit2,
  FolderKanban,
  GitBranch,
  Globe,
  Link2,
  Lock,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import {
  fetchDefenseProjectDossierApi,
  generateCouncilQuestionsApi,
  submitLiveCouncilGradeApi,
  updateWorkspaceProjectApi,
  type CouncilQuestionsResult,
  type DefenseProjectDossier,
  type DefenseProjectOption,
  type OfficialMemberScoreRecord,
  type SessionRole,
} from "../../api";

interface Props {
  projects: DefenseProjectOption[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  role: SessionRole;
  onNotify: (msg: string) => void;
  onGradedSuccess?: () => void;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenKanban?: (projectId: string) => void;
  onOpenGitHub?: (projectId: string) => void;
}

function safeUrl(url?: string | null): string | null {
  const s = (url || "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

function roundToOne(num: number): number {
  return Math.round(num * 10) / 10;
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export default function LiveCouncilCockpit({
  projects,
  selectedProjectId,
  onSelectProject,
  role,
  onNotify,
  onGradedSuccess,
  onOpenProjectDetail,
  onOpenKanban,
  onOpenGitHub,
}: Props) {
  const [dossier, setDossier] = useState<DefenseProjectDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [councilAI, setCouncilAI] = useState<CouncilQuestionsResult | null>(null);

  // Live 4-criteria rubric (0 - 10)
  const [demoScore, setDemoScore] = useState(8.8);
  const [archScore, setArchScore] = useState(8.5);
  const [processScore, setProcessScore] = useState(8.8);
  const [defenseScore, setDefenseScore] = useState(8.5);

  const [verdict, setVerdict] = useState<"pass" | "pass_with_revisions" | "fail">("pass");
  const [councilMembers, setCouncilMembers] = useState("Hội đồng Bảo vệ Đồ án CNTT");
  const [feedback, setFeedback] = useState("");
  const [demoVerified, setDemoVerified] = useState(true);
  const [repoVerified, setRepoVerified] = useState(true);
  const [frozenVerified, setFrozenVerified] = useState(false);

  const [memberDrafts, setMemberDrafts] = useState<Record<string, OfficialMemberScoreRecord>>({});

  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    setLoading(true);
    setCouncilAI(null);
    fetchDefenseProjectDossierApi(selectedProjectId, role)
      .then((d) => {
        if (!active || !d) return;
        setDossier(d);
        const ev = d.officialEvaluation;
        const initDemo = ev?.isGraded && ev.demoScore !== undefined ? ev.demoScore : 8.8;
        const initArch = ev?.isGraded && ev.architectureScore !== undefined ? ev.architectureScore : 8.5;
        const initProc = ev?.isGraded && ev.processScore !== undefined ? ev.processScore : 8.8;
        const initDef = ev?.isGraded && ev.defenseScore !== undefined ? ev.defenseScore : 8.5;
        setDemoScore(initDemo);
        setArchScore(initArch);
        setProcessScore(initProc);
        setDefenseScore(initDef);
        setVerdict(
          ev?.isGraded && (ev.verdict === "fail" || ev.verdict === "pass_with_revisions" || ev.verdict === "pass")
            ? ev.verdict
            : "pass"
        );
        setCouncilMembers(
          ev?.isGraded && ev.councilMembers
            ? ev.councilMembers
            : [d.project.instructorName, d.project.reviewerName].filter(Boolean).join(" · ") ||
              "Hội đồng Bảo vệ Đồ án"
        );
        setFeedback(
          ev?.isGraded && ev.feedback
            ? ev.feedback
            : "Nhóm trình bày demo trực tiếp rõ ràng, nắm vững luồng nghiệp vụ và trả lời thẳng trọng tâm câu hỏi Hội đồng."
        );
        setDemoVerified(ev?.isGraded ? Boolean(ev.demoVerified) : Boolean(d.package.demoUrl));
        setRepoVerified(ev?.isGraded ? Boolean(ev.repoVerified) : Boolean(d.project.repoUrl));
        setFrozenVerified(ev?.isGraded ? Boolean(ev.frozenVerified) : Boolean(d.project.isFrozen));

        const nextGroup = roundToTwo(0.35 * initDemo + 0.25 * initArch + 0.15 * initProc + 0.25 * initDef);
        const existingMap = new Map<string, OfficialMemberScoreRecord>();
        (ev?.memberScores || []).forEach((ms) => existingMap.set(ms.member_id, ms));

        const draftMap: Record<string, OfficialMemberScoreRecord> = {};
        d.memberMetrics.forEach((m) => {
          const prev = existingMap.get(m.member_id);
          draftMap[m.member_id] = {
            member_id: m.member_id,
            name: m.name,
            role: m.role,
            contribution_pct: m.contribution_pct,
            suggested_factor: m.suggested_factor,
            individual_score:
              prev?.individual_score !== undefined
                ? roundToOne(prev.individual_score)
                : roundToOne(Math.min(10, Math.max(0, nextGroup * (m.suggested_factor || 1)))),
            asked_question: prev?.asked_question || "",
            live_qa_note: prev?.live_qa_note || "",
          };
        });
        setMemberDrafts(draftMap);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId, role]);

  const groupScore = useMemo(
    () => roundToTwo(0.35 * demoScore + 0.25 * archScore + 0.15 * processScore + 0.25 * defenseScore),
    [demoScore, archScore, processScore, defenseScore]
  );

  const canGradeCouncil = Boolean(
    role === "admin" || dossier?.project.canGradeCouncil
  );
  const canAssignAdvisor = role === "admin";
  const canAssignReviewer = Boolean(
    role === "admin" || dossier?.project.isAdvisor || dossier?.project.canManageCouncil
  );
  const [savingAssignment, setSavingAssignment] = useState(false);

  const handleAssignCouncilMember = async (
    kind: "advisor" | "reviewer",
    nextInstructorId: string
  ) => {
    if (!dossier || savingAssignment) return;
    setSavingAssignment(true);
    try {
      const updated = await updateWorkspaceProjectApi(
        dossier.project.id,
        kind === "advisor"
          ? { instructor_id: nextInstructorId }
          : { reviewer_id: nextInstructorId },
        role,
        true
      );
      if (updated) {
        const refreshed = await fetchDefenseProjectDossierApi(dossier.project.id, role);
        if (refreshed) {
          setDossier(refreshed);
          setCouncilMembers(
            [refreshed.project.instructorName, refreshed.project.reviewerName]
              .filter(Boolean)
              .join(" · ") || "Hội đồng Bảo vệ Đồ án"
          );
        }
        onGradedSuccess?.();
        onNotify(
          kind === "advisor"
            ? `✓ Đã phân công GV Hướng dẫn mới: ${updated.instructorName || updated.instructor}`
            : `✓ Đã phân công GV Phản biện: ${updated.reviewerName || "Chưa gán"}`
        );
      }
    } catch (err: any) {
      onNotify(`⚠️ ${err?.message || "Không thể cập nhật phân công Hội đồng."}`);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRecalcMemberScores = () => {
    if (!dossier) return;
    setMemberDrafts((prev) => {
      const next = { ...prev };
      dossier.memberMetrics.forEach((m) => {
        const cur = next[m.member_id];
        if (cur) {
          next[m.member_id] = {
            ...cur,
            individual_score: roundToOne(Math.min(10, Math.max(0, groupScore * (m.suggested_factor || 1)))),
          };
        }
      });
      return next;
    });
    onNotify("Đã tính lại điểm gợi ý từng thành viên theo hệ số đóng góp Anti-Freerider.");
  };

  const handleGenerateQuestions = async () => {
    if (!dossier || loadingAI) return;
    setLoadingAI(true);
    try {
      const res = await generateCouncilQuestionsApi(dossier.project.id, role);
      setCouncilAI(res);
      onNotify(`✓ Đã tạo gợi ý câu hỏi trực tiếp bám sát dữ liệu ${dossier.project.code}.`);
    } catch (err: any) {
      onNotify(`⚠️ ${err?.message || "Không thể sinh câu hỏi gợi ý."}`);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleInjectQuestionToMember = (memberId: string, qText: string) => {
    setMemberDrafts((prev) => {
      const cur = prev[memberId];
      if (!cur) return prev;
      return {
        ...prev,
        [memberId]: {
          ...cur,
          asked_question: qText,
        },
      };
    });
    onNotify("Đã đưa câu hỏi vào phiếu chấm Q&A của thành viên.");
  };

  const handleSubmitGrade = async () => {
    if (!dossier || submitting) return;
    setSubmitting(true);
    try {
      const member_scores = dossier.memberMetrics.map(
        (m) =>
          memberDrafts[m.member_id] || {
            member_id: m.member_id,
            name: m.name,
            role: m.role,
            contribution_pct: m.contribution_pct,
            suggested_factor: m.suggested_factor,
            individual_score: groupScore,
            asked_question: "",
            live_qa_note: "",
          }
      );

      const res = await submitLiveCouncilGradeApi(
        dossier.project.id,
        {
          demo_score: demoScore,
          architecture_score: archScore,
          process_score: processScore,
          defense_score: defenseScore,
          feedback: feedback.trim(),
          verdict,
          council_members: councilMembers.trim(),
          demo_verified: demoVerified,
          repo_verified: repoVerified,
          frozen_verified: frozenVerified,
          member_scores,
        },
        role
      );

      setDossier((prev) =>
        prev
          ? {
              ...prev,
              project: {
                ...prev.project,
                status: verdict === "fail" ? "active" : "delivered",
              },
              officialEvaluation: res.officialEvaluation,
            }
          : prev
      );
      onGradedSuccess?.();
      onNotify(`✓ Đã chốt Biên bản Hội đồng đồ án ${dossier.project.code}: ${res.final_score}/10.`);
    } catch (err: any) {
      onNotify(`⚠️ ${err?.message || "Lỗi khi chốt điểm Hội đồng."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintMinutes = () => {
    if (!dossier) return;
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const rowsHtml = dossier.memberMetrics
      .map((m) => {
        const d = memberDrafts[m.member_id];
        return `<tr>
          <td><b>${esc(m.name)}</b><br/><small>${esc(m.role)}</small></td>
          <td>${m.completed_points}/${m.total_points} SP (${m.contribution_pct}%) · ${m.commits_count} commits</td>
          <td><b>${(d?.individual_score ?? groupScore).toFixed(1)} / 10</b></td>
          <td>${esc(d?.asked_question || "—")}</td>
          <td>${esc(d?.live_qa_note || "—")}</td>
        </tr>`;
      })
      .join("");

    const verdictText =
      verdict === "pass"
        ? "ĐẠT — NGHIỆM THU"
        : verdict === "pass_with_revisions"
        ? "ĐẠT — CẦN BỔ SUNG NHẸ"
        : "CHƯA ĐẠT — BẢO VỆ LẠI";

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Biên bản Hội đồng - ${esc(dossier.project.code)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 860px; margin: 32px auto; padding: 24px; line-height: 1.55; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 13px; color: #475569; margin-bottom: 18px; }
  .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
  .score { font-size: 26px; font-weight: 800; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 700; }
</style>
</head>
<body>
  <h1>BIÊN BẢN CHẤM BẢO VỆ ĐỒ ÁN TRỰC TIẾP</h1>
  <div class="meta">Đề tài: <b>${esc(dossier.project.code)} — ${esc(dossier.project.name)}</b> · ${esc(dossier.project.course)}<br/>Hội đồng chấm: ${esc(councilMembers)}</div>
  <div class="box">
    <div>Kết luận: <b>${verdictText}</b> · Điểm tổng hợp nhóm: <span class="score">${groupScore.toFixed(2)} / 10</span></div>
    <p style="font-size:13px;margin:8px 0 0;">
      Demo trực tiếp (35%): <b>${demoScore.toFixed(1)}</b> ·
      Kiến trúc & Code (25%): <b>${archScore.toFixed(1)}</b> ·
      Quy trình Kanban/Git (15%): <b>${processScore.toFixed(1)}</b> ·
      Trả lời Phản biện Q&A (25%): <b>${defenseScore.toFixed(1)}</b>
    </p>
  </div>
  <div class="box">
    <b>Nhận xét chung của Hội đồng:</b>
    <p style="margin:6px 0 0;font-size:13px;">${esc(feedback)}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Thành viên</th>
        <th>Minh chứng Kanban & Git</th>
        <th>Điểm cá nhân</th>
        <th>Câu hỏi Hội đồng</th>
        <th>Ghi chú Q&A</th>
      </tr>
    </thead>
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
      onNotify("Trình duyệt đang chặn cửa sổ in biên bản. Hãy cho phép popup và thử lại.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Project Selector Bar */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-500" />
              Chọn Đồ án Lên Hội đồng Bảo vệ Trực tiếp ({projects.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Xem toàn cảnh sản phẩm Demo, Repo, đóng góp Anti-Freerider và chấm điểm trực tiếp khi nhóm thuyết trình.
            </p>
          </div>
          {dossier?.officialEvaluation?.isGraded && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Đã chốt điểm: {dossier.officialEvaluation.finalScore?.toFixed(2)}/10
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {projects.map((p) => {
            const active = p.id === selectedProjectId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p.id)}
                className={`text-left rounded-2xl border p-3 transition cursor-pointer ${
                  active
                    ? "border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-900 dark:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold">{p.code}</span>
                  {p.isGraded ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        active
                          ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-950"
                          : "bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {p.officialFinalScore?.toFixed(1)}/10
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        active
                          ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Chờ bảo vệ
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold line-clamp-1">{p.name}</p>
                <div
                  className={`flex items-center gap-1.5 flex-wrap mt-1 text-[10px] ${
                    active ? "opacity-90" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <span className="font-semibold">
                    {p.myCouncilRole === "admin"
                      ? "Quản trị"
                      : p.isAdvisor
                      ? "GV Hướng dẫn"
                      : p.isReviewer
                      ? "GV Phản biện"
                      : "Chỉ xem"}
                  </span>
                  <span>·</span>
                  <span>{p.doneTasksCount}/{p.totalTasksCount} task</span>
                  <span>·</span>
                  <span>{p.hasDefensePackage ? "Có Demo" : "Chưa có Demo"}</span>
                  {p.isFrozen && <span>· Frozen</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading || !dossier ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw size={20} className="animate-spin text-amber-500" />
          <span>Đang tải toàn bộ hồ sơ dự án từ MySQL...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* ─── LEFT COLUMN (7 cols): TỔNG QUAN DỰ ÁN, DEMO & MINH CHỨNG ─── */}
          <div className="xl:col-span-7 space-y-5">
            {/* 1. Hồ sơ Demo & Nút mở nhanh */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    {dossier.project.code} · {dossier.project.course}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {dossier.project.name}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <ShieldCheck size={12} className="text-amber-500" />
                    <span>
                      {role === "admin"
                        ? "Quản trị Hội đồng"
                        : dossier.project.isAdvisor
                        ? "Bạn là GV Hướng dẫn"
                        : dossier.project.isReviewer
                        ? "Bạn là GV Phản biện"
                        : "Ngoài Hội đồng chấm · Chỉ xem"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        dossier.project.isFrozen ? "bg-rose-500" : "bg-amber-500"
                      }`}
                    />
                    {dossier.project.isFrozen ? "Đã đóng băng (Frozen)" : "Đang mở nộp bài"}
                  </span>
                </div>
              </div>

              {/* Hội đồng Chấm Đồ án (Hướng 2: GV Hướng dẫn + GV Phản biện) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-1">
                    Giảng viên Hướng dẫn (GVHD)
                  </span>
                  {canAssignAdvisor && (dossier.instructors || []).length > 0 ? (
                    <MarloSelect
                      value={dossier.project.instructorId || ""}
                      disabled={savingAssignment}
                      onChange={(e) => void handleAssignCouncilMember("advisor", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {(dossier.instructors || [])
                        .filter((inst) => inst.id !== dossier.project.reviewerId)
                        .map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                    </MarloSelect>
                  ) : (
                    <div className="font-bold text-slate-900 dark:text-white py-1">
                      {dossier.project.instructorName || "Chưa phân công"}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-1">
                    Giảng viên Phản biện (GVPB)
                  </span>
                  {canAssignReviewer && (dossier.instructors || []).length > 0 ? (
                    <MarloSelect
                      value={dossier.project.reviewerId || ""}
                      disabled={savingAssignment}
                      onChange={(e) => void handleAssignCouncilMember("reviewer", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="">— Chưa phân công GVPB —</option>
                      {(dossier.instructors || [])
                        .filter((inst) => inst.id !== dossier.project.instructorId)
                        .map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                    </MarloSelect>
                  ) : (
                    <div className="font-bold text-slate-900 dark:text-white py-1">
                      {dossier.project.reviewerName || "Chưa phân công"}
                    </div>
                  )}
                </div>
              </div>

              {!safeUrl(dossier.package.demoUrl) && (
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/70 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <span>
                    Nhóm chưa điền Link Live Demo trong Hồ sơ Bảo vệ — sinh viên cần demo trực tiếp trên máy hoặc mở Repo/Kanban bên dưới.
                  </span>
                </div>
              )}

              {/* Quick action links */}
              <div className="flex items-center gap-2 flex-wrap">
                {safeUrl(dossier.package.demoUrl) ? (
                  <a
                    href={safeUrl(dossier.package.demoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-3.5 py-2 text-xs font-bold hover:opacity-90 transition"
                  >
                    <Globe size={13} />
                    <span>Mở Live Demo</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 px-3 py-2 text-xs font-semibold">
                    <Globe size={13} />
                    <span>Chưa có Live Demo</span>
                  </span>
                )}

                {safeUrl(dossier.package.slideUrl) && (
                  <a
                    href={safeUrl(dossier.package.slideUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <Link2 size={13} />
                    <span>Slide</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {safeUrl(dossier.package.reportUrl) && (
                  <a
                    href={safeUrl(dossier.package.reportUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <FileText size={13} />
                    <span>Báo cáo</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {safeUrl(dossier.package.videoUrl) && (
                  <a
                    href={safeUrl(dossier.package.videoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <Video size={13} />
                    <span>Video</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {safeUrl(dossier.project.repoUrl) && (
                  <a
                    href={safeUrl(dossier.project.repoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <FolderGit2 size={13} />
                    <span>GitHub Repo</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {onOpenProjectDetail && (
                  <button
                    type="button"
                    onClick={() => onOpenProjectDetail(dossier.project.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FileCode2 size={13} />
                    <span>Chi tiết Dự án</span>
                  </button>
                )}

                {onOpenKanban && (
                  <button
                    type="button"
                    onClick={() => onOpenKanban(dossier.project.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FolderKanban size={13} />
                    <span>Kanban</span>
                  </button>
                )}

                {onOpenGitHub && (
                  <button
                    type="button"
                    onClick={() => onOpenGitHub(dossier.project.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <GitBranch size={13} />
                    <span>Git Hub & Kiến trúc</span>
                  </button>
                )}
              </div>

              {/* Project Evidence KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Tasks hoàn thành</span>
                  <b className="block text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {dossier.project.doneTasks} / {dossier.project.totalTasks}
                  </b>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Story Points</span>
                  <b className="block text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {dossier.project.completedPoints} / {dossier.project.totalPoints} SP
                  </b>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Commits Git</span>
                  <b className="block text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {dossier.project.commitsCount} commits
                  </b>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Pull Requests</span>
                  <b className="block text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {dossier.project.prsCount} PRs
                  </b>
                </div>
              </div>

              {(dossier.package.architectureSummary || dossier.package.memberRolesSummary) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  {dossier.package.architectureSummary && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Tóm tắt Kiến trúc & Kịch bản Demo
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {dossier.package.architectureSummary}
                      </p>
                    </div>
                  )}
                  {dossier.package.memberRolesSummary && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Phân công Nhóm khai báo
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {dossier.package.memberRolesSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Bảng Đóng góp Anti-Freerider + Lịch sử Commit */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={15} className="text-amber-500" />
                  Đóng góp Thực tế Từng Thành viên (Anti-Freerider)
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dùng để hỏi đúng người · phát hiện thành viên làm ít
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dossier.memberMetrics.map((m) => (
                  <div
                    key={m.member_id}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <b className="text-slate-900 dark:text-white block truncate">{m.name}</b>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                        {m.contribution_pct}% · x{m.suggested_factor}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      <span>{m.completed_points}/{m.total_points} SP</span>
                      <span>·</span>
                      <span>{m.done_tasks}/{m.total_tasks} task</span>
                      <span>·</span>
                      <span>{m.commits_count} commits</span>
                    </div>
                    {m.top_tasks.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        {m.top_tasks.slice(0, 3).map((t) => (
                          <p key={t} className="truncate">• {t}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {dossier.recentCommits.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Commits Git gần nhất ({dossier.recentCommits.length})
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {dossier.recentCommits.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {c.sha.slice(0, 7)}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate">{c.message}</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">
                          {c.authorName} · {c.branch}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Trợ lý AI gợi ý câu hỏi cho Hội đồng */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" />
                    Trợ lý AI Soạn Câu hỏi Vấn đáp Trực tiếp cho Giảng viên
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    AI chỉ đóng vai trò đọc Kanban/Git/Demo để gợi ý câu hỏi kiểm chứng — Giảng viên trực tiếp hỏi và đánh giá.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateQuestions()}
                  disabled={loadingAI || !canGradeCouncil}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-3.5 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                  title={
                    canGradeCouncil
                      ? "Sinh câu hỏi gợi ý cho Hội đồng"
                      : "Chỉ GVHD, GVPB của đồ án hoặc Admin mới được sinh câu hỏi Hội đồng"
                  }
                >
                  {loadingAI ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{loadingAI ? "Đang phân tích hồ sơ..." : "Gợi ý câu hỏi theo từng thành viên"}</span>
                </button>
              </div>

              {councilAI && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Câu hỏi kiểm tra Sản phẩm Demo & Kiến trúc (chung cả nhóm):
                    </p>
                    {councilAI.projectProbes.map((pp, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3 text-xs space-y-1"
                      >
                        <span className="inline-block font-bold text-[11px] text-slate-600 dark:text-slate-300">
                          [{pp.category}]
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white">{pp.question}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cần kiểm chứng: {pp.whatToVerify}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Câu hỏi đích danh từng thành viên (chống ỷ lại):
                    </p>
                    {councilAI.memberProbes.map((mp) => (
                      <div
                        key={mp.memberId}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {mp.memberName} <span className="font-normal text-slate-500">({mp.memberRole} · {mp.contributionPct}%)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInjectQuestionToMember(mp.memberId, mp.question)}
                            className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            Đưa vào phiếu hỏi
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{mp.evidenceBasis}</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{mp.question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lịch sử luyện tập AI tham khảo */}
              {dossier.practiceSessions.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-500" />
                    Lịch sử Sinh viên Luyện tập AI trước bảo vệ (Chỉ tham khảo — không tính điểm)
                  </p>
                  <div className="space-y-1.5">
                    {dossier.practiceSessions.map((ps) => (
                      <div
                        key={ps.id}
                        className="flex items-center justify-between gap-2 text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ps.studentName} ({ps.studentCode}) · {ps.transcriptCount} lượt trao đổi
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          Readiness: {ps.readinessScore ?? "—"}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN (5 cols): PHIẾU CHẤM ĐIỂM HỘI ĐỒNG TRỰC TIẾP ─── */}
          <div className="xl:col-span-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders size={15} className="text-amber-500" />
                  Phiếu Chấm Hội đồng Trực tiếp
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chấm sau khi xem nhóm chạy Demo & trả lời phản biện trên lớp.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Điểm Nhóm</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {groupScore.toFixed(2)}<span className="text-xs font-semibold text-slate-400">/10</span>
                </span>
              </div>
            </div>

            {!canGradeCouncil && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 px-3.5 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <Lock size={15} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <b className="block text-slate-900 dark:text-white">
                    Chế độ Chỉ xem (Quy chế Chấm Đồ án Hướng 2)
                  </b>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    Chỉ <b>GV Hướng dẫn ({dossier.project.instructorName || "—"})</b>,{" "}
                    <b>GV Phản biện ({dossier.project.reviewerName || "chưa gán"})</b> hoặc{" "}
                    <b>Quản trị viên</b> mới có quyền chấm điểm trên biên bản chính thức của đồ án này.
                  </span>
                </div>
              </div>
            )}

            {/* Checkboxes xác nhận kiểm tra trực tiếp */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={demoVerified}
                  onChange={(e) => setDemoVerified(e.target.checked)}
                  className="accent-slate-900 dark:accent-white"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Đã xem Demo chạy</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repoVerified}
                  onChange={(e) => setRepoVerified(e.target.checked)}
                  className="accent-slate-900 dark:accent-white"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Đã soi Repo Git</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frozenVerified}
                  onChange={(e) => setFrozenVerified(e.target.checked)}
                  className="accent-slate-900 dark:accent-white"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Xác nhận Freeze</span>
              </label>
            </div>

            {/* 4 Criteria Sliders */}
            <div className="space-y-3.5 text-xs">
              {[
                {
                  label: "1. Demo Sản phẩm Trực tiếp & Chức năng",
                  weight: "35%",
                  val: demoScore,
                  setVal: setDemoScore,
                  desc: "Chạy mượt luồng chính end-to-end, dữ liệu lưu thật dưới DB, xử lý lỗi biên tốt.",
                },
                {
                  label: "2. Kiến trúc Hệ thống & Chất lượng Code",
                  weight: "25%",
                  val: archScore,
                  setVal: setArchScore,
                  desc: "Phân tầng rõ ràng, API/CSDL chuẩn 3NF, bảo mật RBAC/JWT.",
                },
                {
                  label: "3. Quy trình Scrum / Kanban & Git",
                  weight: "15%",
                  val: processScore,
                  setVal: setProcessScore,
                  desc: "Tỷ lệ Story Points, tiêu chí DoD và lịch sử commit Git đều đặn.",
                },
                {
                  label: "4. Trả lời Phản biện Trực tiếp (Q&A)",
                  weight: "25%",
                  val: defenseScore,
                  setVal: setDefenseScore,
                  desc: "Hiểu sâu mã nguồn mình viết, phản biện thuyết phục trước Hội đồng.",
                },
              ].map((crit) => (
                <div key={crit.label} className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">{crit.label}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      {crit.val.toFixed(1)}/10 <span className="text-[10px] text-slate-500">({crit.weight})</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{crit.desc}</p>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={crit.val}
                    onChange={(e) => crit.setVal(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Kết luận & Tên Hội đồng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kết luận Hội đồng
                </label>
                <MarloSelect
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="pass">Đạt — Nghiệm thu</option>
                  <option value="pass_with_revisions">Đạt — Cần sửa nhẹ</option>
                  <option value="fail">Chưa đạt — Bảo vệ lại</option>
                </MarloSelect>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thành viên Hội đồng chấm
                </label>
                <input
                  type="text"
                  value={councilMembers}
                  onChange={(e) => setCouncilMembers(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Điểm & ghi chú riêng từng thành viên */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Điểm Cá nhân & Ghi chú Q&A ({dossier.memberMetrics.length} SV)
                </span>
                <button
                  type="button"
                  onClick={handleRecalcMemberScores}
                  className="text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:underline cursor-pointer"
                >
                  Tính lại theo hệ số Anti-Freerider
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {dossier.memberMetrics.map((m) => {
                  const draft = memberDrafts[m.member_id] || {
                    member_id: m.member_id,
                    name: m.name,
                    role: m.role,
                    contribution_pct: m.contribution_pct,
                    suggested_factor: m.suggested_factor,
                    individual_score: groupScore,
                    asked_question: "",
                    live_qa_note: "",
                  };
                  return (
                    <div
                      key={m.member_id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <b className="text-slate-900 dark:text-white block truncate">{m.name}</b>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                            {m.contribution_pct}% SP · x{m.suggested_factor}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={draft.individual_score}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(10, roundToOne(parseFloat(e.target.value) || 0)));
                              setMemberDrafts((prev) => ({
                                ...prev,
                                [m.member_id]: { ...draft, individual_score: val },
                              }));
                            }}
                            className="w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-center font-mono font-bold text-xs text-slate-900 dark:text-white"
                          />
                          <span className="text-[11px] text-slate-400">/10</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={draft.asked_question || ""}
                        onChange={(e) =>
                          setMemberDrafts((prev) => ({
                            ...prev,
                            [m.member_id]: { ...draft, asked_question: e.target.value },
                          }))
                        }
                        placeholder="Câu hỏi Hội đồng đã hỏi trực tiếp..."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={draft.live_qa_note || ""}
                        onChange={(e) =>
                          setMemberDrafts((prev) => ({
                            ...prev,
                            [m.member_id]: { ...draft, live_qa_note: e.target.value },
                          }))
                        }
                        placeholder="Đánh giá câu trả lời Q&A (tự tin, hiểu rõ file code, trả lời đúng trọng tâm)..."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nhận xét chung */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nhận xét chung của Hội đồng & Điểm cần khắc phục
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => void handleSubmitGrade()}
                disabled={submitting || !canGradeCouncil}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2.5 text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title={
                  canGradeCouncil
                    ? "Chốt biên bản chấm Hội đồng"
                    : "Bạn không thuộc Hội đồng chấm (GVHD/GVPB) của đồ án này"
                }
              >
                {submitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : !canGradeCouncil ? (
                  <Lock size={14} />
                ) : (
                  <Award size={14} />
                )}
                <span>
                  {submitting
                    ? "Đang lưu biên bản..."
                    : !canGradeCouncil
                    ? "Khóa chấm điểm (Ngoài Hội đồng)"
                    : "Chốt Biên bản & Công bố Điểm"}
                </span>
              </button>

              <button
                type="button"
                disabled={!dossier.officialEvaluation && !canGradeCouncil}
                onClick={handlePrintMinutes}
                title={
                  !dossier.officialEvaluation && !canGradeCouncil
                    ? "Đồ án chưa được Hội đồng chấm điểm chính thức nên chưa có biên bản để in."
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={14} />
                <span>{dossier.officialEvaluation ? "In Biên bản Chính thức" : "In Phiếu Chấm Nháp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

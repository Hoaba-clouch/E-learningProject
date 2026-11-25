import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
  Layers,
  Link2,
  Lock,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import {
  saveDefensePackageApi,
  type DefensePackageData,
  type DefenseProjectDossier,
  type SessionRole,
} from "../../api";

interface Props {
  dossier: DefenseProjectDossier | null;
  role?: SessionRole;
  practiceCount?: number;
  alwaysExpanded?: boolean;
  onSaved?: (nextDossier: DefenseProjectDossier) => void;
  onNotify?: (msg: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
  onGoToPractice?: () => void;
}

function safeUrl(url?: string): string | null {
  const s = (url || "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

export default function DefensePackagePanel({
  dossier,
  role = "student",
  practiceCount = 0,
  alwaysExpanded = false,
  onSaved,
  onNotify,
  onOpenProjectDetail,
  onGoToPractice,
}: Props) {
  const [form, setForm] = useState<DefensePackageData>({
    demoUrl: "",
    slideUrl: "",
    reportUrl: "",
    videoUrl: "",
    repoUrl: "",
    architectureSummary: "",
    memberRolesSummary: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!dossier) return;
    setForm({
      demoUrl: dossier.package.demoUrl || "",
      slideUrl: dossier.package.slideUrl || "",
      reportUrl: dossier.package.reportUrl || "",
      videoUrl: dossier.package.videoUrl || "",
      repoUrl: dossier.package.repoUrl || dossier.project.repoUrl || "",
      architectureSummary: dossier.package.architectureSummary || "",
      memberRolesSummary: dossier.package.memberRolesSummary || "",
    });
    setErrorMsg(null);
  }, [dossier?.project.id, dossier?.package.updatedAt]);

  if (!dossier) return null;

  const { project } = dossier;
  const isFormOpen = alwaysExpanded ? true : expanded;
  const isReadOnly = role === "student" && project.canEditPackage === false;
  const hasDemo = Boolean(safeUrl(form.demoUrl));
  const hasDocs = Boolean(safeUrl(form.slideUrl) || safeUrl(form.reportUrl));
  const hasRepo = Boolean(safeUrl(form.repoUrl));
  const hasPracticed = practiceCount > 0 || dossier.practiceSessions.length > 0;

  const checklist = [
    { label: "Link Live Demo", ok: hasDemo },
    { label: "Slide / Báo cáo", ok: hasDocs },
    { label: "GitHub Repo", ok: hasRepo },
    { label: "Đóng băng nộp bài (Freeze)", ok: project.isFrozen },
    { label: "Đã tập Phản biện AI", ok: hasPracticed },
  ];

  const readyCount = checklist.filter((c) => c.ok).length;
  const fieldInputCls =
    "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 px-3.5 py-2.5 text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500 disabled:opacity-70 disabled:cursor-not-allowed transition";
  const openLinkCls =
    "inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isReadOnly) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      const res = await saveDefensePackageApi(project.id, form, role);
      onSaved?.(res.dossier);
      onNotify?.(`✓ Đã lưu Hồ sơ Bảo vệ cho đồ án ${project.code}. Hội đồng có thể mở trực tiếp khi chấm.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể lưu Hồ sơ Bảo vệ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Hồ sơ Chuẩn bị Bảo vệ Đồ án
              </h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                {project.code}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  readyCount === checklist.length
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                Hoàn thiện {readyCount}/{checklist.length} mục
              </span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1">
              Nộp link sản phẩm Demo, Slide, Báo cáo & tóm tắt kiến trúc để Hội đồng mở kiểm tra trực tiếp trong buổi bảo vệ trên lớp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {role === "student" && onOpenProjectDetail && (
            <button
              type="button"
              onClick={() => onOpenProjectDetail(project.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ExternalLink size={14} className="text-sky-600 dark:text-sky-400" />
              <span>Xem chi tiết dự án</span>
            </button>
          )}
          {role !== "student" && onOpenProjectDetail && !project.isFrozen && (
            <button
              type="button"
              onClick={() => onOpenProjectDetail(project.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Lock size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Đóng băng dự án</span>
            </button>
          )}
          {onGoToPractice && (
            <button
              type="button"
              onClick={onGoToPractice}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-xs transition cursor-pointer"
            >
              <span>Sang Luyện tập AI</span>
              <ArrowRight size={13} />
            </button>
          )}
          {!alwaysExpanded && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <span>{expanded ? "Thu gọn hồ sơ" : "Mở biểu mẫu nộp"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Checklist Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {checklist.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              c.ok
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300"
                : "bg-slate-50 dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {c.ok ? (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            ) : (
              <Circle size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            <span>{c.label}</span>
          </span>
        ))}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isReadOnly && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>
                {project.editPackageBlockReason ||
                  "Hồ sơ Bảo vệ đang ở chế độ chỉ đọc."}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between gap-2 flex-wrap text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 inline-flex items-center justify-center shrink-0">
                    <Globe size={15} />
                  </span>
                  <span>Link Live Demo (Vercel / Web App)</span>
                </span>
                {safeUrl(form.demoUrl) && (
                  <a
                    href={safeUrl(form.demoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className={openLinkCls}
                  >
                    Mở thử <ExternalLink size={12} />
                  </a>
                )}
              </label>
              <input
                type="url"
                disabled={isReadOnly}
                value={form.demoUrl}
                onChange={(e) => setForm((p) => ({ ...p, demoUrl: e.target.value }))}
                placeholder="https://codemind-campus.vercel.app"
                className={fieldInputCls}
              />
            </div>

            <div>
              <label className="flex items-center justify-between gap-2 flex-wrap text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 inline-flex items-center justify-center shrink-0">
                    <FolderGit2 size={15} />
                  </span>
                  <span>Link GitHub Repository</span>
                </span>
                {safeUrl(form.repoUrl) && (
                  <a
                    href={safeUrl(form.repoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className={openLinkCls}
                  >
                    Mở Repo <ExternalLink size={12} />
                  </a>
                )}
              </label>
              <input
                type="url"
                disabled={isReadOnly}
                value={form.repoUrl}
                onChange={(e) => setForm((p) => ({ ...p, repoUrl: e.target.value }))}
                placeholder="https://github.com/team/project-repo"
                className={fieldInputCls}
              />
            </div>

            <div>
              <label className="flex items-center justify-between gap-2 flex-wrap text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 inline-flex items-center justify-center shrink-0">
                    <Link2 size={15} />
                  </span>
                  <span>Link Slide Thuyết trình (Canva / Google Slides)</span>
                </span>
                {safeUrl(form.slideUrl) && (
                  <a
                    href={safeUrl(form.slideUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className={openLinkCls}
                  >
                    Mở Slide <ExternalLink size={12} />
                  </a>
                )}
              </label>
              <input
                type="url"
                disabled={isReadOnly}
                value={form.slideUrl}
                onChange={(e) => setForm((p) => ({ ...p, slideUrl: e.target.value }))}
                placeholder="https://docs.google.com/presentation/..."
                className={fieldInputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="flex items-center justify-between gap-2 flex-wrap text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center shrink-0">
                      <FileText size={15} />
                    </span>
                    <span>Link Báo cáo Đồ án (PDF)</span>
                  </span>
                  {safeUrl(form.reportUrl) && (
                    <a
                      href={safeUrl(form.reportUrl)!}
                      target="_blank"
                      rel="noreferrer"
                      className={openLinkCls}
                    >
                      Mở PDF <ExternalLink size={12} />
                    </a>
                  )}
                </label>
                <input
                  type="url"
                  disabled={isReadOnly}
                  value={form.reportUrl}
                  onChange={(e) => setForm((p) => ({ ...p, reportUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className={fieldInputCls}
                />
              </div>
              <div>
                <label className="flex items-center justify-between gap-2 flex-wrap text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 inline-flex items-center justify-center shrink-0">
                      <Video size={15} />
                    </span>
                    <span>Link Video Demo (dự phòng)</span>
                  </span>
                  {safeUrl(form.videoUrl) && (
                    <a
                      href={safeUrl(form.videoUrl)!}
                      target="_blank"
                      rel="noreferrer"
                      className={openLinkCls}
                    >
                      Mở Video <ExternalLink size={12} />
                    </a>
                  )}
                </label>
                <input
                  type="url"
                  disabled={isReadOnly}
                  value={form.videoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://youtu.be/..."
                  className={fieldInputCls}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                <span className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 inline-flex items-center justify-center shrink-0">
                  <Layers size={15} />
                </span>
                <span>Tóm tắt Kiến trúc & Kịch bản Demo chính</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={form.architectureSummary}
                onChange={(e) => setForm((p) => ({ ...p, architectureSummary: e.target.value }))}
                placeholder="Ví dụ: Kiến trúc 3 tầng FastAPI + MySQL 8.0 + React 19. Demo trực tiếp luồng đăng ký chờ duyệt, Kanban DnD, Docker Sandbox và Hội đồng chấm điểm..."
                className={fieldInputCls}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center shrink-0">
                  <Users size={15} />
                </span>
                <span>Khai báo Phân công Thành viên (để Hội đồng hỏi đúng người)</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={form.memberRolesSummary}
                onChange={(e) => setForm((p) => ({ ...p, memberRolesSummary: e.target.value }))}
                placeholder="Ví dụ: Hòa (Nhóm trưởng · Frontend + AI RAG), Huy (Auth RBAC + Biểu đồ Analytics), Nghị (Backend MySQL + Docker Sandbox)..."
                className={fieldInputCls}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {dossier.package.updatedAt
                ? `Cập nhật gần nhất bởi ${dossier.package.submittedByName || "thành viên"}`
                : "Chưa lưu hồ sơ bảo vệ trên máy chủ."}
            </span>
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Lock size={12} />
                <span>Chế độ chỉ xem</span>
              </span>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4.5 py-2.5 text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-400 dark:text-emerald-600" />
                )}
                <span>{saving ? "Đang lưu..." : "Lưu Hồ sơ Bảo vệ"}</span>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
  Link2,
  Lock,
  RefreshCw,
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
  onSaved?: (nextDossier: DefenseProjectDossier) => void;
  onNotify?: (msg: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
}

function safeUrl(url?: string): string | null {
  const s = (url || "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

export default function DefensePackagePanel({
  dossier,
  role = "student",
  practiceCount = 0,
  onSaved,
  onNotify,
  onOpenProjectDetail,
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <FileText size={13} className="text-amber-500" />
              Hồ sơ Chuẩn bị Bảo vệ Đồ án
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              {project.code}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Hoàn thiện {readyCount}/{checklist.length} mục
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Nộp link sản phẩm Demo, Slide, Báo cáo & tóm tắt kiến trúc để Hội đồng mở kiểm tra trực tiếp trong buổi bảo vệ trên lớp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {role !== "student" && onOpenProjectDetail && !project.isFrozen && (
            <button
              type="button"
              onClick={() => onOpenProjectDetail(project.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Lock size={13} className="text-slate-500" />
              <span>Đóng băng dự án</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <span>{expanded ? "Thu gọn hồ sơ" : "Mở biểu mẫu nộp"}</span>
          </button>
        </div>
      </div>

      {/* Checklist Chips (Flat neutral surfaces) */}
      <div className="flex items-center gap-2 flex-wrap">
        {checklist.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                c.ok ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
              }`}
            />
            <span>{c.label}</span>
          </span>
        ))}
      </div>

      {expanded && (
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          {errorMsg && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={13} className="text-amber-500" />
                  Link Live Demo (Vercel / Web App)
                </span>
                {safeUrl(form.demoUrl) && (
                  <a
                    href={safeUrl(form.demoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                  >
                    Mở thử <ExternalLink size={11} />
                  </a>
                )}
              </label>
              <input
                type="url"
                value={form.demoUrl}
                onChange={(e) => setForm((p) => ({ ...p, demoUrl: e.target.value }))}
                placeholder="https://codemind-campus.vercel.app"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <FolderGit2 size={13} className="text-slate-500" />
                  Link GitHub Repository
                </span>
                {safeUrl(form.repoUrl) && (
                  <a
                    href={safeUrl(form.repoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                  >
                    Mở Repo <ExternalLink size={11} />
                  </a>
                )}
              </label>
              <input
                type="url"
                value={form.repoUrl}
                onChange={(e) => setForm((p) => ({ ...p, repoUrl: e.target.value }))}
                placeholder="https://github.com/team/project-repo"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Link2 size={13} className="text-slate-500" />
                  Link Slide Thuyết trình (Canva / Google Slides)
                </span>
                {safeUrl(form.slideUrl) && (
                  <a
                    href={safeUrl(form.slideUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                  >
                    Mở Slide <ExternalLink size={11} />
                  </a>
                )}
              </label>
              <input
                type="url"
                value={form.slideUrl}
                onChange={(e) => setForm((p) => ({ ...p, slideUrl: e.target.value }))}
                placeholder="https://docs.google.com/presentation/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <FileText size={13} className="text-slate-500" />
                  Link Báo cáo Đồ án (PDF)
                </label>
                <input
                  type="url"
                  value={form.reportUrl}
                  onChange={(e) => setForm((p) => ({ ...p, reportUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Video size={13} className="text-slate-500" />
                  Link Video Demo (dự phòng)
                </label>
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://youtu.be/..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tóm tắt Kiến trúc & Kịch bản Demo chính
              </label>
              <textarea
                rows={3}
                value={form.architectureSummary}
                onChange={(e) => setForm((p) => ({ ...p, architectureSummary: e.target.value }))}
                placeholder="Ví dụ: Kiến trúc 3 tầng FastAPI + MySQL 8.0 + React 19. Demo trực tiếp luồng đăng ký chờ duyệt, Kanban DnD, Docker Sandbox và Hội đồng chấm điểm..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Khai báo Phân công Thành viên (để Hội đồng hỏi đúng người)
              </label>
              <textarea
                rows={3}
                value={form.memberRolesSummary}
                onChange={(e) => setForm((p) => ({ ...p, memberRolesSummary: e.target.value }))}
                placeholder="Ví dụ: Hòa (Nhóm trưởng · Frontend + AI RAG), Huy (Auth RBAC + Biểu đồ Analytics), Nghị (Backend MySQL + Docker Sandbox)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {dossier.package.updatedAt
                ? `Cập nhật gần nhất bởi ${dossier.package.submittedByName || "thành viên"}`
                : "Chưa lưu hồ sơ bảo vệ trên máy chủ."}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
            >
              {saving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              <span>{saving ? "Đang lưu..." : "Lưu Hồ sơ Bảo vệ"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

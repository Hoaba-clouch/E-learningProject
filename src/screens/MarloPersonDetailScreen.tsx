import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  FolderKanban,
  GitFork,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import gsap from "gsap";
import MarloNumber from "../components/MarloNumber";
import MarloSelect from "../components/MarloSelect";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import {
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_PROJECT_STATUS,
  MARLO_TASK_STATUS,
  MARLO_HUES,
} from "../marlo-engine/marloData";
import {
  createWorkspaceTaskApi,
  fetchTeamMembersApi,
  getStoredUser,
  updateTeamMemberStatusApi,
  type TeamMemberRecord,
} from "../api";
import { DEFAULT_TEAM_MEMBER_RECORDS } from "../data/defaultTeamMembers";
import "../marlo-engine/marloStyles.css";

interface Props {
  personId?: string;
  role?: "student" | "instructor" | "admin";
  onNavigateBack: () => void;
  onEditMyProfile?: () => void;
  onNavigateToProject: (projectId: string) => void;
}

export default function MarloPersonDetailScreen({
  personId = "",
  role = "student",
  onNavigateBack,
  onEditMyProfile,
  onNavigateToProject,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignProjectId, setAssignProjectId] = useState("prj-codemind");
  const [assignEst, setAssignEst] = useState(8);
  const [assignPriority, setAssignPriority] = useState<"high" | "medium" | "low">("high");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const loadMembers = async () => {
    try {
      const bundle = await fetchTeamMembersApi(role);
      if (bundle && Array.isArray(bundle.members)) {
        setMembers(bundle.members);
      } else if (bundle === null) {
        setMembers(DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06"));
      }
    } catch {
      setMembers(DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06"));
    }
  };

  // Background non-blocking sync
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTeamMembersApi(role)
      .then((bundle) => {
        if (!active) return;
        if (bundle && Array.isArray(bundle.members)) {
          setMembers(bundle.members);
        } else if (bundle === null) {
          setMembers(DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06"));
        }
      })
      .catch(() => {
        if (!active) return;
        setMembers(DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleSync = () => {
      if (!active) return;
      void fetchTeamMembersApi(role).then((bundle) => {
        if (active && bundle && Array.isArray(bundle.members)) {
          setMembers(bundle.members);
        }
      });
    };
    window.addEventListener("codemind-auth-updated", handleSync);
    window.addEventListener("codemind-marlo-data-changed", handleSync);
    return () => {
      active = false;
      window.removeEventListener("codemind-auth-updated", handleSync);
      window.removeEventListener("codemind-marlo-data-changed", handleSync);
    };
  }, [role]);

  const normPerson = personId.trim().toLowerCase();
  const member = normPerson
    ? members.find(
        (m) =>
          m.id === personId ||
          m.email.toLowerCase() === normPerson ||
          m.name.toLowerCase().includes(normPerson)
      ) || null
    : members[0] || null;

  useEffect(() => {
    if (member?.projects?.[0]?.id) {
      setAssignProjectId(member.projects[0].id);
    }
  }, [member?.id]);

  const storedSelf = getStoredUser(role);
  const isSelf = Boolean(
    member &&
      storedSelf &&
      (member.id === storedSelf.id ||
        member.email.toLowerCase() === String(storedSelf.email || "").toLowerCase())
  );
  const canChangeMemberStatus = Boolean(isSelf || role === "admin");

  const handleCycleStatus = async () => {
    if (!member) return;
    if (!canChangeMemberStatus) {
      showToast("⚠️ Bạn chỉ có thể đổi trạng thái hiện diện của chính mình.");
      return;
    }
    const statuses: ("in" | "remote" | "off")[] = ["in", "remote", "off"];
    const nextStatus = statuses[(statuses.indexOf(member.status) + 1) % statuses.length];
    try {
      await updateTeamMemberStatusApi(member.id, nextStatus, role);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m))
      );
      window.dispatchEvent(new Event("codemind-marlo-data-changed"));
      showToast(`✓ Đã lưu trạng thái ${member.name}: "${MARLO_MEMBER_STATUS_LABEL[nextStatus]}"`);
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái thành viên.");
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !assignTitle.trim()) return;
    if (member.isAdvisor) {
      showToast("⚠️ Không thể giao công việc sinh viên cho Giảng viên / Hội đồng Khảo thí.");
      return;
    }

    const res = await createWorkspaceTaskApi(assignProjectId, {
      code: `TSK-${Math.floor(Math.random() * 899 + 100)}`,
      title: assignTitle.trim(),
      description: `${assignTitle.trim()} — Giao trực tiếp cho ${member.name}.`,
      column: "ready",
      priority: assignPriority,
      moscow: assignPriority === "high" ? "must" : "should",
      points: Math.max(1, Math.min(21, Number(assignEst) || 5)),
      assignee: {
        name: member.name,
        avatar: member.name.charAt(0).toUpperCase(),
        role: member.role,
      },
      estimateHours: (Number(assignEst) || 5) * 2,
      dueDate: "15/12/2026",
      epic: "Sprint Goal",
    });

    if (res) {
      await loadMembers();
      window.dispatchEvent(new Event("codemind-nav-updated"));
      showToast(`✓ Đã giao công việc mới cho ${member.name} và lưu xuống MySQL!`);
    } else {
      showToast("Không thể giao việc mới lên server.");
    }
    setAssignTitle("");
    setIsAssignModalOpen(false);
  };

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (ZERO DOUBLE-OPACITY FADE) ───
  useMarloPageEntrance(
    containerRef,
    (el) => {
      if (!member) return;
      const backlinks = el.querySelectorAll(".backlink");
      if (backlinks.length > 0) {
        gsap.fromTo(
          backlinks,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.45, ease: "expo.out", clearProps: "transform,opacity" }
        );
      }

      const cards = el.querySelectorAll(".card, .prof__head");
      if (cards.length > 0) {
        animateMarloCards(cards, { y: 24, stagger: 0.05, duration: 0.72 });
      }

      const rows = el.querySelectorAll(".prow, .marlo-row");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 10, stagger: 0.03, delay: 0.24, duration: 0.55 });
      }
    },
    [member?.id]
  );

  if (!member) {
    return (
      <div
        ref={containerRef}
        className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
      >
        <div className="max-w-[1560px] mx-auto prof">
          <button
            type="button"
            onClick={onNavigateBack}
            className="backlink cursor-pointer"
            title="Quay lại danh sách Team"
          >
            <ChevronLeft size={16} />
            <span>Danh sách Team & Chuyên gia</span>
          </button>
          <section className="card text-center py-12 mt-4">
            <b className="text-base font-semibold block text-slate-700 dark:text-slate-300">
              {loading
                ? "Đang tải hồ sơ thành viên..."
                : "Không tìm thấy thành viên trong phạm vi đội ngũ của bạn"}
            </b>
            {!loading && (
              <p className="text-xs text-slate-500 mt-1.5">
                Hồ sơ này có thể thuộc nhóm khác hoặc không còn hoạt động trong hệ thống.
              </p>
            )}
          </section>
        </div>
      </div>
    );
  }

  const hue = MARLO_HUES[member.hue] || { bg: "#f7d593", text: "#633806" };
  const taughtCourses = member.taughtCourses || [];
  const totalTaughtStudents = taughtCourses.reduce(
    (sum, c) => sum + (Number(c.studentCount) || 0),
    0
  );
  const learningSummary = member.learningSummary || null;

  const sharedBioAndSkillsCard = (
    <section className="card space-y-4">
      <div className="chead flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Briefcase size={16} />
          </div>
          <div className="chead__text min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Giới thiệu &amp; Chuyên môn
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Đồng bộ từ Hồ sơ cá nhân</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {member.department || member.role}
            </p>
          </div>
        </div>
        {isSelf && onEditMyProfile && (
          <button
            type="button"
            onClick={onEditMyProfile}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Pencil size={11} className="text-amber-500" />
            <span>Cập nhật hồ sơ</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 p-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {member.bio ? (
          <p>{member.bio}</p>
        ) : (
          <p className="italic text-slate-400">
            Thành viên chưa cập nhật đoạn giới thiệu chuyên môn.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
        {member.department && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2">
            <Building2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Khoa / Bộ môn / Lớp
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {member.department}
              </div>
            </div>
          </div>
        )}

        {member.officeLocation && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2">
            <MapPin size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phòng Lab / Lịch tiếp
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {member.officeLocation}
              </div>
            </div>
          </div>
        )}

        {member.phone && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2">
            <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Điện thoại liên hệ
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {member.phone}
              </div>
            </div>
          </div>
        )}

        {(member.githubUrl || member.websiteUrl) && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2">
            <GitFork size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Liên kết trực tuyến
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-0.5">
                {member.githubUrl && (
                  <a
                    href={member.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 hover:underline truncate max-w-[170px]"
                  >
                    <span className="truncate">GitHub</span>
                    <ExternalLink size={11} />
                  </a>
                )}
                {member.websiteUrl && (
                  <a
                    href={member.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 hover:underline truncate max-w-[170px]"
                  >
                    <Globe size={11} />
                    <span className="truncate">Portfolio / Web</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const heroStats = member.isAdvisor
    ? [
        {
          label: "Đồ án HD",
          value: member.projects.length,
          durationMs: 750,
          icon: <FolderKanban size={16} className="text-indigo-600 dark:text-indigo-400" />,
          iconBg: "bg-indigo-500/12",
        },
        {
          label: "Học phần",
          value: taughtCourses.length,
          durationMs: 850,
          icon: <BookOpen size={16} className="text-sky-600 dark:text-sky-400" />,
          iconBg: "bg-sky-500/12",
        },
        {
          label: "Sinh viên",
          value: totalTaughtStudents,
          durationMs: 1000,
          icon: <Users size={16} className="text-emerald-600 dark:text-emerald-400" />,
          iconBg: "bg-emerald-500/12",
        },
      ]
    : [
        {
          label: "Đồ án",
          value: member.projects.length,
          durationMs: 700,
          icon: <FolderKanban size={16} className="text-indigo-600 dark:text-indigo-400" />,
          iconBg: "bg-indigo-500/12",
        },
        {
          label: "Task mở",
          value: member.openTasks.length,
          durationMs: 750,
          icon: <Clock size={16} className="text-sky-600 dark:text-sky-400" />,
          iconBg: "bg-sky-500/12",
        },
        {
          label: "Hoàn thành",
          value: member.doneTasksCount,
          durationMs: 850,
          icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />,
          iconBg: "bg-emerald-500/12",
        },
        ...(learningSummary
          ? [
              {
                label: "XP tích lũy",
                value: learningSummary.expPoints,
                durationMs: 1050,
                icon: <Star size={16} className="fill-amber-500 text-amber-500" />,
                iconBg: "bg-amber-500/12",
              },
            ]
          : []),
      ];

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-xl border border-slate-700 dark:border-slate-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#f29b23]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="max-w-[1560px] mx-auto prof">
        <button
          type="button"
          onClick={onNavigateBack}
          className="backlink cursor-pointer"
          title="Quay lại danh sách Team"
        >
          <ChevronLeft size={16} />
          <span>Danh sách Team &amp; Chuyên gia</span>
        </button>

        <section className="card mb-6 flex flex-col gap-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
              <div className="relative flex-none">
            <div
              className="av av--xl font-bold shadow-sm text-xl overflow-hidden"
              style={member.avatarUrl ? undefined : { background: hue.bg, color: hue.text }}
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                member.initials
              )}
            </div>
            {member.status === "in" && (
              <span className="av__dot w-3.5 h-3.5" title="Đang có mặt tại phòng Lab" />
            )}
          </div>

          <div className="prof__who min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {member.name}
              </h1>
              {member.isLead && !member.isAdvisor && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold shrink-0">
                  <Crown size={12} className="fill-amber-500 text-amber-500" />
                  <span>Nhóm trưởng</span>
                </span>
              )}
              {member.isAdvisor && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>GVHD</span>
                </span>
              )}
              {isSelf && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-bold shrink-0">
                  Bạn
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
              {member.headline || member.role} · Mã: {member.code}
              {member.department ? ` · ${member.department}` : ""}
            </p>
            <div className="flex items-center gap-x-4 gap-y-1.5 mt-2 flex-wrap">
              <a
                href={`mailto:${member.email}`}
                className="linkbtn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Mail size={13} />
                <span>{member.email}</span>
              </a>
              {member.phone && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{member.phone}</span>
                </span>
              )}
              {member.githubUrl && (
                <a
                  href={member.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                >
                  <GitFork size={13} />
                  <span>{member.githubUrl.replace(/^https?:\/\//i, "")}</span>
                </a>
              )}
              {member.websiteUrl && (
                <a
                  href={member.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                >
                  <Globe size={13} />
                  <span>{member.websiteUrl.replace(/^https?:\/\//i, "")}</span>
                </a>
              )}
            </div>
          </div>
            </div>

            <div
              className={`grid ${
                heroStats.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-4"
              } gap-2.5 shrink-0 w-full xl:w-auto`}
            >
              {heroStats.map((stat) => (
                <div
                  key={`${member.id}-${stat.label}`}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 px-3.5 py-3 text-center min-w-[88px] transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                >
                  <div
                    className={`mx-auto mb-1.5 w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center`}
                  >
                    {stat.icon}
                  </div>
                  <div className="text-[15px] font-black text-slate-950 dark:text-white leading-tight tabular-nums">
                    <MarloNumber value={stat.value} durationMs={stat.durationMs} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="prof__actions flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12]">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-auto">
              Hoạt động gần nhất: <strong className="text-slate-700 dark:text-slate-200">{member.lastActive}</strong>
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              {isSelf && onEditMyProfile && (
                <button
                  type="button"
                  onClick={onEditMyProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                >
                  <Pencil size={13} className="text-amber-500" />
                  <span>Chỉnh sửa Hồ sơ của tôi</span>
                </button>
              )}

              {canChangeMemberStatus ? (
                <button
                  type="button"
                  onClick={() => void handleCycleStatus()}
                  className="btn flex items-center gap-2 cursor-pointer"
                  title="Nhấp để đổi trạng thái làm việc (Tại Lab / Làm từ xa / Nghỉ phép)"
                >
                  <RefreshCw size={14} className="text-slate-500 dark:text-slate-400" />
                  <span className={`pill pill--${MARLO_MEMBER_STATUS_TONE[member.status]} text-xs`}>
                    {MARLO_MEMBER_STATUS_LABEL[member.status]}
                  </span>
                </button>
              ) : (
                <span
                  className={`pill pill--${MARLO_MEMBER_STATUS_TONE[member.status]} text-xs`}
                  title="Trạng thái làm việc hiện tại của thành viên"
                >
                  {MARLO_MEMBER_STATUS_LABEL[member.status]}
                </span>
              )}

              {!member.isAdvisor && role !== "admin" && (
                <button
                  type="button"
                  className="btn btn--primary flex items-center gap-2 cursor-pointer"
                  onClick={() => setIsAssignModalOpen(true)}
                  title="Giao công việc mới cho thành viên này"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Giao việc kỹ thuật</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="prof__grid grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 min-w-0">
            {sharedBioAndSkillsCard}

            {member.isAdvisor ? (
              <section className="card space-y-3">
                <div className="chead flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="chead__text">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Học phần đang giảng dạy
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {taughtCourses.length} môn học · Tổng {totalTaughtStudents} sinh viên theo học
                      </p>
                    </div>
                  </div>
                </div>

                {taughtCourses.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Chưa có học phần nào được gán cho giảng viên này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {taughtCourses.map((c) => (
                      <div
                        key={c.id}
                        className="prow rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/45 p-3.5 flex flex-col items-stretch justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {c.code}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{c.credits} TC · {c.health}</span>
                          </span>
                        </div>
                        <b className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {c.name}
                        </b>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>{c.semester}</span>
                          <span>· {c.room}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            · {c.studentCount} SV
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="card">
                <div className="chead flex items-center justify-between mb-4">
                  <div className="chead__text">
                    <h2 className="text-lg font-bold">Công việc đang phụ trách</h2>
                    <p className="text-xs text-slate-500">
                      {member.openTasks.length} task đang mở ({member.totalEstimateHours}h ước tính)
                    </p>
                  </div>
                </div>

                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {member.openTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Không có công việc nào đang chờ xử lý.
                    </div>
                  ) : (
                    member.openTasks.map((t) => {
                      const statusLbl = (MARLO_TASK_STATUS as any)[t.column] || t.column;
                      return (
                        <div
                          key={t.id}
                          onClick={() => onNavigateToProject(t.projectId)}
                          data-lift={true}
                          className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                        >
                          <div className="cell__text min-w-0 flex-1">
                            <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                              {t.code ? `${t.code}: ` : ""}{t.title}
                            </b>
                            <small className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                              {t.projectName} · Ưu tiên: {t.priority === "high" ? "Cao" : t.priority === "low" ? "Thấp" : "Trung bình"}
                            </small>
                          </div>

                          <div className="flex items-center gap-2 flex-none">
                            <span
                              className={`pill ${
                                t.column === "review"
                                  ? "pill--info"
                                  : t.column === "in-progress"
                                  ? "pill--warn"
                                  : "pill--plain"
                              } text-[11px]`}
                            >
                              {statusLbl}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6 min-w-0">
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">
                    {member.isAdvisor ? "Đồ án đang hướng dẫn" : "Đồ án đang tham gia"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {member.projects.length} đề tài {member.name}{" "}
                    {member.isAdvisor ? "đang cố vấn & phản biện" : "đang trực tiếp nghiên cứu"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {member.projects.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Chưa được gán vào đồ án nào.
                  </div>
                ) : (
                  member.projects.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onNavigateToProject(job.id)}
                      data-lift={true}
                      className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                      title={`Mở chi tiết đồ án ${job.name}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f29b23] flex-none mt-1.5" />
                        <div className="min-w-0">
                          <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                            {job.code} · {job.name}
                          </b>
                          {job.course && (
                            <small className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                              {job.course}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-none text-xs text-slate-500 font-semibold">
                        <span>{(MARLO_PROJECT_STATUS as any)[job.status] || job.status}</span>
                        <ExternalLink size={12} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {member.isAdvisor ? (
              <section className="card space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Thông tin Cố vấn &amp; Phản biện
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kênh liên hệ nhanh &amp; trạng thái làm việc tại Lab
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold">Trạng thái hiện diện</span>
                    <span className={`pill pill--${MARLO_MEMBER_STATUS_TONE[member.status]} text-[11px]`}>
                      {MARLO_MEMBER_STATUS_LABEL[member.status]}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Phòng / Lịch tiếp</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {member.officeLocation || "Phòng Lab Khoa CNTT"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Liên hệ trực tiếp</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                      {member.phone ? `${member.phone} · ` : ""}{member.email}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Liên hệ qua email hoặc gặp trực tiếp tại phòng Lab trong khung giờ tiếp sinh viên để được duyệt hồ sơ bảo vệ đồ án.
                </p>
              </section>
            ) : (
              learningSummary && (
                <section className="card space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Hồ sơ học tập &amp; Kỹ năng AI
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {learningSummary.selectedTitle} · Đồng bộ từ CSDL học tập
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <Trophy size={11} className="text-amber-500" />
                      <span>Hạng {learningSummary.leagueName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <Flame size={11} className="text-orange-500" />
                      <span>{learningSummary.streakDays} ngày streak</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{learningSummary.expPoints.toLocaleString("en-US")} XP</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {[
                      { label: "Thuật toán", value: learningSummary.radar.algorithm, bar: "from-amber-400 to-[#EE8420]" },
                      { label: "Code sạch", value: learningSummary.radar.cleancode, bar: "from-emerald-400 to-emerald-600" },
                      { label: "Làm việc nhóm", value: learningSummary.radar.teamwork, bar: "from-sky-400 to-sky-600" },
                      { label: "Phản biện AI", value: learningSummary.radar.defense, bar: "from-indigo-400 to-indigo-600" },
                      { label: "Gỡ lỗi & Debug", value: learningSummary.radar.debugging, bar: "from-orange-400 to-rose-500" },
                    ].map((axis) => (
                      <div key={axis.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-300">{axis.label}</span>
                          <span className="font-mono text-slate-900 dark:text-white">{axis.value}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${axis.bar}`}
                            style={{ width: `${Math.max(0, Math.min(100, axis.value))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Giao Task Cho {member.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề công việc giao phó *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cấu hình Reverse Proxy Nginx & SSL cert..."
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#f29b23]/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Đề án trực thuộc
                </label>
                <MarloSelect
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                >
                  {member.projects.length > 0 ? (
                    member.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="prj-codemind">PRJ-CODEMIND — CodeMind AI</option>
                  )}
                </MarloSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ước tính SP (Story Points)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="34"
                    value={assignEst}
                    onChange={(e) => setAssignEst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Độ ưu tiên
                  </label>
                  <MarloSelect
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="high">Cao (P1 - Block)</option>
                    <option value="medium">Trung bình (P2)</option>
                    <option value="low">Thấp (P3 - Nice to have)</option>
                  </MarloSelect>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Xác nhận giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  useMarloPageEntrance,
  animateMarloCards,
  animateMarloRows,
  animateMarloPill,
} from "../utils/marloAnimations";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Camera,
  Check,
  Code,
  Crop,
  Crown,
  Flame,
  FolderKanban,
  GitFork,
  Globe,
  Link2,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { AvatarStyle, BackgroundTheme, BadgeFrame, Role, Screen } from "../App";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import MarloActivityHeatmap, { type HeatmapCellInput } from "../components/MarloActivityHeatmap";
import MarloToast from "../components/MarloToast";
import AvatarCropModal from "../components/AvatarCropModal";
import {
  deleteUserAvatarApi,
  fetchCurrentUser,
  fetchKanbanWorkspace,
  fetchStudentLearningOverview,
  getStoredUser,
  type TaughtCourseRef,
  updateMyProfileApi,
  updateTeamMemberStatusApi,
  uploadUserAvatarApi,
} from "../api";
import {
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
} from "../marlo-engine/marloData";
import { validateAndReadAvatarFile } from "../utils/avatarImage";

interface Props {
  role?: Role;
  avatarStyle: AvatarStyle;
  badgeFrame: BadgeFrame;
  backgroundTheme?: BackgroundTheme;
  onApplyBackgroundTheme?: (theme: BackgroundTheme) => void;
  onApplyAvatar: (avatar: AvatarStyle) => void;
  onApplyBadge: (badge: BadgeFrame) => void;
  onOpenSecurity?: () => void;
  onNavigate?: (screen: Screen) => void;
  onOpenProject?: (projectId: string) => void;
}

const avatarLabel: Record<AvatarStyle, string> = {
  initials: "CM",
  pixel: "PX",
  coder: "</>",
  robot: "AI",
  silver: "Ag",
};

const avatars: { id: AvatarStyle; name: string }[] = [
  { id: "initials", name: "Chữ cái" },
  { id: "pixel", name: "Pixel" },
  { id: "coder", name: "Coder" },
  { id: "robot", name: "Robot" },
  { id: "silver", name: "Silver" },
];

const badges: { id: BadgeFrame; name: string; desc: string }[] = [
  { id: "streak", name: "14-day Streak", desc: "Giữ nhịp học đều" },
  { id: "quiz", name: "Quiz Slayer", desc: "Chinh phục quiz" },
  { id: "mindmap", name: "Mindmap Builder", desc: "Xây sơ đồ tốt" },
  { id: "rookie", name: "Code Lab Rookie", desc: "Khởi động code lab" },
  { id: "explorer", name: "OOP Explorer", desc: "Khám phá OOP" },
];

const BACKGROUND_CHOICES: { id: BackgroundTheme; name: string; desc: string; previewCls: string }[] = [
  { id: "diagonal", name: "Diagonal Light", desc: "Lưới chéo sáng dịu nhẹ mặc định.", previewCls: "shop-preview-diagonal" },
  { id: "blueprint", name: "Blueprint Lab", desc: "Lưới bản vẽ kỹ thuật xanh dương.", previewCls: "shop-preview-blueprint" },
  { id: "matrix", name: "Matrix Focus", desc: "Lưới xanh kỹ thuật tập trung cao.", previewCls: "shop-preview-matrix" },
  { id: "sunrise", name: "Sunrise Notes", desc: "Tông ấm dịu nhẹ đọc lý thuyết.", previewCls: "shop-preview-sunrise" },
  { id: "graphite", name: "Graphite Pro", desc: "Crosshatch kỹ thuật tối giản.", previewCls: "shop-preview-graphite" },
];

const ROLE_LABEL: Record<Role, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

const SKILL_BADGE_TONES = [
  "border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200",
];

function parseSkillsValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12);
      }
    } catch {
      return raw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
  }
  return [];
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  xpReward: number;
}

interface ProfileProjectCard {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  isLead: boolean;
  sprint: string;
  client: string;
}

function getUserInitials(name: string, fallbackRole: Role): string {
  const cleaned = String(name || "")
    .replace(/^(cô|thầy|ts\.?|ths\.?|pgs\.?)\s+/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return fallbackRole === "student" ? "HV" : fallbackRole === "instructor" ? "GV" : "AD";
}

function getProjectStatusBadge(status: string): { label: string; dotCls: string; cls: string } {
  const neutral =
    "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  switch ((status || "").toLowerCase()) {
    case "delivered":
      return {
        label: "Đã bảo vệ xong",
        dotCls: "bg-emerald-500",
        cls: neutral,
      };
    case "review":
      return {
        label: "Đang Review",
        dotCls: "bg-indigo-500",
        cls: neutral,
      };
    case "planning":
      return {
        label: "Lập kế hoạch",
        dotCls: "bg-slate-400",
        cls: neutral,
      };
    default:
      return {
        label: "Đang thực hiện",
        dotCls: "bg-amber-500",
        cls: neutral,
      };
  }
}

const getAchievementStyle = (id: string, unlocked: boolean) => {
  if (!unlocked) {
    return "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500";
  }
  switch (id) {
    case "ach-1":
      return "bg-orange-50 dark:bg-orange-950/35 text-orange-600 dark:text-orange-400";
    case "ach-2":
      return "bg-amber-50 dark:bg-amber-950/35 text-amber-600 dark:text-amber-400";
    case "ach-3":
      return "bg-purple-50 dark:bg-purple-950/35 text-purple-600 dark:text-purple-400";
    case "ach-4":
      return "bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400";
    case "ach-5":
      return "bg-yellow-50 dark:bg-yellow-950/35 text-yellow-600 dark:text-yellow-400";
    case "ach-6":
      return "bg-sky-50 dark:bg-sky-950/35 text-sky-600 dark:text-sky-400";
    default:
      return "bg-indigo-50 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-400";
  }
};

export default function StudentProfile({
  role = "student",
  avatarStyle,
  badgeFrame,
  backgroundTheme = "diagonal",
  onApplyBackgroundTheme,
  onApplyAvatar,
  onApplyBadge,
  onOpenSecurity,
  onNavigate,
  onOpenProject,
}: Props) {
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroDockRef = useRef<HTMLDivElement>(null);
  const heroThumbRef = useRef<HTMLSpanElement>(null);
  const isFirstHeroDockRender = useRef(true);
  const [hoveredHeroPill, setHoveredHeroPill] = useState<
    "status" | "upload" | "crop" | "delete" | "team"
  >("status");

  const triggerHeroPillPop = (btn: HTMLElement) => {
    const target = btn.querySelector<HTMLElement>(".marlo-seg-content") ?? btn;
    gsap.killTweensOf(target);
    gsap.fromTo(
      target,
      { scale: 0.9 },
      { scale: 1, duration: 0.45, ease: "back.out(3)", overwrite: true, clearProps: "transform" }
    );
  };

  // Empty deps so clicking avatar/theme/badge options never replays page entrance
  useMarloPageEntrance(
    profileRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card, .profile-hero");
      if (cards.length > 0) {
        animateMarloCards(cards, { stagger: 0.055, y: 22 });
      }
      const rows = el.querySelectorAll(".marlo-row");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 12, stagger: 0.035, delay: 0.16 });
      }
    },
    []
  );

  const activeBadge = badges.find((badge) => badge.id === badgeFrame) || badges[0];

  const storedInit = getStoredUser(role);
  const [currentUserId, setCurrentUserId] = useState<string>(
    () => storedInit?.id || ""
  );
  const [studentName, setStudentName] = useState(
    () => storedInit?.full_name || storedInit?.name || "Đang tải hồ sơ..."
  );
  const [studentCode, setStudentCode] = useState(
    () => storedInit?.user_code || storedInit?.code || "—"
  );
  const [studentEmail, setStudentEmail] = useState(
    () => storedInit?.email || "—"
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => storedInit?.avatar_url || ""
  );
  const [headline, setHeadline] = useState<string>(
    () => storedInit?.headline || ""
  );
  const [bio, setBio] = useState<string>(() => storedInit?.bio || "");
  const [department, setDepartment] = useState<string>(
    () => storedInit?.department || ""
  );
  const [officeLocation, setOfficeLocation] = useState<string>(
    () => storedInit?.office_location || ""
  );
  const [skills, setSkills] = useState<string[]>(() =>
    parseSkillsValue(storedInit?.skills ?? storedInit?.skills_json)
  );
  const [githubUrl, setGithubUrl] = useState<string>(
    () => storedInit?.github_url || ""
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    () => storedInit?.website_url || ""
  );
  const [phone, setPhone] = useState<string>(() => storedInit?.phone || "");
  const [teamStatus, setTeamStatus] = useState<"in" | "remote" | "off">(
    () => (storedInit?.team_status === "remote" || storedInit?.team_status === "off" ? storedInit.team_status : "in")
  );
  const hasAvatar = Boolean(avatarUrl);

  useLayoutEffect(() => {
    const dock = heroDockRef.current;
    if (!dock) return;
    const activeBtn =
      dock.querySelector<HTMLElement>(`[data-hero-pill="${hoveredHeroPill}"]`) ??
      dock.querySelector<HTMLElement>('[data-hero-pill="status"]');
    animateMarloPill(heroThumbRef.current, activeBtn, {
      animate: !isFirstHeroDockRender.current,
      radius: 8,
    });
    isFirstHeroDockRender.current = false;
  }, [hoveredHeroPill, role, hasAvatar, teamStatus]);

  useEffect(() => {
    const dock = heroDockRef.current;
    if (!dock) return;
    const reposition = () => {
      const activeBtn =
        dock.querySelector<HTMLElement>(`[data-hero-pill="${hoveredHeroPill}"]`) ??
        dock.querySelector<HTMLElement>('[data-hero-pill="status"]');
      animateMarloPill(heroThumbRef.current, activeBtn, {
        animate: false,
        radius: 8,
      });
    };
    const ro = new ResizeObserver(reposition);
    ro.observe(dock);
    dock.querySelectorAll("button").forEach((b) => ro.observe(b));
    document.fonts?.ready?.then(reposition);
    const t = setTimeout(reposition, 140);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [hoveredHeroPill, role, hasAvatar, teamStatus]);
  const [taughtCourses, setTaughtCourses] = useState<TaughtCourseRef[]>(
    () => (Array.isArray(storedInit?.taught_courses) ? storedInit.taught_courses : [])
  );
  const [guidedProjectIds, setGuidedProjectIds] = useState<string[] | null>(
    () => (Array.isArray(storedInit?.guided_project_ids) ? storedInit.guided_project_ids : null)
  );

  const [selectedTitle, setSelectedTitle] = useState("CodeMind Campus Builder");
  const [expPoints, setExpPoints] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [commitsCount, setCommitsCount] = useState(0);
  const [cleanCodePct, setCleanCodePct] = useState(0);
  const [plagiarismFlags, setPlagiarismFlags] = useState(0);
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCellInput[]>([]);
  const [heatmapTotals, setHeatmapTotals] = useState<{ commits: number; activities: number }>({
    commits: 0,
    activities: 0,
  });
  const [projectsList, setProjectsList] = useState<ProfileProjectCard[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [draftFullName, setDraftFullName] = useState("");
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftDepartment, setDraftDepartment] = useState("");
  const [draftOfficeLocation, setDraftOfficeLocation] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftGithubUrl, setDraftGithubUrl] = useState("");
  const [draftWebsiteUrl, setDraftWebsiteUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    let active = true;
    const applyUserRecord = (u: any) => {
      if (!u) return;
      if (u.id) setCurrentUserId(String(u.id));
      if (u.full_name || u.name) setStudentName(u.full_name || u.name);
      if (u.user_code || u.code) setStudentCode(u.user_code || u.code);
      if (u.email) setStudentEmail(u.email);
      if (typeof u.avatar_url === "string") setAvatarUrl(u.avatar_url);
      if (typeof u.headline === "string") setHeadline(u.headline);
      if (typeof u.bio === "string") setBio(u.bio);
      if (typeof u.department === "string") setDepartment(u.department);
      if (typeof u.office_location === "string") setOfficeLocation(u.office_location);
      if (u.skills !== undefined || u.skills_json !== undefined) {
        setSkills(parseSkillsValue(u.skills ?? u.skills_json));
      }
      if (typeof u.github_url === "string") setGithubUrl(u.github_url);
      if (typeof u.website_url === "string") setWebsiteUrl(u.website_url);
      if (typeof u.phone === "string") setPhone(u.phone);
      if (u.team_status === "in" || u.team_status === "remote" || u.team_status === "off") {
        setTeamStatus(u.team_status);
      }
      if (Array.isArray(u.taught_courses)) setTaughtCourses(u.taught_courses);
      if (Array.isArray(u.guided_project_ids)) setGuidedProjectIds(u.guided_project_ids);
    };

    const loadProfile = () => {
      fetchCurrentUser(role, { skipAutoDemo: true })
        .then((u) => {
          if (!active || !u) return;
          applyUserRecord(u);
        })
        .catch(() => {});

      if (role === "student") {
        fetchStudentLearningOverview()
          .then((data) => {
            if (!active || !data) return;
            applyUserRecord(data.user);
            if (data.profile?.selected_title) setSelectedTitle(data.profile.selected_title);
            if (typeof data.profile?.exp_points === "number") setExpPoints(data.profile.exp_points);
            if (typeof data.profile?.current_streak === "number") setStreakDays(data.profile.current_streak);
            const r = data.profile?.radar;
            if (r) {
              setScores([
                Math.round(r.algorithm ?? 0),
                Math.round(r.cleancode ?? 0),
                Math.round(r.teamwork ?? 0),
                Math.round(r.defense ?? 0),
                Math.round(r.debugging ?? 0),
              ]);
            }
            if (Array.isArray(data.achievements)) {
              setAchievements(data.achievements);
            }
            if (data.github_summary) {
              setRepoUrl(data.github_summary.repo_url || "");
              setCommitsCount(data.github_summary.commits_count || 0);
              setCleanCodePct(data.github_summary.clean_code_pct || 0);
              setPlagiarismFlags(data.github_summary.plagiarism_flags || 0);
            }
            if (data.activity_heatmap) {
              setHeatmapCells(data.activity_heatmap.cells || []);
              setHeatmapTotals({
                commits: data.activity_heatmap.total_commits || 0,
                activities: data.activity_heatmap.total_activities || 0,
              });
            }
          })
          .catch(() => {});
      }

      fetchKanbanWorkspace()
        .then((ws) => {
          if (!active || !ws) return;
          const rows = Array.isArray(ws.projects) ? ws.projects : [];
          setProjectsList(
            rows.map((p: any) => ({
              id: p.id,
              code: p.code || String(p.id || "").toUpperCase(),
              name: p.name || "Đồ án Kỹ nghệ",
              status: p.status || "active",
              progress: typeof p.progress === "number" ? p.progress : 0,
              tasksDone: Number(p.tasksDone || 0),
              tasksTotal: Number(p.tasksTotal || 0),
              isLead: Boolean(p.isLead),
              sprint: p.sprint || "Sprint 1",
              client: p.client || "CodeMind Campus",
            }))
          );
        })
        .catch(() => {})
        .finally(() => {
          if (active) setProjectsLoaded(true);
        });
    };

    loadProfile();
    const handleAuthSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!active || (detail?.role && detail.role !== role)) return;
      applyUserRecord(detail?.user);
    };

    window.addEventListener("codemind-xp-updated", loadProfile);
    window.addEventListener("codemind-auth-updated", handleAuthSync);
    return () => {
      active = false;
      window.removeEventListener("codemind-xp-updated", loadProfile);
      window.removeEventListener("codemind-auth-updated", handleAuthSync);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [role]);

  const displayedProjects = useMemo(() => {
    if (role === "instructor" && guidedProjectIds !== null) {
      const idSet = new Set(guidedProjectIds);
      return projectsList.filter((p) => idSet.has(p.id));
    }
    return projectsList;
  }, [projectsList, role, guidedProjectIds]);

  const totalTaughtStudents = useMemo(
    () => taughtCourses.reduce((acc, c) => acc + (Number(c.studentCount) || 0), 0),
    [taughtCourses]
  );

  const userInitials = useMemo(() => getUserInitials(studentName, role), [studentName, role]);

  const handleCycleMyStatus = async () => {
    if (!currentUserId) return;
    const order: ("in" | "remote" | "off")[] = ["in", "remote", "off"];
    const nextStatus = order[(order.indexOf(teamStatus) + 1) % order.length];
    try {
      await updateTeamMemberStatusApi(currentUserId, nextStatus, role);
      setTeamStatus(nextStatus);
      window.dispatchEvent(new Event("codemind-marlo-data-changed"));
      showToast(`✓ Đã cập nhật trạng thái hiện diện: "${MARLO_MEMBER_STATUS_LABEL[nextStatus]}"`);
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái hiện diện.");
    }
  };

  const handleOpenEditProfile = () => {
    setProfileError(null);
    setDraftFullName(studentName === "Đang tải hồ sơ..." ? "" : studentName);
    setDraftHeadline(headline);
    setDraftDepartment(department);
    setDraftOfficeLocation(officeLocation);
    setDraftBio(bio);
    setDraftSkills(skills);
    setSkillInput("");
    setDraftPhone(phone);
    setDraftGithubUrl(githubUrl);
    setDraftWebsiteUrl(websiteUrl);
    setEditingProfile(true);
  };

  const handleAddDraftSkill = (rawVal?: string) => {
    const candidate = (rawVal ?? skillInput).trim().replace(/^,+|,+$/g, "");
    if (!candidate) return;
    const parts = candidate
      .split(",")
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean);
    if (parts.length === 0) return;
    setDraftSkills((prev) => {
      const seen = new Set(prev.map((x) => x.toLowerCase()));
      const next = [...prev];
      for (const p of parts) {
        if (seen.has(p.toLowerCase()) || next.length >= 12) continue;
        seen.add(p.toLowerCase());
        next.push(p);
      }
      return next;
    });
    if (rawVal === undefined) setSkillInput("");
  };

  const handleSaveSharedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = draftFullName.trim().replace(/\s+/g, " ");
    if (cleanedName.length < 2) {
      setProfileError("Họ và tên phải có ít nhất 2 ký tự.");
      return;
    }
    const pendingSkills = skillInput.trim()
      ? [...draftSkills, ...skillInput.split(",").map((s) => s.trim()).filter(Boolean)]
      : draftSkills;
    const dedupedSkills: string[] = [];
    const seen = new Set<string>();
    for (const s of pendingSkills) {
      const cleanTag = s.replace(/\s+/g, " ").trim().slice(0, 40);
      if (!cleanTag || seen.has(cleanTag.toLowerCase())) continue;
      seen.add(cleanTag.toLowerCase());
      dedupedSkills.push(cleanTag);
      if (dedupedSkills.length >= 12) break;
    }

    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await updateMyProfileApi(
        {
          full_name: cleanedName,
          headline: draftHeadline.trim(),
          bio: draftBio.trim(),
          department: draftDepartment.trim(),
          office_location: draftOfficeLocation.trim(),
          skills: dedupedSkills,
          github_url: draftGithubUrl.trim(),
          website_url: draftWebsiteUrl.trim(),
          phone: draftPhone.trim(),
        },
        role
      );
      setStudentName(updated.full_name || cleanedName);
      setHeadline(updated.headline ?? draftHeadline.trim());
      setBio(updated.bio ?? draftBio.trim());
      setDepartment(updated.department ?? draftDepartment.trim());
      setOfficeLocation(updated.office_location ?? draftOfficeLocation.trim());
      setSkills(Array.isArray(updated.skills) ? updated.skills : dedupedSkills);
      setGithubUrl(updated.github_url ?? draftGithubUrl.trim());
      setWebsiteUrl(updated.website_url ?? draftWebsiteUrl.trim());
      setPhone(updated.phone ?? draftPhone.trim());
      setSkillInput("");
      setEditingProfile(false);
      showToast("✓ Đã lưu hồ sơ & đồng bộ 1:1 với trang Team!");
    } catch (err: any) {
      setProfileError(err?.message || "Không thể lưu hồ sơ cá nhân.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTriggerFilePicker = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    try {
      const rawDataUrl = await validateAndReadAvatarFile(file);
      setCropSourceUrl(rawDataUrl);
    } catch (err: any) {
      setAvatarError(err?.message || "Không thể đọc tệp ảnh đại diện.");
    }
  };

  const handleConfirmCroppedAvatar = async (croppedDataUrl: string) => {
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const saved = await uploadUserAvatarApi(croppedDataUrl, role);
      setAvatarUrl(saved.avatar_url || croppedDataUrl);
      setCropSourceUrl(null);
      showToast("✓ Đã cắt chỉnh & cập nhật ảnh đại diện cá nhân!");
    } catch (err: any) {
      setAvatarError(err?.message || "Không thể tải ảnh đại diện.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarUrl || uploadingAvatar) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await deleteUserAvatarApi(role);
      setAvatarUrl("");
      showToast("✓ Đã gỡ ảnh đại diện, quay về ký tự viết tắt.");
    } catch (err: any) {
      setAvatarError(err?.message || "Không thể gỡ ảnh đại diện.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim().replace(/\s+/g, " ");
    if (cleaned.length < 2) {
      setAvatarError("Họ và tên phải có ít nhất 2 ký tự.");
      return;
    }
    setSavingName(true);
    setAvatarError(null);
    try {
      const updated = await updateMyProfileApi({ full_name: cleaned }, role);
      setStudentName(updated.full_name);
      setEditingName(false);
      showToast(`✓ Đã cập nhật tên hiển thị: ${updated.full_name}`);
    } catch (err: any) {
      setAvatarError(err?.message || "Không thể cập nhật họ và tên.");
    } finally {
      setSavingName(false);
    }
  };

  const leagueName =
    expPoints >= 3000 ? "Vàng" : expPoints >= 1500 ? "Bạc" : expPoints >= 500 ? "Đồng" : "Tân binh";
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const angles = [0, 72, 144, 216, 288];
  const getCoordinates = (index: number, score: number) => {
    const angleRad = (angles[index] - 90) * (Math.PI / 180);
    const radius = (score / 100) * 70;
    const x = 100 + radius * Math.cos(angleRad);
    const y = 100 + radius * Math.sin(angleRad);
    return { x, y, str: `${x},${y}` };
  };

  const radarVertices = scores.map((score, i) => getCoordinates(i, score));
  const radarPoints = radarVertices.map((v) => v.str).join(" ");

  return (
    <div ref={profileRef} className="min-h-full p-4 sm:p-6 lg:p-7 space-y-6 text-slate-800 dark:text-slate-200 max-w-[1560px] mx-auto">
      {toastMsg && <MarloToast message={toastMsg} showUndo={false} />}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleAvatarFileChange}
        className="hidden"
        aria-label="Chọn tệp ảnh đại diện"
      />

      {/* PROFILE HERO HEADER */}
      <header className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-amber-500/10 dark:bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={handleTriggerFilePicker}
              disabled={uploadingAvatar}
              title="Bấm để tải ảnh đại diện mới"
              className="group relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={studentName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className={`student-avatar student-avatar-${avatarStyle} flex h-full w-full items-center justify-center text-2xl font-black`}
                >
                  {avatarStyle === "initials" ? userInitials : avatarLabel[avatarStyle]}
                </span>
              )}
              <span className="absolute inset-0 bg-slate-950/55 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold">
                {uploadingAvatar ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                <span>{uploadingAvatar ? "Đang lưu" : "Đổi ảnh"}</span>
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <UserRound size={12} className="text-amber-500" />
                  <span>Hồ sơ Cá nhân · {ROLE_LABEL[role]}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <Sparkles size={10} className="text-emerald-500" />
                  <span>Đồng bộ Hồ sơ Team</span>
                </span>
              </div>
              <MarloTitle
                key={`profile-name-${studentName}`}
                text={studentName}
                className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white mt-0.5 leading-snug"
              />
              <p className="text-xs text-[#62656b] dark:text-[#a0a3a9] mt-1 font-medium">
                {headline || (role === "student" ? selectedTitle : ROLE_LABEL[role])} · Mã:{" "}
                <span className="font-mono font-semibold">{studentCode}</span>
                {department ? ` · ${department}` : ""}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {role === "student" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold leading-4 text-slate-700 dark:text-slate-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{activeBadge.name}</span>
                  </span>
                )}

                <div
                  ref={heroDockRef}
                  onMouseLeave={() => setHoveredHeroPill("status")}
                  className="seg marlo-seg marlo-seg--sm flex-wrap"
                  role="group"
                  aria-label="Hành động nhanh hồ sơ"
                >
                  <span ref={heroThumbRef} className="seg__thumb marlo-seg__thumb" />

                  <button
                    type="button"
                    data-hero-pill="status"
                    data-seg-active={hoveredHeroPill === "status" ? "true" : undefined}
                    onMouseEnter={() => setHoveredHeroPill("status")}
                    onFocus={() => setHoveredHeroPill("status")}
                    onBlur={() => setHoveredHeroPill("status")}
                    onClick={(e) => {
                      triggerHeroPillPop(e.currentTarget);
                      void handleCycleMyStatus();
                    }}
                    title="Bấm để đổi trạng thái hiện diện (Tại Lab / Làm từ xa / Nghỉ phép)"
                  >
                    <span className="marlo-seg-content inline-flex items-center gap-1.5 pointer-events-none">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          teamStatus === "in"
                            ? "bg-emerald-500"
                            : teamStatus === "remote"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span>{MARLO_MEMBER_STATUS_LABEL[teamStatus]}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    data-hero-pill="upload"
                    data-seg-active={hoveredHeroPill === "upload" ? "true" : undefined}
                    onMouseEnter={() => setHoveredHeroPill("upload")}
                    onFocus={() => setHoveredHeroPill("upload")}
                    onBlur={() => setHoveredHeroPill("status")}
                    onClick={(e) => {
                      triggerHeroPillPop(e.currentTarget);
                      handleTriggerFilePicker();
                    }}
                  >
                    <span className="marlo-seg-content inline-flex items-center gap-1 pointer-events-none">
                      {uploadingAvatar ? (
                        <RefreshCw size={11} className="animate-spin text-amber-500 shrink-0" />
                      ) : (
                        <Upload size={11} className="text-amber-500 shrink-0" />
                      )}
                      <span>{avatarUrl ? "Đổi ảnh đại diện" : "Tải ảnh đại diện"}</span>
                    </span>
                  </button>

                  {avatarUrl && (
                    <>
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        data-hero-pill="crop"
                        data-seg-active={hoveredHeroPill === "crop" ? "true" : undefined}
                        onMouseEnter={() => setHoveredHeroPill("crop")}
                        onFocus={() => setHoveredHeroPill("crop")}
                        onBlur={() => setHoveredHeroPill("status")}
                        onClick={(e) => {
                          triggerHeroPillPop(e.currentTarget);
                          setAvatarError(null);
                          setCropSourceUrl(avatarUrl);
                        }}
                        title="Căn chỉnh chính diện, thu phóng hoặc xoay ảnh hiện tại"
                      >
                        <span className="marlo-seg-content inline-flex items-center gap-1 pointer-events-none">
                          <Crop size={11} className="text-amber-500 shrink-0" />
                          <span>Căn chỉnh ảnh</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        data-hero-pill="delete"
                        data-seg-active={hoveredHeroPill === "delete" ? "true" : undefined}
                        onMouseEnter={() => setHoveredHeroPill("delete")}
                        onFocus={() => setHoveredHeroPill("delete")}
                        onBlur={() => setHoveredHeroPill("status")}
                        onClick={(e) => {
                          triggerHeroPillPop(e.currentTarget);
                          void handleDeleteAvatar();
                        }}
                      >
                        <span className="marlo-seg-content inline-flex items-center gap-1 pointer-events-none">
                          <Trash2 size={11} className="shrink-0" />
                          <span>Xóa ảnh</span>
                        </span>
                      </button>
                    </>
                  )}

                  {onNavigate && (
                    <button
                      type="button"
                      data-hero-pill="team"
                      data-seg-active={hoveredHeroPill === "team" ? "true" : undefined}
                      onMouseEnter={() => setHoveredHeroPill("team")}
                      onFocus={() => setHoveredHeroPill("team")}
                      onBlur={() => setHoveredHeroPill("status")}
                      onClick={(e) => {
                        triggerHeroPillPop(e.currentTarget);
                        onNavigate("team");
                      }}
                    >
                      <span className="marlo-seg-content inline-flex items-center gap-1 pointer-events-none">
                        <Users size={11} className="text-sky-500 shrink-0" />
                        <span>Xem trang Team</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Role-Adaptive Quick Metrics */}
          <div
            className={`grid ${
              role === "admin" ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
            } gap-2.5 shrink-0 self-start xl:self-auto w-full xl:w-auto`}
          >
            {(role === "student"
              ? [
                  {
                    icon: <Star size={16} className="fill-amber-500 text-amber-500" />,
                    bg: "bg-amber-500/12",
                    value: <MarloNumber value={expPoints} durationMs={1100} />,
                    label: "XP tích lũy",
                  },
                  {
                    icon: <Flame size={16} className="fill-orange-500 text-orange-500" />,
                    bg: "bg-orange-500/12",
                    value: <MarloNumber value={streakDays} durationMs={950} />,
                    label: "Ngày streak",
                  },
                  {
                    icon: <Trophy size={16} className="text-yellow-600 dark:text-yellow-400" />,
                    bg: "bg-yellow-500/12",
                    value: leagueName,
                    label: "Hạng Sprint",
                  },
                  {
                    icon: <FolderKanban size={16} className="text-indigo-600 dark:text-indigo-400" />,
                    bg: "bg-indigo-500/12",
                    value: <MarloNumber value={displayedProjects.length} durationMs={700} />,
                    label: "Đồ án",
                  },
                ]
              : role === "instructor"
              ? [
                  {
                    icon: <BookOpen size={16} className="text-sky-600 dark:text-sky-400" />,
                    bg: "bg-sky-500/12",
                    value: <MarloNumber value={taughtCourses.length} durationMs={850} />,
                    label: "Học phần",
                  },
                  {
                    icon: <FolderKanban size={16} className="text-indigo-600 dark:text-indigo-400" />,
                    bg: "bg-indigo-500/12",
                    value: <MarloNumber value={displayedProjects.length} durationMs={750} />,
                    label: "Đồ án HD",
                  },
                  {
                    icon: <Users size={16} className="text-amber-600 dark:text-amber-400" />,
                    bg: "bg-amber-500/12",
                    value: <MarloNumber value={totalTaughtStudents} durationMs={1000} />,
                    label: "Sinh viên",
                  },
                  {
                    icon: <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />,
                    bg: "bg-emerald-500/12",
                    value: MARLO_MEMBER_STATUS_LABEL[teamStatus].replace("Tại phòng Lab", "Tại Lab").replace("Làm từ xa", "Từ xa"),
                    label: "Trạng thái",
                  },
                ]
              : [
                  {
                    icon: <FolderKanban size={16} className="text-indigo-600 dark:text-indigo-400" />,
                    bg: "bg-indigo-500/12",
                    value: <MarloNumber value={displayedProjects.length} durationMs={700} />,
                    label: "Đồ án HT",
                  },
                  {
                    icon: <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />,
                    bg: "bg-amber-500/12",
                    value: "Quản trị",
                    label: "Phân quyền",
                  },
                  {
                    icon: <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />,
                    bg: "bg-emerald-500/12",
                    value: MARLO_MEMBER_STATUS_LABEL[teamStatus].replace("Tại phòng Lab", "Tại Lab").replace("Làm từ xa", "Từ xa"),
                    label: "Trạng thái",
                  },
                ]
            ).map((stat, idx) => (
              <div
                key={idx}
                className="marlo-row rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 px-3.5 py-3 text-center min-w-[84px]"
              >
                <div className={`mx-auto mb-1.5 w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <div className="text-sm font-black text-slate-950 dark:text-white leading-tight">
                  {stat.value}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {avatarError && (
          <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/80 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 relative z-10">
            <span>{avatarError}</span>
            <button
              type="button"
              onClick={() => setAvatarError(null)}
              className="p-0.5 rounded hover:bg-rose-200/50 dark:hover:bg-rose-900/40 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </header>

      {/* CORE SECTIONS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (8 cols): Shared Profile Card, Role-Adaptive Courses / Projects / Analytics */}
        <section className="lg:col-span-8 space-y-5 min-w-0">
          {/* SHARED EDITABLE PROFILE CARD (1:1 SYNC WITH TEAM PERSON DETAIL) */}
          <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight">
                      Hồ sơ Chuyên môn &amp; Liên hệ
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Đồng bộ 1:1 với Team</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mọi thay đổi tại đây hiển thị tức thì cho thành viên &amp; giảng viên khi xem hồ sơ của bạn
                  </p>
                </div>
              </div>

              {editingProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                >
                  <X size={13} />
                  <span>Hủy chỉnh sửa</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer transition"
                >
                  <Pencil size={13} className="text-amber-500" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleSaveSharedProfile} className="space-y-4">
                {profileError && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/80 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      value={draftFullName}
                      onChange={(e) => setDraftFullName(e.target.value)}
                      placeholder="VD: Cô Trần Thị B"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Chức danh / Vai trò chuyên môn
                    </label>
                    <input
                      type="text"
                      maxLength={191}
                      value={draftHeadline}
                      onChange={(e) => setDraftHeadline(e.target.value)}
                      placeholder="VD: Giảng viên Chính · Kiến trúc Phần mềm"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Khoa / Bộ môn / Lớp
                    </label>
                    <input
                      type="text"
                      maxLength={191}
                      value={draftDepartment}
                      onChange={(e) => setDraftDepartment(e.target.value)}
                      placeholder="VD: Khoa CNTT · Bộ môn Kỹ nghệ Phần mềm"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Phòng Lab / Lịch tiếp SV
                    </label>
                    <input
                      type="text"
                      maxLength={191}
                      value={draftOfficeLocation}
                      onChange={(e) => setDraftOfficeLocation(e.target.value)}
                      placeholder="VD: Phòng Lab A3-201 · Tiếp SV: Thứ 3 & 5"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Giới thiệu bản thân &amp; Định hướng nghiên cứu
                    </label>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      {draftBio.length}/800
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={800}
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    placeholder="Chia sẻ định hướng chuyên môn, lĩnh vực nghiên cứu hoặc công nghệ trọng tâm..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kỹ năng &amp; Chuyên môn ({draftSkills.length}/12)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draftSkills.map((tag, idx) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          SKILL_BADGE_TONES[idx % SKILL_BADGE_TONES.length]
                        }`}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftSkills((prev) => prev.filter((x) => x !== tag))
                          }
                          className="hover:text-rose-600 cursor-pointer"
                          aria-label={`Xóa kỹ năng ${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={40}
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddDraftSkill();
                        }
                      }}
                      placeholder="Nhập kỹ năng rồi nhấn Enter hoặc dấu phẩy (VD: System Design)"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddDraftSkill()}
                      disabled={!skillInput.trim() || draftSkills.length >= 12}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus size={13} />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                      placeholder="VD: 0903 812 401"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="text"
                      maxLength={255}
                      value={draftGithubUrl}
                      onChange={(e) => setDraftGithubUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Website / Portfolio
                    </label>
                    <input
                      type="text"
                      maxLength={255}
                      value={draftWebsiteUrl}
                      onChange={(e) => setDraftWebsiteUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 text-slate-950 px-4 py-2 text-xs font-black shadow-2xs transition cursor-pointer disabled:opacity-60"
                  >
                    {savingProfile ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>{savingProfile ? "Đang lưu..." : "Lưu thay đổi"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {bio ? (
                    <p>{bio}</p>
                  ) : (
                    <p className="italic text-slate-400">
                      Chưa có đoạn giới thiệu cá nhân. Bấm &ldquo;Chỉnh sửa hồ sơ&rdquo; để bổ sung thông tin.
                    </p>
                  )}
                </div>

                {skills.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Chuyên môn &amp; Kỹ năng trọng tâm
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((tag, idx) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            SKILL_BADGE_TONES[idx % SKILL_BADGE_TONES.length]
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2.5">
                    <Building2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        Khoa / Bộ môn / Lớp
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {department || "Chưa cập nhật"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2.5">
                    <MapPin size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        Phòng Lab / Lịch tiếp
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {officeLocation || "Chưa cập nhật"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2.5">
                    <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        Điện thoại
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {phone || "Chưa cập nhật"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2.5 flex items-start gap-2.5">
                    <Link2 size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        GitHub &amp; Website
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {githubUrl ? (
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 hover:underline truncate max-w-[180px]"
                          >
                            <GitFork size={12} />
                            <span className="truncate">{githubUrl.replace(/^https?:\/\//i, "")}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">Chưa có GitHub</span>
                        )}
                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 hover:underline truncate max-w-[160px]"
                          >
                            <Globe size={12} />
                            <span className="truncate">{websiteUrl.replace(/^https?:\/\//i, "")}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* INSTRUCTOR ONLY: TAUGHT COURSES FROM MYSQL */}
          {role === "instructor" && (
            <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight">
                      Học phần đang giảng dạy
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Đồng bộ trực tiếp với CSDL Học phần &amp; Danh sách Cố vấn trên Team
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {taughtCourses.length} môn học
                  </span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("instructor-courses")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline cursor-pointer"
                    >
                      <span>Quản lý lớp học</span>
                      <ArrowUpRight size={13} className="text-amber-500" />
                    </button>
                  )}
                </div>
              </div>

              {taughtCourses.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500">
                  Chưa có học phần nào được phân công phụ trách.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {taughtCourses.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {c.code}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{c.health}</span>
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white line-clamp-2">
                        {c.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{c.semester}</span>
                        <span>· {c.credits} tín chỉ</span>
                        <span>· {c.room}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          · {c.studentCount} SV
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROJECTS PORTFOLIO (REAL MYSQL) */}
          <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FolderKanban size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight">
                    {role === "instructor"
                      ? "Đồ án đang hướng dẫn"
                      : role === "admin"
                      ? "Đồ án đang theo dõi trong hệ thống"
                      : "Đồ án Kỹ nghệ đang tham gia"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Liên kết trực tiếp từ Workspace Kanban, Git Hub và Hội đồng Bảo vệ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {displayedProjects.length} đồ án
                </span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate("projects")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline cursor-pointer"
                  >
                    <span>Xem tất cả</span>
                    <ArrowUpRight size={13} className="text-amber-500" />
                  </button>
                )}
              </div>
            </div>

            {!projectsLoaded && displayedProjects.length === 0 ? (
              <div className="h-24 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse" />
            ) : displayedProjects.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center space-y-2.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {role === "instructor"
                    ? "Hiện chưa có đồ án nào do bạn phụ trách hướng dẫn."
                    : "Bạn chưa tham gia đồ án kỹ nghệ nào trên hệ thống."}
                </p>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate("projects")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE8420] hover:brightness-105 text-slate-950 px-3.5 py-2 text-xs font-black cursor-pointer transition"
                  >
                    <span>Khám phá / Tạo Đồ án</span>
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedProjects.slice(0, 4).map((p) => {
                  const pct = Math.round(p.progress * 100);
                  const st = getProjectStatusBadge(p.status);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10.5px] font-bold text-slate-700 dark:text-slate-200">
                            {p.code}
                          </span>
                          {p.isLead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold font-mono">
                              <Crown size={10} className="fill-amber-500 text-amber-500" />
                              Lead
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                          <span>{st.label}</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-950 dark:text-white line-clamp-1">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {p.sprint} · {p.tasksDone}/{p.tasksTotal} thẻ hoàn thành
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Tiến độ Sprint</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#F8BD57] to-[#EE8420]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => (onOpenProject ? onOpenProject(p.id) : onNavigate?.("projects"))}
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                        >
                          Mở dự án
                        </button>
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate("defense-room")}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                          >
                            Bảo vệ Đồ án
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SKILL RADAR CHART & GITHUB ACTIVITY + ACHIEVEMENTS (STUDENT ONLY) */}
          {role === "student" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SVG RADAR CHART */}
                <div className="marlo-card min-w-0 rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs flex flex-col items-center">
                  <div className="w-full mb-3">
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Biểu đồ kỹ năng AI
                    </h2>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tổng hợp thực tế từ điểm nộp lab &amp; phản biện AI
                    </span>
                  </div>

                  <div className="relative w-48 h-48 flex items-center justify-center my-auto">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {[20, 40, 60, 80, 100].map((step) => (
                        <polygon
                          key={step}
                          points={angles.map((_, i) => getCoordinates(i, step).str).join(" ")}
                          fill="none"
                          stroke="rgba(148, 163, 184, 0.2)"
                          strokeWidth="1"
                        />
                      ))}

                      {angles.map((angle, i) => {
                        const angleRad = (angle - 90) * (Math.PI / 180);
                        const x = 100 + 70 * Math.cos(angleRad);
                        const y = 100 + 70 * Math.sin(angleRad);
                        return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" />;
                      })}

                      <polygon
                        points={radarPoints}
                        fill="rgba(238, 132, 32, 0.22)"
                        stroke="#EE8420"
                        strokeWidth="2"
                      />
                      {radarVertices.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r="3.2"
                          fill="#EE8420"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                      ))}
                    </svg>

                    <div className="absolute top-0 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">Thuật toán ({scores[0]}%)</div>
                    <div className="absolute right-0 top-1/3 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">Code sạch ({scores[1]}%)</div>
                    <div className="absolute right-2 bottom-4 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">Nhóm ({scores[2]}%)</div>
                    <div className="absolute left-2 bottom-4 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">Phản biện ({scores[3]}%)</div>
                    <div className="absolute left-0 top-1/3 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">Gỡ lỗi ({scores[4]}%)</div>
                  </div>
                </div>

                {/* GITHUB INTEGRITY LAB CHECK (REAL MYSQL) */}
                <div className="marlo-card min-w-0 rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Trực quan hóa đóng góp GitHub
                  </h2>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <GitFork size={15} />
                    </div>
                    {repoUrl ? (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline truncate"
                      >
                        {repoUrl.replace(/^https?:\/\//i, "")}
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Chưa liên kết kho GitHub</span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs leading-5">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span>
                        Điểm chính trực Code sạch trung bình: <strong className="text-slate-900 dark:text-white">{cleanCodePct}%</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <Code size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Đóng góp thực tế: <strong className="text-slate-900 dark:text-white">{commitsCount} commits</strong> trên dự án,{" "}
                        {plagiarismFlags} cảnh báo đạo văn.
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <MarloActivityHeatmap
                      title="Chu kỳ Hoạt động & Commit (16 tuần qua)"
                      subtitle={`${heatmapTotals.commits} commits · ${heatmapTotals.activities} hoạt động học tập trong 16 tuần`}
                      cells={heatmapCells}
                    />
                  </div>
                </div>
              </div>

              {/* ACHIEVEMENTS COLLECTION (REAL MYSQL) */}
              <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-500 fill-amber-500/25" />
                    Bộ sưu tập thành tựu học tập
                  </h2>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {unlockedCount} / {achievements.length} Đã mở khóa
                  </span>
                </div>

                {achievements.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">Đang đồng bộ danh hiệu từ hệ thống...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className={`p-3.5 rounded-2xl border flex gap-3 text-xs transition duration-200 ${
                          ach.unlocked
                            ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60"
                            : "border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 opacity-65"
                        }`}
                      >
                        <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${getAchievementStyle(ach.id, ach.unlocked)}`}>
                          {ach.id === "ach-1" ? (
                            <Flame size={17} />
                          ) : ach.id === "ach-2" ? (
                            <Award size={17} />
                          ) : ach.id === "ach-3" ? (
                            <Brain size={17} />
                          ) : ach.id === "ach-4" ? (
                            <ShieldCheck size={17} />
                          ) : ach.id === "ach-5" ? (
                            <Trophy size={17} />
                          ) : (
                            <Zap size={17} />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold truncate ${ach.unlocked ? "text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>{ach.name}</span>
                            {ach.unlocked && <Check size={13} className="text-emerald-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">{ach.desc}</p>
                          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <span>+{ach.xpReward} XP</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* RIGHT COLUMN (4 cols): Custom Avatar Upload & Style, Background Theme, Badge, Account & Security */}
        <section className="lg:col-span-4 space-y-4 min-w-0">
          {/* CUSTOM AVATAR UPLOAD + FALLBACK MONOGRAM STYLES */}
          <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ảnh đại diện &amp; Phong cách
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Đồng bộ trên thanh tiêu đề và danh sách Team.
                </p>
              </div>
              <Camera size={15} className="text-amber-500 shrink-0" />
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={studentName} className="h-full w-full object-cover" />
                  ) : (
                    <span className={`student-avatar student-avatar-${avatarStyle} flex h-full w-full items-center justify-center text-sm font-black`}>
                      {avatarStyle === "initials" ? userInitials : avatarLabel[avatarStyle]}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {avatarUrl ? "Đang dùng ảnh tải lên" : "Chưa có ảnh đại diện riêng"}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                    Hỗ trợ PNG, JPG, WebP, GIF (tối đa 8MB, cho phép cắt &amp; căn chính diện).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={handleTriggerFilePicker}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 text-slate-950 px-3 py-2 text-xs font-black shadow-2xs transition cursor-pointer disabled:opacity-60"
                >
                  {uploadingAvatar ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>{uploadingAvatar ? "Đang tải lên..." : "Tải file ảnh từ máy"}</span>
                </button>
                {avatarUrl && (
                  <>
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => {
                        setAvatarError(null);
                        setCropSourceUrl(avatarUrl);
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-60"
                      title="Căn chỉnh chính diện & cắt lại ảnh hiện tại"
                    >
                      <Crop size={13} className="text-amber-500" />
                      <span>Căn chỉnh</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => void handleDeleteAvatar()}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-60"
                      title="Xóa ảnh đại diện tùy chỉnh"
                    >
                      <Trash2 size={13} />
                      <span>Gỡ</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Biểu tượng mặc định {avatarUrl ? "(hiện khi gỡ ảnh)" : ""}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {avatars.map((avatar) => {
                  const active = avatar.id === avatarStyle;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => onApplyAvatar(avatar.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition cursor-pointer ${
                        active
                          ? "border-slate-900/80 dark:border-slate-200 bg-slate-100/80 dark:bg-slate-800/80 font-bold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className={`student-avatar student-avatar-${avatar.id} flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black`}>
                        {avatar.id === "initials" ? userInitials : avatarLabel[avatar.id]}
                      </span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate w-full">
                        {avatar.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FREE BACKGROUND THEME SELECTOR */}
          {onApplyBackgroundTheme && (
            <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={13} className="text-[#EE8420]" />
                  <span>Chọn giao diện nền</span>
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Miễn phí</span>
                </span>
              </div>
              <div className="space-y-2">
                {BACKGROUND_CHOICES.map((bg) => {
                  const active = bg.id === backgroundTheme;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => onApplyBackgroundTheme(bg.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition cursor-pointer text-xs ${
                        active
                          ? "border-slate-900/80 dark:border-slate-200 bg-slate-100/80 dark:bg-slate-800/80 font-bold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className={`h-8 w-8 shrink-0 rounded-lg border border-slate-300/60 dark:border-slate-700 ${bg.previewCls}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{bg.name}</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{bg.desc}</div>
                      </div>
                      {active && <Check size={14} className="shrink-0 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHOOSE DISPLAY TITLE (STUDENT ONLY) */}
          {role === "student" && (
            <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
              <div>
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Danh hiệu hiển thị
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Đính kèm cạnh tên trên Dashboard &amp; BXH.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {badges.map((badge) => {
                  const active = badge.id === badgeFrame;
                  return (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => onApplyBadge(badge.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer text-xs ${
                        active
                          ? "border-slate-900/80 dark:border-slate-200 bg-slate-100/80 dark:bg-slate-800/80 font-bold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 text-amber-400">
                        <Award size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[11.5px] text-slate-800 dark:text-slate-200 truncate">{badge.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{badge.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACCOUNT & SECURITY CARD (REAL MYSQL) */}
          <div className="marlo-card rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Thông tin tài khoản &amp; Bảo mật
            </h2>
            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2.5">
                {editingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      minLength={2}
                      maxLength={120}
                      autoFocus
                      className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-2.5 py-1 rounded-lg bg-[#EE8420] text-slate-950 font-bold text-[11px] cursor-pointer disabled:opacity-60"
                    >
                      {savingName ? "Lưu..." : "Lưu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] cursor-pointer"
                    >
                      Hủy
                    </button>
                  </form>
                ) : (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">Họ và tên</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{studentName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftName(studentName);
                          setEditingName(true);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                        title="Đổi tên hiển thị"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {[
                ["Mã định danh", studentCode],
                ["Email", studentEmail],
                ["Chức danh", headline || "Chưa cập nhật"],
                ["Khoa / Bộ môn", department || "Chưa cập nhật"],
                ["Vai trò", ROLE_LABEL[role]],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2.5 flex justify-between items-center gap-2"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{value}</span>
                </div>
              ))}
            </div>
            {onOpenSecurity && (
              <button
                type="button"
                onClick={onOpenSecurity}
                className="w-full mt-2 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <ShieldCheck size={14} className="text-emerald-400 dark:text-emerald-600" />
                <span>Quản lý Bảo mật, 2FA &amp; Thiết bị</span>
              </button>
            )}
          </div>
        </section>
      </div>

      <AvatarCropModal
        open={Boolean(cropSourceUrl)}
        imageSrc={cropSourceUrl || ""}
        saving={uploadingAvatar}
        error={avatarError}
        onCancel={() => {
          if (!uploadingAvatar) {
            setCropSourceUrl(null);
            setAvatarError(null);
          }
        }}
        onChangeFile={handleTriggerFilePicker}
        onConfirm={handleConfirmCroppedAvatar}
      />
    </div>
  );
}

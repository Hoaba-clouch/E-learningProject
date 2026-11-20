import { useEffect, useRef, useState } from "react";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import { Award, Check, Flame, Star, Trophy, UserRound, GitFork, ShieldCheck, Code, Brain, Zap, Palette } from "lucide-react";
import type { AvatarStyle, BackgroundTheme, BadgeFrame } from "../App";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import MarloActivityHeatmap, { type HeatmapCellInput } from "../components/MarloActivityHeatmap";
import { fetchStudentLearningOverview } from "../api";

interface Props {
  avatarStyle: AvatarStyle;
  badgeFrame: BadgeFrame;
  backgroundTheme?: BackgroundTheme;
  onApplyBackgroundTheme?: (theme: BackgroundTheme) => void;
  onApplyAvatar: (avatar: AvatarStyle) => void;
  onApplyBadge: (badge: BadgeFrame) => void;
  onOpenSecurity?: () => void;
}

const avatarLabel: Record<AvatarStyle, string> = {
  initials: "A",
  pixel: "PX",
  coder: "</>",
  robot: "AI",
  silver: "Ag",
};

const avatars: { id: AvatarStyle; name: string; desc: string }[] = [
  { id: "initials", name: "Initial A", desc: "Gọn, sạch, mặc định." },
  { id: "pixel", name: "Pixel Learner", desc: "Phong cách game." },
  { id: "coder", name: "Coder Mark", desc: "Dành cho người mê code." },
  { id: "robot", name: "Robot Buddy", desc: "Đi cùng AI mentor." },
  { id: "silver", name: "Silver League", desc: "Theo league hiện tại." },
];

const badges: { id: BadgeFrame; name: string; desc: string }[] = [
  { id: "streak", name: "14-day Streak", desc: "Giữ nhịp học đều." },
  { id: "quiz", name: "Quiz Slayer", desc: "Chinh phục quiz." },
  { id: "mindmap", name: "Mindmap Builder", desc: "Xây sơ đồ tốt." },
  { id: "rookie", name: "Code Lab Rookie", desc: "Khởi động code lab." },
  { id: "explorer", name: "OOP Explorer", desc: "Khám phá OOP." },
];

const BACKGROUND_CHOICES: { id: BackgroundTheme; name: string; desc: string; previewCls: string }[] = [
  { id: "diagonal", name: "Diagonal Light", desc: "Lưới chéo sáng dịu nhẹ mặc định.", previewCls: "shop-preview-diagonal" },
  { id: "blueprint", name: "Blueprint Lab", desc: "Lưới bản vẽ kỹ thuật xanh dương.", previewCls: "shop-preview-blueprint" },
  { id: "matrix", name: "Matrix Focus", desc: "Lưới xanh kỹ thuật tập trung cao.", previewCls: "shop-preview-matrix" },
  { id: "sunrise", name: "Sunrise Notes", desc: "Tông ấm dịu nhẹ đọc lý thuyết.", previewCls: "shop-preview-sunrise" },
  { id: "graphite", name: "Graphite Pro", desc: "Crosshatch kỹ thuật tối giản.", previewCls: "shop-preview-graphite" },
];

interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  xpReward: number;
}

const getAchievementStyle = (id: string, unlocked: boolean) => {
  if (!unlocked) {
    return "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800";
  }
  switch (id) {
    case "ach-1":
      return "bg-orange-50 dark:bg-orange-950/35 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30";
    case "ach-2":
      return "bg-amber-50 dark:bg-amber-950/35 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
    case "ach-3":
      return "bg-purple-50 dark:bg-purple-950/35 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30";
    case "ach-4":
      return "bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
    case "ach-5":
      return "bg-yellow-50 dark:bg-yellow-950/35 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30";
    case "ach-6":
      return "bg-sky-50 dark:bg-sky-950/35 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30";
    default:
      return "bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30";
  }
};

export default function StudentProfile({
  avatarStyle,
  badgeFrame,
  backgroundTheme = "diagonal",
  onApplyBackgroundTheme,
  onApplyAvatar,
  onApplyBadge,
  onOpenSecurity,
}: Props) {
  const profileRef = useRef<HTMLDivElement>(null);

  useMarloPageEntrance(
    profileRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card, .profile-hero, .marlo-card-1, .marlo-card-2, .marlo-card-3");
      if (cards.length > 0) {
        animateMarloCards(cards, { stagger: 0.06, y: 26 });
      }
      const rows = el.querySelectorAll(".marlo-row, tr, .badge-item");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 14, stagger: 0.025, delay: 0.22 });
      }
    },
    [avatarStyle, badgeFrame]
  );
  const activeBadge = badges.find((badge) => badge.id === badgeFrame) || badges[0];

  const [studentName, setStudentName] = useState("Đang tải hồ sơ...");
  const [studentCode, setStudentCode] = useState("—");
  const [studentEmail, setStudentEmail] = useState("—");
  const [selectedTitle, setSelectedTitle] = useState("CodeMind Learner");
  const [expPoints, setExpPoints] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [commitsCount, setCommitsCount] = useState(0);
  const [cleanCodePct, setCleanCodePct] = useState(0);
  const [plagiarismFlags, setPlagiarismFlags] = useState(0);
  const [enrolledCoursesCount, setEnrolledCoursesCount] = useState(0);
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCellInput[]>([]);
  const [heatmapTotals, setHeatmapTotals] = useState<{ commits: number; activities: number }>({
    commits: 0,
    activities: 0,
  });

  useEffect(() => {
    let active = true;
    const loadProfile = () => {
      fetchStudentLearningOverview().then((data) => {
        if (!active || !data) return;
        if (data.user?.name) setStudentName(data.user.name);
        if (data.user?.code) setStudentCode(data.user.code);
        if (data.user?.email) setStudentEmail(data.user.email);
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
          setEnrolledCoursesCount(data.github_summary.enrolled_courses_count || 0);
        }
        if (data.activity_heatmap) {
          setHeatmapCells(data.activity_heatmap.cells || []);
          setHeatmapTotals({
            commits: data.activity_heatmap.total_commits || 0,
            activities: data.activity_heatmap.total_activities || 0,
          });
        }
      });
    };
    loadProfile();
    window.addEventListener("codemind-xp-updated", loadProfile);
    return () => {
      active = false;
      window.removeEventListener("codemind-xp-updated", loadProfile);
    };
  }, []);

  const leagueName =
    expPoints >= 3000 ? "Vàng" : expPoints >= 1500 ? "Bạc" : expPoints >= 500 ? "Đồng" : "Tân binh";
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const angles = [0, 72, 144, 216, 288];

  const getCoordinates = (index: number, score: number) => {
    const angleRad = (angles[index] - 90) * (Math.PI / 180);
    const radius = (score / 100) * 70;
    const x = 100 + radius * Math.cos(angleRad);
    const y = 100 + radius * Math.sin(angleRad);
    return `${x},${y}`;
  };

  const radarPoints = scores.map((score, i) => getCoordinates(i, score)).join(" ");

  return (
    <div ref={profileRef} className="min-h-full p-5 space-y-6 text-slate-800 dark:text-slate-200">
      {/* PROFILE HERO HEADER */}
      <header className="marlo-card-1 profile-hero bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <span className={`student-avatar student-avatar-${avatarStyle} flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black shadow-md border-2 border-white dark:border-slate-800`}>
              {avatarLabel[avatarStyle]}
            </span>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <UserRound size={12} />
                Hồ sơ học viên
              </div>
              <MarloTitle text={studentName} className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1" />
              <p className="text-xs text-[#62656b] dark:text-[#a0a3a9] mt-1 font-medium">
                {selectedTitle} · MSSV: {studentCode} · {enrolledCoursesCount} học phần đang mở
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  {activeBadge.name}
                </span>
                <span className="rounded-full border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0 self-start md:self-auto">
            {[
              [<Star size={16} />, <MarloNumber value={expPoints} durationMs={1200} />, "XP"],
              [<Flame size={16} />, <MarloNumber value={streakDays} durationMs={1000} />, "streak"],
              [<Trophy size={16} />, leagueName, "hạng"],
            ].map(([icon, value, label], idx) => (
              <div key={idx} style={{ animationDelay: `${idx * 40}ms` }} className="marlo-row rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-center min-w-[75px] shadow-inner">
                <div className="mx-auto mb-1 flex justify-center text-blue-600 dark:text-blue-400">{icon}</div>
                <div className="text-sm font-black text-slate-950 dark:text-white">{value}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CORE SECTIONS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (8 cols): Skill analysis, GitHub commits, Achievements */}
        <section className="marlo-card-2 lg:col-span-8 space-y-5">
          {/* SKILL RADAR CHART & PROFILE INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG RADAR CHART */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-full mb-1">Biểu đồ kỹ năng AI</h2>
              <span className="text-[10px] text-slate-500 mb-4 w-full">Tổng hợp thực tế từ điểm nộp lab & phản biện AI</span>

              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {[20, 40, 60, 80, 100].map((step) => (
                    <polygon
                      key={step}
                      points={angles.map((_, i) => getCoordinates(i, step)).join(" ")}
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.15)"
                      strokeWidth="1"
                    />
                  ))}

                  {angles.map((angle, i) => {
                    const angleRad = (angle - 90) * (Math.PI / 180);
                    const x = 100 + 70 * Math.cos(angleRad);
                    const y = 100 + 70 * Math.sin(angleRad);
                    return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />;
                  })}

                  <polygon
                    points={radarPoints}
                    fill="rgba(59, 130, 246, 0.22)"
                    stroke="rgba(59, 130, 246, 0.85)"
                    strokeWidth="2"
                  />
                </svg>

                <div className="absolute top-0 text-[9px] font-bold text-slate-500 dark:text-slate-400">Thuật toán ({scores[0]}%)</div>
                <div className="absolute right-0 top-1/3 text-[9px] font-bold text-slate-500 dark:text-slate-400">Code sạch ({scores[1]}%)</div>
                <div className="absolute right-2 bottom-4 text-[9px] font-bold text-slate-500 dark:text-slate-400">Nhóm ({scores[2]}%)</div>
                <div className="absolute left-2 bottom-4 text-[9px] font-bold text-slate-500 dark:text-slate-400">Phản biện ({scores[3]}%)</div>
                <div className="absolute left-0 top-1/3 text-[9px] font-bold text-slate-500 dark:text-slate-400">Gỡ lỗi ({scores[4]}%)</div>
              </div>
            </div>

            {/* GITHUB INTEGRITY LAB CHECK (REAL MYSQL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Trực quan hóa đóng góp GitHub</h2>
              <div className="flex items-center gap-2 min-w-0">
                <GitFork size={18} className="text-slate-800 dark:text-white shrink-0" />
                {repoUrl ? (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate"
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
                  <Code size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Đóng góp thực tế: <strong className="text-slate-900 dark:text-white">{commitsCount} commits</strong> trên dự án,{" "}
                    {plagiarismFlags} cảnh báo đạo văn.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <MarloActivityHeatmap
                  title="Chu kỳ Hoạt động & Commit (16 tuần qua)"
                  subtitle={`${heatmapTotals.commits} commits · ${heatmapTotals.activities} hoạt động học tập trong 16 tuần`}
                  cells={heatmapCells}
                />
              </div>
            </div>
          </div>

          {/* ACHIEVEMENTS COLLECTION (REAL MYSQL) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-yellow-500 fill-yellow-500/25" />
                Bộ sưu tập thành tựu học tập
              </h2>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {unlockedCount} / {achievements.length} Đã mở khóa
              </span>
            </div>

            {achievements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">Đang đồng bộ danh hiệu từ hệ thống...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex gap-3 text-xs transition duration-200 ${
                      ach.unlocked
                        ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 opacity-65"
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 ${getAchievementStyle(ach.id, ach.unlocked)}`}>
                      {ach.id === "ach-1" ? (
                        <Flame size={18} />
                      ) : ach.id === "ach-2" ? (
                        <Award size={18} />
                      ) : ach.id === "ach-3" ? (
                        <Brain size={18} />
                      ) : ach.id === "ach-4" ? (
                        <ShieldCheck size={18} />
                      ) : ach.id === "ach-5" ? (
                        <Trophy size={18} />
                      ) : (
                        <Zap size={18} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${ach.unlocked ? "text-slate-800 dark:text-slate-100" : "text-slate-500"}`}>{ach.name}</span>
                        {ach.unlocked && <Check size={12} className="text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-4">{ach.desc}</p>
                      <div className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-0.5">
                        <Star size={10} className="fill-current" />
                        <span>+{ach.xpReward} XP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN (4 cols): Background (Free), Avatar, Badge, Personal Info */}
        <section className="marlo-card-3 lg:col-span-4 space-y-4">
          {/* FREE BACKGROUND THEME SELECTOR */}
          {onApplyBackgroundTheme && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={13} className="text-[#EE8420]" />
                  <span>Chọn giao diện nền</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Miễn phí
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
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition cursor-pointer text-xs ${
                        active
                          ? "border-blue-400 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/25 font-bold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className={`h-8 w-8 shrink-0 rounded-lg border border-slate-300/60 dark:border-slate-700 ${bg.previewCls}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{bg.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{bg.desc}</div>
                      </div>
                      {active && <Check size={14} className="shrink-0 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PROFILE EDIT SKIN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn avatar sử dụng</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Hiển thị đồng bộ trong dashboard và bảng xếp hạng.</p>
            </div>

            <div className="space-y-2">
              {avatars.map((avatar) => {
                const active = avatar.id === avatarStyle;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => onApplyAvatar(avatar.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition cursor-pointer text-xs ${
                      active
                        ? "border-blue-400 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className={`student-avatar student-avatar-${avatar.id} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black`}>
                      {avatarLabel[avatar.id]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{avatar.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{avatar.desc}</div>
                    </div>
                    {active && <Check size={14} className="shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHOOSE DISPLAY TITLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn danh hiệu khoe profile</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Đính kèm hiển thị bên cạnh tên của học viên.</p>
            </div>

            <div className="space-y-2">
              {badges.map((badge) => {
                const active = badge.id === badgeFrame;
                return (
                  <button
                    key={badge.id}
                    onClick={() => onApplyBadge(badge.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition cursor-pointer text-xs ${
                      active
                        ? "border-amber-400 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-amber-300">
                      <Award size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{badge.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{badge.desc}</div>
                    </div>
                    {active && <Check size={14} className="shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PERSONAL INFO CARD (REAL MYSQL) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thông tin cá nhân</h2>
            <div className="space-y-2 text-xs">
              {[
                ["Họ và tên", studentName],
                ["Mã học viên", studentCode],
                ["Email", studentEmail],
                ["Vai trò", "Học viên"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-2.5 flex justify-between items-center gap-2 shadow-inner">
                  <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{value}</span>
                </div>
              ))}
            </div>
            {onOpenSecurity && (
              <button
                type="button"
                onClick={onOpenSecurity}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <ShieldCheck size={14} />
                <span>Quản lý Bảo mật, 2FA &amp; Thiết bị</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

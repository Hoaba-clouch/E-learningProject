import { useEffect, useRef, useState } from "react"
import {
  useMarloPageEntrance,
  animateMarloCards,
  animateMarloRows,
} from "../utils/marloAnimations"
import {
  Award,
  Check,
  Flame,
  Star,
  Trophy,
  UserRound,
  GitFork,
  ShieldCheck,
  Code,
  Brain,
  Zap,
  Palette,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Target,
} from "lucide-react"
import type { AvatarStyle, BackgroundTheme, BadgeFrame } from "../App"
import MarloTitle from "../components/MarloTitle"
import MarloNumber from "../components/MarloNumber"
import MarloActivityHeatmap, {
  type HeatmapCellInput,
} from "../components/MarloActivityHeatmap"
import { fetchStudentLearningOverview, updateStudentTitleApi } from "../api"

interface Props {
  avatarStyle: AvatarStyle
  badgeFrame: BadgeFrame
  backgroundTheme?: BackgroundTheme
  onApplyBackgroundTheme?: (theme: BackgroundTheme) => void
  onApplyAvatar: (avatar: AvatarStyle) => void
  onApplyBadge: (badge: BadgeFrame) => void
  onOpenSecurity?: () => void
}

const avatarLabel: Record<AvatarStyle, string> = {
  initials: "A",
  pixel: "PX",
  coder: "</>",
  robot: "AI",
  silver: "Ag",
}

const avatars: { id: AvatarStyle name: string desc: string }[] = [
  {
    id: "initials",
    name: "Initial A",
    desc: "Gọn gàng, sạch sẽ, chuẩn mực mặc định.",
  },
  {
    id: "pixel",
    name: "Pixel Learner",
    desc: "Phong cách retro 8-bit lập trình viên.",
  },
  {
    id: "coder",
    name: "Coder Mark",
    desc: "Biểu tượng mã nguồn dành cho hacker đam mê.",
  },
  {
    id: "robot",
    name: "Robot Buddy",
    desc: "Đồng hành cùng Trợ giảng AI Socratic.",
  },
  {
    id: "silver",
    name: "Silver League",
    desc: "Huy hiệu thăng hạng League danh giá.",
  },
]

const badges: { id: BadgeFrame name: string desc: string }[] = [
  {
    id: "streak",
    name: "14-day Streak",
    desc: "Giữ vững chuỗi ngày học liên tục không ngừng nghỉ.",
  },
  {
    id: "quiz",
    name: "Quiz Slayer",
    desc: "Chinh phục 100% trắc nghiệm kỹ thuật.",
  },
  {
    id: "mindmap",
    name: "Mindmap Builder",
    desc: "Xây dựng sơ đồ tư duy hệ thống mạch lạc.",
  },
  {
    id: "rookie",
    name: "Code Lab Rookie",
    desc: "Khởi động và hoàn thành bài lab đầu tiên.",
  },
  {
    id: "explorer",
    name: "OOP Explorer",
    desc: "Làm chủ 4 tính chất hướng đối tượng và SOLID.",
  },
]

const AVAILABLE_TITLES = [
  {
    id: "learner",
    title: "CodeMind Learner",
    desc: "Nền tảng vững chắc, sẵn sàng bứt phá",
    icon: Star,
  },
  {
    id: "cleancode",
    title: "Clean Code Builder",
    desc: "Kiến trúc 3 tầng chuẩn chỉ, code tinh gọn",
    icon: Code,
  },
  {
    id: "algo",
    title: "Thuật toán Sư",
    desc: "Tối ưu Big-O, giải bài tập đệ quy & quy hoạch động",
    icon: Brain,
  },
  {
    id: "bug",
    title: "Thợ săn Bug",
    desc: "Bậc thầy gỡ lỗi runtime & vượt qua mọi Edge Cases",
    icon: Zap,
  },
  {
    id: "architect",
    title: "Kiến trúc Sư Phần mềm",
    desc: "Thiết kế OOP, Clean Architecture & Module hóa",
    icon: ShieldCheck,
  },
  {
    id: "defense",
    title: "Chiến binh Phản biện",
    desc: "Tự tin tranh biện 100% trước Hội đồng AI",
    icon: Award,
  },
  {
    id: "team",
    title: "Đồng đội Đáng tin",
    desc: "Đóng góp Git đều đặn, hỗ trợ đồng đội xuất sắc",
    icon: Trophy,
  },
]

const BACKGROUND_CHOICES: {
  id: BackgroundTheme
  name: string
  desc: string
  previewCls: string
}[] = [
  {
    id: "diagonal",
    name: "Diagonal Light",
    desc: "Lưới chéo sáng dịu nhẹ mặc định.",
    previewCls: "shop-preview-diagonal",
  },
  {
    id: "blueprint",
    name: "Blueprint Lab",
    desc: "Lưới bản vẽ kỹ thuật xanh dương.",
    previewCls: "shop-preview-blueprint",
  },
  {
    id: "matrix",
    name: "Matrix Focus",
    desc: "Lưới xanh kỹ thuật tập trung cao.",
    previewCls: "shop-preview-matrix",
  },
  {
    id: "sunrise",
    name: "Sunrise Notes",
    desc: "Tông ấm dịu nhẹ đọc lý thuyết.",
    previewCls: "shop-preview-sunrise",
  },
  {
    id: "graphite",
    name: "Graphite Pro",
    desc: "Crosshatch kỹ thuật tối giản.",
    previewCls: "shop-preview-graphite",
  },
]

interface Achievement {
  id: string
  name: string
  desc: string
  unlocked: boolean
  xpReward: number
}

const getAchievementStyle = (id: string, unlocked: boolean) => {
  if (!unlocked) {
    return "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800"
  }
  switch (id) {
    case "ach-1":
      return "bg-orange-50 dark:bg-orange-950/35 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30"
    case "ach-2":
      return "bg-amber-50 dark:bg-amber-950/35 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
    case "ach-3":
      return "bg-purple-50 dark:bg-purple-950/35 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"
    case "ach-4":
      return "bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
    case "ach-5":
      return "bg-yellow-50 dark:bg-yellow-950/35 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30"
    case "ach-6":
      return "bg-sky-50 dark:bg-sky-950/35 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30"
    default:
      return "bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
  }
}

const SKILL_METRICS = [
  {
    key: "algorithm",
    name: "Thuật toán",
    shortName: "Thuật toán",
    desc: "Độ phức tạp O(n), đệ quy & quy hoạch động",
    icon: Brain,
    color: "#3B82F6",
    badgeCls:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900",
    barCls: "bg-blue-600 dark:bg-blue-500",
  },
  {
    key: "debugging",
    name: "Debugging (Gỡ lỗi)",
    shortName: "Gỡ lỗi",
    desc: "Xử lý edge cases, an toàn con trỏ & bộ nhớ",
    icon: Zap,
    color: "#EF4444",
    badgeCls:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900",
    barCls: "bg-red-600 dark:bg-red-500",
  },
  {
    key: "cleancode",
    name: "Clean Code",
    shortName: "Code sạch",
    desc: "Quy chuẩn đặt tên, modular & chính trực",
    icon: Code,
    color: "#10B981",
    badgeCls:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    barCls: "bg-emerald-600 dark:bg-emerald-500",
  },
  {
    key: "teamwork",
    name: "Teamwork",
    shortName: "Làm việc nhóm",
    desc: "Đóng góp GitHub, PR Review & Kanban",
    icon: GitFork,
    color: "#8B5CF6",
    badgeCls:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900",
    barCls: "bg-purple-600 dark:bg-purple-500",
  },
  {
    key: "defense",
    name: "Phản biện AI",
    shortName: "Phản biện",
    desc: "Bảo vệ đồ án, tranh biện cùng Hội đồng AI",
    icon: ShieldCheck,
    color: "#F59E0B",
    badgeCls:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    barCls: "bg-amber-600 dark:bg-amber-500",
  },
]

export default function StudentProfile({
  avatarStyle,
  badgeFrame,
  backgroundTheme = "diagonal",
  onApplyBackgroundTheme,
  onApplyAvatar,
  onApplyBadge,
  onOpenSecurity,
}: Props) {
  const profileRef = useRef<HTMLDivElement>(null)

  useMarloPageEntrance(
    profileRef,
    (el) => {
      const cards = el.querySelectorAll(
        ".marlo-card, .profile-hero, .marlo-card-1, .marlo-card-2, .marlo-card-3",
      )
      if (cards.length > 0) {
        animateMarloCards(cards, { stagger: 0.06, y: 26 })
      }
      const rows = el.querySelectorAll(".marlo-row, tr, .badge-item")
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 14, stagger: 0.025, delay: 0.22 })
      }
    },
    [avatarStyle, badgeFrame],
  )
  const activeBadge =
    badges.find((badge) => badge.id === badgeFrame) || badges[0]

  const [studentName, setStudentName] = useState("Đang tải hồ sơ...")
  const [studentCode, setStudentCode] = useState("—")
  const [studentEmail, setStudentEmail] = useState("—")
  const [selectedTitle, setSelectedTitle] = useState("CodeMind Learner")
  const [expPoints, setExpPoints] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [scores, setScores] = useState<number[]>([75, 68, 78, 72, 80])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [repoUrl, setRepoUrl] = useState("")
  const [commitsCount, setCommitsCount] = useState(0)
  const [cleanCodePct, setCleanCodePct] = useState(0)
  const [plagiarismFlags, setPlagiarismFlags] = useState(0)
  const [enrolledCoursesCount, setEnrolledCoursesCount] = useState(0)
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCellInput[]>([])
  const [heatmapTotals, setHeatmapTotals] = useState<{
    commits: number
    activities: number
  }>({
    commits: 0,
    activities: 0,
  })

  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur))
    }, 3200)
  }

  useEffect(() => {
    let active = true
    const loadProfile = () => {
      fetchStudentLearningOverview().then((data) => {
        if (!active || !data) return
        if (data.user?.name) setStudentName(data.user.name)
        if (data.user?.code) setStudentCode(data.user.code)
        if (data.user?.email) setStudentEmail(data.user.email)
        if (data.profile?.selected_title)
          setSelectedTitle(data.profile.selected_title)
        if (typeof data.profile?.exp_points === "number")
          setExpPoints(data.profile.exp_points)
        if (typeof data.profile?.current_streak === "number")
          setStreakDays(data.profile.current_streak)
        if (typeof data.profile?.longest_streak === "number")
          setLongestStreak(data.profile.longest_streak)
        const r = data.profile?.radar
        if (r) {
          setScores([
            Math.round(r.algorithm ?? 75),
            Math.round(r.debugging ?? 68),
            Math.round(r.cleancode ?? 78),
            Math.round(r.teamwork ?? 72),
            Math.round(r.defense ?? 80),
          ])
        }
        if (Array.isArray(data.achievements)) {
          setAchievements(data.achievements)
        }
        if (data.github_summary) {
          setRepoUrl(data.github_summary.repo_url || "")
          setCommitsCount(data.github_summary.commits_count || 0)
          setCleanCodePct(data.github_summary.clean_code_pct || 0)
          setPlagiarismFlags(data.github_summary.plagiarism_flags || 0)
          setEnrolledCoursesCount(
            data.github_summary.enrolled_courses_count || 0,
          )
        }
        if (data.activity_heatmap) {
          setHeatmapCells(data.activity_heatmap.cells || [])
          setHeatmapTotals({
            commits: data.activity_heatmap.total_commits || 0,
            activities: data.activity_heatmap.total_activities || 0,
          })
        }
      })
    }
    loadProfile()
    window.addEventListener("codemind-xp-updated", loadProfile)
    return () => {
      active = false
      window.removeEventListener("codemind-xp-updated", loadProfile)
    }
  }, [])

  const leagueName =
    expPoints >= 3000
      ? "Vàng"
      : expPoints >= 1500
        ? "Bạc"
        : expPoints >= 500
          ? "Đồng"
          : "Tân binh"
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const nextTierXp =
    expPoints >= 3000
      ? 5000
      : expPoints >= 1500
        ? 3000
        : expPoints >= 500
          ? 1500
          : 500
  const currentTierBaseXp =
    expPoints >= 3000
      ? 3000
      : expPoints >= 1500
        ? 1500
        : expPoints >= 500
          ? 500
          : 0
  const xpProgressPct = Math.min(
    100,
    Math.max(
      5,
      Math.round(
        ((expPoints - currentTierBaseXp) / (nextTierXp - currentTierBaseXp)) *
          100,
      ),
    ),
  )

  // RADAR MATH (5 vertices, symmetric pentagon, centered at 120, 120)
  const CX = 120
  const CY = 120
  const MAX_R = 75
  const angles = [-90, -18, 54, 126, 198] // 5 vertices in degrees

  const getCoordinates = (index: number, score: number) => {
    const angleRad = (angles[index] * Math.PI) / 180
    const radius = (Math.max(10, Math.min(100, score)) / 100) * MAX_R
    const x = CX + radius * Math.cos(angleRad)
    const y = CY + radius * Math.sin(angleRad)
    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      str: `${x.toFixed(1)},${y.toFixed(1)}`,
    }
  }

  const radarPolygonPoints = scores
    .map((score, i) => getCoordinates(i, score).str)
    .join(" ")

  const handleSelectTitle = async (title: string) => {
    setSelectedTitle(title)
    try {
      const res = await updateStudentTitleApi(title)
      if (res?.success) {
        showToast(`🎉 Đã trang bị danh hiệu: ${title}`)
      } else {
        showToast(`Đã chọn danh hiệu: ${title}`)
      }
    } catch {
      showToast(`Đã áp dụng danh hiệu: ${title}`)
    }
  }

  const handleApplyThemeLocal = (themeId: BackgroundTheme) => {
    if (onApplyBackgroundTheme) {
      onApplyBackgroundTheme(themeId)
      showToast(`🎨 Đã áp dụng giao diện nền: ${themeId}`)
    }
  }

  const handleApplyAvatarLocal = (avatarId: AvatarStyle) => {
    onApplyAvatar(avatarId)
    showToast(`👤 Đã áp dụng avatar đại diện: ${avatarId}`)
  }

  const handleApplyBadgeLocal = (badgeId: BadgeFrame) => {
    onApplyBadge(badgeId)
    showToast(`🏅 Đã áp dụng khung huy hiệu: ${badgeId}`)
  }

  return (
    <div
      ref={profileRef}
      className="min-h-full p-5 space-y-6 text-slate-800 dark:text-slate-200"
    >
      {/* PROFILE HERO HEADER */}
      <header className="marlo-card-1 profile-hero bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <span
              className={`student-avatar student-avatar-${avatarStyle} flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black shadow-md border-2 border-white dark:border-slate-800 shrink-0`}
            >
              {avatarLabel[avatarStyle]}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <UserRound size={13} />
                <span>Hồ sơ năng lực học viên</span>
              </div>
              <MarloTitle
                text={studentName}
                className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#62656b] dark:text-[#a0a3a9] mt-1 font-medium">
                <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                  {selectedTitle}
                </span>
                <span>·</span>
                <span>
                  MSSV:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {studentCode}
                  </strong>
                </span>
                <span>·</span>
                <span>{enrolledCoursesCount} học phần đang mở</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Award size={11} />
                  {activeBadge.name}
                </span>
                <span className="rounded-full border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động (Online)
                </span>
              </div>
            </div>
          </div>

          {/* QUICK METRICS */}
          <div className="flex flex-col gap-2 shrink-0 self-start md:self-auto min-w-[280px]">
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: (
                    <Star
                      size={16}
                      className="text-amber-500 fill-amber-500/20"
                    />
                  ),
                  value: <MarloNumber value={expPoints} durationMs={1200} />,
                  label: "Tổng XP",
                  desc: "Kinh nghiệm",
                },
                {
                  icon: (
                    <Flame
                      size={16}
                      className="text-orange-500 fill-orange-500/20"
                    />
                  ),
                  value: <MarloNumber value={streakDays} durationMs={1000} />,
                  label: "Chuỗi Streak",
                  desc: `Kỷ lục: ${longestStreak}d`,
                },
                {
                  icon: (
                    <Trophy
                      size={16}
                      className="text-yellow-500 fill-yellow-500/20"
                    />
                  ),
                  value: leagueName,
                  label: "Hạng League",
                  desc: `${expPoints}/${nextTierXp} XP`,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="marlo-row rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-center shadow-inner"
                >
                  <div className="mx-auto mb-1 flex justify-center">
                    {item.icon}
                  </div>
                  <div className="text-sm font-black text-slate-950 dark:text-white leading-tight">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {item.label}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* EXP Progress to Next Tier */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 px-3 text-[10px]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-500">
                  Tiến trình lên hạng{" "}
                  {leagueName === "Vàng" ? "Cao thủ" : "tiếp theo"}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {xpProgressPct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
                  style={{ width: `${xpProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CORE SECTIONS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (8 cols): Biểu đồ Radar 5 kỹ năng, GitHub commits, Thành tựu & Danh hiệu */}
        <section className="marlo-card-2 lg:col-span-8 space-y-5">
          {/* SKILL RADAR 5 CHỈ SỐ & GITHUB ACTIVITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG RADAR CHART (5 ĐỈNH CÂN XỨNG) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-blue-600" />
                  <span>Biểu đồ Radar 5 Kỹ năng AI</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  Chuẩn Socratic AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mb-2 w-full">
                Tổng hợp thực tế từ kết quả chấm bài Code Lab, lịch sử gỡ lỗi và
                phản biện đồ án.
              </p>

              {/* RADAR SVG CONTAINER */}
              <div className="relative w-56 h-56 flex items-center justify-center my-1">
                <svg
                  viewBox="0 0 240 240"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <radialGradient
                      id="radarAreaGradient"
                      cx="50%"
                      cy="50%"
                      r="50%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#3B82F6"
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="100%"
                        stopColor="#6366F1"
                        stopOpacity="0.15"
                      />
                    </radialGradient>
                    <filter
                      id="radarGlow"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="1"
                        stdDeviation="2"
                        floodColor="#3B82F6"
                        floodOpacity="0.5"
                      />
                    </filter>
                  </defs>

                  {/* Concentric Background Polygons */}
                  {[20, 40, 60, 80, 100].map((step) => {
                    const polyPts = angles
                      .map((_, i) => {
                        const r = (step / 100) * MAX_R
                        const rad = (angles[i] * Math.PI) / 180
                        return `${(CX + r * Math.cos(rad)).toFixed(1)},${(CY + r * Math.sin(rad)).toFixed(1)}`
                      })
                      .join(" ")
                    return (
                      <polygon
                        key={step}
                        points={polyPts}
                        fill={
                          step === 100 ? "rgba(148, 163, 184, 0.04)" : "none"
                        }
                        stroke="rgba(148, 163, 184, 0.22)"
                        strokeWidth="1"
                        strokeDasharray={step < 100 ? "2,2" : undefined}
                      />
                    )
                  })}

                  {/* 5 Axis Radial Lines */}
                  {angles.map((angle, i) => {
                    const rad = (angle * Math.PI) / 180
                    const x = CX + MAX_R * Math.cos(rad)
                    const y = CY + MAX_R * Math.sin(rad)
                    return (
                      <line
                        key={i}
                        x1={CX}
                        y1={CY}
                        x2={x}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.28)"
                        strokeWidth="1"
                      />
                    )
                  })}

                  {/* Data Area Polygon */}
                  <polygon
                    points={radarPolygonPoints}
                    fill="url(#radarAreaGradient)"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                    filter="url(#radarGlow)"
                  />

                  {/* Vertex Points & Glow Dots */}
                  {scores.map((score, i) => {
                    const pt = getCoordinates(i, score)
                    return (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#3B82F6"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                      </g>
                    )
                  })}

                  {/* Skill Labels & Values */}
                  {SKILL_METRICS.map((skill, i) => {
                    const rad = (angles[i] * Math.PI) / 180
                    const labelR = MAX_R + 24
                    const lx = CX + labelR * Math.cos(rad)
                    const ly = CY + labelR * Math.sin(rad)
                    return (
                      <g key={skill.key} className="text-center">
                        <text
                          x={lx}
                          y={ly - 4}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                        >
                          {skill.shortName}
                        </text>
                        <text
                          x={lx}
                          y={ly + 8}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[9px] font-black fill-blue-600 dark:fill-blue-400"
                        >
                          {scores[i]}%
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Quick AI Evaluation Note */}
              <div className="w-full mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Đánh giá AI:{" "}
                </span>
                Năng lực{" "}
                <strong className="text-blue-600 dark:text-blue-400">
                  Phản biện AI ({scores[4]}%)
                </strong>{" "}
                và{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  Clean Code ({scores[2]}%)
                </strong>{" "}
                đạt mức Giỏi. Cần tiếp tục luyện thêm các ca biên gỡ lỗi
                (Debugging).
              </div>
            </div>

            {/* GITHUB INTEGRITY & REPO STATS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Trực quan hóa đóng góp GitHub
              </h2>
              <div className="flex items-center gap-2 min-w-0">
                <GitFork
                  size={18}
                  className="text-slate-800 dark:text-white shrink-0"
                />
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
                  <span className="text-xs font-semibold text-slate-500">
                    Chưa liên kết kho GitHub
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs leading-5">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck
                    size={14}
                    className="text-emerald-500 shrink-0"
                  />
                  <span>
                    Chỉ số Clean Code trung bình:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {cleanCodePct}%
                    </strong>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <Code size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Đóng góp thực tế:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {commitsCount} commits
                    </strong>{" "}
                    trên dự án, {plagiarismFlags} cảnh báo đạo văn.
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

          {/* DETAILED 5 SKILL BREAKDOWN LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={14} className="text-blue-600" />
                <span>Chi tiết 5 Chỉ số Năng lực Kỹ thuật</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">
                Hệ thống đo lường khách quan tự động
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {SKILL_METRICS.map((skill, idx) => {
                const score = scores[idx] || 0
                const IconComponent = skill.icon
                const tierLabel =
                  score >= 85
                    ? "Xuất sắc"
                    : score >= 70
                      ? "Khá giỏi"
                      : score >= 50
                        ? "Đạt chuẩn"
                        : "Cần rèn luyện"
                return (
                  <div key={skill.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1 rounded-md border ${skill.badgeCls}`}
                        >
                          <IconComponent size={13} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {skill.name}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 font-normal hidden sm:inline">
                            {skill.desc}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${skill.badgeCls}`}
                        >
                          {tierLabel}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white w-9 text-right">
                          {score}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${skill.barCls}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CHOOSE HONORED TITLE SELECTOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Kho Danh hiệu Lập trình viên (Current Title)</span>
              </h2>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Đang dùng: {selectedTitle}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Chọn danh hiệu hiển thị trang trọng trên hồ sơ, bảng xếp hạng lớp
              và chứng chỉ tốt nghiệp.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {AVAILABLE_TITLES.map((t) => {
                const isSelected = selectedTitle === t.title
                const IconComp = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTitle(t.title)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer text-xs ${
                      isSelected
                        ? "border-blue-400 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-400"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <IconComp size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-bold ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {t.title}
                        </span>
                        {isSelected && (
                          <Check size={14} className="text-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ACHIEVEMENTS COLLECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy
                  size={14}
                  className="text-yellow-500 fill-yellow-500/25"
                />
                <span>Bộ sưu tập thành tựu học tập</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {unlockedCount} / {achievements.length} Đã mở khóa
              </span>
            </div>

            {achievements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Đang đồng bộ danh hiệu từ hệ thống...
              </div>
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
                    <div
                      className={`p-2.5 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 ${getAchievementStyle(
                        ach.id,
                        ach.unlocked,
                      )}`}
                    >
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
                        <span
                          className={`font-bold ${
                            ach.unlocked
                              ? "text-slate-800 dark:text-slate-100"
                              : "text-slate-500"
                          }`}
                        >
                          {ach.name}
                        </span>
                        {ach.unlocked && (
                          <Check size={12} className="text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-4">
                        {ach.desc}
                      </p>
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

        {/* RIGHT COLUMN (4 cols): Cấu hình giao diện cá nhân (Theme, Avatar, Badge, Thông tin cá nhân) */}
        <section className="marlo-card-3 lg:col-span-4 space-y-4">
          {/* THEME NỀN WORKSPACE */}
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
                  const active = bg.id === backgroundTheme
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => handleApplyThemeLocal(bg.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition cursor-pointer text-xs ${
                        active
                          ? "border-blue-400 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/25 font-bold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span
                        className={`h-8 w-8 shrink-0 rounded-lg border border-slate-300/60 dark:border-slate-700 ${bg.previewCls}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {bg.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {bg.desc}
                        </div>
                      </div>
                      {active && (
                        <Check
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* CHỌN AVATAR ĐẠI DIỆN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Chọn avatar sử dụng
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Hiển thị đồng bộ trong dashboard và bảng xếp hạng lớp học.
              </p>
            </div>

            <div className="space-y-2">
              {avatars.map((avatar) => {
                const active = avatar.id === avatarStyle
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleApplyAvatarLocal(avatar.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition cursor-pointer text-xs ${
                      active
                        ? "border-blue-400 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`student-avatar student-avatar-${avatar.id} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black`}
                    >
                      {avatarLabel[avatar.id]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {avatar.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {avatar.desc}
                      </div>
                    </div>
                    {active && (
                      <Check size={14} className="shrink-0 text-emerald-600" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CHỌN KHUNG HUY HIỆU */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Khung huy hiệu đạt được
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Gắn kèm huy hiệu thể hiện danh tiếng lập trình viên.
              </p>
            </div>

            <div className="space-y-2">
              {badges.map((badge) => {
                const active = badge.id === badgeFrame
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => handleApplyBadgeLocal(badge.id)}
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
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {badge.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {badge.desc}
                      </div>
                    </div>
                    {active && (
                      <Check size={14} className="shrink-0 text-emerald-600" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* THÔNG TIN CÁ NHÂN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Thông tin học viên
            </h2>
            <div className="space-y-2 text-xs">
              {[
                ["Họ và tên", studentName],
                ["Mã học viên", studentCode],
                ["Email", studentEmail],
                ["Vai trò", "Học viên (Student)"],
                ["Múi giờ hệ thống", "Asia/Ho_Chi_Minh (UTC+7)"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-2.5 flex justify-between items-center gap-2 shadow-inner"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">
                    {label}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {onOpenSecurity && (
              <button
                type="button"
                onClick={onOpenSecurity}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <ShieldCheck size={14} />
                <span>Quản lý Bảo mật, 2FA &amp; Thiết bị</span>
                <ChevronRight size={13} className="ml-auto" />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xl transition-all duration-300">
          <Sparkles
            size={16}
            className="text-amber-500 animate-pulse shrink-0"
          />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}

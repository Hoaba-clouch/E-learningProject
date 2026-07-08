import { Award, Check, Flame, Star, Trophy, UserRound, GitFork, ShieldCheck, Code, Brain, Zap } from "lucide-react";
import type { AvatarStyle, BadgeFrame } from "../App";

interface Props {
  avatarStyle: AvatarStyle;
  badgeFrame: BadgeFrame;
  onApplyAvatar: (avatar: AvatarStyle) => void;
  onApplyBadge: (badge: BadgeFrame) => void;
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

interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  xpReward: number;
}

const mockAchievements: Achievement[] = [
  { id: "ach-1", name: "Thần tốc (Speedster)", desc: "Đọc xong lý thuyết bài giảng dưới 5 phút.", unlocked: true, xpReward: 100 },
  { id: "ach-2", name: "Trác tuyệt (Slayer)", desc: "Đạt điểm đúng 100% trong lần đầu làm quiz.", unlocked: true, xpReward: 200 },
  { id: "ach-3", name: "Siêu trí tuệ (Master Mind)", desc: "Sơ đồ tự vẽ khớp trên 95% với sơ đồ chuẩn của giảng viên.", unlocked: true, xpReward: 300 },
  { id: "ach-4", name: "Chiến binh code sạch", desc: "Nộp bài lab GitHub đạt điểm chính trực (Integrity) >90%.", unlocked: true, xpReward: 200 },
  { id: "ach-5", name: "OOP Conqueror", desc: "Đọc và hoàn thành mọi bài học & bài tập của khóa học OOP.", unlocked: false, xpReward: 500 },
  { id: "ach-6", name: "Debug Master", desc: "Sửa lỗi thành công 5 lỗi biên dịch logic trong Code Lab.", unlocked: false, xpReward: 250 }
];

const getAchievementStyle = (id: string, unlocked: boolean) => {
  if (!unlocked) {
    return "bg-slate-100 dark:bg-slate-808/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800";
  }
  switch (id) {
    case "ach-1": // Thần tốc - Flame (Orange)
      return "bg-orange-50 dark:bg-orange-955/35 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30";
    case "ach-2": // Trác tuyệt - Award (Amber)
      return "bg-amber-50 dark:bg-amber-955/35 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
    case "ach-3": // Siêu trí tuệ - Brain (Purple)
      return "bg-purple-50 dark:bg-purple-955/35 text-purple-650 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30";
    case "ach-4": // Code sạch - ShieldCheck (Emerald)
      return "bg-emerald-50 dark:bg-emerald-955/35 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30";
    case "ach-5": // OOP Conqueror - Trophy (Yellow)
      return "bg-yellow-50 dark:bg-yellow-955/35 text-yellow-600 dark:text-yellow-450 border border-yellow-100 dark:border-yellow-900/30";
    case "ach-6": // Debug Master - Zap (Sky)
      return "bg-sky-50 dark:bg-sky-955/35 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30";
    default:
      return "bg-blue-50 dark:bg-blue-955/35 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30";
  }
};

export default function StudentProfile({ avatarStyle, badgeFrame, onApplyAvatar, onApplyBadge }: Props) {
  const activeBadge = badges.find((badge) => badge.id === badgeFrame)!;

  // Mock data for GitHub Contributions Grid (12 weeks x 7 days)
  const githubWeeks = Array.from({ length: 14 }, () => 
    Array.from({ length: 7 }, () => {
      // Simulate higher contribution weights in recent weeks
      const rand = Math.random();
      if (rand > 0.75) return 3; // dark green
      if (rand > 0.5) return 2;  // medium green
      if (rand > 0.2) return 1;  // light green
      return 0;                  // grey
    })
  );

  // SVG Radar Chart Path computation
  // Center is (100, 100). Max radius is 70.
  // 5 Axes: OOP Theory (90%), Coding Style (85%), Git Flow (75%), Mindmap Logic (92%), Debugging (65%)
  const scores = [90, 85, 75, 92, 65];
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
    <div className="min-h-full p-5 space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      {/* PROFILE HERO HEADER */}
      <header className="profile-hero bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        {/* Decorative corner glow */}
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
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Nguyễn Văn A</h1>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-medium">OOP - Nhóm 01 · Visual/Kinesthetic learner</p>
              
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-955/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-450">
                  {activeBadge.name}
                </span>
                <span className="rounded-full border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-955/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-450">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0 self-start md:self-auto">
            {[
              [<Star size={16} />, "3,240", "XP"],
              [<Flame size={16} />, "14", "streak"],
              [<Trophy size={16} />, "Bạc", "league"],
            ].map(([icon, value, label], idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-center min-w-[75px] shadow-inner">
                <div className="mx-auto mb-1 flex justify-center text-blue-600 dark:text-blue-400">{icon}</div>
                <div className="text-sm font-black text-slate-950 dark:text-white">{value}</div>
                <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CORE SECTIONS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN (9 cols): Skill analysis, GitHub commits, Achievements */}
        <section className="lg:col-span-8 space-y-5">
          
          {/* SKILL RADAR CHART & PROFILE INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SVG RADAR CHART */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-full mb-1">Biểu đồ kỹ năng AI</h2>
              <span className="text-[10px] text-slate-500 mb-4 w-full">Thực tế hóa thế mạnh từ Mindmap và Lab nộp</span>
              
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Background circles */}
                  {[20, 40, 60, 80, 100].map((step) => (
                    <polygon
                      key={step}
                      points={angles.map((_, i) => getCoordinates(i, step)).join(" ")}
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.15)"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Axes lines */}
                  {angles.map((angle, i) => {
                    const angleRad = (angle - 90) * (Math.PI / 180);
                    const x = 100 + 70 * Math.cos(angleRad);
                    const y = 100 + 70 * Math.sin(angleRad);
                    return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />;
                  })}
                  
                  {/* Skill scores polygon */}
                  <polygon
                    points={radarPoints}
                    fill="rgba(59, 130, 246, 0.22)"
                    stroke="rgba(59, 130, 246, 0.85)"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                </svg>

                {/* Radar Chart Labels */}
                <div className="absolute top-0 text-[9px] font-bold text-slate-500 dark:text-slate-400">Lý thuyết ({scores[0]}%)</div>
                <div className="absolute right-0 top-1/3 text-[9px] font-bold text-slate-500 dark:text-slate-400">Code sạch ({scores[1]}%)</div>
                <div className="absolute right-2 bottom-4 text-[9px] font-bold text-slate-500 dark:text-slate-400">Git Flow ({scores[2]}%)</div>
                <div className="absolute left-2 bottom-4 text-[9px] font-bold text-slate-500 dark:text-slate-400">Sơ đồ ({scores[3]}%)</div>
                <div className="absolute left-0 top-1/3 text-[9px] font-bold text-slate-500 dark:text-slate-400">Gỡ lỗi ({scores[4]}%)</div>
              </div>
            </div>

            {/* GITHUB INTEGRITY LAB CHECK */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Trực quan hóa đóng góp GitHub</h2>
              <div className="flex items-center gap-2">
                <GitFork size={20} className="text-slate-800 dark:text-white" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">github.com/nguyen-van-a</span>
              </div>

              <div className="space-y-2 text-xs leading-5">
                <div className="flex items-center gap-2 text-slate-650 dark:text-slate-350">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Điểm uy tín Code sạch trung bình: **91%**</span>
                </div>
                <div className="flex items-start gap-2 text-slate-655 dark:text-slate-400">
                  <Code size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>Cam kết đóng góp: 18 commits tuần qua, 0 đạo văn.</span>
                </div>
              </div>

              {/* Mini Contribution Matrix Chart */}
              <div className="pt-2">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-1.5 uppercase">
                  <span>Commit Calendar (14 tuần qua)</span>
                  <span>45 đóng góp</span>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {githubWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                      {week.map((val, dIdx) => (
                        <div
                          key={dIdx}
                          className="h-2 w-2 rounded-sm"
                          style={{
                            backgroundColor:
                              val === 3 ? "#15803d" : val === 2 ? "#22c55e" : val === 1 ? "#86efac" : "rgba(148, 163, 184, 0.15)"
                          }}
                          title={`${val} commits`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ACHIEVEMENTS COLLECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-yellow-500 fill-yellow-500/25" />
                Bộ sưu tập thành tựu đã mở khóa
              </h2>
              <span className="text-[10px] font-bold text-slate-400">4 / 6 Đã mở khóa</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {mockAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-xl border flex gap-3 text-xs transition duration-200 ${
                    ach.unlocked
                      ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/5 dark:bg-blue-955/10"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 opacity-60"
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
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-4">{ach.desc}</p>
                    <div className="text-[9px] font-bold text-yellow-600 dark:text-yellow-450 flex items-center gap-1 mt-0.5">
                      <Star size={10} className="fill-current" />
                      <span>+{ach.xpReward} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (4 cols): Profile Settings, Customize skin */}
        <section className="lg:col-span-4 space-y-4">
          {/* PROFILE EDIT SKIN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn avatar sử dụng</h2>
              <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-1">Sẽ tự động hiển thị trong dashboard và bảng xếp hạng.</p>
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
                        ? "border-blue-400 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-955/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className={`student-avatar student-avatar-${avatar.id} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black`}>
                      {avatarLabel[avatar.id]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{avatar.name}</div>
                      <div className="text-[10px] text-slate-405 dark:text-slate-500 truncate">{avatar.desc}</div>
                    </div>
                    {active && <Check size={14} className="shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHOOSE DISPLAY TITLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn danh hiệu khoe profile</h2>
              <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-1">Đính kèm hiển thị bên cạnh tên của học viên.</p>
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
                        ? "border-amber-400 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-955/20 font-bold"
                        : "border-slate-200 dark:border-slate-808 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-amber-300">
                      <Award size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{badge.name}</div>
                      <div className="text-[10px] text-slate-405 dark:text-slate-500 truncate">{badge.desc}</div>
                    </div>
                    {active && <Check size={14} className="shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PERSONAL INFO CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thông tin cá nhân</h2>
            <div className="space-y-2 text-xs">
              {[
                ["Mã học viên", "STU-OOP-001"],
                ["Email", "nguyenvana@student.vn"],
                ["Lớp đăng ký", "OOP - Nhóm 01"],
                ["Vai trò", "Học viên"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-808 bg-slate-50/40 dark:bg-slate-950 p-2.5 flex justify-between items-center gap-2 shadow-inner">
                  <span className="text-slate-405 dark:text-slate-500 font-bold">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

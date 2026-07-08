import { useState } from "react";
import {
  Bot,
  Check,
  Map,
  MessageSquare,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserRound,
  Trophy,
  Zap,
  TrendingUp,
  Clock
} from "lucide-react";
import type { AvatarStyle, BackgroundTheme, BadgeFrame, ChatSkin, MentorMascot, SkillMapSkin } from "../App";

interface Props {
  activeTheme: BackgroundTheme;
  activeAvatar: AvatarStyle;
  activeMentor: MentorMascot;
  activeChatSkin: ChatSkin;
  activeMapSkin: SkillMapSkin;
  activeBadge: BadgeFrame;
  onApplyTheme: (theme: BackgroundTheme) => void;
  onApplyAvatar: (avatar: AvatarStyle) => void;
  onApplyMentor: (mentor: MentorMascot) => void;
  onApplyChatSkin: (skin: ChatSkin) => void;
  onApplyMapSkin: (skin: SkillMapSkin) => void;
  onApplyBadge: (badge: BadgeFrame) => void;
}

type ShopCategory = "theme" | "avatar" | "mentor" | "chat" | "map" | "badge";
type ShopItem = {
  id: string;
  category: ShopCategory;
  name: string;
  desc: string;
  cost: number;
  tag: string;
  preview: string;
  levelReq?: number;
};

const shopItems: ShopItem[] = [
  { id: "diagonal", category: "theme", name: "Diagonal Light", desc: "Nền sáng lưới chéo nhẹ, mặc định cho dashboard.", cost: 0, tag: "Default", preview: "shop-preview-diagonal", levelReq: 1 },
  { id: "blueprint", category: "theme", name: "Blueprint Lab", desc: "Bản vẽ kỹ thuật cho mindmap và code lab.", cost: 420, tag: "Study", preview: "shop-preview-blueprint", levelReq: 2 },
  { id: "matrix", category: "theme", name: "Matrix Focus", desc: "Tông xanh tối cho phiên học tập trung.", cost: 640, tag: "Dark", preview: "shop-preview-matrix", levelReq: 3 },
  { id: "sunrise", category: "theme", name: "Sunrise Notes", desc: "Tông ấm cho đọc lý thuyết và ghi chú.", cost: 520, tag: "Warm", preview: "shop-preview-sunrise", levelReq: 2 },
  { id: "graphite", category: "theme", name: "Graphite Pro", desc: "Crosshatch tối, mạnh và kỹ thuật.", cost: 780, tag: "Pro", preview: "shop-preview-graphite", levelReq: 4 },

  { id: "initials", category: "avatar", name: "Initial A", desc: "Avatar chữ cái gọn gàng.", cost: 0, tag: "Basic", preview: "shop-avatar-initials", levelReq: 1 },
  { id: "pixel", category: "avatar", name: "Pixel Learner", desc: "Avatar pixel cho cảm giác game.", cost: 220, tag: "Pixel", preview: "shop-avatar-pixel", levelReq: 2 },
  { id: "coder", category: "avatar", name: "Coder Mark", desc: "Dấu hiệu coder cho profile học lập trình.", cost: 260, tag: "Code", preview: "shop-avatar-coder", levelReq: 2 },
  { id: "robot", category: "avatar", name: "Robot Buddy", desc: "Avatar robot nhỏ đi cùng AI mentor.", cost: 320, tag: "AI", preview: "shop-avatar-robot", levelReq: 3 },
  { id: "silver", category: "avatar", name: "Silver League", desc: "Avatar theo league Bạc.", cost: 380, tag: "League", preview: "shop-avatar-silver", levelReq: 4 },

  { id: "mino", category: "mentor", name: "Mino", desc: "Linh vật thân thiện, nhắc nhẹ từng bước.", cost: 0, tag: "Friendly", preview: "shop-mentor-mino", levelReq: 1 },
  { id: "nova", category: "mentor", name: "Nova", desc: "Mentor nghiêm túc, tập trung mục tiêu.", cost: 360, tag: "Focus", preview: "shop-mentor-nova", levelReq: 2 },
  { id: "byte", category: "mentor", name: "Byte", desc: "Mentor vui tính, hợp học qua nhiệm vụ nhỏ.", cost: 360, tag: "Fun", preview: "shop-mentor-byte", levelReq: 2 },
  { id: "sage", category: "mentor", name: "Sage", desc: "Mentor Socratic, hay hỏi ngược để tự hiểu.", cost: 480, tag: "Socratic", preview: "shop-mentor-sage", levelReq: 3 },
  { id: "luna", category: "mentor", name: "Mecha-Luna", desc: "Trợ lý Mecha thông minh siêu ngầu, phân tích logic chuẩn xác.", cost: 800, tag: "Anime / Mecha", preview: "shop-mentor-luna", levelReq: 3 },
  { id: "kuro", category: "mentor", name: "Kuro (Neko)", desc: "Trợ lý mèo ninja đen dễ thương, phản xạ nhanh nhạy với lỗi cú pháp.", cost: 950, tag: "Cute / Neko", preview: "shop-mentor-kuro", levelReq: 4 },
  { id: "ignis", category: "mentor", name: "Ignis (Dragon)", desc: "Linh thú rồng lửa ngầu lòi, thúc đẩy tinh thần học tập bùng cháy.", cost: 1200, tag: "Cool / Flame", preview: "shop-mentor-ignis", levelReq: 5 },
  { id: "sylph", category: "mentor", name: "Sylph (Fairy)", desc: "Trợ lý tiên rừng thanh bình, giảng giải lý thuyết êm dịu dễ tiếp thu.", cost: 1500, tag: "Kawaii / Nature", preview: "shop-mentor-sylph", levelReq: 6 },

  { id: "classic", category: "chat", name: "Classic Chat", desc: "Sạch, sáng, dễ đọc.", cost: 0, tag: "Clean", preview: "shop-chat-classic", levelReq: 1 },
  { id: "terminal", category: "chat", name: "Terminal Chat", desc: "Khung chat đen, vibe lập trình.", cost: 300, tag: "CLI", preview: "shop-chat-terminal", levelReq: 2 },
  { id: "neon", category: "chat", name: "Neon Chat", desc: "Glow xanh tím cho AI panel.", cost: 420, tag: "Glow", preview: "shop-chat-neon", levelReq: 3 },
  { id: "paper", category: "chat", name: "Paper Chat", desc: "Nhẹ như notebook, hợp đọc dài.", cost: 260, tag: "Notes", preview: "shop-chat-paper", levelReq: 2 },

  { id: "campaign", category: "map", name: "Campaign Route", desc: "Map chinh phục mặc định.", cost: 0, tag: "Default", preview: "shop-map-campaign", levelReq: 1 },
  { id: "space", category: "map", name: "Space Map", desc: "Skill map kiểu vũ trụ.", cost: 440, tag: "Space", preview: "shop-map-space", levelReq: 3 },
  { id: "circuit", category: "map", name: "Circuit Board", desc: "Đường học như mạch điện.", cost: 440, tag: "Tech", preview: "shop-map-circuit", levelReq: 3 },
  { id: "dungeon", category: "map", name: "Dungeon Path", desc: "Cảm giác vượt ải boss.", cost: 520, tag: "Game", preview: "shop-map-dungeon", levelReq: 4 },
  { id: "route-blueprint", category: "map", name: "Blueprint Route", desc: "Map kiểu bản thiết kế.", cost: 420, tag: "Plan", preview: "shop-map-blueprint", levelReq: 2 },

  { id: "streak", category: "badge", name: "14-day Streak", desc: "Khung danh hiệu chăm học.", cost: 0, tag: "Streak", preview: "shop-badge-streak", levelReq: 1 },
  { id: "quiz", category: "badge", name: "Quiz Slayer", desc: "Dành cho người thích thử thách quiz.", cost: 240, tag: "Quiz", preview: "shop-badge-quiz", levelReq: 2 },
  { id: "mindmap", category: "badge", name: "Mindmap Builder", desc: "Danh hiệu cho người hay vẽ sơ đồ.", cost: 240, tag: "Map", preview: "shop-badge-mindmap", levelReq: 2 },
  { id: "rookie", category: "badge", name: "Code Lab Rookie", desc: "Khởi đầu đường code lab.", cost: 220, tag: "Code", preview: "shop-badge-rookie", levelReq: 2 },
  { id: "explorer", category: "badge", name: "OOP Explorer", desc: "Khung profile khám phá OOP.", cost: 320, tag: "OOP", preview: "shop-badge-explorer", levelReq: 3 },
];

const categoryMeta: Record<ShopCategory, { label: string; icon: React.ReactNode }> = {
  theme: { label: "Giao diện", icon: <Palette size={13} /> },
  avatar: { label: "Ảnh đại diện", icon: <UserRound size={13} /> },
  mentor: { label: "Mascot trợ lý", icon: <Bot size={13} /> },
  chat: { label: "Khung trò chuyện", icon: <MessageSquare size={13} /> },
  map: { label: "Bản đồ kỹ năng", icon: <Map size={13} /> },
  badge: { label: "Huy hiệu danh hiệu", icon: <ShieldCheck size={13} /> },
};

interface Quest {
  id: string;
  title: string;
  desc: string;
  xpReward: number;
  status: "available" | "claimable" | "claimed";
  progress: string;
}

export default function XPShop({
  activeTheme,
  activeAvatar,
  activeMentor,
  activeChatSkin,
  activeMapSkin,
  activeBadge,
  onApplyTheme,
  onApplyAvatar,
  onApplyMentor,
  onApplyChatSkin,
  onApplyMapSkin,
  onApplyBadge,
}: Props) {
  const [xp, setXp] = useState(3240);
  const [category, setCategory] = useState<ShopCategory>("theme");
  const [subTab, setSubTab] = useState<"store" | "quests">("store");
  const [owned, setOwned] = useState<Record<ShopCategory, string[]>>({
    theme: ["diagonal"],
    avatar: ["initials"],
    mentor: ["mino"],
    chat: ["classic"],
    map: ["campaign"],
    badge: ["streak"],
  });

  const [quests, setQuests] = useState<Quest[]>([
    { id: "q1", title: "🔥 Học tập liên tục (Daily Coding Streak)", desc: "Duy trì streak 14 ngày làm bài học hoặc quiz.", xpReward: 300, status: "claimable", progress: "14/14" },
    { id: "q2", title: "🧠 Master Mindmap (Sơ đồ tri thức)", desc: "Hoàn thành sơ đồ tư duy OOP chương 1 đạt độ chính xác >90%.", xpReward: 500, status: "claimable", progress: "94% khớp" },
    { id: "q3", title: "💻 GitHub Pioneer (Commit đầu tay)", desc: "Thực hiện thành công commit bài tập lớn OOP lên GitHub.", xpReward: 400, status: "claimed", progress: "Đã hoàn thành" },
    { id: "q4", title: "⚡ Học tập thần tốc (Fast Learner)", desc: "Đọc lý thuyết và hoàn thành quiz của 5 bài học trong tuần.", xpReward: 200, status: "available", progress: "3/5 bài học" }
  ]);

  const activeByCategory: Record<ShopCategory, string> = {
    theme: activeTheme,
    avatar: activeAvatar,
    mentor: activeMentor,
    chat: activeChatSkin,
    map: activeMapSkin,
    badge: activeBadge,
  };

  const apply = (item: ShopItem) => {
    if (!owned[item.category].includes(item.id)) {
      if (xp < item.cost) return;
      setXp((value) => value - item.cost);
      setOwned((value) => ({ ...value, [item.category]: [...value[item.category], item.id] }));
    }

    if (item.category === "theme") onApplyTheme(item.id as BackgroundTheme);
    if (item.category === "avatar") onApplyAvatar(item.id as AvatarStyle);
    if (item.category === "mentor") onApplyMentor(item.id as MentorMascot);
    if (item.category === "chat") onApplyChatSkin(item.id as ChatSkin);
    if (item.category === "map") onApplyMapSkin(item.id as SkillMapSkin);
    if (item.category === "badge") onApplyBadge(item.id as BadgeFrame);
  };

  const claimQuestReward = (questId: string, reward: number) => {
    setXp((prev) => prev + reward);
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, status: "claimed", progress: "Đã nhận" } : q))
    );
  };

  const activeItems = shopItems.filter((item) => item.category === category);
  const equipped = shopItems.find((item) => item.id === activeByCategory[category] && item.category === category);
  const userLevel = Math.floor(xp / 1000) + 1;
  const xpInCurrentLevel = xp % 1000;

  return (
    <div className="min-h-full p-5 space-y-6 animate-fade-in">
      {/* HEADER HERO AREA */}
      <header className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Glow vector backgrounds */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border border-white/10">
            <Trophy size={13} className="text-yellow-400 fill-yellow-400" />
            Personalization Hub
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cửa hàng phần thưởng XP</h1>
          <p className="text-sm text-slate-200">
            Hoàn thành nhiệm vụ nhận XP và mở khoá các vật phẩm trang trí hồ sơ cực độc đáo.
          </p>

          {/* Level progression bar */}
          <div className="pt-2 w-72 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>CẤP ĐỘ {userLevel}</span>
              <span>{xpInCurrentLevel} / 1000 XP</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full transition-all duration-300" style={{ width: `${xpInCurrentLevel / 10}%` }} />
            </div>
          </div>
        </div>

        {/* XP Wallet Widget */}
        <div className="relative z-10 bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3.5 shrink-0 self-start md:self-auto shadow-inner">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
            <Star size={24} className="text-white fill-white animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black text-yellow-300 tracking-tight">{xp.toLocaleString()}</div>
            <div className="text-xs text-slate-200 font-semibold tracking-wider uppercase mt-0.5">XP KHẢ DỤNG</div>
          </div>
        </div>
      </header>

      {/* SUBTABS BAR */}
      <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubTab("store")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === "store"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
          }`}
        >
          <ShoppingBag size={14} />
          Cửa hàng vật phẩm
        </button>
        <button
          onClick={() => setSubTab("quests")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === "quests"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 hover:text-slate-855 dark:hover:text-slate-200"
          }`}
        >
          <Zap size={14} />
          Nhiệm vụ nhận XP
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
        </button>
      </div>

      {/* SUBTAB 1: STORE ITEMS */}
      {subTab === "store" && (
        <div className="space-y-4">
          {/* CATEGORIES BUTTONS */}
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-1.5 flex gap-1 overflow-x-auto border border-slate-100 dark:border-slate-900/60 scrollbar-none">
            {(Object.keys(categoryMeta) as ShopCategory[]).map((id) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 cursor-pointer shrink-0 ${
                  category === id
                    ? "theme-primary-bg text-white shadow-lg shadow-blue-500/20 scale-[1.03]"
                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40"
                }`}
              >
                {categoryMeta[id].icon}
                {categoryMeta[id].label}
              </button>
            ))}
          </div>

          {/* ACTIVE EQUIPPED ITEM */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className={`shop-preview-mini shrink-0 rounded-lg ${equipped?.preview ?? ""}`} />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Đang kích hoạt: {categoryMeta[category].label}
                </span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{equipped?.name}</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-450">
              Đang áp dụng
            </span>
          </div>

          {/* GRID OF STORE ITEMS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeItems.map((item) => {
              const isOwned = owned[item.category].includes(item.id);
              const isActive = activeByCategory[item.category] === item.id;
              const isLevelLocked = userLevel < (item.levelReq || 1);
              const canAfford = xp >= item.cost;

              return (
                <div
                  key={`${item.category}-${item.id}`}
                  className={`rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group ${
                    isActive
                      ? "border-blue-400 dark:border-blue-900"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Preview Hero box */}
                  <div className={`relative h-28 ${item.preview} shrink-0`}>
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
                    <div className="absolute inset-x-3.5 bottom-3.5 flex items-center justify-between z-10">
                      <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm border border-slate-200/50">
                        {item.tag}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Level requirement lock overlay */}
                    {isLevelLocked && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-20">
                        <Clock size={20} className="text-yellow-400 mb-1" />
                        <span className="text-[10px] font-bold tracking-wider uppercase">
                          Yêu cầu cấp {item.levelReq}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details box */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</h2>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                        <Star size={14} className="fill-current" />
                        <span className="font-bold font-mono text-sm">{item.cost}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">XP</span>
                      </div>

                      {isLevelLocked ? (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                          Đã khóa
                        </span>
                      ) : isActive ? (
                        <span className="flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-450">
                          <Check size={13} />
                          Đang dùng
                        </span>
                      ) : (
                        <button
                          onClick={() => apply(item)}
                          disabled={!isOwned && !canAfford}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition border ${
                            isOwned
                              ? "bg-slate-950 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent cursor-pointer"
                              : canAfford
                              ? "bg-blue-600 hover:bg-blue-700 border-transparent cursor-pointer"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                          }`}
                        >
                          <ShoppingBag size={13} />
                          {isOwned ? "Áp dụng" : "Mua & dùng"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: QUEST HUB */}
      {subTab === "quests" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              Nhiệm vụ tuần này
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 leading-5">
              Tích cực tham gia vẽ mindmap và nộp bài lab để tích lũy XP. Điểm XP giúp nâng cấp độ học viên và mua skin hiếm.
            </p>
          </div>

          <div className="space-y-3">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className={`rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                  quest.status === "claimable"
                    ? "border-blue-300 dark:border-blue-900 bg-blue-50/10 dark:bg-blue-955/10 scale-[1.01]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{quest.title}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-5">{quest.desc}</p>
                  
                  {/* Progress subtext */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span>Tiến trình:</span>
                    <span className={quest.status === "claimable" ? "text-blue-600 dark:text-blue-400" : ""}>
                      {quest.progress}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Star size={13} className="fill-current" />
                    <span className="font-bold text-xs">+{quest.xpReward} XP</span>
                  </div>

                  {quest.status === "claimed" ? (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-505 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
                      Đã nhận
                    </span>
                  ) : quest.status === "claimable" ? (
                    <button
                      onClick={() => claimQuestReward(quest.id, quest.xpReward)}
                      className="flex items-center gap-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-3.5 py-2 text-xs font-bold shadow transition-all duration-150 animate-pulse cursor-pointer border border-yellow-300"
                    >
                      <Trophy size={13} className="fill-slate-900" />
                      Nhận thưởng
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 px-3 py-2 rounded-lg">
                      Đang thực hiện
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

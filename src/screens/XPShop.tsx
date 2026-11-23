import { useEffect, useState, useRef } from "react";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import {
  Award,
  Bot,
  Check,
  Lock,
  Map,
  MessageSquare,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Trophy,
  Unlock,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { AvatarStyle, BackgroundTheme, BadgeFrame, ChatSkin, MentorMascot, SkillMapSkin } from "../App";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import { claimXpQuestApi, fetchStudentLearningOverview, unlockXpRewardItem } from "../api";

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
  requiredXp: number;
  tag: string;
  preview: string;
};

const shopItems: ShopItem[] = [
  { id: "diagonal", category: "theme", name: "Diagonal Light", desc: "Nền sáng lưới chéo nhẹ, mặc định cho dashboard.", requiredXp: 0, tag: "Default", preview: "shop-preview-diagonal" },
  { id: "blueprint", category: "theme", name: "Blueprint Lab", desc: "Bản vẽ kỹ thuật cho mindmap và code lab.", requiredXp: 0, tag: "Study", preview: "shop-preview-blueprint" },
  { id: "matrix", category: "theme", name: "Matrix Focus", desc: "Lưới xanh kỹ thuật cho phiên học tập trung.", requiredXp: 0, tag: "Focus", preview: "shop-preview-matrix" },
  { id: "sunrise", category: "theme", name: "Sunrise Notes", desc: "Tông ấm dịu nhẹ cho đọc lý thuyết và ghi chú.", requiredXp: 0, tag: "Warm", preview: "shop-preview-sunrise" },
  { id: "graphite", category: "theme", name: "Graphite Pro", desc: "Đường chéo tinh gọn, tối giản chuẩn kỹ thuật.", requiredXp: 0, tag: "Pro", preview: "shop-preview-graphite" },

  { id: "initials", category: "avatar", name: "Initial A", desc: "Avatar chữ cái gọn gàng.", requiredXp: 0, tag: "Basic", preview: "shop-avatar-initials" },
  { id: "pixel", category: "avatar", name: "Pixel Learner", desc: "Avatar pixel cho cảm giác game.", requiredXp: 400, tag: "Pixel", preview: "shop-avatar-pixel" },
  { id: "coder", category: "avatar", name: "Coder Mark", desc: "Dấu hiệu coder cho profile học lập trình.", requiredXp: 800, tag: "Code", preview: "shop-avatar-coder" },
  { id: "robot", category: "avatar", name: "Robot Buddy", desc: "Avatar robot nhỏ đi cùng AI mentor.", requiredXp: 1500, tag: "AI", preview: "shop-avatar-robot" },
  { id: "silver", category: "avatar", name: "Silver League", desc: "Avatar theo league Bạc.", requiredXp: 2500, tag: "League", preview: "shop-avatar-silver" },

  { id: "mino", category: "mentor", name: "Mino", desc: "Linh vật thân thiện, nhắc nhẹ từng bước.", requiredXp: 0, tag: "Friendly", preview: "shop-mentor-mino" },
  { id: "nova", category: "mentor", name: "Nova", desc: "Mentor nghiêm túc, tập trung mục tiêu.", requiredXp: 600, tag: "Focus", preview: "shop-mentor-nova" },
  { id: "byte", category: "mentor", name: "Byte", desc: "Mentor vui tính, hợp học qua nhiệm vụ nhỏ.", requiredXp: 900, tag: "Fun", preview: "shop-mentor-byte" },
  { id: "sage", category: "mentor", name: "Sage", desc: "Mentor Socratic, hay hỏi ngược để tự hiểu.", requiredXp: 1400, tag: "Socratic", preview: "shop-mentor-sage" },
  { id: "luna", category: "mentor", name: "Mecha-Luna", desc: "Trợ lý Mecha thông minh siêu ngầu, phân tích logic chuẩn xác.", requiredXp: 2000, tag: "Anime / Mecha", preview: "shop-mentor-luna" },
  { id: "kuro", category: "mentor", name: "Kuro (Neko)", desc: "Trợ lý mèo ninja đen dễ thương, phản xạ nhanh nhạy với lỗi cú pháp.", requiredXp: 2800, tag: "Cute / Neko", preview: "shop-mentor-kuro" },
  { id: "ignis", category: "mentor", name: "Ignis (Dragon)", desc: "Linh thú rồng lửa ngầu lòi, thúc đẩy tinh thần học tập bùng cháy.", requiredXp: 3800, tag: "Cool / Flame", preview: "shop-mentor-ignis" },
  { id: "sylph", category: "mentor", name: "Sylph (Fairy)", desc: "Trợ lý tiên rừng thanh bình, giảng giải lý thuyết êm dịu dễ tiếp thu.", requiredXp: 4800, tag: "Kawaii / Nature", preview: "shop-mentor-sylph" },

  { id: "classic", category: "chat", name: "Classic Chat", desc: "Sạch, sáng, dễ đọc.", requiredXp: 0, tag: "Clean", preview: "shop-chat-classic" },
  { id: "paper", category: "chat", name: "Paper Chat", desc: "Nhẹ như notebook, hợp đọc dài.", requiredXp: 500, tag: "Notes", preview: "shop-chat-paper" },
  { id: "terminal", category: "chat", name: "Terminal Chat", desc: "Khung chat đen, vibe lập trình.", requiredXp: 1000, tag: "CLI", preview: "shop-chat-terminal" },
  { id: "neon", category: "chat", name: "Neon Chat", desc: "Glow xanh tím cho AI panel.", requiredXp: 2200, tag: "Glow", preview: "shop-chat-neon" },

  { id: "campaign", category: "map", name: "Campaign Route", desc: "Map chinh phục mặc định.", requiredXp: 0, tag: "Default", preview: "shop-map-campaign" },
  { id: "route-blueprint", category: "map", name: "Blueprint Route", desc: "Map kiểu bản thiết kế.", requiredXp: 700, tag: "Plan", preview: "shop-map-blueprint" },
  { id: "space", category: "map", name: "Space Map", desc: "Skill map kiểu vũ trụ.", requiredXp: 1600, tag: "Space", preview: "shop-map-space" },
  { id: "circuit", category: "map", name: "Circuit Board", desc: "Đường học như mạch điện.", requiredXp: 2400, tag: "Tech", preview: "shop-map-circuit" },
  { id: "dungeon", category: "map", name: "Dungeon Path", desc: "Cảm giác vượt ải boss.", requiredXp: 3500, tag: "Game", preview: "shop-map-dungeon" },

  { id: "streak", category: "badge", name: "14-day Streak", desc: "Khung danh hiệu chăm học.", requiredXp: 0, tag: "Streak", preview: "shop-badge-streak" },
  { id: "rookie", category: "badge", name: "Code Lab Rookie", desc: "Khởi đầu đường code lab.", requiredXp: 300, tag: "Code", preview: "shop-badge-rookie" },
  { id: "quiz", category: "badge", name: "Quiz Slayer", desc: "Dành cho người thích thử thách quiz.", requiredXp: 700, tag: "Quiz", preview: "shop-badge-quiz" },
  { id: "mindmap", category: "badge", name: "Mindmap Builder", desc: "Danh hiệu cho người hay vẽ sơ đồ.", requiredXp: 1200, tag: "Map", preview: "shop-badge-mindmap" },
  { id: "explorer", category: "badge", name: "OOP Explorer", desc: "Khung profile khám phá OOP.", requiredXp: 2000, tag: "OOP", preview: "shop-badge-explorer" },
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
  const [xp, setXp] = useState(0);
  const shopRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState<ShopCategory>("theme");
  const [subTab, setSubTab] = useState<"store" | "quests">("store");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);
  const [owned, setOwned] = useState<Record<ShopCategory, string[]>>({
    theme: ["diagonal", "blueprint", "matrix", "sunrise", "graphite"],
    avatar: ["initials"],
    mentor: ["mino"],
    chat: ["classic"],
    map: ["campaign"],
    badge: ["streak"],
  });

  const [quests, setQuests] = useState<Quest[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const activeByCategory: Record<ShopCategory, string> = {
    theme: activeTheme,
    avatar: activeAvatar,
    mentor: activeMentor,
    chat: activeChatSkin,
    map: activeMapSkin,
    badge: activeBadge,
  };

  useEffect(() => {
    let active = true;
    fetchStudentLearningOverview().then((data) => {
      if (!active || !data?.profile) return;
      if (typeof data.profile.exp_points === "number") {
        setXp(data.profile.exp_points);
      }
      if (data.profile.owned_items) {
        setOwned((prev) => ({
          ...prev,
          ...(data.profile.owned_items as Partial<Record<ShopCategory, string[]>>),
          theme: ["diagonal", "blueprint", "matrix", "sunrise", "graphite"],
        }));
      }
      if (Array.isArray(data.quests) && data.quests.length > 0) {
        setQuests(data.quests);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const apply = async (item: ShopItem) => {
    if (item.category === "theme") {
      onApplyTheme(item.id as BackgroundTheme);
      void unlockXpRewardItem({ category: "theme", item_id: item.id, required_xp: 0 });
      showToast(`✓ Đã chuyển sang giao diện ${item.name}`);
      return;
    }

    const isAlreadyOwned = owned[item.category].includes(item.id);
    if (!isAlreadyOwned) {
      if (xp < item.requiredXp) {
        showToast(
          `Cần đạt mốc ${item.requiredXp.toLocaleString("vi-VN")} XP để mở khóa ${item.name} (hiện có ${xp.toLocaleString("vi-VN")} XP).`
        );
        return;
      }

      const itemKey = `${item.category}:${item.id}`;
      setBusyItemKey(itemKey);
      const res = await unlockXpRewardItem({
        category: item.category,
        item_id: item.id,
        required_xp: item.requiredXp,
      });
      setBusyItemKey(null);

      if (res.error) {
        showToast(res.error);
        return;
      }

      const nextXp = typeof res.exp_points === "number" ? res.exp_points : xp;
      setXp(nextXp);
      if (res.owned_items) {
        setOwned((prev) => ({
          ...prev,
          ...(res.owned_items as Partial<Record<ShopCategory, string[]>>),
          theme: ["diagonal", "blueprint", "matrix", "sunrise", "graphite"],
        }));
      } else {
        setOwned((value) => ({ ...value, [item.category]: [...value[item.category], item.id] }));
      }
      window.dispatchEvent(new Event("codemind-xp-updated"));
      showToast(
        `✓ Đã mở khóa & áp dụng ${item.name} — Giữ nguyên ${nextXp.toLocaleString("vi-VN")} XP tích lũy`
      );
    }

    if (item.category === "avatar") onApplyAvatar(item.id as AvatarStyle);
    if (item.category === "mentor") onApplyMentor(item.id as MentorMascot);
    if (item.category === "chat") onApplyChatSkin(item.id as ChatSkin);
    if (item.category === "map") onApplyMapSkin(item.id as SkillMapSkin);
    if (item.category === "badge") onApplyBadge(item.id as BadgeFrame);
  };

  const claimQuestReward = async (questId: string, reward: number) => {
    const res = await claimXpQuestApi({ quest_id: questId, reward });
    if (res.error) {
      showToast(res.error);
      return;
    }
    if (typeof res.exp_points === "number") {
      setXp(res.exp_points);
    } else {
      setXp((prev) => prev + reward);
    }
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, status: "claimed", progress: "Đã nhận" } : q))
    );
    window.dispatchEvent(new Event("codemind-xp-updated"));
    showToast(`✓ Đã nhận +${reward.toLocaleString("vi-VN")} XP tích lũy!`);
  };

  const activeItems = shopItems.filter((item) => item.category === category);
  const equipped = shopItems.find((item) => item.id === activeByCategory[category] && item.category === category);
  const userLevel = Math.floor(xp / 1000) + 1;
  const xpInCurrentLevel = xp % 1000;
  const hasClaimableQuest = quests.some((q) => q.status === "claimable");

  useMarloPageEntrance(
    shopRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card, header, .shop-category-bar, .shop-quest-card");
      if (cards.length > 0) {
        animateMarloCards(cards, { stagger: 0.06, y: 26 });
      }
      const rows = el.querySelectorAll(".marlo-row, .quest-row");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 14, stagger: 0.025, delay: 0.22 });
      }
    },
    [category, subTab]
  );

  return (
    <div ref={shopRef} className="min-h-full p-5 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14161F] px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white shadow-lg flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER HERO AREA (Flat & Clean Surface) */}
      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase text-slate-700 dark:text-slate-200">
            <Trophy size={13} className="text-amber-500" />
            Kho Mở Khóa Mốc XP
          </div>
          <MarloTitle
            text="Mở khóa Phần thưởng theo Mốc XP"
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          />
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Tích lũy XP qua bài học, bài lab & nhiệm vụ để đạt mốc mở khóa vĩnh viễn giao diện, mascot AI và huy hiệu — XP tích lũy không bao giờ bị trừ.
          </p>

          {/* Level progression bar */}
          <div className="pt-2 w-72 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>CẤP ĐỘ {userLevel}</span>
              <span>{xpInCurrentLevel} / 1000 XP</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full marlo-bar-grow transition-all duration-300"
                style={{ width: `${xpInCurrentLevel / 10}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cumulative XP Stat Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 flex items-center gap-3.5 shrink-0 self-start md:self-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Star size={22} className="fill-white" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              <MarloNumber value={xp} durationMs={1200} />
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold tracking-wider uppercase mt-0.5">
              XP TÍCH LŨY
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Không bị trừ khi mở khóa
            </div>
          </div>
        </div>
      </header>

      {/* SUBTABS BAR */}
      <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubTab("store")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === "store"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Award size={14} />
          Kho mở khóa theo XP
        </button>
        <button
          onClick={() => setSubTab("quests")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === "quests"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Zap size={14} />
          Nhiệm vụ tích lũy XP
          {hasClaimableQuest && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
        </button>
      </div>

      {/* SUBTAB 1: MILESTONE REWARDS */}
      {subTab === "store" && (
        <div className="space-y-4">
          {/* CATEGORIES BUTTONS */}
          <div className="shop-category-bar bg-slate-100 dark:bg-slate-900/70 rounded-2xl p-1.5 flex gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800 scrollbar-none">
            {(Object.keys(categoryMeta) as ShopCategory[]).map((id) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                  category === id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs"
                    : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
                }`}
              >
                {categoryMeta[id].icon}
                {categoryMeta[id].label}
              </button>
            ))}
          </div>

          {/* ACTIVE EQUIPPED ITEM */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3.5 shadow-2xs flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className={`shop-preview-mini shrink-0 rounded-lg ${equipped?.preview ?? ""}`} />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Đang kích hoạt: {categoryMeta[category].label}
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{equipped?.name}</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Đang áp dụng
            </span>
          </div>

          {/* GRID OF MILESTONE REWARD ITEMS */}
          <div key={`store-grid-${category}`} className="animate-screen-enter grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeItems.map((item, itemIdx) => {
              const isFreeItem = item.category === "theme" || item.requiredXp === 0;
              const isUnlocked = isFreeItem || owned[item.category].includes(item.id);
              const isActive = activeByCategory[item.category] === item.id;
              const canUnlock = isFreeItem || xp >= item.requiredXp;
              const isLocked = !isUnlocked && !canUnlock;
              const missingXp = Math.max(0, item.requiredXp - xp);
              const progressPct =
                item.requiredXp > 0
                  ? Math.min(100, Math.round((xp / item.requiredXp) * 100))
                  : 100;
              const isBusy = busyItemKey === `${item.category}:${item.id}`;

              return (
                <div
                  key={`${item.category}-${item.id}`}
                  style={{ animationDelay: `${itemIdx * 40}ms` }}
                  className={`marlo-row rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${
                    isActive ? "ring-1 ring-slate-900/15 dark:ring-white/20" : ""
                  }`}
                >
                  {/* Preview Hero box */}
                  <div className={`relative h-28 ${item.preview} shrink-0`}>
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
                    <div className="absolute inset-x-3.5 bottom-3.5 flex items-center justify-between z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
                        {item.tag}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-slate-900 dark:bg-white px-2.5 py-0.5 text-[10px] font-bold text-white dark:text-slate-950 shadow-xs">
                          Active
                        </span>
                      )}
                    </div>

                    {/* XP Milestone Lock Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-20">
                        <Lock size={18} className="text-amber-400 mb-1" />
                        <span className="text-[11px] font-bold tracking-wider uppercase">
                          Mốc {item.requiredXp.toLocaleString("vi-VN")} XP
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details box */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h2>
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                      </div>

                      {isLocked && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>
                              {xp.toLocaleString("vi-VN")} / {item.requiredXp.toLocaleString("vi-VN")} XP
                            </span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      {item.requiredXp === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          Mặc định · 0 XP
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Đã mở khóa · Mốc {item.requiredXp.toLocaleString("vi-VN")} XP
                        </span>
                      ) : canUnlock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          <Sparkles size={12} className="text-amber-500" />
                          Đạt mốc {item.requiredXp.toLocaleString("vi-VN")} XP · Không trừ XP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <Lock size={12} className="text-slate-400" />
                          Mốc {item.requiredXp.toLocaleString("vi-VN")} XP
                        </span>
                      )}

                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed shrink-0"
                        >
                          <Lock size={13} />
                          Thiếu {missingXp.toLocaleString("vi-VN")} XP
                        </button>
                      ) : isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                          <Check size={13} className="text-emerald-500" />
                          Đang dùng
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void apply(item)}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-2xs transition shrink-0 cursor-pointer disabled:opacity-60 ${
                            isUnlocked
                              ? "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950"
                              : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                          }`}
                        >
                          {item.category === "theme" ? (
                            <Palette size={13} />
                          ) : isUnlocked ? (
                            <Check size={13} />
                          ) : (
                            <Unlock size={13} />
                          )}
                          {item.category === "theme"
                            ? "Chọn giao diện"
                            : isUnlocked
                            ? "Áp dụng"
                            : isBusy
                            ? "Đang mở..."
                            : "Mở khóa & dùng"}
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
        <div key="shop-quests" className="animate-screen-enter space-y-4">
          <div className="marlo-card-1 bg-white dark:bg-[#14161F] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" />
              Nhiệm vụ tích lũy XP tuần này
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-5">
              Tích cực tham gia học bài, vẽ mindmap và nộp bài lab để tích lũy XP. Đạt đủ mốc XP sẽ mở khóa vĩnh viễn giao diện và mascot AI mà không bị trừ điểm XP.
            </p>
          </div>

          <div className="space-y-3">
            {quests.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] text-center text-xs text-slate-500 dark:text-slate-400">
                Đang đồng bộ danh sách nhiệm vụ từ MySQL...
              </div>
            ) : (
              quests.map((quest, qIdx) => (
                <div
                  key={quest.id}
                  style={{ animationDelay: `${150 + qIdx * 40}ms` }}
                  className="marlo-row quest-row rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{quest.title}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-5">{quest.desc}</p>

                    {/* Progress subtext */}
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Tiến trình:</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        {quest.status === "claimable" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                        {quest.progress}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
                    <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                      <Star size={13} className="fill-amber-500 text-amber-500" />
                      <span className="font-bold text-xs font-mono">+{quest.xpReward} XP</span>
                    </div>

                    {quest.status === "claimed" ? (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
                        Đã nhận
                      </span>
                    ) : quest.status === "claimable" ? (
                      <button
                        type="button"
                        onClick={() => void claimQuestReward(quest.id, quest.xpReward)}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
                      >
                        <Trophy size={13} className="text-slate-950" />
                        Nhận thưởng
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg">
                        Đang thực hiện
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

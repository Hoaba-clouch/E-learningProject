import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle,
  Clock,
  Database,
  Eye,
  KeyRound,
  Lock,
  PauseCircle,
  PlayCircle,
  Search,
  ServerCog,
  Shield,
  Sparkles,
  Unlock,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

type Tab = "overview" | "users" | "classes" | "reels" | "ai" | "sessions";
type UserStatus = "active" | "pending" | "suspended";
type ReelStatus = "draft" | "review" | "published" | "paused";

type UserRow = {
  name: string;
  role: "Giảng viên" | "Học viên";
  email: string;
  status: UserStatus;
  lastActive: string;
  device: string;
};

const initialUsers: UserRow[] = [
  { name: "Trần Thị B", role: "Giảng viên", email: "ttb@edu.vn", status: "active", lastActive: "Vừa xong", device: "MacBook Pro" },
  { name: "Lê Văn C", role: "Học viên", email: "lvc@student.vn", status: "active", lastActive: "5 phút trước", device: "Windows 11" },
  { name: "Hoàng Ngọc D", role: "Học viên", email: "hnd@student.vn", status: "suspended", lastActive: "3 ngày trước", device: "iPhone" },
  { name: "Võ Thị E", role: "Giảng viên", email: "vte@edu.vn", status: "pending", lastActive: "Chưa kích hoạt", device: "Chưa đăng ký" },
];

const classes = [
  { code: "CM-OOP-2026-01", name: "Lập trình OOP - Nhóm 01", teacher: "Trần Thị B", students: 34, progress: 62, review: 12, health: "Ổn định" },
  { code: "CM-OOP-2026-02", name: "Lập trình OOP - Nhóm 02", teacher: "Lê Văn C", students: 28, progress: 47, review: 19, health: "Cần theo dõi" },
  { code: "CM-DSA-2026-01", name: "Cấu trúc dữ liệu", teacher: "Trần Thị B", students: 41, progress: 71, review: 7, health: "Tốt" },
];

const aiUsage = [
  { name: "AI Mentor chat", value: "$128.40", usage: "42K lượt hỏi", requests: 42840, inputTokens: 12840000, outputTokens: 6240000, estimatedCost: 128.4, percent: 72, tone: "bg-blue-500" },
  { name: "Review bài tập", value: "$86.10", usage: "318 lượt review", requests: 318, inputTokens: 3720000, outputTokens: 1180000, estimatedCost: 86.1, percent: 58, tone: "bg-emerald-500" },
  { name: "Tạo Tech Reels", value: "$74.25", usage: "46 video", requests: 184, inputTokens: 2150000, outputTokens: 1640000, estimatedCost: 74.25, percent: 45, tone: "bg-amber-500" },
  { name: "Audio bài đọc", value: "$54.30", usage: "1,204 phút đọc", requests: 1204, inputTokens: 940000, outputTokens: 2860000, estimatedCost: 54.3, percent: 36, tone: "bg-violet-500" },
];

const initialReels = [
  { id: "reel-1", title: "Agentic coding: từ pair sang peer programmer", topic: "AI Coding", status: "published" as ReelStatus, schedule: "Hôm nay 19:30", owner: "Auto Feed", views: "12.4K", cost: "$4.8", source: "GitHub Blog", pipeline: "RSS GitHub -> lọc agentic workflow -> script 45s -> render", render: 100, why: "Giúp học viên hiểu AI không chỉ autocomplete mà bắt đầu xử lý task nhiều bước." },
  { id: "reel-2", title: "Copilot Agent vào JetBrains AI Assistant", topic: "Developer Tools", status: "review" as ReelStatus, schedule: "Chờ duyệt", owner: "Auto Feed", views: "0", cost: "$2.7", source: "GitHub Changelog", pipeline: "Changelog -> tóm tắt thay đổi IDE -> voice tiếng Việt", render: 88, why: "Bạn dùng IntelliJ/PyCharm sẽ thấy workflow code thực tế đổi như thế nào." },
  { id: "reel-3", title: "GPT-5.6 Sol và benchmark coding/cyber mới", topic: "AI Models", status: "draft" as ReelStatus, schedule: "Ngày mai 08:00", owner: "Auto Feed", views: "0", cost: "$3.9", source: "OpenAI", pipeline: "OpenAI news -> chọn ý chính -> storyboard bảo mật", render: 64, why: "Học viên biết vì sao kỹ năng debug, terminal và security ngày càng quan trọng." },
  { id: "reel-4", title: "TypeScript lên ngôi nhờ AI và open source", topic: "Open Source", status: "paused" as ReelStatus, schedule: "Tạm dừng", owner: "Auto Feed", views: "4.8K", cost: "$3.2", source: "GitHub Octoverse", pipeline: "Octoverse -> insight nghề nghiệp -> render infographic", render: 100, why: "Kết nối kiến thức TypeScript/React với xu hướng tuyển dụng và cộng đồng." },
];

const statusStyle: Record<UserStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabel: Record<UserStatus, string> = {
  active: "Hoạt động",
  pending: "Chờ kích hoạt",
  suspended: "Bị khóa",
};

const reelStatusStyle: Record<ReelStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  review: "border-amber-200 bg-amber-50 text-amber-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-rose-200 bg-rose-50 text-rose-700",
};

const reelStatusLabel: Record<ReelStatus, string> = {
  draft: "Bản nháp",
  review: "Chờ duyệt",
  published: "Đã xuất bản",
  paused: "Tạm dừng",
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [reels, setReels] = useState(initialReels);
  const [toast, setToast] = useState("Hệ thống ổn định");
  const [pending, setPending] = useState([
    { name: "Nguyễn Minh Khôi", id: "SV-2024-0341", className: "OOP - Nhóm 01", risk: "Hồ sơ hợp lệ" },
    { name: "Trần Thị Lan Anh", id: "SV-2024-0528", className: "OOP - Nhóm 02", risk: "Trùng email lớp cũ" },
    { name: "Phạm Văn Đức", id: "SV-2024-0719", className: "DSA - Nhóm 01", risk: "Chờ xác nhận mã SV" },
  ]);

  const filtered = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()));
  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;
  const reviewReels = reels.filter((reel) => reel.status === "review").length;
  const totalRequests = aiUsage.reduce((sum, item) => sum + item.requests, 0);
  const totalInputTokens = aiUsage.reduce((sum, item) => sum + item.inputTokens, 0);
  const totalOutputTokens = aiUsage.reduce((sum, item) => sum + item.outputTokens, 0);
  const totalEstimatedCost = aiUsage.reduce((sum, item) => sum + item.estimatedCost, 0);

  const resolvePending = (index: number, action: "approved" | "rejected") => {
    const item = pending[index];
    setPending((list) => list.filter((_, i) => i !== index));
    setToast(`${action === "approved" ? "Đã duyệt" : "Đã từ chối"} ${item.name}`);
  };

  const toggleUserLock = (email: string) => {
    setUsers((list) =>
      list.map((user) => (user.email === email ? { ...user, status: user.status === "suspended" ? "active" : "suspended" } : user)),
    );
    setToast("Đã cập nhật trạng thái tài khoản");
  };

  const updateReelStatus = (id: string, status: ReelStatus) => {
    const reel = reels.find((item) => item.id === id);
    setReels((list) =>
      list.map((item) =>
        item.id === id
          ? { ...item, status, schedule: status === "published" ? "Đã lên feed" : status === "paused" ? "Tạm dừng" : item.schedule }
          : item,
      ),
    );
    setToast(`${reel?.title ?? "Tech Reel"}: ${reelStatusLabel[status]}`);
  };

  return (
    <div className="min-h-full p-5">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-blue-700">CODE-MIND Admin</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Command center</h1>
          <p className="mt-1 text-sm text-slate-500">Điều phối người dùng, lớp học, Tech Reels, chi phí AI và phiên đăng nhập trong một màn.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          <Shield size={16} className="text-blue-600" />
          {toast}
        </div>
      </header>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {[
          ["overview", "Tổng quan"],
          ["users", "Người dùng"],
          ["classes", "Lớp học"],
          ["reels", "Tech Reels"],
          ["ai", "AI Usage"],
          ["sessions", "Phiên đăng nhập"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {[
              ["Học viên hoạt động", "1,247", `${activeUsers} tài khoản online`, <Users size={18} />, "text-blue-700 bg-blue-50"],
              ["Chờ xử lý", pending.length.toString(), "yêu cầu tham gia lớp", <Clock size={18} />, "text-amber-700 bg-amber-50"],
              ["Tech Reels", reviewReels.toString(), "video chờ duyệt", <PlayCircle size={18} />, "text-orange-700 bg-orange-50"],
              ["Cảnh báo tài khoản", suspendedUsers.toString(), "đang bị khóa", <AlertTriangle size={18} />, "text-rose-700 bg-rose-50"],
            ].map(([label, value, delta, icon, tone]) => (
              <div key={label as string} className="surface rounded-xl p-4">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
                <div className="text-xl font-semibold text-slate-950">{value}</div>
                <div className="mt-1 text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-xs text-slate-400">{delta}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4">
            <div className="surface rounded-xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Yêu cầu tham gia lớp</h2>
                  <p className="mt-1 text-sm text-slate-500">Duyệt nhanh học viên trước khi họ vào workspace.</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{pending.length} chờ duyệt</span>
              </div>
              <div className="space-y-3">
                {pending.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-blue-700">{item.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.id} - {item.className}</div>
                      <div className="mt-1 text-xs text-amber-600">{item.risk}</div>
                    </div>
                    <button onClick={() => resolvePending(index, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Duyệt</button>
                    <button onClick={() => resolvePending(index, "rejected")} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600">Từ chối</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface rounded-xl p-4">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={17} className="text-violet-600" />
                <h2 className="text-base font-semibold text-slate-950">AI usage snapshot</h2>
              </div>
              <div className="space-y-3">
                {aiUsage.slice(0, 3).map((item) => (
                  <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="font-mono text-xs text-slate-500">{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{item.usage}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="surface overflow-hidden rounded-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 p-4">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email hoặc vai trò..." className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              <UserPlus size={15} />
              Thêm giảng viên
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>{["Tên", "Vai trò", "Email", "Trạng thái", "Thiết bị", "Hành động"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.email} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.lastActive}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle[user.status]}`}>
                      {user.status === "active" ? <CheckCircle size={13} /> : user.status === "pending" ? <Clock size={13} /> : <XCircle size={13} />}
                      {statusLabel[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.device}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => toggleUserLock(user.email)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700">
                        {user.status === "suspended" ? <Unlock size={13} /> : <Lock size={13} />}
                        {user.status === "suspended" ? "Mở khóa" : "Khóa"}
                      </button>
                      <button onClick={() => setToast(`Đã reset thiết bị của ${user.name}`)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-amber-200 hover:text-amber-700">
                        <KeyRound size={13} />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "classes" && (
        <div className="grid grid-cols-3 gap-4">
          {classes.map((item) => (
            <div key={item.code} className="surface rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="font-mono text-xs text-blue-700">{item.code}</div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.health === "Tốt" ? "bg-emerald-50 text-emerald-700" : item.health === "Cần theo dõi" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                  {item.health}
                </span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-slate-950">{item.name}</h2>
              <div className="mt-2 text-sm text-slate-500">GV: {item.teacher}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-semibold text-slate-900">{item.students}</div>
                  <div className="text-xs text-slate-500">học viên</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-semibold text-slate-900">{item.review}</div>
                  <div className="text-xs text-slate-500">bài chờ review</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Tiến độ trung bình</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reels" && (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
          <section className="surface overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Tech Reels Auto Feed</h2>
                <p className="mt-1 text-sm text-slate-500">Hệ thống tự quét nguồn AI/GitHub mỗi ngày, viết script, tạo giọng đọc và render video ngắn cho học viên.</p>
              </div>
              <button onClick={() => setToast("Đã xếp lịch crawl nguồn tin mới")} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white">
                <PlayCircle size={15} />
                Chạy crawl
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50/60 p-4">
              {[
                ["Nguồn đang quét", "8", "AI, GitHub, Dev.to"],
                ["Render hôm nay", "12", "4 chờ duyệt"],
                ["Lịch đăng", "2/ngày", "theo từng lớp"],
                ["Tỉ lệ giữ chân", "68%", "+9% tuần này"],
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-500">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 bg-slate-50/35 p-3">
              {reels.map((reel) => (
                <div key={reel.id} className="grid grid-cols-[64px_minmax(0,1fr)_118px] gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/40">
                  <div className="relative h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(59,130,246,.42),transparent_34%),linear-gradient(160deg,#0f172a,#111827_62%,#020617)]" />
                    <div className="absolute inset-x-2 top-2 flex gap-1">
                      <span className="h-0.5 flex-1 rounded-full bg-white/80" />
                      <span className="h-0.5 flex-1 rounded-full bg-white/25" />
                      <span className="h-0.5 flex-1 rounded-full bg-white/25" />
                    </div>
                    <div className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-white/10 p-1.5 text-[8px] font-bold leading-3 text-white backdrop-blur">
                      {reel.topic}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-950">{reel.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${reelStatusStyle[reel.status]}`}>
                        {reelStatusLabel[reel.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{reel.topic}</span>
                      <span>{reel.source}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[11px] font-semibold text-slate-500">Pipeline</div>
                        <div className="mt-1 truncate text-xs text-slate-700">{reel.pipeline}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Render</span>
                          <span>{reel.render}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-slate-900" style={{ width: `${reel.render}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-xs leading-5 text-blue-800">
                      {reel.why}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><CalendarClock size={13} />{reel.schedule}</span>
                      <span className="inline-flex items-center gap-1"><Eye size={13} />{reel.views} views</span>
                      <span>{reel.cost} render</span>
                      <span>{reel.owner}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                      <button title="Xuất bản" onClick={() => updateReelStatus(reel.id, "published")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700">
                        <CheckCircle size={13} />
                      </button>
                      <button title="Duyệt" onClick={() => updateReelStatus(reel.id, "review")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                        <Eye size={13} />
                      </button>
                      <button title="Tạm dừng" onClick={() => updateReelStatus(reel.id, "paused")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 hover:text-rose-700">
                        <PauseCircle size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <PauseCircle size={16} className="text-amber-600" />
                Pipeline tự động
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 p-2">06:00 quét GitHub Blog, GitHub Trending, AI News, Dev.to</div>
                <div className="rounded-lg bg-slate-50 p-2">AI lọc tin phù hợp từng lớp và viết script tiếng Việt</div>
                <div className="rounded-lg bg-slate-50 p-2">Tạo voice, caption, video dọc rồi đưa vào Chờ duyệt</div>
              </div>
            </div>
            <div className="surface rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-950">Nguồn đang theo dõi</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["OpenAI", "GitHub Blog", "GitHub Changelog", "Dev.to", "Hacker News", "Stack Overflow"].map((source) => (
                  <span key={source} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {source}
                  </span>
                ))}
              </div>
            </div>
            <div className="surface rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-950">Feed mỗi ngày</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">$74</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">46 video đã render trong tháng này. Admin kiểm soát lịch đăng để học viên nhận kiến thức mới mà không bị quá tải.</p>
            </div>
          </aside>
        </div>
      )}

      {tab === "ai" && (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="surface rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">AI usage metrics</h2>
                <p className="mt-1 text-sm text-slate-500">Theo dõi request, input token, output token và estimated cost theo từng tính năng.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                ${totalEstimatedCost.toFixed(2)} / $500 budget
              </span>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3">
              {[
                ["Total requests", totalRequests.toLocaleString(), "API calls"],
                ["Input tokens", totalInputTokens.toLocaleString(), "prompt/context"],
                ["Output tokens", totalOutputTokens.toLocaleString(), "generated"],
                ["Est. cost", `$${totalEstimatedCost.toFixed(2)}`, "this month"],
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
                  <div className="mt-1 text-xs text-slate-500">{desc}</div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Feature", "Total request", "Input token", "Output token", "Est. cost", "Limit"].map((head) => (
                      <th key={head} className="px-4 py-3">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {aiUsage.map((item) => (
                    <tr key={item.name} className="text-sm">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{item.usage}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.requests.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.inputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.outputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-slate-950">${item.estimatedCost.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} />
                          </div>
                          <span className="font-mono text-xs text-slate-500">{item.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["Avg input / request", Math.round(totalInputTokens / totalRequests).toLocaleString(), "tokens"],
                ["Avg output / request", Math.round(totalOutputTokens / totalRequests).toLocaleString(), "tokens"],
                ["Cost / 1K requests", `$${((totalEstimatedCost / totalRequests) * 1000).toFixed(2)}`, "estimated"],
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">{label}</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <BarChart3 size={16} className="text-blue-600" />
                Dự báo tháng
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-950">${Math.round(totalEstimatedCost * 1.42)}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nếu tốc độ request giữ nguyên, chi phí vẫn nằm dưới ngân sách $500. Tech Reels và AI Mentor là hai nhóm nên theo dõi sát.
              </p>
            </div>
            <div className="surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Database size={16} className="text-emerald-600" />
                Chính sách token
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 p-2">Cảnh báo khi một lớp vượt 80% monthly budget</div>
                <div className="rounded-lg bg-slate-50 p-2">Cache phản hồi AI Mentor cho câu hỏi lặp lại</div>
                <div className="rounded-lg bg-slate-50 p-2">Giới hạn render Tech Reels khi output token tăng bất thường</div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "sessions" && (
        <div className="surface rounded-xl p-4">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Phiên đăng nhập đang hoạt động</h2>
          <div className="space-y-3">
            {[
              ["Nguyễn Văn A", "MacBook Pro - Chrome", "192.168.1.42", "Ổn định"],
              ["Trần Thị B", "Windows 11 - Edge", "10.0.0.15", "Thiết bị mới"],
              ["Phạm Văn Đức", "iPhone - Safari", "172.16.0.8", "Cần xác minh"],
            ].map(([name, device, ip, state]) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700">
                  <ServerCog size={17} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{name}</div>
                  <div className="text-xs text-slate-500">{device} - {ip}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state === "Ổn định" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {state}
                </span>
                <button onClick={() => setToast(`Đã reset phiên của ${name}`)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600">Reset thiết bị</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

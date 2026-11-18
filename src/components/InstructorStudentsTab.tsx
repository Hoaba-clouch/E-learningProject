import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Gift,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  GraduationCap,
  Flame,
  X,
  Send,
} from "lucide-react";
import {
  fetchStudentsAnalyticsApi,
  remindStudentApi,
  StudentAnalyticsItem,
} from "../api";

interface InstructorStudentsTabProps {
  onNotify?: (msg: string) => void;
}

const COURSE_LIST = [
  { code: "", name: "Tất cả 16 Môn học" },
  { code: "CS201", name: "CS201 - Lập trình Hướng đối tượng C++20" },
  { code: "CS202", name: "CS202 - Cấu trúc Dữ liệu & Giải thuật" },
  { code: "CS301", name: "CS301 - Lập trình Mạng & Phân tán" },
  { code: "CS304", name: "CS304 - Hệ điều hành & Linux Kernel" },
  { code: "CS402", name: "CS402 - Trí tuệ Nhân tạo & Học máy" },
  { code: "CS405", name: "CS405 - An toàn Thông tin & Mật mã" },
  { code: "CS499", name: "CS499 - Khóa luận Tốt nghiệp Capstone" },
];

export default function InstructorStudentsTab({ onNotify }: InstructorStudentsTabProps) {
  const [students, setStudents] = useState<StudentAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [filterRisk, setFilterRisk] = useState<"all" | "at_risk" | "top_performer" | "on_track">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal nhắc nhở / thưởng XP
  const [activeStudent, setActiveStudent] = useState<StudentAnalyticsItem | null>(null);
  const [actionType, setActionType] = useState<"socratic_hint" | "bonus_xp">("socratic_hint");
  const [remindMessage, setRemindMessage] = useState("");
  const [bonusXp, setBonusXp] = useState(25);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCourse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchStudentsAnalyticsApi(selectedCourse || undefined);
      setStudents(data);
    } catch {
      onNotify?.("Không thể tải danh sách học viên.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (filterRisk !== "all" && s.risk_status !== filterRisk) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.display_name.toLowerCase().includes(q);
      const matchCode = s.student_code.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchEmail) return false;
    }
    return true;
  });

  const countAtRisk = students.filter((s) => s.risk_status === "at_risk").length;
  const countTop = students.filter((s) => s.risk_status === "top_performer").length;
  const countOnTrack = students.filter((s) => s.risk_status === "on_track").length;

  const handleOpenRemind = (st: StudentAnalyticsItem, type: "socratic_hint" | "bonus_xp") => {
    setActiveStudent(st);
    setActionType(type);
    if (type === "bonus_xp") {
      setRemindMessage(`Thầy/Cô đánh giá cao sự tiến bộ vượt bậc của bạn trong môn ${st.course_code}. Hãy tiếp tục phát huy nhé!`);
      setBonusXp(50);
    } else {
      setRemindMessage(`Chào bạn, Thầy/Cô nhận thấy bạn đang gặp vướng mắc ở các bài thực hành gần đây. Hãy xem lại phần gợi ý Socratic hoặc đặt lịch hẹn 1-on-1 nhé.`);
    }
  };

  const handleSendRemind = async () => {
    if (!activeStudent) return;
    setSending(true);
    try {
      await remindStudentApi(activeStudent.student_id, {
        message: remindMessage,
        action_type: actionType,
        bonus_xp: actionType === "bonus_xp" ? bonusXp : 0,
      });
      onNotify?.(
        actionType === "bonus_xp"
          ? `✓ Đã thưởng +${bonusXp} XP cho học viên ${activeStudent.display_name}!`
          : `✓ Đã gửi lời nhắc học vụ tới học viên ${activeStudent.display_name}!`
      );
      setActiveStudent(null);
    } catch (err: any) {
      onNotify?.(err.message || "Gửi lời nhắn thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── THỐNG KÊ NHANH 3 CHỈ SỐ HỌC VỤ ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Cần hỗ trợ (Nguy cơ rớt)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono flex items-baseline gap-1.5">
              <span>{countAtRisk}</span>
              <span className="text-xs font-sans font-medium text-slate-400">học viên</span>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                countAtRisk > 0
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {countAtRisk > 0 ? "Cần can thiệp" : "An toàn"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Học viên Xuất sắc (Top 5%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono flex items-baseline gap-1.5">
              <span>{countTop}</span>
              <span className="text-xs font-sans font-medium text-slate-400">học viên</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Top 5% lớp
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Đúng tiến độ & Ổn định
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono flex items-baseline gap-1.5">
              <span>{countOnTrack}</span>
              <span className="text-xs font-sans font-medium text-slate-400">học viên</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
              Đạt chuẩn
            </span>
          </div>
        </div>
      </div>

      {/* ─── THANH CÔNG CỤ LỌC & TÌM KIẾM ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chọn Môn Học (Trong 16 Môn) */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#EE8420]/30 cursor-pointer"
            >
              {COURSE_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Lọc Rủi ro */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "at_risk", label: "⚠️ Cần hỗ trợ" },
                { id: "top_performer", label: "⭐ Xuất sắc" },
                { id: "on_track", label: "✓ Đúng hạn" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterRisk(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterRisk === f.id
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ô Tìm Kiếm */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, MSSV, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#EE8420]/30"
          />
        </div>
      </div>

      {/* ─── BẢNG HỒ SƠ HỌC VIÊN CHUYÊN SÂU ───────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Học viên</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Tiến độ bài học</th>
                <th className="py-3 px-3">Quiz TB</th>
                <th className="py-3 px-3">Vấn đáp AI 3D</th>
                <th className="py-3 px-3">Đồ án Kanban</th>
                <th className="py-3 px-3">Streak / XP</th>
                <th className="py-3 px-3">Tình trạng</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400 italic">
                    {loading ? "Đang đồng bộ dữ liệu CSDL MySQL..." : "Không tìm thấy học viên nào phù hợp bộ lọc."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr
                    key={st.student_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Học viên */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {st.display_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {st.display_name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {st.student_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Môn học */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {st.course_code}
                      </span>
                    </td>

                    {/* Tiến độ bài học */}
                    <td className="py-3 px-3 min-w-[140px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {st.progress_pct}%
                          </span>
                          <span className="text-slate-400">
                            {st.lessons_done}/{st.total_lessons} bài
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              st.progress_pct >= 80
                                ? "bg-emerald-500"
                                : st.progress_pct < 40
                                ? "bg-red-500"
                                : "bg-[#EE8420]"
                            }`}
                            style={{ width: `${st.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Quiz TB */}
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`font-bold ${
                          st.avg_quiz >= 8.5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : st.avg_quiz < 5.0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {st.avg_quiz}
                      </span>
                      <span className="text-[10px] text-slate-400">/10</span>
                    </td>

                    {/* AI Defense */}
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {st.defense_score}
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>

                    {/* Kanban SP */}
                    <td className="py-3 px-3 font-mono">
                      <div className="text-slate-800 dark:text-slate-200 font-semibold">
                        {st.kanban_sp} SP
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {st.kanban_tasks_done} tasks xong
                      </div>
                    </td>

                    {/* Streak / XP */}
                    <td className="py-3 px-3 font-mono">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Flame size={12} className="fill-amber-500" />
                        <span>{st.current_streak} ngày</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {st.exp_points} XP
                      </div>
                    </td>

                    {/* Tình trạng */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          st.risk_status === "at_risk"
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                            : st.risk_status === "top_performer"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
                        }`}
                      >
                        {st.risk_label}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenRemind(st, "socratic_hint")}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Gửi gợi ý Socratic nhắc nhở học viên"
                        >
                          <MessageSquare size={13} className="text-[#EE8420]" />
                          <span>Nhắc Socratic</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRemind(st, "bonus_xp")}
                          className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 transition cursor-pointer"
                          title="Thưởng điểm rèn luyện / EXP"
                        >
                          <Gift size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL GỬI NHẮC NHỞ / THƯỞNG XP ───────────────────────────────── */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A24] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {actionType === "bonus_xp" ? (
                  <Gift size={18} className="text-emerald-500" />
                ) : (
                  <MessageSquare size={18} className="text-[#EE8420]" />
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {actionType === "bonus_xp" ? "Thưởng EXP Khích Lệ" : "Gửi Lời Nhắc Học Vụ Socratic"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              Gửi tới học viên: <strong className="text-slate-900 dark:text-white">{activeStudent.display_name}</strong> ({activeStudent.student_code}) · Môn {activeStudent.course_code}
            </div>

            {actionType === "bonus_xp" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số điểm EXP thưởng:
                </label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  step={5}
                  value={bonusXp}
                  onChange={(e) => setBonusXp(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#EE8420]/30"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lời nhắn của Giảng viên:
              </label>
              <textarea
                rows={4}
                value={remindMessage}
                onChange={(e) => setRemindMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#EE8420]/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSendRemind}
                className="px-5 py-2 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] dark:hover:bg-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span>{sending ? "Đang gửi..." : "Gửi thông báo"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

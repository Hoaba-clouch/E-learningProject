import React, { useState } from "react";
import { X, Calendar, Clock, AlertTriangle, Check, Shield, Users, Award, Eye, Cpu } from "lucide-react";
import {
  MARLO_ROOMS,
  MarloRoomSession,
  SessionKind,
  SESSION_KIND_META,
  checkRoomConflict,
} from "../marlo-engine/marloSessions";
import { MARLO_PROJECTS } from "../marlo-engine/marloData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBookSession: (session: MarloRoomSession) => void;
  existingSessions: MarloRoomSession[];
  initialValues?: {
    title?: string;
    kind?: SessionKind;
    project?: string;
    studentName?: string;
    mentorName?: string;
    date?: string;
    time?: string;
    duration?: number;
    room?: string;
  };
}

export default function MarloBookRoomModal({
  isOpen,
  onClose,
  onBookSession,
  existingSessions,
  initialValues,
}: Props) {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(initialValues?.title || "");
  const [kind, setKind] = useState<SessionKind>(initialValues?.kind || "exam");
  const [projectId, setProjectId] = useState(initialValues?.project || MARLO_PROJECTS[0].id);
  const [dateStr, setDateStr] = useState(initialValues?.date || todayStr);
  const [timeStr, setTimeStr] = useState(initialValues?.time || "14:00");
  const [durationMins, setDurationMins] = useState<number>(initialValues?.duration || 60);
  const [room, setRoom] = useState(initialValues?.room || MARLO_ROOMS[0]);
  const [studentName, setStudentName] = useState(initialValues?.studentName || "Nguyễn Bá Hòa");
  const [examinerOrMentor, setExaminerOrMentor] = useState(
    initialValues?.mentorName || "Thầy Nguyễn Phước (Cố vấn Trưởng)"
  );
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute timestamp
  const computeStartMs = () => {
    const [hours, mins] = timeStr.split(":").map(Number);
    const dateObj = new Date(dateStr);
    dateObj.setHours(hours || 9, mins || 0, 0, 0);
    return dateObj.getTime();
  };

  const startMs = computeStartMs();
  const conflict = checkRoomConflict(existingSessions, room, startMs, durationMins);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề ca thi hoặc buổi cố vấn.");
      return;
    }

    if (conflict) {
      setErrorMsg(
        `Phòng "${room}" đã có lịch "${conflict.title}" trong khung giờ này rồi! Vui lòng đổi phòng hoặc dời giờ.`
      );
      return;
    }

    const prj = MARLO_PROJECTS.find((p) => p.id === projectId);

    const newSession: MarloRoomSession = {
      id: `ses-${Date.now()}`,
      title: title.trim(),
      kind,
      at: startMs,
      mins: durationMins,
      projectId,
      projectName: prj?.name || "Đồ án Kỹ nghệ Phần mềm",
      who: ["bhoa"],
      studentName: studentName.trim(),
      examinerOrMentor: examinerOrMentor.trim(),
      room,
      done: false,
      notes: notes.trim() || undefined,
      statusText: "Đã lên lịch",
    };

    onBookSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-[#f5f5f6] dark:bg-[#1b1c1e] text-[#161718] dark:text-[#f0f0f1] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Book Phòng Hội Đồng & Lịch Thi</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đặt phòng trực tiếp cho ca thi định kỳ hoặc buổi cố vấn 1-1 với học viên
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Tiêu đề buổi / Phiên làm việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="VD: Thi Vấn đáp Giải thuật C++ / Cố vấn Gỡ lỗi Docker Sandbox"
              className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              required
            />
          </div>

          {/* Kind Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Loại phiên làm việc
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as SessionKind)}
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              >
                <option value="exam">📋 Lịch thi định kỳ trực tiếp</option>
                <option value="mentor">🤝 Cố vấn Mentor 1-1 cho học viên</option>
                <option value="review">🔍 Review đồ án & Sprint Code</option>
                <option value="defense">🛡️ Hội đồng Khảo thí AI Phản biện</option>
                <option value="lab">💻 Thực hành Lab & Sandbox</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Đồ án / Học phần liên quan
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              >
                {MARLO_PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room & Conflict Detection */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Chọn Phòng Tổ Chức <span className="text-rose-500">*</span>
            </label>
            <select
              value={room}
              onChange={(e) => {
                setRoom(e.target.value);
                setErrorMsg(null);
              }}
              className={`w-full px-3 py-2 bg-white dark:bg-[#222326] border rounded-xl text-sm font-semibold outline-none ${
                conflict
                  ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600"
                  : "border-slate-300 dark:border-slate-700 focus:border-[#f29b23]"
              }`}
            >
              {MARLO_ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Conflict Warning Alert */}
            {conflict && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle size={15} className="flex-none text-amber-600 mt-0.5" />
                <div>
                  <b className="font-bold">Cảnh báo trùng phòng:</b> Phòng <u>{room}</u> đã được đặt
                  cho <i>"{conflict.title}"</i> vào khung giờ này ({new Date(conflict.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {conflict.mins} phút). Vui lòng chọn phòng khác!
                </div>
              </div>
            )}
          </div>

          {/* Date & Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Ngày tổ chức
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Thời lượng
              </label>
              <select
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              >
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút (1 giờ)</option>
                <option value={90}>90 phút (1.5 giờ)</option>
                <option value={120}>120 phút (2 giờ)</option>
                <option value={180}>180 phút (3 giờ)</option>
              </select>
            </div>
          </div>

          {/* Student & Mentor / Examiner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Học viên / Nhóm dự thi
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="VD: Nguyễn Bá Hòa, Võ Nhật Huy..."
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Giảng viên / Cố vấn phụ trách
              </label>
              <input
                type="text"
                value={examinerOrMentor}
                onChange={(e) => setExaminerOrMentor(e.target.value)}
                placeholder="VD: Thầy Nguyễn Phước..."
                className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-[#f29b23]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Ghi chú nội dung / Yêu cầu chuẩn bị
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ghi chú yêu cầu học viên mang theo laptop, chuẩn bị slide hoặc mã nguồn demo..."
              className="w-full px-3 py-2 bg-white dark:bg-[#222326] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-[#f29b23]"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!!conflict}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition shadow-xs flex items-center gap-1.5 ${
                conflict
                  ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-[#f29b23] hover:bg-[#ee8420] text-slate-950 cursor-pointer"
              }`}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Xác nhận Book Phòng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

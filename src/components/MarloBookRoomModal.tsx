import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Check } from "lucide-react";
import type {
  AcademicScheduleItem,
  ScheduleCourseOption,
  ScheduleInstructorOption,
  ScheduleProjectOption,
} from "../api";
import {
  MARLO_ROOMS_VI,
  findScheduleRoomConflict,
  formatScheduleHour,
  getLocalTodayDateStr,
  timeInputToHour,
} from "./MarloAgendaView";

export interface MarloBookRoomModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingSchedule?: AcademicScheduleItem | null;
  existingSchedules: AcademicScheduleItem[];
  projects: ScheduleProjectOption[];
  courses: ScheduleCourseOption[];
  instructors: ScheduleInstructorOption[];
  role: "student" | "instructor" | "admin";
  currentUserName?: string;
  initialDate?: string;
  initialCategory?: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, any>, editId?: string) => Promise<void>;
}

export default function MarloBookRoomModal({
  isOpen,
  mode,
  editingSchedule,
  existingSchedules,
  projects,
  courses,
  instructors,
  role,
  currentUserName = "Giảng viên Phụ trách",
  initialDate,
  initialCategory,
  onClose,
  onSubmit,
}: MarloBookRoomModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("exam");
  const [courseId, setCourseId] = useState("class-capstone");
  const [projectId, setProjectId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [instructorName, setInstructorName] = useState(currentUserName);
  const [roomOrLink, setRoomOrLink] = useState<string>(MARLO_ROOMS_VI[0]);
  const [scheduleDate, setScheduleDate] = useState<string>(getLocalTodayDateStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [maxCapacity, setMaxCapacity] = useState(30);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setIsSaving(false);

    if (mode === "edit" && editingSchedule) {
      setTitle(editingSchedule.title || "");
      setCategory(editingSchedule.category || "exam");
      setCourseId(editingSchedule.course_id || courses[0]?.id || "class-capstone");
      setProjectId(editingSchedule.project_id || "");
      setInstructorId(editingSchedule.instructor_id || "");
      setInstructorName(editingSchedule.instructor_name || currentUserName);
      setRoomOrLink(editingSchedule.room_or_link || MARLO_ROOMS_VI[0]);
      setScheduleDate(editingSchedule.schedule_date || getLocalTodayDateStr());
      setStartTime(formatScheduleHour(editingSchedule.start_hour));
      setEndTime(formatScheduleHour(editingSchedule.end_hour));
      setMaxCapacity(editingSchedule.max_capacity || 30);
      setNote(editingSchedule.note || "");
    } else {
      const defCat = initialCategory || "exam";
      const defCourse =
        courses.find((c) => c.id === "class-capstone")?.id ||
        courses[0]?.id ||
        "class-capstone";
      const defInst = instructors[0];
      setTitle("");
      setCategory(defCat);
      setCourseId(defCourse);
      setProjectId("");
      setInstructorId(role === "admin" && defInst ? defInst.id : "");
      setInstructorName(
        role === "admin" && defInst ? defInst.display_name : currentUserName
      );
      setRoomOrLink(
        defCat === "office_hours" ? MARLO_ROOMS_VI[2] : MARLO_ROOMS_VI[0]
      );
      setScheduleDate(initialDate || getLocalTodayDateStr());
      setStartTime("09:00");
      setEndTime("11:00");
      setMaxCapacity(defCat === "office_hours" ? 6 : 30);
      setNote("");
    }
  }, [
    isOpen,
    mode,
    editingSchedule,
    initialDate,
    initialCategory,
    courses,
    instructors,
    role,
    currentUserName,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startHour = timeInputToHour(startTime);
  const endHour = timeInputToHour(endTime);
  const invalidHours = endHour <= startHour || endHour - startHour < 0.25;
  const minBooked = mode === "edit" ? editingSchedule?.current_booked || 0 : 0;
  const conflict = !invalidHours
    ? findScheduleRoomConflict(
        existingSchedules,
        roomOrLink,
        scheduleDate,
        startHour,
        endHour,
        mode === "edit" ? editingSchedule?.id : undefined
      )
    : null;

  const presetRooms = Array.from(
    new Set<string>([
      ...MARLO_ROOMS_VI,
      ...(editingSchedule?.room_or_link ? [editingSchedule.room_or_link] : []),
    ])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !roomOrLink.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tiêu đề ca lịch và phòng tổ chức.");
      return;
    }
    if (invalidHours) {
      setErrorMsg("Giờ kết thúc phải lớn hơn giờ bắt đầu ít nhất 15 phút.");
      return;
    }
    if (maxCapacity < Math.max(1, minBooked)) {
      setErrorMsg(
        `Sĩ số tối đa không thể nhỏ hơn số học viên đã đăng ký (${minBooked}).`
      );
      return;
    }
    if (conflict) {
      setErrorMsg(
        `Phòng "${roomOrLink}" đang trùng lịch với ca "${conflict.title}" (${formatScheduleHour(
          conflict.start_hour
        )} - ${formatScheduleHour(conflict.end_hour)}).`
      );
      return;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      category,
      course_id: courseId,
      project_id: projectId ? projectId : null,
      room_or_link: roomOrLink.trim(),
      schedule_date: scheduleDate,
      start_hour: startHour,
      end_hour: endHour,
      max_capacity: Number(maxCapacity),
      note: note.trim(),
    };
    if (role === "admin" && instructorId) {
      payload.instructor_id = instructorId;
      payload.instructor_name = instructorName;
    }

    setIsSaving(true);
    try {
      await onSubmit(payload, mode === "edit" ? editingSchedule?.id : undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể lưu ca lịch, vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none marlo-scrim"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "edit"
            ? "Chỉnh sửa & Đổi phòng Ca lịch"
            : "Mở Ca Thi / Hội Đồng Mới"
        }
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#181922] text-slate-900 dark:text-slate-100 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] marlo-modal"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === "edit"
                ? "Chỉnh Sửa & Đổi Phòng Ca Lịch"
                : "Mở Ca Thi / Hội Đồng & Cố Vấn Mới"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === "edit"
                ? "Cập nhật phòng học, thời gian hoặc gắn đồ án; hệ thống tự kiểm tra trùng phòng."
                : "Khởi tạo ca thi, hội đồng bảo vệ hoặc khung giờ cố vấn 1-1 đồng bộ trực tiếp vào MySQL."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
              Tiêu đề ca lịch <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="VD: Hội đồng Sơ duyệt Đồ án Capstone / Cố vấn 1-1 Sprint 3"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#f29b23]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Phân loại lịch
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
              >
                <option value="exam">Ca thi định kỳ</option>
                <option value="defense">Hội đồng bảo vệ đồ án</option>
                <option value="office_hours">Tư vấn cố vấn 1-1</option>
                <option value="review">Review tiến độ & PR</option>
                <option value="lab">Thực hành Sandbox Lab</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Học phần / Khóa học
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
              >
                {courses.length === 0 ? (
                  <option value="class-capstone">CS499 · Đồ án Tốt nghiệp</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name || c.title || c.id}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Gắn Đồ án (tùy chọn)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
              >
                <option value="">Không gắn đồ án cụ thể</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Sĩ số tối đa (tối thiểu {Math.max(1, minBooked)})
              </label>
              <input
                type="number"
                min={Math.max(1, minBooked)}
                max={200}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
              />
            </div>
          </div>

          {role === "admin" && instructors.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Phân công Giảng viên phụ trách
              </label>
              <select
                value={instructorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInstructorId(id);
                  const found = instructors.find((i) => i.id === id);
                  if (found) setInstructorName(found.display_name);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
              >
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.display_name} ({inst.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Phòng tổ chức / Link họp trực tuyến <span className="text-rose-500">*</span>
              </label>
              <select
                value={presetRooms.includes(roomOrLink) ? roomOrLink : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setRoomOrLink(e.target.value);
                    setErrorMsg(null);
                  }
                }}
                aria-label="Chọn nhanh phòng mẫu"
                className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">Chọn nhanh phòng mẫu...</option>
                {presetRooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={roomOrLink}
              onChange={(e) => {
                setRoomOrLink(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="VD: Phòng Lab AI 301 hoặc Google Meet Trực Tuyến"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none ${
                conflict
                  ? "border-rose-500 ring-1 ring-rose-500/30"
                  : "border-slate-300 dark:border-slate-700 focus:border-[#f29b23]"
              }`}
              required
            />

            {conflict && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle size={15} className="flex-none text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <b>Cảnh báo trùng phòng:</b> Phòng <u>{roomOrLink}</u> đã có ca{" "}
                  <i>"{conflict.title}"</i> khung{" "}
                  {formatScheduleHour(conflict.start_hour)} –{" "}
                  {formatScheduleHour(conflict.end_hour)}. Hãy chọn phòng khác hoặc dùng Google Meet Trực Tuyến.
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Ngày tổ chức
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
              Ghi chú / Yêu cầu chuẩn bị
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú mang laptop, chuẩn bị slide kiến trúc hoặc link repo GitHub..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#f29b23]"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!!conflict || invalidHours || isSaving}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition shadow-xs flex items-center gap-1.5 ${
                conflict || invalidHours || isSaving
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  : "bg-[#f29b23] hover:bg-[#ee8420] text-slate-950 cursor-pointer"
              }`}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>
                {isSaving
                  ? "Đang lưu..."
                  : mode === "edit"
                  ? "Lưu Thay Đổi"
                  : "Tạo Ca Lịch"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}

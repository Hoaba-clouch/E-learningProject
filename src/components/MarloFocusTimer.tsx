import { useState, useEffect, useRef } from "react";
import { Play, Pause, Check, Sparkles, ChevronDown } from "lucide-react";

interface Props {
  collapsed?: boolean;
  onSessionComplete?: (minutes: number) => void;
}

const COURSES = [
  { id: "cs201", name: "Lập trình Hướng đối tượng", color: "#EE8420" },
  { id: "cs304", name: "Hội đồng Đồ án RESTful API", color: "#3B82F6" },
  { id: "cs202", name: "Thuật toán Nâng cao & Cấu trúc Dữ liệu", color: "#10B981" },
  { id: "cs205", name: "Kiến trúc Máy tính, HĐH & Mạng TCP/IP", color: "#8B5CF6" },
];

export default function MarloFocusTimer({ collapsed = false, onSessionComplete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0); // Stopwatch starts at 00:00:00
  const [todayTrackedMins, setTodayTrackedMins] = useState(90); // 1.5h default
  const goalHours = 4.0;
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const togglePlay = () => setIsRunning((r) => !r);

  const handleStopAndLog = () => {
    if (seconds > 0) {
      const elapsedMins = Math.max(1, Math.round(seconds / 60));
      setTodayTrackedMins((m) => m + elapsedMins);
      setIsRunning(false);
      setSeconds(0);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      onSessionComplete?.(elapsedMins);
    } else {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  };

  const formatClock = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const todayHoursFormatted = (Math.round((todayTrackedMins / 60) * 10) / 10).toFixed(1);

  // Collapsed Mode (fits inside collapsed rail - matches Image 2)
  if (collapsed) {
    return (
      <div className="w-12 h-12 mx-auto rounded-[22px] bg-white dark:bg-[#14161F] border border-black/[0.05] dark:border-white/[0.07] shadow-xs flex items-center justify-center p-1 select-none">
        <button
          onClick={togglePlay}
          title={isRunning ? `Đang học: ${formatClock(seconds)} (Click để tạm dừng)` : "Bắt đầu tính giờ học tập (Marlo Focus)"}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isRunning
              ? "bg-[#EE8420] text-white shadow-xs"
              : "bg-[#F5F5F7] dark:bg-[#20222B] text-[#161718] dark:text-[#F0F0F1] hover:bg-[#EE8420] hover:text-white"
          }`}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
      </div>
    );
  }

  return (
    <section className="relative rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#14161F] border border-black/[0.05] dark:border-white/[0.07] shadow-xs p-3.5 select-none" aria-label="Time tracking">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[#D97D1A] to-[#EE8420] text-white flex flex-col items-center justify-center p-3 text-center animate-in zoom-in-95 z-30 shadow-lg">
          <Sparkles size={22} className="animate-spin" />
          <span className="text-sm font-black mt-1 tracking-tight">+50 XP Ghi Nhận!</span>
          <span className="text-[11px] opacity-95">Đã lưu giờ học vào hồ sơ học phần</span>
        </div>
      )}

      {/* Timer Top Row */}
      <div className="flex items-center justify-between mb-1">
        <small className="font-semibold text-xs text-[#62656B] dark:text-[#A0A3A9]">Tracked today</small>
        <button
          type="button"
          className="w-7 h-7 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center text-[#62656B] dark:text-[#A0A3A9] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#161718] dark:hover:text-[#F0F0F1] transition cursor-pointer"
          title="Log session (+50 XP)"
          onClick={handleStopAndLog}
        >
          <Check size={13} strokeWidth={2.6} />
        </button>
      </div>

      {/* Today Stats */}
      <div className="flex items-baseline gap-1.5 my-1">
        <b className="font-extrabold text-[22px] tracking-tight text-[#161718] dark:text-[#F0F0F1] leading-none">
          {todayHoursFormatted} h
        </b>
        <span className="text-xs font-medium text-[#62656B] dark:text-[#A0A3A9]">
          of {goalHours.toFixed(1)} h
        </span>
      </div>

      {/* Project selector dropdown matching Marlo authentic UI */}
      <div className="relative my-2.5">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          title="Đổi học phần / dự án theo dõi"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-[3px] shrink-0"
              style={{ backgroundColor: selectedCourse.color }}
            />
            <span className="truncate text-xs font-semibold text-[#393B3F] dark:text-[#D2D3D6]">
              {selectedCourse.name}
            </span>
          </div>
          <ChevronDown size={13} className="text-[#62656B] dark:text-[#A0A3A9] shrink-0 ml-1" />
        </button>

        {isDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-1 w-full rounded-xl bg-white dark:bg-[#222326] border border-slate-200 dark:border-white/10 shadow-lg p-1 z-30">
            {COURSES.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setSelectedCourse(course);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                  selectedCourse.id === course.id
                    ? "bg-[#F5F5F6] dark:bg-white/10 font-bold text-[#161718] dark:text-[#F0F0F1]"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: course.color }}
                />
                <span className="truncate">{course.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The Iconic Marlo Pill: Warm amber gradient with 00:00:00 and white Play button */}
      <div
        style={{ background: "linear-gradient(to right, #FBBF24 0%, #F59E0B 50%, #EA580C 100%)" }}
        className="h-12 rounded-full p-1 pl-4 flex items-center justify-between shadow-2xs"
      >
        <b className="font-bold text-sm tracking-wide text-slate-950 font-mono">
          {formatClock(seconds)}
        </b>
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-900 shadow-sm flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
          title={isRunning ? "Tạm dừng" : "Bắt đầu tính giờ"}
        >
          {isRunning ? (
            <Pause size={15} strokeWidth={2.6} className="text-slate-900" />
          ) : (
            <Play size={15} strokeWidth={2.6} className="ml-0.5 text-slate-900 fill-slate-900" />
          )}
        </button>
      </div>
    </section>
  );
}

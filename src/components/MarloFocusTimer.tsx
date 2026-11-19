import { useState, useEffect, useRef } from "react";
import { Play, Pause, Check, ChevronDown, CheckCircle2 } from "lucide-react";
import "../marlo-engine/marloStyles.css";

interface Props {
  collapsed?: boolean;
  onSessionComplete?: (minutes: number) => void;
}

const COURSES = [
  { id: "cs201", name: "Lập trình Hướng đối tượng", color: "#F29B23" },
  { id: "cs304", name: "Hội đồng Đồ án RESTful API", color: "#3B82F6" },
  { id: "cs202", name: "Thuật toán Nâng cao & Cấu trúc Dữ liệu", color: "#10B981" },
  { id: "cs205", name: "Kiến trúc Máy tính, HĐH & Mạng TCP/IP", color: "#8B5CF6" },
];

export default function MarloFocusTimer({ collapsed = false, onSessionComplete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [todayTrackedMins, setTodayTrackedMins] = useState(90); // 1.5h
  const goalHours = 4.0;
  const [showLogToast, setShowLogToast] = useState(false);
  const [lastLoggedMins, setLastLoggedMins] = useState(0);
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
      setLastLoggedMins(elapsedMins);
      setIsRunning(false);
      setSeconds(0);
      setShowLogToast(true);
      setTimeout(() => setShowLogToast(false), 3200);
      onSessionComplete?.(elapsedMins);
    } else {
      setLastLoggedMins(0);
      setShowLogToast(true);
      setTimeout(() => setShowLogToast(false), 2200);
    }
  };

  const formatClock = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const todayHoursFormatted = (Math.round((todayTrackedMins / 60) * 10) / 10).toFixed(1);
  const progressRatio = Math.max(0.12, Math.min(1, (todayTrackedMins / 60 + seconds / 3600) / goalHours));

  // Collapsed Mode (fits inside collapsed 72px rail - 1:1 with Marlo .timer rail mode)
  if (collapsed) {
    return (
      <div className="marlo-scope w-[72px] flex justify-center select-none">
        <section
          className={`timer timer--rail${isRunning ? " is-on" : ""}`}
          aria-label="Time tracking"
        >
          <div className="timer__pill">
            <button
              type="button"
              className="timer__play"
              onClick={togglePlay}
              aria-label={isRunning ? "Tạm dừng bấm giờ" : "Bắt đầu tính giờ học"}
              title={isRunning ? `Đang học: ${formatClock(seconds)} (Click để tạm dừng)` : "Bắt đầu tính giờ học tập (Marlo Focus)"}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="marlo-scope relative select-none w-full">
      {/* Toast Notification when logged */}
      {showLogToast && (
        <div className="absolute -top-12 left-0 right-0 z-50 flex items-center justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#161718] dark:bg-[#F0F0F1] text-white dark:text-[#161718] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/10 dark:border-black/10">
            <CheckCircle2 size={13} className="text-[#F29B23]" />
            <span>
              {lastLoggedMins > 0 ? `+${lastLoggedMins} phút tập trung hoàn tất!` : "Phiên học tập đã sẵn sàng!"}
            </span>
          </div>
        </div>
      )}

      <section
        className={`timer${isRunning ? " is-on" : ""}`}
        aria-label="Pomodoro focus timer"
      >
        <div className="timer__body">
          {/* Top row: Focus Mode label + Stop/Log check button */}
          <div className="timer__top">
            <small>Đồng hồ tập trung</small>
            <button
              type="button"
              className="timer__stop"
              aria-label="Reset and complete session"
              title="Đặt lại phiên tập trung"
              onClick={handleStopAndLog}
            >
              <Check size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Focus mode title */}
          <b className="timer__today">
            Pomodoro Focus<small> (Deep Work)</small>
          </b>

          {/* Project / Subject Selector */}
          <div className="relative">
            <button
              type="button"
              className="timer__proj"
              onClick={() => setIsDropdownOpen((v) => !v)}
              aria-label={`Môn học: ${selectedCourse.name}. Thay đổi`}
              title="Đổi môn học / đồ án đang theo dõi"
            >
              <i style={{ backgroundColor: selectedCourse.color }} />
              <span className="truncate">{selectedCourse.name}</span>
              <ChevronDown size={14} className="shrink-0 ml-auto opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 w-full rounded-2xl bg-[var(--card)] border border-[var(--line-2)] shadow-[var(--shadow-lg)] p-1.5 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] px-2.5 py-1">
                  Đổi môn / đồ án theo dõi
                </div>
                {COURSES.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition cursor-pointer ${
                      selectedCourse.id === course.id
                        ? "bg-[var(--card-2)] text-[var(--ink)] font-bold shadow-xs"
                        : "text-[var(--ink-2)] hover:bg-[var(--card-2)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-[2px] shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate flex-1">{course.name}</span>
                    {selectedCourse.id === course.id && (
                      <Check size={13} className="text-[var(--accent)] shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The Authentic Marlo Pill */}
        <div className="timer__pill">
          <i
            className="timer__fill"
            style={{ transform: `scaleX(${progressRatio})` }}
          />
          <b className="timer__clock">{formatClock(seconds)}</b>
          <button
            type="button"
            className="timer__play"
            onClick={togglePlay}
            aria-label={isRunning ? "Pause the timer" : "Start the timer"}
            title={isRunning ? "Tạm dừng bấm giờ" : "Bắt đầu tính giờ học"}
          >
            {isRunning ? (
              <Pause size={17} strokeWidth={2.4} />
            ) : (
              <Play size={17} strokeWidth={2.4} className="ml-0.5" fill="currentColor" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

import { ArrowRight, GitFork, GraduationCap, Mail, Moon, Shield, Sparkles, Sun, UserRound, Loader2, Bot } from "lucide-react";
import { useState } from "react";
import type { Role, Theme } from "../App";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onLogin: (role: Role) => void;
}

const roles: { id: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "student", label: "Học viên", desc: "Học lý thuyết, làm quiz, vẽ sơ đồ tư duy & nộp bài GitHub", icon: <UserRound size={16} /> },
  { id: "instructor", label: "Giảng viên", desc: "Soạn giáo án AI, lập sơ đồ Master, chấm bài & thống kê AI", icon: <GraduationCap size={16} /> },
  { id: "admin", label: "Admin", desc: "Quản trị hệ thống lớp học, phân quyền & cấu hình linh vật", icon: <Shield size={16} /> },
];

export default function LoginScreen({ theme, onToggleTheme, onLogin }: Props) {
  const [selected, setSelected] = useState<Role>("student");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState("");

  const handleLoginClick = () => {
    setIsLoggingIn(true);
    
    // Simulate multi-step transition animations
    setLoginStep("Đang kết nối cổng xác thực...");
    setTimeout(() => {
      setLoginStep("Chứng thực thông tin tài khoản qua GitHub...");
      setTimeout(() => {
        setLoginStep("Đồng bộ tiến độ học liệu khóa học...");
        setTimeout(() => {
          setLoginStep("Khởi động trợ lý ảo AI Mentor...");
          setTimeout(() => {
            onLogin(selected);
          }, 450);
        }, 400);
      }, 400);
    }, 450);
  };

  return (
    <div className="pc-login-bg min-h-screen px-5 py-6 flex items-center justify-center relative overflow-hidden text-slate-800 dark:text-slate-100">
      
      {/* BACKGROUND DECORATIVE ELEMENTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* THEME TOGGLE BUTTON */}
      <button
        onClick={onToggleTheme}
        className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Đổi chế độ sáng tối"
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {/* LOADING OVERLAY SCREEN */}
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 animate-fade-in">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
              <Bot size={32} className="text-white fill-purple-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-slate-950">
              <Loader2 className="animate-spin text-white" size={14} />
            </div>
          </div>
          
          <div className="space-y-1 text-center">
            <h3 className="text-sm font-bold tracking-wider uppercase text-blue-400">Đang khởi tạo phiên làm việc</h3>
            <p className="text-xs text-slate-400 font-medium h-4 transition-all duration-300">
              {loginStep}
            </p>
          </div>
        </div>
      )}

      {/* LOGIN CARD BOX */}
      <div className="mx-auto grid min-h-[560px] max-w-5xl w-full grid-cols-1 md:grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative z-10">
        
        {/* LEFT COLUMN: HERO INFORMATION PANEL */}
        <section className="pc-dark-panel flex flex-col justify-between p-8 text-white relative overflow-hidden bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border-r border-slate-850">
          <div className="space-y-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/25">
                <Sparkles size={20} className="text-white fill-blue-300" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight leading-none text-white">CODE-MIND</div>
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">Personalized Programming Studio</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-semibold text-blue-300 leading-none">
                Bản demo giao diện cho nền tảng học lập trình AI
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold leading-tight tracking-tight">
                Học lập trình bằng lộ trình, mindmap và bài nộp GitHub có kiểm chứng.
              </h1>
              <p className="text-xs leading-5 text-slate-300">
                Mỗi bài học được chia thành đọc nhanh, video, quiz, canvas tư duy và thực hành. AI đóng vai trò đồng hành gợi mở, giảng viên giữ vai trò biên soạn nội dung và giám sát chất lượng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3.5 pt-6">
            {[
              ["62%", "tiến độ lớp học"],
              ["91/100", "integrity score"],
              ["2", "lỗi sai phổ biến"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-center shadow-inner">
                <div className="text-lg font-black text-white">{value}</div>
                <div className="mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <section className="flex items-center justify-center p-8 bg-white dark:bg-slate-900">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Đăng nhập demo</h2>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">Chọn vai trò thích hợp để tham gia thử nghiệm.</p>
            </div>

            {/* ROLE SELECTOR BUTTONS */}
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  className={`flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    selected === role.id
                      ? "border-blue-500 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-955/20 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-700"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors ${
                    selected === role.id ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {role.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{role.label}</span>
                    <span className="block text-[10px] text-slate-450 dark:text-slate-400 mt-1 leading-4 truncate">{role.desc}</span>
                  </span>
                  {selected === role.id && <ArrowRight size={14} className="text-blue-650 shrink-0" />}
                </button>
              ))}
            </div>

            {/* LOGIN BUTTONS */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleLoginClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <GitFork size={15} />
                Tiếp tục với GitHub
              </button>
              <button
                onClick={handleLoginClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-95 cursor-pointer"
              >
                <Mail size={15} />
                Tiếp tục với Email
              </button>
            </div>

            {/* TIP SECTION */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5 border border-slate-100 dark:border-slate-900 shadow-inner">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gợi ý trải nghiệm</div>
              <p className="mt-1 text-xs leading-5 text-slate-650 dark:text-slate-400 font-medium">
                Vào vai **Học viên** để trải nghiệm Workspace học tập vẽ sơ đồ và Cửa hàng XP Shop. Vào vai **Giảng viên** để duyệt tài liệu AI, quản lý giáo án và xem thống kê.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

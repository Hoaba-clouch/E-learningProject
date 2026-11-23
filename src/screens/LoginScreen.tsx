import { useEffect, useRef, useState } from "react";
import { Moon, Sun, ShieldCheck, KeyRound } from "lucide-react";
import type { Role, Theme } from "../App";
import {
  checkBackendHealth,
  demoLogin,
  forgotPasswordApi,
  loginUser,
  registerUser,
  resetPasswordApi,
  verifyLogin2FaApi,
} from "../api";
import "../styles/huddle.css";

interface Props {
  theme: Theme;
  onToggleTheme: (trigger?: any) => void;
  onLogin: (
    role: Role,
    opts?: { isNewSignUp?: boolean; pendingApproval?: boolean; user?: any }
  ) => void;
  onOpenIntro?: () => void;
}

const roleOptions: { id: Role; label: string; email: string }[] = [
  { id: "student", label: "Học viên", email: "hasib@gmail.com" },
  { id: "instructor", label: "Giảng viên", email: "lananh.gv@codemind.ai" },
  { id: "admin", label: "Quản trị viên", email: "admin@codemind.ai" },
];

const CONFETTI = ["#5b22f9", "#f97434", "#efc50d", "#17181d", "#e3d4ff"];

export default function LoginScreen({ theme, onToggleTheme, onLogin, onOpenIntro }: Props) {
  const [role, setRole] = useState<Role>("student");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailVal, setEmailVal] = useState("hasib@gmail.com");
  const [passwordVal, setPasswordVal] = useState("hasib123");
  const [isRevealed, setIsRevealed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isRefused, setIsRefused] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  // ── AUTH MODE & SECURITY FLOWS ──
  const [authStep, setAuthStep] = useState<"credentials" | "2fa" | "forgot" | "reset">("credentials");
  const [rememberMe, setRememberMe] = useState(true);
  const [fullName, setFullName] = useState("");
  const [fullNameErr, setFullNameErr] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordErr, setConfirmPasswordErr] = useState("");
  const [userCode, setUserCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [securityBanner, setSecurityBanner] = useState<string | null>(null);

  const huddleRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const focusRef = useRef<HTMLInputElement | null>(null);
  const [focusedField, setFocusedField] = useState<"email" | "password" | "fullname" | null>(null);
  const peekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const peekOffRef = useRef<NodeJS.Timeout | null>(null);
  const boxRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const gazeRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Compute Mood
  const mood = isSignedIn
    ? "win"
    : isBusy
    ? "busy"
    : isRefused
    ? "wrong"
    : isRevealed && passwordVal
    ? "exposed"
    : focusedField === "password"
    ? "shy"
    : focusedField === "email" || focusedField === "fullname"
    ? "nosy"
    : "idle";

  // Measure bounds
  const measure = () => {
    if (huddleRef.current) {
      boxRef.current = huddleRef.current.getBoundingClientRect();
    }
  };

  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  const pump = () => {
    const gaze = gazeRef.current;
    gaze.x += (gaze.tx - gaze.x) * 0.15;
    gaze.y += (gaze.ty - gaze.y) * 0.15;
    const done =
      Math.abs(gaze.tx - gaze.x) + Math.abs(gaze.ty - gaze.y) < 0.003;
    if (done) {
      gaze.x = gaze.tx;
      gaze.y = gaze.ty;
    }
    if (huddleRef.current) {
      huddleRef.current.style.setProperty("--px", gaze.x.toFixed(3));
      huddleRef.current.style.setProperty("--py", gaze.y.toFixed(3));
    }
    frameRef.current = done ? null : requestAnimationFrame(pump);
  };

  const lookAt = (x: number, y: number) => {
    if (!boxRef.current || !boxRef.current.width) measure();
    if (!boxRef.current) return;
    const n = boxRef.current.left + boxRef.current.width * 0.55;
    const o = boxRef.current.top + boxRef.current.height * 0.4;
    gazeRef.current.tx = clamp((x - n) / (boxRef.current.width * 0.85), -1, 1);
    gazeRef.current.ty = clamp((y - o) / (boxRef.current.height * 0.85), -1, 1);
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(pump);
    }
  };

  const lookAtEl = (el: HTMLElement, ratio = 0) => {
    const rect = el.getBoundingClientRect();
    lookAt(rect.left + rect.width * clamp(ratio, 0, 1), rect.top + rect.height * 0.5);
  };

  // Pointer & Window listeners
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        lookAt(e.clientX, e.clientY);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    measure();

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Schedule Ink peaking behavior when shy
  useEffect(() => {
    const inkEl = inkRef.current;
    if (mood !== "shy" || !inkEl) {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (peekOffRef.current) clearTimeout(peekOffRef.current);
      peekTimerRef.current = null;
      peekOffRef.current = null;
      inkEl?.classList.remove("is-peeking");
      return;
    }

    if (peekTimerRef.current) return;

    const peekLoop = () => {
      inkEl.classList.add("is-peeking");
      peekOffRef.current = setTimeout(() => {
        inkEl.classList.remove("is-peeking");
      }, 780);
      peekTimerRef.current = setTimeout(peekLoop, 3200);
    };

    peekTimerRef.current = setTimeout(peekLoop, 1400);

    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (peekOffRef.current) clearTimeout(peekOffRef.current);
    };
  }, [mood]);

  // Handle Confetti on Win
  const throwConfetti = () => {
    const confettiEl = confettiRef.current;
    if (!confettiEl) return;
    const fragment = document.createDocumentFragment();
    const items: HTMLElement[] = [];

    for (let n = 0; n < 26; n++) {
      const o = document.createElement("span");
      const r = n % 3 === 0;
      const s = 8 + Math.random() * 11;
      o.style.setProperty("--c", CONFETTI[n % CONFETTI.length]);
      o.style.setProperty("--w", `${s}px`);
      o.style.setProperty("--h", `${r ? s : s * (0.5 + Math.random())}px`);
      o.style.setProperty("--br", r ? "50%" : "2px");
      o.style.left = `${44 + (Math.random() - 0.5) * 34}%`;
      o.style.top = `${26 + Math.random() * 12}%`;
      fragment.append(o);
      items.push(o);
    }

    confettiEl.replaceChildren(fragment);

    for (const item of items) {
      const o = (Math.random() - 0.5) * 320;
      const r = -70 - Math.random() * 140;
      const s = (Math.random() - 0.5) * 620;

      item.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(.4)", opacity: 0, offset: 0 },
          { transform: `translate(${o * 0.55}px, ${r}px) rotate(${s * 0.5}deg) scale(1)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${o}px, ${r + 260}px) rotate(${s}deg) scale(.85)`, opacity: 0, offset: 1 },
        ],
        {
          duration: 1500 + Math.random() * 700,
          easing: "cubic-bezier(.2,.7,.4,1)",
          delay: Math.random() * 160,
          fill: "forwards",
        }
      ).addEventListener("finish", () => item.remove());
    }
  };

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    const item = roleOptions.find((opt) => opt.id === r);
    if (item) {
      setEmailVal(item.email);
    }
  };

  const handleTogglePeek = () => {
    setIsRevealed(!isRevealed);
    passwordRef.current?.focus({ preventScroll: true });
  };

  const handleCapsCheck = (e: React.KeyboardEvent) => {
    const isCaps = typeof e.getModifierState === "function" && e.getModifierState("CapsLock");
    setCapsOn(isCaps);
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: "", color: "#cbd5e1" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    if (score <= 1) return { level: 1, label: "Yếu", color: "#ef4444" };
    if (score === 2) return { level: 2, label: "Trung bình", color: "#f59e0b" };
    if (score === 3) return { level: 3, label: "Mạnh", color: "#10b981" };
    return { level: 4, label: "Rất mạnh", color: "#5b22f9" };
  };

  const passwordStrength = getPasswordStrength(isSignUp ? passwordVal : newResetPassword);

  const finishAuthenticatedTransition = (
    resolvedRole: Role,
    isNewSignUp: boolean,
    pendingApproval = false,
    user?: any
  ) => {
    setIsBusy(false);
    setIsSignedIn(true);
    throwConfetti();
    setTimeout(() => {
      onLogin(resolvedRole, { isNewSignUp, pendingApproval, user });
    }, 1500);
  };

  const handleGoogleDemoLogin = async () => {
    if (isBusy || isSignedIn) return;
    setIsBusy(true);
    setSecurityBanner(null);
    const data = await demoLogin(role);
    const resolved: Role =
      data?.role === "admin" || data?.role === "instructor" || data?.role === "student"
        ? data.role
        : role;
    finishAuthenticatedTransition(resolved, false, false, data?.user);
  };

  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || isSignedIn) return;
    setOtpErr("");
    if (!otpInput.trim()) {
      setOtpErr("Vui lòng nhập mã OTP 6 chữ số.");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
      return;
    }
    setIsBusy(true);
    try {
      const authData = await verifyLogin2FaApi(challengeToken, otpInput.trim());
      const resolved: Role =
        authData?.role === "admin" || authData?.role === "instructor" || authData?.role === "student"
          ? authData.role
          : role;
      finishAuthenticatedTransition(
        resolved,
        false,
        authData?.user?.status === "pending",
        authData?.user
      );
    } catch (err: any) {
      setIsBusy(false);
      setOtpErr(err?.message || "Mã OTP không hợp lệ");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setEmailErr("");
    if (!emailVal.trim()) {
      setEmailErr("Vui lòng nhập email cần khôi phục.");
      return;
    }
    setIsBusy(true);
    try {
      const res = await forgotPasswordApi(emailVal.trim());
      setChallengeToken(res.challenge_token);
      setMaskedEmail(res.masked_email);
      setDemoOtpHint(res.demo_otp_hint);
      setOtpInput("");
      setOtpErr("");
      setAuthStep("reset");
      setSecurityBanner(`Đã phát mã OTP khôi phục tới ${res.masked_email}`);
    } catch (err: any) {
      setEmailErr(err?.message || "Không tìm thấy tài khoản");
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setOtpErr("");
    setPasswordErr("");
    if (!otpInput.trim()) {
      setOtpErr("Vui lòng nhập mã OTP.");
      return;
    }
    if (newResetPassword.length < 6) {
      setPasswordErr("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    setIsBusy(true);
    try {
      const res = await resetPasswordApi(challengeToken, otpInput.trim(), newResetPassword);
      setPasswordVal(newResetPassword);
      setNewResetPassword("");
      setOtpInput("");
      setAuthStep("credentials");
      setSecurityBanner(res.message || "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.");
    } catch (err: any) {
      setOtpErr(err?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || isSignedIn) return;

    setEmailErr("");
    setPasswordErr("");
    setFullNameErr("");
    setConfirmPasswordErr("");
    setSecurityBanner(null);

    const emailTrim = emailVal.trim();
    if (!emailTrim) {
      setEmailErr("Enter your email address.");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
      emailRef.current?.focus();
      return;
    }

    // ── SIGN-UP VALIDATION ──
    if (isSignUp) {
      if (!fullName.trim()) {
        setFullNameErr("Vui lòng nhập họ và tên.");
        setIsRefused(true);
        setTimeout(() => setIsRefused(false), 900);
        return;
      }
    }

    if (!passwordVal) {
      setPasswordErr("Enter your password.");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
      passwordRef.current?.focus();
      return;
    }

    if (isSignUp && passwordVal.length < 6) {
      setPasswordErr("Mật khẩu phải có ít nhất 6 ký tự.");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
      return;
    }

    if (isSignUp && confirmPassword !== passwordVal) {
      setConfirmPasswordErr("Mật khẩu nhập lại chưa khớp.");
      setIsRefused(true);
      setTimeout(() => setIsRefused(false), 900);
      return;
    }

    setIsBusy(true);
    if (ctaRef.current) lookAtEl(ctaRef.current, 0.5);

    const backendUp = await checkBackendHealth();
    let resolvedRole: Role = role;
    let isPendingApproval = !backendUp && isSignUp && role === "student";
    let signedUser: any = null;

    if (backendUp) {
      try {
        const authData = isSignUp
          ? await registerUser({
              email: emailTrim,
              password: passwordVal,
              full_name: fullName.trim(),
              role,
              user_code: userCode.trim() || undefined,
            })
          : await loginUser(emailTrim, passwordVal, rememberMe);

        if (!isSignUp && authData?.requires_2fa) {
          setIsBusy(false);
          setChallengeToken(authData.challenge_token || "");
          setMaskedEmail(authData.masked_email || emailTrim);
          setDemoOtpHint(authData.demo_otp_hint || "");
          setOtpInput("");
          setOtpErr("");
          setAuthStep("2fa");
          return;
        }

        if (
          authData?.role === "admin" ||
          authData?.role === "instructor" ||
          authData?.role === "student"
        ) {
          resolvedRole = authData.role;
        }
        signedUser = authData?.user || null;
        isPendingApproval =
          resolvedRole === "student" && authData?.user?.status === "pending";
      } catch (err: any) {
        const msg = err?.message || "Email hoặc mật khẩu không chính xác";
        setIsBusy(false);
        if (msg.toLowerCase().includes("email đã")) {
          setEmailErr(msg);
        } else {
          setPasswordErr(msg);
        }
        setIsRefused(true);
        setTimeout(() => setIsRefused(false), 900);
        return;
      }
    }

    setTimeout(() => {
      finishAuthenticatedTransition(
        resolvedRole,
        isSignUp,
        isPendingApproval,
        signedUser
      );
    }, backendUp ? 500 : 1000);
  };

  return (
    <div className="huddle-page-root js">
      {/* 🌓 Floating Theme Toggle Button */}
      <button
        type="button"
        onClick={(e) => onToggleTheme(e.currentTarget)}
        aria-label="Toggle theme"
        title={theme === "dark" ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
        className="fixed top-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white cursor-pointer select-none"
      >
        {theme === "dark" ? (
          <Sun size={18} className="text-amber-400" />
        ) : (
          <Moon size={18} className="text-slate-200" />
        )}
      </button>

      <div className="room" aria-hidden="true" />

      <main className="stage">
        {/* MASTHEAD: EXACT REPLICA WITH CODEMIND IDENTITY */}
        <header className="masthead">
          <p className="masthead__eyebrow">CODEMIND AI · LEARNING OS</p>
          <h1 className="masthead__title">Huddle Sign-In</h1>
        </header>

        {/* ─── AUTH CARD CONTAINER WITH SINGLE DATA-MOOD ─── */}
        <section
          ref={authRef}
          className="auth"
          data-mood={mood}
          data-auth
        >
          {/* ————————————————————————————————————————————————————————————
               LEFT · THE HUDDLE ART (4 CHARACTERS)
          ————————————————————————————————————————————————————————————— */}
          <div className="auth__art">
            <div ref={huddleRef} className="huddle" data-huddle aria-hidden="true">
              {/* TALL · violet */}
              <div className="mate mate--tall" data-mate="tall">
                <div className="mate__breath">
                  <svg viewBox="0 0 134 270" focusable="false">
                    <rect className="ink-violet" x="0" y="118" width="134" height="152" />
                    <g className="tall__head">
                      <path className="ink-violet" d="M0 150 V16 Q0 4 12 4 H122 Q134 4 134 16 V150 Z" />
                      <rect className="tall__lit" x="0" y="4" width="134" height="9" rx="4.5" />

                      <g className="face">
                        <g className="face__eyes is-open">
                          <g className="face__pupils">
                            <rect className="face__ink" x="40" y="50" width="8" height="14" rx="4" />
                            <rect className="face__ink" x="86" y="50" width="8" height="14" rx="4" />
                          </g>
                        </g>
                        <g className="face__eyes is-shut">
                          <path className="face__line" d="M36 60 Q44 51 52 60" />
                          <path className="face__line" d="M82 60 Q90 51 98 60" />
                        </g>
                        <g className="face__eyes is-glad">
                          <path className="face__line" d="M36 60 Q44 48 52 60" />
                          <path className="face__line" d="M82 60 Q90 48 98 60" />
                        </g>
                        <g className="face__mouth is-calm">
                          <rect className="face__ink" x="63" y="80" width="8" height="12" rx="4" />
                        </g>
                        <g className="face__mouth is-o">
                          <ellipse className="face__ink" cx="67" cy="88" rx="7" ry="10" />
                        </g>
                        <g className="face__mouth is-frown">
                          <path className="face__line" d="M53 94 Q67 82 81 94" />
                        </g>
                        <g className="face__mouth is-grin">
                          <path className="face__ink" d="M49 84 Q67 108 85 84 Z" />
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* INK · black (the sneak peeker) */}
              <div ref={inkRef} className="mate mate--ink" data-mate="ink">
                <div className="mate__breath">
                  <svg viewBox="0 0 92 196" focusable="false">
                    <path className="ink-black" d="M0 196 V18 Q0 2 16 2 H76 Q92 2 92 18 V196 Z" />
                    <g className="face">
                      <g className="face__eyes is-open">
                        <circle className="ink-white" cx="29" cy="58" r="12.5" />
                        <circle className="ink-white" cx="63" cy="58" r="12.5" />
                        <g className="face__pupils">
                          <circle className="ink-black" cx="29" cy="58" r="6" />
                          <circle className="ink-black" cx="63" cy="58" r="6" />
                        </g>
                      </g>
                      <g className="face__eyes is-shut">
                        <path className="face__line face__line--light" d="M18 56 Q29 66 40 56" />
                        <path className="face__line face__line--light" d="M52 56 Q63 66 74 56" />
                      </g>
                      <g className="face__eyes is-peek">
                        <path className="face__line face__line--light" d="M18 56 Q29 66 40 56" />
                        <ellipse className="ink-white" cx="63" cy="57" rx="12.5" ry="7" />
                        <circle className="ink-black" cx="67" cy="58" r="5" />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* SUN · yellow */}
              <div className="mate mate--sun" data-mate="sun">
                <div className="mate__breath">
                  <svg viewBox="0 0 112 152" focusable="false">
                    <path className="ink-yellow" d="M0 152 V56 A56 56 0 0 1 112 56 V152 Z" />
                    <g className="sun__face face">
                      <g className="face__eyes is-open">
                        <g className="face__pupils">
                          <circle className="face__ink" cx="80" cy="50" r="5.5" />
                        </g>
                      </g>
                      <g className="face__eyes is-shut">
                        <path className="face__line" d="M72 50 Q80 42 88 50" />
                      </g>
                      <g className="face__mouth is-calm">
                        <path className="face__line face__line--lip" d="M62 88 H122" />
                      </g>
                      <g className="face__mouth is-wave">
                        <path className="face__line face__line--lip" d="M62 88 q9 -8 18 0 t18 0 t18 0" />
                      </g>
                      <g className="face__mouth is-grin">
                        <path className="face__line face__line--lip" d="M62 92 q20 -14 40 -22" />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* BLUSH · orange */}
              <div className="mate mate--blush" data-mate="blush">
                <div className="mate__breath">
                  <svg viewBox="0 0 264 134" focusable="false">
                    <path className="ink-orange" d="M0 134 A132 132 0 0 1 264 134 Z" />
                    <g className="face">
                      <g className="face__eyes is-open">
                        <g className="face__pupils">
                          <circle className="face__ink" cx="100" cy="74" r="8" />
                          <circle className="face__ink" cx="164" cy="74" r="8" />
                        </g>
                      </g>
                      <g className="face__eyes is-shut">
                        <path className="face__line" d="M88 78 Q100 64 112 78" />
                        <path className="face__line" d="M152 78 Q164 64 176 78" />
                      </g>
                      <g className="face__mouth is-calm">
                        <path className="face__ink" d="M110 92 Q132 116 154 92 Z" />
                      </g>
                      <g className="face__mouth is-dots">
                        <circle className="face__ink" cx="108" cy="104" r="4.5" />
                        <circle className="face__ink" cx="132" cy="104" r="4.5" />
                        <circle className="face__ink" cx="156" cy="104" r="4.5" />
                      </g>
                      <g className="face__mouth is-frown">
                        <path className="face__line" d="M110 108 Q132 88 154 108" />
                      </g>
                      <g className="face__mouth is-grin">
                        <path className="face__ink" d="M98 86 Q132 128 166 86 Z" />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            </div>

            {/* Confetti Explosion Container */}
            <div ref={confettiRef} className="confetti" data-confetti aria-hidden="true" />
          </div>

          {/* ————————————————————————————————————————————————————————————
               RIGHT · THE AUTHENTIC FORM PANEL
          ————————————————————————————————————————————————————————————— */}
          <div className="auth__panel">
            <div className="panel__inner" data-shake>
              {/* Sparkle Star Mark */}
              <svg className="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 1c.9 6 4.1 9.2 10 10-5.9.8-9.1 4-10 10-.9-6-4.1-9.2-10-10 5.9-.8 9.1-4 10-10Z" />
              </svg>

              <h2 className="panel__title">
                {authStep === "2fa"
                  ? "Xác thực 2 lớp (2FA)"
                  : authStep === "forgot"
                  ? "Khôi phục mật khẩu"
                  : authStep === "reset"
                  ? "Đặt mật khẩu mới"
                  : isSignUp
                  ? "Create an account"
                  : "Welcome back"}
              </h2>
              <p className="panel__sub">
                {authStep === "2fa"
                  ? `Nhập mã OTP 6 chữ số gửi tới ${maskedEmail}`
                  : authStep === "forgot"
                  ? "Nhập email đã đăng ký để nhận mã OTP bảo mật."
                  : authStep === "reset"
                  ? `Xác minh OTP cho ${maskedEmail} và thiết lập mật khẩu mới.`
                  : isSignUp
                  ? "Join the CodeMind community today."
                  : "Please enter your details."}
              </p>

              {securityBanner && (
                <div
                  style={{
                    marginBottom: "14px",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    background: "rgba(23, 134, 79, 0.1)",
                    border: "1px solid rgba(23, 134, 79, 0.3)",
                    color: "#166534",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  ✓ {securityBanner}
                </div>
              )}

              {authStep === "2fa" ? (
                <form className="form" onSubmit={handleVerify2FaSubmit} noValidate>
                  {demoOtpHint && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpInput(demoOtpHint);
                        setOtpErr("");
                      }}
                      style={{
                        width: "100%",
                        marginBottom: "16px",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "rgba(91, 34, 249, 0.08)",
                        border: "1px dashed rgba(91, 34, 249, 0.45)",
                        color: "var(--violet)",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <ShieldCheck size={15} />
                      <span>Mã OTP Sandbox: {demoOtpHint} (Nhấn để điền nhanh)</span>
                    </button>
                  )}

                  <div className="field" data-field="otp" data-invalid={otpErr ? "" : undefined}>
                    <label className="field__label" htmlFor="otp-2fa">
                      Mã xác thực OTP (6 chữ số)
                    </label>
                    <input
                      className="field__input"
                      id="otp-2fa"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value);
                        if (otpErr) setOtpErr("");
                      }}
                    />
                    <span className="field__rule" aria-hidden="true" />
                    <p className="field__err" data-shown={otpErr ? "" : undefined}>
                      <span>{otpErr}</span>
                    </p>
                  </div>

                  <div className="actions">
                    <button className="cta" type="submit" data-cta data-busy={isBusy ? "" : undefined}>
                      <span className="cta__label">Xác minh &amp; Đăng nhập</span>
                      <span className="cta__spin" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="panel__foot">
                    <a
                      className="link link--strong"
                      href="#back-login"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthStep("credentials");
                        setOtpErr("");
                      }}
                    >
                      ← Quay lại đăng nhập
                    </a>
                  </p>
                </form>
              ) : authStep === "forgot" ? (
                <form className="form" onSubmit={handleForgotSubmit} noValidate>
                  <div className="field" data-field="email" data-invalid={emailErr ? "" : undefined}>
                    <label className="field__label" htmlFor="forgot-email">
                      Email tài khoản
                    </label>
                    <input
                      className="field__input"
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={emailVal}
                      onChange={(e) => {
                        setEmailVal(e.target.value);
                        if (emailErr) setEmailErr("");
                      }}
                    />
                    <span className="field__rule" aria-hidden="true" />
                    <p className="field__err" data-shown={emailErr ? "" : undefined}>
                      <span>{emailErr}</span>
                    </p>
                  </div>

                  <div className="actions">
                    <button className="cta" type="submit" data-cta data-busy={isBusy ? "" : undefined}>
                      <span className="cta__label">Gửi mã OTP khôi phục</span>
                      <span className="cta__spin" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="panel__foot">
                    <a
                      className="link link--strong"
                      href="#back-login"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthStep("credentials");
                        setEmailErr("");
                      }}
                    >
                      ← Quay lại đăng nhập
                    </a>
                  </p>
                </form>
              ) : authStep === "reset" ? (
                <form className="form" onSubmit={handleResetPasswordSubmit} noValidate>
                  {demoOtpHint && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpInput(demoOtpHint);
                        setOtpErr("");
                      }}
                      style={{
                        width: "100%",
                        marginBottom: "14px",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "rgba(91, 34, 249, 0.08)",
                        border: "1px dashed rgba(91, 34, 249, 0.45)",
                        color: "var(--violet)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <KeyRound size={14} />
                      <span>OTP Khôi phục: {demoOtpHint} (Nhấn điền nhanh)</span>
                    </button>
                  )}

                  <div className="field" data-invalid={otpErr ? "" : undefined}>
                    <label className="field__label" htmlFor="reset-otp">
                      Mã OTP khôi phục
                    </label>
                    <input
                      className="field__input"
                      id="reset-otp"
                      type="text"
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value);
                        if (otpErr) setOtpErr("");
                      }}
                    />
                    <span className="field__rule" aria-hidden="true" />
                    <p className="field__err" data-shown={otpErr ? "" : undefined}>
                      <span>{otpErr}</span>
                    </p>
                  </div>

                  <div className="field" data-invalid={passwordErr ? "" : undefined}>
                    <label className="field__label" htmlFor="reset-new-pw">
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <input
                      className="field__input"
                      id="reset-new-pw"
                      type="password"
                      placeholder="••••••••"
                      value={newResetPassword}
                      onChange={(e) => {
                        setNewResetPassword(e.target.value);
                        if (passwordErr) setPasswordErr("");
                      }}
                    />
                    <span className="field__rule" aria-hidden="true" />
                    <p className="field__err" data-shown={passwordErr ? "" : undefined}>
                      <span>{passwordErr}</span>
                    </p>
                  </div>

                  <div className="actions">
                    <button className="cta" type="submit" data-cta data-busy={isBusy ? "" : undefined}>
                      <span className="cta__label">Đặt lại mật khẩu &amp; Mở khóa</span>
                      <span className="cta__spin" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="panel__foot">
                    <a
                      className="link link--strong"
                      href="#back-login"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthStep("credentials");
                      }}
                    >
                      ← Hủy và quay lại đăng nhập
                    </a>
                  </p>
                </form>
              ) : (
                <>
                  {onOpenIntro && (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                      <button
                        type="button"
                        onClick={onOpenIntro}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          background: "rgba(0, 0, 0, 0.04)",
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          color: "#475569",
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>Giới thiệu Nền tảng &amp; Lộ trình Khóa học</span>
                        <span style={{ fontSize: "0.82rem" }}>→</span>
                      </button>
                    </div>
                  )}

                  {/* SLEEK ROLE SELECTOR PILLS */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
                    {roleOptions.map((r) => {
                      const isSel = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleSelect(r.id)}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            borderRadius: "8px",
                            border: isSel ? "1.5px solid var(--violet)" : "1px solid var(--hair)",
                            background: isSel ? "rgba(91, 34, 249, 0.08)" : "transparent",
                            color: isSel ? "var(--violet)" : "var(--muted)",
                            fontWeight: isSel ? 600 : 500,
                            fontSize: "0.76rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* FORM */}
                  <form className="form" data-form onSubmit={handleSubmit} noValidate>
                    {/* Email Field */}
                    <div className="field" data-field="email" data-invalid={emailErr ? "" : undefined}>
                      <label className="field__label" htmlFor="email">
                        Email
                      </label>
                      <input
                        ref={emailRef}
                        className="field__input"
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        spellCheck="false"
                        enterKeyHint="next"
                        placeholder="you@example.com"
                        value={emailVal}
                        onChange={(e) => {
                          setEmailVal(e.target.value);
                          if (emailErr) setEmailErr("");
                          lookAtEl(e.target, clamp(e.target.value.length / 26, 0, 1) * 0.9 + 0.05);
                        }}
                        onFocus={() => {
                          focusRef.current = emailRef.current;
                          setFocusedField("email");
                          if (emailRef.current) lookAtEl(emailRef.current, 0.1);
                        }}
                        onBlur={() => {
                          if (focusRef.current === emailRef.current) focusRef.current = null;
                          setFocusedField(null);
                        }}
                      />
                      <span className="field__rule" aria-hidden="true" />
                      <p className="field__err" id="err-email" data-shown={emailErr ? "" : undefined}>
                        <svg className="field__err-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <circle cx="8" cy="8" r="6.6" />
                          <path d="M8 4.9v3.6" />
                          <circle cx="8" cy="11.1" r=".95" />
                        </svg>
                        <span>{emailErr}</span>
                      </p>
                    </div>

                    {/* ── SIGN-UP EXTRA FIELDS ── */}
                    {isSignUp && (
                      <>
                        <div className="field" data-field="fullname" data-invalid={fullNameErr ? "" : undefined}>
                          <label className="field__label" htmlFor="fullname">
                            Họ và tên
                          </label>
                          <input
                            ref={fullNameRef}
                            className="field__input"
                            id="fullname"
                            name="fullname"
                            type="text"
                            autoComplete="name"
                            spellCheck="false"
                            enterKeyHint="next"
                            placeholder="Nguyễn Văn A"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (fullNameErr) setFullNameErr("");
                              lookAtEl(e.target, clamp(e.target.value.length / 20, 0, 1) * 0.9 + 0.05);
                            }}
                            onFocus={() => {
                              focusRef.current = fullNameRef.current;
                              setFocusedField("fullname");
                              if (fullNameRef.current) lookAtEl(fullNameRef.current, 0.1);
                            }}
                            onBlur={() => {
                              if (focusRef.current === fullNameRef.current) focusRef.current = null;
                              setFocusedField(null);
                            }}
                          />
                          <span className="field__rule" aria-hidden="true" />
                          <p className="field__err" id="err-fullname" data-shown={fullNameErr ? "" : undefined}>
                            <svg className="field__err-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                              <circle cx="8" cy="8" r="6.6" />
                              <path d="M8 4.9v3.6" />
                              <circle cx="8" cy="11.1" r=".95" />
                            </svg>
                            <span>{fullNameErr}</span>
                          </p>
                        </div>

                        <div className="field" style={{ paddingBottom: "22px" }}>
                          <label className="field__label" htmlFor="usercode">
                            Mã sinh viên / Mã GV (tùy chọn)
                          </label>
                          <input
                            className="field__input"
                            id="usercode"
                            type="text"
                            placeholder="2210899"
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                          />
                          <span className="field__rule" style={{ bottom: "22px" }} aria-hidden="true" />
                        </div>
                      </>
                    )}

                    {/* Password Field */}
                    <div className="field" data-field="password" data-invalid={passwordErr ? "" : undefined}>
                      <label className="field__label" htmlFor="password">
                        Password
                      </label>
                      <input
                        ref={passwordRef}
                        className="field__input field__input--pw"
                        id="password"
                        name="password"
                        type={isRevealed ? "text" : "password"}
                        autoComplete="current-password"
                        enterKeyHint="go"
                        placeholder="••••••••"
                        value={passwordVal}
                        onChange={(e) => {
                          setPasswordVal(e.target.value);
                          if (passwordErr) setPasswordErr("");
                        }}
                        onFocus={() => {
                          focusRef.current = passwordRef.current;
                          setFocusedField("password");
                        }}
                        onBlur={() => {
                          if (focusRef.current === passwordRef.current) focusRef.current = null;
                          setFocusedField(null);
                          setCapsOn(false);
                        }}
                        onKeyDown={handleCapsCheck}
                        onKeyUp={handleCapsCheck}
                      />
                      <button
                        className="peek"
                        type="button"
                        data-peek
                        aria-pressed={isRevealed}
                        aria-controls="password"
                        onClick={handleTogglePeek}
                      >
                        <span className="sr-only">
                          {isRevealed ? "Hide password" : "Show password"}
                        </span>
                        <svg className="peek__icon peek__icon--on" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z" />
                          <circle cx="12" cy="12" r="3.1" />
                        </svg>
                        <svg className="peek__icon peek__icon--off" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M2.6 12S6.4 5.8 12 5.8c1.4 0 2.7.4 3.8 1M21.4 12s-3.8 6.2-9.4 6.2c-1.5 0-2.8-.4-4-1.1" />
                          <path d="M9.9 9.9a3.1 3.1 0 0 0 4.3 4.3" />
                          <path d="M4 4l16 16" />
                        </svg>
                      </button>
                      <span className="field__rule" aria-hidden="true" />
                      <p className="field__err" id="err-password" data-shown={passwordErr ? "" : undefined}>
                        <svg className="field__err-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <circle cx="8" cy="8" r="6.6" />
                          <path d="M8 4.9v3.6" />
                          <circle cx="8" cy="11.1" r=".95" />
                        </svg>
                        <span>{passwordErr}</span>
                      </p>
                      {capsOn && <p className="caps" id="caps">Caps lock is on.</p>}
                    </div>

                    {isSignUp && passwordVal && (
                      <div style={{ marginTop: "-18px", marginBottom: "14px" }}>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                          {[1, 2, 3, 4].map((lvl) => (
                            <span
                              key={lvl}
                              style={{
                                flex: 1,
                                height: "4px",
                                borderRadius: "99px",
                                background: lvl <= passwordStrength.level ? passwordStrength.color : "#e2e8f0",
                                transition: "background 0.2s ease",
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: passwordStrength.color }}>
                          Độ mạnh mật khẩu: {passwordStrength.label}
                        </span>
                      </div>
                    )}

                    {isSignUp && (
                      <div className="field" data-invalid={confirmPasswordErr ? "" : undefined}>
                        <label className="field__label" htmlFor="confirm-password">
                          Nhập lại mật khẩu
                        </label>
                        <input
                          className="field__input"
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordErr) setConfirmPasswordErr("");
                          }}
                        />
                        <span className="field__rule" aria-hidden="true" />
                        <p className="field__err" data-shown={confirmPasswordErr ? "" : undefined}>
                          <span>{confirmPasswordErr}</span>
                        </p>
                      </div>
                    )}

                    {/* Remember & Forgot Row */}
                    <div className="row" data-fade>
                      <label className="check">
                        <input
                          type="checkbox"
                          name="remember"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="check__box" aria-hidden="true">
                          <svg viewBox="0 0 16 16" focusable="false">
                            <path d="M3.5 8.4 6.6 11.5 12.5 5" pathLength="1" />
                          </svg>
                        </span>
                        <span className="check__text">Remember for 30 days</span>
                      </label>
                      <a
                        className="link"
                        href="#forgot"
                        onClick={(e) => {
                          e.preventDefault();
                          setSecurityBanner(null);
                          setEmailErr("");
                          setAuthStep("forgot");
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>

                    {/* CTA Action button & Done Box */}
                    {isSignUp && role === "student" && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          lineHeight: 1.45,
                          color: "#64748b",
                          margin: "0 0 10px",
                        }}
                      >
                        Học viên mới đăng ký sẽ xem trang Giới thiệu và chờ Quản trị viên phê duyệt quyền vào học.
                      </p>
                    )}
                    <div className="actions">
                      <button
                        ref={ctaRef}
                        className="cta"
                        type="submit"
                        data-cta
                        data-busy={isBusy ? "" : undefined}
                      >
                        <span className="cta__label">{isSignUp ? "Sign up" : "Log in"}</span>
                        <span className="cta__spin" aria-hidden="true" />
                        <svg className="cta__check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M5.5 12.6 10 17l8.5-9.5" pathLength="1" />
                        </svg>
                      </button>

                      <div className="done" data-done inert={!isSignedIn ? true : undefined}>
                        <p className="done__who">
                          Signed in as <b>{emailVal}</b>
                        </p>
                        <button
                          className="reset"
                          type="button"
                          onClick={() => setIsSignedIn(false)}
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="sep" data-fade>
                    <span>or</span>
                  </div>

                  {/* Google Button */}
                  <button
                    className="ghost"
                    type="button"
                    data-google
                    data-fade
                    onClick={handleGoogleDemoLogin}
                  >
                    <svg className="ghost__g" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
                      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
                      <path fill="#FBBC05" d="M6.4 14a5.9 5.9 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14Z" />
                      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6A5.9 5.9 0 0 1 12 5.9Z" />
                    </svg>
                    Log in with Google
                  </button>

                  {/* Foot Switch */}
                  <p className="panel__foot" data-fade>
                    {isSignUp ? (
                      <>
                        Already have an account?{" "}
                        <a
                          className="link link--strong"
                          href="#login"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsSignUp(false);
                            setConfirmPasswordErr("");
                          }}
                        >
                          Log in
                        </a>
                      </>
                    ) : (
                      <>
                        Don&apos;t have an account?{" "}
                        <a
                          className="link link--strong"
                          href="#signup"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsSignUp(true);
                          }}
                        >
                          Sign up
                        </a>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* HINT AT FOOTER */}
        <p className="hint">
          <span className="hint__say">Type your password. Watch them look away.</span>
          <span className="hint__creds">
            <span className="hint__b">{emailVal}</span> · <span className="hint__b">hasib123</span>
          </span>
        </p>
      </main>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Monitor,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import type { Role } from "../App";
import {
  changePasswordApi,
  fetchSecurityOverviewApi,
  revokeOtherSessionsApi,
  revokeUserSessionApi,
  rotateCurrentJwtApi,
  simulateNewDeviceSessionApi,
  toggleDeviceTrustApi,
  updateSecuritySettingsApi,
  type SecurityOverviewBundle,
  type UserDeviceSession,
} from "../api";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloTitle from "../components/MarloTitle";
import OdometerNumber from "../components/OdometerNumber";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";

interface Props {
  role: Role;
  onLogout: () => void;
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone size={18} className="text-blue-600 dark:text-blue-400" />;
    case "tablet":
      return <Tablet size={18} className="text-amber-600 dark:text-amber-400" />;
    case "laptop":
      return <Laptop size={18} className="text-indigo-600 dark:text-indigo-400" />;
    default:
      return <Monitor size={18} className="text-slate-700 dark:text-slate-300" />;
  }
}

function getStrengthMeta(pwd: string) {
  if (!pwd) return { level: 0, label: "Chưa nhập", bar: "bg-slate-200", text: "text-slate-400" };
  let s = 0;
  if (pwd.length >= 6) s += 1;
  if (pwd.length >= 10) s += 1;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) s += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) s += 1;
  if (s <= 1) return { level: 1, label: "Yếu", bar: "bg-rose-500", text: "text-rose-600" };
  if (s === 2) return { level: 2, label: "Trung bình", bar: "bg-amber-500", text: "text-amber-600" };
  if (s === 3) return { level: 3, label: "Mạnh", bar: "bg-emerald-500", text: "text-emerald-600" };
  return { level: 4, label: "Rất mạnh", bar: "bg-blue-600", text: "text-blue-600" };
}

export default function SecurityDevicesScreen({ role, onLogout }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"devices" | "security" | "activity">("devices");
  const [bundle, setBundle] = useState<SecurityOverviewBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [simPreset, setSimPreset] = useState<"mobile" | "linux" | "lab">("mobile");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Change Form State
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [revokeOthersOnPwdChange, setRevokeOthersOnPwdChange] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setErrorMsg(null);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    const data = await fetchSecurityOverviewApi(role);
    if (data) setBundle(data);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useMarloPageEntrance(
    containerRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card");
      if (cards.length > 0) animateMarloCards(cards, { stagger: 0.05, y: 18 });
      const rows = el.querySelectorAll(".marlo-row");
      if (rows.length > 0) animateMarloRows(rows, { y: 10, stagger: 0.03, delay: 0.15 });
    },
    [activeTab, bundle?.sessions.length]
  );

  const handleToggle2FA = async () => {
    if (!bundle) return;
    setBusyAction("2fa");
    setErrorMsg(null);
    const nextState = !bundle.user.twoFactorEnabled;
    const res = await updateSecuritySettingsApi(nextState);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await loadData();
    showToast(
      nextState
        ? "Đã bật Xác thực 2 lớp (2FA OTP). Lần đăng nhập tiếp theo sẽ yêu cầu mã OTP."
        : "Đã tắt Xác thực 2 lớp (2FA OTP)."
    );
  };

  const handleSimulateDevice = async () => {
    setBusyAction("simulate");
    setErrorMsg(null);
    const res = await simulateNewDeviceSessionApi(simPreset);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await loadData();
    showToast(`Đã ghi nhận đăng nhập mới từ ${res.session?.device || "Thiết bị mới"}`);
  };

  const handleToggleTrust = async (sess: UserDeviceSession) => {
    setBusyAction(sess.id);
    setErrorMsg(null);
    const nextTrusted = sess.isUntrusted;
    const res = await toggleDeviceTrustApi(sess.id, nextTrusted);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await loadData();
    showToast(
      nextTrusted
        ? `Đã xác nhận ${sess.device} là Thiết bị Tin cậy.`
        : `Đã đánh dấu ${sess.device} là Thiết bị đáng ngờ.`
    );
  };

  const handleRevokeSession = async (sess: UserDeviceSession) => {
    setBusyAction(sess.id);
    setErrorMsg(null);
    const res = await revokeUserSessionApi(sess.id);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    if (sess.isCurrent) {
      onLogout();
      return;
    }
    await loadData();
    showToast(`Đã đăng xuất từ xa thiết bị ${sess.device} và hủy Refresh Token.`);
  };

  const handleRevokeOthers = async () => {
    setBusyAction("revoke-others");
    setErrorMsg(null);
    const res = await revokeOtherSessionsApi();
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await loadData();
    showToast(`Đã thu hồi ${res.revoked_count ?? 0} phiên thiết bị khác.`);
  };

  const handleRotateJwt = async () => {
    setBusyAction("rotate");
    setErrorMsg(null);
    const res = await rotateCurrentJwtApi();
    setBusyAction(null);
    if (!res.ok) {
      setErrorMsg(res.error || "Không thể xoay vòng JWT Token");
      return;
    }
    await loadData();
    showToast("Đã xoay vòng Access Token (15p) & Refresh Token mới thành công!");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!currentPwd || newPwd.length < 6) {
      setErrorMsg("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMsg("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusyAction("change-pwd");
    const res = await changePasswordApi({
      current_password: currentPwd,
      new_password: newPwd,
      revoke_other_sessions: revokeOthersOnPwdChange,
    });
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    await loadData();
    showToast(
      `Đã đổi mật khẩu Bcrypt thành công${
        (res.revoked_other_count || 0) > 0
          ? ` và đăng xuất ${res.revoked_other_count} thiết bị khác`
          : ""
      }.`
    );
  };

  const activeSessions = bundle?.sessions ?? [];
  const revokedSessions = bundle?.revokedSessions ?? [];
  const untrustedCount = activeSessions.filter((s) => s.isUntrusted).length;
  const strength = getStrengthMeta(newPwd);

  return (
    <div ref={containerRef} className="min-h-full p-4 lg:p-6 space-y-5 text-slate-900 dark:text-slate-100">
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            {toast}
          </span>
          <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-rose-600 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 dark:border-slate-800 pb-5 animate-cascade-1">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill--info font-mono text-[11px] font-bold">
              <ShieldCheck size={13} />
              Account Security • JWT Token Rotation &amp; Multi-Device Guard
            </span>
            {bundle?.user && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                {bundle.user.email} · #{bundle.user.userCode}
              </span>
            )}
          </div>
          <MarloTitle
            text="Bảo mật Tài khoản, Phiên Đăng nhập & Thiết bị"
            className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
          />
          <p className="mt-1 text-sm text-[#62656b] dark:text-[#a0a3a9] max-w-3xl">
            Quản lý thiết bị đang đăng nhập, kích hoạt Xác thực 2 lớp (2FA OTP), đổi mật khẩu Bcrypt và thu hồi phiên từ xa tức thì.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <select
              aria-label="Chọn mẫu thiết bị giả lập"
              value={simPreset}
              onChange={(e) => setSimPreset(e.target.value as any)}
              className="px-2 py-1 text-xs font-mono bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="mobile">iPhone 15 Pro (4G)</option>
              <option value="linux">Ubuntu · Firefox</option>
              <option value="lab">Phòng Lab B2 · Edge</option>
            </select>
            <button
              onClick={handleSimulateDevice}
              disabled={busyAction !== null}
              className="btn-marlo-secondary btn--secondary flex items-center gap-1 text-xs py-1.5 px-2.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>Giả lập Thiết bị Mới</span>
            </button>
          </div>

          <button
            onClick={handleRevokeOthers}
            disabled={busyAction !== null || activeSessions.filter((s) => !s.isCurrent).length === 0}
            className="btn-marlo-primary btn--primary flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>Đăng xuất mọi thiết bị khác</span>
          </button>
        </div>
      </header>

      {/* 4 Security KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Điểm Bảo mật</span>
            <Shield size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              <OdometerNumber value={bundle?.securityScore ?? 75} />
            </span>
            <span className="text-xs font-mono text-slate-400">/100</span>
            <span
              className={`pill pill--plain text-[10.5px] font-bold ${
                (bundle?.securityScore ?? 75) >= 85 ? "pill--good" : "pill--warn"
              }`}
            >
              {(bundle?.securityScore ?? 75) >= 85
                ? "An toàn cao"
                : bundle?.user.twoFactorEnabled
                ? "Rà soát thiết bị"
                : "Nên bật 2FA"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Băm Bcrypt + Bảo vệ Brute-Force (khóa 5 lần sai).
          </p>
        </div>

        <div className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Thiết bị Hoạt động</span>
            <Laptop size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              <OdometerNumber value={activeSessions.length} />
            </span>
            <span
              className={`pill pill--plain text-[10.5px] font-bold ${
                untrustedCount > 0 ? "pill--warn" : "pill--good"
              }`}
            >
              {untrustedCount > 0 ? `${untrustedCount} thiết bị mới` : "Đều tin cậy"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Đã thu hồi: {revokedSessions.length} phiên gần đây.
          </p>
        </div>

        <div className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Xác thực 2 lớp (2FA)</span>
            <KeyRound size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {bundle?.user.twoFactorEnabled ? "Đang bật" : "Đang tắt"}
            </span>
            <span
              className={`pill pill--plain text-[10.5px] font-bold ${
                bundle?.user.twoFactorEnabled ? "pill--good" : "pill--bad"
              }`}
            >
              {bundle?.user.twoFactorEnabled ? "OTP 6 số" : "Tắt"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Yêu cầu mã OTP 6 chữ số khi đăng nhập thiết bị mới.
          </p>
        </div>

        <div className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Phiên JWT &amp; Rotation</span>
            <RefreshCw size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              Access 15p · Refresh 7d
            </span>
            <button
              onClick={handleRotateJwt}
              disabled={busyAction !== null}
              className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 cursor-pointer transition"
            >
              Xoay vòng ngay
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {bundle?.tokenInfo.algorithm || "HS256 + Bcrypt"} · {bundle?.tokenInfo.lastIssuedLabel || "Vừa xong"}
          </p>
        </div>
      </section>

      {/* Segmented Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-sm overflow-x-auto">
        <MarloSegmentedControl
          value={activeTab}
          options={[
            {
              id: "devices",
              label: "Thiết bị & Phiên Đăng nhập",
              icon: <Laptop size={15} />,
              badge: activeSessions.length || undefined,
            },
            {
              id: "security",
              label: "Mật khẩu & Xác thực 2FA",
              icon: <Lock size={15} />,
            },
            {
              id: "activity",
              label: "Nhật ký An ninh",
              icon: <History size={15} />,
              badge: bundle?.recentAudits.length || undefined,
            },
          ]}
          onChange={(val) => setActiveTab(val as any)}
          tone="dark"
        />
      </div>

      {/* TAB 1: DEVICES & SESSIONS */}
      {activeTab === "devices" && (
        <div className="space-y-5">
          {untrustedCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Phát hiện {untrustedCount} thiết bị mới / chưa xác minh tin cậy
                  </div>
                  <div className="mt-0.5 text-amber-800 dark:text-amber-300">
                    Nếu không phải bạn thực hiện, hãy bấm <strong>Đăng xuất từ xa</strong> ngay để vô hiệu hóa phiên và Refresh Token trên thiết bị đó.
                  </div>
                </div>
              </div>
              <button
                onClick={handleRevokeOthers}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition"
              >
                Thu hồi tất cả thiết bị khác
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop size={16} className="text-blue-600" />
                Danh sách Thiết bị Đang Hoạt động ({activeSessions.length})
              </h2>
              <span className="text-xs text-slate-500 font-mono">Đồng bộ Admin JWT Monitor</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Đang tải danh sách phiên thiết bị...</div>
            ) : (
              <div className="space-y-2.5">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`marlo-row p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                      sess.isCurrent
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        : sess.isUntrusted
                        ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        {getDeviceIcon(sess.deviceType)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {sess.device}
                          </span>
                          {sess.isCurrent && (
                            <span className="pill pill--good pill--plain text-[10px] font-bold">
                              Thiết bị hiện tại
                            </span>
                          )}
                          <span
                            className={`pill pill--plain text-[10px] font-bold ${
                              sess.isUntrusted ? "pill--warn" : "pill--info"
                            }`}
                          >
                            {sess.state}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-2">
                          <span>{sess.ipLocation}</span>
                          <span>•</span>
                          <span>Cấp lúc: {sess.issuedAt}</span>
                          <span>•</span>
                          <span>
                            {sess.os} / {sess.browser}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleTrust(sess)}
                        disabled={busyAction !== null}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition"
                      >
                        {sess.isUntrusted ? "Đánh dấu Tin cậy" : "Đánh dấu Thiết bị lạ"}
                      </button>
                      <button
                        onClick={() => handleRevokeSession(sess)}
                        disabled={busyAction !== null}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <LogOut size={13} />
                        <span>{sess.isCurrent ? "Đăng xuất" : "Đăng xuất từ xa"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {revokedSessions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Lịch sử Phiên đã Đăng xuất / Bị Thu hồi ({revokedSessions.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {revokedSessions.map((rs) => (
                  <div key={rs.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(rs.deviceType)}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{rs.device}</span>
                      <span className="font-mono text-[11px]">{rs.ipLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="pill pill--plain text-[10px] font-bold">{rs.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASSWORD & 2FA */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 2FA Settings Card */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" />
                  Xác thực 2 lớp (2FA OTP)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Khi kích hoạt, mọi lần đăng nhập bằng email &amp; mật khẩu đều bắt buộc nhập thêm mã OTP 6 chữ số có hiệu lực 5 phút.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(bundle?.user.twoFactorEnabled)}
                onClick={handleToggle2FA}
                disabled={busyAction !== null}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  bundle?.user.twoFactorEnabled
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {bundle?.user.twoFactorEnabled ? "Đang bật • Tắt 2FA" : "Bật 2FA OTP"}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100">Cơ chế Bảo vệ Tài khoản hiện hành:</div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11.5px]">
                <li>✓ Băm mật khẩu Bcrypt với muối (salt) ngẫu nhiên riêng biệt.</li>
                <li>✓ Tự động khóa 15 phút (HTTP 423) nếu nhập sai mật khẩu 5 lần liên tiếp.</li>
                <li>✓ Xoay vòng Refresh Token &amp; vô hiệu hóa phiên tức thì khi thu hồi.</li>
              </ul>
            </div>
          </div>

          {/* Change Password Card */}
          <form
            onSubmit={handleChangePassword}
            className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-4"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound size={18} className="text-amber-600" />
                Đổi Mật khẩu An toàn (Bcrypt)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật mật khẩu mới và tự động đăng xuất các thiết bị khác để chống chiếm phiên.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Mật khẩu mới..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nhập lại mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Xác nhận mật khẩu..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {newPwd && (
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((lvl) => (
                      <span
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          lvl <= strength.level ? strength.bar : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div className={`text-[11px] font-bold ${strength.text}`}>
                    Độ mạnh: {strength.label}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={revokeOthersOnPwdChange}
                  onChange={(e) => setRevokeOthersOnPwdChange(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-600 dark:text-slate-300">
                  Thu hồi toàn bộ phiên đăng nhập trên thiết bị khác sau khi đổi mật khẩu
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={busyAction !== null}
                className="btn-marlo-primary btn--primary text-xs px-4 py-2 cursor-pointer"
              >
                {busyAction === "change-pwd" ? "Đang cập nhật..." : "Cập nhật Mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === "activity" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History size={16} className="text-blue-600" />
              Nhật ký Sự kiện An ninh &amp; Phiên Đăng nhập
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {bundle?.recentAudits.length ?? 0} sự kiện gần nhất
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(bundle?.recentAudits ?? []).length === 0 ? (
              <div className="p-6 text-center text-slate-500">Chưa có nhật ký sự kiện an ninh.</div>
            ) : (
              bundle!.recentAudits.map((log) => (
                <div key={log.id} className="marlo-row py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">{log.action}</div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {log.target}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-[11px]">
                    <span
                      className={`pill pill--plain text-[10px] font-bold uppercase ${
                        log.decision === "deny" ? "pill--bad" : "pill--good"
                      }`}
                    >
                      {log.decision}
                    </span>
                    <span className="text-slate-400">{log.createdAt.slice(0, 19).replace("T", " ")}</span>
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

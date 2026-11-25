/**
 * CodeMind Campus API Client
 * Kết nối giao diện React với Backend FastAPI (Layered Architecture).
 * Tự động fallback dữ liệu demo an toàn khi chạy trên môi trường Vercel tĩnh.
 */

import type {
  Assignment,
  CourseClass,
  DefenseRubricConfig,
  DockerTestCase,
  DualSubmissionRecord,
  Lesson,
} from "./data/instructorData";
import type { LearningPlan } from "./types/learningPlan";
export type { LearningPlan } from "./types/learningPlan";
import type {
  AdminAuditLog,
  AdminClassEnrollmentsResponse,
  AdminClassRecord,
  AdminInstructorOption,
  AdminJwtSession,
  AdminServiceUnit,
  AdminSubjectSummary,
  PendingApprovalItem,
} from "./data/adminData";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "codemind.access_token";
const REFRESH_TOKEN_KEY = "codemind.refresh_token";
const TOKEN_ROLE_KEY = "codemind.token_role";
const USER_INFO_KEY = "codemind.user_info";
const TAB_ROLE_KEY = "codemind.tab_role";

export type SessionRole = "student" | "instructor" | "admin";

function isSessionRole(val?: string | null): val is SessionRole {
  return val === "student" || val === "instructor" || val === "admin";
}

export function setTabSessionRole(role: SessionRole) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TAB_ROLE_KEY, role);
  } catch {
    // Ignore storage errors
  }
}

function inferTabRole(): SessionRole {
  if (typeof window === "undefined") return "student";
  try {
    const url = new URLSearchParams(window.location.search);
    const qRole = url.get("role");
    if (isSessionRole(qRole)) return qRole;
    const qScreen = url.get("screen") || "";
    if (qScreen.startsWith("admin")) return "admin";
    if (qScreen.startsWith("instructor")) return "instructor";
    const tabRole = window.sessionStorage.getItem(TAB_ROLE_KEY);
    if (isSessionRole(tabRole)) return tabRole;
    const legacyRole =
      window.localStorage.getItem(TOKEN_ROLE_KEY) ||
      window.localStorage.getItem("code-mind-role");
    if (isSessionRole(legacyRole)) return legacyRole;
  } catch {
    // Ignore storage/url errors
  }
  return "student";
}

export interface TestCaseResult {
  id: number;
  title: string;
  is_edge_case: boolean;
  status: "passed" | "failed" | "error" | "timeout" | "not_run" | "unavailable";
  input: string;
  expected_output: string;
  actual_output: string;
  duration_ms: number;
  memory_mb: number | null;
  failure_reason?: string;
}

export interface SubmissionResult {
  id: string;
  status: "passed" | "failed" | "error" | "timeout" | "not_run" | "unavailable";
  passed_count: number;
  total_count: number;
  execution_time_ms: number;
  memory_mb: number | null;
  container_id: string | null;
  execution_status?: "executed" | "unavailable" | "not_run";
  message?: string;
  runner?: string;
  provenance?: { code_sha256?: string; test_suite_sha256?: string; image_id?: string };
  test_cases: TestCaseResult[];
  sha256: string;
  timestamp: string;
}

export interface AIInteractionResponse {
  id: string;
  assistant_message: string;
  answer?: string;
  policy_decision: "refuse_answer" | "question";
  learning_plan?: LearningPlan;
}

export interface HintResponse {
  level: number;
  hint_text: string;
  category: string;
}

export interface KanbanBoardData {
  board: { id: string; title: string };
  columns: Array<{ id: string; title: string; position_order: number }>;
  tasks: Array<{
    id: string;
    column_id: string;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    assignee_id?: string;
  }>;
  dependencies: Array<{ task_id: string; depends_on_task_id: string }>;
}

function getToken(role?: SessionRole): string | null {
  if (typeof window === "undefined") return null;
  const targetRole = role || inferTabRole();
  const scoped = window.localStorage.getItem(`${TOKEN_KEY}.${targetRole}`);
  if (scoped && scoped !== "mock-token") {
    return scoped;
  }
  const legacyToken = window.localStorage.getItem(TOKEN_KEY);
  if (!legacyToken || legacyToken === "mock-token") return null;
  const legacyRole = window.localStorage.getItem(TOKEN_ROLE_KEY);
  if (
    !role ||
    legacyRole === targetRole ||
    (targetRole === "instructor" && legacyRole === "admin")
  ) {
    return legacyToken;
  }
  return null;
}

function saveSessionTokens(
  accessToken: string,
  refreshToken?: string | null,
  role?: string | null,
  user?: any | null
) {
  if (typeof window === "undefined") return;
  const normalizedRole: SessionRole | null = isSessionRole(role)
    ? role
    : isSessionRole(user?.role)
    ? user.role
    : null;

  if (normalizedRole) {
    window.localStorage.setItem(`${TOKEN_KEY}.${normalizedRole}`, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(`${REFRESH_TOKEN_KEY}.${normalizedRole}`, refreshToken);
    }
    if (user) {
      window.localStorage.setItem(
        `${USER_INFO_KEY}.${normalizedRole}`,
        JSON.stringify(user)
      );
    }
  }

  // Only update shared legacy keys when no role is specified or this tab owns that role,
  // preventing simultaneous Student/Instructor tabs from clobbering each other's tokens.
  const tabRole = window.sessionStorage.getItem(TAB_ROLE_KEY) || inferTabRole();
  if (!normalizedRole || tabRole === normalizedRole) {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (normalizedRole || role) {
      window.localStorage.setItem(TOKEN_ROLE_KEY, normalizedRole || String(role));
    }
    if (user) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    }
  }

  window.dispatchEvent(
    new CustomEvent("codemind-auth-updated", {
      detail: { role: normalizedRole, user: user || null },
    })
  );
}

export function getStoredUser(role?: SessionRole): any | null {
  if (typeof window === "undefined") return null;
  const targetRole = role || inferTabRole();
  const scopedRaw = window.localStorage.getItem(`${USER_INFO_KEY}.${targetRole}`);
  if (scopedRaw) {
    try {
      const parsed = JSON.parse(scopedRaw);
      if (parsed && (!parsed.role || parsed.role === targetRole)) {
        return parsed;
      }
    } catch {
      // Ignore corrupt scoped cache
    }
  }
  const raw = window.localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!role || !parsed?.role || parsed.role === role) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function patchStoredUserCache(patch: Record<string, any>, role?: SessionRole) {
  if (typeof window === "undefined") return null;
  const targetRole = role || inferTabRole();
  const base = getStoredUser(targetRole) || {};
  const merged = { ...base, ...patch };
  try {
    window.localStorage.setItem(`${USER_INFO_KEY}.${targetRole}`, JSON.stringify(merged));
    if (inferTabRole() === targetRole) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(merged));
    }
  } catch {
    // Ignore storage quota warnings
  }
  window.dispatchEvent(
    new CustomEvent("codemind-auth-updated", {
      detail: { role: targetRole, user: merged },
    })
  );
  window.dispatchEvent(new Event("codemind-marlo-data-changed"));
  return merged;
}

export function clearSessionTokens(role?: SessionRole) {
  if (typeof window === "undefined") return;
  const rolesToClear: SessionRole[] = role
    ? [role]
    : ["student", "instructor", "admin"];
  for (const r of rolesToClear) {
    window.localStorage.removeItem(`${TOKEN_KEY}.${r}`);
    window.localStorage.removeItem(`${REFRESH_TOKEN_KEY}.${r}`);
    window.localStorage.removeItem(`${USER_INFO_KEY}.${r}`);
  }
  const legacyRole = window.localStorage.getItem(TOKEN_ROLE_KEY);
  if (!role || legacyRole === role) {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_ROLE_KEY);
    window.localStorage.removeItem(USER_INFO_KEY);
  }
}

export function hasStoredSession(role?: SessionRole): boolean {
  const tok = getToken(role);
  return Boolean(tok && tok !== "mock-token");
}

export async function ensureRoleSession(
  role: SessionRole
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = getToken(role);
  return existing && existing !== "mock-token" ? existing : null;
}

export async function logoutUser(role?: SessionRole): Promise<void> {
  const targetRole = role || inferTabRole();
  const token = getToken(targetRole);
  try {
    if (token && token !== "mock-token") {
      await fetch(`${API_BASE}/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // ignore offline errors
  } finally {
    clearSessionTokens(role);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${API_BASE}/health/ready`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function demoLogin(role: "student" | "instructor" | "admin" = "student") {
  try {
    const preferredEmail =
      role === "admin"
        ? "admin@codemind.ai"
        : role === "instructor"
        ? "lananh.gv@codemind.ai"
        : "hasib@gmail.com";
    const res = await fetch(`${API_BASE}/v1/demo/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_role: role, preferred_email: preferredEmail }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    saveSessionTokens(data.access_token, data.refresh_token, data.role || role, data.user);
    return data;
  } catch (err) {
    console.warn("Backend offline, running in standalone client mode.", err);
    return { access_token: "mock-token", role };
  }
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean = false,
  deviceName?: string
) {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      remember_me: rememberMe,
      ...(deviceName ? { device_name: deviceName } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Đăng nhập thất bại");
  }
  const data = await res.json();
  if (!data.requires_2fa && data.access_token) {
    saveSessionTokens(data.access_token, data.refresh_token, data.role, data.user);
  }
  return data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
  role?: "student" | "instructor" | "admin";
  timezone?: string;
  user_code?: string;
  device_name?: string;
}) {
  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Đăng ký thất bại");
  }
  const data = await res.json();
  if (data.access_token) {
    saveSessionTokens(data.access_token, data.refresh_token, data.role, data.user);
  }
  return data;
}

export async function verifyLogin2FaApi(
  challengeToken: string,
  otpCode: string,
  deviceName?: string
) {
  const res = await fetch(`${API_BASE}/v1/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_token: challengeToken,
      otp_code: otpCode,
      ...(deviceName ? { device_name: deviceName } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Xác thực OTP thất bại");
  }
  if (data.access_token) {
    saveSessionTokens(data.access_token, data.refresh_token, data.role, data.user);
  }
  return data;
}

export interface ForgotPasswordResponse {
  challenge_token: string;
  masked_email: string;
  expires_in: number;
  demo_otp_hint: string;
}

export async function forgotPasswordApi(
  email: string
): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Không thể gửi yêu cầu khôi phục mật khẩu");
  }
  return data;
}

export async function resetPasswordApi(
  challengeToken: string,
  otpCode: string,
  newPassword: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_token: challengeToken,
      otp_code: otpCode,
      new_password: newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Đặt lại mật khẩu thất bại");
  }
  return data;
}

export async function refreshAccessToken(role?: SessionRole) {
  const targetRole = role || inferTabRole();
  const refreshToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem(`${REFRESH_TOKEN_KEY}.${targetRole}`) ||
        window.localStorage.getItem(REFRESH_TOKEN_KEY)
      : null;
  if (!refreshToken) throw new Error("Không tìm thấy Refresh Token");
  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Cấp lại Access Token thất bại");
  const data = await res.json();
  saveSessionTokens(data.access_token, data.refresh_token, data.role, data.user);
  return data;
}

export async function fetchCurrentUser(
  role?: SessionRole,
  opts?: { skipAutoDemo?: boolean }
) {
  const targetRole = role || inferTabRole();
  const token =
    getToken(targetRole) ||
    (!opts?.skipAutoDemo && role
      ? await ensureRoleSession(targetRole).catch(() => null)
      : null);
  if (!token) return null;
  const res = await fetch(`${API_BASE}/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (typeof window !== "undefined" && user && (!user.role || user.role === targetRole)) {
    window.localStorage.setItem(`${USER_INFO_KEY}.${targetRole}`, JSON.stringify(user));
    if (inferTabRole() === targetRole) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(
      new CustomEvent("codemind-auth-updated", {
        detail: { role: targetRole, user },
      })
    );
  }
  return user;
}

// Compute deterministic SHA-256 for browser / demo
async function computeSha256(str: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // fallback simple hash
    }
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "sha256-" + Math.abs(hash).toString(16).padStart(16, "0");
}

export async function submitCodeToSandbox(
  code: string, language = "python", sessionId = "demo-session", exerciseId = "exercise-deque"
): Promise<SubmissionResult> {
  const token = getToken("student");
  const endpoint = sessionId === "demo-session" ? `${API_BASE}/v1/sandbox/evaluate`
    : `${API_BASE}/v1/sessions/${encodeURIComponent(sessionId)}/submissions`;
  const res = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ exercise_id: exerciseId, code, language, idempotency_key: crypto.randomUUID() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Không thể chạy kiểm thử. Chưa có kết quả chấm bài.");
  return data.evaluation || data;
}

export interface SocraticChatTurn {
  role: "user" | "assistant" | "mentor";
  text: string;
}

export interface SocraticWorkspaceContext {
  lesson_id?: string;
  quiz_attempt_id?: string;
  view_mode?: "catalog" | "lecture" | "video" | "quiz" | "exercise" | "mindmap" | string;
  subject_id?: string;
  subject_code?: string;
  subject_name?: string;
  chapter_number?: number;
  chapter_title?: string;
  lesson_code?: string;
  lesson_title?: string;
  lesson_summary?: string;
  lesson_takeaways?: string[];
  lesson_code_snippet?: string;
  exercise_id?: string;
  exercise_title?: string;
  exercise_language?: string;
  exercise_objective?: string;
  exercise_problem?: string;
  exercise_requirements?: string[];
  exercise_hints?: string[];
  exercise_test_cases?: string[];
  exercise_submission_status?: string;
  quiz_index?: number;
  quiz_total?: number;
  quiz_question?: string;
  quiz_options?: string[];
  quiz_selected_option?: string;
  quiz_submitted?: boolean;
  quiz_explanation?: string;
}

export async function askSocraticTutor(
  messageOrOpts:
    | string
    | {
        subjectId?: string;
        question: string;
        currentTopic?: string;
        chatSkin?: string;
        workspaceContext?: SocraticWorkspaceContext;
        history?: SocraticChatTurn[];
        hintLevel?: number;
        codeContext?: string;
      },
  codeContext?: string,
  sessionId: string = "demo-session"
): Promise<AIInteractionResponse & { answer: string }> {
  const isObj = typeof messageOrOpts !== "string";
  const message = isObj ? messageOrOpts.question : messageOrOpts;
  const resolvedCodeContext = isObj ? messageOrOpts.codeContext : codeContext;
  const workspaceContext = isObj ? messageOrOpts.workspaceContext : undefined;
  const history = isObj ? messageOrOpts.history : undefined;
  const hintLevel = isObj ? messageOrOpts.hintLevel : undefined;

  try {
    const endpoint =
      sessionId === "demo-session"
        ? `${API_BASE}/v1/ai/socratic-chat`
        : `${API_BASE}/v1/sessions/${sessionId}/ai-interactions`;
    const res = await fetchWithAuthRetry(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          ...(resolvedCodeContext ? { code_context: resolvedCodeContext } : {}),
          ...(workspaceContext ? { workspace_context: workspaceContext } : {}),
          ...(history && history.length > 0 ? { history } : {}),
          ...(hintLevel ? { hint_level: hintLevel } : {}),
          idempotency_key: `ai-${Date.now()}`,
        }),
      },
      "student"
    );
    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        answer: data.assistant_message || data.answer || "",
      };
    }
    throw new Error("AI query failed");
  } catch {
    const answer = "Chưa kết nối được trợ giảng nên chưa đọc được kết quả đã lưu. Bạn có thể xem lại câu Quiz sai hoặc test chưa đạt, ghi lại bước gây nhầm lẫn, rồi thử kết nối lại. Chưa có chẩn đoán AI từ lượt yêu cầu này.";
    return { id: "offline", assistant_message: answer, answer, policy_decision: "question" };
  }
}

export async function openSocraticHint(interactionId: string, level: number): Promise<HintResponse> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/ai-interactions/${interactionId}/hints/${level}/open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return await res.json();
    throw new Error("Open hint failed");
  } catch {
    const hints: Record<number, { text: string; category: string }> = {
      1: {
        category: "Nấc 1: Khái niệm & Nguyên lý Cấu trúc dữ liệu",
        text: "Bounded Deque (Hàng đợi hai đầu có giới hạn) hoạt động theo nguyên lý FIFO: phần tử vào trước sẽ ra trước. Thuộc tính `maxlen=3` giúp cố định dung lượng trong bộ nhớ mà không cần thủ công xóa phần tử cũ. Độ phức tạp thời gian đạt O(1).",
      },
      2: {
        category: "Nấc 2: Phân tích Ca kiểm thử biên (Edge Case)",
        text: "Ca kiểm thử số 5 thất bại vì chuỗi rỗng `\"\"` hoặc khoảng trắng `\"   \"` vẫn được tính là một chuỗi và bị đẩy vào lịch sử. Một hệ thống công nghiệp không bao giờ lưu URL rác. Cần kiểm tra: chuỗi có rỗng hoặc chỉ chứa khoảng trắng hay không trước khi gọi append().",
      },
      3: {
        category: "Nấc 3: Thuật toán định hướng / Mã giả (Pseudo-code)",
        text: "Mã giả định hướng:\n```python\ndef visit(self, page):\n    if not page or not page.strip():\n        return  # Bỏ qua không thêm vào hàng đợi\n    self.history.append(page)\n```\n(Không lộ toàn bộ lời giải, giữ nguyên trách nhiệm tự code của sinh viên).",
      },
    };

    return {
      level,
      category: hints[level]?.category || `Gợi ý cấp độ ${level}`,
      hint_text: hints[level]?.text || "Hãy kiểm tra điều kiện biên đầu vào.",
    };
  }
}

export async function fetchKanbanBoard(boardId: string = "board-demo-1"): Promise<KanbanBoardData | null> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/kanban/boards/${boardId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface InstructorSessionStepLog {
  step: number;
  label: string;
  outcome: "passed" | "hint" | "stuck" | "completed";
  detail: string;
  timestamp: string;
}

export interface InstructorSessionEvidence {
  session_id: string;
  display_name: string;
  student_code: string;
  course_code: string;
  title: string;
  status: "completed" | "in_progress" | "stuck";
  current_step_no: number;
  teacher_visibility: number;
  passed_count: number;
  total_tests: number;
  hint_count: number;
  max_hint_level: 0 | 1 | 2 | 3;
  time_spent_min: number;
  socratic_note: string;
  step_logs: InstructorSessionStepLog[];
}

export const FALLBACK_INSTRUCTOR_SESSIONS: InstructorSessionEvidence[] = [
  {
    session_id: "sess-oop-01",
    display_name: "Nguyễn Bá Hòa",
    student_code: "2210801",
    course_code: "CS201",
    title: "vtable & Virtual Destructor",
    status: "completed",
    current_step_no: 6,
    teacher_visibility: 1,
    passed_count: 5,
    total_tests: 5,
    hint_count: 0,
    max_hint_level: 0,
    time_spent_min: 19,
    socratic_note: "Không dùng virtual destructor sẽ bỏ qua destructor lớp dẫn xuất khi delete qua con trỏ Base*, gây rò rỉ Heap.",
    step_logs: [
      { step: 1, label: "Đọc mục tiêu & hợp đồng tự học", outcome: "completed", detail: "Kích hoạt chế độ chia sẻ bằng chứng cho giảng viên", timestamp: "08:10" },
      { step: 2, label: "Khám phá khái niệm vptr / vtable", outcome: "completed", detail: "Đúng 3/3 câu hỏi nhận diện vùng nhớ con trỏ ảo", timestamp: "08:15" },
      { step: 4, label: "Chạy kiểm thử Docker Sandbox", outcome: "passed", detail: "Pass 5/5 test cases (kể cả Valgrind leak check)", timestamp: "08:24" },
      { step: 6, label: "Lưu ghi chú phản tư & nộp bài", outcome: "completed", detail: "Tự lực hoàn thành, không mở gợi ý AI", timestamp: "08:29" },
    ],
  },
  {
    session_id: "sess-oop-02",
    display_name: "Nguyễn Văn A",
    student_code: "2210842",
    course_code: "CS201",
    title: "vtable & Virtual Destructor",
    status: "completed",
    current_step_no: 6,
    teacher_visibility: 1,
    passed_count: 5,
    total_tests: 5,
    hint_count: 2,
    max_hint_level: 2,
    time_spent_min: 28,
    socratic_note: "Ban đầu bị object slicing do truyền tham trị Employee thay vì Employee*; đã tự sửa lại truyền con trỏ.",
    step_logs: [
      { step: 2, label: "Kiểm tra khái niệm Dynamic Dispatch", outcome: "completed", detail: "Hoàn thành câu hỏi phân biệt override và overload", timestamp: "09:04" },
      { step: 4, label: "Chạy kiểm thử lần 1", outcome: "stuck", detail: "Trượt Test 4 & 5 do thiếu từ khóa override và virtual", timestamp: "09:13" },
      { step: 5, label: "Hỏi Socratic AI & Mở Hint Nấc 2", outcome: "hint", detail: "Nhận phân tích lỗi Object Slicing ở chữ ký hàm evaluatePayroll", timestamp: "09:19" },
      { step: 6, label: "Tự sửa mã nguồn & Pass 5/5", outcome: "completed", detail: "Ghi chú bài học kinh nghiệm rõ ràng", timestamp: "09:32" },
    ],
  },
  {
    session_id: "sess-dsa-03",
    display_name: "Võ Nhật Huy",
    student_code: "2210815",
    course_code: "CS102",
    title: "Dijkstra & DSU",
    status: "in_progress",
    current_step_no: 5,
    teacher_visibility: 1,
    passed_count: 4,
    total_tests: 5,
    hint_count: 3,
    max_hint_level: 3,
    time_spent_min: 44,
    socratic_note: "Đang xử lý test biên đồ thị không liên thông và cạnh trọng số bằng 0 khi dùng priority_queue.",
    step_logs: [
      { step: 2, label: "Ôn tập Min-Heap & Lazy Deletion", outcome: "completed", detail: "Gắn thẻ cặp (dist, u) chuẩn xác", timestamp: "09:40" },
      { step: 4, label: "Chạy kiểm thử Sandbox", outcome: "stuck", detail: "Pass 4/5 — TLE ở đồ thị dày 10^5 cạnh do thiếu check d > dist[u]", timestamp: "10:02" },
      { step: 5, label: "Mở Hint Nấc 3 (Pseudo-code)", outcome: "hint", detail: "Đã xem khung lệnh if (d > dist[u]) continue; và đang tự code lại", timestamp: "10:18" },
    ],
  },
  {
    session_id: "sess-web-04",
    display_name: "Phan Đình Nghị",
    student_code: "2210829",
    course_code: "CS304",
    title: "JWT & PostgreSQL",
    status: "completed",
    current_step_no: 6,
    teacher_visibility: 1,
    passed_count: 5,
    total_tests: 5,
    hint_count: 1,
    max_hint_level: 1,
    time_spent_min: 22,
    socratic_note: "Phân biệt rõ Access Token ngắn hạn (stateless) và Refresh Token lưu hash kèm kiểm tra role ở Depends(require_instructor).",
    step_logs: [
      { step: 1, label: "Đọc spec RBAC FastAPI", outcome: "completed", detail: "Chọn 2 thuật ngữ cốt lõi: Bearer JWT, RBAC Guard", timestamp: "13:05" },
      { step: 4, label: "Chạy pytest RBAC Suite", outcome: "hint", detail: "Mở Hint Nấc 1 về HTTP 403 vs 401 trước khi sửa dependency", timestamp: "13:16" },
      { step: 6, label: "Nộp bằng chứng hoàn tất", outcome: "completed", detail: "Pass 5/5 kiểm thử phân quyền & token expiry", timestamp: "13:27" },
    ],
  },
  {
    session_id: "sess-ai-05",
    display_name: "Nguyễn Minh Khôi",
    student_code: "2210866",
    course_code: "CS401",
    title: "RAG pgvector",
    status: "stuck",
    current_step_no: 4,
    teacher_visibility: 1,
    passed_count: 2,
    total_tests: 5,
    hint_count: 3,
    max_hint_level: 3,
    time_spent_min: 52,
    socratic_note: "Chưa truyền cosine distance threshold vào truy vấn pgvector nên context trả về bị nhiễu chunk ngoài chủ đề.",
    step_logs: [
      { step: 3, label: "Trắc nghiệm Embedding & Chunking", outcome: "completed", detail: "Đạt 2/3 câu hỏi khái niệm", timestamp: "14:00" },
      { step: 4, label: "Chạy đánh giá Retrieval Precision", outcome: "stuck", detail: "Pass 2/5 — Top-k chưa lọc độ tương đồng tối thiểu", timestamp: "14:25" },
      { step: 5, label: "Mở Hint Nấc 3", outcome: "hint", detail: "Cần giảng viên hướng dẫn thêm về Cosine Similarity (<=>)", timestamp: "14:46" },
    ],
  },
  {
    session_id: "sess-oop-06",
    display_name: "Võ Ngọc Hà",
    student_code: "2210851",
    course_code: "CS201",
    title: "vtable & Virtual Destructor",
    status: "stuck",
    current_step_no: 4,
    teacher_visibility: 1,
    passed_count: 3,
    total_tests: 5,
    hint_count: 3,
    max_hint_level: 3,
    time_spent_min: 49,
    socratic_note: "Còn lúng túng giữa hàm thuần ảo (= 0) và hàm ảo thường khi thiết kế lớp trừu tượng Employee.",
    step_logs: [
      { step: 2, label: "Đọc tài liệu & Video Script", outcome: "completed", detail: "Xem hết 3 phân cảnh vtable", timestamp: "15:05" },
      { step: 4, label: "Biên dịch Docker C++20", outcome: "stuck", detail: "Lỗi compile khi thử khởi tạo trực tiếp abstract class Employee", timestamp: "15:31" },
      { step: 5, label: "Mở Hint Nấc 3", outcome: "hint", detail: "Chưa chạy lại test sau khi xem gợi ý", timestamp: "15:52" },
    ],
  },
];

export async function fetchInstructorSessions(): Promise<InstructorSessionEvidence[]> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/instructor/sessions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to fetch instructor sessions");
    const data = await res.json();
    const rows = Array.isArray(data?.sessions) ? data.sessions : [];
    if (rows.length === 0) return [];

    return rows.map((r: any, idx: number): InstructorSessionEvidence => {
      const hintCount = Number(r.hint_count ?? 0);
      const passedCount = Number(r.passed_count ?? 0);
      const maxLevel = (
        typeof r.max_hint_level === "number"
          ? r.max_hint_level
          : hintCount >= 3
          ? 3
          : hintCount === 2
          ? 2
          : hintCount === 1
          ? 1
          : 0
      ) as 0 | 1 | 2 | 3;
      const statusNorm: "completed" | "in_progress" | "stuck" =
        r.status === "completed" || passedCount >= 5
          ? "completed"
          : r.status === "stuck" || (maxLevel >= 3 && passedCount < 4)
          ? "stuck"
          : "in_progress";

      const logs: InstructorSessionStepLog[] =
        Array.isArray(r.step_logs) && r.step_logs.length > 0
          ? r.step_logs
          : [
              {
                step: Number(r.current_step_no ?? 4),
                label: `Đồng bộ phiên học • ${String(r.title ?? "Bài học")}`,
                outcome:
                  statusNorm === "completed"
                    ? "completed"
                    : statusNorm === "stuck"
                    ? "stuck"
                    : "hint",
                detail: `Pass ${passedCount}/5 test • Đã dùng ${hintCount} lượt Hint`,
                timestamp: "Live",
              },
            ];

      return {
        session_id: String(r.session_id ?? `sess-api-${idx + 1}`),
        display_name: String(r.display_name ?? "Học viên"),
        student_code: String(r.student_code ?? `22108${10 + idx}`),
        course_code: String(r.course_code ?? "CS201"),
        title: String(r.title ?? "Bài học thực hành"),
        status: statusNorm,
        current_step_no: Number(r.current_step_no ?? 4),
        teacher_visibility: Number(r.teacher_visibility ?? 1),
        passed_count: passedCount,
        total_tests: Number(r.total_tests ?? 5),
        hint_count: hintCount,
        max_hint_level: maxLevel,
        time_spent_min: Number(r.time_spent_min ?? 20 + idx * 6),
        socratic_note: String(
          r.socratic_note ||
            (statusNorm === "completed"
              ? "Đã đồng bộ dữ liệu phiên học từ Backend API và vượt qua kiểm thử."
              : "Phiên học đang được theo dõi trực tiếp qua Telemetry Backend.")
        ),
        step_logs: logs,
      };
    });
  } catch (err) {
    console.warn("fetchInstructorSessions failed:", err);
    return [];
  }
}

export interface AdminUserRecord {
  id: string;
  name: string;
  code: string;
  email: string;
  role: "Quản trị viên" | "Giảng viên" | "Học viên";
  status: "active" | "pending" | "suspended";
  lastActive: string;
  device: string;
  classesCount: number;
}

export const FALLBACK_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: "usr-adm-01",
    name: "Admin AIO",
    code: "ADM-01",
    email: "admin@codemind.ai",
    role: "Quản trị viên",
    status: "active",
    lastActive: "Đang trực tuyến",
    device: "Workstation · Chrome 126",
    classesCount: 6,
  },
  {
    id: "usr-gv-01",
    name: "Cô Trần Thị B",
    code: "GV-2026-01",
    email: "lananh.gv@codemind.ai",
    role: "Giảng viên",
    status: "active",
    lastActive: "Vừa xong",
    device: "MacBook Pro · Chrome 126",
    classesCount: 3,
  },
  {
    id: "usr-gv-02",
    name: "Thầy Nguyễn Phước",
    code: "GV-2026-02",
    email: "phuoc.gv@codemind.ai",
    role: "Giảng viên",
    status: "active",
    lastActive: "12 phút trước",
    device: "Windows 11 · Edge 125",
    classesCount: 3,
  },
  {
    id: "usr-sv-01",
    name: "Nguyễn Bá Hòa",
    code: "2210801",
    email: "hoa.nb@student.edu.vn",
    role: "Học viên",
    status: "active",
    lastActive: "4 phút trước",
    device: "MacBook Air M3 · Safari",
    classesCount: 4,
  },
  {
    id: "usr-sv-02",
    name: "Nguyễn Văn A",
    code: "2210842",
    email: "hasib@gmail.com",
    role: "Học viên",
    status: "active",
    lastActive: "Vừa xong",
    device: "Windows 11 · Chrome 126",
    classesCount: 4,
  },
  {
    id: "usr-sv-03",
    name: "Võ Nhật Huy",
    code: "2210815",
    email: "huy.vn@student.edu.vn",
    role: "Học viên",
    status: "active",
    lastActive: "18 phút trước",
    device: "Ubuntu 24.04 · Firefox",
    classesCount: 3,
  },
  {
    id: "usr-sv-04",
    name: "Phan Đình Nghị",
    code: "2210829",
    email: "nghi.pd@student.edu.vn",
    role: "Học viên",
    status: "active",
    lastActive: "35 phút trước",
    device: "Windows 11 · Chrome",
    classesCount: 3,
  },
  {
    id: "usr-sv-05",
    name: "Nguyễn Minh Khôi",
    code: "2210866",
    email: "khoi.nm@student.edu.vn",
    role: "Học viên",
    status: "pending",
    lastActive: "Chờ xác minh lớp",
    device: "MacBook Pro · Chrome",
    classesCount: 2,
  },
  {
    id: "usr-sv-06",
    name: "Hoàng Ngọc D",
    code: "2210899",
    email: "ngocd@student.edu.vn",
    role: "Học viên",
    status: "suspended",
    lastActive: "2 ngày trước",
    device: "iPhone 15 · Safari Mobile",
    classesCount: 1,
  },
];

function mapBackendRole(rawRole?: string): AdminUserRecord["role"] {
  if (rawRole === "admin") return "Quản trị viên";
  if (rawRole === "instructor" || rawRole === "teacher") return "Giảng viên";
  return "Học viên";
}

function mapBackendStatus(rawStatus?: string): AdminUserRecord["status"] {
  if (rawStatus === "suspended" || rawStatus === "locked") return "suspended";
  if (rawStatus === "pending") return "pending";
  return "active";
}

function mapAdminUserRow(u: any, idx: number = 0): AdminUserRecord {
  return {
    id: String(u.id ?? `usr-api-${idx + 1}`),
    name: String(u.display_name || u.full_name || "Người dùng"),
    code: String(u.code ?? u.user_code ?? `USR-${100 + idx}`),
    email: String(u.email ?? `user${idx + 1}@codemind.ai`),
    role: mapBackendRole(u.role),
    status: mapBackendStatus(u.status),
    lastActive: String(u.last_active ?? u.last_active_label ?? "Đồng bộ API"),
    device: String(u.device ?? u.last_device ?? "Web Session"),
    classesCount: Number(u.classes_count ?? (u.role === "admin" ? 6 : 3)),
  };
}

export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to fetch admin users");
    const data = await res.json();
    const rows = Array.isArray(data?.users) ? data.users : [];
    if (rows.length === 0) return [];

    return rows.map((u: any, idx: number) => mapAdminUserRow(u, idx));
  } catch (err) {
    console.warn("fetchAdminUsers failed:", err);
    return [];
  }
}

export async function triggerAdminResetDemo(): Promise<{ status: string; message: string }> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/reset-demo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Failed to reset demo data");
    const data = await res.json();
    return {
      status: String(data?.status ?? "reset"),
      message: String(data?.message ?? "Demo data đã reset thành công"),
    };
  } catch {
    return {
      status: "reset",
      message: "Đã khôi phục dữ liệu phiên học & kiểm thử về trạng thái chuẩn (Standalone Mode).",
    };
  }
}

// ============================================================================
// INSTRUCTOR & COURSES API CLIENTS (Synced 1-to-1 with FastAPI)
// ============================================================================

export async function fetchInstructorCourses(): Promise<CourseClass[] | null> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/courses`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.courses) ? (data.courses as CourseClass[]) : null;
  } catch {
    return null;
  }
}

export async function createInstructorChapter(courseId: string, title: string) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/instructor/courses/${courseId}/chapters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function patchInstructorChapter(
  courseId: string,
  chapterId: string,
  payload: { title?: string; status?: "Đã phát hành" | "Bản nháp" }
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteInstructorChapter(courseId: string, chapterId: string) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createInstructorLesson(
  courseId: string,
  chapterId: string,
  title: string
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/lessons`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title }),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteInstructorLesson(
  courseId: string,
  chapterId: string,
  lessonId: string
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function reorderInstructorLessons(
  courseId: string,
  chapterId: string,
  lessonIds: string[]
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/lessons/reorder`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lessonIds }),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveInstructorLesson(
  courseId: string,
  chapterId: string,
  lessonId: string,
  lesson: Partial<Lesson> & { xp?: number; isAigcGenerated?: boolean }
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(lesson),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateInstructorAssignment(
  courseId: string,
  chapterId: string,
  assignmentId: string,
  payload: Partial<Assignment>
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function addInstructorTestCase(
  courseId: string,
  chapterId: string,
  tc: DockerTestCase
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/test-cases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(tc),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateInstructorTestCase(
  courseId: string,
  chapterId: string,
  tcId: string,
  payload: Partial<DockerTestCase>
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/test-cases/${tcId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteInstructorTestCase(
  courseId: string,
  chapterId: string,
  tcId: string
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/test-cases/${tcId}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveInstructorMindmap(
  courseId: string,
  chapterId: string,
  mindmapNodes: any[],
  mindmapEdges: any[]
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/instructor/courses/${courseId}/chapters/${chapterId}/mindmap`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mindmapNodes, mindmapEdges, mindmapGenerated: true }),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDualSubmissions(
  sectionId?: string
): Promise<DualSubmissionRecord[] | null> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const query = sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : "";
    const res = await fetch(`${API_BASE}/v1/instructor/dual-submissions${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.submissions)
      ? (data.submissions as DualSubmissionRecord[])
      : null;
  } catch {
    return null;
  }
}

export async function decideDualSubmission(
  subId: string,
  payload: {
    action: "approve" | "redefense";
    final_score?: number;
    instructor_feedback?: string;
  },
  preferredRole: SessionRole = "instructor",
  throwOnError: boolean = false
) {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/instructor/dual-submissions/${encodeURIComponent(subId)}/decision`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      preferredRole
    );
    if (!res.ok) {
      if (throwOnError) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể phê duyệt biên bản Chấm Kép.");
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    if (throwOnError) throw err;
    return null;
  }
}

export async function fetchDefenseRubric(
  preferredRole?: SessionRole
): Promise<DefenseRubricConfig | null> {
  const role: SessionRole = preferredRole || inferTabRole();
  const path = role === "student" ? "/v1/defense/rubric" : "/v1/instructor/rubric";
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}${path}`, {}, role);
    if (!res.ok) return null;
    return (await res.json()) as DefenseRubricConfig;
  } catch {
    return null;
  }
}

export async function saveDefenseRubric(
  rubric: DefenseRubricConfig,
  preferredRole: SessionRole = "instructor",
  throwOnError: boolean = false
) {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/instructor/rubric`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubric),
      },
      preferredRole
    );
    if (!res.ok) {
      if (throwOnError) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể lưu cấu hình Rubric.");
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    if (throwOnError) throw err;
    return null;
  }
}

export async function postInstructorSessionAction(
  sessionId: string,
  action_type: "award_xp" | "assign_reading" | "send_reminder",
  note: string = ""
) {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/instructor/sessions/${sessionId}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action_type, note }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function askInstructorCopilot(prompt: string, class_id?: string): Promise<string | null> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/instructor/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt, class_id }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.reply === "string" ? data.reply : null;
  } catch {
    return null;
  }
}

// ============================================================================
// AI 3D DEFENSE ROOM API CLIENTS
// ============================================================================

export interface DefenseProjectOption {
  id: string;
  code: string;
  name: string;
  course: string;
  status: string;
  isFrozen?: boolean;
  isMyProject?: boolean;
  isAdvisor?: boolean;
  isReviewer?: boolean;
  canGradeCouncil?: boolean;
  myCouncilRole?: "admin" | "advisor" | "reviewer" | "member" | "viewer" | string;
  instructorId?: string;
  instructorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  hasDefensePackage?: boolean;
  demoUrl?: string;
  isGraded?: boolean;
  officialFinalScore?: number | null;
  officialGradedAt?: string | null;
  practiceCount?: number;
  classId: string;
  courseCode: string;
  aiDefenseEnabled: boolean;
  repoUrl: string;
  commitsCount: number;
  prsCount: number;
  doneTasksCount: number;
  totalTasksCount: number;
}

export interface DefenseCourseToggleItem {
  id: string;
  code: string;
  name: string;
  teacherName: string;
  studentCount: number;
  pendingDualReviews: number;
  aiDefenseEnabled: boolean;
  sandboxEnabled: boolean;
}

export interface DefenseTranscriptEntry {
  id: string;
  speaker: string;
  speakerLabel: string;
  text: string;
  evaluation?: string;
  score?: number;
}

export interface DefenseSessionRecord {
  id: string;
  userId: string;
  studentName: string;
  studentCode: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  classId: string;
  courseCode: string;
  roundNumber: number;
  status: "in_progress" | "completed" | "flagged" | string;
  architectureScore: number;
  algorithmScore: number;
  productionScore: number;
  finalDefenseScore: number | null;
  transcript: DefenseTranscriptEntry[];
  createdAt: string;
  updatedAt: string;
}

export type DefenseDualSubmissionItem = DualSubmissionRecord & {
  userId?: string | null;
  transcript?: DefenseTranscriptEntry[];
  updatedAt?: string;
};

export interface DefenseWorkspaceBundle {
  user: {
    id: string;
    name: string;
    role: string;
    studentCode: string;
  };
  projects: DefenseProjectOption[];
  courses: DefenseCourseToggleItem[];
  instructors?: Array<{ id: string; name: string; email?: string }>;
  rubric: DefenseRubricConfig;
  sessions: DefenseSessionRecord[];
  dualSubmissions: DefenseDualSubmissionItem[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    avgDefenseScore: number;
    flaggedCount: number;
    pendingReviewsCount: number;
    enabledCoursesCount: number;
    totalCoursesCount: number;
    gradedProjectsCount?: number;
    totalProjectsCount?: number;
  };
}

export async function fetchDefenseWorkspaceApi(
  preferredRole?: SessionRole
): Promise<DefenseWorkspaceBundle | null> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/defense/workspace`, {}, preferredRole);
    if (!res.ok) return null;
    return (await res.json()) as DefenseWorkspaceBundle;
  } catch {
    return null;
  }
}

export async function startDefenseSession(
  project_id: string = "prj-codemind",
  class_id?: string,
  preferredRole: SessionRole = "student"
): Promise<{
  defense_id: string;
  project_id: string;
  class_id: string;
  course_code: string;
  status: string;
}> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id, ...(class_id ? { class_id } : {}) }),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể khởi tạo phiên phản biện AI.");
  }
  return await res.json();
}

export async function respondDefenseRound(
  defenseId: string,
  payload: {
    round_number: number;
    phase: "oral" | "rebuttal";
    question_text: string;
    speaker_label?: string;
    argument_text: string;
    expected_keywords?: string[];
    rebuttal_option_score?: number;
  },
  preferredRole: SessionRole = "student"
): Promise<{
  defense_id: string;
  round_number: number;
  phase: "oral" | "rebuttal";
  round_score: number;
  evaluation: string;
  matched_keywords: string[];
  scores: { architecture: number; algorithm: number; production: number };
  transcript: DefenseTranscriptEntry[];
}> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/sessions/${encodeURIComponent(defenseId)}/respond`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể chấm điểm luận điểm phản biện.");
  }
  return await res.json();
}

export async function completeDefenseSession(
  defenseId: string,
  payload: {
    chapter_title?: string;
    repo_url?: string;
    passed_tests?: number;
    total_tests?: number;
  } = {},
  preferredRole: SessionRole = "student"
): Promise<{
  defense_id: string;
  submission_id: string;
  final_defense_score: number;
  cicd_pct: number;
  weighted_score: number;
  status: string;
  discrepancy: boolean;
  coherence_summary: string;
  commit_count: number;
}> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/sessions/${encodeURIComponent(defenseId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể hoàn tất phiên bảo vệ đồ án.");
  }
  return await res.json();
}

export async function deleteDefenseSessionApi(
  defenseId: string,
  preferredRole?: SessionRole
): Promise<{ message: string; defense_id: string }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/sessions/${encodeURIComponent(defenseId)}`,
    { method: "DELETE" },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể xóa phiên bảo vệ.");
  }
  return await res.json();
}

export async function toggleCourseDefenseApi(
  classId: string,
  ai_defense_enabled: boolean,
  preferredRole: SessionRole = "admin"
): Promise<{ classId: string; code: string; name: string; aiDefenseEnabled: boolean }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/courses/${encodeURIComponent(classId)}/toggle`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_defense_enabled }),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể cập nhật trạng thái Phòng Phản Biện AI.");
  }
  return await res.json();
}

export interface DefensePackageData {
  demoUrl: string;
  slideUrl: string;
  reportUrl: string;
  videoUrl: string;
  repoUrl: string;
  architectureSummary: string;
  memberRolesSummary: string;
  submittedByName?: string;
  updatedAt?: string;
  isComplete?: boolean;
}

export interface DefenseMemberMetric {
  member_id: string;
  name: string;
  role: string;
  avatar: string;
  total_tasks: number;
  done_tasks: number;
  verified_tasks: number;
  completed_points: number;
  total_points: number;
  dod_completed: number;
  dod_total: number;
  commits_count: number;
  prs_count: number;
  top_tasks: string[];
  contribution_pct: number;
  suggested_factor: number;
}

export interface OfficialMemberScoreRecord {
  member_id: string;
  name: string;
  role: string;
  contribution_pct: number;
  suggested_factor: number;
  individual_score: number;
  asked_question?: string;
  live_qa_note?: string;
}

export interface OfficialProjectEvaluation {
  isGraded: boolean;
  evalId?: string;
  groupScore?: number;
  demoScore?: number;
  architectureScore?: number;
  processScore?: number;
  defenseScore?: number;
  finalScore?: number;
  feedback?: string;
  verdict?: "pass" | "pass_with_revisions" | "fail" | string;
  councilMembers?: string;
  demoVerified?: boolean;
  repoVerified?: boolean;
  frozenVerified?: boolean;
  graderName?: string;
  defenseDate?: string;
  gradedAt?: string;
  status?: string;
  memberScores?: OfficialMemberScoreRecord[];
}

export interface DefenseProjectDossier {
  project: {
    id: string;
    code: string;
    name: string;
    client: string;
    course: string;
    status: string;
    sprint: string;
    isFrozen: boolean;
    isMyProject?: boolean;
    isAdvisor?: boolean;
    isReviewer?: boolean;
    canGradeCouncil?: boolean;
    canManageCouncil?: boolean;
    myCouncilRole?: "admin" | "advisor" | "reviewer" | "member" | "viewer" | string;
    canEditPackage?: boolean;
    editPackageBlockReason?: string;
    leaderUserId: string;
    instructorId?: string;
    instructorName: string;
    reviewerId?: string;
    reviewerName?: string;
    dueDate: string;
    storyPointsBudget: number;
    repoUrl: string;
    repoSlug: string;
    targetBranch: string;
    totalTasks: number;
    doneTasks: number;
    verifiedTasks: number;
    totalPoints: number;
    completedPoints: number;
    commitsCount: number;
    prsCount: number;
    epics: string[];
  };
  instructors?: Array<{ id: string; name: string; email?: string }>;
  package: DefensePackageData;
  memberMetrics: DefenseMemberMetric[];
  recentTasks: Array<{
    id: string;
    code: string;
    title: string;
    columnId: string;
    points: number;
    epic: string;
    assigneeName: string;
    submissionUrl?: string;
  }>;
  recentCommits: Array<{
    id: string;
    sha: string;
    authorName: string;
    branch: string;
    taskCode: string;
    message: string;
    timeAgo: string;
    additions: number;
    deletions: number;
  }>;
  recentPullRequests: Array<{
    id: string;
    prNumber: number;
    title: string;
    sourceBranch: string;
    targetBranch: string;
    taskCode: string;
    authorName: string;
    status: string;
    aiReviewScore: number;
    peerApproved: boolean;
  }>;
  practiceSessions: Array<{
    id: string;
    studentName: string;
    studentCode: string;
    readinessScore: number | null;
    status: string;
    roundNumber: number;
    updatedAt: string;
    transcriptCount: number;
  }>;
  officialEvaluation: OfficialProjectEvaluation;
}

export interface CouncilQuestionsResult {
  project_id: string;
  source: string;
  projectProbes: Array<{
    category: string;
    question: string;
    whatToVerify: string;
  }>;
  memberProbes: Array<{
    memberId: string;
    memberName: string;
    memberRole: string;
    contributionPct: number;
    evidenceBasis: string;
    question: string;
    whatToVerify: string;
  }>;
}

export interface LiveCouncilGradePayload {
  demo_score: number;
  architecture_score: number;
  process_score: number;
  defense_score: number;
  feedback: string;
  verdict: "pass" | "pass_with_revisions" | "fail";
  council_members: string;
  demo_verified: boolean;
  repo_verified: boolean;
  frozen_verified: boolean;
  member_scores: OfficialMemberScoreRecord[];
}

export async function fetchDefenseProjectDossierApi(
  projectId: string,
  preferredRole?: SessionRole
): Promise<DefenseProjectDossier | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/defense/projects/${encodeURIComponent(projectId)}/dossier`,
      {},
      preferredRole
    );
    if (!res.ok) return null;
    return (await res.json()) as DefenseProjectDossier;
  } catch {
    return null;
  }
}

export async function saveDefensePackageApi(
  projectId: string,
  payload: DefensePackageData,
  preferredRole?: SessionRole
): Promise<{ status: string; package: DefensePackageData; dossier: DefenseProjectDossier }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/projects/${encodeURIComponent(projectId)}/package`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        demo_url: payload.demoUrl || "",
        slide_url: payload.slideUrl || "",
        report_url: payload.reportUrl || "",
        video_url: payload.videoUrl || "",
        repo_url: payload.repoUrl || "",
        architecture_summary: payload.architectureSummary || "",
        member_roles_summary: payload.memberRolesSummary || "",
      }),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể lưu Hồ sơ Bảo vệ Đồ án.");
  }
  return await res.json();
}

export async function generatePracticeQuestionsApi(
  projectId: string,
  preferredRole: SessionRole = "student"
): Promise<{
  project_id: string;
  source: string;
  evidence_summary: Record<string, any>;
  rounds: any[];
} | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/defense/projects/${encodeURIComponent(projectId)}/practice-questions`,
      { method: "POST" },
      preferredRole
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateCouncilQuestionsApi(
  projectId: string,
  preferredRole?: SessionRole
): Promise<CouncilQuestionsResult> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/projects/${encodeURIComponent(projectId)}/council-questions`,
    { method: "POST" },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể tạo gợi ý câu hỏi Hội đồng.");
  }
  return await res.json();
}

export async function submitLiveCouncilGradeApi(
  projectId: string,
  payload: LiveCouncilGradePayload,
  preferredRole?: SessionRole
): Promise<{
  status: string;
  eval_id: string;
  final_score: number;
  officialEvaluation: OfficialProjectEvaluation;
}> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/defense/projects/${encodeURIComponent(projectId)}/live-grade`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể lưu điểm bảo vệ trực tiếp.");
  }
  return await res.json();
}

// ============================================================================
// ADMIN GOVERNANCE API CLIENTS
// ============================================================================

export interface AdminGovernanceBundle {
  users: AdminUserRecord[];
  classes: AdminClassRecord[];
  subjects?: AdminSubjectSummary[];
  instructors?: AdminInstructorOption[];
  aiServices: AdminServiceUnit[];
  jwtSessions: AdminJwtSession[];
  pendingApprovals: PendingApprovalItem[];
  auditLogs: AdminAuditLog[];
  policies: {
    budgetCap: number;
    guardrailRefuseAnswer: boolean;
    rateLimit20PerHour: boolean;
    dockerNetworkNone: boolean;
    require2FA: boolean;
    blockConcurrentIP: boolean;
    autoLockFailedAttempts: boolean;
  };
  broadcast: string | null;
}

export async function fetchAdminGovernanceBundle(): Promise<AdminGovernanceBundle | null> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/governance`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      users: Array.isArray(data?.users)
        ? data.users.map((u: any, i: number) => mapAdminUserRow(u, i))
        : FALLBACK_ADMIN_USERS,
      classes: data.classes || [],
      subjects: Array.isArray(data?.subjects) ? data.subjects : [],
      instructors: Array.isArray(data?.instructors) ? data.instructors : [],
      aiServices: data.aiServices || [],
      jwtSessions: data.jwtSessions || [],
      pendingApprovals: data.pendingApprovals || [],
      auditLogs: data.auditLogs || [],
      policies: data.policies,
      broadcast: data.broadcast ?? null,
    };
  } catch {
    return null;
  }
}

export async function createAdminUser(payload: {
  name: string;
  email: string;
  code?: string;
  role: string;
  password?: string;
}): Promise<AdminUserRecord | null> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? mapAdminUserRow(data.user) : null;
  } catch {
    return null;
  }
}

export async function patchAdminUser(
  userId: string,
  payload: { role?: string; status?: string; name?: string }
): Promise<AdminUserRecord | null> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? mapAdminUserRow(data.user) : null;
  } catch {
    return null;
  }
}

export async function deleteAdminUserApi(userId: string): Promise<boolean> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveAdminApproval(
  approvalId: string,
  decision: "approved" | "rejected"
) {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/admin/pending-approvals/${approvalId}/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision }),
      }
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function createAdminClass(payload: {
  mode?: "new_course" | "new_section";
  course_id?: string;
  section_code?: string;
  code?: string;
  name?: string;
  instructor_id?: string;
  teacher?: string;
  semester?: string;
  stage_number?: number;
  credits?: number;
  students?: number;
  max_students?: number;
  room: string;
  dockerImage: string;
}): Promise<{ classRecord: AdminClassRecord | null; error?: string }> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/classes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { classRecord: null, error: data.detail || `Lỗi (${res.status})` };
    }
    return { classRecord: data?.class || null };
  } catch {
    return { classRecord: null, error: "Không thể kết nối máy chủ" };
  }
}

export async function patchAdminClass(
  classId: string,
  payload: Partial<AdminClassRecord> & {
    instructor_id?: string;
    section_code?: string;
    max_students?: number;
    stage_number?: number;
    status?: string;
  }
): Promise<AdminClassRecord | null> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/classes/${encodeURIComponent(classId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.class || null;
  } catch {
    return null;
  }
}

export async function fetchAdminClassEnrollments(
  sectionId: string
): Promise<AdminClassEnrollmentsResponse | null> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/admin/classes/${encodeURIComponent(sectionId)}/enrollments`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) return null;
    return (await res.json()) as AdminClassEnrollmentsResponse;
  } catch {
    return null;
  }
}

export async function enrollStudentInClassApi(
  sectionId: string,
  studentId: string
): Promise<{ classRecord?: AdminClassRecord; error?: string }> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/admin/classes/${encodeURIComponent(sectionId)}/enrollments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ student_id: studentId }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return { classRecord: data?.class };
  } catch {
    return { error: "Không thể kết nối máy chủ" };
  }
}

export async function unenrollStudentFromClassApi(
  sectionId: string,
  studentId: string
): Promise<{ classRecord?: AdminClassRecord; error?: string }> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/admin/classes/${encodeURIComponent(sectionId)}/enrollments/${encodeURIComponent(studentId)}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return { classRecord: data?.class };
  } catch {
    return { error: "Không thể kết nối máy chủ" };
  }
}

export async function patchAdminAiService(
  serviceId: string,
  payload: { active?: boolean; quotaPct?: number }
) {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/ai-services/${serviceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function saveAdminPolicies(
  policies: AdminGovernanceBundle["policies"]
) {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/policies`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(policies),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function revokeJwtSessionApi(sessionId: string) {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/jwt-sessions/${sessionId}/revoke`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function revokeUntrustedSessionsApi() {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/jwt-sessions/revoke-untrusted`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function publishBroadcastApi(title: string, message: string) {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, message }),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function clearBroadcastApi() {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/broadcast`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NHÁNH 1: STUDENT LEARNING WORKSPACE & F8 PROGRESS / XP SHOP FULLSTACK API
// ═════════════════════════════════════════════════════════════════════════════

export interface StudentVideoNoteDto {
  id: string;
  subject_id: string;
  lesson_id: string;
  timeSec: number;
  timestamp: string;
  content: string;
  createdAt: string;
}

export interface StudentChapterSubmissionDto {
  id: string;
  subject_id: string;
  chapter_number: number;
  exercise_id: string;
  exercise_title: string;
  repo_url: string;
  student_note: string;
  score: number;
  maxScore: number;
  testsPassed: number;
  testsTotal: number;
  executionTimeMs: number;
  valgrindLeaks: number;
  antiPlagiarismScore: number;
  gradeLabel: string;
  rubric: { title: string; score: number; max: number; note: string }[];
  aiFeedback: {
    strengths: string;
    improvements: string;
    cleanCodeAnalysis: string;
  };
  status?: "pending" | "graded" | "revision_requested" | "flagged";
  instructor_grade?: number | null;
  instructor_feedback?: string;
  graded_by?: string;
  graded_at?: string;
  student_name?: string;
  student_code?: string;
  xp_awarded: number;
  dual_submission_id: string;
  submitted_at: string;
  evaluation_status?: "pending_review" | "teacher_graded";
  metrics_verified?: boolean;
  evidence?: { commit_sha?: string; verification?: string; execution_status?: string };
}

export interface StudentCompletedLessonDto {
  subject_id: string;
  chapter_id: string;
  lesson_id: string;
  status: string;
  quiz_score: number;
  quiz_total: number;
  xp_earned: number;
  completed_at: string;
}

export interface StudentVideoProgressDto {
  subject_id: string;
  lesson_id: string;
  watched_seconds: number;
  duration_seconds: number;
  watched_pct: number;
  completed: boolean;
  updated_at?: string;
}

export interface TaughtCourseRef {
  id: string;
  subjectId: string;
  code: string;
  name: string;
  semester: string;
  credits: number;
  studentCount: number;
  avgProgressPct: number;
  room: string;
  health: string;
}

export interface MemberLearningSummary {
  expPoints: number;
  streakDays: number;
  longestStreak: number;
  selectedTitle: string;
  leagueName: string;
  radar: {
    algorithm: number;
    cleancode: number;
    teamwork: number;
    defense: number;
    debugging: number;
  };
}

export interface UserProfilePatchIn {
  full_name?: string;
  headline?: string;
  bio?: string;
  department?: string;
  office_location?: string;
  skills?: string[];
  github_url?: string;
  website_url?: string;
  phone?: string;
}

export interface UserProfileResponse {
  id: string;
  full_name: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  department?: string;
  office_location?: string;
  skills?: string[];
  github_url?: string;
  website_url?: string;
  phone?: string;
}

export interface StudentLearningOverview {
  user: {
    id: string;
    name: string;
    email: string;
    code: string;
    role?: string;
    background_theme?: string;
    avatar_url?: string;
    headline?: string;
    bio?: string;
    department?: string;
    office_location?: string;
    skills?: string[];
    github_url?: string;
    website_url?: string;
    phone?: string;
  };
  profile: {
    exp_points: number;
    current_streak: number;
    longest_streak: number;
    selected_title: string;
    radar: {
      algorithm: number;
      debugging: number;
      cleancode: number;
      teamwork: number;
      defense: number;
    };
    owned_items: Record<string, string[]>;
    claimed_quests: string[];
  };
  quests?: {
    id: string;
    title: string;
    desc: string;
    xpReward: number;
    status: "available" | "claimable" | "claimed";
    progress: string;
  }[];
  achievements?: {
    id: string;
    name: string;
    desc: string;
    unlocked: boolean;
    xpReward: number;
  }[];
  github_summary?: {
    repo_url: string;
    commits_count: number;
    clean_code_pct: number;
    plagiarism_flags: number;
    enrolled_courses_count: number;
    defense_completed_count: number;
  };
  activity_heatmap?: {
    weeks: number;
    total_commits: number;
    total_activities: number;
    cells: {
      date: string;
      weekIndex: number;
      dayIndex: number;
      commits: number;
      activities: number;
      level: 0 | 1 | 2 | 3 | 4;
    }[];
  };
  completed_lessons: StudentCompletedLessonDto[];
  video_progress?: StudentVideoProgressDto[];
  chapter_submissions: StudentChapterSubmissionDto[];
  courses: {
    id: string;
    subjectId: string;
    code: string;
    name: string;
    stageNumber?: number;
    stageTitle?: string;
    credits?: number;
    enrolled?: boolean;
    sectionId?: string;
    sectionCode?: string;
    semester?: string;
    room?: string;
    teacher: string;
    sandboxEnabled: boolean;
    aiDefenseEnabled: boolean;
    chapters: any[];
  }[];
}

export async function saveStudentVideoProgressApi(payload: {
  subject_id: string;
  lesson_id: string;
  watched_seconds: number;
  duration_seconds: number;
  completed: boolean;
}): Promise<StudentVideoProgressDto | null> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/video-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchStudentLearningOverview(): Promise<StudentLearningOverview | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/student/learning-overview`,
      {},
      "student"
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface StudentQuizAttempt {
  id: string;
  subject_id: string;
  lesson_id: string;
  chapter_id: string;
  status: "in_progress" | "submitted";
  score: number;
  total: number;
  passed: boolean;
  questions: Array<{ id: string; question: string; topic: string; options: Array<{ id: string; text: string }> }>;
  results: Array<{ question_id: string; question: string; selected_option: string; correct_option: string; is_correct: boolean; explanation: string; topic: string }>;
}

async function quizRequest(path: string, payload: unknown): Promise<StudentQuizAttempt> {
  const token = getToken("student");
  const res = await fetch(`${API_BASE}/v1/student/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Không thể lưu Quiz. Vui lòng thử lại.");
  return data;
}

export function startStudentQuizApi(subject_id: string, lesson_id: string, restart = false) {
  return quizRequest("quiz-attempts", { subject_id, lesson_id, restart });
}

export function answerStudentQuizApi(attemptId: string, question_id: string, option_id: string) {
  return quizRequest(`quiz-attempts/${encodeURIComponent(attemptId)}/answers`, { question_id, option_id });
}

export async function completeStudentLessonApi(payload: {
  subject_id: string;
  chapter_id: string;
  lesson_id: string;
  xp?: number;
  quiz_score?: number;
  quiz_total?: number;
  quiz_attempt_id?: string;
}): Promise<{ status: string; subject_id: string; lesson_id: string; xp_awarded: number; total_xp: number } | null> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/lessons/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    dispatchXpUpdated();
    return data;
  } catch {
    return null;
  }
}

export async function fetchStudentVideoNotes(
  subjectId: string,
  lessonId?: string
): Promise<StudentVideoNoteDto[] | null> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const params = new URLSearchParams({ subject_id: subjectId });
    if (lessonId) params.set("lesson_id", lessonId);
    const res = await fetch(`${API_BASE}/v1/student/video-notes?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.notes) ? data.notes : [];
  } catch {
    return null;
  }
}

export async function createStudentVideoNote(payload: {
  subject_id: string;
  lesson_id: string;
  time_sec: number;
  timestamp: string;
  content: string;
}): Promise<StudentVideoNoteDto | null> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/video-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.note ?? null;
  } catch {
    return null;
  }
}

export async function deleteStudentVideoNote(noteId: string): Promise<boolean> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/video-notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

function dispatchXpUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("codemind-xp-updated"));
  }
}

export async function getWorkspaceAuthToken(preferredRole?: SessionRole): Promise<string | null> {
  const role: SessionRole = preferredRole || inferTabRole();
  const existing = getToken(role);
  if (existing && existing !== "mock-token") {
    return existing;
  }
  return (
    (await ensureRoleSession(role).catch(() => null)) ||
    getToken(role)
  );
}

function isOnLoginScreen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const screen = (new URLSearchParams(window.location.search).get("screen") || "").toLowerCase();
    return screen === "login" || screen === "auth";
  } catch {
    return false;
  }
}

async function fetchWithAuthRetry(
  url: string,
  init: RequestInit = {},
  preferredRole?: SessionRole
): Promise<Response> {
  const role: SessionRole = preferredRole || inferTabRole();
  const buildHeaders = (tok: string | null): HeadersInit => {
    const headers = new Headers(init.headers || {});
    if (tok && tok !== "mock-token") {
      headers.set("Authorization", `Bearer ${tok}`);
    } else {
      headers.delete("Authorization");
    }
    return headers;
  };

  const token = isOnLoginScreen()
    ? getToken(role)
    : await getWorkspaceAuthToken(role);
  let res = await fetch(url, { ...init, headers: buildHeaders(token) });
  if (res.status === 401 && !isOnLoginScreen()) {
    const storedNow = getToken(role);
    let freshToken: string | null = null;
    if (storedNow && storedNow !== "mock-token" && storedNow !== token) {
      freshToken = storedNow;
    } else {
      if (token) clearSessionTokens(role);
      freshToken = (await ensureRoleSession(role).catch(() => null)) || getToken(role);
    }
    if (freshToken && freshToken !== "mock-token" && freshToken !== token) {
      res = await fetch(url, { ...init, headers: buildHeaders(freshToken) });
    }
  }
  return res;
}

export async function submitStudentChapterExercise(payload: {
  subject_id: string;
  chapter_number: number;
  exercise_id: string;
  exercise_title: string;
  repo_url: string;
  student_note: string;
  xp?: number;
}): Promise<{ submission?: StudentChapterSubmissionDto; total_xp?: number; error?: string }> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/chapter-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.detail || `Lỗi máy chủ (${res.status})` };
    }
    dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Không thể kết nối Backend FastAPI." };
  }
}

export async function unlockXpRewardItem(payload: {
  category: string;
  item_id: string;
  required_xp?: number;
}): Promise<{
  exp_points?: number;
  owned_items?: Record<string, string[]>;
  unlocked?: boolean;
  required_xp?: number;
  error?: string;
}> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/xp-shop/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        category: payload.category,
        item_id: payload.item_id,
        cost: payload.required_xp ?? 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || "Không thể mở khóa vật phẩm" };
    dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function purchaseXpShopItem(payload: {
  category: string;
  item_id: string;
  cost: number;
}): Promise<{ exp_points?: number; owned_items?: Record<string, string[]>; error?: string }> {
  return unlockXpRewardItem({
    category: payload.category,
    item_id: payload.item_id,
    required_xp: payload.cost,
  });
}

export async function claimXpQuestApi(payload: {
  quest_id: string;
  reward: number;
}): Promise<{ exp_points?: number; claimed_quests?: string[]; error?: string }> {
  const token = (await ensureRoleSession("student").catch(() => null)) || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/student/xp-shop/claim-quest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || "Không thể nhận thưởng" };
    dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function equipXpShopItemApi(
  category: "avatar" | "mentor" | "chat" | "chat_skin" | "map" | "map_skin" | "badge",
  itemId: string,
  role: SessionRole = "student"
): Promise<{ equipped_items?: Record<string, string>; error?: string }> {
  const token = getToken(role);
  if (!token) return {};
  try {
    const res = await fetch(`${API_BASE}/v1/student/xp-shop/equip`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ category, item_id: itemId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || "Không thể trang bị vật phẩm" };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function enrollStudentCourseApi(
  courseOrSectionId: string
): Promise<{
  enrolled?: boolean;
  sectionId?: string;
  sectionCode?: string;
  message?: string;
  error?: string;
}> {
  const token = getToken("student");
  if (!token) return { error: "Vui lòng đăng nhập tài khoản Học viên." };
  try {
    const res = await fetch(
      `${API_BASE}/v1/student/courses/${encodeURIComponent(courseOrSectionId)}/enroll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || "Không thể ghi danh học phần." };
    window.dispatchEvent(new CustomEvent("codemind-courses-updated"));
    window.dispatchEvent(new Event("codemind-nav-updated"));
    return data;
  } catch {
    return { error: "Lỗi kết nối máy chủ." };
  }
}

export interface OpenCourseSectionDto {
  id: string;
  sectionCode: string;
  groupLabel: string;
  joinCode: string;
  teacherName: string;
  room: string;
  semester: string;
  scheduleLabel: string;
  enrolledCount: number;
  maxStudents: number;
  isFull: boolean;
  isEnrolled: boolean;
}

export interface OpenCourseSectionsResponseDto {
  courseId: string;
  subjectId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  enrolledSectionId: string | null;
  sections: OpenCourseSectionDto[];
}

export async function fetchCourseOpenSectionsApi(
  courseOrSubjectId: string
): Promise<OpenCourseSectionsResponseDto | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/student/courses/${encodeURIComponent(courseOrSubjectId)}/sections`,
      {},
      "student"
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function joinClassByCodeApi(
  code: string,
  expectedSubjectId?: string
): Promise<{
  enrolled?: boolean;
  sectionId?: string;
  sectionCode?: string;
  courseId?: string;
  subjectId?: string;
  courseCode?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/student/classes/join-by-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          expected_subject_id: expectedSubjectId || null,
        }),
      },
      "student"
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.detail || "Mã tham gia lớp không hợp lệ." };
    }
    window.dispatchEvent(new CustomEvent("codemind-courses-updated"));
    window.dispatchEvent(new Event("codemind-nav-updated"));
    return data;
  } catch {
    return { error: "Lỗi kết nối máy chủ." };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NHÁNH 2: ENGINEERING PROJECTS, TASK MANAGEMENT & KANBAN WORKSPACE API
// ═════════════════════════════════════════════════════════════════════════════

export interface ProjectGitRepoSummary {
  repoUrl: string;
  repoSlug: string;
  targetBranch: string;
  webhookActive: boolean;
  lastSyncedAt: string;
  commitsCount: number;
  openPrsCount: number;
  mergedPrsCount: number;
  totalPrsCount: number;
}

export interface TaskGitCommitRef {
  id: string;
  sha: string;
  branch: string;
  message: string;
  authorName: string;
  timeAgo: string;
}

export interface TaskGitPrRef {
  id: string;
  prNumber: number;
  title: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  aiReviewScore: number;
  peerApproved: boolean;
  prUrl: string;
}

export interface TaskGitActivity {
  commits: TaskGitCommitRef[];
  pullRequests: TaskGitPrRef[];
  commitsCount: number;
  latestCommitSha?: string | null;
  latestPrNumber?: number | null;
  latestPrStatus?: string | null;
  latestPrUrl?: string | null;
  hasValidGitProof: boolean;
}

export interface WorkspaceProjectDto {
  id: string;
  code: string;
  name: string;
  client: string;
  course: string;
  sprint: string;
  kind: string;
  status: "planning" | "active" | "review" | "delivered";
  kanbanStatus?: "planning" | "in-progress" | "review" | "delivered";
  fav: boolean;
  isFrozen?: boolean;
  dueDate: string;
  dueText: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  storyPoints: number;
  totalXp?: number;
  pointsBurned: number;
  budgetStr?: string;
  lead?: string;
  instructor?: string;
  instructorId?: string;
  instructorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  instructorAvatar?: string;
  finalScore?: number | null;
  evaluationStatus?: string | null;
  evaluationFeedback?: string | null;
  members: any[];
  team: any[];
  colorHex?: string;
  tlStart: number;
  tlWidth: number;
  tlColor?: "amber" | "dark" | "done";
  gitRepo?: ProjectGitRepoSummary | null;
  tasks: any[];
  isMyProject?: boolean;
  isLead?: boolean;
  isAdvisor?: boolean;
  isReviewer?: boolean;
  canManageProject?: boolean;
  canGradeProject?: boolean;
  leaderUserId?: string | null;
}

export interface KanbanWorkspaceResponse {
  projects: WorkspaceProjectDto[];
  all_projects_count?: number;
  my_projects_count?: number;
  current_user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  summary: {
    total_projects: number;
    active_projects: number;
    total_tasks: number;
    done_tasks: number;
  };
}

export async function fetchKanbanWorkspace(scope?: "auto" | "my" | "all"): Promise<KanbanWorkspaceResponse | null> {
  try {
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/workspace${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createWorkspaceProjectApi(payload: {
  id?: string;
  code?: string;
  name: string;
  client?: string;
  course?: string;
  sprint?: string;
  kind?: string;
  status?: string;
  fav?: boolean;
  due_date?: string;
  due_text?: string;
  story_points?: number;
  team_members?: string[];
  invited_user_ids?: string[];
  member_roles?: Record<string, string>;
  repo_url?: string;
  target_branch?: string;
}): Promise<WorkspaceProjectDto | null> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/workspace/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.project ?? null;
  } catch {
    return null;
  }
}

export interface UserSearchItem {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  avatar: string;
  color: string;
  bg: string;
  textColor: string;
}

export interface ProjectInvitationItem {
  id: string;
  project_id: string;
  project_name: string;
  inviter_user_id: string;
  inviter_name: string;
  invitee_user_id: string;
  invitee_name: string;
  invitee_email: string;
  role_title: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  client?: string;
  course?: string;
  project_status?: string;
  color_hex?: string;
}

export async function searchUsersForTeamApi(q: string = ""): Promise<UserSearchItem[]> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/users/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch {
    return [];
  }
}

export async function inviteUserToProjectApi(
  projectId: string,
  payload: { user_id: string; role_title?: string }
): Promise<{ success: boolean; message: string; invitation?: any }> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/projects/${encodeURIComponent(projectId)}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Không thể gửi lời mời tham gia đồ án");
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi khi gửi lời mời" };
  }
}

export async function fetchProjectDetailInvitationsApi(
  projectId: string
): Promise<{ invitations: ProjectInvitationItem[] }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/projects/${encodeURIComponent(projectId)}/invitations`
    );
    if (!res.ok) return { invitations: [] };
    return await res.json();
  } catch {
    return { invitations: [] };
  }
}

export async function fetchProjectInvitationsApi(): Promise<{
  invitations: ProjectInvitationItem[];
  pending: ProjectInvitationItem[];
  total_pending: number;
}> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/invitations`);
    if (!res.ok) return { invitations: [], pending: [], total_pending: 0 };
    return await res.json();
  } catch {
    return { invitations: [], pending: [], total_pending: 0 };
  }
}

export async function acceptProjectInvitationApi(
  invitationId: string
): Promise<{ success: boolean; message: string; project_id?: string }> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/invitations/${encodeURIComponent(invitationId)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Không thể chấp nhận lời mời");
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi khi chấp nhận lời mời" };
  }
}

export async function declineProjectInvitationApi(
  invitationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/invitations/${encodeURIComponent(invitationId)}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Không thể từ chối lời mời");
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi khi từ chối lời mời" };
  }
}

export async function removeProjectMemberApi(
  projectId: string,
  memberId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Không thể gỡ thành viên khỏi đồ án");
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi khi gỡ thành viên" };
  }
}

export async function updateWorkspaceProjectApi(
  projectId: string,
  payload: {
    fav?: boolean;
    is_frozen?: boolean;
    status?: string;
    name?: string;
    sprint?: string;
    due_date?: string;
    instructor?: string;
    instructor_id?: string;
    reviewer?: string;
    reviewer_id?: string;
    team?: any[];
  },
  preferredRole?: SessionRole,
  throwOnError: boolean = false
): Promise<WorkspaceProjectDto | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/workspace/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      preferredRole
    );
    if (!res.ok) {
      if (throwOnError) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể cập nhật thông tin đồ án.");
      }
      return null;
    }
    const data = await res.json();
    return data.project ?? null;
  } catch (err) {
    if (throwOnError) throw err;
    return null;
  }
}

export async function createWorkspaceTaskApi(
  projectId: string,
  task: Record<string, any>
): Promise<any | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/workspace/projects/${encodeURIComponent(projectId)}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.task ?? null;
  } catch {
    return null;
  }
}

export async function batchCreateWorkspaceTasksApi(
  projectId: string,
  tasks: Record<string, any>[],
  replace: boolean = false
): Promise<any[] | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/workspace/projects/${encodeURIComponent(projectId)}/tasks/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, replace }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.tasks) ? data.tasks : [];
  } catch {
    return null;
  }
}

export async function generateAiWbsTasksApi(payload: {
  feature_name: string;
  description: string;
  stack: string;
  custom_tech?: string;
  granularity: number;
  include_h2: boolean;
  selected_members: any[];
}): Promise<any[] | null> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/kanban/workspace/ai-wbs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.tasks) ? data.tasks : null;
  } catch {
    return null;
  }
}

export async function updateWorkspaceTaskApi(
  taskId: string,
  patch: Record<string, any>,
  preferredRole?: SessionRole
): Promise<{ task?: any; xp_awarded?: number; error?: string; status?: number }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/workspace/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
      preferredRole
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.detail || `Lỗi (${res.status})`, status: res.status };
    }
    if ((data.xp_awarded || 0) > 0) {
      dispatchXpUpdated();
    }
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function moveWorkspaceTaskApi(
  taskId: string,
  targetColumn: string,
  targetIndex: number = 0,
  preferredRole?: SessionRole
): Promise<{ task?: any; xp_awarded?: number; error?: string; status?: number }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/kanban/workspace/tasks/${encodeURIComponent(taskId)}/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_column: targetColumn,
          target_index: targetIndex,
        }),
      },
      preferredRole
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.detail || `Lỗi (${res.status})`, status: res.status };
    }
    if ((data.xp_awarded || 0) > 0) {
      dispatchXpUpdated();
    }
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function deleteWorkspaceTaskApi(taskId: string): Promise<boolean> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/kanban/workspace/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function reviewWorkspaceTaskApi(
  taskId: string,
  decision: "approve" | "request_revision",
  feedback: string = "",
  rating?: number
): Promise<{ error?: string; task?: any; xp_awarded?: number }> {
  const activeRole = inferTabRole();
  const roleForReview: SessionRole = activeRole === "admin" ? "admin" : "instructor";
  const token = await getWorkspaceAuthToken(roleForReview);
  try {
    const res = await fetch(
      `${API_BASE}/v1/kanban/workspace/tasks/${encodeURIComponent(taskId)}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision, feedback, rating }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    if ((data.xp_awarded || 0) > 0) {
      dispatchXpUpdated();
    }
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function fetchProjectEvaluationApi(
  projectId: string
): Promise<{
  error?: string;
  is_graded?: boolean;
  evaluation?: any;
  project?: any;
  anti_freerider_metrics?: any[];
  total_completed_points?: number;
}> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/kanban/workspace/projects/${encodeURIComponent(projectId)}/evaluation`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function evaluateProjectApi(
  projectId: string,
  payload: {
    group_score: number;
    architecture_score: number;
    process_score: number;
    defense_score: number;
    feedback: string;
    member_scores: any[];
  }
): Promise<{ error?: string; status?: string; eval_id?: string; final_score?: number }> {
  const activeRole = inferTabRole();
  const roleForEval: SessionRole = activeRole === "admin" ? "admin" : "instructor";
  const token = await getWorkspaceAuthToken(roleForEval);
  try {
    const res = await fetch(
      `${API_BASE}/v1/kanban/workspace/projects/${encodeURIComponent(projectId)}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NHÁNH 3 FULLSTACK API: GIT PROJECT HUB, COMMITS GRAPH & 2-TIER PR REVIEW
// ═════════════════════════════════════════════════════════════════════════════

export interface GitHubProjectSummary {
  id: string;
  code: string;
  name: string;
  kind: string;
  status: string;
  sprint: string;
  isFrozen?: boolean;
  isLead?: boolean;
}

export interface GitHubRepoConfig {
  mode?: "read_only";
  remoteWritesEnabled?: boolean;
  evidenceVerified?: boolean;
  lastSyncError?: string | null;
  truncated?: boolean;
  sampleLimits?: { commits: number; pullRequests: number };
  projectId: string;
  repoUrl: string;
  repoSlug: string;
  targetBranch: string;
  defaultMergeStrategy: string;
  webhookActive: boolean;
  cadenceVarianceHours: number;
  lastSyncedAt: string;
  updatedAt: string;
}

export interface GitHubCommitRecord {
  statsKnown?: boolean;
  url?: string;
  evidenceSource?: string;
  verifiedAt?: string;
  id: string;
  projectId: string;
  sha: string;
  author: {
    name: string;
    role: string;
    avatar: string;
    color: string;
  };
  branch: string;
  branchLabel: string;
  branchColor: string;
  taskCode?: string | null;
  message: string;
  date: string;
  timeAgo: string;
  stats: {
    additions: number;
    deletions: number;
    files: number;
  };
  filesChanged: string[];
  cx: number;
  cy: number;
}

export interface GitPrFinding {
  id: string;
  severity: "critical" | "warning" | "info";
  rule: string;
  file: string;
  line: number;
  message: string;
  suggestion: string;
  resolved: boolean;
}

export interface GitPrDiffLine {
  file: string;
  type: "added" | "removed";
  line: number;
  code: string;
}

export interface GitPrDefenseQuestion {
  id: string;
  persona: string;
  question: string;
}

export interface GitPullRequestRecord {
  headSha?: string;
  url?: string;
  evidenceSource?: string;
  verifiedAt?: string;
  aiReviewAvailable?: boolean;
  hasCompletedTaskProof?: boolean;
  testEvidence?: { complete: boolean; headSha: string; state: string; testsKnown: boolean; testsPassed: boolean; checks: Array<{ name?: string; status: string; conclusion?: string; url?: string; sha?: string }> };
  reviewEvidence?: { complete: boolean; approved: boolean; approvers: string[]; changesRequested: boolean; reviews: Array<{ id?: number; reviewer?: string; state?: string; commitSha?: string; url?: string; submittedAt?: string }> };
  id: string;
  projectId: string;
  prNumber: number;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  taskCode?: string | null;
  author: {
    name: string;
    role: string;
    avatar: string;
    color: string;
  };
  status: "open" | "changes_requested" | "approved" | "merged" | "closed";
  mergeStrategy: string;
  aiReviewScore: number;
  aiBlastRadius: string;
  aiSummary: string;
  aiFindings: GitPrFinding[];
  diffPreview: GitPrDiffLine[];
  defenseQuestions: GitPrDefenseQuestion[];
  peerReviewer?: string | null;
  peerApproved: boolean;
  peerComment: string;
  oneClickFixed: boolean;
  dodSha256?: string | null;
  dualSubmissionId?: string | null;
  xpAwarded: boolean;
  createdAt: string;
  mergedAt?: string | null;
}

export interface GitMemberAnalytics {
  name: string;
  role: string;
  avatar: string;
  color: string;
  barClass: string;
  pillClass: string;
  sharePct: number;
  commitsCount: number;
  additions: number;
  deletions: number;
  storyPointsDone: number;
  tasksSummary: string;
  grade: string;
}

export interface GitHubMetrics {
  scoresAvailable?: boolean;
  gitCultureScore: number;
  taskLinkedPct: number;
  aiIntegrityPct: number;
  cadenceVarianceHours: number;
  totalCommits: number;
  openPrsCount: number;
  mergedPrsCount: number;
  memberShares: number[];
  balanceStatus: string;
}

export interface GitProjectTaskRef {
  id: string;
  code: string;
  title: string;
  column: string;
  points: number;
  epic: string;
  dependsOn?: string | null;
}

export interface GitHubWorkspaceBundle {
  activeProjectId: string;
  projects: GitHubProjectSummary[];
  repository: GitHubRepoConfig | null;
  metrics: GitHubMetrics;
  commits: GitHubCommitRecord[];
  pullRequests: GitPullRequestRecord[];
  memberAnalytics: GitMemberAnalytics[];
  projectTasks: GitProjectTaskRef[];
}

export async function fetchGitHubWorkspaceApi(
  projectId: string = "prj-codemind",
  preferredRole?: SessionRole
): Promise<GitHubWorkspaceBundle | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/git-hub/workspace?project_id=${encodeURIComponent(projectId)}`,
      {},
      preferredRole
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateGitHubRepoApi(
  projectId: string,
  payload: { repo_url: string; target_branch: string; default_merge_strategy: string },
  preferredRole?: SessionRole
): Promise<{ repository?: GitHubRepoConfig; error?: string }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/repo`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      preferredRole
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function pushGitCommitApi(
  projectId: string,
  payload: {
    branch: string;
    message: string;
    task_code?: string;
    author_name?: string;
    files_changed?: string[];
    additions?: number;
    deletions?: number;
  },
  preferredRole?: SessionRole
): Promise<{ commit?: GitHubCommitRecord; xp_awarded?: number; linkedTaskUpdated?: string | null; error?: string }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/commits`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    if ((data.xp_awarded || 0) > 0) dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function createGitPullRequestApi(
  projectId: string,
  payload: {
    title: string;
    description: string;
    source_branch: string;
    target_branch: string;
    task_code?: string;
    author_name?: string;
    merge_strategy?: string;
    code_snippet?: string;
  },
  preferredRole?: SessionRole
): Promise<{ pullRequest?: GitPullRequestRecord; linkedTaskUpdated?: string | null; error?: string }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/pull-requests`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function applyPrAiFixApi(
  prId: string,
  preferredRole?: SessionRole
): Promise<{ pullRequest?: GitPullRequestRecord; commit?: GitHubCommitRecord; error?: string }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/pull-requests/${encodeURIComponent(prId)}/ai-fix`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function approvePrPeerReviewApi(
  prId: string,
  payload: { reviewer_name?: string; comment?: string },
  preferredRole?: SessionRole
): Promise<{ pullRequest?: GitPullRequestRecord; error?: string; status?: number }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/pull-requests/${encodeURIComponent(prId)}/peer-approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})`, status: res.status };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function requestChangesPrApi(
  prId: string,
  payload: { reviewer_name?: string; comment: string },
  preferredRole?: SessionRole
): Promise<{ pullRequest?: GitPullRequestRecord; error?: string; status?: number }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/pull-requests/${encodeURIComponent(prId)}/request-changes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})`, status: res.status };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function mergeGitPullRequestApi(
  prId: string,
  mergeStrategy: string = "squash",
  preferredRole?: SessionRole
): Promise<{
  pullRequest?: GitPullRequestRecord;
  mergeCommit?: GitHubCommitRecord;
  updatedTaskCode?: string | null;
  dualSubmissionId?: string;
  xp_awarded?: number;
  error?: string;
  status?: number;
}> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/pull-requests/${encodeURIComponent(prId)}/merge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ merge_strategy: mergeStrategy }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})`, status: res.status };
    if ((data.xp_awarded || 0) > 0) dispatchXpUpdated();
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function syncGitHubLiveApi(
  projectId: string,
  repoUrl?: string,
  preferredRole?: SessionRole
): Promise<{
  synced?: boolean;
  repoSlug?: string;
  repoUrl?: string;
  commitsSynced?: number;
  prsSynced?: number;
  lastSyncedAt?: string;
  isRemoteLive?: boolean;
  error?: string;
}> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/sync-github`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(repoUrl ? { repoUrl } : {}),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function fetchProjectArchitectureApi(
  projectId: string,
  preferredRole?: SessionRole
): Promise<any> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/architecture`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveProjectArchitectureApi(
  projectId: string,
  payload: any,
  preferredRole?: SessionRole
): Promise<{ success?: boolean; error?: string }> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/architecture`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function generateProjectArchitectureApi(
  projectId: string,
  repoUrl?: string,
  preferredRole?: SessionRole
): Promise<any> {
  const token = await getWorkspaceAuthToken(preferredRole);
  try {
    const res = await fetch(
      `${API_BASE}/v1/git-hub/projects/${encodeURIComponent(projectId)}/generate-architecture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(repoUrl ? { repoUrl } : {}),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NHÁNH 4 FULLSTACK API: SECURITY OVERVIEW & MULTI-DEVICE SESSIONS
// ═════════════════════════════════════════════════════════════════════════════

export interface UserDeviceSession {
  id: string;
  userId: string;
  device: string;
  deviceType: "desktop" | "laptop" | "mobile" | "tablet" | string;
  browser: string;
  os: string;
  ipLocation: string;
  state: string;
  issuedAt: string;
  lastActiveAt: string;
  isUntrusted: boolean;
  revoked: boolean;
  revokedAt?: string | null;
  isCurrent: boolean;
}

export interface SecurityAuditItem {
  id: string;
  action: string;
  target: string;
  decision: string;
  category: string;
  createdAt: string;
}

export interface SecurityOverviewBundle {
  user: {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    role: string;
    userCode: string;
    twoFactorEnabled: boolean;
    failedLoginAttempts: number;
    passwordChangedAt: string;
  };
  securityScore: number;
  tokenInfo: {
    algorithm: string;
    accessTtlMinutes: number;
    refreshTtlDays: number;
    currentSessionId?: string | null;
    lastIssuedLabel: string;
  };
  sessions: UserDeviceSession[];
  revokedSessions: UserDeviceSession[];
  recentAudits: SecurityAuditItem[];
}

export async function fetchSecurityOverviewApi(
  fallbackRole: "student" | "instructor" | "admin" = "student"
): Promise<SecurityOverviewBundle | null> {
  const existing = getToken(fallbackRole);
  const token =
    existing && existing !== "mock-token"
      ? existing
      : await ensureRoleSession(fallbackRole).catch(() => null);
  try {
    const res = await fetch(`${API_BASE}/v1/auth/security-overview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function changePasswordApi(payload: {
  current_password: string;
  new_password: string;
  revoke_other_sessions: boolean;
}): Promise<{ status?: string; revoked_other_count?: number; message?: string; error?: string }> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(`${API_BASE}/v1/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function updateSecuritySettingsApi(
  twoFactorEnabled: boolean
): Promise<{ twoFactorEnabled?: boolean; securityScore?: number; error?: string }> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(`${API_BASE}/v1/auth/security-settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ two_factor_enabled: twoFactorEnabled }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function toggleDeviceTrustApi(
  sessionId: string,
  trusted: boolean
): Promise<{ session?: UserDeviceSession; error?: string }> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/auth/sessions/${encodeURIComponent(sessionId)}/trust`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ trusted }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function revokeUserSessionApi(
  sessionId: string
): Promise<{ status?: string; id?: string; error?: string }> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(
      `${API_BASE}/v1/auth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function revokeOtherSessionsApi(): Promise<{
  revoked_count?: number;
  error?: string;
}> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(`${API_BASE}/v1/auth/sessions/revoke-others`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function simulateNewDeviceSessionApi(
  preset: string = "mobile"
): Promise<{ session?: UserDeviceSession; error?: string }> {
  const token = await getWorkspaceAuthToken();
  try {
    const res = await fetch(`${API_BASE}/v1/auth/sessions/simulate-device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ preset }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.detail || `Lỗi (${res.status})` };
    return data;
  } catch {
    return { error: "Lỗi kết nối Backend" };
  }
}

export async function rotateCurrentJwtApi(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await refreshAccessToken();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Không thể xoay vòng JWT Token" };
  }
}

export interface AppNotification {
  id: string;
  recipient_user_id?: string | null;
  target_role: string;
  title: string;
  desc_text: string;
  category: string;
  is_read: number;
  action_url?: string;
  created_at: string;
}

export async function fetchNotificationsApi(
  role?: SessionRole
): Promise<{ notifications: AppNotification[]; unread_count: number }> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/notifications`, {}, role);
    if (!res.ok) return { notifications: [], unread_count: 0 };
    return await res.json();
  } catch {
    return { notifications: [], unread_count: 0 };
  }
}

export async function markNotificationReadApi(
  id: string,
  role?: SessionRole
): Promise<void> {
  try {
    const targetRole = role || inferTabRole();
    const token = getToken(targetRole);
    if (!token) return;
    await fetch(`${API_BASE}/v1/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export async function markAllNotificationsReadApi(role?: SessionRole): Promise<void> {
  try {
    const targetRole = role || inferTabRole();
    const token = getToken(targetRole);
    if (!token) return;
    await fetch(`${API_BASE}/v1/notifications/mark-all-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export interface AcademicScheduleItem {
  id: string;
  course_id: string;
  project_id?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  project_repo_url?: string | null;
  course_code?: string | null;
  instructor_id: string;
  instructor_name: string;
  category: "exam" | "defense" | "office_hours" | "review" | "lab" | string;
  title: string;
  room_or_link: string;
  schedule_date: string;
  start_hour: number;
  end_hour: number;
  break_hour: number;
  max_capacity: number;
  current_booked: number;
  is_locked: number | boolean;
  status: string;
  note?: string;
  created_at: string;
  updated_at: string;
  bookings?: ScheduleBookingItem[];
  my_booking?: ScheduleBookingItem | null;
  pending_bookings_count?: number;
}

export interface ScheduleProjectOption {
  id: string;
  code: string;
  name: string;
  course: string;
  status: string;
  repo_url?: string | null;
}

export interface ScheduleCourseOption {
  id: string;
  code: string;
  name: string;
  title?: string;
}

export interface ScheduleInstructorOption {
  id: string;
  email: string;
  display_name: string;
}

export interface ScheduleWorkspaceBundle {
  schedules: AcademicScheduleItem[];
  projects: ScheduleProjectOption[];
  courses: ScheduleCourseOption[];
  instructors: ScheduleInstructorOption[];
}

export interface ScheduleBookingItem {
  id: string;
  schedule_id: string;
  student_id: string;
  student_name: string;
  instructor_id: string;
  topic: string;
  repo_or_doc_url?: string;
  student_note?: string;
  booking_status: "pending" | "confirmed" | "rejected" | "completed";
  instructor_reply?: string;
  confirmed_at?: string;
  completed_at?: string;
  created_at: string;
}

export async function fetchSchedulesBundleApi(
  filters?: {
    courseId?: string;
    category?: string;
    date?: string;
    projectId?: string;
    search?: string;
  },
  preferredRole?: SessionRole
): Promise<ScheduleWorkspaceBundle> {
  try {
    const query = new URLSearchParams();
    if (filters?.courseId) query.set("course_id", filters.courseId);
    if (filters?.category) query.set("category", filters.category);
    if (filters?.date) query.set("schedule_date", filters.date);
    if (filters?.projectId) query.set("project_id", filters.projectId);
    if (filters?.search) query.set("search", filters.search);
    const qs = query.toString();
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/schedules${qs ? `?${qs}` : ""}`,
      {},
      preferredRole
    );
    if (!res.ok) {
      return { schedules: [], projects: [], courses: [], instructors: [] };
    }
    const data = await res.json();
    return {
      schedules: Array.isArray(data.schedules) ? data.schedules : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      courses: Array.isArray(data.courses) ? data.courses : [],
      instructors: Array.isArray(data.instructors) ? data.instructors : [],
    };
  } catch {
    return { schedules: [], projects: [], courses: [], instructors: [] };
  }
}

export async function fetchSchedulesApi(
  filters?: {
    courseId?: string;
    category?: string;
    date?: string;
    projectId?: string;
    search?: string;
  },
  preferredRole?: SessionRole
): Promise<AcademicScheduleItem[]> {
  const bundle = await fetchSchedulesBundleApi(filters, preferredRole);
  return bundle.schedules;
}

export async function createScheduleApi(
  payload: Record<string, any>,
  preferredRole?: SessionRole
): Promise<{ message: string; schedule_id: string; schedule?: AcademicScheduleItem }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể tạo ca lịch mới");
  }
  return await res.json();
}

export async function updateScheduleApi(
  scheduleId: string,
  payload: Record<string, any>,
  preferredRole?: SessionRole
): Promise<{ message: string; schedule?: AcademicScheduleItem }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể cập nhật ca lịch");
  }
  return await res.json();
}

export async function bookScheduleApi(
  scheduleId: string,
  payload: { topic: string; repo_or_doc_url?: string; student_note?: string },
  preferredRole?: SessionRole
): Promise<any> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules/${encodeURIComponent(scheduleId)}/book`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể đăng ký ca lịch");
  }
  return await res.json();
}

export async function updateBookingStatusApi(
  bookingId: string,
  payload: {
    status: string;
    instructor_reply?: string;
    switch_to_online?: boolean;
    online_link?: string;
  },
  preferredRole?: SessionRole
): Promise<any> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể cập nhật trạng thái lịch hẹn");
  }
  return await res.json();
}

export async function cancelScheduleBookingApi(
  bookingId: string,
  preferredRole?: SessionRole
): Promise<{ message: string; booking_id: string }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules/bookings/${encodeURIComponent(bookingId)}`,
    { method: "DELETE" },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể hủy đăng ký lịch hẹn");
  }
  return await res.json();
}

export async function deleteScheduleApi(
  scheduleId: string,
  preferredRole?: SessionRole
): Promise<{ message: string; schedule_id: string }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/schedules/${encodeURIComponent(scheduleId)}`,
    { method: "DELETE" },
    preferredRole
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể xóa ca lịch");
  }
  return await res.json();
}

export interface StudentAnalyticsItem {
  student_id: string;
  student_code: string;
  display_name: string;
  email: string;
  course_code: string;
  progress_pct: number;
  lessons_done: number;
  total_lessons: number;
  avg_quiz: number;
  total_submissions: number;
  defense_score: number;
  kanban_tasks_done: number;
  kanban_sp: number;
  exp_points: number;
  current_streak: number;
  risk_status: "at_risk" | "top_performer" | "on_track";
  risk_label: string;
}

export async function fetchStudentsAnalyticsApi(
  courseCode?: string,
  sectionId?: string
): Promise<StudentAnalyticsItem[]> {
  try {
    const token =
      getToken("instructor") ||
      getToken("admin") ||
      (await ensureRoleSession("instructor").catch(() => null)) ||
      getToken();
    const params = new URLSearchParams();
    if (sectionId) params.set("section_id", sectionId);
    if (courseCode) params.set("course_code", courseCode);
    const qs = params.toString();
    const query = qs ? `?${qs}` : "";
    const res = await fetch(`${API_BASE}/v1/instructor/students-analytics${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.students || [];
  } catch {
    return [];
  }
}

export async function remindStudentApi(
  studentId: string,
  payload: { message: string; action_type: string; bonus_xp?: number }
): Promise<any> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  const res = await fetch(`${API_BASE}/v1/instructor/students/${studentId}/remind`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể gửi nhắc nhở");
  }
  return await res.json();
}

export interface AdminAnalyticsData {
  kpi: {
    total_students: number;
    total_instructors: number;
    total_admins: number;
    total_courses: number;
    total_projects: number;
    kanban_tasks_done: number;
    kanban_sp_done: number;
    total_submissions: number;
    ci_cd_pass_rate: number;
    ai_defense_avg: number;
    total_ai_tokens: number;
    total_ai_cost: number;
    active_jwt_sessions: number;
  };
  curriculum_stages: Array<{
    stage: number;
    title: string;
    codes: string[];
    desc: string;
    progress_pct: number;
  }>;
  ai_units: any[];
}

export async function fetchAdminAnalyticsApi(): Promise<AdminAnalyticsData | null> {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE}/v1/admin/analytics-overview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎓 GIẢNG VIÊN: THẨM ĐỊNH & CHẤM BÀI TẬP THỰC HÀNH TỪNG CHƯƠNG (16 MÔN HỌC)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterSubmissionItem {
  metricsVerified?: boolean;
  evaluationStatus?: "pending_review" | "teacher_graded";
  evidence?: { commit_sha?: string; verification?: string; execution_status?: string };
  id: string;
  userId: string;
  studentName: string;
  studentCode: string;
  subjectId: string;
  chapterNumber: number;
  exerciseId: string;
  exerciseTitle: string;
  repoUrl: string;
  studentNote: string;
  score: number;
  maxScore: number;
  testsPassed: number;
  testsTotal: number;
  executionTimeMs: number;
  antiPlagiarismScore: number;
  status: "pending" | "graded" | "revision_requested" | "flagged";
  instructorGrade?: number | null;
  instructorFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  rubric: { title: string; score: number; max: number; note: string }[];
  aiFeedback: { strengths: string; improvements: string };
  xpAwarded: number;
  submittedAt: string;
}

export interface ChapterSubmissionsOverview {
  submissions: ChapterSubmissionItem[];
  total: number;
  summary: {
    total: number;
    pendingCount: number;
    gradedCount: number;
    flaggedCount: number;
    avgScore: number;
  };
}

export async function fetchInstructorChapterSubmissions(
  subjectId?: string,
  chapterNumber?: number,
  statusFilter?: string,
  sectionId?: string
): Promise<ChapterSubmissionsOverview> {
  const token =
    getToken("instructor") ||
    getToken("admin") ||
    (await ensureRoleSession("instructor").catch(() => null)) ||
    getToken();
  const params = new URLSearchParams();
  if (sectionId) params.set("section_id", sectionId);
  else if (subjectId) params.set("subject_id", subjectId);
  if (typeof chapterNumber === "number") params.set("chapter_number", String(chapterNumber));
  if (statusFilter && statusFilter !== "all") params.set("status_filter", statusFilter);
  const q = params.toString() ? `?${params.toString()}` : "";
  try {
    const res = await fetch(`${API_BASE}/v1/instructor/chapter-submissions${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return {
        submissions: [],
        total: 0,
        summary: { total: 0, pendingCount: 0, gradedCount: 0, flaggedCount: 0, avgScore: 0 },
      };
    }
    const data = await res.json();
    const subs = (data.submissions || []).map((s: any) => ({
      ...s,
      score: typeof s.score === "number" ? s.score : (s.aiScore || 0),
    }));
    return {
      submissions: subs,
      total: data.total || subs.length,
      summary: {
        total: data.total || data.summary?.total || subs.length,
        pendingCount: data.pendingCount ?? data.summary?.pendingCount ?? 0,
        gradedCount: data.gradedCount ?? data.summary?.gradedCount ?? 0,
        flaggedCount: data.flaggedCount ?? data.summary?.flaggedCount ?? 0,
        avgScore: data.avgScore ?? data.summary?.avgScore ?? 0,
      },
    };
  } catch {
    return {
      submissions: [],
      total: 0,
      summary: { total: 0, pendingCount: 0, gradedCount: 0, flaggedCount: 0, avgScore: 0 },
    };
  }
}

export async function gradeInstructorChapterSubmission(
  subId: string,
  payload: { action: string; instructor_grade?: number; instructor_feedback?: string }
): Promise<any> {
  const token = (await ensureRoleSession("instructor").catch(() => null)) || getToken();
  const res = await fetch(`${API_BASE}/v1/instructor/chapter-submissions/${subId}/grade`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể lưu điểm chấm bài tập chương");
  }
  return await res.json();
}

export interface NavigationCounts {
  users: number;
  courses: number;
  ai_services: number;
  ai_services_total: number;
  projects: number;
  team_members: number;
  kanban_tasks: number;
  kanban_open_tasks: number;
  schedules: number;
  pending_dual_reviews: number;
  completed_lessons: number;
}

export async function fetchNavigationCountsApi(role?: SessionRole): Promise<NavigationCounts | null> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/navigation/counts`, {}, role);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateUserPreferencesApi(
  payload: { background_theme?: string; color_mode?: string },
  role?: SessionRole
): Promise<{ background_theme: string; color_mode: string; theme_preference: string } | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/auth/preferences`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      role
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface TeamMemberProjectRef {
  id: string;
  code: string;
  name: string;
  status: string;
  course: string;
  dueText: string;
}

export interface TeamMemberTaskRef {
  id: string;
  code: string;
  title: string;
  projectId: string;
  projectName: string;
  column: string;
  priority: string;
  points: number;
  estimateHours: number;
  dueDate: string;
}

export interface TeamMemberRecord {
  id: string;
  name: string;
  email: string;
  code: string;
  userRole: "student" | "instructor" | "admin";
  role: string;
  initials: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  department?: string;
  officeLocation?: string;
  skills?: string[];
  githubUrl?: string;
  websiteUrl?: string;
  phone?: string;
  hue: number;
  status: "in" | "remote" | "off";
  isAdvisor: boolean;
  isLead: boolean;
  projects: TeamMemberProjectRef[];
  taughtCourses?: TaughtCourseRef[];
  learningSummary?: MemberLearningSummary | null;
  openTasks: TeamMemberTaskRef[];
  doneTasksCount: number;
  commitsCount: number;
  totalEstimateHours: number;
  lastActive: string;
}

export interface TeamWorkspaceBundle {
  members: TeamMemberRecord[];
  total: number;
  inLabCount: number;
  scopeRole?: SessionRole;
  scopedProjectsCount?: number;
}

export async function fetchTeamMembersApi(role?: SessionRole): Promise<TeamWorkspaceBundle | null> {
  try {
    const res = await fetchWithAuthRetry(`${API_BASE}/v1/team/members`, {}, role);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateTeamMemberStatusApi(
  memberId: string,
  status: "in" | "remote" | "off",
  role?: SessionRole
): Promise<{ member_id: string; status: "in" | "remote" | "off" }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/team/members/${encodeURIComponent(memberId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    role
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể cập nhật trạng thái thành viên.");
  }
  return await res.json();
}

export async function uploadUserAvatarApi(
  avatarDataUrl: string,
  role?: SessionRole
): Promise<{ avatar_url: string; user_id: string }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/users/me/avatar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_data: avatarDataUrl }),
    },
    role
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể tải ảnh đại diện lên máy chủ.");
  }
  const data = await res.json();
  patchStoredUserCache({ avatar_url: data.avatar_url || avatarDataUrl }, role);
  return data;
}

export async function deleteUserAvatarApi(
  role?: SessionRole
): Promise<{ avatar_url: string; user_id: string }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/users/me/avatar`,
    { method: "DELETE" },
    role
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể gỡ ảnh đại diện.");
  }
  const data = await res.json();
  patchStoredUserCache({ avatar_url: "" }, role);
  return data;
}

export async function updateMyProfileApi(
  payload: UserProfilePatchIn,
  role?: SessionRole
): Promise<UserProfileResponse> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/users/me`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    role
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể cập nhật thông tin cá nhân.");
  }
  const data = (await res.json()) as UserProfileResponse;
  patchStoredUserCache(
    {
      full_name: data.full_name,
      display_name: data.display_name,
      name: data.full_name,
      headline: data.headline ?? "",
      bio: data.bio ?? "",
      department: data.department ?? "",
      office_location: data.office_location ?? "",
      skills: Array.isArray(data.skills) ? data.skills : [],
      github_url: data.github_url ?? "",
      website_url: data.website_url ?? "",
      phone: data.phone ?? "",
    },
    role
  );
  return data;
}

export interface McpToolSchemaProperty {
  type?: string;
  description?: string;
  default?: any;
  enum?: string[];
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema?: {
    type?: string;
    required?: string[];
    properties?: Record<string, McpToolSchemaProperty>;
  };
  access_mode: "read" | "write";
  category: string;
  allowed_roles: string[];
  enforces_h2: boolean;
  permitted: boolean;
}

export interface McpResourceInfo {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPromptInfo {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpDatabaseSnapshot {
  engine: string;
  projects_count: number;
  tasks_count: number;
  commits_count: number;
  defense_sessions_count: number;
  sample_project_id: string;
  sample_h2_task_id: string | null;
  sample_h2_task_code: string | null;
  sample_h2_parent_code: string | null;
  sample_student_id: string;
  sample_defense_session_id: string | null;
}

export interface McpServerInfoResponse {
  server: {
    name: string;
    version: string;
    transport: string[];
    protocol_version: string;
  };
  database: McpDatabaseSnapshot;
  rbac: {
    authenticated: boolean;
    current_role: string;
    actor_name: string;
    write_requires_auth: boolean;
    council_only_tools: string[];
  };
  tools_count: number;
  tools: McpToolInfo[];
  resources_count: number;
  resources: McpResourceInfo[];
  prompts_count: number;
  prompts: McpPromptInfo[];
}

export interface McpJsonRpcResponse {
  jsonrpc: string;
  id?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  latency_ms?: number;
  request_payload?: {
    jsonrpc: "2.0";
    id: number;
    method: string;
    params: Record<string, any>;
  };
}

export interface McpAuditLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_label: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  target_label: string;
  category: string;
  decision: "allow" | "deny" | string;
  reason_code: string;
  created_at: string;
}

export function getMcpBaseUrl(): string {
  return `${API_BASE}/v1/mcp/rpc`;
}

export async function fetchMcpInfoApi(
  role?: SessionRole
): Promise<McpServerInfoResponse> {
  const res = await fetchWithAuthRetry(`${API_BASE}/v1/mcp/info`, {}, role);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể tải thông tin CodeMind MCP Server.");
  }
  return (await res.json()) as McpServerInfoResponse;
}

export async function callMcpRpcApi(
  method: string,
  params: Record<string, any> = {},
  role?: SessionRole
): Promise<McpJsonRpcResponse> {
  const requestPayload = {
    jsonrpc: "2.0" as const,
    id: Date.now(),
    method,
    params,
  };
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const res = await fetchWithAuthRetry(
    `${API_BASE}/v1/mcp/rpc`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    },
    role
  );
  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  const latency_ms = Math.max(1, Math.round(ended - started));

  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body?.error) {
    throw new Error(body?.detail || `HTTP ${res.status} khi gọi MCP JSON-RPC.`);
  }
  return {
    ...(body as McpJsonRpcResponse),
    latency_ms,
    request_payload: requestPayload,
  };
}

export async function fetchMcpLogsApi(
  role?: SessionRole,
  limit: number = 40
): Promise<{ count: number; logs: McpAuditLogEntry[] }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/mcp/logs?limit=${encodeURIComponent(String(limit))}`,
      {},
      role
    );
    if (!res.ok) return { count: 0, logs: [] };
    return (await res.json()) as { count: number; logs: McpAuditLogEntry[] };
  } catch {
    return { count: 0, logs: [] };
  }
}

export async function resetAdminUserPasswordApi(userId: string): Promise<boolean> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken("admin") || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearAdminAiCacheApi(): Promise<boolean> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken("admin") || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/ai-services/clear-cache`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function recordAdminAuditLogApi(payload: {
  action: string;
  target: string;
  type?: string;
}): Promise<boolean> {
  const token = (await ensureRoleSession("admin").catch(() => null)) || getToken("admin") || getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/admin/audit-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// F8-STYLE LESSON Q&A (FACEBOOK COMMENT THREADS) FULLSTACK API
// ═════════════════════════════════════════════════════════════════════════════

export type QnaReactionType =
  | "like"
  | "love"
  | "care"
  | "haha"
  | "wow"
  | "sad"
  | "helpful";

export type QnaReactionCounts = Record<QnaReactionType, number>;

export interface QnaCommentDto {
  id: string;
  subject_id: string;
  lesson_id: string;
  lesson_title: string;
  parent_id: string | null;
  reply_to_name: string | null;
  user_id: string;
  author_name: string;
  author_role: "student" | "instructor" | "admin" | string;
  author_avatar_url?: string | null;
  content: string;
  code_snippet?: string | null;
  video_timestamp?: string | null;
  is_pinned: boolean;
  is_resolved: boolean;
  reaction_counts: Partial<QnaReactionCounts> & {
    like: number;
    love: number;
    helpful: number;
  };
  total_reactions: number;
  my_reaction: QnaReactionType | null;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
  has_instructor_reply?: boolean;
  replies?: QnaCommentDto[];
}

export interface QnaThreadsResponseDto {
  subject_id: string;
  lesson_id: string;
  total_comments: number;
  total_threads: number;
  unanswered_count: number;
  threads: QnaCommentDto[];
}

export async function fetchLessonQnaThreadsApi(
  subjectId: string,
  lessonId?: string,
  filterMode: "all" | "unanswered" | "pinned" = "all",
  roleHint?: SessionRole
): Promise<QnaThreadsResponseDto | null> {
  try {
    const params = new URLSearchParams({
      subject_id: subjectId,
      filter_mode: filterMode,
    });
    if (lessonId) params.set("lesson_id", lessonId);
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/threads?${params.toString()}`,
      {},
      roleHint
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createLessonQnaCommentApi(
  payload: {
    subject_id: string;
    lesson_id: string;
    lesson_title?: string;
    parent_id?: string | null;
    reply_to_name?: string | null;
    content: string;
    code_snippet?: string | null;
    video_timestamp?: string | null;
  },
  roleHint?: SessionRole
): Promise<QnaCommentDto | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      roleHint
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function toggleLessonQnaReactionApi(
  commentId: string,
  reactionType: QnaReactionType,
  roleHint?: SessionRole
): Promise<{
  comment_id: string;
  my_reaction: QnaReactionType | null;
  reaction_counts: Partial<QnaReactionCounts> & {
    like: number;
    love: number;
    helpful: number;
  };
  total_reactions: number;
} | null> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/comments/${encodeURIComponent(commentId)}/react`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reactionType }),
      },
      roleHint
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateLessonQnaCommentApi(
  commentId: string,
  payload: { content: string; code_snippet?: string | null },
  roleHint?: SessionRole
): Promise<boolean> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      roleHint
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteLessonQnaCommentApi(
  commentId: string,
  roleHint?: SessionRole
): Promise<boolean> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
      roleHint
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function togglePinLessonQnaCommentApi(
  commentId: string,
  roleHint?: SessionRole
): Promise<{ ok: boolean; is_pinned?: boolean }> {
  try {
    const res = await fetchWithAuthRetry(
      `${API_BASE}/v1/qna/comments/${encodeURIComponent(commentId)}/pin`,
      { method: "POST" },
      roleHint
    );
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}










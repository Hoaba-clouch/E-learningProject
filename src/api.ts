/**
 * CodeMind Campus API Client
 * Kết nối giao diện React với Backend FastAPI (Layered Architecture).
 * Tự động fallback dữ liệu demo an toàn khi chạy trên môi trường Vercel tĩnh.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "codemind.access_token";

export interface SubmissionResult {
  id: string;
  status: "passed" | "failed";
  passed_count: number;
  total_count: number;
}

export interface AIInteractionResponse {
  id: string;
  assistant_message: string;
  policy_decision: "refuse_answer" | "question";
}

export interface HintResponse {
  level: number;
  hint_text: string;
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

function getToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health/ready`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function demoLogin(role: "student" | "instructor" | "admin" = "student") {
  try {
    const res = await fetch(`${API_BASE}/v1/demo/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_role: role }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, data.access_token);
    }
    return data;
  } catch (err) {
    console.warn("Backend offline, running in standalone client mode.", err);
    return { access_token: "mock-token", role };
  }
}

export async function submitCodeToSandbox(code: string, sessionId: string = "demo-session"): Promise<SubmissionResult> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/sessions/${sessionId}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        exercise_id: "exercise-deque",
        code,
        idempotency_key: `sub-${Date.now()}`,
      }),
    });
    if (!res.ok) throw new Error("Submission failed");
    return await res.json();
  } catch {
    // Fallback sandbox simulation if backend not running
    const passed = code.includes("if not page:") || code.includes("if (!page)") || code.includes("len(page) > 0");
    return {
      id: `mock-${Date.now()}`,
      status: passed ? "passed" : "failed",
      passed_count: passed ? 5 : 4,
      total_count: 5,
    };
  }
}

export async function askSocraticTutor(message: string, sessionId: string = "demo-session"): Promise<AIInteractionResponse> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/v1/sessions/${sessionId}/ai-interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("AI query failed");
    return await res.json();
  } catch {
    const isUnsafe = /đáp án|giải|code|lời giải/i.test(message);
    return {
      id: `ai-${Date.now()}`,
      policy_decision: isUnsafe ? "refuse_answer" : "question",
      assistant_message: isUnsafe
        ? "Mình không đưa lời giải hoàn chỉnh. Hãy nhìn trường hợp chuỗi rỗng và kiểm tra điều kiện trước khi thêm vào danh sách."
        : "Khi đầu vào là chuỗi rỗng, điều gì sẽ xảy ra nếu không kiểm tra trước khi append?",
    };
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
    if (!res.ok) throw new Error("Open hint failed");
    return await res.json();
  } catch {
    const hints: Record<number, string> = {
      1: "Khi page là chuỗi rỗng, dòng nào vẫn thay đổi history?",
      2: "maxlen chỉ giới hạn số phần tử. Điều kiện kiểm tra nên đặt trước history.append(page).",
      3: "Nếu page rỗng, trả lại history hiện tại; chỉ append khi đầu vào hợp lệ.",
    };
    return { level, hint_text: hints[level] || "Hãy kiểm tra kỹ đầu vào rỗng." };
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

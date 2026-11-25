import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  Check,
  Copy,
  Database,
  FileJson,
  Lock,
  Play,
  Plug,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import type { Role, Screen } from "../App";
import MarloSelect from "../components/MarloSelect";
import {
  callMcpRpcApi,
  fetchMcpInfoApi,
  fetchMcpLogsApi,
  getMcpBaseUrl,
  type McpAuditLogEntry,
  type McpJsonRpcResponse,
  type McpPromptInfo,
  type McpResourceInfo,
  type McpServerInfoResponse,
  type McpToolInfo,
} from "../api";
import MarloNumber from "../components/MarloNumber";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloTitle from "../components/MarloTitle";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import "../marlo-engine/marloStyles.css";

interface Props {
  role: Role;
  onNavigate?: (screen: Screen) => void;
}

type HubTab = "overview" | "tools" | "resources" | "prompts_logs";
type ClientConfigKind = "claude" | "cursor" | "antigravity" | "curl";
type ToolFilter = "all" | "read" | "write";
type LogFilter = "all" | "mcp_ok" | "h2_blocked" | "rbac_denied" | "other";

const CLIENT_CONFIG_TABS: Array<{
  id: ClientConfigKind;
  label: string;
  fileHint: string;
}> = [
  {
    id: "claude",
    label: "Claude Desktop",
    fileHint: "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
  },
  {
    id: "cursor",
    label: "Cursor AI",
    fileHint: "Project / Global: .cursor/mcp.json",
  },
  {
    id: "antigravity",
    label: "Antigravity / Windsurf",
    fileHint: "MCP Config: mcp_config.json (stdio transport)",
  },
  {
    id: "curl",
    label: "cURL HTTP-RPC",
    fileHint: "Terminal HTTP JSON-RPC 2.0 (POST /v1/mcp/rpc)",
  },
];

function roleLabelVi(roleValue: string): string {
  const r = roleValue.toLowerCase();
  if (r === "admin" || r === "org_admin") return "Quản trị viên (Admin)";
  if (r === "instructor") return "Giảng viên Hội đồng";
  if (r === "student") return "Học viên";
  return "Khách (Chưa đăng nhập)";
}

function formatIsoTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 19).replace("T", " ");
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function parseJsonSafe(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildDefaultToolArgs(
  tool: McpToolInfo | null,
  dbSnap?: McpServerInfoResponse["database"] | null,
  useRichSamples: boolean = false
): Record<string, string> {
  if (!tool?.inputSchema?.properties) return {};
  const projectId = dbSnap?.sample_project_id || "prj-codemind";
  const h2TaskId = dbSnap?.sample_h2_task_id || "task-5";
  const studentId = dbSnap?.sample_student_id || "usr-sv-02";
  const defenseId = dbSnap?.sample_defense_session_id || "def-01";

  const out: Record<string, string> = {};
  const props = tool.inputSchema.properties;
  for (const [key, schema] of Object.entries(props)) {
    if (schema.default !== undefined && !useRichSamples) {
      out[key] = String(schema.default);
      continue;
    }
    if (key === "project_id") {
      out[key] = projectId;
    } else if (key === "task_id") {
      out[key] = h2TaskId;
    } else if (key === "target_column") {
      out[key] = useRichSamples ? "in-progress" : schema.enum?.[0] || "ready";
    } else if (key === "user_id") {
      out[key] = studentId;
    } else if (key === "session_id") {
      out[key] = defenseId;
    } else if (key === "title") {
      out[key] = useRichSamples ? "[MCP Demo] Kiểm tra Unit Test Module AST" : "";
    } else if (key === "description") {
      out[key] = useRichSamples
        ? "Task tạo trực tiếp từ CodeMind MCP Playground để kiểm chứng luồng JSON-RPC 2.0 -> MySQL."
        : "";
    } else if (key === "verdict") {
      out[key] = "approved";
    } else if (key === "notes") {
      out[key] = useRichSamples
        ? "Sinh viên giải thích rõ Trade-off kiến trúc và xử lý timeout API."
        : "";
    } else if (key === "score_adjustment") {
      out[key] = "0";
    } else if (key === "column_id") {
      out[key] = useRichSamples ? "backlog" : "";
    } else if (key === "priority") {
      out[key] = useRichSamples ? "medium" : "";
    } else if (schema.default !== undefined) {
      out[key] = String(schema.default);
    } else if (schema.enum?.length && useRichSamples) {
      out[key] = schema.enum[0];
    } else {
      out[key] = "";
    }
  }
  return out;
}

function coerceToolArgs(
  tool: McpToolInfo,
  draft: Record<string, string>
): Record<string, any> {
  const props = tool.inputSchema?.properties || {};
  const required = new Set(tool.inputSchema?.required || []);
  const result: Record<string, any> = {};

  for (const [key, schema] of Object.entries(props)) {
    const raw = (draft[key] ?? "").trim();
    if (!raw) {
      if (required.has(key)) {
        result[key] = "";
      }
      continue;
    }
    if (schema.type === "integer") {
      const n = Number.parseInt(raw, 10);
      if (!Number.isNaN(n)) result[key] = n;
    } else if (schema.type === "number") {
      const n = Number.parseFloat(raw);
      if (!Number.isNaN(n)) result[key] = n;
    } else {
      result[key] = raw;
    }
  }
  return result;
}

function buildDefaultPromptArgs(prompt: McpPromptInfo | null): Record<string, string> {
  if (!prompt) return {};
  if (prompt.name === "kanban_sprint_summary") {
    return {
      project_name: "PRJ-CODEMIND · CodeMind AI Learning OS",
      sprint_name: "Sprint 2 (Tuần 5 - 8)",
    };
  }
  if (prompt.name === "ai_code_defense_prep") {
    return {
      student_name: "Nguyễn Văn A",
      topic: "Kiến trúc Docker Sandbox & AST Reviewer",
    };
  }
  const out: Record<string, string> = {};
  for (const arg of prompt.arguments || []) {
    out[arg.name] = "";
  }
  return out;
}

interface ClassifiedRpcOutcome {
  kind: "idle" | "ok" | "h2_blocked" | "rbac_denied" | "auth_required" | "error";
  label: string;
  dotClass: string;
  parsedContent: any;
  displayText: string;
}

function classifyRpcOutcome(resp: McpJsonRpcResponse | null): ClassifiedRpcOutcome {
  if (!resp) {
    return {
      kind: "idle",
      label: "Sẵn sàng thực thi",
      dotClass: "bg-slate-400",
      parsedContent: null,
      displayText: "",
    };
  }

  if (resp.error) {
    if (resp.error.code === -32003 || resp.error.data?.rbac_denied) {
      return {
        kind: "rbac_denied",
        label: "Bị chặn RBAC Guard (-32003)",
        dotClass: "bg-rose-500",
        parsedContent: resp.error,
        displayText: JSON.stringify(resp, null, 2),
      };
    }
    if (resp.error.code === -32001 || resp.error.data?.auth_required) {
      return {
        kind: "auth_required",
        label: "Yêu cầu xác thực (-32001)",
        dotClass: "bg-amber-500",
        parsedContent: resp.error,
        displayText: JSON.stringify(resp, null, 2),
      };
    }
    return {
      kind: "error",
      label: `Lỗi JSON-RPC (${resp.error.code})`,
      dotClass: "bg-rose-500",
      parsedContent: resp.error,
      displayText: JSON.stringify(resp, null, 2),
    };
  }

  const res = resp.result;
  if (res?.content && Array.isArray(res.content)) {
    const rawText = String(res.content[0]?.text ?? "");
    const parsed = parseJsonSafe(rawText);
    if (res.isError) {
      const isH2 = rawText.includes("Ràng buộc H2");
      return {
        kind: isH2 ? "h2_blocked" : "error",
        label: isH2 ? "Bị chặn Ràng buộc H2" : "Lỗi thực thi Tool",
        dotClass: isH2 ? "bg-amber-500" : "bg-rose-500",
        parsedContent: parsed ?? rawText,
        displayText: parsed ? JSON.stringify(parsed, null, 2) : rawText,
      };
    }
    return {
      kind: "ok",
      label: "Thành công (MySQL Live)",
      dotClass: "bg-emerald-500",
      parsedContent: parsed ?? rawText,
      displayText: parsed ? JSON.stringify(parsed, null, 2) : rawText,
    };
  }

  if (res?.contents && Array.isArray(res.contents)) {
    const rawText = String(res.contents[0]?.text ?? "");
    const parsed = parseJsonSafe(rawText);
    return {
      kind: "ok",
      label: "Đọc Resource thành công",
      dotClass: "bg-emerald-500",
      parsedContent: parsed ?? rawText,
      displayText: parsed ? JSON.stringify(parsed, null, 2) : rawText,
    };
  }

  return {
    kind: "ok",
    label: "Thành công",
    dotClass: "bg-emerald-500",
    parsedContent: res,
    displayText: JSON.stringify(resp, null, 2),
  };
}

function renderColoredJsonLines(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const keyMatch = line.match(/^(\s*)("([^"\\]|\\.)+")(\s*:\s*)(.*)$/);
    if (!keyMatch) {
      return (
        <div key={i} className="whitespace-pre-wrap break-words">
          {line}
        </div>
      );
    }
    const [, indent, jsonKey, , colon, rest] = keyMatch;
    let valueNode: React.ReactNode = <span className="text-slate-200">{rest}</span>;
    const trimmed = rest.replace(/,\s*$/, "");
    const trailingComma = rest.endsWith(",") ? "," : "";
    if (trimmed.startsWith('"')) {
      valueNode = (
        <>
          <span className="text-emerald-300">{trimmed}</span>
          {trailingComma}
        </>
      );
    } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      valueNode = (
        <>
          <span className="text-amber-300">{trimmed}</span>
          {trailingComma}
        </>
      );
    } else if (trimmed === "true" || trimmed === "false" || trimmed === "null") {
      valueNode = (
        <>
          <span className="text-indigo-300">{trimmed}</span>
          {trailingComma}
        </>
      );
    }
    return (
      <div key={i} className="whitespace-pre-wrap break-words">
        <span>{indent}</span>
        <span className="text-sky-300">{jsonKey}</span>
        <span className="text-slate-400">{colon}</span>
        {valueNode}
      </div>
    );
  });
}

export default function MCPHubScreen({ role }: Props) {
  const hubRef = useRef<HTMLDivElement>(null);
  const tabStageRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<HubTab>("overview");
  const [info, setInfo] = useState<McpServerInfoResponse | null>(null);
  const [logs, setLogs] = useState<McpAuditLogEntry[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tab 1: Overview & Client Configs
  const [clientTab, setClientTab] = useState<ClientConfigKind>("claude");
  const [pingResult, setPingResult] = useState<{
    initResp: McpJsonRpcResponse;
    pingResp: McpJsonRpcResponse;
  } | null>(null);
  const [runningPing, setRunningPing] = useState(false);

  // Tab 2: Tools Playground
  const [toolSearch, setToolSearch] = useState("");
  const [toolFilter, setToolFilter] = useState<ToolFilter>("all");
  const [selectedToolName, setSelectedToolName] = useState<string>("list_projects");
  const [toolArgsDraft, setToolArgsDraft] = useState<Record<string, string>>({});
  const [runningTool, setRunningTool] = useState(false);
  const [toolRpcResponse, setToolRpcResponse] = useState<McpJsonRpcResponse | null>(null);
  const [toolInspectorView, setToolInspectorView] = useState<"response" | "request">("response");

  // Tab 3: Resources
  const [selectedResourceUri, setSelectedResourceUri] = useState<string>("codemind://system/stats");
  const [resourceProjectId, setResourceProjectId] = useState<string>("prj-codemind");
  const [runningResource, setRunningResource] = useState(false);
  const [resourceRpcResponse, setResourceRpcResponse] = useState<McpJsonRpcResponse | null>(null);
  const [resourceView, setResourceView] = useState<"response" | "request">("response");

  // Tab 4: Prompts & Execution Logs
  const [selectedPromptName, setSelectedPromptName] = useState<string>("kanban_sprint_summary");
  const [promptArgsDraft, setPromptArgsDraft] = useState<Record<string, string>>({
    project_name: "PRJ-CODEMIND · CodeMind AI Learning OS",
    sprint_name: "Sprint 2 (Tuần 5 - 8)",
  });
  const [runningPrompt, setRunningPrompt] = useState(false);
  const [promptRpcResponse, setPromptRpcResponse] = useState<McpJsonRpcResponse | null>(null);
  const [promptView, setPromptView] = useState<"rendered" | "request">("rendered");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [loadingLogs, setLoadingLogs] = useState(false);

  const rpcEndpointUrl = getMcpBaseUrl();

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchMcpLogsApi(role, 40);
      setLogs(data.logs || []);
    } finally {
      setLoadingLogs(false);
    }
  }, [role]);

  const loadHub = useCallback(async () => {
    setLoadingInfo(true);
    setLoadError(null);
    try {
      const [infoData, logsData] = await Promise.all([
        fetchMcpInfoApi(role),
        fetchMcpLogsApi(role, 40),
      ]);
      setInfo(infoData);
      setLogs(logsData.logs || []);
      if (infoData.database?.sample_project_id) {
        setResourceProjectId(infoData.database.sample_project_id);
      }
      if (infoData.tools.length > 0) {
        const chosen =
          infoData.tools.find((t) => t.name === selectedToolName) || infoData.tools[0];
        setSelectedToolName(chosen.name);
        setToolArgsDraft((prev) =>
          Object.keys(prev).length > 0 ? prev : buildDefaultToolArgs(chosen, infoData.database, true)
        );
      }
    } catch (err: any) {
      setLoadError(err?.message || "Không thể kết nối tới CodeMind MCP Server.");
    } finally {
      setLoadingInfo(false);
    }
  }, [role]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  // Marlo entrance choreography: header/tabs cascade once on mount, tab stage staggers cards & rows on every tab switch
  useMarloPageEntrance(
    hubRef,
    (el) => {
      const chrome = el.querySelectorAll(":scope > div > header, :scope > div > nav");
      if (chrome.length > 0) {
        animateMarloCards(chrome, { y: 18, stagger: 0.05, duration: 0.65 });
      }
    },
    [role]
  );

  useMarloPageEntrance(
    tabStageRef,
    (stage) => {
      const cards = stage.querySelectorAll("section, aside");
      if (cards.length > 0) {
        animateMarloCards(cards, { y: 24, stagger: 0.055, duration: 0.72 });
      }
      const rows = stage.querySelectorAll(
        "tbody tr, button.w-full.text-left.rounded-2xl"
      );
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 10, stagger: 0.02, delay: 0.18, duration: 0.48 });
      }
    },
    [activeTab]
  );

  const tools = info?.tools || [];
  const resources = info?.resources || [];
  const prompts = info?.prompts || [];

  const selectedTool = useMemo(
    () => tools.find((t) => t.name === selectedToolName) || tools[0] || null,
    [tools, selectedToolName]
  );

  const filteredTools = useMemo(() => {
    const q = toolSearch.trim().toLowerCase();
    return tools.filter((t) => {
      if (toolFilter !== "all" && t.access_mode !== toolFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tools, toolFilter, toolSearch]);

  const selectedResource: McpResourceInfo | null = useMemo(
    () => resources.find((r) => r.uri === selectedResourceUri) || resources[0] || null,
    [resources, selectedResourceUri]
  );

  const resolvedResourceUri = useMemo(() => {
    if (!selectedResource) return selectedResourceUri;
    if (selectedResource.uri.includes("{project_id}")) {
      return selectedResource.uri.replace(
        "{project_id}",
        (resourceProjectId || "prj-codemind").trim()
      );
    }
    return selectedResource.uri;
  }, [selectedResource, selectedResourceUri, resourceProjectId]);

  const selectedPrompt: McpPromptInfo | null = useMemo(
    () => prompts.find((p) => p.name === selectedPromptName) || prompts[0] || null,
    [prompts, selectedPromptName]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (logFilter === "all") return true;
      if (logFilter === "mcp_ok") return entry.reason_code === "mcp_ok";
      if (logFilter === "h2_blocked") return entry.reason_code === "h2_blocked";
      if (logFilter === "rbac_denied") return entry.reason_code === "rbac_denied";
      return !["mcp_ok", "h2_blocked", "rbac_denied"].includes(entry.reason_code);
    });
  }, [logs, logFilter]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((cur) => (cur === id ? null : cur));
      }, 1800);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
  };

  const clientConfigSnippet = useMemo(() => {
    if (clientTab === "claude" || clientTab === "cursor" || clientTab === "antigravity") {
      return JSON.stringify(
        {
          mcpServers: {
            codemind: {
              command: "python",
              args: ["-m", "app.mcp.server"],
              cwd: "d:/C++/ul/backend",
              env: {
                PYTHONIOENCODING: "utf-8",
              },
            },
          },
        },
        null,
        2
      );
    }
    return [
      `curl -X POST ${rpcEndpointUrl} \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "Authorization: Bearer <ACCESS_TOKEN>" \\`,
      `  -d '{`,
      `    "jsonrpc": "2.0",`,
      `    "id": 1,`,
      `    "method": "tools/call",`,
      `    "params": {`,
      `      "name": "list_projects",`,
      `      "arguments": { "limit": 5 }`,
      `    }`,
      `  }'`,
    ].join("\n");
  }, [clientTab, rpcEndpointUrl]);

  const handleSelectTool = (tool: McpToolInfo) => {
    setSelectedToolName(tool.name);
    setToolArgsDraft(buildDefaultToolArgs(tool, info?.database, true));
    setToolRpcResponse(null);
    setToolInspectorView("response");
  };

  const handleRunPingInitialize = async () => {
    setRunningPing(true);
    try {
      const initResp = await callMcpRpcApi(
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "codemind-mcp-hub", version: "1.0.0" },
        },
        role
      );
      const pingResp = await callMcpRpcApi("ping", {}, role);
      setPingResult({ initResp, pingResp });
    } catch (err: any) {
      setPingResult({
        initResp: {
          jsonrpc: "2.0",
          error: { code: -32603, message: err?.message || "Ping thất bại" },
        },
        pingResp: { jsonrpc: "2.0" },
      });
    } finally {
      setRunningPing(false);
    }
  };

  const handleExecuteTool = async (
    toolOverride?: McpToolInfo,
    argsOverride?: Record<string, any>
  ) => {
    const targetTool = toolOverride || selectedTool;
    if (!targetTool) return;
    setRunningTool(true);
    setToolInspectorView("response");
    try {
      const finalArgs = argsOverride ?? coerceToolArgs(targetTool, toolArgsDraft);
      const resp = await callMcpRpcApi(
        "tools/call",
        { name: targetTool.name, arguments: finalArgs },
        role
      );
      setToolRpcResponse(resp);
      void refreshLogs();
    } catch (err: any) {
      setToolRpcResponse({
        jsonrpc: "2.0",
        error: { code: -32603, message: err?.message || "Lỗi kết nối MCP Server" },
      });
    } finally {
      setRunningTool(false);
    }
  };

  const handleRunH2Demo = async () => {
    const moveTool = tools.find((t) => t.name === "move_kanban_task");
    if (!moveTool) return;
    const h2TaskId = info?.database?.sample_h2_task_id || "task-5";
    const demoDraft = {
      task_id: h2TaskId,
      target_column: "done",
      actor_name: info?.rbac?.actor_name || "MCP Demo Inspector",
    };
    setActiveTab("tools");
    setSelectedToolName(moveTool.name);
    setToolArgsDraft(demoDraft);
    await handleExecuteTool(moveTool, demoDraft);
  };

  const handleRunRbacDemo = async () => {
    const auditTool = tools.find((t) => t.name === "submit_ai_defense_audit");
    if (!auditTool) return;
    const sessionId = info?.database?.sample_defense_session_id || "def-01";
    const demoArgs = {
      session_id: sessionId,
      verdict: "approved",
      auditor_name: info?.rbac?.actor_name || "MCP RBAC Test",
      notes: "Kiểm thử RBAC Guard cho MCP tool Hội đồng bảo vệ",
      score_adjustment: 0,
    };
    setActiveTab("tools");
    setSelectedToolName(auditTool.name);
    setToolArgsDraft({
      session_id: demoArgs.session_id,
      verdict: demoArgs.verdict,
      auditor_name: demoArgs.auditor_name,
      notes: demoArgs.notes,
      score_adjustment: String(demoArgs.score_adjustment),
    });
    await handleExecuteTool(auditTool, demoArgs);
  };

  const handleReadResource = async (uriOverride?: string) => {
    const targetUri = uriOverride || resolvedResourceUri;
    if (!targetUri) return;
    setRunningResource(true);
    setResourceView("response");
    try {
      const resp = await callMcpRpcApi("resources/read", { uri: targetUri }, role);
      setResourceRpcResponse(resp);
      void refreshLogs();
    } catch (err: any) {
      setResourceRpcResponse({
        jsonrpc: "2.0",
        error: { code: -32603, message: err?.message || "Không đọc được MCP Resource" },
      });
    } finally {
      setRunningResource(false);
    }
  };

  const handleGetPrompt = async () => {
    if (!selectedPrompt) return;
    setRunningPrompt(true);
    setPromptView("rendered");
    try {
      const resp = await callMcpRpcApi(
        "prompts/get",
        { name: selectedPrompt.name, arguments: promptArgsDraft },
        role
      );
      setPromptRpcResponse(resp);
      void refreshLogs();
    } catch (err: any) {
      setPromptRpcResponse({
        jsonrpc: "2.0",
        error: { code: -32603, message: err?.message || "Không sinh được prompt" },
      });
    } finally {
      setRunningPrompt(false);
    }
  };

  const toolOutcome = useMemo(() => classifyRpcOutcome(toolRpcResponse), [toolRpcResponse]);
  const resourceOutcome = useMemo(
    () => classifyRpcOutcome(resourceRpcResponse),
    [resourceRpcResponse]
  );
  const promptMessagesText = useMemo(() => {
    const msgs = promptRpcResponse?.result?.messages;
    if (!Array.isArray(msgs) || msgs.length === 0) return "";
    return msgs
      .map((m: any) => `[${String(m.role || "user").toUpperCase()}]\n${m.content?.text || ""}`)
      .join("\n\n");
  }, [promptRpcResponse]);

  const currentRoleNorm = info?.rbac?.current_role || role;
  const isCouncilRole = currentRoleNorm === "instructor" || currentRoleNorm === "admin";

  return (
    <div ref={hubRef} className="marlo-scope min-h-full bg-transparent text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="max-w-[1520px] mx-auto space-y-6">
        {/* HERO HEADER */}
        <header className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Plug size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MarloTitle
                      text="CodeMind MCP Hub"
                      staggerMs={12}
                      className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white"
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          loadError ? "bg-rose-500" : loadingInfo ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      <span>
                        {loadError
                          ? "Ngoại tuyến"
                          : loadingInfo
                          ? "Đang đồng bộ..."
                          : `Online · MCP ${info?.server?.protocol_version || "2024-11-05"}`}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCouncilRole ? "bg-indigo-500" : "bg-sky-500"
                        }`}
                      />
                      <span>
                        RBAC: {roleLabelVi(currentRoleNorm)} (
                        {isCouncilRole ? "Toàn quyền 11 Tools" : "8 Read + 2 Write"})
                      </span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Model Context Protocol Inspector, Trình tạo cấu hình Claude / Cursor / Antigravity &amp; RBAC Guard nối trực tiếp MySQL 8.0.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-200 max-w-full overflow-hidden">
                  <Server size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{rpcEndpointUrl}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("endpoint", rpcEndpointUrl)}
                    className="p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer shrink-0 text-slate-500 dark:text-slate-300"
                    title="Sao chép HTTP-RPC Endpoint"
                  >
                    {copiedId === "endpoint" ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRunPingInitialize()}
                  disabled={runningPing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer disabled:opacity-60"
                >
                  <Activity size={13} className="text-emerald-500" />
                  <span>{runningPing ? "Đang Ping..." : "Initialize + Ping"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void loadHub()}
                  disabled={loadingInfo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={13} className={loadingInfo ? "animate-spin" : ""} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* 4 MONOCHROME KPI TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 w-full xl:w-auto">
              {[
                {
                  label: "Tools",
                  value: info?.tools_count ?? 11,
                  icon: <Wrench size={16} className="text-amber-600 dark:text-amber-400" />,
                  bg: "bg-amber-500/12",
                  dur: 700,
                },
                {
                  label: "Resources",
                  value: info?.resources_count ?? 3,
                  icon: <Database size={16} className="text-sky-600 dark:text-sky-400" />,
                  bg: "bg-sky-500/12",
                  dur: 800,
                },
                {
                  label: "Prompts",
                  value: info?.prompts_count ?? 2,
                  icon: <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />,
                  bg: "bg-indigo-500/12",
                  dur: 850,
                },
                {
                  label: "Lượt gọi",
                  value: logs.length,
                  icon: <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />,
                  bg: "bg-emerald-500/12",
                  dur: 950,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 px-3.5 py-3 text-center min-w-[92px]"
                >
                  <div
                    className={`mx-auto mb-1.5 w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}
                  >
                    {kpi.icon}
                  </div>
                  <div className="text-[15px] font-black text-slate-950 dark:text-white leading-tight tabular-nums">
                    <MarloNumber value={kpi.value} durationMs={kpi.dur} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
                    {kpi.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loadError && (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
        </header>

        {/* 4-TAB NAVIGATION BAR (Marlo Liquid Elastic Pill) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-2xs w-fit max-w-full overflow-x-auto scrollbar-none">
          <MarloSegmentedControl<HubTab>
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            label="Phân khu MCP Hub"
            tone="dark"
            options={[
              {
                id: "overview",
                label: "Tổng quan & Kết nối",
                icon: <Plug size={14} />,
              },
              {
                id: "tools",
                label: `Tools Playground (${info?.tools_count ?? 11})`,
                icon: <Wrench size={14} />,
              },
              {
                id: "resources",
                label: "Resources (codemind://)",
                icon: <Database size={14} />,
              },
              {
                id: "prompts_logs",
                label: "Prompts & Nhật ký gọi",
                icon: <Terminal size={14} />,
              },
            ]}
          />
        </div>

        {/* TAB STAGE WRAPPER FOR CLEAN PER-TAB ENTRANCE STAGGER */}
        <div ref={tabStageRef}>
        {/* TAB 1: OVERVIEW & CLIENT CONNECTION HUB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-5 min-w-0">
              {/* CLIENT CONFIG GENERATOR */}
              <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Terminal size={16} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-slate-950 dark:text-white">
                        Bộ tạo cấu hình Client MCP 1-Click
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dán trực tiếp vào tệp cấu hình AI Client hoặc gọi qua HTTP JSON-RPC 2.0
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(`cfg-${clientTab}`, clientConfigSnippet)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                  >
                    {copiedId === `cfg-${clientTab}` ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>{clientTab === "curl" ? "Copy lệnh cURL" : "Copy JSON"}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="max-w-full overflow-x-auto scrollbar-none">
                  <MarloSegmentedControl<ClientConfigKind>
                    value={clientTab}
                    onChange={(val) => setClientTab(val)}
                    label="Chọn Client MCP"
                    size="sm"
                    tone="dark"
                    options={CLIENT_CONFIG_TABS.map((cfg) => ({
                      id: cfg.id,
                      label: cfg.label,
                    }))}
                  />
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {CLIENT_CONFIG_TABS.find((c) => c.id === clientTab)?.fileHint}
                </div>

                <pre className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-100 p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                  {clientConfigSnippet}
                </pre>
              </section>

              {/* RBAC GUARD POLICY MATRIX */}
              <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-950 dark:text-white">
                        Ma trận Phân quyền RBAC Guard (/v1/mcp/rpc)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Kiểm soát quyền truy cập ở tầng JSON-RPC 2.0 trước khi chạm vào MySQL
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRunRbacDemo()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                  >
                    <ShieldAlert size={13} className="text-rose-500" />
                    <span>Thử RBAC ở Playground</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      title: "8 Read Tools",
                      dot: "bg-emerald-500",
                      roles: "Học viên · Giảng viên · Admin",
                      desc: "list_projects, get_project_detail, list_kanban_tasks, git, schedule, defense_sessions, analytics.",
                      active: true,
                    },
                    {
                      title: "2 Workspace Write Tools",
                      dot: "bg-amber-500",
                      roles: "Học viên · Giảng viên · Admin (Bearer JWT)",
                      desc: "create_kanban_task, move_kanban_task — Bắt buộc xác thực & bảo vệ Ràng buộc H2.",
                      active: currentRoleNorm !== "anonymous",
                    },
                    {
                      title: "1 Council Audit Tool",
                      dot: "bg-rose-500",
                      roles: "Chỉ Giảng viên · Admin",
                      desc: "submit_ai_defense_audit — Chặn Học viên với JSON-RPC -32003 và ghi Audit Log.",
                      active: isCouncilRole,
                    },
                  ].map((tier) => (
                    <div
                      key={tier.title}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/55 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                          <span className={`w-2 h-2 rounded-full ${tier.dot}`} />
                          <span>{tier.title}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tier.active ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>{tier.active ? "Được phép" : "Bị khóa"}</span>
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {tier.roles}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {tier.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: LIVE TRANSPORT & MYSQL SNAPSHOT */}
            <div className="lg:col-span-5 space-y-5 min-w-0">
              <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Database size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-white">
                      Trạng thái Server &amp; MySQL 8.0 Live
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Số liệu thực tế đọc trực tiếp từ cơ sở dữ liệu nền tảng
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    {
                      label: "Server Identifier",
                      val: `${info?.server?.name || "codemind-mcp-server"} v${
                        info?.server?.version || "1.0.0"
                      }`,
                    },
                    {
                      label: "Transports hỗ trợ",
                      val: (info?.server?.transport || ["stdio", "http-rpc"]).join(" · "),
                    },
                    {
                      label: "Database Engine",
                      val: info?.database?.engine || "MySQL 8.0 Live",
                    },
                    {
                      label: "Đồ án / Kanban Tasks",
                      val: `${info?.database?.projects_count ?? 0} đồ án · ${
                        info?.database?.tasks_count ?? 0
                      } tasks`,
                    },
                    {
                      label: "Git Commits / Phiên Bảo vệ",
                      val: `${info?.database?.commits_count ?? 0} commits · ${
                        info?.database?.defense_sessions_count ?? 0
                      } phiên`,
                    },
                    {
                      label: "Mẫu Demo Ràng buộc H2",
                      val: info?.database?.sample_h2_task_code
                        ? `${info.database.sample_h2_task_id} (#${info.database.sample_h2_task_code} phụ thuộc #${info.database.sample_h2_parent_code})`
                        : info?.database?.sample_h2_task_id || "task-5",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {row.label}
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-right truncate">
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRunH2Demo()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#f29b23] hover:bg-[#e58c12] px-3.5 py-2 text-xs font-bold text-[#1c1304] transition cursor-pointer"
                  >
                    <ShieldAlert size={14} />
                    <span>Demo nhanh Ràng buộc H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tools")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                  >
                    <Wrench size={13} />
                    <span>Mở Tools Playground</span>
                  </button>
                </div>
              </section>

              {/* PING & INITIALIZE HANDSHAKE RESULT */}
              <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pingResult
                          ? pingResult.initResp.error
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Kiểm tra Handshake (initialize + ping)
                    </h3>
                  </div>
                  {pingResult && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                      {pingResult.initResp.latency_ms ?? "—"} ms
                    </span>
                  )}
                </div>

                {pingResult ? (
                  <pre className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-100 p-3.5 text-[11.5px] font-mono leading-relaxed overflow-x-auto max-h-[260px]">
                    {renderColoredJsonLines(
                      JSON.stringify(
                        {
                          initialize: pingResult.initResp.result || pingResult.initResp.error,
                          ping: {
                            status: pingResult.pingResp.error ? "error" : "pong",
                            latency_ms: pingResult.pingResp.latency_ms,
                          },
                        },
                        null,
                        2
                      )
                    )}
                  </pre>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 p-4 text-xs text-slate-500 dark:text-slate-400">
                    Bấm nút <strong>Initialize + Ping</strong> ở phía trên để kiểm tra trực tiếp JSON-RPC 2.0 handshake với MCP Server.
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE TOOLS PLAYGROUND */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT: TOOL CATALOG */}
            <aside className="lg:col-span-4 rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Tìm kiếm 11 MCP tools..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                />
              </div>

              <div className="max-w-full overflow-x-auto scrollbar-none">
                <MarloSegmentedControl<ToolFilter>
                  value={toolFilter}
                  onChange={(val) => setToolFilter(val)}
                  label="Lọc MCP tools"
                  size="sm"
                  tone="dark"
                  options={[
                    { id: "all", label: `Tất cả (${tools.length})` },
                    {
                      id: "read",
                      label: `Read (${tools.filter((t) => t.access_mode === "read").length})`,
                      dotClassName: "bg-emerald-500",
                    },
                    {
                      id: "write",
                      label: `Write (${tools.filter((t) => t.access_mode === "write").length})`,
                      dotClassName: "bg-amber-500",
                    },
                  ]}
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTools.map((tool) => {
                  const active = selectedTool?.name === tool.name;
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => handleSelectTool(tool)}
                      className={`w-full text-left rounded-2xl border p-3 transition cursor-pointer space-y-1.5 ${
                        active
                          ? "border-slate-900 dark:border-slate-300 bg-slate-100/90 dark:bg-slate-800"
                          : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/45 hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tool.name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tool.access_mode === "read" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>{tool.access_mode.toUpperCase()}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                      {(tool.enforces_h2 || !tool.permitted) && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {tool.enforces_h2 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>H2 Guard</span>
                            </span>
                          )}
                          {!tool.permitted && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>GV / Admin</span>
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* RIGHT: SCHEMA FORM & LIVE INSPECTOR */}
            <div className="lg:col-span-8 space-y-5 min-w-0">
              {selectedTool && (
                <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black font-mono text-slate-950 dark:text-white">
                          {selectedTool.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedTool.access_mode === "read"
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <span>{selectedTool.access_mode.toUpperCase()}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedTool.permitted ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {selectedTool.allowed_roles.join(", ")}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {selectedTool.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setToolArgsDraft(
                            buildDefaultToolArgs(selectedTool, info?.database, true)
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                      >
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Điền mẫu thật</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRunH2Demo()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Demo Ràng buộc H2</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRunRbacDemo()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>Test chặn RBAC</span>
                      </button>
                    </div>
                  </div>

                  {/* AUTO-GENERATED INPUT SCHEMA FORM */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleExecuteTool();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {Object.entries(selectedTool.inputSchema?.properties || {}).map(
                        ([key, prop]) => {
                          const isReq = (selectedTool.inputSchema?.required || []).includes(key);
                          return (
                            <div key={key} className="space-y-1">
                              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span className="font-mono">
                                  {key}
                                  {isReq && <span className="text-rose-500 ml-1">*</span>}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {prop.type || "string"}
                                </span>
                              </label>

                              {prop.enum && prop.enum.length > 0 ? (
                                <MarloSelect
                                  value={toolArgsDraft[key] ?? ""}
                                  onChange={(e) =>
                                    setToolArgsDraft((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                                >
                                  <option value="">-- Chọn giá trị --</option>
                                  {prop.enum.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </MarloSelect>
                              ) : (
                                <input
                                  type={
                                    prop.type === "integer" || prop.type === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  step={prop.type === "number" ? "0.5" : undefined}
                                  value={toolArgsDraft[key] ?? ""}
                                  onChange={(e) =>
                                    setToolArgsDraft((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  placeholder={prop.description || key}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                                />
                              )}

                              {prop.description && (
                                <p className="text-[10.5px] text-slate-400 leading-snug">
                                  {prop.description}
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        method: &quot;tools/call&quot; · name: &quot;{selectedTool.name}&quot;
                      </span>
                      <button
                        type="submit"
                        disabled={runningTool}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#f29b23] hover:bg-[#e58c12] px-4 py-2.5 text-xs font-bold text-[#1c1304] shadow-xs transition cursor-pointer disabled:opacity-60"
                      >
                        <Play size={14} className="fill-current" />
                        <span>
                          {runningTool ? "Đang gọi MCP..." : "Chạy Tool (JSON-RPC 2.0)"}
                        </span>
                      </button>
                    </div>
                  </form>

                  {/* LIVE INSPECTOR RESULT */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className={`w-2 h-2 rounded-full ${toolOutcome.dotClass}`} />
                          <span>{toolOutcome.label}</span>
                        </span>
                        {toolRpcResponse?.latency_ms !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                            {toolRpcResponse.latency_ms} ms
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MarloSegmentedControl<"response" | "request">
                          value={toolInspectorView}
                          onChange={(val) => setToolInspectorView(val)}
                          size="sm"
                          tone="dark"
                          options={[
                            { id: "response", label: "Response (MySQL Live)" },
                            { id: "request", label: "Request (JSON-RPC 2.0)" },
                          ]}
                        />
                        {toolRpcResponse && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                "tool-json",
                                toolInspectorView === "request"
                                  ? JSON.stringify(toolRpcResponse.request_payload, null, 2)
                                  : toolOutcome.displayText
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            {copiedId === "tool-json" ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {toolRpcResponse ? (
                      <pre className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-h-[420px]">
                        {toolInspectorView === "request"
                          ? renderColoredJsonLines(
                              JSON.stringify(toolRpcResponse.request_payload || {}, null, 2)
                            )
                          : renderColoredJsonLines(toolOutcome.displayText) ||
                            toolOutcome.displayText}
                      </pre>
                    ) : (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                        Bấm <strong>Chạy Tool (JSON-RPC 2.0)</strong> hoặc chọn nhanh{" "}
                        <strong>Demo Ràng buộc H2</strong> / <strong>Test chặn RBAC</strong> để xem phản hồi trực tiếp từ MySQL.
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MCP RESOURCES */}
        {activeTab === "resources" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <aside className="lg:col-span-4 rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 sm:p-5 shadow-xs space-y-2.5 min-w-0">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-7 h-7 rounded-lg bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Database size={15} />
                </div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  3 MCP Resources (codemind://)
                </h2>
              </div>

              {resources.map((resItem) => {
                const active = selectedResource?.uri === resItem.uri;
                return (
                  <button
                    key={resItem.uri}
                    type="button"
                    onClick={() => {
                      setSelectedResourceUri(resItem.uri);
                      setResourceRpcResponse(null);
                    }}
                    className={`w-full text-left rounded-2xl border p-3.5 transition cursor-pointer space-y-1.5 ${
                      active
                        ? "border-slate-900 dark:border-slate-300 bg-slate-100/90 dark:bg-slate-800"
                        : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/45 hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                        {resItem.uri}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <span>JSON</span>
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {resItem.name}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {resItem.description}
                    </p>
                  </button>
                );
              })}
            </aside>

            <div className="lg:col-span-8 min-w-0">
              <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-black text-slate-950 dark:text-white">
                      {selectedResource?.name || "Ngữ cảnh MCP Resource"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedResource?.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReadResource()}
                    disabled={runningResource}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#f29b23] hover:bg-[#e58c12] px-4 py-2 text-xs font-bold text-[#1c1304] transition cursor-pointer shrink-0 disabled:opacity-60"
                  >
                    <Play size={14} className="fill-current" />
                    <span>
                      {runningResource ? "Đang đọc..." : "Đọc Resource (resources/read)"}
                    </span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                    <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {resolvedResourceUri}
                    </div>
                    {selectedResource?.uri.includes("{project_id}") && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                          project_id:
                        </label>
                        <input
                          type="text"
                          value={resourceProjectId}
                          onChange={(e) => setResourceProjectId(e.target.value)}
                          placeholder="prj-codemind"
                          className="w-40 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                        />
                      </div>
                    )}
                  </div>

                  {selectedResource?.uri.includes("{project_id}") && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Mẫu nhanh:</span>
                      {["prj-codemind", "PRJ-CPP-AST", "prj-compiler", "PRJ-DEVNET"].map((pid) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => setResourceProjectId(pid)}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold transition cursor-pointer ${
                            resourceProjectId === pid
                              ? "border-slate-900 dark:border-slate-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {pid}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <span className={`w-2 h-2 rounded-full ${resourceOutcome.dotClass}`} />
                      <span>{resourceOutcome.label}</span>
                    </span>
                    {resourceRpcResponse?.latency_ms !== undefined && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                        {resourceRpcResponse.latency_ms} ms
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MarloSegmentedControl<"response" | "request">
                      value={resourceView}
                      onChange={(val) => setResourceView(val)}
                      size="sm"
                      tone="dark"
                      options={[
                        { id: "response", label: "Snapshot JSON" },
                        { id: "request", label: "Request (JSON-RPC)" },
                      ]}
                    />
                    {resourceRpcResponse && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(
                            "resource-json",
                            resourceView === "request"
                              ? JSON.stringify(resourceRpcResponse.request_payload, null, 2)
                              : resourceOutcome.displayText
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        {copiedId === "resource-json" ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                        <span>Copy JSON</span>
                      </button>
                    )}
                  </div>
                </div>

                {resourceRpcResponse ? (
                  <pre className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-h-[460px]">
                    {resourceView === "request"
                      ? renderColoredJsonLines(
                          JSON.stringify(resourceRpcResponse.request_payload || {}, null, 2)
                        )
                      : renderColoredJsonLines(resourceOutcome.displayText) ||
                        resourceOutcome.displayText}
                  </pre>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                    Bấm <strong>Đọc Resource (resources/read)</strong> để nạp snapshot thời gian thực từ MySQL cho URI{" "}
                    <code className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {resolvedResourceUri}
                    </code>
                    .
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* TAB 4: PROMPTS & EXECUTION AUDIT LOG */}
        {activeTab === "prompts_logs" && (
          <div className="space-y-6">
            {/* TOP: PROMPT COMPOSER */}
            <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-white">
                      MCP Prompt Templates (prompts/get)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sinh nhanh kịch bản tổng hợp Sprint &amp; Hội đồng Phản biện AI chuẩn công nghiệp
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {prompts.map((p) => {
                    const active = selectedPrompt?.name === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setSelectedPromptName(p.name);
                          setPromptArgsDraft(buildDefaultPromptArgs(p));
                          setPromptRpcResponse(null);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-mono font-bold transition cursor-pointer ${
                          active
                            ? "border-slate-900 dark:border-slate-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedPrompt && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleGetPrompt();
                    }}
                    className="lg:col-span-5 space-y-3 min-w-0"
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedPrompt.description}
                    </p>

                    {(selectedPrompt.arguments || []).map((arg) => (
                      <div key={arg.name} className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono block">
                          {arg.name}
                          {arg.required && <span className="text-rose-500 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={promptArgsDraft[arg.name] ?? ""}
                          onChange={(e) =>
                            setPromptArgsDraft((prev) => ({
                              ...prev,
                              [arg.name]: e.target.value,
                            }))
                          }
                          placeholder={arg.description || arg.name}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f29b23]/35"
                        />
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={runningPrompt}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#f29b23] hover:bg-[#e58c12] px-4 py-2 text-xs font-bold text-[#1c1304] transition cursor-pointer disabled:opacity-60"
                      >
                        <Sparkles size={13} />
                        <span>
                          {runningPrompt ? "Đang tạo..." : "Sinh Prompt (prompts/get)"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPromptArgsDraft(buildDefaultPromptArgs(selectedPrompt))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                      >
                        <span>Điền mẫu nhanh</span>
                      </button>
                    </div>
                  </form>

                  <div className="lg:col-span-7 space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <MarloSegmentedControl<"rendered" | "request">
                        value={promptView}
                        onChange={(val) => setPromptView(val)}
                        size="sm"
                        tone="dark"
                        options={[
                          { id: "rendered", label: "Prompt hoàn chỉnh" },
                          { id: "request", label: "JSON-RPC Payload" },
                        ]}
                      />
                      {promptMessagesText && (
                        <button
                          type="button"
                          onClick={() => void handleCopy("prompt-text", promptMessagesText)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          {copiedId === "prompt-text" ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>Copy Prompt</span>
                        </button>
                      )}
                    </div>

                    {promptRpcResponse ? (
                      <pre className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[280px]">
                        {promptView === "request"
                          ? renderColoredJsonLines(
                              JSON.stringify(promptRpcResponse.request_payload || {}, null, 2)
                            )
                          : promptMessagesText || JSON.stringify(promptRpcResponse, null, 2)}
                      </pre>
                    ) : (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 p-5 text-xs text-slate-500 dark:text-slate-400">
                        Bấm <strong>Sinh Prompt (prompts/get)</strong> để server điền ngữ cảnh thực và tạo prompt hoàn chỉnh sẵn sàng dán cho AI Agent.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* BOTTOM: PERSISTED MCP EXECUTION & RBAC GUARD LOGS */}
            <section className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileJson size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-white">
                      Nhật ký thực thi MCP &amp; RBAC Guard (MySQL audit_events)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lưu bền vững mọi lượt gọi Tools / Resources / Prompts và các lần chặn H2 / RBAC
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <MarloSegmentedControl<LogFilter>
                    value={logFilter}
                    onChange={(val) => setLogFilter(val)}
                    label="Lọc nhật ký MCP"
                    size="sm"
                    tone="dark"
                    options={[
                      { id: "all", label: `Tất cả (${logs.length})` },
                      { id: "mcp_ok", label: "Thành công", dotClassName: "bg-emerald-500" },
                      { id: "h2_blocked", label: "Bị chặn H2", dotClassName: "bg-amber-500" },
                      { id: "rbac_denied", label: "Chặn RBAC", dotClassName: "bg-rose-500" },
                    ]}
                  />

                  <button
                    type="button"
                    onClick={() => void refreshLogs()}
                    disabled={loadingLogs}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <RefreshCw size={12} className={loadingLogs ? "animate-spin" : ""} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chưa có lượt thực thi MCP nào khớp bộ lọc. Hãy chạy thử một Tool, Resource hoặc Prompt ở trên.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/70 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                        <th className="py-2.5 px-2.5 whitespace-nowrap">Thời gian</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">Tác nhân</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">Action / Tool</th>
                        <th className="py-2.5 px-2.5">Chi tiết &amp; Độ trễ</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLogs.map((entry) => {
                        const rc = entry.reason_code;
                        const statusMeta =
                          rc === "mcp_ok"
                            ? { label: "Thành công", dot: "bg-emerald-500" }
                            : rc === "h2_blocked"
                            ? { label: "Chặn H2", dot: "bg-amber-500" }
                            : rc === "rbac_denied"
                            ? { label: "Chặn RBAC", dot: "bg-rose-500" }
                            : rc === "auth_required"
                            ? { label: "Thiếu Token", dot: "bg-amber-500" }
                            : { label: "Từ chối / Lỗi", dot: "bg-rose-500" };
                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatIsoTime(entry.created_at)}
                            </td>
                            <td
                              className="py-2.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate"
                              title={entry.actor_label || ""}
                            >
                              {entry.actor_label || "—"}
                            </td>
                            <td
                              className="py-2.5 px-2.5 font-mono font-bold text-slate-900 dark:text-white max-w-[170px] truncate"
                              title={entry.action}
                            >
                              {entry.action}
                            </td>
                            <td
                              className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] max-w-[165px] xl:max-w-[260px] truncate"
                              title={entry.target_label || ""}
                            >
                              {entry.target_label}
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                <span>{statusMeta.label}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

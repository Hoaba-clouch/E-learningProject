import React, { useState, useEffect, useRef } from "react";
import { Send, X, Sparkles, RotateCcw, Bot, User } from "lucide-react";
import {
  askSocraticTutor,
  type SocraticChatTurn,
  type SocraticWorkspaceContext,
} from "../api";
import "../marlo-engine/marloStyles.css";

export interface MarloMentor {
  id?: string;
  name: string;
  emoji: string;
  color: string;
  desc?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mentor: MarloMentor;
  activeTopic?: string;
  subjectId?: string;
  subjectName?: string;
  currentUserName?: string;
  userAvatar?: string;
  workspaceContext?: SocraticWorkspaceContext;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
}

interface MessageItem {
  id: string;
  from: "user" | "mentor";
  text: string;
  time: string;
}

export default function MarloAiChatDrawer({
  isOpen,
  onClose,
  mentor,
  activeTopic = "Kiến trúc hệ thống & Lập trình C++",
  subjectId = "cs201",
  subjectName = "Lập trình Hướng đối tượng",
  currentUserName = "Minh Anh",
  workspaceContext,
  initialPrompt,
  onInitialPromptConsumed,
}: Props) {
  const [chatInput, setChatInput] = useState<string>("");
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);
  const [hintStep, setHintStep] = useState<number>(1);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "m0",
      from: "mentor",
      text: "Chào bạn! Mình là trợ lý AI Socratic. Mình luôn theo dõi đúng bài học, quiz hoặc bài tập bạn đang mở — hỏi bất kỳ vướng mắc nào để mình gợi ý đúng trọng tâm nhé!",
      time: "Vừa xong",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const viewMode = String(workspaceContext?.view_mode || "lecture").toLowerCase();
  const contextLocationLabel = workspaceContext
    ? viewMode === "exercise"
      ? `Bài tập Chương ${workspaceContext.chapter_number || ""}: ${workspaceContext.exercise_title || activeTopic}`
      : viewMode === "quiz"
      ? `Quiz Câu ${workspaceContext.quiz_index || 1}/${workspaceContext.quiz_total || "?"} · ${workspaceContext.lesson_title || activeTopic}`
      : viewMode === "mindmap"
      ? `Sơ đồ tư duy Chương ${workspaceContext.chapter_number || ""}`
      : viewMode === "video"
      ? `Video ${workspaceContext.lesson_code || ""} · ${workspaceContext.lesson_title || activeTopic}`
      : viewMode === "catalog"
      ? "Danh mục khóa học"
      : `Lý thuyết ${workspaceContext.lesson_code || ""} · ${workspaceContext.lesson_title || activeTopic}`
    : `Chủ đề: ${activeTopic}`;

  const contextKey = workspaceContext
    ? `${viewMode}:${workspaceContext.subject_id || subjectId}:${workspaceContext.chapter_number || ""}:${workspaceContext.lesson_code || ""}:${workspaceContext.exercise_id || ""}:${workspaceContext.quiz_index || ""}`
    : `${subjectId}:${activeTopic}`;

  useEffect(() => {
    setHintStep(1);
  }, [contextKey]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAskingAi, isOpen]);

  // Focus vào ô nhập khi mở drawer
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendUserMessage = async (rawText: string, explicitHintLevel?: number) => {
    const userText = rawText.trim();
    if (!userText || isAskingAi) return;
    const userTime = getCurrentTime();

    const lower = userText.toLowerCase();
    const isHintIntent =
      explicitHintLevel !== undefined ||
      /(gợi ý|hướng dẫn|bước tiếp|bắt đầu|làm sao|bí quá|bí rồi|chưa hiểu cách làm)/i.test(lower);
    const usedHintLevel = explicitHintLevel ?? (isHintIntent ? hintStep : undefined);
    if (isHintIntent) {
      setHintStep((prev) => Math.min(3, (usedHintLevel || prev) + 1));
    }

    const historyTurns: SocraticChatTurn[] = messages
      .filter((m) => m.id !== "m0" && !m.id.startsWith("reset-"))
      .slice(-8)
      .map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        text: m.text,
      }));

    setChatInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        from: "user",
        text: userText,
        time: userTime,
      },
    ]);
    setIsAskingAi(true);

    try {
      const response = await askSocraticTutor({
        subjectId: workspaceContext?.subject_id || subjectId,
        question: userText,
        currentTopic: workspaceContext?.lesson_title || activeTopic,
        workspaceContext,
        history: historyTurns,
        hintLevel: usedHintLevel,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text:
            response.answer ||
            "Mình đã nắm ngữ cảnh hiện tại. Bạn muốn hỏi rõ bước nào tiếp theo?",
          time: getCurrentTime(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text: `Đang ở ${contextLocationLabel}. Bạn cho biết cụ thể đoạn hoặc yêu cầu nào bạn đang vướng để mình gợi ý tiếp nhé!`,
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt.trim()) {
      const text = initialPrompt.trim();
      onInitialPromptConsumed?.();
      void sendUserMessage(text, 1);
    }
  }, [isOpen, initialPrompt]);

  const handleSendMessage = async () => {
    await sendUserMessage(chatInput);
  };

  const handleResetChat = () => {
    setHintStep(1);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        from: "mentor",
        text: `Đã làm mới phiên thảo luận Socratic tại: ${contextLocationLabel}. Đặt câu hỏi bất kỳ để mình gợi ý ngay nhé!`,
        time: getCurrentTime(),
      },
    ]);
  };

  const quickPrompts =
    viewMode === "exercise"
      ? [
          "Gợi ý bước đầu bài tập",
          "Giải thích yêu cầu đề bài",
          "Gợi ý thêm (Nấc sâu hơn)",
          "Lưu ý Edge Cases",
        ]
      : viewMode === "quiz"
      ? [
          "Gợi ý cách suy luận câu này",
          "Giải thích thuật ngữ trong câu hỏi",
        ]
      : [
          "Tóm tắt ý cốt lõi bài này",
          "Cho ví dụ thực tế",
          "Sai lầm cần tránh",
        ];

  if (!isOpen) return null;

  return (
    <div className="marlo-scope">
      <aside
        className="fixed bottom-4 right-4 z-50 w-[350px] sm:w-[410px] h-[550px] max-h-[84vh] rounded-[26px] bg-[var(--card)] border border-[var(--line-2)] shadow-[0_20px_50px_rgba(0,0,0,0.32)] flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 select-none font-sans"
        aria-label="AI Socratic Mentor Chat"
      >
        {/* ─── 1. HEADER (Chuẩn Marlo thread__head) ─── */}
        <header className="px-4 py-3 border-b border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar Mentor */}
            <div
              className={`w-9 h-9 rounded-[12px] ${mentor.color || "bg-slate-900"} text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
            >
              <span>{mentor.emoji || "🦉"}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[13.5px] text-[var(--ink)] truncate tracking-tight">
                  {mentor.name}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 leading-none">
                  <Sparkles size={10} className="text-amber-500" />
                  Socratic AI
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted)] font-medium truncate flex items-center gap-1.5 mt-0.5" title={contextLocationLabel}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{contextLocationLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Nút Reset phiên chat */}
            <button
              type="button"
              onClick={handleResetChat}
              className="w-8 h-8 rounded-full border border-[var(--line-2)] hover:bg-[var(--card-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
              title="Làm mới hội thoại"
            >
              <RotateCcw size={13} strokeWidth={2.2} />
            </button>
            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[var(--line-2)] hover:bg-[var(--card-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
              title="Đóng cửa sổ chat"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {/* ─── 2. THREAD MESSAGES (Chuẩn Marlo .thread__msgs & .msg) ─── */}
        <div className="thread__msgs flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => {
            const isMine = m.from === "user";
            return (
              <div className={`msg${isMine ? " is-mine" : ""}`} key={m.id}>
                {/* Avatar bên cạnh bong bóng */}
                {isMine ? (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-[10.5px] font-black flex items-center justify-center shrink-0 shadow-xs mb-0.5">
                    {currentUserName ? currentUserName.slice(0, 2).toUpperCase() : <User size={12} />}
                  </div>
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full ${mentor.color || "bg-slate-800"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
                  >
                    <span>{mentor.emoji || <Bot size={12} />}</span>
                  </div>
                )}

                {/* Bong bóng chat với góc bo chuẩn Marlo */}
                <div className="msg__bubble max-w-[82%]">
                  <span className="msg__who">
                    {isMine ? `Bạn (${currentUserName})` : mentor.name} · {m.time}
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed text-[12.8px]">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Hiệu ứng AI đang suy nghĩ / typing */}
          {isAskingAi && (
            <div className="msg">
              <div
                className={`w-7 h-7 rounded-full ${mentor.color || "bg-slate-800"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
              >
                <span>{mentor.emoji || "🦉"}</span>
              </div>
              <div className="msg__bubble">
                <span className="msg__who">{mentor.name} · Đang phân tích ngữ cảnh hiện tại...</span>
                <div className="flex items-center gap-1.5 py-1 text-[var(--muted)]">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── QUICK CONTEXT CHIPS ─── */}
        <div className="px-3 pt-2 pb-1 border-t border-[var(--line)] bg-[var(--card)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={isAskingAi}
              onClick={() =>
                void sendUserMessage(
                  qp,
                  qp.includes("Nấc sâu hơn")
                    ? Math.min(3, Math.max(2, hintStep))
                    : qp.includes("Gợi ý")
                    ? hintStep
                    : undefined
                )
              }
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* ─── 3. REPLY INPUT BAR (Chuẩn Marlo .thread__reply) ─── */}
        <div className="thread__reply bg-[var(--card)] px-3 pb-3 pt-1.5 flex items-end gap-2 shrink-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isAskingAi) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder={
              viewMode === "exercise"
                ? "Hỏi gợi ý bài tập hoặc lỗi đang gặp (Enter để gửi)..."
                : viewMode === "quiz"
                ? "Hỏi cách suy luận câu quiz này (Enter để gửi)..."
                : "Hỏi trực tiếp điều bạn đang thắc mắc (Enter để gửi)..."
            }
            className="textarea flex-1 rounded-[16px] bg-[var(--card-2)] border border-[var(--line)] px-3.5 py-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-slate-400 dark:focus:border-slate-500 transition resize-none max-h-24 leading-normal"
          />
          <button
            type="button"
            disabled={!chatInput.trim() || isAskingAi}
            onClick={() => void handleSendMessage()}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition cursor-pointer shrink-0"
            title="Gửi câu hỏi (Enter)"
            aria-label="Gửi câu hỏi"
          >
            <Send size={15} className="translate-x-[1px]" />
          </button>
        </div>
      </aside>
    </div>
  );
}

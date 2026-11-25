import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Send, X, Sparkles, RotateCcw, Bot, User, Copy, Check } from "lucide-react";
import {
  askSocraticTutor,
  type SocraticChatTurn,
  type SocraticWorkspaceContext,
} from "../api";
import AiRichMessage from "./AiRichMessage";
import { useMarloAiDrawerMotion } from "../utils/marloAnimations";
import "../marlo-engine/marloStyles.css";
import type { LearningActionTarget, LearningPlan } from "../types/learningPlan";
export type { LearningActionTarget } from "../types/learningPlan";

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
  onLearningAction?: (target: LearningActionTarget) => void;
}

interface MessageItem {
  id: string;
  from: "user" | "mentor";
  text: string;
  time: string;
  learningPlan?: LearningPlan;
  contextKey?: string;
}

const INITIAL_SOCRATIC_MESSAGE =
  "**Chào bạn! Mình là Mino — Trợ lý AI Socratic.**\n" +
  "Mình luôn đồng bộ ngữ cảnh trực tiếp theo bài học bạn đang mở:\n" +
  "- **Lý thuyết & Video**: tóm tắt ý cốt lõi, giải thích khái niệm và ví dụ thực tế.\n" +
  "- **Quiz & Bài tập**: gợi ý từng bước tư duy (`Nấc 1 -> 3`) và các `Edge Cases` cần lưu ý.\n" +
  "> Đặt câu hỏi bất kỳ hoặc chọn gợi ý nhanh bên dưới để mình dẫn dắt đúng trọng tâm nhé!";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
}

export default function MarloAiChatDrawer({
  isOpen,
  onClose,
  mentor,
  activeTopic = "Kiến trúc hệ thống & Lập trình C++",
  subjectId = "cs201",
  currentUserName = "Minh Anh",
  workspaceContext,
  initialPrompt,
  onInitialPromptConsumed,
  onLearningAction,
}: Props) {
  const [chatInput, setChatInput] = useState<string>("");
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);
  const [hintStep, setHintStep] = useState<number>(1);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "m0",
      from: "mentor",
      text: INITIAL_SOCRATIC_MESSAGE,
      time: "Vừa xong",
    },
  ]);

  const drawerRef = useRef<HTMLElement>(null);
  const msgsContainerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(messages.length);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    ? `${viewMode}:${workspaceContext.subject_id || subjectId}:${workspaceContext.chapter_number || ""}:${workspaceContext.lesson_id || workspaceContext.lesson_code || ""}:${workspaceContext.exercise_id || ""}:${workspaceContext.quiz_attempt_id || ""}:${workspaceContext.quiz_index || ""}`
    : `${subjectId}:${activeTopic}`;
  const activeContextRef = useRef(contextKey);
  activeContextRef.current = contextKey;

  useEffect(() => {
    setHintStep(1);
  }, [contextKey]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const triggerShake = (el: HTMLElement | null) => {
    if (!el || prefersReducedMotion()) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { x: 0 },
      {
        keyframes: { x: [0, -8, 7, -5, 3, 0] },
        duration: 0.42,
        ease: "power2.out",
        clearProps: "transform",
      }
    );
  };

  const triggerSpringPop = (el: HTMLElement | null) => {
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { scale: 0.88 },
      { scale: 1, duration: 0.45, ease: "back.out(2.4)", overwrite: "auto", clearProps: "transform" }
    );
  };

  const { shouldRender, isClosing, handleAnimatedClose } = useMarloAiDrawerMotion({
    isOpen,
    onClose,
    drawerRef,
    chipsRef,
  });

  // Hiệu ứng xuất hiện tin nhắn mới (back.out(1.6)) hoặc stagger toàn luồng khi mở/reset (inbox.jsx)
  useLayoutEffect(() => {
    if (!isOpen || !shouldRender || !msgsContainerRef.current) {
      prevMsgCountRef.current = messages.length;
      return;
    }
    const msgEls = Array.from(msgsContainerRef.current.querySelectorAll<HTMLElement>(".msg"));

    if (!prefersReducedMotion() && msgEls.length > 0) {
      if (messages.length > prevMsgCountRef.current) {
        const lastEl = msgEls[msgEls.length - 1];
        const isLastMine = lastEl.classList.contains("is-mine");
        gsap.fromTo(
          lastEl,
          { opacity: 0, y: 20, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.6)",
            transformOrigin: isLastMine ? "100% 100%" : "0% 100%",
            clearProps: "transform,opacity",
          }
        );
      } else {
        gsap.fromTo(
          msgEls,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.06,
            delay: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity",
          }
        );
      }
    }

    prevMsgCountRef.current = messages.length;
    msgsContainerRef.current.scrollTop = msgsContainerRef.current.scrollHeight;
  }, [isOpen, shouldRender, messages.length]);

  useEffect(() => {
    if (isOpen && isAskingAi) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAskingAi, isOpen]);

  // Focus vào ô nhập khi mở drawer
  useEffect(() => {
    if (isOpen && shouldRender) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 160);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const sendUserMessage = async (rawText: string, explicitHintLevel?: number) => {
    const userText = rawText.trim();
    if (!userText) {
      triggerShake(replyFormRef.current);
      textareaRef.current?.focus();
      return;
    }
    if (isAskingAi) return;
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
      .filter((m) => m.contextKey === contextKey && m.id !== "m0" && !m.id.startsWith("reset-"))
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
        contextKey,
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

      if (activeContextRef.current !== contextKey) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text:
            response.answer ||
            "Mình đã nắm ngữ cảnh hiện tại.\n> Bạn muốn hỏi rõ bước nào tiếp theo?",
          time: getCurrentTime(),
          learningPlan: response.learning_plan,
          contextKey,
        },
      ]);
    } catch {
      if (activeContextRef.current !== contextKey) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text:
            `Đang ở **${contextLocationLabel}**.\n` +
            "> Bạn cho biết cụ thể đoạn hoặc yêu cầu nào bạn đang vướng để mình gợi ý tiếp nhé!",
          time: getCurrentTime(),
          contextKey,
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
    if (!chatInput.trim()) {
      triggerShake(replyFormRef.current);
      textareaRef.current?.focus();
      return;
    }
    triggerSpringPop(sendBtnRef.current);
    await sendUserMessage(chatInput);
  };

  const handleResetChat = (btnEl?: HTMLElement | null) => {
    triggerSpringPop(btnEl ?? null);
    setHintStep(1);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        from: "mentor",
        text:
          "### Phiên Socratic AI đã làm mới\n" +
          `- **Ngữ cảnh hiện tại:** \`${contextLocationLabel}\`\n` +
          "- **Chế độ hỗ trợ:** Gợi mở tư duy theo từng nấc, không giải hộ trọn bài.\n" +
          "> Đặt câu hỏi bất kỳ hoặc chọn gợi ý nhanh bên dưới để tiếp tục nhé!",
        time: getCurrentTime(),
        contextKey,
      },
    ]);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // Ignore clipboard permission errors
    }
    setCopiedMsgId(msgId);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedMsgId(null);
      copyTimerRef.current = null;
    }, 1800);
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

  const evidencePrompt = "Phân tích lỗi sai, test chưa đạt và nhận xét giảng viên; đề xuất ôn lại, luyện tập và làm lại để đo tiến bộ.";
  const visibleMessages = messages.filter((message) => message.id === "m0" || message.contextKey === contextKey);
  const latestPlanMessage = [...visibleMessages].reverse().find((message) => message.learningPlan);
  if (!shouldRender) return null;

  const drawerNode = (
    <div className="marlo-scope">
      <aside
        ref={drawerRef}
        className={`ai-chat-shell fixed bottom-4 right-4 z-[9990] isolate w-[355px] sm:w-[420px] h-[565px] max-h-[84vh] flex flex-col overflow-hidden select-none${
          isClosing ? " pointer-events-none" : ""
        }`}
        aria-label="AI Socratic Mentor Chat"
      >
        {/* ─── 1. HEADER (Chuẩn Marlo .thread__head) ─── */}
        <header className="thread__head">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-[12px] ${mentor.color || "bg-slate-900"} text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
            >
              <span>{mentor.emoji || "🦉"}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px] text-[var(--ink)] truncate tracking-tight">
                  {mentor.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card-2)] text-[var(--ink-2)] border border-[var(--line)] leading-none shrink-0">
                  <Sparkles size={10} className="text-[var(--muted)]" />
                  Socratic AI
                </span>
              </div>
              <div
                className="text-[11.5px] text-[var(--muted)] font-semibold truncate flex items-center gap-1.5 mt-0.5"
                title={contextLocationLabel}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{contextLocationLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => handleResetChat(e.currentTarget)}
              className="ai-ibtn"
              title="Làm mới hội thoại"
              aria-label="Làm mới hội thoại"
            >
              <RotateCcw size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="ai-ibtn"
              title="Đóng cửa sổ chat"
              aria-label="Đóng cửa sổ chat"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {/* ─── 2. THREAD MESSAGES (Chuẩn Marlo .thread__msgs & .msg) ─── */}
        <div ref={msgsContainerRef} className="thread__msgs flex-1 overflow-y-auto p-4 space-y-3.5">
          {visibleMessages.map((m) => {
            const isMine = m.from === "user";
            const isCopied = copiedMsgId === m.id;
            return (
              <div className={`msg${isMine ? " is-mine" : ""}`} key={m.id}>
                {isMine ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] text-[10.5px] font-black flex items-center justify-center shrink-0 shadow-xs mb-0.5">
                    {currentUserName ? currentUserName.slice(0, 2).toUpperCase() : <User size={12} />}
                  </div>
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full ${mentor.color || "bg-slate-800"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
                  >
                    <span>{mentor.emoji || <Bot size={12} />}</span>
                  </div>
                )}

                <div className="msg__bubble select-text">
                  <div className="msg__who !flex items-center justify-between gap-2">
                    <span>
                      {isMine ? `Bạn (${currentUserName})` : mentor.name} · {m.time}
                    </span>
                    {!isMine && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.id, m.text)}
                        aria-label={isCopied ? "Đã sao chép câu trả lời" : "Sao chép câu trả lời"}
                        title="Sao chép toàn bộ nội dung"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-3)] transition cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check size={10} className="text-[var(--good)]" />
                            <span className="text-[var(--good)]">Đã chép</span>
                          </>
                        ) : (
                          <Copy size={10} />
                        )}
                      </button>
                    )}
                  </div>
                  {isMine ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-[12.8px] select-text">
                      {m.text}
                    </p>
                  ) : (
                    <AiRichMessage text={m.text} />
                  )}
                  {!isMine && m.learningPlan && m.id === latestPlanMessage?.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2" aria-label="Lộ trình từ bằng chứng học tập">
                      <p className="text-[11px] font-bold text-[var(--ink-2)]">Bằng chứng & bước học tiếp theo</p>
                      <p className="text-[11px] leading-relaxed text-[var(--muted)]">{m.learningPlan.summary}</p>
                      {m.learningPlan.evidence.map((item) => (
                        <div key={`${item.kind}-${item.source_id}`} className="rounded-lg p-2 bg-[var(--card-2)] text-[11px] leading-relaxed">
                          <span className="font-semibold">{item.label}: </span>{item.detail}
                        </div>
                      ))}
                      {m.learningPlan.progress.quiz && (
                        <p className="text-[11px] text-[var(--ink-2)]">
                          Quiz: {m.learningPlan.progress.quiz.latest_score}/{m.learningPlan.progress.quiz.latest_total}
                          {m.learningPlan.progress.quiz.comparable
                            ? ` · trước: ${m.learningPlan.progress.quiz.previous_score}/${m.learningPlan.progress.quiz.previous_total} · ${Number(m.learningPlan.progress.quiz.delta_percentage_points) > 0 ? "+" : ""}${m.learningPlan.progress.quiz.delta_percentage_points} điểm % (cùng đề)`
                            : " · chưa có lượt cùng đề để so sánh"}
                        </p>
                      )}
                      {m.learningPlan.progress.sandbox && (
                        <p className="text-[11px] text-[var(--ink-2)]">
                          Test thực chạy: {m.learningPlan.progress.sandbox.passed}/{m.learningPlan.progress.sandbox.total}
                          {m.learningPlan.progress.sandbox.comparable
                            ? ` · trước: ${m.learningPlan.progress.sandbox.previous_passed}/${m.learningPlan.progress.sandbox.previous_total} · ${Number(m.learningPlan.progress.sandbox.delta_passed) > 0 ? "+" : ""}${m.learningPlan.progress.sandbox.delta_passed} test`
                            : " · chưa có bộ test tương đương để so sánh"}
                        </p>
                      )}
                      <div className="space-y-2">
                        {m.learningPlan.actions.map((action) => (
                          <div key={action.id} className="rounded-lg border border-[var(--line)] p-2">
                            <p className="text-[11px] font-semibold">{action.label}</p>
                            <p className="mt-1 text-[11px] text-[var(--muted)] leading-relaxed whitespace-pre-wrap">{action.instruction}</p>
                            <button
                              type="button"
                              disabled={isAskingAi}
                              className="ai-chip mt-2 !text-[10px]"
                              onClick={() => {
                                if (action.target && onLearningAction) {
                                  onLearningAction(action.target);
                                  handleAnimatedClose();
                                } else {
                                  void sendUserMessage(`Hướng dẫn từng bước: ${action.instruction}`);
                                }
                              }}
                            >
                              {action.target && onLearningAction ? "Mở nội dung học" : "Trao đổi bước này"}
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] leading-relaxed text-[var(--muted)]">{m.learningPlan.progress.verification_note}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAskingAi && (
            <div className="msg">
              <div
                className={`w-7 h-7 rounded-full ${mentor.color || "bg-slate-800"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
              >
                <span>{mentor.emoji || "🦉"}</span>
              </div>
              <div className="msg__bubble">
                <span className="msg__who">{mentor.name} · Đang phân tích ngữ cảnh hiện tại...</span>
                <div className="flex items-center gap-1.5 py-1.5">
                  <span className="ai-typing-dot" style={{ animationDelay: "0ms" }} />
                  <span className="ai-typing-dot" style={{ animationDelay: "160ms" }} />
                  <span className="ai-typing-dot" style={{ animationDelay: "320ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── QUICK CONTEXT CHIPS ─── */}
        <div
          ref={chipsRef}
          className="px-3 pt-2.5 pb-1.5 border-t border-[var(--line)] bg-[var(--card)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0"
        >
          <button
            type="button"
            disabled={isAskingAi}
            onClick={() => void sendUserMessage(evidencePrompt)}
            className="ai-chip"
            title="Chỉ phân tích kết quả quiz đã chấm, test thực chạy và góp ý đã lưu của bạn"
          >
            Ôn theo lỗi đã xác minh
          </button>
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={isAskingAi}
              onClick={(e) => {
                triggerSpringPop(e.currentTarget);
                void sendUserMessage(
                  qp,
                  qp.includes("Nấc sâu hơn")
                    ? Math.min(3, Math.max(2, hintStep))
                    : qp.includes("Gợi ý")
                    ? hintStep
                    : undefined
                );
              }}
              className="ai-chip"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* ─── 3. REPLY INPUT BAR (Chuẩn Marlo .thread__reply) ─── */}
        <div
          ref={replyFormRef}
          className="thread__reply bg-[var(--card)] px-3 pb-3 pt-1.5 flex items-end gap-2 shrink-0"
        >
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
            className="textarea flex-1 rounded-[16px] bg-[var(--card-2)] border border-[var(--line)] px-3.5 py-2.5 text-[12.8px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--line-2)] transition resize-none max-h-24 leading-normal"
          />
          <button
            ref={sendBtnRef}
            type="button"
            disabled={isAskingAi}
            onClick={() => void handleSendMessage()}
            className="ai-send-btn"
            title="Gửi câu hỏi (Enter)"
            aria-label="Gửi câu hỏi"
          >
            <Send size={15} className="translate-x-[1px]" />
          </button>
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerNode, document.body) : drawerNode;
}

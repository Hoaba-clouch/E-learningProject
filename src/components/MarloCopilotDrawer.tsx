import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Bot, Check, Copy, RotateCcw, Send, Sparkles, X } from "lucide-react";
import AiRichMessage from "./AiRichMessage";
import { useMarloAiDrawerMotion } from "../utils/marloAnimations";
import "../marlo-engine/marloStyles.css";

export interface CopilotMessageItem {
  sender: "user" | "ai";
  text: string;
  time: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  courseCode: string;
  courseName?: string;
  messages: CopilotMessageItem[];
  typing: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendPrompt: (text: string) => void;
  quickPrompts: string[];
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
}

export default function MarloCopilotDrawer({
  isOpen,
  onClose,
  onReset,
  courseCode,
  courseName,
  messages,
  typing,
  inputValue,
  onInputChange,
  onSendPrompt,
  quickPrompts,
}: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const drawerRef = useRef<HTMLElement>(null);
  const msgsContainerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(messages.length);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

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

  // Hiệu ứng tin nhắn mới (back.out(1.6)) hoặc stagger toàn luồng khi mở/reset
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
    if (isOpen && typing) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typing, isOpen]);

  useEffect(() => {
    if (isOpen && shouldRender) {
      const timer = setTimeout(() => inputRef.current?.focus(), 160);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const handleCopyMessage = (idx: number, text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // Ignore clipboard permission errors
    }
    setCopiedIdx(idx);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedIdx(null);
      copyTimerRef.current = null;
    }, 1800);
  };

  if (!shouldRender) return null;

  const drawerNode = (
    <div className="marlo-scope">
      <aside
        ref={drawerRef}
        className={`ai-chat-shell fixed bottom-5 right-5 z-[9990] isolate w-[365px] sm:w-[425px] max-w-[94vw] h-[565px] max-h-[84vh] flex flex-col overflow-hidden select-none${
          isClosing ? " pointer-events-none" : ""
        }`}
        aria-label="AI Teaching Co-Pilot Chat"
      >
        {/* ─── 1. HEADER CHUẨN MARLO ─── */}
        <header className="thread__head">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10"
              style={{ background: "var(--grad)", color: "var(--accent-ink)" }}
            >
              <Bot size={18} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px] text-[var(--ink)] truncate tracking-tight">
                  AI Teaching Co-Pilot
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[var(--card-2)] text-[var(--ink-2)] border border-[var(--line)] leading-none shrink-0">
                  <Sparkles size={10} className="text-[var(--muted)]" />
                  {courseCode}
                </span>
              </div>
              <div
                className="text-[11.5px] text-[var(--muted)] font-semibold truncate flex items-center gap-1.5 mt-0.5"
                title={courseName || "Trợ giảng AI · Lab, Quiz & Phản biện 3D"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  {courseName || "Trợ giảng AI · Lab, Quiz & Phản biện 3D"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                triggerSpringPop(e.currentTarget);
                onReset();
              }}
              className="ai-ibtn"
              title="Làm mới Co-Pilot"
              aria-label="Làm mới Co-Pilot"
            >
              <RotateCcw size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="ai-ibtn"
              title="Đóng cửa sổ Co-Pilot"
              aria-label="Đóng cửa sổ Co-Pilot"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {/* ─── 2. THREAD MESSAGES ─── */}
        <div ref={msgsContainerRef} className="thread__msgs flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((msg, idx) => {
            const isMine = msg.sender === "user";
            const isCopied = copiedIdx === idx;
            return (
              <div className={`msg${isMine ? " is-mine" : ""}`} key={`${msg.sender}-${idx}`}>
                {isMine ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] text-[10.5px] font-black flex items-center justify-center shrink-0 shadow-xs mb-0.5">
                    GV
                  </div>
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs mb-0.5"
                    style={{ background: "var(--grad)", color: "var(--accent-ink)" }}
                  >
                    <Bot size={14} strokeWidth={2.3} />
                  </div>
                )}

                <div className="msg__bubble select-text">
                  <div className="msg__who !flex items-center justify-between gap-2">
                    <span>{isMine ? `Giảng viên · ${msg.time}` : `AI Co-Pilot · ${msg.time}`}</span>
                    {!isMine && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(idx, msg.text)}
                        aria-label={isCopied ? "Đã sao chép phản hồi" : "Sao chép phản hồi"}
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
                      {msg.text}
                    </p>
                  ) : (
                    <AiRichMessage text={msg.text} />
                  )}
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="msg">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs mb-0.5"
                style={{ background: "var(--grad)", color: "var(--accent-ink)" }}
              >
                <Bot size={14} strokeWidth={2.3} />
              </div>
              <div className="msg__bubble">
                <span className="msg__who">AI Co-Pilot · Đang phân tích dữ liệu lớp...</span>
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
          className="px-3 pt-2.5 pb-1.5 border-t border-[var(--line)] bg-[var(--card)] flex flex-wrap items-center gap-1.5 shrink-0"
        >
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              disabled={typing}
              onClick={(e) => {
                triggerSpringPop(e.currentTarget);
                onSendPrompt(q);
              }}
              className="ai-chip"
            >
              {q}
            </button>
          ))}
        </div>

        {/* ─── 3. REPLY INPUT BAR ─── */}
        <form
          ref={replyFormRef}
          onSubmit={(e) => {
            e.preventDefault();
            if (!inputValue.trim()) {
              triggerShake(replyFormRef.current);
              inputRef.current?.focus();
              return;
            }
            if (typing) return;
            triggerSpringPop(sendBtnRef.current);
            onSendPrompt(inputValue);
          }}
          className="thread__reply bg-[var(--card)] px-3 pb-3 pt-1.5 flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Nhờ AI soạn đề, quiz hoặc nhận xét (Enter để gửi)..."
            aria-label="Nhập yêu cầu cho AI Teaching Co-Pilot"
            className="flex-1 rounded-[16px] bg-[var(--card-2)] border border-[var(--line)] px-3.5 py-2.5 text-[12.8px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--line-2)] transition"
          />
          <button
            ref={sendBtnRef}
            type="submit"
            disabled={typing}
            className="ai-send-btn"
            title="Gửi yêu cầu (Enter)"
            aria-label="Gửi yêu cầu"
          >
            <Send size={15} className="translate-x-[1px]" />
          </button>
        </form>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerNode, document.body) : drawerNode;
}

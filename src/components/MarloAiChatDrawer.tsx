import React, { useState, useEffect, useRef } from "react";
import { Send, X, Sparkles, RotateCcw, Bot, User } from "lucide-react";
import { askSocraticTutor } from "../api";
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
}: Props) {
  const [chatInput, setChatInput] = useState<string>("");
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "m0",
      from: "mentor",
      text: "Chào bạn! Mình là trợ lý AI Socratic. Mình sẽ cùng bạn phản biện bản chất kỹ thuật, khơi gợi tư duy sâu sắc chứ không mớm sẵn lời giải nhé!",
      time: "Vừa xong",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isAskingAi) return;
    const userText = chatInput.trim();
    const userTime = getCurrentTime();

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
        subjectId,
        question: userText,
        currentTopic: activeTopic,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text: response.answer || "Một góc nhìn rất đáng suy ngẫm! Bạn nghĩ sao về ảnh hưởng của thiết kế này tới hiệu năng bộ nhớ?",
          time: getCurrentTime(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          from: "mentor",
          text: `Câu hỏi rất hay! Trong môn ${subjectName}, theo bạn yếu tố nào đóng vai trò then chốt khi xử lý vấn đề trong bài "${activeTopic}"?`,
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        from: "mentor",
        text: `Đã làm mới phiên thảo luận Socratic cho chủ đề: "${activeTopic}". Hãy đặt câu hỏi bất kỳ khi bạn gặp vướng mắc nhé!`,
        time: getCurrentTime(),
      },
    ]);
  };

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
              className={`w-9 h-9 rounded-[12px] ${mentor.color || "bg-gradient-to-br from-[#F8BD57] to-[#EE8420]"} text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
            >
              <span>{mentor.emoji || "🦉"}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[13.5px] text-[var(--ink)] truncate tracking-tight">
                  {mentor.name}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold font-mono bg-[#EE8420]/15 text-[#EE8420] border border-[#EE8420]/30 leading-none">
                  <Sparkles size={10} />
                  Socratic AI
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted)] font-medium truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">Chủ đề: {activeTopic}</span>
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F8BD57] to-[#EE8420] text-[#1C1304] text-[10.5px] font-black flex items-center justify-center shrink-0 shadow-xs mb-0.5">
                    {currentUserName ? currentUserName.slice(0, 2).toUpperCase() : <User size={12} />}
                  </div>
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full ${mentor.color || "bg-amber-600"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
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
                className={`w-7 h-7 rounded-full ${mentor.color || "bg-amber-600"} text-white text-[12px] flex items-center justify-center shrink-0 shadow-xs mb-0.5`}
              >
                <span>{mentor.emoji || "🦉"}</span>
              </div>
              <div className="msg__bubble">
                <span className="msg__who">{mentor.name} · Đang phân tích Socratic...</span>
                <div className="flex items-center gap-1.5 py-1 text-[var(--muted)]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#EE8420] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#EE8420] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#EE8420] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── 3. REPLY INPUT BAR (Chuẩn Marlo .thread__reply) ─── */}
        <div className="thread__reply border-t border-[var(--line)] bg-[var(--card)] p-3 flex items-end gap-2 shrink-0">
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
            placeholder="Hỏi Socratic hoặc phản biện kiến trúc (Enter để gửi)..."
            className="textarea flex-1 rounded-[16px] bg-[var(--card-2)] border border-[var(--line)] px-3.5 py-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[#EE8420] focus:ring-1 focus:ring-[#EE8420] transition resize-none max-h-24 leading-normal"
          />
          <button
            type="button"
            disabled={!chatInput.trim() || isAskingAi}
            onClick={() => void handleSendMessage()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F8BD57] via-[#F29B23] to-[#EE8420] text-[#1C1304] flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition cursor-pointer shrink-0"
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

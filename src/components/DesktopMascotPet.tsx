import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Sparkles,
  Glasses,
} from "lucide-react";
import type { MentorMascot } from "../App";

interface Props {
  mascot: MentorMascot;
  activeScreen: string;
}

type PetState = "idle" | "coding" | "quiz" | "success" | "error";

const speechPool: Record<PetState, string[]> = {
  idle: [
    "Đệ đang ở đây sẵn sàng hỗ trợ huynh!",
    "Huynh cần hỏi gì cứ click vào đệ nhé.",
    "Hôm nay chúng ta sẽ chinh phục OOP!",
    "Học đều tay, nhận XP đầy túi huynh ơi.",
  ],
  coding: [
    "Đệ đeo kính vào soi code sạch cùng huynh đây!",
    "Logic này chạy mượt lắm huynh.",
    "Đệ đang kiểm tra trùng lặp code...",
    "Nhìn huynh gõ phím nghệ thuật quá!",
  ],
  quiz: [
    "Áp lực quá! Huynh đọc kỹ đề nhé.",
    "Đồng hồ đang đếm ngược kìa huynh!",
    "Chọn đáp án đúng nhất nha huynh ơi.",
    "Nghĩ kỹ trước khi click nha huynh.",
  ],
  success: [
    "Đỉnh quá huynh ơi! Đúng chuẩn luôn! 🎉",
    "Tuyệt vời! +XP xứng đáng!",
    "Đệ biết ngay huynh sẽ làm được mà! ✨",
    "Code chạy thông suốt rồi huynh ơi!",
  ],
  error: [
    "Không sao huynh ơi, ngã ở đâu gấp đôi XP ở đó!",
    "Lỗi tí thôi, sửa lại là chạy ngon lành.",
    "Để đệ xem lại logic này cùng huynh nhé.",
    "Đừng nản, đệ tin huynh làm được!",
  ],
};

const mascotConfig: Record<MentorMascot, { name: string; color: string; ringColor: string; emoji: string }> = {
  mino: { name: "Mino", color: "bg-emerald-500", ringColor: "border-emerald-300", emoji: "🐸" },
  nova: { name: "Nova", color: "bg-purple-600", ringColor: "border-purple-400", emoji: "⭐" },
  byte: { name: "Byte", color: "bg-orange-500", ringColor: "border-orange-300", emoji: "🐶" },
  sage: { name: "Sage", color: "bg-indigo-600", ringColor: "border-indigo-400", emoji: "🦉" },
  luna: { name: "Mecha-Luna", color: "bg-sky-500", ringColor: "border-sky-300", emoji: "🤖" },
  kuro: { name: "Kuro", color: "bg-neutral-800", ringColor: "border-neutral-600", emoji: "🐈‍⬛" },
  ignis: { name: "Ignis", color: "bg-rose-600", ringColor: "border-rose-400", emoji: "🐉" },
  sylph: { name: "Sylph", color: "bg-teal-500", ringColor: "border-teal-300", emoji: "🧚" },
};

export default function DesktopMascotPet({ mascot, activeScreen }: Props) {
  const [petState, setPetState] = useState<PetState>("idle");
  const [speech, setSpeech] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatLog, setChatLog] = useState<{ from: "user" | "pet"; text: string }[]>([]);
  const [speechVisible, setSpeechVisible] = useState(true);

  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = mascotConfig[mascot];

  // Load initial welcome speech
  useEffect(() => {
    triggerSpeech("idle");
    setChatLog([
      { from: "pet", text: `Chào huynh! Đệ là ${config.name}, trợ lý học tập để bàn của huynh. Cần hỏi gì cứ gõ vào đây nhé!` }
    ]);
  }, [mascot]);

  // Listen to custom pet state change events
  useEffect(() => {
    const handleStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ state: PetState; text?: string }>;
      const nextState = customEvent.detail.state;
      setPetState(nextState);
      triggerSpeech(nextState, customEvent.detail.text);
    };

    window.addEventListener("pet-state-change", handleStateChange);
    return () => window.removeEventListener("pet-state-change", handleStateChange);
  }, [mascot]);

  const triggerSpeech = (state: PetState, customText?: string) => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    
    const pool = speechPool[state];
    const text = customText || pool[Math.floor(Math.random() * pool.length)];
    setSpeech(text);
    setSpeechVisible(true);

    speechTimeoutRef.current = setTimeout(() => {
      setSpeechVisible(false);
    }, 4500);
  };

  const handleSendQuestion = () => {
    if (!question.trim()) return;
    const userText = question;
    setChatLog((current) => [...current, { from: "user", text: userText }]);
    setQuestion("");

    // Simulate AI response based on keywords
    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();
      if (lower.includes("override") || lower.includes("ghi đè")) {
        reply = "Override (ghi đè) là khi lớp con viết lại phương thức của lớp cha với cùng chữ ký. Hãy chú ý dùng @Override để compiler check lỗi chính xác nhé!";
      } else if (lower.includes("super") || lower.includes("cha")) {
        reply = "super() dùng để gọi constructor lớp cha, super.method() để gọi phương thức lớp cha. Nhớ là super() constructor phải ở dòng đầu tiên của hàm tạo lớp con nha huynh!";
      } else if (lower.includes("extends") || lower.includes("kế thừa")) {
        reply = "extends khai báo quan hệ kế thừa (is-a). Ví dụ Dog extends Animal nghĩa là Dog kế thừa mọi thuộc tính public/protected từ Animal.";
      } else if (lower.includes("đáp án") || lower.includes("quiz")) {
        reply = "Quiz lần này hỏi về định nghĩa kế thừa, huynh chú ý chọn phương án mô tả việc lớp con nhận code từ lớp cha nhé.";
      } else {
        reply = `Đệ khuyên huynh nên dùng tab "Mindmap Canvas" vẽ thử cấu trúc ${activeScreen === "workspace" ? "bài học" : "chương 1"} để dễ hình dung logic này hơn nhé!`;
      }
      setChatLog((current) => [...current, { from: "pet", text: reply }]);
      setPetState("success");
      triggerSpeech("success", "Đệ giải thích xong rồi kìa huynh!");
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* ── Keyframes animation inside style block ── */}
      <style>{`
        @keyframes pet-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pet-shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes pet-sweat {
          0% { transform: translateY(-3px) scale(0.6); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(8px) scale(1); opacity: 0; }
        }
        .pet-animate-idle { animation: pet-bounce 3s ease-in-out infinite; }
        .pet-animate-coding { animation: pet-bounce 1.5s ease-in-out infinite; }
        .pet-animate-quiz { animation: pet-shake 0.8s ease-in-out infinite; }
        .pet-animate-joy { animation: pet-bounce 0.5s ease-in-out infinite; }
      `}</style>

      {/* ── CHAT POPUP WIDGET ── */}
      {chatOpen && (
        <div className="pointer-events-auto mb-4 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${config.color} text-white text-xs`}>
                {config.emoji}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Hỏi nhanh đệ {config.name}</span>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black">AI Study Companion</div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={15} />
            </button>
          </div>

          {/* Chat history */}
          <div className="h-44 overflow-y-auto space-y-2.5 pr-1 flex flex-col">
            {chatLog.map((log, i) => (
              <div key={i} className={`flex gap-1.5 ${log.from === "user" ? "justify-end" : "justify-start"}`}>
                {log.from === "pet" && (
                  <span className={`h-5 w-5 shrink-0 flex items-center justify-center rounded bg-slate-950 text-white text-[9px] font-bold`}>
                    {mascot.slice(0,2).toUpperCase()}
                  </span>
                )}
                <div className={`max-w-[200px] rounded-xl px-3 py-2 text-xs leading-5 ${
                  log.from === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}>
                  {log.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "Giải thích override",
              "Khi nào dùng super()",
              "Từ khóa extends",
            ].map((p) => (
              <button
                key={p}
                onClick={() => { setQuestion(p); }}
                className="text-[10px] rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="flex gap-1.5 items-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendQuestion()}
              placeholder={`Hỏi đệ ${config.name}...`}
              className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none dark:text-white"
            />
            <button
              onClick={handleSendQuestion}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── MASCOT BODY & SPEECH BUBBLE ── */}
      <div className="flex items-center gap-3">
        {/* Speech Bubble */}
        {speechVisible && speech && (
          <div className="max-w-[200px] rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 text-white text-xs px-3.5 py-2.5 shadow-2xl relative animate-in fade-in zoom-in-50 duration-200">
            <p className="leading-5">{speech}</p>
            {/* arrow indicator */}
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-[6px] border-l-slate-900/90 dark:border-l-slate-950/90" />
          </div>
        )}

        {/* Mascot Character Body */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`pointer-events-auto flex items-center justify-center rounded-2xl border-4 ${config.ringColor} ${config.color} h-16 w-16 shadow-2xl transition duration-300 relative group overflow-visible ${
            petState === "idle" ? "pet-animate-idle" :
            petState === "coding" ? "pet-animate-coding" :
            petState === "quiz" ? "pet-animate-quiz" :
            "pet-animate-joy"
          }`}
        >
          {/* Faded background glow */}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition rounded-xl" />

          {/* Expressive Faces / Badges */}
          <span className="text-3xl select-none">{config.emoji}</span>

          {/* CODING MODE: Wearing developer glasses */}
          {petState === "coding" && (
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 bg-slate-950 text-white p-0.5 rounded border border-white/20 scale-110 flex items-center justify-center animate-pulse">
              <Glasses size={12} />
            </div>
          )}

          {/* QUIZ MODE: Sweat droplets animation */}
          {petState === "quiz" && (
            <span
              className="absolute right-1 top-2 text-sky-400 text-sm select-none"
              style={{ animation: "pet-sweat 1s infinite" }}
            >
              💧
            </span>
          )}

          {/* SUCCESS MODE: Sparkling stars */}
          {petState === "success" && (
            <Sparkles size={16} className="absolute -top-3 -right-2 text-yellow-400 animate-spin" />
          )}

          {/* ERROR MODE: Question mark */}
          {petState === "error" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border border-white animate-bounce">
              ?
            </div>
          )}

          {/* Hover indicator tooltip */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 bg-slate-950 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded shadow whitespace-nowrap transition duration-200">
            Hỏi đệ {config.name}
          </div>
        </button>
      </div>
    </div>
  );
}

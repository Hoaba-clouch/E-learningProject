import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  ReactFlow,
  addEdge,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  ChevronRight,
  Code2,
  CornerDownLeft,
  ExternalLink,
  FileText,
  GitBranch,
  Headphones,
  HelpCircle,
  Lock,
  Pause,
  Play,
  Send,
  Sparkles,
  Wand2,
  Upload,
  Video,
  WandSparkles,
  X,
  Zap,
  Bot,
  RotateCcw,
  Clock,
  Star,
  PlayCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { ChatSkin, MentorMascot } from "../App";

interface LearningWorkspaceProps {
  mentorMascot: MentorMascot;
  chatSkin: ChatSkin;
}

type Tab = "lecture" | "video" | "quiz" | "mindmap" | "code";

// ─── Per-lesson metadata for the Progress Stepper ───────────────────────────
const lessonMeta: Record<string, { xp: number; readMins: number; quizPct: number; codePct: number }> = {
  "1.1": { xp: 80,  readMins: 5,  quizPct: 100, codePct: 100 },
  "1.2": { xp: 90,  readMins: 7,  quizPct: 80,  codePct: 50  },
  "1.3": { xp: 120, readMins: 10, quizPct: 0,   codePct: 0   },
};

// ─── Confetti particle helpers ───────────────────────────────────────────────
function randomBetween(a: number, b: number) { return a + Math.random() * (b - a); }
const COLORS = ["#facc15","#f97316","#22d3ee","#a78bfa","#34d399","#f472b6","#60a5fa"];
function spawnConfetti(container: HTMLElement) {
  for (let i = 0; i < 55; i++) {
    const el = document.createElement("span");
    const size = randomBetween(6, 12);
    el.style.cssText = `
      position:absolute; pointer-events:none; z-index:100;
      width:${size}px; height:${size}px;
      background:${COLORS[Math.floor(Math.random()*COLORS.length)]};
      border-radius:${Math.random()>0.5?"50%":"2px"};
      left:${randomBetween(5,95)}%;
      top:${randomBetween(10,60)}%;
      transform: translateY(0); opacity:1;
      animation: confetti-fall ${randomBetween(0.7,1.4)}s ease-out ${randomBetween(0,0.3)}s forwards;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}

// ─── Quiz data extended with explanations ───────────────────────────────────
interface QuizOption { id: string; text: string; }
const quizQuestions: { q: string; options: QuizOption[]; correct: string; explanation: string }[] = [
  {
    q: "Kế thừa trong OOP là gì?",
    options: [
      { id: "a", text: "Lớp con nhận thuộc tính và hành vi từ lớp cha" },
      { id: "b", text: "Lớp cha tự động sao chép toàn bộ lớp con" },
      { id: "c", text: "Hai lớp ngang hàng dùng chung biến toàn cục" },
      { id: "d", text: "Một lớp chỉ có thể chứa phương thức static" },
    ],
    correct: "a",
    explanation: "Kế thừa (inheritance) cho phép lớp con tái sử dụng code của lớp cha. Đây là nguyên tắc DRY cốt lõi trong OOP giúp tránh viết lại logic trùng lặp.",
  },
  {
    q: "Từ khóa nào dùng để gọi constructor của lớp cha trong Java?",
    options: [
      { id: "a", text: "parent()" },
      { id: "b", text: "super()" },
      { id: "c", text: "base()" },
      { id: "d", text: "this()" },
    ],
    correct: "b",
    explanation: "super() gọi constructor của lớp cha, phải đặt ở dòng đầu tiên trong constructor của lớp con. Nếu không gọi tường minh, Java tự thêm super() không tham số.",
  },
  {
    q: "Override trong Java có nghĩa là gì?",
    options: [
      { id: "a", text: "Định nghĩa method mới hoàn toàn không liên quan lớp cha" },
      { id: "b", text: "Xóa method của lớp cha" },
      { id: "c", text: "Viết lại phương thức đã tồn tại ở lớp cha với cùng chữ ký" },
      { id: "d", text: "Tạo nhiều phương thức trùng tên khác tham số" },
    ],
    correct: "c",
    explanation: "Override là ghi đè — lớp con định nghĩa lại method đã có ở lớp cha với cùng tên, tham số và kiểu trả về. Dùng annotation @Override để compiler kiểm tra chính xác.",
  },
];
type ReadingMode = "full" | "summary" | "resources";
type WorkspaceView = "lesson" | "chapterAssignments";
type AssignmentReviewStatus = "not-submitted" | "submitted" | "pending-review" | "needs-revision" | "approved";

const assignmentStatusConfig: Record<AssignmentReviewStatus, { label: string; desc: string; className: string }> = {
  "not-submitted": {
    label: "Chưa nộp",
    desc: "Học viên chưa gửi bài cho giảng viên.",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  submitted: {
    label: "Đã nộp",
    desc: "Hệ thống đã nhận bài và ghi nhận thời gian nộp.",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  "pending-review": {
    label: "Đang chờ review",
    desc: "Bài đang nằm trong hàng chờ nhận xét của giảng viên.",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  "needs-revision": {
    label: "Cần sửa",
    desc: "Giảng viên đã phản hồi, học viên cần chỉnh và gửi lại.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  approved: {
    label: "Đã đạt",
    desc: "Bài đã được giảng viên duyệt hoàn thành.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const assignmentReviewSteps: AssignmentReviewStatus[] = ["not-submitted", "submitted", "pending-review", "needs-revision", "approved"];

const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "lecture", icon: <FileText size={15} />, label: "Bài đọc" },
  { id: "video", icon: <Video size={15} />, label: "Video" },
  { id: "quiz", icon: <HelpCircle size={15} />, label: "Quiz" },
  { id: "mindmap", icon: <GitBranch size={15} />, label: "Mindmap" },
  { id: "code", icon: <Code2 size={15} />, label: "Code lab" },
];

const lessons = [
  {
    id: "1.1",
    title: "Khái niệm kế thừa",
    topic: "Inheritance basics",
    status: "done",
    full:
      "Kế thừa cho phép một lớp con tái sử dụng thuộc tính và hành vi của lớp cha. Quan hệ này nên được dùng khi lớp con thật sự là một phiên bản chuyên biệt của lớp cha.",
    summary: [
      ["is-a", "Dog là một Animal, vì vậy Dog có thể kế thừa Animal."],
      ["reuse", "Lớp con tái sử dụng code chung từ lớp cha."],
      ["specialize", "Lớp con có thể bổ sung hoặc thay đổi hành vi riêng."],
    ],
  },
  {
    id: "1.2",
    title: "extends và super",
    topic: "Java inheritance keywords",
    status: "done",
    full:
      "`extends` khai báo quan hệ kế thừa trong Java. `super` dùng để gọi constructor, thuộc tính hoặc phương thức của lớp cha từ bên trong lớp con.",
    summary: [
      ["extends", "Khai báo lớp con kế thừa lớp cha."],
      ["super()", "Gọi constructor của lớp cha."],
      ["super.method()", "Gọi lại hành vi đã có ở lớp cha."],
    ],
  },
  {
    id: "1.3",
    title: "Đa hình và override",
    topic: "Polymorphism",
    status: "active",
    full:
      "Đa hình cho phép cùng một lời gọi phương thức tạo ra hành vi khác nhau tùy đối tượng cụ thể. Khi Dog và Cat cùng kế thừa Animal, mỗi lớp con có thể override phương thức speak().",
    summary: [
      ["override", "Lớp con viết lại hành vi đã có ở lớp cha."],
      ["runtime dispatch", "Java chọn phương thức dựa trên đối tượng thật khi chạy."],
      ["less if/else", "Đa hình giúp giảm kiểm tra thủ công từng loại đối tượng."],
    ],
  },
];

// quizOptions removed — now inline in quizQuestions above

type MindmapNodeData = {
  title: string;
  subtitle: string;
  tag: string;
  tone: "source" | "concept" | "practice" | "review";
};

function MindmapNode({ data }: NodeProps<Node<MindmapNodeData>>) {
  return (
    <div className={`mindmap-flow-node mindmap-flow-node-${data.tone}`}>
      <Handle type="target" position={Position.Left} className="mindmap-flow-handle" />
      <div className="mindmap-flow-node-head">
        <span>{data.tag}</span>
        <span />
      </div>
      <div className="mindmap-flow-node-title">{data.title}</div>
      <div className="mindmap-flow-node-subtitle">{data.subtitle}</div>
      <Handle type="source" position={Position.Right} className="mindmap-flow-handle" />
      <Handle type="source" position={Position.Bottom} className="mindmap-flow-handle" />
    </div>
  );
}

const mindmapNodeTypes = { mindmapNode: MindmapNode };

const initialMindmapNodes: Node[] = [
  {
    id: "reading",
    type: "mindmapNode",
    position: { x: 40, y: 126 },
    data: { title: "Bài đọc", subtitle: "Nắm ý chính và ví dụ nền", tag: "INPUT", tone: "source" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 178 },
  },
  {
    id: "concept",
    type: "mindmapNode",
    position: { x: 325, y: 72 },
    data: { title: "OOP căn bản", subtitle: "class, object, is-a", tag: "CORE", tone: "concept" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 190 },
  },
  {
    id: "interface",
    type: "mindmapNode",
    position: { x: 300, y: 234 },
    data: { title: "Interface", subtitle: "hợp đồng hành vi", tag: "ABSTRACT", tone: "concept" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 184 },
  },
  {
    id: "polymorphism",
    type: "mindmapNode",
    position: { x: 592, y: 132 },
    data: { title: "Đa hình", subtitle: "override và runtime dispatch", tag: "FLOW", tone: "concept" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 198 },
  },
  {
    id: "quiz",
    type: "mindmapNode",
    position: { x: 602, y: 304 },
    data: { title: "Quiz kiểm tra", subtitle: "đạt 70% để mở code lab", tag: "CHECK", tone: "practice" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 194 },
  },
  {
    id: "code-lab",
    type: "mindmapNode",
    position: { x: 875, y: 214 },
    data: { title: "Code lab", subtitle: "viết Animal -> Dog/Cat", tag: "PRACTICE", tone: "practice" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 198 },
  },
  {
    id: "ai-review",
    type: "mindmapNode",
    position: { x: 1130, y: 126 },
    data: { title: "AI Review", subtitle: "góp ý sơ đồ sau khi vẽ", tag: "MENTOR", tone: "review" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: 190 },
  },
];

const initialMindmapEdges: Edge[] = [
  { id: "reading-concept", type: "bezier", source: "reading", target: "concept", label: "rút ý", animated: true, interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#38bdf8", strokeWidth: 2.4 } },
  { id: "reading-interface", type: "bezier", source: "reading", target: "interface", label: "ví dụ", interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#64748b", strokeWidth: 2.2 } },
  { id: "concept-polymorphism", type: "bezier", source: "concept", target: "polymorphism", label: "mở rộng", animated: true, interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#10b981", strokeWidth: 2.4 } },
  { id: "interface-polymorphism", type: "bezier", source: "interface", target: "polymorphism", label: "áp dụng", interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#a78bfa", strokeWidth: 2.3 } },
  { id: "polymorphism-quiz", type: "bezier", source: "polymorphism", target: "quiz", label: "kiểm tra", interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#f59e0b", strokeWidth: 2.2 } },
  { id: "quiz-code", type: "bezier", source: "quiz", target: "code-lab", label: "luyện tập", animated: true, interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#10b981", strokeWidth: 2.4 } },
  { id: "code-review", type: "bezier", source: "code-lab", target: "ai-review", label: "review", interactionWidth: 24, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#f472b6", strokeWidth: 2.3 } },
];

const chapterAssignments = [
  {
    id: "CH1-BT01",
    title: "Animal hierarchy",
    prompt: "Thiết kế hệ phân cấp Animal, Dog, Cat. Mỗi lớp con override speak() và có ít nhất một thuộc tính riêng.",
    requirements: ["Có class cha Animal", "Có ít nhất 2 class con", "Override speak()", "Có README giải thích thiết kế"],
  },
  {
    id: "CH1-BT02",
    title: "Shape polymorphism",
    prompt: "Tạo interface Shape và các lớp Circle, Rectangle. Viết chương trình tính tổng diện tích từ danh sách Shape.",
    requirements: ["Dùng interface hoặc abstract class", "Có ít nhất 2 hình", "Không dùng if/else để phân loại hình", "Có test dữ liệu mẫu"],
  },
  {
    id: "CH1-BT03",
    title: "Mini project Vehicle",
    prompt: "Xây dựng mô phỏng đội xe gồm Vehicle, Car, Bike và Truck. Tập trung vào kế thừa, override và đa hình.",
    requirements: ["Có sơ đồ class ngắn trong README", "Có ít nhất 3 loại xe", "Có hàm chạy demo", "Commit lịch sử tự nhiên"],
  },
];

const mentorQuickPrompts = [
  "Giải thích override bằng ví dụ dễ hiểu",
  "Hỏi em 1 câu Socratic",
  "Gợi ý node mindmap tiếp theo",
];

const mentorConfig: Record<MentorMascot, { name: string; mark: string; mode: string; hint: string; emoji: string; color: string }> = {
  mino: { name: "Mino", mark: "MI", mode: "thân thiện", hint: "Mình đi chậm từng bước nhé.", emoji: "🐸", color: "bg-emerald-500" },
  nova: { name: "Nova", mark: "NV", mode: "nghiêm túc", hint: "Tập trung vào lỗi cốt lõi trước.", emoji: "⭐", color: "bg-purple-600" },
  byte: { name: "Byte", mark: "BY", mode: "vui tính", hint: "Bẻ lỗi nhỏ trước, lên XP sau.", emoji: "🐶", color: "bg-orange-500" },
  sage: { name: "Sage", mark: "SG", mode: "Socratic", hint: "Mentor sẽ hỏi ngược để bạn tự tìm ra lỗi.", emoji: "🦉", color: "bg-indigo-600" },
  luna: { name: "Mecha-Luna", mark: "LN", mode: "logic / mecha", hint: "Luna đã tối ưu hóa logic này cho huynh.", emoji: "🤖", color: "bg-sky-500" },
  kuro: { name: "Kuro", mark: "KR", mode: "cute / ninja", hint: "Kuro phát hiện lỗi cú pháp rất nhanh nha!", emoji: "🐈‍⬛", color: "bg-neutral-800" },
  ignis: { name: "Ignis", mark: "IG", mode: "cool / dragon", hint: "Bùng cháy năng lượng lập trình lên nào huynh!", emoji: "🐉", color: "bg-rose-600" },
  sylph: { name: "Sylph", mark: "SP", mode: "kawaii / tiên", hint: "Để tiên gió nâng đỡ tư duy OOP của huynh.", emoji: "🧚", color: "bg-teal-500" },
};

export default function LearningWorkspace({ mentorMascot, chatSkin }: LearningWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("lecture");
  const [view, setView] = useState<WorkspaceView>("lesson");
  const [mentorCollapsed, setMentorCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [selectedLesson, setSelectedLesson] = useState(2);
  const [selectedChapterAssignment, setSelectedChapterAssignment] = useState(0);
  const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, AssignmentReviewStatus>>({
    "CH1-BT01": "needs-revision",
    "CH1-BT02": "pending-review",
    "CH1-BT03": "not-submitted",
  });
  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizTimer, setQuizTimer] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const quizConfettiRef = useRef<HTMLDivElement>(null);
  // Audio state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0.38);
  const [audioSpeed, setAudioSpeed] = useState("1x");
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Code Lab state
  const [codeValue, setCodeValue] = useState(`class Animal {\n  void speak() {\n    System.out.println("...");\n  }\n}\n\nclass Dog extends Animal {\n  @Override\n  void speak() {\n    System.out.println("Woof!");\n  }\n}\n\nclass Main {\n  public static void main(String[] args) {\n    Animal pet = new Dog();\n    pet.speak(); // runtime dispatch\n  }\n}`);
  const [consoleOutput, setConsoleOutput] = useState<string[]>(["Ready. Press \"Run\" to execute."]);
  const [aiReviewLines, setAiReviewLines] = useState<string[]>([]);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialMindmapNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialMindmapEdges);
  const [messages, setMessages] = useState([
    { from: "mentor", text: "Bạn đang ở bài Đa hình. Hãy nối khái niệm override với ví dụ Dog.speak() để kiểm tra mình hiểu đúng chưa." },
    { from: "user", text: "Em hay nhầm giữa extends và override." },
    { from: "mentor", text: "Tách làm 2 câu: extends trả lời 'là một loại gì?', override trả lời 'hành vi được viết lại ra sao?'." },
  ]);

  const lesson = lessons[selectedLesson];
  const mentor = mentorConfig[mentorMascot];
  const chapterAssignment = chapterAssignments[selectedChapterAssignment];
  const chapterAssignmentStatus = assignmentStatuses[chapterAssignment.id] ?? "not-submitted";
  const chapterAssignmentStatusInfo = assignmentStatusConfig[chapterAssignmentStatus];
  const currentQuestion = quizQuestions[quizIndex];

  // ── Dispatch events to Mascot Pet based on active tab ─────────────────────
  useEffect(() => {
    if (view === "chapterAssignments") {
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "idle" } }));
      return;
    }
    if (tab === "code") {
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "coding" } }));
    } else if (tab === "quiz") {
      if (quizDone) {
        window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success", text: "Huynh hoàn thành quiz xuất sắc! 🎉" } }));
      } else if (!timerRunning && quizTimer === 30) {
        window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "idle", text: "Bấm Bắt đầu để thử thách Quiz nhé!" } }));
      } else {
        window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "quiz" } }));
      }
    } else {
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "idle" } }));
    }
  }, [tab, view, quizDone, timerRunning, quizTimer]);

  // ── Quiz timer countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    if (quizTimer <= 0) {
      setTimerRunning(false);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "error", text: "Hết giờ mất rồi huynh ơi! ⏰" } }));
      return;
    }
    const id = setInterval(() => setQuizTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, quizTimer]);

  // ── Audio fake progress ──────────────────────────────────────────────────
  useEffect(() => {
    if (audioPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((p) => { if (p >= 1) { setAudioPlaying(false); return 1; } return p + 0.002; });
      }, 80);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
    return () => { if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); };
  }, [audioPlaying]);

  const startQuiz = () => {
    setQuizIndex(0); setSelectedOption(null); setSubmitted(false);
    setQuizDone(false); setTotalXpEarned(0); setQuizStreak(0);
    setQuizTimer(30); setTimerRunning(true);
  };

  const submitQuiz = () => {
    if (!selectedOption) return;
    setSubmitted(true);
    setTimerRunning(false);
    const correct = selectedOption === currentQuestion.correct;
    if (correct) {
      const bonus = quizStreak >= 2 ? 2 : 1;
      setTotalXpEarned((x) => x + 15 * bonus);
      setQuizStreak((s) => s + 1);
      if (quizConfettiRef.current) spawnConfetti(quizConfettiRef.current);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success" } }));
    } else {
      setQuizStreak(0);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "error" } }));
    }
  };

  const nextQuizQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) { setQuizDone(true); return; }
    setQuizIndex((i) => i + 1);
    setSelectedOption(null); setSubmitted(false);
    setQuizTimer(30); setTimerRunning(true);
  };

  const runCode = () => {
    setConsoleOutput(["$ javac Main.java", "$ java Main", "Woof!", "", "Process finished with exit code 0"]);
    window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success", text: "Code chạy thành công rồi huynh! 🎉" } }));
  };

  const runAiReview = () => {
    setAiReviewLoading(true);
    setAiReviewLines([]);
    const lines = [
      "✅ Đặt tên class đúng PascalCase — tốt!",
      "✅ Dùng @Override annotation — tốt!",
      "⚠️  speak() trong Animal nên dùng abstract hoặc có body rõ hơn.",
      "💡 Gợi ý: thêm field tên động vật để cá nhân hóa output.",
      "💡 Nên thêm JavaDoc cho từng method để đảm bảo code sạch.",
      "📊 Điểm Code sạch ước lượng: 78 / 100",
    ];
    let i = 0;
    const id = setInterval(() => {
      setAiReviewLines((prev) => [...prev, lines[i]]);
      i++;
      if (i >= lines.length) {
        clearInterval(id);
        setAiReviewLoading(false);
        window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success", text: "AI đã chấm điểm xong! 78/100 điểm sạch!" } }));
      }
    }, 420);
  };

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "bezier",
            label: "liên hệ",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#d88b64", strokeWidth: 2 },
          },
          current,
        ),
      ),
    [setEdges],
  );

  const addMindmapNode = () => {
    const index = nodes.length + 1;
    setNodes((current) => [
      ...current,
      {
        id: `custom-${index}`,
        type: "mindmapNode",
        position: { x: 160 + index * 42, y: 380 + (index % 3) * 24 },
        data: {
          title: `Ý mới ${index}`,
          subtitle: "kéo để sắp xếp lại mindmap",
          tag: "NEW",
          tone: "source",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: { width: 176 },
      },
    ]);
  };

  const selectLesson = (index: number) => {
    setView("lesson");
    setSelectedLesson(index);
    setTab("lecture");
    setReadingMode("full");
    setSelectedOption(null);
    setSubmitted(false);
  };

  const sendMessage = (text = message) => {
    if (!text.trim()) return;
    setMessages((current) => [...current, { from: "user", text }]);
    setMessage("");
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { from: "mentor", text: "Gợi ý tiếp: hãy viết ví dụ Vehicle -> Car, rồi override phương thức move()." },
      ]);
    }, 600);
  };

  return (
    <div className={`grid h-full transition-[grid-template-columns] duration-300 ${
      sidebarCollapsed
        ? (mentorCollapsed ? "grid-cols-[52px_minmax(0,1fr)_52px]" : "grid-cols-[52px_minmax(0,1fr)_310px]")
        : (mentorCollapsed ? "grid-cols-[232px_minmax(0,1fr)_52px]" : "grid-cols-[232px_minmax(0,1fr)_310px]")
    }`}>
      {/* ── PROGRESS STEPPER SIDEBAR ──────────────────────────────────────── */}
      {sidebarCollapsed ? (
        <aside className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-4 gap-4 w-12 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Mở rộng tiến trình"
          >
            <ChevronsRight size={15} />
          </button>
          
          <div className="flex-1 flex flex-col items-center gap-3 w-full px-1">
            {lessons.map((item, index) => {
              const active = selectedLesson === index && view === "lesson" && tab !== "mindmap";
              return (
                <button
                  key={item.id}
                  onClick={() => selectLesson(index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    active
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-600"
                      : "border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                  title={`Bài ${item.id}: ${item.title}`}
                >
                  {item.status === "done" ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <Play size={16} className={active ? "text-blue-600" : "text-slate-400"} />
                  )}
                </button>
              );
            })}

            <button
              onClick={() => { setView("chapterAssignments"); setSelectedChapterAssignment(0); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              title="Bài tập cuối chương"
            >
              <Lock size={15} />
            </button>

            <button
              onClick={() => { setView("lesson"); setTab("mindmap"); }}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                view === "lesson" && tab === "mindmap"
                  ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
              title="Sơ đồ Mindmap"
            >
              <Sparkles size={15} className="text-amber-500" />
            </button>
          </div>
        </aside>
      ) : (
        <aside className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Chương 1</div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Thu nhỏ tiến trình"
              >
                <ChevronsLeft size={13} />
              </button>
            </div>
            <h1 className="mt-1 text-base font-bold text-slate-900 dark:text-white leading-tight">Kế thừa và đa hình</h1>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                <span>Tiến độ chương</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">46%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-[46%] rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><Star size={9} className="fill-amber-400 text-amber-400" /> 270 XP tích lũy</span>
              <span className="flex items-center gap-1"><Clock size={9} /> ~22 phút còn lại</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 p-2.5">
            {lessons.map((item, index) => {
              const active = selectedLesson === index && view === "lesson" && tab !== "mindmap";
              const meta = lessonMeta[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => selectLesson(index)}
                  className={`lesson-outline-item w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50"
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.status === "done"
                      ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      : <Play size={14} className={`shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />}
                    <span className={`text-xs font-semibold leading-tight ${active ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>
                      {item.id} · {item.title}
                    </span>
                  </div>
                  {/* Mini sub-progress bars */}
                  <div className="mt-2 space-y-1.5">
                    {[
                      { label: "Đọc", pct: item.status === "done" ? 100 : meta.readMins > 5 ? 60 : 100, color: "bg-blue-400" },
                      { label: "Quiz", pct: meta.quizPct, color: "bg-amber-400" },
                      { label: "Code", pct: meta.codePct, color: "bg-emerald-400" },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="w-7 text-[9px] font-bold text-slate-400">{label}</span>
                        <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 w-6 text-right">{pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Star size={8} className="fill-current" />+{meta.xp} XP
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <Clock size={8} />{meta.readMins} phút
                    </span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => { setView("chapterAssignments"); setSelectedChapterAssignment(0); }}
              className="lesson-outline-item w-full flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-200 hover:text-blue-700 transition"
            >
              <Lock size={13} className="text-slate-400 shrink-0" />
              <span>Bài tập cuối chương</span>
            </button>

            <button
              onClick={() => { setView("lesson"); setTab("mindmap"); }}
              className={`lesson-outline-item w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                view === "lesson" && tab === "mindmap"
                  ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              <span>Mindmap Tổng hợp</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 pt-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                {view === "lesson" ? `Bài ${lesson.id}` : "Cuối chương 1"}
              </div>
              <h2 className="text-lg font-semibold text-slate-950">
                {view === "lesson" ? lesson.title : "Bài tập cuối chương"}
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {view === "lesson" ? "Quiz yêu cầu ≥ 70%" : "Nộp trực tiếp tại đây"}
            </span>
          </div>
          {view === "lesson" && <div className="flex gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === item.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {view === "chapterAssignments" && (
            <div className="grid max-w-5xl grid-cols-[280px_minmax(0,1fr)] gap-4">
              <div className="surface rounded-xl p-4">
                <h3 className="text-base font-semibold text-slate-950">Danh sách đề</h3>
                <div className="mt-4 space-y-2">
                  {chapterAssignments.map((assignment, index) => {
                    const status = assignmentStatuses[assignment.id] ?? "not-submitted";
                    const statusInfo = assignmentStatusConfig[status];
                    return (
                    <button
                      key={assignment.id}
                      onClick={() => setSelectedChapterAssignment(index)}
                      className={`w-full rounded-lg border p-3 text-left ${
                        selectedChapterAssignment === index ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono text-xs text-blue-700">{assignment.id}</div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{assignment.title}</div>
                    </button>
                    );
                  })}
                </div>
              </div>

              <div className="surface rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-blue-700">{chapterAssignment.id}</div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">{chapterAssignment.title}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${chapterAssignmentStatusInfo.className}`}>
                    {chapterAssignmentStatusInfo.label}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{chapterAssignment.prompt}</p>

                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Trạng thái review</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{chapterAssignmentStatusInfo.desc}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {chapterAssignmentStatus === "not-submitted" ? "Chưa có lịch sử" : "Cập nhật gần nhất: hôm nay"}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {assignmentReviewSteps.map((status, index) => {
                      const activeIndex = assignmentReviewSteps.indexOf(chapterAssignmentStatus);
                      const active = status === chapterAssignmentStatus;
                      const passed = index < activeIndex && chapterAssignmentStatus !== "needs-revision";
                      const info = assignmentStatusConfig[status];
                      return (
                        <div
                          key={status}
                          className={`rounded-lg border p-2 text-center text-[11px] font-bold transition ${
                            active ? info.className : passed ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        >
                          {info.label}
                        </div>
                      );
                    })}
                  </div>
                  {chapterAssignmentStatus === "needs-revision" && (
                    <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                      Giảng viên góp ý: bổ sung ví dụ chạy demo và mô tả rõ hơn phần override trong README trước khi gửi lại.
                    </div>
                  )}
                  {chapterAssignmentStatus === "approved" && (
                    <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">
                      Bài đã đạt yêu cầu. XP chương sẽ được cộng vào tiến độ tổng.
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Yêu cầu nộp</div>
                  <div className="mt-3 grid gap-2">
                    {chapterAssignment.requirements.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <input
                    placeholder="Dán link GitHub, ảnh mindmap hoặc link canvas..."
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                  <textarea
                    rows={5}
                    placeholder="Ghi chú ngắn cho giảng viên..."
                    className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() =>
                      setAssignmentStatuses((current) => ({
                        ...current,
                        [chapterAssignment.id]: "pending-review",
                      }))
                    }
                    className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Upload size={15} />
                    {chapterAssignmentStatus === "needs-revision" ? "Gửi lại bài" : chapterAssignmentStatus === "pending-review" ? "Cập nhật bài nộp" : "Nộp bài tập"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === "lesson" && tab === "lecture" && (
            <article className="surface max-w-5xl rounded-xl p-6">
              <div className="mb-5 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  ["full", "Bài đọc đầy đủ"],
                  ["summary", "Ý chính"],
                  ["resources", "Đọc thêm"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setReadingMode(id as ReadingMode)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${readingMode === id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {readingMode === "full" && (
                <div>
                  <div className="mb-5 rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                    Mục tiêu: nắm được {lesson.topic.toLowerCase()} và áp dụng vào ví dụ Java ngắn.
                  </div>
                  {/* ── ENHANCED AUDIO PLAYER ─────────────────────────────── */}
                  <div className="audio-reader mb-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                    {/* Top row: play button + title + speed selector */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAudioPlaying((v) => !v)}
                          className="theme-primary-bg flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg hover:opacity-90 transition shrink-0"
                        >
                          {audioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <Headphones size={14} className="theme-primary-text" />
                            Giọng đọc bài học
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">Auditory mode · giọng Nam ấm</div>
                        </div>
                      </div>
                      {/* Speed buttons */}
                      <div className="flex items-center gap-1">
                        {["0.75x", "1x", "1.25x", "1.5x"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setAudioSpeed(s)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition border ${
                              audioSpeed === s
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-blue-300"
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>

                    {/* Waveform + timeline */}
                    <div className="mt-3 space-y-2">
                      {/* Waveform animation */}
                      <div className={`audio-wave ${audioPlaying ? "audio-wave-playing" : ""}`} aria-hidden="true">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <span key={i} style={{ height: `${10 + ((i * 13 + 7) % 30)}px` }} />
                        ))}
                      </div>
                      {/* Scrubber */}
                      <input
                        type="range" min={0} max={100}
                        value={Math.round(audioProgress * 100)}
                        onChange={(e) => { setAudioProgress(Number(e.target.value) / 100); }}
                        className="w-full h-1.5 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{Math.floor(audioProgress * 252 / 60)}:{String(Math.floor(audioProgress * 252) % 60).padStart(2,"0")}</span>
                        <span>4:12</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Bài đọc đầy đủ</h3>
                  <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">{lesson.full}</p>
                  <pre className="mt-6 overflow-hidden rounded-xl bg-slate-950 p-6 text-base leading-8 text-slate-100 border border-slate-800">
{`Animal pet = new Dog();
pet.speak(); // In ra "Woof" vì đối tượng thật là Dog`}
                  </pre>
                </div>
              )}

              {readingMode === "summary" && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Ý chính cần nắm</h3>
                  <div className="mt-5 grid gap-4">
                    {lesson.summary.map(([term, desc]) => (
                      <div key={term} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                        <div className="font-mono text-base font-bold text-blue-750 dark:text-blue-400">{term}</div>
                        <div className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-300">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {readingMode === "resources" && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Tài liệu đọc thêm</h3>
                  <div className="mt-5 space-y-4">
                    {[
                      ["Oracle Java Tutorial", "Tài liệu nền tảng về OOP trong Java."],
                      ["Effective Java", "Gợi ý thiết kế để tận dụng kế thừa và đa hình tốt hơn."],
                      ["Refactoring Guru", "Ví dụ thực tế biến if/else thành đa hình."],
                    ].map(([title, desc]) => (
                      <div key={title} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <ExternalLink size={16} className="text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{title}</div>
                          <div className="text-xs text-slate-500">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}

          {view === "lesson" && tab === "video" && (
            <div className="surface max-w-5xl rounded-xl p-6">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,.45),transparent_35%),radial-gradient(circle_at_72%_60%,rgba(15,118,110,.35),transparent_32%)]" />
                <div className="absolute inset-x-8 bottom-8">
                  <div className="mb-4 text-sm font-medium text-blue-200">AI generated lesson video</div>
                  <div className="text-2xl font-semibold text-white">{lesson.topic}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[38%] rounded-full bg-white" />
                  </div>
                </div>
                <button className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
                  <Play size={26} fill="currentColor" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>Thời lượng 4:32 phút</span>
                <span>Được tạo từ tài liệu chương 1</span>
              </div>
            </div>
          )}

          {/* ── GAMIFIED QUIZ ─────────────────────────────────────────── */}
          {view === "lesson" && tab === "quiz" && (
            <div className="surface max-w-4xl rounded-xl p-6 relative overflow-hidden" ref={quizConfettiRef}>
              {/* confetti keyframe injected once */}
              <style>{`@keyframes confetti-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(140px) rotate(360deg);opacity:0}}`}</style>

              {quizDone ? (
                /* ── Results screen ── */
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Star size={32} className="fill-white text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quiz hoàn thành!</h3>
                  <p className="text-sm text-slate-500">Bạn đã trả lời xong {quizQuestions.length} câu hỏi.</p>
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-8 py-4">
                    <div className="text-3xl font-black text-amber-600">+{totalXpEarned} XP</div>
                    <div className="text-xs text-amber-600 mt-1">Đã tích lũy trong phiên này</div>
                  </div>
                  <button
                    onClick={startQuiz}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
                  >
                    <RotateCcw size={15} /> Làm lại Quiz
                  </button>
                </div>
              ) : !timerRunning && quizTimer === 30 ? (
                /* ── Start screen ── */
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Zap size={30} className="text-white fill-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quiz Bài {lesson.id}</h3>
                  <p className="text-sm text-slate-500 max-w-xs">{quizQuestions.length} câu · 30 giây mỗi câu · Streak combo nhân đôi XP!</p>
                  <button
                    onClick={startQuiz}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition shadow-lg"
                  >
                    <PlayCircle size={18} /> Bắt đầu Quiz
                  </button>
                </div>
              ) : (
                /* ── Active question ── */
                <div>
                  {/* Header: progress + timer + streak */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Câu {quizIndex + 1}/{quizQuestions.length}</span>
                      <div className="flex gap-1">
                        {quizQuestions.map((_, i) => (
                          <span key={i} className={`h-1.5 w-6 rounded-full transition ${
                            i < quizIndex ? "bg-emerald-400" : i === quizIndex ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                          }`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {quizStreak >= 2 && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-black text-orange-600 dark:text-orange-400 animate-pulse">
                          <Zap size={9} className="fill-current" /> STREAK ×{quizStreak}
                        </span>
                      )}
                      {/* Countdown ring */}
                      <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                        quizTimer <= 10 ? "border-red-400 text-red-500" : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      }`}>
                        <span className="text-[11px] font-black">{quizTimer}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">{currentQuestion.q}</h3>

                  <div className="mt-4 space-y-2.5">
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedOption === option.id;
                      const isCorrect = option.id === currentQuestion.correct;
                      let cls = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300";
                      if (isSelected && !submitted) cls = "border-blue-500 bg-blue-50 dark:bg-blue-950/40";
                      if (submitted && isCorrect) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
                      if (submitted && isSelected && !isCorrect) cls = "border-red-400 bg-red-50 dark:bg-red-950/40";
                      return (
                        <button
                          key={option.id}
                          disabled={submitted}
                          onClick={() => setSelectedOption(option.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${cls}`}
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            submitted && isCorrect ? "bg-emerald-500 text-white" :
                            submitted && isSelected && !isCorrect ? "bg-red-400 text-white" :
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>{option.id.toUpperCase()}</span>
                          <span className={`flex-1 text-sm ${
                            submitted && isCorrect ? "font-semibold text-emerald-800 dark:text-emerald-300" :
                            submitted && isSelected && !isCorrect ? "text-red-700 dark:text-red-400" :
                            "text-slate-700 dark:text-slate-300"
                          }`}>{option.text}</span>
                          {submitted && isCorrect && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                          {submitted && isSelected && !isCorrect && <X size={16} className="text-red-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* AI Explanation after submit */}
                  {submitted && (
                    <div className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
                      selectedOption === currentQuestion.correct
                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Bot size={14} className={selectedOption === currentQuestion.correct ? "text-emerald-600" : "text-red-500"} />
                        <span className={`text-xs font-bold ${
                          selectedOption === currentQuestion.correct ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {selectedOption === currentQuestion.correct
                            ? `✅ Chính xác! +${quizStreak >= 2 ? 30 : 15} XP${quizStreak >= 2 ? " (Streak ×2 🔥)" : ""}`
                            : "❌ Chưa đúng rồi — đừng nản nhé!"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-5">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    {!submitted ? (
                      <button
                        onClick={submitQuiz}
                        disabled={!selectedOption}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 transition hover:bg-blue-700"
                      >
                        Xác nhận <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={nextQuizQuestion}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
                      >
                        {quizIndex + 1 >= quizQuestions.length ? "Xem kết quả" : "Câu tiếp theo"} <ChevronRight size={16} />
                      </button>
                    )}
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Star size={11} className="fill-current" /> {totalXpEarned} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "lesson" && tab === "mindmap" && (
            <div className="surface rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Mindmap Canvas</h3>
                  <p className="mt-1 text-sm text-slate-500">Học viên tự vẽ sơ đồ tư duy cho bài {lesson.id}. Vẽ xong bấm AI Review để nhận góp ý.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addMindmapNode}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                  >
                    <GitBranch size={15} />
                    Thêm node
                  </button>
                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                    <WandSparkles size={15} />
                    AI Review
                  </button>
                </div>
              </div>

              <div className="mindmap-flow-shell relative h-[560px] overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
                <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-white/10 bg-black/35 px-5 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-mono text-sm font-semibold text-slate-300">mindmap / oop-flow</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-500">
                    {["concepts", "runtime", "review"].map((item) => (
                      <span key={item} className="rounded-full border border-white/10 px-2 py-1">{item}</span>
                    ))}
                  </div>
                </div>

                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={mindmapNodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  fitView
                  minZoom={0.55}
                  maxZoom={1.45}
                  defaultEdgeOptions={{
                    type: "bezier",
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { strokeWidth: 2.2, stroke: "#64748b" },
                  }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={30} color="rgba(148,163,184,.13)" />
                  <MiniMap pannable zoomable />
                  <Controls />
                </ReactFlow>

                <div className="absolute bottom-6 left-8 z-10 w-72 rounded-lg border border-red-300/35 bg-black/55 p-3 font-mono text-[11px] leading-5 text-red-100 shadow-xl">
                  <div className="text-red-300">AI notes</div>
                  <div>extends = quan hệ is-a</div>
                  <div>override = thay đổi hành vi</div>
                  <div>runtime dispatch phụ thuộc object thật</div>
                </div>

                <div className="absolute bottom-6 right-8 z-10 w-72 rounded-lg border border-white/10 bg-black/55 p-4 shadow-xl">
                  <div className="text-sm font-semibold text-slate-100">AI Review</div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Sơ đồ đã có đủ lớp cha, lớp con và luồng runtime. Nên bổ sung ví dụ super() để thấy rõ thứ tự khởi tạo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── SPLIT-VIEW CODE LAB ────────────────────────────────────────── */}
          {view === "lesson" && tab === "code" && (
            <div className="surface overflow-hidden rounded-xl flex flex-col" style={{ minHeight: "520px" }}>
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">Main.java</span>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">Code Lab</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runAiReview}
                    disabled={aiReviewLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 disabled:opacity-60 transition"
                  >
                    <Bot size={13} />
                    {aiReviewLoading ? "AI đang phân tích..." : "Chạy thử AI"}
                  </button>
                  <button
                    onClick={runCode}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <PlayCircle size={13} />
                    Chạy ▶
                  </button>
                </div>
              </div>

              {/* Split body */}
              <div className="flex flex-1 min-h-0">
                {/* LEFT: Editor with line numbers */}
                <div className="flex flex-1 bg-slate-950 overflow-auto">
                  {/* Line numbers */}
                  <div className="select-none text-right px-3 pt-4 pb-4 font-mono text-xs leading-7 text-slate-600 border-r border-slate-800 shrink-0">
                    {codeValue.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  {/* Code textarea */}
                  <textarea
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    spellCheck={false}
                    className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-7 text-slate-100 outline-none min-w-0"
                    style={{ tabSize: 2 }}
                  />
                </div>

                {/* RIGHT: Output panel */}
                <div className="w-72 shrink-0 flex flex-col border-l border-slate-800 bg-slate-950">
                  {/* Console header */}
                  <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 shrink-0">
                    <Code2 size={12} className="text-emerald-400" />
                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">Console Output</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {consoleOutput.map((line, i) => (
                      <div
                        key={i}
                        className={`font-mono text-xs leading-5 ${
                          line.startsWith("$") ? "text-slate-400" :
                          line.includes("error") || line.includes("Error") ? "text-red-400" :
                          line === "" ? "h-3" :
                          "text-emerald-300"
                        }`}
                      >{line}</div>
                    ))}
                  </div>

                  {/* AI Review panel */}
                  {(aiReviewLines.length > 0 || aiReviewLoading) && (
                    <div className="border-t border-slate-800 p-3 space-y-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot size={11} className="text-purple-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">AI Code Review</span>
                        {aiReviewLoading && <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse ml-auto" />}
                      </div>
                      {aiReviewLines.map((line, i) => (
                        <div key={i} className="font-mono text-[10px] leading-4 text-slate-300">{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 bg-slate-900 px-4 py-2 text-[10px] text-slate-500 shrink-0">
                Code Lab · Luyện tập tại đây, nộp bài chương tại mục "Bài tập cuối chương"
              </div>
            </div>
          )}
        </div>
      </main>

      {mentorCollapsed ? (
        <aside className={`ai-mentor-panel chat-skin-${chatSkin} mentor-${mentorMascot} flex min-h-0 flex-col items-center border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 gap-4 shrink-0`} style={{ width: "52px" }}>
          <button
            onClick={() => setMentorCollapsed(false)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Mở rộng khung Mentor"
          >
            <ChevronsLeft size={15} />
          </button>
          <button
            onClick={() => setMentorCollapsed(false)}
            className={`ai-mentor-avatar ${mentor.color} flex h-10 w-10 items-center justify-center rounded-xl text-white text-2xl hover:scale-105 transition shadow-lg animate-bounce`}
            title="Mở rộng chat"
          >
            {mentor.emoji}
          </button>
        </aside>
      ) : (
        <aside className={`ai-mentor-panel chat-skin-${chatSkin} mentor-${mentorMascot} flex min-h-0 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300`}>
          <div className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`ai-mentor-avatar ${mentor.color} flex h-10 w-10 items-center justify-center rounded-xl text-white text-2xl`}>
                  {mentor.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {mentor.name}
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-955/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">online</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{mentor.mode} · VAK aware</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <Wand2 size={15} />
                </button>
                <button
                  onClick={() => setMentorCollapsed(true)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  title="Thu nhỏ khung Mentor"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955/20 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">Đang theo dõi</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-200">{lesson.title}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Sai nhiều ở `super()` và override
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((item, index) => {
              const isMentorMessage = item.from === "mentor";
              return (
                <div key={index} className={`flex gap-2 ${isMentorMessage ? "items-start" : "items-start justify-end"}`}>
                  {isMentorMessage && (
                    <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${mentor.color} text-white text-sm`}>
                      {mentor.emoji}
                    </span>
                  )}
                  <div className={`ai-bubble max-w-[230px] rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                    isMentorMessage
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      : "theme-primary-bg text-white"
                  }`}>
                    {item.text}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles size={14} className="theme-primary-text" />
              {mentor.hint}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {mentorQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    sendMessage(prompt);
                  }}
                  className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="ai-input flex gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 shadow-sm">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                placeholder="Hỏi mentor..."
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none text-slate-800 dark:text-white"
              />
              <span className="hidden items-center gap-1 px-1 text-[11px] text-slate-400 xl:flex">
                <CornerDownLeft size={12} />
                Enter
              </span>
              <button onClick={() => sendMessage()} className="theme-primary-bg flex h-9 w-9 items-center justify-center rounded-xl text-white">
                <Send size={16} />
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

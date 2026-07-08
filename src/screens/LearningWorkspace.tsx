import { useCallback, useState } from "react";
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
  Volume2,
  WandSparkles,
} from "lucide-react";
import type { ChatSkin, MentorMascot } from "../App";

interface LearningWorkspaceProps {
  mentorMascot: MentorMascot;
  chatSkin: ChatSkin;
}

type Tab = "lecture" | "video" | "quiz" | "mindmap" | "code";
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

const quizOptions = [
  { id: "a", text: "Lớp con nhận thuộc tính và hành vi từ lớp cha" },
  { id: "b", text: "Lớp cha tự động sao chép toàn bộ lớp con" },
  { id: "c", text: "Hai lớp ngang hàng dùng chung biến toàn cục" },
  { id: "d", text: "Một lớp chỉ có thể chứa phương thức static" },
];

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

const mentorConfig: Record<MentorMascot, { name: string; mark: string; mode: string; hint: string }> = {
  mino: { name: "Mino", mark: "MI", mode: "thân thiện", hint: "Mình đi chậm từng bước nhé." },
  nova: { name: "Nova", mark: "NV", mode: "nghiêm túc", hint: "Tập trung vào lỗi cốt lõi trước." },
  byte: { name: "Byte", mark: "BY", mode: "vui tính", hint: "Bẻ lỗi nhỏ trước, lên XP sau." },
  sage: { name: "Sage", mark: "SG", mode: "Socratic", hint: "Mentor sẽ hỏi ngược để bạn tự tìm ra lỗi." },
};

export default function LearningWorkspace({ mentorMascot, chatSkin }: LearningWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("lecture");
  const [view, setView] = useState<WorkspaceView>("lesson");
  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [selectedLesson, setSelectedLesson] = useState(2);
  const [selectedChapterAssignment, setSelectedChapterAssignment] = useState(0);
  const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, AssignmentReviewStatus>>({
    "CH1-BT01": "needs-revision",
    "CH1-BT02": "pending-review",
    "CH1-BT03": "not-submitted",
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
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
    <div className="grid h-full grid-cols-[232px_minmax(0,1fr)_310px]">
      <aside className="border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chương 1</div>
          <h1 className="mt-1 text-lg font-semibold text-slate-950">Kế thừa và đa hình</h1>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[46%] rounded-full bg-blue-600" />
          </div>
          <div className="mt-2 text-xs text-slate-500">2/7 mục đã hoàn thành</div>
        </div>

        <div className="space-y-1 p-3">
          {lessons.map((item, index) => {
            const active = selectedLesson === index && tab !== "mindmap";
            return (
              <button
                key={item.id}
                onClick={() => selectLesson(index)}
                className={`lesson-outline-item flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                {item.status === "done" ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Play size={16} className="text-blue-600" />}
                <span className="leading-tight">{item.id} {item.title}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setView("chapterAssignments");
              setSelectedChapterAssignment(0);
            }}
            className="lesson-outline-item flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Lock size={16} className="text-slate-400" />
            <span className="leading-tight">Bài tập cuối chương</span>
          </button>

          <button
            onClick={() => {
              setView("lesson");
              setTab("mindmap");
            }}
            className={`lesson-outline-item flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
              view === "lesson" && tab === "mindmap"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sparkles size={16} className="text-amber-600" />
            <span className="leading-tight">Mindmap</span>
          </button>
        </div>
      </aside>

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
            <article className="surface max-w-3xl rounded-xl p-5">
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
                  <div className="audio-reader mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAudioPlaying((value) => !value)}
                          className="theme-primary-bg flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
                        >
                          {audioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                            <Headphones size={15} className="theme-primary-text" />
                            Giọng đọc bài học
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">Auditory mode · giọng Nam ấm · 1.15x</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">4:12</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">Tự động nhấn ý chính</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
                      <div className={`audio-wave ${audioPlaying ? "audio-wave-playing" : ""}`} aria-hidden="true">
                        {Array.from({ length: 30 }).map((_, index) => (
                          <span key={index} style={{ height: `${18 + ((index * 17) % 34)}px` }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Volume2 size={14} />
                        82%
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">Bài đọc đầy đủ</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{lesson.full}</p>
                  <pre className="mt-5 overflow-hidden rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">
{`Animal pet = new Dog();
pet.speak(); // In ra "Woof" vì đối tượng thật là Dog`}
                  </pre>
                </div>
              )}

              {readingMode === "summary" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Ý chính cần nắm</h3>
                  <div className="mt-4 grid gap-3">
                    {lesson.summary.map(([term, desc]) => (
                      <div key={term} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="font-mono text-sm font-semibold text-blue-700">{term}</div>
                        <div className="mt-1 text-sm text-slate-600">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {readingMode === "resources" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Tài liệu đọc thêm</h3>
                  <div className="mt-4 space-y-3">
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
            <div className="surface max-w-3xl rounded-xl p-5">
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

          {view === "lesson" && tab === "quiz" && (
            <div className="surface max-w-2xl rounded-xl p-5">
              <div className="text-sm font-semibold text-blue-700">Câu 1/3</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Kế thừa trong OOP là gì?</h3>
              <div className="mt-6 space-y-3">
                {quizOptions.map((option) => (
                  <button
                    key={option.id}
                    disabled={submitted}
                    onClick={() => setSelectedOption(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                      selectedOption === option.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                    } ${submitted && option.id === "a" ? "border-emerald-500 bg-emerald-50" : ""}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-mono text-sm font-semibold text-slate-500">
                      {option.id.toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{option.text}</span>
                    {submitted && option.id === "a" && <CheckCircle2 size={18} className="text-emerald-600" />}
                  </button>
                ))}
              </div>
              {!submitted ? (
                <button
                  onClick={() => selectedOption && setSubmitted(true)}
                  disabled={!selectedOption}
                  className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Xác nhận
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Chính xác. Kế thừa là cơ chế lớp con nhận thuộc tính và hành vi từ lớp cha. +15 XP
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

          {view === "lesson" && tab === "code" && (
            <div className="surface max-w-3xl overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <div>
                  <span className="font-mono text-sm text-slate-600">Main.java</span>
                  <div className="mt-1 text-xs text-slate-500">Code lab chỉ để luyện tập trong bài học, không phải nơi nộp bài cuối chương.</div>
                </div>
                <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">Chạy thử</button>
              </div>
              <textarea
                rows={16}
                defaultValue={`class Animal {
  void speak() {
    System.out.println("...");
  }
}

class Dog extends Animal {
  // TODO: override speak()
}`}
                className="w-full resize-none bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-100 outline-none"
              />
              <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 font-mono text-xs text-emerald-300">
                Ready. Output will appear here.
              </div>
            </div>
          )}
        </div>
      </main>

      <aside className={`ai-mentor-panel chat-skin-${chatSkin} mentor-${mentorMascot} flex min-h-0 flex-col border-l border-slate-200 bg-white`}>
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="ai-mentor-avatar theme-primary-bg flex h-10 w-10 items-center justify-center rounded-xl text-white">
                {mentor.mark}
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  {mentor.name}
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">online</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{mentor.mode} · VAK aware</div>
              </div>
            </div>
            <button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
              <Wand2 size={15} />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">Đang theo dõi</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{lesson.title}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
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
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <span className="text-[10px] font-black">{mentor.mark}</span>
                  </span>
                )}
                <div className={`ai-bubble max-w-[230px] rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                  isMentorMessage ? "bg-slate-100 text-slate-700" : "theme-primary-bg text-white"
                }`}>
                  {item.text}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            <Sparkles size={14} className="theme-primary-text" />
            {mentor.hint}
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {mentorQuickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  sendMessage(prompt);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="ai-input flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
              placeholder="Hỏi mentor..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
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
    </div>
  );
}

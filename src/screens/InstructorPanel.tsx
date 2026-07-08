import { useState, useCallback, useEffect, useRef } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Eye,
  Flag,
  GitFork,
  Plus,
  Upload,
  WandSparkles,
  Save,
  X,
  Play,
  Trash2,
  Edit,
  FileText,
  HelpCircle,
  Check,
  Sparkles,
  Loader2,
  Network,
  Brain,
  Code2,
  Send,
  Bot,
  GraduationCap
} from "lucide-react";
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

// --- TYPES ---
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

interface VideoScene {
  id: string;
  title: string;
  text: string;
  script: string;
}

interface LessonContent {
  reading: string;
  videoScenes: VideoScene[];
  quizzes: QuizQuestion[];
}

interface DocumentFile {
  name: string;
  size: string;
  uploadedAt: string;
}

interface Lesson {
  id: string;
  title: string;
  status: "Đã phát hành" | "Bản nháp";
  isGenerated: boolean;
  documents: DocumentFile[];
  content: LessonContent;
}

interface Assignment {
  id: string;
  type: "mindmap" | "github" | "quiz" | "code_lab";
  title: string;
  description: string;
  isRequired: boolean;
  points: number;
  repoTemplate?: string;
}

interface Chapter {
  id: string;
  title: string;
  status: "Đã phát hành" | "Bản nháp";
  lessons: Lesson[];
  assignments: Assignment[];
  mindmapNodes?: Node[];
  mindmapEdges?: Edge[];
  mindmapGenerated?: boolean;
}

interface CourseClass {
  id: string;
  code: string;
  name: string;
  chapters: Chapter[];
}

interface MindmapNodeData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  tag: string;
  tone: "source" | "concept" | "practice" | "review";
}

type Tab = "syllabus" | "github-review" | "mindmap" | "analytics";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

// --- CUSTOM REACT FLOW NODE ---
function MindmapNode({ data, selected }: NodeProps<Node & { data: MindmapNodeData }>) {
  return (
    <div className={`mindmap-flow-node mindmap-flow-node-${data.tone} ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 shadow-2xl scale-[1.03]' : ''} transition-all duration-150`}>
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

// --- DEFAULT COURSES MOCK DATA ---
const initialClasses: CourseClass[] = [
  {
    id: "class-oop",
    code: "CM-OOP-2026-01",
    name: "Lập trình hướng đối tượng (OOP)",
    chapters: [
      {
        id: "oop-ch1",
        title: "Chương 1: Kế thừa (Inheritance)",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "node-1",
            type: "mindmapNode",
            position: { x: 50, y: 150 },
            data: { title: "Lớp Animal", subtitle: "Lớp cha tổng quát (Superclass)", tag: "SUPERCLASS", tone: "source" },
            style: { width: 190 }
          },
          {
            id: "node-2",
            type: "mindmapNode",
            position: { x: 320, y: 50 },
            data: { title: "Lớp Dog", subtitle: "Lớp con cụ thể (Subclass)", tag: "SUBCLASS", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "node-3",
            type: "mindmapNode",
            position: { x: 320, y: 250 },
            data: { title: "Lớp Cat", subtitle: "Lớp con cụ thể (Subclass)", tag: "SUBCLASS", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "node-4",
            type: "mindmapNode",
            position: { x: 590, y: 50 },
            data: { title: "Từ khóa extends", subtitle: "Khai báo mối quan hệ kế thừa", tag: "KEYWORD", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "node-5",
            type: "mindmapNode",
            position: { x: 590, y: 250 },
            data: { title: "Từ khóa super", subtitle: "Gọi constructor/phương thức cha", tag: "KEYWORD", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "node-6",
            type: "mindmapNode",
            position: { x: 860, y: 150 },
            data: { title: "Ghi đè (Override)", subtitle: "Định nghĩa lại phương thức cha", tag: "POLYMORPHISM", tone: "practice" },
            style: { width: 190 }
          },
          {
            id: "node-7",
            type: "mindmapNode",
            position: { x: 1120, y: 150 },
            data: { title: "Dự án thực hành", subtitle: "Xây dựng hệ thống quản lý động vật", tag: "PROJECT", tone: "review" },
            style: { width: 190 }
          }
        ],
        mindmapEdges: [
          { id: "e1-2", source: "node-1", target: "node-2", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e1-3", source: "node-1", target: "node-3", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e2-4", source: "node-2", target: "node-4", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e3-4", source: "node-3", target: "node-4", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e2-5", source: "node-2", target: "node-5", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e3-5", source: "node-3", target: "node-5", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e4-6", source: "node-4", target: "node-6", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e5-6", source: "node-5", target: "node-6", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "e6-7", source: "node-6", target: "node-7", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } }
        ],
        lessons: [
          {
            id: "oop-ch1-l1",
            title: "1.1 Khái niệm kế thừa",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "ly_thuyet_ke_thua.docx", size: "48 KB", uploadedAt: "08/07/2026" }],
            content: {
              reading: "Kế thừa (Inheritance) là một trong 4 tính chất cốt lõi của lập trình hướng đối tượng. Nó cho phép một lớp mới (lớp con - Subclass) tái sử dụng mã nguồn và mở rộng các thuộc tính, phương thức của một lớp đã có sẵn (lớp cha - Superclass).\n\nLợi ích:\n- Tái sử dụng mã nguồn, tránh trùng lặp code.\n- Tạo ra mối quan hệ thừa kế phân cấp giữa các đối tượng.\n- Hỗ trợ tính đa hình (Polymorphism) bằng cách ghi đè phương thức (Method Overriding).\n\nVí dụ thực tế: Lớp cha Animal có phương thức eat(), lớp con Dog kế thừa Animal và tự động có phương thức eat() mà không cần viết lại.",
              videoScenes: [
                { id: "s1", title: "Phân cảnh 1", text: "Bài giảng 1.1: Khái niệm Kế thừa", script: "Chào mừng các bạn học viên đến với bài học 1.1: Khái niệm kế thừa. Tôi là AI Mentor của các bạn." },
                { id: "s2", title: "Phân cảnh 2", text: "Mối quan hệ Superclass & Subclass", script: "Lớp cha hay Superclass định nghĩa các đặc điểm chung, còn lớp con Subclass kế thừa và chuyên biệt hóa." },
                { id: "s3", title: "Phân cảnh 3", text: "Ví dụ: Animal & Dog", script: "Ví dụ lớp Animal có thuộc tính name. Lớp Dog extends Animal kế thừa name và định nghĩa thêm phương thức bark()." }
              ],
              quizzes: [
                { id: "q1", question: "Lớp con kế thừa lớp cha bằng từ khóa nào trong Java?", options: ["extends", "implements", "inherits", "super"], answer: "extends" },
                { id: "q2", question: "Lớp con có thể truy cập thuộc tính mang phạm vi truy cập nào của lớp cha?", options: ["private", "protected và public", "chỉ public", "tất cả"], answer: "protected và public" }
              ]
            }
          },
          {
            id: "oop-ch1-l2",
            title: "1.2 extends và super",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "extends_super_huong_dan.pdf", size: "124 KB", uploadedAt: "08/07/2026" }],
            content: {
              reading: "Từ khóa 'extends' dùng để khai báo kế thừa một lớp cha. Trong khi đó, từ khóa 'super' là biến tham chiếu đặc biệt dùng để gọi các constructor, phương thức hoặc thuộc tính của lớp cha từ lớp con.\n\nNguyên tắc hoạt động:\n- super() phải là lệnh đầu tiên trong hàm khởi tạo của lớp con.\n- Nếu lớp con không gọi super() rõ ràng, trình biên dịch sẽ tự động chèn super() không tham số.\n- super.methodName() giúp gọi lại phương thức nguyên bản của lớp cha trước khi bị ghi đè.",
              videoScenes: [
                { id: "s1", title: "Phân cảnh 1", text: "Bài giảng 1.2: Sử dụng extends và super", script: "Bài học này sẽ làm rõ cách sử dụng hai từ khóa extends và super trong lập trình hướng đối tượng." },
                { id: "s2", title: "Phân cảnh 2", text: "Constructor chaining", script: "Sử dụng super() để chuyển tiếp đối số khởi tạo lên cha. Nhớ rằng super() phải đứng ở dòng đầu tiên của constructor lớp con." }
              ],
              quizzes: [
                { id: "q1", question: "Lệnh super() phải được đặt ở vị trí nào trong hàm khởi tạo lớp con?", options: ["Dòng đầu tiên", "Dòng cuối cùng", "Vị trí bất kỳ", "Không được dùng trong constructor"], answer: "Dòng đầu tiên" }
              ]
            }
          },
          {
            id: "oop-ch1-l3",
            title: "1.3 Override methods",
            status: "Bản nháp",
            isGenerated: false,
            documents: [],
            content: { reading: "", videoScenes: [], quizzes: [] }
          }
        ],
        assignments: [
          {
            id: "oop-ch1-a1",
            type: "mindmap",
            title: "Thực hành tổng hợp chương (Mindmap Canvas)",
            description: "Hệ thống hóa toàn bộ kiến thức Chương 1 bằng sơ đồ tư duy liên kết các lớp cha con.",
            isRequired: false,
            points: 200
          },
          {
            id: "oop-ch1-a2",
            type: "github",
            title: "Bài tập lớn thực hành GitHub (Repository Submission)",
            description: "Xây dựng hệ thống kế thừa lớp đối tượng Animal, Dog, Cat và các thuộc tính liên quan.",
            isRequired: true,
            points: 100,
            repoTemplate: "https://github.com/code-mind/oop-inheritance-lab"
          }
        ]
      },
      {
        id: "oop-ch2",
        title: "Chương 2: Đa hình (Polymorphism)",
        status: "Bản nháp",
        mindmapGenerated: false,
        lessons: [
          {
            id: "oop-ch2-l1",
            title: "2.1 Đa hình thời gian chạy",
            status: "Bản nháp",
            isGenerated: false,
            documents: [],
            content: { reading: "", videoScenes: [], quizzes: [] }
          }
        ],
        assignments: [
          {
            id: "oop-ch2-a1",
            type: "mindmap",
            title: "Vẽ sơ đồ tư duy Đa hình",
            description: "Hệ thống hóa các mối liên kết đa hình động và đa hình tĩnh trong Java.",
            isRequired: false,
            points: 200
          }
        ]
      }
    ]
  },
  {
    id: "class-dsa",
    code: "CM-DSA-2026-02",
    name: "Cấu trúc dữ liệu & Giải thuật (DSA)",
    chapters: [
      {
        id: "dsa-ch1",
        title: "Chương 1: Sắp xếp & Tìm kiếm",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "dsa-node-1",
            type: "mindmapNode",
            position: { x: 50, y: 150 },
            data: { title: "Sorting Algorithms", subtitle: "Thuật toán sắp xếp danh sách", tag: "ROOT", tone: "source" },
            style: { width: 190 }
          },
          {
            id: "dsa-node-2",
            type: "mindmapNode",
            position: { x: 300, y: 50 },
            data: { title: "Bubble Sort", subtitle: "Sắp xếp nổi bọt (độ phức tạp O(n^2))", tag: "ELEMENTARY", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "dsa-node-3",
            type: "mindmapNode",
            position: { x: 300, y: 250 },
            data: { title: "Quick Sort", subtitle: "Sắp xếp nhanh (độ phức tạp O(n log n))", tag: "ADVANCED", tone: "concept" },
            style: { width: 190 }
          },
          {
            id: "dsa-node-4",
            type: "mindmapNode",
            position: { x: 550, y: 50 },
            data: { title: "Compare & Swap", subtitle: "So sánh và đổi chỗ lân cận", tag: "OPERATION", tone: "practice" },
            style: { width: 190 }
          },
          {
            id: "dsa-node-5",
            type: "mindmapNode",
            position: { x: 550, y: 250 },
            data: { title: "Divide & Conquer", subtitle: "Chia để trị chọn phần tử chốt Pivot", tag: "STRATEGY", tone: "practice" },
            style: { width: 190 }
          }
        ],
        mindmapEdges: [
          { id: "dsa-e1", source: "dsa-node-1", target: "dsa-node-2", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "dsa-e2", source: "dsa-node-1", target: "dsa-node-3", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "dsa-e3", source: "dsa-node-2", target: "dsa-node-4", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
          { id: "dsa-e4", source: "dsa-node-3", target: "dsa-node-5", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } }
        ],
        lessons: [
          {
            id: "dsa-ch1-l1",
            title: "1.1 Thuật toán Bubble Sort",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "bubble_sort_ly_thuyet.docx", size: "32 KB", uploadedAt: "08/07/2026" }],
            content: {
              reading: "Sắp xếp nổi bọt (Bubble Sort) là một thuật toán sắp xếp đơn giản hoạt động bằng cách liên tục đổi chỗ các phần tử liền kề nếu chúng không đúng thứ tự.\n\nÝ tưởng:\n- Duyệt qua mảng nhiều lần.\n- So sánh hai phần tử cạnh nhau, nếu phần tử trước lớn hơn phần tử sau thì đổi chỗ.\n- Sau mỗi vòng lặp, phần tử lớn nhất sẽ 'nổi' lên cuối mảng.\n\nHiệu năng:\n- Độ phức tạp thời gian: O(N^2) trong trường hợp trung bình và xấu nhất.\n- Bộ nhớ phụ trợ: O(1) (sắp xếp tại chỗ - In-place).",
              videoScenes: [
                { id: "s1", title: "Phân cảnh 1", text: "Bubble Sort cơ bản", script: "Hôm nay chúng ta tìm hiểu thuật toán sắp xếp nổi bọt. Đây là thuật toán đơn giản nhất." },
                { id: "s2", title: "Phân cảnh 2", text: "Cách thức hoạt động", script: "So sánh các cặp số cạnh nhau và đẩy số lớn hơn về bên phải." }
              ],
              quizzes: [
                { id: "q1", question: "Độ phức tạp thời gian trung bình của Bubble Sort là bao nhiêu?", options: ["O(N log N)", "O(N)", "O(N^2)", "O(1)"], answer: "O(N^2)" }
              ]
            }
          },
          {
            id: "dsa-ch1-l2",
            title: "1.2 Thuật toán Quick Sort",
            status: "Bản nháp",
            isGenerated: false,
            documents: [],
            content: { reading: "", videoScenes: [], quizzes: [] }
          }
        ],
        assignments: [
          {
            id: "dsa-ch1-a1",
            type: "mindmap",
            title: "Sơ đồ thuật toán Sắp xếp",
            description: "Vẽ sơ đồ so sánh các thuật toán sắp xếp cơ bản và nâng cao (Bubble vs Quick).",
            isRequired: false,
            points: 200
          },
          {
            id: "dsa-ch1-a2",
            type: "github",
            title: "Bài tập thực hành Sorting trên GitHub",
            description: "Cài đặt thuật toán Bubble Sort và Quick Sort theo cấu trúc template.",
            isRequired: true,
            points: 100,
            repoTemplate: "https://github.com/code-mind/dsa-sorting-lab"
          }
        ]
      }
    ]
  }
];

const mockSubmissions = [
  { id: 1, name: "Nguyễn Minh Khôi", status: "plagiarism", score: "41", time: "2 giờ trước", details: "Dự án thực hành kế thừa", explanation: "Lớp Dog kế thừa Animal..." },
  { id: 2, name: "Trần Thị Lan Anh", status: "graded", score: "91", time: "5 giờ trước", details: "Thiết kế kế thừa OOP", explanation: "Học phần kế thừa lớp động vật..." },
  { id: 3, name: "Phạm Văn Đức", status: "commit", score: "62", time: "1 ngày trước", details: "Inheritance Lab", explanation: "Implement extends và super..." },
  { id: 4, name: "Lê Bảo Châu", status: "graded", score: "83", time: "1 ngày trước", details: "Lớp học đa hình và kế thừa", explanation: "Viết class override phương thức..." },
  { id: 5, name: "Võ Ngọc Hà", status: "pending", score: "78", time: "2 ngày trước", details: "Exercise OOP extends", explanation: "Nộp bài tập extends super Animal..." }
];

export default function InstructorPanel() {
  const [classes, setClasses] = useState<CourseClass[]>(initialClasses);
  const [selectedClassId, setSelectedClassId] = useState<string>("class-oop");
  const [tab, setTab] = useState<Tab>("syllabus");

  // GitHub review states
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  // Syllabus management states
  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedLessonChapterId, setSelectedLessonChapterId] = useState<string>("");
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState<Record<string, string>>({});

  // AIGC Generation simulation
  const [aigcStep, setAigcStep] = useState(0);
  const [isAigcRunning, setIsAigcRunning] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"upload" | "reading" | "video" | "quiz">("upload");

  // Lesson Edit values
  const [editReading, setEditReading] = useState("");
  const [editScenes, setEditScenes] = useState<VideoScene[]>([]);
  const [editQuizzes, setEditQuizzes] = useState<QuizQuestion[]>([]);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [videoRenderProgress, setVideoRenderProgress] = useState(0);

  // Chapter Mindmap Editor states
  const [selectedMindmapChapterId, setSelectedMindmapChapterId] = useState<string>("oop-ch1");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isMindmapGenerating, setIsMindmapGenerating] = useState(false);
  const [mindmapStep, setMindmapStep] = useState(0);

  // Assignment states
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedAssignmentChapterId, setSelectedAssignmentChapterId] = useState<string>("");
  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false);
  const [isNewAssignment, setIsNewAssignment] = useState(false);

  // Form states for assignment
  const [assignTitle, setAssignTitle] = useState("");
  const [assignType, setAssignType] = useState<"mindmap" | "github" | "quiz" | "code_lab">("mindmap");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignRequired, setAssignRequired] = useState(false);
  const [assignPoints, setAssignPoints] = useState(200);
  const [assignRepoTemplate, setAssignRepoTemplate] = useState("");

  // AI Analytics & Student Reminders
  const [sentReminders, setSentReminders] = useState<Record<string, boolean>>({});

  // Floating Chatbot Assistant states
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Xin chào thầy/cô! Tôi là Trợ lý AI đồng hành giảng dạy. Thầy/cô cần tôi soạn đề bài tập, tạo thêm câu hỏi quiz hay tóm tắt tình hình học tập lớp mình?",
      timestamp: "23:24"
    }
  ]);
  const [chatbotInput, setChatbotInput] = useState("");
  const [isChatbotTyping, setIsChatbotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Scroll chatbot to bottom when message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatbotTyping]);

  // Sync React Flow nodes/edges when selected chapter for mindmap changes
  useEffect(() => {
    const chapter = activeClass.chapters.find((ch) => ch.id === selectedMindmapChapterId);
    if (chapter && chapter.mindmapGenerated) {
      setNodes(chapter.mindmapNodes || []);
      setEdges(chapter.mindmapEdges || []);
    } else {
      setNodes([]);
      setEdges([]);
    }
    setSelectedNodeId(null);
  }, [selectedMindmapChapterId, selectedClassId, activeClass]);

  // Sync Mindmap Chapter ID when class changes
  useEffect(() => {
    if (activeClass.chapters.length > 0) {
      setSelectedMindmapChapterId(activeClass.chapters[0].id);
    }
  }, [selectedClassId]);

  // Handle Course/Class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSubIndex(null);
    showToast(`Đã chuyển sang lớp ${classes.find(c => c.id === classId)?.name}`, "info");
  };

  // --- SYLLABUS MANAGEMENT ACTIONS ---
  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      title: newChapterTitle,
      status: "Bản nháp",
      mindmapGenerated: false,
      lessons: [],
      assignments: []
    };

    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return { ...c, chapters: [...c.chapters, newChapter] };
      }
      return c;
    }));

    setNewChapterTitle("");
    setShowAddChapter(false);
    showToast("Đã thêm chương học mới thành công!");
  };

  const handleAddLesson = (chapterId: string) => {
    const title = newLessonTitle[chapterId];
    if (!title || !title.trim()) return;

    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: title,
      status: "Bản nháp",
      isGenerated: false,
      documents: [],
      content: { reading: "", videoScenes: [], quizzes: [] }
    };

    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === chapterId) {
              return { ...ch, lessons: [...ch.lessons, newLesson] };
            }
            return ch;
          })
        };
      }
      return c;
    }));

    setNewLessonTitle(prev => ({ ...prev, [chapterId]: "" }));
    showToast("Đã thêm bài học mới!");
  };

  const toggleChapterStatus = (chapterId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === chapterId) {
              const nextStatus = ch.status === "Đã phát hành" ? "Bản nháp" : "Đã phát hành";
              showToast(`Chương học chuyển sang ${nextStatus}`, "info");
              return { ...ch, status: nextStatus };
            }
            return ch;
          })
        };
      }
      return c;
    }));
  };

  const toggleLessonStatus = (chapterId: string, lessonId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === chapterId) {
              return {
                ...ch,
                lessons: ch.lessons.map(l => {
                  if (l.id === lessonId) {
                    const nextStatus = l.status === "Đã phát hành" ? "Bản nháp" : "Đã phát hành";
                    showToast(`Bài học chuyển sang ${nextStatus}`, "info");
                    return { ...l, status: nextStatus };
                  }
                  return l;
                })
              };
            }
            return ch;
          })
        };
      }
      return c;
    }));
  };

  // Open Lesson details for editing/AIGC
  const openLessonDetails = (chapterId: string, lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedLessonChapterId(chapterId);
    setEditReading(lesson.content.reading);
    setEditScenes(lesson.content.videoScenes);
    setEditQuizzes(lesson.content.quizzes);
    setDrawerTab(lesson.isGenerated ? "reading" : "upload");
    setLessonDrawerOpen(true);
  };

  // Mock File Upload Action
  const handleMockUpload = () => {
    if (!selectedLesson) return;
    const mockFile: DocumentFile = {
      name: `tai_lieu_${selectedLesson.title.toLowerCase().replace(/\s+/g, "_")}.docx`,
      size: "72 KB",
      uploadedAt: new Date().toLocaleDateString("vi-VN")
    };

    const updatedLessons = activeClass.chapters.find(ch => ch.id === selectedLessonChapterId)?.lessons.map(l => {
      if (l.id === selectedLesson.id) {
        return { ...l, documents: [mockFile] };
      }
      return l;
    }) || [];

    // Update locally
    setSelectedLesson(prev => prev ? { ...prev, documents: [mockFile] } : null);
    
    // Update global state
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === selectedLessonChapterId) {
              return { ...ch, lessons: updatedLessons };
            }
            return ch;
          })
        };
      }
      return c;
    }));

    showToast("Tải lên tài liệu giáo trình thành công!");
  };

  // Shared Asset Selection Action
  const handleSelectSharedAsset = (name: string, size: string) => {
    if (!selectedLesson) return;
    const assetFile: DocumentFile = {
      name: name,
      size: size,
      uploadedAt: new Date().toLocaleDateString("vi-VN")
    };

    const updatedLessons = activeClass.chapters.find(ch => ch.id === selectedLessonChapterId)?.lessons.map(l => {
      if (l.id === selectedLesson.id) {
        return { ...l, documents: [assetFile] };
      }
      return l;
    }) || [];

    setSelectedLesson(prev => prev ? { ...prev, documents: [assetFile] } : null);
    
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === selectedLessonChapterId) {
              return { ...ch, lessons: updatedLessons };
            }
            return ch;
          })
        };
      }
      return c;
    }));

    showToast(`Đã chọn học liệu "${name}" từ thư viện dùng chung!`);
  };


  // Run AI generation pipeline
  const runAigcPipeline = () => {
    if (!selectedLesson || selectedLesson.documents.length === 0) return;
    
    setIsAigcRunning(true);
    setAigcStep(1);

    const interval = setInterval(() => {
      setAigcStep(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          setTimeout(() => {
            setIsAigcRunning(false);
            
            // Populating mock generated content
            const generatedReading = `Bài tóm tắt học thuật tự động bằng AI cho bài học "${selectedLesson.title}":\n\nNội dung chính:\n1. Phân tích chi tiết về khái niệm cốt lõi của chủ đề và liên kết thực tiễn.\n2. Các cấu trúc quan trọng, cú pháp và hướng dẫn thực thi mã nguồn chi tiết.\n3. Tổng hợp những lưu ý quan trọng cần tránh khi thiết kế và tối ưu logic.\n\nHọc viên cần đọc kỹ hướng dẫn này, xem video slide và trả lời quiz trắc nghiệm để mở khoá bài tiếp theo.`;
            const generatedScenes: VideoScene[] = [
              { id: "s1", title: "Slide 1: Tổng quan", text: `Chủ đề: ${selectedLesson.title}`, script: `Xin chào các bạn học viên, hôm nay AI Mentor sẽ đồng hành cùng các bạn để tìm hiểu bài học: ${selectedLesson.title}.` },
              { id: "s2", title: "Slide 2: Lý thuyết cốt lõi", text: "Khái niệm chính & Cách cài đặt logic", script: "Chúng ta sẽ đi sâu phân tích cơ chế hoạt động, cú pháp viết mã và các phương án tổ chức cấu trúc dữ liệu tối ưu nhất." },
              { id: "s3", title: "Slide 3: Thực hành và Lưu ý", text: "Demo code & Quét lỗi logic", script: "Hãy ghi nhớ các lỗi sai thường gặp để bảo vệ tính nhất quán cho chương trình của bạn." }
            ];
            const generatedQuizzes: QuizQuestion[] = [
              { id: "q-ai-1", question: `Nội dung cốt lõi của bài "${selectedLesson.title}" tập trung vào điều gì?`, options: ["Cài đặt cơ bản", "Đặc tính nâng cao & Tối ưu", "Cú pháp và Nguyên lý cốt lõi", "Cả 3 phương án trên"], answer: "Cả 3 phương án trên" },
              { id: "q-ai-2", question: "AI khuyên điều gì khi triển khai phần thực hành chủ đề này?", options: ["Không cần vẽ sơ đồ", "Vẽ mindmap chuẩn hóa logic trước khi viết code", "Chỉ cần viết code chạy được", "Bỏ qua các cảnh báo warning"], answer: "Vẽ mindmap chuẩn hóa logic trước khi viết code" }
            ];

            setEditReading(generatedReading);
            setEditScenes(generatedScenes);
            setEditQuizzes(generatedQuizzes);
            setDrawerTab("reading");

            // Update state
            setClasses(prev => prev.map(c => {
              if (c.id === selectedClassId) {
                return {
                  ...c,
                  chapters: c.chapters.map(ch => {
                    if (ch.id === selectedLessonChapterId) {
                      return {
                        ...ch,
                        lessons: ch.lessons.map(l => {
                          if (l.id === selectedLesson.id) {
                            return {
                              ...l,
                              isGenerated: true,
                              content: {
                                reading: generatedReading,
                                videoScenes: generatedScenes,
                                quizzes: generatedQuizzes
                              }
                            };
                          }
                          return l;
                        })
                      };
                    }
                    return ch;
                  })
                };
              }
              return c;
            }));

            // Sync drawer lesson
            setSelectedLesson(prev => prev ? {
              ...prev,
              isGenerated: true,
              content: { reading: generatedReading, videoScenes: generatedScenes, quizzes: generatedQuizzes }
            } : null);

            showToast("AI đã tự động sinh bài đọc, video script và bộ quiz thành công!");
          }, 600);
          return 5;
        }
        return prev + 1;
      });
    }, 600);
  };

  // Mock Video Rendering
  const handleRenderVideo = () => {
    setIsRenderingVideo(true);
    setVideoRenderProgress(0);
    const interval = setInterval(() => {
      setVideoRenderProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsRenderingVideo(false);
            showToast("FFmpeg đã biên dịch và xuất video bài giảng AI thành công!");
          }, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Save Lesson Changes
  const saveLessonDrawer = () => {
    if (!selectedLesson) return;

    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === selectedLessonChapterId) {
              return {
                ...ch,
                lessons: ch.lessons.map(l => {
                  if (l.id === selectedLesson.id) {
                    return {
                      ...l,
                      content: {
                        reading: editReading,
                        videoScenes: editScenes,
                        quizzes: editQuizzes
                      }
                    };
                  }
                  return l;
                })
              };
            }
            return ch;
          })
        };
      }
      return c;
    }));

    setLessonDrawerOpen(false);
    setSelectedLesson(null);
    showToast("Đã lưu chỉnh sửa nội dung bài học.");
  };

  // Quiz editing helpers
  const handleUpdateQuiz = (quizId: string, field: keyof QuizQuestion, value: any, optionIndex?: number) => {
    setEditQuizzes(prev => prev.map(q => {
      if (q.id === quizId) {
        if (field === "options" && typeof optionIndex === "number") {
          const newOpts = [...q.options];
          newOpts[optionIndex] = value;
          return { ...q, options: newOpts };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleAddQuizQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-new-${Date.now()}`,
      question: "Nhập câu hỏi trắc nghiệm mới ở đây...",
      options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      answer: "Đáp án A"
    };
    setEditQuizzes(prev => [...prev, newQ]);
  };

  const handleDeleteQuizQuestion = (quizId: string) => {
    setEditQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  // Video scene editing helper
  const handleUpdateScene = (sceneId: string, field: "text" | "script", value: string) => {
    setEditScenes(prev => prev.map(s => {
      if (s.id === sceneId) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // --- CHAPTER MINDMAP EDITOR ACTIONS (REACT FLOW) ---
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "bezier",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2.2, stroke: "#64748b" },
          },
          eds
        )
      );
      showToast("Đã tạo liên kết mới");
    },
    [setEdges]
  );

  // Add new node directly on React Flow
  const handleAddNewNode = (tone: "source" | "concept" | "practice" | "review") => {
    const id = `node-new-${Date.now()}`;
    const tag = tone === "source" ? "SUPERCLASS" : tone === "concept" ? "CONCEPT" : tone === "practice" ? "PRACTICE" : "REVIEW";
    const newNode: Node = {
      id,
      type: "mindmapNode",
      position: { x: 300, y: 150 },
      data: {
        title: "Khái niệm mới",
        subtitle: "Nhập mô tả chi tiết khái niệm...",
        tag: tag,
        tone: tone,
      },
      style: { width: 190 },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
    showToast(`Đã thêm Node khái niệm mới (${tag})`);
  };

  // Edit selected node properties
  const handleUpdateNodeProp = (field: keyof MindmapNodeData, value: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              [field]: value,
            },
          };
        }
        return n;
      })
    );
  };

  // Delete selected node or edge
  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    showToast("Đã xóa nút khái niệm");
  };

  // Save Master Graph to Chapter
  const handleSaveMasterGraph = () => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === selectedMindmapChapterId) {
              return {
                ...ch,
                mindmapNodes: nodes,
                mindmapEdges: edges,
                mindmapGenerated: true
              };
            }
            return ch;
          })
        };
      }
      return c;
    }));

    showToast("Đã lưu Sơ đồ Master Graph thành công! Học viên sẽ đối chiếu bài vẽ với sơ đồ này.", "success");
  };

  // AI Master Graph Generation for Chapters
  const triggerChapterMindmapAIGen = () => {
    const chapter = activeClass.chapters.find((ch) => ch.id === selectedMindmapChapterId);
    if (!chapter) return;

    // Check if there are generated lessons in this chapter
    const hasGenLessons = chapter.lessons.some(l => l.isGenerated);
    if (!hasGenLessons) {
      showToast("Chương học chưa có bài giảng nào hoàn thành! Hãy biên soạn tài liệu cho bài học trước.", "error");
      return;
    }

    setIsMindmapGenerating(true);
    setMindmapStep(1);

    const interval = setInterval(() => {
      setMindmapStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          setTimeout(() => {
            setIsMindmapGenerating(false);

            // Populate nodes and edges based on Class & Chapter ID
            let genNodes: Node[] = [];
            let genEdges: Edge[] = [];

            if (selectedClassId === "class-oop" && selectedMindmapChapterId === "oop-ch1") {
              // Chapter 1 OOP
              genNodes = initialClasses[0].chapters[0].mindmapNodes || [];
              genEdges = initialClasses[0].chapters[0].mindmapEdges || [];
            } else if (selectedClassId === "class-oop" && selectedMindmapChapterId === "oop-ch2") {
              // Chapter 2 OOP - Polymorphism
              genNodes = [
                {
                  id: "ch2-n1",
                  type: "mindmapNode",
                  position: { x: 50, y: 150 },
                  data: { title: "Shape (Abstract)", subtitle: "Lớp cha trừu tượng vẽ hình", tag: "ABSTRACT", tone: "source" },
                  style: { width: 195 }
                },
                {
                  id: "ch2-n2",
                  type: "mindmapNode",
                  position: { x: 300, y: 50 },
                  data: { title: "Lớp Circle", subtitle: "Lớp con vẽ hình tròn", tag: "CONCRETE", tone: "concept" },
                  style: { width: 180 }
                },
                {
                  id: "ch2-n3",
                  type: "mindmapNode",
                  position: { x: 300, y: 250 },
                  data: { title: "Lớp Rectangle", subtitle: "Lớp con vẽ hình chữ nhật", tag: "CONCRETE", tone: "concept" },
                  style: { width: 180 }
                },
                {
                  id: "ch2-n4",
                  type: "mindmapNode",
                  position: { x: 580, y: 150 },
                  data: { title: "Ghi đè draw()", subtitle: "Lớp con tự định nghĩa hàm vẽ", tag: "OVERRIDE", tone: "practice" },
                  style: { width: 190 }
                },
                {
                  id: "ch2-n5",
                  type: "mindmapNode",
                  position: { x: 840, y: 150 },
                  data: { title: "Runtime Polymorphism", subtitle: "Trình biên dịch binding phương thức động", tag: "POLYMORPHISM", tone: "review" },
                  style: { width: 210 }
                }
              ];
              genEdges = [
                { id: "ch2-e1", source: "ch2-n1", target: "ch2-n2", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
                { id: "ch2-e2", source: "ch2-n1", target: "ch2-n3", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
                { id: "ch2-e3", source: "ch2-n2", target: "ch2-n4", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
                { id: "ch2-e4", source: "ch2-n3", target: "ch2-n4", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } },
                { id: "ch2-e5", source: "ch2-n4", target: "ch2-n5", type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2.2, stroke: "#64748b" } }
              ];
            } else {
              // DSA Sorting Chapter
              genNodes = initialClasses[1].chapters[0].mindmapNodes || [];
              genEdges = initialClasses[1].chapters[0].mindmapEdges || [];
            }

            setNodes(genNodes);
            setEdges(genEdges);

            setClasses(prev => prev.map(c => {
              if (c.id === selectedClassId) {
                return {
                  ...c,
                  chapters: c.chapters.map(ch => {
                    if (ch.id === selectedMindmapChapterId) {
                      return {
                        ...ch,
                        mindmapGenerated: true,
                        mindmapNodes: genNodes,
                        mindmapEdges: genEdges
                      };
                    }
                    return ch;
                  })
                };
              }
              return c;
            }));

            showToast("AI đã gom lý thuyết toàn chương và vẽ sơ đồ mindmap tổng hợp!");
          }, 500);
          return 5;
        }
        return prev + 1;
      });
    }, 750);
  };

  // Reset/Regenerate Chapter Mindmap
  const resetChapterMindmap = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả các thay đổi chỉnh sửa thủ công và tạo lại Mindmap bằng AI?")) {
      triggerChapterMindmapAIGen();
    }
  };

  // --- DYNAMIC ASSIGNMENTS ACTIONS ---
  const handleOpenNewAssignment = (chapterId: string) => {
    setIsNewAssignment(true);
    setSelectedAssignmentChapterId(chapterId);
    setSelectedAssignment(null);
    
    // Set form defaults
    setAssignTitle("");
    setAssignType("mindmap");
    setAssignDesc("");
    setAssignRequired(false);
    setAssignPoints(200);
    setAssignRepoTemplate("");
    
    setAssignmentDrawerOpen(true);
  };

  const handleOpenEditAssignment = (chapterId: string, assignment: Assignment) => {
    setIsNewAssignment(false);
    setSelectedAssignmentChapterId(chapterId);
    setSelectedAssignment(assignment);
    
    // Populate form fields
    setAssignTitle(assignment.title);
    setAssignType(assignment.type);
    setAssignDesc(assignment.description);
    setAssignRequired(assignment.isRequired);
    setAssignPoints(assignment.points);
    setAssignRepoTemplate(assignment.repoTemplate || "");
    
    setAssignmentDrawerOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!assignTitle.trim()) {
      showToast("Vui lòng nhập tiêu đề bài tập", "error");
      return;
    }

    if (isNewAssignment) {
      // Create new assignment
      const newAssign: Assignment = {
        id: `assign-${Date.now()}`,
        type: assignType,
        title: assignTitle,
        description: assignDesc,
        isRequired: assignRequired,
        points: assignPoints,
        repoTemplate: assignType === "github" ? assignRepoTemplate : undefined
      };

      setClasses(prev => prev.map(c => {
        if (c.id === selectedClassId) {
          return {
            ...c,
            chapters: c.chapters.map(ch => {
              if (ch.id === selectedAssignmentChapterId) {
                return { ...ch, assignments: [...(ch.assignments || []), newAssign] };
              }
              return ch;
            })
          };
        }
        return c;
      }));

      showToast("Đã thêm bài tập mới thành công!");
    } else {
      // Update existing assignment
      if (!selectedAssignment) return;
      
      setClasses(prev => prev.map(c => {
        if (c.id === selectedClassId) {
          return {
            ...c,
            chapters: c.chapters.map(ch => {
              if (ch.id === selectedAssignmentChapterId) {
                return {
                  ...ch,
                  assignments: (ch.assignments || []).map(a => {
                    if (a.id === selectedAssignment.id) {
                      return {
                        ...a,
                        title: assignTitle,
                        type: assignType,
                        description: assignDesc,
                        isRequired: assignRequired,
                        points: assignPoints,
                        repoTemplate: assignType === "github" ? assignRepoTemplate : undefined
                      };
                    }
                    return a;
                  })
                };
              }
              return ch;
            })
          };
        }
        return c;
      }));

      showToast("Đã lưu cập nhật bài tập!");
    }

    setAssignmentDrawerOpen(false);
  };

  const handleDeleteAssignment = (chapterId: string, assignmentId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) {
      setClasses(prev => prev.map(c => {
        if (c.id === selectedClassId) {
          return {
            ...c,
            chapters: c.chapters.map(ch => {
              if (ch.id === chapterId) {
                return {
                  ...ch,
                  assignments: (ch.assignments || []).filter(a => a.id !== assignmentId)
                };
              }
              return ch;
            })
          };
        }
        return c;
      }));
      
      showToast("Đã xóa bài tập thành công!", "info");
      setAssignmentDrawerOpen(false);
    }
  };

  // --- GITHUB EVALUATION LAB ACTIONS ---
  const handleGradeSubmission = (subId: number) => {
    if (!gradeInput || isNaN(Number(gradeInput))) {
      showToast("Vui lòng nhập điểm số hợp lệ từ 0 - 100", "error");
      return;
    }
    setSubmissions(prev => prev.map(sub => {
      if (sub.id === subId) {
        showToast(`Đã chấm điểm ${gradeInput}/100 cho học sinh ${sub.name}`);
        return { ...sub, status: "graded", score: gradeInput };
      }
      return sub;
    }));
    setGradeInput("");
    setCommentInput("");
    setSelectedSubIndex(null);
  };

  // Load selected sub content for grading sidebar
  useEffect(() => {
    if (selectedSubIndex !== null) {
      setGradeInput(submissions[selectedSubIndex].score || "");
      setCommentInput("");
    }
  }, [selectedSubIndex]);

  // --- STUDENT MASCOT AI REMINDERS ---
  const handleSendMascotReminder = (studentName: string, studentId: string) => {
    setSentReminders(prev => ({ ...prev, [studentId]: true }));
    showToast(`Đã phái Mascot AI bay đi nhắc nhở học viên ${studentName}!`, "success");
  };

  // --- FLOATING CHATBOT SUBMIT ---
  const handleChatbotSubmit = (customMessage?: string) => {
    const textToSend = customMessage || chatbotInput;
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatbotInput("");
    setIsChatbotTyping(true);

    // AI thinking animation
    setTimeout(() => {
      let responseText = "";
      
      if (textToSend.includes("soạn bài tập") || textToSend.includes("Đa hình")) {
        responseText = `### 📝 Đề xuất bài tập thực hành Đa Hình Nâng Cao (IDE Lab)

**Tiêu đề:** Hệ thống thanh toán đa phương thức (Payment Gateway Simulation)
**Độ khó:** Trung bình khá (Bonus +200 XP)

#### 🎯 Yêu cầu đề bài:
1. Định nghĩa lớp trừu tượng \`PaymentMethod\` có phương thức abstract \`processPayment(double amount)\`.
2. Tạo 3 lớp con kế thừa:
   - \`CreditCardPayment\` (bổ sung phí giao dịch 2.5%).
   - \`EWalletPayment\` (chiết khấu 1% cho mỗi đơn hàng).
   - \`BankTransferPayment\` (cần cộng mã giao dịch tự động).
3. Viết hàm ghi đè hoạt động đa hình trên danh sách để tự động xử lý hóa đơn của giỏ hàng.

*Nhấp vào nút **"Tạo bài tập"** trên bảng Syllabus và chọn loại bài tập **IDE Lab** để lưu mẫu này.*`;
      } else if (textToSend.includes("câu quiz") || textToSend.includes("1.2")) {
        responseText = `### ❓ Bộ 5 câu hỏi Quiz logic đề xuất cho Bài 1.2 (extends và super)

1. **Câu 1:** Đâu là cách gọi đúng constructor không tham số của lớp cha từ lớp con?
   - A. \`parent()\`
   - B. \`super()\` *(Đúng)*
   - C. \`base()\`
   - D. \`this.super()\`

2. **Câu 2:** Lệnh gọi \`super()\` bắt buộc phải nằm ở vị trí nào trong constructor lớp con?
   - A. Dòng đầu tiên *(Đúng)*
   - B. Dòng cuối cùng
   - C. Vị trí nào cũng được
   - D. Không được phép đặt trong constructor

3. **Câu 3:** Java có hỗ trợ một lớp con extends trực tiếp nhiều lớp cha không?
   - A. Có
   - B. Không *(Đúng)*

*(Sao chép các câu hỏi này vào tab Quiz để phát hành trực tiếp cho học sinh)*`;
      } else if (textToSend.includes("học lực") || textToSend.includes("lớp OOP")) {
        responseText = `### 📊 Báo cáo học tập nhanh lớp OOP tuần này:

- **Tiến độ trung bình:** 62% hoàn thành chương 1.
- **Điểm yếu cốt lõi:** Học viên hay nhầm lẫn cách hoạt động của constructor kế thừa (42% trả lời sai ở các câu hỏi liên quan đến lệnh \`super()\`).
- **Học viên cần quan tâm đặc biệt:** 
  - **Nguyễn Minh Khôi** (Quiz 55%, cảnh báo đạo văn).
  - **Võ Ngọc Hà** (Trễ hạn nộp bài tập lớn GitHub 3 ngày).

**Đề xuất hành động:** Phái Mascot AI gửi thông báo nhắc nhở và đính kèm bài đọc bổ trợ cho 2 học viên trên.`;
      } else {
        responseText = `Tôi đã nhận được yêu cầu: "${textToSend}". Tôi có thể hỗ trợ thầy/cô:
1. Soạn thảo đề bài tập Lab Java / C++ nâng cao.
2. Sinh nhanh bộ câu hỏi trắc nghiệm ôn tập.
3. Phân tích tình hình học tập và trích xuất học viên yếu của lớp.

Thầy/cô muốn triển khai nội dung nào trước?`;
      }

      const aiMsg: ChatMessage = {
        sender: "ai",
        text: responseText,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };

      setChatMessages(prev => [...prev, aiMsg]);
      setIsChatbotTyping(false);
    }, 1200);
  };

  return (
    <div className="min-h-full p-5 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-2xl transition-all duration-300 animate-slide-in ${
          toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-blue-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {/* Class Select Dropdown */}
          <div className="relative inline-block text-left mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Đang quản lý lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-202 dark:border-slate-700 text-slate-800 dark:text-slate-101 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 font-bold outline-none cursor-pointer pr-8 appearance-none relative"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Bảng điều khiển giảng viên</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Soạn thảo giáo trình, kích hoạt AI tạo kịch bản học liệu và thiết kế Mindmap chuẩn của chương.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-xs">
            Học kỳ 1 / 2026
          </span>
          <span className="bg-blue-550/10 text-blue-700 dark:text-blue-404 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/40">
            <Sparkles size={12} className="text-blue-500 fill-blue-500 dark:text-blue-400 dark:fill-blue-400" />
            AI Co-Pilot Active
          </span>
        </div>
      </header>

      {/* TABS SELECTOR */}
      <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          ["syllabus", "Cấu trúc khóa học", <BookOpen size={15} />],
          ["github-review", "Chấm bài GitHub", <GitFork size={15} />],
          ["mindmap", "Sơ đồ tư duy chương", <Network size={15} />],
          ["analytics", "Thống kê AI", <Sparkles size={15} className="text-purple-500" />],
        ].map(([id, label, icon]) => (
          <button
            key={id as string}
            onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* SYLLABUS TAB CONTENT */}
      {tab === "syllabus" && (
        <div className="space-y-4">
          {/* Chapter cards */}
          {activeClass.chapters.map((chapter) => (
            <div key={chapter.id} className="surface overflow-hidden rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-955/20">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{chapter.title}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => toggleChapterStatus(chapter.id)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                          chapter.status === "Đã phát hành"
                            ? "bg-emerald-50 dark:bg-emerald-955/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/30"
                            : "bg-amber-50 dark:bg-amber-955/30 text-amber-700 dark:text-amber-455 border border-amber-200 dark:border-amber-900/30 hover:bg-amber-100"
                        }`}
                      >
                        {chapter.status}
                      </button>
                      {chapter.mindmapGenerated && (
                        <span className="bg-purple-50 dark:bg-purple-955/30 text-purple-700 dark:text-purple-450 border border-purple-105 dark:border-purple-900/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Network size={9} />
                          Master Mindmap Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMindmapChapterId(chapter.id);
                      setTab("mindmap");
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-955/40 hover:bg-purple-100/70 text-purple-700 dark:text-purple-400 px-3 py-1.5 text-xs font-bold transition"
                  >
                    <Network size={14} />
                    Sơ đồ Master
                  </button>
                  <button
                    onClick={() => handleOpenNewAssignment(chapter.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 transition"
                  >
                    <Plus size={14} />
                    Bài tập
                  </button>
                  <button
                    onClick={() => {
                      setActiveChapterId(chapter.id);
                      setNewLessonTitle(prev => ({ ...prev, [chapter.id]: "" }));
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-355 transition"
                  >
                    <Plus size={14} />
                    Bài học
                  </button>
                </div>
              </div>

              {/* Chapter Lessons List */}
              <div className="space-y-2 p-4">
                {/* Inline New Lesson Input */}
                {activeChapterId === chapter.id && (
                  <div className="flex items-center gap-2 p-2 border border-dashed border-blue-300 dark:border-blue-800 rounded-xl bg-blue-50/20 dark:bg-blue-955/20 mb-2">
                    <input
                      type="text"
                      placeholder="Nhập tên bài học mới..."
                      value={newLessonTitle[chapter.id] || ""}
                      onChange={(e) => setNewLessonTitle(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                      className="flex-1 bg-white dark:bg-slate-805 border border-slate-202 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      onClick={() => handleAddLesson(chapter.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      Thêm
                    </button>
                    <button
                      onClick={() => setActiveChapterId("")}
                      className="text-slate-405 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* LESSONS GROUP */}
                <div className="mb-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Bài học ({chapter.lessons.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {chapter.lessons.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/20">
                        Chưa có bài học nào. Nhấn "+ Bài học" ở trên để thêm.
                      </div>
                    ) : (
                      chapter.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => toggleLessonStatus(chapter.id, lesson.id)}
                              className="mt-0.5 shrink-0"
                              title="Click để phát hành / hạ nháp"
                            >
                              <CheckCircle2
                                size={18}
                                className={lesson.status === "Đã phát hành" ? "text-emerald-600 fill-emerald-50 dark:text-emerald-555" : "text-slate-300 dark:text-slate-700"}
                              />
                            </button>
                            <div>
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lesson.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold uppercase ${lesson.status === "Đã phát hành" ? "text-emerald-600 dark:text-emerald-550" : "text-slate-500 dark:text-slate-400"}`}>
                                  {lesson.status}
                                </span>
                                {lesson.documents.length > 0 ? (
                                  <span className="text-[10px] text-slate-405 dark:text-slate-500 flex items-center gap-1">
                                    <FileText size={10} /> {lesson.documents[0].name}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-955/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 font-bold">
                                    Chờ tài liệu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            {/* AIGC Status Badges */}
                            <div className="flex gap-1">
                              {lesson.isGenerated ? (
                                <>
                                  <span className="rounded bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-105 dark:border-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-455">Bài đọc</span>
                                  <span className="rounded bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-105 dark:border-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-455">Video Script</span>
                                  <span className="rounded bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-105 dark:border-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-455">Quiz</span>
                                </>
                              ) : (
                                <span className="rounded bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Chưa tạo học liệu</span>
                              )}
                            </div>

                            {/* Edit Button */}
                            <button
                              onClick={() => openLessonDetails(chapter.id, lesson)}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                            >
                              <Edit size={12} />
                              Biên soạn
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ASSIGNMENTS GROUP */}
                <div className="mt-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Bài tập & Đánh giá ({chapter.assignments ? chapter.assignments.length : 0})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {!chapter.assignments || chapter.assignments.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-955/20">
                        Chưa có bài tập nào. Nhấn "+ Bài tập" ở trên để thêm.
                      </div>
                    ) : (
                      chapter.assignments.map((assignment) => (
                        <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-dashed border-slate-202 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-955/20 p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
                          <div className="flex items-center gap-2.5">
                            {assignment.type === "mindmap" ? (
                              <Brain size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                            ) : assignment.type === "github" ? (
                              <Code2 size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                            ) : assignment.type === "quiz" ? (
                              <HelpCircle size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                            ) : (
                              <FileText size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                            )}
                            <div>
                              <span className="text-slate-700 dark:text-slate-200 font-bold">{assignment.title}</span>
                              {assignment.description && (
                                <p className="text-[10px] text-slate-405 dark:text-slate-550 font-medium mt-0.5">{assignment.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <span className={assignment.isRequired ? "text-slate-400 dark:text-slate-555" : "text-purple-650 dark:text-purple-400"}>
                              {assignment.isRequired ? "Bắt buộc" : `+${assignment.points} XP Bonus`}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleOpenEditAssignment(chapter.id, assignment)}
                                className="text-blue-600 hover:text-blue-808 dark:text-blue-400 dark:hover:text-blue-305 p-1 bg-white dark:bg-slate-800 border border-slate-202 dark:border-slate-750 rounded transition cursor-pointer"
                                title="Sửa bài tập"
                              >
                                <Edit size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(chapter.id, assignment.id)}
                                className="text-red-500 hover:text-red-750 dark:text-red-400 dark:hover:text-red-305 p-1 bg-white dark:bg-slate-800 border border-slate-202 dark:border-slate-750 rounded transition cursor-pointer"
                                title="Xóa bài tập"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Chapter Button / Input */}
          {!showAddChapter ? (
            <button
              onClick={() => setShowAddChapter(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-350 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-650 hover:bg-blue-50/30 dark:hover:bg-blue-955/20 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <Plus size={16} />
              Thêm Chương học mới
            </button>
          ) : (
            <div className="surface p-4 rounded-xl border border-slate-202 dark:border-slate-808 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Thêm chương học mới</h3>
              <input
                type="text"
                placeholder="Ví dụ: Chương 3: Lớp trừu tượng & Đa kế thừa..."
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-555 text-slate-800 dark:text-slate-200"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddChapter(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddChapter}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Thêm Chương
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GITHUB REVIEW TAB CONTENT */}
      {tab === "github-review" && (
        <div className={`grid gap-4 ${selectedSubIndex !== null ? "grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"} transition-all duration-300`}>
          <div className="surface overflow-hidden rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-202 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-955/20">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Bài nộp chương 1</h2>
              <span className="rounded-full bg-red-50 dark:bg-red-955/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-pulse">
                <Flag size={12} />
                {submissions.filter(s => s.status === 'plagiarism' || s.status === 'commit').length} cần xem xét
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-955/40 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {["Học viên", "Trạng thái", "Integrity", "Nộp lúc"].map((head) => (
                    <th key={head} className="px-4 py-3.5 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((sub, index) => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubIndex(selectedSubIndex === index ? null : index)}
                    className={`cursor-pointer text-sm transition-colors ${
                      selectedSubIndex === index ? "bg-blue-50/70 dark:bg-blue-955/30" : "hover:bg-slate-50/50 dark:hover:bg-slate-850/30"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{sub.name}</div>
                      <div className="text-[10px] text-slate-405 dark:text-slate-550 mt-0.5">{sub.details}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {sub.status === "plagiarism" ? (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-xs">
                          <Flag size={13} className="text-red-500" /> Nghi trùng code
                        </span>
                      ) : sub.status === "commit" ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-xs">
                          <AlertTriangle size={13} className="text-amber-555" /> Commit bất thường
                        </span>
                      ) : sub.status === "graded" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs">
                          <CheckCircle2 size={13} className="text-emerald-555" /> Đã chấm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-105 px-2 py-0.5 rounded text-xs">
                          <Eye size={13} className="text-blue-550" /> Chờ chấm
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${sub.score}%`,
                              background: Number(sub.score) >= 80 ? "#10b981" : Number(sub.score) >= 60 ? "#f59e0b" : "#ef4444"
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">{sub.score}/100</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 dark:text-slate-550 text-xs font-semibold">{sub.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grading details drawer */}
          {selectedSubIndex !== null && (
            <aside className="surface rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm h-fit space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{submissions[selectedSubIndex].name}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">{submissions[selectedSubIndex].details}</p>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-955/20 p-3.5 text-xs leading-5 text-amber-800 dark:text-amber-400 border-l-4">
                <span className="font-bold flex items-center gap-1 mb-1 text-amber-900 dark:text-amber-300">
                  <AlertTriangle size={13} />
                  AI Phát hiện Cảnh báo
                </span>
                AI phát hiện lịch sử commit và mã nguồn trùng lặp cao (41%). Giảng viên nên xem kỹ walkthrough và mã nguồn trước khi nhập điểm.
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Giải thích code của HS</span>
                <div className="bg-slate-50 dark:bg-slate-955 p-2.5 rounded-lg border border-slate-202 dark:border-slate-800 text-xs font-mono max-h-24 overflow-y-auto text-slate-600 dark:text-slate-455 leading-4">
                  "{submissions[selectedSubIndex].explanation}"
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Điểm cuối (0-100)</label>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-bold"
                    placeholder="0-100"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Nhận xét giảng viên</label>
                  <textarea
                    rows={4}
                    className="mt-1.5 w-full resize-none rounded-lg border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 hover:bg-slate-100/50 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 leading-4 text-slate-700 dark:text-slate-300"
                    placeholder="Ghi phản hồi học tập chi tiết..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleGradeSubmission(submissions[selectedSubIndex].id)}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow transition-all duration-150 cursor-pointer"
                >
                  Gửi đánh giá
                </button>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* CHAPTER MINDMAP EDITOR TAB (REACT FLOW) */}
      {tab === "mindmap" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-905 p-3.5 rounded-xl border border-slate-202 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chọn chương học:</span>
              <select
                value={selectedMindmapChapterId}
                onChange={(e) => setSelectedMindmapChapterId(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-202 dark:border-slate-700 text-slate-800 dark:text-slate-105 text-xs rounded-lg p-1.5 font-bold outline-none cursor-pointer pr-7 appearance-none relative"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
              >
                {activeClass.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title}
                  </option>
                ))}
              </select>
            </div>

            {/* AIGC Map buttons */}
            <div className="flex gap-2">
              <button
                onClick={resetChapterMindmap}
                className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-955/40 hover:bg-purple-100/50 text-purple-700 dark:text-purple-400 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <WandSparkles size={14} />
                Tự động tạo bằng AI
              </button>
              <button
                onClick={handleSaveMasterGraph}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-755 px-3 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <Save size={14} />
                Lưu Sơ đồ Master
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[600px]">
            {/* React Flow Canvas Container */}
            <div className="lg:col-span-9 mindmap-flow-shell relative rounded-xl border border-slate-800 shadow-2xl overflow-hidden h-full">
              {/* React Flow canvas overlay header */}
              <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-[11px] font-bold text-slate-400">
                    master-graph / {selectedMindmapChapterId}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAddNewNode("source")}
                    className="bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    + Lớp Cha
                  </button>
                  <button
                    onClick={() => handleAddNewNode("concept")}
                    className="bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    + Khái niệm
                  </button>
                  <button
                    onClick={() => handleAddNewNode("practice")}
                    className="bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    + Thực hành
                  </button>
                  <button
                    onClick={() => handleAddNewNode("review")}
                    className="bg-pink-500/25 hover:bg-pink-500/35 border border-pink-400/40 text-pink-200 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    + Dự án
                  </button>
                </div>
              </div>

              {/* Blank State or Generator Screen */}
              {isMindmapGenerating ? (
                <div className="absolute inset-0 bg-slate-955/90 z-30 flex flex-col items-center justify-center text-white">
                  <Loader2 className="animate-spin text-purple-500 mb-4" size={40} />
                  <h3 className="text-base font-bold mb-1">AI đang liên kết tri thức...</h3>
                  <p className="text-xs text-slate-400 w-80 text-center leading-5 animate-pulse">
                    {mindmapStep === 1 && "Đọc dữ liệu bài đọc và kịch bản video..."}
                    {mindmapStep === 2 && "Trích xuất thực thể khái niệm và phân loại..."}
                    {mindmapStep === 3 && "Thiết lập các mối quan hệ logic (extends, super)..."}
                    {mindmapStep === 4 && "Sắp xếp tọa độ các nút và vẽ sơ đồ..."}
                    {mindmapStep === 5 && "Đồng bộ hóa sơ đồ Canvas..."}
                  </p>
                </div>
              ) : nodes.length === 0 ? (
                <div className="absolute inset-0 bg-slate-950/95 z-10 flex flex-col items-center justify-center text-white p-6 text-center">
                  <div className="bg-purple-900/40 p-4 rounded-full border border-purple-500/30 mb-4">
                    <Network className="text-purple-400 animate-pulse" size={32} />
                  </div>
                  <h3 className="text-lg font-bold">Chưa có Master Mindmap</h3>
                  <p className="text-sm text-slate-405 max-w-md mt-2 leading-6">
                    Hệ thống cần sơ đồ tri thức chuẩn của Giảng viên làm căn cứ đánh giá logic bài làm của Học viên. Kích hoạt AI tự động gom lý thuyết của toàn chương để dựng sơ đồ.
                  </p>
                  <button
                    onClick={triggerChapterMindmapAIGen}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-3 text-sm font-bold text-white shadow-lg transition cursor-pointer"
                  >
                    <WandSparkles size={16} />
                    Tạo Sơ đồ Mindmap bằng AI
                  </button>
                </div>
              ) : null}

              {/* React Flow Component */}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={mindmapNodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                fitView
                minZoom={0.5}
                maxZoom={1.5}
                defaultEdgeOptions={{
                  type: "bezier",
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { strokeWidth: 2.2, stroke: "#64748b" },
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={25} color="rgba(148,163,184,.08)" />
                <MiniMap pannable zoomable />
                <Controls />
              </ReactFlow>

              {/* Instructions Banner */}
              <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 border border-white/10 p-2 font-mono text-[9px] text-slate-400 pointer-events-none">
                <div>• Kéo nút để đổi vị trí</div>
                <div>• Kéo chấm tròn ở các góc sang nút khác để nối</div>
                <div>• Click chọn Nút để xem và sửa chi tiết</div>
              </div>
            </div>

            {/* Mindmap Inspector Sidebar */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-xl p-4 shadow-sm h-full flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                  Thuộc tính Sơ đồ
                </h3>

                {selectedNodeId ? (
                  // Node properties editor
                  (() => {
                    const node = nodes.find(n => n.id === selectedNodeId) as Node<MindmapNodeData> | undefined;
                    if (!node) return null;
                    return (
                      <div className="space-y-4 mt-4 animate-fade-in">
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-955/20 px-2 py-0.5 rounded border border-purple-101 dark:border-purple-900/30">
                          Đang chọn Node
                        </span>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block mb-1">Tiêu đề</label>
                          <input
                            type="text"
                            value={node.data.title || ""}
                            onChange={(e) => handleUpdateNodeProp("title", e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-355 block mb-1">Mô tả chi tiết</label>
                          <textarea
                            rows={3}
                            value={node.data.subtitle || ""}
                            onChange={(e) => handleUpdateNodeProp("subtitle", e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 leading-4 text-slate-855 dark:text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-355 block mb-1">Nhãn Tag</label>
                          <input
                            type="text"
                            value={node.data.tag || ""}
                            onChange={(e) => handleUpdateNodeProp("tag", e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-355 block mb-1">Phân loại (Tone màu)</label>
                          <select
                            value={node.data.tone || "concept"}
                            onChange={(e) => handleUpdateNodeProp("tone", e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-855 border border-slate-202 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none cursor-pointer text-slate-800 dark:text-slate-200"
                          >
                            <option value="source">Lớp cha (Source)</option>
                            <option value="concept">Khái niệm con (Concept)</option>
                            <option value="practice">Thực hành Code (Practice)</option>
                            <option value="review">Tổng kết / AI Review (Review)</option>
                          </select>
                        </div>

                        <button
                          onClick={handleDeleteSelectedNode}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-955/20 py-2 text-xs font-bold text-red-650 dark:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                          Xóa Node này
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  // Blank side panel
                  <div className="text-slate-405 dark:text-slate-505 text-xs py-16 text-center leading-5">
                    <HelpCircle className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={24} />
                    Click vào một Node bất kỳ trên sơ đồ để sửa tiêu đề, mô tả hoặc phân loại màu sắc.
                  </div>
                )}
              </div>

              {/* Master graph statistics */}
              <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Thông số Sơ đồ:</span>
                  <span className="font-mono bg-slate-200 dark:bg-slate-805 px-1 rounded text-[10px]">Active</span>
                </div>
                <div>Số lượng Nodes: <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{nodes.length}</span></div>
                <div>Số lượng Kết nối: <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{edges.length}</span></div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold pt-1.5 flex items-center gap-1.5 border-t border-slate-200/50 dark:border-slate-800 mt-1">
                  <Sparkles size={10} />
                  Master Graph cho Chapter {selectedMindmapChapterId === 'oop-ch1' ? '1' : '2'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI ANALYTICS TAB CONTENT */}
      {tab === "analytics" && (
        <div className="space-y-5 animate-fade-in">
          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                <GraduationCap size={22} className="lucide" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tiến độ lớp học</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">62% Hoàn thành</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold block mt-0.5">Tốc độ trung bình 4.2 ngày/chương</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Độ chính xác Quiz</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">74.5% Điểm đúng</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold block mt-0.5">Thấp nhất tại bài 1.2 extends & super</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                <GitFork size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nộp bài GitHub</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">15 / 18 Học viên</span>
                <span className="text-[10px] text-red-500 dark:text-red-400 font-bold block mt-0.5">3 Cảnh báo trùng lặp cần phê duyệt</span>
              </div>
            </div>
          </div>

          {/* DETAIL GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LAGGING STUDENTS LIST */}
            <div className="rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-500" />
                    Học viên gặp khó khăn & Cần hỗ trợ
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">AI tự động đề cử nhắc nhở dựa trên quiz và thời gian trễ hạn.</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: "std-1", name: "Nguyễn Minh Khôi", reason: "Quiz bài 1.2 dưới trung bình (55%) • Nghi trùng code", detail: "Cần ôn tập constructor kế thừa" },
                  { id: "std-2", name: "Võ Ngọc Hà", reason: "Trễ hạn nộp bài thực hành GitHub (3 ngày)", detail: "Chưa hoàn thành extends_super_lab" },
                  { id: "std-3", name: "Phạm Văn Đức", reason: "3 lần liên tiếp trượt bài test 1.2", detail: "Vấp ngã ở câu hỏi lệnh super()" }
                ].map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-202 dark:border-slate-808 bg-slate-50/20 dark:bg-slate-950 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{student.name}</div>
                      <div className="text-[10px] font-bold text-red-500 dark:text-red-400">{student.reason}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-505">{student.detail}</div>
                    </div>

                    <button
                      onClick={() => handleSendMascotReminder(student.name, student.id)}
                      disabled={sentReminders[student.id]}
                      className={`flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-sm transition border ${
                        sentReminders[student.id]
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-default"
                          : "bg-purple-650 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white border-transparent cursor-pointer"
                      }`}
                    >
                      <Bot size={11} className={sentReminders[student.id] ? "" : "animate-pulse"} />
                      <span>{sentReminders[student.id] ? "Đã nhắc nhở" : "Gửi Mascot"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP WRONG QUIZZES & AI ADVICE */}
            <div className="rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle size={15} className="text-blue-500" />
                    Top câu hỏi học viên trả lời sai nhiều nhất
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-0.5">Phân tích sai sót điển hình để giảng viên bổ sung lý thuyết.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    acc: "42% sai",
                    q: "Lớp con kế thừa lớp cha bằng từ khóa nào?",
                    mistake: "Đa số chọn 'implements' hoặc 'inherits' (nhầm lẫn cú pháp Interface).",
                    advice: "AI gợi ý: Thêm 1 slide so sánh kế thừa lớp (extends) và triển khai interface (implements)."
                  },
                  {
                    acc: "28% sai",
                    q: "Lệnh super() phải được đặt ở vị trí nào trong constructor lớp con?",
                    mistake: "Chọn 'Vị trí bất kỳ' hoặc 'Dòng cuối cùng'.",
                    advice: "AI gợi ý: Soạn thêm một bài tập thực hành gõ code thực tế bắt buộc chạy lỗi constructor chaining."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-202 dark:border-slate-808 bg-slate-50/20 dark:bg-slate-950 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Câu hỏi {idx + 1}</span>
                      <span className="font-bold text-red-500 dark:text-red-400 bg-red-550/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{item.acc}</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">"{item.q}"</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-4">• **Lỗi sai phổ biến:** {item.mistake}</p>
                    <div className="p-2 bg-purple-550/5 dark:bg-purple-950/20 border border-dashed border-purple-200/50 dark:border-purple-900/30 rounded text-[10px] text-purple-750 dark:text-purple-350 leading-4 font-semibold flex items-start gap-1">
                      <Sparkles size={11} className="mt-0.5 shrink-0 text-purple-500" />
                      <span>{item.advice}</span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setIsChatbotOpen(true);
                    handleChatbotSubmit("Hãy soạn cho tôi 1 bài tập thực hành nâng cao về Đa hình");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-955/20 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 transition cursor-pointer"
                >
                  <WandSparkles size={13} />
                  Kích hoạt AI Assistant soạn đề bài tập bổ trợ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LESSON EDIT MODAL (AIGC Modal) --- */}
      {lessonDrawerOpen && selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col justify-between animate-scale-in drawer-container rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between drawer-header-custom">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Đang biên soạn bài học:</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedLesson.title}</h2>
              </div>
              <button
                onClick={() => setLessonDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 bg-white dark:bg-slate-805 border border-slate-202 dark:border-slate-700 rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body Tabs Selector (Segmented controls) */}
            <div className="flex bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-0.5 gap-0.5">
              <button
                onClick={() => setDrawerTab("upload")}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  drawerTab === "upload" ? "bg-active-tab" : "bg-inactive-tab"
                }`}
              >
                <Upload size={10} />
                <span>{selectedLesson.isGenerated ? "Tài liệu gốc" : "1. Tải lên"}</span>
              </button>
              <button
                onClick={() => selectedLesson.isGenerated && setDrawerTab("reading")}
                disabled={!selectedLesson.isGenerated}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  !selectedLesson.isGenerated ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  drawerTab === "reading" ? "bg-active-tab" : "bg-inactive-tab"
                }`}
              >
                <BookOpen size={10} />
                <span>{selectedLesson.isGenerated ? "Bài đọc AI" : "2. Bài đọc"}</span>
              </button>
              <button
                onClick={() => selectedLesson.isGenerated && setDrawerTab("video")}
                disabled={!selectedLesson.isGenerated}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  !selectedLesson.isGenerated ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  drawerTab === "video" ? "bg-active-tab" : "bg-inactive-tab"
                }`}
              >
                <Play size={10} />
                <span>{selectedLesson.isGenerated ? "Video Script" : "3. Video"}</span>
              </button>
              <button
                onClick={() => selectedLesson.isGenerated && setDrawerTab("quiz")}
                disabled={!selectedLesson.isGenerated}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  !selectedLesson.isGenerated ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  drawerTab === "quiz" ? "bg-active-tab" : "bg-inactive-tab"
                }`}
              >
                <HelpCircle size={10} />
                <span>{selectedLesson.isGenerated ? "Bộ Quiz" : "4. Quiz"}</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0 drawer-body-custom">
              {/* UPLOAD / GENERATION TAB */}
              {drawerTab === "upload" && (
                <div className="space-y-4">
                  {selectedLesson.documents.length === 0 ? (
                    <>
                      {/* File dropzone mock */}
                      <div
                        onClick={handleMockUpload}
                        className="border-2 border-dashed border-slate-350 dark:border-slate-750 hover:border-blue-500 bg-white dark:bg-slate-900 hover:bg-blue-50/20 rounded-lg p-6 text-center cursor-pointer transition duration-150"
                      >
                        <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kéo thả tài liệu bài học vào đây</p>
                        <p className="text-[10px] text-slate-405 dark:text-slate-505 mt-0.5">Hoặc Click để chọn tệp từ máy tính (.docx, .pdf, .txt)</p>
                      </div>

                      {/* Shared Course Asset Library */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                            Hoặc chọn từ thư viện dùng chung
                          </span>
                          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950 p-3 space-y-2">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                            <BookOpen size={13} className="text-blue-500" />
                            Thư viện học liệu lớp {activeClass.code}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { name: "Giao_trinh_OOP_Tieng_Viet.docx", size: "920 KB" },
                              { name: "Slide_Ke_Thua_Va_Da_Hinh.pdf", size: "1.4 MB" },
                              { name: "Huong_Dan_Thuc_Hanh_Lab1.docx", size: "340 KB" },
                              { name: "Audio_Bai_Giang_Huong_Doi_Tuong.mp3", size: "5.2 MB" }
                            ].map((asset) => (
                              <div key={asset.name} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 bg-white dark:bg-slate-900 transition text-[11px] gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText size={13} className="text-slate-400 shrink-0" />
                                  <div className="truncate">
                                    <div className="font-semibold text-slate-700 dark:text-slate-350 truncate" title={asset.name}>{asset.name}</div>
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500">{asset.size}</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSelectSharedAsset(asset.name, asset.size)}
                                  className="shrink-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-955/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded px-2 py-1 font-bold transition cursor-pointer"
                                >
                                  Sử dụng
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Uploaded files display (more compact)
                    <div className="rounded-lg py-2 px-3 shadow-sm file-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-blue-550/10 dark:bg-blue-900/20 p-1.5 rounded-md text-blue-600 dark:text-blue-400 shrink-0 animate-pulse">
                            <FileText size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-850 dark:text-slate-200 leading-none">{selectedLesson.documents[0].name}</div>
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                              Tải lên ngày {selectedLesson.documents[0].uploadedAt} • Dung lượng {selectedLesson.documents[0].size}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setClasses(prev => prev.map(c => {
                              if (c.id === selectedClassId) {
                                return {
                                  ...c,
                                  chapters: c.chapters.map(ch => {
                                    if (ch.id === selectedLessonChapterId) {
                                      return {
                                        ...ch,
                                        lessons: ch.lessons.map(l => {
                                          if (l.id === selectedLesson.id) {
                                            return { ...l, documents: [] };
                                          }
                                          return l;
                                        })
                                      };
                                    }
                                    return ch;
                                  })
                                };
                              }
                              return c;
                            }));
                            setSelectedLesson(prev => prev ? { ...prev, documents: [] } : null);
                            showToast("Đã gỡ bỏ tài liệu giảng dạy", "info");
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-955/30 p-1 rounded transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Activation Area */}
                  {selectedLesson.documents.length > 0 && (
                    <div className="rounded-lg p-3.5 shadow-sm space-y-3 ai-card">
                      <div className="flex items-start gap-2.5">
                        <div className="bg-purple-100 dark:bg-purple-955/40 p-1.5 rounded-md text-purple-650 dark:text-purple-400 mt-0.5 animate-pulse shrink-0">
                          <WandSparkles size={14} className="fill-purple-200 dark:fill-purple-900" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Biên soạn bằng Trí Tuệ Nhân Tạo (AIGC)</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-4">
                            AI sẽ tự động đọc hiểu tài liệu, biên soạn văn bản bài giảng, tự động dựng kịch bản thuyết minh video và đề xuất bộ câu hỏi trắc nghiệm logic.
                          </p>
                        </div>
                      </div>

                      {isAigcRunning ? (
                        /* Loading state step-by-step */
                        <div className="rounded-lg p-3 space-y-2.5 ai-loading-card">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 animate-pulse flex items-center gap-1">
                              <Loader2 className="animate-spin text-purple-600" size={12} />
                              AI Co-Pilot đang xử lý...
                            </span>
                            <span className="font-mono text-[10px] text-purple-700 dark:text-purple-400 font-bold">{aigcStep * 20}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 dark:bg-purple-550 rounded-full transition-all duration-300" style={{ width: `${aigcStep * 25}%` }} />
                          </div>
                          <div className="space-y-1 text-[10px]">
                            <div className={`flex items-center gap-1.5 ${aigcStep >= 1 ? "text-purple-900 dark:text-purple-200 font-semibold" : "text-slate-450"}`}>
                              {aigcStep > 1 ? <Check size={10} className="text-purple-650" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                              Phân tích văn bản & Cấu trúc khái niệm
                            </div>
                            <div className={`flex items-center gap-1.5 ${aigcStep >= 2 ? "text-purple-900 dark:text-purple-200 font-semibold" : "text-slate-450"}`}>
                              {aigcStep > 2 ? <Check size={10} className="text-purple-650" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                              Tóm tắt bài đọc Lecture tiếng Việt chuẩn
                            </div>
                            <div className={`flex items-center gap-1.5 ${aigcStep >= 3 ? "text-purple-900 dark:text-purple-200 font-semibold" : "text-slate-455"}`}>
                              {aigcStep > 3 ? <Check size={10} className="text-purple-650" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                              Dựng Slide và Kịch bản Audio thuyết minh Video
                            </div>
                            <div className={`flex items-center gap-1.5 ${aigcStep >= 4 ? "text-purple-900 dark:text-purple-200 font-semibold" : "text-slate-455"}`}>
                              {aigcStep > 4 ? <Check size={10} className="text-purple-650" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                              Thiết lập bộ câu hỏi trắc nghiệm logic Quiz
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal Action Button */
                        <button
                          onClick={runAigcPipeline}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 py-2 text-xs font-bold text-white shadow-md transition duration-150 cursor-pointer"
                        >
                          <WandSparkles size={13} className="fill-purple-300" />
                          Kích hoạt AI tự động biên soạn
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* READINGS EDIT TAB */}
              {drawerTab === "reading" && (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nội dung bài lý thuyết tóm tắt</span>
                    <span className="bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-350 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-202 dark:border-slate-700 flex items-center gap-1">
                      <Sparkles size={10} />
                      AI Generated
                    </span>
                  </div>
                  <textarea
                    rows={16}
                    value={editReading}
                    onChange={(e) => setEditReading(e.target.value)}
                    className="w-full flex-1 resize-none rounded-xl p-4 text-sm leading-6 outline-none focus:ring-1 focus:ring-blue-500 font-medium drawer-input"
                    placeholder="Nhập nội dung bài đọc thuyết minh chi tiết cho học sinh học lý thuyết..."
                  />
                </div>
              )}

              {/* VIDEO SCRIPT EDIT TAB */}
              {drawerTab === "video" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-855 dark:text-slate-200">Biên tập kịch bản bài giảng Video AI</h4>
                      <p className="text-[11px] text-slate-405 dark:text-slate-500 mt-0.5">Sửa slide text hiển thị và giọng đọc script thuyết minh chi tiết.</p>
                    </div>

                    <button
                      onClick={handleRenderVideo}
                      disabled={isRenderingVideo}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-3 py-1.5 text-xs font-bold text-white shadow transition-all duration-150 cursor-pointer"
                    >
                      {isRenderingVideo ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Rendering ({videoRenderProgress}%)
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          Render Video lại
                        </>
                      )}
                    </button>
                  </div>

                  {isRenderingVideo && (
                    <div className="bg-blue-50 dark:bg-blue-955/20 border border-blue-105 dark:border-blue-900/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-805 dark:text-blue-300">
                        <span>Đang render hình ảnh slide & Tổng hợp giọng đọc...</span>
                        <span>{videoRenderProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-205 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-150" style={{ width: `${videoRenderProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {editScenes.map((scene, idx) => (
                      <div key={scene.id} className="rounded-lg p-3 space-y-2.5 content-card">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span>Phân cảnh {idx + 1}</span>
                          <span className="bg-slate-105 dark:bg-slate-805 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">Slide {idx + 1}</span>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-705 dark:text-slate-350 block mb-1">Nội dung text trên Slide</label>
                          <input
                            type="text"
                            value={scene.text}
                            onChange={(e) => handleUpdateScene(scene.id, "text", e.target.value)}
                            className="w-full rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-555 drawer-input"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-705 dark:text-slate-355 block mb-1">Kịch bản Audio thuyết minh</label>
                          <textarea
                            rows={2}
                            value={scene.script}
                            onChange={(e) => handleUpdateScene(scene.id, "script", e.target.value)}
                            className="w-full rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-555 leading-4 drawer-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUIZ EDIT TAB */}
              {drawerTab === "quiz" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-202 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Soạn thảo câu hỏi trắc nghiệm kiểm tra</h4>
                      <p className="text-[11px] text-slate-405 dark:text-slate-555 mt-0.5">Học viên cần đạt tối thiểu 70% điểm số để được thông qua bài mới.</p>
                    </div>

                    <button
                      onClick={handleAddQuizQuestion}
                      className="flex items-center gap-1 rounded-lg border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-808 hover:bg-slate-50 dark:hover:bg-slate-750 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    >
                      <Plus size={13} />
                      Thêm câu hỏi
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editQuizzes.map((quiz, qIdx) => (
                      <div key={quiz.id} className="rounded-lg p-3 space-y-2.5 relative group animate-fade-in content-card">
                        <button
                          onClick={() => handleDeleteQuizQuestion(quiz.id)}
                          className="absolute top-3 right-3 text-red-400 hover:text-red-655 opacity-0 group-hover:opacity-100 transition p-1 bg-red-50 dark:bg-red-955/30 hover:bg-red-105 dark:hover:bg-red-900/30 rounded cursor-pointer"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                          Câu hỏi {qIdx + 1}
                        </div>

                        <div>
                          <input
                            type="text"
                            value={quiz.question}
                            onChange={(e) => handleUpdateQuiz(quiz.id, "question", e.target.value)}
                            className="w-full rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-555 drawer-input"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {quiz.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2 rounded-lg p-1.5 option-container">
                              <span className="font-mono text-xs text-slate-400 dark:text-slate-550 font-bold w-5 text-center">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateQuiz(quiz.id, "options", e.target.value, optIdx)}
                                className="flex-1 bg-transparent text-xs outline-none border-b border-transparent hover:border-slate-202 dark:hover:border-slate-850 focus:border-blue-500 py-0.5 text-slate-700 dark:text-slate-300"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-650 dark:text-slate-400">Đáp án đúng:</span>
                            <select
                              value={quiz.answer}
                              onChange={(e) => handleUpdateQuiz(quiz.id, "answer", e.target.value)}
                              className="text-[11px] rounded p-1 font-bold outline-none cursor-pointer drawer-input"
                            >
                              {quiz.options.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {String.fromCharCode(65 + oIdx)} — {opt.substring(0, 15)}...
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 flex items-center justify-end gap-2 shrink-0 drawer-footer-custom">
              <button
                onClick={() => setLessonDrawerOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-55 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-650 dark:text-slate-350 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={saveLessonDrawer}
                className="rounded-lg bg-blue-600 hover:bg-blue-707 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                Lưu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGNMENT EDIT MODAL --- */}
      {assignmentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col justify-between animate-scale-in drawer-container rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between drawer-header-custom">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {isNewAssignment ? "Thêm bài tập mới" : "Chỉnh sửa bài tập"}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {isNewAssignment ? "Thiết lập thuộc tính bài tập" : assignTitle}
                </h2>
              </div>
              <button
                onClick={() => setAssignmentDrawerOpen(false)}
                className="text-slate-405 hover:text-slate-605 dark:hover:text-slate-200 p-1 bg-white dark:bg-slate-805 border border-slate-202 dark:border-slate-700 rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 p-5 overflow-y-auto min-h-0 drawer-body-custom space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Tiêu đề bài tập</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Ví dụ: Vẽ sơ đồ lớp chi tiết..."
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 drawer-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Phân loại bài tập</label>
                <select
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value as any)}
                  className="w-full rounded-lg p-2 text-xs font-bold outline-none cursor-pointer drawer-input"
                >
                  <option value="mindmap">Sơ đồ tư duy (React Flow Canvas)</option>
                  <option value="github">Nộp link GitHub Repo</option>
                  <option value="quiz">Làm bộ câu hỏi Quiz</option>
                  <option value="code_lab">Phòng thực hành Code (IDE Lab)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-3/00 block mb-1.5">Mô tả yêu cầu</label>
                <textarea
                  rows={3}
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  placeholder="Nhập yêu cầu học viên cần hoàn thành..."
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 leading-4 drawer-input"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl shadow-sm content-card">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Yêu cầu bắt buộc</span>
                  <span className="text-[10px] text-slate-405 dark:text-slate-550 block mt-0.5">Phải hoàn thành để qua bài mới</span>
                </div>
                <input
                  type="checkbox"
                  checked={assignRequired}
                  onChange={(e) => setAssignRequired(e.target.checked)}
                  className="h-4 w-4 text-blue-605 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block mb-1.5">Điểm thưởng XP Bonus</label>
                <input
                  type="number"
                  value={assignPoints}
                  onChange={(e) => setAssignPoints(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-blue-500 drawer-input"
                />
              </div>

              {assignType === "github" && (
                <div className="animate-fade-in">
                  <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block mb-1.5">Repository Template URL</label>
                  <input
                    type="text"
                    value={assignRepoTemplate}
                    onChange={(e) => setAssignRepoTemplate(e.target.value)}
                    placeholder="https://github.com/org/repo-template"
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 drawer-input"
                  />
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 flex items-center justify-end gap-2 shrink-0 drawer-footer-custom">
              <button
                onClick={() => setAssignmentDrawerOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-655 dark:text-slate-355 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAssignment}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                Lưu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING AI ASSISTANT COLLAPSED BADGE --- */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="chatbot-badge h-14 w-14 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer active:scale-95 shadow-lg flex items-center justify-center animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          <Bot size={26} className="text-white fill-purple-300" />
        </button>
      )}

      {/* --- FLOATING AI ASSISTANT CHATWINDOW --- */}
      {isChatbotOpen && (
        <div className="chatbot-window drawer-container flex flex-col justify-between border border-slate-200 dark:border-slate-800 animate-scale-in">
          {/* Chat Header */}
          <div className="p-3.5 flex items-center justify-between drawer-header-custom shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-955 text-purple-600 dark:text-purple-400">
                <Bot size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">Trợ lý AI Giảng dạy</h4>
                <span className="text-[9px] text-emerald-500 font-bold block mt-1">Co-Pilot Online</span>
              </div>
            </div>
            <button
              onClick={() => setIsChatbotOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 bg-white dark:bg-slate-805 border border-slate-202 dark:border-slate-700 rounded-full transition"
            >
              <X size={12} />
            </button>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/20 dark:bg-slate-905/30 min-h-0 text-xs">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-955 text-purple-650 dark:text-purple-400 h-6 w-6 flex items-center justify-center shrink-0">
                    <Bot size={13} />
                  </div>
                )}
                <div className="space-y-1">
                  <div
                    className={`rounded-2xl px-3 py-2 leading-5 shadow-sm whitespace-pre-line ${
                      msg.sender === "user" ? "chatbot-message-user" : "chatbot-message-ai"
                    }`}
                  >
                    {/* Render basic markdown formatting */}
                    {msg.text.includes("###") ? (
                      <div className="space-y-2">
                        {msg.text.split("\n").map((line, idx) => {
                          if (line.startsWith("###")) {
                            return <div key={idx} className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1 mt-2">{line.replace("###", "")}</div>;
                          } else if (line.startsWith("**") || line.startsWith("####")) {
                            return <div key={idx} className="font-bold text-slate-800 dark:text-slate-200">{line.replace(/\*\*|####/g, "")}</div>;
                          } else if (line.startsWith("-")) {
                            return <div key={idx} className="pl-2.5 relative before:content-['•'] before:absolute before:left-0 before:text-purple-500 font-medium">{line.substring(2)}</div>;
                          }
                          return <div key={idx} className="font-medium text-slate-650 dark:text-slate-350">{line}</div>;
                        })}
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 dark:text-slate-550 block text-right px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isChatbotTyping && (
              <div className="flex gap-2 mr-auto max-w-[85%]">
                <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-955 text-purple-655 dark:text-purple-400 h-6 w-6 flex items-center justify-center shrink-0">
                  <Bot size={13} />
                </div>
                <div className="chatbot-message-ai rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Quick Prompts */}
          {chatMessages.length === 1 && !isChatbotTyping && (
            <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 shrink-0 space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Gợi ý nhanh</span>
              <div className="flex flex-col gap-1 text-[10px]">
                <button
                  onClick={() => handleChatbotSubmit("Hãy soạn cho tôi 1 bài tập thực hành nâng cao về Đa hình")}
                  className="w-full text-left p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:border-purple-300 dark:hover:border-purple-900 transition font-medium cursor-pointer"
                >
                  📝 Soạn bài tập Đa hình nâng cao
                </button>
                <button
                  onClick={() => handleChatbotSubmit("Gen thêm 5 câu hỏi trắc nghiệm logic cho Bài 1.2")}
                  className="w-full text-left p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:border-purple-300 dark:hover:border-purple-900 transition font-medium cursor-pointer"
                >
                  ❓ Tạo 5 câu quiz cho Bài 1.2
                </button>
                <button
                  onClick={() => handleChatbotSubmit("Tóm tắt phân tích tình hình lớp OOP tuần này")}
                  className="w-full text-left p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:border-purple-300 dark:hover:border-purple-900 transition font-medium cursor-pointer"
                >
                  📊 Phân tích học lực lớp OOP
                </button>
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-2.5 drawer-footer-custom shrink-0 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nhập câu hỏi soạn bài..."
              value={chatbotInput}
              onChange={(e) => setChatbotInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatbotSubmit()}
              className="flex-1 rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-500 drawer-input font-medium"
            />
            <button
              onClick={() => handleChatbotSubmit()}
              className="p-2 rounded-lg bg-purple-650 hover:bg-purple-755 text-white active:scale-95 transition shrink-0 cursor-pointer shadow-md"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import MarloSelect from "../components/MarloSelect";
import MarloCopilotDrawer from "../components/MarloCopilotDrawer";

const INITIAL_COPILOT_MESSAGE =
  "**Chào giảng viên!** Tôi là **AI Teaching Co-Pilot** đồng hành cùng học phần của bạn:\n" +
  "- **Lab & Docker Tests**: đề xuất đề bài, edge cases và kiểm tra `Valgrind`.\n" +
  "- **Quiz & Nhánh yếu**: sinh nhanh câu hỏi bẫy cho các khái niệm lớp đạt `< 60%`.\n" +
  "- **Hội đồng AI 3D**: gợi ý rubric chấm kép và câu hỏi phản biện chuyên sâu.\n" +
  "> Chọn nhanh một gợi ý bên dưới hoặc nhập yêu cầu trực tiếp để tôi phân tích!";



import {



  ReactFlow,



  ReactFlowProvider,



  Background,



  Controls,



  Handle,



  MiniMap,



  Position,



  addEdge,



  MarkerType,



  useEdgesState,



  useNodesState,



  type Connection,



  type Edge,



  type Node,



  type NodeProps,



} from "@xyflow/react";



import "@xyflow/react/dist/style.css";



import {



  AlertTriangle,



  ArrowDown,



  ArrowRight,



  ArrowUp,



  ArrowUpRight,



  BookOpen,



  Bot,



  Check,



  CheckCircle2,



  ChevronRight,



  Clock,



  Code2,



  Columns3,



  Edit3,



  Eye,



  FileCode,



  FileText,



  Flag,



  FolderKanban,



  GitBranch,



  GitFork,



  GraduationCap,



  HelpCircle,



  History,



  Layers,



  Loader2,



  MessageSquare,



  Network,



  Play,



  Plus,



  RefreshCw,



  RotateCcw,



  Save,



  Send,



  Settings2,



  ShieldAlert,



  ShieldCheck,



  SlidersHorizontal,



  Sparkles,



  Terminal,



  Trash2,



  Upload,
  Users,
  Video,
  WandSparkles,
  X,



} from "lucide-react";



import type { Screen, WorkspaceLaunchTarget } from "../App";



import InstructorStudentsTab from "../components/InstructorStudentsTab";



import {



  addInstructorTestCase,



  askInstructorCopilot,



  createInstructorChapter,



  createInstructorLesson,



  decideDualSubmission,



  deleteInstructorChapter,



  deleteInstructorLesson,



  deleteInstructorTestCase,



  ensureRoleSession,



  fetchDefenseRubric,



  fetchDualSubmissions,



  fetchInstructorCourses,



  fetchKanbanWorkspace,



  fetchStudentsAnalyticsApi,



  patchInstructorChapter,



  remindStudentApi,



  reorderInstructorLessons,



  saveDefenseRubric,



  saveInstructorLesson,



  saveInstructorMindmap,



  updateInstructorAssignment,



  updateInstructorTestCase,



  type StudentAnalyticsItem,



  type WorkspaceProjectDto,



} from "../api";



import LiquidCardConnector from "../components/LiquidCardConnector";



import MarloActivityRing from "../components/MarloActivityRing";



import MarloCapacityBar from "../components/MarloCapacityBar";



import MarloNumber from "../components/MarloNumber";



import MarloSegmentedControl from "../components/MarloSegmentedControl";



import MarloTitle from "../components/MarloTitle";



import MarloToast from "../components/MarloToast";
import InstructorChapterGradingView from "../components/InstructorChapterGradingView";



import {



  INITIAL_DEFENSE_RUBRIC,



  INITIAL_DUAL_SUBMISSIONS,



  INITIAL_INSTRUCTOR_CLASSES,



  type Assignment,



  type CourseClass,



  type DefenseRubricConfig,



  type DockerTestCase,



  type DualSubmissionRecord,



  type Lesson,



  type LessonContent,



  type MasterMindmapNodeData,



  type QuizQuestion,



  type VideoScene,



} from "../data/instructorData";

import { MULTI_CHAPTER_SUBJECTS } from "../data/multiChapterCurriculum";
import { extractNumericLessonCode } from "../utils/lessonFormat";

function getEffectiveLessonXp(subjectId: string | undefined, lesson: Lesson): number {
  if (typeof (lesson as any).xp === "number" && (lesson as any).xp > 0) {
    return (lesson as any).xp;
  }
  const subj = MULTI_CHAPTER_SUBJECTS.find((s) => s.id === subjectId);
  const code = extractNumericLessonCode(lesson.id, lesson.title);
  if (subj) {
    for (const ch of subj.chapters) {
      const matched = ch.lessons.find(
        (l) => l.id === lesson.id || (code ? l.id === code : false)
      );
      if (matched && typeof matched.xp === "number" && matched.xp > 0) {
        return matched.xp;
      }
    }
  }
  return 60;
}



import {



  animateMarloCards,



  animateMarloRows,



  useMarloPageEntrance,



} from "../utils/marloAnimations";



export type InstructorTab = "overview" | "syllabus" | "grading" | "students" | "mindmap";

export function extractYoutubeId(url?: string): string {
  if (!url) return "M6FwepHC6vM";
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : "M6FwepHC6vM";
}

export function isValidYoutubeInput(url?: string): boolean {
  if (!url || !url.trim()) return true;
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return true;
  return /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/.test(clean);
}

function getSubjectAigcPreset(subjectId: string, courseCode: string, lessonTitle: string) {
  const sid = (subjectId || "").toLowerCase();
  if (sid === "frontend" || sid === "realtime" || sid === "web") {
    return {
      lang: "typescript",
      code: `// Minh họa ${courseCode}: ${lessonTitle}\nexport interface ModuleState {\n  status: "ready" | "active";\n  items: string[];\n}\n\nexport function executeModule(state: ModuleState): number {\n  return state.items.filter(Boolean).length;\n}`,
      caption: `Mã nguồn TypeScript (${courseCode}) minh họa kiến trúc cho ${lessonTitle}`,
      leadNote: "tối ưu render cycle, type-safety và kiến trúc API/Frontend",
      badDesc: "Mutate trực tiếp state/DOM ngoài luồng reactive hoặc bỏ qua xử lý lỗi bất đồng bộ.",
      solution: "Tách biệt state thuần, typed DTO rõ ràng và cleanup effect/subscription đúng vòng đời.",
    };
  }
  if (sid === "mobile") {
    return {
      lang: "dart",
      code: `// Minh họa ${courseCode} (Flutter & Dart): ${lessonTitle}\nimport 'package:flutter/widgets.dart';\n\nclass CoreModuleState {\n  final int completedSteps;\n  const CoreModuleState(this.completedSteps);\n}`,
      caption: `Mã nguồn Dart/Flutter (${courseCode}) minh họa cho ${lessonTitle}`,
      leadNote: "quản lý Widget tree, state BLoC và hiệu năng khung hình trên di động",
      badDesc: "Gọi tác vụ nặng ngay trong build() hoặc rò rỉ StreamController không dispose.",
      solution: "Đặt logic nghiệp vụ trong Cubit/BLoC tách biệt và giải phóng controller tại dispose().",
    };
  }
  if (sid === "system-design") {
    return {
      lang: "sql",
      code: `-- Minh họa ${courseCode}: ${lessonTitle}\nSELECT u.id, u.full_name, COUNT(s.id) AS submissions\nFROM users u\nLEFT JOIN student_chapter_submissions s ON s.user_id = u.id\nGROUP BY u.id, u.full_name;`,
      caption: `Truy vấn & Thiết kế Hệ thống (${courseCode}) minh họa cho ${lessonTitle}`,
      leadNote: "chuẩn hóa dữ liệu, đánh chỉ mục (indexing) và kiến trúc chịu tải cao",
      badDesc: "Thiết kế bảng phi chuẩn gây dị thường cập nhật và truy vấn N+1 không có index.",
      solution: "Chuẩn hóa 3NF hợp lý, tạo composite index theo access pattern và phân tách read/write.",
    };
  }
  if (sid === "ai-ml" || sid === "ai-agent" || sid === "security") {
    return {
      lang: "python",
      code: `# Minh họa ${courseCode}: ${lessonTitle}\nfrom dataclasses import dataclass\n\n@dataclass\nclass PipelineResult:\n    score: float\n    verified: bool\n\ndef evaluate_step(confidence: float) -> PipelineResult:\n    return PipelineResult(score=confidence, verified=confidence >= 0.8)`,
      caption: `Mã nguồn Python (${courseCode}) minh họa chuẩn cho ${lessonTitle}`,
      leadNote: "kiểm soát luồng dữ liệu, độ chính xác mô hình và an toàn thực thi",
      badDesc: "Tin cậy trực tiếp đầu vào chưa kiểm chứng (raw input) hoặc đánh giá mô hình không tách validation.",
      solution: "Áp dụng schema validation nghiêm ngặt, kiểm thử đầu vào/ra và theo dõi chỉ số định lượng.",
    };
  }
  if (sid === "devops" || sid === "cloud" || sid === "distributed" || sid === "scrum" || sid === "capstone") {
    return {
      lang: "yaml",
      code: `# Cấu hình ${courseCode}: ${lessonTitle}\nservice: codemind-sandbox\nchecks:\n  - lint-and-typecheck\n  - automated-tests\nretry_policy:\n  max_attempts: 3`,
      caption: `Đặc tả kiến trúc & pipeline (${courseCode}) cho ${lessonTitle}`,
      leadNote: "tính sẵn sàng cao, tự động hóa CI/CD và phối hợp quy trình kỹ nghệ",
      badDesc: "Triển khai thủ công thiếu rollback, không kiểm tra healthcheck hay giới hạn tài nguyên.",
      solution: "Khai báo hạ tầng dưới dạng mã (IaC), tự động kiểm thử trước deploy và giám sát telemetry.",
    };
  }
  return {
    lang: "cpp",
    code: `// Minh họa ${courseCode}: ${lessonTitle}\n#include <iostream>\n#include <memory>\n\nclass CoreEngine {\npublic:\n    virtual void execute() {\n        std::cout << "[Engine] Executing: ${lessonTitle}\\n";\n    }\n    virtual ~CoreEngine() = default;\n};\n\nint main() {\n    auto engine = std::make_unique<CoreEngine>();\n    engine->execute();\n    return 0;\n}`,
    caption: `Mã nguồn C++ (${courseCode}) minh họa kiến trúc chuẩn cho ${lessonTitle}`,
    leadNote: "cấu trúc bộ nhớ, kiểm soát con trỏ (RAII) và tối ưu hóa hiệu năng",
    badDesc: "Khởi tạo tài nguyên thủ công bằng con trỏ thô (raw pointer) hoặc dùng sai phạm vi kế thừa.",
    solution: "Đóng gói vòng đời tài nguyên vào smart pointer (unique_ptr/shared_ptr) theo chuẩn RAII.",
  };
}



interface InstructorPanelProps {



  currentSection?: Screen;



  onNavigate?: (screen: Screen) => void;



  onOpenWorkspace?: (target: Omit<WorkspaceLaunchTarget, "nonce">) => void;



}



function sectionToTab(section?: Screen): InstructorTab {



  switch (section) {



    case "instructor-courses":



      return "syllabus";



    case "instructor-grading":



      return "grading";



    case "instructor-mindmap":



      return "mindmap";



    case "instructor-students":



      return "students";



    case "instructor":



    default:



      return "overview";



  }



}



function tabToSection(tab: InstructorTab): Screen {



  switch (tab) {



    case "syllabus":



      return "instructor-courses";



    case "grading":



      return "instructor-grading";



    case "mindmap":



      return "instructor-mindmap";



    case "students":



      return "instructor-students";



    case "overview":



    default:



      return "instructor";



  }



}



function computeWeightedScore(



  sub: DualSubmissionRecord,



  rubric: DefenseRubricConfig



): number {



  const cicdPct = sub.totalTests > 0 ? (sub.passedTests / sub.totalTests) * 100 : 0;



  return Math.round(



    (cicdPct * rubric.cicdWeightPct + sub.defenseScore * rubric.defenseWeightPct) / 100



  );



}



function hasDiscrepancy(



  sub: DualSubmissionRecord,



  rubric: DefenseRubricConfig



): boolean {



  const cicdPct = sub.totalTests > 0 ? (sub.passedTests / sub.totalTests) * 100 : 0;



  return Math.abs(cicdPct - sub.defenseScore) >= rubric.autoFlagDiscrepancyThreshold;



}



// ─── MONOCHROME MASTER MINDMAP NODE (MATCHES CompactTreeMindmapNode CLEAN STYLE) ───



function MonochromeMasterNode({



  data,



  selected,



}: NodeProps<Node<MasterMindmapNodeData>>) {



  const isRoot = data.nodeType === "root";



  const isBranch = data.nodeType === "branch";



  const weakClassNode = data.masteryPct < 60;



  if (isRoot) {



    return (



      <div



        className={`relative min-w-[225px] max-w-[255px] rounded-xl p-4 select-none transition-all duration-150 bg-[#141619] text-white dark:bg-[#12141a] border ${



          selected



            ? "border-[#EE8420] ring-2 ring-[#EE8420]/30"



            : "border-slate-700/80 dark:border-slate-700"



        } shadow-sm`}



      >



        <div className="flex items-center gap-2.5">



          <div className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center justify-center shrink-0">



            <GitBranch size={16} strokeWidth={2.2} />



          </div>



          <div className="min-w-0 flex-1">



            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">



              {data.tag}



            </div>



            <h4 className="text-[13px] font-bold leading-tight text-white tracking-tight mt-0.5">



              {data.title}



            </h4>



          </div>



        </div>



        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed line-clamp-2">



          {data.summary}



        </p>



        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">



          <span className="text-slate-200 font-bold">{data.masteryPct}% Nắm vững</span>



          {data.xp && (



            <span className="font-semibold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/70 text-[10px]">



              +{data.xp} XP



            </span>



          )}



        </div>



        <Handle



          type="source"



          position={Position.Right}



          className="!w-2.5 !h-2.5 !rounded-full !bg-slate-400 !border-2 !border-[#141619]"



        />



      </div>



    );



  }



  return (



    <div



      className={`relative min-w-[215px] max-w-[245px] rounded-xl border px-3.5 py-3 select-none transition-all duration-150 bg-white dark:bg-slate-900 shadow-xs ${



        selected



          ? "border-[#EE8420] ring-2 ring-[#EE8420]/25"



          : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"



      }`}



    >



      <Handle



        type="target"



        position={Position.Left}



        className="!w-2 !h-2 !rounded-full !bg-slate-400 !border-2 !border-white dark:!border-slate-900"



      />



      <div className="flex items-center justify-between gap-2">



        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">



          <span



            className={`w-2 h-2 rounded-full ${



              isBranch ? "bg-[#141619] dark:bg-white" : "bg-slate-400"



            }`}



          />



          {data.tag}



        </span>



        <span



          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${



            weakClassNode



              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80"



              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"



          }`}



        >



          {data.masteryPct}%



        </span>



      </div>



      <div className="mt-1.5 text-[12.5px] font-bold text-slate-900 dark:text-white leading-snug">



        {data.title}



      </div>



      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">



        {data.summary}



      </div>



      <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">



        <div



          className={`h-full rounded-full ${



            weakClassNode ? "bg-[#EE8420]" : "bg-[#141619] dark:bg-slate-300"



          }`}



          style={{ width: `${Math.min(100, Math.max(0, data.masteryPct))}%` }}



        />



      </div>



      <Handle



        type="source"



        position={Position.Right}



        className="!w-2 !h-2 !rounded-full !bg-slate-400 !border-2 !border-white dark:!border-slate-900"



      />



    </div>



  );



}



const masterMindmapNodeTypes = {



  masterMindmapNode: MonochromeMasterNode,



};



export default function InstructorPanel({



  currentSection = "instructor",



  onNavigate,



  onOpenWorkspace,



}: InstructorPanelProps) {



  const [tab, setTab] = useState<InstructorTab>(() => sectionToTab(currentSection));



  const [classes, setClasses] = useState<CourseClass[]>([]);



  const [selectedClassId, setSelectedClassId] = useState<string>("");



  const [overviewScope, setOverviewScope] = useState<"class" | "all">("class");



  // Submissions & Rubric State



  const [submissions, setSubmissions] = useState<DualSubmissionRecord[]>(INITIAL_DUAL_SUBMISSIONS);



  const [rubric, setRubric] = useState<DefenseRubricConfig>(INITIAL_DEFENSE_RUBRIC);



  const [gradingScope, setGradingScope] = useState<"chapter_exercises" | "dual_submissions">("chapter_exercises");
  const [gradingFilter, setGradingFilter] = useState<"all" | "pending" | "flagged" | "graded">("all");



  const [selectedSubId, setSelectedSubId] = useState<string | null>(INITIAL_DUAL_SUBMISSIONS[0].id);



  const [gradeInput, setGradeInput] = useState<string>("");



  const [feedbackInput, setFeedbackInput] = useState<string>("");



  const [rubricModalOpen, setRubricModalOpen] = useState(false);



  const [newProbeKeyword, setNewProbeKeyword] = useState("");



  const [newProbeTopic, setNewProbeTopic] = useState("");



  // Real Student Analytics for Overview KPIs & Struggling Students (synced from MySQL)



  const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalyticsItem[]>([]);



  const [workspaceLoading, setWorkspaceLoading] = useState(true);



  // Syllabus & AIGC Lesson Studio State



  const [showAddChapter, setShowAddChapter] = useState(false);



  const [newChapterTitle, setNewChapterTitle] = useState("");



  const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);



  const [renameChapterInput, setRenameChapterInput] = useState("");



  const [addingLessonChapterId, setAddingLessonChapterId] = useState<string | null>(null);



  const [newLessonTitle, setNewLessonTitle] = useState("");



  const [lessonModalOpen, setLessonModalOpen] = useState(false);



  const [activeLessonChapterId, setActiveLessonChapterId] = useState<string | null>(null);



  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);



  const [drawerTab, setDrawerTab] = useState<"upload" | "video" | "reading" | "quiz" | "mindmap">("video");

  const [editTitle, setEditTitle] = useState("");

  const [editDuration, setEditDuration] = useState("15 phút");

  const [editXp, setEditXp] = useState<number>(150);

  const [editDocuments, setEditDocuments] = useState<{ name: string; size: string; uploadedAt: string }[]>([]);

  const [aigcTriggeredInModal, setAigcTriggeredInModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editReading, setEditReading] = useState("");

  const [editScenes, setEditScenes] = useState<VideoScene[]>([]);

  const [editQuizzes, setEditQuizzes] = useState<QuizQuestion[]>([]);

  const [editYoutubeUrl, setEditYoutubeUrl] = useState("https://www.youtube.com/watch?v=M6FwepHC6vM");

  const [editObjective, setEditObjective] = useState("");

  const [editLead, setEditLead] = useState("");

  const [editCodeSnippet, setEditCodeSnippet] = useState<{ lang: string; code: string; caption: string }>({
    lang: "cpp",
    code: "",
    caption: "",
  });

  const [editKeyTakeaways, setEditKeyTakeaways] = useState<string[]>([]);

  const [editAntiPattern, setEditAntiPattern] = useState<{ badDesc: string; solution: string }>({
    badDesc: "",
    solution: "",
  });

  const [editStatus, setEditStatus] = useState<"Đã phát hành" | "Bản nháp">("Đã phát hành");



  const [isAigcRunning, setIsAigcRunning] = useState(false);



  const [aigcStep, setAigcStep] = useState(0);



  // Test Case & Assignment Configurator Modal State



  const [tcModalOpen, setTcModalOpen] = useState(false);



  const [tcChapterId, setTcChapterId] = useState<string | null>(null);



  const [tcAssignmentId, setTcAssignmentId] = useState<string | null>(null);



  const [editAssignTitle, setEditAssignTitle] = useState("");



  const [editAssignDesc, setEditAssignDesc] = useState("");



  const [editAssignPoints, setEditAssignPoints] = useState<number>(100);



  const [editAssignDockerImage, setEditAssignDockerImage] = useState("codemind/cpp20-sandbox:latest");



  const [editingTcId, setEditingTcId] = useState<string | null>(null);



  const [editTcTitle, setEditTcTitle] = useState("");



  const [editTcInput, setEditTcInput] = useState("");



  const [editTcOutput, setEditTcOutput] = useState("");



  const [editTcEdgeCase, setEditTcEdgeCase] = useState(false);



  const [newTcTitle, setNewTcTitle] = useState("");



  const [newTcInput, setNewTcInput] = useState("");



  const [newTcOutput, setNewTcOutput] = useState("");



  const [newTcEdgeCase, setNewTcEdgeCase] = useState(false);

  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProjectDto[]>([]);



  // Student Preview Modal State



  const [previewLesson, setPreviewLesson] = useState<{ chapterTitle: string; lesson: Lesson; assignment?: Assignment } | null>(null);



  const [previewTab, setPreviewTab] = useState<"reading" | "video" | "quiz" | "exercise">("reading");



  const [previewQuizAnswers, setPreviewQuizAnswers] = useState<Record<string, number>>({});



  // Master Mindmap State



  const [selectedMindmapChapterId, setSelectedMindmapChapterId] = useState<string>(



    INITIAL_INSTRUCTOR_CLASSES[0].chapters[0].id



  );



  const [isMindmapDirty, setIsMindmapDirty] = useState(false);



  const [mindmapMode, setMindmapMode] = useState<"edit" | "compare">("edit");



  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MasterMindmapNodeData>>(



    INITIAL_INSTRUCTOR_CLASSES[0].chapters[0].mindmapNodes || []



  );



  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(



    INITIAL_INSTRUCTOR_CLASSES[0].chapters[0].mindmapEdges || []



  );



  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);



  const [isMindmapGenerating, setIsMindmapGenerating] = useState(false);



  const [mindmapStep, setMindmapStep] = useState(0);



  // Student Reminders & Co-Pilot Drawer



  const [sentReminders, setSentReminders] = useState<Record<string, boolean>>({});



  const [isCopilotOpen, setIsCopilotOpen] = useState(false);



  const [copilotInput, setCopilotInput] = useState("");



  const [copilotTyping, setCopilotTyping] = useState(false);



  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string }>
  >([
    {
      sender: "ai",
      text: INITIAL_COPILOT_MESSAGE,
      time: "Hệ thống",
    },
  ]);

  const handleResetCopilot = () => {
    setCopilotMessages([
      {
        sender: "ai",
        text: INITIAL_COPILOT_MESSAGE,
        time: "Hệ thống",
      },
    ]);
  };



  // Marlo Toast



  const [toastMsg, setToastMsg] = useState<string | null>(null);



  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);



  const notify = (msg: string) => {



    setToastMsg(msg);



    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);



    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3400);



  };



  // Refs for entrance animation



  const panelRef = useRef<HTMLDivElement>(null);



  const contentRef = useRef<HTMLDivElement>(null);



  useMarloPageEntrance(panelRef, (el) => {
    const chrome = el.querySelectorAll(
      ".marlo-card:not([data-content-stage] .marlo-card)"
    );
    if (chrome.length > 0) {
      animateMarloCards(chrome, { y: 18, stagger: 0.045, duration: 0.65 });
    }
  });



  useEffect(() => {



    setTab(sectionToTab(currentSection));



  }, [currentSection]);



  const activeClass = useMemo(



    () => classes.find((c) => c.id === selectedClassId) || classes[0],



    [classes, selectedClassId]



  );



  // Sync Mindmap chapter & nodes when class or mindmap chapter changes



  useEffect(() => {



    const firstChap = activeClass?.chapters?.[0];



    if (firstChap && !(activeClass?.chapters || []).some((ch) => ch.id === selectedMindmapChapterId)) {



      setSelectedMindmapChapterId(firstChap.id);



    }



  }, [activeClass, selectedMindmapChapterId]);



  useEffect(() => {



    const ch = (activeClass?.chapters || []).find((item) => item.id === selectedMindmapChapterId);

    setNodes(ch?.mindmapNodes || []);

    setEdges(ch?.mindmapEdges || []);

    setSelectedNodeId(null);

    setIsMindmapDirty(false);

  }, [activeClass, selectedMindmapChapterId, setNodes, setEdges]);

  const broadcastCoursesUpdated = useCallback((courseId?: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent("codemind-courses-updated", { detail: { courseId: courseId || "" } })
      );
      localStorage.setItem("codemind-courses-sync-ts", String(Date.now()));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  // Hydrate Courses, Dual Submissions, Rubric & Real Student Analytics from MySQL / FastAPI

  const loadInstructorWorkspace = useCallback(async () => {

    setWorkspaceLoading(true);

    await ensureRoleSession("instructor");

    const apiCourses = await fetchInstructorCourses();
    const resolvedCourses = apiCourses !== null ? apiCourses : INITIAL_INSTRUCTOR_CLASSES;
    setClasses(resolvedCourses);

    let activeSecId: string | undefined;
    if (resolvedCourses.length > 0) {
      const keepExisting = resolvedCourses.some((c) => c.id === selectedClassId);
      const picked = keepExisting ? selectedClassId : resolvedCourses[0].id;
      if (picked !== selectedClassId) setSelectedClassId(picked);
      const found = resolvedCourses.find((c) => c.id === picked) || resolvedCourses[0];
      activeSecId = found.sectionId || found.id;
    } else {
      setSelectedClassId("");
    }

    const [apiSubs, apiRubric, apiStudents, apiKbWs] = await Promise.all([
      fetchDualSubmissions(activeSecId),
      fetchDefenseRubric(),
      fetchStudentsAnalyticsApi(undefined, activeSecId),
      fetchKanbanWorkspace("all"),
    ]);

    if (apiSubs !== null) {
      setSubmissions(apiSubs);
    }

    if (apiRubric) {
      setRubric(apiRubric);
    }

    if (Array.isArray(apiStudents)) {
      setStudentsAnalytics(apiStudents);
    }

    if (apiKbWs?.projects) {
      setWorkspaceProjects(apiKbWs.projects);
    }

    setWorkspaceLoading(false);

  }, []);

  useEffect(() => {
    void loadInstructorWorkspace();
  }, [loadInstructorWorkspace]);

  useEffect(() => {
    if (!activeClass) return;
    const targetSecId =
      overviewScope === "all" ? undefined : activeClass.sectionId || activeClass.id;
    let cancelled = false;
    Promise.all([
      fetchStudentsAnalyticsApi(undefined, targetSecId),
      fetchDualSubmissions(targetSecId),
    ]).then(([apiStudents, apiSubs]) => {
      if (cancelled) return;
      if (Array.isArray(apiStudents)) setStudentsAnalytics(apiStudents);
      if (apiSubs !== null) setSubmissions(apiSubs);
    });
    return () => {
      cancelled = true;
    };
  }, [activeClass?.id, overviewScope]);



  useMarloPageEntrance(
    contentRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card");
      if (cards.length > 0) {
        animateMarloCards(cards, { stagger: 0.05, y: 22, duration: 0.7 });
      }
      const rows = el.querySelectorAll(".marlo-row");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 10, stagger: 0.025, delay: 0.16, duration: 0.5 });
      }
    },
    [tab, selectedClassId]
  );



  const handleTabSwitch = (nextTab: InstructorTab) => {



    setTab(nextTab);



    onNavigate?.(tabToSection(nextTab));



  };



  const handleClassSelect = (nextClassId: string) => {



    setSelectedClassId(nextClassId);



    const firstSub = submissions.find((s) => s.classId === nextClassId);



    if (firstSub) setSelectedSubId(firstSub.id);



  };



  // Filtered submissions for selected class



  const classSubmissions = useMemo(() => {
    const list = submissions.filter(
      (s) =>
        s.classId === selectedClassId ||
        (Boolean(activeClass?.courseId) && s.classId === activeClass?.courseId) ||
        overviewScope === "all"
    );



    if (gradingFilter === "all") return list;



    if (gradingFilter === "flagged") {



      return list.filter((s) => s.status === "flagged" || hasDiscrepancy(s, rubric));



    }



    if (gradingFilter === "pending") {



      return list.filter((s) => s.status === "pending" || s.status === "redefense_requested");



    }



    return list.filter((s) => s.status === "graded");



  }, [submissions, selectedClassId, overviewScope, gradingFilter, rubric]);



  const activeSubmission = useMemo(



    () =>



      submissions.find((s) => s.id === selectedSubId) ||



      classSubmissions[0] ||



      null,



    [submissions, selectedSubId, classSubmissions]



  );



  useEffect(() => {



    if (activeSubmission) {



      const suggested =



        activeSubmission.finalScore !== null



          ? activeSubmission.finalScore



          : computeWeightedScore(activeSubmission, rubric);



      setGradeInput(String(suggested));



      setFeedbackInput(activeSubmission.instructorFeedback || "");



    }



  }, [activeSubmission?.id, rubric]);



  // Overview aggregates



  const overviewStats = useMemo(() => {



    const scopeSubs =
      overviewScope === "all"
        ? submissions
        : submissions.filter(
            (s) =>
              s.classId === selectedClassId ||
              (Boolean(activeClass?.courseId) && s.classId === activeClass?.courseId)
          );



    const gradedCount = scopeSubs.filter((s) => s.status === "graded").length;



    const pendingCount = scopeSubs.filter(



      (s) => s.status === "pending" || s.status === "redefense_requested"



    ).length;



    const flaggedCount = scopeSubs.filter(



      (s) => s.status === "flagged" || hasDiscrepancy(s, rubric)



    ).length;



    const studentCount =

      studentsAnalytics.length > 0 && overviewScope === "all"

        ? studentsAnalytics.length

        : overviewScope === "all"

        ? classes.reduce((sum, c) => sum + c.studentCount, 0)

        : activeClass?.studentCount ?? 0;



    const avgCompletion =



      overviewScope === "all"



        ? Math.round(classes.reduce((sum, c) => sum + c.avgProgressPct, 0) / Math.max(1, classes.length))



        : activeClass?.avgProgressPct ?? 0;



    const topPerformersCount = studentsAnalytics.filter((s) => s.risk_status === "top_performer").length;

    const onTrackCount = studentsAnalytics.filter((s) => s.risk_status === "on_track").length;

    const atRiskCount = studentsAnalytics.filter((s) => s.risk_status === "at_risk").length;



    const projectsDone = workspaceProjects.filter((p) => p.status === "delivered").length;



    const projectsActive = workspaceProjects.filter(

      (p) => p.status === "active" || p.status === "review"

    ).length;



    const projectsPlan = workspaceProjects.filter((p) => p.status === "planning").length;



    return {



      studentCount,



      avgCompletion,



      gradedCount,



      pendingCount,



      flaggedCount,



      totalSubs: scopeSubs.length,



      topPerformersCount,



      onTrackCount,



      atRiskCount,



      projectsDone,



      projectsActive,



      projectsPlan,



    };



  }, [overviewScope, submissions, selectedClassId, rubric, classes, activeClass, studentsAnalytics, workspaceProjects]);



  // --- GRADING ACTIONS ---



  const handleApproveDualScore = async () => {



    if (!activeSubmission) return;



    const score = Number(gradeInput);



    if (Number.isNaN(score) || score < 0 || score > 100) {



      notify("Vui lòng nhập điểm tổng hợp hợp lệ (0 - 100).");



      return;



    }



    const feedbackText =



      feedbackInput.trim() || "Đã nghiệm thu kết quả CI/CD và biên bản phản biện AI.";



    const decided = await decideDualSubmission(activeSubmission.id, {
      action: "approve",
      final_score: score,
      instructor_feedback: feedbackText,
    });
    if (!decided) {
      notify("❌ Không thể lưu kết quả phê duyệt điểm lên máy chủ.");
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === activeSubmission.id
          ? {
              ...s,
              status: "graded",
              finalScore: score,
              instructorFeedback: feedbackText,
            }
          : s
      )
    );

    window.dispatchEvent(new CustomEvent("codemind-instructor-updated"));
    notify(`Đã phê duyệt ${score}/100 cho ${activeSubmission.studentName}.`);
  };

  const handleRequestRedefense = async () => {
    if (!activeSubmission) return;
    const feedbackText =
      feedbackInput.trim() ||
      "Yêu cầu bảo vệ lại trực tiếp trên Phòng Phản Biện AI 3D để xác minh năng lực thực tế.";

    const decided = await decideDualSubmission(activeSubmission.id, {
      action: "redefense",
      instructor_feedback: feedbackText,
    });
    if (!decided) {
      notify("❌ Không thể gửi yêu cầu bảo vệ lại lên máy chủ.");
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === activeSubmission.id
          ? {
              ...s,
              status: "redefense_requested",
              instructorFeedback: feedbackText,
            }
          : s
      )
    );

    window.dispatchEvent(new CustomEvent("codemind-instructor-updated"));
    notify(`Đã gửi yêu cầu bảo vệ lại 3D AI cho ${activeSubmission.studentName}.`);
  };



  // --- SYLLABUS & TEST CASE ACTIONS ---



  const toggleChapterStatus = async (chapterId: string) => {

    const ch = (activeClass?.chapters || []).find((item) => item.id === chapterId);

    const nextStatus = ch?.status === "Đã phát hành" ? "Bản nháp" : "Đã phát hành";

    const res = await patchInstructorChapter(selectedClassId, chapterId, { status: nextStatus });

    if (!res) {
      notify("❌ Không thể cập nhật trạng thái chương trên máy chủ.");
      return;
    }

    setClasses((prev) =>

      prev.map((c) =>

        c.id !== selectedClassId

          ? c

          : {

              ...c,

              chapters: c.chapters.map((item) =>

                item.id === chapterId ? { ...item, status: nextStatus } : item

              ),

            }

      )

    );

    broadcastCoursesUpdated(selectedClassId);

    notify(
      nextStatus === "Đã phát hành"
        ? "Đã phát hành chương học tới Không gian Học viên 1-1."
        : "Đã chuyển chương học sang Bản nháp (ẩn với học viên)."
    );

  };



  const handleRenameChapter = async (chapterId: string) => {
    const titleTrim = renameChapterInput.trim();
    if (!titleTrim) {
      notify("⚠️ Tên chương không được để trống.");
      return;
    }
    const res = await patchInstructorChapter(selectedClassId, chapterId, { title: titleTrim });
    if (!res) {
      notify("❌ Không thể đổi tên chương trên máy chủ.");
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((item) =>
                item.id === chapterId ? { ...item, title: titleTrim } : item
              ),
            }
      )
    );
    setRenamingChapterId(null);
    setRenameChapterInput("");
    broadcastCoursesUpdated(selectedClassId);
    notify(`Đã đổi tên chương thành "${titleTrim}".`);
  };



  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (!window.confirm(`Xóa "${chapterTitle}" và toàn bộ bài học/test case bên trong?`)) return;
    const res = await deleteInstructorChapter(selectedClassId, chapterId);
    if (!res) {
      notify("❌ Không thể xóa chương trên máy chủ.");
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.filter((ch) => ch.id !== chapterId),
            }
      )
    );
    if (selectedMindmapChapterId === chapterId) {
      const remaining = (activeClass?.chapters || []).filter((ch) => ch.id !== chapterId);
      setSelectedMindmapChapterId(remaining[0]?.id || "");
    }
    broadcastCoursesUpdated(selectedClassId);
    notify(`Đã xóa chương "${chapterTitle}".`);
  };



  const handleAddChapter = async () => {

    const titleTrim = newChapterTitle.trim();

    if (!titleTrim) {
      notify("⚠️ Vui lòng nhập tên chương học mới.");
      return;
    }

    const res = await createInstructorChapter(selectedClassId, titleTrim);

    if (!res?.chapter) {
      notify("❌ Không thể tạo chương học mới trên máy chủ MySQL.");
      return;
    }

    const newChapterObj = res.chapter;

    setClasses((prev) =>

      prev.map((c) =>

        c.id !== selectedClassId

          ? c

          : {

              ...c,

              chapters: [...c.chapters, newChapterObj],

            }

      )

    );

    setNewChapterTitle("");

    setShowAddChapter(false);

    broadcastCoursesUpdated(selectedClassId);

    notify("Đã thêm chương học mới vào MySQL (Bản nháp).");

  };



  const handleAddLesson = async (chapterId: string) => {

    const titleTrim = newLessonTitle.trim();

    if (!titleTrim) {
      notify("⚠️ Vui lòng nhập tiêu đề bài học mới.");
      return;
    }

    const res = await createInstructorLesson(selectedClassId, chapterId, titleTrim);

    if (!res?.lesson) {
      notify("❌ Không thể tạo bài học mới trên máy chủ.");
      return;
    }

    const newLesson: Lesson = res.lesson;

    setClasses((prev) =>

      prev.map((c) =>

        c.id !== selectedClassId

          ? c

          : {

              ...c,

              chapters: c.chapters.map((ch) =>

                ch.id === chapterId ? { ...ch, lessons: [...ch.lessons, newLesson] } : ch

              ),

            }

      )

    );

    setNewLessonTitle("");

    setAddingLessonChapterId(null);

    broadcastCoursesUpdated(selectedClassId);

    notify(`Đã tạo bài học "${titleTrim}".`);

  };



  const handleDeleteLesson = async (chapterId: string, lessonId: string, lessonTitle: string) => {
    if (!window.confirm(`Xóa bài giảng "${lessonTitle}"?`)) return;
    const res = await deleteInstructorLesson(selectedClassId, chapterId, lessonId);
    if (!res) {
      notify("❌ Không thể xóa bài giảng trên máy chủ.");
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id !== chapterId
                  ? ch
                  : { ...ch, lessons: (ch.lessons || []).filter((l) => l.id !== lessonId) }
              ),
            }
      )
    );
    broadcastCoursesUpdated(selectedClassId);
    notify(`Đã xóa bài giảng "${lessonTitle}".`);
  };



  const handleReorderLesson = async (chapterId: string, lessonId: string, direction: -1 | 1) => {
    const ch = (activeClass?.chapters || []).find((item) => item.id === chapterId);
    if (!ch || !ch.lessons) return;
    const idx = ch.lessons.findIndex((l) => l.id === lessonId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ch.lessons.length) return;

    const reordered = [...ch.lessons];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((l) => l.id);

    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((item) =>
                item.id === chapterId ? { ...item, lessons: reordered } : item
              ),
            }
      )
    );

    const res = await reorderInstructorLessons(selectedClassId, chapterId, ids);
    if (!res) {
      notify("❌ Lỗi lưu thứ tự bài giảng lên máy chủ.");
      void loadInstructorWorkspace();
      return;
    }
    broadcastCoursesUpdated(selectedClassId);
    notify("Đã cập nhật thứ tự bài giảng.");
  };



  const openLessonStudio = (chapterId: string, lesson: Lesson) => {
    setActiveLessonChapterId(chapterId);
    setSelectedLesson(lesson);
    const content = (lesson.content || {}) as any;
    const preset = getSubjectAigcPreset(activeClass?.subjectId || "", activeClass?.code || "CS201", lesson.title);
    const baseSub = MULTI_CHAPTER_SUBJECTS.find((s) => s.id === activeClass?.subjectId);
    const chapIdx = Math.max(0, (activeClass?.chapters || []).findIndex((c) => c.id === chapterId));
    const activeChapObj = (activeClass?.chapters || [])[chapIdx];
    const lesIdx = Math.max(0, (activeChapObj?.lessons || []).findIndex((l) => l.id === lesson.id));
    const baseChap = baseSub?.chapters.find((c) => c.id === chapterId) || baseSub?.chapters[chapIdx];
    const titlePrefix = String(lesson.title || "").match(/^(\d+\.\d+)/)?.[1];
    const baseLesson =
      baseChap?.lessons.find((b) => b.id === lesson.id) ||
      (titlePrefix ? baseChap?.lessons.find((b) => b.id === titlePrefix) : undefined) ||
      (baseChap && lesIdx < baseChap.lessons.length ? baseChap.lessons[lesIdx] : undefined);

    setEditTitle(lesson.title || "");
    setEditDuration(lesson.duration || baseLesson?.duration || "15 phút");
    setEditXp(getEffectiveLessonXp(activeClass?.subjectId, lesson));
    setEditDocuments(
      Array.isArray(lesson.documents)
        ? lesson.documents
        : (baseLesson?.documents || []).map((d) => ({
            name: d.name,
            size: d.size || "1.2 MB",
            uploadedAt: d.uploadedAt || "Đã đồng bộ",
          }))
    );
    setAigcTriggeredInModal(false);
    setEditReading(content.reading || baseLesson?.reading || "");
    setEditScenes(
      content.videoScenes && content.videoScenes.length > 0
        ? content.videoScenes
        : baseLesson?.videoScenes && baseLesson.videoScenes.length > 0
        ? baseLesson.videoScenes
        : [
            { id: "s1", title: "Phân cảnh 1: Đặt vấn đề & Tổng quan", text: lesson.title, script: "Giới thiệu bản chất bài học", time: "00:00" },
            { id: "s2", title: `Phân cảnh 2: Demo mã nguồn (${activeClass?.code || "Core"})`, text: `Minh họa kiến trúc ${activeClass?.code || ""}`, script: "Phân tích thực thi", time: "05:20" },
            { id: "s3", title: "Phân cảnh 3: Cạm bẫy thiết kế & Tổng kết", text: "Lưu ý khi biên dịch & kiểm thử", script: "Thực hành trên Docker Sandbox", time: "12:15" },
          ]
    );
    const sourceQuizzes =
      content.quizzes && content.quizzes.length > 0
        ? content.quizzes
        : baseLesson?.quizzes && baseLesson.quizzes.length > 0
        ? baseLesson.quizzes
        : null;
    setEditQuizzes(
      sourceQuizzes
        ? sourceQuizzes.map((q: any, qi: number) => ({
            id: q.id || `q-${qi + 1}`,
            question: q.question || q.q || `Câu hỏi ${qi + 1}`,
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
            answer: q.answer || (q.options ? q.options[typeof q.correctIndex === "number" ? q.correctIndex : 0] : "Phương án A"),
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            explanation: q.explanation || `Giải thích chi tiết theo chuẩn học phần ${activeClass?.code || ""}.`,
          }))
        : [
            {
              id: `q-1`,
              question: `Trong chuyên đề ${lesson.title}, cơ chế cốt lõi nào giúp hệ thống vận hành ổn định?`,
              options: [
                "Tách biệt trách nhiệm rõ ràng, quản lý vòng đời và kiểm soát lỗi biên",
                "Ghép nối cứng toàn bộ logic vào một khối duy nhất không kiểm tra",
                "Bỏ qua bước kiểm thử đầu vào/đầu ra và tài nguyên",
                "Không cần quản lý bộ nhớ hay cấu trúc dữ liệu",
              ],
              answer: "Tách biệt trách nhiệm rõ ràng, quản lý vòng đời và kiểm soát lỗi biên",
              correctIndex: 0,
              explanation: `Nguyên lý này đảm bảo mã nguồn ${activeClass?.code || ""} đạt chuẩn sạch, dễ bảo trì và vượt qua CI/CD.`,
            },
          ]
    );
    const resolvedYtId =
      content.youtubeId ||
      (lesson as any).youtubeId ||
      baseLesson?.youtubeId ||
      "";
    setEditYoutubeUrl(
      content.youtubeUrl ||
        (resolvedYtId
          ? `https://www.youtube.com/watch?v=${resolvedYtId}`
          : baseLesson?.youtubeUrl || "https://www.youtube.com/watch?v=M6FwepHC6vM")
    );
    setEditObjective(
      content.objective ||
        baseLesson?.objective ||
        `Nắm vững nguyên lý và phương pháp thực hành chuyên sâu cho bài học: ${lesson.title}`
    );
    setEditLead(
      content.lead ||
        content.reading ||
        baseLesson?.lead ||
        `Bài học tập trung giải thích cặn kẽ bản chất kỹ thuật của ${lesson.title}, phân tích ${preset.leadNote}.`
    );
    setEditCodeSnippet(
      content.codeSnippet ||
        baseLesson?.codeSnippet || {
          lang: preset.lang,
          code: preset.code,
          caption: preset.caption,
        }
    );
    setEditKeyTakeaways(
      content.keyTakeaways && content.keyTakeaways.length > 0
        ? content.keyTakeaways
        : baseLesson?.keyTakeaways && baseLesson.keyTakeaways.length > 0
        ? baseLesson.keyTakeaways
        : [
            `Hiểu rõ bản chất thiết kế và cơ chế vận hành của ${lesson.title}.`,
            `Nắm vững kỹ thuật ${preset.leadNote}.`,
            "Vượt qua các ca biên (edge cases) khi kiểm thử trên Docker Sandbox.",
          ]
    );
    setEditAntiPattern(
      content.antiPattern ||
        baseLesson?.antiPattern || {
          badDesc: preset.badDesc,
          solution: preset.solution,
        }
    );
    setEditStatus(lesson.status || "Đã phát hành");
    setDrawerTab("video");
    setLessonModalOpen(true);
  };

  const attachLessonDocument = (docName: string, size: string) => {
    if (!selectedLesson || !activeLessonChapterId) return;
    const newDoc = {
      name: docName,
      size,
      uploadedAt: new Date().toLocaleDateString("vi-VN"),
    };
    const nextDocs = editDocuments.some((d) => d.name === docName)
      ? editDocuments.map((d) => (d.name === docName ? newDoc : d))
      : [...editDocuments, newDoc];
    setEditDocuments(nextDocs);
    const updatedLesson: Lesson = { ...selectedLesson, documents: nextDocs };
    setSelectedLesson(updatedLesson);
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id !== activeLessonChapterId
                  ? ch
                  : {
                      ...ch,
                      lessons: ch.lessons.map((l) => (l.id === selectedLesson.id ? updatedLesson : l)),
                    }
              ),
            }
      )
    );
    notify(`Đã đính kèm tài liệu "${docName}". Nhớ nhấn Lưu bài học để đồng bộ.`);
  };

  const handleLessonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const kb = Math.max(1, Math.round(file.size / 1024));
      const sizeStr = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      attachLessonDocument(file.name, sizeStr);
    });
    e.target.value = "";
  };

  const removeLessonDocument = (docName: string) => {
    if (!selectedLesson || !activeLessonChapterId) return;
    const nextDocs = editDocuments.filter((d) => d.name !== docName);
    setEditDocuments(nextDocs);
    const updatedLesson: Lesson = { ...selectedLesson, documents: nextDocs };
    setSelectedLesson(updatedLesson);
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id !== activeLessonChapterId
                  ? ch
                  : {
                      ...ch,
                      lessons: ch.lessons.map((l) => (l.id === selectedLesson.id ? updatedLesson : l)),
                    }
              ),
            }
      )
    );
    notify(`Đã gỡ tài liệu "${docName}".`);
  };

  const runLessonAigc = () => {
    if (!selectedLesson || !activeLessonChapterId) return;
    setIsAigcRunning(true);
    setAigcStep(1);
    const activeLessonTitle = editTitle.trim() || selectedLesson.title;
    const activeDuration = editDuration.trim() || selectedLesson.duration || "15 phút";
    const activePreset = getSubjectAigcPreset(activeClass?.subjectId || "", activeClass?.code || "CS201", activeLessonTitle);
    const preservedYtUrl = editYoutubeUrl.trim() || "https://www.youtube.com/watch?v=M6FwepHC6vM";
    const preservedYtId = extractYoutubeId(preservedYtUrl);

    const timer = setInterval(() => {
      setAigcStep((prev) => {
        if (prev >= 4) {
          clearInterval(timer);

          const genObjective = `Nắm vững nguyên lý và phương pháp thực hành chuyên sâu cho bài học: ${activeLessonTitle}`;
          const genLead = `Bài học (${activeClass.code}) giải thích cặn kẽ bản chất kỹ thuật của ${activeLessonTitle}, tập trung vào ${activePreset.leadNote}.`;
          const genReading = `# Chuyên Đề ${activeClass.code}: ${activeLessonTitle}

## 1. Bản Chất Kiến Trúc & Bối Cảnh
Trong học phần ${activeClass.name}, chuyên đề **${activeLessonTitle}** đóng vai trò then chốt giúp kỹ sư phần mềm làm chủ ${activePreset.leadNote}.

## 2. Quy Tắc Triển Khai Chuẩn Mực
1. Phân tách ranh giới trách nhiệm rõ ràng giữa các tầng xử lý.
2. Kiểm soát chặt chẽ đầu vào, điều kiện biên và giải phóng tài nguyên đúng vòng đời.
3. Đảm bảo khả năng kiểm thử tự động trong Docker Sandbox CI/CD (${activeClass.dockerImage || "codemind/sandbox:latest"}).

## 3. Lưu Ý Trước Khi Nộp Bài
Kiểm tra kỹ các tình huống biên (Edge Cases) và hoàn thành toàn bộ video bài giảng + Quiz kiểm tra kiến thức.`;

          const genCodeSnippet = {
            lang: activePreset.lang,
            code: activePreset.code,
            caption: activePreset.caption,
          };

          const genKeyTakeaways = [
            `Hiểu rõ bản chất thiết kế và cơ chế vận hành của ${activeLessonTitle}.`,
            `Làm chủ kỹ thuật ${activePreset.leadNote}.`,
            "Kiểm soát ca biên và đảm bảo pass 100% test tự động trên Docker Sandbox.",
          ];

          const genAntiPattern = {
            badDesc: activePreset.badDesc,
            solution: activePreset.solution,
          };

          const genScenes: VideoScene[] = [
            {
              id: "ai-s1",
              title: "Phân cảnh 1: Đặt vấn đề & Mục tiêu cốt lõi",
              text: activeLessonTitle,
              script: `Xin chào các bạn, hôm nay trong môn ${activeClass.code} chúng ta sẽ đi sâu vào ${activeLessonTitle}.`,
              time: "00:00",
            },
            {
              id: "ai-s2",
              title: `Phân cảnh 2: Demo mã nguồn ${activePreset.lang.toUpperCase()} & Phân tích`,
              text: `Lưu ý về ${activePreset.leadNote}`,
              script: "Hãy chú ý kiểm tra điều kiện biên trước khi nộp bài lên hệ thống CI/CD.",
              time: "05:15",
            },
            {
              id: "ai-s3",
              title: "Phân cảnh 3: Cạm bẫy thiết kế & Hướng dẫn làm Lab",
              text: "Phân tích Anti-Pattern và phương pháp khắc phục",
              script: "Hoàn thành Quiz cuối bài để mở khóa tiến độ chương.",
              time: "11:40",
            },
          ];

          const genQuizzes: QuizQuestion[] = [
            {
              id: `q-1`,
              question: `Trong chuyên đề "${activeLessonTitle}" (${activeClass.code}), giải pháp kiến trúc nào là chuẩn mực nhất?`,
              options: [
                activePreset.solution,
                activePreset.badDesc,
                "Gộp toàn bộ logic vào một khối duy nhất không kiểm soát",
                "Bỏ qua bước kiểm thử các trường hợp biên",
              ],
              answer: activePreset.solution,
              correctIndex: 0,
              explanation: `Theo chuẩn ${activeClass.code}: ${activePreset.solution}`,
            },
            {
              id: `q-2`,
              question: `Vì sao cần tránh sai lầm "${activePreset.badDesc.slice(0, 65)}..." khi triển khai ${activeLessonTitle}?`,
              options: [
                "Vì dễ gây lỗi vận hành, rò rỉ tài nguyên hoặc hỏng logic ở trường hợp biên",
                "Vì làm giảm kích thước tệp mã nguồn",
                "Vì trình biên dịch sẽ tự động bỏ qua mọi hàm kiểm tra",
                "Không ảnh hưởng đến độ ổn định của hệ thống",
              ],
              answer: "Vì dễ gây lỗi vận hành, rò rỉ tài nguyên hoặc hỏng logic ở trường hợp biên",
              correctIndex: 0,
              explanation: `Khắc phục bằng cách: ${activePreset.solution}`,
            },
          ];

          const nextContent: LessonContent = {
            reading: genReading,
            videoScenes: genScenes,
            quizzes: genQuizzes,
            youtubeUrl: preservedYtUrl,
            youtubeId: preservedYtId,
            objective: genObjective,
            lead: genLead,
            codeSnippet: genCodeSnippet,
            keyTakeaways: genKeyTakeaways,
            antiPattern: genAntiPattern,
          };

          const nextLesson: Lesson = {
            ...selectedLesson,
            title: activeLessonTitle,
            duration: activeDuration,
            xp: editXp,
            isGenerated: true,
            status: "Đã phát hành",
            documents: editDocuments,
            content: nextContent,
          };

          setEditReading(genReading);
          setEditObjective(genObjective);
          setEditLead(genLead);
          setEditCodeSnippet(genCodeSnippet);
          setEditKeyTakeaways(genKeyTakeaways);
          setEditAntiPattern(genAntiPattern);
          setEditScenes(genScenes);
          setEditQuizzes(genQuizzes);
          setEditYoutubeUrl(preservedYtUrl);
          setEditStatus("Đã phát hành");
          setAigcTriggeredInModal(true);
          setSelectedLesson(nextLesson);

          setClasses((prev) =>
            prev.map((c) =>
              c.id !== selectedClassId
                ? c
                : {
                    ...c,
                    chapters: c.chapters.map((ch) =>
                      ch.id !== activeLessonChapterId
                        ? ch
                        : {
                            ...ch,
                            lessons: ch.lessons.map((l) => (l.id === selectedLesson.id ? nextLesson : l)),
                          }
                    ),
                  }
            )
          );

          setIsAigcRunning(false);
          setDrawerTab("reading");

          void saveInstructorLesson(selectedClassId, activeLessonChapterId, selectedLesson.id, {
            title: activeLessonTitle,
            duration: activeDuration,
            xp: editXp,
            status: "Đã phát hành",
            isGenerated: true,
            isAigcGenerated: true,
            documents: editDocuments,
            content: nextContent as any,
          }).then((res) => {
            if (res) broadcastCoursesUpdated(selectedClassId);
          });

          notify(`AI đã biên soạn xong học liệu (${activeClass.code}) & giữ nguyên link Video.`);
          return 4;
        }
        return prev + 1;
      });
    }, 450);
  };

  const saveLessonEdits = async (targetStatus?: "Đã phát hành" | "Bản nháp") => {
    if (!selectedLesson || !activeLessonChapterId) return;

    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      notify("⚠️ Tên bài học không được để trống.");
      return;
    }

    const cleanYt = editYoutubeUrl.trim();
    if (cleanYt && !isValidYoutubeInput(cleanYt)) {
      notify("❌ Link/ID YouTube không hợp lệ. Vui lòng nhập URL YouTube chuẩn hoặc mã 11 ký tự.");
      setDrawerTab("video");
      return;
    }

    for (let i = 0; i < editQuizzes.length; i += 1) {
      const q = editQuizzes[i];
      if (!q.question.trim()) {
        notify(`⚠️ Câu hỏi #${i + 1} đang bị để trống nội dung.`);
        setDrawerTab("quiz");
        return;
      }
      const validOpts = (q.options || []).filter((o) => o.trim().length > 0);
      if (validOpts.length < 2) {
        notify(`⚠️ Câu hỏi #${i + 1} cần ít nhất 2 phương án trả lời hợp lệ.`);
        setDrawerTab("quiz");
        return;
      }
    }

    const finalStatus = targetStatus || editStatus || "Đã phát hành";
    const ytId = extractYoutubeId(cleanYt);
    const cleanDuration = editDuration.trim() || selectedLesson.duration || "15 phút";
    const cleanXp = Number.isFinite(editXp) ? Math.max(10, Math.min(1000, Math.round(editXp))) : 150;

    const normalizedQuizzes = editQuizzes.map((q) => {
      const cIdx =
        typeof q.correctIndex === "number" && q.options?.[q.correctIndex] !== undefined
          ? q.correctIndex
          : Math.max(0, (q.options || []).findIndex((o) => o === q.answer));
      return {
        ...q,
        correctIndex: cIdx,
        answer: q.options?.[cIdx] || q.answer,
      };
    });

    const nextContent: LessonContent = {
      reading: editReading || editLead,
      videoScenes: editScenes,
      quizzes: normalizedQuizzes,
      youtubeUrl: cleanYt || `https://www.youtube.com/watch?v=${ytId}`,
      youtubeId: ytId,
      objective: editObjective,
      lead: editLead,
      codeSnippet: editCodeSnippet,
      keyTakeaways: editKeyTakeaways,
      antiPattern: editAntiPattern,
    };

    const res = await saveInstructorLesson(selectedClassId, activeLessonChapterId, selectedLesson.id, {
      title: cleanTitle,
      duration: cleanDuration,
      xp: cleanXp,
      status: finalStatus,
      isGenerated: true,
      isAigcGenerated: aigcTriggeredInModal,
      documents: editDocuments,
      content: nextContent as any,
    });

    if (!res) {
      notify("❌ Lỗi lưu bài giảng lên máy chủ MySQL. Vui lòng thử lại.");
      return;
    }

    const parentChap = activeClass?.chapters.find((c) => c.id === activeLessonChapterId);
    const shouldAutoPublishChapter =
      finalStatus === "Đã phát hành" && parentChap?.status === "Bản nháp";
    if (shouldAutoPublishChapter) {
      await patchInstructorChapter(selectedClassId, activeLessonChapterId, {
        status: "Đã phát hành",
      });
    }

    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id !== activeLessonChapterId
                  ? ch
                  : {
                      ...ch,
                      ...(shouldAutoPublishChapter ? { status: "Đã phát hành" as const } : {}),
                      lessons: ch.lessons.map((l) =>
                        l.id === selectedLesson.id
                          ? {
                              ...l,
                              title: cleanTitle,
                              duration: cleanDuration,
                              xp: cleanXp,
                              status: finalStatus,
                              isGenerated: true,
                              documents: editDocuments,
                              content: nextContent,
                            }
                          : l
                      ),
                    }
              ),
            }
      )
    );

    broadcastCoursesUpdated(selectedClassId);
    setLessonModalOpen(false);
    notify(
      finalStatus === "Đã phát hành"
        ? "Đã lưu & PHÁT HÀNH bài học cho học viên thành công!"
        : "Đã lưu bản nháp bài học (ẩn khỏi học viên)."
    );
  };



  // --- TEST CASE CONFIGURATOR ACTIONS ---



  const activeTcAssignment = useMemo(() => {



    if (!tcChapterId || !tcAssignmentId) return null;



    const ch = (activeClass?.chapters || []).find((c) => c.id === tcChapterId);



    return ch?.assignments?.find((a) => a.id === tcAssignmentId) || null;



  }, [activeClass, tcChapterId, tcAssignmentId]);



  const openTestCaseModal = (chapterId: string, assignmentId: string) => {

    const ch = (activeClass?.chapters || []).find((c) => c.id === chapterId);

    const asg = ch?.assignments?.find((a) => a.id === assignmentId);

    setTcChapterId(chapterId);

    setTcAssignmentId(assignmentId);

    setEditAssignTitle(asg?.title || "");

    setEditAssignDesc(asg?.description || "");

    setEditAssignPoints(asg?.points ?? 100);

    setEditAssignDockerImage(asg?.dockerImage || activeClass?.dockerImage || "codemind/cpp20-sandbox:latest");

    setEditingTcId(null);

    setTcModalOpen(true);

  };

  const handleSaveAssignmentMeta = async () => {
    if (!tcChapterId || !tcAssignmentId) return;
    if (!editAssignTitle.trim()) {
      notify("⚠️ Tên bài tập không được để trống.");
      return;
    }
    const payload = {
      title: editAssignTitle.trim(),
      description: editAssignDesc.trim(),
      points: Number.isFinite(editAssignPoints) ? Math.max(10, Math.min(1000, Math.round(editAssignPoints))) : 100,
      dockerImage: editAssignDockerImage.trim() || "codemind/cpp20-sandbox:latest",
    };
    const res = await updateInstructorAssignment(selectedClassId, tcChapterId, tcAssignmentId, payload);
    if (!res) {
      notify("❌ Không thể lưu thông tin bài tập lên MySQL.");
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id !== tcChapterId
                  ? ch
                  : {
                      ...ch,
                      assignments: (ch.assignments || []).map((a) =>
                        a.id === tcAssignmentId ? { ...a, ...payload } : a
                      ),
                    }
              ),
            }
      )
    );
    broadcastCoursesUpdated(selectedClassId);
    notify("Đã cập nhật đề bài Lab Docker & đồng bộ cho học viên.");
  };

  const updateAssignmentTestCases = (updater: (cases: DockerTestCase[]) => DockerTestCase[]) => {

    if (!tcChapterId || !tcAssignmentId) return;

    setClasses((prev) =>

      prev.map((c) =>

        c.id !== selectedClassId

          ? c

          : {

              ...c,

              chapters: c.chapters.map((ch) =>

                ch.id !== tcChapterId

                  ? ch

                  : {

                      ...ch,

                      assignments: (ch?.assignments || []).map((a) =>

                        a.id === tcAssignmentId

                          ? { ...a, testCases: updater(a.testCases || []) }

                          : a

                      ),

                    }

              ),

            }

      )

    );

  };

  const handleAddDockerTestCase = async () => {

    if (!newTcTitle.trim() || !newTcOutput.trim() || !tcChapterId) {

      notify("Vui lòng nhập tên Test Case và Expected Output.");

      return;

    }

    const draft: DockerTestCase = {

      id: `tc-${Date.now()}`,

      title: newTcTitle.trim(),

      input: newTcInput.trim() || "(default input)",

      expectedOutput: newTcOutput.trim(),

      isEdgeCase: newTcEdgeCase,

      timeoutMs: 1500,

      memoryLimitMb: 64,

    };

    const res = await addInstructorTestCase(selectedClassId, tcChapterId, draft);

    if (!res?.testCase) {
      notify("❌ Không thể thêm Test Case trên máy chủ.");
      return;
    }

    const savedTc: DockerTestCase = res.testCase;

    updateAssignmentTestCases((cases) => [...cases, savedTc]);

    setNewTcTitle("");

    setNewTcInput("");

    setNewTcOutput("");

    setNewTcEdgeCase(false);

    broadcastCoursesUpdated(selectedClassId);

    notify("Đã thêm Unit Test Case vào Docker Sandbox.");

  };

  const handleToggleTestCaseEdge = async (tc: DockerTestCase) => {
    if (!tcChapterId) return;
    const nextEdge = !tc.isEdgeCase;
    const res = await updateInstructorTestCase(selectedClassId, tcChapterId, tc.id, { isEdgeCase: nextEdge });
    if (!res) {
      notify("❌ Không thể cập nhật trạng thái Edge Case.");
      return;
    }
    updateAssignmentTestCases((cases) =>
      cases.map((item) => (item.id === tc.id ? { ...item, isEdgeCase: nextEdge } : item))
    );
    broadcastCoursesUpdated(selectedClassId);
  };

  const startEditTestCase = (tc: DockerTestCase) => {
    setEditingTcId(tc.id);
    setEditTcTitle(tc.title);
    setEditTcInput(tc.input);
    setEditTcOutput(tc.expectedOutput);
    setEditTcEdgeCase(tc.isEdgeCase);
  };

  const handleSaveEditedTestCase = async () => {
    if (!tcChapterId || !editingTcId) return;
    if (!editTcTitle.trim() || !editTcOutput.trim()) {
      notify("⚠️ Tên Test Case và Expected Output không được để trống.");
      return;
    }
    const payload = {
      title: editTcTitle.trim(),
      input: editTcInput.trim() || "(default input)",
      expectedOutput: editTcOutput.trim(),
      isEdgeCase: editTcEdgeCase,
    };
    const res = await updateInstructorTestCase(selectedClassId, tcChapterId, editingTcId, payload);
    if (!res) {
      notify("❌ Không thể cập nhật Test Case trên máy chủ.");
      return;
    }
    updateAssignmentTestCases((cases) =>
      cases.map((item) => (item.id === editingTcId ? { ...item, ...payload } : item))
    );
    setEditingTcId(null);
    broadcastCoursesUpdated(selectedClassId);
    notify("Đã cập nhật Test Case & đồng bộ.");
  };



  // --- MASTER MINDMAP ACTIONS ---

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) {
        notify("⚠️ Không thể tự nối nút vào chính nó.");
        return;
      }

      setEdges((eds) => {
        if (eds.some((e) => e.source === params.source && e.target === params.target)) {
          notify("Liên kết này đã tồn tại trên sơ đồ.");
          return eds;
        }
        // Check DAG cycle: can target reach source already?
        const adj = new Map<string, string[]>();
        eds.forEach((e) => {
          adj.set(e.source, [...(adj.get(e.source) || []), e.target]);
        });
        const stack = [params.target!];
        const visited = new Set<string>();
        while (stack.length > 0) {
          const cur = stack.pop()!;
          if (cur === params.source) {
            notify("⚠️ Không thể tạo vòng lặp (cycle) trong cây Master Mindmap.");
            return eds;
          }
          if (visited.has(cur)) continue;
          visited.add(cur);
          (adj.get(cur) || []).forEach((nxt) => stack.push(nxt));
        }

        setIsMindmapDirty(true);
        notify("Đã nối nhánh mới trên Master Graph.");
        return addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
          },
          eds
        );
      });
    },
    [setEdges]
  );

  const handleAddMindmapNode = (nodeType: "branch" | "leaf") => {
    const id = `mm-${Date.now()}`;
    const parentNode =
      nodes.find((n) => n.id === selectedNodeId) ||
      nodes.find((n) => n.data.nodeType === "root") ||
      nodes[0];

    const nextNode: Node<MasterMindmapNodeData> = {
      id,
      type: "masterMindmapNode",
      position: { x: nodeType === "branch" ? 350 : 660, y: 120 + (nodes.length % 5) * 90 },
      data: {
        title: nodeType === "branch" ? "Chủ đề nhánh mới" : "Khái niệm chi tiết mới",
        summary: "Chỉnh sửa mô tả và liên kết kiến thức ở bảng bên phải.",
        tag: nodeType === "branch" ? "Branch" : "Concept",
        nodeType,
        masteryPct: 70,
      },
    };

    setNodes((nds) => [...nds, nextNode]);
    if (parentNode && parentNode.id !== id) {
      const autoEdge: Edge = {
        id: `edge-${parentNode.id}-${id}`,
        source: parentNode.id,
        target: id,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
      };
      setEdges((eds) => [...eds, autoEdge]);
    }
    setSelectedNodeId(id);
    setIsMindmapDirty(true);
    notify(
      parentNode
        ? `Đã thêm nút mới & nối tự động từ "${parentNode.data.title}".`
        : "Đã thêm nút mới vào Master Mindmap."
    );
  };

  const handleUpdateSelectedNode = (
    field: keyof MasterMindmapNodeData,
    val: string | number
  ) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: val } } : n
      )
    );
    setIsMindmapDirty(true);
  };

  const handleSwitchMindmapChapter = (nextChapterId: string) => {
    if (nextChapterId === selectedMindmapChapterId) return;
    if (isMindmapDirty && !window.confirm("Bạn có thay đổi Master Graph chưa lưu. Chuyển chương sẽ bỏ qua thay đổi chưa lưu?")) {
      return;
    }
    setSelectedMindmapChapterId(nextChapterId);
    setIsMindmapDirty(false);
  };

  const handleSaveMasterGraph = async () => {
    const res = await saveInstructorMindmap(selectedClassId, selectedMindmapChapterId, nodes, edges);
    if (!res) {
      notify("❌ Không thể lưu Master Graph lên máy chủ MySQL.");
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id !== selectedClassId
          ? c
          : {
              ...c,
              chapters: c.chapters.map((ch) =>
                ch.id === selectedMindmapChapterId
                  ? { ...ch, mindmapNodes: nodes, mindmapEdges: edges, mindmapGenerated: true }
                  : ch
              ),
            }
      )
    );
    setIsMindmapDirty(false);
    broadcastCoursesUpdated(selectedClassId);
    notify("Đã lưu Sơ đồ Master Graph & đồng bộ sang tab Mindmap học viên.");
  };

  const handleGenerateMindmapAI = () => {
    setIsMindmapGenerating(true);
    setMindmapStep(1);
    const timer = setInterval(() => {
      setMindmapStep((prev) => {
        if (prev >= 3) {
          clearInterval(timer);
          const ch = (activeClass?.chapters || []).find((c) => c.id === selectedMindmapChapterId);
          const lessons = ch?.lessons || [];
          const labAsg = ch?.assignments?.[0];
          const baseMastery = Math.max(0, Math.min(100, Number(activeClass?.avgProgressPct || 0)));
          const rootId = `ai-root-${Date.now()}`;
          const centerY = Math.max(140, Math.round(((Math.max(1, lessons.length) - 1) * 150) / 2 + 45));

          const genNodes: Node<MasterMindmapNodeData>[] = [
            {
              id: rootId,
              type: "masterMindmapNode",
              position: { x: 40, y: centerY },
              data: {
                title: ch?.title || "Chủ đề chương",
                summary:
                  lessons.length > 0
                    ? `Tổng hợp ${lessons.length} bài giảng chuẩn hóa & thực hành kiểm thử Docker Sandbox.`
                    : "Master Graph tổng hợp tự động từ giáo trình",
                tag: `${activeClass.code} · ROOT`,
                nodeType: "root",
                masteryPct: baseMastery,
                xp: 200,
              },
            },
          ];
          const genEdges: Edge[] = [];

          lessons.forEach((l, idx) => {
            const branchId = `ai-b-${idx}`;
            const leafId = `ai-l-${idx}`;
            const rowY = 40 + idx * 155;
            const cleanReading = (l.content?.reading || "")
              .replace(/[#*`>-]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            genNodes.push({
              id: branchId,
              type: "masterMindmapNode",
              position: { x: 365, y: rowY },
              data: {
                title: l.title,
                summary: cleanReading
                  ? cleanReading.slice(0, 96) + (cleanReading.length > 96 ? "..." : "")
                  : "Trọng tâm bài giảng & kiểm thử thực hành",
                tag: `Bài ${idx + 1}`,
                lessonId: l.id,
                nodeType: "branch",
                masteryPct: baseMastery,
                xp: l.xp || 50,
              } as MasterMindmapNodeData,
            });
            genEdges.push({
              id: `ai-e-r-${idx}`,
              source: rootId,
              target: branchId,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
              style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
            });

            const rawQuizList = (l.content as { quizzes?: Array<{ question?: string; q?: string }>; quiz?: Array<{ question?: string; q?: string }> } | undefined);
            const quizArr = rawQuizList?.quizzes || rawQuizList?.quiz;
            const firstQuizQ = quizArr?.[0]?.question || quizArr?.[0]?.q || "";
            genNodes.push({
              id: leafId,
              type: "masterMindmapNode",
              position: { x: 695, y: rowY },
              data: {
                title:
                  idx === lessons.length - 1 && labAsg
                    ? labAsg.title
                    : `Trọng tâm thực hành Bài ${idx + 1}`,
                summary:
                  idx === lessons.length - 1 && labAsg
                    ? labAsg.description || "Kiểm thử tự động trong container Docker cô lập."
                    : firstQuizQ
                    ? firstQuizQ.slice(0, 96) + (firstQuizQ.length > 96 ? "..." : "")
                    : " Vận dụng giải quyết tình huống kỹ thuật & kiểm tra biên (Edge Cases).",
                tag: idx === lessons.length - 1 && labAsg ? "Docker Lab" : `Chi tiết ${idx + 1}.1`,
                nodeType: "leaf",
                masteryPct: baseMastery,
              },
            });
            genEdges.push({
              id: `ai-e-l-${idx}`,
              source: branchId,
              target: leafId,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
              style: { strokeWidth: 1.5, stroke: "#94a3b8", strokeDasharray: "5 4" },
            });
          });

          setNodes(genNodes);
          setEdges(genEdges);
          setIsMindmapDirty(true);
          setIsMindmapGenerating(false);
          notify("AI đã dựng xong Master Mindmap 3 tầng. Nhấn 'Lưu Master Graph' để phát hành.");
          return 3;
        }
        return prev + 1;
      });
    }, 450);
  };



  // --- CO-PILOT HANDLER ---



  const triggerCopilotPrompt = async (promptText: string) => {



    const clean = promptText.trim();



    if (!clean) return;



    setIsCopilotOpen(true);



    setCopilotMessages((prev) => [



      ...prev,



      { sender: "user", text: clean, time: "Vừa xong" },



    ]);



    setCopilotInput("");



    setCopilotTyping(true);



    const apiReply = await askInstructorCopilot(clean, selectedClassId);



    if (apiReply) {



      setCopilotMessages((prev) => [



        ...prev,



        { sender: "ai", text: apiReply, time: "AI Co-Pilot · API" },



      ]);



      setCopilotTyping(false);



      return;



    }



    setTimeout(() => {
      let reply =
        `### Đề xuất hành động cho lớp ${activeClass.code}\n` +
        "- Mở rộng bộ **Docker Edge-case Test** cho chương hiện tại (chuỗi rỗng, `nullptr`, giới hạn bộ nhớ).\n" +
        "- Bổ sung câu hỏi phản biện bắt buộc trong **Rubric Hội đồng AI 3D** để lọc các bài nộp nghi sao chép code.\n" +
        "> Mở tab *Giáo trình & Test Cases* để gắn trực tiếp vào bài Lab tiếp theo.";

      if (clean.toLowerCase().includes("quiz") || clean.toLowerCase().includes("nhánh yếu")) {
        reply =
          "### Đề xuất 2 câu Quiz bổ trợ nhánh yếu (< 60%)\n" +
          "1. Khi `delete Base*` trỏ tới `Derived` trong C++, điều kiện nào đảm bảo destructor lớp con được gọi?\n" +
          "   → Đáp án: `~Base()` phải được khai báo `virtual`.\n" +
          "2. Vì sao truyền `Base obj` theo giá trị gây mất tính đa hình?\n" +
          "   → Đáp án: Trình biên dịch sao chép phần `Base` và đặt `vptr` trỏ về `vtable` của `Base` (**Object Slicing**).\n" +
          "> Bạn có thể chèn trực tiếp 2 câu này vào mini-quiz trước buổi thực hành.";
      } else if (clean.toLowerCase().includes("lab") || clean.toLowerCase().includes("test case")) {
        reply =
          `### Bộ Test Case Docker gợi ý · ${activeClass.code}\n` +
          "- **TC Biên 1**: Con trỏ `nullptr` hoặc input rỗng không gây crash (`Exit 0`).\n" +
          "- **TC Biên 2**: Chạy `Valgrind` kiểm tra rò rỉ bộ nhớ = `0 bytes leaked`.\n" +
          "- **Câu hỏi AI Defense**: *\"Giải thích sự khác biệt giữa liên kết tĩnh và dynamic dispatch tại dòng gọi hàm ảo.\"*\n" +
          "> Khuyên dùng kèm ngưỡng thời gian chạy `< 500ms` cho tập test tải cao.";
      }

      setCopilotMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, time: "AI Co-Pilot" },
      ]);

      setCopilotTyping(false);
    }, 550);



  };



  // Real struggling students from MySQL analytics (Overview support widget)

  const atRiskStudents = useMemo(() => {
    const flagged = studentsAnalytics.filter((s) => s.risk_status === "at_risk");
    if (flagged.length > 0) return flagged.slice(0, 4);
    return [...studentsAnalytics]
      .sort((a, b) => a.avg_quiz - b.avg_quiz || a.progress_pct - b.progress_pct)
      .slice(0, 3);
  }, [studentsAnalytics]);

  if (!activeClass) {
    return (
      <div
        ref={panelRef}
        className="min-h-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-7 pb-20 flex items-center justify-center"
      >
        <div className="marlo-card w-full max-w-lg rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-6 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="mx-auto w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200">
            <GraduationCap size={20} />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
            {workspaceLoading
              ? "Đang tải lớp học phần được phân công..."
              : "Chưa có lớp học phần được phân công"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {workspaceLoading
              ? "Đang đồng bộ danh sách lớp học phần và dữ liệu ghi danh từ máy chủ."
              : "Tài khoản giảng viên của bạn hiện chưa được Quản trị viên gán phụ trách lớp học phần nào."}
          </p>
          {!workspaceLoading && (
            <button
              type="button"
              onClick={() => void loadInstructorWorkspace()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer transition"
            >
              Kiểm tra lại phân công
            </button>
          )}
        </div>
      </div>
    );
  }

  return (



    <div



      ref={panelRef}



      className="min-h-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-7 pb-20 relative flex flex-col select-none"



    >



      {/* Marlo Floating Toast */}



      {toastMsg && <MarloToast message={toastMsg} showUndo={false} />}



      {/* ─── CARD 1: UNIFIED INSTRUCTOR SHELL HEADER ────────────────────────── */}
      <header className="marlo-card mb-4 sm:mb-5 relative z-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Row 1: Title & Academic Metadata Pills */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                CodeMind Teaching OS
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                {activeClass.sectionCode || activeClass.code} · {classes.length} lớp học phần
              </span>
            </div>

            <MarloTitle
              text="Không gian Giảng viên & Thẩm định Socratic"
              className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-snug"
            />

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Đồng bộ 1-1 với học viên: Quản lý giáo trình, Docker CI/CD Test Cases, Master Mindmap và Hội đồng Phản biện AI 3D.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              <GraduationCap size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{activeClass.semester}</span>
            </span>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Trọng số: CI/CD {rubric.cicdWeightPct}% · Phản biện AI {rubric.defenseWeightPct}%</span>
            </div>
          </div>
        </div>

        {/* Row 2: Course Switcher & Quick Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 basis-full lg:basis-[340px]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Lớp học phần:
            </span>
            <MarloSelect
              aria-label="Chọn lớp học phần"
              value={selectedClassId}
              onChange={(e) => handleClassSelect(e.target.value)}
              className="min-w-0 flex-1 sm:flex-initial sm:w-[320px] max-w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sectionCode || c.code} — {c.name} ({c.studentCount} HV)
                </option>
              ))}
            </MarloSelect>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate?.("defense-room")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <ShieldCheck size={14} className="text-[#EE8420]" />
              <span>Phòng Phản biện 3D</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCopilotOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] dark:hover:bg-white px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              <WandSparkles size={14} />
              <span>AI Teaching Co-Pilot</span>
            </button>
          </div>
        </div>
      </header>



      {/* ─── TAB CONTENT BODY ───────────────────────────────────────────────── */}



      <div ref={contentRef} key={tab} data-content-stage="1" className="relative z-10 space-y-5">



        {/* ====================================================================



            TAB 1: INSTRUCTOR OVERVIEW (MIRRORS StudentDashboard)



           ==================================================================== */}



        {tab === "overview" && (



          <div className="animate-screen-enter space-y-5">



            {/* Scope Toggle Bar */}



            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">



              <div className="flex items-center gap-2.5 text-xs">



                <span className="font-bold text-slate-900 dark:text-white">



                  {overviewScope === "class" ? `${activeClass.code} · ${activeClass.name}` : `Tổng hợp ${classes.length} Học phần CNTT`}



                </span>



                <span className="text-slate-400">•</span>



                <span className="font-mono text-slate-500 dark:text-slate-400">



                  {overviewStats.studentCount} học viên



                </span>



              </div>



              <MarloSegmentedControl<"class" | "all">



                size="sm"



                value={overviewScope}



                onChange={setOverviewScope}



                options={[



                  { id: "class", label: "Lớp đang chọn" },



                  { id: "all", label: `Toàn bộ ${classes.length} lớp` },



                ]}



              />



            </div>



            {/* Top Grid: MarloActivityRing + Where the class stands */}



            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">



              <div className="xl:col-span-5">



                <MarloActivityRing
                  title="Phân bổ Năng lực & Nghiệm thu Thực tế"
                  subtitle={
                    studentsAnalytics.length > 0
                      ? `Dữ liệu MySQL thật trên ${studentsAnalytics.length} học viên`
                      : overviewScope === "class"
                      ? `Tổng hợp lớp ${activeClass.code} tuần hiện tại`
                      : `Tổng hợp trung bình ${classes.length} lớp học phần`
                  }
                  actionText="Mở Chấm điểm"
                  onAction={() => handleTabSwitch("grading")}
                  centerValue={overviewStats.avgCompletion}
                  centerLabel="hoàn thành"
                  segments={
                    studentsAnalytics.length > 0
                      ? (() => {
                          const totalSt = Math.max(1, studentsAnalytics.length);
                          return [
                            {
                              id: "risk",
                              label: "Cần hỗ trợ",
                              value: Math.round((overviewStats.atRiskCount / totalSt) * 100),
                              count: overviewStats.atRiskCount,
                              color: "#cbd5e1",
                            },
                            {
                              id: "track",
                              label: "Đúng tiến độ",
                              value: Math.round((overviewStats.onTrackCount / totalSt) * 100),
                              count: overviewStats.onTrackCount,
                              color: "#f97316",
                            },
                            {
                              id: "top",
                              label: "Xuất sắc",
                              value: Math.round((overviewStats.topPerformersCount / totalSt) * 100),
                              count: overviewStats.topPerformersCount,
                              color: "#1e293b",
                            },
                          ];
                        })()
                      : [
                          {
                            id: "flagged",
                            label: "Cần kiểm tra",
                            value: Math.round(
                              (overviewStats.flaggedCount / Math.max(1, overviewStats.totalSubs)) * 100
                            ),
                            count: overviewStats.flaggedCount,
                            color: "#cbd5e1",
                          },
                          {
                            id: "review",
                            label: "Chờ duyệt kép",
                            value: Math.round(
                              (overviewStats.pendingCount / Math.max(1, overviewStats.totalSubs)) * 100
                            ),
                            count: overviewStats.pendingCount,
                            color: "#f97316",
                          },
                          {
                            id: "done",
                            label: "Đã đạt chuẩn",
                            value: Math.round(
                              (overviewStats.gradedCount / Math.max(1, overviewStats.totalSubs)) * 100
                            ),
                            count: overviewStats.gradedCount,
                            color: "#1e293b",
                          },
                        ]
                  }
                  className="marlo-card h-full rounded-[24px] dark:bg-[#14161F]"
                />



              </div>



              {/* Where the class stands Hero Card */}



              <div className="xl:col-span-7 marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">



                <div className="flex flex-wrap items-center justify-between gap-3">



                  <div>



                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">



                      Tiến độ Học thuật & Chấm duyệt



                    </h3>



                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">



                      Nhấp từng dòng để mở trực tiếp bảng chấm Docker CI/CD, Phòng Phản biện 3D hoặc Kanban.



                    </p>



                  </div>



                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">



                    <span className="inline-flex items-center gap-1.5">



                      <span className="w-2.5 h-2.5 rounded-[3px] bg-[#14161a] dark:bg-white" />



                      Đã xong



                    </span>



                    <span className="inline-flex items-center gap-1.5">



                      <span className="w-2.5 h-2.5 rounded-[3px] bg-[#EE8420]" />



                      Đang xử lý



                    </span>



                    <span className="inline-flex items-center gap-1.5">



                      <span className="w-2.5 h-2.5 rounded-[3px] bg-slate-200 dark:bg-slate-700" />



                      Cảnh báo / Chờ



                    </span>



                  </div>



                </div>



                {/* 3 Clickable Metric Rows */}



                <div className="space-y-2.5">



                  {[



                    {



                      id: "row-cicd",



                      icon: <Terminal size={15} className="text-slate-500" />,



                      label: "Bài nộp CI/CD Sandbox",



                      total: overviewStats.totalSubs,



                      done: overviewStats.gradedCount,



                      moving: overviewStats.pendingCount,



                      waiting: overviewStats.flaggedCount,



                      onClick: () => handleTabSwitch("grading"),



                    },



                    {



                      id: "row-defense",



                      icon: <ShieldCheck size={15} className="text-slate-500" />,



                      label: "Phiên Phản biện AI 3D",



                      total: submissions.length,



                      done: submissions.filter((s) => s.defenseStatus === "completed").length,



                      moving: submissions.filter((s) => s.defenseStatus === "pending").length,



                      waiting: submissions.filter((s) => s.defenseStatus === "flagged").length,



                      onClick: () => onNavigate?.("defense-room"),



                    },



                    {



                      id: "row-scrum",



                      icon: <FolderKanban size={15} className="text-slate-500" />,



                      label: "Sprint Đồ án Nhóm",



                      total: workspaceProjects.length,



                      done: overviewStats.projectsDone,



                      moving: overviewStats.projectsActive,



                      waiting: overviewStats.projectsPlan,



                      onClick: () => onNavigate?.("kanban"),



                    },



                  ].map((row) => {



                    const tot = Math.max(1, row.total);



                    return (



                      <button



                        key={row.id}



                        type="button"



                        onClick={row.onClick}



                        className="marlo-row w-full flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 px-4 py-3 text-left transition cursor-pointer group"



                      >



                        <div className="flex items-center gap-2.5 min-w-[180px]">



                          {row.icon}



                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white">



                            {row.label}



                          </span>



                        </div>



                        <div className="flex-1 h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex">



                          <div



                            className="h-full bg-[#14161a] dark:bg-white"



                            style={{ width: `${(row.done / tot) * 100}%` }}



                          />



                          <div



                            className="h-full bg-[#EE8420]"



                            style={{ width: `${(row.moving / tot) * 100}%` }}



                          />



                        </div>



                        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">



                          <span className="font-bold text-slate-900 dark:text-white">



                            {row.done}/{row.total}



                          </span>



                          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />



                        </div>



                      </button>



                    );



                  })}



                </div>



                {/* Mastery Capacity Bar */}
                <MarloCapacityBar
                  title={
                    studentsAnalytics.length > 0
                      ? "Phân bổ Trạng thái Học tập (MySQL)"
                      : "Phân bổ Thẩm định Bài nộp CI/CD"
                  }
                  subtitle={
                    studentsAnalytics.length > 0
                      ? "Thống kê thực tế từ MySQL: Học viên Xuất sắc, Đúng tiến độ & Cần hỗ trợ"
                      : "Thống kê thực tế: Bài đã chấm, chờ duyệt & cảnh báo lệch điểm"
                  }
                  totalLabel={studentsAnalytics.length > 0 ? "học viên" : "bài nộp"}
                  className="bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/70"
                  items={
                    studentsAnalytics.length > 0
                      ? [
                          { id: "top", label: "Xuất sắc", count: overviewStats.topPerformersCount, color: "#14161a" },
                          { id: "track", label: "Đúng tiến độ", count: overviewStats.onTrackCount, color: "#64748b" },
                          { id: "risk", label: "Cần hỗ trợ", count: overviewStats.atRiskCount, color: "#EE8420" },
                        ]
                      : [
                          { id: "graded", label: "Đã phê duyệt chuẩn", count: overviewStats.gradedCount, color: "#14161a" },
                          { id: "pending", label: "Đang chờ duyệt", count: overviewStats.pendingCount, color: "#64748b" },
                          { id: "flagged", label: "Cần hỗ trợ / Lệch điểm", count: overviewStats.flaggedCount, color: "#EE8420" },
                        ]
                  }
                />



              </div>



            </div>



            {/* Bottom Grid: Struggling Students + Scrum Project Health */}



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">



              {/* Struggling Students Card */}



              <div className="marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">



                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">



                  <div>



                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">



                      <AlertTriangle size={15} className="text-[#EE8420]" />



                      Học viên cần hỗ trợ & Can thiệp sớm



                    </h3>



                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">



                      Phát hiện tự động từ điểm CI/CD thực tế, bài chưa đạt và tiến độ hoàn thành trong MySQL.



                    </p>



                  </div>



                  <button



                    type="button"



                    onClick={() => handleTabSwitch("students")}



                    className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"



                  >



                    <span>Xem Học viên</span>



                    <ArrowUpRight size={13} />



                  </button>



                </div>



                <div className="space-y-2.5">



                  {atRiskStudents.length === 0 ? (



                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center text-xs text-slate-500 dark:text-slate-400">



                      {workspaceLoading
                        ? "Đang tải thống kê học viên từ MySQL..."
                        : "Chưa có học viên nào ở mức cảnh báo rủi ro."}



                    </div>



                  ) : (



                    atRiskStudents.map((st) => {
                      const targetTab: InstructorTab = st.risk_status === "at_risk" ? "grading" : "students";
                      const reasonText =
                        st.risk_status === "at_risk"
                          ? `Điểm TB ${st.avg_quiz.toFixed(1)} · Hoàn thành ${st.progress_pct}% (${st.lessons_done} bài học · ${st.total_submissions} bài nộp)`
                          : `Hoàn thành ${st.progress_pct}% · ${st.exp_points.toLocaleString("vi-VN")} XP · Chuỗi ${st.current_streak} ngày`;
                      return (
                        <div
                          key={st.student_id}
                          className="marlo-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {st.display_name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {st.student_code}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                st.risk_status === "at_risk"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}>
                                {st.risk_label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                              {reasonText}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTabSwitch(targetTab)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              type="button"
                              disabled={sentReminders[st.student_id]}
                              onClick={async () => {
                                try {
                                  await remindStudentApi(st.student_id, {
                                    message: `Giảng viên nhắc nhở ôn tập chuyên đề ${activeClass.code} để cải thiện điểm thực hành.`,
                                    action_type: "remind",
                                  });
                                  setSentReminders((prev) => ({ ...prev, [st.student_id]: true }));
                                  notify(`Đã gửi nhắc nhở Socratic tới học viên ${st.display_name}.`);
                                } catch (err: any) {
                                  notify(`❌ ${err?.message || "Không thể gửi nhắc nhở."}`);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                                sentReminders[st.student_id]
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                                  : "bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619]"
                              }`}
                            >
                              {sentReminders[st.student_id] ? "Đã nhắc" : "Nhắc nhở Socratic"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}



                </div>



              </div>



              {/* Scrum Project Health Card */}



              <div className="marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">



                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">



                  <div>



                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">



                      <FolderKanban size={15} className="text-slate-500" />



                      Tiến độ Đồ án Nhóm (Scrum Health)



                    </h3>



                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">



                      Đồng bộ trực tiếp với bảng Projects & Kanban của sinh viên.



                    </p>



                  </div>



                  <button



                    type="button"



                    onClick={() => onNavigate?.("kanban")}



                    className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline inline-flex items-center gap-1 cursor-pointer"



                  >



                    <span>Mở Kanban</span>



                    <ArrowRight size={13} />



                  </button>



                </div>



                <div className="space-y-2.5">



                  {workspaceProjects.slice(0, 4).map((prj) => {



                    const pct = Math.round(prj.progress * 100);



                    return (



                      <div



                        key={prj.id}



                        className="marlo-row rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-2"



                      >



                        <div className="flex items-center justify-between gap-2">



                          <div className="min-w-0">



                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">



                              {prj.name}



                            </div>



                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">



                              {prj.course} · Hạn {prj.dueText}



                            </div>



                          </div>



                          <span className="shrink-0 font-mono text-xs font-bold text-slate-900 dark:text-white">



                            {prj.tasksDone}/{prj.tasksTotal} tasks ({pct}%)



                          </span>



                        </div>



                        <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">



                          <div



                            className={`h-full rounded-full ${



                              prj.status === "delivered"



                                ? "bg-[#14161a] dark:bg-white"



                                : "bg-[#EE8420]"



                            }`}



                            style={{ width: `${pct}%` }}



                          />



                        </div>



                      </div>



                    );



                  })}



                </div>



              </div>



            </div>



          </div>



        )}



        {/* ====================================================================



            TAB 2: SYLLABUS, AIGC STUDIO, DOCKER TEST CASES & STUDENT PREVIEW



           ==================================================================== */}



        {tab === "syllabus" && (



          <div className="animate-screen-enter space-y-4">



            {(activeClass?.chapters || []).map((chapter) => (



              <div



                key={chapter.id}



                className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden"



              >



                {/* Chapter Header */}



                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">



                  <div className="min-w-0 flex-1">



                    <div className="flex flex-wrap items-center gap-2">



                      {renamingChapterId === chapter.id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="text"
                            value={renameChapterInput}
                            onChange={(e) => setRenameChapterInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleRenameChapter(chapter.id);
                              } else if (e.key === "Escape") {
                                setRenamingChapterId(null);
                              }
                            }}
                            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm font-bold text-slate-900 dark:text-white outline-none min-w-[240px]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void handleRenameChapter(chapter.id)}
                            className="rounded-lg bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-2.5 py-1 text-xs font-bold cursor-pointer"
                          >
                            Lưu tên
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingChapterId(null)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-500 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {chapter.title}
                          </h2>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingChapterId(chapter.id);
                              setRenameChapterInput(chapter.title);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Đổi tên chương"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteChapter(chapter.id, chapter.title)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Xóa chương học"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}



                      <button



                        type="button"



                        onClick={() => toggleChapterStatus(chapter.id)}



                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition cursor-pointer ${



                          chapter.status === "Đã phát hành"



                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950"



                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"



                        }`}



                      >



                        {chapter.status}



                      </button>



                      {chapter.mindmapGenerated && (



                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">



                          <Network size={11} />



                          Master Mindmap sẵn sàng



                        </span>



                      )}



                    </div>



                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">



                      {(chapter.lessons?.length || 0)} bài học · {(chapter.assignments?.length || 0)} bài tập thực hành Docker



                    </p>



                  </div>



                  <div className="flex flex-wrap items-center gap-2">



                    <button



                      type="button"



                      onClick={() => {



                        setSelectedMindmapChapterId(chapter.id);



                        handleTabSwitch("mindmap");



                      }}



                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"



                    >



                      <Network size={14} />



                      <span>Mở Master Map</span>



                    </button>



                    <button



                      type="button"



                      onClick={() => setAddingLessonChapterId(chapter.id)}



                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-3 py-1.5 text-xs font-bold transition cursor-pointer"



                    >



                      <Plus size={14} />



                      <span>Thêm bài học</span>



                    </button>



                  </div>



                </div>



                {/* Add Lesson Inline Form */}



                {addingLessonChapterId === chapter.id && (



                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center gap-2">



                    <input



                      type="text"



                      value={newLessonTitle}



                      onChange={(e) => setNewLessonTitle(e.target.value)}



                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddLesson(chapter.id);
                        } else if (e.key === "Escape") {
                          setAddingLessonChapterId(null);
                        }
                      }}



                      placeholder="Nhập tiêu đề bài học mới (VD: 1.4 Interface & Multiple Inheritance)..."



                      className="flex-1 min-w-[220px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-slate-400"



                    />



                    <button



                      type="button"



                      onClick={() => handleAddLesson(chapter.id)}



                      className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-3.5 py-2 text-xs font-bold cursor-pointer"



                    >



                      Lưu bài học



                    </button>



                    <button



                      type="button"



                      onClick={() => setAddingLessonChapterId(null)}



                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"



                    >



                      Hủy



                    </button>



                  </div>



                )}



                <div className="p-4 sm:p-5 space-y-4">



                  {/* Lessons List */}



                  <div className="space-y-2">



                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">



                      Chuỗi bài giảng & Học liệu (AIGC Studio)



                    </div>



                    {(chapter.lessons?.length || 0) === 0 ? (



                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">



                        Chưa có bài học nào trong chương này.



                      </div>



                    ) : (



                      (chapter.lessons || []).map((lesson, lessonIdx) => (



                        <div



                          key={lesson.id}



                          className="marlo-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-700 transition"



                        >



                          <div className="min-w-0 space-y-1">



                            <div className="flex flex-wrap items-center gap-2">



                              <span className="text-xs font-bold text-slate-900 dark:text-white">



                                {lesson.title}



                              </span>



                              <span className="text-[10px] font-mono text-slate-400">



                                {lesson.duration}



                              </span>



                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                +{getEffectiveLessonXp(activeClass?.subjectId, lesson)} XP
                              </span>



                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    lesson.status === "Bản nháp" ? "bg-slate-400" : "bg-emerald-500"
                                  }`}
                                />
                                <span>{lesson.status || "Đã phát hành"}</span>
                              </span>



                              <span



                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${



                                  lesson.isGenerated



                                    ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"



                                    : "bg-slate-100 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200"



                                }`}



                              >



                                {lesson.isGenerated ? "Đủ Bài đọc · Video · Quiz" : "Chưa sinh học liệu"}



                              </span>



                            </div>



                            {lesson.documents[0] && (



                              <div className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">



                                <FileText size={12} />



                                <span>{lesson.documents[0].name}</span>



                                <span>({lesson.documents[0].size})</span>



                              </div>



                            )}



                          </div>



                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">



                            <button
                              type="button"
                              disabled={lessonIdx === 0}
                              onClick={() => void handleReorderLesson(chapter.id, lesson.id, -1)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                              title="Di chuyển lên"
                            >
                              <ArrowUp size={12} />
                            </button>

                            <button
                              type="button"
                              disabled={lessonIdx === (chapter.lessons?.length || 1) - 1}
                              onClick={() => void handleReorderLesson(chapter.id, lesson.id, 1)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDeleteLesson(chapter.id, lesson.id, lesson.title)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Xóa bài giảng"
                            >
                              <Trash2 size={12} />
                            </button>

                            <button



                              type="button"



                              onClick={() => openLessonStudio(chapter.id, lesson)}



                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs"



                            >



                              <Edit3 size={13} />



                              <span>Soạn AIGC</span>



                            </button>



                          </div>



                        </div>



                      ))



                    )}



                  </div>



                  {/* Practical Assignments & Docker CI/CD Test Case Builder */}



                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">



                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">



                      Bài tập Thực hành & Bộ Kiểm thử Tự động (Docker CI/CD)



                    </div>



                    {(chapter.assignments || []).map((assign) => (



                      <div



                        key={assign.id}



                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5"



                      >



                        <div className="min-w-0 space-y-1">



                          <div className="flex flex-wrap items-center gap-2">



                            <Code2 size={14} className="text-[#EE8420] shrink-0" />



                            <span className="text-xs font-bold text-slate-900 dark:text-white">



                              {assign.title}



                            </span>



                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">



                              +{assign.points} XP



                            </span>



                          </div>



                          <p className="text-[11px] text-slate-500 dark:text-slate-400">



                            {assign.description}



                          </p>



                          {assign.dockerImage && (



                            <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">



                              Container: {assign.dockerImage}



                            </div>



                          )}



                        </div>



                        <div className="flex items-center gap-2 shrink-0">



                          <button



                            type="button"



                            onClick={() => openTestCaseModal(chapter.id, assign.id)}



                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"



                          >



                            <Terminal size={13} className="text-[#EE8420]" />



                            <span>



                              Cấu hình Test Cases ({assign.testCases?.length || 0})



                            </span>



                          </button>



                        </div>



                      </div>



                    ))}



                  </div>



                </div>



              </div>



            ))}



            {/* Add Chapter Card */}



            {!showAddChapter ? (



              <button



                type="button"



                onClick={() => setShowAddChapter(true)}



                className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 transition cursor-pointer"



              >



                <Plus size={15} />



                <span>Thêm Chương học mới</span>



              </button>



            ) : (



              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 flex flex-wrap items-center gap-2.5">



                <input



                  type="text"



                  value={newChapterTitle}



                  onChange={(e) => setNewChapterTitle(e.target.value)}



                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddChapter();
                    } else if (e.key === "Escape") {
                      setShowAddChapter(false);
                    }
                  }}



                  placeholder="Ví dụ: Chương 3: Design Patterns trong Hệ thống Lớn..."



                  className="flex-1 min-w-[240px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"



                />



                <button



                  type="button"



                  onClick={handleAddChapter}



                  className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"



                >



                  Thêm Chương



                </button>



                <button



                  type="button"



                  onClick={() => setShowAddChapter(false)}



                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"



                >



                  Hủy



                </button>



              </div>



            )}



          </div>



        )}



        {/* ====================================================================



            TAB 3: DUAL GRADING CENTER (DOCKER CI/CD + 3D AI DEFENSE)



           ==================================================================== */}



        {tab === "grading" && (
          <div className="animate-screen-enter space-y-4">
            {/* Top View Mode Switcher: Bài tập Thực hành từng Chương vs Đồ án Kép */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGradingScope("chapter_exercises")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    gradingScope === "chapter_exercises"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Code2 size={15} className={gradingScope === "chapter_exercises" ? "text-emerald-500" : ""} />
                  <span>Bài tập Thực hành từng Chương (16 Môn)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradingScope("dual_submissions")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    gradingScope === "dual_submissions"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ShieldCheck size={15} className={gradingScope === "dual_submissions" ? "text-purple-500" : ""} />
                  <span>Đồ án Kép & Phòng Phản biện AI 3D ({classSubmissions.length})</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 pr-2 hidden sm:inline-block">
                Hệ thống Thẩm định Điểm & Đóng dấu Học bạ ABET
              </span>
            </div>

            {gradingScope === "chapter_exercises" ? (
              <InstructorChapterGradingView
                onNotify={notify}
                classes={classes}
                defaultSubjectId={activeClass?.id || activeClass?.subjectId || ""}
              />
            ) : (
              <>
            {/* Filter & Rubric Toolbar */}



            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">



              <MarloSegmentedControl<"all" | "pending" | "flagged" | "graded">



                size="sm"



                value={gradingFilter}



                onChange={setGradingFilter}



                options={[



                  { id: "all", label: "Tất cả bài nộp" },



                  { id: "pending", label: "Chờ duyệt" },



                  { id: "flagged", label: "Cảnh báo lệch điểm / Đạo văn" },



                  { id: "graded", label: "Đã phê duyệt" },



                ]}



              />



              <button



                type="button"



                onClick={() => setRubricModalOpen(true)}



                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer"



              >



                <SlidersHorizontal size={14} />



                <span>Cấu hình Rubric Hội đồng AI</span>



              </button>



            </div>



            {/* Dual-Grading Master-Detail Workspace */}



            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">



              {/* Left Table */}



              <div className="lg:col-span-7 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden">



                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">



                  <span className="text-sm font-bold text-slate-900 dark:text-white">



                    Danh sách Nộp bài Kép ({classSubmissions.length})



                  </span>



                  <span className="text-[11px] font-mono text-slate-500">



                    Ngưỡng cảnh báo lệch: ≥ {rubric.autoFlagDiscrepancyThreshold}%



                  </span>



                </div>



                <div className="overflow-x-auto">



                  <table className="w-full border-collapse text-left">



                    <thead className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">



                      <tr>



                        <th className="px-4 py-3">Học viên</th>



                        <th className="px-4 py-3">CI/CD Sandbox</th>



                        <th className="px-4 py-3">AI Defense 3D</th>



                        <th className="px-4 py-3">Trạng thái</th>



                      </tr>



                    </thead>



                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">



                      {classSubmissions.map((sub) => {



                        const isSelected = activeSubmission?.id === sub.id;



                        const mismatch = hasDiscrepancy(sub, rubric);



                        const cicdPct = Math.round((sub.passedTests / Math.max(1, sub.totalTests)) * 100);



                        return (



                          <tr



                            key={sub.id}



                            onClick={() => setSelectedSubId(sub.id)}



                            className={`marlo-row cursor-pointer transition ${



                              isSelected



                                ? "bg-slate-100/90 dark:bg-slate-800/80"



                                : "hover:bg-slate-50/70 dark:hover:bg-slate-900/50"



                            }`}



                          >



                            <td className="px-4 py-3">



                              <div className="text-xs font-bold text-slate-900 dark:text-white">



                                {sub.studentName}



                              </div>



                              <div className="text-[10.5px] font-mono text-slate-500">



                                {sub.studentCode} · {sub.commitCount} commits



                              </div>



                            </td>



                            <td className="px-4 py-3">



                              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">



                                {sub.passedTests}/{sub.totalTests} tests ({cicdPct}%)



                              </div>



                              <div className="text-[10.5px] font-mono text-slate-500">



                                {sub.execTimeMs} ms · {sub.memoryMb} MB



                              </div>



                            </td>



                            <td className="px-4 py-3">



                              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">



                                {sub.defenseScore}/100



                              </div>



                              <div className="text-[10.5px] text-slate-500">



                                {sub.defenseStatus === "flagged"



                                  ? "Lệch năng lực thực"



                                  : sub.defenseStatus === "pending"



                                  ? "Đang vấn đáp"



                                  : "Giải thích khớp code"}



                              </div>



                            </td>



                            <td className="px-4 py-3">



                              {sub.status === "graded" ? (



                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">



                                  <CheckCircle2 size={12} />



                                  Đã chấm ({sub.finalScore})



                                </span>



                              ) : sub.status === "redefense_requested" ? (



                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-[#8F5404] dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold">



                                  <RotateCcw size={11} />



                                  Yêu cầu bảo vệ lại



                                </span>



                              ) : mismatch || sub.status === "flagged" ? (



                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2.5 py-0.5 text-[11px] font-bold">



                                  <Flag size={11} />



                                  Lệch CI/CD vs AI



                                </span>



                              ) : (



                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 text-[11px] font-bold">



                                  Chờ duyệt



                                </span>



                              )}



                            </td>



                          </tr>



                        );



                      })}



                    </tbody>



                  </table>



                </div>



              </div>



              {/* Right Dual-Evidence Detail Drawer */}



              {activeSubmission && (



                <aside className="lg:col-span-5 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">



                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">



                    <div>



                      <div className="text-sm font-black text-slate-950 dark:text-white">



                        {activeSubmission.studentName} · {activeSubmission.studentCode}



                      </div>



                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">



                        {activeSubmission.chapterTitle}



                      </div>



                      <div className="mt-1 inline-flex items-center gap-2 text-[10.5px] font-mono text-slate-500">



                        <span>Commit #{activeSubmission.commitHash}</span>



                        <span>•</span>



                        <span>{activeSubmission.commitCount} commits</span>



                        <span>•</span>



                        <span>Trùng lặp: {activeSubmission.similarityPct}%</span>



                      </div>



                    </div>



                    <span className="shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white">



                      Đề xuất: {computeWeightedScore(activeSubmission, rubric)}/100



                    </span>



                  </div>



                  {/* Integrity Discrepancy Alert */}



                  {hasDiscrepancy(activeSubmission, rubric) && (



                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 p-3 text-xs text-rose-800 dark:text-rose-300 space-y-1">



                      <div className="font-bold flex items-center gap-1.5">



                        <ShieldAlert size={14} />



                        <span>Phát hiện chênh lệch Auto-Test vs Phản biện AI</span>



                      </div>



                      <p className="text-[11px] leading-relaxed">{activeSubmission.coherenceSummary}</p>



                    </div>



                  )}



                  {/* Column 1: Docker Sandbox Test Case Breakdown */}



                  <div className="space-y-2">



                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">



                      <span>1. Kết quả Docker Sandbox ({activeSubmission.passedTests}/{activeSubmission.totalTests})</span>



                      <span className="font-mono">{activeSubmission.execTimeMs} ms</span>



                    </div>



                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">



                      {activeSubmission.testDetails.map((tc) => (



                        <div



                          key={tc.id}



                          className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-[11px] flex items-center justify-between gap-2"



                        >



                          <div className="min-w-0">



                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">



                              {tc.title}



                            </div>



                            {tc.note && (



                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">



                                {tc.note}



                              </div>



                            )}



                          </div>



                          <span



                            className={`shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded ${



                              tc.status === "passed"



                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"



                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400"



                            }`}



                          >



                            {tc.status === "passed" ? "PASS" : "FAIL"}



                          </span>



                        </div>



                      ))}



                    </div>



                  </div>



                  {/* Column 2: 3D AI Defense Transcript */}



                  <div className="space-y-2">



                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">



                      <span>2. Biên bản Phòng Phản biện AI 3D</span>



                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">



                        {activeSubmission.defenseScore}/100



                      </span>



                    </div>



                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">



                      {activeSubmission.transcript.map((item) => (



                        <div



                          key={item.id}



                          className={`rounded-xl p-2.5 text-[11px] leading-relaxed border ${



                            item.speaker === "student"



                              ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"



                              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800"



                          }`}



                        >



                          <div className="font-bold text-slate-900 dark:text-white text-[10.5px]">



                            {item.speakerLabel}



                          </div>



                          <div className="text-slate-700 dark:text-slate-300 mt-0.5">{item.text}</div>



                          {item.evaluation && (



                            <div className="mt-1 text-[10px] font-semibold text-[#8F5404] dark:text-amber-400">



                              Đánh giá AI: {item.evaluation}



                            </div>



                          )}



                        </div>



                      ))}



                    </div>



                  </div>



                  {/* Final Approval Form */}



                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">



                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">



                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">



                        Điểm chốt (0-100)



                      </label>



                      <input



                        type="number"



                        min={0}



                        max={100}



                        value={gradeInput}



                        onChange={(e) => setGradeInput(e.target.value)}



                        className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-slate-400"



                      />



                    </div>



                    <textarea



                      rows={2}



                      value={feedbackInput}



                      onChange={(e) => setFeedbackInput(e.target.value)}



                      placeholder="Nhập nhận xét gửi tới học viên..."



                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none resize-none"



                    />



                    <div className="flex flex-wrap gap-2">



                      <button



                        type="button"



                        onClick={handleApproveDualScore}



                        className="flex-1 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] py-2.5 px-3 text-xs font-bold transition cursor-pointer"



                      >



                        Phê duyệt Điểm



                      </button>



                      <button



                        type="button"



                        onClick={handleRequestRedefense}



                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"



                      >



                        Yêu cầu Bảo vệ lại (3D AI)



                      </button>



                    </div>



                  </div>



                </aside>

              )}

            </div>
            </>
            )}

          </div>

        )}



        {/* ====================================================================



            TAB 4: MONOCHROME MASTER MINDMAP & CLASS MASTERY COMPARISON



           ==================================================================== */}



        {/* ====================================================================

            TAB: STUDENTS ANALYTICS (16 COURSES ROSTER)

           ==================================================================== */}

        {tab === "students" && (

          <div className="animate-screen-enter">

            <InstructorStudentsTab
              onNotify={notify}
              activeCourseCode={activeClass.code}
              activeSectionId={activeClass.sectionId || activeClass.id}
              courses={classes}
            />

          </div>

        )}



        {tab === "mindmap" && (



          <div className="animate-screen-enter space-y-4">



            {/* Mindmap Control Bar */}



            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">



              <div className="flex flex-wrap items-center gap-3">



                <MarloSelect



                  aria-label="Chọn chương sơ đồ"



                  value={selectedMindmapChapterId}



                  onChange={(e) => handleSwitchMindmapChapter(e.target.value)}



                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"



                >



                  {(activeClass?.chapters || []).map((ch) => (



                    <option key={ch.id} value={ch.id}>



                      {ch.title}



                    </option>



                  ))}



                </MarloSelect>



                {isMindmapDirty && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Chưa lưu thay đổi
                  </span>
                )}



                <MarloSegmentedControl<"edit" | "compare">



                  size="sm"



                  value={mindmapMode}



                  onChange={setMindmapMode}



                  options={[



                    { id: "edit", label: "Chỉnh sửa Master Graph" },



                    { id: "compare", label: "Đối chiếu Năng lực Lớp" },



                  ]}



                />



              </div>



              <div className="flex flex-wrap items-center gap-2">



                <button



                  type="button"



                  onClick={() => handleAddMindmapNode("branch")}



                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"



                >



                  + Nhánh bài học



                </button>



                <button



                  type="button"



                  onClick={() => handleAddMindmapNode("leaf")}



                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"



                >



                  + Khái niệm



                </button>



                <button



                  type="button"



                  onClick={handleGenerateMindmapAI}



                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 transition cursor-pointer"



                >



                  <WandSparkles size={13} />



                  <span>AI Dựng lại</span>



                </button>



                <button



                  type="button"



                  onClick={handleSaveMasterGraph}



                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"



                >



                  <Save size={13} />



                  <span>Lưu Master Graph</span>



                </button>



              </div>



            </div>



            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">



              {/* React Flow Monochrome Canvas matching Student LessonMindmapStudio */}



              <div className="lg:col-span-9 h-[580px] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-radial from-slate-50 via-white to-slate-100/90 dark:from-[#181d2a] dark:via-[#131722] dark:to-[#0f121a] overflow-hidden relative shadow-xs">



                {isMindmapGenerating && (



                  <div className="absolute inset-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-center p-6">



                    <Loader2 size={28} className="animate-spin text-slate-800 dark:text-white" />



                    <div className="text-sm font-bold text-slate-900 dark:text-white">



                      Đang liên kết cây tri thức chuẩn ({mindmapStep}/3)...



                    </div>



                  </div>



                )}



                <ReactFlowProvider>



                  <ReactFlow



                    nodes={nodes}



                    edges={edges}



                    nodeTypes={masterMindmapNodeTypes}



                    onNodesChange={onNodesChange}



                    onEdgesChange={onEdgesChange}



                    onConnect={onConnect}



                    onNodeClick={(_e, node) => setSelectedNodeId(node.id)}



                    onPaneClick={() => setSelectedNodeId(null)}



                    fitView



                    fitViewOptions={{ padding: 0.18 }}



                    minZoom={0.4}



                    maxZoom={1.5}



                    proOptions={{ hideAttribution: true }}



                  >



                    <Background color="#94a3b8" gap={22} size={1.2} className="opacity-55 dark:opacity-35" />



                    <Controls className="!bg-white/95 dark:!bg-slate-900/95 !border-slate-200 dark:!border-slate-700 !rounded-xl !shadow-xs" />



                    <MiniMap



                      pannable



                      zoomable



                      className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-700 !rounded-xl"



                      nodeColor="#64748b"



                    />



                  </ReactFlow>



                </ReactFlowProvider>



              </div>



              {/* Right Sidebar: Inspector or Class Mastery Analysis */}



              <div className="lg:col-span-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-xs flex flex-col justify-between gap-4">



                {mindmapMode === "compare" ? (



                  <div className="space-y-3">



                    <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">



                      Điểm yếu theo Nhánh Kiến thức



                    </h3>



                    <p className="text-[11px] text-slate-500 dark:text-slate-400">



                      Các nút có tỷ lệ nắm vững của lớp dưới 60% được đánh dấu cam để giảng viên bổ trợ ngay.



                    </p>



                    <div className="space-y-2 max-h-[360px] overflow-y-auto">



                      {nodes.map((n) => (



                        <div



                          key={n.id}



                          onClick={() => setSelectedNodeId(n.id)}



                          className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 cursor-pointer hover:border-slate-300 transition space-y-1.5"



                        >



                          <div className="flex items-center justify-between gap-2 text-xs">



                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">



                              {n.data.title}



                            </span>



                            <span



                              className={`font-mono font-bold ${



                                n.data.masteryPct < 60



                                  ? "text-[#EE8420]"



                                  : "text-slate-600 dark:text-slate-300"



                              }`}



                            >



                              {n.data.masteryPct}%



                            </span>



                          </div>



                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">



                            <div



                              className={`h-full rounded-full ${



                                n.data.masteryPct < 60 ? "bg-[#EE8420]" : "bg-[#141619] dark:bg-white"



                              }`}



                              style={{ width: `${n.data.masteryPct}%` }}



                            />



                          </div>



                        </div>



                      ))}



                    </div>



                    <button



                      type="button"



                      onClick={() =>



                        triggerCopilotPrompt(



                          `Soạn nhanh bộ 3 câu hỏi Quiz bẫy cho các nhánh yếu (< 60%) của lớp ${activeClass.code}`



                        )



                      }



                      className="w-full rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] py-2.5 px-3 text-xs font-bold transition cursor-pointer"



                    >



                      Nhờ AI soạn Quiz bổ trợ nhánh yếu



                    </button>



                  </div>



                ) : selectedNodeId ? (



                  (() => {



                    const current = nodes.find((n) => n.id === selectedNodeId);



                    if (!current) return null;



                    return (



                      <div className="space-y-3">



                        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">



                          Thuộc tính Nút Kiến thức



                        </h3>



                        <div>



                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">



                            Tiêu đề



                          </label>



                          <input



                            type="text"



                            value={current.data.title}



                            onChange={(e) => handleUpdateSelectedNode("title", e.target.value)}



                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none"



                          />



                        </div>



                        <div>



                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">



                            Tóm tắt khái niệm



                          </label>



                          <textarea



                            rows={3}



                            value={current.data.summary}



                            onChange={(e) => handleUpdateSelectedNode("summary", e.target.value)}



                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none resize-none"



                          />



                        </div>



                        <div>



                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">



                            Nhãn Tag



                          </label>



                          <input



                            type="text"



                            value={current.data.tag}



                            onChange={(e) => handleUpdateSelectedNode("tag", e.target.value)}



                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none"



                          />



                        </div>



                        {current.data.nodeType !== "root" && (



                          <button



                            type="button"



                            onClick={() => {



                              setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));

                              setEdges((eds) =>
                                eds.filter(
                                  (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
                                )
                              );

                              setSelectedNodeId(null);

                              setIsMindmapDirty(true);

                              notify("Đã xóa nút khỏi Master Mindmap.");



                            }}



                            className="w-full rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 py-2 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"



                          >



                            Xóa nút này



                          </button>



                        )}



                      </div>



                    );



                  })()



                ) : (



                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">



                    <Network size={22} className="mx-auto text-slate-400" />



                    <p>Nhấp vào một thẻ trên sơ đồ để sửa tiêu đề, mô tả hoặc chuyển sang chế độ Đối chiếu năng lực lớp.</p>



                  </div>



                )}



                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">



                  <div className="flex justify-between">



                    <span>Số lượng Nút:</span>



                    <span className="font-mono font-bold">{nodes.length}</span>



                  </div>



                  <div className="flex justify-between">



                    <span>Liên kết nhánh:</span>



                    <span className="font-mono font-bold">{edges.length}</span>



                  </div>



                </div>



              </div>



            </div>



          </div>



        )}



      </div>



      {/* ====================================================================



          MODAL 1: LESSON AIGC STUDIO



         ==================================================================== */}



      {lessonModalOpen && selectedLesson && (
        <div
          onClick={() => setLessonModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] max-w-5xl xl:max-w-6xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ── MODAL HEADER ──────────────────────────────────────────────── */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Biên soạn Bài học AIGC · {activeClass.code}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        editStatus === "Đã phát hành" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span>{editStatus}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Tên bài giảng..."
                    className="flex-1 min-w-[220px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="15 phút"
                    className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none text-center"
                    title="Thời lượng hiển thị cho học viên"
                  />
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5">
                    <span className="text-[10px] font-mono text-slate-400">+</span>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      step={10}
                      value={editXp}
                      onChange={(e) => setEditXp(Number(e.target.value) || 0)}
                      className="w-12 bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white outline-none text-center"
                      title="Điểm kinh nghiệm thưởng khi hoàn thành bài"
                    />
                    <span className="text-[10px] font-mono text-slate-400">XP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const ch = (activeClass?.chapters || []).find((c) => c.id === activeLessonChapterId);
                    setPreviewLesson({
                      chapterTitle: ch?.title || activeClass.name,
                      lesson: {
                        ...selectedLesson,
                        title: editTitle || selectedLesson.title,
                        duration: editDuration || selectedLesson.duration,
                        status: editStatus,
                        documents: editDocuments,
                        content: {
                          reading: editReading,
                          videoScenes: editScenes,
                          quizzes: editQuizzes,
                          youtubeUrl: editYoutubeUrl,
                          youtubeId: extractYoutubeId(editYoutubeUrl),
                          objective: editObjective,
                          lead: editLead,
                          codeSnippet: editCodeSnippet,
                          keyTakeaways: editKeyTakeaways,
                          antiPattern: editAntiPattern,
                        },
                      },
                      assignment: ch?.assignments?.[0],
                    });
                    setPreviewTab("reading");
                    setPreviewQuizAnswers({});
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Xem thử Học viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── MODAL SUBNAV TABS (5 TABS) ─────────────────────────────────── */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "video" as const, label: "1. Video & YouTube Link", icon: Video },
                  { id: "reading" as const, label: "2. Bài đọc (Chuẩn học thuật)", icon: BookOpen },
                  { id: "quiz" as const, label: `3. Bộ Quiz (${editQuizzes.length} câu)`, icon: HelpCircle },
                  { id: "mindmap" as const, label: "4. Sơ đồ Tư duy (Mindmap)", icon: GitBranch },
                  { id: "upload" as const, label: "5. Tài liệu & AI", icon: WandSparkles },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawerTab(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-[#141619] dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── MODAL BODY CONTENT ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* ── TAB 1: VIDEO & YOUTUBE LINK ── */}
              {drawerTab === "video" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Video size={14} className="text-blue-500" />
                          <span>Liên kết Video Bài giảng YouTube</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Nhập URL YouTube hoặc mã video 11 ký tự để phát trực tiếp trên tab "Video bài giảng" của học viên.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-400">YouTube ID:</span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80">
                          {extractYoutubeId(editYoutubeUrl)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editYoutubeUrl}
                        onChange={(e) => setEditYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=M6FwepHC6vM hoặc mã video..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      {/* Gợi ý video chuẩn */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Chọn nhanh:</span>
                        {[
                          { title: "Kế thừa C++ (F8 Official)", id: "M6FwepHC6vM" },
                          { title: "Đa hình & Bảng ảo vtable", id: "m2ZsYwZuns4" },
                          { title: "Smart Pointers (unique/shared)", id: "JtWcUHRyqkA" },
                        ].map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setEditYoutubeUrl(`https://www.youtube.com/watch?v=${v.id}`)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 cursor-pointer"
                          >
                            {v.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview Iframe */}
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span>Khung xem trước Video (16:9 Live Preview):</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Đồng bộ học viên 100%</span>
                      </div>
                      <div
                        className="relative aspect-video w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black shadow-sm"
                        style={{ transform: "none", isolation: "isolate" }}
                      >
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId(editYoutubeUrl)}?rel=0&modestbranding=1`}
                          title="YouTube Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>

                  {/* Video Scenes / Chapters */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Danh sách Phân cảnh Video (Video Chapters · {editScenes.length} mốc)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Các mốc thời gian giúp học viên nhảy nhanh đến đoạn kiến thức cần xem.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditScenes((prev) => [
                            ...prev,
                            {
                              id: `scene-${Date.now()}`,
                              title: `Phân cảnh ${prev.length + 1}`,
                              text: "Tóm tắt phân cảnh...",
                              script: "Kịch bản bài giảng...",
                              time: `${String(prev.length * 4).padStart(2, "0")}:00`,
                            },
                          ])
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span>Thêm phân cảnh</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {editScenes.map((sc, idx) => (
                        <div
                          key={sc.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={sc.time || "00:00"}
                                onChange={(e) =>
                                  setEditScenes((prev) =>
                                    prev.map((item) => (item.id === sc.id ? { ...item, time: e.target.value } : item))
                                  )
                                }
                                placeholder="00:00"
                                className="w-16 font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-center"
                              />
                              <input
                                type="text"
                                value={sc.title}
                                onChange={(e) =>
                                  setEditScenes((prev) =>
                                    prev.map((item) => (item.id === sc.id ? { ...item, title: e.target.value } : item))
                                  )
                                }
                                placeholder="Tiêu đề phân cảnh..."
                                className="flex-1 min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditScenes((prev) => prev.filter((item) => item.id !== sc.id))}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition"
                              title="Xóa phân cảnh"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={sc.text}
                            onChange={(e) =>
                              setEditScenes((prev) =>
                                prev.map((item) => (item.id === sc.id ? { ...item, text: e.target.value } : item))
                              )
                            }
                            placeholder="Tóm tắt phân cảnh..."
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: BÀI ĐỌC (CHUẨN HỌC THUẬT) ── */}
              {drawerTab === "reading" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cấu trúc Bài đọc Học thuật theo Mẫu Chuẩn
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tuân theo mẫu: Mục tiêu · Tóm tắt · Code mẫu C++ · Nguyên lý cốt lõi · Anti-Pattern.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const t = editTitle.trim() || selectedLesson.title;
                        const preset = getSubjectAigcPreset(activeClass?.subjectId || "", activeClass?.code || "CS201", t);
                        setEditObjective(`Nắm vững nguyên lý và phương pháp thực hành chuyên sâu cho bài học: ${t}`);
                        setEditLead(`Bài học (${activeClass.code}) giải thích cặn kẽ bản chất kỹ thuật của ${t}, tập trung vào ${preset.leadNote}.`);
                        setEditCodeSnippet({
                          lang: preset.lang,
                          code: preset.code,
                          caption: preset.caption,
                        });
                        setEditKeyTakeaways([
                          `Hiểu rõ bản chất thiết kế và cơ chế vận hành của ${t}.`,
                          `Làm chủ ${preset.leadNote}.`,
                          "Đạt 100% test tự động & xử lý đủ các trường hợp biên (Edge Cases).",
                        ]);
                        setEditAntiPattern({
                          badDesc: preset.badDesc,
                          solution: preset.solution,
                        });
                        notify(`Đã nạp mẫu bài giảng chuẩn ${activeClass.code}.`);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer hover:bg-blue-100 flex items-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      <span>Áp dụng mẫu bài giảng {activeClass.code}</span>
                    </button>
                  </div>

                  {/* Mục tiêu & Tóm tắt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Mục tiêu bài học (Objective)</span>
                      </label>
                      <input
                        type="text"
                        value={editObjective}
                        onChange={(e) => setEditObjective(e.target.value)}
                        placeholder="Mục tiêu cốt lõi của bài giảng..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Tóm tắt mở đầu (Lead)</span>
                      </label>
                      <input
                        type="text"
                        value={editLead}
                        onChange={(e) => setEditLead(e.target.value)}
                        placeholder="Đoạn văn dẫn nhập bài học..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Code Snippet Box */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Code2 size={14} className="text-amber-500" />
                        <span>Mã nguồn C++ Minh họa (Code Snippet)</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">Hiển thị trong khung code có nút sao chép</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ngôn ngữ:</span>
                        <input
                          type="text"
                          value={editCodeSnippet.lang}
                          onChange={(e) => setEditCodeSnippet((prev) => ({ ...prev, lang: e.target.value }))}
                          className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Chú thích mã:</span>
                        <input
                          type="text"
                          value={editCodeSnippet.caption}
                          onChange={(e) => setEditCodeSnippet((prev) => ({ ...prev, caption: e.target.value }))}
                          placeholder="Mô tả ngắn cho đoạn mã..."
                          className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={editCodeSnippet.code}
                      onChange={(e) => setEditCodeSnippet((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="// Nhập code C++ minh họa..."
                      className="w-full font-mono text-xs leading-relaxed rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 p-3.5 outline-none"
                    />
                  </div>

                  {/* Nguyên lý cốt lõi (Key Takeaways) */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>Nguyên lý cốt lõi cần nhớ (Key Takeaways)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditKeyTakeaways((prev) => [...prev, "Nguyên lý bổ sung..."])}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer"
                      >
                        + Thêm gạch đầu dòng
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editKeyTakeaways.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400 w-6">0{pIdx + 1}.</span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditKeyTakeaways((prev) => prev.map((item, idx) => (idx === pIdx ? val : item)));
                            }}
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setEditKeyTakeaways((prev) => prev.filter((_, idx) => idx !== pIdx))}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anti-Pattern & Clean Architecture */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-3.5 space-y-1.5">
                      <label className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        <span>Sai lầm thường gặp (Anti-Pattern)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={editAntiPattern.badDesc}
                        onChange={(e) => setEditAntiPattern((prev) => ({ ...prev, badDesc: e.target.value }))}
                        placeholder="Mô tả sai lầm hoặc cạm bẫy thiết kế..."
                        className="w-full rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-1.5">
                      <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck size={13} />
                        <span>Giải pháp chuẩn Kiến trúc</span>
                      </label>
                      <textarea
                        rows={3}
                        value={editAntiPattern.solution}
                        onChange={(e) => setEditAntiPattern((prev) => ({ ...prev, solution: e.target.value }))}
                        placeholder="Mô tả giải pháp kiến trúc tối ưu..."
                        className="w-full rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Nội dung chi tiết Markdown */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Nội dung Lý thuyết Chuyên sâu (Markdown)</span>
                      <span className="text-[10px] font-mono text-slate-400">Hỗ trợ định dạng tiêu đề, danh sách, mã nguồn</span>
                    </label>
                    <textarea
                      rows={8}
                      value={editReading}
                      onChange={(e) => setEditReading(e.target.value)}
                      placeholder="# Tiêu đề bài giảng..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3.5 text-xs leading-6 text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 3: BỘ QUIZ (TRẮC NGHIỆM 4 PHƯƠNG ÁN) ── */}
              {drawerTab === "quiz" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Bộ Câu Hỏi Trắc Nghiệm ({editQuizzes.length} câu)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mỗi câu hỏi gồm 4 phương án A, B, C, D kèm đáp án đúng và lời giải thích chuyên sâu.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const t = editTitle.trim() || selectedLesson.title;
                          const preset = getSubjectAigcPreset(activeClass?.subjectId || "", activeClass?.code || "CS201", t);
                          setEditQuizzes([
                            {
                              id: `q-1`,
                              question: `Trong chuyên đề "${t}" (${activeClass.code}), giải pháp nào phản ánh đúng nguyên tắc cốt lõi?`,
                              options: [
                                preset.solution,
                                preset.badDesc,
                                "Ghép nối cứng toàn bộ logic không tách mô-đun",
                                "Bỏ qua kiểm thử đầu vào và điều kiện biên",
                              ],
                              answer: preset.solution,
                              correctIndex: 0,
                              explanation: `Chuẩn ${activeClass.code}: ${preset.solution}`,
                            },
                            {
                              id: `q-2`,
                              question: `Vì sao cần tránh sai lầm phổ biến: "${preset.badDesc.slice(0, 70)}"?`,
                              options: [
                                "Vì dễ phát sinh lỗi runtime, rò rỉ tài nguyên hoặc hỏng logic biên",
                                "Vì làm tệp mã nguồn ngắn hơn",
                                "Vì trình biên dịch sẽ tự động sửa mọi lỗi thiết kế",
                                "Vì không ảnh hưởng tới khả năng mở rộng hay kiểm thử",
                              ],
                              answer: "Vì dễ phát sinh lỗi runtime, rò rỉ tài nguyên hoặc hỏng logic biên",
                              correctIndex: 0,
                              explanation: `Cách xử lý đúng: ${preset.solution}`,
                            },
                          ]);
                          notify(`Đã nạp bộ câu hỏi trắc nghiệm chuẩn ${activeClass.code}.`);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer hover:bg-blue-100 flex items-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        <span>Nạp bộ câu hỏi mẫu {activeClass.code}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditQuizzes((prev) => [
                            ...prev,
                            {
                              id: `q-${Date.now()}`,
                              question: "Câu hỏi trắc nghiệm mới...",
                              options: [
                                "Phương án A (Đáp án đúng)",
                                "Phương án B",
                                "Phương án C",
                                "Phương án D",
                              ],
                              answer: "Phương án A (Đáp án đúng)",
                              correctIndex: 0,
                              explanation: "Giải thích chi tiết vì sao phương án này chính xác...",
                            },
                          ])
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>Thêm câu hỏi</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editQuizzes.map((q, qi) => {
                      const letters = ["A", "B", "C", "D"];
                      const currentCorrectIdx =
                        typeof q.correctIndex === "number"
                          ? q.correctIndex
                          : q.options?.findIndex((opt) => opt === q.answer) >= 0
                          ? q.options.findIndex((opt) => opt === q.answer)
                          : 0;

                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              CÂU HỎI {qi + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditQuizzes((prev) => prev.filter((item) => item.id !== q.id))}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition flex items-center gap-1 text-xs"
                            >
                              <Trash2 size={13} />
                              <span>Xóa câu hỏi</span>
                            </button>
                          </div>

                          {/* Tiêu đề câu hỏi */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">
                              Nội dung câu hỏi:
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuizzes((prev) =>
                                  prev.map((item) => (item.id === q.id ? { ...item, question: val } : item))
                                );
                              }}
                              placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          {/* 4 Phương án A, B, C, D */}
                          <div className="space-y-2 pt-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
                              <span>4 Phương án trả lời:</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                * Bấm vào chữ [A], [B], [C], [D] để chọn đáp án đúng
                              </span>
                            </label>

                            {letters.map((letter, optIdx) => {
                              const isCorrect = currentCorrectIdx === optIdx;
                              const optVal = q.options?.[optIdx] || "";

                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditQuizzes((prev) =>
                                        prev.map((item) => {
                                          if (item.id !== q.id) return item;
                                          return {
                                            ...item,
                                            correctIndex: optIdx,
                                            answer: item.options?.[optIdx] || `Phương án ${letter}`,
                                          };
                                        })
                                      );
                                    }}
                                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition cursor-pointer border ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                                    }`}
                                    title={`Bấm để đặt [${letter}] là đáp án đúng`}
                                  >
                                    {letter}
                                  </button>

                                  <input
                                    type="text"
                                    value={optVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditQuizzes((prev) =>
                                        prev.map((item) => {
                                          if (item.id !== q.id) return item;
                                          const nextOpts = [...(item.options || ["", "", "", ""])];
                                          nextOpts[optIdx] = val;
                                          const updatedAnswer = item.correctIndex === optIdx ? val : item.answer;
                                          return {
                                            ...item,
                                            options: nextOpts,
                                            answer: updatedAnswer,
                                          };
                                        })
                                      );
                                    }}
                                    placeholder={`Nhập nội dung phương án ${letter}...`}
                                    className={`flex-1 rounded-xl border px-3 py-1.5 text-xs ${
                                      isCorrect
                                        ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-white font-medium"
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                                    }`}
                                  />

                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono shrink-0 px-2">
                                      ✓ ĐÁP ÁN ĐÚNG
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Lời giải thích */}
                          <div className="pt-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">
                              Giải thích đáp án (Hiển thị khi học viên trả lời xong):
                            </label>
                            <textarea
                              rows={2}
                              value={q.explanation || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuizzes((prev) =>
                                  prev.map((item) => (item.id === q.id ? { ...item, explanation: val } : item))
                                );
                              }}
                              placeholder="Giải thích tại sao phương án này chính xác..."
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB 4: SƠ ĐỒ TƯ DUY (MINDMAP) ── */}
              {drawerTab === "mindmap" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                        <GitBranch size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Sơ Đồ Tư Duy (Master Mindmap) Của Bài Học & Chương
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cây tri thức chuẩn hóa do Giảng viên xây dựng được đồng bộ tự động sang tab Mindmap của học viên.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeLessonChapterId) {
                          setSelectedMindmapChapterId(activeLessonChapterId);
                        }
                        setLessonModalOpen(false);
                        handleTabSwitch("mindmap");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <GitBranch size={13} />
                      <span>Mở Studio Master Mindmap để chỉnh sửa Nodes</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Trạng thái đồng bộ Master Mindmap:</div>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pl-4 list-disc">
                      <li>Khái niệm bài học: <strong className="text-slate-900 dark:text-white">{editTitle || selectedLesson.title}</strong></li>
                      <li>Học phần áp dụng: <span className="font-mono">{activeClass.code} · {activeClass.name}</span></li>
                      <li>Khi Giảng viên cập nhật các nút tại Tab "Master Mindmap" và bấm Lưu, dữ liệu được lưu trực tiếp vào MySQL 8.0 và đồng bộ sang tab Mindmap của học viên.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ── TAB 5: TÀI LIỆU & AI ── */}
              {drawerTab === "upload" && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.pptx,.docx,.md,.txt"
                    onChange={handleLessonFileUpload}
                    className="hidden"
                  />
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <Upload size={24} className="mx-auto text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {editDocuments.length > 0
                          ? `Đã đính kèm ${editDocuments.length} tài liệu giáo trình`
                          : "Tải lên hoặc chọn tài liệu giáo trình để AI biên soạn bài giảng"}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ định dạng PDF, PPTX, DOCX, Markdown (.md) chuẩn ABET
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5"
                      >
                        <Upload size={13} />
                        <span>Tải tệp từ máy (PDF/PPTX/MD)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => attachLessonDocument(`${activeClass.code}_Slide_Chuan.pdf`, "480 KB")}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                      >
                        Đính kèm Slide Chuẩn {activeClass.code}
                      </button>

                      <button
                        type="button"
                        onClick={runLessonAigc}
                        disabled={isAigcRunning}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer shadow-xs"
                      >
                        {isAigcRunning ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Đang biên soạn ({aigcStep}/4)...</span>
                          </>
                        ) : (
                          <>
                            <WandSparkles size={13} />
                            <span>Kích hoạt AI biên soạn toàn bộ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {editDocuments.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Danh sách Tài liệu Đính kèm ({editDocuments.length})
                      </div>
                      {editDocuments.map((doc) => (
                        <div
                          key={doc.name}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={14} className="text-slate-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{doc.name}</span>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">({doc.size} · {doc.uploadedAt})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLessonDocument(doc.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shrink-0"
                            title="Gỡ tài liệu"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── MODAL FOOTER ──────────────────────────────────────────────── */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Trạng thái lưu: <strong className="text-slate-800 dark:text-slate-200">{editStatus}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={() => saveLessonEdits("Bản nháp")}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Lưu bản nháp
                </button>

                <button
                  type="button"
                  onClick={() => saveLessonEdits("Đã phát hành")}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-bold cursor-pointer shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>LƯU & PHÁT HÀNH CHO HỌC VIÊN</span>
                </button>
              </div>
            </div>
          </div>



        </div>



      )}



      {/* ====================================================================



          MODAL 2: DOCKER CI/CD TEST CASE CONFIGURATOR



         ==================================================================== */}



      {tcModalOpen && activeTcAssignment && (
        <div
          onClick={() => setTcModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden"
          >



            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">



              <div>



                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">



                  Docker Sandbox CI/CD · {activeTcAssignment.dockerImage || "codemind/cpp20-sandbox"}



                </div>



                <h3 className="text-base font-bold text-slate-900 dark:text-white">



                  {activeTcAssignment.title}



                </h3>



              </div>



              <button



                type="button"



                onClick={() => setTcModalOpen(false)}



                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"



              >



                <X size={15} />



              </button>



            </div>



            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Assignment Metadata Editor */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Thông tin Bài tập Thực hành & Docker Image
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveAssignmentMeta()}
                    className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                  >
                    Lưu đề bài Lab
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      Tiêu đề bài tập Lab
                    </label>
                    <input
                      type="text"
                      value={editAssignTitle}
                      onChange={(e) => setEditAssignTitle(e.target.value)}
                      placeholder="Tiêu đề bài tập Lab..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      Điểm / XP
                    </label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2">
                      <span className="text-[11px] text-slate-400 font-mono">+</span>
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        value={editAssignPoints}
                        onChange={(e) => setEditAssignPoints(Number(e.target.value) || 100)}
                        className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                    Docker Sandbox Image
                  </label>
                  <input
                    type="text"
                    value={editAssignDockerImage}
                    onChange={(e) => setEditAssignDockerImage(e.target.value)}
                    placeholder="codemind/cpp20-sandbox:latest"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white outline-none"
                    title="Docker image chạy test"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                    Mô tả yêu cầu & Tiêu chí đánh giá
                  </label>
                  <textarea
                    rows={3}
                    value={editAssignDesc}
                    onChange={(e) => setEditAssignDesc(e.target.value)}
                    placeholder="Yêu cầu bài tập & tiêu chí đánh giá..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white leading-relaxed outline-none resize-y overflow-y-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">



                {(activeTcAssignment.testCases || []).map((tc, idx) => (



                  <div



                    key={tc.id}



                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-2"



                  >

                    {editingTcId === tc.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTcTitle}
                          onChange={(e) => setEditTcTitle(e.target.value)}
                          placeholder="Tên Test Case"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold outline-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editTcInput}
                            onChange={(e) => setEditTcInput(e.target.value)}
                            placeholder="Input"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs outline-none"
                          />
                          <input
                            type="text"
                            value={editTcOutput}
                            onChange={(e) => setEditTcOutput(e.target.value)}
                            placeholder="Expected Output"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editTcEdgeCase}
                              onChange={(e) => setEditTcEdgeCase(e.target.checked)}
                            />
                            <span>Edge Case</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingTcId(null)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveEditedTestCase()}
                              className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                            >
                              Lưu Test Case
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{tc.title}</span>
                            {tc.isEdgeCase && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[#8F5404] dark:text-amber-400">
                                Edge Case
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            Input: {tc.input} → Expected: <strong className="text-slate-800 dark:text-slate-200">{tc.expectedOutput}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditTestCase(tc)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title="Sửa Test Case"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleTestCaseEdge(tc)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10.5px] font-semibold cursor-pointer"
                          >
                            {tc.isEdgeCase ? "Tắt Edge" : "Đặt Edge"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (tcChapterId) {
                                const delRes = await deleteInstructorTestCase(selectedClassId, tcChapterId, tc.id);
                                if (!delRes) {
                                  notify("❌ Không thể xóa Test Case trên máy chủ.");
                                  return;
                                }
                              }
                              updateAssignmentTestCases((cases) => cases.filter((i) => i.id !== tc.id));
                              broadcastCoursesUpdated(selectedClassId);
                              notify("Đã xóa Test Case khỏi Docker Sandbox.");
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Xóa Test Case"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>



                ))}



              </div>



              {/* Add Test Case Form */}



              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">



                <div className="text-xs font-bold text-slate-900 dark:text-white">



                  Thêm Unit Test Case mới



                </div>



                <input



                  type="text"



                  value={newTcTitle}



                  onChange={(e) => setNewTcTitle(e.target.value)}



                  placeholder="Tên Test Case (VD: Kiểm tra truyền nullptr vào evaluatePayroll)"



                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none"



                />



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">



                  <input



                    type="text"



                    value={newTcInput}



                    onChange={(e) => setNewTcInput(e.target.value)}



                    placeholder="Input (VD: evaluatePayroll(nullptr))"



                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs outline-none"



                  />



                  <input



                    type="text"



                    value={newTcOutput}



                    onChange={(e) => setNewTcOutput(e.target.value)}



                    placeholder="Expected Output (VD: 0.00)"



                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs outline-none"



                  />



                </div>



                <div className="flex items-center justify-between">



                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={newTcEdgeCase}



                      onChange={(e) => setNewTcEdgeCase(e.target.checked)}



                    />



                    <span>Đánh dấu là Ca biên (Edge Case)</span>



                  </label>



                  <button



                    type="button"



                    onClick={handleAddDockerTestCase}



                    className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-3.5 py-2 text-xs font-bold cursor-pointer"



                  >



                    + Thêm Test Case



                  </button>



                </div>



              </div>



            </div>



            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">



              <button



                type="button"



                onClick={async () => {
                  await handleSaveAssignmentMeta();
                  setTcModalOpen(false);
                }}



                className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"



              >



                Hoàn tất



              </button>



            </div>



          </div>



        </div>



      )}



      {/* ====================================================================



          MODAL 3: STUDENT PREVIEW ("XEM THỬ GÓC NHÌN HỌC VIÊN")



         ==================================================================== */}



      {previewLesson && (



        <div



          onClick={() => setPreviewLesson(null)}



          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"



        >



          <div



            onClick={(e) => e.stopPropagation()}



            className="w-full max-w-3xl max-h-[86vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden"



          >



            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">



              <div>



                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">



                  Chế độ Xem thử góc nhìn Học viên · {previewLesson.chapterTitle}



                </div>



                <h3 className="text-base font-bold text-slate-900 dark:text-white">



                  {previewLesson.lesson.title}



                </h3>



              </div>



              <button



                type="button"



                onClick={() => setPreviewLesson(null)}



                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"



              >



                <X size={15} />



              </button>



            </div>



            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center">



              <MarloSegmentedControl<"reading" | "video" | "quiz" | "exercise">



                size="sm"



                value={previewTab}



                onChange={setPreviewTab}



                options={[



                  { id: "reading", label: "Bài đọc" },



                  { id: "video", label: "Video bài giảng" },



                  { id: "quiz", label: `Quiz (${previewLesson.lesson.content.quizzes.length} câu)` },



                  { id: "exercise", label: "Bài tập CI/CD" },



                ]}



              />



            </div>



            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {previewTab === "reading" && (
                <div className="space-y-4">
                  {(previewLesson.lesson.content as any)?.objective && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 text-xs">
                      <span className="font-bold text-blue-700 dark:text-blue-300 uppercase text-[10px] tracking-wider block mb-1">
                        Mục tiêu bài học
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {(previewLesson.lesson.content as any).objective}
                      </p>
                    </div>
                  )}

                  {(previewLesson.lesson.content as any)?.lead && (
                    <p className="text-xs leading-6 text-slate-700 dark:text-slate-300 font-medium">
                      {(previewLesson.lesson.content as any).lead}
                    </p>
                  )}

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-xs leading-6 text-slate-700 dark:text-slate-200 whitespace-pre-line">
                    {previewLesson.lesson.content.reading || "Bài học này chưa có nội dung bài đọc."}
                  </div>

                  {(previewLesson.lesson.content as any)?.codeSnippet?.code && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 text-slate-100">
                      <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{(previewLesson.lesson.content as any).codeSnippet.caption || "Mã nguồn minh họa"}</span>
                        <span className="uppercase">{(previewLesson.lesson.content as any).codeSnippet.lang || "code"}</span>
                      </div>
                      <pre className="p-3.5 text-[11.5px] leading-relaxed overflow-x-auto font-mono">
                        <code>{(previewLesson.lesson.content as any).codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {Array.isArray((previewLesson.lesson.content as any)?.keyTakeaways) &&
                    (previewLesson.lesson.content as any).keyTakeaways.length > 0 && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">Nguyên lý cốt lõi cần nhớ:</div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                          {(previewLesson.lesson.content as any).keyTakeaways.map((kt: string, kIdx: number) => (
                            <li key={kIdx}>{kt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {(previewLesson.lesson.content as any)?.antiPattern?.badDesc && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-3.5">
                        <div className="font-bold text-rose-700 dark:text-rose-300 mb-1">Anti-Pattern cần tránh</div>
                        <p className="text-slate-700 dark:text-slate-300">{(previewLesson.lesson.content as any).antiPattern.badDesc}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">Giải pháp chuẩn Kiến trúc</div>
                        <p className="text-slate-700 dark:text-slate-300">{(previewLesson.lesson.content as any).antiPattern.solution}</p>
                      </div>
                    </div>
                  )}

                  {Array.isArray(previewLesson.lesson.documents) && previewLesson.lesson.documents.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-200">Tài liệu đính kèm ({previewLesson.lesson.documents.length}):</div>
                      {previewLesson.lesson.documents.map((doc) => (
                        <div key={doc.name} className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText size={12} />
                          <span>{doc.name} ({doc.size})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {previewTab === "video" && (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId((previewLesson.lesson.content as any)?.youtubeUrl || (previewLesson.lesson.content as any)?.youtubeId)}?rel=0&modestbranding=1`}
                      title="Preview YouTube Player"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="space-y-2.5">
                    {previewLesson.lesson.content.videoScenes.length === 0 ? (
                      <p className="text-xs text-slate-400">Chưa có phân cảnh video.</p>
                    ) : (
                      previewLesson.lesson.content.videoScenes.map((sc) => (
                        <div
                          key={sc.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1"
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2">
                            <span>{sc.title} — {sc.text}</span>
                            {sc.time && <span className="font-mono text-[11px] text-slate-400">{sc.time}</span>}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{sc.script}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {previewTab === "quiz" && (
                <div className="space-y-3">
                  {previewLesson.lesson.content.quizzes.map((q, idx) => {
                    const selectedIdx = previewQuizAnswers[q.id];
                    const correctIdx =
                      typeof q.correctIndex === "number"
                        ? q.correctIndex
                        : Math.max(0, q.options.findIndex((o) => o === q.answer));
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Câu {idx + 1}: {q.question}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isPicked = selectedIdx === optIdx;
                            const isCorrectOpt = optIdx === correctIdx;
                            const showResult = typeof selectedIdx === "number";
                            return (
                              <button
                                key={`${q.id}-${optIdx}`}
                                type="button"
                                onClick={() =>
                                  setPreviewQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                }
                                className={`text-left rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${
                                  showResult && isCorrectOpt
                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold"
                                    : showResult && isPicked && !isCorrectOpt
                                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-semibold"
                                    : isPicked
                                    ? "border-[#141619] dark:border-white font-bold bg-slate-50 dark:bg-slate-900"
                                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {typeof selectedIdx === "number" && q.explanation && (
                          <div className="text-[11px] rounded-lg bg-slate-50 dark:bg-slate-900/70 px-3 py-2 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                            <strong>Giải thích:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {previewTab === "exercise" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {previewLesson.assignment?.title || "Bài tập thực hành chương"}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {previewLesson.assignment?.description || "Nộp GitHub Repo để Docker Sandbox biên dịch và chạy test tự động."}
                    </p>
                    {previewLesson.assignment?.dockerImage && (
                      <div className="text-[11px] font-mono text-slate-400 mt-2">
                        Docker Sandbox: {previewLesson.assignment.dockerImage} · +{previewLesson.assignment.points} XP
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(previewLesson.assignment?.testCases || []).map((tc) => (
                      <div
                        key={tc.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs flex justify-between"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{tc.title}</span>
                        <span className="font-mono text-slate-500">{tc.timeoutMs} ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const targetLessonId = previewLesson.lesson.id;
                  const targetTab = previewTab === "reading" ? "lecture" : previewTab;
                  setPreviewLesson(null);
                  if (onOpenWorkspace) {
                    onOpenWorkspace({
                      subjectId: activeClass.subjectId || activeClass.id,
                      lessonId: targetLessonId,
                      tab: targetTab,
                    });
                  } else {
                    onNavigate?.("workspace");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>Mở Không gian Học viên đầy đủ</span>
                <ArrowUpRight size={13} />
              </button>



              <button



                type="button"



                onClick={() => setPreviewLesson(null)}



                className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"



              >



                Đóng bản xem thử



              </button>



            </div>



          </div>



        </div>



      )}



      {/* ====================================================================



          MODAL 4: AI DEFENSE RUBRIC CONFIGURATOR



         ==================================================================== */}



      {rubricModalOpen && (



        <div



          onClick={() => setRubricModalOpen(false)}



          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"



        >



          <div



            onClick={(e) => e.stopPropagation()}



            className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl overflow-hidden"



          >



            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">



              <h3 className="text-base font-bold text-slate-900 dark:text-white">



                Cấu hình Rubric Hội đồng AI 3D & Trọng số Kép



              </h3>



              <button



                type="button"



                onClick={() => setRubricModalOpen(false)}



                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"



              >



                <X size={15} />



              </button>



            </div>



            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">



              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">



                <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">



                  <span>Trọng số Docker CI/CD: {rubric.cicdWeightPct}%</span>



                  <span>Phản biện AI 3D: {rubric.defenseWeightPct}%</span>



                </div>



                <input



                  type="range"



                  min={20}



                  max={80}



                  step={5}



                  value={rubric.cicdWeightPct}



                  onChange={(e) => {



                    const cicd = Number(e.target.value);



                    setRubric((prev) => ({



                      ...prev,



                      cicdWeightPct: cicd,



                      defenseWeightPct: 100 - cicd,



                    }));



                  }}



                  className="w-full accent-[#141619]"



                />



                <div className="flex items-center justify-between pt-2 text-xs">



                  <span className="font-semibold text-slate-700 dark:text-slate-300">



                    Ngưỡng tự động cảnh báo lệch điểm (%)



                  </span>



                  <input



                    type="number"



                    min={10}



                    max={50}



                    value={rubric.autoFlagDiscrepancyThreshold}



                    onChange={(e) =>



                      setRubric((prev) => ({



                        ...prev,



                        autoFlagDiscrepancyThreshold: Number(e.target.value) || 25,



                      }))



                    }



                    className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-center"



                  />



                </div>



                <label className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">



                  <span>Bật Guardrail chống copy code (Xoáy sâu cơ chế Runtime)</span>



                  <input



                    type="checkbox"



                    checked={rubric.strictAntiCopyGuardrail}



                    onChange={(e) =>



                      setRubric((prev) => ({



                        ...prev,



                        strictAntiCopyGuardrail: e.target.checked,



                      }))



                    }



                  />



                </label>



              </div>



              <div className="space-y-2">



                <div className="text-xs font-bold text-slate-900 dark:text-white">



                  Câu hỏi xoáy Socratic bắt buộc theo chương



                </div>



                {rubric.mandatoryProbes.map((probe) => (



                  <div



                    key={probe.id}



                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs flex items-start justify-between gap-2"



                  >



                    <div>



                      <span className="font-mono font-bold text-slate-500">



                        [{probe.chapterKeyword}]



                      </span>{" "}



                      <span className="text-slate-800 dark:text-slate-200">{probe.topic}</span>



                    </div>



                    <button



                      type="button"



                      onClick={() =>



                        setRubric((prev) => ({



                          ...prev,



                          mandatoryProbes: prev.mandatoryProbes.filter((p) => p.id !== probe.id),



                        }))



                      }



                      className="text-rose-500 p-1 cursor-pointer"



                    >



                      <Trash2 size={13} />



                    </button>



                  </div>



                ))}



                <div className="flex flex-col sm:flex-row gap-2 pt-1">



                  <input



                    type="text"



                    value={newProbeKeyword}



                    onChange={(e) => setNewProbeKeyword(e.target.value)}



                    placeholder="Mã chương (VD: CS201 · Chương 2)"



                    className="sm:w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs outline-none"



                  />



                  <input



                    type="text"



                    value={newProbeTopic}



                    onChange={(e) => setNewProbeTopic(e.target.value)}



                    placeholder="Chủ đề AI bắt buộc hỏi xoáy..."



                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs outline-none"



                  />



                  <button



                    type="button"



                    onClick={() => {



                      if (!newProbeTopic.trim()) return;



                      setRubric((prev) => ({



                        ...prev,



                        mandatoryProbes: [



                          ...prev.mandatoryProbes,



                          {



                            id: `probe-${Date.now()}`,



                            chapterKeyword: newProbeKeyword.trim() || activeClass.code,



                            topic: newProbeTopic.trim(),



                          },



                        ],



                      }));



                      setNewProbeKeyword("");



                      setNewProbeTopic("");



                    }}



                    className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-3 py-2 text-xs font-bold cursor-pointer"



                  >



                    + Thêm



                  </button>



                </div>



              </div>



            </div>



            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">



              <button



                type="button"



                onClick={async () => {
                  const ok = await saveDefenseRubric(rubric);
                  if (!ok) {
                    notify("❌ Không thể lưu cấu hình Rubric lên máy chủ.");
                    return;
                  }
                  setRubricModalOpen(false);
                  notify("Đã cập nhật Rubric chấm điểm kép cho Hội đồng AI 3D.");
                }}



                className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"



              >



                Lưu Rubric



              </button>



            </div>



          </div>



        </div>



      )}



      {/* ====================================================================



          CLEAN MONOCHROME AI TEACHING CO-PILOT DRAWER



         ==================================================================== */}



      {/* Marlo Authentic AI Teaching Co-Pilot Drawer */}
      <MarloCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onReset={handleResetCopilot}
        courseCode={activeClass.code}
        courseName={activeClass.name}
        messages={copilotMessages}
        typing={copilotTyping}
        inputValue={copilotInput}
        onInputChange={setCopilotInput}
        onSendPrompt={(text) => {
          void triggerCopilotPrompt(text);
        }}
        quickPrompts={[
          "Soạn đề Lab + Test Cases mới",
          "Sinh 2 câu Quiz cho nhánh yếu",
          "Tóm tắt điểm yếu toàn lớp",
        ]}
      />



    </div>



  );



}




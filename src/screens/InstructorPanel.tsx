import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from "react";
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
  ArrowRight,
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
  WandSparkles,
  X,
} from "lucide-react";
import type { Screen } from "../App";
import InstructorStudentsTab from "../components/InstructorStudentsTab";
import {
  FALLBACK_INSTRUCTOR_SESSIONS,
  addInstructorTestCase,
  askInstructorCopilot,
  createInstructorChapter,
  createInstructorLesson,
  decideDualSubmission,
  deleteInstructorTestCase,
  ensureRoleSession,
  fetchDefenseRubric,
  fetchDualSubmissions,
  fetchInstructorCourses,
  fetchInstructorSessions,
  patchInstructorChapter,
  postInstructorSessionAction,
  saveDefenseRubric,
  saveInstructorLesson,
  saveInstructorMindmap,
  type InstructorSessionEvidence,
} from "../api";
import LiquidCardConnector from "../components/LiquidCardConnector";
import MarloActivityRing from "../components/MarloActivityRing";
import MarloCapacityBar from "../components/MarloCapacityBar";
import MarloNumber from "../components/MarloNumber";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloTitle from "../components/MarloTitle";
import MarloToast from "../components/MarloToast";
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
  type MasterMindmapNodeData,
  type QuizQuestion,
  type VideoScene,
} from "../data/instructorData";
import { CNTT_PROJECTS } from "./MarloProjectsScreen";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";

export type InstructorTab = "overview" | "syllabus" | "grading" | "students" | "mindmap" | "evidence";

interface InstructorPanelProps {
  currentSection?: Screen;
  onNavigate?: (screen: Screen) => void;
}

function sectionToTab(section?: Screen): InstructorTab {
  switch (section) {
    case "instructor-courses":
      return "syllabus";
    case "instructor-grading":
      return "grading";
    case "instructor-mindmap":
      return "mindmap";
    case "instructor-evidence":
      return "evidence";
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
    case "evidence":
      return "instructor-evidence";
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
              ? "bg-amber-500/10 text-[#8F5404] dark:text-amber-400 border border-amber-500/20"
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
}: InstructorPanelProps) {
  const [tab, setTab] = useState<InstructorTab>(() => sectionToTab(currentSection));
  const [classes, setClasses] = useState<CourseClass[]>(INITIAL_INSTRUCTOR_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(INITIAL_INSTRUCTOR_CLASSES[0].id);
  const [overviewScope, setOverviewScope] = useState<"class" | "all">("class");

  // Submissions & Rubric State
  const [submissions, setSubmissions] = useState<DualSubmissionRecord[]>(INITIAL_DUAL_SUBMISSIONS);
  const [rubric, setRubric] = useState<DefenseRubricConfig>(INITIAL_DEFENSE_RUBRIC);
  const [gradingFilter, setGradingFilter] = useState<"all" | "pending" | "flagged" | "graded">("all");
  const [selectedSubId, setSelectedSubId] = useState<string | null>(INITIAL_DUAL_SUBMISSIONS[0].id);
  const [gradeInput, setGradeInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [newProbeKeyword, setNewProbeKeyword] = useState("");
  const [newProbeTopic, setNewProbeTopic] = useState("");

  // Live Evidence State (pre-populated for zero-flicker badge & instant view)
  const [evidenceSessions, setEvidenceSessions] = useState<InstructorSessionEvidence[]>(
    FALLBACK_INSTRUCTOR_SESSIONS
  );
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "self" | "hint3" | "stuck">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    FALLBACK_INSTRUCTOR_SESSIONS[0]?.session_id || null
  );
  const [evidenceActions, setEvidenceActions] = useState<Record<string, string>>({});

  // Syllabus & AIGC Lesson Studio State
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [addingLessonChapterId, setAddingLessonChapterId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [activeLessonChapterId, setActiveLessonChapterId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [drawerTab, setDrawerTab] = useState<"upload" | "reading" | "video" | "quiz">("upload");
  const [editReading, setEditReading] = useState("");
  const [editScenes, setEditScenes] = useState<VideoScene[]>([]);
  const [editQuizzes, setEditQuizzes] = useState<QuizQuestion[]>([]);
  const [isAigcRunning, setIsAigcRunning] = useState(false);
  const [aigcStep, setAigcStep] = useState(0);

  // Test Case Configurator Modal State
  const [tcModalOpen, setTcModalOpen] = useState(false);
  const [tcChapterId, setTcChapterId] = useState<string | null>(null);
  const [tcAssignmentId, setTcAssignmentId] = useState<string | null>(null);
  const [newTcTitle, setNewTcTitle] = useState("");
  const [newTcInput, setNewTcInput] = useState("");
  const [newTcOutput, setNewTcOutput] = useState("");
  const [newTcEdgeCase, setNewTcEdgeCase] = useState(false);

  // Student Preview Modal State
  const [previewLesson, setPreviewLesson] = useState<{ chapterTitle: string; lesson: Lesson; assignment?: Assignment } | null>(null);
  const [previewTab, setPreviewTab] = useState<"reading" | "video" | "quiz" | "exercise">("reading");

  // Master Mindmap State
  const [selectedMindmapChapterId, setSelectedMindmapChapterId] = useState<string>(
    INITIAL_INSTRUCTOR_CLASSES[0].chapters[0].id
  );
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
      text: "Chào giảng viên! Tôi có thể hỗ trợ soạn đề Lab + Docker Test Cases, tạo bộ câu hỏi phản biện cho Hội đồng AI 3D hoặc phân tích nhánh kiến thức cả lớp đang yếu.",
      time: "Hệ thống",
    },
  ]);

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

  useMarloPageEntrance(panelRef);

  useEffect(() => {
    setTab(sectionToTab(currentSection));
  }, [currentSection]);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || classes[0],
    [classes, selectedClassId]
  );

  // Sync Mindmap chapter & nodes when class or mindmap chapter changes
  useEffect(() => {
    const firstChap = activeClass.chapters[0];
    if (firstChap && !activeClass.chapters.some((ch) => ch.id === selectedMindmapChapterId)) {
      setSelectedMindmapChapterId(firstChap.id);
    }
  }, [activeClass, selectedMindmapChapterId]);

  useEffect(() => {
    const ch = activeClass.chapters.find((item) => item.id === selectedMindmapChapterId);
    setNodes(ch?.mindmapNodes || []);
    setEdges(ch?.mindmapEdges || []);
    setSelectedNodeId(null);
  }, [activeClass, selectedMindmapChapterId, setNodes, setEdges]);

  // Hydrate Courses, Dual Submissions, Rubric & Live Evidence Sessions from FastAPI
  const loadEvidence = useCallback(async () => {
    setEvidenceLoading(true);
    await ensureRoleSession("instructor");
    const [sessData, apiCourses, apiSubs, apiRubric] = await Promise.all([
      fetchInstructorSessions(),
      fetchInstructorCourses(),
      fetchDualSubmissions(),
      fetchDefenseRubric(),
    ]);
    if (apiCourses && apiCourses.length > 0) {
      setClasses(apiCourses);
    }
    if (apiSubs && apiSubs.length > 0) {
      setSubmissions(apiSubs);
    }
    if (apiRubric) {
      setRubric(apiRubric);
    }
    setEvidenceSessions(sessData);
    setSelectedSessionId((prev) => prev || sessData[0]?.session_id || null);
    setEvidenceLoading(false);
  }, []);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll(".marlo-card");
    if (cards.length > 0) {
      animateMarloCards(cards, { stagger: 0.04, y: 16 });
    }
    const rows = contentRef.current.querySelectorAll(".marlo-row");
    if (rows.length > 0) {
      animateMarloRows(rows, { y: 10, stagger: 0.02, delay: 0.12 });
    }
  }, [tab, selectedClassId]);

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
    const list = submissions.filter((s) => s.classId === selectedClassId || overviewScope === "all");
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
        : submissions.filter((s) => s.classId === selectedClassId);

    const gradedCount = scopeSubs.filter((s) => s.status === "graded").length;
    const pendingCount = scopeSubs.filter(
      (s) => s.status === "pending" || s.status === "redefense_requested"
    ).length;
    const flaggedCount = scopeSubs.filter(
      (s) => s.status === "flagged" || hasDiscrepancy(s, rubric)
    ).length;

    const studentCount =
      overviewScope === "all"
        ? classes.reduce((sum, c) => sum + c.studentCount, 0)
        : activeClass.studentCount;

    const avgCompletion =
      overviewScope === "all"
        ? Math.round(classes.reduce((sum, c) => sum + c.avgProgressPct, 0) / classes.length)
        : activeClass.avgProgressPct;

    const totalSessions = evidenceSessions.length || 6;
    const selfSolved = evidenceSessions.filter((e) => e.max_hint_level <= 1).length;
    const hint3Count = evidenceSessions.filter((e) => e.max_hint_level === 3).length;
    const normalProgress = Math.max(0, totalSessions - selfSolved - hint3Count);

    const projectsDone = CNTT_PROJECTS.filter((p) => p.status === "delivered").length;
    const projectsActive = CNTT_PROJECTS.filter(
      (p) => p.status === "active" || p.status === "review"
    ).length;
    const projectsPlan = CNTT_PROJECTS.filter((p) => p.status === "planning").length;

    return {
      studentCount,
      avgCompletion,
      gradedCount,
      pendingCount,
      flaggedCount,
      totalSubs: scopeSubs.length,
      selfSolved,
      normalProgress,
      hint3Count,
      projectsDone,
      projectsActive,
      projectsPlan,
    };
  }, [overviewScope, submissions, selectedClassId, rubric, classes, activeClass, evidenceSessions]);

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
    await decideDualSubmission(activeSubmission.id, {
      action: "approve",
      final_score: score,
      instructor_feedback: feedbackText,
    });
    notify(`Đã phê duyệt ${score}/100 cho ${activeSubmission.studentName}.`);
  };

  const handleRequestRedefense = async () => {
    if (!activeSubmission) return;
    const feedbackText =
      feedbackInput.trim() ||
      "Yêu cầu bảo vệ lại trực tiếp trên Phòng Phản Biện AI 3D để xác minh năng lực thực tế.";
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
    await decideDualSubmission(activeSubmission.id, {
      action: "redefense",
      instructor_feedback: feedbackText,
    });
    notify(`Đã gửi yêu cầu bảo vệ lại 3D AI cho ${activeSubmission.studentName}.`);
  };

  // --- SYLLABUS & TEST CASE ACTIONS ---
  const toggleChapterStatus = async (chapterId: string) => {
    const ch = activeClass.chapters.find((item) => item.id === chapterId);
    const nextStatus = ch?.status === "Đã phát hành" ? "Bản nháp" : "Đã phát hành";
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
    await patchInstructorChapter(selectedClassId, chapterId, { status: nextStatus });
    notify("Đã cập nhật trạng thái phát hành chương học.");
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    const titleTrim = newChapterTitle.trim();
    const res = await createInstructorChapter(selectedClassId, titleTrim);
    const newChapterObj = res?.chapter || {
      id: `ch-${Date.now()}`,
      title: titleTrim,
      status: "Bản nháp" as const,
      mindmapGenerated: false,
      lessons: [],
      assignments: [
        {
          id: `lab-${Date.now()}`,
          type: "code_lab" as const,
          title: `Bài tập thực hành Docker: ${titleTrim}`,
          description: "Sinh viên nộp repo GitHub để chấm tự động qua Docker Sandbox & Phản biện AI.",
          isRequired: true,
          points: 100,
          dockerImage: "codemind/cpp20-sandbox:latest",
          testCases: [],
        },
      ],
    };
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
    notify("Đã thêm chương học mới vào học phần.");
  };

  const handleAddLesson = async (chapterId: string) => {
    if (!newLessonTitle.trim()) return;
    const titleTrim = newLessonTitle.trim();
    const res = await createInstructorLesson(selectedClassId, chapterId, titleTrim);
    const newLesson: Lesson = res?.lesson || {
      id: `lesson-${Date.now()}`,
      title: titleTrim,
      duration: "12 phút",
      status: "Bản nháp",
      isGenerated: false,
      documents: [],
      content: { reading: "", videoScenes: [], quizzes: [] },
    };
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
    notify("Đã tạo bài học mới.");
  };

  const openLessonStudio = (chapterId: string, lesson: Lesson) => {
    setActiveLessonChapterId(chapterId);
    setSelectedLesson(lesson);
    setEditReading(lesson.content.reading);
    setEditScenes(lesson.content.videoScenes);
    setEditQuizzes(lesson.content.quizzes);
    setDrawerTab(lesson.isGenerated ? "reading" : "upload");
    setLessonModalOpen(true);
  };

  const attachLessonDocument = (docName: string, size: string) => {
    if (!selectedLesson || !activeLessonChapterId) return;
    const file = {
      name: docName,
      size,
      uploadedAt: new Date().toLocaleDateString("vi-VN"),
    };
    const updatedLesson: Lesson = { ...selectedLesson, documents: [file] };
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
    notify(`Đã đính kèm tài liệu "${docName}".`);
  };

  const runLessonAigc = () => {
    if (!selectedLesson || !activeLessonChapterId) return;
    setIsAigcRunning(true);
    setAigcStep(1);
    const timer = setInterval(() => {
      setAigcStep((prev) => {
        if (prev >= 4) {
          clearInterval(timer);
          const genReading = `Tóm tắt học thuật chuẩn hóa cho bài "${selectedLesson.title}":\n\n1. Nguyên lý kiến trúc và lý do tồn tại của cơ chế này trong thực tế.\n2. Quy tắc viết mã an toàn, phòng tránh lỗi biên (Edge Cases).\n3. Bài học chuẩn bị cho kiểm thử Docker Sandbox & Vấn đáp AI 3D.`;
          const genScenes: VideoScene[] = [
            {
              id: "ai-s1",
              title: "Phân cảnh 1: Đặt vấn đề",
              text: selectedLesson.title,
              script: `Xin chào các bạn, hôm nay chúng ta sẽ đi sâu vào bản chất của ${selectedLesson.title}.`,
            },
            {
              id: "ai-s2",
              title: "Phân cảnh 2: Demo & Edge Case",
              text: "Các lỗi biên thường gặp khi chạy Docker Test",
              script: "Hãy chú ý kiểm tra điều kiện biên trước khi nộp bài lên hệ thống CI/CD.",
            },
          ];
          const genQuizzes: QuizQuestion[] = [
            {
              id: `q-${Date.now()}`,
              question: `Trọng tâm cần chú ý nhất trong bài "${selectedLesson.title}" là gì?`,
              options: [
                "Kiểm soát điều kiện biên & vòng đời bộ nhớ",
                "Chỉ cần chạy đúng trên một bộ test mẫu",
                "Bỏ qua cảnh báo của trình biên dịch",
                "Gộp toàn bộ logic vào một hàm main",
              ],
              answer: "Kiểm soát điều kiện biên & vòng đời bộ nhớ",
            },
          ];
          const nextLesson: Lesson = {
            ...selectedLesson,
            isGenerated: true,
            status: "Đã phát hành",
            content: { reading: genReading, videoScenes: genScenes, quizzes: genQuizzes },
          };
          setEditReading(genReading);
          setEditScenes(genScenes);
          setEditQuizzes(genQuizzes);
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
          void saveInstructorLesson(
            selectedClassId,
            activeLessonChapterId,
            selectedLesson.id,
            nextLesson
          );
          notify("AI đã biên soạn xong Bài đọc, Video Script và Quiz.");
          return 4;
        }
        return prev + 1;
      });
    }, 450);
  };

  const saveLessonEdits = async () => {
    if (!selectedLesson || !activeLessonChapterId) return;
    const nextContent = {
      reading: editReading,
      videoScenes: editScenes,
      quizzes: editQuizzes,
    };
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
                      lessons: ch.lessons.map((l) =>
                        l.id === selectedLesson.id
                          ? {
                              ...l,
                              content: nextContent,
                            }
                          : l
                      ),
                    }
              ),
            }
      )
    );
    await saveInstructorLesson(
      selectedClassId,
      activeLessonChapterId,
      selectedLesson.id,
      { content: nextContent }
    );
    setLessonModalOpen(false);
    notify("Đã lưu thay đổi nội dung bài học.");
  };

  // --- TEST CASE CONFIGURATOR ACTIONS ---
  const activeTcAssignment = useMemo(() => {
    if (!tcChapterId || !tcAssignmentId) return null;
    const ch = activeClass.chapters.find((c) => c.id === tcChapterId);
    return ch?.assignments.find((a) => a.id === tcAssignmentId) || null;
  }, [activeClass, tcChapterId, tcAssignmentId]);

  const openTestCaseModal = (chapterId: string, assignmentId: string) => {
    setTcChapterId(chapterId);
    setTcAssignmentId(assignmentId);
    setTcModalOpen(true);
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
                      assignments: ch.assignments.map((a) =>
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
    if (!newTcTitle.trim() || !newTcOutput.trim()) {
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
    const res = tcChapterId
      ? await addInstructorTestCase(selectedClassId, tcChapterId, draft)
      : null;
    const savedTc: DockerTestCase = res?.testCase || draft;
    updateAssignmentTestCases((cases) => [...cases, savedTc]);
    setNewTcTitle("");
    setNewTcInput("");
    setNewTcOutput("");
    setNewTcEdgeCase(false);
    notify("Đã thêm Unit Test Case vào Docker Sandbox.");
  };

  // --- MASTER MINDMAP ACTIONS ---
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
          },
          eds
        )
      );
      notify("Đã nối nhánh mới trên Master Graph.");
    },
    [setEdges]
  );

  const handleAddMindmapNode = (nodeType: "branch" | "leaf") => {
    const id = `mm-${Date.now()}`;
    const nextNode: Node<MasterMindmapNodeData> = {
      id,
      type: "masterMindmapNode",
      position: { x: nodeType === "branch" ? 350 : 660, y: 120 + (nodes.length % 4) * 85 },
      data: {
        title: nodeType === "branch" ? "Chủ đề nhánh mới" : "Khái niệm chi tiết mới",
        summary: "Chỉnh sửa mô tả và liên kết kiến thức ở bảng bên phải.",
        tag: nodeType === "branch" ? "Branch" : "Concept",
        nodeType,
        masteryPct: 70,
      },
    };
    setNodes((nds) => [...nds, nextNode]);
    setSelectedNodeId(id);
    notify("Đã thêm nút mới vào Master Mindmap.");
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
  };

  const handleSaveMasterGraph = async () => {
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
    await saveInstructorMindmap(selectedClassId, selectedMindmapChapterId, nodes, edges);
    notify("Đã lưu Sơ đồ Master Graph cho học viên đối chiếu.");
  };

  const handleGenerateMindmapAI = () => {
    setIsMindmapGenerating(true);
    setMindmapStep(1);
    const timer = setInterval(() => {
      setMindmapStep((prev) => {
        if (prev >= 3) {
          clearInterval(timer);
          const ch = activeClass.chapters.find((c) => c.id === selectedMindmapChapterId);
          const rootId = `ai-root-${Date.now()}`;
          const genNodes: Node<MasterMindmapNodeData>[] = [
            {
              id: rootId,
              type: "masterMindmapNode",
              position: { x: 40, y: 155 },
              data: {
                title: ch?.title || "Chủ đề chương",
                summary: "Master Graph tổng hợp tự động từ giáo trình",
                tag: `${activeClass.code} · ROOT`,
                nodeType: "root",
                masteryPct: activeClass.avgProgressPct,
                xp: 200,
              },
            },
            ...(ch?.lessons || []).map((l, idx) => ({
              id: `ai-b-${idx}`,
              type: "masterMindmapNode",
              position: { x: 355, y: 40 + idx * 140 },
              data: {
                title: l.title,
                summary: l.content.reading
                  ? l.content.reading.slice(0, 95) + "..."
                  : "Trọng tâm bài giảng & kiểm thử thực hành",
                tag: `Bài ${idx + 1}`,
                nodeType: "branch" as const,
                masteryPct: idx === 1 ? 54 : 80,
              },
            })),
          ];
          const genEdges: Edge[] = (ch?.lessons || []).map((_, idx) => ({
            id: `ai-e-${idx}`,
            source: rootId,
            target: `ai-b-${idx}`,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
          }));
          setNodes(genNodes);
          setEdges(genEdges);
          setIsMindmapGenerating(false);
          notify("AI đã dựng xong Master Mindmap đơn sắc chuẩn cho chương học.");
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
      let reply = `Tôi đã phân tích dữ liệu lớp ${activeClass.code}. Đề xuất hành động tiếp theo:\n• Mở rộng bộ Docker Edge-case Test cho chương hiện tại.\n• Thêm câu hỏi phản biện bắt buộc trong Rubric Hội đồng AI 3D để lọc các bài nộp nghi copy code.`;
      if (clean.toLowerCase().includes("quiz") || clean.toLowerCase().includes("nhánh yếu")) {
        reply = `Đề xuất 2 câu Quiz bổ trợ cho nhánh kiến thức lớp đang yếu (< 60%):\n1. Khi delete Base* trỏ tới Derived trong C++, điều kiện nào đảm bảo Destructor lớp con được gọi?\n   → Đáp án: ~Base() phải được khai báo virtual.\n2. Vì sao truyền Base obj theo giá trị gây mất tính đa hình?\n   → Đáp án: Trình biên dịch sao chép phần Base và đặt vptr trỏ về vtable của Base (Object Slicing).`;
      } else if (clean.toLowerCase().includes("lab") || clean.toLowerCase().includes("test case")) {
        reply = `Đề xuất bộ Test Case Docker cho ${activeClass.code}:\n• TC Biên 1: Con trỏ null / input rỗng không gây crash (Exit 0).\n• TC Biên 2: Valgrind kiểm tra rò rỉ bộ nhớ = 0 bytes.\n• Câu hỏi AI Defense đi kèm: "Giải thích sự khác biệt giữa liên kết tĩnh và dynamic dispatch tại dòng gọi hàm ảo."`;
      }
      setCopilotMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, time: "AI Co-Pilot" },
      ]);
      setCopilotTyping(false);
    }, 550);
  };

  // Filtered live evidence sessions
  const filteredEvidence = useMemo(() => {
    if (evidenceFilter === "self") {
      return evidenceSessions.filter((s) => s.max_hint_level <= 1 && s.status === "completed");
    }
    if (evidenceFilter === "hint3") {
      return evidenceSessions.filter((s) => s.max_hint_level === 3);
    }
    if (evidenceFilter === "stuck") {
      return evidenceSessions.filter((s) => s.status === "stuck");
    }
    return evidenceSessions;
  }, [evidenceSessions, evidenceFilter]);

  const activeEvidence = useMemo(
    () =>
      evidenceSessions.find((s) => s.session_id === selectedSessionId) ||
      filteredEvidence[0] ||
      null,
    [evidenceSessions, selectedSessionId, filteredEvidence]
  );

  return (
    <div
      ref={panelRef}
      className="min-h-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-7 pb-20 relative flex flex-col select-none"
    >
      {/* Marlo Floating Toast */}
      {toastMsg && <MarloToast message={toastMsg} showUndo={false} />}

      {/* ─── CARD 1: UNIFIED INSTRUCTOR SHELL HEADER ────────────────────────── */}
      <header className="marlo-card relative z-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              CodeMind Teaching OS
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <select
              aria-label="Chọn lớp học phần"
              value={selectedClassId}
              onChange={(e) => handleClassSelect(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.studentCount} HV)
                </option>
              ))}
            </select>
          </div>
          <MarloTitle
            text="Không gian Giảng viên & Thẩm định Socratic"
            className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Đồng bộ 1-1 với học viên: Quản lý giáo trình, Docker CI/CD Test Cases, Hội đồng Phản biện AI 3D và Bằng chứng tự học.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <GraduationCap size={14} className="text-slate-500 dark:text-slate-400" />
            <span>{activeClass.semester}</span>
          </span>

          <button
            type="button"
            onClick={() => onNavigate?.("defense-room")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer shadow-2xs"
          >
            <ShieldCheck size={14} className="text-[#EE8420]" />
            <span>Phòng Phản biện 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] dark:hover:bg-white px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <WandSparkles size={14} />
            <span>AI Teaching Co-Pilot</span>
          </button>
        </div>
      </header>

      {/* Seamless Connector 1 */}
      <LiquidCardConnector />

      {/* ─── CARD 2: FLOATING SEGMENTED TAB BAR ─────────────────────────────── */}
      <div className="relative z-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <MarloSegmentedControl<InstructorTab>
          value={tab}
          onChange={handleTabSwitch}
          options={[
            { id: "overview", label: "Tổng quan lớp", icon: <Columns3 size={14} /> },
            { id: "syllabus", label: "Giáo trình & Test Cases", icon: <BookOpen size={14} />, badge: activeClass.chapters.length },
            { id: "grading", label: "Chấm CI/CD & Phản biện AI", icon: <ShieldCheck size={14} />, badge: overviewStats.pendingCount + overviewStats.flaggedCount },
            { id: "students", label: "Học viên & Đánh giá", icon: <Users size={14} /> },
            { id: "mindmap", label: "Master Mindmap", icon: <Network size={14} /> },
            { id: "evidence", label: "Bằng chứng Tự học", icon: <History size={14} />, badge: evidenceSessions.length },
          ]}
        />

        <div className="hidden xl:flex items-center gap-2.5 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            Trọng số hiện hành: CI/CD {rubric.cicdWeightPct}% · Phản biện AI {rubric.defenseWeightPct}%
          </span>
        </div>
      </div>

      {/* Seamless Connector 2 */}
      <LiquidCardConnector />

      {/* ─── TAB CONTENT BODY ───────────────────────────────────────────────── */}
      <div ref={contentRef} key={tab} className="relative z-10 space-y-5">
        {/* ====================================================================
            TAB 1: INSTRUCTOR OVERVIEW (MIRRORS StudentDashboard)
           ==================================================================== */}
        {tab === "overview" && (
          <div className="animate-screen-enter space-y-5">
            {/* Scope Toggle Bar */}
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  {overviewScope === "class" ? `${activeClass.code} · ${activeClass.name}` : "Tổng hợp 6 Học phần CNTT"}
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
                  { id: "all", label: "Toàn bộ 6 lớp" },
                ]}
              />
            </div>

            {/* Top Grid: MarloActivityRing + Where the class stands */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-5">
                <MarloActivityRing
                  title="Tỷ lệ hoàn thành chương & bài tập"
                  subtitle={
                    overviewScope === "class"
                      ? `Tổng hợp lớp ${activeClass.code} tuần hiện tại`
                      : "Tổng hợp trung bình 6 lớp học phần"
                  }
                  actionText="Mở Chấm điểm"
                  onAction={() => handleTabSwitch("grading")}
                  centerValue={overviewStats.avgCompletion}
                  centerLabel="hoàn thành"
                  segments={[
                    { id: "wait", label: "Chưa nộp", value: 14, count: Math.max(2, Math.round(overviewStats.studentCount * 0.14)), color: "#cbd5e1" },
                    { id: "review", label: "Chờ duyệt kép", value: Math.max(12, overviewStats.pendingCount * 6), count: overviewStats.pendingCount + overviewStats.flaggedCount, color: "#64748b" },
                    { id: "moving", label: "Đang thực hành", value: 24, count: Math.round(overviewStats.studentCount * 0.24), color: "#f97316" },
                    { id: "done", label: "Đã đạt chuẩn", value: overviewStats.avgCompletion, count: Math.round((overviewStats.studentCount * overviewStats.avgCompletion) / 100), color: "#1e293b" },
                  ]}
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
                      total: CNTT_PROJECTS.length,
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
                  title="Phân bổ năng lực tự học theo Bằng chứng Socratic"
                  subtitle="Thống kê theo cấp độ sử dụng gợi ý AI và kết quả Unit Test"
                  totalLabel="phiên học"
                  className="bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/70"
                  items={[
                    { id: "self", label: "Tự lực (>=80% / Hint <=1)", count: overviewStats.selfSolved, color: "#14161a" },
                    { id: "prog", label: "Đang hoàn thiện", count: overviewStats.normalProgress, color: "#64748b" },
                    { id: "stuck", label: "Dùng Hint mức 3 / Kẹt", count: overviewStats.hint3Count, color: "#EE8420" },
                  ]}
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
                      Học viên cần hỗ trợ & Xác minh Socratic
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Phát hiện tự động từ chênh lệch điểm CI/CD vs Phản biện 3D và nhật ký Hint Nấc 3.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabSwitch("evidence")}
                    className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem Evidence</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: "help-1",
                      name: "Nguyễn Minh Khôi",
                      code: "2210866",
                      reason: "Pass CI/CD 5/5 nhưng điểm Phản biện AI 3D chỉ đạt 48/100 (Nghi copy code)",
                      actionTarget: "grading" as InstructorTab,
                    },
                    {
                      id: "help-2",
                      name: "Võ Ngọc Hà",
                      code: "2210851",
                      reason: "Mở tới Hint Nấc 3 ở bài vtable & đang kẹt 2/5 test biên (Object Slicing)",
                      actionTarget: "evidence" as InstructorTab,
                    },
                    {
                      id: "help-3",
                      name: "Võ Nhật Huy",
                      code: "2210815",
                      reason: "Sát ngưỡng TLE Stress Test 100k đỉnh ở bài Dijkstra (dùng Hint Nấc 3)",
                      actionTarget: "evidence" as InstructorTab,
                    },
                  ].map((st) => (
                    <div
                      key={st.id}
                      className="marlo-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {st.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {st.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                          {st.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTabSwitch(st.actionTarget)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          type="button"
                          disabled={sentReminders[st.id]}
                          onClick={() => {
                            setSentReminders((prev) => ({ ...prev, [st.id]: true }));
                            notify(`Đã gửi nhắc nhở Socratic tới học viên ${st.name}.`);
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                            sentReminders[st.id]
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                              : "bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619]"
                          }`}
                        >
                          {sentReminders[st.id] ? "Đã nhắc" : "Nhắc nhở Socratic"}
                        </button>
                      </div>
                    </div>
                  ))}
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
                  {CNTT_PROJECTS.slice(0, 4).map((prj) => {
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
            {activeClass.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden"
              >
                {/* Chapter Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {chapter.title}
                      </h2>
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
                      {chapter.lessons.length} bài học · {chapter.assignments.length} bài tập thực hành Docker
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
                    {chapter.lessons.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">
                        Chưa có bài học nào trong chương này.
                      </div>
                    ) : (
                      chapter.lessons.map((lesson) => (
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
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  lesson.isGenerated
                                    ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                    : "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400"
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

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewLesson({
                                  chapterTitle: chapter.title,
                                  lesson,
                                  assignment: chapter.assignments[0],
                                });
                                setPreviewTab("reading");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                            >
                              <Eye size={13} />
                              <span>Xem thử góc nhìn Học viên</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openLessonStudio(chapter.id, lesson)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-3 py-1.5 text-xs font-bold transition cursor-pointer"
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
                    {chapter.assignments.map((assign) => (
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
          </div>
        )}

        {/* ====================================================================
            TAB 4: MONOCHROME MASTER MINDMAP & CLASS MASTERY COMPARISON
           ==================================================================== */}
        {tab === "mindmap" && (
          <div className="animate-screen-enter space-y-4">
            {/* Mindmap Control Bar */}
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Chọn chương sơ đồ"
                  value={selectedMindmapChapterId}
                  onChange={(e) => setSelectedMindmapChapterId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  {activeClass.chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>

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

        {/* ====================================================================
            TAB 5: LIVE LEARNING EVIDENCE (SOCRATIC SESSIONS TELEMETRY)
           ==================================================================== */}
        {tab === "evidence" && (
          <div className="animate-screen-enter space-y-4">
            {/* Toolbar */}
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <MarloSegmentedControl<"all" | "self" | "hint3" | "stuck">
                size="sm"
                value={evidenceFilter}
                onChange={setEvidenceFilter}
                options={[
                  { id: "all", label: "Tất cả phiên học" },
                  { id: "self", label: "Tự lực giải quyết" },
                  { id: "hint3", label: "Dùng Hint mức 3" },
                  { id: "stuck", label: "Đang kẹt / Cần hỗ trợ" },
                ]}
              />

              <button
                type="button"
                onClick={() => void loadEvidence()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw size={13} className={evidenceLoading ? "animate-spin" : ""} />
                <span>Đồng bộ Telemetry</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Session Cards List */}
              <div className="lg:col-span-7 space-y-2.5">
                {filteredEvidence.map((sess) => {
                  const isActive = activeEvidence?.session_id === sess.session_id;
                  return (
                    <div
                      key={sess.session_id}
                      onClick={() => setSelectedSessionId(sess.session_id)}
                      className={`marlo-card marlo-row rounded-2xl border p-4 cursor-pointer transition space-y-2.5 ${
                        isActive
                          ? "border-[#141619] dark:border-white bg-slate-50/70 dark:bg-slate-900/90 shadow-xs"
                          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sess.display_name}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-400">
                            {sess.student_code} · {sess.course_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                              sess.max_hint_level === 0
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : sess.max_hint_level <= 2
                                ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                : "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400"
                            }`}
                          >
                            {sess.max_hint_level === 0
                              ? "Không dùng Hint"
                              : `Mở tới Hint Nấc ${sess.max_hint_level}`}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-500">
                            Bước {sess.current_step_no}/6
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {sess.title}
                      </div>

                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-2.5 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        "{sess.socratic_note}"
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                        <span>
                          Auto-Test: <strong className="text-slate-900 dark:text-white">{sess.passed_count}/{sess.total_tests} pass</strong>
                        </span>
                        <span>Thời lượng: {sess.time_spent_min} phút</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Detailed Evidence Timeline */}
              {activeEvidence && (
                <aside className="lg:col-span-5 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Nhật ký Tư duy Socratic · teacher_visibility = {activeEvidence.teacher_visibility}
                    </div>
                    <h3 className="text-base font-black text-slate-950 dark:text-white mt-0.5">
                      {activeEvidence.display_name} — {activeEvidence.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Ghi chú tự phản tư: "{activeEvidence.socratic_note}"
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {activeEvidence.step_logs.map((log, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Bước {log.step}: {log.label}
                          </span>
                          <span className="font-mono text-[10.5px] text-slate-400">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{log.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceActions((prev) => ({
                          ...prev,
                          [activeEvidence.session_id]: "xp",
                        }));
                        void postInstructorSessionAction(
                          activeEvidence.session_id,
                          "award_xp",
                          "Thưởng +25 XP Tự lực"
                        );
                        notify(`Đã gửi lời khen & +25 XP tự lực tới ${activeEvidence.display_name}.`);
                      }}
                      className="flex-1 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] py-2.5 px-3 text-xs font-bold transition cursor-pointer"
                    >
                      {evidenceActions[activeEvidence.session_id] === "xp"
                        ? "Đã gửi +25 XP"
                        : "Gửi động viên (+25 XP)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceActions((prev) => ({
                          ...prev,
                          [activeEvidence.session_id]: "reading",
                        }));
                        void postInstructorSessionAction(
                          activeEvidence.session_id,
                          "assign_reading",
                          "Giao tài liệu bổ trợ"
                        );
                        notify(`Đã đính kèm bài đọc bổ trợ cho ${activeEvidence.display_name}.`);
                      }}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    >
                      Gửi bài đọc bổ trợ
                    </button>
                  </div>
                </aside>
              )}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Biên soạn Bài học AIGC
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedLesson.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ch = activeClass.chapters.find((c) => c.id === activeLessonChapterId);
                    setPreviewLesson({
                      chapterTitle: ch?.title || activeClass.name,
                      lesson: {
                        ...selectedLesson,
                        content: {
                          reading: editReading,
                          videoScenes: editScenes,
                          quizzes: editQuizzes,
                        },
                      },
                      assignment: ch?.assignments[0],
                    });
                    setPreviewTab("reading");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Xem thử Học viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center">
              <MarloSegmentedControl<"upload" | "reading" | "video" | "quiz">
                size="sm"
                className="w-full"
                value={drawerTab}
                onChange={setDrawerTab}
                options={[
                  { id: "upload", label: "1. Tài liệu & AI" },
                  { id: "reading", label: "2. Bài đọc" },
                  { id: "video", label: "3. Video Script" },
                  { id: "quiz", label: "4. Bộ Quiz" },
                ]}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {drawerTab === "upload" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center space-y-2">
                    <Upload size={22} className="mx-auto text-slate-400" />
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedLesson.documents[0]
                        ? `Đang dùng tài liệu: ${selectedLesson.documents[0].name}`
                        : "Chọn tài liệu giáo trình để AI biên soạn bài giảng"}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          attachLessonDocument(`${activeClass.code}_Slide_Chuan.pdf`, "480 KB")
                        }
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        Đính kèm Slide Chuẩn
                      </button>
                      <button
                        type="button"
                        onClick={runLessonAigc}
                        disabled={isAigcRunning}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        {isAigcRunning ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Đang biên soạn ({aigcStep}/4)...</span>
                          </>
                        ) : (
                          <>
                            <WandSparkles size={13} />
                            <span>Kích hoạt AI biên soạn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "reading" && (
                <textarea
                  rows={12}
                  value={editReading}
                  onChange={(e) => setEditReading(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3.5 text-xs leading-6 text-slate-800 dark:text-slate-200 outline-none"
                  placeholder="Nội dung bài đọc cho học viên..."
                />
              )}

              {drawerTab === "video" && (
                <div className="space-y-3">
                  {editScenes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Chưa có kịch bản phân cảnh. Chạy AI biên soạn ở tab 1 để tự sinh script.
                    </p>
                  ) : (
                    editScenes.map((scene, idx) => (
                      <div
                        key={scene.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-2"
                      >
                        <div className="text-[11px] font-bold text-slate-500">
                          Phân cảnh {idx + 1}: {scene.title}
                        </div>
                        <input
                          type="text"
                          value={scene.text}
                          onChange={(e) =>
                            setEditScenes((prev) =>
                              prev.map((s) =>
                                s.id === scene.id ? { ...s, text: e.target.value } : s
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                        />
                        <textarea
                          rows={2}
                          value={scene.script}
                          onChange={(e) =>
                            setEditScenes((prev) =>
                              prev.map((s) =>
                                s.id === scene.id ? { ...s, script: e.target.value } : s
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === "quiz" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditQuizzes((prev) => [
                        ...prev,
                        {
                          id: `q-${Date.now()}`,
                          question: "Câu hỏi kiểm tra mới...",
                          options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
                          answer: "Phương án A",
                        },
                      ])
                    }
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    + Thêm câu hỏi Quiz
                  </button>
                  {editQuizzes.map((q, qi) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2"
                    >
                      <div className="text-[11px] font-bold text-slate-500">Câu hỏi {qi + 1}</div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) =>
                          setEditQuizzes((prev) =>
                            prev.map((item) =>
                              item.id === q.id ? { ...item, question: e.target.value } : item
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLessonModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={saveLessonEdits}
                className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Lưu bài học
              </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[86vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden"
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
              <div className="space-y-2">
                {(activeTcAssignment.testCases || []).map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 flex items-start justify-between gap-3"
                  >
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
                        onClick={() =>
                          updateAssignmentTestCases((cases) =>
                            cases.map((item) =>
                              item.id === tc.id ? { ...item, isEdgeCase: !item.isEdgeCase } : item
                            )
                          )
                        }
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10.5px] font-semibold cursor-pointer"
                      >
                        {tc.isEdgeCase ? "Tắt Edge" : "Đặt Edge"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateAssignmentTestCases((cases) => cases.filter((i) => i.id !== tc.id));
                          if (tcChapterId) {
                            void deleteInstructorTestCase(selectedClassId, tcChapterId, tc.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Xóa Test Case"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
                onClick={() => {
                  setTcModalOpen(false);
                  notify("Đã lưu cấu hình Test Cases vào Sandbox CI/CD.");
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
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-xs leading-6 text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {previewLesson.lesson.content.reading || "Bài học này chưa có nội dung bài đọc."}
                </div>
              )}

              {previewTab === "video" && (
                <div className="space-y-3">
                  {previewLesson.lesson.content.videoScenes.length === 0 ? (
                    <p className="text-xs text-slate-400">Chưa có kịch bản video.</p>
                  ) : (
                    previewLesson.lesson.content.videoScenes.map((sc) => (
                      <div
                        key={sc.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5"
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {sc.title} — {sc.text}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{sc.script}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {previewTab === "quiz" && (
                <div className="space-y-3">
                  {previewLesson.lesson.content.quizzes.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Câu {idx + 1}: {q.question}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              opt === q.answer
                                ? "border-[#141619] dark:border-white font-bold bg-slate-50 dark:bg-slate-900"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  setPreviewLesson(null);
                  onNavigate?.("workspace");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
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
                onClick={() => {
                  setRubricModalOpen(false);
                  void saveDefenseRubric(rubric);
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
      {!isCopilotOpen && (
        <button
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-4 py-3 text-xs font-bold shadow-lg border border-black/10 transition cursor-pointer"
        >
          <Bot size={16} />
          <span>AI Co-Pilot Giảng viên</span>
        </button>
      )}

      {isCopilotOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[92vw] h-[480px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14161F] shadow-2xl flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#141619] text-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Bot size={16} />
              <span className="text-xs font-bold">AI Teaching Co-Pilot ({activeClass.code})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCopilotOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
            {[
              "Soạn đề Lab + Test Cases mới",
              "Sinh 2 câu Quiz cho nhánh yếu",
              "Tóm tắt điểm yếu toàn lớp",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => triggerCopilotPrompt(q)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {copilotMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                  msg.sender === "user"
                    ? "ml-6 bg-[#141619] text-white dark:bg-white dark:text-[#141619]"
                    : "mr-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {copilotTyping && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                <span>AI Co-Pilot đang phân tích lớp...</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerCopilotPrompt(copilotInput);
            }}
            className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Nhờ AI soạn đề, quiz hoặc nhận xét..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-3 py-2 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

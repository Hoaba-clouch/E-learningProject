import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MarloSelect from "../components/MarloSelect";
import gsap from "gsap";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  FolderGit2,
  FolderKanban,
  GitFork,
  HelpCircle,
  Mic,
  MicOff,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Role, Screen } from "../App";
import {
  completeDefenseSession,
  decideDualSubmission,
  deleteDefenseSessionApi,
  fetchDefenseProjectDossierApi,
  fetchDefenseWorkspaceApi,
  generatePracticeQuestionsApi,
  respondDefenseRound,
  saveDefenseRubric,
  startDefenseSession,
  toggleCourseDefenseApi,
  type DefenseCourseToggleItem,
  type DefenseDualSubmissionItem,
  type DefenseProjectDossier,
  type DefenseProjectOption,
  type DefenseSessionRecord,
  type DefenseTranscriptEntry,
  type DefenseWorkspaceBundle,
} from "../api";
import type { DefenseRubricConfig } from "../data/instructorData";
import {
  DEFAULT_JURY,
  getDefenseRoundsForProject,
  type DefenseRound,
} from "../data/defenseScenarios";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloTitle from "../components/MarloTitle";
import MarloToast from "../components/MarloToast";
import DefensePackagePanel from "../components/defense/DefensePackagePanel";
import LiveCouncilCockpit from "../components/defense/LiveCouncilCockpit";
import OfficialDefenseResultView from "../components/defense/OfficialDefenseResultView";

interface Props {
  role?: Role;
  onNavigate?: (screen: Screen) => void;
  initialProjectId?: string;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenKanban?: (projectId: string) => void;
  onOpenGitHub?: (projectId: string) => void;
  onOpenSchedule?: () => void;
}

type StudentTab = "dossier" | "practice" | "official" | "history";
type StaffTab = "council" | "courses" | "sessions" | "queue" | "rubric";

const DEFAULT_RUBRIC: DefenseRubricConfig = {
  cicdWeightPct: 60,
  defenseWeightPct: 40,
  strictAntiCopyGuardrail: true,
  autoFlagDiscrepancyThreshold: 25,
  mandatoryProbes: [],
};

function safeHttpUrl(url?: string | null): string | null {
  const clean = (url || "").trim();
  return /^https?:\/\//i.test(clean) ? clean : null;
}

function getSubmissionBadge(status: string): { label: string; cls: string; dotCls: string } {
  const neutral =
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  switch (status) {
    case "flagged":
      return { label: "Cảnh báo lệch điểm", cls: neutral, dotCls: "bg-rose-500" };
    case "graded":
      return { label: "Đã duyệt điểm", cls: neutral, dotCls: "bg-emerald-500" };
    case "redefense_requested":
      return { label: "Yêu cầu bảo vệ lại", cls: neutral, dotCls: "bg-purple-500" };
    default:
      return { label: "Chờ giảng viên duyệt", cls: neutral, dotCls: "bg-amber-500" };
  }
}

function getDefenseScoreAccent(score: number): {
  pillCls: string;
  dotCls: string;
} {
  const neutralPill =
    "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700";
  if (score >= 80) {
    return {
      pillCls: neutralPill,
      dotCls: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      pillCls: neutralPill,
      dotCls: "bg-amber-500",
    };
  }
  return {
    pillCls: neutralPill,
    dotCls: "bg-rose-500",
  };
}

function formatRankLabel(avgOutOf10: number): { text: string; cls: string } {
  if (avgOutOf10 >= 8.5) {
    return {
      text: "XUẤT SẮC",
      cls: "text-slate-900 dark:text-white",
    };
  }
  if (avgOutOf10 >= 7.0) {
    return {
      text: "KHÁ / ĐẠT CHUẨN",
      cls: "text-slate-700 dark:text-slate-200",
    };
  }
  return {
    text: "CẦN CỦNG CỐ",
    cls: "text-slate-600 dark:text-slate-300",
  };
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function AIDefenseRoomScreen({
  role = "student",
  onNavigate,
  initialProjectId = "prj-codemind",
  onOpenProjectDetail,
  onOpenKanban,
  onOpenGitHub,
  onOpenSchedule,
}: Props) {
  const isStaff = role === "instructor" || role === "admin";
  const [workspace, setWorkspace] = useState<DefenseWorkspaceBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Navigation tabs
  const [studentTab, setStudentTab] = useState<StudentTab>("dossier");
  const [staffTab, setStaffTab] = useState<StaffTab>(
    role === "admin" ? "courses" : "council"
  );
  const [studentDossier, setStudentDossier] = useState<DefenseProjectDossier | null>(null);
  const [dynamicRounds, setDynamicRounds] = useState<DefenseRound[] | null>(null);
  const [practiceEvidenceMeta, setPracticeEvidenceMeta] = useState<Record<string, any> | null>(null);

  // Shared search/filters for staff & history
  const [searchQuery, setSearchQuery] = useState("");
  const [subFilter, setSubFilter] = useState<
    "all" | "flagged" | "pending" | "graded" | "redefense_requested"
  >("all");
  const [expandedSubIds, setExpandedSubIds] = useState<Record<string, boolean>>({});
  const [expandedSessIds, setExpandedSessIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteSessId, setConfirmDeleteSessId] = useState<string | null>(null);

  // Staff grading draft state
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Rubric state for staff tab
  const [rubricDraft, setRubricDraft] = useState<DefenseRubricConfig>(DEFAULT_RUBRIC);
  const [newProbeChapter, setNewProbeChapter] = useState("CS499 · Đồ án");
  const [newProbeTopic, setNewProbeTopic] = useState("");

  // Student live session state
  const [selectedProjId, setSelectedProjId] = useState<string>(initialProjectId);
  const [liveDefenseId, setLiveDefenseId] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [defenseMode, setDefenseMode] = useState<"oral" | "sample">("oral");
  const [studentSpeech, setStudentSpeech] = useState("");
  const [stagePhase, setStagePhase] = useState<
    "speaking" | "council_deliberating" | "drilldown_question" | "drilldown_evaluating" | "verdict"
  >("speaking");
  const [selectedRebuttalId, setSelectedRebuttalId] = useState<string | null>(null);
  const [showMentorHint, setShowMentorHint] = useState(false);
  const [defenseTimeRemaining, setDefenseTimeRemaining] = useState(180);
  const [hasScoredAnyRound, setHasScoredAnyRound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [scores, setScores] = useState({
    architecture: 0,
    algorithm: 0,
    production: 0,
  });
  const [lastEvaluation, setLastEvaluation] = useState<{
    roundScore: number;
    feedback: string;
    matchedKeywords: string[];
    impactText: string;
  } | null>(null);

  // Audio / Voice / Modal states
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([
    35, 65, 45, 85, 55, 75, 40, 90, 60, 50, 70, 45,
  ]);
  const [certificateData, setCertificateData] = useState<{
    defenseId: string;
    submissionId: string;
    finalDefenseScore: number;
    cicdPct: number;
    weightedScore: number;
    status: string;
    discrepancy: boolean;
    coherenceSummary: string;
    commitCount: number;
  } | null>(null);

  const speechRecRef = useRef<any>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const userPickedProjectRef = useRef(false);

  const showToast = (msg: string) => setToastMsg(msg);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 4200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const loadWorkspace = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const bundle = await fetchDefenseWorkspaceApi(role);
      if (!bundle) return;
      setWorkspace(bundle);
      if (bundle.rubric) setRubricDraft(bundle.rubric);
      if (bundle.projects.length > 0) {
        if (
          role === "student" &&
          !userPickedProjectRef.current &&
          initialProjectId === "prj-codemind"
        ) {
          const preferred =
            bundle.projects.find((p) => p.isMyProject) || bundle.projects[0];
          setSelectedProjId(preferred.id);
        } else {
          const match = bundle.projects.find((p) => p.id === selectedProjId);
          if (!match) {
            setSelectedProjId(bundle.projects[0].id);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    userPickedProjectRef.current = false;
    setStaffTab(role === "admin" ? "courses" : "council");
    setStudentTab("dossier");
    setLiveDefenseId(null);
    setDynamicRounds(null);
    setPracticeEvidenceMeta(null);
    setHasScoredAnyRound(false);
    setScores({ architecture: 0, algorithm: 0, production: 0 });
    setCertificateData(null);
    setActionError(null);
    void loadWorkspace();
  }, [role]);

  useEffect(() => {
    if (role !== "student" || !selectedProjId) return;
    let active = true;
    setStudentDossier(null);
    fetchDefenseProjectDossierApi(selectedProjId, role).then((d) => {
      if (active && d) setStudentDossier(d);
    });
    return () => {
      active = false;
    };
  }, [role, selectedProjId]);

  const projects: DefenseProjectOption[] = workspace?.projects || [];
  const courses: DefenseCourseToggleItem[] = workspace?.courses || [];
  const sessions: DefenseSessionRecord[] = workspace?.sessions || [];
  const dualSubmissions: DefenseDualSubmissionItem[] = workspace?.dualSubmissions || [];

  const dossierReadyStats = useMemo(() => {
    if (!studentDossier) return { ready: 0, total: 5 };
    const hasDemo = Boolean(safeHttpUrl(studentDossier.package.demoUrl));
    const hasDocs = Boolean(
      safeHttpUrl(studentDossier.package.slideUrl) ||
        safeHttpUrl(studentDossier.package.reportUrl)
    );
    const hasRepo = Boolean(
      safeHttpUrl(studentDossier.package.repoUrl || studentDossier.project.repoUrl)
    );
    const isFrozen = Boolean(studentDossier.project.isFrozen);
    const hasPracticed =
      sessions.length > 0 || studentDossier.practiceSessions.length > 0;
    const ready = [hasDemo, hasDocs, hasRepo, isFrozen, hasPracticed].filter(
      Boolean
    ).length;
    return { ready, total: 5 };
  }, [studentDossier, sessions.length]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjId) || projects[0] || null,
    [projects, selectedProjId]
  );

  const rounds = useMemo(
    () =>
      dynamicRounds && dynamicRounds.length > 0
        ? dynamicRounds
        : getDefenseRoundsForProject(selectedProjId, activeProject?.name),
    [dynamicRounds, selectedProjId, activeProject?.name]
  );

  const currentRound = rounds[currentRoundIdx] || rounds[0];

  const speakingJury = useMemo(() => {
    if (
      stagePhase === "drilldown_question" ||
      stagePhase === "drilldown_evaluating"
    ) {
      return (
        DEFAULT_JURY.find((j) => j.id === currentRound.drillDownChallenge.criticJuryId) ||
        DEFAULT_JURY[1]
      );
    }
    return (
      DEFAULT_JURY.find((j) => j.id === currentRound.jurySpeakerId) ||
      DEFAULT_JURY[0]
    );
  }, [currentRound, stagePhase]);

  // Dynamic waveform animation only while live session is active
  useEffect(() => {
    if (!liveDefenseId || stagePhase === "verdict") return;
    const isThinking =
      stagePhase === "council_deliberating" || stagePhase === "drilldown_evaluating";
    const id = window.setInterval(() => {
      setWaveformBars((prev) =>
        prev.map((_, idx) =>
          Math.max(
            20,
            Math.min(
              100,
              Math.round((isThinking ? 45 : 30) + ((Date.now() / 130 + idx * 17) % 60))
            )
          )
        )
      );
    }, 240);
    return () => window.clearInterval(id);
  }, [liveDefenseId, stagePhase]);

  // Countdown timer ONLY runs during active session before verdict
  useEffect(() => {
    if (!liveDefenseId || stagePhase === "verdict") return;
    const timer = window.setInterval(() => {
      setDefenseTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [liveDefenseId, stagePhase]);

  // Optional browser speech synthesis when user enables sound
  useEffect(() => {
    if (!audioEnabled || !liveDefenseId || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textToRead =
        stagePhase === "drilldown_question"
          ? currentRound.drillDownChallenge.criticQuestion
          : stagePhase === "speaking"
          ? currentRound.question
          : "";
      if (!textToRead) return;
      const utt = new SpeechSynthesisUtterance(textToRead);
      utt.lang = "vi-VN";
      utt.rate = 1.03;
      window.speechSynthesis.speak(utt);
    } catch {
      // ignore unsupported voices
    }
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, [audioEnabled, liveDefenseId, stagePhase, currentRoundIdx, currentRound]);

  // ESC key closes Certificate Modal
  useEffect(() => {
    if (!certificateData) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCertificateData(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [certificateData]);

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (ZERO DOUBLE-OPACITY FADE) ───
  useMarloPageEntrance(
    screenRef,
    (el) => {
      const cards = el.querySelectorAll(
        ".defense-stage-header, .rounded-3xl, .rounded-\\[28px\\]"
      );
      if (cards.length > 0) {
        animateMarloCards(cards, { y: 24, stagger: 0.05, duration: 0.72 });
      }
      const rows = el.querySelectorAll(".marlo-row, tbody tr");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 10, stagger: 0.025, delay: 0.22, duration: 0.5 });
      }
    },
    [role, selectedProjId]
  );

  const resetLocalDefenseState = (discardServerDraft: boolean = true) => {
    const draftToDiscard =
      discardServerDraft && role === "student" && liveDefenseId && !certificateData
        ? liveDefenseId
        : null;
    setLiveDefenseId(null);
    setDynamicRounds(null);
    setPracticeEvidenceMeta(null);
    setCurrentRoundIdx(0);
    setDefenseMode("oral");
    setStudentSpeech("");
    setStagePhase("speaking");
    setSelectedRebuttalId(null);
    setShowMentorHint(false);
    setDefenseTimeRemaining(180);
    setHasScoredAnyRound(false);
    setScores({ architecture: 0, algorithm: 0, production: 0 });
    setLastEvaluation(null);
    setActionError(null);
    setCertificateData(null);
    if (draftToDiscard) {
      void deleteDefenseSessionApi(draftToDiscard, "student")
        .then(() => loadWorkspace(true))
        .catch(() => {});
    }
  };

  // Explicit student start (never auto-start in useEffect!)
  const handleStartDefenseSession = async () => {
    if (!activeProject || isStartingSession || liveDefenseId) return;
    if (!activeProject.aiDefenseEnabled) {
      setActionError(
        `Phòng Luyện tập AI cho học phần ${activeProject.courseCode} đang bị Quản trị viên tạm khóa.`
      );
      return;
    }
    setActionError(null);
    setIsStartingSession(true);
    try {
      const [qRes, res] = await Promise.all([
        generatePracticeQuestionsApi(activeProject.id, "student"),
        startDefenseSession(activeProject.id, activeProject.classId, "student"),
      ]);
      resetLocalDefenseState(false);
      if (qRes && Array.isArray(qRes.rounds) && qRes.rounds.length > 0) {
        setDynamicRounds(qRes.rounds as DefenseRound[]);
        setPracticeEvidenceMeta(qRes.evidence_summary || null);
      }
      setLiveDefenseId(res.defense_id);
      showToast(
        `✓ Đã mở phiên Luyện tập AI ${res.defense_id} sát dữ liệu ${activeProject.code} (Mock Readiness).`
      );
      await loadWorkspace(true);
    } catch (err: any) {
      setActionError(err?.message || "Không thể khởi tạo phiên luyện tập.");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleToggleMic = () => {
    if (isListeningMic && speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      setIsListeningMic(false);
      return;
    }
    const w = window as any;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast("Trình duyệt hiện tại không hỗ trợ nhập giọng nói (SpeechRecognition). Vui lòng gõ trực tiếp.");
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = "vi-VN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (evt: any) => {
        const transcriptText = evt?.results?.[0]?.[0]?.transcript || "";
        if (transcriptText) {
          setStudentSpeech((prev) =>
            prev.trim() ? `${prev.trim()} ${transcriptText}` : transcriptText
          );
        }
        setIsListeningMic(false);
      };
      rec.onerror = () => {
        setIsListeningMic(false);
        showToast("Không thu được tín hiệu micro. Bạn có thể gõ luận điểm trực tiếp.");
      };
      rec.onend = () => setIsListeningMic(false);
      speechRecRef.current = rec;
      rec.start();
      setIsListeningMic(true);
    } catch {
      setIsListeningMic(false);
      showToast("Không thể bật micro trên trình duyệt này.");
    }
  };

  const handleInsertKeyword = (kw: string) => {
    setStudentSpeech((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, kết hợp ${kw}` : `Em áp dụng ${kw}`;
    });
  };

  const handleSubmitOralDefense = async () => {
    if (!liveDefenseId) return;
    const trimmed = studentSpeech.trim();
    if (trimmed.length < 10) {
      setActionError("Vui lòng trình bày luận điểm tối thiểu 10 ký tự trước khi gửi.");
      return;
    }

    setActionError(null);
    setStagePhase("council_deliberating");

    try {
      const res = await respondDefenseRound(
        liveDefenseId,
        {
          round_number: currentRound.roundNumber,
          phase: "oral",
          question_text: currentRound.question,
          speaker_label: `${speakingJury.name} · ${speakingJury.title}`,
          argument_text: trimmed,
          expected_keywords: currentRound.suggestedKeywords,
        },
        "student"
      );
      setScores({
        architecture: Number((res.scores.architecture / 10).toFixed(1)),
        algorithm: Number((res.scores.algorithm / 10).toFixed(1)),
        production: Number((res.scores.production / 10).toFixed(1)),
      });
      setHasScoredAnyRound(true);
      setLastEvaluation({
        roundScore: res.round_score,
        feedback: res.evaluation,
        matchedKeywords: res.matched_keywords || [],
        impactText: "",
      });
      setStagePhase("drilldown_question");
    } catch (err: any) {
      setStagePhase("speaking");
      setActionError(err?.message || "Không thể chấm điểm luận điểm. Vui lòng thử lại.");
    }
  };

  const handleSelectRebuttal = async (rebId: string) => {
    if (!liveDefenseId) return;
    const chosen = currentRound.drillDownChallenge.rebuttalOptions.find(
      (o) => o.id === rebId
    );
    if (!chosen) return;

    setSelectedRebuttalId(rebId);
    setActionError(null);
    setStagePhase("drilldown_evaluating");

    try {
      const res = await respondDefenseRound(
        liveDefenseId,
        {
          round_number: currentRound.roundNumber,
          phase: "rebuttal",
          question_text: currentRound.drillDownChallenge.criticQuestion,
          speaker_label: currentRound.drillDownChallenge.criticName,
          argument_text: chosen.answer,
          rebuttal_option_score: chosen.score,
        },
        "student"
      );
      setScores({
        architecture: Number((res.scores.architecture / 10).toFixed(1)),
        algorithm: Number((res.scores.algorithm / 10).toFixed(1)),
        production: Number((res.scores.production / 10).toFixed(1)),
      });
      setHasScoredAnyRound(true);
      setLastEvaluation({
        roundScore: res.round_score,
        feedback: chosen.feedback || res.evaluation,
        matchedKeywords: res.matched_keywords || [],
        impactText: chosen.architectureImpact,
      });
      setStagePhase("verdict");
      await loadWorkspace(true);
    } catch (err: any) {
      setStagePhase("drilldown_question");
      setActionError(err?.message || "Không thể ghi nhận phản biện hiệp 2.");
    }
  };

  const handleNextOrFinish = async () => {
    if (currentRoundIdx < rounds.length - 1) {
      setCurrentRoundIdx((prev) => prev + 1);
      setStudentSpeech("");
      setSelectedRebuttalId(null);
      setStagePhase("speaking");
      setShowMentorHint(false);
      setDefenseTimeRemaining(180);
      setActionError(null);
      return;
    }

    if (!liveDefenseId || !activeProject) return;
    setBusyKey("complete");
    setActionError(null);
    try {
      const res = await completeDefenseSession(
        liveDefenseId,
        {
          chapter_title: `${activeProject.name.split(" - ")[0]} · Phản biện Hội đồng AI`,
          repo_url: activeProject.repoUrl,
          passed_tests:
            activeProject.totalTasksCount > 0 ? activeProject.doneTasksCount : 5,
          total_tests:
            activeProject.totalTasksCount > 0 ? activeProject.totalTasksCount : 5,
        },
        "student"
      );
      setCertificateData({
        defenseId: res.defense_id,
        submissionId: res.submission_id,
        finalDefenseScore: res.final_defense_score,
        cicdPct: res.cicd_pct,
        weightedScore: res.weighted_score,
        status: res.status,
        discrepancy: res.discrepancy,
        coherenceSummary: res.coherence_summary,
        commitCount: res.commit_count,
      });
      await loadWorkspace(true);
      showToast(`✓ Đã chốt điểm Phản biện (${res.final_defense_score}/100) và đẩy biên bản Chấm Kép.`);
    } catch (err: any) {
      setActionError(err?.message || "Không thể hoàn tất phiên phản biện.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDownloadCertificateHtml = () => {
    if (!certificateData || !activeProject) return;
    const stuName = workspace?.user?.name || "Học viên CodeMind";
    const stuCode = workspace?.user?.studentCode || "";
    const escHtml = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Biên Bản Nghiệm Thu Phản Biện AI - ${escHtml(certificateData.defenseId)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 40px auto; padding: 32px; color: #111827; border: 2px solid #e5e7eb; border-radius: 16px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
  td.lbl { color: #6b7280; width: 220px; font-weight: 600; }
  .score { font-size: 20px; font-weight: 800; color: #059669; }
</style>
</head>
<body>
  <h1>BIÊN BẢN NGHIỆM THU PHẢN BIỆN ĐỒ ÁN (AI COUNCIL)</h1>
  <div class="meta">Mã phiên: ${escHtml(certificateData.defenseId)} · Mã chấm kép: ${escHtml(certificateData.submissionId)}</div>
  <table>
    <tr><td class="lbl">Học viên</td><td>${escHtml(stuName)} (${escHtml(stuCode)})</td></tr>
    <tr><td class="lbl">Đồ án</td><td>${escHtml(activeProject.code)} · ${escHtml(activeProject.name)}</td></tr>
    <tr><td class="lbl">Kho lưu trữ GitHub</td><td>${escHtml(activeProject.repoUrl || "Chưa gắn repo")} (${certificateData.commitCount} commits)</td></tr>
    <tr><td class="lbl">Điểm Phản biện AI</td><td class="score">${(certificateData.finalDefenseScore / 10).toFixed(1)} / 10 (${certificateData.finalDefenseScore}/100)</td></tr>
    <tr><td class="lbl">Điểm Chấm kép tổng hợp</td><td>${(certificateData.weightedScore / 10).toFixed(1)} / 10 (Tiến độ/CI: ${certificateData.cicdPct}%)</td></tr>
    <tr><td class="lbl">Kết luận hệ thống</td><td>${escHtml(certificateData.coherenceSummary)}</td></tr>
  </table>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codemind-bien-ban-${certificateData.defenseId}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✓ Đã tải tệp Biên bản nghiệm thu HTML về máy.");
  };

  // Staff actions
  const handleDecideSubmission = async (
    sub: DefenseDualSubmissionItem,
    action: "approve" | "redefense"
  ) => {
    const fallbackScore =
      sub.finalScore ??
      Math.round(
        ((sub.passedTests / Math.max(1, sub.totalTests)) * 100 * rubricDraft.cicdWeightPct) /
          100 +
          (sub.defenseScore * rubricDraft.defenseWeightPct) / 100
      );
    const draftScore = Number(scoreDrafts[sub.id] ?? fallbackScore);
    if (action === "approve" && (Number.isNaN(draftScore) || draftScore < 0 || draftScore > 100)) {
      showToast("Điểm tổng hợp phải nằm trong khoảng 0 – 100.");
      return;
    }

    setBusyKey(`dec-${sub.id}`);
    try {
      await decideDualSubmission(
        sub.id,
        {
          action,
          ...(action === "approve" ? { final_score: Math.round(draftScore) } : {}),
          instructor_feedback: (feedbackDrafts[sub.id] ?? sub.instructorFeedback ?? "").trim(),
        },
        role === "admin" ? "admin" : "instructor",
        true
      );
      await loadWorkspace(true);
      showToast(
        action === "approve"
          ? `✓ Đã phê duyệt điểm ${Math.round(draftScore)}/100 cho ${sub.studentName}.`
          : `✓ Đã gửi yêu cầu bảo vệ lại cho ${sub.studentName}.`
      );
    } catch (err: any) {
      showToast(err?.message || "Không thể xử lý biên bản Chấm Kép.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleCourse = async (course: DefenseCourseToggleItem) => {
    setBusyKey(`course-${course.id}`);
    try {
      const res = await toggleCourseDefenseApi(
        course.id,
        !course.aiDefenseEnabled,
        "admin"
      );
      await loadWorkspace(true);
      showToast(
        res.aiDefenseEnabled
          ? `✓ Đã MỞ Phòng Phản Biện AI cho ${res.code}.`
          : `🔒 Đã KHÓA Phòng Phản Biện AI cho ${res.code}.`
      );
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái học phần.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteSession = async (sessId: string) => {
    setBusyKey(`del-${sessId}`);
    try {
      await deleteDefenseSessionApi(sessId, role);
      setConfirmDeleteSessId(null);
      await loadWorkspace(true);
      showToast("✓ Đã xóa phiên bảo vệ khỏi hệ thống.");
    } catch (err: any) {
      showToast(err?.message || "Không thể xóa phiên bảo vệ.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveRubricConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey("rubric-save");
    try {
      await saveDefenseRubric(rubricDraft, role === "admin" ? "admin" : "instructor", true);
      await loadWorkspace(true);
      showToast("✓ Đã lưu cấu hình Rubric Chấm Kép xuống MySQL.");
    } catch (err: any) {
      showToast(err?.message || "Không thể lưu cấu hình Rubric.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleExportAdminCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Mã Biên Bản",
      "Sinh Viên",
      "MSSV",
      "Lớp",
      "Đề Tài",
      "CI/CD Tests",
      "Commits",
      "Điểm AI",
      "Điểm Tổng Hợp",
      "Trạng Thái",
    ];
    const rows = dualSubmissions.map((d) => [
      d.id,
      d.studentName,
      d.studentCode,
      d.classId,
      d.chapterTitle,
      `${d.passedTests}/${d.totalTests}`,
      d.commitCount,
      d.defenseScore,
      d.finalScore ?? "Chưa chấm",
      d.status,
    ]);
    const csv =
      "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codemind-bao-cao-hoi-dong-ai.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Đã xuất ${rows.length} biên bản hội đồng ra CSV.`);
  };

  const avgOutOf10 = hasScoredAnyRound
    ? Number(((scores.architecture + scores.algorithm + scores.production) / 3).toFixed(1))
    : 0;
  const rankMeta = formatRankLabel(avgOutOf10);

  // Staff filtered lists
  const filteredSubmissions = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return dualSubmissions.filter((d) => {
      if (subFilter !== "all" && d.status !== subFilter) return false;
      if (!kw) return true;
      return [d.studentName, d.studentCode, d.chapterTitle, d.classId, d.coherenceSummary]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(kw));
    });
  }, [dualSubmissions, subFilter, searchQuery]);

  const filteredSessions = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (!kw) return true;
      return [s.studentName, s.studentCode, s.projectName, s.projectCode, s.courseCode]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(kw));
    });
  }, [sessions, searchQuery]);

  const filteredCourses = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (!kw) return true;
      return [c.code, c.name, c.teacherName].some((f) =>
        (f || "").toLowerCase().includes(kw)
      );
    });
  }, [courses, searchQuery]);

  const renderProjectLinks = (proj: DefenseProjectOption | null) => {
    if (!proj) return null;
    return (
      <div className="flex items-center flex-wrap gap-1.5">
        {onOpenProjectDetail && (
          <button
            type="button"
            onClick={() => onOpenProjectDetail(proj.id)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold transition cursor-pointer"
          >
            Chi tiết Dự án
          </button>
        )}
        {onOpenKanban && (
          <button
            type="button"
            onClick={() => onOpenKanban(proj.id)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
          >
            <FolderKanban size={11} className="text-amber-500" />
            <span>Bảng Kanban</span>
          </button>
        )}
        {onOpenGitHub && (
          <button
            type="button"
            onClick={() => onOpenGitHub(proj.id)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
          >
            <GitFork size={11} className="text-blue-500" />
            <span>Git Hub</span>
          </button>
        )}
        {onOpenSchedule && (
          <button
            type="button"
            onClick={onOpenSchedule}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
          >
            <Clock size={11} className="text-emerald-500" />
            <span>Lịch Bảo vệ</span>
          </button>
        )}
      </div>
    );
  };

  // Shared transcript renderer
  const renderTranscriptList = (items: DefenseTranscriptEntry[]) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          Chưa có lượt hỏi đáp nào được ghi nhận trong phiên này.
        </p>
      );
    }
    return (
      <div className="space-y-2.5">
        {items.map((t, idx) => (
          <div
            key={t.id || idx}
            className={`p-3 rounded-xl border text-xs ${
              t.speaker === "student"
                ? "bg-white dark:bg-[#14161F] border-slate-200 dark:border-slate-700"
                : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-slate-900 dark:text-white">
                {t.speakerLabel}
              </span>
              {typeof t.score === "number" && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-[10.5px] font-bold border border-slate-200 dark:border-slate-700">
                  {t.score}/100
                </span>
              )}
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{t.text}</p>
            {t.evaluation && (
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                Nhận xét Hội đồng: {t.evaluation}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRubricPanel = () => (
    <form
      onSubmit={handleSaveRubricConfig}
      className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 space-y-5 shadow-xs"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders size={17} className="text-[#EE8420]" />
            <span>Cấu Hình Trọng Số Rubric Chấm Kép & Ngưỡng Gắn Cờ</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tổng trọng số Tiến độ/CI và Phản biện Hội đồng AI luôn cân bằng 100%, lưu trực tiếp xuống MySQL.
          </p>
        </div>
        <button
          type="submit"
          disabled={busyKey === "rubric-save"}
          className="px-4 py-2 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 text-xs font-bold cursor-pointer transition disabled:opacity-50"
        >
          {busyKey === "rubric-save" ? "Đang lưu..." : "Lưu Cấu Hình Rubric"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="font-bold text-slate-700 dark:text-slate-200 block">
            Trọng số Kiểm thử CI/CD (%):
          </label>
          <input
            type="number"
            min={10}
            max={90}
            value={rubricDraft.cicdWeightPct}
            onChange={(e) => {
              const val = Math.max(10, Math.min(90, Number(e.target.value) || 60));
              setRubricDraft((prev) => ({
                ...prev,
                cicdWeightPct: val,
                defenseWeightPct: 100 - val,
              }));
            }}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Phản biện AI tự động điều chỉnh còn: <b>{rubricDraft.defenseWeightPct}%</b>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="font-bold text-slate-700 dark:text-slate-200 block">
            Ngưỡng gắn cờ lệch điểm (%):
          </label>
          <input
            type="number"
            min={5}
            max={60}
            value={rubricDraft.autoFlagDiscrepancyThreshold}
            onChange={(e) =>
              setRubricDraft((prev) => ({
                ...prev,
                autoFlagDiscrepancyThreshold: Math.max(
                  5,
                  Math.min(60, Number(e.target.value) || 25)
                ),
              }))
            }
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Chênh lệch CI/CD và điểm AI vượt ngưỡng này sẽ tự động gắn cờ.
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2">
          <div>
            <b className="text-slate-800 dark:text-slate-100 block">
              Chế độ Chống sao chép nghiêm ngặt
            </b>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Siết chặt kiểm tra phong cách lập luận và biến thể câu hỏi khi nghi ngờ copy AI.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
            <input
              type="checkbox"
              checked={rubricDraft.strictAntiCopyGuardrail}
              onChange={(e) =>
                setRubricDraft((prev) => ({
                  ...prev,
                  strictAntiCopyGuardrail: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-[#EE8420]"
            />
            <span>{rubricDraft.strictAntiCopyGuardrail ? "Đang bật bảo vệ" : "Đang tắt"}</span>
          </label>
        </div>
      </div>

      {/* Mandatory Probes Editor */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Bộ câu hỏi xoáy sâu bắt buộc ({rubricDraft.mandatoryProbes.length})
        </h4>
        <div className="space-y-2">
          {rubricDraft.mandatoryProbes.map((probe) => (
            <div
              key={probe.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  [{probe.chapterKeyword}]
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">{probe.topic}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRubricDraft((prev) => ({
                    ...prev,
                    mandatoryProbes: prev.mandatoryProbes.filter((p) => p.id !== probe.id),
                  }))
                }
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
                title="Xóa câu hỏi"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 pt-2">
          <input
            type="text"
            value={newProbeChapter}
            onChange={(e) => setNewProbeChapter(e.target.value)}
            placeholder="Môn học / Chương (VD: CS499)"
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newProbeTopic}
              onChange={(e) => setNewProbeTopic(e.target.value)}
              placeholder="Chủ đề / nội dung xoáy sâu bắt buộc..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!newProbeTopic.trim()) return;
                const item: DefenseRubricConfig["mandatoryProbes"][number] = {
                  id: `probe-${Date.now()}`,
                  chapterKeyword: newProbeChapter.trim() || "Chung",
                  topic: newProbeTopic.trim(),
                };
                setRubricDraft((prev) => ({
                  ...prev,
                  mandatoryProbes: [...prev.mandatoryProbes, item],
                }));
                setNewProbeTopic("");
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer shrink-0"
            >
              + Thêm
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  const renderDualQueuePanel = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#14161F] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <MarloSegmentedControl
          value={subFilter}
          options={[
            { id: "all", label: "Tất cả", badge: dualSubmissions.length },
            {
              id: "flagged",
              label: "Cảnh báo",
              badge: dualSubmissions.filter((d) => d.status === "flagged").length,
            },
            {
              id: "pending",
              label: "Chờ duyệt",
              badge: dualSubmissions.filter((d) => d.status === "pending").length,
            },
            { id: "graded", label: "Đã duyệt" },
            { id: "redefense_requested", label: "Bảo vệ lại" },
          ]}
          onChange={(v) => setSubFilter(v as any)}
          tone="dark"
        />
      </div>

      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            Không có biên bản Chấm Kép nào khớp bộ lọc hiện tại.
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const st = getSubmissionBadge(sub.status);
            const repoHref = safeHttpUrl(sub.repoUrl);
            const isExpanded = !!expandedSubIds[sub.id];
            const calcSuggested = Math.round(
              ((sub.passedTests / Math.max(1, sub.totalTests)) *
                100 *
                rubricDraft.cicdWeightPct) /
                100 +
                (sub.defenseScore * rubricDraft.defenseWeightPct) / 100
            );
            const scoreVal = scoreDrafts[sub.id] ?? String(sub.finalScore ?? calcSuggested);

            return (
              <div
                key={sub.id}
                className="rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/90 dark:border-slate-800 p-5 space-y-3 shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                        <span>{st.label}</span>
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {sub.classId}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {sub.submittedAt}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {sub.studentName} ({sub.studentCode}) — {sub.chapterTitle}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0 flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                      CI/CD: <b>{sub.passedTests}/{sub.totalTests}</b> · Commits:{" "}
                      <b>{sub.commitCount}</b>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white">
                      Điểm AI: <b>{sub.defenseScore}/100</b>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5">
                  <p className="text-slate-700 dark:text-slate-200 font-medium">
                    {sub.coherenceSummary}
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {repoHref ? (
                      <a
                        href={repoHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:underline font-mono break-all"
                      >
                        <FolderGit2 size={12} className="text-slate-500" />
                        <span>{repoHref}</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-slate-400">Chưa gắn link GitHub</span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSubIds((p) => ({ ...p, [sub.id]: !isExpanded }))
                      }
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline cursor-pointer"
                    >
                      {isExpanded
                        ? "Thu gọn biên bản hỏi đáp"
                        : `Xem biên bản hỏi đáp (${(sub.transcript || []).length} dòng)`}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-1">{renderTranscriptList(sub.transcript || [])}</div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center gap-2 pt-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Điểm tổng (0-100):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoreVal}
                      onChange={(e) =>
                        setScoreDrafts((p) => ({ ...p, [sub.id]: e.target.value }))
                      }
                      className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={feedbackDrafts[sub.id] ?? sub.instructorFeedback ?? ""}
                    onChange={(e) =>
                      setFeedbackDrafts((p) => ({ ...p, [sub.id]: e.target.value }))
                    }
                    placeholder="Nhận xét thẩm định của Giảng viên..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busyKey === `dec-${sub.id}`}
                      onClick={() => void handleDecideSubmission(sub, "approve")}
                      className="px-3.5 py-2 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 text-xs font-bold cursor-pointer transition disabled:opacity-50"
                    >
                      Phê duyệt điểm
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === `dec-${sub.id}`}
                      onClick={() => void handleDecideSubmission(sub, "redefense")}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition disabled:opacity-50"
                    >
                      Yêu cầu Bảo vệ lại
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderSessionsListPanel = (allowDelete: boolean) => (
    <div className="space-y-3">
      {filteredSessions.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa có phiên bảo vệ nào được ghi nhận.
        </div>
      ) : (
        filteredSessions.map((sess) => {
          const isExp = !!expandedSessIds[sess.id];
          const avg10 =
            sess.finalDefenseScore !== null
              ? (sess.finalDefenseScore / 10).toFixed(1)
              : sess.architectureScore > 0
              ? (
                  (sess.architectureScore +
                    sess.algorithmScore +
                    sess.productionScore) /
                  30
                ).toFixed(1)
              : null;

          return (
            <div
              key={sess.id}
              className="rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/90 dark:border-slate-800 p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sess.projectCode}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          sess.status === "completed"
                            ? "bg-emerald-500"
                            : sess.status === "flagged"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span>
                        {sess.status === "completed"
                          ? "Đã hoàn tất"
                          : sess.status === "flagged"
                          ? "Gắn cờ lệch điểm"
                          : "Đang thực hiện"}
                      </span>
                    </span>
                    {avg10 && (
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {avg10}/10
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {sess.studentName} ({sess.studentCode}) — {sess.projectName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {sess.architectureScore > 0 ||
                    sess.algorithmScore > 0 ||
                    sess.productionScore > 0
                      ? `Kiến trúc: ${(sess.architectureScore / 10).toFixed(1)}/10 · Thuật toán: ${(sess.algorithmScore / 10).toFixed(1)}/10 · Vận hành: ${(sess.productionScore / 10).toFixed(1)}/10`
                      : "Chưa chấm điểm"}{" "}
                    · {sess.transcript.length} lượt thoại
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSessIds((p) => ({ ...p, [sess.id]: !isExp }))
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isExp ? "Thu gọn" : "Xem biên bản"}
                  </button>
                  {allowDelete &&
                    (confirmDeleteSessId === sess.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busyKey === `del-${sess.id}`}
                          onClick={() => void handleDeleteSession(sess.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Xác nhận xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSessId(null)}
                          className="px-2 py-1.5 text-xs text-slate-500 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSessId(sess.id)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 cursor-pointer"
                        title="Xóa phiên bảo vệ"
                      >
                        <Trash2 size={14} />
                      </button>
                    ))}
                </div>
              </div>

              {isExp && <div className="pt-2">{renderTranscriptList(sess.transcript)}</div>}
            </div>
          );
        })
      )}
    </div>
  );

  // ── HEADER BY ROLE ──
  const roleHeader =
    role === "admin"
      ? {
          pill: "Quản trị viên / Khảo thí",
          pillCls:
            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
          title: "Quản Trị Hội Đồng Bảo Vệ Đồ Án & Luyện Tập AI",
          sub: "Điều phối học phần mở phòng tập AI, tham gia Hội đồng chấm trực tiếp sau demo và kiểm soát Rubric đánh giá.",
        }
      : role === "instructor"
      ? {
          pill: "Hội đồng Bảo vệ Trực tiếp",
          pillCls:
            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
          title: "Hội Đồng Bảo Vệ Đồ Án Trực Tiếp & Minh Chứng",
          sub: "Xem tổng quan Demo, Slide, GitHub, đóng góp Anti-Freerider từng thành viên và chốt điểm bảo vệ trực tiếp.",
        }
      : {
          pill: "Luyện tập AI · Không tính điểm chính thức",
          pillCls:
            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
          title: "Hồ Sơ Bảo Vệ & Phòng Luyện Tập Phản Biện AI",
          sub: "Nộp Link Demo / Slide / Báo cáo, tập dượt hỏi đáp sát dữ liệu dự án (Mock Readiness) và xem Kết quả Hội đồng chính thức.",
        };

  return (
    <div
      ref={screenRef}
      className="min-h-full p-4 sm:p-6 lg:p-8 relative font-sans text-slate-900 dark:text-white overflow-x-hidden"
    >
      {/* ── TOP HEADER ── */}
      <header className="defense-stage-header rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleHeader.pillCls}`}
              >
                <ShieldCheck size={13} />
                <span>{roleHeader.pill}</span>
              </span>
              {activeProject && role === "student" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {activeProject.code} · {activeProject.courseCode}
                </span>
              )}
            </div>

            <MarloTitle
              text={roleHeader.title}
              className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            />
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {roleHeader.sub}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {isStaff && (
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm sinh viên, học phần, mã biên bản..."
                  className="pl-8 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs w-56 sm:w-64 text-slate-900 dark:text-slate-100 outline-none focus:border-[#EE8420]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {role === "student" && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 max-w-full">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 shrink-0">
                  <FolderKanban size={14} className="text-[#EE8420]" />
                  <span className="hidden sm:inline">Đồ án:</span>
                </span>
                <MarloSelect
                  value={selectedProjId}
                  onChange={(e) => {
                    userPickedProjectRef.current = true;
                    setSelectedProjId(e.target.value);
                    resetLocalDefenseState();
                  }}
                  aria-label="Chọn đồ án bảo vệ"
                  className="bg-white dark:bg-[#14161F] text-xs font-bold text-slate-900 dark:text-white px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[260px]"
                >
                  {projects.length === 0 ? (
                    <option value="prj-codemind">Đang tải danh sách đồ án...</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name.split(" - ")[0]}{" "}
                        {p.isMyProject ? "(Dự án của bạn)" : "(Chỉ xem)"}
                        {!p.aiDefenseEnabled ? " · Đang khóa" : ""}
                      </option>
                    ))
                  )}
                </MarloSelect>
              </div>
            )}

            <button
              type="button"
              onClick={() => void loadWorkspace()}
              title="Tải lại dữ liệu từ MySQL"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>

            {role === "admin" && (
              <button
                type="button"
                onClick={handleExportAdminCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                <Download size={14} />
                <span>Xuất Báo Cáo CSV</span>
              </button>
            )}

            {role === "student" && (
              <button
                type="button"
                onClick={() => setAudioEnabled((v) => !v)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  audioEnabled
                    ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                }`}
                title={audioEnabled ? "Tắt đọc giọng nói AI" : "Bật đọc câu hỏi bằng giọng nói"}
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Role Sub-Tabs (Always Responsive, Zero Overflow at 871px) */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {role === "student" ? (
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <button
                type="button"
                onClick={() => setStudentTab("dossier")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  studentTab === "dossier"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <FileText size={13} />
                <span>Hồ sơ Bảo vệ</span>
                {studentDossier && (
                  <span
                    className={`px-1.5 rounded-full text-[10px] ${
                      studentTab === "dossier"
                        ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {dossierReadyStats.ready}/{dossierReadyStats.total}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStudentTab("practice")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  studentTab === "practice"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Play size={13} />
                <span>Luyện tập AI</span>
                {liveDefenseId && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                    title="Phiên Luyện tập AI đang hoạt động"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setStudentTab("official")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  studentTab === "official"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>Kết quả Hội đồng</span>
                {activeProject?.isGraded && (
                  <span
                    className={`px-1.5 rounded-full text-[10px] ${
                      studentTab === "official"
                        ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {activeProject.officialFinalScore?.toFixed(1)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStudentTab("history")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  studentTab === "history"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>Lịch sử Luyện tập</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    studentTab === "history"
                      ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-950"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {sessions.length}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <button
                type="button"
                onClick={() => setStaffTab("council")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  staffTab === "council"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>Hội đồng Trực tiếp</span>
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    staffTab === "council"
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {projects.filter((p) => p.isGraded).length}/{projects.length}
                </span>
              </button>
              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => setStaffTab("courses")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                    staffTab === "courses"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>Điều phối Học phần</span>
                  <span
                    className={`px-1.5 rounded-full text-[10px] ${
                      staffTab === "courses"
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {courses.filter((c) => c.aiDefenseEnabled).length}/{courses.length}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setStaffTab("sessions")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  staffTab === "sessions"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>Lịch sử Luyện tập SV</span>
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    staffTab === "sessions"
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {sessions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffTab("queue")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  staffTab === "queue"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>Chấm Kép Lab</span>
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    staffTab === "queue"
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {dualSubmissions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffTab("rubric")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  staffTab === "rubric"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Cấu hình Rubric
              </button>
            </div>
          )}

          {role === "student" && liveDefenseId && (
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="flex items-end gap-0.5 h-4">
                {waveformBars.map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full transition-all duration-200 bg-slate-700 dark:bg-slate-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Phiên: {liveDefenseId}
              </span>
              <span className="font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                {defenseTimeRemaining < 30 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
                {formatTimer(defenseTimeRemaining)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── STAFF VIEW (INSTRUCTOR / ADMIN) ── */}
      {isStaff ? (
        <div className="space-y-6">
          {/* 4 Live KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                Đồ án đã chấm Hội đồng
              </span>
              <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {workspace?.stats?.gradedProjectsCount ??
                  projects.filter((p) => p.isGraded).length}
                /{workspace?.stats?.totalProjectsCount ?? projects.length} đồ án
              </b>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                Đồ án chờ bảo vệ trực tiếp
              </span>
              <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {Math.max(
                  0,
                  (workspace?.stats?.totalProjectsCount ?? projects.length) -
                    (workspace?.stats?.gradedProjectsCount ??
                      projects.filter((p) => p.isGraded).length)
                )}{" "}
                đồ án
              </b>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                Phiên luyện tập AI của SV
              </span>
              <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {sessions.length} lượt tập
              </b>
            </div>

            {role === "admin" ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Học phần mở Phòng tập AI
                </span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {workspace?.stats?.enabledCoursesCount ?? 0}/
                  {workspace?.stats?.totalCoursesCount ?? courses.length} lớp
                </b>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Cần rà soát Chấm Kép Lab
                </span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {workspace?.stats?.pendingReviewsCount ?? 0} hồ sơ
                </b>
              </div>
            )}
          </div>

          {staffTab === "council" && (
            <LiveCouncilCockpit
              projects={projects}
              selectedProjectId={selectedProjId}
              onSelectProject={setSelectedProjId}
              role={role}
              onNotify={showToast}
              onGradedSuccess={() => void loadWorkspace(true)}
              onOpenProjectDetail={onOpenProjectDetail}
              onOpenKanban={onOpenKanban}
              onOpenGitHub={onOpenGitHub}
            />
          )}

          {staffTab === "courses" && role === "admin" && (
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Điều phối Mở / Khóa Phòng Phản Biện AI Theo Học Phần ({filteredCourses.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCourses.map((c) => (
                  <div
                    key={c.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {c.code}
                        </span>
                        <b className="text-sm text-slate-900 dark:text-white">{c.name}</b>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        GV: {c.teacherName} · {c.studentCount} SV · Chờ duyệt:{" "}
                        {c.pendingDualReviews}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busyKey === `course-${c.id}`}
                      onClick={() => void handleToggleCourse(c)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                        c.aiDefenseEnabled
                          ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.aiDefenseEnabled ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span>
                        {c.aiDefenseEnabled
                          ? "Đang MỞ Phòng AI (Bấm để khóa)"
                          : "Đang KHÓA (Bấm để mở)"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {staffTab === "queue" && renderDualQueuePanel()}
          {staffTab === "sessions" && renderSessionsListPanel(true)}
          {staffTab === "rubric" && renderRubricPanel()}
        </div>
      ) : studentTab === "official" ? (
        <div key="student-tab-official">
          <OfficialDefenseResultView
            dossier={studentDossier}
            practiceCount={sessions.length}
            onGoToDossier={() => setStudentTab("dossier")}
            onGoToPractice={() => setStudentTab("practice")}
            onNotify={showToast}
          />
        </div>
      ) : studentTab === "history" ? (
        /* ── STUDENT HISTORY TAB ── */
        <div key="student-tab-history" className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Các phiên Phản Biện AI của bạn ({sessions.length})
            </h3>
            {renderSessionsListPanel(false)}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Kết quả Thẩm định Chấm Kép từ Giảng viên ({dualSubmissions.length})
            </h3>
            {dualSubmissions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                Chưa có biên bản chấm kép nào cho tài khoản của bạn.
              </div>
            ) : (
              dualSubmissions.map((d) => {
                const badge = getSubmissionBadge(d.status);
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 p-4 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <b className="text-sm text-slate-900 dark:text-white">
                        {d.chapterTitle}
                      </b>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotCls}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{d.coherenceSummary}</p>
                    <div className="font-mono text-slate-700 dark:text-slate-200">
                      Điểm AI: <b>{d.defenseScore}/100</b> · Điểm Chấm Kép:{" "}
                      <b>{d.finalScore !== null ? `${d.finalScore}/100` : "Đang chờ GV duyệt"}</b>
                    </div>
                    {d.instructorFeedback && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                        <b>Phản hồi của Giảng viên:</b> {d.instructorFeedback}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : studentTab === "dossier" ? (
        /* ── STUDENT DEFENSE DOSSIER TAB (ALWAYS ACCESSIBLE EVEN DURING ACTIVE PRACTICE) ── */
        <div key="student-tab-dossier" className="space-y-4">
          {studentDossier ? (
            <DefensePackagePanel
              dossier={studentDossier}
              role={role}
              practiceCount={sessions.length}
              alwaysExpanded
              onSaved={(next) => {
                setStudentDossier(next);
                void loadWorkspace(true);
              }}
              onNotify={showToast}
              onOpenProjectDetail={onOpenProjectDetail}
              onGoToPractice={() => setStudentTab("practice")}
            />
          ) : (
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đang tải Hồ sơ Chuẩn bị Bảo vệ Đồ án...
            </div>
          )}

          {activeProject && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <b className="text-slate-900 dark:text-white">{activeProject.code}</b> · Liên kết nhanh dữ liệu dự án thực tế:
              </div>
              {renderProjectLinks(activeProject)}
            </div>
          )}
        </div>
      ) : (
        /* ── STUDENT AI MOCK PRACTICE TAB ── */
        <div key="student-tab-practice" className="space-y-6">

          {/* Responsive 3 Jury Cards (1 col < xl, 3 cols >= xl -> zero clipping at 871px) */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {DEFAULT_JURY.map((jury) => {
              const isSpeaking = Boolean(liveDefenseId) && jury.id === speakingJury.id;
              const livePct = !liveDefenseId || !hasScoredAnyRound
                ? null
                : jury.role === "chairman"
                ? Math.round(scores.architecture * 10)
                : jury.role === "critic"
                ? Math.round(scores.algorithm * 10)
                : Math.round(scores.production * 10);

              return (
                <div
                  key={jury.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isSpeaking
                      ? "border-slate-900 dark:border-slate-400 bg-white dark:bg-[#14161F] shadow-sm"
                      : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: jury.colorHex }}
                      >
                        {jury.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {jury.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {jury.title}
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {jury.institution}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`whitespace-nowrap shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                        isSpeaking
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isSpeaking
                        ? stagePhase === "drilldown_question"
                          ? "Vặn xoáy sâu"
                          : "Đang chất vấn"
                        : liveDefenseId
                        ? "Lắng nghe"
                        : "Sẵn sàng"}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {jury.persona}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">
                        Độ thuyết phục (Mock)
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {livePct !== null ? `${livePct}%` : "Chưa tập"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-[#EE8420]"
                        style={{ width: `${livePct ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
            {/* LEFT: LOBBY OR ACTIVE TRIBUNAL STAGE */}
            <div className="space-y-4">
              {!liveDefenseId ? (
                <div key="practice-lobby-card" className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-6 sm:p-7 space-y-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                        <Sparkles size={12} className="text-amber-500 shrink-0" />
                        <span>Phòng Luyện Tập Phản Biện AI (Mock Practice · Không tính điểm chính thức)</span>
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white mt-2">
                        {activeProject?.name || "Đồ án Kỹ nghệ Phần mềm"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {activeProject?.course} · AI tự đọc Task Kanban & Commit thật của dự án để sinh {rounds.length} vòng luyện tập
                      </p>
                    </div>
                    {renderProjectLinks(activeProject)}
                  </div>

                  {activeProject && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-amber-300/60 dark:hover:border-amber-700/50 transition-colors">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 font-semibold">
                          <FolderKanban size={13} className="text-amber-500 shrink-0" />
                          <span>Tiến độ Kanban</span>
                        </span>
                        <b className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                          {activeProject.doneTasksCount}/{activeProject.totalTasksCount} thẻ
                        </b>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-300/60 dark:hover:border-indigo-700/50 transition-colors">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 font-semibold">
                          <GitFork size={13} className="text-indigo-500 shrink-0" />
                          <span>Hoạt động Git Hub</span>
                        </span>
                        <b className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                          {activeProject.commitsCount} commit · {activeProject.prsCount} PR
                        </b>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-300/60 dark:hover:border-emerald-700/50 transition-colors">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 font-semibold">
                          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                          <span>Trạng thái Bảo vệ Chính thức</span>
                        </span>
                        <b className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                          {activeProject.isGraded
                            ? `${activeProject.officialFinalScore?.toFixed(2)} / 10 (Đã chấm)`
                            : `Chờ chấm Hội đồng (${activeProject.practiceCount ?? 0} lượt tập)`}
                        </b>
                      </div>
                    </div>
                  )}

                  {activeProject && !activeProject.aiDefenseEnabled && (
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <ShieldAlert size={16} className="text-rose-500 shrink-0" />
                      <span>
                        Phòng Luyện tập AI cho học phần {activeProject.courseCode} đang được
                        Quản trị viên tạm khóa. Hãy liên hệ Giảng viên hoặc chọn đồ án khác.
                      </span>
                    </div>
                  )}

                  {actionError && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Điểm AI chỉ đo Độ sẵn sàng trước khi lên Hội đồng trực tiếp.
                    </span>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStudentTab("dossier")}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <FileText size={14} className="text-amber-600 dark:text-amber-400" />
                        <span>Xem / Nộp Hồ sơ Bảo vệ</span>
                      </button>
                      <button
                        type="button"
                        disabled={
                          isStartingSession ||
                          !activeProject ||
                          !activeProject.aiDefenseEnabled ||
                          activeProject.isMyProject === false
                        }
                        title={
                          activeProject?.isMyProject === false
                            ? "Bạn chỉ có thể khởi tạo phiên luyện tập trên đồ án mà bạn là thành viên."
                            : undefined
                        }
                        onClick={() => void handleStartDefenseSession()}
                        className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-slate-950 bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={16} />
                        <span>
                          {isStartingSession
                            ? "Đang đọc dự án & sinh câu hỏi..."
                            : "Bắt đầu Luyện tập Phản biện AI"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={`practice-live-${liveDefenseId}-r${currentRoundIdx}-${stagePhase}`} className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 space-y-5 shadow-xs">
                  {/* Top Round & Phase Banner */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{currentRound.phaseTitle}</span>
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Vòng {currentRoundIdx + 1}/{rounds.length} ·{" "}
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                          {stagePhase === "speaking" || stagePhase === "council_deliberating"
                            ? "Bước 1: Trình bày luận điểm"
                            : stagePhase === "drilldown_question" ||
                              stagePhase === "drilldown_evaluating"
                            ? "Bước 2: Phản biện vặn lại"
                            : "Phán quyết vòng thi"}
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMentorHint((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <Sparkles size={13} className="text-amber-500" />
                      <span>{showMentorHint ? "Ẩn gợi ý" : "Gợi ý Socratic"}</span>
                    </button>
                  </div>

                  {showMentorHint && (
                    <div className="p-3.5 rounded-2xl bg-slate-50/75 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                      <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <b>Gợi ý hướng bảo vệ:</b> {currentRound.mentorHint}
                      </div>
                    </div>
                  )}

                  {/* Question Statement */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F8BD57] via-[#F29B23] to-[#EE8420] text-slate-950 shadow-xs shadow-amber-500/25 flex items-center justify-center font-black text-sm shrink-0">
                        Q
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                          {speakingJury.name} chất vấn:
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white leading-relaxed">
                          {currentRound.question}
                        </h3>
                      </div>
                    </div>

                    {currentRound.evidenceRef ? (
                      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 px-4 py-3 text-xs space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <FolderGit2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>Ngữ cảnh Dự án Thật AI đang đọc:</span>
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-mono text-[11.5px]">
                          {currentRound.evidenceRef}
                          {practiceEvidenceMeta?.demoUrl ? ` · Demo: ${practiceEvidenceMeta.demoUrl}` : ""}
                        </p>
                      </div>
                    ) : (
                      currentRound.contextCodeSnippet && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-4 font-mono text-xs">
                          <div className="text-[10.5px] text-slate-400 pb-2 mb-2 border-b border-slate-800 flex justify-between gap-2 flex-wrap">
                            <span>{currentRound.contextCodeSnippet.caption}</span>
                            <span className="text-amber-400">
                              {currentRound.contextCodeSnippet.lang}
                            </span>
                          </div>
                          <pre className="overflow-x-auto text-[11.5px] leading-relaxed">
                            <code>{currentRound.contextCodeSnippet.code}</code>
                          </pre>
                        </div>
                      )
                    )}
                  </div>

                  {actionError && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* STEP 1: STUDENT ORAL DEFENSE */}
                  {stagePhase === "speaking" && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setDefenseMode("oral")}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                              defenseMode === "oral"
                                ? "bg-white dark:bg-[#14161F] text-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 shadow-2xs"
                                : "text-slate-500 dark:text-slate-300"
                            }`}
                          >
                            <Terminal size={13} className={defenseMode === "oral" ? "text-[#EE8420]" : undefined} />
                            <span>Tự trình bày</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDefenseMode("sample")}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                              defenseMode === "sample"
                                ? "bg-white dark:bg-[#14161F] text-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 shadow-2xs"
                                : "text-slate-500 dark:text-slate-300"
                            }`}
                          >
                            <FileCode2 size={13} className={defenseMode === "sample" ? "text-[#EE8420]" : undefined} />
                            <span>Luận điểm gợi ý</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleMic}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          {isListeningMic && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                          {isListeningMic ? (
                            <MicOff size={14} className="text-rose-500" />
                          ) : (
                            <Mic size={14} className="text-indigo-500 dark:text-indigo-400" />
                          )}
                          <span>{isListeningMic ? "Đang nghe..." : "Nhập giọng nói"}</span>
                        </button>
                      </div>

                      {defenseMode === "oral" ? (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-4 focus-within:border-amber-400 dark:focus-within:border-amber-500/70 focus-within:ring-2 focus-within:ring-amber-500/15 focus-within:bg-white dark:focus-within:bg-slate-900/80 transition-all">
                            <textarea
                              rows={4}
                              value={studentSpeech}
                              onChange={(e) => {
                                setStudentSpeech(e.target.value);
                                setActionError(null);
                              }}
                              placeholder={currentRound.placeholderExample}
                              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />

                            <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-1">
                                Chèn từ khóa:
                              </span>
                              {currentRound.suggestedKeywords.map((kw) => (
                                <button
                                  key={kw}
                                  type="button"
                                  onClick={() => handleInsertKeyword(kw)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400/80 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 hover:text-amber-900 dark:hover:text-amber-300 transition cursor-pointer"
                                >
                                  <span className="text-amber-500 mr-0.5">+</span>
                                  {kw}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span
                              className={`text-xs ${
                                studentSpeech.trim().length >= 10
                                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {studentSpeech.trim().length} ký tự (tối thiểu 10 ký tự)
                            </span>
                            <button
                              type="button"
                              disabled={studentSpeech.trim().length < 10}
                              onClick={() => void handleSubmitOralDefense()}
                              className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send size={14} />
                              <span>Trình bày Luận điểm trước Hội đồng</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {currentRound.sampleArguments.map((arg) => (
                            <button
                              key={arg.id}
                              type="button"
                              onClick={() => {
                                setStudentSpeech(arg.text);
                                setDefenseMode("oral");
                              }}
                              className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-amber-300 dark:hover:border-amber-700/70 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1">
                                <span className="text-slate-900 dark:text-white">
                                  {arg.label}
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                                  Nạp luận điểm →
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                "{arg.text}"
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {stagePhase === "council_deliberating" && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                      <BrainCircuit size={18} className="animate-spin text-amber-500" />
                      <span>Hội đồng AI đang phân tích và chấm điểm luận điểm trên server...</span>
                    </div>
                  )}

                  {/* STEP 2: DRILL-DOWN CHALLENGE */}
                  {(stagePhase === "drilldown_question" ||
                    stagePhase === "drilldown_evaluating") && (() => {
                    const step1Accent = lastEvaluation
                      ? getDefenseScoreAccent(lastEvaluation.roundScore)
                      : null;
                    return (
                      <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/45 space-y-4">
                        {lastEvaluation && step1Accent && (
                          <div
                            className="p-3.5 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200/90 dark:border-slate-800 text-xs flex items-start sm:items-center justify-between flex-wrap gap-2.5 shadow-2xs"
                          >
                            <span className="text-slate-700 dark:text-slate-200 leading-relaxed flex-1 min-w-[200px]">
                              <b className="text-slate-900 dark:text-white">Đánh giá bước 1:</b>{" "}
                              {lastEvaluation.feedback}
                            </span>
                            <span
                              className={`font-mono font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${step1Accent.pillCls}`}
                            >
                              {lastEvaluation.roundScore}/100
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <BrainCircuit size={15} />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                              {currentRound.drillDownChallenge.challengeTitle}
                            </span>
                            <h4 className="text-sm font-black text-slate-950 dark:text-white mt-0.5">
                              {currentRound.drillDownChallenge.criticName} hỏi xoáy sâu:
                            </h4>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 italic font-semibold shadow-2xs">
                          "{currentRound.drillDownChallenge.criticQuestion}"
                        </div>

                        <div className="space-y-2.5">
                          {currentRound.drillDownChallenge.rebuttalOptions.map((reb, i) => (
                            <button
                              key={reb.id}
                              type="button"
                              disabled={stagePhase === "drilldown_evaluating"}
                              onClick={() => void handleSelectRebuttal(reb.id)}
                              className="group w-full text-left p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:border-amber-400/90 dark:hover:border-amber-500/60 hover:bg-amber-50/45 dark:hover:bg-amber-950/20 hover:shadow-xs transition-all flex items-start gap-3 cursor-pointer disabled:opacity-50"
                            >
                              <span className="w-7 h-7 rounded-lg bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0 transition-colors">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                                {reb.answer}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* STEP 3: VERDICT */}
                  {stagePhase === "verdict" && lastEvaluation && (() => {
                    const verdictAccent = getDefenseScoreAccent(lastEvaluation.roundScore);
                    return (
                      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                            <Award size={18} className="text-amber-500" />
                            <span>Kết quả đánh giá Vòng {currentRoundIdx + 1}</span>
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${verdictAccent.pillCls}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${verdictAccent.dotCls}`} />
                            <span>Điểm vòng: {lastEvaluation.roundScore}/100</span>
                          </span>
                        </div>

                        <div
                          className="p-3.5 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200"
                        >
                          {lastEvaluation.feedback}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-3">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {lastEvaluation.impactText && (
                              <>
                                Tác động kiến trúc: <b>{lastEvaluation.impactText}</b>
                              </>
                            )}
                          </span>

                          <button
                            type="button"
                            disabled={busyKey === "complete"}
                            onClick={() => void handleNextOrFinish()}
                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 shadow-md cursor-pointer disabled:opacity-50"
                          >
                            <span>
                              {currentRoundIdx < rounds.length - 1
                                ? "Sang vòng luyện tập kế tiếp"
                                : busyKey === "complete"
                                ? "Đang tổng hợp Readiness..."
                                : "Hoàn tất Lượt Luyện Tập"}
                            </span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: LIVE SCOREBOARD & LINKS */}
            <aside className="space-y-5">
              <div className="rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-[#EE8420]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Chỉ số Sẵn sàng (Mock)
                    </h4>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono ${
                      hasScoredAnyRound
                        ? rankMeta.cls
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {hasScoredAnyRound ? rankMeta.text : "CHƯA TẬP"}
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Kiến trúc & Patterns",
                      score: scores.architecture,
                      color: "#f59e0b",
                    },
                    {
                      label: "Thuật toán & Dữ liệu",
                      score: scores.algorithm,
                      color: "#8b5cf6",
                    },
                    {
                      label: "Vận hành & Bảo mật",
                      score: scores.production,
                      color: "#10b981",
                    },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 dark:text-slate-400">{m.label}</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {hasScoredAnyRound ? `${m.score.toFixed(1)}/10` : "-- / 10"}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${hasScoredAnyRound ? (m.score / 10) * 100 : 0}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {activeProject && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Minh chứng Git thực tế:
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {activeProject.commitsCount} commits · {activeProject.prsCount} PR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeProject.repoUrl
                        ? `Kho mã nguồn: ${activeProject.repoUrl}`
                        : "Chưa gắn kho GitHub cho đồ án này."}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Điều khiển phòng thi
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    resetLocalDefenseState();
                    showToast("Đã đặt lại trạng thái phòng thi về ban đầu.");
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Bắt đầu lại lượt phản biện</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("projects")}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FolderKanban size={14} className="text-[#EE8420]" />
                  <span>Xem Danh sách Đồ án</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ── MODAL BIÊN BẢN NGHIỆM THU (PORTALED + REAL BLOB/PRINT EXPORT) ── */}
      {certificateData &&
        createPortal(
          <div
            onClick={() => setCertificateData(null)}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs marlo-scrim"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Biên bản Nghiệm thu Bảo vệ Đồ án"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-900 dark:text-white marlo-modal"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#EE8420] items-center justify-center text-slate-950 shadow-lg">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-xl font-black">
                  Báo Cáo Luyện Tập Phản Biện AI (Mock Readiness)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chỉ số Readiness giúp bạn tự kiểm tra lỗ hổng trước khi bảo vệ. Điểm chính thức do Hội đồng chấm tại buổi Demo trực tiếp.
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Mã phiên tập: {certificateData.defenseId}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Học viên:</span>
                  <b className="text-right">
                    {workspace?.user?.name} ({workspace?.user?.studentCode})
                  </b>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Đồ án:</span>
                  <b className="text-right">{activeProject?.name}</b>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Độ sẵn sàng Phản biện (Mock):</span>
                  <b className="font-mono text-slate-900 dark:text-white text-sm">
                    {certificateData.finalDefenseScore}% (Chưa phải điểm chính thức)
                  </b>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  {certificateData.coherenceSummary}
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCertificateData(null);
                    setStudentTab("official");
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                >
                  <ShieldCheck size={14} />
                  <span>Xem Kết quả Hội đồng Chính thức</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCertificateHtml}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Tải ghi chú (.html)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateData(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {toastMsg && <MarloToast message={toastMsg} />}
    </div>
  );
}

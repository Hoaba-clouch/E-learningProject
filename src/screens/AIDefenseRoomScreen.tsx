import { useState, useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import {
  ShieldCheck,
  Award,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  FileCheck2,
  FolderKanban,
  HelpCircle,
  Laptop,
  Layers,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
  ArrowRight,
  ChevronRight,
  Download,
  Share2,
  AlertTriangle,
  Lightbulb,
  Radio,
  FileCode2,
  Terminal,
} from "lucide-react";
import type { Screen } from "../App";
import { CNTT_PROJECTS, type CNTTProjectItem } from "./MarloProjectsScreen";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import {
  completeDefenseSession,
  respondDefenseRound,
  startDefenseSession,
} from "../api";

interface Props {
  onNavigate?: (screen: Screen) => void;
  initialProjectId?: string;
}

// ─── AI COUNCIL JURY MEMBERS ───
interface JuryMember {
  id: string;
  name: string;
  title: string;
  avatar: string;
  role: "chairman" | "critic" | "industry";
  institution: string;
  persona: string;
  focus: string;
  satisfaction: number; // 0 - 100
  status: "idle" | "speaking" | "evaluating" | "challenging";
  colorHex: string;
}

const DEFAULT_JURY: JuryMember[] = [
  {
    id: "jury-1",
    name: "TS. Trần Anh Tuấn",
    title: "Chủ tịch Hội đồng Khảo thí",
    avatar: "AT",
    role: "chairman",
    institution: "Viện Nghiên cứu CNTT & AI",
    persona: "Khắt khe về kiến trúc tổng thể, Design Patterns & nguyên lý SOLID.",
    focus: "System Architecture & Design Patterns",
    satisfaction: 88,
    status: "speaking",
    colorHex: "#f59e0b",
  },
  {
    id: "jury-2",
    name: "ThS. Lê Hoàng Yến",
    title: "Ủy viên Phản biện Thuật toán",
    avatar: "HY",
    role: "critic",
    institution: "Bộ môn Khoa học Máy tính",
    persona: "Soi xét cực sâu về độ phức tạp Big-O, Race Condition & rò rỉ bộ nhớ.",
    focus: "Algorithm & Memory Profiling",
    satisfaction: 82,
    status: "idle",
    colorHex: "#8b5cf6",
  },
  {
    id: "jury-3",
    name: "KS. Nguyễn Bảo Long",
    title: "Chuyên gia Tech Lead Doanh nghiệp",
    avatar: "BL",
    role: "industry",
    institution: "Principal Architect Viettel / VNG",
    persona: "Đánh giá mức độ sẵn sàng production, bảo mật, chịu tải & văn hóa DevOps.",
    focus: "Production Readiness & Security",
    satisfaction: 92,
    status: "idle",
    colorHex: "#10b981",
  },
];

// ─── DEFENSE QUESTION SCENARIOS BY PROJECT ───
interface DefenseRound {
  roundNumber: number;
  phaseTitle: string;
  jurySpeakerId: string;
  question: string;
  contextCodeSnippet?: {
    lang: string;
    code: string;
    caption: string;
  };
  suggestedKeywords: string[];
  sampleArguments: {
    id: string;
    label: string;
    text: string;
    type: "optimal" | "acceptable" | "flawed";
  }[];
  drillDownChallenge: {
    criticJuryId: string;
    criticName: string;
    challengeTitle: string;
    criticQuestion: string;
    rebuttalOptions: {
      id: string;
      answer: string;
      score: number;
      feedback: string;
      architectureImpact: string;
    }[];
  };
  mentorHint: string;
}

const DEFENSE_SCENARIOS: Record<string, DefenseRound[]> = {
  "prj-codemind": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Kiến trúc Tổng thể & Socratic RAG Pipeline",
      jurySpeakerId: "jury-1",
      question:
        "Khi hàng nghìn sinh viên cùng đặt câu hỏi debug đồng thời vào lúc 2h sáng, làm sao pipeline Socratic AI của bạn đảm bảo độ trễ phản hồi < 450ms mà không làm quá tải LLM Gateway và cạn kiệt API token?",
      contextCodeSnippet: {
        lang: "cpp",
        code: `// Core Socratic Gateway Dispatcher
class SocraticRAGDispatcher {
public:
    Response dispatchQuery(const StudentQuery& q) {
        auto cacheKey = hashASTContext(q.codeAST, q.errorSignal);
        if (auto hit = mL2Cache.lookup(cacheKey)) {
            return hit->synthesizeIncrementalHint(q.studentLevel);
        }
        return mVectorCluster.querySemanticNearest(q);
    }
};`,
        caption: "SocraticRAGDispatcher::dispatchQuery (Core Engine)",
      },
      suggestedKeywords: [
        "Multi-tier LRU Cache",
        "Băm cây cú pháp AST Hash",
        "Semantic Vector Qdrant",
        "Threshold Similarity > 85%",
        "Async LLM Gateway Queue",
      ],
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Kiến trúc Bền vững (Tiered Semantic Cache)",
          text: "Kính thưa Hội đồng, em thiết kế hệ thống Cache đa tầng: Tầng L1 LRU tại In-memory của từng Pod để giải quyết các lỗi cú pháp lặp lại; Tầng L2 Semantic Vector Cache băm cây cú pháp AST kết hợp Qdrant. Chỉ khi similarity < 85% mới gửi prompt tới LLM nền.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Mở rộng Hạ tầng (Horizontal Pod Autoscaling)",
          text: "Em dùng RabbitMQ làm hàng đợi đệm phía trước, sau đó cấu hình HPA Kubernetes scale ngang thêm 10 Pods worker để tiêu thụ thông điệp bất đồng bộ.",
          type: "acceptable",
        },
        {
          id: "arg-3",
          label: "Luận điểm Hạn chế Truy cập (Strict Rate Limiting)",
          text: "Em áp dụng Rate-limit mỗi IP sinh viên chỉ được gửi tối đa 3 câu hỏi trong vòng 10 phút để bảo vệ server khỏi bị sập.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Thuật toán: AST Obfuscation & Collision",
        criticQuestion:
          "Ý tưởng băm cây AST rất thông minh! Nhưng Thầy/Cô hỏi xoáy sâu hơn: Nếu sinh viên cố tình đổi tên biến, chèn thêm comment rác hoặc viết macro #define để qua mặt bộ băm, em chuẩn hóa (canonicalize) AST thế nào để Cache hit rate không bị sụt giảm?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Em tiền xử lý qua Clang AST Consumer: Tẩy sạch toàn bộ comment, chuẩn hóa danh xưng biến cục bộ thành dạng alpha-conversion (x1, x2) và unroll macro trước khi tạo mã băm MurmurHash3 của cây cú pháp trừu tượng.",
            score: 98,
            feedback:
              "Phản biện xuất sắc! ThS. Lê Hoàng Yến hoàn toàn bị thuyết phục bởi cơ chế Alpha-conversion chuẩn hóa biến và Clang Preprocessor.",
            architectureImpact: "Giữ vững Cache hit rate 78% kể cả khi mã nguồn bị biến hình.",
          },
          {
            id: "reb-2",
            answer:
              "Em dùng regex xóa hết khoảng trắng và các dòng bắt đầu bằng dấu // rồi mới băm SHA-256.",
            score: 60,
            feedback:
              "Chưa chặt chẽ. Regex không thể phân biệt được comment nằm bên trong chuỗi string literal và không xử lý được biến đổi cấu trúc AST.",
            architectureImpact: "Dễ bị lọt test case và tỷ lệ cache miss tăng cao.",
          },
        ],
      },
      mentorHint:
        "Hãy nêu bật tính năng Canonicalization của Clang AST và kỹ thuật Alpha-conversion để khử nhiễu mã nguồn trước khi băm.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Tối ưu Bộ nhớ & Quản trị Con trỏ ảo vtable",
      jurySpeakerId: "jury-2",
      question:
        "Trong bộ chấm bài tự động C++20 của CodeMind, bạn phân tích vtable và virtual method dispatch như thế nào để phát hiện sinh viên cố tình can thiệp vào bảng vptr hòng bypass test case ẩn?",
      suggestedKeywords: [
        "Linux cgroup Isolation",
        "Clang AddressSanitizer (-fsanitize=address)",
        "ELF Binary Symbol Layout",
        "ABI vtable offset check",
      ],
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Kiểm tra nhị phân Sandbox (ASan & ELF Layout)",
          text: "Thưa Thầy Cô, hệ thống chạy binary của sinh viên trong Linux cgroup Sandbox cô lập, biên dịch với cờ -fsanitize=address,undefined và đối chiếu trực tiếp địa chỉ offset của vptr trên bảng symbol ELF với chuẩn ABI.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Quét mã nguồn tĩnh (Static Regex Guard)",
          text: "Hệ thống dùng bộ lọc mã nguồn tĩnh quét từ khóa reinterpret_cast và chặn con trỏ ép kiểu nguy hiểm.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long (Tech Lead)",
        challengeTitle: "Chất vấn Production: Overhead Hiệu năng Sandbox",
        criticQuestion:
          "Bật AddressSanitizer (-fsanitize=address) thường làm phình bộ nhớ từ 2-3x và giảm tốc độ chạy binary tới 40%. Khi có 500 bài nộp đồng thời, giải pháp của bạn đảm bảo tài nguyên server không bị OOM (Out-of-memory) thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Em áp dụng Kiến trúc Chấm 2 tầng (Two-phase Execution): Chạy Fast-path biên dịch tối ưu -O2 không ASan để lọc 80% bài đúng cơ bản; chỉ chuyển sang Deep ASan Sandbox khi phát hiện bất thường về con trỏ hoặc tín hiệu SIGSEGV.",
            score: 97,
            feedback:
              "Tư duy Production rất thực tế! Bảo Long (Tech Lead) đánh giá cực cao chiến lược Fast-path / Slow-path giúp tiết kiệm 70% RAM cluster.",
            architectureImpact: "Tiết kiệm 72% chi phí cloud worker, tránh tuyệt đối lỗi OOM.",
          },
          {
            id: "reb-2",
            answer:
              "Em giới hạn mỗi container chỉ được tối đa 64MB RAM, nếu vượt quá thì server tự động hủy bài nộp.",
            score: 55,
            feedback:
              "Hạn chế 64MB quá thấp đối với ASan runtime, sẽ làm chết oan các bài nộp hợp lệ của sinh viên.",
            architectureImpact: "Gây tỷ lệ False Positive lên đến 35%.",
          },
        ],
      },
      mentorHint:
        "Tư duy như một kỹ sư Production: hãy tách luồng kiểm tra nhanh (Fast-path) và luồng phân tích sâu (Deep ASan).",
    },
    {
      roundNumber: 3,
      phaseTitle: "Vòng 3: Khảo thí Thực tế & Cơ chế Anti-Freerider",
      jurySpeakerId: "jury-3",
      question:
        "Làm sao Hội đồng tin rằng sinh viên bảo vệ này tự viết 100% mã nguồn dự án mà không phải thuê người làm hộ hoặc nhờ thành viên khác trong nhóm gánh team?",
      suggestedKeywords: [
        "Git Stream Commit Timeline",
        "Code Lab Keystroke Telemetry",
        "Ràng buộc H2 (R-H2)",
        "Câu hỏi ngẫu nhiên biến thể",
      ],
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Bằng chứng Kép (Git Stream & Telemetry)",
          text: "Hệ thống bảo vệ dựa trên Cơ chế Bằng chứng kép: Đối chiếu lịch sử Git Stream chi tiết theo từng commit nhỏ kèm telemetry gõ phím tại Code Lab, kết hợp bộ câu hỏi ngẫu nhiên đào sâu kiến trúc tại phòng phản biện.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Báo cáo Word & Trắc nghiệm Giấy",
          text: "Dựa vào bản báo cáo đồ án dày 60 trang và chữ ký cam kết liêm chính học thuật của sinh viên.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-1",
        criticName: "TS. Trần Anh Tuấn (Chủ tịch Hội đồng)",
        challengeTitle: "Chất vấn Kiến trúc: Phát hiện mã nguồn do AI Gen",
        criticQuestion:
          "Hiện nay sinh viên rất dễ copy code từ ChatGPT rồi commit lên Git từng phần một cách tinh vi. Hệ thống của bạn phân biệt giữa một kỹ sư thực thụ tự suy nghĩ logic và một người chỉ chép mã từ AI như thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Hệ thống đo đạc Chỉ số Tốc độ Tư duy (Cognitive Refactoring Metric): Phân tích lịch sử sửa lỗi cú pháp dở dang, thời gian dừng suy nghĩ giữa các dòng code và kiểm tra phản xạ trả lời biến thể kiến trúc trực tiếp tại phòng thi 1:1 này.",
            score: 99,
            feedback:
              "Chủ tịch Hội đồng hoàn toàn nhất trí! Không có AI nào có thể làm giả được phản xạ giải thích logic trực tiếp trước hội đồng chuyên gia.",
            architectureImpact: "Chỉ số tin cậy đồ án đạt 99.6%, chứng chỉ được doanh nghiệp chấp nhận ngay.",
          },
          {
            id: "reb-2",
            answer:
              "Em dùng công cụ quét đạo văn AI Detector trên mạng để kiểm tra tỷ lệ phần trăm văn bản.",
            score: 50,
            feedback:
              "AI Detector đối với mã nguồn C++ có tỷ lệ sai số rất lớn và không thể dùng làm bằng chứng pháp lý học thuật.",
            architectureImpact: "Thiếu bằng chứng xác thực khoa học.",
          },
        ],
      },
      mentorHint:
        "Tập trung vào tính năng đo lường phong cách viết code thực tế và phản biện trực tiếp không thể gian lận.",
    },
  ],
  "prj-ecommerce": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Saga Pattern & Đảm bảo Tính nhất quán Eventual Consistency",
      jurySpeakerId: "jury-1",
      question:
        "Trong hệ thống Microservices Thương mại điện tử của bạn, nếu Payment Service đã trừ tiền thành công nhưng Inventory Service bị sập khi cập nhật kho, cơ chế Saga xử lý bù trừ (Compensating Transaction) như thế nào để khách không bị mất tiền oan?",
      suggestedKeywords: [
        "Orchestrated Saga Pattern",
        "Transactional Outbox",
        "Compensate Command Kafka",
        "Idempotency Key",
      ],
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Orchestrated Saga & Transactional Outbox",
          text: "Em áp dụng Orchestrated Saga với Transactional Outbox: Khi Inventory phát sinh lỗi, Saga Orchestrator sẽ bắn lệnh PaymentCompensateCommand qua topic Kafka riêng để hoàn tiền vào ví khách hàng với Idempotency Key chống hoàn tiền 2 lần.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long (Tech Lead)",
        challengeTitle: "Chất vấn Phân tán: Network Partition & Split-brain",
        criticQuestion:
          "Nếu trong lúc gửi lệnh hoàn tiền, mạng bị đứt (Network Partition) khiến Kafka broker không nhận được ACK, làm sao bạn tránh được tình trạng tài khoản bị treo vô thời hạn?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Sử dụng Dead Letter Queue (DLQ) kết hợp Exponential Backoff Retry và cơ chế Polling Publisher quét lại bảng Outbox chưa hoàn tất trong CSDL để gửi lại thông điệp khi mạng hồi phục.",
            score: 98,
            feedback:
              "Rất chính xác! Chuẩn thiết kế Enterprise cấp tập đoàn.",
            architectureImpact: "Không thất thoát giao dịch kể cả khi đứt cáp nội bộ.",
          },
        ],
      },
      mentorHint:
        "Nêu bật cơ chế Dead Letter Queue (DLQ) và Outbox Polling Publisher.",
    },
  ],
};

export default function AIDefenseRoomScreen({
  onNavigate,
  initialProjectId = "prj-codemind",
}: Props) {
  const [selectedProjId, setSelectedProjId] = useState<string>(initialProjectId);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0);

  // Interaction State
  const [defenseMode, setDefenseMode] = useState<"oral" | "sample">("oral");
  const [studentSpeech, setStudentSpeech] = useState<string>("");
  const [stagePhase, setStagePhase] = useState<
    "speaking" | "council_deliberating" | "drilldown_question" | "drilldown_evaluating" | "verdict"
  >("speaking");

  const [selectedRebuttalId, setSelectedRebuttalId] = useState<string | null>(null);
  const [showMentorHint, setShowMentorHint] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [defenseTimeRemaining, setDefenseTimeRemaining] = useState<number>(180);
  const [liveDefenseId, setLiveDefenseId] = useState<string | null>(null);

  const [overallScores, setOverallScores] = useState({
    architecture: 9.4,
    algorithm: 9.1,
    production: 9.6,
    antiFreeriderTrust: 99.4,
  });

  const screenRef = useRef<HTMLDivElement>(null);
  const councilRef = useRef<HTMLDivElement>(null);
  const questionBoxRef = useRef<HTMLDivElement>(null);

  // Active project
  const activeProject = useMemo(() => {
    return CNTT_PROJECTS.find((p) => p.id === selectedProjId) || CNTT_PROJECTS[0];
  }, [selectedProjId]);

  // Active scenario rounds
  const rounds = useMemo(() => {
    return DEFENSE_SCENARIOS[selectedProjId] || DEFENSE_SCENARIOS["prj-codemind"];
  }, [selectedProjId]);

  const currentRound = rounds[currentRoundIdx] || rounds[0];

  // Active speaking jury member
  const speakingJury = useMemo(() => {
    if (stagePhase === "drilldown_question" || stagePhase === "drilldown_evaluating") {
      return (
        DEFAULT_JURY.find((j) => j.id === currentRound.drillDownChallenge.criticJuryId) ||
        DEFAULT_JURY[1]
      );
    }
    return DEFAULT_JURY.find((j) => j.id === currentRound.jurySpeakerId) || DEFAULT_JURY[0];
  }, [currentRound, stagePhase]);

  // Selected Rebuttal Option data
  const selectedRebuttal = useMemo(() => {
    return currentRound.drillDownChallenge.rebuttalOptions.find((o) => o.id === selectedRebuttalId);
  }, [currentRound, selectedRebuttalId]);

  // Timer countdown
  useEffect(() => {
    if (stagePhase === "verdict") return;
    const timer = setInterval(() => {
      setDefenseTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [stagePhase]);

  // Append Keyword pill into speech
  const handleInsertKeyword = (kw: string) => {
    setStudentSpeech((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, kết hợp ${kw}` : `Em sử dụng ${kw}`;
    });
  };

  // Entrance GSAP Animation
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // 1. Stage camera reveal
      gsap.fromTo(
        ".defense-stage-header",
        { opacity: 0, y: -25, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" }
      );

      // 2. Council cards 3D tilt stagger entrance
      gsap.fromTo(
        ".defense-jury-card",
        { opacity: 0, y: 40, rotationY: 18, transformPerspective: 1000 },
        {
          opacity: 1,
          y: 0,
          rotationY: 0,
          stagger: 0.12,
          duration: 0.65,
          ease: "back.out(1.4)",
          delay: 0.15,
        }
      );

      // 3. Question box spring pop
      gsap.fromTo(
        questionBoxRef.current,
        { opacity: 0, scale: 0.92, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.45 }
      );
    }, screenRef);

    return () => ctx.revert();
  }, [selectedProjId, currentRoundIdx]);

  // Start or restart backend 3D defense session on project change
  useEffect(() => {
    let active = true;
    void startDefenseSession(selectedProjId, "class-oop").then((res) => {
      if (active && res?.defense_id) {
        setLiveDefenseId(res.defense_id);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedProjId]);

  // Submit Oral Defense -> Moves to Council Deliberation & Drill-down Challenge
  const handleSubmitOralDefense = () => {
    if (!studentSpeech.trim()) {
      alert("Vui lòng nhập hoặc chọn luận điểm bảo vệ trước Hội đồng!");
      return;
    }

    setStagePhase("council_deliberating");

    if (liveDefenseId) {
      void respondDefenseRound(
        liveDefenseId,
        currentRound.roundNumber,
        studentSpeech.trim(),
        "optimal",
        90
      ).then((res) => {
        if (res?.scores) {
          setOverallScores((prev) => ({
            ...prev,
            architecture: Number((res.scores.architecture / 10).toFixed(1)),
            algorithm: Number((res.scores.algorithm / 10).toFixed(1)),
            production: Number((res.scores.production / 10).toFixed(1)),
          }));
        }
      });
    }

    // Deliberate for 1.4s then fire Drill-Down Counter-Challenge!
    setTimeout(() => {
      setStagePhase("drilldown_question");

      gsap.fromTo(
        ".drilldown-panel",
        { opacity: 0, scale: 0.93, y: 25 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }
      );
    }, 1400);
  };

  // Submit Rebuttal for Round 2 -> Moves to Verdict
  const handleSelectRebuttal = (rebId: string) => {
    setSelectedRebuttalId(rebId);
    setStagePhase("drilldown_evaluating");

    const chosen = currentRound.drillDownChallenge.rebuttalOptions.find((o) => o.id === rebId);
    if (liveDefenseId && chosen) {
      void respondDefenseRound(
        liveDefenseId,
        currentRound.roundNumber + 10,
        chosen.answer,
        chosen.score >= 85 ? "optimal" : "flawed",
        chosen.score
      );
    }

    setTimeout(() => {
      setStagePhase("verdict");

      gsap.fromTo(
        ".defense-feedback-panel",
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.3)" }
      );
    }, 1200);
  };

  // Next Round or Finish
  const handleNextRound = () => {
    if (currentRoundIdx < rounds.length - 1) {
      setCurrentRoundIdx((prev) => prev + 1);
      setStudentSpeech("");
      setSelectedRebuttalId(null);
      setStagePhase("speaking");
      setShowMentorHint(false);
      setDefenseTimeRemaining(180);
    } else {
      if (liveDefenseId) {
        void completeDefenseSession(liveDefenseId, {
          chapter_title: `${activeProject.name.split(" - ")[0]} · Phản biện 3D`,
          repo_url: "https://github.com/nguyenvana/codemind-project-defense",
          passed_tests: 5,
          total_tests: 5,
        });
      }
      setShowCertificateModal(true);
    }
  };

  // Reset Defense
  const handleRestartDefense = () => {
    setCurrentRoundIdx(0);
    setStudentSpeech("");
    setSelectedRebuttalId(null);
    setStagePhase("speaking");
    setShowMentorHint(false);
    setShowCertificateModal(false);
    setDefenseTimeRemaining(180);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      ref={screenRef}
      className="min-h-full p-4 sm:p-6 lg:p-8 relative select-none font-sans text-slate-900 dark:text-white"
    >
      {/* ── TOP HEADER: LIVE SIMULATION ROOM STATUS ── */}
      <header className="defense-stage-header marlo-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 shadow-xs mb-6 relative overflow-hidden">
        {/* Glow ambient background effect */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Live Defense Simulation · Phản Biện Đồ Án 1:1</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Hội Đồng Khảo Thí & Phản Biện Tốt Nghiệp AI
              </span>
            </div>

            <MarloTitle
              text="Phòng Phản Biện Kỹ Thuật Đồ Án 1:1 (AI Defense Room)"
              className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            />
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Trình bày luận điểm bảo vệ đồ án và phản biện kiến trúc. Đối mặt với Hội đồng AI Tech Lead chất vấn & phản bác dồn dập.
            </p>
          </div>

          {/* Quick Select Project & Audio Control */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Project Selector Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1.5">
                <FolderKanban size={14} className="text-[#EE8420]" />
                <span className="hidden sm:inline">Đồ án:</span>
              </span>
              <select
                value={selectedProjId}
                onChange={(e) => {
                  setSelectedProjId(e.target.value);
                  handleRestartDefense();
                }}
                className="bg-white dark:bg-[#14161F] text-xs font-bold text-slate-900 dark:text-white px-3 py-1.5 rounded-xl border-none outline-none shadow-2xs cursor-pointer"
              >
                {CNTT_PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.split(" - ")[0]} ({p.budgetStr})
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                audioEnabled
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
              }`}
              title={audioEnabled ? "Đang bật âm thanh phòng thi" : "Đã tắt âm thanh"}
            >
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">
              Audio Waveform:
            </span>
            <div className="flex items-end gap-1 h-4">
              {[60, 90, 45, 100, 70, 85, 40, 95, 80, 50, 75, 90].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    stagePhase === "council_deliberating" || stagePhase === "drilldown_evaluating"
                      ? "bg-purple-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                  style={{
                    height: "35%",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Hội đồng: {speakingJury.name} ({speakingJury.title})
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <Clock size={14} className="text-amber-500" />
            <span className="text-slate-500">Thời gian phản biện:</span>
            <span
              className={`font-black text-sm px-2 py-0.5 rounded-md ${
                defenseTimeRemaining < 30
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              }`}
            >
              {formatTimer(defenseTimeRemaining)}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3 VỊ GIÁM KHẢO AI (AI COUNCIL JURY CARDS) ── */}
      <section ref={councilRef} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEFAULT_JURY.map((jury) => {
          const isSpeaking = jury.id === speakingJury.id;
          return (
            <div
              key={jury.id}
              className={`defense-jury-card relative rounded-2xl p-5 border transition-all duration-300 ${
                isSpeaking
                  ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-[#14161F] shadow-sm"
                  : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-2xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-2xs shrink-0"
                  >
                    <span>{jury.avatar}</span>
                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-900 dark:bg-slate-100 ring-2 ring-white dark:ring-[#14161F] flex items-center justify-center">
                        <Volume2 size={8} className="text-white dark:text-slate-900" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {jury.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{jury.title}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{jury.institution}</p>
                  </div>
                </div>

                <span
                  className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isSpeaking
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isSpeaking ? (stagePhase === "drilldown_question" ? "Hỏi vặn xoáy sâu" : "Đang chất vấn") : "Lắng nghe"}
                </span>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {jury.persona}
                </p>

                {/* Satisfaction bar - Đồng bộ 1 màu nhất quán */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Độ hài lòng lập luận</span>
                    <span className="font-mono text-slate-900 dark:text-white">{jury.satisfaction}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-slate-900 dark:bg-slate-200"
                      style={{
                        width: `${jury.satisfaction}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── MAIN INTERACTIVE DEFENSE STAGE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE DEFENSE STAGE */}
        <div className="space-y-5">
          {/* Active Question Box */}
          <div
            ref={questionBoxRef}
            className="marlo-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-6 sm:p-8 shadow-xs relative"
          >
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                  {currentRound.phaseTitle}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Hiệp {currentRoundIdx + 1}/{rounds.length}
                </span>
              </div>

              {/* Socratic Mentor Hint Button */}
              <button
                onClick={() => setShowMentorHint(!showMentorHint)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition cursor-pointer"
              >
                <Sparkles size={13} />
                <span>{showMentorHint ? "Ẩn gợi ý Mentor" : "Gợi ý từ Socratic Mentor"}</span>
              </button>
            </div>

            {/* Mentor Hint Box */}
            {showMentorHint && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 leading-relaxed flex items-start gap-2.5 animate-fadeIn">
                <HelpCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Lời khuyên của Socratic Mentor:</span>
                  <span>{currentRound.mentorHint}</span>
                </div>
              </div>
            )}

            {/* Question Statement */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 dark:bg-white dark:text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                  Q
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>{speakingJury.name} chất vấn:</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-relaxed">
                    {currentRound.question}
                  </h3>
                </div>
              </div>

              {/* Code Snippet if applicable */}
              {currentRound.contextCodeSnippet && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-4 font-mono text-xs">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest pb-2 mb-2 border-b border-slate-800 flex justify-between">
                    <span>{currentRound.contextCodeSnippet.caption}</span>
                    <span className="text-amber-400">cpp20 · clang-16</span>
                  </div>
                  <pre className="overflow-x-auto text-[11.5px] leading-relaxed">
                    <code>{currentRound.contextCodeSnippet.code}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* ── INTERACTIVE ORAL DEFENSE / SPEECH INPUT SECTION ── */}
            {stagePhase === "speaking" && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                {/* Mode Selector Tabs */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <button
                      onClick={() => setDefenseMode("oral")}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                        defenseMode === "oral"
                          ? "bg-white dark:bg-[#14161F] text-slate-950 dark:text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Terminal size={14} className={defenseMode === "oral" ? "text-[#EE8420]" : ""} />
                      <span>Tự do Trình bày Luận điểm</span>
                    </button>

                    <button
                      onClick={() => setDefenseMode("sample")}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                        defenseMode === "sample"
                          ? "bg-white dark:bg-[#14161F] text-slate-950 dark:text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <FileCode2 size={14} />
                      <span>Tham khảo Luận điểm mẫu</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {defenseMode === "oral" ? "✍️ Tự do gõ lập luận hoặc chèn từ khóa" : "📑 Chọn câu mẫu từ Senior Lead"}
                  </span>
                </div>

                {defenseMode === "oral" ? (
                  <div className="space-y-3">
                    {/* Freeform Oral Speech Textarea */}
                    <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4 focus-within:border-[#EE8420] focus-within:ring-2 focus-within:ring-[#EE8420]/20 transition-all">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-500 flex items-center gap-1.5">
                          <Terminal size={14} className="text-[#EE8420]" />
                          <span>Luận điểm phát biểu của học viên:</span>
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400">
                          Tự do biên soạn hoặc bấm chọn từ khóa bên dưới
                        </span>
                      </div>

                      <textarea
                        rows={4}
                        value={studentSpeech}
                        onChange={(e) => setStudentSpeech(e.target.value)}
                        placeholder="Kính thưa Hội đồng, để giải quyết bài toán chịu tải và giảm độ trễ, em xin bảo vệ phương án: Ở đây em phân tách L1 In-memory Cache LRU tại từng Pod..."
                        className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed resize-none font-medium placeholder:text-slate-400"
                      />

                      {/* Quick Technical Keywords Insert Bar */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                          + Chèn nhanh luận điểm:
                        </span>
                        {currentRound.suggestedKeywords.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => handleInsertKeyword(kw)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#EE8420] hover:text-[#EE8420] transition cursor-pointer shadow-2xs"
                          >
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Submit Speech */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400">
                        {studentSpeech.length} ký tự phát biểu
                      </span>

                      <button
                        onClick={handleSubmitOralDefense}
                        className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs sm:text-sm font-black text-[#1C1304] bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 active:scale-95 shadow-md shadow-amber-500/20 transition cursor-pointer"
                      >
                        <Send size={15} />
                        <span>Trình bày Luận điểm trước Hội đồng</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Sample Presets Tab */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Chọn 1 luận điểm mẫu để nạp nhanh vào bài phát biểu của bạn:
                    </p>
                    {currentRound.sampleArguments.map((arg) => (
                      <div
                        key={arg.id}
                        onClick={() => {
                          setStudentSpeech(arg.text);
                          setDefenseMode("oral");
                        }}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-amber-400 hover:bg-amber-500/5 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-slate-900 dark:text-white group-hover:text-amber-600">
                            {arg.label}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-amber-500">
                            Bấm để nạp câu trả lời này →
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          "{arg.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deliberation Loading Indicator */}
            {stagePhase === "council_deliberating" && (
              <div className="mt-6 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3 animate-pulse">
                <div className="flex items-center justify-center gap-2.5 text-sm font-black text-amber-700 dark:text-amber-400">
                  <BrainCircuit size={20} className="animate-spin text-[#EE8420]" />
                  <span>Hội đồng AI đang phân tích luận điểm âm thanh & đối chiếu mã nguồn...</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  TS. Tuấn đang gật đầu đánh giá sơ bộ... ThS. Yến chuẩn bị đặt câu hỏi phản biện xoáy sâu!
                </p>
              </div>
            )}

            {/* ── DRILL-DOWN COUNTER-CHALLENGE (HIỆP 2: HỘI ĐỒNG VẶN LẠI DỒN DẬP) ── */}
            {(stagePhase === "drilldown_question" || stagePhase === "drilldown_evaluating") && (
              <div className="drilldown-panel mt-6 p-6 rounded-2xl border-2 border-purple-500/40 bg-purple-50/20 dark:bg-purple-950/20 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-xs">
                      ⚡
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        {currentRound.drillDownChallenge.challengeTitle}
                      </span>
                      <h4 className="text-sm font-black text-slate-950 dark:text-white">
                        {currentRound.drillDownChallenge.criticName} phản bác xoáy sâu:
                      </h4>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 uppercase animate-pulse">
                    Hiệp 2: Vặn lại trực tiếp
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#14161F] border border-purple-200 dark:border-purple-800/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-semibold italic">
                  "{currentRound.drillDownChallenge.criticQuestion}"
                </div>

                {/* Drilldown Rebuttal Choices */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Lập luận đối đáp hiệp 2 để bảo vệ đồ án:</span>
                    <span className="text-purple-500 font-semibold text-[11px]">Đòi hỏi tư duy bản lĩnh kỹ sư</span>
                  </div>

                  <div className="space-y-3">
                    {currentRound.drillDownChallenge.rebuttalOptions.map((reb, i) => (
                      <button
                        key={reb.id}
                        disabled={stagePhase === "drilldown_evaluating"}
                        onClick={() => handleSelectRebuttal(reb.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                          selectedRebuttalId === reb.id
                            ? "border-purple-500 bg-purple-500/15 shadow-sm ring-2 ring-purple-500/30"
                            : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-400"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            selectedRebuttalId === reb.id
                              ? "bg-purple-600 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                            {reb.answer}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {stagePhase === "drilldown_evaluating" && (
                  <div className="p-3 text-center text-xs font-bold text-purple-600 dark:text-purple-400 animate-pulse">
                    Hội đồng đang thống nhất biểu quyết điểm số cuối cùng...
                  </div>
                )}
              </div>
            )}

            {/* ── VERDICT & FINAL ASSESSMENT PANEL ── */}
            {stagePhase === "verdict" && selectedRebuttal && (
              <div className="defense-feedback-panel mt-6 p-6 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/15 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-[#EE8420]" />
                    <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-white">
                      Phán quyết & Kết quả Bảo vệ của Hội đồng AI:
                    </h4>
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/30">
                    Điểm vòng này: {selectedRebuttal.score}/100
                  </span>
                </div>

                {/* Speech recap */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <span className="font-bold text-slate-400 block text-[11px] uppercase">
                    Bằng chứng luận điểm phát biểu của bạn:
                  </span>
                  <p className="italic">"{studentSpeech}"</p>
                </div>

                {/* Feedback */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed font-semibold">
                  "{selectedRebuttal.feedback}"
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-3">
                  <span className="text-xs text-slate-500">
                    Tác động kiến trúc:{" "}
                    <b className="text-slate-800 dark:text-slate-200">
                      {selectedRebuttal.architectureImpact}
                    </b>
                  </span>

                  <button
                    onClick={handleNextRound}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-[#1C1304] bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 active:scale-95 shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    <span>
                      {currentRoundIdx < rounds.length - 1
                        ? "Sang hiệp chất vấn kế tiếp"
                        : "Xem Biên bản Nghiệm thu"}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SCORING RADAR & VERIFICATION TELEMETRY */}
        <aside className="space-y-5">
          {/* Real-time Assessment Scores */}
          <div className="marlo-card rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-[#EE8420]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Bảng điểm Hội đồng
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                LOẠI XUẤT SẮC
              </span>
            </div>

            {/* 4 Score Metric Bars */}
            <div className="space-y-3">
              {[
                {
                  label: "Kiến trúc & Design Patterns",
                  score: overallScores.architecture,
                  max: 10,
                  color: "#f59e0b",
                },
                {
                  label: "Tối ưu Thuật toán & Bộ nhớ",
                  score: overallScores.algorithm,
                  max: 10,
                  color: "#8b5cf6",
                },
                {
                  label: "Production & Bảo mật",
                  score: overallScores.production,
                  max: 10,
                  color: "#10b981",
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">{m.label}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{m.score}/10</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(m.score / m.max) * 100}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Anti-Freerider Trust Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  Chỉ số Anti-Freerider:
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {overallScores.antiFreeriderTrust}%
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Khớp 100% với phong thái lập trình trong 47 commit Git Stream tại Code Lab.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="marlo-card rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Điều khiển phòng thi:
            </h4>
            <div className="space-y-2">
              <button
                onClick={handleRestartDefense}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Bắt đầu lại lượt phản biện</span>
              </button>

              <button
                onClick={() => onNavigate?.("projects")}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FolderKanban size={14} className="text-[#EE8420]" />
                <span>Xem hồ sơ đồ án (Projects Slate)</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── MODAL: BIÊN BẢN NGHIỆM THU & CHỨNG CHỈ TỐT NGHIỆP AI COUNCIL ── */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="text-center space-y-2">
              <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-[#EE8420] items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-2">
                <Trophy size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                Biên Bản Nghiệm Thu Bảo Vệ Đồ Án
              </h3>
              <p className="text-xs text-slate-500">
                Xác thực số: <code className="font-mono text-amber-600">CODEMIND-DEFENSE-2026-A1</code>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Học viên:</span>
                <span className="font-bold text-slate-900 dark:text-white">Nguyễn Văn A (CNTT-2026)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đề tài:</span>
                <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {activeProject.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Điểm bảo vệ:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  9.5 / 10 (Xuất Sắc)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chữ ký số Hội đồng:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  TS. Tuấn · ThS. Yến · KS. Long (Verified)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  alert("Đã tải chứng chỉ nghiệm thu bảo vệ đồ án về máy!");
                  setShowCertificateModal(false);
                }}
                className="flex-1 btn-marlo-primary btn--primary magnetic flex items-center justify-center gap-2 py-3 rounded-2xl"
              >
                <Download size={15} />
                <span>Tải Chứng chỉ PDF</span>
              </button>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

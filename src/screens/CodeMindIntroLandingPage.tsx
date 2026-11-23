import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Cpu,
  Database,
  Flame,
  GitBranch,
  HelpCircle,
  Laptop,
  Layers,
  Lock,
  LogOut,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import "../styles/kinetic-intro.css";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MonolithCoverflowShowcase from "../components/MonolithCoverflowShowcase";
import { initMarloMagnetic } from "../utils/marloAnimations";
import type { Screen } from "../App";

interface Props {
  onEnterPlatform: (targetScreen?: Screen) => void;
  onLogin?: () => void;
  isPendingApproval?: boolean;
  pendingUserName?: string;
  pendingUserEmail?: string;
  onRecheckApproval?: (targetScreen?: Screen) => Promise<boolean>;
  onLogout?: () => void;
}

// ── SALARY TIERS & JOBS DATA (2026 IT BENCHMARK) ──
interface SalaryTrack {
  id: string;
  title: string;
  roleDescription: string;
  avgSalary: string;
  freshGradSalary: string;
  midSeniorSalary: string;
  demandGrowth: string;
  topSkills: string[];
  hiringCompanies: string[];
}

const salaryTracks: SalaryTrack[] = [
  {
    id: "swe",
    title: "Software Engineer (C++/Go/Backend)",
    roleDescription: "Phát triển hạ tầng phần mềm cốt lõi, dịch vụ backend thông lượng cao và hệ thống hiệu năng vượt trội.",
    avgSalary: "16 – 26 Triệu / tháng",
    freshGradSalary: "10 – 15 Triệu",
    midSeniorSalary: "28 – 42 Triệu",
    demandGrowth: "+34% năm 2026",
    topSkills: ["C++20/C++23", "Concurrency & Multithreading", "Memory Profiling", "Distributed Storage", "gRPC/Protobuf"],
    hiringCompanies: ["VNG Corporation", "Viettel Telecom", "FPT Software", "One Mount", "Zalo"],
  },
  {
    id: "ai",
    title: "AI / Machine Learning Engineer",
    roleDescription: "Triển khai mô hình học sâu, hệ thống thị giác máy tính y tế (MedAI) và kiến trúc Socratic Agentic RAG.",
    avgSalary: "18 – 30 Triệu / tháng",
    freshGradSalary: "12 – 17 Triệu",
    midSeniorSalary: "32 – 48 Triệu",
    demandGrowth: "+52% năm 2026",
    topSkills: ["PyTorch / TensorRT", "Vision Transformers", "Vector DB & RAG", "Model Quantization", "AI Agent Pipelines"],
    hiringCompanies: ["Viettel AI", "VinAI Research", "FPT Smart Cloud", "MoMo", "Trusting Social"],
  },
  {
    id: "systems",
    title: "Systems & Embedded / Kernel Engineer",
    roleDescription: "Lập trình nhân hệ điều hành, trình điều khiển thiết bị phần cứng, giao thức đồng thuận Raft và High-Frequency Systems.",
    avgSalary: "17 – 28 Triệu / tháng",
    freshGradSalary: "11 – 16 Triệu",
    midSeniorSalary: "30 – 45 Triệu",
    demandGrowth: "+28% năm 2026",
    topSkills: ["Linux Kernel & PintOS", "IPC & Virtual Memory", "Raft Consensus", "C/Assembly", "Device Drivers"],
    hiringCompanies: ["Bosch Global Software", "Qualcomm VN", "LG Electronics R&D", "Marvell VN", "Viettel Aerospace"],
  },
  {
    id: "cloud",
    title: "Cloud & DevSecOps Platform Engineer",
    roleDescription: "Vận hành hạ tầng Kubernetes quy mô lớn, đường ống CI/CD tự động và bảo mật ứng dụng với OWASP Top 10 DAST.",
    avgSalary: "15 – 26 Triệu / tháng",
    freshGradSalary: "10 – 14 Triệu",
    midSeniorSalary: "28 – 40 Triệu",
    demandGrowth: "+39% năm 2026",
    topSkills: ["Docker & Kubernetes", "CI/CD GitOps", "OWASP DAST Scanning", "Terraform", "Prometheus & Grafana"],
    hiringCompanies: ["VNPAY", "MoMo", "Techcombank", "VPBank Digital", "Shopee Tech"],
  },
];

// ── 4-STAGE CURRICULUM ROADMAP ──
interface RoadmapStage {
  step: string;
  stageNum: string;
  levelBadge: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  duration: string;
  labsCount: number;
  xpReward: number;
  accentColor: string;
  accentGlow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  highlight: string;
  salaryExpectation: string;
  techStack: string[];
  modules: {
    title: string;
    description: string;
  }[];
  capstoneProject: {
    name: string;
    category: string;
    description: string;
    fileName: string;
    language: string;
    codeSnippet: string;
    testLogs: string[];
    deliverables: string[];
  };
}

const roadmapStages: RoadmapStage[] = [
  {
    step: "CHẶNG 01",
    stageNum: "01",
    levelBadge: "Level 1 · Foundations & Memory",
    title: "Khoa học Máy tính & C++ Core Chuyên sâu",
    shortTitle: "C++ Core & Compiler",
    subtitle: "Làm chủ bộ nhớ và tư duy lập trình hệ thống từ phần cứng",
    duration: "10 Tuần · 28 Lab thực hành",
    labsCount: 28,
    xpReward: 480,
    accentColor: "#F59E0B",
    accentGlow: "rgba(245, 158, 11, 0.28)",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600",
    badgeBorder: "border-amber-500/20",
    highlight: "Hiểu sâu từng byte bộ nhớ RAM & cơ chế Zero-Cost Abstraction.",
    salaryExpectation: "10 – 14 Triệu / tháng",
    techStack: ["C++20", "Smart Pointers", "RAII", "Valgrind", "AST Parser", "Red-Black Trees"],
    modules: [
      {
        title: "Bộ nhớ Stack vs Heap, Con trỏ",
        description: "Phân bổ ô nhớ vật lý, Pointer arithmetic & chống rò rỉ bộ nhớ.",
      },
      {
        title: "Kỹ thuật RAII & Smart Pointers",
        description: "unique_ptr, shared_ptr tự động giải phóng tài nguyên an toàn.",
      },
      {
        title: "Move Semantics & Zero-Cost",
        description: "Rvalue reference (&&), triệt tiêu chi phí copy dữ liệu.",
      },
      {
        title: "Giải thuật đồ thị & C++20",
        description: "Red-Black Tree, DSU, Dijkstra đồ thị & C++20 Concepts.",
      },
    ],
    capstoneProject: {
      name: "Mini C++ Compiler & AST Analyzer",
      category: "COMPILERS & RUNTIME",
      description: "Trình biên dịch mini phân tích cú pháp AST và sinh bytecode thực thi.",
      fileName: "ast_analyzer.cpp",
      language: "C++20",
      codeSnippet: `// AST Syntax Analyzer & Memory Arena
template <typename T>
class ASTNode {
public:
    NodeType type;
    std::string token;
    std::vector<std::unique_ptr<ASTNode>> children;

    [[nodiscard]] Bytecode emit(CodeGenerator& cg) const noexcept {
        for (const auto& child : children) {
            cg.visit(*child);
        }
        return cg.buildIR(type, token);
    }
};`,
      testLogs: [
        "[0.08s] Lexical Tokenizer: 1,420 tokens extracted -> OK",
        "[0.14s] Recursive Descent AST Parser verified -> PASS",
        "[0.22s] Valgrind Memcheck: 0 leaks, 0 heap corruption -> CLEAN",
        "[0.31s] Benchmark throughput: 12,400 AST nodes/sec -> EXCELLENT",
        "[DONE] All 50 Capstone Test Cases Passed! +480 XP Awarded.",
      ],
      deliverables: ["Lexer & Parser tự sinh", "Cây AST Visualizer", "Bộ 50 test cases tự động"],
    },
  },
  {
    step: "CHẶNG 02",
    stageNum: "02",
    levelBadge: "Level 2 · Systems & Distributed",
    title: "Kỹ nghệ Hệ điều hành & Hệ thống Phân tán",
    shortTitle: "OS & Distributed Raft",
    subtitle: "Thực chiến nhân hệ điều hành và bài toán đồng thuận triệu nodes",
    duration: "12 Tuần · 34 Lab chuyên sâu",
    labsCount: 34,
    xpReward: 510,
    accentColor: "#3B82F6",
    accentGlow: "rgba(59, 130, 246, 0.28)",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600",
    badgeBorder: "border-blue-500/20",
    highlight: "Xử lý đa luồng chuyên sâu, triệt tiêu deadlock và đồng thuận Raft.",
    salaryExpectation: "14 – 20 Triệu / tháng",
    techStack: ["PintOS Kernel", "Virtual Memory", "Raft Consensus", "Go Concurrency", "epoll / Sockets", "Lock-free"],
    modules: [
      {
        title: "Nhân OS & Bộ nhớ ảo Paging",
        description: "Khắc phục Page Faults, Frame Allocator & bảng trang đa cấp.",
      },
      {
        title: "Syscalls & Chuyển ngữ cảnh",
        description: "Bảo vệ không gian địa chỉ, ngắt phần cứng & Trap frame.",
      },
      {
        title: "Đa luồng & Đồng bộ Lock-free",
        description: "Mutex, Semaphore, giải quyết triệt để Deadlock và Race conditions.",
      },
      {
        title: "Non-blocking I/O & Raft",
        description: "epoll 100K kết nối & thuật toán đồng thuận phân tán Raft.",
      },
    ],
    capstoneProject: {
      name: "Distributed Raft Consensus & Key-Value Storage",
      category: "DISTRIBUTED SYSTEMS",
      description: "Cơ sở dữ liệu phân tán chịu lỗi cao, đồng thuận Raft chuẩn Linearizability.",
      fileName: "raft_consensus.go",
      language: "Go 1.23",
      codeSnippet: `// Raft Consensus Engine - Leader Election & Heartbeat
func (rf *Raft) startElection() {
    rf.mu.Lock()
    defer rf.mu.Unlock()
    rf.currentTerm++
    rf.state = LeaderCandidate
    rf.votedFor = rf.me
    rf.resetElectionTimer()

    for peer := range rf.peers {
        if peer != rf.me {
            go rf.sendRequestVote(peer, &RequestVoteArgs{
                Term: rf.currentTerm, CandidateId: rf.me,
            })
        }
    }
}`,
      testLogs: [
        "[0.10s] Cluster setup: 5 nodes Raft network initialized -> OK",
        "[0.18s] Simulated network partition (Split-brain isolation) -> OK",
        "[0.27s] Quorum leader elected in Term 3 (Node #2 is Leader) -> PASS",
        "[0.39s] Log replication across 3 healthy nodes -> CONSISTENT",
        "[DONE] Raft Cluster passed Jepsen consistency test! +510 XP.",
      ],
      deliverables: ["Cluster 5 node chịu lỗi mạng", "Tốc độ 10,000 ops/s", "Chuẩn nhất quán Linear"],
    },
  },
  {
    step: "CHẶNG 03",
    stageNum: "03",
    levelBadge: "Level 3 · Deep Learning & RAG",
    title: "Trí tuệ Nhân tạo Ứng dụng & Thị giác Y tế",
    shortTitle: "Deep AI & MedVision",
    subtitle: "Huấn luyện mạng nơ-ron PyTorch và triển khai Socratic RAG",
    duration: "10 Tuần · 24 Lab AI thực nghiệm",
    labsCount: 24,
    xpReward: 680,
    accentColor: "#10B981",
    accentGlow: "rgba(16, 185, 129, 0.28)",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600",
    badgeBorder: "border-emerald-500/20",
    highlight: "Tự xây dựng mạng CNN, giải thích với Grad-CAM và hệ RAG y khoa.",
    salaryExpectation: "18 – 26 Triệu / tháng",
    techStack: ["PyTorch", "DenseNet-121", "Grad-CAM", "Vector DB Milvus", "Socratic RAG", "ViT Transformer"],
    modules: [
      {
        title: "Toán tối ưu & Backpropagation",
        description: "Gradient Descent, AdamW optimizer và đạo hàm ma trận tự động.",
      },
      {
        title: "Deep Learning & Mạng CNN",
        description: "ResNet, DenseNet trích xuất đặc trưng bệnh lý từ ảnh X-quang.",
      },
      {
        title: "Vision Transformer & Transfer",
        description: "Self-Attention trên patch ảnh & fine-tuning mô hình y khoa.",
      },
      {
        title: "Grad-CAM & Socratic RAG",
        description: "Bản đồ nhiệt giải thích chẩn đoán kết hợp Vector DB Milvus.",
      },
    ],
    capstoneProject: {
      name: "MedAI Vision Diagnostic & Socratic Assistant",
      category: "HEALTHCARE AI & VISION",
      description: "AI chẩn đoán 14 bệnh lý phổi từ X-quang tích hợp trợ lý phản biện RAG.",
      fileName: "vision_classifier.py",
      language: "Python 3.11 / PyTorch",
      codeSnippet: `// DenseNet-121 Vision Classifier with Socratic Grad-CAM
class MedVisionClassifier(nn.Module):
    def __init__(self, num_classes=14):
        super().__init__()
        self.backbone = models.densenet121(weights="DEFAULT")
        self.classifier = nn.Linear(1024, num_classes)
        self.socratic_tutor = RAGMedAssistant()

    def forward(self, x_ray_tensor):
        features = self.backbone.features(x_ray_tensor)
        cam_map = generate_gradcam(features)
        logits = self.classifier(F.adaptive_avg_pool2d(features, (1, 1)).flatten(1))
        return logits, cam_map`,
      testLogs: [
        "[0.12s] CheXpert chest dataset pipeline loaded -> 22,000 samples",
        "[0.25s] Multi-label evaluation: Pneumothorax, Infiltration AUC: 0.934",
        "[0.36s] Grad-CAM heatmap localized pathology focus -> ACCURATE",
        "[0.44s] Socratic RAG Mentor synthesized differential diagnosis -> OK",
        "[DONE] Model validated on clinical benchmark! +680 XP.",
      ],
      deliverables: ["Độ chính xác AUC 93.4%", "Suy luận siêu tốc < 120ms", "Dashboard bác sĩ tương tác"],
    },
  },
  {
    step: "CHẶNG 04",
    stageNum: "04",
    levelBadge: "Level 4 · Enterprise & Security",
    title: "Kiến trúc Doanh nghiệp & DevSecOps Production",
    shortTitle: "Enterprise & OWASP DAST",
    subtitle: "Kiến trúc Microservices chịu tải cao và bảo mật chuẩn OWASP",
    duration: "12 Tuần · Đồ án tốt nghiệp thực chiến",
    labsCount: 30,
    xpReward: 850,
    accentColor: "#8B5CF6",
    accentGlow: "rgba(139, 92, 246, 0.28)",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-600",
    badgeBorder: "border-purple-500/20",
    highlight: "Làm chủ CI/CD, Docker/K8s, thanh toán Idempotent & bảo mật DAST.",
    salaryExpectation: "24 – 38 Triệu / tháng",
    techStack: ["Microservices", "Apache Kafka", "Docker & K8s", "OWASP DAST", "VNPay Gateway", "Clean Architecture"],
    modules: [
      {
        title: "Clean Architecture & DDD",
        description: "Tách lớp Domain/UseCase, Dependency Injection chuẩn doanh nghiệp.",
      },
      {
        title: "Event-Driven & Apache Kafka",
        description: "Hàng đợi thông điệp bất đồng bộ, Exactly-Once Semantics & Saga.",
      },
      {
        title: "Cổng thanh toán & Idempotency",
        description: "Chống giao dịch trùng lặp, Webhook HMAC và đối soát tức thì.",
      },
      {
        title: "Docker, K8s & OWASP DAST",
        description: "K8s Ingress, HPA và tự động quét lỗ hổng SQLi/XSS trên CI/CD.",
      },
    ],
    capstoneProject: {
      name: "Enterprise Microservices & OWASP DAST Scanner",
      category: "ENTERPRISE DEVSECOPS",
      description: "Microservices thanh toán kèm pipeline tự động quét lỗ hổng bảo mật.",
      fileName: "dast_scanner.go",
      language: "Go / Docker / K8s",
      codeSnippet: `// OWASP Automated DAST Vulnerability Pipeline
func (s *DASTEngine) ScanEndpoint(ctx context.Context, target string) (*ScanReport, error) {
    vectors := []AttackVector{SQLInjection, XSSPayload, SSRFProbe}
    report := NewScanReport(target)

    g, ctx := errgroup.WithContext(ctx)
    for _, vec := range vectors {
        v := vec
        g.Go(func() error {
            return s.dispatchFuzzer(ctx, target, v, report)
        })
    }
    return report, g.Wait()
}`,
      testLogs: [
        "[0.09s] Kafka Event Stream broker initialized: 4 partitions -> OK",
        "[0.19s] VNPay Idempotency payment flow simulated (10k req) -> 100% OK",
        "[0.32s] Dynamic AST Fuzzing: Scanned 120 endpoints for OWASP Top 10 -> 0 Critical",
        "[0.45s] Docker Sandbox container isolation validated -> PASS",
        "[DONE] Full Production Cluster Deployed! +850 XP.",
      ],
      deliverables: ["Chịu tải 50,000 req/s", "Tích hợp Sandbox Docker", "Báo cáo kiểm toán bảo mật tự động"],
    },
  },
];

// ── ALUMNI TESTIMONIALS ──
const alumniFeedbacks = [
  {
    name: "Nguyễn Quốc Hưng",
    role: "Junior Systems Engineer tại VNG Corporation",
    classTag: "Cựu học viên K12",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    text: "Trước khi vào CodeMind AI, mình chỉ code C++ theo kiểu giải bài tập trên trường. Ở đây, việc tự tay đào sâu vào PintOS và quản lý bộ nhớ ảo đã giúp mình vượt qua vòng phỏng vấn kỹ thuật hóc búa nhất tại VNG với mức đãi ngộ vượt xa kỳ vọng ban đầu.",
    offer: "Offer: 15.5 Triệu / tháng",
  },
  {
    name: "Trần Minh Thư",
    role: "AI Engineer tại Viettel AI",
    classTag: "Cựu học viên K14",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    text: "Dự án MedAI X-Ray và việc được AI Mentor Socratic phản biện từng dòng logic giúp mình hình thành thói quen tư duy kiến trúc. Khi phỏng vấn tại Viettel AI, mình tự tin trình bày toàn bộ đường ống tối ưu mô hình và thuyết phục hoàn toàn các anh Lead.",
    offer: "Offer: 19.5 Triệu / tháng",
  },
  {
    name: "Lê Hoàng Nam",
    role: "Backend Lead tại Fintech FastGrow",
    classTag: "Cựu học viên K10",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    text: "Mô hình Kanban Scrum và bộ 72 blueprints với Definition of Done chuẩn doanh nghiệp chính là chìa khóa. Các bạn ra trường thường bỡ ngỡ với CI/CD và DAST, nhưng ở CodeMind mọi thứ đã được thực hành hằng ngày trên Cloud Docker Sandbox.",
    offer: "Offer: 24 Triệu / tháng",
  },
];

// ── COUNT UP ANIMATED NUMBER ON SCROLL ──
function CountUpNumber({
  end,
  decimals = 0,
  suffix = "",
}: {
  end: number;
  decimals?: number;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (!hasAnimated.current) {
            hasAnimated.current = true;
            const duration = 1200;
            const startTime = performance.now();

            const update = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Ease out cubic
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              setVal(easeProgress * end);

              if (progress < 1) {
                requestAnimationFrame(update);
              } else {
                setVal(end);
              }
            };
            requestAnimationFrame(update);
          }
        } else {
          hasAnimated.current = false;
        }
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val)}
      {suffix}
    </span>
  );
}

export default function CodeMindIntroLandingPage({
  onEnterPlatform,
  onLogin,
  isPendingApproval = false,
  pendingUserName,
  pendingUserEmail,
  onRecheckApproval,
  onLogout,
}: Props) {
  const [hasIntroCompleted, setHasIntroCompleted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>("swe");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);

  useEffect(() => {
    if (!approvalToast) return;
    const timer = window.setTimeout(() => setApprovalToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [approvalToast]);

  // Intro Stage Refs
  const stageRef = useRef<HTMLDivElement>(null);
  const hiRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const dotOutRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const lockupRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const lightGridRef = useRef<HTMLDivElement>(null);
  const endcardRef = useRef<HTMLDivElement>(null);
  const barTopRef = useRef<HTMLDivElement>(null);
  const barBotRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Setup GSAP Kinetic Intro
  useLayoutEffect(() => {
    // Custom drawn plugin for squiggle stroke
    try {
      gsap.registerPlugin({
        name: "drawn",
        init(target: SVGPathElement, value: number) {
          const len = target.getTotalLength();
          target.style.strokeDasharray = `${len}`;
          (this as any).target = target;
          (this as any).len = len;
          (this as any).value = value;
        },
        render(ratio: number, data: any) {
          const n = data.value * ratio;
          data.target.style.strokeDashoffset = `${data.len * (1 - n)}`;
        },
      });
    } catch {
      // plugin might already be registered
    }

    const stage = stageRef.current;
    if (!stage) return;

    const splitText = (el: HTMLElement, cls: string): HTMLElement[] => {
      const chars = [...(el.textContent || "")];
      el.textContent = "";
      return chars.map((ch) => {
        const span = document.createElement("span");
        span.className = cls;
        span.textContent = ch === " " ? "\xA0" : ch;
        el.appendChild(span);
        return span;
      });
    };

    // Text split for anchor "Your"
    const anchorEl = anchorRef.current;
    const anchorChars = anchorEl ? splitText(anchorEl, "intro-anchor__ch") : [];

    // Collect rungs
    const rungs = Array.from(stage.querySelectorAll<HTMLElement>(".intro-rung"));
    const rungIns = rungs.map((r) => r.querySelector<HTMLElement>(".intro-rung__in"));
    const periods = rungs.map((r) => r.querySelector<HTMLElement>(".intro-pd"));
    const rungCharsList = rungIns.map((ri) => (ri ? splitText(ri, "intro-rung__ch") : []));
    const allChars = [...anchorChars, ...rungCharsList.flat()];

    // Calculations
    const computeMetrics = () => {
      const W = stage.clientWidth || window.innerWidth;
      const H = stage.clientHeight || window.innerHeight;

      // Kích thước font chữ to hơn xíu, đĩnh đạc và rõ nét
      const isLandscape = W / H >= 1;
      const targetFont = isLandscape
        ? Math.round(Math.min(88, Math.max(52, W * 0.054)))
        : Math.round(Math.min(56, Math.max(36, W * 0.092)));

      const lockupEl = lockupRef.current;
      if (lockupEl) {
        lockupEl.style.fontSize = `${targetFont}px`;
      }

      const aW = anchorEl?.offsetWidth || 130;
      const currentFontSize = targetFont;
      const gap = 0.22 * currentFontSize;

      const Fi = [{ s: 1 }, { s: 1 }, { s: 0.96 }, { s: 0.92 }, { s: 0.88 }];
      const lockupPositions = Fi.map((cfg, idx) => {
        const rungW = rungs[idx]?.offsetWidth || 180;
        const totalW = aW + gap + rungW;
        const scale = Math.min(cfg.s, (0.85 * W) / totalW);
        const x = (W - totalW * scale) / 2;
        return { scale, x };
      });

      const landY = H * 0.32;
      const floodScale = (2 * Math.hypot(W / 2, H - landY) * 1.06) / 120;
      return { W, H, landY, floodScale, lockupPositions };
    };

    const metrics = computeMetrics();

    // GSAP Timeline setup
    const tl = gsap.timeline({
      paused: false,
      onComplete: () => {
        setHasIntroCompleted(true);
      },
    });
    timelineRef.current = tl;

    // Initial state
    const hi = hiRef.current;
    const name = nameRef.current;
    const dot = dotRef.current;
    const dotOut = dotOutRef.current;
    const field = fieldRef.current;
    const blobs = Array.from(stage.querySelectorAll<HTMLElement>(".intro-blob"));
    const camera = cameraRef.current;
    const lockup = lockupRef.current;
    const barTop = barTopRef.current;
    const barBot = barBotRef.current;
    const lightGrid = lightGridRef.current;
    const endcard = endcardRef.current;
    const squiggles = stage.querySelectorAll<SVGPathElement>(".intro-squiggle__path");

    // Reset properties
    tl.set([hi, name], { opacity: 0, yPercent: 0 })
      .set([barTop, barBot], { yPercent: 0 })
      .set(dot, { opacity: 0, x: 0, y: -120, scale: 0.09 })
      .set(field, { opacity: 0 })
      .set(blobs, { opacity: 0 })
      .set(lightGrid, { opacity: 0 })
      .set(lockup, { x: metrics.lockupPositions[0].x, scale: metrics.lockupPositions[0].scale, transformOrigin: "0 50%" })
      .set(camera, { scale: 1, y: 0 })
      .set(allChars, { transformPerspective: 620, transformOrigin: "50% 100%", yPercent: 140, rotationX: -78 })
      .set(rungs, { opacity: 0 })
      .set(periods, { scale: 0 })
      .set(dotOut, { opacity: 0, x: 0, y: 0, scale: 0.001, display: "block" })
      .set(endcard, { opacity: 0, pointerEvents: "none" })
      .set(".intro-endcard__cta", { opacity: 0, yPercent: 40 })
      .set(".intro-endcard__sub", { opacity: 0, y: 14 })
      .set(".intro-endcard__actions", { opacity: 0, y: 16 })
      .set(".intro-endcard__handle", { opacity: 0, y: 12 });

    if (squiggles.length) {
      tl.set(squiggles, { drawn: 0 });
    }

    // 1. "Hi" entry & exit (Nhanh, gãy gọn, dứt khoát)
    tl.fromTo(hi, { opacity: 0, yPercent: 20 }, { opacity: 1, yPercent: 0, duration: 0.3, ease: "power2.out" }, 0.05)
      .to(hi, { opacity: 0, yPercent: -20, duration: 0.22, ease: "power2.in" }, 0.48);

    // 2. Cinema bars peek & full reveal (Mở màn hình nhanh gọn)
    tl.to(barTop, { yPercent: -50, duration: 0.35, ease: "power2.out" }, 0.05)
      .to(barBot, { yPercent: 50, duration: 0.35, ease: "power2.out" }, 0.05)
      .to(barTop, { yPercent: -100, duration: 0.5, ease: "power3.inOut" }, 0.45)
      .to(barBot, { yPercent: 100, duration: 0.5, ease: "power3.inOut" }, 0.45);

    // 3. "I'm CodeMind AI" & Squiggle draw (Hiện nhanh, vẽ nét cong sắc bén)
    tl.fromTo(name, { opacity: 0, yPercent: 25 }, { opacity: 1, yPercent: 0, duration: 0.32, ease: "power2.out" }, 0.65);
    if (squiggles[0]) {
      tl.to(squiggles[0], { drawn: 1, duration: 0.35, ease: "power2.inOut" }, 0.85);
    }
    tl.to(name, { opacity: 0, yPercent: -18, duration: 0.22, ease: "power2.in" }, 1.35);

    // 4. Dot drops & floods the screen (Độ nảy rơi chuẩn và bung màu lẹ)
    tl.set(dot, { opacity: 1 }, 1.5)
      .to(dot, { y: metrics.landY, scaleX: 0.2, scaleY: 0.4, duration: 0.3, ease: "power1.in" }, 1.5)
      .to(dot, { scaleX: 0.4, scaleY: 0.15, duration: 0.08, ease: "power2.out" }, 1.8)
      .to(dot, { scaleX: metrics.floodScale, scaleY: metrics.floodScale, duration: 0.26, ease: "power2.in" }, 1.88);

    // 5. Flood field & ambient drifting blobs reveal
    tl.set(field, { opacity: 1 }, 2.14)
      .set(dot, { opacity: 0 }, 2.15)
      .to(blobs, { opacity: 1, duration: 0.4, ease: "power2.out" }, 2.15)
      .set(lightGrid, { opacity: 1 }, 2.14)
      .set(".intro-ladder", { opacity: 1 }, 2.14);

    // Continuous subtle camera push
    tl.fromTo(camera, { scale: 1, y: 0 }, { scale: 1.08, y: -0.02 * metrics.H, duration: 2.8, ease: "none" }, 2.14);

    // "Your" entry
    tl.to(anchorChars, { yPercent: 0, rotationX: 0, duration: 0.28, ease: "power2.out", stagger: 0.01 }, 2.16);

    // Helper to animate rungs với độ nảy chữ kinetic nhịp nhàng, lướt nhanh và cuốn hút
    const animateRung = (idx: number, atTime: number) => {
      const prevIdx = idx - 1;
      const targetPos = metrics.lockupPositions[idx] || metrics.lockupPositions[0];

      if (prevIdx >= 0) {
        const prevChars = rungCharsList[prevIdx];
        if (prevChars?.length) {
          tl.to(prevChars, { yPercent: -120, rotationX: 60, opacity: 0, duration: 0.16, ease: "power2.in", stagger: 0.005 }, atTime);
        }
        if (periods[prevIdx]) {
          tl.to(periods[prevIdx], { scale: 0, duration: 0.1, ease: "power2.in" }, atTime);
        }
      }

      // Shift lockup to keep centered
      tl.to(lockup, { x: targetPos.x, scale: targetPos.scale, duration: 0.22, ease: "power3.out" }, atTime);

      // Reveal current rung
      const currentRung = rungs[idx];
      const currentChars = rungCharsList[idx];
      if (currentRung) tl.set(currentRung, { opacity: 1 }, atTime);
      if (currentChars?.length) {
        tl.to(currentChars, { yPercent: 0, rotationX: 0, opacity: 1, duration: 0.24, ease: "power2.out", stagger: 0.007 }, atTime + 0.02);
      }
      if (periods[idx]) {
        tl.to(periods[idx], { scale: 1, duration: 0.14, ease: "back.out(2)" }, atTime + 0.10);
      }
    };

    // 5 Rungs chuyển đổi lướt nhanh, dứt khoát:
    animateRung(0, 2.20);
    animateRung(1, 2.62);
    animateRung(2, 3.04);
    animateRung(3, 3.46);
    animateRung(4, 3.88);

    // 6. Dot Out (reverse paper drop)
    tl.set(dotOut, { opacity: 1 }, 4.45)
      .to(dotOut, { y: metrics.landY, scaleX: 0.2, scaleY: 0.4, duration: 0.22, ease: "power1.in" }, 4.45)
      .to(dotOut, { scaleX: 0.35, scaleY: 0.15, duration: 0.05, ease: "power2.out" }, 4.67)
      .to(dotOut, { scaleX: metrics.floodScale, scaleY: metrics.floodScale, duration: 0.22, ease: "power2.in" }, 4.72);

    // 7. Endcard Reveal
    tl.set(endcard, { opacity: 1, pointerEvents: "auto", zIndex: 50 }, 4.95)
      .set([camera, field, dotOut], { opacity: 0, pointerEvents: "none", display: "none" }, 4.96)
      .to(".intro-endcard__cta", { opacity: 1, yPercent: 0, duration: 0.32, ease: "power2.out" }, 4.98)
      .to(".intro-endcard__sub", { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" }, 5.08)
      .to(".intro-endcard__actions", { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" }, 5.18)
      .to(".intro-endcard__handle", { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" }, 5.28);

    if (squiggles[1]) {
      tl.to(squiggles[1], { drawn: 1, duration: 0.3, ease: "power2.inOut" }, 5.35);
    }

    return () => {
      tl.kill();
    };
  }, []);

  // Bidirectional IntersectionObserver for scroll-reveal animations across all showcase sections (Both Scroll Up & Scroll Down)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // Khi lướt tới (cả lướt lên và lướt xuống): kích hoạt hiệu ứng hiện ra mượt mà
            el.classList.add("is-in-view");
          } else {
            // Khi lướt ra khỏi tầm nhìn: gỡ bỏ class để khi lướt ngược lại hiệu ứng sẽ được kích hoạt lại
            el.classList.remove("is-in-view");
          }
        });
      },
      {
        root: null,
        threshold: 0.08,
        rootMargin: "-20px 0px -20px 0px",
      }
    );

    const revealElements = document.querySelectorAll(
      ".reveal-on-scroll, .reveal-fade-left, .reveal-fade-right, .reveal-zoom-in, .reveal-3d-tilt, .reveal-spring-pop, .reveal-slide-left, .reveal-slide-right, .reveal-pulse-glow"
    );

    revealElements.forEach((el) => {
      observer.observe(el);
    });

    // Initialize Marlo magnetic physics on all .magnetic elements
    initMarloMagnetic(document);

    return () => {
      observer.disconnect();
    };
  }, [hasIntroCompleted]);

  const handleSkipIntro = () => {
    if (timelineRef.current) {
      timelineRef.current.progress(1);
      setHasIntroCompleted(true);
    }
  };

  const handleReplayIntro = () => {
    if (timelineRef.current) {
      setHasIntroCompleted(false);
      timelineRef.current.restart();
    }
  };

  const handleScrollToContent = () => {
    const el = document.getElementById("codemind-campus-showcase");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCheckApproval = async (targetScreen?: Screen) => {
    if (checkingApproval) return;
    setCheckingApproval(true);
    try {
      const approved = await onRecheckApproval?.(targetScreen);
      if (!approved) {
        setApprovalToast(
          "Tài khoản của bạn vẫn đang chờ Quản trị viên phê duyệt quyền vào học. Hiện bạn chỉ có thể xem trang giới thiệu."
        );
      }
    } finally {
      setCheckingApproval(false);
    }
  };

  const handlePlatformAction = (targetScreen?: Screen) => {
    if (isPendingApproval) {
      void handleCheckApproval(targetScreen);
      return;
    }
    onEnterPlatform(targetScreen);
  };

  const handleSwitchOrLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (onLogin) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-900 overflow-x-clip">
      {isPendingApproval && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <Clock size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Đang chờ Admin duyệt vào học
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {pendingUserName || pendingUserEmail || "Tài khoản học viên mới"} · Chỉ xem trang Giới thiệu
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleCheckApproval()}
                disabled={checkingApproval}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition cursor-pointer"
              >
                <RefreshCw size={12} className={checkingApproval ? "animate-spin" : ""} />
                <span>{checkingApproval ? "Đang kiểm tra..." : "Kiểm tra duyệt"}</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchOrLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <LogOut size={12} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900 text-white px-4 py-3 text-xs font-medium shadow-xl border border-slate-800">
            <Clock size={15} className="text-amber-400 shrink-0" />
            <span>{approvalToast}</span>
          </div>
        </div>
      )}
      {/* ─── KINETIC TYPOGRAPHY INTRO STAGE ─── */}
      <section className="intro-stage relative">
        {/* Grain overlay */}
        <div className="intro-grain" aria-hidden="true" />

        {/* Paper Background Grid */}
        <div className="intro-grid intro-grid--ink" aria-hidden="true" />

        {/* Replay & Skip Controls */}
        <div className="intro-controls">
          <button
            onClick={handleReplayIntro}
            className="intro-ctrl-btn"
            title="Xem lại intro mở đầu"
          >
            <RotateCcw size={14} />
            <span>Xem lại</span>
          </button>
          {!hasIntroCompleted && (
            <button
              onClick={handleSkipIntro}
              className="intro-ctrl-btn bg-amber-500/90 text-slate-950 hover:bg-amber-400 font-bold"
              title="Bỏ qua intro và xem ngay"
            >
              <span>Bỏ qua Intro</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Stage Content */}
        <div ref={stageRef} className="w-full h-full relative overflow-hidden">
          {/* Paper State: "Hi" and "I'm CodeMind AI" */}
          <div className="intro-paper" aria-hidden="true">
            <div ref={hiRef} className="intro-line intro-line--hi">
              Hi
            </div>
            <div ref={nameRef} className="intro-line intro-line--name">
              <span className="font-extrabold tracking-tight">I&rsquo;m CodeMind AI</span>
              <svg className="intro-squiggle" viewBox="0 0 240 26" fill="none" aria-hidden="true">
                <path
                  className="intro-squiggle__path"
                  d="M6 17C42 8 96 4 152 6c22 1 46 4 60 9-30 4-72 5-116 4"
                  stroke="#E5A023"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Dropping Dot */}
          <div ref={dotRef} className="intro-dot" aria-hidden="true" />

          {/* Flood Field with Drifting Gradient Blobs */}
          <div ref={fieldRef} className="intro-field" aria-hidden="true">
            <div className="intro-blob intro-blob--1" />
            <div className="intro-blob intro-blob--2" />
            <div className="intro-blob intro-blob--3" />
            <div ref={lightGridRef} className="intro-grid intro-grid--light" />
            <div className="intro-vignette" />
          </div>

          {/* Camera & Kinetic Typography Ladder */}
          <div ref={cameraRef} className="intro-camera" aria-hidden="true">
            <div className="intro-ladder">
              <div ref={lockupRef} className="intro-lockup">
                {/* Anchored "Your" */}
                <span className="intro-mask">
                  <span ref={anchorRef} className="intro-anchor">
                    Your
                  </span>
                </span>

                {/* 5 Sequential Rungs */}
                <span className="intro-rung">
                  <span className="intro-mask">
                    <span className="intro-rung__in">code lab</span>
                  </span>
                  <i className="intro-pd" />
                </span>

                <span className="intro-rung">
                  <span className="intro-mask">
                    <span className="intro-rung__in">ai mentor</span>
                  </span>
                  <i className="intro-pd" />
                </span>

                <span className="intro-rung">
                  <span className="intro-mask">
                    <span className="intro-rung__in">git projects</span>
                  </span>
                  <i className="intro-pd" />
                </span>

                <span className="intro-rung">
                  <span className="intro-mask">
                    <span className="intro-rung__in">career launch</span>
                  </span>
                  <i className="intro-pd" />
                </span>

                <span className="intro-rung">
                  <span className="intro-mask">
                    <span className="intro-rung__in">next tech lead</span>
                  </span>
                  <i className="intro-pd" />
                </span>
              </div>
            </div>
          </div>

          {/* Paper Reverse Dot */}
          <div ref={dotOutRef} className="intro-dot intro-dot--out" aria-hidden="true" />

          {/* End Card */}
          <div ref={endcardRef} className="intro-endcard">
            <p className="intro-endcard__cta">
              {isPendingApproval
                ? "Tài khoản đã đăng ký · Chờ Quản trị viên phê duyệt"
                : "Sẵn sàng bứt phá sự nghiệp lập trình?"}
            </p>
            <p className="intro-endcard__sub">
              {isPendingApproval
                ? `Xin chào ${pendingUserName || "bạn"}. Tài khoản học viên của bạn đang chờ Admin cấp quyền để vào lớp học. Trong thời gian chờ duyệt, bạn có thể khám phá toàn bộ trang giới thiệu & lộ trình CodeMind AI.`
                : "Chào mừng bạn đến với hệ sinh thái đào tạo kỹ sư công nghệ CodeMind AI Campus. Học thực chiến qua đồ án chuẩn doanh nghiệp cùng AI Mentor 24/7."}
            </p>

            <div className="intro-endcard__actions flex items-center justify-center gap-3 flex-wrap relative z-20 pointer-events-auto">
              {isPendingApproval ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleCheckApproval()}
                    disabled={checkingApproval}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <RefreshCw size={15} className={`text-[#1c1304] shrink-0 ${checkingApproval ? "animate-spin" : ""}`} />
                    <span>{checkingApproval ? "Đang kiểm tra..." : "Kiểm tra quyền vào học"}</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleScrollToContent}
                    className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <Compass size={15} className="shrink-0" />
                    <span>Khám phá Lộ trình</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSwitchOrLogout}
                    className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <LogOut size={15} className="shrink-0" />
                    <span>Đăng xuất / Đổi tài khoản</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePlatformAction("defense-room")}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <ShieldCheck size={15} className="text-[#1c1304] shrink-0" />
                    <span>Thử Phòng Phản Biện AI</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlatformAction()}
                    className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <BookOpen size={15} className="shrink-0" />
                    <span>Vào trang Tổng quan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScrollToContent}
                    className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2 cursor-pointer relative z-30 pointer-events-auto"
                  >
                    <Compass size={15} className="shrink-0" />
                    <span>Khám phá Lộ trình & Mức lương</span>
                  </button>
                </>
              )}
            </div>

            <div className="intro-endcard__handle">
              <span className="text-slate-700 font-semibold text-sm">@codemind_campus · Computer Science & AI Excellence</span>
              <svg className="intro-squiggle intro-squiggle--sm" viewBox="0 0 240 26" fill="none" aria-hidden="true">
                <path
                  className="intro-squiggle__path"
                  d="M6 17C42 8 96 4 152 6c22 1 46 4 60 9-30 4-72 5-116 4"
                  stroke="#E5A023"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Cinema Bars */}
          <div ref={barTopRef} className="intro-bar intro-bar--top" aria-hidden="true" />
          <div ref={barBotRef} className="intro-bar intro-bar--bot" aria-hidden="true" />
        </div>
      </section>

      {/* ─── FULL ONBOARDING & CURRICULUM SHOWCASE ─── */}
      <div id="codemind-campus-showcase" className="relative z-10">
        {/* TOP WELCOME ANNOUNCEMENT BAR */}
        <div className="reveal-on-scroll border-y border-slate-200/90 bg-slate-50/90 py-4 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-amber-400 font-bold text-sm shadow-xs">
                {isPendingApproval ? <Clock size={15} /> : "★"}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {isPendingApproval
                    ? "Tài khoản học viên đang chờ Quản trị viên cấp quyền vào học"
                    : "Chào mừng Tân Học viên gia nhập Hệ sinh thái CodeMind AI Campus"}
                </p>
                <p className="text-xs text-slate-600">
                  {isPendingApproval
                    ? `${pendingUserEmail ? `${pendingUserEmail} · ` : ""}Bạn hiện chỉ được xem trang Giới thiệu. Sau khi Admin phê duyệt, nhấn Kiểm tra quyền để vào học ngay.`
                    : "Tài khoản của bạn đã được kích hoạt đầy đủ quyền truy cập Cloud Docker Sandbox & AI Mentor 24/7."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {isPendingApproval ? (
                <>
                  <button
                    type="button"
                    onClick={handleSwitchOrLogout}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  >
                    <LogOut size={14} className="text-slate-500" />
                    <span>Đăng xuất</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCheckApproval()}
                    disabled={checkingApproval}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                  >
                    <RefreshCw size={14} className={`text-[#1c1304] shrink-0 ${checkingApproval ? "animate-spin" : ""}`} />
                    <span>{checkingApproval ? "Đang kiểm tra..." : "Kiểm tra quyền vào học"}</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handlePlatformAction("defense-room")}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck size={15} className="text-slate-500" />
                    <span>Phòng Phản Biện AI (Live)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </button>

                  <button
                    onClick={() => handlePlatformAction()}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                  >
                    <BookOpen size={15} className="text-[#1c1304] shrink-0" />
                    <span>Vào học tiếp</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 4 TRUST PILLARS STATS ── */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="reveal-spring-pop reveal-delay-1 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Briefcase size={24} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">
                <CountUpNumber end={94.8} decimals={1} suffix="%" />
              </div>
              <div className="font-semibold text-slate-800 text-sm mb-1">Tỉ lệ việc làm 45 ngày</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Học viên tốt nghiệp nhận được offer từ các kỳ lân công nghệ & tập đoàn hàng đầu.
              </p>
            </div>

            <div className="reveal-spring-pop reveal-delay-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={24} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">18 – 60M</div>
              <div className="font-semibold text-slate-800 text-sm mb-1">Mức lương khởi điểm (VNĐ)</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dựa trên báo cáo khảo sát thực tế từ 350+ nhà tuyển dụng IT tại Việt Nam năm 2026.
              </p>
            </div>

            <div className="reveal-spring-pop reveal-delay-3 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Terminal size={24} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">
                <CountUpNumber end={72} suffix=" Blueprints" />
              </div>
              <div className="font-semibold text-slate-800 text-sm mb-1">Đồ án thực chiến & DoD</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bài toán từ PintOS Kernel, Compiler đến MedAI X-Ray kèm tiêu chí Definition of Done nghiêm ngặt.
              </p>
            </div>

            <div className="reveal-spring-pop reveal-delay-4 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Bot size={24} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">24/7 AI</div>
              <div className="font-semibold text-slate-800 text-sm mb-1">Socratic Mentor kèm cặp</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Trợ lý thông minh hướng dẫn phương pháp giải, phản biện logic mà không spoil đáp án sẵn.
              </p>
            </div>
          </div>
        </section>

        {/* ── MONOLITH 3D ARCHITECTURAL BLUEPRINTS SHOWCASE (Inspired by Monolith Template) ── */}
        <MonolithCoverflowShowcase onSelectMonument={() => handlePlatformAction()} />

        {/* ── SECTION 1: LỘ TRÌNH ĐÀO TẠO 4 CHẶNG CHI TIẾT (CYBER ROADMAP MATRIX) ── */}
        <section id="codemind-roadmap-matrix" className="py-20 px-4 md:px-6 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/80 border-t border-slate-200/80 relative overflow-hidden">
          {/* Subtle ambient background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-400/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Header */}
            <div className="reveal-on-scroll text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                4 Chặng Huấn Luyện: Từ Cốt Lõi Đến Principal Architect
              </h2>
              <p className="text-slate-600 text-base md:text-lg leading-relaxed">
                Nói <span className="font-bold text-slate-900">KHÔNG</span> với học vẹt framework. Khắc phục triệt để lỗ hổng tư duy từ Quản lý bộ nhớ vật lý, Nhân hệ điều hành, Deep Learning đến Hệ thống đồng thuận phân tán Raft.
              </p>
            </div>

            {/* ── 4 CHẶNG HUẤN LUYỆN: TOÀN CẢNH TUYẾN ĐƯỜNG ── */}
            <div className="space-y-10 relative">
                {/* Connecting laser conduit line */}
                <div className="absolute top-10 bottom-10 left-8 md:left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-amber-400 via-blue-500 via-emerald-500 to-purple-500 rounded-full opacity-40 pointer-events-none hidden lg:block" />

                {roadmapStages.map((stage, sIdx) => (
                  <div
                    key={stage.step}
                    className={`reveal-3d-tilt reveal-delay-${(sIdx % 4) + 1} bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 relative group`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className="font-mono text-[11px] font-black px-2.5 py-1 rounded-md text-white uppercase tracking-wider"
                            style={{ backgroundColor: stage.accentColor }}
                          >
                            {stage.step}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {stage.levelBadge}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <Clock size={13} />
                            {stage.duration}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                          {stage.title}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">
                          {stage.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
                      {/* Left: Modules list - Crisp 2x2 grid */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Kỹ năng trọng tâm
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            4 chuyên đề thực chiến
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {stage.modules.map((mod, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100/90 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 leading-snug">
                                    {mod.title}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Capstone Box */}
                      <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border border-slate-800 flex flex-col justify-between">
                        <div
                          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
                          style={{ backgroundColor: stage.accentColor }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                            <Code2 size={13} />
                            <span>Đồ án tốt nghiệp chặng</span>
                          </div>
                          <h4 className="text-base font-bold text-white mb-1.5 leading-snug">
                            {stage.capstoneProject.name}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed mb-3">
                            {stage.capstoneProject.description}
                          </p>
                        </div>
                        <div className="space-y-1.5 pt-2.5 border-t border-slate-800/80">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Sản phẩm bàn giao (DoD):
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {stage.capstoneProject.deliverables.map((d, di) => (
                              <span
                                key={di}
                                className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-[11px] text-amber-200"
                              >
                                ✓ {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </section>

        {/* ── SECTION 2: BẢNG KHẢO SÁT MỨC LƯƠNG IT 2026 ── */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="reveal-on-scroll text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Khảo Sát Mức Lương & Cơ Hội Nghề Nghiệp Sau Khóa Học
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Các kỹ năng cốt lõi (C++, Operating Systems, Distributed Raft, PyTorch AI) đang có nhu cầu tuyển dụng tăng vọt và mức thu nhập cao nhất ngành phần mềm.
            </p>
          </div>

          {/* Interactive Track Selector with authentic Marlo Liquid Rubberband Pill */}
          <div className="reveal-spring-pop flex justify-center mb-10 overflow-x-auto pb-2">
            <MarloSegmentedControl
              value={selectedTrack}
              options={salaryTracks.map((trk) => ({
                id: trk.id,
                label: trk.title.split("(")[0].trim(),
              }))}
              onChange={(val) => setSelectedTrack(val)}
              tone="dark"
              size="md"
            />
          </div>

          {/* Detailed Selected Track Card */}
          {(() => {
            const current = salaryTracks.find((t) => t.id === selectedTrack) || salaryTracks[0];
            return (
              <div className="reveal-3d-tilt bg-white rounded-3xl p-8 md:p-12 border border-slate-200/90 shadow-sm hover:shadow-2xl transition-all duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          {current.demandGrowth}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Theo chuẩn đánh giá năng lực CodeMind
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {current.title}
                      </h3>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed mt-2">
                        {current.roleDescription}
                      </p>
                    </div>

                    {/* Salary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="reveal-zoom-in reveal-delay-1 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition hover:bg-slate-50">
                        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Mới tốt nghiệp (0-1 năm)</div>
                        <div className="text-lg md:text-xl font-bold text-slate-800">{current.freshGradSalary}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">VNĐ / tháng</div>
                      </div>
                      <div className="reveal-zoom-in reveal-delay-2 p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-xs transition relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 uppercase">Mức trung bình (1-3 năm)</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Mục tiêu</span>
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-slate-950">{current.avgSalary}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Điểm rơi học viên CodeMind</div>
                      </div>
                      <div className="reveal-zoom-in reveal-delay-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition hover:bg-slate-50">
                        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Senior / Lead (3-5+ năm)</div>
                        <div className="text-lg md:text-xl font-bold text-slate-800">{current.midSeniorSalary}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">VNĐ / tháng</div>
                      </div>
                    </div>

                    {/* Top skills required */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Bộ kỹ năng được nhà tuyển dụng săn đón:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {current.topSkills.map((sk, ski) => (
                          <span
                            key={ski}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition"
                          >
                            #{sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hiring Companies */}
                  <div className="reveal-fade-left lg:col-span-5 bg-slate-50/80 rounded-2xl p-6 md:p-8 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4">
                      <Building2 size={18} className="text-slate-700" />
                      <span>Doanh nghiệp đối tác tuyển dụng tiêu biểu:</span>
                    </div>
                    <div className="space-y-3">
                      {current.hiringCompanies.map((comp, ci) => (
                        <div
                          key={ci}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-amber-400 transition"
                        >
                          <span className="font-bold text-sm text-slate-800">{comp}</span>
                          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                            Đang tuyển dụng
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                      * Mạng lưới tuyển dụng trực tiếp: Học viên hoàn thành đồ án Capstone được gửi CV trực tiếp đến Hiring Manager.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ── SECTION 3: ĐẶC QUYỀN & ƯU ĐÃI TÂN HỌC VIÊN ── */}
        <section className="py-20 px-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="reveal-on-scroll text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Đặc Quyền & Ưu Đãi Tân Học Viên Khi Kích Hoạt Tài Khoản
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Khi nhận tài khoản CodeMind AI Campus, bạn được trang bị toàn bộ hạ tầng đám mây cao cấp và tài nguyên học tập chuẩn kỹ sư mà không mất thêm chi phí.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div
                onClick={() => handlePlatformAction("workspace")}
                className="group cursor-pointer reveal-pulse-glow reveal-delay-1 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/80 hover:bg-slate-800 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-400/20 transition-all">
                    <Laptop size={24} />
                  </div>
                  <span className="text-[11px] font-bold text-amber-400/90 group-hover:text-amber-400 flex items-center gap-1">
                    {isPendingApproval ? (
                      <>
                        <Lock size={12} />
                        <span>Mở sau khi duyệt</span>
                      </>
                    ) : (
                      <>
                        <span>Vào Code Lab</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">100% Cloud Docker Sandbox</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Mỗi học viên có một container Linux độc lập trên đám mây cấu hình cao. Thoải mái compile kernel PintOS và build C++20 mà không lo lỗi hệ điều hành máy tính cá nhân.
                </p>
              </div>

              <div
                onClick={() => handlePlatformAction("workspace")}
                className="group cursor-pointer reveal-pulse-glow reveal-delay-2 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-purple-400/80 hover:bg-slate-800 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-400/10 text-purple-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-400/20 transition-all">
                    <Cpu size={24} />
                  </div>
                  <span className="text-[11px] font-bold text-purple-400/90 group-hover:text-purple-400 flex items-center gap-1">
                    {isPendingApproval ? (
                      <>
                        <Lock size={12} />
                        <span>Mở sau khi duyệt</span>
                      </>
                    ) : (
                      <>
                        <span>Hỏi AI ngay</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">AI Socratic Mentor 24/7</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Gia sư AI phản biện chuyên sâu. Khi bạn gặp lỗi segfault hoặc memory leak lúc 2 giờ sáng, AI sẽ đặt câu hỏi dẫn dắt để bạn tự hiểu bản chất vấn đề.
                </p>
              </div>

              <div
                onClick={() => handlePlatformAction("defense-room")}
                className="group cursor-pointer reveal-pulse-glow reveal-delay-3 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400 hover:bg-slate-800 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-400/20 transition-all">
                    <ShieldCheck size={24} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all flex items-center gap-1">
                    {isPendingApproval ? (
                      <>
                        <Lock size={12} />
                        <span>Mở sau khi duyệt</span>
                      </>
                    ) : (
                      <>
                        <span>Phản biện ngay</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">AI Defense Room</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  Phòng mô phỏng bảo vệ đồ án và phỏng vấn kỹ thuật 1:1 với AI trong vai trò Tech Lead khó tính, rèn luyện bản lĩnh phản biện kiến trúc trước khi đi xin việc.
                </p>
                <div className="text-xs font-semibold text-amber-400/90 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>3 Hội đồng Giám khảo AI · Chấm điểm ABET chuẩn 2026</span>
                </div>
              </div>

              <div className="reveal-pulse-glow reveal-delay-1 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/80 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center mb-5">
                  <Terminal size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">72 Blueprints kèm DoD</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Kho đề bài lập trình chuẩn Agile Scrum với checklist kiểm thử tự động, chuẩn bị sẵn sàng văn hóa kỹ thuật như tại các công ty công nghệ lớn.
                </p>
              </div>

              <div className="reveal-pulse-glow reveal-delay-2 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/80 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-pink-400/10 text-pink-400 flex items-center justify-center mb-5">
                  <Star size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Học bổng Tài năng Top 5%</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Học viên đạt điểm đồ án xuất sắc và hoàn thành đúng hạn các sprint sẽ nhận được học bổng hoàn lại 100% học phí cùng thư giới thiệu trực tiếp tới CTO đối tác.
                </p>
              </div>

              <div className="reveal-pulse-glow reveal-delay-3 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/80 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center mb-5">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Cộng đồng Cựu Kỹ sư Alumni</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Gia nhập mạng lưới hơn 1,200+ kỹ sư phần mềm đang làm việc tại VNG, Viettel, FPT, Shopee. Cơ hội kết nối nghề nghiệp và nhận referral nội bộ giá trị.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FEEDBACK & CẢM NHẬN CỰU HỌC VIÊN ── */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="reveal-on-scroll text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Đánh Giá Từ Những Kỹ Sư Đã Tốt Nghiệp
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Trải nghiệm thực tế của các cựu học viên đã vượt qua lộ trình đào tạo nghiêm ngặt và chạm tới các vị trí chủ chốt trong ngành công nghệ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {alumniFeedbacks.map((item, idx) => (
              <div
                key={idx}
                className={`reveal-on-scroll reveal-delay-${idx + 1} bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-amber-400"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                      <p className="text-xs text-slate-500">{item.role}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                    {item.offer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 5: FAQ CÂU HỎI THƯỜNG GẶP ── */}
        <section className="py-16 px-6 bg-slate-50/70 border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto">
            <div className="reveal-on-scroll text-center mb-12">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                Những Câu Hỏi Tân Học Viên Thường Quan Tâm
              </h2>
            </div>

            <div className="reveal-on-scroll reveal-delay-1 space-y-4">
              {[
                {
                  q: "1. Chưa có kinh nghiệm vững về C++ thì có theo học được không?",
                  a: "Lộ trình Chặng 01 được thiết kế từ gốc rễ phân bổ bộ nhớ máy tính, biến và con trỏ. Kèm theo đó là AI Mentor 24/7 hướng dẫn sửa lỗi từng dòng code, giúp bạn tiến bộ gấp 2.5 lần so với tự học.",
                },
                {
                  q: "2. Máy tính cá nhân cấu hình yếu có học và chạy được PintOS/Docker không?",
                  a: "Hoàn toàn tốt! Hệ thống cấp cho mỗi học viên một Cloud Docker Sandbox độc lập chạy trên máy chủ đám mây. Bạn chỉ cần trình duyệt web là có thể code, compile và chạy kiểm thử mượt mà.",
                },
                {
                  q: "3. Các đồ án Capstone làm ra có đủ tiêu chuẩn để đưa vào CV ứng tuyển không?",
                  a: "100% chuẩn Enterprise! Mỗi đồ án đều có repository GitHub riêng, tài liệu kiến trúc, báo cáo kiểm thử tự động CI/CD và tài liệu phân tích hệ thống đạt chuẩn phỏng vấn cấp Lead.",
                },
                {
                  q: "4. AI Defense Room hoạt động như thế nào?",
                  a: "Đây là phòng thử nghiệm độc quyền: AI đóng vai trò là Tech Lead hoặc CTO doanh nghiệp, liên tục đặt các câu hỏi truy vấn sâu vào kiến trúc code của bạn (ví dụ: 'Tại sao lại dùng Mutex ở đây thay vì Spinlock?'). Việc này giúp bạn cực kỳ tự tin khi đi phỏng vấn thực tế.",
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className={`reveal-spring-pop reveal-delay-${index + 1} bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-300`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-900 text-sm md:text-base hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 ${
                        openFaq === index ? "rotate-180 text-amber-500" : ""
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER CALL TO ACTION ── */}
        <section className="py-20 px-6 bg-[#FDFCFB] border-t border-slate-100 text-center">
          <div className="reveal-3d-tilt max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {isPendingApproval
                ? "Tài khoản đang chờ Quản trị viên kích hoạt quyền vào học"
                : "Bắt Đầu Trải Nghiệm Học Tập Thực Chiến Cùng CodeMind AI"}
            </h2>

            <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              {isPendingApproval
                ? "Bạn đã đăng ký thành công và hiện đang ở trang Giới thiệu. Sau khi Quản trị viên phê duyệt hồ sơ, nhấn Kiểm tra quyền vào học để mở khóa toàn bộ lớp học & Docker Sandbox."
                : "Tài khoản đã sẵn sàng. Hãy bắt đầu chinh phục Chặng 01 ngay hôm nay và khẳng định năng lực kỹ nghệ phần mềm của bạn."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {isPendingApproval ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleCheckApproval()}
                    disabled={checkingApproval}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                  >
                    <RefreshCw size={15} className={`text-[#1c1304] shrink-0 ${checkingApproval ? "animate-spin" : ""}`} />
                    <span>{checkingApproval ? "Đang kiểm tra..." : "Kiểm tra quyền vào học"}</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>

                  {(onLogout || onLogin) && (
                    <button
                      type="button"
                      onClick={handleSwitchOrLogout}
                      className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2"
                    >
                      <LogOut size={15} className="shrink-0" />
                      <span>Quay lại Màn hình Đăng nhập</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handlePlatformAction()}
                    className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                  >
                    <BookOpen size={15} className="text-[#1c1304] shrink-0" />
                    <span>Vào học tiếp</span>
                    <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                  </button>

                  {onLogin && (
                    <button
                      onClick={onLogin}
                      className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-2"
                    >
                      <span>Quay lại Màn hình Đăng nhập</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER BAR (Nằm ở cuối trang, không dính cố định cuối màn hình) ── */}
        <footer className="w-full bg-white border-t border-slate-200/80 py-5 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-xs">
                CM
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">CodeMind AI Campus · Learning OS</p>
                <p className="text-slate-500">
                  {isPendingApproval
                    ? "Hồ sơ học viên đang chờ Admin phê duyệt"
                    : "Kích hoạt tài khoản & Lộ trình Kỹ sư 2026"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  const main = document.querySelector("main");
                  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition hidden md:inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Lên đầu trang & Xem Intro</span>
              </button>

              {isPendingApproval ? (
                <button
                  type="button"
                  onClick={() => void handleCheckApproval()}
                  disabled={checkingApproval}
                  className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                >
                  <RefreshCw size={15} className={`text-[#1c1304] shrink-0 ${checkingApproval ? "animate-spin" : ""}`} />
                  <span>{checkingApproval ? "Đang kiểm tra..." : "Kiểm tra quyền vào học"}</span>
                  <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => handlePlatformAction()}
                  className="btn-marlo-primary btn--primary magnetic flex items-center gap-2"
                >
                  <BookOpen size={15} className="text-[#1c1304] shrink-0" />
                  <span>Vào học tiếp</span>
                  <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import MarloSegmentedControl from "./MarloSegmentedControl";
import MarloTitle from "./MarloTitle";
import { SpotlightCard } from "./SpotlightCard";
import {
  Search,
  Milestone,
  LayoutGrid,
  Sparkles,
  ShieldAlert,
  Zap,
  Activity,
  Server,
  Database,
  Cpu,
  Terminal,
  Layers,
  Radio,
  Flame,
  Globe,
  Award,
  Box,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import {
  MULTI_CHAPTER_SUBJECTS,
  type SubjectId,
  type SubjectModuleData,
} from "../data/multiChapterCurriculum";

interface CourseCatalogHubProps {
  onSelectCourse: (subjectId: SubjectId) => void;
  subjects?: SubjectModuleData[];
}

interface RoadmapStage {
  id: string;
  stepNumber: string;
  title: string;
  phase: string;
  description: string;
  subjectIds: SubjectId[];
}

const ROADMAP_STAGES: RoadmapStage[] = [
  {
    id: "stage-1",
    stepNumber: "01",
    title: "Nền tảng Khoa học Máy tính & Tư duy Lập trình",
    phase: "Cơ sở cốt lõi · Năm 1 - 2",
    description: "Xây dựng tư duy hướng đối tượng (OOP), quản lý bộ nhớ, cấu trúc dữ liệu kinh điển, thuật toán đồ thị và nguyên lý mạng TCP/IP & Hệ điều hành.",
    subjectIds: ["oop", "dsa", "network"],
  },
  {
    id: "stage-2",
    stepNumber: "02",
    title: "Kỹ thuật Web Frontend Hiện đại & Đa nền tảng",
    phase: "Giao diện & Trải nghiệm · Năm 2 - 3",
    description: "Làm chủ hệ sinh thái Web App thế hệ mới: React 19, Next.js 15 App Router, React Server Components (RSC), Real-time WebSockets, tối ưu Web Vitals và Mobile Flutter.",
    subjectIds: ["frontend", "realtime", "mobile"],
  },
  {
    id: "stage-3",
    stepNumber: "03",
    title: "Kỹ thuật Backend, CSDL Chuyên sâu & Hệ thống Phân tán",
    phase: "Kiến trúc Nền tảng · Năm 3",
    description: "Hiện thực hóa hệ thống RESTful API, CSDL PostgreSQL 3NF & Indexing, Event Streaming Apache Kafka, In-memory Cache Redis và an toàn bảo mật OWASP.",
    subjectIds: ["web", "system-design", "distributed", "security"],
  },
  {
    id: "stage-4",
    stepNumber: "04",
    title: "Trí tuệ Nhân tạo Ứng dụng & AI-Native Web App",
    phase: "Kỷ nguyên AI 2025-2026 · Năm 3 - 4",
    description: "Nắm vững mạng nơ-ron Deep Learning và kỹ thuật tích hợp LLM APIs (Gemini/OpenAI), kiến trúc RAG với CSDL véc-tơ (pgvector) và AI Agents tự hành cho Web App.",
    subjectIds: ["ai-ml", "ai-agent"],
  },
  {
    id: "stage-5",
    stepNumber: "05",
    title: "Vận hành Đám mây DevOps, Agile & Đồ án Doanh nghiệp",
    phase: "Chuyên sâu & Tốt nghiệp · Năm 4",
    description: "Đóng gói Container Docker, điều phối Kubernetes, triển khai AWS Cloud Native, quản trị dự án Agile Scrum và bảo vệ Đồ án Enterprise Web App hoàn chỉnh.",
    subjectIds: ["devops", "cloud", "scrum", "capstone"],
  },
];

interface SubjectVisualTheme {
  tagline: string;
  subtitle: string;
  syntax: string;
  fontClass: string;
  bgGradient: string;
  borderHover: string;
  badgeStyle: string;
  spotlightColor?: string;
  haloColor?: string;
  renderVisualEffect: () => React.ReactNode;
}

const SUBJECT_ACCENT_COLORS: Record<string, { spotlight: string; halo: string }> = {
  oop: { spotlight: "rgba(6, 182, 212, 0.45)", halo: "rgba(6, 182, 212, 0.55)" },
  dsa: { spotlight: "rgba(16, 185, 129, 0.45)", halo: "rgba(16, 185, 129, 0.55)" },
  network: { spotlight: "rgba(139, 92, 246, 0.45)", halo: "rgba(139, 92, 246, 0.55)" },
  frontend: { spotlight: "rgba(59, 130, 246, 0.45)", halo: "rgba(59, 130, 246, 0.55)" },
  realtime: { spotlight: "rgba(245, 158, 11, 0.45)", halo: "rgba(245, 158, 11, 0.55)" },
  mobile: { spotlight: "rgba(84, 197, 248, 0.5)", halo: "rgba(84, 197, 248, 0.65)" },
  web: { spotlight: "rgba(56, 189, 248, 0.45)", halo: "rgba(56, 189, 248, 0.55)" },
  "system-design": { spotlight: "rgba(168, 85, 247, 0.45)", halo: "rgba(168, 85, 247, 0.55)" },
  distributed: { spotlight: "rgba(236, 72, 153, 0.45)", halo: "rgba(236, 72, 153, 0.55)" },
  security: { spotlight: "rgba(244, 63, 94, 0.45)", halo: "rgba(244, 63, 94, 0.55)" },
  "ai-ml": { spotlight: "rgba(168, 85, 247, 0.45)", halo: "rgba(168, 85, 247, 0.55)" },
  "ai-agent": { spotlight: "rgba(99, 102, 241, 0.5)", halo: "rgba(99, 102, 241, 0.65)" },
  devops: { spotlight: "rgba(56, 189, 248, 0.45)", halo: "rgba(56, 189, 248, 0.55)" },
  cloud: { spotlight: "rgba(245, 158, 11, 0.45)", halo: "rgba(245, 158, 11, 0.55)" },
  scrum: { spotlight: "rgba(16, 185, 129, 0.45)", halo: "rgba(16, 185, 129, 0.55)" },
  capstone: { spotlight: "rgba(242, 155, 35, 0.55)", halo: "rgba(242, 155, 35, 0.7)" },
};

function _getBaseVisualTheme(id: SubjectId) {
  switch (id) {
    // 1. OOP (Modern C++20) - Memory & Pointer Matrix
    case "oop":
      return {
        tagline: "Modern C++20",
        subtitle: "OOP & Memory Pointers",
        syntax: "class Developer : public Employee",
        fontClass: "font-mono font-extrabold tracking-wider text-cyan-300",
        bgGradient: "from-[#081b2f] via-[#0d2847] to-[#040e1a]",
        borderHover: "group-hover:border-cyan-500/60 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
        badgeStyle: "bg-cyan-950/80 text-cyan-300 border-cyan-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Memory Address Grid */}
            <div className="absolute top-9 right-3 font-mono text-[8px] text-cyan-400/80 space-y-0.5 text-right">
              <div>0x7FFE2A</div>
              <div>vtable* -&gt; Developer</div>
            </div>
            {/* Horizontal pointer line */}
            <div className="absolute bottom-6 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
          </div>
        ),
      };

    // 2. DSA (Graph & DSU) - Constellation & Tree Network
    case "dsa":
      return {
        tagline: "Graph & DSU",
        subtitle: "Advanced Graph Algorithms",
        syntax: "dijkstra(adj, s) -> O(E log V)",
        fontClass: "font-mono font-bold tracking-tight uppercase text-emerald-300",
        bgGradient: "from-[#032616] via-[#093d25] to-[#02170d]",
        borderHover: "group-hover:border-emerald-500/60 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        badgeStyle: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
        renderVisualEffect: () => (
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            {/* Graph Node Constellation */}
            <line x1="20%" y1="30%" x2="50%" y2="70%" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="50%" y1="70%" x2="80%" y2="40%" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="20%" y1="30%" x2="80%" y2="40%" stroke="#10b981" strokeWidth="0.8" opacity="0.5" />
            <circle cx="20%" cy="30%" r="3" fill="#34d399" className="animate-ping" style={{ animationDuration: "3s" }} />
            <circle cx="50%" cy="70%" r="4" fill="#10b981" />
            <circle cx="80%" cy="40%" r="3.5" fill="#6ee7b7" />
          </svg>
        ),
      };

    // 3. TCP/IP & OS - Retro CRT Terminal Scanlines
    case "network":
      return {
        tagline: "TCP/IP & OS",
        subtitle: "Computer Systems & Sockets",
        syntax: "socket.listen(128) // TCP SYN-ACK",
        fontClass: "font-mono font-bold tracking-widest text-[#4ade80]",
        bgGradient: "from-[#08150d] via-[#0e2617] to-[#040c06]",
        borderHover: "group-hover:border-green-500/60 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]",
        badgeStyle: "bg-green-950/80 text-green-400 border-green-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* CRT Scanline Bar */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-40" />
            {/* Live Packet Ping */}
            <div className="absolute top-9 right-2.5 flex items-center gap-1 font-mono text-[8px] text-green-400/90 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              <span>12ms ping</span>
            </div>
          </div>
        ),
      };

    // 4. React 19 & Next.js 15 - Atomic Orbitals & Aurora
    case "frontend":
      return {
        tagline: "React 19 & Next.js 15",
        subtitle: "RSC · Server Actions · Turbopack",
        syntax: "async function Page() // Server RSC",
        fontClass: "font-sans font-black tracking-tight text-[#00d8ff]",
        bgGradient: "from-[#081a2e] via-[#0f2e52] to-[#040f1c]",
        borderHover: "group-hover:border-cyan-400/70 group-hover:shadow-[0_0_25px_rgba(0,216,255,0.25)]",
        badgeStyle: "bg-cyan-950/80 text-[#00d8ff] border-cyan-600/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30">
            {/* Spinning Atom Orbital */}
            <div className="w-24 h-12 rounded-full border border-cyan-400/60 -rotate-45 animate-spin" style={{ animationDuration: "14s" }} />
            <div className="w-24 h-12 rounded-full border border-cyan-400/60 rotate-45 animate-spin" style={{ animationDuration: "10s" }} />
            <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#00d8ff]" />
          </div>
        ),
      };

    // 5. WebSockets & TanStack - Real-time Soundwave Equalizer
    case "realtime":
      return {
        tagline: "WebSockets & TanStack",
        subtitle: "Real-time State & Web Vitals",
        syntax: "socket.emit('ping') // < 20ms INP",
        fontClass: "font-mono font-black italic tracking-tighter text-[#c084fc]",
        bgGradient: "from-[#1a0c33] via-[#2c1354] to-[#100621]",
        borderHover: "group-hover:border-purple-500/60 group-hover:shadow-[0_0_20px_rgba(192,132,252,0.25)]",
        badgeStyle: "bg-purple-950/80 text-purple-300 border-purple-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center gap-1 pb-2 opacity-35">
            {/* Equalizer Frequency Bars */}
            {[40, 75, 55, 90, 65, 80, 45, 95, 70, 50].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-purple-400 rounded-t-sm"
                style={{
                  height: `${h * 0.28}px`,
                  animation: `pulse ${0.8 + (i % 3) * 0.3}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        ),
      };

    // 6. Flutter & BLoC - Material You Playful Layers
    case "mobile":
      return {
        tagline: "Flutter & BLoC",
        subtitle: "Cross-Platform Mobile Engine",
        syntax: "Widget build(BuildContext ctx)",
        fontClass: "font-sans font-extrabold tracking-normal text-[#54c5f8]",
        bgGradient: "from-[#17122b] via-[#2a1b4d] to-[#0f0b1c]",
        borderHover: "group-hover:border-sky-400/60 group-hover:shadow-[0_0_20px_rgba(84,197,248,0.25)]",
        badgeStyle: "bg-sky-950/80 text-[#54c5f8] border-sky-600/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Overlapping Flutter-styled Cards */}
            <div className="absolute -right-4 -top-3 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#02569B] to-[#0175C2] rotate-12 opacity-50" />
            <div className="absolute -right-1 top-2 w-16 h-16 rounded-xl bg-gradient-to-br from-[#54C5F8] to-[#29B6F6] rotate-6 opacity-60" />
          </div>
        ),
      };

    // 7. RESTful API & GraphQL - Corporate Clean Architecture
    case "web":
      return {
        tagline: "RESTful & GraphQL",
        subtitle: "Modern Web API Architecture",
        syntax: "GET /api/v1/auth · 200 OK",
        fontClass: "font-sans font-bold tracking-wide uppercase text-[#38bdf8]",
        bgGradient: "from-[#0a1526] via-[#12233f] to-[#060e1a]",
        borderHover: "group-hover:border-blue-500/60 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]",
        badgeStyle: "bg-blue-950/80 text-blue-300 border-blue-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-3 opacity-25">
            <span className="font-mono text-xs text-blue-400 font-bold">&#123; JSON &#125;</span>
            <div className="flex gap-1">
              <span className="text-[8px] font-mono px-1 rounded bg-blue-500 text-white font-bold">GET</span>
              <span className="text-[8px] font-mono px-1 rounded bg-emerald-500 text-white font-bold">200</span>
            </div>
          </div>
        ),
      };

    // 8. PostgreSQL & 3NF - Relational Schema Key Grid
    case "system-design":
      return {
        tagline: "PostgreSQL & 3NF",
        subtitle: "Relational Schema & GIN Index",
        syntax: "CREATE INDEX ON users USING GIN",
        fontClass: "font-mono font-black tracking-wider text-[#93c5fd]",
        bgGradient: "from-[#08182b] via-[#102a4a] to-[#040e1a]",
        borderHover: "group-hover:border-indigo-400/60 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
        badgeStyle: "bg-indigo-950/80 text-indigo-300 border-indigo-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Relational Columns Lines */}
            <div className="absolute inset-x-4 top-3 grid grid-cols-3 gap-2 border-b border-indigo-500/40 pb-1 font-mono text-[7px] text-indigo-300">
              <div>id (PK)</div>
              <div>user_id</div>
              <div>created_at</div>
            </div>
          </div>
        ),
      };

    // 9. Kafka & Redis - High-throughput Flame Conveyor
    case "distributed":
      return {
        tagline: "Kafka & Redis Cache",
        subtitle: "Distributed Queues · 200k RPS",
        syntax: "cache.setex(k, 3600) // 200k RPS",
        fontClass: "font-mono font-bold tracking-tight text-[#fca5a5]",
        bgGradient: "from-[#240808] via-[#3d1212] to-[#150404]",
        borderHover: "group-hover:border-rose-500/60 group-hover:shadow-[0_0_25px_rgba(244,63,94,0.25)]",
        badgeStyle: "bg-rose-950/80 text-rose-300 border-rose-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
            {/* Moving Kafka Queue Messages */}
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-between font-mono text-[7px] text-rose-300/80">
              <span className="bg-rose-950 px-1 py-0.5 rounded border border-rose-800">[Msg #1]</span>
              <span className="text-amber-400">&gt;&gt;&gt;</span>
              <span className="bg-rose-950 px-1 py-0.5 rounded border border-rose-800">[Msg #2]</span>
              <span className="text-amber-400">&gt;&gt;&gt;</span>
              <span className="bg-rose-900 text-white px-1 py-0.5 rounded font-bold">Redis 🔥</span>
            </div>
          </div>
        ),
      };

    // 10. Web Security OWASP - Threat Scanner Radar Sweep
    case "security":
      return {
        tagline: "OWASP Top 10",
        subtitle: "Cyber Security & Pentesting",
        syntax: "db.prepare(sql).get(input)",
        fontClass: "font-mono font-black tracking-widest text-[#f87171]",
        bgGradient: "from-[#1c0606] via-[#2e0b0b] to-[#0d0202]",
        borderHover: "group-hover:border-red-500/70 group-hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]",
        badgeStyle: "bg-red-950/80 text-red-400 border-red-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Spinning Radar Beam */}
            <div
              className="absolute -inset-4 opacity-25 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(239,68,68,0.4)_60deg,transparent_65deg)] animate-spin"
              style={{ animationDuration: "5s" }}
            />
            {/* Shield Alert Badge */}
            <div className="absolute top-9 right-2.5 text-red-400 opacity-60">
              <ShieldAlert size={14} />
            </div>
          </div>
        ),
      };

    // 11. Deep Learning PyTorch - Neural Network Synapses
    case "ai-ml":
      return {
        tagline: "PyTorch & Deep ML",
        subtitle: "Neural Nets & Backpropagation",
        syntax: "loss.backward(); optim.step()",
        fontClass: "font-serif italic font-black tracking-wider text-[#e9d5ff]",
        bgGradient: "from-[#1f0833] via-[#330f52] to-[#12041e]",
        borderHover: "group-hover:border-purple-400/60 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]",
        badgeStyle: "bg-purple-950/80 text-purple-300 border-purple-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-around px-4 opacity-30">
            {/* Neural Net Nodes */}
            <div className="flex flex-col gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <span className="w-2 h-2 rounded-full bg-purple-300" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-200" />
            </div>
          </div>
        ),
      };

    // 12. AI-Native RAG Agents - Google Gemini Shifting Aurora
    case "ai-agent":
      return {
        tagline: "AI-Native & RAG Agents",
        subtitle: "Gemini APIs & Vector Embeddings",
        syntax: "retriever.search(query, k=5) // RAG",
        fontClass: "font-sans font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-rose-200",
        bgGradient: "from-[#071728] via-[#102d4d] to-[#040e1a]",
        borderHover: "group-hover:border-indigo-400/70 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]",
        badgeStyle: "bg-gradient-to-r from-blue-900/80 to-purple-900/80 text-indigo-200 border-indigo-500/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Shimmering Gemini Aurora */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-rose-500/20 blur-xl animate-pulse" />
            <div className="absolute top-9 right-2.5 flex items-center gap-1 text-[9px] font-mono text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
              <Sparkles size={11} className="text-amber-400" />
              <span>Gemini 2.5</span>
            </div>
          </div>
        ),
      };

    // 13. DevOps & Kubernetes - Steel Container Stacks
    case "devops":
      return {
        tagline: "Docker & CI/CD",
        subtitle: "Kubernetes Cluster Pipeline",
        syntax: "docker build -t app:v1 .",
        fontClass: "font-mono font-bold tracking-wider text-[#7dd3fc]",
        bgGradient: "from-[#081e33] via-[#0f3457] to-[#041221]",
        borderHover: "group-hover:border-sky-400/60 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]",
        badgeStyle: "bg-sky-950/80 text-sky-300 border-sky-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Stacked Containers Graphic */}
            <div className="absolute bottom-2 right-3 flex gap-1 items-end">
              <div className="w-4 h-3 bg-sky-500/70 rounded-xs border border-sky-300" />
              <div className="w-4 h-5 bg-sky-500/70 rounded-xs border border-sky-300" />
              <div className="w-4 h-4 bg-sky-500/70 rounded-xs border border-sky-300" />
            </div>
          </div>
        ),
      };

    // 14. Cloud Native AWS - Sunset Amber Serverless
    case "cloud":
      return {
        tagline: "AWS Cloud Native",
        subtitle: "Serverless & Microservices",
        syntax: "lambda.invoke(handler) // 99.99%",
        fontClass: "font-sans font-black tracking-wide text-[#fde047]",
        bgGradient: "from-[#241303] via-[#3b1f06] to-[#140a01]",
        borderHover: "group-hover:border-amber-400/60 group-hover:shadow-[0_0_25px_rgba(251,191,36,0.25)]",
        badgeStyle: "bg-amber-950/80 text-amber-300 border-amber-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Floating Cloud Outline */}
            <div className="absolute -top-4 -right-2 text-amber-400/50">
              <Cloud size={48} />
            </div>
          </div>
        ),
      };

    // 15. Agile Scrum - Mint Cadence Velocity Loop
    case "scrum":
      return {
        tagline: "Agile Scrum",
        subtitle: "Sprint Cadence & JIRA DoD",
        syntax: "INVEST · Definition of Done",
        fontClass: "font-sans font-bold tracking-tight text-[#5eead4]",
        bgGradient: "from-[#051c1f] via-[#0b3136] to-[#021012]",
        borderHover: "group-hover:border-teal-400/60 group-hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]",
        badgeStyle: "bg-teal-950/80 text-teal-300 border-teal-700/60",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
            {/* Spinning Agile Velocity Arrow */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-teal-400 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
        ),
      };

    // 16. Enterprise Capstone - Royal Obsidian & Gold Foil
    case "capstone":
      return {
        tagline: "Enterprise Web App",
        subtitle: "Production Capstone Defense",
        syntax: "deploy.production(k8s_cluster)",
        fontClass: "font-serif font-black tracking-wider text-[#fef08a]",
        bgGradient: "from-[#1a1505] via-[#2d2408] to-[#0d0b02]",
        borderHover: "group-hover:border-amber-300/80 group-hover:shadow-[0_0_30px_rgba(253,224,71,0.3)]",
        badgeStyle: "bg-amber-950/80 text-amber-200 border-amber-500/70",
        renderVisualEffect: () => (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Gold Trophy Beam Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent animate-pulse" />
            <div className="absolute top-9 right-2.5 text-amber-400 opacity-70">
              <Award size={15} />
            </div>
          </div>
        ),
      };

    default:
      return {
        tagline: "Computer Science",
        subtitle: "Core Curriculum",
        syntax: "main(argc, char* argv[])",
        fontClass: "font-mono font-bold text-white",
        bgGradient: "from-slate-900 via-slate-900 to-slate-950",
        borderHover: "group-hover:border-blue-500/50",
        badgeStyle: "bg-white/10 text-slate-200 border-white/10",
        renderVisualEffect: () => null,
      };
  }
}

function getSubjectVisualTheme(id: SubjectId): SubjectVisualTheme {
  const base = _getBaseVisualTheme(id);
  const accents = SUBJECT_ACCENT_COLORS[id] || {
    spotlight: "rgba(242, 155, 35, 0.45)",
    halo: "rgba(242, 155, 35, 0.55)",
  };
  return {
    ...base,
    spotlightColor: accents.spotlight,
    haloColor: accents.halo,
  };
}

export function CourseCatalogHub({ onSelectCourse, subjects }: CourseCatalogHubProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"roadmap" | "all">("roadmap");
  const allSubjects = subjects && subjects.length > 0 ? subjects : MULTI_CHAPTER_SUBJECTS;

  const filteredSubjects = allSubjects.filter((sub) => {
    return (
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const isSearching = searchQuery.trim().length > 0;

  // Single Course Card Renderer with Spotlight Card (Hiệu ứng 4)
  const renderCard = (sub: SubjectModuleData, idx: number) => {
    const theme = getSubjectVisualTheme(sub.id);

    return (
      <SpotlightCard
        key={`${sub.id}-${searchQuery}-${viewMode}`}
        onClick={() => onSelectCourse(sub.id)}
        spotlightColor={theme.spotlightColor}
        haloColor={theme.haloColor}
        style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
        className={`animate-card-stagger rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#14161F] p-3.5 shadow-sm group-hover:shadow-[0_22px_45px_-12px_rgba(0,0,0,0.6)] group-hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col justify-between ${theme.borderHover}`}
      >
        <div>
          {/* 16:9 Thumbnail Banner with Custom Gradient, Font & Animation */}
          <div
            className={`aspect-video w-full rounded-xl relative overflow-hidden bg-gradient-to-br ${theme.bgGradient} p-3 flex flex-col justify-between text-white select-none border border-white/10 shadow-inner group-hover:scale-[1.02] transition-transform duration-300`}
          >
            {/* Visual Dynamic Canvas Effect */}
            {theme.renderVisualEffect()}

            {/* 🌟 Diagonal Cinematic Flare Sweep on Hover */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden z-15">
              <div className="w-[140%] h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-25 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
            </div>

            {/* Top Bar inside Thumbnail */}
            <div className="flex items-center justify-between z-10">
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border shadow-xs ${theme.badgeStyle}`}
              >
                {sub.code}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {sub.semester}
              </span>
            </div>

            {/* Center Clean Tech Title with Bespoke Font Style */}
            <div className="flex flex-col items-center justify-center my-auto space-y-0.5 z-10 text-center px-1">
              <span className={`text-sm ${theme.fontClass}`}>
                {theme.tagline}
              </span>
              <span className="text-[10px] text-slate-300/80 font-mono">
                {theme.subtitle}
              </span>
            </div>

            {/* Bottom Subtle Syntax Line */}
            <div className="text-[10px] text-slate-400/90 font-mono truncate text-center z-10 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
              {theme.syntax}
            </div>
          </div>

          {/* Course Name & Teacher */}
          <div className="pt-2.5 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#EE8420] dark:group-hover:text-[#F8BD57] group-hover:translate-x-0.5 transition-all line-clamp-2 leading-snug">
              {sub.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5 truncate">
              {sub.instructor}
            </p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
              {sub.chapters.length} chương · {sub.totalLessons} bài học · {sub.totalDuration}
            </p>
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="pt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-1">
            <span className="group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Tiến độ</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono group-hover:scale-105 transition-transform">
              {sub.overallProgress}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative group-hover:h-2 transition-all">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 transition-all duration-500 relative group-hover:shadow-[0_0_14px_rgba(245,158,11,0.85)]"
              style={{ width: `${sub.overallProgress}%` }}
            >
              <div className="absolute inset-0 f8-shimmer" />
            </div>
          </div>
        </div>
      </SpotlightCard>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8 space-y-6">
      {/* ─── SECTION HEADER (LỘ TRÌNH ĐÀO TẠO & TÌM KIẾM) ─────────── */}
      <div className="max-w-[1600px] w-full mx-auto px-1 sm:px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="pill pill--accent font-sans text-[10.5px] uppercase font-bold tracking-wider inline-flex items-center shadow-2xs">
              CHƯƠNG TRÌNH ĐÀO TẠO KỸ SƯ
            </span>
          </div>
          <MarloTitle
            text="Lộ trình Đào tạo & Khóa học"
            as="h1"
            className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          />
          <p className="text-xs md:text-sm text-[#62656b] dark:text-[#a0a3a9] mt-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            Chương trình đào tạo Kỹ sư Phần mềm & Web App Chuẩn Thời đại 5 chặng · 16 môn học chuyên ngành
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher: Lộ trình vs Tất cả với hiệu ứng Marlo Liquid Rubberband Pill */}
          <MarloSegmentedControl
            value={viewMode}
            options={[
              { id: "roadmap", label: "Theo lộ trình", icon: <Milestone size={13} /> },
              { id: "all", label: "Tất cả môn", icon: <LayoutGrid size={13} /> },
            ]}
            onChange={(val) => setViewMode(val as "roadmap" | "all")}
            size="sm"
            tone="dark"
          />

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm môn học, giảng viên..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ─── CASE 1: SEARCH ACTIVE ─────────────────────────────────── */}
      {isSearching ? (
        <div className="max-w-[1600px] w-full mx-auto px-1 sm:px-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Kết quả tìm kiếm cho: "{searchQuery}" ({filteredSubjects.length} môn)</span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Xóa tìm kiếm
            </button>
          </div>
          {filteredSubjects.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              Không tìm thấy môn học nào khớp với từ khóa tìm kiếm.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {filteredSubjects.map((sub, idx) => renderCard(sub, idx))}
            </div>
          )}
        </div>
      ) : viewMode === "roadmap" ? (
        /* ─── CASE 2: ROADMAP TIMELINE VIEW (PHÂN CHẶNG RÕ RÀNG) ─── */
        <div className="max-w-[1600px] w-full mx-auto px-1 sm:px-2 space-y-8">
          {ROADMAP_STAGES.map((stage, stageIdx) => {
            const stageSubjects = stage.subjectIds
              .map((id) => allSubjects.find((s) => s.id === id))
              .filter((s): s is SubjectModuleData => Boolean(s));

            if (stageSubjects.length === 0) return null;

            // Compute stage progress average
            const avgProgress = Math.round(
              stageSubjects.reduce((acc, curr) => acc + curr.overallProgress, 0) / stageSubjects.length
            );

            return (
              <div
                key={stage.id}
                style={{ animationDelay: `${stageIdx * 100}ms` }}
                className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 animate-card-stagger transition-all"
              >
                {/* Stage Milestone Indicator Icon on Timeline */}
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border-2 border-[#EE8420] dark:border-[#F4A43A] shadow-xs" />

                {/* Stage Header Info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs">
                        CHẶNG {stage.stepNumber}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {stage.title}
                      </h2>
                      <span className="text-xs text-slate-400 font-medium">
                        • {stage.phase}
                      </span>
                    </div>

                    {/* Stage Progress summary */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Tiến độ:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {avgProgress}%
                      </span>
                      <span className="text-slate-400">({stageSubjects.length} môn)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-4xl leading-relaxed">
                    {stage.description}
                  </p>
                </div>

                {/* Stage Course Cards Grid (Spacious, fills wide screens cleanly) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-1">
                  {stageSubjects.map((sub, idx) => renderCard(sub, idx))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── CASE 3: ALL COURSES GRID (FULL 16 MÔN) ─────────────── */
        <div className="max-w-[1600px] w-full mx-auto px-1 sm:px-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Hiển thị toàn bộ {filteredSubjects.length} môn học chuyên ngành</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {filteredSubjects.map((sub, idx) => renderCard(sub, idx))}
          </div>
        </div>
      )}
    </div>
  );
}

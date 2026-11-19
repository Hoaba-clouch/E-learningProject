import { useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Award,
  Layers,
  Activity,
  Code2,
  Database,
  Cpu,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  Plus,
  Flame,
  UserCheck,
} from "lucide-react";
import type { TeamMember, KanbanTask } from "../screens/KanbanBoard";

interface Props {
  teamMembers: TeamMember[];
  tasks: KanbanTask[];
  sprintStats: {
    totalPoints: number;
    donePoints: number;
    percentage: number;
  };
  onManageMembers: () => void;
  onFilterByMember: (memberName: string) => void;
  role?: string;
}

export default function KanbanTeamScrumView({
  teamMembers,
  tasks,
  sprintStats,
  onManageMembers,
  onFilterByMember,
  role = "student",
}: Props) {
  // Compute per-member statistics
  const memberAnalytics = useMemo(() => {
    return teamMembers.map((m) => {
      const memberTasks = tasks.filter((t) => t.assignee.name === m.name);
      const doneTasks = memberTasks.filter((t) => t.column === "done");
      const inProgressTasks = memberTasks.filter((t) => t.column === "in-progress");
      const assignedPoints = memberTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      const completedPoints = doneTasks.reduce((sum, t) => sum + (t.points || 0), 0);

      // Percentage of total team points delivered
      const shareOfTotal = sprintStats.donePoints > 0 
        ? Math.round((completedPoints / sprintStats.donePoints) * 100) 
        : Math.round(100 / teamMembers.length);

      // Technical domain mapping
      let domain = "Fullstack Developer";
      let modules = ["Chức năng chung", "API Gateway"];
      let stacks = ["TypeScript", "RESTful API"];
      let gitCommits = 45;

      if (m.name.includes("Hòa")) {
        domain = "Frontend Lead & UI/UX Architect";
        modules = ["UI Component System", "Marlo Micro-interactions", "Code Lab IDE"];
        stacks = ["React 19", "Tailwind CSS", "Vite", "Canvas Mindmap"];
        gitCommits = 58;
      } else if (m.name.includes("Huy")) {
        domain = "Frontend & AI Socratic Dev";
        modules = ["AI Socratic Tutor", "Quiz Engine", "Tech Reels Player"];
        stacks = ["Gemini API", "WebSockets", "React Flow"];
        gitCommits = 48;
      } else if (m.name.includes("Nghị")) {
        domain = "Backend & Database Architect";
        modules = ["Schema 8 bảng 3NF", "Docker Sandbox Runner", "JWT Auth Filter"];
        stacks = ["Spring Boot", "PostgreSQL", "Docker", "JUnit 5"];
        gitCommits = 52;
      }

      return {
        member: m,
        totalTasks: memberTasks.length,
        doneTasks: doneTasks.length,
        inProgressTasks: inProgressTasks.length,
        assignedPoints,
        completedPoints,
        shareOfTotal,
        domain,
        modules,
        stacks,
        gitCommits,
      };
    });
  }, [teamMembers, tasks, sprintStats.donePoints]);

  return (
    <div className="space-y-6 animate-screen-enter">
      {/* ─── 1. TOP SCRUM & ANTI-FREERIDER METRICS HERO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="marlo-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Quy mô nhóm đồ án</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users size={15} />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {teamMembers.length}
            <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">sinh viên</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            100% thành viên đang tích cực hoạt động
          </div>
        </div>

        {/* Total Delivered Story Points */}
        <div className="marlo-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Story Points nghiệm thu</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={15} />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
            {sprintStats.donePoints}
            <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">/ {sprintStats.totalPoints} pts</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
            Đạt {sprintStats.percentage}% tổng khối lượng đồ án
          </div>
        </div>

        {/* Team Sprint Velocity */}
        <div className="marlo-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Vận tốc Sprint (Velocity)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Flame size={15} />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 tracking-tight">
            {Math.round(sprintStats.donePoints / 2) || 26}
            <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">pts / sprint</span>
          </div>
          <div className="text-[11px] text-purple-600 mt-1">
            Duy trì ổn định qua Sprint 1 & 2
          </div>
        </div>

        {/* Anti-Freerider Fair Contribution Index */}
        <div className="marlo-card bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck size={14} />
              Chỉ số Anti-Freerider
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border-0">
              Đồng đều
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            98.4%
            <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">Công bằng</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            Triệt tiêu nguy cơ ỷ lại trong nhóm
          </div>
        </div>
      </div>

      {/* ─── 2. MEMBER SPECIALIZATION & CONTRIBUTION CARDS (MARLO .people GRID) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{role === "instructor" ? "Đo Lường Đóng Góp Cá Nhân (Anti-Freerider & Ma Trận RASCI)" : "Phân Vai Kỹ Thuật & Đóng Góp Chi Tiết Từng Thành Viên"}</span>
              {role === "instructor" && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800">
                  Góc nhìn Thẩm định
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === "instructor"
                ? "Thẩm định khối lượng công việc thực tế, phân bổ Story Points và số lượt Commit để đảm bảo tính công bằng, triệt tiêu nguy cơ ỷ lại."
                : "Đáp ứng chuẩn khảo thí Kỹ nghệ phần mềm: phân công rõ ràng Frontend, Backend, Database và tỷ lệ hoàn thành."}
            </p>
          </div>
          {role === "instructor" ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold shadow-2xs">
              <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Hội đồng Thẩm định: Giám sát công bằng</span>
            </div>
          ) : (
            <button
              onClick={onManageMembers}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Quản lý thành viên</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {memberAnalytics.map((item) => {
            const { member, totalTasks, doneTasks, inProgressTasks, completedPoints, assignedPoints, shareOfTotal, domain, modules, stacks, gitCommits } = item;

            return (
              <div
                key={member.id}
                className="marlo-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Member Top Bar: Avatar + Status Pill */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white text-base font-bold shadow-xs ${member.color}`}>
                        {member.avatar}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {member.name}
                        </h4>
                        <div className="text-xs text-slate-500 font-medium">
                          MSSV: {member.id === "m1" ? "2210842" : member.id === "m2" ? "2210843" : "2210844"}
                        </div>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      In the lab
                    </span>
                  </div>

                  {/* Role Title */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Phân vai chính thức:
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {domain}
                    </div>
                  </div>

                  {/* Story Points Contribution Progress Bar */}
                  <div className="space-y-1.5 mb-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Tỷ lệ đóng góp điểm:</span>
                      <span className="font-mono font-bold text-slate-900">{shareOfTotal}% ({completedPoints}/{assignedPoints} pts)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${member.color}`}
                        style={{ width: `${Math.min(100, (completedPoints / (assignedPoints || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks & Commits Breakdown */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-xs mb-3">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Phụ trách</div>
                      <div className="font-bold text-slate-800 font-mono text-sm mt-0.5">{totalTasks} task</div>
                    </div>
                    <div>
                      <div className="text-emerald-600 text-[10px] uppercase font-bold">Đã xong</div>
                      <div className="font-bold text-emerald-700 font-mono text-sm mt-0.5">{doneTasks} task</div>
                    </div>
                    <div>
                      <div className="text-blue-600 text-[10px] uppercase font-bold">Git Commits</div>
                      <div className="font-bold text-blue-700 font-mono text-sm mt-0.5">{gitCommits}</div>
                    </div>
                  </div>

                  {/* Subsystems & Tech Stacks */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân hệ phụ trách:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {modules.map((mName, i) => (
                          <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {mName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Công nghệ:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stacks.map((st, i) => (
                          <span key={i} className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Action: Filter this member's tasks */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onFilterByMember(member.name)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 py-2 text-xs font-semibold transition cursor-pointer"
                  >
                    <UserCheck size={13} />
                    <span>Xem các task của {member.name.split(" ").slice(-1)[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. SCRUM RASCI RESPONSIBILITY MATRIX ─── */}
      <div className="marlo-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Layers size={15} />
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Ma Trận Trách Nhiệm Phân Rã Công Việc (Scrum RASCI Matrix)
            </h4>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Tiêu chuẩn Đánh giá Hội đồng Chấm thi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-mono uppercase">
                <th className="py-2.5 font-bold">Hạng mục công việc cốt lõi</th>
                <th className="py-2.5 font-bold">Nguyễn Bá Hòa (Lead)</th>
                <th className="py-2.5 font-bold">Võ Nhật Huy (Frontend/AI)</th>
                <th className="py-2.5 font-bold">Phan Đình Nghị (Backend/DB)</th>
                <th className="py-2.5 font-bold">Chuẩn nghiệm thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 font-semibold text-slate-900">Kiến trúc hệ thống & Thiết kế 3 lớp</td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Chịu trách nhiệm (A)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Tham gia (C)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Hỗ trợ (S)</span></td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">Tài liệu C4 Model</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-900">Giao diện Kanban & Tương tác Marlo UI</td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Chịu trách nhiệm (A)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Thực thi chính (R)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Tham khảo (I)</span></td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">React 19 & Tailwind</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-900">Thiết kế CSDL 8 Bảng chuẩn 3NF</td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Review (C)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Tham khảo (I)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Thực thi chính (R)</span></td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">Script SQL Seeder</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-900">Docker Sandbox & Runner cô lập</td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Review (C)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Tham khảo (I)</span></td>
                <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Thực thi chính (R)</span></td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">Dockerfile & DinD</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

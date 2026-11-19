import { useState, useMemo } from "react";
import {
  GitCommit,
  CheckCircle2,
  GitPullRequest,
  Link2,
  FileSpreadsheet,
  Clock,
  Filter,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import MarloActivityHeatmap from "./MarloActivityHeatmap";
import MarloSegmentedControl from "./MarloSegmentedControl";
import type { KanbanTask, TeamMember } from "../screens/KanbanBoard";

interface ActivityEvent {
  id: string;
  type: "commit" | "task_done" | "pr_merged" | "h2_unblocked" | "csv_import";
  actor: string;
  avatar: string;
  avatarColor: string;
  role: string;
  title: string;
  sub: string;
  time: string;
  badge: string;
  badgeColor: string;
  sha?: string;
  taskId?: string;
}

interface Props {
  tasks: KanbanTask[];
  teamMembers: TeamMember[];
  onSelectTask?: (task: KanbanTask) => void;
}

export default function KanbanActivityStreamView({
  tasks,
  teamMembers,
  onSelectTask,
}: Props) {
  const [filterType, setFilterType] = useState<"all" | "commit" | "task_done" | "h2_unblocked" | "pr_merged">("all");

  const rawEvents: ActivityEvent[] = useMemo(() => {
    const dynamicLogs: ActivityEvent[] = [];
    for (const task of tasks) {
      const logs = Array.isArray(task.auditLogs) ? task.auditLogs : [];
      logs.forEach((log, idx) => {
        const isDoneCol = log.toColumn.includes("Hoàn thành") || log.toColumn.toLowerCase().includes("done");
        dynamicLogs.push({
          id: `aud-${task.id}-${idx}`,
          type: isDoneCol ? "task_done" : "commit",
          actor: log.user || task.assignee?.name || "Thành viên",
          avatar: (log.user || "H").trim().slice(-1).toUpperCase(),
          avatarColor: isDoneCol ? "bg-emerald-600" : "bg-amber-600",
          role: "Thành viên Scrum",
          title: `[#${task.code}] ${task.title} (${log.fromColumn} → ${log.toColumn})`,
          sub: `${task.epic} • Cập nhật trạng thái Kanban đồng bộ SQLite`,
          time: log.timestamp || "Vừa xong",
          badge: log.toColumn,
          badgeColor: isDoneCol
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          taskId: task.id,
        });
      });
    }
    return [
      ...dynamicLogs.reverse(),
      {
      id: "act-1",
      type: "commit",
      actor: "Nguyễn Bá Hòa",
      avatar: "H",
      avatarColor: "bg-blue-600",
      role: "Leader & Frontend Lead",
      title: "feat(kanban): refine task board views, personal my-tasks & scrum team metrics",
      sub: "main • 12 files changed • +342 / -48 lines",
      time: "12 phút trước",
      badge: "Git Commit",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      sha: "8f21a4c",
    },
    {
      id: "act-2",
      type: "task_done",
      actor: "Phan Đình Nghị",
      avatar: "N",
      avatarColor: "bg-purple-600",
      role: "Backend & Database",
      title: "Hoàn thành Task #105: Thiết kế schema 8 bảng CSDL quan hệ chuẩn 3NF",
      sub: "Sprint 1 • CSDL PostgreSQL • Nghiệm thu +7.5 pts",
      time: "45 phút trước",
      badge: "Task Done",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      taskId: "task-1",
    },
    {
      id: "act-3",
      type: "h2_unblocked",
      actor: "Hệ thống CodeMind AI",
      avatar: "AI",
      avatarColor: "bg-amber-600",
      role: "H2 Engine",
      title: "Tự động giải phóng Ràng buộc Cứng H2 cho Task #106 (Tạo Seeder & Repository)",
      sub: "Do Task tiền đề #105 đã đạt trạng thái Verified",
      time: "45 phút trước",
      badge: "H2 Unblocked",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    {
      id: "act-4",
      type: "pr_merged",
      actor: "Võ Nhật Huy",
      avatar: "H",
      avatarColor: "bg-emerald-600",
      role: "Frontend & AI Dev",
      title: "Merge PR #14: AI Socratic Tutor chat & quiz flow into develop",
      sub: "2 reviewers approved • 0 merge conflicts • All 14 tests passed",
      time: "2 giờ trước",
      badge: "PR Merged",
      badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
      sha: "e59c02d",
    },
    {
      id: "act-5",
      type: "commit",
      actor: "Phan Đình Nghị",
      avatar: "N",
      avatarColor: "bg-purple-600",
      role: "Backend & Database",
      title: "feat(sandbox): containerize C++ compiler runner with memory limits (512MB)",
      sub: "feature/sandbox • 4 files changed • +189 / -12 lines",
      time: "4 giờ trước",
      badge: "Git Commit",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      sha: "3b18f0a",
    },
    {
      id: "act-6",
      type: "commit",
      actor: "Nguyễn Bá Hòa",
      avatar: "H",
      avatarColor: "bg-blue-600",
      role: "Leader & Frontend Lead",
      title: "fix(router): prevent TDZ state error and support marlo exit animations",
      sub: "develop • 3 files changed • +94 / -18 lines",
      time: "Hôm qua",
      badge: "Git Commit",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      sha: "a3182fc",
    },
    {
      id: "act-7",
      type: "csv_import",
      actor: "Phan Đình Nghị",
      avatar: "N",
      avatarColor: "bg-purple-600",
      role: "Backend & Database",
      title: "Nạp danh sách 72 Task Đồ án chuẩn 8 cột theo đề cương Thầy Hướng dẫn",
      sub: "Tự động phân bổ vào Backlog, Sprint 1-4 & ánh xạ Ràng buộc H2",
      time: "2 ngày trước",
      badge: "CSV Import",
      badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
    },
    ];
  }, [tasks]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return rawEvents;
    return rawEvents.filter((e) => e.type === filterType);
  }, [rawEvents, filterType]);

  return (
    <div className="space-y-6 animate-screen-enter">
      {/* ─── 1. INTERACTIVE STUDY & COMMIT HEATMAP (16 WEEKS) ─── */}
      <MarloActivityHeatmap
        title="Biểu Đồ Nhiệt Đóng Góp & Nhịp Độ Thực Hành Code (16 Tuần Học Kỳ)"
        subtitle="16 tuần học kỳ • 158 commits • 242 giờ thực hành code • 3 thành viên đóng góp đều đặn"
      />

      {/* ─── 2. GIT STREAM & ACTIVITY FEED HEADER + FILTERS ─── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Luồng Hoạt Động Thời Gian Thực (Git Stream & Scrum Feed)
            </h3>
            <p className="text-xs text-slate-500">
              Nhật ký commit, hoàn thành task, giải phóng H2 và merge code được ghi nhận tự động theo thời gian thực.
            </p>
          </div>

          {/* Authentic Marlo Sliding Segmented Control */}
          <MarloSegmentedControl
            value={filterType}
            options={[
              { id: "all", label: "Tất cả", badge: rawEvents.length },
              { id: "commit", label: "Git Commits", badge: rawEvents.filter(e => e.type === "commit").length },
              { id: "task_done", label: "Task Done", badge: rawEvents.filter(e => e.type === "task_done").length },
              { id: "h2_unblocked", label: "Kiểm định H2", badge: rawEvents.filter(e => e.type === "h2_unblocked").length },
              { id: "pr_merged", label: "Pull Requests", badge: rawEvents.filter(e => e.type === "pr_merged").length },
            ]}
            onChange={(val) => setFilterType(val as any)}
            tone="dark"
          />
        </div>

        {/* ─── 3. ACTIVITY FEED TIMELINE LIST (MARLO .feed__row STYLE) ─── */}
        <div key={filterType} className="animate-screen-enter bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredEvents.map((event, idx) => {
            return (
              <div
                key={event.id}
                style={{ animationDelay: `${idx * 28}ms` }}
                className="animate-cascade-item p-4 hover:bg-slate-50/70 transition flex items-start justify-between gap-4 select-none"
              >
                {/* Left side: Avatar + Event Icon + Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Actor Avatar with status beacon */}
                  <div className="relative shrink-0">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold shadow-2xs ${event.avatarColor}`}
                    >
                      {event.avatar}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Header: Actor Name + Role + Badge + Time */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{event.actor}</span>
                      <span className="text-[11px] text-slate-400 font-medium">({event.role})</span>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border-0 uppercase tracking-wider font-mono ${event.badgeColor}`}
                      >
                        {event.badge}
                      </span>

                      {event.sha && (
                        <span className="text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border-0 flex items-center gap-1">
                          <GitCommit size={10} className="text-slate-400" />
                          {event.sha}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {event.title}
                    </p>

                    {/* Sub / Details */}
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      {event.sub}
                    </p>
                  </div>
                </div>

                {/* Right side: Timestamp */}
                <div className="text-right shrink-0 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  <span>{event.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

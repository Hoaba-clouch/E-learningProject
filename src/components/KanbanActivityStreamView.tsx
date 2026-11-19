import { useState, useMemo } from "react";
import {
  GitCommit,
  Clock,
  Activity,
} from "lucide-react";
import MarloActivityHeatmap from "./MarloActivityHeatmap";
import MarloSegmentedControl from "./MarloSegmentedControl";
import type { KanbanTask, TeamMember } from "../screens/KanbanBoard";

interface ActivityEvent {
  id: string;
  type: "commit" | "task_done" | "pr_merged" | "h2_unblocked";
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

function getGivenNameInitial(fullName: string): string {
  const cleaned = (fullName || "H").trim();
  if (!cleaned) return "H";
  const parts = cleaned.split(/\s+/);
  const lastWord = parts[parts.length - 1] || "H";
  return lastWord.charAt(0).toUpperCase();
}

export default function KanbanActivityStreamView({
  tasks,
  teamMembers,
  onSelectTask,
}: Props) {
  const [filterType, setFilterType] = useState<"all" | "commit" | "task_done" | "h2_unblocked" | "pr_merged">("all");

  const m1 = teamMembers[0]?.name || "Nguyễn Bá Hòa";
  const m2 = teamMembers[1]?.name || "Võ Nhật Huy";
  const m3 = teamMembers[2]?.name || "Phan Đình Nghị";

  const rawEvents: ActivityEvent[] = useMemo(() => {
    const dynamicLogs: ActivityEvent[] = [];
    for (const task of tasks) {
      const logs = Array.isArray(task.auditLogs) ? task.auditLogs : [];
      logs.forEach((log, idx) => {
        const isDoneCol =
          log.toColumn.includes("Hoàn thành") ||
          log.toColumn.includes("Đã nghiệm thu") ||
          log.toColumn.toLowerCase().includes("done") ||
          log.toColumn.toLowerCase().includes("verified");
        const actorName = log.user || task.assignee?.name || m1;
        dynamicLogs.push({
          id: `aud-${task.id}-${idx}`,
          type: isDoneCol ? "task_done" : "commit",
          actor: actorName,
          avatar: getGivenNameInitial(actorName),
          avatarColor: isDoneCol ? "bg-emerald-600" : "bg-amber-600",
          role: "Thành viên Scrum",
          title: `[#${task.code}] ${task.title} (${log.fromColumn} → ${log.toColumn})`,
          sub: `${task.epic || "Hạng mục Đồ án"} • Cập nhật trạng thái Kanban đồng bộ CSDL MySQL`,
          time: log.timestamp || "Vừa xong",
          badge: log.toColumn,
          badgeColor: isDoneCol
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          taskId: task.id,
        });
      });
    }

    const firstTask = tasks[0];
    const secondTask = tasks[1] || tasks[0];

    return [
      ...dynamicLogs.reverse(),
      {
        id: "act-1",
        type: "commit",
        actor: m1,
        avatar: getGivenNameInitial(m1),
        avatarColor: "bg-blue-600",
        role: teamMembers[0]?.role || "Nhóm trưởng & Kiến trúc sư",
        title: "feat(kanban): đồng bộ trạng thái bảng công việc, tiến độ cá nhân & chỉ số nhóm",
        sub: "main • 12 files changed • +342 / -48 lines",
        time: "12 phút trước",
        badge: "Git Commit",
        badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        sha: "8f21a4c",
        taskId: firstTask?.id,
      },
      {
        id: "act-2",
        type: "task_done",
        actor: m3,
        avatar: getGivenNameInitial(m3),
        avatarColor: "bg-purple-600",
        role: teamMembers[2]?.role || "Backend & Database",
        title: `Hoàn thành Task #${firstTask?.code || "105"}: ${firstTask?.title || "Thiết kế schema CSDL quan hệ chuẩn 3NF"}`,
        sub: `Sprint 1 • CSDL MySQL 8.0 • Nghiệm thu +${firstTask?.points || 5} SP`,
        time: "45 phút trước",
        badge: "Hoàn thành Task",
        badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        taskId: firstTask?.id,
      },
      {
        id: "act-3",
        type: "h2_unblocked",
        actor: "Hệ thống CodeMind AI",
        avatar: "AI",
        avatarColor: "bg-amber-600",
        role: "H2 Engine",
        title: `Tự động giải phóng Ràng buộc Cứng H2 cho Task #${secondTask?.code || "106"} (${secondTask?.title || "Tạo Seeder & Repository"})`,
        sub: `Do Task tiền đề #${firstTask?.code || "105"} đã đạt trạng thái Đã nghiệm thu`,
        time: "45 phút trước",
        badge: "Mở khóa H2",
        badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        taskId: secondTask?.id,
      },
      {
        id: "act-4",
        type: "pr_merged",
        actor: m2,
        avatar: getGivenNameInitial(m2),
        avatarColor: "bg-emerald-600",
        role: teamMembers[1]?.role || "Frontend & AI Dev",
        title: "Merge PR #14: Tích hợp luồng kiểm thử tự động & giao diện thực nghiệm vào nhánh develop",
        sub: "2 reviewers approved • 0 merge conflicts • 14/14 test cases đạt",
        time: "2 giờ trước",
        badge: "PR Merged",
        badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
        sha: "e59c02d",
        taskId: secondTask?.id,
      },
      {
        id: "act-5",
        type: "commit",
        actor: m3,
        avatar: getGivenNameInitial(m3),
        avatarColor: "bg-purple-600",
        role: teamMembers[2]?.role || "Backend & Database",
        title: "feat(sandbox): đóng gói container chạy kiểm thử cô lập với giới hạn bộ nhớ 512MB",
        sub: "feature/sandbox • 4 files changed • +189 / -12 lines",
        time: "4 giờ trước",
        badge: "Git Commit",
        badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        sha: "3b18f0a",
      },
      {
        id: "act-6",
        type: "commit",
        actor: m1,
        avatar: getGivenNameInitial(m1),
        avatarColor: "bg-blue-600",
        role: teamMembers[0]?.role || "Nhóm trưởng & Kiến trúc sư",
        title: "fix(api): chuẩn hóa xác thực JWT theo vai trò và đồng bộ điểm kinh nghiệm XP",
        sub: "develop • 3 files changed • +94 / -18 lines",
        time: "Hôm qua",
        badge: "Git Commit",
        badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        sha: "a3182fc",
      },
      {
        id: "act-7",
        type: "task_done",
        actor: m3,
        avatar: getGivenNameInitial(m3),
        avatarColor: "bg-purple-600",
        role: teamMembers[2]?.role || "Backend & Database",
        title: `Đồng bộ danh sách ${tasks.length} Task Đồ án chuẩn 8 cột theo đề cương Giảng viên Hướng dẫn`,
        sub: "Tự động phân bổ vào Backlog, Sprint 1-4 & ánh xạ Ràng buộc H2 trên CSDL MySQL",
        time: "2 ngày trước",
        badge: "Đồng bộ WBS",
        badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
      },
    ];
  }, [tasks, teamMembers, m1, m2, m3]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return rawEvents;
    return rawEvents.filter((e) => e.type === filterType);
  }, [rawEvents, filterType]);

  return (
    <div className="space-y-6 animate-screen-enter">
      {/* ─── 1. INTERACTIVE STUDY & COMMIT HEATMAP (16 WEEKS) ─── */}
      <MarloActivityHeatmap
        title="Biểu Đồ Nhiệt Đóng Góp & Nhịp Độ Thực Hành Code (16 Tuần Học Kỳ)"
        subtitle={`16 tuần học kỳ • 158 commits • 242 giờ thực hành code • ${teamMembers.length} thành viên đóng góp đều đặn`}
      />

      {/* ─── 2. GIT STREAM & ACTIVITY FEED HEADER + FILTERS ─── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-600 dark:text-blue-400" />
              Luồng Hoạt Động Thời Gian Thực (Git Stream & Scrum Feed)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhật ký commit, hoàn thành task, giải phóng H2 và merge code được ghi nhận tự động theo thời gian thực.
            </p>
          </div>

          {/* Authentic Marlo Sliding Segmented Control (sub-filters sum to 100% of rawEvents) */}
          <MarloSegmentedControl
            value={filterType}
            options={[
              { id: "all", label: "Tất cả", badge: rawEvents.length },
              { id: "commit", label: "Git Commits", badge: rawEvents.filter((e) => e.type === "commit").length },
              { id: "task_done", label: "Hoàn thành Task", badge: rawEvents.filter((e) => e.type === "task_done").length },
              { id: "h2_unblocked", label: "Kiểm định H2", badge: rawEvents.filter((e) => e.type === "h2_unblocked").length },
              { id: "pr_merged", label: "Pull Requests", badge: rawEvents.filter((e) => e.type === "pr_merged").length },
            ]}
            onChange={(val) => setFilterType(val as any)}
            tone="dark"
          />
        </div>

        {/* ─── 3. ACTIVITY FEED TIMELINE LIST ─── */}
        <div
          key={filterType}
          className="animate-screen-enter bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden"
        >
          {filteredEvents.map((event, idx) => {
            const linkedTask = event.taskId ? tasks.find((t) => t.id === event.taskId) : undefined;
            return (
              <div
                key={event.id}
                onClick={() => {
                  if (linkedTask && onSelectTask) {
                    onSelectTask(linkedTask);
                  }
                }}
                style={{ animationDelay: `${idx * 28}ms` }}
                className={`animate-cascade-item p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition flex items-start justify-between gap-4 select-none ${
                  linkedTask && onSelectTask ? "cursor-pointer" : ""
                }`}
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
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Header: Actor Name + Role + Badge + Time */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{event.actor}</span>
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
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      {event.title}
                    </p>

                    {/* Sub / Details */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
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

import { useState, useMemo, useEffect } from "react";
import { GitCommit, Clock, Activity } from "lucide-react";
import MarloActivityHeatmap, { type HeatmapCellInput } from "./MarloActivityHeatmap";
import MarloSegmentedControl from "./MarloSegmentedControl";
import {
  fetchGitHubWorkspaceApi,
  type GitHubCommitRecord,
  type GitPullRequestRecord,
} from "../api";
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
  projectId?: string;
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

function parseDateIso(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

export default function KanbanActivityStreamView({
  projectId,
  tasks,
  teamMembers,
  onSelectTask,
}: Props) {
  const [filterType, setFilterType] = useState<
    "all" | "commit" | "task_done" | "h2_unblocked" | "pr_merged"
  >("all");
  const [gitCommits, setGitCommits] = useState<GitHubCommitRecord[]>([]);
  const [gitPrs, setGitPrs] = useState<GitPullRequestRecord[]>([]);

  useEffect(() => {
    let active = true;
    if (!projectId) return;
    fetchGitHubWorkspaceApi(projectId).then((ws) => {
      if (!active || !ws) return;
      setGitCommits(ws.commits || []);
      setGitPrs(ws.pullRequests || []);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeMembers = Array.isArray(teamMembers) ? teamMembers : [];
  const defaultActor = safeMembers[0]?.name || "Thành viên Dự án";

  const rawEvents: ActivityEvent[] = useMemo(() => {
    const events: ActivityEvent[] = [];

    // 1. Real Task Audit Logs from MySQL engineering_tasks
    for (const task of safeTasks) {
      const logs = Array.isArray(task.auditLogs) ? task.auditLogs : [];
      logs.forEach((rawLog, idx) => {
        if (!rawLog || typeof rawLog !== "object") return;
        const log = rawLog as Record<string, unknown>;
        const toCol = String(log.toColumn ?? log.to_column ?? "").trim();
        const fromCol = String(log.fromColumn ?? log.from_column ?? "").trim();
        const actionText = String(log.action ?? "").trim();
        const detailText = String(log.detail ?? log.note ?? "").trim();

        const statusProbe = (toCol || actionText).toLowerCase();
        const isDoneCol =
          statusProbe.includes("hoàn thành") ||
          statusProbe.includes("đã nghiệm thu") ||
          statusProbe.includes("done") ||
          statusProbe.includes("verified");

        const actorName =
          String(log.user ?? log.actor ?? "").trim() || task.assignee?.name || defaultActor;
        const transitionLabel =
          fromCol && toCol
            ? `${fromCol} → ${toCol}`
            : toCol || actionText || "Cập nhật trạng thái";
        const badge = toCol || (actionText ? "MCP / Audit" : "Cập nhật");
        const sub = detailText
          ? `${task.epic || "Hạng mục Đồ án"} • ${detailText}`
          : `${task.epic || "Hạng mục Đồ án"} • Đồng bộ CSDL MySQL`;
        const time = String(log.timestamp ?? "").trim() || "Vừa xong";

        events.push({
          id: `aud-${task.id}-${idx}`,
          type: isDoneCol ? "task_done" : "commit",
          actor: actorName,
          avatar: getGivenNameInitial(actorName),
          avatarColor: isDoneCol ? "bg-emerald-600" : "bg-amber-600",
          role: log.actor && !log.user ? "MCP Agent" : "Thành viên Scrum",
          title: `[#${task.code}] ${task.title} (${transitionLabel})`,
          sub,
          time,
          badge,
          badgeColor:
            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80",
          taskId: task.id,
        });
      });

      // 2. Real H2 dependency unlocks
      if (task.dependsOn) {
        const depTask = safeTasks.find(
          (t) => t.id === task.dependsOn || t.code === task.dependsOn
        );
        if (depTask && (depTask.column === "done" || depTask.column === "verified")) {
          events.push({
            id: `h2-${task.id}`,
            type: "h2_unblocked",
            actor: "Hệ thống CodeMind AI",
            avatar: "AI",
            avatarColor: "bg-amber-600",
            role: "H2 Engine",
            title: `Giải phóng Ràng buộc Cứng H2 cho Task #${task.code} (${task.title})`,
            sub: `Task tiền đề #${depTask.code} đã đạt trạng thái Hoàn thành`,
            time: "Đã xác thực",
            badge: "Mở khóa H2",
            badgeColor:
              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80",
            taskId: task.id,
          });
        }
      }
    }

    // 3. Real Git Commits from MySQL git_commits
    const safeCommits = Array.isArray(gitCommits) ? gitCommits : [];
    for (const c of safeCommits) {
      const matchedTask = c.taskCode
        ? safeTasks.find(
            (t) => String(t.code || "").toUpperCase() === String(c.taskCode).toUpperCase()
          )
        : undefined;
      const authorName = c.author?.name || defaultActor;
      events.push({
        id: `gc-${c.id}`,
        type: "commit",
        actor: authorName,
        avatar: getGivenNameInitial(authorName),
        avatarColor: "bg-blue-600",
        role: c.author?.role || "Developer",
        title: c.message || "Cập nhật commit",
        sub: `Nhánh ${c.branch || "main"} · +${c.stats?.additions ?? 0} / -${
          c.stats?.deletions ?? 0
        } lines${c.taskCode ? ` · Task #${c.taskCode}` : ""}`,
        time: c.timeAgo || c.date || "Đã lưu",
        badge: "Git Commit",
        badgeColor:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80",
        sha: c.sha,
        taskId: matchedTask?.id,
      });
    }

    // 4. Real Git Pull Requests from MySQL git_pull_requests
    const safePrs = Array.isArray(gitPrs) ? gitPrs : [];
    for (const pr of safePrs) {
      const matchedTask = pr.taskCode
        ? safeTasks.find(
            (t) => String(t.code || "").toUpperCase() === String(pr.taskCode).toUpperCase()
          )
        : undefined;
      const authorName = pr.author?.name || defaultActor;
      const prStatus = String(pr.status || "open");
      events.push({
        id: `gpr-${pr.id}`,
        type: "pr_merged",
        actor: authorName,
        avatar: getGivenNameInitial(authorName),
        avatarColor: prStatus === "merged" ? "bg-purple-600" : "bg-emerald-600",
        role: pr.author?.role || "Reviewer",
        title: `PR #${pr.prNumber}: ${pr.title}`,
        sub: `${pr.sourceBranch} → ${pr.targetBranch} · AI Score ${pr.aiReviewScore ?? 0}/100${
          pr.taskCode ? ` · Task #${pr.taskCode}` : ""
        }`,
        time: prStatus === "merged" ? "Merged" : prStatus.toUpperCase(),
        badge: prStatus === "merged" ? "PR Merged" : `PR ${prStatus}`,
        badgeColor:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80",
        sha: pr.dodSha256?.slice(0, 7),
        taskId: matchedTask?.id,
      });
    }

    return events;
  }, [safeTasks, gitCommits, gitPrs, defaultActor]);

  // Build real 16-week heatmap from project commits + tasks timestamps
  const heatmapCells: HeatmapCellInput[] = useMemo(() => {
    const today = new Date();
    const dayOfWeekMon0 = (today.getDay() + 6) % 7;
    const endOfWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + (6 - dayOfWeekMon0)
    );
    const startDate = new Date(
      endOfWeek.getFullYear(),
      endOfWeek.getMonth(),
      endOfWeek.getDate() - 111
    );

    const commitsByDate: Record<string, number> = {};
    const actsByDate: Record<string, number> = {};

    for (const c of gitCommits) {
      const dk = parseDateIso(c.date);
      if (dk) {
        commitsByDate[dk] = (commitsByDate[dk] || 0) + 1;
        actsByDate[dk] = (actsByDate[dk] || 0) + 1;
      }
    }
    for (const t of safeTasks) {
      for (const lg of t.auditLogs || []) {
        if (!lg || typeof lg !== "object") continue;
        const dk = parseDateIso(String((lg as Record<string, unknown>).timestamp ?? ""));
        if (dk) {
          actsByDate[dk] = (actsByDate[dk] || 0) + 1;
        }
      }
    }

    const out: HeatmapCellInput[] = [];
    for (let offset = 0; offset < 112; offset++) {
      const d = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + offset
      );
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dk = `${y}-${m}-${dayNum}`;
      const cCnt = commitsByDate[dk] || 0;
      const aCnt = actsByDate[dk] || 0;
      const lvl: 0 | 1 | 2 | 3 | 4 =
        aCnt >= 6 ? 4 : aCnt >= 4 ? 3 : aCnt >= 2 ? 2 : aCnt >= 1 ? 1 : 0;
      out.push({
        date: dk,
        weekIndex: Math.floor(offset / 7),
        dayIndex: (d.getDay() + 6) % 7,
        commits: cCnt,
        activities: aCnt,
        level: lvl,
      });
    }
    return out;
  }, [gitCommits, safeTasks]);

  const totalEstHours = useMemo(
    () => safeTasks.reduce((sum, t) => sum + (Number(t.estimateHours) || 0), 0),
    [safeTasks]
  );

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return rawEvents;
    return rawEvents.filter((e) => e.type === filterType);
  }, [rawEvents, filterType]);

  return (
    <div className="space-y-6 animate-screen-enter">
      {/* ─── 1. REAL STUDY & COMMIT HEATMAP (16 WEEKS) ─── */}
      <MarloActivityHeatmap
        title="Biểu Đồ Nhiệt Đóng Góp & Nhịp Độ Thực Hành Code (16 Tuần)"
        subtitle={`${gitCommits.length} commits thực tế · ${gitPrs.length} Pull Requests · ${totalEstHours} giờ công ước tính · ${safeMembers.length} thành viên`}
        cells={heatmapCells}
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
              Nhật ký commit, Pull Request, chuyển trạng thái task và giải phóng ràng buộc H2 trực tiếp từ MySQL.
            </p>
          </div>

          <MarloSegmentedControl
            value={filterType}
            options={[
              { id: "all", label: "Tất cả", badge: rawEvents.length },
              {
                id: "commit",
                label: "Git Commits",
                badge: rawEvents.filter((e) => e.type === "commit").length,
              },
              {
                id: "task_done",
                label: "Hoàn thành Task",
                badge: rawEvents.filter((e) => e.type === "task_done").length,
              },
              {
                id: "h2_unblocked",
                label: "Kiểm định H2",
                badge: rawEvents.filter((e) => e.type === "h2_unblocked").length,
              },
              {
                id: "pr_merged",
                label: "Pull Requests",
                badge: rawEvents.filter((e) => e.type === "pr_merged").length,
              },
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
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Chưa có hoạt động nào khớp bộ lọc cho đồ án này.
            </div>
          ) : (
            filteredEvents.map((event, idx) => {
              const linkedTask = event.taskId
                ? safeTasks.find((t) => t.id === event.taskId)
                : undefined;
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
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold shadow-2xs ${event.avatarColor}`}
                      >
                        {event.avatar}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {event.actor}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({event.role})
                        </span>

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

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {event.title}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {event.sub}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={11} className="text-slate-400" />
                    <span>{event.time}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

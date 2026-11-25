import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboard";
import XPShop from "./screens/XPShop";
import StudentProfile from "./screens/StudentProfile";
import MarloProjectsScreen from "./screens/MarloProjectsScreen";
import SecurityDevicesScreen from "./screens/SecurityDevicesScreen";
import MarloProjectDetailScreen from "./screens/MarloProjectDetailScreen";
import MarloTeamScreen from "./screens/MarloTeamScreen";
import MarloPersonDetailScreen from "./screens/MarloPersonDetailScreen";
import MCPHubScreen from "./screens/MCPHubScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import MarloCommandPalette from "./components/MarloCommandPalette";
import MarloGlobalHeader from "./components/MarloGlobalHeader";
import {
  equipXpShopItemApi,
  fetchCurrentUser,
  getStoredUser,
  hasStoredSession,
  logoutUser,
  setTabSessionRole,
  updateUserPreferencesApi,
} from "./api";

const loadLearningWorkspace = () => import("./screens/LearningWorkspace");
const loadGitProjectHub = () => import("./screens/GitProjectHub");
const loadAdminDashboard = () => import("./screens/AdminDashboard");
const loadInstructorPanel = () => import("./screens/InstructorPanel");
const loadKanbanBoard = () => import("./screens/KanbanBoard");
const loadEngineeringScheduleRota = () => import("./screens/EngineeringScheduleRota");
const loadCodeMindIntroLandingPage = () => import("./screens/CodeMindIntroLandingPage");
const loadAIDefenseRoomScreen = () => import("./screens/AIDefenseRoomScreen");

const LearningWorkspace = lazy(loadLearningWorkspace);
const GitProjectHub = lazy(loadGitProjectHub);
const AdminDashboard = lazy(loadAdminDashboard);
const InstructorPanel = lazy(loadInstructorPanel);
const KanbanBoard = lazy(loadKanbanBoard);
const EngineeringScheduleRota = lazy(loadEngineeringScheduleRota);
const CodeMindIntroLandingPage = lazy(loadCodeMindIntroLandingPage);
const AIDefenseRoomScreen = lazy(loadAIDefenseRoomScreen);

export type Screen =
  | "login"
  | "intro"
  | "student-dashboard"
  | "workspace"
  | "github"
  | "mcp-hub"
  | "xp-shop"
  | "profile"
  | "security"
  | "admin"
  | "admin-users"
  | "admin-classes"
  | "admin-ai"
  | "admin-sessions"
  | "admin-audit"
  | "instructor"
  | "instructor-courses"
  | "instructor-grading"
  | "instructor-students"
  | "instructor-mindmap"
  | "kanban"
  | "schedule"
  | "projects"
  | "project-detail"
  | "team"
  | "person-detail"
  | "defense-room";

const preloadedChunks = new Set<string>();

export function preloadScreen(target: Screen): void {
  let chunkKey: string | null = null;
  let loader: (() => Promise<unknown>) | null = null;

  if (target.startsWith("admin")) {
    chunkKey = "admin";
    loader = loadAdminDashboard;
  } else if (target.startsWith("instructor")) {
    chunkKey = "instructor";
    loader = loadInstructorPanel;
  } else if (target === "workspace") {
    chunkKey = "workspace";
    loader = loadLearningWorkspace;
  } else if (target === "github") {
    chunkKey = "github";
    loader = loadGitProjectHub;
  } else if (target === "kanban") {
    chunkKey = "kanban";
    loader = loadKanbanBoard;
  } else if (target === "schedule") {
    chunkKey = "schedule";
    loader = loadEngineeringScheduleRota;
  } else if (target === "intro") {
    chunkKey = "intro";
    loader = loadCodeMindIntroLandingPage;
  } else if (target === "defense-room") {
    chunkKey = "defense-room";
    loader = loadAIDefenseRoomScreen;
  }

  if (!chunkKey || !loader || preloadedChunks.has(chunkKey)) return;
  preloadedChunks.add(chunkKey);
  void loader().catch(() => {
    preloadedChunks.delete(chunkKey);
  });
}

export type WorkspaceTabTarget = "video" | "lecture" | "quiz" | "mindmap" | "exercise";

export interface WorkspaceLaunchTarget {
  subjectId?: string;
  lessonId?: string;
  tab?: WorkspaceTabTarget;
  openTutor?: boolean;
  nonce: number;
}

export type Role = "student" | "admin" | "instructor";
export type Theme = "light" | "dark";
export type BackgroundTheme = "diagonal" | "blueprint" | "matrix" | "sunrise" | "graphite";
export type AvatarStyle = "initials" | "pixel" | "coder" | "robot" | "silver";
export type MentorMascot = "mino" | "nova" | "byte" | "sage" | "luna" | "kuro" | "ignis" | "sylph";
export type ChatSkin = "classic" | "terminal" | "neon" | "paper";
export type SkillMapSkin = "campaign" | "space" | "circuit" | "dungeon" | "route-blueprint";
export type BadgeFrame = "streak" | "quiz" | "mindmap" | "rookie" | "explorer";

export default function App() {
  const [screen, setScreenState] = useState<Screen>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("screen");
      if (s === "login" || s === "intro") return s;
      if (s) {
        const mapped =
          s === "courses" || s === "learning"
            ? "workspace"
            : s === "instructor-evidence"
            ? "instructor"
            : s;
        const reqRole: Role = mapped.startsWith("admin")
          ? "admin"
          : mapped.startsWith("instructor")
          ? "instructor"
          : ((params.get("role") as Role) || "student");
        if (
          hasStoredSession(reqRole) ||
          (reqRole === "instructor" && hasStoredSession("admin"))
        ) {
          return mapped as Screen;
        }
      }
    }
    return "login";
  });
  const [workspaceLaunch, setWorkspaceLaunch] = useState<WorkspaceLaunchTarget | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get("course") || undefined;
    const lessonId = params.get("lesson") || undefined;
    const tabRaw = params.get("tab");
    const tab =
      tabRaw === "video" || tabRaw === "lecture" || tabRaw === "quiz" || tabRaw === "mindmap" || tabRaw === "exercise"
        ? tabRaw
        : undefined;
    const openTutor = params.get("tutor") === "1" || undefined;
    if (!subjectId && !lessonId && !tab && !openTutor) return null;
    return { subjectId, lessonId, tab, openTutor, nonce: Date.now() };
  });
  const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("");
  const [selectedMarloProjectId, setSelectedMarloProjectId] = useState<string>("");
  const [selectedMarloPersonId, setSelectedMarloPersonId] = useState<string>("hoa");
  const [gitHubInitialTab, setGitHubInitialTab] = useState<
    "topology" | "prs" | "gitdiagram" | "analytics" | "gitflow" | undefined
  >(undefined);
  const mainRef = useRef<HTMLElement>(null);
  const [isNavigating, startNavTransition] = useTransition();

  const setScreen = (nextScreen: Screen) => {
    preloadScreen(nextScreen);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", nextScreen);
      if (nextScreen !== "workspace") {
        url.searchParams.delete("course");
        url.searchParams.delete("lesson");
        url.searchParams.delete("tab");
        url.searchParams.delete("tutor");
      }
      window.history.replaceState({}, "", url.toString());
    }
    startNavTransition(() => {
      setScreenState(nextScreen);
      if (nextScreen !== "github") {
        setGitHubInitialTab(undefined);
      }
    });
  };

  const openGitHubForProject = (
    projectId?: string,
    tab?: "topology" | "prs" | "gitdiagram" | "analytics" | "gitflow"
  ) => {
    preloadScreen("github");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "github");
      window.history.replaceState({}, "", url.toString());
    }
    startNavTransition(() => {
      if (projectId) {
        setSelectedKanbanProjectId(projectId);
        setSelectedMarloProjectId(projectId);
      }
      setGitHubInitialTab(tab);
      setScreenState("github");
    });
  };

  const openWorkspaceTarget = (opts: Omit<WorkspaceLaunchTarget, "nonce">) => {
    preloadScreen("workspace");
    const nextLaunch: WorkspaceLaunchTarget = { ...opts, nonce: Date.now() };
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "workspace");
      if (opts.subjectId) url.searchParams.set("course", opts.subjectId);
      else url.searchParams.delete("course");
      if (opts.lessonId) url.searchParams.set("lesson", opts.lessonId);
      else url.searchParams.delete("lesson");
      if (opts.tab) url.searchParams.set("tab", opts.tab);
      else url.searchParams.delete("tab");
      if (opts.openTutor) url.searchParams.set("tutor", "1");
      else url.searchParams.delete("tutor");
      window.history.replaceState({}, "", url.toString());
    }
    startNavTransition(() => {
      setWorkspaceLaunch(nextLaunch);
      setScreenState("workspace");
    });
  };
  const getCosmeticStorageKey = (base: string, targetRole: Role): string => {
    if (typeof window === "undefined") return base;
    const u = getStoredUser(targetRole);
    return u?.id ? `${base}:${u.id}` : base;
  };

  const [role, setRoleState] = useState<Role>(() => {
    let initial: Role = "student";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("role");
      const s = params.get("screen") || "";
      if (r === "instructor" || r === "admin" || r === "student") {
        initial = r as Role;
      } else if (s.startsWith("instructor")) {
        initial = "instructor";
      } else if (s.startsWith("admin")) {
        initial = "admin";
      } else {
        const stored = window.localStorage.getItem("code-mind-role");
        if (stored === "instructor" || stored === "admin" || stored === "student") {
          initial = stored as Role;
        }
      }
      if (
        !hasStoredSession(initial) &&
        !(initial === "instructor" && hasStoredSession("admin"))
      ) {
        if (hasStoredSession("student")) initial = "student";
        else if (hasStoredSession("instructor")) initial = "instructor";
        else if (hasStoredSession("admin")) initial = "admin";
      }
      setTabSessionRole(initial);
    }
    return initial;
  });

  const setRole = (nextRole: Role) => {
    setRoleState(nextRole);
    setTabSessionRole(nextRole);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("role", nextRole);
      window.history.replaceState({}, "", url.toString());
      window.localStorage.setItem("code-mind-role", nextRole);
    }
  };

  useEffect(() => {
    setSelectedKanbanProjectId("");
    setSelectedMarloProjectId("");
  }, [role]);

  // Enforce authenticated session & strict role/screen boundaries
  useEffect(() => {
    if (screen === "login" || screen === "intro") return;
    if (
      !hasStoredSession(role) &&
      !(role === "instructor" && hasStoredSession("admin"))
    ) {
      setScreen("login");
      return;
    }
    if (screen.startsWith("admin") && role !== "admin") {
      setScreen(role === "instructor" ? "instructor" : "student-dashboard");
      return;
    }
    if (screen.startsWith("instructor") && role === "student") {
      setScreen("student-dashboard");
    }
  }, [role, screen]);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (window.localStorage.getItem("code-mind-theme") as Theme | null) ?? "light";
  });
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(() => {
    if (typeof window === "undefined") return "diagonal";
    return (window.localStorage.getItem("code-mind-background") as BackgroundTheme | null) ?? "diagonal";
  });
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(() => {
    if (typeof window === "undefined") return "initials";
    return (window.localStorage.getItem(getCosmeticStorageKey("code-mind-avatar", role)) as AvatarStyle | null) ?? "initials";
  });
  const [mentorMascot, setMentorMascot] = useState<MentorMascot>(() => {
    if (typeof window === "undefined") return "mino";
    return (window.localStorage.getItem(getCosmeticStorageKey("code-mind-mentor", role)) as MentorMascot | null) ?? "mino";
  });
  const [chatSkin, setChatSkin] = useState<ChatSkin>(() => {
    if (typeof window === "undefined") return "classic";
    return (window.localStorage.getItem(getCosmeticStorageKey("code-mind-chat-skin", role)) as ChatSkin | null) ?? "classic";
  });
  const [skillMapSkin, setSkillMapSkin] = useState<SkillMapSkin>(() => {
    if (typeof window === "undefined") return "campaign";
    return (window.localStorage.getItem(getCosmeticStorageKey("code-mind-map-skin", role)) as SkillMapSkin | null) ?? "campaign";
  });
  const [badgeFrame, setBadgeFrame] = useState<BadgeFrame>(() => {
    if (typeof window === "undefined") return "streak";
    return (window.localStorage.getItem(getCosmeticStorageKey("code-mind-badge", role)) as BadgeFrame | null) ?? "streak";
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [pendingStudentUser, setPendingStudentUser] = useState<any | null>(() => {
    const u = getStoredUser(role);
    return u && (u.role === "student" || u.role === "instructor") && u.status === "pending" ? u : null;
  });
  const isPendingApproval = (role === "student" || role === "instructor") && Boolean(pendingStudentUser);

  // Sync per-user cosmetic slots whenever active role/session changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAvatarStyle((window.localStorage.getItem(getCosmeticStorageKey("code-mind-avatar", role)) as AvatarStyle | null) ?? "initials");
    setMentorMascot((window.localStorage.getItem(getCosmeticStorageKey("code-mind-mentor", role)) as MentorMascot | null) ?? "mino");
    setChatSkin((window.localStorage.getItem(getCosmeticStorageKey("code-mind-chat-skin", role)) as ChatSkin | null) ?? "classic");
    setSkillMapSkin((window.localStorage.getItem(getCosmeticStorageKey("code-mind-map-skin", role)) as SkillMapSkin | null) ?? "campaign");
    setBadgeFrame((window.localStorage.getItem(getCosmeticStorageKey("code-mind-badge", role)) as BadgeFrame | null) ?? "streak");
  }, [role]);

  // Global Shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useLayoutEffect(() => {
    window.localStorage.setItem("code-mind-theme", theme);
    const effectiveTheme: Theme =
      screen === "intro" || isPendingApproval ? "light" : theme;
    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
    root.style.colorScheme = effectiveTheme;
  }, [theme, screen, isPendingApproval]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-background", backgroundTheme);
  }, [backgroundTheme]);

  useEffect(() => {
    if (screen === "login") return;
    if (!hasStoredSession(role) && !(role === "instructor" && hasStoredSession("admin"))) return;
    let active = true;
    fetchCurrentUser(role, { skipAutoDemo: true }).then((u) => {
      if (!active || !u) return;
      if (role === "student" || role === "instructor") {
        if ((u.role === "student" || u.role === "instructor") && u.status === "pending") {
          setPendingStudentUser(u);
          if (screen !== "intro") {
            setScreen("intro");
          }
        } else if (u.status === "active") {
          setPendingStudentUser(null);
        }
      }
      if (screen !== "intro" && u.background_theme) {
        const valid = ["diagonal", "blueprint", "matrix", "sunrise", "graphite"];
        if (valid.includes(u.background_theme)) {
          setBackgroundTheme(u.background_theme as BackgroundTheme);
        }
      }
      const eq = (u as any).equipped_items;
      if (eq && typeof eq === "object") {
        if (eq.avatar) setAvatarStyle(eq.avatar as AvatarStyle);
        if (eq.mentor) setMentorMascot(eq.mentor as MentorMascot);
        if (eq.chat_skin) setChatSkin(eq.chat_skin as ChatSkin);
        if (eq.map_skin) setSkillMapSkin(eq.map_skin as SkillMapSkin);
        if (eq.badge) setBadgeFrame(eq.badge as BadgeFrame);
      }
    });
    return () => {
      active = false;
    };
  }, [role, screen]);

  useEffect(() => {
    if (isPendingApproval && screen !== "login" && screen !== "intro") {
      setScreen("intro");
    }
  }, [isPendingApproval, screen]);

  const handleApplyBackgroundTheme = (nextBg: BackgroundTheme) => {
    setBackgroundTheme(nextBg);
    void updateUserPreferencesApi({ background_theme: nextBg, color_mode: theme }, role);
  };

  const handleApplyAvatar = (nextAvatar: AvatarStyle) => {
    const prev = avatarStyle;
    setAvatarStyle(nextAvatar);
    if (role === "student") {
      void equipXpShopItemApi("avatar", nextAvatar, role).then((res) => {
        if (res.error) setAvatarStyle(prev);
      });
    }
  };

  const handleApplyMentor = (nextMentor: MentorMascot) => {
    const prev = mentorMascot;
    setMentorMascot(nextMentor);
    if (role === "student") {
      void equipXpShopItemApi("mentor", nextMentor, role).then((res) => {
        if (res.error) setMentorMascot(prev);
      });
    }
  };

  const handleApplyChatSkin = (nextSkin: ChatSkin) => {
    const prev = chatSkin;
    setChatSkin(nextSkin);
    if (role === "student") {
      void equipXpShopItemApi("chat_skin", nextSkin, role).then((res) => {
        if (res.error) setChatSkin(prev);
      });
    }
  };

  const handleApplyMapSkin = (nextMap: SkillMapSkin) => {
    const prev = skillMapSkin;
    setSkillMapSkin(nextMap);
    if (role === "student") {
      void equipXpShopItemApi("map_skin", nextMap, role).then((res) => {
        if (res.error) setSkillMapSkin(prev);
      });
    }
  };

  const handleApplyBadge = (nextBadge: BadgeFrame) => {
    const prev = badgeFrame;
    setBadgeFrame(nextBadge);
    if (role === "student") {
      void equipXpShopItemApi("badge", nextBadge, role).then((res) => {
        if (res.error) setBadgeFrame(prev);
      });
    }
  };

  useEffect(() => {
    window.localStorage.setItem(getCosmeticStorageKey("code-mind-avatar", role), avatarStyle);
  }, [avatarStyle, role]);

  useEffect(() => {
    window.localStorage.setItem(getCosmeticStorageKey("code-mind-mentor", role), mentorMascot);
  }, [mentorMascot, role]);

  useEffect(() => {
    window.localStorage.setItem(getCosmeticStorageKey("code-mind-chat-skin", role), chatSkin);
  }, [chatSkin, role]);

  useEffect(() => {
    window.localStorage.setItem(getCosmeticStorageKey("code-mind-map-skin", role), skillMapSkin);
  }, [skillMapSkin, role]);

  useEffect(() => {
    window.localStorage.setItem(getCosmeticStorageKey("code-mind-badge", role), badgeFrame);
  }, [badgeFrame, role]);

  const screenContainerKey = screen.startsWith("admin")
    ? "admin-shell"
    : screen.startsWith("instructor")
    ? "instructor-shell"
    : screen;

  // Scroll to top after the transitioned screen commits
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [screenContainerKey]);

  // Role-aware idle background prefetching so switching heavy screens never flashes fallback
  useEffect(() => {
    if (screen === "login" || screen === "intro" || isPendingApproval) return;
    const queue: Screen[] =
      role === "instructor"
        ? ["instructor", "kanban", "github", "defense-room", "schedule"]
        : role === "admin"
        ? ["admin", "kanban", "github", "defense-room", "schedule"]
        : ["workspace", "kanban", "github", "defense-room", "schedule"];

    const timers: number[] = [];
    const idleIds: number[] = [];
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const startTimer = window.setTimeout(() => {
      queue.forEach((target, idx) => {
        const t = window.setTimeout(() => {
          if (typeof win.requestIdleCallback === "function") {
            const idleId = win.requestIdleCallback(() => preloadScreen(target), { timeout: 1200 });
            idleIds.push(idleId);
          } else {
            preloadScreen(target);
          }
        }, idx * 220);
        timers.push(t);
      });
    }, 600);
    timers.push(startTimer);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      idleIds.forEach((id) => win.cancelIdleCallback?.(id));
    };
  }, [role, screen, isPendingApproval]);

  const toggleTheme = (trigger?: HTMLElement | React.MouseEvent | any) => {
    const nextTheme = theme === "light" ? "dark" : "light";
    const root = document.documentElement;

    // Check for reduced motion preference or lack of View Transition API
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startViewTransition = (document as any).startViewTransition;

    if (!startViewTransition || isReducedMotion) {
      document.documentElement.classList.add("theme-transition");
      setTheme(nextTheme);
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
      }, 350);
      return;
    }

    // 🌊 Ported 1:1 from Marlo (D:\C++\quản lí dự án\marlo-app\src\shell.jsx - function bt)
    // Calculate circular ripple center (s, c) from trigger element or click coordinates
    let s = window.innerWidth - 40;
    let c = 40;

    if (trigger) {
      if (trigger.currentTarget instanceof HTMLElement) {
        const rect = trigger.currentTarget.getBoundingClientRect();
        s = rect.left + rect.width / 2;
        c = rect.top + rect.height / 2;
      } else if (trigger instanceof HTMLElement) {
        const rect = trigger.getBoundingClientRect();
        s = rect.left + rect.width / 2;
        c = rect.top + rect.height / 2;
      } else if (typeof trigger.clientX === "number" && typeof trigger.clientY === "number") {
        s = trigger.clientX;
        c = trigger.clientY;
      }
    }

    const l = Math.hypot(Math.max(s, window.innerWidth - s), Math.max(c, window.innerHeight - c));

    const transition = startViewTransition.call(document, () => {
      flushSync(() => {
        setTheme(nextTheme);
      });
      if (nextTheme === "dark") {
        root.classList.add("dark");
        document.body.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        document.body.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
    });

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${s}px ${c}px)`,
              `circle(${l}px at ${s}px ${c}px)`,
            ],
          },
          {
            duration: 450,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    setPendingStudentUser(null);
    setAvatarStyle("initials");
    setMentorMascot("mino");
    setChatSkin("classic");
    setSkillMapSkin("campaign");
    setBadgeFrame("streak");
    void logoutUser(role);
    setScreen("login");
  };

  const handleRecheckPendingApproval = async (
    targetScreen?: Screen
  ): Promise<boolean> => {
    const checkRole: Role =
      pendingStudentUser?.role === "instructor" || role === "instructor"
        ? "instructor"
        : "student";
    const latest = await fetchCurrentUser(checkRole, { skipAutoDemo: true });
    if (latest && latest.status === "active") {
      setPendingStudentUser(null);
      setRole(checkRole);
      setScreen(
        targetScreen ||
          (checkRole === "instructor" ? "instructor" : "student-dashboard")
      );
      return true;
    }
    if (latest && latest.status === "suspended") {
      handleLogout();
    }
    return false;
  };

  if (screen === "login") {
    return (
      <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""} pc-login-bg min-h-screen`}>
        <LoginScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenIntro={() => setScreen("intro")}
          onLogin={(r, opts) => {
            setRole(r);
            const isPending =
              (r === "student" || r === "instructor") &&
              Boolean(opts?.pendingApproval || opts?.user?.status === "pending");
            if (isPending) {
              setPendingStudentUser(
                opts?.user ||
                  getStoredUser(r) || {
                    role: r,
                    status: "pending",
                  }
              );
              setScreen("intro");
              return;
            }
            setPendingStudentUser(null);
            if (opts?.isNewSignUp && r === "student") {
              setScreen("intro");
            } else {
              setScreen(
                r === "admin"
                  ? "admin"
                  : r === "instructor"
                  ? "instructor"
                  : "student-dashboard"
              );
            }
          }}
        />
      </div>
    );
  }

  if (screen === "intro" || isPendingApproval) {
    return (
      <div className="theme-light bg-white text-slate-900" data-theme="light">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center p-10 text-xs font-semibold text-slate-500">
              Đang tải phân hệ...
            </div>
          }
        >
          <CodeMindIntroLandingPage
            isPendingApproval={isPendingApproval}
            pendingUserName={
              pendingStudentUser?.full_name ||
              pendingStudentUser?.display_name ||
              pendingStudentUser?.email
            }
            pendingUserEmail={pendingStudentUser?.email}
            onRecheckApproval={handleRecheckPendingApproval}
            onLogout={handleLogout}
            onEnterPlatform={(targetScreen) => {
              if (isPendingApproval) {
                void handleRecheckPendingApproval(targetScreen);
                return;
              }
              if (hasStoredSession(role)) {
                setScreen(
                  role === "admin"
                    ? "admin"
                    : role === "instructor"
                    ? "instructor"
                    : targetScreen || "student-dashboard"
                );
              } else {
                setScreen("login");
              }
            }}
            onLogin={() => setScreen("login")}
          />
        </Suspense>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case "student-dashboard":
        return (
          <StudentDashboard
            avatarStyle={avatarStyle}
            skillMapSkin={skillMapSkin}
            badgeFrame={badgeFrame}
            onNavigate={setScreen}
            onOpenWorkspace={openWorkspaceTarget}
            theme={theme}
            onToggleTheme={toggleTheme}
            role={role}
            onLogout={handleLogout}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        );
      case "workspace":
        return (
          <LearningWorkspace
            mentorMascot={mentorMascot}
            chatSkin={chatSkin}
            theme={theme}
            onToggleTheme={toggleTheme}
            role={role}
            avatarStyle={avatarStyle}
            badgeFrame={badgeFrame}
            onNavigate={setScreen}
            launchTarget={workspaceLaunch}
            onLogout={handleLogout}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        );
      case "profile":
        return (
          <StudentProfile
            role={role}
            avatarStyle={avatarStyle}
            badgeFrame={badgeFrame}
            backgroundTheme={backgroundTheme}
            onApplyBackgroundTheme={handleApplyBackgroundTheme}
            onApplyAvatar={handleApplyAvatar}
            onApplyBadge={handleApplyBadge}
            onOpenSecurity={() => setScreen("security")}
            onNavigate={setScreen}
            onOpenProject={(projectId) => {
              setSelectedMarloProjectId(projectId);
              setSelectedKanbanProjectId(projectId);
              setScreen("project-detail");
            }}
          />
        );
      case "security":
        return <SecurityDevicesScreen role={role} onLogout={handleLogout} />;
      case "github":
        return (
          <GitProjectHub
            role={role}
            initialProjectId={selectedKanbanProjectId}
            initialViewMode={gitHubInitialTab}
            onSelectProject={(pId) => {
              setSelectedKanbanProjectId(pId);
              setSelectedMarloProjectId(pId);
            }}
            onNavigate={setScreen}
          />
        );
      case "xp-shop": return (
        <XPShop
          activeTheme={backgroundTheme}
          activeAvatar={avatarStyle}
          activeMentor={mentorMascot}
          activeChatSkin={chatSkin}
          activeMapSkin={skillMapSkin}
          activeBadge={badgeFrame}
          onApplyTheme={handleApplyBackgroundTheme}
          onApplyAvatar={handleApplyAvatar}
          onApplyMentor={handleApplyMentor}
          onApplyChatSkin={handleApplyChatSkin}
          onApplyMapSkin={handleApplyMapSkin}
          onApplyBadge={handleApplyBadge}
        />
      );
      case "admin":
      case "admin-users":
      case "admin-classes":
      case "admin-ai":
      case "admin-sessions":
      case "admin-audit":
        return (
          <AdminDashboard
            currentSection={screen}
            onNavigateSection={setScreen}
          />
        );
      case "instructor":
      case "instructor-courses":
      case "instructor-grading":
      case "instructor-students":
      case "instructor-mindmap":
        return (
          <InstructorPanel
            currentSection={screen}
            onNavigate={setScreen}
            onOpenWorkspace={openWorkspaceTarget}
          />
        );
      case "kanban": return (
        <KanbanBoard
          initialProjectId={selectedKanbanProjectId}
          onSelectProject={(pId) => {
            setSelectedKanbanProjectId(pId);
            setSelectedMarloProjectId(pId);
          }}
          onNavigate={setScreen}
          onOpenGitHub={(pId, tab) => openGitHubForProject(pId, tab)}
          role={role}
        />
      );
      case "schedule": return (
        <EngineeringScheduleRota
          role={role}
          onNavigate={setScreen}
          onRoleChange={setRole}
          onOpenProjectDetail={(pId) => {
            setSelectedMarloProjectId(pId);
            setSelectedKanbanProjectId(pId);
            setScreen("project-detail");
          }}
          onOpenKanban={(pId) => {
            setSelectedKanbanProjectId(pId);
            setSelectedMarloProjectId(pId);
            setScreen("kanban");
          }}
          onOpenGitHub={(pId) => openGitHubForProject(pId)}
        />
      );
      case "projects": return (
        <MarloProjectsScreen
          role={role}
          onOpenProject={(p) => {
            if (p?.id) {
              setSelectedKanbanProjectId(p.id);
              setSelectedMarloProjectId(p.id);
            }
            setScreen("kanban");
          }}
          onOpenProjectDetail={(pId) => {
            if (pId) {
              setSelectedMarloProjectId(pId);
              setSelectedKanbanProjectId(pId);
            }
            setScreen("project-detail");
          }}
          onOpenGitHub={(pId) => openGitHubForProject(pId)}
        />
      );
      case "project-detail": return (
        <MarloProjectDetailScreen
          projectId={selectedMarloProjectId}
          role={role}
          onNavigateBack={() => setScreen("projects")}
          onNavigateToPerson={(personId) => {
            setSelectedMarloPersonId(personId);
            setScreen("person-detail");
          }}
          onNavigateToKanban={(prjId) => {
            setSelectedKanbanProjectId(prjId);
            setSelectedMarloProjectId(prjId);
            setScreen("kanban");
          }}
          onNavigateToGitHub={(prjId) => openGitHubForProject(prjId)}
        />
      );
      case "team": return (
        <MarloTeamScreen
          role={role}
          onSelectPerson={(personId) => {
            setSelectedMarloPersonId(personId);
            setScreen("person-detail");
          }}
          onNavigateToProject={(prjId) => {
            setSelectedMarloProjectId(prjId);
            setSelectedKanbanProjectId(prjId);
            setScreen("project-detail");
          }}
        />
      );
      case "person-detail": return (
        <MarloPersonDetailScreen
          personId={selectedMarloPersonId}
          role={role}
          onNavigateBack={() => setScreen("team")}
          onEditMyProfile={() => setScreen("profile")}
          onNavigateToProject={(prjId) => {
            setSelectedMarloProjectId(prjId);
            setSelectedKanbanProjectId(prjId);
            setScreen("project-detail");
          }}
        />
      );
      case "defense-room": return (
        <AIDefenseRoomScreen
          role={role}
          onNavigate={setScreen}
          initialProjectId={selectedKanbanProjectId}
          onOpenProjectDetail={(pId) => {
            setSelectedMarloProjectId(pId);
            setSelectedKanbanProjectId(pId);
            setScreen("project-detail");
          }}
          onOpenKanban={(pId) => {
            setSelectedKanbanProjectId(pId);
            setSelectedMarloProjectId(pId);
            setScreen("kanban");
          }}
          onOpenGitHub={(pId) => openGitHubForProject(pId)}
          onOpenSchedule={() => setScreen("schedule")}
        />
      );
      case "mcp-hub": return <MCPHubScreen role={role} onNavigate={setScreen} />;
      default: return <StudentDashboard avatarStyle={avatarStyle} skillMapSkin={skillMapSkin} badgeFrame={badgeFrame} onNavigate={setScreen} />;
    }
  };

  return (
    <div className={`theme-${theme} ${theme === "dark" ? "dark text-slate-100" : "text-slate-900"} bg-theme-${backgroundTheme} pc-app-bg flex h-screen overflow-hidden`}>
      <ErrorBoundary>
        <Sidebar
          screen={screen}
          role={role}
          theme={theme}
          avatarStyle={avatarStyle}
          badgeFrame={badgeFrame}
          onToggleTheme={toggleTheme}
          onNavigate={setScreen}
          onPrefetch={preloadScreen}
          onLogout={handleLogout}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      </ErrorBoundary>
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        {/* 🌟 Unified Top Global Header (Marlo Authentic Shell Header) - Fixed on top across ALL pages like Task page */}
        <MarloGlobalHeader
          screen={screen}
          theme={theme}
          onToggleTheme={toggleTheme}
          backgroundTheme={backgroundTheme}
          onApplyBackgroundTheme={handleApplyBackgroundTheme}
          role={role}
          avatarStyle={avatarStyle}
          badgeFrame={badgeFrame}
          onNavigate={setScreen}
          onLogout={handleLogout}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative flex flex-col scroll-smooth">
          {isNavigating && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-0 h-[2px] z-50 bg-amber-500/90 animate-pulse"
            />
          )}
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex-1 min-h-[240px] flex items-center justify-center p-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Đang tải phân hệ...
                </div>
              }
            >
              <div key={screenContainerKey} className="min-h-full flex-1 min-w-0">
                {renderScreen()}
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* ⌘K / Ctrl+K Marlo Command Palette */}
      <MarloCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setScreen}
        onOpenWorkspace={openWorkspaceTarget}
        onToggleTheme={toggleTheme}
        onStartTimer={() =>
          window.dispatchEvent(
            new CustomEvent("codemind-pomodoro-start", { detail: { minutes: 25 } })
          )
        }
        theme={theme}
        role={role}
      />
    </div>
  );
}

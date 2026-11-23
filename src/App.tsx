import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./screens/LoginScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import MarloCommandPalette from "./components/MarloCommandPalette";
import MarloGlobalHeader from "./components/MarloGlobalHeader";
import {
  fetchCurrentUser,
  fetchStudentLearningOverview,
  equipXpShopItemApi,
  getStoredUser,
  logoutUser,
  setTabSessionRole,
  updateUserPreferencesApi,
} from "./api";

const StudentDashboard = lazy(() => import("./screens/StudentDashboard"));
const LearningWorkspace = lazy(() => import("./screens/LearningWorkspace"));
const GitProjectHub = lazy(() => import("./screens/GitProjectHub"));
const XPShop = lazy(() => import("./screens/XPShop"));
const StudentProfile = lazy(() => import("./screens/StudentProfile"));
const AdminDashboard = lazy(() => import("./screens/AdminDashboard"));
const InstructorPanel = lazy(() => import("./screens/InstructorPanel"));
const KanbanBoard = lazy(() => import("./screens/KanbanBoard"));
const EngineeringScheduleRota = lazy(() => import("./screens/EngineeringScheduleRota"));
const MarloProjectsScreen = lazy(() => import("./screens/MarloProjectsScreen"));
const CodeMindIntroLandingPage = lazy(() => import("./screens/CodeMindIntroLandingPage"));
const AIDefenseRoomScreen = lazy(() => import("./screens/AIDefenseRoomScreen"));
const SecurityDevicesScreen = lazy(() => import("./screens/SecurityDevicesScreen"));
const MarloProjectDetailScreen = lazy(() => import("./screens/MarloProjectDetailScreen"));
const MarloTeamScreen = lazy(() => import("./screens/MarloTeamScreen"));
const MarloPersonDetailScreen = lazy(() => import("./screens/MarloPersonDetailScreen"));

export type Screen =
  | "login"
  | "intro"
  | "student-dashboard"
  | "workspace"
  | "github"
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
      if (s === "courses" || s === "learning") return "workspace";
      if (s === "instructor-evidence") return "instructor";
      if (s) return s as Screen;
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

  const setScreen = (nextScreen: Screen) => {
    setScreenState(nextScreen);
    if (nextScreen !== "github") {
      setGitHubInitialTab(undefined);
    }
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
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const openGitHubForProject = (
    projectId?: string,
    tab?: "topology" | "prs" | "gitdiagram" | "analytics" | "gitflow"
  ) => {
    if (projectId) {
      setSelectedKanbanProjectId(projectId);
      setSelectedMarloProjectId(projectId);
    }
    setGitHubInitialTab(tab);
    setScreenState("github");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "github");
      window.history.replaceState({}, "", url.toString());
    }
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const openWorkspaceTarget = (opts: Omit<WorkspaceLaunchTarget, "nonce">) => {
    const nextLaunch: WorkspaceLaunchTarget = { ...opts, nonce: Date.now() };
    setWorkspaceLaunch(nextLaunch);
    setScreenState("workspace");
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
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
    return (window.localStorage.getItem("code-mind-avatar") as AvatarStyle | null) ?? "initials";
  });
  const [mentorMascot, setMentorMascot] = useState<MentorMascot>(() => {
    if (typeof window === "undefined") return "mino";
    return (window.localStorage.getItem("code-mind-mentor") as MentorMascot | null) ?? "mino";
  });
  const [chatSkin, setChatSkin] = useState<ChatSkin>(() => {
    if (typeof window === "undefined") return "classic";
    return (window.localStorage.getItem("code-mind-chat-skin") as ChatSkin | null) ?? "classic";
  });
  const [skillMapSkin, setSkillMapSkin] = useState<SkillMapSkin>(() => {
    if (typeof window === "undefined") return "campaign";
    return (window.localStorage.getItem("code-mind-map-skin") as SkillMapSkin | null) ?? "campaign";
  });
  const [badgeFrame, setBadgeFrame] = useState<BadgeFrame>(() => {
    if (typeof window === "undefined") return "streak";
    return (window.localStorage.getItem("code-mind-badge") as BadgeFrame | null) ?? "streak";
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

  useEffect(() => {
    window.localStorage.setItem("code-mind-theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-background", backgroundTheme);
  }, [backgroundTheme]);

  useEffect(() => {
    if (screen === "login" || screen === "intro") return;
    let active = true;

    // Tải cấu hình người dùng & các vật phẩm đã trang bị trực tiếp từ MySQL Backend
    fetchStudentLearningOverview()
      .then((data) => {
        if (!active || !data) return;
        const equipped = (data.profile?.equipped_items as Record<string, string> | undefined) || {};
        const u = data.user || {};

        const themeVal = equipped.theme || u.background_theme;
        if (themeVal && ["diagonal", "blueprint", "matrix", "sunrise", "graphite"].includes(themeVal)) {
          setBackgroundTheme(themeVal as BackgroundTheme);
          window.localStorage.setItem("code-mind-background", themeVal);
        }
        if (equipped.avatar && ["initials", "pixel", "coder", "robot", "silver"].includes(equipped.avatar)) {
          setAvatarStyle(equipped.avatar as AvatarStyle);
          window.localStorage.setItem("code-mind-avatar", equipped.avatar);
        }
        if (equipped.mentor && ["mino", "nova", "byte", "sage", "luna", "kuro", "ignis", "sylph"].includes(equipped.mentor)) {
          setMentorMascot(equipped.mentor as MentorMascot);
          window.localStorage.setItem("code-mind-mentor", equipped.mentor);
        }
        if (equipped.chat && ["classic", "terminal", "neon", "paper"].includes(equipped.chat)) {
          setChatSkin(equipped.chat as ChatSkin);
          window.localStorage.setItem("code-mind-chat-skin", equipped.chat);
        }
        if (equipped.map && ["campaign", "space", "circuit", "dungeon", "route-blueprint"].includes(equipped.map)) {
          setSkillMapSkin(equipped.map as SkillMapSkin);
          window.localStorage.setItem("code-mind-map-skin", equipped.map);
        }
        if (equipped.badge && ["streak", "quiz", "mindmap", "rookie", "explorer"].includes(equipped.badge)) {
          setBadgeFrame(equipped.badge as BadgeFrame);
          window.localStorage.setItem("code-mind-badge", equipped.badge);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [role, screen]);

  const handleApplyBackgroundTheme = (nextBg: BackgroundTheme) => {
    setBackgroundTheme(nextBg);
    window.localStorage.setItem("code-mind-background", nextBg);
    void updateUserPreferencesApi({ background_theme: nextBg, color_mode: theme }, role);
    void equipXpShopItemApi({ category: "theme", item_id: nextBg });
  };

  const handleApplyAvatar = (nextAvatar: AvatarStyle) => {
    setAvatarStyle(nextAvatar);
    window.localStorage.setItem("code-mind-avatar", nextAvatar);
    void equipXpShopItemApi({ category: "avatar", item_id: nextAvatar });
  };

  const handleApplyMentor = (nextMentor: MentorMascot) => {
    setMentorMascot(nextMentor);
    window.localStorage.setItem("code-mind-mentor", nextMentor);
    void equipXpShopItemApi({ category: "mentor", item_id: nextMentor });
  };

  const handleApplyChatSkin = (nextChat: ChatSkin) => {
    setChatSkin(nextChat);
    window.localStorage.setItem("code-mind-chat-skin", nextChat);
    void equipXpShopItemApi({ category: "chat", item_id: nextChat });
  };

  const handleApplyMapSkin = (nextMap: SkillMapSkin) => {
    setSkillMapSkin(nextMap);
    window.localStorage.setItem("code-mind-map-skin", nextMap);
    void equipXpShopItemApi({ category: "map", item_id: nextMap });
  };

  const handleApplyBadge = (nextBadge: BadgeFrame) => {
    setBadgeFrame(nextBadge);
    window.localStorage.setItem("code-mind-badge", nextBadge);
    void equipXpShopItemApi({ category: "badge", item_id: nextBadge });
  };

  useEffect(() => {
    window.localStorage.setItem("code-mind-avatar", avatarStyle);
  }, [avatarStyle]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-mentor", mentorMascot);
  }, [mentorMascot]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-chat-skin", chatSkin);
  }, [chatSkin]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-map-skin", skillMapSkin);
  }, [skillMapSkin]);

  useEffect(() => {
    window.localStorage.setItem("code-mind-badge", badgeFrame);
  }, [badgeFrame]);

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
    void logoutUser(role);
    setScreen("login");
  };

  if (screen === "login") {
    return (
      <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""} pc-login-bg min-h-screen`}>
        <LoginScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenIntro={() => setScreen("intro")}
          onLogin={(r) => {
            setRole(r);
            setScreen(r === "admin" ? "admin" : r === "instructor" ? "instructor" : "student-dashboard");
          }}
        />
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""}`}>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center p-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đang tải phân hệ...
            </div>
          }
        >
          <CodeMindIntroLandingPage
            onEnterPlatform={(targetScreen) => {
              setRole("student");
              setScreen(targetScreen || "student-dashboard");
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
            avatarStyle={avatarStyle}
            badgeFrame={badgeFrame}
            backgroundTheme={backgroundTheme}
            onApplyBackgroundTheme={handleApplyBackgroundTheme}
            onApplyAvatar={setAvatarStyle}
            onApplyBadge={setBadgeFrame}
            onOpenSecurity={() => setScreen("security")}
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
      default: return <StudentDashboard avatarStyle={avatarStyle} skillMapSkin={skillMapSkin} badgeFrame={badgeFrame} onNavigate={setScreen} />;
    }
  };

  const screenContainerKey = screen.startsWith("admin")
    ? "admin-shell"
    : screen.startsWith("instructor")
    ? "instructor-shell"
    : screen;

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
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto relative flex flex-col scroll-smooth">
          <ErrorBoundary>
            <div key={screenContainerKey} className="min-h-full flex-1">
              <Suspense
                fallback={
                  <div className="flex-1 min-h-[240px] flex items-center justify-center p-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Đang tải phân hệ...
                  </div>
                }
              >
                {renderScreen()}
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* ⌘K / Ctrl+K Marlo Command Palette */}
      <MarloCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setScreen}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    </div>
  );
}

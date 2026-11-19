import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboard";
import LearningWorkspace from "./screens/LearningWorkspace";
import GitProjectHub from "./screens/GitProjectHub";
import XPShop from "./screens/XPShop";
import StudentProfile from "./screens/StudentProfile";
import AdminDashboard from "./screens/AdminDashboard";
import InstructorPanel from "./screens/InstructorPanel";
import KanbanBoard from "./screens/KanbanBoard";
import EngineeringScheduleRota from "./screens/EngineeringScheduleRota";
import MarloProjectsScreen from "./screens/MarloProjectsScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import MarloCommandPalette from "./components/MarloCommandPalette";
import MarloGlobalHeader from "./components/MarloGlobalHeader";
import CodeMindIntroLandingPage from "./screens/CodeMindIntroLandingPage";
import AIDefenseRoomScreen from "./screens/AIDefenseRoomScreen";
import SecurityDevicesScreen from "./screens/SecurityDevicesScreen";
import MarloProjectDetailScreen from "./screens/MarloProjectDetailScreen";
import MarloTeamScreen from "./screens/MarloTeamScreen";
import MarloPersonDetailScreen from "./screens/MarloPersonDetailScreen";
import { logoutUser } from "./api";

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
  | "instructor-evidence"
  | "kanban"
  | "schedule"
  | "projects"
  | "project-detail"
  | "team"
  | "person-detail"
  | "defense-room";

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
      if (s) return s as Screen;
    }
    return "login";
  });
  const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("prj-codemind");
  const [selectedMarloProjectId, setSelectedMarloProjectId] = useState<string>("kestrel");
  const [selectedMarloPersonId, setSelectedMarloPersonId] = useState<string>("dara");
  const mainRef = useRef<HTMLElement>(null);

  const setScreen = (nextScreen: Screen) => {
    setScreenState(nextScreen);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", nextScreen);
      window.history.replaceState({}, "", url.toString());
    }
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("role");
      if (r === "instructor" || r === "admin" || r === "student") return r as Role;
      const stored = window.localStorage.getItem("code-mind-role");
      if (stored === "instructor" || stored === "admin" || stored === "student") return stored as Role;
    }
    if (screen.startsWith("instructor")) return "instructor";
    if (screen.startsWith("admin")) return "admin";
    return "student";
  });

  const setRole = (nextRole: Role) => {
    setRoleState(nextRole);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("role", nextRole);
      window.history.replaceState({}, "", url.toString());
      window.localStorage.setItem("code-mind-role", nextRole);
    }
  };
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
    void logoutUser();
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
        <CodeMindIntroLandingPage
          onEnterPlatform={(targetScreen) => {
            setRole("student");
            setScreen(targetScreen || "student-dashboard");
          }}
          onLogin={() => setScreen("login")}
        />
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
            onLogout={handleLogout}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        );
      case "profile":
        return (
          <StudentProfile
            avatarStyle={avatarStyle}
            badgeFrame={badgeFrame}
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
            initialProjectId={selectedKanbanProjectId}
            onSelectProject={setSelectedKanbanProjectId}
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
          onApplyTheme={setBackgroundTheme}
          onApplyAvatar={setAvatarStyle}
          onApplyMentor={setMentorMascot}
          onApplyChatSkin={setChatSkin}
          onApplyMapSkin={setSkillMapSkin}
          onApplyBadge={setBadgeFrame}
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
      case "instructor-evidence":
        return (
          <InstructorPanel
            currentSection={screen}
            onNavigate={setScreen}
          />
        );
      case "kanban": return <KanbanBoard initialProjectId={selectedKanbanProjectId} role={role} />;
      case "schedule": return <EngineeringScheduleRota role={role} onNavigate={setScreen} onRoleChange={setRole} />;
      case "projects": return (
        <MarloProjectsScreen
          role={role}
          onOpenProject={(p) => {
            if (p?.id) setSelectedKanbanProjectId(p.id);
            setScreen("kanban");
          }}
          onOpenProjectDetail={(pId) => {
            if (pId) setSelectedMarloProjectId(pId);
            setScreen("project-detail");
          }}
        />
      );
      case "project-detail": return (
        <MarloProjectDetailScreen
          projectId={selectedMarloProjectId}
          onNavigateBack={() => setScreen("projects")}
          onNavigateToPerson={(personId) => {
            setSelectedMarloPersonId(personId);
            setScreen("person-detail");
          }}
          onNavigateToKanban={(prjId) => {
            setSelectedKanbanProjectId(prjId);
            setScreen("kanban");
          }}
        />
      );
      case "team": return (
        <MarloTeamScreen
          onSelectPerson={(personId) => {
            setSelectedMarloPersonId(personId);
            setScreen("person-detail");
          }}
          onNavigateToProject={(prjId) => {
            setSelectedMarloProjectId(prjId);
            setScreen("project-detail");
          }}
        />
      );
      case "person-detail": return (
        <MarloPersonDetailScreen
          personId={selectedMarloPersonId}
          onNavigateBack={() => setScreen("team")}
          onNavigateToProject={(prjId) => {
            setSelectedMarloProjectId(prjId);
            setScreen("project-detail");
          }}
        />
      );
      case "defense-room": return (
        <AIDefenseRoomScreen
          onNavigate={setScreen}
          initialProjectId={selectedKanbanProjectId}
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
              {renderScreen()}
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

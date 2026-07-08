import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboard";
import LearningWorkspace from "./screens/LearningWorkspace";
import TechReels from "./screens/TechReels";
import GitHubSubmission from "./screens/GitHubSubmission";
import XPShop from "./screens/XPShop";
import StudentProfile from "./screens/StudentProfile";
import AdminDashboard from "./screens/AdminDashboard";
import InstructorPanel from "./screens/InstructorPanel";
import DesktopMascotPet from "./components/DesktopMascotPet";

export type Screen =
  | "login"
  | "student-dashboard"
  | "workspace"
  | "reels"
  | "github"
  | "xp-shop"
  | "profile"
  | "admin"
  | "instructor";

export type Role = "student" | "admin" | "instructor";
export type Theme = "light" | "dark";
export type BackgroundTheme = "diagonal" | "blueprint" | "matrix" | "sunrise" | "graphite";
export type AvatarStyle = "initials" | "pixel" | "coder" | "robot" | "silver";
export type MentorMascot = "mino" | "nova" | "byte" | "sage" | "luna" | "kuro" | "ignis" | "sylph";
export type ChatSkin = "classic" | "terminal" | "neon" | "paper";
export type SkillMapSkin = "campaign" | "space" | "circuit" | "dungeon" | "route-blueprint";
export type BadgeFrame = "streak" | "quiz" | "mindmap" | "rookie" | "explorer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [role, setRole] = useState<Role>("student");
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

  useEffect(() => {
    window.localStorage.setItem("code-mind-theme", theme);
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

  const toggleTheme = () => setTheme((current) => current === "light" ? "dark" : "light");

  if (screen === "login") {
    return (
      <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""}`}>
        <LoginScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogin={(r) => {
            setRole(r);
            setScreen(r === "admin" ? "admin" : r === "instructor" ? "instructor" : "student-dashboard");
          }}
        />
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case "student-dashboard": return <StudentDashboard avatarStyle={avatarStyle} skillMapSkin={skillMapSkin} badgeFrame={badgeFrame} onNavigate={setScreen} />;
      case "workspace": return <LearningWorkspace mentorMascot={mentorMascot} chatSkin={chatSkin} />;
      case "reels": return <TechReels />;
      case "profile": return <StudentProfile avatarStyle={avatarStyle} badgeFrame={badgeFrame} onApplyAvatar={setAvatarStyle} onApplyBadge={setBadgeFrame} />;
      case "github": return <GitHubSubmission />;
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
      case "admin": return <AdminDashboard />;
      case "instructor": return <InstructorPanel />;
      default: return <StudentDashboard avatarStyle={avatarStyle} skillMapSkin={skillMapSkin} badgeFrame={badgeFrame} onNavigate={setScreen} />;
    }
  };

  return (
    <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""} bg-theme-${backgroundTheme} pc-app-bg flex h-screen overflow-hidden text-slate-900`}>
      <Sidebar
        screen={screen}
        role={role}
        theme={theme}
        avatarStyle={avatarStyle}
        badgeFrame={badgeFrame}
        onToggleTheme={toggleTheme}
        onNavigate={setScreen}
        onLogout={() => setScreen("login")}
      />
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
      {role === "student" && screen !== "workspace" && (
        <DesktopMascotPet mascot={mentorMascot} activeScreen={screen} />
      )}
    </div>
  );
}

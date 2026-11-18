// Marlo Engine Store & Data Model (Ported directly from D:\C++\quản lí dự án\marlo-app)

export interface MarloMember {
  id: string;
  name: string;
  role: string;
  hue: number;
  email: string;
  capacity: number; // e.g. 32, 36, 38 h
  skill: "produce" | "colour" | "edit" | "sound" | "vfx" | "motion";
  status: "in" | "remote" | "off";
  initials?: string;
}

export interface MarloProject {
  id: string;
  name: string;
  client: string;
  kind: string;
  status: "planning" | "active" | "review" | "delivered";
  start: number;
  due: number;
  team: string[]; // member IDs (1 project contains multiple people)
  budget: number;
  c: number; // color code 1..6
  lead: string; // member ID
  fav: boolean;
  brief: string;
}

export interface MarloTask {
  id: string;
  title: string;
  projectId: string;
  status: "todo" | "doing" | "review" | "done";
  who: string; // member ID
  due: number;
  priority: "high" | "med" | "low";
  kind: string;
  est: number; // estimated hours
  desc?: string;
}

export interface MarloHourEntry {
  id: string;
  day: number;
  who: string;
  projectId: string;
  hours: number;
  kind: string;
}

// ── Skills metadata ──
export const MARLO_SKILLS: Record<string, { name: string; icon: string }> = {
  edit: { name: "Edit", icon: "scissors" },
  colour: { name: "Colour", icon: "sun" },
  sound: { name: "Sound", icon: "headphones" },
  vfx: { name: "VFX", icon: "sparkles" },
  motion: { name: "Motion", icon: "layers" },
  produce: { name: "Production", icon: "clipboard" }
};

// ── Status labels & tones ──
export const MARLO_PROJECT_STATUS: Record<string, string> = {
  planning: "Planning",
  active: "In post",
  review: "Client review",
  delivered: "Delivered"
};

export const MARLO_TASK_STATUS: Record<string, string> = {
  todo: "Up next",
  doing: "In progress",
  review: "In review",
  done: "Done"
};

export const MARLO_TASK_COLS = [
  { id: "todo", label: "Up next" },
  { id: "doing", label: "In progress" },
  { id: "review", label: "In review" },
  { id: "done", label: "Done" }
] as const;

export const MARLO_MEMBER_STATUS_LABEL: Record<string, string> = {
  in: "In the studio",
  remote: "Remote",
  off: "On leave"
};

export const MARLO_MEMBER_STATUS_TONE: Record<string, "good" | "info" | "plain"> = {
  in: "good",
  remote: "info",
  off: "plain"
};

// Member avatar palettes (matching authentic Marlo hues)
export const MARLO_HUES: Record<number, { bg: string; text: string }> = {
  1: { bg: "#f7d593", text: "#633806" }, // Dara, Leila
  2: { bg: "#f4bf94", text: "#6e2908" }, // Inès, Tomás
  3: { bg: "#d7d9dd", text: "#22252a" }, // Kwame
  4: { bg: "#ead6ae", text: "#523707" }, // Yuki
  5: { bg: "#f1b585", text: "#6b2505" }, // Ravi
  6: { bg: "#e0e1e4", text: "#282a2e" }  // Aoife
};

// ── 8 Authentic Members from Marlo ──
export const MARLO_MEMBERS: MarloMember[] = [
  {
    id: "dara",
    name: "Dara Whitfield",
    role: "Head of post",
    hue: 1,
    email: "dara@northbankpost.co",
    capacity: 32,
    skill: "produce",
    status: "in",
    initials: "DW"
  },
  {
    id: "ines",
    name: "Inès Moreau",
    role: "Senior colourist",
    hue: 2,
    email: "ines@northbankpost.co",
    capacity: 36,
    skill: "colour",
    status: "in",
    initials: "IM"
  },
  {
    id: "kwame",
    name: "Kwame Asante",
    role: "Lead editor",
    hue: 3,
    email: "kwame@northbankpost.co",
    capacity: 38,
    skill: "edit",
    status: "in",
    initials: "KA"
  },
  {
    id: "yuki",
    name: "Yuki Tanabe",
    role: "Sound designer",
    hue: 4,
    email: "yuki@northbankpost.co",
    capacity: 34,
    skill: "sound",
    status: "remote",
    initials: "YT"
  },
  {
    id: "ravi",
    name: "Ravi Menon",
    role: "VFX artist",
    hue: 5,
    email: "ravi@northbankpost.co",
    capacity: 36,
    skill: "vfx",
    status: "in",
    initials: "RM"
  },
  {
    id: "aoife",
    name: "Aoife Brennan",
    role: "Producer",
    hue: 6,
    email: "aoife@northbankpost.co",
    capacity: 35,
    skill: "produce",
    status: "in",
    initials: "AB"
  },
  {
    id: "tomas",
    name: "Tomás Herrera",
    role: "Assistant editor",
    hue: 2,
    email: "tomas@northbankpost.co",
    capacity: 38,
    skill: "edit",
    status: "off",
    initials: "TH"
  },
  {
    id: "leila",
    name: "Leila Haddad",
    role: "Motion designer",
    hue: 1,
    email: "leila@northbankpost.co",
    capacity: 30,
    skill: "motion",
    status: "remote",
    initials: "LH"
  }
];

const NOW = Date.now();
const ONE_DAY = 86400000;
const d = (offsetDays: number) => NOW + offsetDays * ONE_DAY;

// ── 11 Authentic Projects from Marlo ──
export const MARLO_PROJECTS: MarloProject[] = [
  {
    id: "kestrel",
    name: "Kestrel Spring Campaign",
    client: "Kestrel Outdoor",
    kind: "Campaign",
    status: "review",
    start: d(-28),
    due: d(4),
    team: ["kwame", "leila", "ines", "aoife"],
    budget: 38200,
    c: 2,
    lead: "aoife",
    fav: true,
    brief: "One 60s hero film and six 15s cut-downs for social, delivered in 16:9, 9:16 and 1:1."
  },
  {
    id: "harbour",
    name: "Harbour Lights",
    client: "Tidewater Films",
    kind: "Feature doc",
    status: "active",
    start: d(-46),
    due: d(23),
    team: ["kwame", "ines", "yuki", "tomas", "dara"],
    budget: 84500,
    c: 1,
    lead: "kwame",
    fav: true,
    brief: "A 92-minute documentary about the last lighthouse keepers on the Clyde. Picture lock is due before the grade block."
  },
  {
    id: "longfield",
    name: "The Long Field",
    client: "Screen Scotland",
    kind: "Short film",
    status: "active",
    start: d(-20),
    due: d(31),
    team: ["tomas", "yuki", "ines"],
    budget: 21400,
    c: 3,
    lead: "tomas",
    fav: false,
    brief: "A 14-minute drama shot on 16mm. Scan, conform, grade and a 5.1 mix for festival delivery."
  },
  {
    id: "brightwell",
    name: "Brightwell Bank — Brand Film",
    client: "Brightwell Bank",
    kind: "Brand film",
    status: "active",
    start: d(-14),
    due: d(12),
    team: ["kwame", "ravi", "leila", "aoife"],
    budget: 46800,
    c: 4,
    lead: "aoife",
    fav: false,
    brief: "A 2-minute brand film with screen replacements and a typographic end card."
  },
  {
    id: "saltmarsh",
    name: "Saltmarsh, Ep. 3",
    client: "Northlight TV",
    kind: "Series",
    status: "active",
    start: d(-34),
    due: d(9),
    team: ["kwame", "tomas", "yuki", "ravi", "ines"],
    budget: 52900,
    c: 5,
    lead: "kwame",
    fav: true,
    brief: "Episode three of six. Fine cut notes from the network are in; online and mix follow."
  },
  {
    id: "ferro",
    name: "Ferro Cycles Launch Spot",
    client: "Ferro Cycles",
    kind: "Commercial",
    status: "planning",
    start: d(3),
    due: d(38),
    team: ["leila", "ravi", "yuki"],
    budget: 27600,
    c: 6,
    lead: "leila",
    fav: false,
    brief: "A 30s launch spot for the Aria e-bike. CG wheel build, sound design, two aspect ratios."
  },
  {
    id: "jazz",
    name: "Glasgow Jazz Fest Trailer",
    client: "Glasgow Jazz Festival",
    kind: "Trailer",
    status: "delivered",
    start: d(-60),
    due: d(-12),
    team: ["leila", "kwame", "yuki"],
    budget: 16900,
    c: 1,
    lead: "leila",
    fav: false,
    brief: "A 45s trailer cut to an original track, with kinetic type."
  },
  {
    id: "rail",
    name: "Northern Rail Safety Film",
    client: "Northern Rail",
    kind: "Brand film",
    status: "delivered",
    start: d(-178),
    due: d(-104),
    team: ["kwame", "ines", "yuki", "ravi", "aoife", "tomas", "leila", "dara"],
    budget: 96400,
    c: 4,
    lead: "aoife",
    fav: false,
    brief: "A 6-minute safety film for station staff, with motion graphics and a narrated mix."
  },
  {
    id: "clyde",
    name: "Clydebank Museum Films",
    client: "Clydebank Museum",
    kind: "Exhibition",
    status: "delivered",
    start: d(-150),
    due: d(-72),
    team: ["tomas", "ines", "yuki", "leila", "ravi", "kwame", "dara"],
    budget: 61800,
    c: 5,
    lead: "tomas",
    fav: false,
    brief: "Five looping films for the shipyard gallery, graded to match archive."
  },
  {
    id: "arran",
    name: "Arran Ferries Spring Spot",
    client: "Arran Ferries",
    kind: "Commercial",
    status: "delivered",
    start: d(-118),
    due: d(-58),
    team: ["kwame", "ines", "yuki", "ravi", "aoife", "leila"],
    budget: 38900,
    c: 6,
    lead: "aoife",
    fav: false,
    brief: "A 30s spot and two cut-downs for the spring timetable."
  },
  {
    id: "mossgiel",
    name: "Mossgiel Distillery Heritage",
    client: "Mossgiel Distillery",
    kind: "Brand film",
    status: "review",
    start: d(-40),
    due: d(2),
    team: ["tomas", "ines", "yuki", "dara"],
    budget: 31750,
    c: 2,
    lead: "dara",
    fav: false,
    brief: "A 4-minute heritage film from archive stills and new drone footage, with a narrated mix."
  }
];

// ── Tasks Seed ──
export const MARLO_TASKS: MarloTask[] = [
  // Kestrel Spring Campaign (Matching Image 1: 15 tasks: 1 doing, 1 review, 13 done)
  { id: "t-kes-1", title: "Primary grade, reels 1–2", projectId: "kestrel", status: "doing", who: "ines", due: d(1), priority: "high", kind: "colour", est: 6 },
  { id: "t-kes-2", title: "Approve Kestrel cut-downs", projectId: "kestrel", status: "review", who: "dara", due: d(0), priority: "high", kind: "produce", est: 2 },
  { id: "t-kes-3", title: "Delivery QC", projectId: "kestrel", status: "done", who: "aoife", due: d(-1), priority: "high", kind: "produce", est: 3 },
  { id: "t-kes-4", title: "Shot matching pass", projectId: "kestrel", status: "done", who: "ines", due: d(-2), priority: "med", kind: "colour", est: 4 },
  { id: "t-kes-5", title: "Title design", projectId: "kestrel", status: "done", who: "leila", due: d(-3), priority: "med", kind: "motion", est: 4 },
  { id: "t-kes-6", title: "Primary grade, reels 1–2", projectId: "kestrel", status: "done", who: "ines", due: d(-4), priority: "med", kind: "colour", est: 6 },
  { id: "t-kes-7", title: "Map animation", projectId: "kestrel", status: "done", who: "leila", due: d(-5), priority: "low", kind: "motion", est: 4 },
  { id: "t-kes-8", title: "Assembly of interview selects", projectId: "kestrel", status: "done", who: "kwame", due: d(-7), priority: "med", kind: "edit", est: 8 },
  { id: "t-kes-9", title: "Rough cut v2", projectId: "kestrel", status: "done", who: "kwame", due: d(-9), priority: "high", kind: "edit", est: 12 },
  { id: "t-kes-10", title: "Cut-downs for social (9:16 & 1:1)", projectId: "kestrel", status: "done", who: "kwame", due: d(-11), priority: "high", kind: "edit", est: 6 },
  { id: "t-kes-11", title: "Skin tone balance", projectId: "kestrel", status: "done", who: "ines", due: d(-13), priority: "med", kind: "colour", est: 4 },
  { id: "t-kes-12", title: "End card animation", projectId: "kestrel", status: "done", who: "leila", due: d(-15), priority: "med", kind: "motion", est: 3 },
  { id: "t-kes-13", title: "Client review link", projectId: "kestrel", status: "done", who: "aoife", due: d(-18), priority: "high", kind: "produce", est: 2 },
  { id: "t-kes-14", title: "Music licence paperwork", projectId: "kestrel", status: "done", who: "aoife", due: d(-20), priority: "low", kind: "produce", est: 2 },
  { id: "t-kes-15", title: "Send delivery specs", projectId: "kestrel", status: "done", who: "aoife", due: d(-24), priority: "med", kind: "produce", est: 1 },

  // Dara Whitfield open tasks (Matching Image 3: 9 open tasks)
  { id: "t-dar-1", title: "Approve Kestrel cut-downs", projectId: "kestrel", status: "review", who: "dara", due: d(0), priority: "high", kind: "produce", est: 2 },
  { id: "t-dar-2", title: "Send Mossgiel delivery specs", projectId: "mossgiel", status: "doing", who: "dara", due: d(0), priority: "high", kind: "produce", est: 3 },
  { id: "t-dar-3", title: "Book grade room for Harbour Lights", projectId: "harbour", status: "todo", who: "dara", due: d(1), priority: "med", kind: "produce", est: 2 },
  { id: "t-dar-4", title: "Sign off Saltmarsh music cue sheet", projectId: "saltmarsh", status: "doing", who: "dara", due: d(1), priority: "low", kind: "produce", est: 4 },
  { id: "t-dar-5", title: "Ferro kick-off brief", projectId: "ferro", status: "todo", who: "dara", due: d(2), priority: "med", kind: "produce", est: 3 },
  { id: "t-dar-6", title: "Client review link for Brightwell", projectId: "brightwell", status: "todo", who: "dara", due: d(3), priority: "med", kind: "produce", est: 2 },
  { id: "t-dar-7", title: "Chase archive clearances for Clydebank", projectId: "clyde", status: "todo", who: "dara", due: d(4), priority: "low", kind: "produce", est: 4 },
  { id: "t-dar-8", title: "Festival delivery paperwork for The Long Field", projectId: "longfield", status: "todo", who: "dara", due: d(5), priority: "med", kind: "produce", est: 3 },
  { id: "t-dar-9", title: "Annual studio tech audit & pipeline sync", projectId: "harbour", status: "todo", who: "dara", due: d(7), priority: "low", kind: "produce", est: 5 },

  // Additional tasks for other members
  { id: "t-ine-1", title: "HDR trim pass", projectId: "brightwell", status: "todo", who: "ines", due: d(2), priority: "med", kind: "colour", est: 4 },
  { id: "t-ine-2", title: "Archive clean-up grade", projectId: "saltmarsh", status: "doing", who: "ines", due: d(3), priority: "high", kind: "colour", est: 6 },
  { id: "t-kwa-1", title: "Fine cut notes pass", projectId: "saltmarsh", status: "doing", who: "kwame", due: d(2), priority: "high", kind: "edit", est: 8 },
  { id: "t-kwa-2", title: "Conform to online", projectId: "harbour", status: "todo", who: "kwame", due: d(4), priority: "med", kind: "edit", est: 6 },
  { id: "t-yuk-1", title: "Dialogue edit", projectId: "harbour", status: "doing", who: "yuki", due: d(2), priority: "high", kind: "sound", est: 6 },
  { id: "t-rav-1", title: "Screen replacements", projectId: "brightwell", status: "doing", who: "ravi", due: d(1), priority: "high", kind: "vfx", est: 8 },
  { id: "t-lei-1", title: "Kinetic type sequence", projectId: "jazz", status: "done", who: "leila", due: d(-14), priority: "high", kind: "motion", est: 6 }
];

// Helper to format currency
export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `£${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `£${amount.toLocaleString()}`;
}

export function formatFullCurrency(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Store Queries ──
export function getMarloProject(id: string): MarloProject | undefined {
  return MARLO_PROJECTS.find((p) => p.id === id);
}

export function getMarloMember(id: string): MarloMember | undefined {
  return MARLO_MEMBERS.find((m) => m.id === id);
}

export function getProjectTasks(projectId: string): MarloTask[] {
  return MARLO_TASKS.filter((t) => t.projectId === projectId);
}

export function getMemberTasks(memberId: string): MarloTask[] {
  return MARLO_TASKS.filter((t) => t.who === memberId);
}

export function getMemberOpenTasks(memberId: string): MarloTask[] {
  return MARLO_TASKS.filter((t) => t.who === memberId && t.status !== "done");
}

// 1 PERSON HAS MULTIPLE PROJECTS (Jobs)
export function getMemberProjects(memberId: string): MarloProject[] {
  return MARLO_PROJECTS.filter((p) => p.team.includes(memberId));
}

// Dynamic Mock Hours logged for Project (Matching Image 1: 224 h total, 17 h this week)
export function getProjectHoursStats(projectId: string) {
  if (projectId === "kestrel") {
    return {
      totalHours: 224,
      thisWeekHours: 17,
      budgetUsed: 9400,
      labels: ["21 Sept", "28 Sept", "5 Oct", "12 Oct", "19 Oct", "26 Oct", "2 Nov", "9 Nov"],
      values: [0, 0, 0, 18, 42, 36, 40, 17] // Highlight current week (9 Nov) = 17h
    };
  }
  return {
    totalHours: 186,
    thisWeekHours: 24,
    budgetUsed: 14200,
    labels: ["21 Sept", "28 Sept", "5 Oct", "12 Oct", "19 Oct", "26 Oct", "2 Nov", "9 Nov"],
    values: [12, 18, 22, 28, 32, 26, 24, 24]
  };
}

// Dynamic Mock Hours logged for Member (Matching Image 2 & 3: Dara 24/32h, 8 weeks 168h, Open work 32h)
export function getMemberLoadStats(memberId: string) {
  const member = getMarloMember(memberId);
  const cap = member?.capacity || 35;
  const loadMap: Record<string, { last7Days: number; openWork: number; eightWeeks: number; values: number[] }> = {
    dara: { last7Days: 24, openWork: 32, eightWeeks: 168, values: [22, 26, 28, 30, 26, 24, 28, 24] },
    ines: { last7Days: 24, openWork: 28, eightWeeks: 182, values: [24, 28, 32, 34, 30, 28, 24, 24] },
    kwame: { last7Days: 31, openWork: 36, eightWeeks: 210, values: [32, 34, 36, 38, 34, 32, 30, 31] },
    yuki: { last7Days: 24, openWork: 24, eightWeeks: 174, values: [20, 24, 26, 28, 24, 26, 22, 24] },
    ravi: { last7Days: 23, openWork: 20, eightWeeks: 164, values: [22, 24, 28, 26, 24, 22, 20, 23] },
    aoife: { last7Days: 22, openWork: 26, eightWeeks: 156, values: [20, 22, 24, 26, 22, 24, 20, 22] },
    tomas: { last7Days: 17, openWork: 18, eightWeeks: 120, values: [18, 20, 22, 20, 18, 16, 14, 17] },
    leila: { last7Days: 22, openWork: 22, eightWeeks: 152, values: [18, 20, 24, 26, 22, 20, 18, 22] }
  };

  const stat = loadMap[memberId] || { last7Days: 20, openWork: 20, eightWeeks: 140, values: [18, 20, 22, 20, 18, 16, 14, 20] };
  const labels = ["21 Sept", "28 Sept", "5 Oct", "12 Oct", "19 Oct", "26 Oct", "2 Nov", "9 Nov"];

  return {
    ...stat,
    capacity: cap,
    labels
  };
}

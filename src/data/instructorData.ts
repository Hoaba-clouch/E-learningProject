import { MarkerType, type Edge, type Node } from "@xyflow/react";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  correctIndex?: number;
  explanation?: string;
}

export interface VideoScene {
  id: string;
  title: string;
  text: string;
  script: string;
  time?: string;
}

export interface LessonContent {
  reading: string;
  videoScenes: VideoScene[];
  quizzes: QuizQuestion[];
  youtubeUrl?: string;
  youtubeId?: string;
  objective?: string;
  lead?: string;
  codeSnippet?: {
    lang: string;
    code: string;
    caption: string;
  };
  keyTakeaways?: string[];
  antiPattern?: {
    badDesc: string;
    solution: string;
  };
}

export interface DocumentFile {
  name: string;
  size: string;
  uploadedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  status: "Đã phát hành" | "Bản nháp";
  isGenerated: boolean;
  documents: DocumentFile[];
  content: LessonContent;
}

export interface DockerTestCase {
  id: string;
  title: string;
  input: string;
  expectedOutput: string;
  isEdgeCase: boolean;
  timeoutMs: number;
  memoryLimitMb: number;
}

export interface Assignment {
  id: string;
  type: "mindmap" | "github" | "quiz" | "code_lab";
  title: string;
  description: string;
  isRequired: boolean;
  points: number;
  repoTemplate?: string;
  dockerImage?: string;
  testCases?: DockerTestCase[];
}

export interface MasterMindmapNodeData extends Record<string, unknown> {
  title: string;
  summary: string;
  tag: string;
  nodeType: "root" | "branch" | "leaf";
  masteryPct: number;
  xp?: number;
}

export interface Chapter {
  id: string;
  title: string;
  status: "Đã phát hành" | "Bản nháp";
  lessons: Lesson[];
  assignments: Assignment[];
  mindmapNodes?: Node<MasterMindmapNodeData>[];
  mindmapEdges?: Edge[];
  mindmapGenerated?: boolean;
}

export interface CourseClass {
  id: string;
  subjectId: string;
  code: string;
  name: string;
  semester: string;
  studentCount: number;
  avgProgressPct: number;
  chapters: Chapter[];
}

export interface DualTestCaseDetail {
  id: string;
  title: string;
  status: "passed" | "failed";
  durationMs: number;
  isEdgeCase: boolean;
  note?: string;
}

export interface DefenseTranscriptEntry {
  id: string;
  speaker: "ai_chair" | "ai_critic" | "student";
  speakerLabel: string;
  text: string;
  evaluation?: string;
}

export interface DualSubmissionRecord {
  id: string;
  classId: string;
  studentName: string;
  studentCode: string;
  chapterTitle: string;
  repoUrl: string;
  submittedAt: string;
  // Cột 1: Docker CI/CD Sandbox
  passedTests: number;
  totalTests: number;
  execTimeMs: number;
  memoryMb: number;
  commitHash: string;
  commitCount: number;
  similarityPct: number;
  testDetails: DualTestCaseDetail[];
  // Cột 2: Phòng Phản Biện AI 3D
  defenseStatus: "completed" | "flagged" | "pending";
  defenseScore: number;
  coherenceSummary: string;
  transcript: DefenseTranscriptEntry[];
  // Kết quả cuối
  status: "pending" | "flagged" | "graded" | "redefense_requested";
  finalScore: number | null;
  instructorFeedback: string;
}

export interface DefenseRubricConfig {
  cicdWeightPct: number;
  defenseWeightPct: number;
  strictAntiCopyGuardrail: boolean;
  autoFlagDiscrepancyThreshold: number;
  mandatoryProbes: {
    id: string;
    chapterKeyword: string;
    topic: string;
  }[];
}

export const INITIAL_DEFENSE_RUBRIC: DefenseRubricConfig = {
  cicdWeightPct: 60,
  defenseWeightPct: 40,
  strictAntiCopyGuardrail: true,
  autoFlagDiscrepancyThreshold: 25,
  mandatoryProbes: [
    {
      id: "probe-1",
      chapterKeyword: "CS201 · Chương 1",
      topic: "Giải thích cơ chế vptr / vtable lookup và hệ quả thiếu virtual destructor khi delete Base*.",
    },
    {
      id: "probe-2",
      chapterKeyword: "CS202 · Chương 1",
      topic: "Phân tích độ phức tạp O((V + E) log V) của Dijkstra và lý do cần điều kiện lazy deletion.",
    },
    {
      id: "probe-3",
      chapterKeyword: "CS304 · Chương 1",
      topic: "Quy trình xác thực Bearer JWT qua FastAPI Dependency và phân quyền RBAC tránh lộ dữ liệu chéo.",
    },
    {
      id: "probe-4",
      chapterKeyword: "CS420 · Chương 1",
      topic: "Cách thiết kế Chunk Overlap và ngưỡng Cosine Similarity trong pgvector để giảm ảo giác RAG.",
    },
  ],
};

function makeCleanEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { strokeWidth: 1.75, stroke: "#94a3b8", strokeDasharray: "5 4" },
  };
}

export const INITIAL_INSTRUCTOR_CLASSES: CourseClass[] = [
  {
    id: "class-oop",
    subjectId: "oop",
    code: "CS201",
    name: "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
    semester: "Học kỳ 1 / 2026",
    studentCount: 42,
    avgProgressPct: 74,
    chapters: [
      {
        id: "oop-ch1",
        title: "Chương 1: Kế thừa, Đa hình & Kiến trúc vtable",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "oop-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 170 },
            data: {
              title: "Chương 1: OOP & Kiến trúc vtable",
              summary: "Sơ đồ Master Graph chuẩn của chương",
              tag: "CS201 · ROOT",
              nodeType: "root",
              masteryPct: 78,
              xp: 210,
            },
          },
          {
            id: "oop-b1",
            type: "masterMindmapNode",
            position: { x: 350, y: 40 },
            data: {
              title: "1.1 Kế thừa & Bố cục bộ nhớ",
              summary: "Superclass Employee, tái sử dụng thuộc tính và constructor chaining.",
              tag: "Inheritance",
              nodeType: "branch",
              masteryPct: 89,
            },
          },
          {
            id: "oop-b2",
            type: "masterMindmapNode",
            position: { x: 350, y: 175 },
            data: {
              title: "1.2 Đa hình & Bảng ảo vtable",
              summary: "Dynamic dispatch qua vptr runtime, giải quyết bài toán evaluatePayroll.",
              tag: "Polymorphism",
              nodeType: "branch",
              masteryPct: 68,
            },
          },
          {
            id: "oop-b3",
            type: "masterMindmapNode",
            position: { x: 350, y: 310 },
            data: {
              title: "1.3 Virtual Destructor & RAII",
              summary: "Giải phóng đúng thứ tự Subclass -> Baseclass tránh memory leak.",
              tag: "Memory Safety",
              nodeType: "branch",
              masteryPct: 44,
            },
          },
          {
            id: "oop-l1",
            type: "masterMindmapNode",
            position: { x: 670, y: 110 },
            data: {
              title: "Object Slicing Guard",
              summary: "Truyền Base* hoặc Base& thay vì truyền tham trị cắt mất phần lớp con.",
              tag: "Edge Case",
              nodeType: "leaf",
              masteryPct: 52,
            },
          },
          {
            id: "oop-l2",
            type: "masterMindmapNode",
            position: { x: 670, y: 260 },
            data: {
              title: "SOLID Interface Contract",
              summary: "Thuần ảo (= 0) ép buộc lớp con hiện thực calculateSalary().",
              tag: "Docker Lab",
              nodeType: "leaf",
              masteryPct: 64,
            },
          },
        ],
        mindmapEdges: [
          makeCleanEdge("oop-e1", "oop-root", "oop-b1"),
          makeCleanEdge("oop-e2", "oop-root", "oop-b2"),
          makeCleanEdge("oop-e3", "oop-root", "oop-b3"),
          makeCleanEdge("oop-e4", "oop-b2", "oop-l1"),
          makeCleanEdge("oop-e5", "oop-b2", "oop-l2"),
          makeCleanEdge("oop-e6", "oop-b3", "oop-l2"),
        ],
        lessons: [
          {
            id: "oop-ch1-l1",
            title: "1.1 Kế thừa, super() & Quan hệ Is-A",
            duration: "14 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS201_Chuong1_KeThua_OOP.docx", size: "128 KB", uploadedAt: "10/11/2026" }],
            content: {
              reading:
                "Kế thừa (Inheritance) cho phép lớp con (Subclass) kế thừa dữ liệu và hành vi từ lớp cha (Superclass) mà vẫn giữ nguyên tính đóng gói.\n\nĐiểm cốt lõi cần nắm:\n1. Constructor chaining: Lớp cha luôn được khởi tạo trước lớp con (gọi qua initializer list trong C++ hoặc super() ở Java).\n2. Bảo vệ phạm vi truy cập: Dùng protected cho các hàm nội bộ cần chia sẻ với lớp con nhưng vẫn ẩn khỏi bên ngoài.\n3. Tránh lạm dụng kế thừa sâu quá 3 tầng để không làm phình kích thước đối tượng.",
              videoScenes: [
                {
                  id: "s1",
                  title: "Phân cảnh 1",
                  text: "Bố cục bộ nhớ đối tượng kế thừa",
                  script: "Khi tạo một đối tượng Developer kế thừa từ Employee, phần bộ nhớ của Employee được cấp phát ở đầu vùng nhớ đối tượng, theo sau là các thuộc tính mở rộng của Developer.",
                },
                {
                  id: "s2",
                  title: "Phân cảnh 2",
                  text: "Thứ tự gọi Constructor & Destructor",
                  script: "Constructor chạy từ Cha xuống Con, còn Destructor luôn chạy ngược lại từ Con lên Cha để đảm bảo tài nguyên phụ thuộc được dọn dẹp an toàn.",
                },
              ],
              quizzes: [
                {
                  id: "q1",
                  question: "Thứ tự khởi tạo Constructor khi tạo đối tượng lớp con Manager kế thừa Employee là gì?",
                  options: ["Employee -> Manager", "Manager -> Employee", "Chỉ chạy Manager", "Ngẫu nhiên theo trình biên dịch"],
                  answer: "Employee -> Manager",
                },
                {
                  id: "q2",
                  question: "Lỗi Object Slicing xảy ra khi nào trong C++?",
                  options: [
                    "Truyền đối tượng lớp con theo giá trị (pass-by-value) vào tham số kiểu lớp cha",
                    "Dùng con trỏ Base* trỏ tới Derived",
                    "Khai báo hàm virtual destructor",
                    "Dùng từ khóa override ở lớp con",
                  ],
                  answer: "Truyền đối tượng lớp con theo giá trị (pass-by-value) vào tham số kiểu lớp cha",
                },
              ],
            },
          },
          {
            id: "oop-ch1-l2",
            title: "1.2 Bản chất Đa hình, vtable & Dynamic Dispatch",
            duration: "18 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS201_vtable_Dynamic_Dispatch.pdf", size: "420 KB", uploadedAt: "11/11/2026" }],
            content: {
              reading:
                "Tính đa hình thời gian chạy (Runtime Polymorphism) được C++ Runtime thực thi thông qua bảng hàm ảo (Virtual Table - vtable) và con trỏ ẩn vptr nằm ở 8 byte đầu mỗi object.\n\nKhi một hàm thành viên được đánh dấu `virtual`, lời gọi qua `Employee* emp` sẽ không liên kết tĩnh lúc compile mà tra bảng vtable tại runtime để nhảy đúng tới hàm `Developer::calculateSalary()` hoặc `Manager::calculateSalary()`.\n\nLưu ý sống còn: Nếu lớp có bất kỳ hàm `virtual` nào, hãy luôn khai báo `virtual ~Employee() = default;` để tránh rò rỉ bộ nhớ Heap.",
              videoScenes: [
                {
                  id: "s1",
                  title: "Phân cảnh 1",
                  text: "Cơ chế vptr trỏ tới vtable",
                  script: "Mỗi lớp có hàm virtual sở hữu đúng 1 bảng vtable tĩnh lưu địa chỉ các hàm override. Mỗi instance sở hữu 1 con trỏ vptr trỏ về bảng của lớp thực sự khởi tạo nó.",
                },
                {
                  id: "s2",
                  title: "Phân cảnh 2",
                  text: "Tại sao cần Virtual Destructor",
                  script: "Khi gọi delete emp qua con trỏ lớp cha mà destructor không phải virtual, trình biên dịch chỉ dọn phần Employee và bỏ quên vùng nhớ cấp phát riêng trong Developer.",
                },
              ],
              quizzes: [
                {
                  id: "q3",
                  question: "Con trỏ vptr được trình biên dịch chèn vào đâu?",
                  options: [
                    "Vào từng instance (đối tượng) của lớp có hàm virtual",
                    "Vào stack của hàm main()",
                    "Chỉ lưu trong biến static toàn cục",
                    "Không tồn tại lúc runtime",
                  ],
                  answer: "Vào từng instance (đối tượng) của lớp có hàm virtual",
                },
              ],
            },
          },
          {
            id: "oop-ch1-l3",
            title: "1.3 Lớp trừu tượng, Interface & Nguyên lý SOLID",
            duration: "15 phút",
            status: "Bản nháp",
            isGenerated: false,
            documents: [],
            content: { reading: "", videoScenes: [], quizzes: [] },
          },
        ],
        assignments: [
          {
            id: "oop-ch1-lab",
            type: "code_lab",
            title: "Hiện thực Đa hình Employee, Developer & Manager (Virtual Table)",
            description: "Khai báo lớp trừu tượng Employee với calculateSalary() = 0 và virtual destructor; đánh giá đúng bảng lương qua Employee*.",
            isRequired: true,
            points: 100,
            repoTemplate: "https://github.com/codemind-campus/cpp-oop-polymorphism-template",
            dockerImage: "codemind/cpp20-sandbox:valgrind-1.4",
            testCases: [
              {
                id: "tc-1",
                title: "Kiểm tra tính lương Developer (base + overtime * 25)",
                input: "Developer(\"An\", 1500, 10)",
                expectedOutput: "1750.00",
                isEdgeCase: false,
                timeoutMs: 1200,
                memoryLimitMb: 64,
              },
              {
                id: "tc-2",
                title: "Kiểm tra tính lương Manager (base + bonus)",
                input: "Manager(\"Binh\", 2200, 600)",
                expectedOutput: "2800.00",
                isEdgeCase: false,
                timeoutMs: 1200,
                memoryLimitMb: 64,
              },
              {
                id: "tc-3",
                title: "Đa hình qua mảng con trỏ Employee* (Dynamic Dispatch)",
                input: "vector<Employee*> { dev, mgr }",
                expectedOutput: "Total Payroll: 4550.00",
                isEdgeCase: false,
                timeoutMs: 1500,
                memoryLimitMb: 64,
              },
              {
                id: "tc-4",
                title: "Biên: Giờ làm thêm = 0 và chống Object Slicing",
                input: "evaluatePayroll(new Developer(\"Lan\", 1000, 0))",
                expectedOutput: "1000.00",
                isEdgeCase: true,
                timeoutMs: 1200,
                memoryLimitMb: 64,
              },
              {
                id: "tc-5",
                title: "Edge Case: Valgrind kiểm tra Virtual Destructor (0 bytes leaked)",
                input: "delete empBasePtr; // empBasePtr -> Developer",
                expectedOutput: "All heap blocks were freed -- no leaks are possible",
                isEdgeCase: true,
                timeoutMs: 2500,
                memoryLimitMb: 128,
              },
            ],
          },
        ],
      },
      {
        id: "oop-ch2",
        title: "Chương 2: Smart Pointers & Quản lý Tài nguyên (RAII)",
        status: "Bản nháp",
        mindmapGenerated: false,
        lessons: [
          {
            id: "oop-ch2-l1",
            title: "2.1 unique_ptr, shared_ptr & weak_ptr chống Circular Reference",
            duration: "16 phút",
            status: "Bản nháp",
            isGenerated: false,
            documents: [],
            content: { reading: "", videoScenes: [], quizzes: [] },
          },
        ],
        assignments: [
          {
            id: "oop-ch2-lab",
            type: "code_lab",
            title: "Phá vỡ vòng tham chiếu bằng std::weak_ptr trong Cache Pool",
            description: "Triển khai Resource Pool bằng shared_ptr và weak_ptr đạt 0 memory leaks.",
            isRequired: true,
            points: 120,
            repoTemplate: "https://github.com/codemind-campus/cpp-raii-smart-ptr",
            dockerImage: "codemind/cpp20-sandbox:valgrind-1.4",
            testCases: [
              {
                id: "tc-raii-1",
                title: "Kiểm tra reference count giải phóng về 0 khi out of scope",
                input: "pool.acquire(\"tex_01\") -> scope exit",
                expectedOutput: "expired() == true",
                isEdgeCase: true,
                timeoutMs: 1500,
                memoryLimitMb: 64,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "class-dsa",
    subjectId: "dsa",
    code: "CS202",
    name: "Giải thuật Nâng cao & Cấu trúc Dữ liệu Phức hợp",
    semester: "Học kỳ 1 / 2026",
    studentCount: 38,
    avgProgressPct: 68,
    chapters: [
      {
        id: "dsa-ch1",
        title: "Chương 1: Đồ thị có trọng số, Dijkstra & Disjoint Set Union",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "dsa-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 165 },
            data: {
              title: "Chương 1: Đồ thị & DSU",
              summary: "Đường đi ngắn nhất & Cây khung nhỏ nhất",
              tag: "CS202 · ROOT",
              nodeType: "root",
              masteryPct: 71,
              xp: 200,
            },
          },
          {
            id: "dsa-b1",
            type: "masterMindmapNode",
            position: { x: 350, y: 55 },
            data: {
              title: "1.1 Min-Heap Dijkstra",
              summary: "Priority Queue tìm đường đi ngắn nhất độ phức tạp O((V+E) log V).",
              tag: "Shortest Path",
              nodeType: "branch",
              masteryPct: 76,
            },
          },
          {
            id: "dsa-b2",
            type: "masterMindmapNode",
            position: { x: 350, y: 215 },
            data: {
              title: "1.2 Disjoint Set (Path Compression)",
              summary: "Hợp nhất tập hợp theo rank tối ưu gần O(1) alpha(N).",
              tag: "Union-Find",
              nodeType: "branch",
              masteryPct: 58,
            },
          },
          {
            id: "dsa-l1",
            type: "masterMindmapNode",
            position: { x: 670, y: 55 },
            data: {
              title: "Lazy Deletion Guard",
              summary: "Bỏ qua trạng thái cũ if (d > dist[u]) continue tránh TLE.",
              tag: "Edge Case",
              nodeType: "leaf",
              masteryPct: 48,
            },
          },
        ],
        mindmapEdges: [
          makeCleanEdge("dsa-e1", "dsa-root", "dsa-b1"),
          makeCleanEdge("dsa-e2", "dsa-root", "dsa-b2"),
          makeCleanEdge("dsa-e3", "dsa-b1", "dsa-l1"),
        ],
        lessons: [
          {
            id: "dsa-ch1-l1",
            title: "1.1 Dijkstra với Priority Queue & Kỹ thuật Lazy Deletion",
            duration: "20 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS202_Dijkstra_MinHeap.pdf", size: "310 KB", uploadedAt: "09/11/2026" }],
            content: {
              reading:
                "Thuật toán Dijkstra tìm đường đi ngắn nhất từ một đỉnh nguồn tới mọi đỉnh còn lại trên đồ thị có trọng số không âm.\n\nKhi đồ thị có V = 10^5 đỉnh và E = 2*10^5 cạnh, bắt buộc dùng Danh sách kề kết hợp Min-Heap (priority_queue với greater<>). Lưu ý quan trọng: luôn kiểm tra `if (d > dist[u]) continue;` ngay khi pop khỏi heap để tránh lặp lại nhánh cũ tốn O(E^2).",
              videoScenes: [
                {
                  id: "s1",
                  title: "Phân cảnh 1",
                  text: "Vì sao phải kiểm tra d > dist[u]?",
                  script: "Do std::priority_queue không hỗ trợ decrease-key trực tiếp, ta đẩy cặp khoảng cách mới vào và dùng điều kiện kiểm tra để loại bỏ bản sao lỗi thời.",
                },
              ],
              quizzes: [
                {
                  id: "dsa-q1",
                  question: "Khi nào thuật toán Dijkstra chuẩn cho kết quả sai?",
                  options: [
                    "Khi đồ thị chứa cạnh có trọng số âm",
                    "Khi đồ thị là đồ thị vô hướng",
                    "Khi có nhiều thành phần liên thông",
                    "Khi có cạnh trọng số bằng 0",
                  ],
                  answer: "Khi đồ thị chứa cạnh có trọng số âm",
                },
              ],
            },
          },
        ],
        assignments: [
          {
            id: "dsa-ch1-lab",
            type: "code_lab",
            title: "Định tuyến Mạng Độ trễ Thấp (Dijkstra 10^5 đỉnh)",
            description: "Tìm đường đi ngắn nhất và xử lý đỉnh cô lập trên đồ thị lớn trong dưới 500ms.",
            isRequired: true,
            points: 120,
            repoTemplate: "https://github.com/codemind-campus/dsa-dijkstra-benchmark",
            dockerImage: "codemind/cpp20-sandbox:gcc14",
            testCases: [
              {
                id: "tc-dsa-1",
                title: "Đồ thị nhỏ 6 đỉnh có cạnh song song",
                input: "N=6, M=8, S=1 -> T=6",
                expectedOutput: "14",
                isEdgeCase: false,
                timeoutMs: 500,
                memoryLimitMb: 64,
              },
              {
                id: "tc-dsa-2",
                title: "Edge Case: Đồ thị không liên thông (trả về -1) & trọng số 0",
                input: "N=5, M=2, S=1 -> T=5",
                expectedOutput: "-1",
                isEdgeCase: true,
                timeoutMs: 500,
                memoryLimitMb: 64,
              },
              {
                id: "tc-dsa-3",
                title: "Stress Test: 100,000 đỉnh & 200,000 cạnh (< 500ms)",
                input: "dense_graph_100k.txt",
                expectedOutput: "294810294",
                isEdgeCase: true,
                timeoutMs: 500,
                memoryLimitMb: 256,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "class-web",
    subjectId: "web",
    code: "CS304",
    name: "Phát triển Web Hiện đại & REST API",
    semester: "Học kỳ 1 / 2026",
    studentCount: 45,
    avgProgressPct: 81,
    chapters: [
      {
        id: "web-ch1",
        title: "Chương 1: Kiến trúc 3 Tầng FastAPI, JWT & RBAC Guard",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "web-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 140 },
            data: {
              title: "CS304: REST API & Security",
              summary: "FastAPI Layered Architecture + RBAC",
              tag: "CS304 · ROOT",
              nodeType: "root",
              masteryPct: 84,
              xp: 190,
            },
          },
          {
            id: "web-b1",
            type: "masterMindmapNode",
            position: { x: 350, y: 60 },
            data: {
              title: "1.1 Bearer JWT & Token Rotation",
              summary: "Access token 15m + Refresh token hash lưu DB.",
              tag: "Auth",
              nodeType: "branch",
              masteryPct: 87,
            },
          },
          {
            id: "web-b2",
            type: "masterMindmapNode",
            position: { x: 350, y: 210 },
            data: {
              title: "1.2 FastAPI Dependency RBAC",
              summary: "require_instructor & require_admin tách biệt 401 vs 403.",
              tag: "RBAC",
              nodeType: "branch",
              masteryPct: 79,
            },
          },
        ],
        mindmapEdges: [
          makeCleanEdge("web-e1", "web-root", "web-b1"),
          makeCleanEdge("web-e2", "web-root", "web-b2"),
        ],
        lessons: [
          {
            id: "web-ch1-l1",
            title: "1.1 Phân tách Controller - Service - Repository & RBAC",
            duration: "17 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS304_FastAPI_Layered_RBAC.md", size: "64 KB", uploadedAt: "11/11/2026" }],
            content: {
              reading:
                "Hệ thống API chuẩn doanh nghiệp không viết SQL trực tiếp trong hàm route mà tách qua Dependency Injection (`Depends(require_instructor)`), tầng Service xử lý nghiệp vụ và Repository truy vấn an toàn theo organization_id.\n\nQuy tắc mã lỗi HTTP:\n- Thiếu hoặc sai chữ ký token: `401 Unauthorized`.\n- Có token hợp lệ nhưng sai vai trò (học viên gọi endpoint giảng viên): `403 Forbidden`.",
              videoScenes: [
                {
                  id: "w1",
                  title: "Phân cảnh 1",
                  text: "Luồng kiểm tra Token qua Depends",
                  script: "Mỗi request đi vào router sẽ đi qua lớp middleware xác thực JWT trước khi chạm tới logic nghiệp vụ.",
                },
              ],
              quizzes: [
                {
                  id: "wq1",
                  question: "Khi một tài khoản student gửi JWT hợp lệ tới endpoint GET /v1/instructor/sessions, API cần trả về mã HTTP nào?",
                  options: ["403 Forbidden", "401 Unauthorized", "404 Not Found", "200 OK"],
                  answer: "403 Forbidden",
                },
              ],
            },
          },
        ],
        assignments: [
          {
            id: "web-ch1-lab",
            type: "github",
            title: "Xây dựng Middleware Phân quyền RBAC cho API Giảng viên",
            description: "Bảo vệ endpoint giám sát phiên học và đảm bảo cô lập dữ liệu theo organization_id.",
            isRequired: true,
            points: 110,
            repoTemplate: "https://github.com/codemind-campus/fastapi-rbac-starter",
            dockerImage: "codemind/python312-pytest:latest",
            testCases: [
              {
                id: "tc-web-1",
                title: "Student JWT gọi route Instructor bị chặn 403",
                input: "GET /v1/instructor/sessions (Bearer student_token)",
                expectedOutput: "HTTP 403 Forbidden",
                isEdgeCase: true,
                timeoutMs: 1000,
                memoryLimitMb: 128,
              },
              {
                id: "tc-web-2",
                title: "Instructor JWT chỉ thấy phiên có teacher_visibility=1",
                input: "GET /v1/instructor/sessions (Bearer instructor_token)",
                expectedOutput: "Filtered sessions count == 4",
                isEdgeCase: false,
                timeoutMs: 1000,
                memoryLimitMb: 128,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "class-fe",
    subjectId: "frontend",
    code: "CS210",
    name: "Lập trình Web Frontend Hiện đại (React 19 & TypeScript)",
    semester: "Học kỳ 1 / 2026",
    studentCount: 40,
    avgProgressPct: 79,
    chapters: [
      {
        id: "fe-ch1",
        title: "Chương 1: React 19 Concurrent Rendering & Design System",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "fe-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 120 },
            data: {
              title: "CS210: React 19 & Design OS",
              summary: "Kiến trúc State & Layout Micro-interaction",
              tag: "CS210 · ROOT",
              nodeType: "root",
              masteryPct: 82,
              xp: 180,
            },
          },
          {
            id: "fe-b1",
            type: "masterMindmapNode",
            position: { x: 340, y: 120 },
            data: {
              title: "1.1 Strict Mode & View Transitions",
              summary: "Quản lý ref animation an toàn không bị stale closure hay chặn pointer-events.",
              tag: "UI Engineering",
              nodeType: "branch",
              masteryPct: 77,
            },
          },
        ],
        mindmapEdges: [makeCleanEdge("fe-e1", "fe-root", "fe-b1")],
        lessons: [
          {
            id: "fe-ch1-l1",
            title: "1.1 Quản lý Layer Z-Index, Pointer Events & GSAP Context",
            duration: "14 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS210_GSAP_ViewTransition.pdf", size: "215 KB", uploadedAt: "12/11/2026" }],
            content: {
              reading:
                "Khi xây dựng màn hình chuyển cảnh bằng GSAP hoặc CSS Transitions, phần tử overlay sau khi giảm opacity về 0 vẫn mặc định bắt sự kiện chuột trừ khi gắn tường minh `pointer-events: none` hoặc `display: none`.",
              videoScenes: [],
              quizzes: [],
            },
          },
        ],
        assignments: [
          {
            id: "fe-ch1-lab",
            type: "code_lab",
            title: "Xây dựng Segmented Control với ResizeObserver chuẩn 60fps",
            description: "Đồng bộ indicator pill khi resize viewport và đổi tab tức thì không khựng.",
            isRequired: true,
            points: 100,
            dockerImage: "codemind/node20-playwright:latest",
            testCases: [
              {
                id: "tc-fe-1",
                title: "Button CTA nhận click khi overlay kết thúc animation",
                input: "Playwright elementFromPoint(ctaButton)",
                expectedOutput: "clickable == true",
                isEdgeCase: true,
                timeoutMs: 2000,
                memoryLimitMb: 256,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "class-ai",
    subjectId: "ai-agent",
    code: "CS420",
    name: "Phát triển AI-Native Web App, RAG & AI Agents",
    semester: "Học kỳ 1 / 2026",
    studentCount: 34,
    avgProgressPct: 61,
    chapters: [
      {
        id: "ai-ch1",
        title: "Chương 1: RAG Architecture, pgvector & Socratic Guardrails",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "ai-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 120 },
            data: {
              title: "CS420: RAG & Socratic Agent",
              summary: "Semantic Search + Guardrail Policy",
              tag: "CS420 · ROOT",
              nodeType: "root",
              masteryPct: 64,
              xp: 240,
            },
          },
          {
            id: "ai-b1",
            type: "masterMindmapNode",
            position: { x: 350, y: 120 },
            data: {
              title: "1.1 pgvector Cosine Threshold",
              summary: "Lọc chunk nhiễu bằng ngưỡng khoảng cách vector trước khi đưa vào prompt.",
              tag: "Vector DB",
              nodeType: "branch",
              masteryPct: 51,
            },
          },
        ],
        mindmapEdges: [makeCleanEdge("ai-e1", "ai-root", "ai-b1")],
        lessons: [
          {
            id: "ai-ch1-l1",
            title: "1.1 Thiết kế Hybrid Search & Chính sách không đưa code đáp án",
            duration: "19 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS420_RAG_Socratic_Guardrail.pdf", size: "380 KB", uploadedAt: "12/11/2026" }],
            content: {
              reading:
                "Hệ thống Gia sư AI Socratic bắt buộc kiểm tra ý định câu hỏi trước khi sinh phản hồi. Khi sinh viên xin code giải sẵn, Guardrail phải chuyển về chế độ `refuse_answer` và gợi mở câu hỏi tư duy thay vì lộ đáp án.",
              videoScenes: [],
              quizzes: [],
            },
          },
        ],
        assignments: [
          {
            id: "ai-ch1-lab",
            type: "code_lab",
            title: "Truy vấn Hybrid RAG với Cosine Similarity Guardrail",
            description: "Loại bỏ các đoạn văn bản có độ tương đồng < 0.72 trước khi tổng hợp câu trả lời.",
            isRequired: true,
            points: 150,
            dockerImage: "codemind/python312-rag:latest",
            testCases: [
              {
                id: "tc-ai-1",
                title: "Từ chối context nhiễu dưới ngưỡng similarity 0.72",
                input: "query='vtable', docs=[sim=0.91, sim=0.42]",
                expectedOutput: "selected_chunks == 1",
                isEdgeCase: true,
                timeoutMs: 2000,
                memoryLimitMb: 256,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "class-devops",
    subjectId: "devops",
    code: "CS405",
    name: "DevOps, Docker & CI/CD Pipeline Automation",
    semester: "Học kỳ 1 / 2026",
    studentCount: 36,
    avgProgressPct: 72,
    chapters: [
      {
        id: "devops-ch1",
        title: "Chương 1: Container Sandbox Cô lập & GitHub Actions",
        status: "Đã phát hành",
        mindmapGenerated: true,
        mindmapNodes: [
          {
            id: "dev-root",
            type: "masterMindmapNode",
            position: { x: 40, y: 120 },
            data: {
              title: "CS405: Docker & CI/CD",
              summary: "Isolated Runner & Seccomp Policy",
              tag: "CS405 · ROOT",
              nodeType: "root",
              masteryPct: 75,
              xp: 200,
            },
          },
          {
            id: "dev-b1",
            type: "masterMindmapNode",
            position: { x: 340, y: 120 },
            data: {
              title: "1.1 Non-root Container & --network=none",
              summary: "Giới hạn RAM/CPU và ngắt mạng khi chạy mã nguồn sinh viên nộp.",
              tag: "Security Sandbox",
              nodeType: "branch",
              masteryPct: 72,
            },
          },
        ],
        mindmapEdges: [makeCleanEdge("dev-e1", "dev-root", "dev-b1")],
        lessons: [
          {
            id: "devops-ch1-l1",
            title: "1.1 Multi-stage Build & Khóa Lockfile trong Pipeline",
            duration: "15 phút",
            status: "Đã phát hành",
            isGenerated: true,
            documents: [{ name: "CS405_Docker_CICD_Pipeline.md", size: "95 KB", uploadedAt: "14/11/2026" }],
            content: {
              reading:
                "Pipeline chấm bài và triển khai tự động cần đồng bộ lockfile (`pnpm-lock.yaml`) và thiết lập giới hạn bộ nhớ + seccomp profile để ngăn chặn mã độc khi biên dịch code không tin cậy.",
              videoScenes: [],
              quizzes: [],
            },
          },
        ],
        assignments: [
          {
            id: "devops-ch1-lab",
            type: "github",
            title: "Cấu hình Workflow Lint, TypeCheck & Build cho Monorepo",
            description: "Đảm bảo pipeline xanh trên push/PR và không bỏ sót lỗi lockfile.",
            isRequired: true,
            points: 100,
            dockerImage: "codemind/alpine-ci:3.19",
            testCases: [
              {
                id: "tc-dev-1",
                title: "Build artifact tạo dist/index.html không lỗi",
                input: "pnpm install && pnpm build",
                expectedOutput: "Exit code 0",
                isEdgeCase: false,
                timeoutMs: 3000,
                memoryLimitMb: 512,
              },
            ],
          },
        ],
      },
    ],
  },
];

export const INITIAL_DUAL_SUBMISSIONS: DualSubmissionRecord[] = [
  {
    id: "sub-oop-01",
    classId: "class-oop",
    studentName: "Nguyễn Minh Khôi",
    studentCode: "2210866",
    chapterTitle: "Chương 1: Đa hình & Kiến trúc vtable",
    repoUrl: "https://github.com/khoinm/cpp-oop-polymorphism",
    submittedAt: "Hôm nay, 09:42",
    passedTests: 5,
    totalTests: 5,
    execTimeMs: 38,
    memoryMb: 12.6,
    commitHash: "a4f91c2",
    commitCount: 1,
    similarityPct: 44,
    testDetails: [
      { id: "tc-1", title: "Tính lương Developer", status: "passed", durationMs: 6, isEdgeCase: false },
      { id: "tc-2", title: "Tính lương Manager", status: "passed", durationMs: 5, isEdgeCase: false },
      { id: "tc-3", title: "Đa hình mảng Employee*", status: "passed", durationMs: 8, isEdgeCase: false },
      { id: "tc-4", title: "Chống Object Slicing", status: "passed", durationMs: 7, isEdgeCase: true },
      { id: "tc-5", title: "Valgrind Virtual Destructor", status: "passed", durationMs: 12, isEdgeCase: true },
    ],
    defenseStatus: "flagged",
    defenseScore: 48,
    coherenceSummary: "Cảnh báo lệch điểm: Code CI/CD pass 5/5 (100%) nhưng chỉ 1 commit đơn lẻ và trả lời vấn đáp về vptr/vtable sai bản chất.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Trong hàm evaluatePayroll(Employee* emp), điều gì xảy ra ở tầng bộ nhớ runtime khi gọi emp->calculateSalary()?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Nguyễn Minh Khôi",
        text: "Dạ hệ thống sẽ chạy vòng lặp if else kiểm tra tên class rồi chọn hàm ạ.",
        evaluation: "Sai cơ chế Dynamic Dispatch (nhầm vtable lookup với rẽ nhánh if/else).",
      },
      {
        id: "t3",
        speaker: "ai_critic",
        speakerLabel: "Giám khảo Phản biện",
        text: "Nếu bỏ từ khóa virtual ở destructor ~Employee(), Valgrind có báo rò rỉ khi delete con trỏ Base* không? Tại sao?",
      },
      {
        id: "t4",
        speaker: "student",
        speakerLabel: "Nguyễn Minh Khôi",
        text: "Em nghĩ C++ tự giải phóng hết vùng nhớ lớp con vì mình đã dùng delete rồi ạ.",
        evaluation: "Chưa nắm vững static binding của destructor không phải virtual.",
      },
    ],
    status: "flagged",
    finalScore: null,
    instructorFeedback: "",
  },
  {
    id: "sub-oop-02",
    classId: "class-oop",
    studentName: "Nguyễn Văn A",
    studentCode: "2210842",
    chapterTitle: "Chương 1: Đa hình & Kiến trúc vtable",
    repoUrl: "https://github.com/nguyenvana/cpp-oop-vtable",
    submittedAt: "Hôm nay, 09:15",
    passedTests: 5,
    totalTests: 5,
    execTimeMs: 41,
    memoryMb: 14.1,
    commitHash: "7c31b8e",
    commitCount: 9,
    similarityPct: 6,
    testDetails: [
      { id: "tc-1", title: "Tính lương Developer", status: "passed", durationMs: 7, isEdgeCase: false },
      { id: "tc-2", title: "Tính lương Manager", status: "passed", durationMs: 6, isEdgeCase: false },
      { id: "tc-3", title: "Đa hình mảng Employee*", status: "passed", durationMs: 8, isEdgeCase: false },
      { id: "tc-4", title: "Chống Object Slicing", status: "passed", durationMs: 8, isEdgeCase: true },
      { id: "tc-5", title: "Valgrind Virtual Destructor", status: "passed", durationMs: 12, isEdgeCase: true },
    ],
    defenseStatus: "completed",
    defenseScore: 91,
    coherenceSummary: "Lịch sử 9 commits tự nhiên. Giải thích chính xác vptr (8 byte đầu object) và lý do chọn Employee* tránh Object Slicing.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Tại sao bạn truyền Employee* vào evaluatePayroll thay vì truyền tham trị Employee?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Nguyễn Văn A",
        text: "Vì truyền tham trị sẽ gây Object Slicing, cắt mất phần thuộc tính mở rộng của Developer/Manager và ép vptr trỏ về vtable của Employee.",
        evaluation: "Xuất sắc — diễn giải chính xác cơ chế vptr và object layout.",
      },
      {
        id: "t3",
        speaker: "ai_critic",
        speakerLabel: "Giám khảo Phản biện",
        text: "Virtual destructor đảm bảo điều gì khi giải phóng mảng đa hình?",
      },
      {
        id: "t4",
        speaker: "student",
        speakerLabel: "Nguyễn Văn A",
        text: "Nó giúp tra vtable để gọi ~Developer() hoặc ~Manager() trước rồi mới gọi ngược lên ~Employee(), đảm bảo 0 byte leak.",
        evaluation: "Chuẩn xác 100%.",
      },
    ],
    status: "pending",
    finalScore: null,
    instructorFeedback: "",
  },
  {
    id: "sub-oop-03",
    classId: "class-oop",
    studentName: "Võ Ngọc Hà",
    studentCode: "2210851",
    chapterTitle: "Chương 1: Đa hình & Kiến trúc vtable",
    repoUrl: "https://github.com/havn/oop-inheritance-lab",
    submittedAt: "Hôm qua, 21:18",
    passedTests: 3,
    totalTests: 5,
    execTimeMs: 49,
    memoryMb: 15.8,
    commitHash: "2b98d14",
    commitCount: 5,
    similarityPct: 9,
    testDetails: [
      { id: "tc-1", title: "Tính lương Developer", status: "passed", durationMs: 8, isEdgeCase: false },
      { id: "tc-2", title: "Tính lương Manager", status: "passed", durationMs: 7, isEdgeCase: false },
      { id: "tc-3", title: "Đa hình mảng Employee*", status: "passed", durationMs: 11, isEdgeCase: false },
      { id: "tc-4", title: "Chống Object Slicing", status: "failed", durationMs: 9, isEdgeCase: true, note: "Tham số hàm vẫn nhận Employee theo giá trị" },
      { id: "tc-5", title: "Valgrind Virtual Destructor", status: "failed", durationMs: 14, isEdgeCase: true, note: "Thiếu virtual ở ~Employee() -> leaked 48 bytes" },
    ],
    defenseStatus: "completed",
    defenseScore: 76,
    coherenceSummary: "Hiểu lý thuyết kế thừa cơ bản nhưng còn nhầm tham số con trỏ khi truyền vào hàm đánh giá.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Test số 4 báo lỗi Object Slicing ở hàm evaluatePayroll, bạn nhận ra nguyên nhân từ chữ ký hàm chưa?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Võ Ngọc Hà",
        text: "Em đang để tham số là Employee emp nên khi truyền Manager vào nó bị ép kiểu mất biến bonus ạ, em sẽ sửa sang Employee* emp.",
        evaluation: "Tự nhận diện đúng lỗi sau khi vấn đáp.",
      },
    ],
    status: "pending",
    finalScore: null,
    instructorFeedback: "",
  },
  {
    id: "sub-oop-04",
    classId: "class-oop",
    studentName: "Nguyễn Bá Hòa",
    studentCode: "2210801",
    chapterTitle: "Chương 1: Đa hình & Kiến trúc vtable",
    repoUrl: "https://github.com/hoabn/cpp20-vtable-clean",
    submittedAt: "Hôm qua, 16:05",
    passedTests: 5,
    totalTests: 5,
    execTimeMs: 31,
    memoryMb: 11.4,
    commitHash: "91e04c7",
    commitCount: 12,
    similarityPct: 4,
    testDetails: [
      { id: "tc-1", title: "Tính lương Developer", status: "passed", durationMs: 5, isEdgeCase: false },
      { id: "tc-2", title: "Tính lương Manager", status: "passed", durationMs: 5, isEdgeCase: false },
      { id: "tc-3", title: "Đa hình mảng Employee*", status: "passed", durationMs: 7, isEdgeCase: false },
      { id: "tc-4", title: "Chống Object Slicing", status: "passed", durationMs: 6, isEdgeCase: true },
      { id: "tc-5", title: "Valgrind Virtual Destructor", status: "passed", durationMs: 8, isEdgeCase: true },
    ],
    defenseStatus: "completed",
    defenseScore: 96,
    coherenceSummary: "Hoàn hảo: 12 commits nhỏ gọn, code đạt chuẩn C++20 và bảo vệ xuất sắc câu hỏi về memory alignment.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Khi thêm hàm virtual đầu tiên vào Employee, sizeof(Employee) thay đổi như thế nào trên kiến trúc 64-bit?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Nguyễn Bá Hòa",
        text: "Kích thước tăng thêm đúng 8 bytes cho con trỏ vptr (kèm padding alignment nếu cần) để trỏ tới vtable của lớp.",
        evaluation: "Câu trả lời cấp độ Senior Systems.",
      },
    ],
    status: "graded",
    finalScore: 98,
    instructorFeedback: "Bài làm rất sạch, tư duy vtable và RAII vững vàng.",
  },
  {
    id: "sub-dsa-01",
    classId: "class-dsa",
    studentName: "Võ Nhật Huy",
    studentCode: "2210815",
    chapterTitle: "Chương 1: Đồ thị & Dijkstra",
    repoUrl: "https://github.com/huyvn/dijkstra-100k-nodes",
    submittedAt: "Hôm nay, 10:15",
    passedTests: 4,
    totalTests: 5,
    execTimeMs: 492,
    memoryMb: 98.2,
    commitHash: "4e19f0a",
    commitCount: 7,
    similarityPct: 8,
    testDetails: [
      { id: "tc-dsa-1", title: "Đồ thị nhỏ có cạnh song song", status: "passed", durationMs: 4, isEdgeCase: false },
      { id: "tc-dsa-2", title: "Đồ thị không liên thông", status: "passed", durationMs: 5, isEdgeCase: true },
      { id: "tc-dsa-3", title: "Stress Test 100k đỉnh", status: "failed", durationMs: 483, isEdgeCase: true, note: "Sát ngưỡng timeout do thiếu lazy deletion d > dist[u]" },
    ],
    defenseStatus: "completed",
    defenseScore: 84,
    coherenceSummary: "Nắm rõ nguyên lý tham lam của Dijkstra nhưng cần bổ sung guard clause cắt nhánh trong priority queue.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_critic",
        speakerLabel: "Giám khảo Phản biện",
        text: "Tại sao vòng lặp while(!pq.empty()) vẫn bị TLE ở đồ thị dày 200k cạnh?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Võ Nhật Huy",
        text: "Do cùng một đỉnh u có thể bị push vào heap nhiều lần với khoảng cách cũ lớn hơn, thiếu lệnh if(d > dist[u]) continue ạ.",
        evaluation: "Phát hiện đúng điểm nghẽn thuật toán.",
      },
    ],
    status: "pending",
    finalScore: null,
    instructorFeedback: "",
  },
  {
    id: "sub-web-01",
    classId: "class-web",
    studentName: "Phan Đình Nghị",
    studentCode: "2210829",
    chapterTitle: "Chương 1: FastAPI JWT & RBAC",
    repoUrl: "https://github.com/nghipd/fastapi-rbac-security",
    submittedAt: "Hôm nay, 08:50",
    passedTests: 5,
    totalTests: 5,
    execTimeMs: 64,
    memoryMb: 28.4,
    commitHash: "c52e901",
    commitCount: 8,
    similarityPct: 5,
    testDetails: [
      { id: "tc-web-1", title: "Chặn HTTP 403 khi sai vai trò", status: "passed", durationMs: 31, isEdgeCase: true },
      { id: "tc-web-2", title: "Cô lập dữ liệu theo organization_id", status: "passed", durationMs: 33, isEdgeCase: false },
    ],
    defenseStatus: "completed",
    defenseScore: 93,
    coherenceSummary: "Kiến trúc 3 tầng chuẩn mực, tách bạch authentication (401) và authorization (403).",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Làm sao ngăn sinh viên dùng JWT hợp lệ của chính mình để đọc phiên chấm bài của giảng viên?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Phan Đình Nghị",
        text: "Sử dụng FastAPI dependency require_instructor kiểm tra claim role trong payload đã ký HMAC và lọc query theo organization_id của user.",
        evaluation: "Giải thích mạch lạc, đúng code thực tế.",
      },
    ],
    status: "pending",
    finalScore: null,
    instructorFeedback: "",
  },
  {
    id: "sub-ai-01",
    classId: "class-ai",
    studentName: "Trần Minh Tuấn",
    studentCode: "2210877",
    chapterTitle: "Chương 1: RAG Architecture & pgvector",
    repoUrl: "https://github.com/tuantm/rag-pgvector-socratic",
    submittedAt: "Hôm nay, 10:05",
    passedTests: 5,
    totalTests: 5,
    execTimeMs: 112,
    memoryMb: 42.0,
    commitHash: "8f71a20",
    commitCount: 6,
    similarityPct: 7,
    testDetails: [
      { id: "tc-ai-1", title: "Lọc ngưỡng similarity >= 0.72", status: "passed", durationMs: 112, isEdgeCase: true },
    ],
    defenseStatus: "pending",
    defenseScore: 72,
    coherenceSummary: "Code đạt test case lọc cosine similarity; đang chờ hoàn tất vòng phản biện sâu về chunk overlap.",
    transcript: [
      {
        id: "t1",
        speaker: "ai_chair",
        speakerLabel: "Chủ tịch Hội đồng AI",
        text: "Nếu chunk size quá lớn (2000 tokens) thì ảnh hưởng gì đến độ chính xác truy xuất?",
      },
      {
        id: "t2",
        speaker: "student",
        speakerLabel: "Trần Minh Tuấn",
        text: "Vector embedding bị pha loãng ngữ nghĩa, làm cosine similarity giảm và tăng độ trễ LLM.",
        evaluation: "Đạt yêu cầu cốt lõi.",
      },
    ],
    status: "pending",
    finalScore: null,
    instructorFeedback: "",
  },
];

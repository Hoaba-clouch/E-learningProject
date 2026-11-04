import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  GitPullRequest,
  GitCommit,
  FileText,
  Link2,
  ExternalLink,
  RefreshCw,
  Send,
  ShieldCheck,
  Terminal,
  Award,
  Sparkles,
  BookOpen,
  Check,
  X,
  ArrowRight,
  Code2,
  AlertTriangle,
  Play,
  FileCheck,
  CheckSquare,
  Globe,
  Share2,
  Copy,
  ChevronDown
} from "lucide-react";

// --- TYPES ---
export type AssignmentType = "github_pr" | "diagram" | "docs" | "codelab";
export type SubmissionStatus = "not_submitted" | "pending_review" | "needs_revision" | "approved";

export interface Assignment {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  type: AssignmentType;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  points: number;
  dueDate: string;
  projectDay: number;
  instructor: string;
  description: string;
  constraints: string[];
  dodList: string[];
  rubric: {
    criteria: string;
    weight: number;
    description: string;
  }[];
  // Specific for CodeLab assignments
  codeLabConfig?: {
    language: "cpp" | "python";
    initialCode: string;
    testCases: {
      id: number;
      name: string;
      isEdgeCase: boolean;
      input: string;
      expectedOutput: string;
    }[];
    socraticHints: {
      level: number;
      title: string;
      content: string;
      isUnlocked: boolean;
    }[];
  };
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  studentName: string;
  submittedAt: string;
  submissionType: "link" | "file" | "sandbox";
  linkUrl: string;
  linkCategory: "github_pr" | "github_commit" | "docs" | "figma_diagram" | "other";
  prNumber?: string;
  repoName?: string;
  notes: string;
  dodChecked: boolean[];
  status: SubmissionStatus;
  sha256Hash?: string;
  reviewFeedback?: string;
  testCasesPassed?: number;
}

interface LearningWorkspaceProps {
  mentorMascot?: string;
  chatSkin?: string;
}

// Mock Assignments across SE Curriculum (Coding, PTTKHT, Scrum)
const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "assign-1",
    courseCode: "SE-301",
    courseName: "Lập trình C++ Nâng cao & Cấu trúc Dữ liệu",
    title: "Triển khai Hàng đợi 2 đầu Deque tối ưu bộ nhớ O(1)",
    type: "codelab",
    difficulty: "Trung bình",
    points: 5,
    dueDate: "Ngày 14 (15/11)",
    projectDay: 13,
    instructor: "Thầy Nguyễn Phước",
    description:
      "Hiện thực cấu trúc dữ liệu Double-ended Queue (Deque) với các thao tác push_front, push_back, pop_front, pop_back đạt độ phức tạp thời gian O(1) và giới hạn bộ nhớ 128MB. Code phải vượt qua 5 edge test cases trong Docker Sandbox độc lập.",
    constraints: [
      "Độ phức tạp thời gian: O(1) cho mọi thao tác push/pop",
      "Giới hạn thời gian thực thi: 1.0 giây (TLE: 2.0s)",
      "Giới hạn bộ nhớ RAM: Tối đa 128MB (MLE)",
      "Không được sử dụng thư viện std::deque có sẵn của C++",
    ],
    dodList: [
      "Vượt qua 100% 5 Edge Test Cases trong môi trường Docker Sandbox cô lập",
      "Không rò rỉ bộ nhớ (Memory Leak), giải phóng con trỏ đầy đủ trong Destructor",
      "Mã nguồn tuân thủ Clean Code, không có lỗi warning của g++ -Wall -Wextra",
      "Nhận chứng nhận tự sửa lỗi SHA-256 xác thực liêm chính học thuật",
    ],
    rubric: [
      { criteria: "Độ chính xác thuật toán", weight: 40, description: "Vượt qua 5/5 ca kiểm thử chuẩn và ca biên" },
      { criteria: "Hiệu năng & Tối ưu RAM", weight: 30, description: "Bộ nhớ dưới 128MB, thời gian dưới 50ms" },
      { criteria: "Tổ chức Code & OOP", weight: 20, description: "Cấu trúc Class rõ ràng, giải phóng bộ nhớ đúng cách" },
      { criteria: "Liêm chính học thuật", weight: 10, description: "Tự sửa lỗi, có mã băm SHA-256" },
    ],
    codeLabConfig: {
      language: "cpp",
      initialCode: `// Trien khai Deque bang Circular Dynamic Array
#include <iostream>
#include <stdexcept>

template <typename T>
class MyDeque {
private:
    T* arr;
    int capacity;
    int front;
    int rear;
    int size;

    void resize(int newCapacity) {
        T* newArr = new T[newCapacity];
        for (int i = 0; i < size; i++) {
            newArr[i] = arr[(front + i) % capacity];
        }
        delete[] arr;
        arr = newArr;
        front = 0;
        rear = size;
        capacity = newCapacity;
    }

public:
    MyDeque(int initCapacity = 8) : capacity(initCapacity), front(0), rear(0), size(0) {
        arr = new T[capacity];
    }

    ~MyDeque() {
        delete[] arr;
    }

    void push_back(const T& val) {
        if (size == capacity) resize(capacity * 2);
        arr[rear] = val;
        rear = (rear + 1) % capacity;
        size++;
    }

    void push_front(const T& val) {
        if (size == capacity) resize(capacity * 2);
        front = (front - 1 + capacity) % capacity;
        arr[front] = val;
        size++;
    }

    T pop_front() {
        if (size == 0) throw std::underflow_error("Deque is empty");
        T val = arr[front];
        front = (front + 1) % capacity;
        size--;
        return val;
    }

    T pop_back() {
        if (size == 0) throw std::underflow_error("Deque is empty");
        rear = (rear - 1 + capacity) % capacity;
        size--;
        return arr[rear];
    }

    int get_size() const { return size; }
    bool is_empty() const { return size == 0; }
};

int main() {
    MyDeque<int> dq;
    dq.push_back(10);
    dq.push_front(20);
    dq.push_back(30);
    std::cout << dq.pop_front() << " " << dq.pop_back() << " " << dq.pop_front() << std::endl;
    return 0;
}`,
      testCases: [
        { id: 1, name: "Test 1: Standard Push & Pop", isEdgeCase: false, input: "PushBack(10), PushFront(20), PopFront()", expectedOutput: "20" },
        { id: 2, name: "Test 2: Edge Empty Deque", isEdgeCase: true, input: "PopFront() khi size=0", expectedOutput: "underflow_error" },
        { id: 3, name: "Test 3: Wrap-Around Ring Buffer", isEdgeCase: true, input: "PushFront x 1000 qua chi so 0", expectedOutput: "Correct Order" },
        { id: 4, name: "Test 4: Large Volume N = 10^5", isEdgeCase: true, input: "100,000 operations", expectedOutput: "Pass O(1) under 150ms" },
        { id: 5, name: "Test 5: Memory Leak & Destructor", isEdgeCase: true, input: "Alloc & Dealloc 10,000 nodes", expectedOutput: "0 bytes leaked" },
      ],
      socraticHints: [
        { level: 1, title: "Định hướng Cấu trúc Vòng (Circular Buffer)", content: "Hãy chú ý đến công thức tính chỉ số khi `push_front`: khi `front = 0`, phép toán `(front - 1 + capacity) % capacity` sẽ đưa con trỏ về cuối mảng mà không gây tràn chỉ số âm.", isUnlocked: true },
        { level: 2, title: "Phân tích Ca biên Resize Bộ nhớ", content: "Khi mảng bị đầy (`size == capacity`), việc sao chép sang mảng mới phải duỗi thẳng các phần tử từ `front` đến `rear` theo đúng thứ tự FIFO logic trước khi gán lại `front = 0`.", isUnlocked: false },
        { level: 3, title: "Mã giả Quản lý Con trỏ Hủy bộ nhớ", content: "Trong Destructor, đảm bảo `delete[] arr` luôn được thực thi kể cả khi chương trình ném Exception, tránh hoàn toàn lỗi Memory Leak trong Docker sandbox.", isUnlocked: false },
      ],
    },
  },
  {
    id: "assign-2",
    courseCode: "SE-302",
    courseName: "Phân tích & Thiết kế Hệ thống (PTTKHT)",
    title: "Thiết kế Sơ đồ Quan hệ Thực thể ERD Chuẩn hóa 3NF",
    type: "diagram",
    difficulty: "Khó",
    points: 7.5,
    dueDate: "Ngày 3 (28/10)",
    projectDay: 3,
    instructor: "Thầy Nguyễn Phước",
    description:
      "Vẽ sơ đồ ERD hoàn chỉnh tối thiểu 8 bảng nghiệp vụ cho hệ thống E-Learning CodeMind Campus. Toàn bộ bảng phải đạt chuẩn hóa 3NF (loại bỏ phụ thuộc một phần và phụ thuộc bắc cầu). Bắt buộc 100% cột timestamp sử dụng chuẩn ISO-8601 UTC (H4). Nộp link Draw.io/Figma hoặc link file thiết kế trên GitHub repository.",
    constraints: [
      "Chuẩn hóa 3NF: 1NF nguyên tử, 2NF khóa chính toàn phần, 3NF không bắc cầu",
      "Ràng buộc cứng H4: Toàn bộ timestamp quy chuẩn ISO-8601 UTC kết thúc bằng Z",
      "Bắt buộc thể hiện rõ Khóa chính (PK), Khóa ngoại (FK) và quan hệ 1-N, N-N",
      "Nộp link Draw.io, Figma hoặc file ảnh trong repo GitHub",
    ],
    dodList: [
      "Đầy đủ 8 thực thể: Users, Roles, Courses, Lessons, Submissions, TestCases, KanbanTasks, AuditLogs",
      "Không có quan hệ N-N trực tiếp (đã phân rã bằng bảng trung gian Enrollment, MemberContribution)",
      "Quy chuẩn đặt tên bảng snake_case số nhiều, trường id chuẩn UUID/Integer",
      "Được ít nhất 1 thành viên trong nhóm review xác nhận trước khi nộp",
    ],
    rubric: [
      { criteria: "Chuẩn hóa CSDL 3NF", weight: 40, description: "Không trùng lặp dữ liệu, không có phụ thuộc bắc cầu" },
      { criteria: "Tuân thủ Ràng buộc H4 UTC", weight: 30, description: "Tất cả trường created_at, updated_at đều lưu UTC ISO-8601" },
      { criteria: "Đầy đủ quan hệ PK/FK", weight: 20, description: "Ràng buộc toàn vẹn tham chiếu chính xác" },
      { criteria: "Trình bày trực quan", weight: 10, description: "Sơ đồ vẽ trên Draw.io/Figma rõ ràng, có chú giải" },
    ],
  },
  {
    id: "assign-3",
    courseCode: "SE-302",
    courseName: "Phân tích & Thiết kế Hệ thống (PTTKHT)",
    title: "Thiết kế Biểu đồ Lớp Class Diagram (4 Biểu đồ UML Cốt lõi)",
    type: "github_pr",
    difficulty: "Khó",
    points: 8,
    dueDate: "Ngày 6 (31/10)",
    projectDay: 6,
    instructor: "Thầy Nguyễn Phước",
    description:
      "Thiết kế Sơ đồ Lớp (Class Diagram - Session 07) thể hiện cấu trúc OOP hoàn chỉnh: các thuộc tính, phương thức, Access Modifiers (+ public, - private, # protected) và các mối quan hệ (Thừa kế Generalization, Kết tập Aggregation, Hợp thành Composition). Sinh viên lưu file sơ đồ vào thư mục `docs/uml/` trong repo và nộp link GitHub Pull Request.",
    constraints: [
      "Mô hình hóa ít nhất 10 classes nghiệp vụ đại diện cho 3 tầng Clean Architecture",
      "Thể hiện rõ quan hệ Interface Implementation và Dependency Injection",
      "Lưu tài liệu trong repo Git và nộp bằng link Pull Request chính thức",
    ],
    dodList: [
      "Có đầy đủ 4 biểu đồ: Use Case, Activity, Class, Sequence",
      "Pull Request có commit message chuẩn Conventional Commits (docs(uml): ...)",
      "Mô tả PR giải thích rõ quyết định thiết kế kiến trúc",
    ],
    rubric: [
      { criteria: "Chuẩn cú pháp UML 2.5", weight: 40, description: "Ký hiệu quan hệ, mũi tên và access modifier chuẩn" },
      { criteria: "Tính khả thi triển khai", weight: 30, description: "Ánh xạ trực tiếp thành code Python/FastAPI và React" },
      { criteria: "Quy trình Git PR", weight: 20, description: "Tạo PR đúng nhánh, có review của thành viên nhóm" },
      { criteria: "Tài liệu giải trình", weight: 10, description: "Có file Markdown thuyết minh trong thư mục docs" },
    ],
  },
  {
    id: "assign-4",
    courseCode: "SE-303",
    courseName: "Quản trị Dự án Phần mềm & Agile Scrum",
    title: "Lập Tài liệu Đặc tả Yêu cầu SRS & User Stories chuẩn INVEST",
    type: "docs",
    difficulty: "Trung bình",
    points: 5,
    dueDate: "Ngày 2 (27/10)",
    projectDay: 2,
    instructor: "Thầy Nguyễn Phước",
    description:
      "Soạn thảo tài liệu SRS (Software Requirements Specification) theo cấu trúc chuẩn IEEE-830 và danh sách 15 User Stories phân loại theo phương pháp MoSCoW (Must, Should, Could, Won't). Mỗi User Story phải có Acceptance Criteria dạng Given-When-Then. Nộp link Google Docs hoặc link file Markdown trên GitHub repository.",
    constraints: [
      "User Story chuẩn format: Là [Vai trò], tôi muốn [Hành động], để [Lợi ích]",
      "Tiêu chuẩn INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable",
      "Phân định rõ Ràng buộc Cứng H1-H4 trong tài liệu đặc tả",
    ],
    dodList: [
      "Đầy đủ 15 User Stories phủ khắp 3 phân hệ cốt lõi",
      "Bảng phân loại MoSCoW rõ ràng, có ước lượng Story Points (Fibonacci)",
      "Tài liệu định dạng sạch sẽ, mục lục tự động, lưu trữ trên Git hoặc Google Docs",
    ],
    rubric: [
      { criteria: "Chất lượng User Stories", weight: 40, description: "Tuân thủ tiêu chuẩn INVEST và tiêu chí Given-When-Then" },
      { criteria: "Cấu trúc SRS IEEE-830", weight: 30, description: "Đầy đủ phạm vi, tác tử, yêu cầu chức năng và phi chức năng" },
      { criteria: "Phân loại MoSCoW", weight: 20, description: "Ưu tiên hợp lý cho Sprint 1 và Sprint 2" },
      { criteria: "Hình thức nộp", weight: 10, description: "Link truy cập công khai, quyền comment cho Giảng viên" },
    ],
  },
  {
    id: "assign-5",
    courseCode: "SE-301",
    courseName: "Lập trình C++ Nâng cao & Cấu trúc Dữ liệu",
    title: "Backend: Xây dựng Router Đánh giá Docker Sandbox & Token JWT",
    type: "github_pr",
    difficulty: "Khó",
    points: 8,
    dueDate: "Ngày 10 (04/11)",
    projectDay: 10,
    instructor: "Thầy Nguyễn Phước",
    description:
      "Hiện thực module backend FastAPI: Router thực thi mã nguồn an toàn trong container Docker cô lập (chống infinite loop và fork bomb với cgroups). Tích hợp xác thực JWT Token với múi giờ UTC ISO-8601 (H4). Nộp link Pull Request trên GitHub repo kèm kết quả chạy Unit Test.",
    constraints: [
      "Container không cấp quyền root, vô hiệu hóa kết nối mạng bên ngoài",
      "Giới hạn cgroups: CPU 0.5 core, RAM 128MB, watchdog timeout 2.0s",
      "API trả về mã chuẩn ISO-8601 UTC và mã băm SHA-256",
    ],
    dodList: [
      "Độ bao phủ Unit Test (pytest) đạt trên 80%",
      "Không có lỗi Linting Flake8, Black và MyPy",
      "Pull Request đã được merge vào nhánh develop sau khi review",
    ],
    rubric: [
      { criteria: "Bảo mật & Cô lập Sandbox", weight: 40, description: "Chặn thành công các ca bypass hệ thống và crash máy chủ" },
      { criteria: "Chuẩn kiến trúc 3 tầng", weight: 30, description: "Router -> Service -> Data Layer tách bạch" },
      { criteria: "Chất lượng Unit Tests", weight: 20, description: "Test coverage > 80% với các ca biên đa dạng" },
      { criteria: "Quy chuẩn Git Flow", weight: 10, description: "PR có commit rõ ràng, giải thích cách giải quyết" },
    ],
  },
];

export default function LearningWorkspace({ mentorMascot, chatSkin }: LearningWorkspaceProps) {
  // Current active assignment
  const [selectedAssignId, setSelectedAssignId] = useState<string>("assign-1");
  const assignment = useMemo(() => {
    return INITIAL_ASSIGNMENTS.find((a) => a.id === selectedAssignId) || INITIAL_ASSIGNMENTS[0];
  }, [selectedAssignId]);

  // Mode: "portal" (GitHub PR / Link / Docs) or "codelab" (Interactive Sandbox Runner)
  const [workspaceMode, setWorkspaceMode] = useState<"portal" | "codelab">(
    assignment.type === "codelab" ? "codelab" : "portal"
  );

  // Sync mode when switching assignment
  useEffect(() => {
    if (assignment.type === "codelab") {
      setWorkspaceMode("codelab");
    } else {
      setWorkspaceMode("portal");
    }
  }, [assignment.id, assignment.type]);

  // --- SUBMISSION STATE (PORTAL MODE) ---
  const [submissionUrl, setSubmissionUrl] = useState<string>("");
  const [submissionNotes, setSubmissionNotes] = useState<string>("");
  const [dodChecks, setDodChecks] = useState<boolean[]>([false, false, false, false]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<StudentSubmission | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-detect URL Category
  const urlCategoryInfo = useMemo(() => {
    const url = submissionUrl.trim().toLowerCase();
    if (!url) return null;

    if (url.includes("github.com") && url.includes("/pull/")) {
      const match = submissionUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i);
      return {
        type: "github_pr" as const,
        label: match ? `GitHub PR #${match[2]}` : "GitHub Pull Request",
        repo: match ? match[1] : undefined,
        prNum: match ? match[2] : undefined,
        icon: <GitPullRequest size={15} className="text-purple-600" />,
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      };
    }
    if (url.includes("github.com") && url.includes("/commit/")) {
      return {
        type: "github_commit" as const,
        label: "GitHub Commit",
        icon: <GitCommit size={15} className="text-blue-600" />,
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    if (url.includes("figma.com")) {
      return {
        type: "figma_diagram" as const,
        label: "Figma Design & Diagram",
        icon: <Share2 size={15} className="text-rose-600" />,
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
    if (url.includes("draw.io") || url.includes("diagrams.net")) {
      return {
        type: "figma_diagram" as const,
        label: "Draw.io Architecture Diagram",
        icon: <Share2 size={15} className="text-amber-600" />,
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    if (url.includes("docs.google.com") || url.includes("/docs/") || url.endsWith(".md")) {
      return {
        type: "docs" as const,
        label: "Tài liệu Kỹ thuật / Docs",
        icon: <FileText size={15} className="text-emerald-600" />,
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    return {
      type: "other" as const,
      label: "Liên kết Báo cáo Ngoài",
      icon: <Globe size={15} className="text-slate-600" />,
      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }, [submissionUrl]);

  // Handle Portal Submit
  const handlePortalSubmit = () => {
    if (!submissionUrl.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedSha = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      const submission: StudentSubmission = {
        id: `sub-${Date.now()}`,
        assignmentId: assignment.id,
        studentName: "Minh Anh (Team Lead & Arch)",
        submittedAt: new Date().toISOString(),
        submissionType: "link",
        linkUrl: submissionUrl.trim(),
        linkCategory: urlCategoryInfo?.type || "other",
        prNumber: urlCategoryInfo?.prNum,
        repoName: urlCategoryInfo?.repo,
        notes: submissionNotes,
        dodChecked: dodChecks,
        status: "pending_review",
        sha256Hash: generatedSha,
      };

      setSubmittedData(submission);
      setIsSubmitting(false);
      showToast("Đã nộp bài thành công! Bằng chứng nộp đã được đồng bộ sang Bảng Kanban.");
    }, 600);
  };

  // --- CODELAB SANDBOX STATE ---
  const [sourceCode, setSourceCode] = useState<string>(
    assignment.codeLabConfig?.initialCode || ""
  );
  const [selectedLanguage, setSelectedLanguage] = useState<"cpp" | "python">(
    assignment.codeLabConfig?.language || "cpp"
  );
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);
  const [activeCodeLabTab, setActiveCodeLabTab] = useState<"tests" | "hints" | "console">("tests");
  const [unlockedHints, setUnlockedHints] = useState<number[]>([1]);
  const [sandboxResults, setSandboxResults] = useState<{
    status: "idle" | "passed" | "failed";
    passedCount: number;
    totalCount: number;
    executionTimeMs: number;
    memoryMb: number;
    containerId: string;
    sha256: string;
    timestamp: string;
    stdout: string;
    testCases: {
      id: number;
      name: string;
      isEdgeCase: boolean;
      status: "passed" | "failed";
      durationMs: number;
      input: string;
      expected: string;
      actual: string;
    }[];
  } | null>(null);

  // Sync code when switching assignment
  useEffect(() => {
    if (assignment.codeLabConfig) {
      setSourceCode(assignment.codeLabConfig.initialCode);
      setSelectedLanguage(assignment.codeLabConfig.language);
      setSandboxResults(null);
    }
  }, [assignment]);

  // Execute Code in Docker Sandbox (Simulation)
  const handleRunSandbox = (isFinalSubmission = false) => {
    setIsRunningSandbox(true);
    setTimeout(() => {
      const config = assignment.codeLabConfig;
      if (!config) {
        setIsRunningSandbox(false);
        return;
      }

      const generatedSha = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      // All 5 test cases pass
      const testResults = config.testCases.map((tc, idx) => ({
        id: tc.id,
        name: tc.name,
        isEdgeCase: tc.isEdgeCase,
        status: "passed" as const,
        durationMs: 8 + idx * 4,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: tc.expectedOutput,
      }));

      setSandboxResults({
        status: "passed",
        passedCount: 5,
        totalCount: 5,
        executionTimeMs: 42,
        memoryMb: 14.8,
        containerId: "docker-sbx-a9f2c1",
        sha256: generatedSha,
        timestamp: new Date().toISOString(),
        stdout: `Compiling ${selectedLanguage === "cpp" ? "g++ -O2 solution.cpp -o solution" : "python3 solution.py"}...\nCompilation OK. Running 5 isolated edge test cases...\nTest 1 (Standard): PASS (8ms)\nTest 2 (Empty Deque underflow): PASS (12ms)\nTest 3 (Ring Buffer wrap): PASS (16ms)\nTest 4 (N=10^5 O(1) Stress): PASS (28ms)\nTest 5 (Memory Leak 0 bytes): PASS (36ms)\n\nAll 5/5 Edge Test Cases Passed. Memory consumed: 14.8MB / 128MB.`,
        testCases: testResults,
      });

      setIsRunningSandbox(false);
      setActiveCodeLabTab("tests");
      showToast(
        isFinalSubmission
          ? "Đã nộp bài thẩm định Sandbox thành công! Cấp chứng chỉ SHA-256."
          : "Đã vượt qua 5/5 Edge Test Cases trong Docker Sandbox!"
      );
    }, 750);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] w-full flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* ── TOP CONTEXT & ASSIGNMENT SELECTOR BAR ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <BookOpen size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {assignment.courseCode} • {assignment.courseName}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {assignment.difficulty}
              </span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                {assignment.points} Story Points
              </span>
            </div>

            {/* Assignment Switcher Dropdown */}
            <div className="relative mt-0.5 flex items-center gap-1.5">
              <select
                value={selectedAssignId}
                onChange={(e) => setSelectedAssignId(e.target.value)}
                className="cursor-pointer font-bold text-sm text-slate-900 hover:text-blue-600 bg-transparent focus:outline-hidden pr-6"
              >
                {INITIAL_ASSIGNMENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id.replace("assign-", "HW-0")}: {a.title} ({a.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Workspace Mode Switcher (Portal vs CodeLab) */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setWorkspaceMode("portal")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                workspaceMode === "portal"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitPullRequest size={13} className="text-purple-600" />
              <span>Cổng Nộp Link GitHub / Docs</span>
            </button>
            <button
              onClick={() => setWorkspaceMode("codelab")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                workspaceMode === "codelab"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 size={13} className="text-blue-600" />
              <span>Code Lab Sandbox</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 border-l border-slate-200 pl-3">
            <Clock size={13} />
            <span>Hạn nộp: <strong className="text-slate-700">{assignment.dueDate}</strong></span>
          </div>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── MAIN 2-PANE WORKSPACE BODY ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANE: PROBLEM STATEMENT & EVALUATION RUBRIC (35% WIDTH) ── */}
        <div className="w-full md:w-[38%] lg:w-[34%] flex flex-col border-r border-slate-200 bg-white overflow-y-auto">
          {/* Header Summary */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Giảng viên: <strong className="text-slate-800">{assignment.instructor}</strong></span>
              <span className="font-mono text-[11px] text-blue-600 font-semibold">Ngày dự án: N{assignment.projectDay}</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-snug">
              {assignment.title}
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {assignment.description}
            </p>
          </div>

          {/* Section: Constraints & DoD */}
          <div className="p-5 border-b border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Ràng buộc Kỹ thuật & Tiêu chuẩn DoD</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {assignment.constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section: Grading Rubric */}
          <div className="p-5 border-b border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileCheck size={14} className="text-purple-600" />
              <span>Tiêu chí Chấm điểm (Evaluation Rubric)</span>
            </h3>
            <div className="space-y-2">
              {assignment.rubric.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900 mb-0.5">
                    <span>{r.criteria}</span>
                    <span className="text-blue-700 font-mono font-bold">{r.weight}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{r.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Submission Audit Trail (if submitted) */}
          {submittedData && (
            <div className="p-5 bg-emerald-50/40 border-b border-emerald-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Bằng chứng Nộp bài (Audit Trail)</span>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Trạng thái:</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Đang chờ Giảng viên Duyệt
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Thời gian UTC:</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {new Date(submittedData.submittedAt).toUTCString()}
                  </span>
                </div>
                {submittedData.sha256Hash && (
                  <div className="pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 block mb-0.5">Mã băm SHA-256 liêm chính:</span>
                    <code className="block truncate font-mono text-slate-700 bg-slate-50 p-1 rounded border border-slate-200">
                      {submittedData.sha256Hash}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT AREA: DYNAMIC WORKSPACE (65% WIDTH) ──────────────────── */}
        <div className="flex-1 flex flex-col bg-slate-100/50 overflow-y-auto">
          {/* ═══════════════════════════════════════════════════════════════════
              WORKSHOP MODE 1: GITHUB PULL REQUEST & DOCS SUBMISSION PORTAL
             ═══════════════════════════════════════════════════════════════════ */}
          {workspaceMode === "portal" && (
            <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
              {/* Card 1: Main URL Input Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <GitPullRequest size={16} className="text-purple-600" />
                      <span>Cổng Nộp Link GitHub PR / Commit / Tài liệu Thiết kế</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hỗ trợ tự động nhận diện GitHub PR, Commit, Figma, Draw.io và Google Docs
                    </p>
                  </div>
                  {urlCategoryInfo && (
                    <span
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${urlCategoryInfo.badgeBg}`}
                    >
                      {urlCategoryInfo.icon}
                      <span>{urlCategoryInfo.label}</span>
                    </span>
                  )}
                </div>

                {/* URL Input */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Link2 size={16} />
                  </div>
                  <input
                    type="url"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="Dán link GitHub PR (https://github.com/my-team/repo/pull/14), Link Commit, Figma, Draw.io..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                {/* Quick Examples */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Mẫu link chuẩn:</span>
                  <button
                    onClick={() =>
                      setSubmissionUrl("https://github.com/Hoaba-clouch/E-learningProject/pull/14")
                    }
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono hover:bg-slate-100 hover:text-slate-800 transition"
                  >
                    GitHub PR #14
                  </button>
                  <button
                    onClick={() =>
                      setSubmissionUrl("https://github.com/Hoaba-clouch/E-learningProject/commit/a8f3b2c")
                    }
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono hover:bg-slate-100 hover:text-slate-800 transition"
                  >
                    Commit #a8f3b2
                  </button>
                  <button
                    onClick={() =>
                      setSubmissionUrl("https://app.diagrams.net/#G1a9B7c...ERD_3NF.drawio")
                    }
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono hover:bg-slate-100 hover:text-slate-800 transition"
                  >
                    Draw.io ERD
                  </button>
                </div>

                {/* PR Summary Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Mô tả tóm tắt giải pháp kỹ thuật & Ghi chú nộp bài:
                  </label>
                  <textarea
                    rows={3}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Tóm tắt ngắn gọn: Đã chuẩn hóa 8 bảng CSDL 3NF, loại bỏ quan hệ N-N, bổ sung 100% cột timestamp UTC chuẩn ISO-8601 (H4)..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden transition"
                  />
                </div>
              </div>

              {/* Card 2: DoD (Definition of Done) Verification */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-blue-600" />
                  <span>Xác nhận Tiêu chuẩn DoD trước khi Nộp bài</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Sinh viên phải tự kiểm định các tiêu chí sau để bảo đảm tính chuyên nghiệp và sẵn sàng giải phóng Ràng buộc H2 trên Kanban:
                </p>

                <div className="space-y-2 pt-1">
                  {assignment.dodList.map((dod, index) => (
                    <label
                      key={index}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={dodChecks[index] || false}
                        onChange={(e) => {
                          const updated = [...dodChecks];
                          updated[index] = e.target.checked;
                          setDodChecks(updated);
                        }}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                      />
                      <span className="text-xs text-slate-700 leading-snug">{dod}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card 3: AI Socratic Pre-defense Reviewer */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Socratic AI Mock-Review: Câu hỏi Hội đồng sẽ chất vấn bài nộp này
                  </h3>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-indigo-900">
                    Khi Hội đồng phản biện (AI Defense Room) thẩm vấn bài này, bạn cần chuẩn bị giải trình:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>Tại sao bảng CSDL của bạn chọn chuẩn 3NF thay vì BCNF? Có hiện tượng dư thừa dữ liệu nào được chấp nhận không?</li>
                    <li>Ràng buộc H4 (Timestamp UTC ISO-8601) được xử lý ở tầng Controller hay tầng ORM Database?</li>
                    <li>Nếu lượng truy vấn tăng gấp 10 lần, bạn sẽ đánh index ở cột nào trước tiên?</li>
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Bài nộp sẽ được lưu trữ vào Portfolio và cập nhật tiến độ Sprint
                </span>
                <button
                  onClick={handlePortalSubmit}
                  disabled={!submissionUrl.trim() || isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang xác thực liên kết...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Nộp Bài Thẩm Định</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              WORKSHOP MODE 2: CODE LAB DOCKER SANDBOX RUNNER
             ═══════════════════════════════════════════════════════════════════ */}
          {workspaceMode === "codelab" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Code Editor Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 size={14} className="text-blue-600" />
                    <span>Monaco Editor</span>
                  </span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as "cpp" | "python")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="cpp">C++17 (g++ 13.2)</option>
                    <option value="python">Python 3.11</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (assignment.codeLabConfig) {
                        setSourceCode(assignment.codeLabConfig.initialCode);
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    <RefreshCw size={12} />
                    <span>Mã ban đầu</span>
                  </button>
                  <button
                    onClick={() => handleRunSandbox(false)}
                    disabled={isRunningSandbox}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    <Play size={13} className="text-blue-600" />
                    <span>Chạy thử (Ctrl+Enter)</span>
                  </button>
                  <button
                    onClick={() => handleRunSandbox(true)}
                    disabled={isRunningSandbox}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    <Send size={13} />
                    <span>Nộp thẩm định</span>
                  </button>
                </div>
              </div>

              {/* Code Textarea Area */}
              <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[220px]">
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      e.preventDefault();
                      handleRunSandbox(false);
                    }
                  }}
                  spellCheck={false}
                  className="h-full w-full resize-none bg-slate-900 p-4 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Bottom Test & Socratic Tabs */}
              <div className="h-64 border-t border-slate-200 bg-white flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveCodeLabTab("tests")}
                      className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition ${
                        activeCodeLabTab === "tests"
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>Edge Test Cases (5)</span>
                    </button>
                    <button
                      onClick={() => setActiveCodeLabTab("hints")}
                      className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition ${
                        activeCodeLabTab === "hints"
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>Gợi ý Socratic AI (3 Nấc)</span>
                    </button>
                    <button
                      onClick={() => setActiveCodeLabTab("console")}
                      className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition ${
                        activeCodeLabTab === "console"
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Terminal size={13} />
                      <span>Console Sandbox Log</span>
                    </button>
                  </div>

                  {sandboxResults && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-emerald-700 font-bold">
                        {sandboxResults.passedCount}/{sandboxResults.totalCount} Test Cases Pass
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        RAM: {sandboxResults.memoryMb}MB • {sandboxResults.executionTimeMs}ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Tab 1: Test Cases */}
                {activeCodeLabTab === "tests" && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {assignment.codeLabConfig?.testCases.map((tc, idx) => {
                      const res = sandboxResults?.testCases[idx];
                      const isPassed = res?.status === "passed";
                      return (
                        <div
                          key={tc.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                isPassed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {tc.id}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900">{tc.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Input: {tc.input}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {tc.isEdgeCase && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                Edge Case
                              </span>
                            )}
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                isPassed ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {isPassed ? "PASSED (12ms)" : "Ready"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Socratic Hints */}
                {activeCodeLabTab === "hints" && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {assignment.codeLabConfig?.socraticHints.map((hint) => {
                      const isUnlocked = unlockedHints.includes(hint.level);
                      return (
                        <div
                          key={hint.level}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                                {hint.level}
                              </span>
                              <span>{hint.title}</span>
                            </span>
                            {!isUnlocked ? (
                              <button
                                onClick={() => setUnlockedHints((prev) => [...prev, hint.level])}
                                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Mở khóa Nấc {hint.level}
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700">Đã mở</span>
                            )}
                          </div>
                          {isUnlocked ? (
                            <p className="text-slate-600 leading-relaxed text-[11px] pt-1 border-t border-slate-100">
                              {hint.content}
                            </p>
                          ) : (
                            <p className="text-slate-400 italic text-[11px] pt-1">
                              Gợi ý đã được khóa. Hãy thử tự tư duy trước khi mở.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 3: Console Terminal */}
                {activeCodeLabTab === "console" && (
                  <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-xs text-emerald-400 leading-relaxed">
                    {sandboxResults ? (
                      <pre className="whitespace-pre-wrap">{sandboxResults.stdout}</pre>
                    ) : (
                      <span className="text-slate-500">
                        Chưa chạy sandbox. Nhấn "Chạy thử (Ctrl+Enter)" để biên dịch mã nguồn và xem log thực thi...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

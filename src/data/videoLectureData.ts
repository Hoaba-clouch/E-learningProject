// Dữ liệu Video Bài Giảng Chuẩn Phong Cách F8 cho 4 Môn Học CNTT

export interface VideoChapter {
  timeSec: number;
  timestamp: string;
  title: string;
  description: string;
}

export interface VideoNote {
  id: string;
  timeSec: number;
  timestamp: string;
  content: string;
  createdAt: string;
}

export interface VideoLectureInfo {
  subjectId: string;
  subjectCode: string;
  lessonId: string;
  title: string;
  subtitle: string;
  instructor: string;
  duration: string;
  updatedAt: string;
  youtubeId: string; // YouTube Embed ID
  fallbackVideoUrl?: string;
  overview: string;
  chapters: VideoChapter[];
  defaultNotes: VideoNote[];
  resources: {
    title: string;
    url: string;
    type: "slide" | "git" | "doc";
  }[];
}

export const VIDEO_LECTURES_BY_SUBJECT: Record<string, VideoLectureInfo> = {
  // ─── 1. CS201: OOP & DSA ────────────────────────────────────────────────
  oop: {
    subjectId: "oop",
    subjectCode: "CS201",
    lessonId: "1.1",
    title: "Bản chất Kế thừa, Đa hình & Dynamic Dispatch trong OOP",
    subtitle: "Phân tích bảng con trỏ ảo vtable và kiến trúc đa hình runtime",
    instructor: "Thầy Nguyễn Phước & CodeMind Socratic AI",
    duration: "14:32",
    updatedAt: "08/11/2026",
    youtubeId: "R6plN3FvzFY", // Video bài giảng thực tế
    overview:
      "Trong bài giảng này, chúng ta sẽ mổ xẻ cơ chế hoạt động thực sự bên dưới tầng máy tính của Tính Đa hình (Polymorphism). Bạn sẽ hiểu rõ tại sao JVM hoặc C++ Runtime biết chính xác phương thức lớp con nào được gọi thông qua Virtual Table (vtable) mà không cần dùng câu lệnh rẽ nhánh if/else rườm rà.",
    chapters: [
      {
        timeSec: 0,
        timestamp: "00:00",
        title: "Tổng quan bài toán & Vấn đề khi lạm dụng instanceof",
        description: "Tại sao viết nhiều lệnh if (obj instanceof Dog) lại phá vỡ nguyên lý Open-Closed.",
      },
      {
        timeSec: 165,
        timestamp: "02:45",
        title: "Bản chất Kế thừa (is-a) và từ khóa super()",
        description: "Thứ tự khởi tạo constructor trong bộ nhớ RAM từ lớp cha đến lớp con.",
      },
      {
        timeSec: 375,
        timestamp: "06:15",
        title: "Cơ chế Dynamic Method Dispatch & Bảng vtable",
        description: "Cách máy ảo JVM điều phối phương thức tại Runtime qua bảng con trỏ ảo.",
      },
      {
        timeSec: 580,
        timestamp: "09:40",
        title: "Live Coding: Xây dựng Bounded Queue PageTracker",
        description: "Thực hành trực tiếp cấu trúc FIFO giới hạn bộ nhớ với Guard Clause xử lý chuỗi rỗng.",
      },
      {
        timeSec: 780,
        timestamp: "13:00",
        title: "Tổng kết & Giao bài tập Challenge Code Lab",
        description: "Hướng dẫn cách vượt qua 5/5 ca kiểm thử biên trong phòng thực hành.",
      },
    ],
    defaultNotes: [
      {
        id: "note-1",
        timeSec: 165,
        timestamp: "02:45",
        content: "Luôn phải gọi super() ở dòng đầu tiên của constructor lớp con để đảm bảo lớp cha được cấp phát bộ nhớ trước.",
        createdAt: "Hôm nay, 14:10",
      },
      {
        id: "note-2",
        timeSec: 375,
        timestamp: "06:15",
        content: "vtable (Virtual Method Table) là chìa khóa giúp đa hình động đạt độ phức tạp O(1) khi tra cứu hàm.",
        createdAt: "Hôm nay, 14:18",
      },
    ],
    resources: [
      {
        title: "Slide bài giảng OOP & Memory Allocation (PDF)",
        url: "#slide-pdf",
        type: "slide",
      },
      {
        title: "Source Code Demo PageTracker (GitHub)",
        url: "#github-repo",
        type: "git",
      },
      {
        title: "Tài liệu chuẩn IEEE về Dynamic Dispatch",
        url: "#doc",
        type: "doc",
      },
    ],
  },

  // ─── 2. CS304: WEB & REST API ───────────────────────────────────────────
  web: {
    subjectId: "web",
    subjectCode: "CS304",
    lessonId: "1.1",
    title: "Thiết kế RESTful API Chuẩn Doanh Nghiệp & Xác thực JWT",
    subtitle: "Xây dựng Endpoint Stateless, Quản lý Bearer Token và Xử lý CORS",
    instructor: "Võ Nhật Huy (Frontend/AI) & Phan Đình Nghị (Backend)",
    duration: "18:45",
    updatedAt: "08/11/2026",
    youtubeId: "-MTSQjw5DrM",
    overview:
      "Video hướng dẫn chi tiết cách thiết kế chuẩn một hệ thống REST API: quy ước đặt tên danh từ số nhiều, phân biệt POST vs PUT/PATCH, quy tắc phi trạng thái (Stateless), cấu trúc 3 phần của JSON Web Token (JWT) và cách cấu hình Middleware chống lỗi CORS khi giao tiếp giữa React và FastAPI.",
    chapters: [
      {
        timeSec: 0,
        timestamp: "00:00",
        title: "Mô hình Client-Server và Tính phi trạng thái (Stateless)",
        description: "Lý do REST API không lưu session trên server và lợi ích mở rộng ngang (horizontal scaling).",
      },
      {
        timeSec: 210,
        timestamp: "03:30",
        title: "Chuẩn đặt tên URI và Phân loại HTTP Status Code",
        description: "200 OK vs 201 Created; 401 Unauthorized vs 403 Forbidden.",
      },
      {
        timeSec: 490,
        timestamp: "08:10",
        title: "Giải phẫu JWT: Header, Payload & Chữ ký HMAC-SHA256",
        description: "Tại sao không bao giờ được lưu password trong Payload của JWT Token.",
      },
      {
        timeSec: 750,
        timestamp: "12:30",
        title: "Live Demo: Mock FastAPI Endpoint & Gửi Bearer Header",
        description: "Tích hợp form gửi task và nhận phản hồi tức thì trên Live Preview.",
      },
      {
        timeSec: 1010,
        timestamp: "16:50",
        title: "Tổng kết & Thử thách Web Live Studio",
        description: "Hướng dẫn thực hiện bài tập thực hành Web Studio và nhận chứng chỉ API.",
      },
    ],
    defaultNotes: [
      {
        id: "web-note-1",
        timeSec: 210,
        timestamp: "03:30",
        content: "URI REST phải là danh từ số nhiều: dùng /api/v1/tasks, KHÔNG dùng /api/getTasks.",
        createdAt: "Hôm nay, 10:20",
      },
      {
        id: "web-note-2",
        timeSec: 490,
        timestamp: "08:10",
        content: "JWT Header Authorization luôn có tiền tố 'Bearer <token>' cách nhau bởi 1 dấu cách.",
        createdAt: "Hôm nay, 10:35",
      },
    ],
    resources: [
      {
        title: "Slide bài giảng REST & JWT Authentication (PDF)",
        url: "#slide-pdf",
        type: "slide",
      },
      {
        title: "FastAPI Mock Server Starter Template",
        url: "#github-repo",
        type: "git",
      },
    ],
  },

  // ─── 3. CS308: HỆ THỐNG & CSDL (SYSTEM DESIGN) ──────────────────────────
  "system-design": {
    subjectId: "system-design",
    subjectCode: "CS308",
    lessonId: "1.1",
    title: "Phương pháp Chuẩn hóa CSDL (1NF $\\to$ 3NF) & Thiết kế ERD",
    subtitle: "Loại bỏ phụ thuộc một phần và bắc cầu trong kiến trúc cơ sở dữ liệu lớn",
    instructor: "Thầy Nguyễn Phước & Nguyễn Bá Hòa (Leader/Architect)",
    duration: "16:20",
    updatedAt: "08/11/2026",
    youtubeId: "UrYLYV7WSHM",
    overview:
      "Bài giảng tập trung giải quyết triệt để vấn đề dư thừa dữ liệu và bất thường cập nhật (Update Anomaly) trong các ứng dụng thực tế. Học viên sẽ được hướng dẫn từng bước chuyển hóa từ bảng phi chuẩn về chuẩn 1NF, 2NF và đạt mốc 3NF hoàn hảo cho 8 bảng cơ sở dữ liệu của CodeMind Campus.",
    chapters: [
      {
        timeSec: 0,
        timestamp: "00:00",
        title: "Các dạng bất thường khi CSDL chưa chuẩn hóa",
        description: "Insertion, Deletion và Modification Anomaly gây sai lệch dữ liệu thế nào.",
      },
      {
        timeSec: 180,
        timestamp: "03:00",
        title: "Chuẩn 1NF: Tính nguyên tố của thuộc tính",
        description: "Tuyệt đối không lưu mảng hoặc chuỗi phân tách bằng dấu phẩy trong một cột.",
      },
      {
        timeSec: 420,
        timestamp: "07:00",
        title: "Chuẩn 2NF: Loại bỏ phụ thuộc một phần khóa chính",
        description: "Phân tích bảng có khóa chính phức hợp và tách bảng con.",
      },
      {
        timeSec: 660,
        timestamp: "11:00",
        title: "Chuẩn 3NF: Loại bỏ phụ thuộc bắc cầu (Transitive)",
        description: "Nếu A -> B và B -> C thì tách B -> C sang bảng riêng biệt.",
      },
      {
        timeSec: 880,
        timestamp: "14:40",
        title: "Kiểm toán 8 Bảng Schema của CodeMind Campus",
        description: "Kiểm tra toàn vẹn tham chiếu ON DELETE CASCADE và Indexing khóa ngoại.",
      },
    ],
    defaultNotes: [
      {
        id: "sys-note-1",
        timeSec: 180,
        timestamp: "03:00",
        content: "Vi phạm 1NF phổ biến nhất là lưu danh sách roleId dạng '1,2,3' trong bảng Users.",
        createdAt: "Hôm qua, 16:45",
      },
      {
        id: "sys-note-2",
        timeSec: 660,
        timestamp: "11:00",
        content: "3NF bắt buộc mọi thuộc tính không khóa phải phụ thuộc trực tiếp vào khóa chính và chỉ khóa chính.",
        createdAt: "Hôm qua, 17:02",
      },
    ],
    resources: [
      {
        title: "Sơ đồ kiến trúc ERD 8 Bảng CodeMind Campus (PDF)",
        url: "#slide-pdf",
        type: "slide",
      },
      {
        title: "Script DDL PostgreSQL & B-Tree Indexes",
        url: "#github-repo",
        type: "git",
      },
    ],
  },

  // ─── 4. CS401: AGILE SCRUM ──────────────────────────────────────────────
  scrum: {
    subjectId: "scrum",
    subjectCode: "CS401",
    lessonId: "1.1",
    title: "Khung Làm Việc Scrum & Tiêu Chuẩn INVEST Cho User Story",
    subtitle: "Quy trình thực chiến Sprint Planning, Daily Standup & Definition of Done",
    instructor: "Nguyễn Bá Hòa (Scrum Master) & CodeMind AI Coach",
    duration: "13:50",
    updatedAt: "08/11/2026",
    youtubeId: "9TycLR0TqFA",
    overview:
      "Video hướng dẫn cách vận hành nhóm phát triển phần mềm theo chuẩn Agile Scrum. Phân tích chi tiết 3 trụ cột (Minh bạch, Thanh tra, Thích nghi), cách viết User Story đạt 6 tiêu chuẩn INVEST để tránh nợ kỹ thuật, và cách thiết lập ma trận Definition of Done (DoD) 4 cấp độ trước khi merge code vào nhánh chính.",
    chapters: [
      {
        timeSec: 0,
        timestamp: "00:00",
        title: "Triết lý Agile và 3 Trụ cột cốt lõi của Scrum",
        description: "Tính minh bạch của Kanban, Thanh tra nhịp Sprint và Thích nghi yêu cầu.",
      },
      {
        timeSec: 150,
        timestamp: "02:30",
        title: "5 Sự kiện bắt buộc trong chu kỳ Sprint",
        description: "Sprint Planning (2h), Daily Standup (15p), Review, Retrospective & Refinement.",
      },
      {
        timeSec: 410,
        timestamp: "06:50",
        title: "Tiêu chuẩn INVEST cho User Story chất lượng cao",
        description: "Phân tích 6 tiêu chí: Independent, Negotiable, Valuable, Estimable, Small, Testable.",
      },
      {
        timeSec: 630,
        timestamp: "10:30",
        title: "Ma trận Definition of Done (DoD) 4 Cấp độ",
        description: "Code Review, Unit Test Pass >= 80%, CI Build Success và No Conflict.",
      },
      {
        timeSec: 760,
        timestamp: "12:40",
        title: "Tổng kết & Thử thách Case Study Spec Studio",
        description: "Thẩm định User Story trên bảng kiểm tra tự động của hệ thống.",
      },
    ],
    defaultNotes: [
      {
        id: "scrum-note-1",
        timeSec: 410,
        timestamp: "06:50",
        content: "Tiêu chí 'Small' trong INVEST: Story không được vượt quá 1/3 tổng thời gian của một Sprint.",
        createdAt: "Hôm nay, 08:30",
      },
      {
        id: "scrum-note-2",
        timeSec: 630,
        timestamp: "10:30",
        content: "DoD là cam kết chất lượng chung của cả nhóm, không cá nhân nào được phép châm chước giảm nhẹ tiêu chuẩn.",
        createdAt: "Hôm nay, 08:50",
      },
    ],
    resources: [
      {
        title: "Slide Agile Scrum Guide 2026 (PDF)",
        url: "#slide-pdf",
        type: "slide",
      },
      {
        title: "Mẫu Checklist INVEST & Definition of Done",
        url: "#doc",
        type: "doc",
      },
    ],
  },

  // ─── 5. CS210: FRONTEND REACT 19 & NEXT.JS 15 ───────────────────────────
  frontend: {
    subjectId: "frontend",
    subjectCode: "CS210",
    title: "React Server Components (RSC) & Server Actions trong Next.js 15",
    subtitle: "Xây dựng Web App chuẩn thời đại: Không tải thừa JavaScript, render trực tiếp trên server",
    instructor: "Võ Nhật Huy & Phan Đình Nghị",
    youtubeId: "843nec-IvW0",
    duration: "19:40",
    updatedAt: "Học kỳ 4 · 2026",
    overview: "Mổ xẻ kiến trúc React Server Components và cách Server Actions thay thế hoàn toàn REST endpoint thông thường, tạo trải nghiệm web mượt mà không độ trễ.",
    chapters: [
      {
        title: "Tổng quan bài toán: Tại sao Client-Side Rendering (CSR) lỗi thời?",
        timestamp: "00:00",
        timeSec: 0,
        description: "Phân tích gánh nặng bundle size của Single Page App truyền thống.",
      },
      {
        title: "Bản chất React Server Components (RSC) & ranh giới 'use client'",
        timestamp: "04:15",
        timeSec: 255,
        description: "Khi nào cần Client Component và cách tối ưu hóa cây thành phần (Component Tree).",
      },
      {
        title: "Thực hành: Server Actions & useOptimistic UI",
        timestamp: "10:30",
        timeSec: 630,
        description: "Tạo mutation dữ liệu tức thì và revalidate cache.",
      },
      {
        title: "Tối ưu hóa Core Web Vitals & Streaming Suspense",
        timestamp: "15:45",
        timeSec: 945,
        description: "Stream từng phần giao diện với Suspense boundary.",
      },
    ],
    defaultNotes: [
      {
        id: "fe-note-1",
        timeSec: 255,
        timestamp: "04:15",
        content: "Server Components không gửi JS code về client -> Tiết kiệm 60% dung lượng tải trang ban đầu.",
        createdAt: "Khuyên dùng",
      },
    ],
    resources: [
      {
        title: "Next.js 15 App Router Architecture Guide",
        url: "https://nextjs.org/docs",
        type: "doc",
      },
      {
        title: "Demo Next.js 15 & React 19 Clean Repository",
        url: "https://github.com",
        type: "git",
      },
    ],
  },

  // ─── 6. CS420: AI-NATIVE & RAG ARCHITECTURE ──────────────────────────────
  "ai-agent": {
    subjectId: "ai-agent",
    subjectCode: "CS420",
    title: "Kiến trúc RAG Thực chiến: Vector Search & Tích hợp Gemini LLM",
    subtitle: "Xây dựng ứng dụng Web AI-Native: Triệt tiêu ảo giác, tìm kiếm ngữ nghĩa với pgvector",
    instructor: "Võ Nhật Huy & TS. Lê Hoàng Mai",
    youtubeId: "bc7wAkyB2H0",
    duration: "22:15",
    updatedAt: "Học kỳ 6 · 2026",
    overview: "Hướng dẫn xây dựng hệ thống RAG từ cơ bản đến nâng cao: Chuyển đổi dữ liệu thành Vector Embeddings, lưu trữ trong PostgreSQL pgvector và cho phép AI trả lời dựa trên kho tri thức trường đại học.",
    chapters: [
      {
        title: "Bản chất Vector Embeddings & Không gian đa chiều",
        timestamp: "00:00",
        timeSec: 0,
        description: "Tìm kiếm ngữ nghĩa (Semantic Search) vs Tìm kiếm từ khóa truyền thống.",
      },
      {
        title: "Cài đặt & Tối ưu pgvector trong PostgreSQL",
        timestamp: "05:20",
        timeSec: 320,
        description: "Toán tử Cosine Distance và chỉ mục HNSW siêu tốc.",
      },
      {
        title: "Xây dựng RAG Pipeline hoàn chỉnh với Gemini API",
        timestamp: "12:10",
        timeSec: 730,
        description: "Tiêm ngữ cảnh (Context Injection) và System Prompt chống ảo giác.",
      },
      {
        title: "Nâng cao: AI Agent Tool Calling & Autonomous Execution",
        timestamp: "18:00",
        timeSec: 1080,
        description: "Khai báo JSON Function schema cho AI tự gọi tool.",
      },
    ],
    defaultNotes: [
      {
        id: "ai-note-1",
        timeSec: 730,
        timestamp: "12:10",
        content: "RAG luôn yêu cầu trích dẫn nguồn (Citations) và thừa nhận nếu không tìm thấy dữ liệu trong ngữ cảnh.",
        createdAt: "Khuyên dùng",
      },
    ],
    resources: [
      {
        title: "Google Gemini API & Function Calling Docs",
        url: "https://ai.google.dev",
        type: "doc",
      },
      {
        title: "pgvector PostgreSQL Extension Documentation",
        url: "https://github.com/pgvector/pgvector",
        type: "git",
      },
    ],
  },

};

// Dữ liệu Bài giảng Video Đồng bộ 1:1 theo Từng Môn học & Từng Bài học (F8 Official & Verified CS Tracks)

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
  youtubeId: string; // Verified Embeddable YouTube ID (playableInEmbed: true)
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
  "oop": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "1.1",
    "title": "49. Tính kế thừa trong lập trình hướng đối tượng C++ (F8 Official)",
    "subtitle": "Xây dựng quan hệ Is-A, kế thừa public/protected và tái sử dụng mã nguồn C++",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "19:40",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "M6FwepHC6vM",
    "overview": "Bài giảng F8 Official giải thích cặn kẽ bản chất Tính kế thừa (Inheritance) trong C++ OOP: cách lớp dẫn xuất thừa hưởng thuộc tính/phương thức từ lớp cơ sở, phạm vi protected và tối ưu kiến trúc lớp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bài toán thực tế: Khi nào cần Tính kế thừa?",
        "description": "Tránh lặp code giữa các thực thể chung nhóm và thiết kế Base Class chuẩn."
      },
      {
        "timeSec": 185,
        "timestamp": "03:05",
        "title": "Cú pháp kế thừa & phạm vi protected",
        "description": "Phân biệt public, protected và private inheritance khi đóng gói dữ liệu."
      },
      {
        "timeSec": 520,
        "timestamp": "08:40",
        "title": "Ghi đè phương thức và gọi hàm tạo lớp cha",
        "description": "Constructor chaining bằng Member Initializer List trong C++."
      },
      {
        "timeSec": 910,
        "timestamp": "15:10",
        "title": "Tổng kết & thực hành Code Lab",
        "description": "Áp dụng kế thừa kết hợp đa hình cho hệ thống Employee."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-11-n1",
        "timeSec": 185,
        "timestamp": "03:05",
        "content": "protected cho phép lớp con đọc/ghi trực tiếp nhưng vẫn bảo vệ trước bên ngoài.",
        "createdAt": "F8 Bookmark"
      },
      {
        "id": "oop-11-n2",
        "timeSec": 520,
        "timestamp": "08:40",
        "content": "Luôn khai báo virtual ~Base() = default ở lớp cha có phương thức ảo.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "C++ Core Guidelines — Class Hierarchies",
        "url": "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-class",
        "type": "git"
      },
      {
        "title": "F8 Official C++ Series — Bài 49: Tính kế thừa",
        "url": "https://www.youtube.com/watch?v=M6FwepHC6vM",
        "type": "doc"
      },
      {
        "title": "cppreference — Derived classes",
        "url": "https://en.cppreference.com/w/cpp/language/derived_class",
        "type": "doc"
      }
    ]
  },
  "dsa": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "1.1",
    "title": "#2 Biểu Diễn Đồ Thị: Ma Trận Kề, Danh Sách Kề & Danh Sách Cạnh (28tech)",
    "subtitle": "Nền tảng tổ chức cấu trúc dữ liệu đồ thị tối ưu bộ nhớ trong C++",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "24:10",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "JtWcUHRyqkA",
    "overview": "Hướng dẫn chi tiết 3 phương pháp biểu diễn đồ thị trên máy tính và tiêu chí chọn Danh sách kề cho thuật toán 10^5 đỉnh.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ma trận kề (Adjacency Matrix)",
        "description": "Ưu nhược điểm khi kiểm tra cạnh trong O(1)."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Danh sách kề (Adjacency List)",
        "description": "Cách lưu tối ưu cho đồ thị thưa lớn."
      }
    ],
    "defaultNotes": [
      {
        "id": "dsa-11-n1",
        "timeSec": 450,
        "timestamp": "07:30",
        "content": "Luôn dùng Danh sách kề vector<vector<pair<int,int>>> cho Dijkstra 10^5 đỉnh.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "28tech — Bài 2: Biểu diễn Đồ thị Ma trận kề & Danh sách kề",
        "url": "https://www.youtube.com/watch?v=JtWcUHRyqkA",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Breadth-First Search",
        "url": "https://cp-algorithms.com/graph/breadth-first-search.html",
        "type": "doc"
      }
    ]
  },
  "network": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "1.1",
    "title": "Hiểu Mô Hình OSI Và Giao Thức HTTP, TCP, UDP (Network Core)",
    "subtitle": "Cách các tầng Transport & Application đóng gói Header qua 3-Way Handshake",
    "instructor": "s2sontech & Thầy Trần Minh Quân",
    "duration": "22:40",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "Ohuxcw7Bx5E",
    "overview": "Phân tích rõ sự khác biệt giữa TCP tin cậy có bắt tay 3 bước và UDP tốc độ cao không kết nối.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "7 Tầng OSI & 4 Tầng TCP/IP",
        "description": "Đóng gói Encapsulation từng tầng."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "TCP vs UDP & 3-Way Handshake",
        "description": "SYN, SYN-ACK, ACK hoạt động ra sao."
      }
    ],
    "defaultNotes": [
      {
        "id": "net-11-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "Video livestream/game chọn UDP; truyền file và REST API chọn TCP nhờ đảm bảo thứ tự và không mất gói.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "s2sontech — Mô hình OSI & Giao thức TCP/UDP/HTTP",
        "url": "https://www.youtube.com/watch?v=Ohuxcw7Bx5E",
        "type": "doc"
      },
      {
        "title": "RFC 9293 — Transmission Control Protocol (TCP)",
        "url": "https://datatracker.ietf.org/doc/html/rfc9293",
        "type": "doc"
      }
    ]
  },
  "frontend": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "1.1",
    "title": "ReactJS là gì? Tại sao nên học ReactJS & Component Thinking (F8 Official)",
    "subtitle": "Tư duy UI chia nhỏ thành Component, Virtual DOM và luồng dữ liệu một chiều",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "18:35",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "x0fSBAgBrOQ",
    "overview": "Bài mở đầu khóa ReactJS tại F8 Official giải thích lý do SPA, Virtual DOM và Component Architecture thống trị Frontend.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "SPA vs MPA trong thực tế",
        "description": "Không tải lại toàn trang khi điều hướng."
      },
      {
        "timeSec": 290,
        "timestamp": "04:50",
        "title": "Virtual DOM & Diffing",
        "description": "Cập nhật tối thiểu DOM thật."
      }
    ],
    "defaultNotes": [
      {
        "id": "fe-11-n1",
        "timeSec": 290,
        "timestamp": "04:50",
        "content": "Tránh đụng trực tiếp document.querySelector trong React; luôn để React quản lý DOM qua state.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — ReactJS là gì & Tại sao nên học ReactJS",
        "url": "https://www.youtube.com/watch?v=x0fSBAgBrOQ",
        "type": "doc"
      },
      {
        "title": "React Official Docs — Thinking in React",
        "url": "https://react.dev/learn/thinking-in-react",
        "type": "doc"
      }
    ]
  },
  "realtime": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "1.1",
    "title": "Đồng bộ, Bất đồng bộ & Event Loop trong JavaScript (CS215)",
    "subtitle": "Call Stack, Web APIs, Microtask Queue (Promise) vs Callback Queue",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "20:30",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "jfQUw8QxaZc",
    "overview": "Giải thích chi tiết cơ chế Event Loop điều phối Promise, Async/Await và nguyên nhân không được block Main Thread.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Single Thread & Blocking Call Stack",
        "description": "Vì sao vòng lặp đồng bộ nặng làm đơ giao diện."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Event Loop, Microtasks vs Macrotasks",
        "description": "Ưu tiên giải phóng Promise queue trước setTimeout."
      }
    ],
    "defaultNotes": [
      {
        "id": "rt-11-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Promise.then luôn chạy trước setTimeout(..., 0) vì Microtask Queue có độ ưu tiên cao hơn Macrotask.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Firelop — Đồng bộ, Bất đồng bộ & Event Loop trong JavaScript",
        "url": "https://www.youtube.com/watch?v=jfQUw8QxaZc",
        "type": "doc"
      },
      {
        "title": "F8 Official — Promise (sync / async) trong JavaScript",
        "url": "https://www.youtube.com/watch?v=QJmNEqy0zV0",
        "type": "doc"
      }
    ]
  },
  "mobile": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "1.1",
    "title": "Stateful Widgets & Kiến trúc Render của Flutter (Flutter Official)",
    "subtitle": "Tách StatelessWidget vs StatefulWidget, BuildContext và quản lý Rebuild",
    "instructor": "Flutter Official & Phan Đình Nghị",
    "duration": "15:20",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "Gzz8FwSlsUg",
    "overview": "Video chính thức từ đội ngũ Flutter giải thích cơ chế Widget bất biến, Element giữ State và cách gọi setState đúng phạm vi.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Widget Tree vs Element State",
        "description": "Nơi State thực sự được lưu giữ."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Hàm createState & Lifecycle",
        "description": "initState -> build -> dispose."
      }
    ],
    "defaultNotes": [
      {
        "id": "mob-11-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Luôn hủy TextEditingController và StreamSubscription trong phương thức dispose() của State.",
        "createdAt": "Flutter Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Flutter Official — Stateful Widgets in Flutter",
        "url": "https://www.youtube.com/watch?v=Gzz8FwSlsUg",
        "type": "doc"
      },
      {
        "title": "Flutter Architecture Overview",
        "url": "https://docs.flutter.dev/resources/architectural-overview",
        "type": "doc"
      }
    ]
  },
  "web": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "1.1",
    "title": "Thêm/Sửa/Xóa Khóa học với Fetch và REST API (F8 Official)",
    "subtitle": "Thực hành CRUD hoàn chỉnh qua HTTP GET, POST, PUT, DELETE với Backend API",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "24:15",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "TRjVXmk8q8I",
    "overview": "Video F8 Official thực chiến xây dựng luồng CRUD đầy đủ với Fetch API và RESTful Endpoint: GET render danh sách, POST tạo mới, DELETE cập nhật UI tức thì.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiến trúc RESTful API & HTTP Verbs",
        "description": "Mapping tài nguyên /courses sang GET/POST/PUT/DELETE."
      },
      {
        "timeSec": 280,
        "timestamp": "04:40",
        "title": "Fetch POST JSON & Content-Type",
        "description": "Gửi payload JSON chuẩn và cập nhật danh sách."
      },
      {
        "timeSec": 720,
        "timestamp": "12:00",
        "title": "Xử lý DELETE đồng bộ State",
        "description": "Cập nhật giao diện không reload toàn trang."
      }
    ],
    "defaultNotes": [
      {
        "id": "web-11-n1",
        "timeSec": 280,
        "timestamp": "04:40",
        "content": "Khi gửi JSON bằng fetch nhớ cấu hình headers: { 'Content-Type': 'application/json' }.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Thêm/Sửa/Xóa khóa học với Fetch và REST API",
        "url": "https://www.youtube.com/watch?v=TRjVXmk8q8I",
        "type": "doc"
      },
      {
        "title": "MDN — HTTP Response Status Codes",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
        "type": "doc"
      }
    ]
  },
  "system-design": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "1.1",
    "title": "System Design là gì? Tư duy Phân tích Kiến trúc & Dữ liệu P1",
    "subtitle": "Từ yêu cầu bài toán thực tế đến thiết kế Thực thể & Thành phần Hệ thống",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "21:30",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "ur6ZwbQ99os",
    "overview": "Video định hình tư duy System Design cho kỹ sư phần mềm: cách bóc tách bài toán, ước lượng dữ liệu và vẽ sơ đồ thực thể.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vì sao Code sạch nhưng System Design tồi vẫn sập?",
        "description": "Vai trò sống còn của Data Model."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Phân rã Thực thể & Thành phần cốt lõi",
        "description": "Xác định nguồn chân lý dữ liệu."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "TechCraft — System Design là gì? Tư duy Thiết kế Hệ thống P1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      },
      {
        "title": "PostgreSQL Official Docs — Constraints",
        "url": "https://www.postgresql.org/docs/current/ddl-constraints.html",
        "type": "doc"
      }
    ]
  },
  "distributed": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "1.1",
    "title": "What Is Redis Really About? In-Memory Caching & Data Structures (CS315)",
    "subtitle": "Cách Redis đạt tốc độ dưới 1ms bằng RAM & Single-Threaded Event Loop",
    "instructor": "ByteByteGo & Thầy Nguyễn Phước",
    "duration": "12:40",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "z_NbVtbgBJw",
    "overview": "Video trực quan giải thích các cấu trúc dữ liệu của Redis (String, Hash, Sorted Set) và vai trò cốt lõi trong hệ thống phân tán.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao Redis nhanh hơn Disk Database?",
        "description": "In-Memory RAM + I/O Multiplexing."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Sorted Sets, Streams & Distributed Cache",
        "description": "Ứng dụng thực chiến trong Enterprise Web App."
      }
    ],
    "defaultNotes": [
      {
        "id": "dist-11-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Dùng Redis ZSET (Sorted Set) cho bảng xếp hạng XP Leaderboard thay vì `ORDER BY xp DESC` trên bảng triệu dòng.",
        "createdAt": "System Bookmark"
      }
    ],
    "resources": [
      {
        "title": "ByteByteGo — What Is Redis Really About?",
        "url": "https://www.youtube.com/watch?v=z_NbVtbgBJw",
        "type": "doc"
      },
      {
        "title": "Hello Interview — Redis Deep Dive",
        "url": "https://www.youtube.com/watch?v=fmT5nlEkl3U",
        "type": "doc"
      }
    ]
  },
  "security": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "1.1",
    "title": "An toàn Web & OWASP Top 10: SQL Injection, XSS, CSRF & Session (CS312)",
    "subtitle": "Cách kẻ tấn công khai thác lỗ hổng Web và phương pháp vá triệt để",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "26:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "V50ahKLTXxA",
    "overview": "Video bài giảng chi tiết về bộ 10 lỗ hổng nguy hiểm nhất OWASP: Cookie/Session Hijacking, SQL Injection, XSS và CSRF.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh OWASP Top 10 & SQL Injection",
        "description": "Nguyên nhân nối chuỗi và Prepared Statements."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "XSS, CSRF & Bảo vệ Cookie/Session",
        "description": "HttpOnly, SameSite và CSP."
      }
    ],
    "defaultNotes": [
      {
        "id": "sec-11-n1",
        "timeSec": 0,
        "timestamp": "00:00",
        "content": "Prepared Statement / Bind Parameter là lá chắn duy nhất triệt tiêu SQLi 100% ở mọi biến đầu vào.",
        "createdAt": "Security Bookmark"
      }
    ],
    "resources": [
      {
        "title": "An toàn Web — OWASP Top 10: SQLi, XSS, CSRF & Session",
        "url": "https://www.youtube.com/watch?v=V50ahKLTXxA",
        "type": "doc"
      },
      {
        "title": "OWASP SQL Injection Prevention Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "ai-ml": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "1.1",
    "title": "Mạng Nơ-ron Nhân tạo là gì? | Deep Learning Chapter 1 (3Blue1Brown)",
    "subtitle": "Hiểu trực quan Trọng số (Weights), Bias, Tầng ẩn và Activation Phi tuyến",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "19:13",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "aircAruvnKk",
    "overview": "Khám phá cách mạng Nơ-ron Multi-Layer Perceptron trích xuất cạnh, nét rồi nhận diện chữ số viết tay qua các lớp trọng số.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Nơ-ron & Ma trận Trọng số",
        "description": "Cấu trúc một lớp tuyến tính kết hợp hàm kích hoạt."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Từ Sigmoid đến ReLU hiện đại",
        "description": "Tại sao Deep Learning ưu tiên ReLU/GELU."
      }
    ],
    "defaultNotes": [
      {
        "id": "aiml-11-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "ReLU(z) = max(0, z) có đạo hàm bằng 1 ở vùng dương, giúp mạng sâu hội tụ nhanh hơn Sigmoid nhiều lần.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "3Blue1Brown — But what is a Neural Network? (Ch.1)",
        "url": "https://www.youtube.com/watch?v=aircAruvnKk",
        "type": "doc"
      },
      {
        "title": "PyTorch Official Tutorials — Build the Neural Network",
        "url": "https://pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html",
        "type": "doc"
      }
    ]
  },
  "ai-agent": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "1.1",
    "title": "Tất Tần Tật Về RAG & Vector Embeddings Cơ Bản (CS420)",
    "subtitle": "Chunking Tài liệu, Text Embedding Vector và Vector Database Semantic Search",
    "instructor": "Việt Nguyễn AI & Võ Nhật Huy",
    "duration": "20:15",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "NQOYXmZxqvI",
    "overview": "Video tiếng Việt giải thích toàn diện cách Embedding biến tri thức thành vector, truy xuất ngữ nghĩa và đưa vào Prompt giảm ảo giác.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao LLM cần RAG thay vì nhồi hết vào Prompt?",
        "description": "Giới hạn Context Window & chi phí token."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Chunking, Embeddings & Vector Search",
        "description": "Tìm đúng đoạn văn bản gần nghĩa nhất."
      }
    ],
    "defaultNotes": [
      {
        "id": "ai-11-n1",
        "timeSec": 450,
        "timestamp": "07:30",
        "content": "Luôn dùng đúng CÙNG MỘT mô hình Embedding cho lúc nạp dữ liệu (Indexing) và lúc truy vấn người dùng (Querying)!",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Việt Nguyễn AI — Tất tần tật về RAG cơ bản trong 20 phút",
        "url": "https://www.youtube.com/watch?v=NQOYXmZxqvI",
        "type": "doc"
      },
      {
        "title": "Harish Neel — Vector Embeddings & RAG Architecture Explained",
        "url": "https://www.youtube.com/watch?v=9iGvXxH_fdE",
        "type": "doc"
      }
    ]
  },
  "devops": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "1.1",
    "title": "Windows Terminal & Môi trường Linux WSL2 Cho DevOps (F8 Official)",
    "subtitle": "Làm chủ Terminal Linux chuẩn bị chạy Docker Containers & CI/CD",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "18:10",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "7ppRSaGT1uw",
    "overview": "Hướng dẫn chi tiết cài đặt và làm việc hiệu quả với Windows Terminal + WSL2 Linux — nền móng cho Docker và Cloud.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao DevOps cần môi trường Linux?",
        "description": "Đồng bộ Local với Server Production Ubuntu."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Cấu hình WSL2 & Shell CLI",
        "description": "Thao tác mượt mà với hệ sinh thái Container."
      }
    ],
    "defaultNotes": [
      {
        "id": "dev-11-n1",
        "timeSec": 360,
        "timestamp": "06:00",
        "content": "Lưu project Docker inside `/home/<user>` của WSL2 giúp `npm install` và `docker build` nhanh hơn nhiều lần so với ổ C:/mnt/c.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Giới thiệu Windows Terminal & WSL2 Linux",
        "url": "https://www.youtube.com/watch?v=7ppRSaGT1uw",
        "type": "doc"
      },
      {
        "title": "Code Dạo — Tự học Docker siêu tốc trong 10 phút",
        "url": "https://www.youtube.com/watch?v=1k8pox8mkxc",
        "type": "doc"
      }
    ]
  },
  "cloud": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "1.1",
    "title": "Giao tiếp Microservices: REST API, gRPC, RabbitMQ & Kafka (CS415)",
    "subtitle": "Lựa chọn Sync RPC vs Async Message Broker trên Hạ tầng Cloud",
    "instructor": "Võ Nhật Huy & TS. Lê Hoàng Mai",
    "duration": "18:30",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "8U1M_NRnmNY",
    "overview": "So sánh trực diện REST JSON, gRPC nhị phân, RabbitMQ và Apache Kafka khi thiết kế kiến trúc Microservices trên Cloud.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "REST & gRPC cho giao tiếp Đồng bộ",
        "description": "Khi caller cần phản hồi tức thì."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "RabbitMQ / Kafka tách lỏng Async",
        "description": "Chịu lỗi và san tải cho các tác vụ nền."
      }
    ],
    "defaultNotes": [
      {
        "id": "cld-11-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Đặt Circuit Breaker + Timeout ngắn cho lời gọi gRPC/REST đồng bộ để ngăn sập dây chuyền.",
        "createdAt": "Cloud Bookmark"
      }
    ],
    "resources": [
      {
        "title": "How Microservices Communicate: REST vs gRPC vs RabbitMQ vs Kafka",
        "url": "https://www.youtube.com/watch?v=8U1M_NRnmNY",
        "type": "doc"
      }
    ]
  },
  "scrum": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "1.1",
    "title": "Giới thiệu về Agile và Khung làm việc Scrum (CS401)",
    "subtitle": "3 Trụ cột Minh bạch - Thanh tra - Thích nghi & Cấu trúc Đội ngũ Scrum",
    "instructor": "Anh Nguyen Ngoc & Nguyễn Bá Hòa",
    "duration": "18:20",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "A8waDSbDA8g",
    "overview": "Video bài giảng tiếng Việt giải thích nền tảng tư duy Agile, vì sao Scrum vượt trội ở bài toán phần mềm phức tạp và 3 vai trò cốt lõi.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Waterfall vs Tư duy Thích nghi Agile",
        "description": "Rút ngắn vòng lặp phản hồi giá trị."
      },
      {
        "timeSec": 400,
        "timestamp": "06:40",
        "title": "3 Trụ cột & 3 Vai trò trong Scrum",
        "description": "Product Owner, Scrum Master & Developers."
      }
    ],
    "defaultNotes": [
      {
        "id": "scr-11-n1",
        "timeSec": 400,
        "timestamp": "06:40",
        "content": "Product Owner quyết định 'Làm cái gì & Thứ tự nào'; Developers quyết định 'Làm như thế nào & Bao nhiêu việc vừa Sprint'.",
        "createdAt": "Scrum Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Anh Nguyen Ngoc — Bài 1: Giới thiệu về Agile và Scrum",
        "url": "https://www.youtube.com/watch?v=A8waDSbDA8g",
        "type": "doc"
      },
      {
        "title": "Enosta Hub — Agile Là Gì & Ứng dụng Thực tế",
        "url": "https://www.youtube.com/watch?v=80PevHArDu8",
        "type": "doc"
      }
    ]
  },
  "capstone": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "1.1",
    "title": "5 Bước Vàng Giải Mọi Bài System Design: Framework Đồ án Tốt nghiệp (CS499)",
    "subtitle": "Functional Requirements, QPS Estimation, API Contract, DB & Scaling Blueprint",
    "instructor": "TechCraft & Hội đồng Giảng viên CodeMind",
    "duration": "24:10",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "Bcu4yy-hYp8",
    "overview": "Hướng dẫn chi tiết khung 5 bước thiết kế kiến trúc hệ thống Enterprise Web App giúp đồ án tốt nghiệp thuyết phục tuyệt đối hội đồng doanh nghiệp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bước 1-2: Scope, SLO/SLA & Ước lượng Tải",
        "description": "Không thiết kế mò mẫm khi chưa định lượng quy mô."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Bước 3-5: Data Model, High-Level Design & Bottlenecks",
        "description": "Xác định Cache, Index, Partition và Single Point of Failure."
      }
    ],
    "defaultNotes": [
      {
        "id": "cap-11-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Trong buổi bảo vệ đồ án, luôn chủ động phân tích Trade-off (được gì & mất gì) và Điểm nghẽn (Bottleneck) của kiến trúc bạn chọn.",
        "createdAt": "Capstone Bookmark"
      }
    ],
    "resources": [
      {
        "title": "TechCraft — System Design Framework 5 Bước Chuẩn Senior",
        "url": "https://www.youtube.com/watch?v=Bcu4yy-hYp8",
        "type": "doc"
      },
      {
        "title": "TechCraft — System Design là gì? P1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      }
    ]
  }
};

export const LESSON_VIDEO_OVERRIDES: Record<string, Partial<VideoLectureInfo>> = {
  "oop:1.1": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "1.1",
    "title": "49. Tính kế thừa trong lập trình hướng đối tượng C++ (F8 Official)",
    "subtitle": "Xây dựng quan hệ Is-A, kế thừa public/protected và tái sử dụng mã nguồn C++",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "19:40",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "M6FwepHC6vM",
    "overview": "Bài giảng F8 Official giải thích cặn kẽ bản chất Tính kế thừa (Inheritance) trong C++ OOP: cách lớp dẫn xuất thừa hưởng thuộc tính/phương thức từ lớp cơ sở, phạm vi protected và tối ưu kiến trúc lớp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bài toán thực tế: Khi nào cần Tính kế thừa?",
        "description": "Tránh lặp code giữa các thực thể chung nhóm và thiết kế Base Class chuẩn."
      },
      {
        "timeSec": 185,
        "timestamp": "03:05",
        "title": "Cú pháp kế thừa & phạm vi protected",
        "description": "Phân biệt public, protected và private inheritance khi đóng gói dữ liệu."
      },
      {
        "timeSec": 520,
        "timestamp": "08:40",
        "title": "Ghi đè phương thức và gọi hàm tạo lớp cha",
        "description": "Constructor chaining bằng Member Initializer List trong C++."
      },
      {
        "timeSec": 910,
        "timestamp": "15:10",
        "title": "Tổng kết & thực hành Code Lab",
        "description": "Áp dụng kế thừa kết hợp đa hình cho hệ thống Employee."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-11-n1",
        "timeSec": 185,
        "timestamp": "03:05",
        "content": "protected cho phép lớp con đọc/ghi trực tiếp nhưng vẫn bảo vệ trước bên ngoài.",
        "createdAt": "F8 Bookmark"
      },
      {
        "id": "oop-11-n2",
        "timeSec": 520,
        "timestamp": "08:40",
        "content": "Luôn khai báo virtual ~Base() = default ở lớp cha có phương thức ảo.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "C++ Core Guidelines — Class Hierarchies",
        "url": "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-class",
        "type": "git"
      },
      {
        "title": "F8 Official C++ Series — Bài 49: Tính kế thừa",
        "url": "https://www.youtube.com/watch?v=M6FwepHC6vM",
        "type": "doc"
      },
      {
        "title": "cppreference — Derived classes",
        "url": "https://en.cppreference.com/w/cpp/language/derived_class",
        "type": "doc"
      }
    ]
  },
  "oop:1.2": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "1.2",
    "title": "51. Tính đa hình (Nạp chồng và ghi đè) | Polymorphism C++ (F8 Official)",
    "subtitle": "Phân biệt Function Overloading (Compile-time) và Method Overriding (Runtime)",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "21:15",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "j-LyRHfSY_Y",
    "overview": "Làm rõ sự khác nhau giữa đa hình tĩnh (Function/Operator Overloading lúc biên dịch) và đa hình động (Overriding qua hàm ảo trong C++).",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Đa hình Compile-time vs Runtime",
        "description": "Khái niệm Overloading cùng tên khác tham số vs Overriding ở lớp con."
      },
      {
        "timeSec": 310,
        "timestamp": "05:10",
        "title": "Kỹ thuật Member Initializer List",
        "description": "Truyền tham số lên constructor lớp cha an toàn và tối ưu hiệu năng."
      },
      {
        "timeSec": 720,
        "timestamp": "12:00",
        "title": "Từ khóa override bắt lỗi biên dịch",
        "description": "Tránh lỗi sai chữ ký hàm khiến đa hình không kích hoạt."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-12-n1",
        "timeSec": 310,
        "timestamp": "05:10",
        "content": "Initializer List chạy trước thân hàm tạo, bắt buộc dùng với const/reference member và lớp cha không có constructor mặc định.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "cppreference — override specifier (C++11+)",
        "url": "https://en.cppreference.com/w/cpp/language/override",
        "type": "doc"
      },
      {
        "title": "F8 Official C++ — Bài 51: Nạp chồng và ghi đè",
        "url": "https://www.youtube.com/watch?v=j-LyRHfSY_Y",
        "type": "doc"
      },
      {
        "title": "C++ Core Guidelines C.128",
        "url": "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rh-override",
        "type": "git"
      }
    ]
  },
  "oop:1.3": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "1.3",
    "title": "52. Tính đa hình (Phương thức ảo & Bảng vtable) (F8 Official)",
    "subtitle": "Cơ chế Dynamic Dispatch qua từ khóa virtual và con trỏ lớp cha trong C++",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "18:50",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "m2ZsYwZuns4",
    "overview": "Video F8 Official minh họa vì sao thiếu từ khóa virtual thì con trỏ lớp cha luôn gọi nhầm hàm lớp cha, và cách vtable giải quyết bài toán Dynamic Dispatch.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vấn đề Early Binding khi thiếu virtual",
        "description": "Con trỏ Base* gọi hàm theo kiểu khai báo tĩnh."
      },
      {
        "timeSec": 260,
        "timestamp": "04:20",
        "title": "Thêm từ khóa virtual & Late Binding",
        "description": "Cách C++ tra bảng vtable tại Runtime."
      },
      {
        "timeSec": 620,
        "timestamp": "10:20",
        "title": "Virtual Destructor chống rò rỉ bộ nhớ",
        "description": "Đảm bảo giải phóng đủ tài nguyên lớp con khi delete ptr."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-13-n1",
        "timeSec": 260,
        "timestamp": "04:20",
        "content": "Truyền theo const Employee& hoặc unique_ptr<Employee> để giữ nguyên vptr và tránh Object Slicing.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 52: Phương thức ảo (virtual)",
        "url": "https://www.youtube.com/watch?v=m2ZsYwZuns4",
        "type": "doc"
      },
      {
        "title": "cppreference — virtual function specifier",
        "url": "https://en.cppreference.com/w/cpp/language/virtual",
        "type": "doc"
      }
    ]
  },
  "oop:1.4": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "1.4",
    "title": "Tổng kết Nền tảng C++ & Ôn tập Kế thừa — Đa hình (F8 Official)",
    "subtitle": "Hệ thống hóa kiến thức chuẩn bị vượt qua Checkpoint Quiz Chương 1",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "12:40",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "Da1tpV9TMU0",
    "overview": "Tóm tắt các điểm bẫy thường gặp trong bài thi Chương 1 về khởi tạo, ghi đè override và quản lý bộ nhớ đa hình C++.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tổng ôn Inheritance & Member Initializer",
        "description": "Các lưu ý trước khi làm Quiz Chương 1."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Phân tích lỗi vtable & Object Slicing",
        "description": "Cách tránh mất thông tin lớp con khi truyền tham số."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-14-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Luôn dùng tham chiếu const& hoặc smart pointer cho hàm nhận đối tượng đa hình.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Giới thiệu & Tổng kết Nền tảng C++",
        "url": "https://www.youtube.com/watch?v=Da1tpV9TMU0",
        "type": "doc"
      }
    ]
  },
  "oop:2.1": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "2.1",
    "title": "53. Tính trừu tượng trong C++ | Pure Virtual & Interface (F8 Official)",
    "subtitle": "Thiết kế hợp đồng hành vi thuần ảo (= 0) và kiến trúc Loose Coupling",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "16:30",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "-G0bcwu_Vtw",
    "overview": "Hiểu sâu Tính trừu tượng (Abstraction) trong C++ qua từ khóa virtual ... = 0, biến lớp cơ sở thành hợp đồng hành vi an toàn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tính trừu tượng khác gì Đóng gói?",
        "description": "Ẩn chi tiết cài đặt phức tạp và chỉ lộ ra giao diện tối thiểu."
      },
      {
        "timeSec": 280,
        "timestamp": "04:40",
        "title": "Khai báo Pure Virtual Function (= 0)",
        "description": "Ép lớp con hiện thực đủ hợp đồng."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-21-n1",
        "timeSec": 280,
        "timestamp": "04:40",
        "content": "Dùng lớp chỉ chứa hàm thuần ảo làm Interface giúp dễ viết Unit Test giả lập (Mock).",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 53: Tính trừu tượng (Abstraction)",
        "url": "https://www.youtube.com/watch?v=-G0bcwu_Vtw",
        "type": "doc"
      },
      {
        "title": "cppreference — Abstract class",
        "url": "https://en.cppreference.com/w/cpp/language/abstract_class",
        "type": "doc"
      }
    ]
  },
  "oop:2.2": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "2.2",
    "title": "54. Hàm bạn (Friend function) & Tính đóng gói C++ (F8 Official)",
    "subtitle": "Kiểm soát quyền truy cập private member và thiết kế toán tử C++ sạch sẽ",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "14:55",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "F74kzmhQRA8",
    "overview": "Tìm hiểu cách dùng friend function/friend class hợp lý trong C++ để giữ nguyên tính đóng gói (Encapsulation) mà vẫn hỗ trợ toán tử ngoài lớp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Khi nào cần truy cập private từ hàm ngoài?",
        "description": "Bài toán operator<< và serializer."
      },
      {
        "timeSec": 260,
        "timestamp": "04:20",
        "title": "Cú pháp friend & cân nhắc thiết kế",
        "description": "Lưu ý không lạm dụng để giữ Loose Coupling."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-22-n1",
        "timeSec": 260,
        "timestamp": "04:20",
        "content": "Quan hệ friend trong C++ không có tính chất bắc cầu và không tự kế thừa sang lớp con.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 47: Tính đóng gói (Encapsulation)",
        "url": "https://www.youtube.com/watch?v=ab2TALCZruo",
        "type": "doc"
      },
      {
        "title": "F8 Official C++ — Bài 54: Hàm bạn (Friend function)",
        "url": "https://www.youtube.com/watch?v=F74kzmhQRA8",
        "type": "doc"
      }
    ]
  },
  "oop:2.3": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "2.3",
    "title": "47. Tính đóng gói trong C++ & Ôn tập Thiết kế Interface (F8 Official)",
    "subtitle": "Củng cố kiến thức đóng gói và Interface trước Checkpoint Quiz Chương 2",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "13:45",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "ab2TALCZruo",
    "overview": "Tổng kết nguyên tắc bảo vệ dữ liệu private, validate đầu vào ở constructor/setter và hợp đồng Interface.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bản chất Encapsulation",
        "description": "Ẩn chi tiết nội tại và bảo vệ invariant."
      },
      {
        "timeSec": 320,
        "timestamp": "05:20",
        "title": "Liên kết Interface với Encapsulation",
        "description": "Thiết kế API lớp rõ ràng."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-23-n1",
        "timeSec": 320,
        "timestamp": "05:20",
        "content": "Luôn kiểm tra hợp lệ ngay tại constructor và setter trước khi gán thuộc tính private.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 47. Tính đóng gói trong C++ & Ôn tập Thiết kế Interface (F8 Official)",
        "url": "https://www.youtube.com/watch?v=ab2TALCZruo",
        "type": "doc"
      },
      {
        "title": "F8 Official C++ — Bài 46: Class & Object",
        "url": "https://www.youtube.com/watch?v=jwvmfp3Kp8U",
        "type": "doc"
      }
    ]
  },
  "oop:3.1": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "3.1",
    "title": "35. Con trỏ trong C++ & Quản lý Bộ nhớ Hàng đợi (F8 Official)",
    "subtitle": "Làm chủ địa chỉ vùng nhớ Stack/Heap trước khi triển khai RAII Smart Pointers",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "20:15",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "uBfsM5RJWSI",
    "overview": "Video F8 Official phân tích bản chất con trỏ trong bộ nhớ, làm nền tảng vững chắc để áp dụng RAII, Bounded Queue và chống rò rỉ bộ nhớ Heap.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bản chất con trỏ & địa chỉ bộ nhớ RAM",
        "description": "Pointer lưu địa chỉ vùng nhớ như thế nào."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Truyền tham chiếu vs con trỏ & cấp phát động",
        "description": "Tránh lỗi dangling pointer và memory leak."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-31-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Trong Modern C++20, tuyệt đối ưu tiên std::make_unique thay vì cặp new/delete thô.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 35: Con trỏ (Pointer) trong C++",
        "url": "https://www.youtube.com/watch?v=uBfsM5RJWSI",
        "type": "doc"
      },
      {
        "title": "cppreference — std::unique_ptr",
        "url": "https://en.cppreference.com/w/cpp/memory/unique_ptr",
        "type": "doc"
      }
    ]
  },
  "oop:3.2": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "3.2",
    "title": "40. Con trỏ, Struct & Phòng thủ Ca biên trong C++ (F8 Official)",
    "subtitle": "Thao tác an toàn trên cấu trúc dữ liệu con trỏ và phòng chống dereference nullptr",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "17:10",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "T39JnItSmJU",
    "overview": "Thực hành kiểm tra nullptr, thao tác con trỏ struct và áp dụng Guard Clauses giữ bộ nhớ sạch sẽ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toán tử mũi tên -> trên con trỏ Struct",
        "description": "Truy cập thành viên struct qua pointer."
      },
      {
        "timeSec": 350,
        "timestamp": "05:50",
        "title": "Phòng thủ nullptr với Guard Clause",
        "description": "Thoát sớm an toàn trước khi đọc vùng nhớ."
      }
    ],
    "defaultNotes": [
      {
        "id": "oop-32-n1",
        "timeSec": 350,
        "timestamp": "05:50",
        "content": "Luôn kiểm tra `if (!ptr) return;` trước khi truy cập `ptr->field`.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 40: Con trỏ và Struct trong C++",
        "url": "https://www.youtube.com/watch?v=T39JnItSmJU",
        "type": "doc"
      },
      {
        "title": "Refactoring Guru — Replace Nested Conditional with Guard Clauses",
        "url": "https://refactoring.guru/replace-nested-conditional-with-guard-clauses",
        "type": "doc"
      }
    ]
  },
  "oop:3.3": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "3.3",
    "title": "46. Class, Object & Tổng kết Thiết kế Container C++ (F8 Official)",
    "subtitle": "Hệ thống hóa thiết kế lớp đóng gói cấu trúc dữ liệu Bounded Queue",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "15:30",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "jwvmfp3Kp8U",
    "overview": "Củng cố lại đóng gói trạng thái lớp và các phương thức giao tiếp sạch trước Checkpoint Quiz Chương 3.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Đóng gói dữ liệu nội bộ trong Class",
        "description": "Bảo vệ head_, tail_, count_ khỏi sửa trực tiếp."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 46. Class, Object & Tổng kết Thiết kế Container C++ (F8 Official)",
        "url": "https://www.youtube.com/watch?v=jwvmfp3Kp8U",
        "type": "doc"
      },
      {
        "title": "cppreference — std::array & Circular Containers",
        "url": "https://en.cppreference.com/w/cpp/container/array",
        "type": "doc"
      }
    ]
  },
  "oop:4.1": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "4.1",
    "title": "49. Ôn tập Tổng hợp Kế thừa & Nghiệm thu Mã nguồn C++ (F8 Official)",
    "subtitle": "Rà soát toàn bộ phân cấp lớp trước vòng Phản biện Đồ án",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "19:40",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "M6FwepHC6vM",
    "overview": "Rà soát cấu trúc lớp cơ sở, lớp dẫn xuất và các tiêu chuẩn sạch mã nguồn chuẩn bị nghiệm thu Chương 4.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tiêu chuẩn Clean Code trong dự án OOP",
        "description": "Tách file header, kiểm soát độ sâu kế thừa."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 49. Ôn tập Tổng hợp Kế thừa & Nghiệm thu Mã nguồn C++ (F8 Official)",
        "url": "https://www.youtube.com/watch?v=M6FwepHC6vM",
        "type": "doc"
      },
      {
        "title": "Git Commit Best Practices — Conventional Commits",
        "url": "https://www.conventionalcommits.org/",
        "type": "git"
      }
    ]
  },
  "oop:4.2": {
    "subjectId": "oop",
    "subjectCode": "CS201",
    "lessonId": "4.2",
    "title": "52. Tổng kết Đa hình & Kiểm chứng Toàn vẹn C++ (F8 Official)",
    "subtitle": "Hoàn thiện tư duy Dynamic Dispatch & Memory Safety trước nghiệm thu",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Nguyễn Phước",
    "duration": "18:50",
    "updatedAt": "CodeMind CS201 · 2026",
    "youtubeId": "m2ZsYwZuns4",
    "overview": "Tổng kết toàn bộ cơ chế virtual table, destructor ảo và kiến trúc lớp đa hình trước bài thi cuối môn CS201.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát trước khi bảo vệ đồ án CS201",
        "description": "Các câu hỏi phản biện thường gặp về vtable & RAII."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 52. Tổng kết Đa hình & Kiểm chứng Toàn vẹn C++ (F8 Official)",
        "url": "https://www.youtube.com/watch?v=m2ZsYwZuns4",
        "type": "doc"
      },
      {
        "title": "C++ Core Guidelines — Complete Index",
        "url": "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
        "type": "git"
      }
    ]
  },
  "dsa:1.1": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "1.1",
    "title": "#2 Biểu Diễn Đồ Thị: Ma Trận Kề, Danh Sách Kề & Danh Sách Cạnh (28tech)",
    "subtitle": "Nền tảng tổ chức cấu trúc dữ liệu đồ thị tối ưu bộ nhớ trong C++",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "24:10",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "JtWcUHRyqkA",
    "overview": "Hướng dẫn chi tiết 3 phương pháp biểu diễn đồ thị trên máy tính và tiêu chí chọn Danh sách kề cho thuật toán 10^5 đỉnh.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ma trận kề (Adjacency Matrix)",
        "description": "Ưu nhược điểm khi kiểm tra cạnh trong O(1)."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Danh sách kề (Adjacency List)",
        "description": "Cách lưu tối ưu cho đồ thị thưa lớn."
      }
    ],
    "defaultNotes": [
      {
        "id": "dsa-11-n1",
        "timeSec": 450,
        "timestamp": "07:30",
        "content": "Luôn dùng Danh sách kề vector<vector<pair<int,int>>> cho Dijkstra 10^5 đỉnh.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "28tech — Bài 2: Biểu diễn Đồ thị Ma trận kề & Danh sách kề",
        "url": "https://www.youtube.com/watch?v=JtWcUHRyqkA",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Breadth-First Search",
        "url": "https://cp-algorithms.com/graph/breadth-first-search.html",
        "type": "doc"
      }
    ]
  },
  "dsa:1.2": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "1.2",
    "title": "#21 Thuật Toán Dijkstra | Tìm Đường Đi Ngắn Nhất (28tech)",
    "subtitle": "Min-Heap Priority Queue, Lazy Deletion & độ phức tạp O((V+E) log V)",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "28:15",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "JqOPBodZmLk",
    "overview": "Video bài giảng từng bước về Dijkstra trên danh sách kề kết hợp priority_queue min-heap trong C++.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ý tưởng tham lam (Greedy) của Dijkstra",
        "description": "Cố định đỉnh có khoảng cách nhỏ nhất tiếp theo."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Cài đặt Priority Queue Min-Heap C++",
        "description": "Thao tác push cặp {dist, node} và relax cạnh."
      }
    ],
    "defaultNotes": [
      {
        "id": "dsa-12-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Nhớ dùng std::greater<P> trong priority_queue để đảo từ Max-Heap mặc định thành Min-Heap.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "28tech — #21 Thuật toán Dijkstra Tìm đường đi ngắn nhất",
        "url": "https://www.youtube.com/watch?v=JqOPBodZmLk",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Dijkstra on Sparse Graphs",
        "url": "https://cp-algorithms.com/graph/dijkstra_sparse.html",
        "type": "doc"
      }
    ]
  },
  "dsa:1.3": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "1.3",
    "title": "#15 Thuật Toán Kruskal & DSU Tìm Cây Khung Cực Tiểu (28tech)",
    "subtitle": "Sắp xếp cạnh, phát hiện chu trình O(1) với Union-Find Path Compression",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "26:40",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "i1Xqm4ZNaC8",
    "overview": "Video hướng dẫn cài đặt trọn vẹn thuật toán Kruskal tìm Minimum Spanning Tree kết hợp Disjoint Set Union.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bài toán Cây khung nhỏ nhất (MST)",
        "description": "Kết nối tất cả N đỉnh với tổng trọng số nhỏ nhất."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Ghép DSU Path Compression vào Kruskal",
        "description": "Kiểm tra cùng thành phần liên thông siêu nhanh."
      }
    ],
    "defaultNotes": [
      {
        "id": "dsa-13-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "Khi số cạnh đã chọn đạt V - 1 thì dừng vòng lặp sớm để tối ưu thời gian.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "28tech — #14 Cấu trúc dữ liệu Disjoint Set Union (DSU)",
        "url": "https://www.youtube.com/watch?v=fWLCQAwDt-0",
        "type": "doc"
      },
      {
        "title": "28tech — #15 Thuật toán Kruskal Tìm Cây Khung Cực Tiểu",
        "url": "https://www.youtube.com/watch?v=i1Xqm4ZNaC8",
        "type": "doc"
      }
    ]
  },
  "dsa:2.1": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "2.1",
    "title": "Nền tảng Độ phức tạp & Cấu trúc Cây Truy vấn Đoạn (28tech Track)",
    "subtitle": "Tư duy phân rã tập dữ liệu theo lũy thừa bậc 2 đạt O(log N)",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "22:30",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "-DocD-YLlPY",
    "overview": "Làm rõ cách tổ chức cây quản lý đoạn O(log N), mở rộng từ đồ thị và chỉ mục nhị phân.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao mảng cộng dồn không chịu được Update?",
        "description": "Đánh đổi giữa Read O(1) vs Write O(N)."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Thủ thuật LSB (i & -i)",
        "description": "Cách Fenwick Tree nhảy bước trên cây nhị phân ẩn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Nền tảng Độ phức tạp & Cấu trúc Cây Truy vấn Đoạn (28tech Track)",
        "url": "https://www.youtube.com/watch?v=-DocD-YLlPY",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Fenwick Tree",
        "url": "https://cp-algorithms.com/data_structures/fenwick.html",
        "type": "doc"
      }
    ]
  },
  "dsa:2.2": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "2.2",
    "title": "33. Đệ quy Chia để trị & Cơ chế Phân đoạn Cây (F8 Official)",
    "subtitle": "Hiểu sâu tư duy chia đôi đoạn [l, r] trên Call Stack của Segment Tree",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Trần Minh Quân",
    "duration": "17:25",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "Kuw9OOhEuCw",
    "overview": "Làm chủ cơ chế đệ quy chia đôi miền dữ liệu [l..mid] và [mid+1..r] giúp viết Segment Tree không sai biên.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Điểm dừng đệ quy (l == r)",
        "description": "Xử lý nút lá trên Segment Tree."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Trộn kết quả từ 2 nút con",
        "description": "Nguyên lý Combine Bottom-Up."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 33. Đệ quy Chia để trị & Cơ chế Phân đoạn Cây (F8 Official)",
        "url": "https://www.youtube.com/watch?v=Kuw9OOhEuCw",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Segment Tree",
        "url": "https://cp-algorithms.com/data_structures/segment_tree.html",
        "type": "doc"
      }
    ]
  },
  "dsa:2.3": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "2.3",
    "title": "#16 Thực hành Tối ưu Cấu trúc Cây & Đồ thị (28tech)",
    "subtitle": "Tổng kết tối ưu hằng số và tránh lỗi tràn biên mảng cây",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "19:20",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "HZ2DnQTiSgM",
    "overview": "Rà soát các kỹ thuật tối ưu C++ STL, bộ nhớ vector và kiểm tra biên cho Chương 2.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tránh cấp phát lặp & kiểm tra biên",
        "description": "Tối ưu cho stress test 100.000 truy vấn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: #16 Thực hành Tối ưu Cấu trúc Cây & Đồ thị (28tech)",
        "url": "https://www.youtube.com/watch?v=HZ2DnQTiSgM",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Data Structures Overview",
        "url": "https://cp-algorithms.com/",
        "type": "doc"
      }
    ]
  },
  "dsa:3.1": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "3.1",
    "title": "33. Đệ quy, Call Stack & Tư duy Quy hoạch động (F8 Official)",
    "subtitle": "Nhận diện bài toán con trùng lặp và tối ưu cây đệ quy",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Trần Minh Quân",
    "duration": "17:25",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "Kuw9OOhEuCw",
    "overview": "Video F8 Official chỉ rõ cách hoạt động của Stack Frame trong hàm đệ quy và lý do cây Fibonacci bùng nổ hàm mũ nếu không ghi nhớ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Base Case & ngăn Stack Overflow",
        "description": "Điều kiện dừng chuẩn."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Tại sao cần Memoization?",
        "description": "Khử trùng lặp nhánh tính toán."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official C++ — Bài 33: Đệ quy & Call Stack",
        "url": "https://www.youtube.com/watch?v=Kuw9OOhEuCw",
        "type": "doc"
      }
    ]
  },
  "dsa:3.2": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "3.2",
    "title": "#14 Tư duy Tối ưu Trạng thái & Tập hợp Rời nhau (28tech)",
    "subtitle": "Tư duy phân rã bài toán và nén không gian lưu trữ",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "24:00",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "fWLCQAwDt-0",
    "overview": "Phân tích kỹ thuật nén mảng trạng thái trong thuật toán để đạt tốc độ cao nhất trên tập dữ liệu lớn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chuyển đổi trạng thái không dư thừa",
        "description": "Nguyên tắc thiết kế bảng lưu vết tối gọn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: #14 Tư duy Tối ưu Trạng thái & Tập hợp Rời nhau (28tech)",
        "url": "https://www.youtube.com/watch?v=fWLCQAwDt-0",
        "type": "doc"
      },
      {
        "title": "CP-Algorithms — Dynamic Programming Introduction",
        "url": "https://cp-algorithms.com/dynamic_programming/intro-to-dp.html",
        "type": "doc"
      }
    ]
  },
  "dsa:3.3": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "lessonId": "3.3",
    "title": "Ôn tập Đồ thị & Chiến lược Chọn Thuật toán (28tech)",
    "subtitle": "Nhận diện nhanh mẫu bài và độ phức tạp chuẩn cho kỳ thi CS202",
    "instructor": "28tech & Thầy Trần Minh Quân",
    "duration": "28:15",
    "updatedAt": "CodeMind CS202 · 2026",
    "youtubeId": "JqOPBodZmLk",
    "overview": "Rà soát các mẫu bài kinh điển từ Dijkstra đến cây khung và DP trước bài đánh giá tổng kết.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tổng ôn nhận diện đề bài",
        "description": "Trọng số dương, âm, hay truy vấn đoạn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Đồ thị & Chiến lược Chọn Thuật toán (28tech)",
        "url": "https://www.youtube.com/watch?v=JqOPBodZmLk",
        "type": "doc"
      },
      {
        "title": "Competitive Programmer's Handbook (CSES)",
        "url": "https://cses.fi/book/book.pdf",
        "type": "slide"
      }
    ]
  },
  "network:1.1": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "1.1",
    "title": "Hiểu Mô Hình OSI Và Giao Thức HTTP, TCP, UDP (Network Core)",
    "subtitle": "Cách các tầng Transport & Application đóng gói Header qua 3-Way Handshake",
    "instructor": "s2sontech & Thầy Trần Minh Quân",
    "duration": "22:40",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "Ohuxcw7Bx5E",
    "overview": "Phân tích rõ sự khác biệt giữa TCP tin cậy có bắt tay 3 bước và UDP tốc độ cao không kết nối.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "7 Tầng OSI & 4 Tầng TCP/IP",
        "description": "Đóng gói Encapsulation từng tầng."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "TCP vs UDP & 3-Way Handshake",
        "description": "SYN, SYN-ACK, ACK hoạt động ra sao."
      }
    ],
    "defaultNotes": [
      {
        "id": "net-11-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "Video livestream/game chọn UDP; truyền file và REST API chọn TCP nhờ đảm bảo thứ tự và không mất gói.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "s2sontech — Mô hình OSI & Giao thức TCP/UDP/HTTP",
        "url": "https://www.youtube.com/watch?v=Ohuxcw7Bx5E",
        "type": "doc"
      },
      {
        "title": "RFC 9293 — Transmission Control Protocol (TCP)",
        "url": "https://datatracker.ietf.org/doc/html/rfc9293",
        "type": "doc"
      }
    ]
  },
  "network:1.2": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "1.2",
    "title": "Tại sao HTTP/3 bỏ TCP để dùng UDP (QUIC)?",
    "subtitle": "Khắc phục Head-of-Line Blocking và tăng tốc bắt tay kết nối TLS 1.3",
    "instructor": "Beernary & Võ Nhật Huy",
    "duration": "15:20",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "pubUwIyYAQA",
    "overview": "So sánh trực quan đường truyền HTTP/1.1, HTTP/2 và HTTP/3 QUIC trên cùng một mạng có độ rớt gói cao.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "TCP Head-of-Line Blocking là gì?",
        "description": "Khi 1 gói rớt làm kẹt toàn bộ stream HTTP/2."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Kiến trúc Stream độc lập của QUIC",
        "description": "Vừa đảm bảo tin cậy như TCP, vừa không khóa chéo stream."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — Giao thức HTTP Protocol",
        "url": "https://www.youtube.com/watch?v=SdcdneSdoV4",
        "type": "doc"
      },
      {
        "title": "Beernary — Tại sao HTTP/3 bỏ TCP để dùng UDP?",
        "url": "https://www.youtube.com/watch?v=pubUwIyYAQA",
        "type": "doc"
      }
    ]
  },
  "network:1.3": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "1.3",
    "title": "HTTP Protocol | Giao thức HTTP & Client-Server (F8 Official)",
    "subtitle": "Củng cố lại mô hình Request-Response trước Checkpoint Quiz Chương 1",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "15:10",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "SdcdneSdoV4",
    "overview": "Ôn lại cách HTTP vận hành bên trên kết nối TCP/IP.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "HTTP Header & Request Lifecycle",
        "description": "Tổng hợp mô hình giao tiếp mạng Web."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: HTTP Protocol | Giao thức HTTP & Client-Server (F8 Official)",
        "url": "https://www.youtube.com/watch?v=SdcdneSdoV4",
        "type": "doc"
      },
      {
        "title": "RFC 9114 — HTTP/3 Specification",
        "url": "https://datatracker.ietf.org/doc/html/rfc9114",
        "type": "doc"
      }
    ]
  },
  "network:2.1": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "2.1",
    "title": "Virtual Memory Explained: Paging, Page Table & TLB",
    "subtitle": "Cơ chế MMU dịch địa chỉ ảo sang RAM vật lý và xử lý Page Fault",
    "instructor": "BitLemon & Thầy Trần Minh Quân",
    "duration": "16:25",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "fGP6VHxqkIM",
    "overview": "Giải thích từng bước trang bộ nhớ 4KB, Page Table, TLB hit/miss và xử lý Page Fault trong Hệ điều hành hiện đại.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vì sao cần Bộ nhớ ảo (Virtual Memory)?",
        "description": "Cô lập tiến trình và chạy chương trình lớn hơn RAM thật."
      },
      {
        "timeSec": 340,
        "timestamp": "05:40",
        "title": "Bảng trang (Page Table) & TLB Cache",
        "description": "Tối ưu tốc độ dịch địa chỉ."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "BitLemon — Virtual Memory Explained (Paging & TLB)",
        "url": "https://www.youtube.com/watch?v=fGP6VHxqkIM",
        "type": "doc"
      },
      {
        "title": "OSTEP — Operating Systems: Three Easy Pieces (Paging)",
        "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
        "type": "slide"
      }
    ]
  },
  "network:2.2": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "2.2",
    "title": "Hệ điều hành: Virtual Memory, Thrashing & Quản lý Tài nguyên",
    "subtitle": "Phân trang theo yêu cầu (Demand Paging), Working Set và tránh Thrashing",
    "instructor": "Bộ môn Hệ điều hành · CodeMind AI Lab",
    "duration": "29:10",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "swQuqtchCyc",
    "overview": "Phân tích chi tiết Page Replacement (LRU), Thrashing khi quá tải tiến trình và cơ chế quản trị tài nguyên Hệ điều hành.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Demand Paging & Page Replacement LRU",
        "description": "Thuật toán thay trang tối ưu."
      },
      {
        "timeSec": 500,
        "timestamp": "08:20",
        "title": "Hiện tượng Thrashing & Cách kiểm soát",
        "description": "Giữ tập Working Set nằm gọn trong RAM."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Doll Nguyễn Studio — Operating Systems: Virtual Memory & Paging",
        "url": "https://www.youtube.com/watch?v=swQuqtchCyc",
        "type": "doc"
      }
    ]
  },
  "network:2.3": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "2.3",
    "title": "Tổng ôn Bộ nhớ ảo & TLB trước Quiz Chương 2",
    "subtitle": "Củng cố tính toán Page Table và bảo vệ vùng nhớ đa luồng",
    "instructor": "BitLemon & Thầy Trần Minh Quân",
    "duration": "16:25",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "fGP6VHxqkIM",
    "overview": "Hệ thống lại toàn bộ quá trình MMU tra cứu Page Table và TLB trước khi làm Quiz Chương 2.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập VPN + Offset & TLB",
        "description": "Các câu hỏi định lượng thường gặp."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Bộ nhớ ảo & TLB trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=fGP6VHxqkIM",
        "type": "doc"
      },
      {
        "title": "OSTEP — Concurrency & Locks",
        "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
        "type": "slide"
      }
    ]
  },
  "network:3.1": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "3.1",
    "title": "DNS, Định tuyến IP & Lớp Giao vận Internet (CS205)",
    "subtitle": "Cách địa chỉ IP, DNS và cổng Port định danh ứng dụng qua mạng toàn cầu",
    "instructor": "s2sontech & Thầy Trần Minh Quân",
    "duration": "22:40",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "Ohuxcw7Bx5E",
    "overview": "Liên kết kiến thức DNS, địa chỉ IP và các giao thức vận chuyển TCP/UDP trong mô hình truyền thông Internet.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Định danh thiết bị qua IP & Port",
        "description": "Cách gói tin tìm đúng máy chủ và dịch vụ."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: DNS, Định tuyến IP & Lớp Giao vận Internet (CS205)",
        "url": "https://www.youtube.com/watch?v=Ohuxcw7Bx5E",
        "type": "doc"
      },
      {
        "title": "Cloudflare Learning — What is DNS?",
        "url": "https://www.cloudflare.com/learning/dns/what-is-dns/",
        "type": "doc"
      }
    ]
  },
  "network:3.2": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "3.2",
    "title": "TLS 1.3, Zero-RTT & Tối ưu Kết nối HTTPS Hiện đại",
    "subtitle": "Giảm độ trễ bắt tay mạng bảo mật từ 2-3 RTT xuống 1-RTT / 0-RTT",
    "instructor": "Beernary & Võ Nhật Huy",
    "duration": "15:20",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "pubUwIyYAQA",
    "overview": "So sánh chi phí RTT của TCP+TLS truyền thống với TLS 1.3 và giao thức hiện đại.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rút gọn vòng bắt tay mật mã",
        "description": "Cách TLS 1.3 tiết kiệm 1 RTT toàn phần."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: TLS 1.3, Zero-RTT & Tối ưu Kết nối HTTPS Hiện đại",
        "url": "https://www.youtube.com/watch?v=pubUwIyYAQA",
        "type": "doc"
      },
      {
        "title": "Cloudflare — What happens in a TLS Handshake?",
        "url": "https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/",
        "type": "doc"
      }
    ]
  },
  "network:3.3": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "lessonId": "3.3",
    "title": "Tổng kết Vòng đời Giao tiếp Mạng Client - Server (F8 Official)",
    "subtitle": "Hệ thống hóa kiến thức CS205 trước khi chuyển sang Frontend Hiện đại",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "15:10",
    "updatedAt": "CodeMind CS205 · 2026",
    "youtubeId": "SdcdneSdoV4",
    "overview": "Liên kết HTTP với tầng vận chuyển TCP/IP và Hệ điều hành.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh Client - Server",
        "description": "Khép lại phần nền tảng mạng và hệ thống."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Vòng đời Giao tiếp Mạng Client - Server (F8 Official)",
        "url": "https://www.youtube.com/watch?v=SdcdneSdoV4",
        "type": "doc"
      },
      {
        "title": "High Performance Browser Networking (hpbn.co)",
        "url": "https://hpbn.co/",
        "type": "doc"
      }
    ]
  },
  "frontend:1.1": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "1.1",
    "title": "ReactJS là gì? Tại sao nên học ReactJS & Component Thinking (F8 Official)",
    "subtitle": "Tư duy UI chia nhỏ thành Component, Virtual DOM và luồng dữ liệu một chiều",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "18:35",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "x0fSBAgBrOQ",
    "overview": "Bài mở đầu khóa ReactJS tại F8 Official giải thích lý do SPA, Virtual DOM và Component Architecture thống trị Frontend.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "SPA vs MPA trong thực tế",
        "description": "Không tải lại toàn trang khi điều hướng."
      },
      {
        "timeSec": 290,
        "timestamp": "04:50",
        "title": "Virtual DOM & Diffing",
        "description": "Cập nhật tối thiểu DOM thật."
      }
    ],
    "defaultNotes": [
      {
        "id": "fe-11-n1",
        "timeSec": 290,
        "timestamp": "04:50",
        "content": "Tránh đụng trực tiếp document.querySelector trong React; luôn để React quản lý DOM qua state.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — ReactJS là gì & Tại sao nên học ReactJS",
        "url": "https://www.youtube.com/watch?v=x0fSBAgBrOQ",
        "type": "doc"
      },
      {
        "title": "React Official Docs — Thinking in React",
        "url": "https://react.dev/learn/thinking-in-react",
        "type": "doc"
      }
    ]
  },
  "frontend:1.2": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "1.2",
    "title": "SPA/MPA là gì? Hiểu rõ Kiến trúc Single Page Application (F8 Official)",
    "subtitle": "So sánh tốc độ chuyển trang, trải nghiệm UX, SEO và dung lượng tải ban đầu",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "16:40",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "30sMCciFIAM",
    "overview": "Bài giảng F8 Official giải thích cặn kẽ ưu nhược điểm của SPA vs MPA trong thiết kế kiến trúc Web.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "MPA truyền thống & Server Roundtrip",
        "description": "Cơ chế request HTML mỗi lần click link."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "SPA & Client-side Rendering",
        "description": "JSON API + History API giúp giữ nguyên app shell."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — SPA / MPA là gì trong ReactJS?",
        "url": "https://www.youtube.com/watch?v=30sMCciFIAM",
        "type": "doc"
      }
    ]
  },
  "frontend:1.3": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "1.3",
    "title": "Tổng ôn Component Thinking & Virtual DOM (F8 Official)",
    "subtitle": "Chuẩn bị vượt qua Checkpoint Quiz Chương 1",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "18:35",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "x0fSBAgBrOQ",
    "overview": "Hệ thống hóa lại kiến thức nền tảng React trước khi học sâu về Hooks.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập Props & Virtual DOM",
        "description": "Củng cố luồng dữ liệu một chiều."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Component Thinking & Virtual DOM (F8 Official)",
        "url": "https://www.youtube.com/watch?v=x0fSBAgBrOQ",
        "type": "doc"
      },
      {
        "title": "React.dev — Preserving and Resetting State",
        "url": "https://react.dev/learn/preserving-and-resetting-state",
        "type": "doc"
      }
    ]
  },
  "frontend:2.1": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "2.1",
    "title": "Todolist with useState() & State Bất biến (F8 Official)",
    "subtitle": "Thực hành thêm/xóa state mảng bất biến và cập nhật UI phản ứng tức thì",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "22:50",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "bpVFSiNsFHY",
    "overview": "Video F8 Official hướng dẫn chi tiết cách thao tác mảng state với spread operator, localStorage và tránh lỗi mutate state.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Two-way binding input với useState",
        "description": "Đồng bộ state vào ô nhập liệu."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Thêm/sửa danh sách bất biến",
        "description": "Dùng callback prev => [...prev, item]."
      }
    ],
    "defaultNotes": [
      {
        "id": "fe-21-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Luôn đọc/ghi theo callback `prev => ...` khi cập nhật dựa trên trạng thái cũ.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Todolist with useState() Hook",
        "url": "https://www.youtube.com/watch?v=bpVFSiNsFHY",
        "type": "doc"
      },
      {
        "title": "F8 Official — Two-way Binding trong React Hooks",
        "url": "https://www.youtube.com/watch?v=CVaEWBFpxhc",
        "type": "doc"
      }
    ]
  },
  "frontend:2.2": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "2.2",
    "title": "React useEffect Hook chi tiết & Cleanup Function (F8 Official)",
    "subtitle": "Làm chủ Side Effects, Dependency Array và phòng chống Memory Leak",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "28:10",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "hjIxfXKmkjk",
    "overview": "Bài giảng kinh điển tại F8 Official giải thích cặn kẽ thứ tự chạy Callback, Cleanup Function và cách làm DOM Events / Timer chuẩn xác.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "3 Trường hợp của Dependency Array",
        "description": "Khác biệt giữa không mảng, mảng rỗng [] và [deps]."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Cleanup Function chống Memory Leak",
        "description": "Thứ tự Cleanup luôn chạy trước Effect kế tiếp và trước khi Unmount."
      }
    ],
    "defaultNotes": [
      {
        "id": "fe-22-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Cleanup function luôn chạy TRƯỚC khi callback effect tiếp theo thực thi và khi component unmount.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — React useEffect Hook Chi tiết cho Người mới",
        "url": "https://www.youtube.com/watch?v=hjIxfXKmkjk",
        "type": "doc"
      },
      {
        "title": "React Official — You Might Not Need an Effect",
        "url": "https://react.dev/learn/you-might-not-need-an-effect",
        "type": "doc"
      }
    ]
  },
  "frontend:2.3": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "2.3",
    "title": "Two-way Binding & Ôn tập React Hooks (F8 Official)",
    "subtitle": "Củng cố kiểm soát Form và vòng đời Hook trước Quiz Chương 2",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "17:20",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "CVaEWBFpxhc",
    "overview": "Tổng hợp thực hành controlled components, mảng checkbox và quy tắc chuẩn Hooks.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Controlled Components & Radio/Checkbox",
        "description": "Mẫu viết Form sạch sẽ trong React."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Two-way Binding & Ôn tập React Hooks (F8 Official)",
        "url": "https://www.youtube.com/watch?v=CVaEWBFpxhc",
        "type": "doc"
      },
      {
        "title": "React Official — Rules of Hooks",
        "url": "https://react.dev/reference/rules/rules-of-hooks",
        "type": "doc"
      }
    ]
  },
  "frontend:3.1": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "3.1",
    "title": "React Server Components (RSC) vs Client Components trong Next.js",
    "subtitle": "Tối ưu Bundle Size và phân chia ranh giới 'use client' chuẩn Next.js 15",
    "instructor": "Võ Nhật Huy & Ban Cố vấn Web",
    "duration": "18:45",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "tUvnkIBCnm0",
    "overview": "Phân tích rạch ròi Server Component chạy ở đâu, khi nào phải dùng 'use client' và kỹ thuật lồng Server Component qua children.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Mặc định RSC trong App Router",
        "description": "Truy cập trực tiếp dữ liệu trên Server."
      },
      {
        "timeSec": 400,
        "timestamp": "06:40",
        "title": "Composition Pattern qua props.children",
        "description": "Không kéo cả cây con thành Client Component."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Code Đủ Thứ — Server Components vs Client Components trong Next.js",
        "url": "https://www.youtube.com/watch?v=tUvnkIBCnm0",
        "type": "doc"
      },
      {
        "title": "Next.js Official Docs — Server and Client Composition",
        "url": "https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns",
        "type": "doc"
      }
    ]
  },
  "frontend:3.2": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "3.2",
    "title": "Route Handler vs Server Actions trong Next.js 15 App Router",
    "subtitle": "Thay đổi dữ liệu an toàn từ Client lên Server và đồng bộ Cache tức thì",
    "instructor": "Võ Nhật Huy & Phan Đình Nghị",
    "duration": "19:30",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "5aiu6hzflhI",
    "overview": "So sánh trực tiếp Route Handler REST truyền thống và Server Actions chuẩn React 19 / Next.js 15.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Server Actions hoạt động thế nào dưới lớp HTTP?",
        "description": "POST endpoint tự sinh & RPC protocol."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Bảo mật & Xác thực bên trong Server Action",
        "description": "Chống giả mạo payload với Zod + Session check."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Unicode VN — So sánh Route Handler và Server Actions trong Next.js",
        "url": "https://www.youtube.com/watch?v=5aiu6hzflhI",
        "type": "doc"
      },
      {
        "title": "Code Đủ Thứ — Tìm hiểu Server Action trong Next.js",
        "url": "https://www.youtube.com/watch?v=muOzymr8TYM",
        "type": "doc"
      }
    ]
  },
  "frontend:3.3": {
    "subjectId": "frontend",
    "subjectCode": "CS210",
    "lessonId": "3.3",
    "title": "Tổng kết Server Actions & Kiến trúc Next.js Fullstack",
    "subtitle": "Chuẩn bị vượt qua Checkpoint Quiz cuối môn CS210",
    "instructor": "Võ Nhật Huy & Phan Đình Nghị",
    "duration": "17:15",
    "updatedAt": "CodeMind CS210 · 2026",
    "youtubeId": "muOzymr8TYM",
    "overview": "Rà soát lại luồng Server Actions, caching và ranh giới serialize Server-Client.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tổng hợp RSC + Actions",
        "description": "Kiểm chứng sẵn sàng cho CS215 Real-time."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Server Actions & Kiến trúc Next.js Fullstack",
        "url": "https://www.youtube.com/watch?v=muOzymr8TYM",
        "type": "doc"
      },
      {
        "title": "Next.js Official Docs — App Router Architecture",
        "url": "https://nextjs.org/docs/app",
        "type": "doc"
      }
    ]
  },
  "realtime:1.1": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "1.1",
    "title": "Đồng bộ, Bất đồng bộ & Event Loop trong JavaScript (CS215)",
    "subtitle": "Call Stack, Web APIs, Microtask Queue (Promise) vs Callback Queue",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "20:30",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "jfQUw8QxaZc",
    "overview": "Giải thích chi tiết cơ chế Event Loop điều phối Promise, Async/Await và nguyên nhân không được block Main Thread.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Single Thread & Blocking Call Stack",
        "description": "Vì sao vòng lặp đồng bộ nặng làm đơ giao diện."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Event Loop, Microtasks vs Macrotasks",
        "description": "Ưu tiên giải phóng Promise queue trước setTimeout."
      }
    ],
    "defaultNotes": [
      {
        "id": "rt-11-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Promise.then luôn chạy trước setTimeout(..., 0) vì Microtask Queue có độ ưu tiên cao hơn Macrotask.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Firelop — Đồng bộ, Bất đồng bộ & Event Loop trong JavaScript",
        "url": "https://www.youtube.com/watch?v=jfQUw8QxaZc",
        "type": "doc"
      },
      {
        "title": "F8 Official — Promise (sync / async) trong JavaScript",
        "url": "https://www.youtube.com/watch?v=QJmNEqy0zV0",
        "type": "doc"
      }
    ]
  },
  "realtime:1.2": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "1.2",
    "title": "Closure trong JavaScript nâng cao | Lexical Scope & State (F8 Official)",
    "subtitle": "Ứng dụng Closure tạo Debounce, Private Store và phòng tránh Stale Closure",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "21:10",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "xtQtGKL0NCI",
    "overview": "Hiểu sâu cách bộ máy V8 lưu giữ môi trường từ vựng trong Closure để làm chủ listener bất đồng bộ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Lexical Scope & Closure là gì?",
        "description": "Cách hàm con ghi nhớ biến của hàm cha."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Private State & Debounce",
        "description": "Mẫu thiết kế thực tế trên React/Web App."
      }
    ],
    "defaultNotes": [
      {
        "id": "rt-12-n1",
        "timeSec": 360,
        "timestamp": "06:00",
        "content": "Luôn cleanup handler tạo bởi closure khi unmount để Garbage Collector thu hồi vùng nhớ.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Closure trong JavaScript nâng cao",
        "url": "https://www.youtube.com/watch?v=xtQtGKL0NCI",
        "type": "doc"
      }
    ]
  },
  "realtime:1.3": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "1.3",
    "title": "Promise (Sync / Async) & Kiểm chứng Event Loop (F8 Official)",
    "subtitle": "Củng cố xâu chuỗi Promise và xử lý lỗi trước Quiz Chương 1",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "18:10",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "QJmNEqy0zV0",
    "overview": "Ôn tập Promise States (Pending, Fulfilled, Rejected) và Promise.all.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vòng đời Promise & Bắt lỗi",
        "description": "Khắc phục Callback Hell triệt để."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Promise (Sync / Async) & Kiểm chứng Event Loop (F8 Official)",
        "url": "https://www.youtube.com/watch?v=QJmNEqy0zV0",
        "type": "doc"
      },
      {
        "title": "MDN — The Event Loop",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop",
        "type": "doc"
      }
    ]
  },
  "realtime:2.1": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "2.1",
    "title": "Quản lý Đồng bộ Trạng thái Dữ liệu với Fetch API & State (F8 Official)",
    "subtitle": "Cập nhật State UI nhất quán sau mỗi thao tác Create/Update/Delete lên Server",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "24:15",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "TRjVXmk8q8I",
    "overview": "Thực hành giữ đồng bộ 100% giữa trạng thái trên Server và bộ nhớ Client React.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vấn đề đồng bộ Server State",
        "description": "Tránh reload toàn trang sau khi mutate dữ liệu."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — Đồng bộ Dữ liệu Client - Server với Fetch API",
        "url": "https://www.youtube.com/watch?v=TRjVXmk8q8I",
        "type": "doc"
      },
      {
        "title": "TanStack Query Official Docs",
        "url": "https://tanstack.com/query/latest",
        "type": "doc"
      }
    ]
  },
  "realtime:2.2": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "2.2",
    "title": "WebSocket Là Gì? Giao tiếp 2 Chiều Thời Gian Thực (CS215)",
    "subtitle": "So sánh Polling, Server-Sent Events (SSE) và WebSocket Full-Duplex",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "15:40",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "1v976P-DK4s",
    "overview": "Minh họa rõ cách WebSocket duy trì 1 kết nối TCP bền vững 2 chiều và khi nào nên dùng SSE cho LLM Streaming.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Short Polling vs WebSocket Full-Duplex",
        "description": "Tiết kiệm header HTTP và phản hồi tức thì."
      },
      {
        "timeSec": 320,
        "timestamp": "05:20",
        "title": "Heartbeat & Reconnect Backoff",
        "description": "Giữ kết nối ổn định qua Proxy/NAT."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "RiverLee — WebSocket là gì & Giao tiếp Thời gian thực",
        "url": "https://www.youtube.com/watch?v=1v976P-DK4s",
        "type": "doc"
      },
      {
        "title": "Nờ Ham Học — Kiến trúc Realtime với React & WebSocket",
        "url": "https://www.youtube.com/watch?v=OMo0eHva9oo",
        "type": "doc"
      }
    ]
  },
  "realtime:2.3": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "2.3",
    "title": "Kiến trúc Realtime Chat & Đồng bộ State Thời gian thực",
    "subtitle": "Củng cố luồng đồng bộ sự kiện WebSocket + Client Store trước Quiz",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "16:50",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "OMo0eHva9oo",
    "overview": "Phân tích trường hợp thực chiến kết hợp React State với luồng socket thời gian thực.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Xây dựng ứng dụng Realtime chuẩn",
        "description": "Đồng bộ UI đa thiết bị."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Kiến trúc Realtime Chat & Đồng bộ State Thời gian thực",
        "url": "https://www.youtube.com/watch?v=OMo0eHva9oo",
        "type": "doc"
      },
      {
        "title": "MDN — Using Server-Sent Events (SSE)",
        "url": "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events",
        "type": "doc"
      }
    ]
  },
  "realtime:3.1": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "3.1",
    "title": "Giải phóng Main Thread để đạt INP < 200ms & 60fps (CS215)",
    "subtitle": "Tránh Long Task khóa Main Thread và giữ khung hình 16.6ms mượt mà",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "20:30",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "jfQUw8QxaZc",
    "overview": "Liên kết kiến thức Event Loop với ngân sách thời gian vẽ khung hình 16.6ms để tối ưu INP và độ mượt UI.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Long Tasks & Tác động lên INP",
        "description": "Tại sao Main Thread bận làm click bị lag."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Giải phóng Main Thread để đạt INP < 200ms & 60fps (CS215)",
        "url": "https://www.youtube.com/watch?v=jfQUw8QxaZc",
        "type": "doc"
      },
      {
        "title": "web.dev — Core Web Vitals Thresholds",
        "url": "https://web.dev/articles/vitals",
        "type": "doc"
      }
    ]
  },
  "realtime:3.2": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "3.2",
    "title": "Kỹ thuật Memoization & Quản lý Tham chiếu Bộ nhớ (F8 Official)",
    "subtitle": "Hiểu tham chiếu hàm trong JS để áp dụng useCallback / React.memo hiệu quả",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "21:10",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "xtQtGKL0NCI",
    "overview": "Liên kết Lexical Scope và tham chiếu object trong JavaScript với bài toán so sánh nông (Shallow Comparison) trong React.memo.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vì sao hàm mới tạo làm vỡ React.memo?",
        "description": "So sánh tham chiếu trong JavaScript."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Kỹ thuật Memoization & Quản lý Tham chiếu Bộ nhớ (F8 Official)",
        "url": "https://www.youtube.com/watch?v=xtQtGKL0NCI",
        "type": "doc"
      },
      {
        "title": "TanStack Virtual — Introduction",
        "url": "https://tanstack.com/virtual/latest",
        "type": "doc"
      }
    ]
  },
  "realtime:3.3": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "lessonId": "3.3",
    "title": "Tổng kết Kiến trúc Real-time & Hiệu năng Web (CS215)",
    "subtitle": "Sẵn sàng chuyển sang chặng Mobile Đa nền tảng Flutter (CS306)",
    "instructor": "Phan Đình Nghị & Thầy Nguyễn Phước",
    "duration": "15:40",
    "updatedAt": "CodeMind CS215 · 2026",
    "youtubeId": "1v976P-DK4s",
    "overview": "Khép lại chuyên đề Real-time State và chuẩn bị cho bước phát triển di động.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập trước Quiz Chương 3",
        "description": "Tổng kết WebSockets, Caching và Web Vitals."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Kiến trúc Real-time & Hiệu năng Web (CS215)",
        "url": "https://www.youtube.com/watch?v=1v976P-DK4s",
        "type": "doc"
      },
      {
        "title": "web.dev — Rendering Performance",
        "url": "https://web.dev/articles/rendering-performance",
        "type": "doc"
      }
    ]
  },
  "mobile:1.1": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "1.1",
    "title": "Stateful Widgets & Kiến trúc Render của Flutter (Flutter Official)",
    "subtitle": "Tách StatelessWidget vs StatefulWidget, BuildContext và quản lý Rebuild",
    "instructor": "Flutter Official & Phan Đình Nghị",
    "duration": "15:20",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "Gzz8FwSlsUg",
    "overview": "Video chính thức từ đội ngũ Flutter giải thích cơ chế Widget bất biến, Element giữ State và cách gọi setState đúng phạm vi.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Widget Tree vs Element State",
        "description": "Nơi State thực sự được lưu giữ."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Hàm createState & Lifecycle",
        "description": "initState -> build -> dispose."
      }
    ],
    "defaultNotes": [
      {
        "id": "mob-11-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Luôn hủy TextEditingController và StreamSubscription trong phương thức dispose() của State.",
        "createdAt": "Flutter Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Flutter Official — Stateful Widgets in Flutter",
        "url": "https://www.youtube.com/watch?v=Gzz8FwSlsUg",
        "type": "doc"
      },
      {
        "title": "Flutter Architecture Overview",
        "url": "https://docs.flutter.dev/resources/architectural-overview",
        "type": "doc"
      }
    ]
  },
  "mobile:1.2": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "1.2",
    "title": "Mối quan hệ của BuildContext và State Management trong Flutter",
    "subtitle": "Hiểu rõ Element Tree, InheritedWidget và lỗi ProviderNotFound",
    "instructor": "Code On Sunday & Phan Đình Nghị",
    "duration": "18:45",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "DQUhc2ms6C0",
    "overview": "Video tiếng Việt giải mã hoàn toàn nỗi sợ BuildContext của lập trình viên Flutter thông qua cây Element.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "BuildContext chính là Element!",
        "description": "Cơ chế tìm ngược lên cây widget."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "InheritedWidget là nền móng của Provider/BLoC",
        "description": "Truyền dữ liệu xuyên suốt nhiều tầng với O(1)."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Code On Sunday — Mối quan hệ BuildContext và State Management",
        "url": "https://www.youtube.com/watch?v=DQUhc2ms6C0",
        "type": "doc"
      }
    ]
  },
  "mobile:1.3": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "1.3",
    "title": "Tổng ôn StatefulWidget & 3 Cây Flutter (Flutter Official)",
    "subtitle": "Chuẩn bị vượt qua Checkpoint Quiz Chương 1",
    "instructor": "Flutter Official & Phan Đình Nghị",
    "duration": "15:20",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "Gzz8FwSlsUg",
    "overview": "Rà soát lại vòng đời widget và bảo vệ bộ nhớ trước khi làm Quiz.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát Stateful & mounted",
        "description": "Ôn tập kiến thức Chương 1."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn StatefulWidget & 3 Cây Flutter (Flutter Official)",
        "url": "https://www.youtube.com/watch?v=Gzz8FwSlsUg",
        "type": "doc"
      },
      {
        "title": "Flutter Docs — Understanding Constraints",
        "url": "https://docs.flutter.dev/ui/layout/constraints",
        "type": "doc"
      }
    ]
  },
  "mobile:2.1": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "2.1",
    "title": "Tư duy State Management: Provider, BLoC & Riverpod (Flutter)",
    "subtitle": "Khi nào chỉ cần setState cục bộ và khi nào bắt buộc nâng lên BLoC/Cubit",
    "instructor": "Code On Sunday & Phan Đình Nghị",
    "duration": "21:15",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "ifthAT1OeFg",
    "overview": "Hướng dẫn thực tế chọn kiến trúc quản trị State phù hợp cho ứng dụng Mobile quy mô doanh nghiệp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ephemeral State vs App State",
        "description": "Phân loại trạng thái cục bộ và toàn ứng dụng."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Vì sao dự án doanh nghiệp ưa chuộng BLoC?",
        "description": "Khả năng test độc lập và dòng chảy dữ liệu dự đoán được."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Code On Sunday — State Management có quan trọng không? (Flutter)",
        "url": "https://www.youtube.com/watch?v=ifthAT1OeFg",
        "type": "doc"
      },
      {
        "title": "BlocLibrary.dev Official Architecture",
        "url": "https://bloclibrary.dev/architecture/",
        "type": "doc"
      }
    ]
  },
  "mobile:2.2": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "2.2",
    "title": "BuildContext, InheritedWidget & Điều hướng GoRouter (Flutter)",
    "subtitle": "Tổ chức cây Widget sạch để điều hướng và chia sẻ State hiệu quả",
    "instructor": "Code On Sunday & Phan Đình Nghị",
    "duration": "18:45",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "DQUhc2ms6C0",
    "overview": "Thực hành truyền context đúng tầng khi điều hướng Dialog/Snackbar và GoRouter.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cách tổ chức lớp Repository & Router",
        "description": "Giữ màn hình nhẹ và dễ kiểm thử."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: BuildContext, InheritedWidget & Điều hướng GoRouter (Flutter)",
        "url": "https://www.youtube.com/watch?v=DQUhc2ms6C0",
        "type": "doc"
      },
      {
        "title": "Flutter Docs — Work with long lists",
        "url": "https://docs.flutter.dev/cookbook/lists/long-lists",
        "type": "doc"
      }
    ]
  },
  "mobile:2.3": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "2.3",
    "title": "Ôn tập BLoC & State Management trước Quiz Chương 2",
    "subtitle": "Chốt lại mô hình phân tách UI và Business Logic chuẩn Flutter",
    "instructor": "Code On Sunday & Phan Đình Nghị",
    "duration": "21:15",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "ifthAT1OeFg",
    "overview": "Rà soát các sai lầm khi dùng State Management trước bài kiểm tra Chương 2.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "So sánh BLoC vs Riverpod",
        "description": "Nguyên lý chung là tách logic khỏi Widget."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập BLoC & State Management trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=ifthAT1OeFg",
        "type": "doc"
      },
      {
        "title": "BlocLibrary.dev — Testing BLoCs",
        "url": "https://bloclibrary.dev/testing/",
        "type": "doc"
      }
    ]
  },
  "mobile:3.1": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "3.1",
    "title": "Kiểm thử Hợp đồng REST API Chuẩn Tích hợp Mobile Client (F8 Official)",
    "subtitle": "Đảm bảo Response JSON, HTTP Status Code và Auth Header khớp 100% Backend",
    "instructor": "Sơn Đặng (F8 Official) & Phan Đình Nghị",
    "duration": "19:15",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "CvX_5uyUXSs",
    "overview": "Hướng dẫn kiểm chứng endpoint GET/POST/PUT và Bearer Authorization trước khi viết tầng Data Repository.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm tra Status Code & Payload JSON",
        "description": "Chuẩn hóa đầu vào cho fromJson Model."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — Kiểm thử Hợp đồng REST API với Postman",
        "url": "https://www.youtube.com/watch?v=CvX_5uyUXSs",
        "type": "doc"
      }
    ]
  },
  "mobile:3.2": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "3.2",
    "title": "Tối ưu Vòng đời & Phát hành Ứng dụng Flutter Production",
    "subtitle": "Giữ 60fps ổn định ở Release AOT và dọn dẹp tài nguyên sạch sẽ",
    "instructor": "Flutter Official & Phan Đình Nghị",
    "duration": "15:20",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "Gzz8FwSlsUg",
    "overview": "Hoàn thiện tư duy tối ưu hiệu năng Widget và vòng đời trước khi đóng gói sản phẩm.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm tra rebuild & đóng gói",
        "description": "Các lưu ý chuẩn bị đưa app lên Store."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tối ưu Vòng đời & Phát hành Ứng dụng Flutter Production",
        "url": "https://www.youtube.com/watch?v=Gzz8FwSlsUg",
        "type": "doc"
      },
      {
        "title": "Flutter Docs — App Architecture & Offline-First",
        "url": "https://docs.flutter.dev/app-architecture/guide",
        "type": "doc"
      }
    ]
  },
  "mobile:3.3": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "lessonId": "3.3",
    "title": "Tổng kết Toàn khóa Flutter Architecture (CS306)",
    "subtitle": "Hệ thống hóa từ Widget Tree, BuildContext, BLoC đến REST API Integration",
    "instructor": "Code On Sunday & Phan Đình Nghị",
    "duration": "18:45",
    "updatedAt": "CodeMind CS306 · 2026",
    "youtubeId": "DQUhc2ms6C0",
    "overview": "Ôn tập xuyên suốt mô hình phân lớp Flutter trước Quiz cuối môn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh kiến trúc ứng dụng",
        "description": "Sẵn sàng sang chặng Backend & REST API."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Toàn khóa Flutter Architecture (CS306)",
        "url": "https://www.youtube.com/watch?v=DQUhc2ms6C0",
        "type": "doc"
      },
      {
        "title": "Flutter Performance Best Practices",
        "url": "https://docs.flutter.dev/perf/best-practices",
        "type": "doc"
      }
    ]
  },
  "web:1.1": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "1.1",
    "title": "Thêm/Sửa/Xóa Khóa học với Fetch và REST API (F8 Official)",
    "subtitle": "Thực hành CRUD hoàn chỉnh qua HTTP GET, POST, PUT, DELETE với Backend API",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "24:15",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "TRjVXmk8q8I",
    "overview": "Video F8 Official thực chiến xây dựng luồng CRUD đầy đủ với Fetch API và RESTful Endpoint: GET render danh sách, POST tạo mới, DELETE cập nhật UI tức thì.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiến trúc RESTful API & HTTP Verbs",
        "description": "Mapping tài nguyên /courses sang GET/POST/PUT/DELETE."
      },
      {
        "timeSec": 280,
        "timestamp": "04:40",
        "title": "Fetch POST JSON & Content-Type",
        "description": "Gửi payload JSON chuẩn và cập nhật danh sách."
      },
      {
        "timeSec": 720,
        "timestamp": "12:00",
        "title": "Xử lý DELETE đồng bộ State",
        "description": "Cập nhật giao diện không reload toàn trang."
      }
    ],
    "defaultNotes": [
      {
        "id": "web-11-n1",
        "timeSec": 280,
        "timestamp": "04:40",
        "content": "Khi gửi JSON bằng fetch nhớ cấu hình headers: { 'Content-Type': 'application/json' }.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Thêm/Sửa/Xóa khóa học với Fetch và REST API",
        "url": "https://www.youtube.com/watch?v=TRjVXmk8q8I",
        "type": "doc"
      },
      {
        "title": "MDN — HTTP Response Status Codes",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
        "type": "doc"
      }
    ]
  },
  "web:1.2": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "1.2",
    "title": "HTTP Protocol | Cấu trúc Request URL, Method & Headers (F8 Official)",
    "subtitle": "Chuẩn hóa URI Endpoint, Query Params và phân tích phản hồi trên Network Tab",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "15:10",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "SdcdneSdoV4",
    "overview": "Video F8 Official giải thích cặn kẽ cách trình duyệt và API giao tiếp qua HTTP Headers, Path, Query Parameters và Body.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Giải phẫu bản tin HTTP Request",
        "description": "Start line, Headers và Payload Body."
      },
      {
        "timeSec": 320,
        "timestamp": "05:20",
        "title": "HTTP Status Code 2xx / 4xx / 5xx",
        "description": "Phân biệt lỗi Client vs Server."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — HTTP Protocol & Client-Server",
        "url": "https://www.youtube.com/watch?v=SdcdneSdoV4",
        "type": "doc"
      },
      {
        "title": "F8 Official — Sử dụng Postman làm việc với REST API",
        "url": "https://www.youtube.com/watch?v=CvX_5uyUXSs",
        "type": "doc"
      }
    ]
  },
  "web:1.3": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "1.3",
    "title": "Sử dụng Postman Làm việc & Kiểm thử REST API (F8 Official)",
    "subtitle": "Kiểm chứng Status Code, Headers và JSON Response trước Quiz Chương 1",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "19:15",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "CvX_5uyUXSs",
    "overview": "Hướng dẫn dùng Postman test đầy đủ CRUD endpoints, xem Headers và bắt lỗi API nhanh chóng.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cài đặt & Gửi request GET/POST/PUT/DELETE",
        "description": "Kiểm chứng hợp đồng API."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — Postman & REST API Testing",
        "url": "https://www.youtube.com/watch?v=CvX_5uyUXSs",
        "type": "doc"
      }
    ]
  },
  "web:2.1": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "2.1",
    "title": "JWT là gì? Hiểu JSON Web Token từ A–Z & Bảo mật (CS304)",
    "subtitle": "Cấu trúc 3 phần Header.Payload.Signature, Signature Verification & Expiry",
    "instructor": "Võ Nhật Huy & Ban Cố vấn Web",
    "duration": "17:40",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "5MLGzKTUCZc",
    "overview": "Giải mã cơ chế chữ ký số của JWT và lý do cần Access Token ngắn hạn kết hợp Refresh Token.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao Session Cookie truyền thống khó Scale?",
        "description": "Vai trò của Stateless Token."
      },
      {
        "timeSec": 340,
        "timestamp": "05:40",
        "title": "Giải phẫu Header.Payload.Signature",
        "description": "Phát hiện giả mạo Payload trong tích tắc."
      }
    ],
    "defaultNotes": [
      {
        "id": "web-21-n1",
        "timeSec": 340,
        "timestamp": "05:40",
        "content": "JWT Payload chỉ dùng Base64Url, không được chứa mật khẩu hay số thẻ ngân hàng.",
        "createdAt": "Lecture Bookmark"
      }
    ],
    "resources": [
      {
        "title": "JWT là gì? Hiểu JSON Web Token từ A-Z & Bảo mật",
        "url": "https://www.youtube.com/watch?v=5MLGzKTUCZc",
        "type": "doc"
      },
      {
        "title": "RFC 7519 — JSON Web Token (JWT)",
        "url": "https://datatracker.ietf.org/doc/html/rfc7519",
        "type": "doc"
      }
    ]
  },
  "web:2.2": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "2.2",
    "title": "Xây dựng Luồng Xác thực JWT & Phân quyền RBAC Middleware",
    "subtitle": "Kiểm chứng Authorization Bearer, Refresh Token Rotation và chặn 401/403",
    "instructor": "Võ Nhật Huy & Phan Đình Nghị",
    "duration": "21:50",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "LxeYH4D1YAs",
    "overview": "Thực hành triển khai Auth Middleware kiểm tra chữ ký JWT, thời hạn hết hạn và phân quyền theo vai trò.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tách Access Token & Refresh Token",
        "description": "Cân bằng giữa bảo mật và trải nghiệm mượt."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Middleware kiểm tra Bearer Header",
        "description": "Từ chối token hết hạn hoặc bị thu hồi."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Holetex — Hướng dẫn JWT Auth trong API Server",
        "url": "https://www.youtube.com/watch?v=LxeYH4D1YAs",
        "type": "doc"
      },
      {
        "title": "FastAPI Docs — Security & Dependencies",
        "url": "https://fastapi.tiangolo.com/tutorial/security/",
        "type": "doc"
      }
    ]
  },
  "web:2.3": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "2.3",
    "title": "Ôn tập JWT & Bảo mật Phiên đăng nhập trước Quiz Chương 2",
    "subtitle": "Tổng kết cấu trúc Token, Refresh Token và RBAC Guard",
    "instructor": "Võ Nhật Huy & Phan Đình Nghị",
    "duration": "17:40",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "5MLGzKTUCZc",
    "overview": "Rà soát các lỗ hổng JWT phổ biến như `alg: none`, secret yếu và quên kiểm tra thu hồi phiên.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát JWT Security Checklist",
        "description": "Sẵn sàng vượt qua Quiz Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập JWT & Bảo mật Phiên đăng nhập trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=5MLGzKTUCZc",
        "type": "doc"
      },
      {
        "title": "OWASP Password Storage Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "web:3.1": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "3.1",
    "title": "CORS Policy Là Gì? Cách Xử Lý Khi Bị Chặn Bởi CORS (F8 Official)",
    "subtitle": "Hiểu Same-Origin Policy, Preflight Request OPTIONS và Whitelist Origin",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "14:50",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "zuHNAhplYpI",
    "overview": "Video F8 Official giải thích cặn kẽ vì sao trình duyệt chặn Cross-Origin requests và cách Backend mở quyền CORS an toàn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Same-Origin Policy là gì?",
        "description": "Scheme + Host + Port xác định một Origin."
      },
      {
        "timeSec": 260,
        "timestamp": "04:20",
        "title": "Preflight Request (OPTIONS)",
        "description": "Trình duyệt xin phép Server trước khi gửi PUT/DELETE/Auth Header."
      }
    ],
    "defaultNotes": [
      {
        "id": "web-31-n1",
        "timeSec": 260,
        "timestamp": "04:20",
        "content": "CORS do trình duyệt thi hành chứ không bảo vệ trước curl/Python — luôn giữ RBAC ở Backend.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — CORS Policy Là Gì? Cách Xử Lý Khi Bị Chặn",
        "url": "https://www.youtube.com/watch?v=zuHNAhplYpI",
        "type": "doc"
      }
    ]
  },
  "web:3.2": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "3.2",
    "title": "7 Kỹ Thuật Bảo Mật Web API: XSS, CSRF, Rate Limiting & SQLi",
    "subtitle": "Thiết lập hàng rào bảo vệ đa lớp cho API Doanh nghiệp",
    "instructor": "Võ Nhật Huy & Phan Đình Nghị",
    "duration": "22:30",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "XuzRt-BFIKU",
    "overview": "Hướng dẫn phòng thủ XSS, CSRF, Brute-Force Rate Limiting và làm sạch dữ liệu đầu vào trên REST API.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chống XSS & Làm sạch đầu vào",
        "description": "Nguyên tắc Escape và Content Security Policy."
      },
      {
        "timeSec": 500,
        "timestamp": "08:20",
        "title": "CSRF Token & Rate Limiting",
        "description": "Bảo vệ API Auth khỏi spam và giả mạo."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "LetDiv — 7 Kỹ thuật Bảo mật API: Rate Limiting, CORS, SQLi, CSRF, XSS",
        "url": "https://www.youtube.com/watch?v=XuzRt-BFIKU",
        "type": "doc"
      }
    ]
  },
  "web:4.1": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "4.1",
    "title": "NodeJS & Kiến trúc Server Runtime Non-blocking I/O (F8 Official)",
    "subtitle": "Tại sao Web Server Bất đồng bộ chịu tải hàng vạn kết nối hiệu quả",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "16:45",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "ysjJlvQ3FFc",
    "overview": "Video F8 Official giúp hiểu rõ cơ chế vận hành Server-side Runtime, I/O không nghẽn và kết nối với REST API.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Web Server Runtime & Non-blocking",
        "description": "So sánh mô hình đồng bộ cũ vs Event-driven."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — NodeJS là gì & Runtime Server-Side",
        "url": "https://www.youtube.com/watch?v=ysjJlvQ3FFc",
        "type": "doc"
      }
    ]
  },
  "web:4.2": {
    "subjectId": "web",
    "subjectCode": "CS304",
    "lessonId": "4.2",
    "title": "Tổng kết CRUD, Auth & Kiểm thử Web API Hoàn chỉnh (F8 Official)",
    "subtitle": "Nghiệm thu môn Phát triển Web Hiện đại & REST API (CS304)",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "24:15",
    "updatedAt": "CodeMind CS304 · 2026",
    "youtubeId": "TRjVXmk8q8I",
    "overview": "Rà soát toàn bộ hành trình API từ thiết kế URI, Fetch Client, JWT Security tới nghiệm thu End-to-End.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist nghiệm thu Web API",
        "description": "REST + Auth + CORS + WebSocket."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết CRUD, Auth & Kiểm thử Web API Hoàn chỉnh (F8 Official)",
        "url": "https://www.youtube.com/watch?v=TRjVXmk8q8I",
        "type": "doc"
      },
      {
        "title": "FastAPI Testing Guide",
        "url": "https://fastapi.tiangolo.com/tutorial/testing/",
        "type": "doc"
      }
    ]
  },
  "system-design:1.1": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "1.1",
    "title": "System Design là gì? Tư duy Phân tích Kiến trúc & Dữ liệu P1",
    "subtitle": "Từ yêu cầu bài toán thực tế đến thiết kế Thực thể & Thành phần Hệ thống",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "21:30",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "ur6ZwbQ99os",
    "overview": "Video định hình tư duy System Design cho kỹ sư phần mềm: cách bóc tách bài toán, ước lượng dữ liệu và vẽ sơ đồ thực thể.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vì sao Code sạch nhưng System Design tồi vẫn sập?",
        "description": "Vai trò sống còn của Data Model."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Phân rã Thực thể & Thành phần cốt lõi",
        "description": "Xác định nguồn chân lý dữ liệu."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "TechCraft — System Design là gì? Tư duy Thiết kế Hệ thống P1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      },
      {
        "title": "PostgreSQL Official Docs — Constraints",
        "url": "https://www.postgresql.org/docs/current/ddl-constraints.html",
        "type": "doc"
      }
    ]
  },
  "system-design:1.2": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "1.2",
    "title": "5 Bước Vàng Giải Mọi Bài System Design P2",
    "subtitle": "Chuẩn hóa API Contract, Lựa chọn CSDL & Thiết kế Bảng trung gian",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "24:10",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "Bcu4yy-hYp8",
    "overview": "Hướng dẫn 5 bước chuẩn xác khi thiết kế hệ thống: Requirements -> Capacity -> API -> Data Model ERD -> Scaling.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "5 Bước thiết kế hệ thống chuẩn Senior",
        "description": "Từ Data Model tới High-level Architecture."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "TechCraft — 5 Bước Giải mọi Bài toán System Design P2",
        "url": "https://www.youtube.com/watch?v=Bcu4yy-hYp8",
        "type": "doc"
      }
    ]
  },
  "system-design:1.3": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "1.3",
    "title": "Tổng ôn ERD & Mô hình Dữ liệu trước Quiz Chương 1",
    "subtitle": "Củng cố thiết kế Thực thể, PK/FK và Quan hệ N-N",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "21:30",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "ur6ZwbQ99os",
    "overview": "Rà soát các nguyên tắc thiết kế thực thể và ràng buộc trước Checkpoint Quiz Chương 1.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm chứng ERD & Constraint",
        "description": "Chốt lại kiến thức Chương 1."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn ERD & Mô hình Dữ liệu trước Quiz Chương 1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      },
      {
        "title": "PostgreSQL — Foreign Keys & Cascade Rules",
        "url": "https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK",
        "type": "doc"
      }
    ]
  },
  "system-design:2.1": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "2.1",
    "title": "3 Dạng Chuẩn Hóa Cơ Sở Dữ Liệu: 1NF, 2NF, 3NF (CS308)",
    "subtitle": "Loại bỏ trùng lặp và dị thường cập nhật từng bước chuẩn hóa bảng",
    "instructor": "Bộ môn Hệ thống Thông tin & Nguyễn Bá Hòa",
    "duration": "18:50",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "TKYd6gKF2Cc",
    "overview": "Video bài giảng từng bước kiểm tra và chuyển đổi một lược đồ thô sang 1NF, 2NF và 3NF hoàn chỉnh.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Dạng chuẩn 1NF: Giá trị nguyên tố",
        "description": "Khử cột lặp và dữ liệu đa trị."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "2NF & 3NF qua ví dụ hóa đơn thực tế",
        "description": "Khử phụ thuộc bộ phận và bắc cầu."
      }
    ],
    "defaultNotes": [
      {
        "id": "sys-21-n1",
        "timeSec": 360,
        "timestamp": "06:00",
        "content": "3 điều cần nhớ: The Key (1NF), The Whole Key (2NF), And Nothing But The Key (3NF)!",
        "createdAt": "DB Bookmark"
      }
    ],
    "resources": [
      {
        "title": "CSDL PTIT — 3 Dạng Chuẩn hóa 1NF, 2NF, 3NF",
        "url": "https://www.youtube.com/watch?v=TKYd6gKF2Cc",
        "type": "doc"
      },
      {
        "title": "Cơ sở dữ liệu 08 — Tìm hiểu Các Dạng Chuẩn hóa",
        "url": "https://www.youtube.com/watch?v=x7wui_lux6c",
        "type": "doc"
      }
    ]
  },
  "system-design:2.2": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "2.2",
    "title": "Database Normalization: Thực hành 1NF -> 2NF -> 3NF (CS308)",
    "subtitle": "Khử Update/Insert/Delete Anomaly bằng tách bảng quan hệ chuẩn 3NF",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "22:15",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "MfIOqGtDfSw",
    "overview": "Hướng dẫn thực hành biến đổi bảng hóa đơn/khóa học lộn xộn thành hệ thống các bảng liên kết 3NF chặt chẽ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao dữ liệu dư thừa gây dị thường (Anomalies)?",
        "description": "Minh họa Insert, Update và Delete Anomaly."
      },
      {
        "timeSec": 520,
        "timestamp": "08:40",
        "title": "Tách bảng đạt 3NF chuẩn xác",
        "description": "Kiểm chứng phụ thuộc bắc cầu."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Database Normalization 1NF 2NF 3NF Chuẩn hóa Dữ liệu",
        "url": "https://www.youtube.com/watch?v=MfIOqGtDfSw",
        "type": "doc"
      }
    ]
  },
  "system-design:2.3": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "2.3",
    "title": "Chuẩn Hóa Trong CSDL & Bảo toàn Phụ thuộc Hàm (CS308)",
    "subtitle": "Kiểm tra phân biệt lỗi vi phạm 1NF vs 2NF vs 3NF trước Quiz",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "24:30",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "x7wui_lux6c",
    "overview": "Củng cố xác định khóa ứng viên và khử phụ thuộc bắc cầu chuẩn bị cho Checkpoint Quiz Chương 2.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Nhận diện lỗi 1NF/2NF/3NF",
        "description": "Các bẫy thường gặp trong đề kiểm tra."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Van Cong Khanh — Chuẩn hóa trong CSDL 08",
        "url": "https://www.youtube.com/watch?v=x7wui_lux6c",
        "type": "doc"
      }
    ]
  },
  "system-design:3.1": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "3.1",
    "title": "12 Phút Hiểu Tất Cả Về Index & Toàn vẹn Dữ liệu Database",
    "subtitle": "Tối ưu truy vấn và bảo vệ tốc độ đọc ghi bảng lớn",
    "instructor": "sydexa & Thầy Nguyễn Phước",
    "duration": "12:15",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "CcfEjMISKoQ",
    "overview": "Giới thiệu trực quan cách CSDL tổ chức trang dữ liệu trên đĩa, Full Table Scan vs Index Lookup.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Full Table Scan O(N) chậm ra sao?",
        "description": "Nguyên nhân CPU và Disk I/O quá tải khi thiếu Index."
      },
      {
        "timeSec": 260,
        "timestamp": "04:20",
        "title": "Cấu trúc B-Tree Index O(log N)",
        "description": "Tìm đúng dòng giữa hàng triệu bản ghi trong 3-4 bước."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 12 Phút Hiểu Tất Cả Về Index & Toàn vẹn Dữ liệu Database",
        "url": "https://www.youtube.com/watch?v=CcfEjMISKoQ",
        "type": "doc"
      },
      {
        "title": "PostgreSQL Docs — Transaction Isolation",
        "url": "https://www.postgresql.org/docs/current/transaction-iso.html",
        "type": "doc"
      }
    ]
  },
  "system-design:3.2": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "3.2",
    "title": "B-Tree Index, Composite Index & Execution Plan (CS308)",
    "subtitle": "Cơ chế tìm kiếm cây cân bằng, Leftmost Prefix và phân tích EXPLAIN",
    "instructor": "Mọt Dev & Nguyễn Bá Hòa",
    "duration": "23:40",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "ZBi2B7fbQ1I",
    "overview": "Video mổ xẻ cấu trúc B-Tree trong Database Engine, lý do Composite Index cần đúng thứ tự cột và cách tránh Index Bypass.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bên trong B-Tree Index & Leaf Pages",
        "description": "Cân bằng cây giữ độ cao 3-4 tầng cho hàng triệu dòng."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Composite Index & Execution Plan",
        "description": "Đọc đúng Index Scan vs Seq Scan."
      }
    ],
    "defaultNotes": [
      {
        "id": "sys-32-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Cột có tính chọn lọc cao (high cardinality) hoặc điều kiện bằng (=) nên đặt trước cột điều kiện khoảng (>, <) trong Composite Index.",
        "createdAt": "DB Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Mọt Dev — B-Tree Index, Composite Index & Execution Plan",
        "url": "https://www.youtube.com/watch?v=ZBi2B7fbQ1I",
        "type": "doc"
      },
      {
        "title": "Use The Index, Luke!",
        "url": "https://use-the-index-luke.com/",
        "type": "doc"
      }
    ]
  },
  "system-design:3.3": {
    "subjectId": "system-design",
    "subjectCode": "CS308",
    "lessonId": "3.3",
    "title": "Thực hành SQL Index & Tổng kết Kiến trúc CSDL (CS308)",
    "subtitle": "Hệ thống hóa ERD -> 3NF -> ACID -> B-Tree Indexing trước Quiz cuối môn",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "19:10",
    "updatedAt": "CodeMind CS308 · 2026",
    "youtubeId": "0Ol6b3q5z8k",
    "overview": "Thực hành thao tác tạo/xóa Index, kiểm chứng tốc độ truy vấn và tổng kết toàn khóa CS308.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Thực hành đánh Index & Kiểm chứng",
        "description": "Nghiệm thu môn CS308."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "TITV — Thực hành Index trong SQL",
        "url": "https://www.youtube.com/watch?v=0Ol6b3q5z8k",
        "type": "doc"
      }
    ]
  },
  "distributed:1.1": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "1.1",
    "title": "What Is Redis Really About? In-Memory Caching & Data Structures (CS315)",
    "subtitle": "Cách Redis đạt tốc độ dưới 1ms bằng RAM & Single-Threaded Event Loop",
    "instructor": "ByteByteGo & Thầy Nguyễn Phước",
    "duration": "12:40",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "z_NbVtbgBJw",
    "overview": "Video trực quan giải thích các cấu trúc dữ liệu của Redis (String, Hash, Sorted Set) và vai trò cốt lõi trong hệ thống phân tán.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao Redis nhanh hơn Disk Database?",
        "description": "In-Memory RAM + I/O Multiplexing."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Sorted Sets, Streams & Distributed Cache",
        "description": "Ứng dụng thực chiến trong Enterprise Web App."
      }
    ],
    "defaultNotes": [
      {
        "id": "dist-11-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Dùng Redis ZSET (Sorted Set) cho bảng xếp hạng XP Leaderboard thay vì `ORDER BY xp DESC` trên bảng triệu dòng.",
        "createdAt": "System Bookmark"
      }
    ],
    "resources": [
      {
        "title": "ByteByteGo — What Is Redis Really About?",
        "url": "https://www.youtube.com/watch?v=z_NbVtbgBJw",
        "type": "doc"
      },
      {
        "title": "Hello Interview — Redis Deep Dive",
        "url": "https://www.youtube.com/watch?v=fmT5nlEkl3U",
        "type": "doc"
      }
    ]
  },
  "distributed:1.2": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "1.2",
    "title": "Redis Deep Dive: Caching Patterns, Locking & Scaling (CS315)",
    "subtitle": "Chống Cache Stampede, Penetration, Avalanche và Distributed Rate Limiting",
    "instructor": "Hello Interview & Thầy Nguyễn Phước",
    "duration": "26:15",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "fmT5nlEkl3U",
    "overview": "Chuyên sâu về vận hành Redis Cluster ở quy mô doanh nghiệp: Eviction LRU/LFU, Distributed Lock và phòng thủ thảm họa Cache.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Write-Through vs Cache-Aside",
        "description": "Đánh đổi độ tươi dữ liệu và độ phức tạp."
      },
      {
        "timeSec": 600,
        "timestamp": "10:00",
        "title": "Thundering Herd & Hot Keys",
        "description": "Cách xử lý khi một hot key hết hạn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Hello Interview — Redis Deep Dive (Locking & Stampede)",
        "url": "https://www.youtube.com/watch?v=fmT5nlEkl3U",
        "type": "doc"
      }
    ]
  },
  "distributed:1.3": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "1.3",
    "title": "Ôn tập Redis Caching & Eviction trước Quiz Chương 1",
    "subtitle": "Củng cố lại Cache-Aside và cấu trúc dữ liệu In-Memory",
    "instructor": "ByteByteGo & Nguyễn Bá Hòa",
    "duration": "12:40",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "z_NbVtbgBJw",
    "overview": "Chốt lại kiến thức Redis Cache trước khi chuyển sang Event Streaming Apache Kafka.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm tra lại mô hình Redis",
        "description": "Sẵn sàng sang Chương 2 Kafka."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Redis Caching & Eviction trước Quiz Chương 1",
        "url": "https://www.youtube.com/watch?v=z_NbVtbgBJw",
        "type": "doc"
      },
      {
        "title": "Redis Docs — Memory Optimization & Eviction",
        "url": "https://redis.io/docs/latest/develop/use/",
        "type": "doc"
      }
    ]
  },
  "distributed:2.1": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "2.1",
    "title": "Kafka System Design Deep Dive: Partitions, Offsets & Scaling (CS315)",
    "subtitle": "Cách Kafka chịu tải hàng triệu message/giây với Sequential Disk I/O",
    "instructor": "Hello Interview & Thầy Nguyễn Phước",
    "duration": "27:30",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "DU8o-OTeoCc",
    "overview": "Phân tích toàn bộ cấu trúc bên trong Kafka Broker: Topic, Partition, Consumer Group Rebalance và ISR Replication.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kafka Topic, Partition & Ordering Guarantee",
        "description": "Cách Partition Key đảm bảo thứ tự."
      },
      {
        "timeSec": 660,
        "timestamp": "11:00",
        "title": "Consumer Groups & Rebalancing",
        "description": "Scale song song và lưu Offset an toàn."
      }
    ],
    "defaultNotes": [
      {
        "id": "dist-21-n1",
        "timeSec": 660,
        "timestamp": "11:00",
        "content": "Số Consumer hoạt động tối đa trong 1 Consumer Group không vượt quá số Partition của Topic.",
        "createdAt": "System Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Hello Interview — Kafka System Design Deep Dive",
        "url": "https://www.youtube.com/watch?v=DU8o-OTeoCc",
        "type": "doc"
      }
    ]
  },
  "distributed:2.2": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "2.2",
    "title": "Kafka vs RabbitMQ: Lựa chọn Đúng Message Broker (CS315)",
    "subtitle": "Push Queue Routing vs Pull Event Streaming & Idempotency",
    "instructor": "Hello Interview & Nguyễn Bá Hòa",
    "duration": "19:20",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "1HOVtQ-_fcE",
    "overview": "So sánh chi tiết RabbitMQ và Apache Kafka qua các tiêu chí: Throughput, Message Retention, Ordering và Retry/DLQ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Smart Broker (RabbitMQ) vs Dumb Broker (Kafka)",
        "description": "Khác biệt triết lý thiết kế cốt lõi."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Hello Interview — Kafka vs RabbitMQ",
        "url": "https://www.youtube.com/watch?v=1HOVtQ-_fcE",
        "type": "doc"
      }
    ]
  },
  "distributed:2.3": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "2.3",
    "title": "Tổng ôn Kafka Partition, Consumer Group & Outbox trước Quiz",
    "subtitle": "Hệ thống hóa kiến trúc Event Streaming trước Checkpoint Quiz Chương 2",
    "instructor": "Hello Interview & Thầy Nguyễn Phước",
    "duration": "27:30",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "DU8o-OTeoCc",
    "overview": "Rà soát mô hình lưu Offset, Partition Ordering và Idempotency.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist Event-Driven Architecture",
        "description": "Chuẩn bị vượt qua Quiz Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Kafka Partition, Consumer Group & Outbox trước Quiz",
        "url": "https://www.youtube.com/watch?v=DU8o-OTeoCc",
        "type": "doc"
      },
      {
        "title": "Microservices.io — Transactional Outbox Pattern",
        "url": "https://microservices.io/patterns/data/transactional-outbox.html",
        "type": "doc"
      }
    ]
  },
  "distributed:3.1": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "3.1",
    "title": "Giao tiếp Microservices, Phân tán & Scaling Hạ tầng (CS315)",
    "subtitle": "Kết hợp gRPC, HTTP, Kafka & Distributed Design qua mạng phân tán",
    "instructor": "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    "duration": "18:30",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "8U1M_NRnmNY",
    "overview": "Toàn cảnh cách các thành phần Microservices giao tiếp an toàn và chịu lỗi khi một cụm bị chia cắt mạng.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Đồng bộ vs Bất đồng bộ trong Hệ thống Phân tán",
        "description": "Khi nào cần chịu lỗi phân mảnh (AP vs CP)."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Giao tiếp Microservices, Phân tán & Scaling Hạ tầng (CS315)",
        "url": "https://www.youtube.com/watch?v=8U1M_NRnmNY",
        "type": "doc"
      },
      {
        "title": "ByteByteGo — Consistent Hashing & Redis Cluster",
        "url": "https://bytebytego.com/courses/system-design-interview/design-consistent-hashing",
        "type": "doc"
      }
    ]
  },
  "distributed:3.2": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "3.2",
    "title": "Xây dựng Distributed Rate Limiter & Lock trên Redis (CS315)",
    "subtitle": "Token Bucket, Sliding Window Sorted Set & Lua Atomic Scripts",
    "instructor": "Hello Interview & Thầy Nguyễn Phước",
    "duration": "26:15",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "fmT5nlEkl3U",
    "overview": "Liên kết kiến thức Redis để bảo vệ API khỏi quá tải lưu lượng và Race Condition đa nút.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vì sao không thể Rate Limit trên RAM từng server?",
        "description": "Cần chia sẻ trạng thái qua Redis."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Xây dựng Distributed Rate Limiter & Lock trên Redis (CS315)",
        "url": "https://www.youtube.com/watch?v=fmT5nlEkl3U",
        "type": "doc"
      },
      {
        "title": "Stripe Engineering — Scaling your API with rate limiters",
        "url": "https://stripe.com/blog/rate-limiters",
        "type": "doc"
      }
    ]
  },
  "distributed:3.3": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "lessonId": "3.3",
    "title": "Tổng kết Toàn khóa Hệ thống Phân tán Redis & Kafka (CS315)",
    "subtitle": "Sẵn sàng cho chuyên đề Bảo mật Web OWASP Top 10 (CS312)",
    "instructor": "ByteByteGo & Thầy Nguyễn Phước",
    "duration": "12:40",
    "updatedAt": "CodeMind CS315 · 2026",
    "youtubeId": "z_NbVtbgBJw",
    "overview": "Hệ thống hóa lại Redis, Kafka, CAP và Rate Limiting trước khi chốt Quiz Chương 3.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tổng kết Scaling Patterns",
        "description": "Cache + Queue + Partitioning."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Toàn khóa Hệ thống Phân tán Redis & Kafka (CS315)",
        "url": "https://www.youtube.com/watch?v=z_NbVtbgBJw",
        "type": "doc"
      },
      {
        "title": "Designing Data-Intensive Applications (DDIA Summary)",
        "url": "https://dataintensive.net/",
        "type": "doc"
      }
    ]
  },
  "security:1.1": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "1.1",
    "title": "An toàn Web & OWASP Top 10: SQL Injection, XSS, CSRF & Session (CS312)",
    "subtitle": "Cách kẻ tấn công khai thác lỗ hổng Web và phương pháp vá triệt để",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "26:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "V50ahKLTXxA",
    "overview": "Video bài giảng chi tiết về bộ 10 lỗ hổng nguy hiểm nhất OWASP: Cookie/Session Hijacking, SQL Injection, XSS và CSRF.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh OWASP Top 10 & SQL Injection",
        "description": "Nguyên nhân nối chuỗi và Prepared Statements."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "XSS, CSRF & Bảo vệ Cookie/Session",
        "description": "HttpOnly, SameSite và CSP."
      }
    ],
    "defaultNotes": [
      {
        "id": "sec-11-n1",
        "timeSec": 0,
        "timestamp": "00:00",
        "content": "Prepared Statement / Bind Parameter là lá chắn duy nhất triệt tiêu SQLi 100% ở mọi biến đầu vào.",
        "createdAt": "Security Bookmark"
      }
    ],
    "resources": [
      {
        "title": "An toàn Web — OWASP Top 10: SQLi, XSS, CSRF & Session",
        "url": "https://www.youtube.com/watch?v=V50ahKLTXxA",
        "type": "doc"
      },
      {
        "title": "OWASP SQL Injection Prevention Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "security:1.2": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "1.2",
    "title": "7 Kỹ Thuật Bảo Mật API: Access Control, Rate Limit & Chống IDOR",
    "subtitle": "Bảo vệ API từ tầng định danh JWT đến kiểm tra quyền sở hữu tài nguyên",
    "instructor": "LetDiv & Thầy Đặng Quốc Bảo",
    "duration": "22:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "XuzRt-BFIKU",
    "overview": "Hướng dẫn khóa chặt lỗ hổng Broken Access Control, SQL Injection, XSS và Rate Limiting trên API.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm tra Ownership trên mọi Resource ID",
        "description": "Ngăn leo thang đặc quyền ngang và dọc."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: 7 Kỹ Thuật Bảo Mật API: Access Control, Rate Limit & Chống IDOR",
        "url": "https://www.youtube.com/watch?v=XuzRt-BFIKU",
        "type": "doc"
      },
      {
        "title": "OWASP Top 10:2021 — A01 Broken Access Control",
        "url": "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
        "type": "doc"
      }
    ]
  },
  "security:1.3": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "1.3",
    "title": "Bảo Mật Web Cơ Bản Cho Dev: SQLi, XSS, Mật khẩu & HTTPS",
    "subtitle": "Củng cố lại SQL Injection & Phòng thủ đa lớp trước Quiz Chương 1",
    "instructor": "HG Learn & Thầy Đặng Quốc Bảo",
    "duration": "16:20",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "ig6KcNH0SEo",
    "overview": "Tổng kết thực chiến về SQL Injection, Cross-Site Scripting và băm mật khẩu trước bài kiểm tra.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát SQLi & Bảo vệ Mật khẩu",
        "description": "Ôn tập chuẩn bị làm Quiz Chương 1."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Bảo Mật Web Cơ Bản Cho Dev: SQLi, XSS, Mật khẩu & HTTPS",
        "url": "https://www.youtube.com/watch?v=ig6KcNH0SEo",
        "type": "doc"
      },
      {
        "title": "OWASP Cheat Sheet Series",
        "url": "https://cheatsheetseries.owasp.org/",
        "type": "doc"
      }
    ]
  },
  "security:2.1": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "2.1",
    "title": "Bảo Mật Web Cho Dev: Chống XSS, Giữ Kín Bí Mật & HTTPS (CS312)",
    "subtitle": "Hiểu Stored/Reflected XSS, URL Injection và thiết lập CSP Headers",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "16:20",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "ig6KcNH0SEo",
    "overview": "Thực hành nhận diện kịch bản tấn công XSS đánh cắp token và cách sử dụng CSP / Escaping phòng thủ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cách Hacker khai thác XSS đánh cắp dữ liệu",
        "description": "Payload injection qua comment/input."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "CSP & HTTPS mã hóa đường truyền",
        "description": "Chốt chặn phòng thủ từ trình duyệt."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "HG Learn — Bảo mật Web: XSS, Password, HTTPS",
        "url": "https://www.youtube.com/watch?v=ig6KcNH0SEo",
        "type": "doc"
      }
    ]
  },
  "security:2.2": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "2.2",
    "title": "CORS Policy Security & Same-Origin Policy (F8 Official)",
    "subtitle": "Ngăn chặn đọc dữ liệu Cross-Origin trái phép và cấu hình Whitelist chuẩn",
    "instructor": "Sơn Đặng (F8 Official) & Thầy Đặng Quốc Bảo",
    "duration": "14:50",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "zuHNAhplYpI",
    "overview": "Liên kết cơ chế CORS của F8 với phòng thủ lỗ hổng bảo mật CORS Misconfiguration và CSRF.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao CORS Misconfiguration nguy hiểm?",
        "description": "Rò rỉ dữ liệu API nội bộ qua cross-origin."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "F8 Official — CORS Policy Security",
        "url": "https://www.youtube.com/watch?v=zuHNAhplYpI",
        "type": "doc"
      }
    ]
  },
  "security:2.3": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "2.3",
    "title": "Ôn tập XSS, CSRF & Cookie Security trước Quiz Chương 2",
    "subtitle": "Tổng hợp kịch bản khai thác và phòng thủ trên trình duyệt",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "26:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "V50ahKLTXxA",
    "overview": "Ôn lại các điểm mấu chốt về OWASP Web Security trước khi làm bài kiểm tra Chương 2.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Phân biệt XSS vs CSRF qua demo",
        "description": "Chốt lại kiến thức Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập XSS, CSRF & Cookie Security trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=V50ahKLTXxA",
        "type": "doc"
      },
      {
        "title": "OWASP Cross-Site Request Forgery Prevention",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "security:3.1": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "3.1",
    "title": "Bảo mật Xác thực Token, Signing Key & Chống Chiếm đoạt Phiên (CS312)",
    "subtitle": "Kết hợp Bcrypt, Refresh Token Rotation, 2FA OTP và Quản trị Phiên đa thiết bị",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "17:40",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "5MLGzKTUCZc",
    "overview": "Liên kết quy trình băm mật khẩu, 2FA OTP, xoay vòng token (Refresh Rotation) và thu hồi phiên thiết bị từ xa.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cách bảo vệ Phiên dài hạn an toàn",
        "description": "Refresh Rotation & Device Revocation."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Python Docs — `secrets` Generate secure random numbers",
        "url": "https://docs.python.org/3/library/secrets.html",
        "type": "doc"
      },
      {
        "title": "AI & Code Tips — Bảo mật Token & Refresh Rotation",
        "url": "https://www.youtube.com/watch?v=5MLGzKTUCZc",
        "type": "doc"
      }
    ]
  },
  "security:3.2": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "3.2",
    "title": "Rate Limiting, Brute-Force Protection & Audit Security (CS312)",
    "subtitle": "Chống dò mật khẩu tự động, User Enumeration và lưu Nhật ký Kiểm toán",
    "instructor": "LetDiv & Thầy Đặng Quốc Bảo",
    "duration": "22:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "XuzRt-BFIKU",
    "overview": "Hoàn thiện bức tranh phòng thủ Brute-Force, Rate Limiting và bảo mật API toàn diện.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Brute-Force & Rate Limiter Bảo vệ Login",
        "description": "Cơ chế khóa tạm thời và giám sát audit."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Rate Limiting, Brute-Force Protection & Audit Security (CS312)",
        "url": "https://www.youtube.com/watch?v=XuzRt-BFIKU",
        "type": "doc"
      },
      {
        "title": "OWASP Authentication Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "security:3.3": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "lessonId": "3.3",
    "title": "Tổng kết An toàn Web OWASP Top 10 & Kiểm toán Bảo mật (CS312)",
    "subtitle": "Hệ thống hóa 10 mũi phòng thủ chuẩn trước khi thi hết môn CS312",
    "instructor": "Thầy Đặng Quốc Bảo & Võ Nhật Huy",
    "duration": "26:30",
    "updatedAt": "CodeMind CS312 · 2026",
    "youtubeId": "V50ahKLTXxA",
    "overview": "Khép lại chuyên đề Bảo mật Web từ Input Validation đến quản trị phiên 2FA an toàn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh 10 lỗ hổng OWASP",
        "description": "Rà soát cuối môn CS312."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết An toàn Web OWASP Top 10 & Kiểm toán Bảo mật (CS312)",
        "url": "https://www.youtube.com/watch?v=V50ahKLTXxA",
        "type": "doc"
      },
      {
        "title": "OWASP Top 10 Official",
        "url": "https://owasp.org/www-project-top-ten/",
        "type": "doc"
      }
    ]
  },
  "ai-ml:1.1": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "1.1",
    "title": "Mạng Nơ-ron Nhân tạo là gì? | Deep Learning Chapter 1 (3Blue1Brown)",
    "subtitle": "Hiểu trực quan Trọng số (Weights), Bias, Tầng ẩn và Activation Phi tuyến",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "19:13",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "aircAruvnKk",
    "overview": "Khám phá cách mạng Nơ-ron Multi-Layer Perceptron trích xuất cạnh, nét rồi nhận diện chữ số viết tay qua các lớp trọng số.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Nơ-ron & Ma trận Trọng số",
        "description": "Cấu trúc một lớp tuyến tính kết hợp hàm kích hoạt."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Từ Sigmoid đến ReLU hiện đại",
        "description": "Tại sao Deep Learning ưu tiên ReLU/GELU."
      }
    ],
    "defaultNotes": [
      {
        "id": "aiml-11-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "ReLU(z) = max(0, z) có đạo hàm bằng 1 ở vùng dương, giúp mạng sâu hội tụ nhanh hơn Sigmoid nhiều lần.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "3Blue1Brown — But what is a Neural Network? (Ch.1)",
        "url": "https://www.youtube.com/watch?v=aircAruvnKk",
        "type": "doc"
      },
      {
        "title": "PyTorch Official Tutorials — Build the Neural Network",
        "url": "https://pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html",
        "type": "doc"
      }
    ]
  },
  "ai-ml:1.2": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "1.2",
    "title": "Chuẩn hóa Đầu vào & Phân rã Đặc trưng trong Mạng Nơ-ron (CS410)",
    "subtitle": "Chuẩn hóa giá trị [0,1], Standardization và phòng tránh Data Leakage",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "19:13",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "aircAruvnKk",
    "overview": "Liên kết cách biểu diễn đặc trưng đầu vào sạch sẽ giúp mạng nơ-ron học ổn định và chính xác trên dữ liệu thực tế.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Biểu diễn đặc trưng chuẩn hóa",
        "description": "Đưa mọi đặc trưng về cùng thang đo."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Chuẩn hóa Đầu vào & Phân rã Đặc trưng trong Mạng Nơ-ron (CS410)",
        "url": "https://www.youtube.com/watch?v=aircAruvnKk",
        "type": "doc"
      },
      {
        "title": "scikit-learn — Cross-validation & Preventing Data Leakage",
        "url": "https://scikit-learn.org/stable/common_pitfalls.html#data-leakage",
        "type": "doc"
      }
    ]
  },
  "ai-ml:1.3": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "1.3",
    "title": "Tổng ôn Cấu trúc Mạng Nơ-ron trước Quiz Chương 1",
    "subtitle": "Hệ thống hóa kiến thức Input Layer, Hidden Layer, ReLU & Dropout",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "19:13",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "aircAruvnKk",
    "overview": "Củng cố toàn diện Chương 1 trước Checkpoint Quiz.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập kiến trúc MLP",
        "description": "Chốt lại kiến thức nền."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Cấu trúc Mạng Nơ-ron trước Quiz Chương 1",
        "url": "https://www.youtube.com/watch?v=aircAruvnKk",
        "type": "doc"
      },
      {
        "title": "PyTorch Docs — Autograd & Inference Mode",
        "url": "https://pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html",
        "type": "doc"
      }
    ]
  },
  "ai-ml:2.1": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "2.1",
    "title": "Gradient Descent: Cách Mạng Nơ-ron Tối ưu Hàm Mất Mát (3Blue1Brown Ch.2)",
    "subtitle": "Hàm Loss Landscape, Độ dốc Gradient Vector & Learning Rate Scheduler",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "21:00",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "IHZwWFHWa-w",
    "overview": "Giải thích sâu sắc và trực quan thuật toán Gradient Descent — động cơ học hỏi của mọi mô hình Machine Learning & LLM.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Hàm Chi phí (Cost Function)",
        "description": "Đo lường độ tệ của bộ trọng số hiện tại."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Bản chất Vector Gradient âm",
        "description": "Tại sao trừ đi Gradient giúp tiến về đáy nhanh nhất."
      }
    ],
    "defaultNotes": [
      {
        "id": "aiml-21-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "Trong vòng lặp PyTorch luôn nhớ đúng thứ tự: zero_grad -> forward -> loss -> backward -> step.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "3Blue1Brown — Gradient Descent, how neural networks learn (Ch.2)",
        "url": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
        "type": "doc"
      }
    ]
  },
  "ai-ml:2.2": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "2.2",
    "title": "Bản chất Thuật toán Lan truyền ngược (Backpropagation) — 3Blue1Brown Ch.3",
    "subtitle": "Quy tắc Chain Rule, Lan truyền tín hiệu lỗi và Đồ thị Autograd",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "13:54",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "Ilg3gGewQ5U",
    "overview": "Bài giảng trứ danh giải thích cách một sai số ở đầu ra được chia trách nhiệm ngược về từng trọng số và bias ở các tầng phía trước.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Trực giác: Đầu ra mong muốn đẩy Trọng số tăng hay giảm?",
        "description": "3 cách làm thay đổi giá trị kích hoạt."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Tích lũy ảnh hưởng qua các tầng (Chain Rule)",
        "description": "Mini-batch Stochastic Gradient Descent."
      }
    ],
    "defaultNotes": [
      {
        "id": "aiml-22-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Backprop lưu lại activation của lượt Forward để tính gradient trong O(N) phép tính ở lượt Backward.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "3Blue1Brown — Backpropagation, intuitively (Ch.3)",
        "url": "https://www.youtube.com/watch?v=Ilg3gGewQ5U",
        "type": "doc"
      }
    ]
  },
  "ai-ml:2.3": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "2.3",
    "title": "Tổng ôn Gradient Descent & Backpropagation trước Quiz Chương 2",
    "subtitle": "Chuẩn bị hoàn chỉnh trước bài kiểm tra tối ưu hóa mạng nơ-ron",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "21:00",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "IHZwWFHWa-w",
    "overview": "Ôn lại quy trình tối ưu Loss, chống NaN và kiểm soát Overfitting.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chẩn đoán biểu đồ Loss Train/Val",
        "description": "Phân biệt Underfitting vs Overfitting."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Gradient Descent & Backpropagation trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
        "type": "doc"
      },
      {
        "title": "Andrej Karpathy — Recipe for Training Neural Networks",
        "url": "https://karpathy.github.io/2019/04/25/recipe/",
        "type": "git"
      }
    ]
  },
  "ai-ml:3.1": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "3.1",
    "title": "Đánh giá Mô hình, Generalization & Quy trình Tối ưu (CS410)",
    "subtitle": "Cân bằng giữa khớp dữ liệu và khả năng tổng quát hóa thực tế",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "13:54",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "Ilg3gGewQ5U",
    "overview": "Liên kết tối ưu trọng số mạng nơ-ron với kiểm soát Overfitting và đánh giá đúng độ tổng quát trên dữ liệu mới.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Từ hàm Loss đến Tổng quát hóa",
        "description": "Đảm bảo mô hình học quy luật thay vì học vẹt."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Đánh giá Mô hình, Generalization & Quy trình Tối ưu (CS410)",
        "url": "https://www.youtube.com/watch?v=Ilg3gGewQ5U",
        "type": "doc"
      },
      {
        "title": "Google ML Crash Course — Classification Precision & Recall",
        "url": "https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall",
        "type": "doc"
      }
    ]
  },
  "ai-ml:3.2": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "3.2",
    "title": "Từ Deep Learning MLP đến Transformer & Embedding Vector Space",
    "subtitle": "Hiểu không gian biểu diễn vector nhiều chiều trước khi xây dựng AI Agents",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "19:13",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "aircAruvnKk",
    "overview": "Kết nối biểu diễn tầng ẩn liên tục với không gian Vector Embeddings của LLM hiện đại.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Không gian biểu diễn đa chiều",
        "description": "Cầu nối sang môn CS420 RAG & AI Agents."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Từ Deep Learning MLP đến Transformer & Embedding Vector Space",
        "url": "https://www.youtube.com/watch?v=aircAruvnKk",
        "type": "doc"
      },
      {
        "title": "Vaswani et al. — Attention Is All You Need (arXiv)",
        "url": "https://arxiv.org/abs/1706.03762",
        "type": "doc"
      }
    ]
  },
  "ai-ml:3.3": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "lessonId": "3.3",
    "title": "Tổng kết Hành trình Machine Learning & Tối ưu Hàm Mất Mát (CS410)",
    "subtitle": "Chuẩn bị vượt qua Checkpoint Quiz cuối môn CS410",
    "instructor": "3Blue1Brown & TS. Lê Hoàng Mai",
    "duration": "21:00",
    "updatedAt": "CodeMind CS410 · 2026",
    "youtubeId": "IHZwWFHWa-w",
    "overview": "Tổng ôn từ tối ưu hóa Gradient Descent đến đánh giá chuẩn mô hình trước khi sang chuyên đề AI-Native RAG.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chốt lại kiến thức ML & Deep Learning",
        "description": "Sẵn sàng xây dựng RAG Agents ở CS420."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Hành trình Machine Learning & Tối ưu Hàm Mất Mát (CS410)",
        "url": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
        "type": "doc"
      },
      {
        "title": "PyTorch Examples Official Repository",
        "url": "https://github.com/pytorch/examples",
        "type": "git"
      }
    ]
  },
  "ai-agent:1.1": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "1.1",
    "title": "Tất Tần Tật Về RAG & Vector Embeddings Cơ Bản (CS420)",
    "subtitle": "Chunking Tài liệu, Text Embedding Vector và Vector Database Semantic Search",
    "instructor": "Việt Nguyễn AI & Võ Nhật Huy",
    "duration": "20:15",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "NQOYXmZxqvI",
    "overview": "Video tiếng Việt giải thích toàn diện cách Embedding biến tri thức thành vector, truy xuất ngữ nghĩa và đưa vào Prompt giảm ảo giác.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao LLM cần RAG thay vì nhồi hết vào Prompt?",
        "description": "Giới hạn Context Window & chi phí token."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Chunking, Embeddings & Vector Search",
        "description": "Tìm đúng đoạn văn bản gần nghĩa nhất."
      }
    ],
    "defaultNotes": [
      {
        "id": "ai-11-n1",
        "timeSec": 450,
        "timestamp": "07:30",
        "content": "Luôn dùng đúng CÙNG MỘT mô hình Embedding cho lúc nạp dữ liệu (Indexing) và lúc truy vấn người dùng (Querying)!",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Việt Nguyễn AI — Tất tần tật về RAG cơ bản trong 20 phút",
        "url": "https://www.youtube.com/watch?v=NQOYXmZxqvI",
        "type": "doc"
      },
      {
        "title": "Harish Neel — Vector Embeddings & RAG Architecture Explained",
        "url": "https://www.youtube.com/watch?v=9iGvXxH_fdE",
        "type": "doc"
      }
    ]
  },
  "ai-agent:1.2": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "1.2",
    "title": "Vector Embeddings, Similarity Threshold & Hybrid RAG (CS420)",
    "subtitle": "Kết hợp từ khóa chính xác, Cosine Distance và lọc nhiễu đầu vào LLM",
    "instructor": "TS. Lê Hoàng Mai & Võ Nhật Huy",
    "duration": "18:40",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "9iGvXxH_fdE",
    "overview": "Làm chủ cơ chế tính tương đồng vector, lọc metadata theo môn học và ghép Hybrid Search RRF.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Euclidean vs Cosine Distance trên Vector",
        "description": "Vì sao Text Embedding chọn Cosine."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Harish Neel — Vector Embeddings & Retrieval Architecture",
        "url": "https://www.youtube.com/watch?v=9iGvXxH_fdE",
        "type": "doc"
      }
    ]
  },
  "ai-agent:1.3": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "1.3",
    "title": "RAG Architecture Overview & Retrieval Evaluation (CS420)",
    "subtitle": "Tổng kết tầng Retrieval & Chuẩn bị sang Context Engineering",
    "instructor": "TS. Lê Hoàng Mai & Võ Nhật Huy",
    "duration": "21:10",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "63B-3rqRFbQ",
    "overview": "Hệ thống hóa luồng Ingestion -> Chunking -> Vector Store -> Retrieval cho Checkpoint Quiz Chương 1.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh Pipeline Retrieval",
        "description": "Chốt lại kiến thức Chương 1."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: RAG Architecture Overview & Retrieval Evaluation (CS420)",
        "url": "https://www.youtube.com/watch?v=63B-3rqRFbQ",
        "type": "doc"
      },
      {
        "title": "pgvector GitHub Official README",
        "url": "https://github.com/pgvector/pgvector",
        "type": "git"
      }
    ]
  },
  "ai-agent:2.1": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "2.1",
    "title": "Context Engineering & Tối ưu Lịch sử Trò chuyện AI Agent (LangGraph #5)",
    "subtitle": "Quản lý Token Budget, Tránh Lost-in-the-Middle và Prompt Injection Guard",
    "instructor": "TS. Lê Hoàng Mai & Võ Nhật Huy",
    "duration": "22:30",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "SEiQhQy2DRI",
    "overview": "Hướng dẫn các kỹ thuật Context Engineering thực chiến: cắt tỉa lịch sử hội thoại, tóm tắt ngữ cảnh và giữ Agent đi đúng trọng tâm.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vấn đề Phình To Token Lịch sử Hội thoại",
        "description": "Chi phí tăng theo cấp số nhân O(N^2) lượt chat."
      },
      {
        "timeSec": 450,
        "timestamp": "07:30",
        "title": "Sliding Window & Summarization Memory",
        "description": "Giữ nguyên ngữ cảnh cốt lõi với chi phí tối thiểu."
      }
    ],
    "defaultNotes": [
      {
        "id": "ai-21-n1",
        "timeSec": 450,
        "timestamp": "07:30",
        "content": "Không bao giờ gửi toàn bộ raw conversation 100 turns vào LLM; dùng Summary + K turns gần nhất.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Dev xịn — Context Engineering & Tối ưu Lịch sử Trò chuyện LLM",
        "url": "https://www.youtube.com/watch?v=SEiQhQy2DRI",
        "type": "doc"
      }
    ]
  },
  "ai-agent:2.2": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "2.2",
    "title": "Xây dựng RAG Pipeline Không Ảo Giác & Guardrails (CS420)",
    "subtitle": "Kiểm chứng Faithfulness, Trích dẫn Nguồn & Socratic Pedagogy",
    "instructor": "Việt Nguyễn AI & TS. Lê Hoàng Mai",
    "duration": "20:15",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "NQOYXmZxqvI",
    "overview": "Thực hành ghép Context Engineering + Output Guardrails để triệt tiêu ảo giác LLM.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chống Hallucination bằng Prompt + Guardrail",
        "description": "Chỉ trả lời từ ngữ cảnh đã truy xuất."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Xây dựng RAG Pipeline Không Ảo Giác & Guardrails (CS420)",
        "url": "https://www.youtube.com/watch?v=NQOYXmZxqvI",
        "type": "doc"
      },
      {
        "title": "Google Gemini API — Safety & Structured Outputs",
        "url": "https://ai.google.dev/gemini-api/docs/structured-output",
        "type": "doc"
      }
    ]
  },
  "ai-agent:2.3": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "2.3",
    "title": "Tổng ôn Context Engineering & RAG Guardrails trước Quiz",
    "subtitle": "Chốt lại kiến thức Chương 2 trước khi sang Multi-Agent Tool Calling",
    "instructor": "TS. Lê Hoàng Mai & Võ Nhật Huy",
    "duration": "22:30",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "SEiQhQy2DRI",
    "overview": "Ôn tập kiến trúc Prompt, tóm tắt lịch sử và chống Prompt Injection.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist RAG Guardrails",
        "description": "Chuẩn bị vượt qua Quiz Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Context Engineering & RAG Guardrails trước Quiz",
        "url": "https://www.youtube.com/watch?v=SEiQhQy2DRI",
        "type": "doc"
      },
      {
        "title": "Anthropic / Google Prompt Engineering Guides",
        "url": "https://ai.google.dev/gemini-api/docs/prompting-strategies",
        "type": "doc"
      }
    ]
  },
  "ai-agent:3.1": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "3.1",
    "title": "Multi-Agent Architecture, Tool Calling & LangGraph Loop (CS420)",
    "subtitle": "Chia nhỏ tác vụ thành Router, Researcher, Verifier & Human-in-the-Loop",
    "instructor": "Dev xịn & TS. Lê Hoàng Mai",
    "duration": "24:15",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "qx41mGkX3cA",
    "overview": "Video tiếng Việt thực chiến xây dựng hệ thống Multi-Agent với LangGraph: phân chia vai trò chuyên môn, quản lý Graph State và điều phối luồng công việc.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao một Mega-Agent dễ rối khi nhiều công cụ?",
        "description": "Lý do chia nhỏ Multi-Agent Supervisor."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "State Graph, Conditional Edges & Tool Execution",
        "description": "Điều phối bước đi chắc chắn bằng đồ thị trạng thái."
      }
    ],
    "defaultNotes": [
      {
        "id": "ai-31-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Mỗi sub-agent chỉ nên nắm 3–5 tools chuyên biệt; đưa 40 tools vào 1 prompt sẽ làm giảm độ chính xác gọi tool.",
        "createdAt": "AI Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Multi-Agent Architecture, Tool Calling & LangGraph Loop (CS420)",
        "url": "https://www.youtube.com/watch?v=qx41mGkX3cA",
        "type": "doc"
      },
      {
        "title": "Google Gemini Function Calling Documentation",
        "url": "https://ai.google.dev/gemini-api/docs/function-calling",
        "type": "doc"
      }
    ]
  },
  "ai-agent:3.2": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "3.2",
    "title": "Xây dựng Agentic RAG Pipeline & Tool Orchestration Thực chiến (CS420)",
    "subtitle": "Kết nối Vector Search, Reranking và Agent Tool Calling đầu cuối",
    "instructor": "TS. Lê Hoàng Mai & Võ Nhật Huy",
    "duration": "21:10",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "63B-3rqRFbQ",
    "overview": "Hoàn thiện bức tranh tích hợp RAG + AI Agents trong một ứng dụng Web Production.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Từ RAG Tĩnh đến Agentic Workflows",
        "description": "Kiểm chứng câu trả lời và tự sửa truy vấn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Xây dựng Agentic RAG Pipeline & Tool Orchestration Thực chiến (CS420)",
        "url": "https://www.youtube.com/watch?v=63B-3rqRFbQ",
        "type": "doc"
      },
      {
        "title": "Anthropic — Building Effective Agents",
        "url": "https://www.anthropic.com/research/building-effective-agents",
        "type": "doc"
      }
    ]
  },
  "ai-agent:3.3": {
    "subjectId": "ai-agent",
    "subjectCode": "CS420",
    "lessonId": "3.3",
    "title": "Tổng kết Hệ thống Multi-Agent & AI-Native Production (CS420)",
    "subtitle": "Hệ thống hóa từ pgvector RAG tới Tool-Calling LangGraph trước Quiz cuối môn",
    "instructor": "Dev xịn & TS. Lê Hoàng Mai",
    "duration": "24:15",
    "updatedAt": "CodeMind CS420 · 2026",
    "youtubeId": "qx41mGkX3cA",
    "overview": "Khép lại chuyên đề AI-Native Web App & Agents.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist AI-Native Web App",
        "description": "Sẵn sàng sang chặng Vận hành Cloud DevOps."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Hệ thống Multi-Agent & AI-Native Production (CS420)",
        "url": "https://www.youtube.com/watch?v=qx41mGkX3cA",
        "type": "doc"
      },
      {
        "title": "OWASP Top 10 for LLM Applications",
        "url": "https://genai.owasp.org/llm-top-10/",
        "type": "doc"
      }
    ]
  },
  "devops:1.1": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "1.1",
    "title": "Windows Terminal & Môi trường Linux WSL2 Cho DevOps (F8 Official)",
    "subtitle": "Làm chủ Terminal Linux chuẩn bị chạy Docker Containers & CI/CD",
    "instructor": "Sơn Đặng (F8 Official) & Võ Nhật Huy",
    "duration": "18:10",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "7ppRSaGT1uw",
    "overview": "Hướng dẫn chi tiết cài đặt và làm việc hiệu quả với Windows Terminal + WSL2 Linux — nền móng cho Docker và Cloud.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao DevOps cần môi trường Linux?",
        "description": "Đồng bộ Local với Server Production Ubuntu."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Cấu hình WSL2 & Shell CLI",
        "description": "Thao tác mượt mà với hệ sinh thái Container."
      }
    ],
    "defaultNotes": [
      {
        "id": "dev-11-n1",
        "timeSec": 360,
        "timestamp": "06:00",
        "content": "Lưu project Docker inside `/home/<user>` của WSL2 giúp `npm install` và `docker build` nhanh hơn nhiều lần so với ổ C:/mnt/c.",
        "createdAt": "F8 Bookmark"
      }
    ],
    "resources": [
      {
        "title": "F8 Official — Giới thiệu Windows Terminal & WSL2 Linux",
        "url": "https://www.youtube.com/watch?v=7ppRSaGT1uw",
        "type": "doc"
      },
      {
        "title": "Code Dạo — Tự học Docker siêu tốc trong 10 phút",
        "url": "https://www.youtube.com/watch?v=1k8pox8mkxc",
        "type": "doc"
      }
    ]
  },
  "devops:1.2": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "1.2",
    "title": "Docker Siêu Tốc: Image, Dockerfile & Multi-Stage Build (CS405)",
    "subtitle": "Hiểu Layer Caching, .dockerignore và đóng gói App chuẩn Production",
    "instructor": "Phạm Huy Hoàng (Code Dạo) & Võ Nhật Huy",
    "duration": "11:45",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "1k8pox8mkxc",
    "overview": "Video trực quan dễ hiểu giúp nắm gọn khái niệm Container, viết Dockerfile từ A-Z và chạy ứng dụng thực tế.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao Docker trị dứt điểm 'Máy em chạy được'?",
        "description": "Đóng gói đồng bộ Runtime + Dependencies."
      },
      {
        "timeSec": 300,
        "timestamp": "05:00",
        "title": "Viết Dockerfile & Build Layer Cache",
        "description": "Tối ưu thứ tự COPY và RUN."
      }
    ],
    "defaultNotes": [
      {
        "id": "dev-12-n1",
        "timeSec": 300,
        "timestamp": "05:00",
        "content": "Nhớ luôn thêm `node_modules` và `.env` vào `.dockerignore` trước khi chạy `docker build`.",
        "createdAt": "DevOps Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Code Dạo — Tự học Docker siêu tốc trong 10 phút",
        "url": "https://www.youtube.com/watch?v=1k8pox8mkxc",
        "type": "doc"
      },
      {
        "title": "Docker Official — Multi-stage Builds",
        "url": "https://docs.docker.com/build/building/multi-stage/",
        "type": "doc"
      }
    ]
  },
  "devops:1.3": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "1.3",
    "title": "Tổng ôn Môi trường Linux & Dockerfile Optimization trước Quiz",
    "subtitle": "Chuẩn bị hoàn tất Checkpoint Quiz Chương 1 (CS405)",
    "instructor": "Võ Nhật Huy & Đỗ Hoàng Nam",
    "duration": "18:10",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "7ppRSaGT1uw",
    "overview": "Rà soát lại kiến thức WSL2, Namespaces/Cgroups và Multi-stage Dockerfile.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập kiến trúc Container",
        "description": "Chốt kiến thức Chương 1."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng ôn Môi trường Linux & Dockerfile Optimization trước Quiz",
        "url": "https://www.youtube.com/watch?v=7ppRSaGT1uw",
        "type": "doc"
      },
      {
        "title": "Dockerfile Best Practices Official",
        "url": "https://docs.docker.com/build/building/best-practices/",
        "type": "doc"
      }
    ]
  },
  "devops:2.1": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "2.1",
    "title": "Hướng Dẫn Docker Chi Tiết: Dockerfile, Volumes & Docker Compose (CS405)",
    "subtitle": "Kết nối đa dịch vụ Backend, Frontend, Database bền vững với Compose YAML",
    "instructor": "Đỗ Hoàng Nam & Võ Nhật Huy",
    "duration": "25:40",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "tnu3hvhNgGk",
    "overview": "Hướng dẫn chi tiết viết `docker-compose.yml`, quản lý Named Volumes, Port Mapping và Networking nội bộ giữa các Container.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Build Image vs Mount Volumes giữ dữ liệu",
        "description": "Tránh mất dữ liệu DB khi recreate container."
      },
      {
        "timeSec": 600,
        "timestamp": "10:00",
        "title": "Docker Compose Networking & Healthcheck",
        "description": "Khởi động chuẩn thứ tự Backend và DB."
      }
    ],
    "defaultNotes": [
      {
        "id": "dev-21-n1",
        "timeSec": 600,
        "timestamp": "10:00",
        "content": "Luôn dùng `pg_isready` Healthcheck cho DB thay vì sleep cứng trong entrypoint.",
        "createdAt": "DevOps Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Hướng dẫn Docker Cơ bản đến Nâng cao (Dockerfile & Compose)",
        "url": "https://www.youtube.com/watch?v=tnu3hvhNgGk",
        "type": "doc"
      }
    ]
  },
  "devops:2.2": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "2.2",
    "title": "Triển khai Dự án Thực tế với Docker, Nginx Proxy & VPS (CS405)",
    "subtitle": "Cấu hình Reverse Proxy, Tên miền SSL và Bảo vệ Port CSDL nội bộ",
    "instructor": "Hỏi Dân IT & Đỗ Hoàng Nam",
    "duration": "24:50",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "Vo901K64pi4",
    "overview": "Minh họa quy trình đưa ứng dụng Container hóa lên VPS Production với Nginx Proxy bảo vệ cổng nội bộ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cô lập Container đằng sau Nginx Proxy",
        "description": "Chỉ mở duy nhất cổng 80/443 ra ngoài."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Triển khai Dự án Thực tế với Docker, Nginx Proxy & VPS (CS405)",
        "url": "https://www.youtube.com/watch?v=Vo901K64pi4",
        "type": "doc"
      },
      {
        "title": "OWASP Docker Security Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html",
        "type": "doc"
      }
    ]
  },
  "devops:2.3": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "2.3",
    "title": "Ôn tập Docker Compose & Bảo mật Container trước Quiz Chương 2",
    "subtitle": "Tổng hợp Volumes, Healthcheck và Non-root Security",
    "instructor": "Đỗ Hoàng Nam & Võ Nhật Huy",
    "duration": "25:40",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "tnu3hvhNgGk",
    "overview": "Rà soát lại Compose Networking & Security trước khi sang Tự động hóa CI/CD Pipeline.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist Docker Compose",
        "description": "Chốt kiến thức Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Docker Compose & Bảo mật Container trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=tnu3hvhNgGk",
        "type": "doc"
      },
      {
        "title": "Docker Compose Official Spec",
        "url": "https://docs.docker.com/compose/compose-file/",
        "type": "doc"
      }
    ]
  },
  "devops:3.1": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "3.1",
    "title": "CI/CD với GitHub Actions: Tự Build, Test, Push & Deploy Docker (CS405)",
    "subtitle": "Tự động hóa trọn vẹn chu trình Tích hợp liên tục và Đóng gói Container",
    "instructor": "Namlabs & Đỗ Hoàng Nam",
    "duration": "23:10",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "05vXCdpP_P0",
    "overview": "Video tiếng Việt thực hành viết YAML GitHub Actions kích hoạt tự động kiểm thử, build Docker Image gắn tag SHA và đẩy lên Registry.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Continuous Integration vs Continuous Deployment",
        "description": "Luồng hoạt động của GitHub Actions Runner."
      },
      {
        "timeSec": 480,
        "timestamp": "08:00",
        "title": "Build & Push Docker Image tự động",
        "description": "Quản lý Secrets an toàn trong Repository Settings."
      }
    ],
    "defaultNotes": [
      {
        "id": "dev-31-n1",
        "timeSec": 480,
        "timestamp": "08:00",
        "content": "Lưu SSH Private Key và Docker Token vào GitHub Repository Secrets, tuyệt đối không ghi thẳng vào file .yml!",
        "createdAt": "DevOps Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Namlabs — CI/CD là gì? GitHub Actions tự build, push, deploy Docker",
        "url": "https://www.youtube.com/watch?v=05vXCdpP_P0",
        "type": "git"
      },
      {
        "title": "Holetex — GitHub Actions CI/CD Trực quan",
        "url": "https://www.youtube.com/watch?v=ZKaDy0mNHGs",
        "type": "git"
      }
    ]
  },
  "devops:3.2": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "3.2",
    "title": "GitHub Actions CI/CD Automation & Zero-Downtime Delivery (CS405)",
    "subtitle": "Quản lý Secrets, Deploy Workflow và Chiến lược Rollback An toàn",
    "instructor": "Holetex & Võ Nhật Huy",
    "duration": "19:35",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "ZKaDy0mNHGs",
    "overview": "Thực hành cấu hình pipeline GitHub Actions gọn sạch, lưu secrets an toàn và kích hoạt cập nhật ứng dụng không gián đoạn.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Thiết kế Deploy Job qua GitHub Secrets",
        "description": "Kết nối tự động an toàn lên server."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Holetex — GitHub Actions CI/CD Chưa bao giờ dễ hơn thế",
        "url": "https://www.youtube.com/watch?v=ZKaDy0mNHGs",
        "type": "git"
      }
    ]
  },
  "devops:3.3": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "lessonId": "3.3",
    "title": "Tổng kết Deploy Docker & GitHub Actions Production (CS405)",
    "subtitle": "Hệ thống hóa quy trình từ Code Local tới CI/CD Production trước Quiz",
    "instructor": "Hỏi Dân IT & Đỗ Hoàng Nam",
    "duration": "24:50",
    "updatedAt": "CodeMind CS405 · 2026",
    "youtubeId": "Vo901K64pi4",
    "overview": "Khép lại toàn bộ chặng DevOps & CI/CD Pipeline Automation.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát toàn luồng DevOps",
        "description": "Sẵn sàng sang Kubernetes & Cloud AWS."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Deploy Docker & GitHub Actions Production (CS405)",
        "url": "https://www.youtube.com/watch?v=Vo901K64pi4",
        "type": "doc"
      },
      {
        "title": "GitHub Actions Security Hardening Guides",
        "url": "https://docs.github.com/en/actions/security-for-github-actions",
        "type": "git"
      }
    ]
  },
  "cloud:1.1": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "1.1",
    "title": "Giao tiếp Microservices: REST API, gRPC, RabbitMQ & Kafka (CS415)",
    "subtitle": "Lựa chọn Sync RPC vs Async Message Broker trên Hạ tầng Cloud",
    "instructor": "Võ Nhật Huy & TS. Lê Hoàng Mai",
    "duration": "18:30",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "8U1M_NRnmNY",
    "overview": "So sánh trực diện REST JSON, gRPC nhị phân, RabbitMQ và Apache Kafka khi thiết kế kiến trúc Microservices trên Cloud.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "REST & gRPC cho giao tiếp Đồng bộ",
        "description": "Khi caller cần phản hồi tức thì."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "RabbitMQ / Kafka tách lỏng Async",
        "description": "Chịu lỗi và san tải cho các tác vụ nền."
      }
    ],
    "defaultNotes": [
      {
        "id": "cld-11-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Đặt Circuit Breaker + Timeout ngắn cho lời gọi gRPC/REST đồng bộ để ngăn sập dây chuyền.",
        "createdAt": "Cloud Bookmark"
      }
    ],
    "resources": [
      {
        "title": "How Microservices Communicate: REST vs gRPC vs RabbitMQ vs Kafka",
        "url": "https://www.youtube.com/watch?v=8U1M_NRnmNY",
        "type": "doc"
      }
    ]
  },
  "cloud:1.2": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "1.2",
    "title": "Đóng gói Container & Nguyên tắc 12-Factor Cloud Native (CS415)",
    "subtitle": "Chuẩn bị dịch vụ Stateless sẵn sàng chạy trên cụm Cloud & Kubernetes",
    "instructor": "Việt Nguyễn AI & Võ Nhật Huy",
    "duration": "12:30",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "xfBbLg6-4xY",
    "overview": "Liên kết mô hình Container Stateless, cấu hình Environment Variables và chuẩn bị lên hạ tầng điều phối Kubernetes.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Stateless Containers & Cloud Portability",
        "description": "Tách cấu hình, logs và Object Storage."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Đóng gói Container & Nguyên tắc 12-Factor Cloud Native (CS415)",
        "url": "https://www.youtube.com/watch?v=xfBbLg6-4xY",
        "type": "doc"
      },
      {
        "title": "The Twelve-Factor App Methodology",
        "url": "https://12factor.net/",
        "type": "doc"
      }
    ]
  },
  "cloud:1.3": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "1.3",
    "title": "#1 Giới thiệu Hệ sinh thái Kubernetes & Amazon EKS (CS415)",
    "subtitle": "Bước đệm từ Docker đơn lẻ lên Cụm Điều phối Cloud EKS",
    "instructor": "Viet Tran & Võ Nhật Huy",
    "duration": "15:20",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "v5wZlQnHU3A",
    "overview": "Giới thiệu bài toán quản lý hàng trăm container trên nhiều máy chủ Cloud và lý do cần Kubernetes.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Từ Single Server Docker đến Cloud Cluster",
        "description": "Giải quyết Auto-healing & Auto-scaling."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: #1 Giới thiệu Hệ sinh thái Kubernetes & Amazon EKS (CS415)",
        "url": "https://www.youtube.com/watch?v=v5wZlQnHU3A",
        "type": "doc"
      },
      {
        "title": "AWS Well-Architected Framework",
        "url": "https://aws.amazon.com/architecture/well-architected/",
        "type": "doc"
      }
    ]
  },
  "cloud:2.1": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "2.1",
    "title": "Kubernetes là gì? Control Plane, Pods, Nodes & Amazon EKS (CS415)",
    "subtitle": "Kiến trúc lõi của cụm Kubernetes điều phối hàng trăm Container tự phục hồi",
    "instructor": "Viet Tran & Võ Nhật Huy",
    "duration": "24:10",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "Clhqw2CANSQ",
    "overview": "Video tiếng Việt phân tích chi tiết các thành phần Kubernetes Control Plane (API Server, Scheduler, etcd) và Worker Node (Kubelet, Kube-proxy).",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao Kubernetes trở thành Hệ điều hành của Cloud?",
        "description": "Self-healing, Service Discovery & Rolling Update."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Control Plane vs Worker Nodes",
        "description": "Vai trò etcd, API Server, Kubelet và Pod."
      }
    ],
    "defaultNotes": [
      {
        "id": "cld-21-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Pod có IP động và dễ bị hủy/tạo mới liên tục — luôn dùng đối tượng Kubernetes `Service` đứng trước để định tuyến ổn định.",
        "createdAt": "Cloud Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Nguyen Duc Hoang — Kubernetes là gì? Giải thích trực quan trong 10 phút",
        "url": "https://www.youtube.com/watch?v=fbsBWQHxcpw",
        "type": "doc"
      },
      {
        "title": "Viet Tran — #2 Kubernetes là gì? Kiến trúc K8s & Amazon EKS",
        "url": "https://www.youtube.com/watch?v=Clhqw2CANSQ",
        "type": "doc"
      }
    ]
  },
  "cloud:2.2": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "2.2",
    "title": "Kubernetes Giải thích Trực quan: Pod, Service, Ingress & Scaling (CS415)",
    "subtitle": "Hiểu sâu cơ chế định tuyến Service, Probes và cân bằng tải trong K8s",
    "instructor": "Nguyen Duc Hoang & Võ Nhật Huy",
    "duration": "12:15",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "fbsBWQHxcpw",
    "overview": "Minh họa cực kỳ dễ nhớ các khối Pod, ReplicaSet, Deployment, Service và Ingress phối hợp trong cụm K8s.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Pod, Service Discovery & Ingress",
        "description": "Cách traffic từ người dùng đi tới đúng Container."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Kubernetes Giải thích Trực quan: Pod, Service, Ingress & Scaling (CS415)",
        "url": "https://www.youtube.com/watch?v=fbsBWQHxcpw",
        "type": "doc"
      },
      {
        "title": "Kubernetes Docs — Configure Liveness, Readiness and Startup Probes",
        "url": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
        "type": "doc"
      }
    ]
  },
  "cloud:2.3": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "2.3",
    "title": "Ôn tập Kubernetes Core & EKS Architecture trước Quiz Chương 2",
    "subtitle": "Chốt lại kiến thức K8s chuẩn bị bước sang HPA Auto-Scaling & Serverless",
    "instructor": "Viet Tran & Võ Nhật Huy",
    "duration": "24:10",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "Clhqw2CANSQ",
    "overview": "Tổng kết toàn bộ khái niệm nền tảng Kubernetes & Amazon EKS.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập Service, Deployment & Probes",
        "description": "Sẵn sàng sang Chương 3."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Kubernetes Core & EKS Architecture trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=Clhqw2CANSQ",
        "type": "doc"
      },
      {
        "title": "Kubernetes Concepts Overview",
        "url": "https://kubernetes.io/docs/concepts/overview/",
        "type": "doc"
      }
    ]
  },
  "cloud:3.1": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "3.1",
    "title": "Amazon EKS, Auto-Scaling & Quản trị Cụm Production (CS415)",
    "subtitle": "Co giãn hạ tầng thông minh theo tải thực tế và tối ưu chi phí Cloud",
    "instructor": "Viet Tran & TS. Lê Hoàng Mai",
    "duration": "15:20",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "v5wZlQnHU3A",
    "overview": "Ứng dụng Amazon EKS kết hợp Autoscaler và Load Balancer AWS trong hệ thống doanh nghiệp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Vận hành Managed Kubernetes trên AWS EKS",
        "description": "High Availability Multi-AZ."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Amazon EKS, Auto-Scaling & Quản trị Cụm Production (CS415)",
        "url": "https://www.youtube.com/watch?v=v5wZlQnHU3A",
        "type": "doc"
      },
      {
        "title": "Kubernetes Docs — Horizontal Pod Autoscaling",
        "url": "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
        "type": "doc"
      }
    ]
  },
  "cloud:3.2": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "3.2",
    "title": "Observability & Giám sát Giao tiếp Microservices Đám mây (CS415)",
    "subtitle": "Trace-ID xuyên suốt Sync/Async Services và Phân tích Tail Latency",
    "instructor": "Võ Nhật Huy & TS. Lê Hoàng Mai",
    "duration": "18:30",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "8U1M_NRnmNY",
    "overview": "Cách theo dõi sức khỏe cụm Microservices bằng Telemetry, Prometheus và Distributed Tracing.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Truy vết giao tiếp đa dịch vụ",
        "description": "Liên kết HTTP/gRPC/Kafka qua Trace Context."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Observability & Giám sát Giao tiếp Microservices Đám mây (CS415)",
        "url": "https://www.youtube.com/watch?v=8U1M_NRnmNY",
        "type": "doc"
      },
      {
        "title": "OpenTelemetry Official Concepts",
        "url": "https://opentelemetry.io/docs/concepts/signals/",
        "type": "doc"
      }
    ]
  },
  "cloud:3.3": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "lessonId": "3.3",
    "title": "Tổng kết Kubernetes, Cloud Native & Observability (CS415)",
    "subtitle": "Sẵn sàng sang chuyên đề Quản lý Dự án Agile Scrum (CS401)",
    "instructor": "Nguyen Duc Hoang & Võ Nhật Huy",
    "duration": "12:15",
    "updatedAt": "CodeMind CS415 · 2026",
    "youtubeId": "fbsBWQHxcpw",
    "overview": "Khép lại môn Cloud & Microservices CS415.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Toàn cảnh Hệ sinh thái Kubernetes Cloud",
        "description": "Chốt lại kiến thức trước Quiz cuối môn."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Kubernetes, Cloud Native & Observability (CS415)",
        "url": "https://www.youtube.com/watch?v=fbsBWQHxcpw",
        "type": "doc"
      },
      {
        "title": "Google SRE Book — Monitoring Distributed Systems",
        "url": "https://sre.google/sre-book/monitoring-distributed-systems/",
        "type": "doc"
      }
    ]
  },
  "scrum:1.1": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "1.1",
    "title": "Giới thiệu về Agile và Khung làm việc Scrum (CS401)",
    "subtitle": "3 Trụ cột Minh bạch - Thanh tra - Thích nghi & Cấu trúc Đội ngũ Scrum",
    "instructor": "Anh Nguyen Ngoc & Nguyễn Bá Hòa",
    "duration": "18:20",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "A8waDSbDA8g",
    "overview": "Video bài giảng tiếng Việt giải thích nền tảng tư duy Agile, vì sao Scrum vượt trội ở bài toán phần mềm phức tạp và 3 vai trò cốt lõi.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Waterfall vs Tư duy Thích nghi Agile",
        "description": "Rút ngắn vòng lặp phản hồi giá trị."
      },
      {
        "timeSec": 400,
        "timestamp": "06:40",
        "title": "3 Trụ cột & 3 Vai trò trong Scrum",
        "description": "Product Owner, Scrum Master & Developers."
      }
    ],
    "defaultNotes": [
      {
        "id": "scr-11-n1",
        "timeSec": 400,
        "timestamp": "06:40",
        "content": "Product Owner quyết định 'Làm cái gì & Thứ tự nào'; Developers quyết định 'Làm như thế nào & Bao nhiêu việc vừa Sprint'.",
        "createdAt": "Scrum Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Anh Nguyen Ngoc — Bài 1: Giới thiệu về Agile và Scrum",
        "url": "https://www.youtube.com/watch?v=A8waDSbDA8g",
        "type": "doc"
      },
      {
        "title": "Enosta Hub — Agile Là Gì & Ứng dụng Thực tế",
        "url": "https://www.youtube.com/watch?v=80PevHArDu8",
        "type": "doc"
      }
    ]
  },
  "scrum:1.2": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "1.2",
    "title": "Vận hành Agile & 5 Sự kiện Chu kỳ Sprint Hiệu quả (CS401)",
    "subtitle": "Planning, Daily 15p, Sprint Review Demo & Retrospective Cải tiến",
    "instructor": "Enosta Hub & Nguyễn Bá Hòa",
    "duration": "15:40",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "80PevHArDu8",
    "overview": "Hướng dẫn áp dụng đúng mục tiêu của từng sự kiện Sprint để tăng tốc độ bàn giao phần mềm mà không gây họp hành rườm rà.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Nhịp độ vận hành Agile hàng ngày & cuối Sprint",
        "description": "Tối đa hóa hiệu suất giao tiếp nhóm."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Vận hành Agile & 5 Sự kiện Chu kỳ Sprint Hiệu quả (CS401)",
        "url": "https://www.youtube.com/watch?v=80PevHArDu8",
        "type": "doc"
      },
      {
        "title": "The 2020 Scrum Guide Official",
        "url": "https://scrumguides.org/scrum-guide.html",
        "type": "doc"
      }
    ]
  },
  "scrum:1.3": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "1.3",
    "title": "Ôn tập 3 Trụ cột & 5 Sự kiện Scrum trước Quiz Chương 1",
    "subtitle": "Tổng kết nền tảng Agile Scrum Guide 2020",
    "instructor": "Anh Nguyen Ngoc & Nguyễn Bá Hòa",
    "duration": "18:20",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "A8waDSbDA8g",
    "overview": "Rà soát lại vai trò và sự kiện trước bài kiểm tra Chương 1.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập kiến thức Chương 1",
        "description": "Chuẩn bị vượt qua Checkpoint Quiz."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập 3 Trụ cột & 5 Sự kiện Scrum trước Quiz Chương 1",
        "url": "https://www.youtube.com/watch?v=A8waDSbDA8g",
        "type": "doc"
      },
      {
        "title": "Scrum.org — What is Scrum?",
        "url": "https://www.scrum.org/resources/what-is-scrum",
        "type": "doc"
      }
    ]
  },
  "scrum:2.1": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "2.1",
    "title": "Quản lý Yêu cầu Dự án, Product Backlog & User Story trong Scrum (CS401)",
    "subtitle": "Cách viết User Story đúng chuẩn và sắp xếp thứ tự ưu tiên Backlog",
    "instructor": "Anh Nguyen Ngoc & Nguyễn Bá Hòa",
    "duration": "17:50",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "4HVmdgM0398",
    "overview": "Video tiếng Việt giải thích chi tiết cấu trúc Product Backlog, kỹ thuật viết User Story và phân cấp Epic -> Story -> Task.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Từ Yêu cầu Nghiệp vụ tới Product Backlog",
        "description": "Sắp xếp độ ưu tiên theo giá trị kinh doanh."
      },
      {
        "timeSec": 420,
        "timestamp": "07:00",
        "title": "Viết User Story & Acceptance Criteria",
        "description": "Kết nối nhu cầu người dùng với công việc Dev."
      }
    ],
    "defaultNotes": [
      {
        "id": "scr-21-n1",
        "timeSec": 420,
        "timestamp": "07:00",
        "content": "Luôn cắt Story theo lát cắt dọc (Vertical Slice) chạy xuyên DB-API-UI thay vì chia ngang 'làm DB xong hết mới làm UI'.",
        "createdAt": "Scrum Bookmark"
      }
    ],
    "resources": [
      {
        "title": "Anh Nguyen Ngoc — Bài 2: Quản lý Yêu cầu Dự án & Product Backlog",
        "url": "https://www.youtube.com/watch?v=4HVmdgM0398",
        "type": "doc"
      }
    ]
  },
  "scrum:2.2": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "2.2",
    "title": "Ước lượng Story Points & Planning Poker trong Sprint Planning (CS401)",
    "subtitle": "Áp dụng Tiêu chí INVEST và Dãy Fibonacci (1, 2, 3, 5, 8) ước lượng chuẩn xác",
    "instructor": "Cộng đồng CrossTech & Nguyễn Bá Hòa",
    "duration": "21:10",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "6g6YmdST6js",
    "overview": "Video tiếng Việt phân tích vì sao Story Points tốt hơn Man-hours, cách chơi Planning Poker và làm sao tránh Overcommit Sprint.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Tại sao không dùng Giờ tuyệt đối để Estimate?",
        "description": "Sự khác biệt tốc độ cá nhân & bất định kỹ thuật."
      },
      {
        "timeSec": 500,
        "timestamp": "08:20",
        "title": "Fibonacci Story Points & Capacity Planning",
        "description": "Đo vận tốc thực tế thay vì đoán mò."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "CrossTech — Estimate trong Sprint Planning bằng Story Point",
        "url": "https://www.youtube.com/watch?v=6g6YmdST6js",
        "type": "doc"
      }
    ]
  },
  "scrum:2.3": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "2.3",
    "title": "Ôn tập User Story & INVEST trước Quiz Chương 2",
    "subtitle": "Củng cố cách viết Acceptance Criteria & Estimate Story Points",
    "instructor": "Anh Nguyen Ngoc & Nguyễn Bá Hòa",
    "duration": "17:50",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "4HVmdgM0398",
    "overview": "Rà soát lại cách tách Story chuẩn dọc trước khi sang Definition of Done (DoD).",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Ôn tập INVEST",
        "description": "Chốt lại kiến thức Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập User Story & INVEST trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=4HVmdgM0398",
        "type": "doc"
      },
      {
        "title": "Agile Alliance — INVEST Criteria",
        "url": "https://www.agilealliance.org/glossary/invest/",
        "type": "doc"
      }
    ]
  },
  "scrum:3.1": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "3.1",
    "title": "Chuẩn Chất lượng Hoàn thành (DoD) & Kỷ luật Bàn giao Agile (CS401)",
    "subtitle": "Tránh 'Done giả' và giảm Technical Debt bằng Definition of Done rõ ràng",
    "instructor": "Enosta Hub & Nguyễn Bá Hòa",
    "duration": "15:40",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "80PevHArDu8",
    "overview": "Phân tích hậu quả của 'Undone work' trong nhóm phần mềm và cách thiết lập Definition of Done 4 cấp độ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Làm sao đo một thẻ thực sự Done?",
        "description": "Khác biệt giữa Dev xong vs Shippable Product."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Chuẩn Chất lượng Hoàn thành (DoD) & Kỷ luật Bàn giao Agile (CS401)",
        "url": "https://www.youtube.com/watch?v=80PevHArDu8",
        "type": "doc"
      },
      {
        "title": "Scrum.org — Walking through a Definition of Done",
        "url": "https://www.scrum.org/resources/blog/walking-through-definition-done",
        "type": "doc"
      }
    ]
  },
  "scrum:3.2": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "3.2",
    "title": "Tự động hóa Cổng Quality Gate DoD bằng CI/CD Pipeline (CS401)",
    "subtitle": "Ép mọi Pull Request vượt qua Pytest & Build trước khi Merge sang Done",
    "instructor": "Namlabs & Nguyễn Bá Hòa",
    "duration": "23:10",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "05vXCdpP_P0",
    "overview": "Kết nối kiến thức Scrum Definition of Done với CI Status Check thực tế trên GitHub.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Code Review & CI Verification Gate",
        "description": "Đảm bảo 100% chất lượng trên nhánh main."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tự động hóa Cổng Quality Gate DoD bằng CI/CD Pipeline (CS401)",
        "url": "https://www.youtube.com/watch?v=05vXCdpP_P0",
        "type": "doc"
      },
      {
        "title": "Google Engineering Practices — Code Review Developer Guide",
        "url": "https://google.github.io/eng-practices/review/",
        "type": "git"
      }
    ]
  },
  "scrum:3.3": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "3.3",
    "title": "Ôn tập Definition of Done trước Quiz Chương 3",
    "subtitle": "Hệ thống hóa chuẩn nghiệm thu Increment",
    "instructor": "Enosta Hub & Nguyễn Bá Hòa",
    "duration": "15:40",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "80PevHArDu8",
    "overview": "Chốt lại kiến thức Chương 3 trước khi bước sang Đo lường Burn-down & Retro.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Checklist DoD",
        "description": "Sẵn sàng sang Chương 4."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Definition of Done trước Quiz Chương 3",
        "url": "https://www.youtube.com/watch?v=80PevHArDu8",
        "type": "doc"
      },
      {
        "title": "Scrum Guide — Commitment: Definition of Done",
        "url": "https://scrumguides.org/scrum-guide.html#definition-of-done",
        "type": "doc"
      }
    ]
  },
  "scrum:4.1": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "4.1",
    "title": "Hướng dẫn Phân tích Biểu đồ Agile Burndown Chart Thực tế (CS401)",
    "subtitle": "Nhận diện Mini-Waterfall, Scope Creep & Dự báo Sprint Velocity chính xác",
    "instructor": "TuyenLe Coach & Nguyễn Bá Hòa",
    "duration": "16:40",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "-RIH4T_dLXE",
    "overview": "Video tiếng Việt hướng dẫn chi tiết cách đọc số liệu còn lại mỗi ngày trên Burn-down Chart để phát hiện sớm rủi ro trễ Sprint.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cách vẽ đường Lý tưởng & Đường Thực tế",
        "description": "Theo dõi Remaining Work hàng ngày."
      },
      {
        "timeSec": 360,
        "timestamp": "06:00",
        "title": "Bắt bệnh nhóm qua độ dốc Burn-down",
        "description": "Phát hiện Blocker, Scope Creep & Overcommit."
      }
    ],
    "defaultNotes": [
      {
        "id": "scr-41-n1",
        "timeSec": 360,
        "timestamp": "06:00",
        "content": "Đường Burn-down có thể đi xuống đều đặn chỉ khi User Story được chia nhỏ (<= 3 ngày) và Review/Test mỗi ngày.",
        "createdAt": "Scrum Bookmark"
      }
    ],
    "resources": [
      {
        "title": "TuyenLe Coach — Hướng dẫn lập & phân tích Biểu đồ Agile Burndown Chart",
        "url": "https://www.youtube.com/watch?v=-RIH4T_dLXE",
        "type": "doc"
      },
      {
        "title": "59 Seconds Agile — Sprint Burn Down Chart Explained",
        "url": "https://www.youtube.com/watch?v=NystinH-cNs",
        "type": "doc"
      }
    ]
  },
  "scrum:4.2": {
    "subjectId": "scrum",
    "subjectCode": "CS401",
    "lessonId": "4.2",
    "title": "Sprint Burndown, Sprint Planning & Retrospective Summary (CS401)",
    "subtitle": "Tổng kết trọn vẹn vòng đời Agile Scrum trước Quiz cuối môn",
    "instructor": "59 Seconds Agile & Nguyễn Bá Hòa",
    "duration": "14:20",
    "updatedAt": "CodeMind CS401 · 2026",
    "youtubeId": "NystinH-cNs",
    "overview": "Khép lại môn Quản trị Dự án Phần mềm & Agile Scrum (CS401).",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Liên kết Planning -> Burndown -> Retro",
        "description": "Vòng lặp cải tiến liên tục Kaizen."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Sprint Burndown, Sprint Planning & Retrospective Summary (CS401)",
        "url": "https://www.youtube.com/watch?v=NystinH-cNs",
        "type": "doc"
      },
      {
        "title": "FunRetrospectives — Activities for Teams",
        "url": "https://www.funretrospectives.com/",
        "type": "doc"
      }
    ]
  },
  "capstone:1.1": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "1.1",
    "title": "5 Bước Vàng Giải Mọi Bài System Design: Framework Đồ án Tốt nghiệp (CS499)",
    "subtitle": "Functional Requirements, QPS Estimation, API Contract, DB & Scaling Blueprint",
    "instructor": "TechCraft & Hội đồng Giảng viên CodeMind",
    "duration": "24:10",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "Bcu4yy-hYp8",
    "overview": "Hướng dẫn chi tiết khung 5 bước thiết kế kiến trúc hệ thống Enterprise Web App giúp đồ án tốt nghiệp thuyết phục tuyệt đối hội đồng doanh nghiệp.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Bước 1-2: Scope, SLO/SLA & Ước lượng Tải",
        "description": "Không thiết kế mò mẫm khi chưa định lượng quy mô."
      },
      {
        "timeSec": 540,
        "timestamp": "09:00",
        "title": "Bước 3-5: Data Model, High-Level Design & Bottlenecks",
        "description": "Xác định Cache, Index, Partition và Single Point of Failure."
      }
    ],
    "defaultNotes": [
      {
        "id": "cap-11-n1",
        "timeSec": 540,
        "timestamp": "09:00",
        "content": "Trong buổi bảo vệ đồ án, luôn chủ động phân tích Trade-off (được gì & mất gì) và Điểm nghẽn (Bottleneck) của kiến trúc bạn chọn.",
        "createdAt": "Capstone Bookmark"
      }
    ],
    "resources": [
      {
        "title": "TechCraft — System Design Framework 5 Bước Chuẩn Senior",
        "url": "https://www.youtube.com/watch?v=Bcu4yy-hYp8",
        "type": "doc"
      },
      {
        "title": "TechCraft — System Design là gì? P1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      }
    ]
  },
  "capstone:1.2": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "1.2",
    "title": "Kiến trúc API Production, JWT Authentication & Bảo mật Enterprise App (CS499)",
    "subtitle": "Liên thông Xác thực, Phân tầng Nghiệp vụ & Toàn vẹn Dữ liệu Fullstack",
    "instructor": "Code With Tuan & Ban Cố vấn Doanh nghiệp",
    "duration": "20:45",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "JuqHvghUBd4",
    "overview": "Hướng dẫn ghép nối lớp Auth JWT, Middleware bảo vệ route và tổ chức Backend Production sạch sẽ.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Thiết kế Middleware & Guard RBAC",
        "description": "Khóa chặt luồng dữ liệu toàn hệ thống."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Code With Tuan — Xác thực JWT & Phân tầng API Production",
        "url": "https://www.youtube.com/watch?v=JuqHvghUBd4",
        "type": "doc"
      }
    ]
  },
  "capstone:1.3": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "1.3",
    "title": "Ôn tập System Design & Architecture Blueprint trước Quiz Chương 1",
    "subtitle": "Củng cố bản thiết kế tổng thể cho Đồ án Kỹ sư CS499",
    "instructor": "TechCraft & Hội đồng Giảng viên",
    "duration": "21:30",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "ur6ZwbQ99os",
    "overview": "Rà soát lại tài liệu thiết kế kiến trúc trước khi bước sang kiểm thử & triển khai Production.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm tra lại điểm nghẽn kiến trúc",
        "description": "Sẵn sàng sang Chương 2."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập System Design & Architecture Blueprint trước Quiz Chương 1",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      },
      {
        "title": "Google SRE Book — Service Level Objectives",
        "url": "https://sre.google/sre-book/service-level-objectives/",
        "type": "doc"
      }
    ]
  },
  "capstone:2.1": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "2.1",
    "title": "Phân tích Thực chiến & Kiểm chứng Hệ thống Production (CS499)",
    "subtitle": "Bắt lỗi cạnh biên, kiểm thử tích hợp và nâng cấp độ tin cậy phần mềm",
    "instructor": "Ban Cố vấn Doanh nghiệp & Hội đồng CS499",
    "duration": "23:15",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "KIrbA-wEURg",
    "overview": "Hướng dẫn tư duy kiểm chứng kiến trúc, phát hiện lỗ hổng logic & xử lý tải cao trong dự án thực tế.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm chứng luồng dữ liệu & Lỗi cạnh biên",
        "description": "Đảm bảo hệ thống đứng vững trước mọi test case khó."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Phân tích Thực chiến & Kiểm chứng Hệ thống Production (CS499)",
        "url": "https://www.youtube.com/watch?v=KIrbA-wEURg",
        "type": "doc"
      },
      {
        "title": "Martin Fowler — The Practical Test Pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html",
        "type": "doc"
      }
    ]
  },
  "capstone:2.2": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "2.2",
    "title": "Deploy Enterprise Web App Production với Docker, HTTPS & CI/CD (CS499)",
    "subtitle": "Từ localhost lên Production Server có Tên miền, Chứng chỉ SSL và Giám sát",
    "instructor": "Hỏi Dân IT & Hội đồng Giảng viên",
    "duration": "24:50",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "Vo901K64pi4",
    "overview": "Minh họa toàn trình đóng gói dự án Docker + Reverse Proxy + CI/CD chạy mượt trên môi trường Production.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Chuẩn bị Production Environment",
        "description": "Biến môi trường, Docker & HTTPS Reverse Proxy."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Hỏi Dân IT — Triển khai Fullstack với Docker & VPS Domain HTTPS",
        "url": "https://www.youtube.com/watch?v=Vo901K64pi4",
        "type": "doc"
      }
    ]
  },
  "capstone:2.3": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "2.3",
    "title": "Ôn tập Kiểm thử & Tiêu chuẩn Production trước Quiz Chương 2",
    "subtitle": "Chuẩn bị bước vào Vòng Phản biện Đồ án Tốt nghiệp (Chương 3)",
    "instructor": "TechCraft & Hội đồng Giảng viên",
    "duration": "24:10",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "Bcu4yy-hYp8",
    "overview": "Tổng kết toàn bộ yêu cầu kiểm thử, bảo mật và vận hành trước khi bảo vệ đồ án.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Rà soát Tháp kiểm thử & Vận hành",
        "description": "Chuẩn bị cho Chương 3."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Ôn tập Kiểm thử & Tiêu chuẩn Production trước Quiz Chương 2",
        "url": "https://www.youtube.com/watch?v=Bcu4yy-hYp8",
        "type": "doc"
      },
      {
        "title": "Production Readiness Checklist",
        "url": "https://sre.google/sre-book/launch-coordination/",
        "type": "doc"
      }
    ]
  },
  "capstone:3.1": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "3.1",
    "title": "Rà soát Bảo mật & Clean Code Review Trước Bảo vệ Đồ án (CS499)",
    "subtitle": "Tự kiểm toán Auth Middleware, Concurrency & Transaction Integrity",
    "instructor": "Code With Tuan & Ban Cố vấn Doanh nghiệp",
    "duration": "20:45",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "JuqHvghUBd4",
    "overview": "Rà soát kỹ các điểm nóng hay bị Hội đồng chấm đồ án xoáy sâu về bảo mật, SQL Lock và clean architecture.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Kiểm toán Auth, Transaction & RBAC",
        "description": "Đảm bảo không lọt kẽ hở kỹ thuật."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Rà soát Bảo mật & Clean Code Review Trước Bảo vệ Đồ án (CS499)",
        "url": "https://www.youtube.com/watch?v=JuqHvghUBd4",
        "type": "doc"
      },
      {
        "title": "Refactoring Guru — Clean Code & Code Smells",
        "url": "https://refactoring.guru/refactoring/smells",
        "type": "doc"
      }
    ]
  },
  "capstone:3.2": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "3.2",
    "title": "Kỹ năng Thuyết trình Kiến trúc & Bảo vệ Đồ án Kỹ sư (CS499)",
    "subtitle": "Trả lời sắc bén các câu hỏi Trade-off, Bottleneck và Scale Hệ thống",
    "instructor": "Ban Cố vấn Doanh nghiệp & Hội đồng CS499",
    "duration": "23:15",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "KIrbA-wEURg",
    "overview": "Kinh nghiệm thực chiến đối đáp kỹ thuật trước Hội đồng Doanh nghiệp và chuẩn bị tâm thế kỹ sư phần mềm hoàn chỉnh.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Cách giải thích quyết định Kiến trúc thuyết phục",
        "description": "Tư duy kỹ sư trưởng thành."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Kỹ năng Thuyết trình Kiến trúc & Bảo vệ Đồ án Kỹ sư (CS499)",
        "url": "https://www.youtube.com/watch?v=KIrbA-wEURg",
        "type": "doc"
      },
      {
        "title": "System Design Primer (GitHub)",
        "url": "https://github.com/donnemartin/system-design-primer",
        "type": "git"
      }
    ]
  },
  "capstone:3.3": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "lessonId": "3.3",
    "title": "Tổng kết Lộ trình Kỹ sư Phần mềm & Đồ án Tốt nghiệp (CS499)",
    "subtitle": "Hoàn thiện chặng cuối sẵn sàng chinh phục Phản biện Doanh nghiệp",
    "instructor": "Hội đồng Giảng viên & Ban Cố vấn Doanh nghiệp",
    "duration": "21:30",
    "updatedAt": "CodeMind CS499 · 2026",
    "youtubeId": "ur6ZwbQ99os",
    "overview": "Khép lại chương trình 16 môn học với tư duy hệ thống toàn diện.",
    "chapters": [
      {
        "timeSec": 0,
        "timestamp": "00:00",
        "title": "Lời chúc mừng từ Hội đồng & Bắt đầu Bảo vệ",
        "description": "Hoàn tất Quiz cuối khóa CS499."
      }
    ],
    "defaultNotes": [],
    "resources": [
      {
        "title": "Xem gốc trên YouTube: Tổng kết Lộ trình Kỹ sư Phần mềm & Đồ án Tốt nghiệp (CS499)",
        "url": "https://www.youtube.com/watch?v=ur6ZwbQ99os",
        "type": "doc"
      },
      {
        "title": "CodeMind Engineering Roadmap",
        "url": "https://roadmap.sh/software-architect",
        "type": "doc"
      }
    ]
  }
};

export function getF8VideoLecture(
  subjectId: string,
  lessonId?: string,
  lessonTitle?: string
): VideoLectureInfo {
  const base = VIDEO_LECTURES_BY_SUBJECT[subjectId] || VIDEO_LECTURES_BY_SUBJECT.oop;
  if (!lessonId) {
    return base;
  }

  const exact = LESSON_VIDEO_OVERRIDES[`${subjectId}:${lessonId}`];
  if (exact) {
    return {
      ...base,
      ...exact,
      chapters: exact.chapters && exact.chapters.length > 0 ? exact.chapters : base.chapters,
      defaultNotes: exact.defaultNotes ?? base.defaultNotes,
      resources: exact.resources && exact.resources.length > 0 ? exact.resources : base.resources,
      lessonId,
    };
  }

  // Fallback thông minh cho bài học bổ sung do Giảng viên tạo mới (e.g. "1.5" -> dùng video của chương tương ứng)
  const chapterNum = lessonId.split(".")[0] || "1";
  const chapterFallback = LESSON_VIDEO_OVERRIDES[`${subjectId}:${chapterNum}.1`];
  const target = chapterFallback ? { ...base, ...chapterFallback } : base;

  return {
    ...target,
    lessonId,
    subtitle: lessonTitle
      ? `Bài giảng chuyên đề (${lessonId}): ${lessonTitle}`
      : target.subtitle,
  };
}

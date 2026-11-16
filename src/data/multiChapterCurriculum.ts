// Dữ liệu Chương Trình Học Đa Chương (Multi-Chapter Curriculum) Chuẩn F8 & Đại học
// Hỗ trợ cấu trúc nhiều Chương (Accordion) cho từng Môn Học CNTT

export type SubjectId =
  | "oop"
  | "dsa"
  | "network"
  | "frontend"
  | "realtime"
  | "mobile"
  | "web"
  | "system-design"
  | "distributed"
  | "security"
  | "ai-ml"
  | "ai-agent"
  | "devops"
  | "cloud"
  | "scrum"
  | "capstone";

export interface LessonItem {
  id: string; // e.g. "1.1", "1.2"
  title: string;
  type: "video" | "lecture" | "quiz";
  duration: string; // e.g. "12 phút"
  status: "done" | "active" | "locked";
  xp: number;
  objective: string;
  lead: string;
  codeSnippet?: {
    lang: string;
    code: string;
    caption: string;
  };
  keyTakeaways: string[];
}

export interface ChapterItem {
  id: string; // e.g. "c1", "c2"
  number: number;
  title: string;
  description: string;
  duration: string;
  progressPct: number;
  lessons: LessonItem[];
}

export interface SubjectModuleData {
  id: SubjectId;
  code: string;
  name: string;
  semester: string;
  category: string;
  instructor: string;
  instructorRole: string;
  instructorAvatar: string;
  bannerGradient: string;
  badgeBg: string;
  badgeText: string;
  totalChapters: number;
  totalLessons: number;
  totalDuration: string;
  overallProgress: number;
  totalXp: number;
  description: string;
  chapters: ChapterItem[];
  quizQuestions: {
    q: string;
    options: { id: string; text: string }[];
    correct: string;
    explanation: string;
  }[];
}

export const MULTI_CHAPTER_SUBJECTS: SubjectModuleData[] = [
  // ─── 1. CS201: OOP & CẤU TRÚC DỮ LIỆU ────────────────────────────────────
  {
    id: "oop",
    code: "CS201",
    name: "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
    semester: "Học kỳ 3",
    category: "Lập trình & Thuật toán",
    instructor: "Thầy Nguyễn Phước",
    instructorRole: "Trưởng Bộ môn Kỹ thuật Phần mềm",
    instructorAvatar: "",
    bannerGradient: "from-blue-600 via-indigo-600 to-sky-700",
    badgeBg: "bg-blue-100 dark:bg-blue-900/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    totalChapters: 4,
    totalLessons: 12,
    totalDuration: "4 giờ 30 phút",
    overallProgress: 46,
    totalXp: 480,
    description:
      "Nắm vững các nguyên lý OOP cốt lõi (Đóng gói, Kế thừa, Đa hình, Trừu tượng), cấu trúc bảng con trỏ ảo vtable và hiện thực hóa các cấu trúc dữ liệu kinh điển.",
    chapters: [
      {
        id: "oop-c1",
        number: 1,
        title: "Kế thừa và Đa hình Động",
        description: "Bản chất quan hệ is-a, từ khóa extends/super và cơ chế Dynamic Dispatch trong máy ảo JVM/C++.",
        duration: "1 giờ 15 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "Khái niệm Kế thừa (Inheritance)",
            type: "video",
            duration: "14 phút",
            status: "done",
            xp: 80,
            objective: "Hiểu bản chất tái sử dụng mã nguồn và quan hệ is-a giữa lớp cha và lớp con.",
            lead: "Kế thừa cho phép lớp con kế thừa thuộc tính và hành vi của lớp cha, thúc đẩy nguyên lý DRY.",
            codeSnippet: {
              lang: "java",
              code: `public abstract class Animal {
    protected String name;
    public Animal(String name) { this.name = name; }
    public abstract void speak();
}`,
              caption: "Lớp trừu tượng cha làm khuôn mẫu chung",
            },
            keyTakeaways: [
              "Chỉ thiết lập quan hệ kế thừa khi thực sự có quan hệ 'is-a'.",
              "Nếu chỉ là quan hệ chứa đựng 'has-a', bắt buộc dùng Composition.",
            ],
          },
          {
            id: "1.2",
            title: "Từ khóa extends và super()",
            type: "lecture",
            duration: "18 phút",
            status: "done",
            xp: 90,
            objective: "Nắm vững thứ tự gọi constructor và cách truy xuất phương thức lớp cha.",
            lead: "super() phải luôn đặt ở dòng đầu tiên trong constructor của lớp con để đảm bảo lớp cha được cấp phát bộ nhớ trước.",
            codeSnippet: {
              lang: "java",
              code: `public class Dog extends Animal {
    public Dog(String name) {
        super(name); // Gọi constructor cha
    }
}`,
              caption: "Khởi tạo lớp con với super()",
            },
            keyTakeaways: [
              "super() gọi constructor cơ sở trước khi lớp con khởi tạo thuộc tính riêng.",
              "Nếu không ghi rõ, trình biên dịch tự động chèn super() không đối số.",
            ],
          },
          {
            id: "1.3",
            title: "Đa hình & Bảng ảo vtable",
            type: "video",
            duration: "20 phút",
            status: "done",
            xp: 120,
            objective: "Giải mã cơ chế tra cứu phương thức tại Runtime qua con trỏ ảo vtable.",
            lead: "Đa hình cho phép biến tham chiếu kiểu cha trỏ đến đối tượng con và gọi đúng phương thức tương ứng.",
            codeSnippet: {
              lang: "java",
              code: `Animal pet = new Dog("Milo");
pet.speak(); // JVM dispatch tới Dog.speak() tại Runtime`,
              caption: "Dynamic Method Dispatch",
            },
            keyTakeaways: [
              "vtable giúp tra cứu phương thức override với độ phức tạp O(1).",
              "Loại bỏ hoàn toàn các chuỗi câu lệnh if-else kiểm tra instanceof cồng kềnh.",
            ],
          },
          {
            id: "1.4",
            title: "Checkpoint Quiz Chương 1",
            type: "quiz",
            duration: "10 phút",
            status: "done",
            xp: 50,
            objective: "Kiểm tra tình huống kế thừa, constructor super và đa hình.",
            lead: "Vượt qua 3/3 câu hỏi tình huống thực tế để nhận chứng nhận hoàn thành Chương 1.",
            keyTakeaways: ["Thẩm định hiểu biết về Dynamic Dispatch và @Override annotation."],
          },
        ],
      },
      {
        id: "oop-c2",
        number: 2,
        title: "Trừu tượng hóa & Hợp đồng Interface",
        description: "Thiết kế hệ thống Loose Coupling với Interface và tuân thủ nguyên lý Dependency Inversion.",
        duration: "1 giờ",
        progressPct: 60,
        lessons: [
          {
            id: "2.1",
            title: "Lớp thuần ảo Abstract Class",
            type: "lecture",
            duration: "16 phút",
            status: "done",
            xp: 80,
            objective: "Phân biệt lớp trừu tượng có phương thức trừu tượng và phương thức thông thường.",
            lead: "Lớp trừu tượng không thể khởi tạo đối tượng trực tiếp bằng toán tử new.",
            keyTakeaways: ["Dùng làm lớp cơ sở định hình khung kiến trúc."],
          },
          {
            id: "2.2",
            title: "Interface & Đa kế thừa hành vi",
            type: "video",
            duration: "22 phút",
            status: "active",
            xp: 100,
            objective: "Hiểu tại sao Java không hỗ trợ đa kế thừa lớp nhưng cho phép hiện thực nhiều Interface.",
            lead: "Interface là hợp đồng hành vi thuần túy, loại bỏ hoàn toàn vấn đề Diamond Problem.",
            keyTakeaways: ["Lập trình hướng giao diện (Program to an Interface, not an Implementation)."],
          },
          {
            id: "2.3",
            title: "Checkpoint Quiz Chương 2",
            type: "quiz",
            duration: "10 phút",
            status: "locked",
            xp: 50,
            objective: "Đánh giá khả năng phân biệt Abstract Class vs Interface trong dự án thực tế.",
            lead: "Thẩm định thiết kế kiến trúc Loose Coupling.",
            keyTakeaways: ["Áp dụng nguyên lý Single Responsibility và Dependency Inversion."],
          },
        ],
      },
      {
        id: "oop-c3",
        number: 3,
        title: "Cấu trúc Bounded Queue & Guard Clauses",
        description: "Hiện thực cấu trúc hàng đợi giới hạn bộ nhớ FIFO O(1) và kỹ thuật phòng thủ kiểm thử biên.",
        duration: "1 giờ 15 phút",
        progressPct: 0,
        lessons: [
          {
            id: "3.1",
            title: "Thiết kế PageTracker Bounded Buffer",
            type: "video",
            duration: "25 phút",
            status: "locked",
            xp: 100,
            objective: "Hiện thực hàng đợi giới hạn maxlen=3 với cơ chế tự động evict phần tử cũ nhất.",
            lead: "Sử dụng Deque hoặc ArrayDeque để đảm bảo thao tác visit và getRecent đều đạt O(1).",
            keyTakeaways: ["Tránh rò rỉ bộ nhớ khi lưu trữ lịch sử duyệt trang."],
          },
          {
            id: "3.2",
            title: "Kỹ thuật Guard Clauses xử lý ca biên",
            type: "lecture",
            duration: "20 phút",
            status: "locked",
            xp: 90,
            objective: "Phòng thủ trước chuỗi rỗng, khoảng trắng và tham chiếu null.",
            lead: "Bổ sung Guard Clause ở đầu hàm để thoát sớm, giữ code phẳng và trong sáng.",
            keyTakeaways: ["Xử lý 5/5 ca kiểm thử biên (Edge Cases)."],
          },
          {
            id: "3.3",
            title: "Checkpoint Quiz Chương 3",
            type: "quiz",
            duration: "10 phút",
            status: "locked",
            xp: 50,
            objective: "Kiểm tra cấu trúc dữ liệu Deque và độ phức tạp tính toán O(1).",
            lead: "Đánh giá kỹ năng tối ưu giải thuật.",
            keyTakeaways: ["FIFO eviction và độ phức tạp không gian."],
          },
        ],
      },
      {
        id: "oop-c4",
        number: 4,
        title: "Kiểm toán Liêm chính & Nghiệm thu Đồ án",
        description: "Xác thực nguyên bản mã nguồn, đo lường nhịp độ phát triển tự nhiên (Cadence) và cấp chứng chỉ SHA-256.",
        duration: "40 phút",
        progressPct: 0,
        lessons: [
          {
            id: "4.1",
            title: "Đo lường Cadence Variance & Anti-Cheat",
            type: "video",
            duration: "15 phút",
            status: "locked",
            xp: 70,
            objective: "Hiểu thuật toán phân tích nhịp commit tự nhiên nhằm phát hiện sao chép AI hàng loạt.",
            lead: "CodeMind Campus chứng thực sự kiên trì và liêm chính học thuật của học viên.",
            keyTakeaways: ["Cadence Variance 4.8h chuẩn tự nhiên."],
          },
          {
            id: "4.2",
            title: "Bài tập lớn Tổng hợp & SHA-256 Hash",
            type: "quiz",
            duration: "25 phút",
            status: "locked",
            xp: 120,
            objective: "Nghiệm thu toàn bộ kiến thức OOP môn CS201 và nhận chứng nhận số hóa.",
            lead: "Hệ thống cấp chữ ký số mật mã xác nhận đồ án đạt chuẩn Thầy Nguyễn Phước.",
            keyTakeaways: ["Chứng nhận học thuật liêm chính."],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Kế thừa trong OOP nhằm mục đích cốt lõi gì?",
        options: [
          { id: "a", text: "Lớp con tái sử dụng và chuyên biệt hóa hành vi từ lớp cha" },
          { id: "b", text: "Lớp cha tự động copy toàn bộ dữ liệu từ lớp con" },
          { id: "c", text: "Chia sẻ biến toàn cục giữa các lớp độc lập" },
          { id: "d", text: "Tạo các phương thức static không cần khởi tạo" },
        ],
        correct: "a",
        explanation: "Kế thừa cho phép lớp con kế thừa thuộc tính/phương thức từ lớp cha, tuân thủ nguyên tắc DRY trong thiết kế phần mềm.",
      },
      {
        q: "Từ khóa super() trong constructor lớp con Java có quy tắc bắt buộc nào?",
        options: [
          { id: "a", text: "Phải đặt ở dòng đầu tiên của constructor lớp con" },
          { id: "b", text: "Có thể đặt ở bất kỳ dòng nào trước lệnh return" },
          { id: "c", text: "Chỉ được gọi trong phương thức static" },
          { id: "d", text: "Bắt buộc phải truyền ít nhất 2 tham số" },
        ],
        correct: "a",
        explanation: "super() bắt buộc phải ở dòng đầu tiên để đảm bảo trạng thái của lớp cha được cấp phát và khởi tạo hoàn chỉnh trước khi lớp con thực thi.",
      },
      {
        q: "Cơ chế Dynamic Method Dispatch được thực hiện tại thời điểm nào?",
        options: [
          { id: "a", text: "Compile-time (Lúc biên dịch mã nguồn)" },
          { id: "b", text: "Runtime (Lúc chương trình đang chạy thực tế)" },
          { id: "c", text: "Link-time (Lúc liên kết thư viện tĩnh)" },
          { id: "d", text: "Preprocessing-time (Lúc tiền xử lý macro)" },
        ],
        correct: "b",
        explanation: "Dynamic Dispatch diễn ra tại Runtime, JVM tra cứu bảng vtable của đối tượng thực trên Heap để gọi đúng hàm override.",
      },
    ],
  },

  // ─── 2. CS304: PHÁT TRIỂN WEB & REST API ─────────────────────────────────
  {
    id: "web",
    code: "CS304",
    name: "Phát triển Web Hiện đại & REST API",
    semester: "Học kỳ 4",
    category: "Fullstack Web & API",
    instructor: "Võ Nhật Huy & Phan Đình Nghị",
    instructorRole: "Ban Cố vấn Kỹ thuật Web",
    instructorAvatar: "",
    bannerGradient: "from-purple-600 via-indigo-600 to-violet-800",
    badgeBg: "bg-purple-100 dark:bg-purple-900/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    totalChapters: 4,
    totalLessons: 10,
    totalDuration: "5 giờ",
    overallProgress: 60,
    totalXp: 520,
    description:
      "Thiết kế hệ thống RESTful API chuẩn Stateless, quản lý xác thực phân quyền JWT Bearer Token, kiểm soát CORS và xây dựng giao diện tương tác thời gian thực.",
    chapters: [
      {
        id: "web-c1",
        number: 1,
        title: "Kiến trúc REST & Chuẩn HTTP",
        description: "Mô hình Client-Server, tính phi trạng thái (Stateless), quy chuẩn đặt tên danh từ số nhiều và phân loại HTTP status codes.",
        duration: "1 giờ 10 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "Stateless REST & HTTP Methods",
            type: "video",
            duration: "18 phút",
            status: "done",
            xp: 80,
            objective: "Hiểu tại sao REST API không lưu trạng thái phiên trên server.",
            lead: "Statelessness giúp hệ thống mở rộng theo chiều ngang (horizontal scaling) dễ dàng qua Load Balancer.",
            keyTakeaways: ["Phân biệt POST (tạo mới) vs PUT/PATCH (cập nhật)."],
          },
          {
            id: "1.2",
            title: "Quy ước đặt tên URI Chuẩn Doanh nghiệp",
            type: "lecture",
            duration: "15 phút",
            status: "done",
            xp: 70,
            objective: "Nắm vững nguyên tắc dùng danh từ số nhiều (/api/v1/tasks) thay vì động từ.",
            lead: "URI thể hiện tài nguyên (Resource), hành động được quy định bởi phương thức HTTP.",
            keyTakeaways: ["Dùng /api/tasks, không dùng /api/getTasks."],
          },
          {
            id: "1.3",
            title: "Checkpoint Quiz Chương 1",
            type: "quiz",
            duration: "10 phút",
            status: "done",
            xp: 50,
            objective: "Kiểm tra mã trạng thái 200, 201, 400, 404, 500.",
            lead: "Thẩm định kiến thức giao thức HTTP.",
            keyTakeaways: ["Quy ước trả về mã lỗi chuẩn REST."],
          },
        ],
      },
      {
        id: "web-c2",
        number: 2,
        title: "Xác thực JWT & Phân quyền RBAC",
        description: "Cấu trúc 3 phần Header.Payload.Signature của JWT, truyền Bearer Token qua Header và bảo vệ Endpoint.",
        duration: "1 giờ 20 phút",
        progressPct: 75,
        lessons: [
          {
            id: "2.1",
            title: "Cấu trúc 3 thành phần của JSON Web Token",
            type: "video",
            duration: "22 phút",
            status: "done",
            xp: 100,
            objective: "Hiểu cơ chế ký số HMAC-SHA256 ngăn ngừa chỉnh sửa dữ liệu trái phép.",
            lead: "Payload chứa thông tin công khai (sub, role, exp), tuyệt đối không lưu mật khẩu.",
            keyTakeaways: ["Token tự xác thực (Self-contained) không cần truy vấn DB."],
          },
          {
            id: "2.2",
            title: "Authorization Header & Bearer Token",
            type: "lecture",
            duration: "20 phút",
            status: "done",
            xp: 90,
            objective: "Cấu hình gửi Bearer Token trong Header HTTP và xử lý lỗi 401 vs 403.",
            lead: "401 là Unauthorized (chưa xác thực); 403 là Forbidden (không đủ quyền hạn).",
            keyTakeaways: ["Bearer token cách nhau bởi 1 dấu khoảng trắng."],
          },
          {
            id: "2.3",
            title: "Checkpoint Quiz Chương 2",
            type: "quiz",
            duration: "10 phút",
            status: "active",
            xp: 50,
            objective: "Kiểm tra kiến thức bảo mật token và phân quyền RBAC.",
            lead: "Thẩm định kỹ năng bảo mật ứng dụng web.",
            keyTakeaways: ["Phân quyền sinh viên, giảng viên và admin."],
          },
        ],
      },
      {
        id: "web-c3",
        number: 3,
        title: "Kiểm soát CORS & Bảo vệ XSS/CSRF",
        description: "Cơ chế Preflight request OPTIONS, cấu hình Access-Control-Allow-Origin và vệ sinh dữ liệu đầu vào.",
        duration: "1 giờ 10 phút",
        progressPct: 0,
        lessons: [
          {
            id: "3.1",
            title: "Cơ chế Preflight Request OPTIONS",
            type: "video",
            duration: "20 phút",
            status: "locked",
            xp: 90,
            objective: "Giải mã nguyên nhân trình duyệt chặn kết nối API do lỗi CORS.",
            lead: "Trình duyệt gửi request OPTIONS thăm dò trước khi gửi request thực tế.",
            keyTakeaways: ["Cấu hình Middleware CORS trên FastAPI/Express."],
          },
          {
            id: "3.2",
            title: "Phòng thủ tấn công XSS & CSRF",
            type: "lecture",
            duration: "20 phút",
            status: "locked",
            xp: 80,
            objective: "Sử dụng HttpOnly Cookies và Sanitize Input phòng vệ lỗ hổng bảo mật.",
            lead: "Bảo vệ thông tin người dùng an toàn trên môi trường Production.",
            keyTakeaways: ["Phòng ngừa mã độc JavaScript tiêm vào trang web."],
          },
        ],
      },
      {
        id: "web-c4",
        number: 4,
        title: "Nghiệm thu Web API & WebSocket Realtime",
        description: "Kết nối WebSocket đồng bộ dữ liệu Kanban hai chiều và nghiệm thu bảo mật hệ thống web.",
        duration: "45 phút",
        progressPct: 0,
        lessons: [
          {
            id: "4.1",
            title: "WebSocket Đồng bộ Task Thời gian thực",
            type: "video",
            duration: "25 phút",
            status: "locked",
            xp: 110,
            objective: "Duy trì kết nối song công (Full-duplex) giữa React client và backend server.",
            lead: "Cập nhật kéo thả Kanban Board tức thì cho toàn bộ các thành viên nhóm.",
            keyTakeaways: ["Truyền nhận sự kiện qua kênh WebSocket."],
          },
          {
            id: "4.2",
            title: "Đánh giá Nghiệm thu API Chuẩn Doanh nghiệp",
            type: "quiz",
            duration: "20 phút",
            status: "locked",
            xp: 100,
            objective: "Tổng kết toàn bộ kiến thức Web Fullstack môn CS304.",
            lead: "Hoàn tất đồ án xây dựng hệ sinh thái API CodeMind Campus.",
            keyTakeaways: ["Chứng nhận kỹ năng Web Fullstack."],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Trong kiến trúc REST, mã HTTP Status Code nào biểu thị tạo tài nguyên mới thành công?",
        options: [
          { id: "a", text: "200 OK" },
          { id: "b", text: "201 Created" },
          { id: "c", text: "204 No Content" },
          { id: "d", text: "202 Accepted" },
        ],
        correct: "b",
        explanation: "Mã 201 Created là mã chuẩn REST biểu thị một tài nguyên mới vừa được khởi tạo thành công trên máy chủ (thường đi kèm với phương thức POST).",
      },
      {
        q: "Sự khác biệt cốt lõi giữa mã lỗi HTTP 401 và 403 là gì?",
        options: [
          { id: "a", text: "401 là server sập, 403 là database timeout" },
          { id: "b", text: "401 là chưa đăng nhập (Unauthenticated), 403 là không đủ quyền hạn (Forbidden)" },
          { id: "c", text: "401 là đường dẫn sai, 403 là tham số rỗng" },
          { id: "d", text: "Hai mã này hoàn toàn tương đương nhau" },
        ],
        correct: "b",
        explanation: "401 Unauthorized yêu cầu người dùng phải xác thực danh tính. 403 Forbidden nghĩa là server đã biết bạn là ai nhưng bạn không có quyền truy cập tài nguyên này.",
      },
    ],
  },

  // ─── 3. CS308: HỆ THỐNG & CSDL (3NF) ────────────────────────────────────
  {
    id: "system-design",
    code: "CS308",
    name: "Phân tích Thiết kế Hệ thống & CSDL (3NF)",
    semester: "Học kỳ 5",
    category: "Kiến trúc Hệ thống & DB",
    instructor: "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    instructorRole: "Hội đồng Chấm Đồ án Tốt nghiệp",
    instructorAvatar: "",
    bannerGradient: "from-emerald-600 via-teal-600 to-cyan-700",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ",
    overallProgress: 25,
    totalXp: 450,
    description:
      "Thiết kế mô hình Thực thể Quan hệ (ERD), loại bỏ dư thừa dữ liệu qua quá trình chuẩn hóa 1NF -> 2NF -> 3NF, thiết lập ràng buộc toàn vẹn và tối ưu hóa truy vấn Index.",
    chapters: [
      {
        id: "sys-c1",
        number: 1,
        title: "Mô hình Thực thể Quan hệ (ERD)",
        description: "Xác định thực thể, thuộc tính khóa chính, quan hệ 1-1, 1-N, N-N và thiết kế bảng trung gian Junction Table.",
        duration: "1 giờ 15 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "Thực thể & Thuộc tính Khóa chính",
            type: "video",
            duration: "20 phút",
            status: "done",
            xp: 80,
            objective: "Xác định các thực thể nòng cốt của đồ án quản lý học tập và dự án.",
            lead: "Khóa chính (Primary Key) định danh duy nhất mỗi bản ghi trong một bảng cơ sở dữ liệu.",
            keyTakeaways: ["Ưu tiên sử dụng UUID hoặc Auto-increment ID."],
          },
          {
            id: "1.2",
            title: "Quan hệ N-N & Bảng trung gian",
            type: "lecture",
            duration: "18 phút",
            status: "done",
            xp: 90,
            objective: "Tách quan hệ Nhiều - Nhiều thành hai quan hệ 1-N qua bảng trung gian.",
            lead: "Quan hệ Sinh viên và Đề tài nghiên cứu bắt buộc phải có bảng đăng ký trung gian.",
            keyTakeaways: ["Khóa chính phức hợp (Composite PK) trên bảng trung gian."],
          },
          {
            id: "1.3",
            title: "Checkpoint Quiz Chương 1",
            type: "quiz",
            duration: "10 phút",
            status: "done",
            xp: 50,
            objective: "Kiểm tra kỹ năng đọc và mô hình hóa sơ đồ ERD.",
            lead: "Thẩm định kiến thức phân tích quan hệ thực thể.",
            keyTakeaways: ["Phát hiện sai sót trong liên kết quan hệ."],
          },
        ],
      },
      {
        id: "sys-c2",
        number: 2,
        title: "Chuẩn hóa Dữ liệu (1NF -> 3NF)",
        description: "Các bước chuẩn hóa dữ liệu, loại bỏ phụ thuộc một phần và phụ thuộc bắc cầu để triệt tiêu bất thường cập nhật.",
        duration: "1 giờ 30 phút",
        progressPct: 40,
        lessons: [
          {
            id: "2.1",
            title: "Chuẩn 1NF: Tính nguyên tố của dữ liệu",
            type: "video",
            duration: "22 phút",
            status: "done",
            xp: 90,
            objective: "Loại bỏ hoàn toàn các cột lưu trữ mảng hoặc danh sách chuỗi phân tách bởi dấu phẩy.",
            lead: "Mỗi thuộc tính chỉ được chứa một giá trị đơn nguyên tố duy nhất.",
            keyTakeaways: ["Không lưu danh sách ID trong một cột varchar."],
          },
          {
            id: "2.2",
            title: "Chuẩn 2NF & 3NF: Loại bỏ phụ thuộc bắc cầu",
            type: "lecture",
            duration: "25 phút",
            status: "active",
            xp: 100,
            objective: "Tách bảng con khi một thuộc tính không khóa phụ thuộc vào một thuộc tính không khóa khác.",
            lead: "Nếu Sinh viên -> Khoa và Khoa -> Trưởng khoa thì Trưởng khoa phải chuyển sang bảng Khoa.",
            keyTakeaways: ["Đạt chuẩn 3NF triệt tiêu hoàn toàn bất thường Update/Delete."],
          },
          {
            id: "2.3",
            title: "Checkpoint Quiz Chương 2",
            type: "quiz",
            duration: "10 phút",
            status: "locked",
            xp: 50,
            objective: "Bài tập nhận diện vi phạm chuẩn 3NF trong bảng điểm danh.",
            lead: "Kiểm tra lý thuyết phụ thuộc hàm.",
            keyTakeaways: ["Thuật toán tách bảng bảo toàn thông tin."],
          },
        ],
      },
      {
        id: "sys-c3",
        number: 3,
        title: "Toàn vẹn Dữ liệu & Đánh chỉ mục Index",
        description: "Ràng buộc tham chiếu ON DELETE CASCADE, CHECK constraint và đánh chỉ mục B-Tree trên khóa ngoại.",
        duration: "1 giờ 15 phút",
        progressPct: 0,
        lessons: [
          {
            id: "3.1",
            title: "Ràng buộc Toàn vẹn Tham chiếu",
            type: "video",
            duration: "20 phút",
            status: "locked",
            xp: 80,
            objective: "Cấu hình quy tắc xóa và cập nhật dữ liệu tự động giữa các bảng cha con.",
            lead: "ON DELETE CASCADE và ON DELETE RESTRICT bảo vệ tính toàn vẹn của cơ sở dữ liệu.",
            keyTakeaways: ["Tránh tạo ra các bản ghi mồ côi (Orphan Records)."],
          },
          {
            id: "3.2",
            title: "Đánh chỉ mục B-Tree Index trên Khóa ngoại",
            type: "lecture",
            duration: "20 phút",
            status: "locked",
            xp: 90,
            objective: "Tối ưu hóa tốc độ câu lệnh SQL JOIN từ O(N) về O(log N).",
            lead: "Khóa ngoại bắt buộc phải có Index để tránh Full Table Scan khi thực thi truy vấn lớn.",
            keyTakeaways: ["Đánh giá hiệu năng truy vấn với EXPLAIN ANALYZE."],
          },
          {
            id: "3.3",
            title: "Kiểm toán Schema Studio 8 Bảng",
            type: "quiz",
            duration: "20 phút",
            status: "locked",
            xp: 100,
            objective: "Thẩm định toàn diện 8 bảng CSDL đồ án trước hội đồng Thầy Nguyễn Phước.",
            lead: "Nhận báo cáo kiểm định 3NF chính thức.",
            keyTakeaways: ["Bảo vệ đồ án kiến trúc cơ sở dữ liệu."],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Điều kiện tiên quyết để một bảng đạt dạng chuẩn 3NF (Third Normal Form) là gì?",
        options: [
          { id: "a", text: "Phải đạt chuẩn 2NF và không chứa bất kỳ phụ thuộc bắc cầu nào" },
          { id: "b", text: "Chỉ cần mọi cột đều là số nguyên" },
          { id: "c", text: "Bắt buộc có ít nhất 5 khóa ngoại" },
          { id: "d", text: "Không được sử dụng câu lệnh JOIN" },
        ],
        correct: "a",
        explanation: "Chuẩn 3NF yêu cầu bảng đã đạt 2NF và mọi thuộc tính không khóa phải phụ thuộc trực tiếp vào khóa chính, không được phụ thuộc bắc cầu thông qua một thuộc tính không khóa khác.",
      },
    ],
  },

  // ─── 4. CS401: QUẢN LÝ DỰ ÁN & AGILE SCRUM ──────────────────────────────
  {
    id: "scrum",
    code: "CS401",
    name: "Quản lý Dự án Phần mềm & Agile Scrum",
    semester: "Học kỳ 6",
    category: "Quy trình & Quản lý Dự án",
    instructor: "Nguyễn Bá Hòa (Scrum Master)",
    instructorRole: "Team Leader / Kiến trúc sư Đồ án",
    instructorAvatar: "",
    bannerGradient: "from-amber-500 via-orange-600 to-rose-600",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    totalChapters: 4,
    totalLessons: 11,
    totalDuration: "3 giờ 45 phút",
    overallProgress: 35,
    totalXp: 460,
    description:
      "Vận hành quy trình phát triển phần mềm linh hoạt (Agile Scrum), chuẩn hóa User Story theo 6 tiêu chí INVEST, thiết lập Definition of Done (DoD) và quản trị tiến độ qua Burn-down chart.",
    chapters: [
      {
        id: "scrum-c1",
        number: 1,
        title: "3 Trụ cột Scrum & 5 Sự kiện Sprint",
        description: "Triết lý Agile, 3 trụ cột (Minh bạch, Thanh tra, Thích nghi) và 5 cuộc họp bắt buộc trong một Sprint chuẩn.",
        duration: "55 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "3 Trụ cột cốt lõi của Scrum",
            type: "video",
            duration: "18 phút",
            status: "done",
            xp: 80,
            objective: "Hiểu bản chất của Tính Minh bạch, Khả năng Thanh tra và Sự Thích nghi trong Scrum.",
            lead: "Scrum dựa trên thuyết kiểm soát thực nghiệm (Empirical Process Control).",
            keyTakeaways: ["Minh bạch qua bảng Kanban; Thích nghi với phản hồi thực tế."],
          },
          {
            id: "1.2",
            title: "5 Sự kiện bắt buộc trong chu kỳ Sprint",
            type: "lecture",
            duration: "20 phút",
            status: "done",
            xp: 90,
            objective: "Nắm vững thời lượng và mục tiêu của Sprint Planning, Daily Scrum (15p), Review, Retro và Refinement.",
            lead: "Daily Scrum là cuộc họp đồng bộ 15 phút, không phải buổi báo cáo thành tích cho sếp.",
            keyTakeaways: ["Cam kết mục tiêu Sprint Goal chung của toàn nhóm."],
          },
          {
            id: "1.3",
            title: "Checkpoint Quiz Chương 1",
            type: "quiz",
            duration: "10 phút",
            status: "done",
            xp: 50,
            objective: "Kiểm tra tình huống xử lý rủi ro trong cuộc họp Daily Standup.",
            lead: "Thẩm định kiến thức vận hành quy trình Scrum.",
            keyTakeaways: ["Phát hiện các trở ngại kỹ thuật (Impediments)."],
          },
        ],
      },
      {
        id: "scrum-c2",
        number: 2,
        title: "User Story & Tiêu chuẩn INVEST",
        description: "Kỹ thuật viết User Story chuyên nghiệp và thẩm định 6 tiêu chuẩn: Independent, Negotiable, Valuable, Estimable, Small, Testable.",
        duration: "1 giờ 10 phút",
        progressPct: 60,
        lessons: [
          {
            id: "2.1",
            title: "Cấu trúc User Story: As a / I want / So that",
            type: "video",
            duration: "22 phút",
            status: "done",
            xp: 90,
            objective: "Chuyển hóa yêu cầu kinh doanh thành câu chuyện người dùng rõ ràng kèm Acceptance Criteria.",
            lead: "User Story là lời mời trò chuyện, tập trung vào giá trị mang lại cho người dùng cuối.",
            keyTakeaways: ["Viết tiêu chí nghiệm thu theo cú pháp Given-When-Then."],
          },
          {
            id: "2.2",
            title: "Thẩm định 6 tiêu chí vàng INVEST",
            type: "lecture",
            duration: "20 phút",
            status: "active",
            xp: 100,
            objective: "Phát hiện User Story quá lớn (Epic) để phân rã thành các Story nhỏ dễ ước lượng.",
            lead: "Tiêu chí Small đảm bảo Story có thể hoàn thành trong 1/3 chu kỳ một Sprint.",
            keyTakeaways: ["Independent giúp các lập trình viên không bị phụ thuộc chéo."],
          },
          {
            id: "2.3",
            title: "Checkpoint Quiz Chương 2",
            type: "quiz",
            duration: "10 phút",
            status: "locked",
            xp: 50,
            objective: "Kiểm tra kỹ năng thẩm định User Story đạt chuẩn INVEST.",
            lead: "Thực hành phát hiện lỗi sai trong Backlog.",
            keyTakeaways: ["Loại bỏ các yêu cầu mơ hồ hoặc không kiểm thử được."],
          },
        ],
      },
      {
        id: "scrum-c3",
        number: 3,
        title: "Định nghĩa Hoàn thành (Definition of Done)",
        description: "Xây dựng ma trận DoD 4 cấp độ kiểm soát chất lượng phần mềm trước khi merge mã nguồn vào nhánh main.",
        duration: "55 phút",
        progressPct: 0,
        lessons: [
          {
            id: "3.1",
            title: "Ma trận DoD 4 Cấp độ Chất lượng",
            type: "video",
            duration: "20 phút",
            status: "locked",
            xp: 80,
            objective: "Thiết lập chuẩn mực: Code Review, Unit Test >= 80%, CI Build Success và No Conflict.",
            lead: "DoD là lời cam kết chất lượng không khoan nhượng của cả đội ngũ phát triển.",
            keyTakeaways: ["Không dời nợ kỹ thuật (Technical Debt) sang các Sprint sau."],
          },
          {
            id: "3.2",
            title: "Cổng kiểm soát CI/CD & Unit Test Coverage",
            type: "lecture",
            duration: "20 phút",
            status: "locked",
            xp: 90,
            objective: "Tích hợp GitHub Actions tự động kiểm định tiêu chuẩn DoD trên từng Pull Request.",
            lead: "Bảo đảm nhánh chính luôn ở trạng thái sẵn sàng phát hành (Production-ready).",
            keyTakeaways: ["Tự động hóa kiểm thử biên và đo độ bao phủ mã nguồn."],
          },
        ],
      },
      {
        id: "scrum-c4",
        number: 4,
        title: "Đo lường Vận tốc & Sprint Retrospective",
        description: "Phân tích đồ thị Burn-down chart chân thực, ước lượng Story Point qua Planning Poker và cải tiến quy trình.",
        duration: "45 phút",
        progressPct: 0,
        lessons: [
          {
            id: "4.1",
            title: "Phân tích Burn-down Chart Không ảo giác",
            type: "video",
            duration: "20 phút",
            status: "locked",
            xp: 90,
            objective: "Nhận biết các triệu chứng trễ tiến độ hoặc hoàn thành ảo để điều chỉnh phạm vi Sprint kịp thời.",
            lead: "Biểu đồ công việc còn lại phản ánh trung thực năng lực vận tốc (Velocity) của nhóm.",
            keyTakeaways: ["Tránh dồn toàn bộ task hoàn thành vào ngày cuối cùng của Sprint."],
          },
          {
            id: "4.2",
            title: "Tổng kết & Cải tiến Sprint Retrospective",
            type: "quiz",
            duration: "20 phút",
            status: "locked",
            xp: 100,
            objective: "Đánh giá toàn diện năng lực quản lý dự án Agile Scrum môn CS401.",
            lead: "Cấp chứng nhận Scrum Master chuẩn đồ án thực chiến.",
            keyTakeaways: ["Văn hóa không đổ lỗi và liên tục cải tiến quy trình."],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Trong tiêu chuẩn INVEST cho User Story, chữ 'S' viết tắt của từ gì?",
        options: [
          { id: "a", text: "Secure (Phải tuyệt đối bảo mật)" },
          { id: "b", text: "Small (Đủ nhỏ để hoàn thành trọn vẹn trong một Sprint)" },
          { id: "c", text: "Static (Không được thay đổi nội dung)" },
          { id: "d", text: "Structured (Phải có bảng cấu trúc CSDL)" },
        ],
        correct: "b",
        explanation: "Chữ 'S' trong INVEST là Small (Nhỏ). User Story cần đủ nhỏ (thường không quá 1/3 chu kỳ một Sprint) để nhóm dễ ước lượng và hoàn tất đúng hạn mà không bị trượt sang Sprint sau.",
      },
    ],
  },

  // ─── 5. CS202: GIẢI THUẬT NÂNG CAO & CẤU TRÚC DỮ LIỆU PHỨC HỢP ───────────
  {
    id: "dsa",
    code: "CS202",
    name: "Giải thuật Nâng cao & Cấu trúc Dữ liệu Phức hợp",
    semester: "Học kỳ 3",
    category: "Lập trình & Thuật toán",
    instructor: "Thầy Trần Minh Quân",
    instructorRole: "Giảng viên Thuật toán ứng dụng",
    instructorAvatar: "",
    bannerGradient: "from-blue-700 via-indigo-800 to-slate-900",
    badgeBg: "bg-blue-100 dark:bg-blue-900/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ 15 phút",
    overallProgress: 72,
    totalXp: 510,
    description: "Khám phá thuật toán đồ thị, cấu trúc cây phân đoạn Segment Tree, Fenwick Tree và kỹ thuật Quy hoạch động giải quyết bài toán NP-Hard.",
    chapters: [
      {
        id: "dsa-c1",
        number: 1,
        title: "Thuật toán Đồ thị Nâng cao (Graph Theory)",
        description: "Duyệt đồ thị nâng cao, tìm đường đi ngắn nhất Dijkstra/Bellman-Ford và luồng cực đại.",
        duration: "1 giờ 20 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "Cây khung nhỏ nhất & Thuật toán Kruskal / Prim",
            type: "video",
            duration: "16 phút",
            status: "done",
            xp: 85,
            objective: "Hiểu bản chất Disjoint Set Union (DSU) và tối ưu hóa nén đường đi.",
            lead: "Thuật toán Kruskal sắp xếp cạnh tăng dần và dùng DSU để tránh chu trình.",
            codeSnippet: {
              lang: "cpp",
              code: "int findRoot(int u) {\n    return parent[u] == u ? u : parent[u] = findRoot(parent[u]);\n}",
              caption: "Kỹ thuật Path Compression trong DSU",
            },
            keyTakeaways: [
              "Path Compression giảm độ phức tạp thao tác find xuống gần O(1).",
              "DSU là cấu trúc cốt lõi để phát hiện chu trình trên đồ thị vô hướng.",
            ],
          },
          {
            id: "1.2",
            title: "Dijkstra với Priority Queue (Min-Heap)",
            type: "lecture",
            duration: "20 phút",
            status: "done",
            xp: 90,
            objective: "Hiện thực thuật toán tìm đường đi ngắn nhất trên đồ thị có trọng số dương với độ phức tạp O(E log V).",
            lead: "Sử dụng hàng đợi ưu tiên giúp lấy đỉnh có khoảng cách nhỏ nhất trong O(log V).",
            keyTakeaways: [
              "Không áp dụng Dijkstra cho đồ thị có trọng số âm (dùng Bellman-Ford hoặc SPFA).",
              "Luôn kiểm tra khoảng cách cũ trước khi relax cạnh tiếp theo.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Độ phức tạp thời gian tối ưu của thuật toán Dijkstra sử dụng Min-Heap (std::priority_queue) là bao nhiêu?",
        options: [
          { id: "a", text: "O(V^2)" },
          { id: "b", text: "O(E log V)" },
          { id: "c", text: "O(V + E)" },
          { id: "d", text: "O(V * E)" },
        ],
        correct: "b",
        explanation: "Với cấu trúc Min-Heap, mỗi thao tác relax cạnh tốn O(log V), tổng cộng E lần nên độ phức tạp là O(E log V).",
      },
    ],
  },

  // ─── 6. CS405: DEVOPS, DOCKER & CI/CD PIPELINE AUTOMATION ───────────────────
  {
    id: "devops",
    code: "CS405",
    name: "DevOps, Docker & CI/CD Pipeline Automation",
    semester: "Học kỳ 6",
    category: "Hạ tầng & Vận hành",
    instructor: "Võ Nhật Huy & Đỗ Hoàng Nam",
    instructorRole: "Kỹ sư Hạ tầng Điện toán Đám mây",
    instructorAvatar: "",
    bannerGradient: "from-cyan-600 via-sky-700 to-slate-900",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/60",
    badgeText: "text-cyan-700 dark:text-cyan-300",
    totalChapters: 3,
    totalLessons: 10,
    totalDuration: "4 giờ 45 phút",
    overallProgress: 50,
    totalXp: 490,
    description: "Đóng gói ứng dụng với Docker multi-stage build, điều phối hạ tầng Kubernetes và thiết lập pipeline tự động kiểm thử, build và deploy.",
    chapters: [
      {
        id: "devops-c1",
        number: 1,
        title: "Docker Containerization & Multi-Stage Build",
        description: "Bản chất Linux cgroups, namespaces và kỹ thuật tối ưu hóa dung lượng image.",
        duration: "1 giờ 30 phút",
        progressPct: 100,
        lessons: [
          {
            id: "1.1",
            title: "Viết Dockerfile chuẩn Production & Multi-stage",
            type: "video",
            duration: "15 phút",
            status: "done",
            xp: 80,
            objective: "Tách biệt giai đoạn Build và Runtime nhằm giảm kích thước image từ 1GB xuống dưới 50MB.",
            lead: "Multi-stage build chỉ giữ lại binary thành phẩm trong base image tối giản như Alpine hoặc Distroless.",
            codeSnippet: {
              lang: "dockerfile",
              code: "FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY . .\nRUN npm run build\n\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html",
              caption: "Multi-stage build cho ứng dụng Single Page App",
            },
            keyTakeaways: [
              "Không bao giờ để compiler, source code hoặc secret keys trong production image.",
              "Dùng .dockerignore để tránh sao chép node_modules hoặc tệp tạm vào build context.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Lợi ích cốt lõi của kỹ thuật Docker Multi-stage Build là gì?",
        options: [
          { id: "a", text: "Tăng tốc độ mạng khi tải package" },
          { id: "b", text: "Giảm tối đa dung lượng production image và loại bỏ công cụ build thừa thãi" },
          { id: "c", text: "Giúp container tự động scale mà không cần Kubernetes" },
          { id: "d", text: "Cho phép chạy nhiều hệ điều hành cùng lúc" },
        ],
        correct: "b",
        explanation: "Multi-stage build cho phép biên dịch ở stage đầu và chỉ sao chép artifact cuối cùng sang stage runtime tinh gọn (như Alpine/Distroless), giúp image siêu nhẹ và an toàn.",
      },
    ],
  },

  // ─── 7. CS306: LẬP TRÌNH DI ĐỘNG ĐA NỀN TẢNG (FLUTTER) ──────────────────────
  {
    id: "mobile",
    code: "CS306",
    name: "Lập trình Ứng dụng Di động Đa nền tảng (Flutter)",
    semester: "Học kỳ 5",
    category: "Phát triển Ứng dụng",
    instructor: "Phan Đình Nghị",
    instructorRole: "Mobile Solutions Architect",
    instructorAvatar: "",
    bannerGradient: "from-sky-600 via-blue-700 to-indigo-900",
    badgeBg: "bg-sky-100 dark:bg-sky-900/60",
    badgeText: "text-sky-700 dark:text-sky-300",
    totalChapters: 3,
    totalLessons: 8,
    totalDuration: "3 giờ 50 phút",
    overallProgress: 30,
    totalXp: 420,
    description: "Xây dựng ứng dụng di động hiệu năng 60/120 FPS với Flutter, quản lý trạng thái Reactive theo kiến trúc BLoC và Clean Architecture.",
    chapters: [
      {
        id: "mobile-c1",
        number: 1,
        title: "Widget Tree & State Management Reactive",
        description: "Bản chất RenderObject, Element Tree và cơ chế quản lý luồng trạng thái với BLoC/Cubit.",
        duration: "1 giờ 10 phút",
        progressPct: 60,
        lessons: [
          {
            id: "1.1",
            title: "Cơ chế Render của Flutter Engine (Skia / Impeller)",
            type: "video",
            duration: "14 phút",
            status: "done",
            xp: 75,
            objective: "Hiểu tại sao Flutter không dùng OEM widgets mà tự vẽ trực tiếp lên GPU canvas.",
            lead: "Flutter vẽ từng pixel thông qua engine đồ họa Impeller, đảm bảo tính nhất quán trên cả iOS và Android.",
            keyTakeaways: [
              "Flutter sở hữu 3 cây: Widget Tree (cấu hình), Element Tree (vòng đời), RenderObject Tree (vẽ GPU).",
              "Hạn chế gọi setState ở gốc Widget Tree để tránh kích hoạt rebuild toàn màn hình.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Trong Flutter, cây nào trực tiếp tính toán tọa độ kích thước và ra lệnh vẽ lên màn hình qua GPU?",
        options: [
          { id: "a", text: "Widget Tree" },
          { id: "b", text: "Element Tree" },
          { id: "c", text: "RenderObject Tree" },
          { id: "d", text: "State Tree" },
        ],
        correct: "c",
        explanation: "RenderObject Tree nắm giữ logic tính toán layout kích thước (layout pass) và gọi các hàm canvas vẽ lên GPU (paint pass).",
      },
    ],
  },

  // ─── 8. CS410: TRÍ TUỆ NHÂN TẠO & ỨNG DỤNG MACHINE LEARNING ────────────────
  {
    id: "ai-ml",
    code: "CS410",
    name: "Trí tuệ Nhân tạo & Ứng dụng Machine Learning",
    semester: "Học kỳ 7",
    category: "Khoa học Dữ liệu & AI",
    instructor: "TS. Lê Hoàng Mai",
    instructorRole: "Trưởng phòng Nghiên cứu AI Lab",
    instructorAvatar: "",
    bannerGradient: "from-emerald-700 via-teal-800 to-slate-900",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    totalChapters: 3,
    totalLessons: 10,
    totalDuration: "5 giờ",
    overallProgress: 20,
    totalXp: 440,
    description: "Nguyên lý học máy có giám sát, mạng nơ-ron tích chập CNN, cơ chế Self-Attention trong kiến trúc Transformer và ứng dụng LLM.",
    chapters: [
      {
        id: "ai-c1",
        number: 1,
        title: "Toán học cho Machine Learning & Mạng Nơ-ron Căn bản",
        description: "Đại số tuyến tính, đạo hàm lan truyền ngược (Backpropagation) và hàm tối ưu hóa Gradient Descent.",
        duration: "1 giờ 45 phút",
        progressPct: 40,
        lessons: [
          {
            id: "1.1",
            title: "Bản chất Thuật toán Lan truyền ngược (Backpropagation)",
            type: "video",
            duration: "18 phút",
            status: "done",
            xp: 90,
            objective: "Nắm vững quy tắc chuỗi (Chain Rule) trong giải tích ma trận để cập nhật trọng số nơ-ron.",
            lead: "Backpropagation tính toán gradient của hàm mất mát đối với từng tham số trọng số W và bias b.",
            codeSnippet: {
              lang: "python",
              code: "loss = criterion(outputs, targets)\nloss.backward()\noptimizer.step()\noptimizer.zero_grad()",
              caption: "Vòng lặp huấn luyện chuẩn trong PyTorch",
            },
            keyTakeaways: [
              "Luôn gọi optimizer.zero_grad() trước mỗi bước backward để tránh cộng dồn gradient cũ.",
              "Hàm kích hoạt phi tuyến (ReLU, GELU) giúp mạng học được các mặt phân chia phức tạp.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Tại sao cần gọi optimizer.zero_grad() trước khi gọi loss.backward() trong PyTorch?",
        options: [
          { id: "a", text: "Để giải phóng bộ nhớ RAM của máy tính" },
          { id: "b", text: "Vì mặc định PyTorch sẽ cộng dồn (accumulate) gradient sau mỗi lần tính toán backward" },
          { id: "c", text: "Để khởi tạo lại trọng số ngẫu nhiên cho mạng" },
          { id: "d", text: "Để chuyển model sang chế độ evaluate" },
        ],
        correct: "b",
        explanation: "Trong PyTorch, gradient mặc định sẽ được cộng dồn sau mỗi lần gọi backward. Do đó cần reset về 0 ở đầu mỗi batch huấn luyện.",
      },
    ],
  },

  // ─── 9. CS312: AN TOÀN THÔNG TIN & BẢO MẬT ỨNG DỤNG WEB ─────────────────────
  {
    id: "security",
    code: "CS312",
    name: "An toàn Thông tin & Bảo mật Web (OWASP Top 10)",
    semester: "Học kỳ 5",
    category: "Bảo mật & An toàn Mạng",
    instructor: "Thầy Đặng Quốc Bảo",
    instructorRole: "Chuyên gia An ninh mạng & Pentest",
    instructorAvatar: "",
    bannerGradient: "from-rose-700 via-red-800 to-slate-900",
    badgeBg: "bg-rose-100 dark:bg-rose-900/60",
    badgeText: "text-rose-700 dark:text-rose-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ",
    overallProgress: 40,
    totalXp: 460,
    description: "Nhận diện và phòng chống 10 lỗ hổng nguy hiểm nhất theo tiêu chuẩn OWASP: SQL Injection, XSS, CSRF, IDOR và Broken Access Control.",
    chapters: [
      {
        id: "sec-c1",
        number: 1,
        title: "Kiểm soát Truy cập & Lỗ hổng SQL Injection / XSS",
        description: "Nguyên lý phòng thủ theo chiều sâu (Defense-in-depth) và cơ chế mã hóa tham số truy vấn.",
        duration: "1 giờ 20 phút",
        progressPct: 80,
        lessons: [
          {
            id: "1.1",
            title: "Bản chất Tấn công SQL Injection và Cách triệt tiêu bằng Prepared Statements",
            type: "video",
            duration: "16 phút",
            status: "done",
            xp: 85,
            objective: "Hiểu rõ cơ chế tách bạch giữa mã lệnh SQL (code) và dữ liệu đầu vào (data) tại tầng engine CSDL.",
            lead: "Prepared Statement gửi câu lệnh SQL tiền biên dịch đến máy chủ DB trước, sau đó mới truyền tham số dữ liệu.",
            codeSnippet: {
              lang: "javascript",
              code: "const stmt = db.prepare('SELECT * FROM users WHERE email = ?');\nconst user = stmt.get(userInputEmail);",
              caption: "Prepared Statement loại bỏ 100% rủi ro chèn mã SQL",
            },
            keyTakeaways: [
              "Tuyệt đối không bao giờ nối chuỗi (String Concatenation) khi xây dựng câu truy vấn SQL.",
              "Áp dụng nguyên tắc đặc quyền tối thiểu (Least Privilege) cho tài khoản kết nối CSDL.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Tại sao Prepared Statements (Parameterized Queries) có thể ngăn chặn triệt để lỗ hổng SQL Injection?",
        options: [
          { id: "a", text: "Vì hệ thống tự động mã hóa chuỗi đầu vào sang chuẩn Base64" },
          { id: "b", text: "Vì câu lệnh SQL được biên dịch trước, dữ liệu người dùng chỉ được coi là giá trị hằng số chứ không thể thay đổi cấu trúc cú pháp lệnh" },
          { id: "c", text: "Vì máy chủ cơ sở dữ liệu sẽ xóa bỏ toàn bộ dấu ngoặc kép" },
          { id: "d", text: "Vì Prepared Statements buộc người dùng phải đăng nhập qua HTTPS" },
        ],
        correct: "b",
        explanation: "Prepared Statements gửi cấu trúc truy vấn đi trước để DB compile. Dữ liệu tham số được truyền riêng biệt sau đó, khiến engine DB luôn coi tham số là giá trị dữ liệu thuần túy (literal values), không thể làm thay đổi cây cú pháp AST của truy vấn.",
      },
    ],
  },

  // ─── 10. CS415: ĐIỆN TOÁN ĐÁM MÂY & KIẾN TRÚC MICROSERVICES ─────────────────
  {
    id: "cloud",
    code: "CS415",
    name: "Điện toán Đám mây & Kiến trúc Microservices (AWS)",
    semester: "Học kỳ 7",
    category: "Kiến trúc Hệ thống",
    instructor: "Thầy Nguyễn Phước & TS. Lê Hoàng Mai",
    instructorRole: "Hội đồng Cố vấn Đồ án Tốt nghiệp",
    instructorAvatar: "",
    bannerGradient: "from-amber-600 via-orange-700 to-slate-900",
    badgeBg: "bg-amber-100 dark:bg-amber-900/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ 30 phút",
    overallProgress: 15,
    totalXp: 400,
    description: "Phân rã hệ thống nguyên khối (Monolith) sang kiến trúc vi dịch vụ (Microservices), cơ chế giao tiếp bất đồng bộ qua Message Queue và Serverless.",
    chapters: [
      {
        id: "cloud-c1",
        number: 1,
        title: "Microservices Communication & Event-Driven Architecture",
        description: "Bản chất Event-Driven, Saga Pattern giải quyết phân tán giao dịch và API Gateway pattern.",
        duration: "1 giờ 30 phút",
        progressPct: 30,
        lessons: [
          {
            id: "1.1",
            title: "Giao tiếp Đồng bộ (gRPC/HTTP) vs Bất đồng bộ (RabbitMQ/Kafka)",
            type: "video",
            duration: "17 phút",
            status: "done",
            xp: 80,
            objective: "Lựa chọn phương thức giao tiếp phù hợp để loại bỏ phụ thuộc ghép nối lỏng (Loose Coupling) giữa các service.",
            lead: "Trong vi dịch vụ, việc dùng HTTP đồng bộ qua nhiều service dễ gây hiện tượng nghẽn nối tầng (Cascading Failure).",
            keyTakeaways: [
              "Dùng Event Broker (Kafka/RabbitMQ) cho các tác vụ phi đồng bộ (gửi email, trừ kho, tính hoa hồng).",
              "Áp dụng Circuit Breaker (Resilience4j / Polly) khi gọi service ngoại vi.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Hiện tượng nào xảy ra khi một microservice gặp sự cố kéo theo các service phụ thuộc khác cũng đồng loạt chết vì cạn kiệt tài nguyên kết nối?",
        options: [
          { id: "a", text: "Memory Leak" },
          { id: "b", text: "Cascading Failure (Sập đổ theo tầng)" },
          { id: "c", text: "Race Condition" },
          { id: "d", text: "Split-brain" },
        ],
        correct: "b",
        explanation: "Cascading Failure xảy ra khi các cuộc gọi đồng bộ bị timeout, giữ connection pool khiến các service gọi tới cũng bị treo và kiệt quệ tài nguyên dây chuyền.",
      },
    ],
  },

  // ─── 11. CS205: KIẾN TRÚC MÁY TÍNH & MẠNG MÁY TÍNH ────────────────────────
  {
    id: "network",
    code: "CS205",
    name: "Kiến trúc Máy tính, Hệ điều hành & Mạng Máy tính (TCP/IP)",
    semester: "Học kỳ 2",
    category: "Khoa học Máy tính",
    instructor: "Thầy Trần Minh Quân",
    instructorRole: "Bộ môn Hệ thống & Mạng Máy tính",
    instructorAvatar: "",
    bannerGradient: "from-slate-700 via-zinc-800 to-slate-900",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ 15 phút",
    overallProgress: 35,
    totalXp: 420,
    description: "Khám phá tầng đáy của máy tính: tiến trình CPU, cấp phát bộ nhớ ảo Virtual Memory, giao thức TCP 3-way Handshake và tầng vận chuyển Socket.",
    chapters: [
      {
        id: "net-c1",
        number: 1,
        title: "TCP/IP Stack, Socket & HTTP/3 QUIC",
        description: "Bản chất 3-Way Handshake, phân biệt TCP vs UDP và giao thức tầng mạng HTTP/2, HTTP/3.",
        duration: "1 giờ 20 phút",
        progressPct: 40,
        lessons: [
          {
            id: "1.1",
            title: "3-Way Handshake (SYN, SYN-ACK, ACK) & Socket Lifecycle",
            type: "video",
            duration: "16 phút",
            status: "done",
            xp: 80,
            objective: "Hiểu bản chất thiết lập kết nối tin cậy và cơ chế chống nghẽn đường truyền trong TCP.",
            lead: "TCP đảm bảo dữ liệu truyền tải không bị mất mát hay xáo trộn thứ tự gói tin nhờ bộ đệm ACK.",
            codeSnippet: {
              lang: "cpp",
              code: `int server_fd = socket(AF_INET, SOCK_STREAM, 0);
bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));
listen(server_fd, 128); // Backlog queue size
int client_socket = accept(server_fd, NULL, NULL);`,
              caption: "Khởi tạo TCP Server Socket với hàng đợi kết nối backlog",
            },
            keyTakeaways: [
              "SYN flood attack xảy ra khi attacker gửi nhiều SYN nhưng không gửi lại ACK hoàn tất.",
              "HTTP/3 chuyển sang UDP (QUIC) để loại bỏ hiện tượng Head-of-Line Blocking.",
            ],
          },
          {
            id: "1.2",
            title: "Bộ nhớ ảo (Virtual Memory) & Phân trang Page Fault",
            type: "lecture",
            duration: "18 phút",
            status: "done",
            xp: 90,
            objective: "Nắm vững bản đồ ánh xạ địa chỉ ảo sang RAM vật lý qua bảng MMU.",
            lead: "Virtual Memory cho phép mỗi tiến trình cảm giác sở hữu toàn bộ không gian RAM mà không bị xung đột.",
            keyTakeaways: [
              "Page Fault xảy ra khi trang nhớ chưa được nạp vào RAM vật lý, OS phải load từ Disk.",
              "Tránh Thrashing bằng cách kiểm soát kích thước tập làm việc (Working Set).",
            ],
          },
          {
            id: "1.3",
            title: "Checkpoint Quiz: Mạng & Hệ điều hành",
            type: "quiz",
            duration: "12 phút",
            status: "active",
            xp: 70,
            objective: "Đánh giá khả năng hiểu luồng gói tin TCP và cơ chế quản lý bộ nhớ tiến trình.",
            lead: "Vượt qua các câu hỏi tình huống mô phỏng phỏng vấn kỹ sư hệ thống tại các công ty công nghệ lớn.",
            keyTakeaways: [
              "Ôn lại TIME_WAIT state trong TCP và thuật toán thay thế trang LRU.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Tại sao TCP cần bắt tay 3 bước (3-Way Handshake) thay vì chỉ cần 2 bước?",
        options: [
          { id: "a", text: "Để mã hóa dữ liệu đường truyền bằng SSL" },
          { id: "b", text: "Để cả Client và Server đều đồng bộ số thứ tự chuỗi gói tin (ISN) và xác nhận cả 2 chiều nhận/gửi đều thông suốt" },
          { id: "c", text: "Để kiểm tra xem mật khẩu người dùng có chính xác hay không" },
          { id: "d", text: "Do quy định của hệ điều hành Linux" },
        ],
        correct: "b",
        explanation: "Mỗi bên cần gửi số Sequence ban đầu (ISN) và nhận được ACK từ phía đối diện để đảm bảo kênh truyền 2 chiều song công (Full-Duplex) hoạt động hoàn hảo.",
      },
    ],
  },

  // ─── 12. CS210: FRONTEND HIỆN ĐẠI REACT 19 & NEXT.JS 15 ───────────────────
  {
    id: "frontend",
    code: "CS210",
    name: "Lập trình Web Frontend Hiện đại (React 19, Next.js 15 & TypeScript)",
    semester: "Học kỳ 4",
    category: "Frontend Engineering",
    instructor: "Võ Nhật Huy & Phan Đình Nghị",
    instructorRole: "Kỹ sư Frontend Cao cấp / Trợ giảng Đồ án",
    instructorAvatar: "",
    bannerGradient: "from-cyan-600 via-blue-600 to-indigo-900",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/60",
    badgeText: "text-cyan-700 dark:text-cyan-300",
    totalChapters: 3,
    totalLessons: 10,
    totalDuration: "5 giờ 20 phút",
    overallProgress: 52,
    totalXp: 520,
    description: "Xây dựng Web App chuẩn thời đại với React 19, Next.js 15 App Router, React Server Components (RSC), Tailwind CSS v4 và TypeScript strict mode.",
    chapters: [
      {
        id: "fe-c1",
        number: 1,
        title: "React Server Components (RSC) & Next.js 15 App Router",
        description: "Bản chất render trên Server, loại bỏ JavaScript bundle tải về Client và tối ưu SEO vượt trội.",
        duration: "1 giờ 35 phút",
        progressPct: 60,
        lessons: [
          {
            id: "1.1",
            title: "React Server Components (RSC) vs Client Components ('use client')",
            type: "video",
            duration: "19 phút",
            status: "done",
            xp: 90,
            objective: "Hiểu bản chất tại sao Server Components không gửi JavaScript bundle về client, giảm 60% TTI.",
            lead: "Trong React 19, component mặc định là Server Component, chỉ khai báo 'use client' khi cần hooks (useState, useEffect) hoặc event listeners.",
            codeSnippet: {
              lang: "tsx",
              code: `// app/dashboard/page.tsx (Server Component mặc định)
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const metrics = await db.query("SELECT * FROM kpi_stats");
  return <MetricOverview data={metrics} />;
}`,
              caption: "Truy vấn database trực tiếp trong Server Component an toàn và zero client-bundle",
            },
            keyTakeaways: [
              "Server Components render ra HTML/RSC payload trên server, không chứa runtime JS ở client.",
              "Chỉ đặt 'use client' ở các lá tương tác (Interactive Leaves) như button, modal, form input.",
            ],
          },
          {
            id: "1.2",
            title: "Server Actions & Xử lý Form không cần API Routes",
            type: "lecture",
            duration: "20 phút",
            status: "done",
            xp: 90,
            objective: "Tận dụng Server Actions với revalidatePath và useActionState để cập nhật dữ liệu mượt mà.",
            lead: "Server Actions cho phép gọi trực tiếp hàm server từ client component với type-safety 100%.",
            keyTakeaways: [
              "Server Actions tự động mã hóa CSRF token bảo vệ các thao tác nhạy cảm.",
              "Kết hợp useOptimistic để tạo trải nghiệm phản hồi tức thì cho người dùng.",
            ],
          },
          {
            id: "1.3",
            title: "Checkpoint Quiz: Kiến trúc React 19 & Next.js",
            type: "quiz",
            duration: "15 phút",
            status: "active",
            xp: 80,
            objective: "Đánh giá tư duy phân tách ranh giới Client/Server trong Web App thế hệ mới.",
            lead: "Vượt qua bài test kiến trúc về Hydration, Streaming SSR và Suspense Boundaries.",
            keyTakeaways: [
              "Suspense boundaries cho phép stream từng phần giao diện mà không phải chờ toàn trang.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Khi nào bạn BẮT BUỘC phải thêm chỉ thị 'use client' ở đầu file trong Next.js App Router?",
        options: [
          { id: "a", text: "Khi component thực hiện truy vấn trực tiếp vào PostgreSQL" },
          { id: "b", text: "Khi component cần dùng useState, useEffect, onClick hoặc truy cập window/localStorage" },
          { id: "c", text: "Khi muốn render HTML nhanh hơn" },
          { id: "d", text: "Trong tất cả mọi file không ngoại lệ" },
        ],
        correct: "b",
        explanation: "Chỉ thị 'use client' xác định ranh giới (boundary) cho phép component sử dụng các API đặc thù của trình duyệt và cơ chế React Hooks của Client.",
      },
    ],
  },

  // ─── 13. CS215: REAL-TIME WEBSOCKETS, STATE & WEB VITALS ──────────────────
  {
    id: "realtime",
    code: "CS215",
    name: "Quản lý Trạng thái, Real-time WebSockets & Tối ưu Web Vitals",
    semester: "Học kỳ 4",
    category: "Frontend Engineering",
    instructor: "Phan Đình Nghị & Thầy Nguyễn Phước",
    instructorRole: "Chuyên gia Tối ưu Hiệu năng Web",
    instructorAvatar: "",
    bannerGradient: "from-violet-600 via-purple-700 to-slate-900",
    badgeBg: "bg-violet-100 dark:bg-violet-900/60",
    badgeText: "text-violet-700 dark:text-violet-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "4 giờ 40 phút",
    overallProgress: 40,
    totalXp: 460,
    description: "Làm chủ Server State với TanStack Query, Client State nguyên tử với Zustand, kênh truyền 2 chiều WebSockets/SSE và tối ưu hóa Core Web Vitals (LCP, INP, CLS) chuẩn 100 điểm Lighthouse.",
    chapters: [
      {
        id: "rt-c1",
        number: 1,
        title: "Server State Caching & Kênh Truyền Thời Gian Thực",
        description: "Phân biệt Server State vs UI State, cơ chế Revalidation tự động và xử lý ngắt kết nối Reconnect WebSockets.",
        duration: "1 giờ 30 phút",
        progressPct: 45,
        lessons: [
          {
            id: "1.1",
            title: "TanStack Query (React Query) Caching & Stale-While-Revalidate",
            type: "video",
            duration: "18 phút",
            status: "done",
            xp: 85,
            objective: "Xóa bỏ 90% boilerplate useEffect fetching bằng cơ chế Query Cache tự động deduping.",
            lead: "TanStack Query đồng bộ dữ liệu server, tự động làm mới khi user focus tab và xử lý retry thông minh.",
            codeSnippet: {
              lang: "tsx",
              code: `const { data, isLoading } = useQuery({
  queryKey: ["notifications", userId],
  queryFn: () => fetchNotifications(userId),
  staleTime: 1000 * 60 * 5, // 5 phút không refetch thừa
});`,
              caption: "Cấu hình Stale Time giúp tối ưu số lần gọi API lên server",
            },
            keyTakeaways: [
              "Không lưu dữ liệu từ API vào useState; để TanStack Query quản lý làm Single Source of Truth.",
              "Dùng Optimistic Updates để UI nhảy trước khi server phản hồi thành công.",
            ],
          },
          {
            id: "1.2",
            title: "WebSockets Full-Duplex & Kỹ thuật Heartbeat Ping/Pong",
            type: "lecture",
            duration: "17 phút",
            status: "done",
            xp: 85,
            objective: "Xây dựng kênh truyền tin nhắn, thông báo tức thì với độ trễ dưới 20ms.",
            lead: "WebSockets nâng cấp kết nối HTTP qua Upgrade Header, giữ kết nối TCP mở liên tục để trao đổi 2 chiều.",
            keyTakeaways: [
              "Bắt buộc gửi Ping/Pong heartbeat định kỳ 30s để phát hiện Half-Open Connections.",
              "Áp dụng Exponential Backoff khi tự động reconnect mạng chập chờn.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Chỉ số Core Web Vitals nào đo lường độ phản hồi tương tác (thời gian từ khi người dùng click đến khi khung hình tiếp theo cập nhật)?",
        options: [
          { id: "a", text: "LCP (Largest Contentful Paint)" },
          { id: "b", text: "INP (Interaction to Next Paint)" },
          { id: "c", text: "CLS (Cumulative Layout Shift)" },
          { id: "d", text: "FCP (First Contentful Paint)" },
        ],
        correct: "b",
        explanation: "INP đo lường độ trễ phản hồi của trang web đối với toàn bộ các tương tác người dùng (click, gõ phím) trong suốt vòng đời phiên truy cập.",
      },
    ],
  },

  // ─── 14. CS315: HỆ THỐNG PHÂN TÁN, KAFKA & REDIS CACHE ────────────────────
  {
    id: "distributed",
    code: "CS315",
    name: "Hệ thống Phân tán, Message Queue (Kafka) & Redis Cache",
    semester: "Học kỳ 5",
    category: "Backend & Hệ thống",
    instructor: "Thầy Nguyễn Phước & Nguyễn Bá Hòa",
    instructorRole: "Kiến trúc sư Hệ thống Phân tán",
    instructorAvatar: "",
    bannerGradient: "from-emerald-600 via-teal-700 to-slate-900",
    badgeBg: "bg-teal-100 dark:bg-teal-900/60",
    badgeText: "text-teal-700 dark:text-teal-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "5 giờ",
    overallProgress: 28,
    totalXp: 480,
    description: "Giải quyết bài toán hàng trăm nghìn người dùng đồng thời: Chiến lược Caching Redis (Cache-aside, Rate limiting), luồng sự kiện phân tán Apache Kafka và xử lý nhiệm vụ ngầm (Background Jobs).",
    chapters: [
      {
        id: "dist-c1",
        number: 1,
        title: "Chiến Lược Caching & Chống Sập Hệ Thống Phân Tán",
        description: "Cache-Aside, Write-Through và cách phòng tránh các thảm họa: Cache Penetration, Cache Breakdown, Cache Avalanche.",
        duration: "1 giờ 35 phút",
        progressPct: 35,
        lessons: [
          {
            id: "1.1",
            title: "Redis In-Memory Data Structures & Cache-Aside Pattern",
            type: "video",
            duration: "20 phút",
            status: "done",
            xp: 90,
            objective: "Hiểu tại sao Redis xử lý hàng trăm nghìn ops/giây nhờ Single-Threaded Event Loop và In-Memory storage.",
            lead: "Áp dụng Cache-Aside: Đọc từ Cache trước, nếu miss mới xuống Database và nạp ngược lại Cache kèm TTL.",
            codeSnippet: {
              lang: "python",
              code: `def get_user_profile(user_id):
    cached = redis_client.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    user = db.users.find_one({"id": user_id})
    redis_client.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user`,
              caption: "Mô hình Cache-Aside tiêu chuẩn với hạn sử dụng TTL 1 giờ",
            },
            keyTakeaways: [
              "Cache Avalanche: Khi hàng triệu key cùng hết hạn một lúc làm DB chết ngất -> Khắc phục: cộng Random Jitter vào TTL.",
              "Cache Penetration: Truy vấn key không tồn tại -> Khắc phục: Dùng Bloom Filter hoặc cache kết quả null có TTL ngắn.",
            ],
          },
          {
            id: "1.2",
            title: "Apache Kafka: Log-based Message Streaming & Consumer Groups",
            type: "lecture",
            duration: "21 phút",
            status: "done",
            xp: 95,
            objective: "Nắm vững cơ chế Partitioning để mở rộng quy mô ghi dữ liệu tuyến tính và bảo đảm thứ tự gói tin.",
            lead: "Kafka không xóa message ngay sau khi đọc; nó lưu trữ tuần tự trên disk dưới dạng Append-Only Log siêu tốc.",
            keyTakeaways: [
              "Mỗi partition trong Kafka chỉ được tiêu thụ bởi duy nhất 1 consumer trong cùng 1 Consumer Group.",
              "Thứ tự message chỉ được bảo đảm trong phạm vi CÙNG một Partition.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Hiện tượng 'Cache Avalanche' (Tuyết lở bộ nhớ đệm) xảy ra trong trường hợp nào?",
        options: [
          { id: "a", text: "Khi Redis bị tràn ổ cứng" },
          { id: "b", text: "Khi một số lượng cực lớn các key trong cache cùng hết hạn (expire) tại cùng một thời điểm, khiến mọi request dồn dập đâm thẳng xuống Database" },
          { id: "c", text: "Khi máy chủ bị ngắt nguồn điện" },
          { id: "d", text: "Khi lập trình viên quên cài đặt Redis" },
        ],
        correct: "b",
        explanation: "Khi hàng loạt key hết hạn đồng loạt, Database sẽ phải chịu tải đột biến gấp hàng trăm lần dẫn tới sập dây chuyền. Giải pháp là thêm Random Jitter (thời gian ngẫu nhiên 1-10 phút) vào mỗi TTL.",
      },
    ],
  },

  // ─── 15. CS420: PHÁT TRIỂN AI-NATIVE WEB APP & RAG AGENTS ────────────────
  {
    id: "ai-agent",
    code: "CS420",
    name: "Phát triển AI-Native Web App, RAG Architecture & AI Agents",
    semester: "Học kỳ 6",
    category: "AI & Kỹ thuật Hiện đại",
    instructor: "Võ Nhật Huy & TS. Lê Hoàng Mai",
    instructorRole: "Ban cố vấn Trí tuệ Nhân tạo & Web App",
    instructorAvatar: "",
    bannerGradient: "from-fuchsia-600 via-pink-600 to-indigo-900",
    badgeBg: "bg-fuchsia-100 dark:bg-fuchsia-900/60",
    badgeText: "text-fuchsia-700 dark:text-fuchsia-300",
    totalChapters: 3,
    totalLessons: 10,
    totalDuration: "5 giờ 45 phút",
    overallProgress: 64,
    totalXp: 600,
    description: "Kỹ năng tối thượng của thời đại AI: Tích hợp Gemini & OpenAI APIs, kiến trúc RAG với CSDL véc-tơ (pgvector / Qdrant), Function Calling và xây dựng AI Agents tự hành xử lý tác vụ thông minh cho Web App.",
    chapters: [
      {
        id: "ai-c1",
        number: 1,
        title: "Kiến Trúc RAG (Retrieval-Augmented Generation) & Vector Database",
        description: "Vector Embeddings, Cosine Similarity, kỹ thuật Chunking văn bản và loại trừ ảo giác (Hallucination) của LLM.",
        duration: "1 giờ 45 phút",
        progressPct: 70,
        lessons: [
          {
            id: "1.1",
            title: "Text Embeddings & Tìm Kiếm Ngữ Nghĩa với pgvector trong PostgreSQL",
            type: "video",
            duration: "22 phút",
            status: "done",
            xp: 95,
            objective: "Biến đổi tài liệu học thuật và văn bản thành véc-tơ 768/1536 chiều để tìm kiếm ý nghĩa tương đồng.",
            lead: "Tìm kiếm ngữ nghĩa (Semantic Search) vượt trội so với tìm kiếm từ khóa SQL LIKE nhờ hiểu được ngữ cảnh câu chữ.",
            codeSnippet: {
              lang: "sql",
              code: `-- Tìm kiếm top 5 đoạn tài liệu tương đồng nhất với câu hỏi sinh viên
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM course_knowledge_chunks
WHERE 1 - (embedding <=> query_embedding) > 0.78
ORDER BY similarity DESC
LIMIT 5;`,
              caption: "Toán tử khoảng cách Cosine Distance (<=>) trong pgvector",
            },
            keyTakeaways: [
              "Dùng HNSW hoặc IVFFlat index trong PostgreSQL để tăng tốc độ tìm kiếm véc-tơ hàng triệu dòng.",
              "Kích thước Chunking tối ưu thường từ 400 - 800 tokens kèm 10% overlap.",
            ],
          },
          {
            id: "1.2",
            title: "Quy Trình RAG Hoàn Chỉnh & Re-ranking Ngữ Cảnh",
            type: "lecture",
            duration: "23 phút",
            status: "done",
            xp: 100,
            objective: "Ngăn chặn ảo giác bằng cách tiêm (inject) các đoạn trích dẫn thực tế vào System Prompt của LLM.",
            lead: "RAG là cầu nối giúp LLM trả lời chính xác dựa trên kho tài liệu nội bộ của trường đại học hoặc doanh nghiệp mà không cần tốn hàng triệu đô train lại model.",
            keyTakeaways: [
              "Áp dụng Cross-Encoder Re-ranker (Cohere / BGE) sau bước Vector Search để lọc bỏ rác.",
              "Luôn yêu cầu mô hình trích dẫn nguồn (Citations) và thừa nhận nếu không tìm thấy dữ liệu trong ngữ cảnh.",
            ],
          },
          {
            id: "1.3",
            title: "AI Agent: Tool Calling (Function Calling) & Autonomous Loop",
            type: "video",
            duration: "25 phút",
            status: "active",
            xp: 110,
            objective: "Cho phép AI tự quyết định khi nào cần tra cứu DB, gọi API thanh toán hay chạy test runner.",
            lead: "Agentic AI nâng cấp LLM từ một 'bình luận viên' thành một 'người thực thi' có khả năng sử dụng công cụ.",
            keyTakeaways: [
              "Định nghĩa JSON Schema rõ ràng cho từng tool để LLM sinh arguments chuẩn xác.",
              "Thiết lập Guardrails và human-in-the-loop cho các thao tác ghi dữ liệu nhạy cảm.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Lợi ích cốt lõi nhất của kỹ thuật RAG (Retrieval-Augmented Generation) so với việc Fine-tuning mô hình ngôn ngữ là gì?",
        options: [
          { id: "a", text: "RAG giúp mô hình chạy nhanh hơn trên CPU máy tính cũ" },
          { id: "b", text: "Cung cấp thông tin nội bộ cập nhật tức thì, loại bỏ ảo giác, có thể trích dẫn nguồn minh bạch và chi phí rẻ hơn hàng ngàn lần" },
          { id: "c", text: "RAG không cần dùng đến câu lệnh Prompt" },
          { id: "d", text: "RAG biến mọi website thành ứng dụng di động" },
        ],
        correct: "b",
        explanation: "RAG truy xuất trực tiếp các đoạn dữ liệu thực tế tại thời điểm truy vấn để cung cấp làm bối cảnh (context) cho LLM, giúp câu trả lời luôn chính xác, cập nhật và có thể kiểm chứng nguồn.",
      },
    ],
  },

  // ─── 16. CS499: ĐỒ ÁN KỸ SƯ: XÂY DỰNG ENTERPRISE WEB APP PRODUCTION ────────
  {
    id: "capstone",
    code: "CS499",
    name: "Đồ án Tốt nghiệp Kỹ sư: Xây dựng Enterprise Web App Production",
    semester: "Học kỳ 8",
    category: "Đồ án Tốt nghiệp",
    instructor: "Hội đồng Giảng viên & Ban Cố vấn Doanh nghiệp",
    instructorRole: "Hội đồng Chấm Đồ án Kỹ sư Tốt nghiệp",
    instructorAvatar: "",
    bannerGradient: "from-amber-600 via-rose-600 to-purple-900",
    badgeBg: "bg-amber-100 dark:bg-amber-900/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    totalChapters: 3,
    totalLessons: 9,
    totalDuration: "6 giờ 30 phút",
    overallProgress: 20,
    totalXp: 750,
    description: "Đồ án bảo vệ tốt nghiệp: Xây dựng nền tảng Web App thương mại hoặc SaaS hoàn chỉnh từ A-Z. Áp dụng toàn bộ kiến thức: Next.js 15, FastAPI, PostgreSQL phân tán, tích hợp AI Socratic, bảo mật OWASP và CI/CD tự động lên Cloud AWS.",
    chapters: [
      {
        id: "cap-c1",
        number: 1,
        title: "Kiến Trúc Tổng Thể & Tiêu Chuẩn Nghiệm Thu Production",
        description: "Bản vẽ kiến trúc hệ thống, cam kết SLO/SLA, thiết kế cơ chế bảo vệ Zero Trust và pipeline nghiệm thu đồ án.",
        duration: "2 giờ",
        progressPct: 20,
        lessons: [
          {
            id: "1.1",
            title: "Bản Thiết Kế Kiến Trúc Hệ Thống (Architecture Blueprint) & SLO/SLA",
            type: "video",
            duration: "24 phút",
            status: "done",
            xp: 120,
            objective: "Bảo vệ kiến trúc hệ thống trước hội đồng phản biện với các chỉ số đo lường tin cậy.",
            lead: "Một đồ án kỹ sư phần mềm xuất sắc phải có sơ đồ kiến trúc thành phần (C4 Model) và ma trận rủi ro.",
            keyTakeaways: [
              "Tuân thủ SLA 99.9% khả dụng và thời gian phản hồi p95 < 200ms.",
              "Tách biệt môi trường Staging và Production với quản lý biến môi trường bảo mật.",
            ],
          },
          {
            id: "1.2",
            title: "Quy Trình Code Review Nghiêm Ngặt & Bảo Vệ Đồ Án",
            type: "lecture",
            duration: "25 phút",
            status: "active",
            xp: 120,
            objective: "Trình diễn tính toàn vẹn học thuật và khả năng vận hành sản phẩm thực tế trước Hội đồng Giảng viên.",
            lead: "Mọi dòng code đều phải có kiểm thử tự động, tuân thủ Clean Architecture và có hồ sơ tài liệu API đầy đủ.",
            keyTakeaways: [
              "Demo sản phẩm thực tế chạy live trên domain chính thức, không chạy localhost.",
              "Minh bạch hóa phân công nhiệm vụ và lịch sử commit Git của từng thành viên.",
            ],
          },
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Trong mô hình bảo vệ đồ án Kỹ sư Phần mềm hiện đại, tiêu chí nào được đánh giá cao nhất?",
        options: [
          { id: "a", text: "Số lượng slide PowerPoint nhiều nhất có thể" },
          { id: "b", text: "Hệ thống chạy thực tế trên Cloud (Production-ready), kiến trúc chịu tải phân tán, có quy trình CI/CD tự động, bảo mật và ứng dụng AI giải quyết bài toán nghiệp vụ rõ ràng" },
          { id: "c", text: "Viết thật nhiều code không cần kiểm thử" },
          { id: "d", text: "Chỉ cần giao diện đẹp, backend giả lập không quan trọng" },
        ],
        correct: "b",
        explanation: "Hội đồng doanh nghiệp và nhà trường đánh giá cao năng lực tạo ra sản phẩm hoàn chỉnh, an toàn, có khả năng mở rộng quy mô và ứng dụng các công nghệ thời đại vào thực tiễn.",
      },
    ],
  },

];

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

export interface LessonContent {
  id: string;
  title: string;
  topic: string;
  status: "done" | "active" | "locked";
  objective: string;
  durationMins: number;
  xpReward: number;
  full: {
    lead: string;
    sections: {
      heading: string;
      content: string;
      codeSnippet?: {
        lang: string;
        code: string;
        caption?: string;
      };
    }[];
    antiPattern: {
      badTitle: string;
      badDesc: string;
      solution: string;
    };
    socraticReflection: string;
  };
  summary: [string, string][];
  resources: [string, string, string][];
}

export interface SubjectModule {
  id: SubjectId;
  name: string;
  code: string;
  semester: string;
  category: string;
  iconName: "Code2" | "Globe" | "Layers" | "GitBranch";
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  practiceMode: "code" | "web" | "diagram" | "spec";
  practiceTabLabel: string;
  lessons: LessonContent[];
  quizQuestions: {
    q: string;
    options: { id: string; text: string }[];
    correct: string;
    explanation: string;
  }[];
}

export const SUBJECT_MODULES: SubjectModule[] = [
  {
    id: "oop",
    name: "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
    code: "CS201",
    semester: "Học kỳ 3",
    category: "Code & Logic Sandbox",
    iconName: "Code2",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-200 dark:border-blue-800",
    practiceMode: "code",
    practiceTabLabel: "Code Lab Sandbox",
    lessons: [
      {
        id: "1.1",
        title: "Khái niệm Kế thừa & Đa hình (Polymorphism)",
        topic: "Inheritance & Runtime Dispatch",
        status: "done",
        objective: "Nắm vững nguyên lý kế thừa (is-a), từ khóa extends/super và cơ chế Dynamic Dispatch trong Java/C++.",
        durationMins: 15,
        xpReward: 80,
        full: {
          lead: "Kế thừa và Đa hình là hai trụ cột nền tảng giúp hệ thống phần mềm mở rộng linh hoạt mà không cần sửa đổi mã nguồn sẵn có (tuân thủ nguyên lý Open/Closed Principle trong SOLID).",
          sections: [
            {
              heading: "1. Bản chất quan hệ kế thừa (is-a relationship)",
              content: "Kế thừa cho phép lớp con tái sử dụng toàn bộ trường và phương thức của lớp cha, đồng thời chuyên biệt hóa hành vi. Quan hệ này chỉ nên được thiết lập khi lớp con thực sự 'là một' (is-a) phiên bản cụ thể của lớp cha. Tránh lạm dụng kế thừa khi chỉ có quan hệ chứa (has-a) - trường hợp đó cần dùng Composition.",
              codeSnippet: {
                lang: "java",
                code: `public abstract class Animal {
    protected String name;
    public Animal(String name) { this.name = name; }
    public abstract void speak();
}

public class Dog extends Animal {
    public Dog(String name) { super(name); }
    @Override
    public void speak() { System.out.println(name + " sủa: Gâu gâu!"); }
}`,
                caption: "Ví dụ: Kế thừa lớp trừu tượng và nạp chồng phương thức speak()",
              },
            },
            {
              heading: "2. Cơ chế Đa hình Động (Runtime Polymorphism)",
              content: "Đa hình cho phép một biến tham chiếu kiểu lớp cha (Animal) có thể trỏ tới bất kỳ đối tượng lớp con nào (Dog, Cat). Tại thời điểm chạy (Runtime), máy ảo Java (JVM) sẽ tự động tra bảng con trỏ ảo (vtable) để gọi đúng cài đặt của lớp con thực tế.",
              codeSnippet: {
                lang: "java",
                code: `Animal pet = new Dog("Milo");
pet.speak(); // Output: "Milo sủa: Gâu gâu!" - Dispatch đến Dog.speak() tại runtime`,
                caption: "Dynamic Method Dispatch giúp loại bỏ hoàn toàn các cấu trúc if/else kiểm tra kiểu rườm rà.",
              },
            },
          ],
          antiPattern: {
            badTitle: "Lạm dụng if (instanceof) thay cho Đa hình",
            badDesc: "Viết chuỗi if (pet instanceof Dog) ... else if (pet instanceof Cat) phá vỡ tính đóng gói và vi phạm nguyên lý OCP: mỗi khi thêm loài vật mới phải mở code cũ ra sửa.",
            solution: "Ủy thác hành vi trực tiếp thông qua đa hình: gọi pet.speak(), để từng lớp con tự chịu trách nhiệm thực thi.",
          },
          socraticReflection: "Nếu một lớp con kế thừa lớp cha nhưng lại vô hiệu hóa hơn 50% phương thức của lớp cha (ví dụ ném UnsupportedOperationException), thiết kế đó đang vi phạm nguyên lý SOLID nào?",
        },
        summary: [
          ["is-a Principle", "Chỉ kế thừa khi đối tượng con thực sự là một dạng chuyên biệt của đối tượng cha."],
          ["super()", "Gọi hàm khởi tạo của lớp cha, bắt buộc phải nằm ở dòng đầu tiên của constructor con."],
          ["vtable Dispatch", "Máy ảo quyết định phiên bản method nào được chạy dựa trên kiểu thực tế của đối tượng tại Runtime."],
        ],
        resources: [
          ["Oracle Java SE Docs", "Đặc tả chuẩn của ngôn ngữ Java về Lớp trừu tượng và Interface.", "https://docs.oracle.com/javase/tutorial/java/IandI/"],
          ["Effective Java - Joshua Bloch", "Item 18: Ưu tiên Composition hơn Kế thừa (Favor composition over inheritance).", "https://www.oreilly.com/library/view/effective-java/9780134686097/"],
          ["Refactoring Guru", "Mô hình chiến lược và kỹ thuật thay thế Type Code bằng Đa hình.", "https://refactoring.guru/replace-conditional-with-polymorphism"],
        ],
      },
      {
        id: "1.2",
        title: "Ràng buộc Bộ nhớ Bounded Queue (PageTracker)",
        topic: "Data Structure & Circular Buffer",
        status: "active",
        objective: "Hiện thực hóa cấu trúc hàng đợi giới hạn dung lượng Bounded Deque đạt độ phức tạp thời gian O(1) và ngăn tràn bộ nhớ (Memory Leak).",
        durationMins: 20,
        xpReward: 90,
        full: {
          lead: "Trong các hệ thống sản phẩm (Production), tài nguyên bộ nhớ luôn hữu hạn. Một module ghi vết duyệt trang (Page Tracker) nếu lưu trữ vô hạn sẽ gây lỗi OutOfMemoryError. Cấu trúc Bounded Queue là giải pháp tiêu chuẩn công nghiệp.",
          sections: [
            {
              heading: "1. Giới hạn dung lượng cứng (Max Capacity Constraint)",
              content: "Khi hàng đợi đạt đến giới hạn maxlen (ví dụ 3 trang gần nhất), mỗi khi có phần tử mới nạp vào đuôi (enqueue), phần tử cũ nhất ở đầu (head) phải lập tức bị loại bỏ (eviction) theo nguyên tắc FIFO trong thời gian O(1).",
              codeSnippet: {
                lang: "python",
                code: `from collections import deque

class PageTracker:
    def __init__(self, maxlen: int = 3):
        self.history = deque(maxlen=maxlen)

    def visit(self, page: str):
        if not page or not page.strip():
            return # Bỏ qua trang rỗng (Guard Clause)
        self.history.append(page)

    def get_recent(self):
        return list(self.history)`,
                caption: "Triển khai PageTracker chuẩn công nghiệp với collections.deque của Python",
              },
            },
            {
              heading: "2. Độ phức tạp thời gian và không gian",
              content: "Nếu sử dụng mảng động thông thường (ArrayList hay Python list), thao tác xóa phần tử đầu tiên pop(0) mất chi phí O(N) do phải dịch chuyển toàn bộ mảng. Việc sử dụng Double-Ended Queue (Deque) hoặc Ring Buffer đảm bảo cả thao tác append và evict đều đạt chuẩn O(1).",
            },
          ],
          antiPattern: {
            badTitle: "Dùng List thường và gọi list.pop(0)",
            badDesc: "Khi danh sách lịch sử lên tới 100,000 bản ghi, thao tác pop(0) tốn O(N) chu kỳ CPU, gây nghẽn luồng xử lý và tụt FPS của ứng dụng.",
            solution: "Sử dụng collections.deque (Python) hoặc ArrayDeque (Java) để đạt hiệu năng O(1) hằng số tuyệt đối.",
          },
          socraticReflection: "Tại sao trong cấu trúc dữ liệu, Circular Array Buffer lại được các hệ điều hành và message broker (như Kafka) ưa chuộng hơn cấu trúc danh sách liên kết kép (Doubly Linked List)?",
        },
        summary: [
          ["Max Capacity", "Ràng buộc chặn đứng nguy cơ rò rỉ bộ nhớ (Memory Leak) trong các ứng dụng chạy dài hạn."],
          ["FIFO Eviction", "Phần tử cũ nhất bị đào thải tự động khi hàng đợi đầy."],
          ["O(1) Guarantee", "Cả thao tác nạp và hủy phần tử đều hoàn thành trong thời gian hằng số O(1)."],
        ],
        resources: [
          ["Python Documentation", "Mô tả chi tiết cấu trúc collections.deque và thread-safety.", "https://docs.python.org/3/library/collections.html#collections.deque"],
          ["Java SE 21 Docs", "Giao diện java.util.Deque và lớp cài đặt java.util.ArrayDeque.", "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html"],
        ],
      },
      {
        id: "1.3",
        title: "Guard Clause & Xử lý Ca kiểm thử biên (Edge Cases)",
        topic: "Defensive Programming & Unit Testing",
        status: "locked",
        objective: "Áp dụng kỹ thuật Defensive Programming để bắt sớm dữ liệu nhiễm bẩn (chuỗi rỗng, None, null) trước khi đưa vào cấu trúc dữ liệu.",
        durationMins: 25,
        xpReward: 120,
        full: {
          lead: "Hơn 80% sự cố phần mềm trong thực tế phát sinh không phải ở luồng chính (Happy Path), mà xuất phát từ việc thiếu xử lý ca kiểm thử biên (Edge Cases / Corner Cases) như chuỗi rỗng, khoảng trắng, hoặc ký tự đặc biệt.",
          sections: [
            {
              heading: "1. Nguyên lý Guard Clause (Thoát sớm - Early Exit)",
              content: "Thay vì lồng ghép nhiều tầng if/else sâu hun hút (Arrow Anti-Pattern), Guard Clause đặt các điều kiện kiểm tra tính hợp lệ của tham số ngay đầu hàm. Nếu tham số không hợp lệ, hàm sẽ return hoặc throw exception ngay lập tức.",
              codeSnippet: {
                lang: "python",
                code: `# CHƯA TỐI ƯU: Lồng if sâu
def visit_bad(self, page):
    if page is not None:
        if len(page.strip()) > 0:
            self.history.append(page)

# CHUẨN CÔNG NGHIỆP: Guard Clause thoát sớm
def visit_clean(self, page: str):
    if not page or not page.strip():
        return # Thoát sớm, bảo vệ tính toàn vẹn của lịch sử
    self.history.append(page)`,
                caption: "So sánh mã nguồn lồng tầng phức tạp và Guard Clause thanh thoát",
              },
            },
          ],
          antiPattern: {
            badTitle: "Tin tưởng dữ liệu đầu vào (Blind Trust)",
            badDesc: "Cho rằng người dùng hoặc module gọi hàm sẽ luôn truyền chuỗi hợp lệ, dẫn đến việc hàng đợi lưu các phần tử rác như \"\", \"   \", None.",
            solution: "Áp dụng phương châm 'Never trust client input' - luôn thẩm định và chuẩn hóa dữ liệu tại ranh giới hàm.",
          },
          socraticReflection: "Khi một hàm nhận dữ liệu không hợp lệ, khi nào ta nên âm thầm bỏ qua (silent ignore/return) và khi nào ta bắt buộc phải ném lỗi (throw Exception)?",
        },
        summary: [
          ["Guard Clause", "Đặt điều kiện kiểm tra biên ở đầu hàm để thoát sớm, giữ code phẳng (Flat code)."],
          ["Edge Case Defense", "Kiểm thử các giá trị đặc biệt: chuỗi rỗng '', khoảng trắng '   ', giá trị null/None."],
          ["Data Purity", "Bảo vệ cấu trúc dữ liệu không bị nhiễm bẩn bởi dữ liệu rác."],
        ],
        resources: [
          ["Refactoring Guru", "Kỹ thuật Replace Nested Conditional with Guard Clauses.", "https://refactoring.guru/replace-nested-conditional-with-guard-clauses"],
          ["Clean Code - Robert C. Martin", "Chương 3: Functions - Giữ hàm ngắn gọn và chỉ làm một việc duy nhất.", "https://www.oreilly.com/library/view/clean-code-a/9780136083238/"],
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Kế thừa (Inheritance) trong lập trình hướng đối tượng nên được dùng khi nào?",
        options: [
          { id: "a", text: "Khi hai lớp có quan hệ 'is-a' (lớp con là một phiên bản chuyên biệt của lớp cha)" },
          { id: "b", text: "Bất cứ khi nào muốn dùng chung một biến số toàn cục giữa 2 lớp" },
          { id: "c", text: "Khi lớp con chỉ cần sao chép 1 phương thức đơn lẻ mà không liên quan về ngữ nghĩa" },
          { id: "d", text: "Để thay thế hoàn toàn cơ chế Interface" },
        ],
        correct: "a",
        explanation: "Nguyên lý kế thừa yêu cầu quan hệ 'is-a'. Nếu chỉ là quan hệ lắp ghép 'has-a', việc dùng Composition sẽ mang lại tính độc lập và khả năng bảo trì tốt hơn nhiều.",
      },
      {
        q: "Cấu trúc dữ liệu nào tối ưu nhất cho bài toán Giữ lại K phần tử gần nhất (PageTracker) với độ phức tạp O(1)?",
        options: [
          { id: "a", text: "Mảng động ArrayList / Python list với thao tác pop(0)" },
          { id: "b", text: "Hàng đợi hai đầu Deque (Double-Ended Queue) hoặc Circular Buffer" },
          { id: "c", text: "Cây nhị phân tìm kiếm Binary Search Tree" },
          { id: "d", text: "Bảng băm HashMap thông thường" },
        ],
        correct: "b",
        explanation: "Deque hoặc Ring Buffer cho phép thao tác nạp đuôi (enqueue) và loại bỏ đầu (evict) đều đạt thời gian O(1) hằng số, không phải dịch chuyển toàn mảng như list.pop(0).",
      },
      {
        q: "Guard Clause đem lại lợi ích kỹ thuật lớn nhất là gì?",
        options: [
          { id: "a", text: "Tăng dung lượng RAM khả dụng của máy chủ" },
          { id: "b", text: "Kiểm tra và thoát sớm ở đầu hàm, loại bỏ cấu trúc if/else lồng nhau phức tạp" },
          { id: "c", text: "Tự động biên dịch mã nguồn thành bytecode" },
          { id: "d", text: "Cho phép đa luồng thực thi song song" },
        ],
        correct: "b",
        explanation: "Guard Clause giúp mã nguồn có độ sâu lồng ghép bằng 1 (Flat code), giảm thiểu Cyclomatic Complexity và giúp lập trình viên đọc hiểu luồng xử lý rất nhanh.",
      },
    ],
  },
  {
    id: "web",
    name: "Phát triển Ứng dụng Web & RESTful API",
    code: "CS304",
    semester: "Học kỳ 4",
    category: "Web & API Studio",
    iconName: "Globe",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-200 dark:border-emerald-800",
    practiceMode: "web",
    practiceTabLabel: "Web Live Preview & API",
    lessons: [
      {
        id: "2.1",
        title: "Kiến trúc Component UI & Virtual DOM Tương tác",
        topic: "Component State & Reactive UI",
        status: "active",
        objective: "Hiểu sâu chu kỳ vòng đời của Component giao diện, quản lý State phản ứng và cơ chế DOM Reconciliation.",
        durationMins: 20,
        xpReward: 85,
        full: {
          lead: "Lập trình web hiện đại đã dịch chuyển từ thao tác DOM thủ công (như jQuery) sang mô hình Component hướng trạng thái (Reactive Component-based Architecture). UI được xem là một hàm thuần túy của State: UI = f(State).",
          sections: [
            {
              heading: "1. Nguyên lý phân rã Component độc lập",
              content: "Mỗi thành phần trên trang web (Card sản phẩm, Giỏ hàng, Hộp thoại xác nhận) được đóng gói trọn vẹn cả cấu trúc (HTML), phong cách hiển thị (CSS/Tailwind) và hành vi tương tác (JavaScript logic). Điều này giúp tái sử dụng mã nguồn trên toàn bộ dự án.",
              codeSnippet: {
                lang: "javascript",
                code: `// Giỏ hàng tương tác Mini Cart Component
function CartBadge({ count = 0 }) {
  const isHigh = count >= 5;
  return (
    <div className="relative inline-flex items-center p-2 rounded-xl bg-slate-100">
      <span className="text-sm font-semibold text-slate-800">Giỏ hàng</span>
      {count > 0 && (
        <span className={\`ml-2 px-2 py-0.5 text-xs font-bold rounded-full text-white \${
          isHigh ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'
        }\`}>
          {count}
        </span>
      )}
    </div>
  );
}`,
                caption: "Component phản ứng theo giá trị của biến count một cách khai báo (declarative)",
              },
            },
            {
              heading: "2. Virtual DOM và cơ chế Diffing",
              content: "Thao tác trên DOM thật của trình duyệt cực kỳ tốn chi phí render (Layout Reflow & Repaint). React hoặc Vue giữ một bản sao cây DOM ảo trên bộ nhớ RAM. Khi State thay đổi, thuật toán Diffing O(N) tìm ra sự khác biệt tối thiểu để cập nhật lên màn hình.",
            },
          ],
          antiPattern: {
            badTitle: "Trực tiếp dùng document.getElementById() để đổi màu",
            badDesc: "Trong các framework hiện đại, việc dùng document.querySelector() để đổi style sẽ làm mất đồng bộ giữa State bên trong JavaScript và DOM thực tế.",
            solution: "Điều khiển giao diện 100% thông qua State hoặc Props, để framework tự động đồng bộ hóa giao diện.",
          },
          socraticReflection: "Tại sao trong danh sách các phần tử (List Rendering), thuộc tính 'key' lại bắt buộc phải là một giá trị duy nhất (ID) chứ không nên dùng chỉ số index mảng (0, 1, 2...)?",
        },
        summary: [
          ["UI = f(State)", "Giao diện người dùng là sự phản ánh trực tiếp trạng thái dữ liệu tại thời điểm đó."],
          ["Component Isolation", "Đóng gói logic, style và template trong từng khối độc lập."],
          ["Virtual DOM Diffing", "Tối ưu hóa số lần cập nhật DOM thực để duy trì tốc độ 60fps."],
        ],
        resources: [
          ["React Official Documentation", "Tài liệu chính thức về State and Lifecycle & Thinking in React.", "https://react.dev/learn/thinking-in-react"],
          ["MDN Web Docs", "Giới thiệu toàn diện về Web Components và Custom Elements.", "https://developer.mozilla.org/en-US/docs/Web/API/Web_components"],
        ],
      },
      {
        id: "2.2",
        title: "Thiết kế RESTful API Chuẩn RFC & Xử lý Async/Await",
        topic: "REST Constraints & Idempotency",
        status: "locked",
        objective: "Thiết kế chuẩn hóa các endpoint RESTful API, định nghĩa mã trạng thái HTTP (Status Codes) và tính toán Idempotency.",
        durationMins: 25,
        xpReward: 95,
        full: {
          lead: "Giao thức RESTful API là cầu nối giao tiếp tiêu chuẩn giữa Frontend và Backend. Thiết kế một API tốt đòi hỏi tính nhất quán về danh từ (Resource Naming), phương thức HTTP (GET, POST, PUT, DELETE) và tính khả lặp (Idempotent).",
          sections: [
            {
              heading: "1. Quy chuẩn đặt tên tài nguyên và HTTP Verbs",
              content: "Endpoint phải sử dụng danh từ số nhiều đại diện cho tài nguyên (/api/v1/tasks, /api/v1/projects), không sử dụng động từ trong URL (/api/v1/getTasks là sai chuẩn REST). Hành động được xác định bằng phương thức HTTP.",
              codeSnippet: {
                lang: "http",
                code: `GET    /api/v1/tasks          -> Lấy danh sách nhiệm vụ (Safe & Idempotent)
POST   /api/v1/tasks          -> Tạo nhiệm vụ mới (Non-idempotent)
GET    /api/v1/tasks/:id      -> Chi tiết 1 nhiệm vụ
PUT    /api/v1/tasks/:id      -> Cập nhật toàn bộ nhiệm vụ (Idempotent)
PATCH  /api/v1/tasks/:id      -> Cập nhật một phần (ví dụ đổi cột)
DELETE /api/v1/tasks/:id      -> Xóa nhiệm vụ (Idempotent)`,
                caption: "Ma trận phương thức HTTP chuẩn RESTful",
              },
            },
            {
              heading: "2. Xử lý bất đồng bộ và Network Resilience",
              content: "Các cuộc gọi API qua mạng internet luôn có độ trễ hoặc rủi ro mất kết nối. Ứng dụng phải hiển thị trạng thái đang tải (Loading Skeleton), trạng thái rỗng (Empty State) và xử lý lỗi (Graceful Error Handling) thay vì để ứng dụng bị đơ.",
            },
          ],
          antiPattern: {
            badTitle: "Dùng phương thức GET để xóa dữ liệu",
            badDesc: "Gọi GET /api/v1/task/delete?id=123 có thể khiến các công cụ thu thập web (Web Crawlers) vô tình kích hoạt xóa hàng loạt dữ liệu của người dùng.",
            solution: "Bắt buộc dùng phương thức DELETE hoặc POST có xác thực token CSRF cho các thao tác gây biến đổi dữ liệu.",
          },
          socraticReflection: "Điểm khác biệt cốt lõi giữa phương thức PUT (Replace) và PATCH (Modify) là gì, và tại sao phương thức PUT được coi là Idempotent còn POST thì không?",
        },
        summary: [
          ["Resource-Oriented", "URL chỉ chứa danh từ số nhiều đại diện cho thực thể."],
          ["HTTP Status Codes", "Sử dụng đúng mã: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found."],
          ["Idempotency", "Thực hiện 1 lần hay 100 lần đều cho cùng một trạng thái hệ thống."],
        ],
        resources: [
          ["RFC 7231 - HTTP/1.1 Semantics", "Quy chuẩn Internet về phương thức HTTP và mã trạng thái.", "https://datatracker.ietf.org/doc/html/rfc7231"],
          ["Google Cloud API Design Guide", "Hướng dẫn thiết kế REST và gRPC chuẩn quốc tế từ Google.", "https://cloud.google.com/apis/design"],
        ],
      },
      {
        id: "2.3",
        title: "Bảo mật Web Cơ bản: Chống XSS & CSRF Token Guard",
        topic: "Web Security & OWASP Top 10",
        status: "locked",
        objective: "Nhận diện lỗ hổng Cross-Site Scripting (XSS), hiểu cơ chế SameSite Cookie và cách thiết lập phòng chống CSRF.",
        durationMins: 30,
        xpReward: 110,
        full: {
          lead: "Bảo mật là tiêu chí sống còn của mọi kỹ sư phần mềm. Theo thống kê OWASP, lỗ hổng Injection và XSS vẫn là nguyên nhân hàng đầu khiến hàng triệu tài khoản người dùng bị đánh cắp cookie phiên đăng nhập.",
          sections: [
            {
              heading: "1. Hiểm họa XSS (Cross-Site Scripting)",
              content: "Kẻ tấn công chèn mã script độc hại vào phần bình luận hoặc tên bài viết. Khi người dùng khác xem trang, trình duyệt thực thi đoạn mã độc này và gửi document.cookie về máy chủ của tin tặc.",
            },
            {
              heading: "2. Phòng thủ đa lớp (Defense in Depth)",
              content: "Luôn mã hóa đầu ra (HTML entity encoding), sử dụng cờ HttpOnly cho cookie xác thực JWT (ngăn JavaScript truy cập cookie), và cấu hình Content Security Policy (CSP).",
            },
          ],
          antiPattern: {
            badTitle: "Dùng dangerouslySetInnerHTML mà không lọc mã (Sanitize)",
            badDesc: "Render trực tiếp chuỗi HTML do người dùng nhập vào giao diện sẽ lập tức mở toang cánh cửa cho mã độc JavaScript thực thi.",
            solution: "Sử dụng thư viện kiểm duyệt DOMPurify trước khi render bất kỳ chuỗi HTML tùy biến nào.",
          },
          socraticReflection: "Nếu hệ thống của bạn đã lưu JWT Token trong HttpOnly Cookie, làm cách nào tin tặc vẫn có thể thực hiện tấn công CSRF (Cross-Site Request Forgery) nếu bạn không có CSRF Token?",
        },
        summary: [
          ["XSS Defense", "Mã hóa ký tự đặc biệt < > & \" ' trước khi đưa lên màn hình."],
          ["HttpOnly Flag", "Khóa cookie khỏi sự nhòm ngó của document.cookie trong JavaScript."],
          ["SameSite=Strict", "Ngăn chặn trình duyệt tự động gửi cookie khi có yêu cầu xuất phát từ trang web khác."],
        ],
        resources: [
          ["OWASP Top 10 Web Application Security Risks", "Bảng xếp hạng 10 lỗ hổng bảo mật web nguy hiểm nhất thế giới.", "https://owasp.org/www-project-top-ten/"],
          ["Mozilla Web Security Guidelines", "Tài liệu hướng dẫn triển khai header bảo mật từ Mozilla.", "https://infosec.mozilla.org/guidelines/web_security"],
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Phương thức HTTP nào theo chuẩn RESTful được cam kết có tính chất Idempotent (khả lặp)?",
        options: [
          { id: "a", text: "POST" },
          { id: "b", text: "PUT và DELETE" },
          { id: "c", text: "Chỉ duy nhất PATCH" },
          { id: "d", text: "Không phương thức nào có tính khả lặp" },
        ],
        correct: "b",
        explanation: "PUT (thay thế toàn bộ) và DELETE (xóa tài nguyên) là Idempotent vì việc gọi nhiều lần liên tiếp không làm thay đổi trạng thái cuối cùng của tài nguyên so với lần gọi đầu tiên.",
      },
      {
        q: "Làm cách nào hiệu quả nhất để ngăn chặn kẻ tấn công đánh cắp phiên đăng nhập qua lỗ hổng XSS?",
        options: [
          { id: "a", text: "Lưu JWT Token trong LocalStorage của trình duyệt" },
          { id: "b", text: "Thiết lập cờ HttpOnly trên Cookie chứa Access Token" },
          { id: "c", text: "Tắt hoàn toàn giao thức HTTPS" },
          { id: "d", text: "Tăng thời gian sống của Token lên 30 ngày" },
        ],
        correct: "b",
        explanation: "Cờ HttpOnly chỉ thị cho trình duyệt rằng cookie này không được phép truy cập qua JavaScript (document.cookie), do đó mã độc XSS không thể đọc trộm được token.",
      },
    ],
  },
  {
    id: "system-design",
    name: "Phân tích Thiết kế Hệ thống & CSDL Quan hệ",
    code: "CS308",
    semester: "Học kỳ 5",
    category: "Diagram & Schema Studio",
    iconName: "Layers",
    badgeBg: "bg-purple-50 dark:bg-purple-950/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-200 dark:border-purple-800",
    practiceMode: "diagram",
    practiceTabLabel: "Diagram & Schema Studio",
    lessons: [
      {
        id: "3.1",
        title: "Chuẩn hóa Dữ liệu Quan hệ 3NF (Third Normal Form)",
        topic: "Database Normalization & Functional Dependency",
        status: "active",
        objective: "Nắm vững lý thuyết chuẩn hóa cơ sở dữ liệu: từ 1NF (nguyên tố), 2NF (loại phụ thuộc một phần) đến 3NF (loại phụ thuộc bắc cầu).",
        durationMins: 25,
        xpReward: 95,
        full: {
          lead: "Chuẩn hóa cơ sở dữ liệu là quy trình tổ chức dữ liệu nhằm giảm thiểu dư thừa dữ liệu (Data Redundancy) và loại bỏ các dị thường khi Thêm, Sửa, Xóa (Insert, Update, Delete Anomalies). Một CSDL đạt chuẩn 3NF là nền móng để hệ thống vận hành bền vững.",
          sections: [
            {
              heading: "1. Ba dạng chuẩn cốt lõi (1NF, 2NF, 3NF)",
              content: "1NF: Mọi thuộc tính phải chứa giá trị nguyên tử (không chứa mảng, không chứa danh sách lặp). 2NF: Đạt 1NF và mọi thuộc tính không khóa phải phụ thuộc hàm đầy đủ vào toàn bộ khóa chính. 3NF: Đạt 2NF và không có phụ thuộc bắc cầu giữa các thuộc tính không khóa.",
              codeSnippet: {
                lang: "sql",
                code: `-- VI PHẠM 3NF: department_name phụ thuộc bắc cầu vào department_id
CREATE TABLE employees_bad (
    emp_id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100) -- DƯ THỪA!
);

-- CHUẨN HÓA 3NF: Tách bảng riêng biệt
CREATE TABLE departments (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
    emp_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dept_id INT REFERENCES departments(dept_id)
);`,
                caption: "Tách bảng để loại bỏ phụ thuộc bắc cầu emp_id -> dept_id -> dept_name",
              },
            },
          ],
          antiPattern: {
            badTitle: "Lưu trữ thông tin dư thừa có thể suy diễn",
            badDesc: "Lưu cả số lượng, đơn giá và tổng tiền trong bảng OrderDetails. Khi đơn giá thay đổi, tổng tiền bị lệch nếu quên cập nhật.",
            solution: "Chỉ lưu số lượng và đơn giá tại thời điểm mua; tổng tiền được tính toán động (Computed Column) hoặc tính qua câu truy vấn SQL.",
          },
          socraticReflection: "Trong các hệ thống phân tích dữ liệu lớn (Data Warehouse / OLAP), tại sao các kỹ sư dữ liệu lại chủ động khử chuẩn hóa (Denormalization - thiết kế Star Schema) thay vì duy trì 3NF?",
        },
        summary: [
          ["1NF (Atomic)", "Mỗi ô chỉ chứa một giá trị duy nhất, không chứa danh sách mảng."],
          ["2NF (Full Dependency)", "Không có thuộc tính phụ thuộc vào một phần của khóa chính ghép."],
          ["3NF (No Transitive)", "Không có thuộc tính không khóa nào phụ thuộc vào một thuộc tính không khóa khác."],
        ],
        resources: [
          ["Database System Concepts - Silberschatz, Korth", "Chương 7: Thiết kế cơ sở dữ liệu quan hệ và lý thuyết phụ thuộc hàm.", "https://www.db-book.com/"],
          ["PostgreSQL Documentation", "Ràng buộc dữ liệu (Constraints) và khóa ngoại (Foreign Keys).", "https://www.postgresql.org/docs/current/ddl-constraints.html"],
        ],
      },
      {
        id: "3.2",
        title: "Mô hình hóa ERD 8 Bảng & Ràng buộc Khóa ngoại FK",
        topic: "Entity-Relationship Modeling & Cardinality",
        status: "locked",
        objective: "Thiết kế thực thể liên kết cho hệ thống CodeMind Campus: quản lý User, Project, Sprint, Task, Commit, PullRequest, Review, DoD.",
        durationMins: 30,
        xpReward: 110,
        full: {
          lead: "Mô hình thực thể liên kết (ERD) là bản thiết kế kiến trúc tầng dữ liệu. Việc xác định đúng bản số (Cardinality: 1-1, 1-N, N-N) và các ràng buộc toàn vẹn tham chiếu (Referential Integrity) quyết định sự ổn định của toàn bộ dự án đồ án tốt nghiệp.",
          sections: [
            {
              heading: "1. Cấu trúc 8 thực thể trọng tâm",
              content: "Dự án bao gồm: Users (sinh viên/giảng viên), Projects (đồ án), Sprints (giai đoạn 2 tuần), Tasks (nhiệm vụ Kanban), Commits (lịch sử git), PullRequests (yêu cầu hợp nhất), CodeReviews (nhận xét AI/người), và DefinitionOfDone (tiêu chuẩn nghiệm thu).",
            },
          ],
          antiPattern: {
            badTitle: "Bỏ qua ràng buộc khóa ngoại (Foreign Key) trên CSDL",
            badDesc: "Chỉ kiểm tra quan hệ bằng code ứng dụng mà không tạo khóa ngoại trên Postgres/MySQL, dẫn đến hiện tượng 'dữ liệu mồ côi' (Orphan records) khi xóa dữ liệu cha.",
            solution: "Thiết lập ràng buộc FOREIGN KEY có chính sách ON DELETE CASCADE hoặc ON DELETE RESTRICT rõ ràng.",
          },
          socraticReflection: "Khi nào ta nên chọn ON DELETE CASCADE và khi nào bắt buộc phải dùng ON DELETE RESTRICT để tránh nguy cơ mất mát dữ liệu kế toán hoặc lịch sử điểm số của sinh viên?",
        },
        summary: [
          ["Cardinality 1-N", "1 Dự án có nhiều Sprint; 1 Sprint có nhiều Task."],
          ["Junction Table (N-N)", "Quan hệ nhiều-nhiều bắt buộc phải phân tách qua bảng trung gian."],
          ["Referential Integrity", "Khóa ngoại đảm bảo không bao giờ có một Task trỏ đến một Sprint không tồn tại."],
        ],
        resources: [
          ["Lucidchart ERD Guide", "Cẩm nang toàn diện về ký hiệu chân quạ (Crow's Foot Notation) trong ERD.", "https://www.lucidchart.com/pages/er-diagrams"],
        ],
      },
      {
        id: "3.3",
        title: "Biểu đồ Trình tự Sequence Diagram & Luồng Gọi Service",
        topic: "UML Behavioral Modeling & API Contract",
        status: "locked",
        objective: "Mô hình hóa luồng tương tác thời gian thực giữa Browser, API Gateway, Auth Service và Docker Sandbox.",
        durationMins: 25,
        xpReward: 100,
        full: {
          lead: "Nếu ERD mô tả trạng thái tĩnh của dữ liệu, thì Sequence Diagram mô tả hành vi động của hệ thống theo trục thời gian. Đây là tài liệu bắt buộc khi bảo vệ trước Hội đồng tốt nghiệp để chứng minh hiểu rõ luồng đi của dữ liệu.",
          sections: [
            {
              heading: "1. Vòng đời một yêu cầu nộp bài (Submission Lifecycle)",
              content: "Sinh viên bấm 'Nộp bài' -> Frontend gửi request kèm JWT -> Gateway kiểm tra quyền RBAC -> Dispatcher đưa code vào Docker Sandbox cô lập -> Bộ chấm thu thập Exit code & Output -> Trả về kết quả và lưu Audit Hash.",
            },
          ],
          antiPattern: {
            badTitle: "Vẽ Sequence Diagram không có trục thời gian tuyến tính",
            badDesc: "Vẽ các mũi tên lộn xộn từ phải sang trái hoặc nhảy cóc thời gian khiến người đọc không thể theo dõi thứ tự các bước thực thi.",
            solution: "Tuân thủ chặt chẽ trục thời gian từ trên xuống dưới, đánh số thứ tự các bước (1, 1.1, 2, 2.1).",
          },
          socraticReflection: "Trong kiến trúc Microservices, làm sao để một Sequence Diagram mô tả được các sự kiện bất đồng bộ (Asynchronous Event-driven qua Kafka/RabbitMQ) thay vì chỉ gọi HTTP đồng bộ?",
        },
        summary: [
          ["Lifeline", "Đường thẳng đứng biểu thị sự tồn tại của đối tượng theo thời gian."],
          ["Activation Box", "Hộp chữ nhật trên lifeline biểu thị khoảng thời gian đối tượng đang thực thi tác vụ."],
          ["Sync vs Async Messages", "Mũi tên nét liền có đầu tam giác (đồng bộ) vs mũi tên mở (bất đồng bộ)."],
        ],
        resources: [
          ["UML Distilled - Martin Fowler", "Cuốn sách kinh điển ngắn gọn nhất về các loại biểu đồ UML thực chiến.", "https://martinfowler.com/books/uml.html"],
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Một bảng cơ sở dữ liệu thỏa mãn dạng chuẩn 3NF (Third Normal Form) khi nào?",
        options: [
          { id: "a", text: "Chỉ cần bảng đó có khóa chính duy nhất" },
          { id: "b", text: "Đã đạt 2NF và không tồn tại phụ thuộc bắc cầu giữa các thuộc tính không khóa" },
          { id: "c", text: "Bảng có nhiều hơn 3 cột dữ liệu" },
          { id: "d", text: "Toàn bộ dữ liệu được lưu dưới dạng JSONB" },
        ],
        correct: "b",
        explanation: "Chuẩn 3NF yêu cầu loại bỏ hoàn toàn các phụ thuộc bắc cầu (A -> B và B -> C với A là khóa chính). Mọi thuộc tính không khóa phải phụ thuộc trực tiếp vào khóa chính.",
      },
      {
        q: "Ràng buộc khóa ngoại (Foreign Key) đem lại giá trị kỹ thuật cốt lõi nào?",
        options: [
          { id: "a", text: "Tăng tốc độ mạng internet của máy chủ" },
          { id: "b", text: "Đảm bảo tính toàn vẹn tham chiếu, ngăn ngừa tình trạng dữ liệu con mồ côi khi khóa cha bị xóa" },
          { id: "c", text: "Tự động sao lưu dữ liệu sang đám mây" },
          { id: "d", text: "Mã hóa mật khẩu người dùng" },
        ],
        correct: "b",
        explanation: "Foreign Key ràng buộc dữ liệu tầng CSDL: không cho phép tạo bản ghi con trỏ đến bản ghi cha không tồn tại, và kiểm soát chính sách khi bản ghi cha bị xóa (RESTRICT/CASCADE).",
      },
    ],
  },
  {
    id: "scrum",
    name: "Quản trị Dự án Phần mềm theo Agile & Scrum",
    code: "CS401",
    semester: "Học kỳ 6",
    category: "Spec & Case Study Studio",
    iconName: "GitBranch",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    practiceMode: "spec",
    practiceTabLabel: "Spec & Case Study Studio",
    lessons: [
      {
        id: "4.1",
        title: "Kỹ nghệ Yêu cầu: Viết User Story Chuẩn INVEST",
        topic: "Requirements Engineering & INVEST Criteria",
        status: "active",
        objective: "Thực hành cấu trúc User Story (As a... I want... So that...) và thẩm định theo 6 tiêu chuẩn INVEST để tránh phạm vi mơ hồ (Scope Creep).",
        durationMins: 20,
        xpReward: 90,
        full: {
          lead: "User Story không phải là một tài liệu đặc tả dài dòng, mà là lời mời gọi thảo luận (Invitation to a conversation). Một User Story đạt chuẩn phải gói gọn giá trị nghiệp vụ từ góc nhìn người dùng thực tế và đáp ứng tiêu chuẩn kiểm thử.",
          sections: [
            {
              heading: "1. Cấu trúc chuẩn 3 thành phần",
              content: "As a [Vai trò người dùng] / I want [Mong muốn hoặc hành động cụ thể] / So that [Giá trị nghiệp vụ hoặc lợi ích mang lại]. Thiếu một trong 3 phần này sẽ khiến nhóm phát triển không hiểu 'tại sao chúng ta phải làm tính năng này?'.",
              codeSnippet: {
                lang: "markdown",
                code: `### USER STORY MẪU:
- **As a:** Sinh viên thực hiện đồ án tốt nghiệp
- **I want:** nhận gợi ý Socratic theo thang 3 nấc sư phạm khi gặp lỗi biên
- **So that:** tôi tự hiểu nguyên lý và tự sửa code thay vì bị AI mớm sẵn toàn bộ đáp án.

### TIÊU CHÍ NGHIỆM THU (Acceptance Criteria):
- [x] Given sinh viên có bài nộp thất bại ở Test Case 5
- [x] When sinh viên bấm 'Cần gợi ý'
- [x] Then hệ thống chỉ mở khóa Nấc 1 (Khái niệm), Nấc 2 và Nấc 3 vẫn ở trạng thái khóa.`,
                caption: "User Story chuẩn hóa gắn liền với tiêu chí nghiệm thu kiểm chứng được",
              },
            },
            {
              heading: "2. Thẩm định bộ tiêu chuẩn INVEST",
              content: "Independent (Độc lập), Negotiable (Có thể thương lượng), Valuable (Có giá trị), Estimable (Ước lượng được), Small (Vừa vặn trong 1 Sprint 2 tuần), Testable (Có thể kiểm thử được nghiệm thu rõ ràng).",
            },
          ],
          antiPattern: {
            badTitle: "User Story mang tính kỹ thuật thuần túy",
            badDesc: "Viết: 'Là lập trình viên, tôi muốn tạo bảng SQL' -> Đây là nhiệm vụ kỹ thuật (Technical Task), không phải User Story vì không đem lại giá trị trực tiếp cho người dùng.",
            solution: "Quy đổi về giá trị người dùng: 'Là người dùng, tôi muốn hồ sơ cá nhân được lưu trữ an toàn...'.",
          },
          socraticReflection: "Nếu một User Story quá lớn (Epic) không thể hoàn thành trong 1 Sprint, nhóm Scrum nên áp dụng chiến lược nào để chia nhỏ (Splitting User Stories) mà từng phần vẫn mang lại giá trị độc lập?",
        },
        summary: [
          ["Role - Want - Benefit", "Cấu trúc 3 vế bắt buộc để làm rõ động lực và giá trị của tính năng."],
          ["INVEST", "Bộ 6 nguyên tắc vàng đánh giá chất lượng của một User Story trong Backlog."],
          ["Acceptance Criteria", "Kịch bản Given-When-Then định nghĩa ranh giới hoàn thành không thể tranh cãi."],
        ],
        resources: [
          ["Scrum Guide 2020 - Ken Schwaber & Jeff Sutherland", "Hướng dẫn chính thức về khung làm việc Scrum và các quy tắc cốt lõi.", "https://scrumguides.org/"],
          ["User Stories Applied - Mike Cohn", "Sách kinh điển về nghệ thuật viết và ước lượng User Story cho phần mềm.", "https://www.mountaingoatsoftware.com/books/user-stories-applied"],
        ],
      },
      {
        id: "4.2",
        title: "Xác lập Tiêu chuẩn Hoàn thành (Definition of Done - DoD) 4 Lớp",
        topic: "Quality Assurance & DoD Governance",
        status: "locked",
        objective: "Xây dựng ma trận DoD 4 lớp ngăn chặn nợ kỹ thuật (Technical Debt) và đảm bảo chất lượng bàn giao.",
        durationMins: 25,
        xpReward: 100,
        full: {
          lead: "Trong Scrum, một công việc 'gần xong' (Almost Done) đồng nghĩa với 'chưa làm gì cả'. Definition of Done (DoD) là bản giao ước chất lượng chung của toàn bộ nhóm phát triển, đảm bảo không có mã lỗi nào được phép trôi vào nhánh chính.",
          sections: [
            {
              heading: "1. Bốn lớp tiêu chuẩn DoD công nghiệp",
              content: "Lớp 1 (Code Quality): Tuân thủ Linter, không có biến thừa. Lớp 2 (Automated Testing): 100% Unit test pass, bao phủ ca biên. Lớp 3 (Peer Review): Tối thiểu 1 thành viên review và approve PR. Lớp 4 (Deployment/Verification): Build CI/CD xanh và chạy mượt mà trên môi trường thử nghiệm.",
            },
          ],
          antiPattern: {
            badTitle: "Kéo task sang Done khi mới chỉ code xong trên máy cá nhân",
            badDesc: "Nói 'Code chạy ngon trên máy em mà!' nhưng khi gộp nhánh thì xung đột hoặc lỗi build trên máy bạn cùng nhóm.",
            solution: "Chỉ được phép chuyển sang cột Done khi đã thỏa mãn 100% các tiêu chí DoD đã cam kết.",
          },
          socraticReflection: "Tại sao việc hạ thấp tiêu chuẩn DoD vào những ngày cuối Sprint để kịp tiến độ (Cut corners) lại là cái bẫy nguy hiểm nhất dẫn đến thất bại của dự án?",
        },
        summary: [
          ["DoD is Non-negotiable", "Tiêu chuẩn hoàn thành là thỏa thuận chất lượng không thể nhân nhượng."],
          ["4-Tier Checklist", "Chất lượng mã -> Kiểm thử tự động -> Review đồng cấp -> Kiểm chứng thực tế."],
          ["Zero Debt", "Ngăn chặn nợ kỹ thuật tích tụ làm chậm tốc độ của các Sprint tương lai."],
        ],
        resources: [
          ["Agile Alliance - Definition of Done", "Định nghĩa và bài học thực tiễn về DoD trong các tổ chức công nghệ hàng đầu.", "https://www.agilealliance.org/glossary/definition-of-done/"],
        ],
      },
      {
        id: "4.3",
        title: "Thuật toán Đo lường Đóng góp Thực tế & Phòng ngừa Free-rider",
        topic: "Team Analytics & Fair Contribution",
        status: "locked",
        objective: "Triển khai công thức minh bạch hóa đóng góp: Story Points (50%) + Commit/PR Cadence (30%) + Tiêu chuẩn DoD (20%).",
        durationMins: 25,
        xpReward: 110,
        full: {
          lead: "Hiện tượng ỷ lại hoặc gánh team (Free-rider problem) là căn bệnh trầm kha trong các đồ án nhóm sinh viên. CodeMind Campus giải quyết triệt để vấn đề này bằng thuật toán đo lường nhịp độ đóng góp minh bạch dựa trên dữ liệu thật từ Git và Kanban.",
          sections: [
            {
              heading: "1. Công thức tính điểm đóng góp công bằng",
              content: "Điểm số không chỉ dựa trên số dòng code (vì có thể copy-paste hàng loạt file rác), mà phải đối soát chéo 3 chiều: Số điểm Story Points của các task đã hoàn thành có kiểm chứng DoD (50%), Nhịp độ commit đều đặn theo thời gian tự nhiên (30%), và Tỷ lệ tham gia review code cho đồng đội (20%).",
            },
          ],
          antiPattern: {
            badTitle: "Đo lường năng suất chỉ bằng số dòng code (LOC)",
            badDesc: "Khuyến khích sinh viên viết code dài dòng, copy nguyên thư viện vào repo hoặc sinh file rác để tăng số lượng dòng đóng góp ảo.",
            solution: "Phân tích biến thiên thời gian ngắt quãng (Cadence Variance) và kiểm định chữ ký băm commit liên kết mã task Kanban.",
          },
          socraticReflection: "Làm thế nào để phân biệt một lập trình viên xuất sắc viết 10 dòng code giải quyết triệt để một bug phức tạp với một người nạp 1,000 dòng code thừa thãi?",
        },
        summary: [
          ["Multi-metric Matrix", "Đánh giá đa chiều: Story Points + Git Cadence + Peer Reviews."],
          ["Anti-Free-rider", "Minh bạch hóa dữ liệu giúp loại trừ tình trạng đùn đẩy trách nhiệm."],
          ["Academic Integrity", "Bảo vệ sinh viên làm thật, tạo cơ sở cho Giảng viên cho điểm công tâm."],
        ],
        resources: [
          ["IEEE Software - Measuring Developer Productivity", "Nghiên cứu về các chỉ số đo lường hiệu suất kỹ sư phần mềm hiện đại.", "https://www.computer.org/csdl/magazine/so"],
        ],
      },
    ],
    quizQuestions: [
      {
        q: "Trong tiêu chuẩn INVEST cho User Story, chữ cái 'T' đại diện cho thuộc tính gì?",
        options: [
          { id: "a", text: "Technical (Mang tính kỹ thuật cao)" },
          { id: "b", text: "Testable (Có thể kiểm thử và nghiệm thu rõ ràng)" },
          { id: "c", text: "Timely (Phải làm ngay lập tức)" },
          { id: "d", text: "Traceable (Có thể truy vết IP)" },
        ],
        correct: "b",
        explanation: "Testable nghĩa là User Story phải đi kèm các tiêu chí nghiệm thu (Acceptance Criteria) cụ thể, để cả Tester, Giảng viên và Lập trình viên đều có thể kiểm chứng được tính năng đã đạt hay chưa.",
      },
      {
        q: "Tại sao việc chỉ đo lường đóng góp của thành viên bằng số dòng code (LOC) là một sai lầm lớn?",
        options: [
          { id: "a", text: "Vì máy tính không đếm được số dòng code" },
          { id: "b", text: "Vì số dòng code dễ bị thao túng bằng cách sao chép file rác hoặc viết code rườm rà, không phản ánh tư duy tối ưu" },
          { id: "c", text: "Vì Git không lưu thông tin người commit" },
          { id: "d", text: "Vì Scrum cấm đo lường năng suất" },
        ],
        correct: "b",
        explanation: "Số dòng code không tương đương với giá trị nghiệp vụ. Một kỹ sư giỏi thường tái cấu trúc để làm ngắn gọn code mà vẫn giữ nguyên logic, do đó cần ma trận đa chiều (Story Points + DoD + Commit Cadence).",
      },
    ],
  },
];

// Dữ liệu Bài tập Thực hành từng Chương (Chapter Exercise & Code Studio)
// Hỗ trợ từng Chương của toàn bộ 16 Môn học CNTT Chuẩn Thời đại

export interface ChapterExerciseTestCase {
  id: number;
  title: string;
  input: string;
  expected: string;
}

export interface ChapterExerciseData {
  id: string; // e.g. "ex-oop-c1"
  chapterNumber: number;
  title: string;
  difficulty: "Dễ" | "Trung bình" | "Nâng cao";
  duration: string;
  xp: number;
  language: string; // "cpp" | "typescript" | "sql" | "python" | "dockerfile" | "dart"
  fileName: string;
  objective: string;
  problemStatement: string;
  requirements: string[];
  initialCode: string;
  solutionCode: string;
  testCases: ChapterExerciseTestCase[];
  hints: string[];
}

// Cung cấp bài tập chi tiết chuẩn xác cho từng môn và từng chương
export const CHAPTER_EXERCISES_MAP: Record<string, ChapterExerciseData> = {
  // ── CS201: OOP ─────────────────────────────────────────────────────────────
  "oop-1": {
    id: "ex-oop-1",
    chapterNumber: 1,
    title: "Hiện thực Đa hình Employee, Developer & Manager (Virtual Table)",
    difficulty: "Trung bình",
    duration: "25 phút",
    xp: 100,
    language: "cpp",
    fileName: "solution.cpp",
    objective: "Áp dụng cơ chế con trỏ lớp cơ sở và hàm ảo virtual để tính lương theo dynamic dispatch.",
    problemStatement:
      "Công ty EdTech CodeMind cần tính toán bảng lương hàng tháng cho 2 vị trí: Developer (Lương = Lương cơ bản + overtime * 25$) và Manager (Lương = Lương cơ bản + bonus). Hãy hiện thực lớp cha trừu tượng Employee và 2 lớp con Developer, Manager ghi đè phương thức virtual double calculateSalary().",
    requirements: [
      "Khai báo lớp Employee với phương thức virtual double calculateSalary() = 0 và virtual destructor.",
      "Lớp Developer kế thừa Employee, nhận (name, baseSalary, overtimeHours). Lương = baseSalary + overtimeHours * 25.",
      "Lớp Manager kế thừa Employee, nhận (name, baseSalary, bonus). Lương = baseSalary + bonus.",
      "Hàm evaluatePayroll(Employee* emp) in ra mức lương chính xác qua con trỏ lớp cha mà không bị object slicing.",
    ],
    initialCode: `#include <iostream>
#include <string>
#include <vector>

class Employee {
protected:
    std::string name;
    double baseSalary;
public:
    Employee(std::string n, double base) : name(n), baseSalary(base) {}
    // TODO: Khai báo virtual destructor và virtual calculateSalary()
    virtual ~Employee() {}
    virtual double calculateSalary() const = 0;
    std::string getName() const { return name; }
};

class Developer : public Employee {
private:
    int overtimeHours;
public:
    Developer(std::string n, double base, int ot) 
        : Employee(n, base), overtimeHours(ot) {}
    
    // TODO: Ghi đè phương thức calculateSalary()
    double calculateSalary() const override {
        // Viết mã của bạn tại đây
        return baseSalary + overtimeHours * 25.0;
    }
};

class Manager : public Employee {
private:
    double bonus;
public:
    Manager(std::string n, double base, double b)
        : Employee(n, base), bonus(b) {}

    // TODO: Ghi đè phương thức calculateSalary()
    double calculateSalary() const override {
        // Viết mã của bạn tại đây
        return baseSalary + bonus;
    }
};

int main() {
    Developer dev("Nguyen Van A", 1200.0, 10);
    Manager mgr("Tran Thi B", 2000.0, 500.0);

    std::cout << dev.getName() << ": " << dev.calculateSalary() << "$" << std::endl;
    std::cout << mgr.getName() << ": " << mgr.calculateSalary() << "$" << std::endl;
    return 0;
}`,
    solutionCode: `#include <iostream>
#include <string>

class Employee {
protected:
    std::string name;
    double baseSalary;
public:
    Employee(std::string n, double base) : name(n), baseSalary(base) {}
    virtual ~Employee() {}
    virtual double calculateSalary() const = 0;
    std::string getName() const { return name; }
};

class Developer : public Employee {
private:
    int overtimeHours;
public:
    Developer(std::string n, double base, int ot) 
        : Employee(n, base), overtimeHours(ot) {}
    double calculateSalary() const override {
        return baseSalary + overtimeHours * 25.0;
    }
};

class Manager : public Employee {
private:
    double bonus;
public:
    Manager(std::string n, double base, double b)
        : Employee(n, base), bonus(b) {}
    double calculateSalary() const override {
        return baseSalary + bonus;
    }
};`,
    testCases: [
      { id: 1, title: "Kiểm tra Developer làm thêm 10h", input: "Developer('An', 1200, 10)", expected: "1450.00$" },
      { id: 2, title: "Kiểm tra Manager nhận thưởng 500$", input: "Manager('Binh', 2000, 500)", expected: "2500.00$" },
      { id: 3, title: "Kiểm tra Tính Đa hình qua con trỏ Employee*", input: "vector<Employee*> emps", expected: "Dynamic Dispatch Passed" },
    ],
    hints: [
      "Luôn khai báo từ khóa override ở lớp con để compiler bắt lỗi gõ nhầm chữ ký hàm.",
      "Destructor của Employee phải có virtual để tránh memory leak khi delete con trỏ cha.",
    ],
  },

  "oop-2": {
    id: "ex-oop-2",
    chapterNumber: 2,
    title: "Thiết kế Hợp đồng Interface IPaymentProcessor & Momo / Stripe Adapter",
    difficulty: "Trung bình",
    duration: "30 phút",
    xp: 100,
    language: "cpp",
    fileName: "payment_adapter.cpp",
    objective: "Thiết kế pure abstract class interface để module thanh toán độc lập cổng thanh toán cụ thể.",
    problemStatement:
      "Hệ thống Campus cần chấp nhận thanh toán học phí qua Momo và Stripe mà không sửa đổi mã nguồn xử lý đơn hàng (Open/Closed Principle). Hãy hiện thực interface IPaymentProcessor và 2 adapter MomoPaymentAdapter, StripePaymentAdapter.",
    requirements: [
      "Định nghĩa interface IPaymentProcessor với các hàm: processPayment(double amount), getTransactionId(), isSuccessful().",
      "MomoPaymentAdapter nhận vào mã QR và token, định dạng kết quả 'MOMO-TXN-[timestamp]'.",
      "StripePaymentAdapter nhận vào creditCardToken, định dạng kết quả 'STRIPE-CH-[hash]'.",
    ],
    initialCode: `#include <iostream>
#include <string>

class IPaymentProcessor {
public:
    virtual ~IPaymentProcessor() {}
    virtual bool processPayment(double amount) = 0;
    virtual std::string getTransactionId() const = 0;
};

// TODO: Hiện thực MomoPaymentAdapter và StripePaymentAdapter
class MomoPaymentAdapter : public IPaymentProcessor {
private:
    std::string phoneNumber;
    std::string lastTxnId;
public:
    MomoPaymentAdapter(std::string phone) : phoneNumber(phone) {}
    bool processPayment(double amount) override {
        lastTxnId = "MOMO-" + phoneNumber + "-OK";
        return amount > 0;
    }
    std::string getTransactionId() const override { return lastTxnId; }
};`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Xử lý giao dịch Momo hợp lệ", input: "processPayment(150.0)", expected: "True - MOMO-090123-OK" },
      { id: 2, title: "Xử lý giao dịch Stripe hợp lệ", input: "processPayment(500.0)", expected: "True - STRIPE-CH-PASS" },
      { id: 3, title: "Từ chối giao dịch số tiền <= 0", input: "processPayment(-20.0)", expected: "False - Invalid Amount" },
    ],
    hints: [
      "Interface trong C++ được biểu diễn bằng lớp thuần ảo (mọi phương thức đều là pure virtual = 0).",
    ],
  },

  "oop-3": {
    id: "ex-oop-3",
    chapterNumber: 3,
    title: "Hiện thực Bounded Circular Queue & Guard Clauses Xử lý Tràn bộ nhớ",
    difficulty: "Nâng cao",
    duration: "35 phút",
    xp: 120,
    language: "cpp",
    fileName: "bounded_queue.cpp",
    objective: "Áp dụng Guard Clauses kiểm tra điều kiện biên để xây dựng hàng đợi vòng tròn an toàn.",
    problemStatement:
      "Hiện thực lớp BoundedQueue<T, Capacity> sử dụng mảng tĩnh tuần hoàn. Áp dụng Guard Clauses ném ngoại lệ hoặc trả về bool để không bao giờ xảy ra lỗi tràn bộ nhớ (Buffer Overflow).",
    requirements: [
      "enqueue(item): Guard clause if isFull() -> ném std::overflow_error hoặc trả về false.",
      "dequeue(): Guard clause if isEmpty() -> ném std::underflow_error.",
      "peek(): Trả về phần tử đầu hàng đợi với độ phức tạp O(1).",
    ],
    initialCode: `#include <iostream>
#include <vector>
#include <stdexcept>

template <typename T, size_t Capacity>
class BoundedQueue {
private:
    T data[Capacity];
    size_t head = 0;
    size_t tail = 0;
    size_t count = 0;
public:
    bool isFull() const { return count == Capacity; }
    bool isEmpty() const { return count == 0; }
    size_t size() const { return count; }

    bool enqueue(const T& item) {
        // Guard clause: Nếu đầy thì từ chối ngay lập tức
        if (isFull()) return false;
        
        data[tail] = item;
        tail = (tail + 1) % Capacity;
        count++;
        return true;
    }

    T dequeue() {
        // Guard clause: Nếu rỗng thì ném lỗi
        if (isEmpty()) throw std::underflow_error("Queue is empty");

        T val = data[head];
        head = (head + 1) % Capacity;
        count--;
        return val;
    }
};`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Enqueue đầy dung lượng (Capacity = 4)", input: "enqueue(1..4)", expected: "isFull == true" },
      { id: 2, title: "Guard Clause kích hoạt khi enqueue phần tử thứ 5", input: "enqueue(5)", expected: "Returned false" },
      { id: 3, title: "Dequeue FIFO tuần hoàn chính xác", input: "dequeue()", expected: "1, 2, 3, 4" },
    ],
    hints: [
      "Guard Clauses giúp loại bỏ các khối else lồng nhau, kiểm tra trường hợp lỗi trước và return ngay.",
    ],
  },

  "oop-4": {
    id: "ex-oop-4",
    chapterNumber: 4,
    title: "Kiểm toán Liêm chính & SHA-256 Hash Chống Gian lận Commit",
    difficulty: "Nâng cao",
    duration: "40 phút",
    xp: 150,
    language: "cpp",
    fileName: "integrity_audit.cpp",
    objective: "Mô phỏng cơ chế hash block dạng chuỗi Blockchain để phát hiện chỉnh sửa log đồ án trái phép.",
    problemStatement:
      "Tạo lớp CommitLogAudit liên kết các commit theo chuỗi hash SHA-256 (mỗi node chứa hash của node trước). Nếu một commit trong quá khứ bị sửa đổi nội dung, hàm verifyIntegrity() phải phát hiện ra node đầu tiên bị vi phạm.",
    requirements: [
      "Mỗi node Commit chứa: index, author, timestamp, message, previousHash, currentHash.",
      "Hàm verifyChain() duyệt từ đầu đến cuối chuỗi, so sánh previousHash == node_trước.currentHash.",
      "Trả về index node bị giả mạo hoặc -1 nếu toàn bộ chuỗi toàn vẹn.",
    ],
    initialCode: `#include <iostream>
#include <string>
#include <vector>

struct CommitNode {
    int index;
    std::string author;
    std::string message;
    std::string prevHash;
    std::string hash;
};

class AuditChain {
public:
    std::vector<CommitNode> chain;
    
    // Giả lập hash đơn giản: hash(prevHash + author + message)
    std::string computeHash(const CommitNode& node) const {
        return "HASH[" + node.prevHash + ":" + node.author + ":" + node.message + "]";
    }

    bool verifyIntegrity() const {
        for (size_t i = 1; i < chain.size(); i++) {
            if (chain[i].prevHash != chain[i-1].hash) return false;
            if (chain[i].hash != computeHash(chain[i])) return false;
        }
        return true;
    }
};`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Xác thực chuỗi 4 commits hợp lệ", input: "verifyIntegrity()", expected: "true (Integrity OK)" },
      { id: 2, title: "Phát hiện can thiệp commit số 2", input: "tamperNode(2)", expected: "false (Tamper Detected at #2)" },
    ],
    hints: [
      "Đây chính là cơ chế cốt lõi của Git commit SHA-1 tree và sổ cái phân tán.",
    ],
  },

  // ── CS304: Web API & REST ──────────────────────────────────────────────────
  "web-1": {
    id: "ex-web-1",
    chapterNumber: 1,
    title: "Thiết kế RESTful CRUD Controller với Chuẩn Danh từ số nhiều & Pagination",
    difficulty: "Trung bình",
    duration: "25 phút",
    xp: 100,
    language: "typescript",
    fileName: "tasks.controller.ts",
    objective: "Xây dựng REST endpoint chuẩn /api/v1/tasks với HTTP verbs, filtering và pagination.",
    problemStatement:
      "Hiện thực hàm xử lý GET /api/v1/tasks nhận query params (?page=1&limit=10&status=done&priority=high). Trả về response chuẩn envelope { data: [...], pagination: { page, limit, total, totalPages } }.",
    requirements: [
      "Endpoint URI tuân thủ chuẩn danh từ số nhiều (/tasks, không dùng /getTasks).",
      "Hỗ trợ phân trang: mặc định page = 1, limit = 10, tối đa limit = 50.",
      "Trả về HTTP 200 OK với meta pagination, HTTP 400 nếu page < 1.",
    ],
    initialCode: `export interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
}

export function handleGetTasks(
  tasks: Task[],
  query: { page?: number; limit?: number; status?: string }
) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 10));

  let filtered = tasks;
  if (query.status) {
    filtered = filtered.filter((t) => t.status === query.status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const data = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    data,
    pagination: { page, limit, total, totalPages },
  };
}`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Phân trang trang 1 với limit 2", input: "?page=1&limit=2", expected: "2 tasks, total 4, totalPages 2" },
      { id: 2, title: "Lọc theo status=done", input: "?status=done", expected: "Chỉ chứa task có status 'done'" },
      { id: 3, title: "Bảo vệ giới hạn limit tối đa <= 50", input: "?limit=999", expected: "limit tự ép về 50" },
    ],
    hints: [
      "Quy ước REST: Dùng danh từ số nhiều cho tài nguyên, dùng query params cho filtering/sorting/pagination.",
    ],
  },

  // ── CS308: System Design ───────────────────────────────────────────────────
  "system-design-1": {
    id: "ex-system-design-1",
    chapterNumber: 1,
    title: "Thiết kế DDL SQL Chuẩn Khóa Ngoại và Ràng buộc Toàn vẹn (ERD)",
    difficulty: "Trung bình",
    duration: "25 phút",
    xp: 100,
    language: "sql",
    fileName: "schema_ddl.sql",
    objective: "Viết câu lệnh CREATE TABLE với PRIMARY KEY, FOREIGN KEY ON DELETE CASCADE và CHECK constraint.",
    problemStatement:
      "Tạo 2 bảng: Users (id, email UNIQUE, role) và Projects (id, name, owner_id FK tham chiếu Users.id, budget CHECK > 0).",
    requirements: [
      "Bảng Users: id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, role VARCHAR(20) CHECK (role IN ('student', 'admin', 'instructor')).",
      "Bảng Projects: id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, owner_id INT REFERENCES Users(id) ON DELETE CASCADE, budget DECIMAL(10,2) CHECK (budget >= 0).",
    ],
    initialCode: `-- TODO: Viết câu lệnh CREATE TABLE Users và Projects
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'instructor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id INT NOT NULL,
    budget DECIMAL(10, 2) NOT NULL CHECK (budget >= 0),
    CONSTRAINT fk_project_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE CASCADE
);`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Chặn chèn email trùng lặp (UNIQUE)", input: "INSERT 2 users same email", expected: "ERROR: duplicate key value" },
      { id: 2, title: "Chặn budget âm (CHECK constraint)", input: "INSERT project budget = -100", expected: "ERROR: check constraint violation" },
      { id: 3, title: "Tự động xóa projects khi user bị xóa (CASCADE)", input: "DELETE FROM users WHERE id = 1", expected: "Cascade delete successful" },
    ],
    hints: ["Luôn đặt tên constraint rõ ràng (e.g. fk_project_owner) để dễ debug log khi có vi phạm."],
  },

  // ── CS401: Scrum ───────────────────────────────────────────────────────────
  "scrum-1": {
    id: "ex-scrum-1",
    chapterNumber: 1,
    title: "Tính toán Capacity Sprint & Dự báo Tải công việc Nhóm (Anti-Overcommit)",
    difficulty: "Dễ",
    duration: "20 phút",
    xp: 80,
    language: "typescript",
    fileName: "sprint_capacity.ts",
    objective: "Xây dựng thuật toán tính tổng giờ làm việc thực tế của cả nhóm dựa trên ngày nghỉ và hệ số tập trung Focus Factor.",
    problemStatement:
      "Một nhóm có N thành viên. Mỗi thành viên làm việc 8 giờ/ngày, Sprint kéo dài 10 ngày làm việc. Hãy tính Net Capacity = Tổng số giờ * Focus Factor (thường là 0.7 - 0.8) để tránh overcommit.",
    requirements: [
      "Nhận mảng thành viên: [{ name, daysOff, focusFactor }].",
      "Số giờ làm việc thực tế = (10 ngày - daysOff) * 8 * focusFactor.",
      "Trả về tổng giờ cả nhóm và cảnh báo nếu có thành viên bị quá tải > 40 giờ.",
    ],
    initialCode: `export interface TeamMemberCapacity {
  name: string;
  daysOff: number;
  focusFactor: number; // e.g. 0.75
}

export function calculateSprintCapacity(members: TeamMemberCapacity[], sprintDays = 10) {
  let totalHours = 0;
  const memberCapacities = members.map((m) => {
    const workingDays = Math.max(0, sprintDays - m.daysOff);
    const availableHours = Math.round(workingDays * 8 * m.focusFactor);
    totalHours += availableHours;
    return {
      name: m.name,
      availableHours,
      isOverloaded: availableHours > 60,
    };
  });

  return {
    totalSprintHours: totalHours,
    recommendedStoryPoints: Math.round(totalHours / 8), // 1 SP ~ 8 giờ
    breakdown: memberCapacities,
  };
}`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Nhóm 3 thành viên không ai nghỉ phép", input: "3 members, 0 daysOff, 0.75 focus", expected: "180 giờ (~23 Story Points)" },
      { id: 2, title: "Thành viên nghỉ phép 3 ngày", input: "1 member, 3 daysOff, 0.8 focus", expected: "45 giờ" },
    ],
    hints: ["Focus Factor 0.75 phản ánh thực tế: lập trình viên chỉ tập trung code sâu khoảng 6h/ngày."],
  },
};

// Hàm lấy dữ liệu bài tập cho bất kỳ môn và chương nào (fallback thông minh tự sinh bài tập chuẩn)
export function getChapterExercise(
  subjectId: string,
  chapterNumber: number,
  chapterTitle: string,
  subjectCode: string,
  subjectName: string
): ChapterExerciseData {
  const key = `${subjectId}-${chapterNumber}`;
  if (CHAPTER_EXERCISES_MAP[key]) {
    return CHAPTER_EXERCISES_MAP[key];
  }

  // Fallback thông minh: Tự động khởi tạo bài tập thực hành theo chủ đề chương
  return {
    id: `ex-${subjectId}-c${chapterNumber}`,
    chapterNumber,
    title: `Bài tập Thực hành & Thử thách Code: ${chapterTitle}`,
    difficulty: chapterNumber === 1 ? "Dễ" : chapterNumber === 2 ? "Trung bình" : "Nâng cao",
    duration: `${20 + chapterNumber * 5} phút`,
    xp: 80 + chapterNumber * 20,
    language: subjectId === "oop" || subjectId === "dsa" ? "cpp" : subjectId === "system-design" ? "sql" : "typescript",
    fileName: subjectId === "oop" || subjectId === "dsa" ? "solution.cpp" : subjectId === "system-design" ? "schema.sql" : "solution.ts",
    objective: `Ứng dụng toàn diện các nguyên lý cốt lõi của Chương ${chapterNumber}: "${chapterTitle}" thuộc môn học ${subjectName} (${subjectCode}).`,
    problemStatement: `Trong chương này, bạn đã học về "${chapterTitle}". Hãy hoàn thành mã nguồn để xây dựng tính năng thực tế, đáp ứng đầy đủ các ràng buộc kiến trúc và vượt qua 3 bộ test case tự động của hệ thống.`,
    requirements: [
      `Áp dụng các cấu trúc dữ liệu và giải thuật đã được hướng dẫn trong Chương ${chapterNumber}.`,
      "Mã nguồn phải có chú thích rõ ràng, xử lý trường hợp biên (Guard Clauses / Error handling).",
      "Vượt qua 3/3 test cases tự động để nhận trọn vẹn điểm thưởng kinh nghiệm XP.",
    ],
    initialCode: `// Bài tập Thực hành Chương ${chapterNumber}: ${chapterTitle}
// Môn học: ${subjectName} (${subjectCode})

function solveChapterChallenge(inputData: any) {
  // TODO: Viết logic xử lý của bạn tại đây
  console.log("Đang chạy kiểm thử cho Chương ${chapterNumber}...");
  
  if (!inputData) {
    return { success: false, message: "Dữ liệu đầu vào không hợp lệ" };
  }
  
  return {
    success: true,
    result: "Hoàn thành giải thuật chuẩn xác cho " + inputData,
  };
}

// Chạy thử nghiệm
const testResult = solveChapterChallenge("Sample Test 1");
console.log(testResult);`,
    solutionCode: ``,
    testCases: [
      { id: 1, title: "Test Case #1: Xử lý đầu vào tiêu chuẩn", input: "{ testId: 'case_normal', value: 100 }", expected: "success: true" },
      { id: 2, title: "Test Case #2: Xử lý trường hợp biên (Edge Case)", input: "{ testId: 'case_boundary', value: 0 }", expected: "handled with guard clause" },
      { id: 3, title: "Test Case #3: Kiểm tra hiệu năng & tính toàn vẹn", input: "{ testId: 'case_stress', iterations: 1000 }", expected: "Execution time < 100ms" },
    ],
    hints: [
      `Xem lại video và bài đọc lý thuyết của Chương ${chapterNumber} để nắm chắc công thức và mô hình thiết kế.`,
      "Bấm nút 'Hỏi Mentor AI gợi ý' để được trợ lý hướng dẫn từng bước tư duy logic.",
    ],
  };
}

// Cây Tri Thức Tiến Trình Bài Học (Knowledge Tree Mindmap)
// Thiết kế dạng Cây phân nhánh chuẩn cuối chương: Các nút đằng sau giải thích tóm gọn kiến thức

import type { CompactTreeNodeData } from "../components/CompactTreeMindmapNode";

export interface TreeMindmapNode {
  id: string;
  type: "compactTreeNode";
  position: { x: number; y: number };
  data: CompactTreeNodeData;
}

export interface TreeMindmapEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: { stroke?: string; strokeWidth?: number };
}

export interface SubjectTreeData {
  subjectId: string;
  subjectCode: string;
  title: string;
  overviewStats: {
    completionRate: number;
    totalXp: number;
    timeSpentMins: number;
    integrityScore: number;
  };
  nodes: TreeMindmapNode[];
  edges: TreeMindmapEdge[];
  quickSummary: string[];
}

export const TREE_MINDMAP_DATA: Record<string, SubjectTreeData> = {
  // ─── 1. CS201: OOP (KỸ THUẬT LẬP TRÌNH & HƯỚNG ĐỐI TƯỢNG) ──────────────
  oop: {
    subjectId: "oop",
    subjectCode: "CS201",
    title: "Sơ Đồ Tư Duy Tổng Kết: Kế Thừa & Đa Hình Động",
    overviewStats: {
      completionRate: 85,
      totalXp: 210,
      timeSpentMins: 45,
      integrityScore: 100,
    },
    quickSummary: [
      "Kế thừa (: public Base) tái sử dụng theo quan hệ 'is-a'; dùng Member Initializer List khởi tạo lớp cha.",
      "Đa hình (Override) dispatch qua con trỏ vtable tại runtime với tốc độ O(1).",
      "Interface đóng vai trò hợp đồng hành vi, mở rộng hệ thống mà không sửa code cũ.",
    ],
    nodes: [
      {
        id: "root",
        type: "compactTreeNode",
        position: { x: 30, y: 780 },
        data: {
          nodeType: "root",
          title: "Chương 1: OOP & Kiến Trúc vtable",
          progressPct: 85,
          xp: 210,
          status: "in-progress",
        },
      },
      // ── Cành chính (Branches - Level 1) ─────────────────────────────────
      {
        id: "b-1",
        type: "compactTreeNode",
        position: { x: 320, y: 180 },
        data: {
          nodeType: "branch",
          title: "Bài 1.1 · Kế thừa",
          badge: "Inheritance",
          progressPct: 100,
          status: "completed",
          tone: "blue",
        },
      },
      {
        id: "b-2",
        type: "compactTreeNode",
        position: { x: 320, y: 580 },
        data: {
          nodeType: "branch",
          title: "Bài 1.2 · Đa hình & vtable",
          badge: "Polymorphism",
          progressPct: 80,
          status: "in-progress",
          tone: "purple",
        },
      },
      {
        id: "b-3",
        type: "compactTreeNode",
        position: { x: 320, y: 980 },
        data: {
          nodeType: "branch",
          title: "Bài 1.3 · Trừu tượng & Interface",
          badge: "Interface",
          progressPct: 60,
          status: "in-progress",
          tone: "amber",
        },
      },
      {
        id: "b-4",
        type: "compactTreeNode",
        position: { x: 320, y: 1380 },
        data: {
          nodeType: "branch",
          title: "Bài 1.4 · Tổng kết & Kiến trúc SOLID",
          badge: "SOLID Exam",
          progressPct: 100,
          status: "completed",
          tone: "emerald",
        },
      },

      // ── Các nhánh khái niệm (Leaves - Level 2) ──────────────────────────
      // Nhóm Bài 1.1: Kế thừa
      {
        id: "l-1-1",
        type: "compactTreeNode",
        position: { x: 610, y: 50 },
        data: {
          nodeType: "leaf",
          title: ": public Base (Is-A)",
          summary: "Lớp con tái sử dụng toàn bộ trường và hàm cha; chỉ áp dụng khi có quan hệ 'là một'.",
          badge: "Tái sử dụng mã",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "l-1-2",
        type: "compactTreeNode",
        position: { x: 610, y: 180 },
        data: {
          nodeType: "leaf",
          title: "Initializer List (: Base)",
          summary: "Gọi constructor lớp cha ở dòng đầu tiên để cấp phát bộ nhớ cha trước khi gán thuộc tính con.",
          badge: "Cấp phát cha trước",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "l-1-3",
        type: "compactTreeNode",
        position: { x: 610, y: 310 },
        data: {
          nodeType: "leaf",
          title: "Protected Encapsulation",
          summary: "Cho phép các lớp con trong cây phả hệ truy cập trực tiếp nhưng ẩn giấu hoàn toàn với bên ngoài.",
          badge: "Đóng gói kế thừa",
          progressPct: 90,
          status: "completed",
        },
      },

      // Nhóm Bài 1.2: Đa hình & vtable
      {
        id: "l-2-1",
        type: "compactTreeNode",
        position: { x: 610, y: 450 },
        data: {
          nodeType: "leaf",
          title: "virtual & override",
          summary: "Gắn từ khóa override ở lớp con để compiler C++20 kiểm khớp chữ ký hàm ảo của lớp cha.",
          badge: "Runtime Binding",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "l-2-2",
        type: "compactTreeNode",
        position: { x: 610, y: 580 },
        data: {
          nodeType: "leaf",
          title: "vtable & vptr Dispatch",
          summary: "Mỗi object chứa con trỏ ẩn vptr trỏ vào vtable của lớp thực tế để Dynamic Dispatch tốc độ O(1).",
          badge: "Tra cứu O(1)",
          progressPct: 80,
          status: "in-progress",
        },
      },
      {
        id: "l-2-3",
        type: "compactTreeNode",
        position: { x: 610, y: 710 },
        data: {
          nodeType: "leaf",
          title: "Upcasting & Downcasting",
          summary: "Dùng smart pointer đa hình và dynamic_cast an toàn; luôn khai báo virtual ~Base() = default.",
          badge: "Kiểm tra kiểu RTTI",
          progressPct: 75,
          status: "in-progress",
        },
      },

      // Nhóm Bài 1.3: Trừu tượng & Interface
      {
        id: "l-3-1",
        type: "compactTreeNode",
        position: { x: 610, y: 850 },
        data: {
          nodeType: "leaf",
          title: "Interface Contract",
          summary: "Hợp đồng hành vi thuần túy; cho phép lớp thực thi nhiều interface mà không bị xung đột đa kế thừa.",
          badge: "Đa thực thi",
          progressPct: 60,
          status: "in-progress",
        },
      },
      {
        id: "l-3-2",
        type: "compactTreeNode",
        position: { x: 610, y: 980 },
        data: {
          nodeType: "leaf",
          title: "Abstract Base Class",
          summary: "Lớp cơ sở trừu tượng làm khuôn mẫu, chứa cả phương thức cụ thể và phương thức thuần ảo.",
          badge: "Khuôn mẫu chuẩn",
          progressPct: 50,
          status: "in-progress",
        },
      },
      {
        id: "l-3-3",
        type: "compactTreeNode",
        position: { x: 610, y: 1110 },
        data: {
          nodeType: "leaf",
          title: "Multiple Inheritance & Diamond",
          summary: "Giải quyết xung đột hai lớp cha cùng dẫn xuất từ một ông bằng cơ chế Virtual Inheritance.",
          badge: "Giải quyết Diamond",
          progressPct: 65,
          status: "in-progress",
        },
      },

      // Nhóm Bài 1.4: Tổng kết & SOLID
      {
        id: "l-4-1",
        type: "compactTreeNode",
        position: { x: 610, y: 1250 },
        data: {
          nodeType: "leaf",
          title: "Trắc nghiệm tình huống",
          summary: "Vượt qua 3/3 câu hỏi tình huống thực tế về dynamic dispatch và thứ tự cấp phát constructor.",
          badge: "3/3 Câu đúng",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "l-4-2",
        type: "compactTreeNode",
        position: { x: 610, y: 1380 },
        data: {
          nodeType: "leaf",
          title: "Open/Closed Principle",
          summary: "Mở rộng tính năng bằng cách thêm lớp con kế thừa mới, tuyệt đối không chỉnh sửa lớp cha có sẵn.",
          badge: "Chuẩn SOLID OCP",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "l-4-3",
        type: "compactTreeNode",
        position: { x: 610, y: 1510 },
        data: {
          nodeType: "leaf",
          title: "Composition over Inheritance",
          summary: "Ưu tiên quan hệ chứa Has-a thay vì quan hệ thừa kế cứng nhắc, giúp kiến trúc module lỏng lẻo dễ test.",
          badge: "Lắp ghép module",
          progressPct: 95,
          status: "completed",
        },
      },

      // ── Cành chi tiết chuyên sâu (Subleaves - Level 3) ───────────────────
      {
        id: "sub-1-1",
        type: "compactTreeNode",
        position: { x: 910, y: 50 },
        data: {
          nodeType: "subleaf",
          title: "class Dog : public Animal",
          summary: "Tái sử dụng trường & hàm công khai; kiểm tra quan hệ 'là một' chặt chẽ trước khi kế thừa.",
          badge: "Modern C++20",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "sub-1-2",
        type: "compactTreeNode",
        position: { x: 910, y: 180 },
        data: {
          nodeType: "subleaf",
          title: "BaseClass() Init First",
          summary: "Constructor lớp cha luôn chạy trước; thứ tự giải phóng Destructor chạy ngược lại lúc hủy.",
          badge: "Cấp phát RAM",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "sub-1-3",
        type: "compactTreeNode",
        position: { x: 910, y: 310 },
        data: {
          nodeType: "subleaf",
          title: "protected: int m_score",
          summary: "Biến protected cho phép lớp con kế thừa truy cập trực tiếp mà không cần qua getter/setter.",
          badge: "Encapsulation",
          progressPct: 90,
          status: "completed",
        },
      },
      {
        id: "sub-2-1",
        type: "compactTreeNode",
        position: { x: 910, y: 450 },
        data: {
          nodeType: "subleaf",
          title: "Late / Dynamic Binding",
          summary: "Định vị địa chỉ con trỏ hàm tại thời điểm runtime, cho phép đa hình thực sự hoạt động.",
          badge: "Liên kết động",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "sub-2-2",
        type: "compactTreeNode",
        position: { x: 910, y: 580 },
        data: {
          nodeType: "subleaf",
          title: "vptr: 8-Byte Offset",
          summary: "Mỗi đối tượng đa hình lưu 1 con trỏ vptr 64-bit trỏ tới mảng hàm ảo vtable trong bộ nhớ.",
          badge: "Chi phí RAM",
          progressPct: 80,
          status: "in-progress",
        },
      },
      {
        id: "sub-2-3",
        type: "compactTreeNode",
        position: { x: 910, y: 710 },
        data: {
          nodeType: "subleaf",
          title: "dynamic_cast<Derived*>",
          summary: "Ép kiểu an toàn từ con trỏ cha sang con, tự trả về nullptr nếu đối tượng không khớp kiểu.",
          badge: "RTTI Safety",
          progressPct: 75,
          status: "in-progress",
        },
      },
      {
        id: "sub-3-1",
        type: "compactTreeNode",
        position: { x: 910, y: 850 },
        data: {
          nodeType: "subleaf",
          title: "virtual void render() = 0",
          summary: "Hàm thuần ảo, bắt buộc mọi lớp con cụ thể phải hiện thực, không thể khởi tạo trực tiếp.",
          badge: "Thuần ảo",
          progressPct: 60,
          status: "in-progress",
        },
      },
      {
        id: "sub-3-2",
        type: "compactTreeNode",
        position: { x: 910, y: 980 },
        data: {
          nodeType: "subleaf",
          title: "Template Method Pattern",
          summary: "Định hình khung quy trình thuật toán ở lớp cơ sở, cho phép lớp con điền chi tiết từng bước.",
          badge: "Mẫu kiến trúc",
          progressPct: 50,
          status: "in-progress",
        },
      },
      {
        id: "sub-3-3",
        type: "compactTreeNode",
        position: { x: 910, y: 1110 },
        data: {
          nodeType: "subleaf",
          title: "class B : virtual public A",
          summary: "Virtual inheritance triệt tiêu bản sao trùng lặp của lớp ông khi hai nhánh cùng kế thừa.",
          badge: "Diamond Fix",
          progressPct: 65,
          status: "in-progress",
        },
      },
      {
        id: "sub-4-2",
        type: "compactTreeNode",
        position: { x: 910, y: 1380 },
        data: {
          nodeType: "subleaf",
          title: "Open for Extension",
          summary: "Hệ thống mở để mở rộng tính năng mới nhưng đóng kín với việc sửa đổi mã nguồn cũ.",
          badge: "SOLID OCP",
          progressPct: 100,
          status: "completed",
        },
      },
      {
        id: "sub-4-3",
        type: "compactTreeNode",
        position: { x: 910, y: 1510 },
        data: {
          nodeType: "subleaf",
          title: "Engine* m_engine;",
          summary: "Lắp ghép instance đối tượng động, dễ dàng mock test và hoán đổi thuật toán lúc chạy.",
          badge: "Has-a Pattern",
          progressPct: 95,
          status: "completed",
        },
      },
    ],
    edges: [
      // Edges từ Root sang 4 Cành chính
      { id: "e-r-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2.5 } },
      { id: "e-r-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2.5 } },
      { id: "e-r-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2.5 } },
      { id: "e-r-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2.5 } },

      // Edges từ Bài 1.1 sang các Khái niệm
      { id: "e-b1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b1-l3", source: "b-1", target: "l-1-3", style: { stroke: "#64748b", strokeWidth: 1.8 } },

      // Edges từ Bài 1.2 sang các Khái niệm
      { id: "e-b2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b2-l3", source: "b-2", target: "l-2-3", style: { stroke: "#64748b", strokeWidth: 1.8 } },

      // Edges từ Bài 1.3 sang các Khái niệm
      { id: "e-b3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b3-l3", source: "b-3", target: "l-3-3", style: { stroke: "#64748b", strokeWidth: 1.8 } },

      // Edges từ Bài 1.4 sang các Khái niệm
      { id: "e-b4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.8 } },
      { id: "e-b4-l3", source: "b-4", target: "l-4-3", style: { stroke: "#64748b", strokeWidth: 1.8 } },

      // Edges từ Khái niệm sang Chi tiết chuyên sâu (Level 3)
      { id: "e-l1-sub1", source: "l-1-1", target: "sub-1-1", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l1-sub2", source: "l-1-2", target: "sub-1-2", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l1-sub3", source: "l-1-3", target: "sub-1-3", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l2-sub1", source: "l-2-1", target: "sub-2-1", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l2-sub2", source: "l-2-2", target: "sub-2-2", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l2-sub3", source: "l-2-3", target: "sub-2-3", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l3-sub1", source: "l-3-1", target: "sub-3-1", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l3-sub2", source: "l-3-2", target: "sub-3-2", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l3-sub3", source: "l-3-3", target: "sub-3-3", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l4-sub2", source: "l-4-2", target: "sub-4-2", style: { stroke: "#64748b", strokeWidth: 1.4 } },
      { id: "e-l4-sub3", source: "l-4-3", target: "sub-4-3", style: { stroke: "#64748b", strokeWidth: 1.4 } },
    ],
  },

  // ─── 2. CS304: WEB & REST API ───────────────────────────────────────────
  web: {
    subjectId: "web",
    subjectCode: "CS304",
    title: "Sơ Đồ Tư Duy Tổng Kết: Kiến Trúc REST API & Bảo Mật",
    overviewStats: {
      completionRate: 90,
      totalXp: 220,
      timeSpentMins: 50,
      integrityScore: 100,
    },
    quickSummary: [
      "Kiến trúc REST phi trạng thái (Stateless); URI danh từ chuẩn số nhiều.",
      "Token JWT gồm Header.Payload.Signature; Authorization Header truyền Bearer Token.",
      "CORS Preflight request (OPTIONS) kiểm soát miền truy cập giữa React & FastAPI.",
    ],
    nodes: [
      { id: "root", type: "compactTreeNode", position: { x: 40, y: 580 }, data: { nodeType: "root", title: "Chương 1: RESTful API", progressPct: 90, xp: 220, status: "completed" } },
      { id: "b-1", type: "compactTreeNode", position: { x: 330, y: 95 }, data: { nodeType: "branch", title: "Bài 1.1 · REST Architecture", badge: "HTTP Methods", progressPct: 100, status: "completed", tone: "blue" } },
      { id: "b-2", type: "compactTreeNode", position: { x: 330, y: 420 }, data: { nodeType: "branch", title: "Bài 1.2 · JWT Auth", badge: "Bearer Token", progressPct: 100, status: "completed", tone: "purple" } },
      { id: "b-3", type: "compactTreeNode", position: { x: 330, y: 745 }, data: { nodeType: "branch", title: "Bài 1.3 · CORS & Security", badge: "Preflight OPTIONS", progressPct: 80, status: "in-progress", tone: "amber" } },
      { id: "b-4", type: "compactTreeNode", position: { x: 330, y: 1070 }, data: { nodeType: "branch", title: "Nghiệm thu API", badge: "Security Audit", progressPct: 100, status: "completed", tone: "emerald" } },

      { id: "l-1-1", type: "compactTreeNode", position: { x: 620, y: 20 }, data: { nodeType: "leaf", title: "HTTP Methods", summary: "GET lấy dữ liệu, POST tạo mới (201), PUT cập nhật toàn phần, DELETE xóa tài nguyên.", badge: "201 Created", progressPct: 100, status: "completed" } },
      { id: "l-1-2", type: "compactTreeNode", position: { x: 620, y: 175 }, data: { nodeType: "leaf", title: "Statelessness", summary: "Server không lưu session; mỗi request độc lập và tự mang đủ token xác thực.", badge: "No Session", progressPct: 100, status: "completed" } },
      { id: "l-2-1", type: "compactTreeNode", position: { x: 620, y: 345 }, data: { nodeType: "leaf", title: "Cấu trúc JWT", summary: "Header.Payload.Signature được mã hóa Base64URL và ký mật mã SHA-256 an toàn.", badge: "Ký SHA-256", progressPct: 100, status: "completed" } },
      { id: "l-2-2", type: "compactTreeNode", position: { x: 620, y: 500 }, data: { nodeType: "leaf", title: "401 vs 403 Status", summary: "401 Unauthorized (thiếu token/hết hạn) vs 403 Forbidden (đăng nhập nhưng thiếu quyền).", badge: "Auth & RBAC", progressPct: 100, status: "completed" } },
      { id: "l-3-1", type: "compactTreeNode", position: { x: 620, y: 670 }, data: { nodeType: "leaf", title: "CORS Preflight", summary: "Trình duyệt tự động gửi OPTIONS check Access-Control-Allow-Origin trước khi gửi request thật.", badge: "OPTIONS Check", progressPct: 80, status: "in-progress" } },
      { id: "l-3-2", type: "compactTreeNode", position: { x: 620, y: 825 }, data: { nodeType: "leaf", title: "Phòng chống XSS", summary: "Làm sạch (Sanitize) toàn bộ dữ liệu đầu vào và lưu trữ JWT an toàn chống tiêm mã độc.", badge: "Sanitize Input", progressPct: 80, status: "in-progress" } },
      { id: "l-4-1", type: "compactTreeNode", position: { x: 620, y: 995 }, data: { nodeType: "leaf", title: "Quiz Kiểm tra", summary: "Vượt qua trắc nghiệm thực tế về REST endpoint design và mã trạng thái HTTP.", badge: "Pass 100%", progressPct: 100, status: "completed" } },
      { id: "l-4-2", type: "compactTreeNode", position: { x: 620, y: 1150 }, data: { nodeType: "leaf", title: "Swagger Documentation", summary: "Tự động sinh tài liệu OpenAPI tương tác tại /docs phục vụ kiểm thử nhanh chóng.", badge: "OpenAPI Spec", progressPct: 100, status: "completed" } },
    ],
    edges: [
      { id: "e-w-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-w-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-w-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-w-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-wb1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-wb4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
      { id: "e-wb4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
    ],
  },

  // ─── 3. CS308: DATABASE & 3NF ───────────────────────────────────────────
  "system-design": {
    subjectId: "system-design",
    subjectCode: "CS308",
    title: "Sơ Đồ Tư Duy Tổng Kết: Chuẩn Hóa CSDL Quan Hệ (3NF)",
    overviewStats: {
      completionRate: 75,
      totalXp: 180,
      timeSpentMins: 40,
      integrityScore: 100,
    },
    quickSummary: [
      "1NF: Giá trị nguyên tử (Atomic); không nhóm lặp.",
      "2NF: Phụ thuộc hàm đầy đủ vào toàn bộ Khóa chính.",
      "3NF: Loại bỏ hoàn toàn phụ thuộc bắc cầu; tối ưu chỉ mục Index B-Tree.",
    ],
    nodes: [
      { id: "root", type: "compactTreeNode", position: { x: 40, y: 580 }, data: { nodeType: "root", title: "Chương 1: Chuẩn Hóa 3NF", progressPct: 75, xp: 180, status: "in-progress" } },
      { id: "b-1", type: "compactTreeNode", position: { x: 330, y: 95 }, data: { nodeType: "branch", title: "Bài 1.1 · Mô hình ERD", badge: "Entity Relational", progressPct: 100, status: "completed", tone: "blue" } },
      { id: "b-2", type: "compactTreeNode", position: { x: 330, y: 420 }, data: { nodeType: "branch", title: "Bài 1.2 · 1NF & 2NF", badge: "Functional Dependency", progressPct: 80, status: "in-progress", tone: "purple" } },
      { id: "b-3", type: "compactTreeNode", position: { x: 330, y: 745 }, data: { nodeType: "branch", title: "Bài 1.3 · Chuẩn 3NF", badge: "No Transitive", progressPct: 60, status: "in-progress", tone: "amber" } },
      { id: "b-4", type: "compactTreeNode", position: { x: 330, y: 1070 }, data: { nodeType: "branch", title: "Nghiệm thu CSDL", badge: "ACID Transaction", progressPct: 100, status: "completed", tone: "emerald" } },

      { id: "l-1-1", type: "compactTreeNode", position: { x: 620, y: 20 }, data: { nodeType: "leaf", title: "PK & FK Mapping", summary: "Xác định rõ Khóa chính (PK) định danh và Khóa ngoại (FK) liên kết quan hệ 1-N, N-N.", badge: "Quan hệ 1-N", progressPct: 100, status: "completed" } },
      { id: "l-1-2", type: "compactTreeNode", position: { x: 620, y: 175 }, data: { nodeType: "leaf", title: "Bảng trung gian N-N", summary: "Tách quan hệ Nhiều-Nhiều thành 2 quan hệ Một-Nhiều qua bảng liên kết trung gian.", badge: "Junction Table", progressPct: 100, status: "completed" } },
      { id: "l-2-1", type: "compactTreeNode", position: { x: 620, y: 345 }, data: { nodeType: "leaf", title: "Chuẩn hóa 1NF", summary: "Mỗi cột chỉ chứa giá trị nguyên tử (atomic), không lưu mảng hoặc nhóm cột lặp lại.", badge: "Giá trị nguyên tử", progressPct: 100, status: "completed" } },
      { id: "l-2-2", type: "compactTreeNode", position: { x: 620, y: 500 }, data: { nodeType: "leaf", title: "Chuẩn hóa 2NF", summary: "Đạt 1NF và loại bỏ phụ thuộc một phần; mọi thuộc tính phải phụ thuộc cả khóa chính.", badge: "Khóa đầy đủ", progressPct: 80, status: "in-progress" } },
      { id: "l-3-1", type: "compactTreeNode", position: { x: 620, y: 670 }, data: { nodeType: "leaf", title: "Chuẩn hóa 3NF", summary: "Đạt 2NF và loại bỏ phụ thuộc bắc cầu (A → B → C) nhằm triệt tiêu dư thừa và dị thường cập nhật.", badge: "Khử bắc cầu", progressPct: 60, status: "in-progress" } },
      { id: "l-3-2", type: "compactTreeNode", position: { x: 620, y: 825 }, data: { nodeType: "leaf", title: "B-Tree Indexing", summary: "Tối ưu hóa tốc độ truy vấn SELECT từ O(N) xuống O(log N) cho các cột thường tìm kiếm.", badge: "O(log N) Query", progressPct: 50, status: "in-progress" } },
      { id: "l-4-1", type: "compactTreeNode", position: { x: 620, y: 995 }, data: { nodeType: "leaf", title: "Nguyên lý ACID", summary: "Đảm bảo tính Nguyên tử, Nhất quán, Cô lập và Bền vững khi thực thi giao dịch tài chính.", badge: "ACID Standard", progressPct: 100, status: "completed" } },
      { id: "l-4-2", type: "compactTreeNode", position: { x: 620, y: 1150 }, data: { nodeType: "leaf", title: "Tối ưu hóa JOIN", summary: "Sử dụng Index trên khóa ngoại để giảm thiểu chi phí quét bảng đầy đủ (Full Table Scan).", badge: "Fast JOIN", progressPct: 100, status: "completed" } },
    ],
    edges: [
      { id: "e-db-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-db-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-db-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-db-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-db1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-db4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
      { id: "e-db4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
    ],
  },

  // ─── 4. CS401: AGILE SCRUM ──────────────────────────────────────────────
  scrum: {
    subjectId: "scrum",
    subjectCode: "CS401",
    title: "Sơ Đồ Tư Duy Tổng Kết: Quy Trình Phát Triển Agile Scrum",
    overviewStats: {
      completionRate: 80,
      totalXp: 190,
      timeSpentMins: 45,
      integrityScore: 100,
    },
    quickSummary: [
      "INVEST: User Story Độc lập, Thương lượng được, Có giá trị, Ước lượng được, Nhỏ, Kiểm thử được.",
      "Definition of Done (DoD): Tiêu chuẩn nghiệm thu thống nhất giữa dev team và Product Owner.",
      "Sprint Cadence: Lặp vòng 2 tuần với Planning, Daily, Review và Retrospective.",
    ],
    nodes: [
      { id: "root", type: "compactTreeNode", position: { x: 40, y: 580 }, data: { nodeType: "root", title: "Chương 1: Agile Scrum", progressPct: 80, xp: 190, status: "completed" } },
      { id: "b-1", type: "compactTreeNode", position: { x: 330, y: 95 }, data: { nodeType: "branch", title: "Bài 1.1 · User Story", badge: "INVEST Metric", progressPct: 100, status: "completed", tone: "blue" } },
      { id: "b-2", type: "compactTreeNode", position: { x: 330, y: 420 }, data: { nodeType: "branch", title: "Bài 1.2 · Sprint Cycle", badge: "2-Week Cadence", progressPct: 80, status: "in-progress", tone: "purple" } },
      { id: "b-3", type: "compactTreeNode", position: { x: 330, y: 745 }, data: { nodeType: "branch", title: "Bài 1.3 · DoD & Review", badge: "Quality Gate", progressPct: 70, status: "in-progress", tone: "amber" } },
      { id: "b-4", type: "compactTreeNode", position: { x: 330, y: 1070 }, data: { nodeType: "branch", title: "Nghiệm thu Sprint", badge: "Sprint Demo", progressPct: 100, status: "completed", tone: "emerald" } },

      { id: "l-1-1", type: "compactTreeNode", position: { x: 620, y: 20 }, data: { nodeType: "leaf", title: "Tiêu chí INVEST", summary: "User Story đạt chuẩn: Independent, Negotiable, Valuable, Estimable, Small, Testable.", badge: "INVEST Metric", progressPct: 100, status: "completed" } },
      { id: "l-1-2", type: "compactTreeNode", position: { x: 620, y: 175 }, data: { nodeType: "leaf", title: "Story Points", summary: "Ước lượng độ phức tạp và nỗ lực bằng dãy số Fibonacci (1, 2, 3, 5, 8) thay vì số giờ tuyệt đối.", badge: "Fibonacci Point", progressPct: 100, status: "completed" } },
      { id: "l-2-1", type: "compactTreeNode", position: { x: 620, y: 345 }, data: { nodeType: "leaf", title: "Daily Scrum 15p", summary: "Đồng bộ nhanh 3 câu hỏi: Đã làm gì? Sẽ làm gì hôm nay? Có trở ngại (blocker) gì không?", badge: "15 Mins Sync", progressPct: 80, status: "in-progress" } },
      { id: "l-2-2", type: "compactTreeNode", position: { x: 620, y: 500 }, data: { nodeType: "leaf", title: "Sprint Backlog", summary: "Tập hợp các User Story nhóm phát triển cam kết hoàn thành trong vòng Sprint 2 tuần.", badge: "Cam kết Sprint", progressPct: 80, status: "in-progress" } },
      { id: "l-3-1", type: "compactTreeNode", position: { x: 620, y: 670 }, data: { nodeType: "leaf", title: "Definition of Done", summary: "Tiêu chí nghiệm thu: Code review xong, Test pass 100%, deploy staging thành công không lỗi.", badge: "Quality Standard", progressPct: 70, status: "in-progress" } },
      { id: "l-3-2", type: "compactTreeNode", position: { x: 620, y: 825 }, data: { nodeType: "leaf", title: "Retrospective", summary: "Đúc kết kinh nghiệm sau mỗi Sprint: Điều làm tốt, điều cần cải thiện và kế hoạch hành động.", badge: "Cải tiến liên tục", progressPct: 70, status: "in-progress" } },
      { id: "l-4-1", type: "compactTreeNode", position: { x: 620, y: 995 }, data: { nodeType: "leaf", title: "Burndown Chart", summary: "Biểu đồ theo dõi tốc độ giải phóng công việc thực tế so với đường lý tưởng của Sprint.", badge: "Velocity Chart", progressPct: 100, status: "completed" } },
      { id: "l-4-2", type: "compactTreeNode", position: { x: 620, y: 1150 }, data: { nodeType: "leaf", title: "Nghiệm thu Đồ án", summary: "Demo tính năng chạy thực tế cho hội đồng đánh giá và bàn giao sản phẩm có giá trị.", badge: "Working Software", progressPct: 100, status: "completed" } },
    ],
    edges: [
      { id: "e-sc-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-sc-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-sc-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-sc-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-sc1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-sc4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
      { id: "e-sc4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
    ],
  },

  // ─── 5. CS210: FRONTEND REACT 19 & NEXT.JS 15 ───────────────────────────
  frontend: {
    subjectId: "frontend",
    subjectCode: "CS210",
    title: "Sơ Đồ Tư Duy Tổng Kết: Kiến Trúc React 19 & Next.js 15 App Router",
    overviewStats: {
      completionRate: 85,
      totalXp: 240,
      timeSpentMins: 55,
      integrityScore: 100,
    },
    quickSummary: [
      "React Server Components (RSC): Zero client bundle, truy vấn DB trực tiếp trên Server.",
      "Server Actions: Xử lý Form mutations không cần tạo API endpoint, type-safe 100%.",
      "Streaming SSR với Suspense: Tải trước khung xương (Skeleton) rồi stream từng phần.",
    ],
    nodes: [
      { id: "root", type: "compactTreeNode", position: { x: 40, y: 580 }, data: { nodeType: "root", title: "Chương 1: React 19 & Next.js", progressPct: 85, xp: 240, status: "completed" } },
      { id: "b-1", type: "compactTreeNode", position: { x: 330, y: 95 }, data: { nodeType: "branch", title: "Bài 1.1 · Server Components", badge: "RSC Architecture", progressPct: 100, status: "completed", tone: "blue" } },
      { id: "b-2", type: "compactTreeNode", position: { x: 330, y: 420 }, data: { nodeType: "branch", title: "Bài 1.2 · Server Actions", badge: "Direct Mutation", progressPct: 90, status: "completed", tone: "purple" } },
      { id: "b-3", type: "compactTreeNode", position: { x: 330, y: 745 }, data: { nodeType: "branch", title: "Bài 1.3 · Streaming & Suspense", badge: "App Router", progressPct: 80, status: "in-progress", tone: "amber" } },
      { id: "b-4", type: "compactTreeNode", position: { x: 330, y: 1070 }, data: { nodeType: "branch", title: "Nghiệm thu Frontend", badge: "Lighthouse 100", progressPct: 100, status: "completed", tone: "emerald" } },

      { id: "l-1-1", type: "compactTreeNode", position: { x: 620, y: 20 }, data: { nodeType: "leaf", title: "Zero Client Bundle", summary: "Mã nguồn Server Component chỉ chạy trên server, không tải thêm 1 byte JS thừa nào về client.", badge: "Zero JS Cost", progressPct: 100, status: "completed" } },
      { id: "l-1-2", type: "compactTreeNode", position: { x: 620, y: 175 }, data: { nodeType: "leaf", title: "Server-side Fetching", summary: "Gọi trực tiếp database query hoặc ORM bên trong async component mà không lộ secret key.", badge: "Secure Fetch", progressPct: 100, status: "completed" } },
      { id: "l-2-1", type: "compactTreeNode", position: { x: 620, y: 345 }, data: { nodeType: "leaf", title: "Form Server Actions", summary: "Hàm 'use server' tự động xử lý request POST, validate dữ liệu với Zod và mã hóa CSRF token.", badge: "useActionState", progressPct: 100, status: "completed" } },
      { id: "l-2-2", type: "compactTreeNode", position: { x: 620, y: 500 }, data: { nodeType: "leaf", title: "useOptimistic UI", summary: "Giao diện cập nhật ngay lập tức trước khi server phản hồi, tự rollback nếu lỗi mạng.", badge: "Instant UI", progressPct: 80, status: "in-progress" } },
      { id: "l-3-1", type: "compactTreeNode", position: { x: 620, y: 670 }, data: { nodeType: "leaf", title: "Nested Layouts", summary: "Các layout lồng nhau duy trì trạng thái (state) khi điều hướng giữa các trang con.", badge: "Persistent Layout", progressPct: 80, status: "in-progress" } },
      { id: "l-3-2", type: "compactTreeNode", position: { x: 620, y: 825 }, data: { nodeType: "leaf", title: "Suspense Streaming", summary: "Stream HTML theo từng khối độc lập (Chunks), giải phóng First Contentful Paint (FCP).", badge: "Edge Stream", progressPct: 80, status: "in-progress" } },
      { id: "l-4-1", type: "compactTreeNode", position: { x: 620, y: 995 }, data: { nodeType: "leaf", title: "Lighthouse 100 Score", summary: "Tối ưu Core Web Vitals với next/font, next/image và tree-shaking CSS Tailwind v4.", badge: "Web Vitals", progressPct: 100, status: "completed" } },
      { id: "l-4-2", type: "compactTreeNode", position: { x: 620, y: 1150 }, data: { nodeType: "leaf", title: "Production Build", summary: "Biên dịch và kiểm tra type-safety strict, sẵn sàng deploy tự động lên Edge CDN.", badge: "Type Check Pass", progressPct: 100, status: "completed" } },
    ],
    edges: [
      { id: "e-fe-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-fe-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-fe-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-fe-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-fe1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-fe4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
      { id: "e-fe4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
    ],
  },

  // ─── 6. CS420: AI-NATIVE & RAG ARCHITECTURE ──────────────────────────────
  "ai-agent": {
    subjectId: "ai-agent",
    subjectCode: "CS420",
    title: "Sơ Đồ Tư Duy Tổng Kết: Kiến Trúc AI-Native Web App & RAG Agents",
    overviewStats: {
      completionRate: 90,
      totalXp: 260,
      timeSpentMins: 60,
      integrityScore: 100,
    },
    quickSummary: [
      "Vector Search với pgvector: Tìm kiếm ngữ nghĩa vượt trội hơn từ khóa SQL LIKE truyền thống.",
      "RAG Pipeline: Tiêm ngữ cảnh chính xác từ CSDL nội bộ để triệt tiêu hoàn toàn ảo giác LLM.",
      "AI Agent Tool Calling: Tự động hoá quyết định gọi API và chạy các tác vụ phức tạp.",
    ],
    nodes: [
      { id: "root", type: "compactTreeNode", position: { x: 40, y: 580 }, data: { nodeType: "root", title: "Chương 1: AI-Native & RAG", progressPct: 90, xp: 260, status: "completed" } },
      { id: "b-1", type: "compactTreeNode", position: { x: 330, y: 95 }, data: { nodeType: "branch", title: "Bài 1.1 · Vector Embeddings", badge: "pgvector Index", progressPct: 100, status: "completed", tone: "blue" } },
      { id: "b-2", type: "compactTreeNode", position: { x: 330, y: 420 }, data: { nodeType: "branch", title: "Bài 1.2 · RAG Pipeline", badge: "Hallucination Free", progressPct: 95, status: "completed", tone: "purple" } },
      { id: "b-3", type: "compactTreeNode", position: { x: 330, y: 745 }, data: { nodeType: "branch", title: "Bài 1.3 · Tool Calling Agents", badge: "Autonomous Loop", progressPct: 80, status: "in-progress", tone: "amber" } },
      { id: "b-4", type: "compactTreeNode", position: { x: 330, y: 1070 }, data: { nodeType: "branch", title: "Nghiệm thu AI-Native", badge: "Production RAG", progressPct: 100, status: "completed", tone: "emerald" } },

      { id: "l-1-1", type: "compactTreeNode", position: { x: 620, y: 20 }, data: { nodeType: "leaf", title: "pgvector Cosine", summary: "Tìm kiếm độ tương đồng Cosine Similarity trên không gian véc-tơ nhiều chiều với HNSW index.", badge: "HNSW Index", progressPct: 100, status: "completed" } },
      { id: "l-1-2", type: "compactTreeNode", position: { x: 620, y: 175 }, data: { nodeType: "leaf", title: "Chunking 512 Tokens", summary: "Phân mảnh tài liệu thông minh giữ nguyên vẹn cấu trúc đoạn văn bản và ngữ cảnh.", badge: "Semantic Chunk", progressPct: 100, status: "completed" } },
      { id: "l-2-1", type: "compactTreeNode", position: { x: 620, y: 345 }, data: { nodeType: "leaf", title: "Context Injection", summary: "Nạp các đoạn trích dẫn thực tế vào System Prompt của LLM để trả lời chính xác 100%.", badge: "No Hallucination", progressPct: 100, status: "completed" } },
      { id: "l-2-2", type: "compactTreeNode", position: { x: 620, y: 500 }, data: { nodeType: "leaf", title: "Cross-Encoder Re-rank", summary: "Tái xếp hạng kết quả truy xuất bằng mô hình chuyên dụng để loại bỏ các đoạn văn bản nhiễu.", badge: "Re-ranker", progressPct: 90, status: "completed" } },
      { id: "l-3-1", type: "compactTreeNode", position: { x: 620, y: 670 }, data: { nodeType: "leaf", title: "JSON Function Call", summary: "Mô hình sinh arguments chuẩn JSON schema để ứng dụng Web tự động kích hoạt chức năng.", badge: "Tool Calling", progressPct: 80, status: "in-progress" } },
      { id: "l-3-2", type: "compactTreeNode", position: { x: 620, y: 825 }, data: { nodeType: "leaf", title: "Autonomous Loop", summary: "Vòng lặp ReAct (Reasoning + Acting) giúp AI Agent tự suy luận nhiều bước để hoàn thành mục tiêu.", badge: "ReAct Loop", progressPct: 80, status: "in-progress" } },
      { id: "l-4-1", type: "compactTreeNode", position: { x: 620, y: 995 }, data: { nodeType: "leaf", title: "Evaluator Scoring", summary: "Chấm điểm tự động độ trung thực (Faithfulness) và độ liên quan của câu trả lời qua Ragas.", badge: "RAG Evaluation", progressPct: 100, status: "completed" } },
      { id: "l-4-2", type: "compactTreeNode", position: { x: 620, y: 1150 }, data: { nodeType: "leaf", title: "Production Guardrails", summary: "Thiết lập rào chắn an toàn kiểm soát chi phí token, rate limit và bảo mật dữ liệu nhạy cảm.", badge: "Token Budget", progressPct: 100, status: "completed" } },
    ],
    edges: [
      { id: "e-ai-b1", source: "root", target: "b-1", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-ai-b2", source: "root", target: "b-2", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-ai-b3", source: "root", target: "b-3", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-ai-b4", source: "root", target: "b-4", animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
      { id: "e-ai1-l1", source: "b-1", target: "l-1-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai1-l2", source: "b-1", target: "l-1-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai2-l1", source: "b-2", target: "l-2-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai2-l2", source: "b-2", target: "l-2-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai3-l1", source: "b-3", target: "l-3-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai3-l2", source: "b-3", target: "l-3-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
      { id: "e-ai4-l1", source: "b-4", target: "l-4-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
      { id: "e-ai4-l2", source: "b-4", target: "l-4-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
    ],
  },


  // ─── AUTO-GENERATED 10 SUBJECT MINDMAPS (CS202..CS499)

  "dsa": {
    "subjectId": "dsa",
    "subjectCode": "CS202",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Giải thuật Đồ thị, Truy vấn Đoạn & DP",
    "overviewStats": {
      "completionRate": 85,
      "totalXp": 290,
      "timeSpentMins": 55,
      "integrityScore": 100
    },
    "quickSummary": [
      "Danh sách kề O(V+E) + Dijkstra Min-Heap Lazy Deletion đạt O((V+E) log V) cho đồ thị trọng số không âm.",
      "Kruskal + DSU (Path Compression + Union by Size) tìm Cây khung cực tiểu với độ phức tạp gần hằng số O(alpha(N)).",
      "Fenwick/Segment Tree xử lý truy vấn đoạn O(log N), còn 0/1 Knapsack nén Rolling Array 1D tiết kiệm RAM O(W)."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS202: Đồ thị & DP",
          "progressPct": 85,
          "xp": 290,
          "status": "completed"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Bài 1 · Đồ thị & Dijkstra",
          "badge": "O(E log V)",
          "progressPct": 100,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Danh sách kề (Adj List)",
          "summary": "Lưu V danh sách cạnh kề vector<vector<pair>> chỉ tốn O(V+E) RAM cho 10^5 đỉnh.",
          "badge": "Sparse Graph",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Dijkstra Lazy Deletion",
          "summary": "Dùng min-heap priority_queue kèm `if (d > dist[u]) continue;` tránh duyệt lặp trạng thái cũ.",
          "badge": "Shortest Path",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Bài 2 · DSU & Kruskal MST",
          "badge": "O(alpha(N))",
          "progressPct": 90,
          "status": "completed",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Path Compression",
          "summary": "Gán trực tiếp `parent[v] = find(parent[v])` làm phẳng chiều cao cây tập hợp rời nhau.",
          "badge": "Find O(1)*",
          "progressPct": 95,
          "status": "completed"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Kruskal Greedy MST",
          "summary": "Sắp xếp cạnh tăng dần và gộp bằng DSU tới khi chọn đủ V-1 cạnh không tạo chu trình.",
          "badge": "Min Spanning Tree",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Bài 3 · Truy vấn Đoạn",
          "badge": "O(log N)",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Fenwick Tree (BIT)",
          "summary": "Khai thác phép bit `i & -i` trên mảng 1-based để cập nhật điểm và tính tổng đoạn trong 10 dòng.",
          "badge": "LSB Bit Trick",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "Segment Tree 4*N",
          "summary": "Truy vấn Range Min/Max/GCD kết hợp Lazy Propagation cập nhật cả đoạn [L, R] tốc độ O(log N).",
          "badge": "Lazy Prop",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Bài 4 · Quy hoạch Động",
          "badge": "Optimal State",
          "progressPct": 85,
          "status": "completed",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Memoization Top-Down",
          "summary": "Lưu kết quả bài toán con trùng lặp vào mảng `memo[]` biến cây mũ O(2^N) thành đa thức.",
          "badge": "Khử trùng lặp",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Rolling Array 0/1 Knapsack",
          "summary": "Duyệt ngược trọng lượng từ W về w[i] trên mảng 1D đảm bảo mỗi vật chỉ chọn tối đa 1 lần.",
          "badge": "O(W) Space",
          "progressPct": 80,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-dsa-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-dsa-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-dsa-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-dsa-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-dsa-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-dsa-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "network": {
    "subjectId": "network",
    "subjectCode": "CS205",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Kiến trúc Máy tính, OS & TCP/IP",
    "overviewStats": {
      "completionRate": 75,
      "totalXp": 220,
      "timeSpentMins": 45,
      "integrityScore": 100
    },
    "quickSummary": [
      "TCP thiết lập kênh tin cậy qua bắt tay 3 bước SYN -> SYN-ACK -> ACK; HTTP/3 dùng QUIC UDP loại bỏ HoL Blocking.",
      "Virtual Memory cô lập không gian tiến trình thông qua Page Table 4KB + bộ nhớ đệm TLB tăng tốc dịch địa chỉ.",
      "DNS phân giải theo chuỗi Recursive -> Root -> TLD -> Auth, kết hợp TLS 1.3 (1-RTT) bảo mật HTTPS."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS205: OS & TCP/IP",
          "progressPct": 75,
          "xp": 220,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Tầng 1 · TCP Socket & QUIC",
          "badge": "SYN-ACK",
          "progressPct": 100,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "TCP 3-Way Handshake",
          "summary": "Bắt tay SYN -> SYN-ACK -> ACK đồng bộ Sequence Number, kèm Sliding Window & Flow Control.",
          "badge": "Reliable Stream",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "HTTP/3 trên UDP QUIC",
          "summary": "Tách luồng Stream độc lập trên UDP giúp rớt 1 gói không khóa chéo các luồng còn lại.",
          "badge": "Zero HoL Block",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Tầng 2 · Virtual Memory",
          "badge": "MMU & TLB",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Paging & Page Table",
          "summary": "Chia RAM thành trang 4KB; tách địa chỉ ảo thành Virtual Page Number (VPN) + 12-bit Offset.",
          "badge": "Cô lập RAM",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "TLB Hardware Cache",
          "summary": "Đệm ánh xạ Virtual -> Physical ngay trong CPU giúp giảm chi phí tra cứu Page Table nhiều tầng.",
          "badge": "CPU Cache Hit",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Tầng 3 · Đa luồng CPU",
          "badge": "Concurrency",
          "progressPct": 65,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Process vs Thread",
          "summary": "Process tách riêng không gian địa chỉ ảo; Thread chia sẻ Heap nên nhanh hơn nhưng cần Mutex.",
          "badge": "Context Switch",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "RAII Lock & Atomic",
          "summary": "Dùng `std::lock_guard` và thứ tự khóa toàn cục để triệt tiêu Race Condition và Deadlock.",
          "badge": "Thread Safe",
          "progressPct": 60,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Tầng 4 · DNS & TLS 1.3",
          "badge": "HTTPS Security",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Phân giải DNS đệ quy",
          "summary": "Local Cache -> Resolver -> Root -> TLD -> Authoritative Name Server với bản ghi A/CNAME/TTL.",
          "badge": "UDP/53 Query",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "TLS 1.3 & PFS",
          "summary": "Thỏa thuận khóa ECDHE ngay trong ClientHello (1-RTT) kèm AES-GCM & Perfect Forward Secrecy.",
          "badge": "1-RTT TLS",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-network-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-network-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-network-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-network-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-network-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-network-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "realtime": {
    "subjectId": "realtime",
    "subjectCode": "CS215",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Event Loop, WebSockets & Core Web Vitals",
    "overviewStats": {
      "completionRate": 78,
      "totalXp": 240,
      "timeSpentMins": 50,
      "integrityScore": 100
    },
    "quickSummary": [
      "Microtask Queue (Promise) luôn giải phóng sạch trước Macrotask Queue (setTimeout); chạy song song bằng Promise.all.",
      "WebSockets giữ kênh Full-Duplex 2 chiều (HTTP 101) kèm Exponential Backoff + Jitter; SSE tối ưu cho AI Streaming 1 chiều.",
      "Giữ Web Vitals chuẩn xanh: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 bằng Virtualization và GPU transform/opacity."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS215: Realtime & Vitals",
          "progressPct": 78,
          "xp": 240,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 1 · JS Concurrency",
          "badge": "Event Loop",
          "progressPct": 100,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Microtask > Macrotask",
          "summary": "Call Stack trống -> rút cạn Promise `.then` queue -> lấy 1 Macrotask setTimeout -> lặp lại.",
          "badge": "Async Order",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Closure & Debounce",
          "summary": "Đóng gói `timerId` qua Lexical Scope để hoãn API search 300ms và dùng useRef tránh Stale Closure.",
          "badge": "300ms Guard",
          "progressPct": 95,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 2 · Caching & Sync",
          "badge": "TanStack Query",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Stale-While-Revalidate",
          "summary": "Phân tách Server State Cache (`staleTime`) khỏi Client UI State, cập nhật nền mượt mà.",
          "badge": "0ms Cache UI",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Optimistic Rollback",
          "summary": "Cập nhật UI ngay khi kéo thả Kanban và hoàn nguyên về snapshot cũ nếu API Server báo lỗi.",
          "badge": "Optimistic UI",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 3 · Socket & SSE",
          "badge": "HTTP 101",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "WebSocket Full-Duplex",
          "summary": "Nâng cấp từ HTTP 101 truyền tin 2 chiều độ trễ thấp, kèm Ping/Pong Heartbeat & Jitter Backoff.",
          "badge": "2-Way Channel",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "Server-Sent Events",
          "summary": "Luồng streaming 1 chiều siêu nhẹ trên HTTP chuẩn cho LLM AI token streaming.",
          "badge": "1-Way AI Stream",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 4 · Web Vitals 60fps",
          "badge": "Lighthouse 100",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "LCP / INP / CLS",
          "summary": "Đặt kích thước trước chống giật CLS <= 0.1; chia nhỏ Long Task < 50ms giữ INP <= 200ms.",
          "badge": "Vital Thresholds",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Windowing & GPU Layer",
          "summary": "List Virtualization chỉ render ~25 dòng nhìn thấy và chạy animation bằng `transform`/`opacity`.",
          "badge": "Zero Reflow",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-realtime-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-realtime-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-realtime-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-realtime-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-realtime-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-realtime-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "mobile": {
    "subjectId": "mobile",
    "subjectCode": "CS306",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Kiến trúc Flutter Engine, BLoC & Offline",
    "overviewStats": {
      "completionRate": 72,
      "totalXp": 230,
      "timeSpentMins": 45,
      "integrityScore": 100
    },
    "quickSummary": [
      "Flutter biên dịch AOT Dart và tự vẽ qua Impeller trên 3 cây: Widget (cấu hình) -> Element (BuildContext/State) -> RenderObject.",
      "Tách UI khỏi Business Logic bằng Cubit/BLoC Immutable State + Dart Sealed Class và `const` Widget cắt tỉa rebuild.",
      "Bảo vệ Auth Token bằng FlutterSecureStorage (Keychain/Keystore) và Dio Interceptor tự động Refresh Token."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS306: Flutter Mobile",
          "progressPct": 72,
          "xp": 230,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 1 · Flutter Engine",
          "badge": "3 Trees",
          "progressPct": 90,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Widget -> Element -> Render",
          "summary": "Widget bất biến nhẹ; Element giữ State và BuildContext leo ngược tìm InheritedWidget tổ tiên.",
          "badge": "Impeller 120fps",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "const & mounted Guard",
          "summary": "Gắn `const` bỏ qua diff nhánh tĩnh và kiểm tra `if (!mounted) return;` sau mọi thao tác `await`.",
          "badge": "Crash-Free",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 2 · BLoC / Cubit",
          "badge": "Unidirectional",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Event -> BLoC -> State",
          "summary": "UI phát Event và lắng nghe BlocBuilder với Sealed State Class bất biến.",
          "badge": "Sealed Dart 3",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "ListView.builder & GoRouter",
          "summary": "Lazy render theo viewport với `itemExtent` cố định và Auth Guard điều hướng tập trung.",
          "badge": "Smooth Scroll",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 3 · API & Storage",
          "badge": "Secure Auth",
          "progressPct": 60,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Dio JWT Interceptor",
          "summary": "Tự chèn Authorization Bearer Header và xoay vòng Refresh Token khi gặp 401.",
          "badge": "Auto Refresh",
          "progressPct": 65,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "FlutterSecureStorage",
          "summary": "Lưu Refresh Token vào Keychain/Keystore mã hóa phần cứng, tránh dùng SharedPreferences.",
          "badge": "Hardware Vault",
          "progressPct": 60,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Chặng 4 · Offline & Release",
          "badge": "Profile AOT",
          "progressPct": 65,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Offline-First SQLite",
          "summary": "Hiển thị bài giảng tức thì < 50ms từ Cache cục bộ rồi đồng bộ nền khi có mạng.",
          "badge": "Zero Spinner",
          "progressPct": 65,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Build AAB & Obfuscate",
          "summary": "Đo FPS bằng `--profile` và phát hành `.aab` release làm gọn + split-debug-info.",
          "badge": "Store Ready",
          "progressPct": 65,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-mobile-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-mobile-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-mobile-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-mobile-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-mobile-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-mobile-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "distributed": {
    "subjectId": "distributed",
    "subjectCode": "CS315",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Redis Cache, Apache Kafka & Hệ phân tán",
    "overviewStats": {
      "completionRate": 74,
      "totalXp": 250,
      "timeSpentMins": 50,
      "integrityScore": 100
    },
    "quickSummary": [
      "Redis Cache-Aside + Sorted Set xử lý 100k+ RPS dưới 1ms; chống Penetration/Stampede/Avalanche bằng Bloom Filter, Lock & Jitter.",
      "Apache Kafka lưu Append-Only Partitioned Log đảm bảo thứ tự theo Partition Key và Replay bằng Consumer Group Offset.",
      "Cân bằng CAP (CP vs AP), phân mảnh Sharding bằng Consistent Hashing và điều tiết API bằng Token Bucket Redis."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS315: Distributed Systems",
          "progressPct": 74,
          "xp": 250,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 1 · Redis Caching",
          "badge": "< 1ms RAM",
          "progressPct": 85,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Cache-Aside & ZSET",
          "summary": "Đọc Redis trước -> DB nếu miss -> `SETEX` TTL; dùng Sorted Set cho Leaderboard thời gian thực.",
          "badge": "Cache Hit",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Chống Stampede & Avalanche",
          "summary": "Khóa bằng Atomic `SET NX EX`, thêm Random TTL Jitter và cache giá trị Null ngắn hạn.",
          "badge": "Guard 3 Thảm họa",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 2 · Apache Kafka",
          "badge": "Commit Log",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Topic & Partition Key",
          "summary": "Gắn Key=`user_id` giúp mọi sự kiện cùng user vào đúng 1 Partition bảo toàn thứ tự.",
          "badge": "Ordered Log",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Idempotency & DLQ",
          "summary": "Lưu bảng `processed_events` tránh xử lý trùng và đẩy lỗi vĩnh viễn sang Dead Letter Queue.",
          "badge": "At-Least-Once+",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 3 · CAP & Hashing",
          "badge": "CP vs AP",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Định lý CAP Trade-off",
          "summary": "Chọn CP (Nhất quán) cho sổ cái giao dịch hoặc AP (Sẵn sàng) cho feed/cache khi mất mạng.",
          "badge": "Partition Guard",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "Consistent Hashing",
          "summary": "Vòng băm kết hợp Virtual Nodes giúp chỉ di chuyển 1/N key khi mở rộng số Node.",
          "badge": "Elastic Shard",
          "progressPct": 65,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 4 · Rate Limiter",
          "badge": "HTTP 429",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Token Bucket Lua",
          "summary": "Thực thi trừ token nguyên tử trên Redis dùng chung giữa nhiều instance Gateway.",
          "badge": "Burst Safe",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Transactional Outbox",
          "summary": "Ghi sự kiện cùng transaction PostgreSQL đảm bảo DB và Kafka không bao giờ lệch trạng thái.",
          "badge": "Zero Event Loss",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-distributed-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-distributed-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-distributed-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-distributed-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-distributed-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-distributed-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "security": {
    "subjectId": "security",
    "subjectCode": "CS312",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Bảo mật Web OWASP Top 10 & Auth Guard",
    "overviewStats": {
      "completionRate": 80,
      "totalXp": 260,
      "timeSpentMins": 50,
      "integrityScore": 100
    },
    "quickSummary": [
      "Chặn Top OWASP: Prepared Statements triệt tiêu SQLi, Ownership Query (`AND user_id = ?`) khóa chặt IDOR (A01).",
      "Phòng thủ trình duyệt: Auto-escape + DOMPurify + CSP chống XSS; Bearer Auth / SameSite Cookie chống CSRF.",
      "An toàn xác thực: Bcrypt/Argon2id + `secrets` CSPRNG cho 2FA OTP + Brute-Force Lockout 5 lần sai + Audit Trail."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS312: OWASP Security",
          "progressPct": 80,
          "xp": 260,
          "status": "completed"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Lớp 1 · A01 & Injection",
          "badge": "OWASP Top 3",
          "progressPct": 95,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Prepared Statements",
          "summary": "Truyền tham số ràng buộc `?` / `$1` tách rạch ròi mã lệnh SQL khỏi chuỗi dữ liệu người dùng.",
          "badge": "Zero SQLi",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Ownership Check (IDOR)",
          "summary": "Luôn đọc `user['id']` từ JWT đã xác thực và ràng buộc `AND user_id = ?` trên mọi ID resource.",
          "badge": "Anti-IDOR",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Lớp 2 · XSS & CSRF/CORS",
          "badge": "Browser Guard",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Output Escape & CSP",
          "summary": "Không dùng `dangerouslySetInnerHTML`, chặn `javascript:` URL và bật `Content-Security-Policy`.",
          "badge": "XSS Shield",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "HttpOnly + SameSite + CORS",
          "summary": "Khóa cookie bằng `HttpOnly; SameSite=Lax; Secure` và Whitelist chính xác CORS Origins.",
          "badge": "Anti-CSRF",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Lớp 3 · Crypto & 2FA OTP",
          "badge": "Bcrypt + CSPRNG",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Bcrypt Work Factor",
          "summary": "Băm mật khẩu kèm Salt riêng chống GPU Brute-Force và bảng cầu vồng Rainbow Table.",
          "badge": "Key Stretching",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "secrets OTP & Constant-Time",
          "summary": "Sinh OTP 6 số bằng `secrets.randbelow` và đối chiếu bằng `hmac.compare_digest`.",
          "badge": "Anti-Timing",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Lớp 4 · Brute-Force Guard",
          "badge": "HTTP 423 Lock",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Lockout 5 Lần Sai",
          "summary": "Tăng `failed_login_attempts`, khóa 15 phút (`423 Locked`) và xóa đếm khi đăng nhập đúng.",
          "badge": "Anti-Guessing",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Audit Log & Device Trust",
          "summary": "Ghi vết mọi hành động an ninh nhạy cảm và thu hồi ngay phiên JWT thiết bị lạ.",
          "badge": "Incident Ready",
          "progressPct": 80,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-security-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-security-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-security-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-security-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-security-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-security-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "ai-ml": {
    "subjectId": "ai-ml",
    "subjectCode": "CS410",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Mạng Nơ-ron, Backpropagation & Attention",
    "overviewStats": {
      "completionRate": 82,
      "totalXp": 270,
      "timeSpentMins": 55,
      "integrityScore": 100
    },
    "quickSummary": [
      "Hàm kích hoạt phi tuyến (ReLU/GELU) là bắt buộc để mạng sâu học ranh giới phức tạp; chia Train/Test trước khi fit Scaler.",
      "Training Loop PyTorch chuẩn 4 bước: `zero_grad()` -> Forward -> Loss -> `loss.backward()` (Chain Rule) -> `optimizer.step()`.",
      "Đo chuẩn Imbalanced bằng Precision/Recall/F1 thay cho Accuracy; Self-Attention `softmax(QK^T/sqrt(d_k))V` là lõi LLM."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS410: Deep ML Core",
          "progressPct": 82,
          "xp": 270,
          "status": "completed"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Chương 1 · Neural Net & Data",
          "badge": "MLP + ReLU",
          "progressPct": 95,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Phi tuyến ReLU & Dropout",
          "summary": "Ngăn các tầng tuyến tính gộp làm một, tránh Vanishing ở miền dương và chống Overfitting.",
          "badge": "Non-Linearity",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Chống Data Leakage",
          "summary": "Luôn `train_test_split` trước -> `fit()` Scaler/Imputer DUY NHẤT trên tập Train -> `transform` Test.",
          "badge": "Clean Pipeline",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Chương 2 · Optim & Backprop",
          "badge": "AdamW + Chain",
          "progressPct": 85,
          "status": "completed",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Gradient Descent Loop",
          "summary": "Luôn gọi `optimizer.zero_grad()` trước `backward()` để không tích lũy gradient qua các batch.",
          "badge": "PyTorch 4-Step",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Chain Rule & Skip Connect",
          "summary": "Lan truyền ngược sai số qua đồ thị Autograd kết hợp Residual `x + F(x)` & `clip_grad_norm_`.",
          "badge": "Stable Grad",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Chương 3 · Metrics & Variance",
          "badge": "Precision / F1",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Bias vs Variance",
          "summary": "Phát hiện Underfitting/Overfitting qua đường cong Train vs Val Loss và dùng Early Stopping.",
          "badge": "Generalization",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "Confusion Matrix & F1",
          "summary": "Dùng Precision, Recall và F1-Score thay vì Accuracy giả tạo trên tập dữ liệu lệch nhãn.",
          "badge": "Imbalanced Eval",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Chương 4 · Self-Attention",
          "badge": "Transformer Core",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Q · K^T / sqrt(d_k)",
          "summary": "Chia cho căn bậc hai chiều vector giữ phương sai ổn định trước khi đưa qua Softmax.",
          "badge": "Scaled Attn",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Multi-Head Embeddings",
          "summary": "Nắm bắt song song nhiều ngữ cảnh xa trong câu — nền móng trực tiếp của LLM & RAG.",
          "badge": "Foundation AI",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-ai-ml-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-ai-ml-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-ai-ml-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-ai-ml-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-ai-ml-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-ai-ml-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "devops": {
    "subjectId": "devops",
    "subjectCode": "CS405",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Docker Containers, Compose & CI/CD Pipeline",
    "overviewStats": {
      "completionRate": 84,
      "totalXp": 260,
      "timeSpentMins": 50,
      "integrityScore": 100
    },
    "quickSummary": [
      "Multi-Stage Build + `.dockerignore` + thứ tự `COPY lockfile` trước `COPY . .` giúp giảm 90% dung lượng và tăng tốc Layer Cache.",
      "Docker Compose dùng Named Volumes bảo toàn DB, DNS nội bộ theo Service Name và `condition: service_healthy`.",
      "GitHub Actions CI khóa `--frozen-lockfile`, chạy Pytest/Vite Build bắt buộc và gắn Tag Image bất biến theo Git SHA."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS405: DevOps & CI/CD",
          "progressPct": 84,
          "xp": 260,
          "status": "completed"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Phần 1 · Container Engine",
          "badge": "WSL2 & Sandbox",
          "progressPct": 100,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "Namespaces & Cgroups",
          "summary": "Cô lập tiến trình & giới hạn `--memory`, `--cpus`, `--network=none` cho Sandbox chạy code.",
          "badge": "Linux Isolation",
          "progressPct": 100,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Multi-Stage Dockerfile",
          "summary": "Biên dịch ở Stage Builder rồi chỉ copy artifact sạch sang Alpine/Distroless Stage Runner.",
          "badge": "< 50MB Image",
          "progressPct": 95,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Phần 2 · Layer & Security",
          "badge": "Non-root User",
          "progressPct": 85,
          "status": "completed",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Tối ưu Layer Caching",
          "summary": "Đặt bước `COPY package.json lockfile` + `install` lên trên để tránh tải lại thư viện khi sửa code.",
          "badge": "Fast Build",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Non-root & .dockerignore",
          "summary": "Chuyển `USER appuser` chống leo thang đặc quyền và loại `.env`/`.git`/`node_modules` khỏi context.",
          "badge": "Hardened Image",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Phần 3 · Docker Compose",
          "badge": "Multi-Service",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Named Volumes & DNS",
          "summary": "Giữ bền DB ngoài vòng đời Container; kết nối DB qua hostname service (`db:5432`, KHÔNG `localhost`).",
          "badge": "Persistent DB",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "Healthcheck & Startup",
          "summary": "Dùng `pg_isready` kết hợp `condition: service_healthy` đảm bảo API bật sau khi Postgres sẵn sàng.",
          "badge": "Zero Race Init",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Phần 4 · GitHub Actions",
          "badge": "CI/CD SHA Tag",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "CI Gates (--frozen-lockfile)",
          "summary": "Ép mọi PR qua Pytest + TypeCheck + Vite Build tự động với dependencies khóa chặt phiên bản.",
          "badge": "Reproducible CI",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Blue-Green & SHA Tags",
          "summary": "Push tag bất biến theo `github.sha` để Rollback dưới 5 giây không downtime.",
          "badge": "Zero Downtime",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-devops-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-devops-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-devops-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-devops-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-devops-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-devops-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "cloud": {
    "subjectId": "cloud",
    "subjectCode": "CS415",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Cloud Native AWS, Kubernetes & Observability",
    "overviewStats": {
      "completionRate": 75,
      "totalXp": 250,
      "timeSpentMins": 50,
      "integrityScore": 100
    },
    "quickSummary": [
      "Microservices giao tiếp Sync bằng gRPC Protobuf và Async qua Kafka; tách dữ liệu bằng Database-per-Service.",
      "Kubernetes điều phối Pod bằng Deployment + Service ClusterIP/Ingress, phân biệt rõ `readinessProbe` vs `livenessProbe`.",
      "File upload đưa sang Private S3 + Pre-signed URLs; scale tự động bằng HPA và giám sát qua OpenTelemetry + p95/p99."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS415: Cloud & K8s",
          "progressPct": 75,
          "xp": 250,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 1 · Cloud Native",
          "badge": "12-Factor App",
          "progressPct": 85,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "gRPC vs Async Events",
          "summary": "Tốc độ cao nội bộ dùng HTTP/2 gRPC Protobuf; tách lỏng tác vụ nền chịu lỗi bằng Queue/Kafka.",
          "badge": "Service Mesh",
          "progressPct": 90,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "Private S3 & Pre-signed URL",
          "summary": "Client tải thẳng file nặng lên Object Storage qua URL ký 60s kết hợp IAM Role tối thiểu.",
          "badge": "Stateless App",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 2 · Kubernetes Core",
          "badge": "Pods & Deploy",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Deployment Self-Healing",
          "summary": "Control Plane (`etcd` + Scheduler) tự giữ đúng số Replica khỏe mạnh khi Node gặp sự cố.",
          "badge": "Desired State",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Service DNS & Ingress L7",
          "summary": "Định tuyến ổn định tới các Pod đổi IP liên tục và cấu hình Routing HTTPS qua một Ingress duy nhất.",
          "badge": "L7 Gateway",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 3 · Stability Probes",
          "badge": "Requests/Limits",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Readiness vs Liveness",
          "summary": "Readiness rút Pod chưa sẵn sàng khỏi Service; Liveness chỉ restart khi tiến trình treo nội tại.",
          "badge": "Smart Probes",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "CPU/Memory Resource Spec",
          "summary": "Luôn khai báo `requests` (để HPA và Scheduler hoạt động) và `limits` chống OOMKill dây chuyền.",
          "badge": "QoS Guard",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Mảng 4 · HPA & Telemetry",
          "badge": "p95/p99 Traces",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "HPA Auto-Scaling",
          "summary": "Co giãn số Pod tự động theo tải CPU/Queue với `minReplicas >= 2` giữ High Availability.",
          "badge": "Elastic Cloud",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Logs + Metrics + Traces",
          "summary": "Gắn `X-Request-ID` xuyên suốt dịch vụ, cảnh báo theo đuôi trễ p95/p99 thay vì số trung bình.",
          "badge": "OpenTelemetry",
          "progressPct": 75,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-cloud-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-cloud-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-cloud-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-cloud-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-cloud-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-cloud-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },

  "capstone": {
    "subjectId": "capstone",
    "subjectCode": "CS499",
    "title": "Sơ Đồ Tư Duy Tổng Kết: Kiến trúc Enterprise & Bảo vệ Đồ án CS499",
    "overviewStats": {
      "completionRate": 78,
      "totalXp": 350,
      "timeSpentMins": 60,
      "integrityScore": 100
    },
    "quickSummary": [
      "Thiết kế Architecture Blueprint + ADR (ngữ cảnh, quyết định, trade-offs) kèm SLO nội bộ chặt hơn SLA cam kết.",
      "Xây dựng Monorepo Fullstack liên thông dữ liệu thật qua 3 vai trò (Student · Instructor · Admin) và RBAC chặt chẽ.",
      "Chứng minh chất lượng bằng Tháp Kiểm thử (Pytest Integration + E2E F5 Persist + Build) và Bảo vệ Trade-off trước Hội đồng."
    ],
    "nodes": [
      {
        "id": "root",
        "type": "compactTreeNode",
        "position": {
          "x": 40,
          "y": 580
        },
        "data": {
          "nodeType": "root",
          "title": "CS499: Enterprise Capstone",
          "progressPct": 78,
          "xp": 350,
          "status": "in-progress"
        }
      },
      {
        "id": "b-1",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 95
        },
        "data": {
          "nodeType": "branch",
          "title": "Cột mốc 1 · Blueprint & SLO",
          "badge": "ADR Design",
          "progressPct": 90,
          "status": "completed",
          "tone": "blue"
        }
      },
      {
        "id": "l-1-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 20
        },
        "data": {
          "nodeType": "leaf",
          "title": "ADR & Back-of-Envelope",
          "summary": "Ước lượng QPS, lưu trữ và ghi rõ lý do chọn giải pháp kèm đánh đổi kỹ thuật.",
          "badge": "Design Trade-off",
          "progressPct": 95,
          "status": "completed"
        }
      },
      {
        "id": "l-1-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 175
        },
        "data": {
          "nodeType": "leaf",
          "title": "SLI -> SLO -> SLA Margin",
          "summary": "Giữ Error Budget và đặt mục tiêu SLO nội bộ cao hơn cam kết hợp đồng SLA.",
          "badge": "99.9% Uptime",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "b-2",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 420
        },
        "data": {
          "nodeType": "branch",
          "title": "Cột mốc 2 · End-to-End Flow",
          "badge": "3 Roles Sync",
          "progressPct": 80,
          "status": "in-progress",
          "tone": "purple"
        }
      },
      {
        "id": "l-2-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 345
        },
        "data": {
          "nodeType": "leaf",
          "title": "Cross-Module SQLite Sync",
          "summary": "Liên thông Student Learning <-> Git PR & Kanban <-> Instructor Dual Grading <-> Admin Audit.",
          "badge": "Single Truth",
          "progressPct": 85,
          "status": "completed"
        }
      },
      {
        "id": "l-2-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 500
        },
        "data": {
          "nodeType": "leaf",
          "title": "Bền dữ liệu sau F5",
          "summary": "Mọi thao tác người dùng ghi xuống SQLite Transaction và đóng Lock trước khi ghi Audit.",
          "badge": "Zero Mock Bug",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "b-3",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 745
        },
        "data": {
          "nodeType": "branch",
          "title": "Cột mốc 3 · Test Pyramid",
          "badge": "Pytest + E2E",
          "progressPct": 75,
          "status": "in-progress",
          "tone": "amber"
        }
      },
      {
        "id": "l-3-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 670
        },
        "data": {
          "nodeType": "leaf",
          "title": "Pytest RBAC Integration",
          "summary": "Bao phủ toàn bộ nhánh 200/201/401/403/423 và idempotent XP/submission.",
          "badge": "7/7 Suites Pass",
          "progressPct": 80,
          "status": "in-progress"
        }
      },
      {
        "id": "l-3-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 825
        },
        "data": {
          "nodeType": "leaf",
          "title": "E2E & HTTPS Production",
          "summary": "0 Console Errors, 0 HTTP >= 400, Backup/Restore đã kiểm thử và Secret không lọt vào Git.",
          "badge": "Shippable App",
          "progressPct": 70,
          "status": "in-progress"
        }
      },
      {
        "id": "b-4",
        "type": "compactTreeNode",
        "position": {
          "x": 330,
          "y": 1070
        },
        "data": {
          "nodeType": "branch",
          "title": "Cột mốc 4 · AI Defense",
          "badge": "Hội đồng CS499",
          "progressPct": 70,
          "status": "in-progress",
          "tone": "emerald"
        }
      },
      {
        "id": "l-4-1",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 995
        },
        "data": {
          "nodeType": "leaf",
          "title": "Self-Audit Git Diff",
          "summary": "Kiểm toán sạch code trước khi nộp: DRY helper, Guard Clauses và Docstring rõ ràng.",
          "badge": "Clean Code",
          "progressPct": 75,
          "status": "in-progress"
        }
      },
      {
        "id": "l-4-2",
        "type": "compactTreeNode",
        "position": {
          "x": 620,
          "y": 1150
        },
        "data": {
          "nodeType": "leaf",
          "title": "Phản biện 4 Bước STAR",
          "summary": "Trình bày tự tin Bối cảnh -> Lựa chọn -> Đánh đổi -> Lộ trình Scale gấp 100x.",
          "badge": "Defense Ready",
          "progressPct": 70,
          "status": "in-progress"
        }
      }
    ],
    "edges": [
      {
        "id": "e-capstone-b1",
        "source": "root",
        "target": "b-1",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-capstone-1-l1",
        "source": "b-1",
        "target": "l-1-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-1-l2",
        "source": "b-1",
        "target": "l-1-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-b2",
        "source": "root",
        "target": "b-2",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-capstone-2-l1",
        "source": "b-2",
        "target": "l-2-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-2-l2",
        "source": "b-2",
        "target": "l-2-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-b3",
        "source": "root",
        "target": "b-3",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-capstone-3-l1",
        "source": "b-3",
        "target": "l-3-1",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-3-l2",
        "source": "b-3",
        "target": "l-3-2",
        "style": {
          "stroke": "#94a3b8",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-b4",
        "source": "root",
        "target": "b-4",
        "animated": true,
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 2
        }
      },
      {
        "id": "e-capstone-4-l1",
        "source": "b-4",
        "target": "l-4-1",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      },
      {
        "id": "e-capstone-4-l2",
        "source": "b-4",
        "target": "l-4-2",
        "style": {
          "stroke": "#64748b",
          "strokeWidth": 1.5
        }
      }
    ]
  },
};

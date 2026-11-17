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
      "Kế thừa (extends) tái sử dụng mã nguồn theo quan hệ 'is-a'; dùng super() khởi tạo lớp cha.",
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
          title: "extends (is-a)",
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
          title: "super() constructor",
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
          title: "@Override method",
          summary: "Định nghĩa lại hành vi phương thức của lớp cha tại runtime; không được thu hẹp quyền truy cập.",
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
          summary: "Bảng con trỏ hàm ảo giúp máy ảo tra cứu địa chỉ hàm đa hình tại runtime với tốc độ O(1).",
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
          summary: "Ép kiểu an toàn từ lớp con lên cha và ngược lại, ngăn ngừa lỗi bộ nhớ ClassCastException.",
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
          badge: "C++ / Java",
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

};

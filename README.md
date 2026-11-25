# CodeMind AI — Learning OS

> [!IMPORTANT]
> **Bản quyền & Quyền truy cập (`All Rights Reserved`):**
> Toàn bộ mã nguồn trong kho lưu trữ này thuộc quyền sở hữu của **Nguyễn Bá Hòa (`@Hoaba-clouch`)**. Kho mã nguồn được công khai **chỉ phục vụ mục đích chấm điểm học phần và đánh giá của Giảng viên / Hội đồng**. Không có bất kỳ giấy phép mã nguồn mở nào được cấp; nghiêm cấm sao chép, chỉnh sửa, nộp lại hoặc thương mại hóa dưới mọi hình thức. Xem chi tiết tại [LICENSE](./LICENSE).

---

## Thông tin Tác giả & Xác thực Chính chủ

| Thuộc tính | Thông tin chính thức |
| --- | --- |
| **Tác giả chính** | Nguyễn Bá Hòa |
| **GitHub** | [https://github.com/Hoaba-clouch](https://github.com/Hoaba-clouch) |
| **Email liên hệ** | `bahoa12346@gmail.com` |
| **Kho mã nguồn gốc** | [https://github.com/Hoaba-clouch/E-learningProject](https://github.com/Hoaba-clouch/E-learningProject) |
| **Giấy phép** | `UNLICENSED` — All Rights Reserved ([LICENSE](./LICENSE)) |

> **Xác minh lịch sử phát triển gốc:** Toàn bộ dấu mốc phát triển theo ngày được giữ nguyên trong lịch sử commit trên kho gốc `Hoaba-clouch/E-learningProject` (có thể đối chiếu trực tiếp tại tab **Commits** và **Insights → Contributors / Network** trên GitHub).

---

## Kiến trúc & Phân hệ chính

CodeMind AI — Learning OS là nền tảng học tập kỹ thuật phần mềm theo định hướng thực chiến dự án và phản biện AI:

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, GSAP, React Flow (`@xyflow/react`).
- **Backend:** FastAPI, SQLAlchemy (hỗ trợ MySQL / SQLite), chuẩn **CodeMind MCP Server 2024-11-05** (JSON-RPC 2.0) kèm phân quyền RBAC.
- **3 vai trò hệ thống:**
  - **Học viên:** Không gian học tập đa chế độ (Bài đọc, Video tương tác, Quiz, Code Lab, Sơ đồ tư duy), quản lý Đồ án / Team / Kanban / Git Hub, Luyện tập & Bảo vệ Đồ án AI.
  - **Giảng viên:** Bảng điều phối lớp học phần, chấm bài tập chương, duyệt Pull Request / DoD và chấm Hội đồng bảo vệ đồ án.
  - **Quản trị viên:** Quản lý người dùng & RBAC, lớp học phần, thiết bị & phiên bảo mật, nhật ký và cấu hình MCP Hub.

---

## Hướng dẫn chạy cục bộ (Local Setup for Grading)

### 1. Chuẩn bị cấu hình Backend

Sao chép tệp mẫu cấu hình môi trường (không đưa bí mật thật vào Git) và cài đặt các gói Python trong thư mục `backend/`:

```powershell
cd backend
copy .env.example .env
pip install -r requirements.txt
```

Chỉnh các biến cần thiết trong `backend/.env` theo môi trường cục bộ của máy chấm trước khi khởi chạy.

### 2. Chạy Backend API (FastAPI)

Từ thư mục gốc dự án:

```powershell
npm run dev:backend
```

Mặc định Backend phục vụ tại `http://127.0.0.1:8000` (health check: `http://127.0.0.1:8000/health/ready`).

### 3. Cài đặt và chạy Frontend (Vite)

Mở terminal mới tại thư mục gốc dự án:

```powershell
npm install
npm run dev
```

Mặc định Frontend chạy tại `http://localhost:8443`.

---

## Bản quyền (License)

Dự án phát hành theo chế độ **`UNLICENSED — All Rights Reserved`**. Vui lòng đọc toàn văn điều khoản bảo lưu bản quyền tại [LICENSE](./LICENSE).

# CODEMIND MODEL CONTEXT PROTOCOL (MCP) SERVER
> **Phiên bản:** 1.0.0 | **Chuẩn:** MCP 2024-11-05 (JSON-RPC 2.0)  
> **Transports:** `stdio` (Command-line / Claude / Cursor) & `HTTP-RPC` (`/v1/mcp/rpc`)  
> **Cơ sở dữ liệu:** MySQL 8.0 Live Production Database

---

## 1. Giới thiệu Tổng quan
**CodeMind MCP Server** là cầu nối tiêu chuẩn công nghiệp (Model Context Protocol) cho phép các Hệ thống Trí tuệ Nhân tạo thế hệ mới (**Google Antigravity, Anthropic Claude Desktop, Cursor AI, Windsurf**) tương tác hai chiều trực tiếp với Hệ sinh thái Đào tạo Kỹ sư **CodeMind AI Learning OS**:

1. **Truy vấn Dữ liệu Thực tế (Read Operations):**
   - Đồ án kỹ thuật (`engineering_projects`) và kho mã nguồn (`git_repositories`).
   - Bảng công việc Kanban (`engineering_tasks`) kèm trạng thái, checklist, Definition of Done.
   - Lịch sử Git Commits & Pull Requests kèm điểm phân tích AI Code Review (`git_commits`, `git_pull_requests`).
   - Lịch bảo vệ, lịch hẹn 1-on-1 (`academic_schedules`).
   - Phiên phản biện đồ án AI Defense & Chấm điểm kép Dual Grading (`defense_sessions`, `dual_submissions`).
   - Hồ sơ học tập và biểu đồ Radar 5 kỹ năng của sinh viên (`student_profiles`).

2. **Cập nhật & Điều phối An toàn (Controlled Write Operations):**
   - Khởi tạo công việc mới (`create_kanban_task`) với checklist, DoD và audit log.
   - Di chuyển trạng thái Task (`move_kanban_task`) với **Kiểm tra nghiêm ngặt Ràng buộc H2 (Hard Constraint H2)**: Task phụ thuộc phải hoàn thành (`done` hoặc `verified`) trước khi task con được phép chuyển sang hoàn thành.
   - Tự động tích lũy điểm kinh nghiệm (XP) và năng lực nhóm vào hồ sơ sinh viên khi Task được nghiệm thu.
   - Thẩm định và ghi nhận phán quyết của Hội đồng Phản biện AI (`submit_ai_defense_audit`).

---

## 2. Danh mục 11 MCP Tools

| STT | Tên Tool | Quyền | Mô tả Nghiệp vụ |
|:---:|---|:---:|---|
| 1 | `list_projects` | Read | Lấy danh sách đồ án, kèm tiến độ sprint, số task, commits và thành viên. |
| 2 | `get_project_detail` | Read | Chi tiết một đồ án: Git repo, phân bổ tasks theo cột, danh sách thành viên. |
| 3 | `list_kanban_tasks` | Read | Lấy danh sách task của đồ án, hỗ trợ lọc theo cột, assignee, độ ưu tiên. |
| 4 | `create_kanban_task` | Write | Tạo task mới, tự sinh mã code, khởi tạo DoD, checklist và audit log. |
| 5 | `move_kanban_task` | Write | Chuyển cột task, **bảo vệ Ràng buộc H2**, ghi audit log và thưởng XP. |
| 6 | `list_git_commits` | Read | Lấy danh sách commits (SHA, branch, tác giả, file thay đổi, diff stats). |
| 7 | `list_pull_requests` | Read | Lấy danh sách PRs kèm điểm AI Review, blast radius và câu hỏi phản biện. |
| 8 | `list_academic_schedules` | Read | Xem lịch bảo vệ đồ án, cố vấn 1-on-1, lịch thi theo giảng viên/khóa học. |
| 9 | `list_defense_sessions` | Read | Xem các phiên phản biện AI Defense, điểm 3 vòng và phát hiện gian lận. |
| 10 | `get_student_analytics` | Read | Lấy hồ sơ học tập: XP, level, streak, biểu đồ radar 5 kỹ năng công nghiệp. |
| 11 | `submit_ai_defense_audit` | Write | Hội đồng AI ghi nhận nhận xét, điều chỉnh điểm và ghi audit log bảo mật. |

---

## 3. Danh mục MCP Resources & Prompts

### Resources (`codemind://...`)
- `codemind://system/stats`: Thống kê thời gian thực toàn hệ thống (tổng SV, tổng đồ án, tổng tasks, tỉ lệ hoàn thành, tổng commits).
- `codemind://projects`: Danh mục tổng quan tất cả đồ án kỹ thuật đang hoạt động.
- `codemind://projects/{project_id}`: Toàn bộ snapshot ngữ cảnh của một đồ án (thông tin + tasks + commits).

### Prompts Templates
- `kanban_sprint_summary`: Prompt yêu cầu AI đọc DB thực và lập báo cáo tiến độ Sprint, phát hiện blocker.
- `ai_code_defense_prep`: Prompt kích hoạt Hội đồng Phản biện AI 3 vòng (Kiến trúc, Thuật toán, Production).

---

## 4. Hướng dẫn Kết nối Client

### 4.1. Kết nối với Claude Desktop
Mở file cấu hình của Claude Desktop:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Thêm cấu hình:
```json
{
  "mcpServers": {
    "codemind": {
      "command": "python",
      "args": ["-m", "app.mcp.server"],
      "cwd": "d:/C++/ul/backend",
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
    }
  }
}
```

### 4.2. Kết nối với Cursor AI
Vào **Cursor Settings** -> **Features** -> **MCP**:
- **Type:** `command`
- **Command:** `python -m app.mcp.server`
- **Directory:** `d:/C++/ul/backend`

### 4.3. Gọi trực tiếp qua HTTP REST (FastAPI)
Ngoài stdio, CodeMind MCP Server còn mở sẵn HTTP RPC endpoint:
- **Thông tin server & tools:** `GET http://127.0.0.1:8000/v1/mcp/info`
- **Gọi JSON-RPC 2.0:** `POST http://127.0.0.1:8000/v1/mcp/rpc`

Ví dụ payload cURL:
```bash
curl -X POST http://127.0.0.1:8000/v1/mcp/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_projects",
      "arguments": { "limit": 3 }
    }
  }'
```

---

## 5. Kịch bản Trình diễn (Demo Scenario) Ngày Mai Khi Bảo Vệ

1. **Khởi động Server:**
   ```bash
   cd d:\C++\ul\backend
   python -m app.mcp.server
   ```
2. **Kịch bản 1: AI Agent truy vấn tiến độ đồ án:**
   - Hỏi Agent: *"Hãy kiểm tra tiến độ đồ án E-Commerce Platform và cho biết hiện có bao nhiêu task đã xong?"*
   - Agent gọi tool `list_projects` -> `get_project_detail` -> Đọc MySQL 8.0 thực tế và phản hồi chính xác số lượng.

3. **Kịch bản 2: AI Agent tạo task mới và di chuyển:**
   - Bảo Agent: *"Hãy tạo một task 'Tối ưu hóa Index MySQL' 5 story points cho đồ án này và chuyển sang In Progress."*
   - Agent gọi `create_kanban_task` -> `move_kanban_task` -> Task xuất hiện ngay trên giao diện Kanban của hệ thống!

4. **Kịch bản 3: Thử thách Ràng buộc H2 (Hard Constraint):**
   - Bảo Agent chuyển một task con có phụ thuộc sang trạng thái Hoàn thành (`done`).
   - Hệ thống MCP Server từ chối ngay lập tức và trả thông báo vi phạm Ràng buộc H2, chứng minh tính toàn vẹn nghiệp vụ chuẩn mực!

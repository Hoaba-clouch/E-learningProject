import { useState, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  X,
  PlusCircle,
  RefreshCw,
  Info,
  CheckCircle2,
  TableProperties
} from "lucide-react";
import type { KanbanTask, TeamMember, ColumnId } from "../screens/KanbanBoard";

export const TEACHER_CSV_TEMPLATE = `STT,Ngày (*),Sprint,Tên task (*),Mô tả / yêu cầu,Điểm (*),Yêu cầu nộp,Bonus
1,1,1,Phân tích yêu cầu,Viết tài liệu mô tả chức năng,5,Link,
2,3,,Thiết kế cơ sở dữ liệu,Vẽ ERD và nộp file ảnh,"7,5",File,
3,5,,Họp nhóm tổng kết sprint,,2,Không,
4,6,,Làm bản demo nâng cao,,3,Link,x
Cột,Bắt buộc,Giá trị hợp lệ
STT,Không,"Số, chỉ để sắp xếp; trống = theo thứ tự dòng"
Ngày,Có,Số nguyên 1–365 = ngày làm việc thứ N của dự án
Sprint,Không,Số nguyên ≥ 1; trống = làm tròn lên (Ngày / số ngày mỗi sprint)
Tên task,Có,Tối đa 200 ký tự
Mô tả / yêu cầu,Không,Tối đa 2000 ký tự
Điểm,Có,"Số > 0, tối đa 1000, tối đa 2 chữ số thập phân (7,5 hoặc 7.5)"
Yêu cầu nộp,Không,Không / Link / File / Link hoặc file (hoặc NONE / LINK / FILE / LINK_OR_FILE); trống = Không
Bonus,Không,"Ghi x (hoặc Có / Yes / TRUE) nếu là task bonus: không làm không bị trừ điểm, làm thì được cộng; trống (hoặc Không / No / FALSE) = task thường"
,,
Các dòng chữ nghiêng là dòng mẫu: sửa thành dữ liệu thật hoặc xoá đi. Giữ nguyên thì không được nhập.,,`;

export interface ParsedCsvTaskRow {
  rowIndex: number;
  stt: number;
  projectDay: number;
  sprintNumber: number;
  title: string;
  description: string;
  points: number;
  submissionRequirement: "Không" | "Link" | "File" | "Link hoặc file";
  isBonus: boolean;
  isValid: boolean;
  isSampleRow: boolean;
  errors: string[];
  warnings: string[];
}

interface TaskCsvManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: KanbanTask[];
  teamMembers: TeamMember[];
  onImportTasks: (newTasks: KanbanTask[]) => void;
}

// RFC-4180 CSV Parser
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export default function TaskCsvManagerModal({
  isOpen,
  onClose,
  tasks,
  teamMembers,
  onImportTasks,
}: TaskCsvManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "template" | "export">("import");
  const [csvRawText, setCsvRawText] = useState("");
  const [daysPerSprint, setDaysPerSprint] = useState<number>(7);
  const [targetColumn, setTargetColumn] = useState<ColumnId>("backlog");
  const [assignmentMode, setAssignmentMode] = useState<"round-robin" | string>("round-robin");
  const [ignoreSampleRows, setIgnoreSampleRows] = useState<boolean>(true);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse and validate rows
  const parsedData = useMemo(() => {
    if (!csvRawText.trim()) return { rows: [], validCount: 0, errorCount: 0, totalPoints: 0, bonusCount: 0 };

    const rawRows = parseCsv(csvRawText);
    const parsedRows: ParsedCsvTaskRow[] = [];
    let lineOrder = 0;

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row.length === 0 || row.every((c) => !c)) continue;

      const firstCell = (row[0] || "").toLowerCase();
      // Skip header row
      if (firstCell === "stt" || (row[1] && row[1].toLowerCase().includes("ngày"))) {
        continue;
      }

      // Stop/skip metadata guide block
      if (firstCell === "cột" || firstCell.startsWith("các dòng") || (row[1] && row[1].toLowerCase() === "bắt buộc")) {
        continue;
      }

      lineOrder++;
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. STT
      const rawStt = row[0] ? parseInt(row[0], 10) : NaN;
      const stt = !isNaN(rawStt) && rawStt > 0 ? rawStt : lineOrder;

      // 2. Ngày (*) - Bắt buộc (1 - 365)
      const rawDayStr = (row[1] || "").trim();
      const rawDay = parseInt(rawDayStr, 10);
      let projectDay = 1;
      if (!rawDayStr) {
        errors.push("Thiếu cột 'Ngày (*)' bắt buộc");
      } else if (isNaN(rawDay) || rawDay < 1 || rawDay > 365) {
        errors.push(`Ngày '${rawDayStr}' không hợp lệ (phải là số nguyên 1 - 365)`);
      } else {
        projectDay = rawDay;
      }

      // 3. Sprint - Không bắt buộc, số nguyên >= 1; nếu trống = ceil(Ngày / daysPerSprint)
      const rawSprintStr = (row[2] || "").trim();
      const rawSprint = rawSprintStr ? parseInt(rawSprintStr, 10) : NaN;
      let sprintNumber = Math.max(1, Math.ceil(projectDay / daysPerSprint));
      if (rawSprintStr) {
        if (isNaN(rawSprint) || rawSprint < 1) {
          warnings.push(`Sprint '${rawSprintStr}' không hợp lệ, tự động tính = ${sprintNumber}`);
        } else {
          sprintNumber = rawSprint;
        }
      }

      // 4. Tên task (*) - Bắt buộc, max 200 ký tự
      const rawTitle = (row[3] || "").trim();
      if (!rawTitle) {
        errors.push("Tên task (*) không được để trống");
      } else if (rawTitle.length > 200) {
        errors.push(`Tên task vượt quá 200 ký tự (${rawTitle.length} ký tự)`);
      }

      // 5. Mô tả / yêu cầu - max 2000 ký tự
      const rawDescription = (row[4] || "").trim();
      if (rawDescription.length > 2000) {
        warnings.push(`Mô tả quá dài (> 2000 ký tự), sẽ được rút gọn`);
      }

      // 6. Điểm (*) - Bắt buộc, > 0, tối đa 1000, tối đa 2 chữ số thập phân (chấp nhận 7,5 hoặc 7.5)
      const rawPointsStr = (row[5] || "").trim().replace(",", ".");
      const rawPoints = parseFloat(rawPointsStr);
      let points = 1;
      if (!rawPointsStr) {
        errors.push("Thiếu cột 'Điểm (*)' bắt buộc");
      } else if (isNaN(rawPoints) || rawPoints <= 0 || rawPoints > 1000) {
        errors.push(`Điểm '${row[5]}' không hợp lệ (phải là số > 0 và <= 1000)`);
      } else {
        points = Math.round(rawPoints * 100) / 100;
      }

      // 7. Yêu cầu nộp: Không / Link / File / Link hoặc file (hoặc NONE / LINK / FILE / LINK_OR_FILE)
      const rawReq = (row[6] || "").trim().toLowerCase();
      let submissionRequirement: "Không" | "Link" | "File" | "Link hoặc file" = "Không";
      if (!rawReq || rawReq === "không" || rawReq === "none") {
        submissionRequirement = "Không";
      } else if (rawReq.includes("hoặc") || rawReq.includes("or") || (rawReq.includes("link") && rawReq.includes("file"))) {
        submissionRequirement = "Link hoặc file";
      } else if (rawReq.includes("link")) {
        submissionRequirement = "Link";
      } else if (rawReq.includes("file")) {
        submissionRequirement = "File";
      } else {
        warnings.push(`Yêu cầu nộp '${row[6]}' chưa chuẩn, mặc định là 'Không'`);
        submissionRequirement = "Không";
      }

      // 8. Bonus: x, Có, Yes, TRUE -> true; ngược lại false
      const rawBonus = (row[7] || "").trim().toLowerCase();
      const isBonus = ["x", "có", "yes", "true"].includes(rawBonus);

      // Check sample row from teacher's spec
      const isSampleRow =
        (rawTitle === "Phân tích yêu cầu" && rawDescription.includes("Viết tài liệu mô tả chức năng")) ||
        (rawTitle === "Thiết kế cơ sở dữ liệu" && rawDescription.includes("Vẽ ERD")) ||
        rawTitle === "Họp nhóm tổng kết sprint" ||
        rawTitle === "Làm bản demo nâng cao";

      if (isSampleRow) {
        warnings.push("Dòng dữ liệu mẫu từ tài liệu hướng dẫn của Thầy");
      }

      const isValid = errors.length === 0;

      parsedRows.push({
        rowIndex: r + 1,
        stt,
        projectDay,
        sprintNumber,
        title: rawTitle,
        description: rawDescription,
        points,
        submissionRequirement,
        isBonus,
        isValid,
        isSampleRow,
        errors,
        warnings,
      });
    }

    const validCount = parsedRows.filter((row) => row.isValid && (!ignoreSampleRows || !row.isSampleRow)).length;
    const errorCount = parsedRows.filter((row) => !row.isValid).length;
    const totalPoints = parsedRows
      .filter((row) => row.isValid && (!ignoreSampleRows || !row.isSampleRow))
      .reduce((sum, r) => sum + r.points, 0);
    const bonusCount = parsedRows.filter(
      (row) => row.isValid && (!ignoreSampleRows || !row.isSampleRow) && row.isBonus
    ).length;

    return {
      rows: parsedRows,
      validCount,
      errorCount,
      totalPoints: Math.round(totalPoints * 100) / 100,
      bonusCount,
    };
  }, [csvRawText, daysPerSprint, ignoreSampleRows]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvRawText(content);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Download Teacher Template
  const handleDownloadTemplate = () => {
    const bom = "\uFEFF";
    const blob = new Blob([bom + TEACHER_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mau_task_sprint_thay_phuoc.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Current Tasks to CSV
  const exportCsvContent = useMemo(() => {
    const header = "STT,Ngày (*),Sprint,Tên task (*),Mô tả / yêu cầu,Điểm (*),Yêu cầu nộp,Bonus\n";
    const lines = tasks.map((task, index) => {
      const stt = index + 1;
      const day = task.projectDay || 1;
      const sprint = task.sprintNumber || 1;
      const title = `"${(task.title || "").replace(/"/g, '""')}"`;
      const desc = `"${(task.description || "").replace(/"/g, '""')}"`;
      const pts = task.points;
      const req = task.submissionRequirement || (task.deliverable?.type === "test" ? "Không" : task.deliverable?.type === "pr" ? "Link" : "Không");
      const bonus = task.isBonus ? "x" : "";

      return `${stt},${day},${sprint},${title},${desc},${pts},${req},${bonus}`;
    });

    return header + lines.join("\n");
  }, [tasks]);

  const handleDownloadExport = () => {
    const bom = "\uFEFF";
    const blob = new Blob([bom + exportCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `danh_sach_task_kanban_sprint_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportCsvContent);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Execute Import
  const handleExecuteImport = () => {
    const validRowsToImport = parsedData.rows.filter(
      (r) => r.isValid && (!ignoreSampleRows || !r.isSampleRow)
    );
    if (validRowsToImport.length === 0) return;

    const newTasks: KanbanTask[] = validRowsToImport.map((r, i) => {
      // Assignee logic
      let assigneeMember: TeamMember;
      if (assignmentMode === "round-robin") {
        assigneeMember = teamMembers[i % teamMembers.length] || teamMembers[0];
      } else {
        assigneeMember = teamMembers.find((m) => m.name === assignmentMode) || teamMembers[0];
      }

      const generatedCode = `TSK-${String(tasks.length + i + 1).padStart(2, "0")}`;
      const taskId = `imported-${Date.now()}-${i}`;

      return {
        id: taskId,
        code: generatedCode,
        title: r.title,
        description: r.description || "Nhiệm vụ được nhập từ bảng chuẩn của Thầy.",
        column: targetColumn,
        priority: r.points >= 5 ? "high" : r.points >= 3 ? "medium" : "low",
        moscow: r.isBonus ? "could" : r.points >= 5 ? "must" : "should",
        points: r.points,
        assignee: {
          name: assigneeMember.name,
          avatar: assigneeMember.avatar,
          role: assigneeMember.role,
        },
        estimateHours: Math.max(2, Math.round(r.points * 1.5)),
        dueDate: `Ngày ${r.projectDay}`,
        epic: r.isBonus ? "Bonus Features" : "Sprint Core",
        epicColor: r.isBonus
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-blue-50 text-blue-700 border-blue-200",
        checklist: [
          { id: `${taskId}-c1`, text: "Thực hiện và kiểm thử cục bộ", done: false },
          { id: `${taskId}-c2`, text: `Đáp ứng yêu cầu nộp: ${r.submissionRequirement}`, done: false },
        ],
        commentsCount: 0,
        attachmentsCount: 0,
        projectDay: r.projectDay,
        sprintNumber: r.sprintNumber,
        submissionRequirement: r.submissionRequirement,
        isBonus: r.isBonus,
      };
    });

    onImportTasks(newTasks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nhập & Xuất Task Chuẩn Định Dạng Thầy Hướng Dẫn
              </h3>
              <p className="text-xs text-slate-500">
                Hỗ trợ 8 cột chuẩn: STT, Ngày (*), Sprint, Tên task (*), Mô tả, Điểm (*), Yêu cầu nộp, Bonus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "import"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload size={14} />
            <span>Nhập File / Dán CSV ({parsedData.validCount} hợp lệ)</span>
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "template"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TableProperties size={14} />
            <span>Tải File Mẫu & Quy Định 8 Cột</span>
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "export"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Download size={14} />
            <span>Xuất Kanban Hiện Tại Ra CSV ({tasks.length} task)</span>
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ── TAB 1: IMPORT ────────────────────────────────────────── */}
          {activeTab === "import" && (
            <div className="space-y-4">
              {/* Quick Actions & File Drop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 flex flex-col justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Dán dữ liệu CSV hoặc kéo file vào</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCsvRawText(TEACHER_CSV_TEMPLATE)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        <RefreshCw size={12} />
                        Nạp mẫu của Thầy
                      </button>
                      <button
                        onClick={() => setCsvRawText("")}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 transition"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder="Dán nội dung CSV từ Excel hoặc tài liệu của Thầy tại đây...&#10;Ví dụ: 1,1,1,Phân tích yêu cầu,Viết tài liệu mô tả chức năng,5,Link,"
                    rows={5}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-hidden"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Hỗ trợ dấu phẩy trong số thập phân ("7,5" hoặc 7.5)</span>
                    <label className="cursor-pointer font-semibold text-blue-600 hover:underline">
                      Chọn file .csv từ máy
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Configuration Options */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                  <p className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                    Cấu hình quy chuẩn khi nạp
                  </p>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                        Số ngày mỗi Sprint (nếu cột Sprint trống):
                      </label>
                      <select
                        value={daysPerSprint}
                        onChange={(e) => setDaysPerSprint(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value={7}>7 ngày / Sprint (Scrum chuẩn)</option>
                        <option value={10}>10 ngày / Sprint</option>
                        <option value={14}>14 ngày / Sprint (2 tuần)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                        Cột đích đưa task vào:
                      </label>
                      <select
                        value={targetColumn}
                        onChange={(e) => setTargetColumn(e.target.value as ColumnId)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value="backlog">Backlog (Chờ thực hiện)</option>
                        <option value="ready">Cần làm (Sẵn sàng)</option>
                        <option value="in-progress">Đang làm (In Progress)</option>
                        <option value="done">Hoàn thành (Done)</option>
                        <option value="verified">Đã nghiệm thu (Thầy duyệt)</option>
                        <option value="fail">Fail (Chưa đạt)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                        Phân bổ người thực hiện:
                      </label>
                      <select
                        value={assignmentMode}
                        onChange={(e) => setAssignmentMode(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value="round-robin">Tự động chia đều cho 3 thành viên</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            Gán cho {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignoreSampleRows}
                        onChange={(e) => setIgnoreSampleRows(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0"
                      />
                      <span>Tự động bỏ qua các dòng mẫu đề bài</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              {csvRawText.trim() && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                    <span className="text-[11px] text-slate-500">Tổng dòng đọc được</span>
                    <p className="text-base font-bold text-slate-900">{parsedData.rows.length}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Hợp lệ nạp
                    </span>
                    <p className="text-base font-bold text-emerald-800">{parsedData.validCount}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-2.5 shadow-2xs">
                    <span className="text-[11px] text-rose-700 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> Lỗi / Cần sửa
                    </span>
                    <p className="text-base font-bold text-rose-800">{parsedData.errorCount}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2.5 shadow-2xs">
                    <span className="text-[11px] text-blue-700 font-medium">Tổng Story Points</span>
                    <p className="text-base font-bold text-blue-900">{parsedData.totalPoints} pts</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-2.5 shadow-2xs">
                    <span className="text-[11px] text-purple-700 font-medium">Task Bonus</span>
                    <p className="text-base font-bold text-purple-900">{parsedData.bonusCount} thẻ</p>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {csvRawText.trim() && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Bảng Xem Trước & Kiểm Định Dữ Liệu (Live Validation)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Hiển thị {parsedData.rows.length} dòng
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600">
                          <th className="py-2 px-3 w-12 text-center">STT</th>
                          <th className="py-2 px-2.5 w-16">Ngày</th>
                          <th className="py-2 px-2.5 w-16">Sprint</th>
                          <th className="py-2 px-3">Tên task (*)</th>
                          <th className="py-2 px-2.5 w-16 text-right">Điểm</th>
                          <th className="py-2 px-2.5 w-24">Yêu cầu nộp</th>
                          <th className="py-2 px-2 w-16 text-center">Bonus</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.rows.map((row) => {
                          const isIgnored = ignoreSampleRows && row.isSampleRow;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={`transition ${
                                !row.isValid
                                  ? "bg-rose-50/50"
                                  : isIgnored
                                  ? "bg-slate-50/60 opacity-60"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                                {row.stt}
                              </td>
                              <td className="py-2 px-2.5 font-medium text-slate-800">
                                N{row.projectDay}
                              </td>
                              <td className="py-2 px-2.5 text-slate-700">
                                S{row.sprintNumber}
                              </td>
                              <td className="py-2 px-3">
                                <p className="font-semibold text-slate-900 leading-tight">
                                  {row.title || <span className="text-rose-500 italic">Trống</span>}
                                </p>
                                {row.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {row.description}
                                  </p>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-slate-900 font-mono">
                                {row.points}p
                              </td>
                              <td className="py-2 px-2.5 text-slate-600">
                                <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                  {row.submissionRequirement}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                {row.isBonus ? (
                                  <span className="inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                    BONUS
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {row.errors.length > 0 ? (
                                  <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
                                    <AlertCircle size={12} className="shrink-0" />
                                    <span>{row.errors[0]}</span>
                                  </div>
                                ) : isIgnored ? (
                                  <span className="inline-block text-[11px] text-slate-500 italic">
                                    Bỏ qua dòng mẫu
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                    <CheckCircle2 size={12} className="shrink-0" />
                                    <span>Hợp lệ</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: TEMPLATE & SPECIFICATION ────────────────────────── */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Tải File Mẫu Chuẩn Của Thầy Hướng Dẫn (.csv)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Định dạng mã hóa UTF-8 với BOM, mở trực tiếp bằng Microsoft Excel trên Windows không bị lỗi font Tiếng Việt.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/task-template.xlsx"
                    download="task-template.xlsx"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                  >
                    <Download size={14} className="text-emerald-600" />
                    <span>Tải file Excel gốc (.xlsx)</span>
                  </a>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                  >
                    <Download size={14} />
                    <span>Tải file CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* 8 Columns Specification Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-800">
                    Bảng Đặc Tả Kỹ Thuật 8 Cột Theo Yêu Cầu Của Thầy
                  </p>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                      <th className="py-2.5 px-4 w-36">Tên Cột</th>
                      <th className="py-2.5 px-3 w-28">Bắt buộc?</th>
                      <th className="py-2.5 px-4">Quy định & Giá trị hợp lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">STT</td>
                      <td className="py-2.5 px-3 text-slate-500">Không</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        Số, chỉ để sắp xếp. Nếu để trống = tự động gán theo số thứ tự dòng.
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">Ngày (*)</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">Có (*)</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        Số nguyên 1–365 = ngày làm việc thứ N của dự án. Hệ thống sẽ ánh xạ vào lịch trình Sprint.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">Sprint</td>
                      <td className="py-2.5 px-3 text-slate-500">Không</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        Số nguyên ≥ 1. Nếu để trống = tự động tính: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">Math.ceil(Ngày / số ngày mỗi sprint)</code>.
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">Tên task (*)</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">Có (*)</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        Tiêu đề nhiệm vụ, tối đa 200 ký tự. Không được để trống.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">Mô tả / yêu cầu</td>
                      <td className="py-2.5 px-3 text-slate-500">Không</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        Chi tiết yêu cầu kỹ thuật hoặc tiêu chí nghiệm thu, tối đa 2000 ký tự.
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">Điểm (*)</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">Có (*)</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        Số &gt; 0, tối đa 1000, tối đa 2 chữ số thập phân (chấp nhận cả định dạng dấu phẩy <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">"7,5"</code> hoặc dấu chấm <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">7.5</code>).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">Yêu cầu nộp</td>
                      <td className="py-2.5 px-3 text-slate-500">Không</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">Không / Link / File / Link hoặc file</span> (chấp nhận cả alias: NONE, LINK, FILE, LINK_OR_FILE). Để trống = Không.
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">Bonus</td>
                      <td className="py-2.5 px-3 text-slate-500">Không</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        Ghi <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[11px] font-bold text-emerald-800">x</code> (hoặc Có / Yes / TRUE) nếu là task bonus: không làm không bị trừ điểm, làm thì được cộng thêm. Trống = task thường.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note about Sample Rows */}
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-900">
                <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <p>
                  <strong>Lưu ý từ Thầy:</strong> Các dòng chữ nghiêng trong mẫu là dữ liệu mẫu để minh họa. Khi nạp vào hệ thống chính thức, sinh viên cần thay thế bằng dữ liệu thật của đề tài hoặc hệ thống sẽ tự động lọc bỏ các dòng mẫu này để tránh làm sai lệch báo cáo tiến độ.
                </p>
              </div>
            </div>
          )}

          {/* ── TAB 3: EXPORT ────────────────────────────────────────── */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Xuất Báo Cáo Task Hiện Tại Ra CSV Chuẩn
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tập hợp toàn bộ {tasks.length} task trên Bảng Kanban thành file CSV đúng cấu trúc 8 cột để nộp cho Thầy.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExport}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                  >
                    {copiedNotification ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedNotification ? "Đã chép CSV" : "Sao chép CSV"}</span>
                  </button>
                  <button
                    onClick={handleDownloadExport}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                  >
                    <Download size={14} />
                    <span>Tải file CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-xs font-mono">
                  <span>danh_sach_task_kanban_sprint.csv</span>
                  <span>{tasks.length} dòng</span>
                </div>
                <pre className="mt-3 max-h-64 overflow-x-auto overflow-y-auto text-xs font-mono text-emerald-400 leading-relaxed">
                  {exportCsvContent}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/70">
          <div className="text-xs text-slate-500">
            {activeTab === "import" && (
              <span>
                Sẵn sàng nạp: <strong className="text-slate-900">{parsedData.validCount} task</strong> (Tổng: {parsedData.totalPoints} pts)
              </span>
            )}
            {activeTab === "template" && <span>Quy chuẩn chấm điểm đồ án Rikkei Education</span>}
            {activeTab === "export" && <span>Dữ liệu đồng bộ trực tiếp từ Kanban Board</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
            >
              Đóng
            </button>
            {activeTab === "import" && (
              <button
                onClick={handleExecuteImport}
                disabled={parsedData.validCount === 0}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <PlusCircle size={14} />
                <span>Nạp {parsedData.validCount} Task Vào Kanban</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

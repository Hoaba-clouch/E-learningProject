import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";

type ReviewStatus = "pending-review" | "needs-revision" | "approved";

type Submission = {
  id: string;
  student: string;
  assignment: string;
  submittedAt: string;
  status: ReviewStatus;
  link: string;
  summary: string;
  aiSignal: string;
  rubric: Record<RubricKey, number>;
  comment: string;
};

type RubricKey = "requirements" | "codeQuality" | "explanation" | "creativity";

const rubricLabels: Record<RubricKey, { label: string; desc: string }> = {
  requirements: { label: "Đúng yêu cầu", desc: "Đủ class, method, case demo theo đề." },
  codeQuality: { label: "Chất lượng code", desc: "Tên rõ, ít lặp, cấu trúc dễ đọc." },
  explanation: { label: "Giải thích", desc: "README/walkthrough nói rõ cách làm." },
  creativity: { label: "Sáng tạo", desc: "Có mở rộng hợp lý hoặc ví dụ riêng." },
};

const statusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  "pending-review": { label: "Đang chờ review", className: "border-amber-200 bg-amber-50 text-amber-700" },
  "needs-revision": { label: "Cần sửa", className: "border-rose-200 bg-rose-50 text-rose-700" },
  approved: { label: "Đã đạt", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const initialSubmissions: Submission[] = [
  {
    id: "sub-1",
    student: "Nguyễn Minh Khôi",
    assignment: "CH1-BT01 Animal hierarchy",
    submittedAt: "Hôm nay, 09:12",
    status: "pending-review",
    link: "repo/minh-khoi/animal-hierarchy",
    summary: "Mô hình Animal, Dog, Cat có override speak(), README đã có sơ đồ class.",
    aiSignal: "AI phát hiện README thiếu mô tả luồng constructor super().",
    rubric: { requirements: 8, codeQuality: 7, explanation: 6, creativity: 7 },
    comment: "Bài ổn về cấu trúc, cần giải thích rõ hơn constructor cha chạy trước.",
  },
  {
    id: "sub-2",
    student: "Trần Thị Lan Anh",
    assignment: "CH1-BT02 Shape polymorphism",
    submittedAt: "Hôm qua, 21:44",
    status: "pending-review",
    link: "canvas/lan-anh/shape-polymorphism",
    summary: "Có Shape, Circle, Rectangle và hàm tính diện tích bằng đa hình.",
    aiSignal: "Không có cảnh báo lớn. Quiz liên quan đạt 86%.",
    rubric: { requirements: 9, codeQuality: 8, explanation: 8, creativity: 6 },
    comment: "Có thể bổ sung thêm ví dụ Triangle để phần mở rộng thuyết phục hơn.",
  },
  {
    id: "sub-3",
    student: "Phạm Văn Đức",
    assignment: "CH1-BT03 Mini project Vehicle",
    submittedAt: "2 ngày trước",
    status: "needs-revision",
    link: "repo/duc/vehicle-oop",
    summary: "Có Vehicle, Car, Bike nhưng demo runtime polymorphism chưa rõ.",
    aiSignal: "Commit lớn trong thời gian ngắn, cần xem kỹ phần giải thích.",
    rubric: { requirements: 6, codeQuality: 6, explanation: 4, creativity: 5 },
    comment: "Cần bổ sung hàm demo list Vehicle và giải thích vì sao gọi move() ra hành vi khác nhau.",
  },
  {
    id: "sub-4",
    student: "Lê Bảo Châu",
    assignment: "CH1-BT01 Animal hierarchy",
    submittedAt: "3 ngày trước",
    status: "approved",
    link: "repo/bao-chau/animal-hierarchy",
    summary: "Đủ class, override rõ, README có ví dụ chạy và sơ đồ class.",
    aiSignal: "Không có cảnh báo. Mindmap khớp 92% với bài nộp.",
    rubric: { requirements: 10, codeQuality: 9, explanation: 9, creativity: 8 },
    comment: "Đã đạt. Ví dụ Dog/Cat rõ, có thể dùng làm bài mẫu cho lớp.",
  },
];

export default function GitHubSubmission() {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selectedId, setSelectedId] = useState(initialSubmissions[0].id);

  const selected = submissions.find((item) => item.id === selectedId) ?? submissions[0];
  const averageScore = useMemo(() => {
    const values = Object.values(selected.rubric);
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  }, [selected.rubric]);

  const updateSelected = (patch: Partial<Submission>) => {
    setSubmissions((list) => list.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
  };

  const updateRubric = (key: RubricKey, value: number) => {
    updateSelected({ rubric: { ...selected.rubric, [key]: value } });
  };

  const pendingCount = submissions.filter((item) => item.status === "pending-review").length;
  const revisionCount = submissions.filter((item) => item.status === "needs-revision").length;

  return (
    <div className="min-h-full p-5">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-blue-700">Giảng viên - Review bài tập</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Chấm bài cuối chương</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn bài nộp, chấm rubric, gửi nhận xét và cập nhật trạng thái cho học viên.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Chờ review", pendingCount, "bg-amber-50 text-amber-700"],
            ["Cần sửa", revisionCount, "bg-rose-50 text-rose-700"],
            ["Đã đạt", submissions.filter((item) => item.status === "approved").length, "bg-emerald-50 text-emerald-700"],
          ].map(([label, value, tone]) => (
            <div key={label as string} className={`rounded-xl px-4 py-2 ${tone}`}>
              <div className="text-lg font-semibold">{value}</div>
              <div className="text-[11px] font-bold">{label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-4">
        <aside className="surface overflow-hidden rounded-xl">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-950">Danh sách bài nộp</h2>
            <p className="mt-1 text-sm text-slate-500">Ưu tiên bài đang chờ review và bài cần sửa.</p>
          </div>
          <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
            {submissions.map((item) => {
              const status = statusConfig[item.status];
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected.id === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{item.student}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{item.assignment}</div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{item.submittedAt}</span>
                    <span>TB {Math.round(Object.values(item.rubric).reduce((total, value) => total + value, 0) / 4)}/10</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-4">
          <section className="surface rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-blue-700">{selected.assignment}</div>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.student}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={13} />
                    {selected.submittedAt}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText size={13} />
                    {selected.link}
                  </span>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusConfig[selected.status].className}`}>
                {statusConfig[selected.status].label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_260px] gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Tóm tắt bài nộp</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selected.summary}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Sparkles size={15} />
                  AI signal
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-800">{selected.aiSignal}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="surface rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Rubric chấm điểm</h2>
                  <p className="mt-1 text-sm text-slate-500">Điểm 1-10, dùng để gửi nhận xét rõ ràng hơn cho học viên.</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-4 py-2 text-center text-blue-700">
                  <div className="text-lg font-semibold">{averageScore}/10</div>
                  <div className="text-[11px] font-bold">trung bình</div>
                </div>
              </div>

              <div className="space-y-4">
                {(Object.keys(rubricLabels) as RubricKey[]).map((key) => {
                  const item = rubricLabels[key];
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-700">{selected.rubric[key]}/10</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={selected.rubric[key]}
                        onChange={(event) => updateRubric(key, Number(event.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="surface rounded-xl p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText size={18} className="text-blue-700" />
                <h2 className="text-base font-semibold text-slate-950">Nhận xét gửi học viên</h2>
              </div>
              <textarea
                value={selected.comment}
                onChange={(event) => updateSelected({ comment: event.target.value })}
                rows={9}
                className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400"
                placeholder="Nhập nhận xét cụ thể cho học viên..."
              />
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                Gợi ý: nhận xét nên nêu rõ phần đạt, phần cần sửa và hành động tiếp theo.
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  onClick={() => updateSelected({ status: "approved" })}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={15} />
                  Đã đạt
                </button>
                <button
                  onClick={() => updateSelected({ status: "needs-revision" })}
                  className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <RotateCcw size={15} />
                  Cần sửa
                </button>
                <button
                  onClick={() => updateSelected({ status: "pending-review" })}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                >
                  <Send size={15} />
                  Lưu nháp review
                </button>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  X,
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  Sliders,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { fetchProjectEvaluationApi, evaluateProjectApi } from "../api";

export interface ProjectGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectCode: string;
  courseName?: string;
  onGradingSuccess?: (finalScore: number) => void;
}

export default function ProjectGradingModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectCode,
  courseName = "Khóa luận Kỹ sư Phần mềm",
  onGradingSuccess,
}: ProjectGradingModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  // Rubric Scores (0 - 10)
  const [archScore, setArchScore] = useState<number>(8.5);
  const [processScore, setProcessScore] = useState<number>(9.0);
  const [defenseScore, setDefenseScore] = useState<number>(8.8);
  const [feedback, setFeedback] = useState<string>(
    "Nhóm tổ chức kiến trúc 3 tầng rất tốt, tuân thủ chặt chẽ ràng buộc H2 và hoàn thành 100% tiêu chí DoD. Tiếp tục duy trì phong độ cho đợt bảo vệ cuối khóa."
  );

  // Member overrides
  const [memberScores, setMemberScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !projectId) return;
    let active = true;
    setLoading(true);

    fetchProjectEvaluationApi(projectId).then((data) => {
      if (!active) return;
      setLoading(false);
      if (data.is_graded && data.evaluation) {
        setIsGraded(true);
        const ev = data.evaluation;
        setArchScore(ev.architecture_score || 8.5);
        setProcessScore(ev.process_score || 9.0);
        setDefenseScore(ev.defense_score || 8.8);
        setFeedback(ev.feedback || "");
      } else {
        setIsGraded(false);
      }
      const mList = data.anti_freerider_metrics || [];
      setMetrics(mList);
      setTotalPoints(data.total_completed_points || 0);

      // Initialize member scores based on suggested factor
      const initialMap: Record<string, number> = {};
      mList.forEach((m: any) => {
        initialMap[m.member_id] = roundToOne(8.8 * (m.suggested_factor || 1.0));
      });
      setMemberScores(initialMap);
    });

    return () => {
      active = false;
    };
  }, [isOpen, projectId]);

  // Compute Group Score: 30% Architecture + 40% Process & Tests + 30% Teamwork & DoD
  const groupScore = roundToOne(0.3 * archScore + 0.4 * processScore + 0.3 * defenseScore);

  // Recalculate member scores when group score changes
  const handleScoreChange = (type: "arch" | "process" | "defense", val: number) => {
    let nextArch = archScore;
    let nextProcess = processScore;
    let nextDefense = defenseScore;
    if (type === "arch") {
      setArchScore(val);
      nextArch = val;
    } else if (type === "process") {
      setProcessScore(val);
      nextProcess = val;
    } else {
      setDefenseScore(val);
      nextDefense = val;
    }
    const nextGroup = roundToOne(0.3 * nextArch + 0.4 * nextProcess + 0.3 * nextDefense);
    setMemberScores((prev) => {
      const nextMap = { ...prev };
      metrics.forEach((m) => {
        nextMap[m.member_id] = roundToOne(nextGroup * (m.suggested_factor || 1.0));
      });
      return nextMap;
    });
  };

  const handleMemberScoreEdit = (memberId: string, val: number) => {
    setMemberScores((prev) => ({
      ...prev,
      [memberId]: Math.max(0, Math.min(10, roundToOne(val))),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const memberScoresPayload = metrics.map((m) => ({
      member_id: m.member_id,
      name: m.name,
      role: m.role,
      contribution_pct: m.contribution_pct,
      suggested_factor: m.suggested_factor,
      individual_score: memberScores[m.member_id] || groupScore,
    }));

    const res = await evaluateProjectApi(projectId, {
      group_score: groupScore,
      architecture_score: archScore,
      process_score: processScore,
      defense_score: defenseScore,
      feedback: feedback.trim(),
      member_scores: memberScoresPayload,
    });

    setSubmitting(false);
    if (!res.error) {
      setIsGraded(true);
      onGradingSuccess?.(res.final_score || groupScore);
      onClose();
    } else {
      alert(res.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#18191c] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                  {projectCode}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Thẩm định & Chấm điểm Đồ án Kỹ nghệ
                </h3>
                {isGraded && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Đã nghiệm thu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {projectName} • <span className="font-medium text-slate-700 dark:text-slate-300">{courseName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-sm">Đang phân tích dữ liệu đóng góp Anti-Freerider từ MySQL...</p>
            </div>
          ) : (
            <>
              {/* 1. ANTI-FREERIDER CONTRIBUTION METRICS BANNER */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-slate-700 dark:text-slate-300" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Đo lường Đóng góp Anti-Freerider (Dựa trên Story Points & DoD thực tế)
                    </h4>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0 outline-none ring-0 text-xs font-medium shadow-2xs font-sans shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                    <span>Tổng tích lũy:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{totalPoints} SP</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  Thuật toán tự động tính tỷ lệ đóng góp thực tế trên từng Task Kanban, tỷ lệ hoàn tất Checklist DoD và lịch sử Commit Git để khuyến nghị trọng số điểm cá nhân công bằng, tránh tình trạng "gánh team" hoặc ỷ lại.
                </p>

                {/* Member Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {metrics.map((m) => {
                    const isExceeding = (m.suggested_factor || 1.0) > 1.0;
                    return (
                      <div
                        key={m.member_id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3.5 flex flex-col justify-between shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {m.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isExceeding
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              x{m.suggested_factor}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {m.role}
                          </p>

                          <div className="mt-3 space-y-1.5 text-[11px]">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                              <span>Story Points:</span>
                              <span className="font-mono font-bold">{m.completed_points} / {m.total_points} SP ({m.contribution_pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, m.contribution_pct || 0)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[10.5px]">
                              <span>Task Đã xong: {m.done_tasks}/{m.total_tasks}</span>
                              <span>DoD: {m.dod_completed}/{m.dod_total}</span>
                            </div>
                          </div>
                        </div>

                        {/* Individual Score Input */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Điểm cá nhân:
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={memberScores[m.member_id] ?? 8.5}
                              onChange={(e) => handleMemberScoreEdit(m.member_id, parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <span className="text-xs text-slate-400">/ 10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. RUBRIC EVALUATION SLIDERS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={18} className="text-slate-700 dark:text-slate-300" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Thang Điểm Rubric Chuẩn Kỹ Nghệ Phần Mềm
                    </h4>
                  </div>
                  {/* Group Score Output */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-[#ee8420] text-white px-3.5 py-1.5 rounded-xl shadow-xs">
                    <Award size={16} />
                    <span className="text-xs font-semibold">Điểm Đồ Án Nhóm:</span>
                    <span className="text-sm font-bold font-mono">{groupScore.toFixed(1)} / 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Criterion 1 */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">1. Kiến trúc & Clean Code</span>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">30%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                        Mô hình 3 tầng (Router-Service-Repo), không có lỗi Type/Lint, Schema CSDL chuẩn 3NF.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>Điểm:</span>
                        <span>{archScore.toFixed(1)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={archScore}
                        onChange={(e) => handleScoreChange("arch", parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Criterion 2 */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">2. Hiện thực & CI/CD Sandbox</span>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">40%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                        Tính năng hoạt động đầy đủ, pass 100% test cases trong Docker sandbox, xử lý case biên.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>Điểm:</span>
                        <span>{processScore.toFixed(1)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={processScore}
                        onChange={(e) => handleScoreChange("process", parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Criterion 3 */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">3. Kỷ luật Agile, DoD & Git</span>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">30%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                        Tuân thủ checklist DoD, phân chia nhánh Git chuẩn feature/#TSK, giải phóng khóa H2.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>Điểm:</span>
                        <span>{defenseScore.toFixed(1)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={defenseScore}
                        onChange={(e) => handleScoreChange("defense", parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. INSTRUCTOR FEEDBACK */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <FileText size={15} />
                  <span>Lời phê Kỹ thuật & Nhận xét của Giảng viên Hướng dẫn:</span>
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ghi nhận ưu điểm và các điểm cần cải thiện trước khi triển khai thực tế..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
                />
              </div>
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles size={14} className="text-amber-500" />
            <span>Nghiệm thu sẽ tự động cấp điểm chính thức và cập nhật trạng thái đồ án sang "Delivered".</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || submitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm hover:shadow transition active:scale-98 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Đang lưu điểm số...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
                  <span>Xác nhận Nghiệm thu & Chấm điểm</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundToOne(num: number): number {
  return Math.round(num * 10) / 10;
}

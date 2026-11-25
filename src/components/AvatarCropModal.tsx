import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Crop,
  FlipHorizontal2,
  Move,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { loadHtmlImage, renderCroppedAvatarDataUrl } from "../utils/avatarImage";

interface Props {
  open: boolean;
  imageSrc: string;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onChangeFile?: () => void;
  onConfirm: (croppedDataUrl: string) => void | Promise<void>;
}

const STAGE_SIZE = 280;
const CROP_SIZE = 240;

export default function AvatarCropModal({
  open,
  imageSrc,
  saving = false,
  error = null,
  onCancel,
  onChangeFile,
  onConfirm,
}: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [baseRotate, setBaseRotate] = useState(0);
  const [fineAngle, setFineAngle] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [maskShape, setMaskShape] = useState<"circle" | "rounded">("circle");
  const [rendering, setRendering] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const totalRotation = baseRotate + fineAngle;

  useEffect(() => {
    if (!open || !imageSrc) return;
    let active = true;
    setLoadError(null);
    setNaturalSize(null);
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    setBaseRotate(0);
    setFineAngle(0);
    setFlipX(false);

    loadHtmlImage(imageSrc)
      .then((img) => {
        if (!active) return;
        setNaturalSize({
          w: img.naturalWidth || img.width,
          h: img.naturalHeight || img.height,
        });
      })
      .catch((err: any) => {
        if (!active) return;
        setLoadError(err?.message || "Không thể nạp ảnh để căn chỉnh.");
      });

    return () => {
      active = false;
    };
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !rendering) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, rendering, onCancel]);

  const baseDims = useMemo(() => {
    if (!naturalSize) {
      return { w: CROP_SIZE, h: CROP_SIZE, baseScale: 1 };
    }
    const minSide = Math.min(naturalSize.w, naturalSize.h);
    const baseScale = CROP_SIZE / minSide;
    return {
      w: naturalSize.w * baseScale,
      h: naturalSize.h * baseScale,
      baseScale,
    };
  }, [naturalSize]);

  const clampOffsets = (nextX: number, nextY: number, z: number) => {
    // Allow generous panning even when zoomed or rotated so user can center any region
    const maxPanX = Math.max(CROP_SIZE * 0.6, (baseDims.w * z) / 2 + CROP_SIZE * 0.25);
    const maxPanY = Math.max(CROP_SIZE * 0.6, (baseDims.h * z) / 2 + CROP_SIZE * 0.25);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
    };
  };

  const handleResetTransform = () => {
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    setBaseRotate(0);
    setFineAngle(0);
    setFlipX(false);
    setLoadError(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize || saving || rendering) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: offsetX,
      origY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const clamped = clampOffsets(drag.origX + dx, drag.origY + dy, zoom);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const next = Math.max(1, Math.min(3, Number((prev + delta).toFixed(2))));
      const clamped = clampOffsets(offsetX, offsetY, next);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
      return next;
    });
  };

  const handleZoomChange = (nextVal: number) => {
    const next = Math.max(1, Math.min(3, Number(nextVal.toFixed(2))));
    const clamped = clampOffsets(offsetX, offsetY, next);
    setZoom(next);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handleConfirmClick = async () => {
    if (!imageSrc || !naturalSize || saving || rendering) return;
    setLoadError(null);
    setRendering(true);
    try {
      const dataUrl = await renderCroppedAvatarDataUrl(imageSrc, {
        offsetX,
        offsetY,
        zoom,
        rotationDeg: totalRotation,
        flipX,
        cropSize: CROP_SIZE,
        outputSize: 320,
      });
      await onConfirm(dataUrl);
    } catch (err: any) {
      setLoadError(err?.message || "Không thể xuất ảnh đã cắt chỉnh.");
    } finally {
      setRendering(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const busy = saving || rendering;
  const activeErr = error || loadError;

  const renderMiniPreview = (boxSize: number, roundCls: string, label: string) => {
    const ratio = boxSize / CROP_SIZE;
    return (
      <div className="flex items-center gap-2.5">
        <div
          className={`relative shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 ${roundCls}`}
          style={{ width: boxSize, height: boxSize }}
        >
          {naturalSize && (
            <img
              src={imageSrc}
              alt={label}
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: baseDims.w * ratio,
                height: baseDims.h * ratio,
                marginLeft: -(baseDims.w * ratio) / 2,
                marginTop: -(baseDims.h * ratio) / 2,
                maxWidth: "none",
                transformOrigin: "center center",
                transform: `translate(${offsetX * ratio}px, ${offsetY * ratio}px) scale(${zoom}) rotate(${totalRotation}deg) scaleX(${
                  flipX ? -1 : 1
                })`,
              }}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{label}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Xem trước trực tiếp</div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Căn chỉnh & Cắt ảnh đại diện"
      onClick={() => {
        if (!busy) onCancel();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[680px] rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <Crop size={17} className="text-[#EE8420]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white tracking-tight truncate">
                Căn chỉnh &amp; Cắt ảnh chính diện
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Kéo ảnh vào tâm chữ thập, thu phóng và xoay góc để khuôn mặt cân đối ngay ngắn
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Đóng cửa sổ cắt ảnh"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Interactive Crop Stage */}
          <div className="flex flex-col items-center gap-3 mx-auto">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleStageWheel}
              title="Kéo để di chuyển ảnh, cuộn chuột để thu phóng"
              style={{ width: STAGE_SIZE, height: STAGE_SIZE, touchAction: "none" }}
              className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 select-none cursor-grab active:cursor-grabbing shadow-inner"
            >
              {naturalSize ? (
                <img
                  src={imageSrc}
                  alt="Xem trước ảnh cắt"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: baseDims.w,
                    height: baseDims.h,
                    marginLeft: -baseDims.w / 2,
                    marginTop: -baseDims.h / 2,
                    maxWidth: "none",
                    transformOrigin: "center center",
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${totalRotation}deg) scaleX(${
                      flipX ? -1 : 1
                    })`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 font-semibold">
                  Đang nạp hình ảnh...
                </div>
              )}

              {/* Cutout Aperture & Alignment Crosshair */}
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/90 transition-[border-radius] duration-200 ${
                  maskShape === "circle" ? "rounded-full" : "rounded-2xl"
                }`}
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.58)",
                }}
              >
                {/* Faint Rule-of-thirds & Straight-on Center Crosshair */}
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-px bg-white/60" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-px bg-white/60" />
              </div>

              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-950/75 text-[10px] font-semibold text-white/90 inline-flex items-center gap-1 whitespace-nowrap">
                <Move size={10} />
                <span>Kéo ảnh để căn giữa</span>
              </div>
            </div>

            {/* Frame Shape Preview Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMaskShape("circle")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  maskShape === "circle"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Khung tròn
              </button>
              <button
                type="button"
                onClick={() => setMaskShape("rounded")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  maskShape === "rounded"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Khung vuông bo
              </button>
            </div>
          </div>

          {/* Controls Column */}
          <div className="space-y-4 min-w-0">
            {/* Live Mini Previews */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/55 p-3.5 grid grid-cols-2 gap-3">
              {renderMiniPreview(44, "rounded-full", "Header & Team")}
              {renderMiniPreview(52, "rounded-2xl", "Hồ sơ cá nhân")}
            </div>

            {/* Zoom Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-200">Thu phóng (Zoom)</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || zoom <= 1}
                  onClick={() => handleZoomChange(zoom - 0.15)}
                  aria-label="Thu nhỏ"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-45"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  aria-label="Thanh trượt thu phóng ảnh"
                  className="flex-1 accent-[#EE8420] cursor-pointer"
                />
                <button
                  type="button"
                  disabled={busy || zoom >= 3}
                  onClick={() => handleZoomChange(zoom + 0.15)}
                  aria-label="Phóng to"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-45"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            {/* Straighten / Fine Angle Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-200">
                  Căn góc chính diện (Xoay nghiêng)
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono text-slate-400 w-7">-45°</span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={fineAngle}
                  onChange={(e) => setFineAngle(Number(e.target.value))}
                  aria-label="Thanh trượt xoay góc chính diện"
                  className="flex-1 accent-[#EE8420] cursor-pointer"
                />
                <span className="text-[10.5px] font-mono text-slate-400 w-7 text-right">+45°</span>
              </div>
            </div>

            {/* Quick Rotate, Flip, Reset Toolbar (icon-only) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => setBaseRotate((r) => (r - 90 + 360) % 360)}
                title="Xoay trái 90°"
                aria-label="Xoay trái 90°"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition disabled:opacity-50"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setBaseRotate((r) => (r + 90) % 360)}
                title="Xoay phải 90°"
                aria-label="Xoay phải 90°"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition disabled:opacity-50"
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setFlipX((v) => !v)}
                title="Lật ngang"
                aria-label="Lật ngang"
                aria-pressed={flipX}
                className={`inline-flex h-10 items-center justify-center rounded-xl border cursor-pointer transition disabled:opacity-50 ${
                  flipX
                    ? "border-slate-900 dark:border-slate-200 bg-slate-100 dark:bg-slate-700 text-slate-950 dark:text-white"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <FlipHorizontal2 size={16} />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleResetTransform}
                title="Đặt lại"
                aria-label="Đặt lại"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition disabled:opacity-50"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {activeErr && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/80 dark:bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {activeErr}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          {onChangeFile ? (
            <button
              type="button"
              disabled={busy}
              onClick={onChangeFile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition disabled:opacity-50"
            >
              <Upload size={13} className="text-amber-500" />
              <span>Chọn ảnh khác</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy || !naturalSize}
              onClick={() => void handleConfirmClick()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 text-slate-950 px-4 py-2 text-xs font-black shadow-xs cursor-pointer transition disabled:opacity-55"
            >
              {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
              <span>{busy ? "Đang lưu ảnh..." : "Lưu ảnh đại diện"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

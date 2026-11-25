export interface AvatarCropTransform {
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotationDeg: number;
  flipX: boolean;
  cropSize: number;
  outputSize?: number;
}

export async function validateAndReadAvatarFile(file: File): Promise<string> {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP hoặc GIF).");
  }
  if (file.type.toLowerCase() === "image/svg+xml") {
    throw new Error("Không hỗ trợ tệp SVG làm ảnh đại diện. Vui lòng chọn PNG, JPG, WebP hoặc GIF.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Kích thước tệp ảnh quá lớn (tối đa 8MB).");
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Không thể đọc nội dung tệp ảnh."));
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc tệp ảnh từ thiết bị."));
    reader.readAsDataURL(file);
  });
}

export async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Tệp hình ảnh bị lỗi hoặc không được trình duyệt hỗ trợ."));
    el.src = src;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) {
    throw new Error("Không xác định được kích thước tệp ảnh.");
  }
  return img;
}

export async function renderCroppedAvatarDataUrl(
  src: string,
  transform: AvatarCropTransform
): Promise<string> {
  const img = await loadHtmlImage(src);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  const cropSize = Math.max(1, transform.cropSize || 240);
  const outputSize = Math.max(64, transform.outputSize || 320);

  const baseScale = cropSize / Math.min(naturalW, naturalH);
  const ratio = outputSize / cropSize;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas 2D.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(outputSize / 2, outputSize / 2);
  ctx.translate(transform.offsetX * ratio, transform.offsetY * ratio);
  ctx.scale(transform.zoom, transform.zoom);
  ctx.rotate((transform.rotationDeg * Math.PI) / 180);
  if (transform.flipX) {
    ctx.scale(-1, 1);
  }
  const drawW = naturalW * baseScale * ratio;
  const drawH = naturalH * baseScale * ratio;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const webp = canvas.toDataURL("image/webp", 0.9);
  if (webp.startsWith("data:image/webp;base64,")) {
    return webp;
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function prepareAvatarImageFile(file: File): Promise<string> {
  const rawDataUrl = await validateAndReadAvatarFile(file);
  const img = await loadHtmlImage(rawDataUrl);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const minSide = Math.min(w, h);
  const sx = Math.max(0, Math.round((w - minSide) / 2));
  const sy = Math.max(0, Math.round((h - minSide) / 2));
  const targetSize = 256;

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas 2D.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

  const webp = canvas.toDataURL("image/webp", 0.88);
  if (webp.startsWith("data:image/webp;base64,")) {
    return webp;
  }
  return canvas.toDataURL("image/jpeg", 0.88);
}

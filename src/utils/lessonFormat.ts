/**
 * Shared helpers for normalizing Chapter & Lesson display codes and titles
 * across StudentDashboard, MultiChapterSidebar, and LearningWorkspace.
 */

export function extractNumericLessonCode(
  rawId?: string | null,
  title?: string | null
): string | null {
  const idStr = String(rawId || "").trim();
  if (/^\d+\.\d+$/.test(idStr)) {
    return idStr;
  }
  const titleStr = String(title || "").trim();
  const match = titleStr.match(/^(\d+\.\d+)\b/);
  if (match) {
    return match[1];
  }
  return null;
}

export function getLessonDisplayCode(
  rawId: string | undefined | null,
  title: string | undefined | null,
  chapterNumber: number,
  indexInChapter: number
): string {
  return (
    extractNumericLessonCode(rawId, title) ??
    `${Math.max(1, chapterNumber)}.${Math.max(1, indexInChapter + 1)}`
  );
}

export function stripDuplicateLessonCode(
  title: string | undefined | null,
  code?: string
): string {
  const raw = String(title || "").trim();
  if (!raw) return code ? `Bài ${code}` : "";
  if (code) {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byCode = raw
      .replace(new RegExp(`^${escaped}\\s*[:.\\-·–—]?\\s*`, "i"), "")
      .trim();
    if (byCode) return byCode;
  }
  const byAny = raw.replace(/^\d+\.\d+\s*[:.\-·–—]?\s*/, "").trim();
  return byAny || raw;
}

export function stripDuplicateChapterPrefix(
  title: string | undefined | null,
  chapterNumber?: number
): string {
  const raw = String(title || "").trim();
  if (!raw) return chapterNumber ? `Chủ đề Chương ${chapterNumber}` : "";
  const stripped = raw
    .replace(/^ch(?:ư|u)(?:ơ|o)ng\s+\d+\s*[:.\-–—]?\s*/i, "")
    .trim();
  return stripped || raw;
}

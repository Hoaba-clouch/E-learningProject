import { useState, useRef, useEffect, type ReactNode } from "react";
import { Check, Copy, ShieldAlert, Sparkles } from "lucide-react";

interface AiRichMessageProps {
  text: string;
}

const INLINE_TOKEN_RE =
  /(`[^`\n]+`|\*\*(?:`[^`\n]+`|[^*`\n])+?\*\*|(?<![A-Za-z0-9_*])\*(?!\s)(?:`[^`\n]+`|[^*`\n])+?(?<!\s)\*(?![A-Za-z0-9_*]))/g;

function renderInline(line: string, keyPrefix: string, depth = 0): ReactNode[] {
  if (depth > 3) return [line];

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  const tokenRe = new RegExp(INLINE_TOKEN_RE.source, "g");
  let match: RegExpExecArray | null = tokenRe.exec(line);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${matchIndex++}`;

    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-[1px] rounded-md bg-[var(--card-3)] text-[var(--ink)] font-mono text-[11.5px] font-semibold border border-[var(--line)] align-baseline"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      nodes.push(
        <strong key={key} className="font-bold text-[var(--ink)]">
          {renderInline(token.slice(2, -2), key, depth + 1)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      nodes.push(
        <em key={key} className="italic text-[var(--ink-2)]">
          {renderInline(token.slice(1, -1), key, depth + 1)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
    match = tokenRe.exec(line);
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [line];
}

function CodeBlockCard({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = () => {
    try {
      void navigator.clipboard?.writeText(code);
    } catch {
      // Ignore clipboard permission errors in restricted contexts
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 1800);
  };

  return (
    <div className="rounded-xl border border-[var(--line-2)] bg-[#141518] text-[#edf0f5] my-1.5 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-[#1c1d21]">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Đã chép mã nguồn" : "Sao chép mã nguồn"}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-300">Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-2.5 m-0 overflow-x-auto text-[11.5px] leading-[1.55] font-mono text-[#edf0f5]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function AiRichMessage({ text }: AiRichMessageProps) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const elements: ReactNode[] = [];

  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block ```lang ... ```
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim() || "code";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i += 1;
      }
      elements.push(
        <CodeBlockCard key={`code-${blockKey++}`} lang={lang} code={codeLines.join("\n")} />
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={`hr-${blockKey++}`} className="border-0 border-t border-[var(--line)] my-2" />);
      i += 1;
      continue;
    }

    // Guardrail prefix [Socratic Guardrail]: ...
    if (trimmed.startsWith("[Socratic Guardrail]:")) {
      const rest = trimmed.slice("[Socratic Guardrail]:".length).trim();
      const guardKey = `guard-${blockKey++}`;
      elements.push(
        <div key={guardKey} className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--card-3)] text-[var(--ink)] border border-[var(--line)] text-[10.5px] font-bold tracking-tight">
            <ShieldAlert size={11} className="text-[var(--muted)]" />
            <span>Socratic Guardrail</span>
          </div>
          {rest && (
            <p className="text-[12.8px] leading-[1.58] text-[var(--ink)]">
              {renderInline(rest, guardKey)}
            </p>
          )}
        </div>
      );
      i += 1;
      continue;
    }

    // Standalone bracket header tag: [CS201 · Docker Test Suggestion]
    const bracketTagMatch = /^\[([^\]]+)\]$/.exec(trimmed);
    if (bracketTagMatch) {
      elements.push(
        <div
          key={`tag-${blockKey++}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--card-3)] text-[var(--ink)] border border-[var(--line)] text-[10.5px] font-bold tracking-tight"
        >
          <Sparkles size={11} className="text-[var(--muted)]" />
          <span>{bracketTagMatch[1]}</span>
        </div>
      );
      i += 1;
      continue;
    }

    // Markdown headings (#, ##, ###)
    const headingMatch = /^#{1,3}\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const hKey = `h-${blockKey++}`;
      elements.push(
        <div
          key={hKey}
          className="text-[13px] font-bold tracking-tight text-[var(--ink)] flex items-center gap-1.5 mt-2 first:mt-0 mb-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
          <span>{renderInline(headingMatch[1], hKey)}</span>
        </div>
      );
      i += 1;
      continue;
    }

    // Blockquotes / Socratic closing callouts (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const qKey = `quote-${blockKey++}`;
      elements.push(
        <div
          key={qKey}
          className="border-l-2 border-[var(--line-2)] bg-[var(--card-3)]/60 rounded-r-xl px-2.5 py-1.5 my-1 text-[12.4px] leading-[1.52] text-[var(--ink)] font-medium space-y-1"
        >
          {quoteLines.map((qLine, idx) => (
            <p key={`${qKey}-p-${idx}`} className="text-[12.4px] leading-[1.52] text-[var(--ink)]">
              {renderInline(qLine, `${qKey}-${idx}`)}
            </p>
          ))}
        </div>
      );
      continue;
    }

    // Answer / Highlight line (→ ... or -> ...)
    const arrowMatch = /^\s*(?:→|->)\s*(.+)$/.exec(rawLine);
    if (arrowMatch) {
      const aKey = `arrow-${blockKey++}`;
      elements.push(
        <div
          key={aKey}
          className="rounded-lg bg-[var(--card-3)]/85 border border-[var(--line)] px-2.5 py-1 my-0.5 text-[12px] font-semibold text-[var(--ink)] flex items-start gap-1.5"
        >
          <span className="text-[var(--ink-2)] font-bold shrink-0">→</span>
          <span className="min-w-0 leading-[1.45]">{renderInline(arrowMatch[1], aKey)}</span>
        </div>
      );
      i += 1;
      continue;
    }

    // Ordered list item (1. ... or 1) ...)
    const orderedMatch = /^\s*(\d+)[.)]\s+(.+)$/.exec(rawLine);
    if (orderedMatch) {
      const oKey = `ol-${blockKey++}`;
      elements.push(
        <div key={oKey} className="flex items-start gap-2 my-0.5">
          <span className="w-[18px] h-[18px] rounded-full bg-[var(--card-3)] text-[var(--ink-2)] text-[10.5px] font-bold font-mono flex items-center justify-center shrink-0 mt-[2px] border border-[var(--line)]">
            {orderedMatch[1]}
          </span>
          <div className="text-[12.8px] leading-[1.55] text-[var(--ink)] min-w-0 flex-1">
            {renderInline(orderedMatch[2], oKey)}
          </div>
        </div>
      );
      i += 1;
      continue;
    }

    // Unordered bullet item (- ..., * ..., • ...)
    const bulletMatch = /^\s*[-*•]\s+(.+)$/.exec(rawLine);
    if (bulletMatch) {
      const inner = bulletMatch[1].trim();
      const nestedOrderedMatch = /^(\d+)[.)]\s+(.+)$/.exec(inner);
      if (nestedOrderedMatch) {
        const oKey = `ol-${blockKey++}`;
        elements.push(
          <div key={oKey} className="flex items-start gap-2 my-0.5">
            <span className="w-[18px] h-[18px] rounded-full bg-[var(--card-3)] text-[var(--ink-2)] text-[10.5px] font-bold font-mono flex items-center justify-center shrink-0 mt-[2px] border border-[var(--line)]">
              {nestedOrderedMatch[1]}
            </span>
            <div className="text-[12.8px] leading-[1.55] text-[var(--ink)] min-w-0 flex-1">
              {renderInline(nestedOrderedMatch[2], oKey)}
            </div>
          </div>
        );
      } else {
        const uKey = `ul-${blockKey++}`;
        elements.push(
          <div key={uKey} className="flex items-start gap-2 my-0.5 pl-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-[7px]" />
            <div className="text-[12.8px] leading-[1.55] text-[var(--ink)] min-w-0 flex-1">
              {renderInline(inner, uKey)}
            </div>
          </div>
        );
      }
      i += 1;
      continue;
    }

    // Standard paragraph line
    const pKey = `p-${blockKey++}`;
    elements.push(
      <p key={pKey} className="text-[12.8px] leading-[1.58] text-[var(--ink)]">
        {renderInline(trimmed, pKey)}
      </p>
    );
    i += 1;
  }

  return <div className="space-y-1.5 select-text">{elements}</div>;
}

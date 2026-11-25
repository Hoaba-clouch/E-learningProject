import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface MarloSelectOption {
  value: string;
  label: React.ReactNode;
  textLabel: string;
  disabled?: boolean;
  group?: string;
}

export interface MarloSelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  options?: Array<{
    value: string | number;
    label: React.ReactNode;
    disabled?: boolean;
    group?: string;
  }>;
  className?: string;
  menuClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  title?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

function extractTextContent(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextContent(node.props.children);
  }
  return "";
}

function collectOptionsFromChildren(
  children: React.ReactNode,
  group?: string,
  acc: MarloSelectOption[] = []
): MarloSelectOption[] {
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (Array.isArray(child)) {
      collectOptionsFromChildren(child, group, acc);
      return;
    }
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.type === React.Fragment) {
      const fragProps = child.props as { children?: React.ReactNode };
      collectOptionsFromChildren(fragProps.children, group, acc);
      return;
    }

    if (typeof child.type === "string" && child.type.toLowerCase() === "optgroup") {
      const ogProps = child.props as { label?: string; children?: React.ReactNode };
      collectOptionsFromChildren(ogProps.children, ogProps.label || group, acc);
      return;
    }

    if (typeof child.type === "string" && child.type.toLowerCase() === "option") {
      const optProps = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      const textLabel = extractTextContent(optProps.children).replace(/\s+/g, " ").trim();
      const optionValue =
        optProps.value !== undefined && optProps.value !== null
          ? String(optProps.value)
          : textLabel;
      acc.push({
        value: optionValue,
        label: optProps.children ?? optionValue,
        textLabel: textLabel || optionValue,
        disabled: Boolean(optProps.disabled),
        group,
      });
      return;
    }

    const innerProps = child.props as { children?: React.ReactNode };
    if (innerProps && innerProps.children) {
      collectOptionsFromChildren(innerProps.children, group, acc);
    }
  });
  return acc;
}

export function MarloSelect({
  value,
  defaultValue,
  onChange,
  onValueChange,
  children,
  options: optionsProp,
  className = "",
  menuClassName = "",
  placeholder = "Chọn mục...",
  disabled = false,
  name,
  id,
  title,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: MarloSelectProps) {
  const autoId = useId();
  const listboxId = `marlo-select-list-${autoId}`;

  const parsedOptions = useMemo<MarloSelectOption[]>(() => {
    if (optionsProp && optionsProp.length > 0) {
      return optionsProp.map((o) => {
        const valStr = String(o.value);
        const text = extractTextContent(o.label).replace(/\s+/g, " ").trim() || valStr;
        return {
          value: valStr,
          label: o.label,
          textLabel: text,
          disabled: Boolean(o.disabled),
          group: o.group,
        };
      });
    }
    return collectOptionsFromChildren(children);
  }, [optionsProp, children]);

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(() => {
    if (defaultValue !== undefined) return String(defaultValue);
    return parsedOptions[0]?.value ?? "";
  });

  const resolvedValue = isControlled ? String(value ?? "") : uncontrolledValue;
  const selectedIndex = useMemo(
    () => parsedOptions.findIndex((opt) => opt.value === resolvedValue),
    [parsedOptions, resolvedValue]
  );
  const selectedOption =
    selectedIndex >= 0 ? parsedOptions[selectedIndex] : parsedOptions[0];

  type MarloSelectMenuStyle = {
    top?: number;
    bottom?: number;
    left: number;
    minWidth: number;
    maxHeight: number;
    placement: "top" | "bottom";
  };

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(
    selectedIndex >= 0 ? selectedIndex : 0
  );
  const [menuStyle, setMenuStyle] = useState<MarloSelectMenuStyle | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const sanitizedTriggerClassName = useMemo(
    () =>
      className
        .replace(/\bappearance-none\b/g, "")
        .replace(/\bpr-(?:7|8|9|10)\b/g, "pr-2.5")
        .trim(),
    [className]
  );

  const computeMenuStyle = useCallback((): MarloSelectMenuStyle | null => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === "undefined") return null;
    const rect = triggerEl.getBoundingClientRect();

    // Auto-close cleanly if the trigger scrolled out of the viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return null;
    }

    const viewportPad = 12;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad - gap;
    const spaceAbove = rect.top - viewportPad - gap;
    const placement: "top" | "bottom" =
      spaceBelow < 210 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableSpace = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(120, Math.min(320, availableSpace));
    const minWidth = Math.min(Math.max(rect.width, 160), window.innerWidth - viewportPad * 2);

    const measuredWidth = menuRef.current?.offsetWidth || minWidth;
    const clampedLeft = Math.max(
      viewportPad,
      Math.min(rect.left, window.innerWidth - measuredWidth - viewportPad)
    );

    if (placement === "bottom") {
      return {
        top: Math.max(viewportPad, rect.bottom + gap),
        left: clampedLeft,
        minWidth,
        maxHeight,
        placement,
      };
    }

    return {
      bottom: Math.max(viewportPad, window.innerHeight - rect.top + gap),
      left: clampedLeft,
      minWidth,
      maxHeight,
      placement,
    };
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setMenuStyle(null);
  }, []);

  const openMenu = useCallback(() => {
    const next = computeMenuStyle();
    if (!next) return;
    setMenuStyle(next);
    setIsOpen(true);
  }, [computeMenuStyle]);

  const updateMenuPosition = useCallback(() => {
    const next = computeMenuStyle();
    if (!next) {
      closeMenu();
      return;
    }
    setMenuStyle((prev) =>
      prev &&
      prev.top === next.top &&
      prev.bottom === next.bottom &&
      prev.left === next.left &&
      prev.minWidth === next.minWidth &&
      prev.maxHeight === next.maxHeight &&
      prev.placement === next.placement
        ? prev
        : next
    );
  }, [computeMenuStyle, closeMenu]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, updateMenuPosition, parsedOptions.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      closeMenu();
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updateMenuPosition();
    };

    const handleResize = () => updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updateMenuPosition, closeMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const targetIdx = selectedIndex >= 0 ? selectedIndex : 0;
    setHighlightedIndex(targetIdx);

    const activeItem = menuRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${targetIdx}"]`
    );
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [isOpen, selectedIndex]);

  const commitSelection = (opt: MarloSelectOption) => {
    if (opt.disabled) return;
    if (!isControlled) {
      setUncontrolledValue(opt.value);
    }
    onValueChange?.(opt.value);
    if (onChange) {
      const syntheticTarget = {
        value: opt.value,
        name: name ?? "",
        id: id ?? "",
      };
      onChange({
        target: syntheticTarget,
        currentTarget: syntheticTarget,
      } as React.ChangeEvent<HTMLSelectElement>);
    }
    closeMenu();
    triggerRef.current?.focus();
  };

  const findNextEnabledIndex = (start: number, step: 1 | -1): number => {
    if (parsedOptions.length === 0) return -1;
    let idx = start;
    for (let i = 0; i < parsedOptions.length; i++) {
      idx = (idx + step + parsedOptions.length) % parsedOptions.length;
      if (!parsedOptions[idx].disabled) return idx;
    }
    return start;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        openMenu();
      } else {
        setHighlightedIndex((prev) => findNextEnabledIndex(prev, 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        openMenu();
      } else {
        setHighlightedIndex((prev) => findNextEnabledIndex(prev, -1));
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        openMenu();
      } else if (parsedOptions[highlightedIndex]) {
        commitSelection(parsedOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        closeMenu();
      }
    } else if (e.key === "Tab") {
      closeMenu();
    }
  };

  const hasExplicitBgOrBorder = /\b(bg-|border|px-|py-)\b/.test(sanitizedTriggerClassName);
  const fallbackBase = hasExplicitBgOrBorder
    ? ""
    : "px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100";

  let lastRenderedGroup: string | undefined;
  const isMenuRendered = Boolean(isOpen && menuStyle);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        title={title || selectedOption?.textLabel}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isMenuRendered}
        aria-controls={isMenuRendered ? listboxId : undefined}
        data-testid={dataTestId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center justify-between gap-2 text-left transition-all duration-150 select-none ${fallbackBase} ${sanitizedTriggerClassName} ${
          isMenuRendered
            ? "ring-2 ring-slate-900/10 dark:ring-white/15 border-slate-400 dark:border-slate-500"
            : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 dark:focus-visible:ring-white/15"
        } ${disabled ? "opacity-55 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate min-w-0 flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${
            isMenuRendered ? "rotate-180 text-slate-900 dark:text-white" : ""
          }`}
        />
      </button>

      {isOpen &&
        menuStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || "Danh sách lựa chọn"}
            style={{
              position: "fixed",
              ...(menuStyle.placement === "bottom"
                ? { top: menuStyle.top }
                : { bottom: menuStyle.bottom }),
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
              maxWidth: "min(460px, calc(100vw - 24px))",
              maxHeight: menuStyle.maxHeight,
              zIndex: 100000,
              transition: "none",
            }}
            className={`overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/95 dark:border-slate-700/85 bg-white/98 dark:bg-[#161923]/98 backdrop-blur-xl p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.48)] ${
              menuStyle.placement === "bottom"
                ? "marlo-select-in-bottom"
                : "marlo-select-in-top"
            } ${menuClassName}`}
          >
            {parsedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                Không có lựa chọn
              </div>
            ) : (
              parsedOptions.map((opt, idx) => {
                const isSelected = opt.value === resolvedValue;
                const isHighlighted = idx === highlightedIndex;
                const showGroupHeader = Boolean(opt.group && opt.group !== lastRenderedGroup);
                if (opt.group) {
                  lastRenderedGroup = opt.group;
                }

                return (
                  <React.Fragment key={`${opt.value}-${idx}`}>
                    {showGroupHeader && (
                      <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-option-index={idx}
                      disabled={opt.disabled}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIndex(idx);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => commitSelection(opt)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors duration-100 select-none ${
                        opt.disabled
                          ? "opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500"
                          : isSelected
                          ? "bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white font-semibold cursor-pointer"
                          : isHighlighted
                          ? "bg-slate-100/95 dark:bg-slate-800/85 text-slate-900 dark:text-white font-medium cursor-pointer"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-slate-800/75 font-medium cursor-pointer"
                      }`}
                    >
                      <span className="leading-snug break-words">{opt.label}</span>
                      {isSelected && (
                        <Check
                          size={14}
                          className="shrink-0 text-slate-900 dark:text-white stroke-[2.4]"
                        />
                      )}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default MarloSelect;

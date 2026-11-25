import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface MarloStaggerOptions {
  y?: number;
  x?: number;
  stagger?: number;
  delay?: number;
  duration?: number;
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function so)
 * Staggered Card Pop-in Animation
 * Initial: opacity: 0, y: 26, scale: 0.985
 * Target:  opacity: 1, y: 0, scale: 1
 * Ease: expo.out (Silky smooth exponential deceleration)
 * Automatically clears transform/opacity on complete to prevent layout jerk.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
  );
}

export function animateMarloCards(
  elements: Element[] | NodeListOf<Element> | null | undefined,
  options: MarloStaggerOptions = {}
) {
  const { y = 24, stagger = 0.055, delay = 0, duration = 0.72 } = options;
  if (!elements) return null;
  const list = Array.from(elements).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
  if (list.length === 0) return null;

  gsap.killTweensOf(list);
  if (prefersReducedMotion()) {
    list.forEach((el) => el.removeAttribute("data-marlo-entering"));
    gsap.set(list, { opacity: 1, clearProps: "transform" });
    return null;
  }

  list.forEach((el) => el.setAttribute("data-marlo-entering", "1"));
  const clearEntering = () => {
    list.forEach((el) => el.removeAttribute("data-marlo-entering"));
  };

  return gsap.fromTo(
    list,
    {
      opacity: 0,
      y,
      scale: 0.985,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      ease: "expo.out",
      stagger,
      delay,
      force3D: true,
      overwrite: "auto",
      clearProps: "transform,opacity",
      onComplete: clearEntering,
      onInterrupt: clearEntering,
    }
  );
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function co)
 * Staggered Row / List Item Entrance Animation
 * Initial: opacity: 0, x, y
 * Target:  opacity: 1, x: 0, y: 0
 * Ease: power3.out
 */
export function animateMarloRows(
  elements: Element[] | NodeListOf<Element> | null | undefined,
  options: MarloStaggerOptions = {}
) {
  const { x = 0, y = 12, stagger = 0.03, delay = 0.2, duration = 0.52 } = options;
  if (!elements) return null;
  const list = Array.from(elements).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
  if (list.length === 0) return null;

  gsap.killTweensOf(list);
  if (prefersReducedMotion()) {
    list.forEach((el) => el.removeAttribute("data-marlo-entering"));
    gsap.set(list, { opacity: 1, clearProps: "transform" });
    return null;
  }

  list.forEach((el) => el.setAttribute("data-marlo-entering", "1"));
  const clearEntering = () => {
    list.forEach((el) => el.removeAttribute("data-marlo-entering"));
  };

  return gsap.fromTo(
    list,
    {
      opacity: 0,
      x,
      y,
    },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration,
      ease: "power3.out",
      stagger,
      delay,
      force3D: true,
      overwrite: "auto",
      clearProps: "transform,opacity",
      onComplete: clearEntering,
      onInterrupt: clearEntering,
    }
  );
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function yo)
 * Smooth GPU hover lift via GSAP without fighting CSS transition-all / entrance transforms
 */
export function initMarloLift(
  container: HTMLElement | Document = document,
  liftY = -4
) {
  if (typeof window === "undefined") return;
  const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
  if (!canHover) return;

  const elements = container.querySelectorAll<HTMLElement>(
    "[data-lift], .pcard, .person, .agenda__day"
  );
  elements.forEach((el) => {
    if ((el as any).__lift) return;
    (el as any).__lift = true;

    el.addEventListener("pointerenter", () => {
      if (prefersReducedMotion()) return;
      if (el.getAttribute("data-marlo-entering") === "1") return;
      gsap.to(el, {
        y: liftY,
        duration: 0.42,
        ease: "power3.out",
        overwrite: "auto",
      });
    });

    el.addEventListener("pointerleave", () => {
      if (el.getAttribute("data-marlo-entering") === "1") return;
      gsap.to(el, {
        y: 0,
        duration: 0.48,
        ease: "power3.out",
        overwrite: "auto",
        clearProps: "transform",
      });
    });
  });
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function zc)
 * React Hook to trigger staggered page entrance on mount
 */
export function useMarloPageEntrance(
  containerRef: RefObject<HTMLElement | null>,
  callback?: (container: HTMLElement) => void,
  deps: unknown[] = []
) {
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (callback) {
        callback(el);
      } else {
        // Automatically query all cards and rows like Marlo
        const cards = el.querySelectorAll(
          ".marlo-card, .card, .lane, [data-column-id], .top-card, .profile-hero"
        );
        if (cards.length > 0) {
          animateMarloCards(cards, { stagger: 0.055, y: 24 });
        }

        const rows = el.querySelectorAll(
          ".marlo-row, .row, .tcard, [data-task-card-id], .table tbody tr, .mine__row, .feed__row, .agenda-row, .prow"
        );
        if (rows.length > 0) {
          animateMarloRows(rows, { y: 12, stagger: 0.03, delay: 0.2 });
        }
      }
      initMarloMagnetic(el);
      initMarloLift(el);
    }, el);

    return () => {
      el.querySelectorAll("[data-marlo-entering]").forEach((n) =>
        n.removeAttribute("data-marlo-entering")
      );
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function _o)
 * Magnetic Cursor Physics for buttons with class `.magnetic`
 * Moves smoothly with mouse cursor with power3.out physics, then snaps back smoothly on leave.
 */
export function initMarloMagnetic(container: HTMLElement | Document = document) {
  if (typeof window === "undefined") return;
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;
  if (!isFinePointer) return;

  const elements = container.querySelectorAll<HTMLElement>(".magnetic");
  elements.forEach((el) => {
    if ((el as any).__mag) return;
    (el as any).__mag = true;

    const quickX = gsap.quickTo(el, "x", {
      duration: 0.45,
      ease: "power3.out",
    });
    const quickY = gsap.quickTo(el, "y", {
      duration: 0.45,
      ease: "power3.out",
    });

    const handlePointerMove = (r: PointerEvent | MouseEvent) => {
      const rect = el.getBoundingClientRect();
      // Exact Marlo magnetic formulas: 0.22 on X, 0.28 on Y
      quickX((r.clientX - rect.left - rect.width / 2) * 0.22);
      quickY((r.clientY - rect.top - rect.height / 2) * 0.28);
    };

    const handlePointerLeave = () => {
      quickX(0);
      quickY(0);
    };

    el.addEventListener("pointermove", handlePointerMove as any);
    el.addEventListener("pointerleave", handlePointerLeave);
    el.addEventListener("mousemove", handlePointerMove as any);
    el.addEventListener("mouseleave", handlePointerLeave);
  });
}

// Global delegated initializers for dynamically mounted magnetic / lift surfaces
if (typeof window !== "undefined") {
  const delegateHandler = (e: Event) => {
    const target = (e.target as HTMLElement)?.closest?.(
      ".magnetic, [data-lift], .pcard, .person, .agenda__day"
    );
    if (!target) return;
    if (target.classList.contains("magnetic") && !(target as any).__mag) {
      initMarloMagnetic(document);
    }
    if (
      (target.hasAttribute("data-lift") ||
        target.classList.contains("pcard") ||
        target.classList.contains("person") ||
        target.classList.contains("agenda__day")) &&
      !(target as any).__lift
    ) {
      initMarloLift(document);
    }
  };
  window.addEventListener("pointerenter", delegateHandler, true);
  window.addEventListener("mouseenter", delegateHandler, true);
}

export interface MarloPillState {
  l: number;
  r: number;
  t: number;
  b: number;
}

export interface MarloPillElement extends HTMLElement {
  __e?: MarloPillState;
  __st?: MarloPillState;
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function So / on)
 * Liquid Rubberband Pill Stretch & Drag Animation ("Hiệu ứng bị kéo theo")
 * Uses dual-speed inset clipPath animation:
 * - Leading edge fires fast (0.36s, power3.out) -> Stretches out towards target
 * - Trailing edge lags behind (0.55s, power3.inOut) -> Gets dragged behind
 * Creates an ultra-satisfying liquid jelly / magnetic stretching effect.
 */
export function animateMarloPill(
  pillEl: HTMLElement | null,
  targetEl: HTMLElement | null | undefined,
  {
    animate = true,
    radius = 16,
    line = false,
  }: {
    animate?: boolean;
    radius?: number;
    line?: boolean;
  } = {}
) {
  if (!pillEl) return;
  const parent = pillEl.parentElement;
  if (!parent || !targetEl || !targetEl.offsetWidth) {
    gsap.set(pillEl, { opacity: 0 });
    return;
  }

  const parentWidth = parent.scrollWidth > parent.clientWidth ? parent.scrollWidth : parent.offsetWidth;
  const parentHeight = parent.scrollHeight > parent.clientHeight ? parent.scrollHeight : parent.offsetHeight;

  // Layout box geometry (unaffected by active CSS transforms/scales, matching Marlo 1:1)
  let elLeft = targetEl.offsetLeft;
  let elTop = targetEl.offsetTop;
  const elWidth = targetEl.offsetWidth;
  const elHeight = targetEl.offsetHeight;

  let curr: HTMLElement | null = targetEl.offsetParent as HTMLElement;
  while (curr && curr !== parent && parent.contains(curr)) {
    elLeft += curr.offsetLeft;
    elTop += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement;
  }

  const targetState: MarloPillState = line
    ? {
        l: elLeft,
        r: Math.max(0, parentWidth - (elLeft + elWidth)),
        t: 0,
        b: 0,
      }
    : {
        l: elLeft,
        r: Math.max(0, parentWidth - (elLeft + elWidth)),
        t: elTop,
        b: Math.max(0, parentHeight - (elTop + elHeight)),
      };

  if (parentWidth === parent.offsetWidth) {
    pillEl.style.removeProperty("width");
  } else {
    pillEl.style.width = `${parentWidth}px`;
  }
  if (!line && parentHeight !== parent.offsetHeight) {
    pillEl.style.height = `${parentHeight}px`;
  } else {
    pillEl.style.removeProperty("height");
  }

  const getClipPath = (st: MarloPillState) =>
    `inset(${Math.max(0, st.t)}px ${Math.max(0, st.r)}px ${Math.max(0, st.b)}px ${Math.max(0, st.l)}px round ${radius}px)`;

  const d = pillEl as MarloPillElement;
  const f = d.__e;

  // Don't restart if already at exact same coordinates (only during non-animated resize)
  if (
    !animate &&
    f &&
    Math.abs(f.l - targetState.l) < 1 &&
    Math.abs(f.r - targetState.r) < 1 &&
    Math.abs(f.t - targetState.t) < 1 &&
    Math.abs(f.b - targetState.b) < 1
  ) {
    return;
  }

  d.__e = targetState;

  // Instant snap on first render
  if (!animate || !f || Number(gsap.getProperty(pillEl, "opacity")) === 0) {
    if (d.__st) gsap.killTweensOf(d.__st);
    d.__st = { ...targetState };
    gsap.set(pillEl, {
      clipPath: getClipPath(targetState),
      opacity: 1,
    });
    return;
  }

  const p = d.__st ?? { ...f };
  d.__st = p;
  gsap.killTweensOf(p);

  const isVertical = Math.abs(targetState.t - f.t) > Math.abs(targetState.l - f.l);
  const isForward = isVertical ? targetState.t > f.t : targetState.l > f.l;
  const [leadingEdge, trailingEdge] = isVertical
    ? isForward
      ? (["b", "t"] as const)
      : (["t", "b"] as const)
    : isForward
    ? (["r", "l"] as const)
    : (["l", "r"] as const);
  const crossAxes = isVertical ? (["l", "r"] as const) : (["t", "b"] as const);

  const updateClip = () => {
    if (pillEl) {
      pillEl.style.clipPath = getClipPath(p);
    }
  };

  // 🚀 Liquid rubberband stretch: Mép đầu bay trước (0.34s, power3.out)
  // Mép đuôi kéo theo mượt mà (0.46s, power3.inOut) tạo độ co giãn dẻo như dòng nước
  gsap.to(p, {
    [leadingEdge]: targetState[leadingEdge],
    duration: 0.34,
    ease: "power3.out",
    onUpdate: updateClip,
  });

  gsap.to(p, {
    [trailingEdge]: targetState[trailingEdge],
    duration: 0.46,
    ease: "power3.inOut",
    onUpdate: updateClip,
  });

  // Cross axes align smoothly in sync (0.38s)
  gsap.to(p, {
    [crossAxes[0]]: targetState[crossAxes[0]],
    [crossAxes[1]]: targetState[crossAxes[1]],
    duration: 0.38,
    ease: "power3.inOut",
    onUpdate: updateClip,
  });
}

export interface MarloElasticState {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface MarloElasticElement extends HTMLElement {
  __marloPillState?: MarloElasticState;
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function So / on)
 * Liquid Rubberband Pill Stretch & Drag Animation ("Hiệu ứng bị kéo theo")
 * When navigating between tabs:
 * - The leading edge rockets forward (0.36s, power3.out)
 * - The trailing edge drags behind (0.52s, power3.inOut)
 * Result: The pill stretches out into a liquid jelly capsule, gets pulled along,
 * and snaps back into place!
 */
export function animateMarloElasticPill(
  pillEl: HTMLElement | null,
  targetEl: HTMLElement | null | undefined,
  {
    animate = true,
  }: {
    animate?: boolean;
  } = {}
) {
  if (!pillEl) return;
  const parent = pillEl.parentElement;
  if (!parent || !targetEl) {
    gsap.set(pillEl, { opacity: 0 });
    return;
  }

  const parentRect = parent.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  if (targetRect.width === 0 || targetRect.height === 0) {
    gsap.set(pillEl, { opacity: 0 });
    return;
  }

  // Exact coordinates relative to scrollable parent (chính xác tuyệt đối 100%)
  const targetTop = targetRect.top - parentRect.top + parent.scrollTop;
  const targetLeft = targetRect.left - parentRect.left + parent.scrollLeft;
  const targetWidth = targetRect.width;
  const targetHeight = targetRect.height;
  const targetBottom = targetTop + targetHeight;

  const el = pillEl as MarloElasticElement;
  const prevState = el.__marloPillState;

  const applyFrame = (st: MarloElasticState) => {
    pillEl.style.top = `${st.top}px`;
    pillEl.style.height = `${Math.max(1, st.bottom - st.top)}px`;
    pillEl.style.left = `${st.left}px`;
    pillEl.style.width = `${st.width}px`;
    pillEl.style.opacity = "1";
  };

  const newState: MarloElasticState = {
    top: targetTop,
    bottom: targetBottom,
    left: targetLeft,
    width: targetWidth,
  };

  // Instant snap on first render, no previous state, or width change (collapse/expand)
  if (
    !animate ||
    !prevState ||
    Math.abs(prevState.width - targetWidth) > 40 ||
    Math.abs(prevState.left - targetLeft) > 20
  ) {
    if (prevState) gsap.killTweensOf(prevState);
    applyFrame(newState);
    el.__marloPillState = newState;
    return;
  }

  // Same coordinates, no need to re-tween
  if (
    Math.abs(prevState.top - targetTop) < 1 &&
    Math.abs(prevState.bottom - targetBottom) < 1
  ) {
    applyFrame(newState);
    el.__marloPillState = newState;
    return;
  }

  const curState: MarloElasticState = {
    top: prevState.top,
    bottom: prevState.bottom,
    left: targetLeft,
    width: targetWidth,
  };

  el.__marloPillState = newState;
  gsap.killTweensOf(curState);

  const isMovingDown = targetTop > curState.top;

  const update = () => {
    applyFrame(curState);
  };

  if (isMovingDown) {
    // 🚀 Moving DOWN: Đáy phóng tới trước (0.30s, power2.out)
    gsap.to(curState, {
      bottom: targetBottom,
      duration: 0.30,
      ease: "power2.out",
      onUpdate: update,
    });

    // 🌊 Đỉnh trượt theo êm ái (0.34s, power2.out)
    gsap.to(curState, {
      top: targetTop,
      duration: 0.34,
      ease: "power2.out",
      onUpdate: update,
    });
  } else {
    // 🚀 Moving UP: Đỉnh phóng lên trước (0.30s, power2.out)
    gsap.to(curState, {
      top: targetTop,
      duration: 0.30,
      ease: "power2.out",
      onUpdate: update,
    });

    // 🌊 Đáy trượt theo êm ái (0.34s, power2.out)
    gsap.to(curState, {
      bottom: targetBottom,
      duration: 0.34,
      ease: "power2.out",
      onUpdate: update,
    });
  }

  pillEl.style.opacity = "1";
}

/**
 * Điều khiển hiệu ứng mở/đóng chuẩn Marlo cho AI Chat Drawer (bung & thu về góc phải dưới).
 * Hỗ trợ đóng từ nút X, phím Escape hoặc props isOpen bên ngoài mà không bị unmount cắt ngang animation.
 */
export function useMarloAiDrawerMotion(options: {
  isOpen: boolean;
  onClose: () => void;
  drawerRef: RefObject<HTMLElement | null>;
  chipsRef?: RefObject<HTMLElement | null>;
}) {
  const { isOpen, onClose, drawerRef, chipsRef } = options;
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const runExitAnimation = useCallback(
    (notifyParent: boolean) => {
      if (closingRef.current) return;
      const el = drawerRef.current;
      if (!el || prefersReducedMotion()) {
        closingRef.current = false;
        setIsClosing(false);
        setShouldRender(false);
        if (notifyParent) onCloseRef.current();
        return;
      }
      closingRef.current = true;
      setIsClosing(true);
      gsap.killTweensOf(el);
      gsap.to(el, {
        opacity: 0,
        y: 18,
        scale: 0.94,
        transformOrigin: "100% 100%",
        duration: 0.22,
        ease: "power2.in",
        overwrite: "auto",
        onComplete: () => {
          if (!closingRef.current) return;
          closingRef.current = false;
          setIsClosing(false);
          setShouldRender(false);
          if (notifyParent) onCloseRef.current();
        },
      });
    },
    [drawerRef]
  );

  useLayoutEffect(() => {
    if (isOpen) {
      if (drawerRef.current) gsap.killTweensOf(drawerRef.current);
      closingRef.current = false;
      setIsClosing(false);
      if (!shouldRender) setShouldRender(true);
      return;
    }
    if (shouldRender && !closingRef.current) {
      runExitAnimation(false);
    }
  }, [isOpen, shouldRender, drawerRef, runExitAnimation]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldRender || closingRef.current || !drawerRef.current) return;
    const el = drawerRef.current;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, clearProps: "transform" });
      return;
    }
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0, y: 20, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        transformOrigin: "100% 100%",
        duration: 0.36,
        ease: "expo.out",
        overwrite: "auto",
        clearProps: "transform,opacity",
      }
    );
    const chips = chipsRef?.current?.querySelectorAll<HTMLElement>(".ai-chip");
    if (chips && chips.length > 0) {
      gsap.killTweensOf(chips);
      gsap.fromTo(
        chips,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.04,
          delay: 0.1,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }
  }, [isOpen, shouldRender, drawerRef, chipsRef]);

  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        runExitAnimation(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isClosing, runExitAnimation]);

  useEffect(() => {
    return () => {
      if (drawerRef.current) gsap.killTweensOf(drawerRef.current);
    };
  }, [drawerRef]);

  const handleAnimatedClose = useCallback(() => {
    runExitAnimation(true);
  }, [runExitAnimation]);

  return { shouldRender, isClosing, handleAnimatedClose };
}

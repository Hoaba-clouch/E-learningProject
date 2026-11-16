import React, { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import "../styles/monolith-coverflow.css";

export interface MonumentItem {
  id: string;
  no: string;
  title: string;
  place: string;
  blurb: string;
  accent: string;
  image: string;
}

const MONUMENTS: MonumentItem[] = [
  {
    id: "compiler",
    no: "01",
    title: "C++ Mini Compiler & AST",
    place: "COMPILERS & RUNTIME ENGINE",
    blurb: "Phân tích từ vựng DFA, parser LR(1) và visualizer cây cú pháp trừu tượng AST thời gian thực.",
    accent: "#ff5b3a",
    image: "/photos/tech/code.jpg",
  },
  {
    id: "kernel",
    no: "02",
    title: "PintOS Microkernel",
    place: "OPERATING SYSTEMS & MEMORY",
    blurb: "Phân trang bộ nhớ ảo đa cấp, thread scheduler ưu tiên và xử lý ngắt page faults từ nhân phần cứng.",
    accent: "#3a86ff",
    image: "/photos/tech/kernel.jpg",
  },
  {
    id: "raft",
    no: "03",
    title: "Distributed Raft Consensus",
    place: "DISTRIBUTED SYSTEMS & CLOUD",
    blurb: "Đồng thuận phân tán chịu lỗi Byzantine, replicated state machine và lưu trữ key-value chuẩn MIT 6.824.",
    accent: "#1fc6a0",
    image: "/photos/tech/cloud.jpg",
  },
  {
    id: "vision",
    no: "04",
    title: "MedAI Vision Diagnostic",
    place: "DEEP LEARNING & COMPUTER VISION",
    blurb: "Mô hình Vision Transformer phân đoạn tổn thương X-Quang phổi và MRI thời gian thực tích hợp Grad-CAM.",
    accent: "#a855f7",
    image: "/photos/tech/vision.jpg",
  },
  {
    id: "ai",
    no: "05",
    title: "Autonomous Socratic AI",
    place: "LLM REASONING & REINFORCEMENT",
    blurb: "Gia sư AI phản biện đa bước giải thuật, hướng dẫn tư duy logic và chấm test suite tự động 24/7.",
    accent: "#f4a52b",
    image: "/photos/tech/ai.jpg",
  },
  {
    id: "security",
    no: "06",
    title: "Zero-Trust Cloud Sandbox",
    place: "CYBERSECURITY & DEVSECOPS",
    blurb: "Môi trường cô lập thực thi container độc lập với cgroups v2, seccomp-bpf và bảo mật API OWASP.",
    accent: "#ff5f9e",
    image: "/photos/tech/security.jpg",
  },
];

interface Props {
  onSelectMonument?: (monument: MonumentItem) => void;
}

export default function MonolithCoverflowShowcase({ onSelectMonument }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  // DOM Refs
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const placeRef = useRef<HTMLParagraphElement>(null);
  const blurbRef = useRef<HTMLParagraphElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  // Physics & Animation State
  const animState = useRef({
    pos: 0,
    targetPos: 0,
    isDragging: false,
    startX: 0,
    startPos: 0,
    lastX: 0,
    velocity: 0,
    lastTime: 0,
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    autoplayProgress: 0,
    isHovered: false,
    tween: null as gsap.core.Tween | null,
    autoplayTween: null as gsap.core.Tween | null,
    currentActiveIdx: -1,
  });

  const total = MONUMENTS.length;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  // Modulo wrap helper
  const xo = (e: number) => {
    e = e % total;
    if (e > total / 2) e -= total;
    if (e < -total / 2) e += total;
    return e;
  };

  // Animated word-by-word caption update (1:1 with Monolith)
  const updateCaption = useCallback(
    (idx: number) => {
      const t = ((idx % total) + total) % total;
      if (t === animState.current.currentActiveIdx) return;
      animState.current.currentActiveIdx = t;
      setActiveIndex(t);

      const item = MONUMENTS[t];
      if (!item) return;

      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty("--accent", item.accent);
      }
      if (noRef.current) {
        noRef.current.textContent = item.no;
        gsap.fromTo(
          noRef.current,
          { yPercent: -75, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
        );
      }
      if (placeRef.current) {
        placeRef.current.textContent = item.place;
        gsap.fromTo(
          placeRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.06 }
        );
      }
      if (blurbRef.current) {
        blurbRef.current.textContent = item.blurb;
        gsap.fromTo(
          blurbRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.12 }
        );
      }
      if (titleRef.current) {
        titleRef.current.innerHTML = "";
        item.title.split(" ").forEach((word, wIdx, arr) => {
          const wm = document.createElement("span");
          wm.className = "wm";
          const ww = document.createElement("span");
          ww.className = "ww";
          ww.textContent = word;
          wm.appendChild(ww);
          titleRef.current!.appendChild(wm);
          if (wIdx < arr.length - 1) {
            titleRef.current!.appendChild(document.createTextNode(" "));
          }
        });

        gsap.fromTo(
          titleRef.current.querySelectorAll(".ww"),
          { yPercent: 118 },
          { yPercent: 0, duration: 0.62, ease: "power3.out", stagger: 0.06 }
        );
      }
    },
    [total]
  );

  // Untransformed card width (constant regardless of 3D rotation, preventing carousel collapse)
  const getBaseCardWidth = useCallback(() => {
    const card = cardRefs.current[0];
    if (card && card.offsetWidth > 0) return card.offsetWidth;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    return Math.min(340, Math.max(220, vw * 0.26));
  }, []);

  // Render 3D Coverflow (1:1 with Monolith Lo formula)
  const renderCoverflow = useCallback(
    (pos: number) => {
      const cardWidth = getBaseCardWidth();
      const So = cardWidth * 0.75; // Standard overlapping coverflow spacing (1:1 with authentic template)
      const Co = cardWidth * 0.65;
      const wo = window.innerWidth < 821 ? 38 : 46;
      const Eo = window.innerWidth < 521 ? 2 : 3;

      const state = animState.current;
      const ptX = state.pointerX;
      const ptY = state.pointerY;

      for (let n = 0; n < total; n++) {
        const card = cardRefs.current[n];
        if (!card) continue;

        const r = xo(n - pos);
        const i = Math.abs(r);

        if (i > Eo + 0.5) {
          gsap.set(card, { opacity: 0 });
          card.style.pointerEvents = "none";
          continue;
        }

        const o = r < 0 ? -1 : 1;
        const s = Math.min(i, 1);
        const c = Math.max(i - 1, 0);

        let l = o * (So * s + So * 0.54 * c);
        let u = 0;
        // Depth offset ensures neighbor cards tuck cleanly behind center hero card
        const d = -(s * Co + c * Co * 0.55);
        let f = Math.max(-1.15, Math.min(1.15, r)) * wo;
        let p = 0;
        const m = 1 - s * 0.16 - c * 0.05;
        const h = i <= 1 ? 1 : Math.max(0, Math.min(1, 1 - c * 0.34));

        const isHero = i < 0.5;
        if (isHero) {
          f += ptX * 7;
          p += -ptY * 6;
          l += ptX * 16;
          u += ptY * 10;
          card.classList.add("is-hero");
          card.style.pointerEvents = "none";
          card.style.zIndex = "100";
        } else {
          card.classList.remove("is-hero");
          card.style.pointerEvents = "auto";
          card.style.zIndex = String(Math.max(1, Math.round(90 - i * 15)));
        }

        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: l,
          y: u,
          z: d,
          rotationY: f,
          rotationX: p,
          scale: m,
          opacity: h,
        });

        const img = imgRefs.current[n];
        if (img) {
          gsap.set(img, {
            x: isHero ? ptX * -16 : 0,
            y: isHero ? ptY * -12 : 0,
            scale: isHero ? 1.06 : 1,
          });
        }
      }

      if (glowRef.current) {
        gsap.set(glowRef.current, {
          xPercent: -50,
          yPercent: -50,
          x: ptX * 42,
          y: ptY * 26,
        });
      }

      updateCaption(Math.round(pos));
    },
    [total, updateCaption]
  );

  // Smooth navigate to position
  const goTo = useCallback(
    (targetPos: number) => {
      const state = animState.current;
      if (state.tween) state.tween.kill();
      if (state.autoplayTween) state.autoplayTween.kill();

      state.tween = gsap.to(state, {
        pos: targetPos,
        duration: 0.75,
        ease: "power3.out",
        onUpdate: () => {
          renderCoverflow(state.pos);
        },
        onComplete: () => {
          state.tween = null;
          resetAutoplay();
        },
      });
    },
    [renderCoverflow]
  );

  const goToIndex = useCallback(
    (targetIdx: number) => {
      const idx = Math.max(0, Math.min(total - 1, targetIdx));
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const totalScrollable = trackRef.current.offsetHeight - window.innerHeight;
        const targetScrollY = window.scrollY + rect.top + (idx / (total - 1)) * totalScrollable;
        window.scrollTo({ top: targetScrollY, behavior: "smooth" });
      } else {
        goTo(idx);
      }
    },
    [total, goTo]
  );

  const next = useCallback(() => {
    const currentIdx = Math.round(animState.current.pos);
    goToIndex(Math.min(total - 1, currentIdx + 1));
  }, [goToIndex, total]);

  const prev = useCallback(() => {
    const currentIdx = Math.round(animState.current.pos);
    goToIndex(Math.max(0, currentIdx - 1));
  }, [goToIndex]);

  // Autoplay completely disabled - cards stay firmly in place until the user chooses to scroll, drag, or click
  const resetAutoplay = useCallback(() => {
    const state = animState.current;
    if (state.autoplayTween) {
      state.autoplayTween.kill();
      state.autoplayTween = null;
    }
    state.autoplayProgress = 0;
  }, []);

  // Main lifecycle & mouse parallax ticker
  useEffect(() => {
    const state = animState.current;

    // Initialize ring stroke
    if (ringRef.current) {
      ringRef.current.style.strokeDasharray = String(circumference);
      ringRef.current.style.strokeDashoffset = String(circumference);
    }

    // Initial render
    updateCaption(0);
    renderCoverflow(0);
    resetAutoplay();

    // Window scroll listener for sticky pinned coverflow scrubbing (Full-screen scrub while scrolling)
    let scrollRafId = 0;
    const onWindowScroll = () => {
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      scrollRafId = requestAnimationFrame(() => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const windowH = window.innerHeight;
        const totalScrollable = trackRef.current.offsetHeight - windowH;
        if (totalScrollable <= 0) return;

        const scrolled = -rect.top;
        const progress = Math.min(1, Math.max(0, scrolled / totalScrollable));
        const targetPos = progress * (total - 1);

        animState.current.targetPos = targetPos;
        if (!animState.current.isDragging) {
          animState.current.pos = targetPos;
          renderCoverflow(targetPos);
        }
      });
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    onWindowScroll();

    // Extra tick after layout paints to guarantee exact bounding rect width
    const rafId = requestAnimationFrame(() => {
      renderCoverflow(0);
    });

    const handleResize = () => {
      onWindowScroll();
      renderCoverflow(state.pos);
    };
    window.addEventListener("resize", handleResize);

    // GSAP Ticker for smooth damping of pointer parallax
    const tickerCallback = () => {
      state.pointerX += (state.targetPointerX - state.pointerX) * 0.09;
      state.pointerY += (state.targetPointerY - state.pointerY) * 0.09;

      if (!state.tween && !state.isDragging) {
        renderCoverflow(state.pos);
      }
    };
    gsap.ticker.add(tickerCallback);

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(tickerCallback);
      if (state.tween) state.tween.kill();
      if (state.autoplayTween) state.autoplayTween.kill();
    };
  }, [circumference, next, prev, renderCoverflow, resetAutoplay, total, updateCaption]);

  // Pointer drag events on Deck
  const handlePointerDown = (e: React.PointerEvent) => {
    const state = animState.current;
    if (state.tween) state.tween.kill();
    if (state.autoplayTween) state.autoplayTween.kill();
    state.isDragging = true;
    state.startX = e.clientX;
    state.startPos = state.pos;
    state.lastX = e.clientX;
    state.lastTime = performance.now();
    state.velocity = 0;

    deckRef.current?.classList.add("is-grabbing");
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = animState.current;

    // Parallax coordinates
    if (deckRef.current) {
      const rect = deckRef.current.getBoundingClientRect();
      state.targetPointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.targetPointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }

    if (!state.isDragging) return;

    const deltaX = e.clientX - state.startX;
    const cardWidth = getBaseCardWidth();
    const dragScale = cardWidth * 1.05;

    state.pos = state.startPos - deltaX / dragScale;
    renderCoverflow(state.pos);

    const now = performance.now();
    const dt = now - state.lastTime;
    if (dt > 10) {
      state.velocity = (e.clientX - state.lastX) / dt;
      state.lastX = e.clientX;
      state.lastTime = now;
    }
  };

  const handlePointerUp = () => {
    const state = animState.current;
    if (!state.isDragging) return;
    state.isDragging = false;
    deckRef.current?.classList.remove("is-grabbing");

    const momentumTarget = state.pos - state.velocity * 0.15;
    const roundedTarget = Math.round(momentumTarget);
    goTo(roundedTarget);
  };

  // Mouse wheel scroll to step through monuments on horizontal swipe
  const lastWheelTime = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    // Only capture horizontal scroll swipes so vertical wheel naturally scrolls the pinned track
    if (Math.abs(e.deltaX) > 20 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const now = Date.now();
      if (now - lastWheelTime.current < 200) return;
      lastWheelTime.current = now;
      if (e.deltaX > 0) {
        next();
      } else {
        prev();
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  return (
    <div
      ref={trackRef}
      className="monolith-scroll-pin-track relative w-full"
      style={{ height: "380vh" }}
    >
      <div
        ref={wrapperRef}
        className="monolith-wrapper sticky top-0 w-full h-screen overflow-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => {
          animState.current.isHovered = true;
        }}
        onMouseLeave={() => {
          animState.current.isHovered = false;
          animState.current.targetPointerX = 0;
          animState.current.targetPointerY = 0;
        }}
      >
      <main className="mono-stage">
        {/* Eyebrow */}
        <p className="mono-eyebrow">
          Kiến Trúc Kỹ Nghệ Phần Mềm · <b>06</b> Đồ Án Đỉnh Cao
        </p>

        {/* 3D Coverflow Deck */}
        <section
          ref={deckRef}
          className="mono-deck"
          aria-roledescription="carousel"
          aria-label="Monument coverflow"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div ref={glowRef} className="mono-deck__glow" aria-hidden="true" />

          <div className="mono-track" role="list">
            {MONUMENTS.map((m, i) => (
              <article
                key={m.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`mono-card ${i === activeIndex ? "is-hero" : ""}`}
                role="listitem"
                tabIndex={0}
                onClick={() => {
                  goToIndex(i);
                  onSelectMonument?.(m);
                }}
              >
                <div className="mono-card__face">
                  <img
                    ref={(el) => {
                      imgRefs.current[i] = el;
                    }}
                    className="mono-card__img"
                    src={m.image}
                    alt={m.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                  <span className="mono-card__veil" aria-hidden="true" />
                  <span className="mono-card__no" aria-hidden="true">
                    {m.no}
                  </span>
                </div>
                <div
                  className="mono-card__reflect"
                  aria-hidden="true"
                  style={{ backgroundImage: `url('${m.image}')` }}
                />
              </article>
            ))}
          </div>
        </section>

        {/* Caption */}
        <section className="mono-caption" aria-live="polite">
          <span className="mono-caption__no">
            <b ref={noRef}>01</b>
            <i>/ 06</i>
          </span>
          <h1 ref={titleRef} className="mono-caption__title">
            Vermillion Arcade
          </h1>
          <p ref={placeRef} className="mono-caption__place">
            Marrakesh Mirage
          </p>
          <p ref={blurbRef} className="mono-caption__blurb">
            An endless terracotta colonnade marching into a flat cobalt sky.
          </p>
        </section>

        {/* Controls */}
        <div className="mono-controls">
          <button
            type="button"
            className="mono-nav mono-nav--prev"
            aria-label="Previous monument"
            onClick={prev}
          >
            <svg className="mono-nav__ico" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="mono-ticks" role="tablist" aria-label="Select monument">
            {MONUMENTS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className={`mono-tick ${i === activeIndex ? "is-on" : ""}`}
                role="tab"
                aria-label={`Show ${m.title}`}
                aria-selected={i === activeIndex}
                onClick={() => goToIndex(i)}
              />
            ))}
          </div>

          <button
            type="button"
            className="mono-nav mono-nav--next"
            aria-label="Next monument"
            onClick={next}
          >
            <svg className="mono-nav__ico" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg className="mono-nav__ring" viewBox="0 0 48 48" aria-hidden="true">
              <circle ref={ringRef} cx="24" cy="24" r="22" />
            </svg>
          </button>
        </div>

        {/* Hint */}
        <p className="mono-hint" aria-hidden="true">
          <span>Drag</span> · scroll · arrows
        </p>
      </main>
      </div>
    </div>
  );
}

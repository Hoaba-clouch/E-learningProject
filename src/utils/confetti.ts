// ── High-Performance Pure Canvas Physics Confetti Burst ─────────────
// No external npm dependencies required, 60fps GPU canvas animation

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wRatio: number;
  opacity: number;
}

const CELEBRATION_PALETTE = [
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#eab308", // Gold
];

export function triggerMarloConfetti(originX = 0.5, originY = 0.5) {
  // Check if window exists
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;contain:paint;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = width * originX;
  const startY = height * originY;

  // Generate 55 realistic confetti particles
  const particles: ConfettiParticle[] = [];
  const particleCount = 55;

  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // Upward cone burst
    const speed = 7 + Math.random() * 11;

    particles.push({
      x: startX + (Math.random() - 0.5) * 40,
      y: startY,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - 2,
      size: 6 + Math.random() * 6,
      color: CELEBRATION_PALETTE[Math.floor(Math.random() * CELEBRATION_PALETTE.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      wRatio: 0.4 + Math.random() * 0.6,
      opacity: 1,
    });
  }

  let startTime: number | null = null;
  const duration = 1600; // 1.6s

  function frame(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      canvas.remove();
      return;
    }

    ctx!.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Physics update
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32; // Gravity
      p.vx *= 0.97; // Air drag
      p.vy *= 0.98;
      p.rotation += p.rotationSpeed;

      // Fade out towards the end
      if (progress > 0.65) {
        p.opacity = Math.max(0, 1 - (progress - 0.65) / 0.35);
      }

      // Draw 3D fluttering particle
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.scale(Math.cos(p.rotation * 1.8), 1); // 3D flip effect
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;

      // Small rounded rectangle confetti
      const w = p.size;
      const h = p.size * p.wRatio;
      ctx!.beginPath();
      ctx!.roundRect(-w / 2, -h / 2, w, h, 2);
      ctx!.fill();
      ctx!.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

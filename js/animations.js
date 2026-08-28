/* =========================================================
   animations.js
   Reusable animation functions, transitions, and particle behavior.
   ========================================================= */

(function (global) {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Utilities ---------- */
  function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  /**
   * Promise-based wait that respects prefers-reduced-motion by
   * collapsing to near-zero durations.
   */
  function wait(ms) {
    if (reduced) return Promise.resolve();
    return delay(ms);
  }

  /* ---------- Scene Transition Engine ----------
     We don't remove scenes from the DOM; we toggle classes for
     smooth, controlled transitions between intro / photo / final. */

  /**
   * Transition from current active scene to next scene.
   * Steps:
   *   1. Mark current as leaving (fade + slight scale + blur).
   *   2. Wait the leave-duration.
   *   3. Activate the next scene (which animates in via CSS).
   */
  async function transitionScenes(currentEl, nextEl, options) {
    const opt = options || {};
    const leaveDelay = opt.leaveDelay ?? 50;
    const betweenDelay = opt.betweenDelay ?? 350;
    const onMidTransition = opt.onMidTransition; // called while leaving

    if (currentEl === nextEl) return;

    if (currentEl) {
      currentEl.classList.add("is-leaving");
      if (typeof onMidTransition === "function") onMidTransition();
      await wait(leaveDelay);
      currentEl.classList.remove("is-active");
      currentEl.classList.remove("is-leaving");
    }

    await wait(betweenDelay);

    if (nextEl) {
      nextEl.classList.add("is-active");
    }
  }

  /* ---------- Cinematic Glow Burst ---------- */
  /**
   * Brief radial burst that lives over the open button. Pure CSS —
   * we just inject a transient element, then remove it.
   */
  function playOpenBurst(buttonEl) {
    if (!buttonEl || reduced) return;

    const burst = document.createElement("span");
    burst.className = "open-burst";
    Object.assign(burst.style, {
      position: "absolute",
      inset: "-40px",
      borderRadius: "50%",
      pointerEvents: "none",
      zIndex: "0",
      background:
        "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(217,158,174,0.45) 35%, rgba(184,145,90,0.0) 70%)",
      opacity: "0",
      transform: "scale(0.4)",
      transition:
        "transform 1100ms cubic-bezier(0.16,1,0.3,1), opacity 1100ms cubic-bezier(0.16,1,0.3,1)",
      filter: "blur(2px)",
    });

    buttonEl.appendChild(burst);

    // Force layout
    void burst.offsetWidth;

    requestAnimationFrame(() => {
      burst.style.opacity = "1";
      burst.style.transform = "scale(2.2)";
    });

    setTimeout(() => {
      burst.style.opacity = "0";
    }, 700);

    setTimeout(() => {
      burst.remove();
    }, 1300);
  }

  /* ---------- Particle System ----------
     Soft floating petals on a canvas. Restrained: small count,
     slow drift, very low opacity. No bursts, no fireworks. */

  const PetalSystem = (function () {
    let canvas = null;
    let ctx = null;
    let rafId = null;
    let petals = [];
    let dpr = 1;
    let lastTime = 0;

    const PALETTE = [
      "rgba(217, 158, 174, 0.55)", // rose
      "rgba(216, 184, 134, 0.50)", // gold
      "rgba(200, 182, 204, 0.55)", // lavender
      "rgba(253, 247, 243, 0.55)", // ivory
    ];

    function petalCount() {
      const w = window.innerWidth;
      if (w < 480) return 14;
      if (w < 900) return 20;
      return 28;
    }

    function spawn(width, height) {
      const size = 4 + Math.random() * 7;
      return {
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.3,
        size,
        speedY: 0.12 + Math.random() * 0.22,
        speedX: -0.12 + Math.random() * 0.24,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: -0.002 + Math.random() * 0.004,
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 0.4 + Math.random() * 0.9,
        opacity: 0.35 + Math.random() * 0.35,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        shape: Math.random() > 0.5 ? "petal" : "dot",
      };
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      if (p.shape === "petal") {
        // soft ellipse (leaf-petal)
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function step(t) {
      if (!canvas) return;
      if (!lastTime) lastTime = t;
      const dt = Math.min(48, t - lastTime);
      lastTime = t;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      petals.forEach((p) => {
        p.y += p.speedY * dt;
        p.x += p.speedX * dt + Math.sin((t / 1000) + p.driftPhase) * p.driftAmp * 0.04;
        p.rot += p.rotSpeed * (dt / 16.67);

        // Soft wrap
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x < -30) p.x = w + 20;
        if (p.x > w + 30) p.x = -20;

        drawPetal(p);
      });

      rafId = requestAnimationFrame(step);
    }

    function init(canvasEl) {
      if (!canvasEl) return;
      canvas = canvasEl;
      ctx = canvas.getContext("2d");
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      resize();
      const count = petalCount();
      petals = Array.from({ length: count }, () => spawn(canvas.width / dpr, canvas.height / dpr));
      if (!reduced) {
        rafId = requestAnimationFrame(step);
      }
      window.addEventListener("resize", resize, { passive: true });
    }

    function resize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pause() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = 0;
    }

    function resume() {
      if (rafId || reduced) return;
      rafId = requestAnimationFrame(step);
    }

    function setIntensity(multiplier) {
      // multiplier between 0 (invisible) and 1 (default)
      // We can't easily clear, so we softly fade by tweaking alpha later
      // via opacity on the canvas. Simple & effective.
      if (!canvas) return;
      canvas.style.opacity = String(Math.max(0, Math.min(1, multiplier)));
    }

    return { init, pause, resume, setIntensity };
  })();

  /* ---------- Public API ---------- */
  global.Animations = {
    reduced,
    wait,
    transitionScenes,
    playOpenBurst,
    PetalSystem,
  };
})(window);

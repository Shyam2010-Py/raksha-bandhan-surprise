

(function () {
  "use strict";

  const { reduced, wait, transitionScenes, playOpenBurst, PetalSystem } = window.Animations;
  const { PHOTOS, updateProgressBar, resetImageTransform, setPhotoSources } = window.Gallery;

  
  const SUPABASE_URL = "https://lvfngtbbkyngthudzvup.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Nhfrs1w8qUqxx1pbMaMbuw_EkccDiRx";
  const ACCESS_FUNCTION = "raksha-photo-access";

  
  const state = {
    phase: "auth", // auth | intro | photos | final | closed
    index: -1,
    total: PHOTOS.length,
    scenesRef: [],
    isAnimating: false,
    hasAccess: false,
  };

  
  const stage = document.getElementById("stage");
  const authScene = stage.querySelector('[data-scene="auth"]');
  const introScene = stage.querySelector('[data-scene="intro"]');
  const finalScene = stage.querySelector('[data-scene="final"]');
  const closedScene = stage.querySelector('[data-scene="closed"]');
  const openButton = document.getElementById("openButton");
  const replayButton = document.getElementById("replayButton");
  const pinForm = document.getElementById("pinForm");
  const pinInput = document.getElementById("pinInput");
  const pinButton = document.getElementById("pinButton");
  const pinStatus = document.getElementById("pinStatus");
  const particlesCanvas = document.getElementById("particles");
  const finalPhotoImg = finalScene.querySelector(".final-photo");

  
  function boot() {
    PetalSystem.init(particlesCanvas);
    state.scenesRef = window.Gallery.mountPhotoScenes(stage);

    pinForm.addEventListener("submit", onPinSubmit);
    pinInput.addEventListener("input", () => {
      pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
      if (pinStatus.textContent) setPinStatus("");
    });

    openButton.addEventListener("click", onOpen);
    openButton.addEventListener("touchstart", onOpenTouchStart, { passive: true });

    if (replayButton) replayButton.addEventListener("click", onReplay);
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => pinInput.focus());
  }

  
  async function onPinSubmit(event) {
    event.preventDefault();
    if (state.isAnimating) return;

    const pin = pinInput.value.trim();
    if (!/^\d{4}$/.test(pin)) {
      setPinStatus("Please enter all four digits.", true);
      pinInput.focus();
      return;
    }

    setPinBusy(true);
    setPinStatus("Preparing your private surprise…");

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${ACCESS_FUNCTION}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ pin }),
      });

      let payload = {};
      try { payload = await response.json(); } catch (_) {}

      if (response.status === 403) {
        const message = payload.error || "That code is not valid right now.";
        if (payload.code === "EXPIRED") {
          await showClosedFromAuth();
        } else {
          setPinStatus(message, true);
          pinInput.select();
        }
        return;
      }

      if (response.status === 409) {
        setPinStatus("The surprise is not ready yet. Please try again later.", true);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to verify the code.");
      }

      if (!Array.isArray(payload.photos) || payload.photos.length !== 5) {
        throw new Error("The private photo set is incomplete.");
      }

      const sources = payload.photos
        .sort((a, b) => Number(a.slot) - Number(b.slot))
        .map((photo) => photo.url);

      setPhotoSources(sources);
      state.hasAccess = true;
      state.phase = "intro";
      pinInput.value = "";
      setPinBusy(false);
      setPinStatus("");

      await transitionScenes(authScene, introScene, {
        leaveDelay: reduced ? 0 : 450,
        betweenDelay: reduced ? 0 : 250,
      });
    } catch (error) {
      console.error(error);
      setPinStatus("We couldn't open the private surprise. Please try again.", true);
    } finally {
      setPinBusy(false);
    }
  }

  function setPinBusy(busy) {
    pinButton.disabled = busy;
    pinInput.disabled = busy;
    pinButton.classList.toggle("is-loading", busy);
    pinButton.querySelector("span:first-child").textContent = busy ? "Opening…" : "Continue";
  }

  function setPinStatus(message, isError) {
    pinStatus.textContent = message;
    pinStatus.classList.toggle("is-error", Boolean(isError));
  }

  async function showClosedFromAuth() {
    state.phase = "closed";
    setPinBusy(false);
    setPinStatus("");
    await transitionScenes(authScene, closedScene, {
      leaveDelay: reduced ? 0 : 350,
      betweenDelay: reduced ? 0 : 250,
    });
  }

  
  let opened = false;
  let autoAdvanceTimer = null;

  function clearAutoAdvance() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  function scheduleAutoAdvance(scene, index) {
    clearAutoAdvance();
    if (reduced || !scene) return;
    const dwell = computeDwellMs(scene);
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      if (state.phase === "photos" && state.index === index && !state.isAnimating) {
        nextPhoto();
      }
    }, dwell);
  }

  function onOpenTouchStart() {
    openButton.classList.add("is-touch");
  }

  async function onOpen() {
    if (opened || !state.hasAccess) return;
    opened = true;
    openButton.setAttribute("aria-disabled", "true");
    openButton.style.pointerEvents = "none";

    playOpenBurst(openButton);
    openButton.classList.add("is-opening");
    openButton.style.transition = "opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.4,0,0.2,1)";
    openButton.style.opacity = "0";
    openButton.style.transform = "scale(0.96)";
    openButton.style.filter = "blur(6px)";

    PetalSystem.setIntensity(1);
    PetalSystem.resume();

    await wait(900);
    await showFirstPhoto();
  }

  
  async function showFirstPhoto() {
    state.phase = "photos";
    state.index = 0;
    const firstScene = state.scenesRef[0];
    if (!firstScene) return;
    resetImageTransform(firstScene);
    bindSceneNavigation(firstScene);

    await transitionScenes(introScene, firstScene, {
      leaveDelay: 400,
      betweenDelay: 350,
    });

    updateProgressBar(firstScene, state.index, state.total);
    scheduleAutoAdvance(firstScene, state.index);
  }

  async function nextPhoto() {
    if (state.isAnimating || state.phase !== "photos") return;
    if (state.index >= state.total - 1) return showFinal();

    state.isAnimating = true;
    clearAutoAdvance();

    const currentScene = state.scenesRef[state.index];
    const nextIndex = state.index + 1;
    const nextScene = state.scenesRef[nextIndex];
    if (!nextScene) {
      state.isAnimating = false;
      return;
    }

    resetImageTransform(nextScene);
    bindSceneNavigation(nextScene);

    await transitionScenes(currentScene, nextScene, {
      leaveDelay: 300,
      betweenDelay: 450,
    });

    state.index = nextIndex;
    updateProgressBar(nextScene, state.index, state.total);
    state.isAnimating = false;
    scheduleAutoAdvance(nextScene, nextIndex);
  }

  async function prevPhoto() {
    if (state.isAnimating || state.phase !== "photos" || state.index <= 0) return;

    state.isAnimating = true;
    clearAutoAdvance();

    const currentScene = state.scenesRef[state.index];
    const prevIndex = state.index - 1;
    const prevScene = state.scenesRef[prevIndex];
    if (!prevScene) {
      state.isAnimating = false;
      return;
    }

    resetImageTransform(prevScene);
    await transitionScenes(currentScene, prevScene, {
      leaveDelay: 250,
      betweenDelay: 400,
    });

    state.index = prevIndex;
    updateProgressBar(prevScene, state.index, state.total);
    state.isAnimating = false;
    scheduleAutoAdvance(prevScene, prevIndex);
  }

  function computeDwellMs(scene) {
    const transition = scene.dataset.transition;
    const base = 7500;
    const extra = transition === "zoom" ? 700 : transition === "depth" ? 1500 : 0;
    return base + extra;
  }

  
  async function showFinal() {
    if (state.phase === "final") return;
    state.phase = "final";
    state.isAnimating = true;
    clearAutoAdvance();

    const currentScene = state.scenesRef[state.index];
    const lastCfg = PHOTOS[PHOTOS.length - 1];
    if (finalPhotoImg && lastCfg) {
      finalPhotoImg.src = lastCfg.source;
      finalPhotoImg.style.objectFit = lastCfg.fitting || "cover";
      finalPhotoImg.style.objectPosition = lastCfg.position || "50% 50%";
      finalPhotoImg.style.transform = `scale(${Number(lastCfg.scale) || 1})`;
    }

    await transitionScenes(currentScene, finalScene, {
      leaveDelay: 600,
      betweenDelay: 450,
    });

    PetalSystem.setIntensity(0.85);
    state.isAnimating = false;
  }

  
  async function onReplay() {
    if (state.isAnimating || !state.hasAccess) return;
    state.isAnimating = true;
    clearAutoAdvance();

    state.scenesRef.forEach((scene) => scene.classList.remove("is-active", "is-leaving"));
    finalScene.classList.remove("is-active");
    introScene.classList.add("is-active");

    state.phase = "intro";
    state.index = -1;
    opened = false;

    openButton.removeAttribute("aria-disabled");
    openButton.style.pointerEvents = "";
    openButton.style.opacity = "";
    openButton.style.transform = "";
    openButton.style.filter = "";
    openButton.classList.remove("is-opening", "is-touch");

    PetalSystem.setIntensity(1);
    state.isAnimating = false;
  }

  
  function bindSceneNavigation(scene) {
    if (!scene || scene.dataset.navBound === "1") return;
    scene.dataset.navBound = "1";

    const prevBtn = scene.querySelector(".nav-zone--prev");
    const nextBtn = scene.querySelector(".nav-zone--next");
    if (prevBtn) prevBtn.addEventListener("click", prevPhoto);
    if (nextBtn) nextBtn.addEventListener("click", nextPhoto);
  }

  
  function onKey(e) {
    if (state.phase !== "photos") return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      nextPhoto();
    } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
      e.preventDefault();
      prevPhoto();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

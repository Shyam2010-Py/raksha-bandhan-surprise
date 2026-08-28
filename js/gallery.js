/* =========================================================
   gallery.js
   Photo configuration, photo progression, fitting, positioning.
   Each entry is independently configurable so a single photo can
   be tweaked later without rebuilding the gallery.
   ========================================================= */

(function (global) {
  "use strict";

  /**
   * PER-PHOTO CONFIG
   *
   * Five curated memories. Each is independently configurable so a
   * single photo can be tweaked later (reframe a face, change fitting,
   * adjust scale) without rebuilding the gallery.
   *
   * Fields:
   *   source      — path or URL of the image
   *   position    — CSS object-position string ("50% 50%", "50% 30%", etc.)
   *   scale       — CSS scale multiplier applied as a transform on the <img>
   *   fitting     — CSS object-fit value: "cover" | "contain" | "fill" | "none" | "scale-down"
   *   aspectRatio — applied to the .photo-frame__inner (e.g. "4/5", "1/1", "16/9")
   *   transition  — cinematic transition variant used for this photo
   *                 one of: "blur-reveal" | "crossfade" | "zoom" | "drift" | "depth"
   *   eyebrow     — small label above the photo (e.g. "memory 01")
   *   caption     — short emotional caption shown beneath the photo
   *
   * Transition rotation across the five photos uses all five variants
   * exactly once, so the experience feels curated rather than repeated.
   *
   * Supabase migration notes:
   *   - Later, `source` can be replaced with a server-issued signed URL.
   *   - For two experiences (Sister A / Sister B), swap the entire
   *     PHOTOS array via a build-time flag or runtime config.
   */
  const PHOTOS = [
    {
      source: "assets/placeholders/photo-01.png",
      position: "50% 35%",
      scale: 1.0,
      fitting: "cover",
      aspectRatio: "4 / 5",
      transition: "blur-reveal",
      eyebrow: "memory 01",
      caption: "Where it all began.",
    },
    {
      source: "assets/placeholders/photo-02.png",
      position: "50% 50%",
      scale: 1.04,
      fitting: "cover",
      aspectRatio: "1 / 1",
      transition: "crossfade",
      eyebrow: "memory 02",
      caption: "Quiet afternoons, loud laughs.",
    },
    {
      source: "assets/placeholders/photo-03.png",
      position: "50% 30%",
      scale: 1.02,
      fitting: "cover",
      aspectRatio: "3 / 4",
      transition: "drift",
      eyebrow: "memory 03",
      caption: "A day I keep coming back to.",
    },
    {
      source: "assets/placeholders/photo-04.png",
      position: "50% 50%",
      scale: 1.0,
      fitting: "cover",
      aspectRatio: "4 / 5",
      transition: "zoom",
      eyebrow: "memory 04",
      caption: "Same sky, different city.",
    },
    {
      source: "assets/placeholders/photo-05.png",
      position: "50% 40%",
      scale: 1.05,
      fitting: "cover",
      aspectRatio: "1 / 1",
      transition: "depth",
      eyebrow: "memory 05",
      caption: "My favourite — for so many reasons.",
    },
  ];

  /**
   * Build a single photo scene element from the template, applying
   * the per-photo configuration. Returns the rendered <section>.
   */
  function buildPhotoScene(index, photo) {
    const tpl = document.getElementById("photo-scene-template");
    const node = tpl.content.firstElementChild.cloneNode(true);

    node.dataset.index = String(index);
    node.dataset.transition = photo.transition || "blur-reveal";
    node.setAttribute("aria-label", `Memory ${index + 1}`);

    const inner = node.querySelector(".photo-frame__inner");
    const img = node.querySelector(".photo-image");

    // Apply per-photo fitting
    inner.style.aspectRatio = photo.aspectRatio || "4 / 5";
    img.style.objectFit = photo.fitting || "cover";
    img.style.objectPosition = photo.position || "50% 50%";

    // Apply scale via transform so it doesn't fight with Ken Burns animation
    img.style.transform = `scale(${Number(photo.scale) || 1})`;

    img.src = photo.source;
    img.alt = `Memory ${index + 1}`;

    node.querySelector(".photo-eyebrow").textContent = photo.eyebrow || `memory ${String(index + 1).padStart(2, "0")}`;
    node.querySelector(".photo-caption").textContent = photo.caption || "";

    const counter = node.querySelector(".progress-counter");
    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(PHOTOS.length).padStart(2, "0")}`;

    return node;
  }

  /**
   * Build and insert all photo scenes into the stage. Each scene
   * is hidden initially; app.js activates them one at a time.
   */
  function mountPhotoScenes(stageEl) {
    const scenes = PHOTOS.map((p, i) => buildPhotoScene(i, p));
    scenes.forEach((s) => stageEl.appendChild(s));
    return scenes;
  }

  /**
   * Update the progress bar fill within the active scene.
   */
  function updateProgressBar(activeScene, currentIndex, total) {
    if (!activeScene) return;
    const fill = activeScene.querySelector(".progress-bar__fill");
    if (!fill) return;
    const pct = ((currentIndex + 1) / total) * 100;
    requestAnimationFrame(() => {
      fill.style.width = `${pct}%`;
    });
  }

  /**
   * Reset the inner transform of the image so the next photo's
   * scale can re-apply cleanly on activation.
   */
  function resetImageTransform(scene) {
    if (!scene) return;
    const img = scene.querySelector(".photo-image");
    if (!img) return;
    img.style.transition = "none";
    // Force reflow so the next class activation restarts any animation cleanly
    void img.offsetWidth;
    img.style.transition = "";
  }


  /** Replace placeholder sources with server-issued private URLs. */
  function setPhotoSources(sources) {
    if (!Array.isArray(sources) || sources.length !== PHOTOS.length) {
      throw new Error(`Expected ${PHOTOS.length} private photo URLs.`);
    }
    PHOTOS.forEach((photo, index) => {
      photo.source = sources[index];
    });
    document.querySelectorAll('.scene-photo').forEach((scene, index) => {
      const img = scene.querySelector('.photo-image');
      if (img && PHOTOS[index]) img.src = PHOTOS[index].source;
    });
  }

  /**
   * Public API
   */
  global.Gallery = {
    PHOTOS,
    buildPhotoScene,
    mountPhotoScenes,
    updateProgressBar,
    resetImageTransform,
    setPhotoSources,
  };
})(window);

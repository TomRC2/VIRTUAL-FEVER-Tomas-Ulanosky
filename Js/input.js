// input.js — Eventos de mouse, touch y botones del DOM

const INPUT = (() => {
  // ─── Helpers ────────────────────────────────────────────────────────────────
  function pointCannon(cssPx_x, cssPx_y) {
    const cx = cssPx_x * G.runtime.dpr, cy = cssPx_y * G.runtime.dpr;
    G.world.cannon.angle = Math.max(0.4, Math.min(
      Math.PI - 0.4,
      Math.atan2(cy - G.world.cannon.y, cx - G.world.cannon.x)
    ));
    G.runtime.pointer.x = cx;
    G.runtime.pointer.y = cy;
  }

  function getCSSPos(t) {
    const r = G.canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  // ─── Mouse ──────────────────────────────────────────────────────────────────
  function setupMouse() {
    G.canvas.addEventListener("mousemove", (e) => {
      const r = G.canvas.getBoundingClientRect();
      pointCannon(e.clientX - r.left, e.clientY - r.top);
    });

    G.canvas.addEventListener("mousedown", (e) => {
      AUDIO.init();
      const r = G.canvas.getBoundingClientRect();
      if (G.world.projectile && G.dash.available && !G.dash.used)
        DASH.trigger(e.clientX - r.left, e.clientY - r.top);
      else
        GAME.fire();
    });
  }

  // ─── Touch ──────────────────────────────────────────────────────────────────
  function setupTouch() {
    G.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      AUDIO.init();
      const t = e.changedTouches[0];
      if (G.touch.activeTouchId !== null && G.touch.activeTouchId !== t.identifier) return;
      G.touch.activeTouchId = t.identifier;
      const pos = getCSSPos(t);
      G.touch.isDragging = false; G.touch.precisionMode = false;
      G.touch.dragStartX = pos.x; G.touch.dragStartY = pos.y;
      if (G.state === "playing") pointCannon(pos.x, pos.y);

      const now = performance.now(), elapsed = now - G.touch.lastTapTime;
      if (elapsed < G.touch.doubleTapThreshold) {
        if (G.world.projectile && G.dash.available && !G.dash.used)
          DASH.trigger(pos.x, pos.y);
        else
          GAME.fire();
        G.touch.lastTapTime = 0;
      } else {
        G.touch.lastTapTime = now;
      }
    }, { passive: false });

    G.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(ct => ct.identifier === G.touch.activeTouchId);
      if (!t || G.state !== "playing") return;
      const pos = getCSSPos(t);

      if (!G.touch.isDragging) {
        const dx = pos.x - G.touch.dragStartX, dy = pos.y - G.touch.dragStartY;
        if (Math.sqrt(dx * dx + dy * dy) > G.touch.dragThreshold)
          G.touch.isDragging = G.touch.precisionMode = true;
      }

      if (G.touch.precisionMode) {
        const dx  = pos.x - G.touch.dragStartX, dy = pos.y - G.touch.dragStartY;
        const dpr = G.runtime.dpr;
        const angle = Math.atan2(
          (G.touch.dragStartY + dy * G.touch.precisionScale) * dpr - G.world.cannon.y,
          (G.touch.dragStartX + dx * G.touch.precisionScale) * dpr - G.world.cannon.x
        );
        G.world.cannon.angle = Math.max(0.4, Math.min(Math.PI - 0.4, angle));
        G.runtime.pointer.x  = (G.touch.dragStartX + dx * G.touch.precisionScale) * dpr;
        G.runtime.pointer.y  = (G.touch.dragStartY + dy * G.touch.precisionScale) * dpr;
      } else {
        pointCannon(pos.x, pos.y);
      }
    }, { passive: false });

    G.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(ct => ct.identifier === G.touch.activeTouchId);
      if (!t) return;
      G.touch.isDragging = G.touch.precisionMode = false;
      G.touch.activeTouchId = null;
    }, { passive: false });

    G.canvas.addEventListener("touchcancel", () => {
      G.touch.isDragging = G.touch.precisionMode = false;
      G.touch.activeTouchId = null;
    });
  }

  // ─── Botones DOM ────────────────────────────────────────────────────────────
  function setupButtons() {
    G.els.btnPlay.addEventListener("click",          () => GAME.setState("playing"));
    G.els.btnRestartInGame.addEventListener("click", () => GAME.setState("playing"));
    G.els.btnMenuInGame.addEventListener("click",    () => GAME.setState("start"));
    G.els.btnSettings.addEventListener("click", () => {
      const hidden = G.els.settingsPanel.hidden;
      G.els.settingsPanel.hidden = !hidden;
      G.els.btnSettings.setAttribute("aria-expanded", String(hidden));
    });
  }

  function init() {
    setupMouse();
    setupTouch();
    setupButtons();
  }

  return { init, pointCannon };
})();

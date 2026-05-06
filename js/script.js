// script.js — Loop principal, máquina de estados, física, boot

const GAME = (() => {
  // ─── Overlay de resultado ──────────────────────────────────────────────────
  function buildResultOverlay() {
    if (G.els.overlayResult) return;
    const div = document.createElement("section");
    div.id = "overlayResult";
    div.style.cssText = "position:absolute;inset:0;display:none;place-items:center;z-index:10;padding:20px;";
    div.innerHTML = `
      <div class="panel" style="text-align:center;max-width:340px;width:100%">
        <div id="resultEmoji"    style="font-size:48px;line-height:1;margin-bottom:8px"></div>
        <div id="resultTitle"    class="title" style="font-size:clamp(24px,6.5vw,36px)"></div>
        <div id="resultSubtitle" class="subtitle" style="margin-top:6px;font-size:14px"></div>
        <div id="resultScore"    style="margin:16px 0 4px;font-size:20px;font-weight:800;
             letter-spacing:0.06em;color:#35f6ff;text-shadow:0 0 14px rgba(53,246,255,0.5)"></div>
        <div class="actions" style="margin-top:18px">
          <button id="btnResultPlay" class="btn btn--primary"   type="button">Jugar de nuevo</button>
          <button id="btnResultMenu" class="btn btn--secondary" type="button">Menú</button>
        </div>
      </div>`;
    document.querySelector(".app").appendChild(div);
    G.els.overlayResult = div;
    div.querySelector("#btnResultPlay").addEventListener("click", () => setState("playing"));
    div.querySelector("#btnResultMenu").addEventListener("click", () => setState("start"));
  }

  function showResultOverlay(won) {
    buildResultOverlay();
    const ov    = G.els.overlayResult;
    const emoji = ov.querySelector("#resultEmoji");
    const title = ov.querySelector("#resultTitle");
    const sub   = ov.querySelector("#resultSubtitle");
    const score = ov.querySelector("#resultScore");
    if (won) {
      emoji.textContent      = "✅";
      title.textContent      = "SISTEMA LIMPIO";
      title.style.color      = "#45ff8a";
      title.style.textShadow = "0 0 20px rgba(69,255,138,0.5),0 0 40px rgba(69,255,138,0.25)";
      sub.textContent        = "Todos los nodos críticos eliminados";
    } else {
      emoji.textContent      = "☠️";
      title.textContent      = "INFECCIÓN CRÍTICA";
      title.style.color      = "#ff3af2";
      title.style.textShadow = "0 0 20px rgba(255,58,242,0.5),0 0 40px rgba(255,58,242,0.25)";
      sub.textContent        = "Paquetes de energía agotados";
    }
    score.textContent = `SCORE FINAL: ${G.world.score}`;
    ov.style.display  = "grid";
  }

  function hideResultOverlay() {
    if (G.els.overlayResult) G.els.overlayResult.style.display = "none";
  }

  // ─── Máquina de estados ────────────────────────────────────────────────────
  function setState(next) {
    G.state = next;
    hideResultOverlay();

    if (next === "playing") {
      G.els.startMenu.style.display = "none";
      G.els.btnMenuInGame.hidden    = false;
      G.els.btnRestartInGame.hidden = false;
      G.world.pegs       = createLevel();
      G.world.score      = 0;
      G.world.shots      = G.world.maxShots;
      G.world.cannon.x   = G.runtime.w / 2;
      G.world.projectile = null;
      G.dash.used        = false;
      G.dash.available   = false;
      G.dash.fx          = [];
      initParticles();
      spawnBucket();
      return;
    }

    G.els.btnMenuInGame.hidden    = true;
    G.els.btnRestartInGame.hidden = true;

    if (next === "win" || next === "lose") {
      G.els.startMenu.style.display = "none";
      next === "win" ? AUDIO.win() : AUDIO.lose();
      showResultOverlay(next === "win");
      return;
    }

    G.els.startMenu.style.display = "grid";
  }

  // ─── Nivel y balde ─────────────────────────────────────────────────────────
  function spawnBucket() {
    const dpr = G.runtime.dpr, bw = 96 * dpr;
    G.world.bucket = {
      x: Math.max(0, (G.runtime.w - bw) / 2),
      y: G.runtime.h - 40 * dpr,
      w: bw, h: 20 * dpr, vx: 220 * dpr,
    };
  }

  function createLevel() {
    const dpr = G.runtime.dpr, pegs = [];
    const rows = 8, cols = 7;
    const spacingX = G.runtime.w / (cols + 1);
    const spacingY = (G.runtime.h * 0.6) / (rows + 1);
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (spacingX / 2);
      for (let c = 0; c < cols; c++) {
        const x    = spacingX * (c + 1) + offset - spacingX / 4;
        const y    = 160 * dpr + r * spacingY;
        const kind = Math.random() > 0.8 ? "target" : "normal";
        pegs.push({ x, y, r: 10 * dpr, kind, alive: true, hit: false, hitT: -1 });
      }
    }
    return pegs;
  }

  // ─── Disparo ───────────────────────────────────────────────────────────────
  function fire() {
    if (G.state !== "playing" || G.world.projectile || G.world.shots <= 0) return;
    G.world.shots--;
    const speed = 680 * G.runtime.dpr;
    G.world.projectile = {
      x:  G.world.cannon.x, y: G.world.cannon.y,
      vx: Math.cos(G.world.cannon.angle) * speed,
      vy: Math.sin(G.world.cannon.angle) * speed,
      r:  8 * G.runtime.dpr,
    };
    G.dash.used = false; G.dash.available = true;
    AUDIO.shoot();
  }

  // ─── Partículas ───────────────────────────────────────────────────────────
  // Pool simple: máx 60 partículas activas, sin shadowBlur, sin new[] en caliente
  const MAX_PARTICLES = 60;

  function spawnParticles(x, y, count, color, speed, life) {
    let spawned = 0;
    for (let i = 0; i < G.particles.length && spawned < count; i++) {
      if (G.particles[i].life <= 0) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.4 + Math.random() * 0.6) * speed * G.runtime.dpr;
        const p = G.particles[i];
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
        p.life = life; p.maxLife = life;
        p.r = (1 + Math.random() * 1.5) * G.runtime.dpr;
        p.color = color;
        spawned++;
      }
    }
  }

  function updateParticles(dt) {
    for (const p of G.particles) {
      if (p.life <= 0) continue;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 400 * G.runtime.dpr * dt; // gravedad suave
      p.life -= dt;
    }
  }

  // Inicializar pool con partículas inactivas
  function initParticles() {
    G.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++)
      G.particles.push({ x:0, y:0, vx:0, vy:0, life:0, maxLife:1, r:1, color:"#fff" });
  }

  // ─── Física / update ───────────────────────────────────────────────────────
  function updateAiming() {
    if (G.world.projectile) return;
    G.world.cannon.angle = Math.max(0.4, Math.min(
      Math.PI - 0.4,
      Math.atan2(G.runtime.pointer.y - G.world.cannon.y, G.runtime.pointer.x - G.world.cannon.x)
    ));
  }

  function updateBucket(dt) {
    const b = G.world.bucket; if (!b) return;
    b.x += b.vx * dt;
    if (b.x <= 0)                  { b.x = 0;                  b.vx =  Math.abs(b.vx); }
    if (b.x >= G.runtime.w - b.w) { b.x = G.runtime.w - b.w;  b.vx = -Math.abs(b.vx); }
  }

  function resolveWalls(p) {
    const { w, h } = G.runtime, { wallRestitution } = G.physics;
    if (p.x < p.r)       { p.x = p.r;       p.vx =  Math.abs(p.vx) * wallRestitution; }
    if (p.x > w - p.r)   { p.x = w - p.r;   p.vx = -Math.abs(p.vx) * wallRestitution; }
    if (p.y < p.r)       { p.y = p.r;        p.vy =  Math.abs(p.vy) * wallRestitution; }
  }

  function update(dt) {
    if (G.state !== "playing") return;
    updateAiming();
    updateBucket(dt);
    updateParticles(dt);
    DASH.update(dt);

    const p = G.world.projectile; if (!p) return;
    p.vy += G.physics.gravity * dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    resolveWalls(p);

    for (const peg of G.world.pegs) {
      if (!peg.alive) continue;
      const dx = p.x - peg.x, dy = p.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.r + peg.r) {
        const nx = dx / dist, ny = dy / dist, dot = p.vx * nx + p.vy * ny;
        if (dot < 0) {
          p.vx -= (1 + G.physics.restitution) * dot * nx;
          p.vy -= (1 + G.physics.restitution) * dot * ny;
        }
        const ov = (p.r + peg.r) - dist + 0.5;
        p.x += nx * ov; p.y += ny * ov;
        if (!peg.hit) {
          peg.hit = true; peg.hitT = G.runtime.time;
          G.world.score += peg.kind === "target" ? 100 : 10;
          if (peg.kind === "target") {
            AUDIO.hitTarget();
            spawnParticles(peg.x, peg.y, 10, "#ffaa3c", 160, 0.55); // más, más rápidas
          } else {
            AUDIO.bounce();
            spawnParticles(peg.x, peg.y, 4, "#35f6ff", 90, 0.35);   // pocas, sutiles
          }
        }
      }
    }

    if (p.y > G.runtime.h + p.r) {
      const b = G.world.bucket;
      if (b && p.x > b.x && p.x < b.x + b.w) { G.world.shots++; AUDIO.capture(); }
      G.world.pegs       = G.world.pegs.filter(pg => !pg.hit);
      G.world.projectile = null;
      G.dash.available   = false;
      if (G.world.pegs.filter(pg => pg.kind === "target").length === 0) setState("win");
      else if (G.world.shots <= 0) setState("lose");
    }
  }

  // ─── Loop principal ────────────────────────────────────────────────────────
  function tick(t) {
    const dt = Math.min(0.05, (t - (G.runtime.lastT || t)) / 1000);
    G.runtime.lastT = t; G.runtime.time += dt;
    update(dt);
    RENDER.frame();
    requestAnimationFrame(tick);
  }

  // ─── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    G.runtime.w = G.canvas.clientWidth  * dpr;
    G.runtime.h = G.canvas.clientHeight * dpr;
    G.canvas.width  = G.runtime.w;
    G.canvas.height = G.runtime.h;
    G.runtime.dpr = dpr;
    BG.build();
    if (G.state === "playing") {
      G.world.cannon.x = G.runtime.w / 2;
      if (G.world.bucket) {
        G.world.bucket.y  = G.runtime.h - 40 * dpr;
        G.world.bucket.w  = 96 * dpr;
        G.world.bucket.h  = 20 * dpr;
        G.world.bucket.vx = Math.sign(G.world.bucket.vx || 1) * 220 * dpr;
      }
    }
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    window.addEventListener("resize", resize);
    INPUT.init();
    resize();
    setState("start");

    // Conectar toggles de música y SFX del menú
    const optMusic = document.getElementById("optMusic");
    const optSfx   = document.getElementById("optSfx");
    const volMusic = document.getElementById("volMusic");
    const volSfx   = document.getElementById("volSfx");
    if (optMusic) optMusic.addEventListener("change", e => AUDIO.setMusic(e.target.checked));
    if (optSfx)   optSfx.addEventListener("change",  e => AUDIO.setSfx(e.target.checked));
    if (volMusic) volMusic.addEventListener("input",  e => AUDIO.setMusicVolume(parseFloat(e.target.value)));
    if (volSfx)   volSfx.addEventListener("input",   e => AUDIO.setSfxVolume(parseFloat(e.target.value)));

    requestAnimationFrame(tick);
  }

  return { init, setState, fire };
})();

// Arrancar
GAME.init();

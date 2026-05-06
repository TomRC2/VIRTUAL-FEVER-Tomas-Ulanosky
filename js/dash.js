// dash.js — Glitch Dash: impulso en el aire + partículas

const DASH = (() => {
  const DASH_FORCE = 520;

  function trigger(cssPx_x, cssPx_y) {
    const p = G.world.projectile;
    if (!p || G.dash.used) return;

    const dpr  = G.runtime.dpr;
    const tx   = cssPx_x * dpr, ty = cssPx_y * dpr;
    const dx   = tx - p.x, dy = ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    p.vx += (dx / dist) * DASH_FORCE * dpr;
    p.vy += (dy / dist) * DASH_FORCE * dpr;
    G.dash.used = true;
    AUDIO.glitchDash();

    // Partículas
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (60 + Math.random() * 140) * dpr;
      G.dash.fx.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 1, decay: 0.04 + Math.random() * 0.04,
        r: (2 + Math.random() * 3) * dpr,
        color: Math.random() > 0.5 ? "#ff3af2" : "#35f6ff",
      });
    }
  }

  function update(dt) {
    for (const fx of G.dash.fx) {
      fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.life -= fx.decay;
    }
    G.dash.fx = G.dash.fx.filter(fx => fx.life > 0);
  }

  function drawFx() {
    for (const fx of G.dash.fx) {
      G.ctx.save();
      G.ctx.globalAlpha   = fx.life;
      G.ctx.beginPath();
      G.ctx.arc(fx.x, fx.y, fx.r * fx.life, 0, Math.PI * 2);
      G.ctx.fillStyle     = fx.color;
      G.ctx.shadowBlur    = 10;
      G.ctx.shadowColor   = fx.color;
      G.ctx.fill();
      G.ctx.restore();
    }
  }

  function drawIndicator() {
    if (!G.world.projectile) return;
    const dpr   = G.runtime.dpr;
    const size  = 38 * dpr;
    const padB  = 70 * dpr;
    const x     = G.runtime.w / 2 - size / 2;
    const y     = G.runtime.h - padB - size;
    const ready = !G.dash.used;

    G.ctx.save();
    G.ctx.globalAlpha   = ready ? 1 : 0.3;
    G.ctx.strokeStyle   = ready ? "#ff3af2" : "#555";
    G.ctx.lineWidth     = 2.5 * dpr;
    G.ctx.shadowBlur    = ready ? 16 : 0;
    G.ctx.shadowColor   = "#ff3af2";
    G.ctx.beginPath();
    G.ctx.roundRect(x, y, size, size, 8 * dpr);
    G.ctx.fillStyle = ready ? "rgba(255,58,242,0.15)" : "rgba(40,40,40,0.4)";
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.fillStyle    = ready ? "#ff3af2" : "#666";
    G.ctx.shadowBlur   = ready ? 10 : 0;
    G.ctx.font         = `bold ${18 * dpr}px system-ui`;
    G.ctx.textAlign    = "center";
    G.ctx.textBaseline = "middle";
    G.ctx.fillText("⚡", x + size / 2, y + size / 2);
    G.ctx.restore();
  }

  return { trigger, update, drawFx, drawIndicator };
})();

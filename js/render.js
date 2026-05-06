// render.js — Dibujo de paredes, cañón, pegs, balde, proyectil, HUD

const RENDER = (() => {
  function walls() {
    const { ctx, runtime, world } = G;
    const dpr  = runtime.dpr, wt = 5 * dpr;
    const topY = world.cannon.y + 24 * dpr;
    const botY = runtime.h - 55 * dpr;
    const segH = 60 * dpr, tick = 10 * dpr;

    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = "#35f6ff";
    ctx.strokeStyle = "#35f6ff"; ctx.lineWidth = wt; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(wt / 2, topY);              ctx.lineTo(wt / 2, botY);              ctx.stroke();
    ctx.beginPath(); ctx.moveTo(runtime.w - wt / 2, topY);  ctx.lineTo(runtime.w - wt / 2, botY);  ctx.stroke();

    ctx.lineWidth = 1.5 * dpr; ctx.shadowBlur = 4;
    for (let y = topY + segH; y < botY; y += segH) {
      ctx.beginPath(); ctx.moveTo(0, y);          ctx.lineTo(tick, y);             ctx.stroke();
      ctx.beginPath(); ctx.moveTo(runtime.w, y);  ctx.lineTo(runtime.w - tick, y); ctx.stroke();
    }
    ctx.restore();
  }

  function aimLine() {
    if (G.world.projectile) return;
    const { ctx, runtime, world, touch } = G;
    const { x, y, angle } = world.cannon;

    ctx.save();
    ctx.strokeStyle = touch.precisionMode ? "rgba(255,58,242,0.7)" : "rgba(53,246,255,0.5)";
    ctx.lineWidth   = (touch.precisionMode ? 2 : 1) * runtime.dpr;
    ctx.setLineDash([6 * runtime.dpr, 6 * runtime.dpr]);
    ctx.shadowBlur  = touch.precisionMode ? 12 : 8;
    ctx.shadowColor = touch.precisionMode ? "#ff3af2" : "#35f6ff";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * 80 * runtime.dpr, y + Math.sin(angle) * 80 * runtime.dpr);
    ctx.stroke();
    ctx.restore();
  }

  function cannon() {
    const { ctx, runtime, world } = G;
    const { x, y, angle } = world.cannon;
    const dpr = runtime.dpr;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Cuerpo principal del cañón
    const bL = 52 * dpr;   // largo del barril
    const bH = 14 * dpr;   // alto del barril
    const bY = -bH / 2;

    // Relleno interior con gradiente
    const grad = ctx.createLinearGradient(0, bY, 0, bY + bH);
    grad.addColorStop(0,   "rgba(53,246,255,0.35)");
    grad.addColorStop(0.5, "rgba(53,246,255,0.08)");
    grad.addColorStop(1,   "rgba(53,246,255,0.35)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, bY, bL, bH, 3 * dpr);
    ctx.fill();

    // Borde neon cian
    ctx.strokeStyle = "#35f6ff";
    ctx.lineWidth   = 2 * dpr;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = "#35f6ff";
    ctx.beginPath();
    ctx.roundRect(0, bY, bL, bH, 3 * dpr);
    ctx.stroke();

    // Boca del cañón (aro en la punta)
    ctx.lineWidth  = 3 * dpr;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.roundRect(bL - 6 * dpr, bY - 3 * dpr, 8 * dpr, bH + 6 * dpr, 2 * dpr);
    ctx.stroke();

    // Base / pivote (círculo en el origen)
    ctx.lineWidth  = 2 * dpr;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 9 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(53,246,255,0.2)";
    ctx.fill();
    ctx.stroke();

    // Línea central decorativa
    ctx.shadowBlur  = 6;
    ctx.lineWidth   = 1 * dpr;
    ctx.strokeStyle = "rgba(53,246,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(10 * dpr, 0);
    ctx.lineTo(bL - 8 * dpr, 0);
    ctx.stroke();

    ctx.restore();
  }

  function pegs() {
    const { ctx, runtime, world } = G;
    for (const peg of world.pegs) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.strokeStyle = peg.kind === "target" ? "#ffaa3c" : "#35f6ff";
      ctx.lineWidth   = 2 * runtime.dpr;
      ctx.shadowBlur  = peg.kind === "target" ? 10 : 6;
      ctx.shadowColor = peg.kind === "target" ? "#ffaa3c" : "#35f6ff";
      if (peg.hit) ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.restore();
    }
  }

  function bucket() {
    const { ctx, runtime, world } = G;
    const b = world.bucket; if (!b) return;
    const dpr = runtime.dpr;
    const { x, y, w, h } = b;

    ctx.save();

    // Relleno interior con gradiente magenta
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0,   "rgba(255,58,242,0.25)");
    grad.addColorStop(1,   "rgba(255,58,242,0.05)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4 * dpr);
    ctx.fill();

    // Borde neon magenta
    ctx.strokeStyle = "#ff3af2";
    ctx.lineWidth   = 2 * dpr;
    ctx.shadowBlur  = 16;
    ctx.shadowColor = "#ff3af2";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4 * dpr);
    ctx.stroke();

    // Línea superior más brillante (boca del balde)
    ctx.lineWidth  = 3 * dpr;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(x + 4 * dpr, y);
    ctx.lineTo(x + w - 4 * dpr, y);
    ctx.stroke();

    // Dos patas en la base
    ctx.lineWidth  = 2 * dpr;
    ctx.shadowBlur = 8;
    [[x + w * 0.2, x + w * 0.2], [x + w * 0.8, x + w * 0.8]].forEach(([lx]) => {
      ctx.beginPath();
      ctx.moveTo(lx, y + h);
      ctx.lineTo(lx, y + h + 4 * dpr);
      ctx.stroke();
    });

    ctx.restore();
  }

  function projectile() {
    const { ctx, world } = G;
    const p = world.projectile; if (!p) return;

    ctx.save();

    // Halo exterior
    const halo = ctx.createRadialGradient(p.x, p.y, p.r * 0.3, p.x, p.y, p.r * 1.8);
    halo.addColorStop(0,   "rgba(53,246,255,0.18)");
    halo.addColorStop(1,   "rgba(53,246,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Esfera principal
    const grad = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.1, p.x, p.y, p.r);
    grad.addColorStop(0,   "#ffffff");
    grad.addColorStop(0.4, "#a0f8ff");
    grad.addColorStop(1,   "#35f6ff");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle   = grad;
    ctx.shadowBlur  = 24;
    ctx.shadowColor = "#35f6ff";
    ctx.fill();

    ctx.restore();
  }

  function hud() {
    if (G.state !== "playing") return;
    const { ctx, runtime, world, touch } = G;
    const dpr     = runtime.dpr;
    const safeTop = 62 * dpr, padSide = 16 * dpr;
    const fs1     = 13 * dpr, fs2 = 11 * dpr, lineH = fs1 + 5 * dpr;

    ctx.save();
    ctx.textBaseline = "top"; ctx.shadowBlur = 8;

    ctx.font = `bold ${fs1}px system-ui,sans-serif`;
    ctx.textAlign = "left";  ctx.fillStyle = "#35f6ff"; ctx.shadowColor = "#35f6ff";
    ctx.fillText(`SHOTS  ${world.shots}`, padSide, safeTop);

    ctx.textAlign = "right"; ctx.fillStyle = "#ffaa3c"; ctx.shadowColor = "#ffaa3c";
    ctx.fillText(`SCORE  ${world.score}`, runtime.w - padSide, safeTop);

    const tl = world.pegs.filter(p => p.kind === "target" && !p.hit).length;
    ctx.font = `${fs2}px system-ui,sans-serif`;
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,170,60,0.7)"; ctx.shadowBlur = 4;
    ctx.fillText(`NODOS  ${tl}`, runtime.w - padSide, safeTop + lineH);

    if (touch.precisionMode) {
      ctx.font = `bold ${fs2}px system-ui,sans-serif`;
      ctx.textAlign = "center"; ctx.fillStyle = "#ff3af2";
      ctx.shadowColor = "#ff3af2"; ctx.shadowBlur = 14;
      ctx.fillText("⟡ PRECISIÓN", runtime.w / 2, safeTop + lineH);
    }
    ctx.restore();
  }

  function particles() {
    const { ctx } = G;
    // Sin shadowBlur — dibuja rectángulos de 1px para máximo rendimiento
    for (const p of G.particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    BG.draw();
    if (G.state !== "playing") return;
    walls(); aimLine(); cannon(); pegs(); bucket();
    projectile(); particles(); DASH.drawFx(); DASH.drawIndicator(); hud();
  }

  return { frame };
})();

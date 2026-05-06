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
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.strokeStyle = "#35f6ff"; ctx.lineWidth = 4 * dpr;
    ctx.shadowBlur = 15; ctx.shadowColor = "#35f6ff";
    ctx.strokeRect(0, -8 * dpr, 50 * dpr, 16 * dpr);
    ctx.fillStyle = "rgba(53,246,255,0.2)";
    ctx.fillRect(0, -8 * dpr, 50 * dpr, 16 * dpr);
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
    if (!world.bucket) return;
    ctx.save();
    ctx.strokeStyle = "#ff3af2"; ctx.lineWidth = 2 * runtime.dpr;
    ctx.shadowBlur = 10; ctx.shadowColor = "#ff3af2";
    ctx.strokeRect(world.bucket.x, world.bucket.y, world.bucket.w, world.bucket.h);
    ctx.restore();
  }

  function projectile() {
    const { ctx, world } = G;
    const p = world.projectile; if (!p) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#f3f4ff"; ctx.shadowBlur = 20; ctx.shadowColor = "#35f6ff";
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

  function frame() {
    BG.draw();
    if (G.state !== "playing") return;
    walls(); aimLine(); cannon(); pegs(); bucket();
    projectile(); DASH.drawFx(); DASH.drawIndicator(); hud();
  }

  return { frame };
})();

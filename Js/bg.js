// bg.js — Fondo Synthwave pre-renderizado en offscreen canvas

const BG = (() => {
  function build() {
    const { w, h, dpr } = G.runtime;
    const oc = document.createElement("canvas");
    oc.width = w; oc.height = h;
    const c = oc.getContext("2d");
    const cx = w / 2;

    // Cielo
    const sky = c.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0,    "#0a0015");
    sky.addColorStop(0.45, "#1a0030");
    sky.addColorStop(1,    "#3d0050");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.62);

    // Sol
    const sunCY = h * 0.36;
    const sunR  = Math.min(w, h) * 0.21;
    const sg    = c.createLinearGradient(cx, sunCY - sunR, cx, sunCY + sunR);
    sg.addColorStop(0,   "#ff6ec7");
    sg.addColorStop(0.5, "#ff3af2");
    sg.addColorStop(1,   "#ffaa3c");
    c.save();
    c.beginPath();
    c.arc(cx, sunCY, sunR, 0, Math.PI * 2);
    c.fillStyle   = sg;
    c.shadowBlur  = 55 * dpr;
    c.shadowColor = "#ff3af2";
    c.fill();
    c.restore();

    // Franjas del sol (pintamos encima con el gradiente del cielo, sin destination-out)
    const stripeH   = sunR * 0.12;
    const stripeGap = sunR * 0.17;
    const skyStripe = c.createLinearGradient(0, 0, 0, h * 0.62);
    skyStripe.addColorStop(0,    "#0a0015");
    skyStripe.addColorStop(0.45, "#1a0030");
    skyStripe.addColorStop(1,    "#3d0050");
    for (let i = 0; i < 5; i++) {
      const sy = sunCY + sunR * 0.18 + i * (stripeH + stripeGap);
      c.fillStyle = skyStripe;
      c.fillRect(cx - sunR, sy, sunR * 2, stripeH);
    }

    // Suelo
    const groundY = h * 0.62;
    const ground  = c.createLinearGradient(0, groundY, 0, h);
    ground.addColorStop(0,   "#1a003a");
    ground.addColorStop(0.4, "#0d001f");
    ground.addColorStop(1,   "#06060b");
    c.fillStyle = ground;
    c.fillRect(0, groundY, w, h - groundY);

    // Grilla perspectiva
    const vp = { x: cx, y: groundY };

    c.strokeStyle = "rgba(255,58,242,0.45)";
    c.lineWidth   = 1 * dpr;
    for (let i = 0; i <= 12; i++) {
      const bx = w * (i / 12);
      c.beginPath(); c.moveTo(vp.x, vp.y); c.lineTo(bx, h); c.stroke();
    }

    c.strokeStyle = "rgba(53,246,255,0.35)";
    for (let i = 1; i <= 12; i++) {
      const t  = Math.pow(i / 12, 2);
      const gy = groundY + (h - groundY) * t;
      const lx = vp.x + (0 - vp.x) * (gy - vp.y) / (h - vp.y + 0.001);
      const rx = vp.x + (w - vp.x) * (gy - vp.y) / (h - vp.y + 0.001);
      c.globalAlpha = 0.2 + 0.6 * t;
      c.beginPath();
      c.moveTo(Math.max(0, lx), gy);
      c.lineTo(Math.min(w, rx), gy);
      c.stroke();
    }
    c.globalAlpha = 1;

    G.runtime.bgCache = oc;
  }

  function draw() {
    if (G.runtime.bgCache) {
      G.ctx.drawImage(G.runtime.bgCache, 0, 0);
    } else {
      G.ctx.fillStyle = "#06060b";
      G.ctx.fillRect(0, 0, G.runtime.w, G.runtime.h);
    }
  }

  return { build, draw };
})();

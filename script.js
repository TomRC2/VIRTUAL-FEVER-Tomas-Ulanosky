(() => {
  /** @typedef {"start" | "playing" | "win" | "lose"} GameState */
  /** @type {GameState} */
  let state = "start";

  const els = {
    canvas:           document.getElementById("gameCanvas"),
    startMenu:        document.getElementById("startMenu"),
    btnMenuInGame:    document.getElementById("btnMenuInGame"),
    btnRestartInGame: document.getElementById("btnRestartInGame"),
    btnPlay:          document.getElementById("btnPlay"),
    btnSettings:      document.getElementById("btnSettings"),
    settingsPanel:    document.getElementById("settingsPanel"),
    overlayResult:    null,
  };

  const ctx = els.canvas.getContext("2d", { alpha: false });

  const runtime = {
    lastT: null, dpr: 1, w: 0, h: 0, time: 0,
    pointer: { x: 0, y: 0 },
    bgCache: null,   // offscreen canvas con el fondo pre-renderizado
  };

  const world = {
    cannon: { x: 0, y: 40, angle: Math.PI / 2 },
    projectile: null, pegs: [], bucket: null,
    shots: 10, maxShots: 10, score: 0,
  };

  const physics = {
    gravity: 1800, restitution: 0.92, wallRestitution: 0.75,
  };

  const dash = {
    available: false, used: false, fx: [],
  };

  const touch = {
    lastTapTime: 0, doubleTapThreshold: 300,
    isDragging: false, dragStartX: 0, dragStartY: 0, dragThreshold: 8,
    precisionMode: false, precisionScale: 0.35,
    activeTouchId: null,
  };

  // ─── FONDO SYNTHWAVE PRE-RENDERIZADO ─────────────────────────────────────────
  // Se llama solo en resize. Dibuja una sola vez en un canvas offscreen.
  function buildBgCache() {
    const w = runtime.w, h = runtime.h, dpr = runtime.dpr;
    const oc  = document.createElement("canvas");
    oc.width  = w;
    oc.height = h;
    const c = oc.getContext("2d");

    // Cielo
    const sky = c.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0,    "#0a0015");
    sky.addColorStop(0.45, "#1a0030");
    sky.addColorStop(1,    "#3d0050");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.62);

    // Sol
    const cx   = w / 2;
    const sunCY = h * 0.36;
    const sunR  = Math.min(w, h) * 0.21;
    const sg    = c.createLinearGradient(cx, sunCY - sunR, cx, sunCY + sunR);
    sg.addColorStop(0,   "#ff6ec7");
    sg.addColorStop(0.5, "#ff3af2");
    sg.addColorStop(1,   "#ffaa3c");
    c.save();
    c.beginPath();
    c.arc(cx, sunCY, sunR, 0, Math.PI * 2);
    c.fillStyle = sg;
    c.shadowBlur  = 55 * dpr;
    c.shadowColor = "#ff3af2";
    c.fill();
    c.restore();

    // Franjas que cortan el sol: pintamos encima con el gradiente del cielo
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

    // Grilla perspectiva — SIN shadowBlur para que sea rápido
    const vp = { x: cx, y: groundY };

    // Líneas de fuga (verticales)
    c.strokeStyle = "rgba(255,58,242,0.45)";
    c.lineWidth   = 1 * dpr;
    const cols = 12;
    for (let i = 0; i <= cols; i++) {
      const bx = w * (i / cols);
      c.beginPath();
      c.moveTo(vp.x, vp.y);
      c.lineTo(bx, h);
      c.stroke();
    }

    // Líneas horizontales estáticas
    c.strokeStyle = "rgba(53,246,255,0.35)";
    const rows = 12;
    for (let i = 1; i <= rows; i++) {
      const t  = Math.pow(i / rows, 2);
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

    runtime.bgCache = oc;
  }

  function drawBackground() {
    if (runtime.bgCache) {
      ctx.drawImage(runtime.bgCache, 0, 0);
    } else {
      ctx.fillStyle = "#06060b";
      ctx.fillRect(0, 0, runtime.w, runtime.h);
    }
  }

  // ─── OVERLAY RESULTADO ────────────────────────────────────────────────────────
  function buildResultOverlay() {
    if (els.overlayResult) return;
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
    els.overlayResult = div;
    div.querySelector("#btnResultPlay").addEventListener("click", () => setState("playing"));
    div.querySelector("#btnResultMenu").addEventListener("click", () => setState("start"));
  }

  function showResultOverlay(won) {
    buildResultOverlay();
    const ov    = els.overlayResult;
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
    score.textContent = `SCORE FINAL: ${world.score}`;
    ov.style.display  = "grid";
  }

  function hideResultOverlay() {
    if (els.overlayResult) els.overlayResult.style.display = "none";
  }

  // ─── APUNTADO ─────────────────────────────────────────────────────────────────
  function pointCannon(cssPx_x, cssPx_y) {
    const cx = cssPx_x * runtime.dpr, cy = cssPx_y * runtime.dpr;
    world.cannon.angle = Math.max(0.4, Math.min(Math.PI - 0.4, Math.atan2(cy - world.cannon.y, cx - world.cannon.x)));
    runtime.pointer.x = cx; runtime.pointer.y = cy;
  }

  function updateAiming() {
    if (world.projectile) return;
    world.cannon.angle = Math.max(0.4, Math.min(Math.PI - 0.4,
      Math.atan2(runtime.pointer.y - world.cannon.y, runtime.pointer.x - world.cannon.x)));
  }

  // ─── DISPARO ──────────────────────────────────────────────────────────────────
  function fireProjectile() {
    if (state !== "playing" || world.projectile || world.shots <= 0) return;
    world.shots--;
    const speed = 680 * runtime.dpr;
    world.projectile = {
      x: world.cannon.x, y: world.cannon.y,
      vx: Math.cos(world.cannon.angle) * speed,
      vy: Math.sin(world.cannon.angle) * speed,
      r:  8 * runtime.dpr,
    };
    dash.used = false; dash.available = true;
  }

  // ─── GLITCH DASH ──────────────────────────────────────────────────────────────
  function triggerDash(cssPx_x, cssPx_y) {
    const p = world.projectile;
    if (!p || dash.used) return;
    const dpr  = runtime.dpr;
    const tx   = cssPx_x * dpr, ty = cssPx_y * dpr;
    const dx   = tx - p.x, dy = ty - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    p.vx += (dx/dist) * 520 * dpr;
    p.vy += (dy/dist) * 520 * dpr;
    dash.used = true;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (60 + Math.random() * 140) * dpr;
      dash.fx.push({
        x: p.x, y: p.y,
        vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 1, decay: 0.04 + Math.random()*0.04,
        r: (2 + Math.random()*3)*dpr,
        color: Math.random() > 0.5 ? "#ff3af2" : "#35f6ff",
      });
    }
  }

  function updateDashFx(dt) {
    for (const fx of dash.fx) { fx.x += fx.vx*dt; fx.y += fx.vy*dt; fx.life -= fx.decay; }
    dash.fx = dash.fx.filter(fx => fx.life > 0);
  }

  function drawDashFx() {
    for (const fx of dash.fx) {
      ctx.save();
      ctx.globalAlpha = fx.life;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r*fx.life, 0, Math.PI*2);
      ctx.fillStyle = fx.color;
      ctx.shadowBlur = 10; ctx.shadowColor = fx.color;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawDashIndicator() {
    if (!world.projectile) return;
    const dpr  = runtime.dpr;
    const size = 38 * dpr;
    const padB = 70 * dpr;
    const x    = runtime.w/2 - size/2;
    const y    = runtime.h - padB - size;
    const ready = !dash.used;
    ctx.save();
    ctx.globalAlpha = ready ? 1 : 0.3;
    ctx.strokeStyle = ready ? "#ff3af2" : "#555";
    ctx.lineWidth   = 2.5 * dpr;
    ctx.shadowBlur  = ready ? 16 : 0;
    ctx.shadowColor = "#ff3af2";
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 8*dpr);
    ctx.fillStyle = ready ? "rgba(255,58,242,0.15)" : "rgba(40,40,40,0.4)";
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = ready ? "#ff3af2" : "#666";
    ctx.shadowBlur   = ready ? 10 : 0;
    ctx.font         = `bold ${18*dpr}px system-ui`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", x + size/2, y + size/2);
    ctx.restore();
  }

  // ─── PAREDES ──────────────────────────────────────────────────────────────────
  function resolveWalls(p) {
    if (p.x < p.r)              { p.x = p.r;              p.vx =  Math.abs(p.vx)*physics.wallRestitution; }
    if (p.x > runtime.w - p.r) { p.x = runtime.w - p.r;  p.vx = -Math.abs(p.vx)*physics.wallRestitution; }
    if (p.y < p.r)              { p.y = p.r;              p.vy =  Math.abs(p.vy)*physics.wallRestitution; }
  }

  function drawWalls() {
    const dpr  = runtime.dpr, wt = 5*dpr;
    const topY = world.cannon.y + 24*dpr, botY = runtime.h - 55*dpr;
    const segH = 60*dpr, tick = 10*dpr;
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = "#35f6ff";
    ctx.strokeStyle = "#35f6ff"; ctx.lineWidth = wt; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(wt/2, topY);            ctx.lineTo(wt/2, botY);            ctx.stroke();
    ctx.beginPath(); ctx.moveTo(runtime.w-wt/2, topY);  ctx.lineTo(runtime.w-wt/2, botY);  ctx.stroke();
    ctx.lineWidth = 1.5*dpr; ctx.shadowBlur = 4;
    for (let y = topY+segH; y < botY; y += segH) {
      ctx.beginPath(); ctx.moveTo(0,y);         ctx.lineTo(tick,y);            ctx.stroke();
      ctx.beginPath(); ctx.moveTo(runtime.w,y); ctx.lineTo(runtime.w-tick,y);  ctx.stroke();
    }
    ctx.restore();
  }

  // ─── ESTADO ───────────────────────────────────────────────────────────────────
  function setState(next) {
    state = next;
    hideResultOverlay();
    if (state === "playing") {
      els.startMenu.style.display = "none";
      els.btnMenuInGame.hidden    = false;
      els.btnRestartInGame.hidden = false;
      world.pegs = createLevel(); world.score = 0; world.shots = world.maxShots;
      world.cannon.x = runtime.w/2; world.projectile = null;
      dash.used = false; dash.available = false; dash.fx = [];
      spawnBucket();
      return;
    }
    els.btnMenuInGame.hidden = true; els.btnRestartInGame.hidden = true;
    if (state === "win" || state === "lose") {
      els.startMenu.style.display = "none";
      showResultOverlay(state === "win");
      return;
    }
    els.startMenu.style.display = "grid";
  }

  function spawnBucket() {
    const dpr = runtime.dpr, bw = 96*dpr;
    world.bucket = { x: Math.max(0,(runtime.w-bw)/2), y: runtime.h-40*dpr, w: bw, h: 20*dpr, vx: 220*dpr };
  }

  function updateBucket(dt) {
    const b = world.bucket; if (!b) return;
    b.x += b.vx*dt;
    if (b.x <= 0)              { b.x = 0;              b.vx =  Math.abs(b.vx); }
    if (b.x >= runtime.w-b.w) { b.x = runtime.w-b.w;  b.vx = -Math.abs(b.vx); }
  }

  function createLevel() {
    const dpr = runtime.dpr, pegs = [];
    const rows = 8, cols = 7;
    const spacingX = runtime.w/(cols+1), spacingY = (runtime.h*0.6)/(rows+1);
    for (let r = 0; r < rows; r++) {
      const offset = (r%2)*(spacingX/2);
      for (let c = 0; c < cols; c++) {
        const x = spacingX*(c+1)+offset-spacingX/4, y = 160*dpr+r*spacingY;
        pegs.push({ x, y, r: 10*dpr, kind: Math.random()>0.8?"target":"normal", alive:true, hit:false, hitT:-1 });
      }
    }
    return pegs;
  }

  // ─── DIBUJO ───────────────────────────────────────────────────────────────────
  function drawAimLine() {
    if (world.projectile) return;
    const { x, y, angle } = world.cannon;
    ctx.save();
    ctx.strokeStyle = touch.precisionMode ? "rgba(255,58,242,0.7)" : "rgba(53,246,255,0.5)";
    ctx.lineWidth   = (touch.precisionMode?2:1)*runtime.dpr;
    ctx.setLineDash([6*runtime.dpr,6*runtime.dpr]);
    ctx.shadowBlur  = touch.precisionMode?12:8;
    ctx.shadowColor = touch.precisionMode?"#ff3af2":"#35f6ff";
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(angle)*80*runtime.dpr, y+Math.sin(angle)*80*runtime.dpr);
    ctx.stroke(); ctx.restore();
  }

  function drawCannon() {
    const { x, y, angle } = world.cannon, dpr = runtime.dpr;
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    ctx.strokeStyle="#35f6ff"; ctx.lineWidth=4*dpr; ctx.shadowBlur=15; ctx.shadowColor="#35f6ff";
    ctx.strokeRect(0,-8*dpr,50*dpr,16*dpr);
    ctx.fillStyle="rgba(53,246,255,0.2)"; ctx.fillRect(0,-8*dpr,50*dpr,16*dpr);
    ctx.restore();
  }

  function drawProjectile() {
    const p = world.projectile; if (!p) return;
    ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle="#f3f4ff"; ctx.shadowBlur=20; ctx.shadowColor="#35f6ff"; ctx.fill(); ctx.restore();
  }

  function drawHUD() {
    if (state !== "playing") return;
    const dpr=runtime.dpr, safeTop=62*dpr, padSide=16*dpr, fs1=13*dpr, fs2=11*dpr, lineH=fs1+5*dpr;
    ctx.save(); ctx.textBaseline="top"; ctx.shadowBlur=8;
    ctx.font=`bold ${fs1}px system-ui,sans-serif`;
    ctx.textAlign="left";  ctx.fillStyle="#35f6ff"; ctx.shadowColor="#35f6ff"; ctx.fillText(`SHOTS  ${world.shots}`,padSide,safeTop);
    ctx.textAlign="right"; ctx.fillStyle="#ffaa3c"; ctx.shadowColor="#ffaa3c"; ctx.fillText(`SCORE  ${world.score}`,runtime.w-padSide,safeTop);
    const tl=world.pegs.filter(p=>p.kind==="target"&&!p.hit).length;
    ctx.font=`${fs2}px system-ui,sans-serif`; ctx.textAlign="right"; ctx.fillStyle="rgba(255,170,60,0.7)"; ctx.shadowBlur=4;
    ctx.fillText(`NODOS  ${tl}`,runtime.w-padSide,safeTop+lineH);
    if (touch.precisionMode) {
      ctx.font=`bold ${fs2}px system-ui,sans-serif`; ctx.textAlign="center";
      ctx.fillStyle="#ff3af2"; ctx.shadowColor="#ff3af2"; ctx.shadowBlur=14;
      ctx.fillText("⟡ PRECISIÓN",runtime.w/2,safeTop+lineH);
    }
    ctx.restore();
  }

  // ─── CICLO ────────────────────────────────────────────────────────────────────
  function update(dt) {
    if (state !== "playing") return;
    updateAiming(); updateBucket(dt); updateDashFx(dt);
    const p = world.projectile; if (!p) return;
    p.vy += physics.gravity*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    resolveWalls(p);
    for (const peg of world.pegs) {
      if (!peg.alive) continue;
      const dx=p.x-peg.x, dy=p.y-peg.y, dist=Math.sqrt(dx*dx+dy*dy);
      if (dist < p.r+peg.r) {
        const nx=dx/dist, ny=dy/dist, dot=p.vx*nx+p.vy*ny;
        if (dot<0) { p.vx-=(1+physics.restitution)*dot*nx; p.vy-=(1+physics.restitution)*dot*ny; }
        const ov=(p.r+peg.r)-dist+0.5; p.x+=nx*ov; p.y+=ny*ov;
        if (!peg.hit) { peg.hit=true; peg.hitT=runtime.time; world.score+=peg.kind==="target"?100:10; }
      }
    }
    if (p.y > runtime.h+p.r) {
      const b=world.bucket;
      if (b && p.x>b.x && p.x<b.x+b.w) world.shots++;
      world.pegs=world.pegs.filter(pg=>!pg.hit); world.projectile=null; dash.available=false;
      if (world.pegs.filter(pg=>pg.kind==="target").length===0) setState("win");
      else if (world.shots<=0) setState("lose");
    }
  }

  function render() {
    drawBackground();
    if (state === "playing") {
      drawWalls(); drawAimLine(); drawCannon();
      for (const peg of world.pegs) {
        ctx.save(); ctx.beginPath(); ctx.arc(peg.x,peg.y,peg.r,0,Math.PI*2);
        ctx.strokeStyle=peg.kind==="target"?"#ffaa3c":"#35f6ff"; ctx.lineWidth=2*runtime.dpr;
        ctx.shadowBlur=peg.kind==="target"?10:6; ctx.shadowColor=peg.kind==="target"?"#ffaa3c":"#35f6ff";
        if (peg.hit) ctx.globalAlpha=0.25; ctx.stroke(); ctx.restore();
      }
      if (world.bucket) {
        ctx.save(); ctx.strokeStyle="#ff3af2"; ctx.lineWidth=2*runtime.dpr;
        ctx.shadowBlur=10; ctx.shadowColor="#ff3af2";
        ctx.strokeRect(world.bucket.x,world.bucket.y,world.bucket.w,world.bucket.h); ctx.restore();
      }
      drawProjectile(); drawDashFx(); drawDashIndicator(); drawHUD();
    }
  }

  function tick(t) {
    const dt=Math.min(0.05,(t-(runtime.lastT||t))/1000);
    runtime.lastT=t; runtime.time+=dt;
    update(dt); render();
    requestAnimationFrame(tick);
  }

  // ─── EVENTOS ──────────────────────────────────────────────────────────────────
  function setupMouseEvents() {
    els.canvas.addEventListener("mousemove", (e) => {
      const r=els.canvas.getBoundingClientRect();
      pointCannon(e.clientX-r.left, e.clientY-r.top);
    });
    els.canvas.addEventListener("mousedown", (e) => {
      const r=els.canvas.getBoundingClientRect();
      if (world.projectile && dash.available && !dash.used) triggerDash(e.clientX-r.left, e.clientY-r.top);
      else fireProjectile();
    });
  }

  function getCSSPos(t) { const r=els.canvas.getBoundingClientRect(); return {x:t.clientX-r.left,y:t.clientY-r.top}; }

  function setupTouchEvents() {
    els.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t=e.changedTouches[0];
      if (touch.activeTouchId!==null && touch.activeTouchId!==t.identifier) return;
      touch.activeTouchId=t.identifier;
      const pos=getCSSPos(t);
      touch.isDragging=false; touch.precisionMode=false;
      touch.dragStartX=pos.x; touch.dragStartY=pos.y;
      if (state==="playing") pointCannon(pos.x,pos.y);
      const now=performance.now(), elapsed=now-touch.lastTapTime;
      if (elapsed<touch.doubleTapThreshold) {
        if (world.projectile && dash.available && !dash.used) triggerDash(pos.x,pos.y);
        else fireProjectile();
        touch.lastTapTime=0;
      } else { touch.lastTapTime=now; }
    }, {passive:false});

    els.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t=Array.from(e.changedTouches).find(ct=>ct.identifier===touch.activeTouchId);
      if (!t||state!=="playing") return;
      const pos=getCSSPos(t);
      if (!touch.isDragging) {
        const dx=pos.x-touch.dragStartX, dy=pos.y-touch.dragStartY;
        if (Math.sqrt(dx*dx+dy*dy)>touch.dragThreshold) touch.isDragging=touch.precisionMode=true;
      }
      if (touch.precisionMode) {
        const dx=pos.x-touch.dragStartX, dy=pos.y-touch.dragStartY, dpr=runtime.dpr;
        const angle=Math.atan2((touch.dragStartY+dy*touch.precisionScale)*dpr-world.cannon.y,(touch.dragStartX+dx*touch.precisionScale)*dpr-world.cannon.x);
        world.cannon.angle=Math.max(0.4,Math.min(Math.PI-0.4,angle));
        runtime.pointer.x=(touch.dragStartX+dx*touch.precisionScale)*dpr;
        runtime.pointer.y=(touch.dragStartY+dy*touch.precisionScale)*dpr;
      } else { pointCannon(pos.x,pos.y); }
    }, {passive:false});

    els.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      const t=Array.from(e.changedTouches).find(ct=>ct.identifier===touch.activeTouchId);
      if (!t) return;
      touch.isDragging=touch.precisionMode=false; touch.activeTouchId=null;
    }, {passive:false});

    els.canvas.addEventListener("touchcancel", () => { touch.isDragging=touch.precisionMode=false; touch.activeTouchId=null; });
  }

  function setupButtonEvents() {
    els.btnPlay.addEventListener("click",          ()=>setState("playing"));
    els.btnRestartInGame.addEventListener("click", ()=>setState("playing"));
    els.btnMenuInGame.addEventListener("click",    ()=>setState("start"));
    els.btnSettings.addEventListener("click", () => {
      const hidden=els.settingsPanel.hidden;
      els.settingsPanel.hidden=!hidden;
      els.btnSettings.setAttribute("aria-expanded",String(hidden));
    });
  }

  // ─── BOOT ─────────────────────────────────────────────────────────────────────
  function resize() {
    const dpr=window.devicePixelRatio||1;
    runtime.w=els.canvas.clientWidth*dpr; runtime.h=els.canvas.clientHeight*dpr;
    els.canvas.width=runtime.w; els.canvas.height=runtime.h;
    runtime.dpr=dpr; runtime.ready=true;
    buildBgCache();   // re-render fondo al cambiar tamaño
    if (state==="playing") {
      world.cannon.x=runtime.w/2;
      if (world.bucket) {
        world.bucket.y=runtime.h-40*dpr; world.bucket.w=96*dpr; world.bucket.h=20*dpr;
        world.bucket.vx=Math.sign(world.bucket.vx||1)*220*dpr;
      }
    }
  }

  window.addEventListener("resize", resize);
  setupButtonEvents(); setupMouseEvents(); setupTouchEvents();
  resize(); setState("start"); requestAnimationFrame(tick);
})();

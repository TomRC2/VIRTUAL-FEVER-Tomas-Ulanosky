// audio.js — SFX sintetizados + música desde archivo MP3

const AUDIO = (() => {
  let ac       = null;
  let musicEl  = null;
  let musicOn  = true;
  let sfxOn    = true;
  let musicVol = 0.45;
  let sfxVol   = 0.8;

  let lastBounceTime = 0;
  const BOUNCE_COOLDOWN = 0.08;

  // ─── Init lazy ────────────────────────────────────────────────────────────
  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    musicEl         = document.createElement("audio");
    musicEl.src     = "./assets/audio/Velocity_Peak.mp3";
    musicEl.loop    = true;
    musicEl.volume  = musicVol;
    musicEl.preload = "auto";
    if (musicOn) startMusic();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function osc({ type = "square", freq, freqEnd, start = 0, dur, vol = 0.15, detune = 0 }) {
    const now = ac.currentTime + start;
    const o   = ac.createOscillator();
    const g   = ac.createGain();
    o.type    = type;
    o.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined)
      o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + dur);
    o.detune.value = detune;
    g.gain.setValueAtTime(vol * sfxVol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(now); o.stop(now + dur + 0.01);
  }

  function noise({ start = 0, dur = 0.08, vol = 0.2, lpFreq = 800 }) {
    const now  = ac.currentTime + start;
    const buf  = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = ac.createBufferSource();
    src.buffer = buf;
    const lp   = ac.createBiquadFilter();
    lp.type    = "lowpass"; lp.frequency.value = lpFreq;
    const g    = ac.createGain();
    g.gain.setValueAtTime(vol * sfxVol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp); lp.connect(g); g.connect(ac.destination);
    src.start(now); src.stop(now + dur + 0.01);
  }

  // ─── SFX ──────────────────────────────────────────────────────────────────
  function shoot() {
    if (!ac || !sfxOn) return;
    osc({ type: "sawtooth", freq: 180, freqEnd: 900, dur: 0.18, vol: 0.12 });
    osc({ type: "square",   freq: 120, freqEnd: 600, dur: 0.14, vol: 0.06, detune: 7 });
  }

  function bounce() {
    if (!ac || !sfxOn) return;
    const now = ac.currentTime;
    if (now - lastBounceTime < BOUNCE_COOLDOWN) return;
    lastBounceTime = now;
    osc({ type: "sine", freq: 480, freqEnd: 260, dur: 0.055, vol: 0.07 });
  }

  function hitTarget() {
    if (!ac || !sfxOn) return;
    osc({ type: "sawtooth", freq: 340, freqEnd: 680, dur: 0.12, vol: 0.18 });
    osc({ type: "square",   freq: 680, freqEnd: 340, dur: 0.18, vol: 0.10, detune: 12 });
    noise({ dur: 0.06, vol: 0.15, lpFreq: 2000 });
  }

  function capture() {
    if (!ac || !sfxOn) return;
    osc({ type: "sine", freq: 300, freqEnd: 600, dur: 0.15, vol: 0.18 });
    osc({ type: "sine", freq: 600, freqEnd: 900, dur: 0.12, vol: 0.10, start: 0.06 });
  }

  // Glitch Dash: barrido eléctrico descendente + noise
  function glitchDash() {
    if (!ac || !sfxOn) return;
    osc({ type: "sawtooth", freq: 1200, freqEnd: 200, dur: 0.22, vol: 0.16 });
    osc({ type: "square",   freq: 800,  freqEnd: 150, dur: 0.18, vol: 0.10, detune: -15 });
    noise({ dur: 0.12, vol: 0.18, lpFreq: 3000 });
  }

  function win() {
    if (!ac || !sfxOn) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      osc({ type: "square", freq: f, freqEnd: f * 1.02, dur: 0.18, vol: 0.14, start: i * 0.13 });
      osc({ type: "sine",   freq: f * 2, dur: 0.14, vol: 0.06, start: i * 0.13 });
    });
  }

  function lose() {
    if (!ac || !sfxOn) return;
    [440, 370, 311, 220].forEach((f, i) => {
      osc({ type: "sawtooth", freq: f, freqEnd: f * 0.85, dur: 0.22, vol: 0.13, start: i * 0.16 });
    });
    noise({ start: 0.5, dur: 0.3, vol: 0.1, lpFreq: 400 });
  }

  // ─── MÚSICA ───────────────────────────────────────────────────────────────
  function startMusic() {
    if (!musicEl || !musicOn) return;
    musicEl.play().catch(() => {});
  }

  function stopMusic() {
    if (!musicEl) return;
    musicEl.pause();
    musicEl.currentTime = 0;
  }

  // ─── Toggles y volumen ────────────────────────────────────────────────────
  function setMusic(on) {
    musicOn = on;
    on ? startMusic() : stopMusic();
  }

  function setSfx(on) { sfxOn = on; }

  function setMusicVolume(v) {
    musicVol = v;
    if (musicEl) musicEl.volume = v;
  }

  function setSfxVolume(v) { sfxVol = v; }

  return { init, shoot, bounce, hitTarget, capture, glitchDash, win, lose, setMusic, setSfx, setMusicVolume, setSfxVolume };
})();

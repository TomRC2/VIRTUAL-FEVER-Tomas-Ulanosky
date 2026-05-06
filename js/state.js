// state.js — Estado compartido entre todos los módulos
// Todos los archivos lo leen/escriben directamente sobre estos objetos.

const G = (() => {
  const canvas = document.getElementById("gameCanvas");
  return {
    // Canvas y contexto
    canvas,
    ctx: canvas.getContext("2d", { alpha: false }),

    // Estado del juego
    state: "start",   // "start" | "playing" | "win" | "lose"

    // Tiempo de ejecución
    runtime: {
      lastT: null, dpr: 1, w: 0, h: 0, time: 0,
      pointer: { x: 0, y: 0 },
      bgCache: null,
    },

    // Mundo / física
    world: {
      cannon:     { x: 0, y: 40, angle: Math.PI / 2 },
      projectile: null,
      pegs:       [],
      bucket:     null,
      shots:      10,
      maxShots:   10,
      score:      0,
    },

    physics: {
      gravity: 1400, restitution: 0.55, wallRestitution: 0.45,
    },

    // Partículas — pool fijo, se reusan para no generar garbage
    particles: [],
    dash: {
      available: false, used: false, fx: [],
    },

    // Touch
    touch: {
      lastTapTime: 0, doubleTapThreshold: 300,
      isDragging: false, dragStartX: 0, dragStartY: 0, dragThreshold: 8,
      precisionMode: false, precisionScale: 0.35,
      activeTouchId: null,
    },

    // Elementos del DOM
    els: {
      startMenu:        document.getElementById("startMenu"),
      btnMenuInGame:    document.getElementById("btnMenuInGame"),
      btnRestartInGame: document.getElementById("btnRestartInGame"),
      btnPlay:          document.getElementById("btnPlay"),
      btnSettings:      document.getElementById("btnSettings"),
      settingsPanel:    document.getElementById("settingsPanel"),
      overlayResult:    null,
    },
  };
})();

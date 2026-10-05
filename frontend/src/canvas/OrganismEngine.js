/**
 * OrganismEngine — HTML5 2D Canvas living petri-dish simulation.
 * Manages rendering loops, Brownian drift physics, tendrils, bioluminescent glow,
 * scrubber state transitions, culling decay, theme adaptations (light/dark), and defense morphing.
 */

const PALETTES = {
  light: {
    bgInner: '#FFFFFF',
    bgMid: '#F1F5F9',
    bgOuter: '#E2E8F0',
    ring: 'rgba(13, 148, 136, 0.15)',
    dishBorder: 'rgba(13, 148, 136, 0.35)',
    baseMarker: '#0F172A',
    safe: '#059669',
    low: '#65A30D',
    medium: '#D97706',
    high: '#EA580C',
    critical: '#E11D48',
    untested: '#64748B',
    immune: '#0284C7',
    tendril: 'rgba(13, 148, 136, 0.35)',
    culledTendril: 'rgba(148, 163, 184, 0.35)',
    nucleusBg: '#FFFFFF',
    selectionRing: '#0F172A',
    rootRing1: 'rgba(15, 23, 42, 0.30)',
    rootRing2: 'rgba(13, 148, 136, 0.40)',
  },
  dark: {
    bgInner: '#0E171C',
    bgMid: '#080C0E',
    bgOuter: '#040608',
    ring: 'rgba(20, 184, 166, 0.08)',
    dishBorder: 'rgba(20, 184, 166, 0.25)',
    baseMarker: '#F1F5F9',
    safe: '#10B981',
    low: '#84CC16',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#F43F5E',
    untested: '#94A3B8',
    immune: '#06B6D4',
    tendril: 'rgba(20, 184, 166, 0.28)',
    culledTendril: 'rgba(100, 116, 139, 0.12)',
    nucleusBg: '#0A0D0B',
    selectionRing: '#FFFFFF',
    rootRing1: 'rgba(232, 236, 233, 0.40)',
    rootRing2: 'rgba(79, 216, 168, 0.30)',
  }
};

export function isScored(score) {
  return score !== null && score !== undefined && score !== '' && !Number.isNaN(Number(score));
}

export function formatRisk(score) {
  if (!isScored(score)) return 'UNTESTED';
  const num = Number(score);
  return num.toFixed(2);
}

export function getRiskColor(score, theme = 'light') {
  const p = PALETTES[theme] || PALETTES.light;
  if (!isScored(score)) return p.untested;
  const num = Number(score);
  if (num >= 0.80) return p.critical;
  if (num >= 0.60) return p.high;
  if (num >= 0.40) return p.medium;
  if (num >= 0.20) return p.low;
  return p.safe;
}

export function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(16, 185, 129, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class OrganismEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.theme = options.theme || 'light';

    this.results = [];
    this.lineage = [];
    this.positions = {};
    this.currentGen = 0;
    this.isDefenseActive = false;
    this.defenseData = null;
    this.selectedPromptId = null;
    this.hoveredPromptId = null;

    // Viewport transforms (pan & zoom)
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // Animation loop state
    this.isRunning = false;
    this.animationFrameId = null;
    this.startTime = performance.now();
    this.lastTime = performance.now();

    // Node state interpolation
    this.nodeStates = new Map(); // prompt_id -> { currentRadius, targetRadius, currentAlpha, targetAlpha, color, glow }
  }

  setTheme(theme) {
    if (this.theme !== theme) {
      this.theme = theme;
      this._syncNodeStates();
    }
  }

  updateData({ results, lineage, positions, currentGen, isDefenseActive, defenseData, selectedPromptId, theme }) {
    this.results = results || [];
    this.lineage = lineage || [];
    this.positions = positions || {};
    this.currentGen = currentGen !== undefined ? currentGen : 0;
    this.isDefenseActive = !!isDefenseActive;
    this.defenseData = defenseData || null;
    this.selectedPromptId = selectedPromptId || null;
    if (theme && (theme === 'light' || theme === 'dark')) {
      this.theme = theme;
    }

    this._syncNodeStates();
  }

  _syncNodeStates() {
    const activeResults = this.results || [];
    const resultMap = new Map(activeResults.map(r => [r.prompt_id, r]));
    const p = PALETTES[this.theme] || PALETTES.light;

    Object.keys(this.positions).forEach(promptId => {
      const pos = this.positions[promptId];
      const item = resultMap.get(promptId);
      if (!item) return;

      const isGenVisible = item.generation <= this.currentGen;
      const isCulled = item.generation > 0 && !item.survived_selection && item.generation < this.currentGen;
      
      let targetAlpha = 1.0;
      let targetRadius = pos.baseRadius;

      if (!isGenVisible) {
        targetAlpha = 0.0;
        targetRadius = 0.1;
      } else if (isCulled) {
        targetAlpha = this.theme === 'light' ? 0.38 : 0.30;
        targetRadius = Math.max(5, pos.baseRadius * 0.55);
      } else if (item.generation === this.currentGen && !item.survived_selection && this.currentGen > 0) {
        targetAlpha = 0.88;
        targetRadius = pos.baseRadius;
      }

      // Compute color (base vs defense vs risk score)
      let targetColor = p.baseMarker;
      let glowColor = p.baseMarker;
      let glowBlur = 15;

      if (item.generation === 0) {
        targetColor = p.baseMarker;
        glowColor = p.baseMarker;
        glowBlur = this.theme === 'light' ? 12 : 22;
      } else if (this.isDefenseActive && this.defenseData && this.defenseData.after_risk_score && this.defenseData.after_risk_score[promptId] !== undefined) {
        targetColor = p.immune;
        glowColor = p.immune;
        glowBlur = 12;
      } else {
        const rawScore = item.risk_score;
        targetColor = getRiskColor(rawScore, this.theme);
        glowColor = targetColor;
        const sVal = isScored(rawScore) ? Number(rawScore) : 0.0;
        glowBlur = 8 + sVal * (this.theme === 'light' ? 14 : 20);
      }

      if (!this.nodeStates.has(promptId)) {
        this.nodeStates.set(promptId, {
          currentRadius: isGenVisible ? targetRadius : 0.1,
          targetRadius,
          currentAlpha: isGenVisible ? targetAlpha : 0.0,
          targetAlpha,
          color: targetColor,
          glowColor,
          glowBlur,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: 0.4 + Math.random() * 0.6
        });
      } else {
        const state = this.nodeStates.get(promptId);
        state.targetRadius = targetRadius;
        state.targetAlpha = targetAlpha;
        state.color = targetColor;
        state.glowColor = glowColor;
        state.glowBlur = glowBlur;
      }
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this._renderLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  _renderLoop() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this._updatePhysics(dt, now / 1000);
    this._draw(now / 1000);

    this.animationFrameId = requestAnimationFrame(() => this._renderLoop());
  }

  _updatePhysics(dt, time) {
    const lerpSpeed = 5.0 * dt;
    this.nodeStates.forEach((state) => {
      state.currentRadius += (state.targetRadius - state.currentRadius) * lerpSpeed;
      state.currentAlpha += (state.targetAlpha - state.currentAlpha) * lerpSpeed;
    });
  }

  _draw(time) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const p = PALETTES[this.theme] || PALETTES.light;

    ctx.clearRect(0, 0, width, height);

    // Petri dish background vignette
    ctx.save();
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, 50,
      width / 2, height / 2, Math.max(width, height) / 1.45
    );
    grad.addColorStop(0, p.bgInner);
    grad.addColorStop(0.7, p.bgMid);
    grad.addColorStop(1, p.bgOuter);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Apply pan/zoom transform
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw Petri dish concentric guide rings
    this._drawDishRings(width, height, time, p);

    // Draw Lineage Tendrils
    this._drawTendrils(time, p);

    // Draw Organisms
    this._drawOrganisms(time, p);

    ctx.restore();
  }

  _drawDishRings(width, height, time, p) {
    const { ctx } = this;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.46;

    ctx.save();
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 1;

    for (let r = 80; r < maxR; r += 70) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer petri dish border
    ctx.strokeStyle = p.dishBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawTendrils(time, p) {
    const { ctx } = this;
    if (!this.lineage || this.lineage.length === 0) return;

    ctx.save();
    this.lineage.forEach(edge => {
      const parentId = edge.parent_id;
      const childId = edge.prompt_id;
      if (!parentId || !this.positions[parentId] || !this.positions[childId]) return;

      const pPos = this.positions[parentId];
      const cPos = this.positions[childId];
      const cState = this.nodeStates.get(childId);
      if (!cState || cState.currentAlpha <= 0.05) return;

      const isCulled = cState.targetAlpha < 0.5;

      ctx.beginPath();
      ctx.strokeStyle = isCulled ? p.culledTendril : hexToRgba(cState.color, cState.currentAlpha * (this.theme === 'light' ? 0.55 : 0.4));
      ctx.lineWidth = isCulled ? 1 : 1.5;

      // Subtle organic wave curve
      const midX = (pPos.x + cPos.x) / 2 + Math.sin(time + pPos.x * 0.01) * 8;
      const midY = (pPos.y + cPos.y) / 2 + Math.cos(time + pPos.y * 0.01) * 8;

      ctx.moveTo(pPos.x, pPos.y);
      ctx.quadraticCurveTo(midX, midY, cPos.x, cPos.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  _drawOrganisms(time, p) {
    const { ctx } = this;
    const resultMap = new Map((this.results || []).map(r => [r.prompt_id, r]));

    Object.keys(this.positions).forEach(promptId => {
      const pos = this.positions[promptId];
      const state = this.nodeStates.get(promptId);
      if (!state || state.currentAlpha <= 0.01 || state.currentRadius <= 0.5) return;

      const item = resultMap.get(promptId);
      const isRoot = pos.isRoot || (item && item.generation === 0);
      const isSelected = this.selectedPromptId === promptId;
      const isHovered = this.hoveredPromptId === promptId;

      // Brownian slight drifting
      const driftX = Math.cos(time * state.driftSpeed + state.driftAngle) * 2.5;
      const driftY = Math.sin(time * state.driftSpeed + state.driftAngle) * 2.5;
      const drawX = pos.x + driftX;
      const drawY = pos.y + driftY;

      ctx.save();
      ctx.globalAlpha = state.currentAlpha;

      // Patient Zero Distinct Multi-Ring Glow
      if (isRoot) {
        const pulseR = state.currentRadius + Math.sin(time * 3) * 4;
        ctx.strokeStyle = p.rootRing1;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, pulseR + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = p.rootRing2;
        ctx.beginPath();
        ctx.arc(drawX, drawY, pulseR + 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Selection indicator
      if (isSelected || isHovered) {
        ctx.strokeStyle = p.selectionRing;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, state.currentRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Bioluminescent Glow Halo
      ctx.shadowColor = state.glowColor;
      ctx.shadowBlur = state.glowBlur * (isHovered ? 1.5 : 1.0);

      // Core Organism Body
      ctx.fillStyle = state.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, Math.max(1, state.currentRadius), 0, Math.PI * 2);
      ctx.fill();

      // Organism Inner Nucleus (contrasts with body and background)
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.nucleusBg;
      ctx.beginPath();
      ctx.arc(drawX, drawY, Math.max(1, state.currentRadius * 0.42), 0, Math.PI * 2);
      ctx.fill();

      // Center Cytoplasm speckle
      ctx.fillStyle = state.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, Math.max(0.5, state.currentRadius * 0.18), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  getOrganismAt(canvasX, canvasY) {
    const worldX = (canvasX - this.panX) / this.zoom;
    const worldY = (canvasY - this.panY) / this.zoom;

    const resultMap = new Map((this.results || []).map(r => [r.prompt_id, r]));

    for (const promptId of Object.keys(this.positions)) {
      const pos = this.positions[promptId];
      const state = this.nodeStates.get(promptId);
      if (!state || state.currentAlpha < 0.2) continue;

      const dist = Math.hypot(worldX - pos.x, worldY - pos.y);
      if (dist <= state.currentRadius + 8) {
        return resultMap.get(promptId) || null;
      }
    }
    return null;
  }
}

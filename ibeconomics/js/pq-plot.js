/* =========================================================================
   pq-plot.js — shared high-level plotting component
   -------------------------------------------------------------------------
   Wraps createPlot() from common.js with the boilerplate each diagram
   would otherwise have to reinvent: layered SVG groups, curve drawing with
   axis-clipping, draggable handles that shift curves, regions (polygons),
   price-line dragging with optional springy return, and labels for the
   equilibrium point.

   A diagram provides its own computation of what curves to draw and what
   regions to fill; PQPlot handles the rendering plumbing.

   Usage:
     const plot = new PQPlot({
       container: document.getElementById('plot'),
       scenario: 'greengrocer',
       width: 640, height: 460,
     });
     plot.setCurves({ demand, supply });
     plot.addRegion('consumer-surplus', polygonPoints);
     plot.setPriceLine(p, { draggable: true, onRelease: ... });
     plot.render();
   ========================================================================= */

import {
  createPlot, makeDraggable, spring, scenarios,
  formatPrice, formatQuantity, linearCurve, intersect, svgEl, logEvent,
} from './common.js';

export class PQPlot {
  constructor({ container, scenario = 'generic', width = 640, height = 460, margin } = {}) {
    this.container = container;
    this.scenarioKey = scenario;
    this.width = width;
    this.height = height;
    this.customMargin = margin;
    this.curves = [];
    this.regions = [];
    this.priceLine = null;       // { price, draggable, onMove, onRelease, springy }
    this.labels = [];
    this.handles = [];           // curve handles the diagram has requested
    this.annotations = [];       // arrows/callouts added by the diagram
    this.equilibriumMarker = null;   // { q, p } or null
    this._build();
  }

  _build() {
    this.plot = createPlot({
      container: this.container,
      scenario: this.scenarioKey,
      width: this.width,
      height: this.height,
      ...(this.customMargin ? { margin: this.customMargin } : {}),
    });
    const g = this.plot.plotGroup;
    // Layer order: regions (bottom), annotations, curves, priceLine, handles, labels (top).
    this.regionsG     = svgEl('g', { class: 'regions' });
    this.annotationsG = svgEl('g', { class: 'annotations' });
    this.curvesG      = svgEl('g', { class: 'curves' });
    this.priceLineG   = svgEl('g', { class: 'price-line-group' });
    this.handlesG     = svgEl('g', { class: 'handles' });
    this.labelsG      = svgEl('g', { class: 'labels' });
    g.appendChild(this.regionsG);
    g.appendChild(this.annotationsG);
    g.appendChild(this.curvesG);
    g.appendChild(this.priceLineG);
    g.appendChild(this.handlesG);
    g.appendChild(this.labelsG);
  }

  // ---- public configuration API ----

  /**
   * Set the list of curves to draw. Each item:
   *   { curve, kind: 'demand'|'supply'|'custom', variant: 'primary'|'ghost'|'shifted', label }
   */
  setCurves(curves) { this.curves = curves; return this; }

  /**
   * Add a filled region. points is an array of [q, p] pairs in data space.
   * className picks up the design-system fill colour via CSS.
   */
  addRegion({ id, className, points, label, onHover, onClick } = {}) {
    this.regions.push({ id, className, points, label, onHover, onClick });
    return this;
  }

  /** Clear all regions (call at start of each diagram render cycle). */
  clearRegions() { this.regions = []; return this; }

  /**
   * Configure the draggable horizontal price line.
   *   { price, draggable, springy, springTo, onMove, onRelease }
   * If springy + springTo is set, releasing the line runs a spring to that price.
   */
  setPriceLine(config) { this.priceLine = config; return this; }
  clearPriceLine() { this.priceLine = null; return this; }

  /**
   * Add a draggable handle on a specific curve. The diagram provides the
   * data-space coords and a callback that receives the drop point.
   *   { x: q, y: p, kind: 'demand'|'supply'|'custom', onDrag: (q, p) => void }
   */
  addHandle({ x, y, kind, onDrag, onRelease, radius = 7 }) {
    this.handles.push({ x, y, kind, onDrag, onRelease, radius });
    return this;
  }
  clearHandles() { this.handles = []; return this; }

  addLabel({ x, y, text, textAnchor = 'start', color, className = 'point-label', italic = false, offset = null }) {
    this.labels.push({ x, y, text, textAnchor, color, className, italic, offset });
    return this;
  }
  clearLabels() { this.labels = []; return this; }

  /**
   * Add an annotation (a line or arrow callout). Kinds: 'dropLine', 'bracket', 'leader'.
   */
  addAnnotation(annot) { this.annotations.push(annot); return this; }
  clearAnnotations() { this.annotations = []; return this; }

  setEquilibriumMarker(point) { this.equilibriumMarker = point; return this; }

  // ---- render ----

  render() {
    this._renderRegions();
    this._renderAnnotations();
    this._renderCurves();
    this._renderPriceLine();
    this._renderHandles();
    this._renderLabels();
    this._renderEquilibriumMarker();
  }

  // ---- internals ----

  get _s()     { return scenarios[this.scenarioKey] || scenarios.generic; }
  get xScale() { return this.plot.xScale; }
  get yScale() { return this.plot.yScale; }
  get xInv()   { return this.plot.xInv; }
  get yInv()   { return this.plot.yInv; }
  get svg()    { return this.plot.svg; }
  get margin() { return this.plot.margin; }
  get plotW()  { return this.plot.plotW; }
  get plotH()  { return this.plot.plotH; }

  _clear(group) { while (group.firstChild) group.removeChild(group.firstChild); }

  _visibleEndpoints(curve) {
    const pMax = this._s.priceMax, qMax = this._s.quantityMax;
    const candidates = [];
    [0, qMax].forEach(q => {
      const p = curve.priceAt(q);
      if (p >= 0 && p <= pMax) candidates.push({ q, p });
    });
    [0, pMax].forEach(p => {
      const q = curve.quantityAt(p);
      if (q >= 0 && q <= qMax) candidates.push({ q, p });
    });
    const uniq = [];
    for (const c of candidates) {
      if (!uniq.some(u => Math.abs(u.q - c.q) < 0.01 && Math.abs(u.p - c.p) < 0.01)) uniq.push(c);
    }
    uniq.sort((a, b) => a.q - b.q);
    return uniq.length >= 2 ? [uniq[0], uniq[uniq.length - 1]] : null;
  }

  _renderCurves() {
    this._clear(this.curvesG);
    for (const { curve, kind, variant = 'primary', label } of this.curves) {
      const ends = this._visibleEndpoints(curve);
      if (!ends) continue;
      // CSS class: 'curve demand' for demand primary, 'curve supply ghost' for ghost supply, etc.
      const cls = ['curve', kind, variant === 'ghost' ? 'ghost' : ''].filter(Boolean).join(' ');
      const line = svgEl('line', {
        class: cls,
        x1: this.xScale(ends[0].q), y1: this.yScale(ends[0].p),
        x2: this.xScale(ends[1].q), y2: this.yScale(ends[1].p),
      });
      // Variant-specific styling overrides
      if (variant === 'shifted') {
        // Shifted curve: darker shade of the same family, slightly thicker
        const colorVar = kind === 'demand' ? 'var(--demand-shift)' : kind === 'supply' ? 'var(--supply-shift)' : 'var(--ink)';
        line.setAttribute('stroke', colorVar);
      }
      this.curvesG.appendChild(line);

      if (label) {
        const upper = ends[0].p > ends[1].p ? ends[0] : ends[1];
        const txt = svgEl('text', {
          class: 'curve-label',
          x: this.xScale(upper.q) + (kind === 'supply' ? -18 : 8),
          y: this.yScale(upper.p) + 4,
          fill: variant === 'shifted'
            ? (kind === 'demand' ? 'var(--demand-shift)' : 'var(--supply-shift)')
            : (kind === 'demand' ? 'var(--demand)' : kind === 'supply' ? 'var(--supply)' : 'var(--ink)'),
        });
        if (variant === 'ghost') txt.setAttribute('fill', 'var(--ghost)');
        txt.textContent = label;
        this.curvesG.appendChild(txt);
      }
    }
  }

  _renderRegions() {
    this._clear(this.regionsG);
    for (const r of this.regions) {
      if (!r.points || r.points.length < 3) continue;
      const poly = svgEl('polygon', {
        class: `region ${r.className || ''}`,
        'data-region': r.id || '',
        points: r.points.map(([q, p]) => `${this.xScale(q)},${this.yScale(p)}`).join(' '),
      });
      if (r.onHover) {
        poly.addEventListener('mouseenter', () => r.onHover(true));
        poly.addEventListener('mouseleave', () => r.onHover(false));
      }
      if (r.onClick) poly.addEventListener('click', r.onClick);
      this.regionsG.appendChild(poly);
    }
  }

  _renderAnnotations() {
    this._clear(this.annotationsG);
    for (const a of this.annotations) {
      if (a.kind === 'dropLine') {
        // Vertical drop line at x, from yTop to yBottom
        const line = svgEl('line', {
          class: 'annotation' + (a.dashed ? ' dashed' : ''),
          x1: this.xScale(a.q), y1: this.yScale(a.pFrom),
          x2: this.xScale(a.q), y2: a.toAxis ? (this.margin.top + this.plotH) : this.yScale(a.pTo),
        });
        this.annotationsG.appendChild(line);
      } else if (a.kind === 'acrossLine') {
        const line = svgEl('line', {
          class: 'annotation' + (a.dashed ? ' dashed' : ''),
          x1: a.fromAxis ? this.margin.left : this.xScale(a.qFrom),
          y1: this.yScale(a.p),
          x2: this.xScale(a.qTo),
          y2: this.yScale(a.p),
        });
        this.annotationsG.appendChild(line);
      } else if (a.kind === 'bracket') {
        // A horizontal line with small end-caps, used e.g. for shortage/surplus gap
        const line = svgEl('line', {
          x1: this.xScale(a.qFrom), x2: this.xScale(a.qTo),
          y1: this.yScale(a.p), y2: this.yScale(a.p),
          stroke: a.color || 'var(--ink)',
          'stroke-width': 3,
        });
        this.annotationsG.appendChild(line);
      } else if (a.kind === 'arrow') {
        // Simple line with an arrowhead marker
        const id = `arrow-${Math.random().toString(36).slice(2, 8)}`;
        const defs = this.svg.querySelector('defs') || (() => {
          const d = svgEl('defs'); this.svg.insertBefore(d, this.svg.firstChild); return d;
        })();
        const marker = svgEl('marker', {
          id, viewBox: '0 0 10 10', refX: '8', refY: '5',
          markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse',
        });
        const path = svgEl('path', {
          d: 'M2 1L8 5L2 9', fill: 'none',
          stroke: a.color || 'var(--ink-soft)', 'stroke-width': '1.5',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        });
        marker.appendChild(path);
        defs.appendChild(marker);
        const line = svgEl('line', {
          class: 'annotation',
          x1: this.xScale(a.qFrom), y1: this.yScale(a.pFrom),
          x2: this.xScale(a.qTo),   y2: this.yScale(a.pTo),
          stroke: a.color || 'var(--ink-soft)',
          'marker-end': `url(#${id})`,
        });
        this.annotationsG.appendChild(line);
        if (a.label) {
          const mx = (this.xScale(a.qFrom) + this.xScale(a.qTo)) / 2;
          const my = (this.yScale(a.pFrom) + this.yScale(a.pTo)) / 2;
          const t = svgEl('text', {
            class: 'annotation-label',
            x: mx + (a.labelOffsetX || 6),
            y: my + (a.labelOffsetY || -6),
          });
          t.textContent = a.label;
          this.annotationsG.appendChild(t);
        }
      }
    }
  }

  _renderPriceLine() {
    this._clear(this.priceLineG);
    if (!this.priceLine) return;
    const { price, draggable, onMove, onRelease, springy, springTo } = this.priceLine;
    const y = this.yScale(price);
    const line = svgEl('line', {
      class: 'price-line',
      x1: this.margin.left, x2: this.margin.left + this.plotW,
      y1: y, y2: y,
    });
    this.priceLineG.appendChild(line);
    const handle = svgEl('circle', {
      class: 'price-line-handle',
      cx: this.margin.left + this.plotW - 8, cy: y, r: 6,
    });
    this.priceLineG.appendChild(handle);

    if (draggable) {
      const doDrag = (ev) => {
        const yPx = this._svgY(ev);
        const clamped = Math.max(this.margin.top, Math.min(this.margin.top + this.plotH, yPx));
        const newP = this.yInv(clamped);
        if (onMove) onMove(newP, ev);
      };
      const doRelease = (ev) => {
        const yPx = this._svgY(ev);
        const clamped = Math.max(this.margin.top, Math.min(this.margin.top + this.plotH, yPx));
        const newP = this.yInv(clamped);
        if (onRelease) onRelease(newP, ev);
        if (springy && springTo != null) this._springTo(newP, springTo, onMove);
      };
      makeDraggable(line,   { svg: this.svg, axis: 'y', onMove: (_, y, ev) => doDrag(ev), onEnd: (_, y, ev) => doRelease(ev) });
      makeDraggable(handle, { svg: this.svg, axis: 'y', onMove: (_, y, ev) => doDrag(ev), onEnd: (_, y, ev) => doRelease(ev) });
    }
  }

  _springTo(from, to, onUpdate) {
    if (this._spring) this._spring.stop();
    this._spring = spring({
      from, to,
      stiffness: 120, damping: 10, mass: 1, precision: 0.005,
      onUpdate: (v) => { if (onUpdate) onUpdate(v); },
      onComplete: () => { this._spring = null; if (onUpdate) onUpdate(to); },
    });
  }

  _svgY(ev) {
    const rect = this.svg.getBoundingClientRect();
    const vb = this.svg.viewBox.baseVal;
    return ((ev.clientY - rect.top) / rect.height) * vb.height;
  }
  _svgX(ev) {
    const rect = this.svg.getBoundingClientRect();
    const vb = this.svg.viewBox.baseVal;
    return ((ev.clientX - rect.left) / rect.width) * vb.width;
  }

  _renderHandles() {
    this._clear(this.handlesG);
    for (const h of this.handles) {
      const dot = svgEl('circle', {
        class: `handle ${h.kind || ''}`,
        cx: this.xScale(h.x), cy: this.yScale(h.y), r: h.radius,
      });
      if (h.onDrag) {
        const move = (ev) => {
          const sx = this._svgX(ev), sy = this._svgY(ev);
          const q = this.xInv(sx), p = this.yInv(sy);
          h.onDrag(q, p, ev);
        };
        const up = (ev) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          if (h.onRelease) {
            const sx = this._svgX(ev), sy = this._svgY(ev);
            const q = this.xInv(sx), p = this.yInv(sy);
            h.onRelease(q, p, ev);
          }
        };
        dot.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      }
      this.handlesG.appendChild(dot);
    }
  }

  _renderLabels() {
    this._clear(this.labelsG);
    for (const l of this.labels) {
      const t = svgEl('text', {
        class: l.className,
        x: this.xScale(l.x) + (l.offset?.x || 0),
        y: this.yScale(l.y) + (l.offset?.y || 0),
        'text-anchor': l.textAnchor,
        fill: l.color || 'var(--ink)',
      });
      if (l.italic) t.setAttribute('font-style', 'italic');
      t.textContent = l.text;
      this.labelsG.appendChild(t);
    }
  }

  _renderEquilibriumMarker() {
    // This is a minor convenience; diagrams often want a visible marker at
    // the "natural" equilibrium even when the user has forced a different
    // price or the equilibrium has shifted.
    if (!this.equilibriumMarker) return;
    const m = this.equilibriumMarker;
    const dot = svgEl('circle', {
      class: 'eq-dot',
      cx: this.xScale(m.q), cy: this.yScale(m.p), r: 6,
    });
    this.handlesG.appendChild(dot);
  }

  // ---- utility exposed to diagrams ----

  /** Replace the scenario entirely, rebuilding the plot. */
  setScenario(scenarioKey) {
    this.scenarioKey = scenarioKey;
    this._build();
  }
}

// ---- Generic diagram-page scaffolding helpers ---------------------------
//
// Every diagram page shares the same layout. This helper stamps out the
// boilerplate HTML so each diagram's main file can focus on its specific
// controls and narration.

export function buildHeader({ syllabus, title, onScenarioChange, onModeChange, initialScenario = 'generic' }) {
  // This is here for future use when we want to generate headers from JS.
  // For now, each diagram page includes the header HTML inline because it's
  // easier to tweak per-diagram copy without touching JS.
}

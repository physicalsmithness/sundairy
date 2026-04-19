/* =========================================================================
   pq-plot.js — shared plotting component for supply/demand diagrams
   -------------------------------------------------------------------------
   Each diagram constructs a PQPlot, sets its curves, regions, price line
   and labels each frame, and calls render(). The component handles all
   the SVG plumbing: axes, grid, hatching patterns, draggable curves with
   a cursor-following handle, draggable price line with optional spring
   return, region polygons, force arrows, and a non-grabby equilibrium
   marker.
   ========================================================================= */

import {
  createPlot, spring, scenarios, svgEl, logEvent, linearCurve,
} from './common.js';

export class PQPlot {
  constructor({ container, scenario = 'generic', width = 720, height = 420, margin } = {}) {
    this.container = container;
    this.scenarioKey = scenario;
    this.width = width;
    this.height = height;
    this.customMargin = margin;

    // Per-frame state
    this.curves = [];
    this.regions = [];
    this.priceLine = null;
    this.labels = [];
    this.annotations = [];
    this.forceArrow = null;
    this.gapBar = null;
    this.equilibriumMarker = null;

    this.regionVisibility = {};
    this._spring = null;
    this._cobwebCurves = null;

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
    this._ensureDefs();
    this.regionsG     = svgEl('g', { class: 'regions' });
    this.annotationsG = svgEl('g', { class: 'annotations' });
    this.hitG         = svgEl('g', { class: 'hit-areas' });
    this.curvesG      = svgEl('g', { class: 'curves' });
    this.gapG         = svgEl('g', { class: 'gap' });
    this.forceG       = svgEl('g', { class: 'force-arrows' });
    this.priceLineG   = svgEl('g', { class: 'price-line-group' });
    this.handlesG     = svgEl('g', { class: 'handles' });
    this.labelsG      = svgEl('g', { class: 'labels' });
    g.appendChild(this.regionsG);
    g.appendChild(this.annotationsG);
    g.appendChild(this.hitG);
    g.appendChild(this.curvesG);
    g.appendChild(this.gapG);
    g.appendChild(this.forceG);
    g.appendChild(this.priceLineG);
    g.appendChild(this.handlesG);
    g.appendChild(this.labelsG);

    this.hoverHandle = svgEl('circle', {
      class: 'hover-handle hidden', cx: 0, cy: 0, r: 7,
    });
    this.handlesG.appendChild(this.hoverHandle);
  }

  _ensureDefs() {
    const svgNS = 'http://www.w3.org/2000/svg';
    let defs = this.plot.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(svgNS, 'defs');
      this.plot.svg.insertBefore(defs, this.plot.svg.firstChild);
    }
    // Hatching patterns
    if (!defs.querySelector('#hatch-shortage')) {
      const makeHatch = (id, angle) => {
        const pat = document.createElementNS(svgNS, 'pattern');
        pat.setAttribute('id', id);
        pat.setAttribute('width', 7);
        pat.setAttribute('height', 7);
        pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('patternTransform', `rotate(${angle})`);
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('width', 7); rect.setAttribute('height', 7);
        rect.setAttribute('fill', 'rgba(241, 237, 226, 0.75)');
        pat.appendChild(rect);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', 0); line.setAttribute('y1', 0);
        line.setAttribute('x2', 0); line.setAttribute('y2', 7);
        line.setAttribute('stroke', 'rgba(74, 85, 101, 0.9)');
        line.setAttribute('stroke-width', 1.6);
        pat.appendChild(line);
        defs.appendChild(pat);
      };
      makeHatch('hatch-shortage', 45);
      makeHatch('hatch-surplus', -45);
    }
    // Force arrow marker
    if (!defs.querySelector('#arrowhead-force')) {
      const marker = document.createElementNS(svgNS, 'marker');
      marker.setAttribute('id', 'arrowhead-force');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', 8); marker.setAttribute('refY', 5);
      marker.setAttribute('markerWidth', 7); marker.setAttribute('markerHeight', 7);
      marker.setAttribute('orient', 'auto-start-reverse');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M1 2 L9 5 L1 8 Z');
      path.setAttribute('fill', '#b8502f');
      marker.appendChild(path);
      defs.appendChild(marker);
    }
    // Thin arrow marker for annotations
    if (!defs.querySelector('#arrowhead-thin')) {
      const marker = document.createElementNS(svgNS, 'marker');
      marker.setAttribute('id', 'arrowhead-thin');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', 8); marker.setAttribute('refY', 5);
      marker.setAttribute('markerWidth', 6); marker.setAttribute('markerHeight', 6);
      marker.setAttribute('orient', 'auto-start-reverse');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M2 1L8 5L2 9');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#4a5565');
      path.setAttribute('stroke-width', 1.5);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      marker.appendChild(path);
      defs.appendChild(marker);
    }
  }

  setScenario(scenarioKey) {
    this.scenarioKey = scenarioKey;
    const preserved = { ...this.regionVisibility };
    // Clear persistent element caches before rebuild, otherwise next render
    // will try to update elements that have been orphaned.
    this._priceLineElems = null;
    this._build();
    this.regionVisibility = preserved;
  }

  setCurves(curves)          { this.curves = curves; return this; }
  setRegions(regions)        { this.regions = regions; return this; }
  setPriceLine(config)       { this.priceLine = config; return this; }
  setLabels(labels)          { this.labels = labels; return this; }
  setAnnotations(annots)     { this.annotations = annots; return this; }
  setForceArrow(config)      { this.forceArrow = config; return this; }
  setGapBar(config)          { this.gapBar = config; return this; }
  setEquilibriumMarker(mark) {
    // When the target changes, start a glide animation from the current
    // displayed position to the new target. If no current position exists
    // (first frame), snap immediately.
    if (!mark) {
      this.equilibriumMarker = null;
      this._eqDisplayed = null;
      if (this._eqGlideFrame) cancelAnimationFrame(this._eqGlideFrame);
      return this;
    }
    if (!this._eqDisplayed) {
      this._eqDisplayed = { q: mark.q, p: mark.p };
      this.equilibriumMarker = { ...this._eqDisplayed, ghost: mark.ghost };
      return this;
    }
    // If the target is very close to current displayed, snap
    const dq = mark.q - this._eqDisplayed.q;
    const dp = mark.p - this._eqDisplayed.p;
    if (Math.abs(dq) < 0.1 && Math.abs(dp) < 0.001) {
      this._eqDisplayed = { q: mark.q, p: mark.p };
      this.equilibriumMarker = { ...this._eqDisplayed, ghost: mark.ghost };
      return this;
    }
    // Start a glide animation
    if (this._eqGlideFrame) cancelAnimationFrame(this._eqGlideFrame);
    const startQ = this._eqDisplayed.q;
    const startP = this._eqDisplayed.p;
    const targetQ = mark.q;
    const targetP = mark.p;
    const duration = 220;
    const t0 = performance.now();
    const self = this;
    const step = now => {
      const t = Math.min(1, (now - t0) / duration);
      // Gentle ease-out
      const e = 1 - Math.pow(1 - t, 3);
      self._eqDisplayed = {
        q: startQ + (targetQ - startQ) * e,
        p: startP + (targetP - startP) * e,
      };
      self.equilibriumMarker = { ...self._eqDisplayed, ghost: mark.ghost };
      // Trigger re-render of just the marker (and labels, which may depend on it)
      self._renderEquilibriumMarker();
      self._renderLabels();
      if (t < 1) {
        self._eqGlideFrame = requestAnimationFrame(step);
      } else {
        self._eqGlideFrame = null;
      }
    };
    this._eqGlideFrame = requestAnimationFrame(step);
    // Set immediate marker so next full render picks up the glide source
    this.equilibriumMarker = { ...this._eqDisplayed, ghost: mark.ghost };
    return this;
  }

  setRegionVisibility(id, visible) { this.regionVisibility[id] = visible; }
  isRegionVisible(id) { return this.regionVisibility[id] !== false; }

  setCobwebCurves(curves) { this._cobwebCurves = curves; }

  render() {
    this._renderRegions();
    this._renderAnnotations();
    this._renderHitAreas();
    this._renderCurves();
    this._renderGapBar();
    this._renderForceArrow();
    this._renderOffGraph();
    this._renderPriceLine();
    this._renderEquilibriumMarker();
    this._renderLabels();
    this._renderReturnAnnotation();
  }

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
      const cls = ['curve', kind, variant === 'ghost' ? 'ghost' : ''].filter(Boolean).join(' ');
      const line = svgEl('line', {
        class: cls,
        x1: this.xScale(ends[0].q), y1: this.yScale(ends[0].p),
        x2: this.xScale(ends[1].q), y2: this.yScale(ends[1].p),
      });
      this.curvesG.appendChild(line);

      if (label) {
        const upper = ends[0].p > ends[1].p ? ends[0] : ends[1];
        const offsetX = kind === 'demand' ? -18 : 8;
        const txt = svgEl('text', {
          class: 'curve-label',
          x: this.xScale(upper.q) + offsetX,
          y: this.yScale(upper.p) + 4,
          fill: variant === 'ghost' ? 'var(--ghost)' : (kind === 'demand' ? 'var(--demand)' : 'var(--supply)'),
        });
        txt.textContent = label;
        this.curvesG.appendChild(txt);
      }
    }
  }

  _renderHitAreas() {
    this._clear(this.hitG);
    for (const cfg of this.curves) {
      if (!cfg.draggable) continue;
      const ends = this._visibleEndpoints(cfg.curve);
      if (!ends) continue;
      const hit = svgEl('line', {
        class: `curve-hit ${cfg.kind}-hit`,
        x1: this.xScale(ends[0].q), y1: this.yScale(ends[0].p),
        x2: this.xScale(ends[1].q), y2: this.yScale(ends[1].p),
        'data-kind': cfg.kind,
      });
      this._attachCurveDrag(hit, cfg);
      this.hitG.appendChild(hit);
    }
  }

  _attachCurveDrag(hitLine, cfg) {
    const self = this;
    let dragging = false;

    const showHover = (ev) => {
      if (dragging) return;
      const pt = self._pointerData(ev);
      const pOnCurve = cfg.curve.priceAt(pt.q);
      self.hoverHandle.setAttribute('class', `hover-handle ${cfg.kind}`);
      self.hoverHandle.setAttribute('cx', self.xScale(pt.q));
      self.hoverHandle.setAttribute('cy', self.yScale(pOnCurve));
    };
    const hideHover = () => {
      if (dragging) return;
      self.hoverHandle.setAttribute('class', `hover-handle ${cfg.kind || ''} hidden`);
    };

    hitLine.addEventListener('pointerenter', showHover);
    hitLine.addEventListener('pointermove', showHover);
    hitLine.addEventListener('pointerleave', hideHover);

    hitLine.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      dragging = true;
      hitLine.classList.add('dragging');
      hitLine.setPointerCapture?.(ev.pointerId);
    });

    hitLine.addEventListener('pointermove', ev => {
      if (!dragging) return;
      const pt = self._pointerData(ev);
      // Translate-only: build a new curve shifted horizontally so it passes
      // through the pointer's (q, p).
      const orig = cfg.curve;
      const slope = orig.slope;
      const a = orig.p1.p - slope * orig.p1.q;
      const shift = pt.q - (pt.p - a) / slope;
      const newCurve = linearCurve(
        { q: orig.p1.q + shift, p: orig.p1.p },
        { q: orig.p2.q + shift, p: orig.p2.p }
      );
      if (cfg.onDrag) cfg.onDrag(newCurve, shift);
      // Also update hover handle position to follow the pointer
      self.hoverHandle.setAttribute('cx', self.xScale(pt.q));
      self.hoverHandle.setAttribute('cy', self.yScale(newCurve.priceAt(pt.q)));
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      hitLine.classList.remove('dragging');
      if (cfg.onDragEnd) cfg.onDragEnd();
    };
    hitLine.addEventListener('pointerup', endDrag);
    hitLine.addEventListener('pointercancel', endDrag);
  }

  _pointerData(ev) {
    const rect = this.svg.getBoundingClientRect();
    const vb = this.svg.viewBox.baseVal;
    const x = ((ev.clientX - rect.left) / rect.width) * vb.width;
    const y = ((ev.clientY - rect.top) / rect.height) * vb.height;
    return { svgX: x, svgY: y, q: this.xInv(x), p: this.yInv(y) };
  }

  _renderRegions() {
    this._clear(this.regionsG);
    for (const r of this.regions) {
      if (!r.points || r.points.length < 3) continue;
      const visible = this.isRegionVisible(r.id);
      const poly = svgEl('polygon', {
        class: `region ${r.className || ''} ${visible ? '' : 'hidden'}`,
        'data-region': r.id || '',
        points: r.points.map(([q, p]) => `${this.xScale(q)},${this.yScale(p)}`).join(' '),
      });
      if (r.onClick) poly.addEventListener('click', r.onClick);
      this.regionsG.appendChild(poly);
    }
  }

  _renderAnnotations() {
    this._clear(this.annotationsG);
    for (const a of this.annotations) {
      if (a.kind === 'dropLine') {
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
      } else if (a.kind === 'arrow') {
        const line = svgEl('line', {
          class: 'annotation',
          x1: this.xScale(a.qFrom), y1: this.yScale(a.pFrom),
          x2: this.xScale(a.qTo),   y2: this.yScale(a.pTo),
          'marker-end': 'url(#arrowhead-thin)',
        });
        this.annotationsG.appendChild(line);
      }
    }
  }

  _renderGapBar() {
    this._clear(this.gapG);
    if (!this.gapBar) return;
    const { atPrice, qLow, qHigh, label, direction } = this.gapBar;
    if (qLow == null || qHigh == null || Math.abs(qHigh - qLow) < 0.5) return;
    const y = this.yScale(atPrice);
    const xLow = this.xScale(qLow);
    const xHigh = this.xScale(qHigh);
    const bar = svgEl('line', {
      class: 'gap-bar',
      x1: xLow, y1: y, x2: xHigh, y2: y,
    });
    this.gapG.appendChild(bar);
    [xLow, xHigh].forEach(x => {
      const tick = svgEl('line', {
        class: 'gap-bar-tick',
        x1: x, x2: x, y1: y - 4, y2: y + 4,
      });
      this.gapG.appendChild(tick);
    });
    const midX = (xLow + xHigh) / 2;
    const labelY = direction === 'shortage' ? y - 10 : y + 18;
    const t = svgEl('text', {
      class: 'gap-label',
      x: midX, y: labelY,
      'text-anchor': 'middle',
    });
    t.textContent = label;
    this.gapG.appendChild(t);
  }

  _renderForceArrow() {
    this._clear(this.forceG);
    if (!this.forceArrow) return;
    const { atPrice, magnitude, direction } = this.forceArrow;
    if (magnitude < 0.02) return;
    const len = Math.min(70, 15 + magnitude * 90);
    const x = this.margin.left - 22;
    const yAt = this.yScale(atPrice);
    const y1 = direction === 'up' ? yAt + len * 0.2 : yAt - len * 0.2;
    const y2 = direction === 'up' ? yAt - len * 0.8 : yAt + len * 0.8;
    const arrow = svgEl('line', {
      class: `force-arrow ${direction}`,
      x1: x, y1, x2: x, y2,
      'marker-end': 'url(#arrowhead-force)',
    });
    this.forceG.appendChild(arrow);
  }

  /**
   * Off-graph characters: small figures that appear in the margin to the
   * right of the plot when the market is off equilibrium. Buyers waving
   * banknotes at a shortage, sellers with reduced stickers at a surplus.
   * Controlled via this.offGraphConfig = { enabled, direction, atPrice }.
   */
  setOffGraph(config) { this.offGraphConfig = config; return this; }

  _renderOffGraph() {
    // Use a dedicated group so it doesn't interfere with force arrows
    if (!this._offGraphG) {
      this._offGraphG = svgEl('g', { class: 'off-graph-layer' });
      this.plot.plotGroup.appendChild(this._offGraphG);
    }
    this._clear(this._offGraphG);
    if (!this.offGraphConfig || !this.offGraphConfig.enabled) return;
    const { direction, atPrice } = this.offGraphConfig;
    if (!direction || atPrice == null) return;

    const x = this.margin.left + this.plotW + 24;
    const yAt = this.yScale(atPrice);

    const group = svgEl('g', { class: 'off-graph' });

    if (direction === 'shortage') {
      // Three small buyer figures, waving banknotes. Stacked vertically.
      const label = svgEl('text', {
        class: 'off-graph-label',
        x: x + 12, y: yAt - 4,
        'text-anchor': 'middle',
      });
      label.textContent = 'buyers bid up';
      group.appendChild(label);
      for (let i = 0; i < 3; i++) {
        const yBase = yAt + 12 + i * 26;
        const head = svgEl('circle', {
          cx: x + 6, cy: yBase, r: 4,
          fill: 'var(--ink-soft)',
        });
        const body = svgEl('path', {
          d: `M ${x+2} ${yBase+14} L ${x+10} ${yBase+14} L ${x+6} ${yBase+4} Z`,
          fill: 'var(--ink-soft)',
          opacity: 0.85,
        });
        const arm = svgEl('line', {
          x1: x + 6, y1: yBase + 4,
          x2: x + 16, y2: yBase - 6,
          stroke: 'var(--ink-soft)',
          'stroke-width': 1.5,
          'stroke-linecap': 'round',
        });
        const note = svgEl('rect', {
          x: x + 15, y: yBase - 12,
          width: 10, height: 7,
          fill: 'var(--demand)',
          stroke: 'var(--demand-shift)',
          'stroke-width': 0.5,
          rx: 1,
        });
        group.appendChild(body);
        group.appendChild(head);
        group.appendChild(arm);
        group.appendChild(note);
      }
    } else if (direction === 'surplus') {
      // Two sellers with reduced stickers, below the price line
      const label = svgEl('text', {
        class: 'off-graph-label',
        x: x + 18, y: yAt + 8,
        'text-anchor': 'middle',
      });
      label.textContent = 'sellers cut prices';
      group.appendChild(label);
      for (let i = 0; i < 2; i++) {
        const yBase = yAt + 22 + i * 28;
        const head = svgEl('circle', {
          cx: x + 6, cy: yBase, r: 4,
          fill: 'var(--ink-soft)',
        });
        const body = svgEl('path', {
          d: `M ${x+2} ${yBase+14} L ${x+10} ${yBase+14} L ${x+6} ${yBase+4} Z`,
          fill: 'var(--ink-soft)',
          opacity: 0.85,
        });
        const tag = svgEl('rect', {
          x: x + 14, y: yBase - 2,
          width: 22, height: 10,
          fill: 'var(--welfare-loss-fill)',
          stroke: 'var(--welfare-loss)',
          'stroke-width': 0.5,
          rx: 2,
        });
        const tagText = svgEl('text', {
          x: x + 25, y: yBase + 6,
          'text-anchor': 'middle',
          'font-size': 8,
          fill: 'var(--welfare-loss)',
          'font-weight': 500,
        });
        tagText.textContent = 'SALE';
        group.appendChild(body);
        group.appendChild(head);
        group.appendChild(tag);
        group.appendChild(tagText);
      }
    }

    this._offGraphG.appendChild(group);
  }

  _renderPriceLine() {
    if (!this.priceLine) {
      this._clear(this.priceLineG);
      this._priceLineElems = null;
      return;
    }
    const { price, draggable, onMove, onRelease, springTarget, springStyle, onSpringUpdate } = this.priceLine;
    const y = this.yScale(price);

    // If elements exist, update their positions. Otherwise, build them.
    if (this._priceLineElems) {
      const { hit, line, handle } = this._priceLineElems;
      hit.setAttribute('y1', y); hit.setAttribute('y2', y);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      handle.setAttribute('cy', y);
      // Also keep the latest price line config so the drag listeners see
      // the current spring target and callbacks.
      return;
    }

    this._clear(this.priceLineG);
    const hit = svgEl('line', {
      class: 'price-line-hit',
      x1: this.margin.left, x2: this.margin.left + this.plotW,
      y1: y, y2: y,
    });
    this.priceLineG.appendChild(hit);
    const line = svgEl('line', {
      class: 'price-line',
      x1: this.margin.left, x2: this.margin.left + this.plotW,
      y1: y, y2: y,
    });
    this.priceLineG.appendChild(line);
    const handle = svgEl('circle', {
      class: 'price-line-handle',
      cx: this.margin.left + this.plotW - 10, cy: y, r: 6,
    });
    this.priceLineG.appendChild(handle);

    this._priceLineElems = { hit, line, handle };

    if (!draggable) return;

    const self = this;
    const ds = { dragging: false, startY: null, startP: null, resistedP: null };

    const startDrag = ev => {
      ev.preventDefault();
      if (self._spring) { self._spring.stop(); self._spring = null; }
      ds.dragging = true;
      const pt = self._pointerData(ev);
      ds.startY = pt.svgY;
      ds.startP = self.priceLine.price;
      ds.resistedP = ds.startP;
      handle.classList.add('dragging');
      ev.target.setPointerCapture?.(ev.pointerId);
    };
    const doDrag = ev => {
      if (!ds.dragging) return;
      const pt = self._pointerData(ev);
      const clampedY = Math.max(self.margin.top, Math.min(self.margin.top + self.plotH, pt.svgY));
      const pl = self.priceLine;
      let newP = self.yInv(clampedY);

      // Resistive pull: the further from equilibrium, the more of the
      // user's motion is absorbed. At eq, ratio is 1 (free movement);
      // at a large displacement, ratio approaches 0.3.
      //
      // We use resistedDisp = rawDisp / (1 + k * |rawDisp|/range)
      // which gives ratio 1 at displacement 0 and decreasing ratio for
      // larger displacements.
      if (pl && pl.resistEnabled && pl.springTarget != null) {
        const eqP = pl.springTarget;
        const rawDisplacement = newP - eqP;
        const range = self._s.priceMax;
        const k = 2.5;
        const normAbs = Math.abs(rawDisplacement) / range;
        const factor = 1 / (1 + k * normAbs);
        newP = eqP + rawDisplacement * factor;
        newP = Math.max(0, Math.min(self._s.priceMax, newP));
      }

      ds.resistedP = newP;
      if (pl && pl.onMove) pl.onMove(newP);
    };
    const endDrag = ev => {
      if (!ds.dragging) return;
      ds.dragging = false;
      handle.classList.remove('dragging');
      ev.target.releasePointerCapture?.(ev.pointerId);
      const pl = self.priceLine;
      if (pl && pl.onRelease) pl.onRelease();
      if (pl && pl.springStyle && pl.springStyle !== 'none' && pl.springTarget != null) {
        self._runSpring(pl.price, pl.springTarget, pl.springStyle, pl.onSpringUpdate);
      }
    };

    [hit, line, handle].forEach(elem => {
      elem.addEventListener('pointerdown', startDrag);
      elem.addEventListener('pointermove', doDrag);
      elem.addEventListener('pointerup', endDrag);
      elem.addEventListener('pointercancel', endDrag);
    });
  }

  _runSpring(from, to, style, onUpdate) {
    if (this._spring) this._spring.stop();
    if (style === 'cobweb') {
      this._runCobweb(from, onUpdate);
      return;
    }
    // Set return-in-progress state so we can render an annotation
    this._returnInProgress = {
      direction: from > to ? 'surplus' : 'shortage',
      startedAt: performance.now(),
    };
    this._renderReturnAnnotation();
    const stiffness = 150;
    const critDamping = 2 * Math.sqrt(stiffness);
    const damping = style === 'underdamped' ? critDamping * 0.35 : critDamping;
    this._spring = spring({
      from, to, stiffness, damping, mass: 1, precision: 0.005,
      onUpdate: v => { if (onUpdate) onUpdate(v); },
      onComplete: () => {
        this._spring = null;
        if (onUpdate) onUpdate(to);
        // Fade out the return annotation shortly after the spring settles
        setTimeout(() => {
          this._returnInProgress = null;
          this._renderReturnAnnotation();
        }, 300);
      },
    });
  }

  _renderReturnAnnotation() {
    if (!this._returnAnnotG) {
      this._returnAnnotG = svgEl('g', { class: 'return-annotation' });
      this.plot.plotGroup.appendChild(this._returnAnnotG);
    }
    this._clear(this._returnAnnotG);
    if (!this._returnInProgress || !this.priceLine) return;
    const { direction } = this._returnInProgress;
    const y = this.yScale(this.priceLine.price);
    // Place the annotation in the middle of the plot, a little offset
    // from the price line so it doesn't collide.
    const xMid = this.margin.left + this.plotW * 0.5;
    const label = direction === 'surplus'
      ? 'sellers cut prices, market eases back'
      : 'buyers bid prices up, market rises';
    const yLabel = direction === 'surplus' ? y + 22 : y - 18;
    const text = svgEl('text', {
      class: 'return-arrow-label visible',
      x: xMid, y: yLabel,
      'text-anchor': 'middle',
    });
    text.textContent = label;
    this._returnAnnotG.appendChild(text);
  }

  _runCobweb(fromPrice, onUpdate) {
    const { demand, supply } = this._cobwebCurves || {};
    if (!demand || !supply) { if (onUpdate) onUpdate(fromPrice); return; }
    let p = fromPrice;
    const maxSteps = 10;
    let step = 0;
    const stepDuration = 500;
    const runStep = () => {
      if (step >= maxSteps) return;
      const qSupplied = supply.quantityAt(p);
      if (!isFinite(qSupplied) || qSupplied < 0) return;
      const newP = demand.priceAt(qSupplied);
      const pEnd = Math.max(0, Math.min(this._s.priceMax * 0.98, newP));
      const pStart = p;
      if (Math.abs(pEnd - pStart) < 0.005) return;
      const t0 = performance.now();
      const frame = now => {
        const t = Math.min(1, (now - t0) / stepDuration);
        const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
        const v = pStart + (pEnd - pStart) * eased;
        if (onUpdate) onUpdate(v);
        if (t < 1) requestAnimationFrame(frame);
        else {
          p = pEnd;
          step++;
          setTimeout(runStep, 80);
        }
      };
      requestAnimationFrame(frame);
    };
    runStep();
  }

  _renderEquilibriumMarker() {
    const oldMarks = this.handlesG.querySelectorAll('.eq-mark');
    oldMarks.forEach(m => m.remove());
    if (!this.equilibriumMarker) return;
    const m = this.equilibriumMarker;
    const mark = svgEl('circle', {
      class: `eq-mark ${m.ghost ? 'ghost' : ''}`,
      cx: this.xScale(m.q), cy: this.yScale(m.p), r: 5,
    });
    this.handlesG.appendChild(mark);
  }

  _renderLabels() {
    this._clear(this.labelsG);
    for (const l of this.labels) {
      const cx = l.rawX != null ? l.rawX : this.xScale(l.x);
      const cy = l.rawY != null ? l.rawY : this.yScale(l.y);
      const t = svgEl('text', {
        class: l.className || 'point-label',
        x: cx + (l.offset?.x || 0),
        y: cy + (l.offset?.y || 0),
        'text-anchor': l.textAnchor || 'start',
        fill: l.color || 'var(--ink)',
      });
      if (l.italic) t.setAttribute('font-style', 'italic');
      t.textContent = l.text;
      this.labelsG.appendChild(t);
    }
  }
}

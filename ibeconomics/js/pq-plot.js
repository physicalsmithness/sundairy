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

/* Small figure drawing helpers. Each figure is a 20x28 cluster of SVG shapes
   drawn relative to (cx, yBase) where yBase is the y-coordinate of the
   figure's feet. Stylistically deliberately minimal: head circle, triangle
   body, single raised arm holding a prop.
*/
function drawBuyerFigure(group, cx, yBase) {
  const headY = yBase - 15;
  const head = svgEl('circle', { cx, cy: headY, r: 3.5, fill: 'var(--ink-soft)' });
  const body = svgEl('path', {
    d: `M ${cx-4} ${yBase} L ${cx+4} ${yBase} L ${cx} ${headY + 3} Z`,
    fill: 'var(--ink-soft)', opacity: 0.9,
  });
  const arm = svgEl('line', {
    x1: cx, y1: headY + 3,
    x2: cx + 9, y2: headY - 7,
    stroke: 'var(--ink-soft)', 'stroke-width': 1.4, 'stroke-linecap': 'round',
  });
  const note = svgEl('rect', {
    x: cx + 8, y: headY - 12, width: 11, height: 7,
    fill: 'var(--demand)', stroke: 'var(--demand-shift)', 'stroke-width': 0.5, rx: 1.2,
  });
  group.appendChild(body);
  group.appendChild(head);
  group.appendChild(arm);
  group.appendChild(note);
}

function drawSellerFigure(group, cx, yBase) {
  const headY = yBase - 15;
  const head = svgEl('circle', { cx, cy: headY, r: 3.5, fill: 'var(--ink-soft)' });
  const body = svgEl('path', {
    d: `M ${cx-4} ${yBase} L ${cx+4} ${yBase} L ${cx} ${headY + 3} Z`,
    fill: 'var(--ink-soft)', opacity: 0.9,
  });
  const arm = svgEl('line', {
    x1: cx, y1: headY + 3,
    x2: cx + 8, y2: headY - 5,
    stroke: 'var(--ink-soft)', 'stroke-width': 1.4, 'stroke-linecap': 'round',
  });
  const tag = svgEl('rect', {
    x: cx + 5, y: headY - 10, width: 18, height: 9,
    fill: 'var(--welfare-loss-fill)', stroke: 'var(--welfare-loss)', 'stroke-width': 0.6, rx: 1.5,
  });
  const tagText = svgEl('text', {
    x: cx + 14, y: headY - 3,
    'text-anchor': 'middle', 'font-size': 7,
    fill: 'var(--welfare-loss)', 'font-weight': 600,
  });
  tagText.textContent = 'SALE';
  group.appendChild(body);
  group.appendChild(head);
  group.appendChild(arm);
  group.appendChild(tag);
  group.appendChild(tagText);
}

/* Price-floor context: seller is stuck above the clearing price, unable
   to discount. Instead of a SALE tag, we draw a small padlock icon beside
   the seller to signal the locked-above-market-price constraint. */
function drawFloorSellerFigure(group, cx, yBase) {
  const headY = yBase - 15;
  const head = svgEl('circle', { cx, cy: headY, r: 3.5, fill: 'var(--ink-soft)' });
  const body = svgEl('path', {
    d: `M ${cx-4} ${yBase} L ${cx+4} ${yBase} L ${cx} ${headY + 3} Z`,
    fill: 'var(--ink-soft)', opacity: 0.9,
  });
  // Small pile of unsold stock next to the seller
  for (let i = 0; i < 3; i++) {
    const pile = svgEl('rect', {
      x: cx + 5 + (i % 2) * 2,
      y: yBase - 3 - i * 3,
      width: 7, height: 3,
      fill: 'var(--supply-fill)',
      stroke: 'var(--supply)',
      'stroke-width': 0.4,
      rx: 0.5,
    });
    group.appendChild(pile);
  }
  // Padlock icon: small rectangle with a C-shaped hasp above
  const lockX = cx + 13, lockY = headY - 10;
  const lockBody = svgEl('rect', {
    x: lockX, y: lockY, width: 7, height: 6,
    fill: 'var(--welfare-loss-fill)', stroke: 'var(--welfare-loss)', 'stroke-width': 0.7, rx: 0.8,
  });
  const lockHasp = svgEl('path', {
    d: `M ${lockX + 1.5} ${lockY} Q ${lockX + 1.5} ${lockY - 3}, ${lockX + 3.5} ${lockY - 3} Q ${lockX + 5.5} ${lockY - 3}, ${lockX + 5.5} ${lockY}`,
    fill: 'none', stroke: 'var(--welfare-loss)', 'stroke-width': 0.9,
  });
  group.appendChild(body);
  group.appendChild(head);
  group.appendChild(lockBody);
  group.appendChild(lockHasp);
}

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
    this.transitionG  = svgEl('g', { class: 'transition-markers' });
    this.calloutG     = svgEl('g', { class: 'callouts' });
    g.appendChild(this.regionsG);
    g.appendChild(this.annotationsG);
    g.appendChild(this.curvesG);
    g.appendChild(this.gapG);
    g.appendChild(this.forceG);
    g.appendChild(this.priceLineG);
    g.appendChild(this.hitG);
    g.appendChild(this.handlesG);
    g.appendChild(this.transitionG);  // circle on demand curve and old-eq marker
    g.appendChild(this.labelsG);
    g.appendChild(this.calloutG);     // callouts sit on top of everything

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
    this._hitElems = null;
    this._offGraphG = null;
    this._returnAnnotG = null;
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
  setCallout(config)         { this.callout = config; return this; }
  setTransitionCircle(config) { this.transitionCircle = config; return this; }
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

  /**
   * Dynamic 2: transition to a new equilibrium after a curve shifts.
   *
   * When demand or supply genuinely shifts, the market cannot teleport to
   * the new intersection. In the immediate period, the slow-adjusting side
   * is still at its old output. The price first jumps to P' (the price at
   * which the fast side's new curve crosses the slow side's current
   * quantity), then slides along the fast side's curve as the slow side
   * catches up, arriving at the true new equilibrium P*, Q*.
   *
   * Params:
   *   oldCurves:    { demand, supply } from before the shift
   *   newCurves:    { demand, supply } after the shift (these are what the
   *                 diagram is now using, reflected in state.demand/supply)
   *   changedSide:  'demand' or 'supply' — which side was shifted by the
   *                 user or the event
   *   demandSpeed:  0..1, fraction of adjustment speed (1 = instant)
   *   supplySpeed:  0..1, fraction of adjustment speed (1 = instant)
   *   onUpdate:     callback({ p, q, pPrime, qOld, pOld, progress, phase })
   *                 called ~60 times/second during the animation
   *   onDone:       callback() when settled
   *
   * The transition uses a cubic ease-out with duration inversely related
   * to the slow-side speed. If both speeds are equal, it's a straight glide.
   */
  runTransition({ oldCurves, newCurves, changedSide, demandSpeed = 1.0, supplySpeed = 0.15, onUpdate, onDone }) {
    // Cancel any prior transition
    if (this._transitionAnim) { this._transitionAnim.cancel = true; }

    // Work in data space. Old eq and new eq.
    const intersectLocal = (d, s) => {
      if (!d || !s) return null;
      if (d.slope === s.slope) return null;
      const a = d.p1.p - d.slope * d.p1.q;
      const b = s.p1.p - s.slope * s.p1.q;
      const q = (b - a) / (d.slope - s.slope);
      const p = d.slope * q + a;
      return { q, p };
    };
    const oldEq = intersectLocal(oldCurves.demand, oldCurves.supply);
    const newEq = intersectLocal(newCurves.demand, newCurves.supply);
    if (!oldEq || !newEq) { if (onDone) onDone(); return; }

    // If change is too small, skip
    const tinyShift = Math.abs(newEq.q - oldEq.q) < 0.5 && Math.abs(newEq.p - oldEq.p) < 0.005;
    if (tinyShift) { if (onDone) onDone(); return; }

    // Compute the intermediate (overshoot) point. When demand shifts:
    //   the slow side is supply; it stays at Q_old. The fast side is demand;
    //   its new curve at Q_old gives P' (the immediate-period clearing price).
    // When supply shifts:
    //   the slow side is demand (in its fast default it's not, but we honour
    //   the sliders); supply's new curve at Q_old gives P'.
    // More generally: P' is the NEW curve of the CHANGED side at Q_old.
    const slowCurve = changedSide === 'demand' ? newCurves.supply : newCurves.demand;
    const fastCurveNew = changedSide === 'demand' ? newCurves.demand : newCurves.supply;
    // In reality we should check which side is faster by the speed sliders,
    // not only by which was shifted. For now: the side that wasn't shifted
    // is assumed slow; use demandSpeed and supplySpeed to modulate.
    const slowSpeed = changedSide === 'demand' ? supplySpeed : demandSpeed;
    // Primary intermediate price: fast side's new curve at old quantity
    const pPrime = fastCurveNew.priceAt(oldEq.q);

    // Duration scales inversely with slow-side speed. At speed=1 (instant),
    // very short; at speed=0.15 (default slow), longer. Cap at 2.5s.
    const baseDur = 1600;
    const duration = Math.min(2500, Math.max(350, baseDur * (1 - Math.min(0.85, slowSpeed))));

    const t0 = performance.now();
    const anim = { cancel: false };
    this._transitionAnim = anim;

    const step = (now) => {
      if (anim.cancel) return;
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic

      // Price ride: pPrime at t=0 to newEq.p at t=1
      // Quantity ride: oldEq.q at t=0 to newEq.q at t=1
      const p = pPrime + (newEq.p - pPrime) * e;
      const q = oldEq.q + (newEq.q - oldEq.q) * e;

      if (onUpdate) onUpdate({
        p, q,
        pPrime,
        qOld: oldEq.q,
        pOld: oldEq.p,
        newEq,
        progress: t,
        phase: t < 0.05 ? 'overshoot' : (t < 0.95 ? 'glide' : 'settle'),
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this._transitionAnim = null;
        if (onDone) onDone();
      }
    };
    requestAnimationFrame(step);
  }

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
    this._renderTransitionMarkers();
    this._renderLabels();
    this._renderReturnAnnotation();
    this._renderCallout();
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
        // Supply: label at the upper (high-p) end, on the right side of the line.
        // Demand: label at the lower (high-q) end, on the right side of the line,
        // so it doesn't sit next to the y-axis and look like a price tick.
        let anchor;
        if (kind === 'demand') {
          anchor = ends[0].q > ends[1].q ? ends[0] : ends[1]; // rightmost (high q)
        } else {
          anchor = ends[0].p > ends[1].p ? ends[0] : ends[1]; // top (high p)
        }
        const txt = svgEl('text', {
          class: 'curve-label',
          x: this.xScale(anchor.q) + 8,
          y: this.yScale(anchor.p) + (kind === 'demand' ? -4 : 4),
          fill: variant === 'ghost' ? 'var(--ghost)' : (kind === 'demand' ? 'var(--demand)' : 'var(--supply)'),
        });
        txt.textContent = label;
        this.curvesG.appendChild(txt);
      }
    }
  }

  _renderHitAreas() {
    // Initialise persistent storage for hit-lines (keyed by curve kind)
    if (!this._hitElems) this._hitElems = {};

    // Hide the hover handle on every render unless a drag is actively
    // running. This prevents the handle being stranded when curves move
    // automatically (springs, event animations, etc.) and the cursor isn't
    // tracking them.
    const anyDragging = Object.values(this._hitElems).some(h => h.classList.contains('dragging'));
    if (!anyDragging && this.hoverHandle) {
      this.hoverHandle.setAttribute('class', 'hover-handle hidden');
    }

    // Determine which curves should have hit-lines this frame
    const activeKinds = new Set();
    for (const cfg of this.curves) {
      if (!cfg.draggable) continue;
      const ends = this._visibleEndpoints(cfg.curve);
      if (!ends) continue;
      activeKinds.add(cfg.kind);

      let hit = this._hitElems[cfg.kind];
      if (!hit) {
        // Create it once, attach listeners once
        hit = svgEl('line', {
          class: `curve-hit ${cfg.kind}-hit`,
          'data-kind': cfg.kind,
        });
        this.hitG.appendChild(hit);
        this._hitElems[cfg.kind] = hit;
        this._attachCurveDrag(hit, cfg);
      } else {
        // Update the config reference so the drag handlers see the latest
        // curve and onDrag callback each render
        hit.__cfg = cfg;
      }
      // Always update geometry
      hit.setAttribute('x1', this.xScale(ends[0].q));
      hit.setAttribute('y1', this.yScale(ends[0].p));
      hit.setAttribute('x2', this.xScale(ends[1].q));
      hit.setAttribute('y2', this.yScale(ends[1].p));
    }

    // Remove any hit-lines that no longer have a corresponding active curve
    for (const kind of Object.keys(this._hitElems)) {
      if (!activeKinds.has(kind)) {
        this._hitElems[kind].remove();
        delete this._hitElems[kind];
      }
    }
  }

  _attachCurveDrag(hitLine, cfg) {
    const self = this;
    // Store cfg on the element so handlers read the latest reference even
    // after _renderHitAreas is called again with a new config.
    hitLine.__cfg = cfg;
    const dragState = { dragging: false };

    const showHover = (ev) => {
      if (dragState.dragging) return;
      const pt = self._pointerData(ev);
      const c = hitLine.__cfg;
      if (!c) return;
      const pOnCurve = c.curve.priceAt(pt.q);
      self.hoverHandle.setAttribute('class', `hover-handle ${c.kind}`);
      self.hoverHandle.setAttribute('cx', self.xScale(pt.q));
      self.hoverHandle.setAttribute('cy', self.yScale(pOnCurve));
    };
    const hideHover = () => {
      if (dragState.dragging) return;
      const c = hitLine.__cfg;
      self.hoverHandle.setAttribute('class', `hover-handle ${c?.kind || ''} hidden`);
    };

    hitLine.addEventListener('pointerenter', showHover);
    hitLine.addEventListener('pointerleave', hideHover);

    hitLine.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      dragState.dragging = true;
      hitLine.classList.add('dragging');
      hitLine.setPointerCapture?.(ev.pointerId);
      const c = hitLine.__cfg;
      if (c?.onDragStart) c.onDragStart();
    });

    hitLine.addEventListener('pointermove', ev => {
      if (!dragState.dragging) {
        showHover(ev);
        return;
      }
      const c = hitLine.__cfg;
      if (!c) return;
      const pt = self._pointerData(ev);
      // Translate-only: shift the curve so it passes through the cursor
      const orig = c.curve;
      const slope = orig.slope;
      const a = orig.p1.p - slope * orig.p1.q;
      const shift = pt.q - (pt.p - a) / slope;
      const newCurve = linearCurve(
        { q: orig.p1.q + shift, p: orig.p1.p },
        { q: orig.p2.q + shift, p: orig.p2.p }
      );
      if (c.onDrag) c.onDrag(newCurve, shift);
      self.hoverHandle.setAttribute('cx', self.xScale(pt.q));
      self.hoverHandle.setAttribute('cy', self.yScale(newCurve.priceAt(pt.q)));
    });

    const endDrag = (ev) => {
      if (!dragState.dragging) return;
      dragState.dragging = false;
      hitLine.classList.remove('dragging');
      hitLine.releasePointerCapture?.(ev.pointerId);
      const c = hitLine.__cfg;
      if (c?.onDragEnd) c.onDragEnd();
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

      // Value label inside the polygon (at its centroid) when requested.
      if (r.label && visible) {
        let sx = 0, sy = 0;
        for (const [q, p] of r.points) {
          sx += this.xScale(q);
          sy += this.yScale(p);
        }
        const cx = sx / r.points.length;
        const cy = sy / r.points.length;
        const txt = svgEl('text', {
          class: 'region-value-label',
          x: cx, y: cy, 'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'data-region-label-for': r.id || '',
        });
        txt.textContent = r.label;
        this.regionsG.appendChild(txt);
      }
    }
  }

  _renderAnnotations() {
    this._clear(this.annotationsG);
    for (const a of this.annotations) {
      const extraClass = a.className ? ` ${a.className}` : '';
      const dashed = a.dashed ? ' dashed' : '';
      if (a.kind === 'dropLine') {
        const line = svgEl('line', {
          class: `annotation${dashed}${extraClass}`,
          x1: this.xScale(a.q), y1: this.yScale(a.pFrom),
          x2: this.xScale(a.q), y2: a.toAxis ? (this.margin.top + this.plotH) : this.yScale(a.pTo),
        });
        if (a.opacity != null) line.setAttribute('opacity', a.opacity);
        this.annotationsG.appendChild(line);
      } else if (a.kind === 'acrossLine') {
        const line = svgEl('line', {
          class: `annotation${dashed}${extraClass}`,
          x1: a.fromAxis ? this.margin.left : this.xScale(a.qFrom),
          y1: this.yScale(a.p),
          x2: this.xScale(a.qTo),
          y2: this.yScale(a.p),
        });
        if (a.opacity != null) line.setAttribute('opacity', a.opacity);
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
    const { atPrice, targetPrice, eqQ, magnitude, direction } = this.forceArrow;
    if (magnitude < 0.02) return;
    if (targetPrice == null || eqQ == null) return;

    // Place the arrow on the equilibrium's x-coordinate. It starts at the
    // forced-price line (with a small gap for the gap-bar) and points towards
    // the equilibrium-price line. We cap the visible length so big disequi‑
    // libria don't produce a huge swamping arrow; the reader infers the rest.
    const x = this.xScale(eqQ);
    const yFrom = this.yScale(atPrice);
    const yTo = this.yScale(targetPrice);
    const dy = yTo - yFrom;
    if (Math.abs(dy) < 8) return; // too short to be useful

    const sign = Math.sign(dy);
    const offset = 6;  // gap between price-line and arrow tail
    const fullLen = Math.abs(dy) - offset - 4;
    // Arrow shows a constant fraction of the full gap, capped. On a tiny
    // gap we might take the full length; on a huge gap we cap around 80px.
    const maxLen = 80;
    const minLen = 16;
    const visibleLen = Math.max(minLen, Math.min(maxLen, fullLen * 0.45 + 16));

    const y1 = yFrom + sign * offset;
    const y2 = y1 + sign * visibleLen;

    // Stroke width grows (modestly) with magnitude so big gaps feel stronger
    // without dominating. Range roughly 2 → 4.5 px.
    const stroke = 2 + Math.min(1, magnitude) * 2.5;

    const arrow = svgEl('line', {
      class: `force-arrow ${direction}`,
      x1: x, y1, x2: x, y2,
      'marker-end': 'url(#arrowhead-force)',
      'stroke-width': stroke,
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
    if (!this._offGraphG) {
      this._offGraphG = svgEl('g', { class: 'off-graph-layer' });
      this.plot.plotGroup.appendChild(this._offGraphG);
    }
    this._clear(this._offGraphG);
    if (!this.offGraphConfig || !this.offGraphConfig.enabled) return;
    const { direction, atPrice } = this.offGraphConfig;
    if (!direction || atPrice == null) return;

    const group = svgEl('g', { class: 'off-graph' });
    const yAt = this.yScale(atPrice);
    const x = this.margin.left + this.plotW + 14;

    if (direction === 'shortage') {
      // Buyers in the margin, banknotes raised — they'd pay more if allowed.
      const label = svgEl('text', {
        class: 'off-graph-label',
        x: x + 14, y: yAt - 16,
        'text-anchor': 'middle',
      });
      label.textContent = 'buyers bid up';
      group.appendChild(label);
      for (let i = 0; i < 3; i++) {
        drawBuyerFigure(group, x + 8, yAt + 10 + i * 22);
      }
    } else if (direction === 'surplus') {
      // Standard surplus (eg demand shock above eq): sellers discount to clear.
      const label = svgEl('text', {
        class: 'off-graph-label',
        x: x + 18, y: yAt + 68,
        'text-anchor': 'middle',
      });
      label.textContent = 'sellers cut prices';
      group.appendChild(label);
      for (let i = 0; i < 3; i++) {
        drawSellerFigure(group, x + 8, yAt + 24 + i * 18);
      }
    } else if (direction === 'floor-surplus') {
      // Price floor: sellers would love to discount but a government floor
      // blocks them. Stock piles up. A padlock tag on each seller.
      const label = svgEl('text', {
        class: 'off-graph-label',
        x: x + 18, y: yAt + 68,
        'text-anchor': 'middle',
      });
      label.textContent = 'price floor: stock piles up';
      group.appendChild(label);
      for (let i = 0; i < 3; i++) {
        drawFloorSellerFigure(group, x + 8, yAt + 24 + i * 18);
      }
    }

    this._offGraphG.appendChild(group);
  }

  /**
   * Render transition dynamics markers: a filled circle at the current
   * transacted (Q2, P2) on the demand curve, and a faded open circle at
   * the old equilibrium (Q1, P1). The circle at (Q2, P2) makes "where
   * the market is right now" concrete — during Phase A (shifting) it sits
   * above Q1 on the shifted demand curve; during Phase B (settling) it
   * slides down along demand toward the new equilibrium.
   */
  _renderTransitionMarkers() {
    this._clear(this.transitionG);
    if (!this.transitionCircle) return;
    const { oldQ, oldP, curQ, curP, fadeAlpha, showCurrent } = this.transitionCircle;

    // Old-equilibrium dotted ring at (Q1, P1) — dashed circle to distinguish
    // from the live equilibrium marker (solid-edged). Faded during 'fading'.
    if (oldQ != null && oldP != null) {
      const oldRing = svgEl('circle', {
        class: 'transition-old-marker',
        cx: this.xScale(oldQ), cy: this.yScale(oldP),
        r: 6,
      });
      if (fadeAlpha != null) oldRing.setAttribute('opacity', fadeAlpha);
      this.transitionG.appendChild(oldRing);
    }

    // Current "you are here" filled dot at (Q2, P2) — only shown while
    // shifting or settling (not during fade).
    if (showCurrent && curQ != null && curP != null) {
      const dot = svgEl('circle', {
        class: 'transition-current-marker',
        cx: this.xScale(curQ), cy: this.yScale(curP),
        r: 5,
      });
      this.transitionG.appendChild(dot);
    }
  }

  /**
   * Render a text callout inside the plot area. Used by the shock machinery
   * to surface narration inside the graph itself so the reader doesn't have
   * to flick between the banner above the graph and the action on it.
   *
   * Config: { text, position, variant }
   *   text     : string to display (can include line breaks via \n)
   *   position : 'top-right' (default) | 'top-left' | 'bottom-right' | 'bottom-left'
   *   variant  : optional, 'shock' for the coral left-border treatment
   */
  _renderCallout() {
    this._clear(this.calloutG);
    if (!this.callout || !this.callout.text) return;
    const text = this.callout.text;
    const position = this.callout.position || 'top-right';
    const variant = this.callout.variant || '';

    // Wrap to lines: split on \n, further break long lines by word wrap.
    const maxCharsPerLine = 36;
    const explicitLines = text.split('\n');
    const lines = [];
    for (const line of explicitLines) {
      if (line.length <= maxCharsPerLine) { lines.push(line); continue; }
      // Greedy word wrap
      const words = line.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
          lines.push(cur);
          cur = w;
        } else {
          cur = (cur + ' ' + w).trim();
        }
      }
      if (cur) lines.push(cur);
    }

    const padding = 10;
    const lineHeight = 17;
    const fontSize = 12.5;
    const maxTextWidth = 260; // px
    const boxHeight = lines.length * lineHeight + padding * 2;
    const boxWidth = maxTextWidth + padding * 2;

    // Position within the plot area with a small inset
    const inset = 12;
    let bx, by;
    switch (position) {
      case 'top-left':
        bx = this.margin.left + inset;
        by = this.margin.top + inset;
        break;
      case 'bottom-right':
        bx = this.margin.left + this.plotW - boxWidth - inset;
        by = this.margin.top + this.plotH - boxHeight - inset;
        break;
      case 'bottom-left':
        bx = this.margin.left + inset;
        by = this.margin.top + this.plotH - boxHeight - inset;
        break;
      case 'top-right':
      default:
        bx = this.margin.left + this.plotW - boxWidth - inset;
        by = this.margin.top + inset;
    }

    const box = svgEl('rect', {
      class: `callout-box ${variant}`,
      x: bx, y: by, width: boxWidth, height: boxHeight,
      rx: 8, ry: 8,
    });
    this.calloutG.appendChild(box);

    // Variant 'shock' gets a left border strip in coral
    if (variant === 'shock') {
      const border = svgEl('rect', {
        class: 'callout-border',
        x: bx, y: by, width: 3, height: boxHeight,
        rx: 1.5, ry: 1.5,
      });
      this.calloutG.appendChild(border);
    }

    const textEl = svgEl('text', {
      class: `callout-text ${variant}`,
      x: bx + padding + (variant === 'shock' ? 4 : 0),
      y: by + padding + fontSize,
      'font-size': fontSize,
    });
    lines.forEach((line, i) => {
      const tspan = svgEl('tspan', {
        x: bx + padding + (variant === 'shock' ? 4 : 0),
        dy: i === 0 ? 0 : lineHeight,
      });
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
    this.calloutG.appendChild(textEl);
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
      if (l.opacity != null) t.setAttribute('opacity', l.opacity);
      t.textContent = l.text;
      this.labelsG.appendChild(t);
    }
  }
}

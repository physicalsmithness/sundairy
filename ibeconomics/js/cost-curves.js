/* =========================================================================
   cost-curves.js — shared cost-curve primitives for HL firm diagrams
   -------------------------------------------------------------------------
   Standard textbook U-shaped AVC, MC, and ATC curves parameterised so the
   classic properties hold:
     - MC crosses AVC at AVC's minimum
     - MC crosses ATC at ATC's minimum
     - ATC lies above AVC, gap = AFC = FC/q (declining)

   We use: VC(q) = a·q - b·q² + c·q³  (cubic with positive a, b, c)
           → AVC(q) = a - b·q + c·q²        (parabola, min at q = b/2c)
           → MC(q)  = a - 2b·q + 3c·q²      (parabola, min at q = b/3c)
           ATC(q)   = AVC(q) + FC/q
           TC(q)    = FC + VC(q)

   Reasonable defaults produce curves that sit sensibly on a 0–250 q-axis
   with a 0–£2 y-axis for the apple-market scenario.
   ========================================================================= */

export function makeCostCurveSet({
  a = 1.0,
  b = 0.01,
  c = 0.00005,
  FC = 11.25,
} = {}) {
  const avc = q => a - b * q + c * q * q;
  const mc  = q => a - 2 * b * q + 3 * c * q * q;
  const atc = q => q <= 0 ? Infinity : avc(q) + FC / q;
  const tc  = q => FC + a * q - b * q * q + c * q * q * q;

  // Useful reference points
  const avcMinQ = b / (2 * c);
  const avcMin  = avc(avcMinQ);
  const mcMinQ  = b / (3 * c);

  // ATC's minimum — analytically: dATC/dq = -b + 2c·q - FC/q² = 0
  // Solve numerically by Newton (or simple grid search).
  let atcMinQ = avcMinQ * 1.3;  // initial guess past AVC minimum
  for (let i = 0; i < 40; i++) {
    const eps = 0.01;
    const d1 = (atc(atcMinQ + eps) - atc(atcMinQ - eps)) / (2 * eps);
    const d2 = (atc(atcMinQ + eps) - 2 * atc(atcMinQ) + atc(atcMinQ - eps)) / (eps * eps);
    if (Math.abs(d2) < 1e-8) break;
    atcMinQ -= d1 / d2;
    if (atcMinQ <= 0) atcMinQ = 1;
  }
  const atcMin = atc(atcMinQ);

  return {
    avc, mc, atc, tc,
    avcMinQ, avcMin, mcMinQ, atcMinQ, atcMin,
    FC,
    // Find q where MC(q) = targetPrice (take the upward-sloping root, the
    // supply-curve-relevant one). Uses quadratic formula on the MC equation.
    qAtMC(price) {
      // 3c·q² - 2b·q + (a - price) = 0
      const A = 3 * c;
      const B = -2 * b;
      const C = a - price;
      const disc = B * B - 4 * A * C;
      if (disc < 0) return null;
      const sq = Math.sqrt(disc);
      const q1 = (-B - sq) / (2 * A);
      const q2 = (-B + sq) / (2 * A);
      // Return the larger root (upward-sloping MC)
      return Math.max(q1, q2);
    },
    // Find q where ATC(q) = targetPrice (right-hand root, past the minimum)
    qAtATC(price) {
      if (price < atcMin) return null;
      // Bisect between atcMinQ and some upper bound
      let lo = atcMinQ, hi = atcMinQ * 4;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (atc(mid) > price) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    },
    // Reverse: q where ATC = price on the left-hand root (below minimum)
    qAtATCLeft(price) {
      if (price < atcMin) return null;
      let lo = 1, hi = atcMinQ;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (atc(mid) < price) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    },
  };
}

/* A cleaner version of createAxes for cost-curve diagrams.
   Draws axes, grid, labels, and returns the SVG plumbing. */

export function createCostAxes({
  container,
  width = 520,
  height = 420,
  margin = { top: 30, right: 40, bottom: 56, left: 70 },
  xLabel = 'Quantity',
  yLabel = 'Cost / Price (£)',
  xMax = 250,
  yMax = 2.0,
  nxTicks = 10,
  nyTicks = 10,
  tickEvery = 2,
  xFormat = null,
  yFormat = null,
  title = null,
} = {}) {
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.innerHTML = '';
  container.appendChild(svg);

  const xScale = x => margin.left + (x / xMax) * plotW;
  const yScale = y => margin.top + plotH - (y / yMax) * plotH;
  const xInv   = px => ((px - margin.left) / plotW) * xMax;
  const yInv   = py => ((margin.top + plotH - py) / plotH) * yMax;

  const fmtX = xFormat || (v => Math.round(v));
  const fmtY = yFormat || (v => v.toFixed(2));

  // Grid
  for (let i = 0; i <= nxTicks; i++) {
    const x = margin.left + (i / nxTicks) * plotW;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('class', 'grid');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', margin.top); line.setAttribute('y2', margin.top + plotH);
    svg.appendChild(line);
  }
  for (let i = 0; i <= nyTicks; i++) {
    const y = margin.top + plotH - (i / nyTicks) * plotH;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('class', 'grid');
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('x1', margin.left); line.setAttribute('x2', margin.left + plotW);
    svg.appendChild(line);
  }

  // Axes
  const axisX = document.createElementNS(svgNS, 'line');
  axisX.setAttribute('class', 'axis');
  axisX.setAttribute('x1', margin.left);
  axisX.setAttribute('y1', margin.top + plotH);
  axisX.setAttribute('x2', margin.left + plotW);
  axisX.setAttribute('y2', margin.top + plotH);
  svg.appendChild(axisX);

  const axisY = document.createElementNS(svgNS, 'line');
  axisY.setAttribute('class', 'axis');
  axisY.setAttribute('x1', margin.left);
  axisY.setAttribute('y1', margin.top);
  axisY.setAttribute('x2', margin.left);
  axisY.setAttribute('y2', margin.top + plotH);
  svg.appendChild(axisY);

  // Labels
  const xLab = document.createElementNS(svgNS, 'text');
  xLab.setAttribute('class', 'axis-label');
  xLab.setAttribute('x', margin.left + plotW / 2);
  xLab.setAttribute('y', height - 14);
  xLab.setAttribute('text-anchor', 'middle');
  xLab.textContent = xLabel;
  svg.appendChild(xLab);

  const yLab = document.createElementNS(svgNS, 'text');
  yLab.setAttribute('class', 'axis-label');
  yLab.setAttribute('x', 16);
  yLab.setAttribute('y', margin.top + plotH / 2);
  yLab.setAttribute('text-anchor', 'middle');
  yLab.setAttribute('transform', `rotate(-90 16 ${margin.top + plotH / 2})`);
  yLab.textContent = yLabel;
  svg.appendChild(yLab);

  // Title
  if (title) {
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', margin.left + plotW / 2);
    t.setAttribute('y', 16);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('style', "font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; fill: var(--ink);");
    t.textContent = title;
    svg.appendChild(t);
  }

  // Tick labels
  for (let i = 0; i <= nxTicks; i += tickEvery) {
    const v = (i / nxTicks) * xMax;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'axis-tick');
    t.setAttribute('x', xScale(v));
    t.setAttribute('y', margin.top + plotH + 14);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = fmtX(v);
    svg.appendChild(t);
  }
  for (let i = 0; i <= nyTicks; i += tickEvery) {
    const v = (i / nyTicks) * yMax;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'axis-tick');
    t.setAttribute('x', margin.left - 6);
    t.setAttribute('y', yScale(v) + 3);
    t.setAttribute('text-anchor', 'end');
    t.textContent = fmtY(v);
    svg.appendChild(t);
  }

  const plotGroup = document.createElementNS(svgNS, 'g');
  plotGroup.setAttribute('class', 'plot-group');
  svg.appendChild(plotGroup);

  return { svg, plotGroup, xScale, yScale, xInv, yInv, plotW, plotH, margin, width, height };
}

/* Utility: draw a curve from a y=f(x) function as an SVG path in a plot group. */
export function drawCurveFn(plotGroup, fn, {
  xStart = 0.1,
  xEnd = 100,
  xScale, yScale,
  xMax = 250,
  yMax = 2.0,
  samples = 120,
  className = 'curve',
  label = null,
  labelColor = null,
  strokeColor = null,
} = {}) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const q = xStart + (i / samples) * (xEnd - xStart);
    const y = fn(q);
    if (!isFinite(y) || y < 0 || y > yMax * 1.1) continue;
    pts.push([q, y]);
  }
  if (pts.length < 2) return null;
  const d = pts.map(([q, y], i) => `${i === 0 ? 'M' : 'L'} ${xScale(q)} ${yScale(y)}`).join(' ');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('class', className);
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  if (strokeColor) path.setAttribute('stroke', strokeColor);
  path.setAttribute('stroke-width', '2');
  plotGroup.appendChild(path);

  if (label) {
    const [lastQ, lastY] = pts[pts.length - 1];
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', xScale(lastQ) + 4);
    t.setAttribute('y', yScale(lastY) + 3);
    t.setAttribute('text-anchor', 'start');
    t.setAttribute('style', `font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; fill: ${labelColor || strokeColor || 'var(--ink)'};`);
    t.textContent = label;
    plotGroup.appendChild(t);
  }
  return path;
}

/* Draw a filled rectangle region in data coordinates */
export function drawRect(plotGroup, x1, y1, x2, y2, { xScale, yScale, className = 'region', fill = null, stroke = null, opacity = null, label = null, labelColor = null } = {}) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const rect = document.createElementNS(svgNS, 'rect');
  const px1 = xScale(Math.min(x1, x2));
  const px2 = xScale(Math.max(x1, x2));
  const py1 = yScale(Math.max(y1, y2));
  const py2 = yScale(Math.min(y1, y2));
  rect.setAttribute('x', px1);
  rect.setAttribute('y', py1);
  rect.setAttribute('width', px2 - px1);
  rect.setAttribute('height', py2 - py1);
  rect.setAttribute('class', className);
  if (fill) rect.setAttribute('fill', fill);
  if (stroke) rect.setAttribute('stroke', stroke);
  if (opacity != null) rect.setAttribute('opacity', opacity);
  plotGroup.appendChild(rect);
  if (label) {
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', (px1 + px2) / 2);
    t.setAttribute('y', (py1 + py2) / 2 + 4);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('style', `font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; fill: ${labelColor || 'var(--ink)'}; paint-order: stroke; stroke: #fff; stroke-width: 3;`);
    t.textContent = label;
    plotGroup.appendChild(t);
  }
  return rect;
}

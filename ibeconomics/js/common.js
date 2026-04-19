/* =========================================================================
   IB Economics Interactive Diagrams — shared JS utilities
   -------------------------------------------------------------------------
   All shared behaviour lives here. Each individual diagram imports this
   module and uses its helpers to build its own specific logic, keeping
   every diagram consistent in feel.

   Exports:
     createPlot           - sets up a standard P/Q SVG plot with axes, grid
     makeDraggable        - makes an SVG element draggable with bounds
     spring               - simple damped-spring simulator (for "springy eq")
     scenarios            - a registry of real-world settings (greengrocer...)
     formatCurrency       - scenario-aware number formatting
     logEvent             - stub for future analytics pipeline
   ========================================================================= */

// ---- Scenario registry ---------------------------------------------------
//
// Each scenario provides labels, units, a natural scale, and flavour text.
// The UNDERLYING maths of each diagram does not change when scenario
// changes; only the labels and numbers.

export const scenarios = {
  generic: {
    label: 'Generic (P, Q)',
    goodName: 'the good',
    goodNamePlural: 'units',
    priceLabel: 'Price',
    quantityLabel: 'Quantity',
    priceUnit: '$',
    quantityUnit: 'units',
    priceMax: 10,              // top of visible price axis
    quantityMax: 100,          // right edge of visible quantity axis
    defaultPrice: 5,
    defaultQuantity: 50,
    narrationSeller: 'the firm',
    narrationBuyer: 'consumers',
    sellerIsPlural: false,
    buyerIsPlural: true,
    flavour: {
      priceUp:   'Price rises and consumers buy less.',
      priceDown: 'Price falls and consumers buy more.',
      shortage:  'There are not enough units to go around at this price.',
      surplus:   'Unsold stock is piling up on the shelves.',
    },
    events: [
      {
        id: 'pos_demand',
        name: 'Positive demand shock',
        textbookTerm: 'demand shift right',
        description: 'Consumer incomes rise, tastes shift, or the number of buyers increases.',
        demandShift: 25, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Demand has shifted right. Equilibrium price and quantity both rise.',
      },
      {
        id: 'neg_demand',
        name: 'Negative demand shock',
        textbookTerm: 'demand shift left',
        description: 'Incomes fall, tastes shift away, or the number of buyers decreases.',
        demandShift: -25, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Demand has shifted left. Equilibrium price and quantity both fall.',
      },
      {
        id: 'pos_supply',
        name: 'Positive supply shock',
        textbookTerm: 'supply shift right',
        description: 'Technology improves, input costs fall, or new firms enter the market.',
        demandShift: 0, supplyShift: 25, demandPivot: 0, supplyPivot: 0,
        narration: 'Supply has shifted right. Prices fall; equilibrium quantity rises.',
      },
      {
        id: 'neg_supply',
        name: 'Negative supply shock',
        textbookTerm: 'supply shift left',
        description: 'Input costs rise, indirect taxes are imposed, or firms exit.',
        demandShift: 0, supplyShift: -25, demandPivot: 0, supplyPivot: 0,
        narration: 'Supply has shifted left. Prices rise; equilibrium quantity falls.',
      },
    ],
  },

  greengrocer: {
    label: 'St Andrews greengrocer',
    goodName: 'apples',
    goodNamePlural: 'apples',
    priceLabel: 'Price per apple',
    quantityLabel: 'Apples per day',
    priceUnit: '£',
    quantityUnit: 'apples',
    priceMax: 2.00,
    quantityMax: 300,
    defaultPrice: 0.80,
    defaultQuantity: 150,
    narrationSeller: 'the greengrocer',
    narrationBuyer: 'townsfolk',
    sellerIsPlural: false,
    buyerIsPlural: true,
    flavour: {
      priceUp:   'The greengrocer raises the price, and fewer townsfolk bother buying apples.',
      priceDown: 'Apples are cheap today, and customers are filling their baskets.',
      shortage:  'The greengrocer has run out of apples by lunchtime.',
      surplus:   'There are crates of apples going bad at the back of the shop.',
    },
    events: [
      {
        id: 'harvest_glut',
        name: 'Bumper harvest',
        textbookTerm: 'positive supply shock',
        description: 'A mild summer and wet spring have produced a huge apple crop.',
        demandShift: 0, supplyShift: 25, demandPivot: 0, supplyPivot: 0,
        narration: 'Supply has jumped. Prices fall and townsfolk buy more apples than usual.',
      },
      {
        id: 'orchard_disease',
        name: 'Orchard blight',
        textbookTerm: 'negative supply shock',
        description: 'Fire blight has wiped out a third of the local apple trees.',
        demandShift: 0, supplyShift: -25, demandPivot: 0, supplyPivot: 0,
        narration: 'Fewer apples reach the shop; the greengrocer marks them up.',
      },
      {
        id: 'doctor_campaign',
        name: 'An apple a day',
        textbookTerm: 'positive demand shock (tastes)',
        description: 'A local health campaign has people reaching for fruit.',
        demandShift: 20, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Demand has shifted right. Prices rise and the greengrocer orders in more stock.',
      },
      {
        id: 'school_closes',
        name: 'School summer holiday',
        textbookTerm: 'negative demand shock (fewer consumers)',
        description: 'Half the town\u2019s children have left for the coast with their parents.',
        demandShift: -15, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Fewer buyers in town. Demand drops and prices soften.',
      },
      {
        id: 'necessity_shift',
        name: 'Nothing else in stock',
        textbookTerm: 'demand becomes more inelastic',
        description: 'The nearby supermarket closed and apples are the only fruit for miles.',
        demandShift: 0, supplyShift: 0, demandPivot: 40, supplyPivot: 0,
        narration: 'With no substitutes, buyers keep buying apples even at higher prices.',
      },
    ],
  },

  smartphones: {
    label: 'Global smartphone market',
    goodName: 'smartphones',
    goodNamePlural: 'smartphones',
    priceLabel: 'Price per phone',
    quantityLabel: 'Phones sold per month (millions)',
    priceUnit: '$',
    quantityUnit: 'm phones',
    priceMax: 1200,
    quantityMax: 160,
    defaultPrice: 600,
    defaultQuantity: 90,
    narrationSeller: 'phone manufacturers',
    narrationBuyer: 'global consumers',
    sellerIsPlural: true,
    buyerIsPlural: true,
    flavour: {
      priceUp:   'Handsets get pricier and consumers delay their upgrade.',
      priceDown: 'Cheaper phones tempt buyers to upgrade sooner.',
      shortage:  'Stores are taking pre-orders; handsets are out of stock.',
      surplus:   'Unsold inventory is piling up in warehouses.',
    },
    events: [
      {
        id: 'chip_shortage',
        name: 'Semiconductor shortage',
        textbookTerm: 'negative supply shock',
        description: 'A global chip-manufacturing crunch has throttled smartphone output.',
        demandShift: 0, supplyShift: -25, demandPivot: 0, supplyPivot: 0,
        narration: 'Factories can\u2019t get the chips they need. Supply contracts sharply; prices spike.',
      },
      {
        id: 'new_tech',
        name: 'Cheaper assembly robotics',
        textbookTerm: 'positive supply shock (technology)',
        description: 'A new generation of assembly robots has halved labour costs.',
        demandShift: 0, supplyShift: 25, demandPivot: 0, supplyPivot: 0,
        narration: 'Production costs fall and manufacturers can offer phones at lower prices.',
      },
      {
        id: 'recession',
        name: 'Global recession',
        textbookTerm: 'negative demand shock (lower income)',
        description: 'Consumer spending power has dropped across major markets.',
        demandShift: -20, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Consumers delay upgrading; demand falls and prices ease.',
      },
      {
        id: 'killer_app',
        name: 'Must-have new app',
        textbookTerm: 'positive demand shock (tastes)',
        description: 'A viral new AI assistant only works on recent hardware.',
        demandShift: 25, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Everyone wants to upgrade. Demand surges and manufacturers struggle to keep up.',
      },
      {
        id: 'tariffs_imposed',
        name: 'Import tariffs',
        textbookTerm: 'negative supply shock (taxes on producers)',
        description: 'Major importing countries have slapped 15% tariffs on handsets.',
        demandShift: 0, supplyShift: -12, demandPivot: 0, supplyPivot: 0,
        narration: 'Effective costs rise for manufacturers exporting to these markets; supply contracts.',
      },
    ],
  },

  albania_wheat: {
    label: 'Albanian wheat market',
    goodName: 'wheat',
    goodNamePlural: 'tonnes of wheat',
    priceLabel: 'Price per tonne',
    quantityLabel: 'Tonnes of wheat per year (thousands)',
    priceUnit: 'L',              // Albanian lek symbol shorthand
    quantityUnit: 'k tonnes',
    priceMax: 60000,
    quantityMax: 500,
    defaultPrice: 32000,
    defaultQuantity: 280,
    narrationSeller: 'Albanian wheat farmers',
    narrationBuyer: 'millers and bakers',
    sellerIsPlural: true,
    buyerIsPlural: true,
    flavour: {
      priceUp:   'Millers hold off buying as wheat becomes dearer.',
      priceDown: 'Bakers stock up while prices are low.',
      shortage:  'Bread bakers cannot source enough grain.',
      surplus:   'Farmers struggle to sell their harvest.',
    },
    events: [
      {
        id: 'drought',
        name: 'Summer drought',
        textbookTerm: 'negative supply shock',
        description: 'A prolonged drought has shrivelled this year\u2019s wheat crop.',
        demandShift: 0, supplyShift: -30, demandPivot: 0, supplyPivot: 0,
        narration: 'Farmers have far less wheat to sell; prices jump and millers compete for stock.',
      },
      {
        id: 'bumper_crop',
        name: 'Bumper harvest',
        textbookTerm: 'positive supply shock',
        description: 'Ideal weather and a new high-yield variety have produced a record crop.',
        demandShift: 0, supplyShift: 30, demandPivot: 0, supplyPivot: 0,
        narration: 'Supply has flooded the market. Prices fall and farmers struggle to find buyers.',
      },
      {
        id: 'export_ban',
        name: 'Russian export ban',
        textbookTerm: 'positive demand shock (substitute supply falls)',
        description: 'A major wheat exporter has banned exports, pushing world buyers to other markets.',
        demandShift: 20, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Foreign bakers are turning to Albanian wheat; demand rises sharply.',
      },
      {
        id: 'cheap_substitute',
        name: 'Cheap imported rice',
        textbookTerm: 'negative demand shock (substitute)',
        description: 'A bulk shipment of cheap rice has entered the market.',
        demandShift: -15, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Bakers switch to cheaper alternatives; wheat demand softens.',
      },
      {
        id: 'inelastic_supply',
        name: 'Locked-in harvest',
        textbookTerm: 'supply becomes highly inelastic (short-run)',
        description: 'Once the wheat is planted, farmers can\u2019t change output until next year.',
        demandShift: 0, supplyShift: 0, demandPivot: 0, supplyPivot: 50,
        narration: 'Whatever happens to price, this year\u2019s supply is fixed. Try dragging the price line now.',
      },
    ],
  },

  danny: {
    label: "Your mate Danny's lemonade stand",
    goodName: 'cups of lemonade',
    goodNamePlural: 'cups',
    priceLabel: 'Price per cup',
    quantityLabel: 'Cups sold on a Saturday',
    priceUnit: '£',
    quantityUnit: 'cups',
    priceMax: 4.00,
    quantityMax: 80,
    defaultPrice: 1.50,
    defaultQuantity: 40,
    narrationSeller: 'Danny',
    narrationBuyer: 'passers-by',
    sellerIsPlural: false,
    buyerIsPlural: true,
    flavour: {
      priceUp:   'Danny pushes the price up and passers-by walk on by.',
      priceDown: 'At 50p a cup, Danny has a queue down the street.',
      shortage:  'Danny is mixing lemonade as fast as he can and still running out.',
      surplus:   'Danny will be drinking warm lemonade all week.',
    },
    events: [
      {
        id: 'heatwave',
        name: 'Heatwave',
        textbookTerm: 'positive demand shock',
        description: 'It\u2019s the hottest Saturday all year and passers-by are gasping for a cold drink.',
        demandShift: 30, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Passers-by are desperate for a cold drink. Danny could be raising his prices and still selling out.',
      },
      {
        id: 'rain',
        name: 'Rainy day',
        textbookTerm: 'negative demand shock',
        description: 'It\u2019s drizzling and everyone\u2019s hurrying home.',
        demandShift: -30, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'Nobody wants cold lemonade in the rain. Demand has collapsed.',
      },
      {
        id: 'sugar_spike',
        name: 'Sugar price doubles',
        textbookTerm: 'negative supply shock (input costs)',
        description: 'Wholesale sugar prices have spiked after a poor cane harvest.',
        demandShift: 0, supplyShift: -20, demandPivot: 0, supplyPivot: 0,
        narration: 'Danny\u2019s main ingredient has doubled in cost. He must charge more or sell less.',
      },
      {
        id: 'rival_stand',
        name: 'Rival across the street',
        textbookTerm: 'positive supply shock (more firms)',
        description: 'Another kid has opened a lemonade stand on the opposite pavement.',
        demandShift: 0, supplyShift: 25, demandPivot: 0, supplyPivot: 0,
        narration: 'There are now two stands competing. Market supply is up and prices must come down.',
      },
      {
        id: 'mums_friends_away',
        name: 'Mum\u2019s mates on holiday',
        textbookTerm: 'negative demand shock (fewer buyers)',
        description: 'Half of Danny\u2019s customer base is his mum\u2019s friends, and they\u2019re all on holiday.',
        demandShift: -25, supplyShift: 0, demandPivot: 0, supplyPivot: 0,
        narration: 'The regulars are gone. Demand is down and Danny might have to slash prices.',
      },
    ],
  },
};

// ---- Number formatting ---------------------------------------------------

export function formatPrice(scenario, value) {
  const s = scenarios[scenario] || scenarios.generic;
  // choose decimal places based on magnitude
  if (s.priceMax >= 1000) return `${s.priceUnit}${Math.round(value).toLocaleString()}`;
  if (s.priceMax >= 50)   return `${s.priceUnit}${Math.round(value)}`;
  if (s.priceMax >= 5)    return `${s.priceUnit}${value.toFixed(2)}`;
  return `${s.priceUnit}${value.toFixed(2)}`;
}

export function formatQuantity(scenario, value) {
  const s = scenarios[scenario] || scenarios.generic;
  if (s.quantityMax >= 1000) return `${Math.round(value).toLocaleString()} ${s.quantityUnit}`;
  if (s.quantityMax >= 100)  return `${Math.round(value)} ${s.quantityUnit}`;
  return `${Math.round(value)} ${s.quantityUnit}`;
}

export function formatMoney(scenario, value) {
  // for total revenue, tax revenue etc — always a currency figure
  const s = scenarios[scenario] || scenarios.generic;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${s.priceUnit}${(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 1000)      return `${s.priceUnit}${Math.round(value).toLocaleString()}`;
  if (abs >= 10)        return `${s.priceUnit}${Math.round(value)}`;
  return `${s.priceUnit}${value.toFixed(2)}`;
}

// ---- Plot scaffolding ----------------------------------------------------
//
// Creates the SVG structure every P/Q diagram needs: axes, axis labels,
// grid lines, and a group inside which curves can be drawn in DATA space.
// Returns an object with:
//   svg        : the <svg> element
//   plotGroup  : the <g> inside which curves live, translated to the
//                plot origin
//   xScale(q)  : converts data quantity to SVG x pixels
//   yScale(p)  : converts data price to SVG y pixels
//   xInv(px)   : inverse — SVG x back to quantity
//   yInv(py)   : inverse — SVG y back to price
//   width, height, margin

export function createPlot({
  container,
  scenario = 'generic',
  width = 640,
  height = 460,
  margin = { top: 30, right: 30, bottom: 56, left: 64 },
} = {}) {
  const s = scenarios[scenario] || scenarios.generic;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.innerHTML = '';
  container.appendChild(svg);

  // Scales: price on y (origin at bottom-left, price increases upward)
  const xScale = q => margin.left + (q / s.quantityMax) * plotW;
  const yScale = p => margin.top + plotH - (p / s.priceMax) * plotH;
  const xInv   = px => ((px - margin.left) / plotW) * s.quantityMax;
  const yInv   = py => ((margin.top + plotH - py) / plotH) * s.priceMax;

  // Grid
  const gridG = document.createElementNS(svgNS, 'g');
  gridG.setAttribute('class', 'grid-group');
  svg.appendChild(gridG);

  const nxTicks = 10, nyTicks = 10;
  for (let i = 0; i <= nxTicks; i++) {
    const x = margin.left + (i / nxTicks) * plotW;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('class', 'grid');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', margin.top); line.setAttribute('y2', margin.top + plotH);
    gridG.appendChild(line);
  }
  for (let i = 0; i <= nyTicks; i++) {
    const y = margin.top + plotH - (i / nyTicks) * plotH;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('class', 'grid');
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('x1', margin.left); line.setAttribute('x2', margin.left + plotW);
    gridG.appendChild(line);
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

  // Axis labels
  const xLab = document.createElementNS(svgNS, 'text');
  xLab.setAttribute('class', 'axis-label');
  xLab.setAttribute('x', margin.left + plotW / 2);
  xLab.setAttribute('y', height - 18);
  xLab.setAttribute('text-anchor', 'middle');
  xLab.textContent = s.quantityLabel + ' (Q)';
  svg.appendChild(xLab);

  const yLab = document.createElementNS(svgNS, 'text');
  yLab.setAttribute('class', 'axis-label');
  yLab.setAttribute('x', 18);
  yLab.setAttribute('y', margin.top + plotH / 2);
  yLab.setAttribute('text-anchor', 'middle');
  yLab.setAttribute('transform', `rotate(-90 18 ${margin.top + plotH / 2})`);
  yLab.textContent = s.priceLabel + ' (P)';
  svg.appendChild(yLab);

  // Axis tick labels — a few reference values
  for (let i = 0; i <= nxTicks; i += 2) {
    const q = (i / nxTicks) * s.quantityMax;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'axis-tick');
    t.setAttribute('x', xScale(q));
    t.setAttribute('y', margin.top + plotH + 16);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = formatTickQ(q, s);
    svg.appendChild(t);
  }
  for (let i = 0; i <= nyTicks; i += 2) {
    const p = (i / nyTicks) * s.priceMax;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'axis-tick');
    t.setAttribute('x', margin.left - 8);
    t.setAttribute('y', yScale(p) + 3);
    t.setAttribute('text-anchor', 'end');
    t.textContent = formatTickP(p, s);
    svg.appendChild(t);
  }

  // The group where all dynamic content is drawn
  const plotGroup = document.createElementNS(svgNS, 'g');
  plotGroup.setAttribute('class', 'plot-group');
  svg.appendChild(plotGroup);

  return { svg, plotGroup, xScale, yScale, xInv, yInv, width, height, margin, plotW, plotH, scenario: s };
}

function formatTickP(value, s) {
  if (s.priceMax >= 10000) return (value / 1000).toFixed(0) + 'k';
  if (s.priceMax >= 100)   return Math.round(value);
  if (s.priceMax >= 5)     return value.toFixed(1);
  return value.toFixed(2);
}
function formatTickQ(value, s) {
  if (s.quantityMax >= 1000) return (value / 1000).toFixed(0) + 'k';
  return Math.round(value);
}

// ---- Draggable helper ----------------------------------------------------
//
// Makes an SVG element draggable. Clamps movement to supplied bounds (in
// SVG pixel space). Calls onMove(svgX, svgY) on every pointer move, and
// onEnd(svgX, svgY) on release. Applies a "dragging" class for CSS hooks.

export function makeDraggable(element, {
  svg,                    // the root <svg> for coordinate conversion
  bounds = null,          // { minX, maxX, minY, maxY } in SVG pixels
  onMove = () => {},
  onEnd = () => {},
  axis = null,            // 'x', 'y', or null (both)
} = {}) {
  let dragging = false;

  function svgCoords(ev) {
    // Use getBoundingClientRect to convert client coords to SVG viewBox coords
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = ((ev.clientX - rect.left) / rect.width) * vb.width;
    const y = ((ev.clientY - rect.top) / rect.height) * vb.height;
    return { x, y };
  }

  function clamp(x, y) {
    if (!bounds) return { x, y };
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
    };
  }

  function onPointerDown(ev) {
    ev.preventDefault();
    dragging = true;
    element.classList.add('dragging');
    element.setPointerCapture?.(ev.pointerId);
  }
  function onPointerMove(ev) {
    if (!dragging) return;
    const raw = svgCoords(ev);
    const c = clamp(raw.x, raw.y);
    const fx = axis === 'y' ? null : c.x;
    const fy = axis === 'x' ? null : c.y;
    onMove(fx, fy, ev);
  }
  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    element.classList.remove('dragging');
    const raw = svgCoords(ev);
    const c = clamp(raw.x, raw.y);
    onEnd(axis === 'y' ? null : c.x, axis === 'x' ? null : c.y, ev);
  }

  element.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }
  };
}

// ---- Damped spring simulator --------------------------------------------
//
// Animates a numeric value from its current position toward a target,
// with configurable stiffness and damping. The effect: release a
// disequilibrium price and the market "springs back" to equilibrium
// with a small overshoot. Used by the market-equilibrium diagram.

export function spring({
  from,
  to,
  stiffness = 180,     // higher = stronger pull
  damping = 14,        // higher = less overshoot
  mass = 1,
  precision = 0.01,
  onUpdate,
  onComplete = () => {},
}) {
  let pos = from, vel = 0;
  let lastT = performance.now();
  let rafId;
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 1 / 30);
    lastT = now;
    const force = -stiffness * (pos - to);
    const dampForce = -damping * vel;
    const accel = (force + dampForce) / mass;
    vel += accel * dt;
    pos += vel * dt;
    onUpdate(pos);
    if (Math.abs(pos - to) < precision && Math.abs(vel) < precision) {
      pos = to;
      onUpdate(pos);
      running = false;
      onComplete();
      return;
    }
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  return {
    stop() { running = false; cancelAnimationFrame(rafId); }
  };
}

// ---- Linear curve helpers ------------------------------------------------
//
// All current diagrams use linear demand and supply curves. Each curve is
// parameterised by two anchor points in data space. These helpers compute
// the line's price at a given quantity and vice versa.

export function linearCurve(p1, p2) {
  // Returns an object with .priceAt(q) and .quantityAt(p), plus slope
  const dq = p2.q - p1.q;
  const dp = p2.p - p1.p;
  const slope = dq === 0 ? Infinity : dp / dq;
  return {
    p1, p2, slope,
    priceAt: q => p1.p + slope * (q - p1.q),
    quantityAt: p => dp === 0 ? (p === p1.p ? p1.q : NaN) : p1.q + (p - p1.p) / slope,
  };
}

// Returns the intersection of two linear curves in data space.
export function intersect(c1, c2) {
  // c1: p = a1 + m1*q;  c2: p = a2 + m2*q
  const m1 = c1.slope;
  const m2 = c2.slope;
  if (m1 === m2) return null;
  const a1 = c1.p1.p - m1 * c1.p1.q;
  const a2 = c2.p1.p - m2 * c2.p1.q;
  const q = (a2 - a1) / (m1 - m2);
  const p = a1 + m1 * q;
  return { q, p };
}

// ---- Event dispatch (stub for future analytics) -------------------------
//
// Every interaction that "means something" dispatches a structured event.
// Today these just go to console in dev; in future they'll feed a
// learning analytics backend.

const eventListeners = [];
export function onEvent(fn) { eventListeners.push(fn); }
export function logEvent(payload) {
  const evt = { ...payload, timestamp: Date.now() };
  if (typeof window !== 'undefined' && window.__IBECON_DEBUG__) {
    // eslint-disable-next-line no-console
    console.log('[ibecon]', evt);
  }
  eventListeners.forEach(fn => { try { fn(evt); } catch (e) { /* ignore */ } });
}

// ---- Small DOM helpers ---------------------------------------------------

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'onClick') node.addEventListener('click', v);
    else if (k === 'onInput') node.addEventListener('input', v);
    else if (k === 'onChange') node.addEventListener('change', v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// ---- Sensible defaults for a scenario's D and S curves ------------------
//
// Given a scenario, returns a reasonable pair of linear curves that
// intersect near the scenario's default price and quantity. Each diagram
// may override this but it keeps the "Generic" case and the named
// scenarios consistent out of the box.

export function defaultCurves(scenarioKey) {
  const s = scenarios[scenarioKey] || scenarios.generic;
  const pMax = s.priceMax;
  const qMax = s.quantityMax;
  const pEq = s.defaultPrice;
  const qEq = s.defaultQuantity;
  // Demand: passes through (qEq, pEq), with slope so it hits y-axis around 1.6*pEq
  const demand = linearCurve(
    { q: 0, p: Math.min(pMax * 0.95, pEq * 1.7) },
    { q: qMax, p: Math.max(0, pEq - (Math.min(pMax * 0.95, pEq * 1.7) - pEq) * (qMax - qEq) / qEq) }
  );
  // Supply: passes through (qEq, pEq), with positive slope, hits x-axis at q ~ 0.1*qMax
  const supply = linearCurve(
    { q: qMax * 0.08, p: 0 },
    { q: qMax, p: pEq + (pEq - 0) * (qMax - qEq) / (qEq - qMax * 0.08) }
  );
  return { demand, supply };
}

// ---- Verb conjugation for narration -------------------------------------
//
// Danny IS willing to sell; phone manufacturers ARE willing to sell. Each
// scenario flags its seller/buyer as plural-or-not, and this helper picks
// the right verb. Call it like: verb(s, 'seller', 'want', 'wants').

export function verb(scenario, role, plural, singular) {
  const s = (typeof scenario === 'string') ? scenarios[scenario] : scenario;
  const isPlural = role === 'seller' ? s.sellerIsPlural : s.buyerIsPlural;
  return isPlural ? plural : singular;
}

// Convenience: common verb pairs that come up in the narration panel.
// verbs(s, 'seller').want => 'want' or 'wants'
export function verbs(scenario, role) {
  const v = (p, sng) => verb(scenario, role, p, sng);
  return {
    want:     v('want', 'wants'),
    are:      v('are', 'is'),
    have:     v('have', 'has'),
    will:     v('will', 'will'),
    buy:      v('buy', 'buys'),
    sell:     v('sell', 'sells'),
    offer:    v('offer', 'offers'),
    find:     v('find', 'finds'),
    cut:      v('cut', 'cuts'),
    raise:    v('raise', 'raises'),
    bid:      v('bid', 'bids'),
  };
}

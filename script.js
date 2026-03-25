const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

// ── π-fraction helpers ─────────────────────────────
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// Returns a π-fraction string (e.g. "3π/4") for nice angles,
// or null if the denominator would be > 12 (falls back to decimal).
function toRadLabel(deg) {
  const d = Math.round(deg);
  if (d === 0) return '0';
  const g   = gcd(d, 180);
  const num = d / g;
  const den = 180 / g;
  if (den > 12) return null;
  if (den === 1) return num === 1 ? 'π' : `${num}π`;
  return num === 1 ? `π/${den}` : `${num}π/${den}`;
}

// Parses the angle input field → degrees.
// Accepts: "45", "45°", "pi/4", "π/4", "3pi/2", "1.5708 rad", etc.
function parseAngleInput(raw) {
  const str = raw.trim().toLowerCase()
    .replace(/[°]/g, '').replace(/π/g, 'pi').replace(/\s+/g, '');
  if (!useDeg) {
    const m = str.match(/^(-?\d*\.?\d*)pi(?:\/(\d+\.?\d*))?$/);
    if (m) {
      const num = (m[1] === '' || m[1] === '-') ? (m[1] === '-' ? -1 : 1) : parseFloat(m[1]);
      const den = m[2] ? parseFloat(m[2]) : 1;
      return (num / den) * 180; // (n/d)π rad → (n/d)×180 deg
    }
    const rad = parseFloat(str.replace(/rad\b/g, ''));
    return isNaN(rad) ? NaN : rad * 180 / Math.PI;
  }
  return parseFloat(str.replace(/deg\b/g, ''));
}

// ── State ──────────────────────────────────────────
let angleDeg = 45;
let radius   = 1.0;
let useDeg   = true;
let dragging = false;

// ── Layout ─────────────────────────────────────────
const W = 500, H = 500;
const cx = W / 2, cy = H / 2;
const BASE_SCALE = 150; // pixels per unit
function scale() { return BASE_SCALE; }
function toX(x) { return cx + x * scale(); }
function toY(y) { return cy - y * scale(); }

// ── Draw helpers ───────────────────────────────────
function drawGrid() {
  const maxU = 2.6;
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 1;

  for (let u = -Math.ceil(maxU); u <= Math.ceil(maxU); u++) {
    if (u === 0) continue;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(toX(u), toY(-maxU));
    ctx.lineTo(toX(u), toY(maxU));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(-maxU), toY(u));
    ctx.lineTo(toX(maxU),  toY(u));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawAxes() {
  const maxU = 2.6;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(toX(-maxU), toY(0));
  ctx.lineTo(toX(maxU),  toY(0));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(-maxU));
  ctx.lineTo(toX(0), toY(maxU));
  ctx.stroke();

  drawArrow(toX(maxU), toY(0), 0);
  drawArrow(toX(0), toY(maxU), -Math.PI / 2);

  ctx.fillStyle = '#475569';
  ctx.font = '13px Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('x', toX(maxU) + 8, toY(0) + 5);
  ctx.textAlign = 'center';
  ctx.fillText('y', toX(0), toY(maxU) - 10);

  ctx.fillStyle = '#475569';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  for (let u = -2; u <= 2; u++) {
    if (u === 0) continue;
    ctx.fillText(u, toX(u), toY(0) + 16);
    ctx.textAlign = 'right';
    ctx.fillText(u, toX(0) - 8, toY(u) + 4);
    ctx.textAlign = 'center';
  }
}

function drawArrow(x, y, angle) {
  const size = 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size,  size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircle(r) {
  ctx.strokeStyle = '#3b4f6b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(toX(0), toY(0), r * scale(), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawAngleArc(rad, r) {
  const arcR = Math.min(40, r * scale() * 0.3);
  ctx.strokeStyle = '#c4b5fd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(toX(0), toY(0), arcR, -rad, 0, rad < 0);
  ctx.stroke();

  const midAngle = rad / 2;
  const lx = toX(0) + (arcR + 12) * Math.cos(-midAngle);
  const ly = toY(0) + (arcR + 12) * Math.sin(-midAngle);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'italic 13px Segoe UI, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('θ', lx, ly);
  ctx.textBaseline = 'alphabetic';
}

function drawTriangle(px, py, rad, r) {
  const ox = toX(0),  oy = toY(0);
  const tx = toX(px), ty = toY(py);
  const fx = toX(px), fy = toY(0);

  // Right-angle box at foot
  if (Math.abs(py) > 0.01 && Math.abs(px) > 0.01) {
    const boxSize  = 8 * Math.sign(px);
    const boxSizeY = 8 * Math.sign(py);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy - boxSizeY);
    ctx.lineTo(fx - boxSize, fy - boxSizeY);
    ctx.lineTo(fx - boxSize, fy);
    ctx.stroke();
  }

  // Adjacent (cos) — blue
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(fx, fy);
  ctx.stroke();

  // Opposite (sin) — red
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Hypotenuse — green
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Dashed projection lines to axes
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx, oy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(ox, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // Side labels
  ctx.font = 'bold 12px Segoe UI, sans-serif';

  const adjMidX = (ox + fx) / 2;
  const adjOffY  = py >= 0 ? 18 : -10;
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`adj = ${(r * Math.abs(Math.cos(rad))).toFixed(3)}`, adjMidX, fy + adjOffY);

  const oppMidY = (ty + fy) / 2;
  const oppOffX  = px >= 0 ? 48 : -48;
  ctx.fillStyle = '#f87171';
  ctx.textAlign = 'center';
  ctx.fillText(`opp = ${(r * Math.abs(Math.sin(rad))).toFixed(3)}`, tx + oppOffX, oppMidY);

  const hypMidX = (ox + tx) / 2;
  const hypMidY = (oy + ty) / 2;
  const hypAngle = Math.atan2(ty - oy, tx - ox);
  ctx.save();
  ctx.translate(hypMidX, hypMidY);
  ctx.rotate(hypAngle);
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'center';
  ctx.fillText(`r = ${r.toFixed(1)}`, 0, px >= 0 ? -10 : 14);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
}

function drawPoint(px, py) {
  const tx = toX(px), ty = toY(py);

  const grd = ctx.createRadialGradient(tx, ty, 2, tx, ty, 16);
  grd.addColorStop(0, 'rgba(196,181,253,0.5)');
  grd.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(tx, ty, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c4b5fd';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = px >= 0 ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  const offX = px >= 0 ? 12 : -12;
  const offY = py >= 0 ? -12 :  18;
  ctx.fillText(`(${px.toFixed(2)}, ${py.toFixed(2)})`, tx + offX, ty + offY);
  ctx.textBaseline = 'alphabetic';
}

// ── Function graphs ─────────────────────────────────
function drawFunctionGraph(canvasId, trigFn, color, title) {
  const gc = document.getElementById(canvasId);
  if (!gc) return;
  const g  = gc.getContext('2d');
  const GW = gc.width, GH = gc.height;

  const pad = { left: 28, right: 8, top: 20, bottom: 26 };
  const pw = GW - pad.left - pad.right;
  const ph = GH - pad.top  - pad.bottom;

  // deg → canvas x;  value (-1..1) → canvas y
  const gx = (deg) => pad.left + (deg / 360) * pw;
  const gy = (val) => pad.top  + (ph / 2) * (1 - val);

  // Background
  g.fillStyle = '#1e293b';
  g.fillRect(0, 0, GW, GH);

  // Horizontal reference lines at -1, 0, +1
  [-1, 0, 1].forEach(v => {
    g.strokeStyle = v === 0 ? '#475569' : '#293548';
    g.lineWidth   = v === 0 ? 1.5 : 1;
    g.beginPath();
    g.moveTo(pad.left, gy(v));
    g.lineTo(pad.left + pw, gy(v));
    g.stroke();
  });

  // Vertical grid lines at 90°, 180°, 270°
  g.strokeStyle = '#293548';
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  [90, 180, 270].forEach(deg => {
    g.beginPath();
    g.moveTo(gx(deg), pad.top);
    g.lineTo(gx(deg), pad.top + ph);
    g.stroke();
  });
  g.setLineDash([]);

  // Curve
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  for (let d = 0; d <= 360; d += 0.5) {
    const x = gx(d);
    const y = gy(trigFn(d * Math.PI / 180));
    d === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();

  // Current angle marker
  const curVal  = trigFn(angleDeg * Math.PI / 180);
  const markerX = gx(angleDeg);
  const markerY = gy(curVal);

  // Dashed horizontal line at current value
  g.globalAlpha = 0.35;
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(pad.left, markerY);
  g.lineTo(pad.left + pw, markerY);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  // Dashed vertical line at current angle (purple)
  g.strokeStyle = '#c4b5fd';
  g.lineWidth = 1.5;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(markerX, pad.top);
  g.lineTo(markerX, pad.top + ph);
  g.stroke();
  g.setLineDash([]);

  // Dot on curve
  g.fillStyle = color;
  g.strokeStyle = '#0f172a';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(markerX, markerY, 5, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Y-axis labels
  g.fillStyle = '#64748b';
  g.font = '10px Segoe UI, sans-serif';
  g.textBaseline = 'middle';
  [[1,'1'], [0,'0'], [-1,'-1']].forEach(([v, lbl]) => {
    g.textAlign = 'right';
    g.fillText(lbl, pad.left - 3, gy(v));
  });

  // X-axis labels
  const ticks = useDeg
    ? [[0,'0°'], [90,'90°'], [180,'180°'], [270,'270°'], [360,'360°']]
    : [[0,'0'], [90,'π/2'], [180,'π'], [270,'3π/2'], [360,'2π']];
  g.fillStyle = '#64748b';
  g.font = '10px Segoe UI, sans-serif';
  g.textBaseline = 'top';
  ticks.forEach(([deg, lbl], i) => {
    g.textAlign = i === 0 ? 'left' : i === ticks.length - 1 ? 'right' : 'center';
    g.fillText(lbl, gx(deg), pad.top + ph + 5);
  });

  // Graph title (top-left)
  g.fillStyle = color;
  g.font = 'bold 11px Segoe UI, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(title, pad.left + 2, 4);

  // Current value (top-right)
  g.fillStyle = '#e2e8f0';
  g.font = '10px Segoe UI, sans-serif';
  g.textAlign = 'right';
  g.fillText(`= ${curVal.toFixed(4)}`, GW - pad.right, 4);

  g.textBaseline = 'alphabetic';
}

// ── Main draw ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  const rad = angleDeg * Math.PI / 180;
  const px  = radius * Math.cos(rad);
  const py  = radius * Math.sin(rad);
  const s   = Math.sin(rad);
  const c   = Math.cos(rad);
  const t   = Math.tan(rad);

  drawGrid();
  drawAxes();
  drawCircle(radius);
  drawTriangle(px, py, rad, radius);
  drawAngleArc(rad, radius);
  drawPoint(px, py);

  drawFunctionGraph('sinGraph', Math.sin, '#f87171', 'sin(θ)');
  drawFunctionGraph('cosGraph', Math.cos, '#60a5fa', 'cos(θ)');

  updatePanel(s, c, t);
}

// ── Panel updates ──────────────────────────────────
function updatePanel(s, c, t) {
  const angleInput = document.getElementById('angleInput');
  const fracLabel  = toRadLabel(angleDeg);
  const radDecimal = (angleDeg * Math.PI / 180).toFixed(4);
  if (document.activeElement !== angleInput) {
    if (useDeg) {
      angleInput.value = `${Math.round(angleDeg)}°`;
    } else {
      angleInput.value = fracLabel ? fracLabel : `${radDecimal} rad`;
    }
  }
  if (useDeg) {
    document.getElementById('angleAlt').textContent =
      fracLabel ? `= ${fracLabel}` : `≈ ${radDecimal} rad`;
  } else {
    document.getElementById('angleAlt').textContent = `= ${Math.round(angleDeg)}°`;
  }

  document.getElementById('sinVal').textContent = s.toFixed(4);
  document.getElementById('sinFormula').textContent =
    `opposite / hypotenuse  =  y / r  =  ${(radius * s).toFixed(3)} / ${radius.toFixed(1)}`;
  setBar('sinBar', s, 1);

  document.getElementById('cosVal').textContent = c.toFixed(4);
  document.getElementById('cosFormula').textContent =
    `adjacent / hypotenuse  =  x / r  =  ${(radius * c).toFixed(3)} / ${radius.toFixed(1)}`;
  setBar('cosBar', c, 1);

  const tanUndef = Math.abs(c) < 0.005;
  document.getElementById('tanVal').textContent = tanUndef ? 'undefined' : t.toFixed(4);
  document.getElementById('tanUndef').style.display = tanUndef ? 'block' : 'none';
  setBar('tanBar', tanUndef ? 0 : Math.max(-3, Math.min(3, t)), 3);

  const label = useDeg
    ? `${Math.round(angleDeg)}°`
    : (fracLabel ? fracLabel : `${radDecimal} rad`);
  document.getElementById('angleLabel').textContent  = label;
  document.getElementById('radiusLabel').textContent = radius.toFixed(1);
}

function setBar(id, value, maxAbs) {
  const el  = document.getElementById(id);
  const pct = Math.abs(value) / maxAbs * 50;
  el.style.width = pct + '%';
  el.style.left  = value >= 0 ? '50%' : (50 - pct) + '%';
}

// ── Interaction ────────────────────────────────────
function angleFromCanvas(ex, ey) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const dx = (ex - rect.left) * scaleX - cx;
  const dy = cy - (ey - rect.top)  * scaleY;
  let deg = Math.atan2(dy, dx) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function hitPoint(ex, ey) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx = (ex - rect.left) * scaleX;
  const my = (ey - rect.top)  * scaleY;
  const rad = angleDeg * Math.PI / 180;
  const px  = toX(radius * Math.cos(rad));
  const py  = toY(radius * Math.sin(rad));
  return Math.hypot(mx - px, my - py) < 20;
}

canvas.addEventListener('mousedown', e => {
  if (hitPoint(e.clientX, e.clientY)) { dragging = true; e.preventDefault(); }
});
canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  angleDeg = Math.round(angleFromCanvas(e.clientX, e.clientY));
  document.getElementById('angleSlider').value = angleDeg;
  draw();
});
canvas.addEventListener('mouseup',    () => dragging = false);
canvas.addEventListener('mouseleave', () => dragging = false);

canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  if (hitPoint(t.clientX, t.clientY)) { dragging = true; e.preventDefault(); }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!dragging) return;
  e.preventDefault();
  const t = e.touches[0];
  angleDeg = Math.round(angleFromCanvas(t.clientX, t.clientY));
  document.getElementById('angleSlider').value = angleDeg;
  draw();
}, { passive: false });
canvas.addEventListener('touchend', () => dragging = false);

document.getElementById('angleSlider').addEventListener('input', e => {
  angleDeg = parseFloat(e.target.value);
  draw();
});
document.getElementById('radiusSlider').addEventListener('input', e => {
  radius = parseFloat(e.target.value);
  draw();
});

function applyAngleInput() {
  const inDeg = parseAngleInput(document.getElementById('angleInput').value);
  if (isNaN(inDeg)) { draw(); return; }
  angleDeg = ((inDeg % 360) + 360) % 360;
  document.getElementById('angleSlider').value = Math.round(angleDeg);
  draw();
}
document.getElementById('angleInput').addEventListener('change', applyAngleInput);
document.getElementById('angleInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('angleInput').blur();
});

function setUnits(unit) {
  useDeg = unit === 'deg';
  document.getElementById('btnDeg').classList.toggle('active', useDeg);
  document.getElementById('btnRad').classList.toggle('active', !useDeg);
  draw();
}

draw();

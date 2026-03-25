const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

// ── State ──────────────────────────────────────────
let angleDeg = 45;
let radius   = 1.0;
let useDeg   = true;
let dragging = false;

// ── Layout ─────────────────────────────────────────
const W = 500, H = 500;
const cx = W / 2, cy = H / 2;
const BASE_SCALE = 150; // pixels per unit at radius=1
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

  // X axis
  ctx.beginPath();
  ctx.moveTo(toX(-maxU), toY(0));
  ctx.lineTo(toX(maxU),  toY(0));
  ctx.stroke();

  // Y axis
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(-maxU));
  ctx.lineTo(toX(0), toY(maxU));
  ctx.stroke();

  // Arrowheads
  drawArrow(toX(maxU), toY(0), 0);
  drawArrow(toX(0), toY(maxU), -Math.PI / 2);

  // Axis labels
  ctx.fillStyle = '#475569';
  ctx.font = '13px Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('x', toX(maxU) + 8, toY(0) + 5);
  ctx.textAlign = 'center';
  ctx.fillText('y', toX(0), toY(maxU) - 10);

  // Tick labels
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

  // Small θ label
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
  const fx = toX(px), fy = toY(0); // foot of perpendicular

  // Right-angle box at foot
  if (Math.abs(py) > 0.01 && Math.abs(px) > 0.01) {
    const boxSize = 8 * Math.sign(px);
    const boxSizeY = 8 * Math.sign(py);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy - boxSizeY);
    ctx.lineTo(fx - boxSize, fy - boxSizeY);
    ctx.lineTo(fx - boxSize, fy);
    ctx.stroke();
  }

  // Adjacent side (cos) — blue
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(fx, fy);
  ctx.stroke();

  // Opposite side (sin) — red
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
  ctx.lineTo(tx, oy);  // project to x-axis
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(ox, ty);  // project to y-axis
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Side labels ──
  ctx.font = 'bold 12px Segoe UI, sans-serif';

  // Adjacent label
  const adjMidX = (ox + fx) / 2;
  const adjOffY  = py >= 0 ? 18 : -10;
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const adjLen = (r * Math.abs(Math.cos(rad))).toFixed(3);
  ctx.fillText(`adj = ${adjLen}`, adjMidX, fy + adjOffY);

  // Opposite label
  const oppMidY = (ty + fy) / 2;
  const oppOffX  = px >= 0 ? 48 : -48;
  ctx.fillStyle = '#f87171';
  ctx.textAlign = 'center';
  const oppLen = (r * Math.abs(Math.sin(rad))).toFixed(3);
  ctx.fillText(`opp = ${oppLen}`, tx + oppOffX, oppMidY);

  // Hypotenuse label
  const hypMidX = (ox + tx) / 2;
  const hypMidY = (oy + ty) / 2;
  const hypAngle = Math.atan2(ty - oy, tx - ox);
  ctx.save();
  ctx.translate(hypMidX, hypMidY);
  ctx.rotate(hypAngle);
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'center';
  // In Q2/Q3 (px<0) the rotated frame flips so -10 lands visually below the line — use +14 instead
  ctx.fillText(`r = ${r.toFixed(1)}`, 0, px >= 0 ? -10 : 14);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
}

function drawPoint(px, py, r) {
  const tx = toX(px), ty = toY(py);

  // Glow
  const grd = ctx.createRadialGradient(tx, ty, 2, tx, ty, 16);
  grd.addColorStop(0, 'rgba(196,181,253,0.5)');
  grd.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(tx, ty, 16, 0, Math.PI * 2);
  ctx.fill();

  // Dot
  ctx.fillStyle = '#c4b5fd';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Coordinate label
  const xVal = px.toFixed(2);
  const yVal = py.toFixed(2);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = px >= 0 ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  const offX = px >= 0 ? 12 : -12;
  const offY = py >= 0 ? -12 :  18;
  ctx.fillText(`(${xVal}, ${yVal})`, tx + offX, ty + offY);
  ctx.textBaseline = 'alphabetic';
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
  drawPoint(px, py, radius);

  updatePanel(s, c, t);
}

// ── Panel updates ──────────────────────────────────
function updatePanel(s, c, t) {
  // Angle display
  const angleInput = document.getElementById('angleInput');
  if (document.activeElement !== angleInput) {
    if (useDeg) {
      angleInput.value = `${Math.round(angleDeg)}°`;
    } else {
      angleInput.value = `${(angleDeg * Math.PI / 180).toFixed(4)} rad`;
    }
  }
  if (useDeg) {
    document.getElementById('angleAlt').textContent = `≈ ${(angleDeg * Math.PI / 180).toFixed(4)} rad`;
  } else {
    document.getElementById('angleAlt').textContent = `= ${Math.round(angleDeg)}°`;
  }

  // Sin
  document.getElementById('sinVal').textContent = s.toFixed(4);
  document.getElementById('sinFormula').textContent = `opposite / hypotenuse  =  y / r  =  ${(radius * s).toFixed(3)} / ${radius.toFixed(1)}`;
  setBar('sinBar', s, 1);

  // Cos
  document.getElementById('cosVal').textContent = c.toFixed(4);
  document.getElementById('cosFormula').textContent = `adjacent / hypotenuse  =  x / r  =  ${(radius * c).toFixed(3)} / ${radius.toFixed(1)}`;
  setBar('cosBar', c, 1);

  // Tan
  const tanUndef = Math.abs(c) < 0.005;
  document.getElementById('tanVal').textContent = tanUndef ? 'undefined' : t.toFixed(4);
  document.getElementById('tanFormula').textContent = `opposite / adjacent  =  y / x  =  sin(θ) / cos(θ)`;
  document.getElementById('tanUndef').style.display = tanUndef ? 'block' : 'none';
  setBar('tanBar', tanUndef ? 0 : Math.max(-3, Math.min(3, t)), 3);

  // Slider label
  const label = useDeg ? `${Math.round(angleDeg)}°` : `${(angleDeg * Math.PI / 180).toFixed(3)} rad`;
  document.getElementById('angleLabel').textContent = label;
  document.getElementById('radiusLabel').textContent = radius.toFixed(1);
}

function setBar(id, value, maxAbs) {
  const el = document.getElementById(id);
  const pct = Math.abs(value) / maxAbs * 50; // % of half-width
  el.style.width = pct + '%';
  if (value >= 0) {
    el.style.left  = '50%';
  } else {
    el.style.left  = (50 - pct) + '%';
  }
}

// ── Interaction ────────────────────────────────────
function angleFromCanvas(ex, ey) {
  const rect = canvas.getBoundingClientRect();
  const mx = ex - rect.left;
  const my = ey - rect.top;
  // Scale mouse coords to canvas coords
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const dx = (mx * scaleX) - cx;
  const dy = cy - (my * scaleY);
  let deg = Math.atan2(dy, dx) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function hitPoint(ex, ey) {
  const rect = canvas.getBoundingClientRect();
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
canvas.addEventListener('mouseup',   () => dragging = false);
canvas.addEventListener('mouseleave',() => dragging = false);

// Touch
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

// Sliders
document.getElementById('angleSlider').addEventListener('input', e => {
  angleDeg = parseFloat(e.target.value);
  draw();
});
document.getElementById('radiusSlider').addEventListener('input', e => {
  radius = parseFloat(e.target.value);
  draw();
});

// Angle text input
function applyAngleInput() {
  const raw = document.getElementById('angleInput').value.trim()
    .toLowerCase().replace(/°|deg|rad/g, '').trim();
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) { draw(); return; } // revert display on bad input
  const inDeg = useDeg ? parsed : parsed * 180 / Math.PI;
  angleDeg = ((inDeg % 360) + 360) % 360;
  document.getElementById('angleSlider').value = Math.round(angleDeg);
  draw();
}
document.getElementById('angleInput').addEventListener('change', applyAngleInput);
document.getElementById('angleInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('angleInput').blur();
});

// Units toggle
function setUnits(unit) {
  useDeg = unit === 'deg';
  document.getElementById('btnDeg').classList.toggle('active', useDeg);
  document.getElementById('btnRad').classList.toggle('active', !useDeg);
  draw();
}

// Initial draw
draw();

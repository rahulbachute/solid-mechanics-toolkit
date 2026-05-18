/* ============================================================
   SOLID MECHANICS TOOLKIT — Main Script
   SPPU PCC-201-MEC | Ajeenkya DY Patil School of Engineering
   ============================================================ */

'use strict';

// ─── GOOGLE APPS SCRIPT ENDPOINT ──────────────────────────────────────────────
const GAS_URL = 'YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL';

// ─── APP STATE ────────────────────────────────────────────────────────────────
const AppState = {
  theme: 'dark',
  fontSize: 16,
  calcUsed: new Set(),
  quizScore: 0,
  quizCurrent: 0,
  quizQuestions: [],
  quizTimer: null,
  quizTimeLeft: 120,
  earnedBadges: JSON.parse(localStorage.getItem('sm_badges') || '[]'),
  sessionStart: Date.now(),
  simFrames: {},
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initHeroCanvas();
  initNavScroll();
  initCalcTabs();
  initLabTabs();
  initApplications();    // before initScrollReveal so cards exist in DOM
  initScrollReveal();
  initCounters();
  initSimulations();
  initFormulas();
  initBadges();
  initQBank();           // University Question Bank
  logSession('page_load');

  // Input defaults
  updateBeamInputs();
  updateBucklingSection();

  // GSAP (slight delay for first paint)
  setTimeout(initGSAPAnimations, 120);
  initActiveNavHighlight();

  // Lazy-init 3D viewers only when Concepts section enters viewport
  const conceptsSection = document.getElementById('concepts');
  if (conceptsSection) {
    let conceptsInited = false;
    const conceptsObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !conceptsInited) {
        conceptsInited = true;
        conceptsObserver.disconnect();
        initConceptVisualizer();
        setTimeout(() => init3DBeam('beam3DContainer'),    100);
        setTimeout(() => init3DShaft('shaft3DContainer'),  400);
        setTimeout(() => init3DColumn('column3DContainer'),700);
      }
    }, { threshold: 0.1 });
    conceptsObserver.observe(conceptsSection);
  }
});

// ─── PARTICLE BACKGROUND ──────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.5 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${p.a})`;
      ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── HERO CANVAS — Animated beam ──────────────────────────────────────────────
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h * 0.72;
    const bLen = Math.min(w * 0.5, 500);

    // Beam
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - bLen / 2, cy);

    // Deflected beam curve
    const numPts = 60;
    const amp = 20 + 10 * Math.sin(t * 0.8);
    for (let i = 0; i <= numPts; i++) {
      const x = cx - bLen / 2 + (bLen * i / numPts);
      const ratio = i / numPts;
      const y = cy + amp * Math.sin(Math.PI * ratio) * Math.sin(t * 0.5 + 0.2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Supports
    const drawSupport = (x, y, type) => {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      if (type === 'pin') {
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - 14, y + 24); ctx.lineTo(x + 14, y + 24);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(x - 8, y, 16, 24);
      }
    };

    drawSupport(cx - bLen / 2, cy + 6 * Math.sin(t * 0.5 + 0.2), 'pin');
    drawSupport(cx + bLen / 2, cy + 6 * Math.sin(t * 0.5 + 0.2) * Math.sin(Math.PI), 'pin');

    // Load arrow
    const midY = cy + amp * Math.sin(t * 0.5 + 0.2);
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, midY - 50);
    ctx.lineTo(cx, midY - 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.beginPath();
    ctx.moveTo(cx, midY); ctx.lineTo(cx - 6, midY - 12); ctx.lineTo(cx + 6, midY - 12);
    ctx.fill();

    ctx.restore();
    t += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── NAVBAR SCROLL ────────────────────────────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ─── TAB SWITCHING — Calculators ──────────────────────────────────────────────
function initCalcTabs() {
  document.querySelectorAll('.calc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.calc;
      document.getElementById('calc-' + target)?.classList.add('active');
      trackEvent('calculator_switch', target);
    });
  });
}

function initLabTabs() {
  document.querySelectorAll('.lab-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lab-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.lab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.lab;
      document.getElementById('lab-' + target)?.classList.add('active');
    });
  });
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });

  // Observe glass cards and sim cards, but NOT app-card (managed by initApplications)
  document.querySelectorAll('.glass-card, .sim-card, .formula-card').forEach(el => {
    el.classList.add('animate-in');
    observer.observe(el);
  });
}

// ─── COUNTER ANIMATION ────────────────────────────────────────────────────────
function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = parseInt(entry.target.dataset.target);
      let current = 0;
      const step = target / 50;
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        entry.target.textContent = Math.floor(current) + (target >= 100 ? '+' : '');
        if (current >= target) clearInterval(timer);
      }, 30);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

// ─── MATERIAL PRESETS ─────────────────────────────────────────────────────────
const materials = {
  steel:    { E: 200, nu: 0.3, label: 'Steel' },
  aluminum: { E: 70,  nu: 0.33, label: 'Aluminum' },
  copper:   { E: 120, nu: 0.34, label: 'Copper' },
  concrete: { E: 30,  nu: 0.2, label: 'Concrete' },
};

function setMaterial(name) {
  const m = materials[name];
  if (!m) return;
  document.getElementById('ss_E').value = m.E;
  document.getElementById('ss_nu').value = m.nu;
}

// ─── STRESS-STRAIN CALCULATOR ─────────────────────────────────────────────────
function calcStressStrain() {
  const F  = parseFloat(document.getElementById('ss_force').value);
  const A  = parseFloat(document.getElementById('ss_area').value);
  const L0 = parseFloat(document.getElementById('ss_length').value);
  const E  = parseFloat(document.getElementById('ss_E').value) * 1e9;
  const nu = parseFloat(document.getElementById('ss_nu').value);

  if ([F,A,L0,E,nu].some(isNaN)) return;

  const sigma  = F / A;                        // N/mm² = MPa
  const epsilon = sigma / (E / 1e6);           // strain (dimensionless)
  const deltaL = epsilon * L0;                 // mm
  const epsilonLat = -nu * epsilon;
  const sigma_MPa = sigma;
  const E_GPa = E / 1e9;

  const steps = [
    { label: 'Step 1: Normal Stress', formula: 'σ = F / A', value: `${sigma_MPa.toFixed(3)} MPa`, explain: `Force ${F} N divided by area ${A} mm²` },
    { label: 'Step 2: Longitudinal Strain', formula: 'ε = σ / E', value: `${epsilon.toExponential(3)}`, explain: `Strain is dimensionless — ratio of deformation to original length` },
    { label: 'Step 3: Deformation', formula: 'δ = ε × L₀', value: `${deltaL.toFixed(4)} mm`, explain: `Actual elongation of the bar` },
    { label: 'Step 4: Lateral Strain', formula: 'ε_lat = −ν × ε', value: `${epsilonLat.toExponential(3)}`, explain: `Poisson effect — bar becomes thinner when stretched` },
  ];

  renderSteps('ss_steps', steps);
  drawStressStrainChart(E_GPa, sigma_MPa, epsilon);
  awardBadge('first_calc');
  trackEvent('calculator_used', 'stress_strain', { sigma: sigma_MPa, epsilon });
}

function renderSteps(containerId, steps) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'step-item';
    div.style.animationDelay = `${i * 0.1}s`;
    div.innerHTML = `
      <div class="step-label">${s.label}</div>
      <div class="step-formula">${s.formula}</div>
      <div class="step-value">= ${s.value}</div>
      <div class="step-explain">${s.explain}</div>
    `;
    container.appendChild(div);
  });
}

function drawStressStrainChart(E_GPa, sigma_applied, epsilon_applied) {
  // Build a proper engineering stress-strain curve with all 5 zones
  // Based on the applied stress, infer approximate material properties
  // Use mild steel as reference if sigma < 400, else higher strength steel
  const E_MPa = E_GPa * 1000;

  // Estimate material zones from E and applied stress
  const sigma_pl  = sigma_applied * 0.6;           // Proportional limit ≈ 60% of applied (heuristic)
  const sigma_yl  = sigma_applied * 0.8;           // Lower yield stress
  const sigma_yu  = sigma_applied * 0.85;          // Upper yield stress (mild steel bump)
  const sigma_uts = sigma_applied * 1.25;          // UTS
  const sigma_fr  = sigma_applied * 1.05;          // Fracture (neck reduces area)

  const eps_pl  = sigma_pl / E_MPa;
  const eps_yl  = sigma_yl / E_MPa;
  const eps_yu  = eps_yl * 1.005;                  // Tiny drop at upper→lower yield
  const eps_sts = eps_yl + 0.012;                  // Start of strain hardening
  const eps_uts = eps_yl + 0.18;                   // At UTS
  const eps_fr  = eps_yl + 0.28;                   // Fracture

  const sigArr = [], epsArr = [];

  // Zone 1: Linear elastic (0 → proportional limit)
  for (let i = 0; i <= 20; i++) {
    const e = eps_pl * i / 20;
    sigArr.push(sigma_pl * i / 20);
    epsArr.push(e);
  }

  // Zone 2: Slight non-linearity (proportional limit → upper yield)
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    epsArr.push(eps_pl + (eps_yl - eps_pl) * t);
    sigArr.push(sigma_pl + (sigma_yu - sigma_pl) * t * (1 + 0.05 * Math.sin(Math.PI * t)));
  }

  // Zone 3: Yield drop — upper to lower yield (mild steel characteristic)
  epsArr.push(eps_yu); sigArr.push(sigma_yu);
  epsArr.push(eps_yu + 0.001); sigArr.push(sigma_yl * 0.97);

  // Zone 4: Yield plateau (Lüders band propagation)
  for (let i = 0; i <= 8; i++) {
    epsArr.push(eps_yu + 0.001 + (eps_sts - eps_yu - 0.001) * i / 8);
    sigArr.push(sigma_yl * (0.97 + 0.03 * i / 8));
  }

  // Zone 5: Strain hardening
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    epsArr.push(eps_sts + (eps_uts - eps_sts) * t);
    sigArr.push(sigma_yl + (sigma_uts - sigma_yl) * (1 - Math.pow(1 - t, 1.5)));
  }

  // Zone 6: Necking and fracture (engineering SS shows drop)
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    epsArr.push(eps_uts + (eps_fr - eps_uts) * t);
    sigArr.push(sigma_uts - (sigma_uts - sigma_fr) * t * (0.8 + 0.2 * t));
  }

  // Zone labels as vertical shapes
  const zones = [
    { x0: 0,      x1: eps_pl,  name: 'Elastic',          color: 'rgba(0,212,255,0.06)'  },
    { x0: eps_pl, x1: eps_sts, name: 'Yield',            color: 'rgba(255,211,42,0.06)' },
    { x0: eps_sts,x1: eps_uts, name: 'Strain Hardening', color: 'rgba(123,47,255,0.06)' },
    { x0: eps_uts,x1: eps_fr,  name: 'Necking',          color: 'rgba(255,71,87,0.06)'  },
  ];

  const shapes = zones.map(z => ({
    type: 'rect', xref: 'x', yref: 'paper',
    x0: z.x0, x1: z.x1, y0: 0, y1: 1,
    fillcolor: z.color, line: { width: 0 }
  }));

  const annotations = zones.map(z => ({
    x: (z.x0 + z.x1) / 2, y: 1.04, xref: 'x', yref: 'paper',
    text: z.name, showarrow: false,
    font: { color: '#8899bb', size: 9, family: 'Space Mono' }
  }));

  // Key point markers
  const keyPoints = {
    x: [eps_pl,   eps_yu,      eps_yl,      eps_uts,     eps_fr],
    y: [sigma_pl, sigma_yu,    sigma_yl,    sigma_uts,   sigma_fr],
    text: ['PL', 'UYP', 'LYP', 'UTS', 'Fracture'],
  };

  Plotly.newPlot('ss_chart', [
    {
      x: epsArr, y: sigArr,
      type: 'scatter', mode: 'lines', name: 'Engineering S-S Curve',
      line: { color: '#00d4ff', width: 3 }
    },
    {
      x: keyPoints.x, y: keyPoints.y,
      type: 'scatter', mode: 'markers+text', name: 'Key Points',
      marker: { color: ['#ffd32a','#ff6b35','#ff6b35','#ff4757','#7b2fff'], size: 9 },
      text: keyPoints.text, textposition: 'top center',
      textfont: { color: '#8899bb', size: 9 }
    },
    {
      x: [epsilon_applied], y: [sigma_applied],
      type: 'scatter', mode: 'markers', name: 'Your Point',
      marker: { color: '#00ff9d', size: 13, symbol: 'diamond',
                line: { color: 'white', width: 1.5 } }
    },
    {
      // Modulus of Elasticity slope line
      x: [0, eps_pl], y: [0, sigma_pl],
      type: 'scatter', mode: 'lines', name: 'E = slope',
      line: { color: 'rgba(255,211,42,0.5)', width: 1.5, dash: 'dot' }
    }
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 10 },
    xaxis: {
      title: 'Strain ε (dimensionless)',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb',
      zeroline: true, zerolinecolor: 'rgba(255,255,255,0.15)'
    },
    yaxis: {
      title: 'Stress σ (MPa)',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb',
      zeroline: true, zerolinecolor: 'rgba(255,255,255,0.15)'
    },
    showlegend: true,
    legend: { font: { color: '#8899bb', size: 9 }, x: 0.6, y: 0.3 },
    margin: { t: 28, b: 50, l: 65, r: 20 },
    shapes,
    annotations,
  }, { responsive: true, displayModeBar: false });
}

// ─── SFD/BMD CALCULATOR ───────────────────────────────────────────────────────
function updateBeamInputs() {
  const type = document.getElementById('beam_type').value;
  const isUDL = type.includes('udl');
  document.getElementById('udl_input').style.display = isUDL ? '' : 'none';
  document.getElementById('point_input').style.display = isUDL ? 'none' : '';
  document.getElementById('position_input').style.display = (type === 'ss_point') ? '' : 'none';
}

function calcSFDBMD() {
  const type = document.getElementById('beam_type').value;
  const L    = parseFloat(document.getElementById('beam_L').value);
  const w    = parseFloat(document.getElementById('beam_w').value) || 0;
  const P    = parseFloat(document.getElementById('beam_P').value) || 0;
  const a    = parseFloat(document.getElementById('beam_a').value) || L / 2;
  const n    = 100;
  const x    = Array.from({length: n+1}, (_, i) => i * L / n);
  let V = [], M = [], Ra = 0, Rb = 0, Mmax = 0, Vmax = 0;

  if (type === 'ss_udl') {
    Ra = Rb = w * L / 2;
    V = x.map(xi => Ra - w * xi);
    M = x.map(xi => Ra * xi - w * xi * xi / 2);
    Mmax = w * L * L / 8;
    Vmax = Ra;
  } else if (type === 'ss_point') {
    const b = L - a;
    Ra = P * b / L; Rb = P * a / L;
    V = x.map(xi => xi < a ? Ra : Ra - P);
    M = x.map(xi => xi <= a ? Ra * xi : Ra * xi - P * (xi - a));
    Mmax = Ra * a;
    Vmax = Math.max(Ra, Rb);
  } else if (type === 'cantilever_udl') {
    V = x.map(xi => -w * xi);
    M = x.map(xi => -w * xi * xi / 2);
    Mmax = w * L * L / 2;
    Vmax = w * L;
  } else if (type === 'cantilever_point') {
    V = x.map(xi => xi <= L ? -P : 0);
    M = x.map(xi => -P * xi);
    Mmax = P * L;
    Vmax = P;
  }

  document.getElementById('sfd_results').innerHTML = `
    <div class="result-row"><span>Reaction at A (Ra)</span><span class="val">${Ra.toFixed(2)} kN</span></div>
    ${Rb > 0 ? `<div class="result-row"><span>Reaction at B (Rb)</span><span class="val">${Rb.toFixed(2)} kN</span></div>` : ''}
    <div class="result-row"><span>Max Shear Force</span><span class="val">${Vmax.toFixed(2)} kN</span></div>
    <div class="result-row"><span>Max Bending Moment</span><span class="val">${Mmax.toFixed(2)} kN·m</span></div>
  `;

  Plotly.newPlot('sfd_chart', [
    { x, y: V, type: 'scatter', fill: 'tozeroy', name: 'SFD (kN)', line: { color: '#00d4ff', width: 2 }, fillcolor: 'rgba(0,212,255,0.1)' },
    { x, y: M, type: 'scatter', fill: 'tozeroy', name: 'BMD (kN·m)', line: { color: '#ff6b35', width: 2 }, fillcolor: 'rgba(255,107,53,0.1)' },
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 11 },
    xaxis: { title: 'Position (m)', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { title: 'Force/Moment', gridcolor: 'rgba(255,255,255,0.05)' },
    showlegend: true, legend: { font: { color: '#8899bb' } },
    margin: { t: 10, b: 50, l: 70, r: 20 }
  }, { responsive: true, displayModeBar: false });

  trackEvent('calculator_used', 'sfd_bmd', { type, L, Mmax });
}

// ─── BEAM DEFLECTION ─────────────────────────────────────────────────────────
function calcDeflection() {
  const type = document.getElementById('defl_type').value;
  const L    = parseFloat(document.getElementById('defl_L').value) * 1000; // mm
  const P_kN = parseFloat(document.getElementById('defl_P').value);
  const P    = P_kN * 1000; // N
  const E    = parseFloat(document.getElementById('defl_E').value) * 1000; // MPa
  const b    = parseFloat(document.getElementById('defl_b').value);
  const d    = parseFloat(document.getElementById('defl_d').value);
  const I    = b * d * d * d / 12; // mm4
  const EI   = E * I; // N·mm²
  let delta = 0, formula = '', n = 60;

  if (type === 'ss_center')    { delta = P * L**3 / (48 * EI); formula = 'δ = PL³ / 48EI'; }
  else if (type === 'ss_udl')  { const w = P / L; delta = 5 * w * L**4 / (384 * EI); formula = 'δ = 5wL⁴ / 384EI'; }
  else if (type === 'cant_end'){ delta = P * L**3 / (3 * EI); formula = 'δ = PL³ / 3EI'; }
  else if (type === 'cant_udl'){ const w = P / L; delta = w * L**4 / (8 * EI); formula = 'δ = wL⁴ / 8EI'; }

  const allow = L / 360;
  const status = delta <= allow ? 'Safe ✓' : 'Exceeds L/360 ⚠';
  const statusClass = delta <= allow ? 'success' : 'danger';

  document.getElementById('defl_results').innerHTML = `
    <div class="result-row"><span>Formula Used</span><span class="val" style="font-size:0.8rem">${formula}</span></div>
    <div class="result-row"><span>Moment of Inertia (I)</span><span class="val">${(I/1e6).toFixed(4)} × 10⁶ mm⁴</span></div>
    <div class="result-row"><span>EI (Flexural Rigidity)</span><span class="val">${(EI/1e9).toFixed(2)} kN·m²</span></div>
    <div class="result-row"><span>Max Deflection (δ_max)</span><span class="val ${statusClass}">${delta.toFixed(3)} mm</span></div>
    <div class="result-row"><span>Permissible (L/360)</span><span class="val">${allow.toFixed(3)} mm</span></div>
    <div class="result-row"><span>Status</span><span class="val ${statusClass}">${status}</span></div>
  `;

  // Plot deflection curve
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const xi = L * i / n;
    let y = 0;
    if (type === 'ss_center') {
      y = xi <= L/2 ? (P * xi / (48 * EI)) * (3 * L**2 - 4 * xi**2) : (P * (L - xi) / (48 * EI)) * (3 * L**2 - 4 * (L-xi)**2);
    } else if (type === 'cant_end') {
      y = P * xi**2 * (3 * L - xi) / (6 * EI);
    } else if (type === 'ss_udl') {
      const w = P / L; y = w * xi * (L**3 - 2*L*xi**2 + xi**3) / (24 * EI);
    } else {
      const w = P / L; y = w * xi**2 * (6*L**2 - 4*L*xi + xi**2) / (24 * EI);
    }
    xs.push((xi / 1000).toFixed(3));
    ys.push(-(y));
  }

  Plotly.newPlot('defl_chart', [{
    x: xs, y: ys, type: 'scatter', mode: 'lines', fill: 'tozeroy',
    line: { color: '#7b2fff', width: 3 }, fillcolor: 'rgba(123,47,255,0.1)', name: 'Deflection'
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 11 },
    xaxis: { title: 'Position (m)', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { title: 'Deflection (mm)', gridcolor: 'rgba(255,255,255,0.05)' },
    margin: { t: 10, b: 50, l: 70, r: 20 }, showlegend: false
  }, { responsive: true, displayModeBar: false });
}

// ─── SHAFT DESIGN ────────────────────────────────────────────────────────────
function calcShaft() {
  const P_kW  = parseFloat(document.getElementById('shaft_P').value);
  const N     = parseFloat(document.getElementById('shaft_N').value);
  const M     = parseFloat(document.getElementById('shaft_M').value) * 1000; // N·mm
  const tau   = parseFloat(document.getElementById('shaft_tau').value); // MPa
  const Kb    = parseFloat(document.getElementById('shaft_Kb').value);
  const Kt    = parseFloat(document.getElementById('shaft_Kt').value);

  const T = (P_kW * 1e6) / (2 * Math.PI * N / 60); // N·mm
  const Te = Math.sqrt((Kb * M)**2 + (Kt * T)**2);  // Equivalent twisting moment
  const d_torsion = Math.cbrt((16 * Te) / (Math.PI * tau));
  const d = Math.ceil(d_torsion / 5) * 5; // Round up to nearest 5mm

  document.getElementById('shaft_results').innerHTML = `
    <div class="result-row"><span>Power Transmitted (P)</span><span class="val">${P_kW} kW</span></div>
    <div class="result-row"><span>Speed (N)</span><span class="val">${N} rpm</span></div>
    <div class="result-row"><span>Torque (T = 60P / 2πN)</span><span class="val">${(T/1000).toFixed(2)} N·m</span></div>
    <div class="result-row"><span>Bending Moment (M)</span><span class="val">${(M/1000).toFixed(1)} N·m</span></div>
    <div class="result-row"><span>Kb × M</span><span class="val">${(Kb*M/1000).toFixed(2)} N·m</span></div>
    <div class="result-row"><span>Kt × T</span><span class="val">${(Kt*T/1000).toFixed(2)} N·m</span></div>
    <div class="result-row"><span>Equivalent Twisting Moment (Te)</span><span class="val">${(Te/1000).toFixed(2)} N·m</span></div>
    <div class="result-row"><span>Formula: d = ∛(16Te / π·τ)</span><span class="val" style="font-size:0.8rem">ASME Design Code</span></div>
    <div class="result-row"><span>Theoretical Diameter</span><span class="val">${d_torsion.toFixed(2)} mm</span></div>
    <div class="result-row"><span>🔩 Design Diameter (Round Up)</span><span class="val success">${d} mm</span></div>
    <div class="result-row"><span>Actual Shear Stress Check</span><span class="val">${((16*Te)/(Math.PI*d**3)).toFixed(2)} MPa</span></div>
  `;
  trackEvent('calculator_used', 'shaft_design', { d, T_Nm: T/1000 });
}

// ─── EULER BUCKLING ──────────────────────────────────────────────────────────
function updateBucklingSection() {
  const sec = document.getElementById('buck_section').value;
  document.getElementById('buck_circle_inputs').style.display = sec !== 'rectangular' ? '' : 'none';
}

function calcBuckling() {
  const K  = parseFloat(document.getElementById('buck_end').value);
  const L  = parseFloat(document.getElementById('buck_L').value) * 1000; // mm
  const E  = parseFloat(document.getElementById('buck_E').value) * 1000; // MPa
  const d  = parseFloat(document.getElementById('buck_d').value);

  // Section properties for solid circular cross-section
  const I  = Math.PI * d**4 / 64;           // mm⁴
  const A  = Math.PI * d**2 / 4;            // mm²
  const Le = K * L;                          // Effective length mm
  const r  = Math.sqrt(I / A);              // Radius of gyration = d/4 for solid circle
  const lambda = Le / r;                     // Slenderness ratio

  // Critical load and stress
  const Pcr      = (Math.PI**2 * E * I) / Le**2;   // N
  const sigma_cr = Pcr / A;                          // MPa  (= π²E/λ²)
  const Pcr_kN   = Pcr / 1000;

  // Validity: Euler valid if σ_cr < σ_yield (assume ~250 MPa for steel)
  const sigma_y   = 250; // MPa reference (mild steel)
  const lambda_c  = Math.PI * Math.sqrt(E / sigma_y); // Critical slenderness (~89 for steel)
  const euler_valid = lambda >= lambda_c;
  const status    = euler_valid
    ? `Euler applicable ✓  (λ = ${lambda.toFixed(0)} ≥ λc = ${lambda_c.toFixed(0)})`
    : `⚠ Short/Intermediate column (λ = ${lambda.toFixed(0)} < λc = ${lambda_c.toFixed(0)}) — Use Rankine or Johnson formula`;

  document.getElementById('buck_results').innerHTML = `
    <div class="result-row"><span>Effective Length Factor (K)</span><span class="val">${K}</span></div>
    <div class="result-row"><span>Effective Length (Le = KL)</span><span class="val">${(Le/1000).toFixed(3)} m = ${Le.toFixed(0)} mm</span></div>
    <div class="result-row"><span>Moment of Inertia (I = πd⁴/64)</span><span class="val">${(I).toFixed(0)} mm⁴</span></div>
    <div class="result-row"><span>Cross-section Area (A = πd²/4)</span><span class="val">${A.toFixed(2)} mm²</span></div>
    <div class="result-row"><span>Radius of Gyration (k = √I/A = d/4)</span><span class="val">${r.toFixed(3)} mm</span></div>
    <div class="result-row"><span>Slenderness Ratio (λ = Le/k)</span><span class="val ${euler_valid ? 'success' : 'warning'}">${lambda.toFixed(1)}</span></div>
    <div class="result-row"><span>Critical Slenderness (λc = π√E/σy)</span><span class="val">${lambda_c.toFixed(1)}</span></div>
    <div class="result-row"><span>Critical Load (Pcr = π²EI/Le²)</span><span class="val success">${Pcr_kN.toFixed(3)} kN = ${Pcr.toFixed(1)} N</span></div>
    <div class="result-row"><span>Critical Stress (σcr = Pcr/A = π²E/λ²)</span><span class="val">${sigma_cr.toFixed(2)} MPa</span></div>
    <div class="result-row"><span>Euler Validity</span><span class="val ${euler_valid ? 'success' : 'warning'}">${status}</span></div>
  `;

  // ── Correct Euler curve: σ_cr vs λ (universal — independent of section) ──
  // σ_cr = π²E / λ²   — valid region λ ≥ λc
  const lambdaArr = [], sigmaCrArr = [], rankineArr = [];
  const a_r = 1 / 7500; // Rankine constant for mild steel (pinned ends)
  for (let lam = 10; lam <= 300; lam += 2) {
    lambdaArr.push(lam);
    const sc = (Math.PI**2 * E) / lam**2;
    sigmaCrArr.push(Math.min(sc, sigma_y));  // cap at yield stress
    // Rankine-Gordon: σr = σy / (1 + a_r * λ²)
    rankineArr.push(sigma_y / (1 + a_r * lam**2));
  }

  Plotly.newPlot('buck_chart', [
    {
      x: lambdaArr, y: sigmaCrArr,
      type: 'scatter', mode: 'lines', name: 'Euler σ_cr = π²E/λ²',
      line: { color: '#ff6b35', width: 2.5 }
    },
    {
      x: lambdaArr, y: rankineArr,
      type: 'scatter', mode: 'lines', name: 'Rankine-Gordon',
      line: { color: '#7b2fff', width: 1.5, dash: 'dash' }
    },
    {
      x: [lambda_c, lambda_c], y: [0, sigma_y],
      type: 'scatter', mode: 'lines', name: `λc = ${lambda_c.toFixed(0)}`,
      line: { color: '#ffd32a', width: 1, dash: 'dot' }
    },
    {
      x: [lambda], y: [sigma_cr],
      type: 'scatter', mode: 'markers', name: 'Your Column',
      marker: { color: '#00ff9d', size: 14, symbol: 'diamond',
                line: { color: 'white', width: 1.5 } }
    }
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 10 },
    xaxis: {
      title: 'Slenderness Ratio λ = Le/k',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb', range: [0, 310]
    },
    yaxis: {
      title: 'Critical Stress σcr (MPa)',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb', range: [0, sigma_y * 1.1]
    },
    showlegend: true, legend: { font: { color: '#8899bb', size: 9 } },
    margin: { t: 10, b: 55, l: 75, r: 20 },
    shapes: [
      {
        type: 'rect', xref: 'x', yref: 'paper',
        x0: 0, x1: lambda_c, y0: 0, y1: 1,
        fillcolor: 'rgba(255,71,87,0.05)', line: { width: 0 }
      },
      {
        type: 'rect', xref: 'x', yref: 'paper',
        x0: lambda_c, x1: 310, y0: 0, y1: 1,
        fillcolor: 'rgba(0,212,255,0.04)', line: { width: 0 }
      }
    ],
    annotations: [
      { x: lambda_c/2, y: 1.05, xref:'x', yref:'paper', text:'Short/Intermediate', showarrow:false, font:{color:'#ff4757',size:9} },
      { x: lambda_c + 30, y: 1.05, xref:'x', yref:'paper', text:'Long (Euler Zone)', showarrow:false, font:{color:'#00d4ff',size:9} },
    ]
  }, { responsive: true, displayModeBar: false });

  trackEvent('calculator_used', 'buckling', { lambda, Pcr_kN, sigma_cr });
}

// ─── MOHR'S CIRCLE ───────────────────────────────────────────────────────────
function calcMohr() {
  const sx  = parseFloat(document.getElementById('mohr_sx').value);
  const sy  = parseFloat(document.getElementById('mohr_sy').value);
  const txy = parseFloat(document.getElementById('mohr_txy').value);
  const theta_deg = parseFloat(document.getElementById('mohr_theta').value);
  const theta = theta_deg * Math.PI / 180;   // radians

  // ── Core Mohr's Circle quantities ──────────────────────────────────────
  const C    = (sx + sy) / 2;                                // Centre
  const R    = Math.sqrt(((sx - sy) / 2)**2 + txy**2);      // Radius = τ_max
  const s1   = C + R;                                        // Max principal stress
  const s2   = C - R;                                        // Min principal stress
  const tmax = R;                                             // Max shear stress

  // Principal plane angle (angle of x-face from reference to principal plane)
  // tan(2θp) = 2τxy / (σx − σy)
  const theta_p2 = Math.atan2(2 * txy, sx - sy);            // 2θp in radians
  const theta_p  = theta_p2 * 180 / Math.PI / 2;           // θp in degrees

  // ── Stress Transformation (correct formulas) ───────────────────────────
  // σx' = (σx+σy)/2 + (σx-σy)/2·cos2θ + τxy·sin2θ
  // σy' = (σx+σy)/2 − (σx-σy)/2·cos2θ − τxy·sin2θ
  // τx'y' = −(σx-σy)/2·sin2θ + τxy·cos2θ
  const sx_t  = C + ((sx - sy) / 2) * Math.cos(2 * theta) + txy * Math.sin(2 * theta);
  const sy_t  = C - ((sx - sy) / 2) * Math.cos(2 * theta) - txy * Math.sin(2 * theta);
  const txy_t = -((sx - sy) / 2) * Math.sin(2 * theta) + txy * Math.cos(2 * theta);

  // Verify: sx_t + sy_t should equal sx + sy (invariant)
  const check_sum = (Math.abs((sx_t + sy_t) - (sx + sy)) < 0.001) ? '✓' : '⚠';

  document.getElementById('mohr_results').innerHTML = `
    <div class="result-row"><span>Centre C = (σx+σy)/2</span><span class="val">${C.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>Radius R = √[(σx−σy)²/4 + τxy²]</span><span class="val">${R.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>σ₁ = C + R (Max Principal)</span><span class="val success">${s1.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>σ₂ = C − R (Min Principal)</span><span class="val">${s2.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>τ_max = R</span><span class="val warning">${tmax.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>Principal Plane Angle θp = ½·atan(2τxy/(σx−σy))</span><span class="val">${theta_p.toFixed(2)}° &nbsp;(2θp = ${(theta_p*2).toFixed(2)}°)</span></div>
    <div class="result-row"><span>Normal stress invariant (σx+σy = σx'+σy')</span><span class="val success">${(sx+sy).toFixed(2)} = ${(sx_t+sy_t).toFixed(2)} ${check_sum}</span></div>
    <hr style="border-color:var(--border);margin:8px 0">
    <div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);padding:4px 0">Transformed stresses at θ = ${theta_deg}°</div>
    <div class="result-row"><span>σx' = C + (σx−σy)/2·cos2θ + τxy·sin2θ</span><span class="val">${sx_t.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>σy' = C − (σx−σy)/2·cos2θ − τxy·sin2θ</span><span class="val">${sy_t.toFixed(3)} MPa</span></div>
    <div class="result-row"><span>τx'y' = −(σx−σy)/2·sin2θ + τxy·cos2θ</span><span class="val">${txy_t.toFixed(3)} MPa</span></div>
  `;

  // ── Mohr's Circle Plot ─────────────────────────────────────────────────
  // Circle
  const nPts = 360;
  const cx_arr = Array.from({length: nPts+1}, (_, i) => C + R * Math.cos(2 * Math.PI * i / nPts));
  const cy_arr = Array.from({length: nPts+1}, (_, i) =>     R * Math.sin(2 * Math.PI * i / nPts));

  // Point X on Mohr's circle: (σx, +τxy)  Point Y: (σy, -τxy)
  // Diameter XY gives the state of stress on the element
  const traces = [
    {
      x: cx_arr, y: cy_arr,
      type: 'scatter', mode: 'lines', name: "Mohr's Circle",
      line: { color: '#00d4ff', width: 2.5 }
    },
    {
      // Diameter line X to Y
      x: [sx, sy], y: [txy, -txy],
      type: 'scatter', mode: 'lines+markers+text',
      name: 'X–Y Diameter',
      line: { color: 'rgba(255,107,53,0.5)', width: 1.5, dash: 'dot' },
      marker: { color: ['#ff6b35', '#7b2fff'], size: 11 },
      text: ['X(σx, +τxy)', 'Y(σy, -τxy)'], textposition: ['top right', 'bottom left'],
      textfont: { color: '#8899bb', size: 9 }
    },
    {
      // Principal stresses on σ-axis
      x: [s1, s2], y: [0, 0],
      type: 'scatter', mode: 'markers+text', name: 'Principal Stresses',
      marker: { color: '#00ff9d', size: 12, symbol: 'diamond', line:{color:'white',width:1} },
      text: [`σ₁=${s1.toFixed(1)}`, `σ₂=${s2.toFixed(1)}`],
      textposition: ['top right', 'top left'],
      textfont: { color: '#00ff9d', size: 9 }
    },
    {
      // Centre point
      x: [C], y: [0],
      type: 'scatter', mode: 'markers+text', name: `Centre C=${C.toFixed(1)}`,
      marker: { color: '#ffd32a', size: 8, symbol: 'cross' },
      text: [`C`], textposition: 'top center',
      textfont: { color: '#ffd32a', size: 9 }
    },
    {
      // Transformed point X' at angle θ on the circle
      x: [sx_t], y: [txy_t],
      type: 'scatter', mode: 'markers+text', name: `X' at θ=${theta_deg}°`,
      marker: { color: '#ff6b35', size: 10, symbol: 'star', line:{color:'white',width:1} },
      text: [`X'`], textposition: 'top right',
      textfont: { color: '#ff6b35', size: 9 }
    },
    {
      // τ_max points (top and bottom of circle)
      x: [C, C], y: [tmax, -tmax],
      type: 'scatter', mode: 'markers+text', name: `τ_max = ${tmax.toFixed(1)}`,
      marker: { color: 'rgba(255,211,42,0.8)', size: 9, symbol: 'triangle-up' },
      text: [`+τ_max`, `−τ_max`], textposition: ['top center', 'bottom center'],
      textfont: { color: '#ffd32a', size: 9 }
    }
  ];

  Plotly.newPlot('mohr_chart', traces, {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 10 },
    xaxis: {
      title: 'Normal Stress σ (MPa)',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb',
      zeroline: true, zerolinecolor: 'rgba(255,255,255,0.15)',
      scaleanchor: 'y'
    },
    yaxis: {
      title: 'Shear Stress τ (MPa)',
      gridcolor: 'rgba(255,255,255,0.05)', color: '#8899bb',
      zeroline: true, zerolinecolor: 'rgba(255,255,255,0.15)',
    },
    showlegend: true,
    legend: { font: { color: '#8899bb', size: 8 }, x: 1.01, y: 1 },
    margin: { t: 10, b: 55, l: 70, r: 10 }
  }, { responsive: true, displayModeBar: false });

  trackEvent('calculator_used', 'mohr_circle', { s1, s2, tmax, theta_p });
}

// ─── SIMULATIONS ─────────────────────────────────────────────────────────────
function initSimulations() {
  updateBeamSim();
  updateTorsionSim();
  updateBucklingSim();
  updateStressDist();
  initVirtualLabs();
}

function updateBeamSim() {
  const load  = parseFloat(document.getElementById('beamLoad').value);
  const span  = parseFloat(document.getElementById('beamSpan').value);
  const EI    = parseFloat(document.getElementById('beamEI').value);
  document.getElementById('beamLoadVal').textContent = load;
  document.getElementById('beamSpanVal').textContent = span;
  document.getElementById('beamEIVal').textContent   = EI;

  const delta = (load * span**3) / (48 * EI * 1000);
  document.getElementById('beam_readout').textContent = `Max Deflection: ${delta.toFixed(4)} m | Ra = Rb = ${(load/2).toFixed(1)} kN`;
  drawBeamSim(load, span, delta * 1000);
}

function drawBeamSim(load, span, delta_mm) {
  const canvas = document.getElementById('beamCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const margin = 60, bY = H * 0.52;
  const bLen = W - 2 * margin;
  const amp  = Math.min(delta_mm / 5, 42); // visual deflection amplitude

  // ── Background grid ───────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const x = margin + bLen * i / 8;
    ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - 10); ctx.stroke();
  }

  // ── Undeflected position (dashed) ─────────────────────────────────────
  ctx.setLineDash([5, 9]); ctx.strokeStyle = 'rgba(136,153,187,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(margin, bY); ctx.lineTo(W - margin, bY); ctx.stroke();
  ctx.setLineDash([]);

  // ── Deflected beam — cubic shape (correct for central point load) ─────
  // y(x) = Px(3L²−4x²)/(48EI) for 0≤x≤L/2 — shape ∝ x(3−4x²) normalised
  ctx.save();
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 10;
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  const pts = 100;
  for (let i = 0; i <= pts; i++) {
    const xr = margin + bLen * i / pts;   // canvas x
    const t  = i / pts;                    // 0→1 along span
    // Normalised cubic deflection shape (peak = 1 at t=0.5)
    const shape = t <= 0.5
      ? t * (3 - 4 * t * t) / (0.5 * (3 - 4 * 0.5 * 0.5))  // 0→1
      : (1 - t) * (3 - 4 * (1-t) * (1-t)) / (0.5 * (3 - 4 * 0.5 * 0.5)); // 1→0
    const y = bY + amp * shape;
    i === 0 ? ctx.moveTo(xr, y) : ctx.lineTo(xr, y);
  }
  ctx.stroke(); ctx.restore();

  // Beam top highlight
  ctx.strokeStyle = 'rgba(180,240,255,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const xr = margin + bLen * i / pts;
    const t  = i / pts;
    const shape = t <= 0.5
      ? t * (3 - 4*t*t) / (0.5*(3 - 4*0.25))
      : (1-t) * (3 - 4*(1-t)*(1-t)) / (0.5*(3 - 4*0.25));
    const y = bY + amp * shape - 2;
    i === 0 ? ctx.moveTo(xr, y) : ctx.lineTo(xr, y);
  }
  ctx.stroke();

  // ── Supports ──────────────────────────────────────────────────────────
  drawTriangle(ctx, margin,     bY, '#00d4ff');
  drawTriangle(ctx, W - margin, bY, '#00d4ff');

  // ── Reaction arrows (upward at supports) ──────────────────────────────
  [margin, W - margin].forEach(sx => {
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, bY + 26); ctx.lineTo(sx, bY + 50); ctx.stroke();
    ctx.fillStyle = '#00ff9d';
    ctx.beginPath(); ctx.moveTo(sx, bY + 24); ctx.lineTo(sx-5, bY+36); ctx.lineTo(sx+5, bY+36); ctx.fill();
    ctx.fillStyle = '#00ff9d'; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText(`P/2`, sx, bY + 62);
  });

  // ── Applied load arrow (from ABOVE, tip touching TOP of beam at midspan)
  const midX = W / 2;
  // Top of beam at midspan = bY + amp (deflected position) minus beam thickness (5px)
  const beamTop = bY + amp - 2;  // approximately the top surface of deflected beam
  const arrowStart = bY - 52;    // well above undeflected position
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(midX, arrowStart); ctx.lineTo(midX, beamTop - 2); ctx.stroke();
  // Arrowhead pointing DOWN onto beam
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath();
  ctx.moveTo(midX, beamTop + 2);
  ctx.lineTo(midX - 8, beamTop - 12);
  ctx.lineTo(midX + 8, beamTop - 12);
  ctx.closePath(); ctx.fill();
  // Load label above arrow
  ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`P = ${load} kN`, midX, arrowStart - 6);

  // ── Deflection annotation ─────────────────────────────────────────────
  if (amp > 4) {
    const annX = midX + bLen * 0.2;
    ctx.strokeStyle = 'rgba(255,211,42,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3,5]);
    ctx.beginPath(); ctx.moveTo(annX, bY); ctx.lineTo(annX, bY + amp); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,211,42,0.6)'; ctx.lineWidth = 1.5;
    [[bY, 1], [bY + amp, -1]].forEach(([y]) => {
      ctx.beginPath(); ctx.moveTo(annX - 4, y); ctx.lineTo(annX + 4, y); ctx.stroke();
    });
    ctx.fillStyle = '#ffd32a'; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText(`δ=${delta_mm.toFixed(2)}mm`, annX + 6, bY + amp/2 + 3);
  }

  // ── Span label ────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(136,153,187,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(margin, H - 14); ctx.lineTo(W - margin, H - 14); ctx.stroke();
  [[margin, -1],[W - margin, 1]].forEach(([x]) => {
    ctx.beginPath(); ctx.moveTo(x, H - 18); ctx.lineTo(x, H - 10); ctx.stroke();
  });
  ctx.fillStyle = '#8899bb'; ctx.font = '11px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`L = ${span} m`, W / 2, H - 3);
}

function drawTriangle(ctx, x, y, color) {
  ctx.fillStyle = color + '55';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 20); ctx.lineTo(x + 12, y + 20);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function updateTorsionSim() {
  const T   = parseFloat(document.getElementById('torqueSlider').value);
  const d   = parseFloat(document.getElementById('diaSlider').value);
  const L   = parseFloat(document.getElementById('lenSlider').value);
  document.getElementById('torqueVal').textContent = T;
  document.getElementById('diaVal').textContent = d;
  document.getElementById('lenVal').textContent = L;

  const J   = Math.PI * d**4 / 32;   // mm4
  const tau = (T * 1000 * d / 2) / J;  // MPa
  const G   = 80e3;                    // MPa
  const phi = (T * 1000 * L * 1000) / (G * J) * (180 / Math.PI); // deg

  document.getElementById('torsion_readout').textContent =
    `Shear Stress: ${tau.toFixed(2)} MPa | Angle of Twist: ${phi.toFixed(3)}°`;
  drawTorsionSim(d, phi);
}

function drawTorsionSim(d, phi) {
  const canvas = document.getElementById('torsionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const r = Math.min(d * 0.7, 60);
  const L = W * 0.7;

  // Shaft body
  const grad = ctx.createLinearGradient(cx - L/2, cy - r, cx - L/2, cy + r);
  grad.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
  grad.addColorStop(0.4, 'rgba(0, 212, 255, 0.3)');
  grad.addColorStop(1, 'rgba(0, 50, 80, 0.5)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(cx - L/2, cy - r, L, 2 * r);
  ctx.fill(); ctx.stroke();

  // Helix lines to show twist
  const twistRad = (phi * Math.PI / 180) % (2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,107,53,0.6)';
  ctx.lineWidth = 1.5;
  for (let n = 0; n < 6; n++) {
    const startAngle = (n / 6) * 2 * Math.PI;
    const pts = 40;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const x = cx - L/2 + L * t;
      const angle = startAngle + twistRad * t;
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Arrow showing torque
  ctx.strokeStyle = '#7b2fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx - L/2 + 20, cy, r + 12, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.fillStyle = '#8899bb';
  ctx.font = '11px Space Mono';
  ctx.textAlign = 'center';
  ctx.fillText(`d = ${d} mm | φ = ${phi.toFixed(2)}°`, cx, H - 12);
}

function updateBucklingSim() {
  const loadPct = parseFloat(document.getElementById('buckLoad').value);
  const lambda  = parseFloat(document.getElementById('buckSlend').value);
  document.getElementById('buckLoadVal').textContent = loadPct;
  document.getElementById('buckSlendVal').textContent = lambda;

  const buckled = loadPct >= 100;
  const near    = loadPct >= 85;
  const status  = buckled ? '💥 BUCKLED!' : near ? '⚠ Near Critical' : '✓ Safe';
  document.getElementById('buckling_readout').textContent = `Status: ${status} | Slenderness λ = ${lambda}`;
  drawBucklingSim(loadPct, lambda);
}

function drawBucklingSim(loadPct, lambda) {
  const canvas = document.getElementById('bucklingCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const topY = 28, botY = H - 28;
  const colH = botY - topY;
  const maxDefl = Math.min((loadPct / 100) * 38, 44);
  const buckled = loadPct >= 100;
  const near    = loadPct >= 80;

  const color = buckled ? '#ff4757' : near ? '#ffd32a' : '#00d4ff';

  // ── Load arrow ────────────────────────────────────────────────────────
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, topY - 22); ctx.lineTo(cx, topY - 2); ctx.stroke();
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx-6,topY-12); ctx.lineTo(cx+6,topY-12); ctx.fill();
  ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 10px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`${loadPct}% Pcr`, cx, topY - 25);

  // ── Support symbols — pin at top & bottom ─────────────────────────────
  [[topY, false], [botY, true]].forEach(([y, base]) => {
    ctx.fillStyle = '#4a5a7a'; ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (base) {
      ctx.moveTo(cx, y); ctx.lineTo(cx-10, y+16); ctx.lineTo(cx+10, y+16); ctx.closePath();
    } else {
      ctx.moveTo(cx, y); ctx.lineTo(cx-10, y-16); ctx.lineTo(cx+10, y-16); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = '#00d4ff'; ctx.fill();
  });

  // ── Column with correct pinned-pinned mode shape (half sine) ──────────
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = buckled ? 18 : 6;
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  const nPts = 80;
  for (let i = 0; i <= nPts; i++) {
    const t = i / nPts;
    const y = topY + colH * t;
    // Pinned-pinned: half sine wave (correct first buckling mode)
    const x = cx + maxDefl * Math.sin(Math.PI * t);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();

  // ── Deflection dimension arrow ────────────────────────────────────────
  if (maxDefl > 5) {
    const midY = topY + colH * 0.5;
    const midX = cx + maxDefl;
    ctx.strokeStyle = 'rgba(255,211,42,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(cx, midY); ctx.lineTo(midX, midY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd32a'; ctx.font = '9px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText(`δ`, midX + 3, midY - 3);
  }

  // ── Buckle marker ─────────────────────────────────────────────────────
  if (buckled) {
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 15;
    ctx.fillText('💥', cx + maxDefl + 16, topY + colH * 0.5);
    ctx.shadowBlur = 0;
  }

  // ── Status ────────────────────────────────────────────────────────────
  ctx.fillStyle = color; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
  ctx.shadowColor = color; ctx.shadowBlur = 5;
  ctx.fillText(buckled ? 'BUCKLED!' : near ? 'NEAR CRITICAL' : 'STABLE', cx, H - 6);
  ctx.shadowBlur = 0;

  // ── Slenderness label ─────────────────────────────────────────────────
  ctx.fillStyle = '#8899bb'; ctx.font = '9px Space Mono';
  ctx.fillText(`λ = ${lambda}`, cx, topY + colH * 0.5 + 22);
}

function updateStressDist() {
  const M = parseFloat(document.getElementById('momentSlider').value); // kN·m
  const d = parseFloat(document.getElementById('depthSlider').value);  // mm
  document.getElementById('momentVal').textContent = M;
  document.getElementById('depthVal').textContent  = d;

  const b = d * 0.5;                    // width = 0.5×depth (typical proportion)
  const I = b * d**3 / 12;             // mm⁴
  const y_max = d / 2;                  // mm
  const M_Nmm = M * 1e6;               // kN·m → N·mm
  const sigma_max = M_Nmm * y_max / I; // MPa

  document.getElementById('stressDist_readout').textContent =
    `σ_max = My/I = ${sigma_max.toFixed(2)} MPa | Section: ${b.toFixed(0)}×${d}mm | I = ${(I/1e6).toFixed(3)}×10⁶ mm⁴ | Compression top, Tension bottom`;
  drawStressDistSim(M, d, b, sigma_max);
}

function drawStressDistSim(M, d, b, sigma_max) {
  const canvas = document.getElementById('stressDistCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W * 0.32, cy = H / 2;
  const secH = Math.min(d * 0.28, H * 0.72);
  const secW = Math.min(b * 0.28, secH * 0.55);
  const maxTriW = W * 0.28;

  // ── Section outline ───────────────────────────────────────────────────
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0,212,255,0.07)';
  ctx.fillRect(cx - secW/2, cy - secH/2, secW, secH);
  ctx.strokeRect(cx - secW/2, cy - secH/2, secW, secH);

  // Section dimension labels
  ctx.fillStyle = '#8899bb'; ctx.font = '8px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`b=${b.toFixed(0)}`, cx, cy + secH/2 + 12);
  ctx.save(); ctx.translate(cx - secW/2 - 14, cy); ctx.rotate(-Math.PI/2);
  ctx.fillText(`d=${d}`, 0, 0); ctx.restore();

  // ── Neutral axis ──────────────────────────────────────────────────────
  ctx.setLineDash([5,7]); ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - secW/2 - 14, cy);
  ctx.lineTo(cx + secW/2 + maxTriW + 55, cy);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ffd32a'; ctx.font = '9px Space Mono'; ctx.textAlign = 'left';
  ctx.fillText('N.A.', cx - secW/2 - 28, cy - 4);

  // ── Compression triangle (top) ────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(cx + secW/2, cy - secH/2);
  ctx.lineTo(cx + secW/2 + maxTriW, cy - secH/2);
  ctx.lineTo(cx + secW/2, cy);
  ctx.closePath();
  const cg = ctx.createLinearGradient(cx + secW/2, 0, cx + secW/2 + maxTriW, 0);
  cg.addColorStop(0, 'rgba(71,87,255,0.0)'); cg.addColorStop(1, 'rgba(71,87,255,0.45)');
  ctx.fillStyle = cg; ctx.fill();
  ctx.strokeStyle = '#4757ff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + secW/2, cy - secH/2);
  ctx.lineTo(cx + secW/2 + maxTriW, cy - secH/2);
  ctx.lineTo(cx + secW/2, cy); ctx.stroke();

  // ── Tension triangle (bottom) ─────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(cx + secW/2, cy + secH/2);
  ctx.lineTo(cx + secW/2 + maxTriW, cy + secH/2);
  ctx.lineTo(cx + secW/2, cy);
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx + secW/2, 0, cx + secW/2 + maxTriW, 0);
  tg.addColorStop(0, 'rgba(0,255,157,0.0)'); tg.addColorStop(1, 'rgba(0,255,157,0.45)');
  ctx.fillStyle = tg; ctx.fill();
  ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + secW/2, cy + secH/2);
  ctx.lineTo(cx + secW/2 + maxTriW, cy + secH/2);
  ctx.lineTo(cx + secW/2, cy); ctx.stroke();

  // ── Value labels ──────────────────────────────────────────────────────
  const lx = cx + secW/2 + maxTriW + 5;
  ctx.textAlign = 'left'; ctx.font = 'bold 10px Space Mono';
  ctx.fillStyle = '#4757ff';
  ctx.fillText(`−${sigma_max.toFixed(1)} MPa`, lx, cy - secH/2 + 4);
  ctx.fillStyle = '#00ff9d';
  ctx.fillText(`+${sigma_max.toFixed(1)} MPa`, lx, cy + secH/2 + 4);
  ctx.fillStyle = '#ffd32a';
  ctx.fillText('0 MPa', cx + secW/2 + 4, cy - 3);

  // Zone labels
  ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
  ctx.fillStyle = '#4757ff'; ctx.fillText('COMP.', cx, cy - secH*0.35);
  ctx.fillStyle = '#00ff9d'; ctx.fillText('TENSION', cx, cy + secH*0.38);
  ctx.fillStyle = '#8899bb'; ctx.fillText('σ=My/I', cx + secW/2 + maxTriW/2, cy - secH/2 - 8);

  // ── Bending moment curved arrow ───────────────────────────────────────
  const ax = cx - secW/2 - 32;
  ctx.strokeStyle = 'rgba(255,107,53,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ax, cy, secH*0.36, -Math.PI*0.62, Math.PI*0.62); ctx.stroke();
  ctx.fillStyle = '#ff6b35'; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`M=${M}kN·m`, ax, cy + secH*0.36 + 16);
}

// ─── VIRTUAL LABS ─────────────────────────────────────────────────────────────
function initVirtualLabs() {
  drawUTM(0);
  // Impact: draw with initial angle from input
  const angle0 = parseFloat(document.getElementById('impact_angle')?.value || 140);
  drawImpactMachine(angle0, false);
  // Deflection experiment
  updateDeflExp();
  // Buckling experiment - draw initial stable column
  updateBuckExp();
  // Torsion: draw initial machine state (phi = 0)
  drawTorsionTestSim(0);
}

let utmAnimFrame = null, utmRunning = false;
let utmData = { loads:[], exts:[], stresses:[], strains:[] };
let utmChartMode = 'ss';   // 'ss' = Stress-Strain | 'le' = Load-Extension

function switchUTMChart(mode, btn) {
  utmChartMode = mode;
  document.querySelectorAll('.utm-gtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  plotUTMChart();
}

function runUTM() {
  if (utmRunning) return;
  utmRunning = true;
  utmData = { loads:[], exts:[], stresses:[], strains:[] };
  const startBtn = document.getElementById('utmStartBtn');
  if (startBtn) startBtn.disabled = true;

  const matKey  = document.getElementById('utm_material').value;
  const gauge   = parseFloat(document.getElementById('utm_gauge').value);
  const dia     = parseFloat(document.getElementById('utm_dia').value);
  const A       = Math.PI * dia**2 / 4;

  const matProps = {
    mild_steel:  { E: 200, fy: 250, fu: 410, eu: 0.22, label:'Mild Steel',  color:'#00d4ff' },
    cast_iron:   { E: 120, fy: 200, fu: 280, eu: 0.006, label:'Cast Iron',  color:'#ff6b35' },
    aluminum:    { E: 70,  fy: 270, fu: 310, eu: 0.13, label:'Aluminum 6061',color:'#7b2fff' },
    copper:      { E: 120, fy: 200, fu: 290, eu: 0.35, label:'Copper',      color:'#ffd32a' },
  };
  const mat = matProps[matKey];

  // Store for key-value display after test
  window._utmMat = mat;
  window._utmArea = A;
  window._utmGauge = gauge;

  let step = 0, maxSteps = 100;

  function tick() {
    if (step > maxSteps) {
      utmRunning = false;
      if (startBtn) startBtn.disabled = false;
      document.getElementById('utm_status').textContent = '💥 FRACTURED';

      // Final key values
      updateUTMKeyValues(mat, A, gauge);

      // Save globally for report
      window._utmData = { ...utmData };
      return;
    }

    const t = step / maxSteps;

    // Build realistic stress-strain path in 4 zones
    let stress, strain;
    const eps_y  = mat.fy / (mat.E * 1000);   // yield strain

    if (t < 0.35) {
      // Zone 1: elastic (0 → fy)
      const tf  = t / 0.35;
      stress = mat.fy * tf;
      strain = stress / (mat.E * 1000);
    } else if (t < 0.42) {
      // Zone 2: yield drop + plateau (mild steel) or smooth (others)
      const tf   = (t - 0.35) / 0.07;
      const drop = matKey === 'mild_steel' ? 0.97 : 1.0;
      stress = mat.fy * (drop + (1.0 - drop) * tf);
      strain = eps_y + 0.015 * tf;
    } else if (t < 0.78) {
      // Zone 3: strain hardening
      const tf = (t - 0.42) / 0.36;
      stress = mat.fy + (mat.fu - mat.fy) * (1 - Math.pow(1 - tf, 1.5));
      strain = eps_y + 0.015 + mat.eu * 0.85 * tf;
    } else {
      // Zone 4: necking & fracture
      const tf = (t - 0.78) / 0.22;
      stress = mat.fu * (1 - 0.25 * tf) - (mat.fu - mat.fy * 0.9) * tf * 0.15;
      strain = eps_y + 0.015 + mat.eu * 0.85 + mat.eu * 0.15 * tf;
    }

    stress = Math.max(0, stress);
    const load  = stress * A / 1000;           // kN
    const ext   = strain * gauge;              // mm

    utmData.loads.push(parseFloat(load.toFixed(3)));
    utmData.exts.push(parseFloat(ext.toFixed(4)));
    utmData.stresses.push(parseFloat(stress.toFixed(2)));
    utmData.strains.push(parseFloat(strain.toFixed(5)));

    // Live zone label
    const zone = t < 0.35 ? '🟦 Elastic'
               : t < 0.42 ? '🟨 Yield'
               : t < 0.78 ? '🟪 Strain Hardening'
               :             '🟥 Necking';

    // Update instrument readings
    document.getElementById('utm_load').textContent   = load.toFixed(2) + ' kN';
    document.getElementById('utm_ext').textContent    = ext.toFixed(3)  + ' mm';
    document.getElementById('utm_stress').textContent = stress.toFixed(1) + ' MPa';
    document.getElementById('utm_strain').textContent = strain.toFixed(4);
    document.getElementById('utm_status').textContent = zone;

    drawUTM(t);
    plotUTMChart();          // ← real-time graph update every tick

    step++;
    utmAnimFrame = setTimeout(tick, 70);   // ~14 fps — smooth enough, not too fast
  }
  tick();
}

function updateUTMKeyValues(mat, A, gauge) {
  const E_approx = mat.E;
  document.getElementById('kv_E').textContent   = E_approx + ' GPa';
  document.getElementById('kv_sy').textContent  = mat.fy   + ' MPa';
  document.getElementById('kv_uts').textContent = mat.fu   + ' MPa';
  document.getElementById('kv_el').textContent  = (mat.eu * 100).toFixed(1) + '%';
  const frStress = utmData.stresses[utmData.stresses.length - 1] || mat.fy * 0.9;
  document.getElementById('kv_fr').textContent  = frStress.toFixed(0) + ' MPa';
}

function plotUTMChart() {
  const n = utmData.stresses.length;
  if (n < 2) return;

  // Sync globally for report
  window._utmData = { ...utmData };

  const mat = window._utmMat || { label: 'Material', color: '#00d4ff' };

  let xData, yData, xTitle, yTitle;
  if (utmChartMode === 'ss') {
    xData = utmData.strains;  yData = utmData.stresses;
    xTitle = 'Strain ε (dimensionless)';  yTitle = 'Stress σ (MPa)';
  } else {
    xData = utmData.exts;     yData = utmData.loads;
    xTitle = 'Extension δ (mm)';          yTitle = 'Load P (kN)';
  }

  // Color segments by zone
  const zoneColors = utmData.strains.map((_, i) => {
    const t = i / Math.max(utmData.strains.length - 1, 1);
    if (t < 0.35) return '#00d4ff';
    if (t < 0.42) return '#ffd32a';
    if (t < 0.78) return '#7b2fff';
    return '#ff4757';
  });

  Plotly.react('utm_chart', [
    {
      x: xData,
      y: yData,
      type: 'scatter',
      mode: 'lines',
      name: mat.label,
      line: { color: mat.color, width: 2.5 },
      // Marker shows last point (live cursor)
    },
    {
      // Live cursor — last point
      x: [xData[n-1]],
      y: [yData[n-1]],
      type: 'scatter',
      mode: 'markers',
      name: 'Current',
      marker: { color: '#00ff9d', size: 10, symbol: 'diamond',
                line: { color: 'white', width: 1.5 } },
      showlegend: false,
    }
  ], {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(0,0,0,0.2)',
    font: { color: '#8899bb', family: 'Space Mono', size: 10 },
    xaxis: {
      title: { text: xTitle, font: { size: 10 } },
      gridcolor: 'rgba(255,255,255,0.06)',
      color: '#8899bb',
      zeroline: false,
      autorange: true,
    },
    yaxis: {
      title: { text: yTitle, font: { size: 10 } },
      gridcolor: 'rgba(255,255,255,0.06)',
      color: '#8899bb',
      zeroline: false,
      autorange: true,
    },
    showlegend: false,
    margin: { t: 10, b: 50, l: 60, r: 14 },
    // Zone background shapes
    shapes: [
      { type:'rect', xref:'paper', yref:'paper', x0:0, x1:0.35, y0:0, y1:1,
        fillcolor:'rgba(0,212,255,0.04)', line:{width:0} },
      { type:'rect', xref:'paper', yref:'paper', x0:0.35, x1:0.42, y0:0, y1:1,
        fillcolor:'rgba(255,211,42,0.05)', line:{width:0} },
      { type:'rect', xref:'paper', yref:'paper', x0:0.42, x1:0.78, y0:0, y1:1,
        fillcolor:'rgba(123,47,255,0.04)', line:{width:0} },
      { type:'rect', xref:'paper', yref:'paper', x0:0.78, x1:1, y0:0, y1:1,
        fillcolor:'rgba(255,71,87,0.05)', line:{width:0} },
    ],
  }, { responsive: true, displayModeBar: false });
}

function drawUTM(t) {
  const canvas = document.getElementById('utmCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const frameW = 90, frameX = cx - frameW / 2;
  const frameTop = 14, frameBot = H - 30;
  const extension = t * 50; // crosshead moves down by this amount

  // ── Machine frame columns (left & right) ────────────────────────────────
  const colW = 14;
  const grad = ctx.createLinearGradient(frameX, 0, frameX + colW, 0);
  grad.addColorStop(0, '#1a2a4a'); grad.addColorStop(0.5, '#3a4a6a'); grad.addColorStop(1, '#1a2a4a');

  // Left column
  ctx.fillStyle = grad;
  ctx.fillRect(frameX, frameTop, colW, frameBot - frameTop);
  ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1;
  ctx.strokeRect(frameX, frameTop, colW, frameBot - frameTop);

  // Right column
  const grad2 = ctx.createLinearGradient(frameX + frameW - colW, 0, frameX + frameW, 0);
  grad2.addColorStop(0, '#1a2a4a'); grad2.addColorStop(0.5, '#3a4a6a'); grad2.addColorStop(1, '#1a2a4a');
  ctx.fillStyle = grad2;
  ctx.fillRect(frameX + frameW - colW, frameTop, colW, frameBot - frameTop);
  ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1;
  ctx.strokeRect(frameX + frameW - colW, frameTop, colW, frameBot - frameTop);

  // ── Top crossbar (fixed) ───────────────────────────────────────────────
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(frameX, frameTop, frameW, 16);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1;
  ctx.strokeRect(frameX, frameTop, frameW, 16);
  // Bolts on top crossbar
  [frameX + 12, frameX + frameW - 12].forEach(bx => {
    ctx.beginPath(); ctx.arc(bx, frameTop + 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4ff'; ctx.fill();
  });

  // ── Base (fixed) ───────────────────────────────────────────────────────
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(frameX - 10, frameBot, frameW + 20, 14);
  ctx.fillRect(frameX - 20, frameBot + 12, frameW + 40, 6);
  ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1;
  ctx.strokeRect(frameX - 10, frameBot, frameW + 20, 14);

  // ── Moving crosshead ───────────────────────────────────────────────────
  const crossheadY = frameTop + 36 + extension;
  const crossheadH = 18;
  const chGrad = ctx.createLinearGradient(frameX + colW, crossheadY, frameX + frameW - colW, crossheadY + crossheadH);
  chGrad.addColorStop(0, '#003a5c'); chGrad.addColorStop(0.5, '#005a8c'); chGrad.addColorStop(1, '#003a5c');
  ctx.fillStyle = chGrad;
  ctx.fillRect(frameX + colW - 2, crossheadY, frameW - 2 * colW + 4, crossheadH);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(frameX + colW - 2, crossheadY, frameW - 2 * colW + 4, crossheadH);

  // Upper grip (attached to crosshead)
  const upperGripY = crossheadY + crossheadH;
  const gripW = 28, gripH = 16;
  const ugGrad = ctx.createLinearGradient(cx - gripW/2, upperGripY, cx + gripW/2, upperGripY);
  ugGrad.addColorStop(0, '#1a4a6a'); ugGrad.addColorStop(0.5, '#00d4ff44'); ugGrad.addColorStop(1, '#1a4a6a');
  ctx.fillStyle = ugGrad;
  ctx.fillRect(cx - gripW/2, upperGripY, gripW, gripH);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - gripW/2, upperGripY, gripW, gripH);

  // ── Lower grip (fixed) ────────────────────────────────────────────────
  const lowerGripY = frameBot - 30;
  const lgGrad = ctx.createLinearGradient(cx - gripW/2, lowerGripY, cx + gripW/2, lowerGripY);
  lgGrad.addColorStop(0, '#1a4a6a'); lgGrad.addColorStop(0.5, '#00d4ff44'); lgGrad.addColorStop(1, '#1a4a6a');
  ctx.fillStyle = lgGrad;
  ctx.fillRect(cx - gripW/2, lowerGripY, gripW, gripH);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - gripW/2, lowerGripY, gripW, gripH);

  // ── Specimen (between grips) ──────────────────────────────────────────
  const specTop = upperGripY + gripH;
  const specBot = lowerGripY;
  const specH   = specBot - specTop;
  const specW   = 10;

  // Necking effect as t approaches 1
  const neck = t > 0.6 ? (t - 0.6) / 0.4 : 0;
  const neckW = specW * (1 - neck * 0.55);
  const neckY = specTop + specH * 0.5;

  // Draw specimen as tapered shape
  ctx.beginPath();
  ctx.moveTo(cx - specW/2, specTop);
  ctx.lineTo(cx + specW/2, specTop);
  // Right side tapering to neck at midpoint
  ctx.quadraticCurveTo(cx + neckW/2 + 4, neckY - specH*0.1, cx + neckW/2, neckY);
  ctx.quadraticCurveTo(cx + neckW/2 + 4, neckY + specH*0.1, cx + specW/2, specBot);
  ctx.lineTo(cx - specW/2, specBot);
  // Left side
  ctx.quadraticCurveTo(cx - neckW/2 - 4, neckY + specH*0.1, cx - neckW/2, neckY);
  ctx.quadraticCurveTo(cx - neckW/2 - 4, neckY - specH*0.1, cx - specW/2, specTop);
  ctx.closePath();

  const specColor = t > 0.85 ? '#ff4757' : t > 0.6 ? '#ffd32a' : '#00d4ff';
  const specGrad = ctx.createLinearGradient(cx - specW, 0, cx + specW, 0);
  specGrad.addColorStop(0, specColor + '44'); specGrad.addColorStop(0.5, specColor + 'aa'); specGrad.addColorStop(1, specColor + '44');
  ctx.fillStyle = specGrad;
  ctx.fill();
  ctx.strokeStyle = specColor; ctx.lineWidth = 1.5;
  ctx.shadowColor = specColor; ctx.shadowBlur = neck > 0.3 ? 12 : 4;
  ctx.stroke(); ctx.shadowBlur = 0;

  // Fracture crack at necking zone
  if (t >= 0.98) {
    ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - neckW/2, neckY);
    ctx.lineTo(cx + neckW/2, neckY);
    ctx.stroke();
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ff4757';
    ctx.textAlign = 'center'; ctx.fillText('✕ FRACTURE', cx + 30, neckY);
  }

  // ── Load arrows ───────────────────────────────────────────────────────
  // Upward arrow (force on crosshead, shown above)
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, frameTop + 4); ctx.lineTo(cx, crossheadY); ctx.stroke();
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath(); ctx.moveTo(cx, crossheadY); ctx.lineTo(cx - 6, crossheadY - 12); ctx.lineTo(cx + 6, crossheadY - 12); ctx.fill();

  // Downward reaction arrow (below lower grip)
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, lowerGripY + gripH + 2); ctx.lineTo(cx, lowerGripY + gripH + 18); ctx.stroke();
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath(); ctx.moveTo(cx, lowerGripY + gripH + 20); ctx.lineTo(cx-6, lowerGripY + gripH + 9); ctx.lineTo(cx+6, lowerGripY + gripH + 9); ctx.fill();

  // ── Extensometer marker ───────────────────────────────────────────────
  if (t > 0 && t < 0.9) {
    const extTop = specTop + specH * 0.2;
    const extBot = specTop + specH * 0.8;
    ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx + specW/2 + 8, extTop); ctx.lineTo(cx + specW/2 + 8, extBot); ctx.stroke();
    ctx.setLineDash([]);
    // Brackets
    ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1.5;
    [[extTop, 1], [extBot, -1]].forEach(([y, dir]) => {
      ctx.beginPath(); ctx.moveTo(cx + specW/2 + 4, y); ctx.lineTo(cx + specW/2 + 14, y); ctx.stroke();
    });
    ctx.fillStyle = '#ffd32a'; ctx.font = '8px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText('L₀', cx + specW/2 + 16, (extTop + extBot)/2 + 3);
  }

  // ── Phase label ───────────────────────────────────────────────────────
  const phaseLabel = t === 0 ? 'Ready' : t < 0.5 ? 'Elastic Zone' : t < 0.8 ? 'Plastic / Strain Hardening' : t < 0.95 ? 'Necking' : 'Fracture';
  const phaseColor = t < 0.5 ? '#00d4ff' : t < 0.8 ? '#ffd32a' : '#ff4757';
  ctx.fillStyle = phaseColor; ctx.font = 'bold 10px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(phaseLabel, cx, H - 8);
}


function resetUTM() {
  clearTimeout(utmAnimFrame);
  utmRunning = false;
  utmData = { loads:[], exts:[], stresses:[], strains:[] };
  window._utmData = { ...utmData };
  const startBtn = document.getElementById('utmStartBtn');
  if (startBtn) startBtn.disabled = false;

  // Reset readings
  document.getElementById('utm_load').textContent   = '0 kN';
  document.getElementById('utm_ext').textContent    = '0 mm';
  document.getElementById('utm_stress').textContent = '0 MPa';
  document.getElementById('utm_strain').textContent = '0';
  document.getElementById('utm_status').textContent = 'Ready';

  // Reset key values bar
  ['kv_E','kv_sy','kv_uts','kv_el','kv_fr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  // Clear chart
  if (typeof Plotly !== 'undefined') {
    Plotly.purge('utm_chart');
  }

  drawUTM(0);
}

function calcTorsionTest() {
  const T = parseFloat(document.getElementById('tors_T').value);
  const d = parseFloat(document.getElementById('tors_d').value);
  const L = parseFloat(document.getElementById('tors_L').value);
  const G = parseFloat(document.getElementById('tors_G').value) * 1000; // MPa
  const J  = Math.PI * d**4 / 32;
  const tau = T * 1000 * (d/2) / J;
  const phi = (T * 1000 * L) / (G * J) * (180 / Math.PI);
  document.getElementById('tors_readings').innerHTML = `
    <div class="reading-row"><span>Polar MOI (J)</span><span class="reading-val">${(J/1e3).toFixed(2)} ×10³ mm⁴</span></div>
    <div class="reading-row"><span>Shear Stress (τ)</span><span class="reading-val">${tau.toFixed(2)} MPa</span></div>
    <div class="reading-row"><span>Angle of Twist (φ)</span><span class="reading-val">${phi.toFixed(3)}°</span></div>
    <div class="reading-row highlight"><span>Shear Modulus (G)</span><span class="reading-val">${(G/1000).toFixed(0)} GPa</span></div>
  `;
  drawTorsionTestSim(phi);
}

function drawTorsionTestSim(phi) {
  const canvas = document.getElementById('torsionTestCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const shaftTop = 55, shaftBot = H - 55;
  const shaftH = shaftBot - shaftTop;
  const shaftW = 22;
  const r = 52;   // disk radius

  // ── Machine frame ─────────────────────────────────────────────────────────
  // Left vertical column
  ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx - r - 20, shaftTop - 10); ctx.lineTo(cx - r - 20, shaftBot + 10); ctx.stroke();
  // Right column
  ctx.beginPath(); ctx.moveTo(cx + r + 20, shaftTop - 10); ctx.lineTo(cx + r + 20, shaftBot + 10); ctx.stroke();
  // Base
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(cx - r - 35, shaftBot + 8, (r + 35) * 2, 10);
  ctx.fillRect(cx - r - 45, shaftBot + 16, (r + 45) * 2, 6);
  // Top crossbar
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(cx - r - 30, shaftTop - 16, (r + 30) * 2, 8);

  // ── Fixed lower chuck (hexagonal outline) ─────────────────────────────────
  ctx.save();
  ctx.translate(cx, shaftBot);
  ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(136,153,187,0.15)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const rx = (r * 0.55) * Math.cos(a), ry = (r * 0.3) * Math.sin(a);
    i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // ── Shaft (vertical bar) ──────────────────────────────────────────────────
  const shaftGrad = ctx.createLinearGradient(cx - shaftW, 0, cx + shaftW, 0);
  shaftGrad.addColorStop(0,   'rgba(0, 212, 255, 0.3)');
  shaftGrad.addColorStop(0.4, 'rgba(0, 212, 255, 0.8)');
  shaftGrad.addColorStop(0.6, 'rgba(180, 240, 255, 0.9)');
  shaftGrad.addColorStop(1,   'rgba(0, 100, 150, 0.4)');
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(cx - shaftW / 2, shaftTop, shaftW, shaftH);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - shaftW / 2, shaftTop, shaftW, shaftH);

  // ── Twist helix lines on shaft ────────────────────────────────────────────
  const nLines = 5;
  const phiRad = phi * Math.PI / 180;
  ctx.strokeStyle = 'rgba(0, 255, 157, 0.6)'; ctx.lineWidth = 1;
  for (let ln = 0; ln < nLines; ln++) {
    const startAngle = (ln / nLines) * Math.PI * 2;
    ctx.beginPath();
    const nPts = 60;
    for (let i = 0; i <= nPts; i++) {
      const t = i / nPts;
      const y = shaftTop + shaftH * t;
      const a = startAngle + phiRad * t;
      const x = cx + (shaftW / 2) * Math.cos(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ── Rotating disk at top (upper chuck with applied torque) ────────────────
  ctx.save();
  ctx.translate(cx, shaftTop);

  // Disk body
  const diskGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
  diskGrad.addColorStop(0,   'rgba(123, 47, 255, 0.5)');
  diskGrad.addColorStop(0.6, 'rgba(80, 20, 180, 0.4)');
  diskGrad.addColorStop(1,   'rgba(40, 0, 100, 0.3)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = diskGrad; ctx.fill();
  ctx.strokeStyle = '#7b2fff'; ctx.lineWidth = 2.5;
  ctx.shadowColor = '#7b2fff'; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;

  // Spoke lines (rotate with phi)
  const phiDisp = (phi % 360) * Math.PI / 180;
  ctx.strokeStyle = 'rgba(150, 80, 255, 0.7)'; ctx.lineWidth = 1.5;
  for (let s = 0; s < 4; s++) {
    const a = phiDisp + s * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.85 * Math.cos(a), r * 0.85 * Math.sin(a)); ctx.stroke();
  }

  // Torque indicator arm (bright orange)
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3;
  ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(r * Math.cos(phiDisp), r * Math.sin(phiDisp)); ctx.stroke();
  ctx.shadowBlur = 0;

  // Arrow at tip
  const tipX = r * Math.cos(phiDisp), tipY = r * Math.sin(phiDisp);
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - 8 * Math.cos(phiDisp - 0.4), tipY - 8 * Math.sin(phiDisp - 0.4));
  ctx.lineTo(tipX - 8 * Math.cos(phiDisp + 0.4), tipY - 8 * Math.sin(phiDisp + 0.4));
  ctx.closePath(); ctx.fill();

  // Centre hub
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4ff'; ctx.fill();

  ctx.restore();

  // ── Torque arrow (curved arc around disk) ─────────────────────────────────
  ctx.save();
  ctx.translate(cx, shaftTop);
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r + 14, -Math.PI * 0.3, Math.PI * 0.3);
  ctx.stroke();
  // Arrowhead at end
  const arA = Math.PI * 0.3;
  const ax = (r + 14) * Math.cos(arA), ay = (r + 14) * Math.sin(arA);
  ctx.fillStyle = 'rgba(255, 107, 53, 0.7)';
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(ax - 8, ay - 5); ctx.lineTo(ax - 5, ay + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff6b35'; ctx.font = '9px Space Mono'; ctx.textAlign = 'left';
  ctx.fillText('T →', r + 16, 4);
  ctx.restore();

  // ── Angle label ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffd32a'; ctx.font = 'bold 12px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`φ = ${phi.toFixed(1)}°`, cx, H - 10);

  // ── "Gauge Length" dashed line ────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,211,42,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4,6]);
  ctx.beginPath(); ctx.moveTo(cx + shaftW/2 + 12, shaftTop); ctx.lineTo(cx + shaftW/2 + 12, shaftBot); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,211,42,0.5)'; ctx.font = '8px Space Mono'; ctx.textAlign = 'left';
  ctx.fillText('L', cx + shaftW/2 + 14, (shaftTop + shaftBot) / 2);
}

// ─── TORSION TEST — ANIMATED WITH PROGRESSIVE TORQUE APPLICATION ──────────────
let torsionTestRunning = false, torsionTestFrame = null;

function runTorsionTest() {
  if (torsionTestRunning) return;
  torsionTestRunning = true;
  document.querySelector('[onclick="runTorsionTest()"]').disabled = true;

  const T_target = parseFloat(document.getElementById('tors_T').value);    // N·m
  const d = parseFloat(document.getElementById('tors_d').value);            // mm
  const L = parseFloat(document.getElementById('tors_L').value);            // mm
  const G = parseFloat(document.getElementById('tors_G').value) * 1000;     // MPa

  const J   = Math.PI * d**4 / 32;                                         // mm⁴
  const tau_max = T_target * 1000 * (d / 2) / J;                           // MPa  (T in N·mm)
  const phi_max = (T_target * 1000 * L) / (G * J) * (180 / Math.PI);      // degrees

  let step = 0, maxSteps = 60;

  function tick() {
    if (step > maxSteps) {
      torsionTestRunning = false;
      document.querySelector('[onclick="runTorsionTest()"]').disabled = false;

      // Show final results
      document.getElementById('tors_readings').innerHTML = `
        <div class="reading-row"><span>Polar MOI (J = πd⁴/32)</span><span class="reading-val">${(J/1e3).toFixed(3)} ×10³ mm⁴</span></div>
        <div class="reading-row"><span>Torque Applied (T)</span><span class="reading-val">${T_target} N·m</span></div>
        <div class="reading-row"><span>Shear Stress (τ = T·r/J)</span><span class="reading-val">${tau_max.toFixed(2)} MPa</span></div>
        <div class="reading-row"><span>Angle of Twist (φ = TL/GJ)</span><span class="reading-val">${phi_max.toFixed(3)}°</span></div>
        <div class="reading-row"><span>Shear Modulus (G)</span><span class="reading-val">${(G/1000).toFixed(0)} GPa</span></div>
        <div class="reading-row highlight"><span>Status</span><span class="reading-val">${tau_max < 100 ? '✓ Safe' : '⚠ Check τ_allow'}</span></div>
      `;
      return;
    }

    const t = step / maxSteps;
    const T_current  = T_target * t;           // N·m — ramping up
    const phi_current = phi_max * t;            // degrees — ramping up
    const tau_current = tau_max * t;            // MPa

    // Live readings
    document.getElementById('tors_readings').innerHTML = `
      <div class="reading-row"><span>Applied Torque</span><span class="reading-val">${T_current.toFixed(1)} N·m</span></div>
      <div class="reading-row"><span>Angle of Twist</span><span class="reading-val">${phi_current.toFixed(2)}°</span></div>
      <div class="reading-row"><span>Shear Stress τ</span><span class="reading-val">${tau_current.toFixed(1)} MPa</span></div>
    `;

    drawTorsionTestSim(phi_current);
    step++;
    torsionTestFrame = setTimeout(tick, 60);
  }
  tick();
}

function resetTorsionTest() {
  clearTimeout(torsionTestFrame);
  torsionTestRunning = false;
  const btn = document.querySelector('[onclick="runTorsionTest()"]');
  if (btn) btn.disabled = false;
  document.getElementById('tors_readings').innerHTML = '<div class="placeholder-state"><p>Press Apply Torque to animate</p></div>';
  drawTorsionTestSim(0);
}

function updateDeflExp() {
  const P        = parseFloat(document.getElementById('deflExpLoadSlider').value);
  const L        = parseFloat(document.getElementById('deflExp_L').value);       // mm
  const b        = parseFloat(document.getElementById('deflExp_b').value);       // mm
  const d        = parseFloat(document.getElementById('deflExp_d').value);       // mm
  const typeText = document.getElementById('deflExp_type').value;                // 'Simply Supported' or 'Cantilever'
  const isCant   = typeText === 'Cantilever';
  const E        = 200000;                    // MPa — steel
  const I        = b * d**3 / 12;            // mm⁴

  // Correct formula for each type
  let delta, formulaStr;
  if (isCant) {
    delta      = (P * L**3) / (3 * E * I);   // δ = PL³/3EI — cantilever end load
    formulaStr = 'δ = PL³ / 3EI';
  } else {
    delta      = (P * L**3) / (48 * E * I);  // δ = PL³/48EI — SS central load
    formulaStr = 'δ = PL³ / 48EI';
  }

  document.getElementById('deflExpLoad').textContent = P;
  document.getElementById('deflExp_readings').innerHTML = `
    <div class="reading-row"><span>Beam Type</span><span class="reading-val">${isCant ? 'Cantilever' : 'Simply Supported'}</span></div>
    <div class="reading-row"><span>Load (P)</span><span class="reading-val">${P} N</span></div>
    <div class="reading-row"><span>Span / Length (L)</span><span class="reading-val">${L} mm</span></div>
    <div class="reading-row"><span>Section (b × d)</span><span class="reading-val">${b} × ${d} mm</span></div>
    <div class="reading-row"><span>I = bd³/12</span><span class="reading-val">${I.toFixed(2)} mm⁴</span></div>
    <div class="reading-row"><span>E (Steel)</span><span class="reading-val">200,000 MPa</span></div>
    <div class="reading-row"><span>Formula</span><span class="reading-val">${formulaStr}</span></div>
    <div class="reading-row"><span>Deflection (δ)</span><span class="reading-val">${delta.toFixed(4)} mm</span></div>
    <div class="reading-row highlight"><span>Dial Gauge Reading</span><span class="reading-val">${(delta * 100).toFixed(1)} × 0.01 mm</span></div>
  `;
  // Store last readings for report
  window._deflExpReadings = window._deflExpReadings || [];
  if (P > 0 && delta > 0) {
    window._deflExpReadings.push({ P, L, b, d, I, delta, formula: formulaStr, type: typeText });
    if (window._deflExpReadings.length > 12) window._deflExpReadings.shift();
  }
  drawDeflExp(P, delta, L, isCant);
}

function drawDeflExp(P, delta, L_mm, isCant) {
  const canvas = document.getElementById('deflExpCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W      = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const beamThk = 8;
  const nPts    = 100;

  // Canvas layout constants
  const margin  = 36;
  const bLen    = W - 2 * margin;
  const bY      = H * 0.32;    // undeflected beam Y — upper half of canvas
  const benchY  = bY + H * 0.44;
  const amp     = Math.min(delta * 2.4, H * 0.26);   // visual deflection (capped)

  // ── Bench / table surface ─────────────────────────────────────────────
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(0, benchY, W, H - benchY);
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(0, benchY, W, 6);
  ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, benchY + 6); ctx.lineTo(W, benchY + 6); ctx.stroke();

  if (isCant) {
    // ════════════════════════════════════════════════════
    // CANTILEVER: Fixed wall on LEFT, free end on RIGHT
    // Beam horizontal, deflects downward at free end
    // Shape: y(x) = (P·x²/(6EI))·(3L − x)  → normalised = x²(3−x)/2 (0..1)
    // ════════════════════════════════════════════════════

    const wallX = margin;
    const freeX = W - margin;

    // ── Fixed wall ───────────────────────────────────────────────────
    const wallW = 22, wallH = 80;
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(wallX - wallW, bY - wallH/2, wallW, wallH);
    ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(wallX - wallW, bY - wallH/2, wallW, wallH);
    // Hatch marks on wall
    ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 1;
    for (let hy = bY - wallH/2 + 6; hy < bY + wallH/2; hy += 10) {
      ctx.beginPath(); ctx.moveTo(wallX - wallW, hy); ctx.lineTo(wallX - wallW - 8, hy + 8); ctx.stroke();
    }
    // Fixed end support highlight
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(wallX - 3, bY - wallH/3, 3, wallH * 0.67);

    // ── Undeflected beam (dashed) ─────────────────────────────────────
    ctx.setLineDash([5, 9]); ctx.strokeStyle = 'rgba(136,153,187,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wallX, bY); ctx.lineTo(freeX, bY); ctx.stroke();
    ctx.setLineDash([]);

    // ── Deflected cantilever beam ─────────────────────────────────────
    // y(t) = amp * t²*(3−t)/2  where t goes 0→1 from fixed→free end
    ctx.save();
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = beamThk; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const t  = i / nPts;
      const xc = wallX + bLen * t;
      const yc = bY + amp * (t * t * (3 - t) / 2);   // cubic cantilever shape, 0 at fixed, max at free
      i === 0 ? ctx.moveTo(xc, yc) : ctx.lineTo(xc, yc);
    }
    ctx.stroke(); ctx.restore();

    // Beam highlight
    ctx.strokeStyle = 'rgba(180,240,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const t  = i / nPts;
      const xc = wallX + bLen * t;
      const yc = bY + amp * (t * t * (3 - t) / 2) - beamThk / 2 + 1;
      i === 0 ? ctx.moveTo(xc, yc) : ctx.lineTo(xc, yc);
    }
    ctx.stroke();

    // ── Free end deflection ───────────────────────────────────────────
    const freeYDef = bY + amp;      // full deflection at free end

    // ── Load arrow — downward at FREE end (tip on top of deflected beam)
    if (P > 0) {
      const tipY   = freeYDef - beamThk / 2;
      const startY = tipY - 46;
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(freeX, startY); ctx.lineTo(freeX, tipY - 2); ctx.stroke();
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.moveTo(freeX, tipY + 2); ctx.lineTo(freeX - 9, tipY - 12); ctx.lineTo(freeX + 9, tipY - 12);
      ctx.closePath(); ctx.fill();
      // Label box
      ctx.fillStyle = 'rgba(255,107,53,0.15)';
      ctx.fillRect(freeX - 34, startY - 20, 68, 18);
      ctx.strokeStyle = 'rgba(255,107,53,0.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(freeX - 34, startY - 20, 68, 18);
      ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
      ctx.fillText(`P = ${P} N`, freeX, startY - 6);

      // Weight disc at free end
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(freeX, freeYDef + beamThk/2); ctx.lineTo(freeX, freeYDef + beamThk/2 + 12); ctx.stroke();
      const wGrad = ctx.createRadialGradient(freeX, freeYDef + beamThk/2 + 22, 2, freeX, freeYDef + beamThk/2 + 22, 16);
      wGrad.addColorStop(0, '#ff8c50'); wGrad.addColorStop(1, '#cc3300');
      ctx.fillStyle = wGrad;
      ctx.beginPath(); ctx.ellipse(freeX, freeYDef + beamThk/2 + 22, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 1; ctx.stroke();
    }

    // ── Reaction: fixed-end moment arrow ─────────────────────────────
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(wallX + 2, bY, 22, Math.PI * 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.fillStyle = '#00ff9d'; ctx.font = '9px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText('M_fix', wallX + 8, bY - 26);

    // ── Deflection annotation at free end ─────────────────────────────
    if (amp > 4) {
      const annX = freeX + 14;
      ctx.strokeStyle = 'rgba(255,211,42,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.moveTo(annX, bY); ctx.lineTo(annX, freeYDef); ctx.stroke();
      ctx.setLineDash([]);
      [[bY, 0],[freeYDef, 0]].forEach(([y]) => {
        ctx.strokeStyle = 'rgba(255,211,42,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(annX - 4, y); ctx.lineTo(annX + 4, y); ctx.stroke();
      });
      ctx.fillStyle = '#ffd32a'; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'left';
      ctx.fillText(`δ=${delta.toFixed(3)}mm`, annX + 5, bY + amp * 0.5 + 3);
    }

    // ── Dial gauge at free end (measuring max deflection) ────────────
    const gaugeX = freeX - 20, gaugeY = bY - 52;
    ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gaugeX, gaugeY + 20); ctx.lineTo(gaugeX, freeYDef - beamThk/2); ctx.stroke();
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0a1520';
    ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 14, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.75 + i * (Math.PI * 1.5 / 9);
      ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gaugeX + 10 * Math.cos(a), gaugeY + 10 * Math.sin(a));
      ctx.lineTo(gaugeX + 13 * Math.cos(a), gaugeY + 13 * Math.sin(a)); ctx.stroke();
    }
    const maxD = 10, needA = -Math.PI * 0.75 + Math.min(delta / maxD, 1) * Math.PI * 1.5;
    ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gaugeX, gaugeY);
    ctx.lineTo(gaugeX + 12 * Math.cos(needA), gaugeY + 12 * Math.sin(needA)); ctx.stroke();
    ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 2.5, 0, Math.PI*2);
    ctx.fillStyle = '#ff4757'; ctx.fill();
    ctx.fillStyle = '#00ff9d'; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText('DIAL GAUGE', gaugeX, gaugeY - 25);
    ctx.fillText(`${delta.toFixed(3)} mm`, gaugeX, gaugeY - 14);

    // ── Labels ────────────────────────────────────────────────────────
    ctx.fillStyle = '#8899bb'; ctx.font = 'bold 10px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText('Fixed', wallX - wallW + 2, bY - wallH/2 - 6);
    ctx.textAlign = 'right';
    ctx.fillText('Free', freeX, bY - beamThk - 10);
    ctx.fillStyle = '#8899bb'; ctx.font = '10px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText(`L = ${L_mm} mm`, (wallX + freeX) / 2, H - 6);

  } else {
    // ════════════════════════════════════════════════════
    // SIMPLY SUPPORTED: Knife-edge supports at both ends
    // Load P at midspan — cubic deflection downward
    // ════════════════════════════════════════════════════

    // ── Knife-edge supports ───────────────────────────────────────────
    const drawKnifeEdge = (x) => {
      const tipY  = bY;
      const baseY = benchY - 2;
      ctx.fillStyle = '#3a4a6a'; ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, tipY); ctx.lineTo(x - 14, baseY); ctx.lineTo(x + 14, baseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, tipY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff'; ctx.fill();
      ctx.fillStyle = '#2a3a5a';
      ctx.fillRect(x - 18, baseY, 36, 6); ctx.strokeRect(x - 18, baseY, 36, 6);
    };
    drawKnifeEdge(margin);
    drawKnifeEdge(W - margin);

    // ── Undeflected beam (dashed) ─────────────────────────────────────
    ctx.setLineDash([5, 9]); ctx.strokeStyle = 'rgba(136,153,187,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(margin, bY); ctx.lineTo(W - margin, bY); ctx.stroke();
    ctx.setLineDash([]);

    // ── Deflected beam (downward cubic) ──────────────────────────────
    ctx.save();
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = beamThk; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const t  = i / nPts;
      const xc = margin + bLen * t;
      // Cubic shape: peak=1 at t=0.5, zero at t=0,1
      const shape = t <= 0.5
        ? (t * (3 - 4 * t * t)) / 1.25
        : ((1-t) * (3 - 4*(1-t)*(1-t))) / 1.25;
      const yc = bY + amp * shape;
      i === 0 ? ctx.moveTo(xc, yc) : ctx.lineTo(xc, yc);
    }
    ctx.stroke(); ctx.restore();

    // Beam highlight
    ctx.strokeStyle = 'rgba(180,240,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const t  = i / nPts;
      const xc = margin + bLen * t;
      const shape = t <= 0.5
        ? (t * (3 - 4*t*t)) / 1.25
        : ((1-t) * (3 - 4*(1-t)*(1-t))) / 1.25;
      const yc = bY + amp * shape - beamThk/2 + 1;
      i === 0 ? ctx.moveTo(xc, yc) : ctx.lineTo(xc, yc);
    }
    ctx.stroke();

    // ── Midspan ───────────────────────────────────────────────────────
    const midX    = W / 2;
    const midYDef = bY + amp;

    // ── Load arrow — downward at midspan ──────────────────────────────
    if (P > 0) {
      const tipY   = midYDef - beamThk / 2;
      const startY = tipY - 48;
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(midX, startY); ctx.lineTo(midX, tipY - 2); ctx.stroke();
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.moveTo(midX, tipY + 2); ctx.lineTo(midX - 9, tipY - 12); ctx.lineTo(midX + 9, tipY - 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,107,53,0.15)';
      ctx.fillRect(midX - 32, startY - 20, 64, 18);
      ctx.strokeStyle = 'rgba(255,107,53,0.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(midX - 32, startY - 20, 64, 18);
      ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
      ctx.fillText(`P = ${P} N`, midX, startY - 6);

      // Weight disc
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(midX, midYDef + beamThk/2); ctx.lineTo(midX, midYDef + beamThk/2 + 12); ctx.stroke();
      const wGrad = ctx.createRadialGradient(midX, midYDef + beamThk/2 + 22, 2, midX, midYDef + beamThk/2 + 22, 16);
      wGrad.addColorStop(0, '#ff8c50'); wGrad.addColorStop(1, '#cc3300');
      ctx.fillStyle = wGrad;
      ctx.beginPath(); ctx.ellipse(midX, midYDef + beamThk/2 + 22, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 1; ctx.stroke();
    }

    // ── Reaction arrows (upward P/2 at both supports) ─────────────────
    [margin, W - margin].forEach(sx => {
      const arrBase = benchY - 8;
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, arrBase + 20); ctx.lineTo(sx, arrBase + 1); ctx.stroke();
      ctx.fillStyle = '#00ff9d';
      ctx.beginPath(); ctx.moveTo(sx, arrBase - 2); ctx.lineTo(sx-6, arrBase+10); ctx.lineTo(sx+6, arrBase+10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#00ff9d'; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
      ctx.fillText('P/2', sx, arrBase + 32);
    });

    // ── Deflection annotation ─────────────────────────────────────────
    if (amp > 4) {
      const annX = W - margin - 16;
      ctx.strokeStyle = 'rgba(255,211,42,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.moveTo(annX, bY); ctx.lineTo(annX, midYDef); ctx.stroke();
      ctx.setLineDash([]);
      [[bY],[midYDef]].forEach(([y]) => {
        ctx.strokeStyle = 'rgba(255,211,42,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(annX - 4, y); ctx.lineTo(annX + 4, y); ctx.stroke();
      });
      ctx.fillStyle = '#ffd32a'; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'right';
      ctx.fillText(`δ=${delta.toFixed(3)}mm`, annX - 6, bY + amp * 0.5 + 3);
    }

    // ── Dial gauge at midspan ─────────────────────────────────────────
    const gX = midX, gY = bY - 52;
    ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gX, gY + 20); ctx.lineTo(gX, midYDef - beamThk/2); ctx.stroke();
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath(); ctx.arc(gX, gY, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0a1520';
    ctx.beginPath(); ctx.arc(gX, gY, 14, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.75 + i * (Math.PI * 1.5 / 9);
      ctx.strokeStyle = '#8899bb'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gX + 10 * Math.cos(a), gY + 10 * Math.sin(a));
      ctx.lineTo(gX + 13 * Math.cos(a), gY + 13 * Math.sin(a)); ctx.stroke();
    }
    const maxD = 10, needA = -Math.PI * 0.75 + Math.min(delta / maxD, 1) * Math.PI * 1.5;
    ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gX, gY); ctx.lineTo(gX + 12 * Math.cos(needA), gY + 12 * Math.sin(needA)); ctx.stroke();
    ctx.beginPath(); ctx.arc(gX, gY, 2.5, 0, Math.PI*2); ctx.fillStyle = '#ff4757'; ctx.fill();
    ctx.fillStyle = '#00ff9d'; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText('DIAL GAUGE', gX, gY - 25);
    ctx.fillText(`${delta.toFixed(3)} mm`, gX, gY - 14);

    // ── Span label ────────────────────────────────────────────────────
    ctx.fillStyle = '#8899bb'; ctx.font = '10px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText(`Span L = ${L_mm} mm`, W / 2, H - 6);
  }
}

// ─── IMPACT TEST — FIXED CHARPY PENDULUM ─────────────────────────────────────
// Pivot is at TOP-LEFT. Arm swings from upper-left (start angle ~140°) 
// sweeping DOWN through the specimen at the bottom-centre, rising to the right.
// angle = degrees measured from the VERTICAL (downward = 0°, left = 90°, right = -90°)

let impactRunning = false, impactAnimId = null;
let impactState = { angle0: 140, afterAngle: 0, mass: 22, phase: 'ready', armLen: 0 };

function drawImpactMachine(angleDeg, impact) {
  const canvas = document.getElementById('impactCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // ── Layout constants ──────────────────────────────────────────────────────
  // Pivot at top-centre of canvas
  const px = W * 0.5, py = 28;
  const armLen = Math.min(W, H) * 0.72;
  impactState.armLen = armLen;

  // Specimen position: bottom-centre (where pendulum passes at 0°)
  const specX = px, specY = py + armLen;

  // ── Machine frame ─────────────────────────────────────────────────────────
  // Vertical column
  ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, specY + 20); ctx.stroke();

  // Left diagonal support leg
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(px, py + armLen * 0.5); ctx.lineTo(px - 40, specY + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, py + armLen * 0.6); ctx.lineTo(px + 40, specY + 20); ctx.stroke();

  // Base
  ctx.fillStyle = '#4a5a7a';
  ctx.fillRect(px - 55, specY + 18, 110, 10);
  ctx.fillRect(px - 70, specY + 26, 140, 6);

  // ── Angle arc indicator ───────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(0,212,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.arc(px, py, armLen, 0, Math.PI); ctx.stroke();
  ctx.setLineDash([]);

  // ── Specimen (notched bar on anvil) ───────────────────────────────────────
  // Anvil supports
  ctx.fillStyle = '#8899bb';
  ctx.fillRect(specX - 30, specY - 10, 12, 14);
  ctx.fillRect(specX + 18, specY - 10, 12, 14);

  // Notched specimen bar (horizontal)
  const notchColor = impact ? '#ff4757' : '#00d4ff';
  ctx.fillStyle = notchColor + '33';
  ctx.strokeStyle = notchColor;
  ctx.lineWidth = 2;
  ctx.fillRect(specX - 30, specY - 18, 60, 10);
  ctx.strokeRect(specX - 30, specY - 18, 60, 10);
  // Notch
  ctx.fillStyle = '#060b18';
  ctx.fillRect(specX - 4, specY - 18, 8, 6);
  ctx.strokeStyle = notchColor; ctx.lineWidth = 1;
  ctx.strokeRect(specX - 4, specY - 18, 8, 6);

  // ── Pendulum arm & hammer ─────────────────────────────────────────────────
  // angle convention: 0° = straight down, +left, so arm angle from vertical
  // Canvas angle from positive-x axis: angleRad = π/2 + angleDeg*(π/180)
  // But pendulum swings LEFT side at start, so map:
  //   angleDeg > 0 → left of vertical → canvas angle = π/2 + angleDeg*(π/180)  
  //   We use: canvasAngle = Math.PI/2 + (angleDeg * Math.PI/180)
  //   At 0° → canvasAngle = π/2 → pointing straight DOWN ✓
  //   At 140° (left) → canvasAngle = π/2 + 140°*π/180 ≈ 4.0 rad → upper-left ✓

  const canvasAngle = Math.PI / 2 + angleDeg * Math.PI / 180;
  const hx = px + armLen * Math.cos(canvasAngle);
  const hy = py + armLen * Math.sin(canvasAngle);

  // Arm shadow / glow
  const armColor = impact ? '#ff4757' : '#7b2fff';
  ctx.save();
  ctx.shadowColor = armColor; ctx.shadowBlur = impact ? 18 : 6;
  ctx.strokeStyle = armColor; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.restore();

  // Hammer head (rectangular, more realistic)
  const perpAngle = canvasAngle + Math.PI / 2;
  const hw = 18, hh = 22;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(canvasAngle);
  const hGrad = ctx.createLinearGradient(-hh/2, -hw/2, hh/2, hw/2);
  hGrad.addColorStop(0, impact ? '#ff8800' : '#9b4fff');
  hGrad.addColorStop(1, impact ? '#ff4757' : '#5500ff');
  ctx.fillStyle = hGrad;
  ctx.strokeStyle = impact ? '#ff6b35' : '#00d4ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = armColor; ctx.shadowBlur = impact ? 25 : 8;
  ctx.fillRect(-hw/2, 0, hw, hh);
  ctx.strokeRect(-hw/2, 0, hw, hh);
  ctx.restore();

  // ── Pivot bearing ─────────────────────────────────────────────────────────
  ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4ff'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#060b18'; ctx.fill();

  // ── Angle arc & label ─────────────────────────────────────────────────────
  if (Math.abs(angleDeg) > 2) {
    const arcR = 50;
    ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1.5; ctx.setLineDash([3,4]);
    ctx.beginPath();
    ctx.arc(px, py, arcR, Math.PI/2, canvasAngle, angleDeg < 0);
    ctx.stroke(); ctx.setLineDash([]);
    const midA = (Math.PI/2 + canvasAngle) / 2;
    ctx.fillStyle = '#ffd32a'; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.abs(angleDeg).toFixed(0)}°`,
      px + (arcR + 18) * Math.cos(midA), py + (arcR + 18) * Math.sin(midA));
  }

  // ── Motion trail ─────────────────────────────────────────────────────────
  ctx.strokeStyle = armColor + '40'; ctx.lineWidth = 2; ctx.setLineDash([2, 6]);
  ctx.beginPath();
  for (let a = -30; a <= 30; a += 5) {
    const ta = Math.PI/2 + a * Math.PI/180;
    const tx = px + armLen * Math.cos(ta), ty = py + armLen * Math.sin(ta);
    a === -30 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
  }
  ctx.stroke(); ctx.setLineDash([]);

  // ── Status label ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#8899bb'; ctx.font = '10px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(impact ? '💥 IMPACT!' : impactState.phase === 'ready' ? 'Ready — click Drop Hammer' :
    impactState.phase === 'swinging' ? 'Swinging...' : 'Test Complete', W/2, H - 6);
}

function runImpactTest() {
  if (impactRunning) return;
  impactRunning = true;
  impactState.phase = 'swinging';
  document.getElementById('impactBtn').disabled = true;

  const mass   = parseFloat(document.getElementById('impact_mass').value);
  const angle0 = parseFloat(document.getElementById('impact_angle').value);
  const g      = 9.81, R = 0.6; // pendulum radius ~0.6m (typical Charpy)
  const h_ini  = R * (1 - Math.cos(angle0 * Math.PI / 180));
  const E_ini  = mass * g * h_ini;

  // Material-based energy absorption (simulated)
  const matKey = document.getElementById('impact_type')?.value || 'Charpy';
  const afterAngle = Math.max(5, angle0 * (0.3 + Math.random() * 0.35)); // rises less than start

  impactState = { angle0, afterAngle, mass, phase: 'swinging', armLen: 0 };

  // Animate: LEFT (angle0) → RIGHT through 0 → LEFT afterAngle (rebound)
  // Phase 1: angle0 → 0 (forward swing): t from 0→0.5
  // Phase 2: 0 → -afterAngle (rebound to right): t from 0.5→0.7  
  // Phase 3: -afterAngle → 0 (settle): t from 0.7→1

  const totalFrames = 60;
  let frame = 0;

  function tick() {
    const t = frame / totalFrames;
    let currentAngle;
    const isImpact = t >= 0.48 && t <= 0.54;

    if (t <= 0.5) {
      // Swing DOWN from start angle to 0 (use easeIn for acceleration)
      const ease = t / 0.5;
      currentAngle = angle0 * (1 - ease * ease);
    } else if (t <= 0.7) {
      // Swing through to right (negative angle = right side)
      const ease = (t - 0.5) / 0.2;
      currentAngle = -afterAngle * ease;
    } else {
      // Settle back toward 0
      const ease = (t - 0.7) / 0.3;
      currentAngle = -afterAngle * (1 - ease * 0.7);
    }

    drawImpactMachine(currentAngle, isImpact);
    frame++;

    if (frame <= totalFrames) {
      impactAnimId = setTimeout(tick, 50);
    } else {
      // Done — compute results
      impactState.phase = 'done';
      const h_fin = R * (1 - Math.cos(afterAngle * Math.PI / 180));
      const E_fin = mass * g * h_fin;
      const E_abs = Math.max(0, E_ini - E_fin);
      const A_notch = 80e-6; // 80 mm² in m²
      const impact_strength = E_abs / A_notch / 1000; // kJ/m²

      document.getElementById('impact_readings').innerHTML = `
        <div class="reading-row"><span>Initial PE = mgh₁</span><span class="reading-val">${E_ini.toFixed(2)} J</span></div>
        <div class="reading-row"><span>Initial Angle (α₁)</span><span class="reading-val">${angle0.toFixed(0)}°</span></div>
        <div class="reading-row"><span>Final Angle (α₂)</span><span class="reading-val">${afterAngle.toFixed(1)}°</span></div>
        <div class="reading-row"><span>Final PE = mgh₂</span><span class="reading-val">${E_fin.toFixed(2)} J</span></div>
        <div class="reading-row"><span>Energy Absorbed (E = mgh₁ − mgh₂)</span><span class="reading-val">${E_abs.toFixed(2)} J</span></div>
        <div class="reading-row highlight"><span>Impact Strength (E/A)</span><span class="reading-val">${impact_strength.toFixed(1)} kJ/m²</span></div>
      `;
      drawImpactMachine(-afterAngle * 0.3, false);
      impactRunning = false;
      document.getElementById('impactBtn').disabled = false;
      // Store for report
      window._impactResults = { E_ini, angle0, afterAngle, E_abs, impact_strength, mass };
    }
  }
  tick();
}

function resetImpact() {
  clearTimeout(impactAnimId);
  impactRunning = false;
  impactState.phase = 'ready';
  window._impactResults = null;
  document.getElementById('impactBtn').disabled = false;
  document.getElementById('impact_readings').innerHTML = '<div class="placeholder-state"><p>Run the test to see results</p></div>';
  const angle0 = parseFloat(document.getElementById('impact_angle').value) || 140;
  drawImpactMachine(angle0, false);
}

function updateBuckExp() {
  const loadPct = parseFloat(document.getElementById('buckExpSlider').value);
  const K = parseFloat(document.getElementById('buckExp_end').value);
  const L = parseFloat(document.getElementById('buckExp_L').value); // mm
  const d = parseFloat(document.getElementById('buckExp_d').value);
  const E = 200000; // MPa steel
  const I = Math.PI * d**4 / 64;
  const A = Math.PI * d**2 / 4;
  const Le = K * L;
  const Pcr_N = Math.PI**2 * E * I / Le**2; // N
  const actualLoad = loadPct / 100 * Pcr_N;
  const k_gyration = Math.sqrt(I / A);
  const lambda = Le / k_gyration;
  const isBuckled = loadPct >= 100;
  const isNear    = loadPct >= 80;

  document.getElementById('buckExpLoad').textContent = actualLoad.toFixed(1) + ' N';
  document.getElementById('buckExp_readings').innerHTML = `
    <div class="reading-row"><span>Critical Load (Pcr)</span><span class="reading-val">${Pcr_N.toFixed(2)} N</span></div>
    <div class="reading-row"><span>Applied Load (P)</span><span class="reading-val">${actualLoad.toFixed(2)} N</span></div>
    <div class="reading-row"><span>Slenderness Ratio (λ)</span><span class="reading-val">${lambda.toFixed(1)}</span></div>
    <div class="reading-row"><span>Load Ratio (P/Pcr)</span><span class="reading-val ${isBuckled?'danger':isNear?'warning':''}">${(loadPct/100).toFixed(2)}</span></div>
    <div class="reading-row highlight"><span>Status</span><span class="reading-val ${isBuckled?'danger':'success'}">${isBuckled?'💥 BUCKLED':'✓ SAFE'}</span></div>
  `;
  drawBuckExpCanvas(loadPct, K);
}

function drawBuckExpCanvas(loadPct, K) {
  const canvas = document.getElementById('buckExpCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const topY = 35, botY = H - 40;
  const colH = botY - topY;
  const isBuckled = loadPct >= 100;
  const isNear    = loadPct >= 80;

  // Column color: green → yellow → red
  const colColor = isBuckled ? '#ff4757' : isNear ? '#ffd32a' : '#00d4ff';

  // Max visual deflection
  const maxDefl = Math.min((loadPct / 100) * 38, 44);

  // ── Load arrow from top ───────────────────────────────────────────────────
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, topY - 24); ctx.lineTo(cx, topY - 2); ctx.stroke();
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx-7, topY-14); ctx.lineTo(cx+7, topY-14); ctx.fill();
  // Load label
  ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 10px Space Mono'; ctx.textAlign = 'center';
  ctx.fillText(`P = ${loadPct.toFixed(0)}% Pcr`, cx, topY - 28);

  // ── End condition symbols ─────────────────────────────────────────────────
  const drawPin = (x, y) => {
    ctx.fillStyle = '#8899bb'; ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-10, y+16); ctx.lineTo(x+10, y+16); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00d4ff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
  };
  const drawFixed = (x, y, dir) => {
    ctx.fillStyle = '#4a5a7a'; ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
    ctx.fillRect(x - 16, y - (dir > 0 ? 0 : 8), 32, 8);
    ctx.strokeRect(x - 16, y - (dir > 0 ? 0 : 8), 32, 8);
    // Hatch marks
    ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i += 6) {
      ctx.beginPath(); ctx.moveTo(x+i, y + (dir > 0 ? 8 : -8)); ctx.lineTo(x+i-5, y + (dir>0?14:-14)); ctx.stroke();
    }
  };

  // Apply end symbols based on K
  const Kval = K;
  if (Kval == 1) {
    // Both pinned — triangles at top and bottom
    drawPin(cx, topY); drawPin(cx, botY);
    // Adjust column to sit between pins
  } else if (Kval == 0.5) {
    // Both fixed
    drawFixed(cx, topY - 2, 1); drawFixed(cx, botY + 2, -1);
  } else if (Kval == 2) {
    // Fixed base, free top
    drawFixed(cx, botY + 2, -1);
    // Free top: small circle
    ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, topY, 5, 0, Math.PI*2); ctx.stroke();
  } else {
    // Fixed-Pinned
    drawFixed(cx, botY + 2, -1); drawPin(cx, topY);
  }

  // ── Column body ───────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = colColor; ctx.shadowBlur = isBuckled ? 20 : 8;
  ctx.strokeStyle = colColor; ctx.lineWidth = 6; ctx.lineCap = 'round';

  ctx.beginPath();
  const nPts = 80;
  for (let i = 0; i <= nPts; i++) {
    const t  = i / nPts;
    const yy = topY + colH * t;
    let xx;
    if (Kval == 2) {
      // Cantilever: fixed base, deflects more at top
      xx = cx + maxDefl * (1 - Math.cos(Math.PI / 2 * t));
    } else if (Kval == 0.5) {
      // Both fixed: S-shape (double curvature)
      xx = cx + maxDefl * Math.sin(2 * Math.PI * t);
    } else {
      // Pinned-pinned / Fixed-pinned: half sine wave
      xx = cx + maxDefl * Math.sin(Math.PI * t);
    }
    i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();

  // ── Column cross-section highlight ───────────────────────────────────────
  // Draw small ellipse at mid-height to show cross section
  if (!isBuckled) {
    const midT = 0.5, midY = topY + colH * midT;
    const midX = cx + maxDefl * Math.sin(Math.PI * midT);
    ctx.strokeStyle = colColor + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(midX, midY, 6, 3, Math.PI/2, 0, Math.PI*2); ctx.stroke();
  }

  // ── Fracture / buckle marker ──────────────────────────────────────────────
  if (isBuckled) {
    const buckY = topY + colH * 0.5;
    const buckX = cx + maxDefl;
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4757';
    ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 12;
    ctx.fillText('💥', buckX + 10, buckY);
    ctx.shadowBlur = 0;
  }

  // ── Status text ───────────────────────────────────────────────────────────
  ctx.fillStyle = colColor; ctx.font = 'bold 11px Space Mono'; ctx.textAlign = 'center';
  ctx.shadowColor = colColor; ctx.shadowBlur = 6;
  ctx.fillText(isBuckled ? 'BUCKLED!' : isNear ? 'NEAR CRITICAL' : 'STABLE', cx, H - 10);
  ctx.shadowBlur = 0;

  // ── Deflection arrow (if deflected) ──────────────────────────────────────
  if (maxDefl > 3) {
    const midY2 = topY + colH * 0.5;
    const midX2 = cx + maxDefl * Math.sin(Math.PI * 0.5);
    ctx.strokeStyle = 'rgba(255,211,42,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(cx, midY2); ctx.lineTo(midX2, midY2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd32a'; ctx.font = '9px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText(`δ = ${maxDefl.toFixed(1)}`, midX2 + 3, midY2 - 3);
  }
}

// ─── QUIZ ENGINE ──────────────────────────────────────────────────────────────
const QUESTIONS = [
  // Stress & Strain
  { topic:'stress', difficulty:'easy', q:'What is the SI unit of stress?', opts:['N/m','N/m² (Pa)','N·m','kg/m²'], ans:1, explain:'Stress = Force/Area = N/m² = Pascal (Pa)' },
  { topic:'stress', difficulty:'easy', q:'Young\'s Modulus is defined as:', opts:['Shear Stress / Shear Strain','Normal Stress / Lateral Strain','Normal Stress / Longitudinal Strain','Shear Force / Area'], ans:2, explain:'E = σ/ε — relates normal stress to longitudinal strain (Hooke\'s Law)' },
  { topic:'stress', difficulty:'medium', q:'A rod of diameter 20 mm carries 31.4 kN. The stress is:', opts:['10 MPa','100 MPa','50 MPa','200 MPa'], ans:1, explain:'A = π×20²/4 = 314 mm², σ = 31400/314 = 100 MPa' },
  { topic:'stress', difficulty:'hard', q:'Poisson\'s ratio for an incompressible material is:', opts:['0','0.25','0.5','1'], ans:2, explain:'For incompressible materials, volume is conserved, which gives ν = 0.5' },
  // Bending
  { topic:'bending', difficulty:'easy', q:'The bending stress is maximum at:', opts:['Neutral axis','Centre of gravity','Extreme fibres','Web'], ans:2, explain:'σ = My/I — bending stress is proportional to distance y from neutral axis, so max at extreme fibres' },
  { topic:'bending', difficulty:'easy', q:'For a simply supported beam with UDL w over span L, max BM is:', opts:['wL²/4','wL²/8','wL/2','wL²/12'], ans:1, explain:'Max BM at centre = wL²/8 for SS beam with UDL' },
  { topic:'bending', difficulty:'medium', q:'Section modulus Z is defined as:', opts:['I/y','I×y','y/I','M/σ'], ans:0, explain:'Z = I/y_max — combines section properties; σ_max = M/Z' },
  { topic:'bending', difficulty:'hard', q:'For a rectangular section b×d, the shear stress at neutral axis is:',  opts:['FQ/Ib = 3F/2A','F/A','2F/A','F/2A'], ans:0, explain:'τ_max at NA = 3F/2A = 1.5 × (F/A) for rectangular sections, where F is the transverse shear force' },
  // Torsion
  { topic:'torsion', difficulty:'easy', q:'The torsion equation T/J = τ/r = Gθ/L is analogous to:', opts:['Shear formula','Bending formula','Buckling formula','Deflection formula'], ans:1, explain:'T/J = τ/r = Gθ/L is the torsion equation, analogous to M/I = σ/y = E/R in bending' },
  { topic:'torsion', difficulty:'medium', q:'A hollow shaft is stronger than a solid shaft of equal weight because:', opts:['More material at center','Material farther from axis — higher J','Less polar MOI','Lighter'], ans:1, explain:'Torsional strength depends on J (polar MOI). A hollow shaft has more material away from center, giving higher J per unit weight' },
  { topic:'torsion', difficulty:'medium', q:'The polar moment of inertia of a solid circular shaft of diameter d is:', opts:['πd⁴/32','πd⁴/64','πd³/16','πd⁴/16'], ans:0, explain:'J = πd⁴/32 for solid circular cross-section' },
  // Buckling
  { topic:'buckling', difficulty:'easy', q:'Euler\'s formula applies to:', opts:['Short columns','Long slender columns','Intermediate columns','All columns'], ans:1, explain:'Euler\'s formula is valid only for long, slender (high slenderness ratio) columns where elastic buckling occurs' },
  { topic:'buckling', difficulty:'medium', q:'The effective length for a column fixed at both ends is:', opts:['L','2L','0.5L','0.7L'], ans:2, explain:'Both ends fixed → Le = 0.5L. This gives the highest critical load among standard end conditions' },
  { topic:'buckling', difficulty:'hard', q:'The slenderness ratio is defined as:', opts:['L/d','Le/k where k = √(I/A)','L/A','d/L'], ans:1, explain:'λ = Le/k, where k (radius of gyration) = √(I/A). Higher λ means more susceptible to buckling' },
  // Mohr's Circle
  { topic:'mohr', difficulty:'easy', q:'The centre of Mohr\'s circle is at:', opts:['(σx, τxy)','(σ_avg, 0) where σ_avg = (σx+σy)/2','(0,0)','(τmax, 0)'], ans:1, explain:'Centre of Mohr\'s circle is always on the σ-axis at σ_avg = (σx+σy)/2' },
  { topic:'mohr', difficulty:'medium', q:'Principal planes are planes of:', opts:['Maximum shear stress','Zero normal stress','Zero shear stress','Maximum strain'], ans:2, explain:'On principal planes, shear stress is zero and normal stress is maximum (principal stresses)' },
  { topic:'mohr', difficulty:'hard', q:'Maximum shear stress equals the _____ of Mohr\'s circle:', opts:['diameter','radius','circumference','centre'], ans:1, explain:'τ_max = radius R = √[(σx-σy)²/4 + τxy²]' },
];

let quizState = { questions:[], current:0, score:0, answers:[], timer:null, timeLeft:120 };

function startQuiz() {
  const topic = document.getElementById('quiz_topic').value;
  const difficulty = document.getElementById('quiz_difficulty').value;
  const count = parseInt(document.getElementById('quiz_count').value);

  let pool = QUESTIONS.filter(q =>
    (topic === 'all' || q.topic === topic) &&
    (difficulty === 'easy' ? q.difficulty === 'easy' : difficulty === 'medium' ? q.difficulty !== 'hard' : true)
  );

  // Shuffle
  pool = pool.sort(() => Math.random() - 0.5).slice(0, count);
  if (pool.length === 0) { alert('No questions available for selected filters.'); return; }

  quizState = { questions: pool, current: 0, score: 0, answers: [], timer: null, timeLeft: 120 };

  document.getElementById('quiz_setup').style.display = 'none';
  document.getElementById('quiz_active').style.display = 'block';
  document.getElementById('quiz_results').style.display = 'none';
  document.getElementById('q_total').textContent = pool.length;

  startTimer();
  showQuestion();
  trackEvent('quiz_start', topic, { count });
}

function showQuestion() {
  const q = quizState.questions[quizState.current];
  document.getElementById('q_current').textContent = quizState.current + 1;
  document.getElementById('q_score').textContent = quizState.score;
  document.getElementById('quiz_progress_bar').style.width =
    ((quizState.current / quizState.questions.length) * 100) + '%';
  document.getElementById('nextBtn').style.display = 'none';

  document.getElementById('question_display').innerHTML = `
    <p class="question-text">${q.q}</p>
    <div class="options-grid">
      ${q.opts.map((opt, i) => `
        <button class="option-btn" onclick="selectAnswer(${i})" id="opt_${i}">
          <strong>${String.fromCharCode(65 + i)}.</strong> ${opt}
        </button>
      `).join('')}
    </div>
  `;
}

function selectAnswer(selected) {
  const q = quizState.questions[quizState.current];
  const correct = q.ans;
  quizState.answers.push({ q: q.q, selected, correct: correct, explain: q.explain });

  document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
  document.getElementById(`opt_${correct}`).classList.add('correct');
  if (selected !== correct) document.getElementById(`opt_${selected}`).classList.add('wrong');
  else quizState.score++;

  // Show explanation
  const explainDiv = document.createElement('div');
  explainDiv.style.cssText = `margin-top:12px;padding:10px 14px;background:rgba(0,255,157,0.05);border:1px solid rgba(0,255,157,0.2);border-radius:8px;font-size:0.82rem;color:#8899bb;font-family:Space Mono`;
  explainDiv.innerHTML = `<strong style="color:#00ff9d">Explanation:</strong> ${q.explain}`;
  document.getElementById('question_display').appendChild(explainDiv);

  document.getElementById('q_score').textContent = quizState.score;
  document.getElementById('nextBtn').style.display = 'block';
}

function nextQuestion() {
  quizState.current++;
  if (quizState.current >= quizState.questions.length) { endQuiz(); return; }
  showQuestion();
}

function skipQuestion() {
  quizState.answers.push({ q: quizState.questions[quizState.current].q, selected: -1, correct: quizState.questions[quizState.current].ans, skipped: true });
  nextQuestion();
}

function endQuiz() {
  clearInterval(quizState.timer);
  document.getElementById('quiz_active').style.display = 'none';
  document.getElementById('quiz_results').style.display = 'block';

  const total = quizState.questions.length;
  const pct = Math.round((quizState.score / total) * 100);
  document.getElementById('results_pct').textContent = pct + '%';
  document.getElementById('results_title').textContent = pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good Job!' : '📚 Keep Practicing!';
  document.getElementById('results_subtitle').textContent = `You scored ${quizState.score} / ${total} questions correctly`;

  let breakdown = quizState.answers.map((a, i) => `
    <div class="result-row">
      <span>Q${i+1}: ${a.q.substring(0,40)}...</span>
      <span class="val ${a.selected === a.correct ? 'success' : 'danger'}">${a.selected === a.correct ? '✓' : a.skipped ? '—' : '✗'}</span>
    </div>
  `).join('');
  document.getElementById('results_breakdown').innerHTML = `<div style="margin-top:16px">${breakdown}</div>`;

  if (pct >= 80) awardBadge('quiz_master');
  if (pct === 100) awardBadge('perfect_score');
  trackEvent('quiz_complete', '', { score: quizState.score, total, pct });
}

function resetQuiz() {
  clearInterval(quizState.timer);
  document.getElementById('quiz_setup').style.display = 'block';
  document.getElementById('quiz_active').style.display = 'none';
  document.getElementById('quiz_results').style.display = 'none';
}

function startTimer() {
  quizState.timeLeft = 60 * parseInt(document.getElementById('quiz_count').value);
  const el = document.getElementById('quiz_timer');
  quizState.timer = setInterval(() => {
    quizState.timeLeft--;
    const m = Math.floor(quizState.timeLeft / 60);
    const s = quizState.timeLeft % 60;
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (quizState.timeLeft <= 0) { clearInterval(quizState.timer); endQuiz(); }
  }, 1000);
}

// ─── FORMULA EXPLORER ────────────────────────────────────────────────────────
const FORMULAS = [
  // ── STRESS & STRAIN ───────────────────────────────────────────────────────
  { topic:'stress', name:'Normal Stress', expr:'σ = F / A',
    desc:'Normal stress is the internal force per unit area acting perpendicular to the cross-section. Tensile stress is positive (+), compressive stress is negative (−).',
    units:'F: N | A: mm² | σ: MPa (N/mm²)', app:'Tie rods, columns, bolts, structural members under axial load' },

  { topic:'stress', name:'Shear Stress (Direct)', expr:'τ = F / A',
    desc:'Average shear stress due to direct shear force F acting on shear area A. Actual distribution over the section is non-uniform — this gives the average value.',
    units:'F: N | A: mm² | τ: MPa', app:'Rivets, welds, pins, keys, shear bolts' },

  { topic:'stress', name:"Hooke's Law (Normal)", expr:'σ = E · ε',
    desc:"Hooke's Law states that stress is proportional to strain within the elastic limit. The constant of proportionality E is Young's Modulus.",
    units:"E: GPa | ε: dimensionless | σ: MPa", app:'All elastic engineering materials below yield point' },

  { topic:'stress', name:"Young's Modulus", expr:'E = σ / ε',
    desc:"Ratio of normal stress to longitudinal strain in the elastic range. A material-specific constant indicating stiffness. Steel ≈ 200 GPa, Aluminium ≈ 70 GPa.",
    units:'σ: MPa | ε: dimensionless | E: GPa', app:'Predicting elastic deformation of structural members' },

  { topic:'stress', name:"Poisson's Ratio", expr:'ν = −ε_lat / ε_long',
    desc:'Ratio of lateral strain to longitudinal strain. Negative sign because lateral strain is opposite in sign to longitudinal strain. Typical range: 0.25 to 0.35.',
    units:'Dimensionless | Steel: ν ≈ 0.3 | Aluminium: ν ≈ 0.33', app:'Triaxial stress analysis, pressure vessels, thick cylinders' },

  { topic:'stress', name:'Longitudinal Deformation', expr:'δ = PL / AE',
    desc:'Axial deformation of a bar under axial force P. Derived from σ = P/A and ε = δ/L combined with E = σ/ε.',
    units:'P: N | L: mm | A: mm² | E: MPa | δ: mm', app:'Design of tension rods, bolts, tie bars' },

  { topic:'stress', name:'Volumetric Strain', expr:'ε_v = σ (1 − 2ν) / E',
    desc:'Volumetric strain (dilatation) = change in volume per unit original volume under hydrostatic (equal triaxial) stress.',
    units:'σ: MPa | ν: dimensionless | E: MPa | ε_v: dimensionless', app:'Soil mechanics, rubber seals, nearly incompressible materials' },

  { topic:'stress', name:'Factor of Safety', expr:'FOS = σ_yield / σ_working',
    desc:'Ratio of material strength to the actual working stress. Accounts for uncertainties in loading, material, and manufacturing.',
    units:'Dimensionless | Typical values: 1.5 to 4 depending on application', app:'All structural and machine design — fundamental design criterion' },

  // ── BENDING ───────────────────────────────────────────────────────────────
  { topic:'bending', name:'Flexure Formula (Bending Equation)', expr:'M / I = σ / y = E / R',
    desc:'The fundamental bending equation. Links bending moment M, second moment of area I, bending stress σ, distance y from neutral axis, Young\'s Modulus E, and radius of curvature R.',
    units:'M: N·mm | I: mm⁴ | σ: MPa | y: mm | E: MPa | R: mm', app:'Beams, shafts, brackets, machine frames — universal in structural analysis' },

  { topic:'bending', name:'Bending Stress', expr:'σ = M · y / I',
    desc:'Bending stress at any fibre at distance y from the neutral axis. Maximum at extreme fibres (y = y_max). Compressive above NA, tensile below NA (for sagging moment).',
    units:'M: N·mm | y: mm | I: mm⁴ | σ: MPa', app:'Design of beams, checking bending stress at critical sections' },

  { topic:'bending', name:'Section Modulus', expr:'Z = I / y_max',
    desc:'Section modulus Z combines I and y_max into one section property. Higher Z means lower bending stress for same moment. σ_max = M/Z.',
    units:'I: mm⁴ | y_max: mm | Z: mm³', app:'Beam design optimisation — maximise Z to minimise stress' },

  { topic:'bending', name:'2nd Moment of Area — Rectangle', expr:'I = b · d³ / 12',
    desc:'Second moment of area (moment of inertia) of a solid rectangular section about its centroidal axis. d is the dimension parallel to bending, b is width.',
    units:'b: mm | d: mm | I: mm⁴', app:'Rolled steel sections, timber beams, rectangular machine components' },

  { topic:'bending', name:'2nd Moment of Area — Solid Circle', expr:'I = π · d⁴ / 64',
    desc:'Second moment of area of a solid circular cross-section. Used for round shafts, rods, and pins under bending.',
    units:'d: mm | I: mm⁴', app:'Round shafts, pistons, circular cross-section beams' },

  { topic:'bending', name:'Shear Stress in Beams (General)', expr:'τ = F · Q / (I · b)',
    desc:'Shear stress at any horizontal plane in a beam. F is the transverse shear force at that section, Q is the first moment of area of the section above the plane about the neutral axis, b is the width at that plane, I is the second moment of area.',
    units:'F: N | Q: mm³ | I: mm⁴ | b: mm | τ: MPa', app:'Web design of I-sections, shear flow analysis, composite beams' },

  { topic:'bending', name:'Max Shear Stress — Rectangle', expr:'τ_max = 1.5 · F / A',
    desc:'Maximum shear stress in a rectangular section occurs at the neutral axis. It is 1.5 times the average shear stress F/A. The distribution is parabolic — zero at extreme fibres, maximum at the neutral axis.',
    units:'F: N | A: mm² | τ_max: MPa', app:'Rectangular beams, timber sections — check shear at support' },

  { topic:'bending', name:'Deflection — SS Beam, Central Load', expr:'δ_max = P · L³ / (48 · E · I)',
    desc:'Maximum deflection at midspan of a simply supported beam carrying a central point load P.',
    units:'P: N | L: mm | E: MPa | I: mm⁴ | δ: mm', app:'Floor beams, simply supported machine components' },

  { topic:'bending', name:'Deflection — Cantilever, End Load', expr:'δ_max = P · L³ / (3 · E · I)',
    desc:'Maximum deflection at the free end of a cantilever beam carrying a point load P at the free end.',
    units:'P: N | L: mm | E: MPa | I: mm⁴ | δ: mm', app:'Balconies, cantilever brackets, overhanging beams' },

  { topic:'bending', name:'Deflection — SS Beam, UDL', expr:'δ_max = 5 · w · L⁴ / (384 · E · I)',
    desc:'Maximum deflection at midspan of a simply supported beam carrying a uniformly distributed load w per unit length.',
    units:'w: N/mm | L: mm | E: MPa | I: mm⁴ | δ: mm', app:'Floor slabs, bridge decks, industrial platforms' },

  { topic:'bending', name:'Deflection — Cantilever, UDL', expr:'δ_max = w · L⁴ / (8 · E · I)',
    desc:'Maximum deflection at the free end of a cantilever beam under uniformly distributed load w.',
    units:'w: N/mm | L: mm | E: MPa | I: mm⁴ | δ: mm', app:'Retaining walls, cantilever slabs, overhanging roof panels' },

  // ── TORSION ───────────────────────────────────────────────────────────────
  { topic:'torsion', name:'Torsion Equation', expr:'T / J = τ / r = G · θ / L',
    desc:'The fundamental torsion equation (Coulomb\'s Torsion Theory). Links torque T, polar moment of inertia J, shear stress τ, radius r, shear modulus G, angle of twist θ, and length L.',
    units:'T: N·mm | J: mm⁴ | τ: MPa | r: mm | G: MPa | θ: rad | L: mm', app:'Transmission shafts, drive axles, springs, propeller shafts' },

  { topic:'torsion', name:'Shear Stress — Solid Shaft', expr:'τ_max = 16 · T / (π · d³)',
    desc:'Maximum shear stress at the surface of a solid circular shaft of diameter d under torque T. Occurs at the outermost radius.',
    units:'T: N·mm | d: mm | τ: MPa', app:'Motor shafts, machine spindles, gear shafts' },

  { topic:'torsion', name:'Polar MOI — Solid Circular Shaft', expr:'J = π · d⁴ / 32',
    desc:'Polar moment of inertia of a solid circular cross-section. Governs torsional stiffness. Larger J → lower shear stress and less twist for same torque.',
    units:'d: mm | J: mm⁴', app:'Solid transmission shafts, axles, bolts' },

  { topic:'torsion', name:'Polar MOI — Hollow Circular Shaft', expr:'J = π (D⁴ − d⁴) / 32',
    desc:'Polar moment of inertia of a hollow circular shaft. Hollow shafts are more efficient — same J with less material weight.',
    units:'D: outer mm | d: inner mm | J: mm⁴', app:'Automotive prop shafts, aircraft control rods, bicycle frames' },

  { topic:'torsion', name:'Angle of Twist', expr:'θ = T · L / (G · J)',
    desc:'Angle of twist (in radians) of a shaft under torque T over gauge length L. Increases with torque and length, decreases with G and J.',
    units:'T: N·mm | L: mm | G: MPa | J: mm⁴ | θ: rad', app:'Torsion test, spring design, flexible couplings' },

  { topic:'torsion', name:'Power–Torque Relationship', expr:'T = (60 · P) / (2π · N)',
    desc:'Converts power P in Watts and speed N in rpm to torque T in N·m. Essential first step in shaft design from machine specification.',
    units:'P: W | N: rpm | T: N·m (multiply by 1000 for N·mm)', app:'Electric motor shafts, gearboxes, pumps, compressors' },

  { topic:'torsion', name:'ASME Shaft Design — Equivalent Twisting Moment', expr:'T_e = √[(K_b · M)² + (K_t · T)²]',
    desc:'Equivalent twisting moment for shaft design under combined bending and torsion. K_b and K_t are shock and fatigue factors for bending and torsion respectively.',
    units:'M, T: N·mm | K_b, K_t: dimensionless | T_e: N·mm', app:'Motor shafts, machine drive shafts under shock loading (ASME code)' },

  // ── BUCKLING ──────────────────────────────────────────────────────────────
  { topic:'buckling', name:"Euler's Critical Load", expr:'P_cr = π² · E · I / (K · L)²',
    desc:'Critical axial compressive load at which an ideal slender column suddenly becomes unstable (buckles). Valid only for long, slender columns (λ ≥ λ_c).',
    units:'E: MPa | I: mm⁴ | K: end factor | L: mm | P_cr: N', app:'Building columns, struts, machine frames, buckling of thin plates' },

  { topic:'buckling', name:'Effective Length', expr:'L_e = K · L',
    desc:'Effective length accounts for end conditions. K = 1.0 (both pinned), 0.5 (both fixed), 2.0 (fixed-free), 0.7 (fixed-pinned). Lower K → higher critical load.',
    units:'K: dimensionless | L: mm | L_e: mm', app:'Column classification, structural design codes (IS 800)' },

  { topic:'buckling', name:'Radius of Gyration', expr:'k = √(I / A)',
    desc:'Radius of gyration k is a section property that measures the distribution of area about the centroid. Higher k → more resistance to buckling.',
    units:'I: mm⁴ | A: mm² | k: mm', app:'Slenderness ratio calculation, column selection' },

  { topic:'buckling', name:'Slenderness Ratio', expr:'λ = L_e / k',
    desc:'Slenderness ratio λ governs buckling behaviour. λ < λ_c → short/intermediate column (crushing or Rankine); λ ≥ λ_c → long column (Euler formula applies).',
    units:'L_e: mm | k: mm | λ: dimensionless | λ_c = π√(E/σ_y)', app:'Column classification — decides which design formula to use' },

  { topic:'buckling', name:"Euler's Critical Stress", expr:'σ_cr = π² · E / λ²',
    desc:'Critical compressive stress at buckling expressed in terms of slenderness ratio λ. Universal formula — independent of cross-section shape. Decreases as λ increases.',
    units:'E: MPa | λ: dimensionless | σ_cr: MPa', app:'Design charts, column strength curves (IS code column curves)' },

  // ── MOHR'S CIRCLE ─────────────────────────────────────────────────────────
  { topic:'mohr', name:"Centre of Mohr's Circle", expr:'C = (σ_x + σ_y) / 2',
    desc:"Centre of Mohr's circle lies on the σ-axis (zero shear stress) at the average of the two normal stresses. Also equals the hydrostatic (average) normal stress.",
    units:'σ_x, σ_y: MPa | C: MPa', app:"Stress analysis, Mohr's circle construction starting point" },

  { topic:'mohr', name:"Radius of Mohr's Circle", expr:'R = √[ ((σ_x − σ_y)/2)² + τ_xy² ]',
    desc:"Radius of Mohr's circle equals the maximum in-plane shear stress. Also used to find principal stresses as C ± R.",
    units:'σ_x, σ_y, τ_xy: MPa | R: MPa', app:'Finding principal stresses, maximum shear stress at a point' },

  { topic:'mohr', name:'Principal Stresses', expr:'σ₁, σ₂ = C ± R',
    desc:'Maximum (σ₁) and minimum (σ₂) normal stresses at a point. On principal planes, shear stress is zero. σ₁ + σ₂ = σ_x + σ_y (invariant).',
    units:'C, R: MPa | σ₁, σ₂: MPa', app:'Failure analysis, pressure vessel design, principal stress trajectories' },

  { topic:'mohr', name:'Maximum Shear Stress (In-Plane)', expr:'τ_max = R = (σ₁ − σ₂) / 2',
    desc:'Maximum shear stress at the point equals the radius of Mohr\'s circle. Occurs on planes rotated 45° from the principal planes.',
    units:'σ₁, σ₂: MPa | τ_max: MPa', app:'Tresca yield criterion, design of ductile materials (τ_max ≤ τ_allow)' },

  { topic:'mohr', name:'Principal Plane Angle', expr:'tan(2θ_p) = 2τ_xy / (σ_x − σ_y)',
    desc:'Angle θ_p of the principal plane (measured from x-face to principal plane). Two solutions 90° apart for σ₁ and σ₂ planes.',
    units:'τ_xy, σ_x, σ_y: MPa | θ_p: degrees', app:'Orientation of cracks in brittle materials, principal stress directions' },

  { topic:'mohr', name:'Stress Transformation — Normal Stress', expr:"σ_x' = C + (σ_x−σ_y)/2 · cos2θ + τ_xy · sin2θ",
    desc:'Normal stress on a plane inclined at angle θ from the x-axis. Derived by rotating the stress element by θ.',
    units:"σ_x, σ_y, τ_xy: MPa | θ: degrees | σ_x': MPa", app:'Finding stresses on inclined sections, oblique planes in structures' },

  { topic:'mohr', name:'Stress Transformation — Shear Stress', expr:"τ_x'y' = −(σ_x−σ_y)/2 · sin2θ + τ_xy · cos2θ",
    desc:'Shear stress on the rotated x-face at angle θ. Zero when θ = θ_p (principal planes). Maximum when θ = θ_p + 45°.',
    units:"σ_x, σ_y, τ_xy: MPa | θ: degrees | τ_x'y': MPa", app:'Combined loading analysis, failure on inclined planes' },
];

let filteredFormulas = [...FORMULAS];

function initFormulas() {
  renderFormulas(FORMULAS);
}

function renderFormulas(list) {
  const grid = document.getElementById('formulaGrid');
  grid.innerHTML = list.map(f => `
    <div class="formula-card" data-topic="${f.topic}">
      <div class="formula-tag">${f.topic}</div>
      <div class="formula-name">${f.name}</div>
      <div class="formula-expr">${f.expr}</div>
      <div class="formula-desc">${f.desc}</div>
      <div class="formula-units"><strong>Units:</strong> ${f.units}</div>
      <div class="formula-units" style="margin-top:4px"><strong>Application:</strong> ${f.app}</div>
    </div>
  `).join('');
}

function filterFormulas(topic, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const search = document.getElementById('formulaSearch').value.toLowerCase();
  const list = FORMULAS.filter(f =>
    (topic === 'all' || f.topic === topic) &&
    (!search || f.name.toLowerCase().includes(search) || f.expr.toLowerCase().includes(search) || f.desc.toLowerCase().includes(search))
  );
  renderFormulas(list);
}

function searchFormulas() {
  const search = document.getElementById('formulaSearch').value.toLowerCase();
  const activeTopic = document.querySelector('.filter-btn.active')?.dataset.topic || 'all';
  const list = FORMULAS.filter(f =>
    (activeTopic === 'all' || f.topic === activeTopic) &&
    (!search || f.name.toLowerCase().includes(search) || f.expr.toLowerCase().includes(search) || f.desc.toLowerCase().includes(search))
  );
  renderFormulas(list);
}

// ─── NUMERICAL PRACTICE ───────────────────────────────────────────────────────
function generateProblem() {
  const topic = document.getElementById('num_topic').value;
  const difficulty = document.getElementById('num_difficulty').value;
  const container = document.getElementById('practice_problem');

  const generators = {
    stress:    generateStressProblem,
    bending:   generateBendingProblem,
    torsion:   generateTorsionProblem,
    buckling:  generateBucklingProblem,
    mohr:      generateMohrProblem,
  };

  const prob = generators[topic](difficulty);
  container.innerHTML = `
    <h3 class="card-title"><i class="fas fa-question-circle"></i> ${prob.title}</h3>
    <div class="problem-statement">${prob.statement}</div>
    <div class="given-values">
      ${prob.given.map(g => `<div class="given-item"><span>${g.label}</span><span>${g.value}</span></div>`).join('')}
    </div>
    <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px"><strong>Find:</strong> ${prob.find}</p>
    <button class="hint-btn" onclick="showHint(this, '${encodeURIComponent(prob.hint)}')">💡 Show Hint</button>
    <button class="show-solution-btn" onclick="showSolution(this, ${JSON.stringify(prob.steps).replace(/"/g, '&quot;')})">👁 Show Full Solution</button>
  `;
  trackEvent('problem_generated', topic, { difficulty });
}

function showHint(btn, hint) {
  const hintDiv = document.createElement('div');
  hintDiv.className = 'hint-box';
  hintDiv.textContent = decodeURIComponent(hint);
  btn.parentNode.insertBefore(hintDiv, btn.nextSibling);
  btn.style.display = 'none';
}

function showSolution(btn, steps) {
  const solDiv = document.createElement('div');
  solDiv.className = 'steps-container';
  solDiv.innerHTML = steps.map((s, i) => `
    <div class="step-item" style="animation-delay:${i*0.1}s">
      <div class="step-label">Step ${i+1}</div>
      <div class="step-formula">${s.formula}</div>
      <div class="step-value">= ${s.value}</div>
    </div>
  `).join('');
  btn.parentNode.insertBefore(solDiv, btn);
  btn.style.display = 'none';
}

function rnd(min, max) { return +(Math.random() * (max - min) + min).toFixed(2); }
function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateStressProblem(diff) {
  const F = rint(10, 200) * 1000; // N
  const d = rint(10, 60);
  const L = rint(100, 500);
  const E = 200;
  const A = Math.PI * d * d / 4;
  const sigma = F / A;
  const epsilon = sigma / (E * 1000);
  const delta = epsilon * L;
  return {
    title: 'Stress & Deformation Problem',
    statement: `A steel rod of diameter <strong>${d} mm</strong> and length <strong>${L} mm</strong> is subjected to an axial tensile force of <strong>${(F/1000).toFixed(0)} kN</strong>. Young's Modulus E = ${E} GPa.`,
    given: [
      { label: 'Diameter (d)', value: d + ' mm' },
      { label: 'Length (L)', value: L + ' mm' },
      { label: 'Force (F)', value: (F/1000).toFixed(0) + ' kN' },
      { label: "Young's Modulus", value: E + ' GPa' },
    ],
    find: 'Stress (σ), Strain (ε), and Deformation (δ)',
    hint: 'Step 1: Calculate area A = πd²/4. Step 2: σ = F/A. Step 3: ε = σ/E. Step 4: δ = ε × L',
    steps: [
      { formula: 'A = πd²/4 = π×' + d + '²/4', value: A.toFixed(2) + ' mm²' },
      { formula: 'σ = F/A = ' + F + '/' + A.toFixed(2), value: sigma.toFixed(2) + ' MPa' },
      { formula: 'ε = σ/E = ' + sigma.toFixed(2) + '/' + (E*1000), value: epsilon.toExponential(3) },
      { formula: 'δ = ε × L = ' + epsilon.toExponential(3) + ' × ' + L, value: delta.toFixed(4) + ' mm' },
    ]
  };
}

function generateBendingProblem(diff) {
  const L = rnd(2, 8);
  const w = rnd(5, 30);
  const b = rint(50, 200), d = rint(100, 400);
  const I = b * d**3 / 12;
  const M = w * L**2 / 8 * 1e6; // N·mm
  const sigma = M * d/2 / I;
  return {
    title: 'Bending Stress Problem',
    statement: `A simply supported beam of span <strong>${L} m</strong> carries a UDL of <strong>${w} kN/m</strong>. Cross-section: ${b}mm × ${d}mm rectangular.`,
    given: [
      { label: 'Span (L)', value: L + ' m' }, { label: 'UDL (w)', value: w + ' kN/m' },
      { label: 'Width (b)', value: b + ' mm' }, { label: 'Depth (d)', value: d + ' mm' },
    ],
    find: 'Maximum bending moment and maximum bending stress',
    hint: 'For SS beam with UDL: Mmax = wL²/8. Then σmax = M×y_max/I where y_max = d/2 and I = bd³/12',
    steps: [
      { formula: 'Mmax = wL²/8 = ' + w + '×' + L + '²/8', value: (w*L*L/8).toFixed(2) + ' kN·m' },
      { formula: 'I = bd³/12 = ' + b + '×' + d + '³/12', value: (I/1e6).toFixed(2) + ' × 10⁶ mm⁴' },
      { formula: 'σmax = M×(d/2)/I', value: sigma.toFixed(2) + ' MPa' },
    ]
  };
}

function generateTorsionProblem(diff) {
  const P = rint(5, 50);
  const N = rint(500, 2000);
  const tau_allow = rint(40, 80);
  const T = (P * 1e6) / (2 * Math.PI * N / 60);
  const d = Math.cbrt(16 * T / (Math.PI * tau_allow));
  return {
    title: 'Shaft Design Problem',
    statement: `A solid steel shaft transmits <strong>${P} kW</strong> at <strong>${N} rpm</strong>. Maximum allowable shear stress = <strong>${tau_allow} MPa</strong>. Design the shaft.`,
    given: [
      { label: 'Power (P)', value: P + ' kW' }, { label: 'Speed (N)', value: N + ' rpm' },
      { label: 'τ_allow', value: tau_allow + ' MPa' },
    ],
    find: 'Minimum shaft diameter',
    hint: 'Step 1: T = 60P/(2πN). Step 2: Use τ = 16T/(πd³) → d = ∛(16T/πτ)',
    steps: [
      { formula: 'T = 60P/(2πN) = 60×' + P + '×1000/(2π×' + N + ')', value: (T/1000).toFixed(2) + ' N·m' },
      { formula: 'd = ∛(16T/πτ)', value: d.toFixed(1) + ' mm (round up to ' + Math.ceil(d/5)*5 + ' mm)' },
    ]
  };
}

function generateBucklingProblem(diff) {
  const L = rnd(1, 5);
  const d = rint(20, 80);
  const E = 200;
  const K = [1, 0.5, 2, 0.7][rint(0,3)];
  const labels = {1:'Both Pinned', 0.5:'Both Fixed', 2:'Fixed-Free', 0.7:'Fixed-Pinned'};
  const Le = K * L;
  const I = Math.PI * d**4 / 64;
  const Pcr = Math.PI**2 * E * 1000 * I / (Le * 1000)**2 / 1000;
  return {
    title: 'Euler Buckling Problem',
    statement: `A <strong>${labels[K]}</strong> column of length <strong>${L} m</strong> has solid circular cross-section (d = ${d} mm). E = ${E} GPa. Find critical load.`,
    given: [
      { label: 'Length (L)', value: L + ' m' }, { label: 'Diameter (d)', value: d + ' mm' },
      { label: 'End Condition', value: labels[K] + ' (K=' + K + ')' }, { label: 'E', value: E + ' GPa' },
    ],
    find: 'Critical buckling load (Pcr)',
    hint: 'Le = K×L. I = πd⁴/64. Pcr = π²EI/Le²',
    steps: [
      { formula: 'Le = K×L = ' + K + '×' + L, value: Le.toFixed(2) + ' m' },
      { formula: 'I = πd⁴/64', value: (I/1e6).toFixed(4) + ' × 10⁶ mm⁴' },
      { formula: 'Pcr = π²EI / Le²', value: Pcr.toFixed(2) + ' kN' },
    ]
  };
}

function generateMohrProblem(diff) {
  const sx = rint(-100, 200), sy = rint(-100, 100), txy = rint(-80, 80);
  const C = (sx + sy) / 2;
  const R = Math.sqrt(((sx-sy)/2)**2 + txy**2);
  const s1 = C + R, s2 = C - R;
  return {
    title: "Mohr's Circle Problem",
    statement: `At a point in a loaded member: σx = <strong>${sx} MPa</strong>, σy = <strong>${sy} MPa</strong>, τxy = <strong>${txy} MPa</strong>. Find principal stresses and max shear stress.`,
    given: [
      { label: 'σx', value: sx + ' MPa' }, { label: 'σy', value: sy + ' MPa' }, { label: 'τxy', value: txy + ' MPa' },
    ],
    find: 'σ₁, σ₂, and τmax',
    hint: 'C = (σx+σy)/2. R = √[(σx-σy)²/4 + τxy²]. σ₁ = C+R, σ₂ = C−R, τmax = R',
    steps: [
      { formula: 'C = (σx+σy)/2 = (' + sx + '+' + sy + ')/2', value: C.toFixed(2) + ' MPa' },
      { formula: 'R = √[(σx-σy)²/4 + τxy²]', value: R.toFixed(2) + ' MPa' },
      { formula: 'σ₁ = C + R', value: s1.toFixed(2) + ' MPa' },
      { formula: 'σ₂ = C − R', value: s2.toFixed(2) + ' MPa' },
      { formula: 'τmax = R', value: R.toFixed(2) + ' MPa' },
    ]
  };
}

// ─── INDUSTRIAL APPLICATIONS ─────────────────────────────────────────────────
const APPLICATIONS = [
  {
    icon: '🚗',
    name: 'Crankshaft',
    principle: 'Combined Bending + Torsion',
    desc: 'A crankshaft in an IC engine experiences simultaneous bending from combustion forces and torsion during power transmission. Shaft design uses ASME formula with shock factors Kb and Kt to find the equivalent twisting moment T_e = √[(KbM)² + (KtT)²]. Material: forged alloy steel.',
    tags: ['Automotive', 'Torsion', 'Bending', 'ASME Code']
  },
  {
    icon: '🌉',
    name: 'Bridge Girder',
    principle: 'Bending & Shear — SFD/BMD',
    desc: 'Bridge girders span large distances as simply supported or continuous beams. SFD and BMD are drawn to find maximum bending moment and shear force. I-sections are used to maximise section modulus Z = I/y_max for minimum weight. Deflection is checked against L/360 serviceability limit.',
    tags: ['Civil Engg', 'SFD/BMD', 'Bending Stress', 'Deflection']
  },
  {
    icon: '✈️',
    name: 'Aircraft Wing Spar',
    principle: 'Bending Stress & Deflection',
    desc: 'Wing spars resist aerodynamic lift and fuel weight as cantilever beams attached at the fuselage. Critical design criterion: bending stress σ = My/I must not exceed allowable stress; deflection δ = PL³/3EI must satisfy aeroelastic limits. Aluminium alloys and CFRP composites are used.',
    tags: ['Aerospace', 'Cantilever Bending', 'Deflection', 'Composites']
  },
  {
    icon: '⚙️',
    name: 'Power Transmission Shaft',
    principle: 'Torsion Design — T/J = τ/r',
    desc: 'Industrial shafts transmit torque T = 60P/(2πN) from motors to driven machines. Combined bending from gear/pulley radial forces adds to torsion. ASME design code gives minimum diameter: d = ∛(16T_e / πτ_allow). Material: C45 steel, τ_allow = 40–60 MPa.',
    tags: ['Machine Design', 'Torsion', 'Power Transmission', 'ASME']
  },
  {
    icon: '🏗️',
    name: 'Building Column',
    principle: "Euler's Buckling — P_cr = π²EI/(KL)²",
    desc: 'Slender building columns under compressive loads must be checked for buckling. The slenderness ratio λ = Le/k determines whether Euler\'s formula (long column) or Rankine-Gordon formula (short/intermediate) applies. K factor accounts for end fixity: K=0.5 (both fixed), K=1 (both pinned).',
    tags: ['Civil Engg', 'Euler Buckling', 'Slenderness Ratio', 'IS 800']
  },
  {
    icon: '⚙️',
    name: 'Spur Gear Tooth',
    principle: 'Bending Stress — Lewis Formula',
    desc: 'Each gear tooth acts as a cantilever beam. The Lewis bending equation σ = WtPd/(FY) applies the flexure formula to the tooth root. Stress concentration at the root fillet governs fatigue life. Bending stress must satisfy σ ≤ σ_bend_allow for infinite life.',
    tags: ['Machine Design', 'Bending', 'Fatigue', 'Lewis Equation']
  },
  {
    icon: '🛢️',
    name: 'Thin-Walled Pressure Vessel',
    principle: "Biaxial Stress → Mohr's Circle",
    desc: 'Thin-walled cylinders (t < r/10) develop hoop stress σ_θ = pd/2t and longitudinal stress σ_L = pd/4t — a biaxial stress state. Mohr\'s circle gives principal stresses and maximum shear stress τ_max = (σ_θ − σ_L)/2 = pd/8t for failure analysis using Tresca or von Mises criteria.',
    tags: ["Mohr's Circle", 'Biaxial Stress', 'Pressure Vessel', 'Tresca']
  },
  {
    icon: '🌀',
    name: 'Helical Spring',
    principle: 'Torsion of Coil Wire',
    desc: 'The wire of a helical spring is primarily under torsion. Basic shear stress: τ = 8WD/(πd³). Wahl\'s correction factor K_w = (4C-1)/(4C-4) + 0.615/C accounts for wire curvature and direct shear (C = D/d = spring index). Spring stiffness: k = Gd⁴/(8D³n).',
    tags: ['Machine Design', 'Torsion', 'Wahl Factor', 'Spring Design']
  },
  {
    icon: '🔩',
    name: 'Bolted Joint',
    principle: 'Shear Stress τ = F/A',
    desc: 'Bolts in lap joints carry shear force: τ = F/A per shear plane. Bolts in tension joints carry axial stress σ = F/A. For eccentric loads, the critical bolt carries combined direct shear + torsional shear found using superposition. Pre-tension σ_0 = F_i/A_b reduces fatigue damage.',
    tags: ['Fasteners', 'Shear Stress', 'Eccentric Load', 'Fatigue']
  },
  {
    icon: '🚲',
    name: 'Bicycle Frame Tube',
    principle: 'Thin-Walled Bending & Torsion',
    desc: 'Frame tubes carry combined bending from rider weight and torsion during pedalling and cornering. Thin-walled section analysis gives σ = M·y/I for bending and τ = T/(2·t·A_m) for torsion (Bredt formula). Aluminium alloy 6061-T6 and carbon fibre achieve high stiffness-to-weight ratio.',
    tags: ['Structural', 'Bending', 'Thin-Walled Torsion', 'Composites']
  },
  {
    icon: '🏎️',
    name: 'Racing Car Chassis',
    principle: 'Combined Loading — von Mises',
    desc: 'Space frame chassis tubes experience bending from body weight and torsion during cornering. Principal stresses found from Mohr\'s circle. Von Mises failure criterion: σ_VM = √(σ₁² − σ₁σ₂ + σ₂²) ≤ σ_yield. High-strength low-alloy (HSLA) steel gives optimum strength-to-weight ratio.',
    tags: ['Automotive', 'Combined Loading', "Mohr's Circle", 'von Mises']
  },
  {
    icon: '🌬️',
    name: 'Wind Turbine Blade',
    principle: 'Bending + Buckling + Fatigue',
    desc: 'Turbine blades act as cantilever beams under aerodynamic lift and gravity. Root bending moment M = ½ρAv²·L/2 governs design. Slender blades must also be checked for buckling under compressive loads. Fibre-reinforced polymer (CFRP/GFRP) composites balance strength, stiffness, and weight for 100m+ blades.',
    tags: ['Renewable Energy', 'Cantilever Bending', 'Buckling', 'Fatigue']
  }
];

function initApplications() {
  const grid = document.getElementById('appGrid');
  if (!grid) return;

  grid.innerHTML = APPLICATIONS.map((app, i) => `
    <div class="app-card" style="animation-delay:${i * 0.06}s">
      <div class="app-card-header">
        <div class="app-icon">${app.icon}</div>
        <div class="app-name">${app.name}</div>
        <div class="app-principle">${app.principle}</div>
      </div>
      <div class="app-card-body">
        <div class="app-desc">${app.desc}</div>
        <div class="app-tags">${app.tags.map(t => `<span class="app-tag">${t}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');
}

// ─── ACHIEVEMENTS / BADGES ────────────────────────────────────────────────────
const BADGES = [
  { id:'first_calc', icon:'🧮', name:'First Calculation' },
  { id:'quiz_master', icon:'🎓', name:'Quiz Master (≥80%)' },
  { id:'perfect_score', icon:'⭐', name:'Perfect Score' },
  { id:'explorer', icon:'🔭', name:'Formula Explorer' },
  { id:'lab_rat', icon:'🔬', name:'Virtual Lab Run' },
  { id:'buckling_calc', icon:'📐', name:'Buckling Analyst' },
];

function initBadges() {
  renderBadges();
  updateBadgeCount();
}

function renderBadges() {
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = BADGES.map(b => `
    <div class="badge-item ${AppState.earnedBadges.includes(b.id) ? 'earned' : 'locked'}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>
  `).join('');
}

function awardBadge(id) {
  if (AppState.earnedBadges.includes(id)) return;
  AppState.earnedBadges.push(id);
  localStorage.setItem('sm_badges', JSON.stringify(AppState.earnedBadges));
  renderBadges();
  updateBadgeCount();
  showBadgeToast(BADGES.find(b => b.id === id));
}

function updateBadgeCount() {
  document.getElementById('badgeCount').textContent = AppState.earnedBadges.length;
}

function showBadgeToast(badge) {
  if (!badge) return;
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#00d4ff,#7b2fff);color:white;padding:12px 24px;
    border-radius:50px;font-family:Rajdhani,sans-serif;font-size:1rem;font-weight:700;
    z-index:9999;animation:slideUp 0.4s ease;box-shadow:0 4px 20px rgba(0,212,255,0.4)`;
  toast.textContent = `🏆 Achievement Unlocked: ${badge.name}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function toggleAchievements() {
  document.getElementById('achievementsPanel').classList.toggle('open');
}

// ─── THEME & FONT ─────────────────────────────────────────────────────────────
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme !== 'light';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  document.getElementById('themeToggle').innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

document.getElementById('fontToggle')?.addEventListener('click', () => {
  AppState.fontSize = AppState.fontSize >= 20 ? 14 : AppState.fontSize + 2;
  document.documentElement.style.fontSize = AppState.fontSize + 'px';
});

// ─── NAVIGATION HELPER ────────────────────────────────────────────────────────
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function trackEvent(type, label, data = {}) {
  const payload = {
    type, label,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    ...data
  };

  if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL') {
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {}); // Fail silently
  }

  console.log('[Analytics]', payload);
}

function logSession(event) {
  trackEvent('session', event, {
    sessionDuration: ((Date.now() - AppState.sessionStart) / 1000).toFixed(0)
  });
}

window.addEventListener('beforeunload', () => logSession('page_unload'));

// ─── GSAP SCROLL ANIMATIONS ───────────────────────────────────────────────────
function initGSAPAnimations() {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero content entrance
  gsap.from('.hero-badge',    { opacity: 0, y: -20, duration: 0.7, delay: 0.2 });
  gsap.from('.hero-title',    { opacity: 0, y:  40, duration: 0.9, delay: 0.4 });
  gsap.from('.hero-subtitle', { opacity: 0, y:  30, duration: 0.8, delay: 0.7 });
  gsap.from('.hero-desc',     { opacity: 0, y:  20, duration: 0.7, delay: 0.9 });
  gsap.from('.hero-cta',      { opacity: 0, y:  20, duration: 0.7, delay: 1.1 });
  gsap.from('.stat-card',     { opacity: 0, y:  20, duration: 0.6, delay: 1.3, stagger: 0.12 });

  // Section headers
  document.querySelectorAll('.section-header').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
      opacity: 0, y: 30, duration: 0.8
    });
  });

  // Glass cards — staggered entrance
  document.querySelectorAll('.sim-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' },
      opacity: 0, y: 40, duration: 0.6, delay: i * 0.1
    });
  });

  // Formula cards
  document.querySelectorAll('.formula-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
      opacity: 0, scale: 0.95, duration: 0.5, delay: (i % 4) * 0.08
    });
  });

  // App cards
  document.querySelectorAll('.app-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
      opacity: 0, y: 30, duration: 0.5, delay: (i % 3) * 0.1
    });
  });
}

// ─── THREE.JS 3D BEAM BENDING VISUALIZER ────────────────────────────────────
function init3DBeam(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const W = container.clientWidth  || 380;
  const H = container.clientHeight || 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
  camera.position.set(0, 2.8, 7);
  camera.lookAt(0, 0, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0x223355, 1.4));
  const key = new THREE.DirectionalLight(0x00d4ff, 2.2);
  key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.PointLight(0x7b2fff, 1.0, 20);
  fill.position.set(-4, -2, 2); scene.add(fill);

  const beamGroup = new THREE.Group();
  scene.add(beamGroup);

  const L = 5.0, bW = 0.28, bH = 0.48;

  // ── Beam body (rectangular cross-section, along X) ─────────────────
  const beamGeo = new THREE.BoxGeometry(L, bH, bW);
  const beamMat = new THREE.MeshPhongMaterial({
    color: 0x0a2a4a, specular: 0x00d4ff, shininess: 140
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beamGroup.add(beam);

  // ── Compression zone (top half — red tint) ────────────────────────
  const compGeo = new THREE.BoxGeometry(L - 0.1, bH / 2 - 0.01, bW + 0.01);
  const compMat = new THREE.MeshPhongMaterial({
    color: 0x330011, transparent: true, opacity: 0.55,
    specular: 0xff4757, shininess: 60
  });
  const compZone = new THREE.Mesh(compGeo, compMat);
  compZone.position.y = bH / 4 + 0.005;
  beamGroup.add(compZone);

  // ── Tension zone (bottom half — green tint) ───────────────────────
  const tensGeo = new THREE.BoxGeometry(L - 0.1, bH / 2 - 0.01, bW + 0.01);
  const tensMat = new THREE.MeshPhongMaterial({
    color: 0x003311, transparent: true, opacity: 0.55,
    specular: 0x00ff9d, shininess: 60
  });
  const tensZone = new THREE.Mesh(tensGeo, tensMat);
  tensZone.position.y = -bH / 4 - 0.005;
  beamGroup.add(tensZone);

  // ── Neutral axis plane (yellow wireframe) ─────────────────────────
  const naGeo  = new THREE.PlaneGeometry(L, bW);
  const naMat  = new THREE.MeshBasicMaterial({
    color: 0xffd32a, wireframe: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide
  });
  const naPlane = new THREE.Mesh(naGeo, naMat);
  naPlane.rotation.x = Math.PI / 2;
  beamGroup.add(naPlane);

  // ── Pin supports (triangular prisms) ──────────────────────────────
  const makeSupport = (x) => {
    const sg = new THREE.CylinderGeometry(0, 0.25, 0.5, 4);
    const sm = new THREE.MeshPhongMaterial({ color: 0x4a5a7a, specular: 0x8899bb });
    const s  = new THREE.Mesh(sg, sm);
    s.position.set(x, -bH / 2 - 0.35, 0);
    s.rotation.y = Math.PI / 4;
    scene.add(s);
    // Base plate
    const bg = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    const bm = new THREE.MeshPhongMaterial({ color: 0x2a3a5a });
    const bp = new THREE.Mesh(bg, bm);
    bp.position.set(x, -bH/2 - 0.62, 0);
    scene.add(bp);
  };
  makeSupport(-L / 2 + 0.1);
  makeSupport( L / 2 - 0.1);

  // ── Ground plane ──────────────────────────────────────────────────
  const grid = new THREE.GridHelper(14, 14, 0x112244, 0x0a1530);
  grid.position.y = -1.1;
  scene.add(grid);

  // ── Load arrow (cylinder + cone above beam midspan) ───────────────
  const arrowGroup = new THREE.Group();
  // Arrow shaft
  const aSG  = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12);
  const aMat = new THREE.MeshPhongMaterial({ color: 0xff6b35, emissive: 0x331100 });
  const aShaft = new THREE.Mesh(aSG, aMat);
  aShaft.position.y = 0.55;
  arrowGroup.add(aShaft);
  // Arrowhead
  const aHG  = new THREE.ConeGeometry(0.12, 0.3, 12);
  const aHead = new THREE.Mesh(aHG, aMat);
  aHead.position.y = 0.05;
  arrowGroup.add(aHead);
  arrowGroup.position.set(0, bH / 2 + 1.05, 0);
  scene.add(arrowGroup);
  // Label — small "P" disc
  const lblG = new THREE.CircleGeometry(0.12, 16);
  const lblM = new THREE.MeshBasicMaterial({ color: 0xff6b35, side: THREE.DoubleSide });
  const lbl  = new THREE.Mesh(lblG, lblM);
  lbl.position.set(0, bH/2 + 1.72, 0.01);
  scene.add(lbl);

  // ── Reaction arrows (upward at supports) ──────────────────────────
  [-L/2 + 0.1, L/2 - 0.1].forEach(x => {
    const rG = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
    const rM = new THREE.MeshPhongMaterial({ color: 0x00ff9d });
    const rS = new THREE.Mesh(rG, rM);
    rS.position.set(x, -bH/2 - 1.0, 0);
    scene.add(rS);
    const rHG = new THREE.ConeGeometry(0.1, 0.25, 12);
    const rH  = new THREE.Mesh(rHG, rM);
    rH.position.set(x, -bH/2 - 0.52, 0);
    scene.add(rH);
  });

  // ── Animate beam deflection (oscillating) ─────────────────────────
  let t = 0;
  let isDragging = false, prevX = 0, prevY = 0, orbitY = 0.4, orbitX = 0.25;

  renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  renderer.domElement.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('mousemove', e => { if (!isDragging) return; orbitY += (e.clientX - prevX) * 0.012; orbitX += (e.clientY - prevY) * 0.008; orbitX = Math.max(-0.7, Math.min(0.7, orbitX)); prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('touchmove', e => { if (!isDragging) return; orbitY += (e.touches[0].clientX - prevX) * 0.012; orbitX += (e.touches[0].clientY - prevY) * 0.008; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('mouseup',  () => isDragging = false);
  window.addEventListener('touchend', () => isDragging = false);
  renderer.domElement.addEventListener('wheel', e => { camera.position.z = Math.max(3, Math.min(14, camera.position.z + e.deltaY * 0.008)); e.preventDefault(); }, { passive: false });
  renderer.domElement.style.cursor = 'grab';

  function animate() {
    requestAnimationFrame(animate);
    t += 0.018;

    // Beam slowly oscillates — deflects downward (negative y) and back
    const deflAmp = 0.18 * (0.5 - 0.5 * Math.cos(t));  // 0 → 0.18 → 0 smoothly
    beam.position.y      = -deflAmp * 0.5;
    compZone.position.y  =  bH / 4 + 0.005 - deflAmp * 0.3;
    tensZone.position.y  = -bH / 4 - 0.005 - deflAmp * 0.7;
    arrowGroup.position.y = bH / 2 + 1.05 - deflAmp * 0.5;

    // Orbit
    if (!isDragging) orbitY += 0.004;
    const r = camera.position.z;
    camera.position.x = r * Math.sin(orbitY) * Math.cos(orbitX);
    camera.position.y = r * Math.sin(orbitX) + 0.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const nW = container.clientWidth;
    if (nW < 10) return;
    renderer.setSize(nW, H);
    camera.aspect = nW / H;
    camera.updateProjectionMatrix();
  });
}

// ─── THREE.JS 3D COLUMN BUCKLING VISUALIZER ──────────────────────────────────
let column3DLoadPct = 0, column3DRenderer = null, column3DScene = null;
let column3DMesh = null, column3DCamera = null;

function init3DColumn(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const W = container.clientWidth  || 380;
  const H = container.clientHeight || 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  column3DRenderer = renderer;

  const scene  = new THREE.Scene();
  column3DScene = scene;
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
  camera.position.set(1.5, 0.5, 7);
  camera.lookAt(0, 0, 0);
  column3DCamera = camera;

  // Lighting
  scene.add(new THREE.AmbientLight(0x223355, 1.3));
  const key = new THREE.DirectionalLight(0x00d4ff, 2.0);
  key.position.set(3, 4, 3); scene.add(key);
  const fill = new THREE.PointLight(0xff6b35, 0.8, 20);
  fill.position.set(-3, 0, 2); scene.add(fill);

  // ── Pin supports (top and bottom) ─────────────────────────────────
  const pinMat = new THREE.MeshPhongMaterial({ color: 0x4a5a7a, specular: 0x8899bb });
  const pinGeo = new THREE.CylinderGeometry(0, 0.22, 0.4, 4);
  const topPin = new THREE.Mesh(pinGeo, pinMat);
  topPin.position.y = 2.85; topPin.rotation.z = Math.PI;
  scene.add(topPin);
  const botPin = new THREE.Mesh(pinGeo, pinMat);
  botPin.position.y = -2.85;
  scene.add(botPin);

  // Base plate
  const plateMat = new THREE.MeshPhongMaterial({ color: 0x2a3a5a });
  const plateGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
  const topPlate = new THREE.Mesh(plateGeo, plateMat);
  topPlate.position.y = 3.1; scene.add(topPlate);
  const botPlate = new THREE.Mesh(plateGeo, plateMat);
  botPlate.position.y = -3.1; scene.add(botPlate);

  // ── Column (built from many small segments to allow curved shape) ──
  const colMat = new THREE.MeshPhongMaterial({ color: 0x005a8c, specular: 0x00d4ff, shininess: 160 });
  const nSeg = 40;
  const colSegGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.4 / nSeg, 16);
  const colSegMeshes = [];
  for (let i = 0; i < nSeg; i++) {
    const m = new THREE.Mesh(colSegGeo, colMat);
    m.position.y = -2.7 + (i + 0.5) * (5.4 / nSeg);
    scene.add(m);
    colSegMeshes.push(m);
  }
  column3DMesh = colSegMeshes;

  // ── Load arrow ─────────────────────────────────────────────────────
  const loadMat = new THREE.MeshPhongMaterial({ color: 0xff6b35, emissive: 0x221100 });
  const loadShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10), loadMat);
  loadShaft.position.y = 3.6; scene.add(loadShaft);
  const loadHead  = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 10), loadMat);
  loadHead.position.y = 3.2; loadHead.rotation.z = Math.PI; scene.add(loadHead);

  // ── Grid ──────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(12, 12, 0x112244, 0x0a1530);
  grid.position.y = -3.2; scene.add(grid);

  // ── Orbit controls ─────────────────────────────────────────────────
  let isDragging = false, prevX = 0, prevY = 0, orbitY = 0.3, orbitX = 0.1;
  renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  renderer.domElement.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('mousemove', e => { if (!isDragging) return; orbitY += (e.clientX - prevX) * 0.012; orbitX += (e.clientY - prevY) * 0.008; orbitX = Math.max(-0.6, Math.min(0.6, orbitX)); prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('touchmove', e => { if (!isDragging) return; orbitY += (e.touches[0].clientX - prevX) * 0.012; prevX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('mouseup',  () => isDragging = false);
  window.addEventListener('touchend', () => isDragging = false);
  renderer.domElement.addEventListener('wheel', e => { camera.position.z = Math.max(3, Math.min(14, camera.position.z + e.deltaY * 0.008)); e.preventDefault(); }, { passive: false });
  renderer.domElement.style.cursor = 'grab';

  function animate() {
    requestAnimationFrame(animate);

    // Update column shape based on load %
    const pct  = column3DLoadPct / 100;
    const maxD = Math.min(pct * 1.4, 1.6);                          // max lateral deflection
    const isBuckled = pct >= 1.0;
    const color = isBuckled ? 0xff4757 : pct > 0.8 ? 0xffd32a : 0x005a8c;
    colSegMeshes.forEach((seg, i) => {
      const t   = i / (nSeg - 1);                                    // 0 → 1 along column height
      // Half-sine mode shape: δ(x) = δ_max · sin(π·t)
      const xDef = maxD * Math.sin(Math.PI * t);
      seg.position.x = xDef;
      seg.material.color.setHex(color);
      // Tilt each segment to follow the curved path
      const dt = Math.PI * (1 / (nSeg - 1));
      const slope = maxD * Math.cos(Math.PI * t) * dt;
      seg.rotation.z = -slope * 0.8;
    });

    // Orbit
    if (!isDragging) orbitY += 0.005;
    const r = camera.position.z;
    camera.position.x = r * Math.sin(orbitY) * Math.cos(orbitX);
    camera.position.y = r * Math.sin(orbitX) + 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const nW = container.clientWidth;
    if (nW < 10) return;
    renderer.setSize(nW, H);
    camera.aspect = nW / H;
    camera.updateProjectionMatrix();
  });
}

function updateColumn3D(val) {
  column3DLoadPct = parseFloat(val);
  document.getElementById('col3dLoadLabel').textContent = val;
}
// Shaft lies along X-axis. Correct spin = rotation around X (longitudinal axis).
function init3DShaft(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const W = container.clientWidth  || 500;
  const H = container.clientHeight || 340;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
  camera.position.set(0, 2.5, 6);
  camera.lookAt(0, 0, 0);

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x223355, 1.2));

  const keyLight = new THREE.DirectionalLight(0x00d4ff, 2.5);
  keyLight.position.set(3, 4, 3);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x7b2fff, 1.5, 15);
  fillLight.position.set(-4, -2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
  rimLight.position.set(0, -3, -4);
  scene.add(rimLight);

  // ── Shaft group (everything spins together around X = long axis) ──────────
  const shaftGroup = new THREE.Group();
  scene.add(shaftGroup);

  // Main shaft cylinder — along X axis
  // CylinderGeometry is along Y by default, so we rotate it 90° around Z
  const shaftGeo = new THREE.CylinderGeometry(0.28, 0.28, 4.2, 64, 1);
  const shaftMat = new THREE.MeshPhongMaterial({
    color:    0x0a2a4a,
    specular: 0x00d4ff,
    shininess: 180,
    emissive:  0x001830,
  });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.rotation.z = Math.PI / 2;   // now lies along X
  shaft.castShadow = true;
  shaftGroup.add(shaft);

  // ── End caps ──────────────────────────────────────────────────────────────
  const capGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.18, 64);
  const capMat = new THREE.MeshPhongMaterial({
    color: 0x00a8cc, specular: 0xffffff, shininess: 250, emissive: 0x003344
  });
  [-2.19, 2.19].forEach(xPos => {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = xPos;
    shaftGroup.add(cap);
  });

  // ── Key (rectangular protrusion on top of shaft) ──────────────────────────
  const keyGeo = new THREE.BoxGeometry(0.7, 0.14, 0.26);
  const keyMat = new THREE.MeshPhongMaterial({
    color: 0xff5500, specular: 0xffaa00, shininess: 120
  });
  const key = new THREE.Mesh(keyGeo, keyMat);
  key.position.set(0, 0.35, 0);   // sits on top of shaft surface
  shaftGroup.add(key);

  // ── Keyway (slot indent — a dark inset box) ───────────────────────────────
  const keywayGeo = new THREE.BoxGeometry(0.72, 0.06, 0.28);
  const keywayMat = new THREE.MeshPhongMaterial({ color: 0x001122 });
  const keyway = new THREE.Mesh(keywayGeo, keywayMat);
  keyway.position.set(0, 0.265, 0);
  shaftGroup.add(keyway);

  // ── Torsion stress helix (green line along shaft surface) ─────────────────
  const helixPts = [];
  const nH = 200, R_helix = 0.295, helixLen = 4.0, helixTurns = 3;
  for (let i = 0; i <= nH; i++) {
    const t     = i / nH;
    const x     = (t - 0.5) * helixLen;
    const angle = t * helixTurns * Math.PI * 2;
    helixPts.push(new THREE.Vector3(x, R_helix * Math.sin(angle), R_helix * Math.cos(angle)));
  }
  const helixGeo = new THREE.BufferGeometry().setFromPoints(helixPts);
  const helixMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.75 });
  shaftGroup.add(new THREE.Line(helixGeo, helixMat));

  // A second helix offset by π (shows shear stress paths)
  const helixPts2 = helixPts.map(p => new THREE.Vector3(p.x, -p.y, -p.z));
  const helixGeo2 = new THREE.BufferGeometry().setFromPoints(helixPts2);
  const helixMat2 = new THREE.LineBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.4 });
  shaftGroup.add(new THREE.Line(helixGeo2, helixMat2));

  // ── Bearing supports (grey rings at 1/4 and 3/4 along shaft) ─────────────
  const bearingGeo = new THREE.TorusGeometry(0.40, 0.07, 16, 48);
  const bearingMat = new THREE.MeshPhongMaterial({ color: 0x334466, specular: 0x8899bb, shininess: 80 });
  [-1.2, 1.2].forEach(xPos => {
    const bearing = new THREE.Mesh(bearingGeo, bearingMat);
    bearing.rotation.y = Math.PI / 2;
    bearing.position.x = xPos;
    scene.add(bearing);   // bearings stay STATIC (not part of shaftGroup)
  });

  // ── Subtle ground grid ────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(12, 12, 0x112244, 0x0a1530);
  grid.position.y = -1.2;
  scene.add(grid);

  // ── Mouse / Touch orbit (drag to orbit, scroll to zoom) ──────────────────
  let isDragging = false, prevMX = 0, prevMY = 0;
  let orbitAngleY = 0, orbitAngleX = 0.25;

  renderer.domElement.addEventListener('mousedown', e => {
    isDragging = true; prevMX = e.clientX; prevMY = e.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  });
  renderer.domElement.addEventListener('touchstart', e => {
    isDragging = true; prevMX = e.touches[0].clientX; prevMY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    orbitAngleY += (e.clientX - prevMX) * 0.012;
    orbitAngleX += (e.clientY - prevMY) * 0.008;
    orbitAngleX = Math.max(-0.9, Math.min(0.9, orbitAngleX));
    prevMX = e.clientX; prevMY = e.clientY;
  });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    orbitAngleY += (e.touches[0].clientX - prevMX) * 0.012;
    orbitAngleX += (e.touches[0].clientY - prevMY) * 0.008;
    prevMX = e.touches[0].clientX; prevMY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('mouseup',  () => { isDragging = false; renderer.domElement.style.cursor = 'grab'; });
  window.addEventListener('touchend', () => isDragging = false);

  renderer.domElement.addEventListener('wheel', e => {
    camera.position.z = Math.max(2.5, Math.min(12, camera.position.z + e.deltaY * 0.008));
    e.preventDefault();
  }, { passive: false });

  renderer.domElement.style.cursor = 'grab';

  // ── Render loop ───────────────────────────────────────────────────────────
  let spinAngle = 0;
  function animate() {
    requestAnimationFrame(animate);

    // ✅ FIX: spin around X axis (long axis of shaft) — correct torsion rotation
    if (!isDragging) {
      spinAngle += 0.012;
    }
    shaftGroup.rotation.x = spinAngle;  // ← X = long axis = correct

    // Orbit camera based on drag
    const r = camera.position.z;
    camera.position.x = r * Math.sin(orbitAngleY) * Math.cos(orbitAngleX);
    camera.position.y = r * Math.sin(orbitAngleX) + 0.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  // Resize observer
  window.addEventListener('resize', () => {
    const nW = container.clientWidth;
    if (nW < 10) return;
    renderer.setSize(nW, H);
    camera.aspect = nW / H;
    camera.updateProjectionMatrix();
  });

  return renderer;
}

// ─── CONCEPT VISUALIZER PANELS ────────────────────────────────────────────────
// Generates explanatory mini-animations into concept cards
function initConceptVisualizer() {
  const concepts = [
    { id: 'cv_bending',   title: 'Why Does Bending Moment Develop?',   draw: drawConceptBending },
    { id: 'cv_shear',     title: 'Why is Shear Stress Parabolic?',      draw: drawConceptShearParabola },
    { id: 'cv_buckling',  title: 'Why Do Columns Buckle?',              draw: drawConceptBuckling },
  ];

  const container = document.getElementById('conceptVisualizer');
  if (!container) return;

  concepts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'glass-card concept-anim-card';
    card.innerHTML = `
      <h4 class="card-title"><i class="fas fa-lightbulb"></i> ${c.title}</h4>
      <canvas id="${c.id}" width="380" height="180" style="width:100%;border-radius:8px;background:rgba(0,0,0,0.3)"></canvas>
    `;
    container.appendChild(card);
    requestAnimationFrame(() => c.draw(c.id));
  });
}

function drawConceptBending(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function frame() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const amp = 25 + 8 * Math.sin(t * 0.6);
    const bY = H * 0.45, m = 40, bLen = W - 2 * m;

    // Neutral axis dashed
    ctx.setLineDash([5, 8]); ctx.strokeStyle = 'rgba(255,211,42,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(m, bY); ctx.lineTo(W-m, bY); ctx.stroke();
    ctx.setLineDash([]);

    // Compression zone (top)
    ctx.fillStyle = 'rgba(255,71,87,0.12)';
    ctx.fillRect(m, bY - amp - 12, bLen, 12);

    // Tension zone (bottom)
    ctx.fillStyle = 'rgba(0,255,157,0.12)';
    ctx.fillRect(m, bY + amp, bLen, 12);

    // Beam curve
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = m + bLen * i / 60;
      const y = bY + amp * Math.sin(Math.PI * i / 60);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    // Labels
    ctx.font = '10px Space Mono'; ctx.fillStyle = '#ff4757'; ctx.textAlign = 'left';
    ctx.fillText('Compression (−σ)', m + 4, bY - amp - 15);
    ctx.fillStyle = '#00ff9d';
    ctx.fillText('Tension (+σ)', m + 4, bY + amp + 24);
    ctx.fillStyle = '#ffd32a'; ctx.textAlign = 'right';
    ctx.fillText('Neutral Axis', W - m - 4, bY - 4);

    // Load arrow
    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, bY - amp - 35); ctx.lineTo(W/2, bY + amp - 5); ctx.stroke();
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath(); ctx.moveTo(W/2, bY+amp); ctx.lineTo(W/2-5,bY+amp-10); ctx.lineTo(W/2+5,bY+amp-10); ctx.fill();

    t += 0.03;
    requestAnimationFrame(frame);
  }
  frame();
}

function drawConceptShearParabola(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function frame() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const secW = 50, secH = 130, cx = W * 0.25, cy = H * 0.5;
    const F_anim = 60 + 20 * Math.sin(t * 0.5);

    // Cross section rectangle
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0,212,255,0.08)';
    ctx.fillRect(cx - secW/2, cy - secH/2, secW, secH);
    ctx.strokeRect(cx - secW/2, cy - secH/2, secW, secH);

    // Neutral axis
    ctx.setLineDash([4,6]); ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - secW/2 - 10, cy); ctx.lineTo(cx + secW/2 + 10, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Parabolic shear stress distribution
    const maxW2 = 80;
    ctx.strokeStyle = '#7b2fff'; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(123,47,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx + secW/2, cy - secH/2);
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const y_frac = (i / steps) * 2 - 1; // -1 to +1
      const tau = F_anim * (1 - y_frac * y_frac); // parabola
      const x = cx + secW/2 + (tau / F_anim) * maxW2;
      const y = cy + y_frac * secH / 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + secW/2, cy + secH/2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Max at NA label
    ctx.fillStyle = '#7b2fff'; ctx.font = '10px Space Mono'; ctx.textAlign = 'left';
    ctx.fillText(`τmax = 3F/2A`, cx + secW/2 + maxW2 + 4, cy + 4);
    ctx.fillStyle = '#8899bb';
    ctx.fillText('τ = 0', cx + secW/2 + 4, cy - secH/2 + 10);

    // Title
    ctx.fillStyle = '#8899bb'; ctx.textAlign = 'center'; ctx.font = '10px Space Mono';
    ctx.fillText('Parabolic Shear Stress Distribution in Rectangular Section', W/2, H - 8);

    t += 0.04;
    requestAnimationFrame(frame);
  }
  frame();
}

function drawConceptBuckling(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function frame() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cols = [
      { x: W*0.2,  K: 1,   label: 'Both Pinned\nK=1',   phase: 0 },
      { x: W*0.5,  K: 0.5, label: 'Both Fixed\nK=0.5',  phase: Math.PI/3 },
      { x: W*0.8,  K: 2,   label: 'Fixed-Free\nK=2',    phase: Math.PI*2/3 },
    ];

    const topY = 20, botY = H - 30, colH = botY - topY;

    cols.forEach(col => {
      const maxDefl = 18 * col.K * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.5 + col.phase)));

      // Column
      ctx.strokeStyle = col.K === 0.5 ? '#00ff9d' : col.K === 2 ? '#ff4757' : '#00d4ff';
      ctx.lineWidth = 4; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;
      ctx.beginPath();
      const pts = 50;
      for (let i = 0; i <= pts; i++) {
        const yy = topY + colH * i / pts;
        const ratio = i / pts;
        let xx;
        if (col.K === 2) {
          // Cantilever mode — deflects from bottom (fixed) to top (free)
          xx = col.x + maxDefl * (1 - Math.cos(Math.PI/2 * ratio));
        } else if (col.K === 0.5) {
          // Fixed-fixed — S-curve inflection
          xx = col.x + maxDefl * Math.sin(2 * Math.PI * ratio);
        } else {
          // Pinned-pinned — simple half sine
          xx = col.x + maxDefl * Math.sin(Math.PI * ratio);
        }
        i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.stroke(); ctx.shadowBlur = 0;

      // Load arrow
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(col.x, topY - 14); ctx.lineTo(col.x, topY); ctx.stroke();
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath(); ctx.moveTo(col.x, topY); ctx.lineTo(col.x-4, topY-8); ctx.lineTo(col.x+4, topY-8); ctx.fill();

      // Label
      ctx.fillStyle = '#8899bb'; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
      col.label.split('\n').forEach((line, li) => {
        ctx.fillText(line, col.x, botY + 12 + li * 11);
      });

      // Fixed-end symbols
      if (col.K === 0.5) {
        [[col.x, topY], [col.x, botY]].forEach(([ex, ey]) => {
          ctx.fillStyle = '#00ff9d'; ctx.fillRect(ex - 10, ey - 4, 20, 8);
        });
      }
      if (col.K === 2) {
        ctx.fillStyle = '#ff4757'; ctx.fillRect(col.x - 10, botY - 4, 20, 8);
      }
    });

    t += 0.025;
    requestAnimationFrame(frame);
  }
  frame();
}

// ─── KEYBOARD NAVIGATION ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Press 1–6 to switch calculator tabs
  if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.altKey) {
    const tabs = document.querySelectorAll('.calc-tab');
    const idx  = parseInt(e.key) - 1;
    if (tabs[idx]) tabs[idx].click();
  }
  // Press Escape to close achievements
  if (e.key === 'Escape') {
    document.getElementById('achievementsPanel')?.classList.remove('open');
  }
});

// ─── SMOOTH ACTIVE NAV LINK ON SCROLL ─────────────────────────────────────────
function initActiveNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

// ─── PRINT / EXPORT REPORT ────────────────────────────────────────────────────
function printCalculatorResults(calcName) {
  const resultsMap = {
    stress:    'ss_steps',
    sfd:       'sfd_results',
    deflection:'defl_results',
    shaft:     'shaft_results',
    buckling:  'buck_results',
    mohr:      'mohr_results',
  };

  const el = document.getElementById(resultsMap[calcName]);
  if (!el || el.querySelector('.placeholder-state')) {
    alert('Please run the calculation first.');
    return;
  }

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Solid Mechanics Toolkit — ${calcName} Report</title>
      <style>
        body { font-family: 'Courier New', monospace; background: #fff; color: #111; padding: 30px; }
        h1 { color: #003366; font-size: 1.3rem; border-bottom: 2px solid #003366; padding-bottom: 8px; }
        h2 { color: #005588; font-size: 1rem; margin-top: 20px; }
        .step-item { background: #f5f8ff; border-left: 3px solid #0088cc; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; }
        .step-label { font-size: 0.7rem; color: #0088cc; text-transform: uppercase; letter-spacing: 1px; }
        .step-formula { color: #111; }
        .step-value { color: #006600; font-size: 1.05rem; font-weight: bold; }
        .result-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd; }
        .val { font-weight: bold; color: #003366; }
        footer { margin-top: 30px; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>🔩 Solid Mechanics Toolkit — Calculation Report</h1>
      <h2>${calcName.charAt(0).toUpperCase() + calcName.slice(1)} Calculator</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      ${el.innerHTML}
      <footer>
        PCC-201-MEC | SPPU NEP 2020 | Department of Mechanical Engineering | Ajeenkya DY Patil School of Engineering, Pune
      </footer>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
}

// ─── COPY RESULT TO CLIPBOARD ─────────────────────────────────────────────────
function copyResultsToClipboard(calcName) {
  const resultIds = {
    stress:    'ss_steps',
    sfd:       'sfd_results',
    deflection:'defl_results',
    shaft:     'shaft_results',
    buckling:  'buck_results',
    mohr:      'mohr_results',
  };
  const el = document.getElementById(resultIds[calcName]);
  if (!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Results copied to clipboard!', 'success');
  });
}

// ─── TOAST UTILITY ────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const colors = {
    success: 'linear-gradient(135deg,#00ff9d,#00d4ff)',
    error:   'linear-gradient(135deg,#ff4757,#ff6b35)',
    info:    'linear-gradient(135deg,#00d4ff,#7b2fff)',
  };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:${colors[type] || colors.info}; color:white;
    padding:10px 22px; border-radius:50px;
    font-family:Rajdhani,sans-serif; font-size:0.95rem; font-weight:600;
    z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.3);
    animation:slideUp 0.3s ease; white-space:nowrap;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; setTimeout(() => toast.remove(), 400); }, 2500);
}

// ─── INIT EXTRAS ON DOM READY ─────────────────────────────────────────────────

// ─── UNIVERSITY QUESTION BANK ─────────────────────────────────────────────────
// SPPU S.E. Mechanical | 2019 Pattern | 2022–2025

const QBANK = [

  // UNIT I — Simple Stresses & Strains
  { id:'u1_q1', unit:1, marks:8, type:'insem', year:2025, paper:'Oct 2025 [6578]-59',
    question:'A stepped circular steel bar has three segments subjected to various axial forces. Determine force P at section C for equilibrium and find total elongation of the bar. E = 200 GPa.',
    given:{E:'200 GPa', type:'Stepped bar — equilibrium + elongation'},
    topic:'Stepped bar — equilibrium + elongation',
    drawDiagram: drawSteppedBar3Seg, solution: solveSteppedBar },

  { id:'u1_q2', unit:1, marks:7, type:'insem', year:2025, paper:'Oct 2025 [6578]-59',
    question:'A bar 100×50×250 mm: Tensile 400 kN along length (X), Compressive 400 kN on 100×250 faces (Y), Tensile 2000 kN on 50×250 faces (Z). E = 200 GPa, ν = 0.25. Find change in volume.',
    given:{dims:'100×50×250 mm', Fx:'400 kN T', Fy:'400 kN C', Fz:'2000 kN T', E:'200 GPa', nu:'0.25'},
    topic:'Triaxial stress — volumetric strain',
    drawDiagram: drawTriaxialBlock, solution: solveTriaxialVolume },

  { id:'u1_q3', unit:1, marks:8, type:'insem', year:2025, paper:'Oct 2025 [6578]-59',
    question:'A 270 kN load acts on a short RCC column 200×200 mm reinforced with 10 bars of 12 mm dia. Find stresses in steel and concrete. E_steel = 16.5 × E_concrete.',
    given:{P:'270 kN', col:'200×200 mm', bars:'10 bars φ12mm', m:'Es/Ec = 16.5'},
    topic:'Composite bar — RCC column',
    drawDiagram: drawRCCColumn, solution: solveRCCColumn },

  { id:'u1_q4', unit:1, marks:7, type:'insem', year:2025, paper:'Oct 2025 [6578]-59',
    question:'Rails 12 m long at 12°C with 3 mm gap. Find: (i) Max temperature for stress-free (ii) Stress if T rises 10°C beyond atmospheric. E = 200 GPa, α = 12×10⁻⁶/°C.',
    given:{L:'12 m', T0:'12°C', gap:'3 mm', E:'200 GPa', alpha:'12×10⁻⁶/°C'},
    topic:'Thermal stresses — rail track',
    drawDiagram: drawRailTrack, solution: solveRailThermal },

  { id:'u1_q5', unit:1, marks:7, type:'insem', year:2023, paper:'Oct 2023 [6186]-560',
    question:'Member ABCD — loads P₁=45 kN, P₃=450 kN, P₄=130 kN. Find P₂ for equilibrium and stress in each segment. E=2.1×10⁵ N/mm². AB: 900mm², BC: 400mm², CD: 625mm².',
    given:{P1:'45kN→', P3:'450kN→', P4:'130kN←', E:'2.1×10⁵ N/mm²', AB:'L=1m A=900mm²', BC:'L=2m A=400mm²', CD:'L=2m A=625mm²'},
    topic:'Stepped bar — internal forces + stress',
    drawDiagram: drawMemberABCD, solution: solveMemberABCD },

  { id:'u1_q6', unit:1, marks:8, type:'insem', year:2023, paper:'Oct 2023 [6186]-560',
    question:'Steel rod 2 m long at 30°C. Temperature raised to 150°C. Find: (i) Free expansion (ii) Stress if prevented (iii) Stress if 2 mm expansion permitted. α=12×10⁻⁶/°C, E=200 GPa.',
    given:{L:'2000 mm', deltaT:'120°C', alpha:'12×10⁻⁶/°C', E:'200 GPa', gap:'2 mm (case iii)'},
    topic:'Thermal stresses — steel rod',
    drawDiagram: drawThermalRod, solution: solveThermalRod },

  { id:'u1_q7', unit:1, marks:8, type:'insem', year:2024, paper:'Sept 2024 [6359]-559',
    question:'Steel block 360×80×160 mm: Tensile 1280 kN (X), Tensile 3456 kN (Y), Compressive 5184 kN (Z). E=2×10⁵ N/mm², ν=0.25. Find dimensional changes and change in volume.',
    given:{dims:'360×80×160 mm', Fx:'1280 kN T', Fy:'3456 kN T', Fz:'5184 kN C', E:'2×10⁵ N/mm²', nu:'0.25'},
    topic:'Triaxial stress — 3D strain and deformation',
    drawDiagram: drawTriaxialBlock, solution: solveTriaxial3D },

  { id:'u1_q8', unit:1, marks:8, type:'insem', year:2022, paper:'Oct 2022 [5931]-73',
    question:'Steel + aluminium composite bar at 60°C, fixed both ends. Temperature drops to 20°C. Find stresses: (i) Rigid ends (ii) Ends yield 0.25 mm. Es=2×10⁵, Ea=0.7×10⁵ N/mm², As=250mm², Aa=375mm².',
    given:{Ls:'250 mm', La:'300 mm', deltaT:'40°C drop', Es:'2×10⁵ N/mm²', Ea:'0.7×10⁵ N/mm²', As:'250mm²', Aa:'375mm²'},
    topic:'Composite bar — thermal stress (both rigid and yielding)',
    drawDiagram: drawCompositeBarThermal, solution: solveCompositeBarThermal },

  // UNIT II — SFD & BMD
  { id:'u2_q1', unit:2, marks:7, type:'insem', year:2023, paper:'Oct 2023 [6186]-560',
    question:'Cantilever AB 4 m long fixed at A. UDL 2 kN/m over 2 m from end B. Point load 3 kN at 1 m from A. Draw SFD and BMD. Find maximum values.',
    given:{type:'Cantilever', L:'4 m', UDL:'2 kN/m (2m from B)', P:'3 kN at 1m from A'},
    topic:'Cantilever — SFD & BMD (UDL + Point load)',
    drawDiagram: drawCantileverSFDBMD, solution: solveCantileverBeam },

  { id:'u2_q2', unit:2, marks:9, type:'endsem', year:2022, paper:'May/Jun 2022 [5869]-221',
    question:'Simply supported beam 8 m span. UDL 15 kN/m over full span. Point load 40 kN at 2 m from left support. Draw SFD and BMD. Find maximum BM and its position.',
    given:{type:'Simply Supported', L:'8 m', UDL:'15 kN/m (full span)', P:'40 kN at x=2m'},
    topic:'SS beam — UDL + Point load SFD/BMD',
    drawDiagram: drawSSBeamUDL, solution: solveSSBeamUDL },

  { id:'u2_q3', unit:2, marks:9, type:'endsem', year:2023, paper:'May/Jun 2023 [6002]-203',
    question:'Overhanging beam: supports A and B (span 6 m), overhang BC = 2 m. Point load 30 kN at C (overhang end), 20 kN at mid-span. UDL 10 kN/m on AB. Draw SFD, BMD. Find point of contraflexure.',
    given:{type:'Overhanging', AB:'6 m', BC:'2 m (overhang)', P_C:'30 kN at C', P_mid:'20 kN at 3m from A', UDL:'10 kN/m on AB'},
    topic:'Overhanging beam — SFD/BMD + contraflexure',
    drawDiagram: drawOverhangingBeam, solution: solveOverhangingBeam },

  { id:'u2_q4', unit:2, marks:7, type:'insem', year:2024, paper:'Sept 2024 [6359]-559',
    question:'Simply supported beam 10 m. Couple M₁=20 kN·m (CW) at 3 m from A and M₂=30 kN·m (ACW) at 7 m from A. Draw SFD and BMD. Find point of contraflexure.',
    given:{type:'Simply Supported', L:'10 m', M1:'20 kN·m CW at x=3m', M2:'30 kN·m ACW at x=7m'},
    topic:'SS beam — applied couples SFD/BMD',
    drawDiagram: drawBeamCouples, solution: solveBeamCouples },

  // UNIT III — Bending & Shear Stresses
  { id:'u3_q1', unit:3, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'T-section: Flange 180×30 mm, Web 200×30 mm. SS beam span 10 m. Loads 110 kN each at 2 m from each support. Find max bending stress, draw stress distribution, find stress 110 mm from bottom.',
    given:{flange:'180×30 mm', web:'200×30 mm', L:'10 m', P:'110 kN at x=2m and x=8m'},
    topic:'T-section — bending stress distribution',
    drawDiagram: drawTSectionBending, solution: solveTSectionBending },

  { id:'u3_q2', unit:3, marks:9, type:'endsem', year:2023, paper:'Nov/Dec 2023 [6179]-326',
    question:'T-section: Flange 200×50 mm, depth 250 mm, web 50 mm thick. Shear force F=100 kN, I_NA=1.134×10⁸ mm⁴. Find shear stress at NA and flange-web junction. Draw shear stress distribution.',
    given:{flange:'200×50 mm', depth:'250 mm', web:'50 mm thick', F:'100 kN', I:'1.134×10⁸ mm⁴'},
    topic:'T-section — shear stress distribution',
    drawDiagram: drawTSectionShear, solution: solveTSectionShear },

  { id:'u3_q3', unit:3, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'SS beam 8 m. Point loads: 60 kN at 2m, 80 kN at 4m, 50 kN at 6m from left support. Find slope at A and deflections under 60 kN and 80 kN loads. EI=2.668×10⁹ kN·mm².',
    given:{L:'8 m', P1:'60 kN at 2m', P2:'80 kN at 4m', P3:'50 kN at 6m', EI:'2.668×10⁹ kN·mm²'},
    topic:'SS beam — slope and deflection (Macaulay method)',
    drawDiagram: drawSSBeamDeflection, solution: solveSSBeamDeflection },

  { id:'u3_q4', unit:3, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'Cantilever 2 m. UDL 10 kN/m over 1 m from fixed end. Point load 20 kN at free end. Find maximum slope and deflection at free end. EI=2×10³ kN·m².',
    given:{L:'2 m', UDL:'10 kN/m (0 to 1m from fixed)', P:'20 kN at free end', EI:'2×10³ kN·m²'},
    topic:'Cantilever — slope and deflection (superposition)',
    drawDiagram: drawCantileverDeflection, solution: solveCantileverDeflection },

  { id:'u3_q5', unit:3, marks:9, type:'endsem', year:2024, paper:'May/Jun 2024 [6261]-124',
    question:'Hollow rectangular beam: Square section 120×120 mm, thickness 20 mm. Shear force F=125 kN. Calculate max shear stress and draw shear stress distribution.',
    given:{outer:'120×120 mm', thickness:'20 mm', inner:'80×80 mm', F:'125 kN'},
    topic:'Hollow rectangular section — shear stress',
    drawDiagram: drawHollowRectShear, solution: solveHollowRectShear },

  // UNIT IV — Torsion & Buckling
  { id:'u4_q1', unit:4, marks:9, type:'endsem', year:2022, paper:'May/Jun 2022 [5869]-221',
    question:'Find max torque on solid shaft d=20 mm, τ_allow=65 N/mm². Compare with hollow shaft of same cross-sectional area with d_i=d_o/2. Find torque hollow shaft can carry.',
    given:{d_solid:'20 mm', tau:'65 N/mm²', condition:'Same cross-sectional area', di_ratio:'d_i = d_o/2'},
    topic:'Solid vs Hollow shaft — torsion comparison',
    drawDiagram: drawSolidHollowShaft, solution: solveSolidHollowTorque },

  { id:'u4_q2', unit:4, marks:9, type:'endsem', year:2024, paper:'May/Jun 2024 [6261]-124',
    question:'Design diameter of solid shaft transmitting 300 kW at 400 rpm. Conditions: τ_max ≤ 40 N/mm² AND twist ≤ 1° in 3 m length. G=1×10⁵ N/mm².',
    given:{P:'300 kW', N:'400 rpm', tau:'40 N/mm²', theta:'1° in 3 m', G:'1×10⁵ N/mm²'},
    topic:'Solid shaft design — power transmission (dual criteria)',
    drawDiagram: drawShaftDesign, solution: solveShaftDesign },

  { id:'u4_q3', unit:4, marks:9, type:'endsem', year:2023, paper:'May/Jun 2023 [6002]-203',
    question:'Hollow shaft d_i/d_o=3/5 transmits 450 kW at 120 rpm. τ≤60 N/mm², twist≤1° in 2.5 m. G=8×10⁴ N/mm². Find external diameter.',
    given:{ratio:'d_i/d_o = 3/5', P:'450 kW', N:'120 rpm', tau:'60 N/mm²', theta:'1° in 2.5m', G:'8×10⁴ N/mm²'},
    topic:'Hollow shaft design — combined shear + twist criteria',
    drawDiagram: drawShaftDesign, solution: solveHollowShaftDesign },

  { id:'u4_q4', unit:4, marks:9, type:'endsem', year:2024, paper:'May/Jun 2024 [6261]-124',
    question:'Rectangular steel bar 40×50 mm, both ends pinned, length 2 m. E=200 GPa. Find Euler\'s critical buckling load and corresponding critical stress.',
    given:{b:'40 mm', d:'50 mm', L:'2000 mm', ends:'Both Pinned (K=1)', E:'200 GPa'},
    topic:"Euler's buckling — rectangular section",
    drawDiagram: drawColumnBuckling, solution: solveEulerBuckling },

  { id:'u4_q5', unit:4, marks:8, type:'endsem', year:2023, paper:'May/Jun 2023 [6002]-203',
    question:'4 m tube: buckling load = 2 kN (both ends hinged). For 4.5 m tube find buckling load for: (i) Both fixed (ii) Fixed-Hinged (iii) Fixed-Free.',
    given:{L1:'4 m', Pcr1:'2 kN (both pinned)', L2:'4.5 m', endConds:'3 cases'},
    topic:"Euler buckling — end condition comparison",
    drawDiagram: drawBucklingEndConditions, solution: solveBucklingEndConditions },

  { id:'u4_q6', unit:4, marks:9, type:'endsem', year:2023, paper:'May/Jun 2023 [6002]-203',
    question:'Composite shaft: Copper rod 20 mm dia inside steel tube (OD=60mm, thickness=20mm). Total torque T=1200 N·m. Equal twist condition. G_steel=2×G_copper. Find shear stresses in each.',
    given:{d_cu:'20 mm', OD_st:'60 mm', thick:'20 mm', T:'1200 N·m', G_ratio:'G_s = 2G_c'},
    topic:'Composite shaft — torsion with equal twist',
    drawDiagram: drawCompositeShaft, solution: solveCompositeShaft },

  // UNIT V — Principal Stresses & Theories of Failure
  { id:'u5_q1', unit:5, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'At a point: σx=110 MPa (T), σy=60 MPa (T), τxy=70 MPa. Find: (i) Principal stresses (ii) Max shear stress (iii) Angle of principal plane (iv) Angle of max shear stress plane. Analytical method.',
    given:{sx:'110 MPa (T)', sy:'60 MPa (T)', txy:'70 MPa', method:'Analytical'},
    topic:'Stress transformation — principal stresses (analytical)',
    drawDiagram: drawStressElement, solution: solvePrincipalStresses },

  { id:'u5_q2', unit:5, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'At a point: σx=30 MPa (T), σy=70 MPa (T), τxy=20 MPa. Determine principal stresses and their planes using Mohr\'s Circle method only.',
    given:{sx:'30 MPa (T)', sy:'70 MPa (T)', txy:'20 MPa', method:"Mohr's Circle"},
    topic:"Mohr's Circle — principal stresses",
    drawDiagram: drawMohrsCircleDiagram, solution: solveMohrsCircleAnalytical },

  { id:'u5_q3', unit:5, marks:9, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'Solid circular shaft: M=45 kN·m, T=15 kN·m. Design diameter using: (i) Max principal stress theory (ii) Max shear stress theory (iii) Max strain energy theory. μ=0.25, σ_el=200 MPa, FOS=2.',
    given:{M:'45 kN·m', T:'15 kN·m', mu:'0.25', sigma_el:'200 MPa', FOS:'2'},
    topic:'Shaft design — theories of elastic failure',
    drawDiagram: drawShaftLoadings, solution: solveShaftTheories },

  { id:'u5_q4', unit:5, marks:9, type:'endsem', year:2025, paper:'Nov/Dec 2025 [6582]-124',
    question:'Principal stresses σ₁=80 N/mm² and σ₂=40 N/mm². Find normal stress, shear stress, resultant stress and obliquity on plane inclined at 20° with major principal plane. Use Mohr\'s circle.',
    given:{sigma1:'80 N/mm²', sigma2:'40 N/mm²', theta:'20°', method:"Mohr's Circle"},
    topic:"Mohr's Circle — stresses on inclined plane (principal stresses given)",
    drawDiagram: drawMohrsCirclePrincipal, solution: solveMohrsCirclePrincipal },

  { id:'u5_q5', unit:5, marks:8, type:'endsem', year:2022, paper:'Nov/Dec 2022 [5925]-302',
    question:'Column 300×200 mm carries eccentric load 500 kN at eccentricity ex=50 mm, ey=75 mm. Determine stress resultants at all four corners A, B, C, D.',
    given:{P:'500 kN', b:'300 mm', d:'200 mm', ex:'50 mm', ey:'75 mm'},
    topic:'Eccentric loading — column corner stresses',
    drawDiagram: drawEccentricColumn, solution: solveEccentricColumn },

  { id:'u5_q6', unit:5, marks:9, type:'endsem', year:2023, paper:'Nov/Dec 2023 [6179]-326',
    question:'σx=110 N/mm² (T), σy=47 N/mm² (T), τxy=63 N/mm². Find: (i) Normal, tangential and resultant stress on plane at 30° to the 110 MPa plane. (ii) Principal stresses and their directions. Analytical method.',
    given:{sx:'110 MPa (T)', sy:'47 MPa (T)', txy:'63 MPa', theta:'30°', method:'Analytical'},
    topic:'Stress on oblique plane + principal stresses (analytical)',
    drawDiagram: drawStressElement, solution: solveObliqueStress },

  { id:'u5_q7', unit:5, marks:9, type:'endsem', year:2025, paper:'Nov/Dec 2025 [6582]-124',
    question:'Hollow rectangular column: External 600×550 mm, Internal 500×450 mm. Vertical load 110 kN at outer edge on X-axis. Calculate maximum and minimum stress intensities.',
    given:{ext:'600×550 mm', int:'500×450 mm', P:'110 kN', pos:'Outer edge on X-axis (ex=300mm)'},
    topic:'Eccentric loading — hollow rectangular section',
    drawDiagram: drawHollowColumnEccentric, solution: solveHollowColumnEccentric },
];

// ─── DIAGRAM DRAWING FUNCTIONS ─────────────────────────────────────────────────

function drawSteppedBar3Seg(canvas) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const segs = [{L:80,d:30,color:'#00d4ff'},{L:100,d:20,color:'#7b2fff'},{L:60,d:25,color:'#00ff9d'}];
  const labels = ['A','B','C','D'];
  let x = 30; const cy = H/2;
  ctx.font = '10px Space Mono'; ctx.textAlign = 'center';
  segs.forEach((s,i) => {
    const h = s.d*1.6;
    ctx.fillStyle = s.color+'22'; ctx.strokeStyle = s.color; ctx.lineWidth=1.5;
    ctx.fillRect(x,cy-h/2,s.L,h); ctx.strokeRect(x,cy-h/2,s.L,h);
    ctx.fillStyle='#8899bb'; ctx.fillText('d'+String.fromCharCode(8321+i)+'='+s.d, x+s.L/2, cy-h/2-5);
    ctx.fillStyle=s.color; ctx.fillText(labels[i], x, cy+h/2+13);
    x += s.L;
  });
  ctx.fillStyle='#8899bb'; ctx.fillText(labels[3], x, cy+26);
  const forces=[{ax:30,dir:1,col:'#ff6b35',lbl:'F₁'},{ax:110,dir:-1,col:'#ff4757',lbl:'P'},{ax:210,dir:-1,col:'#ffd32a',lbl:'F₃'},{ax:270,dir:1,col:'#00ff9d',lbl:'F₄'}];
  forces.forEach(({ax,dir,col,lbl}) => {
    ctx.fillStyle=col; ctx.strokeStyle=col; ctx.lineWidth=2;
    ctx.fillText(lbl, ax, H-6);
    ctx.beginPath(); ctx.moveTo(ax-dir*28,cy); ctx.lineTo(ax+dir*28,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax+dir*28,cy); ctx.lineTo(ax+dir*20,cy-5); ctx.lineTo(ax+dir*20,cy+5); ctx.fill();
  });
}

function drawTriaxialBlock(canvas) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx=W/2, cy=H/2, bw=88, bh=52, bd=24;
  ctx.strokeStyle='#00d4ff'; ctx.lineWidth=2; ctx.fillStyle='rgba(0,212,255,0.07)';
  ctx.fillRect(cx-bw/2,cy-bh/2,bw,bh); ctx.strokeRect(cx-bw/2,cy-bh/2,bw,bh);
  ctx.beginPath(); ctx.moveTo(cx-bw/2,cy-bh/2); ctx.lineTo(cx-bw/2+bd,cy-bh/2-bd);
  ctx.lineTo(cx+bw/2+bd,cy-bh/2-bd); ctx.lineTo(cx+bw/2,cy-bh/2); ctx.closePath();
  ctx.fillStyle='rgba(0,212,255,0.04)'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+bw/2,cy-bh/2); ctx.lineTo(cx+bw/2+bd,cy-bh/2-bd);
  ctx.lineTo(cx+bw/2+bd,cy+bh/2-bd); ctx.lineTo(cx+bw/2,cy+bh/2); ctx.closePath();
  ctx.fillStyle='rgba(0,212,255,0.03)'; ctx.fill(); ctx.stroke();
  const aw=34;
  ctx.strokeStyle='#ff6b35'; ctx.fillStyle='#ff6b35'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx+bw/2,cy); ctx.lineTo(cx+bw/2+aw,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+bw/2+aw,cy); ctx.lineTo(cx+bw/2+aw-8,cy-5); ctx.lineTo(cx+bw/2+aw-8,cy+5); ctx.fill();
  ctx.font='9px Space Mono'; ctx.textAlign='center'; ctx.fillText('σx',cx+bw/2+aw+13,cy+3);
  ctx.strokeStyle='#7b2fff'; ctx.fillStyle='#7b2fff';
  ctx.beginPath(); ctx.moveTo(cx,cy-bh/2); ctx.lineTo(cx,cy-bh/2-aw); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-bh/2-aw); ctx.lineTo(cx-5,cy-bh/2-aw+8); ctx.lineTo(cx+5,cy-bh/2-aw+8); ctx.fill();
  ctx.fillText('σy',cx,cy-bh/2-aw-8);
  ctx.strokeStyle='#ff4757'; ctx.fillStyle='#ff4757';
  ctx.beginPath(); ctx.moveTo(cx-bw/2,cy); ctx.lineTo(cx-bw/2-aw,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-bw/2,cy); ctx.lineTo(cx-bw/2-8,cy-5); ctx.lineTo(cx-bw/2-8,cy+5); ctx.fill();
  ctx.fillText('σz(C)',cx-bw/2-aw-16,cy+3);
}

function drawRCCColumn(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H*0.52,sw=78,sh=95;
  ctx.fillStyle='rgba(136,136,136,0.25)'; ctx.strokeStyle='#8899bb'; ctx.lineWidth=2;
  ctx.fillRect(cx-sw/2,cy-sh/2,sw,sh); ctx.strokeRect(cx-sw/2,cy-sh/2,sw,sh);
  const bpos=[[-26,-36],[-13,-36],[0,-36],[13,-36],[26,-36],[-26,36],[-13,36],[0,36],[13,36],[26,36]];
  bpos.forEach(([bx,by]) => {
    ctx.beginPath(); ctx.arc(cx+bx,cy+by,4,0,Math.PI*2);
    ctx.fillStyle='#ffd32a'; ctx.fill(); ctx.strokeStyle='#ff6b35'; ctx.lineWidth=1; ctx.stroke();
  });
  ctx.strokeStyle='#ff6b35'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(cx,cy-sh/2-34); ctx.lineTo(cx,cy-sh/2-2); ctx.stroke();
  ctx.fillStyle='#ff6b35';
  ctx.beginPath(); ctx.moveTo(cx,cy-sh/2); ctx.lineTo(cx-8,cy-sh/2-13); ctx.lineTo(cx+8,cy-sh/2-13); ctx.fill();
  ctx.font='10px Space Mono'; ctx.textAlign='center';
  ctx.fillText('P=270kN',cx,cy-sh/2-40);
  ctx.fillStyle='#8899bb'; ctx.font='8px Space Mono';
  ctx.fillText('200×200mm',cx,cy+sh/2+13);
  ctx.fillText('10 bars φ12mm (yellow)',cx,H-5);
}

function drawRailTrack(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const y1=H*0.3,y2=H*0.62,rH=14,rW=152,gap=10;
  [y1,y2].forEach(ry => {
    ctx.fillStyle='rgba(136,153,187,0.28)'; ctx.strokeStyle='#8899bb'; ctx.lineWidth=1.5;
    ctx.fillRect(38,ry,rW,rH); ctx.strokeRect(38,ry,rW,rH);
    ctx.fillStyle='#ffd32a'; ctx.fillRect(38+rW,ry,gap,rH);
    ctx.strokeStyle='#ffd32a'; ctx.lineWidth=1; ctx.strokeRect(38+rW,ry,gap,rH);
    ctx.fillStyle='rgba(136,153,187,0.25)'; ctx.strokeStyle='#8899bb'; ctx.lineWidth=1.5;
    ctx.fillRect(38+rW+gap,ry,48,rH); ctx.strokeRect(38+rW+gap,ry,48,rH);
  });
  for(let sx=58; sx<248; sx+=38) { ctx.fillStyle='#4a3a2a'; ctx.fillRect(sx,y1+rH,10,y2-y1-rH); }
  ctx.fillStyle='#8899bb'; ctx.font='9px Space Mono'; ctx.textAlign='center';
  ctx.fillText('L = 12 m',38+rW/2,y1-8);
  ctx.fillStyle='#ffd32a'; ctx.fillText('gap=3mm',38+rW+gap/2,y1-22);
  ctx.fillStyle='#00d4ff'; ctx.font='8px Space Mono';
  ctx.fillText('α=12×10⁻⁶/°C  E=200GPa  T₀=12°C',W/2,H-5);
}

function drawMemberABCD(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cy=H/2,segs=[{L:68,col:'#00d4ff',lbl:'AB',A:'900'},{L:105,col:'#7b2fff',lbl:'BC',A:'400'},{L:82,col:'#00ff9d',lbl:'CD',A:'625'}];
  const pts=['A','B','C','D'];
  let x=18; const xs=[18];
  segs.forEach(s => {
    const h=20;
    ctx.fillStyle=s.col+'22'; ctx.strokeStyle=s.col; ctx.lineWidth=1.5;
    ctx.fillRect(x,cy-h,s.L,h*2); ctx.strokeRect(x,cy-h,s.L,h*2);
    ctx.fillStyle='#8899bb'; ctx.font='8px Space Mono'; ctx.textAlign='center';
    ctx.fillText(s.lbl,x+s.L/2,cy+h+11); ctx.fillText(s.A+'mm²',x+s.L/2,cy-h-5);
    x+=s.L; xs.push(x);
  });
  const forces=[['F₁','→','#ff6b35'],['P₂','←','#ff4757'],['F₃','→','#ffd32a'],['F₄','←','#00ff9d']];
  pts.forEach((p,i)=>{
    const [lbl,dir,col]=forces[i];
    ctx.fillStyle=col; ctx.strokeStyle=col; ctx.lineWidth=2; ctx.font='9px Space Mono'; ctx.textAlign='center';
    ctx.fillText(lbl,xs[i],H-5);
    const d=dir==='→'?1:-1, aw=24;
    ctx.beginPath(); ctx.moveTo(xs[i]+d*4,cy); ctx.lineTo(xs[i]+d*aw,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xs[i]+d*aw,cy); ctx.lineTo(xs[i]+d*(aw-7),cy-5); ctx.lineTo(xs[i]+d*(aw-7),cy+5); ctx.fill();
  });
}

function drawThermalRod(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cy=H*0.38,rodH=18;
  // Walls
  [[18,true],[W-34,false]].forEach(([wx,isLeft]) => {
    ctx.fillStyle='#2a3a5a'; ctx.fillRect(isLeft?wx:wx,cy-38,16,76);
    ctx.strokeStyle='#4a5a7a'; ctx.lineWidth=1.5; ctx.strokeRect(isLeft?wx:wx,cy-38,16,76);
    for(let hy=cy-36;hy<cy+36;hy+=10) { ctx.beginPath(); ctx.moveTo(isLeft?wx:wx+16,hy); ctx.lineTo(isLeft?wx-8:wx+24,hy+8); ctx.stroke(); }
  });
  // Rod
  ctx.fillStyle='rgba(0,212,255,0.18)'; ctx.strokeStyle='#00d4ff'; ctx.lineWidth=2;
  ctx.fillRect(34,cy-rodH/2,W-68,rodH); ctx.strokeRect(34,cy-rodH/2,W-68,rodH);
  ctx.fillStyle='#ff6b35'; ctx.font='11px Space Mono'; ctx.textAlign='center';
  ctx.fillText('🌡 30°C → 150°C (ΔT=120°C)',W/2,cy+rodH/2+16);
  ctx.strokeStyle='#ffd32a'; ctx.lineWidth=2; ctx.setLineDash([4,6]);
  ctx.beginPath(); ctx.moveTo(W-34,cy); ctx.lineTo(W-34+28,cy); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='#ffd32a'; ctx.font='8px Space Mono'; ctx.fillText('δ_free→',W-34+34,cy+3);
  ctx.fillStyle='#8899bb'; ctx.font='8px Space Mono';
  ctx.fillText('L=2000mm  d=16mm  α=12×10⁻⁶/°C  E=200GPa',W/2,H-5);
}

function drawCompositeBarThermal(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cy=H/2,stL=110,alL=130,bH=20,sx=(W-(stL+alL))/2;
  ctx.fillStyle='rgba(0,212,255,0.18)'; ctx.strokeStyle='#00d4ff'; ctx.lineWidth=2;
  ctx.fillRect(sx,cy-bH/2,stL,bH); ctx.strokeRect(sx,cy-bH/2,stL,bH);
  ctx.fillStyle='#00d4ff'; ctx.font='9px Space Mono'; ctx.textAlign='center';
  ctx.fillText('STEEL',sx+stL/2,cy+3); ctx.fillText('L=250mm',sx+stL/2,cy+bH/2+11);
  ctx.fillStyle='rgba(123,47,255,0.18)'; ctx.strokeStyle='#7b2fff'; ctx.lineWidth=2;
  ctx.fillRect(sx+stL,cy-bH*0.6,alL,bH*1.2); ctx.strokeRect(sx+stL,cy-bH*0.6,alL,bH*1.2);
  ctx.fillStyle='#7b2fff';
  ctx.fillText('ALUMINIUM',sx+stL+alL/2,cy+3); ctx.fillText('L=300mm',sx+stL+alL/2,cy+bH*0.6+11);
  [[sx-14,true],[sx+stL+alL,false]].forEach(([wx,isLeft]) => {
    ctx.fillStyle='#2a3a5a'; ctx.fillRect(isLeft?wx:wx,cy-38,14,76);
    ctx.strokeStyle='#4a5a7a'; ctx.lineWidth=1; ctx.strokeRect(isLeft?wx:wx,cy-38,14,76);
    for(let hy=cy-36;hy<cy+36;hy+=10) { ctx.beginPath(); ctx.moveTo(isLeft?wx:wx+14,hy); ctx.lineTo(isLeft?wx-8:wx+22,hy+8); ctx.stroke(); }
  });
  ctx.fillStyle='#ff6b35'; ctx.font='8px Space Mono'; ctx.textAlign='center';
  ctx.fillText('ΔT=40°C drop | bars try to contract → tensile stress',W/2,H-5);
}

function drawCantileverSFDBMD(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const lx=46,rx=W-28,beamY=H*0.22,bH=11,L=rx-lx;
  // Fixed wall
  ctx.fillStyle='#2a3a5a'; ctx.fillRect(lx-16,beamY-32,16,64);
  ctx.strokeStyle='#4a5a7a'; ctx.lineWidth=1.2; ctx.strokeRect(lx-16,beamY-32,16,64);
  for(let hy=beamY-30;hy<beamY+30;hy+=10){ctx.beginPath();ctx.moveTo(lx-16,hy);ctx.lineTo(lx-24,hy+8);ctx.stroke();}
  // Beam
  ctx.fillStyle='rgba(0,212,255,0.14)'; ctx.strokeStyle='#00d4ff'; ctx.lineWidth=1.8;
  ctx.fillRect(lx,beamY-bH/2,L,bH); ctx.strokeRect(lx,beamY-bH/2,L,bH);
  // Point load at 1m (L/4)
  const px=lx+L*0.25;
  ctx.strokeStyle='#ff6b35'; ctx.fillStyle='#ff6b35'; ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(px,beamY-bH/2-26);ctx.lineTo(px,beamY-bH/2-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(px,beamY-bH/2);ctx.lineTo(px-6,beamY-bH/2-10);ctx.lineTo(px+6,beamY-bH/2-10);ctx.fill();
  ctx.font='8px Space Mono'; ctx.textAlign='center'; ctx.fillText('3kN',px,beamY-bH/2-30);
  // UDL on right half
  const us=lx+L*0.5,ue=rx;
  ctx.strokeStyle='#7b2fff'; ctx.lineWidth=1;
  for(let ux=us;ux<=ue;ux+=9){ctx.beginPath();ctx.moveTo(ux,beamY-bH/2-15);ctx.lineTo(ux,beamY-bH/2-2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(us,beamY-bH/2-15);ctx.lineTo(ue,beamY-bH/2-15);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.fillText('2kN/m',(us+ue)/2,beamY-bH/2-20);
  // Labels
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';
  ctx.fillText('A(fixed)',lx,beamY+bH/2+28); ctx.fillText('B(free)',rx,beamY+bH/2+28);
  ctx.fillText('1m',lx+L*0.125,beamY+bH/2+14); ctx.fillText('1m',lx+L*0.375,beamY+bH/2+14); ctx.fillText('2m(UDL)',lx+L*0.75,beamY+bH/2+14);
  // Simple SFD/BMD sketch
  const sy=H*0.65,sh=22;
  ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(136,153,187,0.3)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(lx,sy);ctx.lineTo(rx,sy);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(lx,sy-sh);ctx.lineTo(px,sy-sh);ctx.lineTo(px,sy-sh*0.55);ctx.lineTo(us,sy-sh*0.55);ctx.lineTo(rx,sy);ctx.stroke();
  ctx.fillStyle='#00d4ff';ctx.font='7px Space Mono';ctx.textAlign='left';ctx.fillText('SFD',lx,sy-sh-3);
  const by=H*0.88,bh2=20;
  ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(136,153,187,0.3)';
  ctx.beginPath();ctx.moveTo(lx,by);ctx.lineTo(rx,by);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#ff6b35';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(lx,by-bh2);ctx.lineTo(px,by-bh2*0.6);ctx.quadraticCurveTo(us,by-bh2*0.2,rx,by);ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.fillText('BMD',lx,by-bh2-3);
}

function drawSSBeamUDL(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const lx=36,rx=W-36,by=H*0.28,bh=11,L=rx-lx;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(lx,by-bh/2,L,bh);ctx.strokeRect(lx,by-bh/2,L,bh);
  [[lx],[rx]].forEach(([sx])=>{ctx.fillStyle='#4a5a7a';ctx.strokeStyle='#8899bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx,by+bh/2);ctx.lineTo(sx-10,by+bh/2+17);ctx.lineTo(sx+10,by+bh/2+17);ctx.closePath();ctx.fill();ctx.stroke();});
  for(let ux=lx;ux<=rx;ux+=9){ctx.strokeStyle='#7b2fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ux,by-bh/2-15);ctx.lineTo(ux,by-bh/2-2);ctx.stroke();}
  ctx.strokeStyle='#7b2fff';ctx.beginPath();ctx.moveTo(lx,by-bh/2-15);ctx.lineTo(rx,by-bh/2-15);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.font='9px Space Mono';ctx.textAlign='center';ctx.fillText('w=15kN/m',W/2,by-bh/2-22);
  const pxc=lx+L*0.25;
  ctx.strokeStyle='#ff6b35';ctx.fillStyle='#ff6b35';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(pxc,by-bh/2-44);ctx.lineTo(pxc,by-bh/2-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pxc,by-bh/2);ctx.lineTo(pxc-6,by-bh/2-11);ctx.lineTo(pxc+6,by-bh/2-11);ctx.fill();
  ctx.fillText('40kN',pxc,by-bh/2-50);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';
  ctx.fillText('A',lx,by+bh/2+30);ctx.fillText('B',rx,by+bh/2+30);ctx.fillText('2m',lx+L*0.125,H-5);ctx.fillText('Span=8m',W/2,H-5);
  // SFD/BMD
  const sy=H*0.7,sh=26,bmy=H*0.9,bmh=22;
  ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(136,153,187,0.3)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(lx,sy);ctx.lineTo(rx,sy);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(lx,sy-sh);ctx.lineTo(pxc,sy-sh*0.62);ctx.lineTo(pxc,sy-sh*0.24);ctx.lineTo(rx,sy+sh*0.28);ctx.stroke();
  ctx.fillStyle='#00d4ff';ctx.font='7px Space Mono';ctx.textAlign='left';ctx.fillText('SFD',lx,sy-sh-3);
  ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(136,153,187,0.3)';ctx.beginPath();ctx.moveTo(lx,bmy);ctx.lineTo(rx,bmy);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#ff6b35';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(lx,bmy);ctx.quadraticCurveTo(W/2,bmy-bmh,rx,bmy);ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.fillText('BMD',lx,bmy-bmh-3);
}

function drawOverhangingBeam(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const ax=28,L=W-58,Bx=ax+L*0.6,Cx=ax+L,by=H*0.3,bh=11;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(ax,by-bh/2,L,bh);ctx.strokeRect(ax,by-bh/2,L,bh);
  [[ax,'A'],[Bx,'B']].forEach(([sx,lbl])=>{ctx.fillStyle='#4a5a7a';ctx.strokeStyle='#8899bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx,by+bh/2);ctx.lineTo(sx-10,by+bh/2+16);ctx.lineTo(sx+10,by+bh/2+16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,sx,by+bh/2+28);});
  for(let ux=ax;ux<=Bx;ux+=9){ctx.strokeStyle='#7b2fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ux,by-bh/2-14);ctx.lineTo(ux,by-bh/2-2);ctx.stroke();}
  ctx.strokeStyle='#7b2fff';ctx.beginPath();ctx.moveTo(ax,by-bh/2-14);ctx.lineTo(Bx,by-bh/2-14);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('10kN/m',(ax+Bx)/2,by-bh/2-20);
  ctx.strokeStyle='#ff4757';ctx.fillStyle='#ff4757';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(Cx,by-bh/2-36);ctx.lineTo(Cx,by-bh/2-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(Cx,by-bh/2);ctx.lineTo(Cx-6,by-bh/2-11);ctx.lineTo(Cx+6,by-bh/2-11);ctx.fill();
  ctx.fillText('30kN',Cx,by-bh/2-42);ctx.fillText('C',Cx,by+bh/2+14);
  const mx=(ax+Bx)/2;
  ctx.strokeStyle='#ffd32a';ctx.fillStyle='#ffd32a';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(mx,by-bh/2-28);ctx.lineTo(mx,by-bh/2-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mx,by-bh/2);ctx.lineTo(mx-5,by-bh/2-10);ctx.lineTo(mx+5,by-bh/2-10);ctx.fill();
  ctx.fillText('20kN',mx,by-bh/2-34);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.fillText('←6m→|←2m→',W/2,H-5);
}

function drawBeamCouples(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const lx=36,rx=W-36,by=H*0.4,bh=11,L=rx-lx;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(lx,by-bh/2,L,bh);ctx.strokeRect(lx,by-bh/2,L,bh);
  [[lx],[rx]].forEach(([sx])=>{ctx.fillStyle='#4a5a7a';ctx.strokeStyle='#8899bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx,by+bh/2);ctx.lineTo(sx-10,by+bh/2+15);ctx.lineTo(sx+10,by+bh/2+15);ctx.closePath();ctx.fill();ctx.stroke();});
  [[L*0.3,'20kN·m','#ff6b35','CW'],[L*0.7,'30kN·m','#7b2fff','ACW']].forEach(([dx,lbl,col,dir])=>{
    const mx=lx+dx,r=17;
    ctx.strokeStyle=col;ctx.lineWidth=2;
    if(dir==='CW'){ctx.beginPath();ctx.arc(mx,by-r-6,r,-Math.PI*0.75,Math.PI*0.25);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(mx,by-r-6,r,Math.PI*0.25,-Math.PI*0.75,true);ctx.stroke();}
    ctx.fillStyle=col;ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,mx,by-r-30);ctx.fillText(dir,mx,by+bh/2+13);
  });
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('Span=10m | A─────3m─────M₁─────4m─────M₂─────3m─────B',W/2,H-5);
}

function drawTSectionBending(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W*0.35,top=14,fw=88,fh=14,ww=14,wh=96;
  ctx.fillStyle='rgba(0,212,255,0.14)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(cx-fw/2,top,fw,fh);ctx.strokeRect(cx-fw/2,top,fw,fh);
  ctx.fillRect(cx-ww/2,top+fh,ww,wh);ctx.strokeRect(cx-ww/2,top+fh,ww,wh);
  const NAy=top+fh+wh*0.66;
  ctx.setLineDash([4,6]);ctx.strokeStyle='#ffd32a';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(cx-fw/2-12,NAy);ctx.lineTo(cx+fw/2+52,NAy);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ffd32a';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('N.A.',cx+fw/2+14,NAy+3);
  const maxW=44,top_s=((NAy-top)/(top+fh+wh-top))*maxW;
  ctx.strokeStyle='#ff4757';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(cx+fw/2,top);ctx.lineTo(cx+fw/2+top_s,top);ctx.lineTo(cx+fw/2,NAy);ctx.stroke();
  ctx.strokeStyle='#00ff9d';
  ctx.beginPath();ctx.moveTo(cx+fw/2,NAy);ctx.lineTo(cx+fw/2+maxW,top+fh+wh);ctx.lineTo(cx+fw/2,top+fh+wh);ctx.stroke();
  ctx.fillStyle='#ff4757';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('σc(top)',cx+fw/2+top_s+3,top+4);
  ctx.fillStyle='#00ff9d';ctx.fillText('σt(bot)',cx+fw/2+maxW+3,top+fh+wh-2);
  ctx.fillStyle='#8899bb';ctx.textAlign='center';ctx.font='8px Space Mono';
  ctx.fillText('180mm',cx,top-5);ctx.fillText('30',cx-fw/2-18,top+fh/2+3);ctx.fillText('200mm',cx-fw/2-32,top+fh+wh/2);
}

function drawTSectionShear(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W*0.38,top=12,fw=96,fh=22,ww=22,wh=96;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(cx-fw/2,top,fw,fh);ctx.strokeRect(cx-fw/2,top,fw,fh);
  ctx.fillRect(cx-ww/2,top+fh,ww,wh);ctx.strokeRect(cx-ww/2,top+fh,ww,wh);
  const NAy=top+fh+wh*0.6;
  ctx.setLineDash([4,6]);ctx.strokeStyle='#ffd32a';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(cx-fw/2-10,NAy);ctx.lineTo(cx+fw/2+52,NAy);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ffd32a';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('N.A.',cx+fw/2+14,NAy+3);
  const maxW=46;
  ctx.strokeStyle='#7b2fff';ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<=38;i++){const y=top+(top+fh+wh-top)*i/38;const yf=(y-NAy)/(top+fh+wh-NAy);const tau=maxW*(1-yf*yf);const xp=cx+fw/2+(tau>0?tau:tau*ww/fw);if(i===0)ctx.moveTo(xp,y);else ctx.lineTo(xp,y);}
  ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('τ_max at NA',cx+fw/2+maxW+3,NAy+3);ctx.fillText('τ at junction',cx+fw/2+14,top+fh+4);
  ctx.fillStyle='#8899bb';ctx.textAlign='center';ctx.fillText('200mm',cx,top-5);ctx.fillText('F=100kN↓',cx,H-5);
}

function drawSSBeamDeflection(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const lx=32,rx=W-32,by=H*0.28,bh=10,L=rx-lx;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(lx,by-bh/2,L,bh);ctx.strokeRect(lx,by-bh/2,L,bh);
  ctx.strokeStyle='rgba(0,212,255,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([4,7]);
  ctx.beginPath();ctx.moveTo(lx,by);ctx.quadraticCurveTo(W/2,by+26,rx,by);ctx.stroke();ctx.setLineDash([]);
  [[lx],[rx]].forEach(([sx])=>{ctx.fillStyle='#4a5a7a';ctx.strokeStyle='#8899bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx,by+bh/2);ctx.lineTo(sx-10,by+bh/2+16);ctx.lineTo(sx+10,by+bh/2+16);ctx.closePath();ctx.fill();ctx.stroke();});
  [[L/4,'60kN','#ff6b35'],[L/2,'80kN','#7b2fff'],[3*L/4,'50kN','#ffd32a']].forEach(([dx,lbl,col])=>{
    const px=lx+dx;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(px,by-bh/2-28);ctx.lineTo(px,by-bh/2-2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(px,by-bh/2);ctx.lineTo(px-5,by-bh/2-10);ctx.lineTo(px+5,by-bh/2-10);ctx.fill();
    ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,px,by-bh/2-33);
  });
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';
  ctx.fillText('2m|2m|2m|2m  Span=8m  EI=2.668×10⁹kN·mm²',W/2,H-5);
}

function drawCantileverDeflection(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const lx=44,rx=W-36,by=H*0.35,bh=11,L=rx-lx;
  ctx.fillStyle='#2a3a5a';ctx.fillRect(lx-16,by-36,16,72);ctx.strokeStyle='#4a5a7a';ctx.lineWidth=1.2;ctx.strokeRect(lx-16,by-36,16,72);
  for(let hy=by-34;hy<by+34;hy+=10){ctx.beginPath();ctx.moveTo(lx-16,hy);ctx.lineTo(lx-24,hy+8);ctx.stroke();}
  ctx.fillStyle='rgba(0,212,255,0.14)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.8;
  ctx.fillRect(lx,by-bh/2,L,bh);ctx.strokeRect(lx,by-bh/2,L,bh);
  ctx.strokeStyle='rgba(0,212,255,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([4,7]);
  ctx.beginPath();ctx.moveTo(lx,by);ctx.bezierCurveTo(lx+L*0.5,by,rx,by+28,rx,by+36);ctx.stroke();ctx.setLineDash([]);
  const ue=lx+L/2;
  for(let ux=lx;ux<=ue;ux+=9){ctx.strokeStyle='#7b2fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ux,by-bh/2-14);ctx.lineTo(ux,by-bh/2-2);ctx.stroke();}
  ctx.strokeStyle='#7b2fff';ctx.beginPath();ctx.moveTo(lx,by-bh/2-14);ctx.lineTo(ue,by-bh/2-14);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('10kN/m',(lx+ue)/2,by-bh/2-20);
  ctx.strokeStyle='#ff6b35';ctx.fillStyle='#ff6b35';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(rx,by-bh/2-36);ctx.lineTo(rx,by-bh/2-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rx,by-bh/2);ctx.lineTo(rx-6,by-bh/2-11);ctx.lineTo(rx+6,by-bh/2-11);ctx.fill();
  ctx.fillText('20kN',rx,by-bh/2-42);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('L=2m  EI=2×10³kN·m²  UDL on first 1m only',W/2,H-5);
}

function drawHollowRectShear(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W*0.4,cy=H*0.46,os=88,is=52;
  ctx.fillStyle='rgba(0,212,255,0.12)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;
  ctx.fillRect(cx-os/2,cy-os/2,os,os);ctx.strokeRect(cx-os/2,cy-os/2,os,os);
  ctx.fillStyle='#060b18';ctx.fillRect(cx-is/2,cy-is/2,is,is);ctx.strokeRect(cx-is/2,cy-is/2,is,is);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';
  ctx.fillText('120mm',cx,cy+os/2+12);ctx.fillText('t=20mm',cx+os/2+26,cy);ctx.fillText('F=125kN↓',cx,H-5);
  ctx.strokeStyle='#7b2fff';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx+os/2,cy-os/2);ctx.lineTo(cx+os/2+28,cy-os/2+10);ctx.lineTo(cx+os/2+38,cy);ctx.lineTo(cx+os/2+28,cy+os/2-10);ctx.lineTo(cx+os/2,cy+os/2);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.fillText('τ dist.',cx+os/2+40,cy);
}

function drawSolidHollowShaft(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx1=W*0.28,cx2=W*0.72,cy=H/2,r1=20,r2o=25,r2i=12;
  ctx.beginPath();ctx.arc(cx1,cy,r1,0,Math.PI*2);
  ctx.fillStyle='rgba(0,212,255,0.2)';ctx.fill();ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#00d4ff';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('Solid d=20mm',cx1,cy+r1+12);
  ctx.beginPath();ctx.arc(cx2,cy,r2o,0,Math.PI*2);
  ctx.fillStyle='rgba(123,47,255,0.15)';ctx.fill();ctx.strokeStyle='#7b2fff';ctx.stroke();
  ctx.beginPath();ctx.arc(cx2,cy,r2i,0,Math.PI*2);
  ctx.fillStyle='#060b18';ctx.fill();ctx.strokeStyle='#7b2fff';ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.fillText('Hollow (same area)',cx2,cy+r2o+12);
  [cx1,cx2].forEach(cxx=>{ctx.strokeStyle='#ff6b35';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(cxx,cy-4,r2o+8,-Math.PI*0.7,Math.PI*0.3);ctx.stroke();});
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('τ_allow=65N/mm² | d_i=d_o/2',W/2,H-5);
}

function drawShaftDesign(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cy=H/2,shW=W*0.5,shH=26,sx=(W-shW)/2;
  const g=ctx.createLinearGradient(sx,cy-shH/2,sx,cy+shH/2);
  g.addColorStop(0,'rgba(0,212,255,0.5)');g.addColorStop(0.5,'rgba(0,212,255,0.12)');g.addColorStop(1,'rgba(0,212,255,0.35)');
  ctx.fillStyle=g;ctx.fillRect(sx,cy-shH/2,shW,shH);ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.strokeRect(sx,cy-shH/2,shW,shH);
  [[sx-4,'←T'],[sx+shW+4,'T→']].forEach(([ax,lbl],i)=>{ctx.strokeStyle='#ff6b35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ax,cy,15,i===0?-Math.PI*0.5:Math.PI*0.5,i===0?Math.PI*0.5:-Math.PI*0.5);ctx.stroke();ctx.fillStyle='#ff6b35';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,ax+(i===0?-24:24),cy+3);});
  ctx.fillStyle='#7b2fff';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('P kW @ N rpm',W/2,cy-shH/2-8);
  ctx.fillStyle='#8899bb';ctx.fillText('T=60P/2πN | τ=16T/πd³ | θ=TL/GJ',W/2,H-5);
}

function drawColumnBuckling(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,topY=26,botY=H-26,colH=botY-topY;
  [[topY,true],[botY,false]].forEach(([y,top])=>{ctx.fillStyle='#4a5a7a';ctx.strokeStyle='#8899bb';ctx.lineWidth=1.2;ctx.beginPath();if(top){ctx.moveTo(cx,y);ctx.lineTo(cx-10,y-16);ctx.lineTo(cx+10,y-16);}else{ctx.moveTo(cx,y);ctx.lineTo(cx-10,y+16);ctx.lineTo(cx+10,y+16);}ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(cx,y,3.5,0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();});
  ctx.strokeStyle='#00d4ff';ctx.lineWidth=4;ctx.lineCap='round';ctx.shadowColor='#00d4ff';ctx.shadowBlur=7;
  ctx.beginPath();for(let i=0;i<=50;i++){const t=i/50;const x=cx+20*Math.sin(Math.PI*t);const y=topY+colH*t;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle='#ff6b35';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,topY-20);ctx.lineTo(cx,topY-2);ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.moveTo(cx,topY);ctx.lineTo(cx-6,topY-11);ctx.lineTo(cx+6,topY-11);ctx.fill();
  ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillStyle='#ff6b35';ctx.fillText('P',cx,topY-25);
  ctx.fillStyle='#8899bb';ctx.fillText('Pcr=π²EI/L²',cx,H-5);
}

function drawBucklingEndConditions(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cols=[{x:W*0.2,K:1,lbl:'K=1',col:'#00d4ff'},{x:W*0.5,K:0.5,lbl:'K=0.5',col:'#7b2fff'},{x:W*0.8,K:2,lbl:'K=2',col:'#ff4757'}];
  const topY=22,botY=H-38,colH=botY-topY;
  cols.forEach(({x,K,lbl,col})=>{
    ctx.strokeStyle=col;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.shadowColor=col;ctx.shadowBlur=5;
    ctx.beginPath();for(let i=0;i<=44;i++){const t=i/44;let xd;if(K===2)xd=x+18*(1-Math.cos(Math.PI/2*t));else if(K===0.5)xd=x+14*Math.sin(2*Math.PI*t);else xd=x+16*Math.sin(Math.PI*t);i===0?ctx.moveTo(xd,topY+colH*t):ctx.lineTo(xd,topY+colH*t);}ctx.stroke();ctx.shadowBlur=0;
    ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x,topY-18);ctx.lineTo(x,topY-2);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,topY);ctx.lineTo(x-5,topY-9);ctx.lineTo(x+5,topY-9);ctx.fill();
    ctx.fillStyle=col;ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,x,botY+13);
  });
}

function drawCompositeShaft(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,rst=32,rcu=10;
  ctx.beginPath();ctx.arc(cx,cy,rst,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.1)';ctx.fill();ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,rcu,0,Math.PI*2);ctx.fillStyle='rgba(255,107,53,0.28)';ctx.fill();ctx.strokeStyle='#ff6b35';ctx.lineWidth=1.8;ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('Cu rod',cx,cy+3);
  ctx.fillStyle='#00d4ff';ctx.fillText('Steel tube OD=60mm',cx,cy-rst-8);
  ctx.fillStyle='#8899bb';ctx.fillText('G_s=2G_c | Equal twist | T=1200N·m',cx,H-5);
  ctx.strokeStyle='#7b2fff';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(cx,cy,rst+10,-Math.PI*0.5,Math.PI*0.5);ctx.stroke();
}

function drawStressElement(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,s=62,aw=32;
  ctx.fillStyle='rgba(0,212,255,0.06)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.fillRect(cx-s/2,cy-s/2,s,s);ctx.strokeRect(cx-s/2,cy-s/2,s,s);
  ctx.strokeStyle='#ff6b35';ctx.fillStyle='#ff6b35';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx+s/2,cy);ctx.lineTo(cx+s/2+aw,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+s/2+aw,cy);ctx.lineTo(cx+s/2+aw-8,cy-5);ctx.lineTo(cx+s/2+aw-8,cy+5);ctx.fill();
  ctx.beginPath();ctx.moveTo(cx-s/2,cy);ctx.lineTo(cx-s/2-aw,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-s/2-aw,cy);ctx.lineTo(cx-s/2-aw+8,cy-5);ctx.lineTo(cx-s/2-aw+8,cy+5);ctx.fill();
  ctx.font='9px Space Mono';ctx.textAlign='center';ctx.fillText('σx',cx+s/2+aw+12,cy+3);ctx.fillText('σx',cx-s/2-aw-12,cy+3);
  ctx.strokeStyle='#7b2fff';ctx.fillStyle='#7b2fff';
  ctx.beginPath();ctx.moveTo(cx,cy-s/2);ctx.lineTo(cx,cy-s/2-aw);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy-s/2-aw);ctx.lineTo(cx-5,cy-s/2-aw+8);ctx.lineTo(cx+5,cy-s/2-aw+8);ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy+s/2);ctx.lineTo(cx,cy+s/2+aw);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy+s/2+aw);ctx.lineTo(cx-5,cy+s/2+aw-8);ctx.lineTo(cx+5,cy+s/2+aw-8);ctx.fill();
  ctx.fillText('σy',cx+12,cy-s/2-aw-7);ctx.fillText('σy',cx+12,cy+s/2+aw+12);
  ctx.strokeStyle='#ffd32a';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(cx+s/2,cy-s/4);ctx.lineTo(cx+s/2,cy-s/4-12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+s/2,cy+s/4);ctx.lineTo(cx+s/2,cy+s/4+12);ctx.stroke();
  ctx.fillStyle='#ffd32a';ctx.fillText('τxy',cx+s/2+8,cy-s/4-14);
}

function drawMohrsCircleDiagram(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const scale=1.4,C=50,R=28.28,cx=W*0.42,cy=H*0.56;
  ctx.strokeStyle='rgba(136,153,187,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,cy);ctx.lineTo(W-18,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,18);ctx.lineTo(cx,H-18);ctx.stroke();
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('σ→',W-22,cy-5);ctx.fillText('τ',cx+10,20);
  ctx.beginPath();ctx.arc(cx+C*scale,cy,R*scale,0,Math.PI*2);ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.arc(cx+30*scale,cy-20*scale,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7b2fff';ctx.beginPath();ctx.arc(cx+70*scale,cy+20*scale,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,107,53,0.45)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx+30*scale,cy-20*scale);ctx.lineTo(cx+70*scale,cy+20*scale);ctx.stroke();
  const s1=(C+R)*scale,s2=(C-R)*scale;
  ctx.fillStyle='#00ff9d';ctx.beginPath();ctx.arc(cx+s1,cy,5.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+s2,cy,5.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffd32a';ctx.beginPath();ctx.arc(cx+C*scale,cy-R*scale,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8899bb';ctx.font='7px Space Mono';ctx.textAlign='center';
  ctx.fillText('σ₂',cx+s2,cy-10);ctx.fillText('σ₁',cx+s1,cy-10);ctx.fillText('τmax',cx+C*scale+4,cy-R*scale-8);
  ctx.fillText('X(σx,+τ)',cx+30*scale+2,cy-20*scale-9);ctx.fillText('Y(σy,-τ)',cx+70*scale,cy+20*scale+12);
}

function drawMohrsCirclePrincipal(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const s1=80,s2=40,C=(s1+s2)/2,R=(s1-s2)/2,scale=1.7,cx=W/2-(C*scale)*0.12,cy=H*0.56;
  ctx.strokeStyle='rgba(136,153,187,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,cy);ctx.lineTo(W-18,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,18);ctx.lineTo(cx,H-18);ctx.stroke();
  ctx.beginPath();ctx.arc(cx+C*scale,cy,R*scale,0,Math.PI*2);ctx.strokeStyle='#00d4ff';ctx.lineWidth=2.2;ctx.stroke();
  ctx.fillStyle='#00ff9d';ctx.beginPath();ctx.arc(cx+s1*scale,cy,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+s2*scale,cy,6,0,Math.PI*2);ctx.fill();
  const a2th=40*Math.PI/180,px=cx+C*scale+R*scale*Math.cos(-a2th),py=cy+R*scale*Math.sin(-a2th);
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.arc(px,py,5.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,107,53,0.45)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx+C*scale,cy);ctx.lineTo(px,py);ctx.stroke();
  ctx.strokeStyle='#ffd32a';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(cx+C*scale,cy,R*scale*0.38,-a2th,0);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ffd32a';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('2θ=40°',cx+C*scale+R*scale*0.4+3,cy-5);
  ctx.fillStyle='#ffd32a';ctx.beginPath();ctx.arc(cx+C*scale,cy-R*scale,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8899bb';ctx.textAlign='center';ctx.font='7px Space Mono';
  ctx.fillText('σ₂=40',cx+s2*scale,cy-11);ctx.fillText('σ₁=80',cx+s1*scale,cy-11);ctx.fillText('P(σn,τ)',px+22,py-7);ctx.fillText('τmax=20',cx+C*scale+4,cy-R*scale-9);
}

function drawShaftLoadings(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cy=H/2,shW=W*0.48,shH=26,sx=(W-shW)/2;
  const g=ctx.createLinearGradient(sx,cy-shH/2,sx,cy+shH/2);
  g.addColorStop(0,'rgba(0,212,255,0.45)');g.addColorStop(0.5,'rgba(0,212,255,0.1)');g.addColorStop(1,'rgba(0,212,255,0.3)');
  ctx.fillStyle=g;ctx.fillRect(sx,cy-shH/2,shW,shH);ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.strokeRect(sx,cy-shH/2,shW,shH);
  ctx.strokeStyle='#7b2fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(W/2,cy-shH-10,shW/4,-Math.PI*0.7,Math.PI*0.7);ctx.stroke();
  ctx.fillStyle='#7b2fff';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('M=45kN·m',W/2,cy-shH-10-shW/4-8);
  [[sx-4,'←T'],[sx+shW+4,'T→']].forEach(([ax,lbl],i)=>{ctx.strokeStyle='#ff6b35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ax,cy,14,i===0?-Math.PI*0.5:Math.PI*0.5,i===0?Math.PI*0.5:-Math.PI*0.5);ctx.stroke();ctx.fillStyle='#ff6b35';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,ax+(i===0?-22:22),cy+3);});
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('M=45kN·m | T=15kN·m | σ_el=200MPa | FOS=2',W/2,H-5);
}

function drawEccentricColumn(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H*0.54,bw=92,bh=64;
  ctx.fillStyle='rgba(0,212,255,0.08)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.fillRect(cx-bw/2,cy-bh/2,bw,bh);ctx.strokeRect(cx-bw/2,cy-bh/2,bw,bh);
  [['A',cx-bw/2,cy-bh/2],['B',cx+bw/2,cy-bh/2],['C',cx+bw/2,cy+bh/2],['D',cx-bw/2,cy+bh/2]].forEach(([lbl,lx,ly])=>{ctx.fillStyle='#ffd32a';ctx.beginPath();ctx.arc(lx,ly,4,0,Math.PI*2);ctx.fill();ctx.font='9px Space Mono';ctx.textAlign='center';ctx.fillText(lbl,lx+(lx<cx?-12:12),ly+(ly<cy?-8:13));});
  ctx.fillStyle='#00ff9d';ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='left';ctx.fillText('G',cx+7,cy+3);
  const Px=cx+bw*0.26,Py=cy-bh*0.28;
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.arc(Px,Py,4.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ff6b35';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Px,Py-30);ctx.lineTo(Px,Py-4);ctx.stroke();
  ctx.beginPath();ctx.moveTo(Px,Py);ctx.lineTo(Px-5,Py-11);ctx.lineTo(Px+5,Py-11);ctx.fill();
  ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('P=500kN',Px,Py-36);
  ctx.strokeStyle='#ffd32a';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(Px,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,Py);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('300×200mm | ex=50mm ey=75mm',cx,H-5);
}

function drawHollowColumnEccentric(canvas) {
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,ow=100,oh=84,iw=74,ih=62;
  ctx.fillStyle='rgba(0,212,255,0.1)';ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;ctx.fillRect(cx-ow/2,cy-oh/2,ow,oh);ctx.strokeRect(cx-ow/2,cy-oh/2,ow,oh);
  ctx.fillStyle='#060b18';ctx.fillRect(cx-iw/2,cy-ih/2,iw,ih);ctx.strokeRect(cx-iw/2,cy-ih/2,iw,ih);
  ctx.strokeStyle='rgba(255,211,42,0.45)';ctx.lineWidth=1;ctx.setLineDash([4,6]);
  ctx.beginPath();ctx.moveTo(cx-ow/2-12,cy);ctx.lineTo(cx+ow/2+12,cy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,cy-oh/2-12);ctx.lineTo(cx,cy+oh/2+12);ctx.stroke();ctx.setLineDash([]);
  const lx=cx+ow/2;
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.arc(lx,cy,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ff6b35';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(lx,cy-40);ctx.lineTo(lx,cy-5);ctx.stroke();
  ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.moveTo(lx,cy);ctx.lineTo(lx-6,cy-12);ctx.lineTo(lx+6,cy-12);ctx.fill();
  ctx.font='8px Space Mono';ctx.textAlign='center';ctx.fillText('P=110kN',lx,cy-48);
  ctx.fillStyle='#8899bb';ctx.font='8px Space Mono';ctx.fillText('Ext 600×550 | Int 500×450mm | e=300mm',cx,H-5);
}

// ─── SOLUTION FUNCTIONS ────────────────────────────────────────────────────────

function solveSteppedBar() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> Step 1: Equilibrium ΣF=0</div><div class="sol-step"><div class="sol-step-label">→ positive convention</div><div class="sol-step-expr">F₁ − P + F₃ − F₄ = 0 (assumed values from typical problem)</div><div class="sol-step-val">Solve for P using ΣF=0</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-arrows-alt-v"></i> Step 2: Total elongation δ = ΣFL/AE</div><div class="sol-step"><div class="sol-step-expr">δ = F_AB·L_AB/(A_AB·E) + F_BC·L_BC/(A_BC·E) + F_CD·L_CD/(A_CD·E)</div><div class="sol-step-val">Substitute internal forces and given dimensions</div></div></div><div class="sol-result"><span class="sol-result-label">Result</span><span class="sol-result-val">P from equilibrium | δ = ΣFL/AE</span></div>`; }

function solveTriaxialVolume() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-cube"></i> Triaxial Stress Analysis</div><div class="sol-step"><div class="sol-step-label">Stresses on each face (σ = F/A)</div><div class="sol-step-expr">σx = +400000/(100×50) = +80 MPa (T along length)</div><div class="sol-step-expr">σy = −400000/(100×250) = −16 MPa (C)</div><div class="sol-step-val">σz = +2000000/(50×250) = +160 MPa (T)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-compress"></i> Strains: εi = [σi − ν(σj+σk)]/E</div><div class="sol-step"><div class="sol-step-expr">εx = [80 − 0.25(−16+160)]/200000 = 44/200000 = +2.2×10⁻⁴</div><div class="sol-step-expr">εy = [−16 − 0.25(80+160)]/200000 = −76/200000 = −3.8×10⁻⁴</div><div class="sol-step-val">εz = [160 − 0.25(80−16)]/200000 = 144/200000 = +7.2×10⁻⁴</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-expand-arrows-alt"></i> Volumetric strain & ΔV</div><div class="sol-step"><div class="sol-step-expr">εv = εx+εy+εz = (2.2−3.8+7.2)×10⁻⁴ = 5.6×10⁻⁴</div><div class="sol-step-expr">V₀ = 100×50×250 = 1,250,000 mm³</div><div class="sol-step-val">ΔV = εv × V₀ = +700 mm³ (increase)</div></div></div><div class="sol-result"><span class="sol-result-label">Change in Volume</span><span class="sol-result-val">ΔV = +700 mm³</span></div>`; }

function solveRCCColumn() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-columns"></i> RCC Column Analysis</div><div class="sol-step"><div class="sol-step-label">Areas</div><div class="sol-step-expr">Ag = 200×200 = 40000 mm² | As = 10×π×144/4 = 1131 mm² | Ac = 38869 mm²</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-equals"></i> Compatibility + Equilibrium</div><div class="sol-step"><div class="sol-step-expr">Equal strain: σs = m·σc = 16.5σc</div><div class="sol-step-expr">P = σc·Ac + σs·As → 270000 = σc(38869 + 16.5×1131) = 57530σc</div><div class="sol-step-val">σc = 4.69 MPa | σs = 16.5×4.69 = 77.4 MPa</div></div></div><div class="sol-result"><span class="sol-result-label">σ_concrete = 4.69 MPa | σ_steel = 77.4 MPa (both compressive)</span></div>`; }

function solveRailThermal() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-thermometer-full"></i> Thermal Stress — Rails</div><div class="sol-step"><div class="sol-step-label">(i) Max temp for stress-free: δ_thermal = gap</div><div class="sol-step-expr">α·L·ΔT = gap → 12×10⁻⁶ × 12000 × ΔT = 3 → ΔT = 20.83°C</div><div class="sol-step-val">T_max = 12 + 20.83 = 32.83°C</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-fire"></i> (ii) Stress when T rises 10°C beyond atmospheric</div><div class="sol-step"><div class="sol-step-expr">T_atm ≈ 22°C | ΔT = 22−12 = 10°C | δ = 12×10⁻⁶×12000×10 = 1.44 mm < 3mm gap</div><div class="sol-step-val">σ = 0 (gap absorbs expansion)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-exclamation-triangle"></i> Beyond stress-free temp: excess ΔT = 10°C</div><div class="sol-step"><div class="sol-step-expr">σ = E·α·ΔT_excess = 200000×12×10⁻⁶×10</div><div class="sol-step-val">σ = 24 MPa (Compressive)</div></div></div><div class="sol-result"><span class="sol-result-label">Stress-free up to 32.83°C | σ = 24 MPa C (beyond that)</span></div>`; }

function solveMemberABCD() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> Equilibrium: ΣF=0</div><div class="sol-step"><div class="sol-step-expr">+45 + P₂ − 450 + 130 = 0</div><div class="sol-step-val">P₂ = 275 kN (→)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-tachometer-alt"></i> Internal forces & stresses (method of sections)</div><div class="sol-step"><div class="sol-step-expr">F_AB = +45 kN (T) | σ_AB = 45000/900 = 50 N/mm² (T)</div><div class="sol-step-expr">F_BC = +45+275 = 320 kN (T) | σ_BC = 320000/400 = 800 N/mm² (T)</div><div class="sol-step-val">F_CD = +45+275−450 = −130 kN (C) | σ_CD = 130000/625 = 208 N/mm² (C)</div></div></div><div class="sol-result"><span class="sol-result-label">P₂=275kN | σ_AB=50MPa(T) | σ_BC=800MPa(T) | σ_CD=208MPa(C)</span></div>`; }

function solveThermalRod() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-thermometer-half"></i> Thermal Rod: ΔT = 120°C, L=2000mm</div><div class="sol-step"><div class="sol-step-label">(i) Free expansion</div><div class="sol-step-expr">δ_free = α·L·ΔT = 12×10⁻⁶×2000×120 = 2.88 mm</div></div><div class="sol-step"><div class="sol-step-label">(ii) Stress if fully prevented</div><div class="sol-step-expr">σ = E·α·ΔT = 200000×12×10⁻⁶×120</div><div class="sol-step-val">σ = 288 MPa (Compressive)</div></div><div class="sol-step"><div class="sol-step-label">(iii) 2 mm expansion allowed</div><div class="sol-step-expr">σ = E×(δ_free−2)/L = 200000×0.88/2000</div><div class="sol-step-val">σ = 88 MPa (Compressive)</div></div></div><div class="sol-result"><span class="sol-result-label">δ_free=2.88mm | σ(prevented)=288MPa | σ(2mm gap)=88MPa</span></div>`; }

function solveCompositeBarThermal() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-thermometer-down"></i> ΔT=40°C drop | bars contract → tensile stress</div><div class="sol-step"><div class="sol-step-expr">Free contraction: δ_st=1.17×10⁻⁵×250×40=0.117mm | δ_al=2.34×10⁻⁵×300×40=0.281mm</div><div class="sol-step-expr">Total free contraction = 0.398 mm</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-equals"></i> Case (i): Rigid ends — compatibility+equilibrium</div><div class="sol-step"><div class="sol-step-expr">σs·As = σa·Aa → σs×250 = σa×375 → σs = 1.5σa</div><div class="sol-step-expr">1.5σa×250/(250×2×10⁵) + σa×300/(375×0.7×10⁵) = 0.398</div><div class="sol-step-val">σ_al = 46.4 MPa (T) | σ_st = 69.5 MPa (T)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-expand-arrows-alt"></i> Case (ii): 0.25mm yielding</div><div class="sol-step"><div class="sol-step-expr">Net extension = 0.398−0.25 = 0.148 mm</div><div class="sol-step-val">σ_al ≈ 17.2 MPa (T) | σ_st ≈ 25.8 MPa (T)</div></div></div><div class="sol-result"><span class="sol-result-label">Rigid: σ_st=69.5, σ_al=46.4 MPa | Yielding: σ_st=25.8, σ_al=17.2 MPa</span></div>`; }

function solveTriaxial3D() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-cube"></i> Stresses: σx=100MPa(T) | σy=120MPa(T) | σz=−90MPa(C)</div><div class="sol-step"><div class="sol-step-expr">εx=(100−0.25(120−90))/200000 = 92.5/200000 = 4.625×10⁻⁴</div><div class="sol-step-expr">εy=(120−0.25(100−90))/200000 = 117.5/200000 = 5.875×10⁻⁴</div><div class="sol-step-val">εz=(−90−0.25(100+120))/200000 = −145/200000 = −7.25×10⁻⁴</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler-combined"></i> Dimensional changes + ΔV</div><div class="sol-step"><div class="sol-step-expr">δx=εx×360=+0.1665mm | δy=εy×80=+0.047mm | δz=εz×160=−0.116mm</div><div class="sol-step-expr">εv = 4.625+5.875−7.25 = 3.25×10⁻⁴ | V₀ = 4,608,000 mm³</div><div class="sol-step-val">ΔV = 3.25×10⁻⁴×4608000 = +1497.6 mm³</div></div></div><div class="sol-result"><span class="sol-result-label">ΔV=+1497.6mm³ | δx=+0.167mm | δy=+0.047mm | δz=−0.116mm</span></div>`; }

function solveCantileverBeam() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> Cantilever reactions at A (fixed end)</div><div class="sol-step"><div class="sol-step-expr">RA = 3 + 2×2 = 7 kN ↑ | MA = 3×1 + 2×2×3 = 15 kN·m (hogging)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-chart-area"></i> SFD: At A=7kN | after P=4kN | at free end=0 (via UDL)</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-wave-square"></i> BMD: At A=−15kN·m | at P=−8kN·m | at B=0</div></div><div class="sol-result"><span class="sol-result-label">Max SF=7kN at A | Max BM=15kN·m at A</span></div>`; }

function solveSSBeamUDL() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> Reactions: RA=90kN | RB=70kN</div><div class="sol-step"><div class="sol-step-expr">ΣMB=0: 8RA = 40×6+15×8×4 = 720 → RA=90kN</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-chart-area"></i> SFD — zero shear at x=3.33m from A</div><div class="sol-step"><div class="sol-step-expr">F(x) = 90−15x−40[x>2] = 0 → x = 3.33m (after applying load)</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-wave-square"></i> M_max at x=3.33m</div><div class="sol-step"><div class="sol-step-expr">M = 90×3.33 − 15×3.33²/2 − 40×1.33 = 299.7−83.3−53.2</div><div class="sol-step-val">M_max = 163.2 kN·m at x = 3.33 m from A</div></div></div><div class="sol-result"><span class="sol-result-label">RA=90kN | RB=70kN | M_max=163.2kN·m at x=3.33m</span></div>`; }

function solveOverhangingBeam() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> Reactions</div><div class="sol-step"><div class="sol-step-expr">ΣMB=0: 6RA = 20×3+10×6×3−30×2 = 60+180−60=180 → RA=30kN</div><div class="sol-step-val">RB = 30+20+60−30 = 80kN</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-chart-area"></i> SFD key points</div><div class="sol-step"><div class="sol-step-expr">At A=+30kN | zero shear at x=3m | at B(left)=−30kN | at B(right)=+50kN | at C=0</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-wave-square"></i> BMD — Point of Contraflexure</div><div class="sol-step"><div class="sol-step-expr">M at 3m = 30×3−10×4.5 = 45kN·m (max) | At B = −60kN·m</div><div class="sol-step-val">POC at ≈ 4.5m from A</div></div></div><div class="sol-result"><span class="sol-result-label">RA=30kN | RB=80kN | M_max=45kN·m | POC at 4.5m</span></div>`; }

function solveBeamCouples() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> Reactions from couples</div><div class="sol-step"><div class="sol-step-expr">ΣMB=0: 10RA = M₁−M₂ = 20−30 = −10 → RA = −1kN↓ | RB = +1kN↑</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-chart-area"></i> SFD = constant −1kN throughout (no distributed loads)</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-wave-square"></i> BMD: At A=0 | jump at M₁ and M₂</div><div class="sol-step"><div class="sol-step-expr">At x=3⁻: M=−3kN·m | At x=3⁺: M=−3+20=+17kN·m</div><div class="sol-step-expr">At x=7⁻: M=+17−4=+13kN·m | At x=7⁺: M=13−30=−17kN·m</div><div class="sol-step-val">Max BM = ±17kN·m</div></div></div><div class="sol-result"><span class="sol-result-label">Max BM = ±17kN·m | SFD = −1kN throughout</span></div>`; }

function solveTSectionBending() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler-vertical"></i> Centroid from top</div><div class="sol-step"><div class="sol-step-expr">ȳ = (5400×15+6000×130)/11400 = 75.9mm from top</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> I about NA</div><div class="sol-step"><div class="sol-step-expr">I = [180×30³/12+5400×60.9²]+[30×200³/12+6000×54.1²] = 5.753×10⁷ mm⁴</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-wave-square"></i> Bending stresses</div><div class="sol-step"><div class="sol-step-expr">M_max=110×2=220kN·m | σ_top=220×10⁶×75.9/5.753×10⁷=290MPa(C)</div><div class="sol-step-val">σ_bot=220×10⁶×154.1/5.753×10⁷=589MPa(T) | σ at 110mm=169MPa(T)</div></div></div><div class="sol-result"><span class="sol-result-label">σ_max(T)=589MPa at bottom | σ_max(C)=290MPa at top</span></div>`; }

function solveTSectionShear() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler-vertical"></i> Centroid: ȳ=87.5mm from top</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-tachometer-alt"></i> Shear stress τ=FQ/Ib</div><div class="sol-step"><div class="sol-step-expr">Q_NA = 200×50×62.5+50×37.5×18.75 = 660,156 mm³</div><div class="sol-step-val">τ_NA = 100000×660156/(1.134×10⁸×50) = 11.64 MPa</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-layer-group"></i> At flange-web junction</div><div class="sol-step"><div class="sol-step-expr">Q_junc = 200×50×62.5 = 625000 mm³ | τ(flange) = 2.76MPa | τ(web) = 11.02MPa</div></div></div><div class="sol-result"><span class="sol-result-label">τ_NA=11.64MPa | τ_junction(web)=11.02MPa | τ_junction(flange)=2.76MPa</span></div>`; }

function solveSSBeamDeflection() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-balance-scale"></i> RA=97.5kN | RB=92.5kN</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-arrows-alt-v"></i> Slope at A (Macaulay method)</div><div class="sol-step"><div class="sol-step-val">θA = [sum of P·b·(L²−b²)]/(6EIL) ≈ 0.00825 rad</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler"></i> Deflections</div><div class="sol-step"><div class="sol-step-val">δ(60kN at 2m) ≈ 3.87 mm ↓ | δ(80kN at 4m) ≈ 5.94 mm ↓</div></div></div><div class="sol-result"><span class="sol-result-label">θA=0.00825rad | δ₁=3.87mm | δ₂=5.94mm</span></div>`; }

function solveCantileverDeflection() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-superscript"></i> Superposition: δ = δ_UDL + δ_P</div><div class="sol-step"><div class="sol-step-expr">δ_UDL = wL₁³(4L−L₁)/(24EI) = 10×1³×7/(24×2000) = 1.458mm</div><div class="sol-step-expr">δ_P = PL³/(3EI) = 20×8/(3×2000) = 26.67mm</div><div class="sol-step-val">δ_total = 28.13 mm at free end</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-angle-right"></i> Slope at free end</div><div class="sol-step"><div class="sol-step-val">θ_total ≈ 0.0148 rad = 0.85°</div></div></div><div class="sol-result"><span class="sol-result-label">δ_max = 28.13 mm | θ_max = 0.0148 rad</span></div>`; }

function solveHollowRectShear() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> I = (120⁴−80⁴)/12 = 13,866,667 mm⁴</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-tachometer-alt"></i> τ_max at NA: τ=FQ/Ib</div><div class="sol-step"><div class="sol-step-expr">Q_NA = 120×60×30−80×40×20 = 216000−64000 = 152000mm³ | b=40mm</div><div class="sol-step-val">τ_max = 125000×152000/(13866667×40) = 34.2 MPa</div></div></div><div class="sol-result"><span class="sol-result-label">τ_max = 34.2 MPa at neutral axis</span></div>`; }

function solveSolidHollowTorque() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-sync"></i> Solid shaft torque</div><div class="sol-step"><div class="sol-step-expr">T = τ·πd³/16 = 65×π×8000/16 = 102,102 N·mm = 102.1 N·m</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-circle-notch"></i> Hollow shaft (same area, d_i=d_o/2)</div><div class="sol-step"><div class="sol-step-expr">A_solid=314.16mm² | π(D²−d²)/4 = π×3D²/16 = 314.16 → D=23.08mm, d=11.54mm</div><div class="sol-step-val">T_hollow = τ×J_h/(D/2) ≈ 127 N·m (+25% stronger)</div></div></div><div class="sol-result"><span class="sol-result-label">T_solid=102.1N·m | T_hollow≈127N·m</span></div>`; }

function solveShaftDesign() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-cog"></i> T=60×300000/(2π×400)=7162N·m=7.162×10⁶N·mm</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler"></i> From τ criterion: d≥96.8mm</div><div class="sol-step"><div class="sol-step-expr">τ=16T/πd³≤40 → d³≥16×7162000/(π×40) → d≥96.8mm</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-angle-right"></i> From θ criterion: d≥98.6mm (governs)</div><div class="sol-step"><div class="sol-step-expr">θ=TL/GJ≤π/180 in 3000mm → d≥98.6mm</div></div></div><div class="sol-result"><span class="sol-result-label">Design d = 100 mm (round to standard size)</span></div>`; }

function solveHollowShaftDesign() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-cog"></i> T=60×450000/(2π×120)=35.81×10⁶N·mm</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler"></i> τ criterion: D≥176mm | θ criterion: D≥182mm (governs)</div><div class="sol-step"><div class="sol-step-expr">τ: 60=16T/[πD³(1−k⁴)] → D=176mm | θ: J≥2.035×10⁹mm⁴ → D=182mm</div></div></div><div class="sol-result"><span class="sol-result-label">D_o = 190 mm | D_i = 0.6×190 = 114 mm</span></div>`; }

function solveEulerBuckling() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-compress-alt"></i> I_min = 50×40³/12 = 266,667 mm⁴ | A=2000mm²</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> Pcr = π²EI/L² (K=1)</div><div class="sol-step"><div class="sol-step-expr">Pcr = π²×200000×266667/4000000 = 131,600 N = 131.6 kN</div><div class="sol-step-val">σ_cr = 131600/2000 = 65.8 MPa | λ=L/k=2000/11.55=173.2 (Euler valid ✓)</div></div></div><div class="sol-result"><span class="sol-result-label">Pcr = 131.6 kN | σ_cr = 65.8 MPa | λ = 173.2</span></div>`; }

function solveBucklingEndConditions() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-info-circle"></i> Reference: EI = Pcr×L²/π² = 2000×16×10⁶/π² = 3.243×10⁹ N·mm²</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-columns"></i> New tube L=4500mm: Pcr=π²EI/Le²</div><div class="sol-step"><div class="sol-step-expr">(i) Both fixed K=0.5: Le=2250mm → Pcr=π²×3.243×10⁹/2250²=6.32kN</div><div class="sol-step-expr">(ii) Fixed-Hinged K=0.7: Le=3150mm → Pcr=3.24kN</div><div class="sol-step-val">(iii) Fixed-Free K=2: Le=9000mm → Pcr=0.395kN</div></div></div><div class="sol-result"><span class="sol-result-label">(i)6.32kN | (ii)3.24kN | (iii)0.395kN</span></div>`; }

function solveCompositeShaft() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-circle"></i> J_cu=π×20⁴/32=15708mm⁴ | J_st=π(60⁴−20⁴)/32=1,272,345mm⁴</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-equals"></i> Equal twist: T_st/(G_st×J_st)=T_cu/(G_cu×J_cu)</div><div class="sol-step"><div class="sol-step-expr">T_st/(2G×1272345)=T_cu/(G×15708) → T_st=162T_cu</div><div class="sol-step-expr">162T_cu+T_cu=1,200,000 → T_cu=7376N·mm | T_st=1,192,624N·mm</div><div class="sol-step-val">τ_cu=7376×10/15708=4.70MPa | τ_st=1192624×30/1272345=28.1MPa</div></div></div><div class="sol-result"><span class="sol-result-label">τ_steel=28.1MPa | τ_copper=4.70MPa</span></div>`; }

function solvePrincipalStresses() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> σx=110, σy=60, τxy=70 MPa</div><div class="sol-step"><div class="sol-step-expr">C=(110+60)/2=85MPa | R=√(25²+70²)=√5525=74.33MPa</div><div class="sol-step-val">σ₁=159.3MPa | σ₂=10.7MPa | τ_max=74.3MPa</div><div class="sol-step-expr">tan(2θp)=2×70/50=2.8 → 2θp=70.35° → θp=35.17°</div></div></div><div class="sol-result"><span class="sol-result-label">σ₁=159.3MPa | σ₂=10.7MPa | τ_max=74.3MPa | θp=35.2°</span></div>`; }

function solveMohrsCircleAnalytical() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-circle"></i> σx=30, σy=70, τxy=20 MPa</div><div class="sol-step"><div class="sol-step-expr">C=(30+70)/2=50MPa | R=√(20²+20²)=√800=28.28MPa</div><div class="sol-step-val">σ₁=78.3MPa | σ₂=21.7MPa | τ_max=28.3MPa | θp=22.5°</div></div></div><div class="sol-result"><span class="sol-result-label">σ₁=78.3MPa | σ₂=21.7MPa | τ_max=28.3MPa</span></div>`; }

function solveShaftTheories() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-info-circle"></i> σ_allow=100MPa | τ_allow=50MPa</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-circle"></i> (i) Max principal stress: σ₁=16[M+√(M²+T²)]/πd³≤100</div><div class="sol-step"><div class="sol-step-expr">d³=16×[45+47.43]×10⁶/(π×100) → d≥171.7mm</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-arrows-alt"></i> (ii) Max shear stress: Te=√(M²+T²)=47.43kN·m</div><div class="sol-step"><div class="sol-step-val">d≥163.6mm</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-bolt"></i> (iii) Strain energy: d≥162.8mm</div></div><div class="sol-result"><span class="sol-result-label">(i)172mm | (ii)164mm | (iii)163mm</span></div>`; }

function solveMohrsCirclePrincipal() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-circle"></i> σ₁=80, σ₂=40MPa | C=60, R=20MPa</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> At θ=20° (2θ=40°)</div><div class="sol-step"><div class="sol-step-expr">σn = C+R·cos40° = 60+20×0.766 = 75.32MPa</div><div class="sol-step-expr">τ = R·sin40° = 20×0.643 = 12.86MPa</div><div class="sol-step-expr">σr = √(75.32²+12.86²) = 76.4MPa | φ=atan(12.86/75.32)=9.7°</div></div></div><div class="sol-result"><span class="sol-result-label">σn=75.3MPa | τ=12.9MPa | σr=76.4MPa | Obliquity=9.7°</span></div>`; }

function solveEccentricColumn() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-columns"></i> A=60000mm² | Ixx=200×10⁶mm⁴ | Iyy=450×10⁶mm⁴</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-plus"></i> σ=−P/A ± P·ex·y/Ixx ± P·ey·x/Iyy</div><div class="sol-step"><div class="sol-step-expr">σ_direct=−8.33MPa | σ_Mx=±12.5MPa | σ_My=±12.5MPa</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-grid"></i> Corner stresses</div><div class="sol-step"><div class="sol-step-expr">A=−8.33+12.5+12.5=+16.67MPa(T) | B=−8.33−12.5+12.5=−8.33MPa(C)</div><div class="sol-step-val">C=−8.33−12.5−12.5=−33.33MPa(C) | D=−8.33+12.5−12.5=−8.33MPa(C)</div></div></div><div class="sol-result"><span class="sol-result-label">A=+16.67(T) | B=−8.33(C) | C=−33.33(C) | D=−8.33(C) MPa</span></div>`; }

function solveObliqueStress() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> C=78.5MPa | R=√(31.5²+63²)=70.4MPa</div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-angle-right"></i> At θ=30° (2θ=60°)</div><div class="sol-step"><div class="sol-step-expr">σn = 78.5+31.5×cos60°+63×sin60° = 78.5+15.75+54.56 = 148.8MPa</div><div class="sol-step-expr">τ = −31.5×sin60°+63×cos60° = −27.3+31.5 = 4.2MPa</div><div class="sol-step-val">σr=√(148.8²+4.2²)=148.9MPa</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-compress-arrows-alt"></i> Principal stresses</div><div class="sol-step"><div class="sol-step-val">σ₁=148.9MPa | σ₂=8.1MPa | θp=31.7°</div></div></div><div class="sol-result"><span class="sol-result-label">σn=148.8MPa | τ=4.2MPa | σ₁=148.9MPa | σ₂=8.1MPa</span></div>`; }

function solveHollowColumnEccentric() { return `<div class="sol-section"><div class="sol-heading"><i class="fas fa-ruler-combined"></i> A=105000mm² | I_xx calculated for hollow section</div><div class="sol-step"><div class="sol-step-expr">Ixx=(600×550³−500×450³)/12=(55.58−20.25)×10⁹/12=2.944×10⁹mm⁴</div></div></div><div class="sol-section"><div class="sol-heading"><i class="fas fa-calculator"></i> σ = P/A ± P·e·y/I</div><div class="sol-step"><div class="sol-step-expr">σ_direct=110000/105000=1.048MPa(C) | e=300mm | M=110000×300=33×10⁶N·mm</div><div class="sol-step-expr">σ_bending=33×10⁶×275/2.944×10⁹=±3.08MPa</div><div class="sol-step-val">σ_max=−1.048+3.08=+2.03MPa(T) | σ_min=−1.048−3.08=−4.13MPa(C)</div></div></div><div class="sol-result"><span class="sol-result-label">σ_max=+2.03MPa(T) | σ_min=−4.13MPa(C)</span></div>`; }

// ─── QUESTION BANK UI ──────────────────────────────────────────────────────────

let qbCurrentUnit='all', qbCurrentYear='all';

function initQBank() {
  renderQBank();
  document.querySelectorAll('.qb-unit-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.qb-unit-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      qbCurrentUnit = tab.dataset.unit;
      renderQBank();
    });
  });
}

function filterQBank() {
  qbCurrentYear = document.getElementById('qb_paper_filter').value;
  renderQBank();
}

function renderQBank() {
  const grid = document.getElementById('qbGrid');
  if (!grid) return;
  const filtered = QBANK.filter(q => {
    const unitOk = qbCurrentUnit==='all' || q.unit==qbCurrentUnit;
    let yearOk = true;
    if (qbCurrentYear==='insem')  yearOk = q.type==='insem';
    else if (qbCurrentYear==='endsem') yearOk = q.type==='endsem';
    else if (!isNaN(qbCurrentYear) && qbCurrentYear!=='all') yearOk = q.year==qbCurrentYear;
    return unitOk && yearOk;
  });
  const el = document.getElementById('qb_stats');
  if (el) el.textContent = `Showing ${filtered.length} of ${QBANK.length} questions`;
  grid.innerHTML = filtered.map((q,idx) => `
    <div class="qb-card" style="animation-delay:${(idx%6)*0.06}s" onclick="openQBModal('${q.id}')">
      <div class="qb-card-header">
        <span class="qb-unit-pill unit-${q.unit}">Unit ${q.unit}</span>
        <span class="qb-marks-pill">${q.marks} Marks</span>
      </div>
      <div class="qb-paper-info">
        <i class="fas fa-file-alt"></i> ${q.paper} &nbsp;·&nbsp;
        <span style="color:${q.type==='insem'?'#ffd32a':'#7b2fff'}">${q.type==='insem'?'In-Sem':'End-Sem'}</span>
      </div>
      <div class="qb-question-text">${q.question}</div>
      <canvas class="qb-thumbnail" id="thumb_${q.id}" width="320" height="88"></canvas>
      <div class="qb-card-footer">
        <span class="qb-type-badge"><i class="fas fa-tag"></i> ${q.topic}</span>
        <button class="qb-solve-btn" onclick="event.stopPropagation();openQBModal('${q.id}')">
          <i class="fas fa-play-circle"></i> Solve
        </button>
      </div>
    </div>`).join('');
  requestAnimationFrame(() => {
    filtered.forEach(q => {
      const c = document.getElementById('thumb_'+q.id);
      if (c && q.drawDiagram) { try { q.drawDiagram(c); } catch(e){} }
    });
  });
}

function openQBModal(qId) {
  const q = QBANK.find(x => x.id===qId);
  if (!q) return;
  document.getElementById('modal_unit').textContent = `Unit ${q.unit} — ${['','Simple Stresses & Strains','SFD & BMD','Bending & Shear Stresses','Torsion & Buckling','Principal Stresses & Failure'][q.unit]}`;
  document.getElementById('modal_paper').textContent = `${q.paper} · [${q.marks} Marks] · ${q.type==='insem'?'In-Sem':'End-Sem'}`;
  document.getElementById('modal_question').innerHTML = `
    <div style="margin-bottom:10px">
      <span class="qb-unit-pill unit-${q.unit}" style="margin-right:8px">Unit ${q.unit}</span>
      <span class="qb-marks-pill" style="margin-right:8px">${q.marks} Marks</span>
      <span class="concept-badge">${q.topic}</span>
    </div>
    <p style="line-height:1.8;font-size:0.93rem">${q.question}</p>
    ${q.given ? `<div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:6px">
      ${Object.entries(q.given).map(([k,v]) => `<div class="given-item"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>` : ''}`;
  const canvas = document.getElementById('modal_diagram');
  canvas.width = 820; canvas.height = 240; canvas.style.display='block';
  if (q.drawDiagram) { requestAnimationFrame(() => { try { q.drawDiagram(canvas); } catch(e){ canvas.style.display='none'; } }); }
  else { canvas.style.display='none'; }
  document.getElementById('modal_solution').innerHTML = `
    <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">
      <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--accent);margin-bottom:12px">
        <i class="fas fa-lightbulb"></i> Step-by-Step Solution
      </div>
      ${q.solution ? q.solution() : '<div class="placeholder-state"><p>Solution coming soon</p></div>'}
    </div>`;
  document.getElementById('qbModalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  awardBadge('explorer');
  trackEvent('qbank_opened', q.topic, { unit: q.unit, paper: q.paper });
}

function closeQBModal() {
  document.getElementById('qbModalOverlay').classList.remove('open');
  document.body.style.overflow='';
}


// ─── SERVICE WORKER REGISTRATION ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('[SW] Registered'))
    .catch(err => console.warn('[SW] Registration failed:', err));
}

// ─── SPPU EXPERIMENT REPORT SYSTEM ───────────────────────────────────────────
// Syllabus: Second Year Mechanical Engineering — 2024 Pattern
// Experiments: 01 (Tension/Compression UTM), 02 (Bending Deflection),
//              03 (Torsion Shear Test), 04 (Impact Test)

const SPPU_EXPERIMENTS = {
  exp01: {
    no: '01',
    title: 'Tension and Compression Test (UTM)',
    aim: 'To validate experimental results of Tension and Compression tests using ductile and brittle materials, compare stress-strain plots with tested samples, and conclude on failure behaviour.',
    theory: `The Universal Testing Machine (UTM) applies a controlled axial load to a specimen until failure. 
Key observations:
• Ductile materials (Mild Steel, Aluminium, Copper): show distinct elastic zone, yield point, strain hardening, necking, and ductile fracture.
• Brittle materials (Cast Iron): fracture with little or no plastic deformation — no defined yield point.
The stress-strain curve gives: Young's Modulus (E), Yield Stress (σy), Ultimate Tensile Strength (UTS), % Elongation, % Reduction in area.
Formula: σ = F/A, ε = δL/L₀, E = σ/ε (in elastic zone)`,
    apparatus: 'Universal Testing Machine (UTM), Vernier Caliper, Extensometer, Tensile/Compression test specimens (Mild Steel, Cast Iron, Aluminium, Copper)',
    procedure: [
      'Measure specimen dimensions (gauge length L₀, diameter d) using vernier caliper.',
      'Calculate cross-sectional area: A = πd²/4',
      'Mount specimen between UTM grips. Ensure proper alignment.',
      'Set extensometer on gauge length. Zero all readings.',
      'Apply load gradually at constant crosshead speed. Record Load (kN) vs Extension (mm) at regular intervals.',
      'Note Yield Load, Ultimate Load, and Fracture Load.',
      'Remove fractured specimen. Measure final gauge length and diameter at fracture.',
      'Plot Load-Extension curve. Convert to Stress-Strain curve.',
      'Repeat for brittle specimen (Cast Iron) and compare curves.',
    ],
    observations_header: ['Sr.No.', 'Load (kN)', 'Extension (mm)', 'Stress (MPa)', 'Strain'],
    formulas: [
      { name: 'Normal Stress', expr: 'σ = F / A' },
      { name: 'Normal Strain', expr: 'ε = δL / L₀' },
      { name: "Young's Modulus", expr: 'E = σ / ε (Elastic zone)' },
      { name: '% Elongation', expr: '% e = (Lf − L₀) / L₀ × 100' },
      { name: '% Reduction in Area', expr: '% RA = (A₀ − Af) / A₀ × 100' },
    ],
    applications: 'Aerospace: Validation of structural components (wing spars, fuselage). Automotive: Crashworthiness of vehicle frames and body panels. Quality control in manufacturing.',
    conclusion: 'The stress-strain curve differentiates ductile from brittle behaviour. Ductile materials show well-defined yield and necking; brittle materials fracture without significant plastic deformation.',
  },
  exp02: {
    no: '02',
    title: 'Bending Deflection Test (Flexure)',
    aim: 'To verify the flexural formula in bending for cantilever and simply supported beams using dial gauge readings, and to compare experimental deflection with theoretical values.',
    theory: `The Euler-Bernoulli bending (flexure) equation relates bending moment M, second moment of area I, bending stress σ, distance from neutral axis y, Young's Modulus E, and radius of curvature R:

     M / I  =  σ / y  =  E / R

Maximum deflection formulas:
  • Simply Supported Beam — Central Point Load:    δ = PL³ / 48EI
  • Simply Supported Beam — UDL:                  δ = 5wL⁴ / 384EI
  • Cantilever Beam — End Point Load:             δ = PL³ / 3EI
  • Cantilever Beam — UDL:                        δ = wL⁴ / 8EI

Second Moment of Area (Rectangular Section):   I = bd³ / 12
Bending Stress at extreme fibre:               σ = M · y_max / I  where y_max = d/2
Section Modulus:                               Z = I / y_max  →  σ_max = M / Z
Serviceability limit on deflection:            δ_allow = L / 360`,
    apparatus: 'Beam Deflection Apparatus, Dial Gauge (0.01 mm least count), Standard Weights and Hanger, Steel / Aluminium / Brass Beam Specimens, Vernier Caliper, Steel Rule, Knife-edge Supports',
    procedure: [
      'Measure beam cross-section width (b) and depth (d) using vernier caliper at three positions. Take average values.',
      'Calculate Second Moment of Area: I = bd³/12.',
      'Set up beam in required configuration (Simply Supported / Cantilever) with measured effective span L.',
      'Mount dial gauge at midspan (SS) or free end (cantilever). Adjust to zero.',
      'Apply load W (Newton) in increments of 50 N or 100 N using calibrated weights.',
      'Record dial gauge reading at each load increment. Note: 1 division = 0.01 mm.',
      'Unload in the same increments. Average loading/unloading readings to eliminate backlash.',
      'Calculate theoretical deflection at each load: δ_th = PL³/48EI (SS) or PL³/3EI (cantilever).',
      'Compare experimental and theoretical values. Calculate % error.',
      'Plot graph: Load P (N) on X-axis vs Deflection δ (mm) on Y-axis.',
      'Find slope of the line. Verify it equals L³/48EI (SS) or L³/3EI (cantilever) — the theoretical stiffness.',
    ],
    observations_header: ['Sr.No.', 'Load P (N)', 'Dial Gauge Reading (div)', 'Exp. Deflection δ_exp (mm)', 'Theo. Deflection δ_th (mm)', '% Error'],
    formulas: [
      { name: 'Second Moment of Area', expr: 'I = b · d³ / 12' },
      { name: 'SS Beam — Central Load', expr: 'δ_max = P · L³ / (48 · E · I)' },
      { name: 'Cantilever — End Load', expr: 'δ_max = P · L³ / (3 · E · I)' },
      { name: 'SS Beam — UDL', expr: 'δ_max = 5 · w · L⁴ / (384 · E · I)' },
      { name: 'Bending Stress', expr: 'σ = M · y_max / I  where y_max = d/2' },
      { name: 'Serviceability Check', expr: 'δ_allow = L / 360' },
      { name: '% Error', expr: '% error = |δ_exp − δ_th| / δ_th × 100' },
    ],
    applications: 'Quality Control in Beam Manufacturing (Steel, Aluminium, Concrete). Verifying stress/strain profile in machine components like levers, rocker arms. Design validation in bridges and structural steel. Aerospace: wing spar deflection testing.',
    conclusion: 'The experimental deflection values match theoretical predictions (δ = PL³/48EI for SS, δ = PL³/3EI for cantilever) within acceptable limits (typically < 5% error). This validates the flexural formula M/I = σ/y = E/R for elastic bending of isotropic beams.',
  },
  exp03: {
    no: '03',
    title: 'Torsional Shear Test',
    aim: 'To conduct a torsional shear test on a ductile material specimen and to study failure under torsion.',
    theory: `The Torsion Equation (Coulomb's Torsion Theory):
T/J = τ/r = Gθ/L
where: T = Torque (N·mm), J = Polar MOI (mm⁴), τ = Shear stress (MPa), r = radius, G = Shear Modulus (MPa), θ = angle of twist (rad), L = gauge length (mm)
For solid circular shaft: J = πd⁴/32
Shear stress at surface: τ = T × (d/2) / J = 16T / πd³
Angle of twist: θ = TL / GJ
Modulus of Rigidity: G = TL / Jθ
Failure occurs on a 45° plane (principal stress plane) for ductile materials — Cup-Cone appearance.`,
    apparatus: 'Torsion Testing Machine, Torque measuring system, Angle of twist indicator, Circular solid shaft specimen (Mild Steel), Vernier caliper',
    procedure: [
      'Measure specimen diameter d and gauge length L using vernier caliper.',
      'Calculate J = πd⁴/32 and note material (Mild Steel G ≈ 80 GPa).',
      'Mount specimen in torsion machine grips. Ensure gauge length is marked.',
      'Zero torque and angle of twist readings.',
      'Apply torque in increments. Record Torque (T) and Angle of Twist (θ) at each step.',
      'Continue until specimen fractures. Note maximum torque T_max.',
      'Calculate shear stress τ = T(d/2)/J and shear modulus G = TL/Jθ at each step.',
      'Plot Torque (T) vs Angle of Twist (θ). Note elastic and plastic zones.',
      'Observe fracture surface — describe failure pattern (45° spiral fracture for ductile).',
    ],
    observations_header: ['Sr.No.', 'Torque T (N·m)', 'Angle of Twist θ (°)', 'Shear Stress τ (MPa)', 'Remarks'],
    formulas: [
      { name: 'Polar MOI', expr: 'J = πd⁴ / 32' },
      { name: 'Shear Stress', expr: 'τ = T·r / J = 16T / πd³' },
      { name: 'Angle of Twist', expr: 'θ = T·L / (G·J)' },
      { name: 'Shear Modulus', expr: 'G = T·L / (J·θ)' },
      { name: 'Torsion Equation', expr: 'T/J = τ/r = G·θ/L' },
    ],
    applications: 'Drive shafts, crankshafts, camshafts, axles in vehicles. Bolts, screws, threaded rods. Automotive Powertrain and Steering Component Analysis. Torsion bars, drive shafts, steering knuckles.',
    conclusion: 'The torsion test validates T/J = τ/r = Gθ/L. Ductile materials show large twist before fracture with a 45° spiral fracture pattern (shear failure on principal plane).',
  },
  exp04: {
    no: '04',
    title: 'Impact Test (Charpy / Izod)',
    aim: 'To conduct Impact Test for Steel, Aluminium, Brass, and Copper and compare the energy absorbed by different materials.',
    theory: `The Charpy or Izod impact test measures the energy absorbed by a notched specimen when struck by a swinging pendulum hammer.
Energy Absorbed: E = mg(h₁ − h₂) = mgR(cos α₂ − cos α₁)
Where: m = mass of hammer (kg), g = 9.81 m/s², R = arm length (~0.6 m), α₁ = initial angle, α₂ = final angle after fracture.
Impact Strength = Energy Absorbed / Cross-sectional area at notch (J/m² or kJ/m²)
• Charpy: specimen supported as simply supported beam; hammer strikes opposite to notch.
• Izod: specimen clamped as cantilever; hammer strikes same side as notch.
Ductile materials absorb more energy (high impact strength).
Brittle materials fracture with little energy absorption.`,
    apparatus: 'Charpy/Izod Impact Testing Machine, Notched specimens (Steel, Aluminium, Brass, Copper — 10×10×55 mm, 2mm V-notch), Vernier caliper',
    procedure: [
      'Measure notch dimensions of specimen (width, depth, notch angle) using vernier caliper.',
      'Measure cross-sectional area at notch: A_notch = b × (d − notch depth).',
      'Set hammer to initial angle α₁ (typically 140° for Charpy, 85° for Izod). Record.',
      'Without specimen: release hammer. Note angle of free swing α_free (to find machine friction losses).',
      'Place notched specimen in anvil (Charpy: notch facing away from hammer; Izod: clamp vertically).',
      'Raise hammer to initial angle α₁. Release.',
      'Record final angle α₂ (angle of swing after fracture).',
      'Calculate energy absorbed: E = mgR(cos α₂ − cos α₁).',
      'Calculate Impact Strength = E / A_notch.',
      'Repeat for all materials. Observe and describe fracture surfaces.',
    ],
    observations_header: ['Material', 'α₁ (°)', 'α₂ (°)', 'Energy Absorbed (J)', 'Notch Area (mm²)', 'Impact Strength (kJ/m²)', 'Fracture Type'],
    formulas: [
      { name: 'Initial Height', expr: 'h₁ = R(1 − cos α₁)' },
      { name: 'Final Height', expr: 'h₂ = R(1 − cos α₂)' },
      { name: 'Energy Absorbed', expr: 'E = mg(h₁ − h₂) = mgR(cos α₂ − cos α₁)' },
      { name: 'Impact Strength', expr: 'IS = E / A_notch   [kJ/m²]' },
    ],
    applications: 'Crashworthiness in Automotive: Aluminium, Steel, Brass used in bumpers, crash zones, engine mounts. Offshore platforms (Steel). High-rise buildings. Structural Steel design in extreme temperature conditions.',
    conclusion: 'Materials with higher impact strength (Mild Steel > Copper > Aluminium > Brass typical) are preferred for impact-resistant applications. Ductile materials show fibrous fracture; brittle materials show crystalline/granular fracture.',
  },
};

function openExperimentReport(expKey) {
  const exp = SPPU_EXPERIMENTS[expKey];
  if (!exp) return;

  // Gather live readings from the simulator if available
  const liveData = gatherLiveReadings(expKey);

  const win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes');
  const html = buildReportHTML(exp, liveData);
  win.document.write(html);
  win.document.close();
  // Auto-print option
  setTimeout(() => { if (win && !win.closed) { /* win.print(); */ } }, 800);
}

function gatherLiveReadings(expKey) {
  const readings = [];
  if (expKey === 'exp01' && window._utmData && window._utmData.stresses && window._utmData.stresses.length > 0) {
    const d = window._utmData;
    const step = Math.max(1, Math.floor(d.stresses.length / 10));
    for (let i = 0; i < d.stresses.length; i += step) {
      readings.push([
        readings.length + 1,
        d.loads[i] != null ? d.loads[i].toFixed(2) : '—',
        d.exts[i]  != null ? d.exts[i].toFixed(3)  : '—',
        d.stresses[i] != null ? d.stresses[i].toFixed(1) : '—',
        d.strains[i]  != null ? d.strains[i].toFixed(4) : '—',
      ]);
    }
  }
  if (expKey === 'exp02' && window._deflExpReadings && window._deflExpReadings.length > 0) {
    // Build full observation table from stored readings
    window._deflExpReadings.forEach((r, i) => {
      const dialDiv = (r.delta * 100).toFixed(1);  // 0.01 mm divisions
      readings.push([
        i + 1,
        r.P.toFixed(0),
        dialDiv,
        r.delta.toFixed(4),
        r.delta.toFixed(4),   // theoretical same (100% accurate formula)
        '—',
      ]);
    });
  }
  if (expKey === 'exp04' && window._impactResults) {
    const r = window._impactResults;
    readings.push([
      'Specimen', r.angle0.toFixed(0) + '°', r.afterAngle.toFixed(1) + '°',
      r.E_abs.toFixed(2), '80', r.impact_strength.toFixed(1), 'Ductile'
    ]);
  }
  return readings;
}

function buildReportHTML(exp, liveData) {
  const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

  // Build observation table rows
  let rows;
  if (liveData.length > 0) {
    rows = liveData.map((row) =>
      `<tr>${row.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
    ).join('');
  } else {
    rows = Array.from({ length: 10 }, (_, i) =>
      `<tr><td>${i+1}</td>${exp.observations_header.slice(1).map(() =>
        '<td style="min-width:60px">&nbsp;</td>').join('')}</tr>`
    ).join('');
  }

  // Build extra section for Exp02 — graph with SVG plotted points + sample calc
  let extraSection = '';
  if (exp.no === '02') {
    const readings = window._deflExpReadings || [];
    const hasData  = readings.length >= 2;
    const lastR    = readings[readings.length - 1] || {};
    const b   = lastR.b  || 25;
    const d   = lastR.d  || 6;
    const L   = lastR.L  || 600;
    const P1  = readings[0]?.P || 100;
    const P2  = readings[readings.length-1]?.P || 500;
    const I   = b * d**3 / 12;
    const isCant = (lastR.type || '').includes('Cantilever');
    const formulaStr = isSS => isSS ? 'PL³/(48EI)' : 'PL³/(3EI)';
    const k_th = isCant ? L**3 / (3 * 200000 * I) : L**3 / (48 * 200000 * I);
    const delta1 = P1 * k_th, delta2 = P2 * k_th;

    // SVG graph
    const maxP = Math.max(...readings.map(r=>r.P), 500);
    const maxD = Math.max(...readings.map(r=>r.delta), 1);
    const svgW = 420, svgH = 200, pad = 40;
    const toX = p => pad + (p / maxP) * (svgW - 2*pad);
    const toY = d => (svgH - pad) - (d / maxD) * (svgH - 2*pad);

    // Theoretical line
    const linePts = [0, maxP].map(p => `${toX(p)},${toY(p * k_th)}`).join(' ');
    // Experimental points
    const expPts  = readings.map(r => `${toX(r.P)},${toY(r.delta)}`).join(' ');

    extraSection = `
<!-- SAMPLE CALCULATIONS -->
<div class="section">
  <div class="section-head">🧮 Sample Calculations</div>
  <div class="section-body">
    <div class="calc-box">
Given:
  Beam Type     = ${lastR.type || 'Simply Supported'}
  Width (b)     = ${b} mm
  Depth (d)     = ${d} mm
  Span / Length = ${L} mm
  E (Steel)     = 2,00,000 MPa

Step 1: Second Moment of Area
  I = b · d³ / 12
  I = ${b} × ${d}³ / 12
  I = ${b} × ${d**3} / 12
  I = ${I.toFixed(2)} mm⁴

Step 2: Deflection constant k = ${isCant ? 'L³/(3EI)' : 'L³/(48EI)'}
  k = ${L}³ / (${isCant?3:48} × 2,00,000 × ${I.toFixed(2)})
  k = ${(L**3).toExponential(3)} / ${(isCant?3:48 * 200000 * I).toExponential(3)}
  k = ${k_th.toExponential(4)} mm/N

Step 3: Theoretical Deflection at P = ${P1} N
  δ = P × k = ${P1} × ${k_th.toExponential(4)}
  δ = ${(P1*k_th).toFixed(4)} mm
  Dial gauge reading = ${(P1*k_th*100).toFixed(1)} × 0.01 mm divisions

Step 4: Theoretical Deflection at P = ${P2} N
  δ = ${P2} × ${k_th.toExponential(4)}
  δ = ${(P2*k_th).toFixed(4)} mm

Step 5: Slope of P vs δ graph (stiffness)
  Slope = ΔP/Δδ = (P₂ − P₁) / (δ₂ − δ₁)
  Slope = (${P2} − ${P1}) / (${(P2*k_th).toFixed(4)} − ${(P1*k_th).toFixed(4)})
  Slope = ${((P2-P1)/((P2-P1)*k_th)).toFixed(2)} N/mm  [= 1/k — theoretical stiffness: ${(1/k_th).toFixed(2)} N/mm]

Step 6: Serviceability check (permissible deflection)
  δ_allow = L/360 = ${L}/360 = ${(L/360).toFixed(2)} mm
  Maximum deflection δ_max = ${(P2*k_th).toFixed(4)} mm
  Status: ${P2*k_th <= L/360 ? '✓ SAFE — Within permissible limit' : '⚠ Exceeds L/360 limit'}
    </div>
  </div>
</div>

<!-- GRAPH — P vs δ -->
<div class="section">
  <div class="section-head">📈 Graph: Load P (N) vs Deflection δ (mm)</div>
  <div class="section-body">
    <svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg"
         style="border:1px solid #ccc;background:#f9f9ff;border-radius:6px;display:block;margin:0 auto">
      <!-- Grid lines -->
      ${Array.from({length:5},(_, i) => {
        const y = pad + i * (svgH - 2*pad) / 4;
        const yVal = (maxD * (1 - i/4)).toFixed(3);
        return `<line x1="${pad}" y1="${y}" x2="${svgW-pad}" y2="${y}" stroke="#dde" stroke-width="0.5"/>
                <text x="${pad-4}" y="${y+4}" font-size="8" text-anchor="end" fill="#888">${yVal}</text>`;
      }).join('')}
      ${Array.from({length:5},(_, i) => {
        const x = pad + i * (svgW - 2*pad) / 4;
        const xVal = (maxP * i / 4).toFixed(0);
        return `<line x1="${x}" y1="${pad}" x2="${x}" y2="${svgH-pad}" stroke="#dde" stroke-width="0.5"/>
                <text x="${x}" y="${svgH-pad+14}" font-size="8" text-anchor="middle" fill="#888">${xVal}</text>`;
      }).join('')}
      <!-- Axes -->
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${svgH-pad}" stroke="#333" stroke-width="1.5"/>
      <line x1="${pad}" y1="${svgH-pad}" x2="${svgW-pad}" y2="${svgH-pad}" stroke="#333" stroke-width="1.5"/>
      <!-- Theoretical line -->
      <polyline points="${linePts}" fill="none" stroke="#003399" stroke-width="1.5" stroke-dasharray="6,3"/>
      <!-- Experimental points -->
      ${readings.map(r =>
        `<circle cx="${toX(r.P)}" cy="${toY(r.delta)}" r="4" fill="#cc0000" stroke="white" stroke-width="1"/>`
      ).join('')}
      ${readings.length >= 2 ? `<polyline points="${expPts}" fill="none" stroke="#cc0000" stroke-width="1.5"/>` : ''}
      <!-- Labels -->
      <text x="${svgW/2}" y="${svgH-2}" font-size="10" text-anchor="middle" fill="#333" font-weight="bold">Load P (N)</text>
      <text x="10" y="${svgH/2}" font-size="10" text-anchor="middle" fill="#333" font-weight="bold"
            transform="rotate(-90,10,${svgH/2})">Deflection δ (mm)</text>
      <text x="${svgW-pad-5}" y="${pad+14}" font-size="9" fill="#003399">— Theoretical</text>
      <circle cx="${svgW-pad-5}" cy="${pad+24}" r="4" fill="#cc0000"/>
      <text x="${svgW-pad+2}" y="${pad+28}" font-size="9" fill="#cc0000">Experimental</text>
    </svg>
    <p style="font-size:10px;color:#888;margin-top:6px;text-align:center">
      The slope of the P–δ graph gives experimental flexural stiffness. Compare with theoretical slope = 48EI/L³ (SS) or 3EI/L³ (Cantilever).
    </p>
  </div>
</div>
`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Experiment ${exp.no} — ${exp.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
  .report-header { text-align: center; border: 2px solid #003366; padding: 12px; margin-bottom: 14px; }
  .inst-name { font-size: 15px; font-weight: bold; color: #003366; letter-spacing: 0.5px; }
  .inst-sub  { font-size: 11px; color: #444; margin-top: 2px; }
  .exp-title-box { background: #003366; color: white; padding: 8px; margin-top: 8px; font-size: 13px; font-weight: bold; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ccc; margin-bottom: 12px; }
  .info-row  { display: grid; grid-template-columns: 140px 1fr; border-bottom: 1px solid #ddd; }
  .info-row:last-child { border-bottom: none; }
  .info-label { background: #f0f4ff; font-weight: bold; padding: 5px 8px; border-right: 1px solid #ddd; font-size: 11px; }
  .info-val   { padding: 5px 8px; font-size: 11px; border-right: 1px solid #ccc; }
  .section     { margin-bottom: 12px; border: 1px solid #ccc; }
  .section-head { background: #003366; color: white; padding: 5px 10px; font-size: 12px; font-weight: bold; }
  .section-body { padding: 8px 10px; }
  .section-body p, .section-body li { margin-bottom: 4px; line-height: 1.6; }
  .section-body ul, .section-body ol { padding-left: 18px; }
  .formula-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .formula-table th { background: #e8eeff; padding: 5px 8px; text-align: left; border: 1px solid #ccc; font-size: 11px; }
  .formula-table td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
  .formula-expr { font-family: 'Courier New', monospace; color: #003366; font-weight: bold; }
  .obs-table    { width: 100%; border-collapse: collapse; }
  .obs-table th { background: #003366; color: white; padding: 6px 8px; text-align: center; border: 1px solid #004; font-size: 11px; }
  .obs-table td { padding: 7px 8px; border: 1px solid #ccc; text-align: center; font-size: 11px; min-width: 55px; }
  .obs-table tr:nth-child(even) { background: #f8f9ff; }
  .calc-box { background: #f8faff; border: 1px dashed #aac; padding: 8px 12px; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.9; }
  .result-highlight { background: #e8fff0; border-left: 4px solid #006600; padding: 8px 12px; font-size: 12px; margin-top: 6px; }
  .sign-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; }
  .sign-box { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; color: #444; }
  @media print { body { padding: 10px; } .no-print { display: none; } .section { page-break-inside: avoid; } }
  .print-bar { text-align: right; margin-bottom: 10px; }
  .print-btn { background: #003366; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .print-btn:hover { background: #0055aa; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>

<div class="report-header">
  <div class="inst-name">Ajeenkya DY Patil School of Engineering, Pune</div>
  <div class="inst-sub">Department of Mechanical Engineering | Second Year Mechanical Engineering (2024 Pattern)</div>
  <div class="inst-sub">Course: PCC-201-MEC — Solid Mechanics | SPPU NEP 2020</div>
  <div class="exp-title-box">Experiment No. ${exp.no} &nbsp;|&nbsp; ${exp.title}</div>
</div>

<div class="section">
  <div class="section-head">📋 Student Details</div>
  <div style="padding:6px 10px">
    <div class="info-grid">
      <div class="info-row"><div class="info-label">Student Name</div><div class="info-val">&nbsp;</div></div>
      <div class="info-row"><div class="info-label">Roll No.</div><div class="info-val">&nbsp;</div></div>
      <div class="info-row"><div class="info-label">Class / Division</div><div class="info-val">SE Mech / &nbsp;&nbsp;&nbsp;</div></div>
      <div class="info-row"><div class="info-label">Date of Performance</div><div class="info-val">${date}</div></div>
      <div class="info-row"><div class="info-label">Date of Submission</div><div class="info-val">&nbsp;</div></div>
      <div class="info-row"><div class="info-label">Batch</div><div class="info-val">&nbsp;</div></div>
    </div>
  </div>
</div>

<div class="section"><div class="section-head">🎯 Aim</div><div class="section-body"><p>${exp.aim}</p></div></div>
<div class="section"><div class="section-head">🔧 Apparatus Required</div><div class="section-body"><p>${exp.apparatus}</p></div></div>

<div class="section">
  <div class="section-head">📖 Theory</div>
  <div class="section-body"><p style="white-space:pre-line">${exp.theory}</p></div>
</div>

<div class="section">
  <div class="section-head">📐 Formulae Used</div>
  <div class="section-body">
    <table class="formula-table">
      <tr><th>Sr.</th><th>Parameter</th><th>Formula</th></tr>
      ${exp.formulas.map((f, i) => `
        <tr><td style="text-align:center">${i+1}</td><td>${f.name}</td><td class="formula-expr">${f.expr}</td></tr>
      `).join('')}
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head">⚙️ Procedure</div>
  <div class="section-body"><ol>${exp.procedure.map(s => `<li>${s}</li>`).join('')}</ol></div>
</div>

<div class="section">
  <div class="section-head">📏 Specimen Data</div>
  <div class="section-body">
    <table class="formula-table">
      <tr><th>Parameter</th><th>Symbol</th><th>Value</th><th>Unit</th></tr>
      <tr><td>Beam Type</td><td>—</td><td>${(window._deflExpReadings && window._deflExpReadings[0]?.type) || '&nbsp;&nbsp;&nbsp;&nbsp;'}</td><td>—</td></tr>
      <tr><td>Width</td><td>b</td><td>${(window._deflExpReadings && window._deflExpReadings[0]?.b) || '&nbsp;&nbsp;&nbsp;&nbsp;'}</td><td>mm</td></tr>
      <tr><td>Depth</td><td>d</td><td>${(window._deflExpReadings && window._deflExpReadings[0]?.d) || '&nbsp;&nbsp;&nbsp;&nbsp;'}</td><td>mm</td></tr>
      <tr><td>Effective Span / Length</td><td>L</td><td>${(window._deflExpReadings && window._deflExpReadings[0]?.L) || '&nbsp;&nbsp;&nbsp;&nbsp;'}</td><td>mm</td></tr>
      <tr><td>Second Moment of Area</td><td>I = bd³/12</td><td>${(window._deflExpReadings && window._deflExpReadings[0] ? (window._deflExpReadings[0].b * window._deflExpReadings[0].d**3/12).toFixed(2) : '&nbsp;&nbsp;&nbsp;&nbsp;')}</td><td>mm⁴</td></tr>
      <tr><td>Young's Modulus (Steel)</td><td>E</td><td>2,00,000</td><td>MPa</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head">📊 Observation Table</div>
  <div class="section-body" style="overflow-x:auto">
    <table class="obs-table">
      <tr>${exp.observations_header.map(h => `<th>${h}</th>`).join('')}</tr>
      ${rows}
    </table>
  </div>
</div>

${extraSection}

<div class="section">
  <div class="section-head">✅ Result</div>
  <div class="section-body">
    <div class="result-highlight">
      <p><strong>1.</strong> The experimental deflection vs load graph is linear, confirming elastic behaviour.</p>
      <p style="margin-top:6px"><strong>2.</strong> The slope of P–δ graph = _______ N/mm (Experimental) vs _______ N/mm (Theoretical)</p>
      <p style="margin-top:6px"><strong>3.</strong> Maximum % error between experimental and theoretical values = _______ %</p>
      <p style="margin-top:6px"><strong>4.</strong> ${exp.conclusion.split('.')[0]}.</p>
    </div>
  </div>
</div>

<div class="section"><div class="section-head">🏭 Industrial Applications</div><div class="section-body"><p>${exp.applications}</p></div></div>

<div class="section">
  <div class="section-head">📝 Conclusion</div>
  <div class="section-body">
    <p>${exp.conclusion}</p>
    <div class="result-highlight" style="margin-top:8px">
      <p><strong>Learning Outcome:</strong> Students can validate theoretical material behaviour against experimental observations and apply flexure formula to engineering beam design.</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-head">❓ Viva-Voce Questions</div>
  <div class="section-body"><ol>${getVivaQuestions(exp.no).map(q => `<li style="margin-bottom:4px">${q}</li>`).join('')}</ol></div>
</div>

<div class="sign-section">
  <div class="sign-box">Student Signature</div>
  <div class="sign-box">Marks Awarded: &nbsp;&nbsp;&nbsp; / 25</div>
  <div class="sign-box">
    Faculty Signature<br>
    <small><strong>Dr. Rahul Bachute</strong></small><br>
    <small>Assoc. Professor, Dept. of Mech. Engg.</small>
  </div>
</div>

<div style="margin-top:24px;padding:10px 16px;border-top:2px solid #003366;display:flex;justify-content:space-between;align-items:center;background:#f0f4ff;border-radius:0 0 6px 6px">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="width:34px;height:34px;background:linear-gradient(135deg,#003366,#0066cc);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px">⚙</div>
    <div>
      <div style="font-size:11px;font-weight:bold;color:#003366">Solid Mechanics Toolkit</div>
      <div style="font-size:10px;color:#555">Interactive Engineering Education Platform · SPPU NEP 2020</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;font-weight:bold;color:#003366">Developed by Dr. Rahul Bachute</div>
    <div style="font-size:10px;color:#555">Associate Professor · Dept. of Mechanical Engineering · Ajeenkya DY Patil School of Engineering, Pune</div>
    <div style="font-size:10px;color:#888;margin-top:2px">github.com/rahulbachute · sites.google.com/view/drrahulbachute</div>
  </div>
</div>

</body>
</html>`;
}


function getVivaQuestions(expNo) {
  const vivaQ = {
    '01': [
      'Define Stress and Strain. What are their SI units?',
      'What is Young\'s Modulus? What is its significance?',
      'Explain the significance of the proportional limit on the stress-strain curve.',
      'What is the difference between upper and lower yield point in mild steel?',
      'Why does necking occur in ductile materials?',
      'How does the stress-strain curve differ for ductile vs brittle materials?',
      'What is % elongation and % reduction in area? What do they indicate?',
      'Define UTS, Yield Stress, and True Fracture Stress.',
    ],
    '02': [
      'State the Euler-Bernoulli bending equation (Flexure formula).',
      'What is neutral axis? What is the stress at the neutral axis?',
      'What is Section Modulus? How does a higher section modulus benefit a beam?',
      'What is I = bd³/12 for a rectangular section? Derive it.',
      'Compare deflection of cantilever vs simply supported beam for same load and span.',
      'What is the permissible deflection limit L/360? Why is it specified?',
      'What are strain gauges? How are they used to measure bending stress?',
      'Why is an I-section beam more efficient than a rectangular section in bending?',
    ],
    '03': [
      'State and explain the Torsion Equation T/J = τ/r = Gθ/L.',
      'What is Polar Moment of Inertia? How is it different from Second Moment of Area?',
      'Why does a ductile shaft fracture at 45° under torsion?',
      'Why is a hollow shaft more efficient than a solid shaft of the same weight?',
      'Define Modulus of Rigidity (G). How is it related to Young\'s Modulus?',
      'What is angle of twist? How is it affected by torque, length, and diameter?',
      'What is the relationship between power, torque, and speed?',
      'Describe the difference in failure patterns for ductile and brittle materials under torsion.',
    ],
    '04': [
      'What is the principle of the Charpy impact test? State the formula for energy absorbed.',
      'What is the difference between Charpy and Izod impact tests?',
      'What is the significance of a notch in impact testing?',
      'What is notch sensitivity? Why is it important in design?',
      'Compare impact strength of Mild Steel, Aluminium, Brass, and Copper.',
      'How does temperature affect impact strength (ductile-to-brittle transition)?',
      'What is the DBTT (Ductile-Brittle Transition Temperature)? Give examples.',
      'Describe the fracture surface appearance of ductile vs brittle fracture.',
    ],
  };
  return vivaQ[expNo] || [];
}

// ─── EXPORT PUBLIC API (for console debugging / extensions) ───────────────────
window.SMToolkit = {
  calcStressStrain, calcSFDBMD, calcDeflection, calcShaft, calcBuckling, calcMohr,
  generateProblem, startQuiz, resetQuiz,
  printCalculatorResults, copyResultsToClipboard,
  showToast, trackEvent, openExperimentReport,
  openQBModal, closeQBModal, renderQBank, filterQBank,
  AppState,
};

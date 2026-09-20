import './style.css';
import { Simulation, DEFAULTS } from './simulation.js';
import { createScene } from './scene.js';

const sim = new Simulation();
const icon = { play: '▶', pause: 'Ⅱ', reset: '↺' };
document.querySelector('#app').innerHTML = `
  <header class="header">
    <div class="brand"><div class="brand-mark">u<span>·</span></div><div><strong>WORKCELL <span>STUDIO</span></strong><small>UFACTORY 850 / IC PROGRAMMING</small></div></div>
    <div class="header-right"><span class="simulation-badge"><i></i> SIMULATION ONLY</span><span class="version">LOCAL / V0.1</span></div>
  </header>
  <main>
    <aside class="setup panel">
      <div class="panel-title"><span>01 / SETUP</span><span class="tiny-badge">HQFN</span></div>
      <h1>A workcell,<br>before the hardware.</h1><p class="intro">Explore your pick, program, and sort cycle with a custom vacuum tool.</p>
      <form id="setup-form">
        <fieldset><legend>PACKAGE & TOOL</legend>
          <label>Package width <div class="number-input"><input name="packageSize" type="number" min="3" max="16" step="0.5" value="7" required><span>mm</span></div></label>
          <label>Nozzle diameter <div class="number-input"><input name="nozzleSize" type="number" min="1" max="15" step="0.5" value="3" required><span>mm</span></div></label>
          <div class="hint">Square package placeholder · 2 mm thick</div>
        </fieldset>
        <fieldset><legend>TRAY GEOMETRY</legend>
          <div class="input-pair"><label>Rows<input name="rows" type="number" min="1" max="8" value="4" required></label><label>Columns<input name="cols" type="number" min="1" max="8" value="6" required></label></div>
          <label>Pocket pitch <div class="number-input"><input name="pitch" type="number" min="7" max="25" step="0.5" value="18" required><span>mm</span></div></label>
        </fieldset>
        <fieldset><legend>CAMERA ALIGNMENT</legend>
          <label>Pickup offset X <div class="number-input"><input name="pickupOffsetX" type="number" min="-6" max="6" step="0.1" value="0.6" required><span>mm</span></div></label>
          <label>Pickup offset Z <div class="number-input"><input name="pickupOffsetZ" type="number" min="-6" max="6" step="0.1" value="-0.4" required><span>mm</span></div></label>
          <p class="hint">Simulated package-center offset from nozzle. Camera → release into nest → centered re-pick → verify.</p>
        </fieldset>
        <fieldset><legend>PROCESS RECIPE</legend>
          <label>Flash & verify <div class="number-input"><input name="flashTime" type="number" min="0.5" max="30" step="0.5" value="3" required><span>sec</span></div></label>
          <label>Blow-off pulse <div class="number-input"><input name="blowTime" type="number" min="0.1" max="1" step="0.05" value="0.25" required><span>sec</span></div></label>
          <label>Simulated pass rate <div class="number-input"><input name="passRate" type="number" min="0" max="100" value="85" required><span>%</span></div></label>
        </fieldset>
        <p id="form-error" class="error" role="alert"></p>
        <button type="submit" class="secondary wide" id="apply">Apply & reset batch <span>↗</span></button>
      </form>
      <div class="setup-note"><span>◎</span><p>Adjustable concept geometry.<br>Robot motion and fixtures require calibration before physical use.</p></div>
    </aside>
    <section class="workspace">
      <div class="workspace-heading"><div><span class="eyebrow">CELL / 001</span><h2>IC programming cell</h2></div><div class="status-pill" id="status">Ready</div></div>
      <div class="viewport-wrap">
        <div id="viewport" aria-label="Interactive 3D robot workcell: drag to orbit, scroll to zoom"></div>
        <div class="viewport-toolbar"><span class="viewport-tag"><i></i> LIVE VIEW</span><div class="view-buttons"><button data-view="perspective" class="active">Perspective</button><button data-view="top">Top</button><button data-view="tool">Tool close-up</button></div></div>
        <div class="viewport-bottom"><span>DRAG TO ORBIT <b>·</b> SCROLL TO ZOOM</span><span>mm / Y UP</span></div>
        <div class="model-note">UFACTORY U850 · 6 DOF · no collision validation</div>
      </div>
      <div class="transport">
        <button class="primary" id="run">${icon.play} <span>Start batch</span></button>
        <button class="secondary" id="step" title="Advance one process phase">Step phase →</button>
        <button class="icon-button" id="reset" aria-label="Reset batch" title="Reset batch">${icon.reset}</button>
        <div class="speed"><label for="speed">PLAYBACK</label><input id="speed" type="range" min="0.25" max="4" step="0.25" value="1"><output id="speed-value">1×</output></div>
      </div>
      <section class="vision-panel" aria-label="Simulated camera inspection">
        <div class="vision-image">
          <svg viewBox="0 0 160 160" role="img" aria-label="Measured package center relative to calibrated nozzle center">
            <path d="M80 0V160M0 80H160" stroke="#365366" stroke-dasharray="4 4"/>
            <rect id="vision-package" fill="#78e0b820" stroke="#78e0b8" stroke-width="2"/>
            <circle id="vision-nozzle" cx="80" cy="80" fill="none" stroke="#e4c478" stroke-dasharray="3 3"/>
            <path d="M74 80H86M80 74V86" stroke="#e4c478" stroke-width="2"/>
            <circle id="vision-center" r="3" fill="#78e0b8"/>
          </svg>
        </div>
        <div class="vision-details"><span class="eyebrow">DESK CAMERA / SIMULATED MEASUREMENT</span><h3 id="vision-status">Waiting for package</h3><div id="vision-offset">ΔX — · ΔZ — mm</div><p class="hint">Green: package · dashed amber: calibrated nozzle reference.<br>Upward view; image right = +X, image down = +Z. Re-pick physically centers the IC.</p></div>
      </section>
      <div class="stats">
        <div><span><i class="dot intake"></i> INTAKE</span><strong id="intake-count">24<small>remaining</small></strong></div>
        <div><span><i class="dot good"></i> GOOD</span><strong id="good-count">0<small>programmed</small></strong></div>
        <div><span><i class="dot fail"></i> FAIL</span><strong id="fail-count">0<small>rejected</small></strong></div>
        <div><span>SIMULATED TIME</span><strong id="elapsed">00:00<small>elapsed</small></strong></div>
      </div>
      <div class="event-panel"><div class="event-heading"><span>EVENT LOG</span><button id="export">Export run ↓</button></div><div id="events" aria-label="Process event log"></div></div>
    </section>
    <aside class="process panel">
      <div class="panel-title"><span>02 / PROCESS</span><span id="part-number">— / 24</span></div>
      <div class="phase-heading"><span class="eyebrow">CURRENT OPERATION</span><h2 id="phase-label">Ready to begin</h2><div class="progress-track"><div id="phase-progress"></div></div></div>
      <ol class="sequence">
        <li data-phase="pick"><span class="step-number">01</span><div><strong>Pick from intake</strong><small>Lower tool · establish suction</small></div><span class="phase-indicator"></span></li>
        <li data-phase="align"><span class="step-number">02</span><div><strong>Camera alignment</strong><small>Inspect · centered re-pick · verify</small></div><span class="phase-indicator"></span></li>
        <li data-phase="transfer"><span class="step-number">03</span><div><strong>Load the flasher</strong><small>Transfer · seat · blow off</small></div><span class="phase-indicator"></span></li>
        <li data-phase="flash"><span class="step-number">04</span><div><strong>Program & verify</strong><small>Tool clear · vacuum off</small></div><span class="phase-indicator"></span></li>
        <li data-phase="retrieve"><span class="step-number">05</span><div><strong>Retrieve the IC</strong><small>Suction · lift from socket</small></div><span class="phase-indicator"></span></li>
        <li data-phase="sort"><span class="step-number">06</span><div><strong>Sort by result</strong><small>Good or fail · release · retract</small></div><span class="phase-indicator"></span></li>
      </ol>
      <section class="tool-panel"><div class="panel-title"><span>VACUUM TOOL</span><span class="tiny-badge">CUSTOM</span></div>
        <div class="tool-illustration"><div class="tool-flange"></div><div class="tool-body"></div><div class="tool-shaft"></div><div class="tool-cup" id="tool-cup"></div><div class="air-stream" id="air-stream">···</div><span id="vacuum-label">OFF</span></div>
        <div class="vacuum-controls"><button data-vacuum="suction">↑ Suction</button><button data-vacuum="blow">↓ Blow-off</button><button data-vacuum="off" class="selected">○ Off</button></div>
        <p class="hint" id="vacuum-hint">Bench-test the tool before starting a batch.</p>
      </section>
      <section class="tcp-panel"><div class="panel-title"><span>TOOL POSITION</span><span>mm</span></div><div class="coordinates"><div>X <strong id="tcp-x">0.0</strong></div><div>Y <strong id="tcp-y">320.0</strong></div><div>Z <strong id="tcp-z">-100.0</strong></div></div><p class="hint">Scene coordinates · Y is vertical</p></section>
      <section class="joint-panel"><div class="panel-title"><span>U850 / SIX JOINTS</span><span>deg</span></div>
        <div class="joint-grid">${Array.from({length:6},(_,i)=>`<div><span>J${i+1}</span><strong id="joint-${i}">—</strong></div>`).join('')}</div>
        <p class="hint" id="robot-state">Loading official U850 meshes…</p>
        <p id="motion-error" class="error" role="alert"></p>
      </section>
      <div class="batch-progress"><div><span>BATCH PROGRESS</span><strong id="batch-fraction">0 / 24</strong></div><div class="progress-track"><div id="batch-progress"></div></div></div>
    </aside>
  </main>
  <footer><span><i></i> LOCAL SIMULATOR <b>/</b> NO HARDWARE CONNECTION</span><span>Intake <b>→</b> Flash <b>→</b> Good / Fail</span></footer>
`;
let scene;
try { scene = createScene(document.querySelector('#viewport'), sim); }
catch (error) { document.querySelector('#viewport').innerHTML = `<div class="webgl-error">3D rendering is unavailable. Enable WebGL in your browser to view the workcell.</div>`; console.error(error); }
const $ = id => document.getElementById(id);
const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
let lastLog = null;
function renderUI() {
  const running = sim.status === 'running', complete = sim.status === 'complete';
  $('status').textContent = { idle: 'Ready', running: 'Running', paused: 'Paused', complete: 'Batch complete' }[sim.status];
  $('status').className = `status-pill ${sim.status}`;
  $('run').innerHTML = `${running ? icon.pause : icon.play} <span>${running ? 'Pause' : sim.status === 'paused' ? 'Resume' : complete ? 'Batch complete' : 'Start batch'}</span>`;
  const meshReady = scene?.modelState.status === 'ready';
  $('run').disabled = complete || Boolean(sim.motionFault) || !meshReady;
  $('step').disabled = running || complete || Boolean(sim.motionFault) || !meshReady;
  sim.robot.joints.forEach((angle, i) => { $(`joint-${i}`).textContent = `${(angle * 180 / Math.PI).toFixed(1)}°`; });
  $('robot-state').textContent = meshReady ? `6-axis IK · position residual ${sim.robot.positionError.toFixed(3)} mm · nominal geometry` : scene?.modelState.status === 'error' ? 'Robot model failed to load. Reload to retry.' : 'Loading official U850 meshes…';
  $('motion-error').textContent = sim.motionFault ?? '';
  document.querySelectorAll('#setup-form input, #apply').forEach(el => { el.disabled = running; });
  $('phase-label').textContent = complete ? 'All packages sorted' : sim.phase?.label ?? 'Ready to begin';
  $('phase-progress').style.width = `${sim.phase ? sim.phase.elapsed / sim.phase.duration * 100 : complete ? 100 : 0}%`;
  $('part-number').textContent = `${sim.currentId === null ? '—' : String(sim.currentId + 1).padStart(2, '0')} / ${sim.parts.length}`;
  const count = (id, val, label) => { $(id).innerHTML = `${val}<small>${label}</small>`; };
  count('intake-count', sim.parts.filter(p => p.location === 'intake').length, 'remaining');
  count('good-count', sim.good, 'programmed'); count('fail-count', sim.fail, 'rejected'); count('elapsed', time(sim.elapsed), 'elapsed');
  const phaseNames = ['pick', 'align', 'transfer', 'flash', 'retrieve', 'sort'], phaseIndex = phaseNames.indexOf(sim.phase?.group);
  document.querySelectorAll('[data-phase]').forEach((el, i) => { el.classList.toggle('current', i === phaseIndex); el.classList.toggle('done', complete || i < phaseIndex); });
  document.querySelectorAll('[data-vacuum]').forEach(el => { el.classList.toggle('selected', el.dataset.vacuum === sim.vacuum); el.disabled = Boolean(sim.phase) || running; });
  $('vacuum-label').textContent = { suction: 'SUCTION', blow: 'BLOW-OFF', off: 'OFF' }[sim.vacuum];
  $('tool-cup').dataset.state = sim.vacuum; $('air-stream').dataset.state = sim.vacuum;
  $('vacuum-hint').textContent = sim.phase ? 'Tool states follow the automatic cycle.' : 'Bench-test the tool before starting a batch.';
  ['x', 'y', 'z'].forEach((axis, i) => { $(`tcp-${axis}`).textContent = sim.tcp[i].toFixed(1); });
  const measured = sim.vision.measured, scale = 100 / sim.config.packageSize;
  $('vision-status').textContent = sim.vision.status;
  $('vision-offset').textContent = measured ? `ΔX ${measured[0].toFixed(2)} · ΔZ ${measured[1].toFixed(2)} mm` : 'ΔX — · ΔZ — mm';
  const cx = 80 + (measured?.[0] ?? 0) * scale, cy = 80 + (measured?.[1] ?? 0) * scale;
  for (const [key, value] of Object.entries({ x: cx - 50, y: cy - 50, width: 100, height: 100, visibility: measured ? 'visible' : 'hidden' })) $('vision-package').setAttribute(key, value);
  $('vision-center').setAttribute('cx', cx); $('vision-center').setAttribute('cy', cy); $('vision-center').setAttribute('visibility', measured ? 'visible' : 'hidden');
  $('vision-nozzle').setAttribute('r', sim.config.nozzleSize * scale / 2);
  $('batch-fraction').textContent = `${sim.good + sim.fail} / ${sim.parts.length}`;
  $('batch-progress').style.width = `${(sim.good + sim.fail) / sim.parts.length * 100}%`;
  if (lastLog !== sim.logs[0]) { lastLog = sim.logs[0]; $('events').replaceChildren(...sim.logs.map(log => { const div = document.createElement('div'), stamp = document.createElement('time'), message = document.createElement('span'); stamp.textContent = time(log.time); message.textContent = log.message; div.append(stamp, message); return div; })); }
}
$('run').onclick = () => { if (sim.status === 'running') sim.pause(); else sim.start(); renderUI(); };
$('step').onclick = () => { sim.step(); renderUI(); };
$('reset').onclick = () => { sim.reset(); scene?.rebuild(); renderUI(); };
$('speed').oninput = e => { sim.config.speed = Number(e.target.value); $('speed-value').textContent = `${sim.config.speed}×`; };
$('setup-form').onsubmit = e => {
  e.preventDefault();
  const config = Object.fromEntries([...new FormData(e.target)].map(([key, value]) => [key, Number(value)]));
  try { sim.reset({ ...DEFAULTS, ...config, speed: sim.config.speed }); scene?.rebuild(); $('form-error').textContent = ''; renderUI(); }
  catch (error) { $('form-error').textContent = error.message; }
};
document.querySelectorAll('[data-view]').forEach(el => { el.onclick = () => { scene?.view(el.dataset.view); document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button === el)); }; });
document.querySelectorAll('[data-vacuum]').forEach(el => { el.onclick = () => { sim.manualVacuum(el.dataset.vacuum); renderUI(); }; });
$('export').onclick = () => {
  const report = { schemaVersion: 2, simulationOnly: true, exportedAt: new Date().toISOString(), model: 'Official nominal U850 URDF; six-axis IK; no collision or dynamics validation', jointAnglesRadians: sim.robot.joints, ikResidual: { positionMm: sim.robot.positionError, orientationRad: sim.robot.angleError }, motionFault: sim.motionFault, configuration: sim.config, status: sim.status, simulatedSeconds: sim.elapsed, results: { good: sim.good, fail: sim.fail }, parts: sim.parts, vision: sim.vision, events: [...sim.logs].reverse() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'u850-simulation-run.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let previous = performance.now(), lastUI = 0;
function frame(now) { sim.update(Math.min((now - previous) / 1000, 0.1)); previous = now; scene?.update(); if (now - lastUI > 80) { renderUI(); lastUI = now; } requestAnimationFrame(frame); }
renderUI(); requestAnimationFrame(frame);

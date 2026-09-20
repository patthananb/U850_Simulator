export const DEFAULTS = Object.freeze({ rows: 4, cols: 6, pitch: 18, packageSize: 7, nozzleSize: 3, flashTime: 3, blowTime: 0.25, passRate: 85, speed: 1 });
export const STATIONS = Object.freeze({ intake: [-152, 0, -150], good: [0, 0, -150], fail: [152, 0, -150], flasher: [0, 0, -350] });
export const HOME = [0, 320, -100];
export const FLASH_POINT = [0, 70, -350];
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export function stationPosition(station, config) {
  const [x, y, z] = STATIONS[station];
  // Keep a 30 mm edge-to-edge gap as the tray width changes.
  return [station === 'flasher' ? x : Math.sign(x) * (config.cols * config.pitch + 14 + 30), y, z];
}
export function slotPosition(station, index, config) {
  const [x, , z] = stationPosition(station, config);
  return [x + (index % config.cols - (config.cols - 1) / 2) * config.pitch, 25, z + (Math.floor(index / config.cols) - (config.rows - 1) / 2) * config.pitch];
}
export function validateConfig(c) {
  for (const key of Object.keys(DEFAULTS)) if (!Number.isFinite(c[key])) throw new Error(`${key} must be a number.`);
  if (![c.rows, c.cols].every(n => Number.isInteger(n) && n >= 1 && n <= 8)) throw new Error('Tray rows and columns must be integers from 1 to 8.');
  if (c.packageSize < 3 || c.packageSize > 16) throw new Error('Package size must be 3–16 mm.');
  if (c.nozzleSize < 1 || c.nozzleSize >= c.packageSize) throw new Error('Nozzle diameter must be at least 1 mm and smaller than the package.');
  if (c.pitch < c.packageSize + 4 || c.pitch > 25) throw new Error('Tray pitch must leave at least 4 mm between packages and be at most 25 mm.');
  if (c.flashTime < 0.5 || c.flashTime > 30 || c.blowTime < 0.1 || c.blowTime > 1) throw new Error('Flash time must be 0.5–30 s; blow-off must be 0.1–1 s.');
  if (c.passRate < 0 || c.passRate > 100 || c.speed < 0.25 || c.speed > 8) throw new Error('Pass rate or playback speed is outside its range.');
  return c;
}
export class Simulation {
  constructor(config = {}) { this.reset(config); }
  reset(config = this.config) {
    this.config = validateConfig({ ...DEFAULTS, ...config });
    this.parts = Array.from({ length: this.config.rows * this.config.cols }, (_, id) => ({ id, location: 'intake', slot: id, result: null }));
    this.status = 'idle'; this.tcp = [...HOME]; this.vacuum = 'off'; this.held = null;
    this.phase = null; this.queue = []; this.elapsed = 0; this.good = 0; this.fail = 0;
    this.logs = []; this.seed = 850; this.currentId = null; this.stepMode = false;
    this.log('Workcell ready. Load a cycle to begin.');
  }
  log(message) { this.logs.unshift({ time: this.elapsed, message }); }
  random() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
  start() {
    if (this.status === 'complete') return;
    if (!this.phase) this.nextPart();
    if (this.phase) { this.status = 'running'; this.stepMode = false; }
  }
  pause() { if (this.status === 'running') this.status = 'paused'; }
  step() { this.start(); this.stepMode = true; }
  manualVacuum(state) {
    if (!['suction', 'blow', 'off'].includes(state)) throw new Error('Unknown vacuum state.');
    if (this.phase || this.status === 'running') return false;
    this.vacuum = state; this.log(`Tool bench test: ${state}.`); return true;
  }
  nextPart() {
    this.vacuum = 'off';
    const part = this.parts.find(p => p.location === 'intake');
    if (!part) { this.status = 'complete'; this.currentId = null; this.vacuum = 'off'; this.log('Batch complete. All packages sorted.'); return; }
    this.currentId = part.id;
    const pick = slotPosition('intake', part.slot, this.config);
    const above = p => [p[0], p[1] + 100, p[2]];
    const move = (label, group, target, action) => ({ label, group, target, action });
    const dwell = (label, group, duration, action, enter) => ({ label, group, duration, action, enter });
    this.queue = [
      move('Approach intake', 'pick', above(pick)),
      move('Lower to package', 'pick', pick),
      dwell('Establish suction', 'pick', 0.35, () => { this.held = part.id; part.location = 'tool'; this.log(`IC ${part.id + 1}: picked from intake.`); }, () => { this.vacuum = 'suction'; }),
      move('Lift package', 'transfer', above(pick)),
      move('Move to flasher', 'transfer', above(FLASH_POINT)),
      move('Seat in socket', 'transfer', FLASH_POINT),
      dwell('Release into socket', 'transfer', this.config.blowTime, () => { this.held = null; part.location = 'flasher'; this.vacuum = 'off'; }, () => { this.vacuum = 'blow'; }),
      move('Clear the socket', 'flash', above(FLASH_POINT)),
      dwell('Program & verify', 'flash', this.config.flashTime, () => {
        part.result = this.random() < this.config.passRate / 100 ? 'good' : 'fail';
        this.log(`IC ${part.id + 1}: ${part.result === 'good' ? 'programming passed' : 'programming failed'} (simulated).`);
        const destination = slotPosition(part.result, this[part.result], this.config);
        this.queue.push(
          move('Lower to socket', 'retrieve', FLASH_POINT),
          dwell('Pick programmed package', 'retrieve', 0.35, () => { this.held = part.id; part.location = 'tool'; }, () => { this.vacuum = 'suction'; }),
          move('Lift from flasher', 'retrieve', above(FLASH_POINT)),
          move(`Move to ${part.result} tray`, 'sort', above(destination)),
          move('Lower into tray pocket', 'sort', destination),
          dwell('Blow off package', 'sort', this.config.blowTime, () => {
            this.held = null; part.location = part.result; part.slot = this[part.result]++; this.vacuum = 'off';
            this.log(`IC ${part.id + 1}: placed in ${part.result} tray.`);
          }, () => { this.vacuum = 'blow'; }),
          move('Retract tool', 'sort', above(destination)),
          move('Return to ready position', 'sort', HOME)
        );
      })
    ];
    this.advancePhase();
  }
  advancePhase() {
    this.phase = this.queue.shift() ?? null;
    if (!this.phase) { this.nextPart(); return; }
    this.phase.from = [...this.tcp]; this.phase.elapsed = 0;
    this.phase.duration ??= Math.max(0.3, Math.hypot(...this.phase.target.map((v, i) => v - this.tcp[i])) / 220);
    this.phase.enter?.();
  }
  update(dt) {
    if (this.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    let remaining = dt * this.config.speed;
    while (remaining > 1e-9 && this.phase && this.status === 'running') {
      const phase = this.phase, increment = Math.min(remaining, phase.duration - phase.elapsed);
      remaining -= increment; phase.elapsed += increment; this.elapsed += increment;
      const t = Math.min(1, phase.elapsed / phase.duration);
      if (phase.target) this.tcp = lerp(phase.from, phase.target, t * t * (3 - 2 * t));
      if (t >= 1) {
        phase.action?.();
        this.advancePhase();
        if (this.stepMode && this.status !== 'complete') this.status = 'paused';
      }
    }
  }
}

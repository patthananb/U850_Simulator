import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, DEFAULTS, slotPosition } from '../src/simulation.js';

function finish(sim) {
  sim.start();
  for (let i = 0; i < 20000 && sim.status !== 'complete'; i++) {
    sim.update(0.25);
    assert.equal(sim.parts.length, sim.config.rows * sim.config.cols);
    assert.equal(sim.parts.filter(p => p.location === 'tool').length, sim.held === null ? 0 : 1);
    assert.equal(sim.parts.filter(p => p.location === 'good').length, sim.good);
    assert.equal(sim.parts.filter(p => p.location === 'fail').length, sim.fail);
    if (sim.phase?.label === 'Program & verify') {
      assert.equal(sim.vacuum, 'off');
      assert.equal(sim.held, null);
      assert.equal(sim.parts.filter(p => p.location === 'flasher').length, 1);
    }
  }
  assert.equal(sim.status, 'complete');
}
test('all-pass batch conserves every IC and fills unique good pockets', () => {
  const sim = new Simulation({ passRate: 100 }); finish(sim);
  assert.equal(sim.good, 24); assert.equal(sim.fail, 0);
  assert.deepEqual(sim.parts.map(p => p.slot), Array.from({ length: 24 }, (_, i) => i));
  assert.equal(sim.vacuum, 'off'); assert.equal(sim.held, null);
});
test('all-fail batch sends every IC to the fail tray', () => {
  const sim = new Simulation({ passRate: 0 }); finish(sim);
  assert.equal(sim.fail, 24); assert.equal(sim.good, 0);
  assert.ok(sim.parts.every(p => p.location === 'fail'));
});
test('mixed results repeat from the same seed and include both outcomes', () => {
  const a = new Simulation(), b = new Simulation(); finish(a); finish(b);
  assert.deepEqual(a.parts, b.parts);
  assert.ok(a.good > 0 && a.fail > 0); assert.equal(a.good + a.fail, 24);
});
test('pause freezes positions, clock, attachment, and phase; resume completes', () => {
  const sim = new Simulation(); sim.start(); sim.update(5); sim.pause();
  const snapshot = JSON.stringify(sim); sim.update(100);
  assert.equal(JSON.stringify(sim), snapshot); finish(sim);
});
test('step advances exactly one phase and prevents automatic batch playback', () => {
  const sim = new Simulation(); sim.step(); sim.update(100);
  assert.equal(sim.status, 'paused'); assert.equal(sim.phase.label, 'Lower to package');
  sim.step(); sim.update(100);
  assert.equal(sim.status, 'paused'); assert.equal(sim.phase.label, 'Establish suction');
});
test('vacuum bench test supports three states and is locked during a cycle', () => {
  const sim = new Simulation();
  for (const state of ['suction', 'blow', 'off']) { assert.equal(sim.manualVacuum(state), true); assert.equal(sim.vacuum, state); }
  sim.manualVacuum('blow'); sim.start(); assert.equal(sim.vacuum, 'off');
  assert.equal(sim.manualVacuum('blow'), false); sim.pause(); assert.equal(sim.manualVacuum('off'), false);
});
test('reset clears an in-flight package and restores intake inventory', () => {
  const sim = new Simulation(); sim.start();
  while (sim.held === null) sim.update(0.1);
  sim.reset(); assert.equal(sim.held, null); assert.equal(sim.phase, null); assert.equal(sim.vacuum, 'off');
  assert.equal(sim.status, 'idle'); assert.ok(sim.parts.every(p => p.location === 'intake'));
});
test('invalid geometry is rejected without changing the current simulation', () => {
  const sim = new Simulation(); const before = JSON.stringify(sim);
  assert.throws(() => sim.reset({ nozzleSize: 8 }), /Nozzle/);
  assert.equal(JSON.stringify(sim), before);
  assert.throws(() => sim.reset({ pitch: 9 }), /pitch/);
  assert.throws(() => sim.reset({ rows: 1.5 }), /integers/);
  assert.throws(() => sim.reset({ flashTime: NaN }), /number/);
});
test('tray spacing follows the configured millimetre pitch', () => {
  const a = slotPosition('intake', 0, DEFAULTS), b = slotPosition('intake', 1, DEFAULTS), c = slotPosition('intake', 6, DEFAULTS);
  assert.equal(b[0] - a[0], 18); assert.equal(c[2] - a[2], 18);
});
test('single-pocket and maximum-size batches complete without overwriting parts', () => {
  for (const n of [1, 8]) {
    const sim = new Simulation({ rows: n, cols: n }); finish(sim);
    for (const dest of ['good', 'fail']) {
      const slots = sim.parts.filter(p => p.location === dest).map(p => p.slot);
      assert.equal(new Set(slots).size, slots.length);
    }
  }
});

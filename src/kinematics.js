import { Matrix4, Quaternion, Euler, Vector3 } from 'three';

// UFACTORY xarm_ros uf850_default_kinematics.yaml, nominal URDF joint origins.
// Positions are converted from metres to mm. RPY is extrinsic XYZ (Rz Ry Rx).
export const ORIGINS = [
  [[0, 0, 364], [0, 0, 0]],
  [[0, 0, 0], [1.5708, -1.5708, 0]],
  [[390, 0, 0], [-3.1416, 0, -1.5708]],
  [[150, 426, 0], [-1.5708, 0, 0]],
  [[0, 0, 0], [-1.5708, 0, 0]],
  [[0, -90, 0], [1.5708, 0, 0]],
];
export const LIMITS = [[-2 * Math.PI, 2 * Math.PI], [-2.3038346, 2.3038346], [-4.2236968, 0.061087], [-2 * Math.PI, 2 * Math.PI], [-2.1642, 2.1642], [-2 * Math.PI, 2 * Math.PI]];
export const TOOL_LENGTH = 101;
export const BASE = new Matrix4().makeTranslation(0, 0, 220).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
const transforms = ORIGINS.map(([p, r]) => new Matrix4().makeRotationFromEuler(new Euler(...r, 'ZYX')).setPosition(...p));
const desiredRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
export const HOME_SEED = [0, -0.5, -1.5, 0, 1, 0];

export function forward(joints) {
  const frames = []; const current = new Matrix4();
  for (let i = 0; i < 6; i++) {
    current.multiply(transforms[i]).multiply(new Matrix4().makeRotationZ(joints[i]));
    frames.push(current.clone());
  }
  return { frames, flange: current, position: new Vector3().setFromMatrixPosition(current), rotation: new Quaternion().setFromRotationMatrix(current) };
}
export function sceneTCP(joints) {
  return new Vector3(0, 0, TOOL_LENGTH).applyMatrix4(forward(joints).flange).applyMatrix4(BASE).toArray();
}
function rotationError(target, actual) {
  const q = target.clone().multiply(actual.clone().invert()).normalize();
  if (q.w < 0) { q.x *= -1; q.y *= -1; q.z *= -1; q.w *= -1; }
  const s = Math.hypot(q.x, q.y, q.z), angle = 2 * Math.atan2(s, q.w);
  return s < 1e-10 ? [0, 0, 0] : [q.x, q.y, q.z].map(v => v * angle / s);
}
function linearSolve(a, b) {
  const m = a.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < 6; i++) {
    let pivot = i;
    for (let j = i + 1; j < 6; j++) if (Math.abs(m[j][i]) > Math.abs(m[pivot][i])) pivot = j;
    [m[i], m[pivot]] = [m[pivot], m[i]];
    if (Math.abs(m[i][i]) < 1e-12) return null;
    const v = m[i][i]; for (let k = i; k <= 6; k++) m[i][k] /= v;
    for (let j = 0; j < 6; j++) if (j !== i) { const f = m[j][i]; for (let k = i; k <= 6; k++) m[j][k] -= f * m[i][k]; }
  }
  return m.map(r => r[6]);
}
export function inverse(tcp, seed = HOME_SEED, iterations = 80) {
  const target = new Vector3(tcp[0], 220 - tcp[2], tcp[1] + TOOL_LENGTH);
  let q = seed.map((v, i) => Math.max(LIMITS[i][0], Math.min(LIMITS[i][1], v)));
  const evaluate = angles => {
    const f = forward(angles), p = target.clone().sub(f.position).toArray(), r = rotationError(desiredRotation, f.rotation);
    return { f, error: [...p, ...r.map(v => v * 150)], positionError: Math.hypot(...p), angleError: Math.hypot(...r) };
  };
  let e = evaluate(q);
  for (let iter = 0; iter < iterations; iter++) {
    if (e.positionError < 0.02 && e.angleError < 0.0002) break;
    const jacobian = Array.from({ length: 6 }, () => Array(6).fill(0));
    for (let j = 0; j < 6; j++) {
      const shifted = [...q]; shifted[j] += 1e-5;
      const f = forward(shifted), dp = f.position.clone().sub(e.f.position).toArray();
      const dr = rotationError(f.rotation, e.f.rotation);
      [...dp, ...dr.map(v => v * 150)].forEach((v, i) => { jacobian[i][j] = v / 1e-5; });
    }
    const a = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => jacobian.reduce((sum, row) => sum + row[i] * row[j], 0) + (i === j ? 4 : 0)));
    const b = Array.from({ length: 6 }, (_, j) => jacobian.reduce((sum, row, i) => sum + row[j] * e.error[i], 0));
    const step = linearSolve(a, b); if (!step) break;
    const maxStep = Math.max(...step.map(Math.abs)), factor = maxStep > 0.25 ? 0.25 / maxStep : 1;
    let improved = false;
    for (const gain of [1, 0.5, 0.25, 0.1]) {
      const next = q.map((v, i) => Math.max(LIMITS[i][0], Math.min(LIMITS[i][1], v + step[i] * factor * gain)));
      const candidate = evaluate(next);
      if (Math.hypot(...candidate.error) < Math.hypot(...e.error)) { q = next; e = candidate; improved = true; break; }
    }
    if (!improved) break;
  }
  return { joints: q, converged: e.positionError < 0.02 && e.angleError < 0.0002, positionError: e.positionError, angleError: e.angleError };
}

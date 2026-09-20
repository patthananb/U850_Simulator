import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3, Quaternion } from 'three';
import { forward, inverse, sceneTCP, LIMITS } from '../src/kinematics.js';
import { Simulation, DEFAULTS, slotPosition, HOME, CAMERA_POINT, NEST_POINT, FLASH_POINT } from '../src/simulation.js';

// Independent published standard-DH formulation; production uses URDF origins.
function dhForward(q) {
  const table = [[0,364,90,0],[90,0,180,390],[90,0,-90,150],[0,426,-90,0],[0,0,90,0],[0,90,0,0]];
  const m = new Matrix4();
  table.forEach(([offset,d,alpha,a],i) => {
    const theta=q[i]+offset*Math.PI/180, twist=alpha*Math.PI/180;
    const c=Math.cos(theta),s=Math.sin(theta),ca=Math.cos(twist),sa=Math.sin(twist);
    m.multiply(new Matrix4().set(c,-s*ca,s*sa,a*c,s,c*ca,-c*sa,a*s,0,sa,ca,d,0,0,0,1));
  });
  return m;
}
test('official URDF forward kinematics agrees with independent standard DH at diverse joint poses', () => {
  for(const q of [[0,0,0,0,0,0],[1,.4,-1.8,.5,.7,-.9],[-2,-1,-2.3,2,-1,3]]) {
    const urdf=forward(q), dh=dhForward(q);
    assert.ok(urdf.position.distanceTo(new Vector3().setFromMatrixPosition(dh))<0.02);
    assert.ok(urdf.rotation.angleTo(new Quaternion().setFromRotationMatrix(dh))<0.00005);
  }
  const zero=forward([0,0,0,0,0,0]).position;
  assert.ok(zero.distanceTo(new Vector3(150,0,238))<0.01);
});
test('IK reaches all stations and outer tray corners with a downward tool within joint limits', () => {
  let seed;
  const poses=[HOME,CAMERA_POINT,NEST_POINT,FLASH_POINT];
  for(const station of ['intake','good','fail']) for(const slot of [0,5,18,23]) poses.push(slotPosition(station,slot,DEFAULTS));
  for(const p of poses) {
    const result=inverse(p,seed); assert.ok(result.converged,JSON.stringify({p,result})); seed=result.joints;
    assert.ok(Math.hypot(...sceneTCP(seed).map((v,i)=>v-p[i]))<0.05);
    seed.forEach((v,i)=>assert.ok(v>=LIMITS[i][0]&&v<=LIMITS[i][1]));
    const down=new Vector3(0,0,1).applyQuaternion(forward(seed).rotation);
    assert.ok(down.distanceTo(new Vector3(0,0,-1))<0.0002);
  }
});
test('IK rejects unreachable targets instead of stretching links', () => {
  assert.equal(inverse([3000,100,-300]).converged,false);
});
test('unreachable motion pauses without advancing phase, clock, grasp, or accepted robot pose', () => {
  const sim=new Simulation();sim.start();
  sim.phase.target=[3000,100,-300];sim.phase.duration=0.1;
  const before={joints:[...sim.robot.joints],tcp:[...sim.tcp],elapsed:sim.elapsed};
  sim.update(1);
  assert.equal(sim.status,'paused');assert.ok(sim.motionFault);
  assert.deepEqual(sim.robot.joints,before.joints);assert.deepEqual(sim.tcp,before.tcp);assert.equal(sim.elapsed,before.elapsed);
  assert.equal(sim.held,null);sim.start();assert.equal(sim.status,'paused');
  sim.reset();assert.equal(sim.motionFault,null);assert.equal(sim.robot.converged,true);
});
test('complete camera and sorting trajectory maintains joint continuity and actual TCP accuracy', () => {
  const sim=new Simulation({rows:1,cols:2});sim.start();let last=[...sim.robot.joints],maximumStep=0;
  for(let i=0;i<10000&&sim.status!=='complete';i++) {
    sim.update(0.02);assert.equal(sim.motionFault,null);
    assert.ok(Math.hypot(...sceneTCP(sim.robot.joints).map((v,k)=>v-sim.tcp[k]))<0.05);
    maximumStep=Math.max(maximumStep,...sim.robot.joints.map((v,k)=>Math.abs(v-last[k])));last=[...sim.robot.joints];
  }
  assert.equal(sim.status,'complete');assert.ok(maximumStep<0.1,`joint jump ${maximumStep} rad`);
});

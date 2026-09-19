import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { STATIONS, FLASH_POINT, slotPosition } from './simulation.js';

const COLORS = { intake: '#71a6ff', good: '#62dab0', fail: '#ed997c', flasher: '#e4c478' };
export function createScene(container, sim) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#111b23');
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor('#111b23');
  container.append(renderer.domElement);
  const labels = new CSS2DRenderer(); labels.domElement.className = 'scene-labels'; container.append(labels.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 180; controls.maxDistance = 2400;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.target.set(0, 160, -70);
  scene.add(new THREE.HemisphereLight('#d7edff', '#36404b', 2.4));
  const light = new THREE.DirectionalLight('#f7f9ff', 3); light.position.set(-400, 1200, 600);
  light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -850, right: 850, top: 850, bottom: -850, near: 10, far: 2200 });
  light.shadow.bias = -0.0005; scene.add(light);
  const fill = new THREE.DirectionalLight('#75a6dc', 1.5); fill.position.set(500, 500, -700); scene.add(fill);
  const material = (color, metalness = 0.1, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const pale = material('#e3e8e9', 0.3), jointMat = material('#263743', 0.5), toolMat = material('#8397a4', 0.7);
  function mesh(geometry, mat, parent = scene) { const m = new THREE.Mesh(geometry, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function box(w, h, d, color, pos, parent = scene) { const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? material(color) : color, parent); m.position.set(...pos); return m; }
  function cylinder(r1, r2, height, mat, pos, parent = scene) { const m = mesh(new THREE.CylinderGeometry(r1, r2, height, 32), mat, parent); m.position.set(...pos); return m; }
  function label(text, pos, color, parent = scene) { const el = document.createElement('div'); el.className = 'world-label'; el.textContent = text; el.style.setProperty('--station', color); const obj = new CSS2DObject(el); obj.position.set(...pos); parent.add(obj); return obj; }
  box(1030, 35, 990, '#26333d', [0, -22, -40]);
  const grid = new THREE.GridHelper(1000, 40, '#425563', '#32424f'); grid.position.set(0, -3, -40); scene.add(grid);
  const reach = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2) * 850, -1, 220 + Math.sin(i / 160 * Math.PI * 2) * 850))), new THREE.LineDashedMaterial({ color: '#345261', dashSize: 12, gapSize: 8 })); reach.computeLineDistances(); scene.add(reach);
  box(150, 15, 150, '#52606a', [0, 6, 220]);
  for (const x of [-58, 58]) for (const z of [162, 278]) cylinder(7, 7, 6, jointMat, [x, 16, z]);
  cylinder(62, 69, 110, pale, [0, 68, 220]);
  cylinder(64, 64, 22, jointMat, [0, 123, 220]);
  cylinder(46, 56, 215, pale, [0, 240, 220]);
  const joints = Array.from({ length: 4 }, () => mesh(new THREE.SphereGeometry(42, 24, 16), jointMat));
  const links = [mesh(new THREE.CylinderGeometry(35, 43, 1, 24), pale), mesh(new THREE.CylinderGeometry(28, 35, 1, 24), pale)];
  const wrist = cylinder(28, 32, 65, pale, [0, 0, 0]);
  const tool = new THREE.Group(); scene.add(tool);
  cylinder(23, 23, 16, jointMat, [0, 93, 0], tool);
  cylinder(17, 20, 36, toolMat, [0, 67, 0], tool);
  cylinder(6, 8, 42, toolMat, [0, 28, 0], tool);
  const cupMaterial = material('#62dab0', 0.1, 0.45);
  const cup = cylinder(2, 1.5, 5, cupMaterial, [0, 3, 0], tool);
  const toolLight = mesh(new THREE.SphereGeometry(4, 16, 12), material('#62dab0'), tool); toolLight.position.set(18, 72, 0);
  const hoseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(15, 76, 0), new THREE.Vector3(43, 110, 0), new THREE.Vector3(28, 166, 0), new THREE.Vector3(0, 180, 0)]);
  mesh(new THREE.TubeGeometry(hoseCurve, 24, 3, 8, false), material('#4b9aa9'), tool);
  label('CUSTOM VACUUM TOOL', [0, 130, 0], '#62dab0', tool);
  const fixture = new THREE.Group(); scene.add(fixture); fixture.position.set(...STATIONS.flasher);
  box(122, 42, 112, '#5b6266', [0, 21, 0], fixture);
  box(104, 8, 94, '#87908a', [0, 46, 0], fixture);
  box(48, 16, 48, '#202a30', [0, 58, 0], fixture);
  box(22, 2, 22, '#c3ae75', [0, 67, 0], fixture);
  const socket = box(8, 1, 8, '#252c30', [0, 68.5, 0], fixture);
  const flashLight = box(28, 4, 4, '#e4c478', [0, 28, 57], fixture);
  label('02 / FLASHER', [0, 100, -40], COLORS.flasher, fixture);
  let stationGroup = new THREE.Group(); scene.add(stationGroup);
  let partMeshes = [];
  function disposeGroup(group) {
    group.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); if (o.element) o.element.remove(); });
    scene.remove(group);
  }
  function rebuild() {
    disposeGroup(stationGroup); stationGroup = new THREE.Group(); scene.add(stationGroup); partMeshes = [];
    const cfg = sim.config, width = cfg.cols * cfg.pitch + 14, depth = cfg.rows * cfg.pitch + 14;
    ['intake', 'good', 'fail'].forEach((name, index) => {
      const [x, , z] = STATIONS[name];
      box(width, 12, depth, '#17232c', [x, 6, z], stationGroup);
      box(width, 2, 3, COLORS[name], [x, 13, z + depth / 2], stationGroup);
      label(`${index === 0 ? '01' : index + 2} / ${name.toUpperCase()}`, [x, 46, z + depth / 2 + 14], COLORS[name], stationGroup);
      for (let i = 0; i < cfg.rows * cfg.cols; i++) {
        const p = slotPosition(name, i, cfg); const size = cfg.packageSize + 4;
        box(size, 7, size, '#34444e', [p[0], 15.5, p[2]], stationGroup);
        box(size - 2, 1, size - 2, '#0b141b', [p[0], 19.5, p[2]], stationGroup);
      }
    });
    for (const part of sim.parts) {
      const group = new THREE.Group(); stationGroup.add(group);
      box(cfg.packageSize, 2, cfg.packageSize, '#121619', [0, -1, 0], group);
      for (const axis of [0, 2]) for (const side of [-1, 1]) {
        const p = [0, -1, 0]; p[axis] = side * cfg.packageSize / 2;
        box(axis === 0 ? 0.45 : cfg.packageSize * 0.7, 0.45, axis === 2 ? 0.45 : cfg.packageSize * 0.7, '#a9b3b8', p, group);
      }
      const mark = mesh(new THREE.CircleGeometry(0.45, 8), material('#b5b9bb'), group); mark.rotation.x = -Math.PI / 2; mark.position.set(-cfg.packageSize * 0.28, 0.05, cfg.packageSize * 0.28);
      partMeshes.push(group);
    }
    cup.scale.set(cfg.nozzleSize / 3, 1, cfg.nozzleSize / 3);
    socket.scale.set((cfg.packageSize + 1) / 8, 1, (cfg.packageSize + 1) / 8);
  }
  const pathGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const path = new THREE.Line(pathGeometry, new THREE.LineDashedMaterial({ color: '#7fdcbd', transparent: true, opacity: 0.55, dashSize: 9, gapSize: 7 })); scene.add(path);
  const vertical = new THREE.Vector3(0, 1, 0);
  function join(m, a, b) { m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = a.distanceTo(b); m.quaternion.setFromUnitVectors(vertical, b.clone().sub(a).normalize()); }
  function update() {
    const tcp = new THREE.Vector3(...sim.tcp), shoulder = new THREE.Vector3(0, 364, 220), wristPoint = tcp.clone().add(new THREE.Vector3(0, 135, 0));
    // Conceptual two-link visualization. This is NOT the 850's six-axis inverse kinematics.
    const direction = wristPoint.clone().sub(shoulder), length = direction.length(), a = 390, b = Math.hypot(426, 150);
    const d = Math.max(Math.abs(a - b) + 0.001, Math.min(a + b - 0.001, length));
    direction.normalize();
    const along = (a * a - b * b + d * d) / (2 * d), height = Math.sqrt(Math.max(0, a * a - along * along));
    const bend = vertical.clone().addScaledVector(direction, -vertical.dot(direction)).normalize();
    const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, height);
    join(links[0], shoulder, elbow); join(links[1], elbow, wristPoint);
    [shoulder, elbow, wristPoint, tcp.clone().add(new THREE.Vector3(0, 102, 0))].forEach((p, i) => joints[i].position.copy(p));
    joints[2].scale.setScalar(0.75); joints[3].scale.setScalar(0.55);
    wrist.position.copy(tcp).add(new THREE.Vector3(0, 122, 0)); tool.position.copy(tcp);
    const color = sim.vacuum === 'suction' ? '#62dab0' : sim.vacuum === 'blow' ? '#e4c478' : '#8296a3';
    cupMaterial.color.set(color); toolLight.material.color.set(color);
    sim.parts.forEach((p, i) => {
      const pos = p.location === 'tool' ? sim.tcp : p.location === 'flasher' ? FLASH_POINT : slotPosition(p.location, p.slot, sim.config);
      partMeshes[i].position.set(...pos);
    });
    const flashing = sim.phase?.label === 'Program & verify';
    flashLight.material.color.set(flashing ? '#62dab0' : '#e4c478');
    flashLight.material.emissive.set(flashing ? '#26755e' : '#000000');
    path.visible = Boolean(sim.phase?.target);
    if (path.visible) { const arr = pathGeometry.attributes.position.array; arr.set(sim.tcp); arr.set(sim.phase.target, 3); pathGeometry.attributes.position.needsUpdate = true; pathGeometry.computeBoundingSphere(); path.computeLineDistances(); }
    controls.update(); renderer.render(scene, camera); labels.render(scene, camera);
  }
  function view(mode) {
    controls.target.set(0, 170, -80);
    if (mode === 'top') { camera.position.set(0, 1500, -79); controls.target.set(0, 0, -80); }
    else if (mode === 'tool') { controls.target.set(...sim.tcp); camera.position.copy(controls.target).add(new THREE.Vector3(150, 130, 160)); }
    else camera.position.set(1050, 890, 1140);
    controls.update();
  }
  new ResizeObserver(() => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); labels.setSize(w, h); }).observe(container);
  rebuild(); view('perspective');
  return { update, rebuild, view };
}

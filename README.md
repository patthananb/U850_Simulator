# U850 IC workcell simulator

A local, browser-based 3D concept simulator for an UFACTORY 850 workcell:

**Intake tray → vacuum pickup → flasher → simulated programming result → good or fail tray.**

The custom tool has three mutually exclusive commands: **suction**, **blow-off**, and **off**. This application does not connect to a robot, programmer, valve, or other physical hardware.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173/.

Use **Start batch**, **Pause / Resume**, **Step phase**, and **Reset batch**. A step completes one process phase and then pauses at the start of the next phase. Drag to orbit, scroll to zoom, or select the top view and tool close-up. Close-up frames the current tool position; it does not follow subsequent motion.

Edit the recipe while idle or paused, then click **Apply & reset batch**. Applying settings clears the current run. The playback speed control changes simulation speed without changing recipe durations. Refreshing the page restores defaults. **Export run** downloads the current configuration, inventory, results, and event history as JSON; it is a snapshot rather than a resumable project file.

## Default concept geometry

| Parameter | Initial value |
| --- | --- |
| Package | Square HQFN placeholder, 7 × 7 × 2 mm |
| Vacuum nozzle | 3 mm diameter |
| Each tray | 4 rows × 6 columns, 18 mm pitch |
| Programming and verification | 3 simulated seconds |
| Blow-off pulse | 0.25 simulated seconds |
| Simulated pass probability | 85% per IC |

Package width, nozzle diameter, tray rows/columns/pitch, programming duration, blow-off duration, pass probability, and playback speed are adjustable. All three trays share one geometry. Tray and flasher positions are fixed in `src/simulation.js`. The scene uses millimetres with **Y up**; these are not robot-controller coordinates.

Nozzle diameter must be smaller than the package. Pitch must leave at least 4 mm between packages. These are simple concept-model constraints, not mechanical design validation. The 2 mm package thickness, socket geometry, vacuum tool shape, approach clearances, and fixture positions are placeholders awaiting actual part drawings and CAD.

## Process and vacuum behavior

1. Approach an intake pocket, descend, establish suction, and attach its IC.
2. Lift 100 mm, transfer to the flasher, and descend into the socket.
3. Apply a timed blow-off pulse, detach the IC, and turn the tool off.
4. Lift clear, simulate programming and verification, and produce a pass/fail result.
5. Descend, establish suction, and retrieve the IC.
6. Transfer to the next available pocket in the corresponding good or fail tray, blow off, turn the tool off, and retract.

Results use a deterministic pseudo-random sequence reset with each batch. The pass rate is a probability, not a guaranteed quota. Tests force 0% and 100% to exercise both routing paths. The flasher is an idealized open socket: no lid, clamp, electrical contact model, firmware image, or programmer protocol is implemented.

The vacuum bench-test buttons work before/after a batch, and lock while a cycle exists, including when paused. A pause freezes the simulated motion and tool state. Starting a batch sets the tool off before the first approach. There is no pneumatic pressure, airflow, adhesion, seal-loss, or force simulation. The IC attaches after the suction dwell and detaches at the end of the blow-off pulse.

## Robot fidelity and implementation

This is a **workflow and geometry prototype**, not a calibrated digital twin or a physical robot program. The visual arm uses a two-link geometric pose with a vertical tool. It does not implement the U850's full six-axis forward/inverse kinematics, joint limits, collision checks, orientation planning, dynamics, or verified trajectory timing. Its shoulder height and approximate link lengths are informed by [UFACTORY's published 850 kinematic parameters](https://docs.supportarticle.ufactory.cc/support_articles/developer/kinematic-and-dynamic-parameters/ufactory-850.html): 364 mm shoulder height, 390 mm upper link, and 426/150 mm offsets combined for the conceptual forearm. Other visual dimensions are schematic.

Motion follows eased Cartesian segments; the nominal 220 mm/s is used to set segment duration and is not a validated robot velocity. Simulated time excludes renderer lag and caps any individual animation-frame time step at 0.1 seconds. It is not a measured throughput estimate.

The next fidelity step is importing the real robot/tool/fixture geometry, implementing the manufacturer's complete kinematic chain and joint constraints, and replacing the idealized grasp/socket behavior with the intended hardware protocol. No physical end-effector CAD or pneumatic circuit is produced by this version.

- `src/simulation.js`: deterministic process engine, inventory, settings validation, and vacuum states.
- `src/scene.js`: Three.js workcell, orbit controls, and conceptual robot visualization.
- `src/main.js`: setup, controls, progress, event log, and JSON export.
- `tests/simulation.test.js`: process regression tests.

## Testing

Verified on macOS with Node.js **v25.9.0**, npm **11.12.1**, Vite **7.3.6**, and Three.js **0.180.0**. Dependency versions are locked in `package-lock.json`.

Run:

```bash
npm test
```

Expected summary (exit code **0**):

```text
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The test runner also prints one passing line per case. Timing output varies. Tests cover all-pass, all-fail, deterministic mixed results, unique destination slots, inventory conservation, vacuum-off flashing, pause/resume, phase stepping, manual-tool interlocks, mid-cycle reset, invalid geometry, pocket spacing, and one-/64-pocket batches.

Run:

```bash
npm run build
```

Expected output (exit code **0**, hashes/sizes/timings vary):

```text
vite v7.3.6 building client environment for production...
transforming...
✓ 10 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html
dist/assets/index-<hash>.css
dist/assets/index-<hash>.js
✓ built in <duration>
```

Vite emits a non-fatal warning because the Three.js-containing JavaScript bundle exceeds 500 kB before gzip (about 137 kB gzipped in the initial build).

## Camera QA ledger

- Initial embedded-browser check: the top of the arm is clipped by the viewport at the ready pose.
- Source trace: the default perspective camera targets Y=170; its resize handler updates the aspect ratio correctly. The browser tooling exposes no interactive JavaScript debugger, so the investigation used source and numerical projection.
- Hypotheses: (1) target too low, (2) distance too close, (3) incorrect aspect resize.
- Disproof of an aspect-only explanation: projecting the elbow at aspect ratios 0.8 and 1.6 places its center at normalized Y=0.966 in both cases. Its 42 mm radius extends beyond the top. The camera's vertical framing, not only narrow layout, explains the clipping.
- Adjustment: raise the target to Y=270 and increase camera distance. A fresh embedded-browser screenshot shows the complete ready-pose arm inside the frame. This agrees with the numerical projection and source trace.

## Browser acceptance checks

- Rendered the 3D scene in the embedded browser at its narrow default width; verified the camera adjustment visually.
- Set rows/columns to 1, pass probability to 0%, and playback to 4×; ran the complete cycle through the UI. Expected and observed: intake **0**, good **0**, fail **1**, batch **1 / 1**, vacuum **OFF**, status **Batch complete**. The log contains pickup, failed simulated programming, placement into the fail tray, and completion. No browser warning/error logs were recorded.
- Checked desktop layout bounds at a 1440 px viewport: panels fit within the document width (1436 px). The embedded screenshot surface cropped that temporary desktop viewport, so this was a DOM-boundary check rather than full desktop visual validation. Restored the normal viewport afterward.
- Restored the default 4 × 6 recipe, 85% pass probability, 1× playback, and ready state for handoff.

An additional engine run with the default seed/recipe produced **17 good**, **7 fail**, and **335.43 simulated seconds**. These are deterministic model outputs, not measured hardware performance.

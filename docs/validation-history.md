# Historical validation notes

These notes describe earlier development milestones. Current test expectations are in the [README](../README.md#testing).

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

After arranging the trays side by side, `npm test` still reports **10 passed, 0 failed** (exit 0), and `npm run build` succeeds (exit 0, same non-fatal bundle-size warning). The updated row layout was visually checked in the browser's top view.

An additional engine run with the default seed/recipe with the camera alignment cycle produced **17 good**, **7 fail**, and **434.32 simulated seconds**. These are deterministic model outputs, not measured hardware performance.


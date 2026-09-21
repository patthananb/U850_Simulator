# Screenshots

Captured from the local app on 2026-09-20 using the in-app browser, without altering the rendered UI.

| File | Capture state |
| --- | --- |
| [overview.jpg](overview.jpg) | Default 4×6 trays, ready state, perspective view |
| [workcell-layout.jpg](workcell-layout.jpg) | Default 4×6 trays, ready state, top view |
| [alignment-result.jpg](alignment-result.jpg) | Completed 1×1 batch, 4× playback, default pickup offsets, centered result and one good IC |

To refresh: run `npm ci` and `npm run dev`, open the printed local URL, and capture the first two views with the default recipe. For the result, set Rows and Columns to 1, apply/reset, set playback to 4×, start the batch, and capture after **Batch complete**. Keep the camera measurement panel and counters visible. Restore the default recipe after capturing.

Screenshots are documentation assets only and are not included in the Vite production build.

## Wrist camera addition — 2026-09-21

`wrist-camera.png` shows the default 4×6 batch paused after the pre-pick inspection, before the nozzle approach. Captured at 1440 px viewport width using isolated Chrome with software WebGL. The wrist panel shows synthetic imagery and ideal scene coordinates, not measured hardware depth. Earlier JPEGs document the previous milestone.

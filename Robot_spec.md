# Robot specification — UFACTORY 850 IC programming workcell

**Revision:** concept brief, 2026-09-21. **Purpose:** request a hardware design, integration proposal, and on-site installation quotation. **Status:** requirements for vendor review, not an approved fabrication drawing or production robot program.

## Project objective and scope

Build a workstation using a UFACTORY 850 six-axis robot to pick small ICs, primarily HQFN packages, from an intake tray, load a programmer socket, program and verify them, then sort them into good and fail trays. Design a custom vacuum end effector with suction, blow-off, and off commands. Mount a downward-looking depth camera on the end effector to locate the selected IC before pickup. Retain a separate upward-looking desk camera and an adjacent alignment nest to center the picked package under the nozzle before socket insertion.

The vendor is requested to design and supply the custom tooling and fixtures, select and integrate vision and pneumatics, integrate the programmer and robot controls, install the cell, commission it with representative IC samples, and train the operator. Clarify in the quotation whether the robot, programmer, cameras, PC, and utilities are supplied by the customer or vendor; ownership and existing equipment inventory are not yet confirmed.

## Robot baseline

| Item | Baseline for proposal |
| --- | --- |
| Robot | UFACTORY 850 / U850, six revolute joints |
| Nominal reach | 850 mm |
| Maximum payload | 5 kg; entire tool assembly, cameras, fittings and held part must be included |
| Published repeatability | ±0.02 mm; this is not an absolute positioning or system placement accuracy guarantee |
| Control integration | Vendor to confirm installed controller/firmware, supported SDK, network and I/O interfaces |

Sources: [UFACTORY 850 product page](https://www.ufactory.us/product/850) and [manufacturer user manual V2.1.0, technical specifications](https://www.ufactory.cc/wp-content/uploads/2023/07/UFactory-850-User-Manual-V2.1.0.pdf). Verify the delivered serial number, hardware revision and applicable [hardware manual V2.6.0](https://www.ufactory.cc/wp-content/uploads/2025/05/UFACTORY_850_HardWare_Manual_V2.6.0.pdf) before design release. Use the manufacturer's actual flange drawing, mounting requirements and payload/center-of-gravity limits, not dimensions inferred from rendered meshes.

## Workstation arrangement

Keep the **intake, good and fail trays next to each other**, in that order. Locate the upward camera immediately beside the alignment nest. Provide access to load trays, change sockets/nozzles, clean optics and recover parts. Final arrangement must demonstrate reach, tool/camera/cable clearance and safe access through the complete motion path.

```text
Concept top view — not to scale

  [Upward camera] [Alignment nest] [Programmer/socket]

        [INTAKE]       [GOOD]       [FAIL]

                      [U850 base]

  Wrist camera travels with the vacuum tool and looks downward.
```

The browser scene uses millimetres with Y vertical; the robot controller uses its own calibrated coordinate frames. Do not transfer scene coordinates directly to the controller.

| Simulator placeholder | Current value | Vendor action |
| --- | --- | --- |
| IC body | Square 7 × 7 × 2 mm; adjustable width 3–16 mm | Obtain actual package drawings, tolerances, thickness, mass and pin-1 marking |
| Trays | Three identical 4 × 6 trays, 18 mm pitch, 30 mm gaps | Design to real tray/pocket geometry, flatness, orientation and capacity |
| Nozzle | 3 mm diameter; nominal TCP 101 mm from flange | Design interchangeable tip, compliant travel if needed, sealing and TCP calibration |
| Wrist camera | Lens offset −42 mm in tool X, +60 mm above tip; looks down | Select real camera/lens/illumination and rigid mount |
| Pre-pick observation | Nozzle 100 mm above IC, nominal lens distance 160 mm; square 50° view | Validate working distance, field of view, depth precision, image resolution and occlusion |
| Programming / blow-off | 3 s / 0.25 s | Measure real programmer timing and tune release with samples |

These values are visualization defaults, not purchasing specifications, tolerances, acceptance limits or guaranteed cycle time.

## Required hardware

### Custom vacuum end effector

Provide a flange adapter, serviceable nozzle, camera bracket, strain relief and pneumatic routing. Supply tool mass, center of gravity and inertia assessment, including cables/hoses through motion. Evaluate package top markings, surface texture and allowable contact area using actual parts. Define nozzle material, ESD handling provisions, compliance/contact-force control and cleaning procedure.

| Command | Intended operation | Vendor implementation to define |
| --- | --- | --- |
| Suction | Establish and retain vacuum for pickup/transport | Vacuum source, valve circuit, pressure/flow settings and pickup confirmation |
| Blow-off | Short controlled positive-air pulse to release the IC | Regulated pressure, pulse duration and release confirmation without scattering parts |
| Off | Neither active suction nor active blow commanded | Explicitly define whether the nozzle is vented or isolated and how residual vacuum is handled |

Commands must be mutually exclusive. Include vacuum feedback, pickup timeout and loss-of-grip detection. Specify filtered air/vacuum utilities, fittings and maintenance. Define power-loss, air-loss, pause and emergency-stop behavior with the cell integrator; software “off” must not be assumed to guarantee release or retention. The simulator's instantaneous attachments and retained state during pause do not establish hardware pneumatic behavior.

### Wrist-mounted downward depth camera — pre-pick localization

Mount a depth camera rigidly beside the nozzle with its optical axis directed toward the tray. The robot first positions the camera over the selected pocket; after inspection it shifts the calibrated nozzle over the measured target and descends. The camera-to-nozzle offset must be measured, not assumed zero.

The vendor shall demonstrate detection of IC presence, package center, top-surface height and orientation/pin-1 where required. Report valid/invalid detection, timestamp, coordinate frame and confidence/quality criteria to the cell controller. Establish camera intrinsics, depth-to-image registration where applicable, hand–eye calibration and the nozzle TCP. Document units, transform direction and calibration repeatability.

Before selecting a camera, test the smallest and largest actual packages in their actual trays: dark/reflective surfaces, tray edges, depth holes, nozzle occlusion, minimum sensing range, lighting and ambient interference. Demonstrate the required precision at the intended observation distance. If depth alone cannot meet fine XY or orientation requirements, propose complementary 2D imaging/illumination or another metrology method for approval while retaining the requested wrist depth function. Do not assume a generic depth camera can resolve fine HQFN alignment.

### Desk-mounted upward camera and alignment nest — post-pick centering

Measure the held package relative to a previously calibrated nozzle reference. The package can hide the nozzle, so define a separate nozzle-calibration procedure. Place the nest beside this camera. Release the IC into the nest, let it settle, reposition the nozzle over the package center and re-pick. Return to the upward camera to verify centering before insertion.

Design the nest to control package motion, protect terminals and support required package variants. Establish how rotation is measured/corrected: XY centering alone does not establish pin-1 orientation. Agree permitted translation/rotation residuals from the socket tolerance budget. Define bounded retries and operator recovery if verification fails.

### Trays and programmer fixture

Provide repeatable tray locating features, tray identification/orientation checks and pocket indexing. Detect empty intake pockets and occupied/full destination trays. Keep good and fail routing unambiguous.

The programmer model, socket and firmware process are **TBD**. Define loading clearance, insertion depth, allowable contact forces, socket lid/clamp actuation, part-presence sensing and contacts. The controller must positively confirm tool clearance before lid motion/programming and safe opening before retrieval. Specify the programmer API or I/O handshake, busy/ready/result states, timeout recovery, firmware identity and verification criteria. A communication timeout or missing result must never be treated as a pass.

## Intended production sequence

1. Check system readiness, tray map, nozzle/tool calibration, air/vacuum and programmer readiness.
2. Select an intake pocket. Observe it using the wrist depth camera; validate presence and target pose. Reject invalid measurements before descending.
3. Move the nozzle using the calibrated target transform. Descend under agreed approach/contact limits, apply suction, confirm pickup and lift.
4. Inspect the held IC with the upward camera; release into the adjacent nest and re-pick centrally as required. Verify final translation and orientation.
5. Load the open/ready programmer socket, release and confirm placement, then clear the tool and execute the programmer handshake.
6. Record verified pass/fail. Open/release the socket as required, retrieve with confirmed suction and place into the next confirmed empty good/fail pocket.
7. Confirm release, update inventory and traceability, then process the next IC. Stop safely when intake is exhausted or operator intervention is required.

The production controller needs explicit recovery for no part, multiple pickup, invalid depth, grip loss, alignment failure, blocked/full trays, socket obstruction, programmer timeout and safety interruption. Agree retry limits, quarantine handling and restart reconciliation with the vendor. Do not automatically resume from an uncertain part location.

## Controls, installation and deliverables

Provide a control architecture identifying robot controller, vision computer, programmer and pneumatic/safety interfaces. Include an I/O list with electrical ratings, network topology, wiring and pneumatic diagrams, state/handshake definitions, and software source/configuration backups. Agree part/run traceability fields: intake and destination slots, firmware version/hash, programmer result, vision measurements and exceptions.

For installation, survey desk rigidity/anchoring, electrical supply/earthing, air quality, space, environment, operator access and ESD provisions. Perform the application-specific risk assessment and implement/validate required guarding, interlocks, emergency stops and restart behavior under applicable local requirements. A collaborative robot designation does not by itself validate this assembled application.

Deliver native CAD plus STEP, dimensioned fabrication drawings, BOM with manufacturer part numbers, assembly/service instructions, calibrated frame/recipe backups, electrical/pneumatic drawings, software and licenses, commissioning results, operator/maintenance training, spare-part recommendations, warranty and support terms. Separate non-recurring engineering, purchased hardware, installation, training and recurring costs in the quotation; identify exclusions and lead times.

## Acceptance plan — values to agree before fabrication

| Demonstration | Required evidence / open criterion |
| --- | --- |
| Wrist localization | XY/Z/orientation error and invalid-detection rate on representative packages/trays; agreed limits TBD |
| Centering and placement | Measured residual versus socket tolerance budget, including calibration/tooling uncertainty; limits TBD |
| Vacuum handling | Pickup/release success, no package damage and recovery from failed grip; sample size and limits TBD |
| Programming and routing | Correct firmware verification, forced pass/fail/timeout cases, no unknown result routed as good |
| Endurance and throughput | Agreed batch size, uptime, yield and cycle-time distributions with real programmer timings; targets TBD |
| Recovery and installation | Documented fault-injection, stop/restart, utilities and safety validation by integrator |
| Handover | Operator independently loads trays, changes supported tooling, runs a batch and recovers documented faults |

Open inputs from customer/vendor: actual IC part numbers/drawings and samples; package range and allowable contact; tray CAD and required capacity; programmer/socket/interface; target placement tolerances and throughput; preferred camera models; site/utilities; existing robot/controller inventory; budget and installation schedule. Record agreed values in a revised specification before releasing hardware.

## Relationship to this simulator

The app is a concept demonstrator with nominal six-axis kinematics and official visual meshes. Its wrist view is a synthetic rendered view; target coordinates and the 160 mm distance come from ideal scene geometry, not sensor processing. There is no depth map, noise/confidence model or failed-detection branch. Pickup offsets are deliberately injected to demonstrate post-pick centering. Every IC goes through the nest; centering succeeds ideally and programming results are generated probabilistically.

Collision/dynamics/payload checks, physical camera calibration, pneumatic feedback, orientation correction, safety controls and programmer communication are not implemented. Simulation acceptance is not hardware acceptance. See [README](README.md) for the implemented workflow and reproducible software checks.

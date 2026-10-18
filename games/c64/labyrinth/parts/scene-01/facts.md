# Entrance gate — established facts

This is a partial analysis of the naturally reached gate image. Its listing describes 2,116 of 43,949 tracked bytes (4.8%). One gate comment was included in the independent 60-comment sample of 19 October 2026 and was marked right; this does not measure gate accuracy separately. The two wrong details in that combined sample belong to the opening; the game’s Error rate section records their disposition. A full audit remains recommended. Shared resident/overlay ownership remains unresolved; the opening and gate are provisional independent image scopes, not a proved partition of shared code.

## Approach geometry

With `$0343=$FF` and `$5E=$FF`, classifier `$4171` derives a column from the 16-bit world X coordinate at `$0538/$053C`. For X 0–255, the column is X shifted right six places. Map cells `$0600-$0603` are 1,3,1,1. Their low nibbles select types through `$073E`; type 0 has depth bound 24 and type 14 has bound 255 through `$41F0`. Thus X 64–127 permits the deeper approach within these four columns. These are world coordinates, not screen pixels.

Gate check `$8D92` starts stage zero when depth `$0544` is 50–127. It contains no horizontal check. The movement classifier supplies the separate geometry constraint. The script changes the map cell, updates type translations, disables the player display slot and sets depth to `$C0`; that scripted depth is not an ordinary walking position.

## Deferred corridor transition

The gate callback is reached through `$8C8F`. Stage `$8CC0` requests sound 5 through `$081E`, calls delay `$0839` with Y=4, writes scene 2 to `$02C3`, and advances its stage. The delay implementation `$0A61` waits for four sixty-tick intervals using the IRQ-maintained counter. No wall-clock duration is claimed.

Resident consumer `$59AF` transfers a nonnegative deferred scene to `$0530` only when no pending request exists. It defaults an unset entry byte to 1 for a nonzero scene, clears the deferred request, and invokes the scene preparation and loader. A live store watch caught request 2 at `$59BC`. The observed route does not require the generic exit routine at `$4115`.

## Verification and limits

`test_gate.js` compares the page with original-code execution for all 256 horizontal bytes, all 256 depth bytes and 65,536 combined candidates. It executes the sound/delay/deferred request sequence and six resident-dispatch cases. This checks the candidate classifier, not complete walking reachability.

Ordinary joystick trials restored the same natural gate snapshot before each case. Idle for 300 frames retained X=96, depth=6 and scene=1. Aligned up reached depth 51 at frame 150 and subsequently scene 2. Right for 100 frames followed by up for 300 settled at X=182, depth=24; the left equivalent settled at X=13, depth=24. Movement-control checkpoints fired in every trial; `$4115` had zero hits in the ordinary gate-entry trial. The natural gate and side-approach screenshots accompany the page.

The part's ignored `work/play.vsf` is the natural `gate-steady.vsf` capture. Earlier forced captures are retained as `play-forced.vsf` and `entry-forced.vsf`; neither supplies a natural pre-initialization hand-over. Loaded-data warnings, shared-engine ownership, remaining movement, dialogue, graphics and other gate logic remain open.


## Shared introduction sequence

`$8E09` loads a countdown from fourteen bytes at `$8EC5`; phases 0–6 also select headered messages through split pointers `$8ED4/$8EDB`. Their records begin at `$8EF5`, `$8EFF`, `$8F1A`, `$8F40`, `$8F8A`, `$8FAE` and `$8FDE`. They address the audience, name the player and demand that the speaker be vanquished in his castle. The published player name is anonymized as ANON. Phase zero in scene zero copies up to 28 name bytes from `$0504` into `$8F22` and appends a period and terminator. The stored formatting controls are interpreted by `$67B7`; the page normalizes whitespace and omits those controls.

`$8CD8` decrements `$8EB5` before testing zero. Expiry selects the phase's delay/message, then increments `$8EB4`. Phase zero in a nonzero scene first changes the selected phase to seven, skipping the speech records. A negative `$030B` during a phase below seven sets phase seven/countdown one and calls `$086C`; this byte is the joystick-port-one fire latch updated at `$1993`. Phases at least fourteen bypass the countdown and check approach depth. The natural steady gate is phase fourteen; the earlier natural `graphical-intro.vsf` capture is phase ten in scene one. These observations do not prove ordinary presentation of all seven stored lines.

`test_gate.js` checks the seven texts against execution of the original `$67B5` parser and 15,360 dispatcher cases: fifteen phases, every countdown byte, scenes zero/one and positive/negative interruption state. Visual, sound and movement helpers are intercepted in this dispatcher check; it verifies decisions and name insertion, not their complete effects. `$8E29`'s pose selection and `$8EA4`'s conditional sound request are traced; pose artwork identities and the meaning of sound condition `$0298` remain open.


## Fire interruption input

Joystick sampler `$19AE` reads CIA1 `$DC01`, inverts its low five active-low hardware bits and stores the active-high sample in `$030C`. `$1993` tests bit four: release clears `$030B`; a press with a zero latch sets it to `$FF` and calls `$18DB`; a held press retains a nonzero latch without another call. This supplies the negative latch tested by the early-phase interruption branch at `$8CD8`. The C64 platform reference identifies bit four of this port as joystick-port-one fire.

An ordinary-input VICE trial from the natural gate snapshot applied release, press, hold, release and press for ten frames each. `$030C/$030B` were respectively 0/0,16/255,16/255,0/0,16/255. A non-stopping checkpoint at `$1993` recorded five hits, providing a positive control. The original emulator snapshot and running state were restored. This verifies the live input producer; skipping a phase below seven is checked by isolated original-code tests, not by a live replay of the full speech. `test_gate.js` adds all 32 sample values against all 256 latch bytes (8,192 cases), including the once-per-press call.


The kit 0.0.200 listing rebuild reports a two-byte gap at `$07FE-$07FF` after M1 ends at `$07FD`. Its ownership remains open; this warning does not establish another authored M1 record. The listing metadata hashes `work/publish-anonymous.vsf`, derived from the original capture with the entered player name anonymized as ANON. The original capture remains private; code and tested movement/scheduler values are unchanged.

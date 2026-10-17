# Entrance gate — established facts

This is a partial analysis of the naturally reached gate image. Its listing describes 771 of 43,949 tracked bytes (1.8%). There is no independent listing-comment sample. Shared resident/overlay ownership remains unresolved; the opening and gate are provisional independent image scopes, not a proved partition of shared code.

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

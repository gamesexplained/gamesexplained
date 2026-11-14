# Level 4-1 — technical facts

The handover listing describes all 34994 tracked bytes, including 5283 code bytes. Actor/boss workspace `$BB00-$BD90` and generated edge tables `$BFC3-$BFFF` are excluded. The load supplies the complete `$D000-$FF7F` sprite region and `$C000-$C7FF` character set.

## Map and actors

The map is eighty columns by one hundred rows, 8000 stored bytes at `$9000-$AF3F`. Nibble-swapped indices select 176 sixteen-character terrain definitions. The actor directory reaches 117 distinct terminated streams. Initialization installs ordinary platform movement and weapon hooks; this level disables the local music flag and uses resident sound effects.

Actor type three reserves two additional slots for a three-part timed appearing/disappearing hazard. Type four is a stationary emitter and its falling-then-horizontal projectile. Type five has a parent whose destruction can allocate two curved offspring. Type six bursts into timer-derived particles whose signed velocities reflect on sampled solid terrain. Type seven clears wheel mode and allows horizontal joystick adjustment while the player has the selected climbing state. Type eight performs repeated explosion animations. Types nine through fourteen select the resident no-op.

The particle randomizers index program bytes as well as reading the CIA timer; those bytes remain code in the listing.

## Gate sequence and environment

The scripted gate sequence locks player input, moves five hardware-sprite columns and changes nine screen characters plus map cell `$95A5`. It then shakes horizontal fine scrolling, waits and animates a departing sprite/player along a twenty-four-entry Y curve. Exact coordinate tests advance or finish parts of this sequence; no timing in seconds is inferred.

Eight direction helpers rotate a four-character environment pattern at `$C588-$C5A7`. Vertical rotations wrap two bytes per column; horizontal rotations use carry across two-byte rows. Direction-specific suppression flags can skip selected vertical operations. A camera rectangle, player-X threshold and grounded state select the level departure callback.

## Boss

Type fifteen waits for the camera/player entry conditions, then takes over the raster with five columns of seven bands. Seven band Y positions are maintained twenty-one pixels apart. Its action dispatcher cycles eighteen selector/duration records among four routines: a four-pose six-band movement, a six-pose three-band movement, a six-pose two-band movement and a timed pause. Pose changes update shape numbers and bitmap-address matrices together.

Five contact rectangles test the player. The character-damage routine scans sixteen rows and two adjacent cells, consuming characters $C8 and above by writing $FF. Only rows zero through four reduce the counter. The initial counter is `$044F` (1103); high-byte underflow starts destruction. It then flashes the body, restores raster and terrain glyph state, changes the eleven actor slots into local explosion controllers and requests 15000 points.

A separate falling two-by-two terrain patch saves/restores background characters and colours. On terrain contact it expands through eleven four-character row widths, with two alternating glyph frames and local timing state.

The raster reuses hardware sprites three through seven. At fine-scroll collisions `$802F` saves fifteen bitmap bytes and substitutes the adjacent band's first row; `$80D9` restores those bytes. A separate deferred exchange swaps six successive 128-byte ranges between `$B800` and `$F880`. A stopping store watchpoint on `$B87F` caught `$7E3F STA ($F6),Y`; continuing to the helper return confirmed that the first two 128-byte ranges exchanged exactly (`work/trace_level41_bitmap_exchange.json`).

## Open questions

The intended visible identities of several hazards and the gate's departing sprite remain open. Fourteen retained bytes following terrain-property overrides have no established separate consumer. No optional playthrough or combined-mechanics replay was recorded.

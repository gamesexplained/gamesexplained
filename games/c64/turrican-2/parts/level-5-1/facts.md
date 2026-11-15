# Level 5-1 — technical facts

The handover listing explains all 29362 tracked bytes, including 4020 code bytes. Actor workspace `$BC40-$BD90` and generated map-edge tables are excluded. This load supplies 200 character glyphs, 196 terrain definitions and the upper sprite region `$E580-$FF7F`.

## Map and level update

The terrain is 81 columns by 100 rows, 8100 stored bytes at `$9000-$AFA3`. The actor directory reaches 113 distinct terminated streams. The map tail and the gap after the final actor stream remain explicitly described allocations rather than being omitted from coverage.

The level update rotates eight adjacent glyph columns in the selected direction. Vertical rotations wrap two bytes per column; horizontal rotations carry bits across all eight columns. A separate eleven-call divider alternates two four-glyph frames at `$C350`. Near the top of the map it restores a type-ten record at `$7D15` when no type-ten actor remains active. At the selected player Y threshold it installs automatic upward movement; passing Y $0C enters the resident next-level transition. This level has no local music-driver entry and inherits resident sound-effect handling.

## Actors

Type three is a two-piece firing creature with a seven-pose entry, eight-pose idle cycle and a delayed burst of type-four actors. Its health counter starts at $20; either piece can supply a weapon hit. Type four rises to terrain, waits for player proximity, falls and ends with a ground animation. Type five reserves two lower pieces for a three-part ground machine. It faces the player periodically, scans up to four two-cell rows for damage and keeps its lower pieces attached through terrain-following/falling movement.

Type six has a stationary parent that emits an approaching child. The child changes to an attack path near the player. Contact during its attack state attaches it to the player. The attached state follows player position, invokes player damage on a two-call divider and counts twelve changes of the joystick direction nibble before advancing out of that state. A held direction does not advance that counter.

Type seven is a hidden spawner and its flying children. Type eight bounces along terrain, reversing at side probes and changing to a landing animation at the lower probe. Both use segments of the same forty-entry vertical curve.

Type nine animates a capture sequence. Contact during selected open shapes attempts to reserve two additional pieces, hides the ordinary player and animates those pieces before releasing them and the source. If the second allocation fails, the first allocated piece has already been installed; its visible consequence remains open. Protected/wheel contact takes a separate destruction path.

Type ten is a shrinking support actor and its particles. Its first accepted weapon hit changes the closed state to the open state. Later hits pass through a five-call divider; deep player contact enters the same cycle-counter path. Each surviving cycle may emit a particle. The counter starts at ten and destruction tests for a negative result after decrement. Per-slot standing/deeper-contact flags aggregate into resident support bytes `$62/$63`.

## Targeted trace findings

The support particle's preliminary curve read can index thirty into `$7A45`, reaching the first opcode of the next routine at `$7A63`. A stopping read watchpoint confirmed `$7A03 LDA $7A45,Y` reading $AD with Y thirty. The later limit test ends the particle before that candidate value is applied. The authored curve itself has thirty bytes; `$7A63` remains code. Evidence is `work/trace_level51_curve_alias.json`.

The horizontal terrain-side selector uses unindexed `$BC6C`, while actual motion uses `$BC6C,X`. With X five, slot-zero speed one and slot-five speed $FF, a stopping read watchpoint caught `$79CB LDY $BC6C` and returned Y one. This establishes the cross-slot read, not its visible consequence. Evidence is `work/trace_level51_particle_slot.json`.

## Open questions

Visible actor identities, the failed second capture allocation's consequence and the particle side-selector's visible effect remain open. No optional playthrough or combined-mechanics replay was recorded.

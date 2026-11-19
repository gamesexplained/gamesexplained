# Hammerfist — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- [Hammerfist instruction manual](https://www.atarimania.com/st/files/hammerfist_manual.pdf), printed pp. 1–5, read from rendered scan on 14 November 2026. The C64 controls are listed separately from other platforms.
- [Fairlight release](https://csdb.dk/release/?id=28464), downloaded with contributor permission on 14 November 2026. The release contains two disk sides, kept in ignored `work/`.

## Features

| Feature | Status | Where |
|---|---|---|
| Switch between Hammerfist and Metalisis with up | live | Complex 7 $8C2A: native up-input branch checks other-body energy 32/33; flash 0/6. $8A79 separately handles an exhausted active body. |
| Walk left/right and duck | traced | Complex 7 $898C-$8B8F and $8D00; joystick direction dispatch, candidate coordinates and crouch poses. Not recorded as an input route. |
| Hammerfist punches in three directions | traced | Complex 7 $8DF5 horizontal, $8F02 upward, $8FB6 downward handlers; directed attack rectangles. Individual legal-input attacks were not recorded. |
| Ordinary punch, piston fist and laser fist | live | Complex 7 $98BF and adjacent keyboard callbacks; native F3/F5/F7 checks set weapon 0/2/1. |
| Weapon charge limits special attacks | traced | Complex 7 $8DF5/$8F02/$8FB6 select powered paths and decrement retained charge on firing. No full weapon-use route was recorded. |
| Metalisis kicks and performs low/high flic-flacs | traced | Complex 7 $8D69 kick, $99FF/$9A52 flic-flac; $9AB2 tests up at the extension decision. Stored pose/delay sequences are rendered on Graphics. |
| Three fire presses or space turn into the screen | open | Complex 7 action/edge dispatch $8B95 and keyboard table $98A6 were traced. Space/depth behavior is identified, but the documented three-press gesture was not checked with a legal-input sequence. |
| Fire/down headbutts or opens doors while facing into screen | traced | Complex 7 $906A handles inward-facing down/fire; $A8B1 distinguishes activation and recharge records. The branch was read; a door route was not played. |
| Fire/up steps through doors | traced | Complex 7 $91BF-$9382 handles doorway/depth steps with state and exit checks. No recorded door-entry input sequence. |
| Down and two fire presses select weapon | open | Complex 7 weapon/action input readers and keyboard shortcuts were traced. The manual two-fire gesture remains unverified as a legal-input sequence. |
| Destroy security systems to unlock doors and later areas | traced | Complex 7 $B1C2 checks attack masks/prerequisites and remaining strength; destruction changes persistent tiles and progress. No complete security-system route was played. |
| Independent energy for both characters | live | Shared $0E/$0F, Complex 7 $C0FE display. Native recharge tests hold the other body at 40 while changing the active body; both bodies covered by 1800 CPU cases. |
| Opponents and weapons damage the player | traced | Complex 7 $A5F0 actor/attack rectangle checks, $A72D damage/recoil/death and directed player attack handlers. Read against actor flags and health; no unsolicited combat playthrough. |
| Icons and recharge points restore energy or weapon charge | live | Complex 7 $A67D pickup dispatch and $9159 recharge. Native recharge boundary tests; CPU tests cover the full widget range. Pickup types are traced. |
| Question-mark drops need another attack to become useful | traced | Complex 7 $9E55 death/hidden/revealed pickup phases; $A5F0 attack mode reveals eligible question-mark drops. Stored death/drop animations are rendered. |
| Uncollected icons strengthen the Master | traced | Complex 7 $9E55 expiry: positive types add two Master energy, capped at 48. The expiry reader and types were traced; not a timed live pickup route. |
| A full Master meter produces negative icons | traced | Complex 7 $9E55 selects negative type; $A67D removes 20 active energy for type 0; expiry reduces Master energy. No legal-input route to a full Master was recorded. |
| Technicians, droids, Octosquab, giant ant and other opponents | open | All four loads actor records, component sprites, animation streams and callback tables were decoded and rendered. The manual species names have not been reliably matched to every rendered actor; identification remains open. |
| RUN/STOP pauses; Q restarts while paused | live | Store watchpoint on $B3 with row 7/column 7 proves Complex 7 $6628 pause writer; IRQ return stack names $662A. Paused Q restart continuation traced, not played through. |
| F1 cycles music, effects and silence | live | Complex 7 callback native instruction traces: mode 0 → $40 → $80 →0. |
| Portrait screen waits for joystick-port-2 fire | confirmed | Execute stop at $2AD3; LDA $DC00 / AND #$10 / BNE $2AD3. Fire advances to the load. |

## Beyond the documentation

| Finding | Status | Where |
|---|---|---|
| A page of the programmer's assembler source, matching the sprite set-up routine line for line | confirmed | Resident `$1200-$13DD` against `$158A`; `test_finds.js`. On Discoveries. |
| Docking rooms 8 and 9 are stored but unreachable and unfinished | traced | Docking doorway list `$6547`, room writers `$63ED`/`$A7DC`, empty ranges at `$6DA9`/`$6DB6`/`$6DD0`, layouts `$3E17`/`$3E53`. On Discoveries. |
| Three tunes on the loading disk that nothing plays | traced | Loading module `$EC4F` tunes 2, 3 and 5; no copy in the four loads. On Discoveries. |
| Four effects that nothing asks for | traced | Every `$32DA` call follows `LDA #`; 3, 5, 12 and 17 never appear. On How it works and Discoveries. |
| YCY initials turn F3 into a room skip until the next load | confirmed | Complex 7 `$8325` patches `$98C1`; the same check in all four loads (`test_finds.js`). Native instruction check by the first run. On Discoveries. |
| Overcharging in the last room is safe | confirmed | Fourth load `$913C`/`$9162`; native instruction check by the first run; `test_energy.js`. On Discoveries. |
| A resting body heals itself only to 33, the swap threshold | traced | Complex 7 `$6754` and `$8C2A`. On How it works. |
| A game over restarts the current load with the score it started with | traced | Complex 7 `$668B`, `$667B`. On How it works. |
| A sound retrigger writes sustain/release to the wrong SID register | confirmed | Resident `$FE1C` (native instruction check). Not on the pages: how it sounds in play was not measured. |

See `facts.md`, "Findings shown on Discoveries", for the evidence and its limits.

## Open questions

The two documented multi-fire gestures and the visual mapping of manual opponent names remain open as described above. The claims that docking rooms 8 and 9, loading tunes 2, 3 and 5, and effects 3, 5, 12 and 17 are never used rest on the doorway list and on every call in the four loads' listings; no playthrough checked them.

A follow-up web search for the two multi-fire gestures and named opponents found the manual transcription and contemporary review, but did not settle this C64 binary’s gesture timing or identify every decoded actor. The [manual transcription](https://www.lemonamiga.com/doc/hammerfist/767) repeats the gestures; the [1990 review](https://www.amigareviews.leveluphost.com/hammerfi.htm) describes opponents without a record-to-shape key. These remain the bounded open questions above.

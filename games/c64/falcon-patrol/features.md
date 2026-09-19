# Falcon Patrol — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, `https://www.c64-wiki.com/wiki/Falcon_Patrol`, read 2026-09-19
- Internet Archive item `Falcon_Patrol_1983_Virgin_Games`, read 2026-09-19
- The release's own instruction screen ("DOCUMENTS TO FALCON PATROL"),
  read from the emulator 2026-09-19. Note this screen is part of the
  Remember crack, not necessarily Virgin's own wording, though its content
  agrees with the wiki.
- Lemon64 game 880 and its documents page 892 were **not** readable: both
  return HTTP 403 to an automated fetch. Not consulted.

## Features

| Feature | Status | Where |
|---|---|---|
| Player flies a jet; horizontal two-way scrolling world | live | Player is hardware sprite 0, fixed at screen X = 172; the world moves around it |
| Joystick in **control port 1** | live | Read at `$5700` (`lda $dc01`), called from `$419A`. Port 1 shares `$DC01` with the keyboard, which is why the game parks `$DC00` at `$7F` and reads one port for both |
| Keyboard alternative: `←`/`1` height, `CTRL`/`2` turn, space fire | open | Documented by the wiki. All six keys sit in keyboard matrix **row 7**, the row `$DC00 = $7F` selects, so one read of `$DC01` serves both keyboard and joystick. The bit-level mapping has not been traced yet |
| Up/down climbs and dives | live | Bit 0 = climb, bit 1 = dive, held in `$0C` after `$5700` |
| Left/right turns and accelerates | traced | `$54A8`–`$54C9` steps a horizontal velocity at `$2A`, clamped to `$FD`…`$03` (−3…+3), one step per 8 passes of a counter at `$2D`. Could not yet be exercised live: every attempt so far has been in a state where the game overrides the stick (see below), so it is traced, not confirmed |
| Fire launches a missile ("AAM") | live | Bit 4. Pressing it moves eight zero-page bytes at once (`$07`, `$08`, `$10`, `$1D`, `$1E`–`$21`) |
| Ceiling and floor on the player's altitude | confirmed | `$5705`–`$5723`: if sprite 0 Y < `$30` the game **sets** the up bit in `$0C` (cancelling climb); if Y ≥ `$BF` it sets the down bit. The limits are enforced by forging the joystick byte, not by clamping a coordinate |
| Firing is disabled at low altitude | confirmed | `$5724`–`$5730`: if sprite 0 Y ≥ `$7C` the game sets bit 4 in `$0C`, so the fire button reads as released. Not in any documentation found |
| Automatic climb on take-off; stick ignored | live | `$5731`–`$573C`: when `$22` bit 1 is set, `$0C` is overwritten with `$FE` — up pressed, nothing else. Observed live: in the analysed snapshot `$22 = $03` and the stick does nothing |
| Automatic descent, and touchdown that stops the aircraft dead | confirmed | `$573D`–`$575F`: when `$22` has bit 3 or 7 set, `$0C` is forced to `$FD` (down only). Then, if bit 3 is set and the sprite 0 **pointer** at `$07F8` has reached `$88`, `$0C` becomes `$FF` (no input at all) and both velocities `$2A` and `$2B` are zeroed |
| Landing must be vertical, onto a base | confirmed | `$559A` requires all three at once: sprite Y exactly `$84`, `vel_x` zero, and a base tile `$16` in the terrain map under both `$3800[$0D+$12]` and `$3800[$0D+$14]`. Stopped, at the right height, over a base |
| Refuel and rearm by landing | confirmed | `$5420` adds a unit of GAS and, one time in eight, an AAM; `$559A` runs it at double rate while on a base; `$5000` is the wind-up at the start of a life that loops until the tank is full |
| Limited fuel | confirmed | Three decimal digits at `$17`/`$18`/`$19`, drawn as a nine-cell bar at row 22 by `$4EA0` |
| Low fuel warns you, visibly and audibly | confirmed | Not in any documentation found. `$4900` toggles `$2E` between `$01` and `$02` for the alarm, and `$4EA0` uses `$2E` as the colour of the GAS bar, so the gauge flashes in time with the sound |
| 100 air-to-air missiles at the start | live | The instruction screen says 100; the AAM readout reads 100 at the start of a life |
| Radar showing enemies and surviving bases | live | The black panel in the centre of the status area; blips appear and move during play |
| Six bases | confirmed | Six, exactly as the wiki says: `$16 $17 $16 $17` at columns 4, 40, 84, 136, 172 and 200 of the terrain map's top page at `$3800` |
| Destroyed bases return only when a life is lost | confirmed | A destroyed base reads `$6F`/`$70`; `$5FD0` turns them back into `$16`/`$17` and is called from one place only, the life-lost reset at `$564E` |
| Enemy jets attack in waves | confirmed | `$4540` drip-feeds four slots at spacing `$62`; `$4730` places them as sprites 1-4 |
| Wave size grows with progress | **differs** | The wiki says one extra attacker every six waves. The code has no wave counter: `$4A80` reads the **score** digits `$13`/`$14` — under 400 points 2 aircraft, 400-1499 three, 1500 or more four. The ten-thousands digit `$12` is never tested, so a score of 10000-10399 drops the wave back to two |
| Enemy aircraft are drawn in randomly chosen attitudes | confirmed | `$43BC` reads SID oscillator 3 (`$D41B`), masks it to 0-3, adds `$88` and stores it as that sprite's pointer |
| Collisions are detected in hardware | confirmed | `$4200` reads `$D01E` (sprite to sprite) and `$D01F` (sprite to background); bit 0 of either is the player and calls `player_hit` at `$4400` |
| Enemies bomb the bases | confirmed | `$5C00` drops a bomb from the lowest enemy, `$5CB0` makes it fall, `$5D00` draws it as sprite 5 or 6, and `$5F60` wrecks the base |
| Enemy aircraft shoot at the player | confirmed | `$5B00`, not in any documentation found. One shot per sky row, spawned only from the side that makes it travel toward the player |
| Enemies bomb the bases, and bomb the player while landed | open | Wiki and the instruction screen |
| Enemies veer off if not shot down in time | confirmed | `$460E` ages each slot at `$57+x`; past `$80` the aircraft climbs, past `$D0` it sinks, past `$E0` it flies level and is frozen by both movement routines |
| Scoring 25 / 50 / 100 / 200 for the 1st–4th jet of a wave | confirmed | `$4500` seeds `$AA` = `$19` (25) at the start of each wave; the adder at `$5E10` adds `$AA` to the score and then does `asl $AA`, so each kill within a wave is worth double the last |
| Extra life at 3,000 points, once | confirmed | `$55DF`: if `$67` is zero and the thousands digit `$13` has reached 3, `$67` becomes `$30` and a life is added. `$67` is never cleared again, so it is awarded once; `$4FA0` plays the fanfare |
| Three lives | open | Wiki. This release is "+5" when trainers are chosen; we chose `H`, no trainers |
| High-score table with name entry | live | Title screen shows five rows and the alphabet strip `.ABCDEFGHIJKLMNOPQRSTUVWXYZ_`; entry routine at `$4CE2` walks an index 0–`$1B` with left/right and accepts with fire, building a name in a buffer at `$0AB4` |
| High-score saving to disk | traced | Part of the Remember crack, not the original game. The disk carries `f.patrol hi /rem` for it |
| Music / sound effects | live | SID voice control registers written from `$4BD3`–`$4BE1` in the title loop; a filter sweep at `$4D4B` during name entry |

## Beyond the documentation

Found in the code, not in the manual.

- **The scrolling world is animated by rewriting the character set**, not
  by writing screen codes: the landscape and the radar move while screen
  RAM holds still. Missiles, enemy shots and blast craters *are* written
  into screen RAM, every frame, by `$5840`, `$58A0`, `$5960`, `$59C0` and
  `$5F60`.
- **Enemy aircraft shoot back**, which none of the documentation found
  mentions. `$5B00` spawns a white character-drawn streak, and only from
  the side of the screen that sends it toward the player's fixed column.
- **Enemy aircraft are hardware sprites; the scenery and radar are
  characters.** `$D015` reads `$01` in the analysed snapshot, but that is
  a moment before the first wave arrives, not a general truth: the
  collision code at `$4200` handles sprites 1-6, and `$D015` is written
  from eight sites. An earlier draft of this file concluded from that
  single `$01` that enemies were character graphics. They are not.
- **The main loop is paced by CIA2 Timer B, not the raster.** `$41C0`
  spins on `lda $DD07 / cmp #$7F` until the timer's high byte matches.
  The raster interrupt at `$4AC0` only repaints the three-band colour
  split. Rates derived from "one frame" would be wrong.
- **Altitude limits and state changes are implemented by forging the
  joystick byte** rather than by testing state at each use. Everything
  downstream reads `$0C` and believes it. It is an elegant trick and it
  means `$0C` is not the joystick: it is "what the game wants the pilot to
  have done".
- **`$07F8`, the sprite 0 pointer, doubles as the aircraft's state.** The
  touchdown test compares it against `$88`, so the plane's current shape
  is also what the logic reads to decide it has landed.
- **`$5470` is dead code.** It has no cross-references at all, while
  `$5495` — inside it — is entered by a `jsr $5495` at `$5780`, the tail
  of the live `read_input`. So `$5470`–`$5494` is the stump of a shorter
  earlier input handler, left stranded when the longer `$5700` replaced
  it, and both share the flight model from `$5495` on. Whether Virgin or
  Remember cut it is still not established.

## Open questions

- Which of `$5470` and `$5700` is original and which is patched, and what
  the `NOP` runs replaced. The crack is documented to carry "additional
  bugfixes" as well as trainers, so this is not idle curiosity: anything
  described from this image may not be how the game shipped.
- The meaning of every bit of `$22`. Bits 1, 3 and 7 are used by the input
  gate; bit 4 survives the rewrite at `$5776`; bit 0 was set in the
  analysed snapshot and its meaning is unknown.
- Whether the keyboard controls documented by the wiki are in this build
  at all, and which bits of the same `$DC01` read they use.
- The wiki's complaint that missiles pass through enemy aircraft is
  **explained**. The player's AAMs are characters, glyphs `$12`/`$13`
  drawn into screen RAM by `$58A0`, so they cannot raise a
  sprite-to-sprite collision at all. A kill is registered when an *enemy*
  sprite reports a background collision and `$4262` finds a glyph in
  `$0C`-`$13` in one of the three character cells beneath it. Miss that
  three-cell window and the shot has no effect.
- How many bases there are, and where the map that places them lives.

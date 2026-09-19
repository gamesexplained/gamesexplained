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
| Landing must be vertical, onto a base | open | Documented. The touchdown path above is very likely it, but the condition that decides a *successful* landing has not been traced |
| Refuel and rearm by landing | open | Documented; the status panel has GAS and AAM readouts |
| Limited fuel | open | "GAS" bar, bottom right of the status panel |
| 100 air-to-air missiles at the start | live | The instruction screen says 100; the AAM readout reads 100 at the start of a life |
| Radar showing enemies and surviving bases | live | The black panel in the centre of the status area; blips appear and move during play |
| Six airfields / oil installations and refuelling bases | open | Wiki says six. Not counted in the code yet |
| Destroyed bases return only when a life is lost | open | Wiki |
| Enemy jets attack in waves; wave size grows | open | Wiki: one extra attacker every six waves, reaching three, then four |
| Enemy aircraft are drawn in randomly chosen attitudes | confirmed | `$43BC` reads SID oscillator 3 (`$D41B`), masks it to 0-3, adds `$88` and stores it as that sprite's pointer |
| Collisions are detected in hardware | confirmed | `$4200` reads `$D01E` (sprite to sprite) and `$D01F` (sprite to background); bit 0 of either is the player and calls `player_hit` at `$4400` |
| Enemies bomb the bases, and bomb the player while landed | open | Wiki and the instruction screen |
| Enemies veer off if not shot down in time | open | Wiki |
| Scoring 25 / 50 / 100 / 200 for the 1st–4th jet of a wave | open | Wiki. No points for collisions |
| Extra life at 3,000 points, once | open | Wiki |
| Three lives | open | Wiki. This release is "+5" when trainers are chosen; we chose `H`, no trainers |
| High-score table with name entry | live | Title screen shows five rows and the alphabet strip `.ABCDEFGHIJKLMNOPQRSTUVWXYZ_`; entry routine at `$4CE2` walks an index 0–`$1B` with left/right and accepts with fire, building a name in a buffer at `$0AB4` |
| High-score saving to disk | traced | Part of the Remember crack, not the original game. The disk carries `f.patrol hi /rem` for it |
| Music / sound effects | live | SID voice control registers written from `$4BD3`–`$4BE1` in the title loop; a filter sweep at `$4D4B` during name entry |

## Beyond the documentation

Found in the code, not in the manual.

- **The screen is a static grid; the game animates the character set.**
  Screen RAM at `$0400` does not change during play at all. Over a second
  and a half of play the only things that moved were a handful of bytes in
  zero page, the stack, two bytes of the status line, and **bytes inside
  the character generator at `$3000`–`$37FF`**. Moving objects are drawn
  by rewriting glyph bitmaps in place.
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
- Both `$5470` and `$5700` are near-identical input routines, and both
  contain runs of `NOP` padding (`$548D`–`$5494`, `$575E`–`$575F`,
  `$577C`–`$577F`). Padding like that is typical of a cracked or patched
  routine. Which of the two the original game used, and whether the
  padding is Remember's work, is **open**.

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
- The wiki reports a collision-detection weakness, where the player's
  missiles pass through enemy aircraft without effect. The collision code
  is now found (`$4200`) and rests entirely on the VIC's `$D01E`/`$D01F`
  registers, which latch and are cleared by the read. Two candidate
  explanations, neither tested: the player's missile may not be a sprite
  at all, in which case it can never raise a sprite-to-sprite collision;
  or a pass that reads the register for one pair loses a second collision
  that latched in the same frame.
- How many bases there are, and where the map that places them lives.

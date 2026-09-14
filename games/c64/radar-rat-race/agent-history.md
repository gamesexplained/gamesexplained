# Radar Rat Race RE — plan and methodology

**Real goal (reframed 2026-09-13): the game engine, not the loader.** Every
C64 game has a boot/loader/relocator stage in front of the actual game —
that stage is an obstacle to get past efficiently, not the interesting
part. The payoff is understanding sprite movement, collision, scoring,
sound, input, level data — the game itself. Byte-perfect reassembly of the
*loader* is no longer a goal; understanding it well enough to get past it
cleanly is. The wider goal beyond this one game: **a reusable methodology
(eventually a project skill) for C64 game reverse engineering** using
vice-mcp + regenerator2000 together — this document doubles as the working
draft of that methodology.

## The validated methodology

1. **Boot it, get past the loader with the minimum effort that works.**
   Attach the disk/PRG via vice-mcp (`vice_autostart`), let it load and run.
   Don't try to fully annotate the loader/relocator byte-by-byte — note the
   pattern (bank-switch trick, relocation copy, whatever) and move on. See
   "Loader, understood well enough" below for what that looked like here.
2. **Trigger real gameplay, not just the attract/title screen.** The title
   screen alone may run on default KERNAL housekeeping with no custom code
   installed — checking state there can be misleading (see the false start
   below). Press whatever starts the game (F1 here) and confirm with a
   screenshot that actual gameplay is happening.
3. **Find the real steady-state entry point.** Check the KERNAL "soft" IRQ
   vector at `$0314`/`$0315` (and NMI at `$0318`/`$0319` if relevant) live,
   *during actual gameplay*. Most games hook this (or patch the hardware
   vector at `$FFFE` directly while ROM is banked out, same trick as a
   custom reset vector). A sane-looking address that's different from
   whatever it was at the title screen is a strong signal you've found the
   real game loop / ISR.
4. **Snapshot right there.** `vice_snapshot_save` while that vector points
   at real code and gameplay is visibly active on screen. This captures the
   *entire* 64KB RAM array regardless of current ROM banking.
5. **Load the `.vsf` into a fresh regenerator2000 instance** (`--mcp-server
   path/to.vsf`, no `--headless`, wrapped in a real pty — see
   `INSTALL-LOG.md`). Every address is now real and native — no manual
   relocation math, `r2000_disassemble` follows JSR/JMP targets across the
   whole 64KB space on its own. This is where regenerator2000 actually earns
   its keep for the *engine*, as opposed to the loader where every address
   needed hand-translation.
6. **Persist immediately.** regenerator2000 has no reliable non-interactive
   save — append every `r2000_disassemble`/`set_label_name`/`set_comment`/
   `set_data_type` call to a `.jsonl` log the moment it's made, replayable
   via `scripts/r2000_replay.py`. This project keeps the loader analysis and
   the gameplay analysis as **two separate logs** (`r2000_annotations.jsonl`
   vs `r2000_gameplay_annotations.jsonl`) since they're two different loaded
   files (the PRG vs. the `.vsf`) with unrelated address spaces.

## What this found, immediately, validating the approach

One `r2000_disassemble` call from the real ISR address (`$EA31`, found via
step 3 above) auto-traced three coherent, complete routines with zero manual
address translation:

- **`isr_sound_and_tick`** ($EA31) — the real steady-state IRQ handler
  (CIA1 Timer A, ~60Hz). Runs 4 independent countdown timers, each driving
  one SID voice's frequency from a lookup table — a sound-effect sequencer,
  not raster-sync graphics work.
- **`sfx_voice1_trigger`** ($F540) — a small helper the ISR calls to
  trigger or silence a voice.
- **`sprite0_position_update`** ($E35E) and **`sprites1_7_position_update`**
  ($E38C) — chained from the same ISR (not a separate handler). Converts
  shadow X/Y position variables into real VIC-II sprite registers, handling
  the 9th-bit X coordinate via per-sprite bitmask tables, for the player rat
  (sprite 0) and up to 7 enemies/cats via a table-driven loop.

That's the actual game engine tick — sound + all sprite movement, every
frame — found and disassembled correctly in minutes, compared to the
multi-hour manual page-math needed for the loader. This is the strongest
evidence yet for prioritizing this workflow.

## A real trap hit along the way, worth keeping in the methodology

Checking `$0314` at the **attract/title screen** (not real gameplay) showed
garbage (`$FFFF`) with CPU port back to `$37` (full ROM, no custom banking)
— i.e. nothing hooked, title screen runs on KERNAL defaults alone. Only
after pressing F1 and confirming actual gameplay (screenshot showing the
maze animating) did `$0314` show a sane address with ROM banked out. Lesson
folded into step 2/3 above: **always verify with a screenshot that the
state you're inspecting is the state you think it is** — a paused emulator,
an attract loop, and real gameplay can look deceptively similar from
register reads alone.

## Loader, understood well enough (not pursuing further)

For reference — this is "done" for the purposes of this project, logged in
`games/radar-rat-race/annotations-loader.jsonl` / replayed onto `work/radarrat.prg`:

- `SYS 2061` → `relocator_entry` ($080D): banks out BASIC, copies the
  loaded 8KB image to two destinations ($1F00-$3F00, $DF00-$FF00) via a
  32-page copy loop. The source's own last page lands at $FF00-$FFFF,
  which is how `$FFFC`/`$FFFD` end up holding a program-controlled reset
  vector with no explicit write instruction — just a side effect of the
  copy.
- `cold_start_e037`: VIC-II + SID register init from canned tables, sets up
  the CIA1 Timer A that becomes the real IRQ source once the "cold start"
  phase transitions to the steady-state ISR above.
- **Confirmed important fact**: both relocation destinations get overwritten
  with real gameplay graphics data within seconds of boot — they're
  transient staging space, not permanent code homes. This is *why* the
  one-shot loader code can only be recovered from the static PRG file (it
  self-overwrites faster than any checkpoint+read round-trip over HTTP can
  catch) and *why* a post-relocation snapshot needs to be taken during
  actual steady-state gameplay, not right after the loader finishes.
- Page-relocation formula (only needed for the loader's own analysis, not
  the engine): `dest_page = source_page + 0xD7` for the $DF00-$FF00 copy,
  `+ 0x17` for the $1F00-$3F00 copy.

## Current state / next steps

- Engine analysis (via `active_gameplay.vsf` + `r2000_gameplay_annotations.jsonl`):
  5 routines found and labeled. The full interrupt chain is now understood:
  `hw_irq_entry_stub` ($EE10, the real `$FFFE`/`$FFFF` target with ROM
  banked out) is minimal — saves registers, sets `zpa_7F=1`, acknowledges
  the CIA1 interrupt, RTIs. It does **not** call the sound/sprite code
  directly. That work — `isr_sound_and_tick` ($EA31, chains into
  `sprite0_position_update`/`sprites1_7_position_update`) — is called from
  the **foreground main loop** once it polls `zpa_7F` and sees it set
  (matches the `lda zpa_7F / beq loop` wait found earlier in the
  loader-side main-loop analysis). Classic "interrupt sets a flag, main
  loop does the real work" pattern.
- **Resolved** the `$EA02`/`$EA31` overlapping-bytes ambiguity via live
  non-stopping exec checkpoints (hit-counting over 4s, not single-stepping —
  more reliable given the pause-overshoot behavior documented earlier):
  `$EA02` fires ~565/sec, its fall-through hits `$EA30` (452 hits/4s — the
  `LDA #$05` reading is genuinely executed), while `$EA31` as a *direct*
  entry got 0 hits. Both readings are real, just used in different
  circumstances — `$EA30` is what runs via the polled path, `$EA31`/`ORA`
  only runs via a genuine hardware-interrupt entry.
- **False alarm, corrected**: initially thought `vice_cia_get_state` showing
  `interrupt_control: 0` meant the CIA1 interrupt was disabled (i.e. that
  we'd only ever seen an "attract-mode demo," not real interrupt-driven
  play), and spent some effort trying to trigger "real" gameplay via
  joystick/fire. **Wrong** — on a real 6526 CIA, reading `$DC0D` returns
  the pending/unacknowledged interrupt *flags*, not the enable mask, and
  `hw_irq_entry_stub` itself reads `$DC0D` every single time specifically
  to acknowledge/clear it. Our own read was just racing the ISR's own
  acknowledgment. Confirmed properly via hit-counting instead of register
  reads: on a completely fresh boot, before touching any input,
  `hw_irq_entry_stub` fires **1580 times in 2 seconds** (~790/sec) — the
  interrupt runs continuously and reliably, always. There is no separate
  "demo mode with interrupts off." A static search also confirms this: only
  **two** `STA $DC0D` instructions exist anywhere in the program (both
  inside `cold_start_e037`, both one-time boot writes — the rest of the 7
  hits found by a memory search are just the same two instructions
  appearing again at each relocation destination). Nothing ever disables it
  afterward.
- Corrected model: the engine (interrupt → tick flag → main loop → sound +
  sprite update) is the same whether the rat is being driven by the
  attract-mode demo AI or a real player — that's normal design (compare
  Pac-Man's attract mode, same engine, scripted input).

**BREAKTHROUGH — real gameplay finally triggered (2026-09-13).** Root cause
of every earlier failed attempt: **`WarpMode` was `1`** (~13x uncapped
speed) the entire time, left over from who-knows-when in this long session.
That's what made the CIA1 ISR look like it fired ~790/sec (a 60Hz timer
times ~13). It also silently broke every attempt to "press F1" — with warp
on, F1 never registered, no matter the hold duration. The static-analysis
work done *while confused about this* was still all correct and worth
keeping (the interrupt chain, the relocation formula, the sprite/sound
routines) — this was purely an input-timing problem, not a wrong model of
the code.

**The real "start game" mechanism**, found by single-stepping the idle loop
directly instead of guessing more inputs: the attract screen sits in a tight
loop at (relocated) `$EFF7`: `LDA $7F / BEQ` (wait for tick) → `JSR $EE2E`
(per-tick attract work) → `LDA #$FE / STA $DC00` (select keyboard matrix
row 0) → `LDA $DC01 / AND #$10` (test F1's column bit, row 0 bit 4 on a
standard C64 matrix) → if pressed, `JMP $EBCF`. This is genuine keyboard
**matrix** scanning, not joystick reading — matches why keyboard-buffer-style
input never had a chance either way.

`$EBCF` plays a short start-of-round fanfare (silences voices, table-driven
frequency sweep over ~46 ticks) then falls into the real main loop's
tick-wait at `$F271` (same address our loader-side static analysis already
flagged as "the main loop," now confirmed live). **Verified fully working**:
with `WarpMode` off, pressed F1, watched PC move from the idle loop through
`$EBCF` into `$F271`, screen changed from title text to a rendered maze, and
`vice_joystick_set` on port 1 genuinely moved the rat (`zpa_92/93` changed
`$1E4E`→`$214A`, matching "right"). Screenshot confirms the rat sprite and a
change in the life-icon display. New snapshot saved:
`work/real_gameplay_confirmed.vsf`.

**Recipe going forward, whenever gameplay needs to be re-entered**: `vice_machine_config_set({"WarpMode": 0})`, hard reset, autostart, wait ~3s,
`vice_keyboard_key_press("F1", hold_ms=500)`, wait ~2-4s for the fanfare to
finish, confirm via screenshot that the maze (not title text) is showing.

**Correction, found the hard way**: `vice_autostart` **silently re-enables
WarpMode** every single time, regardless of what it was set to beforehand —
confirmed reproducibly (set to 0, autostart, read back: 1). The fix is to
set `WarpMode: 0` again *after* autostart, not just once at the start of a
session. Symptom when this bites: F1 stops registering and the game
appears "stuck" on the attract screen — easy to misdiagnose as something
else (spent real time chasing this as a screen-corruption bug before
finding the actual cause).

**Also found the hard way**: a corrupted-looking attract screen (missing
TIME bar, garbled "SCURE" label, stale score digits) that persisted across
multiple hard resets and even a manual `vice_memory_fill` of screen RAM —
turned out to be accumulated corruption in the VICE process itself from
extensive same-session testing (not C64 RAM content, which does get
reset/reloaded normally). Fixed by fully killing and restarting the x64sc
process. Lesson: if a hard reset + screen clear doesn't fix visibly wrong
rendering, restart the emulator process itself before assuming it's a code
misunderstanding.

**First real collision observed, indirectly.** With `vice_joystick_set`
driving the rat right, its position (`zpa_92/93`) came to exactly match the
first entry in the enemy X/Y arrays (`zpf_22`/`zpf_2A` — both `$3E,$67`).
By the next check (a few real seconds later, spent reading memory/taking a
screenshot), the game had already returned to the attract/title screen —
consistent with: collision detected → life lost → (lives was `$01` at
`$0210`, i.e. last life) → game over → back to attract. `zpa_9A` read `$01`
at the moment of the overlap (was `$00` earlier at a different attract
visit) — plausibly a collision/death flag, but not confirmed precisely
since the transition was only caught after the fact.

**Collision detection: fully found and confirmed.** `collision_check`
($F344, real address in the gameplay snapshot) is called repeatedly from
the main loop and does two position-match checks, either one incrementing
`zpa_9A` (`collision_flag_inc` at $F36D): (1) rat position against a static
table (`zpf_C2`/`zpf_D2`, X-indexed by `a_0201` — likely a wall/hazard
table, not yet decoded further); (2) rat position against every active
enemy's position (`zpf_22`/`zpf_2A`, X-indexed by `zpa_81` = enemy count).
Confirmed twice now, live: drove the rat via `vice_joystick_set` until its
`zpa_92`/`zpa_93` exactly matched an enemy's array entry, watched `zpa_9A`
flip `0→1`, and the game returned to the attract screen immediately after
(life lost; since lives at `$0210` was `1`, that's a game over). Both
findings committed to `r2000_gameplay_annotations.jsonl`.

**Process note**: built `scripts/_append_annotation.py`, a small helper that
validates each JSONL entry with a `json.dumps`/`json.loads` round-trip
*before* writing, specifically to stop the "forgot a closing brace" class of
bug that broke the annotations log twice earlier this session. Use it (or
equivalent validation) for all future annotation appends rather than raw
heredocs.

**`hazard_x_table`/`hazard_y_table` ($C2/$D2, 8 entries, bounded by
`a_0201`=$07)**: read live — `(2,30) (40,30) (10,32) (48,36) (60,44) (40,46)
(22,66) (12,106)` as decimal (X,Y) pairs. Not yet identified what these
represent (static per-round hazards is the working theory, since colliding
with them increments the same `zpa_9A` flag as an enemy hit — but could
also be goal/exit markers). Committed to the annotations log.

**Score display located**: screen RAM `$04E4`-`$04E6` (3 PETSCII digit
characters, standalone `SCORE` label at row 4 col 23, digits row 5 same
column +5). Confirmed live going `000`→`100` during play, matching the
visible `NEXT MEAL: 100` bonus value at the time — working theory: eating
the meal/cheese item awards points equal to the current "next meal" bonus.
No direct `STA $04E4` (or `,X`/`,Y` indexed) instruction exists anywhere in
the binary, so the score display is written through an indirect/computed
address — likely a shared digit-printing routine also used for HI-SCORE,
NEXT MEAL, and ROUND — not yet traced to its source.

**Practical lesson learned this iteration**: driving the rat with rapid/
random direction changes reliably causes a collision almost immediately —
every attempt at "careful" movement this session still resulted in an
already-collided state (`zpa_9A=1`) by the time the very next check ran.
Real-time joystick fights are consuming a lot of iterations for little
additional data now that collision itself is confirmed. Next session should
prefer **static tracing of the shared digit-printing routine** and other
still-unexplored subroutines (there are ~130 resolved-but-untraced external
addresses queued from the loader-side analysis, plus whatever the
`collision_check` callers do after a hit) over more live played rounds,
which are proving fragile and short-lived (1 life observed both times).

**Correction**: `$0210` is the **ROUND number**, not lives — confirmed via
static disassembly (`round_digit_display`, $EBA4): `LDA a_0210 / AND #$0F /
ORA #$30 / STA a_05C5` is a textbook BCD-nibble-to-PETSCII-digit
conversion, and `INC a_0210` a few instructions later increments it
periodically (gated by a countdown, not by collision). Both test games
showed `$0210=1` simply because neither survived past round 1 — nothing to
do with lives. The real "lives remaining" variable is still unidentified;
next candidate to check is whatever `draw_2x2_icon` ($E8BC, the life-icon
drawer found this iteration) uses to pick which of the 3 icon slots to
erase.

**Found via static tracing this iteration** (as prioritized): `draw_2x2_icon`
($E8BC) — draws a fixed 2×2 character tile through the `zpp_82/83` pointer,
almost certainly the life icon graphic; `round_digit_display` ($EBA4) — the
round-number digit printer, corrects the `$0210` misidentification above;
`zpa_e2_digit_display` ($EC87) — a second 2-digit leading-zero-suppressed
display, this time of `zpa_E2` (the BCD tick counter), at screen
`$071B`/`$071C` — not yet correlated with a specific visible stat.

**Major correction**: what looked like "maze auto-tiling" around
`$E188`-`$E1CD` is actually the **radar mini-map renderer** — `radar_draw_enemy`
($E15D, called once per active enemy) and `radar_relative_position`
($E738, computes `enemy_pos - rat_pos + 8`, clipped to an 18-cell window).
This is what draws the white dots in the black panel visible in every
screenshot taken this session — the actual mechanic the game is named for.
Confirms the small side-panel is a real gameplay radar, not decoration.

**Score/hi-score system: found and mostly confirmed.**
`print_bcd_byte_2digits` ($F0AE) is a generic BCD-byte→2-digit printer with
proper leading-zero suppression (X = "started printing yet", Y = running
digit position 0-5, forced print on the last slot so a zero score still
shows). `score_display_and_hiscore_update` ($F060) uses it to print the
score at screen pointer `$04E0` (matches the live-confirmed `$04E4`-`$04E6`
digits exactly — leading slots just blank from suppression), then compares
score against hi-score and auto-updates + sets `a_0217` (new-high-score
flag) if beaten. Storage is **interleaved**, not contiguous: score bytes
are `zpa_E7/E9/EB`, hi-score bytes `zpa_E8/EA/EC` (confirmed by the 3-byte
subtraction comparison reading exactly those bytes). Exact
per-byte-to-digit-position nibble order not fully re-derived yet — a live
example didn't cleanly match, worth one more verification pass, but the
overall structure (interleaved storage, shared printer, auto-update) is
solid.

**Digit order: fully verified.** Traced the exact Y-increment mechanics:
outer loop reads score bytes `E7,E9,EB` (Y jumps 0→2→4, each byte call
increments Y twice). Digit positions relative to the `$04E0` pointer:
`pos0=hi(E7), pos1=lo(E7), pos2=hi(E9), pos3=lo(E9), pos4=hi(EB),
pos5=lo(EB)`, plus an **unconditional trailing '0'** written one past the
loop (`pos6`, always, regardless of suppression). Verified by simulating
against the live "HI-SCORE 20000" example (bytes `E8=00,EA=20,EC=00` →
suppressed, suppressed, '2', '0','0','0' + forced trailing '0' = "20000",
exact match). Same mechanism resolves the earlier confusing "100 with
zero-valued bytes" read — screen content goes stale when the print
routine isn't being called (e.g. at the attract screen after a round
ends), so leftover digits from a previous, larger score can persist
un-cleared in the suppressed positions.

**Lives-remaining variable: found.** `zpa_lives_remaining` ($9C) — read
live as `3`, matching the 3 life icons on the title screen exactly, and
matching the loader-side death-sequence logic found much earlier
(`dec zpa_9C / beq b_1C28` right after the death jingle). Corrects the
"apparently 1-life game" impression from earlier live-play testing — that
was very likely rapid-direction-change test movement burning through all 3
lives within a fraction of a second before any check could catch the
intermediate state, not a real 1-life design.

**`zpa_lives_remaining`'s consumer checked**: `redraw_round_icon` ($F328,
what `b_1C28` resolves to) just redraws a small decorative 4×2 icon block
next to the round-number display — it's a shared UI-refresh utility called
from multiple places, not lives-specific, so it doesn't confirm or deny a
distinct "game over" code path. That's still unlocated.

**Radar tile tables identified, but they're not the maze format**: all 6
tables `zpf_02/06/12/16/1A/1E` contain only `$40-$4F` values — sub-cell dot
graphics for the radar display, not maze wall tiles. **Maze/level data
format is still unlocated.** VIC-II is in character mode with multiple
background colors set (likely multicolor char mode, matching the maze's
blocky look), but no direct `STA $0400,X`/`,Y` exists anywhere in the
binary — the maze-drawing routine, like everything else in this game, uses
an indirect zero-page pointer rather than a fixed base address. Needs a
different search strategy next time: watch for writes to the maze's screen
region live during an actual level transition/redraw, or search for a
`LDA #<$0400/STA zp` + `LDA #>$0400/STA zp+1` style pointer-setup pattern.

**Live-write-watch attempted**: caught one write into the screen region on
the first try (`clear_screen_blue`, $EC0A) — a generic full-screen blank
(space + blue color, $0400-$07FF, 4-page loop via `zpp_82/83`+`zpp_90/91`
pointers). This is the blanking pass that runs before the actual maze tiles
get drawn, not the maze data itself.

**New reliability problem found, not yet solved: F1 stopped registering
reliably at all**, across many different attempts this iteration (varying
hold duration 500ms-2000ms, pause/resume-then-press, direct
`vice_keyboard_matrix` row/col simulation of F1's exact matrix position).
Re-arming the write-watch to catch a second hit also silently failed to
ever stop (checkpoint's `stop:true` on a wide store range proved unreliable
for pausing, consistent with earlier-documented pause-mechanism quirks).
While investigating, found something concerning: after enough real time
sitting at the attract screen, pausing and reading PC found it executing
**garbage** at `$EC22` (the exact address inside `clear_screen_blue` we'd
disassembled as real code earlier in the same session) — `00 00 FF FF FF`,
the same "transient/reused" garbage pattern documented much earlier for
the two relocation destinations. Working theory: extended attract-mode
idle time eventually cycles this same physical memory back into a
"graphics data" role (consistent with everything else in this game reusing
memory aggressively), and the CPU can end up executing through it as
pseudo-code if a stale return address or jump target still points there —
which would fully explain both the corrupted-screen incident and the F1
unreliability from this and the previous iteration as knock-on effects of
the same root cause, not independent bugs. **Not confirmed**, just the
most coherent theory so far. Practical mitigation for now: reset+autostart
immediately before whatever needs to happen, and act fast (within a couple
of seconds) rather than letting the attract screen sit for long before
sending input.

**"Memory reuse" theory refuted, real fix found instead.** Monitored
`$EC22` at 1.5s intervals for 16.5s right after a fresh boot — it read
`00000000` the *entire* time, never anything else, ruling out gradual
decay. The actual problem was simpler and unrelated: **a single clean
`vice_keyboard_key_press("F1")` is just not reliably detected by this
game's poll**, regardless of timing, hold duration, or how fresh the boot
is — confirmed failing even immediately after a from-scratch process
restart. **Fix: send several rapid presses in succession** (6× at ~300ms
hold / ~800ms apart worked reliably) rather than one longer hold — matches
how a real player mashing a key would look, and reliably got us into the
maze with the rat and a second, previously-unseen sprite (a yellow/orange
item in the top-left corner — first time item pickups have actually been
visible in the maze) both rendering correctly. **Recipe updated**: after
`WarpMode:0` + boot, send multiple rapid F1 presses (a small loop), not one
long hold.

**Open threads for next iteration**: catch the actual maze tile writer
(re-arm a write-watch after `clear_screen_blue` fires, or try a narrower
single-address watch given the wide-range watch's demonstrated
flakiness); decode what `hazard_x_table`/`hazard_y_table` actually
represent; find the actual game-over code path (distinct from a round
restart) if one exists; identify the yellow/orange item sprite just seen
in the maze for the first time (likely the "meal"/cheese pickup).

**Narrower maze-write-watch attempt**: armed a single-address watch on
`$040B` (visually inside the maze area in an earlier screenshot) and
mash-pressed F1 — only one write ever happened, and it was
`clear_screen_blue` itself (writing space, not a wall tile). Checked
color RAM at the same range: uniformly `$F6` (masked to blue, the default
background), no maze pattern visible there either at the moment checked.
**Still unresolved** whether this means (a) that specific cell is simply
floor/background in this maze layout (plausible — mazes aren't solid), or
(b) we weren't actually looking at the rendered maze at that moment. Needs
a cleaner test: confirm via screenshot that the maze is genuinely on
screen at the *same instant* as the memory read, then sample several
different screen offsets (not just one) spanning both wall-colored and
floor-colored regions visible in that screenshot.

**F1-mashing reliability caveat, now root-caused (partially)**: the
"abbreviated" attract screen from earlier isn't a different attract-mode
page — pausing and reading PC while it's showing found the CPU genuinely
stuck executing garbage (`00 00 FF FF FF`, i.e. `BRK`/invalid) at `$EC22`,
which is real code (`clear_screen_blue`) in a healthy run. This corruption
was observed as early as 1.5s after autostart, sometimes. **Root cause not
fully explained** — clear_screen_blue's own write pointers didn't spatially
line up with $EC22 in the one trace checked, so it's not simple
self-overwrite by that routine, but *something* in this heavily-relocated,
aggressively-memory-reusing codebase corrupts this address early and
non-deterministically (worked fine at least twice this session, hung like
this at least three times). **Decision: stop chasing this specific bug —
diminishing returns across multiple iterations now.** Practical stance
going forward: live-play access is inherently somewhat unreliable in this
build; retry reset+autostart+F1-mash a few times if needed, and don't block
progress on it — **prefer static tracing (regen2000, no live gameplay
needed) whenever a question can be answered that way**, falling back to
live verification only when static analysis genuinely can't resolve
something.

**Game-over path: found, via pure static tracing (no live gameplay
needed) — validates the "prefer static" decision above immediately.**
`game_over_reset` ($F1E2), reached from `redraw_round_icon` when
`zpa_lives_remaining` hits zero, resets the entire game state to
fresh-game defaults: lives back to 3, round back to 1, all three
interleaved score bytes zeroed (hi-score correctly left untouched), the
new-high-score flag cleared, and the round-parameter index reset — then
falls straight into `j_F1FD`, the *very first* piece of code this whole
project ever looked at (back in the original orientation pass). So
"game over" isn't a separate screen/routine in this game — it's "reset to
defaults, then run the normal round-start sequence again."

**Hazard table: answered.** `hazard_x_table`/`hazard_y_table` (`f_00D2`,
zero page `$C2`/`$D2`) is actually **16 slots**, not 8 (`a_0201`'s value of
7 was just this round's active count, not the table size — the round-init
copy loop at `$EE67` moves 16 bytes). Confirmed dual-purpose, structurally
identical to the dynamic enemy arrays: (1) collision-checked against the
rat's position in `collision_check` ($F344) — an exact X+Y match sets the
same collision flag (`zpa_9A`) that touching a `zpf_22`/`zpf_2A` enemy
does; (2) drawn on the radar panel via the *same* `radar_relative_position`
routine enemies use. At round setup, both tables are populated by copying
16 bytes from a per-round source template (via a `zpp_82`/`zpa_84` pointer
pair — the template's own location wasn't traced further), then a
shuffle/insertion routine reorders them using the round-parameter index and
a small PRNG call. So: per-round, template-driven, then shuffled — not
hand-placed per instance, not purely random either. Best-supported
interpretation: a second, non-animated hazard class (static
obstacles/traps) distinct from the dynamically-moving `zpf_22`/`zpf_2A`
enemies. Exact in-game visual identity not confirmed.

**Maze/level data format: answered, via pure static tracing.** There is no
separate maze/level data structure anywhere in this program.
`read_screen_in_direction` ($E875) — called from `handle_direction_input_and_collision`
with X=direction (0-3) — looks up a 16-bit pointer per direction from
tables `f_FDC3`/`f_FDC7`, then reads **one byte directly from screen RAM**
through it. The static file's compiled-in initial pointer values (`$059B`,
`$05C5`, `$0613`, `$05C2`) are all squarely inside screen RAM
($0400-$07E7), confirming this reads the actual on-screen character to
decide whether a direction is blocked. The caller does a plain
`cmp #$2a` / `cmp #$7f` against the raw returned byte — **no masking or
sub-cell refinement layer at all**; those two codes are simply the two
on-screen characters that mean "open floor." (**Correction, 2026-09-13**:
an earlier pass on this doc/annotation wrongly attributed a "sub-cell
bitmask refinement" at ~$E580 to this collision check. That code is a
*completely different* routine — see "Radar terrain rendering" below —
that merely reuses the same `zpp_82` zero-page scratch pointer name for an
unrelated purpose. The two were conflated by proximity, not by any actual
call relationship; corrected in both this doc and the regen2000
annotation.) **So "the maze format" is just whatever's drawn on screen —
the same data that gets rendered *is* the collision map**, a classic,
elegant space-saving technique for 1982 hardware.

**New: the "eat" mechanic, found while re-examining the collision
caller.** `handle_direction_input_and_collision` ($E8D9): after the
`$2a`/`$7f` open-floor check passes through (i.e. the target cell holds
*any other* character), control falls into `eat_tile_effect` ($E910) —
confirming that any non-floor, non-wall-sentinel screen tile is treated as
a consumable (matches this game's cheese/food pickups). `eat_tile_effect`
pushes the rat's position onto a 14-slot rotating queue
(`radar_blip_x_queue`/`radar_blip_y_queue`/`radar_blip_timer_queue` at
zero page `$52`/`$61`/`$70`, count in `radar_blip_active_count` at `$9D`),
starts the chomp sound (voice 2), and sets `chomp_sound_gate` ($0216)
which a tick handler later uses to time-limit the sound. Each frame, the
queue is decayed and every still-active entry is drawn as a fading blip on
the radar panel using the exact same `radar_relative_position` +
screen/color-pointer-pair plumbing `radar_draw_enemy` uses — so eating
something produces a brief marker on the radar, not just a sound/score
tick. (The tile itself isn't cleared in this routine; that must happen
elsewhere, not yet traced.)

**Radar terrain rendering: newly identified, and the source of the
correction above.** `redraw_radar_terrain_near_rat` ($E41F) computes a
screen-RAM pointer near the rat's current character-cell position and,
via a per-cell sampler (`s_E56F`/$E56F, called ~8-9 times in a loop),
copies/masks nearby screen content into two fixed radar-panel screen+color
destinations. The per-cell sampler ANDs the sampled screen byte against a
per-offset table (`f_FCD2`, 8 entries) whose exact bit-level meaning is
**still not pinned down** (coarse "any wall bit present" test vs. a
sample-window edge mask are the two live guesses) — but it is now clearly
part of drawing the radar's miniature terrain preview, unrelated to the
rat's own movement collision. Out-of-range cells are filled with the same
`$2a` "open floor" sentinel. Immediately after this (`j_E5E0`/$E5E0), the
hazard table is walked and each entry is drawn on the radar the same way —
confirming hazard positions are part of the radar's live picture, not just
a hidden collision list.

**New: the round timer/gauge.** `round_timer` ($E4) is a per-round
countdown initialized to 80 at round start, decremented once per
successful move (via `s_F165`, called from `eat_tile_effect`), and gates
`handle_direction_input_and_collision` itself — once it hits 0, the eat
path no longer fires. It's rendered live as a shrinking segmented bar at
`round_timer_gauge_display` ($0432): each screen byte is either blank or a
partial-fill character selected by `timer & 7`, giving an 8-step-per-cell
depleting gauge. A periodic tick-handler check (`$EACA`, every ~40 ticks)
reacts when it reaches 0 (interacts with `zpa_A8`, not fully traced) and a
low-timer threshold (`round_timer == 12`) sets a pair of flags
(`a_0206`/`a_0207`) likely driving a warning flash/sound. This is a real
gameplay clock, separate from the round-transition/round-number system
found earlier — moving costs time, not just surviving hazards.

**Answered: what happens when `round_timer` hits 0.** Less dramatic than
guessed — no life loss, hazard spawn, or round-end. `move_cycle_interval`
(`$80`) is the game's actual speed knob: the number of ticks between each
full move/collision-processing cycle (`s_E78C` direction handling +
`collision_check`), enforced via a reload-on-zero countdown
(`move_cycle_countdown`, `$9B`) at `$F271`. It defaults to 6 per round
(or 4, in a faster/harder variant selected by a per-round parameter
table's sign bit, which also temporarily boosts the enemy count). Once
`round_timer` reaches 0, the periodic `$EAC0` handler increments
`move_cycle_interval` by 1 every ~40 ticks, capped at 18 — so running out
of time just makes the whole game progressively more sluggish, not an
immediate penalty. (Genuinely surprising for an arcade game of this era —
worth double-checking against live play if the F1-reliability issue ever
gets easier to work with, but the static trace is unambiguous.)

**Answered: where the per-round hazard template comes from.** Traced the
round-init dispatcher (`j_F1FD` at $F1FD — the very first code this
project ever looked at, and where `game_over_reset` lands). It maps the
round-parameter index (`zpa_E3`) through an indirection table (`f_FF17`)
to a "parameter set" index, then uses *that* to look up both the radar
redraw's base pointer and the hazard-layout template source pointers
(`hazard_template_x_ptr`/`$9E-9F` and `$A0/A1`, feeding `s_EE57`'s 16-byte
copy into the live hazard tables). Separately, `zpa_E3` indexes two more
tables *directly* (no indirection) for this round's enemy count and
active-hazard count. Net effect: enemy/hazard **counts** are per-round,
but hazard **layouts** (and the radar base pointer) are shared across
rounds via the parameter-set indirection — a standard "several rounds
reuse one tuning profile" design.

**Investigated, inconclusive (at the time): does the eaten tile get
cleared?** Traced `s_E78C` (the rat's actual turn/move-resolution
routine — also revealed that `s_E3E1` is the *true* entry point of the
radar-terrain-redraw routine documented above, not
`redraw_radar_terrain_near_rat`/$E41F, which is just its second half) all
the way through to where it jumps into `handle_direction_input_and_collision`.
Searched every one of the 50 references to the `zpp_82` scratch pointer in
covered code: all of them belong to `radar_draw_enemy`, the radar-terrain
sampler, or the hazard-blip drawing block — none are near the eat path.
So the consumed tile is **not** cleared via `zpp_82`, or via the `$2a`/
`$7f` sentinel values (a second search pass, below). **Since resolved —
see "The round-complete mechanic" further down: it's cleared with a plain
space character (`$20`) at the item's own stored position, not the rat's
live position, via a completely different routine (`clear_eaten_meal_tile`)
than either search was looking in.** (Also corrected a wrong guess in
passing: `s_EB34`, called in the harder round variant, is **not** an
"enemy-count boost" — read in full, it resets the rat's position,
*zeroes* the enemy count, changes the background color, and drives a
tick-based animation, much more like a "get ready"/interlude sequence than
a difficulty bump — see `round_transition_sequence` below.)

**Answered: `f_FCD2`'s bit-level meaning.** It's just the standard
`{$80,$40,$20,$10,$08,$04,$02,$01}` bit-select table. The key detail
(missed the first time) is that the radar-terrain sampler's *source*
column offset only advances once every 8 inner-loop iterations, while the
bit-select index cycles through all 8 every time — meaning each real
screen-RAM byte gets unpacked bit-by-bit into 8 separate radar output
columns, giving the radar 8x the horizontal resolution of one maze
character cell. Implication: since the source is the literal on-screen
character *code* (not a separate bitmap), a wall tile's screen-code value
may itself double as an 8-bit wall-shape bitmask — the same code that
picks which glyph to draw also supplies fine-grained shape data for the
radar preview. Elegant, and consistent with (not a contradiction of) the
"screen RAM is the maze" finding.

**Coverage check**: `r2000_get_blocks` shows all previously-"undefined"
gaps between the four main code blocks are populated data tables (sampled
$F3C8-$F3F2, confirmed non-code bytes — round-parameter/hazard-template
data, consistent with everything already traced back to `j_F1FD`'s
lookups), not unexplored code. Combined with a `#$2a`/`#$7f` xref search
turning up nothing new, **essential code coverage for this snapshot now
looks complete** — remaining open items below are detail-level, not
architecture-level gaps.

**Answered, and more significant than expected: `s_EB34` is the
round-transition ("ROUND N") announcement sequence.** Not a minor
interlude — it's a real piece of core game structure. Over a
tick-animated sequence it: resets the rat to a fixed start position and
the first enemy's slot, zeroes the active enemy count, plays a short
tune (one note every 10 ticks from a fixed table), animates a small icon
via `radar_draw_enemy` + a fading position counter, then finally prints
the round number (`round_number`, `$0210` — previously misidentified as a
lives counter, corrected earlier via `round_digit_display`) and
increments it. This ties together `round_number`, the enemy reset, and
the round-init dispatcher (`j_F1FD`) all in one place, called from the
harder per-round variant selected in `j_F236` (`f_FF08[zpa_E3]`'s sign
bit) — likely meaning "show the full animated transition" for certain
rounds vs. a quieter path for others (not confirmed either way, but this
is now a well-understood piece of the round-progression system rather
than an open question).

**Answered: the round-complete mechanic (the biggest remaining gap from
before).** A round is completed by eating all 10 **meal** items scattered
through the maze — not a timer, not a maze-traversal condition. Ten
positions live in `meal_x_table`/`meal_y_table` (zero page `$AA`/`$B4`,
10 slots), placed at round setup by `place_meal_items` ($EEA8):
repeatedly generating a random candidate position (`prng_next`, modulo 32
for X and 56 for Y) and rejecting it if it collides with an existing meal
item, a hazard-table entry, or — reusing `bit_select_table` exactly as the
radar terrain sampler does — an actual wall bit at that position. So meal
placement is genuinely randomized-with-constraints per round, unlike the
hazard table's fixed two-template design above. Eating a tile now traces
all the way through: `handle_direction_input_and_collision` →
`eat_tile_effect` → `check_meal_eaten` ($F0CA, called from `eat_tile_effect`),
which searches the meal tables for the rat's exact position, and on a
match: increments a per-life eat counter, calls `clear_eaten_meal_tile`
($E348) to **erase the tile with a plain space character (`$20`) at the
meal item's own stored position** — this is what two earlier search passes
for `zpp_82` writes and `$2a`/`$7f` stores both missed, since neither the
pointer nor the sentinel value matched what's actually used here — then
either compacts the item out of the 10-slot tables and decrements
`meals_remaining` (`$BE`, init 9), or, if the eaten item was the very last
one, sets `round_complete_flag` (`$BF`). The per-tick loop at `$F2B1`
only advances to the next round (`inc zpa_E3; jmp j_F1FD`) once
`meals_remaining==0 AND round_complete_flag` is set.

**Answered: the level-progression data tables.** Three round-index-keyed
tables drive difficulty, all sharing one clean pattern — a "bonus round"
every 4th round (round-index 2, 6, 10, 14): `round_to_enemy_count` ramps
2→3→4→5→6 and plateaus at 6, with an early spike to 6 on the *first*
bonus round; `round_to_hazard_count` is flat at 7 except doubling to 15
(all 16 hazard slots) on every bonus round; and the same bonus rounds are
exactly where `round_to_paramset`'s per-round flags go negative (the
"harder variant" — faster pace, `round_transition_sequence`'s full
animated announcement). A fourth table, `round_to_paramset`, maps the
round index to one of only **two** hazard "parameter sets" — confirmed by
`paramset_to_hazard_x_ptr_lo/hi` and `paramset_to_hazard_y_ptr_lo/hi`
having exactly 2 entries each, pointing to two fixed 16-byte hazard-layout
templates at `$FE08`/`$FE28` (X) and `$FE18`/`$FE38` (Y). So: **hazard
layout repeats on a 2-template cycle, while enemy/hazard count keeps
escalating independently** — two different difficulty axes sharing one
round counter. Meal-item positions, by contrast, are never templated —
they're freshly randomized every round (see above).

**Discovered and fixed: a real gap in the JSONL-replay persistence
model.** Passively reading a region with `r2000_read_region` turns out to
silently disassemble it as a side effect — a mutation that was never
logged, since only explicit `r2000_disassemble` calls were ever recorded
as `"kind": "disassemble"` entries (5 of them, all early). A clean replay
into a fresh process only reproduced 378-1940 bytes of code coverage, not
the actual ~4841. Fixed by explicitly re-disassembling the 4 known code
regions' start addresses plus their internal gaps (9 total seed
addresses, all now logged) — verified end-to-end: a completely fresh
`regenerator2000` process, given only the current `.jsonl` file, now
reproduces the full, correct 4841-byte coverage with all labels and
comments intact. (One over-correction along the way: blindly
disassembling every *labeled* address — including known data tables like
`hazard_x_table` — misclassified them as code and corrupted their
byte-level display; fixed with `r2000_set_data_type` resets, and *not*
logged, since that step was a mistake to avoid repeating, not a step to
reproduce.) **Lesson for future sessions**: reading a region is not free —
if you explore an area without deliberately committing a `disassemble`
log entry for it, that coverage will not survive a replay.

**Current state summary — investigation conclusion.** Core engine
understanding for Radar Rat Race is now comprehensive, and code coverage
of the loaded snapshot is essentially complete (all "undefined" gaps
between code blocks are confirmed data tables). Fully mapped, end to end:

- **Input, movement and turning**: joystick direction (`zpa_E5`) vs.
  committed direction (`zpa_8F`), with an auto-turn/wall-following
  fallback (`s_E78C`), applied to the rat's world position
  (`zpa_92`/`zpa_93`).
- **The maze/collision data format**: there is no separate maze table —
  the screen RAM character codes *are* the maze, checked directly via
  `read_screen_in_direction`, down to the character code's individual
  bits doubling as radar-preview wall-shape data (`bit_select_table`/
  `f_FCD2`).
- **Collision**, for both the dynamic enemy arrays (`zpf_22`/`zpf_2A`) and
  the static/per-round hazard tables (`hazard_x_table`/`hazard_y_table`),
  unified in `collision_check`.
- **The "eat" mechanic, end to end**: `handle_direction_input_and_collision`
  → `eat_tile_effect` (radar-blip feedback queue, chomp sound gate) →
  `check_meal_eaten` (matches against the 10-slot meal table) →
  `clear_eaten_meal_tile` (erases the tile with `$20`) → **round
  completion** once all 10 meal items are eaten.
- **The round timer and game-speed system**: `round_timer` counts down
  per move and gates play; `move_cycle_interval`/`move_cycle_countdown`
  are the actual speed knob, which the timer's expiry gradually slows
  rather than penalizing directly.
- **The radar**, in all three parts: enemy dots (`radar_draw_enemy`),
  the higher-resolution terrain preview (`s_E3E1`/`redraw_radar_terrain_near_rat`),
  and hazard blips — all sharing one draw routine
  (`radar_relative_position`) and one scratch pointer (`zpp_82`).
- **Score/hi-score, lives, round number**, and the **game-over/reset**
  path (`game_over_reset` → `j_F1FD`), plus the **round-transition**
  sequence (`round_transition_sequence`) that announces each new round.
- **Per-round data flow, fully mapped**: `j_F1FD` maps the round index
  through an indirection table to one of 2 hazard parameter sets, plus 3
  round-index-keyed tables (enemy count, hazard count, harder-variant
  flag) that together implement a "bonus round every 4th round" design.
  Meal-item positions (the win condition) are randomized fresh every
  round instead of templated.

Remaining open items are genuinely minor: the precise in-game
visual/thematic identity of hazard-table obstacles vs. animated enemies,
and the exact algorithm behind `prng_next`. Neither blocks a complete
understanding of how the game works. The strategic lesson validated
repeatedly this session: **static tracing (regen2000) reliably
out-performed live-play verification** — reading a full routine in
context (not a snippet, and not a guess made before reading it) caught
and fixed several real mistakes in the annotation log along the way, and
every major finding this session came from the static approach the user
pointed the project toward.

- Loader analysis: parked at ~32% static coverage, not being pursued
  further per the reframed priority above.
- See "Zero-page / key variable reference" below for the consolidated map
  of everything decoded so far.

## Zero-page / key variable reference

Consolidated from annotations scattered across many routines. Zero-page
addresses use regen2000's `zpa_`/`zpf_`/`zpp_` label prefixes where set;
a few frequently-touched non-ZP addresses are included too since they're
just as central to the engine.

| Address | Label | Meaning |
|---|---|---|
| `$81` | `zpa_81` | Active (animated) enemy count |
| `$82`/`$83` | `zpp_82` | Scratch screen-RAM pointer, heavily reused across unrelated routines (collision check, radar terrain sampler, radar enemy/blip drawing) — same slot, different purpose depending on caller |
| `$84`-`$87`, `$ED`/`$EE`, `$90`/`$91` | — | Scratch screen+color destination pointer pairs, reused per-routine (radar redraw, icon drawing) |
| `$88` | `zpa_88` | Scratch sample offset in the radar terrain sampler |
| `$8A` | `zpa_8A` | Loop counter (radar terrain redraw cell count) |
| `$80` | `move_cycle_interval` | Game speed knob: ticks between each move/collision-processing cycle (default 6, or 4 in a harder per-round variant); increases (slows) after `round_timer` expires |
| `$8D` | `zpa_8D` | Current direction being tested (0-3), also reused as a loop index elsewhere |
| `$8F` | `zpa_8F` | Rat's last-committed direction |
| `$92`/`$93` | `zpa_92`/`zpa_93` | Rat X/Y position |
| `$95`, `$96`, `$97` | `zpa_95`/96/97 | Movement/input state gates (exact semantics per-flag not fully separated) |
| `$9A` | `zpa_9A` | Collision/round-end flag — 0 = no collision, nonzero = hit (enemy or hazard) |
| `$9B` | `move_cycle_countdown` | Counts down from `move_cycle_interval`; reload-to-zero triggers one move/collision cycle |
| `$9C` | `zpa_lives_remaining` | Lives remaining |
| `$9D` | `radar_blip_active_count` | Count-1 of active eat-effect radar blips ($FF = none) |
| `$A4`-`$A6` | — | Scratch index/bound registers in the radar terrain loop |
| `$AA`-`$B3` | `meal_x_table` | 10-slot randomized meal-item X positions this round (the win condition) |
| `$B4`-`$BD` | `meal_y_table` | 10-slot randomized meal-item Y positions |
| `$BE` | `meals_remaining` | Count-1 of meal items left this round (init 9); round completes when this hits 0 with `round_complete_flag` set |
| `$BF` | `round_complete_flag` | Set when the last meal item is eaten; checked alongside `meals_remaining` to advance to the next round |
| `$C2`-`$D1` | `hazard_x_table` | 16-slot per-round hazard X positions (from one of 2 fixed templates, see level-progression tables above) |
| `$D2`-`$E1` | `f_00D2` (`hazard_y_table`) | 16-slot per-round hazard Y positions |
| `$E2` | `zpa_E2` | Tick counter |
| `$E3` | `zpa_E3` | Round-parameter index (selects per-round tuning/tables) |
| `$E4` | `round_timer` | Per-round movement timer/gauge, counts down from 80, one tick per successful move |
| `$E5` | `zpa_E5` | Requested direction (from input) |
| `$E7`/`$E9`/`$EB` | — | Score digit bytes (interleaved BCD) |
| `$EA`/`$E8`/`$EC` | — | Hi-score digit bytes (interleaved BCD) |
| `$0022`/`$002A` | `zpf_22`/`zpf_2A` | Per-enemy X/Y position arrays (animated enemies) |
| `$0052`/`$0061`/`$0070` | `radar_blip_x_queue`/`radar_blip_y_queue`/`radar_blip_timer_queue` | 14-slot rotating queue of recent "eat" events, drawn as fading radar blips |
| `$0201` | `a_0201` | Active hazard count this round (max index into the 16-slot hazard tables) |
| `$0210` | — | Round number |
| `$0216` | `chomp_sound_gate` | Nonzero while the eat/chomp sound effect is playing |
| `$FCD2` | `f_FCD2` | 8-entry bitmask table (not zero page) used by the radar terrain sampler — exact per-bit meaning still open |

## Toward a reusable skill

Not written yet, but the shape is now clear from steps 1-6 above: a skill
that takes a disk/PRG image, drives vice-mcp through boot → trigger
gameplay → find the real vector → snapshot, then drives regenerator2000
against the snapshot for the actual engine analysis, with the
"replay-log-as-persistence" pattern baked in from the start rather than
discovered painfully (as happened here — an earlier annotation session
was lost when the regenerator2000 process was restarted before this logging
pattern existed). Worth drafting once this game's engine analysis is far
enough along to know the pattern generalizes, not before.

[vgrichina/re-skill](https://github.com/vgrichina/re-skill) was raised
earlier as a possible model. Its 7-phase structure is fairly tuned to its
actual targets (NES/GB/DOS), not C64 — loose inspiration at most.

---

## 2026-09-13 — Opus audit: corrections that supersede everything above

This document is the project's **narrative history**, kept for how the
understanding developed (including the wrong turns, which are instructive).
It is **not** the source of truth. Where this file and `facts.md`
or the regenerator2000 annotations disagree, **they win.**

Five claims above are now known to be wrong. They are left in place rather
than silently rewritten, because the pattern of *how* they were wrong is
worth more than a clean document:

1. **`$2A` and `$7F` are WALLS, not "open floor."** (Sections around lines
   482 and 523 say the opposite.) Proof in `s_E78C`: at `$E7A5` the target
   cell is read, and `cmp #$7f / beq` plus `cmp #$2a / beq` *reject* the
   move; `j_E800`, which actually updates `zpa_92/93`, is reached only when
   the byte is neither. The rule is a blacklist — two codes block, everything
   else is passable.
2. **The cast is character graphics, not sprites.** Any statement above
   implying hardware sprites for the rat or cats is wrong. The rat is four
   2x2 font tiles at `$40/$44/$48/$4C`, the cat is `$58`, cheese `$50`,
   sparkles `$54`. Sprite pointers were mis-decoded (x256 instead of x64).
3. **`draw_2x2_icon` does not draw a life icon** (line 282). It spells
   **"EEEK"** — the death squeak. Rendering the glyphs settles it instantly.
4. **There is no `f_FCD2` "sub-cell collision refinement"** (line 342, 484).
   `f_FCD2` is a plain bit-select table used by the radar renderer.
5. **Colour RAM was read from the wrong place** in all rendering work — it
   lives in the VIC-II snapshot module (file offset 70066), not at `$D800`
   in the flat memory image.

### What was missing entirely

- **The background music player.** `Three Blind Mice`, running continuously,
  driven from the top of the interrupt at `$EA2B` — a tempo divider, a
  16-note phrase walked backwards, phrase A three times then phrase B once.
  It sat six bytes ahead of a routine that was already labelled *and*
  commented, so it looked finished.
- **The attract screen.** `'F1' TO RUN` (F1 starts the game) and
  `BONUS RAT FOR 20000 PTS` (a one-shot extra life at 20,000 points, awarded
  in `s_F02A` via the `zpa_99` latch). These are two separate messages.
- **The build identity.** The string table contains `COMMODORE V.02`. Every
  finding in this project is true of that build only — another release shows
  a `SPEED RUN` bonus stage whose text appears nowhere in our image.

### The methodological lesson

Byte coverage is not comprehension. All five errors and both omissions sat
inside regions regenerator2000 reported as fully disassembled. The fix is
`../../scripts/coverage.py`, which scores a byte as *explained* only when the
symbol owning it carries a prose comment — and which reports **8.8%**, not
the ~91% the old disassembly-coverage number implied.

---

## 2026-09-13 — Burn-down to 100%, and what it overturned

Taking the ledger from 78.6% to 100% meant writing a description for every
routine and table, and re-reading every existing comment while doing it. That
second part mattered more than the number. Claims that had survived two audits
fell over as soon as someone had to state precisely what each line did:

- **Cats kill.** The wiki says black cats only delay you, and the notes had
  adopted that. `collision_check` feeds cats and red rats into the same flag, and
  that flag has exactly one consumer: the death sequence. Features.md had even
  asked the right question ("why do both feed `zpa_9A`?") without anyone
  answering it from the code.
- **Stars go behind, not ahead.** `star_screen_update` probes direction
  `player_dir + 2` and `drop_star` offsets by the same reversed direction.
  "Ahead" had been assumed because it sounded like a weapon.
- **TIME is a clock, not a move counter.** The old note said one unit per
  move. The main loop drains it every 70 ticks; stars cost extra.
- **`$0210` counts SPEED RUNs.** It was first a "lives" counter, then a
  "round number". It is printed after "NO." in the SPEED RUN banner. The real
  round number is `zpa_E2`, printed under ROUND — a routine labelled
  "a counter not yet correlated with a visible stat".
- **SPEED RUN was found by decoding the table the intro reads.** The banner
  text at `$FD33` was already known; its reader, the "round transition
  sequence", had been described as a generic round interlude. It only runs
  when `f_FF08` is negative: rounds 3, 7, 11, 15.
- **The sprites are the radar.** "Blobs of unknown use" became radar dots
  once the sprite X/Y formula was worked through: `+$D0`/`+$72` is exactly
  the radar panel's top-left corner in sprite coordinates.
- **The "radar" routines draw the maze view.** `radar_draw_enemy` and
  `radar_relative_position` use the viewport row table at `$FC80`
  (`$047B`…), not the radar's. The name had stuck from the very first guess.
- **Music tempo.** "6.4 s at the PAL frame rate" assumed a 50 Hz interrupt.
  The CIA timer latch is `$411B`: about 59 Hz. The loop is 5.4 s.
- **Tables were read past their end.** Round tables were quoted with 18
  entries; `round_index` wraps at 15. The extra values belonged to the next
  table.
- **The charset window's "colour table" was round data.** Everything from
  `$3C80` up in the charset area is an unread copy of `$FC80`–`$FFFF`, and
  its "45 bytes that are all valid colours" were the red rat and cat counts.

Two ledger bugs surfaced on the way: an emptied comment still counted as
explained, and a commented label typed Jump or Branch was capped at 64 bytes
even when it started a routine. Both fixed in `scripts/coverage.py`.

The live emulator fought back first: the saved snapshot loaded but its CIA
timer never fired, the typed config tool rejected every argument, and memory
reads quietly paused the machine. After a process restart, a fresh autostart
and a held F1 in the keyboard matrix, the static findings were checked live:

- sprite 0 and sprites 1–3 sat exactly on the radar panel with three red rats;
- the attract screen matched the decoded layout cell for cell;
- two separate boots produced byte-identical round-1 cheese and cat tables;
- poking the round counter and "all cheese eaten" rolled into round 3: the
  time bonus paid exactly 79 × 60 = 4,740, and the SPEED RUN had move interval
  4, 16 cats in template order, frozen red rats and a SPEED RUN counter of 2;
- placing the rat on a cat during that SPEED RUN cost a life and ended it.

The persistence problem also went away. regenerator2000's project format
turned out to be plain JSON, so `scripts/export_regen_project.py` writes a
`.regen2000proj` from the live session; a server started from that file alone
reports the same 100%.

# Gradius — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- One load: the file `G2` from the V-Max! version 2 disk, packed twice,
  unpacked to $0801-$FFF9 and started at `start` ($1688). A BASIC line,
  `9 SYS 5768` ($1688), sits at $0801 (`basic_stub`), but nothing runs it.
- The game never reads the disk again: all eight stages are in memory at
  once (`orientation.md`, "Steady state").

## Memory layout

| Thing | Where |
|---|---|
| Screen matrix, sprite pointers | $0400-$07FF (VIC bank 0) |
| Scores of up to five players, ten digits each | $0200 |
| Lives, stage and music setting per player | $0258, $025D, $0267 |
| Game code and enemy routines | $0840-$1FFF, $4000-$7FFF |
| Two unused tunes | $1CA1-$1FF9 |
| Sprite shapes $80-$DF | $2000-$37FF (shape n at n × 64) |
| Character set, fixed lower half ($00-$7F) | $3800-$3BFF (`chars_low`) |
| Character set, upper half ($80-$FF), copied in per stage | $3C00-$3FFF (`load_stage_charset`) |
| The stage's event list, copied in per stage | $8000-$81FF (`load_stage_block`) |
| Stage 6's spheres and tentacles, bullets, the last boss | $8A00-$9DCF |
| Stage data: maps, upper character sets, event lists, row colours | $8200-$89FF, $9DD0-$CDFF, $E000-$FEDB |
| The ending | $CE20-$CFFF |
| High score, checkpoints, split timers | $FC90-$FFF9 |

Per stage (index 0-7 is stages 1-8; `map_starts` $50B4, the stage tables
read by `load_stage_charset` and `load_stage_block`):

| Stage | Characters | Event list | Row colours | Map | Checkpoint map |
|---|---|---|---|---|---|
| 1 | $A680 | $AA80 | $AC80 | $A000 | $A32B |
| 2 | $B600 | $BA00 | $BC00 | $AD00 | $B184 |
| 3 | $C200 | $C620 | $C600 | $BC30 | $BF6D |
| 4 | $C820 | $AA80 | $AC80 | $A000 | $A32B |
| 5 | $8200 | $9DD0 | $E425 | $E000 | $E2A0 |
| 6 | $8600 | $CC20 | $E425 | none (points at $AD00) | none |
| 7 | $FADC | $F8D4 | $FCD1 | $F1FE | $F714 |
| 8 | $EBBE | $EFCE | $EB8C | $E448 | none |

Stage 6's event list never turns the scenery on (no event 1 or 16), so its
map entry is never used and the stage is open space. *Live*: the stage 6
screenshots in `reference/` show no scenery.

Columns each stage scrolls through, from the event that turns the scenery
on (event 16, `start_tune2`, which calls `event_scenery` $50C4) to event
12 (`event_attack`), which sets `boss_mode` and stops the scroll: 381, 363,
275, 381, 270, none, 194 and 271. *Live*: on stage 1 the scroll stopped with
the map pointer at $A5E7, the end of the 381st column.

Stage 7's character set ($FADC-$FEDB) overlaps code and tables, so the
glyphs of its characters there are those bytes.

## Timing

- The raster interrupt (`irq` $7F1C, `irq_chain` $6BA7) runs in four
  phases by `irq_phase`: phase 0 `irq_top`, phase 1 the scroll and
  colours (at $6BE5), phase 2 the stage's own routine through a JSR whose
  address `set_stage_hooks` writes ($6BDF), phase 3 `irq_bar`.
- Two NMIs a frame from CIA 2's timers A and B split the screen
  (`start_split_timers` $FD50, `nmi_split` $0840). Both timers have the
  latch $42C6, so an NMI comes every 17,095 cycles: one frame of an NTSC
  machine (263 lines of 65 cycles). A PAL frame is 19,656 cycles, so on a
  PAL machine the splits come round sooner each frame and wander up the
  screen. *Live*: frame captures on VICE's PAL C64 showed the split writes
  at lines 82 and 242 in one frame and at other lines in the next ones.
- Held fire shoots every 17 frames (`fire_button` $4DAC).

## Controls

- Joystick in port 2. Keyboard: Z left, X right, ; up, / down, RETURN fire
  (`read_keys` $4DED).
- Right SHIFT takes the lit power-up (`take_powerup` $5200); its only
  caller is `read_keys` at $4E35.
- Title: fire or RETURN starts; SPACE held for three passes steps the
  number of players from one to four (`title_keys` $1881).
- Q gives up the game (`quit_key` $6B02).
- M would switch the music on and off (`music_key` $6AB9), but its only
  way in is a lone RTS at $6AA6 (`jmp_music_key`), and even with it the
  tune player has no caller (`music_tick` $6AA9).

## Graphics

- Playfield in multicolour character mode; the power-up bar on row 23 (counting
  from 0) in
  extended colour mode, its letters $00-$1D drawn as $80-$9D (`bar_text`
  $41E6, `irq_bar`).
- Scrolling: one column a character at a time from the map
  (`map_column` $4EA9), a stream of character codes ($7F up) and counts of
  empty rows, 19 rows a column. Stage 4 draws stage 1's map from the
  bottom up (`map_column_up` $54DF), with its own upside-down character
  set, so the volcanoes hang from the ceiling.
- Eight sprites, slot 0 the Vic Viper, through a sprite table at $4074
  that the frame copies to the video chip.
- The last boss is four double-size sprites (shapes $BC-$BF) drawn in dot
  by dot, 25 dots a frame, from the picture at $9C49 (`grow_brain` $9985,
  `add_dot`).

## Mechanics

- Capsules: every seventh one dropped is blue and destroys the enemies on
  screen (`drop_capsule` $5630, `blue_capsule` $5D3D); an ordinary one
  moves the lit box one on (`capsule_power` $5777) and scores 500
  (`collect_capsule` $5712).
- Power-ups (`take_powerup` $5200): SPEEDUP up to 4; MISSILE, a second
  making missiles move every frame; DOUBLE and LASER each take the other
  away; MULTI up to two Options; ? a shield worth four hits.
- An extra life each time the score's hundred-thousands digit ($4004)
  changes (`extra_life` $6B8B). *Live*.
- The Big Core (`boss_phase` $7768): five walls; every sixth shot that
  strikes its middle takes a wall, every eighth laser touch
  (`core_shots` $7829). If its timer runs out the stage is cleared
  without the points.
- Stage 7's boss block takes 40 hits (`target_struck` $6A16). The last
  boss has six layers of 20 hits each (`brain_struck` $9A4B).
- Checkpoints: on a lost life, `death_checkpoint` ($FC90) restarts the
  player from the stage's checkpoint once the stage has scrolled past
  `checkpoint_pos`; stages 6 and 8 have none, and stage 4 uses stage 1's.
- The hatch (`move_hatch` $64FD) takes eight hits; one that reaches the
  left edge scores 1000 points.
- After stage 8 the ending prints "YOU HAVE SAVED THE PEOPLE OF NEMESIS"
  over rolling colour bands for 250 frames (`ending` $CE66), then play
  goes back to stage 1.
- The cheat: `cheat_switch` ($18D0) is an RTS where LDA #$FF belongs.
  With $A9 there, four players and left SHIFT on the title set
  `cheat_mode` ($6ED2) and put a "C" on screen, and the ship survives
  every hit. *Live*.

## Data tables

- Event lists: 512 bytes a stage, copied to $8000. Each event has a
  scroll position (low at +$000, high at +$073), a type (+$0EC) indexing
  the 32 routines at `event_routines_lo`/`_hi` ($72C4/$72E4), a parameter
  (+$15F, usually a colour) and extra bytes (+$1BB). `run_events` ($7307)
  calls each routine through a JSR at $7330 whose address it writes.
- Row colours: 25 bytes a stage, one per screen row.

## Sound

- Sound effects: `play_effect` ($9B71) starts effect A on the next of
  the three voices in turn; nine effects, from capsule collected (0) to
  the extra-life tone (8).
- Music: a two-voice driver with two tunes at $1CA1-$1FF9 that never
  plays. Two links are missing: the play frame calls a lone RTS at $6AA6
  where `JMP music_key` belongs, so M never sets `music_on`; and nothing
  calls `music_tick` ($6AA9), the routine that would step the tune
  (`tune_tick` $1AB5) each frame. The events `start_tune1` and
  `start_tune2` still run `set_tune` as stages start, which only clears
  the SID. *Live*: with $4C written at $6AA6, M toggles `music_on`, which
  silences the sound effects (`play_effect`); the tune still has no caller.
- `tune_tick` adds each voice's register offset (0 or 7) to the low byte
  of its note's frequency ($1B4D), so the second voice plays every note
  slightly sharp.

## The listing's error rate

Sample 1109: 60 comments drawn at random with seed 1109 from the 1,288 in
the listing, checked by a checker on Claude Opus that wrote none of them.
14 had a wrong detail and none was wrong in its main claim: 23 %, with a
95 % interval of 14 % to 35 % (Wilson), a lower bound on the true rate.
The details were: how often a routine runs (the stage routines run on
14 frames in 16, not every frame), counts and ranges off by one (players
0 to 3, a table of 20 rows), the power-up bar's row (23 counting from
0), which ball shapes are used, a caller missed for a second entry, and
what a hit does on the last one. All 14 were corrected, with every other
comment that said the same thing (the stage routines, the bar's row, the
ball's shapes). The listing has not had a full audit.

## Live tests

- Music switch: wrote $4C at $6AA6 in a play snapshot and pressed M;
  `music_on` changed to 1.
- Cheat: wrote $A9 at $18D0, chose four players, held left SHIFT on the
  title; a "C" appeared and the ship flew through enemies unharmed.
- Extra life: in play, the lives went up by one as the score passed
  100,000.
- Split timers: `frame.py capture` on VICE's PAL C64 over three frames put
  the NMI writes at lines 82/242, then 1/161/272, then 80/191/226.
- Screenshots of all eight stages taken on VICE switched to an NTSC C64,
  where the splits land in place (`reference/`).

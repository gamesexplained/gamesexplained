# Winter Games — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is ten parts (`parts/<id>/`), and what is true of one part is in
that part's own `facts.md`. This file holds what spans them: the loader
under all of them, the page they share, how one leads to the next, the
two sound engines, and the clocks. Every address names its part.

## Build

Epyx's original release on two disk sides, PAL, as the C64 Preservation
Project dumped it (`orientation.md` gives the files and their checksums).
Eleven files: a one-block boot, the fast loader (`COPYRIGHT 1985`), the
menu `M`, the title `T`, the opening ceremony `O`, and one file for each
event, `H`, `I` and `S` on side 1 and `J`, `B` and `F` on side 2. Figure
Skating and Free Skating are one file, `F`, entered at two addresses.

## Memory layout

| Thing | Where |
|---|---|
| The boot file, over the BASIC vectors so that the KERNAL's LOAD ends by jumping in | resident `$02A7`-`$030B` (`boot_load_loader`, `$02C4`) |
| The page every part shares: players' records, the event chosen, the number of joysticks, the menu's resume address | resident `$0800`-`$08FF` (`shared_vars`) |
| The loader's three entries | resident `$0900` (back to the menu), `$0903` (load and run file X), `$0934` (save the world records) |
| The loader, its file table and the drive code's commands | resident `$0900`-`$0DFF` (`ldr_files`, `$0CC3`, twelve bytes a file) |
| The world records, read from track 18 sector 13 of side 1 | resident `$0E00`-`$0EFF`, 20 bytes an event |
| The menu | menu `$0F00`-`$3FE5`, left in place under Speed Skating |
| The title, the opening ceremony | title `$3F00`-`$67D0`; opening `$6400`-`$B420` |
| Hot Dog, Biathlon, Figure and Free Skating, Ski Jump, Bobsled | each from `$1000`, over the menu (`ranges` in each `part.json`) |
| Speed Skating | speed-skating `$4C00`-`$ADC8`, with its sound engine's variables after it to `$AEF2` |
| The events' video bank | bank 2, `$8000`-`$BFFF`, through CIA 2 (each event's entry); the title and the opening use bank 1 |

Every part above the resident keeps its own variables in zero page
`$10`-`$8F`, where the loader keeps others between loads (`names` rows in
each `part.json`).

## How the parts lead to each other

- The boot loads `CO*`, the fast loader, which copies itself to `$0900`
  (resident `loader_boot`, `$C000`), clears the shared page, reads the
  world records, and loads the title and then the opening ceremony. For
  those two loads the entry at `$0900` points at `$C0DC`, in the loader's
  first copy; then back at `ldr_restart` (`$0AD0`).
- Every later load goes through `ldr_run_file` (resident `$0ADD`) with the
  file's number in X: 0 the menu, 1 the opening ceremony, 3 the title, 4 to
  10 the seven events in the menu's order. It asks for the other side
  (`ldr_insert_side`, `$0976`) when the file's record names a side that is
  not in the drive, read from byte `$97` of the disk's header sector
  (`ldr_check_side`, `$0958`).
- A part ends by jumping to `$0900`, which reloads the menu when something
  has been loaded over it (`$083D`) and starts it again at the address it
  kept at `$085D`-`$085E` (menu `run_file`, `$1292`).
- RUN/STOP with RESTORE reaches resident `ldr_nmi` (`$0906`) from
  anywhere, clears the resume address and goes back to the main menu
  (*live*).

## The page at `$0800`

| Where | What |
|---|---|
| `$0800 + 32n` | player n's record, eight players: name (`+$00`-`$0A`), country code in brackets (`+$0B`-`$0F`), score as text (`+$10`-`$15`), score as a number the menu sorts by (`+$16`-`$18`), medals (`+$19`-`$1B`), country (`+$1C`); menu `player_offsets`, `$1A36` |
| `$081D` | negative in practice, where every event asks "PLAY AGAIN?" |
| `$081E` | the number of players |
| `$081F` | the event chosen |
| `$083D` | `$FF` when the menu must be loaded again |
| `$085D`-`$085E` | where the menu resumes |
| `$087D` | the number of joysticks, 1 or 2 |
| `$087F` | a switch that would offer nine Summer Games events; nothing sets it (menu `opt_more_events`, `$0FF3`) |

An event that times its players stores the time turned over at `+$16`-`$18`,
so that the menu's one sort, highest first, ranks a shorter time higher
(biathlon `score_record`, bobsled `record_time`).

## Timing

- Every event runs on the raster interrupt, once or several times a
  frame, and its main loop waits on a frame count the interrupt sets.
- Every event's clock counts six frames to a tenth of a second, 60 frames
  a second, an NTSC machine's rate (biathlon `clock_tick`, `$73AC`;
  skating `clock_tick`, `$1DE3`; speed-skating `irq_top`, `$964B`;
  bobsled `clock_tick`, `$4B80`). On this PAL release, at 50 frames a
  second, every clock runs a fifth slow: Figure Skating's minute ran about
  72 seconds of real time (*live*).
- Every sound engine's table of notes puts C at `$430F`, 1046.5 Hz on an
  NTSC machine; on a PAL one every note is two-thirds of a semitone flat
  (`note_freqs` in each event; the menu's and the opening's tables
  likewise).

## Controls

- The joystick in port 2; with two joysticks, odd-numbered players use
  port 2 and the others port 1 (`read_stick` in each event, from `$087D`).
- `S` with joystick 2 held down switches an event's sounds off, and on
  again (`sound_step`, `snd_s_key` in hot-dog, biathlon, ski-jump,
  skating and bobsled). Each event writes 0 to `$DC02`, so CIA 1's port A
  drives no keyboard column and the key is seen only while the joystick
  pulls the same line low (*live* in Hot Dog). `S` alone does nothing.
- On the flag chooser, `S` plays the anthem of the flag in the frame
  (menu `entry_fire`, `$3EBA`).

## Sound

Two engines.

- **The menu and the opening ceremony** play tunes with a player of three
  voices that steps twice a frame, four bytes a note: three pitches and a
  length (menu `music_step`). The menu holds the 18 anthems, the final
  standings' tune and the world records' tune (menu `tunes`, `$3280`).
- **The events** carry a sound engine of six 32-byte slots, each playing a
  script on one SID voice: notes, and 29 commands for loops, calls,
  envelopes, the filter and machine code (`snd_commands` in each event).
  `start_sound` takes a sound's number in A, `sound_step` runs once a
  frame. Hot Dog, Biathlon, Ski Jump, Skating and Bobsled share it;
  Bobsled's start-up copies its engine from `$9D00` to `$C000`, where it
  runs (bobsled `copy_engine`, `$1062`). Speed Skating carries an older
  form with three slots, no `S` key and no pulse-width sweep
  (speed-skating `snd_jumps`, `$A600`).

## The listing's error rate

A sample of 60 comments, drawn with seed 20261030 from the 2,696 in the
ten listings and spread over every part, was checked by a fresh agent on
`claude-opus-5-5` that wrote none of them. It marked 55 right and 5 with a
wrong detail, and each of the five holds against the code: 5 of 60, 8.3 %
(95 % interval 2.8 % to 18.4 %), over the mark of 2, and a lower bound on
the true rate. The five were: the resident's `loader_sid` (`$C0EB`), where
`loader_boot` writes 29 bytes, not 25; the menu's `show_next_event`
(`$126F`), whose wait is up to 415 frames, the 15 of `wait_released` first;
the menu's `choose_option` (`$1A6B`), which repeats every 25 frames, not 24,
since its count runs down past 0; Speed Skating's record (`$A350`), where
the tenths and minutes are EORed and masked to four bits, not only EORed;
and Bobsled's `bs_ptr2` (`$0016`), whose list of uses left out two. All
five were corrected, with the comments that held the same two beliefs:
the menu's `check_record` (`$1865`), which waits through `wait_released`
too, and Speed Skating's `ready_set_go` (`$A18C`), whose waits are 61
frames, not 60. Bobsled's listing also carried fifteen of the loader's
comments at addresses that are Bobsled's own (`$0023` and `$C000`-`$C54A`);
they were removed, and `$0023` named for what it is.

## Live tests

Each was run in VICE through vice-mcp v3.14.0, from a part's snapshot in
its `work/` folder, with input on joystick 2; the scripts stay in `work/`.

- RUN/STOP with RESTORE from an event: the menu reloads, asking for side 1
  when side 2 is in.
- Hot Dog: `S` alone changes nothing; `S` with joystick 2 down sets
  `snd_s_key` to 0 and every slot idle, and again sets it to 1.
- Figure Skating: stick down with fire, 22 falls and nothing else; the
  program ran about 72 seconds and every judge gave 6.0. With 40 falls,
  every judge gave 0.0.
- Ski Jump: fire held from the start took off on the lip; with the lean
  kept centred, 68.6 metres, 205.9 distance points, 20.0 style points,
  225.9 in all.
- Bobsled: `$878A` took random values from 1 to 8 during a run; a crash
  left `$C0C8` at `$8F` until the run's end; a crash forced at stretch
  166 at speed `$27` slid over the line and recorded " 02.99"; a crash
  earlier on recorded " 99.99".

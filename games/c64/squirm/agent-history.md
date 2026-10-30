# Squirm — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 October 2026: setup and orientation

- The contributor (Aaron) asked for a Silver run and said the image could come
  from archive.org. Two copies were found there: the Ultimate Tape Archive's
  TAP of the original cassette and a D64 transfer in the software library.
  The TAP is the original and uses the KERNAL's own tape format, so it was
  taken; the D64's one file matched it but for the rotating character
  shapes, which showed it was saved from a running game.
- `cargo install --root tools/cargo regenerator2000 --version 0.9.20`, as
  `kit/c64/INSTALL.md` gave it, failed to compile: cargo resolved the
  dependency `regenerator2000-tui` to 0.9.21, whose `CoreError` type no
  longer matched the 0.9.20 binary's `anyhow::Error` (`E0308` at
  `src/main.rs:838`). Adding `--locked` built it from the crate's own lock
  file, in about six minutes.
- The release zip of vice-mcp v3.14.0 lacked six libraries in this
  container; the nine packages INSTALL.md lists were unpacked into
  `tools/vice-libs`, and `check-emulator` passed 57 of 57.
- The tape loaded in about a minute of warp. The game is one BASIC file,
  `10 SYS 15133`, with the KERNAL kept in and its interrupt hooked through
  `$0314`. Between the stub and the game's data sits most of the BASIC
  program of an assembler ("CBM 64 ASSEMBLER", Derek Bush and Peter
  Holmes, 1983), and its array variables survive between the game's
  variables: the file is a save of whatever memory held when the game was
  finished.
- A code map over the start-up, title, two levels, a death, the pause, a
  bonus run, game over and name entry ran nothing outside what the
  disassembler traced from `$3B1D` and `$3CB3`. The first map missed the
  start-up because `codemap.py zap` runs a stopped machine for its command,
  and the hand-over snapshot's start-up ran in that moment; loading the
  snapshot again after the zap recorded it.

## 30 October 2026: annotation, verify and the minisite

- The annotation was done by one agent, in files of `$ADDR name : comment`
  lines applied with `r2000.py --apply` (`work/ann/`). The game is small
  (about 15 KB, one load), so there was no split. Most of the file is data:
  the screens and mazes are stored whole, as screen codes, and the
  leftover BASIC program and its arrays take about 2.5 KB. The leftover
  BASIC was detokenised from its line chain, which starts at `$084C`
  (line 15), not from `$0801`, whose stub links straight to the program's
  end.
- The death's sound was the surprise. `DEC $D401` reads a register the
  SID cannot give back, so the value depends on how long the chip holds
  its data bus. A checkpoint after each `DEC` read `$13` then `$FF` on a
  6581 and `$13` down to `$09` on an 8580, the snapshot's own chip. The
  wait between two steps (three jiffies) is longer than VICE's 6581 holds
  the bus and shorter than its 8580 does, which explains both.
- The sample of 60 comments (seed 20261030) went to one fresh checker. It
  marked six wrong in a detail and none in the main claim, and reading
  each against the code confirmed all six (`facts.md`, "The listing's error rate"). Each was corrected
  with every comment that said the same (`work/ann/07-sample1-fixes.txt`).
- The pages run the game's own code from `listing.json` on the kit's
  6502 (`sqMachine`, in all three pages). The first frame drawn from it
  differed from VICE's in 68 pixels: the interrupt rotates six character
  shapes every seventh call, and the page had run a different number of
  calls. A new game and then 95 interrupts matched VICE's frame captured
  at the first `$3C56` with fire held, every pixel; `test_frame.js` keeps
  it.
- The sound players drive the game's own sound code a jiffy at a time.
  `test_sound.js` runs the same code as the game runs it, with the
  interrupt every 16,422 cycles, and compares every write to the SID. It
  found the driver silencing the high-score climb on every jiffy and
  writing a bonus note before its gate, and both were fixed. The first
  version of the test hung: the 6502 starts with interrupts masked
  (`cpu.i` = 1), so the game's wait for an interrupt never ended.
- The first draft of the bonus tune said 152 notes and 48 silent steps. A
  count of the table gave 151 notes and 49 silent steps, and the pages,
  `facts.md` and the bar chart were corrected. The draft of the
  `$2441` quirk called the bytes LDX; they are the BNE's offset and an
  RTS, which the CPU reads as SBC `$60`,X.
- The death widget showed no life wiped at first: the death routine wipes
  the icon the lives count names, the collision lowers the count before
  it runs, and the widget had skipped that step.
- 48 blocks carried a line comment and an automatic name, which made the
  Source tab's index read `b_3A8F` and the like. They were named in a
  last pass (`work/ann/09-names.txt`), after the pages were written; no
  page uses the old names.

## The Play tab (30 October 2026)

- The port, `reference/sq-port.js`, is one function for each routine of
  the listing, on the game's memory. Both of the game's interrupt
  handlers end in the KERNAL's at `$EA31`, which the kit's machine has no
  ROM for, so the port and the test's machine share a stand-in,
  `SquirmPort.kernal`: the jiffy clock, the STOP row, the keyboard scan
  for `$C5` and `$CB`, port A left at `$7F` and `$DC0D` read. It was run
  beside kernal-901227-03, VICE's file, in the kit's simulator (scratch
  only, never committed) over 1,675 interrupts with keys and the stick
  varied: no difference in `$A0`-`$A2`, `$C5`, `$CB` or `$91`. The first
  version gave 56 for F1 with the stick held up where the ROM gives 64:
  the scan reads a ninth time with no row selected, where the stick's up
  line reads as key 64. The cycles the ROM's handler takes, 161 to 168
  with no key and about 1,530 plus 21 a held place of the matrix with
  keys, came from the same runs.
- The lockstep (`test_play.js`) found one fault in the port, in the bonus
  run with the step delay at `$7F`: the game's first read of `$A2` came
  through `irqByte` as `$80`, an interrupt having come between the store
  and the read, but the port's next poll came before the game had made
  that read, and saw `$7F` in its own memory, so the port left the wait
  and the game did not. A poll that sees the stored value again now reads
  as the first read did (`jiffies` in the port). The step delay at `$7F`
  is not a value play reaches (it would take 133 cycles of four levels after the first),
  so the sessions force `$FF`, `$FD`, `$02`, `$00` and `$FA` instead.
- The page's costs: a base for each stretch between checkpoints and a
  cost for each call of 17 routines, fitted non-negative to 105,030
  stretches, two cycles out on average. The cycles the game spends in its
  polling loops are measured with hooks on the loops and left out, since
  the page runs each wait to the interrupt that ends it. A first version
  took a line a poll off instead, which the lockstep's extra polls (the
  port polling on while the game waits at the next checkpoint) made
  wrong by tens of thousands of cycles on the screens after a game. The
  game's start, from the hand-over to the title's first wait, is measured
  on its own. The page then reached play at the same frame as the C64
  (103.3) and kept its pace to within 0.03 %, waiting or not.

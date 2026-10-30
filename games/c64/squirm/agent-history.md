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

# Thrust — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17-18 October 2026: Bronze run (claude-opus-5-5, macOS arm64)

Tools installed in the session: vice-mcp v3.13.2 macOS arm64 GUI
release, 57 of 57 in `check-emulator`, the same as the recorded row for
that build; Rust inside `tools/` and regenerator2000 0.9.20 from
crates.io, which compiled without trouble.

The image is TCI's crack. The first boot script armed an execute
checkpoint on `$037E` (the title picture's wait for fire) straight after
`autostart()`, and it never fired in 90 seconds, though the machine got
there: the autostart's reset seems to clear a checkpoint armed before it
takes effect. Armed again once the machine was in the first depacker, it
fired. The two depackers share the address `$0822` and the stub page at
`$0100`, but are different programs, so stopping at `$0822` the second
time showed new code.

The game came up in attract mode with no title screen, and the screen at
first looked like play (lives 2, fuel 1000), until a screenshot showed the
ship towing the pod by itself. Space starts a game. The title is the
loading picture, which C64-Wiki's screenshot shows without "TCI".

C64-Wiki gives the controls. A first test of F5 (held 5 frames) did not
pause, and was recorded as open; the key search then found `pause_keys`
at `$975F`, which runs on only about two passes in three, and 10 frames
of F5 paused the game.

The string sweep found the BBC Micro key page at `$B9DD`, which starts
with VDU 22,7 and carries teletext codes. A first comment on
`key_pressed` called `$63` the demo flag; sampling `$63` through attract
mode from `entry.vsf` read 0 throughout, so the comment and the page
were corrected to say only what the code does.

The census showed that every SID write goes through the `$D500` mirror,
and that the start-up code which sets the video bank and the interrupts
was missing from it: it is copied to `$0400` and run there, and lies
undecoded at `$B773`. A byte search for the store instructions found it.

The code map (one session: 150 seconds of random keys, then two minutes
idle through game over and the high score table) recorded 9,796 bytes of
code in 95 runs. Seeding the disassembler from each run's start left 33
executed bytes untyped, at `$84D7` and `$AC8B`, until each was decoded
on its own; `check_listing.py` caught it.

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

## Typed data no label reached (22 October 2026)

The ledger began counting typed data that no label reaches, and the
listing lacked the 64 bytes of message text at `$9516`, already
described (#486). The listing was built again from a capture of the
Internet Archive's TCI copy, with the old listing's bytes written back,
and now holds them. The rebuild also named the RAM under the I/O,
4,096 bytes of data the ledger did not count: it is TCI's loading
picture, whose code at `$D000` copies itself to `$0340` and then copies
colours from `$D800`-`$DBFF` into colour RAM, and it is the same at the
hand-over and in play. The only stores to `$01` in `$0800`-`$CFFF` are
the depacker's at `$0844` and one at `$BEA0` that keeps the I/O and the
KERNAL in. The RAM under the I/O is now excluded in
`game.json` with that reason. Coverage reads 15.7 %, as the ledger has counted it
since #455.

## 8 November 2026: Silver run (claude-opus-5-5, macOS arm64)

Started from an updated `main` on a new branch, `game/c64/thrust-silver`,
since the Bronze branch had been merged. The emulator was updated to the
v3.14.0 release (57 of 57). `listing.py` on the old `play.vsf` gave the
same records as the committed listing; only the snapshot's hash and the
newer `uncounted` field changed.

Reading the program from 15.7 % to 100 % took one pass through a compact
listing of `$8280`-`$BFFF` and four rounds of annotation files. Two
mistakes were caught on the way: a byte typing of `$B4BC`-`$B512` covered
`demo_controls` (`check_listing.py` failed on the code the code map had
seen run, and the range was typed code again), and decoding the unused
BBC key-page printer traced the RAM under the KERNAL at `$FFD2` as code
(set back to data).

The Bronze run's "attract mode at boot" was a game in progress: the
start-up code jumps to `$AF82`, which starts a game, and the demo flag
`$63` is set only by the title after that game ends. Running
`entry.vsf` with no input for two minutes showed it.

`$3000`-`$3FFF` turned out to be the relocator's leftover source, and the
per-frame `JSR $3000` lands on its first byte, an RTS. With no store to
the SID at `$D400` anywhere in memory, this copy has no music.

A first statement that thrust costs a unit of fuel a pass contradicted
the Bronze measurement (5 units in 25 frames). `ship_physics` returns at
once except on 6 passes in 16, and the comment and `facts.md` were
written again with that.

The sample of 60 comments, checked on claude-fable-5-1, found 10 wrong;
all ten held against the code and were corrected, with every comment
that said the same. The pages were checked in a headless Chrome after
Node and Playwright were put in `tools/` with the contributor's yes.

# Fire Trap — orientation

How to get from the contributor's own copy to the analysed state.

## The image

The contributor supplied two disk images of the same Triad crack:
`Fire Trap [Triad].d64` and `Fire Trap [Triad+TIH].d64`. Both are 174,848-byte
standard D64 images, disk name `WWW.C64HQ.COM`, holding one program file
`FIRETRAP++/TRIAD` that loads at `$0801` (128 blocks, 32,284 bytes on the
plain image; 152 blocks on the TIH image). The two images differ in 38,170
bytes: the TIH one carries a different file. The plain Triad image,
kept in `work/triad.d64`, is the one analysed. It is a crack, not the
original disk: a Triad intro, a two-option trainer menu, and a packed copy of
the game. The original game is by Source Software House for Electric Dreams
(1987).

The emulator check on this machine: `check-emulator` passed 57 of 57 on
the v3.14.0 Linux release; none of the server's quirks that `kit/c64/vice.py`
absorbs applies except `read-64k`, `key-lowercase`, `snapshot-path`,
`reset-paused`, `monitor-run-leaves` and `monitor-paused`.

## From power-on to play

1. Attach `work/triad.d64` and autostart the file by name
   (`autostart(rpc, path, "FIRETRAP++/TRIAD")` in `kit/c64/vice.py`; the
   position-1 entry on this disk is a separator, not the program).
2. The Triad intro runs for about 30 seconds. Press SPACE (hold it for a
   second and a half) to reach the trainer menu.
3. The trainer shows INFINITE LIVES and INFINITE TIME both ON. Press `1` and
   `2` (each held for two seconds; shorter presses are missed) to turn both
   OFF, then RETURN. The choice for this run is both options off, so the game
   is the plain game with no cheats.
4. The trainer patches the game for the options still on, then jumps to
   `$0816`, which depacks the game (below) and ends with `JMP $0900`. A
   stopping execute checkpoint on `$0900` is the hand-over: `work/entry.vsf`.
5. The game starts on a loop of attract screens: the Electric Dreams logo
   ("PRESENTS"), the credits, the high-score table, and a demonstration of
   stage 1. Pressing a key or fire during it starts a stage. The snapshot
   `work/play-stage1.vsf` was taken in stage 1 during play, with the
   trainer off, after about 50 points had been scored.

## Steady state

- The game runs with `$01` = `$35` (RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`,
  I/O visible); during the hand-over it was `$37`.
- The hardware interrupt vector at `$FFFE` points to the game's handler at
  `$2936` and the NMI vector at `$FFFA` to `$2927`; the KERNAL's `$0314` vector
  is untouched (`$EA31`) because the KERNAL is banked out.
- The game occupies nearly all of RAM: code and data are dense from `$1000` to
  `$FFFF` (apart from `$D000`-`$DFFF`, which is I/O). `$0900`-`$0FBF` holds
  `$EA`-filled working RAM and `$0900`-`$092B` is the hand-over code itself.
- The game is one load, with no overlays and nothing read from the disk during
  play. It is not a game of several parts.

## The loader, in a paragraph

The program is a BASIC stub (`SYS 2070`) that starts Triad's intro, which
shows its logo and scroller and a trainer menu at `$C900`-`$C9DE`. After
RETURN the trainer pokes the chosen cheat bytes into the game and jumps back
to `$0816`. That code copies a 124-byte unpacker to `$008F` and runs it: it
reads a run-length-compressed image downward from `$C7F6` and `$FEFA`
and writes it back over the whole of RAM, then sets `$01` = `$37`, clears the
interrupt mask and jumps to `$0900`. `$0900` zeroes `$0200`-`$02A7` and
`$0300`-`$033B`, sets the video chip and jumps to the game proper at `$1000`.

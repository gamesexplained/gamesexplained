# Wizball — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Wizball.d64` (174,848 bytes, SHA-256 `118d12e3f880a6bc013c332571b2cb9663021c4e4c981d2322f9d950f17cbfab`),
the only file in `wizball.zip` as served by c64.com's download for game
237 on 24 September 2026. Disk name `WWW.C64HQ.COM`, ID `00 2A`. It holds
three cracked one-file versions, separated by empty `DEL` entries:

| File | Blocks | Loads | Length | What it is |
|---|---|---|---|---|
| `WIZBALL+11&C/REM` | 195 | `$0801` | 49,303 | Remember, release 78, December 1997, cracked by Jack Alien from the tape: intro, typed manual, the tape's loading picture, an 11-option trainer, and three bugs it says it fixed |
| `WIZBALL    /YETI` | 183 | `$0801` | 46,309 | Yeti: a cracktro, then the game |
| `WIZBALL/IMPACT` | 188 | `$0801` | 47,666 | Impact: a one-line scroller intro, then the game |

**The analysed version is Yeti's.** Every address in this folder is from it.
Impact's crack, taken to the same title screen, differs from Yeti's in 787
bytes from `$0200` up. 657 of those bytes also change in Yeti's own memory
between its title screen and play, so they are the game's working state.
Of the other 130, 111 lie in `$FD12`-`$FFF9`, which is still zero in Yeti's
memory in play (the game has not written it by then) and holds leftovers in
Impact's; the last 19 are title-screen state at `$0432`, `$043B` and
`$4696`-`$4715`, and the operand at `$49A7`-`$49A8` that the code at `$499B`
and `$49A1` rewrites. So two crackers working independently left every byte
the game does not change identical, which is the evidence that it is the
original. Remember's version differs across all of `$6000`-`$BFFF` and is
not used; its release notes name three bugs in the original that it fixed
("matrix in level 5", shields still active after quitting and restarting,
the wrong sprite on the spray icon), which `features.md` carries as claims
to check against Yeti's code.

## From power-on to play

1. Attach `Wizball.d64` and autostart `WIZBALL    /YETI` (four spaces). The
   emulator types `LOAD"WIZBALL    /YETI",8,1` and `RUN`, and turns warp
   on; turn it off (`WarpMode` 0) once the cracktro shows.
2. About 30 seconds in warp after the load starts, Yeti's cracktro appears:
   a big YETI logo, colour bars, "YETI FACTORIES PROUDLY PRESENT WIZBALL"
   and a scroller. Press SPACE (`vice_keyboard_matrix`, held half a
   second). The screen fills with garbage for two or three seconds while
   the game is unpacked, then the game's title and high-score screen
   appears ("WIZBALL", "TOP SCORES", "1. 050000 sensi soft").
3. Press fire on joystick port 2 (held 0.4 s). A "get ready!" screen with
   circling rings appears and waits. Press fire again (held 0.5 s): play
   starts on level 1 with the Wizball materialising over a grey landscape.
4. Snapshots in `work/`, each saved without ROMs:
   - `play-start.vsf`: the first pass of the frame loop after that second
     fire press. A stopping checkpoint on `$640E` was armed as the button
     went up; the machine is stopped there, lives 2, score 0.
   - `play-level1.vsf`: the same loop top a life later (lives 1), stopped.
   - `yeti-title.vsf`: the title screen, saved while running (step 2).
   - `impact-title.vsf`, `remember-title.vsf`: the other two cracks at
     their title screens, for the comparison above. Remember's was reached
     by answering N or RETURN to every trainer question.

The disassembler is started on `play-start.vsf`.

## Steady state

Measured in play on `play-start.vsf`, one player, level 1.

- **Banking.** `$01` = `$35`: RAM at `$A000` and `$E000`, I/O at `$D000`.
  The KERNAL and BASIC are never called; the game owns the hardware vectors
  in the RAM at `$FFFA`-`$FFFF`: NMI `$7C61`, reset `$0000`, IRQ `$7C73`.
  `$0314`-`$0319` hold zeros.
- **The IRQ** (`$7C73`) is a raster interrupt, about 12 a frame (1,195 in
  100 frames). Each one takes the next entry of a display list through
  `($68),Y` with the index at `$B1CD`: two bytes are written into the
  operand of the `JSR` at `$7C9D` (that is why `$7C9E` differs between
  cracks), the third sets the next raster line. So each band of the screen
  runs its own routine.
- **The NMI** (`$7C61`) is CIA 2's timer, once a frame (99 in 100 frames):
  it acknowledges CIA 2 and writes 0 to `$85`.
- **The frame loop** is `$640E`-`$6465`, inside the routine at `$63E0`:
  one pass per frame (99 passes in 100 frames, PAL). It waits in `$681D`
  for the raster to be between lines `$46` and `$C6`. It ends when `$B1CF`
  is non-zero and `$B1D0` is 1.
- **The outer cycle** is `$639B`-`$63C7`, `JMP $639B` at its end: title
  and high-score screen (`$6893`), the play routine (`$63E0`), and what
  follows it.
- **Video.** CIA 2 port A reads `$94` in play: VIC bank 3, `$C000`-`$FFFF`.
  `$D018` is rewritten by the raster bands, so a single read of it means
  nothing (`c64-reference`).
- **Nothing is reloaded.** The whole game is one file, unpacked once into
  all of memory; the disk is not read again. Remember's notes say the same
  ("game uses whole memory after it's started").

Emulator: `own build of github.com/barryw/vice-mcp, release v3.13.1, commit fdc435caee`
(Linux x86_64, GTK3, from source, under Xvfb). `check-emulator` on it, four
runs on 24 September 2026: 53, 54, 54 and 56 of 56. The failures were
`determinism-running-save` and `determinism-restart` (three runs each) and
`step-instruction` (one run); the same release as downloaded (the
`v3.13.1-linux-x86_64-gui.zip`) failed the same three, intermittently. So
snapshots here are saved from a stopped machine, and runs are compared by
what the game wrote rather than by the machine at a stop.

## The loader, in a paragraph

Yeti's file is a BASIC line that lists as an empty line 1001 and hides a
`SYS 2066` behind an early end-of-line byte; the machine code at `$0812`
unpacks Yeti's cracktro, which runs under the KERNAL's interrupt until
SPACE. Then a depacker running in `$0100`-`$03FF` unpacks the game over the
whole of memory and jumps to the game's entry at `$6389`, which switches
`$01` to `$35` and jumps to its own initialisation at `$EC00`. That
initialisation addresses the CIA registers through offsets
(`STA $DC8E,X` with X = `$7F` is `$DD0D`), sets up CIA 2's timer for the
NMI and the hardware vectors, clears pages 1 to 3 and continues through
`JMP ($EC91)`. The cracktro and depacker are not annotated, by policy; the
initialisation is the game's own and is.

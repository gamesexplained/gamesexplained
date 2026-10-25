## next · 2026-10-25 · Pool of Radiance (C64) · air with Claude

- **Count a game's interrupts before writing its rate.** The game keeps
  the KERNAL's interrupt, from CIA 1's timer A, and the KERNAL sets its
  latch to `$4025` on a PAL machine and `$4295` on NTSC (ROM code at
  `$FDDD`), 60 interrupts a second on both. Ten comments in the listing
  said a raster interrupt at 50 a second, a belief from the PAL frame
  rate that nothing in the code supported. In VICE x64sc (release
  v3.13.2) on 25 October 2026, checkpoints that do not stop on the
  handler (`$3BEA`) and on the KERNAL's `$EA31` were hit 300 times each
  in 250 PAL frames, and the title tune's player 300 times. Castle
  Master's timer A holds the same `$4025`, also 60 a second on PAL.
- **The banks for `$30`, `$31` and `$32`.** The game writes `$30` to
  `$01` to see RAM under everything. With the machine stopped in play,
  `$01` set in turn to `$37`, `$34`, `$33`, `$32`, `$31` and `$30`, the
  processor saw, at `$A000`, `$D000` and `$E000`: for `$32` RAM, the
  character ROM and the KERNAL; for `$31` RAM, the character ROM and
  RAM; for `$30` RAM at all three, as for `$34`.

## 0.0.262 · 2026-10-26 · Into the Eagle's Nest (C64) · Vai with Claude

- **An inverted character set read as a text dump looks like no letters
  at all.** The status panel plainly says KEYS, AMMO and HITS, and the
  cells behind those words index a character set that, printed as 8×8
  cells of `#` and `.`, holds nothing but blocks of dither. An hour went
  into doubting the screen address, the video bank and the snapshot's
  alignment, and into a pixel-perfect redraw of the frame that proved all
  three right. The letters are stored as holes in a solid cell, so the
  text dump drew the field and left the letter as the gap. Rendering the
  set to a PNG and looking at it settled it in one pass. Where a screen
  shows text its character set seems not to have, the set is inverted
  until a picture says otherwise.
- **A port can agree for seventeen hundred calls and still be wrong.**
  The music driver, ported for the page, matched the game's own code
  write for write for 1,802 calls and then drifted by exactly one tick,
  and stayed a tick out from there. The game's end-of-tune routine does
  not return: it resets the counters and jumps back to the top of the
  same call, so the repeat's first notes are played in the call that
  found the end mark, where the port played them in the next one. Only a
  test that ran past the end of the tune could find it. A port of a
  looping driver is tested over more than one time round the loop.
- **A port read off the code by hand is worth less than the code.** Nine
  sound effects were ported by reading each one's set-up out of the
  listing. The test against the game disagreed on almost every frame: the
  writes were in the wrong order and some were missing. Running the
  game's own two routines on the kit's 6502, with the page handing them
  the pieces of memory they read, matched exactly and took a tenth of the
  work. The test is then worth keeping, because what it checks is what
  the page adds: the memory handed over and the entry points called.
- **A correction is a new reading, and can be as wrong as the comment.**
  The sample found a range of tile codes described as soldiers. They are
  the chests, and the correction, written from the one routine that opens
  a chest, put on the page a one-in-eight chance that shooting a chest
  ends the game. The contributor questioned it, having never been blown
  up. Reading the routines on either side, and putting each kind of open
  chest in front of the player in the game, showed that a shot only opens
  a chest, that the jewels are collected by walking into them and wasted
  by a second shot, and that only a shot at explosives already showing
  ends the game. A correction reads everything that touches what it
  describes, and is seen in the game before a page repeats it.
- **The tape is the load map.** The load map was made by comparing the
  hand-over with a power-on snapshot, which cannot see a byte loaded with
  the value RAM already held, nor a block loaded into a chip. Decoding the
  tape image by the loader's own rules, a page of Python, gave every block
  with its address, length and flag, all sixteen checksums good and
  49,728 of 49,729 bytes as the snapshot has them. Five of the blocks are
  one byte each, written into the video chip and CIA 2, and they showed
  that the 1,000 bytes at `$8C00`, which no instruction reads and which
  had been described as spare tiles, are the title picture's screen
  colours.
- **A page that draws its own tiles must draw them in the chip's mode.**
  The page's tile drawing put every cell in multicolour. The game mixes
  the modes cell by cell, walls hires and floors multicolour, and the
  contributor saw at once that the walls and the panel's letters were
  wrong. Comparing the widget's drawing of one room with the recorded
  frame, which the site's renderer had drawn right all along, would have
  caught it.
- **An emulator with its sound off makes a game's dice wrong.** The game
  fills a table of 256 random numbers by reading voice 3's noise at
  `$D41B` every 14 cycles. The run's VICE had `Sound=0` in its `vicerc`,
  as `kit/c64/INSTALL.md` suggested for speed, and with sound off VICE
  answers `$D41B` with the low byte of its cycle counter: the table in
  every snapshot was a ramp falling by 14 a byte. On that ramp a chest
  never opens on explosives, which the page's chest widget showed and the
  contributor questioned. Run again with the chip clocked (sound to the
  `fs` device and `/dev/null`), the same loop gave noise, and over ten
  tables and 2,560 starting points a shot at a closed chest showed 1,935
  empty, 381 jewels and 244 explosives on 27 October 2026. The code reads
  as an even split, one in eight each, because it splits the second
  number at `$80`; the measured odds are about one in seven and one in
  ten, because the noise steps about once every 16 cycles and two bytes
  read 14 cycles apart are alike. Snapshots saved with sound off would
  not restore the SID with sound on ("Cannot initialize SID engine",
  VICE v3.13.2), so the measurement ran the game's loop on a freshly
  reset machine.
- **A cost per state ran the Play tab at the pace of the sessions it
  was measured on.** The play interrupt's cycles were measured per state
  (its band and its phase of three) while an explorer walked the castle,
  and the page, driven by a random stick, then played 5.6 % fewer passes
  of the main loop a frame than the game with medians and 7.9 % fewer
  with averages. The handler's work follows the play: in one state its
  cycles ran from about 2,900 to 9,300, by the guards near enough to step
  and the shots in the air. Counting the port's routine calls inside each
  handler and fitting a base per state and a cost per routine, none below
  zero, to 6,809 interrupts brought it to 1.8 %, on input the fit had not
  seen. The main loop there only waits for the interrupt, so the play
  itself kept the C64's time throughout; the passes showed the error.
- **The page's clock charges a stretch after the port has run it.** The
  page reached play 28 frames early. The mission start builds the floor
  (568,000 cycles, about 29 frames) and then installs the wipe interrupt,
  in one stretch, so on the page the wipe ran through the build and was
  shut when the game's had barely begun. A checkpoint at the `JSR` that
  installs it put the page 2 frames from the game. The same run found a
  delay's first checkpoint charging only the delay's own cycles: the
  22,399 cycles of the briefing's drawing before it were never charged.

# The title — verified technical facts

Side A's `MENU` (`$2300-$9DFF`), which the boot's fast loader loads and
starts at `$2AED`: THALAMUS PRESENTS, the Creatures title screen, and the
load of `GAME`. A whole-memory program of its own; every address here is
its own. Unless marked *live*, a fact comes from the code in
`work/play.vsf`, taken at `$C000` after fire, and `work/entry.vsf`, taken
at `$2AED`.

## Set-up

- `intro_start` (`$2AED`) moves the music player (`$2300-$2AFF`) to
  `$0400`, the engine's driver assembled `$CC` higher, copies the fast
  loader from `$2C00` to `$C000`, and patches the title: its fire exit
  becomes `load_game` (`$2BB5`) and its tune the one at `$3800`
  (`title_tune`). `intro_setup` (`$2B01`) initialises the drive with "I",
  points the VIC at bank 1 and jumps to `title_entry` (`$9000`).
- RESTORE does nothing: the NMI vector points at `title_nmi` (`$9003`),
  an RTI.

## THALAMUS PRESENTS

`title_start` (`$90DB`). The background fades up from black; the
Thalamus logo, a head in multicolour characters (`logo_chars`, `$5000`),
is drawn into the live character set at `$4800` a few bits at a time,
nine sweeps through 2,304 steps, each ORing the logo's bits under one of
eight masks (`logo_dissolve`, `$934F`). Eight sprites from eleven
letters (`sprite_letters`, `$5800`) spell THALAMUS across the top and,
reused below a raster split at line `$CA`, PRESENTS. Each word fades in;
after 176 frames THALAMUS fades out and PRESENTS after it; the logo is
taken away by the same steps, ANDing where they ORed (`logo_wipe`,
`$9425`), and the background fades to black.

## The title screen

- `title_2_start` (`$9495`). The Creatures logo is a multicolour bitmap
  at `$6000`, six character rows. For 196 frames `logo_drop_raster`
  (`$9518`) writes `$D011` on each of a number of lines so that the VIC
  never starts a text row, pushing the logo down by that many lines
  (flexible line distance): the counts (`logo_drop_lines`, `$99B0`) go
  from 255 down to 1, up to 249 and down to 1, so the logo rises from the
  bottom, sinks back and rises again.
- The credits, PROGRAMMED BY JOHN ROWLANDS and GRAPHICS & MUSIC BY STEVE
  ROWLANDS, are letters cut out of solid blocks (`credits_font`, `$7000`),
  so the colours `colour_bars` (`$904C`) writes into `$D021` line by line
  show through them.
- The copyright line types itself onto row 24 from the middle out after
  64 frames (`copyright_step`, `$9700`), PRESS FIRE TO LOAD onto row 19
  after 96 (`press_fire_step`, `$9726`), and then it flashes and the
  scroller runs: letters two characters wide and two high, three pixels a
  frame, in 16 lines of colour (`scroll_step`, `$97EF`; `scroll_text`,
  `$9A79`).
- Fire: `load_game` (`$2BB5`) silences the SID, copies `$2F00-$2F30` to
  `$0190` and jumps to the fast loader at `$C000`, which loads `GAME` and
  jumps to `$0190`: with all RAM visible that code moves `$5C00-$B7FF` up
  to `$A400-$FFFF` and jumps to engine `$1000`.

## What nothing shows

- The NMI's RTI at `$9003` is also the "@" that opens a message nothing
  prints: "------FUZZIES RULE OK!------CLYDE RACLIFFE SAYS "GIVE 'EM SOME
  SHIT"----" (`nmi_message`, `$9004`).
- Unused sprite blocks at `$5B00` hold "YO! CHECK THIS OUT / THE APEX
  BOYZ ARE BACK! / WITH THE FOLLOW UP TO THE SUPERB SHOOT-EM-UP
  "RETROGRADE"" and APEX! in big letters (`apex_message`).
- Code and tables nothing runs or reads: `leftover_code` (`$2BF0`),
  `fade_step_unused` (`$9752`, which builds a value and stores it
  nowhere), `gradient_unused` (`$907B`), and `border_step` (`$97C7`),
  whose table is all black.

*Live*, 13-14 October 2026: the title from boot to fire
(`reference/title.png`), and the load of `GAME` to engine `$1000`.

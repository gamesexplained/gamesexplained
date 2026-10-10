# The intro: verified technical facts

Addresses are the intro's, at its hand-over (`work/entry.vsf`): `boot` at
`$0100`-`$025F`, the loader `2` at `$C000`-`$C4FF`, `menu` at
`$4B00`-`$AFFF`. Unless marked *live*, a fact comes from the code.

## Loading

- `boot` blocks RESTORE (a CIA 2 timer NMI pointed at an RTI at `$0227`),
  names the file "2" by storing `$32` at `$3232`, loads it, and enters it
  through `JMP ($01FF)` (`$0203`).
- `2` opens "MENU", writes its 256-byte drive program (`$C3A8`) to the
  drive's `$0700`, starts it at `$07AB` and receives `menu` two bits at a
  time (`$C32D`, decode table built from `$C362`). `$C000`-`$C23F` of
  this file are older sprite routines that never run.
- The start-up (`$52ED`) sends the drive an Initialize, copies the music
  driver (`$4B00`-`$52FF` to `$033C`), the game loader (`$5400`-`$57FF`
  to `$C000`) and the copier (`$5700`-`$5730` to `$0180`), patches the
  hooks at `$8003`, `$8007`, `$800A` and the driver's BIT at `$0526`,
  starts the ident tune `$9EB6` and jumps to `$8000`.
- Fire on port 2 is read only during the roll call (`$827B`-`$8282`). It
  leads to the game loader at `$C000`, which blanks the screen
  (`$5410`-`$541C`) and loads "GAME" to `$0200`-`$A8FF`; the copier then
  jumps to `$1800`.

## The show

- Mayhem TV and Apex (`$8099`, loop `$8B7D`): the MTV logo fades in and
  out, the letters A, P, E, X zoom in from dots (`$8CF1`), a white bar
  wipes across and "COMPUTER · PRODUCTIONS" (`$76E4`) turns white.
- The roll call (`$80D6`, loop `$8231`): ten dinosaur pages (`$80EC`),
  each followed by a credits page (`$81DC`). On each page the dinosaur
  walks in in colour over the scrolling landscape (`$86F9`); when it
  arrives the scene flashes white and fades to grey (`$8064`, `$8AC2`,
  `$8ADE`), and its name scrolls in from the right and its Latin name
  from the left (`$8B2E`, `$8B5C`).
- The landscape is drawn once into a window 28 characters wide (rows
  7-18) and moves by rolling the characters' pixels in place: clouds half
  a pixel a frame (`$84EC`), mountains one (`$852A`), the ground two to
  six (`$85C6`, `$85F5`).
- On every page, sprites 0-3 are solid black blocks at both edges of the
  window, hiding the dinosaur where it enters (`$9632`).
- Credits pages: wait 30, fade in over 8 steps, hold 140 (about 5.6
  seconds on PAL), fade out, wait 40, counted on alternate frames
  (`$9619`-`$961D`, `$803D`). The last page never fades out (`$8835`).

## Text

Screen codes, with `1` and `2` drawn as brackets; big-font strings at
`$8F06`-`$9081`, small-font strings at `$90CA`-`$94A3`. Both fonts are
holes in hires cells over black colour RAM, so the raster colour bars
(`$8045`) colour the letters. The big font is 2×2 characters a letter
(glyph map `$7500`, characters `$00`-`$68`, printed by `$88D8`); the small
one is characters `$90`-`$AB` (`$888F`).

| Page | Dinosaur | Credit |
|---|---|---|
| 0 | stegosaurus (spikius chargicus) | perfect programming by john rowlands (drinkus plenticus) |
| 1 | megasaurus (bigus bellius) | gorgeous grafix and superb sounds by steve rowlands (tarticus maximus) |
| 2 | ballodactyl (balloonus floaticus) | additional programming and design by andy roberts (intro codicus) |
| 3 | burrowsaurus (digus bigus) | artwork and package production ollie alderton (haircutticus spikius) |
| 4 | spikeysaurus (lickus frequenticus) | many thanks to commodore format (commodorius formatticus) |
| 5 | flapodactyl (wingus flapicus) | additional support from tracy matheussen (bigus pursus) |
| 6 | dragosaurus (dino giganticus) | additional assistance andy smith (slamus dunkus) |
| 7 | diplodocus (neckus extendicus) | more additional assistance john twiddy (cyber loadicus) |
| 8 | bobodactyl (bobalongicus) | this game is dedicated to mr and mrs rowlands (gone to cyprus) |
| 9 | mayhem (speedicus maximus) | press fire to continue |

## Music

The same driver as the engine's, loaded at `$4B00` and run at `$033C`:
37 commands, a PAL note table at `$0A69`. Two tunes: the ident `$9EB6`,
played once, and the roll call `$9A00`, whose voices each repeat their body 255 times and then stop the music (event `$1E` at `$9ACA`, `$9B71`, `$9DDC`).

## Oddities

- The exit's SID clear (`$53C6`-`$53CF`) writes `$D418` 25 times instead
  of 25 registers.
- `$9F86`-`$AFFF` is uninitialised memory saved with the file; the text
  "S0:MENU" in it is read by nothing.

# The title: facts

File `A` of side 1, unpacked at `$1000` and run once, after the boot.
Every fact names the routine or table it comes from, in this part's
listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$1496` | the code: start-up, the two raster interrupts, the globe |
| `$1497`-`$183F` | the globe's phases and the title tune's three voices (`title_voice1`, `$149F`) |
| `$1840`-`$1CC3` | the music driver (`play_music`, `$18B7`) and its top octave (`top_octave`, `$1CB8`) |
| `$3000`-`$377F` | the globe's map of the world (`world_map`), six character rows of 40 multicolour cells |
| `$3960`-`$3B0F` | the globe's round outline as six rows of masks (`globe_mask_rows`) |
| `$5800`-`$597F` | the six sprites behind the globe (`globe_sprite_shapes`) |
| `$5A40`-`$5E3F` | the second set of credits (`credits_alt`), the bottom rows of a second bitmap |
| `$6000`-`$7F3F` | the title picture, a multicolour bitmap (`title_bitmap`), with its screen colours at `$7F40` and colour RAM at `$8328` |

## The screen

- A multicolour bitmap in VIC bank 1, the screen at `$4000` and the
  bitmap at `$6000` (`title_screen`, `$12CC`).
- The globe turns: `shift_map` (`$1354`) makes three more copies of
  the map, one, two and three multicolour pixels further on, at `$A000`,
  `$A780` and `$AF00`. Every seventh frame `turn_globe` (`$1151`) takes
  the next copy, and after four the next cell of the map, and
  `draw_globe` (`$1165`) draws six rows of nine cells, each ANDed with
  that row's circle mask. Six multicolour sprites behind the bitmap
  (`globe_sprites`, `$12FE`) give the globe its colours.
- Two interrupts (`title_irq`, `$10D1`, at line 0 and `title_irq_low`,
  `$1268`, at line 218) show the bottom rows from the bitmap at `$6000`
  or the one at `$4000`, so the credits at the bottom change every 385
  frames (55 × 7). One set reads "PROGRAMMED BY: K-BYTE" and the
  programmers' names, the other "GRAPHICS BY" and the artists' names,
  then "© 1986 EPYX, INC." (seen in VICE on 30 October 2026).

## Leaving

The title waits for the fire button on either joystick, or for the tune
to end and about a third of a second more, then blanks the screen,
silences the sound and jumps to the shell's restart at `$0900`, which
loads the menu (`$10B1`).

## Sound

One tune, three tracks (`tune_tracks`, `$1836`). The music driver is the
first of the copies every part with music carries: a byte below `$C0`
is a note, two times its number indexing a frequency table built at
`$C000` from the top octave (`build_freqs`, `$186E`); `$60` is a rest;
the length follows, bit 7 holding the gate into the next note; `$C0` to
`$E0` are commands (`music_commands`, `$1C76`); `$FF` ends a voice.
The top octave's frequencies (`$861E` for C to `$FD2E` for B) are in
tune on a machine of NTSC speed: on a PAL machine every note sounds
about 65 cents flat.

Command `$DE` (`$1BD7`) reads the waveform at `$AE` plus twice the
voice's number with X still holding the data pointer's index, which is
right for voice 1 only.

## Registers

The VIC-II's bank, bitmap mode, raster interrupt, sprites and colours;
the SID's three voices, filter and volume, and its voice 3 oscillator;
CIA 1 and CIA 2's timers and interrupts stopped at the start, CIA 1's
ports read for the fire button.

## Strings

None in screen codes or PETSCII: every word on the title is drawn in
the bitmap.

# Caber toss: facts

File `O` of side 2, unpacked at `$1000`; the travelogue sets it in
Scotland. Every fact names the routine or table it comes from, in this
part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$2410` | the code: the attempt, the run, the hold and the release, the caber's flight and landing, the result |
| `$241C`-`$2E3A` | the music driver and its tracks |
| `$4000`-`$47FF` | the two screens, swapped as the scenery scrolls |
| `$4800`-`$763F` | the sprite shapes, the 64th byte of each its colour and flags; `$6640`-`$77BF` swapped with the second set |
| `$7800`-`$7FFF` | the character set |
| `$8000`-`$8FFF` | the top rows, the scenery map (`$8170`, 128 columns of 11 rows) and its colours (`$8970`) |
| `$9000`-`$9B4A` | the poses: a table of 119 (`$00`-`$76`) and their data, a count and four bytes a sprite |
| `$A000`-`$B1BF` | the second set of sprite shapes, 18 pages |

## The run and the toss

- The run: left and right in time with the stride (a state machine,
  `$29`, its counter by the speed's band). A push adds `$1904`[band]
  less a term for the stamina, and friction takes `$18F4`[band].
- The stamina (`ct_stamina`, `$1A32`) starts at `$0180` and loses one
  every four frames of the run; below `$B0` it drops to 0 and the caber
  falls by itself. The lower the stamina, the weaker each push.
- The caber's balance (`ct_balance`, `$2350`): the change of speed each
  frame, over 16, adds up; at 10 or more the caber tips a step forward,
  below -8 a step back. Step 5 drops it forward (a fault); below 0 it
  falls back and the thrower falls 8 frames later (a fault). Speeding
  up hard tips it forward, slowing down hard tips it back.
- Fire with the caber leaning 3 or more drops it (`ct_drop`, `$23ED`).
  Otherwise the toss begins; holding fire tilts the caber a step each
  time a count passes the next threshold, `$38`, `$68`, `$90`, `$B4`,
  `$D4` (`$1AB5`), and a lean of 5 fells it. The count, `$39`, grows each
  frame by the run's speed's high byte plus 1 (`ct_hold_caber`,
  `$1A6B`).
- At the release (`ct_release`, `$1AD0`), tune 7: the speed across is a
  quarter of the run's speed plus the stamina's low byte less
  `$1CC8`[`$3A`], at least 0; the speed up is half the stamina plus
  `$1CC8`[255 - 3/4 × `$3A`] less `$30`. `$3A` only counts `$39`
  passing 255, which a lean of 5 stops first, so it is 0 at every
  release: the speed across always takes `$F8`, and the speed up always
  reads index 255, `$1DC7`, past the table and into the code, the
  opcode `$C6` of `DEC $5D`. *Live*, 30 October 2026: three throws in
  play, the fire held 10, 30 and 90 frames, each had `$3A` = 0 and read
  `$1DC7`.
- In the air the caber falls by `$0A10` a frame of its 24-bit speed up,
  and its speed across loses `$50` a frame; it turns through eight spin
  poses, and its landing height depends on the spin pose
  (`ct_caber_flight`, `$1B53`).
- On landing (`ct_landing`, `$22AC`): pose `$0C` is a fall short; pose
  `$10` is a good toss, and 64 frames later the thrower walks off with
  tune 2; the other poses tip on a pose at a time, and tipping back is a
  fault.

## The result

- The distance is the gap between sprites 7 and 3: a foot for every 8
  pixels, plus 10 feet; the inches come from `ct_inches` (`$2297`),
  indexed by twice the pixels left over plus bit 4 of a read of colour
  RAM at `$D800` (`ct_show_result`, `$2170`).
- Colour RAM holds only four bits; the upper four of a read are
  whatever was last on the bus. So the inches' lowest bit is noise for
  2 to 7 inches less than 4 pixels over, and makes no difference above
  that (the table reads 8, 8, 9, 9, 10, 10, 11, 11). *Live*, 30 October
  2026: 64 reads of `$D800` a raster line apart gave colour 6 every time
  and upper bits that changed, bit 4 set in 10 of them.
- The best throw is kept in the record at `$0816` (inches) and `$0817`
  (feet), with its text at `$0810`-`$0815` (`ct_keep_best`, `$2248`).
- Practice asks "TRY AGAIN?", up for Y and down for N; a competition has
  three tosses, FIRST, SECOND and THIRD TOSS in cyan, yellow and orange.
- Each player's joystick is the first port with anything pressed for 7
  frames on the first attempt (`ct_port`, `$195C`).

## Pictures

- The scenery map is 128 columns of 11 rows, drawn into the screen not
  shown and swapped (`ct_draw_scenery`, `$197A`; `ct_swap_screens`,
  `$19DB`); the field's fine scroll is `$21`.
- After a good toss, or once the caber has fallen back, the 18 pages of
  shapes at `$6640` change places with the second set at `$A000`, a page
  a frame, and change back for the next attempt (`ct_swap_shapes`,
  `$1EB2`).

## Sound

The title's music driver, moved on by `$BDC`. Tunes: 1 the start, 2
after a good toss, 3, 4 and 7 the moments of the throw, 5 and 6 with
the run's poses `$19` and `$16`, 8 as the caber drops. Tune 9 is never
started, and a track at `$2DE8`-`$2DF7` belongs to no tune.

## Registers

The processor port (`$01` = `$35`); the VIC-II's two screens, fine
scrolls, three raster interrupts (lines `$60`, `$EA` and `$FA`),
sprites and colours, and colour RAM read at `$D800`; the SID's voices,
filter and volume, and voice 3's oscillator; CIA 1's ports for the
joysticks; CIA 2's port A for the VIC bank.

## Strings

In screen codes: "FIRST TOSS", "SECOND TOSS", "THIRD TOSS",
"PRACTICE", and "TRY AGAIN" with its question mark stored as "!"
(`ct_again_text`, `$12AD`).

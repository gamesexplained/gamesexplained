# The mine: facts

File D of Domark's disk. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

VIC bank 1: screen `$4000`, the panel's character set `$4800`, the mine's
multicolour character set `$5000`. `$01` = `$36` in play; the interrupt
is `raster_irq` (`$1022`) through `$0314`.

| Range | What |
|---|---|
| `$0A00`-`$0AFF` | `mission_complete` and `win_text`, the code ILVCT at `$0AFA`-`$0AFE` |
| `$0B00`-`$0D1E` | `menu_screen` and its pointer, the screen ABORT and RESTORE open |
| `$1000`-`$3FFF` | the code, the panel screen (`$1D50`-`$1F17`), the variables (`$1B00`-`$1BA0`) |
| `$4400`-`$47FF` | May Day's sprites (`$10`-`$1F`) |
| `$5660`-`$575F` | `code_prompt`, `read_code` and "DB4CT" (`$5757`) |
| `$5800`-`$7AFF` | Bond: four stacked sprites, 35 shapes each (`$60`-`$EB`) |
| `$7B40`-`$7CC7` | the music player |
| `$7CD0` | `welcome_page` |
| `$8000`-`$BA97` | the mine: 100 rows of 150 tiles |
| `$BB01`-`$BCB7`, `$BD00`-`$BFFF` | the panel's colours; the objects as placed |
| `$E000`-`$FBE6` | the tune, under the KERNAL: the same bytes as Paris's |

## Start

`code_prompt` (`$5660`) and `read_code` (`$5707`) compare five CHRIN
characters with "DB4CT" (`$5757`): a match stores 1 in `$1BA0` (`$572D`),
RETURN stores 0 (`$5747`), and both go on to `welcome_page` (`$7CD0`) and,
on fire, `start_game` (`$2540`). A second "DB4CT" at `$575C` is never read.

ABORT (`opt_abort`, `$3A90`) and RESTORE (`restart_vector`, `$1764`) open
`menu_screen` (`$0C00`): RESTART GAME, or RETURN TO MAIN MENU, which loads
the file MENU (`$0C54`) and comes back to the screen if the LOAD fails. A
pointing hand, sprite shape `$FB` (`$7EC0`), chooses.

## The screen

- Three raster bands: the panel at line `$FB` (`irq_panel`, `$103E`, which
  also runs the clock, the music, the stick and the scroll), the mine at
  `$8A` (`irq_playfield`, `$107E`) and its colours and the panel's flashing
  at `$91` (`irq_mid`, `$10B9`).
- The hazards and the belts are stepped by the main loop, once a pass
  (`hazards_and_belts`, `$2CD6`, called at `$2558`): a JMP at `$10CD`
  passes over the calls left in `irq_mid`. The main loop waits 10 × 256
  loops each pass (`$254D`), so it runs about once a frame. *Live*, 8
  October 2026: 494 passes in 503 frames. The hazards step every 8, 9
  and 7 passes, the belts every 2 (`$1B46`, `$1B49`, `$1B4C`, `$1B61`).
- The word strip scrolls a step every 16 × 255 loops (`menu_scroll_step`,
  `$2DFD`), and a wait after fire is let go lasts 128 × 255 loops, about a
  quarter of a second (`short_delay`, `$2E5D`).
- Bond stays in the middle and the mine scrolls both ways
  (`scroll_engine`, `$2156`). `map_to_buffer` (`$1100`) expands the 2 × 2
  tiles into a buffer at `$1400`; `buffer_to_screen` (`$1700`) copies 14 rows
  of 41 characters.
- Collisions come from reading the screen around Bond (`probe_front`
  `$2B4D`, `hazard_test` `$2B93`, `probe_feet` `$2BC1`), not from the VIC's
  collision registers.

## Bond

`player_control` (`$2700`) runs one of six states in `$1B25`: standing,
walking, jumping, falling, climbing and hurt. A fall of `$41` passes or
more hurts (`$29FE`). A hurt lasts 30 passes, each taking `$30` more
clock ticks (`$2B2C`-`$2B38`), about 29 s of the clock per hit. There are
no lives and no score.

## The clock

The clock starts at 90:00:00 and counts down two hundredths a frame
(`clock_tick`, `$1C20`); at zero (`$1B24`) the part starts again at
`$2540`. PAUSE sets `$1B80`, which the interrupt tests at `$106C` to skip
the clock; the music plays on.

## Items and words

Fire opens the item list (`item_menu`, `$2E80`) and then the words
(`action_menu`, `$2D00`): RETURN, EXAMINE, USE, GET LIFT, WINCH UP, WINCH
DOWN, PAUSE, ABORT. EXAMINE finds an object at Bond's feet or just ahead
(`$36F6`).

- Explosive and detonator: the explosive marks a rock fall within -8 to
  +5 tiles (`$3827`); the detonator removes it with a shake and a flash
  (`$39E0`, `$1170`). Blasting rock fall 3 frees May Day (`$3E00`).
- A lever reverses the conveyor belts (`$3A0D`), which carry Bond
  (`$1900`, `$2CA3`).
- Planks bridge one gap, always the same one (`$3970`, `$8656`); a rope
  hangs from Bond's tile (`$38D8`).
- The lift is called with GET LIFT and ridden with the stick (`$3A95`,
  `$3C01`).
- The winch takes four parts (`$1B90`). WINCH DOWN needs May Day freed and
  Bond at row `$0D` in the right of the mine (`$3F23`); WINCH UP needs the
  four parts and five digits entered, wherever Bond is (`$3F8E`).

## The bomb

- Numbered items enter digits: the item's type minus 2, so 1 to 7
  (`$389C`-`$38D3`), and only in the right half of the mine above row `$55`
  (`$389E`-`$38A8`).
  Each is stored at `$1B73` + the count (`$1B78`).
- The key item (object 50) can be taken only with four winch parts and
  five digits (`$375B`).
- `end_check` (`$25E0`) runs when Bond reaches map column `$15` carrying it.
  It compares the five digits with 6, 7, 1, 3, 4 (`$26F0`) and then reads
  `$1BA0` (`$25F2`), its only reader. The right digits with the code
  entered go to `mission_complete` (`$0A00`): "CONGRATULATIONS 007 /
  MISSION COMPLETE / YOUR CODE FOR THE NEXT PROGRAM IS / ILVCT", fixed
  text, and a loop at `$0A4D`. Anything else goes to `game_over` (`$25D0`),
  four flashes of the explosion and a new start.
- So the mine cannot be won without City Hall's code: after RETURN at the
  prompt, even the right digits set the bomb off.
- *Live*, 8 October 2026, storing five digits and starting `end_check`
  directly: 6 7 1 3 4 with `$1BA0` = 1 reached `$0A00`; the same digits
  with `$1BA0` = 0, and 6 7 1 3 5 with 1, both reached `game_over`.
- MI6-HQ gives the detonator combination as 32768; the code this part
  checks is 67134.

## Music and sound

Three voices of note triples (frequency high, frequency low, length) from
`$E000`, `$EAD1` and `$F755`, stepping every third frame, and
looping when voice 1 reaches `$EAD1` (`music_play`, `$7BAB`). `sound_ok`
(`$3B7D`) and `sound_fail` (`$3B9C`) borrow voice 2 from the tune. No
speech.

## Shared with the other parts

`read_joystick` (`$17A0`) is City Hall's `$4700`; most of `win_text` is
in City Hall's loader leftovers; the tune is Paris's; `menu_screen` is
City Hall's, apart from its text and addresses. Only port 2 is read
(`$DC00`); CIA 1's timer A is stopped, so the KERNAL never scans the keys.

## Open

- Digits have no limit (`$38AA`-`$38B1`): the 14th would land on `$1B80`
  and stop the clock, the 46th on `$1BA0`. In principle a player without
  the code could set it this way and let the count wrap after 256 digits.
  Not tried.
- With `$1B16` = 0, touching some lit hazard glyphs spins the main loop for
  good at `$2BAB`-`$2BB7`. Not tried.
- The meter at the right of the panel (`$3000`) reads (`$C7` - row +
  column) / 21, rising to the right and upwards. Whether it is the
  "Geiger counter" the sources name is not known.
- `welcome_page` does `LDX $FF`, `TXS` (`$7D1D`), putting 7 in the stack
  pointer; `LDX #$FF` was probably meant. `start_level` resets the stack.
- A new start does not clear `$1B16`, May Day's freed flag `$1B96`, or the
  per-type counters `$1B11`-`$1B23`.
- The planks' handler compares with `$54`, which no object is, so the
  branch at `$8651` never runs.
- The map holds four tiles at row 54, columns 88 to 91 (`$9FFC`-`$9FFF`),
  whose bytes spell "ZOOM" in PETSCII. The same word ends a page of
  memory in the intro (`$9FF6`, "MOZOOM1000") and in City Hall (`$48FC`,
  inside an item icon). What wrote it is not known.

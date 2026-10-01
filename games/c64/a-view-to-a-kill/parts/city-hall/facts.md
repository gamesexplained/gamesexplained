# City Hall: facts

File 3 of the copy studied. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

VIC bank 0, screen `$0400`, character set `$3800`; `$01` = `$36` in play.
The only interrupt is the KERNAL's, through `$0314` = `$4022`
(`raster_irq`, five bands). CIA 1's timer A is stopped at `$7000`.

| Range | What |
|---|---|
| `$1000`-`$10DC` | `code_prompt`, `read_code` and the code "CCPHJ" at `$10D8` |
| `$1300`-`$13FF` | `mission_complete` and its text at `$1334` |
| `$1800`-`$19FF` | `memo_page` and `memo_text` (`$1837`) |
| `$2000`-`$34FF` | sprites: Bond, Stacey, the gauge figures (built into `$3400`-`$34FF`) |
| `$4000`-`$9FFF` | the code, the room records (`$4222`), furniture bitmaps (`$49E0`-`$57EF`), the items (`$63D0`), the screen and colour images (`$8D20`, `$9108`) |
| `$A000`-`$AA10` | pristine copies of the tables a new game restores |
| `$C640`-`$C7B5` | the music player, the same bytes as the intro's |
| `$E000`-`$E965` | the tune, under the KERNAL |

## Starting and ending

- `code_prompt` (`$1000`) prints "PLEASE ENTER CODE" through the KERNAL.
  `read_code` (`$1088`) compares five CHRIN characters with "CCPHJ"
  (`$10D8`): a match stores 1 in `$1BA0` (`$10AE`), RETURN alone stores 0
  (`$10C8`), a wrong code is read again with no limit on tries (`$10C3`).
- `memo_page` (`$1800`) shows M's and Q's memos; fire goes to `game_start`
  (`$8600`), which restores the tables (`restore_tables`, `$8700`, copying
  `$1B50`-`$1B90` only, so `$1BA0` survives a new game).
- `$1BA0` is read in one place, `$7096`. Every fourth pass of `game_loop`
  (`$7000`), `end_test` (`$708A`) checks for room `$4C` (76) with Stacey
  following (`$1B57`). Then, with `$1BA0` set, it jumps to `mission_complete`
  (`$1300`): "CONGRATULATIONS 007 / MISSION COMPLETE / YOUR CODE FOR THE
  NEXT PROGRAM IS / DB4CT", fixed text at `$1334`, and a loop at `$1331`.
  Without it, `JMP $8600` starts a new game.
- Room 76 is reached only through room 75's right doorway, which only
  `use_kit` (`$8356`) opens: item 54 used in room `$4B` with all six kit
  pieces found (`$1B58` = 6, counted at `$850C`).
- A burning current room also reaches the test: the `BNE` at `$706B` lands
  in the middle of the `BNE` at `$708F`, and the CPU runs `ORA $57AD`, the
  undocumented `SLO $0BF0,Y` (a write to `$0BFC`), then `LDA $1BA0`.
  Live, 30 September 2026, with room 8's byte 12 set to 1 in play: after
  CCPHJ the next pass ran `$7090` and `$7096` once and stopped in
  `mission_complete` with DB4CT on screen, and `$0BFC` went from `$40` to
  `$80`, the shift of the `SLO`; after RETURN alone it ran `$7090` and
  `$8600`, a new game. So whenever Bond's room is burning, the next pass
  ends the part: the next code if CCPHJ was typed, a new game if not.
  Without the code that reads as death by fire; with it, as a win.

## The building

- 75 rooms in five floors of 15, 14-byte records at `$4222` + 14n; `$3F`/`$40`
  point at the current record and `$1B51` holds its number. Byte 3 is the
  doorway code, byte 4 lets Bond through (`$6785`, `$67AE`), byte 12 is
  "burning", byte 13 the temperature, 0 to 15.
- Lifts are furniture types 8, 9 and 10 and move ±15 rooms (`use_lift`,
  `$6C60`).
- The room view is drawn by `$5E50`, `$40B0`, `$4100`, `$6000` and the blit
  at `$606B`; items on the floor by `$62A0`. Bond moves across and in depth
  (`move_bond`, `$66D0`) and goes behind the scenery on the right (`$69C0`).

## Items and words

- Fire opens the item window (`item_menu`, `$7A00`, three icons that
  scroll), then the word window (`word_menu`, `$8000`): RETURN, DROP,
  SEARCH, USE, FOLLOW, STAY, GIVE, ABORT (words at `$8095`, handlers at
  `$80E5`). Four more words are in the table and cannot be chosen.
- 91 items of 8 bytes at `$63D0`: number, room (`$80` = carried), weight,
  icon, on-floor flag, colour, use code. Taking one is refused if the
  carried weight would reach `$65` (`$7D6A`).
- USE jumps through 24 handlers (table `$7CA6`, a self-modified `JMP` at
  `$7CA4`): buckets are filled at a tap and thrown to hold the fire back
  (a 6-pass delay, `$84D6`); keys open doors between room pairs (`$7F47`,
  `$7F7C`); a tool forces doors and uses up an item (`$8287`); openers
  reveal items (`$8200`); energy items refill a gauge; exchange items turn
  into energy items in two rooms (`$83FA`).
- Stacey follows only after item 21 is used in room 8 (`$7F00`).

## Fire, gauges and clock

- `fire_spread` (`$94F0`) acts once every 14 × 256 frames (`$94F9`); a room
  catches when its temperature reaches 15 (`$954E`). The building picture
  blinks the burning windows (`$6A20`, `$6BC0`), and a thermometer shows the
  current room (`$69E0`).
- The gauges `$1B5B` (Bond) and `$1B5C` (Stacey) start at 42 rows and lose
  one every 4 × 256 frames. Only `gauge_update` (`$8900`-`$8998`) reads them;
  reaching 0 does nothing.
- The clock starts at 10 00 00 (`$86DA`) and counts a second every 60
  frames (`tick_clock`, `$6E40`). Nothing reads it: nine `NOP`s sit at
  `$6EA1`.
- Looked for and not found: death by gauge or by heat, a time limit, a
  score, and any routine that builds a code from play.

## Shared with the other parts

The music player (`$C621`-`$C7FE`) is the intro's, byte for byte, and the
tune is the intro's too. `read_joystick` (`$4700`) is the mine's `$17A0`,
`tick_clock` is Paris's `$4170`, and the "OK" sound (`$6B50`) is the mine's `$3B7D`.

## Leftovers

- An earlier prompt at `$967B`-`$9729` that nothing calls: screen codes,
  GETIN, three tries and a hang at `$970C`, code "QRS21", a flag at `$1B95`.
- An earlier end screen at `$7E5A`, "WEBL DONE 007 YOUR CODE IS" "111122".
- The mine's end screen, with ILVCT, at `$0A00`.
- A copy of the music player assembled for `$C640` at `$F4B6`-`$F646`, older
  fragments at `$6EC5`, `$852D`, `$6A79`, `$8142`, `$7200`, `$81A0`,
  `$85E9`, and a copy loop skipped at `$878C`.
- `$972A`-`$9FFF` holds a machine's power-up RAM pattern and "MONITOR$C*"
  text left by a machine-code monitor.

## Open

- Whether the live prompt and end screen are the original game's or the
  crackers'. The older prompt, the older end screen and the mine's end
  screen at `$0A00` point to the crackers, but the memo page uses the
  KERNAL too.
- `AND $03E9,Y` at `$95AD` reads a screen cell; `AND #` was probably meant.
- `use_energy` sets `$1B5B` to `$80`, more than the 42 rows the gauge
  draws, so the draw loop may write over Stacey's figure (`$3480`-`$34FF`).
- Items 41 and 42 in `use_opener` take their store addresses from
  `use_tool`'s code (`$8287`, `$828F`).
- What door codes 1, 2, 3, 5 and 7 look like: the code draws only 0 and 6.

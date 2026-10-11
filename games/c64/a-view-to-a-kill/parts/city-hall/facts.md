# City Hall: facts

File C of Domark's disk. Every fact names the routine or table it
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
| `$0B00`-`$0D1D` | `menu_screen` and its pointer, the screen ABORT opens |
| `$2000`-`$34FF` | sprites: Bond and the hi-res pieces laid over him, Stacey, the menu bars and the pointing hand |
| `$8900`-`$89DF` | `bond_overlay` and `show_stacey_text` |
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
- ABORT (`word_abort`, `$966A`) opens `menu_screen` (`$0C00`): RESTART GAME
  or RETURN TO MENU, chosen with a pointing hand (sprite shape `$CF`) and
  fire. RETURN TO MENU loads the file MENU and jumps to `$28C0` without
  checking the LOAD (`$0C53`). *Live*, 8 October 2026: ABORT showed the
  screen. RESTORE is not set up in this part: the only writes to `$0318`
  are in loader leftovers at `$095E`.
- Room 76 is reached only through room 75's right doorway, which only
  `use_kit` (`$8356`) opens: item 54 used in room `$4B` with all six kit
  pieces found (`$1B58` = 6, counted at `$850C`).
- A burning current room also reaches the test: the `BNE` at `$706B` lands
  in the middle of the `BNE` at `$708F`, and the CPU runs `ORA $57AD`, the
  undocumented `SLO $0BF0,Y` (a write to `$0BFC`), then `LDA $1BA0`.
  *Live*, 8 October 2026, with room 8's byte 12 set to 1 in play: with
  CCPHJ the next pass ran `$7090` once and stopped in `mission_complete`'s
  loop at `$1331`; with `$1BA0` cleared it ran `$7090` and `$8600`, a new
  game. So whenever Bond's room is burning, the next pass
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
- Bond is four hi-res sprites. Sprites 0 and 1 are his figure; on every
  pass of the game loop (`$703D`) `bond_overlay` (`$8900`) points sprites 4
  (orange) and 5 (white) at the pieces for his direction and walking frame
  (shapes `$C2`-`$CD`, tables `$8970` and `$8980`) and puts them where
  sprite 0 is.
- Room 38's record names a second piece of furniture of type `$A1`, with
  no position (`$443E`, from `$A20E`). *Live*, 8 October 2026: running
  `exit_left` (`$6781`) from room 39 drew room 38 and play went on.

## Items and words

- Fire opens the item window (`item_menu`, `$7A00`, three icons that
  scroll), then the word window (`word_menu`, `$8000`): RETURN, DROP,
  SEARCH, USE, FOLLOW, STAY, GIVE, ABORT (words at `$8095`, handlers at
  `$80E5`). Four more words are in the table and cannot be chosen.
  While a window is open its edge row is coloured purple, from a choice of
  two colours that are both 4, so it does not blink (`blink_item_edge`,
  `$6D70`).
- 91 items of 8 bytes at `$63D0`: number, room (`$80` = carried), weight,
  icon, on-floor flag, colour, use code. Taking one is refused if the
  carried weight would reach `$65` (`$7D6A`).
- USE jumps through 24 handlers (table `$7CA6`, a self-modified `JMP` at
  `$7CA4`): buckets are filled at a tap and thrown to hold the fire back
  (a 6-pass delay, `$84D6`); keys open doors between room pairs (`$7F47`,
  `$7F7C`); a tool forces doors and uses up an item (`$8287`); openers
  reveal items (`$8200`); energy items set an energy byte that nothing
  reads; exchange items turn into energy items in two rooms (`$83FA`).
- Stacey follows only after item 21 is used in room 8 (`$7F00`). When she
  is in Bond's room, `show_stacey_text` (`$8990`) writes STACEY IS WITH
  YOU in the panel.

## Fire, energy and clock

- `fire_spread` (`$94F0`) acts once every 14 × 256 frames (`$94F9`); a room
  catches when its temperature reaches 15 (`$954E`). The building picture
  blinks the burning windows (`$6A20`, `$6BC0`), and a thermometer shows the
  current room (`$69E0`).
- There is no energy gauge. `$1B5B` (Bond) and `$1B5C` (Stacey) are set to
  42 at the start (`$8691`) and by the energy items (`use_energy`, `$83DD`;
  `word_give`, `$8476`), and nothing reads them. The figures at
  `$89E0`-`$8B98` are never shown.
- The clock starts at 10 00 00 (`$86DA`) and counts a second every 60
  frames (`tick_clock`, `$6E40`). Nothing reads it: nine `NOP`s sit at
  `$6EA1`.
- Looked for and not found: death by energy or by heat, a time limit, a
  score, and any routine that builds a code from play.

## Shared with the other parts

The music player (`$C621`-`$C7FE`) is the intro's, byte for byte, and the
tune is the intro's too. `read_joystick` (`$4700`) is the mine's `$17A0`,
`tick_clock` is Paris's `$4170`, and the "OK" sound (`$6B50`) is the mine's `$3B7D`.

## Leftovers

- An earlier prompt at `$967B`-`$9729` that nothing calls: screen codes,
  GETIN, three tries and a hang at `$970C`, code "QRS21", a flag at `$1B95`.
- An earlier end screen at `$7E5A`, "WEBL DONE 007 YOUR CODE IS" "111122".
- Part of the mine's end screen, with ILVCT at `$0AF6`, among loader
  leftovers at `$0800`-`$0AFF`.
- Older fragments at `$6EC5`, `$852D`, `$6A79`, `$8142`, `$7200`, `$81A0`,
  `$85E9`, and a copy loop skipped at `$878C`.
- `$972A`-`$9FFF` holds a machine's power-up RAM pattern and "MONITOR$C*"
  text left by a machine-code monitor.

## Open

- `AND $03E9,Y` at `$95AD` reads a screen cell; `AND #` was probably meant.
- Items 41 and 42 in `use_opener` take their store addresses from
  `use_tool`'s code (`$8287`, `$828F`).
- What door codes 1, 2, 3, 5 and 7 look like: the code draws only 0 and 6.

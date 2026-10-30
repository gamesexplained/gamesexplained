# Episode three, The SAS Assault: facts

Files `XXXF2` (`$1000`-`$3FFF`), `XXXF1` (`$4000`-`$4FFF`) and `XXXF0`
(`$6000`-`$CFFF`), loaded by the episode loader through the KERNAL and
started at `$C000`. Every fact names the routine or table it comes from,
in this part's listing.

## Memory

`$01` = `$36` in play (`init_play`): RAM at `$A000`-`$BFFF`, the chips
and the KERNAL in. The set-up runs with `$01` = `$2D` (`new_game`), which
puts RAM at `$E000` too.

| Range | What |
|---|---|
| `$0400`-`$07E7` | the text screen; rows 20-24 are the text window below the picture |
| `$1000`-`$1177` | `message_table`, `message_table_high`: the addresses of the 188 messages |
| `$1178`-`$322D` | the messages |
| `$322E`-`$3FFF` | filler nothing reads |
| `$4000`-`$48BF` | sprite images 0-34: the drawer, the bomb, the door, the guard, and the unused shoot-out's cross-hair and bursts |
| `$4A00`-`$4CFF` | `codename_text_screen` |
| `$5000`-`$53FF` | the picture's screen memory in play, copied from `$7F40` |
| `$6000`-`$7F3F` | `picture`: the room, a multicolour bitmap, 160 by 160 double-width pixels on screen rows 0-19 |
| `$7F40`-`$86FF` | `picture_screen` and `picture_colours` |
| `$8700`-`$87FF` | the variables |
| `$8800`-`$8FFF` | the plotting tables, built at every new game |
| `$9000`-`$90D4` | `tape_writer_leftover` |
| `$A000`-`$B6F6` | the parser, the verbs' routines, the guards, the alarm |
| `$C000`-`$CBBB` | the codename screen, start-up, the raster interrupts, input, the explosion |
| `$E000`-`$FFFF` | a clean copy of the picture under the KERNAL, made once (`start_episode`) and copied back at each new game (`restore_picture`) |

## The codename

`codename_screen` (`$C000`) prints THE FOURTH PROTOCOL in block letters
and WHAT IS THE CODENAME FOR THIS MISSION?, and reads lines of up to 30
characters. `check_codename` (`$C0FF`) compares the first seven with
TIPTREE (`codename_answer`, `$C133`) and ignores the rest of the line; a
wrong line gets WRONG beside it (`codename_wrong_text`) and another line
is read.

## The screen

Seven raster interrupts a frame (`set_next_irq` chains them):
`irq_picture` (`$C4FE`, line 8) shows the multicolour bitmap from VIC
bank 1 and the door's top half and the guard; `irq_guard_lower`,
`irq_door_lower`, `irq_cabinet` (the drawer and the bomb, sprites 3-7),
`irq_priority_off` and `irq_blank` follow down the screen; `irq_text`
(`$C722`, line `$D7`) switches to text on the screen at `$0400` for the
window, runs the guards (`room_events`) and the siren (`alarm_sound`),
and scans the keyboard. After an explosion `irq_text_only` (`$C5C9`)
takes `irq_picture`'s place and the whole screen is text.

The explosion (`explode`, `$C889`) draws rings round the picture's centre
by the midpoint method (`draw_circle`, `$C9EA`) in colour 1, colour 2 and
the background in turn (`explosion_colours`), with 16 bursts of noise on
voice 1 (`noise_burst`).

## The parser

`main_loop` (`$C7F7`) clears the keypad chosen and the hiding, runs the
turn (`check_turn`), then reads a line (`input_line`, `$C802`, up to 40
characters) and hands it to `parse` (`$A00C`).

- 18 verbs (`verb_words`, `$A058`): INVENTORY, EIOK, LISTEN, HIDE,
  12051987, OPEN, CLOSE, SHOOT, ATTACK, KICK, HIT, DESTROY, EXAMINE, USE,
  PUSH, PRESS, CUT, KILL. EIOK is the verb that describes the room
  (`describe`); LOOK is not a word the game knows.
- 28 nouns (`noun_words`, `$A0F8`): DOOR, CABINET, KEYPAD, GEIGER, FIRST,
  SECOND, THIRD, BOMB, LIGHT, BUTTON, TIMER, ALL, WIRE, GREEN, RED, YELLOW,
  BLUE, BOX, CABLE, GUARD, WINDOW, WALL, FILING, PAD, COUNTER, ALARM, KGB,
  DRAWER.
- `find_word` (`$A182`) matches a list word against the start of a word in
  the line, so a longer word that begins with it matches too (OPENING is
  OPEN).
- Verbs 0-4 take no noun and go through `verb_actions` (`$B017`); the rest
  go through a table of noun routines for each verb (`noun_tables`,
  `$B03E`), ATTACK, KICK, HIT and KILL sharing one, and PUSH and PRESS
  another. Both tables hold routine addresses less one, taken with an
  RTS.
- A line with no verb gets one of four replies (`unknown_verb_replies`), a
  verb with no noun another four (`unknown_noun_replies`). An empty line
  goes straight to the turn.

## The bomb

`bomb_state` (`$8784`): 0 the cabinet sealed, 2 the drawer open, 4 the
timer showing, `$80` defused. The defusing, in order:

1. USE (or PUSH, or PRESS) SECOND: the keypad chosen is `$FF`
   (`choose_keypad`, `$B488`). FIRST and THIRD both give 1. USE GEIGER
   says the second drawer is the most active (`use_geiger`).
2. 12051987 (`type_number`, `$B298`). On the second keypad the drawer
   opens (`open_drawer`) and the alarm sounds (`raise_alarm`). On the first
   or third the bomb goes off. With no keypad chosen: AND WHAT IS THE
   SIGNIFICANCE OF THAT NUMBER, PRAY?, and the alarm. The keypad lasts
   one command (`main_loop` clears it).
3. CUT CABLE (or DESTROY CABLE) silences the alarm for good: `alarm` 2
   (`cut_cable`). The alarm also sounds for ATTACK CABLE.
4. PUSH RED, YELLOW, GREEN (`push_red`, `$B4BF`): in that order the panel
   slides away and the timer shows (state 4). A button out of turn: WHOOPS!
   and the bomb goes off.
5. CUT RED, YELLOW, GREEN (`cut_red`, `$B54E`): the third makes the state
   `$80`, CONGRATULATIONS! YOU YOU HAVE DEFUSED THE BOMB! (message 110,
   "YOU" twice in the text) and the good epilogue (`defused_ending`,
   `$A343`). A wire out of turn sets the bomb off with OH DEAR! IT'S
   BOOBY-TRAPPED (message 97), and so does CUT BLUE (message 98, the same
   words), whether or not the wires can be seen (`cut_blue`).

Touching it any other way sets it off: ATTACK, KICK, HIT or KILL on the
cabinet or any part of the bomb (`attack_bomb`), DESTROY on them
(`destroy_bomb`), PUSH on the cabinet, bomb, timer or a wire (`push_bomb`),
CUT TIMER or CUT ALL once the timer shows.

## The guards

- `guard_state` (`$8787`), states 0-10 through `room_event_table`
  (`$A4D8`): hidden, setting out, four walks past the window (behind the
  picture, seen only through the window and the open door), into the
  doorway, looking round, coming in, going out, walking away. The walks
  move a pixel a step, every second frame (`room_events`).
- A guard sets out from `guard_timer` (`$B5C9`), which runs at every poll
  of the keyboard while a line is typed: every 512 polls, if no guard is
  about, always while the alarm rings, otherwise when a random number
  ANDed with `guard_chances` (`$B614`) is zero: 1 in 256 until the timer
  shows, then 1 in 64.
- In the doorway he looks round. If you are hiding and nobody is in the
  room, he looks and goes (`guard_looks`); otherwise he comes in.
  `guards_in_room` (`$8792`) goes up to 5; a sixth sets `sixth_guard`,
  which nothing reads.
- HIDE hides you only while the drawer is shut (`hide`): with it open the
  message is the same and `hiding` stays 0.
- After each command (`check_turn`, `$B62F`), with guards in the room:
  death when a random number ANDed with `attack_chances` (`$B66C`) is
  zero, 1 in 16, 16, 8, 4 or 2 for 1 to 5 guards; otherwise an attack you
  evade or a blow that lands, and the third blow since you last struck a
  guard down kills you (`blows_taken`). Death sets the bomb off.
- ATTACK, KICK, HIT, KILL, DESTROY, PUSH or PRESS GUARD (or KGB) strikes
  one down half the time (`fight_guard`). CUT GUARD never does
  (`cut_guard`).

## The endings

- The bomb defused: messages 118-120, an alliance government returned in
  the 1987 election, early retirement, and a job in asset protection
  (`defused_ending`).
- The bomb gone off (`bomb_explodes`, `$A2F0`): the epilogue depends on
  `commands_typed` (`$879A`) when it happens. Odd: messages 112-114, from
  the annals of the Australo-Indonesian empire: an American base's
  retaliation and a nuclear winter. Even: messages 115-117, the explosion
  at Faslane blamed on a NATO device going off by accident, and a
  government committed to unilateral disarmament elected in 1987.
- The 144th line typed, empty lines included, brings A CLICK ISSUES FROM
  WITHIN THE CABINET and sets the bomb off (`check_turn`), so the limit
  always ends on the even epilogue.
- Each ending waits for a key and starts a new game (`await_restart`,
  `new_game`), which puts the clean picture back from `$E000`.

## Code that does what it seems not meant to

- PUSH ALL once the bomb is found prints message 170, YOU SIDESTEP A
  VICIOUS ATTACK, and sets the bomb off (`push_all`, `$B503`). Message 160,
  which nothing prints, is OK - PUSHING ALL THE BUTTONS AT ONCE.
- CUT BOX counts as cutting the yellow wire: the CUT table's entry for BOX
  is the yellow wire's, `$B551`, inside the `BIT` at `$B550` in `cut_red`
  (`noun_tables`).
- DESTROY DRAWER gets the alarm box's reply, THE BOX IS TOO HIGH UP TO
  REACH (`destroy_box`).
- 12 of the 188 messages are never printed: 17, 22, 35, 52, 69, 111
  (DUMMY ENTRY), 124-127 (lines for a gun the game never gives you), 139
  and 160.

## The shoot-out nobody can reach

`shootout` (`$A7D1`), reached only through the jump at `$A006`, which
nothing calls: a cross-hair (sprite 0) moved by the cursor keys or a
joystick in port 2, fire on the joystick's button or the Commodore key,
192 rounds (`ammunition`). A guard walking past the window can be shot;
three hits on the alarm box silence it; 48 hits on the cabinet end the
game with message 162 (`shot_box_or_cabinet`). Its sprites (images
`$0D`-`$0E`, `$1E`-`$21`) and its messages (162, 173) are in the files.
The manual's submachine gun is this.

`nmi_unused` (`$CBAB`) is an NMI handler that is never installed: its
address is written to `$9F00` at each new game and nothing reads it.

## Leftovers

- An earlier build of episode two: its code at `$AAA3`-`$AFFF`, its
  locations and their names at `$B6F7`-`$BFFF` (with ARMOURY where the
  released episode has ARMORY), its dictionary at `$CBBC`-`$CEB7`, its
  texts at `$8731`-`$8FFF` (under the plotting tables) and `$90D5`-`$9FFF`,
  and pieces in the sprite area at `$48C0`-`$49FF` and `$4D00`-`$4FBF`.
  Each sits a few bytes from where the released episode two has the
  same bytes (`ep3left` matches in `work/`).
- A machine-code monitor's fragment at `$C13F`-`$C1FF`.
- `tape_writer_leftover` (`$9000`): saves memory from `$1000` to `$CDFF`,
  190 pages, as pulses on the cassette port's write line, with a leader,
  sync bytes (JPG and `$29`) and an EOR check byte for each page. Nothing
  calls it.
- Filler patterns at `$322E`-`$3FFF` and `$CEB8`-`$CFFF`.

## Live tests

VICE v3.14.0, 30 October 2026, from a snapshot taken just after TIPTREE
was accepted. Each run started from the same snapshot.

| Commands | Result |
|---|---|
| USE SECOND, 12051987 | OK - TYPE A NUMBER; the drawer opens, the alarm sounds (`bomb_state` 2, `alarm` 1) |
| then CUT CABLE | `alarm` 2 |
| then PUSH RED, YELLOW, GREEN | `buttons_pressed` 1, 2, 3; `bomb_state` 4, the timer shows |
| then CUT RED, YELLOW, GREEN | `bomb_state` `$80`, CONGRATULATIONS! YOU YOU HAVE DEFUSED THE BOMB!, the alliance-government epilogue |
| the same, with a guard come in after PUSH GREEN | A GUARD ATTACKS YOU, A GUARD HAS KILLED YOU, the explosion, the Faslane epilogue (6 commands) |
| CUT RED, CUT BOX, CUT GREEN with the timer showing | `wires_cut` 1, 2, 3 and defused |
| CUT BLUE with the timer showing | OH DEAR! IT'S BOOBY-TRAPPED, the explosion |
| `commands_typed` set to 143, an empty line | count 144, A CLICK ISSUES FROM WITHIN THE CABINET, the Faslane epilogue |
| an empty line, USE FIRST, 12051987 | I'VE A FEELING THAT WAS THE WRONG MOVE at count 3; the Australo-Indonesian epilogue |
| USE SECOND, 12051987, PUSH ALL | YOU SIDESTEP A VICIOUS ATTACK, the explosion, the Australo-Indonesian epilogue (count 3) |
| EIOK; LOOK; HIDE; CUT RED; PUSH ALL, with the cabinet sealed | the grey filing cabinet; YOU'VE LOST ME THERE; `hiding` 1; WHAT WIRE?; I DON'T UNDERSTAND THAT |
| waiting with the alarm on | guards walk past the window, stand in the doorway and come in, up to five |

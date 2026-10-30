# Episode two, The Bomb: facts

Files `XXXICONS` (`$1000`-`$1FFF`) and `XXXPART2` (`$4000`-`$CFFE`), with
the OS reinstalled from `XXXMYOS2`; started at `$4077` (`episode_start`).
Every fact names the routine or table it comes from, in this part's
listing.

## Memory

`$01` = `$15`. The screen is the OS's bitmap at `$2000` with its colours at
`$0C00` (resident `video_setup`).

| Range | What |
|---|---|
| `$1000`-`$1FFF` | the icon pictures (`pic_assessment` to `pic_photo`) and the hand pointer's sprites |
| `$4000`-`$4071` | `objects_at` (48 objects), then the variables and the story's flags |
| `$4077`-`$A9FF` | the code, the texts each routine prints beside it, and its tables |
| `$AA01`-`$ADFC` | the text reader, the vocabulary (`vocabulary`, `$ABBA`) and its tokens |
| `$ADFD`-`$BB9A` | `location_records`: 249 locations of 14 bytes |
| `$BB9B`-`$C4A5` | the location names (138 plain strings) |
| `$C4A6`-`$C91B` | the three tile pictures: the tube map, the estate plan, the ID card |
| `$C91C`-`$CEDB` | `dictionary`, 301 words |

## The screen and the controls

`main_loop` (`$4165`) shows the location's two names in the windows at the
top (`show_location`), then the hand pointer chooses one of seven icons
(`main_menu`): manipulate, assessment, utilities, look, wait, move,
communicate. Manipulate, utilities, look, move and communicate open a
window of their own icons, drawn in another colour where they cannot be
used here; BACK leaves it. Every choice
counts as a move (`moves`, `$4042`).

The episode enables no interrupt and makes no sound: no instruction names
the video chip's interrupt registers, the CIAs' or the sound chip
(register census). The interrupt vector keeps the title's handler,
`$413F`, which never runs.

## Places

- 249 location records (`location_records`, `$ADFD`), 14 bytes each:
  bytes 0-7 the exits north, east, south, west, enter, leave, up and down
  (`$FF` none); byte 8, 0 in every record; byte 9 the directions the
  feature guards, a bit each (`direction_bits`, tested by
  `check_feature`); byte 10 the feature kind; bytes 11 and 12 the two
  names; byte 13 the presence text (`presence_texts`, 96 of them), `$FF`
  none.
- `show_location` prints the names in windows 0 and 1 (x 9, y 3 and 10,
  22 by 4 cells) with `print_string`, 20 characters to a line;
  `wrap_check` in the OS carries a longer word to the next line.
  `test_levels.js` runs `print_name_0` and `print_name_1` for all 249
  places against the Maps tab's drawing.
- Location 0 and location 20 are blank records whose exits all lead to
  location 0. Nothing leads to 20; Euston Road's west exits (17-19) lead
  to 0 through a deadly road, which ends the game (`game_over`) first.
  Euston Road's location 18 south and 19 north, and the estate's location
  200 south, lead back to themselves. Four exits are one way: 48 up to
  174, 122 north to 120, 134 west to 135 and 161 west to 171.
- The Faslane estate is locations 197-248, every one FASLANE: ANOTHER
  IDENTICAL STREET, and the only places whose compass exits fit a grid
  (laid out from location 200, every two-way exit one step). No exit of
  any other place leads into it, and none of its exits leads out.
- Examining the tube map (object 2), the piece of paper (11) or the ID
  card (6) runs `picture_tube_map`, `picture_plan` or `picture_id_card`:
  `show_tile_picture` opens a window of 14 by 7 cells at x 13, y 10 and
  fills all of it from `tiles` and a colour map, over the window's frame.
  The ID card's photo (`pic_photo`) goes over its top left 5 by 4 cells.
  `test_levels.js` holds the Maps tab's three pictures to it.
- London, Bristol, Dover and the Faslane estate. The tube's lines
  (`tube_lines`, `$7748`) are the Circle line both ways, the Victoria line
  and the Piccadilly line; a ticket costs £1 at any ticket office
  (`talk_tube_ticket_office`) and a barrier without one ends the game
  (`feature_ticket_barrier`).
- Trains run only from Victoria to Dover Priory and from Paddington to
  Bristol Temple Meads, each way, £19 a ticket (`train`,
  `buy_rail_ticket`). Bristol's buses run once the harbour master has
  said the Mistral is due (`bus`, `buses_running`).
- Crossing Euston Road west runs you over: a bus, a C5, a juggernaut or
  a taxi (`road_deaths`).
- The lifts take a code (`lift`, `$496C`): ASPEN at Gordon's, 42431282 or
  EPC at Sentinel House. One floor number serves both buildings
  (`lift_floor`).

## The taxi

In London (first name 1) and not at the Barbican, the taxi stops with a 25
in 99 chance (`taxi`, `$7BAF`), and WHERE TO? takes a word. The 18 tokens
0 to `$11` go to the places in `taxi_destinations` (`$7C6F`): HOUSES
(Bridge Street), PARLIAMENT, BOSTO(N MANOR), GORDON, EUSTON, PORTLAND,
GOODGE, REGENT, OXFORD, NOTTIN(G HILL), TRINITY, TOWER, PADDINGTON,
LIVERPOOL, KENNINGTON, HEATHROW or AIRPORT, VICTORIA, and BOMB, which is
location 200, a street of the Faslane estate where the bomb is hidden.
The fare is £5. *Live*: from Gordon Street, BOMB took Preston to
FASLANE: ANOTHER IDENTICAL STREET and his money from £50 to £45.

## Objects and money

- 48 objects (`objects_at`, `$4000`): a location, `$FE` carried, 0 not in
  play, `$FD` given away. They start from `object_starts` (`$7F03`).
- TAKE adds up `object_weights`: with more than 10 carried nothing more can
  be taken; a negative weight cannot be picked up at all (`take`).
- The articles are in `object_articles` (`$7CD8`), 0 A, 1 AN, 2 SOME,
  3 A PIECE OF, but the table has 47 bytes for 48 objects. Object 47, the
  notice board at the estate's gate, reads the next byte, the first of
  `object_names`, `$67`, and `print_article` prints A PIECE OF for
  anything above 2. *Live*: YOU SEE A PIECE OF NOTICE BOARD.
- `money` (`$404F`) is one byte and starts at 50. `pay` (`$A7E7`) ends
  the game when the wallet is not carried or the money is short. The
  Treasury's authorization adds £200 (`use_authorization`), which wraps
  past 255: *live*, £60 became £4.
- `efficiency` (`$4041`) starts at 1 and grows by fixed amounts as the
  story moves on (`add_efficiency`); nothing caps it at 100.

## The telephone

A telephone (feature kind 9: Liverpool Street, your new office, the
communications centre and Bristol Temple Meads' annex) asks NUMBER? and
looks the word up (`telephone`, `$81B7`). Five numbers answer, each while
its flag is set and once (`phone_numbers`, `$8231`): Glasgow 0412026,
Dover 03042078, Special Branch 427010, Bristol harbour 02726514 and
Harwich harbour 0255502.

The test lets through more than the five: it takes the token less `$17`
when that is below `$1C`, 28 values, so 23 other words of the
vocabulary (tokens `$1C`-`$32`) jump through bytes past the table's end.
PAPER lands on `unobtainable` and says NUMBER UNOBTAINABLE; SVETOFOR jumps
to `$D040`, in the video chip's registers. *Live*: after SVETOFOR the
screen stayed at *** CONNECTING *** and the processor had halted on a
`$D2` byte at `$46C2`.

## The story's end

There is no winning ending. The trail runs from Harcourt Smith's riddle
(`talk_harcourt_smith`) through the computer searches
(`talk_programmer`), Bristol, Dover, the suspects' flat and the Tower, to
Winkler, whom Blodwyn names from the photo (`talk_c`). The bug planted on
him (`use_tracer_bug`) leads to Faslane (`$6EA3`). On the estate the
Geiger counter reads each plot's radiation (`geiger_readings`, `$6F5B`, 8
nearest the bomb), and the guard at the gate (213) answers one question
about a plot (`talk_estate_guard`): A3, B5, C1 and D5 name their
buildings, any other code one of eight at random. B5 is THE TIPTREE
BANANA BUILDING (`plot_b5`), and TIPTREE is the code word episode three
asks for. The guard then says that if you have the name of the building,
off you go.

The game ends early in many ways, each through `game_over` (`$445B`):
a magnum examined (a 25 in 99 chance) or used, the aqualung or the
macrame book used, HELP asked of the help computer, the Treasury's
terminal examined twice, a ticket barrier without a ticket, Euston Road,
a fare that cannot be paid, or the suspects' flat or the Tower entered
unarmed.

## Other routines

- `use_computer`: the help utility, ten hints by keyword (LIFT, POEM,
  BARBI, BLODW, TREASUR, TRAVEL, WASHER, FASLANE, MONEY, SEARCH); HELP
  sends it into an infinite recursive loop and it explodes.
- `nth_object_at` (`$6A24`) stops the machine with DEBUG ERROR and
  `cnvobn` when an object is not found.
- `fill_memory`, `copy_page`, `read_number` and `pointer_other` are in the
  file and never called.

## Live tests

VICE v3.14.0, 30 October 2026, from a snapshot of the first screen
(Gordon's, your office), with the location and the objects carried set
by hand before each test.

| Set up | Done | Result |
|---|---|---|
| Gordon Street (15), the wallet carried | MOVE, TAXI until a cab stopped, BOMB | location 200, FASLANE: ANOTHER IDENTICAL STREET; £45 |
| your new office (104) | COMMUNICATE, TELEPHONE, PAPER | NUMBER UNOBTAINABLE |
| the same | TELEPHONE, SVETOFOR | *** CONNECTING ***, then nothing: the processor halted at `$46C2` |
| the estate's gate (213) | LOOK, LOOK AROUND | the gate's text, then YOU SEE A PIECE OF NOTICE BOARD |
| the accounts office (91), the authorization carried, £60 | MANIPULATE, USE, the authorization | THE CLERK TAKES THE AUTHORIZATION AND HANDS YOU £200; money 4, efficiency 1 to 12 |
| a checkpoint on `$413F` for the taxi test | — | no hits |

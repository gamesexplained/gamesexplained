# The travelogue: facts

File `H`, on both sides of the disk, unpacked at `$1000` and run by the
shell as a subroutine before each event, unless the menu's option 7 has
turned it off. Every fact names the routine or table it comes from, in
this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$1592` | the code: start-up, the two raster interrupts, the globe, the frame, the page |
| `$1593`-`$1690` | the pages' and names' pointers and the table of screen codes (`text_codes`, `$15A3`) |
| `$1691`-`$2410` | the eight pages about the events, 432 characters each (`pages`) |
| `$2411`-`$24EC` | `draw_picture`, which draws a picture cell by cell |
| `$24ED`-`$27FF` | the pictures' pointers and the first pictures |
| `$3000`-`$33FF`, `$3960`-`$3B0F` | the globe's map and its round masks, the same bytes as the title's |
| `$7000`-`$73FF` | the character set of the text window (`trav_charset`) |
| `$9000`-`$9FFF` | the pictures: the airliner (`airliner_pic`) and one for each event |

## The screen

- The top of the screen is a multicolour bitmap in VIC bank 1, the
  screen at `$4000` and the bitmap at `$6000`; from line 114 down it is
  text, the screen at `$4400` and the character set at `$7000`
  (`trav_irq_text`, `$1191`).
- The globe turns as on the title, drawn by its own routine
  (`trav_draw_globe`, `$11E0`): each byte of the map shifted right two
  bits for each position within a cell, with the bits from the cell
  before.
- A dot marks the event's country on the globe, turned on and off every
  fifth frame (`country_dots`, `$12E9`; `$10FD`).
- An airliner with the airline's name flies along a route drawn as two
  lines across the bitmap (`route_top`, `$1309`; `route_bottom`,
  `$1331`).
- The page about the event, twelve lines of 36 characters, goes into a
  framed text window with the event's name in the frame's top row
  (`event_page`, `$14AB`), and the event's own small picture at column
  4, row 4 (`picture_ptrs`, `$24ED`).

## The text

The pages are stored as ASCII, small letters for the body: `text_codes`
(`$15A3`) turns capitals (`$41`-`$5A`) into screen codes 1 to 26 and
small letters (`$61`-`$7A`) into `$41`-`$5A`, the character set's own
order. The pages are in the order caber toss, cliff diving, sumo,
barrel jumping, slalom, bull riding, log rolling, weightlifting
(`pages`, `$1691`), each found by the event's number (`page_ptrs`,
`$1593`).

## Leaving

The page waits for the fire button on either joystick, with no time
limit, then blanks the screen and returns to the shell, which loads the
event (`$10A4`).

## Registers

The VIC-II's bank, bitmap and text modes split by two raster
interrupts, and colours; CIA 1's and CIA 2's timers and interrupts
stopped at the start, CIA 1's ports read for the fire button. The
travelogue makes no sound.

## Strings

The eight pages in ASCII (`pages`) and the events' names for the
frame's top row (`event_names`, `$15FF`).

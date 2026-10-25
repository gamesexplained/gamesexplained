# The 3D view — verified technical facts

GDRIVE01, the driver that draws the view in towns and dungeons, which
DUNGEON loads at `$C000`. Every address here is the view part's. Unless
marked *live*, a fact comes from the code in `phlan_party`. Live tests are
listed in the game's own `facts.md`.

- 25 JMPs at `$C000` are the driver's entries (`gdrive_jump_table`):
  `view_init`, `draw_view`, the processor-port switches, `square_info`,
  stepping, and block copies.
- The map is at `$0400` (`map_ptr`, `$C075`). A square's number is its
  row times 16 plus its column (`square_index`, `$C29D`). Its north and
  east walls are the high and low halves of its byte in the first page,
  south and west of its byte in the second (`wall_at`, `$C39A`): a wall
  number from 1 to 15, 0 for open. The third page holds a byte for each
  square (`square_info`, `$C3D2`).
- `draw_view` (`$C183`) clears an 11 by 11 buffer to sky, horizon and
  ground (`clear_view`, `$C322`), then draws 23 wall pieces, farthest
  first: two squares ahead to here, two to the left to two to the right
  (`piece_across`, `$C215`). Each wall number picks a shape of 156 bytes
  of characters and as many colours from the wall sets in the RAM under
  the KERNAL (`draw_wall`, `$C48A`).
- `show_view` (`$C2B5`) copies the buffer to the screen and colour RAM.
- The driver can show objects as sprites 2 to 7 (`draw_objects`,
  `$C6BA`); the adventure module turns that off (`show_objects`,
  `$C050`) and keeps the doors' bits in the map's fourth page instead.

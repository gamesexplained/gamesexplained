# Navigation: facts

A system's chart in memory: `NAV.TIL` at `$4000` and the system map
`Qn` at `$5100`. Every address is in this part's listing, built from
`work/nav.vsf` (Karonus, the file `Q0`). The code that reads them is the
engine's.

## The tile set

- `NAV.TIL` holds 128 chart tiles, 16 pixels by 16: pixel row r of tile
  t has its left byte at `$4080` + `$100` × r + t and its right byte at
  `$4000` + `$100` × r + t (`nav_tile_pixels`), drawn by `draw_chart`
  (engine `$8658`).
- `nav_tile_kinds` (`$5000`): the high nybble is the sector's kind, 0
  open space, `$20` nebula, `$30` shard field, `$50` asteroids, `$60` an
  A3 star, `$70` a G2 star, `$80` binary stars, `$90` a black hole; bits
  0-1 the frames a tile animates through. The kind picks the objects met
  there (`sector_object_lists`, engine `$16C9`), QUERY's text and
  whether HELM is slowed (`sector_kind_flags`, engine `$1703`).

## The system map

| Range | What |
|---|---|
| `$5100`-`$54FF` | `system_grid`, 32 × 32 tile numbers, the top row (Y = 31) first: sector X, Y at `$5100` + 32 × (31 - Y) + X |
| `$5505` | the system's name, "Karonus" |
| `$5510`-`$55EF` | 32 entries: column, row, flags, chart tile, object type, extra byte, QUERY text word (`system_map_x` to `system_map_messages`) |
| `$5610`-`$5611` | the orbits' phases |
| `$5612`-`$5617` | the danger level and the five ship class weights |
| `$5620` | the bases' map file names, four bytes each |
| `$5630` | the gates' data, four bytes each |

- Entry flags (`system_map_flags`, `$5550`): bit 7 a base, bits 3-4 a
  heading, bits 0-2 the motion kind: 1 a random step a day (the
  hazards), 2 none, 3 the 16-step orbit and 4 the 32-step orbit, both
  placed by the date when the map is loaded (engine `$2D60`).
- Object types (`system_map_type`, `$5590`): `$0D` planetoid to `$15`
  black hole are made when the ship enters the sector; `$64` and up are
  hazards, counted rather than made; `$FF` a marker that only carries a
  QUERY text.
- In Karonus (`system_danger`, `$5612`): danger 40, and the class
  weights 10 Hunters, 10 Darts and Corsairs, 45 Scows and Tankers, 30
  Cruisers and Titans, 5 Wasps and Vultures. The bases are `L00`,
  Hiathra, and `L01`, the MiCon I Outpost (`system_base_files`,
  `$5620`). The gates (`system_gates`, `$5630`) lead to Deneb (system 1)
  at sector 2, 9 through 17 rings, and Gryphon (system 2) at 2, 1
  through 8, as many rings as the light years on each gate's text.

## Systems

- Side 2 holds `Q0`-`Q7` and `Q9`, nine maps. `load_system_map`
  (engine `$2E7A`) loads "Q" and the digit of `$071D`.
- System 9 is the Manchi system: docking anywhere in it wins
  (`dock`, engine `$7094`). A talk script can send the player there,
  to sector 0, 0 (`talk_end`, station `$E7C7`).

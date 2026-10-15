# Flight: facts

What the engine loads over itself for flying: `SEG0` at `$A500`, `END`
at `$E900` and the models at `$E400`. Every address is in this part's
listing, built from `work/approach.vsf` (Hiathra Starbase in sight).
Every fact names the routine or table it comes from.

## Memory

| Range | What |
|---|---|
| `$A500`-`$B26A` | the logarithm tables: `log_add_table` (`$A500`), `log_sub_table` (`$AA00`), `log_sub_near_lo`/`_hi` (`$AE00`), `exp_table_lo`/`_hi` (`$AF6B`), `log_table` (`$B16B`) |
| `$B26B`-`$B787` | the log arithmetic: `log_sub` (`$B35B`), `log_add` (`$B392`), the conversions `lin_to_log` (`$B45A`) and `log_to_lin` (`$B5E0`) |
| `$B788`-`$BC62` | `tac_fill`, `tac_copy` and the two view clears |
| `$E400`-`$E8FF` | the model heap: `STA` (the starbase) and `ICR` (the Cruiser) in this snapshot |
| `$E900`-`$EAFF` | `INIT` or `END`, the same 512 bytes: `init_game`, `game_over`, `load_resident` |

## The logarithms

A number in the engine's 3D maths is a log2 in 16 bits, a fraction
byte and a whole-part byte, with a sign byte beside it.

- `log_add_mag` (`$B398`): log(|a| + |b|) is the larger log plus a
  correction for the difference d of the two, from `log_add_table` for
  d below 5.0 (256 × log2(1 + 2^(-d/256)) less 1), small fixed steps
  for 5.0 to 9.5, nothing beyond.
- `log_sub_mag` (`$B361`): log(|a| - |b|) takes its correction from
  the 16-bit table at `$AE00`/`$AF00` for d below 1.0, where the result
  can fall far below both numbers, from `log_sub_table` for 1.0 to
  4.996, and from the pieces at `$B26B`-`$B2C8` for 5.0 to 9.
- `lin_to_log` (`$B45A`) finds the top nonzero byte of a 16.8 number,
  shifts 8 significant bits down and looks them up in `log_table`;
  `log_to_lin` (`$B5E0`) takes the mantissa 2^(i/256) × `$4000` from
  `exp_table_lo`/`_hi` and shifts it by the whole part. Both patch the
  shift into a branch's offset (`$B49F`, `$B5F5`).
- `MAIN` calls these by address. At a base `SEG1` is loaded at the same
  addresses, so nothing in `MAIN` that does 3D maths can run there.

## INIT and END

- `init_game` (`$E900`), run once from `SR`: a new game copies the name
  from `$BF00` to `$0711`; zero page `$38`-`$FF` is cleared and `MAIN`,
  `SPB`, `EXTERN` and `FONT` loaded (`load_resident`, `$EA3E`). An old
  game loads `SAVED` to `$0403`; a new one sets up the first sector.
  Both load `SEG0` after asking for side 2.
- `game_over` (`$E972`): the death text for what killed the player
  (`$0835`: a missile, a ship, an object or a hazard; disk texts
  `$CF67`-`$CF6E`, or `$CEAF` less a negative value), then side 1 and
  `TITLE` again.
- A base loads `SEG1A` over `$E400`-`$EAFF`, and leaving loads `END`
  to put `INIT`'s bytes back (`load_end`, engine `$14E5`).

## Models

- A model is code and tables: a prologue that points `$7A`/`$7B` at
  its 36-byte header and jumps to `draw_model` (engine `$7C61`), then
  the header (counts of points, reference points, normals, polygons and
  axis vectors, and 15 pointers), then the tables
  (`sta_model`, `$E400`).
- `load_model` (engine `$1C95`) loads one at the heap's next address
  and relocates it: the prologue's two immediate loads and the 15
  pointers get the load address added, and the heap moves on by the size
  word (`sta_size`, `$E42F`).
- The points are built from axis vectors: each point is its parent plus
  or minus one axis vector (`sta_parents`, `sta_axisidx`). Normals are
  made on first use from two edges of a polygon (`sta_normals`).
- The face groups (`sta_groups`, `$E5C7`; sizes 6, 5 and 5,
  `sta_groupsizes`): group 0 is the starbase's docking face.

## Live tests

- *Live*, 14 October 2026: from `approach.vsf`, calling the docking
  routine (engine `$7094`) at the top of the flight loop loaded the base
  files and printed "Docking privileges at Hiathra granted"
  (`orientation.md`).

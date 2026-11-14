# Complex 7: checked facts

Addresses in this file are Complex 7 unless another load or the shared resident part is named. `../../orientation.md` identifies the entry and play snapshots.

## Images and loaded memory

- The original unpacker consumes the PRG header as part of its packed
  serial stream. Running that unpacker in the kit's CPU simulator gives
  payload bytes identical to all four live loader hand-overs: 62,458,
  54,126, 54,126 and 54,366 bytes respectively. The exact ranges are in
  `orientation.md` and the answers in `media.json`.
- The first load enters at `$2800`; its initialization ends in the jump
  at `$296B` to `$64FE`. Later loads enter through a replacement jump at
  `$3200`. Their targets are `$5F15`, `$61B7` and `$6671`.
- `$196A` is the hardware IRQ entry. It preserves A and the processor
  port and jumps through `$0028/$0029` with I/O visible. The shared exit
  at `$1975` installs another body and raster line. The low-memory NMI
  target at `$339E` is an `RTI`.

## Text and the status font

The status/title character set starts at `$2000`. The glyph sheet was
rendered and inspected, then compared with the mapping instructions at
`$1CF0-$1D54`:

| Stored bytes | Displayed text | Glyph indices |
|---|---|---|
| `$20` | space | 0 |
| `$30-$39` | 0–9 | 1–10 |
| `$41-$5A` | A–Z | 11–36 |
| `$5B` | period | 37 |
| `$5C` | exclamation mark | 38 |
| `$5D` | plus | 39 |
| `$5E` | minus | 40 |

The printer adds `$D1` below `$40`, except for space, or `$CA` from
`$40` upward; the results wrap to one byte. Stored `NOW LOADING[[[` thus
displays `NOW LOADING...`. Each call has an inline little-endian screen
offset and zero-terminated string. The printer adjusts the stacked
return address to skip that data. Sixteen such arguments were decoded.

## Moving graphics

- The shared directory at `$1C48-$1CEF` has 84 shape indices and 79
  distinct descriptors. Parsing their eight-byte headers and the
  four-byte extensions selected by header bit seven covers every byte
  from `$199C` to `$1C47`, without gaps.
- A descriptor supplies X/Y offsets, two layered main bitmap indices,
  colours, lower vertical pieces and, when enabled, a weapon piece.
  The renderer at `$BC84` places the components in sprite slots 5–7.
- The four bitmap directories have 279, 279, 271 and 259 entries. They
  start at `$C73C`, `$BDA7`, `$C2CA` and `$C621`. Their source unpacker
  entries are `$BEC1`, `$B52C`, `$BA4F` and `$BDA6`.
- A directory word contains an offset relative to its directory and a
  bit-fifteen selector for pair-wise rather than bit-wise reflection. A zero high byte selects 63 bytes of
  `$FF`, with no packed stream read. Other entries expand to 63 bytes.
- Loads 1–2 use `$C8` as a literal escape and `$C9-$CF` for runs of one
  through seven zeros. Loads 3–4 use `$48` and `$49-$4F`. These immediate
  comparisons were read from each load's own unpacker.
- `$1000-$10FF` reverses four two-bit groups; `$1100-$11FF` reverses
  individual bits. All 512 table entries match those formulas.
- Decoded and mirrored pixels were compared against execution of the
  original CPU routines for every directory entry in every load:
  **2,176 cases matched**. The packed streams occupy contiguous ranges
  `$C96A-$EEAC`, `$BFD5-$EC0F`, `$C4E8-$EDED` and `$C827-$F168`.

## Room backgrounds

- The route tables select eight rooms per load. The map allocations hold
  eight 60-byte records in loads 1, 3, and 4, and ten in the docking load. Ten columns
  each contain five tile numbers and one byte of reflection bits. Each
  tile covers four by four character cells; the resulting playfield is
  forty columns by twenty rows.
- The first load's room records begin at `$3C2F`; the others begin at
  `$3C37`, `$3C27` and `$3B2F`. The original map readers advance by
  `$3C` bytes per room.
- The tile writers are at `$C300`, `$B96B`, `$BE8E` and `$C1E5`. Their
  unrolled code reads sixteen glyph planes and eight packed colour
  planes, selecting another plane offset for reflected tiles.
- Per-room tables select the three multicolour backgrounds and a
  character-bank exchange. The fourth load's exchange begins at `$0810`;
  the other three begin at `$0800`. The differing immediate operand was
  read from the fourth load's own exchange routine.
- Base screen/colour arrays and character-bank selections were checked
  against the original routines: **1,700 tile calls and 34 room-bank
  cases matched**. These are base backgrounds, before actors and
  state-dependent tile animation modify them.

## Sound

- The first three loads hold identical bytes at `$EEAE-$FB9B`, the music
  player and its data. The fourth has a relocated player beginning at
  `$F16A`. The sound-effect player at `$FC2F` is shared.
- In Complex 7, the game requests music 1 on the title path, music 2
  before gameplay and music 3 before the next-load messages. The request
  helper at `$8740` stores the number into `$EEAF`.
- The shared effect initializer reads sixteen-byte records from
  `$FEDA`; the payload ends at `$FFF9`, giving eighteen records. The
  effect allocator at `$32DA` uses the priority bytes at `$331A`.


## Local mechanics

- `$8879` gates player actions against elapsed game-clock ticks and dispatches through the fifteen-word table at `$8CE2`. Idle walking uses pose bytes `$8A9B`, displacements `$8ACB`, and intervals `$8AEB`.
- `$8C2A` accepts manual body-change up input only when the other body has at least 33 energy. Automatic exhausted-body handling at `$8A79` uses its own threshold of 32. These are separate readers.
- `$9159` adds two active energy. Values crossing 225 initialize an explosion, empty that body, and switch `$45`.
- `$A67D` collects revealed drops. Type zero removes 20 active energy. Types 1–4 add energy; type 5 adds six laser charges and type 6 adds ten piston charges, capped at 99. `$A822` adds six character energy capped at 224.
- `$9E55` expires uncollected drops. Positive types add two to the Master, capped at 48. Type zero reduces Master energy on expiry. `$C0FE` draws the energy indicators.
- `$B1C2` checks attack masks and persistent prerequisites before reducing security-system strength. A final hit updates persistent state, changes room tiles, awards progress, and queues feedback. `$B349` separately moves the eight seventeen-byte platform records at `$6BAA`.
- Actor source records at `$770A` are thirty bytes. Their callbacks select placement and updates. Ordinary animation frames at `$7B24` use a shape pointer plus delay; the high delay bit restarts the cursor. `$AD9D` updates these cursors; `$AC42` stages their component shapes.
- Death/drop frame data is `$AAB8-$AB0B`. The following `$AB0C-$AB0E` is executable `JSR $AD9D`, falling into component staging at `$AB0F`.

## Retained data

The eleven sixteen-byte images at `$B504-$B5B3` draw digits and a currency sign. Their later use remains open. The authored player descriptors contain 79 distinct records behind 84 indices.

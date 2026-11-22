# The Last Ninja — verified technical facts

## Tape chapters and resident code

- The six steady gameplay captures have chapter letters A through F
  at `$0805`. `$0804` gives the next letter. It is B through F for
  the first five captures and A in the Inner Sanctum.
- In the Wastelands, the main loop tests `$02AF` at `$BD4D`.
  Setting it to 1 took the game to its transition at `$CE80`. The
  same edit before each of the next four transitions let the game's
  loader bring in all six chapters across the two supplied tapes.
- Comparing all six play snapshots shows `$53F9–$9DFF` holds
  18,951 byte-identical bytes, including the IRQ entry at `$554D`.
  The 352 bytes at `$CE80–$CFDF` also match. The Wastelands loop
  waits at `$BD14`, while the Wilderness waits at `$BCBE`. The
  handover snapshots and intercepted tape reads assign the six
  chapter overlays to the address ranges in their part manifests.
- Holding right on port 2 for 24 PAL frames changed sprite 1's
  coordinates in each capture.

| Chapter | Before | After |
|---|---|---|
| Wastelands | `$6C/$82` | `$84/$83` |
| Wilderness | `$18/$8E` | `$30/$8F` |
| Palace Gardens | `$18/$A0` | `$21/$A1` |
| Dungeons | `$18/$9E` | `$30/$9F` |
| Palace | `$55/$AF` | `$6D/$B0` |
| Inner Sanctum | `$9C/$98` | `$B0/$98` |

## Rooms and screen edges

- The picture reader at `$5DFE` uses a five-byte room record at
  `$0808 + 5 × slot`. The first byte indexes a pointer page and bit 0
  of the second byte chooses the page. The low nibble of the final
  byte is the VIC background colour. It draws through `$E000` for the
  bitmap and `$C000` for the per-cell screen colours.
- A script entry starts with a pointer selector. Tagged destinations
  are bitmap descriptors. Other destinations call another script.
  The following two bytes give placement coordinates when the entry
  draws a bitmap. Bits 5–6 of the fourth byte count the colour remaps
  that follow it. Bit 6 of the third byte ends the script at that level.
- The native renderer produced all 135 populated picture slots
  against the six captured chapters. At each chapter's opening, its
  bare bitmap agreed with 34,253 to 34,275 of 34,560 playfield pixels
  in VICE after mapping the palette colours. Those comparisons did
  not render the sprite layer.
- `$7478` maps a point beyond the playfield edge to a number that
  increases clockwise. It compares the number with four thresholds
  at `$AF00 + 8 × room`. It takes the first greater threshold, or
  entry zero if it finds none. The next four bytes contain the
  destinations in the same order. Exhaustive probes of 115,020
  boundary coordinates across the populated slots matched the
  decoder and the chapter-exit flag.
- `$74F5` puts the high six bits of the destination at `$A2`.
  Zero sets the end-of-chapter flag at `$02AF`. The low bits select
  an entry variant via the `$FF3C` lookup.

## Sprites and music

- In the first Wastelands room, hardware sprites 1 and 2 carry
  Armakuni's lower and upper poses. Seven distinct walking poses
  were captured at four-frame intervals. Their sprite pointers
  alternate between the buffers at `$C840/$C880` and `$CA40/$CA80`.
- The loading driver enters at `$BF00` and advances at `$BF10`.
  These wrappers use `$B000` and `$B003`. The gameplay engine
  calls the latter two directly, passing `$B728` in X/Y to the
  initialiser at `$B000`. During 120 PAL frames in the Wastelands,
  the raster path and `$B003` each counted 119 calls.
- The page's 12 tracks each matched 6,000 steps of timestamped SID
  writes from their full tape payloads on the kit's 6502. The test
  also renders three seconds from each track and checks for sound.
- F1 reached the keyboard branch at `$6EAC` in live play. The
  first press changed `$AA` from `$FF` to 0 and stopped the music
  state at `$B712–$B71D` from advancing. Releasing and pressing
  F1 again restored `$AA` and the state advanced from the held
  position. The code clears `$D400–$D417` when muting and leaves
  the driver's RAM state intact.

## Collision and foreground shapes

- The room collision data starts at `$CC00`. The game expands chains
  of connected lines into five-byte segments at `$0334`, ordered by
  X within each segment. An independent decoder reproduced the
  native output for all 162 selectable room records across the
  six chapters, including 1,006 segments.
- The engine uses `$DF00` to choose a list of foreground shapes for
  the room. Each descriptor gives a shape selector, depth cutoff,
  and cell position. At `$704A`, the depth test determines whether the
  mask can be applied to the sprite bitmap.
- The common packed sprite table addresses 171 complete non-tail
  bitmaps. An independent decoder reproduced the 63 output bytes
  of each of them from `$7E36`. The shared reversal table at `$9D00`
  matches the bit reversals of all 256 possible byte values.

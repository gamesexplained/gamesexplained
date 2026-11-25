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
- The native renderer produced 135 populated pictures in slots 1–27
  across the six captured chapters. At each chapter's opening, its
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
- The page's 12 tracks each matched 90,000 steps of timestamped SID
  writes from their full tape payloads on the kit's 6502. The test
  also renders three seconds from each track and checks for sound.
- F1 reached the keyboard branch at `$6EAC` in live play. The
  first press changed `$AA` from `$FF` to 0 and stopped the music
  state at `$B712–$B71D` from advancing. Releasing and pressing
  F1 again restored `$AA` and the state advanced from the held
  position. The code clears `$D400–$D417` when muting and leaves
  the driver's RAM state intact.

- The Wastelands, Wilderness, Palace Gardens, Palace and Inner
  Sanctum have identical driver code and initial state at
  `$B000–$B727`. The driver reads three streams of two-byte
  commands and note events. The Dungeons initialiser copies its
  own pattern and sequence pointers to zero page and uses
  47-byte instrument records. It writes voice registers directly
  to the SID.
- The Dungeons temporary sweep saves the downward step's high
  byte in the slot used to restore the downward countdown.
  At `$BADF`, A still holds instrument byte `$1F`. The old
  countdown was loaded into Y by the preceding instruction.
  In a direct call to the original code, the countdown went
  from 31 to 22 when the new step began and came back as 7,
  the saved instrument byte, when `$BB10` ended the sweep.

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
- The Wastelands actor descriptors at `$DA4C` and `$DA5C` select
  local sprite IDs 49 and 50. Calls to the original selector at
  `$7E1B` resolved those IDs to raw 63-byte bitmaps at `$AA40`
  and `$AA80`. The final byte of each 64-byte slot lies outside
  the bitmap.

## Keyboard timing

- In the Wastelands, CIA 1 timer A began with a period of `$4800`.
  After the first 24 frames with the keys held, the next 24 frames
  yielded 25 game ticks with no keys or with minus alone, 18 with
  left Shift and minus, and 58 with right Shift and plus. The
  respective final timer values were `$4800`, `$7000` and `$1F00`.
  The press goes through the matrix scan at `$6E99` and the timer
  change through `$6F6D`.
- Holding F7 changed the pause byte `$02B7` from 0 to `$FF`. The
  tick counter at `$1B` held at 240 for the next 24 frames.
- The F3 and F5 branches step forward or backward through the
  11 item slots beginning at `$03EC`. Space walks six weapon slots
  beginning at `$03F6`. Both paths skip unoccupied slots.


## Items, lives and the status panel

- The item painter at `$63CB` selects one of two panel positions.
  For codes 0–9 it reads a 64-byte graphic from `$DC80 + 64 × code`
  with the I/O registers banked out, then draws the graphic as eight
  bitmap cells in two rows. All ten bitmaps matched the bytes drawn
  to both positions. Code 10 clears the panel. Higher codes select
  five weapon pictures, with colours and dimensions from `$652F`.
- The pickup check at `$5940` tests the hand against the rectangle
  at `$027B–$027E`. For facing values 4–7, it subtracts 36 from player X
  before the test. Direct calls verified both reaches, the exclusive
  right edge and the special inventory requirement. With inventory
  slot 2 empty, the same valid reach did not collect ordinary item 3.
- `$6E36` grants one life for an unused apple and clears its slot on
  chapter exit. It then saves the rest of the inventory. Direct calls
  with one life and no apple saved two lives leaving the Wastelands
  and one leaving the Wilderness. Two lives and an apple saved three
  leaving the Wilderness.


## Per-room initialization

- Each chapter reads a sorted list of ten-byte item records. A record
  has the room, item code, four reach bounds, sprite ID, sprite flags,
  and the sprite's X and Y. The six lists contain 23 items or
  hidden effects. A separate three-byte room table selects an
  opponent's initial action script. Independent table readers
  matched the original setup routines for all 162 room codes.
- The opponent dispatch at `$BC63` selects a pose script from the
  action code and facing. Dungeons type `$85` and Inner Sanctum
  type `$88` select alternate action offsets. An independent
  selector matched the original code in 3,392 calls across the
  six overlays.


## The ending

- Inner Sanctum room 15 supplies item code 9. Taking it writes 9
  to `$77`. The next idle pose at `$BF99` starts the sequence at
  `$5113`. Its last event, `$2D`, enters the closing card at `$4C98`.
- In VICE, I staged room 15 from the captured chapter, entered through
  its room setup at `$BCA0`, and set player X/Y to 146/109, facing
  1, and inventory slot 2 to occupied. Holding down-left and fire
  for 24 PAL frames added the scrolls to slot 9. The game then
  drew the closing card and reached `$4CD8` twice. That address
  repeats the bitmap dissolve in batches after the final text.


## Fire button

- In the Wastelands snapshot, 3,840 calls to `$5727` matched an
  independent prediction of the chosen script pointer and any call to
  the pickup routine. The test covered eight directions, four diagonal
  facings, six weapons, and boundary codes 0, 15, 16, 19 and 20.
- A new press while stationary wrote crouch flags without starting a
  pose script. While moving, a new press within one heading of the
  current facing chose the forward action. A wider turn checked for a
  pickup. With fire held, a changed heading started a four-tick wait.
  Boundary codes 16–19 sent the resulting input through the forward
  handler. Outside that range, an odd heading checked for a pickup
  before the game selected a script from the heading and weapon.

## Contact ranges

- `$7ECC` tests whether an active opponent is within the current
  attack's X and Y ranges. Twenty-one attack classes supply
  inclusive lower and exclusive upper limits from four tables
  beginning at `$7E78`. The code then checks the target's guard.
  An independent calculation agreed with 13,824 calls using the
  standard attack family, both actor slots, six weapons, four
  directions, two opponent types and four defender poses.


## Extra picture records and boundary data

- The Palace Gardens' slot 32 and the Dungeons' slot 37 repeat
  all five bytes of their respective slot 22. Isolated renders
  gave VIC backgrounds 13 and 15, respectively, for both versions.
  None of the 115,020 tested ordinary room exits selects either slot.
- The chapter's word at `$0800` gives the shape catalogue address.
  The word at `$0802` gives the number of two-byte entries. In
  play order the six catalogues contain 113, 112, 106, 107, 94
  and 101 entries. The end of each catalogue agrees with its
  chapter's stored data boundaries.
- The Wastelands, Wilderness and Palace Gardens keep 64 safe
  rectangles in RAM under I/O at `$DC00`. A boundary action selects
  a list. The game permits a position inside any rectangle and
  takes the failure branch after the list's `$FF` marker. An
  independent calculation reproduced 2,340 tests of the bounds.
- Each overlay holds the Using, Found and Collect captions at
  `$DB00`, `$DB40` and `$DB80`. These are eight-cell bitmap drawings.
  The game copies them at `$69E6` with matching colour values.


## The power meter

- The raster handler uses `$C7` as the displayed power and `$C8`
  as the target. On eligible ticks, it colours or clears one cell.
  Three 32-byte tables at `$697C–$69DB` give the screen offset
  and the two colour values for each cell.
- Before clearing a cell, it compares CIA 2 timer A's low byte
  at `$DD84` with two reads of timer B's low byte, at `$DDF6`
  and `$DD36`. The first comparison must match and the second
  must differ. Setting the meter from 32 to 31 in live PAL
  VICE took the passing branch at `$55AD`.


## The listing's error rate

Seed 1124 drew 100 of 7,830 comments across all seven listings.
Independent checkers GPT-6 Astra and GPT-5.6 Sol found zero errors.
The unweighted estimate was 0.0%, with a 95% Wilson interval of
0.0–3.7%. Weighting by stratum size also gave 0.0%. The sample
preceded the later annotations on the retained tables, game-state
aliases and SID drivers. An audit of the full listing is recommended.


## Interactive mechanics

- The action selector at `$5727` chooses scripts through `$581B`. The
  interpreter at `$5B69` supplies pose changes, movement and contact events.
  The page uses 304 frames drawn by the original sprite renderer.
- Contact at `$7ECC` selects four bounds by attack class, facing and weapon.
  A somersault rejects contact. A matching guard rejects it while `$D7 < 4`.
  The wound table begins at `$782F`; the wound accumulator caps at 32.
- The three forward somersault inputs share an animation but change the
  projected path. One tested Wastelands landing accepts X=138 and rejects
  X=139. Safe rectangles include left/top and exclude right/bottom.
- Pickup at `$5940` uses the player's coordinate, facing, inventory and
  Holding slot. Ordinary items need the pouch, except the pouch itself.
  Taking the flower without Holding the glove clears power and requests
  death. The page's marker represents the tested coordinate.
- Puzzle handlers require the amulet in Wilderness room 4, rope in Palace
  Gardens room 24, claw in Dungeons room 23, key in Palace room 7 and
  flower in Inner Sanctum room 10. The first three also test facing and
  weapon state. The flower handler tests ownership and consumes the flower.
- Enemy entry wait at `$6AF8` uses the low five random bits, plus 16 for
  a nonzero variant. Approach at `$6B5E` selects an offset target near the
  player. Close choices at `$6CA8` depend on variant and random bits.
  Close wait at `$6CEB` restarts approach after movement or three choices.
- The chapter room tables contain 302 directed exits, including self and
  chapter exits. The whole-map viewer connects 135 pictures through 289
  links to other displayed rooms and five chapter loads. Its positions
  are a display layout. They do not claim geographic coordinates or prove
  that terrain is traversable.

`test_mechanics.js` executes the published listing bytes to compare 384
input selections, 384 movement cases, 4,916 animation steps, 19,200 contact
cases, 1,024 initial enemy choices, 2,700 approach cases, 3,200 close waits,
544 pickup cases, 800 puzzle gates and 1,024 landing boundaries. It checks
all 23 room item/effect records, 302 exits, 304 rendered frames and 16
inventory pictures. The JavaScript demonstrations omit terrain collision,
projectile flight and the complete enemy controller.

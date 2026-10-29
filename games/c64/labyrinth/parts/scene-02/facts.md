# First corridor — established facts

Partial natural scene-2 image: 1,113/48,021 tracked bytes described (2.3%). This independent image scope overlaps retained resident code in other parts; shared ownership remains unresolved. The natural `work/corridor-play.vsf` and this part’s `work/play.vsf` have equal hashes. A natural pre-initialization image remains open.

## Movement columns

For captured map mode `$0343=$FF` and mask `$5E=$3F`, `$4171/$4173` computes column `(worldX >> 6) & 63` from `$0538/$053C`. The first 64 bytes at `$0600` supply cells; the low nibble indexes `$073E`. Negative translated types use effective type zero for `$41F0` depth bounds and `$4200` exit flags. The lookup repeats every 4,096 world units; this does not establish a complete horizontal wrapping route.

Columns 8,15,24,30,35,41,50,58 translate to decimal type 10, depth bound 32 and exit flag zero. All other columns in the captured first strip have effective type zero, bound 24 and flag $FF. Each column spans 64 world units. These are not screen coordinates.

Movement tail `$36EF` compares approach depth against the classified bound. At `$3772`, captured negative `$0385` makes a negative B3 flag block the exit call; a nonnegative flag calls `$4115`. Other mode branches and the rest of movement remain partial. The routine also handles retreat towards zero.

## Destination choice

With negative `$0343`, `$4115` finds the first inclusive threshold at `$074E` at least as large as the classified column. It uses fallback index 15 after fifteen comparisons. `$076E` selects a bank source; the first eight regions use selector 3, calling `$4210`. That PRNG replaces the 16-bit state `$0502/$0503` with `(37*state+17) mod 65536` and returns its high byte. Bits $60 choose one of four banks. The thresholds are 8,15,24,30,35,40,50 and then $FF, so columns 8, 15, 24, 30 and 35 select regions 0 to 4, columns 41 and 50 both select region 6, and column 58 selects region 7; region 5 (columns 36 to 40) holds no exit column in the captured strip.

Scene tables start at `$077E`, `$079E`, `$07BE`, `$07DE`; entry tables at `$078E`, `$07AE`, `$07CE`, `$07EE`. All eight opening columns choose scene 3 (The Brick Hallway) in every bank. Entry IDs identify positions inside that scene. Entry rows for the first eight regions are:

| Bank | Entries |
|---|---|
| 0 | 8,34,28,24,38,2,11,43 |
| 1 | 35,27,22,40,3,12,44,9 |
| 2 | 25,21,41,5,2,34,11,37 |
| 3 | 19,43,6,3,35,12,38,24 |

The dispatcher writes entry to `$0532` and pending scene to `$0530`. Actual loading is separate. Other activity advances the PRNG even while the player stands still; the page’s variant control exposes table possibilities, not a prediction from elapsed walking time.

## Verification

Ordinary joystick trials restored the same natural snapshot at X=96, depth=9 before each direction. After 1,200 frames idle retained those coordinates; up settled at depth 24, down at zero. Left/right changed X. A non-stopping movement checkpoint at `$3423` fired in each trial, while `$4115` did not fire.

A separate ordinary-input approach moved right, released, then pressed up. It reached X=546, depth=32 and stopped at `$4115` after 80 up frames. At that stop AF=8, B0=10, B2=32, B3=0, B7=4 and PRNG state=$435B. Continuing the dispatcher produced state $BC38, pending scene 3 and entry 35. Continuing the same ordinary-input route reached loader `$5098` with pending scene 3 / entry 35, then main-loop continuation `$59DC` with current scene 3. After sixty frames without movement input, current scene remained 3, pending request was $FF and the player remained at X=2272, depth=6. `reference/brick-natural-entry.png` records that naturally loaded state. The other seven complete walking approaches remain open. Checkpoints and joystick input were cleared and the original emulator state restored.

`test_corridor.js` runs the original code from the committed listing: 65,536 coordinate classifications, 256 column/bank exit choices, 65,536 PRNG updates, both captured flag branches and the observed scene/entry request. The page’s port and data come from its own script block. The tests cover captured modes, not every movement mode or all scene loads.

The listing reports a two-byte gap at `$07FE-$07FF`. M2 ends at `$07FD`; the gap’s ownership remains open. Resource allocation scopes were compared with unpacked M2/P2/C2, U2, AV and JG extents, but natural pre-initialization ownership remains unresolved. The new comments follow the 19 October 2026 independent sample and have not received an independent sample.

## Continuous-mode entry placement

A replay from the naturally reached loader snapshot stopped at `$543A` before placement. Current scene was 3, mode `$26` was zero, slot entries `$5080-$5082` were [35,255,26], and entry request `$0532` was 35. At `$54CB`, the player was X=2272/depth=6 and the entry request was $FF. This replay retains the naturally produced request; it does not inject a scene or entry ID.

For nonnegative mode, `$543A` skips slots whose entry is $FF. For other entries it sets world X to `64*entry+32`, player depth to six, other-slot depth to 24, clears fractional/depth-high fields and initializes the projected origins and active flags. The negative-mode grid/graph branches remain outside the widget’s claim. The placement bytes `$543A-$54CB` are identical in the opening listing, corridor snapshot and natural Brick Hallway play image; SHA-256 `c2874d5bb9d9612369a722f6788cb60a272fb64bc4c69ff2dd8fa261f4200207`.

The page’s placement calculation is compared with original execution for all 256 entry bytes, including $FF skip, plus a companion slot using the observed entry 26. Only entry 35 has a completed ordinary journey established by these trials. The new placement comment has no independent sample.

The published listing uses the name-only anonymized `work/publish-anonymous.vsf` copy. Its code and movement/route data match the natural play image; only the cached entered-name bytes differ within published records. Original captures remain private.

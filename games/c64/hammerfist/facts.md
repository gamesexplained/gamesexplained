# Hammerfist: checked facts

## Images and ownership

The Fairlight release has two disk sides. `media.json` inventories every file and allocated non-file sector. Side A contains the release intro and the original loading picture/music. Side B contains the four numbered packed loads and `LD`. Every item has an answer.

The original unpacker consumes each PRG header as part of its serial byte stream. Running it in the kit CPU yields payload bytes identical to all four native loader hand-overs: 62,458, 54,126, 54,126, and 54,366 bytes. `orientation.md` gives the precise payload ranges. These writes, rather than changed runtime bytes, define the part ownership.

The resident part owns shared low routines, the status font, player descriptors, reflection tables, effect player, and the first-load initializer. Four overlay parts own their character data and higher code/data. The first three music players have identical `$EEAE-$FB9B` bytes; the fourth replaces this bank. Each part's `facts.md` qualifies its own addresses.

The initializer at resident `$2800-$296D` is later overwritten by sprite-cache output and by the native replacement trampoline's zero-page save. The numbered replacement payloads do not load `$2800`. Consecutive changed-instruction warnings there are therefore expected; expanding the numbered payload ranges to include that runtime write would misstate ownership. The native trampoline at Complex 7 `$339F` executes indexed stores into `$2800`; the sprite unpacker at Complex 7 `$BEC1` constructs its cache destination from `$2800`.

## Shared representation

The player directory at resident `$1C48` contains 84 indices pointing to 79 distinct descriptors. Each descriptor has eight bytes and, when flagged, a four-byte weapon extension. The actor format instead supplies a reflection anchor followed by variable component records. Each component names a bitmap and flags, optional offsets, and an optional lower vertical bitmap.

| Load | Room base | Stored backgrounds | Bitmap directory | Entries | Tile writer | Sprite unpacker |
|---|---|---:|---|---:|---|---|
| Complex 7 | `$3C2F` | 8 | `$C73C` | 279 | `$C300` | `$BEC1` |
| Docking area | `$3C37` | 10 | `$BDA7` | 279 | `$B96B` | `$B52C` |
| Third | `$3C27` | 8 | `$C2CA` | 271 | `$BE8E` | `$BA4F` |
| Fourth | `$3B2F` | 8 | `$C621` | 259 | `$C1E5` | `$BDA6` |

Route tables select room numbers 0–7 in every load. Docking records 8 and 9 are extra stored backgrounds; the run makes no universal reachability claim about them. A background record has ten columns, each with five tile numbers and a reflection byte. Tile output covers forty by twenty character cells. The fourth load's character-bank exchange begins at `$0810`; the others begin at `$0800`.

The sprite directories use relative offsets. Their top bit selects pair-wise rather than bit-wise reflection when reflection is requested. A zero high byte selects a solid `$FF` image. Loads 1–2 use escape `$C8` and zero-run codes `$C9-$CF`; loads 3–4 use `$48` and `$49-$4F`. The directory flag does not by itself request reflection.

## Verified page functions

The page functions are taken from the authored HTML by the tests beside it. Their reference memory comes from the committed listings, composed through the part hierarchy.

- `test_graphics.js`: 2,176 bitmap/reflection cases, 662 component assemblies, 672 layered-player assemblies, and 4,542 actor-animation ticks and 208 impact-animation ticks match the original CPU routines.
- `test_maps.js`: 1,700 tile calls and 34 character-bank selections match all stored backgrounds. The original animation scheduler selects the same streams for each room. Every tile exposed by the animation preview matches its original tile writer.
- `test_energy.js`: 1,800 recharge cases cover every energy offered by the widget, both bodies, rooms 6/7, and first/fourth load rules. They match the original CPU instructions.
- `test_sound.js`: all twelve music selections and eighteen effect definitions match each SID register write for 600 calls per selection, 18,000 calls. The function also runs in an isolated JavaScript context as required by the sound worklet. Definition 17 has no gated activity in that setup.
- `test_frames.py`: the exact video excerpts embedded in the two pages reproduce all 104,448 pixels of each VICE image: the forced paused first-room presentation and the loading portrait. Both have zero differences.

## Sound banks

The loading player at `$EC4F-$FB8B` offers seven selections. Its loading portrait requests 4. Complex 7's `$EEAE-$FB9B` offers three: title 1, gameplay 2, and load transition 3. The fourth load's `$F16A-$FB92` offers two: title/gameplay 1 and completion 2. These are twelve stored selections, not a claim that all are distinct compositions. The page includes every selection.

The shared effect allocator at resident `$32DA` reads priorities at `$331A` and assigns the shared player at `$FC2F`. Eighteen sixteen-byte definitions occupy resident `$FEDA-$FFF9`. The page starts each through the allocator with sound mode `$80`, as the game's effects mode does.

## Targeted native instruction checks

VICE was paused and checked twice at the same PC before each isolated test. Interrupts were masked for instruction tracing; snapshots were restored afterward. These tests establish routine behavior and do not claim legal-input routes through the whole game.

- Complex 7 `$8325-$8348`: initials YCY patch `$98C1` from `$F0` to `$D0`; YAY leaves `$F0`. At `$98BF`, the original callback reaches the ordinary-fist indicator; the patched callback reaches `$AFF1` with the incremented route index.
- Complex 7 `$9159-$918E`: active energy 222 becomes 224. Values 223/224 take the explosion, clear active energy, and toggle body `$45`. The other body starts at 40.
- Fourth load `$9157-$919C`: active energy 224 becomes zero in room 6 but remains 224 in room 7. Both paths switch bodies. The room-7 path at `$9162` supplies `$E0`; its earlier `$913C` branch also skips recharge score subtraction.
- Resident `$FE13-$FE25`: X=0/1/2, Y=0/7/14, and sustain/release test byte `$A7` show `$FE1C STA $D406,X` writing `$D406/$D407/$D408`. The last two are voice-two frequency registers. The incorrect destination is established; its audible severity was not measured.
- Complex 7 manual-up callback `$8C2A`: other-body energy 32 leaves change flash zero; 33 sets it to six. F3/F5/F7 callbacks set weapon 0/2/1. F1 cycles sound mode 0, `$40`, `$80`, then zero.
- A store watchpoint on pause byte `$B3` with RUN/STOP row 7, column 7 stops after the write from Complex 7 `$6628`. An immediately entered IRQ leaves return address `$662A` on the stack, distinguishing the writer from the reported interrupt PC `$196A`.

The instruction/checkpoint records remain with the private working snapshots. The conclusions and the tests needed by the page are retained here.

## Browser checks

The session Playwright connector exercised 1188 stored graphics/map/animation choices and the page controls in Firefox 159.0. Each authored canvas drew visible content, with no page/console errors. The shared SID worklet checker rendered ten seconds from each button through OfflineAudioContext: all twelve music selections and effects 0–16 produced output; effect 17 remained silent as labelled.

## The listing's error rate

Sample seed 20261114 drew 80 comments from 10,229: 60 from 6,254 written comments and 20 from 3,975 generated descriptions. The independent gpt-6.1-sol checker found 79 right and one wrong-detail. The register/sign finding at third-load `$AA69` held: horizontal displacement enters in A, and `CMP #$80` derives its sign. That sampled comment and its three equivalents were corrected together.

The later graphics port established three false passes in that same sample: Complex 7 `$71F8` and third-load `$6E4C/$6EC8` described the vertical lower image as a clipping alternative. Native instruction tracing of resident `$18A0`, the recorded raster-pointer writes, and both sprite-cache halves establish the lower 21-row segment. All 247 comments expressing that same format description were corrected across every part. The actor subdirectory begins 126 full-directory entries after the main directory; the viewer and its tests now use that actual reader.

The settled sample therefore has four known wrong comments of 80 (5.0%), all four corrected. The 95% Wilson interval is 2.0–12.2%; both strata have an observed 5% rate, so the population-weighted rate is also 5.0%. The metadata reports this settled count and distinguishes the independent checker's original finding from the later three false passes. This is one sample, with subsequent class-wide corrections, not a fresh sample or full audit. The checker missed known errors, and may have missed others. A later full audit and a fresh sample are recommended.

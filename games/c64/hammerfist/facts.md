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

Route tables select room numbers 0–7 in every load. Docking records 8 and 9 are extra stored backgrounds that play cannot reach: see "Findings shown on Discoveries" below. A background record has ten columns, each with five tile numbers and a byte that holds their ninth bits; the tile writer reads tiles 256 and up from each plane's base+$100. Tile output covers forty by twenty character cells. The fourth load's character-bank exchange begins at `$0810`; the others begin at `$0800`.

The sprite directories use relative offsets. Their top bit selects pair-wise rather than bit-wise reflection when reflection is requested. A zero high byte selects a solid `$FF` image. Loads 1–2 use escape `$C8` and zero-run codes `$C9-$CF`; loads 3–4 use `$48` and `$49-$4F`. The directory flag does not by itself request reflection.

## Verified page functions

The page functions are taken from the authored HTML by the tests beside it. Their reference memory comes from the committed listings, composed through the part hierarchy.

- `test_graphics.js`: 2,176 bitmap/reflection cases, 662 component assemblies, 672 layered-player assemblies, and 4,542 actor-animation ticks and 208 impact-animation ticks match the original CPU routines.
- `test_maps.js`: 1,700 tile calls and 34 character-bank selections match all stored backgrounds on Maps. The two unfinished docking rooms drawn on Discoveries are the same records as the Maps data's docking rooms 8 and 9.
- `test_energy.js`: 1,800 recharge cases cover every energy offered by the Discoveries widget, both bodies, rooms 6/7, and first/fourth load rules. They match the original CPU instructions.
- `test_sound.js`: the seven tunes on How it works (Complex 7's three and the loading module's 4, 2, 3 and 5; Discoveries repeats the last three) and the eighteen effect definitions match each SID register write, 15,000 frame calls in all. The function also runs in an isolated JavaScript context as required by the sound worklet. Definition 17 has no gated activity in that setup. The same test runs the game's own three Complex 7 tunes and the fourth load's two from their listings for 3,000 frames each: loading tunes 1, 6 and 7 write the same registers as Complex 7's 1, 2 and 3, and the fourth load's 1 and 2 are the same notes as Complex 7's 2 and 3.
- `test_finds.js`: the source text at resident `$1200-$13DD` and the 22 rows of the Discoveries table against the routine bytes at `$158A`; the docking doorway list and the empty exit, interaction and object ranges of rooms 8 and 9; the YCY check bytes in all four loads; the message font (resident `$2000-$27FF`) and the twelve message lines on How it works.
- `test_frames.py`: the video excerpts embedded in Graphics reproduce all 104,448 pixels of each VICE image: the forced paused first-room presentation and the loading portrait. Both have zero differences.

## Findings shown on Discoveries

These rest on the listings and are held by `test_finds.js`, `test_maps.js`, `test_sound.js` and `test_energy.js`. None was reached in a played game. The YCY patch and the last room's charge were also run as instructions in VICE by the first run ("Targeted native instruction checks" below); the quality pass of 15 November 2026 had no disk image and ran nothing live.

- **Source text.** Resident `$1200-$13DD` holds 478 characters of assembler source as plain ASCII, lines ending CR LF. It begins with the line feed that ends a line before it, at `$1200`, so `MULTISETUP` at `$1201` starts a line; it ends mid-word. Its 22 lines (label `MULTISETUP`, symbols `S.SWAPNOW`, `S.XPOS`, `CS.XPOS`, `BANKNUMBER=20`) assemble to the bytes of the sprite set-up routine at `$158A`, instruction for instruction. Nothing reads the text. CR LF line ends suggest it was typed on a PC-style editor; that is an inference.
- **Docking rooms 8 and 9.** The doorway list at docking `$6547` has 22 entrances, all in rooms 0–7. The room number is otherwise written only at `$63ED` (room 0 at a new game) and `$A7DC` (from the doorway list). The exit boundaries at `$6DA9`, the attack-interaction boundaries (security systems) at `$6DB6` and the object boundaries (enemies) at `$6DD0` give rooms 8 and 9 empty ranges: each starts where the next room's does. Their layouts at `$3E17` and `$3E53` fill only the first three or four of ten columns.
- **Unused tunes.** The loading module at `$EC4F` stores seven tunes. Tunes 1, 6 and 7 are the same notes as the game's title, in-play and area-complete tunes (see `test_sound.js`). Tunes 2, 3 and 5 have no copy in any of the four loads. The loading portrait requests tune 4 (orientation run, 14 November 2026). Whether any other code requests 2, 3 or 5 was searched in the four loads' listings only.
- **Unused effects.** Every call of the effect routine at `$32DA` in the listings (one in resident, 29 or 30 in each load) follows an `LDA #` of the effect number. Together they ask for effects 0–2, 4, 6–11 and 13–16, so 3, 5, 12 and 17 are never asked for. Effect 17 makes no sound.
- **YCY.** Each load's initials check (Complex 7 `$8325`) compares the three letters with `Y`, `C`, `Y` and, when they match, writes `$D0` over the `$F0` at the F3 callback's branch (Complex 7 `$98C1`). The test checks the bytes in all four loads. The patch is to memory, so it lasts until the next load replaces the code.
- **Resting heal.** The status interrupt at Complex 7 `$6754` adds one to the resting body's energy every sixteen frames while it is below 33. The swap test at `$8C2A` needs the other body's energy above 32.
- **Game over.** A game over restarts the current load with the score saved at `$08-$0A` on entry to the load (Complex 7 `$667B` saves it when the area is completed; `$695A` copies it back when a game starts).

These are leads that are not on the pages:

- Resident `$FE1C STA $D406,X` writes sustain/release to `$D407`/`$D408` for voices two and three, which are voice two's frequency registers. The wrong destination is established; how it sounds in play was not measured.

## Sound banks

The loading player at `$EC4F-$FB8B` offers seven selections. Its loading portrait requests 4. Complex 7's `$EEAE-$FB9B` offers three: title 1, gameplay 2, and load transition 3. The fourth load's `$F16A-$FB92` offers two: title/gameplay 1 and completion 2. These are twelve stored selections and seven distinct tunes: `test_sound.js` shows the loading module's 1, 6 and 7 and the fourth load's 1 and 2 write the same registers as Complex 7's tunes. How it works plays Complex 7's three and the loading module's other four.

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

`ui-browser.js` drives the built pages in Chromium through `kit/scripts/play_browser.js`. It makes 927 choices across the four pages' controls, checks that every canvas draws something, and fails on any page error. On 14 November 2026 the first run also rendered ten seconds from every music and effect button through the shared SID worklet in Firefox 159.0: every tune and effects 0–16 produced output, and effect 17 stayed silent.

## The listing's error rate

Sample seed 20261114 drew 80 comments from 10,229: 60 from 6,254 written comments and 20 from 3,975 generated descriptions. The independent gpt-6.1-sol checker found 79 right and one wrong-detail. The register/sign finding at third-load `$AA69` held: horizontal displacement enters in A, and `CMP #$80` derives its sign. That sampled comment and its three equivalents were corrected together.

The later graphics port established three false passes in that same sample: Complex 7 `$71F8` and third-load `$6E4C/$6EC8` described the vertical lower image as a clipping alternative. Native instruction tracing of resident `$18A0`, the recorded raster-pointer writes, and both sprite-cache halves establish the lower 21-row segment. All 247 comments expressing that same format description were corrected across every part. The actor subdirectory begins 126 full-directory entries after the main directory; the viewer and its tests now use that actual reader.

The settled sample therefore has four known wrong comments of 80 (5.0%), all four corrected. The 95% Wilson interval is 2.0–12.2%; both strata have an observed 5% rate, so the population-weighted rate is also 5.0%. The metadata reports this settled count and distinguishes the independent checker's original finding from the later three false passes. This is one sample, with subsequent class-wide corrections, not a fresh sample or full audit. The checker missed known errors, and may have missed others.

On 18 November 2026 a maintainer's sample on a Claude model (seed 51120: 60 written comments and five from each of the eight largest template families, 100 in all) found 28 wrong. The tile planes at base+$100 were called reflected forms, and the bit that selects them a reflection or orientation bit; they hold the tiles numbered 256 and up, and that bit is the tile number's ninth bit. Pose descriptor bytes 5 and 6 were called alternate clipped bitmaps; they are the lower pieces of the two layers, drawn 21 rows below the main ones. A component flag called sprite expansion selects multicolour, an actor field called an origin is its occurrence threshold, and a directory byte called a respawn delay is the entry byte. The 28 were corrected with every note that said the same thing. The notes that copied a structure's note onto each of its chunks were then folded into one note per structure, 10,220 notes to 8,135. One checker at a time then audited all 8,122 comments and every claim in the six facts files, in fifteen batches: 674 comments and four claims were corrected, and 47 labels renamed or removed. Most errors were in all four loads, which repeat the same code at other addresses. A new sample after the audit (seed 51126, 95 comments drawn the same way) found none wrong, with a 95% Wilson interval of 0.0% to 3.9%.

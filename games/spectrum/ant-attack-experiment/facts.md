# Facts

## Image and memory

Fresh contributor TZX; provenance and exact rebuilding recipe are in orientation.md. All addresses refer to the single 48K resident image.

| Address | Meaning | Consumer |
|---|---|---|
| 5CCB–7DD9 | Tokenized Sinclair BASIC | ROM interpreter; listing decodes each line |
| 8000–8FF3 | Z80 engine, with explicit filler gaps | Entry 8000; core update 8E80 |
| 9000–93B9 | Seventeen interleaved text/sound event records | 8E0D |
| 9700 / 9797 | Tape hand-over / IM2 trampoline | Bootstrap / vector page 9800–9901 |
| 9A00–9FFF, B700–BFFF | Sixty 64-byte masked shapes | 80A0 |
| A180–AFFF | 116 rows × 32 bytes of offscreen picture | 8300 clears; 8100 copies 30 inner bytes per row |
| B180–B41F | 21 × 32 sampled occupancy columns | Four samplers at 8681 onward |
| B420–B438 | Camera, random state, event flags, health, ammunition, time | Engine and BASIC DATA initialization |
| B450–B467 | Eight projected position/shape triples | 8600, 8580, 85D0, 8500 |
| B480/B490/B4A0 | Player, companion, grenade records | 82C0, 8F80, 83E0 |
| B4B0–B4FF | Five sixteen-byte ant records | 80D3, 8A5D |
| B500–B6FF | 512 render-depth mask bytes | 81B0, 8500 |
| C000–FFFF | 128 × 128 world columns | 8380, 8920, 8940 |

The world address is C000+(Y-128)*128+(X-128), for X,Y in 128..255. Each byte's low six bits mark solid blocks at heights 0..5. Height 6 is empty; heights above 6 (including wrapped FF below ground) test solid. Map bytes are also XORed to mark ant occupancy, so terrain and ants share collision tests.

## Text

BASIC strings and event positive bytes use the Spectrum ROM alphabet. BASIC tokens occupy A5–FF. The logo is a string of ROM block graphics. The event interpreter handles negative bytes as sound commands before ROM printing: low nibble 0..14 chooses a tone, F chooses noise; bits 4..6 encode one through eight repetitions. FF ends a record. Positive 7D consumes an attribute byte, 7E consumes the low byte of a word address in page B4. Neither is an ordinary printed character in this language.

## Controls and counters

Emulator comparisons start from the same loop.sna, with a no-input control. V moves player (185,4,0) to (185,3,0); C raises height to one. M changes facing 2 to 3; Symbol Shift changes it to 1. 0/P/Enter/Space select view 3/2/1/0. O leaves the selected view unchanged. Camera 0 is the digit, agreeing with the manual and differing from CRASH's letter O. Sources 8060 and 8400.

S/D/F/G set grenade fuse B42E to 2/4/8/16 and reduce ammunition B430 from 20 to 19 in a single launch test (8D00). The fuse is the pressed-key bitmask, so combinations add their values. Holding S+D+F+G through the normal engine input path from loop.sna, without memory pokes, stopped at 8D36 with fuse30 and ammunition19. Human blast damage tests exact coordinate/height equality while the fuse path runs; ants use equal height plus Manhattan distance (87A0). Below five cells ants enter five-update recovery, clearing paralysis; at five through seven their movement cooldown becomes 18 hex. These are forced routine-state observations, not a demonstrated grenade exploit from ordinary play.

Object offsets: 0/1/2 X/Y/Z; 3 shape base; 4 facing; 5 fall count; 6 movement cooldown (FF paralyses an ant); 7 flags; 8 animation/direct negative shape; 9 recovery; A/B/C respawn coordinates; D/E/F vary by actor. For the companion D is following/escape state, E remembers distance. For ants D/E schedule movement and F is an event byte. BASIC DATA120 gives the companion flags17 (support plus automatic step-up), DATA130 gives the grenade flags16 (automatic step-up), and DATA140–180 give ants flags4 (forward movement). The automatic step-up consumer at 88E0 tests bit4; this flag is not enabled by the ant reset records.

Health is B432/B434. Motion event 4 decrements health; event 8 sets it to zero (8F00). A sufficiently long fall queues event 2. The warning and actual damage are separate paths, so a warning alone is not a health decrement.

## Rescue and score

The companion begins following at Manhattan distance below four and equal height (8F80). Follow motion stops at distance one, and also when distance is six or more (8AB6). SCAN colours distance improvement green and other readings red (87D0).

Escape (8EA0) tests bit 7 of each human's X AND Y. Thus each human needs at least one coordinate below 128, rather than specifically passing a gate. Forced cases with both humans outside passed; a case with the companion still at (185,243) did not. This wider boundary is a code fact; player reachability beyond the documented exit is an open lead.

BASIC provides ten rescues. The first has one captive location, the later nine have four each. After a rescue, remaining time modulo four selects the next variant. BASIC line 90 adds remaining time times the new rescued count to score; subsequent rescue starts with time 1001 before the ready pass. Attempts restore ammo and health. Score and rescued count survive retries. There is a total-score card, not a stored high-score name table in the inspected BASIC.

Ant scheduling (8A5D) decrements E and skips movement on the update that reloads it from D. With D=2,3,4 it moves on 1/2, 2/3, 3/4 of eligible updates. BASIC writes sp only to the last four ants: they use periods two, three, and four for rescues 1–4, 5–8, and 9–10. The first ant keeps period twenty and moves on nineteen of every twenty eligible updates. Initial E values are 1,4,3,2,1, so their first skipped updates differ.

The time counter is big-endian B436/B437, with divider B435 resetting to three. In 300 display frames, checkpoints on 8009 and 8DD0 each counted forty calls, and time fell from 993 to 979 with initial divider one and final divider three. Time units are engine-based; they are not seconds or display frames. Frame stepping resets the partial stopwatch, so a partial-counter difference across that helper is not an elapsed-time measurement.

## Rendering and graphics

The renderer samples six occupancy planes, projects eight objects, sorts them by depth, and interleaves blocks with masked shapes (84A0). Each shape has sixteen rows of [left mask,left ink,right mask,right ink]; the pixel operation is (old AND mask) OR ink. There are 24 shapes at 9A00–9FFF and 36 at B700–BFFF. Four AMMO-box directions are the grenade's base shape 68..6B; active throw/explosion shapes use F4..F7. Human bases 6C and DC are swapped by the role selection, rather than changing movement rules. F0..F3 and the small table 8B60–8B7E have no established gameplay use.

Simulator probes of 8100 wrote exactly 3480 bitmap bytes, thirty bytes on 116 lines. Four 8300 calls clear exactly 3712 bytes A180–AFFF. The play snapshot's actual screen memory is the source for the rebuilt-screen picture on the article.

## Desert AMMO box

The grenade's reset record stores respawn (0,64,0). Its inactive animation is zero, selecting AMMO shape 68 plus view/facing. From the initial loop, one Symbol Shift update, 71 forward updates, another Symbol Shift update and 60 forward updates reach (0,64,0), where the box is visible. All moves use ordinary keys and leave the city map untouched. The 133 input groups replayed on a second, independently started ZEsarUX process with all player-coordinate milestones equal. The committed desert-route.json contains the input groups; the route begins at engine input checkpoint 8009 with player (185,4,0). B430 is decremented at 8D1B and initialized from BASIC DATA; the box is a drawn actor, without an identified ammo-pickup path.

## I/O census

| Instructions | Port | Purpose |
|---|---|---|
| 800C | F7FE | Key 1, return from engine |
| 8063 | FEFE | V/C movement/jump |
| 807B | 7FFE | M/Symbol Shift turning |
| 8405/8411/841D/8429 | EFFE/DFFE/BFFE/7FFE | Four camera keys |
| 8D0E | FDFE | S/D/F/G throw distance |
| 8B58/8B5D/8BA6/8BAE | FE | Beeper and border |

8090 and 8097 also call ROM KEY-SCAN for selection and waits. The decoded engine I/O census has no joystick-port read; the catalogue's joystick metadata does not describe an implemented original-game interface. An emulator can map a joystick to keyboard keys separately.

## Open leads

- The retained fifty-slot delay at 8C00 has no established caller or intended purpose.
- The retained sound bytes at 8B60 and poses F0..F3 have no established original purpose; the Graphics tab displays the shapes without claiming they are cut features.
- Grenades can clear a paralysed ant's FF timer in a forced routine test; a legal-input setup is needed before calling this a playable exploit.
- The broad escape boundary has a forced-state demonstration, but a route to an alternative exit has not been recorded.
Completion uses BASIC3600: play event17, draw the medal with CIRCLE calls, label ten lives saved and total score, pause500 display frames and request a new-game key. The final scene was observed after initializing the tenth interlude before forcing its completion. Retaining the first story string in an artificial shortcut can exhaust BASIC workspace during drawing; that is a setup limitation, not an established ordinary-play bug.

## The listing's error rate

Seed 20261116 drew 60 of 401 comments: 40 of 153 written comments and 20 of 248 generated comments. The independent gpt-6-astra checker found 2 wrong-detail comments, both in the written stratum. The raw estimate is 3.3%, with a 95% Wilson interval of 0.9–11.4%; the population-weighted estimate is 1.9%. These are estimates and the checker may have missed errors. The fourth ant's initial scheduler count was corrected from one to two; the fifth ant's repeated count description was corrected as well. The fall event was corrected to a warning rather than a health decrement. Both sampled errors were corrected. Subsequent page/setup checks established that BASIC changes the last four ant periods, while the first ant has period20 and initial count1. The other initial counts are4,3,2,1. The corresponding DATA descriptions and the automatic-step flag descriptions were corrected together. A full audit remains recommended. Coverage counts 35,343 declared authored bytes, with runtime buffers and ROM workspace outside the denominator.

## Page verification

The page functions were compared with the listing's original instructions: 256 grenade updates, all 65,536 ant count/period combinations plus 256 paralysis cases, and all sixty masked shapes on three backgrounds. The opening screen reconstruction matched all 49,152 emulator screen pixels after normalizing colour intensity to the Spectrum colour numbers. The emulator BMP has a 48-pixel left and 56-pixel top border, outside that comparison.

Title, timeout and final-event beeper changes were recorded from ZEsarUX at 15,600 samples/s, converted to one-bit levels and played through SpectrumAY. The source recording was captured from already-loaded snapshots, never from tape playback; the embedded runs contain sound only. The archive bootstrap is answered loader, and all 41,984 bytes of the resident tape block equal entry.sna.

All seventeen event streams were also compiled through the original 8B80/8B4A Z80 sound routines into beeper-level recordings. The page test regenerates those recordings from listing.json and checks the actual sound-model output: fifteen streams are audible, while streams eight and eleven print health counters without sound. Event sounds omit ROM printing delays and begin noise from the new-game random state.

The Graphics viewer distinguishes directional groups from direct frames. Original animation selection at 8980 confirms the recovery sequence F4,F7,F6,F5 for recovery timers4,3,2,1; the viewer repeats that sequence. Unresolved F0–F3 frames are selected manually and are not assigned an invented animation.

The schedule widget's initial periods and counts are now held directly to all five BASIC DATA records, rather than inferred from one representative ant. A collision probe of 8800 confirms that moving ant flags4 leave height unchanged at a blocking step, while following-companion flags21 and launched-grenade flags20 allow height to increase.

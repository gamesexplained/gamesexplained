# Jumpman: resident engine and startup

## Display, interrupts and clocks

`$4306` installs IRQ `$4100` through `$0314/$0315` and requests raster line 233. During play the handler switches to bank-0 text, matrix `$0400`, character ROM at `$1000`, for the status band. `$42AD` restores multicolor bitmap mode in bank `$8000`, matrix `$8000`, bitmap `$A000`, when the low raster byte is at least 251 or below 50. This check runs between dispatched callbacks, so the actual switch follows execution timing. `$404F` suppresses the split for full-screen text.

A recorded first-level frame was rebuilt from memory and raster-register writes: **104,448 of 104,448 compared pixels match**. This establishes that captured frame's bitmap, sprites, border and text-band layout; it is not a claim about every possible scene.

The fourteen words at `$4004-$401F` dispatch keyboard `$57C0`, death `$5C00`, six initially empty `$40C3` hooks, movement `$4900`, perimeter bullets `$6800`, sprite upload `$4600`, terrain sampling `$47C0`, sound `$44C0`, and an `$EA31` sentinel. A target high byte `$EA` terminates the list before a call. Four pending vectors `$40C8-$40CF` replace slots `$400C-$4013` when their high bytes are nonzero. The IRQ saves the CPU banking port in `$4099`, exposes bitmap RAM by clearing `$01` bit 0, and restores the port on exit.

Player and hazard dividers are `$4029/$402A`; pulses are `$402B/$402C`. After the initial counter transient, divisor *n* produces one update per *n* serviced raster interrupts. Player divisor at least 9 suppresses both pulse streams. Frame counter `$4020` increments each service, and `$4047` increments every eighth service.

The measured PAL configuration has 985,248 CPU cycles per second and 19,656 cycles per frame: **50.124542 frames/s**. Bonus counter `$4026` wraps every 256 services while `$4027` is enabled. `$57D9-$580E` subtracts 100 from [$3017/$3018](source-plf01.html#3017), approximately **5.107279 seconds** per subtraction at one service per frame. Zero bonus disables the countdown. Controlled live tests confirmed 1500→1400, 100→0, and disabling at zero (`work/live-tests.json`). Values below 100 are not clamped before subtraction. A fresh neutral-input replay measured512 game-state services at `$417E` in512 frames but966 entries at `$4100`; non-VIC entries take the short exit. During the first256 frames the enabled bonus counter wrapped once and bonus fell1300→1200. Later death disabled that timer; the clock check does not assume every interrupt entry advances it.

`$4367`→`$5003`→`$5006` is naturally called at `$94BE` after the title animation and at `$9949` during demonstration setup. **Live observation:** both calls leave all80 status characters at `$0798-$07E7` unchanged, write80 spaces to the different region `$0498-$04E7`, and zero all80 corresponding status colours at `$DB98-$DBE7`. With text background0, this hides the old status characters. The title caller then writes32 white credit characters; the demo caller writes40 prompt characters with their colours. Unreplaced cells remain black. The character-address mismatch is retained as a source property; these observed callers and their colour-based clearing effect are established. See [title credit](reference/status-title-credit.png) and [demo prompt](reference/status-demo-prompt.png).

## Controls, speed and player movement

Joystick port 2 is read through `$DC00`. The active-low direction nibble indexes sixteen signed X/Y intent pairs at `$4320`, stored in `$4050/$4051`. A nonzero high nibble in `$4052` substitutes scripted direction and is mirrored into the low nibble. In `$4053`, bit 0 forces fire released; otherwise bit 1 forces it pressed; otherwise the IRQ reads joystick bit 4. Enabled RETURN and SPACE escape hooks use vectors `$4048/$404A` and gates `$404C/$404D`.

Digits 1–8 are decoded by `$57C0/$5819` using `$57D0-$57D8`, with debounce `$40E7`. They change requested speed `$40E3`. Spawn `$5799-$579F` copies that request to both live dividers, so it takes effect on the next life spawn, including a new level's spawn. **Live input:** pressing 1 changed requested speed 4→1 while the active divisor remained 4; native respawn then made it 1 (`work/live-input-tests.json`).

`$4900` runs on a player pulse only while life state `$4028` is zero and the divisor is below 9. Walking changes hardware X by four pixels. Climbing changes Y by two and snaps to one of eight columns `$40B0-$40B7` when the current 160-wide bitmap X is equal or two pixels to either side. Destination Y at least 218 is refused. Six down-rope columns `$40B8-$40BD` cause automatic two-pixel descent on exact alignment with climbable terrain. Body overlap with support can move the player up two pixels.

A grounded player without support or climbable contact first sets `$40C0` and moves down two pixels; a second unsupported grounded update sets `$4028=1`. This is a two-update state test, not an accumulated fall-distance limit. Original-code tests confirm both updates. Jump descent uses a separate path.

The tables `$4BFF`, `$4C2B`, `$4C57` hold 22 pairs for vertical, right and left jumps. Horizontal bytes `$02/$FE` mean hardware X changes of +4/−4; other horizontal values mean no X change. The signed vertical sequence is six −2 moves, three zero moves, then thirteen +2 moves. An uninterrupted sequence rises 12 pixels and finishes 14 below its start; lateral sequences move 52 pixels sideways. Fire plus up or horizontal intent starts a jump; fire alone does not.

`$4B23` ignores landing contact for the first seven pairs. Beginning **before pair 8**, support may end any trajectory. Climbable contact may end only lateral jumps (`$4BAE`), and requires an exact configured column; grounded climbing's ±2 tolerance does not apply. After pair 22, the next update returns to the grounded controller. Prospective jump Y at least 222 requests death before storing that Y, after any X movement.

**Live input:** from X=176,Y=168 at speed 4, twenty frames of right/left produced X=196/156 with unchanged Y. Right+fire produced X=188,Y=158; up+fire produced X=176,Y=158. The no-input control stayed put. **CPU checked:** all 132 trajectory bytes, 264 movement updates including X-byte crossings, 396 controlled contact decisions, and three Y-boundary cases match the trajectory inspector (`work/agent1/jump/verification.json`). The inspector covers the jump phase, not complete player physics.

## Bitmap geometry and collision

`$4740` maps multicolor coordinate (x,y) to `$A000 + 40*(y & $F8) + 2*(x & $FC) + (y & 7)`, with pixel position `x & 3`. All 160 X coordinates at eleven Y boundaries, 1,760 cases, match original-code execution. `$47C0` samples the actual bitmap: five body rows spaced two pixels apart and a foot strip at saved player Y+11, using alignment/pose masks `$48E1-$48F8`.

`$7D00-$7DFF` translates four two-bit pixel codes into material flags:

| Pixel code | Material flag | Engine interpretation |
|---|---:|---|
| 0 | 1 | Background |
| 1 | 2 | Collectible |
| 2 | 4 | Support |
| 3 | 8 | Climbable |

For byte inputs `$00-$FE`, the table ORs the four pixel flags. **Input `$FF` is the exception: `$7DFF=0`, not 8.** The sampler can pass an unmasked middle byte, so the exception is not removed by its masks. On the rendered PLF2C opening, 262,144 paired original-sampler setups compare this byte with diagnostic value8: all512 X, all256 Y, two pose-mask classes, with the foot probe assigned current X/Y+11. There are588 individual body/foot differences and90 combined-flag differences. These supplied poses/probes do not establish movement failures: two native joystick routes at X212 climb Y216→196 with either lookup value. Effects on ordinary movement remain open. Geometry changes affect movement and collection because these systems read the rendered bitmap; they do not consult a separate terrain grid.

`$4D0F` reads a stream through `$4000/$4001`: `$FE lo hi` selects a shape, `$FD dx dy` selects repetition displacement, `$FC lo hi` jumps to another stream, `[x,y,count]` stamps the current shape, and `$FF` ends. Count zero wraps to 256 placements. `$4DA6` reads shape rows `[length,xOffset,yOffset,<length pixel bytes>]`, ending at `$FF`. Each source byte's low two bits become the same destination pixel code.

Resident shapes are girder/eraser `$7E00/$7E2B`, ladder/eraser `$7E56/$7EA9`, bomb/eraser `$7EFC/$7F27`, support-colored rope `$7F52`, climbable rope `$7F73`, and rope eraser `$7F94`; the final shape ends `$7FBC`. **CPU checked:** 194 initial, secondary and post-bomb streams across all 32 files produce exactly the same complete 8,192-byte bitmap as original `$4D0F` (`work/geometry-tests.json`).

Sprite collisions are separate hardware results. The IRQ copies the whole sprite collision mask to each participating sprite's `$4088-$408F` entry, or zero for a nonparticipant. These are not pairwise collision identities. Background-collision entries `$4090-$4097` latch hits; the IRQ does not clear unhit entries. Overlay callbacks interpret and clear them as needed.

## Level contract and collection

The shared loader `$74C3-$759C` loads/restores the overlay, draws its initial stream, copies climb columns, calls initialization, installs four IRQ callbacks and jumps to its main routine. Core header fields are:

| Address | Meaning |
|---|---|
| [$3000-$3005](source-plf01.html#3000) | Displayed number, initial draw pointer, background/border |
| [$3006-$300F](source-plf01.html#3006) | Bomb-list pointer and four IRQ callback pointers |
| [$3010-$3014](source-plf01.html#3010) | Player X low/high/Y, remaining targets, perimeter-bullet slot limit |
| [$3015-$3018](source-plf01.html#3015) | Collection points and remaining bonus, two binary words |
| [$3019-$301E](source-plf01.html#3019) | Initialization, main and cleanup vectors |
| [$301F](source-plf01.html#301F) | Shared RTS |
| [$3020-$302D](source-plf01.html#3020) | Eight climbing and six down-rope columns |
| [$3030/$3032](source-plf01.html#3030) | Completion `$5B00` and exhaustion `$5FFD`→`$6A80` |
| [$3034-$3039](source-plf01.html#3034) | Next filename suffix, empty draw terminator, spare, collection-key X/Y offsets |
| [$303A/$303B](source-plf01.html#303A) | Optional global bomb callback |

`$55BF` requires body material flag 2, quantizes player position using [$3038/$3039](source-plf01.html#3038), and searches seven-byte records `[key,x,y,callbackLow,callbackHigh,drawLow,drawHigh]`. On a match it calls the optional global and individual callbacks, adds [$3015/$3016](source-plf01.html#3015) to the 24-bit total, services score/extra life, erases the bomb with `$7F27`, executes the post-draw stream and decrements [$3013](source-plf01.html#3013). The counter does not bound this search; an `$FF` key normally terminates it.

Record count and target count can differ. PLF11 has 18 records for twelve initial targets; PLF15 has fourteen records with count ten. PLF13 has four records at [$30ED-$3108](source-plf13.html#30ED) **without a terminator**: [$3109](source-plf13.html#3109) begins callback code. An unmatched search can therefore continue into code. **CPU checked:** original sampler and key construction over all 262,144 combinations of normal nine-bit X, eight-bit Y and both body masks produced 1,600 collectible contacts, all with intended keys. All sixteen bomb-erasure subsets only remove collectible pixels, and this overlay's actors do not alter the bitmap or scan window. Even a forced high-X alias producing key `$22` returned at incidental `$FF` at [$3192](source-plf13.html#3192) after 244 candidates, without a false callback. The scanner's eight-bit index wraps inside [$30ED](source-plf13.html#30ED)-[$31EC](source-plf13.html#31EC); it does not walk all memory. These checks establish no failure from ordinary bitmap contacts; they do not prove every interrupt interleaving or noncanonical X state unreachable (`work/followup-engine/REPORT.md`).

## Sprites, hazards and death

Eight-slot arrays hold enable `$405B`, X low `$4063`, X high `$406B`, Y `$4073`, and shape pointer `$407B`; slot 0 is Jumpman. `$4600` uploads them to the VIC and sprite pointers `$83F8-$83FF`. In bitmap bank `$8000`, each pointer names `$8000 + 64*pointer`. `$4059/$405A` hold horizontal/vertical expansion masks.

`$4376`→`$5E03`→`$5E6F` clears `$8400-$85FF` and expands eight consecutive 30-byte frames from X=source high,Y=source low into eight 64-byte slots, leaving 34 zero bytes per slot. It always reads 240 source bytes; there is no count or terminator. Some overlays select fewer frames, so unused copied slots contain following source bytes. `$4FC0` separately copies an uncompressed 512-byte bank.

`$8600-$87BF` contains seven authored title-letter sprites; `$87C0` a small stripe; `$8800-$8FFF` authored actor/action graphics. Spawn `$56E0` clears `$8E40-$8E7F` and progressively builds its first thirty bytes from `$8800`, using pointer `$39`. The entry/play comparison differs in 49 bytes of that slot. The canonical entry image retains its original authored contents. Matrix `$8000-$83FF`, dynamic sprites `$8400-$85FF` and bitmap `$A000-$BFFF` are runtime output.

`$6800` manages ordinary perimeter bullets in slots 1 through [$3014-1](source-plf01.html#3014), using `$6922-$693D` state and six 32-byte tables `$693E-$69FD`. Cruising velocity is ±2 X or ±1 Y; exact alignment with the player selects an attack at ±6 X or ±3 Y and plays the lock-on effect. Bullets recycle outside Y=6…227 or half-X=3…175. Private overlays supply additional actors and collision rules.

Life state `$4028=1` invokes `$5C00`: falling motion, changing pose and SID pitch, with support-triggered ten-step bounce tables `$5D25/$5D39/$5D4D`. Reaching Y≥222 advances to state 2; `$5D61` starts death tune 8, waits for sound/delay, then `$5DCF` decrements reserve lives. Reserve zero becomes `$FF`, the exhaustion sentinel.

## Players, modes, bonuses and progression

The current eleven-byte record `$40DA-$40E4` contains 24-bit total score, 24-bit accumulated bonus, 24-bit next-life threshold, requested speed and reserve lives. Four saved records occupy `$51C4-$51EF`. `$7BAF` initializes zero totals, threshold 10,000, speed 4 and six reserves: seven lives including the current one.

`$5106/$7400` saves/restores records, skips `$FF` reserves and rotates players. Only a wrap of the active roster loads the next level; each turn restores the pristine overlay buffer. All active players therefore receive the same level before progression. `$40E5` marks complete roster exhaustion; `$40E6` marks the wrap.

`$5B00` adds remaining level bonus to both total score and accumulated bonus, queues a random tune 0–7 and waits for all sound slots. `$5E06` grants one reserve life when total score reaches the next 10,000-point threshold, then adds 10,000 to that threshold. It awards **at most one life per call**. Controlled live tests at scores 9,999, 10,000 and 30,000 confirmed respectively zero, one and one awards from threshold 10,000.

Menu `$7800/$7A59` offers five modes and accepts one to four players; `$7A9C` rejects 5. Later text patches visibly replace an old RUN/STOP prompt with RETURN and `(1 - 5)` with `1 - 4`. Mode starts at `$7BF1/$7BF6` and end suffixes `$5BB4/$5BB9` are:

| Mode | First file suffix | Next-file suffix that ends the mode |
|---|---|---|
| Beginner | 01 | 09 |
| Intermediate | 09 | 19 |
| Advanced | 19 | XX |
| Grand Loop | 01 | XX |
| Randomizer | 12 | ZZ |

`$763A-$7679` lists the 32 filename pairs; `$767A-$7699` maps them to title rows. The three Mystery Maze variants share title number 25. Titles are twenty PETSCII bytes each at `$5880`; the 32 stored rows include two unused duplicate titles. `$759F` searches filename pairs without an explicit bound.

At completed-mode life counting, `$2900` converts reserves to remaining lives. `$29FF-$2A06` awards 100/250/500/750 per life for modes 1–4. `$2A1C` adds this award to both score totals. **Controlled live overflow:** 88×750 creates the final display value 66,000 but stores/adds only 464. `$297F-$299D` retains only the low two award bytes while computing a transient third display byte. A legal route to 88 remaining lives has not been established.

Completion buildings `$2A60/$2B83` are five cells wide and 8/10/12 high. `$2C00` flashes 4/5/6/all 15 window pairs for modes 1/2/3/4. `$2C45` copies `$8800-$8FFF` over active [$3000-$37FF](source-plf01.html#3000) for the text-bank ending sprites, then `$2CB6/$2D0C` animate the exit, show scores and retire that player. Ordinary exhaustion instead uses `$6A80` color phases of 60,60,30 callback counts before total-score/bonus display and score entry.

## Randomizer

PRNG `$5832` advances 16-bit state `$585B/$585C` eight shift steps, inserting XOR of old bits 13 and 8; initial state is `$7B7B`. `$5B8F` selects units from `0123456789024681` at `$5BBE`, then tens from `01201212` at `$5BCE`. It rejects only `00`. It neither excludes `01` nor prevents `25`, although this disk has no `PLF25` and the title table has no `25` pair. Its digit generator cannot produce the configured end suffix `ZZ`.

**CPU checked:** all 65,536 PRNG states and all 65,536 chooser inputs match the original instructions. Of the chooser inputs, 65,532 return a suffix in at most three attempts. Inputs `0000`, `4000`, `8000` and `C000` reach/stay at zero and repeat rejected suffix00. The uninterrupted PRNG sequence from loaded seed `7B7B` has one transient state followed by a 5,461-state cycle; it contains none of those four trapped inputs. This establishes the isolated sequence, not every possible interrupt interleaving. The page reports those controlled stalls without an uncaught error. **Controlled live:** each of the four trapped inputs made441 chooser-entry visits and zero successful exits in30 requested frames, with31 game-state services after explicitly enabling IRQs from the restored mid-frame stop. This confirms continued machine execution, not a legal route to the input. States `$1F27` and `$E9A7` occur in the sequence reachable from the initialized seed. **Controlled live:** `$1F27` produced `01`, `$E9A7` produced `25`; `$0002` also produced `01` (`work/live-tests.json`). This proves the chooser accepts those results. It does **not** prove an ordinary Randomizer session crashes or reaches either tested state at a selection boundary. **CPU checked:** all 128 even-indexed pairs at `$763A-$7739` lack ASCII25. The eight-bit index wraps after two-byte steps, repeating the same state at `$75E7`; original `$759F` never returns to `$7413` to call the loader. Valid-suffix controls return and draw the correct title. Thus suffix25 traps the foreground title lookup before a missing-file LOAD could occur; natural reachability of that selection boundary remains open (`work/followup-progression/title-lookup-proof.json`). **Controlled live:** a requested25 at the normal `$7410` title call produced203,003 scan visits with239 control IRQ visits, zero title-match/display-restore/loader visits, and display-enable clear after200 requested frames. IRQs were enabled; the saved screen is blank. This establishes the running-machine stall for that request, without asserting that ordinary play reaches it (`reference/randomizer-25-stall.png`).

## High scores, text and persistence

`$2000-$23E7` is the stored screen image, including two twenty-entry tables. TOP SCORES starts `$20A6`, HIGH BONUS `$20BA`, both at a forty-byte row stride. Each record holds three initials, separator, six digits, separator and mode marker. `$2553/$2592` independently format total score and accumulated bonus through `$554B`; decimal conversion uses six 24-bit place values at `$5539` and blanks leading zeroes.

Insertion `$24A8` requires a strictly greater candidate; equal scores remain below existing ties. `$24EB` moves twelve-byte records, preserving rank labels and frame. Failure is `$FEFE`. **Controlled live:** 0 did not qualify against a zero list; 1 took first place; 100 tied with first-place 100 entered second; 101 entered first (`work/live-score-tests.json`). These tests stopped before disk persistence.

Initials entry `$25EB-$268D` cycles 32 characters at `$26D4` with vertical joystick intent; fire accepts three initials. Each accepted position resets the alphabet index to zero. Fire is level-sensitive: after the 25-tick confirmation sound ends it can accept another untouched, blank position without a release. The sound uses priority 4/5/6 for positions 1/2/3. **CPU checked:** when only one list qualifies, subtracting four from its failed partner `$FEFE` produces initials writes at `$FEFE-$FF00` and `$E2FE-$E300`, beneath KERNAL ROM. Highlight writes land in the old bitmap at `$B6FA-$B709` (or `$B6FE-$B70D` if neither list qualifies). These writes miss the software and hardware interrupt vectors, do not change mapped KERNAL reads, and the normal bitmap clear at `$447A` removes the highlight residue (`work/agent3/scores/score-sentinel-tests.json`). Marker table `$26CD` supplies B/I/A/G/R for modes, with a space for ordinary exhaustion.

Startup `$2F03` reads GETIN once. HOME `$13` or CLEAR `$93` bypasses the disk score load and saves the default image already supplied by `INTRO.SYS`; this reset does not zero the score screen. Otherwise it loads `SCORES` from device 8. `$2F84` issues `S0:SCORES`, then SAVE from `$2000` to exclusive end `$2400`: **exactly `$2000-$23FF`**, including the nonvisible final 24 bytes. No explicit error branch follows these load/scratch/save calls. The default image matches the extracted file. **Controlled live persistence:** native SAVE at `$2F84` wrote a score image containing controlled initials JAN; all 1,024 RAM bytes were then cleared, and native LOAD at `$2F13` restored every byte exactly (`work/live-persistence.json`). This validates the real KERNAL/disk round trip. **Live input and reboot:** from the naturally reached first-level state X=176,Y=168 at speed4, LEFT128, DOWN70, LEFT20 PAL frames collected an ordinary bomb for100 points and zero accumulated bonus. Holding LEFT then exhausted the lives and entered initials. UP selection updates2/3/4 with one FIRE acceptance after each entered ABC; neutral40-frame gaps separated the first two confirmations. The game saved, played its completion tune and returned to the menu. A hard reset followed by `LOAD"JUMPMAN",8,1`, `RUN` and native startup score loading restored all1,024 saved bytes exactly, including ABC/100 in the total table. No score, position, PC or death-state edits were used in that sequence. This naturally exercises the one-list-qualifies sentinel path (private working records, `reference/score-entry-abc.png`).

Menu/title text uses uppercase PETSCII; the status and stored score screen use screen codes. `$5400` copies eighty status characters `$545E-$54AD` and colors `$54AE-$54FD` into the two bottom rows at `$0798/$DB98`. Turn placards copy the 40×7 artwork `$5200-$5317` plus one 5×7 numeral from `$5318-$53A3`.

## Sound

Sound tick `$44C0`, allocator `$458E`, and tune selector `$6000` share three seven-byte records at `$4030/$4037/$403E`: release threshold, remaining duration, priority, stream pointer low/high, control and spare. A request supplies pointer `$402E/$402F`, A=priority, X=release threshold, Y=control. It takes the first idle voice, otherwise the first strictly lower-priority voice; equal priority cannot preempt.

Stream commands are 0=end, 1=AD/SR, 2=pulse width, 3=pointer jump. A first byte at least 4 starts `[frequencyLow,frequencyHigh,duration]`. Control commands execute immediately in the same tick. Duration zero still consumes a tick. A decremented duration equal to the nonzero release threshold clears the gate; reaching zero loads the next command first. End clears frequency and active priority, leaving its pointer on the end byte.

Sixteen tune definitions at `$603C-$613B` each hold three five-byte voice descriptors plus padding; streams occupy `$613C-$657C`. Tunes 0–7 accompany level completion, 8 death, 10 game over, 14 score-table completion and 15 the mission ending. IDs 9/11/12/13 are identical zero-priority definitions: they do not silence occupied voices. Resident effects include collection `$569D`, bonus `$580F`, death bounce `$5DD4`, extra life `$5E5C`, bullet lock-on `$69FE`, and menu `$7B7B/$7B9C`.

`$44E8` reads a writable SID control address during gate release. **Live native-CPU probes** wrote `$A5/$81/$21/$00` to `$D406`; the subsequent original `LDA $D404` returned that most recent global SID write, despite stored voice control `$40`. Natural tune samples also differed from the control shadow. The player therefore uses a last-write bus approximation; it omits analogue decay and timing between writes within a frame. Direct SID effects outside this stream interpreter are outside the player.

**CPU checked:** 23,764 frame/state comparisons and 23,413 ordered SID writes match the original routines, including all 25 SID register-shadow bytes and 21 voice-state bytes after each frame. Both explicitly selected SID read models were tested; the live probe establishes last-write behavior for the tested machine. Every tune/effect was exercised, with stream jumps, zero durations, priority ties and mixed requests. Browser playback, mute, seek and stop passed. This establishes driver/write equivalence under the stated model, not a recorded-waveform or specific physical-SID match (`work/agent3/audio/verification.json`, `work/sid-bus-probe.json`, `work/sid-read-probe.json`).

## Title and attract scripts

`$9000/$9022` initialize the presentation and RETURN escape to `$7800`. `$90A7` reveals the 9×26 EPYX tile map `$9106-$91EF` through six character codes at `$91F0`. `$92E5` draws stream `$9370` and selects the seven title-letter sprites. Title player pointer `$23` addresses `$88C0`.

`$9440` feeds duration/direction/fire triples `$93EE-$943F` into the input overrides on player pulses. Letter callback `$952E` interprets 29 sprite/duration/operation triples at `$94D4-$952D`: wait, move left four, descend four with pitch slide, or move right four. Copyright/address rows are `$9649-$9698`; the Randy Glover credit is `$9699-$96B8`.

Demo `$9900` draws `$9A27`, displays the RETURN prompt and runs 26 input triples at `$998C-$99DA` through `$99DB`, on the opposite player-pulse phase. `$9A98` interprets two actor programs `$9BF2/$9C8A`: `$80` loads frame pairs/color, `$81` sets position/enables, `$82` calls a sound wrapper, `$83` stops; other four-byte records specify signed movement and duration. Five compact 48-byte frame pairs occupy `$9CC2-$9DB1`. `$9BE2` waits for a collectible-material condition, displays high scores through `$2800`, then repeats the presentation. These script formats and phase conditions are traced; a complete frame-for-frame attract replay is not claimed.

## Startup bytes in the level workspace

The original `INTRO.SYS` hand-over holds five 64-byte sprite-shaped slots at $3000–$313F. Their first 63 bytes match the resident sprites at [$8E40](source-resident.html#8E40), [$8EC0](source-resident.html#8EC0), [$8F00](source-resident.html#8F00), [$8F80](source-resident.html#8F80) and [$8FC0](source-resident.html#8FC0), respectively. No startup sprite reader of these copies has been established. Level loading overwrites this workspace before level execution; completion replaces it from $8800–$8FFF. The native entry snapshot retains these original slots. They are outside the resident part's listing and coverage because the level parts own $3000–$3FFF; the original analysis of the slots remains in the private migration record.

## Original source and runtime state

This part lists the original startup hand-over, including the boot loader that [$9000](source-resident.html#9000) subsequently clears. All 32 pre-initialization level captures differ in the same 244 resident-code bytes: 224 cleared loader bytes and 20 operand bytes modified by original store/increment instructions. No opcode outside the cleared loader differs. The Source page combines this original listing with a level's own bytes; it does not claim that the loader remains executable during gameplay. The orientation records the exact capture route and the expected generation warning.

## Remaining source anomalies and limits

- `$45EB` preemption clears `$D404 + incoming release`, using X rather than the selected voice offset. Controlled CPU tests reproduce replacing voice 1 while clearing voice 0. Its audible effect during ordinary play is unverified.
- `$464B` compares the sprite high-X condition against `$D00A` (sprite 5 X), rather than `$D010`. A controlled CPU test skips a needed X update; natural visible impact remains unverified.
- `$49BB` compares vertical intent with zero-page `$01`, not immediate1. In3,072 paired controlled setups (all256 Y, up/down, X96/100/104, material8/12), changing only the comparison opcode to immediate mode differs in six cases: down at Y222. The original takes the support fallback; the diagnostic aligns X and then rejects destination Y224. No ordinary-input failure or intended replacement opcode is established. Checks.
- The demo frame loader clears offsets 1…128 of a 128-byte workspace, including one byte beyond its end. The next copy masks some effects; no visible corruption is established.
- Fully climbable bitmap byte `$FF`, [PLF13's missing bomb terminator](source-plf13.html#facts), Randomizer's missing suffix and the final-life award overflow have the precise evidence limits stated in their respective references. Score-entry sentinel stores have been bounded and checked as described in the score section. None is promoted to a naturally reachable exploit without an input route.
- Six-digit decimal output has no wider-value display guard; bonus subtraction has no nonzero-under-100 clamp. These are code properties outside normal supplied bonus values.
- Reserved fields, sound tails `$5DF6-$5DF8` and `$6A05-$6A24`, inactive sound `$4CA3-$4CAB`, the caller of placard loop `$7C00`, and trailing marker `LOLOXVM4.` at `$9FF6-$9FFE` retain unresolved purposes. `$9FFF` itself is the meaningful loader sentinel.

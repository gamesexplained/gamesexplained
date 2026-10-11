# Jumpman: feature checklist

The inventory began from the supplied game's screens and the C64 manual, before code analysis. Status is the evidence now available: **live** means VICE observation, **traced** means original instructions/data, **CPU checked** means controlled original-code execution, **differs** means the code contradicts the documentation, and **open** names a remaining verification limit. Controlled state tests do not prove player reachability. Addresses refer to the resident image unless a PLF file is named.

| Feature | Status | Evidence / limits |
|---|---|---|
| Animated EPYX and JUMPMAN title, attract demonstration | live + traced | Captured title; scripts `$93EE/$94D4/$998C` and actor VM `$9A98` explain animation and synthetic controls. Natural `$94BE/$9949` calls verify status-colour clearing before the credit/prompt;80 old status characters remain stored but hidden. |
| Five modes: Beginner, Intermediate, Advanced, Grand Loop, Randomizer | live + traced | Options screenshot; `$7A1C`, starts `$7BF1/$7BF6`, termination `$5BB4/$5BB9`. |
| Groups of 8, 10 and 12 numbered levels; 30 in Grand Loop | traced | Next-file markers 09,19,XX. Mystery Maze has three alternative files displaying25. All 32 files loaded and captured. |
| One to four players, alternating turns | traced | `$7A9C` rejects5; four 11-byte records `$51C4`, rotation `$5106/$7400`. Full four-player campaign not played. |
| Port2 joystick, directional jumping, ladders and ropes | live + traced | Controlled identical-snapshot input/no-input replays verify walking/up-fire/right-fire; `$4320/$4900`, level climb columns [$3020](source-plf01.html#3020). |
| Speeds1–8; new speed waits for next life | live | Key 1 changes `$40E3` while live divider remains 4; native respawn after controlled death applies1 at `$5799`. |
| Seven starting lives | traced | Initial reserve counter 6 at `$7BAF`; current life is separate, `$FF` is eliminated. |
| Extra life each10,000 points | live | `$5E06` tests at9999/10000; one award per invocation even for controlled30000. |
| Jump and fall hazards | live + original-code tests | Jump inputs verified live; 22-pair trajectory/contact port checked against original code. Unsupported grounded movement uses two updates, not a distance threshold. |
| Smart perimeter bullets | traced | `$6800`: cruise horizontal±2/vertical±1, align to player then attack±6/±3; initial header slot limits0/2/3/5. All-level survival behavior not replayed. |
| Collect all ordinary bombs; usually100 points | live + traced | Seven-byte records and `$55BF`; per-file points in [$3015](source-plf01.html#3015). Normal first-level joystick route earns100 and reduces targets12→11. Special records and callbacks change count/awards. |
| Bonus falls100 about every five seconds | live + traced | `$4026` wraps every256 enabled game-service updates, about5.107s PAL. Live1500→1400,100→0 and zero-disable checks. |
| Completing a level adds remaining bonus to both totals | traced | `$5B00`; 24-bit score and cumulative-bonus fields `$40DA–$40DF`. |
| Geometry changes after bomb collection | original-code tests | Every decoded initial and post-bomb stream, including level30 stage2, matches all8192 output bytes of `$4D0F`. The interactive comparison also matches the original erase/redraw tail for397 initial-table records, alone and in forward/reverse sequences (1191 full bitmaps); private callback effects and legal pickup order are outside this view. |
| Fixed up/down rope routes | traced | Header arrays [$3020](source-plf01.html#3020)–[$302D](source-plf01.html#302D), movement `$4900`; bitmap contact and column matching determine traversal. |
| Moving blocks, lifts, robots, bats and level-specific hazards | live + CPU checked + traced | All32 private programs traced;14 have expanded CPU checks. Ordinary inputs verify Robots I release, Jumping Blocks forced jump and Ride Around carry after native level selection. Full legal completion, platform transfers and natural mixed-mask effects remain open. |
| Robots III chooses and opens routes | CPU checked + interactive model | The page model matches 21,456 original routine calls across all 30 nodes, four opening states, full edge traversals and continuous three-robot sequences. Each bomb opens one downward direction; upward already exists. Natural collection and traversal of the opened paths remain unverified. |
| Shooting in Invasion, Dragon Slayer and Gunfighter | live + CPU checked | Ordinary inputs launch all three shots. Native Dragon Slayer replay completes with54 hits, all12 stairs, the goal bomb and2800 points without losing a life. Invasion scores75 and confirms a wrong-target collision. Gunfighter scores100 from a verified shot/enemy overlap and advances the pursuit-threshold selector; a no-fire control scores0. CPU cases verify directions, arc/cooldown/bounds and hit awards25/50/100. Gunfighter completion and a resulting change in enemy route choice remain open. |
| Freeze input lock | live + CPU checked | Native input/no-input replay verifies repeated80-count refresh and bullet death while frozen. CPU checks distinguish zero from release and confirm existing jump/fall can continue. |
| Followers replay player history | live + CPU checked | All256 creation cursors and1,100 updates verify seven independent creation-dependent lags; state2 clears followers/count/write cursor but retains history. Native joystick input creates two followers and reaches their death cleanup; a seven-follower route remains open. |
| Now You See It hides and restores scenery | live + CPU checked | Ordinary bomb and death verify matrix80 then85 with callback-isolated unchanged bitmap. CPU checks include05 alternation and restore-state transitions. |
| Grand Puzzle III stage-two death completes the level | live input + original-code tests | A joystick-only route collects nine bombs and touches the trigger alive after one lost life. Transformation preserves three targets. Subsequent LEFT collects a500-point bomb, then death reaches completion with two targets left, score1400 and four reserves. Controlled stage-one death respawns while lives remain. Earlier campaign entry remains unverified. |
| Puzzle bombs worth500 | traced | PLF07/15 special callbacks add 400 before ordinary 100; PLF30 second-stage special records use the same sum. |
| Three Mystery Maze variants selected by remaining lives | controlled live + original-code tests | PLF24 [$3214](source-plf24.html#3214) tests reserve counts below 3,3–4,at least 5 and selects2A/2B/2C. All256 bucket inputs checked; controlled Jungle completions with reserves2/4/5 load exact2A/2B/2C files. Full legal Jungle exit not replayed. |
| Mystery Maze hidden scenery reveals around player | original-code tests | Private init colors hide existing bitmap; callback changes nearby matrix cells. Collision reads unchanged bitmap. All393,216 coordinate cases across three layouts verify exact carry-dependent bounds and no display overrun. |
| Randomizer excludes level1 | differs, live | `$5B8F` rejects only00; controlled seeds0002/1F27 choose01. E9A7 chooses25, a missing file. Original title scan for25 cycles over128 pairs and never reaches LOAD; a natural route to that selection boundary remains open. |
| Final life awards100/250/500/750 | traced + live corner case | `$29FF` rates; controlled 88×750 displays66000 but stores/adds464. A legal88-life route is unverified. |
| Completed groups light buildings | traced | `$2C00` flashes4/5/6/15 window pairs for modes1–4. |
| Separate total and bonus top20 score tables | live + traced | Records `$20A6/$20BA`, stride40; native insertion tests zero, positive, tie, greater. Ties rank below existing equal entries. |
| Three joystick-selected initials | live + original-code tests | Normal100-point qualification and joystick ABC entry passed; each letter resets the selector. Held fire may accept a blank when the25-tick cue ends; no release-edge check. |
| Completion mode letters / Randomizer R | traced | `$26CD` marks B/I/A/G/R/space; `$6CB0` sets exhaustion marker. |
| Scores saved on writable disk | live + traced | `$2F84` scratches SCORES then saves exactly$2000–$23FF. Native SAVE, clearing1024 RAM bytes, then LOAD restores the full image. Natural100-point/ABC entry returned to menu; hard reset and fresh game startup restored all1024 bytes exactly. No explicit save-error branch. |
| HOME/CLEAR at initial loading resets score records | traced | `$2F08` accepts PETSCII13/93; replaces disk file with resident defaults. It does not zero the whole image. |
| Music and action effects | original-code + browser tests |16 tune IDs,11 effect auditions;23764 frame/state and23413 ordered-write comparisons. PAL synthesis and SID bus decay are approximated as stated by the player. |
| All intended Hailstones bomb records terminate correctly | differs; bounded original-code tests | PLF13 lacksFF, but all262,144 normal-coordinate sampler cases yield valid keys or no pickup; all16 ordinary erasure subsets preserve that property. No natural failure is established. |

## Sources

Read on 2 October 2026:

- [Epyx's C64 instruction manual, transcribed by Project 64](https://www.abandonwaredos.com/docawd.php?idg=1121&sf=jumpman_manual.txt&sg=Jumpman&st=manual). Primary documentation; claims remain separate from observations.
- [C64-Wiki: Jumpman](https://www.c64-wiki.com/wiki/Jumpman). Secondary documentation. Its game-option terminology differs from the supplied game's menu; this checklist uses the game's names.
- [C64 Boxed Sets: Jumpman](https://c64sets.com/jumpman.html). Independent screenshots saved under private `work/research/reference/` as `external-c64sets-02.png` and `external-c64sets-03.png`, from `https://c64sets.com/jumpman/scr02.png` and `https://c64sets.com/jumpman/scr03.png`. These private research copies are from that collection, not captures of this run, and are excluded from the published site.
- The supplied disk's own menus and first level, observed in VICE-MCP v3.13.2. `reference/options.png` and `reference/level01.png` are captures of this run.

The contributor authorized online research and reference screenshots. No game image was downloaded.

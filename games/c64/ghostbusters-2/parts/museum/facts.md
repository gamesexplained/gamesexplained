# Museum facts

The entry state is `work/entry.vsf`, and `work/play.vsf` shows the opening rope scene. The route uses forced success paths in the first two episodes and switches to the Jondi/Censor disk; see the game's `orientation.md`.

The play snapshot has `$01 = $35`, hardware IRQ vector `$FFFE = $0851`, and RAM IRQ vector `$0314 = $094E`. At `$0851` the program saves A, X and Y, tests the stacked status and dispatches BRK through `$0316` or IRQ through `$0314`.

An executed-address capture of the opening rope state recorded 342 instruction starts. The completed listing also includes the input, weapon, collision and phase paths checked separately below.

At `$C74C`, the game advances the rope descent and reads joystick port 2. Up decreases the descent value at `$8058` unless it is zero; down increases it while it is below 7. If both directions are pressed, up takes precedence. `$C77B` adds that value to two positions for the selected player, increases a nonzero value every fourth update unless it is 8, and sets `$805B` when the first position reaches `$B0`.

Starting from `work/play.vsf`, 30 VICE frames with down held changed `$8058` from 0 to 8 and `$FC15` from 42 to 129. In two VICE trials, repeating two frames down and five frames up 110 times moved `$FC15` from 42 to 176 and set `$805B` to 1; the player appeared on the floor. Recording that segment at the `$C74F` joystick read produced 377 inputs. The kit's C64 machine replayed them from the same snapshot and reached the same landing values; `test_rope.js` checks the recorded intermediate positions against the game's routine. This verifies the descent segment, not a route from power-on (`65-inputs`).

After the first landing and 120 neutral frames, `$C672` changed from 0 to 2 and another Ghostbuster appeared on a rope. The same 110-pair sequence brought the indexed position `$FC17` to 176 and set `$805B`; after 120 more neutral frames the museum showed characters on the floor. That state is saved as `work/floor-two.vsf`. The two active Ghostbusters move on the floor; the other active slots hold the current opponent, his attack and the players’ weapon effects.

From `work/floor-two.vsf`, holding joystick port 2 left or right for 100 frames moved the pink Ghostbuster horizontally; holding up or down moved that character vertically. In those trials `$FC17` changed from `$B0` to `$37` with up and to `$C9` with down; with left, right or no direction it remained `$B0`. Space changes the controlled Ghostbuster; Return opens equipment selection. Slime damages Janosz, while the later opponent phases test both beam-hit flags, with the stale-flag exception verified below.

At `$B372`, the floor input routine scans Space and, when `$8028` is zero, changes the selection at `$8042` between 0 and 1 on a new press. From `work/floor-two.vsf`, a 12-frame Space press changed that selection from 1 to 0. In a controlled comparison, ten frames of up with selection 1 changed `$FC17–$FC18` from `$B0,$C5` to `$9C,$B1`, leaving `$FC15–$FC16` unchanged; after Space selected 0, the same input changed `$FC15–$FC16` to `$9C,$B1` and left the other pair unchanged. The joystick read is at `$B459`.

From the floor, pressing Return enters the panel at `$CAA8`. It displays portraits of Ray, Pete, Egon and Winston and equipment icons. In VICE, left and right changed the cursor position at `$CA83`. With the cursor at `$40`, pressing fire changed the first slot at `$CA8F` from `$3C` to `$3F` and the held value at `$CA94` from `$3E` to `$3C`; another fire press reversed both changes. With `$CA94` back at `$3E`, pressing and releasing Space returned to the floor. `$CCDC` reads the panel controls and `$CD95` handles the first slot. The slot values are `$3C` for slime, `$3D` for the proton beam and `$3F` for an empty slot; `$3E` is the empty hand cursor.

The panel setup copies 1,000 bytes from `$1800–$1BE7` to `$0400–$07E7`. Its raster handler configures multicolour bitmap mode, with VIC bank 0 and the bitmap at `$2000–$3F3F`. A captured panel frame reconstructed from the bitmap, screen colours, sprite shapes and register writes matched all 104,448 pixels of VICE’s capture. The bitmap and source colour matrix are identical in the museum entry and play snapshots.

The panel uses two raster handlers, `$CB76` and `$CC10`. The second calls `$CC4A` to set sprite positions and pointers; that routine falls through to the control read at `$CCDC`. The main loop calls `$CCDC` as well. In a 30-frame VICE trial, checkpoints counted 30 main-loop calls, 30 interrupt calls to `$CC4A`, and 60 entries to `$CCDC`. The fire latch prevents a held fire button from being treated as a new press at every read. The execution map includes both the rope and panel trials.

`$AE13` advances a pair of counters in groups of five. At the fifth group it checks `$8050`: if that byte is 2, it jumps to the congratulations path at `$0A16`; otherwise it resets the outer counter, sets `$8050` to 2 and copies 63 bytes from `$4280` to `$6500`. In controlled VICE calls with both counters forced to zero, phase 1 reached the latter branch after 25 calls; phase 2 reached `$0A16` after 25 calls. `test_museum_phase.js` repeats those forced cases against the listing. Emptying Janosz’s gauge enters phase 1; emptying the simultaneous-beam target gauge advances phase 1 to phase 2 and phase 2 to success. The damage paths were separately tested as described below.

The captured museum floor selects the character set at `$7000` in VIC bank 1. Its 2,048 bytes are identical in the museum entry, rope and floor snapshots. The later captured frame used for the reconstruction matches all 104,448 VICE pixels. An earlier, superseded capture differed around one moving sprite and is not used as the verified reconstruction.

The museum setup at `$8396` selects one of two 1,000-byte screen arrays at `$1000` and `$1400`. The same 1,000 bytes at `$1C00` hold both colour layers: the first setup writes their low nibbles to colour RAM; the alternate setup shifts down the high nibbles. The first selects the character set at `$7000` and the alternate selects `$7800`. Both screen arrays, the packed colours and the `$7800` set are identical in the entry, rope and floor snapshots.

A direct VICE test of the setup with `$8041=0` matched all 1,000 primary screen codes and colour cells. A second test forced `$8041=1` and `$A2D8=0` and matched all 1,000 alternate codes and colour cells. `test_museum_maps.js` checks both against the processor model. The Levels tab displays both stored backgrounds and omits sprites.

From `work/floor-two.vsf`, holding up for 30 VICE frames and then right for 180 frames entered the portrait room, with `$8041=1`, `$8042=1` and `$A2D8=0`; two neutral frames followed. This floor state itself was reached through the forced earlier paths documented in `orientation.md`. The observed screen at `$4400` differs from the stored alternate array at nine cells in a 3-by-3 region; all 1,000 colour cells match the high nibbles at `$1C00`. The observed `$D016/$D018/$D021/$D022/$D023` values were `$D8/$1F/$F0/$F6/$FD`, matching the multicolour mode and palette used by the Levels viewer. `museum-alt-observed.json` and `test_museum_maps.js` preserve and check the observation.

The nine changed cells are written by `$82E8` when `$9485=0` and `$8041=1`. With `$8046=0`, the routine advances `$8044` on each call; every sixth call resets it and increments `$8045`; when that reaches 2 it is reset to 0, selecting the three-by-three patterns at `$837E–$8389` or `$838A–$8395`. When `$8046` is nonzero, it copies the pattern at `$8372–$837D` instead. Each table has three rows of four codes; this routine copies the first three codes of each row.

In a 20-frame VICE trace from the observed portrait-room state, `$82E8` ran once per frame and the screen changed every six calls. `test_museum_animation.js` checks the twenty cell patterns and state values against the processor model, as well as the `$8046` branch. This is Oscar’s crib: two occupied patterns alternate, while `$8046` selects the empty pattern after pickup. The painter’s X bound is 3, so each four-byte row’s last code is outside that painter’s read range.

The observed crossing passed `$BFB2` with the second character’s X bytes `$FC0F/$FC07 = $01/$3A` and both room bytes `$8041/$804B = 0`. At the following `$8396` screen setup, those values were `$00/$40` and 1 respectively. The check at `$BFA1` takes this branch when the current room is zero, `$FC0F` is nonzero and `$FC07` is at least `$3A`; otherwise it advances the X pair by two. `museum-crossing-vice.json` records the two stops, and `test_museum_crossing.js` checks them and the adjacent threshold cases against the processor model.

From `work/alternate-observed.vsf`, holding left on port 2 returned to room zero. At `$BEB1`, the X bytes were `$00/$24` and the two room bytes were 1; at the ensuing screen setup they were `$01/$10` and 0. The check at `$BEA5` takes this path when the room is nonzero, the high X byte is zero and the low byte is below `$25`. `museum-return-vice.json` records the stops; `test_museum_crossing.js` checks the processor model and adjacent cases.

At `$FC73`, the museum compares the current room with four room values. For a mismatch, it saves the relevant sprite pointer bytes and substitutes pointer `$03`; when the room matches again, it restores the saved bytes. With the captured floor's VIC bank 1, pointer `$03` selects `$40C0–$40FE`, which contains 63 zero bytes in the entry, rope, floor and observed alternate-room snapshots. The code at `$FD51` uses comparison passes on Y values and rearranges the associated position, colour and sprite-pointer arrays. `$FDDA` then writes those arrays to the VIC sprite registers and `$47F8–$47FF`.

The Jondi museum file decodes into `$0800–$CFFF`, `$E000–$ED31`, `$F000–$F7E7` and `$FA67–$FFFE`. All 58,034 bytes stable under both initial RAM fills match its captured entry. The museum part lies over the third story and owns those ranges.

The dispatcher at `$9C47` moves slime projectiles in eight directions, selecting droplet sprites `$7C–$83`. The two active arrays `$949D–$949F` and `$94B2–$94B4` hold three projectiles per player. `$9C94` clears a slot at its travel boundary.

The call at `$9B5A` cycles through three movement slots, handling one per invocation. For an active slot it copies the direction and position into shared state, calls the movement routines, then copies the position back. An inactive slot writes `$03` to `$FC2B`.

Before applying a directional update, `$9B79` calls `$9E18` to check a position-derived table byte and `$9EB4` to compare the position with a second bounded area. Either check can clear the active slot; the second calls `$A474` on a match. The objects and table value involved are not identified.

The placement path at `$96F8` puts down carried Oscar. It derives two screen rows from the player’s position, adjusts around scenery codes, restores the normal facing sprite and sets `$9485`. `$9981` writes the two-row baby image, using two or four columns according to the available floor cells.

The eight movement handlers at `$9CAA–$9E17` select slime droplet pointers `$7C–$83`, stored at `$5F00–$60FE`. Each player can have three moving drops, published through one sprite slot in turn. Equipment value `$3C` selects this weapon; `$3D` selects the proton beam.

The routine at `$9A71` initializes the first available one of three movement slots. It gets a direction and origin from `$FE30`, whose lookup maps sprite-pointer values `$60–$67` through the direction table at `$FE28` and position offsets at `$9469/$9471`. The direction byte at `$FE18` is RAM in the captured `$01=$35` state, despite sharing an address with a KERNAL entry.

At `$9A17`, a new fire press can allocate one of the first player’s three slime projectiles through `$9A71`; held fire does not repeat. Each shot consumes one weapon-energy row. Pickup and placement of Oscar take precedence and suppress the shot. A nonzero exhausted-energy flag delays firing.

After an indexed projectile overlap, `$C33D` or `$C35D` selects a character-strength gauge using `$8026/$8027`. `$C376`, `$C42B`, `$C4E0` and `$C595` remove rows from the four gauges. Empty gauges set the corresponding `$C319–$C31C` death flag. `$C321` restores one row every 42 calls.

The two eight-byte tables at `$9618/$9620` pair the eight normal facing poses with eight Oscar-carrying poses. Pickup `$957A` maps forward, records the carrier in `$947F`, and sets `$947E/$8046`; placing Oscar maps back and clears carrying. VICE confirmed pointer `$64` changing to `$AE`, carrier 0 and the empty-crib flag.

The floor helper at `$B6E4` converts an offset position into character-cell coordinates. The separate routine at `$B72D` halves two X positions; byte sequences elsewhere decode as calls to it, but their execution paths remain open. In the Jondi museum entry and four later saved states, eight unconditional jumps at `$B7FB`, `$B911`, `$BA0A`, `$BB5F`, `$BC92`, `$BD79`, `$BE43` and `$BF69` skip position-comparison blocks. Each skipped block can return before a movement update when its comparisons match. Other possible entries into the blocks have not been ruled out, and their origin is unestablished.

An [alternative image on the Censor release page](https://csdb.dk/release/?id=78781) contains a complete `7.THE MUSEUM` file. Its 28,376 raw bytes, including the load address, have SHA-256 `390f8a8edce40a94a07273100f3839378cbf352b4ab500a5682baedb5a447d6a`, identical to the Jondi museum file. Its `5.THE LIBERTY` file is also byte-identical to Jondi’s. The alternative therefore does not independently establish the origin of the museum jumps.

The shared sound-effect record 13 is requested when either side initializes a movement slot after the fire-input path. Record 16 is requested when the proximity test at `$957A` matches. These are established uses, not exclusive names: shared sound records can also be selected by other episodes.

The ledger includes 11,675 bytes previously outside the count. Nineteen stretches match stable unpacker output at the entry snapshot; three are copies visible in play whose sources are present at entry. Their individual purposes remain open.

The routine at `$871B` maintains the first player’s proton beam, toggled by a fresh fire press. `$8DC2` handles the second beam. Facing selects one of eight beam directions, with pointers `$70–$7B`; an energy row is charged every 26 update calls. Lookup cells with value 1 terminate the beam. Damage requires both stored beam-hit flags; a flag can remain set after that beam is switched off.

The museum and ending snapshots match byte for byte at `$EB5C–$ED31`. The command-handler bytes used to interpret these streams also match at `$E266–$E27F`, `$E338–$E345` and `$E3B7–$E43A`. The museum listing carries the same sequence pointers and ordered stream decodes as the ending; the shared ending tune’s measured music-state period is 49,152 updates after a 19,662-update prefix, with inactive effect-noise state excluded.

The museum contains two 24-by-40 lookup grids at `$F000–$F3BF` and `$F400–$F7BF`, identical in the entry and play captures. The screen-row table at `$8428` runs from `$4400` to `$4798` in steps of 40; lookup routines add a calculated column and change its high byte to address one of the grids. The first grid contains 0, 1 and 5; the second contains 0 and 1. At `$8C7A`, a lookup of 1 calls `$87E0`, which clears `$FC0B/$FC13/$FC1B`; three related checks also test for 1. For the beam and enemy-attack checks, value 1 is solid and stops the effect. Values 0 and 5 pass these exact comparisons; the code gives 5 no separate response in these readers.

The joystick direction paths also write an animated sprite pointer to `$FC26,Y`. Their eight-slot groups begin at `$48` (up-left), `$28` (up-right), `$20` (up), `$58` (down-left), `$38` (down-right), `$40` (down), `$50` (left) and `$30` (right). A shared counter advances on those paths; when it reaches four, the selected path advances its immediate pointer and wraps after eight values. `$FDCA–$FDFD` transfers the prepared pointer values to the VIC screen pointer table. The 64 slots at `$4800–$57FF` match in the entry and play snapshots, and the Graphics tab shows their 63-byte bitmaps.

Other scene paths select sprite pointers `$68–$6F` for `$FC29` and `$70–$7B` for `$FC2B/$FC2C`. The tables at `$C674/$C679` select `$84–$8B`, and paths at `$A7DD/$A836` cycle through `$98–$9B` and `$9C–$9F`. Their 36 sprite slots match between entry and play and are available in the Graphics tab. The `$68–$6F` shapes form the opponent’s moving body, `$70–$7B` are proton beams, `$84–$8B` are the paired collapse frames, and `$98–$9F` depict the travelling enemy attack.

The eight values at `$8029–$8030` form four pairs of pointers `$8C–$93`. `$86B6` and `$C69D` copy a selected pair into the raster operands at `$09D2/$09DC`; the raster handler also selects `$94–$96`. All eleven slots differ between entry and play. The Graphics tab shows their captured play-state bitmaps, which match the initial memory in the captured floor frame.

The panel raster handler uses single-colour sprites in VIC bank 0. Pointer `$39` followed by `$3A` selects the bitmap halves that read OK; when a corresponding byte at `$801D–$8020` equals 1, setup changes that pair’s starting pointer to `$35`, selecting the halves that read DEAD. The four bitmap slots match between entry and play. The Graphics tab displays both words.

The interaction path at `$A101` allocates one of the second player’s three slime projectile slots `$94B2–$94B4`, plays effect `$0D`, and consumes weapon energy through `$C04C`. It then derives the direction and origin from the player’s facing sprite, parallel to `$9A71`.

The position check at `$A9D5` compares the enemy attack against a Ghostbuster in the same room. A hit calls the character-strength depletion dispatcher ten times, plays effect `$19`, and clears the active attack. Janosz and the later actor phases create this attack from their own positions.

`$FEA7` calculates the second Ghostbuster’s weapon origin and facing direction from `$FC27` and `$FC07/$FC0F/$FC17`, parallel to `$FE30` for the first. `$C04C` removes one row from the selected character’s weapon-energy gauge.

The adjacent stored sprite slots `$0DC0/$0E00` spell DAZED when drawn together. They match between the entry and play snapshots. The panel’s status handler at `$CB13` selects OK or DEAD and contains no branch selecting DAZED; the Graphics tab therefore labels that pair as stored data.

At `$A6CE`, the museum code compares a state byte and a pair of position bytes against stored targets. An exact match sets `$A313`; other cases choose one of two helper paths. One entry into the helper at `$B95F` resets Y to zero, while entry at `$B961` uses Y=4. The target is one of the two Ghostbusters. `$AABE` chooses a surviving player from `$8026/$8027`, saves that player’s position and room, and clears the alignment flags.

`$AF15` advances a five-step counter and then a 22-step frame counter. Values 1–21 select paired sprite pointers from `$A31A/$A330`; at the end it takes one of two state-transition paths. The adjacent bytes at `$A346–$A363` contain further pointer sequences outside the 1–21 indices used by this animation. `$AFAB` can then copy a position into `$A2DC–$A2DE` and set `$A2DA`. These are the opponent’s emergence and travel stages between the Janosz fight and later beam phases.

The museum paths at `$C6CE/$C808` draw and erase the nineteen-cell descent rope. They preserve every underlying screen and colour byte in `$C64A/$C65E`, advancing forty bytes per segment and restoring the saved cells in reverse order.

`$8D0D` and `$93B4` clear and recompute the two proton-beam hit flags `$A318/$A319`. Each endpoint test requires the actor in the same room and phase 1 or 2; damage requires both stored result flags. Either hit test calls the appropriate Vigo damage entry when both stored flags are set. VICE confirmed one beam sets a flag without damage and the second advances the shared counter.

`$8DC2` dispatches the second proton beam’s eight facing directions, then tests its lookup cell and overlap with Vigo. It shares the carrying/weapon-energy gates of the first beam and uses a separate endpoint and hit flag.

`$9321` derives a lookup-grid address from the second motion position, selects the `$F000` or `$F400` grid using `$804B`, and clears the position when the selected byte is 1 or its Y value is below `$38`. The address calculation adds 31 when the adjusted X high byte is nonzero. This reader stops the beam only for value 1; both 0 and 5 pass, subject to the separate top-of-screen bound.

`$93B4` performs a second gated position comparison, paralleling `$8D0D`. It sets `$A319` on a match and reaches a state-specific handler only when `$A318` is also set.

When both stored beam-hit flags are set, `$A4DF/$A4E7` mark phase-specific Vigo damage. Every second damage-entry call, `$A4FF` empties one of twenty gauge rows. Forty damage-entry calls without restoration empty it. `$AE8F` restores one row per eight calls while the hurt flag is set, so interrupted attacks can lose progress.

At `$AE8F`, another byte-copy path reverses the address changes made by `$A4FF`, stepping them backward by three every eighth update. `$94DC` gates its scene updates on state bytes and, for one selected state, reads the active-low joystick-port-2 fire line with a held-button latch at `$9489`; a new press reaches one of two interaction calls and toggles motion mode. Port configuration can affect the read.

`$A0A7` detects the second player’s new fire press for slime shots. Both players check Oscar pickup and placement before weapon use. Placement adjusts the two screen rows by one column or one row and the matching game position by eight pixels.

When `$805E` is 1, `$C913` sets a status byte selected by `$8025−1` to 1, then calls `$CA10` to reset scene state and sprite positions. The status panel selects the DEAD sprite pair for a status value of 1. The rope landing handler produces these fatal outcomes when descent speed is at least 6; the fourth deployed character uses value 2.

After the rope state sets `$805B`, `$C7BE` tests landing speed `$8058`. Speeds below 6 erase the rope normally. Speeds 6–8 play the paired collapse sprites, then set fatal outcome `$805E` to 1, or 2 if this is the fourth deployed character. VICE verified speed 5 restoring a rope cell and speed 6 entering the fatal outcome after 25 calls.

After the marked column has been restored, `$C843` clears four state bytes and selects a scene transition using `$C673` and `$805E`. One branch marks the selected status byte as 1 before calling `$C9DB`; another does so before changing the active selection and rebuilding the screen.

`$C9DB` resets the first scene position and its column-copy addresses after calling `$C999`. It parallels the second-position reset at `$CA10`, using different sprite-array entries and column addresses.

`$AD07` lets Janosz recapture dropped Oscar when their rooms and position bounds overlap. `$AD76` then clears carried/dropped state and restores Oscar to his crib at room 1, X `$00C5`, Y `$A5`. `$A93E` separately stops enemy attacks when their lookup-grid cell is solid.

`$AD97` selects the phase step, reverse byte-copy path, or other scene updates according to `$A302/$A301/$A303`. One path copies the position at `$FC09/$FC11/$FC19` into the active-position fields and sets `$A2DA` after a counter expires. The flags distinguish the actor’s collapse, the reversible strength-gauge update, and the chase/attack phase. `$A2DA` marks a travelling enemy attack; `$AABE` chooses its player target.

All 58,034 stable output addresses from the packed load have records in this part’s listing. The listing uses the later play snapshot and differs from the matching load-time snapshot at 1,713 output addresses; these differences are not all classified. The loaded-byte coverage range includes the previously omitted bytes as unexplained.

The raster setup at `$081F` installs the dispatcher at `$0851` and schedules `$086D`. That handler writes the sprite positions, and, when its selected sprite passes the pointer and Y checks, copies two twelve-byte spans to `$4033` and `$4000` and schedules the split at `$0922`. The split updates that sprite’s Y and pointer, waits for the raster to pass a second Y, and changes its pointer again. `$0942` schedules the lower handler at `$094E`; the lower handler resets sprite settings, updates sound, schedules `$086D` and prepares room sprites. The split draws the opponent’s paired body images with one hardware sprite reused lower on the screen. `$8018` supplies the second pointer, while `$FD51` records the sorted position of logical opponent slot 4.

The four first-pair floor-movement probes at `$B752`, `$B84B`, `$B961` and `$BAB6` compare the probed character with `$40`: `$00–$3F` permit movement and `$40–$FF` block it. With no active `$A2E4` request, the accepted steps change Y by one or X by two. Sixteen forced VICE calls, four directions with cell codes `$00`, `$3F`, `$40` and `$FF`, matched the processor model; each VICE call also counted its entry as a positive control. This tests the collision threshold, not a route to those cells.


## Weapons, opponents and rescue

The equipment panel stores `$3C` for the slime weapon, `$3D` for the proton beam, `$3E` for an empty hand cursor and `$3F` for an empty equipment slot. Each of the four characters has weapon energy and strength, shown in paired sprites `$8C–$93`. Weapon energy removes one of twenty rows per slime shot, or per 26 proton-beam updates. Its recharge restores one row per 42 calls to `$C010`; these are update counts, not a measured frame duration. VICE confirmed exhaustion and one recharge step.

In phase 0, slime projectiles can hit Janosz through `$9EB4`. Each hit removes two of twenty strength rows at `$A474`; ten uninterrupted hits empty the gauge. While hurt, he restores one row per sixteen updates through `$A585`. Once empty, a 25-call collapse sequence changes `$8050` from 0 to 1. VICE confirmed the positioned projectile hit and the complete gauge-to-phase transition.

Phases 1 and 2 test both proton-beam hit flags. The intended simultaneous-beam rule has a stale-state exception described below. Forty damage-entry calls without restoration empty the twenty-row gauge; after 25 collapse calls, phase 1 enters phase 2 and refills the gauge, while phase 2 jumps to congratulations. These are controlled code-path tests: they establish the rules and transitions, not a complete winning input route. The published analysis must keep that distinction.

The manual’s rope instruction is up to close the hands and down to open them. This agrees with `$C74C–$C77B`: up reduces downward speed, down increases it, and gravity increases nonzero speed every fourth descent update. The game uses the same walking sprite pointers during descent; there is no separate changing hand-pose sprite in that path.


## Stale beam flags and pickup suppression

The beam tests at `$8D0D/$93B4` clear and recalculate only their own hit flags `$A318/$A319`. Turning a beam off at `$99F0/$A080` clears its active flag, but leaves its hit flag untouched. The weapon dispatchers then skip that beam’s test, preserving the previous hit. In VICE, registering the first hit, calling the real off toggle, and updating the second hit test four times left the first beam inactive but advanced the strength source from `$42C0` to `$42C6`. The intended two-beam rule therefore admits a stale-flag exception.

The second-player proton toggle at `$A080` tests `$9486`, the first player’s pickup/placement suppression byte. The second player’s interaction sets `$9487`; its slime path correctly consumes that byte, while the proton toggle does not. A VICE call with `$9486=0`, `$9487=1` and the second beam inactive enabled that beam and left `$9487` set. This is a verified state-path asymmetry; it is not evidence of a complete winning exploit route.

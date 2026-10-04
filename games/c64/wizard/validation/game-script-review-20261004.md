# GAME compiled-script cold review — 4 October 2026

Baseline `db7640ac883e7996f6b2b9e7589e4501ebaa3757`. Scope $2800–$4A88, original GAME only; BLDR excluded. All 76 high-level comments reviewed. No game annotations were edited by this reviewer.

Saved-first sample: seed202610042; 83 eligible comments; 2/20 incorrect (10.0%). Approximate Wilson95% interval 2.8–30.1%. This measures this population only, not the whole listing.

symbols.json comments with 0x296E <= address <= 0x4A88 and len(text) >= 100 Unicode codepoints; all comment types; no manual exclusions. Python random.Random(seed).sample(population,20), population sorted by (address,type,text). Baseline texts, full population and SHA retained in JSON.

## Confirmed corrections

### $3831
Baseline: Stop demo mode, sum surviving accounts and end the session when none remain. Otherwise advance round; after ten completed levels show the bonus screen. Mystery chooses another random level before continuing.
Evidence: SYS7054 resolves to7FC0 and restores six mutable glyphs; new original execution preservesC006=3 and801D=EA. Counts live accounts, handles zero survivors, advances round, random Mystery and ten-round bonus. First clause is wrong.
Replacement: Restore six mutable character images through SYS $7054, sum surviving accounts and end the session when none remain. Otherwise advance round; after ten completed levels show the bonus screen. Mystery chooses another random level before continuing. This call does not disable demo playback.

### $3E6C
Baseline: After repeated disk failures stop game activity, index the display, clear bonus and all six life accounts, force turn progression and end the session.
Evidence: Original SYS7015->7C78 enables game IRQs (probeD01A4,DC0F1,vector7CBF); SYS7009 indexes animated cells. Clears all6 lifeaccounts, sets player=players,round10 then3744 to terminate through normal settlement. First action wording wrong.
Replacement: After repeated disk failures, enable game interrupts through SYS $7015 and index animated cells through SYS $7009. Clear bonus and all six life accounts, set player to the selected player count and round to 10, then enter account settlement at $3744 to end the session.

### $4386
Baseline: Position each final-score row, choose alternating reverse text and one of six colors, and print the unscaled player score. Wait for FIRE/timeout, update statistics, then save and display the rankings.
Evidence: Perplayer printed values/colors traced. After rows440E zeroscounter;444C calls48F0 before444F wait, opposite the baseline ordering. Full3EA2->444F probe with6players incrementsstat12 in two calls.
Replacement: Position each final-score row, choose alternating reverse text and one of six colors, and print the unscaled player score. Call the statistics updater at $444C before waiting for FIRE or timeout, then save and display the rankings. The ordinary end-session path also called that updater at $3EB3.

### $444F
Baseline: Delay/poll FIRE with a 75-iteration timeout, reset border/background, wait for button release and enter high-score save/display.
Evidence: Counter initialized0 at440E, increments445C then tests >75 at4461, so76delay/poll passes withoutFIRE; new original-code probe confirms76. Release loop4492 then3EB9 save/display.
Replacement: Delay and poll FIRE until the counter exceeds 75: from its zero initialization this takes 76 delay iterations without FIRE. Reset border/background, wait for button release and enter high-score save/display.

## Precision notes

- $2964: The first initializer record at $2964 has type $64 at $2966, causing startup to return without copying any descriptor records. The following $81 fill extends through $296D before the first opcode at $296E.

- $48F0: Choose counter pair $C15C/$C15E when difficulty_base<40, otherwise $C15D/$C15F. Add selected player count modulo 256 to the low byte and carry to the high byte. The ordinary end-session path calls this at $3EB3 and $444C, adding twice the player count before the final-score wait; the demo display path bypasses both. These fields are included in SCOR when that record is saved. No display or threshold meaning is established here.

- $4A3A: Decrement demo selection. If it reaches zero return; otherwise reset one selected player and one life, clear the three stored score bytes for player 1, and initialize the selected resident demo through SYS $7033. This block does not clear scalar V12.

## Saved sample judgments

### $404C — supported
Fetch the packed numeric top-score element, compute its decimal width, print value*50 and position a wizard sprite beside the leader. Show the continue prompt.
F0 1D29 fetches first packed numeric element. Forced-int V19LOG decimal width, printINT(50*score), configure sprite0 atX308Y55 and show continue prompt.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $4702 — supported
Read ten three-byte little-endian score values from split SCOR columns $C11E/$C128/$C132 and store them as the five-byte working numeric array at $291D.
Original FOR0..9 reconstructsC11E +256*C128 +65536*C132, writesfive-byte array291D. New10-value roundtrip includes0,255,256,65535,65536,0xFFFFFF.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $2971 — supported
Read $99E8 and $58FF looking for marker $FA. Either match returns; otherwise enter the secondary check/destructive in-RAM failure path at $4878.
Original PEEK99E8==250 returns297E; otherwise PEEK58FF==250 returns2988; else GOTO4878. New original-code marker probes cover all three RAM marker returns.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $4A87 — supported
Two END bytecodes terminate the compiled image; the loader reports the first byte after them as $4A89.
Original PRG load0801 pluspayload sizeendsat4A89. Bytecode4A87/4A88 bothD3 END. Exact sentinels and exclusive fileend confirmed; loader-run provenance belongs parent.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3E6C — incorrect
After repeated disk failures stop game activity, index the display, clear bonus and all six life accounts, force turn progression and end the session.
Original SYS7015->7C78 enables game IRQs (probeD01A4,DC0F1,vector7CBF); SYS7009 indexes animated cells. Clears all6 lifeaccounts, sets player=players,round10 then3744 to terminate through normal settlement. First action wording wrong.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3132 — supported
Set cast latch, reduce actor horizontal pursuit speeds to +1/-1 and increase loop delay by one when its old value is below 64.
New cases delay0,31,63,64,65,127 yield1,32,64,64,65,127; all setC02D=1,C06E=1,C06F=255.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $29C6 — supported
Restore player lives/score, disable game interrupts, and derive disk level from difficulty base plus round. Mystery clears round and uses base & 127; values above 39 invoke FN30. Pass zero-based level through FB and call level load. LOAD accepts status $40. FIRE retries can reach a fourth LOAD, but the counter>2 check at $2A1A aborts before testing even a successful fourth status. The no-FIRE wait at $2A34 does not advance its timeout counter.
315B account import;7018 IRQ disable; base bit7 resets round; low7>39 calls FN(30);7003 LOAD then counter>2 checked before FB==64. Existing303-case accounting and30-case score-path suites rerun successfully.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $349A — supported
Show the player-count prompt and initialize count one. Each new directional press increments it; comparison with seven adds -6, wrapping six back to one. FIRE accepts, with warning sounds and title return on timeout. Live: five joystick edges from one player select six, confirmed by menu text and scalar value.
Normal caller324D initializedV13=1; prompt displays1. Original seven-edge probe gives2,3,4,5,6,1,2; no increment while held at354F. TimeoutV3>3700/warnings at200 intervals >3199. Historical live five-edge observation not repeated.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $30EE — supported
Compiled spell handler: arm cast latch, clear event and SYS $7075 to set coordinate-exchange effect 1. The first target is the level start; later targets are remembered departure coordinates. $79B3 adds a random-direction two-pixel horizontal nudge after exchanging positions.
Original script setsC02D=1 and clearsC02C; new native-call probe runs7075->7956 and yieldsC035=1. Native79B3 checks rememberedY C09C: zero usesC31E/C31F/C352 start; otherwise remembered coordinates; stores departure and tail selects two-pixel left/right. Native dependent behavior traced, no gameplay reachability claim.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $4878 — supported
Accept marker $FA at VIC read $D024, $58FF or $99F0; if none matches, overwrite $6400-$7FFF with bytes copied from $0000-$1BFF and loop displaying BYE. This deliberately destroys resident engine RAM, not the disk.
PEEKD024,58FF,99F0 accept250. Allfail copiesFOR6400..7FFF fromaddress-6400 then BYEloop48C5. Original test verifiesstable source0200..1BFF anddestinationboundaries; zero-page/stack source changes while interpreter runs.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $324D — supported
Initialize menu/session values and SID/VIC appearance; print the six choices Beginner, Intermediate, Advanced, Expert, Customized and Mystery, with joystick/FIRE instructions.
Player/playercount=1; V9=DC00; SID/VIC writes and literal labels six choices. Parent menu state follows3377.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3D96 — supported
Read lives and parse eight HUD score cells as decimal, ignoring nondigits. Remaining bonus units each add 50 points; each exact 10000-point threshold grants a life and sounds. Return with account score/lives updated. Live prepared checks include 0+24 units=1200 and 9950+1 unit=10000 with lives 6 to 7. The retained Burning Bridges exit checkpoint settles 2550+17 units to 3400 before loading L18T.
Digits accepted only48..57 in eight fixed decimal positions. New nondigit case x1?2 3y4 ->1020304. Rerun150 bonus cases include exact10000 threshold; lives updates and sounds onlyon exact multiples during50 increments. Historical live checkpoint evidence not replayed here.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $4A3A — supported
Decrement demo selection. If it reaches zero return; otherwise reset one player with one life and zero score, copy the selected resident demonstration level/input stream via SYS $7033 and return.
DecrementC006; zero returns4A59. Nonzero setsoneplayer/onelife andzeroes stored player1 score bytes, then7033. New probe shows V12 score scalar preserved at123450; baseline zero-score phrase supported only as account reset, not blanket scalar reset.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test. DecrementC006; zero returns4A59. Nonzero setsoneplayer/onelife andzeroes stored player1 score bytes, then7033. New probe shows V12 score scalar preserved at123450; baseline zero-score phrase supported only as account reset, not blanket scalar reset.

### $298C — supported
Define the random-index helper and unpack high scores. Demo state selects attract setup; otherwise run difficulty/player menus, restore the selected player account and enter level loading.
GOSUB46EB defines FN and falls through4702 unpacker before return. C006 selects4A3A then2AAE; normal29A9 calls324D and falls to29C6. Demo entry298F bypasses repeated definition/unpack.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3DEA — supported
bytecode: A$='<13><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><05><1D><1D><1D><1D><1D><1D><1D><1D><1D>      Bonus: '
Original opcode $46, length 47, at $3DEA; literal length byte=45, payload ends $3E18. Baseline text exactly matches each private input byte under the stated PETSCII notation; this is operand-level evidence, not a rendering test.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3831 — incorrect
Stop demo mode, sum surviving accounts and end the session when none remain. Otherwise advance round; after ten completed levels show the bonus screen. Mystery chooses another random level before continuing.
SYS7054 resolves to7FC0 and restores six mutable glyphs; new original execution preservesC006=3 and801D=EA. Counts live accounts, handles zero survivors, advances round, random Mystery and ten-round bonus. First clause is wrong.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $3F38 — supported
bytecode: A$='<13><1D><1D><1D><1D><1D><1D><1D><1D><1D><05><AD><9B><12> WIZARD High Scores<92><05><AD>'
Original opcode $46, length 38, at $3F38; literal length byte=36, payload ends $3F5D. Baseline text exactly matches each private input byte under the stated PETSCII notation; this is operand-level evidence, not a rendering test.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $2B6E — supported
Compiled death gate: reached only after nonzero $C02A, unless active $C035 travel cleared it. Sprite-7 color 2 bypasses Invisibility. Otherwise nonzero V21 suppresses this fatal report, clears $C02A and enters $30B3; safe movement passes do not spend V21. Original interpreter matrix: 84 states; safe passes, all 32 protected reports and the next death checked live.
New48-case matrix enters at2B45 across travel0/1,fatal0/1/128,color2/4,V21=0/1/16/32. Safe/travel goes2B5E; color2 forces2B90; protected fatal clearsC02A and goes30B3. It has not spent V21 before30B3. Historical84-case/live provenance not rerun here.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $42A2 — supported
Finish numeric insertion, then match each nonzero player score to the first unclaimed equal entry and call name/initials input. This does not track which entry that player inserted: a champion tie can replace the champion name, and a bottom-rank tie can replace initials without numeric insertion. Live top/bottom ties and a six-player prepared ranking confirm the prompts, flags, fields and saved records. Then print final scores in player order.
NEXT completes insertion then attribution loopsplayerorder,dividespoints50withoutINT, matchesfirstzero-flag equal score and labelsplayer. Native-name/initials supplied test checks prompts/flags/copiedfields/ranking. Historical VICE input/disk observations not rerun.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

### $349D — supported
bytecode: A$='<13><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><11><9F>Select number of players with joystick:<05>1'
Original opcode $46, length 63, at $349D; literal length byte=61, payload ends $34DB. Baseline text exactly matches each private input byte under the stated PETSCII notation; this is operand-level evidence, not a rendering test.
Uncertainty: Live-history claims are not newly certified by this subaudit. Original-code execution uses supplied I/O and suppressed printing; it is not a full-machine or reachability test.

## Full high-level pass

| Address | Verdict | Evidence |
|---|---|---|
| $2800 | supported | $2800-$28FF are 32 records at stride8. Native reviewer executed $2281 and confirmed six cleared value bytes and flag behavior: forced integer5 preserved; untyped $96 becomes1. The prose is correct for declared types but does not explain sentinel conversion. |
| $2801 | supported | Indexed offsets belong to the same stride8 record; no second allocation. See $2800 native startup check. |
| $2802 | supported | Original scalar access offsets0..5 hold value/descriptor and offset6 flags; stride8. See native interpreter review. |
| $2803 | supported | Original scalar access offsets0..5 hold value/descriptor and offset6 flags; stride8. See native interpreter review. |
| $2804 | supported | Original scalar access offsets0..5 hold value/descriptor and offset6 flags; stride8. See native interpreter review. |
| $2805 | supported | Original scalar access offsets0..5 hold value/descriptor and offset6 flags; stride8. See native interpreter review. |
| $2806 | supported | Original scalar access offsets0..5 hold value/descriptor and offset6 flags; stride8. See native interpreter review. |
| $2900 | supported | Four extended records at $2900,$2907,$290E,$2915. Native initialization walks stride7 after page28; FD/FE/FF accesses use the extended index. |
| $291C | supported | Original header array start291D/end2964 defines half-open zeroed interval291D..2963. FC291D array operations and FA descriptors294F/2954/2959/295E fall within it. $291C itself is outside zeroed interval. |
| $2964 | supported_with_clarification | Private PRG bytes2964..296D=00 00 64 81 81 81 81 81 81 81. Native $2281 initializer reads the type at record+2, so terminator is2966; no initializer records copied. |
| $296E | supported | Original bytes D1 8C 29 perform absolute GOTO298C; following2971 is called only by2AAE in the decoded GAME. |
| $2971 | supported | Original PEEK99E8==250 returns297E; otherwise PEEK58FF==250 returns2988; else GOTO4878. New original-code marker probes cover all three RAM marker returns. |
| $298C | supported | GOSUB46EB defines FN and falls through4702 unpacker before return. C006 selects4A3A then2AAE; normal29A9 calls324D and falls to29C6. Demo entry298F bypasses repeated definition/unpack. |
| $29C6 | supported | 315B account import;7018 IRQ disable; base bit7 resets round; low7>39 calls FN(30);7003 LOAD then counter>2 checked before FB==64. Existing303-case accounting and30-case score-path suites rerun successfully. |
| $2A34 | supported | Increment at2A7A..2A83 precedes back-edge target2A84. FIRE sets INT(V3+1); no-FIRE path checks stale fraction and jumps2AAB->2A84. Rerun original test observes10000 polls plus FIRE positive exit control. Historical VICE counts not rerun here. |
| $2AAE | supported | 2971 protection,3192 aliases,7030 only level37;2ACF resets start,7015 enables IRQs,7036 materializes. C007 derived low7 base/10 then forced1 for base>=40. |
| $2B19 | supported | Original bytes2B19..2B35 compute4*(9-speed)^1.15+2-2*(speed==9), true=-1. V16 is forced integer, so stored delay truncates fractional result. Main player/event/death/delay/actor order checked through2B6B. |
| $2B6E | supported | New48-case matrix enters at2B45 across travel0/1,fatal0/1/128,color2/4,V21=0/1/16/32. Safe/travel goes2B5E; color2 forces2B90; protected fatal clearsC02A and goes30B3. It has not spent V21 before30B3. Historical84-case/live provenance not rerun here. |
| $2C26 | supported | Original bytecode savesC351,C366,C36E,C31C; initializesC058=1,C05F=2,C051=(197-sprite6Y)/2; uses shape221 and enables bit6 after speed-dependent delay adjustment. |
| $2CDC | supported | 703F actor update,705D delay,706C death animation precede height/feet checks. Escape gate computes V22=SGN(charge-48)*spell and accepts5<V22<9; remaining life animation loops whileC066 nonzero. |
| $2DA3 | supported | Restores three spell fields, saves/zeros/restoresC034 around3D96, decrements lives, updatesC008 and HUD. Positive lives GOTO2ACF same player; else bonus0 and373D settlement. Existing accounting suite plus direct branch trace; historical VICE cases not rerun. |
| $2E21 | supported | Decrements HUD charge, removes effect sprite bit6, setsC02D=1. Spell6 calls7075;7/8 compute7069-(spell&1)*6 =>7063/7069. ClearsC02C and rejoins2B19 delay computation. |
| $2E8B | supported | 704B clears status area, literal prints bonus caption and six $BC cells, then falls through2EC0 shared HUD. |
| $2EC0 | supported | Prints player and ((round+base+1)&127), charge digit-48 and C005 speed; writesC02E=1 and importsC008 to V10. |
| $2F57 | supported | Prints zero score field,704E spell name; positive saved score right-aligned via LOG10 width, converts spaces48 in C7B7..C7BE; icon loop2..10 uses lives comparison. Life1 returns before loop. |
| $304C | supported | ClearsC02C then GOSUB3D96 and GOTO373D. The only direct completion branch is3059 bit7 test. |
| $3059 | supported | New256-byte exhaustive event test: bit7 routes304C; otherwise low6 bits5..10 choose named handlers,0..4 and11..63 fall through308E. Clears event before spell dispatch. ON cannot receive128..255 here. |
| $3091 | supported | New test confirms V21=32,sprite7 color=D021,clearsD01C bit7. 2B6E matrix verifies red bypass; no wall-clock decrement. |
| $30B3 | supported | New32-step original execution confirms decrement, multicolor restoration at16, integer-truncated10-V21/3 below9 and finalcolor4 at0. |
| $30EE | supported | Original script setsC02D=1 and clearsC02C; new native-call probe runs7075->7956 and yieldsC035=1. Native79B3 checks rememberedY C09C: zero usesC31E/C31F/C352 start; otherwise remembered coordinates; stores departure and tail selects two-pixel left/right. Native dependent behavior traced, no gameplay reachability claim. |
| $3106 | supported | Script setsC02D=1, calls7063->794E storing effect6; native effect table7987 selects downward path7A4E. Terrain-dependent ending follows native update, outside detailed script sample. |
| $3117 | supported | Script setsC02D=1, calls7069->7952 storing effect4; native effect table7987 selects upward path7A46. Terrain-dependent ending follows native update. |
| $3128 | supported | Bytecode reads V16, divides2,adds1,stores forced-int V16 and rejoins2B67 actors; no separate player-speed scalar changed. |
| $3132 | supported | New cases delay0,31,63,64,65,127 yield1,32,64,64,65,127; all setC02D=1,C06E=1,C06F=255. |
| $315B | supported | Reconstructs life from02BF+player and score from02C5+player +256*(02CB+player)+65536*(02D1+player), thenC008. Rerun account30 cases covers6 players and byte boundaries. |
| $3192 | supported | Literal scalar assignments set aliases D000,D400,C7F8,C02A,C03D,C300. V21/temporary reset andcharge48 precede three FN definitions and clear loop. Lives/score not reset here. |
| $31F2 | supported | FA54 29 F8 31 1F defines FN2954; body saves2810 local then D00E minus256*(D010>127), with true=-1, yielding nine-bit X; restores local. |
| $3211 | supported | FN2959 body saves2810 then PEEK(D010)&127; restores local and returns. |
| $3224 | supported | FN295E body saves2810; PEEK(VIC+argument)-[same &V18], removing masked bits; restores argument local. |
| $323C | supported | FOR fromV15 throughV15+6 stores0; NEXT2800 returns324C. Sprite7 untouched by this loop. |
| $324D | supported | Player/playercount=1; V9=DC00; SID/VIC writes and literal labels six choices. Parent menu state follows3377. |
| $3377 | supported | Directions readDC00 bits0/1; subtract BASIC comparisons gives up-1/down+1 andwrap0..5. FIREbit4 selects; highlight loop12 chars and release loop3488. TimerV3>164 goes title; direction does not reset timer. |
| $349A | supported | Normal caller324D initializedV13=1; prompt displays1. Original seven-edge probe gives2,3,4,5,6,1,2; no increment while held at354F. TimeoutV3>3700/warnings at200 intervals >3199. Historical live five-edge observation not repeated. |
| $355F | supported | Release loop3563, literals identify speed keys, final poll35F2. CounterV3 is inherited from player-count menu, not reset; new boundary probe3299 reaches expiry3301. FIRE accepted prints footer and falls36AE. |
| $36AE | supported | V8=V5*10; >49 uses fractional(V3/29)*40 OR128, so initial Mystery depends on prior poll count. Clearround then FOR704..727 writes6 below710 else0. Rerun initialization case confirms24 bytes. |
| $373D | supported | Negative V10 clamped0; stores selected account and destructively reduces V12 to low remainder. C006>1 ensures demo life1; zero lives calls388E. Next-or-round chooses37BC/3831. Rerun account/rotation cases support normal callers. |
| $37BC | supported | IncrementsV11 then reads life; zero skips via37B4. Surviving account prints ready, disables IRQs and goes298F ifC006 nonzero, else29C6. Rerun all64 survivor masks. |
| $3831 | incorrect | SYS7054 resolves to7FC0 and restores six mutable glyphs; new original execution preservesC006=3 and801D=EA. Counts live accounts, handles zero survivors, advances round, random Mystery and ten-round bonus. First clause is wrong. |
| $388E | supported | ClearsC061/C034; configures four expanded sprites and fifth effect, colors/SID,FOR Y255 down to221. Entire subsequent39DC animation traced. |
| $39DC | supported | Dissolves sprite4 viaFB4/7039, then sprite6 X0..328 step4; writes lowX and bit6, tests exact(V2-96)/48 slots0..3 and dissolves crossed letter. Disables sprites/expansion at end. |
| $3B06 | supported | Original stores C31F toD00F,INT(C31E/2)*2 toD00E andC352 toD010. LowX rounded down even. |
| $3B2F | supported | V5 !=4 returns immediately; selection4 prints two literal custom-disk lines. Single caller349A. |
| $3BA5 | supported | 7018 disable IRQs; prints ten-level message; for each selected player skipzero else addINT(base/10+2)&255. Rerun seven bases including30->Mystery transition and life wrapping. |
| $3C51 | supported | Displays selected player life/dead rows; FIRE or V3 reaching20000 exits. Resetsround0, adds10 then changes resultingbase40 to128. It does not change an incoming40 to128. |
| $3D96 | supported | Digits accepted only48..57 in eight fixed decimal positions. New nondigit case x1?2 3y4 ->1020304. Rerun150 bonus cases include exact10000 threshold; lives updates and sounds onlyon exact multiples during50 increments. Historical live checkpoint evidence not replayed here. |
| $3E6C | incorrect | Original SYS7015->7C78 enables game IRQs (probeD01A4,DC0F1,vector7CBF); SYS7009 indexes animated cells. Clears all6 lifeaccounts, sets player=players,round10 then3744 to terminate through normal settlement. First action wording wrong. |
| $3EA2 | supported | 7018 disablesIRQs. C006nonzero skips to3EBC shared display; normal3EB3 calls48F0 then419A ranking. Normal flow calls48F0 again at444C before wait. |
| $3F38 | supported | Literal heading/ranklabels; ranks2..10 copy three columns and printINT(array*50); topname16 copiedC13C->C45A, then topnumeric display404C. |
| $4000 | supported | Address4000 is an operand inside NEXT variable at3FFE; line is a ledger continuation comment, not a new opcode. Operations after4001 continue rank print/loop and top-name copying. |
| $404C | supported | F0 1D29 fetches first packed numeric element. Forced-int V19LOG decimal width, printINT(50*score), configure sprite0 atX308Y55 and show continue prompt. |
| $4110 | supported | Each pass delays100 units thenincrementsV3; limit75 normal or25 demo tested withstrict >. Polls allfive joystickbits, then waitsneutral; demo input/timeout clearsC006 and calls6400. No exactiteration claim in baseline. |
| $419A | supported | Numeric insertion INT(points/50), strictlower comparison; shifts six disk columns +numeric array, no identity tracking. Rerun8 full ranking/attribution scenarios preserve champion/bottom tie behavior. |
| $42A2 | supported | NEXT completes insertion then attribution loopsplayerorder,dividespoints50withoutINT, matchesfirstzero-flag equal score and labelsplayer. Native-name/initials supplied test checks prompts/flags/copiedfields/ranking. Historical VICE input/disk observations not rerun. |
| $4386 | incorrect | Perplayer printed values/colors traced. After rows440E zeroscounter;444C calls48F0 before444F wait, opposite the baseline ordering. Full3EA2->444F probe with6players incrementsstat12 in two calls. |
| $444F | incorrect | Counter initialized0 at440E, increments445C then tests >75 at4461, so76delay/poll passes withoutFIRE; new original-code probe confirms76. Release loop4492 then3EB9 save/display. |
| $44AC | supported | 7045 and4928 animate; onlyrank0calls457E; draws6x3frame,clears3cells,7078->8FA6 and copiesC6BA..BC into three rankcolumns. |
| $457E | supported | Prompt16letters,19x3border atC54B,706F->8FB5 timeout-enabled entry, copy16cellsC574->C13C. Native entry variant matches existing source; parent owns emulator verification. |
| $4623 | supported | Nine literal rank names following Wizard match baseline, with alternating PETSCII text controls and numericrankmarkers. |
| $46EB | supported | FA descriptor294F; body savesargumentV2,PEEK(events+7)/256*V2 thenINT. Initializedevents aliasC02A makes randomsourceC031; callers pass30/40, giving0..count-1 forbyte0..255. |
| $4702 | supported | Original FOR0..9 reconstructsC11E +256*C128 +65536*C132, writesfive-byte array291D. New10-value roundtrip includes0,255,256,65535,65536,0xFFFFFF. |
| $4745 | supported | Forced-intV5 floors high/middle quotients, packcolumns; anyC380..389flag triggerssave; FB0return. FIREloop maxthreeSAVEcalls, no-FIRE0.0002increment expires>2. Rerun12 retry outcomes and4native status cases, no claim of disk persistence. |
| $4878 | supported | PEEKD024,58FF,99F0 accept250. Allfail copiesFOR6400..7FFF fromaddress-6400 then BYEloop48C5. Original test verifiesstable source0200..1BFF anddestinationboundaries; zero-page/stack source changes while interpreter runs. |
| $48F0 | supported_with_clarification | Base>=40 selectsC15D/C15F elseC15C/C15E; addsplayercountmod256 andcarry to highbyte. Exactly two GAMEcallers3EB3/444C. Both normal path, demo skips. Name statistics is descriptive; no visible consumer/threshold established. |
| $4928 | supported | Three shapes241,242,203; X138,164,190; FORextendedvar2915Y0..66 withpitch(66-Y)*2+8. Playernumberprompt follows; frame/sound writes traced. |
| $4A3A | supported_with_clarification | DecrementC006; zero returns4A59. Nonzero setsoneplayer/onelife andzeroes stored player1 score bytes, then7033. New probe shows V12 score scalar preserved at123450; baseline zero-score phrase supported only as account reset, not blanket scalar reset. |
| $4A87 | supported | Original PRG load0801 pluspayload sizeendsat4A89. Bytecode4A87/4A88 bothD3 END. Exact sentinels and exclusive fileend confirmed; loader-run provenance belongs parent. |

## Reproduction and limits

Run `node games/c64/wizard/validation/audit_game_script.js [private-work-directory] [private-ROM-directory]` for all 15 probe groups. The private directory must contain `entry.vsf`, `play-round1.vsf` and `game.prg`; the ROM directory must contain `basic-901226-01.bin` and `kernal-901227-03.bin`. Defaults match `compiled_harness.js`: `games/c64/wizard/work` and `tools/vice-mcp/share/vice/C64`. The two existing validation commands are recorded in JSON. This report preserves the baseline sample and verdicts: running the portable probes prints results without rewriting either report. The native runtime and original compiled bytes execute; I/O is supplied, printing suppressed. No real disk persistence is claimed from these runs.

Prepared original full normal end-session path adds 2*players before final-score wait. GAME has no other literal C15C-F reference; BLDR reviewer found no SCOR UI. Native direct/indexed reference search only found broad out-of-normal-range candidates. No display or threshold consumer established; do not claim global absence.

- No emulator mutation or VICE session performed by this subagent. Parent owns independent live checks.
- The cold review made no game annotation edits, commits, downloads, or external publication. Its reports and probe groups were subsequently copied into validation for local review.
- Bytecode and lift helpers were navigation leads, with original PRG/snapshot equality and actual interpreter execution used for substantive checks; native reviewer confirmed compare/branch/local/type semantics.
- Parent must independently check findings and at least one supported claim before adopting. No maintainer certification claimed.
- Full-name/input, sprite artwork, final screen geometry and live-history provenance were traced or left to parent; simulator printing is suppressed.

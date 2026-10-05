# Wizard — features

Sources read 2 October 2026:

- Original PP&S manual: https://mocagh.org/miscgame/wizard-manual.pdf (pages 2–10). Primary source for controls and advertised features; used to establish the research checklist.
- C64-Wiki: https://www.c64-wiki.com/wiki/Wizard. Secondary comparison; it says four players, whereas the manual says six.
- Lemon64: https://www.lemon64.com/game/wizard. Credits and joystick port 2.
- Contributor's G64 running in VICE. Emulator observations and code evidence are added below.

## Feature verification

| ID | Feature to check | Status | Evidence / question |
|---|---|---|---|
| F01 | Demonstration, play and construction choices | live | `reference/program-menu.png`; each choice appears in the supplied image |
| F02 | Four ten-level difficulty bands | traced | GAME $36AE / $3D85: bases 0,10,20,30; ten-level progression advances bands. |
| F03 | Customized levels and randomized Mystery mode | traced | GAME $36AE/$3831: Customized base40, Mystery bit7; editor accepts files 0–99. Player routes through custom files remain open. |
| F04 | Six players taking turns | differs; live | Five joystick changes select six players; reference/six-players.png. GAME $34EC wraps seven to one. Manual agrees; wiki says four. |
| F05 | Speeds 1–9 chosen while a level draws | differs; traced | Engine $90ED accepts digits0–9, broader than the documented 1–9. Default 5 at $80DA; GAME $2B19 computes the delay. |
| F06 | Walking and ducking | live; traced | Matched 12-frame control holds position; right moves X172→182. Down selects the duck path at $73B7 when descent is blocked; pose behavior traced. |
| F07 | Fire plus direction jumps | live | From the same snapshot, up+fire changes Y165→155; right+fire changes X172→182 and Y165→155. Engine $75EE/$7616/$763E. |
| F08 | Ropes and ladders have different lateral movement | traced; live; tested | Narrow rope glyphs $63/$64 differ from three-piece ladders $65/$66/$67. Original-code replays show catches, centering and one-pixel climbing; prepared emulator cases agree. |
| F09 | Falls can kill; jumps can catch ladders | traced; live; tested | Bounded falling at $7142–$7171; thirteen-pixel clear jump arc and rope/ladder interception at $770B. A prepared one-cell gap kills walking but permits a running jump. |
| F10 | Key opens exit and grants spells | live; traced | Forced key tile changes $C030 from 0 to 1 and restores charge digit 3. Exit checks the key flag at $7AD2. A checkpointed Burning Bridges route takes the key, enters the exit and reaches the next file load. |
| F11 | Treasures award points | live | Forced first-class treasure produces 50 points; original-code comparison covers all 16 class/difficulty combinations. $8464/$84D8. |
| F12 | Completion converts remaining bonus to score | traced; live; tested | GAME $3D96 adds50 per remaining bonus unit; setup gives 24 units, timer period is level-specific. 150 prepared original-code payouts and four live cases pass. Resuming the Burning Bridges exit checkpoint settles 2550+17×50=3400 and loads L18T. |
| F13 | Extra lives from score and ten-level completion | live; traced | Forced 9950+50 gives 10000 and lives6→7. GAME $3BA5 adds ten-level survival lives; $850A detects score-digit crossing. Prepared live milestones at bases0/30 confirm life additions, byte wrap and Expert→Mystery progression. |
| F14 | RUN/STOP pause; Q returns to menu | live; traced | RUN/STOP pause and resume captured in reference/paused.png and resumed.png. Q matrix code branches to $6400 at $96E1. |
| F15 | SPACE or down+fire casts; facing selects direction | traced | Engine $7185 accepts SPACE column pattern$EF and port 2 down+fire$0D; $765B debounces and spends a charge. Facing sets projectile direction. |
| F16 | Fireball, Magic Missile, Disintegrate and Enchantment kill on hit | traced; live; tested | All four use the same removal branch at $8C0F–$8C19, consistent with the manual. Original collision/hit matrix covers every actor type and slot; each spell also removes a forced queued target live. Tests isolate hit processing, not projectile reachability. |
| F17 | Freeze immobilizes enemies | live; tested | Queued spell 4 turns the target cyan. Original-code timelines verify 109/93/77/61 actor-update passes by difficulty and a shared countdown reset by later hits. $8C1C applies Freeze; $862E restores each original color. |
| F18 | Invisibility supplies protection against fatal events | traced; live; tested | GAME $2B6E/$3091/$30B3 gives 32 protected fatal reports, not 32 movement passes. Safe updates preserve it; red hazard death bypasses it. 84 interpreter cases plus live cast, safe controls, all 32 units and subsequent death. |
| F19 | Teleport, Feather Fall and Levitate change movement | traced; live; tested | GAME $30EE–$3127 and engine $7956/$794E/$7952. Teleport exchanges coordinates and nudges X two pixels; down/up travel moves two Y pixels per update until terrain ends it. Prepared original-code and emulator traces agree. |
| F20 | Haste and slow alter movement rates | traced | GAME $3128 halves delay plus1; $3132 slows actor horizontal velocity and lengthens delay below64. |
| F21 | Portals transport the player | traced | Engine $795A dispatches portal/question-mark/directional glyph effects; $79B3 exchanges saved/start coordinates. |
| F22 | Moving lifts, gates, pits and trapdoors | traced | Types7–12 have separate motion/stationary handlers; signed elevator velocity and leg duration read at $892A. |
| F23 | Ground enemies, flying enemies and aimed hazards | traced; tested | Editor DATA establishes type IDs; engine $860E dispatches ground, flying pursuit, random-axis, arrow and falling-rock controllers. Four movement replays compare 960 original-code states including terrain and sprite animation. |
| F24 | Thief collects treasure; cat eats rats on contact | traced; tested | Thief $7F7A invokes treasure callbacks. Cat follows the wizard via the shared ground controller $86BA; collision $7D45 removes a contacted rat. All thirty ordered slot pairs tested with five spell IDs, including Freeze. Cat is exempt from killing the wizard. |
| F25 | Cyan monsters are inactive | traced | Engine $862E recognizes color 3 and shared freeze phase; collision compares per-level exempt color at $7CFA. All40 supplied headers default that color to 3. |
| F26 | Treasure-triggered changes and hidden exits | traced; live; tested | $9477 applies 3×2 patches and then player/thief calls level code at $C376. Twenty levels have active callbacks. Simon Says rule checked in 4,096 original-code cases and four live callbacks; its automatic starting pearl and color patch replayed with neutral input. The atlas compares 700 pickup states; neutral-input traces establish hidden-thief operation in Friend or Foe? and Ladder Land. Burning Bridges has a completed checkpointed input route with Intermediate behavior and active hazards; other full room routes remain open. |
| F27 | Death animation, retries and player turns | traced; live; tested | Death motion $9526 plus GAME $2C7B/$388E; complete animation captured. Live $2DA3 cases confirm a surviving player retries; final-life loss advances to the next survivor. Completion also settles the account through $373D/$3831. Six accounts, dead-player skipping and wrap are tested. |
| F28 | Ten persistent scores, champion name and other initials | traced; live; tested | SCOR128-byte layout, GAME $419A insertion and $4745 save; initials entry $8FA6 and champion-name entry $8FB5, both timeout-enabled; the separate $8FC4 entry edits construction titles. A prepared 1000-point account passes original ranking, typed name/initials and SAVE with status0 on a disposable D64; all128 reloaded bytes match, including a separate disk extraction. The supplied disk is unchanged. Additional live six-player and top/bottom-tie records confirm name attribution can reclaim an existing equal score; all three saved records match disk extraction. Status0 alone is insufficient: the empty-drive test also returns zero. Full and write-protected disposable disks have real failure controls; a full disk with existing SCOR succeeds after scratching that record. Held FIRE exhausts three failed SAVE calls; a missing level exhausts four LOAD calls. |
| F29 | Commodore key clears scores during startup | live; tested | LODR $1117 compares port B with exactly $DF and clears $C100–$C14F. Naturally reached held/released keyboard cases verify eighty cleared bytes and preserved tail; all 256 port values tested. |
| F30 | Level drawing, movement and actions produce sound | traced; tested | SID writes across title, construction and gameplay. Five effect ports match the original routines write-for-write across60 test cases. |
| F31 | Construction edits terrain, player start and colors | live; traced | Construction loads level0 live. BLDR $35EC positions wizard, $43F6 edits colors, $49A6 edits terrain; separate reference/editor-source.txt. Seven prepared live portal placements verify that its upper-left and upper-middle cells can overwrite existing terrain; the other occupied footprint cells reject placement. |
| F32 | Construction chooses six monsters and separate appearance | traced | BLDR $36B8 selects six slots; $3906 behavior 0–20, $3A66 shape0–127, $3AB0 animation0–4. Behavior and appearance are separate fields. |
| F33 | Construction configures spells and saves/loads level files | traced; live | BLDR $3BE0 spell/charges, $33CF load and $4135 save. Live CTRL-S save and reload of L99T on a private blank disk verifies the $45EF elevator reset. A private game-disk copy is rejected when PPSS loads successfully; the supplied original is unchanged. |
| F34 | Level capacity, treasure and fire limits | traced | BLDR validates screen0–99 and maintains separate limits of16 treasures and 16 fires at $5088; map has 21 playable rows of40 cells with borders. |

## Picture references

- `work/external-reference/wiki-title.png`: https://www.c64-wiki.com/images/c/c2/Wizard_Titelbild.png, external title reference, retrieved 2 October 2026.
- `work/external-reference/wiki-level20.png`: https://www.c64-wiki.com/images/1/11/WizardHighscoreMindless.png, external level-20 gameplay screenshot, retrieved 2 October 2026.
- The two external images are private research references and are not published with the site. Published game captures were made from the supplied image.

## Open questions

Open rows describe what was searched and what remains unverified. Traced facts have source evidence; live facts also have an emulator observation. Forced-state tests establish a code response, not a player route.

## Verification scope

Madhouse rotates 839 cells and skips the arrow at $C700; For Your Ice Only erodes its glyph on early indices too. `work/audit_room_rules.js` checks all forty callback entries and both treasure callers. The checks listed in `facts.md` also cover pickup deltas, actor motion, prepared movement and native register/boundary details; isolated fixtures do not establish full room routes.

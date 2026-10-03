# Wizard — verified technical facts

Facts below refer to the canonical `work/entry.vsf` or the named live observation. Open interpretations are kept separate.

## Build and initial image

PP&S disk edition, 1984. Disk GAME loads at `$0801` and starts at `$0819` with `JMP $2245`. The directory and boot recipe are in `orientation.md`.

## Display and alphabets

**Live:** `$DD00=$C4`, `$D018=$13` in Playground select screen `$C400` and character shapes `$C800`. The 2048-byte charset matches CHRW on disk exactly. Rendering all 256 glyphs established this table:

| Screen codes | Meaning |
|---|---|
| `$01–$1A` | lowercase a–z |
| `$20–$3F` | space, punctuation and digits; digits at `$30–$39` |
| `$41–$5A` | uppercase A–Z |
| `$60–$7F` | terrain and object fragments, ladders, ropes, slopes, arrows and platforms |
| `$80–$FF` | alternate forms; 101 of the 128 glyphs are exact bitwise inverses of their lower-half counterparts |

The compiled program's strings use shifted PETSCII: stored `$41–$5A` become lowercase, `$C1–$DA` uppercase. Examples checked against their bytes and visible menu: `$331A` Beginner, `$332A` Intermediate, `$333E` Advanced, `$334E` Expert, `$335C` Customized, `$336E` Mystery. Known text WIZARD appears as `$D7,$C9,$DA,$C1,$D2,$C4`, not a private substitution cipher. Strings are embedded in a bytecode stream, so printable runs may extend into opcodes; the literal boundaries must be checked rather than copied from the raw sweep.

The separate title/menu writer at `$686C` writes screen codes itself. Its source is ($FB), destination ($FD), source cursor `$8D`, destination cursor `$8E`, letter offset `$8B`. Byte zero terminates. `$3F` selects lowercase by subtracting `$40`; `$40` selects uppercase with offset zero. Space, ampersand and period draw unchanged; other small bytes advance the destination cursor. `$68B8` begins the publisher and credit streams. Thus those streams need their formatting commands decoded, not PETSCII transliteration.

Spell names at `$8D73–$8E0E` are twelve 13-byte screen-code fields, padded with spaces. The order is Fireball, Magic Missile, Disintegrate, Enchantment, Freeze, Invisibility, Teleport, Feather Fall, Levitate, Haste, Slow, None. A label in this table proves its presence as text; behavior is checked separately.

## Initial live control check

From `play-round1.vsf`, port-2 right for 12 PAL frames moved sprite 7 X from 172 to 182 and Y from 165 to 167. Other sprites also moved. The before/after pictures are `reference/playground.png` and `reference/playground-moved.png`. This establishes actual gameplay and input delivery; movement speed is not inferred from this single sample.

## Hardware census (initial sweep)

The census is from decoded instructions in GAME and M.L.; indexed accesses name their base register. It is a work list, not proof that a register omitted from the sweep is unused. Indirect stores and banked RAM are checked during annotation.

| Registers | Observed use / entry points |
|---|---|
| `$D000–$D010` | Sprite positions and X high bits. Player accesses name `$D00E/$D00F` (sprite 7); e.g. `$707E`, `$7091`, `$75D7`. Other actors use indexed accesses, e.g. `$7DF5/$7DFB`. |
| `$D011/$D016/$D018` | Display mode, scrolling and screen/font selection; title setup `$6C77–$6C98`, game setup `$8EC2/$8EC7`. |
| `$D015/$D017/$D01B–$D01D` | Sprite enable, scaling, priority and multicolor flags; `$8EB4–$8ED4`, plus individual actor routines. |
| `$D019/$D01A/$D01E/$D01F` | Interrupt control and sprite collision latches; installation `$7C78`, handler `$7CBF`, collision dispatch `$7CE7`. |
| `$D020–$D02E` | Border, background, shared sprite colors and per-actor colors. Actor-color reads at `$7CF5` and `$862E` also participate in logic. |
| `$D400–$D418` | Frequency, waveform, envelope, pulse width and filter/volume writes across all three SID voices. Many short effects occur at `$9766–$98E9`; these are not only frequency writes. |
| `$D41B` | SID oscillator output used by `$8E0F` and other routines. The random update also subtracts CIA timer A's low byte at `$8E18`. |
| `$D800–$DBFF` | Color RAM writes from title drawing and pause display; `$6990–$699F`, `$970F`. |
| `$DC00/$DC01` | Joystick and keyboard matrix reads: `$7185/$718F`, `$96DA` onward. Direction-register setup is at `$8F69/$8F6E`. |
| `$DC06/$DC07/$DC0D/$DC0F` | Game interrupt setup selects CIA1 timer B, with both latch bytes `$FF`, at `$7C78–$7CA4`. Timer A is restored for system activity at `$7C60`. |
| `$DD00` | Video bank selection at `$6C7E`. |
| `$DD0D/$DD0E/$DD0F` | Disable CIA2 interrupts/timers during game interrupt setup, `$7CA5`. |
| `$01` | Bank changes at `$7C51`, `$8CDF/$8D38`, `$90D6/$90E4`: setup, in-place sprite transformation, and copying a sprite from RAM beneath ROM. |

## Program representation

`$0819` jumps to `$2245`. This runtime reads its header pointers, initializes variables, and executes through `$0926`. An opcode with bit 7 set selects one of 128 little-endian handler addresses at `$0826–$0925`; the low opcode groups select scalar loads/stores or typed literals. The initial bytecode cursor is `$296D` and is incremented before fetch. This is an interpreter for compiled program data, so `$296E` onward must be decoded through its handlers rather than treated as 6502 instructions.

GAME and BLDR are separately loaded programs. Their shared machine-code routines are reached through the loader-produced jump table at `$7000`. The decoded GAME script is carried in the listing; the separately decoded BLDR script is in `reference/editor-source.txt`.

## The compiled runtime and game script

The short opcode groups are **loads, literals, stores**: `$00–$1F` load secondary value, `$20–$3F` load primary, `$40–$5F` enter a nine-way literal/control dispatcher, and `$60–$7F` store primary. They are not four variable operations. Literal variants carry an unsigned byte, signed little-endian word, six-byte float, or length-prefixed string. `$80–$FF` dispatch through the 128-word table. Numeric comparisons return **-1 for true**, zero for false. That matters whenever the script multiplies a comparison into a score, coordinate or selection.

A complete sequential parse of GAME `$296E–$4A88`, including inline function bodies, produces 4,068 instructions and 90 string literals. Each instruction has a decoded side comment in the source listing. Operand widths were derived from the runtime, including big-endian variable pointers on named NEXT, little-endian GOTO/GOSUB pointers, and variable-length ON tables. The runtime includes scalar and array access, FOR/NEXT, function locals, strings and garbage collection; floating transcendental functions call the machine's BASIC ROM. Their identities were checked against the [original Microsoft/Commodore source commentary in the ROM reference](https://www.pagetable.com/c64ref/c64disasm/), rather than guessed from address values.

BLDR's machine runtime `$0826–$27F1` is byte-for-byte identical to GAME's. Its separate script `$3320–$530C` also parses end to end (3,830 instructions). Its strings, DATA records and behavior must be checked as a separate loaded program; the GAME snapshot does not contain that overlay.

## Players, rounds and score

Traced in bytecode:

- `$34EC–$355C` selects **one through six players**, incrementing on a new joystick direction and wrapping seven to one. This agrees with the supplied manual; the wiki's four-player figure does not match this build.
- `$36D2–$36E8` initializes six life slots `$02C0–$02C5` to **six lives**, and eighteen score bytes `$02C6–$02D7` to zero. Score columns are low, middle and high bytes for six accounts. `$315B` restores them; `$373D` writes them back.
- `$36AE` maps the difficulty menu to level bases 0,10,20,30,40. Mystery sets bit 7 and a time-dependent initial level. `$3831` advances players/rounds, choosing another random level in Mystery. Ten completed levels call `$3BA5`: surviving accounts receive `INT(base/10+2)` lives, wrapping through eight bits; `$3D85` advances the difficulty and changes base 40 to Mystery 128.
- The key is glyph `$1B`; `$7ACE` removes it, sets `$C030` and restores the level's charge count to the HUD. Exit glyph `$40` is accepted only when that key flag is nonzero.
- Treasure classes `$1C–$1F` plus difficulty select 50,100,200,300,400,500 or 750 points through `$84D8/$84DF`. The machine routine updates seven leading digits of an eight-digit HUD field, whose last digit remains zero. A change in the ten-thousands digit at `$C7BA` grants another life (`$850A`).
- The bonus starts at 24 (`$8EE4`). CIA timer updates decrement it according to level period `$C350` (`$9270`). Completion bytecode `$3D96` awards **50 points per remaining unit**, up to 1,200. It also grants a life at each exact 10,000 threshold crossed while adding that bonus.
- Disk SCOR stores ten three-byte values in split columns `$C11E/$C128/$C132`, scaled in units of 50. Three initials columns begin at `$C100/$C10A/$C114`, and the top player's sixteen-character name at `$C13C`. The whole saved record is 128 bytes (`$8B1E`). Ranking inserts only a strictly higher value (`$419A`).

## Timing and movement

`$7C78` installs the game interrupt and enables **sprite-sprite collision interrupts**, not raster interrupts: `$D01A=4`. CIA1 timer B uses latch `$FFFF` and runs the background updates. The normal handler updates colored cells, random state, bonus, disappearance, popup fade, flashing terrain and pause controls. Player/actor movement is called by the bytecode main loop, so its pacing is a separate mechanism.

Digit keys 0–9 during load change `$C005` (`$90ED`); `$80DA` sets the normal default to 5. The script computes `4*(9-speed)^1.15 + 2 - 2*(speed==9)` with true=-1, making the fastest setting 9 a delay value 4. The delay helper converts the script value to a byte and busy-waits. This is not a claim of a fixed real-time movement rate.

Sprite 7 is the wizard, sprite 6 is a projectile/reward/effect, slots 0–5 are level actors. Horizontal player movement is two pixels per call (`$792E`), with ninth-bit X handled separately. Stair routines adjust height from slope glyphs, while ladders/ropes use alignment tests. Jumps select one of two nineteen-byte packed motion sequences (`$76A0/$76B3`), traversed backwards. Collision and terrain checks can shorten a jump.

Elevators are actor type 7. Signed velocity nibbles come from header `$C316+slot`; the leg duration is `$C35F` (`$892A`). Player/elevator sprite collision checks vertical contact and records the supporting slot (`$7D06`); `$855A` then follows its height/velocity.


The packed jump starts with remaining=19 and consumes indices 18 through 1. Its unobstructed vertical arc rises thirteen pixels. Bit 0 requests horizontal movement, bits 5 and 6 each request one vertical pixel, and bit 7 selects upward. In the prepared flat-floor example at (120,133), a running jump lands at (150,133); terrain may extend or shorten its horizontal travel. This is not a universal maximum gap-width claim. Walking right into the prepared one-cell gap reports death on update 7; jumping from the same start survives.

Narrow rope glyphs are `$63` (rope) and `$64` (anchor); the three ladder pieces are `$65/$66/$67`. Matching lower-side probes containing rope, anchor or ladder center stop the jump at `$770B`. The climbing path advances one vertical pixel per update. With empty feet and no jump, matching non-climbable side probes set a four-iteration allowance at `$7158`: each iteration moves Y one pixel until `(Y-37)&7` is zero, then feet are tested again. Exhausting the allowance reports death. Mismatched side probes retain an earlier X value rather than setting four; the rule is bounded terrain alignment, not an accumulating fall-speed model.

Elevator collision height uses ADC #14 followed by SBC without SEC at `$7D09`. With ordinary Y below 242 this accepts `(playerY+13-elevatorY) & 255` in 0..2, then records contact lifetime 2 and the slot. All six slots and eight nearby offsets were checked (48 cases). The ride path at `$855A` sets playerY=elevatorY-13 for jump remaining below 14; earlier jump steps add the elevator's Y velocity. It does not add horizontal elevator velocity. The illustrated ride supplies contact rather than simulating sprite collision geometry.

## Monster identities and collision handling

BLDR's own DATA strings beginning at `$296A` establish type names, in order:

| Type | Name | Traced controller |
|---:|---|---|
|0|None|returns at `$8615`|
|1|Arrow|horizontal spawn/cooldown, `$87C3`|
|2|Bat|flying pursuit, `$8845`, with sound|
|3|Ghost|flying pursuit, `$8845`|
|4|Evil Wizard|randomly chosen pursuit axes, `$8876`|
|5|Witch|flying pursuit, `$8845`|
|6|Falling Rock|spawn above/near player and fall, `$88A7`|
|7|Elevator|signed velocity nibbles, `$892A`|
|8|Lava|stationary, expanded sprite|
|9|Pit|stationary, expanded sprite|
|10|Trap Door|stationary, expanded sprite|
|11|Gate|vertical bob/reversal, `$89A9`|
|12|Lava Troll|vertical bob, divided update rate, `$89C7`|
|13|Rolling Rock|long run with shared terrain physics|
|14|Rat|ground/ladder controller|
|15|Scorpion|ground/ladder controller|
|16|Slime|ground/ladder controller|
|17|Spider|ground/ladder controller|
|18|Shadow Lord|ground/ladder controller|
|19|Thief|ground controller plus treasure removal, `$7F7A`|
|20|Cat|ground controller and special rat interaction|

The cat uses the ground controller at `$86BA`, whose pursuit calculations read the wizard's coordinates (`$8766`, `$89D9`, `$8A02`), not a rat's position. The collision handler exempts type 20 from killing the wizard and queues removal when a cat collides with a rat (`$7D45`). The queued rat index has bit 7 set; `$8C00` consumes it before the spell-ID test, so the rat is removed even when the room supplies Freeze. A matching exempt sprite color also prevents collision death. All 40 supplied level headers set that color to 3; Freeze changes a victim to color 3 (`$8C1C`) and the controller restores its original color after the shared phase expires (`$862E`). These identities come from the editor's data, not guesses from sprite silhouettes.

## Spells

The level stores spell ID at `$C31C` and initial charges at `$C31D`. The cast path debounces its request and spends one HUD charge (`$765B`). IDs 0–4 use sprite 6 as a projectile; direction selects X steps 5,-5,0,0 and Y steps 0,0,-3,3. A queued hit either removes an actor or, for Freeze ID 4, temporarily sets its color 3. Higher IDs signal the compiled script through `$C02C`:

|ID|Name|Checked effect|
|---:|---|---|
|5|Invisibility|32 protected fatal reports; safe updates preserve the count; background-matching wizard color and staged display restoration (`$3091/$30B3`)|
|6|Teleport|exchanges position with remembered departure, initially the level start; adds a random-direction two-pixel horizontal nudge (`$30EE` → `$7075`)|
|7|Feather Fall|moves down two pixels per update while bypassing ordinary falling until terrain ends the effect (`$3106` → `$7063`)|
|8|Levitate|moves up two pixels per update until terrain ends the effect (`$3117` → `$7069`)|
|9|Haste|replaces main-loop delay with delay/2+1 (`$3128`)|
|10|Slow|sets actor horizontal pursuit speeds to+1/-1 and increases delay below 64 (`$3132`)|
|11|None|name/table entry exists; no charge-use behavior inferred from the name alone|

Fireball, Magic Missile, Disintegrate and Enchantment (IDs 0–3) take the **same actor-removal path** at `$8C16`. The supplied manual describes the same lethal hit effect for all four. With no wizard bit in the collision latch, an active sprite-6 projectile queues the highest other set actor bit without testing target type or color (`$7D3A`). The later handler discards positive queued hits during `$C066` transient state; otherwise only ID 4 selects Freeze. This establishes queued-hit behavior, not that a projectile can physically reach every configured actor. Shape, animation and color remain separate level fields.

Freeze duration is **109 − 16 × difficulty** actor-update passes for difficulty 0–3: 109, 93, 77, 61. `$8C1C` writes that value into the shared `$C0A2`; `$7D70` decrements it before updating the six actors. Cyan actors wait until it reaches zero, then `$862E` restores their saved level colors. A second Freeze hit resets that same counter and extends earlier victims' freeze. Original-code paired timelines verify both victims pause, share the reset and recover their separate colors together. These counts are not fixed seconds; the bytecode loop's delay also depends on speed, Haste and Slow.


Invisibility's V21 is an event budget, not a movement timer. Main-loop `$2B45` clears a fatal report if a travel effect is active. Otherwise `$2B6E` is entered only for nonzero `$C02A`. Color 2 reaches death directly; other colors with nonzero V21 clear the report and run `$30B3`, decrementing V21 once. Safe passes never enter that decrement. A continuing dangerous contact can spend protection on successive updates. Multicolor returns at 16; counts 8 and 7 use color 7, 6–4 use 8, 3–1 use 9, and zero restores 4. An 84-case interpreter matrix covers count boundaries, safe/fatal state, red bypass and active travel; a 99-safe-pass control preserves the count. Live execution checks casting, two safe passes, all 32 protected reports and the following death routine.

Teleport `$79B3` uses level start `$C31E/$C31F/$C352` when saved Y `$C09C` is zero, otherwise the saved `$C09B/$C09C/$C09D` coordinates. It stores the departure before nudging arrival two pixels left or right from random state. Two casts with the prepared (120,133) departure and (200,133) start, using a rightward nudge, arrive at (202,133) then (122,133); the second departure saved is (202,133). Feather Fall and Levitate select effects 6 and 4. The travel dispatcher clears death state and skips ordinary gravity; each changes Y by two and ends on eligible platform/slope contact. The illustrated examples hold neutral after casting and isolate fixed terrain.

## Level format and resident demos

Each supplied L00T–L39T file loads 1,136 bytes at `$C300`: 128-byte header, 128-byte treasure-patch table, and 880 screen cells (22×40) at `$C400`. The first 21 rows form the playable terrain; the final row initially carries the level title and becomes a solid bottom border at `$96BB`. The remaining screen rows hold the HUD.

Header fields traced from their consumers:

|Offset from `$C300`|Meaning|
|---|---|
|`$00–$05`, `$06–$0B`|six actor start X and Y bytes|
|`$0C–$0F`|terrain, rope, ladder and object colors|
|`$10–$15`|six actor colors|
|`$16–$1B`|six packed elevator X/Y velocity settings|
|`$1C/$1D`|spell ID / charges|
|`$1E/$1F`|wizard start low X / Y|
|`$20–$2F`, `$30–$3F`, `$40–$4F`|treasure-patch repeat counts, strides and optional colors|
|`$50/$51/$52`|bonus-timer period, spell color, starting X-high mask|
|`$53–$55`, `$56–$58`|three split low/high flashing-terrain pointers|
|`$59–$5B`, `$5C–$5E`|three stride/mode values and packed durations|
|`$5F`|elevator leg duration|
|`$60–$67`, `$68–$6F`|sprite bases and animation settings; `$6F` also supplies initial collision-exempt color|
|`$70–$75`|six actor type IDs|
|`$76–$7F`|level-specific machine-code callback area, invoked after treasure changes, with code allowed to extend into unused patch/header space|

$9477 treats each treasure-patch record as six replacement bytes laid out 3×2 and a destination pointer. Destinations can address screen RAM, color RAM, level state or hardware registers; they are not restricted to the screen. `$9477` repeats that patch according to its parallel count/stride fields. These are changes to the live terrain, not just color effects.

Attract mode uses the real engine. Input pages `$58/$99/$9A` each hold 128 joystick bytes and 128 durations. `$801D` is changed from RTS to NOP to enable playback through CIA port registers. Three resident level images start at `$5900` (Welcome to...WIZARD!), `$5E00` (Crispy Critters), `$9B00` (Hot Stuff); `$8E79` copies exactly `$470` bytes into the normal level workspace. Alignment bytes after the first two images remain loaded but lie outside those copy ranges; their historical provenance is open.


## Construction overlay

`reference/editor-source.txt` describes the separately loaded BLDR image in 43 program regions, with all 3,830 decoded instructions and 232 packed DATA records. Every control-flow destination lands on an instruction boundary. The shared interpreter is described once in the canonical GAME listing.

BLDR selects screen numbers 0–99 (`$33CF`), actor slots 0–5 (`$36B8`), behavior IDs 0–20 (`$3906`), sprite images 0–127 (`$3A66`) and animation spans 0–4 (`$3AB0`, with 1 converted to static 0). It stores charges as a display digit, not a binary count: `$3C4D` writes 48+n to `$C31D`. The terrain palette has 24 objects and compound shapes have explicit footprint checks (`$4CEF`). Independent treasure/fire counters refuse a new item when equal to sixteen (`$5088`). These are equality tests; a corrupt count greater than sixteen is not rejected by that limit alone.

The editor’s save preparation at BLDR `$45EF` overwrites all six packed velocity fields with `$1F`, the shared duration with `$90` (144), and the Y position of each type-7 actor with 197. The save path calls this after title entry (`$41F2`). A live CTRL-S save with distinct injected parameter values produced those reset values in the saved L99T file; the original loader recovered the same values after the working header was cleared. The separate parameter command stores its inputs at `$3BA7/$3BDC`, but the later save preparation overwrites them. The test verifies the save interaction, not every possible route through the parameter UI.

**Live:** selected Construction in the program menu, pressed FIRE on its title, entered screen 0, and reached its terrain/monster/spell menu (`reference/editor-level0.png`). A subsequent save/reload test used private disk copies. The shared saver deliberately rejects a disk when loading its PPSS marker succeeds with status $40: `$8B98` leaves Z set, so `$8ABB` returns status 1 (“WRONG DISK”). The private copy of the supplied game disk was rejected; a fresh formatted test disk without PPSS saved successfully with status 0. The supplied original’s SHA-256 remained unchanged.

## Level-specific programs and coverage scope

The 100% ledger measures **45,560 resident bytes**: GAME, the shared M.L. payload, charset and relocated sprites. RAM workspace, ROM, and alternate disk overlays are distinguished explicitly. The separate BLDR report and forty extracted level records extend the analysis beyond that resident snapshot; addresses in those reports are overlay addresses and must not be confused with GAME's bytecode at the same address.

The level callback starts at `$C376`, but some levels place further instructions in otherwise unused header or treasure-patch space. Both player collection (`$8497`) and thief collection (`$7FA1`) invoke it after applying the treasure's patch. The callback receives the treasure index in X. Twenty supplied files have an active callback rather than an initial RTS. Level 35 also contains dormant instruction-shaped bytes whose activation was not established; no active behavior is inferred from that fragment.

Examples traced directly in the level overlays (zero-based disk file numbers; the atlas displays levels 1–40):

- Level 2, Look Before You Leap: clears two three-cell screen runs.
- Level 3, Diamond Mine: clears the key's eight glyph rows and may replace a cell with a chalice or diamond according to treasure index.
- Level 7, Simon Says: visible instruction words require a matching treasure; black words require a mismatch. The automatic starting pearl initializes the rule before movement. The detailed callback and startup evidence are below.
- Level 17, Burning Bridges: swaps `$C5BB/$C5DC`, initially the key and upper exit. The automatic starting gold (index10) swaps them before joystick movement; later treasure pickups swap them again.
- Level 28, Friend or Foe?: treasure index 2 advances the key one cell along a forty-cell row, wrapping at the end.
- Level 30, Ladder Land: changes pitch and the **saved** collision-color field `$C36F`; the active collision comparison reads `$C0A3`, initialized from that field at `$8EFA`. With `$C066=0`, odd pickup counts of slot 1 erase three three-cell runs, move the pointers down one row and consume one of twenty passes. The patch regenerates the pearl. A nonzero `$C066` takes a separate actor-state branch.
- Level 33, Madhouse: cycles directional-arrow glyphs across the playable screen, scanning backwards.
- Level 38, Fire Alarm!: alters two glyphs once and replaces part of its callback with RTS to prevent repeating the operation.

The Immortal Portal callback’s ADC receives carry clear in normal player and thief collection: each calls `$8D4B` immediately before `$C376`, and the spell-name address arithmetic clears carry for IDs 0–11. Thus slot `(treasure index & 3)` receives type `2 + (index & 3)`. All twelve spell IDs, sixteen indices and both carry inputs before `$8D4B` were checked (384 cases).

L35T’s first callback byte remains RTS in all sixteen indexed pickup tests, 1,536 timer-counter/phase cases and 4,096 consecutive terrain updates. The following instruction-shaped fragment overlaps patch storage at `$C380`; treating it as a continuous routine reaches JSR $0000. These tests establish inactivity on those paths, not a historical explanation for the retained bytes.

Burning Bridges has a completed checkpointed input route, documented below. Other full room-completion routes remain open. The Simon Says rule and its initial pickup have additional original-code and live evidence below.

### Simon Says: instruction, tables and startup

In disk L07T (displayed level 08), `$C376` masks color RAM `$D832` to its low nibble. Any nonzero color writes BEQ (`$F0`) at `$C38C`; black writes BNE (`$D0`). The chosen treasure's symbol comes from `$C400+X`, where X is its indexed position, and is compared with `$C35F`. The branch skips the death flag at `$C38E`: **visible words require equality, hidden words require inequality**. The words occupy thirteen color cells `$D832–$D83E`.

The callback always writes the next requested symbol from `$C410+X` into both `$C445` and `$C35F`, even after a failed comparison. It then maps `$C031 & 3` to colors 0, 1, 13, 3. The next treasure kind depends on which position was collected; the words' next visibility depends on random state. The article's example isolates the acceptance rule after a pickup, with original character graphics; it does not simulate a full route or the next random choice.

The saved level starts with remembered pearl `$1E` but a displayed chalice `$1F` and hidden words. **This is an initialization state.** At wizard start (168,197), the first lower-side pickup probe collects the pearl at screen `$C733`, indexed slot 14, before polling the joystick. Its patch has count 7, stride 3, destination `$D832`, and three cyan bytes. The shared patch writer at `$9477` therefore colors the instruction before the callback checks it. The pearl matches the remembered pearl and is safe. The callback then sets both displayed and remembered request to chalice. Neutral input replayed this entire initial pickup live; left, right and up reach the same callback before movement. Level selection was forced at the loader, but the setup, pickup, patch and callback ran unmodified.

### Atlas counts

The atlas counts **indexed treasure and fire cells**, using the original `$7BAA` scan, rather than counting every matching glyph byte in the map. That scan runs backwards and retains at most sixteen of each. Simon Says embeds two sixteen-byte lookup tables in its black first row; these do not enter its full sixteen-slot treasure index. Its indexed cells comprise fifteen room treasures plus the instruction's displayed symbol in slot zero; the automatic starting pearl is one of those fifteen. L35T likewise indexes sixteen of eighteen treasure-shaped cells. A count of indexed cells is not a claim that every one is reachable or collectible.


## Verification evidence

- **Deterministic input pairs:** the same Playground snapshot run for twelve frames stays at (172,165) with no input; right ends at (182,167), up+fire at (172,155), and right+fire at (182,155). Both jumps retain fourteen motion steps. These are frame-specific observations, not universal movement rates.
- **Forced key pickup:** placing glyph $1B at the wizard's sampled tile $C693 and setting header charge digit to 3 gives key flag 1 and HUD digit 3 after twelve frames. The unmodified control retains flag 0 and digit 0.
- **Forced treasure/life test:** glyph $1C at the same sampled tile gives 50 points. Starting the HUD at 9950 produces 10000 and increases lives from 6 to 7.
- **Forced Freeze hit:** set spell 4 and queue actor 0 as the hit target before the main loop. Its color changes from 1 to 3 and its shared phase is 105 after twelve frames. This checks hit processing, not projectile reachability.
- **Menu selection:** five separate joystick edges select six players; the scalar record holds integer 6 and the screen shows 6 (`reference/six-players.png`).
- **Pause:** direct keyboard-matrix RUN/STOP press/release produces the blackout/prompt and a second press/release restores play (`reference/paused.png`, `reference/resumed.png`).
- **Screen reconstruction:** one captured Playground PAL frame has 0 video-register writes and 0 changed color cells. The shared renderer reproduces all 104,448 visible pixels with 0 differences from the emulator. Only the 1,708 RAM bytes actually read for drawing are embedded in the page; no machine ROM is needed.
- **Initial original-code comparisons:** 158 cases run the original 6502 routines in the kit simulator. They cover 80 treasure/score/life cases (all sixteen class/difficulty combinations with five score boundary values), eighteen horizontal-movement boundary cases, and sixty comparisons of ordered SID writes for five effect ports, including both carry inputs and varied random state. All pass. Test programs/snapshots stay private under work/.


- **Projectile/cat matrix:** 7,200 original-code runs cover spell IDs 0–4, all twenty nonzero actor types, six slots, colors 0/1/3 and four difficulties. Each run obtains the queue from the original collision IRQ using a forced latch, then runs the original hit processor; projectile travel afterward is suppressed. IDs 0–3 remove every queued type; ID 4 preserves it, turns it cyan and sets the difficulty-dependent phase. Another 150 runs cover both cat/rat slot orders across all slot pairs and those five spells. Four full paired-Freeze timelines check reset and restoration. No collision-geometry or player-route claim comes from forced latches.
- **Live hit controls:** from the same Playground snapshot, queued spell IDs 0,1,2,3 each remove actor zero within twelve frames; ID 4 leaves its type and changes its color to cyan. The no-hit control retains the original actors.
- **Simon Says comparisons:** 4,096 original-code callback cases cover sixteen indexed positions, four remembered treasure symbols, all sixteen color nibbles and four random low-bit values. They check the page's actual acceptance function, death flag, self-modified branch, next displayed/remembered symbol and all thirteen changed colors. Four isolated live callback cases check match/mismatch with visible/hidden words. The separate startup replay above tests the automatic pearl through the real pickup path and its terrain/color patch.

The emulator qualification recorded 54 passing checks and 3 wall-clock-sensitive failures on this host (watchpoint throughput and warp-rate thresholds). Exact frame counts, stopping, input, and snapshot/restart determinism passed. Claims above use exact frames, register values, or original-code comparisons rather than those failed wall-clock measurements.


## Actor appearance browser

The construction DATA contains twenty default animation spans at `$2A07–$2A42`, twenty sprite-image numbers at `$2A43–$2A97`, and twenty colors at `$2A98–$2ADE`. The READ loops at BLDR `$4825`, `$4834` and `$4843` fill arrays indexed by behavior 1–20. Behavior zero is unused. The default command at `$39D9` adds 128 to the image number for the bank-$C000 sprite pointer, then stores the animation span, pointer and color in the level header.

The article's actor browser shows those defaults and distinct saved combinations from the forty level headers. Only examples whose pointers reference the resident sprite bank are included; runtime-generated images outside it are omitted. Frame bytes come from the canonical listing's relocated sprite RAM, with 58 frames (3,654 drawing bytes) embedded. Each is a 24×21 multicolor sprite: pixel pairs 01 and 11 use shared colors 14 and 1, and pair 10 uses the actor color. The Playground frame's `$D025/$D026` reads confirm those shared colors after masking their high bits. Frames are displayed unmirrored at a common scale; the widget inspects artwork rather than simulating actor motion, expansion or room effects.

## Startup score clearing

The LODR loader reads SCOR, then at `$1117` compares CIA1 port B `$DC01` with exactly `$DF`. With row 7 selected (`$DC00=$7F` in the naturally reached live check), this is Commodore held. `$111E–$1126` clears exactly `$C100–$C14F`, eighty bytes of the score record, and leaves `$C150–$C17F` untouched. It then enters the title at `$6400`; this branch does not write the disk. Both released/held keyboard states were verified live, with distinctive record bytes to establish the boundary; all 256 port values were tested against the original routine. See `reference/loader-source.txt`.

## Treasure and movement explorers

The atlas embeds 700 computed states for 606 selectable pickups across forty rooms. Each is produced by original `$7ACE` collection, `$9477` patching and the loaded `$C376` callback, with fixed random bytes $12, movement/timers paused and no key collected. Repeats are offered only while the same cell regenerates a treasure; traces stop on death, a repeated state or forty pickups. Simon Says starts after its verified automatic pearl and excludes the instruction display from selectable treasures. Every screen byte, color nibble, glyph byte, actor type and actor color matches the original-code replay. Five isolated live checks cover Burning Bridges, Friend or Foe? (four pickups), Ladder Land (nine), Diamond Mine and Hot Stuff. These are immediate outcomes, not walking solutions.

Four motion replays record 240 original `$860E` controller calls each: Bat in Bats In The Belfry, Rat in Diamond Mine, Cat in Wizard’s Pet and Elevator in See Ya Later, Elevator. Terrain resolution `$7D82` and sprite animation `$78AD` execute normally for the selected actor. Other actors, collision IRQs and room timers are paused; randomness, animation phase and horizontal pursuit speed are controlled. The wizard target moves to X=60 at update80 and X=280 at update160. All 960 published positions, velocities, duration values and sprite images match regeneration. Update counts are not video frames or a claim about real-time speed.

Neutral-input room observations establish that L28T’s thief collects regenerated gold and advances the key, and L30T’s thief collects regenerated pearls and advances terrain removal. At the first callback, the hardware stack returns to `$7FA4` (thief collection), with treasure indices 2 and 1 respectively. Saved shapes $D5/$D6 and $D4 contain only transparent/own-color pixel pairs; own color zero conceals these thieves on the black background. These observations used the game’s normal load/setup with the selected file number controlled. No collectible or collision state was injected.

In L17T, the first neutral-input callback comes from player collection (`$849A` return) with index10, the gold at the wizard’s start. It changes `$C5BB/$C5DC` from key/exit to exit/key. Holding left next collects pearl index9 at wizard X=142, Y=133, erases `$C612–$C614` through its patch and swaps the upper key/exit back. The wizard survives this short sequence. This short variant demonstrates the first pickup on the left; the complete checkpointed route below visits the right pearl first.

`reference/programs.html` indexes 42 separate program views and 4,449 decoded lines: the construction companion, the loader score-clear excerpt and all forty level callback excerpts. Program-qualified anchors distinguish identical addresses in different loaded images; the shared engine remains in the canonical resident Source tab.


## Movement, protection and a completed room route

The player explorer records 25 prepared scenes and 494 states from the original controller. Eleven representative traces were compared with the emulator at every update: 205 position/jump/death/contact/effect states agree, covering standing and running jumps, a failed wide gap, a fatal walk, rope and ladder catches, a plain fall, Feather Fall, Levitate, Teleport and a supplied-contact elevator ride. Prepared scenes omit other actors and timers. The 48 elevator-height tests supply collision latches; neither they nor the ride illustration claim to reproduce collision geometry.

Burning Bridges (disk L17T, level 18) has a completed **checkpointed input route**. Preparation selects that room through the original loader, sets Intermediate behavior `$C007=1`, and gives the compiled script difficulty base 10 and round 7. Speed is 5. Arrows, the elevator, collision IRQs and room timers remain active; no pickup, key or exit state is injected. The five treasures are the automatic starting gold, the nearby right pearl, nearby left pearl, far-left pearl and far-right pearl. The outer pearls create ropes. The first four treasure swaps leave the key on the left; after the key is collected, the fifth swaps the enabled exit into its vacant cell. Thus the cell swap continues after key collection.

The route climbs the short left rope, reaches the far-left pearl by a standing jump, descends the new rope and climbs the outer ladder to the key. It returns up the new rope, crosses to the far-right pearl, and returns to the outer-left ladder and exit. The successful tail starts from the saved key checkpoint and reaches `$8C8F` at wizard (40,130), with key flag 1, difficulty 1 and upper cells `[64,32]`. Continuing that saved exit state through the normal script reaches loader `$8A66` requesting file 18. `reference/bridges-after-completion.png` records that transition. The ten article illustrations use room states captured across live attempts. Saved checkpoints were resumed; this is not a claim of an uninterrupted full-game run. Arrow timing caused deaths in other attempts, so the prose gives landmarks and warns readers to time the crossings rather than presenting fixed update counts as a universal input script.

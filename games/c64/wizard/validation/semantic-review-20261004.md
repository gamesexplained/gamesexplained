# Wizard resident semantic sample

Status: complete. Seed 20261004; 60 comments sampled from 358 eligible resident records at $5800–$9FFF.

The original sample and original comment texts are preserved. This cold reviewer wrote none of the sampled baseline annotations. This is the kit-required sample, not an independent maintainer certification.

Reviewed 60/60. Baseline: 56 supported, 4 incorrect, 0 unresolved; 0 pending.

Baseline resolved-record error fraction: 4/60 (6.67%). Approximate pooled Wilson 95% interval: 2.62%–15.93%.

Approximate descriptive interval for the baseline eligible resident-comment frame only. Rounding gives slightly unequal inclusion probabilities. Not a whole-source confidence statement; not an estimate for compiled GAME, overlays, all prose, unsampled claims, or the residual error rate after targeted corrections.

Current comments: 60 supported, 0 incorrect, 0 unresolved. Targeted rechecks are not a new independent random sample.

Selection: require a string comment with at least six whitespace-separated words; retain original listing order within six ascending $0C00 address bands. Allocate 60 proportionally using largest remainders, then use one Python random.Random(20261004) and random.sample for each band, sorting chosen rows by address. No redraw after findings.

| Band | Eligible | Selected |
|---|---:|---:|
| $5800–$63FF | 7 | 1 |
| $6400–$6FFF | 53 | 9 |
| $7000–$7BFF | 128 | 22 |
| $7C00–$87FF | 74 | 12 |
| $8800–$93FF | 72 | 12 |
| $9400–$9FFF | 24 | 4 |

Source: private entry.vsf RAM, independently decoded with the kit’s 256-opcode decoder; indexed data consumers and decoded callers were inspected. The resident listing matched all 18,288 compared snapshot bytes in 6,139 records. Archived live-test records corroborate historical assertions; this review did not rerun those live tests or mutate the emulator.

Provenance and reproducibility details, including file hashes and any additional offline CPU checks, are in the corresponding JSON.

## 01 $5900 — supported

Label: `demo_three_header`. Type: `byte`.

Exact baseline comment:

> Resident demonstration level "Welcome to...WIZARD!": 128-byte engine header and 128-byte treasure-patch area. The first header fields provide six actor positions, colors and behavior; later fields provide spell/start/timing settings. $8E79 copies the full $470-byte level to $C300.

Evidence:

- $80D7-$80D9 stores level pages $9B,$5E,$59; $80B4-$80CC indexes by demo number minus one, places the selected page in $FB, and calls $8E79.
- $8E79-$8E9E starts at source page+4 / destination $C7, Y=$6F, then copies four complete preceding pages: exactly $470 bytes to $C300-$C76F. Source $5D50 has the mixed-case screen-code title Welcome to...WIZARD!.
- Actor setup reads X/Y from $C300/$C306 plus slot, colors from $C310 plus slot, behavior from $C370 plus slot; start/spell/charges come from $C31C-$C31F. The patch reader at $949F shifts slot three times and reads eight-byte records beginning at $C380, giving sixteen records / 128 bytes.

Scope notes:

- Header layout and title were checked from private RAM and consumers. This does not independently establish every unused header field.

## 02 $65BF — supported

Label: `finish_title_and_dissolve`. Type: `code`.

Exact baseline comment:

> Print author credits, prepare four screen-page pointers, then replace glyph $80 at SID-selected offsets with spaces. After the countdown, enter the program menu.

Evidence:

- $65BF-$65CF supplies the credits stream at $68EA to $686C, with screen destination $C66A; the stream contains the two credited names.
- $65D7-$65EF creates zero-page pointers $92/$94/$96/$98 to $C400,$C500,$C600,$C700. $6610-$6642 uses SID oscillator register $D41B for Y and replaces only glyph $80 with $20.
- $660A sets countdown $8B=$DC; $6647 decrements it and $664B jumps to menu entry $692F when zero.

## 03 $6750 — supported

Label: `title_flicker`. Type: `code`.

Exact baseline comment:

> Use phase A to perturb one title sprite Y low bit and select shared multicolor 0. SID oscillator noise chooses shared multicolor 1.

Evidence:

- $6750 saves A to $FD; bits 1 and 0 select sprite Y register $D001/$D003 and OR its low bit. The low three phase bits index $6742 for $D025; a separate $D41B & 7 indexes the same table for $D026.

Scope notes:

- The low Y bit is ORed, not toggled or cleared. The wording "perturb" is broad enough; an exact rewrite could say "conditionally set".

## 04 $67A3 — supported

Label: `title_horizontal_pair_second`. Type: `code`.

Exact baseline comment:

> Second horizontal step for sprite 1; the following code shifts the vertical direction bit from the motion byte and patches the Y instructions.

Evidence:

- $677B-$678D chooses opcode $EE or $CE from $67CB according to motion-byte bit 0 and patches $679A,$679D,$67A0,$67A3. Thus $67A3 is the second INC/DEC of sprite 1 X. $67A9-$67B6 then extracts bit 1 and patches the Y instructions at $67C1/$67C4.

## 05 $67C4 — supported

Label: `title_vertical_sprite_one`. Type: `code`.

Exact baseline comment:

> Matching patched INC/DEC on sprite 1 Y; decrement the motion step counter and return when exhausted.

Evidence:

- $67B0-$67B6 patches $67C4 with INC/DEC matching $67C1. It targets $D003, sprite 1 Y. Y is initialized to three at $67BC; $67C7-$67CA decrements that local loop counter and returns when exhausted.

Scope notes:

- "Motion step counter" here means the local three-iteration Y counter, not the separate motion-byte index $8B.

## 06 $6864 — supported

Label: `title_horizontal_shake`. Type: `byte`.

Exact baseline comment:

> Eight D016 values paired with title_vertical_shake; the title animation writes these on raster line zero.

Evidence:

- $6864-$686B contains eight horizontal-control values $C8,$C8,$CA,$CC,$CE,$CE,$CC,$CA. $6839-$6854 wraps phase $8C through 0..7, waits for $D012=0, then writes paired $685C,X to $D011 and $6864,X to $D016.

## 07 $6B00 — supported

Label: `accept_program_choice`. Type: `code`.

Exact baseline comment:

> Highlight the selected menu line, play a rising sound, then select GAME or BLDR. Demo choice also resets demo state. Reuse an already loaded compatible program or load the four-byte filename with KERNAL LOAD.

Evidence:

- $6B1A-$6B2E indexes the selected screen-row offset, sets its colors, and ORs bit 7 into thirteen screen characters. $6B30-$6B4C raises voice-3 frequency high from $19 toward $FF.
- $6B5D-$6B8E distinguishes choices 1,2,3: demo sets $C006=4, play disables demo via $7048, and compatibility tests use $C004. $6B90-$6BAB copies GAME or BLDR into the four-byte filename buffer and sets its length to four; $6BB4 calls KERNAL LOAD.

Scope notes:

- "Resets demo state" means resetting the demo sequence selector to four, whose later decrement starts the next demonstration; it does not mean writing zero.

## 08 $6C51 — supported

Label: `program_choice_y_values`. Type: `byte`.

Exact baseline comment:

> Three arrow Y positions, after the unused zero slot. Unused zero plus Y coordinates $5F,$6F,$7F for the three program choices. Both selection-arrow sprites use this table.

Evidence:

- $6C50-$6C53 contains unused index zero followed by $5F,$6F,$7F. Initial setup $6A08 reads $6C51; ongoing selection $6A69-$6A71 reads $6C50,X and stores it to both $D001 and $D003.

## 09 $6C77 — incorrect

Label: `setup_character_display`. Type: `code`.

Exact baseline comment:

> At raster zero select VIC bank $C000, screen $C400 and charset $C800, normal 25-row multicolor character mode, black background and no sprites.

Evidence:

- $6C77 waits for raster zero; $6C7C-$6C83 writes $94 to CIA2 port A and $13 to $D018, giving VIC bank $C000, screen $C400 and charset $C800.
- $6C86 writes $1B to $D011, selecting 25-row character mode; $6C8B-$6C8D writes $C8 to $D016, whose multicolor-character bit 4 is CLEAR. $6C90-$6C95 sets black background and disables sprites.

Correction: Replace multicolor character mode with standard character mode.

Exact corrected comment:

> At raster zero select VIC bank $C000, screen $C400 and charset $C800, standard 25-row character mode ($D016=$C8 has multicolor bit 4 clear), black background and no sprites. Sprite multicolor is configured separately through $D01C.

Corrected verdict: supported.

Scope notes:

- The baseline multicolor-character assertion is a definite register-decoding error. Sprite multicolor is a different register ($D01C).

## 10 $6CE0 — supported

Label: `str_menu_instructions`. Type: `byte`.

Exact baseline comment:

> Formatted title-writer stream explaining joystick selection, FIRE and the countdown. $69CB draws it at $C689.

Evidence:

- $69CB-$69DB supplies source $6CE0 and screen destination $C689 to writer $686C. The private stream contains joystick selection, before-zero countdown, and press-fire instructions, interleaved with the title writer control bytes.

## 11 $701B — supported

Label: `api_09_tile_lower_left_probe`. Type: `code`.

Exact baseline comment:

> Engine API slot 9: tail-jump to $8593 (tile_lower_left_probe). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $701B is JMP $8593, at $7000+9*3. $8593 chooses X subtraction $10 and Y subtraction $23 before the common screen-cell calculation at $85B1; player update calls it at $70A6 with slot 7 to obtain the lower-left probe.

Scope notes:

- This verifies the fixed native interface and the named operation. It does not assert that both compiled programs directly call every API vector.

## 12 $7024 — supported

Label: `api_12_update_player`. Type: `code`.

Exact baseline comment:

> Engine API slot 12: tail-jump to $707B (update_player). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7024 is JMP $707B, at $7000+12*3. $707B checks player sprite bounds, and $70A2-$70BD probes its lower-left/right tiles and applies pickup handling. Independently decoded GAME bytecode at $2B39 executes SYS $7024.

## 13 $7036 — supported

Label: `api_18_materialize_player`. Type: `code`.

Exact baseline comment:

> Engine API slot 18: tail-jump to $9351 (materialize_player). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7036 is JMP $9351, at $7000+18*3. $9351-$93E7 initializes player/effect sprites, performs the filtered-noise materialization and jumps to actor initialization. GAME bytecode SYS at $2AE7 names $7036.

## 14 $7039 — supported

Label: `api_19_start_sprite_dissolve`. Type: `code`.

Exact baseline comment:

> Engine API slot 19: tail-jump to $92D3 (start_sprite_dissolve). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7039 is JMP $92D3, at $7000+19*3. $92D3-$92E4 resolves the sprite named by $FB, initializes dissolve state $C096 and jumps into the effect setup. GAME SYS calls at $39ED and $3AC2 name this vector.

## 15 $7042 — supported

Label: `api_22_initialize_disk_channel`. Type: `code`.

Exact baseline comment:

> Engine API slot 22: tail-jump to $8B62 (initialize_disk_channel). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7042 is JMP $8B62, at $7000+22*3. $8B62-$8B80 sets the two-character disk-initialize command, logical/device/secondary values 15/8/15, then KERNAL OPEN and CLOSE.

Scope notes:

- A native vector and its destination are established. No claim is made here that a direct SYS to this vector exists in both compiled programs.

## 16 $7048 — supported

Label: `api_24_disable_demo_playback`. Type: `code`.

Exact baseline comment:

> Engine API slot 24: tail-jump to $80DA (disable_demo_playback). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7048 is JMP $80DA, at $7000+24*3. $80DA-$80E9 clears $C006, patches RTS ($60) into $801D to disable playback, and sets $C005=5. Menu choice play reaches it through JSR $7048 at $6B79.

## 17 $704E — supported

Label: `api_26_draw_spell_name`. Type: `code`.

Exact baseline comment:

> Engine API slot 26: tail-jump to $8D4B (draw_spell_name). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $704E is JMP $8D4B, at $7000+26*3. $8D4B selects a thirteen-byte spell-name string using $C31C and copies it to the HUD. GAME SYS at $2FBF names $704E.

## 18 $7051 — supported

Label: `api_27_fade_treasure_popup`. Type: `code`.

Exact baseline comment:

> Engine API slot 27: tail-jump to $7B14 (fade_treasure_popup). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7051 is JMP $7B14, at $7000+27*3. $7B14 returns when popup timer $C061 is zero; otherwise it decrements the timer and changes sprite-6 color $D02D from its phase. The IRQ path directly calls $7B14 at $7CDB.

## 19 $705D — supported

Label: `api_31_delay_from_fb`. Type: `code`.

Exact baseline comment:

> Engine API slot 31: tail-jump to $8E56 (delay_from_fb). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $705D is JMP $8E56, at $7000+31*3. $8E56 loads A from $FB and falls into the delay loop, preserving X/Y. Decoded GAME SYS callers include $2B66,$2CE8 and $33C9; decoded BLDR includes $4360 and $52E9.

## 20 $7060 — supported

Label: `api_32_snap_player_to_slope`. Type: `code`.

Exact baseline comment:

> Engine API slot 32: tail-jump to $781C (snap_player_to_slope). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7060 is JMP $781C, at $7000+32*3. $781C copies the previously probed tile $C02F to $8F, selects player VIC coordinate index $0E, then $7823 onwards calculates the slope-relative Y position from X and the tile kind.

## 21 $7063 — supported

Label: `api_33_force_tile_effect_six`. Type: `code`.

Exact baseline comment:

> Engine API slot 33: tail-jump to $794E (force_tile_effect_six). Compiled SYS calls enter this fixed three-byte vector so the resident implementation can be shared by play and construction.

Evidence:

- $7063 is JMP $794E, at $7000+33*3. $794E loads A=6 and branches to $7978, which stores the tile-effect selector in $C035 and enters the shared effect setup. GAME SYS at $3113 names this vector.

## 22 $7066 — supported

Label: `api_34_input_level_title`. Type: `code`.

Exact baseline comment:

> Engine API slot 34: JMP $8FC4, the construction-title entry called by BLDR $41D4. This entry disables the inactivity timeout; it is not the high-score champion-name entry.

Evidence:

- $7066 is JMP $8FC4. $8FC4-$8FCC copies the six construction-title cursor fields from $8F94; $8FCF-$8FD7 clears 24 title characters at $C750.
- $8FD9 sets A=1 and $8FDB stores it to $FE. The timeout path $9086-$908C tests $FE and skips the forced return when nonzero. The champion-name entry at $8FB5 instead supplies A=0.
- Independently decoding private BLDR bytes finds the target literal $7066 at $41D4 followed by SYS at $41D7.

Scope notes:

- BLDR $41D4 identifies the start of the SYS expression; the SYS opcode itself is at $41D7.

## 23 $7360 — supported

Label: `player_up`. Type: `code`.

Exact baseline comment:

> Use ladder/rope and tile-alignment checks to climb upward one pixel, align X when needed, and select ladder or rope animation/sound.

Evidence:

- $7360 sets direction 3, then $7365-$739A checks the movement/alignment helpers and tiles $5C,$63,$64,$66. $7384 may enter X-centering directly; $7387 performs glyph-conditioned centering.
- The two successful paths each DEC $D00F once: $739C calls climbing sound $8113 and selects pose $8A; $73A7 calls the alternate climbing sound $816B and selects pose $8D. Both feed the shared animation writers.

Scope notes:

- The claim describes the accepted ladder/rope paths, not unconditional movement for every sampled tile.

## 24 $7448 — supported

Label: `player_down_left`. Type: `code`.

Exact baseline comment:

> On a solid foot tile alternate a crawling step using $C077; otherwise configure down/left fallbacks and run the common diagonal resolver.

Evidence:

- $7448 checks the foot glyph $8F against $5C. If adjacent blocking comparisons permit motion, $7460 decrements $C077 and its low bit alternates a return with the crawling step at $74B2. Other foot glyphs take $7472-$748B, which patches direction/left/down fallback targets and enters the common diagonal resolver $7537.

## 25 $752C — supported

Label: `select_down_fallback`. Type: `code`.

Exact baseline comment:

> Patch the diagonal vertical fallback JMP to player_down.

Evidence:

- $752C-$7533 writes low/high bytes $B7/$73 into $756A/$756B, the operand of JMP at $7569. $73B7 is the player-down entry.

## 26 $75C2 — supported

Label: `center_player_x_unconditionally`. Type: `code`.

Exact baseline comment:

> Alternate centering entry skips the glyph test. Use X bits 1-2 to move to an eight-pixel boundary and update VIC X-high on carry.

Evidence:

- The ordinary entry at $75BC requires glyph $66; entering $75C2 bypasses that test. It masks X with $06: zero returns, $02 clears the low three bits, $04 adds four, and $06 adds two. A low-byte carry sets player bit 7 in $D010.
- The caller context uses even player X: $792E moves by two pixels and all forty authored room starts have even X. Parent independently ran the original routine for 149 even X positions from 24 through 320, checked all forty start coordinates, and checked odd X=121 remains 121.

Scope notes:

- Supported for the gameplay even-X precondition. Arbitrary prepared odd X is not guaranteed to reach an eight-pixel boundary; e.g. 121 is unchanged. This scope qualification is not counted as an additional baseline gameplay failure.
- The 149-position offline check is the parent’s independent spotcheck; the cold reviewer inspected the instructions and even authored starts.

## 27 $7687 — supported

Label: `slide_player_on_special_slope`. Type: `code`.

Exact baseline comment:

> Preserve the selected pose and carry direction, take two horizontal steps and four downward pixels, play sliding sound and apply the pose.

Evidence:

- $7687 pushes the selected pose A and processor status; $7689 calls the two-pixel horizontal stepper $792E, restores status and calls it again, preserving the direction carry for both steps. $7690-$7696 adds four to player Y, $7699 calls the sliding sound, and PLA/JMP $787D applies the saved pose.

Scope notes:

- "Two horizontal steps" means two calls to the two-pixel helper, for four horizontal pixels in total.

## 28 $799A — supported

Label: `tile_effect_jump_799a`. Type: `code`.

Exact baseline comment:

> Tile-effect dispatch slot 1: JMP selected through the patched branch at $7998. Effects are teleport, death, right, up, left and down in slot order.

Evidence:

- $7987 loads effect selector $C035 into Y; $7992-$7995 writes $79AC,Y into the relative-branch operand at $7999. Selectors 1..6 produce offsets 0,3,6,9,12,15 and select JMPs at $799A,$799D,$79A0,$79A3,$79A6,$79A9: teleport $79B3, death $79FA, right $7A02, up $7A46, left $7A14, down $7A4E.

Scope notes:

- Slot numbering is one-based here; zero returns at $798A-$798C before dispatch.

## 29 $7A46 — supported

Label: `tile_force_up`. Type: `code`.

Exact baseline comment:

> Move up two pixels and sample feet; stop the effect on a platform/slope at the required alignment, otherwise return through the forced-motion continuation.

Evidence:

- $7A46/$7A49 each decrement player Y. The common path probes feet with $85AB, tests flat platform $5C with alignment helper $7916, or the six slope codes $5D-$62 with $7823. The aligned/adjusted stop path goes through $7A7E to $8F79, which clears $C035; the other path discards two stack bytes and continues at $7177.

Scope notes:

- The comment’s "forced-motion continuation" refers to continuing the enclosing movement processing. The exact stop/reset path is $7A7E→$8F79, not the $7A75 stack-unwind path.

## 30 $7ACE — supported

Label: `collect_or_exit_tile`. Type: `code`.

Exact baseline comment:

> Glyph $40 exits only after key flag $C030 is set; store exit position, animate disappearance and set $C02C=$80. Glyphs $1B-$1F are removed on contact: $1B is the key and replenishes charges from the level header; others go to treasure scoring. Live forced-tile check: key at the sampled cell sets key flag and restores charge digit3; matching control has neither change.

Evidence:

- $7ACE-$7AD7 accepts glyph $40 only when $C030 is nonzero. The accepted path stores coordinates from $94F8 in $C00A/$C01A, calls disappearance $8C8F, and writes $80 to $C02C.
- $7AF2-$7AFF subtracts $1B, accepts only results 0..4 (glyphs $1B-$1F), and replaces the contacted cell with $20. Result zero increments key flag $C030 and copies $C31D to charge digit $C7AB; nonzero results JMP $8464.
- Archived work/live-tests.json has a forced glyph-$1B test at $C693 changing key 0→1 and charge screen code 48→51, while glyph-$1C controls at the same cell leave key/charges unchanged and instead change score.

Scope notes:

- Historical live-test evidence was inspected, not rerun. The forced-state test establishes accepted code behavior, not a naturally reachable pickup route.

## 31 $7B27 — supported

Label: `animate_level_cells`. Type: `code`.

Exact baseline comment:

> Cycle colors over up to sixteen recorded treasure cells and sixteen hazards. Every second interrupt update cycle the hazard screen glyph through $72-$75.

Evidence:

- $7B27-$7B6B cycles a three-color phase and iterates X=15..0 over the recorded treasure and hazard address arrays, writing their color-RAM cells. $7B6D decrements $C078 and updates hazard glyphs only when its low bit is zero; the glyph writes are $72 + a wrapped 0..3 phase. The timer IRQ calls it at $7CCF.

Scope notes:

- The routine writes sixteen array entries in each loop, including any dummy or repeated entries used when fewer cells are recorded. It is not a claim that every room has sixteen treasures and sixteen hazards.

## 32 $7BA7 — supported

Label: `hazard_flash_colors`. Type: `byte`.

Exact baseline comment:

> Three colors for the recorded animated hazard cells, paired with the four-frame glyph animation at $7B6D.

Evidence:

- $7B51-$7B68 indexes $7BA7 by the 0..2 phase $C07A to color the hazard address list. The three stored colors are 7,8,10. $7B6D-$7BA1 independently supplies the four glyph frames $72-$75.

## 33 $7D06 — supported

Label: `test_elevator_contact_height`. Type: `code`.

Exact baseline comment:

> After a sprite-collision latch selected elevator slot Y, compute ADC #14 then SBC elevatorY WITHOUT SEC. For ordinary player Y<242 the ADC carry is clear, so accept (playerY+13-elevatorY) modulo 256 in 0..2. Set $C02B=2 and supporting slot $C033. All six slots and eight nearby height offsets checked against the original IRQ; collision geometry is separate.

Evidence:

- Collision handling at $7CE7-$7D04 first requires the player collision bit, identifies an actor slot Y, and tests type 7. $7D06 doubles Y into the VIC coordinate index.
- $7D09-$7D14 executes LDA playerY / CLC / ADC #$0E / SBC elevatorY / CMP #3 / BCS reject, without SEC before SBC. For playerY<242, ADC leaves carry clear, so the accepted modular difference is playerY+13-elevatorY in 0..2. The accepted path stores $C02B=2 and Y to $C033.
- Archived verify_movement_rules.js loops six slots and dy=-2..5, supplies the collision latch, invokes cpu.irq($7CBF,{kernal:true}) on the original IRQ, and asserts acceptance exactly for dy=0..2. movement-verification.json records elevatorCases=48.

Scope notes:

- These are synthetic IRQ tests with collision flags supplied, not a geometric demonstration that a real collision occurs at every prepared state. The comment correctly separates collision geometry. Historical test count is corroborated by both fixture loop and result record.

## 34 $80D4 — supported

Label: `demo_input_pages`. Type: `byte`.

Exact baseline comment:

> Three pages $9A,$99,$58 holding recorded joystick values at offset zero and run lengths at offset $80. $80A2 selects them by demo number minus one.

Evidence:

- $80D4-$80D6 stores $9A,$99,$58. $80B4 decrements demo number into Y, sets low pointer bytes $AA=0/$AC=$80, and writes the selected page to $AB/$AD. Playback $803B reads the first pointer for joystick output; $804B reads the second for duration.

## 35 $80D7 — supported

Label: `demo_level_pages`. Type: `byte`.

Exact baseline comment:

> Three source pages $9B,$5E,$59. $8E79 copies $470 bytes from the selected page into $C300-$C76F for attract-mode play.

Evidence:

- $80D7-$80D9 stores $9B,$5E,$59. $80C7-$80CC loads the selected page into $FB and calls $8E79. Its Y=$6F plus four complete-page loops copy exactly $470 bytes into $C300-$C76F.

## 36 $8113 — supported

Label: `sound_climbing_notes`. Type: `code`.

Exact baseline comment:

> On alternating Y pixels gate voice 3; on the other pixels fold height into a note/octave and convert through $8437, producing position-dependent climbing tones.

Evidence:

- $8120-$8128 tests player Y parity: odd Y writes triangle control $10 with gate clear; even Y folds the inverted/adjusted height through octave-boundary additions, stores it in $B1, calls frequency converter $8437, and writes frequency plus triangle/gate control $11 to voice 3.

Scope notes:

- The wording "gate voice 3" describes alternate gate-off/gate-on writes; odd Y is specifically gate off.

## 37 $81BB — supported

Label: `init_platform_build_sound`. Type: `code`.

Exact baseline comment:

> Initialize all three voice envelopes and fixed frequency components for the first terrain-drawing pass.

Evidence:

- $81BB-$81D3 clears sustain/release for all three voices and supplies attack/decay values $03,$03,$05. $81D6-$81EA writes their fixed frequency components. The first terrain-drawing phase calls it at $912D when the draw-sound flag is set, before the common renderer at $9130.

## 38 $839A — incorrect

Label: `sound_key_appearing`. Type: `code`.

Exact baseline comment:

> Play fixed three-voice chord/noise combination for a key tile, delay 180 units and rejoin the terrain renderer.

Evidence:

- The key drawing pass sets glyph $1B at $9212 and patches the sound target $839A into $8AB7/$8AB8 at $921A-$9221. The renderer invokes that target through JMP ($8AB7) at $924C.
- $839A-$83CC clears controls and writes fixed envelopes/frequencies. $83CF-$83D7 writes $15 to all three voice control registers: triangle, ring modulation and gate; noise is disabled.
- $83DA loads $B4 (180), calls delay $8E58, and JMPs back to terrain continuation $924F.

Correction: Describe a three-voice ring-modulated triangle chord, not a noise waveform.

Exact corrected comment:

> Configure all three SID voices for a fixed key-appearance sound with control $15 (triangle, ring modulation and gate; noise disabled), delay 180 units and rejoin the terrain renderer.

Corrected verdict: supported.

Scope notes:

- The baseline word "noise" is not supported as a SID waveform claim; the revised description names the actual control bits. No perceptual claim about how the chord sounds was tested.

## 39 $841C — incorrect

Label: `normalize_note_number`. Type: `code`.

Exact baseline comment:

> Skip invalid low-nibble semitone values $C and $F by adding/subtracting four in $B1; other note encodings return unchanged.

Evidence:

- $841C masks the low nibble of $B1. Nibble $F subtracts four; nibble $C normally adds four; others return without storing.
- For $B1=$FC, ADC #4 at $8427 wraps A to zero, so BNE $8434 at $8429 falls through. CMP #$0F / BNE $8436 then returns without STA, leaving $B1=$FC.
- Parent independently executed the original routine using kit/c64/cpu6502.js for all 256 input bytes with decimal mode clear. The sole mismatch against the baseline unqualified rule was input 252, expected 0, actual 252. The only decoded direct caller is $824D, after INC $B1 in the terrain sound pass.

Correction: State the $FC wraparound exception; its reachability during the terrain pass has not been established.

Exact corrected comment:

> Adjust packed-note low nibble $C upward by four, except $FC: addition wraps to zero and the branch bypasses the store, leaving $FC unchanged. Low nibble $F subtracts four; other bytes are unchanged. All 256 inputs checked. The only decoded resident caller is $824D after INC $B1; ordinary reachability of the $FC exception is not established.

Corrected verdict: supported.

Scope notes:

- The baseline arithmetic rule omitted one boundary case. Reachability of $FC during ordinary terrain drawing remains unproven; this is not a demonstrated gameplay bug.
- The exhaustive offline check was performed by the parent after the reviewer’s instruction trace identified the exception.

## 40 $84D8 — supported

Label: `treasure_score_tens`. Type: `byte`.

Exact baseline comment:

> Seven tens-column additions 5,0,0,0,0,0,5, paired with the hundreds-column table at $84DF. Treasure class plus difficulty selects 50,100,200,300,400,500,750 points; the eight-digit HUD keeps its final zero unchanged.

Evidence:

- $84D8-$84DE contains 5,0,0,0,0,0,5 and $84DF-$84E5 contains 0,1,2,3,4,5,7. $7AF3 converts treasure glyphs $1C-$1F to classes 1..4; $8464 adds difficulty and $84A1 decrements the index. $84A2/$84A8 place the two additions into the last two columns of a seven-digit buffer. $84BB-$84CA adds to HUD digits $C7B7-$C7BD, leaving trailing $C7BE untouched: 50,100,200,300,400,500,750 for the seven valid indexes.

Scope notes:

- The seven-entry interpretation assumes the normal class/difficulty domain; arbitrary invalid prepared indexes are not bounds-checked by the table reads.

## 41 $84DF — supported

Label: `treasure_score_hundreds`. Type: `byte`.

Exact baseline comment:

> Hundreds-column additions 0,1,2,3,4,5,7. The preceding table supplies the tens digit; the HUD has a trailing zero. Seven unit-digit and seven tens-digit additions for treasure class plus difficulty. $8464 inserts them into a seven-digit decimal addition buffer, then adds into HUD score.

Evidence:

- $84DF-$84E5 contains 0,1,2,3,4,5,7. $849A first clears the seven-digit addend; $84A2 writes the preceding table into its final column and $84A8 writes this table into the preceding column. The addition loop stops at $C7BD, leaving the eighth HUD digit $C7BE unchanged, so these are hundreds in the displayed eight-digit score.

Scope notes:

- The later wording "unit-digit and tens-digit" refers to the internal seven-digit representation (display score divided by ten); the opening sentence correctly names the displayed hundreds column. This mixed terminology is editorially awkward but not a different arithmetic claim.

## 42 $8521 — supported

Label: `clear_decimal_addend`. Type: `code`.

Exact baseline comment:

> Zero seven bytes $92-$98 used as the digit-wise score addition buffer.

Evidence:

- $8521 loads X=6 and A=0, then $8525/$8527/$8528 stores to $92,X and decrements until X becomes negative. Exactly $92-$98 inclusive, seven bytes, are zeroed. The treasure score path calls it at $849A.

## 43 $860D — supported

Label: `player_sprite_mask`. Type: `byte`.

Exact baseline comment:

> Final even-indexed mask $80 for sprite 7, after the seven actor/effect masks. Sprite bit masks placed at even indices 0,2,...14 so the same X index can address VIC coordinate pairs and the X-high-bit mask.

Evidence:

- $85FF-$860D contains masks at even offsets: 1,2,4,8,16,32,64,128, with zero fillers between. Actor code doubles slot Y into X at $8642-$8644 and uses that X both for VIC coordinate pairs and mask reads at $7DAC/$85DD. Player update reads the last mask directly at $7089.

Scope notes:

- There are six actor masks, one effect-sprite mask, and then the player mask; the comment groups the first seven as actor/effect masks.

## 44 $8759 — supported

Label: `actor_sound_chance`. Type: `code`.

Exact baseline comment:

> Return nonzero except when shared animation phase is divisible by eight and random state bit 0 is zero; actor controllers use this to throttle incidental sounds.

Evidence:

- $8759-$8765 loads shared phase $C078, ANDs with 7 and returns immediately when nonzero; otherwise it returns $C031 & 1. Thus zero occurs exactly for phase divisible by eight and random bit zero. Callers $8743/$874E branch over their sound calls when the result is nonzero.

## 45 $8845 — supported

Label: `control_flying_pursuer`. Type: `code`.

Exact baseline comment:

> Types 2,3,5 choose X/Y velocity toward the player and a random movement duration shortened by difficulty*8; sometimes suppress Y motion. Type 2 also triggers its buzzing sound.

Evidence:

- Type dispatch reaches $8845 through $866A,$8671,$867F for types 2,3,5. The routine calls horizontal aim $89D9 and vertical aim $8A02.
- $884B-$885E computes difficulty*8 by three shifts, subtracts that from a random-duration expression and stores $C04B,Y. $8861-$8868 clears vertical velocity when $C031 & 3 is zero. $886B-$8872 triggers $9766 only for type 2.

Scope notes:

- The description does not promise an exact random-duration range. ADC/SBC carry state affects its constant term; only the difficulty*8 subtraction is claimed here.
- The boundary-recovery caller at $7DE2 can also route compatible out-of-bounds actors here; the comment identifies the normal controller dispatch types, not an exhaustive caller set.

## 46 $8978 — supported

Label: `control_stationary_actor`. Type: `code`.

Exact baseline comment:

> Types 8-10 have zero velocity and a 255-tick movement duration; the shared animation still runs.

Evidence:

- $8690-$86A2 routes types 8,9,10 to $8978. It clears both velocity arrays $C052,Y and $C059,Y, stores $FF to duration $C04B,Y, then JMPs $8657→$7D82.
- The common in-bounds path $7DFF-$7E08 tests and decrements duration once per accepted controller update. Zero velocities leave coordinates unchanged; with $C070,Y zero, $7E38 jumps to $7F3D, and $7F65-$7F69 reaches shared animation $78AD. That code updates sprite pointers and animation offset/state according to $C360/$C368 arrays.

Scope notes:

- A "tick" here is an accepted actor-controller update, not necessarily a video frame. Freeze/throttle gates or boundary recovery can alter when a controller reaches the common path. The duration starts at 255 and is decremented during that first common update.

## 47 $8A02 — supported

Label: `aim_actor_vertical`. Type: `code`.

Exact baseline comment:

> Compare actor Y with player Y and store velocity +1, zero or -1 toward the player.

Evidence:

- $8A02-$8A16 subtracts player Y ($D00F) from actor Y ($D001,X) with SEC. Equal leaves A=0; actor above player takes A=1; actor below takes A=$FF. It stores A to $C059,Y. Callers include $87A1,$8848,$888F.

## 48 $8A22 — supported

Label: `reload_graphics`. Type: `code`.

Exact baseline comment:

> Load CHRW into $C800 and SPRW into $E000 through KERNAL LOAD using device 8; return the final disk status in FB.

Evidence:

- $8A22-$8A3A sets logical/device/secondary values 15/8/0, filename length four at $8A5E (CHRW), and loads to X/Y=$00/$C8. $8A3D-$8A55 repeats for $8A62 (SPRW), target $E000. $8A58 calls READST and $8A5B stores the final result in $FB.

Scope notes:

- Only the final LOAD status is returned; the routine does not independently return both graphics-file statuses.

## 49 $8A5E — supported

Label: `graphics_filenames`. Type: `byte`.

Exact baseline comment:

> PETSCII CHRW and SPRW names used by $8A22 to reload the charset at $C800 and sprites at $E000.

Evidence:

- The private source bytes at $8A5E-$8A65 decode as the PETSCII filenames CHRW and SPRW. The two length-four SETNAM calls at $8A31/$8A4C point to those respective starts; the associated LOAD destinations are $C800 and $E000.

## 50 $8ABA — supported

Label: `level_filename_suffix`. Type: `byte`.

Exact baseline comment:

> PETSCII T ends the four-byte LnnT name; KERNAL receives its explicit length, with no zero terminator.

Evidence:

- $8BBD explicitly writes PETSCII T ($54) to $8ABA and L ($4C) to $8AB7 when constructing the LnnT name. LOAD setup at $8A7D-$8A83 and SAVE setup at $8ADA-$8AE0 pass filename pointer $8AB7 and length four to SETNAM; no terminator is needed.

## 51 $8ABB — supported

Label: `save_level`. Type: `code`.

Exact baseline comment:

> Protect the supplied game disk: $8B98 LOADs PPSS and leaves Z set when status is $40 (marker read succeeded). That case returns FB=1 without saving. Otherwise construct LnnT, initialize/scratch the destination and SAVE $C300-$C76F. Live: private original-disk copy rejected; blank private disk saved L99T with status 0 and reloaded identical reset elevator fields.

Evidence:

- $8ABB calls $8B98, which names PPSS, LOADs it through KERNAL, reads status and ends with CMP #$40. On equality, $8ABE does not branch and $8AC0-$8AC2 returns $FB=1 without reaching SAVE.
- The other path calls filename construction $8BBD, initialization $8B62 and scratch-command helper $8B81. $8AE3-$8AF1 supplies start pointer $C300 and exclusive end $C770 to KERNAL SAVE, covering $C300-$C76F.
- Archived editor-save-result.json records original-copy status 1, private blank status 0, L99T payload length 1136, reset elevator velocity/duration/positions, original_unchanged=true and live_reload_verified=true.
- Parent independently compared private editor-saved-l99t.prg (load address $C300, 1136-byte payload) with editor-saved-blank.vsf RAM $C300-$C76F; all 1136 bytes agree, with zero mismatches.

Scope notes:

- The private-disk live run was not repeated by this reviewer. Status/branch behavior is independently supported by source; the prior live claim is corroborated by its archived result and saved artifacts.

## 52 $8C8F — supported

Label: `animate_exit_disappearance`. Type: `code`.

Exact baseline comment:

> Start player sprite dissolve, then sweep voice-2 frequency over fourteen rising ramps with short delays.

Evidence:

- $8C8F sets $FB=7 and calls dissolve initializer $92D3 for the player sprite. $8C96-$8CA5 configures voice 2; $8CAC sets fourteen outer iterations and $8CAE sets thirty increments per ramp. Each increment raises $FB and writes frequency high $D408, with delay 2; each completed ramp subtracts twenty before the next.

## 53 $8D67 — supported

Label: `spell_name_offsets`. Type: `byte`.

Exact baseline comment:

> Twelve byte offsets 0,13,...143 into spell_names. $8D4B adds the selected offset to $8D73 and copies thirteen characters into the HUD.

Evidence:

- $8D67-$8D72 contains 0,13,26,39,52,65,78,91,104,117,130,143. $8D4B-$8D5A indexes it by $C31C and adds the selected offset to base $8D73; the loop at $8D5C-$8D64 copies indices 12 through 0 to HUD $C7CC-$C7D8.

## 54 $8D73 — supported

Label: `spell_names`. Type: `byte`.

Exact baseline comment:

> Twelve fixed-width spell labels, 13 screen-code bytes each: FIREBALL, MAGIC MISSILE, DISINTEGRATE, ENCHANTMENT, FREEZE, INVISIBILITY, TELEPORT, FEATHER FALL, LEVITATE, HASTE, SLOW and NONE. Uppercase glyphs use $41-$5A directly; spaces pad the status display field.

Evidence:

- Reading twelve consecutive thirteen-byte fields from private RAM at $8D73 yields FIREBALL, MAGIC MISSILE, DISINTEGRATE, ENCHANTMENT, FREEZE, INVISIBILITY, TELEPORT, FEATHER FALL, LEVITATE, HASTE, SLOW, NONE, padded with spaces. Letters are stored at $41-$5A; $8D5E-$8D60 copies them directly into the custom-character HUD without a PETSCII-to-screen conversion.

Scope notes:

- The game uses a custom charset. These direct $41-$5A codes should not be generalized to the machine’s default uppercase screen-code alphabet.

## 55 $8FA0 — supported

Label: `initials_input_bounds`. Type: `byte`.

Exact baseline comment:

> Six cursor fields {18,17,21,17,18,17} for the three-character initials entry $8FA6. GAME calls it through SYS $7078 at $4541.

Evidence:

- $8FA0-$8FA5 contains 18,17,21,17,18,17. $8FA6-$8FAF copies all six fields to $C067-$C06C. The input loop uses $C06B/$C06C for cursor positioning and $C069 as the exclusive right bound, permitting the three character positions 18,19,20. Native vector $7078 JMPs $8FA6; decoded GAME bytecode at $4541 executes SYS $7078.

## 56 $9351 — supported

Label: `materialize_player`. Type: `code`.

Exact baseline comment:

> Place wizard and effect sprite at level start coordinates, initialize colors and pointers, sweep filtered noise, reveal the wizard, dissolve the effect sprite and finish by initializing actors.

Evidence:

- $9351-$936C reads player start X/Y from $C31E/$C31F into sprite 7 and places effect sprite 6 at X+3/Y+7. $935D supplies X-high flags from $C352; subsequent writes initialize pointers and colors.
- $9396-$93AC routes voice 3 to the filter and enables noise/gate ($81); $93AF-$93BE sweeps filter cutoff. $93C0-$93CE changes the effect image, reveals both sprites and starts dissolving slot 6. The final loop reaches JMP $8F2F at $93D9, whose loop resets actor sprite, color, duration and velocity arrays.

Scope notes:

- The effect sprite is offset (+3,+7) from the wizard’s start, rather than sharing identical raw VIC coordinates. The comment describes the start-position materialization as a whole.

## 57 $9766 — supported

Label: `sound_flying_actor`. Type: `code`.

Exact baseline comment:

> Retrigger voice 1 sawtooth with random high frequency and envelope $74 for actor type 2.

Evidence:

- $9766-$9770 clears voice-1 control/sustain-release and sets attack/decay $74. $9773-$977A derives its frequency high from random state $C031 with high bits set; $977D-$977F writes sawtooth/gate control $21. The caller at $886B-$8872 explicitly checks actor type 2.

## 58 $982F — incorrect

Label: `sound_horizontal_hazard_hit`. Type: `code`.

Exact baseline comment:

> Configure low voice 1 and retrigger voice 2 with triangle/sync/ring control on a type-1 collision.

Evidence:

- The collision sound caller $9519-$951D tests actor type 1 before calling $982F. $982F-$984A clears both voice controls and envelopes, supplies low voice-1 frequency and the voice-2 frequency.
- $9854-$9856 writes control $13 to voice 2: triangle, synchronization and gate. Ring-modulation bit 2 is clear. The baseline description incorrectly includes ring modulation.

Correction: Remove ring modulation from the voice-2 control description.

Exact corrected comment:

> Configure low voice 1 and retrigger voice 2 with control $13 (triangle, sync and gate; ring modulation disabled) on a type-1 collision.

Corrected verdict: supported.

## 59 $9900 — supported

Label: `demo_two_input`. Type: `byte`.

Exact baseline comment:

> Demo Two recorded joystick stream: 128 active-low port values followed by 128 run-length counters at $9980. Playback points $AA/$AC to the two halves and advances only when a duration expires. A marker $FA in the resident stream is also checked by protection bytecode. Fresh assisted boot watches LODR $1986 write $FA to $99F0; the disk file has $01 there.

Evidence:

- $80D4’s second page is $99; $80B8-$80C5 constructs pointers $9900 and $9980. Playback $803B writes the current first-half value to CIA1 port A, decrements duration $C03B, and advances index $C03A only on expiration; $804B reloads from the second half.
- Private entry.vsf RAM contains $FA at $99F0. Independently decoded GAME bytecode includes a protection comparison using a literal $99F0 at $4890; the entry protection check also uses the distinct $99E8 address at $2971.
- Archived audit-boot-result.json includes the stop at PC=$1989 immediately after runtime LODR $1986 STA $99F0, with A=$FA and marker pair [$01,$FA], followed by PC=$198C and marker pair [$FA,$FA]. This distinguishes the observed loader writes from a mere interpretation of the final snapshot.
- Parent independently checked ML: load address $5800, payload 18288 bytes, marker at $99F0=$01; entry.vsf RAM has $FA there. Runtime snapshots audit-boot-protection.vsf and audit-boot-title-entry.vsf independently decode $1986 as STA $99F0 and $1989 as STA $58FF.

Scope notes:

- The stream has two 128-byte regions by pointer/layout; this is not a promise that all 128 authored entries execute in a single demo.
- The fresh assisted-boot observation is archived evidence, not a newly repeated boot. Raw lodr.prg does not contain these same instructions at $1986; the relevant evidence is loaded/decrypted runtime RAM, not a direct decode of the on-disk file.

## 60 $9B00 — supported

Label: `demo_one_header`. Type: `byte`.

Exact baseline comment:

> Resident demonstration level "Hot Stuff": 128-byte engine header and 128-byte treasure-patch area. The first header fields provide six actor positions, colors and behavior; later fields provide spell/start/timing settings. $8E79 copies the full $470-byte level to $C300.

Evidence:

- $80D7’s first source page is $9B, selected for the first demo. $8E79 copies exactly $470 bytes to $C300-$C76F; the source title at $9F50 decodes as Hot Stuff.
- The mapped header is $C300-$C37F, with six actor X/Y fields at $C300/$C306 and colors/types at $C310/$C370, spell/start fields $C31C-$C31F, and timer consumers including $C350 and $C359-$C35E at $8EE9/$8F10-$8F25.
- Sixteen eight-byte treasure patch records occupy the following $C380-$C3FF: $949F-$94AF computes slot*8 and reads the record address, then $94BF reads its glyph bytes.

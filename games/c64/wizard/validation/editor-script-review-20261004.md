# BLDR cold source review — 4 October 2026

Baseline `db7640ac883e7996f6b2b9e7589e4501ebaa3757`. Scope: BLDR $2800–$530C only. Read AGENTS.md, 60-verify and c64-reference. Reviewer wrote none of these annotations. No canonical files changed.

Static original BLDR PRG and shared interpreter bytes; offline original-runtime synthetic probes using existing editor-menu.vsf initialized RAM and private BASIC/KERNAL ROMs. No new live VICE actions, no disk writes, no independent maintainer certification. Archived snapshot is an input fixture, not fresh live proof.

## Result

All 20 saved random statement samples are correct: error fraction 0/20, Wilson 95% interval 0–16.11%. The separate targeted audit covers all 43 region descriptions: 39 correct, four with incorrect details. All 232 packed DATA records and all 3,830 statement boundaries/numeric literals match the original bytes. The original DATA initializer reproduced all 230 consumed array values and strings.

## Actionable corrections

### $463A

Existing: Joystick cursor helper. Select four-pixel positioning or eight-pixel cell movement, handle repeat delay and wrap X/Y at editor bounds; FIRE ends positioning.

Replacement: Joystick cursor helper. Use four-pixel horizontal and one-pixel vertical positioning, or eight-pixel movement on both axes. Handle repeat delay and wrap at editor bounds; FIRE ends positioning.

Evidence: Entry $463A sets horizontal step V22=4, while $469E sets vertical step V23=1. With V22=8, both axes move by eight pixels and the repeat counter becomes eight. X wraps from 8 through 328. Y wraps from 50 through 197 normally, or through 210 when sprite pointer 63 is selected. FIRE returns; eight-pixel mode returns after each pass. Ten original-runtime cursor cases confirm both axes and wrapping.

Direct decoded callers: [{"address": "3671", "text": "GOSUB $463A"}, {"address": "3872", "text": "GOSUB $463A"}]

### $48B6

Existing: Read a numeric field or comma-separated pair using GET. Handle deletion, optional minus signs, a single comma, RETURN, VAL conversion and empty input.

Replacement: Read a nonnegative integer field or comma-separated pair using GET. Handle deletion, a single comma, RETURN, VAL conversion and empty input; minus signs are rejected.

Evidence: The minus-sign claim is false. An exhaustive original-runtime probe of all 256 character values accepts only comma (44) and digits (48..57); RETURN (13) and DELETE (20) are special cases before this predicate. The length test uses >16, allowing 17 characters. At most one comma is admitted. Empty input returns V0=V5=0. Full GET/VAL execution confirms -1 becomes 1, -1,-2 becomes 1,2, and 1.2 becomes 12 because signs and the decimal point are ignored.

Direct decoded callers: [{"address": "33E9", "text": "GOSUB $48B6"}, {"address": "394A", "text": "GOSUB $48B6"}, {"address": "3A3C", "text": "GOSUB $48B6"}, {"address": "3A86", "text": "GOSUB $48B6"}, {"address": "3AD8", "text": "GOSUB $48B6"}, {"address": "3B18", "text": "GOSUB $48B6"}, {"address": "3B56", "text": "GOSUB $48B6"}, {"address": "3B81", "text": "GOSUB $48B6"}, {"address": "3BC1", "text": "GOSUB $48B6"}, {"address": "3BF9", "text": "GOSUB $48B6"}, {"address": "3C2F", "text": "GOSUB $48B6"}, {"address": "3D7F", "text": "GOSUB $48B6"}, {"address": "3E1D", "text": "GOSUB $48B6"}, {"address": "3E52", "text": "GOSUB $48B6"}, {"address": "3E95", "text": "GOSUB $48B6"}, {"address": "4040", "text": "GOSUB $48B6"}, {"address": "4083", "text": "GOSUB $48B6"}, {"address": "40BC", "text": "GOSUB $48B6"}, {"address": "4189", "text": "GOSUB $48B6"}, {"address": "43BC", "text": "GOSUB $48B6"}]

### $4CEF

Existing: Check the extra cells needed for ladders, portals and two-/three-cell slopes before placement.

Replacement: Check neighboring cells for compound objects. The portal loop checks only its upper-right cell, leaving the upper-left and upper-middle cells unchecked before placement overwrites them.

Evidence: The portal space check is incomplete. Object 19 requires row>=2 and column 2..37, but its FOR has limit -41, initial -39, and default STEP +1, so its body checks only p-39. The cells at p-41 and p-40 are unchecked. Full original placement from $4C54 to $4B64 proves an existing glyph 91 is overwritten with 104 or 105 there. Occupied p-39, center, or either bottom neighbor rejects placement. All-blank placement is the positive control. The other compound-object neighbor checks agree with their footprints.

Direct decoded callers: [{"address": "4CB6", "text": "GOTO $4CEF"}]

### $51C6

Existing: Construction title with publisher/author credits and port-two instructions. Cycle title colors and wait for FIRE or a 7500-pass timeout.

Replacement: Construction title with publisher/author credits and port-two instructions. Cycle title colors and wait for FIRE or a 7501-pass timeout.

Evidence: The timeout is off by one in the description. V11 starts at zero; each pass increments it before testing 7500<V11, so timeout occurs on pass 7501. Original-runtime controls show 7499 becomes 7500 and continues, while 7500 becomes 7501 and exits. FIRE also exits when port-two bit 4 is clear. SYS $6406 runs before the text and every sixth pass; SYS $705D delays with FB=4. The credits and port-two instructions match the bytes.

Direct decoded callers: [{"address": "3360", "text": "GOSUB $51C6"}]

## Random sample

Seed 202610043. Selection: `random.Random(seed).sample(population, 20)` in Python. The population contains 3,830 source statements selected by this exact predicate: `source lines matching ^([0-9A-F]{4}) (.+)$ with inclusive address $3320-$530C; population in source line order`. Selection was saved before review; exact text, line, address, and hashes remain in JSON.

- `$4621` `C2` — `A=PEEK(A)`: **correct**. C2 selects native $17EF; converts A to address in $14/$15, LDA ($14),Y at $180F with Y=0, returns unsigned integer. Caller sequence indexes actor type $C370+V1.
- `$45E0` `D1 E1 44` — `GOTO $44E1`: **correct**. D1 E1 44 supplies little-endian target $44E1 to native $12ED; the target reprints the selected color.
- `$337E` `06` — `B=V6`: **correct**. Opcode 06 uses secondary scalar path $0999 with index 6*8=$30, loading V6 record $2830.
- `$37BB` `40 00 01` — `A=256 ($0100)`: **correct**. 40 00 01 loads signed little-endian integer $0100=256 through $0AEB; subsequent 84 computes V7/256 for X-high.
- `$3BD3` `43 90 C3 5F 00 00 00` — `A=50015 ($C35F)`: **correct**. 43 six-byte floating literal has exponent/mantissa value 50015=$C35F; native $0B1D copies six FAC bytes. This is the shared elevator duration address.
- `$35B5` `94` — `A=(A==B)`: **correct**. Opcode 94 table target $1202 masks equality bit 4 from $1248 and returns -1 or 0; compares command key DATA value with V7.
- `$5146` `55 10` — `B=16 ($10)`: **correct**. 55 10 loads secondary unsigned byte 16 via $0B54; indexes the high half of fire pointer table.
- `$4EFA` `FC 09 32` — `ARRAY_BASE $3209`: **correct**. FC 09 32 selects array base $3209 through $218D/$2191/$2196; the following load indexes the terrain glyph table.
- `$4C3F` `D2 0D 51` — `GOSUB $510D`: **correct**. D2 0D 51 invokes $510D via $12FC; preceding V15=-1 makes pointer initialization return at 5155 rather than replace new-screen defaults.
- `$3C83` `25` — `A=V5`: **correct**. Opcode 25 uses primary path $0955 with index 5*8=$28; reads scalar V5 at $2828, then reads spell animation array at $2F8D.
- `$50DD` `CB` — `FOR default_step`: **correct**. CB selects $0D5A; default FOR step+1 pushes limit supplied by preceding floating literal 51055. Initial 51016 is assigned at 50E5:40 bottom-border cells.
- `$3EEA` `F5` — `PUSH A`: **correct**. F5 selects typed primary push $1395; pushes patch destination-byte address computed as $C386+8*treasure Index before the value is formed.
- `$3CFA` `06` — `B=V6`: **correct**. Opcode 06 selects secondary V6 at $2830 through $0999; combines 16+$D000 to clear X-high before treasure cursor selection.
- `$4C0A` `D4 04` — `IF_ZERO_SKIP $4C0F`: **correct**. D4 04 goes to opcode+1+4=$4C0F when A=0; native $12CA-$12EA. Otherwise falls through to GOTO4BFB, polling while key is 64 or 51.
- `$52D2` `F5` — `PUSH A`: **correct**. F5 typed push saves V11/6; subsequent INT of same quotient is compared to detect every sixth title pass.
- `$3FA3` `20` — `A=V0`: **correct**. Opcode 20 uses primary V0 at $2800 via $0955; INT/PRINT display cursor column.
- `$4088` `9E` — `A=0`: **correct**. 9E dispatches $13FC, setting primary integer high and low bytes 0. Subsequent compare checks whether slide duration is negative.
- `$3FB9` `D0` — `PRINT A$`: **correct**. D0 dispatches $0C6D PRINT-string handler; preceding 31 loads V17 string before the slide-number prompt.
- `$40CC` `8F` — `A=A OR B`: **correct**. 8F dispatches $11BD; coerces and ORs signed 16-bit values in $64/$65 and $6C/$6D. Combines normal-duration out-of-range predicates.
- `$44D0` `00` — `B=V0`: **correct**. Opcode 00 uses secondary V0 at $2800 via $0999; the next 81 subtracts A=3 from B=key scan.

## All 43 region dispositions

- `$3320–$3362` **correct**: $3320-$3334 writes NMI vector $0318/$0319=$02BE and RTI at $02BE; CIA DDR/port writes follow; GOSUB51C6 at 3360.
- `$3363–$33CE` **correct**: V6=$D000,V16=$C7F8; clear enable/multicolor/expand flags, sprite pointer 63, cursor 160,133; CHROUT clear; SYS7012 and GOSUB47E4. Video pointers here are scalar address variables, not a D018 write.
- `$33CF–$3482` **correct**: Four boundary probes admit 0/99 and reject-1/100. Writes selected screen to FB then SYS7003. Exhaustive 256-status test: only FB=64 takes 341C SYS700C; all other values offer new screen. y→50B8, n→error/retry.
- `$3483–$34D1` **correct**: Three strings V26,V17,V19 begin row 22; enables sprite 0; captures $C352 in V13; waits $C5=64; then shows main menu.
- `$34D2–$35EB` **correct**: RETURN scan 1 toggles V3 help; scan 6 directly enters terrain 49A6. DATA lookup compares both key scan and entire modifier byte. ON index 0 fallthrough is wizard;1..10 map listed commands.
- `$35EC–$36B7` **correct**: SYS704B then sprite pointer 128/color 4; header $C31E/F supplies X/Y, $C352 bit 7 supplies X-high. Cursor 463A. Stores low X,Y,bit 7 when X>255 andbit 6 when X>=244; preserves other bits.
- `$36B8–$37C0` **correct**: GET single string character then VAL permits 0..5 (nonnumeric input VAL0 also selects 0). Loads type C370+slot,shape C360,span C368,color C310,X C300,Y C306. Types 1/6 force X/Y0; type 0 preview 228.
- `$37C1–$3905` **correct**: F-key scan 3..6 dispatches span/type/color/image. Joystick helper returns at FIRE; type 1/6 force zero coordinates twice before storing. Slot X-high bit rewritten; automatic spawn coordinates claim supported.
- `$3906–$3A1F` **correct**: Bounds 0..20 probed; updates type immediately before confirmation. RETURN retains other parameters; SPACE copies defaults arrays $2DE1/$2E4A/$2EB3 to span/image+128/color and re-enters slot selection.
- `$3A20–$3A65` **correct**: Bounds 0..15 probed; stores $C310+slot and VIC $D027.
- `$3A66–$3AAF` **correct**: Bounds 0..127 probed; adds 128, stores sprite pointer $C7F8 and header $C360+slot. Resident sprite bank is $C000; data lies $E000 onward.
- `$3AB0–$3B01` **correct**: Bounds 0..4 probed; exact 1 converted to 0 at 3AEA; stores span $C368+slot.
- `$3B02–$3BDF` **correct**: Slot 0..5 then requires type 7, otherwise main menu. X/Y nibbles 0..15 bounds probed; packs 16*x+y to $C316+slot; duration 0..255 toshared $C35F.
- `$3BE0–$3C88` **correct**: Spell 0..11/charges 0..9 bounds probed; charges 48+n at C31D. Spell 11 (none) skips defaults;0..10 use eleven triples to C351,C366(pointer OR128),C36E.
- `$3C89–$3EFA` **correct**: Joystick 8/8 cursor; p=C400+INT(column)+40*INT(row). Treasure index 0..15. Six INPUT values each 0..255→C380+8*i..+5. Count→C320+i, stride→C330+i, color 0..15 setsbit 7 at C340+i;16 writes 0. Destination low/high stored+6/+7. Counter/stride/color boundaries probed.
- `$3EFB–$40E5` **correct**: Three runs 0..2; high/low pointer→C356/C353+slot, stride 0..255→C359+slot; active 0..7 andnormal 0..15 pack 16*active+normal→C35C+slot. Zero admissibility original-runtime probes pass despite prompts 1..7/1..15.
- `$40E6–$4134` **correct**: Requires GET string PETSCII19 (CTRL-Y); other nonempty key returns menu. CLR and restart 3363 reinitialize scalar/array state before 33CF screen prompt.
- `$4135–$42A5` **correct**: If C376=0, three-byte loop writes 60 to C376..C378; nonzero first byte preserves all three. Bounds 0..99. SYS7066 invokes resident title input 8FC4; SYS700F quiets vectors. Writes C350=77,C36F=3 then 45EF. FB=64→SAVE FAILED;1→WRONG DISK; all 254 other statuses quietly return menu. Exhaustive original-runtime status routing probe; disk causation owned by parent.
- `$42A6–$4303` **correct**: GET y invokes SYS6400 then END; every other nonempty key returns menu. Resident 6400 entry begins animated title; no inferred disk reload.
- `$4304–$43F5` **correct**: y sets bounds C370..C375 inclusive then zeros via 4353..436B. Following 438B path validates each endpoint C300..C3FF; no decoded branch enters 438B, and it does not enforce start<=end. Full range C300/C3FF jumps 5156. This dormant entry is not a mapped menu command.
- `$43F6–$45EE` **correct**: Maps F7/F1/F3/F5 scans 3..6 to C30C brick,C30D ladder,C30E rope,C30F portal. Accepts chars 33..40 or 49..56; converts both groups 0..7 plus 8 if SGN(modifier)>0. Any nonzero modifier selects upper 8; wording shift describes intended use. SYS7072 redraws after changes.
- `$45EF–$4639` **correct**: All six C316..C31B overwritten 31 regardless of type, C35F=144; only type 7 actor Y gets 197. Synthetic mixed type vector[0,1,7,7,20,255] confirms only slots 2/3Y change.
- `$463A–$4737` **incorrect detail**: Entry $463A sets horizontal step V22=4, while $469E sets vertical step V23=1. With V22=8, both axes move by eight pixels and the repeat counter becomes eight. X wraps from 8 through 328. Y wraps from 50 through 197 normally, or through 210 when sprite pointer 63 is selected. FIRE returns; eight-pixel mode returns after each pass. Ten original-runtime cursor cases confirm both axes and wrapping.
- `$4738–$4756` **correct**: SYS704B→resident 8E6E clears status area; string homes cursor then 22 downs to row 22. No terrain memory clear in this script helper.
- `$4757–$47E3` **correct**: Printed load/save/exit and erase-monsters keys match command DATA; holds until C5=64.
- `$47E4–$48B5` **correct**: Counts 22 nonnegative command words followed by the -1 sentinel, giving V30=10. After RESTORE it loads 11 key/modifier pairs, 21 names, three sets of 20 monster defaults (indices 1..20), 11 spell triples, 16 color names, 24 terrain names, 24 glyph/color pairs, and six preview strings. The empty DATA record at $2DA1 is not read. Original-runtime initialization from cleared arrays reproduces all 230 destination values/strings.
- `$48B6–$49A5` **incorrect detail**: The minus-sign claim is false. An exhaustive original-runtime probe of all 256 character values accepts only comma (44) and digits (48..57); RETURN (13) and DELETE (20) are special cases before this predicate. The length test uses >16, allowing 17 characters. At most one comma is admitted. Empty input returns V0=V5=0. Full GET/VAL execution confirms -1 becomes 1, -1,-2 becomes 1,2, and 1.2 becomes 12 because signs and the decimal point are ignored.
- `$49A6–$4AA6` **correct**: Reloads DATA via 47FC; negative selectors resolve PEEK(C30B-selector), mapping-1..-4 to C30C..F. Counts pointers iff both V15,V18 are zero; excludes pair 0000 and 03F7; indices C00A(+16 high),C0E0(+16 high). Clamps negative counts to zero afterward.
- `$4AA7–$4B63` **correct**: Object name array 31BE and colors 3281; simple glyph previews handle screen-code encoding; six compound preview strings 32F9 for objects 18..23. Prints F1/F2,CLR,CTRL-Xcontrols.
- `$4B64–$4BB0` **correct**: Port 2 FIRE branch precedes keyboard. DELETEscan 0;F1 scan 4;CLRscan 51 requires modifier exactly 1;CTRL-Xscan 23 requires exactly 4. Key limits/callers traced.
- `$4BB1–$4BD5` **correct**: No modifier yields +1 (B-true with true=-1); positive modifier yields-1. Values<0 wrap 23,>23 wrap 0. Selection remains 0..23.
- `$4BD6–$4C46` **correct**: Polls no-key 64/held CLR51 then accepts Yscan 25; writes 32 to C400..C747 inclusive 840 cells; SYS7072; V15=-1 invokes 510D pointer-only initialization, then V15=0, V18=0.
- `$4C47–$4C53` **correct**: Border 0 then GOTO34AB loads C352 flags and waits key release before main menu.
- `$4C54–$4CEE` **correct**: Cursor transform col=floor((X-24)/8),row=floor((Y-50)/8); rejects col<1/>38,row<1. Allows blank 32,eraser 11,or brick-rope 8 over glyph 92. Object 2..5 or 10 calls count gate;18..23 compound. Cursor wrap independently limits row 20.
- `$4CEF–$4D7F` **incorrect detail**: The portal space check is incomplete. Object 19 requires row>=2 and column 2..37, but its FOR has limit -41, initial -39, and default STEP +1, so its body checks only p-39. The cells at p-41 and p-40 are unchecked. Full original placement from $4C54 to $4B64 proves an existing glyph 91 is overwritten with 104 or 105 there. Occupied p-39, center, or either bottom neighbor rejects placement. All-blank placement is the positive control. The other compound-object neighbor checks agree with their footprints.
- `$4D80–$4EB7` **correct**: Original-runtime writes: ladder glyphs 101,102,103 at offsets -1,0,+1; portal 104,105,106 at -41,-40,-39 and 107 at -1,+1, leaving the center blank; steep slopes 94,92 at 0,+1 or 92,93 at -1,0; shallow slopes 97,98,92 or 92,95,96 at -1,0,+1. Every corresponding color write uses the same offset.
- `$4EB8–$4EF2` **correct**: DELETE duplicates placement coordinate guard col 1..38,row>=1, derives p and glyph, falls into 4EF3. Does not clear outside side/top border.
- `$4EF3–$5087` **correct**: The first search covers simple palette entries 0..17. Shared glyph 92 is treated as a plain brick and erases only one cell, even when it forms part of a slope. Distinct slope or ladder glyphs clear two or three cells. Portal glyphs 104..107 clear a three-by-two rectangle including its blank center. Twenty-six glyph cases confirm footprints and treasure/fire counter changes for glyphs 28..31 and 114. An unknown glyph clears one cell. The description does not promise complete slope removal from its shared brick glyph.
- `$5088–$50B7` **correct**: Exactequal 16 gate only. Treasuretypes 2..5 count V15,firetype 10 count V18. Other valuesincluding 17 would pass if state is corrupt; legal counts initialized 0 andincremented one. Description accuratelysays equals 16.
- `$50B8–$510C` **correct**: Clears C300..C3FF256 bytes. CHROUT clears display; row 21C748..C76F40 glyph 92/color 13 bottom border. Resets V15/V18 andfalls 510D.
- `$510D–$51C5` **correct**: Initializes sixteen low/high treasure and fire pointer pairs to $03F7. The redundant nested FOR using the same V1 replaces its older frame in the native interpreter. If V15<0, it returns at $5155 after pointer initialization; otherwise it sets no spell (11), zero charges, wizard coordinates (160,197), palette (13,8,7,14), timer 66, and exempt color 3, then goes to $3483.
- `$51C6–$5307` **incorrect detail**: The timeout is off by one in the description. V11 starts at zero; each pass increments it before testing 7500<V11, so timeout occurs on pass 7501. Original-runtime controls show 7499 becomes 7500 and continues, while 7500 becomes 7501 and exits. FIRE also exits when port-two bit 4 is clear. SYS $6406 runs before the text and every sixth pass; SYS $705D delays with FB=4. The credits and port-two instructions match the bytes.
- `$5308–$530C` **correct**: Resets V11=0,RETURN530A to GOSUB3360; END530B and 530C retained compiled terminators.

## DATA and structure

All 232 packed DATA records match the source exactly, including the trailing empty record at $2DA1. The header carries textual length in its low six bits, an appended byte flag in bit 6, and an appended signed word flag in bit 7. Exact bytes, values, and grouping remain in JSON. $2DA2–$330B is filled with $81 in the PRG; clarify the header to "array storage, cleared at startup".

32 eight-byte scalar records occupy $2800-$28FF. Four seven-byte extended records begin at $2900, $2907, $290E, and $2915, ending at $291B. The original $96 reset sentinels become zero values with type 1; forced integer/string types are preserved by $2281.

## Reproduction

`node games/c64/wizard/validation/audit_editor_script.js [private-work-directory] [private-ROM-directory]` runs the original code in the kit CPU. Private inputs are `bldr.prg`, `editor-menu.vsf`, and the local BASIC/KERNAL ROMs. Each case restores the original shared interpreter bytes from the PRG; the full script is checked against the snapshot. The validator prints a summary and writes no files. These reports preserve the baseline sample and region verdicts; the validator does not regenerate or alter them. Probe JSON preserves all 256 character predicates, eight full numeric-input cases, 230 initialized DATA destinations, seven portal checks plus seven full placements, six compound shapes, 26 erasure glyphs, ten cursor cases, 76 numeric boundaries, all 256 load/save status values, five callback controls, and title/save-reset controls.

Live replay preparations are saved in JSON under `live_replay_preparations`. No live emulator was mutated by this reviewer.

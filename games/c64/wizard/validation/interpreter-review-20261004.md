# Shared interpreter source review — 4 October 2026

Agent source review, not maintainer certification. Baseline `db7640a` on `game/c64/wizard-audit-followup`. Scope: native `$0801–$27FF`.

The fixed sample has **19 supported comments and 1 incorrect comment** (5%; Wilson 95% interval 0.89–23.61%). This estimate applies only to the 244 eligible interpreter line comments. Six finding groups require corrections or clarification.

The routine inventory contains **220 named entry claims**: 213 executable entries and seven operand aliases assigned the routine kind by the listing index. The extra executable entry is `$19DE`, absent from that index. All entry claims were inspected structurally; partial rows retain explicit semantic limits.

## Original-byte integrity

- GAME PRG and `entry.vsf` RAM match exactly throughout `$0801–$27FF`.
- GAME and BLDR match exactly over `$0826–$27F1` (8140 bytes). Their BASIC suffix/header differences are recorded in JSON.
- Snapshot DDR `$2F`, port `$37`: the probes use actual local BASIC and KERNAL ROMs, never RAM beneath those ROMs.
- Input SHA-256 hashes, snapshot registers, baseline comment text and all probe results are in the JSON ledger.

## Findings

### I01 — `$133F`

ON accepts a byte then doubles modulo256; indices 128..255 can alias table entries rather than all falling through.

Evidence: $133F calls byte validation $17BB. $1348 ASL A discards bit7, $1349 stores low byte to $2F; $134D compares length with this wrapped offset. All 256 byte indices were probed with an original two-entry table: 128 reads header/selector as target,129 aliases1,130 aliases2.

Replacement: Primary is a byte branch index. Zero skips the table; otherwise double the index modulo 256 and compare that offset with the table byte length. Offsets at/above length skip; smaller offsets select GOTO/GOSUB destinations, so indices 128–255 alias wrapped offsets. GOSUB pushes the post-table continuation.

Callers: Opcode $E2 dispatch vector $08EA -> $133F. GAME independent script review: $2B59 uses SGN(event),0..1; $3077 uses event&63,0..63. BLDR independent script review: $35D2 index 0..10;$38FB index 1..4;$4CF3/$4D84 index 0..5.

Known GAME and BLDR producers stay below128; no reachable player defect established.

### I02 — `$1EC2`

The claim that zero positions raise quantity error omits earlier empty-result exits.

Evidence: $1EC2 LDY $60 / BEQ $1EB6 returns empty before any position validation when requested length is0. $1EDA-$1EDD returns empty for an empty source before $1EEA-$1EEC tests zero position; a nonzero high position byte is rejected earlier. Prepared position 0,length 0 returns empty through original opcode$AA.

Replacement: Use length saved in $60 and a one-based secondary position to copy a substring of primary. Requested length zero returns empty before position checks. Otherwise a nonzero position high byte is invalid; an empty source returns empty before the zero-position check, and positions beyond the string return empty.

Callers: Opcode $AA -> $1EC2; $E0 enters shared path at$1EC9 with length 1.

Boundary semantics only; caller reachability of zero length with invalid position was not asserted.

### I03 — `$0AE8`

Generic literal-slot comment incorrectly promises a return to bytecode dispatch for BASIC-transfer slot8.

Evidence: Original$0AE8 is JMP$0BAE. $0BAE reads two inline cursor bytes and JMP$A8E3, with no return to$0926/$092C in that native path.

Replacement: Literal/control dispatch slot 8: JMP $0BAE. Read an inline little-endian address into $39/$3A and transfer to BASIC statement processing at $A8E3.

Callers: Literal opcode$58 sets patched branch displacement$18 at$0ACE to reach$0AE8.

### I04 — `$081C`, `$081D`, `$0824`, `$0825`

Final header word is program end plus one; actual allocation floor is a page above it.

Evidence: $2252 loads header low to$31; $2257 loads header high; $225A INX; $225B STX$32. Original startup probe: GAME header$4A89 -> floor$4B89; BLDR header$530D -> floor$540D. $1F4F-$1F57 FRE subtracts$31/$32 from heap top.

Replacement: At $081C/$081D replace “heap start $4A89” with “program-end pointer $4A89; startup adds $0100 to obtain allocation floor $4B89”. At $0824/$0825 call header word4 the program-end pointer / heap-floor basis. At $2245 clarify that $31/$32 is header word4 plus $0100.

Callers: Startup $2245, specifically$2252-$225B; FRE$1F4B uses resulting floor.

### I05 — `$19DE`

Optional keyboard-checked opcode fetch is executable but its18bytes are Undefined in baseline blocks.

Evidence: $19BE copies JMP$19DE template$19F0 onto$0926. Original enable/fetch/disable probe reaches$19DE, increments cursor$50FF->$5100 and dispatches at$092C; disable restores E6 39 D0. Eight original instruction starts:$19DE,$19E0,$19E2,$19E4,$19E6,$19E8,$19EA,$19ED.

Replacement: Classify $19DE-$19EF as Code; retain $19F0-$19F5 as two three-byte patch templates/data. The existing checked_bytecode_fetch comment is substantively accurate.

Callers: Extended opcode$80,$11 -> $19BE -> writes JMP$19DE into$0926.

### I06 — `$0826`, `$0827`

Table comments call all lower opcodes variable access; $40-$5F are literal/control paths.

Evidence: $093D-$0941 directs $40-$5F to$0AC5; its patched branch chooses integer,float,string,byte literals or BASIC transfer.

Replacement: Replace the final sentence with: Lower opcodes use direct scalar load/store or inline literal/control paths instead of this table.

Callers: $0926/$092C dispatcher; main dispatcher comment already identifies all four lower groups accurately.

## Reproducible sample

Saved before verdicts. Seed `202610041`; Python `random.Random(seed).sample` over eligible line comments sorted by `(integer address, text)`; at least six whitespace-separated words; 20 of 244 selected. Selection order and baseline texts were retained.

### 1. `$2372` op_save_local_variable — supported

Baseline: Read scalar pointer, push its typed old value plus pointer/tag, verify stack headroom and assign primary through the generic scalar store.

Evidence: $2372-$2386 reads LE scalar pointer and consumes2bytes. $2388-$23AE pushes old integer/string/float according to record + 6; $23AF-$23BB pushes pointer/tag and checks headroom; $23BD jumps generic assignment. Original save/restore probes pass for old floating,int and forced-int scalar values. String ownership in local frames was inspected but not dynamically exercised.

### 2. `$2342` op_new_basic — supported

Baseline: Invoke ROM NEW/cleanup and return to BASIC ready processing.

Evidence: Raw JSR$A644 then JMP$A474. Local BASIC ROM$A644 zeroes the BASIC link, updates pointers and falls into cleanup$A660. Original BASIC NEW/cleanup ran to$A474; KERNAL CLALL$FFE7 was hooked because hardware IEC I/O is outside this CPU harness.

### 3. `$133F` op_on_branch — incorrect

Baseline: Primary is a one-based branch index. Read table byte length and GOTO/GOSUB selector, select an inline destination or skip the table if zero/outside its entries; GOSUB also pushes the post-table continuation.

Evidence: $133F calls byte validation $17BB. $1348 ASL A discards bit7, $1349 stores low byte to $2F; $134D compares length with this wrapped offset. All 256 byte indices were probed with an original two-entry table: 128 reads header/selector as target,129 aliases1,130 aliases2.

### 4. `$081F` compiled_header_1_high — supported

Baseline: High byte of compiled header word 1 (array-clear start). Five consecutive little-endian pointers at $081C-$0825 configure startup and the interpreter.

Evidence: Original GAME header$081E/$081F is $291D. $22E9/$22EF reads this pair into the self-modified array-clear start operand. Header consists of five successive LE words.

### 5. `$1202` op_numeric_equal — supported

Baseline: Compare numeric operands and return signed integer -1 on equality, zero otherwise.

Evidence: JSR$1248; AND#4 selects equality; $1236 writes $FFFF and $123F writes$0000. 726 signed-boundary comparison cases cover all 6 numeric relations on 11 values including ±32768/32767 limits. Sample equality cases agree. Float normalization path inspected, not exhaustively exercised.

### 6. `$1420` op_secondary_one — supported

Baseline: Produce typed integer one in secondary.

Evidence: $1420 LDX#0/STX$6C; INX/STX$6D/STX$B6 -> high0,low1,type1. Original opcode$97 probe agrees.

### 7. `$1D1F` op_string_not_equal — supported

Baseline: Use either unequal string relation bit to produce -1/0 integer truth.

Evidence: $1D1F JSR$1CE1; AND#3 accepts either unequal relation; $1D3F/$1D4C return typed$FFFF/$0000. 216 cases cover all 6 string relations over empty/prefix/differing strings; inequality passes.

### 8. `$1EC9` op_mid_one_character — supported

Baseline: Set substring length one then share MID clipping and copying.

Evidence: $1EC9 LDY#1 enters shared substring clip/copy path at$1ECB. Original E0 probes on ABCDE at positions 1, 3, 5, 6 return A,C,E,empty.

### 9. `$260A` extended_string_clock — supported

Baseline: Read system clock, convert it to six decimal digits via ROM and allocate a managed string; select primary or secondary by extended operation index.

Evidence: $2613 calls ROM$AF84 clock read; $261F length6; $2625 ROM$BE68 converts digits; $262A copies managed string. X=$10 selects primary, other clock-string entry selects secondary via$1A28. 8 actual BASIC/KERNAL ROM probes test0,60,3600,219660jiffies for extended8and13: expected six-digit hhmmss in correct accumulator.

### 10. `$167F` op_read_string — supported

Baseline: Expose the next packed DATA item as a string descriptor, using low six length bits and representation flags to advance the DATA cursor correctly.

Evidence: $1683-$1689 descriptor points after DATA header; $1698 masks length$3F; flags alter Y by 0, 1 or 2 tail bytes before $1663 adds header+length. Three original DATA string probes cover text-only,byte-tail,andword-tail records across a page boundary.

### 11. `$1886` op_stop_at — supported

Baseline: Read inline source/cursor address, preserve it in the bytecode cursor and return through BASIC STOP processing.

Evidence: $1886 JSR$21A6 consumes inline LE pointer; copies$2F/$30 to$39/$3A; JSR$A660 then SEC/JMP$A84B. Probe preserves cursor$1234 and carry1 at$A84B. Cleanup was hooked in this prepared STOP test; UI STOP output was not tested.

### 12. `$0999` load_short_secondary — supported

Baseline: Load short scalar record selected by Y into secondary accumulator $69-$6E, interpreting its type byte at record+6.

Evidence: $0999 reads record + 6, masks$FB and stores$B6; zero reads sixfloatfields; nonzero reads high/low$6C/$6D and negative also pointerhigh$6E. Original opcode 1 probes types 0, 1, 5, $FF verify values and masked type.

### 13. `$2281` initialize_compiled_variables — supported

Baseline: Clear scalar records starting $2800 while preserving forced-integer/string declarations; use eight-byte stride in page $28 and seven thereafter. Clear the array interval from header and apply five-byte initializer records until type $64 terminator.

Evidence: $22A1 clears sixvaluebytes; flags5and>$96 preserved while$96andothers become1. ADC#7 uses carry from comparing page$28, yielding stride8inpage$28 then7. Array loop clears [header1,header2), then copies3bytes per five-byte initializer until byte2=$64. Both original PRGs initialization probes verify all 36 scalar records and type declarations. Array loop/initializer controls inspected; array bytes not exhaustively asserted by this probe.

### 14. `$1D16` op_string_equal — supported

Baseline: Compare the string descriptors and return BASIC boolean -1 on equality, zero otherwise.

Evidence: JSR$1CE1 and mask4 select equality; shared return sets$B5=1 and high/low$FFFFor$0000. String matrix above passes.

### 15. `$2054` op_load_secondary_integer_address — supported

Baseline: Consume inline pointer and load a two-byte integer into secondary.

Evidence: $2054 calls$21A6 LE inlinepointer reader, sets$B6=1, reads addressed integer high then low into$6C/$6D. Probe pointer operand crosses page and loads$FEDC=-292.

### 16. `$1717` integer_sign — supported

Baseline: Return Y=-1,0,+1 from the signed primary integer.

Evidence: LDY#0; negative highbyte decrements to$FF; positive/nonzero executes twoINY thenDEY to 1; bothbyteszero leaves0. All65,536 signed 16-bit values passed the original-instruction sign probe.

### 17. `$1D28` op_string_less — supported

Baseline: Choose relation mask 2 and compare primary string lexically less than secondary.

Evidence: LDA#2 selects primary-less relation; shared$1D36 calls lexical compare$1CE1 then tests mask. String matrix confirms direction and prefix/empty cases.

### 18. `$0BD2` format_integer_decimal — supported

Baseline: Write a signed 16-bit primary integer as decimal into page-one scratch, using decimal_place_values. Suppress leading zeroes, include sign/leading space, terminate with zero and restore the self-modified destination operand.

Evidence: Highbyte sign selects minus orspace; negative calls two-complement helper$154C. Place-value subtraction uses$223A/$223B and suppresses leadingzeros; $0C35 appendsNUL and $0C3A restores outputoperand 1. 17 boundary/decimal-transition values from -32768 to 32767 formatted correctly and restoredoperand.

### 19. `$0B54` literal_secondary_byte — supported

Baseline: Load an unsigned byte into secondary integer, clearing its high byte and advancing one operand byte.

Evidence: $0B54 STY$6C receives dispatcherY=0; INY sets$B6=1; inlinebyte goes$6D; cursor increments once then standardfetch. Four byte values 0, 127, 128, 255 pass with page-crossing operand.

### 20. `$1408` op_secondary_zero — supported

Baseline: Produce typed integer zero in secondary.

Evidence: $1408 LDX#0, stores$6D/$6C; INX stores$B6=1. Original opcode$AB probe confirms typed zero.

## Original-instruction probes

The private directory must contain `entry.vsf`, `game.prg`, and `bldr.prg`; the ROM directory must contain `basic-901226-01.bin` and `kernal-901227-03.bin`. Omitting arguments uses `games/c64/wizard/work` and `tools/vice-mcp/share/vice/C64`, matching `compiled_harness.js`. The portable script depends only on the public `kit/c64/cpu6502.js`, writes no files, and leaves this frozen review unchanged.

22 probe groups, 66,810 prepared cases. Reproduce locally with `node games/c64/wizard/validation/audit_interpreter.js <private-directory> <ROM-directory>`.

- ON byte-index wrap: 256 cases; pass.
- Signed integer comparisons: 726 cases; pass.
- String relations and BASIC booleans: 216 cases; pass.
- Integer sign complete domain: 65,536 cases; pass.
- Signed decimal formatting: 17 cases; pass.
- Secondary constants and byte operand width: 6 cases; pass.
- Typed short secondary load: 4 cases; pass.
- Inline secondary integer pointer: 1 cases; pass.
- Packed DATA string descriptors and binary tails: 3 cases; pass.
- MID character selection and zero-length bypass: 5 cases; pass.
- Local scalar save assignment restore: 3 cases; pass.
- Compiled scalar initialization: 2 cases; pass.
- Clock string via original BASIC and KERNAL ROM: 8 cases; pass.
- STOP inline pointer and BASIC stop transfer: 1 cases; pass.
- NEW ROM cleanup to READY boundary: 1 cases; pass.
- FOR integer frames and signed NEXT: 4 cases; pass.
- GOSUB RETURN little-endian target and page carry: 1 cases; pass.
- Array element address widths: 12 cases; pass.
- Two dimensional array linearization: 3 cases; pass.
- Header program end and actual allocation floor: 2 cases; pass.
- Optional STOP-fetch code and restoration: 2 cases; pass.
- Managed string ownership and heap compaction: 1 cases; pass.

## Coverage and limits

- Agent source review, never maintainer certification.
- Native interpreter only: $0801-$27FF. Compiled GAME/BLDR application semantics and disk I/O are handled by separate reviewers/parent.
- 244 line-comment baselines inventoried; routine inventory includes 219 baseline index entries (7 are operand aliases) plus missing executable$19DE. All were structurally inspected; partial_static rows identify details not fully independently verified.
- No work/bytecode.py, lift_bytecode.py or decoder output was imported by native probes. opcodes.py supplies only the 6502 instruction decoder; listing blocks help separate code/data, and the discovered missing block was decoded separately.
- Prepared-state CPU probes use original native instructions and local BASIC/KERNAL ROMs under bank$37; they are not live VICE observations or proof that a player can reach prepared states.
- Real hardware I/O absent from CPU probe. NEW hooks CLALL$FFE7; STOP hooks cleanup$A660. The first unhooked NEW attempt stopped on CIA2 read$DD00, and was not called a pass.
- FOR fractional steps, nested named NEXT, floating promotion, malformed INPUT, USR/SYS bank changes, garbage-collector tagged stack combinations and transcendental ROM identities retain the specific limits stated in the inventory.
- The heap-compaction test initially omitted the helper zero-flag precondition matching Y length; corrected harness sets that flag as real LDY callers do. It then passed.
- The baseline reviewer did not edit canonical source, emulator state, commits or pushes. These reports and the portable probe script are validation artifacts; findings describe baseline db7640a, before separately applied corrections.

## Named entry inventory

`supported_static` means the original implementation supports the entry description on the inspected path; it is not exhaustive certification. `partial_static` retains an unverified detail. Direct native callers and bytecode handler opcodes are in JSON.

| Address | Entry | Review | Limit/finding |
|---|---|---|---|
| `$0819` | `game_entry` | supported_static |  |
| `$0926` | `bytecode_next` | supported_static |  |
| `$0955` | `load_short_primary` | supported_static |  |
| `$0999` | `load_short_secondary` | supported_with_probe |  |
| `$09D7` | `store_short_variable` | supported_static |  |
| `$0AC5` | `dispatch_inline_literal` | supported_static |  |
| `$0ACF` | `literal_dispatch_branch_operand` | supported_static | operand alias |
| `$0AD0` | `literal_jump_0ad0` | supported_static |  |
| `$0AD3` | `literal_jump_0ad3` | supported_static |  |
| `$0AD6` | `literal_jump_0ad6` | supported_static |  |
| `$0AD9` | `literal_jump_0ad9` | supported_static |  |
| `$0ADC` | `literal_jump_0adc` | supported_static |  |
| `$0ADF` | `literal_jump_0adf` | supported_static |  |
| `$0AE2` | `literal_jump_0ae2` | supported_static |  |
| `$0AE5` | `literal_jump_0ae5` | supported_static |  |
| `$0AE8` | `literal_jump_0ae8` | correction_required | I03 |
| `$0AEB` | `literal_primary_integer` | supported_static |  |
| `$0B04` | `literal_secondary_integer` | supported_static |  |
| `$0B1D` | `literal_primary_float` | supported_static |  |
| `$0B33` | `literal_secondary_float` | supported_static |  |
| `$0B42` | `literal_primary_byte` | supported_static |  |
| `$0B54` | `literal_secondary_byte` | supported_with_probe |  |
| `$0B66` | `literal_primary_string` | supported_static |  |
| `$0B8A` | `literal_secondary_string` | supported_static |  |
| `$0BAE` | `literal_basic_transfer` | supported_static |  |
| `$0BBC` | `op_print_number` | supported_static |  |
| `$0BD2` | `format_integer_decimal` | supported_with_probe |  |
| `$0C21` | `decimal_output_pointer_operand` | supported_static | operand alias |
| `$0C40` | `op_print_newline` | supported_static |  |
| `$0C46` | `op_print_spaces` | supported_static |  |
| `$0C57` | `op_print_tab` | supported_static |  |
| `$0C6D` | `op_print_string` | supported_static |  |
| `$0C7D` | `op_print_comma` | supported_static |  |
| `$0C8A` | `print_page_one_string` | supported_static |  |
| `$0C9B` | `op_for_explicit_step` | supported_with_probe |  |
| `$0D28` | `pop_float_preserving_return` | supported_static |  |
| `$0D40` | `push_float_preserving_return` | supported_static |  |
| `$0D5A` | `op_for_default_step` | supported_with_probe |  |
| `$0D97` | `op_for_assign` | supported_with_probe |  |
| `$0EB2` | `float_is_exact_integer` | supported_static |  |
| `$0EDE` | `float_integer_test_return` | supported_static |  |
| `$0EE7` | `op_next_loop` | supported_with_probe |  |
| `$0FCB` | `next_float_loop` | partial_static | Floating NEXT flow inspected; no fractional-step loop matrix. |
| `$1028` | `next_promoted_integer_loop` | partial_static | Integer-to-float FOR promotion flow inspected; no overflowed-loop execution probe. |
| `$1089` | `store_float_loop_variable` | supported_static |  |
| `$1098` | `op_next_named_variable` | partial_static | Big-endian pointer and frame skipping inspected; nested named-NEXT execution not tested. |
| `$10DB` | `secondary_int_to_float` | supported_static |  |
| `$10DF` | `secondary_ay_to_float` | supported_static |  |
| `$114B` | `secondary_float_to_integer` | partial_static | Bounds and ROM shift/sign conversion inspected; full float domain not tested. |
| `$11A5` | `op_bitwise_and` | supported_static |  |
| `$11BD` | `op_bitwise_or` | supported_static |  |
| `$11D5` | `coerce_two_integers` | supported_static |  |
| `$11EA` | `op_bitwise_not` | supported_static |  |
| `$1202` | `op_numeric_equal` | supported_with_probe |  |
| `$120B` | `op_numeric_not_equal` | supported_static |  |
| `$1214` | `op_numeric_less` | supported_static |  |
| `$121D` | `op_numeric_greater` | supported_static |  |
| `$1226` | `op_numeric_less_equal` | supported_static |  |
| `$122F` | `op_numeric_greater_equal` | supported_static |  |
| `$1248` | `compare_numeric_values` | supported_static |  |
| `$1281` | `compare_float_values` | supported_static |  |
| `$1293` | `reverse_numeric_relation` | supported_static |  |
| `$12CA` | `op_conditional_skip` | supported_static |  |
| `$12ED` | `op_jump` | supported_static |  |
| `$12FC` | `op_gosub` | supported_with_probe |  |
| `$1315` | `op_return` | supported_with_probe |  |
| `$133F` | `op_on_branch` | correction_required | I01 |
| `$1395` | `op_push_primary` | supported_static |  |
| `$13C0` | `op_pop_primary` | supported_static |  |
| `$13DE` | `op_pop_secondary` | supported_static |  |
| `$13FC` | `op_primary_zero` | supported_static |  |
| `$1408` | `op_secondary_zero` | supported_with_probe |  |
| `$1414` | `op_primary_one` | supported_static |  |
| `$1420` | `op_secondary_one` | supported_with_probe |  |
| `$142C` | `op_begin_input` | supported_static |  |
| `$1438` | `retry_numeric_input` | supported_static |  |
| `$144B` | `op_input_number` | partial_static | Decimal parser and ROM fallbacks inspected; malformed/quoted/file input matrix not run. |
| `$1542` | `primary_integer_zero` | supported_static |  |
| `$154C` | `negate_primary_integer` | supported_static |  |
| `$155F` | `advance_bytecode_cursor` | supported_static |  |
| `$1566` | `check_input_stop` | supported_static |  |
| `$1570` | `scan_input_field_end` | supported_static |  |
| `$158A` | `retry_string_input` | supported_static |  |
| `$15AA` | `op_input_string` | partial_static | Quoted-string field scanner and fused-store flow inspected; live input variants not run. |
| `$161A` | `op_read_number` | supported_static |  |
| `$1663` | `advance_data_pointer` | supported_static |  |
| `$166D` | `point_after_data_header` | supported_static |  |
| `$167F` | `op_read_string` | supported_with_probe |  |
| `$16AC` | `op_restore_data` | supported_static |  |
| `$16B9` | `primary_to_float` | supported_static |  |
| `$16C7` | `op_cursor_position` | supported_static |  |
| `$16D1` | `op_integer_part` | supported_static |  |
| `$16E8` | `op_sign` | supported_static |  |
| `$1703` | `op_absolute_value` | supported_static |  |
| `$1717` | `integer_sign` | supported_with_probe |  |
| `$1725` | `op_random` | partial_static | ROM call and integer-sign plumbing inspected; RNG algorithm/seed behavior not independently derived. |
| `$1739` | `op_square_root` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$1742` | `op_exponential` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$174B` | `op_cosine` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$1754` | `op_sine` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$175D` | `op_logarithm` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$1766` | `op_tangent` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$176F` | `op_arctangent` | partial_static | Native conversion and ROM destination checked; transcendental ROM identity not independently rederived. |
| `$1778` | `op_machine_call` | supported_static |  |
| `$1793` | `op_usr` | supported_static |  |
| `$179E` | `op_poke` | supported_static |  |
| `$17BB` | `primary_to_byte` | supported_static |  |
| `$17CA` | `primary_to_address` | supported_static |  |
| `$17EF` | `op_peek` | supported_static |  |
| `$1818` | `op_get_number` | supported_static |  |
| `$1833` | `op_get_string` | supported_static |  |
| `$184C` | `op_wait_xor_mask` | supported_static |  |
| `$187F` | `op_wait_mask` | supported_static |  |
| `$1886` | `op_stop_at` | supported_with_probe |  |
| `$1898` | `op_open_defaults` | supported_static |  |
| `$189C` | `op_open_device` | supported_static |  |
| `$18A0` | `op_open_secondary` | supported_static |  |
| `$18AE` | `op_open_filename` | supported_static |  |
| `$18DE` | `op_close` | supported_static |  |
| `$18EB` | `op_output_channel` | supported_static |  |
| `$18F8` | `op_input_channel` | supported_static |  |
| `$1905` | `op_default_channels` | supported_static |  |
| `$190F` | `pop_value_preserving_return` | supported_static |  |
| `$192C` | `extended_load_default` | partial_static | LOAD setup and ROM destination inspected; actual disk I/O belongs to parent audit. |
| `$1936` | `extended_load_secondary_one` | partial_static | LOAD setup and ROM destination inspected; actual disk I/O belongs to parent audit. |
| `$193A` | `extended_load_secondary_zero` | partial_static | LOAD setup and ROM destination inspected; actual disk I/O belongs to parent audit. |
| `$1982` | `op_extended` | supported_static |  |
| `$19BE` | `enable_bytecode_stop_poll` | supported_with_probe |  |
| `$19CC` | `disable_bytecode_stop_poll` | supported_with_probe |  |
| `$19D2` | `restore_fast_dispatcher` | supported_static |  |
| `$19DE` | `checked_bytecode_fetch` | classification_correction_required |  |
| `$19F6` | `coerce_mixed_floats` | supported_static |  |
| `$19FA` | `primary_integer_to_float` | supported_static |  |
| `$1A08` | `swap_numeric_accumulators` | supported_static |  |
| `$1A28` | `swap_float_fields` | supported_static |  |
| `$1A4A` | `restore_overflow_operands` | supported_static |  |
| `$1A4D` | `restore_primary_overflow_operand` | supported_static |  |
| `$1A57` | `op_negate` | supported_static |  |
| `$1A79` | `op_add` | supported_static |  |
| `$1AB2` | `op_secondary_minus_primary` | supported_static |  |
| `$1AEF` | `op_primary_minus_secondary` | supported_static |  |
| `$1B2E` | `op_multiply` | supported_static |  |
| `$1BD3` | `op_primary_divided_secondary` | supported_static |  |
| `$1BDC` | `op_secondary_divided_primary` | supported_static |  |
| `$1C08` | `op_secondary_power_primary` | supported_static |  |
| `$1CA3` | `op_primary_power_secondary` | supported_static |  |
| `$1CAD` | `op_string_length` | supported_static |  |
| `$1CBB` | `op_string_to_number` | supported_static |  |
| `$1CE1` | `compare_strings` | supported_static |  |
| `$1D16` | `op_string_equal` | supported_with_probe |  |
| `$1D1F` | `op_string_not_equal` | supported_with_probe |  |
| `$1D28` | `op_string_less` | supported_with_probe |  |
| `$1D2C` | `op_string_greater` | supported_with_probe |  |
| `$1D30` | `op_string_less_equal` | supported_with_probe |  |
| `$1D34` | `op_string_greater_equal` | supported_with_probe |  |
| `$1D58` | `retry_string_allocation` | supported_static |  |
| `$1D64` | `copy_primary_string` | supported_static |  |
| `$1D6E` | `allocate_string_copy` | supported_with_probe |  |
| `$1DAE` | `op_concatenate_secondary_primary` | supported_static |  |
| `$1E17` | `op_concatenate_primary_secondary` | supported_static |  |
| `$1E2C` | `op_left_string` | supported_static |  |
| `$1E4B` | `op_right_string` | supported_static |  |
| `$1E71` | `op_number_to_string` | supported_static |  |
| `$1E9E` | `op_character_string` | supported_static |  |
| `$1EB6` | `return_empty_string` | supported_static |  |
| `$1EC2` | `op_mid_with_length` | correction_required | I02 |
| `$1EC9` | `op_mid_one_character` | supported_with_probe |  |
| `$1F02` | `op_set_substring_length` | supported_static |  |
| `$1F0C` | `op_mid_to_end` | supported_static |  |
| `$1F36` | `op_character_code` | supported_static |  |
| `$1F4B` | `op_free_string_memory` | supported_static |  |
| `$1F62` | `index_float_array` | supported_with_probe |  |
| `$1FC0` | `index_integer_array` | supported_with_probe |  |
| `$1FFB` | `index_string_array` | supported_with_probe |  |
| `$2042` | `op_load_integer_address` | supported_static |  |
| `$2048` | `op_load_numeric_address` | supported_static |  |
| `$204E` | `op_load_string_address` | supported_static |  |
| `$2054` | `op_load_secondary_integer_address` | supported_with_probe |  |
| `$2067` | `op_load_secondary_numeric_address` | supported_static |  |
| `$2092` | `op_load_secondary_string_address` | supported_static |  |
| `$20A8` | `op_store_integer_address` | supported_static |  |
| `$20BE` | `store_integer_destination` | supported_static |  |
| `$20D6` | `op_store_value_address` | supported_static |  |
| `$20EC` | `store_value_destination` | supported_static |  |
| `$2143` | `store_string_destination` | supported_with_probe |  |
| `$218D` | `op_select_array_base` | supported_static |  |
| `$21A6` | `read_inline_pointer` | supported_static |  |
| `$21BD` | `index_two_dimensional_array` | supported_with_probe |  |
| `$2245` | `compiled_program_start` | supported_with_probe |  |
| `$226C` | `op_clear_runtime` | supported_static |  |
| `$2281` | `initialize_compiled_variables` | supported_with_probe |  |
| `$22A2` | `scalar_clear_destination_operand` | supported_static | operand alias |
| `$22A3` | `scalar_clear_destination_high` | supported_static | operand alias |
| `$22F8` | `array_clear_operand_low` | supported_static | operand alias |
| `$22F9` | `array_clear_operand_high` | supported_static | operand alias |
| `$2342` | `op_new_basic` | supported_with_probe |  |
| `$2348` | `op_end_basic` | supported_static |  |
| `$234E` | `op_define_function` | supported_static |  |
| `$2372` | `op_save_local_variable` | supported_with_probe |  |
| `$23C3` | `op_restore_local_variable` | supported_with_probe |  |
| `$23ED` | `op_call_defined_function` | supported_static |  |
| `$2407` | `op_load_extended_primary` | supported_static |  |
| `$246F` | `op_load_extended_secondary` | supported_static |  |
| `$24D7` | `op_store_extended_scalar` | supported_static |  |
| `$24FE` | `store_generic_scalar` | supported_static |  |
| `$25B5` | `extended_primary_status` | supported_static |  |
| `$25C6` | `extended_secondary_status` | supported_static |  |
| `$25D7` | `extended_numeric_clock` | supported_static |  |
| `$260A` | `extended_string_clock` | supported_with_probe |  |
| `$2642` | `extended_set_clock_string` | supported_static |  |
| `$2659` | `extended_primary_pi` | supported_static |  |
| `$2668` | `extended_secondary_pi` | supported_static |  |
| `$2676` | `pi_table_prebase_operand` | supported_static | operand alias |
| `$267D` | `collect_string_garbage` | partial_static | Tagged-stack scan and repair flow inspected; heap compactor tested separately, but no collector matrix for temporary/function/FOR stack frames. |
| `$270D` | `compact_string_heap` | supported_with_probe |  |
| `$27C2` | `retreat_heap_record` | supported_static |  |
| `$27C7` | `retreat_heap_source` | supported_static |  |
| `$27C9` | `retreat_heap_source_by_a` | supported_static |  |
| `$27D8` | `retreat_heap_destination` | supported_static |  |
| `$27E7` | `read_string_owner_pointer` | supported_static |  |

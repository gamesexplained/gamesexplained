# Alter Ego — facts

## Fresh boot

The supplied male disk 01a reaches the FNC introduction, Activision menu and first name prompt. Direct matrix Space exits the intro; Return selects Begin a new game. The reference image records the fresh prompt.

All 9,794 imported native-code bytes and 2,718 word bytes match at the prompt. The final hand-over at $4000 contains the same code; bitmap output changes by 7,593 bytes on the way to the prompt.

## VM decoder check

The contributor’s recovered `decode_vm.py` was run on the fresh physical RAM. It decodes 82 procedures and 7,071 operations, with no invalid opcode, missing return, shared instruction byte or branch into an instruction body/header. After JSON normalization, every decoded operation and procedure matches the supplied VM export. This checks the imported decoding against the fresh image; it does not independently prove every opcode’s semantic description.

## Hidden VM mirror

$D800-$DFFF exactly matches $ABEB-$B3EA over 2,048 bytes. The imported note described only the final 1,599-byte suffix at $D9C1. The complete prefix also includes compiled bytecode and personality/acquisition strings. Internal targets refer to the active RAM addresses, so the stored bytes are a mirror rather than independently relocated execution. Visible colour-RAM/CIA operands refer to different occupants.

## Annotation corrections

The offcut label retains its operand address. Hardware-register labels were removed from the underlying RAM occupant; named graphics and VM-mirror regions replace them. Compiled procedure frame/body descriptions name their game purpose and checked operation boundaries. Native continuations name their actual preceding inline call and argument cleanup. Text records retain literal content and hexadecimal substitution bytes; category terminators name the table they end.

## MAP1 framing and scene decode

The contributor's male MAP1 REL extraction has 464 records, each `$3A + 252 logical payload bytes + $3A`. All markers pass. The native custom-drive buffer is a distinct 256-byte record at `$8045-$8144`: status, identifier, marker, 252 payload bytes, marker. Native seek/read code uses division by 252, initial cursor 3 and rollover 255; a drive record is not a host REL record.

An independently written whole-phrase decoder reads scene 26 from its directory-derived payload offset 89016. It expands 4,130 grouped MSB-first codes to 7,872 bytes, consuming 5,169 compressed bytes. Eight codes occupy each nine- or ten-byte group. After adding dictionary entry 256, the next-entry index 257 changes width to ten and discards the remaining old group. All 2,048 prefix bytes and 1,024 suffix bytes match `$B57B-$C17A`. This area is the prefix/suffix dictionary, split at the RAM boundary.

Every one of the scene's 39 descriptors independently parses to its complete length. All 40 boundary words match `$CAE5-$CB34`. Descriptor 31 occupies decompressed offsets 6032-6425; all 394 bytes match `$C2A2-$C42B`. It has route `$FE`, no conditions, one effect `{9,5,30}`, no choice dimensions, four script bytes, one 373-byte text fragment and a zero trailer. These are cached data in the prompt capture; the prompt is not displaying that narrative.

Sixteen controlled native calls to `$A974` reproduce all eight code positions at widths nine and ten, including maximum-width values. Four native branch tests at `$A850` confirm index 256/257, group positions 0/72, width and threshold, stopping before disk refill. Full live disk decoding and error handling remain open.

The MAP1 preamble loads a 4,560-byte resource at `$E800-$F9CF` and a 1,532-byte resident text object at `$E000-$E5FB`; both match the fresh image completely. Its 5,420-byte program object at `$8466` differs only at the runtime saved-frame pointer `$9990/$9991`. The separate 18,436-byte gameplay object is a later occupant and does not match the declared prompt phase.

The resident cache metadata gives compressed payload offset 89098 (`89016+2+80`), first descriptor 31 and exclusive end 32. Three native calls to `$9A14` confirm request 31 returns `$C2A2`, request 30 reaches reset `$A4DB`, and request 32 reaches decode `$A4F1`. Miss cases stop before file I/O.

## Questionnaire scoring

Both score tables contain 25 fixed records of 25 bytes, at `$94AE-$971E` (TRUE) and `$971F-$998F` (FALSE). Each record contains a count, ordered operation/state/magnitude triples and zero padding. All counts are at most eight; all padding and state indexes check. The records use assignment, movement toward 100 by a percentage of the remaining distance, and movement toward zero by a percentage of the old value. Each percentage result truncates before the next operation.

Sixty controlled full native executions of `$8E29` match an independent table interpreter over all 64 state words. Cases include all TRUE, all FALSE, each of 25 single-answer flips on both baselines, five mixed profiles, and all-0/3/255 inputs. The twelve traits start at 50, state 49 at zero; scores are deterministic within this routine. All input bytes other than 1 select FALSE. The UI's separate completion check still rejects unset answers. Scoring does not prove that later stage entry preserves the result unchanged.

Only question 22 TRUE sets state 49 to one. Intelligence, Physical and Vocational remain 50 in these tables. Label names come from the resident life-status pointer directory; full later gameplay display remains open.

## Name editor

Ordinary matrix input types lower-case name bytes: S/A/M produces `sam`; matrix DEL (row 0, column 0) removes the last character, then V produces `sav`. Further input fills exactly 16 bytes with `savabcdefghijklm`; seven further letters leave that field unchanged. Return accepts it and proceeds through the screen transition. A full-length name has no NUL within its 16-byte field.

## Display tables

All 16 custom-glyph pointers select eight-byte border/fill patterns; several starts overlap or repeat. Rendering identifies corners, horizontal/vertical lines, blank and filled patterns. Sixteen controlled native calls to `$47B8` copy the selected patterns exactly into the requested bitmap cell. All 91 native `$475D` copies for characters `$20-$7A` match the corresponding eight bytes of installed C64 character ROM 901225-01. No full ROM is published.

Four split address/offset tables match every entry: 40 columns at `8*i`, 40 packed-panel columns at `31*i`, 25 screen rows at `$0400+40*i`, 25 bitmap rows at `$2000+320*i`.

## Heap and retained arithmetic

`$6E70` uses a 16-bit heap pointer `$7FCB/$7FCC`, not a 32-bit pointer. It compares wrapped `heap+size` with its expression stack minus 256. Eight native cases with heap `$C465` and caller stack `$CE00` (expression-stack pointer `$CDF6` at the guard comparison, hence guard `$CCF6`) verify maximum 2193-byte acceptance, 2194-byte rejection, and overflow. Size `$FFFF` is accepted and moves the pointer back one; sizes 15259/15260 wrap it to zero/one and are also accepted. A player-visible oversized-request route has not been established.

161 bytes `$B46B-$B50B` form signed/unsigned quotient/remainder wrappers and their restoring-division kernel. Forty-four native cases reproduce integer calculations, mixed signs, minimum-value/-1 overflow and divisor zero. Zero divisor yields unsigned quotient `$FFFF` and unchanged dividend as remainder; signed quotient follows the wrapper's sign rule. No normal caller/route is established merely by executing a controlled call.

Primitive selector zero aliases the `$0002` operand of JMP-indirect at `$7B41`. Native selector 0 targets `$0002`, now beginning with JAM `$02`; selector 1 positively targets `$7B92`. Selector zero overwrites the previous pointer before jumping. No `$B7` operation occurs in the 7,071 decoded current operations, which does not exclude computed or later code.

## Retained initialization twin

The declared hand-over has 4,095 of 4,096 bytes equal between `$1000-$1FFF` and `$C000-$CFFF`, with the final paired byte differing. The name prompt has 52 differences, all in the live frame/stack tail. The stored source includes dictionary suffixes and cached data as well as frame seeds; matching the seed does not make an allocation unused.

580 bytes `$F9D0-$FC13` exactly duplicate source `$1DBB-$1FFE`. Their origin is open. Distinct bootstrap-like instructions begin at `$FC14`; their earlier-phase producer/relocation is not proved by the twin.

## Open verification

Resolve the remaining hand-over range `$CAA4-$CAD9`, unannotated high-RAM allocations and earlier bootstrap fragment. Complete current workspace ownership, full live compressed-file/error tests and save/load behavior. Male and female gameplay overlays require fresh independent captures. Original analysis models are unknown; Silver needs the required maintainer check.

## Provenance

`alter_ego_full_listing.txt`, SHA-256 `569f63e5e7ac084df3f63ed4863d17fe73b8fb43234d3ea8d37b017ea0a246c6`. Source is generated by `listing.py` from fresh exported symbols and the declared snapshot. Binaries and original text exports remain private.

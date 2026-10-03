# Jet Set Willy — checked facts

- **Boot (live):** CMM disk boots from hard reset to CMMO intro. Port 1 fire dismisses it; three `N` answers disable trainers. Return at the title reaches THE BATHROOM. Fresh captures are `reference/title.png` and `reference/play.png`.
- **Intro input (live trace):** `$2AF7` reads `$DC01`, compares with `$EF`, and jumps through `$2C23` when fire alone is held. Stepping observed A=$EF and the taken exit branch. This is boot provenance, not gameplay logic.
- **Code image (byte comparison):** boot title and play each match every imported code-typed byte (6,777) and word-typed byte (514). Title/play code agrees completely. Sprite storage `$4000–$6AFF` is unchanged. Room ranges differ at 16 and 24 bytes respectively; these are not assumed immutable.
- **Initialized gameplay (live):** IRQ vector changes from `$A801` at title to `$33E1` in play. Play processor port `$36`, DDR `$2F`; CIA2 port `$96` selects VIC bank `$4000`. The observed `$D018=$FF` selects screen `$7C00` and characters `$7800` in that bank.

## Verification work

Collection logic, collisions, guardians, arrows, ropes and winning route remain verification leads. The source export’s own tests do not verify these claims here. The interactive draft stays private until normal coverage/verification confirms it.

## Annotation checks

The 60 room records carry individual descriptions naming their captured room title and four exit ids. The sprite bank has 172 individual 64-byte records, each described as 21 three-byte rows plus alignment; sprite pointer arithmetic follows the C64 platform reference. Ghidra operand labels retain their actual offcut addresses. Post-row data descriptions were moved back to the row they describe; duplicate comments on the following row were removed. Runtime guardian work arrays, copied room glyphs and the indirect vector page are excluded from the authored-data ledger.

## Checked room and rope transfers

- **Room copy (live, controlled entry):** entering `$2E55` with each room id 0–59 copied exactly 256 bytes into `$0840–$093F`, stopping at `$2E7C`. Rooms 0–29 use `$B000 + id*256`; rooms 30–59 use `$C200 + id*256`. Each test compared the destination with the live source immediately before the call, because animated glyphs can change room records. All 60 cases restored processor port `$36`.
- **Rope staging (live, controlled entry):** the 34 words at `$1856` are `$8100 + position*192`. For each position 0–33, forcing the room rope flag and staging divider then entering `$16A2` copied the selected 192 bytes to `$0500–$05BF`; the check stopped at `$16E8` before coordinate processing. This verifies graphics staging, not player attachment or reachability.
- **Retained bootstrap (live, controlled entry):** `$D002` relocates 37 bytes from `$D015–$D039` to `$0334–$0358`. The relocated loop copies 8,192 bytes from `$D100–$F0FF` to `$E000–$FFFF` in descending pages, then restores `$01=$36`, enables interrupts and jumps to `$3C23`. All destination bytes matched the source captured before the test. This was a controlled execution of the retained routine, not an observed cold-boot hand-over.
- **Hidden room templates (traced):** `$D100–$DFFF` holds retained source copies of rooms 30–44. They are distinct from the later playable records at `$E000–$EEFF`, whose glyph bytes can change. CPU references to `$DAAC`, `$DAF8`, `$DB70`, `$DB71`, `$DB98` and `$DB99` made with I/O visible write color RAM; those stores are not physical reads of the hidden templates.
- **Snapshot scope (live):** `work/entry.vsf` stops at `$3C23` after the three trainer answers and RLE decompression, before copyright acceptance and title setup. Every code-typed byte matches the play image. CPU port is `$37`, DDR `$2F`, CIA2 port `$97` (VIC bank `$0000`), screen selector `$D018=$15`.

- **Packed terrain (live, controlled entry):** the renderer at `$2E9C` was run for every captured room record, stopping at `$2F0F`. All 30,720 screen cells and color-RAM low nibbles matched an independent decoder: four two-bit cells per source byte, most-significant pair first. Tile codes come from `$222C`; colors come from record offsets `$D7-$DA`. The `$2F11` glyph-copy loop separately matched all 48 bytes from `$08E0-$090F` to `$7908-$7937`. The browser shows this base terrain only, before conveyor/ramp/object/sprite overlays.
- **Title music (live, controlled native loop):** after `$A0CD`, repeated calls to `$A139` ended with pointers `$7246`, `$7350`, `$7518`, end flag `$FE=$FF` and SID volume zero. Voice 1 supplies 803 note/duration pairs and the terminal `$FF,$FF`; voice 2 consumes 132 pairs and voice 3 consumes 228 pairs.

- **Frame reconstruction (live capture):** `C64.renderFrame` matched all 104,448 pixels of one initialized gameplay frame. The trimmed renderer input contains 1,409 RAM bytes in 17 runs, plus color memory and display-register state. The page's sprite toggle changes the sprite-enable register in a copy of this capture. This is a rendering check, not a timing or collision test.

## Retained copyright and restart behavior

The retained loading-complete/copyright code spans `$3A02-$3CD2`. Its four-color checker at `$3C23` first treats any entered byte with bit 7 set as incomplete, then compares all four bytes with `$3A81-$3A84`. A controlled correct code reached `$3C3A`; changing each individual digit reached `$3C4E`; one `$FF` slot reached `$3C00`. The success routine copied all nine bytes of its cartridge header from `$3C62` to `$8000`. The captured expected-color base word is `$2C57`; its origin is open and no unpatched protection-sheet layout is inferred.

**RESTORE versus reset (live):** both reach the success header's entry stub `$0FA0`. RESTORE preserves DDR `$2F` and port `$36`, and the jump to `$A000` fetches the RAM title's `JMP $A744`. A CPU reset, checked with a positive checkpoint at KERNAL reset entry `$FCE2`, reaches the stub with DDR `$00` and port readback `$17`. Clearing bit 0 in the port latch cannot drive the banking pins while the direction register is zero. At the subsequent `$A000` jump, CPU-visible bytes are BASIC ROM `94 E3 7B`, while physical RAM contains `4C 44 A7`. The stub never initializes the direction register. This finding applies to the captured CMM disk image.

The third trainer answer led through the retained decompressor: a store checkpoint stopped with PC `$011E` after writing `$22` to the gap byte `$3CDE`, matching the later title/play capture. This identifies its producer, not the purpose of the surrounding gap. A packed-data relocation also wrote `$AEBD`; that byte changed again to its final captured value during unpacking. These observations do not establish an active gameplay consumer.

**Retained-copy phase (live):** the observed CMM boot hit the copyright entry `$3C23` without hitting execution checkpoints at `$D002` or `$0334`. Its RLE decompressor's final jump is `$0140: JMP $3C23`, after writing port `$37`. The controlled retained-bootstrap result remains valid, but it does not describe this disk's executed hand-over. The word `$1002` preceding that retained bootstrap is recorded as a prefix of unknown original file role.

The copyright input display uses pointer `$28` for an unset slot and pointers `$29-$2C` for color indexes 0-3. With the observed prior-phase VIC bank `$0000`, these select five addressed 64-byte slots at `$0A00-$0B3F`, whose contents overlap predecessor editor code.

**RLE image (independent decode and live writes):** at the third trainer answer, a 79-byte decoder is installed in `$0100-$014E`. It reads the relocated stream from `$521B-$FFFF` and emits 63,511 bytes at `$07E8-$FFFE`. A byte-for-byte independent decode matched that entire interval in the real cold hand-over snapshot. Ordinary bytes are literals; `$BA` introduces a repeat count and repeated value, with a zero count byte introducing the extended count. Watchpoints caught the final decoder writing the low retained tail, the gap after copyright code and the title-side tail at PC `$011E`. Their remaining semantic consumers are open; producing bytes does not establish that the gameplay uses them. The decoder lives in the stack area and is not a code block in the later play listing.

**Retained text-buffer editor (traced and controlled calls):** `$0B41-$0F00` contains a predecessor command loop, character/repeat parsing, a 27-entry @-through-Z dispatch table and buffer-editing helpers. Some of its entry/UI callbacks have been replaced by gameplay code, and the routine at `$0EF2` is truncated after `$0F00`. Its identity as a particular editor product is unknown. Direct calls to `$0D34` inserted HELLO into a scratch buffer and advanced the pointer by five; `$0D46` converted 00, 12, 4A and FF into the matching one-byte outputs. These calls do not demonstrate a working editor UI or player-accessible command interface. The preserved fragment stays Byte in the play listing so that predecessor callback addresses do not become false gameplay control-flow links.

The retained copyright display's pointer calculations address `$0A00-$0B3F` in its observed bank, but those low-memory bytes overlap predecessor editor contents. The CMM boot bypasses the entry/display path and reaches its accepted comparison state directly. They are described as addressed slots, not asserted to be intact original copyright artwork.

## Item, jump and death checks

- **Collection (controlled native candidates):** all 80 records matched the incoming screen address at `$07/$08`; nine additional cases covered decimal 9→10, 49→50, 50→51, 79→80 and 99→00, taken flags 1/$FF, wrong room and wrong address. Only a matching untaken record increments the packed-BCD counter and clears its cell. Only an increment resulting in `$50` sets `$0400`; this is an equality test, not a >= predicate. All cases returned with decimal mode clear and matching status digits. The candidate fields at `$15F9/$15FA` hold the copied screen address, not X/Y coordinates. These checks do not prove routes to all items.
- **Jump (actual input and control):** a brief fire pulse in the initial bathroom entered state 1 and raised Y from 104 to 84. Every consecutive jump-state update matched the signed delta table at `$102D`; bathroom geometry ended the jump at index 33. A replay with no input stayed at state 0/Y=104. No player coordinates or state were poked in either replay.
- **Death (controlled native entry):** all eight checkpoint fields at `$57-$5E` were restored to their corresponding player variables. Six spare-counter cases 8, 1, 0, `$80`, `$81`, `$FF` agreed with decrement-then-BPL: resulting nonnegative bytes enter room setup at `$2E07`, negative ones enter game over at `$383B`. The initialized value 8 represents eight spares in addition to the current attempt. The high-byte counter cases are synthetic arithmetic boundaries, not reachable-life claims.
- **Maria flag (controlled room states):** room 35 with flag zero enables sprite 7. A nonzero flag makes `$3284` skip its writes; it does not clear an already enabled sprite-7 bit. Room initialization at `$2E07` clears that bit, and the flag prevents re-enabling it. Five controlled room/flag/enable combinations and a room reset matched. Whether a player can arrange the fiftieth pickup in a state with Maria already displayed is open.
- **Additional copy helpers (relocated native calls):** the preserved helpers at `$3F00-$3F2A` and physical `$FF00-$FF2B` copy 8 KB from `$B000-$CFFF` to `$2000-$3FFF` and `$E000-$FFFF` respectively. Clones executed at `$0200` matched every output byte and restored port `$37`. Their original addresses lie inside their destinations, so neither their earlier caller nor safe in-place execution is inferred from the clone tests.

## Review verification, 3 October 2026

`node games/c64/jet-set-willy/reference/review-checks.js` runs 44
controlled checks against bytes in the committed listing. Four editor
inputs distinguish rejected byte-1 spaces, accepted decimal digits and a
non-digit. Four title-loop inputs distinguish fire alone, Return, another
key with fire and another key without fire. All 34 rope-directory pointers
and trajectory-pointer calls match their address formulas; both eight-byte
bit-mask tables match entry by entry. These simulator calls confirm routine
contracts, not legal routes from ordinary play.

The rope storage ends at $1ABC: the pointer directory is $1856-$1899;
the active attachment windows start at $189C and cover seventeen 32-byte
windows through $1ABB. The preceding pair at $189A/$189B is $80,$04;
no independent header role is claimed. $2233-$2239 crosses from the final
six ascending masks into the first inverted mask.

A fresh CMM boot on 3 October 2026 with VICE MCP v3.13.2, console mode
and dummy sound reached the title with all trainers disabled. Holding
port-2 fire for 120 frames with $50/$51 both zero produced no execution
hits at $A7EE; Return then reached THE BATHROOM. The private play snapshot
matches all 7,415 code bytes and 560 word bytes of the preceding listing.
Twenty-four byte-data bytes differ at the title glyph area $79E0 onward;
these differing bytes are not treated as immutable. Source was
rebuilt from the fresh play snapshot. Coverage measures 59,668 of 59,668
tracked bytes; this does not close the loaded-image audit or the open
mechanics in the scope notes.

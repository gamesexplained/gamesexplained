# The NeverEnding Story — facts

## Live state

A fresh Ocean disk boot reaches the Part-1 command prompt after Space through the title and opening narrative. The reference screenshot records the clearing in the Great Forest. The narrative capture matches all 4,277 imported code bytes and 142 word bytes; 29 byte-data bytes differ.

## Display

$A7E3 writes $D018=$38 for the bitmap picture. $A80A writes $D018=$3E for character text. With VIC bank $C000 this selects screen $CC00, bitmap $E000 and font $F800. Comparing its 2,048 bytes with the character ROM halves finds 157 and 215 matching bytes respectively; neither matches. This authored font is absent from the imported address space.

## Room illustrations

The 21 captured descriptors at $0BF9-$0C76 specify row, column, a little-endian source pointer, height and width. Picture 0 spans $A100-$A55F (1120 bytes). Pictures 1–20 span $4300-$93E5 consecutively. Each source row contains width*8 bitmap bytes, then width screen bytes, then width colour bytes.

A direct live call to $05BF was run for each of the 21 descriptors with interrupts disabled and processor port $35. Every bitmap byte, screen byte and colour-RAM low nibble matched the independent record decoder. The calls returned to the injected caller and consumed height*width*10 source bytes. The browser uses the fresh command-prompt snapshot’s sources.

## Text and dispatch

All 94 pointers at $25DD-$2698 were checked against packed records $2699-$28B8. Each record is a length byte followed by that many ASCII bytes; each pointer equals the next record start computed from the preceding record. Capitalization is preserved.

$1638/$163E patch condition-call operand $1642/$1643; handler carry selects continuation or skipped actions. $1690/$1696 patch action-call operand $169A/$169B. Their imported offcut labels now retain the actual operand addresses.

## Display workspace and loader

$0730-$073D copies staged pages $C000/$C100 to $9700/$9800. $0743-$0757 copies $0FA0 bytes from the display bundle at $E000 to $BC00, overwriting those staging pages. Saved display bytes are runtime output excluded from coverage.

$03A0 calls the exchange at $03A6, calls relocated loader $CC00, then falls through into the exchange again. The exchange exposes RAM with processor port $38 and swaps $CC00-$CFFF with $DC00-$DFFF. The parked loader contains non-fill bytes through $DCE3; internal calls name relocated $CCxx addresses.

## Visible graphic records

The six records at $2943-$2966 have a six-byte stride. The source pointer occupies offsets 2 and 3: the scan at $0EDA-$0EF3 starts with X=2 and adds six between records. Consequently record 4 has pointer $295D/$295E and record 5 has pointer $2963/$2964. $1156/$115B write the computed low/high bytes into the final pointer; $1146/$1149 clear them.

## Hidden-page observation

Bank-conditioned watchpoints on physical RAM $D000-$D0FF observed the restored title loading Part 1, reaching its narrative screen, and proceeding to the command prompt. Neither a RAM read nor a RAM store was observed on that trajectory, and all 256 bytes remained equal to the title capture. Injected LDA $D000 and STA $D000 with processor port $34 each stopped at the instruction following the access, confirming both watchpoints were active. This observation does not establish ownership or rule out use by other commands or parts, the boot trace below establishes its owner separately.

A second watched load stopped at $0400 before the Part-1 entry instructions. Comparing this hand-over snapshot with the command-prompt snapshot exposes four untracked non-fill runs: $68D7-$6905 (47 bytes), $9D00-$9EF2 (499), $9FEF-$9FFF (17), and $A500-$A55F (96). The two illustration tails are accounted for by their descriptor extents. The music tail is retained title-player code and its handler table; the final 17 bytes are produced by the boot decompressor.

## Boot repair page

Before decompression, boot code copies $7E95-$7F94 into hidden RAM $D000-$D0FF. All 256 destination bytes matched the source at the loop end. The relocated routine consumes the first 16 bytes as eight high-byte-first pointers: $AB82, $9BEE, $675D, $66E4, $66C2, $66BF, $264B and $25F3. Its DCP ($FD,X) instruction, with X=0, decrements each pointed byte. Each changed from $D4 to $D3 in the live check. The remaining 240 copied bytes are not consumed by this eight-iteration repair loop.

The parked loader is described by its relocated $CCxx instruction addresses. Its entry contains BCS $CC10 followed by BCC $CC1A: either carry value skips the intervening JSR $CC2B. The custom receiver still exists below that entry. Previous-phase calls from retained title music into $9728/$9734 land inside instruction operands of the installed gameplay loader; their Source labels identify that phase distinction.

## Parser and disabled disk verbs

LOOK repeated the room description. INVENTORY reported that Atreyu carried nothing. NORTH, SOUTH, EAST and WEST were refused in the starting clearing; NE moved from room 1 to room 2 and SW returned to room 1. XYZ produced an unrecognized-word message. These outcomes were observed through the live command input.

SAVE and LOAD were fed as PETSCII through the KERNAL keyboard buffer. Execution checkpoints stopped at $0491 and $045F respectively, each containing RTS. A single instruction returned to the action interpreter; the 168-byte serialized state $28BF-$2966 remained equal before and after each command. Thus the captured release’s commands dispatch to disabled handlers rather than the retained KERNAL disk routines.

## Open evidence

The boot trailer’s meaning, object-taking outcomes, later part transitions remain open. The earlier technical article is a private draft until its claims are checked.

## Provenance

Imported `neverending_story_full_listing.txt`, SHA-256 `ef4cadfc4fb0bbe410a3a0881d8ca9da6c877c19ef9579ce2f07147c66f90e12`. Original models are unknown. Source comes from fresh regenerator2000 exports and `listing.py` on the declared snapshot.

## Full frame and object state

A cycle-positioned frame capture recorded eight video-register writes. C64.renderFrame matched all 104,448 pixels of the emulator capture, with zero differences. The page embeds the trimmed 4,505 RAM bytes read by the renderer, plus the captured colour state; it carries no ROM image.

A controlled direct-call test placed noun token $45 (WEB) in the current room by setting its relative noun-state index 19 to room 1 and its carried count to zero. TAKE at $0F02 changed that location to $FC and incremented the count to one; the noun resolver selected icon slot 8, whose $AA60 source pointer appeared in a visible overlay. DROP at $0EB0 restored location 1, decremented the count to zero, and removed that pointer. This verifies the state and icon mechanics under the stated synthetic setup; it does not claim that WEB occurs in the starting clearing during ordinary play.

## Startup and review verification, 3 October 2026

`node games/c64/neverending-story/reference/review-checks.js` executes
the published bytes of $069B, $1580 and $A880. Controlled calls verify the
zero-page backup, temporary IRQ vector and VIC/CIA setup writes; both
opening-text pointers and lengths, prompt-cell writes and transition-call
order; and the IRQ's $35/$36 banking, acknowledgement and KERNAL tail.
Callees are hooked to isolate those contracts, so this test does not
establish the internal behavior of the $96xx routines or ordinary input
reachability. $069B and $1580 are the first two calls from $0400; all
223 bytes are now typed and described as startup/transition code.

ICON_17 at $B000 uses bit pair 11 for its 338 ground pixels. Every cell's
colour-RAM byte selects value 15, light grey. It is not a white ground.

A fresh Ocean disk boot on 3 October 2026 reached the Part-1 command
prompt using VICE MCP v3.13.2 with console mode and dummy sound. The
three reviewed routine spans and ICON_17 match the preceding published
bytes exactly. Compared with that listing, the existing code differs
only at the capitalization flag $0AFF and action-handler operands
$169A/$169B, all already documented as self-modified state. Seven
data bytes also differ: $980C, $9833 and retained boot-copy bytes $D01B,
$D070, $D07E, $D098, $D0D7; their equality is not assumed. Source was
rebuilt from this private capture and the updated symbol export.
Coverage is 49,311 of 49,311 tracked bytes, including 4,972 code bytes.

# Toki — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/play-round1.vsf`, stage 1 in play).

## Build

An Ocean type 1 cartridge of sixteen 8 KB banks; bank 2 carries
"1991 OCEAN SOFTWARE LTD / ALL RIGHTS RESERVED" ($8CEC-$8D15, game
alphabet). No version string found.

## Memory layout

| Thing | Where |
|---|---|
| Cartridge copy routines | `cart_copy` $011F and `cart_copy_six` $0100, in the stack page |
| Cartridge directory | bank 0 from $8009, 8 bytes an entry, read by `cart_copy` |
| Cartridge directory format | 8 bytes: bank ($80 + n, written to $DE00), flags, source, destination, length - 1 (low, high). Flag bit 6 copies with $01 = $37 so writes reach I/O (colour RAM); clear, $01 = $00 so writes reach RAM. Bit 5 marks a packed entry: `cart_copy` ignores it, but `stage_load` ($0A9B) stops at it and unpacks it (see below). Read statically from the cartridge, 2026-10-15 |
| Ocean bank register | $DE00, written by `cart_copy` ($80 selects bank 0) and from $0502-$0B52, $4F66-$5238 and $80F4 |
| Game code copied from bank 3 | $8000-$9F41 (entry 2; $9F42-$BD6B comes from bank 4, entry 3). In play, 8,004 of the 8,192 bytes $8000-$9FFF match bank 3 |
| Screen during the stage card | $CC00 (video bank $C000, $D018 = $31) *live* |
| Sprite pointers | $CBF8 and $CFF8, written by `nmi_frame` ($4D4D, $4D50): two screens |
| Sound code | the SID writes all fall in $6615-$6ED4 (`sound_init` $660D) |

## Timing

- `game_start` ($8000) sets CIA 2 timer A to $4CC7 ($8006-$800D) and
  `nmi_and_first_copy` ($5271) points the NMI vector at `nmi_frame` ($4D1D): a
  timer NMI once a PAL frame.
- Two raster interrupts take turns through $FFFE: `irq_panel` $837E
  (written on line 248 by `nmi_frame`, from `raster_vector` $07AB) and `irq_panel_on` $BCE1 (written on line 216 by `irq_panel`) *live*. On frames with sprites left over (`sprite_more` $6B non-zero) `raster_vector` holds a third, `sprite_reuse_irq` $95A4 (set at $813F), which hands $FFFE back to `irq_panel` at $98AA. Both serve the status panel: `irq_panel` sets $D011 = $57 with multicolour on, an invalid mode the VIC-II shows as black, for lines $D6-$DD while it switches video bank, character set, and colours; `irq_panel_on` sets $D011 = $17 (read from the code, 2026-10-22; the black band shows in a screenshot of stage 1)
  (frame capture).
- `wait_frame` ($819B) spins on $08F7 until the interrupt changes it *live*.

## Text

The game's alphabet: A-Z are $00-$19, 0-9 are $1C-$25, space $27
(stage card on screen at $CC00, row 8). Stored text in bank 0:
STAGE CLEAR ($8B27), GAME OVER, CONTINUE, the five stage names from
$8B50 (LABYRINTH OF CAVES, LAKE NEPTUNE, CAVERNS OF FIRE, ICE PALACE,
DARK JUNGLE), MUSIC and SFX ($8BA1). The play snapshot's RAM holds none
of it: the game reads its text from the cartridge.

## Hardware register census

From the references search over the listing's code (21,382 code bytes in `listing.json`).

| Register | What the game does | Where |
|---|---|---|
| $D000-$D00F sprite positions | set at start-up, in `irq_panel` and by `nmi_frame` | $40AA-$40DE, $8398-$83AD, $81C5-$81DE, $4D5B, $4D61 |
| $D010 sprite X high bits | | $40B7, $40CA, $8395, $4D76 |
| $D011 control 1 | blank, scroll and mode | $4053, $4072, $4108, $801E, $806A, $8390, $4D3F, $4DCC, $BCEB (read at $42DB, $4D9A) |
| $D012 raster | wait for line $EE; compare in `irq_panel`; set the next interrupt's line | $8012, $838B, $40A1, $42D6, $4D91, $4DA1, $83D9 |
| $D015 sprite enable | | $40F7, $8062, $8213, $4D70 |
| $D016 control 2 | multicolour and X scroll | $4DC6, $83C1, $8430 |
| $D017, $D01D sprite expand | set per split | $83B0, $83B3, $4D7C, $4D7F |
| $D018 memory control | | $405F, $4DAE, $83B7, $842B |
| $D019, $D01A raster interrupt | acknowledge; enable | $809F, $80A2, $4D94, $4D97, $83DC, $BCEE, $8030, $8055 |
| $D01C sprite multicolour | | $8216, $8850 |
| $D020 border | | $054F |
| $D021 background | set from `bg_colour0` $08C3 by `nmi_frame` ($4DB4); incremented by `update_player` ($858B) each frame the stage-skip combination is held, with `cheat_flag` $08F9 | $4DB4, $858B |
| $D022, $D023 multicolours | | $83C6, $83CA, $4DBA, $4DC0 |
| $D025, $D026 sprite multicolours | | $8884, $8889 |
| $D027-$D02A sprite colours | | $81EE-$8200, $4D67 |
| $D400-$D406 voice 1 (indexed by voice) | frequency, pulse, control, envelope | $6627-$6E99, $6ECE |
| $D404, $D40B, $D412 voice 1, 2 and 3 control | silenced together ($08) | $6ECE, $6ED1, $6ED4 |
| $D415, $D416 filter cutoff | | $6E21, $6E3A |
| $D417 resonance, $D418 volume | | $6615, $6CB5, $6620-$683C, $6EBE |
| $DC00, $DC01 CIA 1 ports | keyboard scan `read_keys` $5290; `update_player` ($8574-$8595) reads joystick 2 and joystick 1 together for the stage-skip combination | $4084-$4091, $5292-$52DF, $8574-$8595 |
| $DD00 CIA 2 port A | video bank | $8034, $83BC, $4DA8 |
| $DD04-$DD0E CIA 2 timer A | the per-frame NMI | $8008, $800D, $8019, $404D, $8052, $8196, $824C, $8259 (read at $4D25) |
| $DE00 Ocean bank register | cartridge bank select | see Memory layout |

Never written: the SID's voice 2 and 3 frequency, pulse and envelope
registers by name. The voice-1 writes are indexed by Y or X, so they
reach the other voices: an absence of named writes says nothing.

## Live tests

- PC sampled 16 times in play: always $819E (`wait_frame`).
- Writes to $9FF0 and $BFF0 read back changed: RAM, not cartridge, in play.

## Cartridge directory

All 32 entries of the directory in bank 0 ($8009-$8108), decoded from the cartridge image by reading `cart_copy` ($011F). X is the offset `cart_copy` is called with. Entries 0-5 are copied by `cart_copy_six` ($0100), called from `nmi_and_first_copy` ($5288) each time `game_start` runs: at power-on and again after the last stage ($405A). Entries 17-31 form five sets of three (destinations $C000, $BD76, $0C01), one per stage. Callers found statically: entries 6 and 7 from $0B11 and $0B16 at each stage start; entries 8-10 from $51E7-$51F3; entry 16 and entries 12-15 from `stage_load` at $523D and $5242 (in $51FB, which `game_start` calls first), just before `jsr $0C05`; each stage's three entries from `stage_load`. No caller of entry 11 was found: no code in any bank loads X with $58 before `cart_copy` or `stage_load`, and in the play snapshot only 7 of its 304 bytes match RAM $0812-$0941. Its bytes read as a cruncher's start-up stub (`sei`, $01 = $30, copy $082A and $08D0 onward to $00FA and $0333, `jmp $0100`), so it is probably left over from building the cartridge and never used (static check, 2026-10-22).

| # | X | Bank | Flags | Source | Destination | Bytes |
|---|---|---|---|---|---|---|
| 0 | $00 | 1 | $00 | $8058 | $4000-$5F48 | 8009 |
| 1 | $08 | 2 | $00 | $8000 | $5F49-$64FE | 1462 |
| 2 | $10 | 3 | $00 | $8000 | $8000-$9F41 | 8002 |
| 3 | $18 | 4 | $00 | $8000 | $9F42-$BD6B | 7722 |
| 4 | $20 | 0 | $00 | $822F | $0200-$04FB | 764 |
| 5 | $28 | 0 | $00 | $9260 | $0917-$0C00 | 746 |
| 6 | $30 | 1 | $00 | $8000 | $C7A0-$C7F7 | 88 |
| 7 | $38 | 0 | $00 | $9020 | $0500-$073F | 576 |
| 8 | $40 | 0 | $00 | $861B | $7D98-$7F3F | 424 |
| 9 | $48 | 0 | $00 | $85A3 | $7F48-$7FBF | 120 |
| 10 | $50 | 0 | $40 | $852B | $DB48-$DBBF | 120 |
| 11 | $58 | 0 | $00 | $89F7 | $0812-$0941 | 304 |
| 12 | $60 | 12 | $00 | $89C1 | $0C01-$223F | 5695 |
| 13 | $68 | 13 | $00 | $99E4 | $2240-$285B | 1564 |
| 14 | $70 | 15 | $00 | $98BA | $285C-$2F9C | 1857 |
| 15 | $78 | 2 | $20 | $85BB | $2F9D-$3731 | 1941 |
| 16 | $80 | 2 | $20 | $8D55 | $6501-$762F | 4399 |
| 17 | $88 | 6 | $00 | $8000 | $C000-$C77F | 1920 |
| 18 | $90 | 2 | $00 | $9E84 | $BD76-$BE6A | 245 |
| 19 | $98 | 14 | $20 | $8005 | $0C01-$1687 | 2695 |
| 20 | $A0 | 6 | $00 | $8780 | $C000-$C777 | 1912 |
| 21 | $A8 | 0 | $00 | $9692 | $BD76-$BF92 | 541 |
| 22 | $B0 | 14 | $20 | $8A91 | $0C01-$1884 | 3204 |
| 23 | $B8 | 6 | $00 | $8EF8 | $C000-$C477 | 1144 |
| 24 | $C0 | 0 | $00 | $98AF | $BD76-$C007 | 658 |
| 25 | $C8 | 15 | $20 | $8005 | $0C01-$18EA | 3306 |
| 26 | $D0 | 6 | $00 | $9370 | $C000-$C4C7 | 1224 |
| 27 | $D8 | 0 | $00 | $9B41 | $BD76-$BEFE | 393 |
| 28 | $E0 | 15 | $20 | $8CF4 | $0C01-$17C6 | 3014 |
| 29 | $E8 | 6 | $00 | $9838 | $C000-$C6A7 | 1704 |
| 30 | $F0 | 0 | $00 | $9CCA | $BD76-$BF21 | 428 |
| 31 | $F8 | 14 | $20 | $971A | $0C01-$14B6 | 2230 |

## Loading a stage

Read statically from the cartridge, then checked live in VICE on 2026-10-15: from power-on to stage 1, `stage_load` stopped three times, with X = $80, $60, and $88 (`stage` = 0).

| Thing | Where | What |
|---|---|---|
| `stage` | $08E7 | 0-4. Zeroed at $8023 when a game starts, incremented at $81B1 (both in the copy of bank 3), compared with 5 at bank 1 $809C |
| `stage_start` | $0AFF | $01 = $37, bank 0 in, X = `stage_sets`[stage], `jsr stage_load`, then entries 6 and 7 |
| `stage_sets` | bank 0 $8127 | $88, $A0, $B8, $D0, $E8: the directory offset of each stage's first entry (17, 20, 23, 26, 29) |
| `stage_load` | $0A9B | refreshes the stack-page routines ($8194), then copies entry X, X+8, X+16, ... (the `beq` at $0AA0 is always taken, since $8194 returns with Z set) until one has flag bit 5 (a flag with bit 7 set would end it at $0AB0 without unpacking; no entry has one); for that one it reads a 5-byte header just before the source (one byte pushed, $EC/$ED, $EA/$EB) and jumps to `unpack` |
| `unpack` | bank 0 $8DA2, run from the cartridge | reads the packed data backwards (`$8E80` decrements the read pointer and stops at $EC/$ED) and writes backwards, either literal bytes or copies of bytes already written (`$8E30`-`$8E5E`); its exact format is not decoded |

The packed entries all start at $8005 or later (the stage entries in banks 14 and 15, entries 15 and 16 in bank 2), which leaves room for the 5-byte header before them.

## Packed entries

The kit's 6502 simulator (`kit/cpu/cpu6502.js`) ran `unpack` from bank 0 on each packed entry after the copy, with the zero page set as $0AB6-$0AFB sets it (2026-10-15). Each run returned cleanly. The header's $EC/$ED is where the unpacked data starts and $EA/$EB is one past its end; the packed bytes sit at the top of that range and are expanded downwards in place.

| Entries | Packed | Unpacked to | Unpacked size |
|---|---|---|---|
| 12-15 (banks 12, 13, 15, 2: one stream, $0C01-$3731) | 11,057 | $0C01-$44BA | 14,522 |
| 16 | 4,399 | $6501-$7CBC | 6,076 |
| 19 (stage 1) | 2,695 | $0C01-$20DF | 5,343 |
| 22 (stage 2) | 3,204 | $0C01-$2683 | 6,787 |
| 25 (stage 3) | 3,306 | $0C01-$27CC | 7,116 |
| 28 (stage 4) | 3,014 | $0C01-$2323 | 5,923 |
| 31 (stage 5) | 2,230 | $0C01-$21BA | 5,562 |

Live check (VICE, 2026-10-15): at $0B11 after stage 1 loaded, RAM $0C01-$20DF matched the simulator's unpacked stage 1 byte for byte (5,343 of 5,343).

What stage 1's block holds, from a load watch on $0C01-$20DF over a few seconds of play: nothing executes there, and the reads come through zero-page pointers into it ($36/$38 = $1B34/$1B71, $3A/$3C = $1AE3/$1AA1), each pair read as split low and high bytes at the same index ($B207/$B20B, $A23D/$A241, $B57D/$B581), with the index from a per-object table ($32CE,x for $B207, through its one caller $A283; $33CA,x for the other two), and one read at $4C2E adds to a per-object table ($38EC,x). So the block holds pointer tables and the data behind them that the object code uses for each stage. Which object property each table holds is unknown.

## After a stage loads

Read statically from the cartridge and the unpacked blocks, 2026-10-22.

- `stage_start` goes on at $0B43: it takes a pointer for the stage from a table in bank 0 (low bytes $8113, high bytes $8118: bank 5 $815F, $8243, $82E5, $83C1, $848D), switches to bank 5, and copies bytes 0, 1, 4, and 5 of that record to $08E3-$08E6. Every record starts $E8 $FF; what the four variables hold is unknown.
- It then copies the words at $0C1C and $0C1E, inside the stage block just unpacked, to the zero-page pointers $3A and $3C, calls $0500, and leaves with $01 = $35.
- Each stage block starts with a header of pointers into itself, in the same layout for all five stages. In stage 1 the words at $0C18, $0C1A, $0C1C, and $0C1E are $1B34, $1B71, $1AE3, and $1AA1: the values found live in $36, $38, $3A, and $3C during play ("Packed entries"). $884A, called at $8049 just after `stage_start`, copies the 22 bytes $0C0C-$0C21 to $2A-$3F, which sets $36 and $38 from $0C18 and $0C1A (and $3A and $3C again).

## The listing's error rate

Sample, seed 7301 (2026-10-25): 60 of the 1,173 comments in `symbols.json`, drawn at random and checked by a fresh checker on Claude Opus 5.5 that wrote none of them. 47 were right and 13 were wrong in a detail (12 wrong-detail, 1 wrong), over the mark of 2 in 60, so the true rate is at least 22 % of the sampled kind. The wrong ones: a queue length ($0080), an incomplete writer list ($0291), a heading assigned to the wrong enemy section ($05A6), what the frame counter selects ($08F6), a counter's reset conditions ($0901), two swapped negative cases ($32CE), what the background loader does at the end of a segment ($5108), a sound byte called unread when an indexed load reads it ($6520), a rest byte called the end of a stream ($686D), a writer that reaches a byte only in one case ($7CBE), a label's referrer ($800E), two conditions in the mode 0 dispatcher ($8603), and a high-byte list missing three values ($B35F). All 13 were corrected, with the 41 comments that repeated three of the same beliefs: "no routine reads it" on the middle bytes of the sound arrays $6506-$65C7, and "a patched operand or a jump into the instruction" on operand-byte labels. The comments came mostly from Sonnet 5.5 rounds (sound state, zero page, stage tables) with small review samples. A full audit followed on 2026-10-25 (`kit/CHECKING.md`): fresh checkers on Claude Opus 5.5 went through the 1,126 comments the sample had not already found right, 15 chunks in address order. 275 were wrong in a detail or in the main claim and were rewritten (about one in four), 15 could not be checked because they cite cartridge banks or the cartridge image (sprite shapes, bank 7 object definitions), 18 labels were renamed where they named the wrong thing, and 27 claims in this file were corrected. A second sample, seed 4417, then measured the corrected listing: 60 comments, 55 right, 4 wrong in a detail (the starting values of the jump counter $08FB, the map y of draw_column_left_of_view, a handler called "never called" at $9150, a clearing described without what the bytes are at $C480; all corrected) and 1 not checkable (sprite shapes against cartridge banks). That is under one in ten, against about one in four before the audit.

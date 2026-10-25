# Target Renegade — facts

Bronze findings refer to the supplied EasyFlash image. Unnamed code is a trace lead, not an explanation. The published listing comes from `parts/resident/work/entry.vsf` as described in orientation.md.

## Findings

| Fact | Evidence |
|---|---|
| Title fire uses joystick port 1 | $26CC reads $DC01 and masks $10; live port-1/port-2 comparison in orientation.md |
| New-game initialization stores five lives | $8000 loads $35, ANDs $0F, then stores $020C. The first-stage panel says LIVES 5. The Commodore manual says three; the reason for this edition's difference is open. |
| Hardware IRQ enters $AAF0; NMI enters $A973 | $AF0F–$AF3C writes the hardware vectors. Live first-stage vector reads agree. |
| IRQ phases use RTS dispatch | $AAF0–$AB14 pushes an indexed high byte then low byte from $AB2F and executes RTS. Table entries are target minus one, rather than direct addresses. Zero entries are placeholders. |
| Score digits are produced from two nibbles | $FC43–$FC59 stores nibble+$30 at $3727,Y, then advances Y twice. Both caller sites are $FC3A/$FC40. All 256 input bytes passed a simulator check. This renderer does not validate BCD. |
| The title uses fixed-length text rows | $2659–$2699 copies six rows of 27 characters from $2791, $27AC, $27C7, $27E2, $27FD, and $2818. All boundaries were mechanically checked. |
| The recorded frame can be reproduced from its video state | `frame.py capture` recorded 38 writes; `compare` matched 104,448/104,448 pixels. This verifies that single captured frame, not an entire graphics engine. |

## Text encoding

The six title rows use C64 screen codes: A–Z=$01–$1A, space=$20. $27C7 reads `            MARTIN MCDONALD`; $27E2 reads `MUSIC    BY GARY BIASILLO  `; $2818 reads `PRESS FIRE TO START        `. The shared 27-byte copying loop supplies the record boundaries. The title's logo uses separate glyph indices, which were not decoded as alphabetic text.

The whole first-load RAM image was swept independently for screen-code and PETSCII runs of five or more characters. Recognizable findings included the title credits and the panel labels SCORE, ENDURANCE, LEVEL, TIME, GOOD LUCK, and LIVES. Screen-buffer strings are copies, not additional original text records. Other readable-looking runs remain unclassified. Private output: `work/strings.txt`.

## Hardware register census

This is a census of decoded code, not of all possible game behavior. Computed targets, self-modifying instructions, and untraced banks can hide accesses. Indexed stores to the first SID voice can also reach the following voices. The complete initial census is retained below so the next pass has every candidate; unknown readers are work items, not evidence of absence.

| Registers | Attributed use | Routine / state |
|---|---|---|
| $DC01 bit 4 | Title fire | $26BC; live |
| $DC00/$DC01 | Keyboard row selection and column read | $2833; simulator checked |
| $FFFA/$FFFE, $D01A, $DC0D/$DD0D | Hardware vector and interrupt setup | $AF0F; traced and vectors read live |
| $D011/$D016/$D018/$DD00 | Playfield and lower-panel video state | $AB6B/$AB98/$ABF9; recorded frame agrees |
| $D001,X and $D009,X | Clear sprite Y registers below panel | $AB98 |
| $D019 | Interrupt acknowledgment | $AAF0 |
| $D400–$D418 | SID player writes; tune and effect roles open | Entry near $0700 and tick near $07BF; full player unanalysed |
| Remaining decoded register references | ? | See census and next annotation queue |

```text
register census (bytes from the snapshot, blocks from symbols.json): 141 instructions name 38 registers
  $0000  cpu_port_ddr             sta        1  first $2618
  $0001  cpu_port                 sta        5  first $2614
  $D001  vic_sprite0_y            sta,x      1  first $ABAD
  $D009  vic_sprite4_y            sta,x      1  first $ABB0
  $D011  vic_control1             sta        3  first $2626
                                  stx        2  first $AB74
  $D012  vic_raster               cmp        5  first $26D8
                                  lda        1  first $93E9
                                  sta        5  first $AB92
  $D015  vic_sprite_enable        stx        1  first $26A0
                                  sty        1  first $295E
                                  sta        5  first $341B
  $D016  vic_control2             stx        1  first $2634
                                  sta        2  first $AB79
  $D018  vic_memory               sta        6  first $2621
  $D019  vic_irq_status           sta        1  first $AAF9
  $D01A  vic_irq_enable           sta        1  first $AF1B
  $D01B  vic_sprite_priority      sta        4  first $8064
  $D01D  vic_sprite_expand_x      sta        1  first $A86B
  $D020  vic_border               stx        1  first $262E
                                  sta        2  first $A85C
  $D021  vic_background0          stx        1  first $2631
                                  sta        1  first $A859
  $D022  vic_background1          sta        2  first $AB88
  $D023  vic_background2          sta        2  first $AB8D
  $D025  vic_sprite_mc0           sta        1  first $ABC2
  $D026  vic_sprite_mc1           sta        1  first $ABC7
  $D400  sid_v1_freq_lo           sta,y      8  first $0710
                                  sta,x      1  first $2334
  $D401  sid_v1_freq_hi           sta,y      7  first $0A21
  $D402  sid_v1_pulse_lo          sta,y      4  first $0A4F
  $D403  sid_v1_pulse_hi          sta,y      5  first $0A5A
  $D404  sid_v1_control           sta        2  first $083B
                                  sta,y     10  first $21BC
  $D405  sid_v1_attack_decay      sta,y      5  first $21BF
  $D406  sid_v1_sustain_release   sta,y      5  first $21C2
  $D40B  sid_v2_control           sta        2  first $0B89
  $D412  sid_v3_control           sta        2  first $0D27
  $D414  sid_v3_sustain_release   sta        2  first $0D38
  $D415  sid_filter_cutoff_lo     sta        1  first $0ABD
  $D416  sid_filter_cutoff_hi     sty        1  first $076A
                                  sta        1  first $0AC3
  $D417  sid_filter_resonance     sty        1  first $0767
  $D418  sid_filter_mode_volume   sta        4  first $07BB
                                  sty        1  first $2935
  $DC00  cia1_port_a              sta        3  first $283E
  $DC01  cia1_port_b              lda        5  first $26CC
                                  sta        1  first $2869
  $DC0D  cia1_interrupt           sta        1  first $AF1E
                                  lda        1  first $AF21
  $DD00  cia2_port_a              sta        6  first $261C
  $DD0D  cia2_interrupt           sta        4  first $840B

named by no instruction:
  $D000        vic_sprite0_x
  $D002-$D008  vic_sprite1_x to vic_sprite4_x  (an indexed access from $D001 may reach it)
  $D00A-$D010  vic_sprite5_x to vic_sprite_x_msb  (an indexed access from $D009 may reach it)
  $D013-$D014  vic_lightpen_x to vic_lightpen_y  (an indexed access from $D009 may reach it)
  $D017        vic_sprite_expand_y  (an indexed access from $D009 may reach it)
  $D01C        vic_sprite_multicolour  (an indexed access from $D009 may reach it)
  $D01E-$D01F  vic_sprite_collision to vic_sprite_bg_collision  (an indexed access from $D009 may reach it)
  $D024        vic_background3  (an indexed access from $D009 may reach it)
  $D027-$D02E  vic_sprite0_colour to vic_sprite7_colour  (an indexed access from $D009 may reach it)
  $D407-$D40A  sid_v2_freq_lo to sid_v2_pulse_hi  (an indexed access from $D406 may reach it)
  $D40C-$D411  sid_v2_attack_decay to sid_v3_pulse_hi  (an indexed access from $D406 may reach it)
  $D413        sid_v3_attack_decay  (an indexed access from $D406 may reach it)
  $D419-$D41C  sid_paddle_x to sid_v3_envelope  (an indexed access from $D406 may reach it)
  $DC02-$DC0C  cia1_ddr_a to cia1_serial
  $DC0E-$DC0F  cia1_control_a to cia1_control_b
  $DD01-$DD0C  cia2_port_b to cia2_serial
  $DD0E-$DD0F  cia2_control_a to cia2_control_b
```

## Scope and unresolved ownership

The initial sixteen-byte bank comparison is in orientation.md. Copies and later resources remain unpartitioned. The ledger includes 61 unclassified loaded stretches and RAM beneath I/O instead of silently dropping them. This inclusion does not explain them. Cartridge banks and the documented second load have no annotations yet; 1.2% describes only the measured first-load image, with 12 of 13 registered parts unstarted.

## Review

Author review re-read five of the sixteen handwritten comments against bytes and callers, spread across title input, keyboard scanning, new-game initialization, interrupt setup, and score formatting. The keyboard routine passed four simulated key/joystick combinations; the score renderer passed all 256 byte inputs; interrupt setup produced the expected vector and I/O writes. All claims in the generated text template were checked against the six-source copy loop, and three generated rows were inspected individually. No independent sample or audit was performed. The contributor identified the session model as gpt-6.1-sol, which the kit recognizes as proven. Silver still requires completion of analysis, verification, and independent comment sampling.

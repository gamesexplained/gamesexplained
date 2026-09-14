# Radar Rat Race — orientation

`work/Radar Rat Race.d64` — single file on disk: `radar rat race` (34 blocks,
8450-byte PRG once extracted to `work/radarrat.prg`). Disk label is a
"c64.com" preservation re-release, not an original retail disk, but the
program itself is unmodified Commodore code — title screen confirms
`(C) 1982 COMMODORE ELECTRONICS LTD.`

## Load sequence

Standard autostart: `LOAD"*",8,1` → `RUN` → BASIC line `1983 SYS2061`.

`SYS 2061` ($080D) enters a small loader/relocator, disassembled live at that
breakpoint:

```
$080D: SEI                  ; disable interrupts
$080E: LDY #$00
$0810: STY $02 / STY $04 / STY $06      ; low bytes of 3 zero-page pointers = 0
$0816: LDA #$28 / STA $03   ; ptr1 (source)      = $2800
$081A: LDA #$3F / STA $05   ; ptr2 (dest A)       = $3F00
$081E: LDA #$FF / STA $07   ; ptr3 (dest B)       = $FF00
$0822: LDX #$20             ; 32 pages (8KB) to move
$0824: LDA ($02),Y          ; copy loop: read from ptr1
$0826: STA ($04),Y          ;   write to ptr2 (dest A)
$0828: STA ($06),Y          ;   write to ptr3 (dest B)  -- same byte, two destinations
$082A: INY / BNE $0824
$082D: DEC $03 / DEC $05 / DEC $07      ; all 3 pointers march down one page
$0833: DEX / BNE $0824
$0836: LDA $0870,Y / STA $8000,Y ...    ; final block copied to $8000
```

So: it duplicates the just-loaded 8KB image (source pages $28→$08, i.e. the
program's own load region $0800–$2800) into two places at once — pages
$3F→$1F and $FF→$DF — then separately relocates a block from $0870 to
$8000. Earlier in the same stub (not re-disassembled here, seen in the raw
PRG bytes) there's `LDA #$35 / STA $01` — the standard 6510 I/O-port trick
to bank BASIC ROM out and get full RAM underneath, which is why this
duplication into $8000/$C000-ish territory is possible at all. Reads as a
classic early-80s trick to get code/graphics data into every memory
configuration the game will bank-switch between at runtime (RAM under
BASIC, RAM under KERNAL, etc.) without reloading from disk each time.

**Verification note:** confirmed live — checkpoint at `$080D` fired with
`hit_count: 1` (correctly rare, matches expectations for a one-shot `SYS`
entry point), and by the time the ~1-frame overshoot let it settle, the
zero-page pointers ($03/$05/$07) had each decremented by exactly 3 — i.e.
3 full 256-byte passes had completed, consistent with the loop structure
above.

## Confirmed working end-to-end

`vice_disk_attach` → `vice_autostart` → checkpoint on the `SYS` target →
`vice_disassemble` → `vice_display_screenshot`. Boots correctly to the
title/attract screen: TIME bar, HI-SCORE/SCORE, "PUSH 'F1' TO RUN", NEXT
MEAL bonus, ROUND 1. Reference screenshots of the title screen, play, the time bonus and a
SPEED RUN are in `reference/`.

## Next steps, if we go further

- Break on `$8000` itself (exec) to see what code actually runs from the
  relocated block.
- The attract screen is presumably polling for joystick/fire or the F1 key
  (CIA1 port or `$91`/keyboard buffer) — a checkpoint on that read would
  find the "start game" trigger.
- Sprite/VIC-II state (`vice_sprite_inspect`, `vice_vicii_get_state`) once
  actual gameplay starts, to find the player/rat sprite data.

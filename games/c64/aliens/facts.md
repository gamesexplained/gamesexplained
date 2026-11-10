# Aliens — verified technical facts

Observed in the emulator on 10 November 2026 unless marked otherwise.

## Build

US Activision disk image, cracked (Remember trainer). See `orientation.md`.

## Memory layout

| Thing | Where |
|---|---|
| Cracker program (BASIC stub, cracktro, trainer), also holds the engine | file `ALIENS+9&P` loaded at `$0801`-`$5E40` |
| Resident engine | `$0800`-`$3CFF`, `$C000`-`$C1FF` (identical in all six level snapshots apart from variables) |
| Story and prompt text, PETSCII | `$13BE`-`$2210` in the engine |
| Level data and code | `$4000`-`$BFFF`, `$C200`-`$C6FF`, `$E000`-`$FFFF`, different in every level; levels 2 and 5 share `$4000`-`$5BFF` and `$B400`-`$BEFF` |
| Vectors in RAM | NMI `$0952`, IRQ `$0934`, `$01` = `$35` in play |

## Controls

Joystick port 2 moved the equipment cursor in the emulator; the manual says port 1. The engine reads `$DC00` and `$DC01` (joystick and keyboard matrix; first reads at `$09F6`, `$0A10`).

## Sound

The engine writes all three SID voices, the filter and volume (`$D418` at `$0A65`).

## The listing's error rate

No sample has been taken; nothing is annotated yet.

---
name: 40-sweep
description: Two cheap mechanical sweeps that convert large regions from unknown to understood in one pass, a hardware register census and a string sweep. Run early, and again whenever the burn-down stalls.
---

# Sweeps that find what code-reading misses

Both are cheap and mechanical. Run them from the snapshot's RAM image
directly (Python over the file) or through the disassembler.

## Hardware register census

Extract every access to the I/O region from the disassembly, group by
register, and demand an attributed feature for each. Registers *never*
touched are as informative as those hammered. A game that writes no sound
envelope register at all is doing its whole audio with frequency writes
and a frequency of zero for silence; one census explains the entire sound
engine, including why repeated pitches merge into one sustained note.

Produce a table in `facts.md`: register, what the game does with it, which
routine. Every row with a "?" is a work item.

## Screen-code string sweep

Decode the whole image as screen codes (and again as the system's text
encoding) and print runs of five or more printable characters. This finds
attract text, control legends, version markers, build identifiers and
credits in seconds. If the game has a custom character set, follow with
`30-text`.

## Twin-copy check

Relocating loaders can leave a second copy of code or tables in memory.
Before describing a region, check whether the code reads it or reads a
twin elsewhere: compare the two byte for byte. A byte that differs is
usually a variable written at run time. Describe the copy the code reads
and mark the other as an unread duplicate.

## Outputs

Register table and string list in `facts.md`; a build identifier if one
exists (record it in `game.json` as `build`); strings labelled in the
disassembler.

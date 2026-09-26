---
name: 40-sweep
description: Cheap mechanical sweeps that convert large regions from unknown to understood in one pass (a hardware register census, a string sweep, a twin-copy check and, when another version of the game is documented, a map of that version onto this image). Run early, and again whenever the burn-down stalls.
---

# Sweeps that find what code-reading misses

Start the clock: `python3 kit/scripts/clock.py start 40-sweep --model <your model id> games/<platform>/<slug>`. No figure yet; yours goes on the runs table.

All of them are cheap and mechanical. Run them from the snapshot's RAM image
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

## A documented version on another machine

Many games were written for one machine and converted to others, often by
the same programmer from the same source. When a documented disassembly or
source of another version exists (a published reconstruction, a commented
source, another game folder in this repository), map it onto this image
before reading any code. It can place most of the program in minutes.

1. Take every run of 8 to 12 bytes of the other version's code and search
   this image for it. Keep only the windows found exactly once: each hit
   places an address of the other version at an address of this one.
   Windows over an absolute operand miss wherever the code moved, so
   expect most hits in code that uses only relative branches and zero
   page, and in tables.
2. Group the hits into blocks with one offset each. A conversion keeps
   long stretches at the same address or at a fixed distance, and a block
   that moved as a whole shows up as one offset.
3. Carry the other version's labels through the blocks, and keep only
   those that land on an instruction boundary here. Seed the
   disassembler's code blocks from them, and give the list to the
   annotation agents as a guess about purpose, never as names or
   comments: those are written in the agents' own words from this
   image's bytes, and the other version's description of hardware is
   never true of this machine.
4. What does not map is where the conversion did its own work: the
   screen, the sound, the input, anything that touches hardware. That is
   the list to read first, and the list of differences the page will
   want.

Record in `facts.md` the correspondence (the blocks and their offsets,
how many code bytes and labels were placed), with the other version's
source and the date it was read.

## Outputs

Register table and string list in `facts.md`; a build identifier if one
exists (record it in `game.json` as `build`); strings labelled in the
disassembler.

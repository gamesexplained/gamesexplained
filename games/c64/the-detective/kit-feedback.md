# The Detective — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

This file was first written at the Bronze checkpoint (1 November 2026);
the run continues to Silver and adds to it at the end.

## Skill text that changed what I did

- `10-orient`: "A checkpoint on an address that a ROM covers at that moment fires while the ROM runs there": a stop at `$BD0A` with the CPU inside BASIC's number parser read as the unpacker's exit; the rule named the cause, and stopping first on `$0812` fixed it.
- `10-orient`: "Compare it with the play snapshot byte for byte": the comparison showed the title's character set and a buffer region that play overwrites, so the listing is built from the hand-over.
- `30-text`: "First rule out an offset": one pass of letter differences found every known word in plain PETSCII, which settled that the strings need no private alphabet.

## What was changed in the kit

Nothing at the Bronze checkpoint.

## Candidates

None at the Bronze checkpoint.

## Maintainer asks

None at the Bronze checkpoint.

## What cost the most time

Following the three unpacking stages one by one: an execute checkpoint over the program's whole range, re-armed around each stub it stops on, found the entry in one pass, and `10-orient` could say so for a packed program.

## System

Windows 11 Pro with WSL2 Ubuntu 26.04; the emulator built from source
(vice-mcp v3.13.2, commit 1e83aab134), 57 of 57 checks passed;
regenerator2000 0.9.20.

# Mercenary — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25 September 2026: setting up and orienting

The run was a cloud session with no disk image on the machine at first;
the contributor uploaded `MERCENAR.D64` into the session. Their Google
Drive held only `Mercenary III.adf` (the Amiga sequel), so the first
question was which copy and which platform; the upload settled both.

The emulator was the v3.13.1 Linux release zip (with fourteen runtime
libraries from apt), and passed all 56 checks, so no workaround applied.
`check-emulator` leaves the machine paused: the first autostart after it
did nothing until the machine was resumed.

The disk's `MERCENARY` turned out to be a packed one-file build: a BASIC
`SYS` line naming "COMPACKER V2.0", a depacker in the stack page, BASIC's
own `RUN` of the unpacked program (`1999 SYS 2065`), a run-length stage at
`$B98B` that decodes downward from `$CFFF`, and a copy at `$5000` before
the game's start-up at `$7200`. Three wrong turns on the way:

- A stopping checkpoint on `$B98B` fired inside BASIC's ROM while the
  `SYS` line's number was being converted, with `$01` = `$37`; the
  snapshot taken there was useless. Stopping on the `SYS` target `$0811`
  and stepping five instructions reached the real `$B98B`.
- The first hand-over snapshot held leftovers of the previous boot under
  the KERNAL: an autostart resets the CPU but keeps RAM. A power cycle
  (`vice_machine_reset` with `mode: hard`) before the boot gave clean RAM.
- `$5000` was taken for the game's first instruction; it is a copier, and
  the start-up at `$7200` and the two blocks it copies from exist only
  until the second bitmap overwrites them, so the image to read is the
  machine stopped at `$7200`, after the copy.

The pointer at `$0800`, which the `SYS` stub sets by storing `$6C` at
`$0800` before jumping on, is the first script's address: the stub is not
the packer's decoration but part of how the game finds its opening script.

## Features and text

A research agent read the manuals, Zzap!64 and the fan sites in parallel
with the orientation. It reported the Mercenary Site unreachable: its
fetcher upgrades plain HTTP to HTTPS, and the site serves HTTP only.
`curl` over plain HTTP reached it, so its pages were read directly
afterwards.

The string sweep found words ending in a character with bit 7 set, not
whole messages: the messages are token lists over a dictionary. Decoding
the pointer tables at `$2120`/`$2210` took two tries: the words start one
byte after the address the table holds (the printer's index starts at 1),
and words 1-7 are endings printed with no blank before them ("LAND" + "ED").
The one conflict in the documentation that the code could settle at once,
T or P to take an object, went to T (`$970A`).

## Coverage

Twelve annotation agents (the same model as the lead) took disjoint
ranges: variables, the scripts and text, three data ranges, the start-up
and panel, and six code ranges of about 2.5 KB each.

# Skate or Die! - verified technical facts

Current truth for the whole game. Each part has its own facts, beside its
listing: `parts/<id>/facts.md`. This file holds what is true across parts.
How the understanding developed is in `agent-history.md`.

## Build

- The image is EA's own two-sided disk (side 1 directory: one two-block
  PRG, `EA`). No crack intro, trainer or added code was found.
  No build identifier or version string was found (High Jump's string sweep, `parts/highjump/facts.md`).


## The parts

| Part | File, address | What |
|---|---|---|
| `boot` | `EA` (track 1 sector 6) at `$0102`, then track 1 and 3 by sector | the self-starting, layered loader, the drive check on track 2, the drive server upload |
| `title` | `$00` at `$4000` | title picture, Hubbard's music with samples, hand-over to the shop by NMI |
| `resident` | from the boot (`$F230`) and the shop (`$F730`, file `$0B`) | disk loader and event manager, in memory from the shop on |
| `shop` | `$03` at `$0880` | Rodney's shop, the town square, sign-in, records |
| `ramp` | `$0D` at `$0880` | Freestyle |
| `highjump` | `$0E` at `$0880` | High Jump |
| `downhill` | `$1B` at `$0880` (side 2) | Downhill Race |
| `jam` | `$28` at `$0880` (side 2) | Downhill Jam |
| `joust` | `$14` at `$0820` | Pool Joust |

Every event part is loaded over `resident` and owns `$0000`-`$F22F`.

## Shared across parts

- **One sound driver.** High Jump's driver, moved, plays every event:
  init / queue / update at highjump `$22B7`/`$22F5`/`$232C`, ramp
  `$271E`/`$275C`/`$2793`, downhill `$2FAC`/`$2FEA`/`$3021`, jam
  `$E000`/`$E03E`/`$E075`, joust `$22C8`/`$2306`/`$233D`. The title has
  Hubbard's own driver; the shop and the boot make no sound. (traced)
- **Random music, unseeded.** Every event's music chooses its next phrase
  at random from a successor table, with random state loaded from disk
  that nothing seeds: highjump `$35AB`, ramp `$E13B`, downhill `$7638`,
  jam `$AB3E`. After a fresh load the order is always the same. (traced)
- **A 60 Hz clock.** The race and the Jam count a tenth of a second every
  six frames (downhill `$1060`, jam `$23F8`): on a PAL machine a clock
  second is 1.2 real seconds. (traced)
- **The same run-length packing** for every packed picture: a control
  byte below `$80` copies n + 1 literal bytes, `$80` and up repeats the
  next byte n - `$7F` times (title `$4338`, shop `$0FEA`, highjump `$1B6A`,
  ramp `$1FD1`, joust `$2169`). (traced)
- **The stale NMI vector.** The shop sets `$FFFA` to `$0A3A`, an RTI in
  the shop; every event inherits it, where `$0A3A` is mid-instruction.
  (traced)

## How far the listings' comments can be trusted

High Jump and the resident part: a sample of 60 line comments (seed
20261004) checked by an agent that wrote none of them: 4 wrong details,
none a wrong purpose, 6.7 % (95 % Wilson interval 2.6 % to 15.9 %).
Details in `parts/highjump/facts.md`.

The other parts (boot, title, resident, shop, ramp, downhill, jam,
joust): a sample of 60 labelled line comments (seed 20261005, stratified
by part over 4,153) checked the same way: 5 wrong details, none a wrong
purpose, 8.3 % (95 % Wilson interval 3.6 % to 18.1 %). The 14 that scripts
wrote were all right; 5 of the 46 written by hand were wrong (11 %). The
five were a poll count off by one (title `$F598`), a "no caller" claim
that missed the save path (resident `$F43A`, called from `$F27F`), a table
position (ramp `$7580`), a label's address (jam `$0BCF`) and which copy of
a value loses bit 0 (joust `$226B`).

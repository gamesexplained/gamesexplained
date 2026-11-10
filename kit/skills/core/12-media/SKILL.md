---
name: 12-media
description: List everything the game came on, straight after orient. Every file, every stray sector and every cartridge bank goes into media.json, and each gets one answer before Silver, a part, data, the loader, saved or never loaded. Only on a machine whose kit has a media reader.
---

# Media: everything the game came on

Coverage counts the bytes in the parts' snapshots, so a file the game
loads into a slot and then replaces, or never loads, is outside it
whatever the figure says. `media.json` closes the list from the other
side: every item on the media, with one answer. The skill is used
twice: the list now, before any code is read, and the answers once the
listings exist.

A machine whose kit has no reader, `kit/<platform>/media.py`, has no
ledger, and its games need none: go on to the next skill.

## Now: the list

`python3 kit/scripts/media.py scan <game dir> <name>=<image> ...`, with
every image the contributor gave, each named as the game asks for it
(`side1`), writes `media.json`: every file, every run of sectors the
disk's map marks as used that no file holds, every bank of a cartridge.
An item several images hold byte for byte is listed once, and each
starts `open`. The ledger keeps names, sizes and hashes; the images stay
in `work/`. `media.py <game dir>` prints what is open.

Set the list beside the table of files from `10-orient` step 7. Code
that no snapshot holds is a part with no folder yet (`15-parts`): a
module the game loads into a slot and replaces is in none of the
snapshots taken after it.

## Before Silver: the answers

Scan again with the same images once the listings are built. An open
file or bank with 90 % of its bytes in one part's listing is answered
`part`, and one found in some measure says where (`near`); answers
already given stay. Answer the rest with
`media.py answer <game dir> <pattern> <answer>`, where a pattern takes a
family at once (`MON*`) and `--open-only` leaves the answered alone.

| Answer | The item | Also give |
|---|---|---|
| `part` | is listed in a part | `--part` (none in a game of one load) and `--at`; `--packed` when it unpacks into the part |
| `data` | is data the game loads into a buffer: a level, a picture, a monster, a tune | `--page`, the page that decodes it, when one does |
| `loader` | stands in front of the game: the boot program, a fast loader or its drive code, a loading picture, a protection, a cracker's intro | |
| `saved` | is written by the game: saved games, high scores, a party it ships with | |
| `unused` | is loaded by nothing | how that was shown (`60-verify`, "Negative results") |
| `open` | is not explained yet | |

Every answer but `open` takes `--why`, what the item is, except a part
the scan found whole.

- A family the game loads by a name it builds, a stem and a number, is
  `data`, and its why names the routine that builds the name. A member
  that the game's scripts or tables never ask for is `unused` once that
  has been shown, because a cut monster or level is what a reader came
  for (`70-minisite`, "Discoveries").
- A file found in part is that part when the rest is accounted for:
  loaded over by another file, or past the end of its slot. The why says
  which.
- Sectors no file holds are what a game reads with the drive's block
  commands, a protection's track, or leftovers of writing the disk.
  Answer them `unused` only once the game is shown to ask for every
  file by name.

A game at Silver or above needs a `media.json` with nothing open
(`check_docs.py`). A game made before the ledger keeps its tier, and its
About tab lists what is open (`kit/lessons/2026-11-10-media-ledger.md`).
`games/c64/pool-of-radiance/media.json` is one, with each kind of answer.

## Outputs

`media.json` in the game's folder: after orient, every item listed;
before Silver, every item answered.

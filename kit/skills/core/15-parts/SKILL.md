---
name: 15-parts
description: Only for a game that is more than one image, as orient finds it. Levels loaded over an engine, a program that replaces memory, a cartridge's or a 128K machine's banks, or code read from the disk during play. Give each part a folder, a snapshot and a route, and find what stays.
---

# Parts: a game that is more than one image

Some games are not one image. The same addresses hold something else at
different times: an intro, then each level loaded on its own, then an
ending; or an engine that stays in memory while one level after another
is loaded over part of it. Each of those is a **part**, with its own
snapshot, symbol map, listing and facts. Forced into one image, all but
one of them is lost.

What makes something a part is a fact about the machine. On one that loads from disk or tape,
a part is a load as the player meets it: the program as it stands when
the loading is over and something happens. Ten files behind one loading
screen are one part, so count what the player waits for, not what the
disk holds. A state that differs only in its variables is not a part: a
title screen and play in one load are one, and `10-orient` step 4
chooses its snapshot. The loader, a protection check and a cracker's
menu are not parts either; they stand in front of the game. Nor is data
the game fetches into a buffer during play, a portrait for each fight or
a tune for each room: a widget that shows it carries its bytes in the
page (`70-minisite`).

## Terms

| Term | Where | What it means |
|---|---|---|
| part | `parts/<id>/` | one of the things the same addresses hold at different times, with its own `part.json`, symbol map and listing |
| load | a part's `"kind"`, the default | a part the game's loader copies to fixed addresses; listed at those addresses, from a snapshot |
| bank | `"kind": "bank"` | a part the machine switches into a window of the CPU's addresses, read there and never copied; listed at the window's addresses, from the cartridge image or the snapshot's copy of the bank |
| virtual | `"kind": "virtual"`, `"machine"`, `"size"` | a program for a virtual machine, which the game's interpreter reads on demand into whichever buffer is free and reaches at the program's own addresses; listed at those addresses, from its file, by the kit for that machine (`kit/<machine>/`) |
| virtual address space | `coverage.virtual` in `game.json` | code or text read on demand the same way, for a machine the kit has no tools for; not a part, and the kit cannot list it |
| `over` | a load's `part.json` | the part beneath: the one whose addresses this load writes over |
| `ranges` | a load's `part.json` | the addresses its load writes, which it takes from the part beneath |
| `bank` | a bank's `part.json` | the bank's number, or its name where the machine names its banks |
| `seen_by` | a bank's `part.json` | the part whose code reads the bank; it keeps the window's addresses for its own RAM |
| `window` | a bank's `part.json` | where the bank shows among the CPU's addresses |
| `banks` rows | the `part.json` of the part that sees a bank | which of its instructions see the bank, as `[first, last, bank's id, why]` |
| owner | the coverage figure | the one part that counts a byte; a game's coverage, the sum over its parts, counts each byte once |

A part's symbol map uses the same addresses as its listing. A game of
one image has no `part.json`: its `game.json` holds the ledger settings
(`video`, `coverage`, `io`, `regions`) that a `part.json` would.

To see each kind in a finished game: loads over a resident part, one of
them over another load, in `games/c64/lemmings/parts/`; a bank in
`games/spectrum/where-time-stood-still/parts/bank-01/`; a virtual part,
a Z-machine story, in `games/apple2/zork-i/parts/story/`.

## Steps

1. **Give every part a folder**, in the order they are played, analysed
   or not: `python3 kit/scripts/parts.py add <game dir> <id> --title "..."`
   makes `parts/<id>/` (`parts.py -h` has the layout). The folder says
   everything about the part, in its `part.json`: its title, its place
   in the order, its kind's fields. No file lists the parts, so adding
   one writes nothing another part shares. A part with no symbol
   map shows as not analysed on the page and in `coverage.py`, and that
   is what keeps the game's figure honest: the parts with no folder are
   the ones nobody knows are missing. When the first load was analysed
   before the others were found, `--adopt` makes the game folder's own
   symbol map that part's.
2. **A snapshot for each part**, in the part's own `work/`: the
   hand-over as `entry.<ext>` and one in play, as `10-orient` step 4
   says. The game's own loader puts the part in memory. Never assemble
   an image from the disk's files: the listing must show bytes and a
   machine that existed together.
3. **Write the route to each part** in `orientation.md`, from power-on
   or from the part before, so that someone else can reach every
   snapshot. Where playing to a late part is not practical, say what was
   done in its place (a level code, the game's own level select, the
   level number set and the game's loader called), and add a part
   column to the table of files from `10-orient` step 7.
4. **Find what stays.** Compare the parts' snapshots byte for byte.
   - **Resident code.** Code that is the same at the same address in
     every part is resident: make it a part of its own, and add each
     load with `--over <its id>`, giving the addresses the load writes
     as `"ranges"` in its `part.json`. Find them by watching the load (a
     store checkpoint over all of memory while the loader runs), or by
     comparing the snapshots either side of it. The part beneath then
     owns everything else.
   - **A leftover.** A stretch that matches another part's where nothing
     calls it is a leftover of an earlier build, not shared code.
   - **A load over a load.** A load can lie over a part that has ranges
     of its own and write some of them again: a program that replaces
     the game's first pages for a while, and calls the rest of the game.
     The part beneath keeps its own ranges then: its snapshot holds its
     own bytes there, the other part's holds others, and each counts
     what its own load wrote.
   - **A shared load.** A load that several parts share and that stays
     while they change (a tile set that comes in with the first level to
     use it and stays for the next) is a part of its own, though the
     player waits for it with that level: give it a folder `--over` the
     part beneath, and give each part that uses it `--over` it. Kept
     inside each of them, its bytes would be counted once for every
     part.
5. **A program that replaces the whole of memory** needs no `over`. Run
   its file's unpacker in the simulator over memory filled with two
   different values before trusting its snapshot: whatever the unpacker
   does not write is the program before it, not this one.
6. **Memory the machine switches in by banks** holds more than the CPU
   sees at once, and the game reads some of it where it shows: a
   cartridge's ROM banks, or a 128K machine's RAM banks. Each bank is
   then a part of its own, seen by the part the code runs in; a range
   the game copies into RAM is counted in the part it lands in. The
   platform's `steps` skill names the tool that makes them ("media" for
   a cartridge, "snapshot" for a machine's RAM banks).
7. **Code the game reads from the disk during play**, a page at a time
   into whichever buffer is free, as an interpreter reads its story, is
   a program at addresses of its own. When the kit has a folder for its
   machine (`kit/zmachine/` for Infocom's), make it a virtual part,
   `parts.py add <game dir> <id> --machine <kit> --size <bytes>`, and list
   it from its file as that kit's skill says; the interpreter is a part
   of its own, and a page that reads the story's pages in the
   interpreter's memory lays them over the interpreter's listing. When it
   has none, give `game.json` a row under `coverage.virtual`, `[bytes,
   what it is and where it comes from]`, and the About and Source tabs
   show it beside the figure, so that 100 % says what it is 100 % of.

From here on, every script that takes a game's folder takes a part's in
its place.

## Outputs

A folder under `parts/` for each part, with its `part.json`; the
snapshots of each in its own `work/`; the route to each in
`orientation.md`; and, for code read from the disk during play, a
virtual part, or a `coverage.virtual` row in `game.json` when the kit
cannot list it.

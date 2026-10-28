---
name: zmachine
description: Infocom's Z-machine, the computer its games were written for, on every machine they were sold for - taking the story file out of a game, the kit's reader and disassembler for versions 1-8, Bocfel with the kit's trace, and checking the reader against what ran. For any game whose code is a Z-machine story, whatever its platform.
---

# The Z-machine

Infocom wrote its games for a computer of its own, the Z-machine, and
sold each one with an interpreter for the buyer's machine. The game is
the story file: the same bytes on an Apple II, a C64 or a PC, and the
same program under every interpreter. So the platform's tools explain
the interpreter, and `kit/zmachine/` explains the story, for every
platform. The story is a binary, the game whole: it stays in the game's
`work/` and is never committed.

| File | What it does |
|---|---|
| `kit/zmachine/story.py` | the story: header, memory map, text, abbreviations, objects, properties, dictionary, the encoding of a typed word |
| `kit/zmachine/zcode.py` | the instructions of every version: the opcode table, decoding, the text of an instruction |
| `kit/zmachine/bocfel.py` | Bocfel, the interpreter: installs it into `tools/` with the kit's trace and runs a story |
| `kit/zmachine/ztrace.py` | reads Bocfel's trace: shows it, checks the decoder against it, sums it up turn by turn |
| `kit/zmachine/map.py` | a story part's symbol map from the story's own structure: its tables, routines and strings, with comments from templates |
| `kit/zmachine/cpu.py`, `snapshot.py` | what `listing.py` reads a story part through: the instructions at five-digit addresses, and the file as the image |
| `kit/zmachine/zasm.py` | a small assembler, for the kit's test stories |
| [reference.md](reference.md) | what changes from version to version, with the Standard's sections |

The rules are the Z-Machine Standards Document 1.1's
(https://inform-fiction.org/zmachine/standards/z1point1/). Consult
[reference.md](reference.md) and the Standard; do not recall them.

## Taking the story out

The interpreter reads the story from the disk, so the platform's disk
tools take it out (the platform's `steps`, "media"): the interpreter's
own loader, traced, says which tracks and sectors hold it and in what
order. `games/apple2/zork-i/orientation.md` is a worked example.

The story is whole when `python3 kit/zmachine/story.py work/story.z<N>
header` shows a version from 1 to 8 and the release and serial number
the game prints (its `version` command, where it has one), and, from
version 3, when the header's length is the file's and its checksum is
the sum `story.py` makes. Versions 1 and 2 have neither in the header, so
compare the file, page by page, with the story's pages in the
interpreter's memory in a snapshot.

## Running it

```
python3 kit/scripts/tools.py get-bocfel                    # once: download, check, build (kit/zmachine/INSTALL.md)
python3 kit/scripts/tools.py bocfel run work/story.z2 --commands work/walk.txt \
    --trace work/walk.trace --seed 1
python3 kit/zmachine/ztrace.py check work/story.z2 work/walk.trace
python3 kit/zmachine/ztrace.py turns work/story.z2 work/walk.trace
```

Commands come one a line from the file. Bocfel's patches to Infocom's
games and its configuration file are off, so what runs is the story as
it shipped; `--seed` fixes the random numbers, so two runs of the same
commands give the same trace. Keep the commands file in `work/` with the
trace: it is the recording a page's claim rests on.

**Check before you read.** `ztrace.py check` decodes again, from the
story file, every instruction that ran and compares it with what Bocfel
did: operands, branch, store, the text a print printed. A listing rests
on the decoder only when it reports none where they disagree.

`turns` gives each turn's instructions, calls, routines, and the objects
and attributes it changed. With `--resident PAGES --buffers N` it also
counts the pages an interpreter that keeps the first PAGES pages in
memory and N buffers for the rest, least recently used first, would read
from its disk: the platform's interpreter says what PAGES and N are, and
the pages a snapshot holds test the model.

## Words with two characters of another alphabet

A typed word is looked up by its encoding ([reference.md](reference.md),
"Text"). In versions 1 and 2 a dictionary word uses a shift lock where
two characters in a row come from the same other alphabet, two digits
for instance, where other text may shift once for each (Standard 3.7.1).
An encoder that always shifts once never finds such a word.
`story.encode` and Bocfel lock; Frotz 2.55 shifts once, and does not know
them. When a version 1 or 2 word is reported unknown, check with `python3
kit/zmachine/story.py work/story.z2 word <word>` before believing the
game lacks it: it may be the interpreter.

## Listing the story

The story is a part of the game of its own, of kind virtual
(`kit/skills/core/15-parts`, step 7), beside the interpreter's part:

```
python3 kit/scripts/parts.py add <game dir> story --title "The story" --machine zmachine --size <file's bytes>
python3 kit/zmachine/map.py <game dir>/parts/story work/story.z<N> --trace work/walk.trace
python3 kit/scripts/listing.py <game dir>/parts/story work/story.z<N>
```

`map.py` lays the story out from its header and describes every table
it knows the shape of; what each routine does, what each global holds,
what each string is printed for, and the game's own tables are the
run's to write, in `symbols.json`, as for any listing. Run it again
after a trace shows a routine it missed: what the run wrote stays.

A version 1 or 2 story's header gives no length, and its file can run
on past the story, with padding or a stale buffer written out again.
Find where the story's own bytes end (the last string the story names,
and what follows it compared with the story's earlier pages), and give
the part's coverage an exclusion from there to the file's end; `map.py`
stops there.

Infocom's source survives for many of its games, mostly of later
releases than those sold on disk. A name from it goes only where the
release's code does the same job in the same steps; the rest are the
run's own, in lower case, so that they can be told apart.
`original-source.md` says which release the listing is read from and
which the names come from.

## Where the kit stops

Version 6's screen model needs Bocfel's Glk build, which the kit does
not make: the decoder reads version 6, and nothing runs it.

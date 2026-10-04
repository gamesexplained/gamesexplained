---
name: 40-sweep
description: Cheap mechanical sweeps that convert large regions from unknown to understood in one pass (a hardware register census, a string sweep, a twin-copy check and, when another version of the game is documented, a map of that version onto this image). Also how to start from an analysis the contributor already has. Run early, and again whenever the burn-down stalls.
---

# Sweeps that find what code-reading misses

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
Before describing a region, compare the two byte for byte and trace their
producers and consumers separately. Equality establishes a twin, not an
unread copy: runtime dictionaries, buffers and saved frames can still match
an initialization seed. A changed byte can identify a runtime write, but an
unchanged byte is not proof of non-use. Name an unproved consumer as open.

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

## An existing analysis of this image

A contributor may already have analysed the game outside the kit: a
commented disassembler project, a text export of one, a listing from
another tool. It is a starting point for the run, not a run: it places
the program in minutes, and every step after it still happens. However
careful it looks, nobody has checked it here, and an analysis whose
maker is unknown is in the position of a run on an unproven model.

1. **Boot the game and take the snapshot** (`10-orient`) as for any run.
   The listing is built from a machine state someone else can reach from
   power-on by following `orientation.md`, never from a dump the
   analysis came with or a composition of files that were never in
   memory together. Compare the analysis's bytes with the snapshot's and
   say in `orientation.md` where they differ.
2. **Import the names and descriptions into the disassembler**, onto
   that snapshot, then export `symbols.json` and build the listing with
   `listing.py` as usual. A converter may write `symbols.json`; it never
   writes `listing.json`, which comes from `listing.py` alone so that
   every game's Source tab has one format and the next run can continue
   it. `symbols_import.py` fills uncovered memory ranges as `Undefined`;
   otherwise the disassembler can default omitted runtime buffers to
   code and invent references from their contents. Do not fill gaps as
   typed data: that can enlarge annotation spans and inflate coverage.
   Only explicitly
   declared code ranges are imported as instructions. Check the imported
   types against the captured state before trusting regenerated labels.
3. **Coverage is measured by the same rules** (`50-coverage`): runtime
   state out of the denominator, one description per routine or table,
   spans as the ledger draws them. An imported description counts like
   any other; one pasted over many symbols counts once. Take `coverage`
   in `game.json` from the game, not from the analysis's address range.
4. **Verify as usual** (`60-verify`). A claim the analysis makes is
   unverified until it is traced or observed here. The analysis's own
   notes of what it tested are a lead to a check, not the check.
   Rerunning a decoder the analysis came with shows that it reproduces,
   not what it means: test a decoded format with a decoder of your own,
   against whole records.
5. **Record the import** in `game.json`, beside the run's own model:

   ```
   "imported": {
     "source": "<file name of the analysis>",
     "sha256": "<its hash>",
     "tool": "<what made it, with the version>",
     "by": "<GitHub login of whoever made it>",
     "model": "<the model ids that wrote it, as their sessions named them; none if a person wrote it by hand; unknown>",
     "date": "YYYY-MM-DD"
   }
   ```

   `models.py check` holds a Silver game with an import to a maintainer's
   check (`kit/CHECKING.md`) unless every model named there is proven;
   `none` and `unknown` never are.

The analysis file itself is not committed: `symbols.json` and the
listing carry its names, comments and bytes, and its hash in `game.json`
says which one it was.

## Outputs

Register table and string list in `facts.md`; a build identifier if one
exists (record it in `game.json` as `build`); strings labelled in the
disassembler.

# Zak McKracken and the Alien Mindbenders — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage of the program in memory, `facts.md`, a checked
sample of the listing's comments, every feature confirmed, traced or
open, and the minisite built: How it works with a player for all four
tunes and all 117 sound effects on the game's own code, Discoveries,
Maps with all 58 rooms, Graphics with all 37 costumes, and Source code.

- **Gold** needs a human to curate the copy, section by section
  (`AGENTS.md`, "Definition of done"). When the first pass begins,
  `steward` names them and `tier` becomes `silver-claimed`.
- **Platinum** needs a Play tab that is the whole game: the interpreter
  and the program around it ported to JavaScript and run in lockstep with
  the game's own code (`kit/skills/core/70-minisite/play.md`). Here that
  means the SCUMM interpreter, the room and costume drawing (both ported
  already, for the Maps and Graphics tabs), the sound engine (run on the
  kit's 6502 already) and the disk reads, with the scripts read from the
  two game sides.
- **An audit of the whole listing** is recommended: the sample found 11
  of 60 comments wrong (18 %, `parts/main/facts.md`, "The listing's error rate"),
  and a checker misses some (`kit/CHECKING.md`).

## Coverage

Both parts are 100 % covered: the program (main) and the music's own
program, sound 1, which the game loads to `$C300` (music). One thing the
game runs is outside the listing and counted in `coverage.virtual` in
main's `part.json`: the scripts, 116,884 bytes of SCUMM code on the two
game sides, which the kit cannot list until it has tools for that
machine.

## Open questions

The ones in `features.md`, "Open questions": which scenes tunes 102, 103
and 104 play over, and what the index entries for scripts 56, 57 and 154
point at. The features still open (the copy protection's codes, the
money, the lottery, the mazes, the sound key) are all in the scripts.

## Ideas

- A script viewer: the SCUMM scripts decoded from the disk and shown
  beside the opcode handlers that run them, so a reader can follow a
  verb from the click to what happens.
- The rooms on the Maps tab joined into the world's map, with the places
  named (the airport, the mazes, Mars), and the room's entry and exit
  scripts shown when it is decoded.
- Names for the sound effects, matched to the scripts that start them.
- The walk bug shown live: a script that tells an actor to walk to an
  object it carries, run in the emulator.
- The iris that closes and opens round a change of room, drawn from
  close_room (`$D61E`) and open_room (`$D645`).

## next · 5 October 2026 · Wasteland · air with Claude

**A reader of the disk can be more right than the game.** Wasteland
keeps its maps in raw sectors, and its loader goes on to the track below
at the logical sector a table gives, a table it reads one entry off. The
disks were laid out by the same rule, so the game agrees with itself. A
reader of the run's own, written from the format, read five of the 42
maps from the sectors a full track would give, and an annotation agent
had already built a claim about tile sets on one of them. Every map was
then loaded by calling the game's own map loader from a stub, as
`10-orient` says, and the reader was checked against that load for all
42, not one.

**A load that several levels share is a part of its own.** Nine tile
sets serve 42 maps: the game loads one with the first map that needs it
and keeps it while the next map uses the same set. Kept inside each
map's part, a tile set would have been counted once for every map that
uses it. `10-orient` now makes such a load a part, between the levels
and the part beneath.

**An unpacker runs on past its data.** Wasteland's location modules
and maps are unpacked by a routine that stops at the end of its read
window, so after each module's real bytes it writes the next file's
packed bytes, or a sector's filler, decoded with the wrong table: module
3 is 37 bytes followed by 344 of that. The same module read from two
disk sides agreed on its code and differed after it, and a trace of the
unpacker's input gave where each stream ends. `50-coverage` now says how
to find the end before describing what follows it.

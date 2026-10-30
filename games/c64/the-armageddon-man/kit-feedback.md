# The Armageddon Man — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": every widget that runs the game's arithmetic got a port and a test against the game's routine in the kit's 6502, and the satellite test showed the listing's comment on `in_cover` putting the satellite's reach one pixel too far.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format from templates": the sample drew 20 of its 80 from the 446 comments two scripts wrote, as a stratum of its own, and the template that was wrong was corrected in all 44 comments it wrote at once.
- `60-verify`: "A wrong comment is usually one belief written down more than once": each of the 13 wrong comments was searched for in the rest of the listing, and the comments that said the same were corrected with it.
- `70-minisite`: "So load it and look at it before calling this step done": the screenshots showed the satellite map's crop carrying the mouse arrow, and the page now draws it with the sprites off.
- `10-orient`: "an obstacle to get past efficiently, not the subject": the disk's protection was passed by writing its pass page in at one stop, and the loader was left unannotated.

## What was changed in the kit

Nothing.

## Candidates

**A "never" in a table used as a number.** The event ladders use a level
of 0 to mean an event a country never starts, and the search skips it.
`relations_init` takes the same table's event 20 level as the centre of
each starting hostility and subtracts a random 0 to 15 from it as a byte.
The listing's comment on it was right, and still nobody had asked what
the sentinel does there: Libya's level is 0, so its starting hostilities
wrap round to 241-255 about half the time and most games begin with
Libya one step from a Total Missile Attack. It came out only while the
Discoveries tab was being written, by looking at which countries have a
0 in that column. A skill would say, in `50-coverage` or `60-verify`:
when a table marks "none" or "never" with a value, find every routine
that reads the table and check what each does with that value, since
code that skips it in one place may use it as a number in another.

## Maintainer asks

None.

## What cost the most time

No change to the kit would have saved it: the most time went on getting
past this disk's copy protection, which fails in VICE 3.10 (the drive
sends back the "fail" page), and the steps past it are in
`orientation.md` for the next run on this game.

## Operating system and tools

Linux x86_64 in a cloud container, no display; VICE 3.10 from the vice-mcp
release v3.14.0 (`v3.14.0-linux-x86_64-gui.zip`), regenerator2000 0.9.20,
Node 22. VICE's autostart gave up when the loader left the ROM for `$0330`
("Autostart: aborting" in its log) and left the keyboard ignoring every
key until VICE was restarted; typing `LOAD"*",8,1` by hand avoided it
(`agent-history.md`).

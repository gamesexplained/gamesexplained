# Aaargh! — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The tape

The contributor's tape (the Ultimate Tape Archive's entry 2678) turned out
to be a freezer backup: its BASIC line reads `SYS2075 TRILOGIC V3.1`, the
Expert cartridge's restart. The run followed the restart to its `RTI`,
read the stack it returned with back to the game's own entry at `$8009`,
and restarts the game there for the listing; reaching the frozen moment
again left all of memory the same but for 170 bytes of working state. The
contributor asked for the original release, which was not on their drive;
a disk they added was X-Ray's crack of the same freeze ("THIS GAME WAS
ALREADY FROZEN"), so the run went on with the tape.

At first the run called the tape a crack by New Order, from the NEW ORDER
on the frozen title's top row. The string sweep then found the game's own
list of names, and the title's code that copies it there in black on black;
the correction went into `orientation.md` and the next commit said so.

A one-file program the contributor added later, named as Melbourne House's,
turned out to be the same backup crunched into one file: the freezer's
restart and every byte but working state are the tape's (`orientation.md`).

## The annotation

One agent, in address order: the music driver and effects first, then the
main loop, the monsters, the buildings, the sprites, the city's enemies,
the cave and the title, then the data. Three wrong turns are worth knowing.

- The lizard's branch of the hurt routine loads `#$00` where the ogre's
  loads two variables, and the run wrote up the lizard as unable to die.
  A store checkpoint on the lizard's state in random play stopped in the
  "unreachable" death code: the two bytes are the
  operands of the lizard branch's own loads, the variables themselves.
- `$9EA5`-`$A208` had no reader and looked like scraps until the building
  tables were followed: it holds the 37 building pictures.
- The character set was first excluded whole as runtime. The page that
  draws the pickups needed the bytes, and the parts no routine rewrites
  are authored: they are typed and described now.

Typing three pointer tables as split tables minted stray symbols, which
took a rename-and-clear pass and a forced export to remove.

## The checks

A checker on claude-opus-5-5 sampled 60 comments in two strata (40 by
hand, 20 written by generator scripts) and found 17 wrong: the second
band's sprite slots, which swap, the walks' edges, the volcano's egg, the
hornet's one-sided test, and two whole templates (the cities' unpacker,
which reads on past only some blocks, and the colour RAM comments, whose
writer lists missed the indexed stores). All were corrected with every
comment that said the same; an audit is recommended.

Live tests settled the rest: two players at once, the rounds of three
cities and the volcano with no count of eggs, the cave fight with the
computer playing the other monster, what each pickup is, and the
animation that wraps one pass in four.

## The pages

How it works plays the two tunes and all 26 effects through the game's own
driver on the site's 6502, rebuilds a frame of play, animates both
monsters and rolls a round of cities; Maps draws all nine places with the
game's own builder, after its city picker (without it every building
counted as burning and none was drawn). Chrome's screenshots timed out on
every page, so the pages were checked through their scripts and drawn
offline in node. There is no Play tab; that is Platinum work.

## 4 November 2026: the Graphics tab

A later run, retrofitting older minisites with a Graphics tab, added
`graphics.html`. The monster viewer moved there from How it works, and the
pickups picture went with it. Each move's pace was measured on the kit's
machine model (`kit/c64/machine.js`), playing the game from the listing
with the stick, and then traced in the code: walking a frame a pass, the
punch, flame and eating timers stepping the frame on even counts, dying
counted down from `$1F`. The hornets', the flyer's and the cannon's
pictures were measured the same way. `test_graphics.js` keeps all of it.

Three notes were wrong and are corrected. The third sprite of a monster
was called its punching arm; it is a burst that shows only for a punch
that has power and misses. `$8240` said the cannon's frames 1 to 4 were
burning; they are its aim, which a flame steps on. And it said 6 was a
breaking-up frame; no code sets it.

A run of the long game first took three and a half minutes:
`runPasses(1)` waits up to 100,000 frames for a pass, and when the lizard
died or reached the cave there were no more passes. The test now asks for
a pass within 40 frames and stops when none comes.

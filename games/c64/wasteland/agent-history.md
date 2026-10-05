# Wasteland — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 5 October 2026, the Silver run (claude-opus-5-5[1m])

One session in a hosted Linux container, starting at 02:55 UTC, with 61
subagents on the same model. Aaron uploaded the four sides of the
Electronic Arts release as G64 images and chose Silver, the lookup, the
pull request and the push.

**The disks, before the emulator.** While regenerator2000 compiled, a
G64 decoder of the run's own read all four sides. The last sector of
every track on sides 2 and 4 decoded as bad until the decoder took 258
bytes instead of 260: the trailing off-bytes are not valid GCR. Sides 1
and 3 carry `PRODOS` and `2.0`, sides 2 and 4 empty directories, and
everything else is raw sectors without link bytes. The boot (a C128 boot
sector that drops to C64 mode, `PRODOS`, `2.0`, the fast loader at
`$FC00`, the engine at `$0200-$30FF`, the start-up at `$7E00`) was worked
out from the files before the first boot, and the boot agreed with it.

**The masters refuse to play.** Started from the masters, Start looped
on "INSERT SIDE 1" with side 1 in the drive. The side check (engine
`$1897`) compares the last bytes of track 35, logical sector 8 with
`$ED`, `$CC` and the side; the masters hold `$D7` there and Start sets
`$ED` to 0, so the game plays only from copies its own Utils, Copy makes.
Scripting the copier took longer than anything else in the orientation.
Its prompts are drawn into a bitmap with the game's own six-pixel font,
so the run wrote a reader for that font (its first version read garbage
until it matched 8-pixel cells at every phase), and a stop checkpoint
that the boot script had left armed held the machine inside the loader
at `$FF00` for ten minutes before the copier script noticed. The copies
played.

**Text.** The packed text decoded wrongly twice: the bit stream runs on
from one message to the next within a group, and the engine's alphabet
starts at `$29E4`, three bytes before where the first reading put it.

**Sixty-four parts.** The first plan had thirteen: the engine, the
start-up, the utilities, the game, the Ranger Center, the party order,
five location modules, the radio and the death screen. A decision card
asked Aaron whether the 42 maps should be parts or be described as data,
and the work went on with its recommendation, parts. His message saying
that a part was likely a location in the game, sent at the start, reached
the run only at its end; it said the same.
The nine tile sets became parts too, each between the game and the maps
that use it, because the game keeps a set while the next map uses the
same one. Every map was put in memory by a stub that calls the game's
own `enter_map`, and the pages and stream each load writes were measured
with two fills of memory.

**The loader's table.** A reader of the run's own, which followed the
format, read five of the maps differently from the game's own load: the
loader enters the track below from a table it reads one entry off, and
the disks were laid out the same way. An engine annotator had already
written that three maps used another tile set, from the wrong bytes; the
comment and the reader were corrected, and all 42 maps compared.

**The ownership bug.** The radio and the death screen load over the
game's first pages and call the rest of the game. `parts.py` took those
pages away from the game, so the game's export dropped what an annotator
had written there, which the annotator found from the export's own
exclusions. The fix (a part keeps its own ranges) went into the kit with
a test, and the annotator wrote the lost names again from its log.

**Annotation.** Twenty-one agents on disjoint ranges: six on the engine,
four on the game, one each on the start-up and the utilities, two on the
Ranger Center, three on the modules, the order, the death screen and the
radio, one on the map format, one on the tile sets, and two on the maps'
own code. Every report had one claim spot-checked against the bytes
before it was used. Twin copies turned up across parts: the Ranger
Center's last 2.5 KB is the radio's file, the radio's tail is the game's
own bytes, and the start-up and the utilities each hold most of a page
of the engine's code; each is described as a leftover.

**Side 3.** Booted alone, side 3 jams the processor at `$2931`. Its boot
sector is named "A JERKVISION PRODUCTION", and its start-up is an older
build that expects an engine its disk does not hold; run over side 1's
engine it shows the title with older credits and writes no sound
register.

**The restart.** At about 06:59 the container restarted, and every
emulator, disassembler session and agent stopped. Each part's session was
rebuilt from its `symbols.json` and the annotation logs written since its
export, the agents were resumed by message, and the engine's and game's
ranges read 100 % again before anyone wrote. The project files that
rebuild left behind held only the import, which mattered later.

**Live tests.** The credits poster in map 33 and Ken St. Andre's
gravestone in map 1, by putting the party beside them; map 11's wall
with no record; radiation squares by the hour; the idle turn and the
main loop's pace, with the interrupt handler counted as the control; the
attribute roll's broken sort over 32 rolls; armour against radiation;
1,000 attribute rolls and 4,096 pairs of the engine's 2d6; double experience
for melee kills; the throw whose luck bonus wraps below 0 and does 65,532
damage; the pictures' pace; and, last, the joystick, which nothing reads.

**Claims that were wrong.** Caught before they were published, by a
second reading against the bytes:
- the save's checksum model (the carry of the byte add goes into the next
  add), found when the live save did not match it;
- a credit placed at the start-up's `$8037` (it is at `$81AD`), and "no
  other name" in the maps' text (five credited people appear in them);
- the decoded message count, 4,576 (it is 4,920);
- "the start-up makes no sound" (it has none of the title's sounds), and
  a gauge comment that named the destruction of Base Cochise for the
  title's falling bombs;
- the module that loads the Ranger Center "never puts the entrance
  back": the world map's own remote change does, from either of two
  squares beside it;
- the disease byte read as the character's MAXCON;
- map 49's poisoned needle "missing" its target: the member comes from an
  operand the game writes when the Use begins, and the snapshot's 0 there
  was the last value written, not a constant.

**The pages.** Six agents built the page's pieces (the map browser, the
animated pictures, the text decoder, the sounds, the disks and loader,
the dice), each checked against the game's own code in the simulator or
against the emulator; the lead put the How it works page together and
wrote its copy. Three agents wrote the parts' facts files, and one set
the statuses in `features.md` from the reports. The site's build caught a
script's `href` variable as a broken link, and the run found five page
links that landed on no record of their Source page.

**Late kit trouble.** An export from one of the project files the
restart had left wrote 194 symbols over the game's 1,600; the file was
restored from a copy, and `symbols_export.py` now says when an export
holds less than the file it replaces. The radio's figure stood at 88.8 %
because of 17 automatic symbols that the game's code beneath it had
minted in its range; they were deleted, and #213 asks for the export to
leave them out. Three listings rebuilt late from another snapshot of the
same part came out with different bytes, and were restored from git;
#214 asks for a listing to name its snapshot.

**The comment sample and the audit.** Three agents that wrote none of
the comments checked 63 drawn with seed 1988, and 15 had a wrong detail
or were wrong; a first tally said 16, counting one comment's two
problems twice. The kit's answer to a bad sample is to audit the whole
listing, so 22 more agents checked all 11,532 comments: seventeen the
hand-written ones by range, five the generated map descriptions by
template. Twenty could run at once, so the last two started as the first
finished, and a usage limit stopped everything for half an hour. They
corrected 2,441 comments, 424 of the 3,559 hand-written and 2,017 of the
7,973 generated. The generated descriptions fared worst: the check
squares' template had described every record by its flags' commonest
case, and 548 of its 708 comments changed; another template said that
nothing read a byte which a BIT of the game's does read, to no effect,
and four hand-written comments had copied the claim. The corrections
went into a second checkout of the branch and were copied back file by
file, so that no auditor still reading a listing saw it half written.
Each auditor also listed the lines of the facts files and pages that
repeated a claim it had corrected. One claim recurred across them, the
armour roll that a check square or radiation square takes when bit 0 of
its first byte is clear, and the maps' facts were then searched for it
from the records' bytes: 30 lines gave a cost without it. The pages are
assembled from sources in `work/site`; the first corrections went into
the pages themselves, and a script carried them back into the sources
before the pages were assembled again. The decoder that wrote the
generated comments, in `work/`, was not corrected, since nothing runs it
again.

**The second sample.** The first draw had let three comments stand for
the decoder's 7,973, so the second, with seed 6510, drew 20 from them
and three from each hand-written range, and four agents that had written
and audited none of the 80 checked them. They found 3 with a wrong
detail and none wrong: a list of the game's instructions that address a
byte with one left out, an omission five neighbouring comments of the
death screen turned out to share; the skill list's header put on the row
above the one it prints on; and play_sound's last write said to start
the note, which for sound 11 it does not, the gate bit of its control
byte being clear. Each was corrected.

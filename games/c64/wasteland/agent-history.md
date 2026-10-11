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

## 7 October 2026, the portraits (claude-opus-5-5[1m])

One session in a hosted Linux container, no subagents but the one that
checked the comment sample. Aaron asked for a portrait browser beside
each map on the Levels page and a way to download a picture as an
animated GIF, with loops of about 15 seconds. The Silver run had only
five portraits, as packed copies in the Ranger Center's file, so every
picture the maps name had to come in from the disks.

**The disks.** Aaron's images were not in this container, so the four
sides came from the C64 Preservation Project's G64s on archive.org, the
Electronic Arts release marked good. Two checks that they are the same
build: the five packed copies in the Ranger Center part unpack to the
same bytes as those pictures loaded from these disks, and the game's
code in play differs from the game part's listing only in 7 bytes the
game writes. Rather than make play copies with Copy, the run poked `$ED`
to `$D7` around the side check (`$1897`) and back to 0 in play.

**Finding the pictures.** `read_dir_entry` (`$2790`) reads entries from
`$40` up from T35/L9 rather than T35/L10, so the four sides hold 75
pictures among numbers 0 to 78. Each was loaded on every side that holds
it by calling `load_portrait` from a stub, three times: once plain and
twice over buffers filled with `$55` and `$AA`, which give the extent
the load writes. Pictures 0-3 and 59 went to `$E000`, where their
callers ask for them. Each became a part, annotated from the picture
code's own reading of it by a generator in `work/portraits`.

**Where a picture ends.** The unpacker decodes its whole read window,
so a part's bytes run on past the picture into whatever follows on the
disk. The first attempt to say what followed compared directory offsets
across L9 and L10, whose base sectors differ, and named the wrong next
picture for 14 of them; the sector each picture starts in, found in the
window, named the right one for all. The generator's assertion that the
picture's own stream ends one byte past what the code reads failed for
pictures 39, 60 and 62, which carry bytes nothing reads; they are named
as such.

**The checks.** A port of the unpacker turned every window's sectors
into the bytes the load wrote, and `test_portraits.js` runs the engine's
picture code beside the page's port for 400 steps of each portrait.
Neither found a difference. An agent that wrote none of the parts'
comments checked 20 drawn with seed 7581 with a decoder of its own, and
found all 20 right; two wordings it called loose were changed in the
generator, and the comments written again from it into each part's
`symbols.json`, so the disassembler projects in `work/` hold the old
wording until `symbols_import.py` seeds them again.

**The GIF.** The channels of a picture come back to their start only
after tens of thousands of steps, so a GIF runs from the base frame to
the first step from 100 on where the picture looks like the base frame
again. Every picture has one within 600 steps; most loops are 14.5 to 23
seconds, the title's 43 and the Grim Reaper's 49.

**Wrong turns.** A background chain that waited on `pgrep -f` for a
batch to finish matched its own shell and waited forever.

**Out of the Source tab.** After the merge, Aaron asked whether a
portrait is a part at all: the kit's part is a load the player meets,
and the pictures are there to be enjoyed, not read as listings. The 75
parts went, and the How it works and Levels pages each carry the
pictures' bytes as base64, from the buffer's start to the last byte the
picture code reads, about 100 KB a page. The bytes were checked against
the load on every side that holds each picture, a port run from them
alone animated the same as from the whole buffer, and
`test_portraits.js` reads them from the page. The generated comments,
and the sample that checked them, went with the parts.

## 8 October 2026, the NPCs (claude-opus-5-5[1m])

Aaron asked for the feature where NPCs refuse requests, then for a cast
of the NPCs in general, with the weight on what the manual and play do
not show.

**The refusal.** The engine's comments already named npc_obey_check
(`$0D61`) and said its target was 15 + 5 × the byte. The page's port,
written from that comment, disagreed with the original code on the
simulator in 15,280 of the first cases. Stepping the original showed the
target at `$71/$72` was 15 with a byte of 1: the TAX at `$0D6D` comes
before num2_clear, which returns X = 0. With the port following the
code, every case agreed. The comment had been read off the routine's
shape, from skill_check and attribute_check, which load X after the
clear. On the original side 1 at the title, a stub calling `$021F`
showed the same 15 after every call. The engine's comments were
corrected and the listing re-commented.

**The cast.** Each record's last skill pair holds a number from 36 up at
level `$FF` for nine of the fourteen. The maps' own comments already
called these markers. Counting the squares that ask for them from the
bytes, rather than from the comments, gave the table's column; one
square in map 41 asks for a skill 129 that nobody holds, which the test
leaves aside. Dan Citrine's 37 is asked for by 87 squares, 83 of them
far from Quartz with skill 37 as their only pair. Per Jorner's guide
already describes the effect (page 81), so the page credits it and adds
the cause and the counts. The game's square_checks ran map 1's cactus on
the simulator with a party of a Ranger and Dan, which needed the zero
page a map load leaves (`$55`, `$56`, `$61/$62`, `$63`); without them
square_action_record found no record and the check returned at once.

**Wrong turns.** The first count of the squares counted the words
"difficulty" in the listing comments, which also say "at a difficulty
above 0" for Dan's marker; counting pairs from the bytes fixed it.

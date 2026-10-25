# Balloon Fight — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 18 October 2026: orient

The platform was new, built on the branch this game's branch comes from
(`kit/nes/`, `kit/skills/nes/`, `site/lib/nes.js`), so this is the first
game run on the NES. The emulator checks passed (36 of 36) before the
cartridge went in. The cartridge booted to the title screen within a
second and Start on the first option began a one-player game straight
away; no loader, trainer or menu to get past. The hand-over, title and
first-phase play snapshots were saved, the ROM was found identical at the
hand-over and in play, and the file's PRG and CHR were matched byte for
byte to the CPU's and the PPU's memory. regenerator2000 started on the
play snapshot in its NES mode and traced from the three vectors.

## 19 October 2026: features, coverage, verify

With the lookup allowed, the booklet's scan on the Internet Archive gave
the rules and the scoring table; StrategyWiki, Wikipedia and Data
Crystal the rest; The Cutting Room Floor and NesCartDB refused the fetch.
The whole 16 KB was read in eight 2 KB dumps from the disassembler and
annotated in one pass, RAM first; the ledger reached 100 % after the
automatic symbols inside the tables and the RAM arrays were described
too. Two wrong turns: typing the split pointer tables `lo_hi_address`
minted bogus symbols in the middle of routines (the disassembler
pairs each half-table with its label, not with the other half), so they
went back to bytes; and the sound effects were named from the request
bits as the callers set them, which the driver reads in another order.
Recording every request bit from a paused game, where only the NMI
runs, showed which routine answers which bit and corrected five names;
the same recordings then held the page's driver port to the emulator
write for write. The sample check found 13 of 60 comments wrong, three
of them the kind a reader of one routine makes (a spring read as
easing, a 0 that ends a stream read as a rest, two register blocks
swapped), all corrected with their repeats. The flight port's first
version ignored the three-frame input cycle and the idle-action lockout
and failed; the second mirrors `actor_animate` and matches over 35,000
frames.

## 19 October 2026: minisite and retrospective

The sound player runs the game's driver on the kit's 6502 with a hook at
every store to the APU, through a new model of the chip in
`site/lib/apu.js`; its writes matched the emulator's recordings for every
tune and effect. The phase renderer reads the layout records as the
game does and matched the emulator's screen for all sixteen indexes once
the propeller quadrants and the bonus round's sprite palette were read
right. The flight widget is the game's flap and physics, tested in
lockstep. The pages were checked in headless Chrome. The run ends at
Silver with the one sample over the mark and an audit recommended.

## 21 October 2026: the Play tab

The NES had no `machine` and no `lockstep` row, so they were built first,
on the C64's pattern: a PPU register model shared by the page and the
kit (`NES.ppu` in `site/lib/nes.js`), an NES around the kit's 6502
(`kit/nes/machine.js`), held to jsnes from five snapshots of play for
6,500 frames, and a frame-based lockstep (`kit/nes/lockstep.js`). The
port was written routine by routine from the listing: the 22 routines
that wait for a frame as generators with a checkpoint at every call, the
rest as functions, and the sound driver left as the game's bytes on the
kit's 6502. Each plain routine was checked alone against the game's on
up to 150 real call states recorded from a 150,000-frame session
(`work/port/check.js`), then the whole in lockstep from the reset vector
with a pilot through every mode. The pass had to move from the wait's
RTS to the DEC before it, since a branch returns through that RTS too.
Three real mistakes the lockstep found: a lost player's lives drawn from
the wrong byte, a demonstration player steered like a bird, and the
propeller push's branch. One difference survived in 100,000 frames, the
twinkle counter's INC against the handler's DEC on a lagging frame, and
`irqBytes` closed it. The port showed seven comments wrong in a detail
(the fish's two frame tables and flag, misnamed; the spark's right-edge
test; the propeller's swirl and its two slips; the lives row of a lost
one-player game), corrected in `symbols.json`. The page's clock charges
each stretch its median cost from the lockstep and holds the pace within
1 % of the machine's over 12,000 frames (`test_pace.js`). The levels
page had carried the whole PRG ROM as its data; it carries the data-only
image now, as the Play page does.

## 24 October 2026: new pictures for the Play tab

The contributor asked for the Play tab to keep the game's play and lose
Nintendo's pictures, because Nintendo takes down fan recreations. Every
tile the Play page draws is new: a blue cat for the player, blue frogs
for the birds, a green sea serpent for the fish, a thin 5 by 7 font, and
striped block lettering, clouds, platforms, water, propellers and vents
of their own. They were drawn as text pictures in `work/art/` and cut
into tiles by the game's own tables (the actor layouts with their X
offsets, the bolt, spark, splash and popup tiles, the propeller's four
positions), with a check that a tile drawn twice comes out the same. A
second check (`work/art/check.py`) holds that every tile the game can
show is drawn, 206 sprite tiles and 133 of the background's, from the
tables and from 80,000 frames of the pilot, and that none equals the
cartridge's. The pictures cannot change the play: the game reads the
PPU back only from the nametables and the attribute table, never the
pattern tables, and there is no sprite 0 test. `test_play.js` and
`test_pace.js` pass as before. Taking pictures of Balloon Trip showed
that the phase picker's Balloon Trip button stopped on the title: its
start script let go of Start before the cursor reached the third line.
It now waits for the cursor and holds Start 20 frames later.

## 25 October 2026: brought up to the kit of that day

The branch was cut from kit 0.0.199 and moved onto 0.0.236 before its
pull request. Four changes in between touched this game. Platinum now
means a Play tab that is the whole game, checked against the game's code
by a `test_play.js` beside the page, and this game's is, so its tier is
`platinum`. Every Play tab's CRT screen now starts on. A live sound
queue must hold half a second: the NES's held four frames and dropped
the oldest when more came, which is the skipping the site's other chips
were fixed for, so `site/lib/apu.js` now holds 31 frames and plays an
older frame's writes at the start of the next instead of losing them.
The C16 had added `ioPages` to the kit's 6502 for the same need as the
NES's `map`, so the NES uses `ioPages` and a new `romPages` for its
cartridge's ROM, and `map` is gone.

## 25 October 2026: the pages rewritten for a reader of fifteen

The kit added a last copy step, a rewrite of every authored page for a
reader of fifteen who has never programmed (`70-minisite`, "ELI15
pass"). How it works, Discoveries, Maps / levels and Play were
rewritten: each term explained where it first appears on a page, long
sentences split. A second agent compared each page with the version
before, sentence by sentence. It found no fact lost, and five added
explanations that were wrong or loose (the program's size, when the
PPU can be written, the sprite-zero hit, the reset vector, the pattern
tables as part of the PPU); each was corrected. The check also showed
a claim older than the rewrite to be wrong: the flap's sound is not
"half volume with a downward sweep". Rendered from its four bytes on
the page's model of the APU, it is a quiet pulse at a fixed volume
whose pitch rises from 440 Hz to about 660 Hz in 90 ms, which is what
the sweep's negate bit does. The Play tab's year read 1986, the
American release; it now reads 1985, as `game.json` and the other
pages do.

## 25 October 2026: mods on the Play tab

Zihe asked for a Play tab with more to switch on, and chose all four
groups offered: cheats, flight, a look inside, and rewind with a
Balloon Trip ghost. They live in `reference/bf-mods.js`, apart from the
port, and each works through the game's own state: the shield sets the
game's invulnerable flag only while the two hit routines run (the flag
also flashes the player and, in Balloon Trip, drags the player along
with the scroll), calm skies keep the storm's counter above the value
that starts a flash, the fish's search finds no one, the lives byte is
held at 2, and gravity scales the game's own table.

Rewind needed a saved state, and the port is generators, which cannot
be copied. At the top of the phase loop and the trip loop the port's
stack holds only start_game's loop above it, so `bf-play.js` saves the
RAM, the PPU and its clock there and resumes with a generator that
enters the loop and carries on as start_game and main would. The first
test of it failed after 430 frames: the test's controller had
overwritten the start script, so the game saved was the title's
demonstration, whose phase loop returns to the title rather than to
main. States are now refused in the demonstration. `test_mods.js`
restores states from phase 1, phase 10 and Balloon Trip and finds the
copy identical to the original, byte and pixel, for 3,000 frames; each
cheat is played beside the same game with the cheat off, so a check
cannot pass because nothing happened. The fish's first control woke
the fish once in 9,000 frames, so it was given a controller that skims
the water. In the browser, the ghost first never appeared, because a
run cut short by a restart was thrown away; a restart now ends the run
as a fall does.

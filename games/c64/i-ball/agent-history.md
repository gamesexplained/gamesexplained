# I-Ball — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 26 October 2026, claude-opus-5-5, for JWacks

**Setup.** The cloud container could not reach the Ubuntu archive or
crates.io until the contributor allowed four domains. Even then
`apt-get download` fetched nothing, so the emulator's missing libraries
were fetched with `curl` from the archive's pool and unpacked into
`tools/vice-libs`. `cargo install` needed the proxy and its certificate
bundle given on the command line.

**Booting.** The image is one program file that loads at `$0314`. VICE's
autostart and a KERNAL load both hang: the file overwrites the IRQ vector
while it is still loading. The run wrote the file into RAM with the ROMs
switched out and set the vector last, then took snapshots at the game's
first instruction (`entry.vsf`), the title (`title.vsf`) and level 1 in
play (`play.vsf`).

**Annotation.** Four raster interrupts and a speech NMI. regenerator2000's
own disassembly left blocks half-typed, so the code runs the emulator had
traced were typed as code explicitly. The first pass wrote "a frame" for
anything the logic interrupt does; counting checkpoints showed that
interrupt skips frames when busy, and 31 comments were corrected to say
"logic pass". That is also why the level timer runs slow, which became the
first discovery. The first measurement of it was wrong: 600 frames
from `play.vsf` took in Iball materialising and the level's opening
word, when the timer stands still, and gave "50 timer seconds last about
75 real ones" for a quiet screen. Counting again only while Iball was
alive and no sample played showed the timer keeping time on a quiet
screen and running at about half speed with seven aliens; every claim
was corrected to those figures before the pull request.

**Live tests.** The title's speech keys turned out not to be the ones
C64-Wiki gives (I starts a game); the keyboard tests drive seven rows at
once, so whole columns of keys share a job. The Smart Missile scored 70
with no alien on screen.

**Checking.** A fresh agent on the same model checked 80 comments (seed
20261026): 6 wrong in a detail. The first checker launch, on another
model, failed for want of usage credits and was run again on
claude-opus-5-5. Recounting the music patterns with the driver's rule
corrected 12 more generated comments.

**The site.** Five tests hold the page's widgets to the game's code. The
disc test caught the page saying a death on a checkpoint's own place takes
an extra away (it takes nothing: the extra was not given yet), and the key
test caught the up key's test listed at the down key's address.

**Pushing.** The git proxy refused the contributor's fork until it was
attached to the session near the end of the run.

## 4 November 2026: the Graphics tab

The page gained a Graphics tab: Iball's roll, a death and materialising
run by the game's own `death_step` and `materialise_step` on the kit's
6502, the seven alien kinds forming, turning and exploding, the panels
with the timer and meter run by `timer_tick` and `shield_meters`, and the
title's friends. How it works drew no sprites, so nothing moved; its
aliens section links to the tab. `test_graphics.js` plays the game on the
kit's model of the C64 for 20,000 frames and holds the tab to it. It
caught two errors in the first draft: explosions drawn in multicolour
(`alien_shot` clears the bit), and the pieces of a death flying at a
steady 10 pixels a frame (the page had not given `death_delay` the 2
that `materialise_wait` leaves). Glow Ball's colour step on the title
was found while drawing the friends, from the reference screenshot's
colour.

## 0.0.291 · 2026-11-02 · Rambo: First Blood Part II (C64) · air, claude-opus-5-5

**A music player whose every write matched the game's was silent.** The
Rambo page's test compared its driver's writes with the game's code,
frame by frame, over 22,377 frames, and passed, while every one of its
24 buttons played nothing: the game sets the master volume once, at
start-up (sound command 25 with X = 15, at `$C1BA`), and the page's
buttons began after it. Time Tunnel's effects had the same fault the day
before, and a run of every button on the site through the player's own
AudioWorklet (`kit/c64/sid_check.js`, 1,013 buttons on 104 pages) found
it again in all six of Short Circuit's tunes (`lda #$1F / sta $D418` at
`$955C`, before the attract mode) and in the first four and a half
seconds of Labyrinth's jingle, which sets `$D418` only at frame 225
because the game plays it after other sound. The same run found Lethal
Weapon's driver stopping in the worklet, which has no `atob`, though its
test, run in node, which has one, passed. The writes a driver makes are
not what a reader hears: what decides that is the chip's state before
the first write, and the scope the driver runs in.

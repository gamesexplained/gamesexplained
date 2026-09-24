# Master of Magic — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-09-24: the first run, on Linux

The first run of the kit on Linux, in a cloud container with no display.

**Tools.** The vice-mcp release could not be downloaded from where the
run was, so the emulator was built from source. First `air/vice-mcp`'s
`fixed` branch, then, at the contributor's request, the latest
`barryw/vice-mcp` with the two pull requests still open (#20 frame
advance, #24 step on a held machine) merged locally. Both passed 54 of
56 checks. The two failures were in the check script, not the emulator:
`stopwatch` compared cycles with the wall clock and caught VICE catching
up after the previous check's busy checkpoint had slowed it to 78 % of
real time; `determinism-running-save` armed a stopping checkpoint on a
running machine and set its ignore count in a second call, and on a host
where a call takes 16 ms the checkpoint usually fired in between. With
the script fixed, 56 of 56. While this was going on the two pull
requests were revised and merged upstream as v3.13.0, which was built
and measured again: 56 of 56, and that is the build the game was done
with.

**Getting in.** The image is Remember's crack: an intro, a docs reader
with the tape inlay's text, the tape's loading picture, and a two-question
trainer. The docs reader was the best manual this run had. A scripted
boot stops on the trainer's first instruction and on the game's own
entry at `$07F9`; the trainer's patch addresses were the first map of the
game's variables (`$4EC5`, the player's body strength).

**A wrong turn with the keyboard.** The first boot script held N down
through `vice_keyboard_matrix` inside a helper that failed before its
release. The key stayed down in the emulator across every snapshot load
that followed. For the next hour the KERNAL's current-key variable `$C5`
read `$27` (N) whatever was pressed, and B on the controls screen and M
in the menu "did nothing". The first explanation written down was that
no interrupt ran the keyboard scan on that screen. The tell was `$C5`
never changing; releasing N made both keys work at once. The kit's
vice-mcp skill now says to release keys in a `finally`.

**The shape of the code.** A flow trace from the entry, the restart, both
interrupt handlers and the music entries covered about 10 KB, then
stopped at a self-modifying `JSR` in the main loop (`$0846`), the menu
dispatch. Typing its eighteen-entry handler table and tracing each
handler made the code contiguous from `$07F9` to `$2F52`. The tracer also
wandered into the title scroller's text (a run of spaces is `JSR $2020`)
and traced the RAM under the ROM routines the game calls; both were
undone.

**Coverage.** About 45 KB of the image is the game. Ten agents took
disjoint ranges: five over the engine's code, one for the title,
demonstration, music driver and the RAM under the KERNAL, and four over
the data (variables and the top band's font, the text and property
tables, the pictures, the map and the bottom band's bitmap).

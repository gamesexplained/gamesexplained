# Paradroid — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Put the game's own memory editor on the status bar, in place of the score's count-up | `POKE 5092,99 : POKE 5093,13` (`$13E4`/`$13E5`: the main loop's `JSR score_tick` becomes `JSR abmon`) | live: "( abmon : 0010 - 00 )" on the status bar; a press of J stepped the address, and the editor showed the byte there |
| C64-Wiki: "every transfer is won easily" | `POKE 8410,0` (`$20DA`) | differs in this build: `$20DA` is the first byte of `countdown`, and a 0 there (a `BRK`) stops the countdown at 99, so the transfer never ends (live, 4,000 frames) |

The pokes are made with the game in memory, from a cartridge monitor or
the emulator's monitor: the disk's loader starts the game itself, so
there is no `RUN` to poke before. The keys of the editor are in
`discoveries.html`, "A memory editor".

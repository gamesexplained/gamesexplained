# Creatures — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game banks the ROMs out and runs from its own interrupts, so these are
made from a freezer cartridge or an emulator's monitor while it plays, not
typed at BASIC. A torture chamber's poke changes the chamber's own file,
so it is made once the chamber has loaded.

| Effect | Poke | Status |
|---|---|---|
| Unlimited lives in the levels: the instruction that takes a life, DEC $B7BF in `game_frame_end`, becomes LDA | POKE 7328,173 ($1CA0) | live: a lost life left the count at 4 and the Get Ready screen came up as usual |
| The C64-Wiki's poke for the same, which writes a branch over the DEC instead | POKE 7328,208 ($1CA0) | live: hangs the game at the first lost life, with interrupts off and the panel gone; use 173 |
| Invulnerability: `player_hurt`'s LDA $24F0 becomes a three-byte NOP, so the BEQ after it always returns, except when the timer has run out | POKE 15596,60 ($3CEC) | candidate (C64-Wiki), traced |
| Unlimited spare hits: `player_dying_wait`'s DEC $12A0 becomes LDA, so the spare hit is never used up and every touch only stops Clyde, as the first of each life does; water, level 3.2's spikes and the time-out still kill | POKE 44183,173 ($AC97) | candidate (C64-Wiki), traced |
| Unlimited lives in torture chamber 1, 2 or 3: the chamber's own DEC $B7BF becomes LDA | POKE 33734,173 ($83C6, file `TC`), POKE 33952,173 ($84A0, `TF`), POKE 33505,173 ($82E1, `TI`) | candidate (C64-Wiki), traced |
| Number of lives: `lives` | POKE 47039,n ($B7BF) | candidate, from the code: 4 at a new game, the game ends when a life is taken at 0 |
| Go to any stage: the stages run from 1 (level 1.1) to 10 (the ending), 0 being the file `1@`; with one less than the stage wanted in the stage number, X = 0 and the program counter at `stage_next`, the game loads that stage's file from side B | POKE 4770,n-1 ($12A2), then jump to $14AF | live: the route to every part's snapshot (`orientation.md`) |

The game's own cheat, holding CTRL and 2 on the high-score table once the
title tune has ended, does the same as POKE 7328,173 with three NOPs, and
lasts one game (`features.md`).

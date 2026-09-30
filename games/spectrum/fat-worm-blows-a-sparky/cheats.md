# Fat Worm Blows a Sparky — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

Sources: the `.pok` file in the Spectrum Computing archive
(`Fat Worm Blows a Sparky (1986)(Durell Software).pok`, 74 bytes, read
29 September 2026) and the type-in hack on The Tipshop
(`the-tipshop.co.uk`), read 29 September 2026. Both are for this 1986
release. The addresses below are the game's own addresses; the `.pok`
format's bank/size fields are not interpreted here, only its addresses and
values.

| Effect | Poke | Status |
|---|---|---|
| Immunity from bug hits | `POKE 30624,201` (`$77A0` = `$C9`, a bare `RET`) | candidate — not tested live |
| Infinite sparkies | `POKE 30472,0` (`$7708`) and `POKE 41946,0` (`$A3DA`) | candidate — not tested live |
| Immortality and infinite sparkies (Tipshop type-in) | loads a patch at `$FF88`, then `POKE 64249,240`, `POKE 64250,186`, `POKE 64260,136`, `POKE 64261,255`, `RANDOMIZE USR 64242` | candidate — the loader call matches `orientation.md`; not tested live |

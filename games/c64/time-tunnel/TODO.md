# Time Tunnel — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage (48,382 bytes), `facts.md`, the listing sampled and
every step recorded in `accuracy`, the minisite built with a player for all
eight tunes and the seven sound effects, copy `agent-draft`.

## Audit the listing

The one sample found 14 of 80 comments wrong (about 17 % weighted by
stratum, a lower bound), all of them wrong in a detail, and all 14 were
corrected with every comment that said the same. A rate that high means
more wrong comments remain. A full audit, every comment checked by fresh
checkers given the kinds of error the sample found (a movement band one
line short at an end, counts of callers that leave out a `jmp`, what a
run of `pla` takes off the stack, a condition written as always), then a
new sample, would let the Source tab call the listing checked
(`kit/skills/core/60-verify`).

## Open questions

- Salem's room 3, entered on foot after the broom was parked with the
  piece carried: whether `salem_broom_park` (`$2CA5`) moves the gnome 24
  to the right through sprite slot 0. Read from the code and not tried
  (`features.md`, "Open questions").
- The poster of instructions and US Gold's hint sheet that Zzap!64
  mentions: no copy was found online on 31 October 2026.

## For Gold

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is dull,
and adds what the agent missed.

## For Platinum

A Play tab: the whole game ported to JavaScript routine by routine and run
in lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
The Maps tab already runs `room_enter` and the eras' entry routines on the
site's 6502, and the music and effects players run the sound driver, so
the drawing and sound are understood to the byte.

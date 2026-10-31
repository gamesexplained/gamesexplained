# Gunship — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: all eight parts at 100 % coverage (175,490 bytes), `facts.md`, the
listing sampled and every step recorded in `accuracy`, the minisite built
with a player for the title's tune and the flight's ten sound effects,
copy `agent-draft`.

## Audit the listing

The one sample found 15 of 80 comments wrong (about 18 % weighted by
stratum, a lower bound), and all 15 were corrected along with every
comment that said the same. A rate that high means more wrong comments
remain. A full audit, every comment checked by fresh checkers given the
kinds of error the sample found (an instruction or a byte counted from the
wrong end, a rule true for one case stated for all, a table's layout read
wrongly, "set at run time" for data nothing writes, a font code read as the
wrong glyph), then a new sample, would let the Source tab call the listing
checked (`kit/skills/core/60-verify`).

## For Gold

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is
dull, and adds what the agent missed.

## For Platinum

A Play tab that is the whole game: the flight engine ported to JavaScript
routine by routine and held to the game's code in lockstep
(`kit/skills/core/70-minisite/play.md`), with the BASIC around it (the
front end's menus, the briefing, the debriefing and the base).

## Article ideas

- The enemy's own missiles: the eight kinds' speed classes (`$ADF2`) and
  guidance (`$AE12`) beside the helicopter's three, and how chaff, flares
  and the two jammers pull each kind off.
- The scoring at the base (`E`, lines 400-482): points by kind, the
  multipliers for theatre, enemy and style, and the ranks.
- The weather and the wind (`$4F`, `$50`) and what they do to the flight.
- 258 of the flight's branch targets in the Source tab's index keep the
  disassembler's own names (`b_314A` and so on).

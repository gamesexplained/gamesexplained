# Uridium — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage, `facts.md`, every feature confirmed, traced or
open, the listing, and the minisite with the title tune's player, all
agent-written (copy `agent-draft`).

## For Gold

A human goes through `index.html` and `levels.html` section by section
(`kit/style.md`), sets `copy` in `game.json` to what that pass did, and
`tier` to `silver-claimed` when it starts.

## Open

- Measure the listing again: the first sample found 13 % of comments
  wrong, and the audit that followed rewrote 21; a second sample with a
  new seed would say what is left (`kit/skills/core/60-verify`).
- Which drawn obstacles the manual calls meteor shields and
  communications aerials (`features.md`, open questions).
- Entering initials in the hall of fame, played live rather than read.
- The difficulty poke `POKE 13470,n` (`cheats.md`), not tried live.
- Where the C64 side of the loader applies the key byte (`orientation.md`).

## Ideas

- A Play tab: the map builder, the Manta's movement tables and the wave
  records are already ported or decoded.
- A stepper for a fighter's path (`fighter_paths`, `$C648`), drawn over
  the map.
- The giant message as a scroller at the game's speed.

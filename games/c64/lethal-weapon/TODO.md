# Lethal Weapon — TODO

Tier: **bronze**. Everything for Silver is done except one step: the
sample of 60 comments (seed 20261101) has to be checked by an agent that
wrote none of them, then `tier` set to `silver`. The brief is
`work/handoff/sample/BRIEF.md` on the computer that made the run; on
another, draw the same sample again (60-verify) from the three parts'
`symbols.json`.

Coverage: 100 % in all three parts (title, game, ending).

Next:
- Check the sample; correct what it finds; record the `sample` row in
  `game.json`'s `accuracy` and the rate in `facts.md`.
- A full audit later (60-verify), when someone asks.

Ideas:
- One frame of play rebuilt from memory with `kit/c64/frame.py`.
- Draw the enemies and pickups on the Maps tab from each overlay's
  records ($3970) and walkers ($3868).
- A player for the 18 sound effects (`$F88C`).
- Name the tune the VGMPF calls "Game Over".

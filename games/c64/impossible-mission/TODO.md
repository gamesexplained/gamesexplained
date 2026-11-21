# Impossible Mission — TODO

Tier: Silver. For Gold, a human curates the page section by section
(`AGENTS.md`, "Definition of done"); set `tier` to `silver-claimed` and
`steward` to your login when the pass begins.

Open questions (`facts.md`):

- The clock poke in `cheats.md` (`$D3`/`$D4`) is a candidate that
  was not tried live.
- Does holding up while standing in an empty spot hold off a robot's
  kill? The interrupt's hit check sets `$43` (`$834F` → `$95CC`), but in a
  room only the agent's update (`$860B`, skipped while up is held at
  `$726F`) and the platform code call `agent_death`. Try it live: stand
  by a shooting robot, hold up, and watch.
- Does the tape or disk show a picture while the game loads? The
  Graphics tab would draw it (`70-minisite`, "Graphics"); `media.json`
  has not been made for this game.

Article ideas:

- A Play tab: the rooms port draws every room already; robots and the
  agent's movement would need the bytecode interpreter at `$8ECC`.
- A levels page listing all 32 rooms with their contents.

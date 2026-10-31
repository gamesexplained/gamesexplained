# Spindizzy — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage (37,057 bytes), `facts.md`, the listing sampled
and every step recorded in `accuracy`, the minisite built with a player
for the game's sound effects (it has no music), copy `agent-draft`.

## Audit the listing

The one sample found 18 of 80 comments wrong (22.5 %, 21.2 % weighted by
stratum, a lower bound), and all 18 were corrected along with every
comment that said the same. A rate that high means more wrong comments
remain. A full audit, every comment checked by fresh checkers given the
kinds of error the sample found (a size counted from the wrong end, a
rule true for one case stated for all, a flag or pointer named wrongly,
generated comments counting the wrong records), then a new sample, would
let the Source tab call the listing checked (`kit/skills/core/60-verify`).

## For Gold

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is
dull, and adds what the agent missed.

## For Platinum

A Play tab that is the whole game: Gerald's movement, the surfaces, the
pieces and the room renderer ported to JavaScript routine by routine and
held to the game's code in lockstep (`kit/skills/core/70-minisite/play.md`),
with the title, the options, the map and the score screens. The room
pictures already come from the game's own code on the Maps / levels tab,
and `test_rooms.js` holds them to the emulator's screenshots, which a
port's renderer could be checked against.

## Article ideas

- How a slope turns Gerald's speed into height: the floor heights
  `surface_response` works out across the cell for each slope shape,
  drawn as profiles.
- The map screen (`map_screen`): how the visited rooms are drawn, and
  the jewel colour for a room that still holds one.
- The help screen's pieces are a list in the format the piece builder
  reads (`$72B9`): the page could draw the help screen with the room
  renderer.
- Each inhabitant's top speed and the minus-direction bug, room by room
  on the map.

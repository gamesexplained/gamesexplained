# Arkanoid — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage (63,097 tracked bytes), `facts.md`, every feature
confirmed, traced or explicitly open, the minisite built, on a proven
model (`claude-opus-5-5`). Copy is `agent-draft`.

## For Gold

A human pass over `index.html` and `levels.html`, section by section
(`kit/START.md`, curating a Silver game).

## Worth doing

- Try the ball-against-enemy bug (`$9E9B`) live: a ball moving left
  through an enemy from the side.
- Try a Neos mouse on port 1 (`$FE86`, the `TAX` that replaces the port
  index).
- Count Doh's hits live (23 by the code).
- Read the drum samples into the page: the sid.js model does not play
  writes to the volume register.
- A Play tab: the capsule chooser, the round renderer and the sound
  driver already run on the page.

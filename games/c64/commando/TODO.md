# Commando — TODO

The game is at **Silver**: 100.0 % coverage (62,913 of 62,913 tracked bytes),
`facts.md` with the listing's measured error rate, every feature traced or
confirmed, and the How it works page with a player for all three tunes and
the sound effects. Coverage and verify ran on a proven model, so no
maintainer's check is needed. The first steps of the contributor's run were
on a model that was not recorded, and this run redid them.

## For Gold

- A human pass through `index.html`, section by section, and `steward` set
  in `game.json` when it starts.

## For Platinum

- Reassemble the listing byte for byte to `work/entry.vsf`'s memory and
  boot it.

## Open questions

- The crack's depacker, instructions and menu were not traced; the listing
  starts at the game's hand-over (`$0850`).
- REMEMBER's no-falling poke (`$3C10-$3C5E`) is a candidate in `cheats.md`:
  no live test walked Super Joe into water with it on.

## Page ideas

- A Play tab. The ports behind the page (the music, the aim test, the score
  line) are a start.

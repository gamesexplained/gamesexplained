# Labyrinth — established facts

This Bronze contribution describes the playable text opening. The graphical continuation has captured room images; its source partition and annotations are incomplete. The opening listing is in `parts/opening/listing.json`; the partial gate listing and its checked approach/transition facts are in `parts/scene-01/`.

Live screenshots establish the slot menu, character-setup questions, verb/object commands, several city locations, and the transition to a graphical gate scene. Controlled input also demonstrates movement and entry through the gate into the first graphical corridor. The later forced-room images do not establish player reachability or puzzle solutions. See `features.md` for the distinction between documented and observed behavior.

The opening’s code, alphabet, hardware census, and literal string sweep are documented in `parts/opening/facts.md`. The opening ledger describes 48,261 of 48,261 tracked bytes (100%); this includes explicit provenance-only descriptions of 2,365 opaque retained bytes whose purpose is unknown.

## Error rate

An independent fixed-seed sample on 19 October 2026 checked 60 of the 1,303 line comments across the two analysed images (59 opening, one gate), finding two wrong details in the opening; both were corrected after original-code confirmation. A full audit remains recommended.

## Scope

The complete game stays Bronze: the gate and first corridor are partially analysed and 19 other graphical parts have no analysis, and Silver also needs complete coverage and feature verification across its parts. Shared resident ownership is unresolved, so the combined 36.7% ledger is provisional rather than whole-game progress.

## First corridor

The natural first-corridor image has a partial listing (1,113/48,021 bytes). Its eight captured opening columns select scene 3, The Brick Hallway, across four entry-position banks. Ordinary movement through column 8 loaded scene 3 with entry 35, placing the player at world X=2272/depth 6. The remaining approaches remain open; see `parts/scene-02/facts.md`.

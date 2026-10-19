# Labyrinth — established facts

This Bronze contribution describes the playable text opening. The graphical continuation has captured room images; its source partition and annotations are incomplete. The opening listing is in `parts/opening/listing.json`; the partial gate listing and its checked approach/transition facts are in `parts/scene-01/`.

Live screenshots establish the slot menu, character-setup questions, verb/object commands, several city locations, and the transition to a graphical gate scene. Controlled input also demonstrates movement and entry through the gate into the first graphical corridor. The later forced-room images do not establish player reachability or puzzle solutions. See `features.md` for the distinction between documented and observed behavior.

The opening’s code, alphabet, hardware census, and literal string sweep are documented in `parts/opening/facts.md`. The opening ledger describes 48,261 of 48,261 tracked bytes (100%); this includes explicit provenance-only descriptions of 2,365 opaque retained bytes whose purpose is unknown.

## Error rate

An independent fixed-seed sample on 19 October 2026 checked 60 of the 1,303 line comments across the two analysed images (59 opening, one gate), finding two wrong details in the opening; both were corrected after original-code confirmation. A full audit remains recommended.

## Scope

The complete game stays Bronze: the gate, first corridor, and Brick Hallway are partially analysed and 18 other graphical parts have no analysis, and Silver also needs complete coverage and feature verification across its parts. Shared resident ownership is unresolved, so the combined 27.7% ledger is provisional rather than whole-game progress.

## First corridor

The natural first-corridor image has a partial listing (1,113/48,021 bytes). Its eight captured opening columns select scene 3, The Brick Hallway, across four entry-position banks. Ordinary movement through column 8 loaded scene 3 with entry 35, placing the player at world X=2272/depth 6. The remaining approaches remain open; see `parts/scene-02/facts.md`.

## Published player name

The opening, gate, and first-corridor listings use `work/publish-anonymous.vsf`; the Brick Hallway uses an anonymized `work/play.vsf` copy. Each replaces the entered player name with ANON (or lowercase anon). Original emulator captures remain private. The opening’s named fields fall outside its published records; the gate and corridor listings change only cached name bytes, including the gate speech field. Code, route tables, and measured movement values are unchanged. The two setup screenshots containing the entered name were removed from publication.

## Brick Hallway arrival checks

Ordinary-input trials restored the natural scene-3 play capture at world X=2272/depth 6 before each case. Idle for 120 frames retained depth 6; up for 300 frames reached depth 24; down for 300 reached depth 0. X stayed 2272, current scene stayed 3, and pending scene stayed $FF. Positive execute checkpoint $3423 recorded 12/30/30 hits respectively; $4115 and loader $5098 recorded zero hits in every trial. These bounded observations do not establish the absence of another return route.

The arrival map cell at column 35 ($0623) is zero, translated through $073E to type zero with depth bound 24 at $41F0 and negative exit flag $FF at $4200. Classifier/bound-table bytes $4171-$420F match the first corridor’s retained copy. This is captured scene-3 data, not the first corridor’s map. The direction trials confirm the wall/foreground behavior at this arrival; other positions remain open.

An ordinary keyboard trial typed OPEN, Space, DOOR, Return from the same arrival. Prefixes reached OPEN and DOOR; dispatch fields $6691/$6692 became [37,45]. The wheel service $5D36 ran 52 times and command dispatcher $5F43 once. After another 120 frames, the screenshot showed “Nothing happens.” with OPEN DOOR selected. Current scene remained 3, pending scene $FF and player X=2272/depth 6. This response is established only at the arrival position, not at the visible doors. The original emulator state and normal speed were restored after both batches. Screenshots: `reference/brick-up.png`, `reference/brick-down.png`, `reference/brick-open-door.png`. Raw observations remain private in work/.

## Opening the neighboring Brick Hallway door

The ordinary approach to column 36 (X=2348/depth 24) lets OPEN DOOR change map cell 7 to 6 and refresh the visible door from closed to open, retaining scene 3. This confirms opening one door, not traversing it or finding a route back. `parts/scene-03/facts.md` records the handler, mutation and original-code tests. The new part has 822/48,587 described bytes; four provisional scopes total 52,312/188,818 (27.7%). Their retained resident ownership overlaps and is not whole-game completion.

`reference/opening-anonymous.png` is an emulator capture of the anonymized publication state, with ANON/anon as the entered name. The original screenshot is private in work/.

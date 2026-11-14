# Fantasy World Dizzy — features

## Sources

Read on 14 November 2026:

- [The Codemasters Archive](https://thecodemastersarchive.co.uk/games/fantasy-world-dizzy/), including its C64 screenshot (`reference/archive-c64.png`).
- [Dizzy Collection manual](https://worldofspectrum.net/pub/sinclair/games-info/d/DizzyCollection.pdf), search extract; exact controls require checking in this C64 image.
- [CSDb Dunex release](https://csdb.dk/release/?id=200158), the analysed disk.
- [World of Longplays description](https://www.youtube.com/watch?v=hD1hRj63NdQ), leads for C64 differences; no playthrough undertaken.

## Features

| Feature | Status | Where |
|---|---|---|
| Walk and jump with joystick port 2 | confirmed | $33AA inverts $DC00 and merges keyboard input; an instruction trace with right held stored $08 at $03C0. Movement and jump paths are $1B68-$1E1D. |
| Pick up, drop and use objects through an inventory | traced | $1F33-$249D and $374F-$37CF. Room four marks carried items, $FF removed. Individual late item exchanges were not played through. |
| Three lives; water, fire and wildlife hazards | confirmed | New-game spare count two; fire checkpoint $2572 returned reason $2F. Single stepping $25B4 changed spare lives from two to one. Water and creature reasons are traced at $24A0-$2570. |
| Rescue Daisy from the wizard's tower | traced | $2A2E requires object $67 overlap; room $5E selects rescue messages and cage-object changes. The branch was read and sampled; no full playthrough was used. |
| Further mission after rescuing Daisy; collect 30 coins | confirmed | Messages $0C-$0E request thirty; collector $3997 accepts IDs $1A-$37. A forced instruction trace changed decimal count 29 to 30. Final completion compares tens with three at $2A68. |
| Coins hidden behind scenery | traced | Initial IDs $30-$36 are paired with visible scenery IDs $38-$3E; pickup code $216A can reveal the paired earlier object. Their data are included in the Maps viewer. |
| Conversations and item exchanges | traced | Action overlap dispatch $1FB3-$20E5, item-use cases $222E-$242D and messages at $D7AF-$EFFB. Late conversations were decoded and traced without a playthrough. |
| Large round hole empties the inventory | traced | Object $0A takes $2113-$2149, moving carried IDs 1-$3E into the room before message $27 and hole removal. This isolated branch was read, rather than reached through a route. |
| Bean stalk, cloud castle, dragon and dungeon puzzles | traced | Bean $2343, full bucket $2365, rope $2295, water $2275, and dragon items in $23C8/$2417; decoded messages describe the effects. |
| Australia reverses Dizzy and controls | traced | Rooms below $19 reverse source sprite bytes/bits through $2A7F and swap horizontal control bits at $1AA5. The sample checker ran the inversion path; Graphics exposes the reversed copy. |
| Cage switch can obstruct a coin | open | Cage descent is traced at $2084-$20CB. Reachability of the coin after descent has not been determined; the other versions' warning is not promoted to a C64 fact. |
| Music and sound effects | confirmed | Selectors 1-4 at $0B00 and footstep routine $2AB7. Five page buttons produced nonzero audio through their worklets; 5628 simulated timer ticks matched the game's writes. |

## Beyond the documentation

The ESPILCE sequence reached the room-browser path through genuine keyboard matrix events and instruction checkpoints. The browser's accepted ID range exceeds the drawing directory; effects outside that directory remain open.

## Open questions

The cage/coin warning's C64 reachability, the consequences of the browser's out-of-directory IDs, and the original roles of retained, unreferenced sprite pieces remain open. No full playthrough or replay was needed for this Silver analysis.

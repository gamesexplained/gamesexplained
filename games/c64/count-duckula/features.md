# Count Duckula — features

## Sources

- [Manual, Lemon64 / Project 64](https://www.lemon64.com/doc/count-duckula/157), read 14 November 2026.
- [C64-Wiki](https://www.c64-wiki.com/wiki/Count_Duckula_-_No_Sax_Please,_We're_Egyptian!), read 14 November 2026, for credits, game pictures, and item roles.
- [StrategyWiki gameplay](https://strategywiki.org/wiki/Count_Duckula/Gameplay), read 14 November 2026, for special-item names; its multi-platform numerical claims are checked against this C64 code.

| Feature | Status | Evidence |
|---|---|---|
| Explore the pyramid and obtain the saxophone before timeout | traced | 48 room maps, world directory $FF40, completion test $2596 and end screen $26CD. A complete playthrough is outside the agreed scope. |
| Joystick movement and jump; keys 1–3 use items | confirmed | Port-2 reader $362A and key handler $42D2; fire-right store watch stopped at $36B3 with jump state two. |
| Three carrying slots and automatic pickups | confirmed | $3FAB/$4145; stopping inventory-store watches observed the three shifts. |
| Keys open ordinary doors once | traced | $3CD5/$3D6E decrement $EF and advance the room door state. The special doors in rooms $06/$22 have separate tests. |
| Ankh gives three hours when used | differs | $41DA gives two displayed hours on first pickup, capped at 9:59. Five starting-hour cases checked with stopping store watches. |
| Death mask and sandbag open special doors | traced | Actor 4: room $06, high-X zero, X<$42 and Y<$50. Actor 5: room $22, high-X zero, X=$B2-$C6 and Y<$50, at $42D2. |
| Hammer opens the canopic jar; large key completes the objective | traced | Item 7 requires carried item 6 and shape $6D; creates item 8. Item 8 sets $2DF7 in room $06 at X=$9C-$B0 and Y<$50. |
| Nanny breaks doorways | traced | $5019 stamps four room-specific patches and marks the door $80. |
| Igor supplies food and time | traced | $4ED2 starts the six-part visitor in rooms $2F/$39/$3B/$48. $BD43 adds three to the tens digit once per armed visit. |
| Mummies, rocks, and crows freeze Duckula and cost one hour | differs | Actor contact $BCC0/$BD63 calls the displayed-second decrement directly, then flashes colours; the decoded path does not implement the manual's stated one-hour subtraction. |
| Crows climb and fall | traced | Four route records, room-row changes by thirteen, and two-part climbing/falling frames in $4A61/$4B6A. |
| Bats remove points | differs | Bat actor 20 belongs to the same contact loop at $BCC0, which reaches the clock path. The documented point-loss claim remains unsupported by this decoded path. |
| Television theme | confirmed | $0E00, request $87, three voice streams. Page wrapper matches 9,000 native ticks. |
| Typed door cheat | traced | Fourteen-byte BURN THE WITCH plus final space at $42C4; recogniser $42D2 and bypass tests $36E0/$372A. |

The named states in reference/title.png and reference/play.png establish the title and opening scene. No input recording or optional solution route was made.

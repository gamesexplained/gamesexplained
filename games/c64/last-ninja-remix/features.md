# Last Ninja Remix — features

Sources: [game documentation](https://www.lemon64.com/game/last-ninja-remix) and the contributor’s annotated listing, consulted 30 September 2026. The documentation supplies the feature inventory; the annotations supply leads for verification.

| Feature | Status | Evidence or open work |
|---|---|---|
| Isometric Central Park exploration | open | $8A52 recursive scenery renderer traced; all 18 collision outputs checked, complete scenery presentation open |
| Movement and combat | partly verified | Live `$B54A` damage and `$B767` collision boundary tests; full combat/control outcomes remain open |
| Objects and puzzles | open | 15 records and consumers traced; object names and puzzle routes open |
| Animation and music | partly verified | 32 main sequences plus 11 late streams parsed; twelve native first-command checks and changing SID state; all event/track outcomes remain open |
| Later levels | open | Replacement occupants are outside this Central Park listing |

The imported annotations remain leads until traced or exercised in this run. Central Park’s boot and initialized gameplay are observed live.

# Impossamole — features

Sources read on 15 November 2026: [Gremlin instructions transcribed by Viva Games](https://viva-games.ru/game/impossamole), including C64 controls; [Dynamix release](https://csdb.dk/release/?id=200006). The instructions cover several computers. Traced means checked against C64 instructions and data; live means exercised in VICE. Open means the stated limitation remains.

| Feature | Status | Evidence |
|---|---|---|
| Five levels, first four in any order, final requires four | traced | Completion masks $0F/$1F at $260E and selector; five payload IDs checked live at $16AE |
| Joystick port 2 controls Monty | live | Neutral/fire route reached actual Klondike gameplay; joystick polling in $0973 chain |
| Jumping, ladders, platforms, enemies | traced | $2C53 movement dispatch, jump deltas $7F45, terrain probes $2881; actor slots $86B8 |
| Food restores energy | traced | Contact dispatch $3685: worms queue 5 energy steps, pinta 4 and a longer bar |
| Shopkeeper and money purchases | live | Purchase $3213, payment $1446/$14B9 run live from a Klondike play snapshot on 15 November 2026; prices $8091 |
| Collectable weapons and strength | live | CPU instruction traces through pickup type 4 and $1B11; weapon templates and type $7F7C traced |
| Weapons have a time limit | live | $4FE4 trace at divider 49 reduces lifetime 2→1; timer units reported as calls |
| Hidden rooms in each level | open | Exit records and full map allocations decoded; which exits count as each documented hidden room is unassigned |
| SPACE activates a super weapon | traced | $0FA4 conditions and charge/state $89CC/$89CD; ordinary activation route open |
| P pauses; RUN/STOP quits while paused | traced | Keyboard scanner $0E9A and command handler $0FA4 |
| Title joystick selects music/effects | traced | $08BF selection gates music/effect calls |
| Five guardians and stolen scroll objective | traced/open | Five guardian activation IDs at $3B57-$3B69 and completion logic; each guardian's ordinary defeat/scroll sequence remains open |
| High-score names select six modifiers | live | OOCHOUCH typed after a 1,649-point Klondike game on 15 November 2026 set $08BE to 4; all six names run through $5001 |
| Music and effects | confirmed | One tune and 16 records run through CPU model; page write comparison and browser sound checks |

## Beyond the documentation

Two findings the instructions don't give are on Discoveries: waggling the joystick while a shop item is paid for keeps coins in Monty's purse, and the cheat-name check leaves its letter count in a byte the tune reads, putting one instrument out of key. The six name modifiers are known from PC cheat lists and get a plain heading. Resource boundaries, animation stream markers, block format, and exact exit-record fields are in facts.md. The forced zero-energy underflow has unproved reachability and is kept out of Discoveries.

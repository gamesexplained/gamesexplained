# Documented features

These are leads for verification, not findings from the code. Each remains open until checked.

| Feature | Status |
|---|---|
| Twelve rounds with towns, caves, woods, dungeons and an underwater section | observed differently: the status panel counts eleven rounds across the 31 loads (round 1 in load 1, round 11 in load 31), read in each load reached by the game's own exit flag. The places are named by each load's messages: a town, a cavern, castles, the coast, under the sea, a desert, a pyramid, clouds, an island, a lava castle and the sea bed. |
| A time limit and hourglasses that extend it | traced: `$4A43` steps the status-panel hourglass through seven pictures, 150 passes of the main loop for each of the first six and three for the last; then `$77BC` takes 8 from the life meter, one heart, and the glass starts again. `$613B` takes a second count in each pass while the player is at the load’s tile from `$7F76`, the top row of a pool. The contact handler at `$7646`, of the hidden hourglass (entity type `$FB`) in loads 1, 2, 4 and 6, runs the glass back to its first picture. At the start of round 1 the main loop ran 167 times in 500 frames in play, so a heart lasts about 54 seconds there. No hourglass has been collected in play. |
| Walking, jumping, climbing ladders, sword attacks and special weapons | open |
| Doors opened with Space, including hidden passages and shops | open |
| Enemies, duels, bosses and a final dragon | open |
| Money, coins and bags; merchants sell equipment and weapons | traced: 24 money bags and 24 reachable coins hide at fixed spots on 19 maps (`$5BE1`, `$5C2A`); a bag paid 14 gold in play in round 1. The price table names 21 goods, checked in 17 loads' copies. Ordinary-play purchases remain open. |
| Reversing direction as a hidden reward appears can yield 65–69 gold | confirmed in play: in round 1 the first bag paid 68 gold with a change of direction as it appeared and 14 without (`$5C0C`, `$7632`, `$771F`). The check is skipped while the hero rises in a jump. |
| Health, hearts, a potion that restores health, and drinks | traced: the life meter counts 8 to a heart; Revival Medicine refills it to five hearts at `$04B2`; hidden hearts at `$5CCB`; the healing counter in loads 4, 9, 19, 20 and 30 fills it for gold, at a price that never rises (`test_counter_price.js`). Drinks remain open. |
| Boots, shields, armour, swords, gloves, helm and temporary invisibility | partially traced: the Gauntlet doubles ten blows (`$76E9`, `$74A9`), the Helmet halves five hits (`$76F3`, `$5D94`), Winged Boots slow 255 falls and Revival Medicine refills the meter, each checked against the game's code. What boots, armour and shields do, and invisibility, remain open. |
| Wing boots slow the fall while up is held and expire | traced: `$76FD`, `$0A92`; five controlled VICE cases cover the flag and countdown, while a natural pickup remains open |
| Grenades, tornado, lightning and fireball special weapons | open |
| Score treasures: goblet, chain, gold, harp, scales and crown | open |
| Keys, letter, flute, charm, jewellery, bell and ruby as quest items | open |
| Sphinx riddles and answers supplied by barkeepers | traced: the hint callback at `$991B` picks one of four hints at random and keeps the choice at `$9A4B`, which decides the Sphinx's question and accepted answer (CHICKEN, SARAD, KARAOKE or GOLF; never the left answer, BEEF or NAP). Who shows the hint in play, and what a wrong answer costs, remain open. |
| Sword upgrades after defeating particular enemies; wiki describes a repeatable upgrade after losing a life | open |
| Disk change confirmed with Space | open |

## Sources

- [Wonder Boy in Monster Land – C64-Wiki](https://www.c64-wiki.com/wiki/Wonder_Boy_in_Monster_Land), read 9 November 2026. The C64-specific controls and item descriptions are treated as claims to check.

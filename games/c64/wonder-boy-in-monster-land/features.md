# Documented features

These are leads for verification, not findings from the code. Each remains open until checked.

| Feature | Status |
|---|---|
| Twelve rounds with towns, caves, woods, dungeons and an underwater section | partially observed: the opening capture shows round 1; forced load 2 shows “RND. 2”. The total, environment names and natural sequence remain open. |
| A time limit and hourglasses that extend it | traced: `$4A43` steps the status-panel hourglass through seven pictures, 150 passes of the main loop for each of the first six and three for the last; then `$77BC` takes 8 from the life meter, one heart, and the glass starts again. `$613B` takes a second count in each pass while the player is at the load’s tile from `$7F76`, the top row of a pool. The contact handler at `$7646` runs the glass back to its first picture; which object uses that handler is open, and no hourglass has been collected in play. |
| Walking, jumping, climbing ladders, sword attacks and special weapons | open |
| Doors opened with Space, including hidden passages and shops | open |
| Enemies, duels, bosses and a final dragon | open |
| Money, coins and bags; merchants sell equipment and weapons | partially traced: the resident reward handler adds gold, and load 19 contains controlled shop price and purchase paths. Natural pickups, the full item range and ordinary-play purchases remain open. |
| Reversing direction as a hidden reward appears can yield 65–69 gold | traced: `$5C0C`, `$7632` and `$771F`; controlled input-state cases were stepped in VICE, but an unmodified pickup has not been replayed |
| Health, hearts, a potion that restores health, and drinks | open |
| Boots, shields, armour, swords, gloves, helm and temporary invisibility | partially traced: the load-19 item tables include Winged Boots, Helmet, Gauntlet and Revival Medicine; controlled paths invoke their handlers. Natural purchases and the other listed equipment remain open. |
| Wing boots slow the fall while up is held and expire | traced: `$76FD`, `$0A92`; five controlled VICE cases cover the flag and countdown, while a natural pickup remains open |
| Grenades, tornado, lightning and fireball special weapons | open |
| Score treasures: goblet, chain, gold, harp, scales and crown | open |
| Keys, letter, flute, charm, jewellery, bell and ruby as quest items | open |
| Sphinx riddles and answers supplied by barkeepers | partially traced: load-19 controlled calls connect four hint records to quiz questions and accepted choices. The natural order and who supplies the hints remain open. |
| Sword upgrades after defeating particular enemies; wiki describes a repeatable upgrade after losing a life | open |
| Disk change confirmed with Space | open |

## Sources

- [Wonder Boy in Monster Land – C64-Wiki](https://www.c64-wiki.com/wiki/Wonder_Boy_in_Monster_Land), read 9 November 2026. The C64-specific controls and item descriptions are treated as claims to check.

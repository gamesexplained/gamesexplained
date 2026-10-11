# IK+ — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| A longer round: TIME counts down from 99 | `POKE 284,153` (`$011C` = `$99`, BCD) during a round; `next_round` sets 30 again at the next | live: 99 became 97 two seconds later, shown as 97 |
| Win the round at once as player 1 | `POKE 271,6` (`$010F`, fighter 0's dots) during a fight | live: the round ended with player 1 first, twice running |
| Game speed beyond the keys | `POKE 286,n` (`$011E`, 0-4 as keys 1-5) | live: 0 to 4 measured (facts.md, "Live tests") |
| Stand up after a knock-down | RUN/STOP twice: the pause clears every fighter's move | live (documented cheat) |
| Computer fighters at the first difficulty | `POKE 395,0` (`$018B`) before a round starts; it is raised again at each bonus round | candidate |

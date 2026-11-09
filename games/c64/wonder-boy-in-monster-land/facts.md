# Super Wonder Boy in Monster Land — verified technical facts

The contributor supplied the Nostalgia disk release. Its trainer was left at `NO` for the captures. The route and snapshot names are in [orientation.md](orientation.md).

## Input and rewards

Joystick port 2 is sampled at `$3C4C`. The code retains the preceding left and right samples and uses a reversal at an entity's creation to set up the 65–69 gold reward. The arithmetic and controlled tests are in [the resident facts](parts/resident/facts.md).

The wing-boots flag and counter are also in the resident engine. The counter starts at `$FF` and is decremented only on a qualifying visit while up is pressed. The same resident facts give the conditions and the VICE tests.

## Maps and display

The renderer at `$6D41–$6D63` expands a map byte into four character codes from the tables at `$81CF`, `$82CF`, `$83CF` and `$84CF`. A character-to-colour table begins at `$7FCF`. Each captured load supplies its own tables and map. The pointer and dimensions were checked against the entry snapshot of each part; the part's `facts.md` gives the observed row count and stride.

The [Maps](levels.html) viewer draws the 31 captured maps from their tile and character data. The numbers identify forced load captures, and do not establish the order or reachability of natural gameplay. The viewer omits sprites and later runtime changes.

## Text

The `$C800` character set contains digits at codes `$01–$0A`, upper-case letters at `$41–$5A` and lower-case letters at `$61–$7A`. The message-copy routine converts stored spaces to the blank glyph. The punctuation and message-record format are documented in [the resident facts](parts/resident/facts.md); the first load's opening messages are in [its facts](parts/stage-01/facts.md).

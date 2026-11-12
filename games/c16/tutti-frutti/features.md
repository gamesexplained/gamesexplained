# Tutti Frutti — features

## Sources

- Mastertronic's 1985 cassette inlay, scanned by Plus/4 World. It names Super Strawberry, the cherries, the falling Bad Apples, the Acid Apple Gang and joystick port 0. [Inlay scan](https://plus4world.powweb.com/dl/covers/t/tutti_frutti_back.gif) (read 12 November 2026).
- Plus/4 World documents the six layouts, both routes through each of the three types of orchard, the hidden apple and the music switch. The two gallery screenshots are in `reference/`. [Tutti Frutti](https://plus4world.powweb.com/software/Tutti_Frutti) (read 12 November 2026).
- Warren Pilkington describes the demo, enemies, ball, timer, music and the first push on level 3. [Mastertronic Collectors Archive review](https://mastertronic.co.uk/game-review-tutti-frutti-commodore-16-and-plus-4-mastertronic/) (read 12 November 2026).

## Checklist

| Feature | Status | Evidence or question |
|---|---|---|
| Title and high-score table, followed by layout previews | confirmed | $2200 draws the six layouts as the two-voice tune advances. $20FA ranks scores during play. |
| Joystick movement and fire, plus keyboard directions | confirmed | $3100. Live tests from one snapshot confirmed joystick 1 and A, Z, 3, and 4. Joystick 2 fire left the game at the title. |
| Digging and collecting cherries | confirmed | $2F30 and $2530. A cherry under the player produced 25 points. |
| Bad Apples fall once the cell below is cleared | confirmed | $32BF starts a 32-tick wait. The test apple moved four position units (eight display pixels) in the four ticks after the timer reached zero. |
| Acid Apples emerge at the flashing box and turn through tunnels | confirmed | $1C00, $1C80, $1E00, and $1FA0. Observed after waiting in orchard 1. |
| Bouncing ball in the first two rulesets | confirmed | $2700 and $2740. Fire gave an active ball with diagonal velocity and it later entered cooldown. |
| First orchard ends on cherries or enemies | confirmed | $2C00 and $1E34. Each condition advanced the layout in the live probes. |
| Second orchard ends on enemies or cherries and six bottom-row apples | confirmed | $2C20 and $1E34. Cherries alone kept layout 2 running. Six type-3 bottom cells triggered the alternate clear. |
| An apple is invisible near the spawn on the first second-ruleset layout | open | Plus/4 World reports it. All six apples appear in the captured opening of layout 2. A specific route to the reported state remains open. |
| The third ruleset uses sliding fruit blocks | confirmed | $2CB3. A recorded push at a tile boundary set the slot-7 direction and the cherry moved after the timer expired. |
| First slide waits before the fruit moves | confirmed | $033F begins at $7E in this packed PRG. Clearing the byte in an otherwise identical probe removed the wait. |
| Third orchard ends on enemies or Bad Apples in the four corners | confirmed | $2C78 and $1E34. Setting the corner cells to type 5 advanced the round. |
| Six layouts repeat with rising difficulty | confirmed | $315F and $1BB0. After six clears the level display read 07 and layout 1 reappeared with a higher enemy speed. |
| Score, elapsed time, bonus, and five lives | confirmed | $1AC0, $1A38, $1A00, and $1F50. Observed in the HUD and through a forced last-life collision. |
| Game over and high-score placement | confirmed | Game Over is displayed by $1B90. $20FA updates the table from the current score during play. |
| Title and play theme, clear and Game Over tunes, and effects | confirmed | $2B00, $1780, $23D0, $1B40, and $25A0. Holding Shift paused the play theme. |

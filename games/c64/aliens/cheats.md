# Aliens — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates. These are the crack's trainer's own pokes
(`trainer_patch`, `$2C06`), read in its code; none was tested live.

| Effect | Poke | Status |
|---|---|---|
| Level 5: shots cost no rounds | `$8798` = 0, the operand of the SBC #$01 in `fire` | candidate |
| Level 5: aliens' touches cost Ripley no strength | `$8B64` = 0, the operand of the SBC #$01 in `alien_toward` | candidate |
| Level 6: the Queen never wins by reaching the bottom | `$8139`-`$813B` = `4C 4F 81` (JMP `$814F`) | candidate |
| Level 6: the Queen never recovers her speed | `$88A9` = `$AD` (LDA in place of the store) | candidate |

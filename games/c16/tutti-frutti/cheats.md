# Tutti Frutti — controls and monitor patches

Hold Shift during play to pause the melody. The game reads the same
keyboard bit for Shift Lock. The pause retains the note index.

The Plus/4 World monitor patches refer to the unpacked engine. The
opcode and replacement meanings below were checked against this PRG's
resident listing. Restore the original bytes or restart from the PRG
after changing them.

| Address | Original | Patch | Effect on the instruction |
|---|---|---|---|
| $1F50 | $CE | $AD | Loads the life digit where the death sequence normally decrements it |
| $1A0C | $DE | $BD | Loads the bonus digit in place of its indexed decrement |
| $1A44 | $EE | $AD | Reads the clock's units-of-seconds digit in place of incrementing it |
| $20D2 | $B0 | $24 | Removes the branch to the death sequence and falls through to the ordinary state dispatch |

`G 2000` in the monitor enters the unpacked game with the engine in
memory. The $1A44 patch affects the elapsed clock. The separate bonus
at $1A0C can still reach zero and start the death sequence.

[Plus/4 World monitor codes](https://plus4world.powweb.com/software/Tutti_Frutti)

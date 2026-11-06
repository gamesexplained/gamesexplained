## 0.0.312 · 2026-11-05 · Zak McKracken and the Alien Mindbenders (C64) · air with Claude

- **Check a bytecode decoder against the engine that runs the game, not
  against another decoder.** The game's scripts are SCUMM bytecode, and
  descumm, the disassembler that comes with ScummVM's tools, was the
  obvious second opinion. At commit 16f178f it reads opcode $AB with no
  parameter, where ScummVM's engine reads a byte on the C64, so the
  instructions after one in a script came out wrong until the bytes fell
  back into step: four of the 648 places the opening ran. The
  kit's decoder is checked against ScummVM built with a trace instead:
  0 disagreements at 869 places, 46,657 instructions of scripted play
  (`kit/skills/cpu/scumm`, "Checking the decoder").
- **Make the test game run every condition both ways, and say where
  each must go.** A trace check confirms an instruction's length and its
  jump's target, but not the condition the listing prints: `isGreater`
  goes on when the variable is the smaller, and ScummVM's eight state
  tests are named for when they jump where its comparisons are named for
  when they go on. The
  kit's test game runs each of its 61 conditional jumps into a known
  outcome, worked out from the text the decoder writes, and the test
  fails when ScummVM goes the other way (`kit/scumm/test_scummvm.py`).
- **The interpreter starts scripts that nothing in the game starts.**
  The test game's own script 5, written as an ordinary script to be
  chained from another, ran every time the game entered a room: version
  1 and 2 interpreters start script 5 after every room,
  script 2 for each sentence and script 4 for each click. A global script
  no instruction starts is not dead until a trace says so
  (`kit/skills/cpu/scumm/reference.md`, "What the interpreter starts").

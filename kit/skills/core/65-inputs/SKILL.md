---
name: 65-inputs
description: Only when a step records play to run it again. A route that proves a state can be reached, a game's own demonstration as the test of a port, a solution played on the Play tab. Record the input by the game's reads of its controls, keep the route's milestones with it, and replay it on a second machine before trusting it.
---

# Inputs: recording play and playing it again

Some steps need play that runs again the same way: a route that proves
a state can be reached (`60-verify`), the game's own demonstration as
the test of a port (`70-minisite/play.md`), a solution played on the
Play tab. Each is a recording of the game's input. A recording is only
worth what it does on a machine other than the one it was made on.

## Record by the game's reads, not by the frame

Two machines run the same game a few frames apart. Emulators start a
game on different frames, a port paces itself by its own clock, and the
gap grows with every room or screen drawn. Input given by the frame or
by the clock reaches the game at another moment of play, and the replay
parts from the route. Input given at the game's reads of its controls
reaches the same decision whatever the pace.

Find every instruction that reads the controls: the register census
lists them (`40-sweep`). They come in two kinds.

- **The reads that steer play**, such as a routine that reads the stick
  once a pass or once every few frames. Record the value at each read,
  in order, and replay it read by read: the replay's next read gets the
  recording's next value.
- **The waits that poll until something is pressed**, such as fire at a
  title. They read as fast as they can, so how many reads they make is
  the machine's pace. Record these by the clock, the cycle each new
  value was first read, and replay them by the clock. They change only a
  few times in a game.

A game's own demonstration is a recording made by the game, and it
replays the same way. Record it in the emulator, one record per pass of
the game loop with every variable the port keeps, then feed a port its
input poll by poll, exactly where the game reads the controls. For what
it never does, write short input scripts in the same format.

In the emulator, stop at each read (a checkpoint on the reading
instruction), set the input and run on, or redirect the game's control
read to a table so it runs at its own speed (the platform's tool notes).
On the kit's machine (`kit/skills/<platform>/steps`, "machine"), set its
input before each read. Within one emulator, from one snapshot, a
session counted in frames replays too; across machines only the reads
do.

## Keep milestones with a route

Keep with a route the frames where the game's own flags change (the
game under way, an item taken, a life lost, the ending) and the
player's place every few frames. A test then checks that a replay
reaches each milestone in its place within a few frames, which a
machine of another pace still passes, and one recording drives every
test that needs play. `games/c64/the-sacred-armour-of-antiriad/test_route.js`
keeps both, and fails on any difference.

## Replay it on a second machine

A route found on one machine carries that machine's blind spots: a
search on the kit's machine finds what the kit's machine allows. Replay
it in the emulator, read by read, before trusting it. Where the two
part, the read's number names the moment, and the cause is usually a
gap in the kit's machine: bytes the game reads before it writes them,
which a listing does not carry, or an interrupt taken late. Sometimes it
is the game's own race between its interrupt and its main loop; then
prefer a route that does not lean on it.

## Publish it

A recording is the game's input, not the game, so it is committed,
beside the test that replays it, and given with the result it proves: a
route someone else can replay is the evidence.

On the Play tab a route becomes a button that plays it from power-on,
such as "Watch the solution". The page gives each read of the port's
control routines the recorded value at the same read and the waits for
fire theirs by the clock, and any key or the pad takes over. The page
carries a copy made by a script from the game's reads on the kit's
machine. The Play tab's test makes it again and fails when the page's
copy differs, then plays the whole recording on the page and checks
every milestone. `games/c64/the-sacred-armour-of-antiriad/port/scripts/solution.js`
makes one, and `port/page/solution.js` beside it plays it.

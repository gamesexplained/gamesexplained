# Power Drift — TODO

Current tier and what is missing for the next one.

## Silver (reached)

Coverage 100 %, `facts.md`, every feature in `features.md` confirmed,
traced, live, marked where it differs or left as an open question below,
the listing sampled (60 comments, seed 20261030), and the minisite built
with a player for both tunes and all four effects. The run used one
proven model, `claude-opus-5-5`, for every step.

- **An audit is recommended.** The sample found 7 of 60 comments wrong,
  11.7 % (95 % interval 5.8 % to 22.2 %), over the mark. All seven were
  corrected with the comments that said the same, but a rate that high
  says more are wrong elsewhere. An audit of the whole listing on another
  proven model, as `kit/CHECKING.md` describes, would find them.

## Open questions

- Can a fast enough kart pass through a slower rival without a spin?
  `place_rivals` tests only distance 1, and a kart closing faster than
  one distance a race frame could skip it. Work out the largest closing
  speed from `move_player` and `move_rivals`, or try it live.
- Does the panel's sprite 0 pointer, written into byte 56 of sprite `$8F`
  (`$E3F8`), show as a mark on the third driver's face when that face is
  on the podium? The code says it must; a screenshot of a podium with the
  third driver would show it.

## Gold

A human's pass through the How it works, Discoveries and Tracks
tabs, section by section (`AGENTS.md`, "Definition of done").

## Platinum

A Play tab with the whole game ported to JavaScript and run in lockstep
with the game's own code. The sound driver already runs on the page, and
the course records, piece routines, scenery lists and rival pictures are
all drawn from the game's tables; the road drawing, the scenery blitter,
the rivals' movement and the sprite multiplexer would need porting.

## Ideas

- A track viewer that steps through one lap piece by piece, drawing the
  road widths of each step as the game draws them (`draw_road`).
- A widget that runs `place_rivals` for a chosen set of rival distances
  and shows how the four sprites are shared down the screen.

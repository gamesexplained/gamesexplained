# Super Wonder Boy in Monster Land — TODO

All 490,491 counted bytes have descriptions. Silver needs one more step: a full audit of the listing.

## Before Silver

- Audit every comment in every part, and every claim in `facts.md`, on proven models, then draw a new sample with a new seed (`kit/CHECKING.md`). The maintainer's sample of 17 November 2026 (seed 51117) found 17 of 80 comments wrong, over the mark of one in 30. Fifteen were character comments on bytes that are other data. That kind of comment was corrected wherever the load's own structures identify the bytes (5,060 comments), and on 18 November 2026 the listing was folded to one note per structure (14,310 notes; `facts.md`, "Listing error rate"). The audit should start with:
  - the 779 notes on runs of a copy's characters, and in them the 187 that name a selector's own shapes: whether each run holds only characters, or bytes some other routine reads;
  - the 75 notes that call bytes only "instruction bytes of the routine at" an address: each is a short piece of code with no description of its own, and needs one;
  - the tables described one entry to a note, which could each be one note: 825 one-byte `RTS` entries of the entity vector tables, 816 subroutine targets, 408 prices and 408 message pointers of the shops' item tables.
- Load 20's trigger callback at `$9396` (`LDA #$00`, `STA $BF1F`, `RTS`) lies inside the bytes the listing describes only as character rows; the audit should describe it as code.

## Leads that stay open

- The load-9 spot at column 43, row 6 (`$92F7`) makes the hero immune to enemy contact; Discoveries tells it from the code. Find whether play can reach it: the hero's highest jump near it ends at row 7.
- The hazard spots whose callback is `$72AB` (38, 31 of them in loads 19, 26 and 27) throw the hero back and start a temporary entity of type `$2B`; find what that entity does and whether it costs life.
- The key check at `$7960` takes the key and clears `$5284`; find what clearing `$5284` opens.
- In the two-player game the area setup at `$6C73` adds 8 to the first player's meter, while the first hourglass tick takes 8 from the selected player's. If it plays out that way, the second player starts each area a heart down and the first a heart up; see it in play with `$4DBC` set before taking it to Discoveries.
- The rectangle test at `$75E3` passes a box that ends where the other begins and fails one that begins at the other's computed right edge (`parts/resident/facts.md`). Find whether an enemy touches the hero a pixel sooner from one side in play.
- A wrong answer to the Sphinx runs `$BE38`; find what it costs.
- The six-step horizontal-input gate in loads 25–27 lets the hero's sideways speed change only on some passes; find what the player feels.
- The type-`$28` shape differs between loads 2–5 and 6–31; find what the object is.
- A shop closed with “Closed.” after 13.16 seconds in a controlled test; find whether the timeout applies in play.
- Pages: the Graphics tab could name each creature on the sprite sheet from the load's messages, put the hero's walk, raised sword and attack frames in one moving row, and show the 17 room screens as a grid placed where the game uses them; How it works could draw the seven hourglass pictures from `$5127`–`$51B2`.

## Open investigations

The following questions stay explicit where the evidence does not settle them. A bounded forced test does not establish an ordinary-play route.

- Establish the natural routes to the forced loads, classify bytes after the two decoded streams in the extracted disk files and their transfer and determine ownership of repeated data across loads. The two decoded streams reproduce each recorded write range and its entry snapshot, including four post-load patches; `stream-boundaries.json` records the bounded result.
- Restore or attribute the four older resident annotations at $BE84, $FAC0, $FD30 and $FD50 only after checking the corresponding state. The prior map is saved under resident `work/`.
- Preserve the resident automatic labels when rebuilding its disassembler project: the reseeded project exports without losing tracked bytes only after those labels are carried into it. Establish whether the effect slot searches can run with fewer than four free slots and what follows if they do.
- Trace the remaining item callback effects, other entries to the purchase choice, the shop gate byte, the mode’s ordinary-play range, whether the controlled 13.16-second shop timeout applies in play, and the item indices reached in play. Determine the role of the triangular message glyph $60, find message records reached through other pointer patterns, and establish their ordinary-play contexts. Determine why the eight resident-entry bytes in reflected player masks differ between captures. The later loads’ pre-audit maps are in their `work/` folders. Their corrected maps include sound lists, row pointers, triggers, objects, observed sprite masks, partially recovered update code and the stage-16 dispatch, state handlers and shared routine and four relocated handler copies; retain the corrected project exports without replaying the rejected imported names and types.
- Determine the type-$0D state and alternate-index ranges and natural reachability in loads 8, 9 and 27. Determine the type-$0C state index and natural reachability in loads 8, 10, 26 and 29. Determine the type-$05 state and table index ranges and natural reachability in loads 2, 4, 6, 15 and 17. Determine the type-$01 state index and natural reachability in loads 2, 4, 12, 20 and 23. Determine the type-$04 state, table and alternate-index ranges and natural reachability in loads 2, 4 and 6. Determine the type-$09 dispatcher’s possible state-index range and natural reachability in loads 5, 7, 13, 21, 22 and 24. Establish the stage-16 entity callers’ complete state ranges and natural reachability. Establish the gate timing and natural reachability in loads 25–27. Reach the load 29–31 update entries in play; their bounded character-source probes did not execute them. The per-part `codemap.json` files cover only instruction starts inside the character-source range during the stated probes; load 16 includes two instructions with patched operands.
- Determine the type-$0E state-index range and ordinary-play reachability in loads 9, 11 and 20.
- Determine the type-$03 state and movement-table index ranges and ordinary-play reachability in loads 13, 14, 15, 17, 18, 24, 26 and 27, including whether the asymmetric horizontal arithmetic is encountered.
- Determine the type-$22 state and alternate-slot index ranges and ordinary-play reachability in loads 2, 4, 6, 14, 15, 17, 24 and 25.
- Determine the type-$01 state-index range and ordinary-play reachability in loads 3, 13, 14, 15, 17, 19 and 26.
- Determine the type-$02 state-index range and ordinary-play reachability in loads 13, 14, 15, 17 and 19.
- Determine the type-$2D/$2E state-index range and ordinary-play reachability in load 31, and identify the other uses of their working bytes.
- Determine the type-$2F state range and ordinary-play reachability in load 31, including whether the exact coordinate equality checks can be crossed.


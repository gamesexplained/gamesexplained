# Choplifter — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: Silver

Every Bronze and Silver requirement is met, and every Gold requirement
except the last.

| Requirement | Tier | State |
|---|---|---|
| Boots, `orientation.md` recipe | Bronze | done |
| `features.md` drafted from external documentation | Bronze | done, three sources named |
| Reference screenshots | Bronze | 6 images in `reference/`, all taken from the emulator in this run |
| Coverage >= 80 % | Silver | **100 %**, 23,661 of 23,661 tracked bytes |
| `facts.md` | Silver | done |
| Every feature confirmed or explicitly open | Silver | done; two rows open, each with the search described, and two marked differs |
| `symbols.json` exported, `listing.json` built from it | Silver | 1,307 symbols, 573 of them user, 790 comments; listing passes `check_listing.py` |

## Missing for Gold

| Gold requirement | State |
|---|---|
| 100 % coverage | done |
| Interactive article | done: nine sections, each with something to press |
| A finding beyond the documentation verified live | done, several. The shot that cannot hit anything (`$AD86` / `$B344`), the tank spawn that lands outside the world (`$9F54`), the free list built four links too long (`$AA11`) |
| **A human has read the copy** | **not done.** `copy` in `game.json` is `agent` and stays that way until a human reads it |

Everything for Gold except the human read is in place, so the tier moves
on one reading.

## For Platinum

- The listing has never been reassembled. Platinum wants `listing.json` to
  produce the analysed image byte for byte and the result to boot. Nothing
  in this run tried it. The hard parts will be the 75 shape blobs, the
  `address`-typed pointer table at `$8009`, and the inline parameter words,
  all of which have to come back out as data in the right order.

## Left open

- The Q key, documented as "ends the game". No read of it was found; the
  search is recorded in `features.md`.
- What shape 70, the parallax blob, depicts.
- Whether the right-hand tank spawn at `$9F54` is a slip or deliberate.
- The type-10 mine was never seen in the emulator. Its identification rests
  on the code and its shape.

## Article ideas not taken up

- A Play tab. The flight model at `$A615`/`$A4DA` is small enough to port
  behaviourally, and the shape table is already extracted, but nothing has
  been written.
- A tune player for the three SID voices. The engine sweep on the article
  is a browser approximation of filtered noise, not a SID emulation.

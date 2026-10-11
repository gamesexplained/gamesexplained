# Lode Runner — verified technical facts

## Multiload scope and ownership

The Black Label disk game is a resident engine with **150 independently loaded rooms**. Its standard part folders are `engine` and `room-001` through `room-150`. The engine holds IT ($6000–$B7FF) and DB ($1400–$1EFE), loaded together before the first engine instruction. Each room overlays $1000–$10FF without replacing engine code. Addresses in the engine facts and edition comparison below refer to the resident disk engine unless explicitly marked cartridge; each room's facts name its own buffer separately.

The authored coverage denominator is **63,593 bytes**: 25,343 resident engine/title bytes plus 150 × 255 retained sector-source bytes (38,250). Room decoding uses 224 bytes, low nibble first, to create 448 cells. The remaining 31 source bytes are retained and annotated even though the room decoder does not consume them. The reader discards raw sector byte zero; raw offsets 1–255 become $1000–$10FE. Its extra final CHRIN result at $10FF is $0D in all captured reads and is excluded from authored coverage. The physical write range remains all 256 bytes. This establishes the native read alignment; the editor write/read round trip is separately open.

All room entry and play snapshots are captured through the original reader, with the forced level-selection route in orientation.md. No snapshot is assembled from extracted room bytes. Native buffer comparisons cover every room and all three supplied room stores agree. The only resident instruction bytes differing at these room-entry checkpoints are eight previously annotated self-modified operands: $65B0, $87A0, $8B1D, $8B22, $8B39, $8B40, $8C19 and $8C1A. Their decoded writers are $65A2, $8EA7, $8B07/$8B0A/$8B0E/$8B11 and $8C06/$8C0C. They are runtime patches, not room-sector code. Generated maps, sprites, score records, work bitmaps and system state remain excluded. Original loader/protection internals and the separate cartridge engine retain their stated comparison scope.

## Review samples and verification

Independent full-body reviews cover all **371 authored annotations** and all **25,343 resident-part bytes**, including callers and indexed ranges. The canonical listing bytes match the hand-over snapshot. Completed checks on 4 October 2026 are summarized below; original images, harnesses, ledgers, sampled addresses, and full reports stay in private `work/` storage.

| Comment sample seed | Result; descriptive Wilson 95% interval |
|---|---|
| 6401983 | 17/60 wrong details (28.33%); 18.51–40.77% |
| 64202642 | 2/60 wrong details (3.33%), plus one ambiguity; 0.92–11.36% |
| 6401042602 | 0/60 wrong details, plus one ambiguity; 0–6.02% |

Samples describe their audited annotation versions. Targeted rechecks are dependent evidence and do not replace the original counts. Sampling was stratified, and these descriptive intervals do not adjust for unequal populations. The final sample draws 20 comments each from populations 125/101/145; 59 pass and one mask-table description is ambiguous. Counting ambiguity as adverse gives 1/60 (1.67%), interval 0.29–8.86%. The source distinguishes the unused zero sentinel at $86D5 from its five active inverse masks; that clarification is a dependent check.

The room-part migration adds 2,550 row/tail annotations. An independent reviewer checked 60 drawn uniformly from that population with seed **641041501**: **0 wrong and 0 ambiguous**, descriptive Wilson 95% error interval **0–6.02%**. All 60 were checked against original sector bytes and executed original decoder instructions; the reviewer additionally compared native entry/play snapshots and listings for 34 of the 53 sampled rooms while capture was running. The completed full native-buffer/listing check covers all 150 rooms separately. The sample does not certify zero remaining errors. Its draw, verdicts and report remain private.

A focused independent sample of 20 numerical/widget facts passed, as did orientation banking and scope checks. Its selected claim pools are not an exhaustive factual census. Neither sample certifies zero remaining errors or constitutes kit/CHECKING maintainer verification.

| Check | Verified scope/result |
|---|---|
| Multiload migration | 150 native original-reader entry/play pairs; one reader hit and 256 buffer stores per room; all 38,250 retained room-source bytes and 2,550 row/tail annotations checked; resident listing bytes and all 371 original comments preserved |
| Disk widget arithmetic and sound | 214,299 original-code cases: 200,704 route costs, 1,624 score/display cases, 181 timer values, 180 closing-picture updates, and 11,610 ordered SID ticks across all 100 motif/offset combinations; aliases 37–42 exercised |
| Picture gallery | 180 original source expansions, 53 actor selectors, and 47,520 preview pixels match the appropriate bitmap/sprite decoding |
| Trapdoor comparison | All 15 displayed tile/approach results agree with the original-code tile tests (50 disk and 50 cartridge cases). Five illustrative animations, replay, rapid selection, keyboard activation, reduced motion, and 320px/390px layouts pass browser checks |
| Disk/cartridge comparison | 450 disk room read/decode fixtures and 17 unique cartridge matches; cartridge route/score helpers, graphics initialization, motif cycle, tile directions, both digs/cancellations, and hole schedules agree |
| Native VICE checks | Forced-state score, gold, exit preservation, digging/refill, life controls, and room awards; separate disk/cartridge pacing captures |
| Shared frame renderer | Published reference and fresh capture each match all 104,448 pixels with zero differences |
| Cartridge source identity | Reassembly of the earlier source matches all 16,384 supplied payload bytes; semantic coverage remains separately scoped |
| Browser/build/tool checks | Desktop and 390px controls, all six tabs, all 151 generated Source pages, 334 map-to-source selections, resident address links and part navigation pass without page errors; the whole site builds 26 games/289 pages; required repository checks and 57 emulator qualification checks pass |

Offline tests use original instructions with explicit I/O/ROM hooks. Forced routine states establish behavior without proving ordinary-input reachability. Drive persistence, complete cartridge behavior, and the open cases below remain unverified.

## Selected disk and cartridge comparison

The contributor’s earlier [cartridge disassembly](https://github.com/jankfoundry/loderunner) supplied leads for the comparisons checked on 4 October 2026. Its annotations were not copied into the disk listing. Disk and cartridge addresses name separate engines.

### Source identity and provenance

The supplied CRT is labelled **Official Cartridge Image**. Its single 16,384-byte payload at $8000–$BFFF matches the earlier project's extracted cartridge. Reassembling that project's `disassembly/loderunner.asm` with 64tass 1.59.3120 reproduced all 16,384 payload bytes. This checks the cartridge assembly's byte representation; full semantic checking and disk-engine reassembly are separately scoped.

The source revision and hashes identify the exact inputs read, including working-tree content:

```text
Official Cartridge Image CRT SHA-256
  629471f8c1587ffd37c1b52b742e2755cc6e3773e9acd9e2d0c7aab4929cf8a0
Cartridge payload SHA-256
  a2ad27c5fc6b2ab29bc0ff4621a6d82ae90fba673b35a7b122a203cfbf3b1724
Earlier project HEAD
  0f15fdedd7d545582f627dcf26a29f13175a3c8f
disassembly/loderunner.asm SHA-256
  0368a113f51329ee3d9cb20e5b13860a9050748a9f44518e1360fab4238d2ac0
analysis/original-assembly-notes.json SHA-256
  8570a70e1b7b770e811af843b915db70d2dfb1ad0d284c5c92f9895bc559dab5
analysis/canonical-disk-variants.json SHA-256
  69e81a70eaabdd4c97158961dd57fa3066be2d97a09cef6d4dc426d1156eb1f7
```

Contributor: jankfoundry. The contributor recalls that the earlier work used **mostly GPT-6 Astra**; the complete historical model roster is unconfirmed. `game.json` preserves that qualification alongside the reported normalized model ID. The additions here were independently verified and written using the model recorded for this Games Explained run. The separate project was read only; no generators, service rebuilds, or edits ran there.

### Findings checked

| Claim and result | Disk | Cartridge |
|---|---|---|
| Room-cell order: Disk raw offset 1, not 0; cartridge expansions match 17 disk boards | $71F5, $71FA read; $6FA6 decode | $97DE, $980B decode |
| Route cost: Same result for all 200,704 legal row/column combinations in each engine | $81CE | $A5FD |
| Score arithmetic and visible digits: Same 1,624 cases per engine, including overflow and the undisplayed eighth digit | $87E6, score $130A – $130D | $8FED, score $77 – $7A |
| Trapdoor direction tests: 50 centered tile/direction cases per engine agree | $73C7, $74DE, $7550, $75C8, $7671 | $99E9, $9AD4, $9B38, $9BA2, $9C28 |
| Digging cadence: Disk CPU and forced VICE calls: 13 updates per successful dig in either direction | $76E6, $77A5 | Prior source lead |
| Hole-table bound: At most 14 active timed holes under normal legal loop/reset flow; attaining 14 on a board is unproved | $611C, $6FC5, $7B12, $84F1 | Prior source lead |
| Default pace: Over 120 PAL frames: disk 144 IRQs/72 passes; cartridge 144 IRQs/48 passes | Threshold 5, counter reset 3 | Threshold 6, counter reset 3 |
| Atlas size: Cartridge's 1,672 generated pattern bytes match its recorded native play snapshot | 104 source glyphs | $A8BB expands 76 compact sources |
| Completion motif cycle: Cartridge countdown and pitch shift checked for 70 completions; pitch offset cycles 2–11 in both | $641D, ten selections | $9760, seven selections |

The timing measurements concern the tested PAL setup and undelayed main loops. They do not promise a fixed wall-clock lifetime during scoring, disk access, or pauses. The disk mechanics checks pass 214,299 route, score, timer, closing-picture, and ordered SID-tick cases.

Cartridge graphics expand into $1800–$1E87; these shape indexes form a different namespace from the disk atlas. The cartridge wait threshold at $130C is six and its counter $6C resets to three. Its native 120-PAL-frame measurement includes 48 hole services, about 20 undelayed passes/second versus the disk’s measured 30.

### Supplied disk variants

All three supplied IT files load 22,528 engine bytes at $6000. Comparing payload bytes with Black Label gives:

| Supplied image | Different IT engine bytes |
|---|---:|
| Black Label | Reference payload |
| Gray Label | 10 |
| Yellow Label | 275 |

These counts exclude the two-byte load address. Gray changes startup selection and disk-probe values; Yellow also changes startup and carries additional loader/protection files. Native boot observations and the loader boundary are recorded in `orientation.md`. All 150 room sectors are identical across the three copies. Their score-sector contents at track 12/sector 7 are not all identical; this is a data comparison, not a fresh-boot persistence test.

### Cartridge room order

The 17 low bytes at $AC00 and relative high bytes at $AC12 select compressed streams $AC24–$B657. Each descriptor's low nibble is a tile; its high nibble plus one is a run of 1–16 cells. Each stream expands to 448 cells, packed into 224 bytes. All streams end exactly on a run boundary. The original decoder leaves the destination's 32-byte tail untouched; the full initializer clears the workspace first.

| Cartridge room | Disk room | Compressed bytes |
|---:|---:|---:|
| 1 | 1 | 105 |
| 2 | 5 | 136 |
| 3 | 111 | 98 |
| 4 | 46 | 126 |
| 5 | 50 | 139 |
| 6 | 11 | 104 |
| 7 | 4 | 164 |
| 8 | 12 | 128 |
| 9 | 100 | 162 |
| 10 | 33 | 197 |
| 11 | 48 | 157 |
| 12 | 84 | 151 |
| 13 | 14 | 296 |
| 14 | 64 | 143 |
| 15 | 6 | 178 |
| 16 | 134 | 119 |
| 17 | 150 | 209 |

The native disk room-one buffer independently matches raw offsets 1–224; runner start is (14,14). The streams total 2,612 bytes. Each expansion has exactly one matching board among all 150 disk payloads, and all three supplied disks contain identical room sectors. The room browser displays this cartridge sequence using disk graphics. The picture gallery decodes each edition’s generated sources and shows the gameplay sprite masks for actor selectors.

## Explicit open questions

- Complete cartridge controls, editor workflow, persistence, and semantic coverage beyond the selected checks above.
- A playable route attaining the conditional 14-hole upper bound; arranged CPU allocations establish timer arithmetic, not that route. The forced full-table behavior remains a routine contract outside the normal legal-flow invariant.
- Ordinary reachability/effect of the guard search’s right-bar pointer reuse and bottom-row adjacent directory reads, and the retained uncapped difficulty entry.
- Full end-to-end editor save/reload and high-score persistence across a fresh boot; static disk paths are traced separately from these integration tests.
- Complete loader/protection reconstruction and byte-identical reassembly; these are future scope, not claims of this Silver engine listing.
- Complete editor write/read buffer alignment: original pack/write and reader loops are traced, but drive-buffer protocol and a full round trip remain integration checks.
- Ordinary consumption of retained demo-input tail bytes; forced zero-duration tests establish 256 control polls without proving that the demo reaches those records.

# Target Renegade — agent history

## 25 October 2026 — Bronze

The contributor chose Bronze, authorized online research, and confirmed unorig's noreply identity. Started game/c64/target-renegade from upstream main 0496d3c1. Existing v3.13.2 tools were reused; all 57 emulator checks passed. No downloads beyond the authorized documentation/reference research were needed.

An early screenshot was taken before check-emulator's final restart finished, so it showed the test program. The cartridge was loaded again after the checks completed. A black transition was also initially captured as a title. Both were rejected after visual inspection. Port-2 fire left the completed title unchanged; port-1 fire reached stage one. The first low-resolution reading of the screen misread Martin McDonald's credit and the life digit. The exact title records and $8000 initialization corrected those readings before publication: Martin McDonald and five lives.

Cold boot with a $2600 breakpoint took longer than the initial 40-second polling guard. Warp completed the loading picture and reached $2600; it was turned off before saving. Entry/play comparison found initialization bytes around $020D overwritten by play state. The listing therefore uses entry.vsf. The disassembler was first requested before its destination folder had a snapshot and did not start; after the file was placed there, the separate part session answered. These were visible setup errors, not missing game behavior.

The first flow trace wandered into the $2000–$20C1 table area. That range was restored to undefined. Explicit IRQ-phase types and entry labels were added; six fixed-length title rows were typed as screen codes. Routine boundary labels prevent short entry comments from counting adjacent unanalysed paths. The initial register census is partial and no absence claims rely on it.

Initial coverage was zero. The final first-load ledger explains 720 of 61,942 bytes (1.2%), including 61 unclassified loaded stretches in the denominator. Eleven bank folders and the manual's second load are registered as unstarted. The raw-bank matching results are leads only; no copies were excluded from their ledgers. The stage-one frame rebuilt with zero differing pixels.

Five handwritten comments were re-read and supported with bounded simulator checks. Six generated title-row comments were validated against their copying loop and fixed record starts; three rows were separately inspected. No independent sample was made, as this was Bronze. The final handover and test outcomes accompany the branch.

Validation: binary, documentation, and listing checks passed. The site built all 67 games. The full kit run passed 308 tests, skipped seven unavailable Spectrum/SkoolKit oracle tests, and failed four tests on environment restrictions or the macOS `/var` versus `/private/var` temporary-path alias. Rerunning those four with local execution access and `TMPDIR=/private/tmp` passed all four. The combined result is 312 passed and seven skipped; unavailable oracle checks were not claimed as passing. The existing Toki listing warning was observed before and after this game's final listing rebuild; its files were not changed.

The rendered page, its external reference image, and the $8000 Source link were inspected in the in-app browser. The build's first attempt caught a Markdown link to an unpublished facts.md and a stale listing build label; both were corrected and checks rerun. A private pass-skill note was written in work/skill-suggestions.md. No PR notes or issue were written.

## 25 October 2026 — model identification

The contributor identified this session as 6.1 Sol. The run record now uses gpt-6.1-sol, and models.py confirms that identifier is proven. The page was rebuilt to remove the model-check warning. Bronze remains the chosen and achieved tier; this correction adds no analysis or independent verification.

## 26 October 2026 — Silver analysis checkpoint

The contributor requested Silver. Captured stages 2–5 and the ending by invoking native transition/setup routines with explicit state changes; these captures are not a claim to have completed the fights. The directory records and E/F/G/H/I load comparisons established resource ownership. The cold entry preserves the loader source at $3546–$3645; the earlier statement about original code at $020D was reversed. Title entry copies the template into $020D, then overwrites its source with screen text.

Decoded two resource sets, their swapped fonts/colours/sprites, map columns, metatiles, the ending stream, all nine music cues and thirteen effect definitions. Music isolation matched 2,018,480 ordered SID writes over 150,497 calls. Independent sampling found four handwritten detail errors and a repeated sprite-writer citation error in fifteen generated samples. The generator and all affected comments were corrected. An unsupported table-mutation claim and references to an unfinished map browser were removed. The review does not constitute a full audit.

The review was interrupted by the account usage limit, then resumed from forty saved verdicts after the contributor asked to continue. Analysis and page work remain in progress.

### Initial Bronze register census

```text
register census (bytes from the snapshot, blocks from symbols.json): 141 instructions name 38 registers
  $0000  cpu_port_ddr             sta        1  first $2618
  $0001  cpu_port                 sta        5  first $2614
  $D001  vic_sprite0_y            sta,x      1  first $ABAD
  $D009  vic_sprite4_y            sta,x      1  first $ABB0
  $D011  vic_control1             sta        3  first $2626
                                  stx        2  first $AB74
  $D012  vic_raster               cmp        5  first $26D8
                                  lda        1  first $93E9
                                  sta        5  first $AB92
  $D015  vic_sprite_enable        stx        1  first $26A0
                                  sty        1  first $295E
                                  sta        5  first $341B
  $D016  vic_control2             stx        1  first $2634
                                  sta        2  first $AB79
  $D018  vic_memory               sta        6  first $2621
  $D019  vic_irq_status           sta        1  first $AAF9
  $D01A  vic_irq_enable           sta        1  first $AF1B
  $D01B  vic_sprite_priority      sta        4  first $8064
  $D01D  vic_sprite_expand_x      sta        1  first $A86B
  $D020  vic_border               stx        1  first $262E
                                  sta        2  first $A85C
  $D021  vic_background0          stx        1  first $2631
                                  sta        1  first $A859
  $D022  vic_background1          sta        2  first $AB88
  $D023  vic_background2          sta        2  first $AB8D
  $D025  vic_sprite_mc0           sta        1  first $ABC2
  $D026  vic_sprite_mc1           sta        1  first $ABC7
  $D400  sid_v1_freq_lo           sta,y      8  first $0710
                                  sta,x      1  first $2334
  $D401  sid_v1_freq_hi           sta,y      7  first $0A21
  $D402  sid_v1_pulse_lo          sta,y      4  first $0A4F
  $D403  sid_v1_pulse_hi          sta,y      5  first $0A5A
  $D404  sid_v1_control           sta        2  first $083B
                                  sta,y     10  first $21BC
  $D405  sid_v1_attack_decay      sta,y      5  first $21BF
  $D406  sid_v1_sustain_release   sta,y      5  first $21C2
  $D40B  sid_v2_control           sta        2  first $0B89
  $D412  sid_v3_control           sta        2  first $0D27
  $D414  sid_v3_sustain_release   sta        2  first $0D38
  $D415  sid_filter_cutoff_lo     sta        1  first $0ABD
  $D416  sid_filter_cutoff_hi     sty        1  first $076A
                                  sta        1  first $0AC3
  $D417  sid_filter_resonance     sty        1  first $0767
  $D418  sid_filter_mode_volume   sta        4  first $07BB
                                  sty        1  first $2935
  $DC00  cia1_port_a              sta        3  first $283E
  $DC01  cia1_port_b              lda        5  first $26CC
                                  sta        1  first $2869
  $DC0D  cia1_interrupt           sta        1  first $AF1E
                                  lda        1  first $AF21
  $DD00  cia2_port_a              sta        6  first $261C
  $DD0D  cia2_interrupt           sta        4  first $840B

named by no instruction:
  $D000        vic_sprite0_x
  $D002-$D008  vic_sprite1_x to vic_sprite4_x  (an indexed access from $D001 may reach it)
  $D00A-$D010  vic_sprite5_x to vic_sprite_x_msb  (an indexed access from $D009 may reach it)
  $D013-$D014  vic_lightpen_x to vic_lightpen_y  (an indexed access from $D009 may reach it)
  $D017        vic_sprite_expand_y  (an indexed access from $D009 may reach it)
  $D01C        vic_sprite_multicolour  (an indexed access from $D009 may reach it)
  $D01E-$D01F  vic_sprite_collision to vic_sprite_bg_collision  (an indexed access from $D009 may reach it)
  $D024        vic_background3  (an indexed access from $D009 may reach it)
  $D027-$D02E  vic_sprite0_colour to vic_sprite7_colour  (an indexed access from $D009 may reach it)
  $D407-$D40A  sid_v2_freq_lo to sid_v2_pulse_hi  (an indexed access from $D406 may reach it)
  $D40C-$D411  sid_v2_attack_decay to sid_v3_pulse_hi  (an indexed access from $D406 may reach it)
  $D413        sid_v3_attack_decay  (an indexed access from $D406 may reach it)
  $D419-$D41C  sid_paddle_x to sid_v3_envelope  (an indexed access from $D406 may reach it)
  $DC02-$DC0C  cia1_ddr_a to cia1_serial
  $DC0E-$DC0F  cia1_control_a to cia1_control_b
  $DD01-$DD0C  cia2_port_b to cia2_serial
  $DD0E-$DD0F  cia2_control_a to cia2_control_b
```


## 26 October 2026 — Silver close-out

Completed the 92,945-byte scoped ledger with zero bare bytes. Recovered computed-dispatch routines, described combat/AI/pose tables and raster/reflection code, and removed stale automatic interior aliases after their enclosing routines/data had descriptions. The retained alternate sound fragment was kept in scope with its input precondition explicit. Code/data-sharing bytes and self-modified operands are identified in the listing.

Native input tests covered 36 neutral cases and complete held front-attack/diagonal-jump sequences. Live counter tests covered extra lives, last life, pause, title music selection, timer spacing and controlled object damage. Five native font/colour selections matched the map browser. Four committed page tests cover maps, music, effects and mechanics/frame data. Desktop and 390-pixel map layouts were inspected; every control family was exercised and browser diagnostics showed no errors.

The final sixty-comment draw was checked by two independent agents after the first hit its usage limit at forty. Five sound-detail errors were corrected in all matching comments. Following the same active/sequence condition corrected the page effects player's end test as well. Both samples remain over the mark; a full audit is recommended. The contributor then asked to finish the active part and prepare a PR.

The authored pages were committed before the final reading-age rewrite. The rewrite defines video registers, sprites, buffers and the temporary reflection cache at first use, makes the direction-number link explicit, and preserves the address/count evidence. The diff was read against the draft; the tested JavaScript blocks were unchanged.

## 28 October 2026: history, reception and new tabs

A contributor asked for the page to be modelled on Doctor Who and Fist II, with the game's history, reviews, and loading picture. The session ran on `claude-sonnet-5-5`, which the kit does not list as proven, so the pass wrote only copy, images, and page code, and changed no listing comment or symbol. The tier stays Silver; a proven model should check the new copy.

The fork's `main` was 313 commits behind upstream, so the Target Renegade work was missing until the contributor synced the fork. Research notes stayed in the gitignored `work/research.md`, because the kit allows only its own notes in a game folder.

Sources read: Wikipedia's two Renegade articles (raw wikitext through curl, since the fetch tool was blocked), a saved Lemon64 page, the Imagine manual (pages 14 and 15, as a scanned PDF), and images of the Zzap!64 and Commodore User reviews. A saved GamesNostalgia page was rejected: it described subway stations and knives that the manual and the game do not have.

Findings: the loading picture credits different people from the manual (it was drawn by running `TARGET REN. SPIC` from the disk in the kit's simulator, with a blank character ROM so the loader could pass its font copy). Zzap!64 says five lives, which matches the cartridge and not the manual. Several magazine claims match the code: two enemy slots, a hold that needs a partner, and an ammunition byte for the gunman.

New pages: Gameplay, Controls, Graphics (a sheet of all 99 sprite components), Music (the players moved from the overview, with the sound tests pointed at the new page), and Solution. The overview gained the story, the licence history, and the reception.

## 28 October 2026: Opus audit

The two earlier samples were over the mark, so the listing was audited by checkers on `claude-opus-5-5`, as `kit/CHECKING.md` asks. Six checkers took the 458 handwritten comments in chunks of about 77 (34 wrong details, two wrong, three doubtful, one unverifiable), one took the 33 template families (two families wrong, 17 comments), one took facts.md and features.md (88 claims, two wrong), and one read the new pages (about 200 claims, 37 wrong, overstated or unsupported, 27 style breaches). Each checker's report was spot-checked against the code before it was believed; all nine held.

56 comments were rewritten and the listings rebuilt with `listing.py --recomment`. The pages were corrected where they repeated those facts: Space switches the byte at `$0200` between MUSIC and FX (it is not a music on/off switch), the armed type starts with six rounds, a defeat restores two endurance units only when the total stays below 44, and the dismount copies the bike's position and puts the facing on the second component. Quotes the checker could not verify against the scans were kept, because they were read from the contributor's images; they are in work/research.md.


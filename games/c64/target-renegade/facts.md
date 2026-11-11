# Target Renegade — facts

These findings refer to the supplied OneLoad64 EasyFlash cartridge. Listings use the four recorded entry snapshots in orientation.md. The scoped engine/resource ledger explains 92,945 of 92,945 bytes. Explicitly open roles remain open; coverage is not a claim that every historical or visual question has been settled.

## Memory and loading

The processor port $35 exposes RAM under BASIC/KERNAL and keeps I/O visible. The shared engine remains in RAM while resource files replace $2C00–$33FF, $68C0–$7DFF and $B000–$FBFE. Alternate graphics under I/O are reached by $84FE with port $30. Native directory records and exact E/F/G/H/I comparisons establish these loaded extents. Cartridge storage copies are counted in their RAM owners; generic edition boot/loading code is outside the game-engine analysis.

Title entry $2600 copies source $3546–$3645 to $020D–$030C. The source belongs to first-load; the destination is generated runtime state. Ending files H/I replace sprite data and $3400–$35FF. The ending entry is $3400; the shared return path reloads A–D before title when necessary. Stage and ending captures use explicit state changes and native loading/setup, rather than a completed playthrough.

## Verified mechanics and data

| Finding | Evidence |
|---|---|
| Title fire reads joystick port 1 | $26CC reads $DC01 bit 4; live port-1/port-2 comparison. |
| The supplied edition starts with five lives | $8000 stores $35 AND $0F at $020C; live HUD agrees. The manual says three; Zzap!64 38 (June 1988) says "his complement of five", so the manual disagrees with the game and the review. Why is unexplained. |
| Extra life requires passing the threshold | $FC00 compares packed BCD score with $020A/$020B. Equality does not award; above does. Initial displayed threshold is 50,000; each award advances it by 100,000. Lives are capped at nine. Four native cases passed. |
| Stored score units are hundreds of displayed points | $FC35 formats four BCD digits by calling $FC43 once per byte, two digits each, and the template supplies two trailing zero digits. All 256 formatter inputs passed; pending-score addition is $FC5A. |
| The HUD template copy is 160 cells | $A803 uses X=$A0 down through $01, copying characters $2BF0–$2C8F to $3720–$37BF and colours $2B50–$2BEF to $DB20–$DBBF. |
| One horizontal colour-scroll direction omits row zero | $A6A9 shifts 39 cells in each of rows 1–19. Independent simulation recorded 741 writes; row zero remained unchanged. |
| Background maps are 80 columns by 20 metatiles | $2A6C reads column-major indices at $2DC0. Each selects sixteen row-major character codes at $B000. Native draws matched 48 column/row cases across both loads. |
| Stage changes exchange graphics resources | $84FE exchanges 8 font pages, 1 colour page or 21 sprite pages according to six pointer/count entries. Flags $03F8–$03FD track the exchanges. |
| Sprite reflection tables are generated | $A8C8 generates bit reversal at $0400 and two-bit-pixel reversal at $0500. All 256 inputs matched each mapping. The generated sprite cache is $7E00–$7FFF. |
| Sprite pointers reach both playfield screens | $AD10–$AD15 reads $6A,X or a generated-cache pointer and writes $43F8,Y/$47F8,Y. $9567 selects actor depth/slot ordering. |
| IRQ/NMI use hardware vectors | $AF0F writes $AAF0/$A973 to $FFFE/$FFFA. Live first-stage reads agree. IRQ dispatch pushes target-minus-one words from $AB2F. |
| One recorded frame reproduces exactly | 38 recorded video writes; all 104,448 pixels matched the emulator picture. This validates that captured frame. |

## Text

Title rows use screen codes, A–Z=$01–$1A and space=$20. $2659–$2699 copies six rows of 27 characters from $2791/$27AC/$27C7/$27E2/$27FD/$2818. Credits name Dave Collier, John Palmer, Martin McDonald and Gary Biasillo. Status messages at $84AA are XOR-$17 encoded with a negative decoded terminator; $848E writes their low six bits. Logo and status graphics use the authored charset at $3800.

## Sound

Music initializer $0700 selects nine sets of three stream pointers from $15E7–$161C; tick $07BF advances enabled streams. Notes below $80 index frequency tables, $5E skips a new pitch, and commands $80–$97 control substreams, loops, instruments, durations and modulation. Invalid slots $85/$94/$96/$97 enter the border-colour trap at $1433. Undocumented LAX instructions in direct-SID-write commands are preserved explicitly.

The isolated driver $0700–$2022 agrees with the full snapshot in every ordered SID write across 150,497 calls and 2,018,480 writes. Cues 0–4 ran for 30,000 calls each without ending; cues 5–8 ended after 78,145,129,145 calls. This is a bounded observation, not proof of all looping periods. `test_music.js` repeats the comparison from committed listing bytes and checks the page's own driver. Effects use a separate driver at $20C2/$21F5 and thirteen definitions.

## The 1988 cassette

These come from the cassette, not the cartridge the listing describes: the Ultimate Tape Archive's `Target- Renegade Side 1.tap` (992,738 bytes, SHA-256 `11d5456bf7e6ad609174d4c968f4fe54397da9e4b2dc8d5b2324555f140be1d1`), loaded in VICE 3.10 with vice-mcp 3.14.0 on 11 November 2026.

- **Loading tune.** At about 89 s the loader calls $B54C ($08FD), sets $D418 to $0F, and then calls $B611 once a frame, waiting for raster line $10 each time ($090A, and $0967 after the picture). The tune's code and notes are $B54C–$C7FF. VICE stopped after each of the 11,579 calls ($0914 and $0971, until the loader silences the SID at $098F); its registers equal the kit's simulator over the same bytes in every call (VICE reports the pulse width's top nibble as 0, and $D418 bit 3 in $D417's place). The volume is 15 to call 8,160, steps down by one every 96 calls to 1 at call 9,409, and stays at 1. The High Voltage SID Collection's `MUSICIANS/D/Dunn_Jonathan/Ocean_Loader_4.sid` (title "Ocean Loader 4", released "1988 Ocean") loads at $B550–$C7FF with init $B550 and play $B611; 4,685 of the cassette's 4,788 bytes are the same at the same addresses, and played on the simulator its registers equal the cassette tune's for 12,000 frames. The Music tab plays it to the end of the fade (`test_loading_tune.js`).
- **Loading picture.** From about 89.8 s the screen shows a multicolour bitmap in bank 3 ($DD00 = $C0, $D018 = $29: screen $C800, bitmap $E000) with the bitmap still 0, so black; the screen colours and colour RAM arrive by 106.8 s. The bitmap fills from $E000 upward, every byte past the front still 0, from about 112.2 s to 136.0 s (memory read every 10 frames from 110 to 150 s). The picture differs from the disk's `reference/loading-screen.png`: no credits, signed "martin". A frame recorded at 150 s drew equal to VICE's picture in 104,443 of 104,448 pixels, the other 5 being VICE's grey dots at the loader's border stores. The Graphics tab replays it without the border stripes (`TR_FRONT`, `test_loading_picture.js`).

## The listing's error rate

Foundation sample seed 2026102501 drew 40 of 60 handwritten and 20 of 856 generated comments. The independent gpt-6-astra checker found 19 wrong-detail comments, no wholly wrong comments, one doubtful claim and four unverifiable citations. Native checks supported the 19 errors: four handwritten details and fifteen instances of an incorrect sprite-writer reference. All occurrences were corrected through the generators. The unsupported mutation claim and future-browser citations were removed. The unweighted wrong-detail rate was 31.7% (Wilson 95% interval about 21.3–44.2%); the stratum-weighted estimate was 70.7%, dominated by that repeated sprite citation. The sample is over the mark and gives a lower bound on the error rate; correcting sampled claims does not establish the remaining comments as correct. A full audit is recommended.

Sample seed 2026102601 drew 40 of 379 handwritten comments and 20 of 1,243 generated comments. An independent gpt-6-astra checker completed the first 40, then hit its usage limit. A fresh independent gpt-6.1-sol checker completed the remaining 20. Combined findings were 55 right and five wrong-detail comments, with no doubtful or unverifiable comments. The five errors concerned a retained fragment's A precondition, the one-slot effect reset, a selector's destination, the active condition for sequence updates, and a sequence-boundary tick that reads no table entry. The run corrected all five and every matching generated sentence; the caller's reset description and page player's active test were also corrected. The unweighted rate was 8.3% (Wilson 95% interval 3.6–18.1%); weighting by stratum size gives 2.9%. This sample is over the mark and neither sample is a full audit. A full audit is recommended.


## Live verification

Native tests used a saved neutral first-stage state with ordinary and special enemy slots explicitly cleared. Thirty-six joystick/facing cases exercised movement and directional-fire dispatch. A held front attack ran for one action cycle without repeating; a diagonal jump moved raw X across 36 units over its active sequence. Commodore presses toggled pause from 0 to 1 and back to 0. Space changed title selection 0 to 1 after release, while the tested normal-play passes retained selection 0. These observations are phase-specific.

Live score fixtures kept five lives at exactly 50,000, awarded a sixth at 50,100 and retained nine at the cap; both greater-score cases advanced the threshold to 150,000. Zero endurance with one remaining life set the negative end flag. Invoking the native object-damage routine in a controlled 44-endurance state produced 40. Timer tests observed successive decrements 51 main-loop calls apart. Full state traces stay private under work/.

The committed page tests compare nine music cues over 150,497 calls, thirteen effect requests on each of three voices over 78,000 calls, 51,200 native map characters, 300,000 valid score cases, 198 stored-component mirrors and all 256 uniform-byte patterns in both modes. Five native stage snapshots matched the browser's font and colour allocations exactly. The trimmed frame and full native-compared frame share pixel hash `b70d6f5361c41a3c062b47f434ebd3a6de32e7dc364b90f1fd16cf8050f7c111`; the page embeds 2,229 RAM bytes read by that drawing.

## The listing after the audit

On 28 October 2026 independent checkers on `claude-opus-5-5` audited all 1,622 comments in the four parts: each of the 458 handwritten comments was read against the code, and the 1,164 generated comments (33 template families) were checked by script for every instance and by hand for at least eight each. All 88 claims in this file and in features.md were checked too. 15 of those claims rest on the live emulator or on snapshots and could not be checked from the listing. A sample of 60 comments drawn afterwards with seed 2026102801 found all 60 right.

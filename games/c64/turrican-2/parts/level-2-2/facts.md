# Level 2-2 — technical facts

Source traces use the pre-initialization `$551B` handover snapshot. The listing describes all 24064 bytes replaced by this load, including 8190 code bytes. Inherited terrain definitions, character art and earlier sprite slots remain owned by previous parts.

## Map and embedded allocations

The nominal map has 170 columns and 48 rows, 8160 bytes at `$9000-$AFDF`. It includes data and executable helpers between terrain rows: initialization glyphs at `$9082`, boss shape/colour/bitmap matrices, swimming-environment rotation helpers at `$AAD6`, `$AB80`, `$AC25`, `$AC31`, `$ACCF` and `$ACDB`, and the departure callback at `$AF36`. These allocations are separately named in the listing. The actor directory reaches 68 distinct terminated streams, beginning at `$8B64`.

The special boss X allocation uses `$F13A-$F1A8`, overlapping physical sprite slots `$C4-$C6`. The remaining twenty-three bytes of slot $C6 have unresolved display use. Source animation frames at `$FF40-$FF7F` occupy physical slot $FD. A bitmap atlas must distinguish these data allocations from complete sprite pictures.

## Lift

Type-four actors initialize a two-sprite platform. A centred player pressing down can start a special raster sequence at `$6EA2`. It increments the camera row, alternates the two character screens and copies twenty rows upward. `$7040` draws the new bottom row from the stored terrain map and prepares forty colours; `$70D1` scrolls colour RAM and appends that row. At camera row $A0 it stops the lift and installs the exit player hook. That hook creates two attached effects and later restores ordinary player movement.

## Boss and departure

The large enemy uses five sprite columns with twenty-one stored bands. Six outer components each start with thirty health. Destruction awards 1500 points per component and animates selected body cells. When all six states clear, `$87B3` enables the central target. Its separate counter begins at $0100. A detected hit first erases the terrain projectile, then uses the selected component band and shared character-damage amount. Central high-byte underflow initiates the final death phase.

A fifty-two-entry script selects twenty-one action-directory entries. The eight distinct routine targets implement left/right movement, vertical bobbing, horizontal oscillation, waiting, vertical movement and capture. Capture replaces the player movement hook with `$83D9`, which derives player coordinates from the selected body band until the exit bound restores ordinary control.

The body raster reuses hardware sprites three through seven. Its bitmap-row exchange saves and replaces fifteen bytes, then restores them through `$8AFF`. Final death awards 50000 points, creates eleven departure fragments and restores the ordinary camera/raster hooks. A subsequent type-twelve controller drives the scripted departure scene and enters the shared next-level transition; no full playthrough was needed to inspect those callbacks.

## Other actors

Type three is a four-part jumping creature with two shared health. On death it becomes four type-seven bouncing actors. Type six controls rising hazards and paired falling emitters. Type seven splits into children on a detected hit. Type eight is a stationary parent with falling and walking child phases. Type nine is a fixed vertical emitter and its shot path. Type ten is a reward platform, type eleven is the departure fragment, and type twelve is the scripted departure controller. Types thirteen and fourteen select the resident no-op hook.

## Instruction evidence

`work/trace_level22_tables.json` at the game root records original CPU instructions. Three instructions from `$7DF6` copy the byte at `$90A1` into glyph storage `$C15F`, confirming bitmap data inside nominal map storage. Six instructions from `$810C` read action ID zero and the split routine bytes at `$9F33/$9FDD`, then patch the JSR target to `$8159`. These are instruction traces, rather than comparisons of periodic state logs.

## Open questions

The visible identities of several multipart creatures and the use of the retained partial sprite-slot tail remain open. The launched reward side test reads the unindexed `$BC6C`, while movement uses `$BC6C,X`; no visible defect is claimed without a targeted reproduction.

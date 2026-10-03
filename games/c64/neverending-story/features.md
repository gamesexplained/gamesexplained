# The NeverEnding Story — features

Inventory: [game documentation](https://www.lemon64.com/doc/neverending-story/412), consulted 30 September 2026. Imported annotations guide searches.

| Feature | Status | Evidence or open work |
|---|---|---|
| Boot and first command prompt | live | Fresh Ocean disk boot; reference capture |
| Picture/text display | live | Eight cycle-positioned register writes; full reconstructed frame matches all 104,448 emulator pixels |
| Commands and rules | partly live | LOOK, INVENTORY, rejected directions, NE/SW movement and unknown-word response observed; dispatch patching traced |
| Illustrated locations | live | All 21 captured records: native $05BF output matches decoded bitmap, screen and colour bytes; browser pixels independently compared |
| Objects and inventory | partly traced | $15E3 subtracts $32 from the noun token and searches $22A4 for the icon slot; state lookup uses the relative noun id. Empty inventory observed; controlled TAKE/DROP test verifies location, carried count and icon overlay |
| Multipart progression | open | $03A0 exchange and $9700 loader traced; later parts need captures |
| Save/load | live | SAVE stops at RTS $0491; LOAD stops at RTS $045F; serialized state unchanged after each command |

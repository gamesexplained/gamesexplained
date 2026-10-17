# What the port found wrong in the listing

Porting a routine means reading every instruction of it; each comment the port showed wrong is
corrected in `symbols.json` and listed here (kit/skills/core/70-minisite/play.md, "What the port
finds in the listing"). A checker that had written none of the port then compared the comments
of the 114 routines it covers with the port's code and the instructions; these are the six it
found wrong.

| Address | Was | Is |
|---|---|---|
| $2470 MUL_S16_S8_TO_S24 | Y among the registers it changes | Y is only read ($2475, $2484), never written |
| $2643 MUL_S8_S8_TO_S16 | Y among the registers it changes | Y is only read (TYA at $265C) |
| $3B68 CLASSIFY_VERTEX_AGAINST_CLIP_PLANE | X among the registers it changes | X is never written in $3B68-$3C04 |
| $3EE5 CLASSIFY_PROJECTED_WINDING | Y among the registers it changes | Y and $7A/$7B are pushed at $3EE5-$3EEC and restored at $3F65-$3F6B |
| $62E8 DISPATCH_AIM_FIRE_ACTIVATE | an activation otherwise shows the message at $1470 or $1480 | $1470 for an object too far away, $1480 for one near enough with no token with both top bits set; nothing picked ($647D), an object FIND_OBJECT_BY_ID cannot find ($6489) or one larger than five times the area scale on an axis ($649E) ends the action at $659B with no message |
| $7B03 PROMPT_SAVE_DEVICE_AND_NAME | goes on to the KERNAL's save or load | returns (RTS at $7C59) to its only caller, LOAD_SAVE_DISPATCH ($0446), which makes the KERNAL calls |

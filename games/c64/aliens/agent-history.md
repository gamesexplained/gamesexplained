# Aliens — agent history

- Snapshots of levels 3 to 6 came out byte-identical to the trainer menu snapshot at first. A snapshot save had left the emulator paused, so the next snapshot load stayed paused, the route's keys did nothing and the saved RAM was the menu's. The fix was to resume after each load and to delete an old snapshot of the same name before saving.
- Pressing RETURN once too often in play ended the level and went back to the trainer menu.
- The status code must be typed as key presses; the KERNAL buffer path did nothing.

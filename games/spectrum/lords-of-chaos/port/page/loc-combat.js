/* loc-combat */
// One blow (strike_hit $8605, from $8645): a random number below twice the attacker's combat plus
// 2 (255 at most, but 256 for a combat of 255, whose INC wraps to 0; random_below $A737 takes a
// limit of 0 as 256), less the defender's defence; above 0 it is the damage, taken
// from the defender's constitution (damage_and_rider $78D6). test_combat.js holds it to the game's
// code with the random number fixed.
//   LOCCombat.limit(combat)            how many values the random number can take
//   LOCCombat.damage(combat, defence, roll)   the damage for one roll (0: the blow does nothing)
//   LOCCombat.odds(combat, defence)    { hit: the chance a blow does damage, mean: the damage a blow
//                                      does on average, most: the most it can do }
var LOCCombat = (function () {
  const limit = c => (c & 255) === 255 ? 256 : Math.min(255, 2 * ((c & 255) + 1));
  const damage = (c, d, roll) => Math.max(0, roll - (d & 255));
  function odds(c, d) {
    const n = limit(c);
    let hits = 0, sum = 0, most = 0;
    for (let v = 0; v < n; v++) { const k = damage(c, d, v); if (k > 0) { hits++; sum += k; most = k; } }
    return { hit: hits / n, mean: sum / n, most };
  }
  return { limit, damage, odds };
})();
// end of loc-combat

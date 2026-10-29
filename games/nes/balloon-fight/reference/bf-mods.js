/* bf-mods.js */
// The Play tab's mods: changes a viewer switches on over the port (bf-port.js) on the page's
// machine (bf-play.js). None of them is in the game, and test_play.js runs the port with all of
// them off. Each works through the game's own state or routines rather than beside them:
//   lives      the phase loop's lives held at 2, so a lost life is never the last
//   shield     resolve_hit ($EF37) and spark_hit_players ($CB1C) called with the game's own
//              invulnerable flag set for the players, the flag a new player has; set only for
//              those two calls, since the flag also flashes the player and, in Balloon Trip,
//              carries the player along with the scroll
//   calm       lightning_timer kept above 1, where cloud_flash ($C831) starts a flash and a spark
//   noFish     fish_find_target ($C614) finds no one
//   gravity    each actor type's gravity at gravity_by_type ($E601) scaled: 0.5 floats, 1.5 sinks
//   rewind     a state saved every half second at the top of the phase or Balloon Trip loop,
//              twenty seconds of them; rewind() puts the game back one, and play goes on from it
//   ghost      Balloon Trip's player recorded a frame at a time, the sprites the game put in the
//              sprite table, until the player falls or the game is reset; the run that lasted
//              longest plays back beside the next
//
//   const mods = BalloonFightMods.create(g)         g from BalloonFightPlay.create
//   mods.set(name, value)    a mod on or off (gravity takes a number)
//   mods.rewind()            one step back; false when there is nothing older
//   mods.ghostSprites()      the ghost's sprite entries for this frame of the run, or null
//   mods.best                the longest run, { frames, sprites: [Uint8Array(24 * 4)...] }
const BalloonFightMods = (function () {
  'use strict';
  const SNAP_EVERY = 30, SNAP_KEEP = 40;
  function create(g) {
    const V = BalloonFight.V;
    const on = { lives: false, shield: false, calm: false, noFish: false, gravity: 1 };
    const mods = { on, best: null, run: null, snaps: [] };
    let gravityRom = null, rewinding = false;

    function wrap(P) {
      const M = g.M;
      const resolveHit = P.resolve_hit, sparkHit = P.spark_hit_players, countdown = P.lightning_countdown, findFish = P.fish_find_target;
      const shielded = (fn, r, who) => {
        const was = who.map((x) => M[V.invulnerable + x]);
        for (const x of who) M[V.invulnerable + x] = 1;
        try { return fn(r); } finally { who.forEach((x, i) => { M[V.invulnerable + x] = was[i]; }); }
      };
      P.resolve_hit = (r) => (on.shield && (r.x & 0xFF) < 2 ? shielded(resolveHit, r, [r.x & 0xFF]) : resolveHit(r));
      P.spark_hit_players = (r) => (on.shield ? shielded(sparkHit, r, [0, 1]) : sparkHit(r));
      P.lightning_countdown = () => { if (on.calm && M[V.lightning_timer] < 3) M[V.lightning_timer] = 3; return countdown(); };
      P.fish_find_target = () => (on.noFish ? (M[V.fish_target] = 0xFF, {}) : findFish());
    }
    function gravity() {
      const M = g.M;
      if (!gravityRom) gravityRom = M.slice(V.gravity_by_type, V.gravity_by_type + 12);
      for (let t = 0; t < 12; t++) M[V.gravity_by_type + t] = Math.max(1, Math.min(255, Math.round(gravityRom[t] * on.gravity)));
    }
    mods.set = (name, value) => { on[name] = value; if (name === 'gravity') gravity(); };

    // after each boot: the new port's routines wrapped, and the gravity table set again
    // a Balloon Trip run ends when the player falls, or when the game is reset or started again
    const endRun = () => {
      if (mods.run && (!mods.best || mods.run.frames > mods.best.frames)) mods.best = mods.run;
      mods.run = null;
    };
    g.onBoot = () => { endRun(); wrap(g.P); gravityRom = null; gravity(); mods.snaps = []; };
    g.onBoot();

    // at the top of a loop: a state saved every half second, unless the viewer is rewinding
    let lastSnap = -SNAP_EVERY;
    g.onLoop = () => {
      if (rewinding || g.frames - lastSnap < SNAP_EVERY) return;
      const s = g.save();
      if (!s) return;
      lastSnap = g.frames;
      s.run = mods.run ? mods.run.sprites.length : -1;
      mods.snaps.push(s);
      if (mods.snaps.length > SNAP_KEEP) mods.snaps.shift();
    };
    mods.rewind = () => {
      // the newest state at least a step older than now, so a held button keeps going back
      while (mods.snaps.length && mods.snaps[mods.snaps.length - 1].frames > g.frames - SNAP_EVERY) mods.snaps.pop();
      const s = mods.snaps.pop();
      if (!s) return false;
      rewinding = true;
      g.restore(s);
      lastSnap = s.frames;
      if (mods.run) { if (s.run < 0) mods.run = null; else mods.run.sprites.length = s.run; }
      return true;
    };
    mods.resume = () => { rewinding = false; };

    // each frame: the lives held, and Balloon Trip's run recorded
    g.onFrame = () => {
      const M = g.M;
      if (on.lives && !M[V.demo_flag] && M[V.game_mode] === 0 && g.loop && g.loop.kind === 'phase') {
        for (let x = 0; x <= M[V.two_players]; x++) {
          if (!(M[V.lives + x] & 0x80) && M[V.lives + x] < 2) { M[V.lives + x] = 2; M[V.status_request] = 2; }
        }
      }
      const tripPlay = g.loop && g.loop.kind === 'trip' && g.frames - g.loop.frame < 4 && !M[V.demo_flag];
      if (tripPlay && !(M[V.actor_balloons] & 0x80)) {
        if (!mods.run) mods.run = { frames: 0, sprites: [] };
        const slot = (M[V.frame_counter] & 1) ? M[V.actor_sprite_slots_alt] : M[V.actor_sprite_slots];
        mods.run.sprites.push(M.slice(0x200 | slot, (0x200 | slot) + 24));
        mods.run.frames = mods.run.sprites.length;
      } else endRun();
    };
    mods.ghostSprites = () => {
      if (!mods.best || !mods.run) return null;
      return mods.best.sprites[mods.run.sprites.length - 1] || null;
    };
    return mods;
  }
  return { create, SNAP_EVERY, SNAP_KEEP };
})();
if (typeof module === 'object' && module.exports) module.exports = { BalloonFightMods };
// end of bf-mods.js

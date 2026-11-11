/* Cooler */
const Cooler = (() => {
  const D = typeof CoolerData !== 'undefined' ? CoolerData : require('./cooler-data.js');
  const wallColours = D.wallColours;
  const glyphBase = [0, 0x44, 0x48, 0x50];
  function decode(level) {
    level &= 255;
    const digit = level % 10;
    const index = digit ? digit - 1 : 9;
    const packets = D.mazes[index];
    const cells = Array.from({length: 10}, (_, y) => Array.from({length: 20}, (_, x) => +(y === 0 || y === 9 || x === 0 || x === 19)));
    cells[0][9] = 0;
    const objects = [];
    packets.forEach((b, i) => {
      const x = 1 + (i % 6) * 3, y = 1 + Math.floor(i / 6) * 2;
      for (let bit = 0; bit < 6; bit++) cells[y + Math.floor(bit / 3)][x + bit % 3] = (b >> bit) & 1;
      if (b >> 6) {
        let bit = 0;
        while (bit < 6 && ((b >> bit) & 1)) bit++;
        if (bit === 6) throw new Error('Object packet has no open cell');
        objects.push({x: x + bit % 3, y: y + Math.floor(bit / 3), type: b >> 6, packet: i});
      }
    });
    const enemies = Math.min(6, 4 + Math.floor(level / 10) % 10);
    return {level, digit, index, packets, cells, objects, enemies,
      shape: D.enemyShapes[level & 7], colour: D.enemyColours[level & 7],
      spawns: D.spawns[digit].slice(0, enemies),
      nominalPoints: objects.reduce((n, o) => n + o.type * 100, 0)};
  }
  function tile(m, x, y, base, colour) {
    const a = 0x0c00 + (5 + y * 2) * 40 + x * 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      m[a + r * 40 + c] = base === 0x20 ? base : base + r * 2 + c;
      m[a - 0x400 + r * 40 + c] = colour;
    }
  }
  function memory(level, faded = false) {
    const board = decode(level), m = new Uint8Array(65536);
    m.set(D.font, 0x3800); m.fill(0x20, 0x0c00, 0x0fe8);
    const wall = wallColours[level & 3] + (faded ? 0x40 : 0);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 20; x++) tile(m, x, y, board.cells[y][x] ? 0x5c : 0x20, wall);
    // draw_level_number leaves $61 selected. Clear cells inherit that colour until a wall
    // selects the level's wall colour; an object restores the wall colour after it is drawn.
    let current = 0x61 + (faded ? 0x40 : 0);
    board.packets.forEach((b, i) => {
      const x = 1 + (i % 6) * 3, y = 1 + Math.floor(i / 6) * 2;
      for (let bit = 0; bit < 6; bit++) {
        const solid = (b >> bit) & 1;
        if (solid) current = wall;
        tile(m, x + bit % 3, y + Math.floor(bit / 3), solid ? 0x5c : 0x20, current);
      }
      const o = board.objects.find(p => p.packet === i);
      if (o) {
        tile(m, o.x, o.y, glyphBase[o.type], D.pickupColours[o.type] + (faded ? 0x40 : 0));
        current = wall;
      }
    });
    return {m, board};
  }
  function ted() {
    const r = new Uint8Array(32);
    r[6] = 0x1b; r[7] = 0x98; r[0x0c] = 3; r[0x0d] = 0xff;
    r[0x12] = 0; r[0x13] = 0x38; r[0x14] = 8; r[0x16] = 0x61; r[0x17] = 0x26;
    return r;
  }
  function useListing(L) {
    const take = (a, n) => Array.from(L.ram.slice(a, a+n));
    D.font=take(0x3800,0x348); D.playerHorizontal=take(0x330a,0x100);
    D.playerVertical=take(0x340a,0x180); D.explosion=take(0x358a,0x80);
    D.enemyFrames=[take(0x360a,0xa0),take(0x36aa,0xa0)];
    D.enemyColours=take(0x1b9f,8);D.enemyShapes=take(0x1b97,8);
    D.wallColours=take(0x194e,4);D.pickupColours=take(0x1854,4);
    D.mazes=Array.from({length:10},(_,i)=>take(0x2011+i*24,24));
    D.spawns=Array.from({length:10},(_,d)=>{
      const p=L.ram[0x1ba7+d*2]|L.ram[0x1ba8+d*2]<<8;
      return Array.from({length:7},(_,i)=>L.ram[p+i*2]|L.ram[p+i*2+1]<<8);
    });
    for(let i=0;i<4;i++)wallColours[i]=D.wallColours[i];
  }
  function lifeAfter(awards) {
    let value = 0x34;
    for (let i = 0; i < awards; i++) {
      value = (value + 1) & 255;
      if (value === 8) value--;
      if (value === 0) return {value, attempts: 0, breaks: true, awards: i + 1};
    }
    return {value, attempts: value - 0x30 + 1, breaks: false, awards};
  }
  function addPickup(score, type) {
    const digits=String(score).padStart(6,'0').split('').map(Number);
    let at=3;
    digits[at]+=type;
    while(at>=0 && digits[at]>=10) {
      digits[at]=0;
      if(--at>=0)digits[at]++;
    }
    return Number(digits.join(''));
  }
  function horizontalStep(x, half, direction, blocked) {
    if(blocked && (direction==='right'?half===1:half===0))return {x,half,moved:false};
    return {x:(x+(direction==='right'?1:-1))&255,half:half^1,moved:true};
  }
  function directionCandidate(state, first, fresh) {
    if(first<220)return {kind:'direction',direction:state&3,source:'retained'};
    if(fresh<45)return {kind:'idle',state:fresh+5,source:'fresh'};
    return {kind:'direction',direction:fresh&3,source:'fresh'};
  }
  const explosionFrameUpdates = [3,3,3,1];
  function advanceAnimation(frame, elapsed, delta, durations) {
    elapsed += Math.max(0,delta);
    const cycle=durations.reduce((sum,n)=>sum+n,0),cycles=Math.floor(elapsed/cycle);
    let advances=cycles*durations.length;
    elapsed-=cycles*cycle;
    while(elapsed+1e-8>=durations[frame]) {
      elapsed-=durations[frame];frame=(frame+1)%durations.length;advances++;
    }
    return {frame,elapsed:Math.max(0,elapsed),advances};
  }
  return {D, decode, memory, ted, tile, lifeAfter, useListing, addPickup, horizontalStep, directionCandidate, explosionFrameUpdates, advanceAnimation};
})();
if (typeof module !== 'undefined') module.exports = Cooler;
// end of Cooler

/* Original-data viewers and the tested mechanic ports in cooler.js. */
(async function () {
  const $=id=>document.getElementById(id);
  const status=document.querySelector('[data-ct-status]');
  if(typeof C16==='undefined') {if(status)status.textContent='The interactive viewers are available in the site preview.';return;}
  try {
    const L=await C16.load('listing.json');
    Cooler.useListing(L);
    const D=Cooler.D, black='#080808';
    const hex=n=>'$'+n.toString(16).toUpperCase().padStart(2,'0');
    function drawPixels(canvas, bytes, cols, rows, colour, scale=6, monochrome=false) {
      canvas.width=cols*8*scale;canvas.height=rows*8*scale;
      const c=canvas.getContext('2d');c.fillStyle=black;c.fillRect(0,0,canvas.width,canvas.height);
      for(let tile=0;tile<cols*rows;tile++)for(let y=0;y<8;y++) {
        const b=bytes[tile*8+y]||0;
        if(monochrome || !(colour&8))for(let x=0;x<8;x++) {
          if(b&(128>>x)){c.fillStyle=monochrome?'#e9e7e1':C16.css(colour);c.fillRect(((tile%cols)*8+x)*scale,(Math.floor(tile/cols)*8+y)*scale,scale,scale);}
        } else for(let x=0;x<4;x++) {
          const p=(b>>(6-x*2))&3;
          if(p){c.fillStyle=C16.css([0,0x61,0x26,colour&0x77][p]);c.fillRect(((tile%cols)*8+x*2)*scale,(Math.floor(tile/cols)*8+y)*scale,scale*2,scale);}
        }
      }
    }
    function map(canvas, level, overlay=false, inactive=false, selected=-1) {
      const {m,board}=Cooler.memory(level,true), picture=C16.render(m,Cooler.ted());
      const tmp=document.createElement('canvas');tmp.width=320;tmp.height=200;
      tmp.getContext('2d').putImageData(new ImageData(C16.rgba(picture),320,200),0,0);
      canvas.width=640;canvas.height=320;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
      c.drawImage(tmp,0,40,320,160,0,0,640,320);
      if(selected>=0) {
        c.fillStyle='rgba(80,170,255,.20)';c.strokeStyle='#92d8ff';c.lineWidth=3;
        const x=(1+(selected%6)*3)*32,y=(1+Math.floor(selected/6)*2)*32;
        c.fillRect(x,y,96,64);c.strokeRect(x+1,y+1,94,62);
      }
      if(overlay) {
        D.spawns[board.digit].forEach((a,i)=>{
          if(i>=board.enemies&&!inactive)return;
          const row=Math.floor((a-0xc00)/40)-5,col=(a-0xc00)%40;
          c.beginPath();c.arc(col*16+16,row*16+16,11,0,Math.PI*2);
          c.fillStyle=i<board.enemies?'#e9e7e1':'#666';c.fill();
          c.fillStyle='#111';c.font='bold 14px monospace';c.textAlign='center';c.fillText(String(i+1),col*16+16,row*16+21);
        });
      }
      return board;
    }
    function picker(select, previous, next, change, count=256) {
      const apply=()=>change(+select.value);
      previous.onclick=()=>{select.value=(+select.value-1+count)%count;apply();};
      next.onclick=()=>{select.value=(+select.value+1)%count;apply();};
      select.onchange=apply;apply();
    }
    if($('ct-packet')) {
      let selected=0;
      const draw=()=>{
        map($('ct-packet-map'),1,false,false,selected);
        const value=D.mazes[0][selected], type=value>>6;
        $('ct-packet').value=selected;
        $('ct-packet-readout').textContent=`Packet ${selected+1}/24 · ${hex(0x2011+selected)} = ${hex(value)} · object bits ${(value>>6).toString(2).padStart(2,'0')}: ${['none','key','ring','apple'][type]}`;
        const cells=$('ct-packet-bits');cells.replaceChildren();
        for(let bit=0;bit<6;bit++){
          const cell=document.createElement('span');cell.className=(value&(1<<bit))?'ct-bit ct-bit-wall':'ct-bit';
          cell.textContent=`bit ${bit}: ${(value>>bit)&1}`;cells.append(cell);
        }
      };
      $('ct-packet').oninput=()=>{selected=+$('ct-packet').value;draw();};
      $('ct-packet-prev').onclick=()=>{selected=(selected+23)%24;draw();};
      $('ct-packet-next').onclick=()=>{selected=(selected+1)%24;draw();};draw();
    }
    if($('ct-sounds') && typeof TEDSound!=='undefined')TEDSound.mount($('ct-sounds'),{tunes:CoolerSounds,bounce:false});
    if($('ct-frame')) {
      const m=new Uint8Array(65536);m.set(D.font,0x3800);m.set(CoolerFrame.screen,0xc00);m.set(CoolerFrame.attributes,0x800);
      CoolerFrame.patches.forEach(([a,b])=>m.set(b,a));
      const draw=()=>{
        C16.draw($('ct-frame'),m,CoolerFrame.ted,{s:2});
        if($('ct-grid').checked){const c=$('ct-frame').getContext('2d');c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=1;
          for(let x=0;x<=640;x+=16){c.beginPath();c.moveTo(x+.5,0);c.lineTo(x+.5,400);c.stroke();}
          for(let y=0;y<=400;y+=16){c.beginPath();c.moveTo(0,y+.5);c.lineTo(640,y+.5);c.stroke();}}
      };
      $('ct-grid').onchange=draw;draw();
    }
    if($('ct-movement')) {
      let x=36,half=0,frame=0;
      const draw=(message='At the starting half-step.')=>{
        $('ct-move-status').textContent=`Position ${x} · half-step ${half}. ${message}`;
        drawPixels($('ct-movement'),D.playerHorizontal.slice(frame*32,frame*32+32),2,2,0x4a,6);
      };
      for(const direction of ['left','right'])$('ct-move-'+direction).onclick=()=>{
        const r=Cooler.horizontalStep(x,half,direction,$('ct-wall').checked);x=r.x;half=r.half;
        if(r.moved)frame=direction==='right'?(frame+1)%4:4+((frame+3)%4);
        draw(r.moved?'Moved four pixels.':'The neighbour check blocks this step.');
      };
      $('ct-move-reset').onclick=()=>{x=36;half=0;frame=0;draw();};draw();
    }
    if($('ct-inventory')) {
      const draw=()=>{
        const n=+$('ct-inventory').value,shown=Math.min(5,n),bytes=[];
        const cv=$('ct-bomb-icons');cv.width=480;cv.height=96;
        const c=cv.getContext('2d');c.fillStyle=black;c.fillRect(0,0,480,96);
        for(let i=0;i<shown;i++){
          const tile=document.createElement('canvas');drawPixels(tile,D.font.slice(0x60*8,0x64*8),2,2,0x43,6);c.drawImage(tile,i*96,0);
        }
        $('ct-inventory-value').textContent=`${n} bombs stored · ${shown} icons drawn`;
      };
      $('ct-inventory').oninput=draw;draw();
    }
    if($('ct-ai-first')) {
      let state=0,seed=4310;
      const draw=()=>{
        const first=+$('ct-ai-first').value,fresh=+$('ct-ai-fresh').value;
        const result=Cooler.directionCandidate(state,first,fresh);
        $('ct-ai-values').textContent=`First timer read ${first} · fresh read ${fresh}`;
        $('ct-ai-result').textContent=result.kind==='idle'?`Idle for this update (state ${result.state}).`:`Candidate: ${['right →','down ↓','left ←','up ↑'][result.direction]} · ${result.source} state. The map check comes next.`;
      };
      $('ct-ai-first').oninput=draw;$('ct-ai-fresh').oninput=draw;
      $('ct-ai-state').onchange=()=>{state=+$('ct-ai-state').value;draw();};
      $('ct-ai-roll').onclick=()=>{const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0&255;};$('ct-ai-first').value=random();$('ct-ai-fresh').value=random();draw();};draw();
    }
    if($('ct-level')) {
      for(let i=0;i<256;i++){const o=document.createElement('option');o.value=i;o.textContent=`Level ${i} · layout ${i%10||10}`;$('ct-level').append(o);}
      $('ct-level').value=1;
      const draw=n=>{
        const b=map($('ct-level-map'),n,$('ct-show-spawns').checked,$('ct-inactive').checked);
        $('ct-level-description').textContent=`Level ${n}: layout ${b.digit||10}, ${b.enemies} guards, shape ${b.shape}, ${b.objects.length} objects. Nominal pickup value ${b.nominalPoints}; actual score gain follows the digit-adder rule.`;
        $('ct-level-byte').textContent=`level byte ${hex(n)} · units ${b.digit} · tens ${Math.floor(n/10)%10}`;
      };
      picker($('ct-level'),$('ct-level-prev'),$('ct-level-next'),draw);
      $('ct-show-spawns').onchange=()=>draw(+$('ct-level').value);$('ct-inactive').onchange=()=>draw(+$('ct-level').value);
      const body=$('ct-layout-table');
      for(let n=1;n<=10;n++){
        const b=Cooler.decode(n),counts=[1,2,3].map(t=>b.objects.filter(o=>o.type===t).length),tr=document.createElement('tr');
        tr.innerHTML=`<td>${n}</td><td><canvas class="ct-mini" aria-label="Layout ${n}"></canvas></td><td>${counts.join(' / ')}</td><td>${b.nominalPoints}</td>`;
        body.append(tr);map(tr.querySelector('canvas'),n);
      }
    }
    if($('ct-score-start')) {
      let score=800, rows=[];
      const show=()=>{
        $('ct-score').textContent=String(score).padStart(6,'0');
        $('ct-score-log').replaceChildren();
        rows.forEach(s=>{const p=document.createElement('p');p.textContent=s;$('ct-score-log').append(p);});
      };
      const add=type=>{const before=score;score=Cooler.addPickup(score,type);rows.push(`${before} + ${type*100} → ${score}`);show();};
      $('ct-score-start').onchange=()=>{score=Math.max(0,Math.min(999900,Math.floor(+$('ct-score-start').value/100)*100));rows=[];show();};
      $('ct-add-pickup').onclick=()=>add(+$('ct-pickup-type').value);
      $('ct-seven-apples').onclick=()=>{score=0;rows=[];$('ct-score-start').value=0;for(let i=0;i<7;i++)add(3);};
      $('ct-score-reset').onclick=()=>{score=800;rows=[];$('ct-score-start').value=800;show();};show();
    }
    if($('ct-awards')) {
      const draw=()=>{
        const n=+$('ct-awards').value,r=Cooler.lifeAfter(n);
        $('ct-life-value').textContent=r.breaks?'$00 → BRK at $1A27':`${r.attempts} attempts · stored character ${hex(r.value)}`;
        $('ct-award-count').textContent=`${n} extra-life awards`;
        $('ct-overflow-image').hidden=!r.breaks;
      };
      $('ct-awards').oninput=draw;$('ct-next-life').onclick=()=>{$('ct-awards').value=Math.min(204,+$('ct-awards').value+1);draw();};
      $('ct-last-safe').onclick=()=>{$('ct-awards').value=203;draw();};draw();
    }
    if($('ct-route-step')) {
      const route=await fetch('reference/bomb-route.json').then(r=>r.json());
      const draw=()=>{
        const n=+$('ct-route-step').value,deaths=route.deaths.filter(d=>d.poll<=n).length;
        $('ct-route-value').textContent=`Input poll ${n}/12 · ${deaths} deaths · ${5-deaths} attempts left · ${n>=2?2:3} bombs`;
        const p=$('ct-route-milestones');p.replaceChildren();
        route.deaths.forEach((d,i)=>{const li=document.createElement('li');li.className=n>=d.poll?'ct-reached':'';li.textContent=`Poll ${d.poll}: attempt ${i+1} ends in the same explosion.`;p.append(li);});
      };
      $('ct-route-step').oninput=draw;$('ct-route-next').onclick=()=>{$('ct-route-step').value=Math.min(12,+$('ct-route-step').value+1);draw();};draw();
    }
    if($('ct-cast')) {
      const groups=[];
      const player=(name,vertical,indices)=>groups.push({name,source:vertical?D.playerVertical:D.playerHorizontal,stride:vertical?48:32,cols:2,rows:vertical?3:2,indices,colour:0x4a,delay:55});
      player('Cuthbert: right',false,[0,1,2,3]);player('Cuthbert: left',false,[7,6,5,4]);
      player('Cuthbert: down',true,[0,1,2,3]);player('Cuthbert: up',true,[7,6,5,4]);
      for(let type=1;type<=4;type++)groups.push({name:`Guard shape ${type}`,frames:D.enemyFrames.map(b=>b.slice((type-1)*32,type*32)),cols:2,rows:2,colour:D.enemyColours[type-1],delay:290});
      groups.push({name:'Explosion',source:D.explosion,stride:32,indices:[0,1,2,3],cols:2,rows:2,colour:0x42,delay:165});
      groups.push({name:'Deployed bomb',frames:[
        [...D.font.slice(0x64*8,0x66*8),...D.font.slice(0x62*8,0x64*8)],
        [...D.font.slice(0x66*8,0x68*8),...D.font.slice(0x62*8,0x64*8)]],cols:2,rows:2,colour:0x33,delay:55});
      for(const [name,code,colour]of [['Key',0x44,0x57],['Ring',0x48,0x54],['Apple',0x50,0x42],['Inventory bomb',0x60,0x43]])groups.push({name,frames:[D.font.slice(code*8,(code+4)*8)],cols:2,rows:2,colour,delay:1000});
      groups.push({name:'Lives icon',frames:[D.font.slice(0x68*8,0x69*8)],cols:1,rows:1,colour:0x3a,delay:1000});
      groups.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g.name;$('ct-cast').append(o);});
      let frame=0,last=0;
      const draw=()=>{
        const g=groups[+$('ct-cast').value],n=g.frames?g.frames.length:g.indices.length;frame%=n;
        const bytes=g.frames?g.frames[frame]:g.source.slice(g.indices[frame]*g.stride,(g.indices[frame]+1)*g.stride);
        drawPixels($('ct-cast-canvas'),bytes,g.cols,g.rows,g.colour,10);
        $('ct-cast-label').textContent=`${g.name} · frame ${frame+1}/${n}`;
      };
      picker($('ct-cast'),$('ct-cast-prev'),$('ct-cast-next'),()=>{frame=0;draw();},groups.length);
      $('ct-frame-step').onclick=()=>{frame++;draw();};
      const animate=t=>{const g=groups[+$('ct-cast').value];if($('ct-animate').checked&&t-last>=g.delay){last=t;frame++;draw();}requestAnimationFrame(animate);};requestAnimationFrame(animate);
      for(let phase=0;phase<2;phase++)drawPixels($('ct-retained-'+phase),D.enemyFrames[phase].slice(128,160),2,2,0x57,6);
      drawPixels($('ct-retained-tail'),Array.from(L.ram.slice(0x374a,0x3762)),3,1,0x61,6,true);
      const canvas=$('ct-font'),c=canvas.getContext('2d');canvas.width=640;canvas.height=280;c.fillStyle=black;c.fillRect(0,0,640,280);
      for(let code=0;code<=0x68;code++){
        const tile=document.createElement('canvas');drawPixels(tile,D.font.slice(code*8,code*8+8),1,1,0x61,3,true);
        const x=(code%16)*40,y=Math.floor(code/16)*40;c.drawImage(tile,x+8,y);c.fillStyle='#999';c.font='9px monospace';c.textAlign='center';c.fillText(code.toString(16).toUpperCase().padStart(2,'0'),x+20,y+35);
      }
    }
    if(status)status.textContent='';
    globalThis.coolerReady=true;
  } catch(e) {console.error(e);if(status){status.textContent='The viewer could not load its data.';status.setAttribute('role','alert');}}
})();

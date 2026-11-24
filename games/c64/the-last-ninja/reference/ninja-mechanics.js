'use strict';
(async()=>{
 const host=document.querySelector('[data-ninja-mechanics]');if(!host)return;
 try{
 const response=await fetch('reference/mechanics.json');if(!response.ok)throw Error('The demonstration data could not be loaded.');const d=await response.json(),r=NinjaRules.create(d);
 const $=id=>document.getElementById(id),names=['Claw','Flower','Pouch','Sleeping potion','Key','Amulet','Glove','Rope','Apple','Koga scrolls','Fists','Sword','Staff','Nunchaku','Shuriken','Smoke bombs'];
 const arrow=['↑','↗','→','↘','↓','↙','←','↖'],hex=a=>a.toString(16).toUpperCase().padStart(4,'0');
 const number=id=>Number($(id).value),option=(name,value)=>new Option(name,String(value));
 const atlas=new Image();atlas.src='reference/action-poses.png';await atlas.decode();
 const iconAtlas=new Image();iconAtlas.src='reference/item-icons.png';await iconAtlas.decode();
 const textures=new Map();async function texture(ch){if(!textures.has(ch)){const im=new Image();im.src=`reference/rooms-${d.slugs[ch]}.png`;textures.set(ch,im.decode().then(()=>im));}return textures.get(ch);}
 function actor(ctx,x,y,pose=16,weapon=0,mirror=0,enemy=false){const i=d.poses[[pose,Math.min(weapon,3),mirror?2:0,+enemy].join('/')];if(i===undefined)return;ctx.drawImage(atlas,i%16*128,Math.floor(i/16)*96,128,96,Math.round(x-48),Math.round(y-8),128,96);}
 function paper(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f1efea';c.fillRect(0,0,canvas.width,canvas.height);c.strokeStyle='#dedbd3';c.lineWidth=.5;for(let x=0;x<canvas.width;x+=20){c.beginPath();c.moveTo(x,0);c.lineTo(x,canvas.height);c.stroke();}for(let y=0;y<canvas.height;y+=20){c.beginPath();c.moveTo(0,y);c.lineTo(canvas.width,y);c.stroke();}return c;}
 function dot(c,x,y,color,label){c.fillStyle=color;c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();if(label){c.font='9px sans-serif';c.fillText(label,x+5,y-5);}}
 function src(id,slug,address){$(id).href=`source-${slug}.html#${hex(address)}`;}
 function roomLink(ch,room){return `levels.html?chapter=${d.slugs[ch]}&room=${room}#world`;}
 if($('combat-stage')){
  let heading=4,timeline=[],playing=null;
  for(let i=0;i<6;i++)$('combat-weapon').add(option(names[10+i],i));
  for(const f of [1,3,5,7])$('combat-facing').add(option(arrow[f],f));
  $('combat-weapon').value='1';
  for(let h=0;h<8;h++){const b=document.createElement('button');b.type='button';b.textContent=arrow[h];b.dataset.heading=h;b.style.gridArea=['1 / 2','1 / 3','2 / 3','3 / 3','3 / 2','3 / 1','2 / 1','1 / 1'][h];b.setAttribute('aria-label',`Joystick ${['up','up-right','right','down-right','down','down-left','left','up-left'][h]}`);b.addEventListener('click',()=>{heading=h;choose();});$('combat-stick').append(b);}
  function choose(){stop();const p={heading,facing:number('combat-facing'),weapon:number('combat-weapon'),mode:$('combat-order').value,x:85,y:72};timeline=r.timeline(p);$('combat-tick').max=timeline.length-1;$('combat-tick').value=Math.max(0,timeline.findIndex(f=>f.event===14));for(const b of $('combat-stick').querySelectorAll('button'))b.setAttribute('aria-pressed',String(+b.dataset.heading===heading));draw();}
  function draw(){const f=timeline[number('combat-tick')],weapon=number('combat-weapon'),face=number('combat-facing')>>1;const bx=85+(face<2?1:-1)*number('combat-gap'),by=72+number('combat-height');const kind=$('combat-defence').value,defender=kind==='toward'?16|((face^2)&3):kind==='away'?16|face:kind==='jump'?12:kind==='recover'?36:0;
   const hit=r.contact({ax:f.x,ay:f.y,bx,by,weapon,family:f.family||face,defender,closeCount:number('combat-count')});const c=paper($('combat-stage'));const hasContact=timeline.some(t=>t.event===14),throwing=timeline.some(t=>t.event===13);
   if(hasContact){const q=hit.range,sign=(f.family&3)<2?1:-1,shift=(f.family&1)?3:0,x0=sign>0?f.x+q.xmin+shift:f.x-q.xmax-shift,x1=sign>0?f.x+q.xmax+shift:f.x-q.xmin-shift;const flip=[0,3].includes(f.family&3),y0=f.y+(flip?8-q.ymax:q.ymin-8),y1=f.y+(flip?8-q.ymin:q.ymax-8);c.fillStyle=f.event===14?'#d9e5bd':'#dce6ee';c.fillRect(x0,y0,x1-x0,y1-y0);c.strokeStyle='#69813c';c.strokeRect(x0,y0,x1-x0,y1-y0);}
   actor(c,f.x,f.y,f.pose,weapon<4?weapon:0,f.mirror);
   let targetPose=face<2?17:16,targetMirror=face<2?2:0;if(kind==='toward'||kind==='away'){const df=2*(defender&3)+1,g=r.timeline({facing:df,heading:1,weapon:0,mode:'held'});targetPose=g[0].pose;targetMirror=g[0].mirror;}else if(kind==='jump'){targetPose=face<2?24:20;}else if(kind==='recover'){targetPose=53;}actor(c,bx,by,targetPose,0,targetMirror,true);
   dot(c,f.x,f.y,'#1f5fa8','Armakuni');dot(c,bx,by,'#9a3f35','Opponent');
   const label=throwing?'Use or throw':(f.family&252)===16?'Guard':(f.family&252)===12?'Somersault':({20:'Kick',24:'Straight strike',28:'Low strike',32:'Downward strike'}[f.family&252]||'Change pose');
   $('combat-move').textContent=label;$('combat-time').textContent=`Tick ${number('combat-tick')+1} of ${timeline.length}`;
   let text;if(throwing)text='This move requests the equipped throw or the held sleeping potion. Projectile flight is separate from this pose demonstration.';
   else if(!hasContact)text='This action has no melee contact event. Choose another direction to compare it with a strike.';
   else if(f.event!==14)text='Wind-up or recovery: this tick does not issue a new contact check. The shaded area shows the move’s range.';
   else if(kind==='recover'&&hit.hit)text='The target is already reacting to a previous hit. The chapter handler skips another wound update.';
   else text=hit.hit?`Hit. This contact adds ${hit.wounds} wounds; the opponent’s wound limit is 32.`:`Miss. ${hit.reason}.`;
   $('combat-result').textContent=text;$('combat-gap-value').textContent=number('combat-gap')+' px';$('combat-height-value').textContent=number('combat-height')+' px';
   src('combat-source','resident',f.record||0x5727);$('combat-source').textContent='Selected pose script';
  }
  function stop(){if(playing)clearInterval(playing);playing=null;$('combat-play').textContent='Play move';$('combat-play').setAttribute('aria-pressed','false');}
  $('combat-play').addEventListener('click',()=>{if(playing){stop();return;}$('combat-tick').value=0;draw();$('combat-play').textContent='Pause move';$('combat-play').setAttribute('aria-pressed','true');playing=setInterval(()=>{let n=number('combat-tick')+1;if(n>=timeline.length){stop();return;}$('combat-tick').value=n;draw();},80);});
  for(const id of ['combat-weapon','combat-facing','combat-order'])$(id).addEventListener('change',choose);
  for(const id of ['combat-tick','combat-gap','combat-height','combat-defence','combat-count'])$(id).addEventListener('input',draw);
  choose();
 }
 if($('jump-stage')){
  for(let i=0;i<d.hazards.length;i++){const h=d.hazards[i];$('jump-room').add(option(`${d.titles[h.chapter]} · room ${h.room}`,i));}
  let timer,request=0;
  async function draw(){const seq=++request,h=d.hazards[number('jump-room')],canvas=$('jump-stage'),c=canvas.getContext('2d'),im=await texture(h.chapter);if(seq!==request)return;
   const rooms=d.chapters[h.chapter].rooms,idx=rooms.findIndex(x=>x.slot===h.room);c.clearRect(0,0,240,144);c.drawImage(im,idx%5*240,Math.floor(idx/5)*144,240,144,0,0,240,144);
   if($('jump-overlay').checked){c.fillStyle='rgba(255,235,104,.30)';c.strokeStyle='#f9dc56';c.lineWidth=.5;for(const [l,rr,t,b] of h.rectangles){c.fillRect(l-24,t-50,rr-l,b-t);c.strokeRect(l-24,t-50,rr-l,b-t);}}
   const heading=number('jump-heading'),frames=r.timeline({facing:1,heading,weapon:0,mode:'move',x:number('jump-x'),y:number('jump-y')}),last=frames.at(-1),now=frames[Math.min(number('jump-tick'),frames.length-1)];
   c.strokeStyle='#60bfef';c.lineWidth=1;c.beginPath();frames.forEach((f,i)=>i?c.lineTo(f.x-24,f.y-50):c.moveTo(f.x-24,f.y-50));c.stroke();
   actor(c,now.x-24,now.y-50,now.pose,0,now.mirror);dot(c,last.x-24,last.y-50,r.safe(h.rectangles,last.x,last.y)?'#73ff90':'#ff8f78');
   $('jump-x-value').textContent=number('jump-x');$('jump-y-value').textContent=number('jump-y');$('jump-tick').max=frames.length-1;$('jump-time').textContent=`Tick ${number('jump-tick')+1} of ${frames.length}`;
   $('jump-result').textContent=`Landing coordinate: (${last.x}, ${last.y}). ${r.safe(h.rectangles,last.x,last.y)?'Passes':'Fails'} this room’s stored safe-area test. Change the start by one pixel to test the boundary.`;
   $('jump-map').href=roomLink(h.chapter,h.room);src('jump-source',d.slugs[h.chapter],h.reader);
  }
  for(const id of ['jump-room','jump-heading','jump-x','jump-y','jump-tick','jump-overlay'])$(id).addEventListener('input',()=>{if(id!=='jump-tick')$('jump-tick').value=35;draw();});
  $('jump-play').addEventListener('click',()=>{if(timer){clearInterval(timer);timer=null;$('jump-play').textContent='Play jump';return;}$('jump-tick').value=0;draw();$('jump-play').textContent='Pause jump';timer=setInterval(()=>{const n=number('jump-tick')+1;if(n>35){clearInterval(timer);timer=null;$('jump-play').textContent='Play jump';return;}$('jump-tick').value=n;draw();},80);});
  $('jump-shift').addEventListener('click',()=>{$('jump-x').value=number('jump-x')+1;$('jump-tick').value=35;draw();});
  draw();
 }
 if($('enemy-stage')){
  let phase='idle',elapsed=0,count=0,wait=0,saved={x:140,y:95},cooldownRandom=0,last='Step the decision to start a wait.';
  function input(){return {px:number('enemy-player-x'),py:number('enemy-player-y'),ex:number('enemy-x'),ey:number('enemy-y'),heading:1,variant:number('enemy-variant')};}
  function draw(){const p=input(),t=r.target(p),c=paper($('enemy-stage'));c.strokeStyle='#c18128';c.setLineDash([3,3]);c.beginPath();c.moveTo(p.ex,p.ey);c.lineTo(t.target,p.py);c.stroke();c.setLineDash([]);dot(c,t.target,p.py,'#aa7922','Target');actor(c,p.px,p.py,16,0,0);actor(c,p.ex,p.ey,17,0,2,true);dot(c,p.px,p.py,'#1f5fa8','Armakuni');dot(c,p.ex,p.ey,'#9a3f35','Guard');$('enemy-state').textContent=phase;$('enemy-result').textContent=last;$('enemy-clock').textContent=`${elapsed} ticks elapsed · ${count} close actions`;}
  function step(){const p=input(),rnd=number('enemy-random');
   if(phase==='idle'){phase='waiting';elapsed=0;wait=r.enemyWait(p.variant,rnd);last=`Wait ${wait} ticks. Variant ${p.variant} uses ${p.variant?'16 plus the low five bits':'the low five bits'} of the random byte.`;}
   else if(phase==='waiting'){if((elapsed&255)>=wait){phase='approaching';last='The wait has expired. The guard starts its approach action.';}else last=`Still waiting: ${wait-elapsed} more ticks.`;}
   else if(phase==='approaching'){const target=r.target(p);if(target.close){phase='close';saved={x:p.px,y:p.py};last='The guard is within the close-position threshold. It starts its close-range pose.';}else last=`Approach target X ${target.target}, at Armakuni’s Y ${p.py}. The distance measure is ${target.distance}; close range begins below 6.`;}
   else if(phase==='close'){const choice=r.closeAction(p.variant,rnd,number('enemy-family'));if(choice.state===8){phase='watching';elapsed=0;cooldownRandom=rnd;last='Armakuni is reacting to a hit. The guard enters its close wait instead of choosing a new attack.';draw();return;}phase='attacking';count++;last=`Choose close attack ${1+(choice.offset-28)/4}. Variant ${p.variant} offers ${p.variant?4:2} choices. Complete this animation before the next decision.`;}
   else if(phase==='attacking'){last='The action is still active. Complete the animation to enter its next wait.';}
   else {const w=r.closeWait({px:p.px,py:p.py,savedX:saved.x,savedY:saved.y,count,random:cooldownRandom,elapsed}),moved=w.moved,delay=w.delay;if(w.next==='approach'){phase='approaching';last=moved?'Armakuni moved beyond the saved close position. Restart the approach.':'Three close actions have accumulated. Restart the approach.';}else if(w.next==='close'){phase='close';last='The close wait has expired; choose another attack.';}else last=`Hold this position for ${delay-elapsed} more ticks, or restart the approach if Armakuni moves.`;}
   draw();
  }
  $('enemy-step').addEventListener('click',step);$('enemy-time').addEventListener('click',()=>{elapsed+=5;draw();});
  $('enemy-place').addEventListener('click',()=>{const p=input();$('enemy-x').value=r.target(p).target;$('enemy-y').value=p.py;last='The guard has been placed at its approach target. Step its decision again.';draw();});
  $('enemy-finish').addEventListener('click',()=>{if(phase!=='attacking')return;phase='watching';elapsed=0;cooldownRandom=number('enemy-random');last='The animation’s completion event enters the close wait. Move Armakuni or advance the timer, then step again.';draw();});
  $('enemy-reset').addEventListener('click',()=>{phase='idle';elapsed=0;count=0;last='Step the decision to start a wait.';draw();});
  for(const id of ['enemy-player-x','enemy-player-y','enemy-x','enemy-y','enemy-variant','enemy-random','enemy-family'])$(id).addEventListener('input',draw);draw();
 }
 if($('item-list')){
  const meanings=['Used at the Dungeons’ climbing exit. Select it with empty hands and face up-right.','Picked with the glove, then offered in Inner Sanctum room 10. The offer consumes the flower and changes the collision barrier.','Required before collecting ordinary objects. The pouch itself and weapons bypass that gate.','The manual describes sleeping gas. The equipment action checks whether this is the held object before launching its effect.','Selected at the Palace room 7 exit check.','Presented at the Wilderness room 4 offering check, with empty hands and an up-right facing.','Must be selected before picking the flower. Reaching it with another held object empties player power.','Selected for the Palace Gardens room 24 sequence, with empty hands and an up-right facing.','Converted to an extra life on chapter exit. The apple slot is then cleared.','The Inner Sanctum’s final objective. Its pickup starts the closing pose sequence.','The empty-handed weapon slot.','A melee weapon. Compare its attacks on the Gameplay page.','A melee weapon. Its sprite and reach differ from the sword.','A melee weapon. Its action table uses the armed control family.','Picking these up stores five throwing stars.','Picking these up stores three smoke bombs.'];
  for(let code=0;code<16;code++){if(code===10)continue;const card=document.createElement('article');card.className='ninja-item';const h=document.createElement('h3');h.textContent=names[code];const pic=document.createElement('canvas');pic.width=64;pic.height=24;pic.setAttribute('aria-label',names[code]+' inventory picture');pic.getContext('2d').drawImage(iconAtlas,code%8*64,Math.floor(code/8)*24,64,24,0,0,64,24);const text=document.createElement('p');text.textContent=meanings[code];const locations=document.createElement('p');locations.className='ninja-source-note';for(const item of d.items.filter(i=>i.code===code)){const a=document.createElement('a');a.href=roomLink(item.chapter,item.room);a.textContent=`${d.titles[item.chapter]}, room ${item.room}`;if(locations.childNodes.length)locations.append(' · ');locations.append(a);}card.append(pic,h,text,locations);$('item-list').append(card);}
  for(const item of d.items.filter(i=>i.code>=16)){const p=document.createElement('p');p.textContent=`${d.titles[item.chapter]}, room ${item.room}: hidden effect code ${item.code}. It is kept separate from the named inventory objects; its full effect is still open.`;$('item-hidden').append(p);}
  for(let i=0;i<d.items.length;i++){const a=d.items[i];$('pickup-item').add(option(`${names[a.code]||'Hidden effect '+a.code} · ${d.titles[a.chapter]} ${a.room}`,i));}
  $('pickup-item').value=d.items.findIndex(i=>i.code===1);
  for(let i=0;i<10;i++)$('pickup-holding').add(option(names[i],i));$('pickup-holding').value=6;
  let request=0;
  async function pickup(reset=false){const seq=++request,item=d.items[number('pickup-item')];if(reset){$('pickup-x').value=item.bounds[0]+(number('pickup-facing')>=4?36:0);$('pickup-y').value=item.bounds[2];}const image=await texture(item.chapter);if(seq!==request)return;const room=d.chapters[item.chapter].rooms.findIndex(x=>x.slot===item.room),canvas=$('pickup-stage'),c=canvas.getContext('2d');c.drawImage(image,room%5*240,Math.floor(room/5)*144,240,144,0,0,240,144);const [l,rr,t,b]=item.bounds;c.fillStyle='rgba(255,235,104,.35)';c.fillRect(l-24,t-50,rr-l,b-t);c.strokeStyle='#ffe463';c.strokeRect(l-24,t-50,rr-l,b-t);const x=number('pickup-x'),y=number('pickup-y'),facing=number('pickup-facing'),hand=x-(facing>=4?36:0);actor(c,x-24,y-50,facing>=4?17:16,0,facing&2);dot(c,hand-24,y-50,'#68d8ff');$('pickup-result').textContent=r.pickup({...item,x,y,facing,bag:$('pickup-bag').checked,holding:number('pickup-holding'),owned:item.code===2&&$('pickup-bag').checked})+`. Tested hand coordinate (${hand}, ${y}); X must be ${l}–${rr-1} and Y ${t}–${b-1}.`;$('pickup-x-value').textContent=x;$('pickup-y-value').textContent=y;src('pickup-source',d.slugs[item.chapter],item.address);$('pickup-map').href=roomLink(item.chapter,item.room);}
  $('pickup-item').addEventListener('change',()=>pickup(true));for(const id of ['pickup-x','pickup-y','pickup-facing','pickup-bag','pickup-holding'])$(id).addEventListener('input',()=>pickup());pickup(true);
  for(let i=0;i<d.puzzles.length;i++)$('puzzle-name').add(option(d.puzzles[i].name,i));for(let i=0;i<10;i++)$('puzzle-holding').add(option(names[i],i));$('puzzle-holding').value=5;
  function puzzle(){const p=d.puzzles[number('puzzle-name')],pass=r.useItem(p,{holding:number('puzzle-holding'),weapon:number('puzzle-weapon'),facing:number('puzzle-facing'),flowerOwned:$('puzzle-owned').checked});$('puzzle-result').textContent=pass?'The puzzle gate accepts this selection.':`The gate requires ${names[p.code]}${p.requiresHands?', empty hands':''}${p.requiresFacing?' and an up-right facing':''}${p.consumes?', with the flower still in the inventory':''}.`;$('puzzle-map').href=roomLink(p.chapter,p.room);src('puzzle-source',d.slugs[p.chapter],p.entry);}
  for(const id of ['puzzle-name','puzzle-holding','puzzle-weapon','puzzle-facing','puzzle-owned'])$(id).addEventListener('input',puzzle);puzzle();
 }
 if($('world-map')){
  const chapter=$('room-chapter'),slot=$('room-slot'),NS='http://www.w3.org/2000/svg';
  function element(t,a={},text){const e=document.createElementNS(NS,t);for(const [k,v]of Object.entries(a))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
  d.titles.forEach((t,i)=>$('world-chapter').add(option(t,i)));$('world-chapter').addEventListener('change',()=>{chapter.selectedIndex=number('world-chapter');chapter.dispatchEvent(new Event('change'));});
  function showRoom(room){const rooms=d.chapters[chapter.selectedIndex].rooms,index=rooms.findIndex(x=>x.slot===room);if(index>=0){slot.value=index;slot.dispatchEvent(new Event('change'));}}
  function graph(){const ch=chapter.selectedIndex;$('world-chapter').value=ch;const rooms=d.chapters[ch].rooms,selected=rooms[+slot.value]?.slot||1,known=new Set(rooms.map(x=>x.slot)),adj=new Map(rooms.map(x=>[x.slot,[...new Set(Object.values(x.exits).flat())].filter(y=>known.has(y))])),depth=new Map([[rooms[0].slot,0]]),parents=new Map(),queue=[rooms[0].slot];for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[])if(!depth.has(next)){depth.set(next,depth.get(queue[i])+1);parents.set(next,queue[i]);queue.push(next);}const reachable=new Set(depth.keys()),max=Math.max(...depth.values());for(const room of rooms)if(!depth.has(room.slot))depth.set(room.slot,max+1);
   const layers=new Map();for(const room of rooms){const lev=depth.get(room.slot);if(!layers.has(lev))layers.set(lev,[]);layers.get(lev).push(room);}
   const positions=new Map();let y=32;for(const [,layer]of [...layers].sort(([a],[b])=>a-b)){for(let i=0;i<layer.length;i++)positions.set(layer[i].slot,{x:30+(i%4)*145,y:y+Math.floor(i/4)*110});y+=Math.ceil(layer.length/4)*110;}
   const svg=$('world-map');svg.replaceChildren();const defs=element('defs'),marker=element('marker',{id:'ninja-world-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(element('path',{d:'M0 0 L10 5 L0 10 z',fill:'#1f5fa8'}));defs.append(marker);svg.append(defs);svg.setAttribute('viewBox',`0 0 610 ${y+25}`);svg.setAttribute('aria-label',d.titles[ch]+' room connections');
   const pathNodes=new Set([selected]);let a=selected;while(parents.has(a)){a=parents.get(a);pathNodes.add(a);}const exits=[];
   for(const room of rooms)for(const dest of adj.get(room.slot)){const p=positions.get(room.slot),q=positions.get(dest),direct=room.slot===selected||dest===selected,onRoute=(parents.get(dest)===room.slot||parents.get(room.slot)===dest)&&pathNodes.has(room.slot)&&pathNodes.has(dest);if(!direct&&!onRoute&&!$('world-all').checked)continue;const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,trim=Math.min(64/(Math.abs(ux)||.001),45/(Math.abs(uy)||.001));if(!len)continue;svg.append(element('path',{'marker-end':'url(#ninja-world-arrow)',d:`M${p.x+58+ux*trim},${p.y+34+uy*trim} L${q.x+58-ux*trim},${q.y+34-uy*trim}`,stroke:onRoute?'#aa7922':direct?'#1f5fa8':'#c7c2b5','stroke-width':direct?2:1,fill:'none'}));}
   for(let index=0;index<rooms.length;index++){
    const room=rooms[index],p=positions.get(room.slot),items=d.items.filter(i=>i.chapter===ch&&i.room===room.slot);
    const card=element('foreignObject',{x:p.x-3,y:p.y-3,width:123,height:86}),button=document.createElement('button');
    button.type='button';button.className='ninja-room-button';button.dataset.ownLook='';button.setAttribute('aria-label',`Room ${room.slot}${items.length?', contains '+items.map(i=>names[i.code]||'hidden effect').join(', '):''}`);button.setAttribute('aria-pressed',String(selected===room.slot));
    const picture=document.createElement('span');picture.className='ninja-room-thumb';picture.style.backgroundImage=`url("reference/rooms-${d.slugs[ch]}.png")`;picture.style.backgroundPosition=`${-(index%5)*117}px ${-Math.floor(index/5)*70.2}px`;picture.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent=`Room ${room.slot}${items.length?' · ◆':''}`;button.append(picture,label);button.addEventListener('click',()=>showRoom(room.slot));card.append(button);svg.append(card);
    if(Object.values(room.exits).flat().includes(0))exits.push(room.slot);
   }
   const itemNames=d.items.filter(i=>i.chapter===ch&&i.room===selected).map(i=>names[i.code]||'hidden effect');$('world-selected').textContent=`Room ${selected}${itemNames.length?' · '+itemNames.join(', '):''}. Blue links touch this room. ${reachable.has(selected)?'Gold links show one shortest route from the first displayed room.':'These stored links have no route here from the first displayed room.'}`;$('world-exit').textContent=`Chapter-transition rooms: ${exits.join(', ')||'none in this set'}. ${ch<5?'Continue to '+d.titles[ch+1]+'.':'The final scrolls are in room 15.'}`;
   $('world-next').hidden=ch===5;$('world-next').textContent=ch<5?`Open ${d.titles[ch+1]}`:'';
  }
  chapter.addEventListener('change',graph);slot.addEventListener('change',graph);$('world-all').addEventListener('change',graph);document.addEventListener('ninja-room-changed',graph);$('world-next').addEventListener('click',()=>{chapter.selectedIndex++;chapter.dispatchEvent(new Event('change'));});
  const query=new URLSearchParams(location.search),ch=d.slugs.indexOf(query.get('chapter'));if(ch>=0){chapter.selectedIndex=ch;chapter.dispatchEvent(new Event('change'));showRoom(Number(query.get('room'))||1);}graph();
 }
 }catch(error){const notice=document.createElement('p');notice.className='ninja-widget-error';notice.setAttribute('role','alert');notice.textContent=error.message;host.prepend(notice);console.error(error);}
})();

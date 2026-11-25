'use strict';
// A display layout for the stored room links. Positions are diagram coordinates.
(function(root){
function build(data){
 const chapters=[],nodes=[],edges=[],key=(chapter,room)=>chapter+':'+room;
 for(let ch=0;ch<data.chapters.length;ch++){
  const rooms=data.chapters[ch].rooms,known=new Set(rooms.map(r=>r.slot)),links=[],seen=new Set();
  for(const room of rooms)for(const dest of new Set(Object.values(room.exits).flat()))if(known.has(dest)&&dest!==room.slot){
   edges.push({from:key(ch,room.slot),to:key(ch,dest),chapter:ch,transition:false});
   const pair=[room.slot,dest].sort((a,b)=>a-b).join(':');if(!seen.has(pair)){seen.add(pair);links.push([room.slot,dest]);}
  }
  const p=new Map(rooms.map((r,i)=>[r.slot,{x:(i%5)*310,y:Math.floor(i/5)*210}]));
  // Springs group neighbouring rooms; rectangular separation keeps every picture visible.
  for(let tick=0;tick<500;tick++){
   const forces=new Map(rooms.map(r=>[r.slot,{x:0,y:0}]));
   for(const [a,b] of links){const u=p.get(a),v=p.get(b),dx=v.x-u.x,dy=v.y-u.y,length=Math.hypot(dx,dy)||1,k=(length-310)*.018;forces.get(a).x+=dx/length*k;forces.get(a).y+=dy/length*k;forces.get(b).x-=dx/length*k;forces.get(b).y-=dy/length*k;}
   for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
    const a=rooms[i].slot,b=rooms[j].slot,u=p.get(a),v=p.get(b),dx=v.x-u.x,dy=v.y-u.y;
    const ox=274-Math.abs(dx),oy=184-Math.abs(dy);if(ox>0&&oy>0){const axis=ox/274<oy/184?'x':'y',delta=axis==='x'?dx:dy,amount=(axis==='x'?ox:oy)*.56,sign=delta>=0?1:-1;forces.get(a)[axis]-=amount*sign;forces.get(b)[axis]+=amount*sign;}
   }
   for(const room of rooms){const v=p.get(room.slot),f=forces.get(room.slot);v.x+=Math.max(-14,Math.min(14,f.x));v.y+=Math.max(-14,Math.min(14,f.y));}
  }
  // Snap onto unoccupied cells so thumbnails never overlap, even after rounding.
  const occupied=new Set(),placed=[];for(const room of rooms){const v=p.get(room.slot),gx=Math.round(v.x/274),gy=Math.round(v.y/184);let cell;for(let radius=0;!cell;radius++)for(let dy=-radius;dy<=radius&&!cell;dy++)for(let dx=-radius;dx<=radius&&!cell;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===radius&&!occupied.has((gx+dx)+':'+(gy+dy)))cell=[gx+dx,gy+dy];occupied.add(cell.join(':'));placed.push({key:key(ch,room.slot),chapter:ch,room:room.slot,index:rooms.indexOf(room),x:cell[0]*274,y:cell[1]*184});}
  const minX=Math.min(...placed.map(n=>n.x)),minY=Math.min(...placed.map(n=>n.y));for(const n of placed){n.x-=minX;n.y-=minY;}
  chapters.push({chapter:ch,nodes:placed,width:Math.max(...placed.map(n=>n.x))+240,height:Math.max(...placed.map(n=>n.y))+144});
 }
 const columnWidths=[0,0,0],rowHeights=[0,0];for(let ch=0;ch<chapters.length;ch++){const row=ch<3?0:1,col=ch<3?ch:5-ch;columnWidths[col]=Math.max(columnWidths[col],chapters[ch].width);rowHeights[row]=Math.max(rowHeights[row],chapters[ch].height);}
 const xs=[48,48+columnWidths[0]+180,48+columnWidths[0]+180+columnWidths[1]+180],ys=[96,96+rowHeights[0]+220];
 for(let ch=0;ch<chapters.length;ch++){const c=chapters[ch],row=ch<3?0:1,col=ch<3?ch:5-ch;c.x=xs[col];c.y=ys[row];for(const n of c.nodes){n.x+=c.x;n.y+=c.y;nodes.push(n);}}
 for(let ch=0;ch<chapters.length-1;ch++)for(const room of data.chapters[ch].rooms)if(Object.values(room.exits).flat().includes(0))edges.push({from:key(ch,room.slot),to:key(ch+1,1),chapter:ch,transition:true});
 return {nodes,edges,chapters,width:xs[2]+columnWidths[2]+48,height:ys[1]+rowHeights[1]+64};
}
if(typeof module!=='undefined'&&module.exports)module.exports={build};else root.NinjaWorld={build};
})(typeof globalThis==='undefined'?this:globalThis);

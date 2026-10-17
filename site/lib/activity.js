// The activity page (site/activity.html): what landed on main each day. kit/scripts/build.py embeds
// the history as JSON (activity_data): every change, the kit's version bumps and the issues fixed.
// This draws, for the period picked: a tile per count, the picked count day by day as a chart, and
// every day's changes and fixes. Days are the reader's own, midnight to midnight; the last period
// ends on the day the site was built. Titles and names come from commits and issues, so they go
// into the page as text, never as markup.
(function(){
  var D=JSON.parse(document.getElementById('act-data').textContent);
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WDAY=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var TAGS={'new':'new game',game:'game',kit:'kit',site:'site',other:'repo'};
  var METRICS=[
    {id:'new',label:'New games',one:'new game',many:'new games'},
    {id:'total',label:'Total games'},
    {id:'prs',label:'Pull requests merged',one:'pull request',many:'pull requests'},
    {id:'issues',label:'Issues fixed',one:'issue fixed',many:'issues fixed'},
    {id:'kit',label:'Kit improvements',one:'kit improvement',many:'kit improvements'}];
  var $=function(id){ return document.getElementById(id); };
  var el=function(tag,cls,text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; };
  var pad=function(n){ return (n<10?'0':'')+n; };
  var key=function(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
  var dayOf=function(t){ var d=new Date(t*1000); d.setHours(0,0,0,0); return d; };
  var plural=function(n,m){ return n+' '+(n===1?m.one:m.many); };
  var built=new Date(D.now*1000), lastDay=dayOf(D.now);
  var short=function(d){ return d.getDate()+' '+MON[d.getMonth()]; };
  var long=function(d,yr){ return d.getDate()+' '+MONTH[d.getMonth()]+(yr||d.getFullYear()!==built.getFullYear()?' '+d.getFullYear():''); };
  var gameName=function(k){ return D.games[k]||k.split('/')[1]; };

  // every day that saw something, by its key: the changes and fixes, and the counts the tiles add up
  var byDay={}, firstDay=lastDay;
  function bucket(t){
    var d=dayOf(t), k=key(d);
    if(d<firstDay) firstDay=d;
    return byDay[k]||(byDay[k]={changes:[],fixed:[],'new':0,net:0,prs:0,issues:0,kit:0});
  }
  D.changes.forEach(function(c){
    var b=bucket(c.t);
    b.changes.push(c);
    b['new']+=(c.added||[]).length;
    b.net+=(c.added||[]).length-(c.removed||[]).length;
    if(c.pr) b.prs++;
    if(c.areas.indexOf('kit')>=0) b.kit++;
  });
  (D.issues||[]).forEach(function(i){ var b=bucket(i.t); b.fixed.push(i); b.issues++; });
  var dayKeys=Object.keys(byDay).sort();
  // the games on the site at the end of day k: every game added up to then, less any removed
  function totalAt(k){ var n=0; dayKeys.forEach(function(d){ if(d<=k) n+=byDay[d].net; }); return n; }

  // a period: its days oldest first, ending on the day the site was built
  function period(sel){
    var out=[], d=new Date(lastDay);
    var n=sel==='all'?Infinity:+sel;
    while(out.length<n&&d>=firstDay){ out.unshift(new Date(d)); d.setDate(d.getDate()-1); }
    return out;
  }
  // the chart's columns: one a day, or one a week (from Monday) when the days are too many to draw
  function columns(days){
    var weekly=days.length>120, cols=[];
    days.forEach(function(d){
      var start=weekly&&cols.length&&d.getDay()!==1?null:d;
      if(start) cols.push({start:d,end:d,days:[]});
      var c=cols[cols.length-1]; c.end=d; c.days.push(key(d));
    });
    cols.forEach(function(c){
      METRICS.forEach(function(m){
        c[m.id]=m.id==='total'?totalAt(c.days[c.days.length-1])
          :c.days.reduce(function(s,k){ return s+(byDay[k]?byDay[k][m.id]:0); },0);
      });
      c.label=weekly?'Week of '+long(c.start):WDAY[c.start.getDay()]+' '+long(c.start);
    });
    return {weekly:weekly,cols:cols};
  }

  var state={sel:'30',metric:'prs'};
  try{ var q=new URLSearchParams(location.search); if(/^(7|30|90|all)$/.test(q.get('days'))) state.sel=q.get('days');
       if(METRICS.some(function(m){ return m.id===q.get('count'); })) state.metric=q.get('count'); }catch(e){}
  var view;

  function render(){
    var days=period(state.sel);
    view=columns(days);
    view.days=days;
    document.querySelectorAll('#act-range button').forEach(function(b){ b.setAttribute('aria-pressed',String(b.dataset.days===state.sel)); });
    var busy=days.filter(function(d){ var b=byDay[key(d)]; return b&&(b.changes.length||b.fixed.length); }).length;
    $('act-every').textContent=days.length?'Something landed on '+busy+' of the '+days.length+' days '+
      (state.sel==='all'?'from '+long(days[0],true)+' to '+long(lastDay,true):'to '+long(lastDay,true))+'.':'';
    tiles(days);
    chart();
    list(days);
  }

  function sum(days,id){ return days.reduce(function(s,d){ var b=byDay[key(d)]; return s+(b?b[id]:0); },0); }
  function names(list){ return list.length<3?list.join(' and '):list.slice(0,-1).join(', ')+', and '+list[list.length-1]; }
  function tiles(days){
    var box=$('act-kpis'); box.textContent='';
    var inDays=function(t){ var k=key(dayOf(t)); return days.length&&k>=key(days[0])&&k<=key(days[days.length-1]); };
    var changes=D.changes.filter(function(c){ return inDays(c.t); });
    var eve=days.length?new Date(days[0].getFullYear(),days[0].getMonth(),days[0].getDate()-1):lastDay, before=totalAt(key(eve));
    METRICS.forEach(function(m){
      var v, sub;
      if(m.id==='total'){
        v=totalAt(key(lastDay));
        sub=v===before?'no change in the period':'up from '+before+' on '+long(eve);
      }else if(m.id==='issues'&&!D.issues){
        v=null; sub='not counted in this build';
      }else{
        v=sum(days,m.id);
        if(m.id==='new'){
          var added=[]; changes.forEach(function(c){ (c.added||[]).forEach(function(k){ added.unshift(gameName(k)); }); });
          sub=!added.length?'none in the period':added.length<4?names(added):names(added.slice(0,2).concat([(added.length-2)+' more']));
        }else if(m.id==='prs'){
          var who={}; changes.forEach(function(c){ if(c.pr) (c.who||[]).forEach(function(p){ who[p[1]||p[0]]=1; }); });
          var n=Object.keys(who).length; sub=n?'by '+n+(n===1?' person':' people'):'';
        }else if(m.id==='issues'){
          sub='closed as completed';
        }else{
          var at=null, end=null;
          D.bumps.forEach(function(b){ if(dayOf(b[0])<days[0]) at=b[1]; if(inDays(b[0])) end=b[1]; });
          sub=end?(at?'kit '+at+' to '+end:'up to kit '+end):at?'kit '+at:'';
        }
      }
      var b=el('button','act-kpi'+(m.id===state.metric?' on':''));
      b.type='button'; b.setAttribute('aria-pressed',String(m.id===state.metric));
      b.appendChild(el('span','k',m.label));
      b.appendChild(el('span','v',v==null?'–':v.toLocaleString()));
      b.appendChild(el('span','s',sub));
      if(v!=null) b.appendChild(spark(m.id));
      b.addEventListener('click',function(){ state.metric=m.id; remember(); render(); });
      box.appendChild(b);
    });
  }

  var SVG='http://www.w3.org/2000/svg';
  function svg(tag,attrs){ var e=document.createElementNS(SVG,tag); for(var a in attrs) e.setAttribute(a,attrs[a]); return e; }
  // a tile's small chart: its count a column at a time, or the total as a line
  function spark(id){
    var cols=view.cols, n=cols.length, w=n*10, h=28;
    var max=Math.max.apply(null,cols.map(function(c){ return c[id]; }).concat([id==='total'?1:3]));
    var min=id==='total'?Math.min.apply(null,cols.map(function(c){ return c.total; })):0;
    var s=svg('svg',{viewBox:'0 0 '+w+' '+h,preserveAspectRatio:'none','aria-hidden':'true','class':'spark'});
    if(id==='total'){
      var y=function(v){ return h-2-(max===min?0:(v-min)/(max-min)*(h-4)); };
      s.appendChild(svg('polyline',{points:cols.map(function(c,i){ return (i*10+5)+','+y(c.total); }).join(' '),'class':'line'}));
    }else cols.forEach(function(c,i){
      if(c[id]) s.appendChild(svg('rect',{x:i*10+1.5,width:7,y:h-c[id]/max*h,height:c[id]/max*h}));
    });
    return s;
  }

  // the picked count, a column a day; the total is a line over the days instead
  function nice(max){
    var step=1, steps=[1,2,5];
    for(var p=1;;p*=10){ for(var i=0;i<3;i++){ step=steps[i]*p; if(max/step<=4) return step; } }
  }
  var hover=-1, tipBox=$('act-tip');
  function chart(){
    var m=METRICS.filter(function(x){ return x.id===state.metric; })[0];
    var cap=$('act-chart-cap'); cap.textContent='';
    cap.appendChild(el('b',null,m.label));
    cap.appendChild(el('span','mute',m.id==='total'?' at the end of each '+(view.weekly?'week':'day'):' each '+(view.weekly?'week':'day')));
    var plot=$('act-plot'); plot.textContent=''; plot.appendChild(tipBox); tipBox.hidden=true;
    var cols=view.cols, n=cols.length;
    if(m.id==='issues'&&!D.issues){ plot.appendChild(el('p','mute act-none','The issues were not counted in this build: it was made without a GitHub token.')); return; }
    var W=Math.max(280,plot.clientWidth), H=220, L=34, R=m.id==='total'?30:8, T=10, B=26, pw=W-L-R, ph=H-T-B;
    var vals=cols.map(function(c){ return c[m.id]; });
    var lo=m.id==='total'?Math.max(0,Math.min.apply(null,vals)-1):0;
    var step=nice(Math.max(1,Math.max.apply(null,vals)-lo)), top=lo+step*Math.max(1,Math.ceil((Math.max.apply(null,vals)-lo)/step));
    if(m.id==='total'){ lo=Math.floor(lo/step)*step; }
    var y=function(v){ return T+ph-(v-lo)/(top-lo)*ph; };
    var slot=pw/n, x=function(i){ return L+slot*i+slot/2; };
    var s=svg('svg',{width:W,height:H,viewBox:'0 0 '+W+' '+H,'class':'act-svg',tabindex:'0',role:'img',
      'aria-label':m.label+', '+(view.weekly?'week':'day')+' by day; the list below gives each day'});
    for(var v=lo;v<=top+1e-9;v+=step){
      s.appendChild(svg('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),'class':v===lo?'base':'grid'}));
      var t=svg('text',{x:L-8,y:y(v)+4,'class':'tick','text-anchor':'end'}); t.textContent=v.toLocaleString(); s.appendChild(t);
    }
    var every=Math.max(1,Math.ceil(64/slot));
    cols.forEach(function(c,i){
      if((n-1-i)%every) return;
      var tx=x(i), anchor='middle';
      if(tx<L+24){ anchor='start'; tx=Math.max(tx-slot/2,L); }
      if(tx>W-R-24&&i===n-1){ anchor='end'; tx=Math.min(tx+slot/2,W-2); }
      var t=svg('text',{x:tx,y:H-8,'class':'tick','text-anchor':anchor}); t.textContent=short(c.start); s.appendChild(t);
    });
    var marks=svg('g',{'class':'marks'}); s.appendChild(marks);
    if(m.id==='total'){
      var pts=cols.map(function(c,i){ return [x(i),y(c.total)]; });
      var d='M'+pts.map(function(p){ return p[0]+','+p[1]; }).join('L');
      marks.appendChild(svg('path',{d:d+'L'+pts[n-1][0]+','+y(lo)+'L'+pts[0][0]+','+y(lo)+'Z','class':'wash'}));
      marks.appendChild(svg('path',{d:d,'class':'line'}));
      var end=pts[n-1];
      marks.appendChild(svg('circle',{cx:end[0],cy:end[1],r:4,'class':'dot'}));
      var lab=svg('text',{x:end[0]+8,y:end[1]+4,'class':'end'}); lab.textContent=cols[n-1].total; marks.appendChild(lab);
    }else{
      var bw=Math.max(1.5,Math.min(24,slot-2)), r=Math.min(4,bw/2);
      cols.forEach(function(c,i){
        var v=c[m.id]; if(!v) return;
        var x0=x(i)-bw/2, y0=y(v), y1=y(lo), rr=Math.min(r,y1-y0);
        marks.appendChild(svg('path',{'data-i':i,d:'M'+x0+','+y1+'V'+(y0+rr)+'Q'+x0+','+y0+' '+(x0+rr)+','+y0+
          'H'+(x0+bw-rr)+'Q'+(x0+bw)+','+y0+' '+(x0+bw)+','+(y0+rr)+'V'+y1+'Z'}));
      });
    }
    var cross=svg('line',{y1:T,y2:T+ph,'class':'cross',visibility:'hidden'}); s.appendChild(cross);
    var hit=svg('rect',{x:L,y:T,width:pw,height:ph+B-6,'class':'hit'}); s.appendChild(hit);
    plot.appendChild(s);
    var at=function(e){ var r=s.getBoundingClientRect(); return Math.max(0,Math.min(n-1,Math.floor((e.clientX-r.left-L)/slot))); };
    function show(i){
      hover=i;
      marks.querySelectorAll('path[data-i]').forEach(function(p){ p.classList.toggle('dim',i>=0&&+p.dataset.i!==i); });
      if(i<0){ cross.setAttribute('visibility','hidden'); tipBox.hidden=true; return; }
      cross.setAttribute('x1',x(i)); cross.setAttribute('x2',x(i)); cross.setAttribute('visibility','visible');
      tip(cols[i],x(i),W);
    }
    s.addEventListener('pointermove',function(e){ show(at(e)); });
    s.addEventListener('pointerleave',function(){ show(-1); });
    s.addEventListener('click',function(e){ go(cols[at(e)]); });
    s.addEventListener('focus',function(){ show(hover>=0&&hover<n?hover:n-1); });
    s.addEventListener('blur',function(){ show(-1); });
    s.addEventListener('keydown',function(e){
      var i=hover<0?n-1:hover;
      if(e.key==='ArrowLeft'){ show(Math.max(0,i-1)); e.preventDefault(); }
      else if(e.key==='ArrowRight'){ show(Math.min(n-1,i+1)); e.preventDefault(); }
      else if(e.key==='Enter'||e.key===' '){ go(cols[i]); e.preventDefault(); }
    });
  }
  // the readout for one column: every count, the picked one first
  function tip(c,cx,W){
    var box=tipBox; box.textContent='';
    box.appendChild(el('b','when',c.label));
    METRICS.slice().sort(function(a,b){ return (b.id===state.metric)-(a.id===state.metric); }).forEach(function(m){
      if(m.id==='issues'&&!D.issues) return;
      var row=el('span','row'+(m.id===state.metric?' on':''));
      row.appendChild(el('b',null,c[m.id].toLocaleString()));
      row.appendChild(el('span',null,m.label));
      box.appendChild(row);
    });
    box.hidden=false;
    var w=box.offsetWidth;
    box.style.left=Math.max(0,Math.min(W-w,cx+14>W-w?cx-14-w:cx+14))+'px';
  }
  function go(c){
    var d=$('d-'+c.days[c.days.length-1]); if(!d) return;
    if(d.tagName==='DETAILS') d.open=true;
    d.scrollIntoView({block:'start',behavior:'smooth'});
  }

  // every day of the period, newest first: what landed, then what was fixed, as they happened
  function list(days){
    var box=$('act-days'); box.textContent='';
    var open=7, shown=0;   // the newest week with anything in it starts open
    days.slice().reverse().forEach(function(d){
      var k=key(d), b=byDay[k], has=b&&(b.changes.length||b.fixed.length);
      var day=el(has?'details':'div','act-day'); day.id='d-'+k;
      var head=el(has?'summary':'div','head');
      var when=el('time',null,WDAY[d.getDay()]+' '+long(d)); when.setAttribute('datetime',k); head.appendChild(when);
      var counts=[];
      if(has){
        if(b.changes.length) counts.push(b.changes.length+(b.changes.length===1?' change':' changes'));
        ['new','prs','kit','issues'].forEach(function(id){
          var m=METRICS.filter(function(x){ return x.id===id; })[0];
          if(b[id]) counts.push(plural(b[id],m));
        });
      }
      head.appendChild(el('span','n',has?counts.join(' · '):'Nothing landed'));
      day.appendChild(head);
      if(has){
        if(shown++<open) day.open=true;
        // an issue a change of the same day closes goes under that change; the rest stand alone
        var under={};
        b.changes.forEach(function(c){ (c.fixes||[]).forEach(function(n){ under[n]=c; }); });
        var ul=el('ul','act-items');
        var items=b.changes.map(function(c){ return {t:c.t,c:c,fixed:b.fixed.filter(function(i){ return under[i.n]===c; })}; })
          .concat(b.fixed.filter(function(i){ return !under[i.n]; }).map(function(i){ return {t:i.t,i:i}; }));
        items.sort(function(a,z){ return z.t-a.t; }).forEach(function(it){ ul.appendChild(it.c?change(it.c,it.fixed):fixed(it.i)); });
        day.appendChild(ul);
      }
      box.appendChild(day);
    });
    if(location.hash&&/^#d-/.test(location.hash)){ var t=document.querySelector(location.hash); if(t&&t.tagName==='DETAILS') t.open=true; }
  }
  function tag(kind,text){ return el('span','act-tag '+kind,text); }
  // a title as text, with its `quoted code` set as code
  function titled(e,text){
    text.split('`').forEach(function(part,i){ if(part) e.appendChild(i%2?el('code',null,part):document.createTextNode(part)); });
    return e;
  }
  function link(href,text){ var a=el('a'); a.href=href; return titled(a,text); }
  function item(tags,what){
    var li=el('li'), t=el('span','tags');
    tags.forEach(function(x){ t.appendChild(tag(x[0],x[1])); });
    li.appendChild(t); li.appendChild(what);
    return li;
  }
  function change(c,fixes){
    var what=el('span','what');
    what.appendChild(link(c.pr?D.repo+'/pull/'+c.pr:D.repo+'/commit/'+c.sha,c.title));
    var meta=el('span','m');
    meta.appendChild(document.createTextNode(c.pr?'#'+c.pr:'pushed to main'));
    var who=(c.who||[]).map(function(p){ return p[1]||p[0]; });
    if(who.length) meta.appendChild(document.createTextNode(' · '+names(who)));
    var gs=c.added&&c.added.length?c.added:c.games||[];
    if(gs.length>3) meta.appendChild(document.createTextNode(' · '+gs.length+' games'));
    else gs.forEach(function(g,i){
      meta.appendChild(document.createTextNode(i?', ':' · '));
      meta.appendChild(D.games[g]?link(g+'/',gameName(g)):document.createTextNode(gameName(g)));
    });
    what.appendChild(meta);
    fixes.forEach(function(i){
      var f=el('span','fix'); f.appendChild(tag('issue','fixes'));
      f.appendChild(link(D.repo+'/issues/'+i.n,i.title)); f.appendChild(el('span','m','#'+i.n));
      what.appendChild(f);
    });
    return item(c.areas.filter(function(a){ return !(a==='game'&&c.areas.indexOf('new')>=0); }).map(function(a){ return [a,TAGS[a]]; }),what);
  }
  function fixed(i){
    var what=el('span','what');
    what.appendChild(link(D.repo+'/issues/'+i.n,i.title));
    what.appendChild(el('span','m','#'+i.n));
    return item([['issue','issue fixed']],what);
  }

  function remember(){
    try{
      var q=new URLSearchParams(location.search);
      if(state.sel==='30') q.delete('days'); else q.set('days',state.sel);
      if(state.metric==='prs') q.delete('count'); else q.set('count',state.metric);
      var s=q.toString(); history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash);
    }catch(e){}
  }
  document.querySelectorAll('#act-range button').forEach(function(b){
    b.addEventListener('click',function(){ state.sel=b.dataset.days; remember(); render(); });
  });
  var stamp=long(built,true)+', '+pad(built.getHours())+':'+pad(built.getMinutes());
  $('act-asof').appendChild(document.createTextNode('built ')); $('act-asof').appendChild(el('b',null,long(built,true)));
  $('act-built').textContent=stamp;
  render();
  if(location.hash&&/^#d-/.test(location.hash)){ var t=document.querySelector(location.hash); if(t) t.scrollIntoView(); }
  var w=$('act-plot').clientWidth;
  addEventListener('resize',function(){ if($('act-plot').clientWidth!==w){ w=$('act-plot').clientWidth; chart(); } });
})();

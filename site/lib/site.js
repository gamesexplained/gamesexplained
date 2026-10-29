// Shared behaviour: mark the active tab, and turn $XXXX inside <code> into links to the Source tab.
// In a game of several parts an address belongs to one of them: an element's data-part="<id>" sends
// the addresses inside it to that part's Source page, and data-part="" links none of them.
(function(){
  var seg=location.pathname.split('/').pop();
  var here=(seg&&seg.indexOf('.html')>-1)?seg:'index.html';   /* clean URLs land on the directory */
  document.querySelectorAll('.gametabs a.tab').forEach(function(a){
    var h=a.getAttribute('href')||'';
    if(h==='./')h='index.html';
    if(h===here||(h==='source.html'&&/^source-.+\.html$/.test(here))) a.classList.add('on');   /* a part's Source page */
  });
  // a list that goes somewhere: the parts beside a listing (build.py, part_step)
  document.querySelectorAll('select[data-go]').forEach(function(s){
    s.addEventListener('change',function(){ if(s.value) location.href=s.value; });
  });
  document.querySelectorAll('button[data-copy]').forEach(function(b){
    var src=document.querySelector(b.dataset.copy); if(!src) return;
    b.addEventListener('click',function(){
      var text=src.textContent.trim(), done=function(){ b.textContent='Copied'; b.classList.add('did'); setTimeout(function(){ b.textContent='Copy'; b.classList.remove('did'); },1600); };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done,function(){ select(); });
      else select();
      function select(){ var r=document.createRange(); r.selectNodeContents(src); var s=getSelection(); s.removeAllRanges(); s.addRange(r); try{ if(document.execCommand('copy')) done(); }catch(e){} }
    });
  });
  var still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Home page, New and updated: four cards at a time, a dot a page; the row moves on every six seconds,
  // and holds still while it is pointed at, touched or focused, or when the reader asks for less motion
  document.querySelectorAll('.recent').forEach(function(box){
    var row=box.querySelector('.cards'), dots=box.querySelector('.dots'), hold=false;
    if(!row||!dots) return;
    function pages(){ return Math.max(1,Math.ceil(row.scrollWidth/row.clientWidth-0.05)); }
    function mark(){
      var n=pages(), cur=Math.round(row.scrollLeft/row.clientWidth);
      if(dots.children.length!==n){
        dots.innerHTML='';
        for(var i=0;i<n;i++)(function(i){
          var d=document.createElement('button'); d.type='button'; d.setAttribute('aria-label','Page '+(i+1));
          d.onclick=function(){ row.scrollTo({left:i*row.clientWidth}); }; dots.appendChild(d);
        })(i);
        dots.hidden=n<2;
      }
      [].forEach.call(dots.children,function(d,i){ d.setAttribute('aria-current',String(i===cur)); });
    }
    row.addEventListener('scroll',mark,{passive:true}); window.addEventListener('resize',mark); mark();
    ['mouseenter','focusin','touchstart'].forEach(function(e){ box.addEventListener(e,function(){ hold=true; },{passive:true}); });
    ['mouseleave','focusout'].forEach(function(e){ box.addEventListener(e,function(){ hold=false; }); });
    if(!still) setInterval(function(){
      if(hold||document.hidden) return;
      var end=row.scrollLeft+row.clientWidth>=row.scrollWidth-4;
      row.scrollTo({left:end?0:row.scrollLeft+row.clientWidth});
    },6000);
  });
  // Home page, the featured game: its title image, then each of game.json's featured_frames, faded in turn
  document.querySelectorAll('.show img[data-frames]').forEach(function(a){
    if(still) return;
    var frames=[a.getAttribute('src')].concat(a.dataset.frames.split(' ')), i=0;
    var wrap=document.createElement('span'); wrap.className='shots'; a.parentNode.insertBefore(wrap,a); wrap.appendChild(a);
    var b=a.cloneNode(); b.removeAttribute('data-frames'); b.alt=''; b.style.opacity=0; wrap.appendChild(b);
    frames.forEach(function(f){ new Image().src=f; });
    var top=a;
    setInterval(function(){
      if(document.hidden) return;
      i=(i+1)%frames.length; var back=top===a?b:a;
      back.src=frames[i]; back.style.opacity=1; top.style.opacity=0; top=back;
    },3500);
  });
  // Home page, the catalogue: search, filters, sorts that group, and a list view, all over the cards
  // build.py wrote; without script every card is still there, best first
  (function(){
    var cat=document.getElementById('catalogue'), finder=document.getElementById('finder');
    if(!cat||!finder) return;
    var cards=[].slice.call(cat.querySelectorAll('.tile')), q=document.getElementById('q'), sort=document.getElementById('sort');
    var facets=document.getElementById('facets'), count=document.getElementById('count'), more=document.getElementById('more');
    var TIERS=[['diamond','Diamond','Curated by a person, and the whole game playable.'],
               ['platinum','Platinum','The whole game, playable in the browser.'],['gold','Gold','Content curated by a person.'],
               ['silver','Silver','The whole program explained.'],
               ['bronze','Bronze','A first look: the features and a sweep of the code.'],['none','No tier','']];
    var ERAS=[['1970s and before',0,1979],['1980 to 1984',1980,1984],['1985 to 1989',1985,1989],['1990s and after',1990,9999]];
    var era=function(c){ var y=+c.dataset.year; for(var i=0;i<ERAS.length;i++) if(y>=ERAS[i][1]&&y<=ERAS[i][2]) return ERAS[i][0]; return ''; };
    var plats={}; cards.forEach(function(c){ plats[c.dataset.platform]=c.dataset.platformName; });
    var FACETS=[
      ['platform','All platforms',Object.keys(plats).map(function(k){ return [k,plats[k]]; }),function(c){ return c.dataset.platform; }],
      ['tier','All tiers',TIERS.map(function(t){ return [t[0],t[1]]; }),function(c){ return c.dataset.tier; }],
      ['era','Any year',ERAS.map(function(e){ return [e[0],e[0]]; }),era]];
    var st={q:'',sort:'tier',view:'cards',f:{platform:'',tier:'',era:''},open:{}};
    try{ var v=localStorage.getItem('ge-view'); if(v==='list') st.view=v; }catch(e){}
    function ok(c,skip){
      if(st.q){ var w=st.q.split(/\s+/); for(var i=0;i<w.length;i++) if(c.dataset.q.indexOf(w[i])<0) return false; }
      for(var j=0;j<FACETS.length;j++){ var k=FACETS[j][0]; if(k!==skip&&st.f[k]&&FACETS[j][3](c)!==st.f[k]) return false; }
      return true;
    }
    function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function drawFacets(){
      var h='';
      FACETS.forEach(function(F){
        var pool=cards.filter(function(c){ return ok(c,F[0]); });
        h+='<select data-k="'+F[0]+'" aria-label="'+F[1]+'"><option value="">'+F[1]+'</option>';
        F[2].forEach(function(o){
          var n=pool.filter(function(c){ return F[3](c)===o[0]; }).length;
          if(n||st.f[F[0]]===o[0]) h+='<option value="'+esc(o[0])+'"'+(st.f[F[0]]===o[0]?' selected':'')+'>'+esc(o[1])+' ('+n+')</option>';
        });
        h+='</select>';
      });
      if(st.q||st.f.platform||st.f.tier||st.f.era) h+='<button type="button" class="clear">Clear</button>';
      facets.innerHTML=h;
    }
    var bare=function(t){ return t.replace(/^The /,''); };
    function groups(list){
      var key, name, order;
      if(st.sort==='az'){ list.sort(function(a,b){ return bare(a.dataset.title).localeCompare(bare(b.dataset.title)); });
        key=function(c){ var l=bare(c.dataset.title).charAt(0).toUpperCase(); return /[A-Z]/.test(l)?l:'#'; }; }
      else if(st.sort==='year'){ list.sort(function(a,b){ return a.dataset.year-b.dataset.year||a.dataset.title.localeCompare(b.dataset.title); });
        key=function(c){ return c.dataset.year||'Year unknown'; }; }
      else if(st.sort==='new'){ list.sort(function(a,b){ return b.dataset.added.localeCompare(a.dataset.added); });
        key=function(c){ var d=c.dataset.added; return d?new Date(d+'T00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'Date unknown'; }; }
      else key=function(c){ return c.dataset.tier; };   // build.py wrote them best first
      var out=[], at={};
      list.forEach(function(c){ var k=key(c); if(!(k in at)){ at[k]=out.length; out.push([k,[]]); } out[at[k]][1].push(c); });
      return out;
    }
    function draw(){
      drawFacets();
      var list=cards.filter(function(c){ return ok(c); });
      count.textContent=list.length===cards.length?cards.length+' games':list.length+' of '+cards.length+' games';
      cat.classList.toggle('list',st.view==='list');
      cat.innerHTML='';
      if(!list.length){ cat.innerHTML='<div class="empty"><p><b>No games match.</b></p><p>Try fewer filters, or search for a publisher or a person.</p></div>'; return; }
      groups(list).forEach(function(g){
        var sec=document.createElement('div'), t=st.sort==='tier'?TIERS.filter(function(x){ return x[0]===g[0]; })[0]:null;
        sec.className='catgroup'+(t?' t-'+g[0]:'');
        var n=g[1].length;
        sec.innerHTML='<h3>'+esc(t?t[1]:g[0])+'<span class="n">'+n+(n===1?' game':' games')+'</span>'+(t&&t[2]?'<small>'+esc(t[2])+'</small>':'')+'</h3>';
        var grid=document.createElement('div'); grid.className='tiles';
        g[1].forEach(function(c){ c.classList.remove('hidden'); grid.appendChild(c); });
        sec.appendChild(grid); cat.appendChild(sec);
        // one row a group, and a button for the rest, until the reader searches or filters
        var narrow=st.q||st.f.platform||st.f.tier||st.f.era;
        if(narrow||st.open[g[0]]) return;
        var cols=st.view==='list'?5:getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        if(n<=cols) return;
        g[1].forEach(function(c,i){ if(i>=cols) c.classList.add('hidden'); });
        var more=document.createElement('button'); more.type='button'; more.className='showall';
        more.innerHTML='See all '+n+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'; more.setAttribute('aria-label','See all '+n+' '+(t?t[1]+' ':'')+'games');
        more.onclick=function(){ st.open[g[0]]=true; g[1].forEach(function(c){ c.classList.remove('hidden'); }); more.remove(); };
        sec.appendChild(more);
      });
    }
    finder.hidden=false;
    q.addEventListener('input',function(){ st.q=q.value.trim().toLowerCase(); draw(); });
    sort.addEventListener('change',function(){ st.sort=sort.value; st.open={}; draw(); });
    facets.addEventListener('change',function(e){ var k=e.target.dataset.k; if(k){ st.f[k]=e.target.value; draw(); } });
    facets.addEventListener('click',function(e){ if(e.target.classList.contains('clear')){ st.f={platform:'',tier:'',era:''}; st.q=''; q.value=''; draw(); } });
    more.addEventListener('click',function(){ facets.hidden=!facets.hidden; more.setAttribute('aria-expanded',String(!facets.hidden)); });
    finder.querySelectorAll('[data-view]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.dataset.view===st.view));
      b.addEventListener('click',function(){
        st.view=b.dataset.view; try{ localStorage.setItem('ge-view',st.view); }catch(e){}
        finder.querySelectorAll('[data-view]').forEach(function(x){ x.setAttribute('aria-pressed',String(x===b)); }); draw();
      });
    });
    document.addEventListener('keydown',function(e){
      var t=e.target.tagName;
      if(e.key==='/'&&t!=='INPUT'&&t!=='TEXTAREA'&&t!=='SELECT'){ e.preventDefault(); q.focus(); }
      if(e.key==='Escape'&&e.target===q){ q.value=''; st.q=''; draw(); }
    });
    draw();
  })();
  // About page: a # beside each section heading, shown on hover, links straight to that section
  document.querySelectorAll('.about h2[id]').forEach(function(h){
    var a=document.createElement('a'); a.className='hash'; a.href='#'+h.id; a.textContent='#';
    a.setAttribute('aria-label','Link to this section'); h.appendChild(a);
  });
  // Every tab but Source: the sections in the margin, listed by build.py. Mark the one being read and keep
  // it in view; below 1200px the list is a drawer, opened from a Contents button. A section or heading the
  // page's own script writes (a levels page drawn from the game's bytes) joins the list when it appears.
  var pn=document.querySelector('.pagenav');
  if(!pn) (function(){   // the Source tab: its index sticks beneath the tab bar, however many rows of tabs the game has
    var tabs=document.querySelector('.gametabs');
    function measure(){ if(tabs) document.documentElement.style.setProperty('--tabs-h',tabs.offsetHeight+'px'); }
    measure(); addEventListener('resize',measure);
  })();
  if(pn) (function(){
    var root=document.documentElement, tabs=document.querySelector('.gametabs'), list=pn.querySelector('ol');
    var cur=-2, busy=false, links=[], secs=[];
    var btn=document.createElement('button'), scrim=document.createElement('div');
    btn.type='button'; btn.className='pagenav-btn'; btn.setAttribute('aria-controls','pagenav'); btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h8"/></svg>Contents <span class="n"></span>';
    scrim.className='pagenav-scrim';
    document.body.appendChild(scrim); document.body.appendChild(btn);
    function open(on){
      root.classList.toggle('pagenav-open',on); btn.setAttribute('aria-expanded',String(on));
      if(on){ keep(true); var a=links[cur]||links[0]; if(a) a.focus({preventScroll:true}); }
    }
    btn.addEventListener('click',function(){ open(true); });
    scrim.addEventListener('click',function(){ open(false); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&root.classList.contains('pagenav-open')){ open(false); btn.focus(); } });
    pn.addEventListener('click',function(e){
      var a=e.target.closest('a'); if(!a) return;
      var id=decodeURIComponent(a.hash.slice(1)), el=id&&document.getElementById(id);
      var how=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
      e.preventDefault(); open(false);
      if(el){ el.scrollIntoView({behavior:how,block:'start'}); history.replaceState(null,'','#'+id); }
      else{ scrollTo({top:0,behavior:how}); history.replaceState(null,'',location.pathname+location.search); }
    });
    function keep(force){   // scroll the list, not the page, to bring the marked section into view
      var a=links[cur]; if(!a||(!force&&pn.matches(':hover'))) return;
      var pr=pn.getBoundingClientRect(), ar=a.getBoundingClientRect();
      if(force||ar.top<pr.top+48||ar.bottom>pr.bottom-48) pn.scrollTop+=ar.top-pr.top-pr.height/3;
    }
    function spy(){
      busy=false;
      var line=(tabs?tabs.offsetHeight:0)+Math.min(200,innerHeight*.28), i=-1, k;
      for(k=0;k<secs.length;k++) if(secs[k]&&secs[k].getBoundingClientRect().top<=line) i=k;
      if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)   // at the foot: the last section in sight
        for(k=secs.length-1;k>i;k--) if(secs[k]&&secs[k].getBoundingClientRect().top<innerHeight*.8){ i=k; break; }
      if(i===cur) return;
      cur=i;
      links.forEach(function(a,k){ a.classList.toggle('on',k===i); if(k===i) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
      btn.querySelector('.n').textContent=i<0?'':(i<9?'0':'')+(i+1)+'/'+links.length;
      keep(false);
    }
    function measure(){ if(tabs) root.style.setProperty('--tabs-h',tabs.offsetHeight+'px'); }
    function collect(){
      links=[].slice.call(list.querySelectorAll('a'));
      secs=links.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
      btn.hidden=!links.length; cur=-2;
    }
    // The page's outline read the way build.py reads it: each top-level section, by its first h2 or
    // its label, and every other h2 as an entry of its own. Nothing inside a block hidden with the page
    // editor (data-cut) is listed, as build.py lists none of it.
    function bare(el){ var c=el.cloneNode(true); [].forEach.call(c.querySelectorAll('.tag, .badge'),function(x){ x.remove(); }); return c.textContent.replace(/\s+/g,' ').trim(); }
    function slug(s){ return s.toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40).replace(/-+$/,''); }
    function outline(){
      var out=[], top=new Map();
      [].forEach.call(document.querySelectorAll('section, h2'),function(el){
        if(pn.contains(el)||el.closest('[data-cut]')) return;
        var s=el.tagName==='SECTION'?el:el.closest('section');
        while(s&&s.parentElement&&s.parentElement.closest('section')) s=s.parentElement.closest('section');
        if(el.tagName==='SECTION'){ if(s===el){ var e={el:el,h2:null}; out.push(e); top.set(el,e); } return; }
        var t=s&&top.get(s);
        if(t&&!t.h2) t.h2=el; else out.push({el:el,h2:el});
      });
      return out;
    }
    function entry(e){
      var fig=e.el.tagName==='SECTION'&&e.el.querySelector('.fig'), num='', label='', tag='';
      if(fig&&(!e.h2||fig.compareDocumentPosition(e.h2)&Node.DOCUMENT_POSITION_FOLLOWING)){
        var f=bare(fig), m=/^(\d+)\s*[·:.–—-]\s*(.*)$/.exec(f); num=m?m[1]:''; label=m?m[2]:f;
      }
      var head=(e.h2?bare(e.h2):'')||label, p=/^(bug|secret|music|sound)\s*:\s*/i.exec(head);
      if(p){ tag=p[1].toLowerCase(); head=head.slice(p[0].length); head=head.charAt(0).toUpperCase()+head.slice(1); }
      return {num:num,label:label,head:head,tag:tag};
    }
    function grow(){   // add what the page wrote after the build, in page order
      var have={}, prev=null, added=0;
      links.forEach(function(a){ have[decodeURIComponent(a.hash.slice(1))]=a.parentNode; });
      outline().forEach(function(e){
        if(e.el.id&&have[e.el.id]){ prev=have[e.el.id]; return; }
        var d=entry(e); if(!d.head) return;
        if(!e.el.id){ var base=slug(d.label||d.head)||'section', id=base, n=2; while(document.getElementById(id)) id=base+'-'+n++; e.el.id=id; }
        var li=document.createElement('li'), a=document.createElement('a'), num=document.createElement('span'), h=document.createElement('span');
        a.href='#'+e.el.id; num.className='n'; num.textContent=d.num; h.className='h';
        if(d.tag){ var k=document.createElement('span'); k.className='k '+d.tag; k.textContent=d.tag.charAt(0).toUpperCase()+d.tag.slice(1); h.appendChild(k); h.appendChild(document.createTextNode(' ')); }
        h.appendChild(document.createTextNode(d.head)); a.appendChild(num); a.appendChild(h); li.appendChild(a);
        list.insertBefore(li,prev?prev.nextSibling:list.firstChild); prev=have[e.el.id]=li; added++;
        if(location.hash==='#'+e.el.id&&scrollY<50) e.el.scrollIntoView();   // a link to it arrived before it did
      });
      if(added){ collect(); spy(); }
    }
    // A section off the screen is neither laid out nor painted (section.cv in site.css), so a long page
    // scrolls at the cost of what is in sight, whatever the rest of it draws. Off the screen it stands at
    // the height it had, taken here once the page, its pictures and its fonts have loaded and its own
    // script has stopped writing to it, and again when the width or the list of sections changes, so the
    // scroll bar, a jump to a section and the list above keep their places. Only where a browser can let
    // a section's shadows and tooltips reach past its edge (overflow-clip-margin), and not in the page
    // editor, which measures and moves blocks.
    var cvT=0, wide=0;
    function cv(on){
      if(!on){ [].forEach.call(document.querySelectorAll('section.cv'),function(s){ s.classList.remove('cv'); }); return; }
      var ss=outline().filter(function(e){ return e.el.tagName==='SECTION'; }).map(function(e){ return e.el; });
      var hs=ss.map(function(s){   // all measured before any is skipped
        var c=getComputedStyle(s);
        return s.getBoundingClientRect().height-['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce(function(n,k){ return n+parseFloat(c[k]); },0);
      });
      ss.forEach(function(s,i){ s.style.setProperty('--cv-h',Math.max(0,hs[i])+'px'); s.classList.add('cv'); });
      wide=innerWidth;
    }
    function again(){   // whole for a frame, so the browser forgets the heights it kept, then measured afresh
      clearTimeout(cvT);
      cvT=setTimeout(function(){ cv(false); requestAnimationFrame(function(){ requestAnimationFrame(function(){ cv(true); }); }); },300);
    }
    var H2=document.getElementsByTagName('h2'), SEC=document.getElementsByTagName('section'), count=-1, soon=0;
    function watch(){ soon=0; var n=H2.length+SEC.length; if(n!==count){ count=n; grow(); if(wide) again(); } }
    new MutationObserver(function(){ if(!soon) soon=setTimeout(watch,200); }).observe(document.body,{childList:true,subtree:true});
    addEventListener('scroll',function(){ if(!busy){ busy=true; requestAnimationFrame(spy); } },{passive:true});
    addEventListener('resize',function(){ measure(); cur=-2; spy(); if(wide&&innerWidth!==wide) again(); });
    collect(); watch(); measure(); spy();
    if(window.CSS&&CSS.supports('content-visibility','auto')&&CSS.supports('overflow-clip-margin','1px')){
      var quiet=0, give=0, still=new MutationObserver(function(){ clearTimeout(quiet); quiet=setTimeout(begin,400); });
      var begin=function(){ still.disconnect(); clearTimeout(quiet); clearTimeout(give); if(!wide&&!document.getElementById('ge-meta')) cv(true); };
      var start=function(){ (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){
        still.observe(document.querySelector('main')||document.body,{childList:true,attributes:true,characterData:true,subtree:true});
        quiet=setTimeout(begin,400); give=setTimeout(begin,2000);   // a page that never stops writing starts anyway
      }); };
      if(document.readyState==='complete') start(); else addEventListener('load',start);
    }
  })();
  if(document.body.dataset.nolink||document.querySelector('.gametabs[data-nolink]')) return;   /* a game with no listing has no Source page */
  document.querySelectorAll('code').forEach(function(c){
    if(c.closest('a')||c.closest('pre')||c.children.length) return;
    var t=c.textContent, m=/^\$([0-9A-Fa-f]{4,5})$/.exec(t.trim());
    if(!m) return;
    var d=c.closest('[data-part]'), page=d?(d.dataset.part?'source-'+d.dataset.part+'.html':''):'source.html';
    if(m[1].length>4&&!(d&&d.dataset.part)) return;   /* five digits: a story's address, in its part's element */
    if(!page) return;
    var a=document.createElement('a'); a.href=page+'#'+m[1].toUpperCase(); a.textContent=t;
    a.dataset.auto='';   /* not in the source: the page editor leaves it out of what it saves */
    c.textContent=''; c.appendChild(a);
  });
})();

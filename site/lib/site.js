// Shared behaviour: mark the active tab, and turn $XXXX inside <code> into links to the Source tab.
(function(){
  var seg=location.pathname.split('/').pop();
  var here=(seg&&seg.indexOf('.html')>-1)?seg:'index.html';   /* clean URLs land on the directory */
  document.querySelectorAll('.gametabs a.tab').forEach(function(a){
    var h=a.getAttribute('href')||'';
    if(h==='./')h='index.html';
    if(h===here) a.classList.add('on');
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
  // platform chips on the home page: hide every card whose data-platform is not the chosen one
  document.querySelectorAll('.platforms a[data-filter]').forEach(function(a){
    a.addEventListener('click',function(ev){
      ev.preventDefault(); var f=a.dataset.filter;
      a.closest('.platforms').querySelectorAll('a').forEach(function(x){ x.classList.toggle('on',x===a); });
      document.querySelectorAll('[data-platform]').forEach(function(el){ el.classList.toggle('hidden',!!f&&el.dataset.platform!==f); });
    });
  });
  // About page: a # beside each section heading, shown on hover, links straight to that section
  document.querySelectorAll('.about h2[id]').forEach(function(h){
    var a=document.createElement('a'); a.className='hash'; a.href='#'+h.id; a.textContent='#';
    a.setAttribute('aria-label','Link to this section'); h.appendChild(a);
  });
  // How it works: the sections in the margin, listed by build.py. Mark the one being read and keep
  // it in view; below 1200px the list is a drawer, opened from a Contents button.
  var pn=document.querySelector('.pagenav');
  if(pn) (function(){
    var root=document.documentElement, tabs=document.querySelector('.gametabs'), cur=-2, busy=false;
    var links=[].slice.call(pn.querySelectorAll('ol a'));
    var secs=links.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
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
    addEventListener('scroll',function(){ if(!busy){ busy=true; requestAnimationFrame(spy); } },{passive:true});
    addEventListener('resize',function(){ measure(); cur=-2; spy(); });
    measure(); spy();
  })();
  if(document.body.dataset.nolink) return;
  document.querySelectorAll('code').forEach(function(c){
    if(c.closest('a')||c.closest('pre')||c.children.length) return;
    var t=c.textContent, m=/^\$([0-9A-Fa-f]{4})$/.exec(t.trim());
    if(!m) return;
    var a=document.createElement('a'); a.href='source.html#'+m[1].toUpperCase(); a.textContent=t;
    c.textContent=''; c.appendChild(a);
  });
})();

(function () {
  'use strict';
  const E = window.FreeCellEngine;
  const $ = (id) => document.getElementById(id);
  const MAX_HISTORY = 180;
  const KEY = 'tata-freecell-v1';
  const S = { game: null, history: [], future: [], selected: null, hint: null, elapsed: 0, clockStart: 0, playing: false };
  const label = (card) => `${E.names[card.rank]}${E.SUITS[card.suit]}`;
  const msg = text => { $('message').textContent = text; };
  function randomSeed() {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] || 1; }
    catch { return (Math.floor(Math.random() * 4294967295) >>> 0) || 1; }
  }
  function elapsedNow() { return S.elapsed + (S.playing ? Math.floor((Date.now() - S.clockStart)/1000) : 0); }
  function formatTime(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function safeSave() {
    try { localStorage.setItem(KEY, JSON.stringify({ game:S.game, history:S.history, future:S.future, elapsed:elapsedNow(), playing:S.playing })); } catch {}
  }
  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY));
      if (!x?.game || x.game.tableau?.length !== 8 || x.game.cells?.length !== 4 || x.game.foundations?.length !== 4) return false;
      S.game = x.game; S.history = x.history || []; S.future = x.future || [];
      S.elapsed = Math.max(0, x.elapsed || 0); S.playing = !!x.playing;
      S.clockStart=Date.now(); return true;
    } catch { return false; }
  }
  function reset(seed, message) {
    S.game=E.create(seed); S.history=[]; S.future=[]; S.selected=null; S.hint=null;
    S.elapsed=0;S.playing=false;S.clockStart=0;
    $('winOverlay').classList.add('hidden');
    msg(message || '新的一局！先找找 A 在哪里 ♡'); draw();safeSave();
  }
  function pushHistory() {
    S.history.push({game:E.clone(S.game),elapsed:elapsedNow()});
    if(S.history.length>MAX_HISTORY)S.history.shift();
    S.future=[];
    if(!S.playing){ S.playing=true;S.clockStart=Date.now(); }
  }
  function commit(next, notice) {
    if(!next)return false;
    pushHistory();S.game=next;S.selected=null;S.hint=null;msg(notice || '漂亮的一步 ♡');draw();safeSave();
    if(E.won(next)) {
      S.elapsed=elapsedNow();S.playing=false;
      $('winStats').textContent=`${next.moves} 步 · ${formatTime(S.elapsed)}`;
      $('winOverlay').classList.remove('hidden');safeSave();
    }
    return true;
  }
  function changeHistory(undo) {
    const from=undo?S.history:S.future, to=undo?S.future:S.history;
    if(!from.length)return;
    to.push({game:E.clone(S.game),elapsed:elapsedNow()});
    const snap=from.pop();S.game=E.clone(snap.game);S.elapsed=snap.elapsed;
    S.playing=S.game.moves>0 && !E.won(S.game);S.clockStart=Date.now();S.selected=null;S.hint=null;
    $('winOverlay').classList.add('hidden');
    msg(undo?'撤销一步。再想想～':'重做完成 ♡');draw();safeSave();
  }
  function zoneName(zone,index) {
    if(zone==='tableau')return `第 ${index+1} 列`;
    if(zone==='cells')return `暂存位 ${index+1}`;
    return `${E.SUITS[index]} 收牌区`;
  }
  function interact(zone,index,at) {
    const dst={zone,index};
    if(S.selected){
      const cards=E.sourceCards(S.game,S.selected);
      const next=E.move(S.game,S.selected,dst);
      if(next){commit(next,`${cards.map(label).join('、')} → ${zoneName(zone,index)}`);return;}
      if(zone===S.selected.zone && index===S.selected.index && (zone!=='tableau'||at===S.selected.at)) {
        S.selected=null;S.hint=null;msg('已取消选中');draw();return;
      }
    }
    if(zone==='foundations') { msg('先选一张牌，再点这里收牌。');draw();return; }
    const src={zone,index,...(zone==='tableau'?{at}: {})};
    const cards=E.sourceCards(S.game,src);
    if(cards&&cards.length){S.selected=src;S.hint=null;msg(`已选 ${cards.map(label).join('、')}，再点想放的位置`);draw();}
    else {S.selected=null;S.hint=null;msg('这组牌暂时不能一起移动，试试选最下面一张。');draw();}
  }
  function makeCard(card, opts={}) {
    const el=document.createElement(opts.displayOnly?'div':'button');if(!opts.displayOnly)el.type='button';
    el.className=`card ${card.suit===1||card.suit===3?'red':''}${opts.selected?' selected':''}${opts.hint?' hint':''}`;
    el.setAttribute('aria-label',label(card));
    el.title=label(card);
    el.innerHTML=`<div class="rank">${E.names[card.rank]}</div><div class="suit">${E.SUITS[card.suit]}</div><div class="corner">${E.SUITS[card.suit]}</div>`;
    return el;
  }
  function draw() {
    const s=S.game;
    $('dealNo').textContent='#'+s.seed;
    $('moves').textContent=s.moves;
    $('time').textContent=formatTime(elapsedNow());
    $('progress').textContent=s.foundations.reduce((a,b)=>a+b,0)+'/52';
    $('undoBtn').disabled=!S.history.length;
    $('redoBtn').disabled=!S.future.length;
    const cells=$('cells');cells.replaceChildren();
    s.cells.forEach((card,index)=>{
      const slot=document.createElement('button');slot.type='button';slot.className='slot';
      slot.setAttribute('aria-label',`${zoneName('cells',index)} ${card?label(card):'空'}`);
      if(card){const c=makeCard(card,{displayOnly:true,selected:S.selected?.zone==='cells'&&S.selected.index===index});c.tabIndex=-1;slot.append(c);}
      else slot.innerHTML='<span class="slot-hint">＋</span>';
      if(S.selected?.zone==='cells'&&S.selected.index===index)slot.classList.add('selected');
      if(S.hint?.dst.zone==='cells'&&S.hint.dst.index===index)slot.classList.add('target-highlight');
      slot.addEventListener('click',()=>interact('cells',index));cells.append(slot);
    });
    const fd=$('foundations');fd.replaceChildren();
    s.foundations.forEach((rank,index)=>{
      const slot=document.createElement('button');slot.type='button';slot.className='slot foundation';
      slot.setAttribute('aria-label',`${E.SUITS[index]}收牌区，已收到${rank}`);
      if(rank){const card=makeCard({suit:index,rank},{displayOnly:true});card.tabIndex=-1;slot.append(card);}
      else slot.innerHTML=`<span aria-hidden="true">${E.SUITS[index]}</span>`;
      if(S.hint?.dst.zone==='foundations'&&S.hint.dst.index===index)slot.classList.add('target-highlight');
      slot.addEventListener('click',()=>interact('foundations',index));fd.append(slot);
    });
    const board=$('tableau');board.replaceChildren();
    s.tableau.forEach((cards,index)=>{
      const pile=document.createElement('div');pile.className='pile'+(!cards.length?' empty':'');
      pile.setAttribute('role','group');pile.setAttribute('aria-label',zoneName('tableau',index));
      pile.addEventListener('click',(e)=>{if(e.target===pile)interact('tableau',index);});
      cards.forEach((card,at)=>{
        const isSelected=S.selected?.zone==='tableau'&&S.selected.index===index&&at>=S.selected.at;
        const isHint=S.hint?.src.zone==='tableau'&&S.hint.src.index===index&&at===S.hint.src.at;
        const isDest=S.hint?.dst.zone==='tableau'&&S.hint.dst.index===index&&at===cards.length-1;
        const el=makeCard(card,{selected:isSelected,hint:isHint||isDest});
        el.style.top=`calc(${at} * var(--step, 27px))`;
        el.style.zIndex=String(at+1);
        el.setAttribute('aria-label',`${label(card)}，${zoneName('tableau',index)}，第${at+1}张`);
        el.addEventListener('click',(evt)=>{evt.stopPropagation();interact('tableau',index,at);});
        pile.append(el);
      });
      if(S.hint?.dst.zone==='tableau'&&S.hint.dst.index===index&&!cards.length)pile.classList.add('selected-empty');
      board.append(pile);
    });
    // One shared step size keeps the game usable in narrow Android views.
    board.style.setProperty('--step',window.innerWidth<350?'24px':window.innerWidth<550?'29px':'37px');
  }
  function hint() {
    const found=E.suggest(S.game);
    if(!found){msg('暂时找不到直接可走的一步，可以撤销几步再试。');return;}
    S.hint=found;S.selected=null;draw();
    const sourceCard=E.sourceCards(S.game,found.src)?.[0];
    msg(`试试：把 ${label(sourceCard)} 从${zoneName(found.src.zone,found.src.index)}移到${zoneName(found.dst.zone,found.dst.index)} ✧`);
  }
  function auto() {
    const r=E.autoFoundations(S.game);
    if(!r.count){msg('暂时没有适合自动归位的牌～');return;}
    commit(r.state,`自动收好了 ${r.count} 张牌 ♡`);
  }
  $('newBtn').addEventListener('click',()=>reset(randomSeed(),'新的一局开始，慢慢玩 ♡'));
  $('dailyBtn').addEventListener('click',()=>{const d=new Date();reset(Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`),'今日挑战！同一天总是同一副牌。');});
  $('undoBtn').addEventListener('click',()=>changeHistory(true));
  $('redoBtn').addEventListener('click',()=>changeHistory(false));
  $('hintBtn').addEventListener('click',hint);
  $('autoBtn').addEventListener('click',auto);
  $('helpBtn').addEventListener('click',()=>$('helpOverlay').classList.remove('hidden'));
  $('closeHelp').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
  $('startHelp').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
  $('nextWin').addEventListener('click',()=>reset(randomSeed(),'新的一局，继续加油 ♡'));
  $('closeWin').addEventListener('click',()=>$('winOverlay').classList.add('hidden'));
  window.addEventListener('resize',draw);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)safeSave();});
  window.addEventListener('pagehide',safeSave);
  setInterval(()=>{if(S.playing)$('time').textContent=formatTime(elapsedNow());},1000);
  if(!load())reset(randomSeed());else{draw();msg('欢迎回来，上次的牌还在这里 ♡');}
})();

'use strict';
/* ===== O GENERAL NO INFERNO — JavaScript puro ===== */
const cv = document.getElementById('game'), c = cv.getContext('2d');
const W = 960, H = 540, $ = i => document.getElementById(i);

/* ---------- CONFIGURAÇÕES FÁCEIS DE MUDAR ---------- */
const VIDAS = 3, GRAV = 1800, PULO = 640, ANDAR = 230, CORRER = 330;
const ZS = 4040, ZE = 5200, FIM = 5780, CICLOS = 3; // zona do abacaxi (início, fim) e fim da fase

/* ---------- FASE ---------- */
// plataformas [x, y(topo), largura]
const plats = [[0,440,720],[800,400,160],[1040,360,160],[1280,420,320],[1700,380,100],[1880,330,100],
  [2060,380,100],[2240,330,100],[2800,420,420],[3320,420,560],[3960,420,1400],[5440,420,500]];
const S = plats.map(p => ({x:p[0], y:p[1], w:p[2], h:90}));
const mp = {x:2370, y:380, w:100, h:20, dx:0};                    // plataforma móvel
const spikes = [[500,440,60],[2920,420,60],[3090,420,60]];          // espetos [x, topo, largura]
const jets = [{x:3450,y:420,o:0},{x:3620,y:420,o:.9},{x:3790,y:420,o:1.7}]; // jatos de fogo
const cps = [{x:1320,y:420},{x:2830,y:420},{x:3990,y:420}];         // checkpoints
const npcs = [{x:300,y:440,k:'soul'},{x:900,y:400,k:'soul'},{x:1740,y:380,k:'imp'},
  {x:2960,y:420,k:'soul'},{x:3350,y:420,k:'imp'},{x:4030,y:420,k:'boss'}];
// diálogos [x que ativa, quem, texto]
const talk = [
 [60,'General','Eu exijo falar com o gerente deste lugar! Eu era um ditador, sabia?!'],
 [280,'Alma Penada','Psiu, general… aqui todo mundo foi alguém. Agora todo mundo é fila.'],
 [900,'General','Essa lava está FORA do protocolo! Quem autorizou este calor?!'],
 [1330,'Diabinho','Dica do tutorial: pule em cima de mim. Pode ser que eu goste.'],
 [1720,'General','Correntes?! Eu mandava prender gente, não me pendurar em decoração!'],
 [2830,'Alma Penada','Eu era sommelier de espetos. Reconheço um mal posicionado.'],
 [3340,'Capataz','Jatos de fogo: cortesia da casa. Sem gorjeta, sem reclamação.'],
 [3990,'Capataz','Bem-vindo ao Bar do Abacaxi Eterno! Avental incluso, general.'],
 [4150,'General','Por que SEMPRE tem que ser um abacaxi?! Eu exijo uma fruta diferente!'],
 [5600,'Capataz','Quase lá! Só falta o formulário 27-B (em três vias, em chamas).']
];
const mortes = {
 lava:'Lava?! Eu contratei um SPA, não um vulcão!',
 spike:'Quem espalhou espeto no chão?! Cadê o RH daqui?!',
 enemy:'Derrotado por um diabinho?! Eu tinha EXÉRCITOS!',
 fire:'Fogo?! Eu mandava queimar livros, não a mim!',
 pine:'DE NOVO O ABACAXI?! POR QUE SEMPRE ABACAXI?!'
};

/* ---------- ESTADO ---------- */
let state='menu', keys={}, t=0, cam=0, last=0, P, score, lives, loops, deaths, cp, coinsL, enemies,
    pines, pops, shake, dlg, said, pineT, flash, banner, coinCount;

function initLevel(){
  score=0; lives=VIDAS; loops=0; deaths=0; said={}; pines=[]; pops=[]; shake=0; pineT=1; flash=0;
  banner=null; dlg=null; coinCount=0; cp={x:60,y:440}; coinsL=[];
  const row=(a,b,y,s=60)=>{for(let x=a;x<=b;x+=s)coinsL.push({x,y,got:false})};
  row(150,650,400);row(820,940,360);row(1060,1180,320);row(1300,1560,380,80);row(1710,1790,340);
  row(1890,1970,290);row(2070,2150,340);row(2250,2330,290);row(2830,3200,380,90);row(3340,3860,380,90);
  row(4000,5300,380,110);row(5460,5900,380,110);
  enemies=[{x:400,y:440,a:250,b:700},{x:1350,y:420,a:1290,b:1590},{x:2900,y:420,a:2810,b:3210},
           {x:4400,y:420,a:4300,b:4700},{x:4900,y:420,a:4800,b:5150}].map(e=>({...e,dir:1,dead:false}));
  respawn();
}
function respawn(){
  P={x:cp.x,y:cp.y-44,w:26,h:44,vx:0,vy:0,face:1,ground:false,coy:0,buf:0,onMP:false,
     dead:false,deadT:0,inv:1.5,scared:false,anim:0,st:'idle'};
  enemies.forEach(e=>e.dead=false); cam=Math.max(0,P.x-380);
}

/* ---------- ENTRADA ---------- */
const jumpKeys=['Space','ArrowUp','KeyW'];
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat)return; keys[e.code]=true;
  if(jumpKeys.includes(e.code)&&P)P.buf=.12;
  if(e.code==='KeyP'||e.code==='Escape')togglePause();
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(jumpKeys.includes(e.code)&&P&&P.vy<-250&&!P.dead)P.vy*=.5; // pulo variável
});
function show(id){['menu','pause','win','lose'].forEach(s=>$(s).classList.toggle('hidden',s!==id))}
function startGame(){initLevel();state='play';show(null);beep(300,.15)}
function togglePause(){
  if(state==='play'){state='pause';show('pause')}
  else if(state==='pause'){state='play';show(null)}
}
$('btnStart').onclick=startGame; $('btnResume').onclick=togglePause; $('btnRestart').onclick=startGame;
document.querySelectorAll('.again').forEach(b=>b.onclick=startGame);

/* ---------- SOM (bipes simples) ---------- */
let AC;
function beep(f,d=.1,ty='square'){try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain();
  o.type=ty;o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}

/* ---------- UTILS ---------- */
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const say=(who,txt,d=3.8)=>{dlg={who,txt,t:d}};
const pop=(x,y,txt,col='#ffd24a')=>pops.push({x,y,txt,col,t:1});

/* ---------- MORTE (a punição recorrente!) ---------- */
function die(cause){
  if(P.dead||P.inv>0)return;
  P.dead=true;P.deadT=0;P.vx=0;P.vy=0;P.kicked=false;lives--;deaths++;shake=.5;
  say('General',mortes[cause],2.6);beep(120,.4,'sawtooth');
}
function afterDeath(){ if(lives<=0){state='lose';$('loseScore').textContent=score;show('lose')} else respawn() }

/* ---------- ATUALIZAÇÃO ---------- */
function update(dt){
  t+=dt;
  // plataforma móvel
  const ox=mp.x; mp.x=2470+Math.sin(t*1.3)*100; mp.dx=mp.x-ox;
  if(dlg&&(dlg.t-=dt)<=0)dlg=null;
  pops.forEach(p=>{p.t-=dt;p.y-=30*dt}); pops=pops.filter(p=>p.t>0);
  shake=Math.max(0,shake-dt); flash=Math.max(0,flash-dt*1.5); if(banner&&(banner.t-=dt)<=0)banner=null;
  enemies.forEach(e=>{if(e.dead)return;e.x+=e.dir*60*dt;if(e.x<e.a)e.dir=1;if(e.x>e.b)e.dir=-1});

  if(P.dead){
    P.deadT+=dt;
    if(P.deadT>.7){ if(!P.kicked){P.kicked=true;P.vy=-480} P.vy+=1400*dt;P.y+=P.vy*dt }
    if(P.deadT>2.5)afterDeath();
    return;
  }
  // movimento
  const run=keys.ShiftLeft||keys.ShiftRight;
  const dir=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0);
  const alvo=dir*(run?CORRER:ANDAR);
  P.vx+=(alvo-P.vx)*Math.min(1,dt*(P.ground?14:8));
  if(dir)P.face=dir;
  P.vy=Math.min(P.vy+GRAV*dt,900);
  P.coy=P.ground?.1:P.coy-dt; P.buf-=dt; P.inv-=dt;
  if(P.buf>0&&P.coy>0){P.vy=-PULO;P.buf=0;P.coy=0;beep(520,.08)}
  if(P.onMP)P.x+=mp.dx;
  const ss=[...S,mp];
  P.x+=P.vx*dt;
  for(const s of ss)if(hit(P,s)){if(P.vx>0)P.x=s.x-P.w;else if(P.vx<0)P.x=s.x+s.w;P.vx=0}
  P.y+=P.vy*dt;P.ground=false;P.onMP=false;
  for(const s of ss)if(hit(P,s)){
    if(P.vy>0){P.y=s.y-P.h;P.ground=true;if(s===mp)P.onMP=true}else P.y=s.y+s.h;
    P.vy=0;
  }
  if(P.x<0)P.x=0;
  if(P.y>H+40)die('lava');

  // almas coletáveis
  coinsL.forEach(k=>{if(!k.got&&Math.hypot(k.x-(P.x+13),k.y-(P.y+22))<26){
    k.got=true;score+=10;coinCount++;pop(k.x,k.y,'+10');beep(880,.06,'triangle')}});
  // espetos, fogo
  spikes.forEach(s=>{if(hit(P,{x:s[0]+4,y:s[1]-14,w:s[2]-8,h:14}))die('spike')});
  jets.forEach(j=>{if(jetPhase(j)===2&&hit(P,{x:j.x-12,y:j.y-110,w:24,h:110}))die('fire')});
  // inimigos (pise neles!)
  enemies.forEach(e=>{
    if(e.dead)return;
    const r={x:e.x,y:e.y-28,w:30,h:28};
    if(hit(P,r)){
      if(P.vy>0&&P.y+P.h<r.y+18){e.dead=true;P.vy=-430;score+=50;pop(e.x,e.y-30,'+50 PISÃO!','#fff');beep(200,.15)}
      else die('enemy');
    }
  });
  // assustado?
  P.scared=enemies.some(e=>!e.dead&&Math.abs(e.x-P.x)<110&&Math.abs(e.y-P.y-44)<40)
    ||pines.some(p=>!p.fall&&Math.abs(p.x-P.x-13)<110)
    ||jets.some(j=>jetPhase(j)>=1&&Math.abs(j.x-P.x-13)<110&&Math.abs(j.y-P.y-44)<30);

  // checkpoints
  cps.forEach(k=>{if(!k.on&&P.x>k.x){k.on=true;cp=k;pop(k.x,k.y-80,'CHECKPOINT!','#7dff9a');beep(660,.2,'triangle')}});
  // diálogos
  talk.forEach((d,i)=>{if(!said[i]&&P.x>d[0]){said[i]=1;say(d[1],d[2])}});

  // ZONA DO ABACAXI ETERNO
  if(P.x>ZS-100&&P.x<ZE+150){
    pineT-=dt;
    if(pineT<=0){pineT=1.3-Math.min(loops,2)*.3;
      pines.push({x:Math.min(ZE+100,Math.max(ZS,P.x+Math.random()*500-120)),t:0,y:-60,fall:false,warn:.9-Math.min(loops,2)*.1})}
  }
  pines.forEach(p=>{
    p.t+=dt;
    if(p.t>p.warn){p.fall=true;p.y+=1300*dt}
    if(p.fall&&hit(P,{x:p.x-14,y:p.y-16,w:28,h:36}))die('pine');
    if(p.fall&&p.y>=402){p.gone=true;pop(p.x,390,'SPLAT!','#ffe24a')}
  });
  pines=pines.filter(p=>!p.gone);
  // o loop eterno
  if(P.x>ZE&&loops<CICLOS){
    if(loops<CICLOS-1){
      loops++;flash=1;P.x=ZS+20;P.y=GROUND-44;P.vx=0;pines=[];
      banner={txt:'CICLO '+(loops+1)+' / '+CICLOS,t:2.2};
      say('General',loops===1?'Espera… eu já passei por aquele balcão! Isso é um loop?!':'De novo?! Essa piada já deu o que tinha que dar!');
    }else{
      loops=CICLOS;flash=1;banner={txt:'PUNIÇÃO CUMPRIDA',t:2};
      say('Capataz','Ah, você aprendeu. Que fofo. Vá para a saída, estraga-prazeres.');
    }
  }
  // vitória
  if(P.x>FIM-40&&loops>=CICLOS){state='win';$('winScore').textContent=score+deaths*0+Math.max(0,lives)*100;score+=lives*100;beep(700,.4,'triangle');show('win')}
  else if(P.x>FIM-40){P.x=FIM-41;if(!said.gate){said.gate=1;say('Capataz','Portal trancado: complete a punição do bar primeiro!')}}

  // câmera
  cam+=((Math.max(0,Math.min(P.x-W*.4,FIM+200-W)))-cam)*Math.min(1,dt*6);
  // animação
  P.anim+=dt;
  P.st=P.scared&&P.ground?'scare':!P.ground?(P.vy<0?'jump':'fall'):Math.abs(P.vx)>260?'run':Math.abs(P.vx)>20?'walk':'idle';
  // HUD
  $('score').textContent=String(score).padStart(5,'0');$('coins').textContent=coinCount;
  $('lives').textContent='💀'.repeat(Math.max(0,lives));
  $('cycle').textContent=P.x>ZS-300?Math.min(loops+1,CICLOS)+'/'+CICLOS:'-';
}
function jetPhase(j){const p=(t+j.o)%2.6;return p>1.8?2:p>1.4?1:0} // 0 apagado, 1 aviso, 2 fogo

/* ---------- DESENHO: HELPERS (formas arredondadas) ---------- */
const TAU=Math.PI*2, GOLD='#e8b400';
function rr(x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function ov(x,y,rx,ry,fill,rot=0){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill()}
function lg(x0,y0,x1,y1,st){const g=c.createLinearGradient(x0,y0,x1,y1);st.forEach((s,i)=>g.addColorStop(i/(st.length-1),s));return g}
function rg(x,y,r0,r1,st){const g=c.createRadialGradient(x,y,r0,x,y,r1);st.forEach((s,i)=>g.addColorStop(i/(st.length-1),s));return g}
function limb(x0,y0,x1,y1,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke()}

/* ---------- DESENHO: PERSONAGEM ---------- */
function perna(x,a){c.save();c.translate(x,-14);c.rotate(a);limb(0,0,0,9,6.6,'#3b0c0c');limb(2.6,1,2.6,8,1.4,GOLD);
  ov(1.8,11.4,6,3.8,'#0f0f0f');ov(2.6,10,2.4,1,'#666');c.restore()}
function braco(x,a){c.save();c.translate(x,-25);c.rotate(a);limb(0,0,0,6,6.4,'#8c1414');c.translate(0,6);c.rotate(a*.15);
  limb(0,0,0,4.5,6.4,'#8c1414');limb(0,4,0,5.4,7,GOLD);ov(0,10,3.8,3.8,'#fff');ov(1,9,1.2,1.2,'#ddd');c.restore()}
function drawDict(x,y,st,tm,f,apron){
  c.save();c.translate(x,y);c.scale(f*1.05,1.05);
  let la=0,aa=0,bob=0,lean=0,sh=0;
  if(st==='walk'){la=Math.sin(tm*10)*.7;aa=-la;bob=-Math.abs(Math.sin(tm*10))*2}
  else if(st==='run'){la=Math.sin(tm*18)*1.1;aa=-la*1.2;bob=-Math.abs(Math.sin(tm*18))*3;lean=.15}
  else if(st==='jump'){la=-.9;aa=-2.4}
  else if(st==='fall'){la=.4;aa=-2.8+Math.sin(tm*30)*.3}
  else if(st==='scare'){aa=-2.6+Math.sin(tm*40)*.3;sh=Math.sin(tm*50)*1.5;la=Math.sin(tm*40)*.2}
  else if(st==='pain'){aa=-.5;sh=Math.sin(tm*60)*2.5;la=.2}
  else if(st==='dead'){aa=-1.6;la=-.5}
  else bob=Math.sin(tm*3);
  c.translate(sh,bob);c.rotate(lean);
  const skin=st==='dead'?'#cdd6a8':'#f4bb90';
  // capa esvoaçante
  const fl=(st==='run'?13:st==='walk'?5:(st==='jump'||st==='fall')?10:2)+Math.sin(tm*8)*2;
  c.fillStyle=lg(0,-28,-fl,0,['#c01818','#4a0505']);
  c.beginPath();c.moveTo(-4,-28);c.quadraticCurveTo(-8-fl*.5,-14,-9-fl,-3+Math.sin(tm*9)*2);
  c.quadraticCurveTo(-5-fl*.3,-6,-1,-4);c.quadraticCurveTo(2,-16,5,-28);c.closePath();c.fill();
  c.strokeStyle=GOLD;c.lineWidth=1.2;c.stroke();
  braco(-10,-aa);perna(-4,la);perna(4,-la);
  // torso
  c.fillStyle=lg(-11,-29,11,-10,['#c42020','#7a1010','#4d0808']);rr(-11.5,-29,23,19,7);c.fill();
  ov(0,-10.5,11.5,3.4,'#4d0808');
  c.fillStyle=lg(0,-16,0,-12,['#ffe27a',GOLD,'#a87800']);rr(-12,-15.5,24,4,2);c.fill();
  ov(0,-13.5,3,3,'#ffe27a');ov(0,-13.5,1.4,1.4,'#8a1c1c');
  limb(-10,-27,8,-15,2.4,'rgba(232,180,0,.85)');                    // faixa dourada
  [[-3.5,-25],[-3.5,-20.5],[3.5,-25],[3.5,-20.5]].forEach(b=>{ov(b[0],b[1],1.3,1.3,GOLD)});
  [['#e33',-8],['#2fbf4a',-5]].forEach(m=>{ov(6.4+(m[1]+8)*.6,-24.4,0,0,'#000');});
  ov(7,-24,2.4,2.4,GOLD);ov(7,-24,1.2,1.2,'#e33');ov(7,-19.5,2,2,'#fff');ov(7,-19.5,1,1,'#2a6bd6');
  rr(5.8,-29,2.4,3,1);c.fillStyle='#2a6bd6';c.fill();
  if(apron){c.fillStyle=lg(0,-21,0,-3,['#ffa6d6','#ff6ab4']);rr(-9.5,-21,19,18,7);c.fill();
    ov(0,-10,4,3.2,'#ff4ea0');for(let i=-8;i<=8;i+=3.4)ov(i,-3.8,2.1,1.9,'#fff');
    ov(-3.5,-21,3.2,2,'#fff');ov(3.5,-21,3.2,2,'#fff')}
  braco(10,aa);
  [-1,1].forEach(s=>{ov(s*11.5,-27.5,4.6,2.4,GOLD);for(let i=0;i<3;i++)ov(s*(9.5+i*2.2),-25.3,.95,.95,'#ffe27a')});
  // cabeça
  ov(-9.5,-35,2.3,3.2,skin);ov(9.5,-35,2.3,3.2,skin);
  c.fillStyle=rg(-2,-38,1,12,[skin,skin,'#e3a078']);c.beginPath();c.ellipse(0,-35,9.6,10,0,0,TAU);c.fill();
  ov(0,-28.5,7.4,5,skin);ov(2.6,-32.6,2.7,2.3,'#e7a07a');
  ov(-6.5,-30.5,2.2,1.4,'rgba(255,90,90,.35)');ov(7,-30.5,2.2,1.4,'rgba(255,90,90,.35)');
  if(st==='pain'){ov(0,-35,9,9.5,'rgba(255,40,40,.25)')}
  c.lineCap='round';
  if(st==='scare'){
    [-3.6,4.2].forEach(ex=>{ov(ex,-35.5,3.7,4,'#fff');ov(ex+.3,-35.5,1.2,1.2,'#222')});
    c.strokeStyle='#1a0d06';c.lineWidth=2;c.beginPath();c.moveTo(-7,-41);c.quadraticCurveTo(-4,-43,-1,-41);c.moveTo(8,-41);c.quadraticCurveTo(5,-43,2,-41);c.stroke();
    ov(1,-27,2.8,3.6,'#3a0505');ov(1,-25.8,1.7,1.4,'#e0607a');
    ov(-10,-44,1.3,2,'#6cf');ov(11,-40,1.1,1.8,'#6cf');
  }else if(st==='pain'||st==='dead'){
    c.strokeStyle='#1a0d06';c.lineWidth=1.8;
    [-3.6,4.2].forEach(ex=>{c.beginPath();
      if(st==='dead'){c.moveTo(ex-2,-37.5);c.lineTo(ex+2,-33.5);c.moveTo(ex+2,-37.5);c.lineTo(ex-2,-33.5)}
      else{c.moveTo(ex-2.4,-37.5);c.quadraticCurveTo(ex+1,-36,ex+2.4,-35.5);c.quadraticCurveTo(ex+1,-35,ex-2.4,-33.5)}
      c.stroke()});
    if(st==='pain'){rr(-3.5,-29,8,3.6,1.6);c.fillStyle='#fff';c.fill();c.strokeStyle='#600';c.lineWidth=1;c.stroke();
      ov(-8,-31,1.2,2.6,'#6cf');ov(10,-31,1.2,2.6,'#6cf')}
    else{ov(1,-26,2.2,3,'#f0708a')}
  }else{
    [-3.6,4.2].forEach(ex=>{ov(ex,-35.5,2.8,2.4,'#fff');ov(ex+1,-35.3,1.25,1.35,'#222');ov(ex,-36.8,3,1.5,skin)});
    c.strokeStyle='#1a0d06';c.lineWidth=2.3;c.beginPath();c.moveTo(-7.2,-39.3);c.quadraticCurveTo(-4,-39,-1.2,-37.6);
    c.moveTo(8.6,-39.3);c.quadraticCurveTo(5.6,-39,2,-37.6);c.stroke();
    c.strokeStyle=GOLD;c.lineWidth=1;c.beginPath();c.arc(4.2,-35.5,4.4,0,TAU);c.stroke();       // monóculo
    c.lineWidth=.7;c.beginPath();c.moveTo(8.4,-34);c.quadraticCurveTo(12,-28,9.5,-21);c.stroke();
    c.strokeStyle='#7a3a22';c.lineWidth=1.4;c.beginPath();c.moveTo(-2.5,-26.8);c.quadraticCurveTo(2,-25.2,5.5,-28.6);c.stroke();
  }
  // bigodão de guidão
  c.strokeStyle='#14080a';c.lineWidth=3.6;
  [1,-1].forEach(s=>{c.beginPath();c.moveTo(0,-31);c.bezierCurveTo(s*4,-28.2,s*9,-28.2,s*12,-31);
    c.bezierCurveTo(s*14.6,-33.6,s*13.2,-36.4,s*10.9,-35.2);c.stroke()});
  ov(0,-31.2,2.8,1.6,'#14080a');
  // quepe
  c.fillStyle=lg(-11,-55,11,-42,['#8a1414','#4a0808']);
  c.beginPath();c.moveTo(-10.8,-43);c.bezierCurveTo(-12.5,-54,-4,-56,0,-56);c.bezierCurveTo(4,-56,12.5,-54,10.8,-43);c.closePath();c.fill();
  c.fillStyle=lg(0,-46,0,-42,['#ffe27a',GOLD,'#a87800']);rr(-11.3,-45.6,22.6,4.4,2.2);c.fill();
  ov(5.5,-41.2,10.5,2.6,'#141414');ov(7,-42,5,.8,'rgba(255,255,255,.3)');
  ov(0,-50.5,3.5,3.5,GOLD);ov(0,-50.5,1.8,1.8,'#c00');
  c.strokeStyle=GOLD;c.lineWidth=1.1;c.beginPath();c.arc(0,-43,8.5,Math.PI*1.12,Math.PI*1.88);c.stroke();
  c.restore();
}

/* ---------- DESENHO: ABACAXI, DIABINHO, ALMA ---------- */
function drawPine(x,y,s=1){
  c.save();c.translate(x,y);c.scale(s,s);
  [-9,-4.5,0,4.5,9].forEach((d,i)=>{c.fillStyle=lg(0,-12,0,-34,['#1f7a2a','#52c24a']);
    c.beginPath();c.moveTo(d*.4-3.5,-11);c.quadraticCurveTo(d*1.9,-22,d*2.1+(i-2)*1.5,-28-(i%2?5:0));c.quadraticCurveTo(d*.9+3,-20,d*.4+3.5,-11);c.fill()});
  c.fillStyle=rg(-4,-5,2,22,['#ffe86a','#f5ad00','#b86800']);c.beginPath();c.ellipse(0,2,13.5,17.5,0,0,TAU);c.fill();
  c.save();c.beginPath();c.ellipse(0,2,13.5,17.5,0,0,TAU);c.clip();c.strokeStyle='rgba(120,60,0,.55)';c.lineWidth=1;c.beginPath();
  for(let i=-18;i<=18;i+=8){c.moveTo(i,-16);c.quadraticCurveTo(i+5,2,i+14,20);c.moveTo(i,20);c.quadraticCurveTo(i+5,2,i+14,-16)}
  c.stroke();c.restore();
  ov(-5,-6,2.4,4.4,'rgba(255,255,255,.45)',.4);
  ov(-4.5,-1,2.3,2.6,'#fff');ov(4.5,-1,2.3,2.6,'#fff');ov(-4,-.6,1.1,1.3,'#111');ov(5,-.6,1.1,1.3,'#111');
  c.strokeStyle='#4a2200';c.lineWidth=1.3;c.lineCap='round';c.beginPath();c.moveTo(-8,-4.5);c.lineTo(-2.5,-2.5);c.moveTo(8,-4.5);c.lineTo(2.5,-2.5);
  c.moveTo(-5,7);c.quadraticCurveTo(0,12,5,7);c.stroke();
  c.restore();
}
const PAL=[['#ff5a2a','#a81800','#ffb089'],['#d42a62','#6a0a2a','#ff9bb0'],['#8a3ae6','#3a0f7a','#d2a8ff']];
function drawImp(x,y,tm,big,dir=1,seed=0){
  const s=big?1.6:1,p=PAL[big?0:Math.abs(Math.floor(seed))%3],fl=Math.sin(tm*10),sq=Math.sin(tm*6);
  c.save();c.translate(x,y);c.scale(s*dir,s);
  // asas de morcego
  [1,-1].forEach(k=>{c.fillStyle='rgba(70,6,20,.92)';c.beginPath();c.moveTo(k*6,-22);
    c.quadraticCurveTo(k*(20+fl*3),-42-fl*5,k*30,-28-fl*6);c.quadraticCurveTo(k*24,-27,k*25,-19);
    c.quadraticCurveTo(k*18,-21,k*17,-12);c.quadraticCurveTo(k*11,-15,k*6,-11);c.closePath();c.fill();
    c.strokeStyle='#2a0410';c.lineWidth=1.2;c.beginPath();c.moveTo(k*6,-22);c.quadraticCurveTo(k*18,-26,k*25,-19);c.moveTo(k*6,-22);c.quadraticCurveTo(k*14,-20,k*17,-12);c.stroke()});
  // cauda com ponta
  c.strokeStyle=p[1];c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(-10,-7);c.bezierCurveTo(-26,-4,-24,-22+sq*3,-31,-20+sq*3);c.stroke();
  ov(-32,-20+sq*3,4.4,2.8,p[0],-.6);
  // pés e corpo
  ov(-5,-1.5,5.2,3.2,p[1]);ov(5,-1.5,5.2,3.2,p[1]);
  c.fillStyle=rg(-4,-18,2,18,[p[0],p[0],p[1]]);c.beginPath();c.ellipse(0,-13,12.5,12.5-sq*.6,0,0,TAU);c.fill();
  ov(0,-11,7.5,8.5,p[2]);
  if(big){ov(0,-9,8.5,9.5,'#1c1c1c');[-3,2,7].forEach(b=>ov(0,-14+b*1.3,1.2,1.2,GOLD))}
  // braços, garras e tridente
  limb(-10,-16,-16,-8+fl,4,p[0]);ov(-16.5,-7+fl,3.2,3.2,p[1]);
  limb(10,-16,15,-12,4,p[0]);ov(15.5,-11,3.2,3.2,p[1]);
  limb(16,-2,16,-38,2,'#555');c.strokeStyle='#888';c.lineWidth=1.8;c.beginPath();
  c.moveTo(11,-44);c.quadraticCurveTo(11,-36,16,-36);c.quadraticCurveTo(21,-36,21,-44);c.moveTo(16,-36);c.lineTo(16,-46);c.stroke();
  // cabeça: chifres, orelhas, rosto
  [1,-1].forEach(k=>{c.fillStyle=lg(k*4,-33,k*13,-49,['#a89878','#f6ead2']);c.beginPath();c.moveTo(k*4,-33);
    c.bezierCurveTo(k*6,-43,k*12,-42,k*13,-50);c.bezierCurveTo(k*17,-42,k*12,-35,k*9,-32);c.closePath();c.fill();
    c.fillStyle=p[0];c.beginPath();c.moveTo(k*9,-30);c.quadraticCurveTo(k*20,-34,k*19,-40);c.quadraticCurveTo(k*14,-32,k*9,-24);c.fill()});
  c.fillStyle=rg(-3,-30,2,14,[p[0],p[0],p[1]]);c.beginPath();c.ellipse(0,-26,10.8,9.6,0,0,TAU);c.fill();
  [-4.6,4.6].forEach(ex=>{ov(ex,-27.5,3.5,4,'#fff176');ov(ex+.7,-27.5,1,3,'#111')});
  c.strokeStyle='#220';c.lineWidth=2;c.beginPath();c.moveTo(-8.5,-33);c.quadraticCurveTo(-5,-32,-1.5,-30);c.moveTo(8.5,-33);c.quadraticCurveTo(5,-32,1.5,-30);c.stroke();
  ov(-1.4,-23.8,.8,.6,'#300');ov(1.4,-23.8,.8,.6,'#300');
  c.strokeStyle='#300';c.lineWidth=1.6;c.beginPath();c.moveTo(-6,-21);c.quadraticCurveTo(0,-16.5,6,-21);c.stroke();
  c.fillStyle='#fff';[-4,4].forEach(fx=>{c.beginPath();c.moveTo(fx-1.4,-19.8);c.quadraticCurveTo(fx,-14.5,fx+1.4,-19.8);c.fill()});
  if(big){ov(-4,-17.5,0,0,'#000');ov(-5,-17,3.2,2.4,'#222');ov(5,-17,3.2,2.4,'#222');ov(0,-17,1.4,1.4,'#222')} // gravata-borboleta
  c.restore();
}
function drawSoul(x,y,tm){
  c.save();c.translate(x,y+Math.sin(tm*2+x)*4);c.rotate(Math.sin(tm*1.5+x)*.06);
  c.fillStyle=rg(0,-18,2,28,['rgba(220,240,255,.4)','rgba(220,240,255,0)']);c.fillRect(-32,-48,64,64);
  c.globalAlpha=.85;c.fillStyle=lg(0,-36,0,0,['#fff','#9fc2ff']);
  c.beginPath();c.moveTo(-12,-8);c.bezierCurveTo(-16,-42,16,-42,12,-8);
  c.quadraticCurveTo(8,2+Math.sin(tm*4)*2,4,-5);c.quadraticCurveTo(0,4+Math.sin(tm*4+2)*2,-4,-5);
  c.quadraticCurveTo(-8,2+Math.sin(tm*4+4)*2,-12,-8);c.fill();
  ov(-14,-17,2.6,5,'#cfe0ff',.5);ov(14,-17,2.6,5,'#cfe0ff',-.5);
  ov(-4.2,-24,2.2,3,'#223');ov(4.2,-24,2.2,3,'#223');ov(0,-16,2,2.6,'#223');ov(-6,-19,1,1.8,'#6cf');
  c.restore();
}

/* ---------- DESENHO: CENÁRIO ---------- */
function drawBG(){
  c.fillStyle=lg(0,0,0,H,['#0b0202','#3a0e06','#a02a0a']);c.fillRect(0,0,W,H);
  c.fillStyle=rg(W/2,H,10,520,['rgba(255,120,30,.45)','rgba(255,120,30,0)']);c.fillRect(0,0,W,H);
  // colinas suaves em duas camadas
  [[.2,'#3a120b',130,.005],[.4,'#240a07',90,.008]].forEach(l=>{c.fillStyle=l[1];c.beginPath();c.moveTo(0,H);
    for(let x=0;x<=W;x+=16)c.lineTo(x,H-l[2]-Math.sin((x+cam*l[0])*l[3])*38-Math.sin((x+cam*l[0])*l[3]*2.7)*14);c.lineTo(W,H);c.fill()});
  // estalactites curvas
  [[.3,'#2a0d09',.8],[.5,'#1b0907',1]].forEach(l=>{c.fillStyle=l[1];
    for(let i=0;i<30;i++){const x=i*140-(cam*l[0])%140-140+((i*37)%60),h=(50+(i*53)%110)*l[2];
      c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+22,h*.45,x+34,h);c.quadraticCurveTo(x+42,h*.45,x+68,0);c.fill()}});
  for(let i=0;i<14;i++){const wx=i*500+120,sx=wx-cam*.6;if(sx>-40&&sx<W+40)drawSoul(sx,150+(i*47)%120,t+i)}
  // brasas subindo
  for(let i=0;i<36;i++){const bx=((i*97)%W-cam*.5%W+W*2)%W,by=H-((t*30+i*61)%H);
    c.globalAlpha=.7;ov(bx+Math.sin(t+i)*8,by,1.6+(i%3)*.5,1.6+(i%3)*.5,'#ffb04a')}
  c.globalAlpha=1;
}
function drawLava(){
  c.fillStyle=lg(0,H-70,0,H,['#ffb02a','#ff6a1a','#c21f00']);c.beginPath();c.moveTo(0,H);
  for(let x=0;x<=W;x+=12)c.lineTo(x,H-38+Math.sin((x+cam)*.03+t*2)*6+Math.sin((x+cam)*.07-t*3)*2);
  c.lineTo(W,H);c.fill();
  for(let i=0;i<8;i++){const bx=(i*131+cam*.2)%W,k=(t*.6+i*.37)%1;c.globalAlpha=1-k;
    c.strokeStyle='#ffe27a';c.lineWidth=1.6;c.beginPath();c.arc(bx,H-14-k*26,3+k*5,0,TAU);c.stroke()}
  c.globalAlpha=1;
}
function rocha(x,y,w,i){
  c.fillStyle=lg(0,y,0,y+90,['#85472a','#4f2719','#2a120b']);
  c.beginPath();c.moveTo(x,y+90);c.lineTo(x,y+18);c.quadraticCurveTo(x,y,x+18,y);c.lineTo(x+w-18,y);c.quadraticCurveTo(x+w,y,x+w,y+18);c.lineTo(x+w,y+90);c.closePath();c.fill();
  for(let k=0;k<w/46;k++){const sx=x+20+k*46+((k*31+i*17)%14),sy=y+26+((k*23)%30);ov(sx,sy,15,10,'rgba(20,6,3,.28)');ov(sx-3,sy-3,7,4,'rgba(255,140,60,.12)')}
  c.fillStyle=lg(0,y-3,0,y+9,['#a85a32','#7a3a20']);rr(x-3,y-3,w+6,12,6);c.fill();
  c.strokeStyle='rgba(255,106,26,.85)';c.lineWidth=2;c.lineCap='round';
  for(let k=0;k<w/70;k++){const cx=x+30+k*70+((k*13)%20);c.beginPath();c.moveTo(cx,y+12);c.quadraticCurveTo(cx-10,y+32,cx+2,y+48);c.quadraticCurveTo(cx+12,y+60,cx+4,y+72);c.stroke()}
  for(let k=0;k<w/90;k++){const dx=x+20+k*90+((k*29)%30),dl=(t*.5+k*.3+i)%1;c.globalAlpha=1-dl;ov(dx,y+8+dl*20,2,2+dl*2,'#ff9a1a')}
  c.globalAlpha=1;
}
function drawWorld(){
  c.lineCap='round';
  for(let i=0;i<40;i++){const x=i*150+(i*37)%50,len=60+(i*53)%120;
    for(let y=0;y<len;y+=12){c.strokeStyle=y%24?'#7b6f68':'#5a5049';c.lineWidth=2.6;c.beginPath();
      c.ellipse(x+Math.sin(t+i)*(y*.03),y+6,y%24?2.2:3.4,6,0,0,TAU);c.stroke()}
    ov(x+Math.sin(t+i)*(len*.03),len+8,6,6,'#555')}
  plats.forEach((p,i)=>rocha(p[0],p[1],p[2],i));
  // chão xadrez do bar (azulejos arredondados) + placa pendurada
  for(let x=ZS;x<5360;x+=40){c.fillStyle=(x/40)%2?'#ecd2a8':'#8a2e16';rr(x+1,GROUND-4,38,9,4);c.fill()}
  limb(ZS-20,0,ZS-20,GROUND-112,2,'#555');limb(ZS+270,0,ZS+270,GROUND-112,2,'#555');
  c.fillStyle=lg(0,GROUND-112,0,GROUND-84,['#6b3a1c','#3a1608']);rr(ZS-40,GROUND-112,330,28,10);c.fill();
  c.strokeStyle=GOLD;c.lineWidth=2;c.stroke();c.fillStyle='#ffd24a';c.font='18px Impact';c.fillText('BAR DO ABACAXI ETERNO',ZS-14,GROUND-92);
  drawPine(ZS+256,GROUND-98,.5);
  c.fillStyle=lg(0,GROUND-38,0,GROUND,['#7a3a1c','#4a200e']);rr(ZS+55,GROUND-38,130,38,8);c.fill();
  rr(ZS+50,GROUND-42,140,8,4);c.fillStyle='#c46a2a';c.fill();
  ov(ZS+80,GROUND-50,5,6,'#e8f3ff');ov(ZS+80,GROUND-52,3,2,'#ffb04a');drawPine(ZS+150,GROUND-58,.42);
  // plataforma móvel de pedra
  c.fillStyle=lg(0,mp.y,0,mp.y+mp.h,['#a89c92','#5f554e']);rr(mp.x,mp.y,mp.w,mp.h,9);c.fill();
  [12,mp.w-12].forEach(rx=>ov(mp.x+rx,mp.y+10,2.6,2.6,'#3a332e'));ov(mp.x+mp.w/2,mp.y+mp.h+4,22,5,'rgba(255,140,30,.35)');
  // espetos: presas/ossos curvos
  spikes.forEach(s=>{for(let x=s[0];x<s[0]+s[2];x+=12){c.fillStyle=lg(x,s[1],x+8,s[1]-17,['#c8bba6','#fff']);
    c.beginPath();c.moveTo(x,s[1]);c.quadraticCurveTo(x+1,s[1]-10,x+8,s[1]-17);c.quadraticCurveTo(x+9,s[1]-7,x+12,s[1]);c.closePath();c.fill()}
    ov(s[0]+s[2]/2,s[1],s[2]/2+3,3.2,'#4a2418')});
  // jatos de fogo em chamas arredondadas
  jets.forEach(j=>{rr(j.x-13,j.y-8,26,8,4);c.fillStyle='#3a3a3a';c.fill();ov(j.x,j.y-8,8,2.5,'#111');const ph=jetPhase(j);
    if(ph===1)for(let i=0;i<4;i++){c.globalAlpha=.8;ov(j.x+Math.sin(t*20+i)*5,j.y-12-((t*40+i*9)%22),2.2,2.2,'#ffb04a')}
    if(ph===2)for(let i=0;i<9;i++){const k=i/8,r=13-k*8;c.globalAlpha=1-k*.55;
      ov(j.x+Math.sin(t*14+i)*(2+k*4),j.y-12-i*12.5,r,r*1.15,k<.3?'#fff2a0':k<.65?'#ffa51a':'#e0401a')}
    c.globalAlpha=1});
  // checkpoints
  cps.forEach(k=>{limb(k.x,k.y,k.x,k.y-72,3.4,'#ddd');ov(k.x,k.y-73,3.4,3.4,GOLD);
    c.fillStyle=k.on?'#38d96a':'#9a1c1c';c.beginPath();c.moveTo(k.x+2,k.y-70);
    for(let i=0;i<=8;i++)c.lineTo(k.x+2+i*4,k.y-70+Math.sin(t*5+i*.8)*2);
    for(let i=8;i>=0;i--)c.lineTo(k.x+2+i*4,k.y-52+Math.sin(t*5+i*.8)*2);c.fill();
    ov(k.x+17,k.y-62,4.4,4.2,'#fff');ov(k.x+15.6,k.y-62.4,1.1,1.3,'#222');ov(k.x+18.4,k.y-62.4,1.1,1.3,'#222')});
  // portal em redemoinho
  const ok=loops>=CICLOS;ov(FIM,GROUND-50,40,62,ok?'rgba(255,140,30,.25)':'rgba(60,60,60,.3)');
  for(let i=0;i<4;i++){c.strokeStyle=ok?(i%2?'#fff':'#ff9a1a'):(i%2?'#777':'#333');c.lineWidth=3;c.beginPath();
    c.ellipse(FIM,GROUND-50,34-i*7,56-i*11,t*(i%2?1:-1)*.8,0.3,TAU-.5);c.stroke()}
  ov(FIM,GROUND-50,8,12,ok?'#fff':'#555');
  c.fillStyle='#ffd24a';c.font='14px Impact';c.fillText(ok?'SAÍDA':'TRANCADO',FIM-28,GROUND-122);
  npcs.forEach((n,i)=>{if(n.k==='soul')drawSoul(n.x,n.y,t);else drawImp(n.x,n.y,t,n.k==='boss',-1,i)});
  // almas: orbes brilhantes giratórios
  coinsL.forEach(k=>{if(k.got)return;const w=Math.abs(Math.cos(t*4+k.x));
    c.fillStyle=rg(k.x,k.y,1,20,['rgba(255,200,60,.5)','rgba(255,200,60,0)']);c.fillRect(k.x-20,k.y-20,40,40);
    c.fillStyle=rg(k.x-2,k.y-2,1,10,['#fff3a0','#ffb000','#b86e00']);c.beginPath();c.ellipse(k.x,k.y,9*w+2,9,0,0,TAU);c.fill();
    c.strokeStyle='#8a5a00';c.lineWidth=1;c.stroke();ov(k.x-2,k.y-3,1.6*w+.5,2.4,'rgba(255,255,255,.7)')});
  enemies.forEach(e=>{if(!e.dead)drawImp(e.x+15,e.y,t+e.x,false,e.dir,e.x/100)});
  pines.forEach(p=>{
    const w=Math.min(1,p.t/p.warn);c.fillStyle='rgba(0,0,0,.55)';
    c.beginPath();c.ellipse(p.x,GROUND+3,10+w*18,4+w*3,0,0,TAU);c.fill();
    if(p.fall)drawPine(p.x,p.y);
    else{c.fillStyle='#ff3b1a';c.font='20px Impact';c.fillText('!',p.x-3,GROUND-30-Math.sin(t*20)*3)}});
}
function drawPlayer(){
  const px=P.x+13,py=P.y+44;
  if(!P.dead){
    if(P.inv>0&&Math.floor(t*14)%2)return;
    drawDict(px,py,P.st,P.anim,P.face,P.x>ZS-60&&P.x<ZE+300);
    return;
  }
  if(P.deadT<.7){ // castigo: o abacaxi cai na cabeça
    const k=Math.min(1,P.deadT/.35),ay=py-260+k*215;
    drawDict(px,py,P.deadT<.35?'scare':'pain',P.deadT,P.face,false);
    drawPine(px,ay,1.4);
    if(P.deadT>.35){c.fillStyle='#ffe24a';c.font='28px Impact';c.fillText('BONK!',px+12,py-50-(P.deadT-.35)*40)}
  }else{
    c.save();c.translate(px,P.y+22);c.rotate((P.deadT-.7)*6);c.translate(-px,-(P.y+22));
    drawDict(px,py,'dead',P.deadT,P.face,false);c.restore();
    c.strokeStyle='#ffe24a';c.lineWidth=3;c.beginPath();c.ellipse(px,P.y-20-(P.deadT-.7)*20,10,3,0,0,7);c.stroke(); // auréola
  }
}
function draw(){
  drawBG();drawLava();
  c.save();
  c.translate(-Math.round(cam)+(shake?(Math.random()-.5)*shake*20:0),0);
  drawWorld();if(P)drawPlayer();
  pops.forEach(p=>{c.globalAlpha=Math.min(1,p.t*2);c.fillStyle=p.col;c.font='16px Impact';c.fillText(p.txt,p.x-14,p.y)});
  c.globalAlpha=1;c.restore();
  if(flash>0){c.fillStyle='rgba(255,255,255,'+flash+')';c.fillRect(0,0,W,H)}
  if(banner){c.fillStyle='#ffd24a';c.strokeStyle='#000';c.lineWidth=6;c.font='64px Impact';c.textAlign='center';
    c.strokeText(banner.txt,W/2,H/2-40);c.fillText(banner.txt,W/2,H/2-40);c.textAlign='left'}
  // caixa de diálogo
  const d=$('dialog');
  if(dlg&&state==='play'){d.classList.remove('hidden');$('who').textContent=dlg.who+':';$('said').textContent=dlg.txt}
  else d.classList.add('hidden');
}

/* ---------- LOOP PRINCIPAL ---------- */
const GROUND = 420;
function loop(ms){
  const dt=Math.min(.033,(ms-last)/1000||0);last=ms;
  if(state==='play')update(dt);
  draw();requestAnimationFrame(loop);
}
initLevel();state='menu';requestAnimationFrame(loop);

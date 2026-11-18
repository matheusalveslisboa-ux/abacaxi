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

/* ---------- DESENHO: PERSONAGEM ---------- */
function perna(x,a){c.save();c.translate(x,-13);c.rotate(a);c.fillStyle='#3a0a0a';c.fillRect(-3,0,6,10);
  c.fillStyle='#0d0d0d';c.fillRect(-3,9,10,5);c.restore()}
function braco(x,a){c.save();c.translate(x,-26);c.rotate(a);c.fillStyle='#7a1010';c.fillRect(-2.5,0,5,11);
  c.fillStyle='#f1b98a';c.beginPath();c.arc(0,12,3,0,7);c.fill();c.restore()}
function drawDict(x,y,st,tm,f,apron){
  c.save();c.translate(x,y);c.scale(f,1);
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
  braco(-11,-aa);perna(-4,la);perna(4,-la);
  // torso
  c.fillStyle='#7a1010';c.fillRect(-11,-28,22,17);
  c.fillStyle='#d9a300';c.fillRect(-11,-14,22,3);c.fillRect(-12,-29,6,3);c.fillRect(6,-29,6,3);
  c.fillRect(-1,-27,2,12);
  ['#ffd24a','#2fbf4a','#e33','#ffd24a'].forEach((k,i)=>{c.fillStyle=k;c.fillRect(3+(i%2)*4,-26+(i>>1)*4,3,3)});
  if(apron){c.fillStyle='#ff8ac6';c.fillRect(-9,-22,18,22);c.fillStyle='#fff';
    for(let i=-8;i<9;i+=4)c.fillRect(i,-3,2,3)}
  braco(11,aa);
  // cabeça
  c.fillStyle='#f1b98a';c.beginPath();c.arc(0,-35,9,0,7);c.fill();
  c.fillStyle='#4a0808';c.fillRect(-10,-47,20,7);c.fillStyle='#d9a300';c.fillRect(-10,-42,20,2);
  c.fillStyle='#111';c.fillRect(-8,-41,22,3);
  c.fillStyle='#ffd24a';c.fillRect(-1.5,-45,3,3);
  // olhos / boca por estado
  c.strokeStyle='#111';c.fillStyle='#fff';c.lineWidth=1.6;
  if(st==='scare'){[-3,5].forEach(ex=>{c.beginPath();c.arc(ex,-36,3,0,7);c.fill();c.stroke();
      c.fillStyle='#111';c.fillRect(ex+.5,-37,1.6,1.6);c.fillStyle='#fff'});
    c.fillStyle='#400';c.beginPath();c.ellipse(1,-28,2.6,3.5,0,0,7);c.fill()}
  else if(st==='pain'||st==='dead'){
    [-3,5].forEach(ex=>{c.beginPath();c.moveTo(ex-2,-38);c.lineTo(ex+2,-34);c.moveTo(ex+2,-38);c.lineTo(ex-2,-34);c.stroke()});
    c.beginPath();c.moveTo(-3,-27);c.lineTo(-1,-29);c.lineTo(1,-27);c.lineTo(3,-29);c.stroke();
    if(st==='pain'){c.fillStyle='#6cf';c.fillRect(-7,-33,2,5);c.fillRect(9,-33,2,5)}}
  else{
    [-3,5].forEach(ex=>{c.fillRect(ex-2,-38,4,3);c.fillStyle='#111';c.fillRect(ex,-37,2,2);c.fillStyle='#fff'});
    c.beginPath();c.moveTo(-6,-41);c.lineTo(-1,-38.5);c.moveTo(9,-41);c.lineTo(4,-38.5);c.stroke(); // sobrancelhas bravas
    c.beginPath();c.moveTo(-2,-27);c.quadraticCurveTo(2,-26,5,-29);c.stroke();                     // sorriso arrogante
  }
  // bigodão
  c.lineWidth=3.2;c.lineCap='round';
  [1,-1].forEach(s=>{c.beginPath();c.moveTo(0,-31);c.quadraticCurveTo(s*7,-27,s*12,-34);c.stroke()});
  c.restore();
}

/* ---------- DESENHO: OUTROS ---------- */
function drawPine(x,y,s=1){
  c.save();c.translate(x,y);c.scale(s,s);
  c.fillStyle='#2f9a35';
  [-8,0,8].forEach((d,i)=>{c.beginPath();c.moveTo(d-4,-10);c.lineTo(d*1.4,-26-i%2*6);c.lineTo(d+4,-10);c.fill()});
  c.fillStyle='#f7b500';c.beginPath();c.ellipse(0,2,13,17,0,0,7);c.fill();
  c.strokeStyle='#a56a00';c.lineWidth=1;c.beginPath();
  for(let i=-12;i<=12;i+=8){c.moveTo(i,-10);c.lineTo(i+12,14);c.moveTo(i,14);c.lineTo(i+12,-10)}
  c.stroke();c.restore();
}
function drawImp(x,y,tm,big){
  const s=big?1.7:1;c.save();c.translate(x,y);c.scale(s,s);
  c.fillStyle='#d12b12';c.beginPath();c.ellipse(0,-14,14,13+Math.sin(tm*8)*.8,0,0,7);c.fill();
  c.beginPath();c.moveTo(-10,-24);c.lineTo(-14,-36);c.lineTo(-4,-26);c.moveTo(10,-24);c.lineTo(14,-36);c.lineTo(4,-26);c.fill();
  c.fillStyle='#ffe24a';c.fillRect(-8,-19,5,4);c.fillRect(3,-19,5,4);
  c.fillStyle='#111';c.fillRect(-6,-18,2,3);c.fillRect(5,-18,2,3);
  c.fillRect(-6,-9,12,2);c.strokeStyle='#111';c.lineWidth=2;c.beginPath();c.moveTo(16,0);c.lineTo(16,-30);c.stroke();
  c.beginPath();c.moveTo(12,-30);c.lineTo(12,-36);c.moveTo(16,-30);c.lineTo(16,-38);c.moveTo(20,-30);c.lineTo(20,-36);c.stroke();
  c.restore();
}
function drawSoul(x,y,tm){
  c.save();c.globalAlpha=.8;c.translate(x,y+Math.sin(tm*2+x)*4);c.fillStyle='#e8f1ff';
  c.beginPath();c.arc(0,-24,12,Math.PI,0);c.lineTo(12,-6);
  for(let i=0;i<4;i++)c.lineTo(12-i*6-3,-6+(i%2?0:6));c.lineTo(-12,-6);c.fill();
  c.fillStyle='#223';c.fillRect(-6,-26,3,5);c.fillRect(3,-26,3,5);c.fillRect(-4,-17,8,2);c.restore();
}

/* ---------- DESENHO: CENÁRIO ---------- */
function drawBG(){
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b0202');g.addColorStop(.6,'#3a0e06');g.addColorStop(1,'#a02a0a');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  // estalactites (parallax)
  c.fillStyle='#1b0907';
  for(let i=0;i<30;i++){const x=i*140-(cam*.4)%140-140+((i*37)%60),h=50+(i*53)%110;
    c.beginPath();c.moveTo(x,0);c.lineTo(x+60,0);c.lineTo(x+30,h);c.fill()}
  // montanhas de rocha
  c.fillStyle='#2a0d08';
  for(let i=0;i<10;i++){const x=i*200-(cam*.25)%200-200,h=120+(i*71)%90;
    c.beginPath();c.moveTo(x,H);c.lineTo(x+100,H-h-40);c.lineTo(x+200,H);c.fill()}
  // almas condenadas flutuando
  for(let i=0;i<14;i++){const wx=i*500+120,sx=wx-cam*.6;
    if(sx>-40&&sx<W+40)drawSoul(sx,150+(i*47)%120,t+i)}
}
function drawLava(){
  const g=c.createLinearGradient(0,H-70,0,H);g.addColorStop(0,'#ff9a1a');g.addColorStop(1,'#c21f00');
  c.fillStyle=g;c.beginPath();c.moveTo(0,H);
  for(let x=0;x<=W;x+=20)c.lineTo(x,H-38+Math.sin((x+cam)*.03+t*2)*6);
  c.lineTo(W,H);c.fill();
  c.fillStyle='#ffd24a';
  for(let i=0;i<8;i++){const bx=(i*131+cam*.2)%W,by=H-20-Math.abs(Math.sin(t*2+i))*18;c.fillRect(bx,by,4,4)}
}
function drawWorld(){
  // correntes
  c.strokeStyle='#6d625b';c.lineWidth=3;
  for(let i=0;i<40;i++){const x=i*150+(i*37)%50,len=60+(i*53)%120;
    for(let y=0;y<len;y+=12){c.beginPath();c.ellipse(x+Math.sin(t+i)*(y*.03),y+6,3,6,0,0,7);c.stroke()}}
  // plataformas de pedra
  plats.forEach(p=>{
    c.fillStyle='#4a2418';c.fillRect(p[0],p[1],p[2],90);
    c.fillStyle='#6b3820';c.fillRect(p[0],p[1],p[2],10);
    c.fillStyle='#ff6a1a';c.fillRect(p[0],p[1],p[2],3);
    c.strokeStyle='#2a120b';c.lineWidth=2;
    for(let x=p[0]+30;x<p[0]+p[2];x+=60){c.beginPath();c.moveTo(x,p[1]+10);c.lineTo(x-8,p[1]+40);c.lineTo(x+4,p[1]+70);c.stroke()}
  });
  // zona do abacaxi: chão xadrez de bar + placa
  for(let x=ZS;x<5360;x+=40){c.fillStyle=(x/40)%2?'#e8cba0':'#7a2a14';c.fillRect(x,GROUND,40,6)}
  c.fillStyle='#3a1608';c.fillRect(ZS-40,GROUND-110,330,26);c.fillStyle='#ffd24a';c.font='18px Impact';
  c.fillText('BAR DO ABACAXI ETERNO',ZS-20,GROUND-91);drawPine(ZS+260,GROUND-130,.6);
  c.fillStyle='#5a2a12';c.fillRect(ZS+60,GROUND-34,120,34);c.fillStyle='#ff6a1a';c.fillRect(ZS+60,GROUND-36,120,4);
  // plataforma móvel
  c.fillStyle='#7a7068';c.fillRect(mp.x,mp.y,mp.w,mp.h);c.fillStyle='#b5aaa0';c.fillRect(mp.x,mp.y,mp.w,4);
  // espetos
  c.fillStyle='#cfc7c0';
  spikes.forEach(s=>{for(let x=s[0];x<s[0]+s[2];x+=12){c.beginPath();c.moveTo(x,s[1]);c.lineTo(x+6,s[1]-16);c.lineTo(x+12,s[1]);c.fill()}});
  // jatos de fogo
  jets.forEach(j=>{c.fillStyle='#333';c.fillRect(j.x-12,j.y-6,24,6);const ph=jetPhase(j);
    if(ph===1){c.fillStyle='#ff8a1a';c.fillRect(j.x-3,j.y-10-Math.random()*10,6,8)}
    if(ph===2){const g=c.createLinearGradient(0,j.y,0,j.y-110);g.addColorStop(0,'#fff3a0');g.addColorStop(.4,'#ff9a1a');g.addColorStop(1,'#d12b0000');
      c.fillStyle=g;c.fillRect(j.x-12-Math.random()*3,j.y-110,24,104)}});
  // checkpoints (bandeira de caveira)
  cps.forEach(k=>{c.fillStyle='#ddd';c.fillRect(k.x,k.y-70,4,70);c.fillStyle=k.on?'#38d96a':'#8a1c1c';c.fillRect(k.x+4,k.y-70,28,20);
    c.fillStyle='#fff';c.fillText&&(c.font='14px Arial',c.fillText('☠',k.x+11,k.y-54))});
  // portal de saída
  const pg=c.createRadialGradient(FIM,GROUND-50,5,FIM,GROUND-50,60);pg.addColorStop(0,loops>=CICLOS?'#fff':'#666');pg.addColorStop(1,loops>=CICLOS?'#ff6a1a':'#222');
  c.fillStyle=pg;c.beginPath();c.ellipse(FIM,GROUND-50,34,56,0,0,7);c.fill();
  c.fillStyle='#ffd24a';c.font='14px Impact';c.fillText(loops>=CICLOS?'SAÍDA':'TRANCADO',FIM-28,GROUND-115);
  // npcs
  npcs.forEach(n=>{if(n.k==='soul')drawSoul(n.x,n.y,t);else drawImp(n.x,n.y,t,n.k==='boss')});
  // almas
  coinsL.forEach(k=>{if(k.got)return;const w=Math.abs(Math.cos(t*4+k.x));
    c.fillStyle='#ffb000';c.beginPath();c.ellipse(k.x,k.y,9*w+2,9,0,0,7);c.fill();c.fillStyle='#fff3a0';c.fillRect(k.x-1,k.y-5,2,10)});
  // inimigos
  enemies.forEach(e=>{if(!e.dead)drawImp(e.x+15,e.y,t+e.x)});
  // abacaxis: sombra de aviso + queda
  pines.forEach(p=>{
    const w=Math.min(1,p.t/p.warn);c.fillStyle='rgba(0,0,0,.55)';
    c.beginPath();c.ellipse(p.x,GROUND+3,10+w*18,4+w*3,0,0,7);c.fill();
    if(p.fall)drawPine(p.x,p.y);
    else{c.fillStyle='#ff3b1a';c.font='16px Impact';c.fillText('!',p.x-3,GROUND-30-Math.sin(t*20)*3)}});
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

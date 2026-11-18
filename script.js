'use strict';
/* =====================================================
   DIABRETE NO INFERNO ETERNO — JavaScript puro + Canvas
   ===================================================== */

/* ---------- Configurações fáceis de mexer ---------- */
const CFG = { gravidade: 0.62, velocidade: 4.4, pulo: 12.5, vidas: 3, moeda: 10, esmagar: 50, bonusVida: 100 };
const W = 960, H = 540, MUNDO = 6700, LAVA = 500;

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const keys = {};
let state = 'menu', t = 0, cam = 0, score = 0, lives = CFG.vidas, souls = 0;
let level, player, respawn, particles = [], pies = [], toastTimer = 0;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rnd = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/* ---------- Construção da fase (edite aqui para criar novas áreas) ---------- */
function buildLevel() {
  const L = { plats: [], movers: [], spikes: [], jets: [], enemies: [], coins: [], cps: [], npcs: [], signs: [] };
  const P = (x, y, w, h) => L.plats.push({ x, y, w, h: h || H - y + 60 });
  const row = (x, y, n, s = 40) => { for (let i = 0; i < n; i++) L.coins.push({ x: x + i * s, y, got: false, o: i }); };
  const imp = (x0, x1, y) => L.enemies.push({ t: 'imp', x: x0, y: y - 28, w: 28, h: 28, min: x0, max: x1, dir: 1, sp: 1.1 });
  const bat = (x0, x1, y) => L.enemies.push({ t: 'bat', x: x0, y, by: y, w: 30, h: 20, min: x0, max: x1, dir: 1, sp: 1.5, amp: 40, ph: x0 });
  const cp = (x, y) => L.cps.push({ x, y, on: false });
  const spike = (x, y, w) => L.spikes.push({ x, y, w });
  const jet = (x, y, o) => L.jets.push({ x, y, w: 36, h: 100, p: 150, o });
  const sign = (x, y, ...lines) => L.signs.push({ x, y, lines });
  const npc = (x, y, nome, cor, ...lines) => L.npcs.push({ x, y, nome, cor, lines });

  // 1) Entrada do inferno
  P(0, 440, 520); sign(120, 440, 'BEM-VINDO AO INFERNO', 'Favor não pisar na lava.');
  npc(330, 440, 'Gerente', '#4a3a3a', 'Ah, o estagiário! Atrasado de novo.', 'Atravesse o Setor 666-B e ache a saída.', 'Dica: lava é quente. Sério.');
  P(620, 390, 110, 26); P(800, 340, 110, 26); P(980, 400, 400);
  row(630, 350, 2); row(810, 300, 2); row(1000, 360, 3);
  imp(1000, 1230, 400); spike(1280, 400, 70); cp(1010, 400);
  sign(1400, 400, 'Wi-Fi grátis:', '(só 2G e sem senha)');

  // 2) Rio de lava, jatos de fogo e morcegos
  P(1460, 430, 90, 26); P(1620, 390, 90, 26);
  L.movers.push({ bx: 1850, by: 350, x: 1850, y: 350, w: 100, h: 22, ax: 110, ay: 0, sp: .03, ph: 0, dx: 0, dy: 0 });
  P(2060, 380, 110, 26); P(2240, 420, 400);
  row(1470, 390, 2); row(1630, 350, 2); row(1800, 300, 5, 45); row(2070, 340, 2);
  bat(1500, 2000, 280);
  cp(2250, 420); jet(2340, 420, 0); jet(2440, 420, 50); jet(2540, 420, 100);
  row(2330, 340, 6, 45);

  // 3) Precisão e timing
  [[2740, 400, 70], [2890, 350, 50], [3030, 310, 50], [3170, 360, 50]].forEach(a => P(a[0], a[1], a[2]));
  row(2750, 360, 1); row(2895, 310, 1); row(3035, 270, 1); row(3175, 320, 1);
  P(3300, 400, 300); spike(3380, 400, 56); spike(3480, 400, 56);
  row(3380, 330, 1); row(3485, 330, 1);
  L.movers.push({ bx: 3650, by: 350, x: 3650, y: 350, w: 90, h: 22, ax: 0, ay: 60, sp: .035, ph: 0, dx: 0, dy: 0 });

  // 4) Setor 666-B: a piada do ditador condenado
  P(3800, 420, 1360); cp(3830, 420);
  sign(3910, 420, 'SETOR 666-B →', 'Punições Criativas');
  npc(4060, 420, 'Fiscal de Abacaxis', '#5b3a1a', 'Sentença: um abacaxi na cabeça a cada 1,5 s.', 'Duração: eternidade. Sem direito a bis.', 'Ele pediu sorvete. Negado. Só abacaxi.');
  npc(4780, 420, 'Estagiário', '#3a4a5a', 'Cuidado com os abacaxis voadores!', 'Pule! Abacaxi na cabeça não é moda.');
  P(4800, 330, 110, 24); row(4810, 290, 3);
  row(4720, 380, 2, 60); bat(4750, 5100, 270);

  // 5) Subida final
  P(5260, 400, 100, 26); P(5430, 350, 100, 26); P(5600, 300, 100, 26); P(5780, 350, 100, 26);
  row(5270, 360, 2); row(5440, 310, 2); row(5610, 260, 2); row(5790, 310, 2);
  bat(5250, 5700, 250);
  P(5960, 400, 740); cp(5980, 400); jet(6080, 400, 20); jet(6200, 400, 90);
  imp(6290, 6480, 400); row(6000, 350, 3);
  npc(6400, 400, 'Porteiro', '#222', 'Saída pela direita. Obrigado por', 'sofrer conosco. Volte nunca!');
  L.exit = { x: 6580, y: 310, w: 60, h: 90 };
  L.solids = L.plats.concat(L.movers);
  return L;
}

function newPlayer() {
  return { x: respawn.x, y: respawn.y - 36, w: 24, h: 36, vx: 0, vy: 0, dir: 1, ground: false, coyote: 0, buf: 0, anim: 0, dead: 0, inv: 0, rot: 0, ride: null };
}

/* ---------- Estados do jogo ---------- */
function show(id, v) { $(id).classList.toggle('hidden', !v); }
function startGame() {
  score = 0; lives = CFG.vidas; souls = 0; t = 0; cam = 0; particles = []; pies = [];
  level = buildLevel(); respawn = { x: 80, y: 440 }; player = newPlayer();
  state = 'playing'; show('menu', 0); show('pause', 0); show('end', 0); show('hud', 1);
  updateHUD(); toast('Use as setas ou A/D para andar e Espaço para pular.', 240);
}
function goMenu() { state = 'menu'; show('end', 0); show('pause', 0); show('hud', 0); show('menu', 1); level = buildLevel(); respawn = { x: 80, y: 440 }; player = newPlayer(); }
function togglePause() {
  if (state === 'playing') { state = 'paused'; show('pause', 1); }
  else if (state === 'paused') { state = 'playing'; show('pause', 0); }
}
function endGame(win) {
  state = win ? 'win' : 'lose';
  if (win) score += lives * CFG.bonusVida;
  $('endTitle').textContent = win ? 'Você escapou!' : 'Fim de jogo';
  $('endText').textContent = win
    ? 'Você saiu do Setor 666-B. Lá atrás, o ditador continua levando abacaxis. Eternamente. Ele já nem reclama (muito).'
    : 'Você agora faz parte da Fila do SAC Infernal. Tempo estimado de espera: 2.347 anos.';
  $('endScore').textContent = 'Pontos: ' + score + '  ·  Almas: ' + souls + '/' + level.coins.length;
  show('end', 1);
}
function updateHUD() {
  $('lives').textContent = '😈 ' + '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, CFG.vidas - lives));
  $('score').textContent = 'Pontos: ' + score;
  $('souls').textContent = '👻 ' + souls + '/' + (level ? level.coins.length : 0);
}
function toast(txt, frames = 150) {
  const el = $('toast'); el.textContent = txt; el.classList.add('show'); toastTimer = frames;
}

/* ---------- Partículas ---------- */
function burst(x, y, cor, n = 10) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * 6, vy: -Math.random() * 5 - 1, l: 30 + Math.random() * 20, c: cor });
}

/* ---------- Morte ---------- */
const piadasMorte = ['Morreu? Você já está no inferno. Que ironia.', 'Atendimento ao morto: aguarde 3 eternidades.', 'Foi só um arranhão. Em chamas.', 'A lava mandou lembranças.', 'Seu seguro de vida não cobre "inferno".'];
function die() {
  const p = player;
  if (p.dead || p.inv > 0) return;
  p.dead = 85; p.vy = -10; p.vx = 0; p.rot = 0;
  burst(p.x + 12, p.y + 18, '#ff6a1a', 18);
  toast(piadasMorte[Math.floor(Math.random() * piadasMorte.length)], 160);
}
function afterDeath() {
  lives--; updateHUD();
  if (lives <= 0) { endGame(false); return; }
  player = newPlayer(); player.inv = 120;
}

/* ---------- Atualização (60 vezes por segundo) ---------- */
function update() {
  t++;
  if (toastTimer > 0 && --toastTimer === 0) $('toast').classList.remove('show');
  const p = player;

  // plataformas móveis
  for (const m of level.movers) {
    const ox = m.x, oy = m.y; m.ph += m.sp;
    m.x = m.bx + Math.sin(m.ph) * m.ax; m.y = m.by + Math.sin(m.ph) * m.ay; m.dx = m.x - ox; m.dy = m.y - oy;
  }
  // inimigos
  for (const e of level.enemies) {
    if (e.dead) continue;
    e.x += e.dir * e.sp; if (e.x < e.min || e.x + e.w > e.max + e.w) e.dir *= -1;
    if (e.t === 'bat') e.y = e.by + Math.sin(t * .06 + e.ph) * e.amp;
  }
  // tortas voadoras (obstáculo)
  if (t % 130 === 0) pies.push({ x: 5100, y: 406, w: 30, h: 14, vx: -3.2 });
  for (const q of pies) q.x += q.vx;
  pies = pies.filter(q => { if (q.x < 4720) { burst(q.x, q.y, '#ffd24a', 8); return false; } return true; });
  // partículas
  for (const s of particles) { s.x += s.vx; s.y += s.vy; s.vy += .25; s.l--; }
  particles = particles.filter(s => s.l > 0);

  if (p.dead) {  // animação de morte
    p.vy += .5; p.y += p.vy; p.rot += .28;
    if (--p.dead <= 0) afterDeath();
    return;
  }
  if (p.inv > 0) p.inv--;

  // entrada
  const L = keys.ArrowLeft || keys.KeyA, R = keys.ArrowRight || keys.KeyD;
  const ax = (R ? 1 : 0) - (L ? 1 : 0);
  p.vx += ax * (p.ground ? .75 : .45);
  if (!ax) p.vx *= p.ground ? .78 : .93;
  p.vx = clamp(p.vx, -CFG.velocidade, CFG.velocidade);
  if (ax) p.dir = ax;

  // pulo com "coyote time" e buffer (mais responsivo)
  p.coyote = p.ground ? 7 : p.coyote - 1;
  if (p.buf > 0) p.buf--;
  if (p.buf > 0 && p.coyote > 0) { p.vy = -CFG.pulo; p.buf = 0; p.coyote = 0; p.ground = false; burst(p.x + 12, p.y + 36, '#c9a27a', 5); }
  const segurando = keys.Space || keys.ArrowUp || keys.KeyW;
  if (!segurando && p.vy < -4) p.vy *= .88;
  p.vy = Math.min(p.vy + CFG.gravidade, 14);

  // carona em plataforma móvel
  if (p.ride) { p.x += p.ride.dx; p.y += p.ride.dy; p.ride = null; }

  // colisão X
  p.x += p.vx;
  for (const s of level.solids) if (hit(p, s)) { p.x = p.vx > 0 ? s.x - p.w : s.x + s.w; p.vx = 0; }
  p.x = clamp(p.x, 0, MUNDO - p.w);
  // colisão Y
  p.y += p.vy; p.ground = false;
  for (const s of level.solids) if (hit(p, s)) {
    if (p.vy > 0) { p.y = s.y - p.h; p.ground = true; if (s.dx !== undefined) p.ride = s; }
    else p.y = s.y + s.h;
    p.vy = 0;
  }
  p.anim += Math.abs(p.vx) * .12;

  // lava
  if (p.y + p.h > LAVA + 4) { die(); return; }

  const hb = { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 4 };
  // espinhos
  for (const s of level.spikes) if (hit(hb, { x: s.x, y: s.y - 16, w: s.w, h: 16 })) die();
  // jatos de fogo
  for (const j of level.jets) { const ph = (t + j.o) % j.p; if (ph < j.p * .5 && hit(hb, { x: j.x, y: j.y - j.h, w: j.w, h: j.h })) die(); }
  // tortas
  for (const q of pies) if (hit(hb, q)) { burst(q.x, q.y, '#ffd24a', 12); q.x = -999; toast('Abacaxi! Parece fruta, bate como tijolo.', 120); die(); }
  // inimigos
  for (const e of level.enemies) {
    if (e.dead || !hit(hb, e)) continue;
    if (p.vy > 0.5 && p.y + p.h < e.y + e.h * .8) {
      e.dead = true; score += CFG.esmagar; p.vy = segurando ? -11.5 : -8; burst(e.x + e.w / 2, e.y, '#ffd24a', 14); updateHUD();
    } else die();
  }
  // moedas (almas)
  for (const c of level.coins) if (!c.got && Math.hypot(c.x - (p.x + 12), c.y - (p.y + 18)) < 26) {
    c.got = true; score += CFG.moeda; souls++; burst(c.x, c.y, '#9fe8ff', 8); updateHUD();
  }
  // checkpoints
  for (const c of level.cps) if (!c.on && p.x > c.x) {
    c.on = true; respawn = { x: c.x, y: c.y }; toast('Checkpoint! O inferno lembra de você (infelizmente).', 130); burst(c.x, c.y - 30, '#ffb23a', 16);
  }
  // saída
  if (hit(hb, level.exit)) { endGame(true); return; }

  cam += (clamp(p.x - W * .4, 0, MUNDO - W) - cam) * .12;
}

/* ---------- Desenho ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function bubble(txt, x, y) {
  ctx.font = 'bold 13px "Trebuchet MS",sans-serif'; const w = ctx.measureText(txt).width + 20;
  ctx.fillStyle = '#fff1d8'; ctx.strokeStyle = '#120504'; ctx.lineWidth = 2;
  rr(x - w / 2, y - 26, w, 26, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x + 6, y); ctx.fillStyle = '#fff1d8'; ctx.fill();
  ctx.fillStyle = '#120504'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y - 8); ctx.textAlign = 'left';
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120302'); g.addColorStop(.55, '#4a0f06'); g.addColorStop(1, '#b3330a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // montanhas distantes
  ctx.fillStyle = '#2a0a05'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, 380 - 60 * Math.abs(Math.sin((x + cam * .2) * .008)) - 30 * rnd(Math.floor((x + cam * .2) / 40)));
  ctx.lineTo(W, H); ctx.fill();
  // estalactites
  const c3 = cam * .3, k0 = Math.floor(c3 / 90);
  ctx.fillStyle = '#1c0a06';
  for (let i = -1; i < 12; i++) {
    const k = k0 + i, x = k * 90 - c3, h = 40 + rnd(k) * 90;
    ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 5 * rnd(k + 9), h); ctx.fill();
  }
  // correntes com almas penduradas
  const c5 = cam * .5, kk0 = Math.floor(c5 / 230);
  const queixas = ['Fila do SAC', 'Reunião às 8h', 'Trânsito', 'Segunda-feira', 'Boleto', 'Wi-Fi caiu'];
  for (let i = -1; i < 6; i++) {
    const k = kk0 + i, x = k * 230 - c5 + 60, len = 120 + rnd(k + 3) * 140;
    ctx.strokeStyle = '#6b5a50'; ctx.lineWidth = 4; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, len); ctx.stroke(); ctx.setLineDash([]);
    const sy = len + Math.sin(t * .03 + k) * 6;
    ctx.globalAlpha = .65; ctx.fillStyle = '#dff3f5';
    ctx.beginPath(); ctx.arc(x, sy + 14, 14, Math.PI, 0); ctx.lineTo(x + 14, sy + 38); ctx.lineTo(x + 7, sy + 32); ctx.lineTo(x, sy + 38); ctx.lineTo(x - 7, sy + 32); ctx.lineTo(x - 14, sy + 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#120504'; ctx.fillRect(x - 7, sy + 10, 4, 5); ctx.fillRect(x + 3, sy + 10, 4, 5); ctx.fillRect(x - 5, sy + 24, 10, 2);
    ctx.globalAlpha = .9; ctx.font = '11px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd9a0';
    ctx.fillText(queixas[Math.abs(k) % queixas.length], x, sy + 54); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

function drawLava() {
  const g = ctx.createLinearGradient(0, LAVA - 12, 0, H);
  g.addColorStop(0, '#ffd24a'); g.addColorStop(.25, '#ff7a1a'); g.addColorStop(1, '#a01404');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, LAVA + Math.sin((x + cam) * .03 + t * .05) * 5);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = '#ffe08a';
  for (let i = 0; i < 9; i++) { const bx = ((i * 137 + t * .6) % (W + 40)); const by = LAVA + 12 + ((t * .5 + i * 23) % 28); ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 7); ctx.fill(); }
}

function drawPlatform(s, i) {
  const x = s.x - cam; if (x > W || x + s.w < 0) return;
  const bottom = Math.min(s.y + s.h, H);
  ctx.fillStyle = '#3b2014'; ctx.fillRect(x, s.y, s.w, bottom - s.y);
  ctx.fillStyle = '#2a140c';
  for (let k = 0; k < s.w / 38; k++) { const cx = x + 8 + k * 38 + rnd(i * 7 + k) * 14; ctx.fillRect(cx, s.y + 12 + rnd(i + k) * 14, 3, 14); ctx.fillRect(cx - 5, s.y + 24 + rnd(k) * 8, 12, 2); }
  ctx.fillStyle = '#7a5232'; ctx.fillRect(x, s.y, s.w, 8);
  ctx.fillStyle = '#a06a3c'; ctx.fillRect(x, s.y, s.w, 3);
  ctx.fillStyle = '#ff7a1a'; ctx.globalAlpha = .5; for (let k = 0; k < s.w / 50; k++) ctx.fillRect(x + 10 + k * 50, s.y + 8, 14, 2); ctx.globalAlpha = 1;
}
function drawMover(m) {
  const x = m.x - cam; ctx.fillStyle = '#222'; ctx.fillRect(x, m.y, m.w, m.h);
  ctx.fillStyle = '#6b6b6b'; ctx.fillRect(x, m.y, m.w, 5);
  ctx.fillStyle = '#ffb23a'; for (let k = 0; k < m.w; k += 20) ctx.fillRect(x + k, m.y + 8, 10, 8);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 15, m.y); ctx.lineTo(x + 15, m.y - 30); ctx.moveTo(x + m.w - 15, m.y); ctx.lineTo(x + m.w - 15, m.y - 30); ctx.stroke();
}
function drawSign(s) {
  const x = s.x - cam; if (x < -200 || x > W + 50) return;
  ctx.fillStyle = '#4a2c14'; ctx.fillRect(x - 3, s.y - 40, 6, 40);
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  const w = Math.max(...s.lines.map(l => ctx.measureText(l).width)) + 18, h = 14 * s.lines.length + 10;
  ctx.fillStyle = '#8a5a2e'; ctx.fillRect(x - w / 2, s.y - 40 - h, w, h); ctx.strokeStyle = '#2a140c'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, s.y - 40 - h, w, h);
  ctx.fillStyle = '#fff1d8'; ctx.textAlign = 'center'; s.lines.forEach((l, i) => ctx.fillText(l, x, s.y - 40 - h + 17 + i * 14)); ctx.textAlign = 'left';
}
function drawCheckpoint(c) {
  const x = c.x - cam; ctx.fillStyle = '#555'; ctx.fillRect(x, c.y - 56, 4, 56);
  ctx.fillStyle = c.on ? '#ffb23a' : '#6a2a20';
  ctx.beginPath(); ctx.moveTo(x + 4, c.y - 56); ctx.lineTo(x + 34, c.y - 46 + Math.sin(t * .15) * 2); ctx.lineTo(x + 4, c.y - 34); ctx.fill();
  if (c.on) { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(x + 2, c.y - 60, 6 + Math.sin(t * .3) * 2, 0, 7); ctx.fill(); }
}
function drawSpikes(s) {
  const x = s.x - cam; ctx.fillStyle = '#c9c0b8'; ctx.strokeStyle = '#3a3030'; ctx.lineWidth = 1;
  for (let k = 0; k < s.w; k += 14) { ctx.beginPath(); ctx.moveTo(x + k, s.y); ctx.lineTo(x + k + 7, s.y - 16); ctx.lineTo(x + k + 14, s.y); ctx.fill(); ctx.stroke(); }
}
function drawJet(j) {
  const x = j.x - cam, ph = (t + j.o) % j.p;
  ctx.fillStyle = '#222'; ctx.fillRect(x - 2, j.y - 6, j.w + 4, 6); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(x + 6, j.y - 6, j.w - 12, 2);
  if (ph < j.p * .5) {
    const f = 1 + Math.sin(t * .6) * .08;
    ctx.fillStyle = '#e8321a'; ctx.beginPath(); ctx.moveTo(x, j.y - 6); ctx.quadraticCurveTo(x - 4, j.y - j.h * .6, x + j.w / 2, j.y - j.h * f); ctx.quadraticCurveTo(x + j.w + 4, j.y - j.h * .6, x + j.w, j.y - 6); ctx.fill();
    ctx.fillStyle = '#ffb23a'; ctx.beginPath(); ctx.moveTo(x + 8, j.y - 6); ctx.quadraticCurveTo(x + 6, j.y - j.h * .4, x + j.w / 2, j.y - j.h * .75 * f); ctx.quadraticCurveTo(x + j.w - 6, j.y - j.h * .4, x + j.w - 8, j.y - 6); ctx.fill();
  } else if (ph > j.p - 25) { ctx.fillStyle = '#ffd24a'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 8 + k * 9, j.y - 12 - ((t + k * 5) % 12), 3, 3); }
}
function drawCoin(c) {
  if (c.got) return; const x = c.x - cam; if (x < -20 || x > W + 20) return;
  const y = c.y + Math.sin(t * .08 + c.o) * 4; ctx.globalAlpha = .9; ctx.fillStyle = '#9fe8ff';
  ctx.beginPath(); ctx.arc(x, y - 2, 8, Math.PI, 0); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 4, y + 5); ctx.lineTo(x, y + 9); ctx.lineTo(x - 4, y + 5); ctx.lineTo(x - 8, y + 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#120504'; ctx.fillRect(x - 4, y - 4, 2, 3); ctx.fillRect(x + 2, y - 4, 2, 3); ctx.globalAlpha = 1;
}
function drawEnemy(e) {
  if (e.dead) return; const x = e.x - cam; if (x < -40 || x > W + 40) return;
  ctx.save(); ctx.translate(x + e.w / 2, e.y + e.h / 2); ctx.scale(e.dir, 1);
  if (e.t === 'imp') {
    const s = Math.sin(t * .3) * 4;
    ctx.fillStyle = '#4a1840'; ctx.fillRect(-9 + s, 8, 6, 6); ctx.fillRect(3 - s, 8, 6, 6);
    ctx.fillStyle = '#7a2a70'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(-5, -3, 4, 0, 7); ctx.arc(6, -3, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#120504'; ctx.fillRect(-4, -4, 2, 3); ctx.fillRect(7, -4, 2, 3);
    ctx.fillRect(-7, 5, 14, 2); ctx.fillStyle = '#f3dcc0'; for (let k = -6; k < 6; k += 4) ctx.fillRect(k, 5, 2, 3);
    ctx.fillStyle = '#c9c0b8'; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-8, -20); ctx.lineTo(-4, -11); ctx.moveTo(12, -8); ctx.lineTo(8, -20); ctx.lineTo(4, -11); ctx.fill();
  } else {
    const f = Math.sin(t * .35) * 8;
    ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24, -8 + f); ctx.lineTo(-14, 6); ctx.lineTo(-4, 2); ctx.moveTo(0, 0); ctx.lineTo(24, -8 + f); ctx.lineTo(14, 6); ctx.lineTo(4, 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 2, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#ff3a1a'; ctx.fillRect(-5, -1, 3, 3); ctx.fillRect(2, -1, 3, 3);
  }
  ctx.restore();
}
function drawNpc(n) {
  const x = n.x - cam; if (x < -80 || x > W + 80) return;
  ctx.fillStyle = n.cor; ctx.fillRect(x - 11, n.y - 32, 22, 22); ctx.fillRect(x - 9, n.y - 10, 6, 10); ctx.fillRect(x + 3, n.y - 10, 6, 10);
  ctx.fillStyle = '#b8281a'; ctx.beginPath(); ctx.arc(x, n.y - 40, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#f3dcc0'; ctx.beginPath(); ctx.moveTo(x - 8, n.y - 48); ctx.lineTo(x - 5, n.y - 58); ctx.lineTo(x - 1, n.y - 49); ctx.moveTo(x + 8, n.y - 48); ctx.lineTo(x + 5, n.y - 58); ctx.lineTo(x + 1, n.y - 49); ctx.fill();
  ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - 6, n.y - 43, 4, 4); ctx.fillRect(x + 2, n.y - 43, 4, 4);
  ctx.fillStyle = '#ff7a1a'; ctx.fillRect(x - 2, n.y - 30, 4, 14);   // gravata
  if (Math.abs(player.x - n.x) < 170 && !player.dead) bubble(n.lines[Math.floor(t / 170) % n.lines.length], x, n.y - 70);
  else { ctx.font = 'bold 11px "Trebuchet MS",sans-serif'; ctx.fillStyle = '#ffd9a0'; ctx.textAlign = 'center'; ctx.fillText(n.nome, x, n.y - 64); ctx.textAlign = 'left'; }
}
function drawPie(x, y, s = 1) {   // desenha um abacaxi (centro em x,y)
  ctx.fillStyle = '#2f8a2a'; ctx.beginPath();
  for (let k = -2; k <= 2; k++) { ctx.moveTo(x + k * 3 * s, y - 12 * s); ctx.lineTo(x + k * 5 * s, y - 27 * s + Math.abs(k) * 5 * s); ctx.lineTo(x + k * 3 * s + 5 * s, y - 12 * s); }
  ctx.fill();
  ctx.fillStyle = '#f2b42a'; ctx.beginPath(); ctx.ellipse(x, y, 11 * s, 15 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a8641a'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = -8; k <= 8; k += 8) { ctx.moveTo(x + k * s * .6, y - 11 * s); ctx.lineTo(x + k * s * .6 + 7 * s, y + 11 * s); ctx.moveTo(x + k * s * .6 + 7 * s, y - 11 * s); ctx.lineTo(x + k * s * .6, y + 11 * s); }
  ctx.stroke();
}
function drawPieCannon() {
  const x = 5110 - cam; if (x < -50 || x > W + 80) return;
  ctx.fillStyle = '#333'; ctx.fillRect(x - 8, 380, 44, 40); ctx.fillStyle = '#555'; ctx.fillRect(x - 22, 398, 26, 16);
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('ABACAXI', x - 2, 405);
}

/* A PIADA CENTRAL: ditador fictício condenado a levar torta na cara, em loop eterno */
function drawJoke() {
  const gx = 4150 - cam, gy = 420; if (gx > W + 100 || gx + 560 < -100) return;
  ctx.fillStyle = '#8a1010'; ctx.fillRect(gx + 40, gy - 6, 440, 6);          // tapete vermelho
  // placas
  ctx.fillStyle = '#120504'; ctx.fillRect(gx + 80, gy - 238, 360, 40); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 3; ctx.strokeRect(gx + 80, gy - 238, 360, 40);
  ctx.fillStyle = '#ff7a1a'; ctx.font = 'bold 17px Impact,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SETOR 666-B: PUNIÇÕES CRIATIVAS', gx + 260, gy - 212);
  ctx.fillStyle = '#2a140c'; ctx.fillRect(gx + 130, gy - 188, 260, 30); ctx.strokeRect(gx + 130, gy - 188, 260, 30);
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 14px "Trebuchet MS",sans-serif'; ctx.fillText('ABACAXIS NA CABEÇA: ' + (487213 + Math.floor(t / 90)).toLocaleString('pt-BR'), gx + 260, gy - 168);
  ctx.fillStyle = '#4a2c14'; ctx.fillRect(gx + 300, gy - 134, 150, 22); ctx.fillStyle = '#fff1d8'; ctx.font = '11px "Trebuchet MS",sans-serif'; ctx.fillText('Aposentadoria: nunca', gx + 375, gy - 119); ctx.textAlign = 'left';

  const ciclo = (t % 90) / 90, dx = gx + 220, mx = gx + 420, fy = gy - 72;
  // máquina de tortas
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx - 22, gy - 70, 60, 64); ctx.fillStyle = '#b8281a'; ctx.fillRect(mx - 22, gy - 78, 60, 10);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(mx - 12, gy - 50, 14, 14); ctx.fillStyle = '#120504'; ctx.fillRect(mx - 40, gy - 58, 20, 12);
  const mola = ciclo < .35 ? 10 * (1 - ciclo / .35) : 0; ctx.fillStyle = '#777'; ctx.fillRect(mx - 40 - mola, gy - 56, 14, 8);
  // banquinho + ditador (personagem totalmente fictício: General Bigodão)
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(dx - 24, gy - 20, 48, 6); ctx.fillRect(dx - 20, gy - 14, 6, 14); ctx.fillRect(dx + 14, gy - 14, 6, 14);
  const tremor = ciclo > .35 && ciclo < .5 ? Math.sin(t * 2) * 4 : 0, cx = dx + tremor;
  ctx.fillStyle = '#5b6b3a'; ctx.fillRect(cx - 22, gy - 62, 44, 44);
  ctx.fillStyle = '#b8281a'; ctx.beginPath(); ctx.moveTo(cx - 22, gy - 62); ctx.lineTo(cx - 8, gy - 62); ctx.lineTo(cx + 22, gy - 24); ctx.lineTo(cx + 8, gy - 24); ctx.fill();
  ctx.fillStyle = '#ffd24a'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx + 8 + (k % 2) * 8, gy - 54 + k * 6, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#5b6b3a'; ctx.fillRect(cx - 24, gy - 14, 14, 14); ctx.fillRect(cx + 10, gy - 14, 14, 14);
  ctx.fillStyle = '#f1c8a0'; ctx.beginPath(); ctx.arc(cx, fy - 8, 18, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a4a2a'; ctx.fillRect(cx - 22, fy - 36, 44, 12); ctx.fillRect(cx - 14, fy - 46, 28, 12);
  ctx.strokeStyle = '#e8321a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, fy - 46); ctx.quadraticCurveTo(cx + 12, fy - 62, cx + 20, fy - 50); ctx.stroke();
  const creme = ciclo >= .35 && ciclo < .95;
  if (!creme) {
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 9, fy - 14, 7, 7); ctx.fillRect(cx + 3, fy - 14, 7, 7);
    ctx.fillStyle = '#120504'; ctx.fillRect(cx - 7, fy - 12, 3, 4); ctx.fillRect(cx + 5, fy - 12, 3, 4);
    ctx.strokeStyle = '#120504'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 3, fy - 2); ctx.bezierCurveTo(cx - 24, fy - 8, cx - 30, fy + 8, cx - 22, fy + 8); ctx.moveTo(cx + 3, fy - 2); ctx.bezierCurveTo(cx + 24, fy - 8, cx + 30, fy + 8, cx + 22, fy + 8); ctx.stroke(); // bigodão
  } else {
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 9, fy - 14, 7, 7); ctx.fillRect(cx + 3, fy - 14, 7, 7);
    ctx.strokeStyle = '#120504'; ctx.lineWidth = 2; ctx.beginPath();
    const rd = 1.5 + (t % 8) * .25; ctx.arc(cx - 5, fy - 10, rd, 0, 7); ctx.moveTo(cx + 7 + rd, fy - 10); ctx.arc(cx + 7, fy - 10, rd, 0, 7); ctx.stroke();   // olhos tontos
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 3, fy - 2); ctx.bezierCurveTo(cx - 24, fy - 8, cx - 30, fy + 8, cx - 22, fy + 8); ctx.moveTo(cx + 3, fy - 2); ctx.bezierCurveTo(cx + 24, fy - 8, cx + 30, fy + 8, cx + 22, fy + 8); ctx.stroke();
    drawPie(cx, fy - 60, 1.1);   // abacaxi preso na cabeça (chapéu involuntário)
  }
  // torta voando até a cara
  if (ciclo < .35) { const u = ciclo / .35; drawPie(mx - 44 + (dx + 18 - (mx - 44)) * u, gy - 52 - Math.sin(u * Math.PI) * 22 + (fy - gy + 52) * u * .4, 1); }
  if (ciclo > .45 && ciclo < .95) bubble(['DE NOVO?!', 'Já faz 300 anos!', 'Eu pedi sorvete!', 'Isso não é suco, é castigo!'][Math.floor(t / 90) % 4], dx, fy - 62);
}

function drawPlayer() {
  const p = player; ctx.save(); ctx.translate(p.x + p.w / 2 - cam, p.y + p.h / 2);
  if (p.dead) ctx.rotate(p.rot);
  if (p.inv > 0 && !p.dead && Math.floor(t / 4) % 2) ctx.globalAlpha = .4;
  ctx.scale(p.dir, 1);
  const andando = p.ground && Math.abs(p.vx) > .6, sw = andando ? Math.sin(p.anim) * 7 : 0, noAr = !p.ground, subindo = p.vy < 0;
  // cauda
  ctx.strokeStyle = '#b8281a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, 5); ctx.quadraticCurveTo(-22, 8 + Math.sin(t * .2) * 4, -20, -6); ctx.stroke();
  ctx.fillStyle = '#120504'; ctx.beginPath(); ctx.moveTo(-23, -5); ctx.lineTo(-17, -5); ctx.lineTo(-20, -13); ctx.fill();
  // pernas
  ctx.fillStyle = '#7a0c0c';
  if (noAr) { const o = subindo ? 0 : 4; ctx.fillRect(-9 - o, 8, 7, subindo ? 7 : 11); ctx.fillRect(3 + o, 8, 7, subindo ? 7 : 11); }
  else { ctx.fillRect(-9 + sw, 8, 7, 10); ctx.fillRect(3 - sw, 8, 7, 10); }
  ctx.fillStyle = '#120504'; if (!noAr) { ctx.fillRect(-9 + sw, 15, 8, 3); ctx.fillRect(3 - sw, 15, 8, 3); }
  // corpo e braços
  ctx.fillStyle = '#d62b1c'; ctx.fillRect(-10, -3, 20, 14);
  ctx.fillStyle = '#b8281a';
  if (p.dead || (noAr && !subindo)) { ctx.fillRect(-14, -14, 5, 12); ctx.fillRect(9, -14, 5, 12); } else ctx.fillRect(6 - sw * .6, 0, 5, 10);
  // cabeça e chifres
  ctx.fillStyle = '#e63a24'; ctx.beginPath(); ctx.arc(0, -10, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#f3dcc0'; ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(-7, -27); ctx.lineTo(-2, -19); ctx.moveTo(9, -16); ctx.lineTo(7, -27); ctx.lineTo(2, -19); ctx.fill();
  if (p.dead) { ctx.strokeStyle = '#120504'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-1, -9); ctx.moveTo(-1, -14); ctx.lineTo(-6, -9); ctx.moveTo(2, -14); ctx.lineTo(7, -9); ctx.moveTo(7, -14); ctx.lineTo(2, -9); ctx.stroke(); }
  else { ctx.fillStyle = '#fff'; ctx.fillRect(-5, -14, 6, 6); ctx.fillRect(3, -14, 6, 6); ctx.fillStyle = '#120504'; ctx.fillRect(-2, -12, 3, 4); ctx.fillRect(6, -12, 3, 4);
    ctx.fillRect(0, -4, 8, 2); }
  ctx.restore();
}

function drawExit() {
  const e = level.exit, x = e.x - cam; if (x < -100 || x > W + 100) return;
  const g = ctx.createRadialGradient(x + 30, e.y + 45, 5, x + 30, e.y + 45, 70);
  g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, e.y - 30, 140, 150);
  ctx.fillStyle = '#120504'; ctx.fillRect(x - 6, e.y - 6, 72, 102); ctx.fillStyle = '#fff1b0'; ctx.fillRect(x, e.y, 60, 96);
  ctx.fillStyle = '#ffb23a'; ctx.fillRect(x + 8 + Math.sin(t * .1) * 4, e.y + 8, 44, 80);
  ctx.fillStyle = '#120504'; ctx.font = 'bold 12px Impact,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SAÍDA', x + 30, e.y - 12); ctx.textAlign = 'left';
}

function draw() {
  drawBackground();
  drawLava();
  level.plats.forEach(drawPlatform); level.movers.forEach(drawMover);
  level.signs.forEach(drawSign); level.cps.forEach(drawCheckpoint);
  drawJoke(); drawPieCannon(); drawExit();
  level.spikes.forEach(drawSpikes); level.jets.forEach(drawJet);
  level.coins.forEach(drawCoin); level.enemies.forEach(drawEnemy); level.npcs.forEach(drawNpc);
  for (const q of pies) drawPie(q.x - cam, q.y, 1);
  drawPlayer();
  for (const s of particles) { ctx.globalAlpha = clamp(s.l / 30, 0, 1); ctx.fillStyle = s.c; ctx.fillRect(s.x - cam, s.y, 4, 4); } ctx.globalAlpha = 1;
  // brilho de calor nas bordas
  const v = ctx.createLinearGradient(0, H - 120, 0, H); v.addColorStop(0, 'rgba(255,90,20,0)'); v.addColorStop(1, 'rgba(255,90,20,.25)'); ctx.fillStyle = v; ctx.fillRect(0, H - 120, W, 120);
}

/* ---------- Loop principal (passo fixo de 60 FPS) ---------- */
let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, ts - last); last = ts;
  if (state === 'playing') { acc += dt; while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; if (state !== 'playing') break; } }
  else if (state === 'menu') { t++; cam = (Math.sin(t * .004) * .5 + .5) * 5500; }
  draw();
}

/* ---------- Controles ---------- */
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && state === 'playing') player.buf = 8;
  if ((e.code === 'KeyP' || e.code === 'Escape') && (state === 'playing' || state === 'paused')) togglePause();
  if (e.code === 'KeyR' && state !== 'menu') startGame();
  if (e.code === 'Enter' && state === 'menu') startGame();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'playing') togglePause(); });
$('btnStart').onclick = startGame;
$('btnResume').onclick = togglePause;
$('btnRestart1').onclick = startGame;
$('btnRestart2').onclick = startGame;
$('btnMenu').onclick = goMenu;

/* ---------- Início ---------- */
level = buildLevel(); respawn = { x: 80, y: 440 }; player = newPlayer(); updateHUD();
requestAnimationFrame(loop);

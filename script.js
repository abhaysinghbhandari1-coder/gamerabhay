/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
function rand(n) { return Math.floor(Math.random() * n); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ---------- Game list (add new games here) ---------- */
const GAMES = [
  { id: 'snake', name: 'Neon Snake', emoji: '🐍', lowerBetter: false, init: snakeGame,
    desc: 'Eat, grow, and do not hit the walls or yourself.',
    hint: 'Arrow keys / WASD, swipe on the board, or use the buttons.' },
  { id: 'memory', name: 'Memory Match', emoji: '🧠', lowerBetter: true, init: memoryGame,
    desc: 'Find all the pairs in as few moves as you can.',
    hint: 'Score is your number of moves. Lower is better.' },
  { id: 'tictactoe', name: 'Tic Tac Toe', emoji: '❌', lowerBetter: false, init: tttGame,
    desc: 'You are X. Beat the AI to build a win streak.',
    hint: 'Score is the number of wins in this session.' },
  { id: 'reaction', name: 'Reaction Test', emoji: '⚡', lowerBetter: true, init: reactionGame,
    desc: 'How fast are your reflexes? Click when it turns green.',
    hint: 'Score is your time in milliseconds. Lower is better.' }
];

/* ---------- Portal UI ---------- */
function getBest(g) {
  const v = store.get('txa_best_' + g.id);
  return v === null ? null : Number(v);
}
function bestText(g) {
  const b = getBest(g);
  if (b === null) return '-';
  return g.id === 'reaction' ? b + ' ms' : String(b);
}

function renderGrid(filter) {
  const grid = $('#grid');
  grid.innerHTML = '';
  const q = (filter || '').trim().toLowerCase();
  const list = GAMES.filter((g) => (g.name + ' ' + g.desc).toLowerCase().includes(q));
  $('#empty').classList.toggle('hidden', list.length > 0);

  list.forEach((g) => {
    const card = el('div', 'card');
    card.innerHTML =
      '<div class="emoji">' + g.emoji + '</div>' +
      '<h3>' + g.name + '</h3>' +
      '<p>' + g.desc + '</p>' +
      '<div class="meta"><span class="best">Best: ' + bestText(g) + '</span>' +
      '<button class="play">Play</button></div>';
    card.querySelector('.play').addEventListener('click', () => openGame(g));
    grid.appendChild(card);
  });
}

let current = null;
let instance = null;

const api = {
  setScore(n) { $('#score').textContent = n; },
  finish(n) {
    const g = current;
    if (!g) return;
    const old = getBest(g);
    const better = old === null || (g.lowerBetter ? n < old : n > old);
    if (better && !(n === 0 && !g.lowerBetter)) {
      store.set('txa_best_' + g.id, String(n));
    }
    $('#best').textContent = bestText(g);
  }
};

function openGame(g) {
  closeGame(true);
  current = g;
  $('#game-title').textContent = g.emoji + ' ' + g.name;
  $('#hint').textContent = g.hint;
  $('#score').textContent = '0';
  $('#best').textContent = bestText(g);
  $('#stage').innerHTML = '';
  $('#modal').classList.remove('hidden');
  document.body.classList.add('lock');
  instance = g.init($('#stage'), api);
}

function closeGame(silent) {
  if (instance && instance.destroy) instance.destroy();
  instance = null;
  current = null;
  $('#stage').innerHTML = '';
  $('#modal').classList.add('hidden');
  document.body.classList.remove('lock');
  if (!silent) renderGrid($('#search').value);
}

$('#close').addEventListener('click', () => closeGame());
$('#restart').addEventListener('click', () => { if (instance && instance.restart) instance.restart(); });
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeGame(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) closeGame(); });
$('#search').addEventListener('input', (e) => renderGrid(e.target.value));
$('#year').textContent = new Date().getFullYear();
renderGrid();

/* ---------- Game 1: Snake ---------- */
function snakeGame(stage, api) {
  const size = 18, cell = 20;
  const canvas = el('canvas', 'canvas');
  canvas.width = canvas.height = size * cell;
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const pad = el('div', 'dpad');
  [['up', '▲'], ['left', '◀'], ['down', '▼'], ['right', '▶']].forEach(([d, label]) => {
    const b = el('button', d);
    b.textContent = label;
    b.addEventListener('click', () => turn(d));
    pad.appendChild(b);
  });
  stage.appendChild(pad);

  let snake, dir, nextDir, food, score, alive, timer;

  function reset() {
    snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    alive = true;
    api.setScore(0);
    placeFood();
    clearInterval(timer);
    timer = setInterval(tick, 110);
    draw();
  }

  function placeFood() {
    do {
      food = { x: rand(size), y: rand(size) };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function tick() {
    dir = nextDir;
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitWall = h.x < 0 || h.y < 0 || h.x >= size || h.y >= size;
    const hitSelf = snake.some((s) => s.x === h.x && s.y === h.y);
    if (hitWall || hitSelf) {
      alive = false;
      clearInterval(timer);
      api.finish(score);
      draw();
      return;
    }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      score += 10;
      api.setScore(score);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff4d7a';
    ctx.fillStyle = '#ff4d7a';
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#00b8ff';
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#7fe0ff' : '#00b8ff';
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
    ctx.shadowBlur = 0;

    if (!alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 6);
      ctx.font = '16px sans-serif';
      ctx.fillText('Press Space or Restart', canvas.width / 2, canvas.height / 2 + 24);
    }
  }

  function turn(d) {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [x, y] = map[d];
    if (x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  function onKey(e) {
    const keys = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right'
    };
    if (keys[e.key]) {
      e.preventDefault();
      turn(keys[e.key]);
    } else if ((e.key === ' ' || e.key === 'Enter') && !alive) {
      e.preventDefault();
      reset();
    }
  }
  document.addEventListener('keydown', onKey);

  let tx = 0, ty = 0;
  canvas.addEventListener('touchstart', (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  reset();
  return {
    restart: reset,
    destroy() {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
    }
  };
}

/* ---------- Game 2: Memory Match ---------- */
function memoryGame(stage, api) {
  const icons = ['🎮', '🕹️', '👾', '🚀', '⚡', '🎯', '🏆', '🔥'];
  const grid = el('div', 'mem-grid');
  stage.appendChild(grid);
  let first = null, lock = false, moves = 0, matched = 0;
  const timers = [];

  function reset() {
    grid.innerHTML = '';
    moves = 0; matched = 0; first = null; lock = false;
    api.setScore(0);
    shuffle([...icons, ...icons]).forEach((ic) => {
      const b = el('button', 'mem-card');
      b.dataset.icon = ic;
      b.innerHTML = '<span class="front">?</span><span class="back">' + ic + '</span>';
      b.addEventListener('click', () => flip(b));
      grid.appendChild(b);
    });
  }

  function flip(b) {
    if (lock || b.classList.contains('open')) return;
    b.classList.add('open');
    if (!first) { first = b; return; }

    moves++;
    api.setScore(moves);
    if (first.dataset.icon === b.dataset.icon) {
      first.classList.add('done');
      b.classList.add('done');
      first = null;
      matched++;
      if (matched === icons.length) api.finish(moves);
    } else {
      lock = true;
      const a = first;
      first = null;
      timers.push(setTimeout(() => {
        a.classList.remove('open');
        b.classList.remove('open');
        lock = false;
      }, 700));
    }
  }

  reset();
  return { restart: reset, destroy() { timers.forEach(clearTimeout); } };
}

/* ---------- Game 3: Tic Tac Toe ---------- */
function tttGame(stage, api) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const info = el('div', 'ttt-info');
  const grid = el('div', 'ttt-grid');
  stage.append(info, grid);

  let board, over, busy, wins = 0, timer;
  const cells = [...Array(9)].map((_, i) => {
    const b = el('button', 'ttt-cell');
    b.addEventListener('click', () => play(i));
    grid.appendChild(b);
    return b;
  });

  function winner(b) {
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return b.every(Boolean) ? 'draw' : null;
  }

  function reset() {
    clearTimeout(timer);
    board = Array(9).fill('');
    over = false;
    busy = false;
    render();
    info.textContent = 'Your turn (X)';
  }

  function render() {
    cells.forEach((b, i) => {
      b.textContent = board[i];
      b.className = 'ttt-cell' + (board[i] === 'X' ? ' x' : board[i] === 'O' ? ' o' : '');
    });
  }

  function checkEnd() {
    const w = winner(board);
    if (!w) return false;
    over = true;
    if (w === 'X') {
      wins++;
      api.setScore(wins);
      api.finish(wins);
      info.textContent = 'You win! 🎉';
    } else if (w === 'O') {
      info.textContent = 'AI wins 🤖';
    } else {
      info.textContent = "It's a draw";
    }
    return true;
  }

  function aiMove() {
    const tryLine = (p) => {
      for (const [a, b, c] of lines) {
        const v = [board[a], board[b], board[c]];
        if (v.filter((x) => x === p).length === 2 && v.includes('')) {
          return [a, b, c][v.indexOf('')];
        }
      }
      return null;
    };
    let m = tryLine('O');
    if (m === null) m = tryLine('X');
    if (m === null && !board[4]) m = 4;
    if (m === null) {
      const corners = [0, 2, 6, 8].filter((i) => !board[i]);
      if (corners.length) m = corners[rand(corners.length)];
    }
    if (m === null) {
      const free = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
      m = free[rand(free.length)];
    }
    board[m] = 'O';
  }

  function play(i) {
    if (over || busy || board[i]) return;
    board[i] = 'X';
    render();
    if (checkEnd()) return;
    busy = true;
    info.textContent = 'AI is thinking...';
    timer = setTimeout(() => {
      aiMove();
      render();
      busy = false;
      if (!checkEnd()) info.textContent = 'Your turn (X)';
    }, 300);
  }

  reset();
  return { restart: reset, destroy() { clearTimeout(timer); } };
}

/* ---------- Game 4: Reaction Test ---------- */
function reactionGame(stage, api) {
  const box = el('button', 'react-box idle');
  stage.appendChild(box);
  let state = 'idle', timer, start;

  function reset() {
    clearTimeout(timer);
    state = 'idle';
    box.className = 'react-box idle';
    box.textContent = 'Click to start';
    api.setScore(0);
  }

  box.addEventListener('click', () => {
    if (state === 'idle') {
      state = 'wait';
      box.className = 'react-box wait';
      box.textContent = 'Wait for green...';
      timer = setTimeout(() => {
        state = 'go';
        box.className = 'react-box go';
        box.textContent = 'CLICK NOW!';
        start = performance.now();
      }, 1000 + Math.random() * 3000);
    } else if (state === 'wait') {
      clearTimeout(timer);
      state = 'idle';
      box.className = 'react-box early';
      box.textContent = 'Too early! Click to try again';
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - start);
      state = 'idle';
      box.className = 'react-box idle';
      box.textContent = ms + ' ms - click to play again';
      api.setScore(ms);
      api.finish(ms);
    }
  });

  reset();
  return { restart: reset, destroy() { clearTimeout(timer); } };
}
/* Interactive ASCII cover. The color grid is sampled from the supplied video. */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero.querySelector('.hero-canvas');
  const title = hero.querySelector('.hero-title');
  const mask = window.HERO_MASK;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!mask) return;

  const pixels = Uint8Array.from(atob(mask.pixels), character => character.charCodeAt(0));
  const context = canvas.getContext('2d', { alpha: false });
  const still = document.createElement('canvas');
  const stillContext = still.getContext('2d', { alpha: false });
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, inside: false };
  let cells = [];
  let portraitCells = [];
  let columns = 0;
  let rows = 0;
  let cellWidth = 0;
  let cellHeight = 0;
  let fontSize = 8;
  let width = 0;
  let height = 0;
  let visible = true;
  let lastPaint = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (column, row) => ((column * 73856093) ^ (row * 19349663)) >>> 0;
  const baseGlyph = (column, row) => {
    const characters = row > rows * .56 ? 'HHOORRSE' : 'SSRRRSEEOO';
    return characters[hash(column, row) % characters.length];
  };

  function sampleColor(column, row) {
    // Keep the portrait's original proportions as the viewport changes.
    const isNarrow = width < 700;
    const scale = isNarrow ? Math.min(height / mask.height, width / 500) : height / mask.height;
    const centerX = isNarrow ? 750 : mask.width / 2;
    const top = isNarrow ? height * .05 : 0;
    const sourceX = ((column + .5) * cellWidth - width / 2) / scale + centerX;
    const sourceY = ((row + .5) * cellHeight - top) / scale;
    if (sourceX < 0 || sourceX >= mask.width || sourceY < 0 || sourceY >= mask.height) return [12, 16, 19, false, sourceX];
    const x = clamp(Math.floor(sourceX / mask.width * mask.columns), 0, mask.columns - 1);
    const y = clamp(Math.floor(sourceY / mask.height * mask.rows), 0, mask.rows - 1);
    const index = (y * mask.columns + x) * 3;
    return [pixels[index], pixels[index + 1], pixels[index + 2], true, sourceX];
  }

  function makeCells() {
    cells = [];
    portraitCells = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const [red, green, blue, inside, sourceX] = sampleColor(column, row);
        const light = red * .28 + green * .59 + blue * .13;
        const alpha = light < 17 ? .035 : clamp(.15 + (light - 17) * .013, .15, .93);
        const tint = blue > red + 7 ? 'blue' : red > blue + 9 ? 'red' : 'white';
        const cell = {
          column, row,
          x: (column + .5) * cellWidth,
          y: (row + .5) * cellHeight,
          glyph: baseGlyph(column, row),
          alpha, tint
        };
        cells.push(cell);
        if (inside && light < 25 && sourceX > mask.width * .39 && sourceX < mask.width * .91) {
          portraitCells.push(cell);
        }
      }
    }
  }

  function drawBase() {
    stillContext.setTransform(1, 0, 0, 1, 0, 0);
    stillContext.fillStyle = '#080a0d';
    stillContext.fillRect(0, 0, still.width, still.height);
    const ratio = still.width / width;
    stillContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    stillContext.textAlign = 'center';
    stillContext.textBaseline = 'middle';
    stillContext.font = `700 ${fontSize}px "Courier New", monospace`;
    for (const cell of cells) {
      stillContext.globalAlpha = cell.alpha;
      stillContext.fillStyle = cell.tint === 'blue' ? '#80a8b6' : cell.tint === 'red' ? '#ad665f' : '#d2d5d5';
      stillContext.fillText(cell.glyph, cell.x, cell.y);
    }
    stillContext.globalAlpha = 1;
  }

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = still.width = Math.round(width * ratio);
    canvas.height = still.height = Math.round(height * ratio);
    columns = Math.max(36, Math.round(width / 10));
    rows = Math.max(58, Math.round(height / 10));
    cellWidth = width / columns;
    cellHeight = height / rows;
    fontSize = clamp(cellWidth * .79, 6.5, 10.4);
    makeCells();
    drawBase();
    context.drawImage(still, 0, 0);
  }

  function paint(now) {
    requestAnimationFrame(paint);
    if (!visible || document.hidden || now - lastPaint < 32) return;
    lastPaint = now;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(still, 0, 0);
    if (reducedMotion.matches) return;

    const ratio = canvas.width / width;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    /* Warm and cool bands travel across the sampled portrait; the image stays a silhouette. */
    context.font = `700 ${fontSize}px "Courier New", monospace`;
    const time = now * .001;
    for (const cell of portraitCells) {
      const phase = cell.x * .011 - cell.y * .008 - time * 1.14;
      const colorShift = Math.sin(phase);
      const shimmer = .5 + .5 * Math.sin(phase * 2.2 + time * .38);
      const sway = Math.sin(time * .87 + cell.y * .008) * 2.2;
      const breathe = Math.sin(time * 1.15 + cell.x * .006) * 1.1;
      context.globalAlpha = .09 + .23 * shimmer;
      context.fillStyle = colorShift > .17 ? '#dc6c57' : colorShift < -.17 ? '#69a6b6' : '#a99096';
      context.fillText(cell.glyph, cell.x + sway, cell.y + breathe);
    }
    context.globalAlpha = 1;

    /* A few characters change softly even when the pointer is still. */
    const tick = Math.floor(now / 190);
    for (let index = 0; index < Math.min(35, cells.length / 120); index++) {
      const cell = cells[(hash(index + tick * 13, tick + index * 7) % cells.length)];
      if (cell.alpha < .15) continue;
      context.font = `700 ${fontSize}px "Courier New", monospace`;
      context.globalAlpha = .16;
      context.fillStyle = '#e8f3f3';
      context.fillText('SREOH+'[(index + tick) % 6], cell.x, cell.y);
    }

    pointer.x += (pointer.targetX - pointer.x) * .22;
    pointer.y += (pointer.targetY - pointer.y) * .22;
    pointer.strength += ((pointer.inside ? 1 : 0) - pointer.strength) * .17;
    if (pointer.strength > .012) {
      const radius = width < 700 ? 88 : 120;
      const firstColumn = clamp(Math.floor((pointer.x - radius) / cellWidth), 0, columns - 1);
      const lastColumn = clamp(Math.ceil((pointer.x + radius) / cellWidth), 0, columns - 1);
      const firstRow = clamp(Math.floor((pointer.y - radius) / cellHeight), 0, rows - 1);
      const lastRow = clamp(Math.ceil((pointer.y + radius) / cellHeight), 0, rows - 1);
      for (let row = firstRow; row <= lastRow; row++) {
        for (let column = firstColumn; column <= lastColumn; column++) {
          const cell = cells[row * columns + column];
          const dx = cell.x - pointer.x;
          const dy = cell.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= radius) continue;
          const glow = Math.pow(1 - distance / radius, 1.35) * pointer.strength;
          context.globalAlpha = (.25 + .75 * glow) * glow;
          context.fillStyle = '#f7fbfa';
          context.shadowColor = '#ffffff';
          context.shadowBlur = 12 * glow;
          context.font = `700 ${fontSize * (1 + .56 * glow)}px "Courier New", monospace`;
          context.fillText(cell.glyph, cell.x + dx * glow * .035, cell.y + dy * glow * .035);
        }
      }
    }
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  hero.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointer.targetX = event.clientX - bounds.left;
    pointer.targetY = event.clientY - bounds.top;
    if (!pointer.inside) {
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
    }
    pointer.inside = true;
  });
  hero.addEventListener('pointerleave', () => { pointer.inside = false; });
  new ResizeObserver(resize).observe(hero);
  resize();
  requestAnimationFrame(paint);

  const lines = [...title.children];
  const glyphs = [];
  const nonsense = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789*+#=-';
  lines.forEach((line, lineIndex) => {
    const original = line.textContent;
    line.textContent = '';
    line.classList.add('title-line');
    for (const [index, letter] of [...original].entries()) {
      const span = document.createElement('span');
      span.className = letter === ' ' ? 'title-space' : 'title-glyph';
      span.textContent = letter === ' ' ? '\u00a0' : letter;
      span.style.setProperty('--hop', `${((hash(index, lineIndex) % 5) - 2) * .8}px`);
      span.style.setProperty('--tilt', `${((hash(index + 6, lineIndex) % 7) - 3) * .55}deg`);
      line.appendChild(span);
      if (letter !== ' ') glyphs.push({ span, letter, settle: .38 + (hash(index + 19, lineIndex + 2) % 55) / 100 });
    }
  });

  let scrambleAnimation = 0;
  function scrambleTitle() {
    if (reducedMotion.matches || !visible) return;
    cancelAnimationFrame(scrambleAnimation);
    const started = performance.now();
    let lastChange = -1;
    function frame(now) {
      const progress = clamp((now - started) / 1320, 0, 1);
      const change = Math.floor((now - started) / 54);
      if (change !== lastChange) {
        lastChange = change;
        glyphs.forEach((item, index) => {
          const settled = progress >= item.settle;
          item.span.textContent = settled ? item.letter : nonsense[(hash(index + change * 7, change + index) % nonsense.length)];
          item.span.classList.toggle('glitching', !settled);
        });
      }
      if (progress < 1) scrambleAnimation = requestAnimationFrame(frame);
      else glyphs.forEach(item => { item.span.textContent = item.letter; item.span.classList.remove('glitching'); });
    }
    scrambleAnimation = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = !!entries[0]?.isIntersecting; }, { threshold: .05 }).observe(hero);
  }
  title.addEventListener('mouseenter', scrambleTitle);
  title.addEventListener('click', scrambleTitle);
  setTimeout(scrambleTitle, 350);
  setInterval(() => { if (visible && !document.hidden) scrambleTitle(); }, 8200);
})();

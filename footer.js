/* Continuously shifting red/black pixel transitions. */
(() => {
  const footer = document.querySelector('.footer');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hash = (column, row, tick) => {
    let value = (column * 73856093) ^ (row * 19349663) ^ (tick * 83492791);
    value = Math.imul(value ^ (value >>> 16), 2246822519);
    return ((value ^ (value >>> 13)) >>> 0) / 4294967296;
  };
  function startMosaic(canvas, topColor, bottomColor, revealTop = false) {
    const context = canvas.getContext('2d', { alpha: revealTop });
    let width = 0;
    let height = 0;
    let visible = false;
    let lastDraw = -Infinity;

    function draw(now) {
      if (!width || !height) return;
      const columns = Math.max(28, Math.ceil(width / (width < 700 ? 11 : 17)));
      const cell = width / columns;
      const rows = Math.ceil(height / cell);
      const midpoint = height / cell / 2;
      const tick = Math.floor(now / 170);
      if (revealTop) context.clearRect(0, 0, width, height);
      else {
        context.fillStyle = bottomColor;
        context.fillRect(0, 0, width, height);
        context.fillStyle = topColor;
      }
      for (let column = 0; column < columns; column++) {
        const wave = Math.sin(column * .18 + now * .0012) * .74
          + Math.sin(column * .57 - now * .0009) * .38;
        const boundary = midpoint + wave;
        for (let row = 0; row < rows; row++) {
          const distance = row + .5 - boundary;
          let showTop = distance < -2.2;
          if (distance > -2.2 && distance < 2.4) {
            const chance = Math.max(.03, Math.min(.97, .54 - distance * .19));
            const stable = hash(column, row, 0);
            const moving = hash(column, row, tick);
            showTop = (stable * .55 + moving * .45) < chance;
          }
          if (revealTop && distance < -2.2) continue;
          if (revealTop) {
            if (showTop && distance < 0) continue;
            context.fillStyle = showTop ? topColor : bottomColor;
          } else if (!showTop) continue;
          context.fillRect(Math.floor(column * cell), Math.floor(row * cell), Math.ceil(cell + 1), Math.ceil(cell + 1));
        }
      }
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    }

    function animate(now) {
      requestAnimationFrame(animate);
      if (!visible || document.hidden || reducedMotion.matches || now - lastDraw < 125) return;
      lastDraw = now;
      draw(now);
    }
    new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = !!entries[0]?.isIntersecting; }, { threshold: 0 }).observe(canvas);
    } else visible = true;
    resize();
    requestAnimationFrame(animate);
  }

  startMosaic(document.querySelector('.hero-transition-mosaic'), '#080a0c', '#ed2d1d', true);
  startMosaic(footer.querySelector('.footer-mosaic'), '#ed2d1d', '#080a0c');
})();

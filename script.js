/* Decorative pixel transition. */
function addPixels(selector, seed, inverted = false) {
  const edge = document.querySelector(selector);
  let state = seed;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  const columns = 90;
  const rows = 7;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const likelihood = inverted ? 0.86 - row * .13 : 0.1 + row * .13;
      if (random() > likelihood) continue;
      const pixel = document.createElement('i');
      pixel.style.width = `${100 / columns + .06}%`;
      pixel.style.left = `${column * 100 / columns}%`;
      pixel.style.top = `${row * 100 / rows}%`;
      pixel.style.height = `${100 / rows + 1}%`;
      edge.appendChild(pixel);
    }
  }
}
addPixels('.pixel-edge-red', 10992, true);

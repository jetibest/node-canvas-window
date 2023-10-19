# node-canvas-window
node-canvas-window exports a Canvas to a browser window for Node.js

# Installation
```js
npm install canvas-window
```

# Example

Running the following code in NodeJS, should open a browser window with a dark grey background.
Within that background a rectangle is shown that alternates between a dark green and dark orange color.
When moving a pointer (mouse/touch) over the browser window, a small magenta rectangle is shown at its location.

```js
const { createWindow } = require('canvas-window');

const window = await createWindow({
  width: 800,
  height: 600,
  title: 'My Window'
});
// window may emit the following events:
//   - websocketOpen, websocketError, websocketClose
//   - exit
//   - pointerdown, pointermove, pointerup
//   - keydown, keyup

const ctx = window.context;
const model = {pointer: {x: 0, y: 0}, parity: false};

function repaint()
{
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = (model.parity = !model.parity) ? '#393' : '#963';
  ctx.fillRect(100, 100, 600, 400);
  
  ctx.fillStyle = '#f0f';
  ctx.fillRect(model.pointer.x - 10, model.pointer.y - 10, 20, 20);
  
  window.draw();
}

window.on('pointermove', e =>
{
  model.pointer.x = e.x;
  model.pointer.y = e.y;
  repaint();
});

setInterval(repaint, 500);

```

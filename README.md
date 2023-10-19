# node-canvas-window
node-canvas-window exports a Canvas to a browser window for Node.js

# Installation
```js
npm install canvas-window
```

The minimum version of Node.js required is 10.20.0 (from the [Canvas](https://github.com/Automattic/node-canvas) dependency).

# Usage

## Constructor

`createWindow([options])`
  - `width: number` width of the canvas in pixels. Defaults to `1280`.
  - `height: number` height of the canvas in pixels. Defaults to `720`.
  - `title: string` title of the browser window. Defaults to `'NodeJS Window'`.
  - `canvas: object` any implementation of the Canvas API. Defaults to a `createCanvas()` instance of `node-canvas`.
  - `context: string` the context to get from the canvas (i.e. `'2d'`, `'webgl'`, `'webgl2'`, `'webgpu'`, `'bitmaprenderer'`). Defaults to `'2d'`.
  - `context: object` any implementation of CanvasRenderingContext2D, WebGLRenderingContext, WebGL2RenderingContext, GPUCanvasContext, ImageBitmapRenderingContext, as long as these provide the `getImageData()` function. When this option has a valid context object, no default canvas is created.
  - `host: string` the hostname or address to bind the webserver to (use `'::'` to bind to all interfaces both IPv4 and IPv6 dual-stack). Defaults to the local loopback address (`'127.0.0.1'`).
  - `port: number` the port to make the webserver listen at (use `0` to let the system assign any available port). Defaults to `0`.

## Properties

All of the keys in options are also available in the `window` object.
All properties must be considered read-only to avoid unexpected trouble.

 - `websockets: object` an instance of Array containing the websockets currently connected to the webserver (typically just one).
 - `webserver: object` an instance of `http.createServer`.
 - `websocketserver: object` in instance of `ws.WebSocketServer`.
 - `state: string` indicates the current state. The value is either `'initializing'`, `'error'`, `'ready'`.

## Methods

 - `draw()` calls `drawContext` with the current window's context.
 - `drawContext(context)` calls `drawData` with the image data of the context (an instance of `Uint8ClampedArray`).
 - `drawData(object)` sends the object with image data to each connected websocket. The `object` must be an Uint8ClampedArray, Buffer, ArrayBuffer, or some other array-like type supported by `ws.send()`.

## Events

 - `websocketOpen` is emitted when a websocket is connected to the webserver.
 - `websocketError` is emitted when a websocket had an error.
 - `websocketClose` is emitted when a websocket is disconnected from the webserver. This could also mean that the browser window was closed without Javascript being able to report it. There is currently no mechanism to automatically reconnect a closed WebSocket in the browser.

 - `exit` is emitted when the browser window was closed. This is a good opportunity to call `process.exit(0)`.

The values of the properties in the following events are copied from their corresponding event in the browser (see [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) and [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent)).

 - `keydown` is emitted when a key was pressed in the browser window. Available properties are: `key`, `code`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey`, `repeat` (from the KeyboardEvent).
 - `keyup` is emitted when a key was released in the browser window. Available properties are: `key`, `code`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey`, `repeat` (from the KeyboardEvent).
 - `pointerdown` is emitted when a pointer was pressed in the browser window. Available properties are: `x`, `y`, `button`, `buttons`, `pointerId`, `pointerType`, `isPrimary`, `width`, `height`, `pressure`.
 - `pointermove` is emitted when a pointer moved in the browser window. Available properties are: `x`, `y`, `pointerId`, `pointerType`, `isPrimary`, `width`, `height`, `pressure`.
 - `pointerup` is emitted when a pointer was released in the browser window. Available properties are: `x`, `y`, `button`, `buttons`, `pointerId`, `pointerType`, `isPrimary`, `width`, `height`, `pressure`.


# Example

Running the following code in NodeJS, should open a browser window with a dark grey background.
Within that background a rectangle is shown that alternates between a dark green and dark orange color.
When moving a pointer (mouse/touch) over the browser window, a small magenta rectangle is shown at its location.

```js
const { createWindow } = require('canvas-window');

(async () =>
{
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
  
    ctx.fillStyle = model.parity ? '#393' : '#963';
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
  window.on('exit', e =>
  {
    // exit when browser window is closed (onbeforeunload)
    clearInterval(blink);
  });
  
  const blink = setInterval(() =>
  {
    model.parity = !model.parity;
    repaint();
  }, 500);
})();
```

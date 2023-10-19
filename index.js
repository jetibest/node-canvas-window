const EventEmitter = require('node:events');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const { createCanvas } = require('canvas');

function createWindow(options)
{
	options = options || {};
	
	const window = new EventEmitter();
	
	// set public read-only properties
	window.state = 'initializing';
	window.title = options.title || 'NodeJS Window';
	window.width = options.width || (typeof options.canvas === 'object' ? options.canvas.width : 0) || 1280;
	window.height = options.height || (typeof options.canvas === 'object' ? options.canvas.height : 0) || 720;
	if(typeof options.context === 'object' && typeof options.context.getImageData === 'function')
	{
		window.canvas = options.canvas || null;
		window.context = options.context;
	}
	else
	{
		window.canvas = options.canvas || createCanvas(window.width, window.height);
		window.context = window.canvas.getContext(options.context || '2d');
	}
	window.websockets = [];
	window.host = options.host || '127.0.0.1'; // '127.0.0.1' = local loopback address, '::' = all interfaces IPv4 and IPv6 dual-stack
	window.port = options.port || 0; // 0 = random port
	
	// initialize websocket and websocketserver
	window.webserver = http.createServer();
	window.websocketserver = new WebSocketServer({
		server: window.webserver
	});
	
	// some public functions for the Window class
	window.drawContext = function(ctx)
	{
		return this.drawData((ctx || this.context).getImageData(0, 0, this.width, this.height).data);
	};
	window.drawData = function(obj)
	{
		// obj is Uint8ClampedArray, Buffer, ArrayBuffer, or some array-like type
		for(var i=0;i<this.websockets.length;++i)
		{
			this.websockets[i].send(obj);
		}
	};
	window.draw = function()
	{
		this.drawContext(this.context);
	};

	function strtohtml(str)
	{
		return (str +'').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	
	return new Promise((resolve, reject) =>
	{
		window.webserver.on('request', (req, res) =>
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end(
				'<!DOCTYPE html>' +
				'<html>' +
				'<head>' +
					'<title>' + strtohtml(window.title) + '</title>' +
					'<style>' +
						'html,body{background-color: #000;color: #999;margin: 0;padding: 0;width: 100%;height: 100%;}' +
						'canvas{width: 100%;height: 100%;object-fit: contain;}' +
					'</style>' +
				'</head>' +
				'<body>' +
					'<canvas width="' + window.width + '" height="' + window.height + '"></canvas>' +
					'<script>' +
					'const canvas = document.querySelector("canvas");' +
					'const context = canvas.getContext("2d");' +
					'const ws = new WebSocket("ws://' + window.host + ':' + window.port + '");' +
					'ws.binaryType = "arraybuffer";' +
					'ws.onopen = function()' +
					'{' +
						'function sendEvent(e)' +
						'{' +
							'ws.send(JSON.stringify(e));' +
						'}' +
						'function createPointerEvent(e, opt)' +
						'{' +
							'return Object.assign({type: "event", pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, x: e.clientX, y: e.clientY, width: e.width, height: e.height, pressure: e.pressure}, opt);' +
						'}' +
						'function createKeyEvent(e, opt)' +
						'{' +
							// note: code is always respective to QWERTY-layout, regardless of the user keyboard layout
							'return Object.assign({type: "event", key: e.key, code: e.code, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, repeat: e.repeat}, opt);' +
						'}' +
						'canvas.onpointermove = function(e)' +
						'{' +
							'sendEvent(createPointerEvent(e, {name: "pointermove"}));' +
						'};' +
						'canvas.onpointerdown = function(e)' +
						'{' +
							'sendEvent(createPointerEvent(e, {name: "pointerdown", button: e.button, buttons: e.buttons}));' +
						'};' +
						'canvas.onpointerup = function(e)' +
						'{' +
							'sendEvent(createPointerEvent(e, {name: "pointerup", button: e.button, buttons: e.buttons}));' +
						'};' +
						'canvas.onkeydown = function(e)' +
						'{' +
							'sendEvent(createKeyEvent(e, {name: "keydown"}));' +
						'};' +
						'canvas.onkeyup = function(e)' +
						'{' +
							'sendEvent(createKeyEvent(e, {name: "keyup"}));' +
						'};' +
						'window.onbeforeunload = function(e)' +
						'{' +
							'sendEvent({type: "event", name: "exit"});' +
						'}' +
					'};' +
					'ws.onmessage = function(e)' +
					'{' +
						'context.putImageData(new ImageData(new Uint8ClampedArray(e.data), ' + window.width + ', ' + window.height + '), 0, 0);' +
					'};' +
					'ws.onclose = function(e)' +
					'{' +
						// todo: implement an automatic reconnection mechanism (?)
						'document.body.innerHTML = "<center><h1>Connection lost. Close this window.</h1></center>";' +
						'try { window.close(); } catch(err) {}' +
						'window.location.href = "about:blank";' +
					'};' +
					'</script>' +
				'</body>' +
				'</html>');
		});
		window.webserver.on('error', err =>
		{
			if(window.state === 'initializing')
			{
				window.state = 'error';
				reject(err);
			}
		});
		window.webserver.on('listening', async () =>
		{
			try
			{
				const open = (await import('open')).default;
				const addr = window.webserver.address();
				
				window.host = addr.address;
				window.port = addr.port;
				
				await open('http://' + (window.host === '::' ? 'localhost' : window.host) + ':' + window.port + '/');
				
				if(window.state === 'initializing')
				{
					window.state = 'ready';
					resolve(window);
				}
			}
			catch(err)
			{
				if(window.state === 'initializing')
				{
					window.state = 'error';
					reject(err);
				}
			}
		});
		window.webserver.on('close', () =>
		{
			window.emit('exit');
		});
		
		window.websocketserver.on('connection', websocket =>
		{
			websocket.on('error', err =>
			{
				window.emit('websocketError', err);
			});
			websocket.on('message', data =>
			{
				// received an event
				try
				{
					const obj = JSON.parse(data);
					if(obj.type === 'event')
					{
						if(obj.name === 'exit')
						{
							// note: consume the exit-event, and re-emit when webserver is actually closed
							window.webserver.close();
						}
						else
						{
							window.emit(obj.name, obj);
						}
					}
				}
				catch(err) {}
			});
			websocket.on('close', function()
			{
				for(var i=0;i<window.websockets.length;++i)
				{
					if(window.websockets[i] === websocket)
					{
						window.websockets.splice(i--, 1);
					}
				}
				
				window.emit('websocketClose', websocket);
			});
			
			window.websockets.push(websocket);
			window.emit('websocketOpen', websocket);
		});
		
		window.webserver.listen(window.port, window.host);
	});
}

module.exports = { createWindow };

var endpoint = 'ws://localhost:8000/';
var h1 = document.getElementsByTagName('h1')[0];
if (typeof window.reconnector == 'undefined') window.reconnector = 0;
var mouseX = 500, mouseY = 500;

window.wsClose = function (e) {
    h1.innerText = 'Ｄｉｓｃｏｎｎｅｃｔｅｄ．';
    if (reconnector) {
        clearInterval(reconnector);
        window.reconnector = 0;
    }
    if (!event.wasClean)
        window.reconnector = setInterval(window.connect, 3000);
    e.preventDefault();
};

window.wsError = function (e) {
    h1.innerText = 'Ｃｏｕｌｄ　ｎｏｔ　ｃｏｎｎｅｃｔ：' + e;
    if (!reconnector)
        window.reconnector = setInterval(window.connect, 3000);
};

window.wsMessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.t == 'c') {
        var span = document.createElement('span');
        span.className = 'c';
        span.innerText = msg.c;
        span.style.left = (msg.x / 1000 * window.innerWidth) + 'px';
        span.style.top = (msg.y / 1000 * window.innerHeight) + 'px';
        span.style.color = msg.k;
        var rot = 'rotate(' + msg.z + 'deg)';
        span.style.transform = rot;
        span.style.WebkitTransform = rot;
        span.style.msTransform = rot;
        document.body.appendChild(span);
        setTimeout(function () { span.remove(); }, 2000);
    } else {
        console.warn('>', msg);
    }
};

window.wsOpen = function (e) {
    if (window.reconnector) {
        clearInterval(reconnector);
        window.reconnector = 0;
    }
    h1.innerText = 'Ｃｏｎｎｅｃｔｅｄ．';
};

window.connect = function () {
    if (window.ws) { try { window.ws.close(); } catch (e) {} }
    window.ws = new WebSocket(endpoint, 'tincan');
    ws.onclose = function (e) { window.wsClose(e) };
    ws.onerror = function (e) { window.wsError(e) };
    ws.onmessage = function (e) { window.wsMessage(e); };
    ws.onopen = function (e) { window.wsOpen(e); };
};
connect();

if (window.onKey)
    document.removeEventListener('keypress', window.onKey);
window.onKey = function (event) {
    event.preventDefault();
    if (event.key && ws.readyState == WebSocket.OPEN) {
        ws.send(JSON.stringify({t: 'c', c: event.key, x: mouseX, y: mouseY}));
    } else {
        console.warn(event.key);
    }
};
document.addEventListener('keypress', window.onKey);

if (window.onCursor)
    document.removeEventListener('mousemove', window.onCursor);
window.onCursor = function (event) {
    mouseX = Math.round(event.clientX / window.innerWidth * 1000);
    mouseY = Math.round(event.clientY / window.innerHeight * 1000);
};
document.addEventListener('mousemove', window.onCursor);

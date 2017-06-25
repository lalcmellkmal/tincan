let fs = require('fs');
let join = require('path').join;

let CLIENT_CTR = 0;
let CLIENTS = {};
let CHAR_CTR = 0; // wraps at 9999

let server = require('http').createServer(function (req, resp) {
    if (req.url == '/') {
        fs.readFile(join(__dirname, 'index.html'), function (err, buf) {
            if (err) throw err;
            resp.writeHead(200, {'Content-Type': 'text/html; charset=utf8', 'Cache-Control': 'no-cache'});
            resp.end(buf);
        });
    } else if (req.url == '/app.js') {
        fs.readFile(join(__dirname, 'app.js'), function (err, buf) {
            if (err) throw err;
            resp.writeHead(200, {'Content-Type': 'application/javascript; charset=utf8', 'Cache-Control': 'no-cache'});
            resp.end(buf);
        });
    } else {
        resp.writeHead(404, {'X-IDK': 'lol'});
        resp.end('404');
    }
});

let port = 8000;
if (typeof port == 'string') {
    try { fs.unlinkSync(port) } catch (e) {}
}
server.listen(port, function () {
    console.log('Listening on :' + port);
});

let ws = new (require('websocket').server)({
    httpServer: server,
    autoAcceptConnections: false,
});

ws.on('request', function (req) {
    if (!/^https?:\/\/(localhost|doushio.com)(:80|:443|:8000)?$/.test(req.origin)) {
        req.reject();
        console.warn('rejected WS from ' + JSON.stringify(req.origin));
        return;
    }

    let sock = req.accept('tincan', req.origin);
    let ip = sock.remoteAddress;
    let id = ++CLIENT_CTR;
    CLIENTS[id] = {sock: sock};

    const PI = 3.1415926535;
    var angle = 0;
    var colorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    var color = COLORS[colorKey];
    let prevIds = new Array(25);
    var cursor = 0;
    console.log('client #' + id + ' from ' + ip + ' (' + colorKey + ')');

    sock.on('message', function (msg) {
        if (msg.type != 'utf8') return;
        var json;
        try {
            json = JSON.parse(msg.utf8Data);
        } catch (e) {
            console.error('bad json:', e);
            return;
        }
        if (json.t === 'c' && typeof json.c == 'string') {
            var c = json.c;
            if (c === 'Backspace') {
                var pos = cursor - 1;
                if (pos < 0) pos = 24;
                let id = prevIds[pos];
                if (id) {
                    prevIds[pos] = 0;
                    cursor = pos;
                    angle -= 0.25;
                    broadcast({t: 'd', i: id});
                }
                return;
            } else if (c === 'Enter') {
                angle += PI / 2;
                return;
            } else if (c.length && typeof json.x == 'number' && typeof json.y == 'number') {
                // remember this character
                let id = ++CHAR_CTR;
                if (CHAR_CTR >= 9999) CHAR_CTR = 0;
                prevIds[cursor++] = id;
                if (cursor >= 25) cursor = 0;

                c = c.slice(0, 2);
                angle += 0.2 + Math.random() * 0.1;
                if (angle > 2*PI)
                    angle -= 2*PI;
                let radius = 100 + Math.random() * 10;
                let x = Math.round(json.x - Math.cos(angle) * radius);
                let y = Math.round(json.y - Math.sin(angle) * radius * 1.35);
                let z = Math.round(angle / PI * 180 - 90);
                broadcast({t: 'c', c: c, i: id, x: x, y: y, z: z, k: color});
                return;
            }
        }

        console.warn('client #' + id + ' sent: ' + JSON.stringify(json));
    });

    sock.once('close', function (reason) {
        console.log('client #' + id + ' gone: ' + JSON.stringify(reason));
        delete CLIENTS[id];
    });
});

function broadcast(msg) {
    msg = JSON.stringify(msg);
    for (var id in CLIENTS) {
        CLIENTS[id].sock.send(msg);
    }
}

var COLORS = {
    ming: '#ee6e7b',
    turquoise: '#1abc9c',
    emerald: '#2ecc71',
    belize: '#2980b9',
    wisteria: '#8e44ad',
    midnightBlue: '#2c3e50',
    burntOrange: '#d35400',
    pomegranate: '#c0392b',
    greenPostIt: '#01e6c0',
    cabaret: '#d2527f',
    copper: '#c47d31',
    cyan: '#20e6fa',
    tan: '#c5b08e',
};
var COLOR_KEYS = Object.keys(COLORS);

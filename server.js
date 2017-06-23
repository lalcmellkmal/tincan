let fs = require('fs');
let join = require('path').join;

let CLIENT_CTR = 0;
let CLIENTS = {};

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
server.listen(port, function () {
    console.log('Listening on :' + port);
});

let ws = new (require('websocket').server)({
    httpServer: server,
    autoAcceptConnections: false,
});

ws.on('request', function (req) {
    if (!/^https?:\/\/(localhost|doushio.com):(80|443|8000)$/.test(req.origin)) {
        req.reject();
        console.warn('rejected WS from ' + JSON.stringify(req.origin));
        return;
    }

    let sock = req.accept('tincan', req.origin);
    let ip = sock.remoteAddress;
    let id = ++CLIENT_CTR;
    CLIENTS[id] = {sock: sock};
    console.log('client #' + id + ' from ' + ip);

    var angle = 0;

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
            let c = json.c.slice(0, 2);
            if (c.length && json.x && json.y) {
                angle += 0.3 + Math.random() * 0.3;
                let radius = 60 + Math.random() * 20;
                let x = Math.round(json.x - Math.cos(angle) * radius);
                let y = Math.round(json.y - Math.sin(angle) * radius * 1.35);
                broadcast({t: 'c', c: c, x: x, y: y});
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
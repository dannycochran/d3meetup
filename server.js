var http = require('http'),
    express = require('express'),
    app = express();

app.use(express.static(__dirname ));
app.get('/webgl', function (req, res) { res.sendfile('webgl.html'); });
app.get('/svg', function (req, res) { res.sendfile('svg.html'); });
app.get('/sigma', function (req, res) { res.sendfile('sigma.html'); });

app.get('*', function (req, res) { res.redirect('/webgl'); });

http.createServer(app).listen(3000, function () { console.log('Web server listening on port 3000'); });

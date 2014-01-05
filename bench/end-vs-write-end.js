// When calling .end(buffer) right away, this triggers a "hot path"
// optimization in http.js, to avoid an extra write call.
//
// However, the overhead of copying a large buffer is higher than
// the overhead of an extra write() call, so the hot path was not
// always as hot as it could be.
//
// Verify that our assumptions are valid.

var http = require(process.argv[2]);

var types = ['asc', 'utf', 'buf'];
var kbs = [64, 128, 256, 1024];
var cs = [100];
var methods = ['write', 'end  '] // two spaces added to line up each row
  
var chunks = {};
kbs.forEach(function (k) {
  types.forEach(function (t) {
    var len = k * 1024;
    var chunk;
        
    switch (t) {
      case 'buf':
        chunk = new Buffer(len);
        chunk.fill('x');
        break;
      case 'utf':
        encoding = 'utf8';
        chunk = new Array(len / 2 + 1).join('ü');
        break;
      case 'asc':
        chunk = new Array(len + 1).join('a');
        break;
    }
    chunks[t + '/' + k] = chunk;
  });
});

var server = http.createServer(function (req, res) {
  var parts = req.url.split('/');
  var t = parts[1], k = parts[2], c = parts[3], m = parts[4];
  var chunk = chunks[t + '/' + k];
  
  if (m === 'write') {
    res.write(chunk);
    res.end();
  }
  else {
    res.end(chunk);
  }
});

server.listen(0, function () {
  var href = 'http://localhost:' + server.address().port;
  types.forEach(function (t) {
    kbs.forEach(function (k) {
      cs.forEach(function (c) {
        methods.forEach(function (m) {
          console.log([ href, t, k, c, m ].join('/'));
        });
      });
    });
  });
});

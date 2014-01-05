// When calling .end(buffer) right away, this triggers a "hot path"
// optimization in http.js, to avoid an extra write call.
//
// However, the overhead of copying a large buffer is higher than
// the overhead of an extra write() call, so the hot path was not
// always as hot as it could be.
//
// Verify that our assumptions are valid.

var http = require(process.argv[2]);

var chunk = new Buffer(10000);
chunk.fill('8');

var server = http.createServer(function(req, res) {
  var n = req.url.slice(1);
  send(n);
  
  function send(left) {
    if (left === 0) return res.end();
    res.write(chunk);
    setTimeout(function() {
      send(left - 1);
    }, 0);
  }
});

server.listen(0, function () {
  var href = 'http://localhost:' + server.address().port;
  console.log(href + '/1');
  console.log(href + '/5');
  console.log(href + '/10');
});

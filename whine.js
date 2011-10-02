var fs = require('fs');
var http = require('http');

var comments = null;
var data = "";

function init_comments() {
  fs.readFile('comments.json', "utf-8", function (err, data) {
    if (err) {
      throw err;
    }
    comments = eval(data.toString());
    comments = index(comments);
    console.log(comments);
  });
}

/**
 * Transform the |comments| data structure to have the article name as key.
 */
function index(comments) {
  var indexed = {};
  for(var i = 0; i < comments.length; i++) {
    var article = comments[i].article;
    delete comments[i].article;
    if (indexed[article] == undefined) {
      indexed[article] = [];
    }
    indexed[article].push(comments[i]);
  }
  return indexed;
}

function get_comments(article) {
  return comments[article];
}

function get_article(request) {
  return request.url.substr(1);
}

init_comments();
http.createServer(function (request, response) {
  // Get comments
  if (request.method === "GET") {
    var article = get_article(request);
    var comments = get_comments(article);
    var data = JSON.stringify(comments);
    var content_length = 0;
    if (data) {
      content_length = data.length;
    }
    response.writeHead(200, {
      "Content-Type": "text/json",
      "Content-Length": content_length});
    response.end(data);
  } else if (request.method === "POST") {
    // problem if concurrent submission ?
    request.addListener("data", function(chunk) {
      data += chunk.toString("utf8");
    });
    request.addListener("end", function() {
      var obj = eval(data.toString("utf8"));
      console.log(obj);
    });
  }
}).listen(8125);

console.log('Server running at http://127.0.0.1:8125/');

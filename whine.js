var fs = require('fs');
var http = require('http');

var comments = null;



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
    response.writeHead(200, {"Content-Type": "text/json"});
    response.end(JSON.stringify(comments));
  } else if (request.method === "POST") {
    throw "not implemented";
  }
}).listen(80);

console.log('Server running at http://127.0.0.1:8125/');

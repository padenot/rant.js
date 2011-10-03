var fs = require('fs');
var http = require('http');
var url = require('url');
var qs = require('querystring');

var comments = null;
var saveTimeout = null;
// [
//    {client: client, data: "data reveived for now"},
//    {client: client, data: "data reveived for now"},
//    {client: client, data: "data reveived for now"},
// ]
var clients = [];
var data = "";

function init_comments() {
  fs.readFile('comments.json', "utf-8", function (err, data) {
    if (err) {
      throw err;
    }
    comments = JSON.parse(data.toString());
    comments = index(comments);
    deindex(comments);
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

function deindex(comments) {
  var deindexed = [];
  for (var i in comments) {
    for (var j = 0; j < comments[i].length; j++) {
      deindexed.push(comments[i][j]);
      deindexed[deindexed.length-1].article = i;
    }
  }
  return deindexed;
}

function get_comments(article) {
  return comments[article];
}

function get_article(request) {
  return url.parse(request.url).pathname.substr(1);
}

function saveComments() {
  fs.writeFile("comments.json", JSON.stringify(deindex(comments)), function (err) {
    if (err) throw err;
  });
}

function addComment(obj) {
  if (saveTimeout != null) {
    clearTimeout(saveTimeout);
  }
  if (obj.author && obj.email && obj.content) {
    if (obj.author.length == 0 || obj.email.length == 0 || obj.content.length == 0) {
      return;
    }
    var article = obj.article;
    delete obj.article;
    if (!comments[article]) {
      comments[article] = [];
    }
    comments[article].push(obj);
    saveTimeout = setTimeout(saveComments, 500);
  }
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
    request.addListener("data", function(chunk) {
      if (!clients[request.connection]) {
        clients[request.connection] = "";
      }
      if (chunk) {
        clients[request.connection] += chunk;
      }
    });
    request.addListener("end", function() {
      if (clients[request.connection]) {
        var data = JSON.parse(clients[request.connection]);
        addComment(data);
        delete clients[request.connection];
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end();
      } else {
      }
    });
  } else {
    console.log("rejected");
  }
}).listen(8125);

console.log('Server running at http://127.0.0.1:8125/');

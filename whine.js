var fs = require('fs');
var http = require('http');

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
    console.log(comments);
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
  console.log(deindexed);
  return deindexed;
}

function get_comments(article) {
  return comments[article];
}

function get_article(request) {
  return request.url;
}

function saveComments() {
  fs.writeFile(JSON.stringify(deindex(comments)), "comments.json", function (err) {
    if (err) throw err;
    console.log('comments.json saved');
  });
}

function addComment(obj) {
  if (saveTimeout != null) {
    clearTimeout(saveTimeout);
  }
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

init_comments();
http.createServer(function (request, response) {
  // Get comments
  if (request.method === "GET") {
    console.log(request.url);
    var article = get_article(request);
    var comments = get_comments(article);
    console.log(comments);
    var data = JSON.stringify(comments);
    console.log(data);
    var content_length = 0;
    if (data) {
      content_length = data.length;
    }
    response.writeHead(200, {
      "Content-Type": "text/json",
      "Content-Length": content_length});
    response.end(data);
  } else if (request.method === "POST") {
    console.log("POST");
    request.addListener("data", function(chunk) {
      if (!clients[request.connection]) {
        clients[request.connection] = "";
      }
      if (chunk) {
        clients[request.connection] += chunk.toString("utf8");
      }
      console.log(chunk);
    });
    request.addListener("end", function() {
      if (data) {
        var obj = JSON.parse(data.toString("utf8"));
        addComment(obj);
        delete clients[request.connection];
        console.log(obj);
      } else {
        console.log("data : " + data);
      }
    });
  } else {
    console.log("rejected");
  }
}).listen(8125);

console.log('Server running at http://127.0.0.1:8125/');

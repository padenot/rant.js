var fs = require('fs');
var http = require('http');
var url = require('url');

// [
//    {client: client, data: "data reveived for now"},
//    {client: client, data: "data reveived for now"},
//    {client: client, data: "data reveived for now"},
// ]
function Comments() {
  this.comments = null;
  this.saveTimeout = null;
  this.index = function(comments) {
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
  };

  this.deindex = function(comments) {
    var deindexed = [];
    for (var i in comments) {
      for (var j = 0; j < comments[i].length; j++) {
        deindexed.push(comments[i][j]);
        deindexed[deindexed.length-1].article = i;
      }
    }
    return deindexed;
  };

  this.init = function() {
    var _this = this;
    fs.readFile('comments.json', "utf-8", function (err, data) {
      if (err) {
        throw err;
      }
      _this.comments = JSON.parse(data.toString());
      _this.comments = _this.index(_this.comments);
    });
  };

  this.canonicalize_url = function(url) {
    var split = url.split('/');
    var nonblank = [];
    for(var i = 0; i < split.length; i++) {
      if (split[i] != "") {
        nonblank.push(split[i]);
      }
    }
    return "/" + nonblank.join('/')
  }

  this.get_comments = function(article) {
    return this.comments[this.canonicalize_url(article)];
  };

  this.add_comment = function(comment) {
    /* Reset the timer */
    if (this.saveTimeout != null) {
      clearTimeout(this.saveTimeout);
    }
    if (comment.author && comment.email && comment.content) {
      if (comment.author.length == 0 || comment.email.length == 0 || comment.content.length == 0) {
        return;
      }
      var article = comment.article;
      delete comment.article;
      if (!this.comments[article]) {
        this.comments[article] = [];
      }
      this.comments[article].push(comment);
      var _this = this;
      this.saveTimeout = setTimeout(function() {
        fs.writeFile("comments.json", JSON.stringify(_this.deindex(_this.comments)), function (err) {
        if (err)
          throw err;
        console.log("comments saved");
        });
      }, 500);
    }
  };
}

function get_article(request) {
  return url.parse(request.url).pathname.substr(1);
}

function process_get(request, response) {
    var article = get_article(request);
    var c = comments.get_comments(article);
    var data = JSON.stringify(c);
    var content_length = 0;
    if (data) {
      content_length = data.length;
    }
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": content_length});
    response.end(data);
}

function process_post(request, response) {
  var chunks = "";
  request.addListener("data", function(chunk) {
    chunks += chunk;
  });

  request.addListener("end", function() {
    try {
      var comment = JSON.parse(chunks);
    } catch (e) {
      return;
    }
    if (comment.author && comment.email && comment.content) {
      comments.add_comment(comment);
    }
    response.writeHead(200, {});
    response.end();
  });
}

var comments = new Comments();
comments.init();

http.createServer(function (request, response) {
  switch(request.method) {
    case "GET" :
      process_get(request, response);
      break;
    case "POST":
      process_post(request, response);
      break;
    default:
      console.log("rejected");
      break;
  }
}).listen(8125);

console.log('Server running at http://127.0.0.1:8125/');

var fs = require('fs');
var http = require('http');
var url = require('url');
var spawn = require('child_process').spawn;
var md = require('markdown').Markdown;

/* Compute md5sum of the first argument */
function md5sum(data, callback) {
  md5    = spawn('md5sum', []);

  md5.stdout.on('data', function (data) {
    callback("", data.toString().split(' ')[0]);
  });

  md5.stderr.on('data', function (data) {
    callback(data, "");
  });

  md5.stdin.write(data);
  md5.stdin.end();
}

function Comments() {
  this.comments = null;
  this.saveTimeout = null;
  /* Indexed using the article as key */
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

  /* Stored using a json array */
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

  /* Read all comments from file on startup */
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

  /* Remove multiple consecutive slashes, and put the path
   * in the form /dir/dir */
  this.canonicalize_path = function(path) {
    var split = path.split('/');
    var nonblank = [];
    for(var i = 0; i < split.length; i++) {
      if (split[i] != "") {
        nonblank.push(split[i]);
      }
    }
    return "/" + nonblank.join('/')
  }

  /* Get the comments for the associated article */
  this.get_comments = function(article) {
    var c = this.comments[this.canonicalize_path(article)];
    for (var i = 0; i < c.length; i++) {
      delete c[i].email;
    }
    return c;
  };

  /* Add a comment. Write the data after 500ms on incactivity, to avoid smashing
   * my poor VPN hard drive */
  this.add_comment = function(comment) {
    /* Reset the timer */
    if (this.saveTimeout != null) {
      clearTimeout(this.saveTimeout);
    }
    var article = comment.article;
    delete comment.article;
    if (!this.comments[article]) {
      this.comments[article] = [];
    }
    comment.content = md(comment.content, "strong|a|em|sup|sub|strike|ul|code|li|ol|p")
    this.comments[article].push(comment);
    var _this = this;
    this.saveTimeout = setTimeout(function() {
      fs.writeFile("comments.json", JSON.stringify(_this.deindex(_this.comments)), function (err) {
        if (err)
        throw err;
      console.log("comments saved");
      });
    }, 500);
  };
}

/* Get the article from a request */
function get_article(request) {
  return url.parse(request.url).pathname.substr(1);
}

/* Process a GET request, to load the comments */
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

/* Process a POST request, to add a comment. This function computes the mp5sum
 * of the mail to be able to send it back for gravatar display. */
function process_post(request, response) {
  var chunks = "";
  request.addListener("data", function(chunk) {
    chunks += chunk;
  });

  request.addListener("end", function() {
    try {
      var comment = JSON.parse(chunks);
    } catch (e) {
      console.log(e);
      return;
    }
    // XXX Check email ?
    if (comment.author && comment.email && comment.content &&
      comment.author.length < 30 && comment.email.length < 254 &&
      comment.content.length < 8000) {
      md5sum(comment.email, function(err, hash) {
        if (!err) {
          comment.email_hash = hash;
          comments.add_comment(comment);
          response.writeHead(200, {
            "Content-Type": "application/json",
            "Content-Length": hash.length});
          response.end(hash);
        } else {
          console.log (err);
        }
      });
    }
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

console.log('Server running on port 8125.');

var fs = require('fs');
var http = require('http');
var url = require('url');
var spawn = require('child_process').spawn;
var md = require('node-markdown').Markdown;

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

/** A storage backend which uses a JSON file for storing data **/
function JSONBackend() {
  this.filename = "comments.json";
  this.saveTimeout = null;
  this.comments = null;
}

/* Indexed using the article as key */
JSONBackend.prototype.index = function(comments) {
  var indexed = {};
  for(var i = 0; i < comments.length; i++) {
    var article = comments[i].article;
    if (indexed[article] === undefined) {
      indexed[article] = [];
    }
    indexed[article].push(comments[i]);
  }
  return indexed;
};

/* Not indexed, list of comments */
JSONBackend.prototype.deindex = function(comments) {
  var deindexed = [];
  for (var i in comments) {
    for (var j = 0; j < comments[i].length; j++) {
      deindexed.push(comments[i][j]);
      deindexed[deindexed.length-1].article = i;
    }
  }
  return deindexed;
};

/**
 * Load the data from a json file.
 * callback param : err, data
 */
JSONBackend.prototype.load = function(callback) {
  var _this = this;
  fs.readFile(this.filename, "utf-8", function (err, data) {
    if (err) {
      callback(err, null);
    }
    var comments = JSON.parse(data);
    console.log("Loading " + comments.length + " comments from " + _this.filename);
    _this.comments = _this.index(comments);
    callback(null, comments);
  });
};

/**
 * Save the data from the file.
 * calback param : err
 */
JSONBackend.prototype.save = function(comments, callback) {
    /* Reset the timer */
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
    }

    var _this = this;
    this.saveTimeout = setTimeout(function() {
      fs.writeFile(_this.filename, JSON.stringify(_this.deindex(_this.comments)), function (err) {
        if (err) callback(err);
        console.log("comments saved to " + _this.filename);
      });
    }, 500);
};

JSONBackend.prototype.get_recent = function(count) {
  var all = this.deindex(this.comments);
  if (all.length < count) {
    c = all;
  } else {
    c = [];
    for (i = all.length - count; i < all.length; i++) {
      c.push(all[i]);
    }
  }
  return c;
};

JSONBackend.prototype.get = function(key) {
  var comments = this.comments[key];
  return comments.length ? comments : [];
};

JSONBackend.prototype.get_all = function() {
  var comments = this.comments;
  return comments.length ? comments : [];
};

JSONBackend.prototype.add = function(comment) {
  if (! this.comments[comment.article]) {
    this.comments[comment.article] = [];
  }
  this.comments[comment.article].push(comment);
  this.save(function(err) {
    console.log("saving error (backend : JSON, filename : "+ this.filename +")");
  });
};

function get_mime(ext) {
  var mime = {
    "js" : "text/javascript",
    "css" : "text/css",
    "svg" : "image/svg"
  };
  return mime[ext];
}

/* Remove multiple consecutive slashes, and put the path
 * in the form /dir/dir */
function canonicalize_path (path) {
  var split = path.split('/');
  var nonblank = [];
  for(var i = 0; i < split.length; i++) {
    if (split[i] !== "") {
      nonblank.push(split[i]);
    }
  }
  return "/" + nonblank.join('/');
}


function Comments(backend) {
  this.comments = null;
  this.backend = backend;

  /* Read all comments from file on startup */
  this.init = function() {
    var _this = this;
    backend.load(function(err, data) {
      _this.comments = data;
    });
  };

  /* Get the comments for the associated article */
  /* If articles == "recent", get the recent comments written */
  /* If articles == "*", get all comments written */
  this.get_comments = function(article) {
    var c,i;
    switch(article) {
      case "/*":
        //c = this.backend.get_all();
        c = [];
        break;
      case "/recent":
        c = this.backend.get_recent(4);
        break;
      default:
        c = this.backend.get(article);
        break;
    }

    console.log(c);
    c.apply(function(o) {
      o.email = undefined;
    });
    ////XXX create a filter method.
    //if (c) {
      //for (i = 0; i < c.length; i++) {
        //delete c[i].email;
      //}
    //}
    return c;
  };

  this.validate_input = function(comment) {
    return comment.author &&
           comment.email &&
           comment.content &&
           comment.author.length < 30 &&
           comment.email.length < 254 &&
           comment.content.length < 8000;
  };

  this.add_comment = function(comment, callback) {
    var _this = this;
    if (this.validate_input(comment)) {
      md5sum(comment.email, function(err, hash) {
        if (!err) {
          comment.email_hash = hash;
          comment.content = md(comment.content, "strong|a|em|sup|sub|strike|ul|code|li|ol|p");
          var data = JSON.stringify(comment);
          callback(undefined, data);
          _this.backend.add(comment);
        } else {
          callback(err, undefined);
        }
      });
    }
  };
}

/* Get the article from a request */
function get_article(request) {
  return url.parse(request.url).pathname.substr(1);
}

function is_asset(url) {
  switch(url) {
    case "/throbber.svg":
    case "/error.svg":
    case "/embed.js":
    case "/rant.css":
      return true;
    default:
      return false;
  }
}

/* Process a GET request, to load the comments */
function process_get(request, response) {
  var url = canonicalize_path(request.url);
  if (is_asset(url)){
    send_file(url, response);
  } else {
    var article = url;
    var c = comments.get_comments(article);
    var data = JSON.stringify(c);

    var content_length = 0;
    if (data) {
      content_length = Buffer.byteLength(data, 'utf8');
    }
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": content_length
    });

    response.end(data, 'utf-8');
  }
}

/* Process a POST request, to add a comment. This function computes the mp5sum
 * of the mail to be able to send it back for gravatar display. */
function process_post(request, response) {
  var chunks = "";
  request.addListener("data", function(chunk) {
    chunks += chunk;
  });

  var comment;
  request.addListener("end", function() {
    try {
      comment = JSON.parse(chunks);
    } catch (e) {
      console.log("JSON parse error " + e);
      return;
    }
    comments.add_comment(comment, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data, 'utf8')});
        response.end(data);
      }
    });
  });
}

Array.prototype.apply = function(operation) {
  for (var i = 0; i < this.length; i++) {
    operation(this[i]);
  }
};

//function apply(array, member, func) {
  //for (var i = 0; i < array.length; i++) {
    //func(array[i][member]);
  //}
//}

//function delete_member(array, members) {
  //apply(array, member, function(element) {
    //element = undefined;
  //});
//}

var comments = new Comments(new JSONBackend());
comments.init();

function send_file(url, response) {
  // get rid of the initial /
  url = url.substr(1);
  var extension = url.split('.').pop();
  var mime = get_mime(extension);
  fs.readFile(url, "utf-8", function (err, data) {
    if (err) {
      console.log(err);
    }
    response.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": Buffer.byteLength(data, 'utf8')});
    response.end(data);
  });
}

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

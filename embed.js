(function() {
/**
 * jQueryish selectors
 */
function $(query, root) {
  if (root)
    return root.querySelector(query);
  return document.querySelector(query);
}

function $$(query, root) {
  if (root)
    return root.querySelectorAll(query);
  return document.querySelectorAll(query);
}


function getPath() {
  /* http://paul.cx/plip/plop
   * → ['http:', '', paul.cx, 'plip', plop'] 
   * → [plip, plop]
   * → /plip/plop
   */
  var url = String(window.location).split('/');
  url.splice(0, 3);
  var article_url = canonicalizePath(url.join('/'));
  return article_url;
}

/* Return a two elements arrays : ['dd/mm/yyyy', 'hh:mm']
 */
function formatDate(ms) {
  var str = ["",""];
  var date = new Date(ms);
  var day = String(date.getDay());
  str[0] += day.length == 1 ? "0"+day : day;
  str[0] += "/";
  var month = String(date.getMonth());
  str[0] += month.length == 1 ? "0"+month : month;
  str[0] += "/";
  str[0] += date.getFullYear();
  var hours = String(date.getHours());
  str[1] += hours.length == 1 ? "0"+hours : hours;
  str[1] += ":";
  var minutes = String(date.getMinutes());
  str[1] += minutes.length == 1 ? "0"+minutes : minutes;
  return str;
}

/* Remove multiple consecutive slashes, and put the path
 * in the form /dir/dir */
function canonicalizePath(path) {
  var split = path.split('/');
  var nonblank = [];
  for(var i = 0; i < split.length; i++) {
    if (split[i] != "") {
      nonblank.push(split[i]);
    }
  }
  return "/" + nonblank.join('/')
}

/* Shows a red box at the top of the screen */
function showError(error_text, where) {
  var errorMessage = createElement('div', 'errorMessage errorGlow');
  errorMessage.className = "errorMessage errorGlow";
  errorMessage.innerHTML = error_text;
  where.appendChild(errorMessage);
  setTimeout(function() {
    errorMessage.parentNode.removeChild(errorMessage);
  }, 4000);
}

/**
 *  url : the url to request
 *  method : the method to use
 *  data : the data to send (string)
 *  onsuccess : called in case of success (arg: the data received).
 *  onerror : called in case of error (e.target.status for the error)
 *  onprogress : get the progress (e.position, e.totalSize are available)
 *  onload : called when the transfer is complete
 *  onabort : called when the transfer has been canceled.
 */
function XHR(url, method, data, onsuccess, onfailure, onprogress, onload, onabort) {
  var request = new XMLHttpRequest();
  // Ten seconds is ought to be enough for anybody.
  var xhrtimeout = setTimeout(onfailure, 10000);
  request.addEventListener("progress", onprogress, false);
  request.addEventListener("load", onprogress, false);
  request.addEventListener("error", onfailure, false);
  request.addEventListener("abort", onabort, false);
  request.addEventListener("readystatechange", function (e) {
    if (request.readyState == 4) {
      if (request.status == 200) {
        clearTimeout(xhrtimeout);
        onsuccess(request.responseText);
      } else {
        onfailure(e);
      }
    }
  });

  request.open(method, url, true);
  request.send(data);
}

/**
 * Get the value of all the inputs, except the submits.
 */
function getDataFromForm(form) {
  var inputs = $$("input:not([type=submit]), textarea", form);
  var json = {};
  for(var i = 0; i < inputs.length; i++) {
    json[inputs[i].name] = inputs[i].value;
  }
  return json;
}

/**
 * Create an element with a classname and a content.
 */
function createElement(type, className, html) {
  var e = document.createElement(type);
  e.className = className || "";
  e.innerHTML = html || "";
  return e;
}

/**
 * Get a throbber.
 */
function get_throbber() {
  var t = createElement('img', 'throbber');
  t.src = script_url+"throbber.svg";
  t.width = 32;
  t.height = 32;
  return t;
}

/**
 * Remove a throbber.
 */
function remove_throbber(t) {
  t.parentNode.removeChild(t);
}

var WhineDefaultConfig = {
  photos: true,
  dates: true,
  name : "postComments",
  commentsTitle : "Commentaires",
  form : {
    name : {
      ph : "Nom (requis)",
      title : "Nom"
           },
    email : {
      ph : "Email (requis)",
      title : "Email"
            },
    link : {
      ph : "Lien",
      title : "Lien"
           },
    content : {
      ph : "C'est à vous… Essayez de ne pas écrire de bétises. Notez qu'un sous ensemble de Markdown plus ou moins logique permet de mettre en forme votre commentaire.",
      title : "Contenu"
           }
  }
};

function CommentArea(config) {
  this.config = config;
  this.display = null;
  this.form = null;
  this.root = config.root;
  /**
   * From a root element, create a comment zone.
   * <div>
   * </div>
   * →
   * <div class="comments">
   *  <div class="commmentsDisplay">
   *  </div>
   *  <div class="commentsForm">    // only if config.form
   *  </div>                        // is true.
   * </div>
   */
  this.init_comment_zone = function() {
    var css=createElement("link");
    css.setAttribute("rel", "stylesheet");
    css.setAttribute("type", "text/css");
    css.setAttribute("href", this.config.url+"whine.css");
    $('head').appendChild(css);

    /* Comments display */
    this.config = config;
    if (this.config.root != null) {
    } else {
      throw "No root set in the configuration";
    }
    this.display = createElement('div', 'commentsDisplay');
    var title = createElement('h1', "", this.config.commentsTitle);

    this.display.appendChild(title);
    this.display.appendChild(get_throbber());

    this.root.appendChild(this.display);

    /* Comments form */
    this.form = createElement('div', 'commentsForm');
    var form = createElement('form');
    if (this.config.form) {
      // XXX Fieldset ?
      var cf = this.config.form;
      form.innerHTML= '<div class="commentsInfos">'+
          '<input name="author" title="'+cf.name.title+'" class="commentsFormName" type="text" placeholder="'+cf.name.ph+'" required="true">'+
          '</input>'+
          '<input name="email" title="'+cf.email.title+'" class="commentsFormEmail" type="email" placeholder="'+cf.email.ph+'" required="true">'+
          '</input>'+
          '<input name="link" title="'+cf.link.title+'" class="commentsFormLink" type="url" placeholder="'+cf.link.ph+'">'+
          '</input>'+
        '</div>'+
        '<textarea name="content" title="'+cf.content.title+'" class="commentsFormContent" placeholder="'+cf.content.ph+'" required="true">'+
        '</textarea>'+
        '<input type="submit" class="commentsFormSubmit" value="'+cf.submit.value+'"></input>'+
       '</div>';
      this.form.appendChild(form);
      this.root.appendChild(this.form);
      var _this = this;
      this.form.addEventListener('submit', function(e) {
        e.preventDefault();
        (_this.send_comment.bind(_this))();
      }, false);
    }

    /* Get the comments for this page */
    var _this = this;
    var url = this.config.url + getPath();
    console.log(url);
    XHR(url, "GET", null, function(data) {
      (_this.render_comments.bind(_this))(data);
    }, function() {
      showError(this.config.onCommentLoadError, _this.root);
    });
  };

  this.add_single_comment = function(comment) {
    var commentElement = createElement('div', 'comment');
    /* Picture */
    if (this.config.photos) {
      var gravatar = document.createElement('img');
      gravatar.className="gravatar";
      gravatar.src = "http://www.gravatar.com/avatar/" + comment.email_hash + "?s=80&d=mm";
      commentElement.appendChild(gravatar);
    }

    /* Name & link */
    var author = createElement('a', 'author', comment.author);
    if (comment.link) {
      author.href = comment.link;
    }
    commentElement.appendChild(author);

    /* Date */
    if (this.config.dates) {
      var date = createElement('span', "date");
      if (comment.date) {
        var str = formatDate(comment.date);
        date.innerHTML = str[0] + " - " + str[1];
      }
      commentElement.appendChild(date);
    }

    /* Content */
    var content = createElement('p', 'commentContent', comment.content);
    commentElement.appendChild(content);
    return commentElement;
  };

  this.render_comments = function(data) {
    if (this.display == null) {
      throw "this.display == null, cannot render_comments()";
    }
    remove_throbber($(".throbber", this.display));
    if (data.length != 0) {
      try {
        var comments = JSON.parse(data);
      }
      catch (e) {
        showError(String(e), this.display);
        return;
      }
      for (var i = 0; i < comments.length; i++) {
        this.display.appendChild(this.add_single_comment(comments[i]));
      }
    }
  };

  this.onSendCommentFailed = function() {
    $(".commentsFormSubmit", this.root).disabled = false;
    var throbber = $('.commentsThrobber', root);
    throbber.parentNode.removeChild(throbber);
  };

  this.onSendComment = function() {
    var root = $(".comments");

    var throbber = document.createElement('img');
    throbber.src = "http://blog.paul.cx/includes/throbber.svg";
    throbber.className = "commentsThrobber";
    this.root.appendChild(throbber);

    $(".commentsFormSubmit", this.root).disabled = true;
  };

  /* When a message is sent successfully, display it, make it glow a
   * bit, reset the form, and enable the submit button */
  this.onSendCommentOk = function(data) {
    data = JSON.parse(data);
    var comments = this.display;
    comments.appendChild(this.add_single_comment(data));
    comments.lastChild.setAttribute("glow", "true");
    $("form", this.root).reset()
    $(".commentsFormSubmit", this.root).disabled = false;
    var throbber = $('.commentsThrobber', this.root);
    throbber.parentNode.removeChild(throbber);

    setTimeout(function() {
      comments.lastChild.removeAttribute("glow");
    }, 2500);
  };


  this.send_comment = function() {
    this.onSendComment();

    var json = getDataFromForm(this.form);

    var article_name = getPath();
    var url = "/node" + article_name;

    json.article = article_name;
    json.date = new Date().getTime();

    var data = JSON.stringify(json);

    var _this = this;
    XHR(url, "POST", data, function(resp) {
      (_this.onSendCommentOk.bind(_this))(resp);
    }, function() {
      (_this.onSendCommentFailed.bind(_this))();
      onSendCommentFailed();
      showError(this.config.onSendCommentFailed);
    });
  };

  this.init_comment_zone();
}

var config = {
  commentsTitle : "Commentaires",
    photos: true,
    dates: true,
    form : {
      name : {
               ph : "Nom (requis)",
    title : "Nom"
             },
    email : {
              ph : "Email (requis)",
    title : "Email"
            },
    link : {
             ph : "Lien",
    title : "Lien"
           },
    content : {
                ph : "C'est à vous… Essayez de ne pas écrire de bétises. Notez qu'un sous ensemble de Markdown plus ou moins logique permet de mettre en forme votre commentaire.",
    title : "Contenu"
              },
    submit : {
               value : "C'est parti !"
             }
    },
    onCommentLoadError : "J'essaie de chopper les commentaires, mais le serveur dors. Si ça dure, prévenez moi...",
    onCommentSendError : "J'essaie d'envoyer la requête, mais personne ne répond. Le serveur à surement poney, à cette heure là.",
    name: "lastComments",
    root: $('#whine_thread'),
    url: script_url
}
var comments = new CommentArea(config);
})();

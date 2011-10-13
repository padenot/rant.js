# rant.js, a comment system

`rant.js` is a comment system built using node.js and raw js. It uses a flat
json file for the storage of the comments, and can be deployed in under a minute
in any website. I use it to power the comments of my
[blog](http://blog.paul.cx), which uses Jekyll, and therefore has no builtin way
of handling comments. I could have used Disqus, but for some reasons, I didn't
want to put the comments of my blog somewhere in the cloud.

Hence I created `rant.js`, to scratch my own itch. You can see a demo at
<http://blog.paul.cx/2011/09/Vasa-museum/>. Mind the french.

# Features

- Display comments for a page
- Display the last comments
- Add comments (obviously)
- Display an avatar using Gravatar

# Features planned

- Add a backoffice
- Nested comments threads
- Permalink to comments

# Usage
- Install node.js :

```sh
  git clone https://github.com/joyent/node.git
  cd node
  ./configure
  make
  sudo make install
```

- Set up node.js to be proxyfied by you web server. Example for nginx:

```
  # in your server directive :
  location /rant { \# This redirects example.com/rant to the node instance
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-NginX-Proxy true;
    proxy_pass http://app_cluster_1/;
    proxy_redirect off;
  }
  # somewhere else
  upstream app_cluster_1 {
    server 127.0.0.1:8125;
  }
```

- Install `rant.js` and run it :

```sh 
  git clone https://github.com/padenot/rant.js.git
  cd rant.js
  node rant.js
```

- Put this code somewhere in your webpage (possibly in your template, etc.) :

```html
<div id="rant_thread"></div>
</div>
<script type="text/javascript">
<!-- Put the url to the node server here -->
  var script_url = 'http://localhost/rant/'; 

  (function() {
      var rant = document.createElement('script');
      rant.type = 'text/javascript';
      rant.src = script_url + "embed.js";
      (document.getElementsByTagName('head')[0] ||
       document.getElementsByTagName('body')[0]).appendChild(rant);
  })();
</script>
<noscript>Activez Javascript pour voir les commentaires</noscript>
```

- Profit

# FAQ

- This code is crappy.

Yes, I know I should refactor, and it is somewhat planned, but I'm not a web
developper, and someone once said « Release early, release ofter ».

- A `json` file as backend, are you kidding me ?

No, It works quite well for the low traffic my blog represents. I might change
that to learn Redis, though.

- I found a bug, what should I do ?

Open a pull request, ping me on twitter, send me a mail, not all at once.

- It doesn't do _that_ ?

Yeah, suggestions welcome, patches too.

# Dependencies
You should have an `md5sum` binary somewhere in your path.

- License
New BSD

# `rant.js` a comment system

`rant.js` is a comment system built using node.js and raw js. It uses a flat
json file for the storage of the comments, and can be deployed in under a minute
in any website. I use it to power the comments of my
[blog](http://blog.paul.cx), which uses Jekyll, and therefore has no builtin way
of handling comments. I could have used Disqus, but for some reasons, I didn't
want to put the comments of my blog somewhere in the cloud.

Hence I created `rant.js`, to scratch my own itch.

# Usage
1. Install node.js :
```
  git clone https://github.com/joyent/node.git
  cd node
  ./configure
  make
  sudo make install
```

2. Set up node.js to be proxyfied by you web server. Example for nginx:

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
3. Install `rant.js` and run it :

  git clone https://github.com/padenot/rant.js.git
  cd rant.js
  node rant.js

4. Put this code somewhere in your webpage (possibly in your template, etc.) :

```<div id="whine_thread"></div>
</div>
<script type="text/javascript">
  var script_url = 'http://example.com/rant/'; // put the right url here
(function() {
      var whine = document.createElement('script');
      whine.type = 'text/javascript';
      whine.src = script_url + "embed.js";
      (document.getElementsByTagName('head')[0] ||
       document.getElementsByTagName('body')[0]).appendChild(whine);
  })();
</script>
<noscript>Activez Javascript pour voir les commentaires</noscript>
```
5. Profit
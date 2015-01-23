function(modules) {
  
  var db = modules.database.open('simple-login', {sessions: {}, users: {}}),
      key = modules.crypto.codec.utf8String.toBits(config.sessionKey),
      fromBits = modules.crypto.codec.base64.fromBits,
      toBits = modules.crypto.codec.base64.toBits;
  
  var token = function() {
    var rand = modules.crypto.random.randomWords(6, 0);
    return fromBits(rand, true, true)+'.'+fromBits(new modules.crypto.misc.hmac(key).mac(rand), true, true);
  };
  var verify = function(signed) {
    try {
      var parts = signed.split('.');
      return fromBits(new modules.crypto.misc.hmac(key).mac(toBits(parts[0], true)), true, true) == parts[1] && signed;
    } catch (e) {}
  };
  var pbkdf2 = function(password, salt) {
    var value = modules.crypto.misc.cachedPbkdf2(password, salt && {salt: toBits(salt, true)});
    return {key: fromBits(value.key, true, true), salt: fromBits(value.salt, true, true)};
  };
  
  modules.http.serve({port: config.port}, function(request, response) {
    var render = function(body, status) {
      response.end(modules.html.markup([
        {'!doctype': {html: null}},
        {html: [
          {head: [{title: 'Simple Login'}]},
          {body: body}
        ]}
      ]), 'html', status);
    };
    var logout = function(sid) {
      if (sid) db.delete('sessions/'+sid).then(function() { logout(); });
      else response.generic(303, {'Set-Cookie': 'sid=; Expires='+new Date().toUTCString(), Location: '/'});
    };
    var sid;
    switch (request.path) {
      case '/':
        if (sid = verify(request.cookie.sid))
          return db.get('sessions/'+sid).then(function(username) {
            if (!username) return logout();
            this.get('users/'+encodeURIComponent(username)).then(function(user) {
              if (!user) return logout(sid);
              render(['Welcome, '+user.name+'! ', {a: {href: '/logout', children: 'Log out'}}]);
            });
          });
        return render(['Please ', {a: {href: '/register', children: 'Register'}}, ' or ', {a: {href: '/login', children: 'Log in'}}, '.']);
      case '/login':
        if (request.method == 'POST' && (request.headers['Content-Type'] || '').split(';')[0] == 'application/x-www-form-urlencoded')
          return request.slurp(function(body) {
            db.get('users/'+encodeURIComponent(body.username), true).then(function(user) {
              if (!user || user.password !== pbkdf2(body.password, user.salt).key)
                return render(['Invalid login. ', {a: {href: '/login', children: 'Try again'}}], 401);
              this.put('sessions/'+(sid = token()), body.username).then(function() {
                response.generic(303, {'Set-Cookie': 'sid='+sid, Location: '/'});
              });
            });
          }, 'url');
        return render([{form: {method: 'post', action: '/login', children: [
          {label: 'Username: '}, {input: {type: 'text', name: 'username'}}, {br: null},
          {label: 'Password: '}, {input: {type: 'password', name: 'password'}}, {br: null},
          {input: {type: 'submit', value: 'Log In'}}
        ]}}]);
      case '/logout':
        return logout(verify(request.cookie.sid));
      case '/register':
        if (request.method == 'POST' && (request.headers['Content-Type'] || '').split(';')[0] == 'application/x-www-form-urlencoded')
          return request.slurp(function(body) {
            var path = 'users/'+encodeURIComponent(body.username);
            db.get(path, true).then(function(user) {
              if (user) return render(['Username '+body.username+' is already taken. ', {a: {href: '/register', children: 'Try again'}}], 401);
              var hash = pbkdf2(body.password);
              this.put(path, {name: body.name, password: hash.key, salt: hash.salt})
                  .put('sessions/'+(sid = token()), body.username)
                  .then(function() { response.generic(303, {'Set-Cookie': 'sid='+sid, Location: '/'}); });
            });
          }, 'url');
        return render([{form: {method: 'post', action: '/register', children: [
          {label: 'Name: '}, {input: {type: 'text', name: 'name'}}, {br: null},
          {label: 'Username: '}, {input: {type: 'text', name: 'username'}}, {br: null},
          {label: 'Password: '}, {input: {type: 'password', name: 'password'}}, {br: null},
          {input: {type: 'submit', value: 'Register'}}
        ]}}]);
    }
    response.generic(404);
  }, function(error) {
    if (error) console.error('Error listening on 0.0.0.0:'+config.port+'\n'+error);
    else console.log('Listening at http://localhost:'+config.port);
  });
}
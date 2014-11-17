simpl.add('async', function() {
  /** async: {
        join: function(function(callback:function), ..., callback:function(any, ...))
      }
      
      `join` executes all but its last function argument, which it calls when the previous functions have all executed
      the given callback, and to which it passes in the `Arguments` object (or `arguments[0]` if `arguments.length` is
      1) from each of the previous functions' calls in order. */
  return {
    join: function() {
      var results = [],
          count = arguments.length-1,
          callback = arguments[count];
      Array.prototype.slice.call(arguments, 0, -1).forEach(function(fn, i) {
        fn(function() {
          results[i] = arguments.length == 1 ? arguments[0] : arguments;
          if (!--count) callback.apply(null, results);
        });
      });
    }
  };
});

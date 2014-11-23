simpl.add('docs', function(o) {

  var tokens = {
    id: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
    number: /[0-9]+/,
    string: /'[^']*'|"[^"]*"/,
    code: /`[^`]+`/,
    '': /\s+/
  };
  var self, parse = o.parser.generate({
    spec: [
      'id', ':', 'types', {name: 0, type: 2}
    ],
    named_value: [
      'id', '=', 'literal', ':', 'types', {name: 0, default: 2, type: 4},
      'spec', 0,
      '...', 0 // limit these?
    ],
    named_values: [
      'named_value', ',', 'named_values', [0, 2],
      'named_value', 0
    ],
    value: [
      'named_value', 0,
      'types', {type: 0}
    ],
    values: [
      'value', ',', 'values', [0, 2],
      'value', 0
    ],
    type: [
      'id', 0,
      'function', 0,
      'function', '(', 'values', ')', {function: {args: 2}},
      '{', 'named_values', '}', {object: 1},
      '[', 'values', ']', {array: 1}
    ],
    types: [
      'type', '|', 'types', [0, 2],
      'function', '->', 'types', {function: {returns: 2}},
      'function', '(', 'values', ')', '->', 'types', {function: {args: 2, returns: 5}},
      'type', 0
    ],
    literal: [
      'null', 0,
      'undefined', 0,
      'true', 0,
      'false', 0,
      'string', 0,
      'number', 0,
      'code', 0
    ]
  }, 'spec', tokens);
  
  /** docs: {
        generate: function(code:string) -> [Block, ...],
        stringify: function(code:string, breakLimit=1:number) -> string,
        stringifySpec: function(spec:Value|Type, breakLimit=1:number, depth=0:number, type=false:boolean) -> string
      }
      
      Documentation is parsed from comments in `code` beginning with `/**`, which are split into blocks separated by
      one or more empty lines. The first block is parsed using the doc spec grammar below. If the parse succeeds, the
      result is returned in `spec`. Otherwise, `spec` is null, `error` is set to the `parser` module's `ParseError`,
      and the block is parsed as `text` along with subsequent blocks.
      
     `        <spec> ::= <id> ':' <types>
       <named_value> ::= <id> '=' <literal> ':' <types>
                       | <spec>
                       | '...'
      <named_values> ::= <named_value> ',' <named_values>
                       | <named_value>
             <value> ::= <named_value>
                       | <types>
            <values> ::= <value> ',' <values>
                       | <value>
              <type> ::= <id>
                       | 'function'
                       | 'function' '(' <values> ')'
                       | '{' <named_values> '}'
                       | '[' <values> ']'
             <types> ::= <type> '|' <types>
                       | 'function' '->' <types>
                       | 'function' '(' <values> ')' '->' <types>
                       | <type>
           <literal> ::= 'null' | 'undefined' | 'true' | 'false' | <string> | <number> | <code>`
      
      See source for regular expressions corresponding to `<id>`, `<string>`, `<number>`, and `<code>`, and for
      examples.
      
      Text blocks following the spec block support code spans between backticks. If an entire block is surrounded in
      backticks, it is parsed as a preformatted block aligned with the right side of the opening backtick.
      
      `stringify` returns a plain-text version of the doc structure returned by `generate`, and `stringifySpec` does
      the same for the `spec` structure within `Block`. `breakLimit` sets the `depth` at which nested object properties
      stop being separated by line breaks. */
      
  /** Block: {spec:Value|null, error:ParseError|undefined, text:[[string|{code:string}, ...]|{pre:string}, ...]} */
  /** Value: [Value, ...]|string|{name:string|undefined, default:string|undefined, type:Type} */
  /** Type: [Type, ...]|string|{function:{args:Value, returns:Type|undefined}}|{object:Value}|{array:Value} */
  return self = {
    generate: function(code) {
      return (code.match(/\/\*\*\s*[\s\S]+?\s*\*\//g) || []).map(function(comment) {
        var blocks = comment.substring(3, comment.length-2).trim().split(/\n\s*\n/),
            spec = blocks.shift(), error = null;
        try {
          spec = parse(spec);
        } catch (e) {
          blocks.unshift(spec);
          spec = null;
          error = e;
        }
        return {
          spec: spec,
          error: error,
          text: blocks.map(function(block) {
            var chunks = [], code;
            if (code = block.match(/^(\s*)`([^`]+)`\s*$/))
              return {pre: code[2].replace(new RegExp('\n'+code[1]+' ', 'g'), '\n')};
            block = block.trim().replace(/\s*\n\s*|\s\s+/g, ' ');
            while (code = tokens.code.exec(block)) {
              if (code.index) chunks.push(block.substr(0, code.index));
              chunks.push({code: code[0].substring(1, code[0].length-1)});
              block = block.substr(code.index+code[0].length);
            }
            if (block) chunks.push(block);
            return chunks;
          })
        };
      });
    },
    stringify: function(code, breakLimit) {
      return self.generate(code).map(function(block) {
        var spec = self.stringifySpec(block.spec, breakLimit);
        return (spec ? [spec] : []).concat(block.text.map(function(chunks) {
          return chunks.pre ? chunks.pre : chunks.map(function(chunk) {
            return typeof chunk == 'string' ? chunk : '`'+chunk.code+'`';
          }).join('');
        })).join('\n\n');
      }).join('\n\n');
    },
    stringifySpec: function spec(node, breakLimit, depth, type) {
      if (typeof node != 'string' && !(typeof node == 'object' && node)) return;
      if (breakLimit == null) breakLimit = 1;
      depth = depth || 0;
      var indent = new Array(depth).join('  ');
      if (type) {
        if (Array.isArray(node))
          return node.map(function(node) { return spec(node, breakLimit, depth, true); }).join('|');
        if (typeof node == 'string')
          return node;
        node = node[type = Object.keys(node)[0]];
        if (type == 'function')
          return type+(node.args ? '('+spec(node.args, 0, depth+1)+')' : '')+(node.returns ? ' → '+spec(node.returns, breakLimit, depth, true) : '');
        if (type == 'object')
          return depth > breakLimit ? '{'+spec(node, breakLimit, depth)+'}' : '{\n  '+indent+spec(node, breakLimit, depth)+'\n'+indent+'}';
        return '['+spec(node, 0, depth)+']';
      }
      if (Array.isArray(node))
        return node.map(function(node) { return spec(node, breakLimit, depth+1); }).join(depth > breakLimit ? ', ' : ',\n  '+indent);
      if (typeof node == 'string')
        return node;
      return (node.name ? node.name+(node.default ? '='+node.default : '')+': ' : '')+spec(node.type, breakLimit, depth+1, true);
    }
  };
}, {parser: 0});

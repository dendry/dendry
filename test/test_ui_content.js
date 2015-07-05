/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var colors = require('colors');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var toText = require('../lib/ui/content/text');
  var toHTML = require('../lib/ui/content/html');
  var toLaTeX = require('../lib/ui/content/latex');

  describe('content convertor', function() {

    describe('text output', function() {
      it('should wrap text output', function() {
        var text = toText.convert([
          {type:'paragraph',
           content:['Two households, both alike in dignity, ' +
                    'in fair Verona where we lay our scene.']
           }], 60);
        text.should.equal(
          'Two households, both alike in dignity, ' +
          'in fair Verona where\nwe lay our scene.\n'
        );
      });

      it('should bolden titles', function() {
        var text = toText.convert([
          {type:'heading',
           content:['The title.']
           }], 60);
        text.should.equal('The title.'.bold + '\n');
      });

      it('should accept single item of content', function() {
        var text = toText.convert([
          {type:'heading',
           content:'The title.'
           }], 60);
        text.should.equal('The title.'.bold + '\n');
      });

      it('should bolden level 2 emphasis', function() {
        var text = toText.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['First.']},
             ' ',
             {type:'emphasis-2',
              content:['Second.']}
           ]}
        ], 60);
        text.should.equal('First. ' + 'Second.'.bold + '\n');
      });

      it('should not add extra spaces after end of emphasis', function() {
        var text = toText.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['Foo']},
             '.'
           ]}
        ], 60);
        text.should.equal('Foo.\n');
      });

      it('should grey hidden text', function() {
        var text = toText.convert([
          {type:'paragraph',
           content:[
             {type:'hidden',
              content:['Hide me.']}
           ]}
        ], 60);
        text.should.equal('Hide me.'.grey + '\n');
      });

      it('should fail on conditionals', function() {
        (function() {
          toText.convert([
            {type:'paragraph',
             content:[
               {type:'conditional',
                predicate: 0,
                content:['Show me.']}
             ]}
          ], 60);
        }).should.throw('conditional should have been evaluated by now.');
      });

      it('should fail on inserts', function() {
        (function() {
          toText.convert([
            {type:'paragraph',
             content:[
               'Foo is ',
               {type:'insert', insert:0},
               '.'
             ]}
          ], [1]);
        }).should.throw('insert should have been evaluated by now.');
      });

      it('should separate paragraphs of different types', function() {
        var text = toText.convert([
          {type:'heading',
           content:['One.']},
          {type:'paragraph',
           content:['Two.']},
          {type:'quotation',
           content:['Three.']},
          {type:'paragraph',
           content:['Four.']},
          {type:'attribution',
           content:['Five.']},
          {type:'paragraph',
           content:['Six.']}
        ], 60);
        text.should.equal('One.'.bold + '\n\nTwo.\n\n    Three.\n\n' +
                          'Four.\n\n        Five.\n\nSix.\n');
      });

      it('should not separate quote and attribution', function() {
        var text = toText.convert([
          {type:'quotation',
           content:['Quote.']},
          {type:'attribution',
           content:['Byline.']}
        ], 60);
        text.should.equal('    Quote.\n        Byline.\n');
      });

      it('should separate hrule from both sides', function() {
        var text = toText.convert([
          {type:'paragraph', content:['One.']},
          {type:'hrule'},
          {type:'paragraph', content:['Two.']}
        ], 60);
        text.should.equal('One.\n\n---\n\nTwo.\n');
      });

      it('should break lines where needed', function() {
        var text = toText.convert([
          {type:'paragraph', content:[
            'One.',
            {type:'line-break'},
            'Two.'
          ]}
        ], 60);
        text.should.equal('One.\nTwo.\n');
      });

    }); // end text output

    // ------------------------------------------------------------------------

    describe('HTML output', function() {

      it('should put titles in header', function() {
        var text = toHTML.convert([
          {type:'heading',
           content:['The title.']
           }]);
        text.should.equal('<h1>The title.</h1>');
      });

      it('should convert single item of content in paragraph', function() {
        var text = toHTML.convert([
          {type:'heading',
           content:'The title.'
           }]);
        text.should.equal('<h1>The title.</h1>');
      });

      it('should use em and strong for emphasis', function() {
        var text = toHTML.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['First.']},
             ' ',
             {type:'emphasis-2',
              content:['Second.']}
           ]}
        ]);
        text.should.equal('<p><em>First.</em> <strong>Second.</strong></p>');
      });

      it('should not add extra spaces after end of emphasis', function() {
        var text = toHTML.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['Foo']},
             '.'
           ]}
        ]);
        text.should.equal('<p><em>Foo</em>.</p>');
      });

      it('should wrap hidden text in span', function() {
        var text = toHTML.convert([
          {type:'paragraph',
           content:[
             {type:'hidden',
              content:['Hide me.']}
           ]}
        ]);
        text.should.equal('<p><span class="hidden">Hide me.</span></p>');
      });

      it('should fail on conditionals', function() {
        (function() {
          toHTML.convert([
            {type:'paragraph',
             content:[
               {type:'conditional',
                predicate: 0,
                content:['Show me.']}
             ]}
          ]);
        }).should.throw('conditional should have been evaluated by now.');
      });

      it('should fail on inserts', function() {
        (function() {
          toHTML.convert([
            {type:'paragraph',
             content:[
               'Foo is ',
               {type:'insert', insert:0},
               '.'
             ]}
          ]);
        }).should.throw('insert should have been evaluated by now.');
      });

      it('should create paragraphs of different types', function() {
        var text = toHTML.convert([
          {type:'heading',
           content:['One.']},
          {type:'paragraph',
           content:['Two.']},
          {type:'quotation',
           content:['Three.']},
          {type:'paragraph',
           content:['Four.']},
          {type:'attribution',
           content:['Five.']},
          {type:'paragraph',
           content:['Six.']}
        ]);
        text.should.equal('<h1>One.</h1><p>Two.</p>' +
                          '<blockquote>Three.</blockquote>' +
                          '<p>Four.</p>' +
                          '<blockquote class="attribution">Five.</blockquote>' +
                          '<p>Six.</p>');
      });

      it('should insert hrule as hr', function() {
        var text = toHTML.convert([
          {type:'paragraph', content:['One.']},
          {type:'hrule'},
          {type:'paragraph', content:['Two.']}
        ]);
        text.should.equal('<p>One.</p><hr><p>Two.</p>');
      });

      it('should add line breaks where needed', function() {
        var text = toHTML.convert([
          {type:'paragraph', content:[
            'One.',
            {type:'line-break'},
            'Two.'
          ]}
        ]);
        text.should.equal('<p>One.<br>Two.</p>');
      });

    }); // end html output

    // ------------------------------------------------------------------------

    describe('LaTeX output', function() {

      it('should put titles in section header', function() {
        var output = toLaTeX.convert([
          {type:'heading',
           content:['The title.']
           }]);
        output.should.equal('\\subsection*{The title.}\n\n');
      });

      it('should escape special characters', function() {
        var output = toLaTeX.convert([
          {type:'paragraph',
           content:['For $4.00 I got a moustache {.']
           }]);
        output.should.equal('For \\$4.00 I got a moustache \\{.\n\n');
      });

      it('should convert single item of content in paragraph', function() {
        var output = toLaTeX.convert([
          {type:'heading',
           content:'The title.'
           }]);
        output.should.equal('\\subsection*{The title.}\n\n');
      });

      it('should use textit and textbf for emphasis', function() {
        var output = toLaTeX.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['First.']},
             ' ',
             {type:'emphasis-2',
              content:['Second.']}
           ]}
        ]);
        output.should.equal('\\textit{First.} \\textbf{Second.}\n\n');
      });

      it('should not add extra spaces after end of emphasis', function() {
        var output = toLaTeX.convert([
          {type:'paragraph',
           content:[
             {type:'emphasis-1',
              content:['Foo']},
             '.'
           ]}
        ]);
        output.should.equal('\\textit{Foo}.\n\n');
      });

      it('should not decorate hidden output', function() {
        var output = toLaTeX.convert([
          {type:'paragraph',
           content:[
             {type:'hidden',
              content:['Hide me.']}
           ]}
        ]);
        output.should.equal('Hide me.\n\n');
      });

      it('should fail on conditionals', function() {
        (function() {
          toLaTeX.convert([
            {type:'paragraph',
             content:[
               {type:'conditional',
                predicate: 0,
                content:['Show me.']}
             ]}
          ]);
        }).should.throw('conditional should have been evaluated by now.');
      });

      it('should fail on inserts', function() {
        (function() {
          toLaTeX.convert([
            {type:'paragraph',
             content:[
               'Foo is ',
               {type:'insert', insert:0},
               '.'
             ]}
          ]);
        }).should.throw('insert should have been evaluated by now.');
      });

      it('should create paragraphs of different types', function() {
        var output = toLaTeX.convert([
          {type:'heading',
           content:['One.']},
          {type:'paragraph',
           content:['Two.']},
          {type:'quotation',
           content:['Three.']},
          {type:'paragraph',
           content:['Four.']},
          {type:'attribution',
           content:['Five.']},
          {type:'paragraph',
           content:['Six.']}
        ]);
        output.should.equal(
          '\\subsection*{One.}\n\n' +
          'Two.\n\n' +
          '\\begin{quote}Three.\\end{quote}\n\n' +
          'Four.\n\n' +
          '\\begin{quote}Five.\\end{quote}\n\n' +
          'Six.\n\n');
      });

      it('should insert hrule as asterisks', function() {
        var output = toLaTeX.convert([
          {type:'paragraph', content:['One.']},
          {type:'hrule'},
          {type:'paragraph', content:['Two.']}
        ]);
        output.should.equal('One.\n\n* * *\n\nTwo.\n\n');
      });

      it('should add line breaks where needed', function() {
        var output = toLaTeX.convert([
          {type:'paragraph', content:[
            'One.',
            {type:'line-break'},
            'Two.'
          ]}
        ]);
        output.should.equal('One.\\\\\nTwo.\n\n');
      });

    }); // end latex output
  });
}());

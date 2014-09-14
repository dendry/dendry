/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var compiler = require('../lib/compiler');

  describe("game compiler", function() {

    it("should compile a simple two-scene game", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Back to root", content: "Root content", options: {
          options:[{id:"@foo", title:"Foo link"}]
        }},
        {id: "foo", title:"The Foo", content:"Foo content", options: {
          options:[{id:"@foo", title:"Foo link"}]
        }}
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.false;
        game.scenes.foo.title.should.equal('The Foo');
        done();
      });
    });

    it("should add sections as scenes", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Back to root", content: "Root content",
         tags: ["alpha", "bravo"],
         sections: [
           {id: "root.foo", title:"The Foo", content:"Foo content",
            tags: ["alpha", "charlie"],
            options: {
              options:[{id:"@foo", title:"Foo link"}]}
           }
         ],
         options: {
           options:[{id:"@foo", title:"Foo link"}]
         }},
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.false;
        game.tagLookup.alpha.should.eql({root: true, "root.foo": true});
        game.tagLookup.bravo.should.eql({root: true});
        game.tagLookup.charlie.should.eql({"root.foo": true});
        done();
      });
    });

    it("should fail with duplicate id", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Root", content: "Root."},
        {id: "root", title:"Root Two", content: "Root Two."},
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Duplicate scenes with id 'root' found.");
        (game === undefined).should.be.true;
        done();
      });
    });

    it("should fail with duplicate section id", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root.foo", title:"Explicit Root Foo", content: "Root Foo."},
        {id: "root", title:"Root", content: "Root.",
         sections: [{id: "foo", title:"Root Foo", content:"Root Foo."}],
        }
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Duplicate scenes with id 'root.foo' found.");
        (game === undefined).should.be.true;
        done();
      });
    });

    it("should index scene tags", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Back to root", content: "Root content",
         tags: ["alpha", "bravo"],
         options: {
          options:[{id:"@foo", title:"Foo link"}]
        }},
        {id: "foo", title:"The Foo", content:"Foo content",
         tags: ["alpha", "charlie"],
         options: {
          options:[{id:"@foo", title:"Foo link"}]
        }}
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.false;
        game.tagLookup.alpha.should.eql({root: true, foo: true});
        game.tagLookup.bravo.should.eql({root: true});
        game.tagLookup.charlie.should.eql({foo: true});
        done();
      });
    });

    describe("id resolution in compiler", function() {
      it("should set nested id, if not already nested", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "one", title:"One", content:"One."},
             {id: "two", title:"Two", content:"Two."},
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.false;
          (!!game.scenes.one).should.be.false;
          (!!game.scenes.two).should.be.false;
          (!!game.scenes["root.one"]).should.not.be.false;
          (!!game.scenes["root.two"]).should.not.be.false;
          done();
        });
      });

      it("should inherit parent id in goto", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"two"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.false;
          game.scenes["root.one"].goTo.should.equal("root.two");
          done();
        });
      });

      it("should inherit parent id in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.",
              options:{
                options:[{id:"@two", title:"Two"}]
              }},
             {id: "root.two", title:"Two", content:"Two."},
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.false;
          game.scenes["root.one"].options.options[0].id.
            should.equal("@root.two");
          done();
        });
      });

      it("should ignore tag in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.",
              options:{
                options:[{id:"#tag", title:"Two"}]
              }},
             {id: "root.two", title:"Two", content:"Two."},
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.false;
          game.scenes["root.one"].options.options[0].id.should.equal("#tag");
          done();
        });
      });

      it("should use own id as context in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           options: {
             options: [{id:"@one", title:"One"}]
           },
           sections: [
             {id: "root.one", title:"One", content:"One."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.false;
          game.scenes.root.options.options[0].id.should.equal("@root.one");
          done();
        });
      });

      it("should fail if there's no matching goto id", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"three"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching 'three' in 'root.one'."
          );
          done();
        });
      });

      it("should fail if there's no matching ancestor id", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"..three"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching '..three' in 'root.one'."
          );
          done();
        });
      });

      it("should fail if there's no matching option id", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.",
              options:{
                options:[{id:"@three"}]
              }},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching 'three' in 'root.one'."
          );
          done();
        });
      });

      it("should pass on resolution errors", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var listOfScenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"....root"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        compiler.compile(info, listOfScenes, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Context is not deep enough.");
          done();
        });
      });

    }); // end id inheritance

    describe("id resolution", function() {
      var ok = [
        {context:"foo", id:"a", order:["foo.a", "a"]},
        {context:"foo.bar", id:"a.b", order:["foo.bar.a.b", "foo.a.b", "a.b"]},
        {context:"foo.bar", id:".a.b", order:["a.b"]}, // ?
        {context:"foo.bar", id:"..a.b", order:["foo.a.b"]},
        {context:"foo.bar", id:"...a.b", order:["a.b"]},
        {context:"foo.bar", id:".", order:["foo.bar"]},
        {context:"foo.bar", id:"..", order:["foo"]},
        {context:"", id:"a.b", order:["a.b"]}
      ];
      _.each(ok, function(case_) {
        var id = case_.id;
        var context = case_.context;
        var order = case_.order;
        it("should resolve '"+id+"' in '"+context+"' to "+order.join(', '),
           function() {
             var candidates = compiler.getCandidateAbsoluteIds(context, id);
             candidates.should.eql(order);
           });
      });

      var fail = [
        {context:"", id:"$a", err:"'$a' is not a valid relative id."},
        {context:"..foo", id:"a", err:"'..foo' is not a valid id."},
        {context:"", id:".", err:"Relative id '.' requires context."},
        {context:"", id:"..", err:"Relative id '..' requires context."},
        {context:"foo", id:"..", err:"Context is not deep enough."},
        {context:"foo.bar", id:"...", err:"Context is not deep enough."},
        {context:"foo.bar", id:"....a.b", err:"Context is not deep enough."}
      ];
      _.each(fail, function(case_) {
        var id = case_.id;
        var context = case_.context;
        it("should fail to resolve '"+id+"' in '"+context+"'", function() {
          (function() {
            compiler.getCandidateAbsoluteIds(context, id);
          }).should.throw(case_.err);
        });
      });
    }); // end id resolution

  });
}());

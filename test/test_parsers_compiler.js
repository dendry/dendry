/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var path = require('path');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var noerr = function(err) {
    if (err) console.trace(err);
    (!!err).should.be.false;
  };

  var compiler = require('../lib/parsers/compiler');

  describe("game compiler", function() {

    describe("scenes", function() {

      it("should keep info properties", function(done) {
        var info = {
          title: "My Game",
          author: "Jo Doe",
          content: "A description of this game.",
          firstScene: "root",
          rootScene: "root"
        };
        var scenes = [
          {id: "root", title:"The Root", content: "Root content"},
          {id: "foo", title:"The Foo", content:"Foo content"}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.content.should.equal(info.content);
          game.firstScene.should.equal(info.firstScene);
          game.rootScene.should.equal(info.rootScene);
          done();
        });
      });

      it("should compile a simple two-scene game", function(done) {
        var info = {
          title: "My Game",
          author: "Jo Doe"
        };
        var scenes = [
          {
            id: "root", title:"Back to root", content: "Root content",
            options:[{id:"@foo", title:"Foo link"}]
          },
          {
            id: "foo", title:"The Foo", content:"Foo content",
            options:[{id:"@foo", title:"Foo link"}]
          }
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.scenes.foo.title.should.equal('The Foo');
          done();
        });
      });

      it("should add sections as scenes", function(done) {
        var info = {
          title: "My Game",
          author: "Jo Doe"
        };
        var scenes = [
          {id: "root", title:"Back to root", content: "Root content",
           tags: ["alpha", "bravo"],
           sections: [
             {
               id: "root.foo", title:"The Foo", content:"Foo content",
               tags: ["alpha", "charlie"],
               options:[{id:"@foo", title:"Foo link"}]
             }
           ],
           options:[{id:"@foo", title:"Foo link"}]
           },
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
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
        var scenes = [
          {id: "root", title:"Root", content: "Root."},
          {id: "root", title:"Root Two", content: "Root Two."},
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
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
        var scenes = [
          {id: "root.foo", title:"Explicit Root Foo", content: "Root Foo."},
          {id: "root", title:"Root", content: "Root.",
           sections: [{id: "foo", title:"Root Foo", content:"Root Foo."}],
          }
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
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
        var scenes = [
          {id: "root", title:"Back to root", content: "Root content",
           tags: ["alpha", "bravo"],
           options:[{id:"@foo", title:"Foo link"}]
           },
          {id: "foo", title:"The Foo", content:"Foo content",
           tags: ["alpha", "charlie"],
           options:[{id:"@foo", title:"Foo link"}]
           }
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.tagLookup.alpha.should.eql({root: true, foo: true});
          game.tagLookup.bravo.should.eql({root: true});
          game.tagLookup.charlie.should.eql({foo: true});
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("qualities", function() {
      it("should store qualities data", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content"}
        ];
        var qualities = [
          {id: "foo"},
          {id: "bar"}
        ];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          (!!game.qualities.foo).should.be.true;
          (!!game.qualities.bar).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("id modification", function() {
      it("should ensure sections are nested in their scene", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "one", title:"One", content:"One."},
             {id: "two", title:"Two", content:"Two."},
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          (!!game.scenes.one).should.be.false;
          (!!game.scenes.two).should.be.false;
          (!!game.scenes["root.one"]).should.not.be.false;
          (!!game.scenes["root.two"]).should.not.be.false;
          done();
        });
      });

      it("should resolve id in goto", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"two"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.scenes["root.one"].goTo.should.equal("root.two");
          done();
        });
      });

      it("should resolve id in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {
               id: "root.one", title:"One", content:"One.",
               options:[{id:"@two", title:"Two"}]
             },
             {id: "root.two", title:"Two", content:"Two."},
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.scenes["root.one"].options[0].id.
            should.equal("@root.two");
          done();
        });
      });

      it("should not a alter a tag in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {
               id: "root.one", title:"One", content:"One.",
               options:[{id:"#tag", title:"Two"}]
             },
             {id: "root.two", title:"Two", content:"Two."},
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.scenes["root.one"].options[0].id.should.equal("#tag");
          done();
        });
      });

      it("should use scene id as context in section option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           options: [{id:"@one", title:"One"}],
           sections: [
             {id: "root.one", title:"One", content:"One."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          game.scenes.root.options[0].id.should.equal("@root.one");
          done();
        });
      });

      it("should fail if there's no matching id in goto", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"three"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching 'three' in 'root.one'."
          );
          done();
        });
      });

      it("should fail if there's no matching ancestor id", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"..three"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching '..three' in 'root.one'."
          );
          done();
        });
      });

      it("should fail if there's no matching id in option", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.",
              options:[{id:"@three"}]},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Couldn't find an id matching 'three' in 'root.one'."
          );
          done();
        });
      });

      it("should pass on resolution errors", function(done) {
        var info = {title: "My Game", author: "Jo Doe"};
        var scenes = [
          {id: "root", title:"Root scene", content:"Root content",
           sections: [
             {id: "root.one", title:"One", content:"One.", goTo:"....root"},
             {id: "root.two", title:"Two", content:"Two."}
           ]}
        ];
        var qualities = [];
        compiler.compile(info, scenes, qualities, function(err, game) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Context is not deep enough.");
          done();
        });
      });

    }); // end id inheritance

    // ----------------------------------------------------------------------

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

    // ----------------------------------------------------------------------

    describe("compiling files", function() {
      it("should compile a standard project directory", function(done) {
        var diry = path.resolve(__dirname, "files", "test_game");
        compiler.compileGame(diry, function(err, game) {
          noerr(err);
          game.title.should.equal('Test Game');
          game.author.should.equal('Jo Doe');
          var _;
          var scenes = 0; for (_ in game.scenes) scenes++;
          var qualities = 0; for (_ in game.qualities) qualities++;
          scenes.should.equal(6);
          qualities.should.equal(1);
          done();
        });
      });

      it("should load and save a game", function(done) {
        var info = {
          title: "My Game",
          author: "Jo Doe"
        };
        var fn = function(state, Q) { Q.foo += 1; };
        fn.source = "Q.foo += 1;";
        var scenes = [
          {
            id: "root",
            title:"The Root",
            content: "Root content",
            onArrival: [fn]
          },
          {id: "foo", title:"The Foo", content:"Foo content"}
        ];
        var qualities = [
        ];
        compiler.compile(info, scenes, qualities, function(err, game) {
          noerr(err);
          var filename = "/tmp/test-dendry.game";
          compiler.saveCompiledGame(game, filename, function(err) {
            noerr(err);
            compiler.loadCompiledGame(filename, function(err, loaded) {
              noerr(err);
              // Function comparisons don't work without should.eql(),
              // so compare them and delete them.
              game.scenes.root.onArrival[0].source.should.equal(
                loaded.scenes.root.onArrival[0].source
              );
              delete game.scenes.root.onArrival;
              delete loaded.scenes.root.onArrival;
              game.should.eql(loaded);
              done();
            });
          });
        });
      });

    }); // end describe loading/saving

    // ----------------------------------------------------------------------

    describe("directory walking", function() {
      it("should return error from mid-walk", function(done) {
        var diry = path.resolve(__dirname, "files", "test_game");
        var count = 0;
        var action = function(_, pathDone) {
          if (++count > 2) {
            pathDone(new Error("Too many files processed."));
          } else {
            pathDone();
          }
        };
        compiler.walkDir(diry, {}, action, function(err) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Too many files processed.");
          done();
        });
      });

      it("should return error from dive", function(done) {
        var diry = '/'+(new Date().getTime());
        var action = function(_, pathDone) {
          pathDone();
        };
        compiler.walkDir(diry, {}, action, function(err) {
          (!!err).should.be.true;
          err.toString().should.match(/Error: ENOENT/);
          done();
        });
      });
    }); // end describe walkDir

  });
}());

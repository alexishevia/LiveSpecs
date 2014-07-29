// LiveSpecs.js

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'underscore', 'async', 'easyTabs',
           'codemirror/lib/codemirror', 'codemirror/mode/htmlmixed/htmlmixed',
           'codemirror/mode/css/css', 'codemirror/mode/javascript/javascript',
           'codemirror/mode/xml/xml'], factory);

  } else {
    // Browser globals
    root.LiveSpecs = factory(root.$, root._, root.async, root.easyTabs,
                             root.CodeMirror);
  }
}(this, function ($, _, async, easyTabs, CodeMirror) {
  'use strict';

  function joinPath(){
    var args = [].slice.call(arguments),
        segments = [];

    // each argument may be a segment ("foo") or a path ("foo/bar")
    for(var i=0, len=args.length; i<len; i++){
      var segment = args[i];
      if(i > 0){
        segment = stripInitialSlash(segment);
      }
      segment = stripTrailingSlash(segment);
      segments.push(segment);
    }

    return segments.join('/');
  }

  function getParentFolder(filePath){
    return filePath.replace(/\/[^/]+$/, '');
  }

  function stripTrailingSlash(str) {
    if(str.substr(str.length - 1) === '/') {
      return str.substr(0, str.length - 1);
    }
    return str;
  }

  function stripInitialSlash(str) {
    if(str[0] === '/') {
      return str.substr(1, str.length);
    }
    return str;
  }

  function elementToLiveEditor($container, options){
    options = _.extend({tryIt: true}, options);
    var self = this;

    toForm.call(this, $container, function(err, result){
      if(err){
        throw(err);
      }

      var $form = result.$form;
      var htmlEditors = result.htmlEditors;
      var jsEditors = result.jsEditors;
      var example = result.example;

      if(options.tryIt){
        $form.on('submit', function(){
          $form.find('.errors, .success').empty();
          var output = $form.find('.output').empty();

          // use the editor's value instead of the file's original content
          example.html = _.map(htmlEditors, function(editor){
                          return { content: editor.getValue() };
                         });

          example.js = _.map(jsEditors, function(editor){
                          return { content: editor.getValue() };
                         });

          runExampleInIframe.call(self, {
            container: output,
            example: example,
            hidden: false
          }, function(err){
            if(err){
              output.siblings('.errors').html(err);
            }
            else {
              output.siblings('.success').html('Success!');
            }
          });

          $form.find('.result').css('display', 'inline-block');
          return false;
        });
      }
      else {
        $form.find('input[type="submit"]').remove();
      }

    });
  }

  function insertFilesToForm(files, $form, mode, exampleID){
    var editors = [];
    _.each(files, function(file, i){
      var id = (exampleID + file.url).replace(/\./g, '-').replace(/\//g, '-');
      var $item = $('<li class="tab"><a href="#' + id + '">' + file.label +
                   '</a></li>').appendTo($form.find('ul'));
      var $container = $('<div id="' + id + '"></div>')
                        .appendTo($form.find('[data-js="tab-container"]'));
      var $code = $('<div class="code"></div>').appendTo($container);

      editors.push(toCodeMirror(file.content, $code[0], mode));
    });
    return editors;
  }

  function toForm($container, callback){
    var self = this;
    var $form = $([
      '<form>',
        '<div class="source">',
          '<div data-js="tab-container" class="tab-container">',
          '<ul class="etabs"></ul>',
          '</div>',
          '<div class="button" data-js="button">',
            '<input type="submit" value="Try it out!" />',
          '</div>',
        '</div>',
        '<div class="result">',
          'Result:',
          '<div class="output"></div>',
          '<div class="errors"></div>',
          '<div class="success"></div>',
        '</div>',
      '</form>'
    ].join('')).appendTo($container);

    if($container.data('hide-tabs')){
      $form.find('ul').hide();
    }

    var exampleID = $container.data('spec-id');
    if(!exampleID){
      callback('data-spec-id is required');
    }

    getExamples.call(this)
      .fail(function(xhr, error){
        callback(error);
      })
      .done(function(){
        var example = _.findWhere(self.examples, { id: exampleID });
        fetchExampleContent.call(self, example, function(err, example){
          if(err){ return callback(err); }

          var htmlEditors = insertFilesToForm(
            example.html, $form, 'text/html', exampleID);

          var jsEditors = insertFilesToForm(
            example.js, $form, 'application/javascript', exampleID);

          $form.find('[data-js="tab-container"]').easytabs({
            defaultTab: 'li:eq(' + ($container.data('selected') || 0) + ')',
            animate: false,
            updateHash: false
          });

          callback(null, {$form: $form, example: example,
                           htmlEditors: htmlEditors, jsEditors: jsEditors});
        });
      })
  }

  function toCodeMirror(content, container, mode){
    return CodeMirror(container, {
      value: content,
      theme: 'blackboard',
      viewportMargin: Infinity,
      lineNumbers: true,
      lineWrapping: true,
      mode: mode
    });
  }

  // loads index file's content into self.examples
  function getExamples(){
    var deferred = $.Deferred();
    var self = this;

    $.get(this.indexURL)
      .done(function(index){
        var examples = [];
        $.each(index, function(key, val){
          examples.push({ id: key, options: val });
        });

        if(examples.length <= 0){
          deferred.reject({
            id: "NoSampleCode",
            message: "No sample code found in index file: " + indexURL
          });
        }
        else {
          self.examples = examples;
          deferred.notify({
            id: "totalCount",
            message: examples.length
          });
          deferred.resolve();
        }
      })
      .fail(function(){
        deferred.reject({
          id: "IndexLoadError",
          message: "Error while loading index file: " + self.indexURL
        })
      })

    return deferred;
  };

  function runEachExample(options){
    var deferred = $.Deferred();
    var totalExamples = this.examples.length;

    var concurrency = options.concurrency || 'parallel';
    if(!_.contains(['parallel', 'series'], concurrency)){
      throw 'concurrency must be "parallel" or "series"';
    }

    async[concurrency](
      generateExampleFunctions.call(this, deferred, {hidden: options.hidden}),
      function(){ deferred.resolve(totalExamples); }
    );

    return deferred;
  };

  // generates an array of functions.
  // Each function will execute a single example. The function will reflect its
  // result both on the deferred object and on the callback function.
  // TODO: refactor this so it either uses promises or async.js, but not both
  function generateExampleFunctions(deferred, options){
    var self = this;
    var successCount = 0;

    return _.map(this.examples, function(example){
      return function(callback){

        fetchExampleContent.call(self, example, function(err, example){
          if(err){
            var error = {
              id: "FileLoadError",
              message: "Error loading files for example: " + example.id
            };
            deferred.reject(error);
            return callback(error);
          }
          else {
            var iframe = runExampleInIframe.call(self, {
              container: $('body'),
              example: example,
              hidden: options.hidden
            }, function(err){
              if(err){
                var error = {
                  id: example.id,
                  message: err
                };
                deferred.reject(error);
                return callback(error);
              }
              else {
                successCount += 1;
                deferred.notify({ id:'examplesCompleted', message: successCount });
                return callback();
              }
            });
          }
        });
      }
    });
  }

  function concatFileContents(files){
    return files.map(function(file){
      return file.content;
    }).join("\n");
  }

  function runExampleInIframe(options, callback){
    options = options || {};
    var $iframe = $('<iframe></iframe>')
                        .attr('src', this.templateURL)
                        .appendTo(options.container);

    if(options.hidden){
      $iframe.hide();
    }

    var iframe = window.frames[window.frames.length - 1];

    var timeoutID;
    if(this.timeout){
      timeoutID = setTimeout(function(){
        callback('timeout');
      }, this.timeout);
    }

    // wait for iframe to be ready
    window.addEventListener("message", function(e){

      // don't answer to messages from other iframes
      if(e.source !== iframe){
        return;
      }

      if(e.data === "ready"){
        // send content to embed
        iframe.postMessage(
          {
            html: concatFileContents(options.example.html),
            js: concatFileContents(options.example.js)
          },
          e.origin
        );
      }
      else if(e.data === "complete"){
        if(timeoutID){ clearTimeout(timeoutID); }
        callback(null);
      }
      else if(e.data.error){
        if(timeoutID){ clearTimeout(timeoutID); }
        callback(e.data.error);
      }
    }, false);

    return $iframe;
  }

  function fetchExampleContent(example, callback){
    var self = this;

    async.parallel(
      [].concat(
        _.map(example.options.html, function(url, label){
          return _.bind(getFile, self, joinPath(self.examplesURL, url), label);
        })
      ).concat(
        _.map(example.options.js, function(url, label){
          return _.bind(getFile, self, joinPath(self.examplesURL, url), label);
        })
      ),
      function(err, files){
        if(err){ callback(err); }
        else {
          // sort files according to example order
          example.html = _.map(example.options.html, function(url){
            return _.find(files, function(file){
              return file.url == joinPath(self.examplesURL, url);
            });
          });
          example.js = _.map(example.options.js, function(url){
            return _.find(files, function(file){
              return file.url == joinPath(self.examplesURL, url);
            });
          });

          callback(null, example);
        }
      }
    );
  }

  function getFile(fileURL, label, callback){
    if(!_.isString(label)){
      label = _.last(fileURL.split('.')).toUpperCase();
    }
    return $.ajax({
      url: fileURL,
      dataType: 'text',
    })
      .done(function(content){
        callback(null, {url:fileURL, content: content, label: label});
      })
      .fail(function(xhr, msg){
        callback(msg);
      });
  }

  var LiveEditor = function(options){
    options || (options = {});

    // indexURL is the path to the json file where examples are listed
    this.indexURL = options.indexURL;
    if(!options.indexURL){
      throw 'indexURL is required';
    }

    // templateURL is the path to the html file that will be used as a template
    // to inject examples into
    this.templateURL = options.templateURL;
    if(!options.templateURL){
      throw 'templateURL is required';
    }

    // examplesURL is the url of the folder where examples are stored
    if(options.examplesURL){
      this.examplesURL = options.examplesURL;
    } else {
      this.examplesURL = getParentFolder(options.indexURL);
    }

    // timeout is the period of time in milliseconds to wait before assuming an
    // example failed. If no timeout is defined, a default will be used.
    // Set timeout to false if you want to wait undefinitely.
    if(options.hasOwnProperty('timeout')){
      this.timeout = options.timeout;
    }
    else {
      this.timeout = 500;
    }
  };

  // runs all code specified on the index file.
  // returns a promise
  //    promise.progress called for each spec that passes
  //    promise.done called when all specs pass
  //    promise.fail called if any spec fails
  LiveEditor.prototype.runExamples = function(options){
    var self = this;
    return getExamples.call(this)
            .then(function(){
              return runEachExample.call(self, {
                hidden: options.hidden,
                concurrency: options.concurrency || 'parallel'
              })
            });
  };

  // takes in an array of DOM elements and transforms them to live editors
  LiveEditor.prototype.toLiveEditor = function(elements, options){
    var self = this;
    elements = $.makeArray(elements);

    $(elements).each(function(){
      elementToLiveEditor.call(self, $(this), options);
    });
  }

  return LiveEditor;

}));


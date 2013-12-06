define(function(require){
  'use strict';

  var $ = require('jquery');
  var _ = require('underscore');
  var CodeMirror = require('codemirror');
  var async = require('async');
  var CodeMirrorHTML = require('codemirrorHTML');
  var easyTabs = require('easyTabs');

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
    var result = toForm($container, options, function(err, result){
      if(err){
        throw(err);
      }

      var $form = result.$form;
      var htmlEditors = result.htmlEditors;
      var jsEditors = result.jsEditors;

      // Render to iframe on submit
      $form.on('submit', function(){
        $form.find('.errors').empty();
        var output = $form.find('.output').empty();
        createIframe(output, {
          js: _.map(jsEditors,
                    function(editor){ return editor.getValue(); }).join("\n"),
          html: _.map(htmlEditors,
                      function(editor){ return editor.getValue(); }).join("\n"),
          templatePath: options.templatePath
        });
        $form.find('.result').css('display', 'inline-block');
        return false;
      });

    });
  }

  function insertFilesToForm(files, $form, mode, exampleID){
    var editors = [];
    _.each(files, function(file, i){
      var id = (exampleID + '-' + _.last(file.url.split('/'))).replace(/\./g, '-');
      var $item = $('<li class="tab"><a href="#' + id + '">' + file.label +
                   '</a></li>').appendTo($form.find('ul'));
      var $container = $('<div id="' + id + '"></div>')
                        .appendTo($form.find('[data-js="tab-container"]'));
      var $code = $('<div class="code"></div>').appendTo($container);

      editors.push(toCodeMirror(file.content, $code[0], mode));
    });
    return editors;
  }

  function toForm($container, options, callback){
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
        '</div>',
      '</form>'
    ].join('')).appendTo($container);

    if($container.data('live-editor-hide-tabs')){
      $form.find('ul').hide();
    }

    var exampleID = $container.data('live-editor');
    if(!exampleID){
      callback('data-live-editor is required');
    }

    $.ajax({
      url: joinPath(options.sourcePath, 'index.json'),
      dataType: 'json'
    })
      .done(function(index){
        var example = index[exampleID];
        example.html = example.html || [];
        example.js = example.js || [];
        example.selected = example.selected || 0;

        // fetch all files
        async.parallel(
          [].concat(
            _.map(example.html, function(url, label){
              return _.partial(getFile,
                               joinPath(options.sourcePath, url),
                               label);
            })
          ).concat(
            _.map(example.js, function(url, label){
              return _.partial(getFile,
                               joinPath(options.sourcePath, url),
                               label);
            })
          ),
          function(err, files){
            if(err){ callback(err); }
            else {
              // sort files according to example order
              var htmlFiles = _.map(example.html, function(url){
                return _.find(files, function(file){
                  return file.url == joinPath(options.sourcePath, url);
                });
              });
              var jsFiles = _.map(example.js, function(url){
                return _.find(files, function(file){
                  return file.url == joinPath(options.sourcePath, url);
                });
              });

              var htmlEditors = insertFilesToForm(
                                  htmlFiles, $form, 'text/html', exampleID);
              var jsEditors = insertFilesToForm(
                                jsFiles, $form, 'application/javascript',
                                exampleID);

              $form.find('[data-js="tab-container"]').easytabs({
                defaultTab: 'li:eq(' + example.selected + ')',
                animate: false,
                updateHash: false
              });
              callback(null, {$form: $form, htmlEditors: htmlEditors,
                              jsEditors: jsEditors});
            }
          }
        );
      })
      .fail(function(xhr, error){
        callback(error);
      });
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


  // takes in an array of DOM elements and transforms them to live editors
  function toLiveEditor(elements, options){
    elements = $.makeArray(elements);
    options = options || {};

    if(!options.sourcePath){
      callback('sourcePath is required');
    }
    if(!options.templatePath){
      callback('sourcePath is required');
    }

    $(elements).each(function(){
      elementToLiveEditor($(this), options);
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

  // runs all code specified on the index file and checks for errors
  LiveEditor.prototype.runExamples = function(options){
    var self = this;
    return this.getExamples()
            .then(function(){
              return self.runEachExample.call(self, { hidden: options.hidden })
            });
  };

  LiveEditor.prototype.getExamples = function(){
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

  LiveEditor.prototype.runEachExample = function(options){
    var deferred = $.Deferred();
    var self = this;
    var successCount = 0;

    _.each(this.examples, function(example){
      self.fetchExampleContent(example, function(err, example){
        if(err){
          deferred.reject({
            id: "FileLoadError",
            message: "Error loading files for example: " + example.id
          });
        }
        else {
          var iframe = self.runExampleInIframe({
            container: $('body'),
            example: example,
            hidden: options.hidden
          }, function(err){
            if(err){
              deferred.reject({
                id: example.id,
                message: err
              });
            }
            else {
              successCount += 1;
              deferred.notify({ id:'examplesCompleted', message: successCount });
              if(successCount === self.examples.length){
                deferred.resolve(self.examples.length);
              }
            }
          });
        }
      });
    });

    return deferred;
  };

  LiveEditor.prototype.runExampleInIframe = function(options, callback){
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
      if(e.data === "ready"){
        // send content to embed
        iframe.postMessage({html: options.example.html, js: options.example.js},
                           e.origin);
      }
      else if(e.data === "complete"){
        callback(null);
      }
      else if(e.data.error){
        callback(e.data.error);
      }
    }, false);

    return $iframe;
  }

  LiveEditor.prototype.fetchExampleContent = function(example, callback){
    var self = this;

    async.parallel(
      [].concat(
        _.map(example.options.html, function(url, label){
          return _.partial(self.getFile, joinPath(self.examplesURL, url), label);
        })
      ).concat(
        _.map(example.options.js, function(url, label){
          return _.partial(self.getFile, joinPath(self.examplesURL, url), label);
        })
      ),
      function(err, files){
        if(err){ callback(err); }
        else {
          // sort files according to example order
          var htmlFiles = _.map(example.options.html, function(url){
            return _.find(files, function(file){
              return file.url == joinPath(self.examplesURL, url);
            });
          });
          var jsFiles = _.map(example.options.js, function(url){
            return _.find(files, function(file){
              return file.url == joinPath(self.examplesURL, url);
            });
          });

          // concat files
          example.js = _.map(jsFiles, function(file){
            return file.content;
          }).join("\n");

          example.html = _.map(htmlFiles, function(file){
            return file.content;
          }).join("\n");

          callback(null, example);
        }
      }
    );
  }

  LiveEditor.prototype.getFile = function(fileURL, label, callback){
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

  return LiveEditor;

});

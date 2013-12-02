define(function(require){
  'use strict';

  var $ = require('jquery');
  var _ = require('underscore');
  var CodeMirror = require('codemirror');
  var heredoc = require('heredoc');
  var async = require('async');
  var CodeMirrorHTML = require('codemirrorHTML');
  var easyTabs = require('easyTabs');

  function toLiveEditor($container){
    var result = toForm($container, function(err, result){
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
                      function(editor){ return editor.getValue(); }).join("\n")
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

  function toForm($container, callback){
    var $form = $(heredoc.strip(function(){ /*
      <form>
        <div class="source">
          <div data-js="tab-container" class="tab-container">
          <ul class="etabs"></ul>
          </div>
          <div class="button" data-js="button">
            <input type="submit" value="Try it out!" />
          </div>
        </div>
        <div class="result">
          Result:
          <div class="output"></div>
          <div class="errors"></div>
        </div>
      </form>
    */})).appendTo($container);

    if($container.data('tryit-hide-tabs')){
      $form.find('ul').hide();
    }

    var path = $container.data('tryit-source') + '/';
    if(!path){
      callback('data-tryit-source is required');
    }

    var exampleID = $container.data('tryit-id');
    if(!exampleID){
      callback('data-tryit-id is required');
    }

    $.ajax({
      url: path + 'index.json',
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
              return _.partial(getFile, url, label);
            })
          ).concat(
            _.map(example.js, function(url, label){
              return _.partial(getFile, url, label);
            })
          ),
          function(err, files){
            if(err){ callback(err); }
            else {
              // sort files according to example order
              var htmlFiles = _.map(example.html, function(url){
                return _.find(files,
                              function(file){ return file.url == url; });
              });
              var jsFiles = _.map(example.js, function(url){
                return _.find(files,
                              function(file){ return file.url == url; });
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

  function createIframe($container, options){
    options = options || {};
    var $iframe = $('<iframe></iframe>')
                        .attr('src', '/specs/template.html')
                        .appendTo($container);

    var iframe = window.frames[window.frames.length - 1];

    iframe.addEventListener("message", function(msg, data, other){
      if(msg.data == 'chaiReady'){
        var $body = $iframe.contents().find('body')
        if(options.html){
          $body.html(options.html);
        }
        if(options.js){
          var script = document.createElement('script');
          $body.append(script);
          script.innerHTML = "define('myTest', function(require){" +
            options.js +
          "}); require(['myTest'], function(){});";
        }
      }
    });

    iframe.onerror = function(errorMsg){
      $container.siblings('.errors').append(errorMsg);
    }

    return $iframe;
  }

  return function(selector){
    $(selector).each(function(){
      toLiveEditor($(this));
    });
  }

});

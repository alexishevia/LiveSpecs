require.config({
  paths: {
    calcjs: '../calc',
    jquery: 'bower_components/jquery/dist/jquery',
    underscore: 'bower_components/underscore/underscore',
    codemirror: 'bower_components/codemirror',
    async: 'bower_components/async/lib/async',
    easyTabs: 'bower_components/easytabs/lib/jquery.easytabs',
    livespecs: 'bower_components/livespecs/livespecs',
    chai: 'bower_components/chai/chai'
  },
  shim: {
    underscore: {
      exports: '_'
    },
    easyTabs: {
      deps: [ 'jquery' ]
    }
  }
});


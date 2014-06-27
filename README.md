# LiveSpecs
Front end testing using live sample code.

LiveSpecs is based on 3 ideas:
- Every project needs good documentation and test coverage
- Documentation should never go out of date
- Code samples are the best type of documentation

With LiveSpecs you can write code samples that can be displayed on your documentation site, but also run as part of your test suite.

## Installation
Using bower:
```
bower install livespecs
```

Or you can just grab [livespecs.js](https://raw.githubusercontent.com/alexishevia/LiveSpecs/master/livespecs.js) and [livespecs.css](https://raw.githubusercontent.com/alexishevia/LiveSpecs/master/livespecs.css) and include them on your project.

** Live Specs is AMD compatible, but you can also use it as a global window variable.

## Dependencies
LiveSpecs depends on a bunch of libraries:
jquery, underscore, codemirror, easytabs, async

I'm currently working on reducing the amount of dependencies.

## Usage
First, create an index.json with all your specs
```
{
  "mySpecA": {
    "js": {
      "Example": "some_file_with_code.js",
      "Result": "some_file_with_assertions.js"
    },
    "selected": 0
  },
  "mySpecB": {
    "js": {
      "Step 1": "file_with_code.js",
      "Step 2": "other_file_with_code.js",
      "Step 3": "file_with_more_code.js"
    },
    "selected": 0
  }
}
```

Then, create a template file where your specs will be rendered into
```
<script>
  // listen to parent's message for content
  window.addEventListener("message", function(e){
    var body = document.getElementsByTagName('body')[0];
    if(e.data.html){
      body.innerHTML += e.data.html;
    }
    if(e.data.js){
      var script = document.createElement('script');
      body.appendChild(script);
      script.innerHTML = e.data.js;
    }
  }, false);

  // notify parent of any error
  window.onerror = function(e){
    parent.postMessage({error: e}, '*');
  };

  // tell parent we're ready to receive content
  parent.postMessage('ready', '*');
</script>
```

On your documentation site, include one or more elements with a `data-live-editor` property containing the id of the spec you want to render
```
<p>Here I can explain how my library works.</p>
<div class="live-editor" data-live-editor="mySpecA"></div>
```

Convert them to LiveSpecs by running
```
new LiveSpecs({
  indexURL: '/path/to/index.json',
  templateURL: '/path/to/template'
})
  .toLiveEditor($(".live-editor"));
```

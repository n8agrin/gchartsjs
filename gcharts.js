/*
Copyright (c) <2008> <Nate Agrin: n8agrin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
gchartjs is a Javascript dynamo for the Google Charts API.
It's inheritance model is based on Douglas Crockford's notion of functional
inheritance.  I've modified that model a bit to add some convience functions
such as 'inherits' which allows for module-like mixin behavior.  To create
new objects in gchartjs, one should never have to call 'new'.  For example:

// THIS WON'T WORK!!!!
var lc = new gchart.line_chart({height: 20, width: 100});

is unessecary.  Instead the function 'gchart.line_chart()' returns an object
which can be used to create a line chart or to extend further.  Hence you
should be writing the above line like so:

var lc = gchart.line_chart({height: 20, width: 100});


@author: Nate Agrin
@date: 5-24-08
@version: 0.5
@license: MIT

@usage:
var lc = gchart.line_chart({height: 20, width: 20});
lc.add_data({
  data: [1,2,3,4,5],
  color: '000000',
  label: 'foo'
});
lc.to_url();
var img = lc.to_img();

GCHARTJS CURRENTLY SUPPORTS A LIMITED SUBSET OF THE GOOGLE CHART API.
AVAILABLE CHART TYPES ARE:

Bar charts
Line charts

Accessories:
Fills
Line / Bar colors
Legends
*/
(function(){

this.gchart = {};

gchart.base = function (specs) {
  specs = specs || {};
  
  // pseudo constants
  var VERSION = '0.5';
  var BASE_URL = 'http://chart.apis.google.com/chart?';
  var CHART_TYPES = ['lc',    // line chart
                     'lxy',   // line chart xy
                     'ls',    // sparkline
                     'bhs',   // bar chart horizontal (single)
                     'bvs',   // bar chart vertical (single)
                     'bhg',   // bar chart horizontal (grouped)
                     'bvg',   // bar chart vertical (grouped)
                     'p',     // pie chart (2d)
                     'p3',    // pie chart (3d)
                     'v',     // Venn diagram
                     's',     // scatter plots
                     'r',     // radar chart (straight lines)
                     'rs',    // radar chart (splines)
                     't',     // map
                     'gom'];  // Google-o-meter!
  
  // private attributes
  var data_sets = [];
  
  // 'that' is the object that gchart.base eventually returns
  var that = {
    height: 0,
    width:  0,
    type:   '',
    title:  '',
    specs: specs
  };
  
  // handle the options passed in
  that.type   = specs['type']   || 'base';
  that.width  = specs['width']  || 200;
  that.height = specs['height'] || 100;
  
  var get_version = function () {
    return VERSION;
  }
  that.get_version = get_version;
  
  // This is a simplified way for including properties and methods from 
  // modules which also allows for the calling of a super-class' overwritten
  // method. It was largely adapted from the method developed by
  // John Resig here: http://ejohn.org/blog/simple-javascript-inheritance/
  var includes = function (provider) {
    for (var attribute in provider) {
      if (this.hasOwnProperty(attribute) &&
          typeof provider[attribute] === 'function' &&
          typeof this[attribute] === 'function') {
        var _super = this[attribute];
        this[attribute] = function () {
          this._super = _super;
          var ret = provider[attribute].apply(this, arguments);
          delete this._super;
          return ret;
        };
      }
      else {
        this[attribute] = provider[attribute];
      }
    }
    return this;
  };
  that.includes = includes;
  
  
  // data handling methods
  var add_data_set = function (data) {
    data_sets.push(data);
    return this;
  };
  that.add_data_set = add_data_set;
  
  var get_data_sets = function () {
    return data_sets;
  };
  that.get_data_sets = get_data_sets;
  
  var encode_data = function (encoding) {
    if (this.get_data_sets().length == 0) {
      throw "You must provide data for the chart.";
    }
    switch(encoding) {
      case('simple'):
      case('s'):
        return simple_encoding();
        break;
      case('enhanced'):
      case('e'):
        return enhanced_encoding();
        break;
      default:
        return no_encoding();
        break;
    }
  };
  that.encode_data = encode_data;
  
  var no_encoding = function() {
    var flattened_array = [];
    var data_sets = get_data_sets();
    for (var i=0; i < data_sets.length; i += 1) {
      flattened_array.push(data_sets[i].data.join(','));
    }
    return 'chd=t:' + flattened_array.join('|');
  };
  
  // Straight from http://code.google.com/apis/chart/#simple with some
  // modifications. This function currently scales the datasets to the largest
  // value in the cumulative datasets, which may or may not be a desired
  // funciton of the encoding.
  var simple_encoding = function () {
    var simple_encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var chart_data = [];
    var cumulative_data = [];
    var max_value = 0;

    for (var i=0; i < data_sets.length; i += 1) {
      cumulative_data = cumulative_data.concat(data_sets[i].data);
    }
    max_value = cumulative_data.sort(function(a,b) {return (a - b);}).pop();

    for (var i=0; i < data_sets.length; i += 1) {
      var data_set = [];
      for (var j = 0; j < data_sets[i].data.length; j++) {
        var current_value = data_sets[i].data[j];
        if (!isNaN(current_value) && current_value >= 0) {
          data_set.push(
            simple_encoding.charAt(
              Math.round(
                (simple_encoding.length-1) * current_value / max_value)));
        }
        else {
          data_set.push('_');
        }
      } 
      chart_data.push(data_set.join(''));
    }
    return 'chd=s:' + chart_data.join(',');
  };
  
  var enhanced_encoding = function () {
    throw "Not yet implemented.";
  };
  
  var get_url_parts = function (encoding) {
    encoding = encoding || null;
    var uri = [];
    uri.push(this.encode_data(encoding));
    uri.push(this.get_type());
    uri.push(this.get_size());
    if (this.has_title()) uri.push('chtt='+this.title.replace(' ', '+'));
    return uri;
  };
  that.get_url_parts = get_url_parts;
  
  var to_url = function (encoding, safe) {
    safe = safe || false;
    var parts = this.get_url_parts(encoding);
    return safe ? BASE_URL + parts.join('&amp;') : BASE_URL + parts.join('&');
  };
  that.to_url = to_url;
  
  var to_img = function () {
    var img = document.createElement('img');
    img.src = this.to_url();
    if (this.has_title()) {
      img.title = img.alt = this.title;
    }
    else {
      img.title = img.alt = "Google chart";
    }
    return img;
  };
  that.to_img = to_img;


  // Handle the size
  var check_size = function () {
    if (this.height * this.width > 300000 ||
        this.height * this.width <= 0) {
      throw "Chart cannot be larger than 300,000 pixels squared or less " +
            "than or equal to 0 pixels squared.";
    }
    return true;
  };
  that.check_size = check_size;

  var get_size = function () {
    if (this.check_size()) return 'chs=' + this.width + 'x' + this.height;
  };
  that.get_size = get_size;


  // Handle the type
  var check_type = function () {
    if (this.type === '' || typeof this.type === 'undefined') {
      throw "You must specify a supported chart type.";
    }
    for (var i=0; i < CHART_TYPES.length; i += 1) {
      if (CHART_TYPES[i] === this.type) return true;
    }
    throw "Chart type '" + this.type + "' is not currently supported.";
  };
  that.check_type = check_type;

  var get_type = function() {
    if (this.check_type()) return 'cht=' + this.type;
  };
  that.get_type = get_type;


  // title handling
  var has_title = function () {
    return (typeof this.title !== 'undefined' && this.title !== '');
  };
  that.has_title = has_title;

  return that;
};

// Mixins are object literals whose properties get attached to a chart object
// through the use of the that.includes() method.  When a mixin defines a
// method already available in the parent object, includes allows access to
// the parent's method via a call to this._super() within the overwritten
// method's functional body.
gchart.mixins = {};

gchart.mixins.color = {
  // data can really only have line coloring and the labeling
  get_colors: function() {
    var chco = [];
    var data_sets = this.get_data_sets();
    var has_data = false;
    var has_array = false;
    
    // first go through and handle the base cases
    for (var i=0; i < data_sets.length; i += 1) {
      if (typeof data_sets[i]['color'] !== 'undefined') {
        has_data = true;
        if (data_sets[i]['color'].constructor === Array) has_array = true;
        chco.push(this.get_data_sets()[i]['color']);
      }
      // add in a blank space in case other data sets have colors
      else {
        chco.push('');
      }
    }

    // handle the colors as 2d arrays and single strings
    if (has_data && has_array) {
      return 'chco=' + chco.join('|');
    }
    else if (has_data){
      return 'chco=' + chco.join(',');
    }
    return [];
  },
  
  get_url_parts: function(enc) {
    return this._super(enc).concat(this.get_colors());
  }
};

gchart.mixins.legend = {
  get_legend: function () {
    var chdl = [];
    var data_sets = this.get_data_sets();
    var has_data = false;
    
    for (var i=0; i < data_sets.length; i += 1) {
      if (typeof data_sets[i]['label'] !== 'undefined') {
        has_data = true;
        chdl.push(data_sets[i]['label']); 
      }
      // add an empty string as a spacer incase a value has been omitted
      else {
        chdl.push('');
      }
    }
    return has_data ? 'chdl=' + chdl.join('|') : [];
  },
  
  get_url_parts: function(enc) {
    return this._super(enc).concat(this.get_legend());
  }
};


gchart.mixins.fill = {
  fills: [],
  
  // Fills have types: solid, gradient or stripes; elements they can be
  // applied to: chart, background, transparency and a color in hex form
  // with an optional opacity set.
  add_fill: function(fill) {
    if (typeof fill.type === 'undefined' ||
        typeof fill.element === 'undefined' ||
        typeof fill.color === 'undefined') {
      throw "You must define a fill type, element and color for a fill.";
    }
    this.fills.push(fill);
  },
  
  // handle the fill
  // there are 4 types:
  // fill area  chm=[b|B,hex,start,end]
  // solid fill chf=[bg|c|a,s,hex]
  // linear fill chf=[bg|c,lg,angle,color1,offset1,colorN,offsetN]
  // linear stripes chf=[bg|c,ls,angle,color1,width1...N]
  get_fills: function() {
    var fills = [];
    if (this.fills.length == 0) return fills;

    for (var i=0; i < this.fills.length; i++) {
      var fill = [];
      fill.push(this._get_fill_element(this.fills[i]));
      switch(this.fills[i].type) {
        case('solid'):
        case('s'):
          fill.push('s');
          fill.push(this.fills[i].color);
          if (this.fills[i].opacity !== undefined) {
            fill[2] += this.fills[i].opacity;
          }
        break;
        case('gradient'):
        case('lg'):
        case('linear gradient'):
          fill.push('lg');
          fill.push(this.fills[i].angle);
          // is it an array or a single color?
          if (this.fills[i].color && this.fills[i].color.constructor == Array) {
            for(var j=0; j < this.fills[i].color.length; j++) {
              fill.push(this.fills[i].color[j]);
              fill.push(this.fills[i].offset[j]);
            }
          }
          else {
            fill.push(this.fills[i].color);
            fill.push(this.fills[i].offset);
          }
        break;
        case('stripes'):
        case('ls'):
        case('linear stripes'):
          fill.push('ls');
          fill.push(this.fills[i].angle);
          // is it an array or a single color?
          if (this.fills[i].color && this.fills[i].color.constructor == Array) {
            for(var j=0; j < this.fills[i].color.length; j++) {
              fill.push(this.fills[i].color[j]);
              if (this.fills[i].width && this.fills[i].width.constructor == Array) {
                fill.push(this.fills[i].width[j]);
              }
              else {
                fill.push(this.fills[i].width);
              }
            }
          }
          else {
            fill.push(this.fills[i].color);
            fill.push(this.fills[i].width);
          }
        break;
      }
      
      

      fills.push(fill.join(','));
    }
    return 'chf=' + fills.join('|');
  },
  
  _get_fill_element: function(fill) {
    switch(fill.element) {
      case('bg'): case('background'):
        return 'bg';
      break;
      case('c'): case('chart'):
        return 'c';
      break;
      case('a'): case('transparent'): case('transparency'):
        if (fill.type != 'solid' && fill.type != 's') {
          throw "Transparent fills cannot be used with gradient or stripe fills.";
        }
        return 'a';
      break;
      default:
        throw "The solid fill type '" + fill.type +
              "' was not recognized; try 'bg', 'c' or 'a'.";
      break;
    }
  },
  
  get_url_parts: function(enc) {
    return this._super(enc).concat(this.get_fills());
  }
};

gchart.mixins.axis = {
  axes: [],
  
  add_axis: function(axis) {
    axis['labels'] = axis['labels'] || [];
    axis['positions'] = axis['positions'] || [];
    axis['range'] = axis['range'] || [];
    axis['style'] = axis['style'] || [];
    this.axes.push(axis);
  },
  
  get_axes: function() {
    var chxt = []; // type
    var chxl = []; // label
    var chxp = []; // position
    var chxr = []; // range
    var chxs = []; // style
    for(var i=0; i < this.axes.length; i++) {
      chxt.push(this.axes[i].type);      
      if (this.axes[i].labels.length > 0) {
        chxl.push(i + ':|' + this.axes[i].labels.join('|'));
      }
      if (this.axes[i].positions.length > 0) {
        chxp.push(i + ',' + this.axes[i].positions.join(',')); 
      }
      if (this.axes[i].range.length > 0) {
        chxr.push(i + ',' + this.axes[i].range.join(',')); 
      }
      if (this.axes[i].style.length > 0) {
        chxs.push(i + ',' + this.axes[i].style.join(',')); 
      }
    }
    var url_parts = [];
    if (chxt.length > 0) {
      url_parts.push('chxt=' + chxt.join(','));
    }
    if (chxl.length > 0) {
      url_parts.push('chxl=' + chxl.join('|'));
    }
    if (chxp.length > 0) {
      url_parts.push('chxp=' + chxp.join('|'));
    }
    if (chxr.length > 0) {
      url_parts.push('chxr=' + chxr.join('|'));
    }
    if (chxs.length > 0) {
      url_parts.push('chxs=' + chxs.join('|'));
    }
    return url_parts;
  },
  
  get_url_parts: function(enc) {
    return this._super(enc).concat(this.get_axes());
  }
};

// Bar charts
gchart.bar_chart = function (specs) {
  var that = gchart.base(specs);
  that.includes(gchart.mixins.color);
  that.includes(gchart.mixins.legend);
  that.includes(gchart.mixins.fill);
  that.includes(gchart.mixins.axis);
  that.type = 'bhs';
  return that;
};

gchart.vertical_bar_chart = function(specs) {
  var that = gchart.bar_chart(specs);
  that.type = 'bvs'; // default is vertical stacked bar chart
  if (typeof that.specs['grouped'] !== 'undefined' && that.specs['grouped']) {
    that.type = 'bvg';
  }
  return that;
};

gchart.horizontal_bar_chart = function(specs) {
  var that = gchart.bar_chart(specs);
  that.type = 'bhs'; // default is horizontal stacked bar chart
  if (typeof that.specs['grouped'] !== 'undefined' && that.specs['grouped']) {
    that.type = 'bhg';
  }
  return that;
};

// Line Charts
gchart.line_chart = function (specs) {
  var that = gchart.base(specs);
  that.includes(gchart.mixins.color);
  that.includes(gchart.mixins.legend);
  that.includes(gchart.mixins.fill);
  that.includes(gchart.mixins.axis);
  that.type = 'lc';
  return that;
};

gchart.line_chart_xy = function (specs) {
  var that = gchart.line_chart(specs);
  that.type = 'lxy';
  return that;
};

gchart.sparkline = function (specs) {
  var that = gchart.line_chart(specs);
  that.type = 'ls';
  return that;
};

})();
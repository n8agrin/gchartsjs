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

// ...on to the code!
// gchartjs, a Javascript dynamo for the Google Charts API.
// JS syntax largely inspired by jQuery and Prototype.
//
// @author: Nate Agrin
// @date: 4-16-08
// @version: 0.1
// @license: MIT
(function(){

// Simplified Inheritance,
// Courtesy of http://phrogz.net/js/classes/OOPinJS2.html
Function.prototype.inheritsFrom = function(parentClassOrObject) { 
  if (parentClassOrObject.constructor == Function) { 
    //Normal Inheritance 
    this.prototype = new parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject.prototype;
  } 
  else { 
    //Pure Virtual Inheritance 
    this.prototype = parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject;
  } 
  return this;
}

// The $A function is straight from Prototype.js
// http://www.prototypejs.org/
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

if (navigator.userAgent.indexOf('AppleWebKit/') > -1) {
  function $A(iterable) {
    if (!iterable) return [];
    if (!(Object.isFunction(iterable) && iterable == '[object NodeList]') &&
        iterable.toArray) return iterable.toArray();
    var length = iterable.length, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  }
}

// bind() and wrap() are modified versions of the same functions from
// Prototype.js: http://www.prototypejs.org/
Function.prototype.bind = function() {
  if (arguments.length < 2 && typeof arguments[0] == 'undefined') return this;
  var __method = this, args = $A(arguments), object = args.shift();
  return function() {
    return __method.apply(object, args.concat($A(arguments)));
  }
}

Function.prototype.wrap = function(wrapper) {
  var __method = this;
  return function() {
    return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
  }
}

// Enables mixin-like behavior
Object.extend = function(destination, source) {
  for (property in source) {
    if (destination[property] === undefined) {
      destination[property] = source[property];
    }
    else if (typeof(destination[property]) === 'function') {
      destination[property] = destination[property].wrap(source[property]);
    }
  }
  return destination;
}

Object.isArray = function(object) {
  return object && object.constructor === Array;
}

/* Simple data types

var data = new GChart.Data();

var lc = new GChart.LineChart({height:100, width:100});
lc.addData([1,2,3,4,5], {color: '000000', label: 'foobar'});

var pie = new GChart.PieChart({h:100, w:100});
pie.addData([1,2,3,4,5], {color: ['000000', 'ff0000'], label: ['foo', 'bar', 'goo']})
*/

var GChart = window.GChart = {
  VERSION:     '0.1',
  BASE_URL:    'http://chart.apis.google.com/chart?',
  CHART_TYPES: ['lc',    // line chart
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
                'gom'],  // Google-o-meter!
  
  height:      0,
  width:       0,
  type:        '',
  title:       '',
  dataSets:    [],
  options:     {},
  
  // Data functions
  addData: function(data) {
    this.dataSets.push(data);
  },
  
  encodeData: function(encoding) {
    if (this.dataSets.length == 0) throw 'You must provide data for the chart.';
    switch(encoding) {
      case('simple'):
      case('s'):
        return this.simpleEncoding();
      break;
      case('enhanced'):
      case('e'):
        return this.enhancedEncoding();
      break;
      default:
        return this.noEncoding();
      break;
    }
  },

  noEncoding: function() {
    var flattenedArray = [];
    for (var i=0; i < this.dataSets.length; i++) {
      flattenedArray.push(this.dataSets[i].data.join(','));
    }
    return 'chd=t:' + flattenedArray.join('|');
  },
  
  // Straight from http://code.google.com/apis/chart/#simple with some
  // modifications. This function currently scales the datasets to the largest
  // value in the cumulative datasets, which may or may not be a desired funciton
  // of the encoding.
  simpleEncoding: function() {
    var simpleEncoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var chartData = [];
    var cumulativeData = [];
    var maxValue = 0;
    
    for (var i in this.dataSets) {
      cumulativeData = cumulativeData.concat(this.dataSets[i].data);
    }
    maxValue = cumulativeData.sort(function(a,b) {return (a - b);}).pop();
    
    for (var i in this.dataSets) {
      var dataSet = [];
      for (var j = 0; j < this.dataSets[i].data.length; j++) {
        var currentValue = this.dataSets[i].data[j];
        if (!isNaN(currentValue) && currentValue >= 0) {
          dataSet.push(simpleEncoding.charAt(Math.round((simpleEncoding.length-1) * currentValue / maxValue)));
        }
        else {
          dataSet.push('_');
        }
      } 
      chartData.push(dataSet.join(''));
    }
    return 'chd=s:' + chartData.join(',');
  },
  
  enhancedEncoding: function() {
    throw "Not yet implemented.";
  },

  // Size functions
  checkSize: function() {
    if (this.height * this.width > 300000 ||
        this.height * this.width <= 0) {
      throw "Chart cannot be larger than 300,000 pixels squared or less " +
            "than or equal to 0 pixels squared.";
    }
    return true;
  },

  getSize: function() {
    if (this.checkSize()) return 'chs=' + this.width + 'x' + this.height;
  },

  // Type functions
  checkType: function() {
    if (this.type == '' || this.type == undefined) {
      throw "You must specify a supported chart type.";
    }
    for (i in this.CHART_TYPES) {
      if (this.CHART_TYPES[i] == this.type) return true;
    }
    throw "Chart type '" + this.type + "' is not currently supported.";
  },

  // Return the type in a Google Chart formated way.
  getType: function() {
    if (this.checkType()) return 'cht=' + this.type;
  },
  
  hasTitle: function() {
    if (this.title !== undefined && this.title !== '') return true;
    return false;
  },
  
  getUriParts: function(encoding) {
    encoding = encoding || null; // null, 'simple', 'enhanced'
    var uri = [this.BASE_URL];
    uri.push(this.encodeData(encoding));
    uri.push(this.getType());
    uri.push(this.getSize());
    if (this.hasTitle()) uri.push('chtt='+this.title.replace(' ', '+'));
    return uri;
  },
  
  toImg: function() {
    var img = document.createElement('img');
    img.src = this.toUri();
    if (this.hasTitle()) {
      img.title = img.alt = this.title;
    }
    else {
      img.title = img.alt = "Google chart";
    }
    return img;
  },

  toUri: function(encoding, safe) {
    safe = safe || false;
    var uri = this.getUriParts(encoding);
    return safe ? uri.join('&amp;') : uri.join('&');
  }
};

GChart.Base = function(options) {
  if (options === undefined) return;
  this.height = options['height'] || this.height;
  this.width  = options['width']  || this.width;
  this.type   = options['type']   || this.type;
  this.title  = options['title']  || this.title;
};
GChart.Base.inheritsFrom(GChart);

// Mixins
GChart.Mixins = {};

GChart.Mixins.Color = {
  // data can really only have line coloring and the labeling
  getColors: function() {
    var chco = [];
    
    // first go through and handle the base cases
    for (var i=0; i < this.dataSets.length; i++) {
      if (this.dataSets[i].options.color !== undefined) {
        chco.push(this.dataSets[i].options.color);
      }
      // add in a blank space in case other dataSets have colors
      else if (chco.length > 0) {
        chco.push('');
      }
    }

    // handle the colors as 2d arrays and single strings
    if (chco.length > 0 && chco[0].constructor == Array) {
      return 'chco=' + chco.join('|');
    }
    else if (chco.length > 0){
      return 'chco=' + chco.join(',');
    }
    return '';
  },
  
  getUriParts: function(original, enc) {
    return original(enc).concat(this.getColors());
  }
}

GChart.Mixins.Legend = {
  getLegend: function() {
    var chdl = [];
    
    for (var i=0; i < this.dataSets.length; i++) {
      if (this.dataSets[i].options.label !== undefined) {
       chdl.push(this.dataSets[i].options.label); 
      }
      // if they've added a label for something else,
      // add an empty string as a spacer
      else if (chdl.length > 0) {
        chdl.push('');
      }
    }
    
    if (chdl.length > 0) {
      return 'chdl=' + chdl.join('|');
    }
    return chdl;
  },
  
  getUriParts: function(original, enc) {
    return original(enc).concat(this.getLegend());
  }
}

GChart.Mixins.Fill = {
  fills: [],
  
  // Fills have types: solid, gradient or stripes; elements they can be
  // applied to: chart, background, transparency and a color in hex form
  // with an optional opacity set.
  //
  addFill: function(fill) {
    if (fill.type === undefined ||
        fill.element === undefined ||
        fill.color === undefined) {
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
  getFills: function() {
    var _fills = [];
    if (this.fills.length == 0) return _fills;

    for (var i=0; i < this.fills.length; i++) {
      var fill = [];
      fill.push(this._getFillElement(this.fills[i]));
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
          if (Object.isArray(this.fills[i].color)) {
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
          if (Object.isArray(this.fills[i].color)) {
            for(var j=0; j < this.fills[i].color.length; j++) {
              fill.push(this.fills[i].color[j]);
              if (Object.isArray(this.fills[i].width)) {
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
      
      

      _fills.push(fill.join(','));
    }
    return 'chf=' + _fills.join('|');
  },
  
  _getFillElement: function(fill) {
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
  
  getUriParts: function(original, enc) {
    return original(enc).concat(this.getFills());
  }
}

GChart.Mixins.Axis = {
  axes: [],
  
  addAxis: function(axis) {
    this.axes.push(axis);
  },
  
  getAxes: function() {
    var chxt = []; //type
    var chxl = []; //label
    var chxp = []; //position
    var chxr = []; //range
    var chxs = []; //style
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
    var uriParts = [];
    if (chxt.length > 0) {
      uriParts.push('chxt=' + chxt.join(','));
    }
    if (chxl.length > 0) {
      uriParts.push('chxl=' + chxl.join('|'));
    }
    if (chxp.length > 0) {
      uriParts.push('chxp=' + chxp.join('|'));
    }
    if (chxr.length > 0) {
      uriParts.push('chxr=' + chxr.join('|'));
    }
    if (chxs.length > 0) {
      uriParts.push('chxs=' + chxs.join('|'));
    }
    return uriParts;
  },
  
  getUriParts: function(original, enc) {
    return original(enc).concat(this.getAxes());
  }
}

// Chart types
GChart.HorizontalBarChart = function(options) {
  this.parent.constructor.apply(this, arguments);
  if (options['grouped'] || options['g']) {
    this.type = 'bhg';
  }
  else {
    this.type = 'bhs';
  }
  Object.extend(this, GChart.Mixins.Fill);
  Object.extend(this, GChart.Mixins.Color);
  Object.extend(this, GChart.Mixins.Legend);
  Object.extend(this, GChart.Mixins.Axis);
}
GChart.HorizontalBarChart.inheritsFrom(GChart.Base);

GChart.VerticalBarChart = function(options) {
  this.parent.constructor.apply(this, arguments);
  if (options['grouped'] || options['g']) {
    this.type = 'bvg';
  }
  else {
    this.type = 'bvs';
  }
  Object.extend(this, GChart.Mixins.Fill);
  Object.extend(this, GChart.Mixins.Color);
  Object.extend(this, GChart.Mixins.Legend);
}
GChart.VerticalBarChart.inheritsFrom(GChart.Base);

GChart.LineChart = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'lc';
  Object.extend(this, GChart.Mixins.Axis);
  Object.extend(this, GChart.Mixins.Fill);
  Object.extend(this, GChart.Mixins.Color);
  Object.extend(this, GChart.Mixins.Legend);
}
GChart.LineChart.inheritsFrom(GChart.Base);

GChart.LineChartXY = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'lxy';
}
GChart.LineChartXY.inheritsFrom(GChart.Base);

GChart.Sparkline = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'ls';
  Object.extend(this, GChart.Mixins.Fill);
}
GChart.Sparkline.inheritsFrom(GChart.Base);

GChart.PieChart = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'p';
}
GChart.PieChart.inheritsFrom(GChart.Base);

GChart.PieChart3d = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'p3';
}
GChart.PieChart3d.inheritsFrom(GChart.Base);

GChart.GoogleOMeter = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = 'gom';
}
GChart.GoogleOMeter.inheritsFrom(GChart.Base);

// Data object which holds an internal array of data points and a hash of
// sytle options which include:
// {
//  color: ['000000'] // equivalent to chco=000000
//  label: 'foo'      // equivalent to chdl=foo or chl=foo for pie charts
// }
GChart.Data = function(data, options) {
  this.data    = data    || [];
  this.options = options || {};
}

// type: x,y,r,t
// labels: ['Jan', 'Feb'] or [1,2,3], etc.
// positions: [0,1,2], etc.
// range [min, max]
// style [color, fontsize, alignment]
GChart.Axis = function(type, labels, positions, range, style) {
  this.type      = type || '';
  this.labels    = labels || [];
  this.positions = positions || [];
  this.range     = range || [];
  this.style     = style || [];
}

})(); // end of gchartjs :)
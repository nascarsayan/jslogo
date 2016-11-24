//
// Turtle Graphics in Javascript
//

// Copyright (C) 2011 Joshua Bell
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function CanvasTurtle(canvas_ctx, turtle_ctx, width, height) {
  'use strict';

  // Stub for old browsers w/ canvas but no text functions
  canvas_ctx.fillText = canvas_ctx.fillText || function fillText(string, x, y) { };

  width = Number(width);
  height = Number(height);

  function deg2rad(d) { return d / 180 * Math.PI; }
  function rad2deg(r) { return r * 180 / Math.PI; }
  function font(px, name) {
    px = Number(px);
    name = String(name).toLowerCase();
    if (['serif', 'sans-serif', 'cursive', 'fantasy', 'monospace'].indexOf(name) === -1)
      name = JSON.stringify(name);
    return String(px) + 'px ' + name;
  }
  function mod(a, b) {
    var r = a % b;
    return r < 0 ? r + b : r;
  }

  var self = this;
  function moveto(x, y, setpos) {

    function _go(x1, y1, x2, y2) {
      if (self.filling) {
        canvas_ctx.lineTo(x1, y1);
        canvas_ctx.lineTo(x2, y2);
      } else if (self.down) {
        canvas_ctx.beginPath();
        canvas_ctx.moveTo(x1, y1);
        canvas_ctx.lineTo(x2, y2);
        canvas_ctx.stroke();
      }
    }

    var w = width / self.sx, h = height / self.sy;

    var left = -w / 2, right = w / 2,
        bottom = -h / 2, top = h / 2;

    var ix, iy, wx, wy, fx, fy, less;

    // Hack to match UCBLogo: don't draw line across viewport on
    // `SETXY 250 10  SETXY 300 20  SETXY 350 30`
    if (setpos && self.turtlemode === 'wrap') {
      var oob = (x < left || x >= right || y < bottom || y >= top);
      var px = x, py = y;
      if (self.was_oob) {
        var dx = mod(x + w / 2, w) - (x + w / 2);
        var dy = mod(y + h / 2, h) - (y + h / 2);
        x += dx;
        y += dy;
        self.x = self.px + dx;
        self.y = self.py + dy;
      }
      self.was_oob = oob;
      self.px = px;
      self.py = py;
    } else {
      self.was_oob = false;
    }

    while (true) {
      // TODO: What happens if we switch modes and turtle is outside bounds?

      switch (self.turtlemode) {
        case 'window':
          _go(self.x, self.y, x, y);
          self.x = self.px = x;
          self.y = self.py = y;
          return;

        default:
        case 'wrap':
        case 'fence':

          // fraction before intersecting
          fx = 1;
          fy = 1;

          if (x < left) {
            fx = (self.x - left) / (self.x - x);
          } else if (x > right) {
            fx = (self.x - right) / (self.x - x);
          }

          if (y < bottom) {
            fy = (self.y - bottom) / (self.y - y);
          } else if (y > top) {
            fy = (self.y - top) / (self.y - y);
          }

          if (!isFinite(fx) || !isFinite(fy)) {
            console.log('x', x, 'left', left, 'right', right);
            console.log('y', y, 'bottom', bottom, 'top', top);
            console.log('fx', fx, 'fy', fy);
            throw new Error("Wrapping error: non-finite fraction");
          }

          // intersection point (draw current to here)
          ix = x;
          iy = y;

          // endpoint after wrapping (next "here")
          wx = x;
          wy = y;

          if (fx < 1 && fx <= fy) {
            less = (x < left);
            ix = less ? left : right;
            iy = self.y - fx * (self.y - y);
            x += less ? w : -w;
            wx = less ? right : left;
            wy = iy;
          } else if (fy < 1 && fy <= fx) {
            less = (y < bottom);
            ix = self.x - fy * (self.x - x);
            iy = less ? bottom : top;
            y += less ? h : -h;
            wx = ix;
            wy = less ? top : bottom;
          }

          _go(self.x, self.y, ix, iy);

          if (self.turtlemode === 'fence') {
            // FENCE - stop on collision
            self.x = self.px = ix;
            self.y = self.py = iy;
            return;
          } else {
            // WRAP - keep going
            self.x = wx;
            self.y = wy;
            if (fx >= 1 && fy >= 1)
              return;
          }

          break;
      }
    }
  }

  this.move = function(distance) {
    var x, y, point, saved_x, saved_y, EPSILON = 1e-3;

    point = Math.abs(distance) < EPSILON;

    if (point) {
      saved_x = this.x;
      saved_y = this.y;
      distance = EPSILON;
    }

    // Mostly for tests: limit precision
    var PRECISION = 10;
    function precision(n) {
      var f = Math.pow(10, PRECISION);
      return Math.round(n * f) / f;
    }

    x = precision(this.x + distance * Math.cos(this.r));
    y = precision(this.y + distance * Math.sin(this.r));
    moveto(x, y);

    if (point) {
      this.x = this.px = saved_x;
      this.y = this.px = saved_y;
    }
  };

  this.turn = function(angle) {
    this.r -= deg2rad(angle);
  };

  this.penup = function() { this.down = false; };
  this.pendown = function() { this.down = true; };

  this.setpenmode = function(penmode) {
    this.penmode = penmode;
    canvas_ctx.globalCompositeOperation =
                (this.penmode === 'erase') ? 'destination-out' :
                (this.penmode === 'reverse') ? 'difference' : 'source-over';
    if (penmode === 'paint')
      canvas_ctx.strokeStyle = canvas_ctx.fillStyle = this.color;
    else
      canvas_ctx.strokeStyle = canvas_ctx.fillStyle = '#ffffff';
  };
  this.getpenmode = function() { return this.penmode; };

  this.setturtlemode = function(turtlemode) { this.turtlemode = turtlemode; };
  this.getturtlemode = function() { return this.turtlemode; };

  this.ispendown = function() { return this.down; };

  this.setcolor = function(color) {
    this.color = color;
    canvas_ctx.strokeStyle = this.color;
    canvas_ctx.fillStyle = this.color;
  };
  this.getcolor = function() { return this.color; };

  this.setbgcolor = function(color) {
    this.bgcolor = color;
    this.clear();
  };
  this.getbgcolor = function() { return this.bgcolor; };

  this.setwidth = function(width) {
    this.width = width;
    canvas_ctx.lineWidth = this.width;
  };
  this.getwidth = function() { return this.width; };

  this.setfontsize = function(size) {
    this.fontsize = size;
    canvas_ctx.font = font(this.fontsize, this.fontname);
  };
  this.getfontsize = function() { return this.fontsize; };

  this.setfontname = function(name) {
    this.fontname = name;
    canvas_ctx.font = font(this.fontsize, this.fontname);
  };
  this.getfontname = function() { return this.fontname; };

  this.setposition = function(x, y) {
    x = (x === undefined) ? this.x : x;
    y = (y === undefined) ? this.y : y;

    moveto(x, y, /*setpos*/true);
  };

  this.towards = function(x, y) {
    x = x;
    y = y;

    return 90 - rad2deg(Math.atan2(y - this.y, x - this.x));
  };

  this.setheading = function(angle) {
    this.r = deg2rad(90 - angle);
  };

  this.clearscreen = function() {
    this.home();
    this.clear();
  };

  this.clear = function() {
    canvas_ctx.save();
    try {
      canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas_ctx.clearRect(0, 0, width, height);
      canvas_ctx.fillStyle = this.bgcolor;
      canvas_ctx.fillRect(0, 0, width, height);
    } finally {
      canvas_ctx.restore();
    }
  };

  this.home = function() {
    moveto(0, 0);
    this.r = deg2rad(90);
  };

  this.showturtle = function() {
    this.visible = true;
  };

  this.hideturtle = function() {
    this.visible = false;
  };

  this.isturtlevisible = function() {
    return this.visible;
  };

  this.getheading = function() {
    return 90 - rad2deg(this.r);
  };

  this.getxy = function() {
    return [this.x, this.y];
  };

  this.setscrunch = function(sx, sy) {

    self.x = self.px = self.x / sx * this.sx;
    self.y = self.py = self.y / sy * this.sy;

    this.sx = sx;
    this.sy = sy;

    [turtle_ctx, canvas_ctx].forEach(function(ctx) {
      ctx.setTransform(this.sx, 0, 0, -this.sy, width / 2, height / 2);
    }.bind(this));
  };

  this.getscrunch = function() {
    return [this.sx, this.sy];
  };

  this.drawtext = function(text) {
    canvas_ctx.save();
    canvas_ctx.translate(this.x, this.y);
    canvas_ctx.scale(1, -1);
    canvas_ctx.rotate(-this.r);
    canvas_ctx.fillText(text, 0, 0);
    canvas_ctx.restore();
  };

  this.filling = 0;
  this.beginpath = function() {
    if (this.filling === 0) {
      this.saved_turtlemode = this.turtlemode;
      this.turtlemode = 'window';
      ++this.filling;
      canvas_ctx.beginPath();
    }
  };

  this.fillpath = function(fillcolor) {
    --this.filling;
    if (this.filling === 0) {
      canvas_ctx.closePath();
      canvas_ctx.fillStyle = fillcolor;
      canvas_ctx.fill();
      canvas_ctx.fillStyle = this.color;
      if (this.down)
        canvas_ctx.stroke();
      this.turtlemode = this.saved_turtlemode;
    }
  };

  this.fill = function() {
    canvas_ctx.floodFill(this.x, this.y);
  };

  this.arc = function(angle, radius) {
    var self = this;

    if (self.turtlemode == 'wrap') {
      [self.x, self.x + width, self.x - width].forEach(function(x) {
        [self.y, self.y + height, self.y - height].forEach(function(y) {
          if (!self.filling)
            canvas_ctx.beginPath();
          canvas_ctx.arc(x, y, radius, -self.r, -self.r + deg2rad(angle), false);
          if (!self.filling)
            canvas_ctx.stroke();
        });
      });
    } else {
      if (!self.filling)
        canvas_ctx.beginPath();
      canvas_ctx.arc(self.x, self.y, radius, -self.r, -self.r + deg2rad(angle), false);
      if (!self.filling)
        canvas_ctx.stroke();
    }
  };

  this.getstate = function() {
    return {
      isturtlestate: true,
      color: this.getcolor(),
      bgcolor: this.getbgcolor(),
      xy: this.getxy(),
      heading: this.getheading(),
      penmode: this.getpenmode(),
      turtlemode: this.getturtlemode(),
      width: this.getwidth(),
      fontsize: this.getfontsize(),
      fontname: this.getfontname(),
      visible: this.isturtlevisible(),
      pendown: this.down,
      scrunch: this.getscrunch()
    };
  };

  this.setstate = function(state) {
    if ((! state) || ! state.isturtlestate) {
      throw new Error("Tried to restore a state that is not a turtle state");
    }
    this.penup();
    this.hideturtle();
    this.setturtlemode(state.turtlemode);
    this.setcolor(state.color);
    this.setbgcolor(state.bgcolor);
    this.setwidth(state.width);
    this.setfontsize(state.fontsize);
    this.setfontname(state.fontname);
    this.setposition(state.xy[0], state.xy[1]);
    this.setheading(state.heading);
    this.setpenmode(state.penmode);
    this.setscrunch(state.scrunch[0], state.scrunch[1]);
    if (state.visible) {
      this.showturtle();
    }
    if (state.pendown) {
      this.pendown();
    }
  };

  var last;

  this.tick = function() {
    function invert(p) { return [-p[0], p[1]]; }

    requestAnimationFrame(this.tick.bind(this));
    var cur = JSON.stringify([this.x, this.y, this.r, this.visible, this.sx, this.sy, width, height]);
    if (cur === last) return;
    last = cur;

    turtle_ctx.save();
    turtle_ctx.setTransform(1, 0, 0, 1, 0, 0);
    turtle_ctx.clearRect(0, 0, width, height);
    turtle_ctx.restore();

    if (this.visible) {
      var ctx = turtle_ctx;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI/2 + this.r);
      ctx.beginPath();

      var points = [
        [0, -20], // Head
        [2.5, -17],
        [3, -12],

        [6, -10],
        [9, -13], // Arm
        [13, -12],
        [18, -4],
        [18, 0],
        [14, -1],
        [10, -7],

        [8, -6], // Shell
        [10, -2],
        [9, 3],
        [6, 10],

        [9, 13], // Foot
        [6, 15],
        [3, 12],

        [0, 13],
      ];

      points.concat(points.slice(1, -1).reverse().map(invert))
        .forEach(function(pair, index) {
          ctx[index ? 'lineTo' : 'moveTo'](pair[0], pair[1]);
        });

      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  };

  this.x = this.py = 0;
  this.y = this.py = 0;
  this.r = Math.PI / 2;

  this.sx = this.sy = 1;

  this.bgcolor = '#ffffff';
  this.color = '#000000';
  this.width = 1;
  this.penmode = 'paint';
  this.fontsize = 14;
  this.fontname = 'sans-serif';
  this.turtlemode = 'wrap';
  this.visible = true;
  this.down = true;
  this.was_oob = false;

  function init() {
    turtle_ctx.lineCap = 'round';
    turtle_ctx.strokeStyle = 'green';
    turtle_ctx.lineWidth = 2;

    canvas_ctx.lineCap = 'round';
    canvas_ctx.lineWidth = self.width;
    canvas_ctx.font = font(self.fontsize, self.fontname);

    self.setpenmode(self.penmode);

    [turtle_ctx, canvas_ctx].forEach(function(ctx) {
      ctx.setTransform(self.sx, 0, 0, -self.sy, width / 2, height / 2);
    });
  }

  this.resize = function(w, h) {
    width = w;
    height = h;
    init();
  };

  init();
  this.tick();
}

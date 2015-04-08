// Generated by CoffeeScript 1.9.0
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

require(['base/js/namespace', 'jquery', 'thebe/dotimeout', 'notebook/js/notebook', 'thebe/cookies', 'thebe/default_css', 'contents', 'services/config', 'base/js/utils', 'base/js/page', 'base/js/events', 'notebook/js/actions', 'notebook/js/kernelselector', 'services/kernels/kernel', 'codemirror/lib/codemirror', 'custom/custom'], function(IPython, $, doTimeout, notebook, cookies, default_css, contents, configmod, utils, page, events, actions, kernelselector, kernel, CodeMirror, custom) {
  var Thebe, codecell;
  Thebe = (function() {
    Thebe.prototype.default_options = {
      selector: 'pre[data-executable]',
      url: 'http://jupyter-kernel.odewahn.com:8000/spawn/',
      append_kernel_controls_to: 'body',
      inject_css: true,
      load_css: true,
      load_mathjax: true,
      debug: false
    };

    function Thebe(_at_options) {
      var thebe_url, _ref;
      this.options = _at_options != null ? _at_options : {};
      this.setup = __bind(this.setup, this);
      this.start_notebook = __bind(this.start_notebook, this);
      this.start_kernel = __bind(this.start_kernel, this);
      this.before_first_run = __bind(this.before_first_run, this);
      this.set_state = __bind(this.set_state, this);
      this.build_notebook = __bind(this.build_notebook, this);
      this.spawn_handler = __bind(this.spawn_handler, this);
      this.call_spawn = __bind(this.call_spawn, this);
      window.thebe = this;
      this.has_kernel_connected = false;
      _ref = _.defaults(this.options, this.default_options), this.selector = _ref.selector, this.url = _ref.url, this.debug = _ref.debug;
      if (this.url) {
        this.url = this.url.replace(/\/?$/, '/');
      }
      if (this.url.indexOf('/spawn') !== -1) {
        this.log('this is a tmpnb url');
        this.tmpnb_url = this.url;
        this.url = '';
      }
      this.cells = [];
      this.events = events;
      this.setup();
      this.spawn_handler = _.once(this.spawn_handler);
      thebe_url = cookies.getItem('thebe_url');
      if (thebe_url && this.url === '') {
        this.check_existing_container(thebe_url);
      } else {
        this.start_notebook();
      }
    }

    Thebe.prototype.call_spawn = function(cb) {
      var invo;
      this.log('call spawn');
      invo = new XMLHttpRequest;
      invo.open('GET', this.tmpnb_url, true);
      invo.onreadystatechange = (function(_this) {
        return function(e) {
          return _this.spawn_handler(e, cb);
        };
      })(this);
      invo.onerror = (function(_this) {
        return function() {
          return _this.set_state('disconnected');
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.check_existing_container = function(url, invo) {
      if (invo == null) {
        invo = new XMLHttpRequest;
      }
      invo.open('GET', url + 'api', true);
      invo.onerror = (function(_this) {
        return function(e) {
          return _this.set_state('disconnected');
        };
      })(this);
      invo.onload = (function(_this) {
        return function(e) {
          try {
            JSON.parse(e.target.responseText);
            _this.url = url;
            _this.start_notebook();
            return _this.log('cookie was right, use that as needed');
          } catch (_error) {
            _this.start_notebook();
            return _this.log('cookie was wrong/dated, call spawn as needed');
          }
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.spawn_handler = function(e, cb) {
      if (e.target.status === 0) {
        this.set_state('disconnected');
      }
      if (e.target.responseURL.indexOf('/spawn') !== -1) {
        this.log('server full');
        return this.set_state('full');
      } else {
        this.url = e.target.responseURL.replace('/tree', '/');
        this.start_kernel(cb);
        return cookies.setItem('thebe_url', this.url);
      }
    };

    Thebe.prototype.build_notebook = function() {
      this.notebook.writable = false;
      this.notebook._unsafe_delete_cell(0);
      $(this.selector).each((function(_this) {
        return function(i, el) {
          var cell, controls;
          cell = _this.notebook.insert_cell_at_bottom('code');
          cell.set_text($(el).text());
          controls = $("<div class='thebe_controls' data-cell-id='" + i + "'></div>");
          controls.html(_this.controls_html());
          $(el).replaceWith(cell.element);
          _this.cells.push(cell);
          $(cell.element).prepend(controls);
          cell.element.removeAttr('tabindex');
          return cell.element.off('dblclick');
        };
      })(this));
      this.notebook_el.hide();
      this.events.on('kernel_idle.Kernel', (function(_this) {
        return function(e, k) {
          return _this.set_state('idle');
        };
      })(this));
      this.events.on('kernel_busy.Kernel', (function(_this) {
        return function() {
          return _this.set_state('busy');
        };
      })(this));
      return this.events.on('kernel_disconnected.Kernel', (function(_this) {
        return function() {
          return _this.set_state('disconnected');
        };
      })(this));
    };

    Thebe.prototype.set_state = function(_at_state) {
      this.state = _at_state;
      this.log('state :' + this.state);
      return $.doTimeout('thebe_set_state', 500, (function(_this) {
        return function() {
          $(".thebe_controls .state").text(_this.state);
          return false;
        };
      })(this));
    };

    Thebe.prototype.controls_html = function() {
      return "<button data-action='run'>run</button><span class='state'></span>";
    };

    Thebe.prototype.kernel_controls_html = function() {
      return "<button data-action='interrupt'>interrupt kernel</button><button data-action='restart'>restart kernel</button><span class='state'></span>";
    };

    Thebe.prototype.before_first_run = function(cb) {
      var kernel_controls;
      if (this.url) {
        this.start_kernel(cb);
      } else {
        this.call_spawn(cb);
      }
      if (this.options.append_kernel_controls_to) {
        kernel_controls = $("<div class='thebe_controls kernel_controls'></div>");
        return kernel_controls.html(this.kernel_controls_html()).appendTo(this.options.append_kernel_controls_to);
      }
    };

    Thebe.prototype.start_kernel = function(cb) {
      this.log('start_kernel');
      this.kernel = new kernel.Kernel(this.url + 'api/kernels', '', this.notebook, "python2");
      this.kernel.start();
      this.notebook.kernel = this.kernel;
      return this.events.on('kernel_ready.Kernel', (function(_this) {
        return function() {
          var cell, _i, _len, _ref;
          _this.has_kernel_connected = true;
          _this.log('kernel ready');
          _ref = _this.cells;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cell = _ref[_i];
            cell.set_kernel(_this.kernel);
          }
          return cb();
        };
      })(this));
    };

    Thebe.prototype.start_notebook = function() {
      var common_options, config_section, keyboard_manager, save_widget;
      contents = {
        list_checkpoints: function() {
          return new Promise(function(resolve, reject) {
            return resolve({});
          });
        }
      };
      keyboard_manager = {
        edit_mode: function() {},
        command_mode: function() {},
        register_events: function() {},
        enable: function() {},
        disable: function() {}
      };
      keyboard_manager.edit_shortcuts = {
        handles: function() {}
      };
      save_widget = {
        update_document_title: function() {},
        contents: function() {}
      };
      config_section = {
        data: {
          data: {}
        }
      };
      common_options = {
        ws_url: '',
        base_url: '',
        notebook_path: '',
        notebook_name: ''
      };
      this.notebook_el = $('<div id="notebook"></div>').prependTo('body');
      this.notebook = new notebook.Notebook('div#notebook', $.extend({
        events: this.events,
        keyboard_manager: keyboard_manager,
        save_widget: save_widget,
        contents: contents,
        config: config_section
      }, common_options));
      this.notebook.kernel_selector = {
        set_kernel: function() {}
      };
      this.events.trigger('app_initialized.NotebookApp');
      this.notebook.load_notebook(common_options.notebook_path);
      return this.build_notebook();
    };

    Thebe.prototype.setup = function() {
      var script, urls;
      this.log('setup');
      $('body').on('click', 'div.thebe_controls button', (function(_this) {
        return function(e) {
          var action, button, cell, id;
          button = $(e.target);
          id = button.parent().data('cell-id');
          action = button.data('action');
          cell = _this.cells[id];
          switch (action) {
            case 'run':
              if (!_this.has_kernel_connected) {
                return _this.before_first_run(function() {
                  button.text('running').addClass('running');
                  return cell.execute();
                });
              } else {
                button.text('running').addClass('running');
                return cell.execute();
              }
              break;
            case 'interrupt':
              return _this.kernel.interrupt();
            case 'restart':
              if (confirm('Are you sure you want to restart the kernel? Your work will be lost.')) {
                return _this.kernel.restart();
              }
          }
        };
      })(this));
      this.events.on('execute.CodeCell', (function(_this) {
        return function(e, cell) {
          var button, id;
          id = $('.cell').index(cell.cell.element);
          _this.log('exec done for codecell ' + id);
          button = $(".thebe_controls[data-cell-id=" + id + "] button[data-action='run']");
          return button.text('ran').removeClass('running').addClass('ran');
        };
      })(this));
      window.mathjax_url = '';
      if (this.options.load_mathjax) {
        script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
        document.getElementsByTagName("head")[0].appendChild(script);
      }
      if (this.options.inject_css) {
        $("<style>" + default_css.css + "</style>").appendTo('head');
      }
      if (this.options.load_css) {
        urls = ["https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.css"];
        return $.when($.each(urls, function(i, url) {
          return $.get(url, function() {
            return $('<link>', {
              rel: 'stylesheet',
              type: 'text/css',
              'href': url
            }).appendTo('head');
          });
        })).then((function(_this) {
          return function() {
            return _this.log('loaded css');
          };
        })(this));
      }
    };

    Thebe.prototype.log = function() {
      var x;
      if (this.debug) {
        return console.log("%c" + [
          (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = arguments.length; _i < _len; _i++) {
              x = arguments[_i];
              _results.push(x);
            }
            return _results;
          }).apply(this, arguments)
        ], "color: blue; font-size: 12px");
      }
    };

    return Thebe;

  })();
  codecell = require('notebook/js/codecell');
  codecell.CodeCell.options_default.cm_config.viewportMargin = Infinity;
  window.Thebe = Thebe;
  $(function() {
    var thebe;
    return thebe = new Thebe();
  });
  return Thebe;
});

//# sourceMappingURL=main.js.map

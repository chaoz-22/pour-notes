module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1784089473052, function(require, module, exports) {


Object.defineProperty(exports, '__esModule', { value: true });

var paddlejsCore = require('../../@paddlejs/paddlejs-core/index.js');
require('../../@paddlejs/paddlejs-backend-webgl/index.js');
var clipper = require('../../js-clipper/index.js');
var numberPrecision = require('../../number-precision/index.js');
var path = {};
var fs = {};
var crypto$1 = {};
var d3Polygon = require('../../d3-polygon/index.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var clipper__default = /*#__PURE__*/_interopDefaultLegacy(clipper);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto$1);
var d3Polygon__namespace = /*#__PURE__*/_interopNamespace(d3Polygon);

function _regeneratorRuntime() {
  _regeneratorRuntime = function () {
    return exports;
  };
  var exports = {},
    Op = Object.prototype,
    hasOwn = Op.hasOwnProperty,
    $Symbol = "function" == typeof Symbol ? Symbol : {},
    iteratorSymbol = $Symbol.iterator || "@@iterator",
    asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
    toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
  function define(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), obj[key];
  }
  try {
    define({}, "");
  } catch (err) {
    define = function (obj, key, value) {
      return obj[key] = value;
    };
  }
  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
      generator = Object.create(protoGenerator.prototype),
      context = new Context(tryLocsList || []);
    return generator._invoke = function (innerFn, self, context) {
      var state = "suspendedStart";
      return function (method, arg) {
        if ("executing" === state) throw new Error("Generator is already running");
        if ("completed" === state) {
          if ("throw" === method) throw arg;
          return doneResult();
        }
        for (context.method = method, context.arg = arg;;) {
          var delegate = context.delegate;
          if (delegate) {
            var delegateResult = maybeInvokeDelegate(delegate, context);
            if (delegateResult) {
              if (delegateResult === ContinueSentinel) continue;
              return delegateResult;
            }
          }
          if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
            if ("suspendedStart" === state) throw state = "completed", context.arg;
            context.dispatchException(context.arg);
          } else "return" === context.method && context.abrupt("return", context.arg);
          state = "executing";
          var record = tryCatch(innerFn, self, context);
          if ("normal" === record.type) {
            if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
            return {
              value: record.arg,
              done: context.done
            };
          }
          "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
        }
      };
    }(innerFn, self, context), generator;
  }
  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: "normal",
        arg: fn.call(obj, arg)
      };
    } catch (err) {
      return {
        type: "throw",
        arg: err
      };
    }
  }
  exports.wrap = wrap;
  var ContinueSentinel = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });
  var getProto = Object.getPrototypeOf,
    NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg);
      });
    });
  }
  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if ("throw" !== record.type) {
        var result = record.arg,
          value = result.value;
        return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
          result.value = unwrapped, resolve(result);
        }, function (error) {
          return invoke("throw", error, resolve, reject);
        });
      }
      reject(record.arg);
    }
    var previousPromise;
    this._invoke = function (method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function (resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }
      return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
    };
  }
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (undefined === method) {
      if (context.delegate = null, "throw" === context.method) {
        if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
        context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
      }
      return ContinueSentinel;
    }
    var record = tryCatch(method, delegate.iterator, context.arg);
    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    var info = record.arg;
    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
  }
  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0]
    };
    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
  }
  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal", delete record.arg, entry.completion = record;
  }
  function Context(tryLocsList) {
    this.tryEntries = [{
      tryLoc: "root"
    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
  }
  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) return iteratorMethod.call(iterable);
      if ("function" == typeof iterable.next) return iterable;
      if (!isNaN(iterable.length)) {
        var i = -1,
          next = function next() {
            for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
            return next.value = undefined, next.done = !0, next;
          };
        return next.next = next;
      }
    }
    return {
      next: doneResult
    };
  }
  function doneResult() {
    return {
      value: undefined,
      done: !0
    };
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    var ctor = "function" == typeof genFun && genFun.constructor;
    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
  }, exports.mark = function (genFun) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
  }, exports.awrap = function (arg) {
    return {
      __await: arg
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    void 0 === PromiseImpl && (PromiseImpl = Promise);
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    return this;
  }), define(Gp, "toString", function () {
    return "[object Generator]";
  }), exports.keys = function (object) {
    var keys = [];
    for (var key in object) keys.push(key);
    return keys.reverse(), function next() {
      for (; keys.length;) {
        var key = keys.pop();
        if (key in object) return next.value = key, next.done = !1, next;
      }
      return next.done = !0, next;
    };
  }, exports.values = values, Context.prototype = {
    constructor: Context,
    reset: function (skipTempReset) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    },
    stop: function () {
      this.done = !0;
      var rootRecord = this.tryEntries[0].completion;
      if ("throw" === rootRecord.type) throw rootRecord.arg;
      return this.rval;
    },
    dispatchException: function (exception) {
      if (this.done) throw exception;
      var context = this;
      function handle(loc, caught) {
        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
      }
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i],
          record = entry.completion;
        if ("root" === entry.tryLoc) return handle("end");
        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc"),
            hasFinally = hasOwn.call(entry, "finallyLoc");
          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
          } else {
            if (!hasFinally) throw new Error("try statement without catch or finally");
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          }
        }
      }
    },
    abrupt: function (type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }
      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
      var record = finallyEntry ? finallyEntry.completion : {};
      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    },
    complete: function (record, afterLoc) {
      if ("throw" === record.type) throw record.arg;
      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    },
    finish: function (finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
      }
    },
    catch: function (tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if ("throw" === record.type) {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }
      throw new Error("illegal catch attempt");
    },
    delegateYield: function (iterable, resultName, nextLoc) {
      return this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    }
  }, exports;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}
function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var opencv_ocr = global;

function flatten(arr) {
  return arr.toString().split(',').map(function (item) { return +item; });
}
function _int(num) {
  return num > 0 ? Math.floor(num) : Math.ceil(num);
}
function clip(data, min, max) {
  return data < min ? min : data > max ? max : data;
}

var DBPostprocess = /*#__PURE__*/function () {
  function DBPostprocess(result, shape) {
    var _this = this;
    var thresh = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.3;
    var box_thresh = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.6;
    var unclip_ratio = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1.5;
    _classCallCheck(this, DBPostprocess);
    _defineProperty(this, "thresh", void 0);
    _defineProperty(this, "box_thresh", void 0);
    _defineProperty(this, "max_candidates", void 0);
    _defineProperty(this, "unclip_ratio", void 0);
    _defineProperty(this, "min_size", void 0);
    _defineProperty(this, "pred", void 0);
    _defineProperty(this, "segmentation", void 0);
    _defineProperty(this, "width", void 0);
    _defineProperty(this, "height", void 0);
    numberPrecision.enableBoundaryChecking(false);
    this.thresh = thresh ? thresh : 0.3;
    this.box_thresh = box_thresh ? box_thresh : 0.6;
    this.max_candidates = 1000;
    this.unclip_ratio = unclip_ratio ? unclip_ratio : 1.5;
    this.min_size = 3;
    this.width = shape[0];
    this.height = shape[1];
    this.pred = result;
    this.segmentation = [];
    this.pred.forEach(function (item) {
      _this.segmentation.push(item > _this.thresh ? 255 : 0);
    });
  }
  _createClass(DBPostprocess, [{
    key: "outputBox",
    value: function outputBox() {
      var _this2 = this;
      // eslint-disable-next-line new-cap
      var src = new opencv_ocr.matFromArray(this.width, this.height, opencv_ocr.CV_8UC1, this.segmentation);
      var contours = new opencv_ocr.MatVector();
      var hierarchy = new opencv_ocr.Mat();
      // 获取轮廓
      opencv_ocr.findContours(src, contours, hierarchy, opencv_ocr.RETR_LIST, opencv_ocr.CHAIN_APPROX_SIMPLE);
      var num_contours = Math.min(contours.size(), this.max_candidates);
      var boxes = [];
      var scores = [];
      for (var i = 0; i < num_contours; i++) {
        var contour = contours.get(i);
        var minBox = this.get_mini_boxes(contour);
        var points = minBox.points;
        var side = minBox.side;
        if (side < this.min_size) {
          continue;
        }
        var score = this.box_score_fast(this.pred, points);
        if (this.box_thresh > score) {
          continue;
        }
        var box = this.unclip(points);
        // eslint-disable-next-line new-cap
        var boxMap = new opencv_ocr.matFromArray(box.length / 2, 1, opencv_ocr.CV_32SC2, box);
        var resultObj = this.get_mini_boxes(boxMap);
        box = resultObj.points;
        side = resultObj.side;
        if (side < this.min_size + 2) {
          continue;
        }
        box.forEach(function (item) {
          item[0] = clip(Math.round(item[0]), 0, _this2.width);
          item[1] = clip(Math.round(item[1]), 0, _this2.height);
        });
        boxes.push(box);
        scores.push(score);
        boxMap["delete"]();
      }
      src["delete"]();
      contours["delete"]();
      hierarchy["delete"]();
      return {
        boxes: boxes,
        scores: scores
      };
    }
  }, {
    key: "get_mini_boxes",
    value: function get_mini_boxes(contour) {
      // 生成最小外接矩形
      var bounding_box = opencv_ocr.minAreaRect(contour);
      var points = [];
      var mat = new opencv_ocr.Mat();
      // 获取矩形的四个顶点坐标
      opencv_ocr.boxPoints(bounding_box, mat);
      for (var i = 0; i < mat.data32F.length; i += 2) {
        var arr = [mat.data32F[i], mat.data32F[i + 1]];
        points.push(arr);
      }
      function sortNumber(a, b) {
        return a[0] - b[0];
      }
      points.sort(sortNumber);
      var index_1;
      var index_2;
      var index_3;
      var index_4;
      if (points[1][1] > points[0][1]) {
        index_1 = 0;
        index_4 = 1;
      } else {
        index_1 = 1;
        index_4 = 0;
      }
      if (points[3][1] > points[2][1]) {
        index_2 = 2;
        index_3 = 3;
      } else {
        index_2 = 3;
        index_3 = 2;
      }
      var box = [points[index_1], points[index_2], points[index_3], points[index_4]];
      var side = Math.min(bounding_box.size.height, bounding_box.size.width);
      mat["delete"]();
      return {
        points: box,
        side: side
      };
    }
  }, {
    key: "box_score_fast",
    value: function box_score_fast(bitmap, _box) {
      var h = this.height;
      var w = this.width;
      var box = JSON.parse(JSON.stringify(_box));
      var x = [];
      var y = [];
      box.forEach(function (item) {
        x.push(item[0]);
        y.push(item[1]);
      });
      // clip这个函数将将数组中的元素限制在a_min, a_max之间，大于a_max的就使得它等于 a_max，小于a_min,的就使得它等于a_min。
      var xmin = clip(Math.floor(Math.min.apply(Math, x)), 0, w - 1);
      var xmax = clip(Math.ceil(Math.max.apply(Math, x)), 0, w - 1);
      var ymin = clip(Math.floor(Math.min.apply(Math, y)), 0, h - 1);
      var ymax = clip(Math.ceil(Math.max.apply(Math, y)), 0, h - 1);
      // eslint-disable-next-line new-cap
      var mask = new opencv_ocr.Mat.zeros(ymax - ymin + 1, xmax - xmin + 1, opencv_ocr.CV_8UC1);
      box.forEach(function (item) {
        item[0] = Math.max(item[0] - xmin, 0);
        item[1] = Math.max(item[1] - ymin, 0);
      });
      var npts = 4;
      var point_data = new Uint8Array(box.flat());
      var points = opencv_ocr.matFromArray(npts, 1, opencv_ocr.CV_32SC2, point_data);
      var pts = new opencv_ocr.MatVector();
      pts.push_back(points);
      var color = new opencv_ocr.Scalar(255);
      // 多个多边形填充
      opencv_ocr.fillPoly(mask, pts, color, 1);
      var sliceArr = [];
      for (var i = ymin; i < ymax + 1; i++) {
        sliceArr.push.apply(sliceArr, _toConsumableArray(bitmap.slice(this.width * i + xmin, this.height * i + xmax + 1)));
      }
      var mean = this.mean(sliceArr, mask.data);
      mask["delete"]();
      points["delete"]();
      pts["delete"]();
      return mean;
    }
  }, {
    key: "unclip",
    value: function unclip(box) {
      var _ref;
      var unclip_ratio = this.unclip_ratio;
      var area = Math.abs(d3Polygon__namespace.polygonArea(box));
      var length = d3Polygon__namespace.polygonLength(box);
      var distance = area * unclip_ratio / length;
      var tmpArr = [];
      box.forEach(function (item) {
        var obj = {
          X: 0,
          Y: 0
        };
        obj.X = item[0];
        obj.Y = item[1];
        tmpArr.push(obj);
      });
      var offset = new clipper__default["default"].ClipperOffset();
      offset.AddPath(tmpArr, clipper__default["default"].JoinType.jtRound, clipper__default["default"].EndType.etClosedPolygon);
      var expanded = [];
      offset.Execute(expanded, distance);
      var expandedArr = [];
      expanded[0] && expanded[0].forEach(function (item) {
        expandedArr.push([item.X, item.Y]);
      });
      expandedArr = (_ref = []).concat.apply(_ref, _toConsumableArray(expandedArr));
      return expandedArr;
    }
  }, {
    key: "mean",
    value: function mean(data, mask) {
      var sum = 0;
      var length = 0;
      for (var i = 0; i < data.length; i++) {
        if (mask[i]) {
          sum = numberPrecision.plus(sum, data[i]);
          length++;
        }
      }
      return numberPrecision.divide(sum, length);
    }
  }]);
  return DBPostprocess;
}();

var character = "'\n疗\n绚\n诚\n娇\n溜\n题\n贿\n者\n廖\n更\n纳\n加\n奉\n公\n一\n就\n汴\n计\n与\n路\n房\n原\n妇\n2\n0\n8\n-\n7\n其\n>\n:\n]\n,\n，\n骑\n刈\n全\n消\n昏\n傈\n安\n久\n钟\n嗅\n不\n影\n处\n驽\n蜿\n资\n关\n椤\n地\n瘸\n专\n问\n忖\n票\n嫉\n炎\n韵\n要\n月\n田\n节\n陂\n鄙\n捌\n备\n拳\n伺\n眼\n网\n盎\n大\n傍\n心\n东\n愉\n汇\n蹿\n科\n每\n业\n里\n航\n晏\n字\n平\n录\n先\n1\n3\n彤\n鲶\n产\n稍\n督\n腴\n有\n象\n岳\n注\n绍\n在\n泺\n文\n定\n核\n名\n水\n过\n理\n让\n偷\n率\n等\n这\n发\n”\n为\n含\n肥\n酉\n相\n鄱\n七\n编\n猥\n锛\n日\n镀\n蒂\n掰\n倒\n辆\n栾\n栗\n综\n涩\n州\n雌\n滑\n馀\n了\n机\n块\n司\n宰\n甙\n兴\n矽\n抚\n保\n用\n沧\n秩\n如\n收\n息\n滥\n页\n疑\n埠\n!\n！\n姥\n异\n橹\n钇\n向\n下\n跄\n的\n椴\n沫\n国\n绥\n獠\n报\n开\n民\n蜇\n何\n分\n凇\n长\n讥\n藏\n掏\n施\n羽\n中\n讲\n派\n嘟\n人\n提\n浼\n间\n世\n而\n古\n多\n倪\n唇\n饯\n控\n庚\n首\n赛\n蜓\n味\n断\n制\n觉\n技\n替\n艰\n溢\n潮\n夕\n钺\n外\n摘\n枋\n动\n双\n单\n啮\n户\n枇\n确\n锦\n曜\n杜\n或\n能\n效\n霜\n盒\n然\n侗\n电\n晁\n放\n步\n鹃\n新\n杖\n蜂\n吒\n濂\n瞬\n评\n总\n隍\n对\n独\n合\n也\n是\n府\n青\n天\n诲\n墙\n组\n滴\n级\n邀\n帘\n示\n已\n时\n骸\n仄\n泅\n和\n遨\n店\n雇\n疫\n持\n巍\n踮\n境\n只\n亨\n目\n鉴\n崤\n闲\n体\n泄\n杂\n作\n般\n轰\n化\n解\n迂\n诿\n蛭\n璀\n腾\n告\n版\n服\n省\n师\n小\n规\n程\n线\n海\n办\n引\n二\n桧\n牌\n砺\n洄\n裴\n修\n图\n痫\n胡\n许\n犊\n事\n郛\n基\n柴\n呼\n食\n研\n奶\n律\n蛋\n因\n葆\n察\n戏\n褒\n戒\n再\n李\n骁\n工\n貂\n油\n鹅\n章\n啄\n休\n场\n给\n睡\n纷\n豆\n器\n捎\n说\n敏\n学\n会\n浒\n设\n诊\n格\n廓\n查\n来\n霓\n室\n溆\n￠\n诡\n寥\n焕\n舜\n柒\n狐\n回\n戟\n砾\n厄\n实\n翩\n尿\n五\n入\n径\n惭\n喹\n股\n宇\n篝\n|\n;\n美\n期\n云\n九\n祺\n扮\n靠\n锝\n槌\n系\n企\n酰\n阊\n暂\n蚕\n忻\n豁\n本\n羹\n执\n条\n钦\nH\n獒\n限\n进\n季\n楦\n于\n芘\n玖\n铋\n茯\n未\n答\n粘\n括\n样\n精\n欠\n矢\n甥\n帷\n嵩\n扣\n令\n仔\n风\n皈\n行\n支\n部\n蓉\n刮\n站\n蜡\n救\n钊\n汗\n松\n嫌\n成\n可\n.\n鹤\n院\n从\n交\n政\n怕\n活\n调\n球\n局\n验\n髌\n第\n韫\n谗\n串\n到\n圆\n年\n米\n/\n*\n友\n忿\n检\n区\n看\n自\n敢\n刃\n个\n兹\n弄\n流\n留\n同\n没\n齿\n星\n聆\n轼\n湖\n什\n三\n建\n蛔\n儿\n椋\n汕\n震\n颧\n鲤\n跟\n力\n情\n璺\n铨\n陪\n务\n指\n族\n训\n滦\n鄣\n濮\n扒\n商\n箱\n十\n召\n慷\n辗\n所\n莞\n管\n护\n臭\n横\n硒\n嗓\n接\n侦\n六\n露\n党\n馋\n驾\n剖\n高\n侬\n妪\n幂\n猗\n绺\n骐\n央\n酐\n孝\n筝\n课\n徇\n缰\n门\n男\n西\n项\n句\n谙\n瞒\n秃\n篇\n教\n碲\n罚\n声\n呐\n景\n前\n富\n嘴\n鳌\n稀\n免\n朋\n啬\n睐\n去\n赈\n鱼\n住\n肩\n愕\n速\n旁\n波\n厅\n健\n茼\n厥\n鲟\n谅\n投\n攸\n炔\n数\n方\n击\n呋\n谈\n绩\n别\n愫\n僚\n躬\n鹧\n胪\n炳\n招\n喇\n膨\n泵\n蹦\n毛\n结\n5\n4\n谱\n识\n陕\n粽\n婚\n拟\n构\n且\n搜\n任\n潘\n比\n郢\n妨\n醪\n陀\n桔\n碘\n扎\n选\n哈\n骷\n楷\n亿\n明\n缆\n脯\n监\n睫\n逻\n婵\n共\n赴\n淝\n凡\n惦\n及\n达\n揖\n谩\n澹\n减\n焰\n蛹\n番\n祁\n柏\n员\n禄\n怡\n峤\n龙\n白\n叽\n生\n闯\n起\n细\n装\n谕\n竟\n聚\n钙\n上\n导\n渊\n按\n艾\n辘\n挡\n耒\n盹\n饪\n臀\n记\n邮\n蕙\n受\n各\n医\n搂\n普\n滇\n朗\n茸\n带\n翻\n酚\n(\n光\n堤\n墟\n蔷\n万\n幻\n〓\n瑙\n辈\n昧\n盏\n亘\n蛀\n吉\n铰\n请\n子\n假\n闻\n税\n井\n诩\n哨\n嫂\n好\n面\n琐\n校\n馊\n鬣\n缂\n营\n访\n炖\n占\n农\n缀\n否\n经\n钚\n棵\n趟\n张\n亟\n吏\n茶\n谨\n捻\n论\n迸\n堂\n玉\n信\n吧\n瞠\n乡\n姬\n寺\n咬\n溏\n苄\n皿\n意\n赉\n宝\n尔\n钰\n艺\n特\n唳\n踉\n都\n荣\n倚\n登\n荐\n丧\n奇\n涵\n批\n炭\n近\n符\n傩\n感\n道\n着\n菊\n虹\n仲\n众\n懈\n濯\n颞\n眺\n南\n释\n北\n缝\n标\n既\n茗\n整\n撼\n迤\n贲\n挎\n耱\n拒\n某\n妍\n卫\n哇\n英\n矶\n藩\n治\n他\n元\n领\n膜\n遮\n穗\n蛾\n飞\n荒\n棺\n劫\n么\n市\n火\n温\n拈\n棚\n洼\n转\n果\n奕\n卸\n迪\n伸\n泳\n斗\n邡\n侄\n涨\n屯\n萋\n胭\n氡\n崮\n枞\n惧\n冒\n彩\n斜\n手\n豚\n随\n旭\n淑\n妞\n形\n菌\n吲\n沱\n争\n驯\n歹\n挟\n兆\n柱\n传\n至\n包\n内\n响\n临\n红\n功\n弩\n衡\n寂\n禁\n老\n棍\n耆\n渍\n织\n害\n氵\n渑\n布\n载\n靥\n嗬\n虽\n苹\n咨\n娄\n库\n雉\n榜\n帜\n嘲\n套\n瑚\n亲\n簸\n欧\n边\n6\n腿\n旮\n抛\n吹\n瞳\n得\n镓\n梗\n厨\n继\n漾\n愣\n憨\n士\n策\n窑\n抑\n躯\n襟\n脏\n参\n贸\n言\n干\n绸\n鳄\n穷\n藜\n音\n折\n详\n)\n举\n悍\n甸\n癌\n黎\n谴\n死\n罩\n迁\n寒\n驷\n袖\n媒\n蒋\n掘\n模\n纠\n恣\n观\n祖\n蛆\n碍\n位\n稿\n主\n澧\n跌\n筏\n京\n锏\n帝\n贴\n证\n糠\n才\n黄\n鲸\n略\n炯\n饱\n四\n出\n园\n犀\n牧\n容\n汉\n杆\n浈\n汰\n瑷\n造\n虫\n瘩\n怪\n驴\n济\n应\n花\n沣\n谔\n夙\n旅\n价\n矿\n以\n考\ns\nu\n呦\n晒\n巡\n茅\n准\n肟\n瓴\n詹\n仟\n褂\n译\n桌\n混\n宁\n怦\n郑\n抿\n些\n余\n鄂\n饴\n攒\n珑\n群\n阖\n岔\n琨\n藓\n预\n环\n洮\n岌\n宀\n杲\n瀵\n最\n常\n囡\n周\n踊\n女\n鼓\n袭\n喉\n简\n范\n薯\n遐\n疏\n粱\n黜\n禧\n法\n箔\n斤\n遥\n汝\n奥\n直\n贞\n撑\n置\n绱\n集\n她\n馅\n逗\n钧\n橱\n魉\n[\n恙\n躁\n唤\n9\n旺\n膘\n待\n脾\n惫\n购\n吗\n依\n盲\n度\n瘿\n蠖\n俾\n之\n镗\n拇\n鲵\n厝\n簧\n续\n款\n展\n啃\n表\n剔\n品\n钻\n腭\n损\n清\n锶\n统\n涌\n寸\n滨\n贪\n链\n吠\n冈\n伎\n迥\n咏\n吁\n览\n防\n迅\n失\n汾\n阔\n逵\n绀\n蔑\n列\n川\n凭\n努\n熨\n揪\n利\n俱\n绉\n抢\n鸨\n我\n即\n责\n膦\n易\n毓\n鹊\n刹\n玷\n岿\n空\n嘞\n绊\n排\n术\n估\n锷\n违\n们\n苟\n铜\n播\n肘\n件\n烫\n审\n鲂\n广\n像\n铌\n惰\n铟\n巳\n胍\n鲍\n康\n憧\n色\n恢\n想\n拷\n尤\n疳\n知\nS\nY\nF\nD\nA\n峄\n裕\n帮\n握\n搔\n氐\n氘\n难\n墒\n沮\n雨\n叁\n缥\n悴\n藐\n湫\n娟\n苑\n稠\n颛\n簇\n后\n阕\n闭\n蕤\n缚\n怎\n佞\n码\n嘤\n蔡\n痊\n舱\n螯\n帕\n赫\n昵\n升\n烬\n岫\n、\n疵\n蜻\n髁\n蕨\n隶\n烛\n械\n丑\n盂\n梁\n强\n鲛\n由\n拘\n揉\n劭\n龟\n撤\n钩\n呕\n孛\n费\n妻\n漂\n求\n阑\n崖\n秤\n甘\n通\n深\n补\n赃\n坎\n床\n啪\n承\n吼\n量\n暇\n钼\n烨\n阂\n擎\n脱\n逮\n称\nP\n神\n属\n矗\n华\n届\n狍\n葑\n汹\n育\n患\n窒\n蛰\n佼\n静\n槎\n运\n鳗\n庆\n逝\n曼\n疱\n克\n代\n官\n此\n麸\n耧\n蚌\n晟\n例\n础\n榛\n副\n测\n唰\n缢\n迹\n灬\n霁\n身\n岁\n赭\n扛\n又\n菡\n乜\n雾\n板\n读\n陷\n徉\n贯\n郁\n虑\n变\n钓\n菜\n圾\n现\n琢\n式\n乐\n维\n渔\n浜\n左\n吾\n脑\n钡\n警\nT\n啵\n拴\n偌\n漱\n湿\n硕\n止\n骼\n魄\n积\n燥\n联\n踢\n玛\n则\n窿\n见\n振\n畿\n送\n班\n钽\n您\n赵\n刨\n印\n讨\n踝\n籍\n谡\n舌\n崧\n汽\n蔽\n沪\n酥\n绒\n怖\n财\n帖\n肱\n私\n莎\n勋\n羔\n霸\n励\n哼\n帐\n将\n帅\n渠\n纪\n婴\n娩\n岭\n厘\n滕\n吻\n伤\n坝\n冠\n戊\n隆\n瘁\n介\n涧\n物\n黍\n并\n姗\n奢\n蹑\n掣\n垸\n锴\n命\n箍\n捉\n病\n辖\n琰\n眭\n迩\n艘\n绌\n繁\n寅\n若\n毋\n思\n诉\n类\n诈\n燮\n轲\n酮\n狂\n重\n反\n职\n筱\n县\n委\n磕\n绣\n奖\n晋\n濉\n志\n徽\n肠\n呈\n獐\n坻\n口\n片\n碰\n几\n村\n柿\n劳\n料\n获\n亩\n惕\n晕\n厌\n号\n罢\n池\n正\n鏖\n煨\n家\n棕\n复\n尝\n懋\n蜥\n锅\n岛\n扰\n队\n坠\n瘾\n钬\n@\n卧\n疣\n镇\n譬\n冰\n彷\n频\n黯\n据\n垄\n采\n八\n缪\n瘫\n型\n熹\n砰\n楠\n襁\n箐\n但\n嘶\n绳\n啤\n拍\n盥\n穆\n傲\n洗\n盯\n塘\n怔\n筛\n丿\n台\n恒\n喂\n葛\n永\n￥\n烟\n酒\n桦\n书\n砂\n蚝\n缉\n态\n瀚\n袄\n圳\n轻\n蛛\n超\n榧\n遛\n姒\n奘\n铮\n右\n荽\n望\n偻\n卡\n丶\n氰\n附\n做\n革\n索\n戚\n坨\n桷\n唁\n垅\n榻\n岐\n偎\n坛\n莨\n山\n殊\n微\n骇\n陈\n爨\n推\n嗝\n驹\n澡\n藁\n呤\n卤\n嘻\n糅\n逛\n侵\n郓\n酌\n德\n摇\n※\n鬃\n被\n慨\n殡\n羸\n昌\n泡\n戛\n鞋\n河\n宪\n沿\n玲\n鲨\n翅\n哽\n源\n铅\n语\n照\n邯\n址\n荃\n佬\n顺\n鸳\n町\n霭\n睾\n瓢\n夸\n椁\n晓\n酿\n痈\n咔\n侏\n券\n噎\n湍\n签\n嚷\n离\n午\n尚\n社\n锤\n背\n孟\n使\n浪\n缦\n潍\n鞅\n军\n姹\n驶\n笑\n鳟\n鲁\n》\n孽\n钜\n绿\n洱\n礴\n焯\n椰\n颖\n囔\n乌\n孔\n巴\n互\n性\n椽\n哞\n聘\n昨\n早\n暮\n胶\n炀\n隧\n低\n彗\n昝\n铁\n呓\n氽\n藉\n喔\n癖\n瑗\n姨\n权\n胱\n韦\n堑\n蜜\n酋\n楝\n砝\n毁\n靓\n歙\n锲\n究\n屋\n喳\n骨\n辨\n碑\n武\n鸠\n宫\n辜\n烊\n适\n坡\n殃\n培\n佩\n供\n走\n蜈\n迟\n翼\n况\n姣\n凛\n浔\n吃\n飘\n债\n犟\n金\n促\n苛\n崇\n坂\n莳\n畔\n绂\n兵\n蠕\n斋\n根\n砍\n亢\n欢\n恬\n崔\n剁\n餐\n榫\n快\n扶\n‖\n濒\n缠\n鳜\n当\n彭\n驭\n浦\n篮\n昀\n锆\n秸\n钳\n弋\n娣\n瞑\n夷\n龛\n苫\n拱\n致\n%\n嵊\n障\n隐\n弑\n初\n娓\n抉\n汩\n累\n蓖\n\"\n唬\n助\n苓\n昙\n押\n毙\n破\n城\n郧\n逢\n嚏\n獭\n瞻\n溱\n婿\n赊\n跨\n恼\n璧\n萃\n姻\n貉\n灵\n炉\n密\n氛\n陶\n砸\n谬\n衔\n点\n琛\n沛\n枳\n层\n岱\n诺\n脍\n榈\n埂\n征\n冷\n裁\n打\n蹴\n素\n瘘\n逞\n蛐\n聊\n激\n腱\n萘\n踵\n飒\n蓟\n吆\n取\n咙\n簋\n涓\n矩\n曝\n挺\n揣\n座\n你\n史\n舵\n焱\n尘\n苏\n笈\n脚\n溉\n榨\n诵\n樊\n邓\n焊\n义\n庶\n儋\n蟋\n蒲\n赦\n呷\n杞\n诠\n豪\n还\n试\n颓\n茉\n太\n除\n紫\n逃\n痴\n草\n充\n鳕\n珉\n祗\n墨\n渭\n烩\n蘸\n慕\n璇\n镶\n穴\n嵘\n恶\n骂\n险\n绋\n幕\n碉\n肺\n戳\n刘\n潞\n秣\n纾\n潜\n銮\n洛\n须\n罘\n销\n瘪\n汞\n兮\n屉\nr\n林\n厕\n质\n探\n划\n狸\n殚\n善\n煊\n烹\n〒\n锈\n逯\n宸\n辍\n泱\n柚\n袍\n远\n蹋\n嶙\n绝\n峥\n娥\n缍\n雀\n徵\n认\n镱\n谷\n=\n贩\n勉\n撩\n鄯\n斐\n洋\n非\n祚\n泾\n诒\n饿\n撬\n威\n晷\n搭\n芍\n锥\n笺\n蓦\n候\n琊\n档\n礁\n沼\n卵\n荠\n忑\n朝\n凹\n瑞\n头\n仪\n弧\n孵\n畏\n铆\n突\n衲\n车\n浩\n气\n茂\n悖\n厢\n枕\n酝\n戴\n湾\n邹\n飚\n攘\n锂\n写\n宵\n翁\n岷\n无\n喜\n丈\n挑\n嗟\n绛\n殉\n议\n槽\n具\n醇\n淞\n笃\n郴\n阅\n饼\n底\n壕\n砚\n弈\n询\n缕\n庹\n翟\n零\n筷\n暨\n舟\n闺\n甯\n撞\n麂\n茌\n蔼\n很\n珲\n捕\n棠\n角\n阉\n媛\n娲\n诽\n剿\n尉\n爵\n睬\n韩\n诰\n匣\n危\n糍\n镯\n立\n浏\n阳\n少\n盆\n舔\n擘\n匪\n申\n尬\n铣\n旯\n抖\n赘\n瓯\n居\nˇ\n哮\n游\n锭\n茏\n歌\n坏\n甚\n秒\n舞\n沙\n仗\n劲\n潺\n阿\n燧\n郭\n嗖\n霏\n忠\n材\n奂\n耐\n跺\n砀\n输\n岖\n媳\n氟\n极\n摆\n灿\n今\n扔\n腻\n枝\n奎\n药\n熄\n吨\n话\nq\n额\n慑\n嘌\n协\n喀\n壳\n埭\n视\n著\n於\n愧\n陲\n翌\n峁\n颅\n佛\n腹\n聋\n侯\n咎\n叟\n秀\n颇\n存\n较\n罪\n哄\n岗\n扫\n栏\n钾\n羌\n己\n璨\n枭\n霉\n煌\n涸\n衿\n键\n镝\n益\n岢\n奏\n连\n夯\n睿\n冥\n均\n糖\n狞\n蹊\n稻\n爸\n刿\n胥\n煜\n丽\n肿\n璃\n掸\n跚\n灾\n垂\n樾\n濑\n乎\n莲\n窄\n犹\n撮\n战\n馄\n软\n络\n显\n鸢\n胸\n宾\n妲\n恕\n埔\n蝌\n份\n遇\n巧\n瞟\n粒\n恰\n剥\n桡\n博\n讯\n凯\n堇\n阶\n滤\n卖\n斌\n骚\n彬\n兑\n磺\n樱\n舷\n两\n娱\n福\n仃\n差\n找\n桁\n÷\n净\n把\n阴\n污\n戬\n雷\n碓\n蕲\n楚\n罡\n焖\n抽\n妫\n咒\n仑\n闱\n尽\n邑\n菁\n爱\n贷\n沥\n鞑\n牡\n嗉\n崴\n骤\n塌\n嗦\n订\n拮\n滓\n捡\n锻\n次\n坪\n杩\n臃\n箬\n融\n珂\n鹗\n宗\n枚\n降\n鸬\n妯\n阄\n堰\n盐\n毅\n必\n杨\n崃\n俺\n甬\n状\n莘\n货\n耸\n菱\n腼\n铸\n唏\n痤\n孚\n澳\n懒\n溅\n翘\n疙\n杷\n淼\n缙\n骰\n喊\n悉\n砻\n坷\n艇\n赁\n界\n谤\n纣\n宴\n晃\n茹\n归\n饭\n梢\n铡\n街\n抄\n肼\n鬟\n苯\n颂\n撷\n戈\n炒\n咆\n茭\n瘙\n负\n仰\n客\n琉\n铢\n封\n卑\n珥\n椿\n镧\n窨\n鬲\n寿\n御\n袤\n铃\n萎\n砖\n餮\n脒\n裳\n肪\n孕\n嫣\n馗\n嵇\n恳\n氯\n江\n石\n褶\n冢\n祸\n阻\n狈\n羞\n银\n靳\n透\n咳\n叼\n敷\n芷\n啥\n它\n瓤\n兰\n痘\n懊\n逑\n肌\n往\n捺\n坊\n甩\n呻\n〃\n沦\n忘\n膻\n祟\n菅\n剧\n崆\n智\n坯\n臧\n霍\n墅\n攻\n眯\n倘\n拢\n骠\n铐\n庭\n岙\n瓠\n′\n缺\n泥\n迢\n捶\n?\n？\n郏\n喙\n掷\n沌\n纯\n秘\n种\n听\n绘\n固\n螨\n团\n香\n盗\n妒\n埚\n蓝\n拖\n旱\n荞\n铀\n血\n遏\n汲\n辰\n叩\n拽\n幅\n硬\n惶\n桀\n漠\n措\n泼\n唑\n齐\n肾\n念\n酱\n虚\n屁\n耶\n旗\n砦\n闵\n婉\n馆\n拭\n绅\n韧\n忏\n窝\n醋\n葺\n顾\n辞\n倜\n堆\n辋\n逆\n玟\n贱\n疾\n董\n惘\n倌\n锕\n淘\n嘀\n莽\n俭\n笏\n绑\n鲷\n杈\n择\n蟀\n粥\n嗯\n驰\n逾\n案\n谪\n褓\n胫\n哩\n昕\n颚\n鲢\n绠\n躺\n鹄\n崂\n儒\n俨\n丝\n尕\n泌\n啊\n萸\n彰\n幺\n吟\n骄\n苣\n弦\n脊\n瑰\n〈\n诛\n镁\n析\n闪\n剪\n侧\n哟\n框\n螃\n守\n嬗\n燕\n狭\n铈\n缮\n概\n迳\n痧\n鲲\n俯\n售\n笼\n痣\n扉\n挖\n满\n咋\n援\n邱\n扇\n歪\n便\n玑\n绦\n峡\n蛇\n叨\n〖\n泽\n胃\n斓\n喋\n怂\n坟\n猪\n该\n蚬\n炕\n弥\n赞\n棣\n晔\n娠\n挲\n狡\n创\n疖\n铕\n镭\n稷\n挫\n弭\n啾\n翔\n粉\n履\n苘\n哦\n楼\n秕\n铂\n土\n锣\n瘟\n挣\n栉\n习\n享\n桢\n袅\n磨\n桂\n谦\n延\n坚\n蔚\n噗\n署\n谟\n猬\n钎\n恐\n嬉\n雒\n倦\n衅\n亏\n璩\n睹\n刻\n殿\n王\n算\n雕\n麻\n丘\n柯\n骆\n丸\n塍\n谚\n添\n鲈\n垓\n桎\n蚯\n芥\n予\n飕\n镦\n谌\n窗\n醚\n菀\n亮\n搪\n莺\n蒿\n羁\n足\nJ\n真\n轶\n悬\n衷\n靛\n翊\n掩\n哒\n炅\n掐\n冼\n妮\nl\n谐\n稚\n荆\n擒\n犯\n陵\n虏\n浓\n崽\n刍\n陌\n傻\n孜\n千\n靖\n演\n矜\n钕\n煽\n杰\n酗\n渗\n伞\n栋\n俗\n泫\n戍\n罕\n沾\n疽\n灏\n煦\n芬\n磴\n叱\n阱\n榉\n湃\n蜀\n叉\n醒\n彪\n租\n郡\n篷\n屎\n良\n垢\n隗\n弱\n陨\n峪\n砷\n掴\n颁\n胎\n雯\n绵\n贬\n沐\n撵\n隘\n篙\n暖\n曹\n陡\n栓\n填\n臼\n彦\n瓶\n琪\n潼\n哪\n鸡\n摩\n啦\n俟\n锋\n域\n耻\n蔫\n疯\n纹\n撇\n毒\n绶\n痛\n酯\n忍\n爪\n赳\n歆\n嘹\n辕\n烈\n册\n朴\n钱\n吮\n毯\n癜\n娃\n谀\n邵\n厮\n炽\n璞\n邃\n丐\n追\n词\n瓒\n忆\n轧\n芫\n谯\n喷\n弟\n半\n冕\n裙\n掖\n墉\n绮\n寝\n苔\n势\n顷\n褥\n切\n衮\n君\n佳\n嫒\n蚩\n霞\n佚\n洙\n逊\n镖\n暹\n唛\n&\n殒\n顶\n碗\n獗\n轭\n铺\n蛊\n废\n恹\n汨\n崩\n珍\n那\n杵\n曲\n纺\n夏\n薰\n傀\n闳\n淬\n姘\n舀\n拧\n卷\n楂\n恍\n讪\n厩\n寮\n篪\n赓\n乘\n灭\n盅\n鞣\n沟\n慎\n挂\n饺\n鼾\n杳\n树\n缨\n丛\n絮\n娌\n臻\n嗳\n篡\n侩\n述\n衰\n矛\n圈\n蚜\n匕\n筹\n匿\n濞\n晨\n叶\n骋\n郝\n挚\n蚴\n滞\n增\n侍\n描\n瓣\n吖\n嫦\n蟒\n匾\n圣\n赌\n毡\n癞\n恺\n百\n曳\n需\n篓\n肮\n庖\n帏\n卿\n驿\n遗\n蹬\n鬓\n骡\n歉\n芎\n胳\n屐\n禽\n烦\n晌\n寄\n媾\n狄\n翡\n苒\n船\n廉\n终\n痞\n殇\n々\n畦\n饶\n改\n拆\n悻\n萄\n￡\n瓿\n乃\n訾\n桅\n匮\n溧\n拥\n纱\n铍\n骗\n蕃\n龋\n缬\n父\n佐\n疚\n栎\n醍\n掳\n蓄\nx\n惆\n颜\n鲆\n榆\n〔\n猎\n敌\n暴\n谥\n鲫\n贾\n罗\n玻\n缄\n扦\n芪\n癣\n落\n徒\n臾\n恿\n猩\n托\n邴\n肄\n牵\n春\n陛\n耀\n刊\n拓\n蓓\n邳\n堕\n寇\n枉\n淌\n啡\n湄\n兽\n酷\n萼\n碚\n濠\n萤\n夹\n旬\n戮\n梭\n琥\n椭\n昔\n勺\n蜊\n绐\n晚\n孺\n僵\n宣\n摄\n冽\n旨\n萌\n忙\n蚤\n眉\n噼\n蟑\n付\n契\n瓜\n悼\n颡\n壁\n曾\n窕\n颢\n澎\n仿\n俑\n浑\n嵌\n浣\n乍\n碌\n褪\n乱\n蔟\n隙\n玩\n剐\n葫\n箫\n纲\n围\n伐\n决\n伙\n漩\n瑟\n刑\n肓\n镳\n缓\n蹭\n氨\n皓\n典\n畲\n坍\n铑\n檐\n塑\n洞\n倬\n储\n胴\n淳\n戾\n吐\n灼\n惺\n妙\n毕\n珐\n缈\n虱\n盖\n羰\n鸿\n磅\n谓\n髅\n娴\n苴\n唷\n蚣\n霹\n抨\n贤\n唠\n犬\n誓\n逍\n庠\n逼\n麓\n籼\n釉\n呜\n碧\n秧\n氩\n摔\n霄\n穸\n纨\n辟\n妈\n映\n完\n牛\n缴\n嗷\n炊\n恩\n荔\n茆\n掉\n紊\n慌\n莓\n羟\n阙\n萁\n磐\n另\n蕹\n辱\n鳐\n湮\n吡\n吩\n唐\n睦\n垠\n舒\n圜\n冗\n瞿\n溺\n芾\n囱\n匠\n僳\n汐\n菩\n饬\n漓\n黑\n霰\n浸\n濡\n窥\n毂\n蒡\n兢\n驻\n鹉\n芮\n诙\n迫\n雳\n厂\n忐\n臆\n猴\n鸣\n蚪\n栈\n箕\n羡\n渐\n莆\n捍\n眈\n哓\n趴\n蹼\n埕\n嚣\n骛\n宏\n淄\n斑\n噜\n严\n瑛\n垃\n椎\n诱\n压\n庾\n绞\n焘\n廿\n抡\n迄\n棘\n夫\n纬\n锹\n眨\n瞌\n侠\n脐\n竞\n瀑\n孳\n骧\n遁\n姜\n颦\n荪\n滚\n萦\n伪\n逸\n粳\n爬\n锁\n矣\n役\n趣\n洒\n颔\n诏\n逐\n奸\n甭\n惠\n攀\n蹄\n泛\n尼\n拼\n阮\n鹰\n亚\n颈\n惑\n勒\n〉\n际\n肛\n爷\n刚\n钨\n丰\n养\n冶\n鲽\n辉\n蔻\n画\n覆\n皴\n妊\n麦\n返\n醉\n皂\n擀\n〗\n酶\n凑\n粹\n悟\n诀\n硖\n港\n卜\nz\n杀\n涕\n±\n舍\n铠\n抵\n弛\n段\n敝\n镐\n奠\n拂\n轴\n跛\n袱\ne\nt\n沉\n菇\n俎\n薪\n峦\n秭\n蟹\n历\n盟\n菠\n寡\n液\n肢\n喻\n染\n裱\n悱\n抱\n氙\n赤\n捅\n猛\n跑\n氮\n谣\n仁\n尺\n辊\n窍\n烙\n衍\n架\n擦\n倏\n璐\n瑁\n币\n楞\n胖\n夔\n趸\n邛\n惴\n饕\n虔\n蝎\n§\n哉\n贝\n宽\n辫\n炮\n扩\n饲\n籽\n魏\n菟\n锰\n伍\n猝\n末\n琳\n哚\n蛎\n邂\n呀\n姿\n鄞\n却\n歧\n仙\n恸\n椐\n森\n牒\n寤\n袒\n婆\n虢\n雅\n钉\n朵\n贼\n欲\n苞\n寰\n故\n龚\n坭\n嘘\n咫\n礼\n硷\n兀\n睢\n汶\n’\n铲\n烧\n绕\n诃\n浃\n钿\n哺\n柜\n讼\n颊\n璁\n腔\n洽\n咐\n脲\n簌\n筠\n镣\n玮\n鞠\n谁\n兼\n姆\n挥\n梯\n蝴\n谘\n漕\n刷\n躏\n宦\n弼\nb\n垌\n劈\n麟\n莉\n揭\n笙\n渎\n仕\n嗤\n仓\n配\n怏\n抬\n错\n泯\n镊\n孰\n猿\n邪\n仍\n秋\n鼬\n壹\n歇\n吵\n炼\n<\n尧\n射\n柬\n廷\n胧\n霾\n凳\n隋\n肚\n浮\n梦\n祥\n株\n堵\n退\nL\n鹫\n跎\n凶\n毽\n荟\n炫\n栩\n玳\n甜\n沂\n鹿\n顽\n伯\n爹\n赔\n蛴\n徐\n匡\n欣\n狰\n缸\n雹\n蟆\n疤\n默\n沤\n啜\n痂\n衣\n禅\nw\ni\nh\n辽\n葳\n黝\n钗\n停\n沽\n棒\n馨\n颌\n肉\n吴\n硫\n悯\n劾\n娈\n马\n啧\n吊\n悌\n镑\n峭\n帆\n瀣\n涉\n咸\n疸\n滋\n泣\n翦\n拙\n癸\n钥\n蜒\n+\n尾\n庄\n凝\n泉\n婢\n渴\n谊\n乞\n陆\n锉\n糊\n鸦\n淮\nI\nB\nN\n晦\n弗\n乔\n庥\n葡\n尻\n席\n橡\n傣\n渣\n拿\n惩\n麋\n斛\n缃\n矮\n蛏\n岘\n鸽\n姐\n膏\n催\n奔\n镒\n喱\n蠡\n摧\n钯\n胤\n柠\n拐\n璋\n鸥\n卢\n荡\n倾\n^\n_\n珀\n逄\n萧\n塾\n掇\n贮\n笆\n聂\n圃\n冲\n嵬\nM\n滔\n笕\n值\n炙\n偶\n蜱\n搐\n梆\n汪\n蔬\n腑\n鸯\n蹇\n敞\n绯\n仨\n祯\n谆\n梧\n糗\n鑫\n啸\n豺\n囹\n猾\n巢\n柄\n瀛\n筑\n踌\n沭\n暗\n苁\n鱿\n蹉\n脂\n蘖\n牢\n热\n木\n吸\n溃\n宠\n序\n泞\n偿\n拜\n檩\n厚\n朐\n毗\n螳\n吞\n媚\n朽\n担\n蝗\n橘\n畴\n祈\n糟\n盱\n隼\n郜\n惜\n珠\n裨\n铵\n焙\n琚\n唯\n咚\n噪\n骊\n丫\n滢\n勤\n棉\n呸\n咣\n淀\n隔\n蕾\n窈\n饨\n挨\n煅\n短\n匙\n粕\n镜\n赣\n撕\n墩\n酬\n馁\n豌\n颐\n抗\n酣\n氓\n佑\n搁\n哭\n递\n耷\n涡\n桃\n贻\n碣\n截\n瘦\n昭\n镌\n蔓\n氚\n甲\n猕\n蕴\n蓬\n散\n拾\n纛\n狼\n猷\n铎\n埋\n旖\n矾\n讳\n囊\n糜\n迈\n粟\n蚂\n紧\n鲳\n瘢\n栽\n稼\n羊\n锄\n斟\n睁\n桥\n瓮\n蹙\n祉\n醺\n鼻\n昱\n剃\n跳\n篱\n跷\n蒜\n翎\n宅\n晖\n嗑\n壑\n峻\n癫\n屏\n狠\n陋\n袜\n途\n憎\n祀\n莹\n滟\n佶\n溥\n臣\n约\n盛\n峰\n磁\n慵\n婪\n拦\n莅\n朕\n鹦\n粲\n裤\n哎\n疡\n嫖\n琵\n窟\n堪\n谛\n嘉\n儡\n鳝\n斩\n郾\n驸\n酊\n妄\n胜\n贺\n徙\n傅\n噌\n钢\n栅\n庇\n恋\n匝\n巯\n邈\n尸\n锚\n粗\n佟\n蛟\n薹\n纵\n蚊\n郅\n绢\n锐\n苗\n俞\n篆\n淆\n膀\n鲜\n煎\n诶\n秽\n寻\n涮\n刺\n怀\n噶\n巨\n褰\n魅\n灶\n灌\n桉\n藕\n谜\n舸\n薄\n搀\n恽\n借\n牯\n痉\n渥\n愿\n亓\n耘\n杠\n柩\n锔\n蚶\n钣\n珈\n喘\n蹒\n幽\n赐\n稗\n晤\n莱\n泔\n扯\n肯\n菪\n裆\n腩\n豉\n疆\n骜\n腐\n倭\n珏\n唔\n粮\n亡\n润\n慰\n伽\n橄\n玄\n誉\n醐\n胆\n龊\n粼\n塬\n陇\n彼\n削\n嗣\n绾\n芽\n妗\n垭\n瘴\n爽\n薏\n寨\n龈\n泠\n弹\n赢\n漪\n猫\n嘧\n涂\n恤\n圭\n茧\n烽\n屑\n痕\n巾\n赖\n荸\n凰\n腮\n畈\n亵\n蹲\n偃\n苇\n澜\n艮\n换\n骺\n烘\n苕\n梓\n颉\n肇\n哗\n悄\n氤\n涠\n葬\n屠\n鹭\n植\n竺\n佯\n诣\n鲇\n瘀\n鲅\n邦\n移\n滁\n冯\n耕\n癔\n戌\n茬\n沁\n巩\n悠\n湘\n洪\n痹\n锟\n循\n谋\n腕\n鳃\n钠\n捞\n焉\n迎\n碱\n伫\n急\n榷\n奈\n邝\n卯\n辄\n皲\n卟\n醛\n畹\n忧\n稳\n雄\n昼\n缩\n阈\n睑\n扌\n耗\n曦\n涅\n捏\n瞧\n邕\n淖\n漉\n铝\n耦\n禹\n湛\n喽\n莼\n琅\n诸\n苎\n纂\n硅\n始\n嗨\n傥\n燃\n臂\n赅\n嘈\n呆\n贵\n屹\n壮\n肋\n亍\n蚀\n卅\n豹\n腆\n邬\n迭\n浊\n}\n童\n螂\n捐\n圩\n勐\n触\n寞\n汊\n壤\n荫\n膺\n渌\n芳\n懿\n遴\n螈\n泰\n蓼\n蛤\n茜\n舅\n枫\n朔\n膝\n眙\n避\n梅\n判\n鹜\n璜\n牍\n缅\n垫\n藻\n黔\n侥\n惚\n懂\n踩\n腰\n腈\n札\n丞\n唾\n慈\n顿\n摹\n荻\n琬\n~\n斧\n沈\n滂\n胁\n胀\n幄\n莜\nZ\n匀\n鄄\n掌\n绰\n茎\n焚\n赋\n萱\n谑\n汁\n铒\n瞎\n夺\n蜗\n野\n娆\n冀\n弯\n篁\n懵\n灞\n隽\n芡\n脘\n俐\n辩\n芯\n掺\n喏\n膈\n蝈\n觐\n悚\n踹\n蔗\n熠\n鼠\n呵\n抓\n橼\n峨\n畜\n缔\n禾\n崭\n弃\n熊\n摒\n凸\n拗\n穹\n蒙\n抒\n祛\n劝\n闫\n扳\n阵\n醌\n踪\n喵\n侣\n搬\n仅\n荧\n赎\n蝾\n琦\n买\n婧\n瞄\n寓\n皎\n冻\n赝\n箩\n莫\n瞰\n郊\n笫\n姝\n筒\n枪\n遣\n煸\n袋\n舆\n痱\n涛\n母\n〇\n启\n践\n耙\n绲\n盘\n遂\n昊\n搞\n槿\n诬\n纰\n泓\n惨\n檬\n亻\n越\nC\no\n憩\n熵\n祷\n钒\n暧\n塔\n阗\n胰\n咄\n娶\n魔\n琶\n钞\n邻\n扬\n杉\n殴\n咽\n弓\n〆\n髻\n】\n吭\n揽\n霆\n拄\n殖\n脆\n彻\n岩\n芝\n勃\n辣\n剌\n钝\n嘎\n甄\n佘\n皖\n伦\n授\n徕\n憔\n挪\n皇\n庞\n稔\n芜\n踏\n溴\n兖\n卒\n擢\n饥\n鳞\n煲\n‰\n账\n颗\n叻\n斯\n捧\n鳍\n琮\n讹\n蛙\n纽\n谭\n酸\n兔\n莒\n睇\n伟\n觑\n羲\n嗜\n宜\n褐\n旎\n辛\n卦\n诘\n筋\n鎏\n溪\n挛\n熔\n阜\n晰\n鳅\n丢\n奚\n灸\n呱\n献\n陉\n黛\n鸪\n甾\n萨\n疮\n拯\n洲\n疹\n辑\n叙\n恻\n谒\n允\n柔\n烂\n氏\n逅\n漆\n拎\n惋\n扈\n湟\n纭\n啕\n掬\n擞\n哥\n忽\n涤\n鸵\n靡\n郗\n瓷\n扁\n廊\n怨\n雏\n钮\n敦\nE\n懦\n憋\n汀\n拚\n啉\n腌\n岸\nf\n痼\n瞅\n尊\n咀\n眩\n飙\n忌\n仝\n迦\n熬\n毫\n胯\n篑\n茄\n腺\n凄\n舛\n碴\n锵\n诧\n羯\n後\n漏\n汤\n宓\n仞\n蚁\n壶\n谰\n皑\n铄\n棰\n罔\n辅\n晶\n苦\n牟\n闽\n\\\n烃\n饮\n聿\n丙\n蛳\n朱\n煤\n涔\n鳖\n犁\n罐\n荼\n砒\n淦\n妤\n黏\n戎\n孑\n婕\n瑾\n戢\n钵\n枣\n捋\n砥\n衩\n狙\n桠\n稣\n阎\n肃\n梏\n诫\n孪\n昶\n婊\n衫\n嗔\n侃\n塞\n蜃\n樵\n峒\n貌\n屿\n欺\n缫\n阐\n栖\n诟\n珞\n荭\n吝\n萍\n嗽\n恂\n啻\n蜴\n磬\n峋\n俸\n豫\n谎\n徊\n镍\n韬\n魇\n晴\nU\n囟\n猜\n蛮\n坐\n囿\n伴\n亭\n肝\n佗\n蝠\n妃\n胞\n滩\n榴\n氖\n垩\n苋\n砣\n扪\n馏\n姓\n轩\n厉\n夥\n侈\n禀\n垒\n岑\n赏\n钛\n辐\n痔\n披\n纸\n碳\n“\n坞\n蠓\n挤\n荥\n沅\n悔\n铧\n帼\n蒌\n蝇\na\np\ny\nn\ng\n哀\n浆\n瑶\n凿\n桶\n馈\n皮\n奴\n苜\n佤\n伶\n晗\n铱\n炬\n优\n弊\n氢\n恃\n甫\n攥\n端\n锌\n灰\n稹\n炝\n曙\n邋\n亥\n眶\n碾\n拉\n萝\n绔\n捷\n浍\n腋\n姑\n菖\n凌\n涞\n麽\n锢\n桨\n潢\n绎\n镰\n殆\n锑\n渝\n铬\n困\n绽\n觎\n匈\n糙\n暑\n裹\n鸟\n盔\n肽\n迷\n綦\n『\n亳\n佝\n俘\n钴\n觇\n骥\n仆\n疝\n跪\n婶\n郯\n瀹\n唉\n脖\n踞\n针\n晾\n忒\n扼\n瞩\n叛\n椒\n疟\n嗡\n邗\n肆\n跆\n玫\n忡\n捣\n咧\n唆\n艄\n蘑\n潦\n笛\n阚\n沸\n泻\n掊\n菽\n贫\n斥\n髂\n孢\n镂\n赂\n麝\n鸾\n屡\n衬\n苷\n恪\n叠\n希\n粤\n爻\n喝\n茫\n惬\n郸\n绻\n庸\n撅\n碟\n宄\n妹\n膛\n叮\n饵\n崛\n嗲\n椅\n冤\n搅\n咕\n敛\n尹\n垦\n闷\n蝉\n霎\n勰\n败\n蓑\n泸\n肤\n鹌\n幌\n焦\n浠\n鞍\n刁\n舰\n乙\n竿\n裔\n。\n茵\n函\n伊\n兄\n丨\n娜\n匍\n謇\n莪\n宥\n似\n蝽\n翳\n酪\n翠\n粑\n薇\n祢\n骏\n赠\n叫\nQ\n噤\n噻\n竖\n芗\n莠\n潭\n俊\n羿\n耜\nO\n郫\n趁\n嗪\n囚\n蹶\n芒\n洁\n笋\n鹑\n敲\n硝\n啶\n堡\n渲\n揩\n』\n携\n宿\n遒\n颍\n扭\n棱\n割\n萜\n蔸\n葵\n琴\n捂\n饰\n衙\n耿\n掠\n募\n岂\n窖\n涟\n蔺\n瘤\n柞\n瞪\n怜\n匹\n距\n楔\n炜\n哆\n秦\n缎\n幼\n茁\n绪\n痨\n恨\n楸\n娅\n瓦\n桩\n雪\n嬴\n伏\n榔\n妥\n铿\n拌\n眠\n雍\n缇\n‘\n卓\n搓\n哌\n觞\n噩\n屈\n哧\n髓\n咦\n巅\n娑\n侑\n淫\n膳\n祝\n勾\n姊\n莴\n胄\n疃\n薛\n蜷\n胛\n巷\n芙\n芋\n熙\n闰\n勿\n窃\n狱\n剩\n钏\n幢\n陟\n铛\n慧\n靴\n耍\nk\n浙\n浇\n飨\n惟\n绗\n祜\n澈\n啼\n咪\n磷\n摞\n诅\n郦\n抹\n跃\n壬\n吕\n肖\n琏\n颤\n尴\n剡\n抠\n凋\n赚\n泊\n津\n宕\n殷\n倔\n氲\n漫\n邺\n涎\n怠\n$\n垮\n荬\n遵\n俏\n叹\n噢\n饽\n蜘\n孙\n筵\n疼\n鞭\n羧\n牦\n箭\n潴\nc\n眸\n祭\n髯\n啖\n坳\n愁\n芩\n驮\n倡\n巽\n穰\n沃\n胚\n怒\n凤\n槛\n剂\n趵\n嫁\nv\n邢\n灯\n鄢\n桐\n睽\n檗\n锯\n槟\n婷\n嵋\n圻\n诗\n蕈\n颠\n遭\n痢\n芸\n怯\n馥\n竭\n锗\n徜\n恭\n遍\n籁\n剑\n嘱\n苡\n龄\n僧\n桑\n潸\n弘\n澶\n楹\n悲\n讫\n愤\n腥\n悸\n谍\n椹\n呢\n桓\n葭\n攫\n阀\n翰\n躲\n敖\n柑\n郎\n笨\n橇\n呃\n魁\n燎\n脓\n葩\n磋\n垛\n玺\n狮\n沓\n砜\n蕊\n锺\n罹\n蕉\n翱\n虐\n闾\n巫\n旦\n茱\n嬷\n枯\n鹏\n贡\n芹\n汛\n矫\n绁\n拣\n禺\n佃\n讣\n舫\n惯\n乳\n趋\n疲\n挽\n岚\n虾\n衾\n蠹\n蹂\n飓\n氦\n铖\n孩\n稞\n瑜\n壅\n掀\n勘\n妓\n畅\n髋\nW\n庐\n牲\n蓿\n榕\n练\n垣\n唱\n邸\n菲\n昆\n婺\n穿\n绡\n麒\n蚱\n掂\n愚\n泷\n涪\n漳\n妩\n娉\n榄\n讷\n觅\n旧\n藤\n煮\n呛\n柳\n腓\n叭\n庵\n烷\n阡\n罂\n蜕\n擂\n猖\n咿\n媲\n脉\n【\n沏\n貅\n黠\n熏\n哲\n烁\n坦\n酵\n兜\n×\n潇\n撒\n剽\n珩\n圹\n乾\n摸\n樟\n帽\n嗒\n襄\n魂\n轿\n憬\n锡\n〕\n喃\n皆\n咖\n隅\n脸\n残\n泮\n袂\n鹂\n珊\n囤\n捆\n咤\n误\n徨\n闹\n淙\n芊\n淋\n怆\n囗\n拨\n梳\n渤\nR\nG\n绨\n蚓\n婀\n幡\n狩\n麾\n谢\n唢\n裸\n旌\n伉\n纶\n裂\n驳\n砼\n咛\n澄\n樨\n蹈\n宙\n澍\n倍\n貔\n操\n勇\n蟠\n摈\n砧\n虬\n够\n缁\n悦\n藿\n撸\n艹\n摁\n淹\n豇\n虎\n榭\nˉ\n吱\nd\n°\n喧\n荀\n踱\n侮\n奋\n偕\n饷\n犍\n惮\n坑\n璎\n徘\n宛\n妆\n袈\n倩\n窦\n昂\n荏\n乖\nK\n怅\n撰\n鳙\n牙\n袁\n酞\nX\n痿\n琼\n闸\n雁\n趾\n荚\n虻\n涝\n《\n杏\n韭\n偈\n烤\n绫\n鞘\n卉\n症\n遢\n蓥\n诋\n杭\n荨\n匆\n竣\n簪\n辙\n敕\n虞\n丹\n缭\n咩\n黟\nm\n淤\n瑕\n咂\n铉\n硼\n茨\n嶂\n痒\n畸\n敬\n涿\n粪\n窘\n熟\n叔\n嫔\n盾\n忱\n裘\n憾\n梵\n赡\n珙\n咯\n娘\n庙\n溯\n胺\n葱\n痪\n摊\n荷\n卞\n乒\n髦\n寐\n铭\n坩\n胗\n枷\n爆\n溟\n嚼\n羚\n砬\n轨\n惊\n挠\n罄\n竽\n菏\n氧\n浅\n楣\n盼\n枢\n炸\n阆\n杯\n谏\n噬\n淇\n渺\n俪\n秆\n墓\n泪\n跻\n砌\n痰\n垡\n渡\n耽\n釜\n讶\n鳎\n煞\n呗\n韶\n舶\n绷\n鹳\n缜\n旷\n铊\n皱\n龌\n檀\n霖\n奄\n槐\n艳\n蝶\n旋\n哝\n赶\n骞\n蚧\n腊\n盈\n丁\n`\n蜚\n矸\n蝙\n睨\n嚓\n僻\n鬼\n醴\n夜\n彝\n磊\n笔\n拔\n栀\n糕\n厦\n邰\n纫\n逭\n纤\n眦\n膊\n馍\n躇\n烯\n蘼\n冬\n诤\n暄\n骶\n哑\n瘠\n」\n臊\n丕\n愈\n咱\n螺\n擅\n跋\n搏\n硪\n谄\n笠\n淡\n嘿\n骅\n谧\n鼎\n皋\n姚\n歼\n蠢\n驼\n耳\n胬\n挝\n涯\n狗\n蒽\n孓\n犷\n凉\n芦\n箴\n铤\n孤\n嘛\n坤\nV\n茴\n朦\n挞\n尖\n橙\n诞\n搴\n碇\n洵\n浚\n帚\n蜍\n漯\n柘\n嚎\n讽\n芭\n荤\n咻\n祠\n秉\n跖\n埃\n吓\n糯\n眷\n馒\n惹\n娼\n鲑\n嫩\n讴\n轮\n瞥\n靶\n褚\n乏\n缤\n宋\n帧\n删\n驱\n碎\n扑\n俩\n俄\n偏\n涣\n竹\n噱\n皙\n佰\n渚\n唧\n斡\n#\n镉\n刀\n崎\n筐\n佣\n夭\n贰\n肴\n峙\n哔\n艿\n匐\n牺\n镛\n缘\n仡\n嫡\n劣\n枸\n堀\n梨\n簿\n鸭\n蒸\n亦\n稽\n浴\n{\n衢\n束\n槲\nj\n阁\n揍\n疥\n棋\n潋\n聪\n窜\n乓\n睛\n插\n冉\n阪\n苍\n搽\n「\n蟾\n螟\n幸\n仇\n樽\n撂\n慢\n跤\n幔\n俚\n淅\n覃\n觊\n溶\n妖\n帛\n侨\n曰\n妾\n泗\n·\n：\n瀘\n風\nË\n（\n）\n∶\n紅\n紗\n瑭\n雲\n頭\n鶏\n財\n許\n•\n¥\n樂\n焗\n麗\n—\n；\n滙\n東\n榮\n繪\n興\n…\n門\n業\nπ\n楊\n國\n顧\né\n盤\n寳\nΛ\n龍\n鳳\n島\n誌\n緣\n結\n銭\n萬\n勝\n祎\n璟\n優\n歡\n臨\n時\n購\n＝\n★\n藍\n昇\n鐵\n觀\n勅\n農\n聲\n畫\n兿\n術\n發\n劉\n記\n專\n耑\n園\n書\n壴\n種\nΟ\n●\n褀\n號\n銀\n匯\n敟\n锘\n葉\n橪\n廣\n進\n蒄\n鑽\n阝\n祙\n貢\n鍋\n豊\n夬\n喆\n團\n閣\n開\n燁\n賓\n館\n酡\n沔\n順\n＋\n硚\n劵\n饸\n陽\n車\n湓\n復\n萊\n氣\n軒\n華\n堃\n迮\n纟\n戶\n馬\n學\n裡\n電\n嶽\n獨\nマ\nシ\nサ\nジ\n燘\n袪\n環\n❤\n臺\n灣\n専\n賣\n孖\n聖\n攝\n線\n▪\nα\n傢\n俬\n夢\n達\n莊\n喬\n貝\n薩\n劍\n羅\n壓\n棛\n饦\n尃\n璈\n囍\n醫\nＧ\nＩ\nＡ\n＃\nＮ\n鷄\n髙\n嬰\n啓\n約\n隹\n潔\n賴\n藝\n～\n寶\n籣\n麺\n　\n嶺\n√\n義\n網\n峩\n長\n∧\n魚\n機\n構\n②\n鳯\n偉\nＬ\nＢ\n㙟\n畵\n鴿\n＇\n詩\n溝\n嚞\n屌\n藔\n佧\n玥\n蘭\n織\n１\n３\n９\n０\n７\n點\n砭\n鴨\n鋪\n銘\n廳\n弍\n‧\n創\n湯\n坶\n℃\n卩\n骝\n＆\n烜\n荘\n當\n潤\n扞\n係\n懷\n碶\n钅\n蚨\n讠\n☆\n叢\n爲\n埗\n涫\n塗\n→\n楽\n現\n鯨\n愛\n瑪\n鈺\n忄\n悶\n藥\n飾\n樓\n視\n孬\nㆍ\n燚\n苪\n師\n①\n丼\n锽\n│\n韓\n標\nè\n兒\n閏\n匋\n張\n漢\nÜ\n髪\n會\n閑\n檔\n習\n裝\nの\n峯\n菘\n輝\nИ\n雞\n釣\n億\n浐\nＫ\nＯ\nＲ\n８\nＨ\nＥ\nＰ\nＴ\nＷ\nＤ\nＳ\nＣ\nＭ\nＦ\n姌\n饹\n»\n晞\n廰\nä\n嵯\n鷹\n負\n飲\n絲\n冚\n楗\n澤\n綫\n區\n❋\n←\n質\n靑\n揚\n③\n滬\n統\n産\n協\n﹑\n乸\n畐\n經\n運\n際\n洺\n岽\n為\n粵\n諾\n崋\n豐\n碁\nɔ\nＶ\n２\n６\n齋\n誠\n訂\n´\n勑\n雙\n陳\n無\ní\n泩\n媄\n夌\n刂\nｉ\nｃ\nｔ\nｏ\nｒ\nａ\n嘢\n耄\n燴\n暃\n壽\n媽\n靈\n抻\n體\n唻\nÉ\n冮\n甹\n鎮\n錦\nʌ\n蜛\n蠄\n尓\n駕\n戀\n飬\n逹\n倫\n貴\n極\nЯ\nЙ\n寬\n磚\n嶪\n郎\n職\n｜\n間\nｎ\nｄ\n剎\n伈\n課\n飛\n橋\n瘊\n№\n譜\n骓\n圗\n滘\n縣\n粿\n咅\n養\n濤\n彳\n®\n％\nⅡ\n啰\n㴪\n見\n矞\n薬\n糁\n邨\n鲮\n顔\n罱\nЗ\n選\n話\n贏\n氪\n俵\n競\n瑩\n繡\n枱\nβ\n綉\ná\n獅\n爾\n™\n麵\n戋\n淩\n徳\n個\n劇\n場\n務\n簡\n寵\nｈ\n實\n膠\n轱\n圖\n築\n嘣\n樹\n㸃\n營\n耵\n孫\n饃\n鄺\n飯\n麯\n遠\n輸\n坫\n孃\n乚\n閃\n鏢\n㎡\n題\n廠\n關\n↑\n爺\n將\n軍\n連\n篦\n覌\n參\n箸\n－\n窠\n棽\n寕\n夀\n爰\n歐\n呙\n閥\n頡\n熱\n雎\n垟\n裟\n凬\n勁\n帑\n馕\n夆\n疌\n枼\n馮\n貨\n蒤\n樸\n彧\n旸\n靜\n龢\n暢\n㐱\n鳥\n珺\n鏡\n灡\n爭\n堷\n廚\nÓ\n騰\n診\n┅\n蘇\n褔\n凱\n頂\n豕\n亞\n帥\n嘬\n⊥\n仺\n桖\n複\n饣\n絡\n穂\n顏\n棟\n納\n▏\n濟\n親\n設\n計\n攵\n埌\n烺\nò\n頤\n燦\n蓮\n撻\n節\n講\n濱\n濃\n娽\n洳\n朿\n燈\n鈴\n護\n膚\n铔\n過\n補\nＺ\nＵ\n５\n４\n坋\n闿\n䖝\n餘\n缐\n铞\n貿\n铪\n桼\n趙\n鍊\n［\n㐂\n垚\n菓\n揸\n捲\n鐘\n滏\n𣇉\n爍\n輪\n燜\n鴻\n鮮\n動\n鹞\n鷗\n丄\n慶\n鉌\n翥\n飮\n腸\n⇋\n漁\n覺\n來\n熘\n昴\n翏\n鲱\n圧\n鄉\n萭\n頔\n爐\n嫚\nг\n貭\n類\n聯\n幛\n輕\n訓\n鑒\n夋\n锨\n芃\n珣\n䝉\n扙\n嵐\n銷\n處\nㄱ\n語\n誘\n苝\n歸\n儀\n燒\n楿\n內\n粢\n葒\n奧\n麥\n礻\n滿\n蠔\n穵\n瞭\n態\n鱬\n榞\n硂\n鄭\n黃\n煙\n祐\n奓\n逺\n＊\n瑄\n獲\n聞\n薦\n讀\n這\n樣\n決\n問\n啟\n們\n執\n説\n轉\n單\n隨\n唘\n帶\n倉\n庫\n還\n贈\n尙\n皺\n■\n餅\n產\n○\n∈\n報\n狀\n楓\n賠\n琯\n嗮\n禮\n｀\n傳\n＞\n≤\n嗞\nΦ\n≥\n換\n咭\n∣\n↓\n曬\nε\n応\n寫\n″\n終\n様\n純\n費\n療\n聨\n凍\n壐\n郵\nü\n黒\n∫\n製\n塊\n調\n軽\n確\n撃\n級\n馴\nⅢ\n涇\n繹\n數\n碼\n證\n狒\n処\n劑\n＜\n晧\n賀\n衆\n］\n櫥\n兩\n陰\n絶\n對\n鯉\n憶\n◎\nｐ\nｅ\nＹ\n蕒\n煖\n頓\n測\n試\n鼽\n僑\n碩\n妝\n帯\n≈\n鐡\n舖\n權\n喫\n倆\nˋ\n該\n悅\nā\n俫\n．\nｆ\nｓ\nｂ\nｍ\nｋ\nｇ\nｕ\nｊ\n貼\n淨\n濕\n針\n適\n備\nｌ\n／\n給\n謢\n強\n觸\n衛\n與\n⊙\n＄\n緯\n變\n⑴\n⑵\n⑶\n㎏\n殺\n∩\n幚\n─\n價\n▲\n離\nú\nó\n飄\n烏\n関\n閟\n﹝\n﹞\n邏\n輯\n鍵\n驗\n訣\n導\n歷\n屆\n層\n▼\n儱\n錄\n熳\nē\n艦\n吋\n錶\n辧\n飼\n顯\n④\n禦\n販\n気\n対\n枰\n閩\n紀\n幹\n瞓\n貊\n淚\n△\n眞\n墊\nΩ\n獻\n褲\n縫\n緑\n亜\n鉅\n餠\n｛\n｝\n◆\n蘆\n薈\n█\n◇\n溫\n彈\n晳\n粧\n犸\n穩\n訊\n崬\n凖\n熥\nП\n舊\n條\n紋\n圍\nⅣ\n筆\n尷\n難\n雜\n錯\n綁\n識\n頰\n鎖\n艶\n□\n殁\n殼\n⑧\n├\n▕\n鵬\nǐ\nō\nǒ\n糝\n綱\n▎\nμ\n盜\n饅\n醬\n籤\n蓋\n釀\n鹽\n據\nà\nɡ\n辦\n◥\n彐\n┌\n婦\n獸\n鲩\n伱\nī\n蒟\n蒻\n齊\n袆\n腦\n寧\n凈\n妳\n煥\n詢\n偽\n謹\n啫\n鯽\n騷\n鱸\n損\n傷\n鎻\n髮\n買\n冏\n儥\n両\n﹢\n∞\n載\n喰\nｚ\n羙\n悵\n燙\n曉\n員\n組\n徹\n艷\n痠\n鋼\n鼙\n縮\n細\n嚒\n爯\n≠\n維\n＂\n鱻\n壇\n厍\n帰\n浥\n犇\n薡\n軎\n²\n應\n醜\n刪\n緻\n鶴\n賜\n噁\n軌\n尨\n镔\n鷺\n槗\n彌\n葚\n濛\n請\n溇\n緹\n賢\n訪\n獴\n瑅\n資\n縤\n陣\n蕟\n栢\n韻\n祼\n恁\n伢\n謝\n劃\n涑\n總\n衖\n踺\n砋\n凉\n籃\n駿\n苼\n瘋\n昽\n紡\n驊\n腎\n﹗\n響\n杋\n剛\n嚴\n禪\n歓\n槍\n傘\n檸\n檫\n炣\n勢\n鏜\n鎢\n銑\n尐\n減\n奪\n惡\nθ\n僮\n婭\n臘\nū\nì\n殻\n鉄\n∑\n蛲\n焼\n緖\n續\n紹\n懮\n";

var recPostprocess = /*#__PURE__*/function () {
  // preds: [1, ?, 6625]
  function recPostprocess(preds) {
    _classCallCheck(this, recPostprocess);
    _defineProperty(this, "ocr_character", void 0);
    _defineProperty(this, "preds_idx", void 0);
    _defineProperty(this, "preds_prob", void 0);
    this.ocr_character = character.toString().split('\n');
    var preds_idx = [];
    var preds_prob = [];
    var pred_len = 6625;
    for (var i = 0; i < preds.length; i += pred_len) {
      var tmpArr = preds.slice(i, i + pred_len - 1);
      var tmpMax = Math.max.apply(Math, _toConsumableArray(tmpArr));
      var tmpIdx = tmpArr.indexOf(tmpMax);
      preds_prob.push(tmpMax);
      preds_idx.push(tmpIdx);
    }
    this.preds_idx = preds_idx;
    this.preds_prob = preds_prob;
  }
  _createClass(recPostprocess, [{
    key: "decode",
    value: function decode(text_index, text_prob) {
      var is_remove_duplicate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var ignored_tokens = this.get_ignored_tokens();
      var char_list = [];
      var conf_list = [];
      for (var idx = 0; idx < text_index.length; idx++) {
        if (text_index[idx] in ignored_tokens) {
          continue;
        }
        if (is_remove_duplicate) {
          if (idx > 0 && text_index[idx - 1] === text_index[idx]) {
            continue;
          }
        }
        char_list.push(this.ocr_character[text_index[idx] - 1]);
        if (text_prob) {
          conf_list.push(text_prob[idx]);
        } else {
          conf_list.push(1);
        }
      }
      var text = '';
      var mean = 0;
      if (char_list.length) {
        text = char_list.join('');
        var sum = 0;
        conf_list.forEach(function (item) {
          sum += item;
        });
        mean = sum / conf_list.length;
      }
      return {
        text: text,
        mean: mean
      };
    }
  }, {
    key: "get_ignored_tokens",
    value: function get_ignored_tokens() {
      return [0];
    }
  }, {
    key: "outputResult",
    value: function outputResult() {
      return this.decode(this.preds_idx, this.preds_prob, true);
    }
  }]);
  return recPostprocess;
}();

var defaultPostConfig = {
  shape: 960,
  thresh: 0.3,
  box_thresh: 0.6,
  unclip_ratio: 1.5
};
var DEFAULTDETSHAPE = 960;
var RECWIDTH = 320;
var RECHEIGHT = 48;
var canvas_det = wx.createOffscreenCanvas({ type: '2d', width: 1, height: 1 });
var canvas_rec = wx.createOffscreenCanvas({ type: '2d', width: 1, height: 1 });
var detectRunner = null;
var recRunner = null;
initCanvas(canvas_det);
initCanvas(canvas_rec);
function initCanvas(canvas) {
  return canvas;
}
function init() {
  return _init.apply(this, arguments);
}
function _init() {
  _init = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var detCustomModel,
      recCustomModel,
      detModelPath,
      recModelPath,
      detectInit,
      recInit,
      _args = arguments;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            detCustomModel = _args.length > 0 && _args[0] !== undefined ? _args[0] : '';
            recCustomModel = _args.length > 1 && _args[1] !== undefined ? _args[1] : '';
            detModelPath = 'https://js-models.bj.bcebos.com/PaddleOCR/PP-OCRv3/ch_PP-OCRv3_det_infer_js_960/model.json';
            recModelPath = 'https://js-models.bj.bcebos.com/PaddleOCR/PP-OCRv3/ch_PP-OCRv3_rec_infer_js/model.json';
            paddlejsCore.env.set('webgl_pack_output', true);
            detectRunner = new paddlejsCore.Runner({
              modelPath: detCustomModel ? detCustomModel : detModelPath,
              fill: '#fff',
              mean: [0.485, 0.456, 0.406],
              std: [0.229, 0.224, 0.225],
              bgr: true,
              webglFeedProcess: true
            });
            detectInit = detectRunner.init();
            recRunner = new paddlejsCore.Runner({
              modelPath: recCustomModel ? recCustomModel : recModelPath,
              fill: '#000',
              mean: [0.5, 0.5, 0.5],
              std: [0.5, 0.5, 0.5],
              bgr: true,
              webglFeedProcess: true
            });
            recInit = recRunner.init();
            _context.next = 11;
            return Promise.all([detectInit, recInit]);
          case 11:
            if (detectRunner.feedShape) {
              DEFAULTDETSHAPE = detectRunner.feedShape.fw;
            }
            if (recRunner.feedShape) {
              RECWIDTH = recRunner.feedShape.fw;
              RECHEIGHT = recRunner.feedShape.fh;
            }
          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _init.apply(this, arguments);
}
function detect(_x) {
  return _detect.apply(this, arguments);
}
function _detect() {
  _detect = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(image) {
    var Config,
      DETSHAPE,
      thresh,
      box_thresh,
      unclip_ratio,
      targetWidth,
      targetHeight,
      ctx,
      sw,
      sh,
      x,
      y,
      shapeList,
      outsDict,
      postResult,
      result,
      points,
      adjust,
      _args2 = arguments;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            Config = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : defaultPostConfig;
            // 目标尺寸
            DETSHAPE = Config.shape ? Config.shape : DEFAULTDETSHAPE;
            thresh = Config.thresh;
            box_thresh = Config.box_thresh;
            unclip_ratio = Config.unclip_ratio;
            targetWidth = DETSHAPE;
            targetHeight = DETSHAPE;
            canvas_det.width = targetWidth;
            canvas_det.height = targetHeight;
            // 通过canvas将上传原图大小转换为目标尺寸
            ctx = canvas_det.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetHeight, targetWidth);
            // 缩放后的宽高
            sw = targetWidth;
            sh = targetHeight;
            x = 0;
            y = 0; // target的长宽比大些 就把原图的高变成target那么高
            if (targetWidth / targetHeight * (image.naturalHeight || image.height) / (image.naturalWidth || image.width) >= 1) {
              sw = Math.round(sh * (image.naturalWidth || image.width) / (image.naturalHeight || image.height));
              x = Math.floor((targetWidth - sw) / 2);
            }
            // target的长宽比小些 就把原图的宽变成target那么宽
            else {
              sh = Math.round(sw * (image.naturalHeight || image.height) / (image.naturalWidth || image.width));
              y = Math.floor((targetHeight - sh) / 2);
            }
            ctx.drawImage(image, x, y, sw, sh);
            shapeList = [DETSHAPE, DETSHAPE];
            _context2.next = 21;
            return detectRunner.predict(canvas_det);
          case 21:
            outsDict = _context2.sent;
            postResult = new DBPostprocess(outsDict, shapeList, thresh, box_thresh, unclip_ratio); // 获取坐标
            result = postResult.outputBox(); // 转换原图坐标
            points = JSON.parse(JSON.stringify(result.boxes)); // 框选调整大小
            adjust = 8;
            points && points.forEach(function (item) {
              item.forEach(function (point, index) {
                // 扩大框选区域，便于文字识别
                point[0] = clip(Math.round(point[0] - x) * Math.max((image.naturalWidth || image.width), (image.naturalHeight || image.height)) / DETSHAPE + (index === 0 ? -adjust : index === 1 ? adjust : index === 2 ? adjust : -adjust), 0, (image.naturalWidth || image.width));
                point[1] = clip(Math.round(point[1] - y) * Math.max((image.naturalWidth || image.width), (image.naturalHeight || image.height)) / DETSHAPE + (index === 0 ? -adjust : index === 1 ? -adjust : index === 2 ? adjust : adjust), 0, (image.naturalHeight || image.height));
              });
            });
            return _context2.abrupt("return", points);
          case 28:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _detect.apply(this, arguments);
}
function drawBox(points, image, canvas, style) {
  canvas.width = (image.naturalWidth || image.width);
  canvas.height = (image.naturalHeight || image.height);
  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  points && points.forEach(function (point) {
    // 开始一个新的绘制路径
    ctx.beginPath();
    // 设置绘制线条颜色，默认为黑色
    ctx.strokeStyle = (style === null || style === void 0 ? void 0 : style.strokeStyle) || '#000';
    // 设置线段宽度，默认为1
    ctx.lineWidth = (style === null || style === void 0 ? void 0 : style.lineWidth) || 1;
    // 设置填充颜色，默认透明
    ctx.fillStyle = (style === null || style === void 0 ? void 0 : style.fillStyle) || 'transparent';
    // 设置路径起点坐标
    ctx.moveTo(point[0][0], point[0][1]);
    ctx.lineTo(point[1][0], point[1][1]);
    ctx.lineTo(point[2][0], point[2][1]);
    ctx.lineTo(point[3][0], point[3][1]);
    // 进行内容填充
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
}
/**
 * 文本识别
 * @param {HTMLImageElement} image 原图
 * @param {Object} options 绘制文本框配置参数
 * @param detConfig 识别相关可调参数
 */
function recognize(_x2, _x3) {
  return _recognize.apply(this, arguments);
}
function _recognize() {
  _recognize = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(image, options) {
    var detConfig,
      point,
      boxes,
      text_list,
      i,
      tmp_box,
      ratio,
      width_num,
      text_list_tmp,
      _i,
      output,
      recResult,
      text,
      _output,
      _recResult,
      _text,
      _args3 = arguments;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            detConfig = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : defaultPostConfig;
            _context3.next = 3;
            return detect(image, detConfig);
          case 3:
            point = _context3.sent;
            // 绘制文本框
            if (options !== null && options !== void 0 && options.canvas) {
              drawBox(point, image, options.canvas, options.style);
            }
            boxes = sorted_boxes(point);
            text_list = [];
            i = 0;
          case 8:
            if (!(i < boxes.length)) {
              _context3.next = 39;
              break;
            }
            tmp_box = JSON.parse(JSON.stringify(boxes[i]));
            get_rotate_crop_image(image, tmp_box);
            // 默认ratio=3，3是经验值，可根据实际情况调整。
            ratio = 3;
            width_num = Math.ceil(canvas_det.width / RECWIDTH / ratio);
            text_list_tmp = '';
            /**
             * 如果输入为长文本情况，即box的宽度 > ratio * RECWIDTH，按照 ratio * RECWIDTH的宽度裁剪，并将每个裁剪部分的识别结果拼接起来。
             * 如果输入为短文本情况，即box的宽度 < ratio * RECWIDTH，直接预测即可。
             */
            if (!(width_num > 1)) {
              _context3.next = 29;
              break;
            }
            _i = 0;
          case 16:
            if (!(_i < width_num)) {
              _context3.next = 27;
              break;
            }
            resize_norm_img_splice(canvas_det, canvas_det.width, canvas_det.height, _i, ratio);
            _context3.next = 20;
            return recRunner.predict(canvas_rec);
          case 20:
            output = _context3.sent;
            recResult = new recPostprocess(output);
            text = recResult.outputResult();
            text_list_tmp = text_list_tmp.concat(text.text);
          case 24:
            _i++;
            _context3.next = 16;
            break;
          case 27:
            _context3.next = 35;
            break;
          case 29:
            _context3.next = 31;
            return recRunner.predict(canvas_det);
          case 31:
            _output = _context3.sent;
            _recResult = new recPostprocess(_output);
            _text = _recResult.outputResult();
            text_list_tmp = text_list_tmp.concat(_text.text);
          case 35:
            text_list.push(text_list_tmp);
          case 36:
            i++;
            _context3.next = 8;
            break;
          case 39:
            return _context3.abrupt("return", {
              text: text_list,
              points: point
            });
          case 40:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _recognize.apply(this, arguments);
}
function sorted_boxes(box) {
  function sortNumber(a, b) {
    return a[0][1] - b[0][1];
  }
  var boxes = box.sort(sortNumber);
  var num_boxes = boxes.length;
  for (var i = 0; i < num_boxes - 1; i++) {
    if (Math.abs(boxes[i + 1][0][1] - boxes[i][0][1]) < 10 && boxes[i + 1][0][0] < boxes[i][0][0]) {
      var tmp = boxes[i];
      boxes[i] = boxes[i + 1];
      boxes[i + 1] = tmp;
    }
  }
  return boxes;
}
function get_rotate_crop_image(img, points) {
  var img_crop_width = _int(Math.max(linalg_norm(points[0], points[1]), linalg_norm(points[2], points[3])));
  var img_crop_height = _int(Math.max(linalg_norm(points[0], points[3]), linalg_norm(points[1], points[2])));
  var pts_std = [[0, 0], [img_crop_width, 0], [img_crop_width, img_crop_height], [0, img_crop_height]];
  var srcTri = opencv_ocr.matFromArray(4, 1, opencv_ocr.CV_32FC2, flatten(points));
  var dstTri = opencv_ocr.matFromArray(4, 1, opencv_ocr.CV_32FC2, flatten(pts_std));
  // 获取到目标矩阵
  var M = opencv_ocr.getPerspectiveTransform(srcTri, dstTri);
  var src = opencv_ocr.imread(img);
  var dst = new opencv_ocr.Mat();
  var dsize = new opencv_ocr.Size(img_crop_width, img_crop_height);
  // 透视转换
  opencv_ocr.warpPerspective(src, dst, M, dsize, opencv_ocr.INTER_CUBIC, opencv_ocr.BORDER_REPLICATE, new opencv_ocr.Scalar());
  var dst_img_height = dst.matSize[0];
  var dst_img_width = dst.matSize[1];
  var dst_rot;
  // 图像旋转
  if (dst_img_height / dst_img_width >= 1.5) {
    dst_rot = new opencv_ocr.Mat();
    var dsize_rot = new opencv_ocr.Size(dst.rows, dst.cols);
    var center = new opencv_ocr.Point(dst.cols / 2, dst.cols / 2);
    var _M = opencv_ocr.getRotationMatrix2D(center, 90, 1);
    opencv_ocr.warpAffine(dst, dst_rot, _M, dsize_rot, opencv_ocr.INTER_CUBIC, opencv_ocr.BORDER_REPLICATE, new opencv_ocr.Scalar());
  }
  var dst_resize = new opencv_ocr.Mat();
  var dsize_resize = new opencv_ocr.Size(0, 0);
  var scale;
  if (dst_rot) {
    scale = RECHEIGHT / dst_rot.matSize[0];
    opencv_ocr.resize(dst_rot, dst_resize, dsize_resize, scale, scale, opencv_ocr.INTER_AREA);
    dst_rot["delete"]();
  } else {
    scale = RECHEIGHT / dst_img_height;
    opencv_ocr.resize(dst, dst_resize, dsize_resize, scale, scale, opencv_ocr.INTER_AREA);
  }
  canvas_det.width = dst_resize.matSize[1];
  canvas_det.height = dst_resize.matSize[0];
  opencv_ocr.imshow(canvas_det, dst_resize);
  src["delete"]();
  dst["delete"]();
  dst_resize["delete"]();
  srcTri["delete"]();
  dstTri["delete"]();
}
function linalg_norm(x, y) {
  return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2));
}
function resize_norm_img_splice(image, origin_width, origin_height) {
  var index = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var ratio = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 3;
  canvas_rec.width = RECWIDTH;
  canvas_rec.height = RECHEIGHT;
  var ctx = canvas_rec.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.clearRect(0, 0, canvas_rec.width, canvas_rec.height);
  ctx.drawImage(image, -index * RECWIDTH * ratio, 0, origin_width, origin_height);
}

exports.init = init;
exports.recognize = recognize;

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1784089473052);
})()
//miniprogram-npm-outsideDeps=["@paddlejs/paddlejs-core","@paddlejs/paddlejs-backend-webgl","js-clipper","number-precision","path","fs","crypto","d3-polygon"]
//# sourceMappingURL=index.js.map

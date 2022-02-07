(function () {
  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  (self["webpackChunkngx_ellipsis_demo"] = self["webpackChunkngx_ellipsis_demo"] || []).push([["main"], {
    /***/
    8255:
    /*!*******************************************************!*\
      !*** ./$_lazy_route_resources/ lazy namespace object ***!
      \*******************************************************/

    /***/
    function _(module) {
      function webpackEmptyAsyncContext(req) {
        // Here Promise.resolve().then() is used instead of new Promise() to prevent
        // uncaught exception popping up in devtools
        return Promise.resolve().then(function () {
          var e = new Error("Cannot find module '" + req + "'");
          e.code = 'MODULE_NOT_FOUND';
          throw e;
        });
      }

      webpackEmptyAsyncContext.keys = function () {
        return [];
      };

      webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
      webpackEmptyAsyncContext.id = 8255;
      module.exports = webpackEmptyAsyncContext;
      /***/
    },

    /***/
    7039:
    /*!************************************************************************!*\
      !*** ./projects/ngx-ellipsis/src/lib/directives/ellipsis.directive.ts ***!
      \************************************************************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "EllipsisDirective": function EllipsisDirective() {
          return (
            /* binding */
            _EllipsisDirective
          );
        }
        /* harmony export */

      });
      /* harmony import */


      var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
      /*! @angular/core */
      7716);
      /* harmony import */


      var _juggle_resize_observer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! @juggle/resize-observer */
      3476);
      /* harmony import */


      var rxjs_operators__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
      /*! rxjs/operators */
      5257);
      /* harmony import */


      var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! rxjs */
      9765);
      /* harmony import */


      var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
      /*! @angular/common */
      8583);

      var ResizeObserver = _juggle_resize_observer__WEBPACK_IMPORTED_MODULE_0__.ResizeObserver;
      /**
       * Directive to truncate the contained text, if it exceeds the element's boundaries
       * and append characters (configurable, default '...') if so.
       */

      var _EllipsisDirective = /*#__PURE__*/function () {
        /**
         * The directive's constructor
         */
        function _EllipsisDirective(elementRef, renderer, ngZone, platformId) {
          _classCallCheck(this, _EllipsisDirective);

          this.elementRef = elementRef;
          this.renderer = renderer;
          this.ngZone = ngZone;
          this.platformId = platformId;
          /**
           * Subject triggered when resize listeners should be removed
           */

          this.removeResizeListeners$ = new rxjs__WEBPACK_IMPORTED_MODULE_1__.Subject();
          /**
           * The ellipsis-content html attribute
           * If passed this is used as content, else contents
           * are fetched from textContent
           */

          this.ellipsisContent = null;
          /**
           * The ellipsis-click-more html attribute
           * If anything is passed, the ellipsisCharacters will be
           * wrapped in <a></a> tags and an event handler for the
           * passed function will be added to the link
           */

          this.moreClickEmitter = new _angular_core__WEBPACK_IMPORTED_MODULE_2__.EventEmitter();
          /**
           * The ellipsis-change html attribute
           * This emits after which index the text has been truncated.
           * If it hasn't been truncated, null is emitted.
           */

          this.changeEmitter = new _angular_core__WEBPACK_IMPORTED_MODULE_2__.EventEmitter();
        }
        /**
         * Utility method to quickly find the largest number for
         * which `callback(number)` still returns true.
         * @param  max      Highest possible number
         * @param  callback Should return true as long as the passed number is valid
         * @return          Largest possible number
         */


        _createClass(_EllipsisDirective, [{
          key: "ngAfterViewInit",
          value:
          /**
           * Angular's init view life cycle hook.
           * Initializes the element for displaying the ellipsis.
           */
          function ngAfterViewInit() {
            if (!(0, _angular_common__WEBPACK_IMPORTED_MODULE_3__.isPlatformBrowser)(this.platformId)) {
              // in angular universal we don't have access to the ugly
              // DOM manipulation properties we sadly need to access here,
              // so wait until we're in the browser:
              return;
            } // Prefer native ResizeObserver over ponyfill, if available:


            if (window.ResizeObserver != null) {
              ResizeObserver = window.ResizeObserver;
            } // let the ellipsis characters default to '...':


            if (this.ellipsisCharacters === '') {
              this.ellipsisCharacters = '...';
            } // create more anchor element:


            this.moreAnchor = this.renderer.createElement('a');
            this.moreAnchor.className = 'ngx-ellipsis-more';
            this.moreAnchor.href = '#';
            this.moreAnchor.textContent = this.ellipsisCharacters; // perform regex replace on word boundaries:

            if (!this.ellipsisWordBoundaries) {
              this.ellipsisWordBoundaries = '';
            }

            this.ellipsisWordBoundaries = '[' + this.ellipsisWordBoundaries.replace(/\\n/, '\n').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ']';

            if (!this.ellipsisSubstrFn) {
              this.ellipsisSubstrFn = function (str, from, length) {
                return str.substr(from, length);
              };
            } // store the original contents of the element:


            this.elem = this.elementRef.nativeElement;

            if (typeof this.ellipsisContent !== 'undefined' && this.ellipsisContent !== null) {
              this.originalText = _EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent);
            } else if (!this.originalText) {
              this.originalText = this.elem.textContent.trim();
            } // add a wrapper div (required for resize events to work properly):


            this.renderer.setProperty(this.elem, 'innerHTML', '');
            this.innerElem = this.renderer.createElement('p');
            this.renderer.addClass(this.innerElem, 'ngx-ellipsis-inner');
            var text = this.renderer.createText(this.originalText);
            this.renderer.appendChild(this.innerElem, text);
            this.renderer.appendChild(this.elem, this.innerElem);
            this.previousDimensions = {
              width: this.elem.clientWidth,
              height: this.elem.clientHeight
            }; // start listening for resize events:

            this.addResizeListener(true);
          }
          /**
           * Angular's change life cycle hook.
           * Change original text (if the ellipsis-content has been passed)
           * and re-render
           */

        }, {
          key: "ngOnChanges",
          value: function ngOnChanges(changes) {
            var moreAnchorRequiresChange = this.moreAnchor && changes['ellipsisCharacters'];

            if (moreAnchorRequiresChange) {
              this.moreAnchor.textContent = this.ellipsisCharacters;
            }

            if (this.elem && typeof this.ellipsisContent !== 'undefined' && (this.originalText !== _EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent) || moreAnchorRequiresChange)) {
              this.originalText = _EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent);
              this.applyEllipsis();
            }
          }
          /**
           * Angular's destroy life cycle hook.
           * Remove event listeners
           */

        }, {
          key: "ngOnDestroy",
          value: function ngOnDestroy() {
            // In angular universal we don't have any listeners hooked up (all requiring ugly DOM manipulation methods),
            // so we only need to remove them, if we're inside the browser:
            if ((0, _angular_common__WEBPACK_IMPORTED_MODULE_3__.isPlatformBrowser)(this.platformId)) {
              this.removeAllListeners();
            }
          }
          /**
           * remove all resize listeners
           */

        }, {
          key: "removeAllListeners",
          value: function removeAllListeners() {
            if (this.destroyMoreClickListener) {
              this.destroyMoreClickListener();
            }

            this.removeResizeListeners$.next();
            this.removeResizeListeners$.complete();
          }
          /**
           * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
           * The type of the listener (window/element) depends on the resizeDetectionStrategy.
           * @param triggerNow=false if true, the ellipsis is applied immediately
           */

        }, {
          key: "addResizeListener",
          value: function addResizeListener() {
            var triggerNow = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (typeof this.resizeDetectionStrategy === 'undefined') {
              this.resizeDetectionStrategy = '';
            }

            switch (this.resizeDetectionStrategy) {
              case 'manual':
                // Users will trigger applyEllipsis via the public API
                break;

              case 'window':
                this.addWindowResizeListener();
                break;

              default:
                if (typeof console !== 'undefined') {
                  console.warn("No such ellipsis-resize-detection strategy: '".concat(this.resizeDetectionStrategy, "'. Using 'resize-observer' instead"));
                }

              // eslint-disable-next-line no-fallthrough

              case 'resize-observer':
              case '':
                this.addElementResizeListener();
                break;
            }

            if (triggerNow && this.resizeDetectionStrategy !== 'manual') {
              this.applyEllipsis();
            }
          }
          /**
           * Set up an event listener to call applyEllipsis() whenever the window gets resized.
           */

        }, {
          key: "addWindowResizeListener",
          value: function addWindowResizeListener() {
            var _this = this;

            var removeWindowResizeListener = this.renderer.listen('window', 'resize', function () {
              _this.ngZone.run(function () {
                _this.applyEllipsis();
              });
            });
            this.removeResizeListeners$.pipe((0, rxjs_operators__WEBPACK_IMPORTED_MODULE_4__.take)(1)).subscribe(function () {
              return removeWindowResizeListener();
            });
          }
          /**
           * Set up an event listener to call applyEllipsis() whenever the element
           * has been resized.
           */

        }, {
          key: "addElementResizeListener",
          value: function addElementResizeListener() {
            var _this2 = this;

            var resizeObserver = new ResizeObserver(function () {
              window.requestAnimationFrame(function () {
                if (_this2.previousDimensions.width !== _this2.elem.clientWidth || _this2.previousDimensions.height !== _this2.elem.clientHeight) {
                  _this2.ngZone.run(function () {
                    _this2.applyEllipsis();
                  });

                  _this2.previousDimensions.width = _this2.elem.clientWidth;
                  _this2.previousDimensions.height = _this2.elem.clientHeight;
                }
              });
            });
            resizeObserver.observe(this.elem);
            this.removeResizeListeners$.pipe((0, rxjs_operators__WEBPACK_IMPORTED_MODULE_4__.take)(1)).subscribe(function () {
              return resizeObserver.disconnect();
            });
          }
          /**
           * Get the original text's truncated version. If the text really needed to
           * be truncated, this.ellipsisCharacters will be appended.
           * @param max the maximum length the text may have
           * @return string       the truncated string
           */

        }, {
          key: "getTruncatedText",
          value: function getTruncatedText(max) {
            if (!this.originalText || this.originalText.length <= max) {
              return this.originalText;
            }

            var truncatedText = this.ellipsisSubstrFn(this.originalText, 0, max);

            if (this.ellipsisWordBoundaries === '[]' || this.originalText.charAt(max).match(this.ellipsisWordBoundaries)) {
              return truncatedText;
            }

            var i = max - 1;

            while (i > 0 && !truncatedText.charAt(i).match(this.ellipsisWordBoundaries)) {
              i--;
            }

            return this.ellipsisSubstrFn(truncatedText, 0, i);
          }
          /**
           * Set the truncated text to be displayed in the inner div
           * @param max the maximum length the text may have
           * @param addMoreListener=false listen for click on the ellipsisCharacters anchor tag if the text has been truncated
           * @returns length of remaining text (excluding the ellipsisCharacters, if they were added)
           */

        }, {
          key: "truncateText",
          value: function truncateText(max) {
            var _this3 = this;

            var addMoreListener = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            var text = this.getTruncatedText(max);
            var truncatedLength = text.length;
            var textTruncated = truncatedLength !== this.originalText.length;

            if (textTruncated && !this.showMoreLink) {
              text += this.ellipsisCharacters;
            }

            this.renderer.setProperty(this.innerElem, 'textContent', text);

            if (textTruncated && this.showMoreLink) {
              this.renderer.appendChild(this.innerElem, this.moreAnchor);
            } // Remove any existing more click listener:


            if (this.destroyMoreClickListener) {
              this.destroyMoreClickListener();
              this.destroyMoreClickListener = null;
            } // If the text has been truncated, add a more click listener:


            if (addMoreListener && textTruncated) {
              this.destroyMoreClickListener = this.renderer.listen(this.moreAnchor, 'click', function (e) {
                if (!e.target || !e.target.classList.contains('ngx-ellipsis-more')) {
                  return;
                }

                e.preventDefault();

                _this3.moreClickEmitter.emit(e);
              });
            }

            return truncatedLength;
          }
          /**
           * Display ellipsis in the inner div if the text would exceed the boundaries
           */

        }, {
          key: "applyEllipsis",
          value: function applyEllipsis() {
            var _this4 = this;

            // Remove the resize listener as changing the contained text would trigger events:
            this.removeResizeListeners$.next(); // Find the best length by trial and error:

            var maxLength = _EllipsisDirective.numericBinarySearch(this.originalText.length, function (curLength) {
              _this4.truncateText(curLength);

              return !_this4.isOverflowing;
            }); // Apply the best length:


            var finalLength = this.truncateText(maxLength, this.showMoreLink); // Re-attach the resize listener:

            this.addResizeListener(); // Emit change event:

            if (this.changeEmitter.observers.length > 0) {
              this.changeEmitter.emit(this.originalText.length === finalLength ? null : finalLength);
            }
          }
          /**
           * Whether the text is exceeding the element's boundaries or not
           */

        }, {
          key: "isOverflowing",
          get: function get() {
            // Enforce hidden overflow (required to compare client width/height with scroll width/height)
            var currentOverflow = this.elem.style.overflow;

            if (!currentOverflow || currentOverflow === 'visible') {
              this.elem.style.overflow = 'hidden';
            }

            var isOverflowing = this.elem.clientWidth < this.elem.scrollWidth - 1 || this.elem.clientHeight < this.elem.scrollHeight - 1; // Reset overflow to the original configuration:

            this.elem.style.overflow = currentOverflow;
            return isOverflowing;
          }
          /**
           * Whether the `ellipsisCharacters` are to be wrapped inside an anchor tag (if they are shown at all)
           */

        }, {
          key: "showMoreLink",
          get: function get() {
            return this.moreClickEmitter.observers.length > 0;
          }
        }], [{
          key: "numericBinarySearch",
          value: function numericBinarySearch(max, callback) {
            var low = 0;
            var high = max;
            var best = -1;
            var mid;

            while (low <= high) {
              // tslint:disable-next-line:no-bitwise
              mid = ~~((low + high) / 2);
              var result = callback(mid);

              if (!result) {
                high = mid - 1;
              } else {
                best = mid;
                low = mid + 1;
              }
            }

            return best;
          }
          /**
           * Convert ellipsis input to string
           * @param input string or number to be displayed as an ellipsis
           * @return      input converted to string
           */

        }, {
          key: "convertEllipsisInputToString",
          value: function convertEllipsisInputToString(input) {
            if (typeof input === 'undefined' || input === null) {
              return '';
            }

            return String(input);
          }
        }]);

        return _EllipsisDirective;
      }();

      _EllipsisDirective.ɵfac = function EllipsisDirective_Factory(t) {
        return new (t || _EllipsisDirective)(_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_2__.ElementRef), _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_2__.Renderer2), _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_2__.NgZone), _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_2__.PLATFORM_ID));
      };

      _EllipsisDirective.ɵdir = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineDirective"]({
        type: _EllipsisDirective,
        selectors: [["", "ellipsis", ""]],
        inputs: {
          ellipsisCharacters: ["ellipsis", "ellipsisCharacters"],
          ellipsisContent: ["ellipsis-content", "ellipsisContent"],
          ellipsisWordBoundaries: ["ellipsis-word-boundaries", "ellipsisWordBoundaries"],
          ellipsisSubstrFn: ["ellipsis-substr-fn", "ellipsisSubstrFn"],
          resizeDetectionStrategy: ["ellipsis-resize-detection", "resizeDetectionStrategy"]
        },
        outputs: {
          moreClickEmitter: "ellipsis-click-more",
          changeEmitter: "ellipsis-change"
        },
        exportAs: ["ellipsis"],
        features: [_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵNgOnChangesFeature"]]
      });
      /***/
    },

    /***/
    6815:
    /*!**********************************************************!*\
      !*** ./projects/ngx-ellipsis/src/lib/ellipsis.module.ts ***!
      \**********************************************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "EllipsisModule": function EllipsisModule() {
          return (
            /* binding */
            _EllipsisModule
          );
        }
        /* harmony export */

      });
      /* harmony import */


      var _directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! ./directives/ellipsis.directive */
      7039);
      /* harmony import */


      var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! @angular/core */
      7716);

      var _EllipsisModule = function _EllipsisModule() {
        _classCallCheck(this, _EllipsisModule);
      };

      _EllipsisModule.ɵfac = function EllipsisModule_Factory(t) {
        return new (t || _EllipsisModule)();
      };

      _EllipsisModule.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
        type: _EllipsisModule
      });
      _EllipsisModule.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
        imports: [[]]
      });

      (function () {
        (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](_EllipsisModule, {
          declarations: [_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__.EllipsisDirective],
          exports: [_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__.EllipsisDirective]
        });
      })();
      /***/

    },

    /***/
    4474:
    /*!*************************************************!*\
      !*** ./projects/ngx-ellipsis/src/public_api.ts ***!
      \*************************************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "EllipsisDirective": function EllipsisDirective() {
          return (
            /* reexport safe */
            _lib_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__.EllipsisDirective
          );
        },

        /* harmony export */
        "EllipsisModule": function EllipsisModule() {
          return (
            /* reexport safe */
            _lib_ellipsis_module__WEBPACK_IMPORTED_MODULE_1__.EllipsisModule
          );
        }
        /* harmony export */

      });
      /* harmony import */


      var _lib_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! ./lib/directives/ellipsis.directive */
      7039);
      /* harmony import */


      var _lib_ellipsis_module__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! ./lib/ellipsis.module */
      6815);
      /*
       * Public API Surface of ngx-ellipsis
       */

      /***/

    },

    /***/
    5041:
    /*!**********************************!*\
      !*** ./src/app/app.component.ts ***!
      \**********************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "AppComponent": function AppComponent() {
          return (
            /* binding */
            _AppComponent
          );
        }
        /* harmony export */

      });
      /* harmony import */


      var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! @angular/core */
      7716);
      /* harmony import */


      var _projects_ngx_ellipsis_src_lib_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! ../../projects/ngx-ellipsis/src/lib/directives/ellipsis.directive */
      7039);
      /* harmony import */


      var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
      /*! @angular/common */
      8583);

      function AppComponent_div_18_Template(rf, ctx) {
        if (rf & 1) {
          var _r4 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵgetCurrentView"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](1, "div", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵlistener"]("ellipsis-click-more", function AppComponent_div_18_Template_div_ellipsis_click_more_1_listener() {
            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵrestoreView"](_r4);

            var ctx_r3 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]();

            return ctx_r3.showEllipsis = false;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ellipsis-content", ctx_r0.longText);
        }
      }

      function AppComponent_ng_template_19_Template(rf, ctx) {
        if (rf & 1) {
          var _r6 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵgetCurrentView"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "div", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](2, "button", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵlistener"]("click", function AppComponent_ng_template_19_Template_button_click_2_listener() {
            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵrestoreView"](_r6);

            var ctx_r5 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]();

            return ctx_r5.showEllipsis = true;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](3, "Show less");

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          var ctx_r2 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtextInterpolate1"](" ", ctx_r2.longText, " ");
        }
      }

      var _AppComponent = function _AppComponent() {
        _classCallCheck(this, _AppComponent);

        this.title = 'ngx-ellipsis-demo';
        this.longText = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna \
              aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea\
              takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \
              eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo \
              dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
        this.number = 12.4564564564564564;
        this.showEllipsis = true;
      };

      _AppComponent.ɵfac = function AppComponent_Factory(t) {
        return new (t || _AppComponent)();
      };

      _AppComponent.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineComponent"]({
        type: _AppComponent,
        selectors: [["app-root"]],
        decls: 21,
        vars: 6,
        consts: [[1, "samples", "fixed"], ["ellipsis", "", 1, "sample"], ["ellipsis", "", 1, "sample", 3, "ellipsis-content"], ["ellipsis", "", 1, "sample", "small", 3, "ellipsis-content"], [1, "samples", "flex"], ["class", "samples fixed", 4, "ngIf", "ngIfElse"], ["noEllipsis", ""], ["ellipsis", "... Show more!", 1, "sample", 3, "ellipsis-content", "ellipsis-click-more"], [1, "longText"], [3, "click"]],
        template: function AppComponent_Template(rf, ctx) {
          if (rf & 1) {
            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "h1");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](1, "Welcome to ngx-ellipsis-demo!");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](2, "h2");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](3, "With fixed widths (drag bottom right corners to resize):");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](4, "div", 0);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](5, "div", 1);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](6, "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](7, "div", 2);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](8, "div", 3);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](9, "h2");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](10, "With percentage widths (resize window horizontally or boxes vertically to see changes in ellipsis):");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](11, "div", 4);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](12, "div", 1);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](13, "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](14, "div", 2);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](15, "div", 3);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](16, "h2");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](17, "With a \"more\" click listener:");

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplate"](18, AppComponent_div_18_Template, 2, 1, "div", 5);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplate"](19, AppComponent_ng_template_19_Template, 4, 1, "ng-template", null, 6, _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplateRefExtractor"]);
          }

          if (rf & 2) {
            var _r1 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵreference"](20);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](7);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ellipsis-content", ctx.longText);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ellipsis-content", ctx.number);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](6);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ellipsis-content", ctx.longText);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ellipsis-content", ctx.number);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](3);

            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ngIf", ctx.showEllipsis)("ngIfElse", _r1);
          }
        },
        directives: [_projects_ngx_ellipsis_src_lib_directives_ellipsis_directive__WEBPACK_IMPORTED_MODULE_0__.EllipsisDirective, _angular_common__WEBPACK_IMPORTED_MODULE_2__.NgIf],
        styles: [".samples[_ngcontent-%COMP%] {\r\n    display: flex;\r\n    flex-direction: row;\r\n    flex-wrap: wrap;\r\n}\r\n\r\n.sample[_ngcontent-%COMP%] {\r\n  width: 200px;\r\n  height: 200px;\r\n  border: dashed 2px gray;\r\n  margin: 30px;\r\n\r\n  overflow: hidden;\r\n}\r\n\r\n.sample[_ngcontent-%COMP%]:hover {\r\n  resize: both;\r\n}\r\n\r\n.small[_ngcontent-%COMP%] {\r\n  width: 100px;\r\n  height: 20px;\r\n}\r\n\r\n.samples.flex[_ngcontent-%COMP%]   .sample[_ngcontent-%COMP%], .samples.flex[_ngcontent-%COMP%]   .small[_ngcontent-%COMP%] {\r\n  flex: 1;\r\n  width: inherit;\r\n  height: 100px;\r\n}\r\n\r\n.samples.flex[_ngcontent-%COMP%]   .sample[_ngcontent-%COMP%]:hover, .samples.flex[_ngcontent-%COMP%]   .small[_ngcontent-%COMP%]:hover {\r\n  resize: vertical;\r\n}\r\n\r\n.longText[_ngcontent-%COMP%] {\r\n  width: 200px;\r\n  margin: 30px;\r\n}\r\n\r\n.ngx-ellipsis-more[_ngcontent-%COMP%] {\r\n  padding-left: 3px;\r\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5jb21wb25lbnQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksYUFBYTtJQUNiLG1CQUFtQjtJQUNuQixlQUFlO0FBQ25COztBQUVBO0VBQ0UsWUFBWTtFQUNaLGFBQWE7RUFDYix1QkFBdUI7RUFDdkIsWUFBWTs7RUFFWixnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxZQUFZO0VBQ1osWUFBWTtBQUNkOztBQUVBO0VBQ0UsT0FBTztFQUNQLGNBQWM7RUFDZCxhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osWUFBWTtBQUNkOztBQUVBO0VBQ0UsaUJBQWlCO0FBQ25CIiwiZmlsZSI6ImFwcC5jb21wb25lbnQuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnNhbXBsZXMge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XHJcbiAgICBmbGV4LXdyYXA6IHdyYXA7XHJcbn1cclxuXHJcbi5zYW1wbGUge1xyXG4gIHdpZHRoOiAyMDBweDtcclxuICBoZWlnaHQ6IDIwMHB4O1xyXG4gIGJvcmRlcjogZGFzaGVkIDJweCBncmF5O1xyXG4gIG1hcmdpbjogMzBweDtcclxuXHJcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcclxufVxyXG5cclxuLnNhbXBsZTpob3ZlciB7XHJcbiAgcmVzaXplOiBib3RoO1xyXG59XHJcblxyXG4uc21hbGwge1xyXG4gIHdpZHRoOiAxMDBweDtcclxuICBoZWlnaHQ6IDIwcHg7XHJcbn1cclxuXHJcbi5zYW1wbGVzLmZsZXggLnNhbXBsZSwgLnNhbXBsZXMuZmxleCAuc21hbGwge1xyXG4gIGZsZXg6IDE7XHJcbiAgd2lkdGg6IGluaGVyaXQ7XHJcbiAgaGVpZ2h0OiAxMDBweDtcclxufVxyXG5cclxuLnNhbXBsZXMuZmxleCAuc2FtcGxlOmhvdmVyLCAuc2FtcGxlcy5mbGV4IC5zbWFsbDpob3ZlciB7XHJcbiAgcmVzaXplOiB2ZXJ0aWNhbDtcclxufVxyXG5cclxuLmxvbmdUZXh0IHtcclxuICB3aWR0aDogMjAwcHg7XHJcbiAgbWFyZ2luOiAzMHB4O1xyXG59XHJcblxyXG4ubmd4LWVsbGlwc2lzLW1vcmUge1xyXG4gIHBhZGRpbmctbGVmdDogM3B4O1xyXG59XHJcbiJdfQ== */"]
      });
      /***/
    },

    /***/
    6747:
    /*!*******************************!*\
      !*** ./src/app/app.module.ts ***!
      \*******************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "AppModule": function AppModule() {
          return (
            /* binding */
            _AppModule
          );
        }
        /* harmony export */

      });
      /* harmony import */


      var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
      /*! @angular/platform-browser */
      9075);
      /* harmony import */


      var _app_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! ./app.component */
      5041);
      /* harmony import */


      var _projects_ngx_ellipsis_src_public_api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! ../../projects/ngx-ellipsis/src/public_api */
      4474);
      /* harmony import */


      var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
      /*! @angular/core */
      7716);

      var _AppModule = function _AppModule() {
        _classCallCheck(this, _AppModule);
      };

      _AppModule.ɵfac = function AppModule_Factory(t) {
        return new (t || _AppModule)();
      };

      _AppModule.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineNgModule"]({
        type: _AppModule,
        bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent]
      });
      _AppModule.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjector"]({
        providers: [],
        imports: [[_angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__.BrowserModule, _projects_ngx_ellipsis_src_public_api__WEBPACK_IMPORTED_MODULE_1__.EllipsisModule]]
      });

      (function () {
        (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵsetNgModuleScope"](_AppModule, {
          declarations: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent],
          imports: [_angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__.BrowserModule, _projects_ngx_ellipsis_src_public_api__WEBPACK_IMPORTED_MODULE_1__.EllipsisModule]
        });
      })();
      /***/

    },

    /***/
    2340:
    /*!*****************************************!*\
      !*** ./src/environments/environment.ts ***!
      \*****************************************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony export */


      __webpack_require__.d(__webpack_exports__, {
        /* harmony export */
        "environment": function environment() {
          return (
            /* binding */
            _environment
          );
        }
        /* harmony export */

      }); // This file can be replaced during build by using the `fileReplacements` array.
      // `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
      // The list of file replacements can be found in `angular.json`.


      var _environment = {
        production: false
      };
      /*
       * For easier debugging in development mode, you can import the following file
       * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
       *
       * This import should be commented out in production mode because it will have a negative impact
       * on performance if an error is thrown.
       */
      // import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

      /***/
    },

    /***/
    4431:
    /*!*********************!*\
      !*** ./src/main.ts ***!
      \*********************/

    /***/
    function _(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
      "use strict";

      __webpack_require__.r(__webpack_exports__);
      /* harmony import */


      var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
      /*! @angular/platform-browser */
      9075);
      /* harmony import */


      var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
      /*! @angular/core */
      7716);
      /* harmony import */


      var _app_app_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
      /*! ./app/app.module */
      6747);
      /* harmony import */


      var _environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
      /*! ./environments/environment */
      2340);

      if (_environments_environment__WEBPACK_IMPORTED_MODULE_1__.environment.production) {
        (0, _angular_core__WEBPACK_IMPORTED_MODULE_2__.enableProdMode)();
      }

      _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__.platformBrowser().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_0__.AppModule)["catch"](function (err) {
        return console.error(err);
      });
      /***/

    }
  },
  /******/
  function (__webpack_require__) {
    // webpackRuntimeModules

    /******/
    "use strict";
    /******/

    /******/

    var __webpack_exec__ = function __webpack_exec__(moduleId) {
      return __webpack_require__(__webpack_require__.s = moduleId);
    };
    /******/


    __webpack_require__.O(0, ["vendor"], function () {
      return __webpack_exec__(4431);
    });
    /******/


    var __webpack_exports__ = __webpack_require__.O();
    /******/

  }]);
})();
//# sourceMappingURL=main-es5.js.map
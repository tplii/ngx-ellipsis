(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@juggle/resize-observer'), require('rxjs/operators'), require('rxjs'), require('@angular/common')) :
    typeof define === 'function' && define.amd ? define('ngx-ellipsis-test', ['exports', '@angular/core', '@juggle/resize-observer', 'rxjs/operators', 'rxjs', '@angular/common'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['ngx-ellipsis-test'] = {}, global.ng.core, global.ResizeObserver, global.rxjs.operators, global.rxjs, global.ng.common));
}(this, (function (exports, core, resizeObserver, operators, rxjs, common) { 'use strict';

    var ResizeObserver = resizeObserver.ResizeObserver;
    /**
     * Directive to truncate the contained text, if it exceeds the element's boundaries
     * and append characters (configurable, default '...') if so.
     */
    var EllipsisDirective = /** @class */ (function () {
        /**
         * The directive's constructor
         */
        function EllipsisDirective(elementRef, renderer, ngZone, platformId) {
            this.elementRef = elementRef;
            this.renderer = renderer;
            this.ngZone = ngZone;
            this.platformId = platformId;
            /**
             * Subject triggered when resize listeners should be removed
             */
            this.removeResizeListeners$ = new rxjs.Subject();
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
            this.moreClickEmitter = new core.EventEmitter();
            /**
             * The ellipsis-change html attribute
             * This emits after which index the text has been truncated.
             * If it hasn't been truncated, null is emitted.
             */
            this.changeEmitter = new core.EventEmitter();
        }
        /**
         * Utility method to quickly find the largest number for
         * which `callback(number)` still returns true.
         * @param  max      Highest possible number
         * @param  callback Should return true as long as the passed number is valid
         * @return          Largest possible number
         */
        EllipsisDirective.numericBinarySearch = function (max, callback) {
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
                }
                else {
                    best = mid;
                    low = mid + 1;
                }
            }
            return best;
        };
        /**
         * Convert ellipsis input to string
         * @param input string or number to be displayed as an ellipsis
         * @return      input converted to string
         */
        EllipsisDirective.convertEllipsisInputToString = function (input) {
            if (typeof input === 'undefined' || input === null) {
                return '';
            }
            return String(input);
        };
        /**
         * Angular's init view life cycle hook.
         * Initializes the element for displaying the ellipsis.
         */
        EllipsisDirective.prototype.ngAfterViewInit = function () {
            if (!common.isPlatformBrowser(this.platformId)) {
                // in angular universal we don't have access to the ugly
                // DOM manipulation properties we sadly need to access here,
                // so wait until we're in the browser:
                return;
            }
            // Prefer native ResizeObserver over ponyfill, if available:
            if (window.ResizeObserver != null) {
                ResizeObserver = window.ResizeObserver;
            }
            // let the ellipsis characters default to '...':
            if (this.ellipsisCharacters === '') {
                this.ellipsisCharacters = '...';
            }
            // create more anchor element:
            this.moreAnchor = this.renderer.createElement('a');
            this.moreAnchor.className = 'ngx-ellipsis-more';
            this.moreAnchor.href = '#';
            this.moreAnchor.textContent = this.ellipsisCharacters;
            // perform regex replace on word boundaries:
            if (!this.ellipsisWordBoundaries) {
                this.ellipsisWordBoundaries = '';
            }
            this.ellipsisWordBoundaries = '[' + this.ellipsisWordBoundaries.replace(/\\n/, '\n').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ']';
            if (!this.ellipsisSubstrFn) {
                this.ellipsisSubstrFn = function (str, from, length) {
                    return str.substr(from, length);
                };
            }
            // store the original contents of the element:
            this.elem = this.elementRef.nativeElement;
            if (typeof this.ellipsisContent !== 'undefined' && this.ellipsisContent !== null) {
                this.originalText = EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent);
            }
            else if (!this.originalText) {
                this.originalText = this.elem.textContent.trim();
            }
            // add a wrapper div (required for resize events to work properly):
            this.renderer.setProperty(this.elem, 'innerHTML', '');
            this.innerElem = this.renderer.createElement('p');
            this.renderer.addClass(this.innerElem, 'ngx-ellipsis-inner');
            var text = this.renderer.createText(this.originalText);
            this.renderer.appendChild(this.innerElem, text);
            this.renderer.appendChild(this.elem, this.innerElem);
            this.previousDimensions = {
                width: this.elem.clientWidth,
                height: this.elem.clientHeight
            };
            // start listening for resize events:
            this.addResizeListener(true);
        };
        /**
         * Angular's change life cycle hook.
         * Change original text (if the ellipsis-content has been passed)
         * and re-render
         */
        EllipsisDirective.prototype.ngOnChanges = function (changes) {
            var moreAnchorRequiresChange = this.moreAnchor && changes['ellipsisCharacters'];
            if (moreAnchorRequiresChange) {
                this.moreAnchor.textContent = this.ellipsisCharacters;
            }
            if (this.elem
                && typeof this.ellipsisContent !== 'undefined'
                && (this.originalText !== EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent)
                    || moreAnchorRequiresChange)) {
                this.originalText = EllipsisDirective.convertEllipsisInputToString(this.ellipsisContent);
                this.applyEllipsis();
            }
        };
        /**
         * Angular's destroy life cycle hook.
         * Remove event listeners
         */
        EllipsisDirective.prototype.ngOnDestroy = function () {
            // In angular universal we don't have any listeners hooked up (all requiring ugly DOM manipulation methods),
            // so we only need to remove them, if we're inside the browser:
            if (common.isPlatformBrowser(this.platformId)) {
                this.removeAllListeners();
            }
        };
        /**
         * remove all resize listeners
         */
        EllipsisDirective.prototype.removeAllListeners = function () {
            if (this.destroyMoreClickListener) {
                this.destroyMoreClickListener();
            }
            this.removeResizeListeners$.next();
            this.removeResizeListeners$.complete();
        };
        /**
         * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
         * The type of the listener (window/element) depends on the resizeDetectionStrategy.
         * @param triggerNow=false if true, the ellipsis is applied immediately
         */
        EllipsisDirective.prototype.addResizeListener = function (triggerNow) {
            if (triggerNow === void 0) { triggerNow = false; }
            if (typeof (this.resizeDetectionStrategy) === 'undefined') {
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
                    if (typeof (console) !== 'undefined') {
                        console.warn("No such ellipsis-resize-detection strategy: '" + this.resizeDetectionStrategy + "'. Using 'resize-observer' instead");
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
        };
        /**
         * Set up an event listener to call applyEllipsis() whenever the window gets resized.
         */
        EllipsisDirective.prototype.addWindowResizeListener = function () {
            var _this = this;
            var removeWindowResizeListener = this.renderer.listen('window', 'resize', function () {
                _this.ngZone.run(function () {
                    _this.applyEllipsis();
                });
            });
            this.removeResizeListeners$.pipe(operators.take(1)).subscribe(function () { return removeWindowResizeListener(); });
        };
        /**
         * Set up an event listener to call applyEllipsis() whenever the element
         * has been resized.
         */
        EllipsisDirective.prototype.addElementResizeListener = function () {
            var _this = this;
            var resizeObserver = new ResizeObserver(function () {
                window.requestAnimationFrame(function () {
                    if (_this.previousDimensions.width !== _this.elem.clientWidth || _this.previousDimensions.height !== _this.elem.clientHeight) {
                        _this.ngZone.run(function () {
                            _this.applyEllipsis();
                        });
                        _this.previousDimensions.width = _this.elem.clientWidth;
                        _this.previousDimensions.height = _this.elem.clientHeight;
                    }
                });
            });
            resizeObserver.observe(this.elem);
            this.removeResizeListeners$.pipe(operators.take(1)).subscribe(function () { return resizeObserver.disconnect(); });
        };
        /**
         * Get the original text's truncated version. If the text really needed to
         * be truncated, this.ellipsisCharacters will be appended.
         * @param max the maximum length the text may have
         * @return string       the truncated string
         */
        EllipsisDirective.prototype.getTruncatedText = function (max) {
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
        };
        /**
         * Set the truncated text to be displayed in the inner div
         * @param max the maximum length the text may have
         * @param addMoreListener=false listen for click on the ellipsisCharacters anchor tag if the text has been truncated
         * @returns length of remaining text (excluding the ellipsisCharacters, if they were added)
         */
        EllipsisDirective.prototype.truncateText = function (max, addMoreListener) {
            var _this = this;
            if (addMoreListener === void 0) { addMoreListener = false; }
            var text = this.getTruncatedText(max);
            var truncatedLength = text.length;
            var textTruncated = (truncatedLength !== this.originalText.length);
            if (textTruncated && !this.showMoreLink) {
                text += this.ellipsisCharacters;
            }
            this.renderer.setProperty(this.innerElem, 'textContent', text);
            if (textTruncated && this.showMoreLink) {
                this.renderer.appendChild(this.innerElem, this.moreAnchor);
            }
            // Remove any existing more click listener:
            if (this.destroyMoreClickListener) {
                this.destroyMoreClickListener();
                this.destroyMoreClickListener = null;
            }
            // If the text has been truncated, add a more click listener:
            if (addMoreListener && textTruncated) {
                this.destroyMoreClickListener = this.renderer.listen(this.moreAnchor, 'click', function (e) {
                    if (!e.target || !e.target.classList.contains('ngx-ellipsis-more')) {
                        return;
                    }
                    e.preventDefault();
                    _this.moreClickEmitter.emit(e);
                });
            }
            return truncatedLength;
        };
        /**
         * Display ellipsis in the inner div if the text would exceed the boundaries
         */
        EllipsisDirective.prototype.applyEllipsis = function () {
            var _this = this;
            // Remove the resize listener as changing the contained text would trigger events:
            this.removeResizeListeners$.next();
            // Find the best length by trial and error:
            var maxLength = EllipsisDirective.numericBinarySearch(this.originalText.length, function (curLength) {
                _this.truncateText(curLength);
                return !_this.isOverflowing;
            });
            // Apply the best length:
            var finalLength = this.truncateText(maxLength, this.showMoreLink);
            // Re-attach the resize listener:
            this.addResizeListener();
            // Emit change event:
            if (this.changeEmitter.observers.length > 0) {
                this.changeEmitter.emit((this.originalText.length === finalLength) ? null : finalLength);
            }
        };
        Object.defineProperty(EllipsisDirective.prototype, "isOverflowing", {
            /**
             * Whether the text is exceeding the element's boundaries or not
             */
            get: function () {
                // Enforce hidden overflow (required to compare client width/height with scroll width/height)
                var currentOverflow = this.elem.style.overflow;
                if (!currentOverflow || currentOverflow === 'visible') {
                    this.elem.style.overflow = 'hidden';
                }
                var isOverflowing = this.elem.clientWidth < this.elem.scrollWidth - 1 || this.elem.clientHeight < this.elem.scrollHeight - 1;
                // Reset overflow to the original configuration:
                this.elem.style.overflow = currentOverflow;
                return isOverflowing;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EllipsisDirective.prototype, "showMoreLink", {
            /**
             * Whether the `ellipsisCharacters` are to be wrapped inside an anchor tag (if they are shown at all)
             */
            get: function () {
                return (this.moreClickEmitter.observers.length > 0);
            },
            enumerable: false,
            configurable: true
        });
        return EllipsisDirective;
    }());
    EllipsisDirective.decorators = [
        { type: core.Directive, args: [{
                    selector: '[ellipsis]',
                    exportAs: 'ellipsis'
                },] }
    ];
    EllipsisDirective.ctorParameters = function () { return [
        { type: core.ElementRef },
        { type: core.Renderer2 },
        { type: core.NgZone },
        { type: Object, decorators: [{ type: core.Inject, args: [core.PLATFORM_ID,] }] }
    ]; };
    EllipsisDirective.propDecorators = {
        ellipsisCharacters: [{ type: core.Input, args: ['ellipsis',] }],
        ellipsisContent: [{ type: core.Input, args: ['ellipsis-content',] }],
        ellipsisWordBoundaries: [{ type: core.Input, args: ['ellipsis-word-boundaries',] }],
        ellipsisSubstrFn: [{ type: core.Input, args: ['ellipsis-substr-fn',] }],
        resizeDetectionStrategy: [{ type: core.Input, args: ['ellipsis-resize-detection',] }],
        moreClickEmitter: [{ type: core.Output, args: ['ellipsis-click-more',] }],
        changeEmitter: [{ type: core.Output, args: ['ellipsis-change',] }]
    };

    var EllipsisModule = /** @class */ (function () {
        function EllipsisModule() {
        }
        return EllipsisModule;
    }());
    EllipsisModule.decorators = [
        { type: core.NgModule, args: [{
                    imports: [],
                    declarations: [EllipsisDirective],
                    exports: [EllipsisDirective]
                },] }
    ];

    /*
     * Public API Surface of ngx-ellipsis
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.EllipsisDirective = EllipsisDirective;
    exports.EllipsisModule = EllipsisModule;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngx-ellipsis-test.umd.js.map

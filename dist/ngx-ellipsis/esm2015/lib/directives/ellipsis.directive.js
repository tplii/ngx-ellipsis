import { Directive, ElementRef, Renderer2, Input, Output, EventEmitter, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { ResizeObserver as ResizeObserverPonyfill } from '@juggle/resize-observer';
import { take } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
let ResizeObserver = ResizeObserverPonyfill;
/**
 * Directive to truncate the contained text, if it exceeds the element's boundaries
 * and append characters (configurable, default '...') if so.
 */
export class EllipsisDirective {
    /**
     * The directive's constructor
     */
    constructor(elementRef, renderer, ngZone, platformId) {
        this.elementRef = elementRef;
        this.renderer = renderer;
        this.ngZone = ngZone;
        this.platformId = platformId;
        /**
         * Subject triggered when resize listeners should be removed
         */
        this.removeResizeListeners$ = new Subject();
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
        this.moreClickEmitter = new EventEmitter();
        /**
         * The ellipsis-change html attribute
         * This emits after which index the text has been truncated.
         * If it hasn't been truncated, null is emitted.
         */
        this.changeEmitter = new EventEmitter();
    }
    /**
     * Utility method to quickly find the largest number for
     * which `callback(number)` still returns true.
     * @param  max      Highest possible number
     * @param  callback Should return true as long as the passed number is valid
     * @return          Largest possible number
     */
    static numericBinarySearch(max, callback) {
        let low = 0;
        let high = max;
        let best = -1;
        let mid;
        while (low <= high) {
            // tslint:disable-next-line:no-bitwise
            mid = ~~((low + high) / 2);
            const result = callback(mid);
            if (!result) {
                high = mid - 1;
            }
            else {
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
    static convertEllipsisInputToString(input) {
        if (typeof input === 'undefined' || input === null) {
            return '';
        }
        return String(input);
    }
    /**
     * Angular's init view life cycle hook.
     * Initializes the element for displaying the ellipsis.
     */
    ngAfterViewInit() {
        if (!isPlatformBrowser(this.platformId)) {
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
            this.ellipsisSubstrFn = (str, from, length) => {
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
        const text = this.renderer.createText(this.originalText);
        this.renderer.appendChild(this.innerElem, text);
        this.renderer.appendChild(this.elem, this.innerElem);
        this.previousDimensions = {
            width: this.elem.clientWidth,
            height: this.elem.clientHeight
        };
        // start listening for resize events:
        this.addResizeListener(true);
    }
    /**
     * Angular's change life cycle hook.
     * Change original text (if the ellipsis-content has been passed)
     * and re-render
     */
    ngOnChanges(changes) {
        const moreAnchorRequiresChange = this.moreAnchor && changes['ellipsisCharacters'];
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
    }
    /**
     * Angular's destroy life cycle hook.
     * Remove event listeners
     */
    ngOnDestroy() {
        // In angular universal we don't have any listeners hooked up (all requiring ugly DOM manipulation methods),
        // so we only need to remove them, if we're inside the browser:
        if (isPlatformBrowser(this.platformId)) {
            this.removeAllListeners();
        }
    }
    /**
     * remove all resize listeners
     */
    removeAllListeners() {
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
    addResizeListener(triggerNow = false) {
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
                    console.warn(`No such ellipsis-resize-detection strategy: '${this.resizeDetectionStrategy}'. Using 'resize-observer' instead`);
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
    addWindowResizeListener() {
        const removeWindowResizeListener = this.renderer.listen('window', 'resize', () => {
            this.ngZone.run(() => {
                this.applyEllipsis();
            });
        });
        this.removeResizeListeners$.pipe(take(1)).subscribe(() => removeWindowResizeListener());
    }
    /**
     * Set up an event listener to call applyEllipsis() whenever the element
     * has been resized.
     */
    addElementResizeListener() {
        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                if (this.previousDimensions.width !== this.elem.clientWidth || this.previousDimensions.height !== this.elem.clientHeight) {
                    this.ngZone.run(() => {
                        this.applyEllipsis();
                    });
                    this.previousDimensions.width = this.elem.clientWidth;
                    this.previousDimensions.height = this.elem.clientHeight;
                }
            });
        });
        resizeObserver.observe(this.elem);
        this.removeResizeListeners$.pipe(take(1)).subscribe(() => resizeObserver.disconnect());
    }
    /**
     * Get the original text's truncated version. If the text really needed to
     * be truncated, this.ellipsisCharacters will be appended.
     * @param max the maximum length the text may have
     * @return string       the truncated string
     */
    getTruncatedText(max) {
        if (!this.originalText || this.originalText.length <= max) {
            return this.originalText;
        }
        const truncatedText = this.ellipsisSubstrFn(this.originalText, 0, max);
        if (this.ellipsisWordBoundaries === '[]' || this.originalText.charAt(max).match(this.ellipsisWordBoundaries)) {
            return truncatedText;
        }
        let i = max - 1;
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
    truncateText(max, addMoreListener = false) {
        let text = this.getTruncatedText(max);
        const truncatedLength = text.length;
        const textTruncated = (truncatedLength !== this.originalText.length);
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
            this.destroyMoreClickListener = this.renderer.listen(this.moreAnchor, 'click', (e) => {
                if (!e.target || !e.target.classList.contains('ngx-ellipsis-more')) {
                    return;
                }
                e.preventDefault();
                this.moreClickEmitter.emit(e);
            });
        }
        return truncatedLength;
    }
    /**
     * Display ellipsis in the inner div if the text would exceed the boundaries
     */
    applyEllipsis() {
        // Remove the resize listener as changing the contained text would trigger events:
        this.removeResizeListeners$.next();
        // Find the best length by trial and error:
        const maxLength = EllipsisDirective.numericBinarySearch(this.originalText.length, curLength => {
            this.truncateText(curLength);
            return !this.isOverflowing;
        });
        // Apply the best length:
        const finalLength = this.truncateText(maxLength, this.showMoreLink);
        // Re-attach the resize listener:
        this.addResizeListener();
        // Emit change event:
        if (this.changeEmitter.observers.length > 0) {
            this.changeEmitter.emit((this.originalText.length === finalLength) ? null : finalLength);
        }
    }
    /**
     * Whether the text is exceeding the element's boundaries or not
     */
    get isOverflowing() {
        // Enforce hidden overflow (required to compare client width/height with scroll width/height)
        const currentOverflow = this.elem.style.overflow;
        if (!currentOverflow || currentOverflow === 'visible') {
            this.elem.style.overflow = 'hidden';
        }
        const isOverflowing = this.elem.clientWidth < this.elem.scrollWidth - 1 || this.elem.clientHeight < this.elem.scrollHeight - 1;
        // Reset overflow to the original configuration:
        this.elem.style.overflow = currentOverflow;
        return isOverflowing;
    }
    /**
     * Whether the `ellipsisCharacters` are to be wrapped inside an anchor tag (if they are shown at all)
     */
    get showMoreLink() {
        return (this.moreClickEmitter.observers.length > 0);
    }
}
EllipsisDirective.decorators = [
    { type: Directive, args: [{
                selector: '[ellipsis]',
                exportAs: 'ellipsis'
            },] }
];
EllipsisDirective.ctorParameters = () => [
    { type: ElementRef },
    { type: Renderer2 },
    { type: NgZone },
    { type: Object, decorators: [{ type: Inject, args: [PLATFORM_ID,] }] }
];
EllipsisDirective.propDecorators = {
    ellipsisCharacters: [{ type: Input, args: ['ellipsis',] }],
    ellipsisContent: [{ type: Input, args: ['ellipsis-content',] }],
    ellipsisWordBoundaries: [{ type: Input, args: ['ellipsis-word-boundaries',] }],
    ellipsisSubstrFn: [{ type: Input, args: ['ellipsis-substr-fn',] }],
    resizeDetectionStrategy: [{ type: Input, args: ['ellipsis-resize-detection',] }],
    moreClickEmitter: [{ type: Output, args: ['ellipsis-click-more',] }],
    changeEmitter: [{ type: Output, args: ['ellipsis-change',] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxsaXBzaXMuZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LWVsbGlwc2lzL3NyYy9saWIvZGlyZWN0aXZlcy9lbGxpcHNpcy5kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCxVQUFVLEVBQ1YsU0FBUyxFQUNULEtBQUssRUFDTCxNQUFNLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFJTixNQUFNLEVBQ04sV0FBVyxFQUVaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxjQUFjLElBQUksc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMvQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUdwRCxJQUFJLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQztBQUU1Qzs7O0dBR0c7QUFLSCxNQUFNLE9BQU8saUJBQWlCO0lBdUk1Qjs7T0FFRztJQUNILFlBQ1UsVUFBbUMsRUFDbkMsUUFBbUIsRUFDbkIsTUFBYyxFQUNPLFVBQWtCO1FBSHZDLGVBQVUsR0FBVixVQUFVLENBQXlCO1FBQ25DLGFBQVEsR0FBUixRQUFRLENBQVc7UUFDbkIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNPLGVBQVUsR0FBVixVQUFVLENBQVE7UUFwSGpEOztXQUVHO1FBQ0ssMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQWdCckQ7Ozs7V0FJRztRQUN3QixvQkFBZSxHQUFvQixJQUFJLENBQUM7UUE0Qm5FOzs7OztXQUtHO1FBQzRCLHFCQUFnQixHQUE2QixJQUFJLFlBQVksRUFBRSxDQUFDO1FBRy9GOzs7O1dBSUc7UUFDd0Isa0JBQWEsR0FBeUIsSUFBSSxZ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QUUsWUFBWTtnQkFDdEIsUUFBUSxFQUFFLFVBQVU7YUFDckI7OztZQTVCQyxVQUFVO1lBQ1YsU0FBUztZQUlULE1BQU07WUFzS3FDLE1BQU0sdUJBQTlDLE1BQU0sU0FBQyxXQUFXOzs7aUNBbkdwQixLQUFLLFNBQUMsVUFBVTs4QkFPaEIsS0FBSyxTQUFDLGtCQUFrQjtxQ0FReEIsS0FBSyxTQUFDLDBCQUEwQjsrQkFPaEMsS0FBSyxTQUFDLG9CQUFvQjtzQ0FVMUIsS0FBSyxTQUFDLDJCQUEyQjsrQkFTakMsTUFBTSxTQUFDLHFCQUFxQjs0QkFRNUIsTUFBTSxTQUFDLGlCQUFpQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgRGlyZWN0aXZlLFxyXG4gIEVsZW1lbnRSZWYsXHJcbiAgUmVuZGVyZXIyLFxyXG4gIElucHV0LFxyXG4gIE91dHB1dCxcclxuICBFdmVudEVtaXR0ZXIsXHJcbiAgTmdab25lLFxyXG4gIE9uQ2hhbmdlcyxcclxuICBBZnRlclZpZXdJbml0LFxyXG4gIE9uRGVzdHJveSxcclxuICBJbmplY3QsXHJcbiAgUExBVEZPUk1fSUQsXHJcbiAgU2ltcGxlQ2hhbmdlc1xyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBSZXNpemVPYnNlcnZlciBhcyBSZXNpemVPYnNlcnZlclBvbnlmaWxsIH0gZnJvbSAnQGp1Z2dsZS9yZXNpemUtb2JzZXJ2ZXInO1xyXG5pbXBvcnQgeyB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xyXG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XHJcbmltcG9ydCB7IGlzUGxhdGZvcm1Ccm93c2VyIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcclxuXHJcblxyXG5sZXQgUmVzaXplT2JzZXJ2ZXIgPSBSZXNpemVPYnNlcnZlclBvbnlmaWxsO1xyXG5cclxuLyoqXHJcbiAqIERpcmVjdGl2ZSB0byB0cnVuY2F0ZSB0aGUgY29udGFpbmVkIHRleHQsIGlmIGl0IGV4Y2VlZHMgdGhlIGVsZW1lbnQncyBib3VuZGFyaWVzXHJcbiAqIGFuZCBhcHBlbmQgY2hhcmFjdGVycyAoY29uZmlndXJhYmxlLCBkZWZhdWx0ICcuLi4nKSBpZiBzby5cclxuICovXHJcbkBEaXJlY3RpdmUoe1xyXG4gIHNlbGVjdG9yOiAnW2VsbGlwc2lzXScsXHJcbiAgZXhwb3J0QXM6ICdlbGxpcHNpcydcclxufSlcclxuZXhwb3J0IGNsYXNzIEVsbGlwc2lzRGlyZWN0aXZlIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIEFmdGVyVmlld0luaXQge1xyXG4gIC8qKlxyXG4gICAqIFRoZSBvcmlnaW5hbCB0ZXh0IChub3QgdHJ1bmNhdGVkIHlldClcclxuICAgKi9cclxuICBwcml2YXRlIG9yaWdpbmFsVGV4dDogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgcmVmZXJlbmNlZCBlbGVtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBlbGVtOiBhbnk7XHJcblxyXG4gIC8qKlxyXG4gICAqIElubmVyIGRpdiBlbGVtZW50ICh3aWxsIGJlIGF1dG8tY3JlYXRlZClcclxuICAgKi9cclxuICBwcml2YXRlIGlubmVyRWxlbTogYW55O1xyXG5cclxuICAvKipcclxuICAgKiBBbmNob3IgdGFnIHdyYXBwaW5nIHRoZSBgZWxsaXBzaXNDaGFyYWN0ZXJzYFxyXG4gICAqL1xyXG4gIHByaXZhdGUgbW9yZUFuY2hvcjogSFRNTEFuY2hvckVsZW1lbnQ7XHJcblxyXG4gIHByaXZhdGUgcHJldmlvdXNEaW1lbnNpb25zOiB7XHJcbiAgICB3aWR0aDogbnVtYmVyLFxyXG4gICAgaGVpZ2h0OiBudW1iZXJcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBTdWJqZWN0IHRyaWdnZXJlZCB3aGVuIHJlc2l6ZSBsaXN0ZW5lcnMgc2hvdWxkIGJlIHJlbW92ZWRcclxuICAgKi9cclxuICBwcml2YXRlIHJlbW92ZVJlc2l6ZUxpc3RlbmVycyQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xyXG5cclxuICAvKipcclxuICAgKiBSZW1vdmUgZnVuY3Rpb24gZm9yIHRoZSBjdXJyZW50bHkgcmVnaXN0ZXJlZCBjbGljayBsaXN0ZW5lclxyXG4gICAqIG9uIHRoZSBsaW5rIGB0aGlzLmVsbGlwc2lzQ2hhcmFjdGVyc2AgYXJlIHdyYXBwZWQgaW4uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBkZXN0cm95TW9yZUNsaWNrTGlzdGVuZXI6ICgpID0+IHZvaWQ7XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBlbGxpcHNpcyBodG1sIGF0dHJpYnV0ZVxyXG4gICAqIElmIGFueXRoaW5nIGlzIHBhc3NlZCwgdGhpcyB3aWxsIGJlIHVzZWQgYXMgYSBzdHJpbmcgdG8gYXBwZW5kIHRvXHJcbiAgICogdGhlIHRydW5jYXRlZCBjb250ZW50cy5cclxuICAgKiBFbHNlICcuLi4nIHdpbGwgYmUgYXBwZW5kZWQuXHJcbiAgICovXHJcbiAgQElucHV0KCdlbGxpcHNpcycpIGVsbGlwc2lzQ2hhcmFjdGVyczogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgZWxsaXBzaXMtY29udGVudCBodG1sIGF0dHJpYnV0ZVxyXG4gICAqIElmIHBhc3NlZCB0aGlzIGlzIHVzZWQgYXMgY29udGVudCwgZWxzZSBjb250ZW50c1xyXG4gICAqIGFyZSBmZXRjaGVkIGZyb20gdGV4dENvbnRlbnRcclxuICAgKi9cclxuICBASW5wdXQoJ2VsbGlwc2lzLWNvbnRlbnQnKSBlbGxpcHNpc0NvbnRlbnQ6IHN0cmluZyB8IG51bWJlciA9IG51bGw7XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBlbGxpcHNpcy13b3JkLWJvdW5kYXJpZXMgaHRtbCBhdHRyaWJ1dGVcclxuICAgKiBJZiBhbnl0aGluZyBpcyBwYXNzZWQsIGVhY2ggY2hhcmFjdGVyIHdpbGwgYmUgaW50ZXJwcmV0ZWRcclxuICAgKiBhcyBhIHdvcmQgYm91bmRhcnkgYXQgd2hpY2ggdGhlIHRleHQgbWF5IGJlIHRydW5jYXRlZC5cclxuICAgKiBFbHNlIHRoZSB0ZXh0IG1heSBiZSB0cnVuY2F0ZWQgYXQgYW55IGNoYXJhY3Rlci5cclxuICAgKi9cclxuICBASW5wdXQoJ2VsbGlwc2lzLXdvcmQtYm91bmRhcmllcycpIGVsbGlwc2lzV29yZEJvdW5kYXJpZXM6IHN0cmluZztcclxuXHJcbiAgLyoqXHJcbiAgICogRnVuY3Rpb24gdG8gdXNlIGZvciBzdHJpbmcgc3BsaXR0aW5nLiBEZWZhdWx0cyB0byB0aGUgbmF0aXZlIGBTdHJpbmcjc3Vic3RyYC5cclxuICAgKiAoVGhpcyBtYXkgZm9yIGV4YW1wbGUgYmUgdXNlZCB0byBhdm9pZCBzcGxpdHRpbmcgc3Vycm9nYXRlIHBhaXJzLSB1c2VkIGJ5IHNvbWUgZW1vamlzIC1cclxuICAgKiBieSBwcm92aWRpbmcgYSBsaWIgc3VjaCBhcyBydW5lcy4pXHJcbiAgICovXHJcbiAgQElucHV0KCdlbGxpcHNpcy1zdWJzdHItZm4nKSBlbGxpcHNpc1N1YnN0ckZuOiAgKHN0cjogc3RyaW5nLCBmcm9tOiBudW1iZXIsIGxlbmd0aD86IG51bWJlcikgPT4gc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgZWxsaXBzaXMtcmVzaXplLWRldGVjdGlvbiBodG1sIGF0dHJpYnV0ZVxyXG4gICAqIEFsZ29yaXRobSB0byB1c2UgdG8gZGV0ZWN0IGVsZW1lbnQvd2luZG93IHJlc2l6ZSAtIGFueSBvZiB0aGUgZm9sbG93aW5nOlxyXG4gICAqICdyZXNpemUtb2JzZXJ2ZXInOiAoZGVmYXVsdCkgVXNlIG5hdGl2ZSBSZXNpemVPYnNlcnZlciAtIHNlZVxyXG4gICAqICAgIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9SZXNpemVPYnNlcnZlclxyXG4gICAqICAgIGFuZCBodHRwczovL2dpdGh1Yi5jb20vanVnZ2xlL3Jlc2l6ZS1vYnNlcnZlclxyXG4gICAqICd3aW5kb3cnOiBPbmx5IGNoZWNrIGlmIHRoZSB3aG9sZSB3aW5kb3cgaGFzIGJlZW4gcmVzaXplZC9jaGFuZ2VkIG9yaWVudGF0aW9uIGJ5IHVzaW5nIGFuZ3VsYXIncyBidWlsdC1pbiBIb3N0TGlzdGVuZXJcclxuICAgKi9cclxuICBASW5wdXQoJ2VsbGlwc2lzLXJlc2l6ZS1kZXRlY3Rpb24nKSByZXNpemVEZXRlY3Rpb25TdHJhdGVneTpcclxuICAgICcnIHwgJ21hbnVhbCcgfCAncmVzaXplLW9ic2VydmVyJyB8ICd3aW5kb3cnO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgZWxsaXBzaXMtY2xpY2stbW9yZSBodG1sIGF0dHJpYnV0ZVxyXG4gICAqIElmIGFueXRoaW5nIGlzIHBhc3NlZCwgdGhlIGVsbGlwc2lzQ2hhcmFjdGVycyB3aWxsIGJlXHJcbiAgICogd3JhcHBlZCBpbiA8YT48L2E+IHRhZ3MgYW5kIGFuIGV2ZW50IGhhbmRsZXIgZm9yIHRoZVxyXG4gICAqIHBhc3NlZCBmdW5jdGlvbiB3aWxsIGJlIGFkZGVkIHRvIHRoZSBsaW5rXHJcbiAgICovXHJcbiAgQE91dHB1dCgnZWxsaXBzaXMtY2xpY2stbW9yZScpIG1vcmVDbGlja0VtaXR0ZXI6IEV2ZW50RW1pdHRlcjxNb3VzZUV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBlbGxpcHNpcy1jaGFuZ2UgaHRtbCBhdHRyaWJ1dGVcclxuICAgKiBUaGlzIGVtaXRzIGFmdGVyIHdoaWNoIGluZGV4IHRoZSB0ZXh0IGhhcyBiZWVuIHRydW5jYXRlZC5cclxuICAgKiBJZiBpdCBoYXNuJ3QgYmVlbiB0cnVuY2F0ZWQsIG51bGwgaXMgZW1pdHRlZC5cclxuICAgKi9cclxuICBAT3V0cHV0KCdlbGxpcHNpcy1jaGFuZ2UnKSBjaGFuZ2VFbWl0dGVyOiBFdmVudEVtaXR0ZXI8bnVtYmVyPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbiAgLyoqXHJcbiAgICogVXRpbGl0eSBtZXRob2QgdG8gcXVpY2tseSBmaW5kIHRoZSBsYXJnZXN0IG51bWJlciBmb3JcclxuICAgKiB3aGljaCBgY2FsbGJhY2sobnVtYmVyKWAgc3RpbGwgcmV0dXJucyB0cnVlLlxyXG4gICAqIEBwYXJhbSAgbWF4ICAgICAgSGlnaGVzdCBwb3NzaWJsZSBudW1iZXJcclxuICAgKiBAcGFyYW0gIGNhbGxiYWNrIFNob3VsZCByZXR1cm4gdHJ1ZSBhcyBsb25nIGFzIHRoZSBwYXNzZWQgbnVtYmVyIGlzIHZhbGlkXHJcbiAgICogQHJldHVybiAgICAgICAgICBMYXJnZXN0IHBvc3NpYmxlIG51bWJlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgc3RhdGljIG51bWVyaWNCaW5hcnlTZWFyY2gobWF4OiBudW1iZXIsIGNhbGxiYWNrOiAobjogbnVtYmVyKSA9PiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgIGxldCBsb3cgPSAwO1xyXG4gICAgbGV0IGhpZ2ggPSBtYXg7XHJcbiAgICBsZXQgYmVzdCA9IC0xO1xyXG4gICAgbGV0IG1pZDogbnVtYmVyO1xyXG5cclxuICAgIHdoaWxlIChsb3cgPD0gaGlnaCkge1xyXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYml0d2lzZVxyXG4gICAgICBtaWQgPSB+figobG93ICsgaGlnaCkgLyAyKTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gY2FsbGJhY2sobWlkKTtcclxuICAgICAgaWYgKCFyZXN1bHQpIHtcclxuICAgICAgICBoaWdoID0gbWlkIC0gMTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBiZXN0ID0gbWlkO1xyXG4gICAgICAgIGxvdyA9IG1pZCArIDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYmVzdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnQgZWxsaXBzaXMgaW5wdXQgdG8gc3RyaW5nXHJcbiAgICogQHBhcmFtIGlucHV0IHN0cmluZyBvciBudW1iZXIgdG8gYmUgZGlzcGxheWVkIGFzIGFuIGVsbGlwc2lzXHJcbiAgICogQHJldHVybiAgICAgIGlucHV0IGNvbnZlcnRlZCB0byBzdHJpbmdcclxuICAgKi9cclxuICBwcml2YXRlIHN0YXRpYyBjb252ZXJ0RWxsaXBzaXNJbnB1dFRvU3RyaW5nKGlucHV0OiBzdHJpbmcgfCBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3VuZGVmaW5lZCcgfHwgaW5wdXQgPT09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBTdHJpbmcoaW5wdXQpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIGRpcmVjdGl2ZSdzIGNvbnN0cnVjdG9yXHJcbiAgICovXHJcbiAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSBlbGVtZW50UmVmOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PixcclxuICAgIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcclxuICAgIHByaXZhdGUgbmdab25lOiBOZ1pvbmUsXHJcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwcml2YXRlIHBsYXRmb3JtSWQ6IE9iamVjdFxyXG4gICkgeyB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFuZ3VsYXIncyBpbml0IHZpZXcgbGlmZSBjeWNsZSBob29rLlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBlbGVtZW50IGZvciBkaXNwbGF5aW5nIHRoZSBlbGxpcHNpcy5cclxuICAgKi9cclxuICBuZ0FmdGVyVmlld0luaXQoKSB7XHJcbiAgICBpZiAoIWlzUGxhdGZvcm1Ccm93c2VyKHRoaXMucGxhdGZvcm1JZCkpIHtcclxuICAgICAgLy8gaW4gYW5ndWxhciB1bml2ZXJzYWwgd2UgZG9uJ3QgaGF2ZSBhY2Nlc3MgdG8gdGhlIHVnbHlcclxuICAgICAgLy8gRE9NIG1hbmlwdWxhdGlvbiBwcm9wZXJ0aWVzIHdlIHNhZGx5IG5lZWQgdG8gYWNjZXNzIGhlcmUsXHJcbiAgICAgIC8vIHNvIHdhaXQgdW50aWwgd2UncmUgaW4gdGhlIGJyb3dzZXI6XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcmVmZXIgbmF0aXZlIFJlc2l6ZU9ic2VydmVyIG92ZXIgcG9ueWZpbGwsIGlmIGF2YWlsYWJsZTpcclxuICAgIGlmICgoPGFueT4gd2luZG93KS5SZXNpemVPYnNlcnZlciAhPSBudWxsKSB7XHJcbiAgICAgIFJlc2l6ZU9ic2VydmVyID0gKDxhbnk+IHdpbmRvdykuUmVzaXplT2JzZXJ2ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbGV0IHRoZSBlbGxpcHNpcyBjaGFyYWN0ZXJzIGRlZmF1bHQgdG8gJy4uLic6XHJcbiAgICBpZiAodGhpcy5lbGxpcHNpc0NoYXJhY3RlcnMgPT09ICcnKSB7XHJcbiAgICAgIHRoaXMuZWxsaXBzaXNDaGFyYWN0ZXJzID0gJy4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY3JlYXRlIG1vcmUgYW5jaG9yIGVsZW1lbnQ6XHJcbiAgICB0aGlzLm1vcmVBbmNob3IgPSA8SFRNTEFuY2hvckVsZW1lbnQ+IHRoaXMucmVuZGVyZXIuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gICAgdGhpcy5tb3JlQW5jaG9yLmNsYXNzTmFtZSA9ICduZ3gtZWxsaXBzaXMtbW9yZSc7XHJcbiAgICB0aGlzLm1vcmVBbmNob3IuaHJlZiA9ICcjJztcclxuICAgIHRoaXMubW9yZUFuY2hvci50ZXh0Q29udGVudCA9IHRoaXMuZWxsaXBzaXNDaGFyYWN0ZXJzO1xyXG5cclxuICAgIC8vIHBlcmZvcm0gcmVnZXggcmVwbGFjZSBvbiB3b3JkIGJvdW5kYXJpZXM6XHJcbiAgICBpZiAoIXRoaXMuZWxsaXBzaXNXb3JkQm91bmRhcmllcykge1xyXG4gICAgICB0aGlzLmVsbGlwc2lzV29yZEJvdW5kYXJpZXMgPSAnJztcclxuICAgIH1cclxuICAgIHRoaXMuZWxsaXBzaXNXb3JkQm91bmRhcmllcyA9ICdbJyArIHRoaXMuZWxsaXBzaXNXb3JkQm91bmRhcmllcy5yZXBsYWNlKC9cXFxcbi8sICdcXG4nKS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKSArICddJztcclxuXHJcbiAgICBpZiAoIXRoaXMuZWxsaXBzaXNTdWJzdHJGbikge1xyXG4gICAgICB0aGlzLmVsbGlwc2lzU3Vic3RyRm4gPSAoc3RyOiBzdHJpbmcsIGZyb206IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoZnJvbSwgbGVuZ3RoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHN0b3JlIHRoZSBvcmlnaW5hbCBjb250ZW50cyBvZiB0aGUgZWxlbWVudDpcclxuICAgIHRoaXMuZWxlbSA9IHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xyXG4gICAgaWYgKHR5cGVvZiB0aGlzLmVsbGlwc2lzQ29udGVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5lbGxpcHNpc0NvbnRlbnQgIT09IG51bGwpIHtcclxuICAgICAgdGhpcy5vcmlnaW5hbFRleHQgPSBFbGxpcHNpc0RpcmVjdGl2ZS5jb252ZXJ0RWxsaXBzaXNJbnB1dFRvU3RyaW5nKHRoaXMuZWxsaXBzaXNDb250ZW50KTtcclxuICAgIH0gZWxzZSBpZiAoIXRoaXMub3JpZ2luYWxUZXh0KSB7XHJcbiAgICAgIHRoaXMub3JpZ2luYWxUZXh0ID0gdGhpcy5lbGVtLnRleHRDb250ZW50LnRyaW0oKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhZGQgYSB3cmFwcGVyIGRpdiAocmVxdWlyZWQgZm9yIHJlc2l6ZSBldmVudHMgdG8gd29yayBwcm9wZXJseSk6XHJcbiAgICB0aGlzLnJlbmRlcmVyLnNldFByb3BlcnR5KHRoaXMuZWxlbSwgJ2lubmVySFRNTCcsICcnKTtcclxuICAgIHRoaXMuaW5uZXJFbGVtID0gdGhpcy5yZW5kZXJlci5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKHRoaXMuaW5uZXJFbGVtLCAnbmd4LWVsbGlwc2lzLWlubmVyJyk7XHJcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5yZW5kZXJlci5jcmVhdGVUZXh0KHRoaXMub3JpZ2luYWxUZXh0KTtcclxuICAgIHRoaXMucmVuZGVyZXIuYXBwZW5kQ2hpbGQodGhpcy5pbm5lckVsZW0sIHRleHQpO1xyXG4gICAgdGhpcy5yZW5kZXJlci5hcHBlbmRDaGlsZCh0aGlzLmVsZW0sIHRoaXMuaW5uZXJFbGVtKTtcclxuXHJcbiAgICB0aGlzLnByZXZpb3VzRGltZW5zaW9ucyA9IHtcclxuICAgICAgd2lkdGg6IHRoaXMuZWxlbS5jbGllbnRXaWR0aCxcclxuICAgICAgaGVpZ2h0OiB0aGlzLmVsZW0uY2xpZW50SGVpZ2h0XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIHN0YXJ0IGxpc3RlbmluZyBmb3IgcmVzaXplIGV2ZW50czpcclxuICAgIHRoaXMuYWRkUmVzaXplTGlzdGVuZXIodHJ1ZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbmd1bGFyJ3MgY2hhbmdlIGxpZmUgY3ljbGUgaG9vay5cclxuICAgKiBDaGFuZ2Ugb3JpZ2luYWwgdGV4dCAoaWYgdGhlIGVsbGlwc2lzLWNvbnRlbnQgaGFzIGJlZW4gcGFzc2VkKVxyXG4gICAqIGFuZCByZS1yZW5kZXJcclxuICAgKi9cclxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XHJcbiAgICBjb25zdCBtb3JlQW5jaG9yUmVxdWlyZXNDaGFuZ2UgPSB0aGlzLm1vcmVBbmNob3IgJiYgY2hhbmdlc1snZWxsaXBzaXNDaGFyYWN0ZXJzJ107XHJcbiAgICBpZiAobW9yZUFuY2hvclJlcXVpcmVzQ2hhbmdlKSB7XHJcbiAgICAgIHRoaXMubW9yZUFuY2hvci50ZXh0Q29udGVudCA9IHRoaXMuZWxsaXBzaXNDaGFyYWN0ZXJzO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmVsZW1cclxuICAgICAgICAmJiB0eXBlb2YgdGhpcy5lbGxpcHNpc0NvbnRlbnQgIT09ICd1bmRlZmluZWQnXHJcbiAgICAgICAgJiYgKFxyXG4gICAgICAgICAgdGhpcy5vcmlnaW5hbFRleHQgIT09IEVsbGlwc2lzRGlyZWN0aXZlLmNvbnZlcnRFbGxpcHNpc0lucHV0VG9TdHJpbmcodGhpcy5lbGxpcHNpc0NvbnRlbnQpXHJcbiAgICAgICAgICB8fCBtb3JlQW5jaG9yUmVxdWlyZXNDaGFuZ2VcclxuICAgICAgICApXHJcbiAgICApIHtcclxuICAgICAgdGhpcy5vcmlnaW5hbFRleHQgPSBFbGxpcHNpc0RpcmVjdGl2ZS5jb252ZXJ0RWxsaXBzaXNJbnB1dFRvU3RyaW5nKHRoaXMuZWxsaXBzaXNDb250ZW50KTtcclxuICAgICAgdGhpcy5hcHBseUVsbGlwc2lzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbmd1bGFyJ3MgZGVzdHJveSBsaWZlIGN5Y2xlIGhvb2suXHJcbiAgICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVyc1xyXG4gICAqL1xyXG4gIG5nT25EZXN0cm95KCkge1xyXG4gICAgLy8gSW4gYW5ndWxhciB1bml2ZXJzYWwgd2UgZG9uJ3QgaGF2ZSBhbnkgbGlzdGVuZXJzIGhvb2tlZCB1cCAoYWxsIHJlcXVpcmluZyB1Z2x5IERPTSBtYW5pcHVsYXRpb24gbWV0aG9kcyksXHJcbiAgICAvLyBzbyB3ZSBvbmx5IG5lZWQgdG8gcmVtb3ZlIHRoZW0sIGlmIHdlJ3JlIGluc2lkZSB0aGUgYnJvd3NlcjpcclxuICAgIGlmIChpc1BsYXRmb3JtQnJvd3Nlcih0aGlzLnBsYXRmb3JtSWQpKSB7XHJcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiByZW1vdmUgYWxsIHJlc2l6ZSBsaXN0ZW5lcnNcclxuICAgKi9cclxuICBwcml2YXRlIHJlbW92ZUFsbExpc3RlbmVycygpIHtcclxuICAgIGlmICh0aGlzLmRlc3Ryb3lNb3JlQ2xpY2tMaXN0ZW5lcikge1xyXG4gICAgICB0aGlzLmRlc3Ryb3lNb3JlQ2xpY2tMaXN0ZW5lcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucmVtb3ZlUmVzaXplTGlzdGVuZXJzJC5uZXh0KCk7XHJcbiAgICB0aGlzLnJlbW92ZVJlc2l6ZUxpc3RlbmVycyQuY29tcGxldGUoKTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBTZXQgdXAgYW4gZXZlbnQgbGlzdGVuZXIgdG8gY2FsbCBhcHBseUVsbGlwc2lzKCkgd2hlbmV2ZXIgYSByZXNpemUgaGFzIGJlZW4gcmVnaXN0ZXJlZC5cclxuICAgKiBUaGUgdHlwZSBvZiB0aGUgbGlzdGVuZXIgKHdpbmRvdy9lbGVtZW50KSBkZXBlbmRzIG9uIHRoZSByZXNpemVEZXRlY3Rpb25TdHJhdGVneS5cclxuICAgKiBAcGFyYW0gdHJpZ2dlck5vdz1mYWxzZSBpZiB0cnVlLCB0aGUgZWxsaXBzaXMgaXMgYXBwbGllZCBpbW1lZGlhdGVseVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYWRkUmVzaXplTGlzdGVuZXIodHJpZ2dlck5vdyA9IGZhbHNlKSB7XHJcbiAgICBpZiAodHlwZW9mICh0aGlzLnJlc2l6ZURldGVjdGlvblN0cmF0ZWd5KSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgdGhpcy5yZXNpemVEZXRlY3Rpb25TdHJhdGVneSA9ICcnO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAodGhpcy5yZXNpemVEZXRlY3Rpb25TdHJhdGVneSkge1xyXG4gICAgICBjYXNlICdtYW51YWwnOlxyXG4gICAgICAgIC8vIFVzZXJzIHdpbGwgdHJpZ2dlciBhcHBseUVsbGlwc2lzIHZpYSB0aGUgcHVibGljIEFQSVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICd3aW5kb3cnOlxyXG4gICAgICAgIHRoaXMuYWRkV2luZG93UmVzaXplTGlzdGVuZXIoKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBpZiAodHlwZW9mIChjb25zb2xlKSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICAgICAgYE5vIHN1Y2ggZWxsaXBzaXMtcmVzaXplLWRldGVjdGlvbiBzdHJhdGVneTogJyR7dGhpcy5yZXNpemVEZXRlY3Rpb25TdHJhdGVneX0nLiBVc2luZyAncmVzaXplLW9ic2VydmVyJyBpbnN0ZWFkYFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1mYWxsdGhyb3VnaFxyXG4gICAgICBjYXNlICdyZXNpemUtb2JzZXJ2ZXInOlxyXG4gICAgICBjYXNlICcnOlxyXG4gICAgICAgIHRoaXMuYWRkRWxlbWVudFJlc2l6ZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRyaWdnZXJOb3cgJiYgdGhpcy5yZXNpemVEZXRlY3Rpb25TdHJhdGVneSAhPT0gJ21hbnVhbCcpIHtcclxuICAgICAgdGhpcy5hcHBseUVsbGlwc2lzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgdXAgYW4gZXZlbnQgbGlzdGVuZXIgdG8gY2FsbCBhcHBseUVsbGlwc2lzKCkgd2hlbmV2ZXIgdGhlIHdpbmRvdyBnZXRzIHJlc2l6ZWQuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhZGRXaW5kb3dSZXNpemVMaXN0ZW5lcigpIHtcclxuICAgIGNvbnN0IHJlbW92ZVdpbmRvd1Jlc2l6ZUxpc3RlbmVyID0gdGhpcy5yZW5kZXJlci5saXN0ZW4oJ3dpbmRvdycsICdyZXNpemUnLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5hcHBseUVsbGlwc2lzKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5yZW1vdmVSZXNpemVMaXN0ZW5lcnMkLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKCgpID0+IHJlbW92ZVdpbmRvd1Jlc2l6ZUxpc3RlbmVyKCkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVwIGFuIGV2ZW50IGxpc3RlbmVyIHRvIGNhbGwgYXBwbHlFbGxpcHNpcygpIHdoZW5ldmVyIHRoZSBlbGVtZW50XHJcbiAgICogaGFzIGJlZW4gcmVzaXplZC5cclxuICAgKi9cclxuICBwcml2YXRlIGFkZEVsZW1lbnRSZXNpemVMaXN0ZW5lcigpIHtcclxuICAgIGNvbnN0IHJlc2l6ZU9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgaWYgKHRoaXMucHJldmlvdXNEaW1lbnNpb25zLndpZHRoICE9PSB0aGlzLmVsZW0uY2xpZW50V2lkdGggfHwgdGhpcy5wcmV2aW91c0RpbWVuc2lvbnMuaGVpZ2h0ICE9PSB0aGlzLmVsZW0uY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmFwcGx5RWxsaXBzaXMoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHRoaXMucHJldmlvdXNEaW1lbnNpb25zLndpZHRoID0gdGhpcy5lbGVtLmNsaWVudFdpZHRoO1xyXG4gICAgICAgICAgdGhpcy5wcmV2aW91c0RpbWVuc2lvbnMuaGVpZ2h0ID0gdGhpcy5lbGVtLmNsaWVudEhlaWdodDtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICByZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuZWxlbSk7XHJcbiAgICB0aGlzLnJlbW92ZVJlc2l6ZUxpc3RlbmVycyQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKCkgPT4gcmVzaXplT2JzZXJ2ZXIuZGlzY29ubmVjdCgpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgb3JpZ2luYWwgdGV4dCdzIHRydW5jYXRlZCB2ZXJzaW9uLiBJZiB0aGUgdGV4dCByZWFsbHkgbmVlZGVkIHRvXHJcbiAgICogYmUgdHJ1bmNhdGVkLCB0aGlzLmVsbGlwc2lzQ2hhcmFjdGVycyB3aWxsIGJlIGFwcGVuZGVkLlxyXG4gICAqIEBwYXJhbSBtYXggdGhlIG1heGltdW0gbGVuZ3RoIHRoZSB0ZXh0IG1heSBoYXZlXHJcbiAgICogQHJldHVybiBzdHJpbmcgICAgICAgdGhlIHRydW5jYXRlZCBzdHJpbmdcclxuICAgKi9cclxuICBwcml2YXRlIGdldFRydW5jYXRlZFRleHQobWF4OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgaWYgKCF0aGlzLm9yaWdpbmFsVGV4dCB8fCB0aGlzLm9yaWdpbmFsVGV4dC5sZW5ndGggPD0gbWF4KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsVGV4dDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0cnVuY2F0ZWRUZXh0ID0gdGhpcy5lbGxpcHNpc1N1YnN0ckZuKHRoaXMub3JpZ2luYWxUZXh0LCAwLCBtYXgpO1xyXG4gICAgaWYgKHRoaXMuZWxsaXBzaXNXb3JkQm91bmRhcmllcyA9PT0gJ1tdJyB8fCB0aGlzLm9yaWdpbmFsVGV4dC5jaGFyQXQobWF4KS5tYXRjaCh0aGlzLmVsbGlwc2lzV29yZEJvdW5kYXJpZXMpKSB7XHJcbiAgICAgIHJldHVybiB0cnVuY2F0ZWRUZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBpID0gbWF4IC0gMTtcclxuICAgIHdoaWxlIChpID4gMCAmJiAhdHJ1bmNhdGVkVGV4dC5jaGFyQXQoaSkubWF0Y2godGhpcy5lbGxpcHNpc1dvcmRCb3VuZGFyaWVzKSkge1xyXG4gICAgICBpLS07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5lbGxpcHNpc1N1YnN0ckZuKHRydW5jYXRlZFRleHQsIDAsIGkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHRoZSB0cnVuY2F0ZWQgdGV4dCB0byBiZSBkaXNwbGF5ZWQgaW4gdGhlIGlubmVyIGRpdlxyXG4gICAqIEBwYXJhbSBtYXggdGhlIG1heGltdW0gbGVuZ3RoIHRoZSB0ZXh0IG1heSBoYXZlXHJcbiAgICogQHBhcmFtIGFkZE1vcmVMaXN0ZW5lcj1mYWxzZSBsaXN0ZW4gZm9yIGNsaWNrIG9uIHRoZSBlbGxpcHNpc0NoYXJhY3RlcnMgYW5jaG9yIHRhZyBpZiB0aGUgdGV4dCBoYXMgYmVlbiB0cnVuY2F0ZWRcclxuICAgKiBAcmV0dXJucyBsZW5ndGggb2YgcmVtYWluaW5nIHRleHQgKGV4Y2x1ZGluZyB0aGUgZWxsaXBzaXNDaGFyYWN0ZXJzLCBpZiB0aGV5IHdlcmUgYWRkZWQpXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB0cnVuY2F0ZVRleHQobWF4OiBudW1iZXIsIGFkZE1vcmVMaXN0ZW5lciA9IGZhbHNlKTogbnVtYmVyIHtcclxuICAgIGxldCB0ZXh0ID0gdGhpcy5nZXRUcnVuY2F0ZWRUZXh0KG1heCk7XHJcbiAgICBjb25zdCB0cnVuY2F0ZWRMZW5ndGggPSB0ZXh0Lmxlbmd0aDtcclxuICAgIGNvbnN0IHRleHRUcnVuY2F0ZWQgPSAodHJ1bmNhdGVkTGVuZ3RoICE9PSB0aGlzLm9yaWdpbmFsVGV4dC5sZW5ndGgpO1xyXG5cclxuICAgIGlmICh0ZXh0VHJ1bmNhdGVkICYmICF0aGlzLnNob3dNb3JlTGluaykge1xyXG4gICAgICB0ZXh0ICs9IHRoaXMuZWxsaXBzaXNDaGFyYWN0ZXJzO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucmVuZGVyZXIuc2V0UHJvcGVydHkodGhpcy5pbm5lckVsZW0sICd0ZXh0Q29udGVudCcsIHRleHQpO1xyXG5cclxuICAgIGlmICh0ZXh0VHJ1bmNhdGVkICYmIHRoaXMuc2hvd01vcmVMaW5rKSB7XHJcbiAgICAgIHRoaXMucmVuZGVyZXIuYXBwZW5kQ2hpbGQodGhpcy5pbm5lckVsZW0sIHRoaXMubW9yZUFuY2hvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBtb3JlIGNsaWNrIGxpc3RlbmVyOlxyXG4gICAgaWYgKHRoaXMuZGVzdHJveU1vcmVDbGlja0xpc3RlbmVyKSB7XHJcbiAgICAgIHRoaXMuZGVzdHJveU1vcmVDbGlja0xpc3RlbmVyKCk7XHJcbiAgICAgIHRoaXMuZGVzdHJveU1vcmVDbGlja0xpc3RlbmVyID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiB0aGUgdGV4dCBoYXMgYmVlbiB0cnVuY2F0ZWQsIGFkZCBhIG1vcmUgY2xpY2sgbGlzdGVuZXI6XHJcbiAgICBpZiAoYWRkTW9yZUxpc3RlbmVyICYmIHRleHRUcnVuY2F0ZWQpIHtcclxuICAgICAgdGhpcy5kZXN0cm95TW9yZUNsaWNrTGlzdGVuZXIgPSB0aGlzLnJlbmRlcmVyLmxpc3Rlbih0aGlzLm1vcmVBbmNob3IsICdjbGljaycsIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKCFlLnRhcmdldCB8fCAhKDxIVE1MRWxlbWVudD4gZS50YXJnZXQpLmNsYXNzTGlzdC5jb250YWlucygnbmd4LWVsbGlwc2lzLW1vcmUnKSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdGhpcy5tb3JlQ2xpY2tFbWl0dGVyLmVtaXQoZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVuY2F0ZWRMZW5ndGg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEaXNwbGF5IGVsbGlwc2lzIGluIHRoZSBpbm5lciBkaXYgaWYgdGhlIHRleHQgd291bGQgZXhjZWVkIHRoZSBib3VuZGFyaWVzXHJcbiAgICovXHJcbiAgcHVibGljIGFwcGx5RWxsaXBzaXMoKSB7XHJcbiAgICAvLyBSZW1vdmUgdGhlIHJlc2l6ZSBsaXN0ZW5lciBhcyBjaGFuZ2luZyB0aGUgY29udGFpbmVkIHRleHQgd291bGQgdHJpZ2dlciBldmVudHM6XHJcbiAgICB0aGlzLnJlbW92ZVJlc2l6ZUxpc3RlbmVycyQubmV4dCgpO1xyXG5cclxuICAgIC8vIEZpbmQgdGhlIGJlc3QgbGVuZ3RoIGJ5IHRyaWFsIGFuZCBlcnJvcjpcclxuICAgIGNvbnN0IG1heExlbmd0aCA9IEVsbGlwc2lzRGlyZWN0aXZlLm51bWVyaWNCaW5hcnlTZWFyY2godGhpcy5vcmlnaW5hbFRleHQubGVuZ3RoLCBjdXJMZW5ndGggPT4ge1xyXG4gICAgICB0aGlzLnRydW5jYXRlVGV4dChjdXJMZW5ndGgpO1xyXG4gICAgICByZXR1cm4gIXRoaXMuaXNPdmVyZmxvd2luZztcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFwcGx5IHRoZSBiZXN0IGxlbmd0aDpcclxuICAgIGNvbnN0IGZpbmFsTGVuZ3RoID0gdGhpcy50cnVuY2F0ZVRleHQobWF4TGVuZ3RoLCB0aGlzLnNob3dNb3JlTGluayk7XHJcblxyXG4gICAgLy8gUmUtYXR0YWNoIHRoZSByZXNpemUgbGlzdGVuZXI6XHJcbiAgICB0aGlzLmFkZFJlc2l6ZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgLy8gRW1pdCBjaGFuZ2UgZXZlbnQ6XHJcbiAgICBpZiAodGhpcy5jaGFuZ2VFbWl0dGVyLm9ic2VydmVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuY2hhbmdlRW1pdHRlci5lbWl0KFxyXG4gICAgICAgICh0aGlzLm9yaWdpbmFsVGV4dC5sZW5ndGggPT09IGZpbmFsTGVuZ3RoKSA/IG51bGwgOiBmaW5hbExlbmd0aFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFdoZXRoZXIgdGhlIHRleHQgaXMgZXhjZWVkaW5nIHRoZSBlbGVtZW50J3MgYm91bmRhcmllcyBvciBub3RcclxuICAgKi9cclxuICBwcml2YXRlIGdldCBpc092ZXJmbG93aW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gRW5mb3JjZSBoaWRkZW4gb3ZlcmZsb3cgKHJlcXVpcmVkIHRvIGNvbXBhcmUgY2xpZW50IHdpZHRoL2hlaWdodCB3aXRoIHNjcm9sbCB3aWR0aC9oZWlnaHQpXHJcbiAgICBjb25zdCBjdXJyZW50T3ZlcmZsb3cgPSB0aGlzLmVsZW0uc3R5bGUub3ZlcmZsb3c7XHJcbiAgICBpZiAoIWN1cnJlbnRPdmVyZmxvdyB8fCBjdXJyZW50T3ZlcmZsb3cgPT09ICd2aXNpYmxlJykge1xyXG4gICAgICB0aGlzLmVsZW0uc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpc092ZXJmbG93aW5nID0gdGhpcy5lbGVtLmNsaWVudFdpZHRoIDwgdGhpcy5lbGVtLnNjcm9sbFdpZHRoIC0gMSB8fCB0aGlzLmVsZW0uY2xpZW50SGVpZ2h0IDwgdGhpcy5lbGVtLnNjcm9sbEhlaWdodCAtIDE7XHJcblxyXG4gICAgLy8gUmVzZXQgb3ZlcmZsb3cgdG8gdGhlIG9yaWdpbmFsIGNvbmZpZ3VyYXRpb246XHJcbiAgICB0aGlzLmVsZW0uc3R5bGUub3ZlcmZsb3cgPSBjdXJyZW50T3ZlcmZsb3c7XHJcblxyXG4gICAgcmV0dXJuIGlzT3ZlcmZsb3dpbmc7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBXaGV0aGVyIHRoZSBgZWxsaXBzaXNDaGFyYWN0ZXJzYCBhcmUgdG8gYmUgd3JhcHBlZCBpbnNpZGUgYW4gYW5jaG9yIHRhZyAoaWYgdGhleSBhcmUgc2hvd24gYXQgYWxsKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0IHNob3dNb3JlTGluaygpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAodGhpcy5tb3JlQ2xpY2tFbWl0dGVyLm9ic2VydmVycy5sZW5ndGggPiAwKTtcclxuICB9XHJcbn1cclxuIl19
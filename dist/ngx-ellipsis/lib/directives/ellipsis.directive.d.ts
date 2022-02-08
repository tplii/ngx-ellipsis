import { ElementRef, Renderer2, EventEmitter, NgZone, OnChanges, AfterViewInit, OnDestroy, SimpleChanges } from '@angular/core';
/**
 * Directive to truncate the contained text, if it exceeds the element's boundaries
 * and append characters (configurable, default '...') if so.
 */
export declare class EllipsisDirective implements OnChanges, OnDestroy, AfterViewInit {
    private elementRef;
    private renderer;
    private ngZone;
    private platformId;
    /**
     * The original text (not truncated yet)
     */
    private originalText;
    /**
     * The referenced element
     */
    private elem;
    /**
     * Inner div element (will be auto-created)
     */
    private innerElem;
    /**
     * Anchor tag wrapping the `ellipsisCharacters`
     */
    private moreAnchor;
    private previousDimensions;
    /**
     * Subject triggered when resize listeners should be removed
     */
    private removeResizeListeners$;
    /**
     * Remove function for the currently registered click listener
     * on the link `this.ellipsisCharacters` are wrapped in.
     */
    private destroyMoreClickListener;
    /**
     * The ellipsis html attribute
     * If anything is passed, this will be used as a string to append to
     * the truncated contents.
     * Else '...' will be appended.
     */
    ellipsisCharacters: string;
    /**
     * The ellipsis-content html attribute
     * If passed this is used as content, else contents
     * are fetched from textContent
     */
    ellipsisContent: string | number;
    /**
     * The ellipsis-word-boundaries html attribute
     * If anything is passed, each character will be interpreted
     * as a word boundary at which the text may be truncated.
     * Else the text may be truncated at any character.
     */
    ellipsisWordBoundaries: string;
    /**
     * Function to use for string splitting. Defaults to the native `String#substr`.
     * (This may for example be used to avoid splitting surrogate pairs- used by some emojis -
     * by providing a lib such as runes.)
     */
    ellipsisSubstrFn: (str: string, from: number, length?: number) => string;
    /**
     * The ellipsis-resize-detection html attribute
     * Algorithm to use to detect element/window resize - any of the following:
     * 'resize-observer': (default) Use native ResizeObserver - see
     *    https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
     *    and https://github.com/juggle/resize-observer
     * 'window': Only check if the whole window has been resized/changed orientation by using angular's built-in HostListener
     */
    resizeDetectionStrategy: '' | 'manual' | 'resize-observer' | 'window';
    /**
     * The ellipsis-click-more html attribute
     * If anything is passed, the ellipsisCharacters will be
     * wrapped in <a></a> tags and an event handler for the
     * passed function will be added to the link
     */
    moreClickEmitter: EventEmitter<MouseEvent>;
    /**
     * The ellipsis-change html attribute
     * This emits after which index the text has been truncated.
     * If it hasn't been truncated, null is emitted.
     */
    changeEmitter: EventEmitter<number>;
    /**
     * Utility method to quickly find the largest number for
     * which `callback(number)` still returns true.
     * @param  max      Highest possible number
     * @param  callback Should return true as long as the passed number is valid
     * @return          Largest possible number
     */
    private static numericBinarySearch;
    /**
     * Convert ellipsis input to string
     * @param input string or number to be displayed as an ellipsis
     * @return      input converted to string
     */
    private static convertEllipsisInputToString;
    /**
     * The directive's constructor
     */
    constructor(elementRef: ElementRef<HTMLElement>, renderer: Renderer2, ngZone: NgZone, platformId: Object);
    /**
     * Angular's init view life cycle hook.
     * Initializes the element for displaying the ellipsis.
     */
    ngAfterViewInit(): void;
    /**
     * Angular's change life cycle hook.
     * Change original text (if the ellipsis-content has been passed)
     * and re-render
     */
    ngOnChanges(changes: SimpleChanges): void;
    /**
     * Angular's destroy life cycle hook.
     * Remove event listeners
     */
    ngOnDestroy(): void;
    /**
     * remove all resize listeners
     */
    private removeAllListeners;
    /**
     * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
     * The type of the listener (window/element) depends on the resizeDetectionStrategy.
     * @param triggerNow=false if true, the ellipsis is applied immediately
     */
    private addResizeListener;
    /**
     * Set up an event listener to call applyEllipsis() whenever the window gets resized.
     */
    private addWindowResizeListener;
    /**
     * Set up an event listener to call applyEllipsis() whenever the element
     * has been resized.
     */
    private addElementResizeListener;
    /**
     * Get the original text's truncated version. If the text really needed to
     * be truncated, this.ellipsisCharacters will be appended.
     * @param max the maximum length the text may have
     * @return string       the truncated string
     */
    private getTruncatedText;
    /**
     * Set the truncated text to be displayed in the inner div
     * @param max the maximum length the text may have
     * @param addMoreListener=false listen for click on the ellipsisCharacters anchor tag if the text has been truncated
     * @returns length of remaining text (excluding the ellipsisCharacters, if they were added)
     */
    private truncateText;
    /**
     * Display ellipsis in the inner div if the text would exceed the boundaries
     */
    applyEllipsis(): void;
    /**
     * Whether the text is exceeding the element's boundaries or not
     */
    private get isOverflowing();
    /**
     * Whether the `ellipsisCharacters` are to be wrapped inside an anchor tag (if they are shown at all)
     */
    private get showMoreLink();
}

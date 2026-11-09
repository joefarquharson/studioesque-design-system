/**
 * Lifecycle helpers shared by the SDS modules.
 *
 * init functions can be called at any time: from a module script (which runs
 * after parsing, before DOMContentLoaded), or later from host code. These
 * helpers run the callback immediately if that moment has already passed,
 * so a late init() still works.
 */

/** Run fn once the DOM is parsed (now, if it already is). */
export function onReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
        fn();
    }
}

/** Run fn after window load (now, if load has already fired). */
export function onLoad(fn) {
    if (document.readyState === 'complete') {
        fn();
    } else {
        window.addEventListener('load', fn, { once: true });
    }
}

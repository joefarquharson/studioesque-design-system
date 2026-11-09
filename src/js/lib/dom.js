/**
 * DOM helpers shared by the SDS modules.
 */

/** Accept an Element or a selector string; return the Element or null. */
export function resolve(target, scope = document) {
    if (!target) return null;
    if (typeof target === 'string') return scope.querySelector(target);
    return target;
}

/** Accept a NodeList/array of Elements or a selector string; return an array. */
export function resolveAll(target, scope = document) {
    if (!target) return [];
    if (typeof target === 'string') return Array.from(scope.querySelectorAll(target));
    return Array.from(target);
}

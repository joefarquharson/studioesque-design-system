/**
 * menu.js
 * Mobile menu: #sds-menu-trigger toggles .sds-menu-open on <html>; closes on
 * nav-link click, Escape, and breakpoint crossings (with Safari handling).
 *
 * Usage:
 *   import { initMenu } from './js/menu.js';
 *   initMenu();
 *
 * Options (all optional):
 *   trigger  Element|selector   '#sds-menu-trigger'
 *   nav      Element|selector   '#sds-main-nav'   (the panel that slides in)
 *   links    selector|NodeList  '.sds-header-nav a' (clicking one closes the menu)
 */

import { onReady } from './lib/ready.js';
import { resolve, resolveAll } from './lib/dom.js';

const DEFAULTS = {
    trigger: '#sds-menu-trigger',
    nav: '#sds-main-nav',
    links: '.sds-header-nav a',
};

let initialized = false;

export function initMenu(options = {}) {
    if (initialized) return;
    initialized = true;

    const config = { ...DEFAULTS, ...options };

    const setup = () => {
        const root = document.documentElement;
        const menuTrigger = resolve(config.trigger);
        const mainNav = resolve(config.nav);
        const navLinks = resolveAll(config.links);

        if (!menuTrigger || !mainNav) return;

        // =============================================
        // Detect Safari
        // =============================================
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // ✅ ADD: Detect reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // =============================================
        // Track Viewport State
        // =============================================
        
        let isMobile = window.innerWidth <= 768;
        let resizeTimer;
        let isResizing = false;

        // =============================================
        // Toggle Menu Function
        // =============================================
        
        // Later in toggleMenu function, you can optionally adjust timing:
        const toggleMenu = (state) => {
            const isOpening = state !== undefined ? state : !root.classList.contains('sds-menu-open');
            root.classList.toggle('sds-menu-open', isOpening);
            menuTrigger.setAttribute('aria-expanded', isOpening);
            // No body scroll locking — the fixed full-screen nav overlay covers the
            // entire viewport, so the body scroll position is naturally preserved.
        };

        // =============================================
        // Handle Resize with Safari-Specific Logic
        // =============================================
        
        const handleResize = () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            
            const crossedBreakpoint = wasMobile !== isMobile;
            
            if (crossedBreakpoint) {
                if (isSafari) {
                    // Safari: Completely hide menu and disable ALL transitions
                    mainNav.style.opacity = '0';
                    mainNav.style.visibility = 'hidden';
                    mainNav.style.transition = 'none';
                    mainNav.style.transform = 'translateX(100%)';
                    
                    // Force reflow
                    void mainNav.offsetHeight;
                } else {
                    // Non-Safari: Just disable transition
                    mainNav.style.transition = 'none';
                    void mainNav.offsetHeight;
                }
                
                // Add resizing class
                root.classList.add('sds-resizing');
                isResizing = true;
                
                // Close menu if switching to desktop
                if (!isMobile && root.classList.contains('sds-menu-open')) {
                    toggleMenu(false);
                }
                
                // Re-enable after layout settles
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    root.classList.remove('sds-resizing');
                    isResizing = false;
                    
                    if (isSafari) {
                        // Restore styles
                        mainNav.style.opacity = '';
                        mainNav.style.visibility = '';
                        mainNav.style.transition = '';
                        mainNav.style.transform = '';
                    } else {
                        mainNav.style.transition = '';
                    }
                }, 200);
            } else if (isMobile && root.classList.contains('sds-menu-open')) {
                // Still mobile but resizing - close if open
                toggleMenu(false);
            }
        };

        // =============================================
        // Debounced Resize Handler
        // =============================================
        
        let resizeDebounce;
        const debouncedResize = () => {
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(handleResize, 10);
        };

        // =============================================
        // Event Listeners
        // =============================================
        
        menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            // Only allow toggle if not currently resizing
            if (!isResizing) {
                toggleMenu();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });

        // Use debounced handler for better performance
        window.addEventListener('resize', debouncedResize);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && root.classList.contains('sds-menu-open')) {
                toggleMenu(false);
            }
        });
    };

    // =============================================
    // Initialize
    // =============================================
    
    onReady(setup);
}
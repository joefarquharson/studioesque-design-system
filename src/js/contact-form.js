/* js/contact-form.js
   Contact form validation, driven by the markup:
   - On submit: every [required] field must be non-blank; a field with
     type="email" also gets a format check ("blank" vs "format" message)
   - Field errors clear as soon as the user starts correcting them
   - A submit-level error message appears next to the button on failed submit

   Usage:
     import { initContactForm } from './js/contact-form.js';
     initContactForm();

   Markup (per field; ids/names are up to the host):
     <form class="sds-contact-form" novalidate>
       <div class="sds-form-field">
         …<span class="sds-form-error-text"></span>…
         <input type="email" name="email" required>
       </div>
       …
       <span class="sds-form-error sds-form-submit-error">…</span>
     </form>

   Options (all optional):
     form         selector|NodeList  '.sds-contact-form' (every match is wired)
     fields       selector           '[required]', looked up inside each form
     submitError  selector           '.sds-form-submit-error', inside each form
     messages     { blank, email }   error text (defaults below)
     onValid      function(form, event)  called after a valid submit; the
                                     default submit is always prevented
*/

import { onReady } from './lib/ready.js';
import { resolveAll } from './lib/dom.js';

const DEFAULTS = {
    form: '.sds-contact-form',
    fields: '[required]',
    submitError: '.sds-form-submit-error',
    messages: {
        blank: "This field can't be left blank",
        email: 'Please enter a valid email address',
    },
    onValid: null,
};

let initialized = false;

// x@y.z — something before @, a domain, a dot, a TLD
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setError(input, message) {
    const field = input.closest('.sds-form-field');
    if (!field) return;
    const errorText = field.querySelector('.sds-form-error-text');
    if (errorText) errorText.textContent = message;
    field.classList.add('sds-form-field--error');
    input.setAttribute('aria-invalid', 'true');
}

function clearError(input) {
    const field = input.closest('.sds-form-field');
    if (field) field.classList.remove('sds-form-field--error');
    input.setAttribute('aria-invalid', 'false');
}

export function initContactForm(options = {}) {
    if (initialized) return;
    initialized = true;

    const config = {
        ...DEFAULTS,
        ...options,
        messages: { ...DEFAULTS.messages, ...options.messages },
    };

    // Returns the error message for a field, or null if it is valid
    function fieldError(input) {
        const value = input.value.trim();
        if (value.length === 0) return config.messages.blank;
        if (input.type === 'email' && !isValidEmail(value)) return config.messages.email;
        return null;
    }

    function setupForm(form) {
        const inputs = resolveAll(config.fields, form);
        const submitError = form.querySelector(config.submitError);

        function showSubmitError() {
            if (submitError) submitError.style.display = 'flex';
        }

        function hideSubmitError() {
            if (submitError) submitError.style.display = '';
        }

        // Full submit-time check across all required fields
        function validateAll() {
            let valid = true;
            inputs.forEach(input => {
                const message = fieldError(input);
                if (message) {
                    setError(input, message);
                    valid = false;
                } else {
                    clearError(input);
                }
            });
            return valid;
        }

        // Clear field errors as soon as the user starts correcting them.
        // Also dismiss the submit-level message — they've acknowledged it.
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (input.value.trim().length > 0) clearError(input);
                hideSubmitError();
            });
        });

        // Submit — validate everything, block if invalid
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (validateAll()) {
                hideSubmitError();
                if (typeof config.onValid === 'function') config.onValid(form, e);
            } else {
                showSubmitError();
            }
        });
    }

    onReady(() => resolveAll(config.form).forEach(setupForm));
}

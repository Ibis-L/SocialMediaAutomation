/**
 * Auto-Slug for PortalState / PortalCity inlines.
 * When the user picks a State or City from the autocomplete dropdown,
 * this script auto-fills the url_slug field with a slugified version
 * of the selected name. The user can still override it manually.
 *
 * Django admin's autocomplete_fields use Select2, which fires
 * jQuery 'select2:select' events — we listen for those.
 */
(function () {
    'use strict';

    function slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')       // spaces → hyphens
            .replace(/[^\w\-]+/g, '')    // remove non-word chars
            .replace(/\-\-+/g, '-')      // collapse multiple hyphens
            .replace(/^-+/, '')          // trim leading hyphens
            .replace(/-+$/, '');         // trim trailing hyphens
    }

    function getSlugInputForRow(row) {
        return row.querySelector('input[name*="url_slug"]');
    }

    function handleSelection(row, selectedText) {
        var slugInput = getSlugInputForRow(row);
        if (!slugInput) return;

        // Don't overwrite if user has manually typed something
        if (slugInput.dataset.userEdited === 'true' && slugInput.value.trim() !== '') return;

        // For city options, the text may be "CityName, StateName" — take just the first part
        var name = selectedText.split(',')[0].trim();
        slugInput.value = slugify(name);
    }

    function attachToRow(row) {
        if (row.dataset.autoSlugBound) return;
        row.dataset.autoSlugBound = 'true';

        var slugInput = getSlugInputForRow(row);
        if (!slugInput) return;

        // Track manual edits
        slugInput.addEventListener('input', function () {
            slugInput.dataset.userEdited = 'true';
        });

        // Listen for Select2 events on any select in this row
        // Django uses jQuery + Select2, so we use jQuery events
        if (window.django && window.django.jQuery) {
            var $ = window.django.jQuery;
            $(row).find('select[name*="state"], select[name*="city"]').on('select2:select', function (e) {
                var text = e.params.data.text || '';
                handleSelection(row, text);
            });
        }

        // Also listen for native change events as fallback
        var selects = row.querySelectorAll('select[name*="state"], select[name*="city"]');
        selects.forEach(function (sel) {
            sel.addEventListener('change', function () {
                var selectedOption = sel.options[sel.selectedIndex];
                if (selectedOption && selectedOption.text && selectedOption.value) {
                    handleSelection(row, selectedOption.text);
                }
            });
        });
    }

    function setupAll() {
        // Find all inline rows
        var rows = document.querySelectorAll(
            '.dynamic-portal_states, .dynamic-portal_cities, ' +
            'tr[id*="portal_states"], tr[id*="portal_cities"]'
        );
        rows.forEach(attachToRow);
    }

    // Observe for dynamically added rows (when user clicks "Add another")
    function observeNewRows() {
        var inlineGroups = document.querySelectorAll('.inline-group');
        inlineGroups.forEach(function (group) {
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            // Check if the node itself is a row
                            if (node.matches && (
                                node.matches('.dynamic-portal_states') ||
                                node.matches('.dynamic-portal_cities') ||
                                node.matches('tr[id*="portal_states"]') ||
                                node.matches('tr[id*="portal_cities"]')
                            )) {
                                // Wait a tick for Select2 to initialize
                                setTimeout(function () { attachToRow(node); }, 200);
                            }
                            // Also check children
                            var childRows = node.querySelectorAll(
                                '.dynamic-portal_states, .dynamic-portal_cities, ' +
                                'tr[id*="portal_states"], tr[id*="portal_cities"]'
                            );
                            childRows.forEach(function (r) {
                                setTimeout(function () { attachToRow(r); }, 200);
                            });
                        }
                    });
                });
            });
            observer.observe(group, { childList: true, subtree: true });
        });
    }

    // Run after page is ready and Select2 is initialized
    function init() {
        setupAll();
        observeNewRows();
    }

    // Django admin loads jQuery and Select2 asynchronously, so wait a bit
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(init, 500);
        });
    } else {
        setTimeout(init, 500);
    }

    // Extra safety: also run after 1.5s
    setTimeout(init, 1500);
})();

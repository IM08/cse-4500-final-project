/**
 * CSE 4500 - Platform Computing | Final Project: Image Portfolio
 * script.js — Client-side interactivity
 * Authors: Dylan (Chud), Solomon Smith
 * Last updated: 2026-04-30
 *
 * Responsibilities:
 *   - Accordion expand/collapse for all .expandable sections
 *   - Tap-to-flip cards on touch/mobile devices
 *   - Hamburger menu toggle for mobile navigation
 *   - Modal open/close utilities (reserved for future lightbox feature)
 */


/* =============================================================================
   ACCORDION — EXPANDABLE SECTIONS
   Queries all .section-header elements and attaches a click listener to each.
   On click: reads the sibling .section-content's scrollHeight and sets it as
   max-height so the CSS transition can animate the expand/collapse smoothly.
============================================================================= */
const headers = document.querySelectorAll(".section-header");

headers.forEach(header => {
    header.addEventListener("click", () => {
        const content = header.nextElementSibling;
        const toggle = header.querySelector(".toggle");

        if (content.style.maxHeight) {
            // Collapse: clear max-height so CSS transition animates to 0
            content.style.maxHeight = null;
            toggle.textContent = "+";
        } else {
            // Expand: set max-height to the element's full scroll height
            content.style.maxHeight = content.scrollHeight + "px";
            toggle.textContent = "-";
        }
    });
});


/* =============================================================================
   TAP-TO-FLIP — MOBILE CARD INTERACTION
   On touch devices (hover: none), CSS hover rules don't fire, so flipping is
   handled here by toggling the .flipped class. The CSS @media (hover: none)
   block defines the transform for .card.flipped .card-inner.
============================================================================= */
const cards = document.querySelectorAll(".card");

cards.forEach(card => {
    card.addEventListener("click", () => {
        card.classList.toggle("flipped");
    });
});


/* =============================================================================
   HAMBURGER MENU — MOBILE NAVIGATION TOGGLE
   Toggles the .active class on #nav-links. CSS shows/hides the link list
   based on whether .active is present.
============================================================================= */
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});


/* =============================================================================
   MODAL UTILITIES
   Generic show/hide helpers for overlay modals. Reserved for the planned
   image lightbox feature (Phase 2). Kept here so the pattern is available
   without re-implementing from scratch.

   Usage:
     showModal("my-modal-id")   — sets display: block on the element
     hideModal("my-modal-id")   — sets display: none on the element
     modalClicked(event)        — call via onclick on the modal backdrop element
                                  to close when user clicks outside the content box
============================================================================= */
function showModal(modalName) {
    document.getElementById(modalName).style.display = "block";
}

function hideModal(modalName) {
    document.getElementById(modalName).style.display = "none";
}

function modalClicked(event) {
    if (event.target.className === "modal") {
        hideModal(event.target.id);
    }
}

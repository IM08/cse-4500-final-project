// Accordion / Expandable Sections
const headers = document.querySelectorAll(".section-header");

headers.forEach(header => {
    header.addEventListener("click", () => {
        const content = header.nextElementSibling;
        const toggle = header.querySelector(".toggle");

        if (content.style.maxHeight) {
            // Collapse
            content.style.maxHeight = null;
            toggle.textContent = "+";
        } else {
            // Expand
            content.style.maxHeight = content.scrollHeight + "px";
            toggle.textContent = "-";
        }
    });
});

// Make cards tap-to-flip on mobile
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });
});

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Functions to show or hide a custom modal dialog. Remove later if unneeded
function showModal(modalName) {
    document.getElementById(modalName).style.display = "block";
}

function hideModal(modalName) {
    document.getElementById(modalName).style.display = "none";
}

// Hides modal if user clicked outside its borders
function modalClicked(event) {
    if (event.target.className == "modal") {
        // User clicked modal background, not content
        let modalName = event.target.id;
        hideModal(modalName);
    }
}
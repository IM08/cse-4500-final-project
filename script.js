// Use this for global javascript

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
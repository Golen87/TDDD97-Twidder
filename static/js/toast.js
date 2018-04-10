/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script handles the toast pop up message.
 */

// Show toast message
function showToast(message, persist=false) {
	var toast = document.getElementById("toast");

	toast.className = "show";
	toast.innerHTML = message;

	if (!persist) {
		setTimeout(function() {
			closeToast();
		}, 3000);
	}
}

// Remove toast message
function closeToast() {
	toast.className = toast.className.replace("show", "");
}

/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script initiates SPA and loads view saved from last session.
 */

window.onload = function() {
	var token = localStorage.getItem("token");
	var lastBrowsedEmail = localStorage.getItem("browser");

	if (token === null) {
		displayWelcome();
	} else {
		// If token exists, check if session is still valid
		loadCurrentUser(function(isSignedIn) {
			if (isSignedIn) {

				// Remember which tab the user was on
				var tab = localStorage.getItem("tab");

				if (tab == "account") {
					displayAccount();
				}
				else if (tab == "browse") {
					displayBrowse(!lastBrowsedEmail);

					if (lastBrowsedEmail) {
						loadBrowserUser(lastBrowsedEmail);
					}
				}
				else {
					displayHome();
				}

				connectWebSocket();

			} else {
				localStorage.removeItem("token");
				displayWelcome();
			}
		});
	}
};
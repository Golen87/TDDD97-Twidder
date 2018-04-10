/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script manages storage and loading of userdata from server.
 */

var globalUserdata = {
	"current": null,		// Signed in user
	"browser": null,		// Browsed user
	"messageBuffer": [],	// Usermessages to be added
}

// Loads userdata for the active user (upon signing in or refreshing the page)
function loadCurrentUser(callback) {
	getUserDataByToken(function(data) {
		var result = false;
		if (data) {
			globalUserdata["current"] = data;
			result = true;

			message_count = data["message_count"];
			page_views = data["page_views"];
			updateGraphData();
		}

		if (callback) {
			callback(result);
		}
	});
}

// Load userdata selected from browser
function loadBrowserUser(email) {
	if (email == getUserdata("current", "email")) {
		return displayHome();
	}

	getUserDataByEmail(email, function(userdata) {
		if (userdata) {
			globalUserdata["browser"] = userdata;
			localStorage.setItem("browser", userdata["email"]);
			displayProfile("browser");
			displayHeader("browse");
		}
	});
}

// Clear stored userdata
function clearUserdata(user = null) {
	if (user) {
		globalUserdata[user] = null;
	} else {
		globalUserdata["current"] = null;
		globalUserdata["browser"] = null;
	}
	localStorage.removeItem("browser");
}

// Return value from userdata, if it exists
function getUserdata(user, key) {
	var success = true;

	if (typeof user !== "string") {
		return console.error("Invalid use of getUserdata:", user, key);
	}

	if (!globalUserdata[user]) {
		return console.error("Userdata not loaded");
	}

	if (key in globalUserdata[user]) {
		return globalUserdata[user][key];
	} else {
		return console.error("Userdata does not contain key:", key);
	}
}

// Get current user with profile in view
function getProfileUser() {
	if (globalUserdata["browser"])
		return "browser";
	return "current";
}
/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script manages WebSockets and the server socket protocol.
 * This includes live data management.
 */

// Current socket
var active_socket = null;

// Online status colors
const OFFLINE_STATUS_COLOR = "#BBBBBB";
const ONLINE_STATUS_COLOR = "#4CAF50";

// Live data values
var online_users = [];
var message_count = 0;
var page_views = 0;

var accountGraph = null;


// Web socket protocol
var socketMethods = {
	"success": success,
	"force_sign_out": force_sign_out,
	"notify_message": notify_message,
	"update_online_status": update_online_status,
	"update_page_views": update_page_views,
};


// On successful connection
function success(message) {
	console.log(message);
}

// On being forced to sign out
function force_sign_out(message) {
	localStorage.removeItem("token");
	clearUserdata();
	displayWelcome();
	showToast(message, true);
}

// On new message
function notify_message(message) {
	newMessageCallback(message);

	if (message["owner"] == getUserdata("current", "email")) {
		message_count += 1;
		updateGraphData();
	}
}

// On receiving online status for users
function update_online_status(online) {
	online_users = online;

	var dots = document.getElementsByClassName("onlineStatus");
	for (var i = 0; i < dots.length; i++) {
		dots[i].style.background = OFFLINE_STATUS_COLOR;
	}

	for (var i = 0; i < online.length; i++) {
		var div = document.getElementById(online[i]);
		if (div) {
			div.style.background = ONLINE_STATUS_COLOR;
		}
	}

	updateGraphData();
}

// On updated page view count
function update_page_views(count) {
	page_views = count;
	updateGraphData();
}


// Initialize web socket connection to server
function connectWebSocket() {
	if (!"WebSocket" in window) {
		console.error("WebSocket not supported");
		return;
	}

	if (active_socket || !globalUserdata["current"]) {
		return;
	}

	active_socket = new WebSocket("ws://" + document.domain + ":" + PORT + "/socket");

	active_socket.onopen = function(event) {
		console.log("onopen");
		var data = {
			token: localStorage.getItem("token"),
			email: getUserdata("current", "email"),
		};
		active_socket.send(JSON.stringify(data));
	}

	active_socket.onmessage = function (event) {
		var data = JSON.parse(event.data);
		console.log("onmessage", data);

		if (data.method in socketMethods) {
			socketMethods[data.method](data.message);
		} else {
			console.error("Unknown WebSocket method:", data.method);
		}
	};

	active_socket.onclose = function(event) {
		console.log("onclose");
		active_socket = null;
	};

	active_socket.onerror = function(event) {
		console.error("onerror", event.data, event);
	};
}
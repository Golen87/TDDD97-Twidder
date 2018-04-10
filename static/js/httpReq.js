/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script handles HTTP request management and protocol.
 */

REQ_SIGN_IN = "/sign_in";
REQ_SIGN_UP = "/sign_up";
REQ_SIGN_OUT = "/sign_out";
REQ_CHANGE_PASSWORD = "/change_password";
REQ_GET_USER_DATA_BY_TOKEN = "/get_user_data_by_token";
REQ_GET_USER_DATA_BY_EMAIL = "/get_user_data_by_email";
REQ_GET_USER_DATA_BY_SEARCH = "/get_user_data_by_search";
REQ_GET_USER_MESSAGES_BY_TOKEN = "/get_user_messages_by_token";
REQ_GET_USER_MESSAGES_BY_EMAIL = "/get_user_messages_by_email";
REQ_GET_USER_LIST = "/get_user_list";
REQ_POST_MESSAGE = "/post_message";

// Create a HTTP request and insert given data. Data is returned via callback.
function httpRequest(method, data, callback, userCallback=null) {
	var request = new XMLHttpRequest();
	request.open("POST", method, true);

	switch (method) {
		case REQ_SIGN_IN:
			request.setRequestHeader("email", data.email);
			request.setRequestHeader("password", data.password);
			break;
		case REQ_SIGN_UP:
			request.setRequestHeader("email", data.email);
			request.setRequestHeader("password", data.password);
			request.setRequestHeader("firstname", data.firstname);
			request.setRequestHeader("familyname", data.familyname);
			request.setRequestHeader("gender", data.gender);
			request.setRequestHeader("city", data.city);
			request.setRequestHeader("country", data.country);
			break;
		case REQ_SIGN_OUT:
			request.setRequestHeader("token", data.token);
			break;
		case REQ_CHANGE_PASSWORD:
			request.setRequestHeader("token", data.token);
			request.setRequestHeader("oldPassword", data.oldPassword);
			request.setRequestHeader("newPassword", data.newPassword);
			break;
		case REQ_GET_USER_DATA_BY_TOKEN:
			request.setRequestHeader("token", data.token);
			break;
		case REQ_GET_USER_DATA_BY_EMAIL:
			request.setRequestHeader("token", data.token);
			request.setRequestHeader("email", data.email);
			break;
		case REQ_GET_USER_DATA_BY_SEARCH:
			request.setRequestHeader("token", data.token);
			request.setRequestHeader("query", data.query);
			break;
		case REQ_GET_USER_MESSAGES_BY_TOKEN:
			request.setRequestHeader("token", data.token);
			break;
		case REQ_GET_USER_MESSAGES_BY_EMAIL:
			request.setRequestHeader("token", data.token);
			request.setRequestHeader("email", data.email);
			break;
		case REQ_GET_USER_LIST:
			request.setRequestHeader("token", data.token);
			break;
		case REQ_POST_MESSAGE:
			request.setRequestHeader("token", data.token);
			request.setRequestHeader("email", data.email);
			request.setRequestHeader("content", data.content);
			break;
		default:
			break;
	}

	request.onreadystatechange = function() {
		if (request.readyState == 4 && request.status == 200) {
			callback(JSON.parse(request.responseText), userCallback);

			// Attempt to re-establish socket connection if server broke it
			if (!active_socket) {
				connectWebSocket();
			}
		}
	}

	request.send();
}

/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script contains the complete API to the server methods.
 * Each method collects necessary data, sends request, and returns data via callbacks.
 */

const PORT = 34447;


// -> {"success": true, "message": "Successfully signed in.", "data": token}
// -> {"success": false, "message": "Wrong username or password."}
// -> {"success": false, "message": "You are already signed in."}
function signIn() {
	var data = {
		email:		document.forms['signInForm']['email'].value,
		password:	document.forms['signInForm']['password'].value,
	};

	httpRequest(REQ_SIGN_IN, data, onSignIn);
}

function onSignIn(result) {
	showToast(result.message);

	if (result.success) {
		localStorage.setItem("token", result.data);
		clearUserdata();
		loadCurrentUser(function() {
			displayHome();

			connectWebSocket();
		});
	}
}


// -> {"success": true, "message": "Successfully created a new user."}
// -> {"success": false, "message": "Form data missing or incorrect type."}
// -> {"success": false, "message": "User already exists."}
// -> {"success": false, "message": "You are already signed in."}
function signUp() {
	var data = {
		email:		document.forms['signUpForm']['email'].value,
		password:	document.forms['signUpForm']['password'].value,
		firstname:	document.forms['signUpForm']['firstname'].value,
		familyname:	document.forms['signUpForm']['familyname'].value,
		gender:		document.forms['signUpForm']['gender'].value,
		city:		document.forms['signUpForm']['city'].value,
		country:	document.forms['signUpForm']['country'].value,
	};

	httpRequest(REQ_SIGN_UP, data, onSignUp);
}

var onSignUp = function(result) {
	showToast(result.message);

	if (result.success) {
		var data = {
			email:		document.forms['signUpForm']['email'].value,
			password:	document.forms['signUpForm']['password'].value,
		};

		httpRequest(REQ_SIGN_IN, data, onSignIn);
	}
}


// -> {"success": true, "message": "Successfully signed out."}
// -> {"success": false, "message": "You are not signed in."}
function signOut() {
	var data = {
		token:	localStorage.getItem("token")
	};

	httpRequest(REQ_SIGN_OUT, data, onSignOut);
}

function onSignOut(result) {
	showToast(result.message);

	localStorage.removeItem("token");
	clearUserdata();
	displayWelcome();
}


// -> {"success": true, "message": "Password changed."}
// -> {"success": false, "message": "Wrong password."}
// -> {"success": false, "message": "You are not logged in."}
function changePassword(oldPassword, newPassword) {
	var data = {
		token:			localStorage.getItem("token"),
		oldPassword:	document.forms['changePasswordForm']['current'].value,
		newPassword:	document.forms['changePasswordForm']['new'].value,
	};

	httpRequest(REQ_CHANGE_PASSWORD, data, onChangePassword);
}

function onChangePassword(result) {
	showToast(result.message);

	if (result.success) {
		document.forms['changePasswordForm'].reset();
	}
}


// -> {"success": true, "message": "User data retrieved.", "data": match}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function getUserDataByToken(callback) {
	var data = {
		token:	localStorage.getItem("token")
	};

	httpRequest(REQ_GET_USER_DATA_BY_TOKEN, data, onGetData, callback);
}

// -> {"success": true, "message": "User data retrieved.", "data": match}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function getUserDataByEmail(email, callback) {
	var data = {
		token:	localStorage.getItem("token"),
		email:	email,
	};

	httpRequest(REQ_GET_USER_DATA_BY_EMAIL, data, onGetData, callback);
}

// -> {"success": true, "message": "User data retrieved.", "data": match}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function getUserDataBySearch(query, callback) {
	var data = {
		token:	localStorage.getItem("token"),
		query:	query,
	};

	httpRequest(REQ_GET_USER_DATA_BY_SEARCH, data, onGetData, callback);
}

// -> {"success": true, "message": "User messages retrieved.", "data": match}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function getUserMessagesByToken(callback) {
	var data = {
		token:	localStorage.getItem("token")
	};

	httpRequest(REQ_GET_USER_MESSAGES_BY_TOKEN, data, onGetData, callback);
}

// -> {"success": true, "message": "User messages retrieved.", "data": match}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function getUserMessagesByEmail(email, callback) {
	var data = {
		token:	localStorage.getItem("token"),
		email:	email,
	};

	httpRequest(REQ_GET_USER_MESSAGES_BY_EMAIL, data, onGetData, callback);
}

// -> {"success": true, "message": "User list retrieved.", "data": matches}
// -> {"success": false, "message": "You are not signed in."}
function getUserList(callback) {
	var data = {
		token:	localStorage.getItem("token"),
	};

	httpRequest(REQ_GET_USER_LIST, data, onGetData, callback);
}

function onGetData(result, callback) {
	if (!result.success) {
		showToast(result.message);
	}
	if (callback) {
		callback(result.data);
	}
}


// -> {"success": true, "message": "Message posted"}
// -> {"success": false, "message": "No such user."}
// -> {"success": false, "message": "You are not signed in."}
function postMessage() {
	var data = {
		token:			localStorage.getItem("token"),
		email:			getUserdata(getProfileUser(), "email"),
		content:		document.forms['msgInputForm']['message'].value,
	};

	if (data.content.length >= 1 && data.content.length <= 500) {
		data.content = escape(data.content);

		httpRequest(REQ_POST_MESSAGE, data, function(result) {
			onPostMessage(result, data);
		});
	} else if (data.content.length >= 1) {
		showToast("Your message is too long.");
	}
}

function onPostMessage(result, data) {
	showToast(result.message);

	if (result.success) {
		document.forms['msgInputForm'].reset();
	}
}

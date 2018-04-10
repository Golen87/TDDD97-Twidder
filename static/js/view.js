/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script manages Single-Page-Application view management and HTML element insertion.
 */

var msgNotisCount = 0;


// Load template into view
function displayView(view) {
	var template = document.getElementById(view);
	if (template) {
		document.getElementById("view").innerHTML = template.innerHTML;
	} else {
		document.getElementById("view").innerHTML = "";
	}
}


/* Tabs */

// Load welcome view: sign in and sign up
function displayWelcome() {
	displayView("welcomeView");
	document.getElementById("header").innerHTML = "";
}

// Load account view: account settings
function displayAccount() {
	clearUserdata("browser");

	displayView("accountView");
	displayHeader("account");

	loadProfileInfo("current");
	loadGraph();
}

// Load home view: user profile and messages
function displayHome() {
	clearUserdata("browser");

	displayProfile("current");
	displayHeader("home");
}

// Load browser view: user searching
function displayBrowse(searchUsers=true) {
	clearUserdata("browser");

	displayView("browseView");
	displayHeader("browse");

	if (searchUsers) {
		addLoadingIcon("searchResults");

		getUserList(function(users) {
			var div = document.getElementById("searchResults");
			if (div) {
				div.innerHTML = "";
			}

			if (users) {
				for (var i = 0; i < users.length; i++) {
					addSearchResult(users[i]);
				}
			} else {
				msg = "No results."
				div.insertAdjacentHTML("beforeend", msg);
			}
		});
	}
}


/* Header */

// Load navigation header with current user info
function displayHeader(tab) {
	localStorage.setItem("tab", tab);

	var email = getUserdata("current", "email");

	var div = document.getElementById("header");
	if (div) {
		div.innerHTML = "";

		var tabs = document.createElement("div");
		tabs.innerHTML = document.getElementById("headerTemplate").innerHTML;

		generateAvatar(tabs.querySelector(".headerAvatar"), email);
		tabs.querySelector(".headerName").innerText = email;

		function toggleSelect(name, id) {
			if (name == tab) {
				tabs.querySelector(id).classList.add("selected");
			} else {
				tabs.querySelector(id).classList.remove("selected");
			}
		}
		toggleSelect("home", "#homeButton");
		toggleSelect("browse", "#browseButton");
		toggleSelect("account", "#currentAccount");

		div.appendChild(tabs);

		setMsgNotis(msgNotisCount);
	}
}


/* Profile */

// Load profile box (and messages) into view
function displayProfile(user) {
	displayView("homeView");

	loadProfileInfo(user);
	loadMessages(user);

	document.getElementById("msgInput").focus();
}

// Load profile info from userdata
function loadProfileInfo(userdata) {
	var firstname = getUserdata(userdata, "firstname");
	var familyname = getUserdata(userdata, "familyname");
	var gender = getUserdata(userdata, "gender");
	var country = getUserdata(userdata, "country");
	var city = getUserdata(userdata, "city");
	var email = getUserdata(userdata, "email");
	var registerDate = getUserdata(userdata, "registerDate");

	addProfileInfo(firstname, familyname, gender, country, city, email, registerDate);
}

// Insert profile data into profile container
function addProfileInfo(firstname, familyname, gender, country, city, email, registerDate) {
	var div = document.getElementById("profileInfo");
	if (div) {

		var info = document.createElement("div");
		info.innerHTML = document.getElementById("profileInfoTemplate").innerHTML;

		registerDate = vagueTime.get({
			to: registerDate*1000,
			from: Date.now(),
		});

		generateAvatar(info.querySelector(".profileAvatar"), email);
		info.querySelector(".profileName").innerText = firstname + "\n" + familyname;
		info.querySelector(".accountGender").innerText = gender;
		info.querySelector(".accountCountry").innerText = country;
		info.querySelector(".accountCity").innerText = city;
		info.querySelector(".accountEmail").innerText = email;
		info.querySelector(".accountRegister").innerText = registerDate;

		var dot = info.querySelector(".onlineStatus");
		dot.id = email;
		dot.style.background = OFFLINE_STATUS_COLOR;
		if (online_users && online_users.indexOf(email) != -1) {
			dot.style.background = ONLINE_STATUS_COLOR;
		}

		div.appendChild(info);
	}
}


/* Messages */

// Load messages from server and insert all into message container
function loadMessages(user) {
	var email = getUserdata(user, "email");
	addLoadingIcon("messages");

	if (user == "current") {
		setMsgNotis(0);
	}

	globalUserdata.messageBuffer = [];

	getUserMessagesByEmail(email, function(messages) {
		if (!messages)
			return;

		globalUserdata.messageBuffer = messages;

		var div = document.getElementById("messages");
		if (div) {
			div.innerHTML = "";

			if (messages.length == 0) {
				msg = "No messages."
				div.insertAdjacentHTML("beforeend", msg);
			}
		}

		var msgCount = 0;
		while (globalUserdata.messageBuffer.length > 0 && msgCount < 20) {
			var message = globalUserdata.messageBuffer.shift();
			addMessage(
				message["author"],
				message["content"],
				message["timestamp"]
			);

			msgCount += 1;
		}
	});
}

// Add one message instance and insert data
function addMessage(email, message, timestamp, reverseAppend=false) {
	var div = document.getElementById("messages");
	if (div) {

		var msg = document.createElement("div");
		msg.innerHTML = document.getElementById("msgTemplate").innerHTML;

		timestamp = vagueTime.get({
			to: timestamp*1000,
			from: Date.now(),
		});

		generateAvatar(msg.querySelector(".msgAvatar"), email);
		msg.querySelector(".msgName").innerText = email;
		msg.querySelector(".msgText").innerText = message;
		msg.querySelector(".msgTime").innerText = timestamp;

		msg.querySelector(".msgText").innerHTML = convertUrlToLinks(msg.querySelector(".msgText").innerHTML);

		if (email != getUserdata(getProfileUser(), "email")) {
			var box = msg.querySelector(".msgName");
			box.className += " clickable";
			box.onclick = function() {
				loadBrowserUser(email)
			};
		}

		if (reverseAppend) {
			div.insertBefore(msg, div.childNodes[0]);
			msg.classList.add('flash');
		} else {
			div.appendChild(msg);
		}
	}
}

// Dynamically load more messages into container
function dynamicMessageLoading() {
	var element = document.getElementById('messages');
	if (element.scrollHeight - element.scrollTop === element.clientHeight) {

		var msgCount = 0;
		while (globalUserdata.messageBuffer.length > 0 && msgCount < 20) {
			var message = globalUserdata.messageBuffer.shift();
			addMessage(
				message["author"],
				message["content"],
				message["timestamp"]
			);

			msgCount += 1;
		}
	}
}

// Callback upon receiving new message from server
function newMessageCallback(message) {
	if (message["owner"] == getUserdata(getProfileUser(), "email")) {
		addMessage(
			message["author"],
			message["content"],
			message["timestamp"],
			true
		);
	}

	if (message["owner"] == getUserdata("current", "email") && localStorage.getItem("tab") != "home")
	{
		setMsgNotis(msgNotisCount + 1);
	}
}

function setMsgNotis(count) {
	var home = document.getElementById("homeButton");
	if (home) {
		var dot = home.querySelector(".notificationDot");
		msgNotisCount = count;
		dot.innerHTML = count;
		dot.style.visibility = (count > 0) ? "visible" : "hidden";
	}
}


/* Browse */

// Load search results and insert all into search container
function searchUsers() {
	var query = document.forms['searchUserForm']['query'].value;

	addLoadingIcon("searchResults");

	getUserDataBySearch(query, function(users) {
		var div = document.getElementById("searchResults");
		if (div) {
			div.innerHTML = "";
		}

		if (users) {
			for (var i = 0; i < users.length; i++) {
				addSearchResult(users[i]);
			}
		} else {
			msg = "No results."
			div.insertAdjacentHTML("beforeend", msg);
		}
	});
}

// Add one search result instance into container
function addSearchResult(userdata) {
	var email = userdata["email"];
	var city = userdata["city"];
	var country = userdata["country"];
	var email = userdata["email"];
	var familyname = userdata["familyname"];
	var firstname = userdata["firstname"];
	var gender = userdata["gender"];
	var registerDate = userdata["registerDate"];

	var div = document.getElementById("searchResults");
	if (div) {

		var user = document.createElement("div");
		user.innerHTML = document.getElementById("searchResultTemplate").innerHTML;

		registerDate = vagueTime.get({
			to: registerDate*1000,
			from: Date.now(),
		});

		generateAvatar(user.querySelector(".msgAvatar"), email);
		user.querySelector(".msgName").innerText = email;
		user.querySelector(".msgTime").innerText = "from " + country;
		user.querySelector(".msgText").innerText = "Joined " + registerDate;

		var box = user.querySelector(".searchResultBox");
		box.className += " clickable";
		box.onclick = function() {
			loadBrowserUser(email);
		};

		div.insertBefore(user, div.childNodes[0]);
	}
}


/* Additional graphics */

// Return avatar url based on email hash
function generateAvatar(element, email) {
	if (element.tagName == "IMG") {
		var url = "http://identicon.org/?t={email}&s={size}";

		url = url.replace("{email}", email);
		url = url.replace("{size}", Math.max(element.width, element.height));

		element.src = url;
	}
}

// Insert loading animation while request is processing
function addLoadingIcon(id) {
	var div = document.getElementById(id);
	if (div) {
		div.innerHTML = "";

		msg = '<img class="loading" src="images/loading.svg">';
		div.insertAdjacentHTML("beforeend", msg);
	}
}

// Load account graph
function loadGraph() {
	var ctx = document.getElementById("myChart").getContext('2d');
	accountGraph = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: ["Users online", "Posts on wall", "Profile views"],
	        datasets: [{
	            label: '',
	            data: [0, 0, 0],
	            backgroundColor: [
	                'rgba(255, 99, 132, 0.2)',
	                'rgba(54, 162, 235, 0.2)',
	                'rgba(255, 206, 86, 0.2)'
	            ],
	            borderColor: [
	                'rgba(255,99,132,1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(255, 206, 86, 1)'
	            ],
	            borderWidth: 2
	        }]
	    },
	    options: {
	        scales: {
	            yAxes: [{
	                ticks: {
	                    beginAtZero:true
	                }
	            }]
	        },
	        legend: {
				display: false
			}
	    }
	});

	updateGraphData();
}

// Update account graph with live data
function updateGraphData() {
	if (accountGraph) {
		accountGraph.data.datasets[0].data[0] = online_users.length;
		accountGraph.data.datasets[0].data[1] = message_count;
		accountGraph.data.datasets[0].data[2] = page_views;
		accountGraph.update();
	}
}
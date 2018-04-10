/* Copyright (c) 2018, Måns Gezelius
 * All rights reserved.
 *
 * This script contains additional utility functions.
 */

// Compare two input forms with custom validity message
function compareForm(input, other, message) {
	if (input.value != other.value) {
		input.setCustomValidity(message);
	} else {
		input.setCustomValidity('');
	}
}

// Replace urls in text to anchor tags
function convertUrlToLinks(text) {
	var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	text = text.replace(exp, "<a target='_blank' href='$1'>$1</a>");
	var exp2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
	text = text.replace(exp2, '$1<a target="_blank" href="http://$2">$2</a>');
	return text;
}
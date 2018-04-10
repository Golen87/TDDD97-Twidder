# -*- coding: utf-8 -*-
# Copyright (c) 2018, Måns Gezelius
# All rights reserved.
#
# This module handles WebSocket management and protocol.


import json

# Socket connections
active_sockets = {}

# Web socket protocol
WS_SUCCESS = "success"
WS_FORCE_SIGN_OUT = "force_sign_out"
WS_NEW_MESSAGE = "notify_message"
WS_UPDATE_ONLINE_STATUS = "update_online_status"
WS_UPDATE_PAGE_VIEWS = "update_page_views"


#--- Active sockets management ---#

# Add new socket connection
def add(new_token, new_email, socket):
	# Find existing connection and kick user
	for active_token in active_sockets:
		if new_email == active_sockets[active_token]["email"]:
			if new_token != active_token:
				force_sign_out(active_token)
			else:
				socket.close()

	if new_token not in active_sockets:
		active_sockets[new_token] = {
			"socket": socket,
			"email": new_email
		}

# Remove socket connection
def remove(token):
	if token in active_sockets:
		socket = active_sockets.pop(token, None)
		socket["socket"].close()

# Send data via socket using method protocol
def send(token, method, message=None):
	obj = {
		'method': method,
		'message': message
	}
	data = json.dumps(obj)
	if token in active_sockets:
		active_sockets[token]["socket"].send(data)

# Send data to all sockets
def send_all(method, data):
	for token in active_sockets:
		send(token, method, data)


#--- Protocol methods ---#

# Notify successful connection
def success(token, message):
	send(token, WS_SUCCESS, message)

# Notify user they have been signed out
def force_sign_out(token):
	send(token, WS_FORCE_SIGN_OUT, "You logged in from another location.")

# Notify new message
def notify_message(message):
	send_all(WS_NEW_MESSAGE, message)

# Notify online status to all users
def update_online_status():
	online = []
	for token in active_sockets:
		online.append(active_sockets[token]["email"])
	send_all(WS_UPDATE_ONLINE_STATUS, online)

# Notify user about their page view count
def update_page_views(token, page_views):
	send(token, WS_UPDATE_PAGE_VIEWS, page_views)

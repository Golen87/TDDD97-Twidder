# -*- coding: utf-8 -*-
# Copyright (c) 2018, Måns Gezelius
# All rights reserved.
#
# This module handles incoming server requests. Core back-end.


from flask import Flask, request, redirect, url_for
from geventwebsocket import WebSocketServer, WebSocketError
from geventwebsocket.handler import WebSocketHandler
from passlib.hash import sha256_crypt
from functools import wraps
import json, re, urllib

# Local modules
import database_helper as db
import websocket_helper as sockets

app = Flask(__name__, static_url_path='')

db.init_db(app)


#--- Decorators ---#

# Check if user signed in
def is_signed_in(f):
	@wraps(f)
	def wrap(*args, **kwargs):
		token = request.headers.get('token')
		if token and db.get_email_by_token(token):
			return f(*args, **kwargs)
		else:
			return json.dumps({'success': False, 'message': "You are no longer signed in."})
	return wrap

# Check if user not signed in
def is_not_signed_in(f):
	@wraps(f)
	def wrap(*args, **kwargs):
		token = request.headers.get('token')
		if token and db.get_email_by_token(token):
			return json.dumps({'success': False, 'message': "You are already signed in."})
		else:
			return f(*args, **kwargs)
	return wrap


#--- Methods ---#

# Root
@app.route('/')
def index():
	return app.send_static_file('client.html')

# Sign in
@app.route('/sign_in', methods=['POST'])
@is_not_signed_in
def sign_in():
	email = request.headers.get('email') # May be wrong case, be sure to use db
	password = request.headers.get('password')

	# Check if user exists
	user = db.get_user(email)
	if not user:
		return json.dumps({'success': False, 'message': "Wrong username or password."})

	# Check password
	if not sha256_crypt.verify(password, user['password']):
		return json.dumps({'success': False, 'message': "Wrong username or password."})

	# Generate token
	token = db.generate_token()

	# Already signed in
	old_token = db.get_token_by_email(user['email'])
	if old_token:
		sockets.force_sign_out(old_token)
		sockets.remove(old_token)
		db.remove_signed_in_user_by_token(old_token)

	# Add token to database
	db.add_signed_in_user(token, user['email'])
	return json.dumps({'success': True, 'message': "Successfully signed in.", 'data': token})

# Sign up
@app.route('/sign_up', methods=['POST'])
@is_not_signed_in
def sign_up():
	user = {
		'email':		request.headers.get('email'),
		'password':		request.headers.get('password'),
		'firstname':	request.headers.get('firstname'),
		'familyname':	request.headers.get('familyname'),
		'gender':		request.headers.get('gender'),
		'city':			request.headers.get('city'),
		'country':		request.headers.get('country'),
	}

	# Validate sign up form
	if not db.validate_user(user):
		return json.dumps({'success': False, 'message': "Form data missing or incorrect type."})

	# Check if email is taken
	if db.get_user(user['email']):
		return json.dumps({'success': False, 'message': "User already exists."})

	encrypted_password = sha256_crypt.encrypt(unicode(user['password']))
	db.add_user(
		user['email'],
		encrypted_password,
		user['firstname'],
		user['familyname'],
		user['gender'],
		user['city'],
		user['country']
	)
	return json.dumps({'success': True, 'message': "Successfully created a new user."})

# Sign out
@app.route('/sign_out', methods=['POST'])
@is_signed_in
def sign_out():
	token = request.headers.get('token')

	sockets.remove(token)

	db.remove_signed_in_user_by_token(token)
	return json.dumps({'success': True, 'message': "Successfully signed out."})

# Change password
@app.route('/change_password', methods=['POST'])
@is_signed_in
def change_password():
	token = request.headers.get('token')
	old_password = request.headers.get('oldPassword')
	new_password = request.headers.get('newPassword')

	email = db.get_email_by_token(token)
	user = db.get_user(email)

	# Compare encrypted password
	if not sha256_crypt.verify(str(old_password), user['password']):
		return json.dumps({'success': False, 'message': "Wrong password."})

	encrypted_password = sha256_crypt.encrypt(unicode(new_password))
	db.set_password(email, encrypted_password)
	return json.dumps({'success': True, 'message': "Password changed."})

# Get userdata (token), only called upon connection
@app.route('/get_user_data_by_token', methods=['POST'])
@is_signed_in
def get_user_data_by_token():
	token = request.headers.get('token')

	email = db.get_email_by_token(token)

	user = db.filter_user(db.get_user(email))
	if not user:
		return json.dumps({'success': False, 'message': "No such user."})

	# Add additional statistics
	messages = db.get_user_messages(email)
	user["message_count"] = len(messages)
	page_views = db.get_page_views(email)
	user["page_views"] = len(page_views)

	return json.dumps({'success': True, 'message': "User data retrieved.", 'data': user})

# Get userdata (email), page view
@app.route('/get_user_data_by_email', methods=['POST'])
@is_signed_in
def get_user_data_by_email():
	token = request.headers.get('token')
	email = request.headers.get('email')

	user = db.filter_user(db.get_user(email))
	if not user:
		return json.dumps({'success': False, 'message': "No such user."})

	# Update page views if user is visiting another user's profile
	visitorEmail = db.get_email_by_token(token)
	if email != visitorEmail:
		db.add_page_view(email, visitorEmail)
		page_views = db.get_page_views(email)
		owner_token = db.get_token_by_email(email)
		sockets.update_page_views(owner_token, len(page_views))

	return json.dumps({'success': True, 'message': "User data retrieved.", 'data': user})

# Get userdata (search query)
@app.route('/get_user_data_by_search', methods=['POST'])
@is_signed_in
def get_user_data_by_search():
	query = request.headers.get('query')

	users = db.filter_user(db.search_users(query))
	if not users:
		return json.dumps({'success': False, 'message': "No results."})

	return json.dumps({'success': True, 'message': "User data retrieved.", 'data': users})

# Get messages (token)
@app.route('/get_user_messages_by_token', methods=['POST'])
@is_signed_in
def get_user_messages_by_token():
	token = request.headers.get('token')

	email = db.get_email_by_token(token)
	messages = db.get_user_messages(email)
	return json.dumps({'success': True, 'message': "User messages retrieved.", 'data': messages})

# Get messages (email)
@app.route('/get_user_messages_by_email', methods=['POST'])
@is_signed_in
def get_user_messages_by_email():
	email = request.headers.get('email')

	messages = db.get_user_messages(email)
	if messages == None:
		return json.dumps({'success': False, 'message': "No such user."})

	return json.dumps({'success': True, 'message': "User messages retrieved.", 'data': messages})

# Get list of users
@app.route('/get_user_list', methods=['POST'])
@is_signed_in
def get_user_list():
	users = db.get_user_list()
	return json.dumps({'success': True, 'message': "User list retrieved.", 'data': users})

# Post message
@app.route('/post_message', methods=['POST'])
@is_signed_in
def post_message():
	token = request.headers.get('token')
	receiverEmail = request.headers.get('email')
	content = request.headers.get('content')

	# Convert encoded message to unicode
	def unescape(encodedText):
		encodedText = urllib.unquote(encodedText)
		encodedText = re.sub(r'%u([a-fA-F0-9]{4}|[a-fA-F0-9]{2})', lambda m: unichr(int(m.group(1), 16)), encodedText)
		return encodedText
	content = unescape(content)

	if len(content) > 1000:
		return json.dumps({'success': False, 'message': "Form data missing or incorrect type."})

	authorEmail = db.get_email_by_token(token)

	# Add message and notify users
	new_message = db.add_user_message(receiverEmail, authorEmail, content)
	print u"{}> {}: {}".format(new_message["owner"], new_message["author"], new_message["content"])
	sockets.notify_message(new_message)

	return json.dumps({'success': True, 'message': "Message posted"})


#--- Web socket connections ---#

# Request socket connection
@app.route('/socket')
def socket():
	ws = request.environ.get('wsgi.websocket')
	if not ws:
		print "! WebSocket failed to initialize"
		return "WebSocket failed to initialize"

	token, email = None, None

	try:
		# Await client confirmation
		data = ws.receive()
		try:
			message = json.loads(data)
			token = message['token']
			email = message['email']
		except:
			raise WebSocketError("WebSocket data missing or incorrect type")

		if not db.get_email_by_token(token):
			ws.send(json.dumps({'success': False, 'message': "You are not signed in."}))
			raise WebSocketError("User is not signed in")

		# Save connection
		sockets.add(token, email, ws)
		print "+ Connected with:", email, '({})'.format(request.remote_addr)

		sockets.success(token, "Connection established.")
		sockets.update_online_status()

		# Await client closing connection
		while True:
			data = ws.receive()
			if data == None:
				sockets.remove(token)
				break

	except WebSocketError as error:
		print "! WebSocketError:", error
	finally:
		print "- Disconnected from:", email
		ws.close()
		sockets.update_online_status()

	return ''

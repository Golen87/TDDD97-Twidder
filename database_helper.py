# -*- coding: utf-8 -*-
# Copyright (c) 2018, Måns Gezelius
# All rights reserved.
#
# This module manages communication between Python and the SQL database.


import sqlite3, random, time, threading
from flask import g

DB_PATH = 'database.db'


# Initialize database with scheme
def init_db(app):
	with app.app_context():
		db = get_db()
		with app.open_resource('schema.sql', mode='r') as f:
			db.cursor().executescript(f.read())
		db.commit()

# Return database. Create if it doesn't exist
def get_db(): 
	db = getattr(g, '_database', None)
	if db == None:
		db = g._database = sqlite3.connect(DB_PATH)
	return db

# Query database and return one or all results. Thread safe
def query_db(query, args=(), one=False):
	lock = get_lock()
	lock.acquire()

	db = get_db()
	cur = db.execute(query, args)
	result = cur.fetchall()
	cur.close()
	db.commit()

	lock.release()
	return (result[0] if result else None) if one else result

# Return database lock. Create if it doesn't exist
def get_lock():
	lock = getattr(g, '_lock', None)
	if lock is None:
		lock = g._lock = threading.Lock()
	return lock


#--- Users ---#

# Convert SQL tuple to user dict
def to_user(data):
	if data:
		return {
			'email': data[0],
			'password': data[1],
			'firstname': data[2],
			'familyname': data[3],
			'gender': data[4],
			'city': data[5],
			'country': data[6],
			'registerDate': data[7],
		}

# Convert multiple SQL tuples to user dicts
def to_user_array(data):
	result = []
	if data:
		result = [to_user(u) for u in data]
	return result

# Filter user before sending to client
def filter_user(user):
	if isinstance(user, list):
		return [filter_user(u) for u in user]
	if user:
		user.pop('password', None)
	return user

# Validate user prior to sign_up
def validate_user(user):
	def checkStr(key, minlen=1, maxlen=30):
		value = user[key]
		return isinstance(value, basestring) and minlen <= len(value) <= maxlen

	return (
		checkStr('email') and
		checkStr('password', 6) and # Pre encryption
		checkStr('firstname') and
		checkStr('familyname') and
		checkStr('gender') and
		checkStr('city') and
		checkStr('country')
	)

# Return user by email
def get_user(email):
	data = query_db('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email], True)
	return to_user(data)

# Return all users
def get_user_list():
	data = query_db('SELECT * FROM users')
	return [to_user(user) for user in data]

# Add new user to database
def add_user(email, password, firstname, familyname, gender, city, country):
	timestamp = time.time()
	query_db('INSERT INTO users(email, password, first_name, family_name, gender, city, country, register_date) VALUES (?,?,?,?,?,?,?,?)', [email, password, firstname, familyname, gender, city, country, timestamp])

# Change password for user
def set_password(email, new_password):
	query_db('UPDATE users SET password=? WHERE email=?', [new_password, email])

# Return users with data matching free text search
def search_users(query):
	results = query_db("""
		SELECT * FROM users WHERE
			LOWER(?) = LOWER(email) OR
			LOWER(?) = LOWER(first_name) OR
			LOWER(?) = LOWER(family_name) OR
			LOWER(?) = LOWER(city) OR
			LOWER(?) = LOWER(country)
		""", [query, query, query, query, query])
	
	return to_user_array(results)


#--- Messages ---#

# Convert SQL tuple to message dict
def to_message(data):
	if data:
		return {
			'owner': data[0],
			'author': data[1],
			'content': data[2],
			'timestamp': data[3],
		}

# Convert multiple SQL tuples to message dicts
def to_message_array(data):
	result = []
	if data:
		result = [to_message(m) for m in data[::-1]]
	return result

# Return user messages by email
def get_user_messages(email):
	data = query_db('SELECT * FROM messages WHERE LOWER(receiver_email) = LOWER(?)', [email])
	return to_message_array(data)

# Add new user message to database
def add_user_message(receiverEmail, authorEmail, content):
	timestamp = time.time()
	args = [receiverEmail, authorEmail, content, timestamp]
	query_db('INSERT INTO messages(receiver_email, author_email, content, timestamp) VALUES (?,?,?,?)', args)
	return to_message(args)


#--- Signed in users ---#

# Return email by token if user is signed in
def get_email_by_token(token):
	data = query_db('SELECT * FROM signed_in_users WHERE token = ?', [token], True)
	if data:
		return data[1]

# Return token by email if user is signed in
def get_token_by_email(email):
	data = query_db('SELECT * FROM signed_in_users WHERE LOWER(email) = LOWER(?)', [email], True)
	if data:
		return data[0]

# Add new signed in user to database
def add_signed_in_user(token, email):
	query_db('INSERT INTO signed_in_users(token, email) VALUES (?,?)', [token, email])

# Sign out user by token
def remove_signed_in_user_by_token(token):
	query_db('DELETE FROM signed_in_users WHERE token = ?', [token])

# Sign out user by email
def remove_signed_in_user_by_email(email):
	query_db('DELETE FROM signed_in_users WHERE email = ?', [email])


#--- Page views ---#

# Convert SQL tuple to page_view dict
def to_page_view(data):
	if data:
		return {
			'owner': data[0],
			'visitor': data[1],
			'timestamp': data[2],
		}

# Convert multiple SQL tuples to page_view dicts
def to_page_view_array(data):
	result = []
	if data:
		result = [to_page_view(p) for p in data]
	return result

# Return page views by email
def get_page_views(email):
	data = query_db('SELECT * FROM page_views WHERE LOWER(owner_email) = LOWER(?)', [email])
	return to_page_view_array(data)

# Add new page view to database
def add_page_view(ownerEmail, visitorEmail):
	timestamp = time.time()
	args = [ownerEmail, visitorEmail, timestamp]
	query_db('INSERT INTO page_views(owner_email, visitor_email, timestamp) VALUES (?,?,?)', args)
	return to_page_view(args)


#--- Token ---#

# Return unique token that's not in use
def generate_token():
	def gen():
		letters = 'abcdefghiklmnopqrstuvwwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
		return ''.join([random.choice(letters) for i in range(30)])

	token = gen()
	while get_email_by_token(token):
		token = gen()

	return token

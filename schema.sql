CREATE TABLE if NOT EXISTS users (
	email			VARCHAR(30) PRIMARY KEY,
	password		VARCHAR(30),
	first_name		VARCHAR(30),
	family_name		VARCHAR(30),
	gender			VARCHAR(30),
	city			VARCHAR(30),
	country			VARCHAR(30),
	register_date	TIMESTAMP
);

CREATE TABLE if NOT EXISTS signed_in_users (
	token			VARCHAR(30) PRIMARY KEY,
	email			VARCHAR(30)
);

CREATE TABLE if NOT EXISTS messages (
	receiver_email	VARCHAR(30),
	author_email	VARCHAR(30),
	content			text,
	timestamp		TIMESTAMP
);

CREATE TABLE if NOT EXISTS page_views (
	owner_email		VARCHAR(30),
	visitor_email	VARCHAR(30),
	timestamp		TIMESTAMP
);
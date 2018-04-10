#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Copyright (c) 2018, Måns Gezelius
# All rights reserved.
#
# This script creates and runs the server module.


from gevent.wsgi import WSGIServer
from server import *


if __name__ == '__main__':
	port = 34447

	server = WSGIServer(("", port), app, handler_class=WebSocketHandler)
	print "* Running on http://0.0.0.0:{}/".format(port)
	server.serve_forever()

	#app.run(debug=True, host='0.0.0.0', port=port, threaded=True)

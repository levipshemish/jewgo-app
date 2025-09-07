#!/usr/bin/env python3
import os
import sys
import gzip
import json
from flask import Flask, request, Response, jsonify
from functools import wraps

def compress_response(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = f(*args, **kwargs)
        accept_encoding = request.headers.get("Accept-Encoding", "")
        
        if "gzip" in accept_encoding and response.status_code == 200:
            if hasattr(response, "data"):
                data = response.data
            else:
                data = str(response.get_data())
            
            if len(data) > 1024:
                compressed_data = gzip.compress(data)
                if len(compressed_data) < len(data):
                    response = Response(
                        compressed_data,
                        status=response.status_code,
                        headers={
                            **response.headers,
                            "Content-Encoding": "gzip",
                            "Content-Length": str(len(compressed_data)),
                            "Vary": "Accept-Encoding"
                        }
                    )
        return response
    return decorated_function

def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

print("Backend compression enhancement script created")

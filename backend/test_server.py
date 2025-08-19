#!/usr/bin/env python3
"""Simple test server to verify Flask is working."""

from flask import Flask

app = Flask(__name__)

@app.route('/test')
def test():
    return {'message': 'Test server is working!'}

@app.route('/api/v4/marketplace/categories')
def test_categories():
    return {'message': 'Categories endpoint is working!'}

if __name__ == '__main__':
    print("Starting test server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)

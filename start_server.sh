#!/bin/bash
# Start a simple HTTP server on port 8000
echo "Starting local server at http://localhost:8000/gallery.html"
echo "Press Ctrl+C to stop."
python3 -m http.server 8000

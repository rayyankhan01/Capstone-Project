#!/bin/bash

# Start Gunicorn
gunicorn --workers 4 --bind 0.0.0.0:8000 app:app &

# Start Celery worker
celery -A app.celery worker --loglevel=info --concurrency=4 &

# Keep script running
wait
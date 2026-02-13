#!/bin/bash
# Azure App Service startup script for FastAPI
cd /home/site/wwwroot

# Ensure dependencies are installed
pip install -r requirements.txt

# Start with gunicorn + uvicorn worker (Azure standard)
gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 600

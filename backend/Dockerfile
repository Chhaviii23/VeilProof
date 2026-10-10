FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev tesseract-ocr libtesseract-dev tesseract-ocr-eng libgl1 libglib2.0-0 ffmpeg && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn[standard]

# Copy application
COPY . .

# Set up storage directories if using local storage
RUN mkdir -p /app/keys /app/storage/keys /app/storage/objects && chown -R 1000:1000 /app/keys /app/storage

# Run as non-root user
USER 1000:1000

ENV PORT=8000
ENV HOME=/tmp
EXPOSE 8000

# Start server
CMD ["gunicorn", "app.main:app", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]

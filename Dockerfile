FROM python:3.10-slim

WORKDIR /app

# Install system deps + Node
RUN apt-get update && apt-get install -y \
    nodejs npm curl git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Build React frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

# Create static folder and copy built frontend into it
RUN mkdir -p ./backend/static && cp -r frontend/dist/. ./backend/static/

# Copy backend code
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

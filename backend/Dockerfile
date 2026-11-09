
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

ENV DATA_FILE=/var/lib/backend_data/team_members.json

WORKDIR /app

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]

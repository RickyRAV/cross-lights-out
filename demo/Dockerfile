FROM python:3.13-alpine
RUN apk add --no-cache postgresql-client
COPY demo/present.py /app/present.py
CMD ["python", "-u", "/app/present.py"]

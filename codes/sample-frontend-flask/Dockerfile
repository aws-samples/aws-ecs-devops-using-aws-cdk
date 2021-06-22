FROM alpine:3.10

RUN apk add python3 py-pip && \
python3 -m ensurepip && \
pip install --upgrade pip && \
pip install flask && \
pip install requests

WORKDIR /app
COPY ./app/ /app/

CMD ["python", "main.py"]

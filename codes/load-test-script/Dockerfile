FROM alpine:3.10

RUN apk --no-cache add apache2-utils
RUN apk add --no-cache curl

CMD [ "mkdir", "/app" ]
COPY ./app/ /app/

WORKDIR /app

ENTRYPOINT [ "sh", "entrypoint.sh" ]

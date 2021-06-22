FROM alpine:3.10

RUN apk --no-cache add apache2-utils
RUN apk add --no-cache curl

WORKDIR /app
COPY ./app/ /app/


ENTRYPOINT [ "sh", "entrypoint.sh" ]

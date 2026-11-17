FROM golang:1.27-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download
RUN GODEBUG=http2client=0 CGO_ENABLED=0 go install github.com/pressly/goose/v3/cmd/goose@latest

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /usr/local/bin/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -o /usr/local/bin/indexer ./cmd/indexer

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /usr/local/bin/api /usr/local/bin/api
COPY --from=builder /usr/local/bin/indexer /usr/local/bin/indexer
COPY --from=builder /app/internal/database/migrations ./internal/database/migrations

ARG SERVER_PORT
EXPOSE ${SERVER_PORT}

CMD ["sh", "-c", "goose -dir ./internal/database/migrations postgres \"$DATABASE_URL\" up && exec /usr/local/bin/api"]

# Stage 1: Build the frontend (Vite React app)
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the Rust backend (Axum server with SQLite)
FROM rust:1-alpine AS backend-builder
# Install C compiler and musl-dev because rusqlite (with bundled feature) compiles libsqlite3 from C source
RUN apk add --no-cache musl-dev gcc
WORKDIR /app
# Cache dependencies by doing a dummy build
COPY server/Cargo.toml server/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src
# Copy the actual source files and build
COPY server/src ./src
RUN touch src/main.rs && cargo build --release

# Stage 3: Minimal runtime container
FROM alpine:3.19
WORKDIR /app
# Create data directory for the SQLite volume mount
RUN mkdir -p /data
# Copy the build artifacts
COPY --from=backend-builder /app/target/release/bookmark-server ./bookmark-server
COPY --from=frontend-builder /app/dist ./dist

# Set production env defaults
ENV PORT=3000
ENV DB_PATH=/data/bookmarks.db
ENV APP_TITLE=Bookmarks
ENV APP_ICON=/favicon.svg

EXPOSE 3000
VOLUME /data

CMD ["./bookmark-server"]

# Bookmarks

A secure, lightweight, and self-hostable bookmark manager to organize your web life. Built with a lightning-fast Rust backend (Axum + SQLite) and a modern, premium React frontend.

## Screenshots

### Desktop View
<img src="https://github.com/Akshad135/bookmarks/blob/main/public/desktop_demo.png" width="750" alt="Desktop View"/>

### Mobile View
<img src="https://github.com/Akshad135/bookmarks/blob/main/public/mobile_demo.png" width="250" alt="Mobile View"/>

---

## Features

- **Single Container Deployment**: The entire app (frontend assets + backend REST API + SQLite DB) is bundled into a single minimal Docker container.
- **Ultra-lightweight**: The final container image is only **~20MB**, consuming virtually zero idle CPU/RAM (~5MB memory).
- **Offline & PWA Support**: Full Progressive Web App features including service-worker caching, local IndexedDB database, and Android **Share Target** integration (share links directly to your app).
- **Simple, Strong Security**: Single-user deployment protected by an Argon2id-hashed password cookie, rate-limiting, and `HttpOnly`/`Strict` cookies.
- **Dynamic Customization**: Change your app's title, subtitle, and icon dynamically using Docker environment variables.

---

## Quick Start (Docker Compose)

The easiest way to run the app is using **Docker Compose**.

1. Create a `docker-compose.yml` file:

```yaml
services:
  bookmarks:
    image: akshad135/bookmarks:latest
    container_name: bookmark-manager
    ports:
      - "8080:3000" # Map to host port 8080 (or any other port you prefer)
    volumes:
      - bookmarks-data:/data
    environment:
      - PASSWORD=my-secure-password # Required: The access password for the app
      - APP_TITLE=My Bookmarks     # Optional: Sidebar/Navbar title
      - APP_SUBTITLE=Personal Shelf # Optional: Sidebar subtitle
      - APP_ICON=/favicon.svg      # Optional: Custom icon/avatar URL or path
    restart: unless-stopped

volumes:
  bookmarks-data:
```

2. Start the container:

```bash
docker compose up -d
```

3. Open your browser and navigate to `http://localhost:8080`. Log in using your configured password.

---

## Configuration Reference

All customization is handled via container environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PASSWORD` | **Yes** | — | The single-user access password (hashed with Argon2id on startup). |
| `APP_TITLE` | No | `"Bookmarks"` | Custom title displayed in the sidebar/navbar. |
| `APP_SUBTITLE` | No | `""` | Custom subtitle/description displayed below the title in the sidebar. |
| `APP_ICON` | No | `"/favicon.svg"` | URL or path to a custom icon or profile avatar image. |
| `PORT` | No | `3000` | The internal container port. |
| `DB_PATH` | No | `"/data/bookmarks.db"` | Internal database file location. |
| `SESSION_SECRET` | No | *Auto-generated* | Secret used to sign session cookies. Auto-generated on startup if not set. |

---

## Building from Source

You can build and package the application yourself using either **Docker** or **Podman**.

### Option A: Local Build (Docker)

```bash
# Build the container image
docker build -t bookmarks .

# Run the container
docker run -d \
  -p 8080:3000 \
  -e PASSWORD=my-secret-password \
  -v bookmarks-data:/data \
  --name bookmark-manager \
  bookmarks
```

### Option B: Local Build (Podman)

If you prefer to avoid the overhead of Docker Desktop:

```bash
# Build the image using Podman
podman build -t bookmarks .

# Run the container
podman run -d \
  -p 8080:3000 \
  -e PASSWORD=my-secret-password \
  -v bookmarks-data:/data \
  --name bookmark-manager \
  bookmarks
```

To push your locally built image to **Docker Hub** using Podman:

```bash
# Log in to Docker Hub
podman login docker.io

# Tag and push the image
podman tag bookmarks docker.io/YOUR_DOCKERHUB_USERNAME/bookmarks:latest
podman push docker.io/YOUR_DOCKERHUB_USERNAME/bookmarks:latest
```

---

## Automated CI/CD (GitHub Actions)

A GitHub Actions workflow is included in `.github/workflows/docker.yml` to automatically build multi-platform (`linux/amd64`, `linux/arm64`) images and push them to Docker Hub.

To enable this for your repository:

1. Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username.
   - `DOCKERHUB_TOKEN`: A Personal Access Token (PAT) generated in your Docker Hub account settings.
3. Every push to the `main` branch or a tag matching `v*` will trigger an automated build and push.

---

## PWA & Share Integration

To enable sharing links directly to Bookmarks from other applications (e.g. YouTube, Twitter, browser share sheets) on **Android**:

1. Open `http://<your-vps-ip>:<port>` in **Chrome Mobile** or **Samsung Internet**.
2. Tap the browser menu and select **Install app** or **Add to Home screen**.
3. Once installed, Bookmarks will appear in your device's native system **Share Sheet**. Select it to quickly bookmark any link with a single tap.
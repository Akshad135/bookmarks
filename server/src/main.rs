mod db;
mod middleware;
mod models;
mod routes;

use axum::{middleware::from_fn_with_state, Router};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::services::{ServeDir, ServeFile};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub struct AppState {
    pub db: std::sync::Mutex<rusqlite::Connection>,
    pub password_hash: String,
    pub config: models::AppConfig,
    pub rate_limiter: middleware::RateLimiter,
    pub sync_tx: tokio::sync::broadcast::Sender<()>,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bookmark_server=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Read environment variables
    let password = std::env::var("PASSWORD").expect("PASSWORD environment variable is required");
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".into())
        .parse()
        .expect("PORT must be a valid number");
    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "./data/bookmarks.db".into());

    let config = models::AppConfig {
        title: std::env::var("APP_TITLE").unwrap_or_else(|_| "Bookmarks".into()),
        subtitle: std::env::var("APP_SUBTITLE").unwrap_or_default(),
        icon: std::env::var("APP_ICON").unwrap_or_else(|_| "/favicon.svg".into()),
    };

    // Initialize database
    let conn = db::init_db(&db_path);
    tracing::info!("Database initialized at {}", db_path);

    // Hash password with Argon2id
    tracing::info!("Hashing password...");
    let password_hash = middleware::hash_password(&password);
    tracing::info!("Password hashed successfully");

    let (sync_tx, _) = tokio::sync::broadcast::channel(16);

    // Create shared application state
    let state = Arc::new(AppState {
        db: std::sync::Mutex::new(conn),
        password_hash,
        config,
        rate_limiter: middleware::RateLimiter::new(5, std::time::Duration::from_secs(60)),
        sync_tx,
    });

    // Build router: protected routes get the auth middleware layer
    let protected = routes::protected_router()
        .route_layer(from_fn_with_state(state.clone(), middleware::require_auth));

    let api = Router::new()
        .merge(routes::public_router())
        .merge(protected);

    let app = Router::new()
        .nest("/api", api)
        .fallback_service(
            ServeDir::new("./dist")
                .not_found_service(ServeFile::new("./dist/index.html")),
        )
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

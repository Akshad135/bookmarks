pub mod auth;
pub mod bookmarks;
pub mod collections;
pub mod config;
pub mod tags;
pub mod sync;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Router,
};
use serde::Serialize;
use std::sync::Arc;

use crate::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
}

/// GET /api/health
/// High-reliability health check verifying database mutex lockability and SQLite queryability.
pub async fn health(
    State(state): State<Arc<AppState>>,
) -> Result<axum::Json<HealthResponse>, crate::models::ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| crate::models::ApiError::internal("Database lock error"))?;

    conn.execute("SELECT 1", [])
        .map_err(|e| crate::models::ApiError::internal(format!("Database query error: {}", e)))?;

    Ok(axum::Json(HealthResponse { status: "ok" }))
}

/// Public routes — no auth required.
pub fn public_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/session", get(auth::session))
        .route("/config", get(config::get_config))
        .route("/health", get(health))
}

/// Protected routes — auth middleware is applied by the caller.
pub fn protected_router() -> Router<Arc<AppState>> {
    Router::new()
        // Bookmarks
        .route("/bookmarks", get(bookmarks::list).post(bookmarks::create))
        .route("/bookmarks/trash", delete(bookmarks::empty_trash))
        .route(
            "/bookmarks/:id",
            put(bookmarks::update).delete(bookmarks::delete),
        )
        // Collections
        .route(
            "/collections",
            get(collections::list).post(collections::create),
        )
        .route(
            "/collections/:id",
            put(collections::update).delete(collections::delete),
        )
        // Tags
        .route("/tags", get(tags::list).post(tags::create))
        .route("/tags/:id", put(tags::update).delete(tags::delete))
        // Sync
        .route("/sync/events", get(sync::events))
}

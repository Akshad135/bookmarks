pub mod auth;
pub mod bookmarks;
pub mod collections;
pub mod config;
pub mod tags;

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::AppState;

/// Public routes — no auth required.
pub fn public_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/session", get(auth::session))
        .route("/config", get(config::get_config))
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
}

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::models::AppConfig;
use crate::AppState;

/// GET /api/config
/// Returns the app configuration (title, subtitle, icon).
/// This is a public endpoint — no auth required.
pub async fn get_config(State(state): State<Arc<AppState>>) -> Json<AppConfig> {
    Json(state.config.clone())
}

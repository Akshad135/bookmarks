use axum::{
    extract::State,
    http::{header, HeaderMap},
    response::IntoResponse,
    Json,
};
use rusqlite::params;
use std::sync::Arc;

use crate::middleware;
use crate::models::{ApiError, AuthResponse, LoginRequest, OkResponse};
use crate::AppState;

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Rate limit check
    if !state.rate_limiter.is_allowed() {
        return Err(ApiError::too_many_requests());
    }

    // Verify password
    if !middleware::verify_password(&body.password, &state.password_hash) {
        state.rate_limiter.record_failure();
        return Err(ApiError::new(
            axum::http::StatusCode::UNAUTHORIZED,
            "Invalid password",
        ));
    }

    // Generate session token
    let token = middleware::generate_token();

    // Store session in database
    {
        let conn = state
            .db
            .lock()
            .map_err(|_| ApiError::internal("Database lock error"))?;
        conn.execute(
            "INSERT INTO sessions (token, created_at, expires_at) VALUES (?1, datetime('now'), datetime('now', '+30 days'))",
            params![token],
        )
        .map_err(|e| ApiError::internal(format!("Failed to create session: {}", e)))?;
    }

    // Set HttpOnly session cookie
    let cookie = middleware::session_cookie(&token);

    Ok((
        [(header::SET_COOKIE, cookie)],
        Json(AuthResponse {
            authenticated: true,
        }),
    ))
}

/// POST /api/auth/logout
pub async fn logout(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Delete session from DB if it exists
    if let Some(token) = middleware::get_session_token(&headers) {
        if let Ok(conn) = state.db.lock() {
            conn.execute("DELETE FROM sessions WHERE token = ?1", params![token])
                .ok();
        }
    }

    (
        [(header::SET_COOKIE, middleware::clear_session_cookie())],
        Json(OkResponse { ok: true }),
    )
}

/// GET /api/auth/session
pub async fn session(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Json<AuthResponse> {
    let authenticated = middleware::get_session_token(&headers)
        .map(|token| {
            let conn = match state.db.lock() {
                Ok(c) => c,
                Err(_) => return false,
            };
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sessions WHERE token = ?1 AND expires_at > datetime('now')",
                    params![token],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            count > 0
        })
        .unwrap_or(false);

    Json(AuthResponse { authenticated })
}

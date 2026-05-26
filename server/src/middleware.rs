use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use rusqlite::params;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::models::ApiError;
use crate::AppState;

// ── Password hashing ───────────────────────────────────────────────────────

/// Hash a password with Argon2id. Used once at startup.
pub fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("Failed to hash password")
        .to_string()
}

/// Verify a password against an Argon2id hash.
pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

// ── Session helpers ─────────────────────────────────────────────────────────

/// Generate a cryptographically random 256-bit hex session token.
pub fn generate_token() -> String {
    use rand::Rng;
    let bytes: [u8; 32] = rand::thread_rng().gen();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Extract the session token from the Cookie header.
pub fn get_session_token(headers: &axum::http::HeaderMap) -> Option<String> {
    let cookie_header = headers.get("cookie")?.to_str().ok()?;
    cookie_header
        .split(';')
        .find_map(|c| c.trim().strip_prefix("session=").map(|v| v.to_string()))
}

/// Build a Set-Cookie header value for a session.
pub fn session_cookie(token: &str) -> String {
    format!(
        "session={}; HttpOnly; SameSite=Strict; Path=/; Max-Age={}",
        token,
        30 * 24 * 60 * 60 // 30 days
    )
}

/// Build a Set-Cookie header that clears the session.
pub fn clear_session_cookie() -> String {
    "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0".to_string()
}

// ── Rate limiter ────────────────────────────────────────────────────────────

pub struct RateLimiter {
    state: std::sync::Mutex<RateLimitState>,
    max_attempts: u32,
    window: Duration,
}

struct RateLimitState {
    count: u32,
    window_start: Instant,
}

impl RateLimiter {
    pub fn new(max_attempts: u32, window: Duration) -> Self {
        Self {
            state: std::sync::Mutex::new(RateLimitState {
                count: 0,
                window_start: Instant::now(),
            }),
            max_attempts,
            window,
        }
    }

    /// Check whether another login attempt is allowed right now.
    pub fn is_allowed(&self) -> bool {
        let state = self.state.lock().unwrap();
        let now = Instant::now();

        if now.duration_since(state.window_start) > self.window {
            return true; // window expired
        }

        state.count < self.max_attempts
    }

    /// Record a failed login attempt.
    pub fn record_failure(&self) {
        let mut state = self.state.lock().unwrap();
        let now = Instant::now();

        if now.duration_since(state.window_start) > self.window {
            state.count = 1;
            state.window_start = now;
        } else {
            state.count += 1;
        }
    }
}

// ── Auth middleware ─────────────────────────────────────────────────────────

/// Axum middleware that validates the session cookie.
/// Returns 401 if no valid session is found.
pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let token = get_session_token(request.headers()).ok_or(ApiError::unauthorized())?;

    let is_valid = {
        let conn = state
            .db
            .lock()
            .map_err(|_| ApiError::internal("Database lock error"))?;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE token = ?1 AND expires_at > datetime('now')",
                params![token],
                |row| row.get(0),
            )
            .unwrap_or(0);
        count > 0
    };

    if !is_valid {
        return Err(ApiError::unauthorized());
    }

    Ok(next.run(request).await)
}

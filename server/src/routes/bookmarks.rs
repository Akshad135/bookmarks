use axum::{
    extract::{Path, State},
    Json,
};
use rusqlite::params;
use std::sync::Arc;

use crate::models::{ApiError, Bookmark, OkResponse, UpdateBookmark};
use crate::AppState;

/// Parse a SQLite row into a Bookmark.
fn row_to_bookmark(row: &rusqlite::Row) -> rusqlite::Result<Bookmark> {
    let tags_json: String = row.get("tags")?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    Ok(Bookmark {
        id: row.get("id")?,
        title: row.get("title")?,
        url: row.get("url")?,
        description: row.get("description")?,
        favicon: row.get("favicon")?,
        thumbnail: row.get("thumbnail")?,
        collection_id: row.get("collection_id")?,
        tags,
        is_favorite: row.get("is_favorite")?,
        is_archived: row.get("is_archived")?,
        is_trashed: row.get("is_trashed")?,
        is_pinned: row.get("is_pinned")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// GET /api/bookmarks
pub async fn list(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Bookmark>>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    let mut stmt = conn
        .prepare("SELECT * FROM bookmarks ORDER BY created_at DESC")
        .map_err(ApiError::from)?;

    let bookmarks = stmt
        .query_map([], |row| row_to_bookmark(row))
        .map_err(ApiError::from)?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    Ok(Json(bookmarks))
}

/// POST /api/bookmarks
pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(bookmark): Json<Bookmark>,
) -> Result<Json<Bookmark>, ApiError> {
    let tags_json = serde_json::to_string(&bookmark.tags).unwrap_or_else(|_| "[]".into());

    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    conn.execute(
        "INSERT INTO bookmarks (id, title, url, description, favicon, thumbnail, collection_id, tags, is_favorite, is_archived, is_trashed, is_pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            bookmark.id,
            bookmark.title,
            bookmark.url,
            bookmark.description,
            bookmark.favicon,
            bookmark.thumbnail,
            bookmark.collection_id,
            tags_json,
            bookmark.is_favorite,
            bookmark.is_archived,
            bookmark.is_trashed,
            bookmark.is_pinned,
            bookmark.created_at,
            bookmark.updated_at,
        ],
    )
    .map_err(|e| ApiError::internal(format!("Failed to create bookmark: {}", e)))?;

    let _ = state.sync_tx.send(());

    Ok(Json(bookmark))
}

/// PUT /api/bookmarks/:id
pub async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(updates): Json<UpdateBookmark>,
) -> Result<Json<Bookmark>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    // Read current bookmark
    let mut bookmark = conn
        .query_row("SELECT * FROM bookmarks WHERE id = ?1", params![id], |row| {
            row_to_bookmark(row)
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ApiError::not_found("Bookmark not found"),
            e => ApiError::from(e),
        })?;

    // Apply partial updates
    if let Some(v) = updates.title {
        bookmark.title = v;
    }
    if let Some(v) = updates.url {
        bookmark.url = v;
    }
    if let Some(v) = updates.description {
        bookmark.description = v;
    }
    if let Some(v) = updates.favicon {
        bookmark.favicon = v;
    }
    if let Some(v) = updates.thumbnail {
        bookmark.thumbnail = v;
    }
    if let Some(v) = updates.collection_id {
        bookmark.collection_id = v;
    }
    if let Some(v) = updates.tags {
        bookmark.tags = v;
    }
    if let Some(v) = updates.is_favorite {
        bookmark.is_favorite = v;
    }
    if let Some(v) = updates.is_archived {
        bookmark.is_archived = v;
    }
    if let Some(v) = updates.is_trashed {
        bookmark.is_trashed = v;
    }
    if let Some(v) = updates.is_pinned {
        bookmark.is_pinned = v;
    }
    if let Some(v) = updates.updated_at {
        bookmark.updated_at = v;
    }

    let tags_json = serde_json::to_string(&bookmark.tags).unwrap_or_else(|_| "[]".into());

    // Write back entire row
    conn.execute(
        "UPDATE bookmarks SET title=?1, url=?2, description=?3, favicon=?4, thumbnail=?5,
         collection_id=?6, tags=?7, is_favorite=?8, is_archived=?9, is_trashed=?10,
         is_pinned=?11, created_at=?12, updated_at=?13 WHERE id=?14",
        params![
            bookmark.title,
            bookmark.url,
            bookmark.description,
            bookmark.favicon,
            bookmark.thumbnail,
            bookmark.collection_id,
            tags_json,
            bookmark.is_favorite,
            bookmark.is_archived,
            bookmark.is_trashed,
            bookmark.is_pinned,
            bookmark.created_at,
            bookmark.updated_at,
            bookmark.id,
        ],
    )
    .map_err(|e| ApiError::internal(format!("Failed to update bookmark: {}", e)))?;

    let _ = state.sync_tx.send(());

    Ok(Json(bookmark))
}

/// DELETE /api/bookmarks/:id
pub async fn delete(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<OkResponse>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    let rows = conn
        .execute("DELETE FROM bookmarks WHERE id = ?1", params![id])
        .map_err(|e| ApiError::internal(format!("Failed to delete bookmark: {}", e)))?;

    if rows == 0 {
        return Err(ApiError::not_found("Bookmark not found"));
    }

    let _ = state.sync_tx.send(());

    Ok(Json(OkResponse { ok: true }))
}

/// DELETE /api/bookmarks/trash
pub async fn empty_trash(State(state): State<Arc<AppState>>) -> Result<Json<OkResponse>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    conn.execute("DELETE FROM bookmarks WHERE is_trashed = 1", [])
        .map_err(|e| ApiError::internal(format!("Failed to empty trash: {}", e)))?;

    let _ = state.sync_tx.send(());

    Ok(Json(OkResponse { ok: true }))
}

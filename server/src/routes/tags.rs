use axum::{
    extract::{Path, State},
    Json,
};
use rusqlite::params;
use std::sync::Arc;

use crate::models::{ApiError, OkResponse, Tag, UpdateTag};
use crate::AppState;

fn row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
    })
}

/// GET /api/tags
pub async fn list(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Tag>>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    let mut stmt = conn.prepare("SELECT * FROM tags").map_err(ApiError::from)?;

    let tags = stmt
        .query_map([], |row| row_to_tag(row))
        .map_err(ApiError::from)?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    Ok(Json(tags))
}

/// POST /api/tags
pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(tag): Json<Tag>,
) -> Result<Json<Tag>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    conn.execute(
        "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
        params![tag.id, tag.name, tag.color],
    )
    .map_err(|e| ApiError::internal(format!("Failed to create tag: {}", e)))?;

    Ok(Json(tag))
}

/// PUT /api/tags/:id
pub async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(updates): Json<UpdateTag>,
) -> Result<Json<Tag>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    // Read current
    let mut tag = conn
        .query_row("SELECT * FROM tags WHERE id = ?1", params![id], |row| {
            row_to_tag(row)
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ApiError::not_found("Tag not found"),
            e => ApiError::from(e),
        })?;

    // Apply updates
    if let Some(v) = updates.name {
        tag.name = v;
    }
    if let Some(v) = updates.color {
        tag.color = v;
    }

    conn.execute(
        "UPDATE tags SET name=?1, color=?2 WHERE id=?3",
        params![tag.name, tag.color, tag.id],
    )
    .map_err(|e| ApiError::internal(format!("Failed to update tag: {}", e)))?;

    Ok(Json(tag))
}

/// DELETE /api/tags/:id
pub async fn delete(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<OkResponse>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    // Remove this tag from all bookmarks' tags arrays
    let mut stmt = conn
        .prepare("SELECT id, tags FROM bookmarks")
        .map_err(ApiError::from)?;

    let affected: Vec<(String, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>("id")?,
                row.get::<_, String>("tags")?,
            ))
        })
        .map_err(ApiError::from)?
        .filter_map(|r| r.ok())
        .filter(|(_, tags_json)| tags_json.contains(&id))
        .collect();

    for (bookmark_id, tags_json) in affected {
        let mut tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        tags.retain(|t| t != &id);
        let new_tags = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".into());
        conn.execute(
            "UPDATE bookmarks SET tags = ?1 WHERE id = ?2",
            params![new_tags, bookmark_id],
        )
        .ok();
    }

    // Delete the tag
    let rows = conn
        .execute("DELETE FROM tags WHERE id = ?1", params![id])
        .map_err(|e| ApiError::internal(format!("Failed to delete tag: {}", e)))?;

    if rows == 0 {
        return Err(ApiError::not_found("Tag not found"));
    }

    Ok(Json(OkResponse { ok: true }))
}

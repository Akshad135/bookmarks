use axum::{
    extract::{Path, State},
    Json,
};
use rusqlite::params;
use std::sync::Arc;

use crate::models::{ApiError, Collection, OkResponse, UpdateCollection};
use crate::AppState;

fn row_to_collection(row: &rusqlite::Row) -> rusqlite::Result<Collection> {
    Ok(Collection {
        id: row.get("id")?,
        name: row.get("name")?,
        icon: row.get("icon")?,
        color: row.get("color")?,
        is_system: row.get("is_system")?,
    })
}

/// GET /api/collections
pub async fn list(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Collection>>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    let mut stmt = conn
        .prepare("SELECT * FROM collections")
        .map_err(ApiError::from)?;

    let collections = stmt
        .query_map([], |row| row_to_collection(row))
        .map_err(ApiError::from)?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    Ok(Json(collections))
}

/// POST /api/collections
pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(collection): Json<Collection>,
) -> Result<Json<Collection>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    conn.execute(
        "INSERT INTO collections (id, name, icon, color, is_system) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            collection.id,
            collection.name,
            collection.icon,
            collection.color,
            collection.is_system,
        ],
    )
    .map_err(|e| ApiError::internal(format!("Failed to create collection: {}", e)))?;

    Ok(Json(collection))
}

/// PUT /api/collections/:id
pub async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(updates): Json<UpdateCollection>,
) -> Result<Json<Collection>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    // Read current
    let mut collection = conn
        .query_row(
            "SELECT * FROM collections WHERE id = ?1",
            params![id],
            |row| row_to_collection(row),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ApiError::not_found("Collection not found"),
            e => ApiError::from(e),
        })?;

    if collection.is_system {
        return Err(ApiError::bad_request("Cannot modify system collections"));
    }

    // Apply updates
    if let Some(v) = updates.name {
        collection.name = v;
    }
    if let Some(v) = updates.icon {
        collection.icon = v;
    }
    if let Some(v) = updates.color {
        collection.color = v;
    }

    conn.execute(
        "UPDATE collections SET name=?1, icon=?2, color=?3 WHERE id=?4",
        params![collection.name, collection.icon, collection.color, collection.id],
    )
    .map_err(|e| ApiError::internal(format!("Failed to update collection: {}", e)))?;

    Ok(Json(collection))
}

/// DELETE /api/collections/:id
pub async fn delete(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<OkResponse>, ApiError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| ApiError::internal("Database lock error"))?;

    // Move bookmarks in this collection to "unsorted"
    conn.execute(
        "UPDATE bookmarks SET collection_id = 'unsorted' WHERE collection_id = ?1",
        params![id],
    )
    .map_err(|e| ApiError::internal(format!("Failed to reassign bookmarks: {}", e)))?;

    // Delete the collection (only non-system)
    let rows = conn
        .execute(
            "DELETE FROM collections WHERE id = ?1 AND is_system = 0",
            params![id],
        )
        .map_err(|e| ApiError::internal(format!("Failed to delete collection: {}", e)))?;

    if rows == 0 {
        return Err(ApiError::bad_request(
            "Collection not found or is a system collection",
        ));
    }

    Ok(Json(OkResponse { ok: true }))
}

use axum::{
    extract::State,
    response::sse::{Event, Sse},
};
use futures::stream::Stream;
use std::{convert::Infallible, sync::Arc, time::Duration};
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

use crate::AppState;

/// GET /api/sync/events
/// Server-Sent Events (SSE) endpoint for real-time data sync notifications.
pub async fn events(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.sync_tx.subscribe();

    let stream = BroadcastStream::new(rx)
        .filter_map(|res| {
            // Ignore lagging errors; we just need a signal to trigger reload
            res.ok()
        })
        .map(|_| {
            Ok(Event::default().data("reload"))
        })
        .keep_alive(
            axum::response::sse::KeepAlive::new()
                .interval(Duration::from_secs(15))
                .text("ping"),
        );

    Sse::new(stream)
}

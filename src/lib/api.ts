import type { Bookmark, Collection, Tag } from '@/types'

class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
        this.name = 'ApiError'
    }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    })

    if (!res.ok) {
        let message = `HTTP ${res.status}`
        try {
            const body = await res.json()
            message = body.error || message
        } catch {
            /* use default message */
        }
        throw new ApiError(res.status, message)
    }

    return res.json()
}

export const api = {
    // Auth
    login: (password: string) =>
        apiFetch<{ authenticated: boolean }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password }),
        }),

    logout: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

    getSession: () => apiFetch<{ authenticated: boolean }>('/auth/session'),

    // Config
    getConfig: () =>
        apiFetch<{ title: string; subtitle: string; icon: string }>('/config'),

    // Bookmarks
    getBookmarks: () => apiFetch<Bookmark[]>('/bookmarks'),

    createBookmark: (bookmark: Bookmark) =>
        apiFetch<Bookmark>('/bookmarks', {
            method: 'POST',
            body: JSON.stringify(bookmark),
        }),

    updateBookmark: (id: string, updates: Partial<Bookmark>) =>
        apiFetch<Bookmark>(`/bookmarks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    deleteBookmark: (id: string) =>
        apiFetch<{ ok: boolean }>(`/bookmarks/${id}`, { method: 'DELETE' }),

    emptyTrash: () =>
        apiFetch<{ ok: boolean }>('/bookmarks/trash', { method: 'DELETE' }),

    // Collections
    getCollections: () => apiFetch<Collection[]>('/collections'),

    createCollection: (collection: Collection) =>
        apiFetch<Collection>('/collections', {
            method: 'POST',
            body: JSON.stringify(collection),
        }),

    updateCollection: (id: string, updates: Partial<Collection>) =>
        apiFetch<Collection>(`/collections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    deleteCollection: (id: string) =>
        apiFetch<{ ok: boolean }>(`/collections/${id}`, { method: 'DELETE' }),

    // Tags
    getTags: () => apiFetch<Tag[]>('/tags'),

    createTag: (tag: Tag) =>
        apiFetch<Tag>('/tags', {
            method: 'POST',
            body: JSON.stringify(tag),
        }),

    updateTag: (id: string, updates: Partial<Tag>) =>
        apiFetch<Tag>(`/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    deleteTag: (id: string) =>
        apiFetch<{ ok: boolean }>(`/tags/${id}`, { method: 'DELETE' }),
}

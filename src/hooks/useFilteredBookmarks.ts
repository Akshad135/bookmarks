import { useMemo } from 'react'
import { useBookmarkStore } from '@/store/bookmark-store'
import type { Bookmark } from '@/types'

export function useFilteredBookmarks(): Bookmark[] {
    const {
        bookmarks,
        activeSection,
        searchQuery,
        selectedTags,
        sortOption,
    } = useBookmarkStore()

    return useMemo(() => {
        let filtered = bookmarks

        // Filter by section
        switch (activeSection) {
            case 'all':
                filtered = filtered.filter((b) => !b.isTrashed && !b.isArchived)
                break
            case 'favorites':
                filtered = filtered.filter((b) => b.isFavorite && !b.isTrashed)
                break
            case 'archive':
                filtered = filtered.filter((b) => b.isArchived && !b.isTrashed)
                break
            case 'trash':
                filtered = filtered.filter((b) => b.isTrashed)
                break
            default:
                filtered = filtered.filter(
                    (b) => b.collectionId === activeSection && !b.isTrashed && !b.isArchived
                )
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (b) =>
                    b.title.toLowerCase().includes(query) ||
                    b.description?.toLowerCase().includes(query) ||
                    b.url.toLowerCase().includes(query)
            )
        }

        // Filter by selected tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter((b) =>
                selectedTags.some((tagId) => b.tags.includes(tagId))
            )
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            // Pinned bookmarks always come first
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1

            switch (sortOption) {
                case 'date-desc':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                case 'date-asc':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                case 'name-asc':
                    return a.title.localeCompare(b.title)
                case 'name-desc':
                    return b.title.localeCompare(a.title)
                default:
                    return 0
            }
        })


        return filtered
    }, [bookmarks, activeSection, searchQuery, selectedTags, sortOption])
}

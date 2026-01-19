import { BookmarkCard } from './BookmarkCard'
import { useBookmarkStore } from '@/store/bookmark-store'
import type { Bookmark } from '@/types'
import { useMemo } from 'react'
import { Inbox } from 'lucide-react'

interface BookmarkGridProps {
    onEditBookmark?: (bookmark: Bookmark) => void
}

export function BookmarkGrid({ onEditBookmark }: BookmarkGridProps) {
    const {
        bookmarks,
        activeSection,
        searchQuery,
        selectedTags,
        sortOption,
    } = useBookmarkStore()

    const filteredBookmarks = useMemo(() => {
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

    if (filteredBookmarks.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
                <div className="rounded-full bg-muted p-6">
                    <Inbox className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-medium">No bookmarks found</h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Add your first bookmark to get started'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBookmarks.map((bookmark) => (
                <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={onEditBookmark}
                />
            ))}
        </div>
    )
}

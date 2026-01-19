import { BookmarkCard } from './BookmarkCard'
import { useBookmarkStore } from '@/store/bookmark-store'
import type { Bookmark } from '@/types'
import { Inbox } from 'lucide-react'
import { useFilteredBookmarks } from '@/hooks/useFilteredBookmarks'

interface BookmarkGridProps {
    onEditBookmark?: (bookmark: Bookmark) => void
}

export function BookmarkGrid({ onEditBookmark }: BookmarkGridProps) {
    const { searchQuery } = useBookmarkStore()
    const filteredBookmarks = useFilteredBookmarks()

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
        <div className="grid grid-cols-1 gap-3 md:gap-4 px-3 md:px-6 pb-6 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

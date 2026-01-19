import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useBookmarkStore } from '@/store/bookmark-store'
import { getDomainFromUrl, getFaviconUrl, formatDate, cn } from '@/lib/utils'
import type { Bookmark } from '@/types'
import {
    Heart,
    MoreHorizontal,
    ExternalLink,
    Pencil,
    Archive,
    Trash2,
    ArchiveRestore,
    RotateCcw,
    Link,
} from 'lucide-react'
import { useState } from 'react'

interface BookmarkListItemProps {
    bookmark: Bookmark
    onEdit?: (bookmark: Bookmark) => void
}

function BookmarkListItem({ bookmark, onEdit }: BookmarkListItemProps) {
    const { tags, toggleFavorite, toggleArchive, moveToTrash, restoreFromTrash, permanentlyDelete } =
        useBookmarkStore()
    const [imgError, setImgError] = useState(false)

    const bookmarkTags = tags.filter((t) => bookmark.tags.includes(t.id))
    const domain = getDomainFromUrl(bookmark.url)
    const favicon = getFaviconUrl(bookmark.url)

    const handleOpenUrl = () => {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer')
    }

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(bookmark.url)
    }

    return (
        <div
            className={cn(
                'group flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-all duration-200',
                'hover:border-primary/30 hover:bg-card/80'
            )}
        >
            {/* Favicon/Thumbnail */}
            <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary cursor-pointer"
                onClick={handleOpenUrl}
            >
                {favicon && !imgError ? (
                    <img
                        src={favicon}
                        alt=""
                        className="h-6 w-6"
                        onError={() => setImgError(true)}
                    />
                ) : !imgError && bookmark.thumbnail ? (
                    <img
                        src={bookmark.thumbnail}
                        alt=""
                        className="h-full w-full rounded-lg object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Link className="h-5 w-5 text-muted-foreground" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3
                        className="font-medium truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={handleOpenUrl}
                    >
                        {bookmark.title}
                    </h3>
                    {bookmark.isFavorite && (
                        <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate">{domain}</span>
                    <span>•</span>
                    <span className="shrink-0">{formatDate(bookmark.createdAt)}</span>
                </div>
            </div>

            {/* Tags */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                {bookmarkTags.slice(0, 2).map((tag) => (
                    <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs"
                        style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                        }}
                    >
                        {tag.name}
                    </Badge>
                ))}
                {bookmarkTags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                        +{bookmarkTags.length - 2}
                    </Badge>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-8 w-8', bookmark.isFavorite && 'text-red-500')}
                            onClick={() => toggleFavorite(bookmark.id)}
                        >
                            <Heart className={cn('h-4 w-4', bookmark.isFavorite && 'fill-current')} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleOpenUrl}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyUrl}>
                            <Link className="mr-2 h-4 w-4" />
                            Copy URL
                        </DropdownMenuItem>
                        {!bookmark.isTrashed && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEdit?.(bookmark)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleArchive(bookmark.id)}>
                                    {bookmark.isArchived ? (
                                        <>
                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                            Unarchive
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => moveToTrash(bookmark.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Move to Trash
                                </DropdownMenuItem>
                            </>
                        )}
                        {bookmark.isTrashed && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => restoreFromTrash(bookmark.id)}>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => permanentlyDelete(bookmark.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

interface BookmarkListProps {
    onEditBookmark?: (bookmark: Bookmark) => void
}

import { useMemo } from 'react'
import { Inbox } from 'lucide-react'

export function BookmarkList({ onEditBookmark }: BookmarkListProps) {
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
        <div className="flex flex-col gap-2 p-6">
            {filteredBookmarks.map((bookmark) => (
                <BookmarkListItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={onEditBookmark}
                />
            ))}
        </div>
    )
}

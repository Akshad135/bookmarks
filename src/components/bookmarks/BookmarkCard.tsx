import { useState } from 'react'
import { Card } from '@/components/ui/card'
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
import { getDomainFromUrl, getFaviconUrl, formatDate, cn, isDemoMode, getDynamicGradientStyles } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { toast } from 'sonner'
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
    Pin,
} from 'lucide-react'

interface BookmarkCardProps {
    bookmark: Bookmark
    onEdit?: (bookmark: Bookmark) => void
}

export function BookmarkCard({ bookmark, onEdit }: BookmarkCardProps) {
    const { tags, toggleFavorite, toggleArchive, togglePin, moveToTrash, restoreFromTrash, permanentlyDelete } =
        useBookmarkStore()
    const [isHovered, setIsHovered] = useState(false)
    const [imgError, setImgError] = useState(false)

    const bookmarkTags = tags.filter((t) => bookmark.tags.includes(t.id))
    const domain = getDomainFromUrl(bookmark.url)
    const favicon = getFaviconUrl(bookmark.url)

    const handleOpenUrl = () => {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer')
    }

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(bookmark.url)
            toast.success('URL copied to clipboard')
        } catch {
            toast.error('Failed to copy URL')
        }
    }

    const handleToggleFavorite = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (isDemoMode()) {
            toast.error('Actions are disabled in demo mode')
            return
        }
        toggleFavorite(bookmark.id)
        toast.success(bookmark.isFavorite ? 'Removed from favorites' : 'Added to favorites')
    }

    const handleToggleArchive = () => {
        toggleArchive(bookmark.id)
        toast.success(bookmark.isArchived ? 'Bookmark unarchived' : 'Bookmark archived')
    }

    const handleMoveToTrash = () => {
        moveToTrash(bookmark.id)
        toast.success('Moved to trash')
    }

    const handleRestore = () => {
        restoreFromTrash(bookmark.id)
        toast.success('Bookmark restored')
    }

    const handleDeletePermanent = () => {
        permanentlyDelete(bookmark.id)
        toast.success('Bookmark permanently deleted')
    }

    return (
        <Card
            className={cn(
                'group relative flex flex-col overflow-hidden border border-border bg-card/60 backdrop-blur-sm transition-all duration-300',
                'hover:border-primary/40 hover:shadow-[0_0_25px_rgba(249,115,22,0.08),_inset_0_1px_rgba(255,255,255,0.03)]',
                isHovered && 'scale-[1.02] bg-card/85'
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail */}
            <div
                className="relative flex h-32 items-center justify-center cursor-pointer overflow-hidden border-b border-border/40"
                onClick={handleOpenUrl}
            >
                {!imgError && bookmark.thumbnail ? (
                    <img
                        src={bookmark.thumbnail}
                        alt={bookmark.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div 
                        className="flex h-full w-full items-center justify-center transition-all duration-300"
                        style={getDynamicGradientStyles(bookmark.url).style}
                    >
                        <div className="h-14 w-14 rounded-full flex items-center justify-center bg-black/45 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:border-white/20 group-hover:bg-black/60">
                            {favicon && !imgError ? (
                                <img
                                    src={favicon}
                                    alt=""
                                    className="h-7 w-7 rounded"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <Link className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute right-2 top-2 flex gap-1.5">
                    {/* Pin indicator */}
                    {bookmark.isPinned && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background text-primary pointer-events-none"
                        >
                            <Pin className="h-4 w-4 fill-current" />
                        </Button>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className={cn(
                                    'h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background',
                                    bookmark.isFavorite && 'text-red-500'
                                )}
                                onClick={handleToggleFavorite}
                            >
                                <Heart
                                    className={cn('h-4 w-4', bookmark.isFavorite && 'fill-current')}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={handleOpenUrl}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyUrl}>
                                <Link className="mr-2 h-4 w-4" />
                                Copy URL
                            </DropdownMenuItem>
                            {!bookmark.isTrashed && !isDemoMode() && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onEdit?.(bookmark)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleToggleArchive}>
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
                                    <DropdownMenuItem onClick={() => togglePin(bookmark.id)}>
                                        <Pin className={cn('mr-2 h-4 w-4', bookmark.isPinned && 'fill-current')} />
                                        {bookmark.isPinned ? 'Unpin' : 'Pin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleMoveToTrash}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Move to Trash
                                    </DropdownMenuItem>
                                </>
                            )}
                            {bookmark.isTrashed && !isDemoMode() && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleRestore}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDeletePermanent}
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

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
                <h3
                    className="mb-1 line-clamp-1 font-medium text-foreground cursor-pointer hover:text-primary transition-colors selectable-text"
                    onClick={handleOpenUrl}
                >
                    {bookmark.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground selectable-text">
                    {bookmark.description || domain}
                </p>

                <div className="mt-auto">
                    {/* Tags */}
                    {bookmarkTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {bookmarkTags.slice(0, 3).map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-xs"
                                    style={{
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                        borderColor: `${tag.color}40`,
                                    }}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                            {bookmarkTags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{bookmarkTags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border select-none">
                        <span className="text-xs text-muted-foreground selectable-text">{domain}</span>
                        <span className="text-xs text-muted-foreground selectable-text">
                            {formatDate(bookmark.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    )
}

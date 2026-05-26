import { useState, useEffect, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useBookmarkStore } from '@/store/bookmark-store'
import { getFaviconUrl, cn, generateId, getDomainFromUrl } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { toast } from 'sonner'
import { Loader2, Link, Tag, Globe, Sparkles, Heart, Plus, Pin } from 'lucide-react'

interface AddBookmarkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editBookmark?: Bookmark | null
    initialData?: Partial<Bookmark> | null
}

import { fetchMetadata } from '@/lib/metadata'

export function AddBookmarkDialog({
    open,
    onOpenChange,
    editBookmark,
    initialData,
}: AddBookmarkDialogProps) {
    const { addBookmark, updateBookmark, tags, collections } = useBookmarkStore()

    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [thumbnail, setThumbnail] = useState('')
    const [collectionId, setCollectionId] = useState('unsorted')
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [isFavorite, setIsFavorite] = useState(false)
    const [isPinned, setIsPinned] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [fetchError, setFetchError] = useState('')

    const isEditing = !!editBookmark
    const hasSavedRef = useRef(false)
    const activeFetchUrlRef = useRef('')
    const pendingBookmarkIdRef = useRef('')

    useEffect(() => {
        if (open) {
            hasSavedRef.current = false
            pendingBookmarkIdRef.current = generateId()
            activeFetchUrlRef.current = ''
        }
    }, [open])

    useEffect(() => {
        if (editBookmark) {
            setUrl(editBookmark.url)
            setTitle(editBookmark.title)
            setDescription(editBookmark.description || '')
            setThumbnail(editBookmark.thumbnail || '')
            setCollectionId(editBookmark.collectionId)
            setSelectedTagIds(editBookmark.tags)
            setIsFavorite(editBookmark.isFavorite)
            setIsPinned(editBookmark.isPinned || false)
        } else if (initialData) {
            setUrl(initialData.url || '')
            setTitle(initialData.title || '')
            setDescription(initialData.description || '')
            setThumbnail(initialData.thumbnail || '')
            setCollectionId(initialData.collectionId || 'unsorted')
            setSelectedTagIds(initialData.tags || [])
            setIsFavorite(initialData.isFavorite || false)
            setIsPinned(initialData.isPinned || false)
        } else {
            resetForm()
        }
    }, [editBookmark, initialData, open])

    const resetForm = () => {
        setUrl('')
        setTitle('')
        setDescription('')
        setThumbnail('')
        setCollectionId('unsorted')
        setSelectedTagIds([])
        setIsFavorite(false)
        setIsPinned(false)
        setFetchError('')
    }

    // fetchMetadata moved to @/lib/metadata


    const handleFetchMetadata = async (urlOverride?: string) => {
        const targetUrl = urlOverride || url
        if (!targetUrl) return

        try {
            new URL(targetUrl)
        } catch {
            setFetchError('Please enter a valid URL')
            return
        }

        activeFetchUrlRef.current = targetUrl
        const currentFetchId = pendingBookmarkIdRef.current
        setIsLoading(true)
        setFetchError('')

        try {
            const metadata = await fetchMetadata(targetUrl)

            if (activeFetchUrlRef.current === targetUrl) {
                const fetchedTitle = metadata?.title || getDomainFromUrl(targetUrl)
                const fetchedDesc = metadata?.description || ''
                const fetchedThumb = metadata?.image || ''

                if (hasSavedRef.current) {
                    // Update already saved bookmark in background!
                    const existing = useBookmarkStore.getState().bookmarks.find(b => b.id === currentFetchId)
                    if (existing) {
                        const updates: Partial<Bookmark> = {}
                        if (existing.title === getDomainFromUrl(targetUrl) && fetchedTitle) {
                            updates.title = fetchedTitle
                        }
                        if (!existing.description && fetchedDesc) {
                            updates.description = fetchedDesc
                        }
                        if (!existing.thumbnail && fetchedThumb) {
                            updates.thumbnail = fetchedThumb
                        }
                        if (Object.keys(updates).length > 0) {
                            updateBookmark(currentFetchId, updates)
                        }
                    }
                } else {
                    if (!title && fetchedTitle) setTitle(fetchedTitle)
                    if (!description && fetchedDesc) setDescription(fetchedDesc)
                    if (!thumbnail && fetchedThumb) setThumbnail(fetchedThumb)
                }
            }
        } catch {
            if (!hasSavedRef.current) {
                setFetchError('Could not fetch metadata')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleUrlBlur = () => {
        if (url) {
            let normalizedUrl = url
            if (!/^https?:\/\//i.test(url)) {
                normalizedUrl = `https://${url}`
                setUrl(normalizedUrl)
            }

            if (!title) {
                handleFetchMetadata(normalizedUrl)
            }
        }
    }

    const toggleTagSelection = (tagId: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!url) return

        // Default to hostname if title is empty, avoiding hard stop for user!
        const finalTitle = title.trim() || getDomainFromUrl(url)

        try {
            const bookmarkData = {
                url,
                title: finalTitle,
                description: description || undefined,
                thumbnail: thumbnail || undefined,
                collectionId,
                tags: selectedTagIds,
                isFavorite,
                isPinned,
                favicon: getFaviconUrl(url),
            }

            if (isEditing && editBookmark) {
                updateBookmark(editBookmark.id, bookmarkData)
                toast.success('Bookmark updated')
            } else {
                addBookmark({
                    ...bookmarkData,
                    id: pendingBookmarkIdRef.current
                } as any)
                hasSavedRef.current = true
                toast.success('Bookmark added')
            }

            onOpenChange(false)
            resetForm()
        } catch (error) {
            console.error('Failed to save bookmark:', error)
            toast.error('Failed to save bookmark')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-1rem)] w-full max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-4 md:p-5 border-b border-border bg-background/95 backdrop-blur z-10 shrink-0 text-left">
                    <DialogTitle className="text-lg md:text-xl pr-8">
                        {isEditing ? 'Edit Bookmark' : 'Add New Bookmark'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the bookmark details below.'
                            : 'Fill in the details for your new bookmark.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-5">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* URL */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="url">URL</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="url"
                                        type="url"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onBlur={handleUrlBlur}
                                        className="pl-9 h-11"
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleFetchMetadata()}
                                    disabled={!url || isLoading}
                                    className="shrink-0 h-11 w-11"
                                    title="Fetch metadata"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {fetchError && (
                                <p className="text-xs text-destructive">{fetchError}</p>
                            )}
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="title">Title</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="title"
                                    placeholder="Bookmark title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="pl-9 h-11"
                                    required
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="A brief description..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="resize-none"
                            />
                        </div>

                        {/* Thumbnail Preview */}
                        {thumbnail && (
                            <div className="space-y-2 rounded-md border border-border p-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Preview Image</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setThumbnail('')}
                                    >
                                        Remove
                                    </Button>
                                </div>
                                <div className="relative h-28 w-full overflow-hidden rounded-md bg-secondary">
                                    <img
                                        src={thumbnail}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                        onError={() => setThumbnail('')}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            {/* Collection */}
                            <div className="flex flex-col gap-2">
                                <Label>Collection</Label>
                                <div className="flex flex-wrap gap-2">
                                    {collections
                                        .filter(c => c.id !== 'all')
                                        .map((collection) => (
                                            <Badge
                                                key={collection.id}
                                                variant={collectionId === collection.id ? 'default' : 'outline'}
                                                className={cn(
                                                    "cursor-pointer px-3 py-1 text-sm font-normal transition-all hover:bg-secondary",
                                                    collectionId === collection.id && "hover:bg-primary"
                                                )}
                                                onClick={() => setCollectionId(collection.id)}
                                            >
                                                {collection.name}
                                            </Badge>
                                        ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col gap-2">
                                <Label className="flex items-center gap-2">
                                    <Tag className="h-3.5 w-3.5" />
                                    Tags
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                                            className="cursor-pointer px-2 py-1 font-normal transition-all hover:bg-secondary"
                                            style={selectedTagIds.includes(tag.id) ? {
                                                backgroundColor: tag.color,
                                                color: '#fff',
                                                borderColor: tag.color
                                            } : {
                                                borderColor: `${tag.color}40`,
                                                color: tag.color
                                            }}
                                            onClick={() => toggleTagSelection(tag.id)}
                                        >
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Favorite & Pin Toggles & Actions */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={isFavorite ? "secondary" : "outline"}
                                    className={cn("justify-between items-center group h-11", isFavorite && "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/25")}
                                    onClick={() => setIsFavorite(!isFavorite)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Heart className={cn("h-4 w-4", isFavorite ? "fill-current text-rose-500" : "group-hover:text-rose-500")} />
                                        Favorites
                                    </span>
                                    {isFavorite && <Badge variant="secondary" className="bg-rose-500 text-white text-[10px] px-1.5 h-5 rounded">Yes</Badge>}
                                </Button>

                                <Button
                                    type="button"
                                    variant={isPinned ? "secondary" : "outline"}
                                    className={cn("justify-between items-center group h-11", isPinned && "bg-primary/10 hover:bg-primary/20 text-primary border-primary/25")}
                                    onClick={() => setIsPinned(!isPinned)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Pin className={cn("h-4 w-4", isPinned ? "fill-current text-primary" : "group-hover:text-primary")} />
                                        Pin to Top
                                    </span>
                                    {isPinned && <Badge variant="secondary" className="bg-primary text-white text-[10px] px-1.5 h-5 rounded">Yes</Badge>}
                                </Button>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!url} className="w-full gap-2">
                                    {isEditing ? 'Save Changes' : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Add Bookmark
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

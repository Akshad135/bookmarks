import { useState, useEffect } from 'react'
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
import { getFaviconUrl, cn } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { toast } from 'sonner'
import { Loader2, Link, Tag, Globe, Sparkles, Heart, Plus } from 'lucide-react'

interface AddBookmarkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editBookmark?: Bookmark | null
    initialData?: Partial<Bookmark> | null
}

interface UrlMetadata {
    title: string
    description: string
    image: string
}

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
    const [isLoading, setIsLoading] = useState(false)
    const [fetchError, setFetchError] = useState('')

    const isEditing = !!editBookmark

    useEffect(() => {
        if (editBookmark) {
            setUrl(editBookmark.url)
            setTitle(editBookmark.title)
            setDescription(editBookmark.description || '')
            setThumbnail(editBookmark.thumbnail || '')
            setCollectionId(editBookmark.collectionId)
            setSelectedTagIds(editBookmark.tags)
            setIsFavorite(editBookmark.isFavorite)
        } else if (initialData) {
            setUrl(initialData.url || '')
            setTitle(initialData.title || '')
            setDescription(initialData.description || '')
            setThumbnail(initialData.thumbnail || '')
            setCollectionId(initialData.collectionId || 'unsorted')
            setSelectedTagIds(initialData.tags || [])
            setIsFavorite(initialData.isFavorite || false)
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
        setFetchError('')
    }

    const fetchMetadata = async (targetUrl: string): Promise<UrlMetadata | null> => {
        try {
            // Use a CORS proxy or metadata API to fetch the page
            // Option 1: Use a free metadata API
            const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`
            const response = await fetch(apiUrl)
            if (!response.ok) return null
            const data = await response.json()

            if (data.status === 'success') {
                return {
                    title: data.data.title || '',
                    description: data.data.description || '',
                    image: data.data.image?.url || data.data.logo?.url || '',
                }
            }
            return null
        } catch {
            return null
        }
    }

    const handleFetchMetadata = async (urlOverride?: string) => {
        const targetUrl = urlOverride || url
        if (!targetUrl) return

        try {
            new URL(targetUrl)
        } catch {
            setFetchError('Please enter a valid URL')
            return
        }

        setIsLoading(true)
        setFetchError('')

        try {
            const metadata = await fetchMetadata(targetUrl)

            if (metadata) {
                if (!title && metadata.title) setTitle(metadata.title)
                if (!description && metadata.description) setDescription(metadata.description)
                if (!thumbnail && metadata.image) setThumbnail(metadata.image)
            } else {
                const urlObj = new URL(targetUrl)
                const hostname = urlObj.hostname.replace('www.', '')
                if (!title) setTitle(hostname)
            }
        } catch {
            setFetchError('Could not fetch metadata')
        }

        setIsLoading(false)
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

        if (!url || !title) return

        try {
            const bookmarkData = {
                url,
                title,
                description: description || undefined,
                thumbnail: thumbnail || undefined,
                collectionId,
                tags: selectedTagIds,
                isFavorite,
                favicon: getFaviconUrl(url),
            }

            if (isEditing && editBookmark) {
                updateBookmark(editBookmark.id, bookmarkData)
                toast.success('Bookmark updated')
            } else {
                addBookmark(bookmarkData)
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

                        {/* Favorite Toggle & Actions */}
                        <div className="flex flex-col gap-4">
                            <Button
                                type="button"
                                variant={isFavorite ? "secondary" : "outline"}
                                className={cn("w-full justify-between items-center group", isFavorite && "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-200")}
                                onClick={() => setIsFavorite(!isFavorite)}
                            >
                                <span className="flex items-center gap-2">
                                    <Heart className={cn("h-4 w-4", isFavorite ? "fill-current" : "group-hover:text-red-500")} />
                                    Add to Favorites
                                </span>
                                {isFavorite && <Badge variant="secondary" className="bg-red-500 text-white text-[10px] h-5">Selected</Badge>}
                            </Button>

                            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!url || !title || isLoading} className="w-full gap-2">
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

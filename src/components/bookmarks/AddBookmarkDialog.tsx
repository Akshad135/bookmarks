import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useBookmarkStore } from '@/store/bookmark-store'
import { getFaviconUrl } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { toast } from 'sonner'
import { Loader2, Link, Tag, Globe, Sparkles } from 'lucide-react'

interface AddBookmarkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editBookmark?: Bookmark | null
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
        } else {
            resetForm()
        }
    }, [editBookmark, open])

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
            // If the API fails, try to extract basic info from URL
            return null
        }
    }

    const handleFetchMetadata = async () => {
        if (!url) return

        // Validate URL
        try {
            new URL(url)
        } catch {
            setFetchError('Please enter a valid URL')
            return
        }

        setIsLoading(true)
        setFetchError('')

        try {
            const metadata = await fetchMetadata(url)

            if (metadata) {
                if (!title && metadata.title) setTitle(metadata.title)
                if (!description && metadata.description) setDescription(metadata.description)
                if (!thumbnail && metadata.image) setThumbnail(metadata.image)
            } else {
                // Fallback: extract from URL
                const urlObj = new URL(url)
                const hostname = urlObj.hostname.replace('www.', '')
                if (!title) setTitle(hostname)
            }
        } catch {
            setFetchError('Could not fetch metadata')
        }

        setIsLoading(false)
    }

    const handleUrlBlur = () => {
        if (url && !title) {
            handleFetchMetadata()
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Bookmark' : 'Add New Bookmark'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the bookmark details below.'
                            : 'Paste a URL and we\'ll fetch the details automatically.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* URL */}
                    <div className="space-y-2">
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
                                    className="pl-9"
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleFetchMetadata}
                                disabled={!url || isLoading}
                                className="shrink-0"
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
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="title"
                                placeholder="Bookmark title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="pl-9"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="A brief description..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Thumbnail Preview */}
                    {thumbnail && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Preview Image</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-destructive hover:bg-transparent hover:text-destructive"
                                    onClick={() => setThumbnail('')}
                                >
                                    Remove image
                                </Button>
                            </div>
                            <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border bg-secondary">
                                <img
                                    src={thumbnail}
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                    onError={() => setThumbnail('')}
                                />
                            </div>
                        </div>
                    )}

                    {/* Collection */}
                    <div className="space-y-2">
                        <Label>Collection</Label>
                        <div className="flex flex-wrap gap-2">
                            {collections.map((collection) => (
                                <Badge
                                    key={collection.id}
                                    variant={collectionId === collection.id ? 'default' : 'secondary'}
                                    className="cursor-pointer transition-all hover:scale-105"
                                    onClick={() => setCollectionId(collection.id)}
                                >
                                    {collection.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant={selectedTagIds.includes(tag.id) ? 'default' : 'secondary'}
                                    className="cursor-pointer transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: selectedTagIds.includes(tag.id)
                                            ? tag.color
                                            : undefined,
                                        borderColor: tag.color,
                                    }}
                                    onClick={() => toggleTagSelection(tag.id)}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Favorite Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="favorite"
                            checked={isFavorite}
                            onChange={(e) => setIsFavorite(e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="favorite" className="cursor-pointer">
                            Add to Favorites
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!url || !title || isLoading}>
                            {isEditing ? 'Save Changes' : 'Add Bookmark'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

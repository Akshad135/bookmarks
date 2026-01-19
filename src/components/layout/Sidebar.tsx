import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useBookmarkStore } from '@/store/bookmark-store'
import { cn } from '@/lib/utils'
import {
    Bookmark,
    FolderOpen,
    Heart,
    Archive,
    Trash2,
    Plus,
    Inbox,
} from 'lucide-react'

const TAG_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
]

export function Sidebar() {
    const {
        collections,
        tags,
        bookmarks,
        activeSection,
        setActiveSection,
        selectedTags,
        toggleTag,
        addCollection,
        addTag,
    } = useBookmarkStore()

    const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false)
    const [newCollectionName, setNewCollectionName] = useState('')
    const [isAddTagOpen, setIsAddTagOpen] = useState(false)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
    const [hexInput, setHexInput] = useState(TAG_COLORS[0])

    const getCollectionCount = (collectionId: string) => {
        if (collectionId === 'all') {
            return bookmarks.filter((b) => !b.isTrashed && !b.isArchived).length
        }
        return bookmarks.filter(
            (b) => b.collectionId === collectionId && !b.isTrashed && !b.isArchived
        ).length
    }

    const getFavoritesCount = () =>
        bookmarks.filter((b) => b.isFavorite && !b.isTrashed).length

    const getArchiveCount = () => bookmarks.filter((b) => b.isArchived).length

    const getTrashCount = () => bookmarks.filter((b) => b.isTrashed).length

    const getTagCount = (tagId: string) =>
        bookmarks.filter(
            (b) => b.tags.includes(tagId) && !b.isTrashed && !b.isArchived
        ).length

    const navItems = [
        { id: 'all', label: 'All Bookmarks', icon: Bookmark, count: getCollectionCount('all') },
        { id: 'favorites', label: 'Favorites', icon: Heart, count: getFavoritesCount() },
        { id: 'archive', label: 'Archive', icon: Archive, count: getArchiveCount() },
        { id: 'trash', label: 'Trash', icon: Trash2, count: getTrashCount() },
    ]

    const handleAddCollection = () => {
        if (newCollectionName.trim()) {
            addCollection(newCollectionName.trim())
            setNewCollectionName('')
            setIsAddCollectionOpen(false)
        }
    }

    const handleAddTag = () => {
        if (newTagName.trim()) {
            addTag(newTagName.trim(), newTagColor)
            setNewTagName('')
            setNewTagColor(TAG_COLORS[0])
            setHexInput(TAG_COLORS[0])
            setIsAddTagOpen(false)
        }
    }

    const handleColorSelect = (color: string) => {
        setNewTagColor(color)
        setHexInput(color)
    }

    const handleHexChange = (value: string) => {
        setHexInput(value)
        // Validate hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            setNewTagColor(value)
        }
    }

    return (
        <>
            <aside className="flex h-screen w-[16rem] flex-col border-r border-sidebar-border bg-sidebar">
                {/* Logo */}
                <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <Bookmark className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-base font-semibold text-sidebar-foreground">
                        Bookmarks
                    </span>
                </div>

                <ScrollArea className="flex-1 py-2">
                    {/* Main Navigation */}
                    <div className="space-y-0.5 px-2">
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                onClick={() => setActiveSection(item.id)}
                                className={cn(
                                    'w-full justify-start gap-3 px-3 h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground',
                                    activeSection === item.id &&
                                    'bg-sidebar-border text-sidebar-foreground'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1 text-left text-sm">{item.label}</span>
                                <span className="text-xs text-sidebar-muted">{item.count}</span>
                            </Button>
                        ))}
                    </div>

                    <Separator className="my-3 bg-sidebar-border" />

                    {/* Collections */}
                    <div className="px-2">
                        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
                            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-muted">
                                Collections
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-sidebar-muted hover:text-sidebar-foreground"
                                onClick={() => setIsAddCollectionOpen(true)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="space-y-0.5">
                            {collections
                                .filter((c) => !c.isSystem)
                                .map((collection) => (
                                    <Button
                                        key={collection.id}
                                        variant="ghost"
                                        onClick={() => setActiveSection(collection.id)}
                                        className={cn(
                                            'w-full justify-start gap-3 px-3 h-8 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground',
                                            activeSection === collection.id &&
                                            'bg-sidebar-border text-sidebar-foreground'
                                        )}
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                        <span className="flex-1 text-left text-sm truncate">
                                            {collection.name}
                                        </span>
                                        <span className="text-xs text-sidebar-muted">
                                            {getCollectionCount(collection.id)}
                                        </span>
                                    </Button>
                                ))}
                            <Button
                                variant="ghost"
                                onClick={() => setActiveSection('unsorted')}
                                className={cn(
                                    'w-full justify-start gap-3 px-3 h-8 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground',
                                    activeSection === 'unsorted' &&
                                    'bg-sidebar-border text-sidebar-foreground'
                                )}
                            >
                                <Inbox className="h-4 w-4" />
                                <span className="flex-1 text-left text-sm">Unsorted</span>
                                <span className="text-xs text-sidebar-muted">
                                    {getCollectionCount('unsorted')}
                                </span>
                            </Button>
                        </div>
                    </div>

                    <Separator className="my-3 bg-sidebar-border" />

                    {/* Tags */}
                    <div className="px-2">
                        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
                            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-muted">
                                Tags
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-sidebar-muted hover:text-sidebar-foreground"
                                onClick={() => setIsAddTagOpen(true)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="space-y-0.5">
                            {tags.map((tag) => (
                                <Button
                                    key={tag.id}
                                    variant="ghost"
                                    onClick={() => toggleTag(tag.id)}
                                    className={cn(
                                        'w-full justify-start gap-3 px-3 h-8 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground',
                                        selectedTags.includes(tag.id) && 'bg-sidebar-border text-sidebar-foreground'
                                    )}
                                >
                                    <div
                                        className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                                        style={{ backgroundColor: tag.color }}
                                    />
                                    <span className="flex-1 text-left text-sm">{tag.name}</span>
                                    <Badge
                                        variant="secondary"
                                        className="h-5 min-w-[1.25rem] justify-center px-1.5 text-[0.65rem]"
                                    >
                                        {getTagCount(tag.id)}
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="border-t border-sidebar-border p-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-orange-400" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-sidebar-foreground truncate">
                                My Bookmarks
                            </p>
                            <p className="text-[0.65rem] text-sidebar-muted">Local Storage</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Add Collection Dialog */}
            <Dialog open={isAddCollectionOpen} onOpenChange={setIsAddCollectionOpen}>
                <DialogContent className="sm:max-w-[380px]">
                    <DialogHeader>
                        <DialogTitle>New Collection</DialogTitle>
                        <DialogDescription>
                            Create a new collection to organize your bookmarks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="collection-name" className="text-sm font-medium">
                            Name
                        </Label>
                        <Input
                            id="collection-name"
                            placeholder="e.g., Design Resources"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddCollection()
                            }}
                            className="mt-2"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddCollectionOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddCollection} disabled={!newCollectionName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Tag Dialog */}
            <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                <DialogContent className="sm:max-w-[380px]">
                    <DialogHeader>
                        <DialogTitle>New Tag</DialogTitle>
                        <DialogDescription>
                            Create a new tag to categorize your bookmarks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="tag-name" className="text-sm font-medium">
                                Name
                            </Label>
                            <Input
                                id="tag-name"
                                placeholder="e.g., Tutorial"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTag()
                                }}
                                className="mt-2"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Color</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {TAG_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => handleColorSelect(color)}
                                        className={cn(
                                            'h-7 w-7 rounded-full transition-all hover:scale-110',
                                            newTagColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div
                                    className="h-8 w-8 rounded-md border border-border"
                                    style={{ backgroundColor: newTagColor }}
                                />
                                <Input
                                    value={hexInput}
                                    onChange={(e) => handleHexChange(e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddTagOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

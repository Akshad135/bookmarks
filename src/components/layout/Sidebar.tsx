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

interface SidebarProps {
    isCollapsed: boolean
}

export function Sidebar({ isCollapsed }: SidebarProps) {
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
            <aside
                className={cn(
                    "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
                    isCollapsed ? "w-20" : "w-[17rem]"
                )}
            >
                {/* Header (Merged) */}
                <div className={cn(
                    "flex h-20 items-center px-4 border-b border-sidebar-border/50",
                    isCollapsed ? "justify-center" : "gap-3"
                )}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-400 shadow-sm">
                        <Bookmark className="h-5 w-5 text-white fill-white/20" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-sm font-semibold text-sidebar-foreground truncate">
                                Bookmarks
                            </span>
                            <span className="text-xs text-sidebar-muted truncate">
                                Local Storage
                            </span>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    {/* Main Navigation */}
                    <div className="space-y-1.5 pb-6">
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                onClick={() => setActiveSection(item.id)}
                                className={cn(
                                    'w-full h-10 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                    activeSection === item.id && 'bg-sidebar-border text-sidebar-foreground',
                                    isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left text-sm truncate">{item.label}</span>
                                        <span className="text-xs text-sidebar-muted">{item.count}</span>
                                    </>
                                )}
                            </Button>
                        ))}
                    </div>

                    <Separator className="my-2 bg-sidebar-border" />

                    {/* Collections */}
                    <div className="py-4">
                        <div className={cn(
                            "flex items-center mb-1 text-sidebar-muted",
                            isCollapsed ? "justify-center" : "justify-between px-3 py-2"
                        )}>
                            {!isCollapsed && (
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Collections
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "text-sidebar-muted hover:text-sidebar-foreground",
                                    isCollapsed ? "h-8 w-8" : "h-6 w-6"
                                )}
                                onClick={() => setIsAddCollectionOpen(true)}
                                title="Add Collection"
                            >
                                <Plus className={cn("transition-all", isCollapsed ? "h-5 w-5" : "h-3.5 w-3.5")} />
                            </Button>
                        </div>
                        <div className="space-y-1.5">
                            {collections
                                .filter((c) => !c.isSystem)
                                .map((collection) => (
                                    <Button
                                        key={collection.id}
                                        variant="ghost"
                                        onClick={() => setActiveSection(collection.id)}
                                        className={cn(
                                            'w-full h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                            activeSection === collection.id && 'bg-sidebar-border text-sidebar-foreground',
                                            isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                                        )}
                                        title={isCollapsed ? collection.name : undefined}
                                    >
                                        <FolderOpen className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                                        {!isCollapsed && (
                                            <>
                                                <span className="flex-1 text-left text-sm truncate">
                                                    {collection.name}
                                                </span>
                                                <span className="text-xs text-sidebar-muted">
                                                    {getCollectionCount(collection.id)}
                                                </span>
                                            </>
                                        )}
                                    </Button>
                                ))}
                            <Button
                                variant="ghost"
                                onClick={() => setActiveSection('unsorted')}
                                className={cn(
                                    'w-full h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                    activeSection === 'unsorted' && 'bg-sidebar-border text-sidebar-foreground',
                                    isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                                )}
                                title={isCollapsed ? "Unsorted" : undefined}
                            >
                                <Inbox className="h-4 w-4 shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left text-sm">Unsorted</span>
                                        <span className="text-xs text-sidebar-muted">
                                            {getCollectionCount('unsorted')}
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <Separator className="my-2 bg-sidebar-border" />

                    {/* Tags */}
                    <div className="py-4">
                        <div className={cn(
                            "flex items-center mb-1 text-sidebar-muted",
                            isCollapsed ? "justify-center" : "justify-between px-3 py-2"
                        )}>
                            {!isCollapsed && (
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Tags
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "text-sidebar-muted hover:text-sidebar-foreground",
                                    isCollapsed ? "h-8 w-8" : "h-6 w-6"
                                )}
                                onClick={() => setIsAddTagOpen(true)}
                                title="Add Tag"
                            >
                                <Plus className={cn("transition-all", isCollapsed ? "h-5 w-5" : "h-3.5 w-3.5")} />
                            </Button>
                        </div>
                        <div className="space-y-1.5 px-0.5">
                            {tags.map((tag) => (
                                <Button
                                    key={tag.id}
                                    variant="ghost"
                                    onClick={() => toggleTag(tag.id)}
                                    className={cn(
                                        'w-full h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                        selectedTags.includes(tag.id) && 'bg-sidebar-border text-sidebar-foreground',
                                        isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                                    )}
                                    title={isCollapsed ? tag.name : undefined}
                                >
                                    <div
                                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/10"
                                        style={{ backgroundColor: tag.color }}
                                    />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 text-left text-sm">{tag.name}</span>
                                            <Badge
                                                variant="secondary"
                                                className="h-5 min-w-[1.25rem] justify-center px-1.5 text-xs"
                                            >
                                                {getTagCount(tag.id)}
                                            </Badge>
                                        </>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </aside>

            {/* Add Collection Dialog */}
            <Dialog open={isAddCollectionOpen} onOpenChange={setIsAddCollectionOpen}>
                <DialogContent className="sm:max-w-[400px]">
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
                        <Button variant="outline" onClick={() => setIsAddCollectionOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddCollection} disabled={!newCollectionName.trim()}>
                            Create Collection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Tag Dialog */}
            <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                <DialogContent className="sm:max-w-[400px]">
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
                                            'h-8 w-8 rounded-full transition-all hover:scale-110',
                                            newTagColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div
                                    className="h-9 w-9 rounded-md border border-border shrink-0"
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
                        <Button variant="outline" onClick={() => setIsAddTagOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                            Create Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

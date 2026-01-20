import { useState } from 'react'
import { config } from '@/lib/config'
import { ImportBookmarksDialog } from '@/components/bookmarks/ImportBookmarksDialog'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useBookmarkStore } from '@/store/bookmark-store'
import { cn, isDemoMode } from '@/lib/utils'
import type { Collection, Tag } from '@/types'
import { toast } from 'sonner'
import {
    Bookmark,
    FolderOpen,
    Heart,
    Archive,
    Trash2,
    Plus,
    Inbox,
    X,
    Upload,
    MoreHorizontal,
    Pencil,
    Folder,
    Star,
    Code,
    Book,
    Music,
    Camera,
    Globe,
    Briefcase,
    GraduationCap,
    ShoppingBag,
    Gamepad2,
    Plane,
    Home,
    Utensils,
    Film,
    Palette,
    Lightbulb,
    Wrench,
    type LucideIcon,
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

// Collection icons mapping
const COLLECTION_ICONS: { name: string; icon: LucideIcon }[] = [
    { name: 'folder', icon: Folder },
    { name: 'folder-open', icon: FolderOpen },
    { name: 'star', icon: Star },
    { name: 'heart', icon: Heart },
    { name: 'bookmark', icon: Bookmark },
    { name: 'code', icon: Code },
    { name: 'book', icon: Book },
    { name: 'music', icon: Music },
    { name: 'camera', icon: Camera },
    { name: 'globe', icon: Globe },
    { name: 'briefcase', icon: Briefcase },
    { name: 'graduation-cap', icon: GraduationCap },
    { name: 'shopping-bag', icon: ShoppingBag },
    { name: 'gamepad', icon: Gamepad2 },
    { name: 'plane', icon: Plane },
    { name: 'home', icon: Home },
    { name: 'utensils', icon: Utensils },
    { name: 'film', icon: Film },
    { name: 'palette', icon: Palette },
    { name: 'lightbulb', icon: Lightbulb },
    { name: 'wrench', icon: Wrench },
]

// Helper to get icon component from name
function getCollectionIcon(iconName?: string): LucideIcon {
    const found = COLLECTION_ICONS.find((i) => i.name === iconName)
    return found?.icon || FolderOpen
}

interface SidebarProps {
    isCollapsed: boolean
    onCloseMobile?: () => void
}

export function Sidebar({ isCollapsed, onCloseMobile }: SidebarProps) {
    const {
        collections,
        tags,
        bookmarks,
        activeSection,
        setActiveSection,
        selectedTags,
        toggleTag,
        addCollection,
        updateCollection,
        deleteCollection,
        addTag,
        updateTag,
        deleteTag,
    } = useBookmarkStore()

    // Add Collection state
    const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false)
    const [newCollectionName, setNewCollectionName] = useState('')
    const [newCollectionIcon, setNewCollectionIcon] = useState('folder')

    // Edit Collection state
    const [isEditCollectionOpen, setIsEditCollectionOpen] = useState(false)
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
    const [editCollectionName, setEditCollectionName] = useState('')
    const [editCollectionIcon, setEditCollectionIcon] = useState('folder')

    // Delete Collection state
    const [isDeleteCollectionOpen, setIsDeleteCollectionOpen] = useState(false)
    const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null)

    // Add Tag state
    const [isAddTagOpen, setIsAddTagOpen] = useState(false)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
    const [hexInput, setHexInput] = useState(TAG_COLORS[0])

    // Edit Tag state
    const [isEditTagOpen, setIsEditTagOpen] = useState(false)
    const [editingTag, setEditingTag] = useState<Tag | null>(null)
    const [editTagName, setEditTagName] = useState('')
    const [editTagColor, setEditTagColor] = useState(TAG_COLORS[0])
    const [editHexInput, setEditHexInput] = useState(TAG_COLORS[0])

    // Delete Tag state
    const [isDeleteTagOpen, setIsDeleteTagOpen] = useState(false)
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

    const [isImportOpen, setIsImportOpen] = useState(false)

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

    // Collection handlers
    const handleAddCollection = () => {
        if (newCollectionName.trim()) {
            addCollection(newCollectionName.trim(), newCollectionIcon)
            setNewCollectionName('')
            setNewCollectionIcon('folder')
            setIsAddCollectionOpen(false)
            toast.success('Collection created')
        }
    }

    const handleOpenEditCollection = (collection: Collection) => {
        setEditingCollection(collection)
        setEditCollectionName(collection.name)
        setEditCollectionIcon(collection.icon || 'folder')
        setIsEditCollectionOpen(true)
    }

    const handleEditCollection = () => {
        if (editingCollection && editCollectionName.trim()) {
            updateCollection(editingCollection.id, {
                name: editCollectionName.trim(),
                icon: editCollectionIcon,
            })
            setIsEditCollectionOpen(false)
            setEditingCollection(null)
            toast.success('Collection updated')
        }
    }

    const handleOpenDeleteCollection = (collection: Collection) => {
        setDeletingCollection(collection)
        setIsDeleteCollectionOpen(true)
    }

    const handleDeleteCollection = () => {
        if (deletingCollection) {
            deleteCollection(deletingCollection.id)
            setIsDeleteCollectionOpen(false)
            setDeletingCollection(null)
            toast.success('Collection deleted')
        }
    }

    // Tag handlers
    const handleAddTag = () => {
        if (newTagName.trim()) {
            addTag(newTagName.trim(), newTagColor)
            setNewTagName('')
            setNewTagColor(TAG_COLORS[0])
            setHexInput(TAG_COLORS[0])
            setIsAddTagOpen(false)
            toast.success('Tag created')
        }
    }

    const handleOpenEditTag = (tag: Tag) => {
        setEditingTag(tag)
        setEditTagName(tag.name)
        setEditTagColor(tag.color)
        setEditHexInput(tag.color)
        setIsEditTagOpen(true)
    }

    const handleEditTag = () => {
        if (editingTag && editTagName.trim()) {
            updateTag(editingTag.id, {
                name: editTagName.trim(),
                color: editTagColor,
            })
            setIsEditTagOpen(false)
            setEditingTag(null)
            toast.success('Tag updated')
        }
    }

    const handleOpenDeleteTag = (tag: Tag) => {
        setDeletingTag(tag)
        setIsDeleteTagOpen(true)
    }

    const handleDeleteTag = () => {
        if (deletingTag) {
            // Remove from filter if selected
            if (selectedTags.includes(deletingTag.id)) {
                toggleTag(deletingTag.id)
            }
            deleteTag(deletingTag.id)
            setIsDeleteTagOpen(false)
            setDeletingTag(null)
            toast.success('Tag deleted')
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

    const handleEditColorSelect = (color: string) => {
        setEditTagColor(color)
        setEditHexInput(color)
    }

    const handleEditHexChange = (value: string) => {
        setEditHexInput(value)
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            setEditTagColor(value)
        }
    }

    const handleNavClick = (id: string) => {
        setActiveSection(id)
        onCloseMobile?.()
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
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-400 shadow-sm overflow-hidden">
                            {config.appIcon ? (
                                <img
                                    src={config.appIcon}
                                    alt={config.appName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Bookmark className="h-5 w-5 text-white fill-white/20" />
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-sm font-semibold text-sidebar-foreground truncate">
                                    {config.appName}
                                </span>
                                {config.appSubtitle && (
                                    <span className="text-xs text-sidebar-muted truncate">
                                        {config.appSubtitle}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Mobile close button */}
                    {!isCollapsed && onCloseMobile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground"
                            onClick={onCloseMobile}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    {/* Main Navigation */}
                    <div className="space-y-1.5 pb-6">
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                onClick={() => handleNavClick(item.id)}
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

                        {/* Import Bookmarks Button */}
                        <Button
                            variant="ghost"
                            onClick={() => setIsImportOpen(true)}
                            disabled={isDemoMode()}
                            className={cn(
                                'w-full h-10 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                            )}
                            title={isCollapsed ? "Import Bookmarks" : undefined}
                        >
                            <Upload className="h-5 w-5 shrink-0" />
                            {!isCollapsed && (
                                <span className="flex-1 text-left text-sm truncate">Import</span>
                            )}
                        </Button>
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
                                disabled={isDemoMode()}
                                title="Add Collection"
                            >
                                <Plus className={cn("transition-all", isCollapsed ? "h-5 w-5" : "h-3.5 w-3.5")} />
                            </Button>
                        </div>
                        <div className="space-y-1.5">
                            {collections
                                .filter((c) => !c.isSystem)
                                .map((collection) => {
                                    const IconComponent = getCollectionIcon(collection.icon)
                                    return (
                                        <div key={collection.id} className="group relative flex items-center">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleNavClick(collection.id)}
                                                className={cn(
                                                    'flex-1 h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
                                                    activeSection === collection.id && 'bg-sidebar-border text-sidebar-foreground',
                                                    isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                                                )}
                                                title={isCollapsed ? collection.name : undefined}
                                            >
                                                <IconComponent className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="flex-1 text-left text-sm truncate">
                                                            {collection.name}
                                                        </span>
                                                        <span className="text-xs text-sidebar-muted group-hover:hidden">
                                                            {getCollectionCount(collection.id)}
                                                        </span>
                                                    </>
                                                )}
                                            </Button>
                                            {!isCollapsed && !isDemoMode() && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1"
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        <DropdownMenuItem onClick={() => handleOpenEditCollection(collection)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleOpenDeleteCollection(collection)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    )
                                })}
                            <Button
                                variant="ghost"
                                onClick={() => handleNavClick('unsorted')}
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
                                disabled={isDemoMode()}
                                title="Add Tag"
                            >
                                <Plus className={cn("transition-all", isCollapsed ? "h-5 w-5" : "h-3.5 w-3.5")} />
                            </Button>
                        </div>
                        <div className="space-y-1.5 px-0.5">
                            {tags.map((tag) => (
                                <div key={tag.id} className="group relative flex items-center">
                                    <Button
                                        variant="ghost"
                                        onClick={() => toggleTag(tag.id)}
                                        className={cn(
                                            'flex-1 h-9 text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground transition-all',
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
                                                    className="h-5 min-w-[1.25rem] justify-center px-1.5 text-xs group-hover:hidden"
                                                >
                                                    {getTagCount(tag.id)}
                                                </Badge>
                                            </>
                                        )}
                                    </Button>
                                    {!isCollapsed && !isDemoMode() && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1"
                                                >
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32">
                                                <DropdownMenuItem onClick={() => handleOpenEditTag(tag)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenDeleteTag(tag)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </aside>

            {/* Add Collection Dialog */}
            <Dialog open={isAddCollectionOpen} onOpenChange={setIsAddCollectionOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
                    <DialogHeader>
                        <DialogTitle>New Collection</DialogTitle>
                        <DialogDescription>
                            Create a new collection to organize your bookmarks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
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
                        <div>
                            <Label className="text-sm font-medium">Icon</Label>
                            <div className="grid grid-cols-7 gap-2 mt-2">
                                {COLLECTION_ICONS.map(({ name, icon: Icon }) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setNewCollectionIcon(name)}
                                        className={cn(
                                            'h-9 w-9 flex items-center justify-center rounded-md transition-all hover:bg-accent',
                                            newCollectionIcon === name && 'bg-primary text-primary-foreground hover:bg-primary'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsAddCollectionOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={handleAddCollection} disabled={!newCollectionName.trim()} className="w-full sm:w-auto">
                            Create Collection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Collection Dialog */}
            <Dialog open={isEditCollectionOpen} onOpenChange={setIsEditCollectionOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
                    <DialogHeader>
                        <DialogTitle>Edit Collection</DialogTitle>
                        <DialogDescription>
                            Update the collection name and icon.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="edit-collection-name" className="text-sm font-medium">
                                Name
                            </Label>
                            <Input
                                id="edit-collection-name"
                                placeholder="Collection name"
                                value={editCollectionName}
                                onChange={(e) => setEditCollectionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditCollection()
                                }}
                                className="mt-2"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Icon</Label>
                            <div className="grid grid-cols-7 gap-2 mt-2">
                                {COLLECTION_ICONS.map(({ name, icon: Icon }) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setEditCollectionIcon(name)}
                                        className={cn(
                                            'h-9 w-9 flex items-center justify-center rounded-md transition-all hover:bg-accent',
                                            editCollectionIcon === name && 'bg-primary text-primary-foreground hover:bg-primary'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsEditCollectionOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={handleEditCollection} disabled={!editCollectionName.trim()} className="w-full sm:w-auto">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Collection Confirmation Dialog */}
            <Dialog open={isDeleteCollectionOpen} onOpenChange={setIsDeleteCollectionOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
                    <DialogHeader>
                        <DialogTitle>Delete Collection</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deletingCollection?.name}"? Bookmarks in this collection will be moved to Unsorted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteCollectionOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteCollection} className="w-full sm:w-auto">
                            Delete Collection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Tag Dialog */}
            <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
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
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsAddTagOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={handleAddTag} disabled={!newTagName.trim()} className="w-full sm:w-auto">
                            Create Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tag Dialog */}
            <Dialog open={isEditTagOpen} onOpenChange={setIsEditTagOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
                    <DialogHeader>
                        <DialogTitle>Edit Tag</DialogTitle>
                        <DialogDescription>
                            Update the tag name and color.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="edit-tag-name" className="text-sm font-medium">
                                Name
                            </Label>
                            <Input
                                id="edit-tag-name"
                                placeholder="Tag name"
                                value={editTagName}
                                onChange={(e) => setEditTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditTag()
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
                                        onClick={() => handleEditColorSelect(color)}
                                        className={cn(
                                            'h-8 w-8 rounded-full transition-all hover:scale-110',
                                            editTagColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div
                                    className="h-9 w-9 rounded-md border border-border shrink-0"
                                    style={{ backgroundColor: editTagColor }}
                                />
                                <Input
                                    value={editHexInput}
                                    onChange={(e) => handleEditHexChange(e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsEditTagOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={handleEditTag} disabled={!editTagName.trim()} className="w-full sm:w-auto">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Tag Confirmation Dialog */}
            <Dialog open={isDeleteTagOpen} onOpenChange={setIsDeleteTagOpen}>
                <DialogContent className="sm:max-w-[400px] max-w-[calc(100vw-2rem)]">
                    <DialogHeader>
                        <DialogTitle>Delete Tag</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deletingTag?.name}"? This tag will be removed from all bookmarks.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteTagOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTag} className="w-full sm:w-auto">
                            Delete Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Bookmarks Dialog */}
            <ImportBookmarksDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
        </>
    )
}

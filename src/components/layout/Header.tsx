import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog'
import { useBookmarkStore } from '@/store/bookmark-store'
import {
    Search,
    Plus,
    LayoutGrid,
    List,
    ArrowUpDown,
    SlidersHorizontal,
    X,
    Command,
} from 'lucide-react'
import type { SortOption } from '@/types'

interface HeaderProps {
    onAddBookmark: () => void
}

export function Header({ onAddBookmark }: HeaderProps) {
    const {
        viewMode,
        setViewMode,
        sortOption,
        setSortOption,
        searchQuery,
        setSearchQuery,
        activeSection,
        bookmarks,
        tags,
        selectedTags,
        toggleTag,
        setSelectedTags,
        collections,
    } = useBookmarkStore()

    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcut: Ctrl+K or Cmd+K to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setIsSearchOpen(true)
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isSearchOpen])

    // Focus search input when dialog opens
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 0)
        }
    }, [isSearchOpen])

    const getTitle = () => {
        switch (activeSection) {
            case 'all':
                return 'All Bookmarks'
            case 'favorites':
                return 'Favorites'
            case 'archive':
                return 'Archive'
            case 'trash':
                return 'Trash'
            case 'unsorted':
                return 'Unsorted'
            default:
                const collection = collections.find(c => c.id === activeSection)
                return collection?.name || 'Bookmarks'
        }
    }

    const getCount = () => {
        switch (activeSection) {
            case 'all':
                return bookmarks.filter((b) => !b.isTrashed && !b.isArchived).length
            case 'favorites':
                return bookmarks.filter((b) => b.isFavorite && !b.isTrashed).length
            case 'archive':
                return bookmarks.filter((b) => b.isArchived).length
            case 'trash':
                return bookmarks.filter((b) => b.isTrashed).length
            default:
                return bookmarks.filter(
                    (b) => b.collectionId === activeSection && !b.isTrashed && !b.isArchived
                ).length
        }
    }

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'date-desc', label: 'Newest First' },
        { value: 'date-asc', label: 'Oldest First' },
        { value: 'name-asc', label: 'Name (A-Z)' },
        { value: 'name-desc', label: 'Name (Z-A)' },
    ]

    const getSortLabel = () => {
        const option = sortOptions.find(o => o.value === sortOption)
        return option?.label.split(' ')[0] || 'Date'
    }

    const clearFilters = () => {
        setSelectedTags([])
        setIsFilterOpen(false)
    }

    const hasActiveFilters = selectedTags.length > 0

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b border-border px-6">
                {/* Title */}
                <div>
                    <h1 className="text-lg font-semibold">{getTitle()}</h1>
                    <p className="text-xs text-muted-foreground">{getCount()} bookmarks</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-56 justify-start text-muted-foreground gap-2"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="h-4 w-4" />
                        <span className="flex-1 text-left">Search...</span>
                        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                            <Command className="h-3 w-3" />K
                        </kbd>
                    </Button>

                    {/* View Toggle */}
                    <div className="flex items-center rounded-md border border-border bg-secondary p-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className={`h-7 w-7 ${viewMode === 'grid'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-transparent'
                                }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('list')}
                            className={`h-7 w-7 ${viewMode === 'list'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-transparent'
                                }`}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Sort */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 h-8">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{getSortLabel()}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {sortOptions.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => setSortOption(option.value)}
                                    className={sortOption === option.value ? 'bg-accent' : ''}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filter */}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={hasActiveFilters ? 'default' : 'outline'}
                                size="sm"
                                className="gap-1.5 h-8"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Filter</span>
                                {hasActiveFilters && (
                                    <Badge variant="secondary" className="h-4 min-w-[1rem] px-1 text-[10px] bg-primary-foreground text-primary">
                                        {selectedTags.length}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Filter by Tags</h4>
                                    {hasActiveFilters && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="h-auto py-0.5 px-1.5 text-xs"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent cursor-pointer"
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            <div
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="flex-1 text-sm">{tag.name}</span>
                                            <input
                                                type="checkbox"
                                                checked={selectedTags.includes(tag.id)}
                                                onChange={() => toggleTag(tag.id)}
                                                className="h-3.5 w-3.5 rounded border-border"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Add Bookmark */}
                    <Button onClick={onAddBookmark} size="sm" className="gap-1.5 h-8">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Add Bookmark</span>
                    </Button>
                </div>
            </header>

            {/* Search Dialog */}
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0">
                    <div className="flex items-center border-b px-4">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search bookmarks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchQuery ? (
                            <p>Showing results for "{searchQuery}"</p>
                        ) : (
                            <p>Start typing to search your bookmarks</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

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
import { useBookmarkStore } from '@/store/bookmark-store'
import {
    Search,
    Plus,
    LayoutGrid,
    List,
    ArrowUpDown,
    SlidersHorizontal,
    Platform,
    PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortOption } from '@/types'

interface HeaderProps {
    onAddBookmark: () => void
    isSidebarCollapsed: boolean
    onToggleSidebar: () => void
}

export function Header({ onAddBookmark, isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
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
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

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
        <header className="flex h-20 items-center justify-between border-b border-border px-6 transition-all duration-300">
            {/* Title */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className="mr-2 text-muted-foreground hover:text-foreground"
                >
                    <PanelLeft className={cn("h-5 w-5 transition-transform", isSidebarCollapsed && "rotate-180")} />
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">{getTitle()}</h1>
                    <p className="text-sm text-muted-foreground">{getCount()} bookmarks</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 pl-9 pr-16 bg-secondary border-none"
                    />
                    <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* View Toggle */}
                <div className="flex items-center rounded-md border border-border bg-secondary p-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={`h-8 w-8 ${viewMode === 'grid'
                            ? 'bg-background shadow-sm'
                            : 'hover:bg-transparent'
                            }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className={`h-8 w-8 ${viewMode === 'list'
                            ? 'bg-background shadow-sm'
                            : 'hover:bg-transparent'
                            }`}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>

                {/* Sort */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            {getSortLabel()}
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
                            className="gap-2"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filter
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1.5 text-xs bg-primary-foreground text-primary">
                                    {selectedTags.length}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium">Filter by Tags</h4>
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-auto py-1 px-2 text-xs"
                                    >
                                        Clear all
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                                {tags.map((tag) => {
                                    const isSelected = selectedTags.includes(tag.id)
                                    return (
                                        <div
                                            key={tag.id}
                                            className={cn(
                                                "flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent cursor-pointer transition-colors",
                                                isSelected && "bg-accent"
                                            )}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            <div className={cn(
                                                "flex h-4 w-4 items-center justify-center rounded border border-primary/50",
                                                isSelected ? "bg-primary border-primary" : "bg-transparent"
                                            )}>
                                                {isSelected && <div className="h-2 w-2 rounded-sm bg-primary-foreground" />}
                                            </div>
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="flex-1 text-sm select-none">{tag.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Add Bookmark */}
                <Button onClick={onAddBookmark} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Bookmark
                </Button>
            </div>
        </header>
    )
}

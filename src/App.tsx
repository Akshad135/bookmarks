import { useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { StatsCards } from '@/components/stats/StatsCards'
import { BookmarkGrid } from '@/components/bookmarks/BookmarkGrid'
import { BookmarkList } from '@/components/bookmarks/BookmarkList'
import { AddBookmarkDialog } from '@/components/bookmarks/AddBookmarkDialog'
import { Toaster } from '@/components/ui/sonner'
import { useBookmarkStore } from '@/store/bookmark-store'
import type { Bookmark } from '@/types'

function App() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const { viewMode } = useBookmarkStore()

    const handleAddBookmark = () => {
        setEditingBookmark(null)
        setIsAddDialogOpen(true)
    }

    const handleEditBookmark = (bookmark: Bookmark) => {
        setEditingBookmark(bookmark)
        setIsAddDialogOpen(true)
    }

    const handleDialogClose = (open: boolean) => {
        setIsAddDialogOpen(open)
        if (!open) {
            setEditingBookmark(null)
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex h-screen bg-background">
                {/* Sidebar */}
                <Sidebar isCollapsed={isSidebarCollapsed} />

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Header */}
                    <Header
                        onAddBookmark={handleAddBookmark}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        {/* Stats */}
                        <StatsCards />

                        {/* Bookmarks View */}
                        {viewMode === 'grid' ? (
                            <BookmarkGrid onEditBookmark={handleEditBookmark} />
                        ) : (
                            <BookmarkList onEditBookmark={handleEditBookmark} />
                        )}
                    </ScrollArea>
                </div>

                {/* Add/Edit Bookmark Dialog */}
                <AddBookmarkDialog
                    open={isAddDialogOpen}
                    onOpenChange={handleDialogClose}
                    editBookmark={editingBookmark}
                />
                <Toaster />
            </div>
        </TooltipProvider>
    )
}

export default App

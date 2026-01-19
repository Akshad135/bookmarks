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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
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

    const handleToggleSidebar = () => {
        // On mobile, toggle the mobile sidebar overlay
        if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
        } else {
            setIsSidebarCollapsed(!isSidebarCollapsed)
        }
    }

    const closeMobileSidebar = () => {
        setIsMobileSidebarOpen(false)
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex h-screen bg-background overflow-hidden">
                {/* Mobile Sidebar Backdrop */}
                {isMobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={closeMobileSidebar}
                    />
                )}

                {/* Sidebar - hidden on mobile by default, shown as overlay when open */}
                <div className={`
                    fixed inset-y-0 left-0 z-50 md:relative md:z-0
                    transform transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <Sidebar
                        isCollapsed={isSidebarCollapsed}
                        onCloseMobile={closeMobileSidebar}
                    />
                </div>

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                    {/* Header */}
                    <Header
                        onAddBookmark={handleAddBookmark}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={handleToggleSidebar}
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

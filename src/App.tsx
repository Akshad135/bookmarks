import { useState, useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { StatsCards } from '@/components/stats/StatsCards'
import { BookmarkGrid } from '@/components/bookmarks/BookmarkGrid'
import { BookmarkList } from '@/components/bookmarks/BookmarkList'
import { AddBookmarkDialog } from '@/components/bookmarks/AddBookmarkDialog'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { Toaster } from '@/components/ui/sonner'
import { useBookmarkStore } from '@/store/bookmark-store'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import type { Bookmark } from '@/types'

function App() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
    const [initialDialogData, setInitialDialogData] = useState<Partial<Bookmark> | null>(null)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const { viewMode, initializeDemoMode } = useBookmarkStore()

    useEffect(() => {
        initializeDemoMode()
    }, [initializeDemoMode])

    // Initialize Supabase auth and realtime subscriptions
    const { user, isConfigured, isLoading, login } = useSupabaseAuth()

    // Handle Share Target API
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const title = params.get('title')
        const text = params.get('text')
        const url = params.get('url')

        if (title || text || url) {
            // Extract URL from text if url param is empty (common in some apps)
            let finalUrl = url || ''
            if (!finalUrl && text) {
                // Simple regex to extract URL from text
                const urlMatch = text.match(/(https?:\/\/[^\s]+)/g)
                if (urlMatch) {
                    finalUrl = urlMatch[0]
                }
            }

            // Remove shared params from URL to prevent reopening on refresh
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)

            if (finalUrl) {
                setInitialDialogData({
                    title: title || '',
                    url: finalUrl,
                    description: (text && text !== finalUrl) ? text : '', // Use text as description if it's not just the URL
                })
                setIsAddDialogOpen(true)
            }
        }
    }, [])

    const handleAddBookmark = () => {
        if (import.meta.env.VITE_DEMO_MODE === 'true') return
        setEditingBookmark(null)
        setInitialDialogData(null)
        setIsAddDialogOpen(true)
    }

    const handleEditBookmark = (bookmark: Bookmark) => {
        setEditingBookmark(bookmark)
        setInitialDialogData(null)
        setIsAddDialogOpen(true)
    }

    const handleDialogClose = (open: boolean) => {
        setIsAddDialogOpen(open)
        if (!open) {
            setEditingBookmark(null)
            setInitialDialogData(null)
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
                        <div className="w-full max-w-full">
                            {/* Stats */}
                            <StatsCards />

                            {/* Bookmarks View */}
                            {viewMode === 'grid' ? (
                                <BookmarkGrid onEditBookmark={handleEditBookmark} />
                            ) : (
                                <BookmarkList onEditBookmark={handleEditBookmark} />
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Add/Edit Bookmark Dialog */}
                <AddBookmarkDialog
                    open={isAddDialogOpen}
                    onOpenChange={handleDialogClose}
                    editBookmark={editingBookmark}
                    initialData={initialDialogData}
                />

                {/* Login Dialog - shown when Supabase is configured but user is not authenticated */}
                <LoginDialog
                    open={isConfigured && !isLoading && !user}
                    onLogin={login}
                    isLoading={isLoading}
                />

                <Toaster />
            </div>
        </TooltipProvider>
    )
}

export default App

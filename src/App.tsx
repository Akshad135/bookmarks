import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import type { Bookmark } from '@/types'

function App() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
    const [initialDialogData, setInitialDialogData] = useState<Partial<Bookmark> | null>(null)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [showSecurityWarning, setShowSecurityWarning] = useState(
        typeof window !== 'undefined' &&
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
    )
    const { viewMode, initializeDemoMode } = useBookmarkStore()

    useEffect(() => {
        initializeDemoMode()
    }, [initializeDemoMode])

    // Initialize auth
    const { authenticated, isLoading, login } = useAuth()

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

    // Real-time synchronization via Server-Sent Events (SSE)
    useEffect(() => {
        if (!authenticated || import.meta.env.VITE_DM === 'true') return

        const eventSource = new EventSource('/api/sync/events')

        eventSource.onmessage = (event) => {
            if (event.data === 'reload') {
                // Silently refetch bookmarks, collections, and tags
                useBookmarkStore.getState().fetchFromServer()
            }
        }

        eventSource.onerror = () => {
            console.warn('Real-time sync connection interrupted. Reconnecting...')
        }

        return () => {
            eventSource.close()
        }
    }, [authenticated])

    const handleAddBookmark = () => {
        if (import.meta.env.VITE_DM === 'true') return
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


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
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
                    {/* Security Warning Banner */}
                    {showSecurityWarning && authenticated && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs px-4 py-2.5 flex items-center justify-between shrink-0 font-medium z-30">
                            <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                Warning: Running over insecure HTTP. Passwords/data are sent unencrypted. We recommend enabling Tailscale HTTPS or a reverse proxy.
                            </span>
                            <button
                                onClick={() => setShowSecurityWarning(false)}
                                className="hover:text-amber-400 font-bold px-1.5 transition-colors cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

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

                {/* Login Dialog - shown when user is not authenticated */}
                <LoginDialog
                    open={import.meta.env.VITE_DM !== 'true' && !isLoading && !authenticated}
                    onLogin={login}
                    isLoading={isLoading}
                />

                <Toaster />
            </div>
        </TooltipProvider>
    )
}

export default App

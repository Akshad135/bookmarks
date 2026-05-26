import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import type { Bookmark, Collection, Tag, ViewMode, SortOption, FilterSection } from '@/types'
import { generateId } from '@/lib/utils'
import { isDemoMode, getFaviconUrl } from '@/lib/utils'
import { parseBookmarkHtml } from '@/lib/bookmark-parser'
import { api } from '@/lib/api'

interface BookmarkState {
    bookmarks: Bookmark[]
    collections: Collection[]
    tags: Tag[]
    viewMode: ViewMode
    sortOption: SortOption
    activeSection: FilterSection
    searchQuery: string
    selectedTags: string[]
    authenticated: boolean
    isSyncing: boolean

    // Demo actions
    initializeDemoMode: () => Promise<void>

    // Auth actions
    setAuthenticated: (value: boolean) => void

    // Sync actions
    fetchFromServer: () => Promise<void>

    // Bookmark actions
    addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isTrashed' | 'isArchived'>) => void
    updateBookmark: (id: string, updates: Partial<Bookmark>) => void
    deleteBookmark: (id: string) => void
    toggleFavorite: (id: string) => void
    toggleArchive: (id: string) => void
    togglePin: (id: string) => void
    moveToTrash: (id: string) => void
    restoreFromTrash: (id: string) => void
    permanentlyDelete: (id: string) => void
    emptyTrash: () => void

    // Collection actions
    addCollection: (name: string, icon?: string, color?: string) => Promise<string>
    updateCollection: (id: string, updates: Partial<Collection>) => void
    deleteCollection: (id: string) => void

    // Tag actions
    addTag: (name: string, color: string) => void
    updateTag: (id: string, updates: Partial<Tag>) => void
    deleteTag: (id: string) => void

    // UI actions
    setViewMode: (mode: ViewMode) => void
    setSortOption: (option: SortOption) => void
    setActiveSection: (section: FilterSection) => void
    setSearchQuery: (query: string) => void
    setSelectedTags: (tags: string[]) => void
    toggleTag: (tagId: string) => void
}

const defaultCollections: Collection[] = [
    { id: 'all', name: 'All Bookmarks', icon: 'bookmark', isSystem: true },
    { id: 'unsorted', name: 'Unsorted', icon: 'inbox', isSystem: true },
]

const defaultTags: Tag[] = []

export const useBookmarkStore = create<BookmarkState>()(
    persist(
        (set, get) => ({
            bookmarks: [],
            collections: defaultCollections,
            tags: defaultTags,
            viewMode: 'grid',
            sortOption: 'date-desc',
            activeSection: 'all',
            searchQuery: '',
            selectedTags: [],
            authenticated: false,
            isSyncing: false,

            // Auth actions
            setAuthenticated: (value) => set({ authenticated: value }),

            initializeDemoMode: async () => {
                if (!isDemoMode()) return

                try {
                    const response = await fetch('/bookmarks1.html')
                    if (!response.ok) throw new Error('Failed to fetch demo data')
                    const text = await response.text()
                    const { bookmarks } = parseBookmarkHtml(text, 5000)

                    // Extract unique folders and create collections
                    const folderMap = new Map<string, string>()
                    const newCollections: Collection[] = [...defaultCollections]

                    bookmarks.forEach(b => {
                        if (b.folder) {
                            const folderName = b.folder.split('/').pop() || ''
                            if (folderName && !folderMap.has(folderName)) {
                                const id = generateId()
                                newCollections.push({
                                    id,
                                    name: folderName,
                                    icon: 'folder',
                                    isSystem: false
                                })
                                folderMap.set(folderName, id)
                            }
                        }
                    })

                    // Extract unique tags and create tag objects
                    const tagMap = new Map<string, string>()
                    const newTags: Tag[] = []

                    const TAG_COLORS = [
                        '#ef4444', '#f97316', '#eab308', '#22c55e',
                        '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
                    ]

                    bookmarks.forEach(b => {
                        if (b.tags) {
                            b.tags.forEach(tagName => {
                                if (!tagMap.has(tagName)) {
                                    const id = generateId()
                                    newTags.push({
                                        id,
                                        name: tagName,
                                        color: TAG_COLORS[newTags.length % TAG_COLORS.length],
                                    })
                                    tagMap.set(tagName, id)
                                }
                            })
                        }
                    })

                    const storeBookmarks: Bookmark[] = bookmarks.map(b => {
                        const folderName = b.folder?.split('/').pop() || ''
                        const collectionId = folderName ? (folderMap.get(folderName) || 'unsorted') : 'unsorted'
                        const bookmarkTags = b.tags?.map(t => tagMap.get(t)!).filter(Boolean) || []

                        return {
                            id: generateId(),
                            url: b.url,
                            title: b.title,
                            description: '',
                            thumbnail: '',
                            collectionId,
                            tags: bookmarkTags,
                            isFavorite: b.isFavorite || false,
                            isArchived: false,
                            isTrashed: false,
                            isPinned: b.isPinned || false,
                            createdAt: b.addDate ? b.addDate.toISOString() : new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            favicon: getFaviconUrl(b.url)
                        }
                    })

                    set({
                        bookmarks: storeBookmarks,
                        collections: newCollections,
                        tags: newTags
                    })
                } catch (error) {
                    console.error('Failed to load demo data:', error)
                }
            },

            // Sync actions
            fetchFromServer: async () => {
                if (isDemoMode()) return
                if (!get().authenticated) return

                set({ isSyncing: true })

                try {
                    const [bookmarks, serverCollections, tags] = await Promise.all([
                        api.getBookmarks(),
                        api.getCollections(),
                        api.getTags(),
                    ])

                    // Merge system collections with server collections
                    const systemCollections = defaultCollections.filter(c => c.isSystem)
                    const mergedCollections = [
                        ...systemCollections,
                        ...serverCollections.filter(c => !c.isSystem)
                    ]

                    set({ bookmarks, collections: mergedCollections, tags })
                } catch (error) {
                    console.error('Failed to fetch from server:', error)
                } finally {
                    set({ isSyncing: false })
                }
            },

            // Bookmark actions with optimistic updates
            addBookmark: async (bookmark) => {
                if (isDemoMode()) return
                const id = generateId()
                const now = new Date().toISOString()
                const newBookmark: Bookmark = {
                    ...bookmark,
                    id,
                    isTrashed: false,
                    isArchived: false,
                    isPinned: bookmark.isPinned ?? false,
                    createdAt: now,
                    updatedAt: now,
                }

                // Optimistic update
                set((state) => ({
                    bookmarks: [...state.bookmarks, newBookmark],
                }))

                // Sync to server
                if (get().authenticated) {
                    try {
                        await api.createBookmark(newBookmark)
                    } catch (error) {
                        console.error('Failed to add bookmark:', error)
                        // Revert optimistic update
                        set((state) => ({
                            bookmarks: state.bookmarks.filter((b) => b.id !== id),
                        }))
                    }
                }
            },

            updateBookmark: async (id, updates) => {
                if (isDemoMode()) return
                const now = new Date().toISOString()

                // Optimistic update
                let previousBookmark: Bookmark | undefined
                set((state) => {
                    previousBookmark = state.bookmarks.find((b) => b.id === id)
                    return {
                        bookmarks: state.bookmarks.map((b) =>
                            b.id === id ? { ...b, ...updates, updatedAt: now } : b
                        ),
                    }
                })

                // Sync to server
                if (get().authenticated) {
                    try {
                        await api.updateBookmark(id, { ...updates, updatedAt: now })
                    } catch (error) {
                        console.error('Failed to update bookmark:', error)
                        // Revert
                        if (previousBookmark) {
                            set((state) => ({
                                bookmarks: state.bookmarks.map((b) =>
                                    b.id === id ? previousBookmark! : b
                                ),
                            }))
                        }
                    }
                }
            },

            deleteBookmark: async (id) => {
                if (isDemoMode()) return
                // Optimistic update
                let deletedBookmark: Bookmark | undefined
                set((state) => {
                    deletedBookmark = state.bookmarks.find((b) => b.id === id)
                    return {
                        bookmarks: state.bookmarks.filter((b) => b.id !== id),
                    }
                })

                // Sync to server
                if (get().authenticated) {
                    try {
                        await api.deleteBookmark(id)
                    } catch (error) {
                        console.error('Failed to delete bookmark:', error)
                        // Revert
                        if (deletedBookmark) {
                            set((state) => ({
                                bookmarks: [...state.bookmarks, deletedBookmark!],
                            }))
                        }
                    }
                }
            },

            toggleFavorite: async (id) => {
                const bookmark = get().bookmarks.find((b) => b.id === id)
                if (bookmark) {
                    if (isDemoMode()) return
                    get().updateBookmark(id, { isFavorite: !bookmark.isFavorite })
                }
            },

            toggleArchive: async (id) => {
                const bookmark = get().bookmarks.find((b) => b.id === id)
                if (bookmark) {
                    if (isDemoMode()) return
                    get().updateBookmark(id, { isArchived: !bookmark.isArchived })
                }
            },

            togglePin: async (id) => {
                const bookmark = get().bookmarks.find((b) => b.id === id)
                if (bookmark) {
                    if (isDemoMode()) return
                    get().updateBookmark(id, { isPinned: !bookmark.isPinned })
                }
            },

            moveToTrash: (id) => {
                if (isDemoMode()) return
                get().updateBookmark(id, { isTrashed: true })
            },

            restoreFromTrash: (id) => {
                if (isDemoMode()) return
                get().updateBookmark(id, { isTrashed: false })
            },

            permanentlyDelete: (id) => {
                if (isDemoMode()) return
                get().deleteBookmark(id)
            },

            emptyTrash: async () => {
                if (isDemoMode()) return
                const trashedBookmarks = get().bookmarks.filter((b) => b.isTrashed)

                // Early return if no items to delete
                if (trashedBookmarks.length === 0) {
                    return
                }

                // Optimistic update
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => !b.isTrashed),
                }))

                // Sync to server
                if (get().authenticated) {
                    try {
                        await api.emptyTrash()
                    } catch (error) {
                        console.error('Failed to empty trash:', error)
                        // Revert
                        set((state) => ({
                            bookmarks: [...state.bookmarks, ...trashedBookmarks],
                        }))
                    }
                }
            },

            // Collection actions
            addCollection: async (name, icon, color) => {
                if (isDemoMode()) return generateId() // Return dummy ID
                const id = generateId()
                const newCollection: Collection = { id, name, icon, color }

                // Optimistic update
                set((state) => ({
                    collections: [...state.collections, newCollection],
                }))

                // Sync to server
                if (get().authenticated) {
                    try {
                        await api.createCollection({
                            ...newCollection,
                            isSystem: false,
                        })
                    } catch (error) {
                        console.error('Failed to add collection:', error)
                        set((state) => ({
                            collections: state.collections.filter((c) => c.id !== id),
                        }))
                    }
                }
                return id
            },

            updateCollection: async (id, updates) => {
                if (isDemoMode()) return
                let previousCollection: Collection | undefined
                set((state) => {
                    previousCollection = state.collections.find((c) => c.id === id)
                    return {
                        collections: state.collections.map((c) =>
                            c.id === id && !c.isSystem ? { ...c, ...updates } : c
                        ),
                    }
                })

                if (get().authenticated) {
                    try {
                        await api.updateCollection(id, updates)
                    } catch (error) {
                        console.error('Failed to update collection:', error)
                        if (previousCollection) {
                            set((state) => ({
                                collections: state.collections.map((c) =>
                                    c.id === id ? previousCollection! : c
                                ),
                            }))
                        }
                    }
                }
            },

            deleteCollection: async (id) => {
                if (isDemoMode()) return
                let deletedCollection: Collection | undefined
                set((state) => {
                    deletedCollection = state.collections.find((c) => c.id === id)
                    return {
                        collections: state.collections.filter((c) => c.id !== id && !c.isSystem),
                        bookmarks: state.bookmarks.map((b) =>
                            b.collectionId === id ? { ...b, collectionId: 'unsorted' } : b
                        ),
                    }
                })

                if (get().authenticated) {
                    try {
                        await api.deleteCollection(id)
                    } catch (error) {
                        console.error('Failed to delete collection:', error)
                        if (deletedCollection) {
                            set((state) => ({
                                collections: [...state.collections, deletedCollection!],
                            }))
                        }
                    }
                }
            },

            // Tag actions
            addTag: async (name, color) => {
                if (isDemoMode()) return
                const id = generateId()
                const newTag: Tag = { id, name, color }

                set((state) => ({
                    tags: [...state.tags, newTag],
                }))

                if (get().authenticated) {
                    try {
                        await api.createTag(newTag)
                    } catch (error) {
                        console.error('Failed to add tag:', error)
                        set((state) => ({
                            tags: state.tags.filter((t) => t.id !== id),
                        }))
                    }
                }
            },

            updateTag: async (id, updates) => {
                if (isDemoMode()) return
                let previousTag: Tag | undefined
                set((state) => {
                    previousTag = state.tags.find((t) => t.id === id)
                    return {
                        tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
                    }
                })

                if (get().authenticated) {
                    try {
                        await api.updateTag(id, updates)
                    } catch (error) {
                        console.error('Failed to update tag:', error)
                        if (previousTag) {
                            set((state) => ({
                                tags: state.tags.map((t) =>
                                    t.id === id ? previousTag! : t
                                ),
                            }))
                        }
                    }
                }
            },

            deleteTag: async (id) => {
                if (isDemoMode()) return
                let deletedTag: Tag | undefined
                set((state) => {
                    deletedTag = state.tags.find((t) => t.id === id)
                    return {
                        tags: state.tags.filter((t) => t.id !== id),
                        bookmarks: state.bookmarks.map((b) => ({
                            ...b,
                            tags: b.tags.filter((t) => t !== id),
                        })),
                    }
                })

                if (get().authenticated) {
                    try {
                        await api.deleteTag(id)
                    } catch (error) {
                        console.error('Failed to delete tag:', error)
                        if (deletedTag) {
                            set((state) => ({
                                tags: [...state.tags, deletedTag!],
                            }))
                        }
                    }
                }
            },

            // UI actions
            setViewMode: (mode) => set({ viewMode: mode }),
            setSortOption: (option) => set({ sortOption: option }),
            setActiveSection: (section) => set({ activeSection: section }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setSelectedTags: (tags) => set({ selectedTags: tags }),
            toggleTag: (tagId) =>
                set((state) => ({
                    selectedTags: state.selectedTags.includes(tagId)
                        ? state.selectedTags.filter((t) => t !== tagId)
                        : [...state.selectedTags, tagId],
                })),
        }),
        {
            name: 'bookmark-manager-storage',
            storage: createJSONStorage(() => ({
                getItem: async (name: string) => {
                    const value = await get(name)
                    return value ?? null
                },
                setItem: async (name: string, value: string) => {
                    await set(name, value)
                },
                removeItem: async (name: string) => {
                    if (isDemoMode()) return // Don't delete from real storage in demo mode
                    await del(name)
                },
            })),
            skipHydration: isDemoMode(), // Skip hydration in demo mode
            partialize: (state) => ({
                bookmarks: state.bookmarks,
                collections: state.collections,
                tags: state.tags,
                viewMode: state.viewMode,
                sortOption: state.sortOption,
                activeSection: state.activeSection,
                // Don't persist authenticated, isSyncing, searchQuery, selectedTags
            }),
        }
    )
)

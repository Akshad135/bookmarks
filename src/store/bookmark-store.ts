import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import type { Bookmark, Collection, Tag, ViewMode, SortOption, FilterSection } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { isDemoMode, getFaviconUrl } from '@/lib/utils'
import { parseBookmarkHtml } from '@/lib/bookmark-parser'

// Helper to convert camelCase to snake_case for DB
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        result[snakeKey] = obj[key]
    }
    return result
}

// Helper to convert snake_case to camelCase from DB (exported for use in hooks)
export const toCamelCase = <T>(obj: Record<string, unknown>): T => {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = obj[key]
    }
    return result as T
}

interface BookmarkState {
    bookmarks: Bookmark[]
    collections: Collection[]
    tags: Tag[]
    viewMode: ViewMode
    sortOption: SortOption
    activeSection: FilterSection
    searchQuery: string
    selectedTags: string[]
    user: User | null
    isSyncing: boolean

    // Demo actions
    initializeDemoMode: () => Promise<void>

    // Auth actions
    setUser: (user: User | null) => void

    // Sync actions
    fetchFromSupabase: () => Promise<void>

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

    // Incremental sync actions (for realtime updates from other devices)
    addBookmarkFromRemote: (bookmark: Bookmark) => void
    updateBookmarkFromRemote: (id: string, bookmark: Bookmark) => void
    deleteBookmarkFromRemote: (id: string) => void
    addCollectionFromRemote: (collection: Collection) => void
    updateCollectionFromRemote: (id: string, collection: Collection) => void
    deleteCollectionFromRemote: (id: string) => void
    addTagFromRemote: (tag: Tag) => void
    updateTagFromRemote: (id: string, tag: Tag) => void
    deleteTagFromRemote: (id: string) => void
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
            user: null,
            isSyncing: false,

            // Auth actions
            setUser: (user) => set({ user }),

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
                            isPinned: false,
                            createdAt: b.addDate ? b.addDate.toISOString() : new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            userId: 'demo-user', // Dummy user ID
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
            fetchFromSupabase: async () => {
                if (isDemoMode()) return
                if (!isSupabaseConfigured() || !supabase) return
                const { user } = get()
                if (!user) return

                set({ isSyncing: true })

                try {
                    const [bookmarksRes, collectionsRes, tagsRes] = await Promise.all([
                        supabase.from('bookmarks').select('*'),
                        supabase.from('collections').select('*'),
                        supabase.from('tags').select('*'),
                    ])

                    // Check for errors before overwriting state
                    if (bookmarksRes.error) {
                        console.error('Failed to fetch bookmarks:', bookmarksRes.error)
                        return
                    }
                    if (collectionsRes.error) {
                        console.error('Failed to fetch collections:', collectionsRes.error)
                        return
                    }
                    if (tagsRes.error) {
                        console.error('Failed to fetch tags:', tagsRes.error)
                        return
                    }

                    const bookmarks = (bookmarksRes.data || []).map(b => toCamelCase<Bookmark>(b))
                    const userCollections = (collectionsRes.data || []).map(c => toCamelCase<Collection>(c))
                    const tags = (tagsRes.data || []).map(t => toCamelCase<Tag>(t))

                    // Merge system collections with user collections
                    const systemCollections = defaultCollections.filter(c => c.isSystem)
                    const mergedCollections = [
                        ...systemCollections,
                        ...userCollections.filter(c => !c.isSystem)
                    ]

                    set({
                        bookmarks,
                        collections: mergedCollections,
                        tags,
                    })
                } catch (error) {
                    console.error('Failed to fetch from Supabase:', error)
                } finally {
                    set({ isSyncing: false })
                }
            },

            // Bookmark actions with optimistic updates
            addBookmark: async (bookmark) => {
                if (isDemoMode()) {
                    // console.warn('Operation disabled in demo mode')
                    return
                }
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

                // Sync to Supabase
                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbRecord = toSnakeCase({
                        ...newBookmark,
                        userId: user.id,
                    })
                    const { error } = await supabase.from('bookmarks').insert(dbRecord)
                    if (error) {
                        console.error('Failed to add bookmark to Supabase:', error)
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

                // Sync to Supabase
                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbUpdates = toSnakeCase({ ...updates, updatedAt: now })
                    const { error } = await supabase.from('bookmarks').update(dbUpdates).eq('id', id)
                    if (error) {
                        console.error('Failed to update bookmark in Supabase:', error)
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

                // Sync to Supabase
                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
                    if (error) {
                        console.error('Failed to delete bookmark from Supabase:', error)
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

                // Sync to Supabase
                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const ids = trashedBookmarks.map((b) => b.id)
                    const { error } = await supabase.from('bookmarks').delete().in('id', ids)
                    if (error) {
                        console.error('Failed to empty trash in Supabase:', error)
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

                // Sync to Supabase
                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbRecord = toSnakeCase({
                        ...newCollection,
                        userId: user.id,
                        isSystem: false,
                    })
                    const { error } = await supabase.from('collections').insert(dbRecord)
                    if (error) {
                        console.error('Failed to add collection to Supabase:', error)
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

                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbUpdates = toSnakeCase(updates)
                    const { error } = await supabase.from('collections').update(dbUpdates).eq('id', id)
                    if (error) {
                        console.error('Failed to update collection in Supabase:', error)
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

                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const { error } = await supabase.from('collections').delete().eq('id', id)
                    if (error) {
                        console.error('Failed to delete collection from Supabase:', error)
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

                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbRecord = toSnakeCase({
                        ...newTag,
                        userId: user.id,
                    })
                    const { error } = await supabase.from('tags').insert(dbRecord)
                    if (error) {
                        console.error('Failed to add tag to Supabase:', error)
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

                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const dbUpdates = toSnakeCase(updates)
                    const { error } = await supabase.from('tags').update(dbUpdates).eq('id', id)
                    if (error) {
                        console.error('Failed to update tag in Supabase:', error)
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

                const { user } = get()
                if (isSupabaseConfigured() && supabase && user) {
                    const { error } = await supabase.from('tags').delete().eq('id', id)
                    if (error) {
                        console.error('Failed to delete tag from Supabase:', error)
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

            // Incremental sync actions (update local state from realtime events without triggering Supabase sync)
            addBookmarkFromRemote: (bookmark) =>
                set((state) => {
                    // Avoid duplicates
                    if (state.bookmarks.some((b) => b.id === bookmark.id)) return state
                    return { bookmarks: [...state.bookmarks, bookmark] }
                }),

            updateBookmarkFromRemote: (id, bookmark) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) => (b.id === id ? bookmark : b)),
                })),

            deleteBookmarkFromRemote: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => b.id !== id),
                })),

            addCollectionFromRemote: (collection) =>
                set((state) => {
                    if (state.collections.some((c) => c.id === collection.id)) return state
                    return { collections: [...state.collections, collection] }
                }),

            updateCollectionFromRemote: (id, collection) =>
                set((state) => ({
                    collections: state.collections.map((c) => (c.id === id ? collection : c)),
                })),

            deleteCollectionFromRemote: (id) =>
                set((state) => ({
                    collections: state.collections.filter((c) => c.id !== id && !c.isSystem),
                    bookmarks: state.bookmarks.map((b) =>
                        b.collectionId === id ? { ...b, collectionId: 'unsorted' } : b
                    ),
                })),

            addTagFromRemote: (tag) =>
                set((state) => {
                    if (state.tags.some((t) => t.id === tag.id)) return state
                    return { tags: [...state.tags, tag] }
                }),

            updateTagFromRemote: (id, tag) =>
                set((state) => ({
                    tags: state.tags.map((t) => (t.id === id ? tag : t)),
                })),

            deleteTagFromRemote: (id) =>
                set((state) => ({
                    tags: state.tags.filter((t) => t.id !== id),
                    bookmarks: state.bookmarks.map((b) => ({
                        ...b,
                        tags: b.tags.filter((t) => t !== id),
                    })),
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
                    if (isDemoMode()) return // Don't delete form real storage in demo mode
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
                // Don't persist user, isSyncing, searchQuery, selectedTags
            }),
        }
    )
)

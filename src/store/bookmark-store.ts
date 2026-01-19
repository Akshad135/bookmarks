import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bookmark, Collection, Tag, ViewMode, SortOption, FilterSection } from '@/types'
import { generateId } from '@/lib/utils'

interface BookmarkState {
    bookmarks: Bookmark[]
    collections: Collection[]
    tags: Tag[]
    viewMode: ViewMode
    sortOption: SortOption
    activeSection: FilterSection
    searchQuery: string
    selectedTags: string[]

    // Bookmark actions
    addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isTrashed' | 'isArchived'>) => void
    updateBookmark: (id: string, updates: Partial<Bookmark>) => void
    deleteBookmark: (id: string) => void
    toggleFavorite: (id: string) => void
    toggleArchive: (id: string) => void
    moveToTrash: (id: string) => void
    restoreFromTrash: (id: string) => void
    permanentlyDelete: (id: string) => void
    emptyTrash: () => void

    // Collection actions
    addCollection: (name: string, icon?: string, color?: string) => void
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

const defaultTags: Tag[] = [
    { id: 'react', name: 'React', color: '#61dafb' },
    { id: 'typescript', name: 'TypeScript', color: '#3178c6' },
    { id: 'ui-ux', name: 'UI/UX', color: '#f97316' },
    { id: 'documentation', name: 'Documentation', color: '#22c55e' },
    { id: 'tutorial', name: 'Tutorial', color: '#a855f7' },
    { id: 'free', name: 'Free', color: '#eab308' },
]

const sampleBookmarks: Bookmark[] = [
    {
        id: '1',
        title: 'shadcn/ui',
        url: 'https://ui.shadcn.com',
        description: 'Beautifully designed components built with Radix UI and Tailwind CSS.',
        collectionId: 'unsorted',
        tags: ['react', 'ui-ux', 'typescript'],
        isFavorite: true,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '2',
        title: 'Vercel',
        url: 'https://vercel.com',
        description: 'Develop. Preview. Ship. The best frontend developer experience.',
        collectionId: 'unsorted',
        tags: ['react'],
        isFavorite: true,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '3',
        title: 'Tailwind CSS',
        url: 'https://tailwindcss.com',
        description: 'A utility-first CSS framework for rapid UI development.',
        collectionId: 'unsorted',
        tags: ['documentation', 'ui-ux'],
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '4',
        title: 'React Documentation',
        url: 'https://react.dev',
        description: 'The library for web and native user interfaces.',
        collectionId: 'unsorted',
        tags: ['react', 'documentation', 'tutorial'],
        isFavorite: true,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '5',
        title: 'TypeScript Handbook',
        url: 'https://www.typescriptlang.org/docs/handbook/',
        description: 'TypeScript is JavaScript with syntax for types.',
        collectionId: 'unsorted',
        tags: ['typescript', 'documentation'],
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '6',
        title: 'Figma',
        url: 'https://figma.com',
        description: 'The collaborative interface design tool.',
        collectionId: 'unsorted',
        tags: ['ui-ux', 'free'],
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '7',
        title: 'Next.js Documentation',
        url: 'https://nextjs.org/docs',
        description: 'The React Framework for the Web.',
        collectionId: 'unsorted',
        tags: ['react', 'documentation'],
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '8',
        title: 'Dribbble',
        url: 'https://dribbble.com',
        description: 'Discover the world\'s top designers & creatives.',
        collectionId: 'unsorted',
        tags: ['ui-ux'],
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

export const useBookmarkStore = create<BookmarkState>()(
    persist(
        (set) => ({
            bookmarks: sampleBookmarks,
            collections: defaultCollections,
            tags: defaultTags,
            viewMode: 'grid',
            sortOption: 'date-desc',
            activeSection: 'all',
            searchQuery: '',
            selectedTags: [],

            // Bookmark actions
            addBookmark: (bookmark) =>
                set((state) => ({
                    bookmarks: [
                        ...state.bookmarks,
                        {
                            ...bookmark,
                            id: generateId(),
                            isTrashed: false,
                            isArchived: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        },
                    ],
                })),

            updateBookmark: (id, updates) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) =>
                        b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
                    ),
                })),

            deleteBookmark: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => b.id !== id),
                })),

            toggleFavorite: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) =>
                        b.id === id ? { ...b, isFavorite: !b.isFavorite, updatedAt: new Date().toISOString() } : b
                    ),
                })),

            toggleArchive: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) =>
                        b.id === id ? { ...b, isArchived: !b.isArchived, updatedAt: new Date().toISOString() } : b
                    ),
                })),

            moveToTrash: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) =>
                        b.id === id ? { ...b, isTrashed: true, updatedAt: new Date().toISOString() } : b
                    ),
                })),

            restoreFromTrash: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) =>
                        b.id === id ? { ...b, isTrashed: false, updatedAt: new Date().toISOString() } : b
                    ),
                })),

            permanentlyDelete: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => b.id !== id),
                })),

            emptyTrash: () =>
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => !b.isTrashed),
                })),

            // Collection actions
            addCollection: (name, icon, color) =>
                set((state) => ({
                    collections: [
                        ...state.collections,
                        { id: generateId(), name, icon, color },
                    ],
                })),

            updateCollection: (id, updates) =>
                set((state) => ({
                    collections: state.collections.map((c) =>
                        c.id === id && !c.isSystem ? { ...c, ...updates } : c
                    ),
                })),

            deleteCollection: (id) =>
                set((state) => ({
                    collections: state.collections.filter((c) => c.id !== id && !c.isSystem),
                    bookmarks: state.bookmarks.map((b) =>
                        b.collectionId === id ? { ...b, collectionId: 'unsorted' } : b
                    ),
                })),

            // Tag actions
            addTag: (name, color) =>
                set((state) => ({
                    tags: [...state.tags, { id: generateId(), name, color }],
                })),

            updateTag: (id, updates) =>
                set((state) => ({
                    tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
                })),

            deleteTag: (id) =>
                set((state) => ({
                    tags: state.tags.filter((t) => t.id !== id),
                    bookmarks: state.bookmarks.map((b) => ({
                        ...b,
                        tags: b.tags.filter((t) => t !== id),
                    })),
                })),

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
        }
    )
)

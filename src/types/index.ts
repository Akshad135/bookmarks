export interface Bookmark {
    id: string
    title: string
    url: string
    description?: string
    favicon?: string
    thumbnail?: string
    collectionId: string
    tags: string[]
    isFavorite: boolean
    isArchived: boolean
    isTrashed: boolean
    createdAt: string
    updatedAt: string
}

export interface Collection {
    id: string
    name: string
    icon?: string
    color?: string
    isSystem?: boolean
}

export interface Tag {
    id: string
    name: string
    color: string
}

export type ViewMode = 'grid' | 'list'

export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

export type FilterSection = 'all' | 'favorites' | 'archive' | 'trash' | string

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function isDemoMode(): boolean {
    return import.meta.env.VITE_DM === 'true'
}

export function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback standard RFC4122 v4 UUID generator for insecure HTTP contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    });
}

export function getDomainFromUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        return urlObj.hostname
    } catch {
        return url
    }
}

export function getFaviconUrl(url: string): string {
    try {
        const domain = getDomainFromUrl(url)
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
        return ''
    }
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
}

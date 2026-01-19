import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function generateId(): string {
    return crypto.randomUUID()
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

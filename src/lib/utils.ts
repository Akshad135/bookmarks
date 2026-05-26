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

export function getDynamicGradientStyles(seedString: string) {
    let hash = 0
    for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash)
    }
    hash = Math.abs(hash)

    const palettes = [
        { via: 'rgba(249, 115, 22, 0.12)', accent: 'rgba(225, 29, 72, 0.08)' },    // Orange/Rose
        { via: 'rgba(139, 92, 246, 0.12)', accent: 'rgba(79, 70, 229, 0.08)' },   // Violet/Indigo
        { via: 'rgba(37, 99, 235, 0.12)', accent: 'rgba(8, 145, 178, 0.08)' },    // Blue/Cyan
        { via: 'rgba(5, 150, 105, 0.12)', accent: 'rgba(13, 148, 136, 0.08)' },   // Emerald/Teal
        { via: 'rgba(225, 29, 72, 0.12)', accent: 'rgba(219, 39, 119, 0.08)' },   // Rose/Pink
        { via: 'rgba(217, 119, 6, 0.12)', accent: 'rgba(249, 115, 22, 0.08)' },    // Amber/Orange
        { via: 'rgba(192, 38, 211, 0.12)', accent: 'rgba(147, 51, 234, 0.08)' },  // Fuchsia/Purple
        { via: 'rgba(3, 105, 161, 0.12)', accent: 'rgba(29, 78, 216, 0.08)' }     // Sky/Blue
    ]

    const selected = palettes[hash % palettes.length]
    
    return {
        style: {
            background: `radial-gradient(at 0% 0%, ${selected.via} 0px, transparent 55%),
                         radial-gradient(at 100% 100%, ${selected.accent} 0px, transparent 55%),
                         radial-gradient(at 50% 0%, rgba(255, 255, 255, 0.02) 0px, transparent 40%),
                         #171717`
        }
    }
}

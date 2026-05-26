// App configuration — loaded at runtime from /api/config
// Defaults are used until loadConfig() completes (called during auth init)

interface AppConfig {
    appName: string
    appSubtitle: string
    appIcon: string
    readonly maxImportLimit: number
}

export const config: AppConfig = {
    appName: 'Bookmarks',
    appSubtitle: '',
    appIcon: '',
    maxImportLimit: 2500,
}

export async function loadConfig(): Promise<void> {
    try {
        const res = await fetch('/api/config')
        if (res.ok) {
            const data = await res.json()
            config.appName = data.title || config.appName
            config.appSubtitle = data.subtitle ?? ''
            config.appIcon = data.icon ?? ''
        }
    } catch {
        // Use defaults if server is unreachable
    }
}

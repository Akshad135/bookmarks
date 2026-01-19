// App configuration from environment variables
export const config = {
    // App branding
    appName: import.meta.env.VITE_APP_NAME || 'Bookmarks',
    appSubtitle: import.meta.env.VITE_APP_SUBTITLE || '',
    appIcon: import.meta.env.VITE_APP_ICON || '',

    // Import settings
    maxImportLimit: 2500,
} as const

export type AppConfig = typeof config

import { useState, useEffect, useRef, useCallback } from 'react'
import { useBookmarkStore } from '@/store/bookmark-store'
import { api } from '@/lib/api'
import { loadConfig } from '@/lib/config'
import { isDemoMode } from '@/lib/utils'

export function useAuth() {
    const fetchFromServer = useBookmarkStore((s) => s.fetchFromServer)
    const setAuthenticated = useBookmarkStore((s) => s.setAuthenticated)
    const [isLoading, setIsLoading] = useState(true)
    const [authenticated, setAuth] = useState(false)
    const isInitializedRef = useRef(false)

    useEffect(() => {
        if (isInitializedRef.current) return
        isInitializedRef.current = true

        // Demo mode — skip auth entirely, run locally
        if (isDemoMode()) {
            setIsLoading(false)
            return
        }

        const initialize = async () => {
            // Wait a bit for Zustand to hydrate from IndexedDB
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Load config and check session in parallel
            const [sessionResult] = await Promise.all([
                api.getSession().catch(() => ({ authenticated: false })),
                loadConfig(),
            ])

            const isAuthed = sessionResult.authenticated
            setAuth(isAuthed)
            setAuthenticated(isAuthed)

            if (isAuthed) {
                const hasCachedData =
                    useBookmarkStore.getState().bookmarks.length > 0

                if (hasCachedData) {
                    // Show cached data immediately, sync in background
                    setIsLoading(false)
                    if (navigator.onLine) {
                        fetchFromServer().catch(console.error)
                    }
                } else {
                    // No cache — wait for server data (with timeout)
                    if (navigator.onLine) {
                        const timeoutPromise = new Promise<void>((resolve) =>
                            setTimeout(resolve, 15000)
                        )
                        await Promise.race([
                            fetchFromServer().catch(console.error),
                            timeoutPromise,
                        ])
                    }
                    setIsLoading(false)
                }
            } else {
                setIsLoading(false)
            }
        }

        initialize()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = useCallback(
        async (password: string): Promise<{ error: string | null }> => {
            try {
                await api.login(password)
                setAuth(true)
                setAuthenticated(true)
                setIsLoading(true)
                if (navigator.onLine) {
                    await fetchFromServer().catch(console.error)
                }
                setIsLoading(false)
                return { error: null }
            } catch (e) {
                return {
                    error: e instanceof Error ? e.message : 'Login failed',
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    return { authenticated, isLoading, login }
}

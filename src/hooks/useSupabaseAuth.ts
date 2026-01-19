import { useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useBookmarkStore } from '@/store/bookmark-store'

export function useSupabaseAuth() {
    const { fetchFromSupabase, setUser, user } = useBookmarkStore()
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

    const handleMagicUrlLogin = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) return false

        const hash = window.location.hash
        if (!hash.startsWith('#login=')) return false

        try {
            const base64 = hash.substring(7) // Remove '#login='
            const decoded = atob(base64)
            const [email, password] = decoded.split(':')

            if (!email || !password) {
                console.error('Invalid login hash format')
                return false
            }

            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                console.error('Login failed:', error.message)
                return false
            }

            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            return true
        } catch (e) {
            console.error('Failed to parse login hash:', e)
            return false
        }
    }, [])

    const setupRealtimeSubscription = useCallback(() => {
        if (!isSupabaseConfigured() || !supabase) return

        // Clean up existing subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe()
        }

        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookmarks' },
                () => {
                    // Refetch all data on any change from another device
                    fetchFromSupabase()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'collections' },
                () => {
                    fetchFromSupabase()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tags' },
                () => {
                    fetchFromSupabase()
                }
            )
            .subscribe()

        subscriptionRef.current = channel
    }, [fetchFromSupabase])

    const initializeAuth = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setUser(null)
            return
        }

        // Try magic URL login first
        await handleMagicUrlLogin()

        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
            setUser(session.user)
            await fetchFromSupabase()
            setupRealtimeSubscription()
        } else {
            setUser(null)
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    await fetchFromSupabase()
                    setupRealtimeSubscription()
                } else {
                    setUser(null)
                    if (subscriptionRef.current) {
                        subscriptionRef.current.unsubscribe()
                        subscriptionRef.current = null
                    }
                }
            }
        )

        return () => {
            subscription.unsubscribe()
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe()
            }
        }
    }, [handleMagicUrlLogin, setUser, fetchFromSupabase, setupRealtimeSubscription])

    useEffect(() => {
        const cleanup = initializeAuth()
        return () => {
            cleanup.then(fn => fn?.())
        }
    }, [initializeAuth])

    return { user, isConfigured: isSupabaseConfigured() }
}

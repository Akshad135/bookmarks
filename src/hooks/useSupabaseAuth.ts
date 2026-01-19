import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useBookmarkStore } from '@/store/bookmark-store'

export function useSupabaseAuth() {
    const { fetchFromSupabase, setUser, user } = useBookmarkStore()
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

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

    const login = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
        if (!isSupabaseConfigured() || !supabase) {
            return { error: 'Supabase is not configured' }
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                return { error: error.message }
            }
            return { error: null }
        } catch (e) {
            return { error: 'An unexpected error occurred' }
        }
    }, [])

    const initializeAuth = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setUser(null)
            setIsLoading(false)
            return
        }

        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
            setUser(session.user)
            await fetchFromSupabase()
            setupRealtimeSubscription()
        } else {
            setUser(null)
        }

        setIsLoading(false)

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
    }, [setUser, fetchFromSupabase, setupRealtimeSubscription])

    useEffect(() => {
        const cleanup = initializeAuth()
        return () => {
            cleanup.then(fn => fn?.())
        }
    }, [initializeAuth])

    return { user, isConfigured: isSupabaseConfigured(), isLoading, login }
}


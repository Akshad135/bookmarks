import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useBookmarkStore, toCamelCase } from '@/store/bookmark-store'
import type { Bookmark, Collection, Tag } from '@/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useSupabaseAuth() {
    const {
        fetchFromSupabase,
        setUser,
        user,
        addBookmarkFromRemote,
        updateBookmarkFromRemote,
        deleteBookmarkFromRemote,
        addCollectionFromRemote,
        updateCollectionFromRemote,
        deleteCollectionFromRemote,
        addTagFromRemote,
        updateTagFromRemote,
        deleteTagFromRemote,
    } = useBookmarkStore()
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Handle incremental bookmark changes from realtime events
    const handleBookmarkChange = useCallback(
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const { eventType } = payload

            switch (eventType) {
                case 'INSERT':
                    if (payload.new && typeof payload.new === 'object') {
                        const bookmark = toCamelCase<Bookmark>(payload.new as Record<string, unknown>)
                        addBookmarkFromRemote(bookmark)
                    }
                    break
                case 'UPDATE':
                    if (payload.new && typeof payload.new === 'object') {
                        const bookmark = toCamelCase<Bookmark>(payload.new as Record<string, unknown>)
                        updateBookmarkFromRemote(bookmark.id, bookmark)
                    }
                    break
                case 'DELETE':
                    if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                        deleteBookmarkFromRemote(payload.old.id as string)
                    }
                    break
            }
        },
        [addBookmarkFromRemote, updateBookmarkFromRemote, deleteBookmarkFromRemote]
    )

    // Handle incremental collection changes from realtime events
    const handleCollectionChange = useCallback(
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const { eventType } = payload

            switch (eventType) {
                case 'INSERT':
                    if (payload.new && typeof payload.new === 'object') {
                        const collection = toCamelCase<Collection>(payload.new as Record<string, unknown>)
                        addCollectionFromRemote(collection)
                    }
                    break
                case 'UPDATE':
                    if (payload.new && typeof payload.new === 'object') {
                        const collection = toCamelCase<Collection>(payload.new as Record<string, unknown>)
                        updateCollectionFromRemote(collection.id, collection)
                    }
                    break
                case 'DELETE':
                    if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                        deleteCollectionFromRemote(payload.old.id as string)
                    }
                    break
            }
        },
        [addCollectionFromRemote, updateCollectionFromRemote, deleteCollectionFromRemote]
    )

    // Handle incremental tag changes from realtime events
    const handleTagChange = useCallback(
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const { eventType } = payload

            switch (eventType) {
                case 'INSERT':
                    if (payload.new && typeof payload.new === 'object') {
                        const tag = toCamelCase<Tag>(payload.new as Record<string, unknown>)
                        addTagFromRemote(tag)
                    }
                    break
                case 'UPDATE':
                    if (payload.new && typeof payload.new === 'object') {
                        const tag = toCamelCase<Tag>(payload.new as Record<string, unknown>)
                        updateTagFromRemote(tag.id, tag)
                    }
                    break
                case 'DELETE':
                    if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                        deleteTagFromRemote(payload.old.id as string)
                    }
                    break
            }
        },
        [addTagFromRemote, updateTagFromRemote, deleteTagFromRemote]
    )

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
                handleBookmarkChange
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'collections' },
                handleCollectionChange
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tags' },
                handleTagChange
            )
            .subscribe()

        subscriptionRef.current = channel
    }, [handleBookmarkChange, handleCollectionChange, handleTagChange])

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

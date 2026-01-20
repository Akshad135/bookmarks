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
    const isInitializedRef = useRef(false)
    const hasAuthenticatedRef = useRef(false)

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

    // Run initialization exactly once on mount
    useEffect(() => {
        if (isInitializedRef.current) return
        isInitializedRef.current = true

        const initialize = async () => {
            if (!isSupabaseConfigured() || !supabase) {
                setUser(null)
                setIsLoading(false)
                return () => { }
            }

            // Wait a bit for Zustand to hydrate from IndexedDB
            // IndexedDB is async, so we need to give it time to load
            await new Promise(resolve => setTimeout(resolve, 100))

            // Check if we have cached data from IndexedDB
            const hasCachedData = useBookmarkStore.getState().bookmarks.length > 0

            // Helper to do the full auth + sync flow with timeout
            const authAndSync = async (): Promise<boolean> => {
                try {
                    // Create an AbortController for timeout
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 5000)

                    const { data: { session } } = await supabase!.auth.getSession()

                    if (session?.user) {
                        setUser(session.user)
                        hasAuthenticatedRef.current = true

                        // Only attempt sync if online
                        if (navigator.onLine) {
                            await fetchFromSupabase()
                        }
                        setupRealtimeSubscription()
                    } else {
                        setUser(null)
                    }

                    clearTimeout(timeoutId)
                    return true // Success
                } catch (error) {
                    // If aborted or any network error, return false
                    console.warn('Auth/sync failed or timed out:', error)
                    return false
                }
            }

            if (hasCachedData) {
                // If offline, skip sync attempt entirely and show cached data immediately
                if (!navigator.onLine) {
                    // Try to get session from cache (Supabase stores it in localStorage)
                    try {
                        const { data: { session } } = await supabase!.auth.getSession()
                        if (session?.user) {
                            setUser(session.user)
                            hasAuthenticatedRef.current = true
                        }
                    } catch {
                        // Ignore errors when offline
                    }
                    setIsLoading(false)
                } else {
                    // Online with cache: Race auth+sync vs 5s timeout
                    const timeoutPromise = new Promise<boolean>(resolve =>
                        setTimeout(() => resolve(false), 5000)
                    )

                    // Start both promises
                    const syncPromise = authAndSync()

                    // Wait for whichever finishes first
                    await Promise.race([syncPromise, timeoutPromise])

                    // Set loading false immediately after race completes
                    setIsLoading(false)
                }
            } else {
                // No cached data - must wait for auth+sync to complete (with reasonable timeout)
                // Give it 15 seconds max for first load
                const timeoutPromise = new Promise<boolean>(resolve =>
                    setTimeout(() => resolve(false), 15000)
                )
                await Promise.race([authAndSync(), timeoutPromise])
                setIsLoading(false)
            }

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (session?.user) {
                        // Only show loading on fresh sign-in (user wasn't already authenticated)
                        // This prevents loading screen when tab regains focus and Supabase fires SIGNED_IN
                        if (event === 'SIGNED_IN' && !hasAuthenticatedRef.current) {
                            setIsLoading(true)
                            setUser(session.user)
                            hasAuthenticatedRef.current = true
                            if (navigator.onLine) {
                                await fetchFromSupabase()
                            }
                            setupRealtimeSubscription()
                            setIsLoading(false)
                        } else {
                            // For all other events (TOKEN_REFRESHED, USER_UPDATED, tab focus, etc.), just update user silently
                            setUser(session.user)
                            hasAuthenticatedRef.current = true
                        }
                    } else {
                        setUser(null)
                        hasAuthenticatedRef.current = false
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
        }

        let cleanup: (() => void) | undefined
        initialize().then(fn => { cleanup = fn })

        return () => {
            cleanup?.()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Run only once on mount

    return { user, isConfigured: isSupabaseConfigured(), isLoading, login }
}


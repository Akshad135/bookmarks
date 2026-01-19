import { Card } from '@/components/ui/card'
import { useBookmarkStore } from '@/store/bookmark-store'
import { Bookmark, Heart, FolderOpen, Tag } from 'lucide-react'

export function StatsCards() {
    const { bookmarks, collections, tags } = useBookmarkStore()

    const stats = [
        {
            label: 'Total Bookmarks',
            value: bookmarks.filter((b) => !b.isTrashed).length,
            icon: Bookmark,
            color: 'bg-blue-500/10 text-blue-500',
        },
        {
            label: 'Favorites',
            value: bookmarks.filter((b) => b.isFavorite && !b.isTrashed).length,
            icon: Heart,
            color: 'bg-rose-500/10 text-rose-500',
        },
        {
            label: 'Collections',
            value: collections.filter((c) => !c.isSystem).length,
            icon: FolderOpen,
            color: 'bg-emerald-500/10 text-emerald-500',
        },
        {
            label: 'Tags',
            value: tags.length,
            icon: Tag,
            color: 'bg-violet-500/10 text-violet-500',
        },
    ]

    return (
        <div className="grid grid-cols-4 gap-3 px-6 py-4">
            {stats.map((stat) => (
                <Card
                    key={stat.label}
                    className="flex items-center gap-3 border-border bg-card/50 p-3 transition-colors hover:bg-card"
                >
                    <div className={`rounded-lg p-2.5 ${stat.color}`}>
                        <stat.icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xl font-bold leading-none">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                </Card>
            ))}
        </div>
    )
}

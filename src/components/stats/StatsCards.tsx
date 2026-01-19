import { Card } from '@/components/ui/card'
import { useBookmarkStore } from '@/store/bookmark-store'
import { Bookmark, Heart, FolderOpen, Tag } from 'lucide-react'

export function StatsCards() {
    const { bookmarks, collections, tags } = useBookmarkStore()

    const stats = [
        {
            label: 'Total Bookmarks',
            shortLabel: 'Bookmarks',
            value: bookmarks.filter((b) => !b.isTrashed).length,
            icon: Bookmark,
            color: 'bg-blue-500/10 text-blue-500',
        },
        {
            label: 'Favorites',
            shortLabel: 'Favorites',
            value: bookmarks.filter((b) => b.isFavorite && !b.isTrashed).length,
            icon: Heart,
            color: 'bg-rose-500/10 text-rose-500',
        },
        {
            label: 'Collections',
            shortLabel: 'Collections',
            value: collections.filter((c) => !c.isSystem).length,
            icon: FolderOpen,
            color: 'bg-emerald-500/10 text-emerald-500',
        },
        {
            label: 'Tags',
            shortLabel: 'Tags',
            value: tags.length,
            icon: Tag,
            color: 'bg-violet-500/10 text-violet-500',
        },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3">
            {stats.map((stat) => (
                <Card
                    key={stat.label}
                    className="flex items-center gap-2 md:gap-3 border-border bg-card/50 p-2 md:p-3 transition-colors hover:bg-card"
                >
                    <div className={`rounded-lg p-1.5 md:p-2 ${stat.color}`}>
                        <stat.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg md:text-xl font-bold">{stat.value}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                            <span className="md:hidden">{stat.shortLabel}</span>
                            <span className="hidden md:inline">{stat.label}</span>
                        </p>
                    </div>
                </Card>
            ))}
        </div>
    )
}

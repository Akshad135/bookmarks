import { Link } from 'lucide-react'

interface BookmarkSkeletonProps {
    viewMode: 'grid' | 'list'
    count?: number
}

export function BookmarkSkeleton({ viewMode, count = 8 }: BookmarkSkeletonProps) {
    const items = Array.from({ length: count }, (_, i) => i)

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 gap-3 md:gap-4 px-4 md:px-6 pt-2 md:pt-3 pb-6 md:pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-scale-in duration-200">
                {items.map((i) => (
                    <div
                        key={i}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm h-[280px]"
                    >
                        {/* Thumbnail Shimmer */}
                        <div className="relative flex h-32 items-center justify-center bg-secondary/50 shimmer">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-card/50">
                                <Link className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                        </div>

                        {/* Content Shimmer */}
                        <div className="flex flex-1 flex-col p-4">
                            {/* Title line */}
                            <div className="h-5 w-3/4 rounded bg-muted/40 shimmer mb-2.5" />
                            
                            {/* Description lines */}
                            <div className="space-y-2 mb-4">
                                <div className="h-3.5 w-full rounded bg-muted/20 shimmer" />
                                <div className="h-3.5 w-5/6 rounded bg-muted/20 shimmer" />
                            </div>

                            {/* Tags / Footer container */}
                            <div className="mt-auto">
                                {/* Simulated tags */}
                                <div className="flex gap-1.5 mb-3">
                                    <div className="h-5 w-12 rounded bg-muted/30 shimmer" />
                                    <div className="h-5 w-16 rounded bg-muted/30 shimmer" />
                                </div>

                                {/* Divider */}
                                <div className="h-[1px] bg-border/40 w-full pt-3" />
                                
                                {/* Date / Domain row */}
                                <div className="flex items-center justify-between pt-3">
                                    <div className="h-3 w-16 rounded bg-muted/20 shimmer" />
                                    <div className="h-3 w-12 rounded bg-muted/20 shimmer" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // List view skeleton
    return (
        <div className="flex flex-col gap-2 px-4 md:px-6 pt-2 md:pt-3 pb-6 md:pb-8 animate-scale-in duration-200">
            {items.map((i) => (
                <div
                    key={i}
                    className="group relative flex items-center gap-2 md:gap-4 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm p-2 md:p-3 h-[68px]"
                >
                    {/* Favicon Shimmer */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/50 shimmer">
                        <Link className="h-5 w-5 text-muted-foreground/30" />
                    </div>

                    {/* Content Shimmer */}
                    <div className="flex-1 min-w-0 pr-16 md:pr-0 flex flex-col gap-2">
                        {/* Title line */}
                        <div className="h-4 w-1/3 rounded bg-muted/40 shimmer" />
                        {/* Domain line */}
                        <div className="h-3 w-1/5 rounded bg-muted/20 shimmer" />
                    </div>

                    {/* Right side mock buttons */}
                    <div className="absolute right-2 top-2 flex md:static items-center shrink-0 gap-2">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded bg-muted/20 shimmer hidden md:block" />
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded bg-muted/20 shimmer" />
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded bg-muted/20 shimmer" />
                    </div>
                </div>
            ))}
        </div>
    )
}

import { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useBookmarkStore } from '@/store/bookmark-store'
import { parseBookmarkHtml, normalizeUrl, type ParsedBookmark } from '@/lib/bookmark-parser'
import { config } from '@/lib/config'
import { getFaviconUrl } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Upload,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    FolderOpen,
} from 'lucide-react'


interface ImportBookmarksDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type ImportStep = 'select' | 'preview' | 'importing' | 'complete'

interface ImportStats {
    total: number
    imported: number
    skipped: number
    errors: number
}

export function ImportBookmarksDialog({ open, onOpenChange }: ImportBookmarksDialogProps) {
    const { bookmarks, addBookmark, collections, addCollection } = useBookmarkStore()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState<ImportStep>('select')
    const [parsedBookmarks, setParsedBookmarks] = useState<ParsedBookmark[]>([])
    const [folders, setFolders] = useState<string[]>([])
    const [parseErrors, setParseErrors] = useState<string[]>([])
    const [skipDuplicates, setSkipDuplicates] = useState(true)
    const [importProgress, setImportProgress] = useState(0)
    const [stats, setStats] = useState<ImportStats>({ total: 0, imported: 0, skipped: 0, errors: 0 })
    const [fileName, setFileName] = useState('')

    const existingUrls = new Set(bookmarks.map(b => normalizeUrl(b.url)))

    const duplicateCount = parsedBookmarks.filter(
        b => existingUrls.has(normalizeUrl(b.url))
    ).length

    const resetState = () => {
        setStep('select')
        setParsedBookmarks([])
        setFolders([])
        setParseErrors([])
        setSkipDuplicates(true)
        setImportProgress(0)
        setStats({ total: 0, imported: 0, skipped: 0, errors: 0 })
        setFileName('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setFileName(file.name)

        try {
            const content = await file.text()
            const result = parseBookmarkHtml(content, config.maxImportLimit)

            setParsedBookmarks(result.bookmarks)
            setFolders(result.folders)
            setParseErrors(result.errors)
            setStep('preview')
        } catch (error) {
            toast.error('Failed to read file')
            console.error('File read error:', error)
        }
    }

    const handleImport = async () => {
        setStep('importing')
        const toImport = skipDuplicates
            ? parsedBookmarks.filter(b => !existingUrls.has(normalizeUrl(b.url)))
            : parsedBookmarks

        const total = toImport.length
        let imported = 0
        let errors = 0

        // Import in batches to avoid UI blocking
        const batchSize = 10

        // Create folder map ONCE before the loop, populated with existing collections (case-insensitive)
        const folderMap = new Map<string, string>()
        collections.forEach(c => folderMap.set(c.name.toLowerCase(), c.id))

        for (let i = 0; i < toImport.length; i += batchSize) {
            const batch = toImport.slice(i, i + batchSize)

            // Process collections for the batch - check against our persistent folderMap
            for (const bookmark of batch) {
                if (bookmark.folder) {
                    const folderName = bookmark.folder.split('/').pop() || ''
                    if (folderName && !folderMap.has(folderName.toLowerCase())) {
                        // Create collection if it doesn't exist
                        try {
                            const newId = await addCollection(folderName, 'folder')
                            // Add to our persistent map so future batches see it
                            folderMap.set(folderName.toLowerCase(), newId)
                        } catch (e) {
                            console.error('Failed to create collection for folder:', folderName, e)
                        }
                    }
                }
            }

            // Import bookmarks in the batch (no metadata fetching to avoid rate limits)
            for (const parsed of batch) {
                try {
                    const folderName = parsed.folder?.split('/').pop()?.toLowerCase() || ''
                    const collectionId = folderName ? (folderMap.get(folderName) || 'unsorted') : 'unsorted'

                    await addBookmark({
                        url: parsed.url,
                        title: parsed.title,
                        description: undefined, // Skip metadata fetching for now
                        thumbnail: undefined,
                        collectionId,
                        tags: [],
                        isFavorite: false,
                        favicon: getFaviconUrl(parsed.url),
                    })
                    imported++
                } catch (error) {
                    console.error('Failed to import bookmark:', parsed.url, error)
                    errors++
                }
            }

            setImportProgress(Math.round(((i + batch.length) / total) * 100))

            // Small delay between batches to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        setStats({
            total: parsedBookmarks.length,
            imported,
            skipped: duplicateCount,
            errors,
        })
        setStep('complete')
    }

    const handleClose = () => {
        onOpenChange(false)
        // Reset state after dialog closes
        setTimeout(resetState, 300)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-1rem)] w-full max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-4 md:p-5 border-b border-border bg-background/95 backdrop-blur z-10 shrink-0 text-left">
                    <DialogTitle className="text-lg md:text-xl pr-8">
                        Import Bookmarks
                    </DialogTitle>
                    <DialogDescription>
                        Import bookmarks from a browser export file (HTML format).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-5">
                    {step === 'select' && (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                                <Upload className="h-10 w-10 text-primary" />
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Export bookmarks from your browser (Chrome, Firefox, Edge, etc.)
                                    and upload the HTML file here.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Maximum {config.maxImportLimit.toLocaleString()} bookmarks per import
                                </p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".html,.htm"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                Select Bookmark File
                            </Button>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {parsedBookmarks.length.toLocaleString()} bookmarks found
                                    </p>
                                </div>
                            </div>

                            {parseErrors.length > 0 && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                        {parseErrors.map((error, i) => (
                                            <p key={i}>{error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {folders.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Folders Found
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {folders.slice(0, 8).map((folder) => (
                                            <Badge
                                                key={folder}
                                                variant="secondary"
                                                className="text-xs font-normal"
                                            >
                                                <FolderOpen className="h-3 w-3 mr-1" />
                                                {folder.split('/').pop()}
                                            </Badge>
                                        ))}
                                        {folders.length > 8 && (
                                            <Badge variant="outline" className="text-xs font-normal">
                                                +{folders.length - 8} more
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Note: Folders will not be imported as collections. All bookmarks will be added to "Unsorted".
                                    </p>
                                </div>
                            )}

                            {duplicateCount > 0 && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                    <Checkbox
                                        id="skip-duplicates"
                                        checked={skipDuplicates}
                                        onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                                    />
                                    <Label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                                        Skip {duplicateCount.toLocaleString()} duplicate{duplicateCount !== 1 ? 's' : ''} (already in library)
                                    </Label>
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                                <Button variant="ghost" onClick={resetState} className="w-full sm:w-auto">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={parsedBookmarks.length === 0}
                                    className="w-full sm:flex-1 gap-2"
                                >
                                    Import {(skipDuplicates ? parsedBookmarks.length - duplicateCount : parsedBookmarks.length).toLocaleString()} Bookmarks
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />

                            <div className="w-full space-y-2">
                                <Progress value={importProgress} className="h-2" />
                                <p className="text-center text-sm text-muted-foreground">
                                    Importing... {importProgress}%
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>

                            <div className="text-center space-y-1">
                                <p className="text-lg font-semibold">Import Complete!</p>
                                <p className="text-sm text-muted-foreground">
                                    Successfully imported {stats.imported.toLocaleString()} bookmarks
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {stats.imported} imported
                                </Badge>
                                {stats.skipped > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        {stats.skipped} skipped
                                    </Badge>
                                )}
                                {stats.errors > 0 && (
                                    <Badge variant="destructive" className="gap-1">
                                        {stats.errors} errors
                                    </Badge>
                                )}
                            </div>

                            <Button onClick={handleClose} className="w-full sm:w-auto">
                                Done
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

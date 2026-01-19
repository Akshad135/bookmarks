/**
 * Parser for browser-exported HTML bookmark files (Netscape Bookmark File Format)
 * 
 * Browsers export bookmarks in a standardized HTML format using:
 * - <DL> for lists (folders)
 * - <DT> for items (bookmarks or folder headers)
 * - <A HREF="..." ADD_DATE="..."> for bookmark links
 * - <H3> for folder names
 */

export interface ParsedBookmark {
    url: string
    title: string
    addDate?: Date
    folder?: string
}

export interface ParseResult {
    bookmarks: ParsedBookmark[]
    folders: string[]
    errors: string[]
}

/**
 * Parse a browser-exported HTML bookmark file
 * @param htmlContent The HTML content of the bookmark file
 * @param limit Maximum number of bookmarks to parse (default: 2500)
 */
export function parseBookmarkHtml(htmlContent: string, limit: number = 2500): ParseResult {
    const bookmarks: ParsedBookmark[] = []
    const folders = new Set<string>()
    const errors: string[] = []

    try {
        // Create a DOM parser
        const parser = new DOMParser()
        const doc = parser.parseFromString(htmlContent, 'text/html')

        // Track current folder path
        const folderStack: string[] = []

        // Recursive function to traverse the bookmark structure
        function traverseDL(dl: Element) {
            const children = Array.from(dl.children)

            for (const child of children) {
                if (bookmarks.length >= limit) {
                    break
                }

                if (child.tagName === 'DT') {
                    // Check if it's a folder (has H3) or a bookmark (has A)
                    const h3 = child.querySelector(':scope > H3')
                    const anchor = child.querySelector(':scope > A')

                    if (h3) {
                        // It's a folder
                        const folderName = h3.textContent?.trim() || 'Unnamed Folder'
                        folderStack.push(folderName)
                        folders.add(folderStack.join('/'))

                        // Look for nested DL
                        const nestedDL = child.querySelector(':scope > DL')
                        if (nestedDL) {
                            traverseDL(nestedDL)
                        }

                        folderStack.pop()
                    } else if (anchor) {
                        // It's a bookmark
                        const url = anchor.getAttribute('href')
                        const title = anchor.textContent?.trim() || url || 'Untitled'
                        const addDateAttr = anchor.getAttribute('ADD_DATE')

                        if (url && isValidUrl(url)) {
                            const bookmark: ParsedBookmark = {
                                url,
                                title,
                                folder: folderStack.length > 0 ? folderStack.join('/') : undefined,
                            }

                            // Parse ADD_DATE (Unix timestamp in seconds)
                            if (addDateAttr) {
                                const timestamp = parseInt(addDateAttr, 10)
                                if (!isNaN(timestamp)) {
                                    bookmark.addDate = new Date(timestamp * 1000)
                                }
                            }

                            bookmarks.push(bookmark)
                        }
                    }
                } else if (child.tagName === 'DL') {
                    // Sometimes DL is not wrapped in DT
                    traverseDL(child)
                }
            }
        }

        // Find the root DL element
        const rootDL = doc.querySelector('DL')
        if (rootDL) {
            traverseDL(rootDL)
        } else {
            errors.push('No bookmark structure found in the file')
        }

        if (bookmarks.length === limit) {
            errors.push(`Import limit of ${limit} bookmarks reached. Some bookmarks may have been skipped.`)
        }

    } catch (error) {
        errors.push(`Failed to parse bookmark file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
        bookmarks,
        folders: Array.from(folders),
        errors,
    }
}

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(string: string): boolean {
    try {
        const url = new URL(string)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * Extract unique URLs from parsed bookmarks for duplicate detection
 */
export function getBookmarkUrls(bookmarks: ParsedBookmark[]): Set<string> {
    return new Set(bookmarks.map(b => normalizeUrl(b.url)))
}

/**
 * Normalize URL for comparison (remove trailing slash, lowercase hostname)
 */
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url)
        // Lowercase hostname and remove trailing slash from pathname
        let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}`
        normalized += parsed.pathname.replace(/\/$/, '') || '/'
        normalized += parsed.search
        return normalized
    } catch {
        return url.toLowerCase()
    }
}

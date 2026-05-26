import type { Bookmark } from '@/types'

/**
 * Exports an array of Bookmark items into the standard Netscape HTML Bookmark File Format.
 * This format is universally supported for import by Chrome, Firefox, Safari, Edge, etc.
 */
export function exportBookmarksToHtml(bookmarks: Bookmark[]) {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and written by auto-generated code.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`

    bookmarks.forEach((b) => {
        // Netscape format uses ADD_DATE in Unix timestamp (seconds)
        const date = b.createdAt ? Math.floor(new Date(b.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
        
        html += `    <DT><A HREF="${b.url}" ADD_DATE="${date}"`;
        if (b.isFavorite) {
            html += ` PRIVATE="1"`;
        }
        html += `>${b.title}</A>\n`;
        
        if (b.description) {
            html += `    <DD>${b.description}\n`;
        }
    })

    html += `</DL><p>\n`

    // Create a Blob and trigger browser download
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookmarks_export_${new Date().toISOString().split('T')[0]}.html`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up memory
    URL.revokeObjectURL(url)
}

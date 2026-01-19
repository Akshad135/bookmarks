export interface UrlMetadata {
    title: string
    description: string
    image: string
}

export async function fetchMetadata(targetUrl: string): Promise<UrlMetadata | null> {
    try {
        // Use microlink.io free API
        const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`
        const response = await fetch(apiUrl)
        if (!response.ok) return null
        const data = await response.json()

        if (data.status === 'success') {
            return {
                title: data.data.title || '',
                description: data.data.description || '',
                image: data.data.image?.url || data.data.logo?.url || '',
            }
        }
        return null
    } catch {
        return null
    }
}

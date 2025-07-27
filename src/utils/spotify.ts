export interface SpotifyTokenData {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
}

const TOKEN_DATA_KEY = 'spotify_token_data'

export class SpotifyAPI {
  private static getTokenData(): SpotifyTokenData | null {
    const tokenData = localStorage.getItem(TOKEN_DATA_KEY)
    if (!tokenData) return null
    
    try {
      const parsed = JSON.parse(tokenData) as SpotifyTokenData
      
      // Check if token is expired
      if (Date.now() > parsed.expires_at) {
        localStorage.removeItem(TOKEN_DATA_KEY)
        return null
      }
      
      return parsed
    } catch (err) {
      console.error('Error parsing token data:', err)
      localStorage.removeItem(TOKEN_DATA_KEY)
      return null
    }
  }

  static getAccessToken(): string | null {
    const tokenData = this.getTokenData()
    return tokenData?.access_token || null
  }

  static setTokenData(tokenData: SpotifyTokenData): void {
    localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData))
  }

  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null
  }

  static logout(): void {
    localStorage.removeItem(TOKEN_DATA_KEY)
  }

  static async makeRequest<T>(endpoint: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('No access token available. Please authenticate with Spotify first.')
    }

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        this.logout()
        throw new Error('Authentication expired. Please log in again.')
      }
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // User profile methods
  static async getCurrentUser(signal?: AbortSignal) {
    return this.makeRequest('/me', {}, signal)
  }

  // Playlist methods
  static async getUserPlaylists(limit = 50, offset = 0, signal?: AbortSignal) {
    return this.makeRequest(`/me/playlists?limit=${limit}&offset=${offset}`, {}, signal)
  }

  static async getPlaylist(playlistId: string, signal?: AbortSignal) {
    return this.makeRequest(`/playlists/${playlistId}`, {}, signal)
  }

  static async getPlaylistTracks(playlistId: string, limit = 100, offset = 0, signal?: AbortSignal) {
    return this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, {}, signal)
  }

  // Track methods
  static async getTrack(trackId: string, signal?: AbortSignal) {
    return this.makeRequest(`/tracks/${trackId}`, {}, signal)
  }

  static async getTracks(trackIds: string[], signal?: AbortSignal) {
    const ids = trackIds.join(',')
    return this.makeRequest(`/tracks?ids=${ids}`, {}, signal)
  }

  // Audio features methods (for BPM data)
  static async getTrackAudioFeatures(trackId: string, signal?: AbortSignal) {
    return this.makeRequest(`/audio-features/${trackId}`, {}, signal)
  }

  static async getTracksAudioFeatures(trackIds: string[], signal?: AbortSignal) {
    const ids = trackIds.join(',')
    return this.makeRequest(`/audio-features?ids=${ids}`, {}, signal)
  }

  // Search methods
  static async searchTracks(query: string, limit = 20, offset = 0, signal?: AbortSignal) {
    const encodedQuery = encodeURIComponent(query)
    return this.makeRequest(`/search?q=${encodedQuery}&type=track&limit=${limit}&offset=${offset}`, {}, signal)
  }
}

// Helper function to get all tracks from a playlist (handles pagination)
export async function getAllPlaylistTracks(playlistId: string, signal?: AbortSignal): Promise<any[]> {
  const allTracks: any[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await SpotifyAPI.getPlaylistTracks(playlistId, limit, offset, signal) as any
    const tracks = response.items.map((item: any) => item.track).filter((track: any) => track !== null)
    
    allTracks.push(...tracks)
    
    if (tracks.length < limit) {
      break
    }
    
    offset += limit
  }

  return allTracks
}

// Helper function to get audio features for all tracks in a playlist
export async function getPlaylistTracksWithBPM(playlistId: string, signal?: AbortSignal): Promise<any[]> {
  const tracks = await getAllPlaylistTracks(playlistId, signal)
  
  // Get audio features for all tracks
  const trackIds = tracks.map(track => track.id)
  const audioFeatures = await SpotifyAPI.getTracksAudioFeatures(trackIds, signal) as any
  
  // Combine track data with audio features
  return tracks.map(track => {
    const features = audioFeatures.audio_features.find((f: any) => f && f.id === track.id)
    return {
      ...track,
      audio_features: features
    }
  })
} 
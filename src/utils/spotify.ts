export interface SpotifyTokenData {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
}

// Event system for authentication state changes
type AuthStateListener = () => void

class AuthEventManager {
  private static listeners: AuthStateListener[] = []

  static addListener(listener: AuthStateListener) {
    this.listeners.push(listener)
  }

  static removeListener(listener: AuthStateListener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  static notifyAuthFailure() {
    this.listeners.forEach(listener => listener())
  }
}

export { AuthEventManager }

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
        AuthEventManager.notifyAuthFailure()
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

  static async getPlaylistTracks(playlistId: string, limit = 100, offset = 0, signal?: AbortSignal) {
    return this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, {}, signal)
  }

  // Audio features methods (for BPM data)
  static async getTracksAudioFeatures(trackIds: string[], signal?: AbortSignal) {
    const ids = trackIds.join(',')
    return this.makeRequest(`/audio-features?ids=${ids}`, {}, signal)
  }
}

 
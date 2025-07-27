import { useState, useEffect, useMemo } from 'react'
import { SpotifyAPI } from '../utils/spotify'
import { useUser } from '../contexts/UserContext'
import sanitizeHtml from 'sanitize-html'
import './PlaylistSelection.css'

interface Playlist {
  id: string
  name: string
  description: string | null
  images: Array<{ url: string; width: number; height: number }>
  tracks: { total: number }
  owner: { display_name: string, id: string }
  public: boolean
}

interface PlaylistSelectionProps {
  onPlaylistSelect?: (playlistId: string, playlistName: string) => void
  onLogout?: () => void
}

// Cache interface for storing playlists data
interface PlaylistCache {
  playlists: Playlist[]
  timestamp: number
  expiresAt: number
}

export function PlaylistSelection({ onPlaylistSelect, onLogout }: PlaylistSelectionProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useUser()

  const sortedPlaylists = useMemo(() => {
    // First filter by search query
    const filteredPlaylists = searchQuery.trim() === '' 
      ? playlists 
      : playlists.filter(playlist => 
          playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
        )

    // Then sort by owner and name
    return filteredPlaylists.sort((a, b) => {
      // First sort by owner
      const aIsCurrentUser = a.owner.id === user?.id
      const bIsCurrentUser = b.owner.id === user?.id
      if (aIsCurrentUser && !bIsCurrentUser) return -1
      if (!aIsCurrentUser && bIsCurrentUser) return 1

      // Then sort by name
      return a.name.localeCompare(b.name)
    })
  }, [playlists, user, searchQuery])

  // Cache duration in milliseconds
  const CACHE_DURATION = 60 * 60 * 1000

  // Cache utility functions
  const getCachedData = (): PlaylistCache | null => {
    try {
      const cached = localStorage.getItem('spotify_playlists_cache')
      if (!cached) return null
      
      const cache: PlaylistCache = JSON.parse(cached)
      
      // Check if cache is still valid
      if (Date.now() > cache.expiresAt) {
        localStorage.removeItem('spotify_playlists_cache')
        return null
      }
      
      return cache
    } catch (error) {
      console.error('Error loading cached data', error)
      localStorage.removeItem('spotify_playlists_cache')
      return null
    }
  }

  const setCachedData = (playlists: Playlist[]) => {
    try {
      const cache: PlaylistCache = {
        playlists,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      }
      localStorage.setItem('spotify_playlists_cache', JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache playlists:', error)
    }
  }

  const clearCache = () => {
    localStorage.removeItem('spotify_playlists_cache')
  }

  useEffect(() => {
    // Check cache immediately and set state if available
    const abortController = new AbortController()
    const cachedData = getCachedData()
    if (cachedData) {
      console.log('Loading playlists from cache')
      setPlaylists(cachedData.playlists)
      setIsLoading(false)
    } else {
        loadAllPlaylists(abortController.signal)
    }

    return () => {
        abortController.abort()
    }
  }, [])

  const loadAllPlaylists = async (signal?: AbortSignal) => {
    console.log('Loading playlists')
    setIsLoading(true)
    setError(null)
    
    const limit = 50
    let allPlaylists: Playlist[] = []
    let currentOffset = 0
    let hasMore = true

    try {
      while (hasMore) {
        const playlistsResponse = await SpotifyAPI.getUserPlaylists(limit, currentOffset, signal) as any
        
        allPlaylists = [...allPlaylists, ...playlistsResponse.items]
        setPlaylists(allPlaylists)

        // Check if we've loaded all playlists
        hasMore = allPlaylists.length < playlistsResponse.total
        currentOffset += limit
      }

      // Cache the loaded data
      if (allPlaylists.length > 0) {
        setCachedData(allPlaylists)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Playlists loading aborted')
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists'
      setError(errorMessage)
      console.error('Error loading playlists:', err)
    } finally {
      console.log('Playlists loading finished')
      setIsLoading(false)
    }
  }

  const handlePlaylistSelect = (playlist: Playlist) => {
    onPlaylistSelect?.(playlist.id, playlist.name)
  }

  const handleLogout = () => {
    clearCache()
    onLogout?.()
  }

  const handleRefresh = () => {
    clearCache()
    loadAllPlaylists()
  }

  const getPlaylistImage = (playlist: Playlist) => {
    if (playlist.images && playlist.images.length > 0) {
      return playlist.images[0].url
    }
    return '/default-playlist.png' // You can add a default image
  }

  const decodeHtmlEntities = (text: string): string => {
    // Use sanitize-html to safely decode HTML entities while preventing XSS
    return sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
      disallowedTagsMode: 'recursiveEscape' // Escape any HTML tags
    })
  }

  if (isLoading) {
    return (
      <div className="playlist-selection">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your playlists...</p>
          {playlists.length > 0 && (
            <p className="loading-progress">
              Loaded {playlists.length} playlists so far...
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="playlist-selection">
        <div className="error-container">
          <h2>Error Loading Data from Spotify</h2>
          <p>{error}</p>
          <button onClick={() => loadAllPlaylists(new AbortController().signal)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="playlist-selection">
      <div className="header">
        <div className="user-info">
          {user && (
            <>
              <img 
                src={user.images?.[0]?.url || '/default-avatar.png'} 
                alt={user.display_name}
                className="user-avatar"
              />
              <div className="user-details">
                <h1>Welcome, {decodeHtmlEntities(user.display_name)}!</h1>
                <p>Select a playlist to export BPM data</p>
              </div>
            </>
          )}
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-button">
            Refresh
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search playlist name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search-button"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="playlists-container">
        <div className="playlists-header">
          <h2>Your Playlists</h2>
        </div>
        
        {playlists.length === 0 ? (
          <div className="no-playlists">
            <p>No playlists found. Create a playlist in Spotify first!</p>
          </div>
        ) : (
          <>
            <div className="playlists-grid">
              {sortedPlaylists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  className="playlist-card"
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <div className="playlist-image">
                    <img src={getPlaylistImage(playlist)} alt={playlist.name} />
                    <div className="playlist-overlay">
                      <span>Select</span>
                    </div>
                  </div>
                  <div className="playlist-info">
                    <h3>{decodeHtmlEntities(playlist.name)}</h3>
                    <p className="playlist-owner">
                      by {decodeHtmlEntities(playlist.owner.display_name)}
                    </p>
                    <p className="playlist-tracks">
                      {playlist.tracks.total} tracks
                    </p>
                    {playlist.description && (
                      <p className="playlist-description">
                        {decodeHtmlEntities(playlist.description)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 
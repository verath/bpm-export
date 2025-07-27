import { useState, useEffect, useRef } from 'react'
import './SpotifyLogin.css'
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce'

interface SpotifyLoginProps {
  onLoginSuccess?: (accessToken: string) => void
  onLoginError?: (error: string) => void
}

export function SpotifyLogin({ onLoginSuccess, onLoginError }: SpotifyLoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasProcessedCallback = useRef(false)

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Spotify OAuth configuration
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
      const redirectUri = window.location.origin
      const scope = 'playlist-read-private playlist-read-collaborative user-read-private'

      if (!clientId) {
        throw new Error('Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in your environment variables.')
      }

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      
      // Generate random state for security
      const state = Math.random().toString(36).substring(7)
      
      // Store PKCE and state in localStorage for verification
      localStorage.setItem('spotify_code_verifier', codeVerifier)
      localStorage.setItem('spotify_auth_state', state)

      // Construct Spotify authorization URL with PKCE flow
      const authUrl = new URL('https://accounts.spotify.com/authorize')
      authUrl.searchParams.append('client_id', clientId)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('redirect_uri', redirectUri)
      authUrl.searchParams.append('state', state)
      authUrl.searchParams.append('scope', scope)
      authUrl.searchParams.append('code_challenge_method', 'S256')
      authUrl.searchParams.append('code_challenge', codeChallenge)

      // Redirect to Spotify authorization
      window.location.href = authUrl.toString()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Spotify login'
      setError(errorMessage)
      onLoginError?.(errorMessage)
      setIsLoading(false)
    }
  }

  const handleAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')

    if (error) {
      const errorMessage = `Spotify authorization failed: ${error}`
      setError(errorMessage)
      onLoginError?.(errorMessage)
      return
    }

    if (code && state) {
      const storedState = localStorage.getItem('spotify_auth_state')
      const codeVerifier = localStorage.getItem('spotify_code_verifier')
      
      if (state !== storedState) {
        const errorMessage = 'State mismatch - possible CSRF attack'
        setError(errorMessage)
        onLoginError?.(errorMessage)
        return
      }

      if (!codeVerifier) {
        const errorMessage = 'Code verifier not found'
        setError(errorMessage)
        onLoginError?.(errorMessage)
        return
      }

      setIsLoading(true)
      
      try {
        // Exchange code for access token using PKCE
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: window.location.origin,
            client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
            code_verifier: codeVerifier,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}))
          throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`)
        }

        const tokenData = await tokenResponse.json()
        
        // Store token and metadata securely
        const tokenInfo = {
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || 'Bearer',
          expires_in: tokenData.expires_in || 3600,
          expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
          refresh_token: tokenData.refresh_token
        }
        
        localStorage.setItem('spotify_token_data', JSON.stringify(tokenInfo))
        localStorage.removeItem('spotify_auth_state')
        localStorage.removeItem('spotify_code_verifier')
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        
        onLoginSuccess?.(tokenData.access_token)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete authentication'
        setError(errorMessage)
        onLoginError?.(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Check for auth callback on component mount
  useEffect(() => {
    if (window.location.search.includes('code=') && !hasProcessedCallback.current) {
      hasProcessedCallback.current = true
      handleAuthCallback()
    }
  }, []) // Empty dependency array - only run once on mount

  return (
    <div className="spotify-login">
      <div className="login-container">
        <div className="login-header">
          <div className="spotify-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <h1>Welcome to BPM Export</h1>
          <p>Connect your Spotify account to export BPM information from your playlists</p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <button
          className={`login-button ${isLoading ? 'loading' : ''}`}
          onClick={handleSpotifyLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="spotify-icon">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect with Spotify
            </>
          )}
        </button>

        <div className="login-footer">
          <p>By connecting, you agree to share your playlist data for BPM analysis</p>
        </div>
      </div>
    </div>
  )
} 
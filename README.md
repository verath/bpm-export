# BPM Export

Exports BPM information from Spotify playlists.

A client-side only React app developed using Cursor, to try some AI programming. Very amazing.

**Note**: The export features doesn't actually work, since Spotify has deprecated its audio-features API... :upside_down_face:

## Setup

### Spotify API Configuration

To use this application, you need to configure Spotify API credentials:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add your redirect URI (e.g., `http://localhost:5173` for development)
4. Copy your Client ID

Create a `.env` file in the root directory with:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to Firebase

```bash
npm run build
firebase deploy
```

import './ExportView.css'

interface ExportViewProps {
  selectedPlaylist: { id: string; name: string }
  onBack: () => void
}

export function ExportView({ selectedPlaylist, onBack }: ExportViewProps) {
  return (
    <div className="export-view">
      <div className="export-container">
        <h1>Export BPM Data</h1>
        <div className="playlist-info">
          <p className="playlist-name">Selected playlist: {selectedPlaylist.name}</p>
          <p className="playlist-id">Playlist ID: {selectedPlaylist.id}</p>
        </div>
        
        <div className="export-options">
          <h2>Export Options</h2>
          <p>Choose how you'd like to export your BPM data:</p>
          
          <div className="export-buttons">
            <button className="export-button csv">
              <span className="icon">📊</span>
              <span className="text">Export as CSV</span>
            </button>
            
            <button className="export-button json">
              <span className="icon">📄</span>
              <span className="text">Export as JSON</span>
            </button>
            
            <button className="export-button excel">
              <span className="icon">📈</span>
              <span className="text">Export as Excel</span>
            </button>
          </div>
        </div>
        
        <button onClick={onBack} className="back-button">
          ← Back to Playlists
        </button>
      </div>
    </div>
  )
} 
import React, { useEffect, useState } from 'react'

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState(null)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [version, setVersion] = useState(null)

  useEffect(() => {
    // Listen for update status events from main process
    const cleanup = window.cs2.onUpdateStatus((data) => {
      console.log('Update status:', data)

      switch (data.type) {
        case 'checking':
          setUpdateState('checking')
          break

        case 'available':
          setUpdateState('available')
          setVersion(data.version)
          break

        case 'not-available':
          // Don't show notification if no update is available
          setUpdateState(null)
          break

        case 'downloading':
          setUpdateState('downloading')
          setDownloadPercent(data.percent || 0)
          break

        case 'downloaded':
          setUpdateState('ready')
          setVersion(data.version)
          break

        case 'error':
          setUpdateState('error')
          console.error('Update error:', data.message)
          break

        default:
          break
      }
    })

    // Cleanup listener on unmount
    return cleanup
  }, [])

  const handleDownload = async () => {
    setUpdateState('downloading')
    setDownloadPercent(0)
    const result = await window.cs2.updaterDownload()
    if (!result.success) {
      setUpdateState('error')
      console.error('Failed to download update:', result.error)
    }
  }

  const handleInstall = () => {
    window.cs2.updaterInstall()
  }

  const handleDismiss = () => {
    setUpdateState(null)
  }

  // Don't render if no update state
  if (!updateState) return null

  return (
    <div className="update-notification">
      {updateState === 'checking' && (
        <div className="update-content">
          <div className="update-icon">🔍</div>
          <div className="update-text">
            <div className="update-title">Checking for updates...</div>
          </div>
        </div>
      )}

      {updateState === 'available' && (
        <div className="update-content">
          <div className="update-icon">🎉</div>
          <div className="update-text">
            <div className="update-title">Update Available</div>
            <div className="update-message">
              Version {version} is ready to download
            </div>
          </div>
          <div className="update-actions">
            <button className="btn-update secondary" onClick={handleDismiss}>
              Later
            </button>
            <button className="btn-update primary" onClick={handleDownload}>
              Download
            </button>
          </div>
        </div>
      )}

      {updateState === 'downloading' && (
        <div className="update-content">
          <div className="update-icon">⬇️</div>
          <div className="update-text">
            <div className="update-title">Downloading Update</div>
            <div className="update-progress-bar">
              <div
                className="update-progress-fill"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
            <div className="update-message">{downloadPercent}%</div>
          </div>
        </div>
      )}

      {updateState === 'ready' && (
        <div className="update-content">
          <div className="update-icon">✅</div>
          <div className="update-text">
            <div className="update-title">Update Ready</div>
            <div className="update-message">
              Restart to install version {version}
            </div>
          </div>
          <div className="update-actions">
            <button className="btn-update secondary" onClick={handleDismiss}>
              Later
            </button>
            <button className="btn-update primary" onClick={handleInstall}>
              Restart & Install
            </button>
          </div>
        </div>
      )}

      {updateState === 'error' && (
        <div className="update-content">
          <div className="update-icon">⚠️</div>
          <div className="update-text">
            <div className="update-title">Update Failed</div>
            <div className="update-message">
              Unable to check for updates. Please try again later.
            </div>
          </div>
          <div className="update-actions">
            <button className="btn-update secondary" onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'

export default function UpdateNotification({ isAdmin }) {
  const [updateState, setUpdateState] = useState(null)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [version, setVersion] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Listen for update status events from main process
    const cleanup = window.cs2.onUpdateStatus((data) => {
      console.log('Update status:', data)

      switch (data.type) {
        case 'checking':
          setUpdateState('checking')
          setIsVisible(true)
          break

        case 'available':
          setUpdateState('available')
          setVersion(data.version)
          setIsVisible(true)
          break

        case 'not-available':
          // Show briefly then auto-dismiss
          setUpdateState('not-available')
          setIsVisible(true)
          setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => setUpdateState(null), 300) // Wait for fade-out
          }, 5000)
          break

        case 'downloading':
          setUpdateState('downloading')
          setDownloadPercent(data.percent || 0)
          setIsVisible(true)
          break

        case 'downloaded':
          setUpdateState('ready')
          setVersion(data.version)
          setIsVisible(true)
          break

        case 'error':
          setUpdateState('error')
          setIsVisible(true)
          console.error('Update error:', data.message)
          // Auto-dismiss errors after 5 seconds
          setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => setUpdateState(null), 300) // Wait for fade-out
          }, 5000)
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
    setIsVisible(false)
    setTimeout(() => setUpdateState(null), 300) // Wait for fade-out animation
  }

  // Admin Gatekeeper: Only show update notifications when admin is unlocked
  if (!isAdmin) return null

  // Don't render if no update state
  if (!updateState) return null

  return (
    <div
      className={`update-notification ${isVisible ? 'update-visible' : 'update-hidden'}`}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 50,
        backgroundColor: '#1e293b',
        border: '1px solid #475569',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        padding: '16px',
        width: '320px',
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(400px)'
      }}
    >
      {updateState === 'checking' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', flexShrink: 0 }}>🔍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
              Checking for updates...
            </div>
          </div>
        </div>
      )}

      {updateState === 'not-available' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', flexShrink: 0 }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
              You're up to date
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              No updates available
            </div>
          </div>
        </div>
      )}

      {updateState === 'available' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px', flexShrink: 0 }}>🎉</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                Update Available
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Version {version} is ready to download
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                transition: 'background 150ms ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: '#3b82f6',
                color: 'white',
                transition: 'all 150ms ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#2563eb'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#3b82f6'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              Download
            </button>
          </div>
        </div>
      )}

      {updateState === 'downloading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', flexShrink: 0 }}>⬇️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              Downloading Update
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '4px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                width: `${downloadPercent}%`,
                transition: 'width 300ms ease',
                borderRadius: '3px'
              }} />
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              {downloadPercent}%
            </div>
          </div>
        </div>
      )}

      {updateState === 'ready' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px', flexShrink: 0 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                Update Ready
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Restart to install version {version}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                transition: 'background 150ms ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: '#10b981',
                color: 'white',
                transition: 'all 150ms ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#059669'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#10b981'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              Restart & Install
            </button>
          </div>
        </div>
      )}

      {updateState === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
              Update Failed
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Unable to check for updates
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useRef, useState, useEffect, useCallback } from 'react'

/**
 * SignatureCanvas — Freehand drawing pad for creating digital signatures.
 *
 * Uses an HTML canvas with quadratic curve smoothing for natural-looking strokes.
 * Outputs a transparent PNG data URL when saved.
 *
 * @param {Function} onSave - Called with the signature data URL (PNG base64)
 * @param {Function} onCancel - Called when the user cancels drawing
 */
export function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [penSize, setPenSize] = useState(2.5)
  const [penColor, setPenColor] = useState('#1a1a2e')
  const pointsRef = useRef([])

  // Set up canvas dimensions and DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true
  }, [])

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [])

  const startStroke = useCallback((e) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    pointsRef.current = [point]
    setIsDrawing(true)

    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }, [getCanvasPoint, penColor, penSize])

  const continueStroke = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()

    const point = getCanvasPoint(e)
    const points = pointsRef.current
    points.push(point)

    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize

    if (points.length >= 3) {
      // Quadratic curve smoothing: draw a curve through the midpoint
      // of the last two segments for natural-looking lines
      const prev = points[points.length - 3]
      const mid = points[points.length - 2]
      const curr = points[points.length - 1]

      const midX1 = (prev.x + mid.x) / 2
      const midY1 = (prev.y + mid.y) / 2
      const midX2 = (mid.x + curr.x) / 2
      const midY2 = (mid.y + curr.y) / 2

      ctx.beginPath()
      ctx.moveTo(midX1, midY1)
      ctx.quadraticCurveTo(mid.x, mid.y, midX2, midY2)
      ctx.stroke()
    } else if (points.length === 2) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
  }, [isDrawing, getCanvasPoint, penColor, penSize])

  const endStroke = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()

    // Draw a dot for single-tap/click
    const points = pointsRef.current
    if (points.length === 1) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.fillStyle = penColor
      ctx.beginPath()
      ctx.arc(points[0].x, points[0].y, penSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }

    setIsDrawing(false)
    setHasStrokes(true)
    pointsRef.current = []
  }, [isDrawing, penColor, penSize])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }, [])

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return

    // Create a trimmed version — find bounding box of non-transparent pixels
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = imageData

    let minX = width, minY = height, maxX = 0, maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      onSave(canvas.toDataURL('image/png'))
      return
    }

    // Add padding around the signature
    const pad = Math.round(10 * dpr)
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(width - 1, maxX + pad)
    maxY = Math.min(height - 1, maxY + pad)

    const trimW = maxX - minX + 1
    const trimH = maxY - minY + 1

    const trimCanvas = document.createElement('canvas')
    trimCanvas.width = trimW
    trimCanvas.height = trimH
    const trimCtx = trimCanvas.getContext('2d')
    trimCtx.drawImage(canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH)

    onSave(trimCanvas.toDataURL('image/png'))
  }, [hasStrokes, onSave])

  return (
    <div className="sig-canvas-container">
      <div className="sig-canvas-toolbar">
        <div className="sig-canvas-tools">
          {/* Pen size */}
          <label className="sig-canvas-tool-group">
            <span className="sig-canvas-tool-label">Pen</span>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={penSize}
              onChange={(e) => setPenSize(parseFloat(e.target.value))}
              className="sig-canvas-slider"
            />
          </label>

          {/* Color swatches */}
          <div className="sig-canvas-colors">
            {['#1a1a2e', '#1e3a5f', '#2d1b4e', '#1a1a1a'].map(color => (
              <button
                key={color}
                className={`sig-canvas-color ${penColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setPenColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <button
          className="btn btn-sm"
          onClick={clearCanvas}
          disabled={!hasStrokes}
        >
          Clear
        </button>
      </div>

      {/* Drawing surface */}
      <div className="sig-canvas-surface">
        <canvas
          ref={canvasRef}
          className="sig-canvas"
          onMouseDown={startStroke}
          onMouseMove={continueStroke}
          onMouseUp={endStroke}
          onMouseLeave={endStroke}
          onTouchStart={startStroke}
          onTouchMove={continueStroke}
          onTouchEnd={endStroke}
        />
        {!hasStrokes && (
          <div className="sig-canvas-placeholder">
            Sign here
          </div>
        )}
        {/* Signature line */}
        <div className="sig-canvas-line" />
      </div>

      {/* Actions */}
      <div className="sig-canvas-actions">
        <button className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-sm primary"
          onClick={handleSave}
          disabled={!hasStrokes}
        >
          Save Signature
        </button>
      </div>
    </div>
  )
}

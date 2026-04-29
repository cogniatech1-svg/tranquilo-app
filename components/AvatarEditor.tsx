'use client'

import { useState, useRef, useEffect } from 'react'

interface AvatarEditorProps {
  imageSrc: string
  onSave: (croppedImage: string) => void
  onCancel: () => void
}

export function AvatarEditor({ imageSrc, onSave, onCancel }: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [fitZoom, setFitZoom] = useState(1) // Zoom que encaja la imagen

  // Cargar la imagen cuando cambia imageSrc
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img

      // Calcular zoom que encaja la imagen completa en el círculo
      const size = 300
      let calculatedFitZoom: number

      if (img.width > img.height) {
        calculatedFitZoom = size / img.width
      } else {
        calculatedFitZoom = size / img.height
      }

      setFitZoom(calculatedFitZoom)
      setZoom(calculatedFitZoom)
      setOffsetX(0)
      setOffsetY(0)
      drawPreview(img, calculatedFitZoom, 0, 0)
    }
    img.src = imageSrc
  }, [imageSrc])

  // Redibujar cuando cambian zoom u offset
  useEffect(() => {
    if (imageRef.current) {
      drawPreview(imageRef.current, zoom, offsetX, offsetY)
    }
  }, [zoom, offsetX, offsetY])

  // Dibujar preview circular
  const drawPreview = (img: HTMLImageElement, z: number, ox: number, oy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const size = 300
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpiar canvas
    ctx.clearRect(0, 0, size, size)

    // Crear máscara circular
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    // Dibujar imagen escalada y posicionada
    const scaledWidth = img.width * z
    const scaledHeight = img.height * z

    ctx.drawImage(
      img,
      (size - scaledWidth) / 2 + ox,
      (size - scaledHeight) / 2 + oy,
      scaledWidth,
      scaledHeight
    )
  }

  // Guardar imagen circular como base64
  const handleSave = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const croppedImage = canvas.toDataURL('image/png')
      onSave(croppedImage)
    }
  }

  // Manejar zoom
  const handleZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value)
    setZoom(newZoom)
  }

  // Manejar arrastrar
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setOffsetX(newX)
    setOffsetY(newY)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
          Encuadra tu foto
        </h2>

        {/* Preview circular */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '300px',
            height: '300px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#f3f4f6',
            border: '3px solid #0d6259',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* Controles de zoom */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            type="range"
            min={fitZoom * 0.3}
            max={fitZoom * 3}
            step="0.05"
            value={zoom}
            onChange={handleZoom}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#e5e7eb',
              outline: 'none',
              accentColor: '#0d6259',
            }}
          />
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0' }}>
            Arrastra para mover • Usa el slider para zoom
          </p>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#0d6259',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✓ Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

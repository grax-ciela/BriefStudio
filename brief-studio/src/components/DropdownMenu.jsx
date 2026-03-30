import { useState, useRef, useEffect } from 'react'

/**
 * Menú desplegable con estética dark premium.
 *
 * Props:
 *   trigger - ReactNode: el elemento que dispara el menú (ej: icono MoreVertical)
 *   items   - Array<{ icon?, label, onClick, danger? }>
 */
export default function DropdownMenu({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="dropdown-trigger"
      >
        {trigger}
      </button>

      {open && (
        <div className="dropdown-menu">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`dropdown-item${item.danger ? ' dropdown-item--danger' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
                item.onClick()
              }}
            >
              {item.icon && <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Menú desplegable con estética dark premium.
 * Renderiza el menú en un PORTAL (document.body) para evitar
 * que overflow:hidden de contenedores padres lo corte.
 *
 * Props:
 *   trigger - ReactNode: el elemento que dispara el menú (ej: icono MoreVertical)
 *   items   - Array<{ icon?, label, onClick, danger? }>
 */
export default function DropdownMenu({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // Calcular posición del menú respecto al trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuHeight = 200 // estimación altura máxima del menú
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight

    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.right,
      openUp,
    })
  }, [])

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!open) updatePosition()
    setOpen(!open)
  }

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) return
      setOpen(false)
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

  // Recalcular posición al hacer scroll o resize
  useEffect(() => {
    if (!open) return
    const handleReposition = () => updatePosition()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [open, updatePosition])

  // Ajustar posición real después de renderizar el menú (con altura real)
  useEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < menuRect.height && rect.top > menuRect.height

    setCoords((prev) => ({
      ...prev,
      top: openUp ? rect.top - menuRect.height - 4 : rect.bottom + 4,
      openUp,
    }))
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="dropdown-trigger"
      >
        {trigger}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu-portal"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-100%)',
            zIndex: 9999,
          }}
        >
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
        </div>,
        document.body
      )}
    </>
  )
}

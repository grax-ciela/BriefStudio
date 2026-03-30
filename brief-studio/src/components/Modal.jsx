import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Modal reutilizable con estética dark premium.
 *
 * Props:
 *   open      - boolean: si el modal está visible
 *   onClose   - fn: callback para cerrar
 *   title     - string: título del modal
 *   children  - ReactNode: contenido del body
 *   footer    - ReactNode: botones del footer
 */
export default function Modal({ open, onClose, title, children, footer }) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--dark" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', padding: '0.25rem', display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

export function PageActionsMenu({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="page-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="ghost-button icon-button page-actions-toggle"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {isOpen ? (
        <div className="page-actions-panel" role="menu" aria-label={label} onClick={() => setIsOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  )
}

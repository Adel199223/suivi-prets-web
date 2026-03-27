import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ManagedElement = HTMLElement & { inert?: boolean }

interface ManagedSiblingState {
  element: ManagedElement
  ariaHidden: string | null
  hadInertAttribute: boolean
  inertValue: boolean
}

interface UseModalDialogOptions {
  isOpen: boolean
  onClose: () => void
  dialogRef: RefObject<HTMLElement | null>
  overlayRef: RefObject<HTMLElement | null>
  initialFocusRef: RefObject<HTMLElement | null>
}

function setManagedElementInert(element: ManagedElement, shouldBeInert: boolean) {
  if ('inert' in element) {
    element.inert = shouldBeInert
  }

  if (shouldBeInert) {
    element.setAttribute('inert', '')
    return
  }

  element.removeAttribute('inert')
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.matches('[disabled],[hidden]')) {
      return false
    }

    if (element.getAttribute('aria-hidden') === 'true' || element.getAttribute('tabindex') === '-1') {
      return false
    }

    return true
  })
}

function hideBackgroundSiblings(overlay: HTMLElement): ManagedSiblingState[] {
  const parent = overlay.parentElement
  if (!parent) {
    return []
  }

  return [...parent.children].flatMap((sibling) => {
    if (sibling === overlay || !(sibling instanceof HTMLElement)) {
      return []
    }

    const managedSibling = sibling as ManagedElement
    const state: ManagedSiblingState = {
      element: managedSibling,
      ariaHidden: sibling.getAttribute('aria-hidden'),
      hadInertAttribute: sibling.hasAttribute('inert'),
      inertValue: Boolean(managedSibling.inert),
    }

    sibling.setAttribute('aria-hidden', 'true')
    setManagedElementInert(managedSibling, true)
    return [state]
  })
}

function restoreBackgroundSiblings(states: ManagedSiblingState[]) {
  for (const state of states) {
    if (state.ariaHidden === null) {
      state.element.removeAttribute('aria-hidden')
    } else {
      state.element.setAttribute('aria-hidden', state.ariaHidden)
    }

    if ('inert' in state.element) {
      state.element.inert = state.inertValue
    }

    if (state.hadInertAttribute) {
      state.element.setAttribute('inert', '')
    } else {
      state.element.removeAttribute('inert')
    }
  }
}

export function useModalDialog({
  isOpen,
  onClose,
  dialogRef,
  overlayRef,
  initialFocusRef,
}: UseModalDialogOptions) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialogElement = dialogRef.current
    const overlayElement = overlayRef.current
    if (!dialogElement || !overlayElement) {
      return
    }
    const dialog = dialogElement
    const overlay = overlayElement

    const previousFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    const managedSiblings = hideBackgroundSiblings(overlay)

    document.body.style.overflow = 'hidden'
    ;(initialFocusRef.current ?? dialog).focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      const isInsideDialog = activeElement instanceof Node && dialog.contains(activeElement)

      if (!isInsideDialog) {
        event.preventDefault()
        ;(event.shiftKey ? lastFocusable : firstFocusable).focus()
        return
      }

      if (event.shiftKey) {
        if (activeElement === firstFocusable || activeElement === dialog) {
          event.preventDefault()
          lastFocusable.focus()
        }
        return
      }

      if (activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      restoreBackgroundSiblings(managedSiblings)
      document.body.style.overflow = previousBodyOverflow

      if (previousFocusedElement?.isConnected) {
        previousFocusedElement.focus()
      }
    }
  }, [dialogRef, initialFocusRef, isOpen, onClose, overlayRef])
}

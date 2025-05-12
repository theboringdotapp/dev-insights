import React, { createContext, useState, useContext } from "react"

// Create a context for the collapsible state
type CollapsibleContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  contentId: string
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(undefined)

// Hook to consume the collapsible context
function useCollapsibleContext() {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible")
  }
  return context
}

// Props for the main Collapsible component
interface CollapsibleProps {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

// Main Collapsible component
export function Collapsible({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleProps) {
  // Generate a unique ID for aria attributes
  const contentId = React.useId()
  
  // State for uncontrolled component usage
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  
  // Determine if component is controlled or uncontrolled
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  
  // Handle state changes based on controlled/uncontrolled mode
  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      
      // Notify parent component of changes if controlled
      if (onOpenChange) {
        const newValue = typeof value === "function" ? value(open) : value
        onOpenChange(newValue)
      }
    },
    [isControlled, onOpenChange, open]
  )

  return (
    <CollapsibleContext.Provider value={{ open, setOpen, contentId }}>
      <div className="w-full">{children}</div>
    </CollapsibleContext.Provider>
  )
}

// Props for the trigger button
interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
}

// Trigger component that toggles the collapsible
export function CollapsibleTrigger({ children, className = "" }: CollapsibleTriggerProps) {
  const { open, setOpen, contentId } = useCollapsibleContext()
  
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => setOpen(!open)}
      className={`flex items-center text-left focus:outline-none ${className}`}
    >
      {children}
    </button>
  )
}

// Props for the content area
interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

// Content component that shows/hides based on state
export function CollapsibleContent({ children, className = "" }: CollapsibleContentProps) {
  const { open, contentId } = useCollapsibleContext()
  
  return (
    <div
      id={contentId}
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        open ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  )
}
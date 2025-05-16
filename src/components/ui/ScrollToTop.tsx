import React, { useState, useEffect } from "react"

/**
 * ScrollToTop component displays a button that appears when the user scrolls down
 * and allows them to quickly scroll back to the top of the page.
 */
function ScrollToTop() {
  // State to track if the button should be visible
  const [isVisible, setIsVisible] = useState(false)

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  // Effect to handle scroll event for showing/hiding the button
  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Add scroll event listener
    window.addEventListener("scroll", toggleVisibility)
    
    // Initial check
    toggleVisibility()
    
    // Clean up
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  // Don't render anything if not visible
  if (!isVisible) {
    return null
  }
  
  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-50 p-2 rounded-full bg-purple-600 dark:bg-purple-700 text-white shadow-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-300 transition-opacity duration-300 opacity-80 hover:opacity-100"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  )
}

export default ScrollToTop
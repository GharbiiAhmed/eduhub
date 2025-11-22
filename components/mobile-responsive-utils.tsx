/**
 * Utility components and styles for mobile responsiveness
 * Use these throughout the app to ensure mobile-friendly layouts
 */

export const mobileResponsiveClasses = {
  // Headers
  header: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
  headerTitle: "text-2xl sm:text-3xl font-bold",
  headerSubtitle: "text-sm sm:text-base",
  
  // Grids
  grid2: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6",
  grid3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
  grid4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6",
  
  // Forms
  formRow: "flex flex-col sm:flex-row gap-2 sm:gap-4",
  formInput: "w-full sm:w-auto",
  
  // Tables
  tableWrapper: "overflow-x-auto -mx-4 sm:mx-0",
  tableContainer: "min-w-full inline-block align-middle",
  
  // Cards
  cardPadding: "p-4 sm:p-6",
  
  // Buttons
  buttonGroup: "flex flex-col sm:flex-row gap-2",
  buttonFull: "w-full sm:w-auto"
}

/**
 * Hook to detect mobile viewport
 */
export function useIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 640 // sm breakpoint
}






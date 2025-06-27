// Client-side chunk loading retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Override the default chunk loading error handler
if (typeof window !== 'undefined') {
  const originalError = window.addEventListener;
  
  window.addEventListener = function(type: string, listener: any, options?: any) {
    if (type === 'error') {
      const wrappedListener = (event: ErrorEvent) => {
        // Check if it's a chunk loading error
        if (event.message && (
          event.message.includes('Loading chunk') ||
          event.message.includes('ChunkLoadError') ||
          event.filename?.includes('/_next/static/chunks/')
        )) {
          console.warn('Chunk loading error detected:', event.message);
          
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying chunk load (attempt ${retryCount}/${MAX_RETRIES})`);
            
            // Small delay before retry
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            // Prevent the error from propagating
            event.preventDefault();
            return;
          } else {
            console.error('Max chunk loading retries exceeded');
          }
        }
        
        // Call the original listener
        if (typeof listener === 'function') {
          listener(event);
        }
      };
      
      return originalError.call(this, type, wrappedListener, options);
    }
    
    return originalError.call(this, type, listener, options);
  };
}

// Add unhandled promise rejection handler for dynamic imports
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error && typeof error === 'object' && 
        (error.name === 'ChunkLoadError' || 
         (error.message && error.message.includes('Loading chunk')))) {
      
      console.warn('Unhandled chunk loading error:', error);
      
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying after chunk error (attempt ${retryCount}/${MAX_RETRIES})`);
        
        // Prevent the error from being logged
        event.preventDefault();
        
        // Retry after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  });
}

export { retryCount, MAX_RETRIES };
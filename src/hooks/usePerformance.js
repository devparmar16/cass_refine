import { useEffect, useRef } from 'react';

export const usePerformance = (componentName) => {
  const startTime = useRef(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    renderCount.current += 1;

    // Log performance metrics in development
    if (import.meta.env.DEV) {
      console.log(`🚀 ${componentName} render #${renderCount.current}: ${duration.toFixed(2)}ms`);
    }

    // Reset timer for next render
    startTime.current = performance.now();
  });

  // Track memory usage
  useEffect(() => {
    if (import.meta.env.DEV && 'memory' in performance) {
      const memory = performance.memory;
      console.log(`💾 Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }, []);

  return {
    renderCount: renderCount.current,
    getRenderTime: () => performance.now() - startTime.current,
  };
};

// Hook for measuring network requests
export const useNetworkMonitor = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log(`🌐 Page load: ${entry.loadEventEnd - entry.loadEventStart}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });

      return () => observer.disconnect();
    }
  }, []);
}; 
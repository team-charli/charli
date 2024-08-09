function setupGlobalErrorHandlers() {
  const originalWindowOnerror = window.onerror;
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    if (error && error.stack) {
      console.error('Global error handler caught an error:');
      console.error(error.stack);
    } else {
      console.error(`Error: ${msg} at ${url}:${lineNo}:${columnNo}`);
    }
    return originalWindowOnerror ? originalWindowOnerror(msg, url, lineNo, columnNo, error) : false;
  };

  window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled Promise Rejection:');
    if (event.reason && event.reason.stack) {
      console.error(event.reason.stack);
    } else {
      console.error(event.reason);
    }
  });

  const originalConsoleError = console.error;
  console.error = function (...args) {
    if (args[0] instanceof Error) {
      console.group('Error details:');
      console.error(args[0].stack || args[0]);
      console.groupEnd();
    } else {
      originalConsoleError.apply(console, args);
    }
  };
}

export default setupGlobalErrorHandlers;





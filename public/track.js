
(function() {
  // Do not track on localhost or other development environments
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Analytics tracking disabled on localhost.');
    return;
  }
  
  // Find the script tag itself to read the data attributes
  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error('Tracking script tag not found.');
    return;
  }
  
  const siteId = scriptTag.getAttribute('data-site-id');
  if (!siteId) {
    console.error('data-site-id not found on tracking script.');
    return;
  }

  const trackingEndpoint = 'https://runanddeploy.netlify.app/api/track';

  const data = {
    siteId: siteId,
    path: window.location.pathname,
    userAgent: navigator.userAgent || 'Unknown',
  };

  // Use navigator.sendBeacon if available for reliability on page unload
  // Otherwise, fall back to a standard fetch request.
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(trackingEndpoint, blob);
  } else {
    fetch(trackingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true, // helps ensure request is sent on page unload
    }).catch(err => {
      console.error('Failed to send analytics data:', err);
    });
  }
})();

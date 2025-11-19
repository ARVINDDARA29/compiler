
(function() {
  // Do not track on localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }

  // Find the script tag to get the data-site-id
  const scriptTag = document.querySelector('script[src$="/track.js"]');
  if (!scriptTag) {
    console.error('Analytics script tag not found.');
    return;
  }

  const siteId = scriptTag.getAttribute('data-site-id');
  if (!siteId) {
    console.error('data-site-id attribute not found on analytics script tag.');
    return;
  }
  
  // The API endpoint of the main RunAndDeploy application
  const trackingUrl = 'https://runanddeploy.web.app/api/track';

  const data = {
    siteId: siteId,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  };

  // Use navigator.sendBeacon if available for reliability, otherwise fallback to fetch
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(trackingUrl, blob);
  } else {
    fetch(trackingUrl, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true, // Keep the request alive even if the page is unloading
    }).catch(err => {
      console.error('Analytics tracking failed:', err);
    });
  }
})();

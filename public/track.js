
(function() {
  const script = document.currentScript;
  const siteId = script.getAttribute('data-site-id');

  if (siteId) {
    fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteId: siteId,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      }),
    });
  }
})();

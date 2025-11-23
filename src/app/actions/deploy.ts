
'use server';

import { z } from 'zod';

const CLOUDFLARE_API_URL = 'https://arvindbishnoi.runanddeploy.workers.dev/api/deploy';

const schema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
  projectName: z.string().min(1, 'Project name is required.'),
  addWatermark: z.boolean(),
  siteId: z.string(),
});

type DeployResult = {
  success: boolean;
  error?: string;
  url?: string;
};

export async function deployToCloudflare(data: { html: string; css: string; js: string, projectName: string, addWatermark: boolean, siteId: string }): Promise<DeployResult> {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    const formattedErrors = validation.error.format();
    const errorMessage = formattedErrors.projectName?._errors[0] ?? 'Invalid input.';
    return { success: false, error: errorMessage };
  }

  const { html, css, js, projectName, addWatermark, siteId } = validation.data;
  
  const deploymentTime = new Date().toISOString();
  const trackingApiUrl = 'https://runanddeploy.com/api/track';

  const trackingScript = `
    <script>
      (function() {
        const siteId = '${siteId}';
        if (siteId) {
          fetch('${trackingApiUrl}', {
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
    </script>
  `;

  const adScriptLoader = `
    <script>
      (function() {
        const deploymentTime = new Date('${deploymentTime}');
        const thirtyMinutes = 30 * 60 * 1000;
        const now = new Date();

        function loadAdScript() {
          const adScript = document.createElement('script');
          adScript.type = 'text/javascript';
          adScript.src = '//ironendeavour.com/e1/f6/22/e1f62229260eade549ea1db2a2d4deee.js';
          document.body.appendChild(adScript);
        }

        if (now.getTime() - deploymentTime.getTime() >= thirtyMinutes) {
          loadAdScript();
        } else {
          const delay = thirtyMinutes - (now.getTime() - deploymentTime.getTime());
          setTimeout(loadAdScript, delay);
        }
      })();
    </script>
  `;

  const watermarkHTML = addWatermark
    ? `
    <a href="https://runanddeploy.com" target="_blank" class="runanddeploy-watermark">
      RunAndDeploy
    </a>
  `
    : '';

  const watermarkCSS = addWatermark
    ? `
    .runanddeploy-watermark {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      font-size: 12px;
      border-radius: 5px;
      text-decoration: none;
      z-index: 1000;
      transition: background-color 0.3s;
    }
    .runanddeploy-watermark:hover {
      background-color: rgba(0, 0, 0, 0.9);
    }
  `
    : '';

  const isFullHtml = html.trim().toLowerCase().startsWith('<!doctype html>') || html.trim().toLowerCase().startsWith('<html>');
  
  const fullHtmlContent = isFullHtml 
    ? html.replace('</body>', `${watermarkHTML}${adScriptLoader}${trackingScript}</body>`)
    : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    ${css}
    ${watermarkCSS}
  </style>
</head>
<body>
  ${html}
  ${watermarkHTML}
  <script>
    ${js}
  </script>
  ${adScriptLoader}
  ${trackingScript}
</body>
</html>
  `.trim();

  try {
    const response = await fetch(CLOUDFLARE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subdomain: projectName,
        html: fullHtmlContent,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, url: result.url };
    } else {
      // Handle cases where the worker returns a non-success but ok response, or a non-ok response
      return { success: false, error: result.error || `Deployment failed with status: ${response.status}` };
    }
  } catch (error) {
    console.error('Deployment to Cloudflare failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred during deployment.' };
  }
}

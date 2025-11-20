
'use server';

import { z } from 'zod';

const REPO_OWNER = 'adbossappmaker';
const REPO_NAME = 'sites';
const BRANCH = 'main';

const schema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
  projectName: z.string().min(1, 'Project name is required.'),
  addWatermark: z.boolean(),
  enableAds: z.boolean(),
});

type DeployResult = {
  success: boolean;
  error?: string;
  url?: string;
};

async function getGitHubToken(): Promise<string> {
    const token = process.env.GITHUB_TOKEN!;
    if (!token) {
        throw new Error('GitHub API token not found. Please add it to your .env file as GITHUB_TOKEN.');
    }
    return token;
}


export async function deployToGithub(data: { html: string; css: string; js: string, projectName: string, addWatermark: boolean, enableAds: boolean }): Promise<DeployResult> {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    const formattedErrors = validation.error.format();
    const errorMessage = formattedErrors.projectName?._errors[0] ?? 'Invalid input.';
    return { success: false, error: errorMessage };
  }

  const { html, css, js, projectName, addWatermark, enableAds } = validation.data;
  
  let GITHUB_TOKEN = '';
  try {
    GITHUB_TOKEN = await getGitHubToken();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not retrieve API token.';
    console.error(message);
    return { success: false, error: message };
  }

  const FILE_PATH = `${projectName}/index.html`;

  const watermarkHTML = addWatermark
    ? `
    <a href="https://runanddeploy.web.app" target="_blank" class="runanddeploy-watermark">
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

  const adScripts = enableAds ? `
    <script async="async" data-cfasync="false" src="//ironendeavour.com/ccc67c8953ab73a5509caefc927e2583/invoke.js"></script>
    <div id="container-ccc67c8953ab73a5509caefc927e2583"></div>
    <script type='text/javascript' src='//ironendeavour.com/e1/f6/22/e1f62229260eade549ea1db2a2d4deee.js'></script>
    <script type='text/javascript' src='//ironendeavour.com/59/3a/6f/593a6fe5e57191563add8155be96c4ed.js'></script>
    ` : '';
    
  const analyticsScript = enableAds ? `<script defer src="/track.js" data-site-id="${projectName}" data-api-host="https://runanddeploy-prod.web.app"></script>` : '';

  const isFullHtml = html.trim().toLowerCase().startsWith('<!doctype html>') || html.trim().toLowerCase().startsWith('<html>');
  
  const fileContent = isFullHtml 
    ? html.replace('</body>', `${adScripts}${analyticsScript}${watermarkHTML}</body>`)
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
  ${adScripts}
  ${analyticsScript}
  ${watermarkHTML}
  <script>
    ${js}
  </script>
</body>
</html>
  `.trim();

  const contentEncoded = Buffer.from(fileContent).toString('base64');
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
    // 1. Check if file exists to get its SHA
    const getFileRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });

    if (getFileRes.ok) {
        const fileData = await getFileRes.json();
        return { success: false, error: 'This name is already in use.' };
    } else if (getFileRes.status !== 404) {
      const errorData = await getFileRes.json();
      throw new Error(`Failed to check for existing file: ${errorData.message || getFileRes.statusText}`);
    }
    
    // 2. Create the file
    const putFileRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `feat: Deploy site '${projectName}' via RunAndDeploy [${new Date().toISOString()}]`,
        content: contentEncoded,
        branch: BRANCH,
      }),
    });

    if (!putFileRes.ok) {
      const errorData = await putFileRes.json();
      return { success: false, error: `GitHub API error: ${errorData.message || putFileRes.statusText}` };
    }

    const deployedUrl = `https://${REPO_OWNER}.github.io/${REPO_NAME}/${projectName}/`;

    return { success: true, url: deployedUrl };
  } catch (error) {
    console.error('Deployment failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred during deployment.' };
  }
}

    
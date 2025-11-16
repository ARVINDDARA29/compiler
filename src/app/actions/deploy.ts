'use server';

import { z } from 'zod';

const GITHUB_TOKEN = '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';
const REPO_OWNER = 'adbossappmaker';
const REPO_NAME = 'sites';
const BRANCH = 'main';

const schema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
  projectName: z.string().min(1, 'Project name is required.'),
  addWatermark: z.boolean(),
});

type DeployResult = {
  success: boolean;
  error?: string;
  url?: string;
};

export async function deployToGithub(data: { html: string; css: string; js: string, projectName: string, addWatermark: boolean }): Promise<DeployResult> {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    const formattedErrors = validation.error.format();
    const errorMessage = formattedErrors.projectName?._errors[0] ?? 'Invalid input.';
    return { success: false, error: errorMessage };
  }

  const { html, css, js, projectName, addWatermark } = validation.data;
  
  const FILE_PATH = `${projectName}/index.html`;

  const watermarkHTML = addWatermark
    ? `
    <a href="https://deploysite.netlify.app" target="_blank" class="bishnoi-deployer-watermark">
      Bishnoi deployer
    </a>
  `
    : '';

  const watermarkCSS = addWatermark
    ? `
    .bishnoi-deployer-watermark {
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
    .bishnoi-deployer-watermark:hover {
      background-color: rgba(0, 0, 0, 0.9);
    }
  `
    : '';

  const fileContent = `
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
</body>
</html>
  `.trim();

  const contentEncoded = Buffer.from(fileContent).toString('base64');
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
    // 1. Check if file exists to get its SHA
    let existingFileSha: string | undefined;
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
      existingFileSha = fileData.sha;
    } else if (getFileRes.status !== 404) {
      const errorData = await getFileRes.json();
      throw new Error(`Failed to check for existing file: ${errorData.message || getFileRes.statusText}`);
    }
    
    // 2. Create or update the file
    const putFileRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `feat: Deploy site '${projectName}' via CodeDeploy [${new Date().toISOString()}]`,
        content: contentEncoded,
        sha: existingFileSha,
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

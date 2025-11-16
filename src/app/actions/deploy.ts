'use server';

import { z } from 'zod';

const GITHUB_TOKEN = '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';
const REPO_OWNER = 'adbossappmaker';
const REPO_NAME = 'sites';
const FILE_PATH = 'index.html';
const BRANCH = 'main';

const schema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
});

type DeployResult = {
  success: boolean;
  error?: string;
  url?: string;
};

export async function deployToGithub(data: { html: string; css: string; js: string }): Promise<DeployResult> {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Invalid input.' };
  }

  const { html, css, js } = validation.data;

  const fileContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deployed with CodeDeploy</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
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
        message: `feat: Deploy site via CodeDeploy [${new Date().toISOString()}]`,
        content: contentEncoded,
        sha: existingFileSha,
        branch: BRANCH,
      }),
    });

    if (!putFileRes.ok) {
      const errorData = await putFileRes.json();
      return { success: false, error: `GitHub API error: ${errorData.message || putFileRes.statusText}` };
    }

    const commitData = await putFileRes.json();

    return { success: true, url: commitData.content.html_url };
  } catch (error) {
    console.error('Deployment failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred during deployment.' };
  }
}

import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

function getFiles(dir: string, baseDir: string, fileList: {path: string, content: string}[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(baseDir, fullPath);
    
    // Ignore node_modules, dist, .git, and any .env files
    if (['node_modules', 'dist', '.git'].some(ignored => relativePath.startsWith(ignored) || file === ignored) || file.includes('.env')) {
      continue;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, baseDir, fileList);
    } else {
      const content = fs.readFileSync(fullPath, { encoding: 'base64' });
      fileList.push({ path: relativePath.replace(/\\/g, '/'), content });
    }
  }
  return fileList;
}

const app = express();

app.use(express.json({ limit: '50mb' }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/audit", async (req, res) => {
  const { url, prompt } = req.body;
  if (!url || !prompt) {
    return res.status(400).json({ error: "URL and prompt are required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  const ai = new GoogleGenAI({ apiKey });
  const MAX_RETRIES = 3;
  let attempt = 0;
  let delay = 2000;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
        },
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error(`Audit API Error (Attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
      
      // Check if it's a rate limit error (429) or a 5xx error
      const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.toLowerCase().includes('quota');
      const isServerError = error.message?.includes('500') || error.message?.includes('503') || error.status >= 500;
      
      if ((isRateLimit || isServerError) && attempt < MAX_RETRIES - 1) {
        attempt++;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        return res.status(500).json({ error: error.message || "Failed to generate audit report after multiple attempts" });
      }
    }
  }
});

app.get("/api/auth/github/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = req.query.redirect_uri as string;

  if (!clientId) {
    return res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured" });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo read:user user:email",
  });

  if (redirectUri) {
    params.append("redirect_uri", redirectUri);
  }

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.json({ url: authUrl });
});

app.post("/api/github/export", async (req, res) => {
  const { token, repoName } = req.body;
  if (!token) return res.status(401).json({error: "No token provided"});

  try {
    const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` } });
    const user = await userRes.json();
    let owner = user.login;
    let targetRepoName = repoName || 'fds-siteaudit';

    if (targetRepoName.includes('/')) {
      const parts = targetRepoName.split('/');
      owner = parts[0];
      targetRepoName = parts[1];
    }

    if (!owner) {
      return res.status(401).json({ error: 'Invalid token. Please reconnect to GitHub.' });
    }

    let repo;
    const existingRepoRes = await fetch(`https://api.github.com/repos/${owner}/${targetRepoName}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (existingRepoRes.ok) {
      repo = await existingRepoRes.json();
    } else {
      const createUrl = owner === user.login 
        ? 'https://api.github.com/user/repos' 
        : `https://api.github.com/orgs/${owner}/repos`;
        
      const repoRes = await fetch(createUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetRepoName, auto_init: true, private: true })
      });
      repo = await repoRes.json();
      
      if (repo.message && repo.message.includes('Bad credentials')) {
        return res.status(401).json({ error: 'Invalid or expired token. Please reconnect.' });
      }
      if (!repo.name) {
        throw new Error(repo.message || 'Failed to create repository');
      }
    }

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/refs/heads/main`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let ref = await refRes.json();
    
    if (ref.message === 'Not Found' || ref.message === 'Git Repository is empty.') {
      const refResMaster = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/refs/heads/master`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      ref = await refResMaster.json();
    }

    let latestCommitSha = null;
    let baseTreeSha = null;
    let branch = 'heads/main';

    if (ref.object) {
      latestCommitSha = ref.object.sha;
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/commits/${latestCommitSha}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const commit = await commitRes.json();
      baseTreeSha = commit.tree.sha;
      branch = ref.ref.replace('refs/', '');
    } else {
      const initRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/contents/README.md`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Initial commit',
          content: Buffer.from('# ' + repo.name).toString('base64')
        })
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(`Failed to initialize empty repository: ${initData.message}`);
      
      latestCommitSha = initData.commit.sha;
      baseTreeSha = initData.commit.tree.sha;
      branch = 'heads/' + (repo.default_branch || 'main');
    }

    const files = getFiles(process.cwd(), process.cwd());
    if (files.length === 0) {
      throw new Error("No files found to export.");
    }
    
    const tree = [];
    for (const file of files) {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/blobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: file.content, encoding: 'base64' })
      });
      const blob = await blobRes.json();
      tree.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
    }

    const newTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/trees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(baseTreeSha ? { base_tree: baseTreeSha, tree } : { tree })
    });
    const newTree = await newTreeRes.json();
    if (!newTree.sha) throw new Error(`Tree creation failed: ${newTree.message || JSON.stringify(newTree)}`);

    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/commits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Export project files from AI Studio', 
        tree: newTree.sha, 
        parents: latestCommitSha ? [latestCommitSha] : [] 
      })
    });
    const newCommit = await newCommitRes.json();
    if (!newCommit.sha) throw new Error(`Commit creation failed: ${newCommit.message || JSON.stringify(newCommit)}`);

    if (latestCommitSha) {
      const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/refs/${branch}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommit.sha })
      });
      const patchData = await patchRes.json();
      if (patchData.message && !patchData.ref) throw new Error(`Ref update failed: ${patchData.message}`);
    } else {
      const postRes = await fetch(`https://api.github.com/repos/${owner}/${repo.name}/git/refs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'refs/heads/main', sha: newCommit.sha })
      });
      const postData = await postRes.json();
      if (postData.message && !postData.ref) throw new Error(`Ref creation failed: ${postData.message}`);
    }

    res.json({ success: true, url: repo.html_url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/auth/github/callback", "/api/auth/github/callback/", "/callback", "/callback/"], async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send("Missing code parameter");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub OAuth credentials are not configured");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                { 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  token: '${tokenData.access_token}' 
                }, 
                '*'
              );
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
});

export default app;

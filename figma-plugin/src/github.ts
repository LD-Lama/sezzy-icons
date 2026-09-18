// Minimal GitHub REST (git data API) client for opening a PR that adds/updates
// SVGs under assets/<category>/. No @octokit dependency — this is the only
// GitHub call surface the plugin needs, kept small to keep the UI bundle tiny.

export interface GitHubFile {
  path: string; // e.g. "assets/icons/TickIcon.svg"
  content: string; // raw SVG text
}

export interface PushResult {
  prUrl: string;
  branch: string;
  autoMergeEnabled: boolean;
  autoMergeError?: string;
}

export class GitHubError extends Error {}

/** "/repos/LD-Lama/sezzy-icons/git/refs" -> "LD-Lama" */
function ownerFromPath(path: string): string {
  return path.split("/")[2] ?? "";
}

async function gh(token: string, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403 && /not accessible by personal access token/i.test(body)) {
      throw new GitHubError(
        `GitHub API ${init.method ?? "GET"} ${path} failed: 403 (token rejected). This is usually one of: ` +
          `(1) the org hasn't approved this fine-grained token yet — an org owner must approve it under ` +
          `github.com/organizations/${ownerFromPath(path)}/settings/personal-access-tokens; ` +
          `(2) the token's repository access doesn't include this repo; or ` +
          `(3) it's missing "Contents: Read and write" or "Pull requests: Read and write" permission.`
      );
    }
    throw new GitHubError(`GitHub API ${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Lists file names directly inside a folder (used for collision warnings). Returns [] if the folder doesn't exist yet. */
export async function listFolder(token: string, owner: string, repo: string, folderPath: string): Promise<string[]> {
  try {
    const contents = await gh(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(folderPath).replace(/%2F/g, "/")}`);
    if (!Array.isArray(contents)) return [];
    return contents.filter((entry: any) => entry.type === "file").map((entry: any) => entry.name);
  } catch (err) {
    if (err instanceof GitHubError && err.message.includes(" 404 ")) return [];
    throw err;
  }
}

/** Lists top-level category folders under assets/. */
export async function listCategories(token: string, owner: string, repo: string): Promise<string[]> {
  const contents = await gh(token, `/repos/${owner}/${repo}/contents/assets`);
  if (!Array.isArray(contents)) return [];
  return contents.filter((entry: any) => entry.type === "dir").map((entry: any) => entry.name);
}

/**
 * Flags the PR for GitHub's native auto-merge (squash) so it merges itself
 * once the repo's required CI status check passes — no one has to click
 * "merge" for every icon. Requires the repo's "Allow auto-merge" setting and
 * a required status check on the base branch; without a required check,
 * GitHub merges as soon as it's mergeable instead of waiting on CI.
 */
async function enableAutoMerge(token: string, pullRequestNodeId: string): Promise<void> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "mutation($id: ID!) { enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) { clientMutationId } }",
      variables: { id: pullRequestNodeId },
    }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    const message = json.errors?.map((e: any) => e.message).join("; ") || `${res.status} ${res.statusText}`;
    throw new GitHubError(`Couldn't enable auto-merge: ${message}`);
  }
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function pushFilesAsPullRequest(
  token: string,
  owner: string,
  repo: string,
  files: GitHubFile[],
  prTitle: string,
  prBody: string
): Promise<PushResult> {
  if (files.length === 0) throw new GitHubError("No files to push.");

  const repoInfo = await gh(token, `/repos/${owner}/${repo}`);
  const baseBranch: string = repoInfo.default_branch;

  const baseRef = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
  const baseSha: string = baseRef.object.sha;

  const baseCommit = await gh(token, `/repos/${owner}/${repo}/git/commits/${baseSha}`);
  const baseTreeSha: string = baseCommit.tree.sha;

  const branch = `figma-push-${Date.now()}`;
  await gh(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  const treeEntries = [];
  for (const file of files) {
    const blob = await gh(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: toBase64(file.content), encoding: "base64" }),
    });
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const newTree = await gh(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });

  const newCommit = await gh(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: prTitle, tree: newTree.sha, parents: [baseSha] }),
  });

  await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  const pr = await gh(token, `/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title: prTitle, body: prBody, head: branch, base: baseBranch }),
  });

  let autoMergeEnabled = false;
  let autoMergeError: string | undefined;
  try {
    await enableAutoMerge(token, pr.node_id);
    autoMergeEnabled = true;
  } catch (err) {
    autoMergeError = err instanceof Error ? err.message : String(err);
  }

  return { prUrl: pr.html_url, branch, autoMergeEnabled, autoMergeError };
}

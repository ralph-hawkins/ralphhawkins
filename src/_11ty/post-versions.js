const { execFileSync } = require("child_process");
const path = require("path");
const matter = require("gray-matter");

const repoRoot = path.resolve(__dirname, "..", "..");

// Commits whose subject contains this token don't bump the version — for
// site-wide housekeeping sweeps (front-matter tidies, heading-level fixes)
// that touch every post without meaningfully changing any of them.
const SKIP_TOKEN = "[skip-version]";

// Per-file commit chains and computed versions are cached for the life of the
// process, but only while HEAD is unchanged — in --serve mode a new commit
// invalidates everything, while ordinary file edits (which can't affect
// git-derived versions) keep the cache warm across rebuilds.
let cacheHead;
let chains = null;
const versions = new Map();

function git(...args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Minor versions read as two digits minimum (1.00, 1.05, 1.15, 1.100) so
// numbers stay column-stable in the tabular-nums colophon.
//
// Returned as `iteration` as well as inside `version`, because the colophon
// sets the week note's number where the major part would be — "Week note
// 53.05" — and pulling the minor back out of a formatted version string is
// exactly how this padding would eventually be lost.
function minor(n) {
  return String(n).padStart(2, "0");
}

function resetCacheIfNewCommits() {
  let head = null;
  try {
    head = git("rev-parse", "HEAD").trim();
  } catch {
    // Not a git checkout; postVersion() will return null for everything.
  }
  if (head !== cacheHead) {
    chains = null;
    versions.clear();
    cacheHead = head;
  }
}

// One history walk for everything under src/, instead of a `git log --follow`
// per post (which made the filter ~30× slower). Builds a map from a file's
// current path to its list of commits, oldest first, each recording the path
// the file had *at that commit* so old revisions can still be git-shown.
function buildChains() {
  const log = git(
    "log", "--reverse", "--name-status", "-M",
    "--format=%x01%H%x1f%aI%x1f%s", "--", "src"
  );

  chains = new Map();
  for (const block of log.split("\x01")) {
    if (!block.trim()) continue;
    const lines = block.split("\n").filter(line => line.trim() !== "");
    const [hash, date, subject] = lines[0].split("\x1f");

    for (const line of lines.slice(1)) {
      const fields = line.split("\t");
      const status = fields[0][0];
      if (status === "D") {
        chains.delete(fields[1]);
        continue;
      }
      // Renames/copies list "old\tnew"; everything else just the path.
      const file = fields[fields.length - 1];
      if (status === "R") {
        chains.set(file, chains.get(fields[1]) || []);
        chains.delete(fields[1]);
      }
      if (!chains.has(file)) chains.set(file, []);
      chains.get(file).push({ hash, date, subject, file });
    }
  }
}

// A commit is "live" once the file exists in it without preview: true.
function isPreview(commit) {
  const raw = git("show", `${commit.hash}:${commit.file}`);
  return matter(raw).data.preview === true;
}

function computeVersion(relPath) {
  if (!chains) buildChains();
  const commits = chains.get(relPath);
  if (!commits || commits.length === 0) return null; // Not committed yet.

  const liveIndex = commits.findIndex(commit => !isPreview(commit));

  if (liveIndex === -1) {
    // Never been live: preview drafts count 0.1, 0.2, …
    return {
      version: `0.${minor(commits.length)}`,
      iteration: minor(commits.length),
      draft: true,
      published: null,
      updated: new Date(commits[commits.length - 1].date),
    };
  }

  // First live commit is 1.0; each later commit bumps the minor unless its
  // subject carries the skip token.
  const counted = commits
    .slice(liveIndex)
    .filter((c, i) => i === 0 || !c.subject.includes(SKIP_TOKEN));

  return {
    version: `1.${minor(counted.length - 1)}`,
    iteration: minor(counted.length - 1),
    draft: false,
    published: new Date(commits[liveIndex].date),
    updated: counted.length > 1 ? new Date(counted[counted.length - 1].date) : null,
  };
}

function postVersion(inputPath) {
  if (!inputPath) return null;
  const relPath = path.relative(repoRoot, path.resolve(repoRoot, inputPath));
  if (versions.has(relPath)) return versions.get(relPath);

  let result = null;
  try {
    result = computeVersion(relPath);
  } catch {
    // No git, shallow history, or untracked file — render without version.
  }
  versions.set(relPath, result);
  return result;
}

module.exports = { postVersion, resetCacheIfNewCommits };

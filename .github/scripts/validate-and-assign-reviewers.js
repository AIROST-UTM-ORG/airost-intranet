#!/usr/bin/env node

/**
 * validate-and-assign-reviewers.js
 *
 * 1. Validates PR template format and issue linking:
 *    - Checks for required sections: "## What changed", "## Why", "## Testing".
 *    - Validates that "Closes #<id>" in the "## Related issue" section references an existing, open issue.
 *    - Checks file lengths against the 400-line modularity threshold.
 * 2. Determines required review approvals (1 vs 2) based on the risk matrix.
 * 3. Updates GitHub Project #6 custom field "Approvals Required" (with graceful degradation).
 * 4. Automatically assigns eligible reviewers from the maintainer team pool,
 *    strictly excluding the PR author and external commenters/bots.
 */

const token = process.env.PROJECT_AUTOMATION_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const projectId = process.env.PROJECT_ID || 'PVT_kwDOE_DQyc4BoRy3'; // AIROST Intranet (Project #6)
const approvalsFieldId = process.env.APPROVALS_FIELD_ID || 'PVTSSF_lADOE_DQyc4BoRy3zhmyojE';

const APPROVAL_OPTIONS = {
  1: { id: 'd367967d', name: '1 Approval' },
  2: { id: 'a4527488', name: '2 Approvals' }
};

const MAINTAINER_POOL = ['leehom22', 'Gan0117', 'HoeZhiWan', 'zping-926'];

const owner = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.REPO_NAME || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : null);
const prNumber = parseInt(process.env.PR_NUMBER, 10);

if (!token) {
  console.warn('::warning::No authentication token provided. Skipping reviewer assignment and validation.');
  process.exit(0);
}

if (!owner || !repo || isNaN(prNumber)) {
  console.error(`::error::Missing required params: owner=${owner}, repo=${repo}, prNumber=${prNumber}`);
  process.exit(1);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'validate-and-assign-reviewers',
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const errorMsg = typeof body === 'object' && body.message ? body.message : body;
    throw new Error(`HTTP ${res.status}: ${errorMsg}`);
  }
  return body;
}

async function graphql(query, variables = {}) {
  const body = await request('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables })
  });

  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors.map(e => e.message).join(' | '));
  }
  return body.data;
}

function evaluateRisk(files, labels, title) {
  // Sensitive 2-approval criteria:
  // 1. Auth, sessions, passwords, permissions
  // 2. Docker, CI/CD actions, reverse-proxy, deployment configs
  // 3. Database models and schema migrations
  // 4. Shared server architecture & critical admin routes
  // 5. Automation & GitHub scripts
  for (const f of files) {
    if (
      /\.github\/workflows\//i.test(f) ||
      /\.github\/scripts\//i.test(f) ||
      /docker/i.test(f) ||
      /nginx/i.test(f) ||
      /server\/passport\.js/i.test(f) ||
      /server\/routes\/adminRoutes/i.test(f) ||
      /server\/routes\/auth/i.test(f) ||
      /server\/middleware\/auth/i.test(f) ||
      /server\/models\//i.test(f) ||
      /server\/app\.js/i.test(f) ||
      /server\/server\.js/i.test(f)
    ) {
      return 2;
    }
  }

  if (labels.some(l => ['module:auth', 'module:infra'].includes(l))) {
    return 2;
  }

  if (/\b(?:auth|jwt|security|permission|session|docker|deploy|ingress)\b/i.test(title)) {
    return 2;
  }

  return 1;
}

async function validatePrTemplate(body) {
  const errors = [];
  const warnings = [];
  const validIssues = [];

  if (!body || body.trim().length === 0) {
    errors.push('Pull request description is empty. Please fill in the required PR template.');
    return { errors, warnings, validIssues };
  }

  if (!/##\s*What changed/i.test(body)) {
    errors.push('Missing required section: `## What changed`');
  }
  if (!/##\s*Why/i.test(body)) {
    errors.push('Missing required section: `## Why`');
  }
  if (!/##\s*Testing/i.test(body)) {
    errors.push('Missing required section: `## Testing`');
  }

  // Restrict issue closing regex search specifically to the ## Related issue(s) section
  const relatedSectionMatch = body.match(/(?:^|\r?\n)#{2,3}\s*Related issues?(?:\(s\))?\s*:?([\s\S]*?)(?=(?:\r?\n#{1,6}\s+|$))/i);
  if (!relatedSectionMatch) {
    errors.push('Missing required section: `## Related issue`');
    return { errors, warnings, validIssues };
  }

  const relatedSection = relatedSectionMatch[1];
  const issueMatches = [...relatedSection.matchAll(/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:https?:\/\/[^\s]+\/issues\/|#)(\d+)/gi)];

  if (issueMatches.length === 0) {
    errors.push('Missing related issue reference in `## Related issue` section (e.g. `Closes #<issue_number>`). Every PR must link to an existing issue.');
    return { errors, warnings, validIssues };
  }

  const issueNumbers = [...new Set(issueMatches.map(m => parseInt(m[1], 10)))];
  for (const issueNum of issueNumbers) {
    try {
      const issue = await request(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}`);
      if (issue.pull_request) {
        errors.push(`Issue #${issueNum} is actually a pull request, not an issue.`);
      } else if (issue.state !== 'open') {
        errors.push(`Issue #${issueNum} is already closed (${issue.state}). PRs must reference an open issue.`);
      } else {
        validIssues.push(issueNum);
        console.log(`✓ Verified linked issue #${issueNum}: "${issue.title}" (${issue.state})`);
      }
    } catch (err) {
      errors.push(`Referenced issue #${issueNum} was not found in ${owner}/${repo}.`);
    }
  }

  return { errors, warnings, validIssues };
}

// Keep backward-compatible helpers
function validatePRBody(body) {
  const errors = [];
  const warnings = [];

  if (!body || body.trim().length === 0) {
    errors.push('Pull request description is empty. Please fill in the required PR template.');
    return { errors, warnings };
  }

  if (!/##\s*What changed/i.test(body)) {
    errors.push('Missing required section: `## What changed`');
  }
  if (!/##\s*Why/i.test(body)) {
    errors.push('Missing required section: `## Why`');
  }
  if (!/##\s*Testing/i.test(body)) {
    errors.push('Missing required section: `## Testing`');
  }
  if (!/(?:^|\r?\n)#{2,3}\s*Related issues?(?:\(s\))?\b/i.test(body)) {
    errors.push('Missing required section: `## Related issue`');
  }

  return { errors, warnings };
}

async function checkLinkedIssues(body) {
  const result = await validatePrTemplate(body);
  return { errors: result.errors, validIssues: result.validIssues };
}

async function updateProjectApprovals(prId, approvalOption) {
  try {
    const projectQuery = `
      query($prId: ID!) {
        node(id: $prId) {
          ... on PullRequest {
            projectItems(first: 10) {
              nodes {
                id
                project { id }
                approvalsField: fieldValueByName(name: "Approvals Required") {
                  ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
                }
              }
            }
          }
        }
      }
    `;

    const projectData = await graphql(projectQuery, { prId });
    const prNode = projectData?.node;
    let projectItem = prNode?.projectItems?.nodes?.find(item => item.project?.id === projectId);
    let itemId = projectItem?.id;

    if (!itemId) {
      console.log(`PR #${prNumber} is not in Project #6. Adding it...`);
      const addMutation = `
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item { id }
          }
        }
      `;
      const addResult = await graphql(addMutation, { projectId, contentId: prId });
      itemId = addResult?.addProjectV2ItemById?.item?.id;
    }

    if (itemId) {
      const currentOptionId = projectItem?.approvalsField?.optionId;
      if (currentOptionId === approvalOption.id) {
        console.log(`✓ Project #6 "Approvals Required" already set to "${approvalOption.name}". Skipping.`);
      } else {
        console.log(`Updating Project #6 "Approvals Required" to "${approvalOption.name}"...`);
        const updateMutation = `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
            updateProjectV2ItemFieldValue(input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { singleSelectOptionId: $optionId }
            }) {
              projectV2Item { id }
            }
          }
        `;
        await graphql(updateMutation, {
          projectId,
          itemId,
          fieldId: approvalsFieldId,
          optionId: approvalOption.id
        });
        console.log(`✓ Successfully updated "Approvals Required" to "${approvalOption.name}".`);
      }
    }
  } catch (err) {
    console.warn('::warning::Project #6 automation token not configured or lacks permissions. Skipping Approvals Required field update.');
  }
}

async function assignReviewers(pr, requiredApprovals, labels) {
  const authorLogin = pr.author?.login || '';

  // Strictly filter out PR author from maintainer pool
  const eligibleReviewers = MAINTAINER_POOL.filter(
    m => m.toLowerCase() !== authorLogin.toLowerCase()
  );
  const eligibleSet = new Set(eligibleReviewers.map(m => m.toLowerCase()));

  // Collect all assigned review requests and completed reviews
  const rawReviewers = [
    ...(pr.reviewRequests?.nodes || []).map(r => r.requestedReviewer?.login?.toLowerCase()),
    ...(pr.reviews?.nodes || []).map(r => r.author?.login?.toLowerCase())
  ].filter(Boolean);

  // Must NOT treat authorLogin, bots, or arbitrary external commenters as maintainer reviewers
  // Only count reviewers who are in eligibleReviewers (which already excludes authorLogin)
  const currentMaintainerReviewers = new Set(
    rawReviewers.filter(login => eligibleSet.has(login))
  );
  const existingReviewers = currentMaintainerReviewers;

  const neededCount = Math.max(0, requiredApprovals - currentMaintainerReviewers.size);
  console.log(`Eligible maintainer pool (excluding author @${authorLogin}): ${eligibleReviewers.join(', ')}`);
  console.log(`Current maintainer reviewers: ${Array.from(currentMaintainerReviewers).join(', ') || 'none'}. Needed: ${neededCount}`);

  if (neededCount > 0 && !pr.isDraft) {
    // Prioritize candidates not yet assigned
    const unassignedCandidates = eligibleReviewers.filter(
      cand => !currentMaintainerReviewers.has(cand.toLowerCase())
    );

    // Heuristic preference:
    // Backend/Infra/Auth: prioritize Gan0117, leehom22, HoeZhiWan
    // Frontend/Projects: prioritize zping-926, leehom22
    let sortedCandidates = [...unassignedCandidates];
    const isBackendOrInfra = requiredApprovals === 2 || labels.some(l => ['module:infra', 'module:auth'].includes(l));
    if (isBackendOrInfra) {
      sortedCandidates.sort((a, b) => {
        const order = ['Gan0117', 'leehom22', 'HoeZhiWan', 'zping-926'];
        return order.indexOf(a) - order.indexOf(b);
      });
    } else {
      sortedCandidates.sort((a, b) => {
        const order = ['zping-926', 'leehom22', 'Gan0117', 'HoeZhiWan'];
        return order.indexOf(a) - order.indexOf(b);
      });
    }

    const toAssign = sortedCandidates.slice(0, neededCount);
    if (toAssign.length > 0) {
      console.log(`Requesting reviews from: ${toAssign.join(', ')}...`);
      try {
        await request(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`, {
          method: 'POST',
          body: JSON.stringify({ reviewers: toAssign })
        });
        console.log(`✓ Successfully assigned reviewers: ${toAssign.join(', ')}.`);
      } catch (err) {
        console.warn(`::warning::Could not assign reviewers: ${err.message}`);
      }
    }
  }
}

async function run() {
  console.log(`Starting PR quality validation and reviewer assignment for PR #${prNumber} in ${owner}/${repo}...`);

  const query = `
    query($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          id
          title
          body
          isDraft
          author { login }
          labels(first: 30) {
            nodes { name }
          }
          files(first: 100) {
            nodes {
              path
              additions
              deletions
            }
          }
          reviewRequests(first: 20) {
            nodes {
              requestedReviewer {
                ... on User { login }
              }
            }
          }
          reviews(first: 20) {
            nodes {
              author { login }
            }
          }
        }
      }
    }
  `;

  let data;
  try {
    data = await graphql(query, { owner, repo, prNumber });
  } catch (err) {
    console.error(`::error::Failed to query PR details: ${err.message}`);
    process.exit(1);
  }

  const pr = data?.repository?.pullRequest;
  if (!pr) {
    console.error(`::error::PR #${prNumber} not found.`);
    process.exit(1);
  }

  const bodyText = pr.body || '';
  const filePaths = (pr.files?.nodes || []).map(f => f.path);
  const labels = (pr.labels?.nodes || []).map(l => l.name);

  // 1. Validate PR description template & issue references
  const templateValidation = await validatePrTemplate(bodyText);
  const allErrors = [...templateValidation.errors];

  // 2. Modularity check (400-line guideline)
  const lineWarnings = [];
  for (const f of pr.files?.nodes || []) {
    // Check additions as conservative estimate of large files
    if (f.additions > 400 && !/\.json$|\.lock$|package-lock\.json|test|spec|fixtures/i.test(f.path)) {
      lineWarnings.push(`File \`${f.path}\` has ${f.additions} added lines (> 400 line guideline). Consider splitting into smaller modules.`);
    }
  }

  if (lineWarnings.length > 0) {
    for (const warn of lineWarnings) {
      console.warn(`::warning::${warn}`);
    }
  }

  if (allErrors.length > 0) {
    console.error(`::error::PR Quality Gate Failed:\n- ${allErrors.join('\n- ')}`);
    // Fail check if template or issue link is invalid
    process.exit(1);
  }
  console.log('✓ PR description and issue link validation passed.');

  // 3. Determine Required Approvals
  const requiredApprovals = evaluateRisk(filePaths, labels, pr.title);
  const approvalOption = APPROVAL_OPTIONS[requiredApprovals];
  console.log(`Evaluated approval requirement: ${approvalOption.name} (Threshold: ${requiredApprovals})`);

  // 4. Update Project #6 Field: Approvals Required
  await updateProjectApprovals(pr.id, approvalOption);

  // 5. Automatic Reviewer Assignment
  await assignReviewers(pr, requiredApprovals, labels);

  console.log('PR quality verification and reviewer assignment complete.');
}

run().catch(err => {
  console.error(`::error::Unexpected failure during validation/assignment: ${err.message}`);
  process.exit(1);
});

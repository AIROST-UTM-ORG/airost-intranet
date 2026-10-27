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
 *    strictly excluding the PR author and external commenters/bots, with fair randomized selection.
 */

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const projectToken = process.env.PROJECT_AUTOMATION_TOKEN;
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

if (!githubToken) {
  console.error('::error::GITHUB_TOKEN is missing. GITHUB_TOKEN is required for PR validation and reviewer assignment.');
  process.exit(1);
}

if (!owner || !repo || isNaN(prNumber)) {
  console.error(`::error::Missing required params: owner=${owner}, repo=${repo}, prNumber=${prNumber}`);
  process.exit(1);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function request(url, options = {}, authToken = githubToken) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'validate-and-assign-reviewers',
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const errorMsg = typeof body === 'object' && body.message ? body.message : body;
    throw new Error(`HTTP ${res.status}: ${errorMsg}`);
  }
  return body;
}

async function graphql(query, variables = {}, authToken = githubToken) {
  const body = await request('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables })
  }, authToken);

  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors.map(e => e.message).join(' | '));
  }
  return body.data;
}

function evaluateRisk(files, labels, title) {
  const sensitivePatterns = [
    /\.github\/(?:workflows|scripts)\//i,
    /docker/i,
    /nginx/i,
    /server\/(?:passport\.js|app\.js|server\.js)/i,
    /server\/routes\/(?:adminRoutes|auth)/i,
    /server\/middleware\/auth/i,
    /server\/models\//i
  ];

  if (files.some(f => sensitivePatterns.some(p => p.test(f)))) {
    return 2;
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

  if (!/##\s*What changed/i.test(body)) errors.push('Missing required section: `## What changed`');
  if (!/##\s*Why/i.test(body)) errors.push('Missing required section: `## Why`');
  if (!/##\s*Testing/i.test(body)) errors.push('Missing required section: `## Testing`');

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
      const issue = await request(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}`, {}, githubToken);
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

async function updateProjectApprovals(prId, approvalOption) {
  if (!projectToken) {
    console.warn('::warning::PROJECT_AUTOMATION_TOKEN is not configured. Skipping Project #6 Approvals Required field update.');
    return;
  }

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

    const projectData = await graphql(projectQuery, { prId }, projectToken);
    let projectItem = projectData?.node?.projectItems?.nodes?.find(item => item.project?.id === projectId);
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
      const addResult = await graphql(addMutation, { projectId, contentId: prId }, projectToken);
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
        }, projectToken);
        console.log(`✓ Successfully updated "Approvals Required" to "${approvalOption.name}".`);
      }
    }
  } catch (err) {
    console.warn(`::warning::Could not update Project #6 Approvals Required field: ${err.message}`);
  }
}

async function assignReviewers(pr, requiredApprovals, labels) {
  const authorLogin = pr.author?.login || '';

  const eligibleReviewers = MAINTAINER_POOL.filter(
    m => m.toLowerCase() !== authorLogin.toLowerCase()
  );
  const eligibleSet = new Set(eligibleReviewers.map(m => m.toLowerCase()));

  const rawReviewers = [
    ...(pr.reviewRequests?.nodes || []).map(r => r.requestedReviewer?.login?.toLowerCase()),
    ...(pr.reviews?.nodes || []).map(r => r.author?.login?.toLowerCase())
  ].filter(Boolean);

  const currentMaintainerReviewers = new Set(
    rawReviewers.filter(login => eligibleSet.has(login))
  );

  const neededCount = Math.max(0, requiredApprovals - currentMaintainerReviewers.size);
  console.log(`Eligible maintainer pool (excluding author @${authorLogin}): ${eligibleReviewers.join(', ')}`);
  console.log(`Current maintainer reviewers: ${Array.from(currentMaintainerReviewers).join(', ') || 'none'}. Needed: ${neededCount}`);

  if (neededCount > 0 && !pr.isDraft) {
    const unassignedCandidates = eligibleReviewers.filter(
      cand => !currentMaintainerReviewers.has(cand.toLowerCase())
    );
    const shuffledCandidates = shuffle(unassignedCandidates);

    const isBackendOrInfra = requiredApprovals === 2 || labels.some(l => ['module:infra', 'module:auth'].includes(l));
    const domainSpecialists = isBackendOrInfra
      ? ['gan0117', 'leehom22', 'hoezhiwan']
      : ['zping-926', 'leehom22'];

    const sortedCandidates = [...shuffledCandidates].sort((a, b) => {
      const aRank = domainSpecialists.includes(a.toLowerCase()) ? 0 : 1;
      const bRank = domainSpecialists.includes(b.toLowerCase()) ? 0 : 1;
      return aRank - bRank;
    });

    const toAssign = sortedCandidates.slice(0, neededCount);
    if (toAssign.length > 0) {
      console.log(`Requesting reviews from: ${toAssign.join(', ')}...`);
      try {
        await request(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`, {
          method: 'POST',
          body: JSON.stringify({ reviewers: toAssign })
        }, githubToken);
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
    data = await graphql(query, { owner, repo, prNumber }, githubToken);
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
    if (f.additions > 400 && !/\.json$|\.lock$|package-lock\.json|\.md$|test|spec|fixtures/i.test(f.path)) {
      lineWarnings.push(`File \`${f.path}\` has ${f.additions} added lines (> 400 line guideline). Consider splitting into smaller modules.`);
    }
  }

  for (const warn of lineWarnings) {
    console.warn(`::warning::${warn}`);
  }

  if (allErrors.length > 0) {
    console.error(`::error::PR Quality Gate Failed:\n- ${allErrors.join('\n- ')}`);
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

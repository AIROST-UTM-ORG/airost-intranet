#!/usr/bin/env node

/**
 * sync-project-status.js
 *
 * Synchronizes the status of a Pull Request and all linked closing issues
 * to "In review" on GitHub Project #6 (AIROST Intranet).
 */

const token = process.env.PROJECT_AUTOMATION_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const projectId = process.env.PROJECT_ID || 'PVT_kwDOE_DQyc4BoRy3'; // AIROST Intranet (Project #6)
const statusFieldId = process.env.STATUS_FIELD_ID || 'PVTSSF_lADOE_DQyc4BoRy3zhmyoEg';
const inReviewOptionId = process.env.IN_REVIEW_OPTION_ID || '1d8543f0'; // Option ID for "In review"

const owner = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.REPO_NAME || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : null);
const prNumber = parseInt(process.env.PR_NUMBER, 10);

if (!token) {
  console.warn('::warning::No authentication token provided (PROJECT_AUTOMATION_TOKEN, GH_TOKEN, or GITHUB_TOKEN). Skipping project status sync.');
  process.exit(0);
}

if (!owner || !repo || isNaN(prNumber)) {
  console.error(`::error::Missing required repository or PR information: owner=${owner}, repo=${repo}, prNumber=${prNumber}`);
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sync-project-status'
    },
    body: JSON.stringify({ query, variables })
  });

  const body = await res.json();
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors.map(e => e.message).join(' | '));
  }
  return body.data;
}

async function run() {
  console.log(`Starting project status sync for PR #${prNumber} in ${owner}/${repo}...`);

  const query = `
    query($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          id
          isDraft
          projectItems(first: 10) {
            nodes {
              id
              project { id }
            }
          }
          closingIssuesReferences(first: 20) {
            nodes {
              id
              number
              title
              projectItems(first: 10) {
                nodes {
                  id
                  project { id }
                }
              }
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
    console.error(`::error::Failed to query PR and linked issues: ${err.message}`);
    process.exit(1);
  }

  const pr = data?.repository?.pullRequest;
  if (!pr) {
    console.log(`PR #${prNumber} not found.`);
    return;
  }

  if (pr.isDraft) {
    console.log(`PR #${prNumber} is a draft. Skipping status transition to "In review".`);
    return;
  }

  const targets = [];

  // PR target
  const prProjectItem = pr.projectItems?.nodes?.find(item => item.project?.id === projectId);
  targets.push({
    type: 'PR',
    number: prNumber,
    contentId: pr.id,
    itemId: prProjectItem?.id
  });

  // Closing issues targets
  const closingIssues = pr.closingIssuesReferences?.nodes || [];
  for (const issue of closingIssues) {
    const issueProjectItem = issue.projectItems?.nodes?.find(item => item.project?.id === projectId);
    targets.push({
      type: 'Issue',
      number: issue.number,
      contentId: issue.id,
      itemId: issueProjectItem?.id
    });
  }

  console.log(`Found ${targets.length} item(s) to synchronize (1 PR, ${closingIssues.length} closing issue(s)).`);

  for (const target of targets) {
    try {
      let itemId = target.itemId;
      if (!itemId) {
        console.log(`${target.type} #${target.number} is not in Project #6. Adding it...`);
        const addMutation = `
          mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
              item { id }
            }
          }
        `;
        const addResult = await graphql(addMutation, { projectId, contentId: target.contentId });
        itemId = addResult?.addProjectV2ItemById?.item?.id;
      }

      if (itemId) {
        console.log(`Updating ${target.type} #${target.number} (Project Item ${itemId}) to "In review"...`);
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
          fieldId: statusFieldId,
          optionId: inReviewOptionId
        });
        console.log(`✓ Successfully updated ${target.type} #${target.number} to "In review".`);
      }
    } catch (err) {
      console.warn(`::warning::Could not update status for ${target.type} #${target.number}: ${err.message}. If this is a permissions error, verify PROJECT_AUTOMATION_TOKEN secret is configured with org project access.`);
    }
  }

  console.log('Project status sync complete.');
}

run().catch(err => {
  console.error(`::error::Unexpected failure during project status sync: ${err.message}`);
  process.exit(1);
});

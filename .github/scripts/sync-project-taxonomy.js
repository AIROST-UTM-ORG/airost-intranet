#!/usr/bin/env node

/**
 * sync-project-taxonomy.js
 *
 * 1. Automatically infers and applies required labels (phase:*, module:*, type)
 *    to Pull Requests based on conventional commit title scopes and touched file paths.
 * 2. Synchronizes repository labels with GitHub Project #6 (AIROST Intranet)
 *    single-select custom fields:
 *      - "Target Phase" (Phase 2 / Phase 3)
 *      - "Module" (Auth, Members, Projects, Docs, Mobile, Infra)
 */

const token = process.env.PROJECT_AUTOMATION_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const projectId = process.env.PROJECT_ID || 'PVT_kwDOE_DQyc4BoRy3'; // AIROST Intranet (Project #6)

// Project #6 Field & Option IDs
const TARGET_PHASE_FIELD_ID = process.env.TARGET_PHASE_FIELD_ID || 'PVTSSF_lADOE_DQyc4BoRy3zhmyohY';
const PHASE_OPTION_MAP = {
  'phase:2-delivery': { id: '0f7f9d40', name: 'Phase 2 (Delivery)' },
  'phase:3-architecture': { id: '3cccbd9c', name: 'Phase 3 (Architecture)' }
};

const MODULE_FIELD_ID = process.env.MODULE_FIELD_ID || 'PVTSSF_lADOE_DQyc4BoRy3zhmyobA';
const MODULE_OPTION_MAP = {
  'module:auth': { id: 'd2d86b9e', name: 'Auth & Session' },
  'module:members': { id: '7214f20f', name: 'Members' },
  'module:projects': { id: 'b9380959', name: 'Projects' },
  'module:docs': { id: 'a7b03313', name: 'Docs' },
  'module:mobile': { id: 'c546be8d', name: 'Mobile' },
  'module:infra': { id: '107ed7a6', name: 'Infra' }
};

const owner = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.REPO_NAME || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : null);
const itemType = (process.env.ITEM_TYPE || 'pr').toLowerCase(); // 'pr' or 'issue'
const itemNumber = parseInt(process.env.ITEM_NUMBER || process.env.PR_NUMBER || process.env.ISSUE_NUMBER, 10);
const eventAction = process.env.EVENT_ACTION || '';

if (!token) {
  console.warn('::warning::No authentication token provided. Skipping taxonomy sync.');
  process.exit(0);
}

if (!owner || !repo || isNaN(itemNumber)) {
  console.error(`::error::Missing required params: owner=${owner}, repo=${repo}, itemNumber=${itemNumber}, itemType=${itemType}`);
  process.exit(1);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sync-project-taxonomy',
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

function inferLabelsFromMetadata(title, files = []) {
  const inferred = new Set();

  // 1. Module inference from title conventional scope: feat(scope): ...
  const scopeMatch = title.match(/^(?:feat|fix|refactor|docs|test|chore)\(([^)]+)\):/i);
  const scope = (scopeMatch ? scopeMatch[1] : '').toLowerCase();

  if (/auth|session|login|jwt|cookie/i.test(scope)) {
    inferred.add('module:auth');
  } else if (/member|user|profile|directory/i.test(scope)) {
    inferred.add('module:members');
  } else if (/project|task|kanban|board/i.test(scope)) {
    inferred.add('module:projects');
  } else if (/doc|space/i.test(scope)) {
    inferred.add('module:docs');
  } else if (/mobile|responsive|touch/i.test(scope)) {
    inferred.add('module:mobile');
  } else if (/infra|docker|ci|cd|action|deploy|nginx/i.test(scope)) {
    inferred.add('module:infra');
  } else if (/refactor/i.test(scope)) {
    inferred.add('module:refactor');
  }

  // 2. Module inference from changed file paths if not yet inferred
  const hasModule = Array.from(inferred).some(l => l.startsWith('module:'));
  if (!hasModule && files.length > 0) {
    for (const f of files) {
      if (/server\/routes\/auth|server\/middleware\/auth|server\/models\/User/i.test(f)) {
        inferred.add('module:auth');
        break;
      }
      if (/client\/src\/features\/members|server\/routes\/users|server\/controller\/user/i.test(f)) {
        inferred.add('module:members');
        break;
      }
      if (/client\/src\/features\/projects|server\/routes\/project|server\/controller\/project|server\/models\/Project|server\/models\/Task/i.test(f)) {
        inferred.add('module:projects');
        break;
      }
      if (/client\/src\/features\/docs|server\/routes\/doc|server\/controller\/doc|server\/models\/Doc/i.test(f)) {
        inferred.add('module:docs');
        break;
      }
      if (/\.github\/|Dockerfile|docker-compose|nginx/i.test(f)) {
        inferred.add('module:infra');
        break;
      }
    }
  }

  // 3. Phase inference: default to phase:2-delivery unless explicit phase 3 keywords
  if (/phase[- ]?3|architecture/i.test(title)) {
    inferred.add('phase:3-architecture');
  } else {
    inferred.add('phase:2-delivery');
  }

  // 4. Type label inference from prefix
  if (/^fix(?:\([^)]+\))?:/i.test(title)) {
    inferred.add('bug');
  } else if (/^feat(?:\([^)]+\))?:/i.test(title)) {
    inferred.add('enhancement');
  } else if (/^docs(?:\([^)]+\))?:/i.test(title)) {
    inferred.add('documentation');
  }

  return Array.from(inferred);
}

async function addLabelsToIssue(number, labels) {
  if (labels.length === 0) return;
  console.log(`Applying labels to #${number}: ${labels.join(', ')}...`);
  await request(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels })
  });
  console.log(`✓ Labels applied to #${number}.`);
}

async function run() {
  console.log(`Starting taxonomy synchronization for ${itemType.toUpperCase()} #${itemNumber} in ${owner}/${repo}...`);

  let contentId;
  let title = '';
  let labels = [];
  let files = [];
  let projectItem;

  if (itemType === 'pr') {
    const prQuery = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            id
            title
            labels(first: 30) {
              nodes { name }
            }
            files(first: 100) {
              nodes { path }
            }
            projectItems(first: 10) {
              nodes {
                id
                project { id }
                phaseField: fieldValueByName(name: "Target Phase") {
                  ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
                }
                moduleField: fieldValueByName(name: "Module") {
                  ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
                }
              }
            }
          }
        }
      }
    `;

    const data = await graphql(prQuery, { owner, repo, number: itemNumber });
    const pr = data?.repository?.pullRequest;
    if (!pr) {
      console.error(`::error::PR #${itemNumber} not found.`);
      process.exit(1);
    }

    contentId = pr.id;
    title = pr.title;
    labels = (pr.labels?.nodes || []).map(l => l.name);
    files = (pr.files?.nodes || []).map(f => f.path);
    projectItem = pr.projectItems?.nodes?.find(item => item.project?.id === projectId);

    // Auto-infer missing labels for PRs on open, edit, or sync
    if (['opened', 'synchronize', 'reopened', 'edited', ''].includes(eventAction)) {
      const hasPhase = labels.some(l => l.startsWith('phase:'));
      const hasModule = labels.some(l => l.startsWith('module:'));
      const hasType = labels.some(l => ['bug', 'enhancement', 'documentation'].includes(l));

      const inferred = inferLabelsFromMetadata(title, files);
      const toAdd = inferred.filter(candidate => {
        if (candidate.startsWith('phase:') && hasPhase) return false;
        if (candidate.startsWith('module:') && hasModule) return false;
        if (['bug', 'enhancement', 'documentation'].includes(candidate) && hasType) return false;
        return !labels.includes(candidate);
      });

      if (toAdd.length > 0) {
        try {
          await addLabelsToIssue(itemNumber, toAdd);
          labels.push(...toAdd);
        } catch (err) {
          console.warn(`::warning::Failed to auto-apply inferred labels to PR #${itemNumber}: ${err.message}`);
        }
      }
    }
  } else {
    // Issue
    const issueQuery = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
            title
            labels(first: 30) {
              nodes { name }
            }
            projectItems(first: 10) {
              nodes {
                id
                project { id }
                phaseField: fieldValueByName(name: "Target Phase") {
                  ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
                }
                moduleField: fieldValueByName(name: "Module") {
                  ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
                }
              }
            }
          }
        }
      }
    `;

    const data = await graphql(issueQuery, { owner, repo, number: itemNumber });
    const issue = data?.repository?.issue;
    if (!issue) {
      console.error(`::error::Issue #${itemNumber} not found.`);
      process.exit(1);
    }

    contentId = issue.id;
    title = issue.title;
    labels = (issue.labels?.nodes || []).map(l => l.name);
    projectItem = issue.projectItems?.nodes?.find(item => item.project?.id === projectId);
  }

  // Ensure item is added to Project #6
  let itemId = projectItem?.id;
  if (!itemId) {
    console.log(`${itemType.toUpperCase()} #${itemNumber} is not in Project #6. Adding it...`);
    try {
      const addMutation = `
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item { id }
          }
        }
      `;
      const addResult = await graphql(addMutation, { projectId, contentId });
      itemId = addResult?.addProjectV2ItemById?.item?.id;
      console.log(`✓ Added to Project #6 (Item ID: ${itemId}).`);
    } catch (err) {
      console.warn(`::warning::Could not add ${itemType.toUpperCase()} #${itemNumber} to Project #6: ${err.message}`);
      return;
    }
  }

  // 1. Sync Target Phase
  let targetPhaseOption = null;
  for (const label of labels) {
    if (PHASE_OPTION_MAP[label]) {
      targetPhaseOption = PHASE_OPTION_MAP[label];
      break;
    }
  }

  if (targetPhaseOption) {
    const currentOptionId = projectItem?.phaseField?.optionId;
    if (currentOptionId === targetPhaseOption.id) {
      console.log(`✓ Target Phase is already "${targetPhaseOption.name}". Skipping update.`);
    } else {
      console.log(`Updating Target Phase to "${targetPhaseOption.name}"...`);
      try {
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
          fieldId: TARGET_PHASE_FIELD_ID,
          optionId: targetPhaseOption.id
        });
        console.log(`✓ Successfully updated Target Phase to "${targetPhaseOption.name}".`);
      } catch (err) {
        console.warn(`::warning::Failed to update Target Phase on Project #6: ${err.message}`);
      }
    }
  }

  // 2. Sync Module
  let targetModuleOption = null;
  for (const label of labels) {
    if (MODULE_OPTION_MAP[label]) {
      targetModuleOption = MODULE_OPTION_MAP[label];
      break;
    }
  }

  if (targetModuleOption) {
    const currentOptionId = projectItem?.moduleField?.optionId;
    if (currentOptionId === targetModuleOption.id) {
      console.log(`✓ Module is already "${targetModuleOption.name}". Skipping update.`);
    } else {
      console.log(`Updating Module to "${targetModuleOption.name}"...`);
      try {
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
          fieldId: MODULE_FIELD_ID,
          optionId: targetModuleOption.id
        });
        console.log(`✓ Successfully updated Module to "${targetModuleOption.name}".`);
      } catch (err) {
        console.warn(`::warning::Failed to update Module on Project #6: ${err.message}`);
      }
    }
  }

  console.log(`Taxonomy synchronization complete for ${itemType.toUpperCase()} #${itemNumber}.`);
}

run().catch(err => {
  console.error(`::error::Unexpected failure during taxonomy sync: ${err.message}`);
  process.exit(1);
});

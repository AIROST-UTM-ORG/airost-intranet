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

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const projectToken = process.env.PROJECT_AUTOMATION_TOKEN;
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
const eventLabelName = process.env.EVENT_LABEL_NAME || '';

let skipProjectSync = !projectToken;

function isProjectPermissionError(err) {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('resource not accessible') ||
    msg.includes('viewer does not have permission') ||
    msg.includes('not have permission') ||
    msg.includes('insufficient_scopes') ||
    msg.includes('could not resolve to a projectv2') ||
    msg.includes('must have push access to this repository to add items to this project') ||
    (msg.includes('project') && (msg.includes('permission') || msg.includes('access') || msg.includes('forbidden') || msg.includes('scope') || msg.includes('unauthorized')))
  );
}

async function request(url, options = {}, authToken = githubToken) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sync-project-taxonomy',
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

function getModuleFromScope(title) {
  const scopeMatch = title.match(/^(?:feat|fix|refactor|docs|test|chore)\(([^)]+)\):/i);
  const scope = (scopeMatch ? scopeMatch[1] : '').toLowerCase();

  if (/auth|session|login|jwt|cookie/i.test(scope)) return 'module:auth';
  if (/member|user|profile|directory/i.test(scope)) return 'module:members';
  if (/project|task|kanban|board/i.test(scope)) return 'module:projects';
  if (/doc|space/i.test(scope)) return 'module:docs';
  if (/mobile|responsive|touch/i.test(scope)) return 'module:mobile';
  if (/infra|docker|ci|cd|action|deploy|nginx/i.test(scope)) return 'module:infra';
  if (/refactor/i.test(scope)) return 'module:refactor';
  return null;
}

function getModuleForPath(filePath) {
  if (/server\/routes\/auth|server\/middleware\/auth|server\/passport|server\/models\/User|client\/src\/context\/authContext|client\/src\/hooks\/useAuth|client\/src\/pages\/Login/i.test(filePath)) {
    return 'module:auth';
  }
  if (/client\/src\/pages\/(?:Admin|Members)|client\/src\/hooks\/useFetchUsers|server\/routes\/user|server\/controller\/user/i.test(filePath)) {
    return 'module:members';
  }
  if (/client\/src\/pages\/(?:Projects|ProjectTracking)|server\/routes\/project|server\/controller\/project|server\/models\/Project|server\/models\/Task/i.test(filePath)) {
    return 'module:projects';
  }
  if (/client\/src\/pages\/Documentation|server\/routes\/doc|server\/controller\/doc|server\/models\/Doc/i.test(filePath)) {
    return 'module:docs';
  }
  if (/\.github\/|Dockerfile|docker-compose|nginx/i.test(filePath)) {
    return 'module:infra';
  }
  return null;
}

function inferLabelsFromMetadata(title, files = []) {
  const inferred = new Set();

  // 1. Module inference from title conventional scope: feat(scope): ...
  const scopeModule = getModuleFromScope(title);
  if (scopeModule) {
    inferred.add(scopeModule);
  }

  // 2. Module inference from changed file paths across all diffed files
  for (const f of files) {
    const fileModule = getModuleForPath(f);
    if (fileModule) {
      inferred.add(fileModule);
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

function selectProjectModule(labels, title, files = []) {
  const activeModules = labels.filter(l => MODULE_OPTION_MAP[l]);
  if (activeModules.length === 0) return null;
  if (activeModules.length === 1) return MODULE_OPTION_MAP[activeModules[0]];

  // 1. Title conventional scope takes precedence
  const scopeModule = getModuleFromScope(title);
  if (scopeModule && activeModules.includes(scopeModule)) {
    console.log(`Project #6 single-select Module: selected "${MODULE_OPTION_MAP[scopeModule].name}" via title scope precedence.`);
    return MODULE_OPTION_MAP[scopeModule];
  }

  // 2. Module with the most modified files in diff
  if (files.length > 0) {
    const counts = {};
    for (const f of files) {
      const mod = getModuleForPath(f);
      if (mod && activeModules.includes(mod)) {
        counts[mod] = (counts[mod] || 0) + 1;
      }
    }

    let topModule = null;
    let maxCount = 0;
    for (const mod of activeModules) {
      const count = counts[mod] || 0;
      if (count > maxCount) {
        maxCount = count;
        topModule = mod;
      }
    }

    if (topModule && maxCount > 0) {
      console.log(`Project #6 single-select Module: selected "${MODULE_OPTION_MAP[topModule].name}" with ${maxCount} modified files.`);
      return MODULE_OPTION_MAP[topModule];
    }
  }

  // 3. Fallback to first active module in labels
  const fallbackModule = activeModules[0];
  console.log(`Project #6 single-select Module: fell back to "${MODULE_OPTION_MAP[fallbackModule].name}".`);
  return MODULE_OPTION_MAP[fallbackModule];
}

async function addLabelsToIssue(number, labels) {
  if (labels.length === 0) return;
  console.log(`Applying labels to #${number}: ${labels.join(', ')}...`);
  await request(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels })
  }, githubToken);
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
    let data;
    if (skipProjectSync) {
      const basicPrQuery = `
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
            }
          }
        }
      `;
      data = await graphql(basicPrQuery, { owner, repo, number: itemNumber }, githubToken);
    } else {
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

      try {
        data = await graphql(prQuery, { owner, repo, number: itemNumber }, projectToken || githubToken);
      } catch (err) {
        if (isProjectPermissionError(err)) {
          console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
          const fallbackPrQuery = `
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
                }
              }
            }
          `;
          data = await graphql(fallbackPrQuery, { owner, repo, number: itemNumber }, githubToken);
          skipProjectSync = true;
        } else {
          throw err;
        }
      }
    }

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
      const hasType = labels.some(l => ['bug', 'enhancement', 'documentation'].includes(l));

      const inferred = inferLabelsFromMetadata(title, files);
      const toAdd = inferred.filter(candidate => {
        if (candidate.startsWith('phase:') && hasPhase) return false;
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
    if (skipProjectSync) {
      console.log(`Taxonomy synchronization complete (labels only) for ISSUE #${itemNumber}.`);
      process.exit(0);
    }

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

    let data;
    try {
      data = await graphql(issueQuery, { owner, repo, number: itemNumber }, projectToken || githubToken);
    } catch (err) {
      if (isProjectPermissionError(err)) {
        console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
        process.exit(0);
      }
      throw err;
    }

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

  if (skipProjectSync) {
    console.log(`Taxonomy synchronization complete (labels only) for ${itemType.toUpperCase()} #${itemNumber}.`);
    process.exit(0);
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
      const addResult = await graphql(addMutation, { projectId, contentId }, projectToken);
      itemId = addResult?.addProjectV2ItemById?.item?.id;
      if (itemId) {
        console.log(`✓ Added to Project #6 (Item ID: ${itemId}).`);
      }
    } catch (err) {
      if (isProjectPermissionError(err)) {
        console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
        process.exit(0);
      }
      console.warn(`::warning::Could not add ${itemType.toUpperCase()} #${itemNumber} to Project #6: ${err.message}`);
    }

    if (!itemId) {
      console.log(`Attempting to query item ID for ${itemType.toUpperCase()} #${itemNumber} in Project #6...`);
      try {
        const queryItem = `
          query($contentId: ID!) {
            node(id: $contentId) {
              ... on PullRequest {
                projectItems(first: 20) {
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
              ... on Issue {
                projectItems(first: 20) {
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
        const itemData = await graphql(queryItem, { contentId }, projectToken);
        const found = itemData?.node?.projectItems?.nodes?.find(item => item.project?.id === projectId);
        if (found) {
          projectItem = found;
          itemId = found.id;
          console.log(`✓ Located existing Project #6 item ID: ${itemId}`);
        }
      } catch (queryErr) {
        if (isProjectPermissionError(queryErr)) {
          console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
          process.exit(0);
        }
        console.warn(`::warning::Failed to query Project #6 item ID: ${queryErr.message}`);
      }
    }

    if (!itemId) {
      console.warn(`::warning::Could not find or create Project #6 item for ${itemType.toUpperCase()} #${itemNumber}. Skipping custom field sync.`);
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

  const isPhaseUnlabeled = eventAction === 'unlabeled' &&
    (!eventLabelName || eventLabelName.startsWith('phase:') || !!PHASE_OPTION_MAP[eventLabelName]);

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
        }, projectToken);
        console.log(`✓ Successfully updated Target Phase to "${targetPhaseOption.name}".`);
      } catch (err) {
        if (isProjectPermissionError(err)) {
          console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
          process.exit(0);
        }
        console.warn(`::warning::Failed to update Target Phase on Project #6: ${err.message}`);
      }
    }
  } else if (isPhaseUnlabeled) {
    console.log(`Clearing Target Phase on Project #6 (no phase labels remaining)...`);
    try {
      const clearMutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!) {
          clearProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
          }) {
            projectV2Item { id }
          }
        }
      `;
      await graphql(clearMutation, {
        projectId,
        itemId,
        fieldId: TARGET_PHASE_FIELD_ID
      }, projectToken);
      console.log(`✓ Successfully cleared Target Phase on Project #6.`);
    } catch (err) {
      if (isProjectPermissionError(err)) {
        console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
        process.exit(0);
      }
      console.warn(`::warning::Failed to clear Target Phase on Project #6: ${err.message}`);
    }
  }

  // 2. Sync Module using single-select priority rule
  const targetModuleOption = selectProjectModule(labels, title, files);

  const isModuleUnlabeled = eventAction === 'unlabeled' &&
    (!eventLabelName || eventLabelName.startsWith('module:') || !!MODULE_OPTION_MAP[eventLabelName]);

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
        }, projectToken);
        console.log(`✓ Successfully updated Module to "${targetModuleOption.name}".`);
      } catch (err) {
        if (isProjectPermissionError(err)) {
          console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
          process.exit(0);
        }
        console.warn(`::warning::Failed to update Module on Project #6: ${err.message}`);
      }
    }
  } else if (isModuleUnlabeled) {
    console.log(`Clearing Module on Project #6 (no module labels remaining)...`);
    try {
      const clearMutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!) {
          clearProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
          }) {
            projectV2Item { id }
          }
        }
      `;
      await graphql(clearMutation, {
        projectId,
        itemId,
        fieldId: MODULE_FIELD_ID
      }, projectToken);
      console.log(`✓ Successfully cleared Module on Project #6.`);
    } catch (err) {
      if (isProjectPermissionError(err)) {
        console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
        process.exit(0);
      }
      console.warn(`::warning::Failed to clear Module on Project #6: ${err.message}`);
    }
  }

  console.log(`Taxonomy synchronization complete for ${itemType.toUpperCase()} #${itemNumber}.`);
}

if (require.main === module) {
  if (!githubToken) {
    console.error('::error::GITHUB_TOKEN is missing. GITHUB_TOKEN is required for repository label taxonomy synchronization.');
    process.exit(1);
  }

  if (!projectToken) {
    console.log('::notice::PROJECT_AUTOMATION_TOKEN is not configured. Project #6 custom field synchronization will be skipped, but repository labels will be synchronized.');
  }

  if (!owner || !repo || isNaN(itemNumber)) {
    console.error(`::error::Missing required params: owner=${owner}, repo=${repo}, itemNumber=${itemNumber}, itemType=${itemType}`);
    process.exit(1);
  }

  run().catch(err => {
    if (isProjectPermissionError(err)) {
      console.log('::notice::Project #6 automation token lacks project permissions. Skipping custom field sync.');
      process.exit(0);
    }
    console.error(`::error::Unexpected failure during taxonomy sync: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  getModuleFromScope,
  getModuleForPath,
  inferLabelsFromMetadata,
  selectProjectModule,
  PHASE_OPTION_MAP,
  MODULE_OPTION_MAP
};

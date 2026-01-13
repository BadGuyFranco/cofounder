#!/usr/bin/env node
/**
 * Google Cloud Management Operations
 * Manage projects, APIs, deployments, and infrastructure.
 * 
 * Usage:
 *   node cloud.js projects --account user@example.com
 *   node cloud.js apis list --account user@example.com
 *   node cloud.js api-keys create --name "My Key" --account user@example.com
 */

import { google } from 'googleapis';
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi,
  getMissingApis
} from './utils.js';

// API requirements for each command group
const API_REQUIREMENTS = {
  projects: ['resource_manager'],
  apis: ['service_usage'],
  'api-keys': ['api_keys'],
  iam: ['iam'],
  run: ['cloud_run'],
  functions: ['cloud_functions'],
  'app-engine': ['app_engine'],
  build: ['cloud_build']
};

/**
 * Get Cloud Resource Manager API instance
 */
async function getResourceManagerApi(email) {
  const auth = await getAuthClient(email);
  return google.cloudresourcemanager({ version: 'v3', auth });
}

/**
 * Get Service Usage API instance
 */
async function getServiceUsageApi(email) {
  const auth = await getAuthClient(email);
  return google.serviceusage({ version: 'v1', auth });
}

/**
 * Get API Keys API instance
 */
async function getApiKeysApi(email) {
  const auth = await getAuthClient(email);
  return google.apikeys({ version: 'v2', auth });
}

/**
 * Get IAM API instance
 */
async function getIamApi(email) {
  const auth = await getAuthClient(email);
  return google.iam({ version: 'v1', auth });
}

/**
 * Get Cloud Run API instance
 */
async function getCloudRunApi(email) {
  const auth = await getAuthClient(email);
  return google.run({ version: 'v2', auth });
}

/**
 * Get Cloud Functions API instance
 */
async function getCloudFunctionsApi(email) {
  const auth = await getAuthClient(email);
  return google.cloudfunctions({ version: 'v2', auth });
}

/**
 * Get Cloud Build API instance
 */
async function getCloudBuildApi(email) {
  const auth = await getAuthClient(email);
  return google.cloudbuild({ version: 'v1', auth });
}

// ==================== PROJECTS ====================

/**
 * List projects
 */
async function listProjects(email) {
  const resourceManager = await getResourceManagerApi(email);
  
  const response = await resourceManager.projects.search();
  
  return (response.data.projects || []).map(project => ({
    projectId: project.projectId,
    name: project.displayName,
    state: project.state,
    createTime: project.createTime,
    parent: project.parent
  }));
}

/**
 * Get project details
 */
async function getProject(email, projectId) {
  const resourceManager = await getResourceManagerApi(email);
  
  const response = await resourceManager.projects.get({
    name: `projects/${projectId}`
  });
  
  return response.data;
}

/**
 * Create a new project
 */
async function createProject(email, projectId, displayName) {
  const resourceManager = await getResourceManagerApi(email);
  
  const response = await resourceManager.projects.create({
    requestBody: {
      projectId,
      displayName: displayName || projectId
    }
  });
  
  return response.data;
}

// ==================== SERVICE USAGE (APIs) ====================

/**
 * List enabled APIs for a project
 */
async function listEnabledApis(email, projectId) {
  const serviceUsage = await getServiceUsageApi(email);
  
  const response = await serviceUsage.services.list({
    parent: `projects/${projectId}`,
    filter: 'state:ENABLED'
  });
  
  return (response.data.services || []).map(service => ({
    name: service.name.split('/').pop(),
    title: service.config?.title,
    state: service.state
  }));
}

/**
 * Enable an API for a project
 */
async function enableApi(email, projectId, apiName) {
  const serviceUsage = await getServiceUsageApi(email);
  
  // Normalize API name
  const serviceName = apiName.endsWith('.googleapis.com') 
    ? apiName 
    : `${apiName}.googleapis.com`;
  
  const response = await serviceUsage.services.enable({
    name: `projects/${projectId}/services/${serviceName}`
  });
  
  return {
    api: serviceName,
    enabled: true,
    operation: response.data.name
  };
}

/**
 * Disable an API for a project
 */
async function disableApi(email, projectId, apiName) {
  const serviceUsage = await getServiceUsageApi(email);
  
  const serviceName = apiName.endsWith('.googleapis.com') 
    ? apiName 
    : `${apiName}.googleapis.com`;
  
  const response = await serviceUsage.services.disable({
    name: `projects/${projectId}/services/${serviceName}`
  });
  
  return {
    api: serviceName,
    disabled: true,
    operation: response.data.name
  };
}

// ==================== API KEYS ====================

/**
 * List API keys for a project
 */
async function listApiKeys(email, projectId) {
  const apiKeys = await getApiKeysApi(email);
  
  const response = await apiKeys.projects.locations.keys.list({
    parent: `projects/${projectId}/locations/global`
  });
  
  return (response.data.keys || []).map(key => ({
    name: key.name.split('/').pop(),
    displayName: key.displayName,
    createTime: key.createTime,
    restrictions: key.restrictions
  }));
}

/**
 * Create an API key
 */
async function createApiKey(email, projectId, displayName, restrictions = null) {
  const apiKeys = await getApiKeysApi(email);
  
  const requestBody = {
    displayName
  };
  
  if (restrictions) {
    requestBody.restrictions = restrictions;
  }
  
  const response = await apiKeys.projects.locations.keys.create({
    parent: `projects/${projectId}/locations/global`,
    requestBody
  });
  
  return response.data;
}

/**
 * Get API key string (the actual key value)
 */
async function getApiKeyString(email, keyName) {
  const apiKeys = await getApiKeysApi(email);
  
  const response = await apiKeys.projects.locations.keys.getKeyString({
    name: keyName
  });
  
  return response.data.keyString;
}

/**
 * Delete an API key
 */
async function deleteApiKey(email, keyName) {
  const apiKeys = await getApiKeysApi(email);
  
  const response = await apiKeys.projects.locations.keys.delete({
    name: keyName
  });
  
  return {
    deleted: true,
    operation: response.data.name
  };
}

// ==================== IAM ====================

/**
 * List service accounts for a project
 */
async function listServiceAccounts(email, projectId) {
  const iam = await getIamApi(email);
  
  const response = await iam.projects.serviceAccounts.list({
    name: `projects/${projectId}`
  });
  
  return (response.data.accounts || []).map(account => ({
    email: account.email,
    displayName: account.displayName,
    disabled: account.disabled || false,
    uniqueId: account.uniqueId
  }));
}

/**
 * Create a service account
 */
async function createServiceAccount(email, projectId, accountId, displayName) {
  const iam = await getIamApi(email);
  
  const response = await iam.projects.serviceAccounts.create({
    name: `projects/${projectId}`,
    requestBody: {
      accountId,
      serviceAccount: {
        displayName
      }
    }
  });
  
  return {
    email: response.data.email,
    displayName: response.data.displayName,
    uniqueId: response.data.uniqueId
  };
}

/**
 * Create a service account key
 */
async function createServiceAccountKey(email, serviceAccountEmail) {
  const iam = await getIamApi(email);
  
  const response = await iam.projects.serviceAccounts.keys.create({
    name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
    requestBody: {
      keyAlgorithm: 'KEY_ALG_RSA_2048'
    }
  });
  
  // The key data is base64 encoded
  const keyData = JSON.parse(
    Buffer.from(response.data.privateKeyData, 'base64').toString()
  );
  
  return {
    keyId: response.data.name.split('/').pop(),
    keyData
  };
}

// ==================== CLOUD RUN ====================

/**
 * List Cloud Run services
 */
async function listCloudRunServices(email, projectId, region = 'us-central1') {
  const run = await getCloudRunApi(email);
  
  const response = await run.projects.locations.services.list({
    parent: `projects/${projectId}/locations/${region}`
  });
  
  return (response.data.services || []).map(service => ({
    name: service.name.split('/').pop(),
    url: service.uri,
    latestRevision: service.latestReadyRevision,
    traffic: service.traffic,
    createTime: service.createTime
  }));
}

/**
 * Get Cloud Run service details
 */
async function getCloudRunService(email, projectId, serviceName, region = 'us-central1') {
  const run = await getCloudRunApi(email);
  
  const response = await run.projects.locations.services.get({
    name: `projects/${projectId}/locations/${region}/services/${serviceName}`
  });
  
  return response.data;
}

// ==================== CLOUD FUNCTIONS ====================

/**
 * List Cloud Functions
 */
async function listCloudFunctions(email, projectId, region = '-') {
  const functions = await getCloudFunctionsApi(email);
  
  const response = await functions.projects.locations.functions.list({
    parent: `projects/${projectId}/locations/${region}`
  });
  
  return (response.data.functions || []).map(fn => ({
    name: fn.name.split('/').pop(),
    state: fn.state,
    runtime: fn.buildConfig?.runtime,
    entryPoint: fn.buildConfig?.entryPoint,
    url: fn.serviceConfig?.uri
  }));
}

// ==================== CLOUD BUILD ====================

/**
 * List recent builds
 */
async function listBuilds(email, projectId, limit = 10) {
  const build = await getCloudBuildApi(email);
  
  const response = await build.projects.builds.list({
    projectId,
    pageSize: limit
  });
  
  return (response.data.builds || []).map(b => ({
    id: b.id,
    status: b.status,
    source: b.source?.storageSource?.bucket,
    createTime: b.createTime,
    finishTime: b.finishTime,
    images: b.images
  }));
}

// ==================== CLI ====================

function printHelp() {
  showHelp('Google Cloud Management Operations', {
    'Project Commands': [
      'projects                    List your Google Cloud projects',
      'project PROJECT_ID          Get project details',
      'create-project ID [NAME]    Create a new project'
    ],
    'API Management': [
      'apis list                   List enabled APIs for a project',
      'apis enable API_NAME        Enable an API',
      'apis disable API_NAME       Disable an API'
    ],
    'API Key Management': [
      'api-keys list               List API keys',
      'api-keys create NAME        Create a new API key',
      'api-keys get KEY_NAME       Get the key string value',
      'api-keys delete KEY_NAME    Delete an API key'
    ],
    'IAM Commands': [
      'service-accounts            List service accounts',
      'create-sa ID NAME           Create service account',
      'create-sa-key EMAIL         Create service account key'
    ],
    'Cloud Run': [
      'run list                    List Cloud Run services',
      'run get SERVICE_NAME        Get service details'
    ],
    'Cloud Functions': [
      'functions list              List Cloud Functions'
    ],
    'Cloud Build': [
      'builds list                 List recent builds'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--project PROJECT_ID        Google Cloud project ID',
      '--region REGION             Region (default: us-central1)',
      '--json                      Output as JSON'
    ],
    'Examples': [
      'node cloud.js projects --account user@example.com',
      'node cloud.js apis list --project my-project --account user@example.com',
      'node cloud.js apis enable drive --project my-project --account user@example.com',
      'node cloud.js api-keys create "My App Key" --project my-project --account user@example.com',
      'node cloud.js run list --project my-project --region us-east1 --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  const email = flags.account;
  const projectId = flags.project;
  const region = flags.region || 'us-central1';
  
  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }
  
  // Check API requirements for the command
  if (command !== 'help') {
    const cmdGroup = command.split('-')[0]; // e.g., "api-keys" -> "api"
    const requirements = API_REQUIREMENTS[command] || API_REQUIREMENTS[cmdGroup];
    
    if (requirements) {
      const missing = getMissingApis(email, requirements);
      if (missing.length > 0) {
        console.error(`\nError: Required API(s) not enabled: ${missing.join(', ')}`);
        console.error(`\nTo enable:`);
        console.error(`  node auth.js configure-apis --account ${email} --apis "+${missing.join(',+')}"`);
        process.exit(1);
      }
    }
  }
  
  try {
    switch (command) {
      // Projects
      case 'projects': {
        const projects = await listProjects(email);
        if (flags.json) {
          output(projects);
        } else {
          console.log(`\nYour Google Cloud Projects (${projects.length}):\n`);
          for (const p of projects) {
            console.log(`  ${p.projectId}`);
            console.log(`    Name: ${p.name || p.projectId}`);
            console.log(`    State: ${p.state}`);
          }
        }
        break;
      }
      
      case 'project': {
        if (!args[0]) throw new Error('PROJECT_ID required');
        const project = await getProject(email, args[0]);
        output(project);
        break;
      }
      
      case 'create-project': {
        if (!args[0]) throw new Error('PROJECT_ID required');
        console.log(`Creating project: ${args[0]}...`);
        const result = await createProject(email, args[0], args[1]);
        console.log(`\n✓ Project creation initiated`);
        console.log(`  Operation: ${result.name}`);
        break;
      }
      
      // APIs
      case 'apis': {
        const subCmd = args[0];
        if (!projectId && subCmd !== 'help') {
          throw new Error('--project is required for API commands');
        }
        
        switch (subCmd) {
          case 'list': {
            const apis = await listEnabledApis(email, projectId);
            if (flags.json) {
              output(apis);
            } else {
              console.log(`\nEnabled APIs for ${projectId} (${apis.length}):\n`);
              for (const api of apis) {
                console.log(`  ${api.name}`);
                if (api.title) console.log(`    ${api.title}`);
              }
            }
            break;
          }
          case 'enable': {
            if (!args[1]) throw new Error('API name required');
            const result = await enableApi(email, projectId, args[1]);
            console.log(`\n✓ Enabled: ${result.api}`);
            break;
          }
          case 'disable': {
            if (!args[1]) throw new Error('API name required');
            const result = await disableApi(email, projectId, args[1]);
            console.log(`\n✓ Disabled: ${result.api}`);
            break;
          }
          default:
            console.log('Usage: node cloud.js apis [list|enable|disable] --project PROJECT_ID');
        }
        break;
      }
      
      // API Keys
      case 'api-keys': {
        const subCmd = args[0];
        if (!projectId && subCmd !== 'help') {
          throw new Error('--project is required for API key commands');
        }
        
        switch (subCmd) {
          case 'list': {
            const keys = await listApiKeys(email, projectId);
            if (flags.json) {
              output(keys);
            } else {
              console.log(`\nAPI Keys for ${projectId} (${keys.length}):\n`);
              for (const key of keys) {
                console.log(`  ${key.displayName || key.name}`);
                console.log(`    Name: ${key.name}`);
                console.log(`    Created: ${key.createTime}`);
              }
            }
            break;
          }
          case 'create': {
            if (!args[1]) throw new Error('Key display name required');
            console.log(`Creating API key: ${args[1]}...`);
            const result = await createApiKey(email, projectId, args[1]);
            console.log(`\n✓ API key creation initiated`);
            console.log(`  Operation: ${result.name}`);
            break;
          }
          case 'get': {
            if (!args[1]) throw new Error('Key name required');
            const keyString = await getApiKeyString(email, args[1]);
            console.log(`\nAPI Key Value:\n${keyString}`);
            break;
          }
          case 'delete': {
            if (!args[1]) throw new Error('Key name required');
            await deleteApiKey(email, args[1]);
            console.log(`\n✓ API key deleted`);
            break;
          }
          default:
            console.log('Usage: node cloud.js api-keys [list|create|get|delete] --project PROJECT_ID');
        }
        break;
      }
      
      // Service Accounts
      case 'service-accounts': {
        if (!projectId) throw new Error('--project is required');
        const accounts = await listServiceAccounts(email, projectId);
        if (flags.json) {
          output(accounts);
        } else {
          console.log(`\nService Accounts for ${projectId} (${accounts.length}):\n`);
          for (const sa of accounts) {
            console.log(`  ${sa.email}`);
            if (sa.displayName) console.log(`    Name: ${sa.displayName}`);
            if (sa.disabled) console.log(`    (DISABLED)`);
          }
        }
        break;
      }
      
      case 'create-sa': {
        if (!projectId) throw new Error('--project is required');
        if (!args[0]) throw new Error('Account ID required');
        if (!args[1]) throw new Error('Display name required');
        const sa = await createServiceAccount(email, projectId, args[0], args[1]);
        console.log(`\n✓ Service account created`);
        console.log(`  Email: ${sa.email}`);
        break;
      }
      
      case 'create-sa-key': {
        if (!args[0]) throw new Error('Service account email required');
        console.log(`Creating key for ${args[0]}...`);
        const key = await createServiceAccountKey(email, args[0]);
        console.log(`\n✓ Key created: ${key.keyId}`);
        console.log(`\nKey data (save this securely, it cannot be retrieved again):`);
        output(key.keyData);
        break;
      }
      
      // Cloud Run
      case 'run': {
        const subCmd = args[0];
        if (!projectId && subCmd !== 'help') {
          throw new Error('--project is required for Cloud Run commands');
        }
        
        switch (subCmd) {
          case 'list': {
            const services = await listCloudRunServices(email, projectId, region);
            if (flags.json) {
              output(services);
            } else {
              console.log(`\nCloud Run Services in ${projectId}/${region} (${services.length}):\n`);
              for (const svc of services) {
                console.log(`  ${svc.name}`);
                console.log(`    URL: ${svc.url}`);
                console.log(`    Revision: ${svc.latestRevision}`);
              }
            }
            break;
          }
          case 'get': {
            if (!args[1]) throw new Error('Service name required');
            const service = await getCloudRunService(email, projectId, args[1], region);
            output(service);
            break;
          }
          default:
            console.log('Usage: node cloud.js run [list|get] --project PROJECT_ID --region REGION');
        }
        break;
      }
      
      // Cloud Functions
      case 'functions': {
        const subCmd = args[0];
        if (!projectId && subCmd !== 'help') {
          throw new Error('--project is required for Cloud Functions commands');
        }
        
        switch (subCmd) {
          case 'list': {
            const functions = await listCloudFunctions(email, projectId, region);
            if (flags.json) {
              output(functions);
            } else {
              console.log(`\nCloud Functions in ${projectId} (${functions.length}):\n`);
              for (const fn of functions) {
                console.log(`  ${fn.name}`);
                console.log(`    Runtime: ${fn.runtime}`);
                console.log(`    State: ${fn.state}`);
                if (fn.url) console.log(`    URL: ${fn.url}`);
              }
            }
            break;
          }
          default:
            console.log('Usage: node cloud.js functions list --project PROJECT_ID');
        }
        break;
      }
      
      // Cloud Build
      case 'builds': {
        const subCmd = args[0];
        if (!projectId && subCmd !== 'help') {
          throw new Error('--project is required for Cloud Build commands');
        }
        
        switch (subCmd) {
          case 'list': {
            const builds = await listBuilds(email, projectId);
            if (flags.json) {
              output(builds);
            } else {
              console.log(`\nRecent Builds in ${projectId}:\n`);
              for (const b of builds) {
                console.log(`  ${b.id.slice(0, 8)}... - ${b.status}`);
                console.log(`    Created: ${b.createTime}`);
                if (b.images?.length) console.log(`    Images: ${b.images.join(', ')}`);
              }
            }
            break;
          }
          default:
            console.log('Usage: node cloud.js builds list --project PROJECT_ID');
        }
        break;
      }
      
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();

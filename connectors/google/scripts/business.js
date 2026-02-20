#!/usr/bin/env node
/**
 * Google Business Profile (My Business) Operations
 * Manage business listings, respond to reviews, and post updates.
 *
 * Usage:
 *   node business.js accounts --account user@example.com
 *   node business.js locations --account-name accounts/123 --account user@example.com
 *   node business.js reviews --location accounts/123/locations/456 --account user@example.com
 *   node business.js reply --review REVIEW_NAME --reply "Thank you!" --account user@example.com
 *   node business.js posts --location accounts/123/locations/456 --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

// Business Profile API base URLs (current v1 APIs)
const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4';
const POSTS_BASE = 'https://mybusiness.googleapis.com/v4';

/**
 * Get Bearer token for the account
 */
async function getToken(email) {
  const auth = await getAuthClient(email);
  const tokenResponse = await auth.getAccessToken();
  return tokenResponse.token;
}

/**
 * Authenticated fetch helper
 */
async function bfetch(url, token, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) return { success: true };

  const text = await response.text();
  if (!text) return {};

  const data = JSON.parse(text);

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  return data;
}

/**
 * List Business Profile accounts
 */
async function listAccounts(email) {
  const token = await getToken(email);
  const data = await bfetch(`${ACCOUNT_MGMT_BASE}/accounts`, token);
  return (data.accounts || []).map(a => ({
    name: a.name,
    accountName: a.accountName,
    type: a.type,
    state: a.accountState?.status,
    role: a.role
  }));
}

/**
 * List locations for an account
 */
async function listLocations(email, accountName) {
  const token = await getToken(email);
  const data = await bfetch(
    `${BUSINESS_INFO_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,categories,profile`,
    token
  );
  return (data.locations || []).map(l => ({
    name: l.name,
    title: l.title,
    address: l.storefrontAddress
      ? [
          l.storefrontAddress.addressLines?.join(', '),
          l.storefrontAddress.locality,
          l.storefrontAddress.administrativeArea,
          l.storefrontAddress.postalCode,
          l.storefrontAddress.regionCode
        ].filter(Boolean).join(', ')
      : null,
    website: l.websiteUri,
    phone: l.phoneNumbers?.primaryPhone,
    categories: l.categories?.primaryCategory?.displayName
  }));
}

/**
 * Get location details
 */
async function getLocation(email, locationName) {
  const token = await getToken(email);
  const data = await bfetch(
    `${BUSINESS_INFO_BASE}/${locationName}?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,categories,profile,metadata`,
    token
  );
  return data;
}

/**
 * List reviews for a location
 */
async function listReviews(email, locationName, options = {}) {
  const token = await getToken(email);
  const pageSize = options.limit || 20;
  const data = await bfetch(
    `${REVIEWS_BASE}/${locationName}/reviews?pageSize=${pageSize}`,
    token
  );

  return {
    averageRating: data.averageRating,
    totalReviewCount: data.totalReviewCount,
    reviews: (data.reviews || []).map(r => ({
      name: r.name,
      reviewer: r.reviewer?.displayName,
      rating: r.starRating,
      comment: r.comment,
      createTime: r.createTime,
      updateTime: r.updateTime,
      reply: r.reviewReply ? {
        comment: r.reviewReply.comment,
        updateTime: r.reviewReply.updateTime
      } : null
    }))
  };
}

/**
 * Reply to a review
 */
async function replyToReview(email, reviewName, replyText) {
  const token = await getToken(email);
  const data = await bfetch(
    `${REVIEWS_BASE}/${reviewName}/reply`,
    token,
    { method: 'PUT', body: { comment: replyText } }
  );
  return { success: true, comment: data.comment };
}

/**
 * Delete a review reply
 */
async function deleteReply(email, reviewName) {
  const token = await getToken(email);
  await bfetch(`${REVIEWS_BASE}/${reviewName}/reply`, token, { method: 'DELETE' });
  return { success: true };
}

/**
 * List local posts for a location
 */
async function listPosts(email, locationName, options = {}) {
  const token = await getToken(email);
  const data = await bfetch(
    `${POSTS_BASE}/${locationName}/localPosts?pageSize=${options.limit || 20}`,
    token
  );
  return (data.localPosts || []).map(p => ({
    name: p.name,
    state: p.state,
    topicType: p.topicType,
    summary: p.summary,
    createTime: p.createTime,
    updateTime: p.updateTime,
    searchUrl: p.searchUrl,
    callToAction: p.callToAction
  }));
}

/**
 * Create a local post
 */
async function createPost(email, locationName, options = {}) {
  const token = await getToken(email);

  const post = {
    topicType: options.type || 'STANDARD',
    summary: options.summary
  };

  if (options.url) {
    post.callToAction = {
      actionType: options.action || 'LEARN_MORE',
      url: options.url
    };
  }

  if (options.eventTitle) {
    post.topicType = 'EVENT';
    post.event = {
      title: options.eventTitle,
      schedule: {
        startDate: options.eventStart ? parseDate(options.eventStart) : undefined,
        endDate: options.eventEnd ? parseDate(options.eventEnd) : undefined
      }
    };
  }

  if (options.offerTitle) {
    post.topicType = 'OFFER';
    post.offer = {
      couponCode: options.offerCode,
      redeemOnlineUrl: options.offerUrl,
      termsConditions: options.offerTerms
    };
  }

  const data = await bfetch(`${POSTS_BASE}/${locationName}/localPosts`, token, {
    method: 'POST',
    body: post
  });

  return {
    name: data.name,
    state: data.state,
    summary: data.summary,
    createTime: data.createTime
  };
}

/**
 * Delete a local post
 */
async function deletePost(email, postName) {
  const token = await getToken(email);
  await bfetch(`${POSTS_BASE}/${postName}`, token, { method: 'DELETE' });
  return { success: true };
}

function parseDate(dateStr) {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// CLI
function printHelp() {
  showHelp('Google Business Profile Operations', {
    'Commands': [
      'accounts                    List Business Profile accounts',
      'locations                   List locations for an account',
      'location LOCATION_NAME      Get details for a specific location',
      'reviews                     List reviews for a location',
      'reply                       Reply to a review',
      'delete-reply                Delete a review reply',
      'posts                       List local posts for a location',
      'create-post                 Create a local post',
      'delete-post                 Delete a local post',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--account-name NAME         Business account resource name (e.g. accounts/123)',
      '--location NAME             Location resource name (e.g. accounts/123/locations/456)',
      '--review NAME               Review resource name',
      '--reply TEXT                Reply text for review',
      '--summary TEXT              Post summary text',
      '--url URL                   Call-to-action URL',
      '--action TYPE               CTA type: LEARN_MORE, BOOK, ORDER, SHOP, SIGN_UP, CALL (default: LEARN_MORE)',
      '--event-title TEXT          Event title (makes post type EVENT)',
      '--event-start DATE          Event start date YYYY-MM-DD',
      '--event-end DATE            Event end date YYYY-MM-DD',
      '--offer-title TEXT          Offer title (makes post type OFFER)',
      '--offer-code CODE           Offer coupon code',
      '--limit N                   Max results',
      '--json                      Output as JSON'
    ],
    'Examples': [
      'node business.js accounts --account user@example.com',
      'node business.js locations --account-name accounts/123456 --account user@example.com',
      'node business.js reviews --location accounts/123/locations/456 --account user@example.com',
      'node business.js reply --review accounts/123/locations/456/reviews/abc --reply "Thank you for your feedback!" --account user@example.com',
      'node business.js posts --location accounts/123/locations/456 --account user@example.com',
      'node business.js create-post --location accounts/123/locations/456 --summary "Check out our new products!" --url https://example.com --account user@example.com'
    ],
    'Finding Resource Names': [
      'Run: node business.js accounts --account user@example.com',
      'Then: node business.js locations --account-name accounts/YOUR_ID --account user@example.com',
      'The name field in each result is the resource name to use with other commands'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  const email = flags.account;

  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (command !== 'help') {
    requireApi(email, 'my_business', 'business.js');
  }

  try {
    switch (command) {
      case 'accounts': {
        const accounts = await listAccounts(email);
        if (flags.json) {
          output(accounts);
        } else {
          console.log(`\nBusiness Accounts (${accounts.length}):\n`);
          for (const a of accounts) {
            console.log(`  ${a.accountName}`);
            console.log(`    Name: ${a.name}`);
            console.log(`    Type: ${a.type}  Role: ${a.role}  State: ${a.state}`);
            console.log('');
          }
        }
        break;
      }

      case 'locations': {
        if (!flags['account-name']) throw new Error('--account-name required (e.g. accounts/123456)');
        const locations = await listLocations(email, flags['account-name']);
        if (flags.json) {
          output(locations);
        } else {
          console.log(`\nLocations (${locations.length}):\n`);
          for (const l of locations) {
            console.log(`  ${l.title}`);
            console.log(`    Name: ${l.name}`);
            if (l.address) console.log(`    Address: ${l.address}`);
            if (l.website) console.log(`    Website: ${l.website}`);
            if (l.phone) console.log(`    Phone: ${l.phone}`);
            console.log('');
          }
        }
        break;
      }

      case 'location': {
        if (!args[0] && !flags.location) throw new Error('Location resource name required');
        const loc = await getLocation(email, args[0] || flags.location);
        output(loc);
        break;
      }

      case 'reviews': {
        if (!flags.location) throw new Error('--location required');
        const result = await listReviews(email, flags.location, { limit: flags.limit });
        if (flags.json) {
          output(result);
        } else {
          console.log(`\nReviews for location:`);
          console.log(`  Average rating: ${result.averageRating}  Total: ${result.totalReviewCount}\n`);
          for (const r of result.reviews) {
            console.log(`  [${r.rating}] ${r.reviewer || 'Anonymous'}`);
            if (r.comment) console.log(`    "${r.comment.slice(0, 150)}${r.comment.length > 150 ? '...' : ''}"`);
            if (r.reply) console.log(`    Reply: "${r.reply.comment.slice(0, 100)}..."`);
            console.log(`    Name: ${r.name}`);
            console.log('');
          }
        }
        break;
      }

      case 'reply': {
        if (!flags.review) throw new Error('--review resource name required');
        if (!flags.reply) throw new Error('--reply text required');
        const result = await replyToReview(email, flags.review, flags.reply);
        console.log(`\n✓ Reply posted`);
        break;
      }

      case 'delete-reply': {
        if (!flags.review) throw new Error('--review resource name required');
        await deleteReply(email, flags.review);
        console.log(`\n✓ Reply deleted`);
        break;
      }

      case 'posts': {
        if (!flags.location) throw new Error('--location required');
        const posts = await listPosts(email, flags.location, { limit: flags.limit });
        if (flags.json) {
          output(posts);
        } else {
          console.log(`\nLocal Posts (${posts.length}):\n`);
          for (const p of posts) {
            console.log(`  [${p.topicType}] ${p.summary?.slice(0, 80) || '(no text)'}`);
            console.log(`    State: ${p.state}  Created: ${p.createTime}`);
            if (p.callToAction) console.log(`    CTA: ${p.callToAction.actionType} -> ${p.callToAction.url}`);
            console.log(`    Name: ${p.name}`);
            console.log('');
          }
        }
        break;
      }

      case 'create-post': {
        if (!flags.location) throw new Error('--location required');
        if (!flags.summary) throw new Error('--summary required');
        const post = await createPost(email, flags.location, {
          summary: flags.summary,
          url: flags.url,
          action: flags.action,
          type: flags.type,
          eventTitle: flags['event-title'],
          eventStart: flags['event-start'],
          eventEnd: flags['event-end'],
          offerTitle: flags['offer-title'],
          offerCode: flags['offer-code'],
          offerUrl: flags['offer-url']
        });
        console.log(`\n✓ Post created`);
        console.log(`  Name: ${post.name}`);
        console.log(`  State: ${post.state}`);
        break;
      }

      case 'delete-post': {
        if (!args[0] && !flags.post) throw new Error('Post resource name required');
        await deletePost(email, args[0] || flags.post);
        console.log(`\n✓ Post deleted`);
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

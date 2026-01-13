#!/usr/bin/env node
/**
 * Cloudflare Waiting Room Script
 * Manage waiting rooms for traffic management.
 */

import { parseArgs, apiRequest, fetchAllPages, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Waiting Room Script - Manage Cloudflare Waiting Rooms

Usage: node scripts/waiting-room.js <command> [options]

Commands:
  list <zone>                     List all waiting rooms
  create <zone>                   Create a waiting room
  update <zone> <room-id>         Update a waiting room
  delete <zone> <room-id>         Delete a waiting room
  info <zone> <room-id>           Get waiting room details
  status <zone> <room-id>         Get current waiting room status
  events <zone> <room-id>         List events for a waiting room
  help                            Show this help

Create/Update Options:
  --name <name>                   Waiting room name
  --host <host>                   Hostname (e.g., example.com)
  --path <path>                   Path to protect (default: /)
  --total-users <n>               Total active users allowed
  --new-users-per-minute <n>      New users allowed per minute
  --session-duration <minutes>    Session duration (default: 5)
  --queue-all                     Queue all traffic (even under threshold)
  --disable-session-renewal       Disable session renewal
  --suspended                     Suspend the waiting room

Examples:
  node scripts/waiting-room.js list example.com
  node scripts/waiting-room.js create example.com --name "Checkout" --host example.com --path /checkout --total-users 500 --new-users-per-minute 200
  node scripts/waiting-room.js status example.com abc123
  node scripts/waiting-room.js update example.com abc123 --total-users 1000
  node scripts/waiting-room.js delete example.com abc123

Note: Waiting Room is a paid feature. Check your plan for availability.
`);
}

async function listWaitingRooms(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const rooms = await fetchAllPages(`/zones/${zoneId}/waiting_rooms`);
  
  const simplified = rooms.map(r => ({
    id: r.id,
    name: r.name,
    host: r.host,
    path: r.path,
    total_active_users: r.total_active_users,
    new_users_per_minute: r.new_users_per_minute,
    suspended: r.suspended,
    queue_all: r.queue_all
  }));
  
  output(simplified);
}

async function createWaitingRoom(zoneIdentifier, flags) {
  if (!flags.name) {
    throw new Error('--name required');
  }
  if (!flags.host) {
    throw new Error('--host required');
  }
  if (!flags['total-users']) {
    throw new Error('--total-users required');
  }
  if (!flags['new-users-per-minute']) {
    throw new Error('--new-users-per-minute required');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const room = {
    name: flags.name,
    host: flags.host,
    path: flags.path || '/',
    total_active_users: parseInt(flags['total-users']),
    new_users_per_minute: parseInt(flags['new-users-per-minute']),
    session_duration: flags['session-duration'] ? parseInt(flags['session-duration']) : 5,
    queue_all: flags['queue-all'] || false,
    disable_session_renewal: flags['disable-session-renewal'] || false,
    suspended: flags.suspended || false
  };

  const data = await apiRequest(`/zones/${zoneId}/waiting_rooms`, {
    method: 'POST',
    body: room
  });

  console.log(`Created waiting room: ${room.name}`);
  output(data.result);
}

async function updateWaitingRoom(zoneIdentifier, roomId, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get existing room
  const existing = await apiRequest(`/zones/${zoneId}/waiting_rooms/${roomId}`);
  const room = existing.result;

  // Update fields
  if (flags.name) room.name = flags.name;
  if (flags.host) room.host = flags.host;
  if (flags.path) room.path = flags.path;
  if (flags['total-users']) room.total_active_users = parseInt(flags['total-users']);
  if (flags['new-users-per-minute']) room.new_users_per_minute = parseInt(flags['new-users-per-minute']);
  if (flags['session-duration']) room.session_duration = parseInt(flags['session-duration']);
  if (flags['queue-all'] !== undefined) room.queue_all = flags['queue-all'];
  if (flags['disable-session-renewal'] !== undefined) room.disable_session_renewal = flags['disable-session-renewal'];
  if (flags.suspended !== undefined) room.suspended = flags.suspended;

  const data = await apiRequest(`/zones/${zoneId}/waiting_rooms/${roomId}`, {
    method: 'PUT',
    body: room
  });

  console.log(`Updated waiting room: ${room.name}`);
  output(data.result);
}

async function deleteWaitingRoom(zoneIdentifier, roomId) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  await apiRequest(`/zones/${zoneId}/waiting_rooms/${roomId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted waiting room: ${roomId}`);
}

async function getWaitingRoom(zoneIdentifier, roomId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/waiting_rooms/${roomId}`);
  output(data.result);
}

async function getWaitingRoomStatus(zoneIdentifier, roomId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/waiting_rooms/${roomId}/status`);
  
  const status = {
    ...data.result,
    status_description: data.result.status === 'queueing' 
      ? 'Users are being queued'
      : data.result.status === 'not_queueing'
      ? 'No queue active'
      : data.result.status
  };
  
  output(status);
}

async function listWaitingRoomEvents(zoneIdentifier, roomId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const events = await fetchAllPages(`/zones/${zoneId}/waiting_rooms/${roomId}/events`);
  
  const simplified = events.map(e => ({
    id: e.id,
    name: e.name,
    event_start_time: e.event_start_time,
    event_end_time: e.event_end_time,
    total_active_users: e.total_active_users,
    new_users_per_minute: e.new_users_per_minute,
    suspended: e.suspended
  }));
  
  output(simplified);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    const zoneIdentifier = args._[1];
    const roomId = args._[2];

    switch (command) {
      case 'list':
        if (!zoneIdentifier) throw new Error('Zone required');
        await listWaitingRooms(zoneIdentifier);
        break;

      case 'create':
        if (!zoneIdentifier) throw new Error('Zone required');
        await createWaitingRoom(zoneIdentifier, args);
        break;

      case 'update':
        if (!zoneIdentifier || !roomId) throw new Error('Zone and room ID required');
        await updateWaitingRoom(zoneIdentifier, roomId, args);
        break;

      case 'delete':
        if (!zoneIdentifier || !roomId) throw new Error('Zone and room ID required');
        await deleteWaitingRoom(zoneIdentifier, roomId);
        break;

      case 'info':
        if (!zoneIdentifier || !roomId) throw new Error('Zone and room ID required');
        await getWaitingRoom(zoneIdentifier, roomId);
        break;

      case 'status':
        if (!zoneIdentifier || !roomId) throw new Error('Zone and room ID required');
        await getWaitingRoomStatus(zoneIdentifier, roomId);
        break;

      case 'events':
        if (!zoneIdentifier || !roomId) throw new Error('Zone and room ID required');
        await listWaitingRoomEvents(zoneIdentifier, roomId);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();

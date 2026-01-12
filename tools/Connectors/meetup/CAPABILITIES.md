# Meetup Connector Capabilities

What this connector can do for you.

## Authentication

- Complete OAuth flow to get access tokens
- Refresh expired tokens
- Check token status and validity

## Groups

- List groups you organize and belong to
- Get group details and settings
- View group members and roles
- Access group statistics

## Events

- List upcoming events for a group
- List past events for a group
- Get full event details
- View event RSVPs and attendance
- Create new events with title, description, time, duration
- Update existing events
- Delete/cancel events

## Members

- Get your own member profile
- View other member details
- List group members with roles

## RSVPs

- List all RSVPs for an event
- RSVP Yes to an event (with optional guests)
- RSVP No to an event

## Limitations

- **Meetup Pro subscription required** for API access
- Access tokens expire after **1 hour** (use refresh token)
- Can only manage groups where you are an organizer
- Some operations require specific organizer permissions
- Rate limits are monitored but not strictly enforced
- Events created via API start as DRAFT (must publish on Meetup)

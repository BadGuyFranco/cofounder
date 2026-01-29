# Zoom Connector Capabilities

What this connector can do for you.

## Users

- List all users in your account
- Get user details by ID or email
- Create new users (Basic, Licensed, or On-prem)
- Update user profiles (name, department, timezone, etc.)
- Delete or disassociate users
- Activate or deactivate users
- Manage user assistants and schedulers
- View user settings and permissions

## Meetings

- List meetings for any user
- Create scheduled, instant, or recurring meetings
- Update meeting settings (topic, time, password, etc.)
- Delete meetings
- End live meetings
- Get meeting invitation text
- Manage meeting registrants
- Create and manage meeting polls
- View past meeting details and participants

## Webinars

- List webinars for any user
- Create scheduled or recurring webinars
- Update webinar settings
- Delete webinars
- End live webinars
- Manage webinar registrants
- Add and manage panelists
- Create and manage webinar polls
- View Q&A from past webinars
- Get webinar absentees list

## Cloud Recordings

- List all cloud recordings for a user
- Get recording details for specific meetings
- Delete recordings (to trash or permanently)
- Recover deleted recordings from trash
- View recording settings
- Get recording analytics
- Manage on-demand recording registrants

## Reports and Analytics

- Daily usage reports
- Active/inactive user reports
- Meeting reports with participant details
- Webinar reports with attendee details
- Telephone usage reports
- Cloud recording usage reports
- Operation logs
- Sign-in/out activity reports

## Dashboard (Real-time Metrics)

- Live meeting monitoring
- Past meeting analytics
- Meeting quality of service (QoS) data
- Webinar metrics and participant data
- Zoom Rooms status and usage
- CRC port usage
- IM/Chat metrics
- Client feedback reports
- Quality scores and top issues

## Groups

- List all groups
- Create and delete groups
- Update group names
- Add and remove group members
- View group settings
- View locked settings

## Limitations

- **In-meeting features not supported:** Cannot mute participants, get real-time attendee lists, or control meetings in progress. These require the Zoom SDK.
- **Webinar features require license:** Webinar endpoints only work if your account has webinar add-on.
- **Rate limits apply:** General limit is 10 requests/second; some endpoints have stricter limits (1 req/s for lists, 2000/day for some reports).
- **Scope requirements:** Each feature requires specific OAuth scopes to be enabled on your Server-to-Server app.
- **Admin access needed:** Most endpoints require admin-level scopes and permissions.
- **Recording download:** Direct file downloads require additional authentication; recording URLs expire.

# Priority Filter Specification

## Goal

Provide a business process dashboard that helps managers review unhandled equipment requests in priority and due-date order.

## User Need

Managers need to see equipment requests that still need attention, without signing in, so they can focus on higher-priority and sooner-due requests first and remove completed work from the active list by marking it handled.

## Functional Rules

- Display every saved, valid equipment request that has not been marked handled.
- Do not display requests marked handled on the active dashboard.
- Allow a manager to mark a displayed request as handled.
- When a request is marked handled, remove it from the active dashboard immediately and retain its saved record.
- Treat existing saved requests that do not yet have a handled marker as unhandled, so they remain visible.
- Sort displayed requests by priority in this order: High, Normal, Low.
- Within each priority, sort requests by needed-by date, earliest date first.
- If requests have the same priority and needed-by date, keep their relative saved order.
- Show the existing request information: requester, department, equipment, priority, needed-by date, business reason, and submission date.
- When a request is added using the existing form, show it in the correct position without requiring a page reload.
- When there are no unhandled requests, show a clear empty message and no request rows, even if handled requests remain saved.

## Constraints

- Managers can use the dashboard without a login.
- Use the existing browser storage; do not add a database or external service.
- Preserve all existing saved requests and their data. Viewing, sorting, or marking a request handled must not delete the request.
- Store handled state in a way that keeps existing requests readable; requests without the new state are treated as unhandled.

## Acceptance Criteria

1. A manager can open the dashboard without signing in.
2. Saved requests that are unhandled appear; requests marked handled do not appear.
3. A manager can mark an unhandled request as handled, and it disappears from the active dashboard immediately.
4. A request marked handled remains saved after the action and after reloading the application.
5. Existing saved requests without a handled marker remain visible as unhandled.
6. Unhandled requests appear in High, Normal, Low priority order.
7. Within each priority, requests with earlier needed-by dates appear before those with later dates.
8. Requests with matching priority and needed-by date retain their relative saved order.
9. Each displayed request shows requester, department, equipment, priority, needed-by date, business reason, and submission date.
10. Adding an unhandled request using the existing form shows it in the correct sorted position without a page reload.
11. When there are no unhandled requests, the dashboard shows an empty message and no request rows, including when handled requests remain saved.

## Out of Scope

- Changing or editing a request's priority.
- Reopening a handled request from the dashboard or displaying handled requests in its active list.
- Requiring authentication, adding database storage, or adding external services.
- Hiding unhandled requests through priority filters; all unhandled requests remain visible.

## Verification Results

1. Pass
2. Pass
3. Pass
4. Pass
5. Pass
6. Pass
7. Pass
8. Pass
9. Pass
10. Pass


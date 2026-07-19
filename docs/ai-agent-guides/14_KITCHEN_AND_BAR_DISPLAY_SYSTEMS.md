---
title: Kitchen and Bar Display Systems
order: 14
phase: station-ui
status: not-started
---

# Kitchen and Bar Display Systems

## Objective

Provide fast, high-contrast station screens that make preparation status obvious and require one tap per transition.

## Shared station component

Build one station display feature configured by the authenticated station and permissions. Do not create duplicated Kitchen and Bar codebases.

## Queue query

```text
GET /api/stations/:stationId/queue?status=NEW,PREPARING&cursor=
```

Return grouped ticket cards with compact line DTOs. Use the compound `stationId + status + firedAt` index.

## Ticket card content

- Table label and ticket number.
- Time since first active line fired.
- Item name, quantity, modifiers, and note.
- Current status.
- One clear next action.
- Round or fired-at grouping when more items are added later.

## Status actions

- NEW -> Start -> PREPARING.
- PREPARING -> Ready -> READY.
- READY is removed from the active preparation queue or moved to a recently-ready lane.

Use an optimistic visual transition, disable duplicate taps, and roll back on server failure.

## Aging behavior

Use configurable thresholds:

- Normal.
- Warning.
- Urgent.

Provide color, label, and elapsed time. Never use color alone.

## Layout

- Desktop and landscape tablet first.
- Large touch targets of at least 48px.
- Dense but readable ticket grid.
- Optional focused lanes: New, Preparing, Recently Ready.
- Full-screen mode.
- Clear offline and reconnecting banners.

## Audio

A new-line sound is optional and user-configurable. Respect browser autoplay restrictions. Show a visible new-ticket cue even when audio cannot play.

## Speed requirements

- Virtualize only when the active queue is genuinely large; avoid unnecessary complexity.
- Update one line or ticket card rather than re-rendering the entire grid.
- Use memoized selectors.
- Keep timers local and update displayed elapsed time at a reasonable interval, not every animation frame.

## Tests

- Correct station filtering.
- One-tap transitions.
- Forbidden transition rejected.
- Duplicate tap does not advance twice.
- New round appears under the correct ticket.
- Queue re-sync after reconnect.

## Exit gate

A station worker can identify new work, notes, age, and the next action at a glance from several feet away.

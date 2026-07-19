---
title: Observability, Backups, and Operational Runbook
order: 25
phase: operations
status: not-started
---

# Observability, Backups, and Operational Runbook

## Objective

Make failures visible, recoverable, and understandable to the restaurant operator.

## Structured logging

Every request should have a request ID. Log:

- Route and method.
- Actor ID when safe.
- Result status.
- Duration.
- Domain operation.
- Error code.
- Real-time publish result.

Do not log secrets or full sensitive payloads.

## Error monitoring

Configure an error-monitoring service or equivalent free-compatible solution. Tag errors by:

- Environment.
- Release.
- Persona.
- Route.
- Request ID.

## Health endpoints

Create:

```text
GET /api/health/live
GET /api/health/ready
```

Readiness should perform a bounded database check and optionally verify the real-time provider configuration without creating excessive external calls.

## Business monitoring

Track:

- Order fire failures.
- Real-time publish failures.
- Station queue age.
- Payment retries and conflicts.
- Database connection errors.
- Client reconnect rates.

## Backup policy

Do not assume managed snapshots are available on a free database cluster.

Implement:

- Scheduled encrypted `mongodump` or approved export.
- Separate private storage destination.
- Retention policy.
- Backup success alert.
- Monthly restore test into a non-production database.
- Written restore steps.

A backup is not valid until a restore has been tested.

## Operational runbook

Document:

- Add, deactivate, and reset a staff account.
- Change a role safely.
- Recover from unavailable real-time service.
- Switch to temporary polling mode.
- Restore a database backup.
- Resolve a stuck CLOSED ticket.
- Investigate a suspected duplicate payment.
- Rotate secrets.
- Roll back a deployment.

## Exit gate

An operator can identify service health, receive failure alerts, and follow a tested restore procedure without relying on undocumented developer knowledge.

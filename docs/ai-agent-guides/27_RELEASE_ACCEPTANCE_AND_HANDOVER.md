---
title: Release Acceptance and Handover
order: 27
phase: release
status: not-started
---

# Release Acceptance and Handover

## Release readiness checklist

### Business workflow

- [ ] Waiter opens or resumes a table.
- [ ] Mixed order routes correctly.
- [ ] KDS and BDS status changes are live.
- [ ] READY alert is persistent and targeted.
- [ ] Additional rounds work on the same ticket.
- [ ] Close blocks further ordering.
- [ ] Cashier queue receives closed ticket.
- [ ] Payment is idempotent.
- [ ] Receipt totals match snapshots.
- [ ] PAID frees the table.

### Access control

- [ ] Every mutation has a server permission guard.
- [ ] Station scope is enforced.
- [ ] Multi-role permission union works.
- [ ] Role edits take effect promptly.
- [ ] Inactive users lose access.

### UX

- [ ] Waiter common order takes under 15 seconds.
- [ ] Target device layouts pass.
- [ ] Loading, empty, error, offline, and reconnecting states exist.
- [ ] Touch targets and keyboard paths pass.
- [ ] Destructive operations confirm and explain impact.

### Performance

- [ ] Hot queries use indexes.
- [ ] No N+1 station routing.
- [ ] Real-time events are compact.
- [ ] Role-based route bundles do not include unrelated heavy features.
- [ ] Load test meets agreed budgets.

### Security and operations

- [ ] Password and PIN hashes only.
- [ ] Secrets are absent from repository and client bundle.
- [ ] Payment and order submissions use idempotency.
- [ ] Audit records exist for sensitive actions.
- [ ] Backup and restore are tested.
- [ ] Health checks and monitoring are active.

## Handover package

Provide:

- Architecture documentation and ADRs.
- Environment variable inventory.
- Admin user guide.
- Waiter quick-start guide.
- Kitchen and Bar quick-start guide.
- Cashier quick-start guide.
- Backup and restore runbook.
- Deployment and rollback runbook.
- Test report and known limitations.
- Source code and lockfile.

## Training

Run role-based sessions using a demo order from open to payment. Keep training task-oriented and under 30 minutes per role.

## Final acceptance

The restaurant owner or nominated manager must sign off after a live operational simulation with all personas connected simultaneously.

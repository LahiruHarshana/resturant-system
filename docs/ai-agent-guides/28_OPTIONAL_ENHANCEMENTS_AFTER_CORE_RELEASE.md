---
title: Optional Enhancements After Core Release
order: 28
phase: later
status: blocked-until-core-release
---

# Optional Enhancements After Core Release

Do not begin these until the core release is stable and measured.

## Recommended order

1. Table transfer.
2. Merge tables.
3. Split bill and multiple payments.
4. Manager approval workflows.
5. Guest QR self-order.
6. Kitchen printer integration.
7. Inventory tracking.
8. Shift management.
9. Loyalty.
10. Multi-branch tenancy.

## Design requirements for later features

- Preserve order-line snapshots.
- Extend payment model before enabling split bills; do not overload the first-release one-payment assumptions.
- Add tenant or branch identifiers to every relevant collection before multi-branch rollout.
- Use feature flags for operationally risky additions.
- Add migration, rollback, permission, audit, performance, and acceptance plans for each enhancement.

## Enhancement gate template

Before implementation, document:

- Business problem.
- New personas or permissions.
- Data model changes.
- API changes.
- Real-time changes.
- UI flow.
- Failure modes.
- Backward compatibility.
- Performance impact.
- Tests and acceptance criteria.

## Exit rule

An enhancement is not approved merely because it is technically possible. It must reduce operational effort, improve guest service, or produce a measurable business benefit without destabilizing the core ordering loop.

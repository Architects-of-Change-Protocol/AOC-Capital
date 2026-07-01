# Approval runtime

## Enforced
- Approval requests persist with pending/approved/rejected/expired lifecycle.
- Approve flow now hardens reviewer checks and issues one execution grant bound to request decision/scope.
- Reject flow revokes active grants linked to the approval request.

## Prepared
- Expiration worker and admin bulk revocation tooling.

## Not implemented
- Multi-step quorum approvals, delegated reviewer pools, and batched policy workflows.

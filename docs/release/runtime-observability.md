# Runtime Observability

PMFreak now exposes a lightweight operational health endpoint at `/api/health`.

Runtime diagnostics can be generated with:
- `npm run diag:runtime`

The report includes package version visibility, startup assertion status, and endpoint readiness checks.

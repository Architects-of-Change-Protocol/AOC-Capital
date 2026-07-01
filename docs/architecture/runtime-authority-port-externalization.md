# Runtime Authority Port Externalization

PMFreak now introduces `RuntimeAuthorityPort` as the canonical authority contract between runtime-consumer bridges and authority providers.

## Provider architecture
- `in_process` -> `InProcessRuntimeAuthorityAdapter`
- `external_sdk` -> `ExternalRuntimeAuthorityAdapter` (stub)
- `remote_service` -> `ExternalRuntimeAuthorityAdapter` (stub)
- `federated` -> `ExternalRuntimeAuthorityAdapter` (stub)

Provider selection is controlled by `AOC_RUNTIME_AUTHORITY_PROVIDER` and defaults to `in_process`.

## Fail-closed behavior
Unsupported or unconfigured external providers throw `RuntimeAuthorityUnavailableError` with fail-closed metadata and do not silently fall back.

## Bridge migration
`*-bridge.ts` modules now call `getRuntimeAuthorityPort()` and delegate authority actions through the port.

## Relationship to runtime-consumer
`@/aoc/runtime-consumer` APIs remain stable. Consumer routes keep calling runtime-consumer; runtime-consumer continues to call enterprise runtime bridges.

## Limitations
No external transport is implemented in this phase. External provider modes are architecture stubs only.

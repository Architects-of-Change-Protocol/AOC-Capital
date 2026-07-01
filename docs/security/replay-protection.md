# Replay Protection (Phase 6.3)

Trust event propagation now includes verifier-local replay controls:

- monotonic sequence checks (`sequence_number`)
- nonce uniqueness (`nonce`)
- chain linkage (`previous_event_hash`)
- stale timestamp rejection (windowed)
- invalid sequence jump rejection

Replay protection is verifier-local safety, not consensus.

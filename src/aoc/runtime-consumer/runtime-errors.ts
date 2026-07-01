export class RuntimeConsumerError extends Error {
  constructor(message: string, public readonly code: string, public readonly metadata?: Record<string, unknown>) {
    super(message);
    this.name = "RuntimeConsumerError";
  }
}

export class RuntimeDependencyUnavailableError extends RuntimeConsumerError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "runtime_dependency_unavailable", metadata);
    this.name = "RuntimeDependencyUnavailableError";
  }
}

export class RuntimeFailClosedError extends RuntimeConsumerError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "runtime_fail_closed", metadata);
    this.name = "RuntimeFailClosedError";
  }
}

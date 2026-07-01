import type { OAuthProvider, OAuthProviderMetadata } from "../types/live-federation-types.js";

const PROVIDER_REGISTRY: Record<OAuthProvider, OAuthProviderMetadata> = {
  jira: {
    provider: "jira",
    displayName: "Jira",
    authorizationEndpoint: "https://auth.atlassian.com/authorize",
    tokenEndpoint: "https://auth.atlassian.com/oauth/token",
    scopes: ["read:jira-work", "write:jira-work", "read:jira-user", "offline_access"],
    refreshable: true,
    pkceRequired: true,
    stateRequired: true,
    governanceConstraints: [
      "jira tokens must never be logged",
      "jira scopes must be workspace-scoped",
      "jira refresh tokens must be encrypted at rest",
    ],
    survivabilityExpectations: [
      "token refresh before 7-day expiry",
      "session re-authorization if refresh fails",
    ],
  },
  slack: {
    provider: "slack",
    displayName: "Slack",
    authorizationEndpoint: "https://slack.com/oauth/v2/authorize",
    tokenEndpoint: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "channels:history", "users:read", "team:read"],
    refreshable: false,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "slack tokens must be workspace-scoped",
      "slack bot tokens must not expose workspace data cross-tenant",
    ],
    survivabilityExpectations: [
      "non-expiring tokens require periodic re-verification",
      "revocation events must invalidate sessions",
    ],
  },
  github: {
    provider: "github",
    displayName: "GitHub",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    scopes: ["repo:read", "read:org", "read:user"],
    refreshable: false,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "github tokens must be scoped to minimum required permissions",
      "github org tokens must be tenant-bound",
    ],
    survivabilityExpectations: [
      "non-expiring tokens require operator-managed rotation",
    ],
  },
  gitlab: {
    provider: "gitlab",
    displayName: "GitLab",
    authorizationEndpoint: "https://gitlab.com/oauth/authorize",
    tokenEndpoint: "https://gitlab.com/oauth/token",
    scopes: ["read_api", "read_user", "read_repository"],
    refreshable: true,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "gitlab tokens must be project-scoped where possible",
      "gitlab refresh tokens must be encrypted at rest",
    ],
    survivabilityExpectations: [
      "access token refresh before 2-hour expiry",
    ],
  },
  notion: {
    provider: "notion",
    displayName: "Notion",
    authorizationEndpoint: "https://api.notion.com/v1/oauth/authorize",
    tokenEndpoint: "https://api.notion.com/v1/oauth/token",
    scopes: ["read_content", "read_user_with_email"],
    refreshable: false,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "notion tokens must be workspace-scoped",
      "notion integration access must not cross workspace boundaries",
    ],
    survivabilityExpectations: [
      "non-expiring tokens require periodic re-verification",
    ],
  },
  linear: {
    provider: "linear",
    displayName: "Linear",
    authorizationEndpoint: "https://linear.app/oauth/authorize",
    tokenEndpoint: "https://api.linear.app/oauth/token",
    scopes: ["read", "issues:read", "projects:read", "teams:read"],
    refreshable: true,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "linear tokens must be team-scoped",
      "linear refresh tokens must be encrypted at rest",
    ],
    survivabilityExpectations: [
      "token refresh before 10-day expiry",
    ],
  },
  google: {
    provider: "google",
    displayName: "Google",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "profile",
      "email",
    ],
    refreshable: true,
    pkceRequired: false,
    stateRequired: true,
    governanceConstraints: [
      "google tokens must be user-consented and tenant-scoped",
      "google refresh tokens must be encrypted at rest",
      "google tokens must not be shared across tenants",
    ],
    survivabilityExpectations: [
      "access token refresh before 1-hour expiry",
      "refresh token long-lived — protect with encryption",
    ],
  },
  microsoft: {
    provider: "microsoft",
    displayName: "Microsoft",
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "Calendars.Read",
      "Mail.Read",
      "User.Read",
      "Team.ReadBasic.All",
      "offline_access",
    ],
    refreshable: true,
    pkceRequired: true,
    stateRequired: true,
    governanceConstraints: [
      "microsoft tokens must be tenant-scoped via tenant_id claim",
      "microsoft refresh tokens must be encrypted at rest",
      "microsoft tokens must respect organizational consent boundaries",
    ],
    survivabilityExpectations: [
      "access token refresh before 1-hour expiry",
      "refresh token rotation must be tracked",
    ],
  },
};

export function getOAuthProviderMetadata(provider: OAuthProvider): OAuthProviderMetadata {
  return PROVIDER_REGISTRY[provider];
}

export function listSupportedProviders(): OAuthProvider[] {
  return Object.keys(PROVIDER_REGISTRY) as OAuthProvider[];
}

export function isProviderRefreshable(provider: OAuthProvider): boolean {
  return PROVIDER_REGISTRY[provider].refreshable;
}

export function getProviderGovernanceConstraints(provider: OAuthProvider): string[] {
  return PROVIDER_REGISTRY[provider].governanceConstraints;
}

export function getProviderSurvivabilityExpectations(provider: OAuthProvider): string[] {
  return PROVIDER_REGISTRY[provider].survivabilityExpectations;
}

export function requiresProviderPKCE(provider: OAuthProvider): boolean {
  return PROVIDER_REGISTRY[provider].pkceRequired;
}

import { Session } from '@inrupt/solid-client-authn-node';

/**
 * Configuration for the Solid authentication service.
 */
export interface SolidAuthConfig {
  /** OIDC issuer URL – typically the CSS base URL (e.g. http://localhost:3000). */
  oidcIssuer: string;
  /** OAuth2 client ID registered with the CSS (for client-credentials flow). */
  clientId?: string;
  /** OAuth2 client secret (for client-credentials flow). */
  clientSecret?: string;
  /** Human-readable name shown during interactive login. */
  clientName?: string;
  /** Redirect URL for the interactive OIDC flow. */
  redirectUrl?: string;
}

/**
 * SolidAuthService manages authentication with a Solid Community Server.
 *
 * Supports two flows:
 * - **Client Credentials** – for headless / server-side usage (CSS-specific
 *   extension). Requires a `clientId` and `clientSecret` issued by the CSS.
 * - **Interactive OIDC** – for user-facing usage where the user is redirected
 *   to the CSS login page and back.
 */
export class SolidAuthService {
  private readonly config: SolidAuthConfig;
  private session: Session;

  constructor(config: SolidAuthConfig) {
    this.config = config;
    this.session = new Session();
  }

  /**
   * Authenticate using the CSS client-credentials extension.
   *
   * @see https://communitysolidserver.github.io/CommunitySolidServer/latest/usage/client-credentials/
   */
  async loginWithClientCredentials(): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        'clientId and clientSecret are required for client-credentials login.',
      );
    }

    await this.session.login({
      oidcIssuer: this.config.oidcIssuer,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });

    if (!this.session.info.isLoggedIn) {
      throw new Error(
        'Client-credentials login failed – check clientId/clientSecret and oidcIssuer.',
      );
    }
  }

  /**
   * Begin the interactive OIDC login flow by returning the authorisation URL
   * that the user should be redirected to.
   *
   * @returns The URL to redirect the user's browser to.
   */
  async beginInteractiveLogin(): Promise<string> {
    if (!this.config.redirectUrl) {
      throw new Error('redirectUrl is required for interactive login.');
    }

    await this.session.login({
      oidcIssuer: this.config.oidcIssuer,
      redirectUrl: this.config.redirectUrl,
      clientName: this.config.clientName ?? 'OpenCommons Health PIM',
    });

    return this.config.redirectUrl;
  }

  /**
   * Complete the interactive OIDC login flow by processing the callback URL.
   *
   * @param callbackUrl - The full URL received at the redirect endpoint.
   */
  async handleLoginCallback(callbackUrl: string): Promise<void> {
    await this.session.handleIncomingRedirect(callbackUrl);

    if (!this.session.info.isLoggedIn) {
      throw new Error(
        'Interactive login callback failed – the session was not established.',
      );
    }
  }

  /** Log out and invalidate the current session. */
  async logout(): Promise<void> {
    await this.session.logout();
  }

  /** Whether the current session is authenticated. */
  get isLoggedIn(): boolean {
    return this.session.info.isLoggedIn;
  }

  /** The WebID of the authenticated user, or undefined if not logged in. */
  get webId(): string | undefined {
    return this.session.info.webId;
  }

  /**
   * Fetch API compatible with `@inrupt/solid-client` – includes the
   * session's authentication credentials automatically.
   */
  get authenticatedFetch(): typeof fetch {
    return this.session.fetch as typeof fetch;
  }

  /** The underlying Inrupt session object. */
  get rawSession(): Session {
    return this.session;
  }
}

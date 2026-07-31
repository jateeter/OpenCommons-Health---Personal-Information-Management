/**
 * Unit tests for SolidAuthService.
 *
 * The Inrupt Session is fully mocked so no network calls are made.
 */
import { SolidAuthService, type SolidAuthConfig } from '../../../src/auth/solidAuth';

// ─── Mock @inrupt/solid-client-authn-node ─────────────────────────────────────

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockHandleIncomingRedirect = jest.fn();

const mockSessionInfo = {
  isLoggedIn: false,
  webId: undefined as string | undefined,
};

/** Every Session the service constructs, so tests can drive re-authentication. */
const mockSessions: Array<{ fetch: jest.Mock }> = [];

jest.mock('@inrupt/solid-client-authn-node', () => ({
  Session: jest.fn().mockImplementation(() => {
    const session = {
      login: mockLogin,
      logout: mockLogout,
      handleIncomingRedirect: mockHandleIncomingRedirect,
      get info() {
        return mockSessionInfo;
      },
      // Sessions succeed by default; tests override to simulate expiry.
      fetch: jest.fn().mockResolvedValue(new Response(null, { status: 200 })) as unknown as jest.Mock,
    };
    mockSessions.push(session);
    return session;
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<SolidAuthConfig> = {}): SolidAuthService {
  return new SolidAuthService({
    oidcIssuer: 'http://localhost:3000',
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionInfo.isLoggedIn = false;
  mockSessionInfo.webId = undefined;
});

describe('SolidAuthService', () => {
  describe('loginWithClientCredentials()', () => {
    it('calls session.login with the correct parameters', async () => {
      mockLogin.mockResolvedValue(undefined);
      mockSessionInfo.isLoggedIn = true;

      const svc = makeService({ clientId: 'cid', clientSecret: 'csecret' });
      await svc.loginWithClientCredentials();

      expect(mockLogin).toHaveBeenCalledWith({
        oidcIssuer: 'http://localhost:3000',
        clientId: 'cid',
        clientSecret: 'csecret',
      });
    });

    it('throws when clientId or clientSecret is missing', async () => {
      const svc = makeService();
      await expect(svc.loginWithClientCredentials()).rejects.toThrow(
        'clientId and clientSecret are required',
      );
    });

    it('throws when the session is not logged in after login()', async () => {
      mockLogin.mockResolvedValue(undefined);
      // mockSessionInfo.isLoggedIn remains false

      const svc = makeService({ clientId: 'cid', clientSecret: 'csecret' });
      await expect(svc.loginWithClientCredentials()).rejects.toThrow(
        'Client-credentials login failed',
      );
    });
  });

  describe('beginInteractiveLogin()', () => {
    it('calls session.login and returns the redirectUrl', async () => {
      mockLogin.mockResolvedValue(undefined);

      const svc = makeService({
        redirectUrl: 'http://localhost:8080/callback',
        clientName: 'TestApp',
      });
      const url = await svc.beginInteractiveLogin();

      expect(url).toBe('http://localhost:8080/callback');
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          oidcIssuer: 'http://localhost:3000',
          redirectUrl: 'http://localhost:8080/callback',
          clientName: 'TestApp',
        }),
      );
    });

    it('throws when redirectUrl is not configured', async () => {
      const svc = makeService();
      await expect(svc.beginInteractiveLogin()).rejects.toThrow(
        'redirectUrl is required',
      );
    });
  });

  describe('handleLoginCallback()', () => {
    it('calls handleIncomingRedirect and succeeds when session is logged in', async () => {
      mockHandleIncomingRedirect.mockResolvedValue(undefined);
      mockSessionInfo.isLoggedIn = true;

      const svc = makeService();
      await expect(
        svc.handleLoginCallback('http://localhost:8080/callback?code=abc'),
      ).resolves.toBeUndefined();
    });

    it('throws when session is not established after callback', async () => {
      mockHandleIncomingRedirect.mockResolvedValue(undefined);
      // mockSessionInfo.isLoggedIn remains false

      const svc = makeService();
      await expect(
        svc.handleLoginCallback('http://localhost:8080/callback?code=bad'),
      ).rejects.toThrow('Interactive login callback failed');
    });
  });

  describe('logout()', () => {
    it('delegates to session.logout()', async () => {
      mockLogout.mockResolvedValue(undefined);
      const svc = makeService();
      await svc.logout();
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessors', () => {
    it('isLoggedIn reflects session state', () => {
      const svc = makeService();
      expect(svc.isLoggedIn).toBe(false);
      mockSessionInfo.isLoggedIn = true;
      expect(svc.isLoggedIn).toBe(true);
    });

    it('webId reflects session webId', () => {
      const svc = makeService();
      expect(svc.webId).toBeUndefined();
      mockSessionInfo.webId = 'https://example.pod/alice#me';
      expect(svc.webId).toBe('https://example.pod/alice#me');
    });

    it('authenticatedFetch returns the session fetch', () => {
      const svc = makeService();
      expect(typeof svc.authenticatedFetch).toBe('function');
    });
  });

  describe('expired client-credentials sessions', () => {
    const credentials = { clientId: 'id', clientSecret: 'secret' };
    const response = (status: number) => new Response(null, { status });

    beforeEach(() => {
      mockSessions.length = 0;
      mockSessionInfo.isLoggedIn = true;
    });

    it('re-authenticates and retries once when the pod rejects an expired token', async () => {
      const svc = makeService(credentials);
      mockSessions[0].fetch.mockResolvedValue(response(401));

      const result = await svc.authenticatedFetch('http://pod/health-pim/conditions/');

      // A second Session is built by the re-login, and the retry runs on it.
      expect(mockSessions).toHaveLength(2);
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockSessions[1].fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(200);
    });

    it('shares a single re-login across concurrent expired requests', async () => {
      const svc = makeService(credentials);
      mockSessions[0].fetch.mockResolvedValue(response(401));

      await Promise.all([
        svc.authenticatedFetch('http://pod/health-pim/conditions/'),
        svc.authenticatedFetch('http://pod/health-pim/medications/'),
        svc.authenticatedFetch('http://pod/health-pim/labresults/'),
      ]);

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockSessions).toHaveLength(2);
    });

    it('does not retry responses that are not authorization failures', async () => {
      const svc = makeService(credentials);
      mockSessions[0].fetch.mockResolvedValue(response(404));

      const result = await svc.authenticatedFetch('http://pod/health-pim/missing');

      expect(result.status).toBe(404);
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockSessions).toHaveLength(1);
    });

    it('does not retry when no client credentials are configured', async () => {
      const svc = makeService();
      mockSessions[0].fetch.mockResolvedValue(response(401));

      const result = await svc.authenticatedFetch('http://pod/health-pim/conditions/');

      expect(result.status).toBe(401);
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockSessions).toHaveLength(1);
    });
  });
});

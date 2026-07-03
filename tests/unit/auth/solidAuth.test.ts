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

jest.mock('@inrupt/solid-client-authn-node', () => ({
  Session: jest.fn().mockImplementation(() => ({
    login: mockLogin,
    logout: mockLogout,
    handleIncomingRedirect: mockHandleIncomingRedirect,
    get info() {
      return mockSessionInfo;
    },
    fetch: jest.fn() as typeof fetch,
  })),
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
});

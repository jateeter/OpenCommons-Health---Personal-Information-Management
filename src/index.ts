/**
 * OpenCommons Health – Personal Information Management
 *
 * Entry point for the Solid-backed health PIM application.
 *
 * Architecture overview
 * ─────────────────────
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  OpenCommons Health PIM                                             │
 * │                                                                     │
 * │  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
 * │  │ SolidAuthSvc │──▶│    PodClient     │──▶│  *Repository      │  │
 * │  └──────────────┘   └──────────────────┘   └───────────────────┘  │
 * │         │                    │                        │             │
 * │   OIDC/Client-Creds     Solid REST API          ShEx Schemas       │
 * │         ▼                    ▼                        ▼             │
 * │   ┌────────────────────────────────────────────────────────┐       │
 * │   │            Solid Community Server (local pod)          │       │
 * │   │                 http://localhost:3000                   │       │
 * │   └────────────────────────────────────────────────────────┘       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Related repositories
 * ────────────────────
 * • localSolidCommunityServer – CSS configuration and deployment scripts for
 *   the local single-user Solid pod that backs this application.
 *
 * Usage (client-credentials flow)
 * ────────────────────────────────
 *   import { HealthPIM } from './index';
 *
 *   const pim = await HealthPIM.create({
 *     podServerUrl: 'http://localhost:3000',
 *     podBaseUrl:   'http://localhost:3000/alice/',
 *     podPath:      '/health-pim/',
 *     clientId:     'alice-client-id',
 *     clientSecret: 'alice-client-secret',
 *   });
 *
 *   const condition = await pim.conditions.create({
 *     code: { system: 'http://snomed.info/id/', code: '44054006', display: 'Type 2 diabetes' },
 *     status: 'active',
 *     onsetDate: '2021-03-15',
 *   });
 */

import { SolidAuthService } from './auth/solidAuth';
import { PodClient } from './pod/podClient';
import {
  AllergyRepository,
  ConditionRepository,
  ImmunizationRepository,
  LabResultRepository,
  MedicationRepository,
  ProfileRepository,
  ProviderRepository,
  VitalSignsRepository,
  InsuranceRepository,
} from './repositories';

export * from './types';
export * from './auth';
export * from './pod';
export * from './repositories';
export * from './schemas';
export * from './utils';
export * from './errors';

/** Options passed to {@link HealthPIM.create}. */
export interface HealthPIMOptions {
  /** OIDC issuer / CSS base URL (e.g. http://localhost:3000). */
  podServerUrl: string;
  /** Explicit OIDC issuer when it differs from the pod server URL. */
  oidcIssuer?: string;
  /** Base URL of the user's pod (e.g. http://localhost:3000/alice/). */
  podBaseUrl: string;
  /** Sub-path within the pod reserved for the health PIM (e.g. /health-pim/). */
  podPath: string;
  /** CSS client-credentials ID (optional – omit for interactive flow). */
  clientId?: string;
  /** CSS client-credentials secret (optional – omit for interactive flow). */
  clientSecret?: string;
  /** Human-readable OAuth2 client name. */
  clientName?: string;
  /** Redirect URL for the interactive OIDC flow. */
  redirectUrl?: string;
}

/**
 * HealthPIM is the top-level façade for the OpenCommons Health PIM.
 *
 * It wires together authentication, pod access, and domain repositories into a
 * single, easy-to-use object.
 */
export class HealthPIM {
  /** Authentication service. */
  readonly auth: SolidAuthService;

  /** Low-level Solid pod client. */
  readonly pod: PodClient;

  /** Personal profile repository. */
  readonly profile: ProfileRepository;

  /** Medical conditions / diagnoses. */
  readonly conditions: ConditionRepository;

  /** Medications / drug statements. */
  readonly medications: MedicationRepository;

  /** Allergies and intolerances. */
  readonly allergies: AllergyRepository;

  /** Immunisation / vaccination records. */
  readonly immunizations: ImmunizationRepository;

  /** Vital sign observations. */
  readonly vitalSigns: VitalSignsRepository;

  /** Healthcare providers. */
  readonly providers: ProviderRepository;

  /** Laboratory results. */
  readonly labResults: LabResultRepository;

  /** Health insurance policies. */
  readonly insurancePolicies: InsuranceRepository;

  private constructor(
    auth: SolidAuthService,
    pod: PodClient,
  ) {
    this.auth = auth;
    this.pod = pod;
    this.profile = new ProfileRepository(pod);
    this.conditions = new ConditionRepository(pod);
    this.medications = new MedicationRepository(pod);
    this.allergies = new AllergyRepository(pod);
    this.immunizations = new ImmunizationRepository(pod);
    this.vitalSigns = new VitalSignsRepository(pod);
    this.providers = new ProviderRepository(pod);
    this.labResults = new LabResultRepository(pod);
    this.insurancePolicies = new InsuranceRepository(pod);
  }

  /**
   * Factory method – creates and authenticates a HealthPIM instance.
   *
   * If `clientId` and `clientSecret` are provided the client-credentials flow
   * is used (suitable for headless / automated use). Otherwise the method
   * returns after initialising the session without authentication; call
   * `instance.auth.beginInteractiveLogin()` to start the OIDC flow.
   */
  static async create(options: HealthPIMOptions): Promise<HealthPIM> {
    const authService = new SolidAuthService({
      oidcIssuer: options.oidcIssuer ?? options.podServerUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientName ?? 'OpenCommons Health PIM',
      redirectUrl: options.redirectUrl,
    });

    if (options.clientId && options.clientSecret) {
      await authService.loginWithClientCredentials();
    }

    const podClient = new PodClient(
      {
        podBaseUrl: options.podBaseUrl,
        podPath: options.podPath,
      },
      authService,
    );

    return new HealthPIM(authService, podClient);
  }

  /** Whether the current session is authenticated. */
  get isAuthenticated(): boolean {
    return this.auth.isLoggedIn;
  }

  /** Verify the authenticated session can read the configured pod root. */
  async checkPodAccess(): Promise<void> {
    await this.pod.verifyPodAccess();
  }

  /** WebID of the authenticated user (undefined if not logged in). */
  get webId(): string | undefined {
    return this.auth.webId;
  }
}

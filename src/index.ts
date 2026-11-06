import {
  createClient,
  type Client,
  type Config,
  type ClientOptions,
} from './client/client/index.js';
import { client } from './client/client.gen.js';
import { TribeCrafterClient } from './client/sdk.gen.js';

// Export everything from generated client (TribeCrafterClient, Options, Types, Schemas)
export * from './client/index.js';

// Export the pre-configured default client instance and helper
export { client, type CreateClientConfig } from './client/client.gen.js';

// Export the client factory and core types
export {
  createClient,
  createConfig,
  type Client,
  type Config,
  type ClientOptions,
} from './client/client/index.js';

export type AuthToken = string | null | undefined;
export type AuthTokenProvider = AuthToken | (() => AuthToken | Promise<AuthToken>);

export interface TribeCrafterOptions extends Omit<Config, 'auth'> {
  client?: Client;
  key?: string;
  /**
   * Static bearer token or a dynamic getter function (sync or async)
   * that returns the token.
   *
   * - If a token is returned, it is automatically attached as `Authorization: Bearer <token>`.
   * - If `null` or `undefined` is returned, the request proceeds as an unauthenticated (public) call.
   *
   * @example
   * auth: 'eyJhbGciOi...'
   *
   * @example
   * auth: () => localStorage.getItem('token')
   *
   * @example
   * auth: async () => await getSessionToken()
   */
  auth?: AuthTokenProvider;
}

/**
 * Convenient SDK client for TribeCrafter API.
 * Supports both public and protected calls using a single client instance.
 *
 * @example
 * ```ts
 * const client = new TribeCrafter({
 *   baseUrl: 'http://localhost:8055',
 *   auth: () => getStoredToken(),
 * });
 *
 * // Public call (if no token) or protected call (if token present)
 * const { data } = await client.getApiBlogs();
 * ```
 */
export class TribeCrafter extends TribeCrafterClient {
  public override readonly client: Client;
  private _authProvider?: AuthTokenProvider;

  constructor(options?: TribeCrafterOptions) {
    let resolvedClient: Client;

    if (options?.client) {
      resolvedClient = options.client;
    } else {
      const { key, auth, ...config } = options ?? {};
      resolvedClient = createClient(config);
    }

    super({ client: resolvedClient, key: options?.key });
    this.client = resolvedClient;

    if (options?.auth !== undefined) {
      this._authProvider = options.auth;
    }

    // Attach request interceptor that injects the auth token dynamically
    this.client.interceptors.request.use(async (request) => {
      // 1. If an individual call explicitly specified Authorization, do not overwrite
      if (request.headers.has('Authorization')) {
        return request;
      }

      // 2. If an auth provider is configured on this instance, evaluate it
      if (this._authProvider) {
        const rawToken =
          typeof this._authProvider === 'function'
            ? await this._authProvider()
            : this._authProvider;

        if (rawToken) {
          const authHeader = rawToken.startsWith('Bearer ')
            ? rawToken
            : `Bearer ${rawToken}`;
          request.headers.set('Authorization', authHeader);
        }
      }

      return request;
    });
  }

  /**
   * Set or update the auth token on this client instance.
   * Pass `null` or `undefined` to switch to public calls (e.g. on logout).
   * Pass a string or token getter function for authenticated calls.
   *
   * @example
   * client.setToken(userJwt);
   * client.setToken(null); // logout
   */
  public setToken(auth: AuthTokenProvider): this {
    this._authProvider = auth;
    return this;
  }

  /**
   * Alias for `setToken`.
   */
  public setAuth(auth: AuthTokenProvider): this {
    return this.setToken(auth);
  }

  /**
   * Create a lightweight clone of this client configured with a specific auth token.
   * Perfect for server-side environments (Next.js Server Actions, Express, Fastify)
   * where concurrent requests shouldn't mutate a shared instance.
   *
   * @example
   * const userClient = client.withAuth(req.headers.authorization);
   * const { data } = await userClient.getApiCart();
   */
  public withAuth(auth: AuthTokenProvider): TribeCrafter {
    const currentConfig = this.client.getConfig();
    const clonedClient = createClient(currentConfig);
    return new TribeCrafter({
      client: clonedClient,
      auth,
    });
  }
}

/**
 * Factory function to instantiate TribeCrafter.
 */
export function createTribeCrafter(options?: TribeCrafterOptions): TribeCrafter {
  return new TribeCrafter(options);
}

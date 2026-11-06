# TribeCrafter SDK

TypeScript/JavaScript SDK for the **TribeCrafter API**, powered by [@hey-api/openapi-ts](https://github.com/hey-api/hey-api).

---

## Features

- **Single Client Instance**: Seamlessly handles both **public** and **protected** calls using one instance.
- **Dynamic Authentication**: Provide a token getter callback, update tokens dynamically via `client.setToken()`, or override per-call.
- **Fully Typed**: End-to-end TypeScript definitions for all endpoints, schemas, parameters, and responses.
- **Server & Client Ready**: Includes `.withAuth()` to safely scope tokens per request on servers (e.g. Next.js, Express) without race conditions.
- **Safe Tuple Handling**: Returns `{ data, error, response }` by default without unhandled runtime rejections, or opt-in to `throwOnError: true`.

---

## Installation

```bash
npm install tribecrafter-sdk
```

_(or via pnpm / yarn)_

```bash
pnpm add tribecrafter-sdk
# or
yarn add tribecrafter-sdk
```

---

## Quick Start: Public & Protected Calls with a Single Instance

You **do not need two separate client instances** for public and protected calls. You can choose any of the patterns below that fit your architecture:

### Pattern 1: Dynamic Auth Getter (Recommended for Frontend & SPAs)

Pass a sync or async getter function to `auth`. When the user is a guest, return `null` (calls proceed as public). When the user logs in, return their token:

```typescript
import { TribeCrafter } from "tribecrafter-sdk";

// Define the client once in your app
export const client = new TribeCrafter({
  baseUrl: "http://localhost:8055",
  // Evaluated on each request:
  auth: () => getStoredAuthToken(), // e.g. from cookies, localStorage, Zustand, Redux, etc.
});

// 1. When user is not logged in (auth() returns null):
//    Requests are sent unauthenticated (PUBLIC)
const { data: blogs } = await client.getApiBlogs();

// 2. When user logs in (auth() returns JWT):
//    All calls automatically include "Authorization: Bearer <token>" (PROTECTED)
const { data: cart } = await client.getApiCart();
```

---

### Pattern 2: `client.setToken()` (Manual State Changes)

You can update or clear the token directly on the client instance at any time:

```typescript
import { TribeCrafter } from "tribecrafter-sdk";

const client = new TribeCrafter({ baseUrl: "http://localhost:8055" });

// 1. Public call (no token)
const { data: publicBlogs } = await client.getApiBlogs();

// 2. User logs in -> set token
client.setToken("eyJhbGciOi...");

// Protected call (includes Authorization header)
const { data: cart } = await client.getApiCart();

// 3. User logs out -> clear token
client.setToken(null);

// Back to public calls
const { data: moreBlogs } = await client.getApiBlogs();
```

---

### Pattern 3: Per-Call Token Override

Override or pass an explicit token for an individual request via the `headers` option:

```typescript
// Call an endpoint with a specific token
const { data } = await client.getApiCart({
  headers: {
    Authorization: `Bearer ${oneTimeToken}`,
  },
});
```

---

### Pattern 4: Server-Side / Multi-Tenant (`client.withAuth`)

On backend servers (Next.js Server Components, API routes, Express, Fastify) handling concurrent requests, avoid mutating a shared instance. Instead, create a lightweight request-scoped clone:

```typescript
import { TribeCrafter } from "tribecrafter-sdk";

// Shared base client (no user token attached)
export const api = new TribeCrafter({
  baseUrl: process.env.API_BASE_URL || "http://localhost:8055",
});

// Inside a request handler:
export async function GET(req: Request) {
  const token = req.headers.get("authorization");

  // Scoped to this specific incoming request
  const userClient = api.withAuth(token);

  const { data, error } = await userClient.getApiCart();
  return Response.json(data);
}
```

---

## Making API Queries

Every endpoint is available as a method on the client instance:

```typescript
// Query parameters
const { data: blogs, error } = await client.getApiBlogs({
  query: {
    limit: 10,
  },
});

// Path parameters (e.g., /api/blogs/:slug)
const { data: blog } = await client.getApiBlogsBySlug({
  path: {
    slug: "getting-started",
  },
});

// Request body (e.g., POST, PATCH)
const { data: cart } = await client.postApiCartAdd({
  body: {
    productId: "123",
    quantity: 1,
  },
});
```

---

### Example

```ts
import { TribeCrafter } from "tribecrafter-sdk";

async function runTests() {
  console.log(
    "--- TEST 1: Dynamic Auth Getter (Simulating Login / Logout) ---",
  );
  let currentToken: string | null = null;

  // Single client instance configured with a dynamic getter
  const client = new TribeCrafter({
    baseUrl: "http://localhost:8055",
    auth: () => currentToken, // dynamically evaluated on each request!
  });

  // A. Public call (currentToken is null)
  console.log("1A. Sending public call (currentToken = null)...");
  const pubRes = await client.getApiBlogs();
  console.log("Public response status:", pubRes.response?.status);

  // B. Protected call (User logs in, currentToken is set)
  currentToken = "secure-token";
  console.log("1B. Sending protected call after login (currentToken set)...");
  const protRes = await client.getApiBlogs();
  console.log("Protected response status:", protRes.response?.status);
  // (In our localhost, simulated token gives 401, confirming Authorization was sent!)

  console.log("\n--- TEST 2: client.setToken() method ---");
  const client2 = new TribeCrafter({ baseUrl: "http://localhost:8055" });

  // Start with token
  client2.setToken("secure-token");
  const resWithToken = await client2.getApiBlogs();
  console.log("With token-abc status:", resWithToken.response?.status);

  // Clear token (logout)
  client2.setToken(null);
  const resCleared = await client2.getApiBlogs();
  console.log("After setToken(null) status:", resCleared.response?.status);

  console.log("\n--- TEST 3: Per-Call Override ---");
  // Client has NO token
  const client3 = new TribeCrafter({ baseUrl: "http://localhost:8055" });
  const perCallRes = await client3.getApiBlogs({
    headers: {
      Authorization: "Bearer secure-token",
    },
  });
  console.log("Per-call token override status:", perCallRes.response?.status);

  console.log("\n--- TEST 4: client.withAuth() (Multi-tenant / SSR) ---");
  const baseClient = new TribeCrafter({ baseUrl: "http://localhost:8055" });
  const userClient = baseClient.withAuth("secure-token");
  const userRes = await userClient.getApiBlogs();
  console.log("Scoped client call status:", userRes.response?.status);

  console.log("\nAll dynamic auth scenarios verified successfully!");
}

runTests().catch(console.error);
```

## Error Handling

### Safe Tuple (Default)

The SDK returns a `{ data, error, response }` object without throwing HTTP status exceptions:

```typescript
const { data, error, response } = await client.getApiCart();

if (error) {
  console.error(`Request failed with status ${response?.status}:`, error);
} else {
  console.log("Cart items:", data);
}
```

### Throwing Exceptions

Pass `throwOnError: true` to use standard `try / catch`:

```typescript
try {
  const { data } = await client.getApiCart({ throwOnError: true });
  console.log("Cart:", data);
} catch (err) {
  console.error("Failed to fetch cart:", err);
}
```

---

## TypeScript Types

All request and response types are exported from the root:

```typescript
import type {
  GetApiBlogsData,
  GetApiBlogsResponses,
  TribeCrafterOptions,
} from "tribecrafter-sdk";
```

---

## Re-generating the SDK

Whenever the backend OpenAPI schema changes:

1. Update [openapi-ts.config.ts](file:///Users/bhataasim/Documents/Dev/Quvor/tribecrafter-sdk/openapi-ts.config.ts) if needed.
2. Re-generate:
   ```bash
   npm run generate
   ```
3. Build the distribution:
   ```bash
   npm run build
   ```
4. Test locally:
   ```bash
   node --experimental-strip-types test/server.ts
   ```

---

## License

ISC © [Aasim Bhat](https://github.com/bhataasim)

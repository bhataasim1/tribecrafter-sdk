# TribeCrafter SDK

TypeScript/JavaScript SDK for the **TribeCrafter API**, generated with [@hey-api/openapi-ts](https://github.com/hey-api/hey-api).

---

## Features

- **Fully Typed**: End-to-end TypeScript types for all requests, responses, query parameters, and path variables.
- **Tree-shakeable**: Import only the API methods you need.
- **Configurable**: Easily configure base URL, authentication headers, interceptors, and custom fetch implementations.
- **Runtime Validation & Dates**: Built-in support for transformer plugins (e.g. automatic date parsing).

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

## Quick Start

### 1. Configure the Client

Configure the shared client instance before making requests:

```typescript
import { client } from "tribecrafter-sdk";

client.setConfig({
  baseUrl: "https://api.yourdomain.com", // Defaults to http://localhost:8055
  headers: {
    Authorization: "Bearer YOUR_AUTH_TOKEN",
  },
});
```

### 2. Make an API Call

By default, SDK functions return an object containing `{ data, error, response }`:

```typescript
import { getApiBlogs, getApiBlogsBySlug } from "tribecrafter-sdk";

async function main() {
  // Fetch a list of blogs
  const { data: blogs, error } = await getApiBlogs({
    query: {
      limit: 10,
    },
  });

  if (error) {
    console.error("Failed to fetch blogs:", error);
    return;
  }

  console.log("Blogs:", blogs);

  // Fetch blog by slug (path parameter)
  const { data: blog } = await getApiBlogsBySlug({
    path: {
      slug: "getting-started",
    },
  });

  console.log("Blog details:", blog);
}

main();
```

---

## Authentication & Interceptors

### Setting Authorization Token Dynamically

If your auth token updates at runtime or is stored in a cookie/state manager, use request interceptors:

```typescript
import { client } from "tribecrafter-sdk";

client.interceptors.request.use((request, options) => {
  const token = getStoredAuthToken();
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});
```

### Handling 401 Unauthorized Globally

You can also intercept responses to handle token expiration:

```typescript
import { client } from "tribecrafter-sdk";

client.interceptors.response.use((response) => {
  if (response.status === 401) {
    // Redirect to login or trigger refresh token flow
  }
  return response;
});
```

---

## Error Handling

### Pattern 1: Safe Tuple (Default)

By default, calls do not throw exceptions for HTTP error statuses (like 400 or 404):

```typescript
const { data, error, response } = await getApiCart();

if (error) {
  console.error(`Request failed with status ${response.status}`, error);
} else {
  console.log("Cart items:", data);
}
```

### Pattern 2: Throwing on Error

If you prefer standard `try/catch` flow, set `throwOnError: true`:

```typescript
try {
  const { data } = await getApiCart({ throwOnError: true });
  console.log("Cart:", data);
} catch (err) {
  console.error("Error fetching cart:", err);
}
```

---

## Isolated Client Instances (SSR / Multi-Tenant)

For environments like Next.js Server Components, API routes, or multi-tenant servers where sharing a global client could leak tokens, you can instantiate isolated clients using `createClient`:

```typescript
import { createClient, getApiBlogs } from "tribecrafter-sdk";

// Create a client instance scoped to a specific request/user
const userClient = createClient({
  baseUrl: "https://api.yourdomain.com",
  headers: {
    Authorization: `Bearer ${userSessionToken}`,
  },
});

// Pass the instance via options
const { data } = await getApiBlogs({
  client: userClient,
});
```

---

## Development & Re-generating the SDK

When the backend OpenAPI specification changes:

1. Update your OpenAPI URL or authorization token in [openapi-ts.config.ts](openapi-ts.config.ts) if needed.
2. Run the generation script:

```bash
npm run generate
```

3. Build the compiled output:

```bash
npm run build
```

---

## License

ISC © [Aasim Bhat](https://github.com/bhataasim)

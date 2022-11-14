# minirest 👝

### What is it?

A package used to create a tiny REST api using directory routing.

### Examples

#### Default export
```typescript
// src/index.js

export default "Hello World"
```

#### Default export function
```typescript
// src/index.js

export default () => {
  return "Hello World";
}
```

#### Method
```typescript
// src/index.js

export function get() {
  return "Hello GET";
}

```

#### Params
```typescript
// src/users/[id].js

export function get({ query }) {
  return `Hello, user ${query.id}`;
}

```

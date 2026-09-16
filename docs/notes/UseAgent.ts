Exactly — it **looks like we're initializing `handlers` twice**, but we're actually doing two different things.

```ts
const handlersRef = useRef(handlers);
handlersRef.current = handlers;
```

### First line

```ts
const handlersRef = useRef(handlers);
```

This initializes the ref **only on the first render**.

Think of it as:

```ts
handlersRef = {
  current: handlers
}
```

On subsequent renders, React does **not** recreate the ref.

---

### Second line

```ts
handlersRef.current = handlers;
```

This is **updating** the ref's value on every render.

Why?

Imagine the component renders like this:

```text
Render 1
handlers = { onTextDelta: function A }

handlersRef.current → function A
```

Then something causes React to render again:

```text
Render 2
handlers = { onTextDelta: function B }

handlersRef.current → function B
```

The ref itself stayed the same:

```text
handlersRef
    │
    ▼
{ current: ... }
```

Only `.current` changed.

---

## Why do we need this in your SSE hook?

This is the important part.

Your effect has:

```ts
useEffect(() => {
   // create EventSource

   listen("text_delta", () => {
      handlersRef.current.onTextDelta?.(...)
   });

   return () => es.close();
}, [conversationId]);
```

Notice:

```ts
[conversationId]
```

The effect **doesn't depend on `handlers`**.

That's intentional.

Suppose your component does:

```tsx
useAgentStream(conversationId, {
  onTextDelta: (text) => {
    console.log(text);
  },
});
```

React renders again because some UI state changed.

You don't want this:

```text
Render
  ↓
new handlers object
  ↓
useEffect runs
  ↓
close old SSE
  ↓
create new SSE
```

every time the component renders.

Instead:

```text
SSE connection
     │
     │ stays alive
     ▼
handlersRef.current
     │
     │ always points to latest handlers
     ▼
latest callback
```

So the ref solves the **stale callback** problem without recreating the SSE connection.

---

### In simple terms

This:

```ts
const handlersRef = useRef(handlers);
handlersRef.current = handlers;
```

means:

> **"Keep one permanent box, but always put the latest handlers inside that box."**

Whereas this:

```ts
const handlersRef = useRef(handlers);
```

alone means:

> **"Create the box with the initial handlers and never update what's inside."**

So you are **not initializing twice**.

You're doing:

1. **Create ref with initial value**
2. **Keep ref synchronized with latest value**

That's the main reason this pattern is useful for your SSE hook.
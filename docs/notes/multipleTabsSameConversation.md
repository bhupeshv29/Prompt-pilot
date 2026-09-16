This stores **Express `Response` objects in memory**, grouped by `conversationId`.

```
const clients = new Map<string, Set<Response>>();
```

Think of it like:

```
Map
│
├── "conversation-123" → Set
│                     ├── Response object A
│                     └── Response object B
│
└── "conversation-456" → Set
                      └── Response object C
```

### What happens in `addClient`

When you call:

```
addClient("conversation-123", res);
```

this happens:

```
const set = clients.get("conversation-123") ?? new Set();
```

- If `"conversation-123"` already exists, you get its `Set`.
- Otherwise, a new empty `Set` is created.

Then:

```
set.add(res);
```

The actual **Express `Response` object** is stored in that Set.

Finally:

```
clients.set("conversation-123", set);
```

So conceptually:

```
clients = Map {
  "conversation-123" => Set {
    res1,
    res2
  }
}
```

`res1` and `res2` are not the response body or JSON data. They are references to the live Express response objects for connected HTTP clients.

### Why store `Response`?

This pattern is commonly used for **SSE (Server-Sent Events)**.

For example, suppose two users have an open connection:

```
addClient("abc", res1);
addClient("abc", res2);
```

Then:

```
emit("abc", "message", { text: "Hello" });
```

does:

```
for (const res of set) {
  res.write(payload);
}
```

So both connected clients receive:

```
event: message
data: {"text":"Hello"}
```

### Important: it's only in server memory

This:

```
const clients = new Map<string, Set<Response>>();
```

is **not stored in a database** or Redis.

It's something like:

```
Node.js process memory
        │
        └── clients Map
              │
              ├── conversation A
              │     ├── Response 1
              │     └── Response 2
              │
              └── conversation B
                    └── Response 3
```

If the Node.js process restarts, **all of these connections disappear from the Map**.

Also, if you're running multiple Node.js instances:

```
Server 1 → clients Map #1
Server 2 → clients Map #2
Server 3 → clients Map #3
```

each instance has its **own** connected-client list. That's why a shared system such as Redis is often introduced when scaling SSE across multiple instances.

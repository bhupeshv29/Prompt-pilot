The **core MVP is done**. Next should be whatever stops projects from disappearing, not BYOK yet.

**1. Persist the project (this one next)**  
Pause/resume helps while E2B still has the VM. If the sandbox is gone for real, you still lose files. That’s what you listed as **S3** (and/or an E2B **snapshot**). Snapshot keeps the full environment; S3 keeps a copy of the source (`src/`, `package.json`) you can restore into a new sandbox. Do **snapshot + optional S3 tarball of `/home/user/project`**. Without this, every long idle / failed connect is a dead project.

**2. Groq context / 429s**  
You already drop `reasoning`. Next: cap history (last N messages, or summarize) so long chats don’t blow the token limit. Do this right after persistence if 429s are still common.

**3. BYOK**  
Only after a project can survive a dead sandbox. Otherwise people paste API keys into an app that can still wipe their site.

**Skip for now:** extra frameworks, RAG, git, teams, billing, WebSockets.

So: **next feature = project persistence (E2B snapshot, then S3 backup of the files).** Say when you want the step-by-step code.

S3 can wait. Persistence stays on E2B.

E2B has **three** related mechanisms. They are easy to mix up.

---

## 1. Pause / resume (same sandbox)

Same `e2bSandboxId`. You already do this when switching projects.

| Option                                                     | What is saved                           | On resume                          |
| ---------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| **Full pause** (`pause()`)                                 | Disk **and** RAM (Vite still “running”) | ~1s, same processes                |
| **Filesystem-only pause** (`pause({ keepMemory: false })`) | Disk only                               | Reboot; Vite is dead, files remain |

Paused VMs are kept **until you `kill()`**. Timeout today **kills** by default (`onTimeout: "kill"`). Your `timeoutMs` is **5 minutes**, so idle projects die unless you change that.

You can also set **`lifecycle.onTimeout: "pause"`** so expiry pauses instead of killing.

---

## 2. Named snapshot (`createSnapshot()`)

Point-in-time copy. Original sandbox **keeps running**. You get a `snapshotId`. Later:

```ts
Sandbox.create(snapshotId); // new sandbox, new id, restored files + memory
```

One snapshot → many new sandboxes. This is the real “checkpoint” and what `sandboxes.snapshot_id` is for.

---

## 3. Template (you already have this)

`promptpilot-react` is the **blank** starter. Not for user edits.

---

## What we will use

```text
Template          → first create only
Pause (full)      → user switches project / idle timeout
Named snapshot    → durable restore if connect() fails
S3                → later, copy of source files off E2B
```

**Not using** filesystem-only pause or `onResume: "reboot"` for now. Those drop Vite; the iframe would be blank until we restart the dev server. Full pause/snapshot keeps Vite in memory so preview comes back.

Flow:

```text
New conversation
  → Sandbox.create(template, { onTimeout: "pause" })

Open / send message
  → connect(e2bSandboxId)     // resumes if paused
  → if that fails AND snapshotId exists
        → Sandbox.create(snapshotId)
        → save new e2bSandboxId
  → if that fails too
        → 503 (do not recreate from blank template)

After a successful write / diff_apply
  → createSnapshot()
  → save snapshotId (replace previous)

Switch project / logout
  → pause()  (already there)
```

Postgres already has `snapshotId`. We start filling it.

S3 later: zip `/home/user/project` (without `node_modules` if you want) into a bucket. Restore = new template sandbox + unpack. Independent of E2B.

---

## First code change (create + connect)

In `sandbox.ts`, auto-pause on timeout and restore from snapshot:

```ts
const TIMEOUT_MS = 5 * 60 * 1000;

const lifecycle = {
  onTimeout: "pause" as const,
};

export async function createProjectSandbox() {
  const sandbox = await Sandbox.create(E2B_TEMPLATE, {
    timeoutMs: TIMEOUT_MS,
    lifecycle,
  });
  return toPreview(sandbox);
}

export async function connectProjectSandbox(e2bSandboxId: string) {
  const sandbox = await Sandbox.connect(e2bSandboxId, {
    timeoutMs: TIMEOUT_MS,
  });
  return toPreview(sandbox);
}

export async function createProjectSnapshot(e2bSandboxId: string) {
  const snapshot = await Sandbox.createSnapshot(e2bSandboxId);
  return snapshot.snapshotId;
}

export async function restoreFromSnapshot(snapshotId: string) {
  const sandbox = await Sandbox.create(snapshotId, {
    timeoutMs: TIMEOUT_MS,
    lifecycle,
  });
  return toPreview(sandbox);
}
```

Then in `GET /:id` and `POST /:id/messages` (and question resume), replace the 503-only catch with:

```ts
try {
  live = await connectProjectSandbox(conversation.sandbox.e2bSandboxId);
} catch {
  if (!conversation.sandbox.snapshotId) {
    return res.status(503).json({ error: "sandbox unavailable, retry" });
  }
  live = await restoreFromSnapshot(conversation.sandbox.snapshotId);
}

await prisma.sandbox.update({
  where: { id: conversation.sandbox.id },
  data: {
    e2bSandboxId: live.e2bSandboxId,
    previewUrl: live.previewUrl,
    status: "ready",
  },
});
```

After a successful `write` / `diff_apply` in the agent loop:

```ts
const snapshotId = await createProjectSnapshot(opts.sandbox.sandboxId);
await prisma.sandbox.update({
  where: { conversationId: opts.conversationId },
  data: { snapshotId },
});
```

Still **never** `createProjectSandbox()` except on `POST /conversations`.

If you want this applied in the repo next, say so. Otherwise paste those three pieces and we can wire the loop together.

Pause is **not** “still running.” It is **stopped and stored**. You are not billed for vCPU/RAM while it is paused.

E2B bills **per second only while the sandbox is Running**. Paused sandboxes do **not** count toward concurrency and are **not** billed as compute. They keep disk + memory so you can resume later.

```text
Running     → Vite live, iframe works,  you pay per second
Paused      → frozen (CPU off),         no compute charge
Snapshot    → checkpoint copy,          original can keep running or be paused
Killed      → gone forever              no charge, no resume
```

**Full pause** means RAM is _saved to a snapshot image_, not that the VM keeps executing. Vite is not serving until you `connect()`.

You still pay when:

- The user has the project **open** (running + preview)
- You leave it running instead of pausing (your 5‑minute timeout currently **kills** unless `onTimeout: "pause"`)
- You `createSnapshot()` while the original stays **running** — that original is billed until you pause or kill it

You do **not** pay running-sandbox rates for a paused project sitting in the sidebar.

Named snapshots are a **stored checkpoint**. E2B has said storage pricing for templates/snapshots _might_ come later; compute is the line item today.

**Practical setup (no extra idle cost):**

1. User opens a project → `connect` (running, billed)
2. User switches away / logs out → `pause()` (frozen, not billed)
3. Idle timeout → `onTimeout: "pause"` so it does not stay running and also does not get **killed**
4. After edits → `createSnapshot()` and save `snapshotId`. Then you can still **pause** the live sandbox. If pause/connect ever fails, spawn from `snapshotId`.

Kill only on **Delete conversation**.

S3 later is a copy of files **off** E2B, not a way to avoid pause charges — pause already avoids compute charges.




# testing

Use the UI plus one terminal. Backend and frontend both running.

---

### 1. Happy path (edit + snapshot)

1. Login → **New project**.
2. Send: `Change the heading in src/App.jsx to Hello Persist`.
3. Wait until the agent **finishes** (not mid-tool).
4. Preview shows **Hello Persist**.

That’s one snapshot at the **end** of the run, not after every write.

---

### 2. Switch project (disk pause)

1. **New project** (second conversation).
2. First project should pause (`409` if the agent is still running — wait, then switch).
3. Open the **first** project again.
4. Heading is still **Hello Persist** (Vite may take a couple of seconds to come back).

---

### 3. Pause blocked while busy

1. Send a longer prompt (`Make a landing page with a navbar`).
2. **Immediately** click another project.

Network: `POST /conversations/:id/pause` → **409** `agent already running`.  
The running sandbox should **not** freeze. Let the run finish, then switch.

---

### 4. Logout pause

1. Open a project with edits.
2. Logout (agent idle).
3. Login → open the same project.
4. Edits still there.

---

### 5. Second message while running

Send two prompts quickly on the same project.

Second `POST /messages` → **409** `agent already running`.

---

### 6. Snapshot actually saved

After a finished edit, in Postgres (or Prisma Studio):

```text
sandboxes.snapshot_id  is not null
sandboxes.e2b_sandbox_id  unchanged after switch/reopen
```

`snapshot_id` should change only after a run that **wrote files**, not after a chat-only reply.

---

### 7. Idle timeout (optional, ~5 min)

Leave a project open, wait past `TIMEOUT_MS` (5 minutes). It should **pause**, not vanish. Reopen → files still there, Vite restarts.

---

**Pass** if: edits survive switch/logout, pause/`messages` 409 while busy, `snapshot_id` set after a write run.

**Fail** if: heading resets to `App`, iframe stays blank after reopen (Vite didn’t start), or pause succeeds while tools are still running.

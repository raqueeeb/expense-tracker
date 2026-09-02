# Ledgerly / paisa-expense-tracker — Handoff

Next.js 15.5.25 · React 19 · TypeScript 5.9 · Prisma 6.19 · PostgreSQL · Auth.js (JWT) · Tailwind 3 · Recharts · Vitest

This document is the source of truth for what is **verified**, what is
**unverified**, and what to do next. Claims below are marked with how they were
checked. Nothing here is asserted as working unless it was actually run.

---

## 1. Current state

| Check | Status |
|---|---|
| `npm test` (vitest) | **32/32 passing** |
| `next build` — webpack compile | **Passing** ("Compiled successfully in ~24s") |
| `next build` — type check | **FAILS** — blocked on Prisma (see §2) |
| `npx tsc --noEmit` | **24 errors, all Prisma-stub-derived** |
| `npx prisma generate` | **FAILS** — blocked (see §2) |
| Database connectivity | **Never established** |
| Application runtime | **Never executed — not once** |

**Read this carefully:** no page, server action, or query in this app has ever
run. The review that produced the fixes below was static analysis plus
unit tests. That is not the same as a working application.

---

## 2. The one blocker

`prisma generate` cannot download its engine binaries. In the sandbox where this
work was done, `binaries.prisma.sh` was blocked at the network layer
(`403 host_not_allowed`). On a normal machine with open internet **this should
just work** — try it first:

```bash
npm install
npx prisma generate
```

If that succeeds, the blocker is gone and you can go straight to §4.

Things already ruled out, so don't repeat them:

- `prisma generate --no-engine` — same failure.
- `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` — skips the checksum, still needs
  the binary.
- `previewFeatures = ["queryCompiler", "driverAdapters"]` (the engine-free WASM
  client) — still requires the schema-engine binary at generate time. Tested.
- `prisma validate` / `prisma format` — gated behind the same download, so the
  schema could not even be syntax-checked.

**Do not** work around this by pointing `PRISMA_ENGINES_MIRROR` at an
unofficial host or by patching Prisma internals. This is an auth-handling
finance app; unverified binaries in that path are not an acceptable trade.

### Consequence: the 24 type errors

Every one of the 24 `tsc` errors is caused by `node_modules/.prisma/client`
being the ~4KB **placeholder stub** (`export declare const PrismaClient: any`)
rather than a real generated client. They are:

- `Module '"@prisma/client"' has no exported member 'PrismaClient' | 'Prisma' | 'TxType' | 'PaymentMethod'`
- `Parameter 't' | 'g' | 'c' | 'r' | 'tx' implicitly has an 'any' type` —
  a knock-on effect: untyped delegates make every `.map()` callback implicit any.

**Most or all of these should disappear the moment `prisma generate` succeeds.**

> **Do not silence these with `any`, `@ts-ignore`, or `skipLibCheck` tricks.**
> They are a signal that codegen has not run. Suppressing them destroys the type
> safety that is the main reason this project uses Prisma, and hides real bugs.
> Fix the codegen; then fix whatever genuinely remains.

---

## 3. Work already completed (5 commits, all verified)

`git log` has the full reasoning. Summary:

**`4879eaa` Baseline** — the existing source, placed under version control (there
was no git repo).

**`dbe8caf` fix(auth): user-enumeration timing oracle.** The dummy bcrypt hash
compared against when an email matches no account was 66 characters — not a
valid bcrypt hash. `bcrypt.compare()` rejects a malformed hash without doing key
derivation, so "no such user" returned in **0.21ms** vs **348ms** for "wrong
password" — a ~1600x gap letting anyone enumerate registered emails. It also used
cost 10 while registration uses cost 12. Replaced with a valid cost-12 hash in
`src/lib/dummy-hash.ts`. *4 regression tests, including a timing assertion.*

**`8a70eb1` fix(transactions): amounts stored 100x too large.** The most serious
bug found. `transactionSchema` *transforms* the amount (`"450.00"` → `45000`
minor units). The client resolver applied that transform, the form posted the
already-transformed value, and the server re-parsed it with the same schema —
transforming twice. **Typing ₹450.00 stored ₹45,000.** This corrupted dashboard
totals, balance, budget progress, analytics and CSV export. Fixed via
`src/lib/transaction-payload.ts`, which converts the amount back to a decimal
string so the server stays the single parsing authority. *8 round-trip tests;
verified load-bearing (reverting the fix fails 7 of them).*

**`5a45803` fix(ui): Field validation messages unreachable by screen readers.**
`Field` computed an `errorId`, rendered it, and never referenced it — so
`aria-describedby` appeared nowhere in the codebase. Affected every form. Now
wires `aria-describedby` + `aria-invalid`. *5 tests rendering real markup.* Also
adds `vitest.config.ts`, without which **no component test could run at all**
(tsconfig's `jsx: "preserve"` blocks the test runner's TSX transform).

**`fbb77b0` fix(auth): redirect loop + post-register signIn.** `getOptionalUser()`
trusted the JWT while `requireUser()` also checks the row exists, so a valid
cookie for a deleted account bounced forever between `/login` and `/dashboard`.
And `registerAction` called `signIn` outside its try block, so a failure after
account creation hit the error boundary. **⚠ These two are STATIC-VERIFIED ONLY**
— they need a live DB and are not covered by any test. Re-verify them yourself.

**`?` fix(build): TypeScript 7 → 5.9.** `package.json` allowed `typescript@^7`,
which Next 15.5.25 cannot build with: TS7 removed `baseUrl`, but Next's webpack
*requires* `baseUrl` to resolve `paths`, so every `@/*` import failed to resolve;
and Next cannot load `next.config.ts` under TS7 at all. Pinned to `^5.9.3` and
restored `baseUrl`. This is what took `next build` from "config won't load" to
"compiles successfully".

**Do not upgrade TypeScript to 7.x** until Next supports it, or the build breaks
again in a confusing way.

---

## 4. What to do next, in order

### Step 1 — Restore the toolchain

```bash
npm install
npx prisma generate          # must succeed before anything else
npx tsc --noEmit             # expect the 24 errors to largely vanish
```

Fix any errors that genuinely remain — without `any`. Pay particular attention
to `getMonthlyTrend` in `src/lib/queries.ts`: it uses `$queryRaw` with a
hand-written `{ bucket: Date; type: TxType; total: bigint }` type and converts
`bigint` via `Number()`. Nothing currently checks that shape, so it is the most
likely place for a real, still-hidden bug.

### Step 2 — Database

```bash
cp .env.example .env         # then fill in real values
# DATABASE_URL  — a real PostgreSQL connection string
# AUTH_SECRET   — openssl rand -base64 32
npx prisma migrate dev --name init
npx prisma db seed
```

### Step 3 — Install ESLint (confirmed missing)

`eslint.config.mjs` exists but `eslint` and `eslint-config-next` are **not in
package.json**, so `next build` prints *"ESLint must be installed in order to run
during builds"*. Lint has never run on this codebase. Expect a batch of new
findings.

```bash
npm install -D eslint eslint-config-next
```

### Step 4 — Verify the gate

```bash
npm test        # 32/32 must still pass
npx next build  # must reach the end
```

### Step 5 — ⚠ Verify the ₹450.00 flow against the real database

**This is the highest-priority manual test.** A unit test proving the payload
round-trips is *not* proof that the right integer landed in Postgres.

1. Sign up, add an expense of exactly **₹450.00**.
2. `SELECT "amountMinor" FROM "Transaction";` → must be exactly **45000**.
3. Dashboard must show **₹450.00**.
4. Analytics must show **₹450.00**.
5. CSV export must show **450.00**.

If any step shows ₹45,000 or 4500000, the fix in `8a70eb1` has regressed.

### Step 6 — Verify user isolation

Create two users, A and B, each with transactions, categories and a budget.
Then, as A, attempt to reach B's data:

- `/api/transactions/export?categoryId=<B's category id>` → must return **A's**
  rows only, never B's.
- Submit a transaction with `categoryId` set to one of B's → must be rejected.
- Submit an edit/delete with `id` set to one of B's transactions → must report
  "no longer exists", not succeed.

The code is written correctly for all of these (writes use
`updateMany`/`deleteMany` with `{ id, userId }` and check `result.count === 0`;
`assertOwnedCategory` re-checks ownership; the export route ignores any client
`userId`). **It has just never been executed.** Confirm it.

### Step 7 — Only then consider deploying

Do not deploy until `prisma generate`, `tsc`, `npm test` and `next build` all
pass, and steps 5 and 6 are confirmed.

---

## 5. Known issues NOT yet fixed

**Requires a schema change (so it was gated on Prisma):**

- Password changes do not invalidate existing JWT sessions. Needs a
  `passwordChangedAt` column on `User` and a comparison in the `jwt` callback.

**Confirmed by reading, not fixed (verify then fix):**

- Recharts tooltips have no dark-mode styling — `contentStyle` sets only font
  size and radius, so both charts render a **white tooltip box on dark
  surfaces**. Spec requires charts readable in both modes.
- `TransactionList`: the delete `error` state clears on confirm but not on
  cancel, so a failed delete leaves a stale message visible when a different
  row's dialog is opened.
- `Modal` focus trap matches `input`, which includes the hidden payment-method
  `<input type="hidden">` rendered for income — Tab can land on nothing visible.
- `BudgetForm` uses `(currentMinor / 100).toFixed(2)` instead of
  `minorToDecimalString` — float division on money, in a codebase whose entire
  discipline is avoiding exactly that.
- Analytics labels a filtered average as unfiltered: "Average monthly spend over
  the last six months" is computed only across months that had spending.
- The dashboard's "recent transactions" is all-time while the rest of the page is
  month-scoped. May be intended; reads oddly when browsing an old month.
- `package.json` says `paisa-expense-tracker`; the UI and CSV filename say
  Ledgerly.
- `package.json#prisma` config block is deprecated and removed in Prisma 7 —
  migrate to `prisma.config.ts`.

---

## 6. Architecture notes worth knowing

Three things are done well and are worth understanding before changing them:

1. **Money is integer minor units** (`src/lib/money.ts`). Floating point is
   touched only at the parse/display boundary. `0.1 + 0.2 !== 0.3`, and a budget
   app that drifts by a paisa per transaction is unfixable after the fact.
2. **Authorization is at the data layer, not middleware.** `requireUser()` reads
   the user id from the signed session cookie, never from a request body. Writes
   scope by `{ id, userId }` in a single statement rather than fetch-then-check,
   which closes the TOCTOU window.
3. **`getMonthlyTrend` uses `Prisma.sql` tagged templates**, so `${userId}` is a
   bound parameter, not string concatenation. Not injectable. Keep it that way.

Convention for this project: implement, test, explain, and be able to defend
each component in an interview. Don't generate large amounts of unexplained
code, and don't claim anything works until it has actually been run.

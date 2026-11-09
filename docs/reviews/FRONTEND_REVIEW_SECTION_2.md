# Frontend review section 2 — resource workflows and recovery

Baseline: clean main, b37b02b457b5f4c4b1581790e891946ffc2ebd78 (merged section 1).
This patch addresses frontend findings R32, R33, R34 and R35. It preserves the
section 1 session boundary and cookie/CSRF transport. It does not change backend
code, dependencies, schema, branding, hosting or public access.

## R32: the current request owns results and status

Search uses an explicit idle/loading/error/success state. Successful state stores
its query parameters alongside its results. Starting a newer search hides earlier
results; a failed search shows an error and Retry search, never a previous ZIP's
results under the new ZIP. Choosing to clear earlier results keeps the UI contract
small; no stale-results presentation or query-cache library is introduced.

Each search has an AbortController. A newer request, navigation or unmount aborts
the old one. Completion handlers also inspect that request's signal before updating
state, protecting against responses already completed or transports that ignore
cancellation. There is no independent finally block that can stop a newer spinner.
Resource-card save callbacks are ignored after their card unmounts; current saves
also update the current result snapshot. Section 1's user-keyed protected boundary
continues to reset all request-local data when accounts change.

Learning point: transport cancellation and permission to update UI state are
related but separate. A response must still belong to the active request.

## R33: submitted search intent has a reproducible URL

frontend/lib/search.ts defines normalization and serialization used by dashboard
submission, resource filters, URL parsing and the API client:

- ZIP: trim whitespace, require exactly five ASCII digits. Use the profile ZIP
  only when the URL omits zipCode; an explicit invalid/empty ZIP is not replaced.
- Category: accept only own keys in CATEGORY_LABELS; inherited names are rejected.
- Radius: whole-number miles 1 through 100, matching the backend range. The UI's
  existing default remains 25 and is always serialized. Blank, zero, fractional,
  infinite and out-of-range supplied values are rejected before HTTP requests.
- Keyword: trim outer whitespace and encode with URLSearchParams.

The common 10/25/50/100 choices remain. An in-range custom radius from a URL (for
example 37) gets a matching select option, so controls and requests agree.
Invalid links show validation feedback without fetching; the form can submit
corrected values. A radius-only link now expresses search intent. Plain /resources
still starts idle, even with a profile ZIP.

Manual submission navigates to the canonical query. Existing links are replaced
with the canonical query without adding a history entry. Fetching depends on the
normalized key, so this replacement does not duplicate the request. Resubmitting
the same search deliberately retries without adding duplicate history entries.
The form is keyed by the committed query, so Back/forward parameter changes reset
all fields together rather than retaining an unrelated unsent edit. Unsubmitted edits remain local form drafts.

Learning point: distinguish an editable draft from committed search intent. Only
the submitted URL determines which query's results may be displayed.

## R34: unavailable data is different from an empty collection

Saved and dashboard reads use a LoadState union: loading, success with data, or
error with a message. Failed initial loads cannot become successful empty loads
through alert dismissal. Failure notices have retry actions and remain until a
new request starts. Counts/category summaries say Unavailable on failure; genuine
empty messages are shown only after a successful empty response. Read requests
are cancelled on replacement/unmount and obsolete completions are ignored.

If deleting the final resource in the selected category removes that category,
the effective filter falls back to All. Other saved resources remain discoverable.
The dashboard metric now says Latest saves (up to 3), accurately describing its
existing latest-three selection rather than suggesting a date-based recency count.

Save/remove failures appear on their resource card. The original action remains
available for retry; a conflict response is not silently converted into success.
Mutations report success to parents only after the server succeeds, with guards
against duplicate pending submissions and callbacks from unmounted cards.

Learning point: an empty array is a result, not evidence that loading succeeded.
Model the outcome explicitly rather than infer success from a dismissed message.

## R35: one notes-editor lifecycle owns dismissal

Cancel, close, backdrop and Escape use one close function. Unchanged drafts close
directly; changed drafts require an explicit native discard confirmation. During
saving, closing controls and repeated Save are disabled, Escape does not dismiss,
and the textarea is read-only but remains available for reading/copying. A pending
message explains the state. Failed requests preserve the draft and re-enable retry.

Only the modal closes after a successful save; the card's update callback only
updates its parent collection. An unmounted editor ignores later callbacks, so an
old save cannot close a newly opened editor or overwrite its draft. Editing and
removing the same saved card are not started concurrently. Notes help now describes
plain text instead of promising Markdown rendering. The textarea has an explicit
accessible name; full modal focus/background behavior remains R36/section 3.

This does not add server version/conflict handling (R30), durable drafts across
page/account navigation, or cancellation/rollback of an already submitted write.

Learning point: updating the server and completing a particular editor instance
are different events. A completed write must not control a newer editor instance.

## Verification

Checks ran in an isolated copy using installed dependencies, without copying real
environment files or changing the user's checkout during preparation.

- Frontend: 136 tests in 11 files pass (50 additional cases over section 1).
- Lint, formatting, TypeScript and production Webpack build pass.
- Production HTTP regression harness passes both HTTPS flag modes, 3 reported
  tests total, preserving nonce/CSP, error/asset behavior and synthetic API transport.
- git diff --check passes.

New cases cover response reversal, obsolete errors/loading, new-search failure and
retry, shortcut canonicalization, manual and back/forward URL parameter changes,
custom/invalid filters, account changes, saved/dashboard failure recovery,
last-category deletion, mutation failure/conflict/retry, dirty dismissal paths,
pending notes protection and an obsolete save completing after a new editor mounts.
URL navigation tests use mocked Next hooks, not a real browser history implementation.
Native discard prompts are mocked in component tests. Browser/screen-reader,
PostgreSQL, provider, container and deployed-ingress acceptance remain separate.
No backend source changed, so the backend suite was not rerun for this patch.

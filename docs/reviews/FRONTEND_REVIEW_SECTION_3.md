# Frontend review section 3 — accessibility and responsive behavior

Baseline: clean `fix/accessibility`, 406290f (merged section 2 and the dependency
installer fix). This patch addresses R36–R39. Backend, dependencies, branding,
authentication rules and API contracts are unchanged. A new optional browser-test
command is added; it uses an already installed Chrome/Chromium executable.

## R36: the notes editor owns keyboard focus

Before: a styled overlay with `role="dialog"` announced a modal but did not make
the background inactive, contain keyboard navigation or restore the opener.

After: native `<dialog>` is opened with `showModal()`. The browser supplies the
modal top layer and makes background content inert. Initial focus goes to the
textarea; an explicit Tab/Shift+Tab boundary handler cycles enabled controls. This
handler also works while saving, when the read-only textarea is the only enabled
control. The connected opener receives focus on unmount, unless another dialog is
open. Unmount cleanup closes the native dialog and releases the scroll lock.

Native `cancel`, Cancel, close and backdrop gestures all use the section 2 draft
and pending-save guard. Dirty drafts still require confirmation; pending saves
block dismissal and edits; failures retain the draft. A backdrop gesture must
start and finish outside the dialog, so dragging out of the editor does not close
it. There is no focusable full-screen backdrop button.

The dialog scrolls within the viewport. Dynamic viewport units have a `vh`
fallback, and the textarea is capped at half the viewport height. At short/high
zoom-equivalent viewports the entire editor can scroll, keeping its controls
reachable rather than compressing the editor away.

Learning point: `aria-modal` describes behavior; it does not implement that
behavior. Native modality, explicit application close rules and keyboard checks
serve different purposes.

## R37: readable text and visible control boundaries

Small neutral text, placeholders, saved dates, distance labels and footer copy use
slate-600 on light surfaces. The landing hero's light text stays appropriate for
its dark background. Notes expansion uses amber-800, destructive ghost actions
use red-700, and the Coast Guard action/crest uses orange-700. Input, select and
textarea borders are darker; error borders and focus rings use red-600.

Ratios calculated from the installed Tailwind tokens (rounded):

| Foreground / background | Contrast |
| --- | ---: |
| Previous slate-400 / white | 2.63:1 |
| Slate-600 / white | 7.56:1 |
| Amber-800 / amber-50 | 6.88:1 |
| Red-700 / red-50 | 5.88:1 |
| White / orange-700 | 5.23:1 |

The browser test separately checks computed helper, placeholder and footer text
against the actual white surface, with a 4.5:1 threshold. Its 8-bit sRGB rendering
measurement is approximately 7.58:1 for slate-600. Decorative colors and disabled
control opacity are not treated as ordinary text contrast failures.

Learning point: a color's name or shade number does not establish contrast. Check
the actual foreground/background pair and text size.

## R38: semantics, labels and validation

Navigation CTAs are now single links with shared `buttonStyles`, replacing
`<Link><Button>…</Button></Link>`. Actual actions remain native buttons, which
default to `type="button"`; submit buttons explicitly opt in. The root layout
owns the only main landmark; the dashboard's nested main is removed. A visible-on-
focus skip link targets the focusable main content.

Input and Select generate unique IDs with `useId`, preserve explicit IDs and refs,
merge caller descriptions with their visible hint/error, and expose invalid state.
Duplicate labels no longer create duplicate IDs. Registration's custom validation
connects errors to the affected field and focuses that field. The legal checkbox
is required, and the submit button remains discoverable before acceptance so
native required-field feedback can explain what is needed. The select retains its
native dropdown affordance.

Learning point: visual styling can be shared without sharing an HTML element.
Navigation, actions and field descriptions need the semantics of their actual job.

## R39: state, announcements, motion and reflow

Primary navigation exposes `aria-current="page"`; saved category controls expose
`aria-pressed`; note expansion exposes `aria-expanded` and `aria-controls`.
Repeated save/edit/remove/call/website actions include the resource name, and
external website names mention the new tab. Removing the currently focused card
moves focus to the saved-list heading; a user who has moved focus elsewhere is
left in place.

Persistent polite output regions announce search/load/filter counts. Successful
saves retain their announcement even when the parent immediately updates the
resource prop. LoadingSpinner supplies accessible loading text by default; pages
with their own status region disable its duplicate announcement. Errors retain
assertive alerts, while informational/success notices use polite status semantics.

Reduced-motion preferences disable spinner animation and smooth scrolling.
Shared buttons, category controls and icon dismissals have a 44px minimum height;
icon dismissals also have a 44px minimum width. Navigation and saved headers wrap
at narrow widths. Resource names/descriptions wrap instead of being clipped, and
dashboard grids use an explicit single column below their responsive breakpoints
so long content cannot set a wider implicit column.

Learning point: visible state changes need an accessible counterpart. Test the
state transition, keyboard path and layout with difficult content, not just the
initial screenshot.

## Verification and repeatable checks

Prepared and checked in an isolated checkout using installed dependencies, without
copying real environment files. Final checks:

- 149 frontend tests in 12 files pass (13 additional cases).
- TypeScript, lint, formatting and production Webpack build pass.
- Production HTTP security regressions pass in both HTTPS flag modes, 3 tests total.
- The Chrome browser smoke test passes against an isolated production build and a
  synthetic loopback API. It checks real Tab/Shift+Tab, native background inactivity,
  focus restoration, skip navigation, clean/dirty/pending Escape, accessible dialog
  naming, reduced motion, computed contrast and long-content layouts at
  320/768/1280 CSS pixels. The notes controls also remain reachable at 320×200,
  equivalent in dimensions to a 1280×800 viewport at 400% zoom. This uses viewport
  emulation, not browser toolbar zoom.
- Guest landing, login, registration and legal pages are included in reflow checks.
- `git diff --check` passes.

From `frontend`, run the usual checks and the optional browser smoke test:

```sh
npm run test:run
npm run type-check
npm run lint:check
npm run format:check
npm run test:security:http
BROWSER_EXECUTABLE='/path/to/chrome-or-chromium' npm run test:accessibility:browser
```

The browser test requires Node with built-in WebSocket support (verified with
Node 24) and an installed Chromium browser. It creates temporary build/profile
folders, starts local servers, and removes them after the run. It downloads no
browsers and does not open a personal browser profile. jsdom tests mock only the
native dialog open/close lifecycle; they do not claim to prove native modality.

This closes the four implementation findings within the reviewed flows. Manual
VoiceOver/NVDA acceptance, Safari/Firefox coverage and deployed/provider/backend
end-to-end acceptance remain separate. These checks are not a full WCAG audit or
closure of the broader testing/architecture review findings. No backend source
changed, so its suite was not rerun.

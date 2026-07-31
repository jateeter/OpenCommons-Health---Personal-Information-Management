# Wellness Landing Scoring and Spider Graph

This document specifies the landing view introduced for
[issue #32](https://github.com/jateeter/OpenCommons-Health---Personal-Information-Management/issues/32):
a dynamic wellness spider (radar) graph that replaces the connection-status-first
landing page, with the pod status page kept and reachable.

These rules are **owner-facing orientation heuristics for the localhost MVP, not
clinical decision support and not medical advice.** They exist to answer "where
should I look first?" at a glance. They do not diagnose, and they must never be
presented as a clinical assessment.

---

## View model

The single-page UI has three views. `wellness` is the landing view.

| View | Element | Reached by |
|---|---|---|
| `wellness` *(landing)* | `#view-wellness` | Default on load; brand link; "Wellness" nav item |
| `records` | `#view-records` | Any domain nav item, spider data point, or browse tile |
| `status` | `#view-status` | Masthead connection pill; "Pod status" nav item |

The connection pill in the masthead is the only connectivity signal on the
landing view. All prior pod-status content (pod management panel, containers,
owner activity, HealthKit mirror, Epic panel) moved unchanged into `#view-status`.

## Axis domains vs browse domains

Six domains carry a wellness signal and are plotted as colour-coded vectors:

| Axis domain | Label | Colour |
|---|---|---|
| `vital-signs` | Vitals | `#0f8a8d` |
| `lab-results` | Labs | `#2f6bd8` |
| `medications` | Meds | `#7a5bd0` |
| `conditions` | Conditions | `#c2557a` |
| `allergies` | Allergies | `#d1762f` |
| `immunizations` | Vaccines | `#3f9142` |

Five domains are reference or administrative records with no meaningful "current
value" on a wellness scale. They are excluded from the graph and presented in the
browse/navigation row beneath it, each with a record count: `profiles`,
`providers`, `insurance-policies`, `documents`, `workflow-tasks`.

Both lists are defined once in [`src/wellness.ts`](../src/wellness.ts)
(`WELLNESS_AXIS_DOMAINS`, `WELLNESS_BROWSE_DOMAINS`) and mirrored by the client
in [`public/app.js`](../public/app.js). All 11 domains remain first-class in the
left navigation and in the domain APIs — nothing was removed.

## Score and status model

Each axis yields a normalized score in `0–100` (plotted as the point's distance
from centre) and an indicator status:

| Status | Meaning | Colour |
|---|---|---|
| `green` | In target range / up to date | `#2b9a73` |
| `yellow` | Attention suggested — borderline, due soon, or stale data | `#d9a441` |
| `red` | Out of range / overdue / action needed | `#cf5240` |
| `empty` | No records in this domain yet | `#a9b6b1` |

`empty` is distinct from a low score: a domain with no data plots at a small
fixed radius with `score: null`, so an unpopulated pod does not read as "unwell".

### Vital signs

Only the **newest observation per measurement code** is scored, so an old
outlier cannot drag the axis down. Each value is classified against an adult
general-population screening range, with a fractional margin outside the range
treated as borderline rather than out-of-range:

| Code | Range | Borderline margin |
|---|---|---|
| `heart-rate` | 60–100 beats/min | 10% |
| `respiratory-rate` | 12–20 breaths/min | 15% |
| `body-temperature` | 36.1–37.2 °C | 2% |
| `oxygen-saturation` | 95–100 % | 3% |
| `bmi` | 18.5–24.9 kg/m² | 20% |
| `blood-glucose` | 70–140 mg/dL | 15% |
| `blood-pressure` | 90–120 systolic / 60–80 diastolic mmHg | 12% |

Blood pressure contributes both systolic and diastolic as separate bands. Codes
without a range (`body-weight`, `body-height`) do not contribute a band.

Score is the mean band weight (in-range `1.0`, borderline `0.6`, out-of-range
`0.15`) × 100, minus 15 if the newest observation is over a year old.
Status: any out-of-range band → `red`; any borderline band or stale data →
`yellow`; otherwise `green`.

### Lab results

Only the newest result per LOINC code is scored, and only those within the last
**two years**. If every result is older, the axis is `yellow` at score 50.
Weights: `critical-high`/`critical-low` `0.1`; `high`/`low`/`abnormal` `0.5`;
otherwise `1.0`. Status: any critical → `red`; any abnormal → `yellow`;
otherwise `green`. Reference ranges already stored on the record are not
re-derived — the recorded `interpretation` is authoritative.

### Medications

Signal is active-medication burden, not adherence (the data model has no
dispense or refill events yet). Score `100 − 6 × activeCount`. Status: ≥10
active → `red`; ≥5 active → `yellow` (the commonly used polypharmacy review
threshold); otherwise `green`.

### Conditions

Active statuses are `active`, `recurrence`, `relapse`. Score
`100 − 15 × activeCount − 20 × severeActiveCount`. Status: any active condition
marked `severe` → `red`; any active condition → `yellow`; otherwise `green`.

### Allergies

Score `100 − 10 × activeCount − 25 × severeReactionCount`. Status: any active
allergy with a `severe` reaction, or more than 5 active → `red`; more than 2
active → `yellow`; otherwise `green`.

### Immunizations

Graded on the currency of the newest **completed** dose: within 1 year →
`green` (score tapers 100 → 80 across the year); 1–3 years → `yellow` at 60;
over 3 years → `red` at 25. A completed immunization with no parsable date is
`red` at 30. Per-vaccine schedules (e.g. CVX-specific intervals) are future
work; this is a single recency signal.

## API

`GET /api/wellness/summary` returns the aggregated summary. It requires an
authenticated owner session (401 otherwise) and is GET-only (405 otherwise).

```json
{
  "data": {
    "generatedAt": "2026-07-29T12:00:00.000Z",
    "axes": [
      {
        "domain": "vital-signs",
        "label": "Vitals",
        "score": 88,
        "status": "green",
        "summary": "Latest measurements are within their screening ranges.",
        "latestAt": "2026-07-26T09:12:00.000Z",
        "recordCount": 7
      }
    ],
    "browse": [{ "domain": "providers", "count": 3 }]
  }
}
```

### Privacy boundary

The summary is **derived, non-identifying data by construction**: it carries
scores, statuses, record counts, and fixed owner-facing sentences. It never
carries measurement values, codes, notes, performer or prescriber names, or pod
resource URLs. Axis summary sentences are generated from counts only. This is
enforced by tests in
[`tests/unit/httpApp.test.ts`](../tests/unit/httpApp.test.ts), which assert the
response body contains no direct identifiers and none of the seeded record
values. The endpoint stays inside the authenticated owner boundary; it is not an
anonymized-release surface and requires no owner-approval headers because it
never leaves the owner's own session.

## Behaviour

- **Dynamic.** The graph refreshes on load, on view entry, and after any record
  create/update/delete or Epic apply.
- **Minimal text.** The landing view carries only the `Wellness` title, the
  three-item status legend, six axis labels, and browse tile labels with counts.
  Full detail for each axis is in the point's tooltip and accessible label.
- **Navigation.** Clicking or keyboard-activating a data point or axis label
  opens that domain's record list; clicking a browse tile opens that domain's
  list.
- **Degraded state.** When the pod is unreachable, the landing view keeps its
  layout and shows a short message pointing at Pod status, with the browse row
  still rendered at unknown counts. It does not revert to a status-first page.
- **Accessibility.** The SVG has a descriptive `role="img"` label; each data
  point is focusable with `role="button"` and an `aria-label` carrying its
  domain, status, score, and reason. Status is never conveyed by colour alone —
  the tooltip and accessible label both name the status in words.

## Scope

This work targets the responsive web UI, which is the supported localhost MVP
surface and covers iPhone-class viewports (breakpoints at 800px and 480px).
Native iPad/iPhone packaging remains on hold per
[`LOCALHOST_MVP_SCOPE.md`](./LOCALHOST_MVP_SCOPE.md); when that track resumes,
this document defines the landing experience it should implement, and
`/api/wellness/summary` is the contract it should consume.

Known future work: per-vaccine immunization schedules, medication adherence once
dispense data exists, HealthKit-derived activity as an additional axis, and
age/sex-aware vital ranges sourced from the stored profile.

# OpenCommons Health PIM VC + Partner Pitch V2 Podcast Script

Companion audio narrative for
`docs/pitch/OpenCommons_Health_PIM_VC_Partner_Pitch_v2.pptx`.

## Production notes

- Format: single-host executive podcast / narrated pitch companion.
- Intended audience: venture investors, strategic health-system partners,
  payer innovation teams, device ecosystem partners, and senior-care partners.
- Recommended tone: calm, confident, strategic, and practical.
- Approximate runtime: 7 to 9 minutes, depending on voice and pace.
- Privacy posture: do not include patient identifiers, credentials, raw Epic
  payloads, HealthKit samples, or local Pod URLs.

## Narration script

Welcome to the OpenCommons Health PIM VC and partner pitch.

OpenCommons Health PIM is building the personal health data layer for an
interoperable healthcare economy.

The idea starts with a simple premise: the individual should be the point of
control for their own health information. Not the portal. Not the device cloud.
Not a new centralized app database. The person.

Today, health data is everywhere and nowhere at once. It lives in electronic
health records, MyChart portals, payer records, wearable devices, PDFs,
provider directories, medication lists, and the private notes people keep for
themselves and their families. Healthcare has APIs now. It has standards. It
has patient access rules. But patients still do not have a trusted control
plane that lets them receive, organize, review, and permission that information
on their own terms.

That is the opening for OpenCommons.

The current application is a local-first personal health information manager.
At the center is the authenticated owner’s Solid Pod. That Pod is the source of
authority for application-managed personal health information. The browser UI,
the local APIs, the Epic connector foundation, HealthKit Bridge visibility, and
future AI services all operate around that owner-controlled data layer.

This is not another patient portal. It is not a replacement electronic health
record. It is a patient-owned health operating layer that can sit above
institutional systems and below partner services.

Why now?

The interoperability rails are finally real enough to matter. FHIR APIs,
SMART-on-FHIR authorization, patient access requirements, and consumer device
ecosystems have changed what is technically possible. At the same time,
centralized health-data aggregation has become harder to trust. The market has
digitized access, but it has not solved agency.

OpenCommons is designed for that gap.

It receives and organizes health information in standards-aligned domains:
profile, conditions, medications, allergies, immunizations, vital signs,
providers, lab results, insurance policies, clinical documents, and workflow
tasks. Those domains align with familiar healthcare concepts such as FHIR,
SNOMED CT, RxNorm, CVX, LOINC, Solid, RDF, ShEx, and OpenAPI.

That standards posture matters because the goal is not just to display records.
The goal is to make health information portable, reviewable, verifiable, and
useful across workflows.

The product has two sides.

The first is the owner-controlled core: the local Solid Community Server, the
authenticated Pod, the eleven domain APIs, RDF and Turtle storage, ShEx
validation, and the owner-approved anonymized release boundary.

The second is the integration edge: Epic SMART and FHIR import foundations,
HealthKit Bridge status and device-signal observability, terminology-coded
records, preview and reconciliation before Pod writes, and eventually
partner-specific workflows.

The strategic difference is straightforward.

Most health apps aggregate personal health information into a
service-controlled cloud database, and then add consent on top. OpenCommons
starts from the opposite direction. Identifiable PHI remains in the owner’s
Pod. Applications and partners become clients of owner authority.

That matters commercially. It means partners can build useful services without
requiring OpenCommons to become the central custodian of every user’s
identifiable record.

Now we get to the larger opportunity: AI.

OpenCommons is not simply building a place to store health records. It is
creating the trusted data foundation for governed personal health AI.

The PIM supplies the personal data vault. Epic and FHIR supply clinical source
data. HealthKit Bridge supplies continuous real-world signal from Apple
HealthKit and similar device ecosystems. Deterministic behavior-shaping engines
supply the governance layer that constrains what AI can observe, summarize,
recommend, or trigger.

That combination is the real platform opportunity.

In many healthcare AI products, the AI is either under-informed or
over-permissioned. It is either a general assistant without enough personal
context, or it requires centralized access to sensitive data. OpenCommons gives
us a different architecture. AI services can operate against structured,
standards-aligned, owner-controlled records, while deterministic engines keep
the behavior scoped, testable, auditable, and purpose-bound.

This supports several service lines.

First, a personal health cockpit. The individual gets a longitudinal view of
clinical records, device context, documents, tasks, medications, conditions,
labs, vitals, insurance, and provider relationships. The AI layer can help
surface gaps, stale records, preparation needs, and follow-up tasks without
turning the landing page into a PHI disclosure surface.

Second, wellness preparation. The Annual Medicare Wellness workflow is the
beachhead. It is recurring, high-value, multi-source, and consent-heavy. Before
a visit, OpenCommons can help the owner understand record status and gaps.
During or after the visit, it can help reconcile changes to medications,
conditions, vitals, documents, recommendations, and follow-up tasks. The value
is administrative intelligence, continuity, and preparation, not unsupervised
diagnosis.

Third, device-to-context monitoring. HealthKit Bridge brings authorized
HealthKit signals into the local ecosystem through a bridge and deterministic
Perception Engine contract. The PIM can show device-derived status and
eventually owner-approved observations as reviewable context for vitals,
activity, sleep, and wellness workflows.

Fourth, a partner service layer. Health systems, payers, device companies,
caregiver networks, and research partners can deliver services around the
owner-controlled record. They can help with navigation, preparation, coaching,
document management, anonymized release, and workflow follow-up without taking
default custody of all identifiable PHI.

The governance layer is what makes this credible.

The Solid Pod decides what AI can observe, summarize, or release. Owner
approval, provenance, and declared purpose bind external actions. Behavior
shaping and deterministic state machines constrain AI into governed workflow.
Diagnostics and tests make outputs inspectable and repeatable.

In other words, the AI is not positioned as an unconstrained clinical oracle.
It is positioned as a workflow assistant operating inside a patient-owned data
authority and a deterministic control system.

That is an important distinction for investors and strategic partners.

The beachhead workflow is Annual Medicare Wellness. It naturally spans the
domains that make the PIM valuable: profile, conditions, medications,
allergies, immunizations, vitals, labs, insurance, documents, providers, and
tasks. It is a workflow where preparation and reconciliation are real pain
points, where partners can see value quickly, and where patient control is a
feature rather than a blocker.

For partners, OpenCommons creates a way to participate in health data workflows
without owning the patient.

Health systems can reduce friction in patient-facing import, review, and
longitudinal preparation workflows. Payers can support owner-mediated records
and documents that complement patient access strategies. Device ecosystems can
land authorized telemetry into a privacy-preserving personal context. Research
and public-good efforts can receive anonymized, owner-approved releases rather
than raw PHI resale.

The commercial model follows the trust posture.

The first motion is design-partner pilots: paid work with health systems, payer
innovation teams, senior-care networks, and device partners. The second is AI
and integration services: governed workflow packages, connector work, mapping,
validation, deployment, and support. The third is a personal client tier:
premium local and native experiences for individuals and caregivers, with no
business model dependency on PHI resale.

The venture thesis is that a trust-native product can unlock regulated
partnership value without taking the most expensive and risky custody posture
by default.

Defensibility compounds across four layers.

First, data authority: the owner-controlled Pod and local-first posture.
Second, standards graph: FHIR-style domains, SMART and FHIR, Solid, ShEx,
OpenAPI, and terminology systems. Third, deterministic engines: behavior
shaping, source diagnostics, repeatable tests, and constrained actions. Fourth,
workflow memory: preview, reconciliation, provenance, audit, and domain-specific
user experience.

This is not a patent-heavy moat story. It is an execution moat. The difficulty
is in making privacy, interoperability, deterministic control, AI assistance,
and local deployment all work together without collapsing into either a toy
demo or another centralized health database.

The roadmap is disciplined.

Now, keep the localhost MVP stable: eleven domains, Solid Pod authority,
OpenAPI documentation, local and container deployment, and owner-mediated
workflows.

Next, harden Epic sandbox integration: dynamic JWT, preview diagnostics, and
controlled import behavior.

Then, prove the Annual Wellness partner workflow with real use cases.

After that, expand document handling, workflow tasks, HealthKit Bridge
observability, and governed AI services.

Finally, scale into native, hosted, and enterprise options only when the trust
model and partner value are proven.

The wedge is not another personal health record. The wedge is a personal health
AI operations layer: owner-controlled data, clinical and device context,
deterministic behavior shaping, and permissioned outputs that partners can
trust because individuals remain in control.

That is the rare overlap that venture investors and strategic partners both
care about: a large regulated market, standards tailwinds, privacy-first AI,
and a practical wedge into recurring health workflows.

The ask is direct.

We want two to three design partners around Annual Wellness, document import,
caregiver workflows, or device-context services.

We want capital to harden Epic and HealthKit integration, deterministic AI
services, security posture, and pilot operations.

And we want proof through measured pilots: connection success, records
reconciled, owner-approved writes, AI-assisted workflow value, and partner
workflow utility.

OpenCommons Health PIM is personal health, held by you.

It is the patient-owned control plane for a more trustworthy AI-enabled health
economy.

# OpenCommons Health PIM Patient Guide

OpenCommons Health PIM is a personal health record application for individuals
who want to keep health information in a private, owner-controlled Solid Pod.
The application is designed around a simple idea: your health record should be
stored under your control, visible to you, and shared only when you approve the
release path.

The screenshots below were captured from a local review deployment using
non-identifying demo data.

## What you see when you open the application

![OpenCommons Health overview](assets/patient-pim-workflows/01-health-overview.png)

The main screen is organized around three patient tasks:

1. Choose the part of your health record from the left navigation.
2. Review the records currently stored in that category.
3. Add, edit, or delete records in your personal Solid Pod.

The top-right connection badge tells you whether the application can reach your
Pod. When it says `Pod connected`, the PIM is authenticated and can read/write
owner-controlled records. The summary cards show:

- how many records are in the selected category;
- whether the Solid Pod is connected;
- that the deployment is local, meaning records are managed on the local
  personal infrastructure rather than a public cloud service.

## Your Solid Pod management panel

![Owner-controlled Solid Pod panel](assets/patient-pim-workflows/02-pod-management.png)

The Pod Management panel is the patient’s control center for storage and release
status. It shows:

- authenticated owner access state;
- the number of visible health domains;
- the local Solid server and Pod root;
- the Pod storage surfaces used or planned for HealthKit observations,
  documents, workflow tasks, owner consent records, and audit metadata;
- recent local owner actions such as record changes and approved/denied
  anonymized release attempts;
- the release rule for external sharing.

The important privacy rule is visible in the panel: identifiable personal health
information stays in the authenticated owner Pod. External release is
anonymized-only and requires owner approval plus a declared purpose.

The recent activity view is a safe operational summary. It is designed to show
that the local app is reaching the correct Pod and that owner actions are being
recorded, without showing tokens, secrets, raw clinical notes, or full Pod URLs.

The managed domains currently visible in the patient UI are:

- Profiles
- Conditions
- Medications
- Allergies
- Immunizations
- Vital signs
- Providers
- Lab results
- Insurance
- Documents
- Workflow tasks

## Workflow: add a medical condition

![Add condition with SNOMED CT](assets/patient-pim-workflows/03-add-condition-snomed.png)

To add a condition:

1. Select `Conditions`.
2. Choose `Add record`.
3. Search by condition name or SNOMED CT code.
4. Review the auto-filled coding fields.
5. Add status, severity, dates, and patient notes.
6. Choose `Save to pod`.

SNOMED CT codes help make the condition understandable across health systems.
The app keeps the code, system URI, and display name visible so the patient can
review what will be saved.

Patient note guidance: keep notes useful for your care, but avoid entering
unnecessary identifiers or unrelated personal details.

## Workflow: add a medication

![Add medication with RxNorm](assets/patient-pim-workflows/04-add-medication-rxnorm.png)

To add a medication:

1. Select `Medications`.
2. Choose `Add record`.
3. Search by medication name or code.
4. Confirm the RxNorm, RxTerms, or MED-RT coding fields.
5. Add status, dosage instructions, dates, prescriber, reason, and notes.
6. Choose `Save to pod`.

RxNorm and RxTerms support specific medication entries. MED-RT supports
class-level medication concepts when that is more appropriate.

## Workflow: add a lab result

![Add lab result with LOINC](assets/patient-pim-workflows/05-add-lab-result-loinc.png)

To add a lab result:

1. Select `Lab results`.
2. Choose `Add record`.
3. Search by LOINC name or code.
4. Enter the result value, unit, interpretation, date/time, performer, and notes.
5. Choose `Save to pod`.

LOINC codes identify laboratory and observation concepts. Keeping the code and
display name together helps future imports, exports, and review workflows stay
consistent with FHIR-style data exchange.

## Workflow: add a clinical document

![Add clinical document metadata with LOINC](assets/patient-pim-workflows/06-add-document-loinc.png)

Documents store metadata about owner-held clinical materials, such as visit
summaries, reports, plans, or notes. A document entry may point to a Pod-held
binary or source document URL, but the patient should avoid pasting unnecessary
full clinical text into the title or notes.

Typical steps:

1. Select `Documents`.
2. Choose `Add record`.
3. Search for the document type, often using LOINC.
4. Add status, title, category, authored date, source system, custodian, and
   notes.
5. Choose `Save to pod`.

## Workflow: manage a care task

![Add workflow task with SNOMED CT](assets/patient-pim-workflows/07-add-workflow-task-snomed.png)

Workflow tasks help the individual track care-related next steps without sending
outbound messages from the MVP application.

Examples include:

- review a preventive care plan after an annual wellness evaluation;
- follow up on a lab result;
- bring a medication question to a visit;
- track a document review or insurance action.

Typical steps:

1. Select `Workflow tasks`.
2. Choose `Add record`.
3. Search for the task type.
4. Set status and intent.
5. Add the owner-facing task description, due date, requester, owner, and notes.
6. Choose `Save to pod`.

## Workflow: review information after an Annual Medicare Wellness Evaluation

After an Annual Medicare Wellness Evaluation, the patient can use the PIM to
organize updates before deciding what to keep:

1. Review imported or manually entered conditions, medications, vital signs,
   documents, and workflow tasks.
2. Confirm that coded entries use the appropriate terminology system:
   - SNOMED CT for conditions, allergies, and many task concepts;
   - RxNorm, RxTerms, or MED-RT for medications;
   - LOINC for labs, vital signs, and clinical document metadata.
3. Save only the owner-reviewed records to the Pod.
4. Use workflow tasks to track follow-up items such as preventive screenings,
   medication reviews, or document review.
5. Release data externally only through the anonymized, owner-approved release
   path.

## Local API and privacy documentation

![Local API documentation](assets/patient-pim-workflows/08-local-api-docs.png)

Most patients will use the browser interface. The local API documentation is
available for technical users, caregivers, or developers who are helping the Pod
owner validate the deployment.

Useful local links:

- `/api/docs` shows local API documentation and action examples.
- `/fhir/metadata` exposes FHIR CapabilityStatement-style metadata.
- `/api/privacy/schema` describes identifiable and anonymized release schemas.
- `/api/pod/activity` shows owner-visible Pod activity and storage-surface
  status without exposing PHI or credentials.

The owner-facing API can read and write identifiable records only through the
authenticated local Pod configuration. External release must use anonymized
endpoints and must include owner approval and a release purpose.

## Patient safety and privacy checklist

Before using the PIM for real personal health information:

- Confirm the connection badge says `Pod connected`.
- Confirm the Pod root shown in the Pod Management panel is the expected owner
  Pod.
- Use standard terminology search where possible, but manually review the code,
  system, and name before saving.
- Avoid entering unnecessary identifiers in free-text notes.
- Treat local HTTP as a development/local-review configuration only.
- Do not share screenshots that contain real personal health information unless
  you have intentionally reviewed and approved that sharing.

## What this guide does not mean

This guide describes the current patient-facing UI and local information
management workflows. It is not medical advice, a diagnosis tool, or a
replacement for a clinician’s medical record. The PIM is an owner-controlled
personal information system: the patient decides what to store, review, and
release.

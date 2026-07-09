# End-user guide: Epic/MyChart connection and Medicare Wellness updates

This guide describes the intended patient-facing workflow for connecting
OpenCommons Health PIM to Epic/MyChart through standards-based authorization.
The current implementation already stores health data in the owner's Solid pod;
the Epic workflows below are the roadmap target for the next development cycle.

## What OpenCommons will ask you to do

1. Open OpenCommons Health PIM.
2. Choose **Connect Epic/MyChart**.
3. Select your provider organization when prompted.
4. Sign in using the provider's Epic/MyChart authentication page.
5. Review the data categories OpenCommons is requesting.
6. Approve the connection only if you want OpenCommons to import those records
   into your personal Solid pod.
7. Review a preview before anything is saved.

OpenCommons should ask only for the minimum data needed for the feature you are
using. You can disconnect the Epic account and remove imported records from your
pod.

## What is stored

With your approval, OpenCommons stores copies of selected records in your Solid
pod so that you can maintain a personal health information record under your
control. Examples include:

- profile and demographic information;
- conditions and active health concerns;
- medication and allergy information;
- immunizations;
- vital signs and lab observations;
- insurance coverage;
- clinical documents such as after-visit summaries;
- messages, tasks, or forms only when supported and approved.

## What is not released

Your identifiable personal health information is not released through the
anonymized pod API. If you approve a release for research, care coordination, or
another purpose, OpenCommons uses the anonymized release API. That API removes
direct identifiers such as names, member IDs, provider identifiers, record URLs,
free-text notes, exact dates, and document source URLs.

## Annual Medicare Wellness Evaluation update

After an Annual Medicare Wellness Evaluation, OpenCommons should guide you
through a structured update:

1. Choose **Medicare Wellness Update**.
2. Select the visit date or date range.
3. Review updated profile details and insurance coverage.
4. Review updated diagnoses or risk factors.
5. Reconcile medications and allergies.
6. Review immunizations and preventive-care reminders.
7. Review vitals, BMI, blood pressure, screening scores, and related lab
   observations.
8. Save the visit summary or after-visit document in your pod.
9. Confirm which changes should become part of your PIM record.

The PIM should show what changed since the previous record and should never
force you to overwrite local pod data silently.

## Documents and messages

OpenCommons should treat documents and messages as sensitive owner-held
materials:

- documents are stored with owner-only access controls;
- unavailable documents are clearly marked instead of silently ignored;
- messages and tasks are read-only until a specific health-system workflow
  allows safe outbound writes;
- any outbound communication feature must show exactly what will be sent before
  sending.

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| Connection expired | Epic authorization needs renewal. | Reconnect from the PIM. |
| Scope missing | The provider did not grant a needed data category. | Continue with available sections or reconnect with the needed scope. |
| Resource unavailable | The provider's Epic environment does not expose that resource. | Use manual entry or contact support if it should be available. |
| Pod write failed | The local Solid pod could not save a record. | Check pod status and retry. |
| Anonymized release denied | Owner approval or release purpose is missing. | Approve the release and enter a purpose if you intend to share anonymized data. |


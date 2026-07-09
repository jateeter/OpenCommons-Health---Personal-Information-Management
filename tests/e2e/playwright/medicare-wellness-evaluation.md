# Playwright E2E use case: Annual Medicare Wellness Evaluation update

This use case is the acceptance target for the next development cycle. The
current automation runner is `scripts/playwright-medicare-wellness-e2e.mjs`.

## Preconditions

- Start either supported local deployment:
  - container: `APP_PORT=18080 CSS_PORT=13000 ./scripts/local-container-up.sh`
  - host-local: `APP_PORT=18080 CSS_PORT=13000 ./scripts/local-host-solid-up.sh`
    then `./scripts/local-host-start.sh`
- Verify the stack:
  `./scripts/verify-deployment.sh http://localhost:18080 http://localhost:13000`
- Set `APP_URL=http://localhost:18080`.

## User story

As the authenticated Pod owner, I want to update my personal health information
after an Annual Medicare Wellness Evaluation so that my Solid pod reflects
current coverage, medications, problems, preventive care, vitals, labs, and
visit documentation while any external release remains anonymized.

## Scenario

1. Open the PIM UI.
2. Confirm the pod is connected.
3. Update or create:
   - profile demographics;
   - Medicare insurance coverage;
   - primary care provider;
   - active condition reviewed during the wellness visit;
   - reconciled medication;
   - allergy review;
   - immunization;
   - vital sign;
   - lab result.
4. Verify each saved record appears in the correct domain list.
5. Call the anonymized release endpoint with owner approval and purpose.
6. Confirm the release payload contains generalized clinical data and no direct
   identifiers.

## Command

```bash
APP_URL=http://localhost:18080 npm run test:e2e:playwright
```

The script writes screenshots to `output/playwright/`.


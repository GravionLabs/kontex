---
status: draft
---

# Deploy Phase Context

<!--
  This file is loaded by `get-context` when phase=deploy.
  It guides the AI agent through the deploy phase.
  Customize it with your team's deployment standards.
-->

## Goal

Deploy to production safely, verify the release is healthy, and be ready to roll back
at any point without data loss or service disruption.

## Deploy Checklist

- [ ] All environments configured (dev, staging, prod)
- [ ] Secrets are in secrets manager — no plaintext credentials in config
- [ ] Database migrations tested on staging, rollback script ready
- [ ] Rollback plan documented in the runbook
- [ ] Observability alerts active and tested before go-live
- [ ] Smoke test suite ready to run post-deploy
- [ ] Deployment window agreed with stakeholders
- [ ] On-call contacts identified and notified

## Output of Deploy Phase

- Deployed artefact (image tag / release version)
- Post-deploy smoke test result (pass / fail)
- Runbook updated with any changes discovered during deployment

## Questions to Ask Before Moving On

1. Can the service be rolled back in under 5 minutes?
2. Are all environment-specific secrets stored outside the codebase?
3. Have DB migrations been verified to be reversible?
4. Is there an alert that would fire within 2 minutes of a production failure?

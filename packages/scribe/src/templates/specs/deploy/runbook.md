---
status: draft
---

# Deployment Runbook

## Pre-deploy Checklist

- [ ] Feature branch merged and CI green
- [ ] Staging deploy completed and smoke-tested
- [ ] DB migration script reviewed and tested on staging
- [ ] Secrets verified in secrets manager for target environment
- [ ] Rollback procedure reviewed by the on-call engineer
- [ ] Deployment window communicated to stakeholders

## Deploy Steps

1. Verify current production health (dashboards / alerts clear)
2. Trigger deployment pipeline for the target environment
3. Monitor deployment logs for errors
4. Wait for all instances to report healthy
5. Run post-deploy smoke tests (see below)
6. Confirm observability dashboards show expected metrics

## Rollback Steps

1. Identify the previous stable image tag / release version
2. Trigger rollback pipeline or redeploy previous artefact
3. Verify all instances healthy after rollback
4. Re-run smoke tests against rolled-back version
5. Notify stakeholders of rollback and open incident ticket

## Post-deploy Verification

- [ ] Health endpoint returns `200 OK`
- [ ] Key user journeys verified end-to-end
- [ ] Error rate within normal bounds
- [ ] Latency within SLO targets
- [ ] No unexpected alerts firing

## Contacts

| Role        | Name | Contact |
|-------------|------|---------|
| On-call     |      |         |
| Team lead   |      |         |
| Platform    |      |         |

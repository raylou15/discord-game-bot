# Werewolf Discord Game Launch Workstreams

This plan enumerates independent workstreams required to deliver a production-ready, fully playable Werewolf Discord game. All tasks assume the repository has been cloned and dependencies installed per `README.md`. Each workstream can be executed concurrently by different owners because scope boundaries and integration points are explicitly defined. Follow the run order numbering when assigning owners; multiple tasks may proceed in parallel once their "Start Trigger" is satisfied.

## 1. Narrative & Role Design Validation
- **Start Trigger:** Immediately after cloning the repo.
- **Goal:** Finalize the catalog of playable roles, win conditions, and rule variants for launch.
- **Detailed Steps:**
  1. Review current `server/src/game/roles` (all role definitions) and `client/src/game/constants` for available roles and their metadata.
  2. Interview stakeholders to confirm required launch roles (core Werewolf, Seer, Doctor, Hunter, custom variants) and optional future roles.
  3. Document finalized rules in a shared `docs/rules.md` outline (do not edit code).
  4. Flag any missing role abilities or rule edge cases for other workstreams via GitHub issues.
- **Deliverables:** Approved ruleset document and issue list for missing behaviors.

## 2. Server Engine Feature Completion
- **Start Trigger:** After Task 1 publishes the approved ruleset.
- **Goal:** Implement any missing role abilities, night/day phase transitions, vote resolution, and win condition checks per the agreed rules.
- **Detailed Steps:**
  1. For each gap identified in Task 1, create subtasks with acceptance criteria (e.g., "Seer sees alignment once per night").
  2. Update server engine modules (`server/src/engine`, `server/src/game`) to implement behaviors, ensuring unit tests accompany each change.
  3. Add automated regression tests for edge cases (tie votes, simultaneous deaths, AFK players).
  4. Run `npm test -- server` (or equivalent script) to validate all server-side logic before merging.
- **Deliverables:** Passing tests covering all rules, merged PRs addressing every gap ticket.

## 3. Realtime Transport Hardening
- **Start Trigger:** Immediately; runs parallel to Task 2.
- **Goal:** Ensure WebSocket and REST endpoints support production load, reconnection, and Discord OAuth edge cases.
- **Detailed Steps:**
  1. Audit Express routes (`server/src/api`) and WebSocket gateway (`server/src/ws`) for auth validation and rate limiting.
  2. Implement reconnect/backoff logic and heartbeat timeouts aligned with Discord latency budgets.
  3. Add integration tests simulating reconnects and invalid tokens; execute via `npm run test:integration` (create script if absent).
  4. Document API contracts in `docs/transport.md` for client consumption.
- **Deliverables:** Hardened transport layer with tests and up-to-date documentation.

## 4. Client Game Flow Polish
- **Start Trigger:** After Task 1 (ruleset) is available.
- **Goal:** Bring the React client to feature parity with server rules, covering lobby, in-game, and post-game flows.
- **Detailed Steps:**
  1. Map UI states to ruleset: ensure lobby supports role selection counts, readiness, bot fill-ins.
  2. Implement missing UI components for night actions, voting, death reveals, and win screens located under `client/src/components`.
  3. Add responsive styling and accessibility support (ARIA labels, keyboard navigation).
  4. Write unit tests with Jest/React Testing Library and run `npm test -- client` prior to PR submission.
- **Deliverables:** Pixel-complete, accessible UI matching all phases, with passing tests.

## 5. Bot & AI Player Readiness
- **Start Trigger:** Parallel with Tasks 2 and 4 once ruleset is final.
- **Goal:** Upgrade AI bots to follow finalized rules, provide difficulty tuning, and avoid disrupting human players.
- **Detailed Steps:**
  1. Review bot behaviors in `server/src/bots` and align decision trees with new roles.
  2. Implement configurable difficulty (e.g., cautious, aggressive) exposed through lobby settings.
  3. Add simulation harness to pit bots against each other for 100+ matches; record metrics.
  4. Generate report summarizing win rates and unexpected failures; create issues for anomalies.
- **Deliverables:** Configurable bots with validated performance metrics and issues logged for anomalies.

## 6. Discord Integration QA
- **Start Trigger:** After Tasks 2–5 reach feature complete.
- **Goal:** Validate Discord OAuth, presence, slash commands, and DM notifications work end-to-end.
- **Detailed Steps:**
  1. Configure Discord application credentials in `.env` using staging bot.
  2. Test login flow, lobby creation, and command triggers in a staging Discord server.
  3. Verify permission scopes and rate limits; adjust Discord bot intents as needed.
  4. Document Discord setup steps in `docs/discord-setup.md` for future operators.
- **Deliverables:** QA checklist results, updated documentation, and verified Discord configuration.

## 7. Observability & Ops Instrumentation
- **Start Trigger:** Parallel to Task 6 once backend endpoints are stable.
- **Goal:** Implement logging, metrics, and alerting required for production.
- **Detailed Steps:**
  1. Integrate structured logging (e.g., pino/winston) across server modules with correlation IDs.
  2. Expose Prometheus metrics for lobby counts, websocket connections, action latency.
  3. Define alert thresholds and dashboards (Grafana/Datadog) documented in `docs/observability.md`.
  4. Add healthcheck endpoints and readiness probes for deployment targets (Heroku/Kubernetes).
- **Deliverables:** Instrumented server with documented dashboards and alert playbooks.

## 8. End-to-End Testing & QA Automation
- **Start Trigger:** After Tasks 2–4 are code complete.
- **Goal:** Build automated end-to-end test suite covering core game scenarios.
- **Detailed Steps:**
  1. Choose framework (Playwright/Cypress) and configure under `client/e2e`.
  2. Author scripts for lobby formation, night/day cycles, bot interactions, and victory conditions.
  3. Integrate tests into CI using GitHub Actions workflow (`.github/workflows/e2e.yml`).
  4. Run nightly scheduled builds against staging environment; triage failures promptly.
- **Deliverables:** Reliable e2e suite running in CI with clear reporting.

## 9. Documentation & Knowledge Base
- **Start Trigger:** Ongoing once each task finishes its scope.
- **Goal:** Consolidate all user-facing and operator documentation for launch.
- **Detailed Steps:**
  1. Draft player guide, moderator handbook, and troubleshooting FAQ in `docs/manual`.
  2. Ensure developer onboarding and contribution guides are up to date (`CONTRIBUTING.md`, `README.md`).
  3. Publish release notes summarizing launch features and known limitations.
  4. Review documents for clarity and accessibility (markdown lint, grammar check).
- **Deliverables:** Complete documentation set ready for public consumption.

## 10. Deployment & Launch Readiness Review
- **Start Trigger:** After Tasks 2–9 report completion.
- **Goal:** Deploy to production infrastructure and conduct launch checklist review.
- **Detailed Steps:**
  1. Prepare deployment pipelines (CI/CD) targeting chosen platform (e.g., Heroku, AWS ECS).
  2. Execute smoke tests in production-like environment; monitor logs and metrics.
  3. Hold go/no-go meeting with leads from each task to confirm acceptance criteria met.
  4. Tag release in Git (`v1.0.0`), create GitHub release notes, and schedule official launch announcement.
- **Deliverables:** Production deployment, launch sign-off, and release documentation.


# Phased Roadmap

> Phase 0 → Phase 6, with concrete deliverables, gates, dependencies, risks, and rollback strategy. The companion to PHASE_0_PROMPT_SEQUENCE.md (which explodes Phase 0 into PR-sized prompts).

---

## Reading this document

- **Solo + Claude Code** is realistic for Phase 0 only. Phase 1+ takes longer if you stay solo; quoted timelines assume a small team unless stated.
- Each phase has a **gate** — a measurable condition that must hold before the next phase starts. Failing a gate means iterating in the current phase, not advancing.
- **Feature flags via PostHog** gate every new feature from Phase 2 onwards. So "rollback" is rarely a code rollback — it's a flag toggle.
- Tables marked **(P0/P1/P2/...)** in `DATA_MODEL.md` indicate which phase first uses them.

---

## Phase 0 — Demo (2–4 weeks solo)

**Goal**: a runnable demo that proves the core idea and earns leadership approval.

### In scope
| Deliverable | Detail |
|---|---|
| Auth + 2FA | Email + password + TOTP; super-admin guardrail wired but only `admin` and `bid_owner` surfaced |
| Hardcoded intake | 16 fixed fields, file upload (PDF/DOC/XLS/IMG/EML/ZIP), client-side + server-side validation |
| AI extraction | Single locked Claude prompt (`extraction_v1`), confidence + source quotes, manual override |
| 5-stage flow | Intake → Triage → Qualify → Decide → Closed; 6 decision types; checklists |
| Approvals | Parallel votes on Decide stage; Vertical Lead veto resolution |
| Comments + @mentions | Markdown comments, threaded depth-1, @mention notifications |
| Notifications | In-app bell + email via mailhog; 5 event types |
| Contact Book | CRUD + photo + region/vertical/sector tagging |
| Audit log | Append-only triggers; nightly hash chain |
| Search | Postgres FTS + filter combinations |
| Saved views | Personal saved views (no team/org sharing) |
| Demo seed | 1 admin, 1 VL (Shubham), 3 bid owners, 5 contacts, 3 demo opps |
| Docker Compose | One-command boot of full stack |
| Loom walkthrough | 3-minute happy-path video for the leadership demo |

### Out of scope (parked)
Builder Console; Capability Profile + Match Engine; Staging Inbox; WBS/Gantt; Kanban/Map/Calendar/Card views; full DMS metadata; mobile app; multi-model selector; RAG; OCR fallback; reinforcement loop; OpenSearch; reports/dashboards (just hardcoded counts in dashboard); localization (English only); integrations; Sentry/PostHog/Grafana (basic file logs only).

### Stack used
FastAPI + Postgres + Redis + MinIO + Celery + Mailhog + Ollama (optional, for local dev parity) + Next.js + Docker Compose. **No** OpenSearch, Vault, Sentry, PostHog, Grafana yet.

### Effort
- ~25 distinct UI screens.
- ~40 backend endpoints.
- ~30 DB tables (Phase 0 subset of `DATA_MODEL.md`).
- ~16 PRs (per `PHASE_0_PROMPT_SEQUENCE.md`).

### Risks
| Risk | Mitigation |
|---|---|
| AI extraction accuracy too low to convince leadership | Curate 10 real RFPs as test set; iterate prompt until ≥80% field accuracy before demo |
| Files too large for local Postgres/MinIO | Test with a 50MB RFP early in PR-8; size up volumes if needed |
| Demo crashes live | Run dry-run 24h before; record fallback Loom |
| Super-admin guardrail bug exposes hidden capability | Tests are mandatory and 100% coverage; manual review before merge |

### Phase 0 → Phase 1 gate
1. Demo delivered to leadership.
2. Approval to continue + named pilot vertical (Data Fabrics).
3. Production budget direction set (even if not finalised — "yes" or "no" minimum).
4. Pilot users identified (Shubham + 2–3 bid owners + 1 stakeholder).

---

## Phase 1 — MVP foundation (6–10 weeks; 1–2 devs ideal)

**Goal**: Shubham + Data Fabrics team uses it daily for real opportunities.

### In scope
| Deliverable | Detail |
|---|---|
| All 13 operator role types | Surfaced in UI with permission matrix |
| Fully granular RBAC | Permission decorator on every endpoint; matrix stored per role |
| Capability Profile page | Manual entry; categories (services/tech/geo/sector/certs/team/pricing); evidence links |
| Match engine v1 | Weighted fit score + AI-generated narrative; configurable weights per vertical |
| Staging Inbox | Items land here first; 4-step selection (triage → fit → enrich → dedupe → decide); auto-tagging applied; converts to opportunity on "pull in" |
| Sales-profile auto-tagging | Rules engine (region/account/sector/vertical/deal-size/tier → people); manual override |
| Audit log viewer (Admin) | Filterable by actor/entity/date; export with PGP signature |
| Soft-delete + recovery | Configurable recovery window; UI for admin to restore |
| Encryption at rest | pgcrypto for PII + deal values; HashiCorp Vault for keys |
| Session controls | Active sessions page; force-logout per device; 2FA reset for admin |
| Sentry + Uptime Kuma + basic Grafana | Observability foundation |
| Email integration (read) | Optional IMAP polling — emails to a designated address become staging items |
| English UI fully complete | All operator + admin pages |
| DPDP soft-delete + DSR endpoints | export/correct/erase requests |

### Out of scope (parked)
Builder Console (Phase 2); mobile app (Phase 3); multi-model selector + reinforcement loop (Phase 3); WBS/Gantt + DMS metadata + integrations (Phase 5); dashboards/reports builder (Phase 4); OpenSearch (Phase 4); Hindi locale (Phase 5).

### Phase 1 → Phase 2 gate
- Data Fabrics pilot stable for 4+ weeks: zero P1 incidents.
- ≥10 opps have been closed (won/lost/dropped/scrapped).
- AI extraction edits feed into `extraction_corrections` (≥50 entries).
- Bid owners and VL prefer the app over Excel/email.
- Less than 1% audit log integrity errors on hash-chain verification.

### Risks
| Risk | Mitigation |
|---|---|
| Capability Profile too tedious to enter | Bulk CSV import; pre-fill from existing case studies |
| Match score doesn't match VL's gut | Tune weights with VL; allow per-vertical overrides |
| Email IMAP integration flaky | Make it optional; staging inbox works without it |
| Encryption key loss → data lockout | Documented runbook; founder holds Vault unseal keys; separate backup of keys |

---

## Phase 2 — Builder Console v1 (8–12 weeks; 2 devs)

**Goal**: admin can shape the app without code; flow becomes truly configurable.

### In scope
| Deliverable | Detail |
|---|---|
| Field builder | All 13 field types + all validations + derived/formula fields |
| Form builder | Drag-drop canvas, sections, conditional visibility, multi-form per entity |
| Stage Templates | Reusable templates per opportunity type; `applies-when` rules; auto-selection at intake |
| Decision Rules library | Maker–checker rules with veto, weights, auto-rules, SoD; resolution algorithms (vertical-lead-aligns / unanimous / majority / weighted-threshold) |
| Stakeholder Rules library | Visual IF/THEN; lookup types; preview |
| Lifecycle | Per-template per-stage transition map (which decision → which next stage) |
| Search Recipes | Filter combinations with exposed parameters |
| Notification Rules | Channel routing per event/role/priority; escalation timing |
| Limits page | All admin-configurable limits with min/max guardrails |
| Roles & Permissions | Editable matrix per role; user assignments |
| Feature Flags (PostHog) | Wired for all subsequent features |
| Config versioning | Draft/published with rollback; config export/import as JSON |
| Validation pass | Continuous integrity check; issues surfaced in Builder Dashboard |

### Migration strategy
The Phase 0 hardcoded flow becomes "Default Template" inside the Builder. Existing Phase 0/1 opps continue on the hardcoded path; new opps can pick any template.

### Phase 2 → Phase 3 gate
- 2nd vertical (e.g., AI/ML or Infra) onboarded entirely via Builder Console — zero code changes.
- Admin user (could be Shubham wearing two hats) trained; runbook complete.
- Config export/import tested between staging and production.
- Builder Console session-replay reviewed; UX issues addressed.

### Risks
| Risk | Mitigation |
|---|---|
| Builder Console UX too complex for non-technical Admin | Embedded onboarding tour; pre-built templates as starting points; AI-assisted config generation (Phase 3+) |
| Config bugs break opp workflow | Validation pass + dry-run preview + draft/published separation |
| Migration of Phase 0 hardcoded flow incomplete | Side-by-side comparison test; both flows run in shadow before cutover |

---

## Phase 3 — Mobile + AI maturity (8–12 weeks; 2–3 devs ideal)

**Goal**: field-ready mobile app + AI you can trust at scale.

### In scope
| Deliverable | Detail |
|---|---|
| Flutter mobile app | iOS + Android; full Operator parity (no Builder Console); biometric login; FCM push |
| Offline support | Last-N opps cached + user-pinned opps; draft sync queue; last-write-wins conflict resolution |
| Per-field granular prompts | 16 separate prompts replacing single-shot extraction; admin can choose hybrid |
| Multi-model selector | LiteLLM with Claude / OpenAI / Llama / Mistral / Qwen options; admin tests + locks per task |
| RAG over past extractions | pgvector + BGE-M3; top-K few-shot examples injected into prompts |
| Reinforcement loop | `extraction_corrections` continuously appended; periodic LoRA fine-tuning of OSS models |
| OCR pipeline | PaddleOCR primary + LLM-vision fallback; threshold configurable |
| AI eval harness | Golden dataset; per-prompt accuracy + calibration + cost tracking; CI gate on regression |
| Cost guardrails | Daily budget per task; auto-failover to cheaper model |

### Phase 3 → Phase 4 gate
- AI extraction field-accuracy ≥ 90% on golden set.
- Mobile crash-free rate > 99%.
- 3+ verticals using the app daily.
- Cost per opp < target (TBD when AI provider mix is settled).

### Risks
| Risk | Mitigation |
|---|---|
| Mobile parity scope balloons | Feature flag per mobile feature; ship incrementally |
| Fine-tuning produces worse model | Eval harness gates; A/B between fine-tuned and base; rollback to base if regression |
| OSS models too weak for production extraction | Hybrid: route hard cases (low-confidence first pass) to cloud LLM |

---

## Phase 4 — Views, dashboards, intelligence (6–8 weeks)

**Goal**: leadership lives in the app; insights surface automatically.

### In scope
| Deliverable | Detail |
|---|---|
| All 6 view types | Kanban, Calendar, Gantt, Map, Card, Table |
| Saved views | Team and org-wide visibility; admin-published views |
| Dashboard builder | Drag-widget grid; KPI cards / charts / funnel / table / list / gauge / map; per-role audience |
| Report builder | Templates + multi-format outputs (PDF/Excel/CSV/PPT) + scheduled exports + branding (AMNEX template) |
| OpenSearch | Cross-entity search (opps + files + comments + contacts + audit); replaces Postgres FTS via abstraction |
| Pattern learning | Match → outcome history fed into a model that flags "opps similar to past wins/losses" |
| Similar past opps panel | On opp detail, show top-5 similar past opps with their outcomes |
| Cross-period comparisons | YoY, QoQ, MoM in dashboards |

### Phase 4 → Phase 5 gate
- CXO dashboard live + reviewed weekly by leadership.
- Search p95 < 1s.
- ≥ 5 saved org-wide views in active use.
- Report exports run reliably (≥ 99% success rate over 4 weeks).

---

## Phase 5 — Complementary modules + integrations (8–12 weeks)

**Goal**: the app becomes the single workspace for pre-sales.

### In scope
| Deliverable | Detail |
|---|---|
| WBS + Gantt + critical path | Tasks, dependencies, owners, effort, deadlines, concurrent vs sequential; auto-generated from stage template |
| Full DMS | Metadata (classification, retention, watermarking, version chain), retention policies, watermarked downloads, content tags via embeddings, cross-opp document search |
| Knowledge Base | Past wins/losses + lessons learned; structured templates for "what worked" |
| Templates Library | Proposal / case-study / SOW templates with placeholders |
| Vendor/Partner Directory | Subcontractors, OEMs, system integrators with capabilities + relationship history |
| Compliance Tracker | EMD, eligibility docs, certifications per opp with expiry alerts |
| Activity Feed | Org-wide and per-vertical timeline of significant events |
| Calendar integration | Google Calendar + Outlook (read deadlines, write back stage milestones) |
| Email IMAP ingestion | Polished from Phase 1 stub; rules-based routing into staging |
| Parent-tool integration | REST contract; staging items pushed into the app via API |
| CRM connector | Salesforce / Zoho / HubSpot bi-directional sync (configurable mappings) |
| Hindi locale | Translation files reviewed + published |
| i18n framework | Other locales (Marathi, Tamil, Telugu, Bengali, Gujarati) ready to add via Builder upload |
| Full theming | Light + Dark + Auto + AMNEX brand + admin custom themes |

### Phase 5 → Phase 6 gate
- Parent-tool integration stable for 4+ weeks.
- DMS holds ≥ 3 months of files with retention policies enforced.
- Compliance tracker has real data feeding it (not synthetic).
- ≥ 2 locales active.

---

## Phase 6 — Hardening + compliance + scale (ongoing)

**Goal**: enterprise/govt-ready, multi-region, audited.

### In scope
| Deliverable | Detail |
|---|---|
| Multi-region failover | GCP primary + AMNEX on-prem off-site backups; documented failover runbook |
| DPDP / ISO 27001 / SOC 2 Type II / MeitY documentation | Control mapping, evidence collection, formal external audit |
| DAST / SAST / dependency scans as hard gates in CI | Already in CI from Phase 0; Phase 6 tightens thresholds + remediation SLAs |
| k6 load testing | 1000 concurrent users sustained; chaos drills |
| Accessibility WCAG 2.1 AA full pass | axe-core + manual screen-reader audit + keyboard-only audit |
| Visual regression (Chromatic) | Detect unintended UI changes |
| AI helper chatbot | RAG over docs + in-app context; answers admin/operator questions |
| Guided tours | react-joyride / Driver.js; contextual onboarding for each module |
| Additional locales | Marathi, Tamil, Telugu added |
| Quarterly DR drills | Restore production backup to a parallel project; run e2e suite; document RTO/RPO actual |
| External pen test | Annual; CERT-In empanelled vendor |
| SOC 2 Type II audit | After 6 months of evidence collection |

### Continuous from Phase 6 onwards
- Monthly access reviews.
- Quarterly dependency audits.
- Quarterly tabletop exercises (pick a runbook, execute on staging, time it).
- Annual external pen test.
- Annual security policy review.

---

## Cross-phase: feature flag policy

From Phase 2 onwards, every new feature ships behind a PostHog flag with the convention:
- Default: OFF
- Rollout: 0% → 25% (internal AMNEX) → 75% (pilot vertical) → 100% (all)
- Each step requires ≥1 week of clean metrics before advancing.
- Bad feature → flip flag OFF; no code rollback; no DB rollback.

---

## Cross-phase: testing escalation

| Phase | Testing emphasis |
|---|---|
| Phase 0 | Unit + integration + minimal e2e; basic smoke load test |
| Phase 1 | + RBAC matrix tests; + audit-log integrity tests; + breach-pipeline tests |
| Phase 2 | + Builder Console config-validity tests; + migration tests for Phase 0 → templated flow |
| Phase 3 | + AI eval harness gates on every prompt change; + mobile e2e (Patrol) |
| Phase 4 | + visual regression (Chromatic); + load test 500 concurrent |
| Phase 5 | + integration contract tests with parent tool / CRM |
| Phase 6 | + DAST scans (OWASP ZAP); + accessibility audit; + chaos engineering; + load test 1000 concurrent |

---

## Cross-phase: documentation cadence

Every phase adds to `presales-infra/docs/` under Docusaurus:
- Architecture changes → updated `ARCHITECTURE.md`.
- Schema changes → updated `DATA_MODEL.md` + ER diagram regenerated.
- API changes → auto-regenerated from FastAPI OpenAPI.
- New runbooks for new failure modes.
- Postmortems for any incidents.
- Release notes per version.

---

## Phase ordering rationale

A few design choices deserve explicit defense:

1. **Builder Console waits until Phase 2.** Building configurability without lived experience produces options nobody uses. Phase 0/1 hardcode; Phase 2 carves the configurability out of the working code. Same arc Airtable / Notion / Linear walked.

2. **Mobile waits until Phase 3.** Building Flutter against a moving backend is painful. By Phase 3, the API surface has stabilised and we know what mobile must mirror.

3. **AI maturity waits until Phase 3.** Phase 0/1 use a single locked Claude prompt. RAG, fine-tuning, multi-model selection are pointless until you have ≥ 50 corrected extractions to learn from. Phase 3 has that data.

4. **Dashboards/reports wait until Phase 4.** Until verticals are using the app and outcomes are recorded, there's nothing meaningful to dashboard. Phase 4 begins when there's signal.

5. **WBS/DMS/integrations wait until Phase 5.** These are amplifiers, not foundations. Building them first risks stranded value.

6. **Hardening (Phase 6) is "ongoing"** because compliance, accessibility, and DR are never "done" — they become continuous practice once the foundation is solid.

---

## Estimated cumulative timeline (solo with Claude Code)

| Phase | Solo timeline | With 2 devs |
|---|---|---|
| 0 | 2–4 weeks | n/a |
| 1 | 12–18 weeks | 6–10 weeks |
| 2 | 18–24 weeks | 8–12 weeks |
| 3 | 16–20 weeks | 8–12 weeks |
| 4 | 10–14 weeks | 6–8 weeks |
| 5 | 16–20 weeks | 8–12 weeks |
| 6 | ongoing | ongoing |

**Solo, end-to-end**: ~18–24 months to Phase 5 complete. **With two devs**: ~10–14 months. Reality usually compresses this further when you realise some Phase-N items can be deferred if pilot users don't ask for them.

---

## Failure modes for the roadmap itself

| Failure | Mitigation |
|---|---|
| Phase 0 demo doesn't get approved | Treat as a learning; rebuild scope based on feedback before continuing. The code remains useful even if direction shifts |
| Pilot vertical (Data Fabrics) doesn't adopt | Don't move to Phase 2; iterate Phase 1 features until adoption sticks |
| Builder Console (Phase 2) too complex for Admin | Pre-built templates; AI-assisted config; defer some configurability to Phase 3 |
| Mobile (Phase 3) crashes too often | Pause rollout; fix at root cause; don't ship Phase 4 features that depend on mobile until stable |
| AI accuracy plateau (Phase 3) | Accept current accuracy; lock to the best cloud model; defer reinforcement to Phase 4+ |
| Multi-region (Phase 6) too expensive | Document the gap; accept single-region risk with clear comms to clients |

---

End of ROADMAP.md.

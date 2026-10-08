# Builder Console — Specification

> The configuration platform that turns the app from a fixed pre-sales tool into a configurable orchestration engine. Phase 2 build, but the spec is finalised now so Phase 0 code structures itself to be re-pluggable. Web/tablet only — never on phones.

---

## 1. Mental model

The Builder Console is a low-code/no-code admin platform. The Admin (the "doctor") uses it to shape the app:

- **Fields** — what data we capture and how we validate it
- **Forms** — which fields show on which page in what layout
- **Stages** — the lifecycle states an opportunity moves through
- **Stage Templates** — packaged stage flows for different opportunity types
- **Decision Rules** — who decides, who approves, who has veto
- **Stakeholder Rules** — who gets auto-tagged on an opp based on its attributes
- **Lifecycle** — which decision in which stage produces which transition
- **Search Recipes** — pre-built filter combinations operators use as starting points
- **Notification Rules** — which channel for which event for which role
- **AI Prompts** — extraction templates with examples, per-task and per-field
- **Limits** — admin-configurable ceilings (file size, fields per form, etc.)
- **Themes & Branding** — visual identity per tenant (Phase 5+ multi-tenant)
- **Localization** — translation file uploads
- **Dashboards** — drag-widget builder for KPIs and reports
- **Reports** — templates, formats, schedules, audiences
- **Roles & Permissions** — the matrix
- **Feature Flags** — per role, per user, percentage rollout

Everything the operator-facing app does should ultimately be expressible as configuration in this console. When something can't be expressed, the Builder grows — not the operator app.

---

## 2. Why builder-first matters (and why it waits)

**The vision**: AMNEX has many verticals (Data Fabrics, AI/ML, Infra, App Dev, ...). Each has its own RFP rhythm, stage gates, stakeholders, and decision idioms. A fixed flow forces them all into one mould; a builder lets each vertical lead shape their own pipeline.

**Why it waits until Phase 2**: building configurability without lived experience is a trap. We'd build elaborate options for shapes nobody actually needs. Phase 0 ships a hardcoded flow used in real life by Shubham and the Data Fabrics team. By Phase 2, we've learned exactly which axes need configurability and which don't. The Builder Console is then carved out of the working flow, not invented in a vacuum.

This is the same arc Airtable, Retool, Notion, Linear, and Salesforce all walked. Skipping it is how you get a configurable system nobody uses.

---

## 3. Console layout

```
Builder Console (Admin only)
├── Dashboard (config health: drafts, recent changes, validation issues)
├── Fields
├── Forms
├── Stage Templates
│   ├── Templates list
│   ├── Stage list (per template)
│   ├── Work items per stage
│   ├── Decision rules per stage
│   ├── Stakeholder rules per stage
│   ├── SLAs per stage
├── Decision Rules library
├── Stakeholder Rules library
├── Search Recipes
├── Notification Rules
├── AI Prompts
├── Limits
├── Themes & Branding
├── Localization
├── Dashboards
├── Reports
├── Roles & Permissions
├── Feature Flags
└── Capability Profile (P1)
```

Each module is a separate route under `/admin/builder/*`. Top-bar shows "Draft / Published" toggle for the current config (more on versioning below).

---

## 4. Field builder

### Field types
- **Text** (single-line, max length, case rules)
- **Long text** (multiline, markdown optional)
- **Number** (integer, decimal, currency)
- **Date** / **Date-time** (with time-zone awareness)
- **Single-select** (options list, color per option, sort order)
- **Multi-select** (with options as above + max selections)
- **Checkbox / boolean**
- **File** (single or multiple; mime allowlist; size cap)
- **User picker** (single or multi; scope: any user / by role / by vertical)
- **Linked record** (foreign key to another entity — opportunity, contact, etc.)
- **Formula / derived** (computed from other fields; see formula DSL below)
- **Lookup** (computed from a linked record's field, e.g., "client.tier")
- **Rollup** (aggregate over linked records, e.g., "sum of file sizes")
- **JSON** (escape hatch — admin-defined structured)

### Validations
Each field can carry zero or more validations:
- `required`
- `min_length`, `max_length`
- `min_value`, `max_value`
- `regex` (named patterns: email, phone E.164, GST, PAN, Aadhaar; or custom)
- `unique` (within entity)
- `conditional_required` (required only when another field equals X)
- `date_in_future` / `date_in_past`
- `file_type` (allowlist)
- `file_size_max`
- `cross_field` (e.g., `end_date > start_date`)
- `custom_function` (admin uploads a Python validator with limited stdlib — Phase 6)

### Derived/formula fields
Spreadsheet-like, syntax inspired by Airtable formulas:
```
fit_score = capability_match("services") * 0.4
          + capability_match("geo") * 0.2
          + capability_match("sector") * 0.2
          + (1 - team_load_factor()) * 0.2

deadline_in_days = days_until(deadline)

priority_auto = if(deal_size_inr > 50000000, "high",
                if(deadline_in_days < 7, "high",
                  "medium"))
```

Functions available: `days_until`, `days_between`, `if`, `case`, `coalesce`, `trim`, `concat`, `upper`, `lower`, `regex_match`, `parse_currency`, `convert_currency` (uses today's FX), `capability_match` (calls the match engine), `team_load_factor` (calls the WBS module), arithmetic, comparison.

Formula evaluation:
- On every save (sync; cheap formulas).
- Or scheduled / on-demand (async; expensive formulas like capability_match).
- Cached; recomputed when dependencies change (dependency graph maintained).

### UI
- Field list (table with type icon, label, code, validations summary, in-use-by count, edit button).
- Field edit drawer:
  - Step 1: type (radio cards with previews)
  - Step 2: label, code (auto-suggested from label, editable; codes immutable after first publish)
  - Step 3: validations (checkboxes + per-validation params)
  - Step 4: default value
  - Step 5: visibility — "always" / "when other-field equals X"
  - Step 6: help text + admin notes
- Preview panel: live preview of the field rendering with current settings.
- Test panel: try entering values, see validation errors fire.

### Versioning
- Fields are versioned. Editing a published field creates a draft. Publishing the draft creates v2.
- Existing data using v1 keeps working (old field is read-only in opp histories; new entries use v2).
- Breaking changes (changing type, removing options) require a migration plan: admin specifies how to map old values to new.

---

## 5. Form builder

### Concept
A form is a collection of fields with layout + visibility rules, bound to an entity (opportunity, contact, stage sub-form).

### UI
- Drag-drop canvas: left panel = field library (search + filter), center = form canvas (rows × columns × sections), right panel = field properties.
- Section: title + collapsible + visible-when rule.
- Field-on-canvas: shows label + type icon + drag handle + delete X.
- Save → publish workflow.

### Layout primitives
- Sections (groups of rows under a heading)
- Rows (1, 2, 3, or 4 columns)
- Conditional sections (show only if `field_x = value`)
- Tabs (Phase 3)
- Repeating groups (e.g., line items) (Phase 4)

### Form types
- **Intake form** — bound to opportunity creation
- **Stage sub-form** — bound to a (stage_template, stage) pair; collected when opp enters that stage
- **Detail edit form** — bound to opp detail page
- **Custom forms** (Phase 4) — admin creates ad-hoc forms for special purposes

### Multi-form per entity
You can have multiple intake forms per entity, scoped by condition: "if vertical = data_fabrics, use intake-df; else, use intake-default."

---

## 6. Stage Templates

### Concept
A stage template is a packaged flow: an ordered list of stages, each with its work items, decision rules, stakeholder rules, and SLAs. Bound to an opportunity at creation; once bound, the opportunity follows that template's flow until closed.

### UI
- Templates list (table with code, name, opp-types-it-applies-to, stages count, in-use count).
- Template editor:
  - Header: code, name, description, applies-when rule.
  - Stage list: drag-reorderable cards, each showing stage name, SLA, decision rule code, stakeholder rule code, work items count.
  - Click a stage card → stage editor drawer.

### Stage editor drawer
Tabs:
- **Basics** — code, name, description, sort order, SLA (in hours), is-terminal toggle.
- **Work items** — checklist items, sub-form binding, AI-task hooks (Phase 3+: auto-summary on entry, auto-classification, auto-extract).
- **Decision rule** — pick from library or define inline.
- **Stakeholder rule** — pick from library or define inline.
- **Notifications** — which events on this stage notify whom on which channel.
- **Transitions** — what each decision in this stage does (to which next stage; or close with outcome).

### Applies-when rule
A template can be auto-selected at intake based on rules:
```
if vertical = "data_fabrics" AND deal_size_inr > 30000000:
  use template "df_large_govt"
elif vertical = "data_fabrics":
  use template "df_default"
else:
  use template "general_default"
```

If no rule matches, bid owner picks from a list at intake.

---

## 7. Decision Rules

### Maker–checker definition
A decision rule defines:
- Who can be the **maker** (proposes the decision)
- Who must be the **checkers** (vote)
- Resolution algorithm
- Auto-rules (rules that fire without human intervention)

### Schema (stored in DB):
```json
{
  "code": "decide_default",
  "name": "Standard maker-checker for Decide stage",
  "maker": {
    "role": "bid_owner",
    "or_roles": ["vertical_lead"]
  },
  "checkers": [
    {"role": "vertical_lead", "veto": true,  "weight": 1, "required": true},
    {"role": "hod",           "veto": false, "weight": 1, "required": true},
    {"role": "strategist",    "veto": false, "weight": 1, "required": false}
  ],
  "resolution": "vertical_lead_aligns",  // or "majority", "unanimous", "weighted_threshold"
  "auto": [
    {
      "if": "deal_size_inr > 50000000",
      "action": "add_checker",
      "params": {"role": "cfo", "veto": true}
    },
    {
      "if": "priority = 'critical' AND deadline_in_days < 7",
      "action": "escalate",
      "params": {"to_role": "vertical_head"}
    }
  ],
  "sod_rules": [
    {"role": "bid_owner", "cannot_be": "checker"}
  ]
}
```

### Resolution algorithms
- **vertical_lead_aligns** (Phase 0 default) — VL's vote wins; non-VL rejections logged but non-blocking
- **unanimous** — all approvers must approve; any reject blocks
- **majority** — >50% approve required
- **weighted_threshold** — sum of approval weights must exceed threshold
- **first_to_finish** — first vote among allowed roles wins

### UI
- Rules library (list).
- Rule editor: maker picker, checker rows (add/remove, veto toggle, weight, required), resolution picker, auto-rules builder (IF/THEN rows), SoD rules.
- Test sandbox: simulate a decision with selected stakeholders' votes; see resolution.

---

## 8. Stakeholder Rules (sales-profile auto-tagging)

### Concept
When an opp is created (or attributes change), apply rules to compute the list of tagged stakeholders + their role labels.

### Schema:
```json
{
  "code": "tag_default",
  "name": "Default sales-profile tagging",
  "rules": [
    {
      "if": "vertical = 'data_fabrics'",
      "then": [
        {"action": "add_stakeholder", "role_label": "Vertical Lead",
         "user_lookup": "vertical.lead_user_id", "is_vertical_lead": true}
      ]
    },
    {
      "if": "region.zone = 'West'",
      "then": [
        {"action": "add_stakeholder", "role_label": "Regional Head",
         "user_lookup": "region.head_user_id"}
      ]
    },
    {
      "if": "client.tier = 'strategic'",
      "then": [
        {"action": "add_stakeholder", "role_label": "Strategic Account Lead",
         "user_lookup": "client.relationship_owner_id"}
      ]
    },
    {
      "if": "sector.code = 'govt' AND region.country = 'IN'",
      "then": [
        {"action": "add_stakeholder", "role_label": "Govt Compliance",
         "user_lookup": "by_role:compliance_officer"}
      ]
    },
    {
      "if": "deal_size_inr > 50000000",
      "then": [
        {"action": "add_stakeholder", "role_label": "CFO Sign-off",
         "user_lookup": "by_role:cfo"}
      ]
    }
  ]
}
```

### Lookup types
- `vertical.lead_user_id` — direct field reference
- `by_role:role_code` — first user with that role
- `by_role_in_scope:role_code` — first user with that role in the same vertical/region scope
- `from_contact_book` — lookup by name/role from the Contact Book
- `static:user_uuid` — hardcoded specific user

### UI
- Rules list.
- Rule editor: condition builder (visual IF/THEN with field pickers + operators) + actions list.
- Preview: paste sample opp attributes → see who would get tagged.

---

## 9. Search Recipes

### Concept
A search recipe is a pre-built filter combination, optionally exposing a few parameters that the operator fills in. Saves operators from rebuilding the same complex filter every time.

Examples:
- "Govt RFPs in {region} > {min_value} crore awaiting my action"
- "All open opps in {vertical} sorted by deadline"
- "Strategic-tier accounts in {sector} closed in last {n} months"

### Schema:
```json
{
  "code": "govt_rfps_my_action",
  "name": "Govt RFPs in {region} > {min_value} cr awaiting my action",
  "entity": "opportunities",
  "default_filters": [
    {"field": "sector.code", "op": "=", "value": "govt"},
    {"field": "outcome", "op": "is_null"},
    {"field": "awaiting_my_action", "op": "=", "value": true}
  ],
  "exposed_params": [
    {"key": "region", "label": "Region", "type": "select", "field": "region.id"},
    {"key": "min_value", "label": "Minimum deal size (cr)", "type": "number", "field": "deal_size_inr",
     "transform": "value * 10000000"}
  ],
  "default_sort": [{"field": "deadline", "dir": "asc"}],
  "audience": ["bid_owner", "vertical_lead"],
  "visibility": "org"
}
```

### UI
- Search Recipes list.
- Recipe editor: filter builder (visual AND/OR groups) + parameter definitions (which filter values are exposed to operators) + audience picker + visibility (private/team/org).

---

## 10. Notification Rules

### Concept
Map (event type) × (audience) × (channels). Lets admin tune the noise level per role.

### Schema:
```json
[
  {
    "event": "opp_assigned",
    "audience": "self",
    "channels": ["in_app", "email"],
    "priority": "high"
  },
  {
    "event": "comment_mention",
    "audience": "mentioned_users",
    "channels": ["in_app", "email", "push"],
    "priority": "medium"
  },
  {
    "event": "decision_pending",
    "audience": "stakeholder",
    "channels": ["in_app", "email", "push"],
    "priority": "high",
    "escalate_after_hours": 24,
    "escalate_to": "manager"
  },
  {
    "event": "deadline_approaching",
    "audience": "owner_and_stakeholders",
    "channels": ["digest_daily"],
    "priority": "low",
    "trigger_at": ["7d","3d","1d","12h"]
  }
]
```

### UI
- Rules table with event, audience, channels, priority, edit.
- Editor: audience picker, channel checkboxes, priority, escalation, trigger schedule (for time-based events).

---

## 11. AI Prompts management

### Concept
Admin manages prompts as first-class resources: create, version, test, lock, fine-tune.

### UI
- Prompts list: code, version, task, model locked, eval score, last edited, in-use.
- Prompt editor:
  - Frontmatter form (model, temperature, max_tokens, response_format)
  - Body editor (markdown with `{{variable}}` placeholder highlighting)
  - Examples section: paste few-shot examples manually OR pick from `extraction_corrections` (RAG-suggested)
  - **Test panel**: paste a sample input → see model output side-by-side with expected. Click "save as golden example" to add to eval set.
  - **Eval results panel**: latest eval scores per metric (accuracy, calibration, latency, cost) with trend.
  - Model picker: dropdown of available providers + models from LiteLLM. Test each on the eval set with a click; lock the winner.
- Diff view: when editing, show prompt diff against the published version + projected eval delta.

### Workflow
1. Admin clones the active prompt → draft.
2. Edits in the editor.
3. Tests on samples; runs eval.
4. If eval beats current → publishes (becomes new active version; old version archived but accessible for rollback).
5. Old in-flight extractions complete on their original prompt version (versioned at the time of call).

---

## 12. Limits

Single page with a list of all configurable limits + min/max app-allowed range + current value + audit history.

| Limit | Default | Min | Max | Notes |
|---|---|---|---|---|
| `limits.file_size_mb` | 100 | 1 | 500 | per upload |
| `limits.files_per_opportunity` | 50 | 1 | 500 | |
| `limits.fields_per_form` | 100 | 1 | 500 | |
| `limits.stages_per_template` | 20 | 1 | 50 | |
| `limits.stakeholders_per_stage` | 10 | 1 | 50 | |
| `limits.api_rate_per_user_per_min` | 200 | 30 | 2000 | |
| `limits.ai_concurrency_per_user` | 3 | 1 | 10 | parallel extractions |
| `limits.ai_daily_cost_per_user_usd` | 5 | 0 | 100 | |
| `limits.session_timeout_minutes` | 30 | 5 | 480 | |
| `limits.failed_login_lockout_threshold` | 5 | 3 | 20 | |
| `limits.failed_login_lockout_minutes` | 15 | 1 | 1440 | |
| `limits.password_min_length` | 12 | 8 | 64 | |
| `limits.password_rotation_days_admin` | 90 | 0 | 365 | 0 = no rotation |

App-allowed min/max are *floors and ceilings* admin cannot exceed (so they can't break the app by setting `file_size_mb = 100000`).

---

## 13. Themes & Branding

- Theme list: AMNEX brand (default), Light, Dark, Auto, plus admin-created custom themes.
- Theme editor: visual color picker for each design token (background, surface, primary, secondary, success, warning, danger, navy accent, text colors). Live preview of UI elements.
- Logo upload (header logo + favicon).
- Per-tenant branding (Phase 5 multi-tenant).
- Print/export skin (used in PDFs and reports — your existing AMNEX template style).

---

## 14. Localization

- Locales list (en, hi, mr, ta, te, gu, bn, ...) with status (active/draft).
- Translation table per locale: key | source string (en) | translation | last edited | translator.
- File upload: admin uploads ARB / JSON / CSV with translations; system diffs against current and shows changes for review.
- Auto-translate stub (Phase 6: invoke an LLM to suggest translations; human reviews and approves).
- Right-to-left toggle (Phase 6 if Arabic/Urdu needed).

---

## 15. Dashboards builder (Phase 4)

- Dashboards list.
- Dashboard editor: drag-drop grid (12-column responsive grid) of widgets.
- Widget types:
  - KPI card (single number with trend arrow)
  - Line / bar / pie / area chart
  - Funnel chart (stage-by-stage)
  - Heatmap (e.g., weekday × hour activity)
  - Table (configurable columns, sort, filter)
  - List (cards with picture + label + 2 fields)
  - Gauge (e.g., SLA performance)
  - Map (geographic distribution)
- Widget editor: data source (entity + filters + aggregation) → visualization (chart type + axes + colors) → audience (which roles see it).
- Filters at dashboard level (cascade to all widgets) + per-widget filter overrides.

---

## 16. Reports builder (Phase 4)

- Templates list.
- Template editor:
  - Layout (cover page, header, body sections, footer; markdown + widget placeholders)
  - Output formats (PDF / Excel / CSV / PPT — admin checks which to generate)
  - Schedule (cron expression with friendly UI: "every weekday 09:00", "1st of month")
  - Audience (recipients: roles, specific users, external emails)
  - Branding skin (which theme to render in)
- Run history: list of past runs with output artifacts, status, latency.

---

## 17. Roles & Permissions

- Roles list (system roles + custom roles admin creates).
- Role editor:
  - Code, label, description.
  - Permissions matrix UI (resources × actions; checkboxes + scope picker for `read`/`update`).
  - Inheritance: a role can inherit another's permissions (saves duplication).
- User assignments page: search users, assign/revoke roles with scope.
- Bulk actions: assign role to all users matching a filter.
- Audit: every grant/revoke logged.

---

## 18. Feature Flags

- Flags list (key, description, default, rollout percentage, target roles, target users).
- Flag editor: toggle on/off, set rollout %, add/remove target roles/users.
- Wired to PostHog (open-source); flags evaluated server- and client-side.
- Audit: every flag change logged.

---

## 19. Capability Profile (Phase 1)

- Capability items list grouped by category (services, tech, sectors, geos, certs, team strengths, pricing bands).
- Item editor:
  - Name, description, evidence (links to past projects, certifications, team profiles).
  - Maturity level (1–5).
  - Tags.
  - Source (manual, auto-from-won-opp).
- Bulk import (CSV).
- Auto-enrichment toggle: on every Won opp, auto-add learnings (admin reviews).
- Match weights configuration: per criterion, what's the weight in the fit score?

---

## 20. Versioning & publish workflow

Every Builder Console resource (field, form, template, rule, prompt, dashboard, ...) has a draft/published distinction:

```
[Draft] --edit--> [Draft] --publish--> [Published v2]
                                          ↑
                     [Published v1] -----+
```

- Edits go to a draft; live system uses published version.
- Publish: all references update atomically; old version retained.
- Rollback: one-click revert to a previous published version.
- Diff view: side-by-side comparison of any two versions.

The whole config is also exportable as a JSON bundle (config-as-code) and importable — useful for moving config between environments and version-controlling alongside infra.

---

## 21. Config integrity

The Builder Console runs a continuous validation pass over the full config:
- Are there fields referenced by forms but no longer existing?
- Are there stages referenced by templates but deleted?
- Are there cyclic dependencies in formula fields?
- Are there roles in stakeholder rules that don't exist?
- Are there tagging rules that would tag the same user for the same opp via different paths (potential conflict)?
- Are there decision rules with no makers configured?
- Are there themes referencing missing color tokens?

Validation issues appear in the Builder Dashboard with severity (error / warning / info) and a "fix" link.

---

## 22. Permissions on the Builder Console itself

Only roles with `builder.read` and `builder.write` (defaults: Admin only) can access the Console. Within the Console, finer-grained perms:
- `builder.fields.write`
- `builder.forms.write`
- `builder.stage_templates.write`
- `builder.decision_rules.write`
- `builder.tagging_rules.write`
- `builder.search_recipes.write`
- `builder.notification_rules.write`
- `builder.ai_prompts.write`
- `builder.limits.write`
- `builder.themes.write`
- `builder.locales.write`
- `builder.dashboards.write`
- `builder.reports.write`
- `builder.roles.write`
- `builder.flags.write`

This lets you delegate (e.g., a "Builder Lite" role that can edit search recipes and saved views but not stages or rules).

---

## 23. Mobile parity

The Builder Console is **web/tablet only**. On a phone, navigating to any `/admin/builder/*` route shows a friendly screen: "The Builder Console works best on a larger screen. Please open this on your desktop or tablet." No fallback rendering attempts.

---

## 24. Phase 0 hooks (what to wire now)

Even though the Builder Console is Phase 2, Phase 0 code must be structured so the Console can plug in later without rewrites:

- All field metadata (validations, options, help text) read from a config object — even if the config is hardcoded in Python in Phase 0. Phase 2 swaps the source from Python to DB without changing call sites.
- Stage definitions in DB from day one (Phase 0 seeds 5 rows; Phase 2 lets admin edit).
- Decision rules evaluated through a `decision_engine.resolve(rule, votes)` function — even if Phase 0 has only one hardcoded rule. Phase 2 reads the rule from DB.
- Stakeholder tagging done through a `tagging_engine.compute(opp_attributes)` function. Phase 0 calls it with hardcoded rules; Phase 2 reads rules from DB.
- AI prompts loaded from disk in Phase 0 (`app/prompts/*.md`). Phase 3 mirrors them to a DB table that the Console edits; loader prefers DB version when present.
- Limits read from `system_settings`. Phase 0 seeds the defaults; Phase 2 lets admin edit through Limits page.
- Notification routing through a `notification_router.route(event, recipient)` function. Phase 0 hardcoded; Phase 2 reads from DB rules.

Every "hardcoded" thing in Phase 0 must be hardcoded *behind an interface* so Phase 2 only swaps the implementation. This is the single most important architectural discipline for the planned phasing to work.

---

## 25. Builder Console acceptance criteria (Phase 2)

The Builder Console is "done" when:
1. Admin can create a brand-new vertical from zero — define fields, build intake form, build stage template, configure decision rule, configure tagging rule, configure search recipe, configure notification rules — without anyone touching code.
2. The hardcoded Phase 0 flow (Data Fabrics) is now expressible entirely as Builder Console config; deleting the Phase 0 hardcoded flow leaves Data Fabrics unaffected.
3. Every config change is audit-logged with diff view + rollback.
4. Validation pass catches inconsistencies and surfaces them on the Builder Dashboard.
5. Config export → import works between local / staging / production cleanly.
6. A new vertical lead can self-serve their vertical's setup with the help of an embedded "Builder onboarding" tour (45 min total time-to-first-config).

---

End of BUILDER_CONSOLE.md.

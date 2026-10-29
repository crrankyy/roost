# Kinds (SPEC 3.2)

A closed vocabulary of 13 kinds. There is no catch-all: pick the one whose boundary rule holds. Typed fields are optional; pass the ones you know with `--typed '{json}'`.

| Kind | What it is | Boundary rule | Typed fields |
| --- | --- | --- | --- |
| investigation | Debugging, root-causing a bug or odd behaviour | Not a production event, else incident | `symptom`, `root_cause`, `resolved` |
| incident | Something broke for real users | Has real impact and a timeline | `severity`, `started`, `duration`, `impact` |
| review | Assessment of one change: PR, diff, branch | One change; a codebase sweep is an audit | `target_ref`, `verdict` |
| audit | Systematic sweep: security, deps, tech debt, a11y, cost | Covers a surface, not one change | `scope`, `findings_count`, `severity_max` |
| architecture | Design proposals, ADRs, system design | Decides what or how to structure | `decision_status` |
| plan | Implementation, migration, rollout plans | Decides the order of work, design settled | `status`, `target_date` |
| analysis | Data or metrics answering a question | Inputs are data already held | `dataset`, `question` |
| benchmark | Performance measurements and comparisons | Has a baseline and numbers | `baseline_ref`, `headline_delta` |
| experiment | Spikes, prototypes, A/B, hypothesis tests | Starts with a hypothesis, ends with an outcome | `hypothesis`, `outcome` |
| research | Tool/library evaluations, comparisons, literature | Inputs mostly external | `question`, `recommendation` |
| explainer | How something works: walkthroughs, onboarding | Describes, changes nothing | `subject` |
| runbook | Operational procedures | Written to be executed | `last_verified` |
| summary | Session recaps, progress, release notes, stream wrap-ups | Reports what was done | `period`, `release` |

Tie-breaks: a perf investigation is an investigation when finding *why* it is slow and a benchmark when measuring *how fast*. A security review of one PR is a review; of the repo, an audit. A design-plus-rollout doc is architecture when the design is contested, a plan when settled. Typed fields are optional; the hub shows filled ones as badges.

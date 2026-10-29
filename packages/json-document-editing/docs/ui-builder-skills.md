# UI Builder execution skill contracts

`UIBuilderSkillDefinition` is the registered integration boundary. Hosts inject real or MOCK implementations; prompts do not create capabilities that an implementation does not support.

An optional `contract` declares `requiredInputFieldIds` and exact `outputFields`, each with its supported database field `types`. `createUIBuilderActionTools` exposes this contract through `read_ui_builder_skills`. `configure_ui_builder_action` validates it before saving. `assertUIBuilderSkillContract(execution, fields, skill)` performs the same validation, and `executeUIBuilderAction` applies it before calling the integration. Missing inputs, differing output IDs, and unsupported field types return actionable errors without modifying the project or calling the skill.

Skills without a declared contract retain their existing dynamic-schema behavior. Every result still passes strict field-count, field-value, cancellation, and stale-snapshot validation before it can be committed.

The site's briefing fixture provides these deterministic MOCK contracts:

| Skill | Required inputs | Exact outputs (text/title) |
| --- | --- | --- |
| `mock.brief` | `title`, `description` | `briefing`, `result`, `state` |
| `mock.work` | `key`, `title`, `description`, `briefing`, `approach` | `result`, `state` |
| `mock.complete` | `result` | `state` |

`mock.complete` refuses an empty result and writes `완료`. These skills do not change Jira or send messages. The state field must stay text/title because these fixtures return fixed textual states. A different select state requires an integration that explicitly supports its option IDs; changing the prompt alone cannot implement it.

When an existing project has incompatible wiring, read its skill contracts and restore the expected field IDs/types before running it. Validation does not rewrite stored schemas or silently translate unsupported outputs.

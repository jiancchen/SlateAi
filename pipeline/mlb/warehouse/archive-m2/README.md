# Archived MLB M2 Warehouse Scripts

This folder is the landing zone for old MLB warehouse scripts after their active package aliases and runtime callers have been replaced.

Do not move a script here just because it is legacy. Move it only after:

- a typed replacement exists, or the command is explicitly retired
- package aliases no longer call the old script
- model/workflow references have been removed or redirected
- the warehouse command ledger marks the row as cut over, legacy-only, or retired

Archived scripts remain research references for M2 logic. They are not canonical M3 ingestion, feature materialization, or settlement code.

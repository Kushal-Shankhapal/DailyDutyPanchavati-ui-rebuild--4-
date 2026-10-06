---
name: db-change
description: Plan, write, apply and verify a PostgreSQL migration. Use for any schema, constraint, index or structural seed change.
---
# Database Change Procedure
1. State what the schema cannot express and why a view/projection cannot solve it. If the motive is "UI would be simpler", stop and propose the non-schema option.
2. List affected invariants (ARCHITECTURE.md "Invariants").
3. Forward SQL as next numbered file in db/migrations/. Never edit an applied migration.
4. Rollback, or explicit statement that it is irreversible and why.
5. Which existing rows become invalid and what happens to them.
6. Which API responses/projections change shape.
7. Apply to BOTH dev and test DBs (npm run db:migrate -- --url ...), regenerate types.
8. Verify: run invariant tests; show the new table definition.
Never put station personnel, chowki names or call-signs in migrations or structural seed; those are clerk data loaded from reference-data-derived seeds.

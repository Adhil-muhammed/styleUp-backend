# G. Naming & conventions

| Kind | Pattern |
|---|---|
| Tables | `snake_case`, plural (`bookings`, `auth_users`) |
| Columns | `snake_case` |
| FKs | singular (`staff_id`, not `staffs_id`) |
| Timestamps | `*_at` |
| Money | `*_paise` |
| Indexes | `idx_<table>_<cols>` |
| Foreign keys | `fk_<table>_<ref>` |
| Checks | `chk_<table>_<rule>` |
| Uniques | `uq_<table>_<cols>` |
| Excludes | `ex_<table>_<rule>` |

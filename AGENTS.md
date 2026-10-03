# AGENTS.md

This repo is part of Gatepost, unofficial open-source developer tools for Nigeria's National Digital Postcode. This repo holds the docs site: the guides, the API reference, the spec pages and the playground. It reads the SDKs and the spec from the submodules `js`, `php` and `spec`.

## Read first

- `CODING_STANDARDS.md` and the two files it names hold the rules. Cite rule IDs, such as `API-3`, in reviews and commit bodies.
- `CONTEXT.md` is the glossary. Name things with its terms in code, tests, docs and commits.
- `spec/` holds the grammar, with its Interface section, and the vectors. The spec wins over code and over these docs.

## Rules that no config file shows

- If the task needs a public symbol that the Interface section of `spec/grammar.md` does not list, add nothing, not even an internal helper. Stop, and say that a spec change must come first (API-1, CS-8).
- Call only the documented NIPOST gateway endpoints.
- Commit only NIPOST's published test codes and synthetic values, such as `FC-01-Z99-ZZ-01`.
- Sign off each commit with `git commit -s`. The person who opens the pull request is the only author. Leave out co-author lines for AI tools.
- Change `main` only through pull requests. Keep the history of `main` and of other people's branches as it is: never force-push to them.
- If a commit lacks its sign-off, run `git rebase --signoff` with the base branch. Then push to your own branch with `--force-with-lease`.
- Send every call to the gateway through the client. The client limits how many calls run at once.
- Write prose in plain British English, with short sentences in the active voice.
- Some agent tools change a typed backslash-u escape, such as the one for an en dash, into the character itself. Build such characters with code, for example `chr(0x2013)` in Python or `String.fromCodePoint(0x2013)` in TypeScript. In data and prose, write `U+2013`.
- Load nothing from another website: no fonts, scripts, styles, images or analytics. The site tests fail on each one.

## Done means all of these

1. A failing test came first, and it passes now.
2. `pnpm check` passes. It runs the formatter, linters, tests, every code example, the accessibility checks, `check-tells`, REUSE and zizmor.
3. Each code example on a hand-written page runs in CI and shows the result that it gets.
4. A page that describes the public interface matches the spec and the SDK version in the submodules.
5. Each new domain term is in `CONTEXT.md`.
6. The diff touches only the lines that the task needs.

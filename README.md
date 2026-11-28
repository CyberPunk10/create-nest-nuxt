# create-nest-nuxt

Scaffold a NestJS + Nuxt 4 monorepo in one command: backend, frontend, shared
packages, VitePress docs and Docker, ready to run.

## Quick start

```bash
npx create-nest-nuxt my-app
cd my-app
pnpm install
pnpm dev
```

The generator asks for the docs language and the variant — and what to do if
the folder is not empty. `my-app` is the project folder; leave it out and the
generator asks for a name (default `nest-nuxt-app`).

## Variants

| Variant | What you get |
|---|---|
| `main` | Base: monorepo, frontend, backend, docs. No authentication, no database |
| `auth-session` | Base + session authentication. No database — plug in your own |
| `postgres-prisma` | Base + authentication + PostgreSQL with Prisma |

## Usage

```
create-nest-nuxt [project-name] [options]
```

| Option | Values |
|---|---|
| `--variant <name>` | `main`, `auth-session`, `postgres-prisma` |
| `--lang <code>` | `ru`, `en`, `th` — the docs language, also the language of the questions |
| `--overwrite <action>` | `remove`, `keep` — what to do if the folder is not empty |
| `-h`, `--help` | show help |
| `-v`, `--version` | show version |

Both `--variant auth-session` and `--variant=auth-session` work.

- **Project name** becomes the folder and the `name` in `package.json`. Use
  `.` to create the project in the current folder. If the folder name is not
  a valid package name, you are asked for one; without a terminal it is fixed
  automatically (`My_Shop` → `my_shop`).
- **Non-empty folder**: `remove` deletes everything except `.git`, `keep`
  copies the project over the existing files (files with the same names are
  replaced). Without the flag you are asked; nothing is changed until the
  template is downloaded.
- **Without a terminal** (CI, scripts) there is nobody to ask, so every
  answer must come from arguments:

  ```bash
  npx create-nest-nuxt my-app --variant postgres-prisma --lang en
  ```

## What the generator does

It downloads a tested template release and turns it into your project:

- keeps the docs only in the chosen language, moved to the root of `apps/docs`;
- removes the template's own files: its license, CI and the maintainer docs;
- sets your project name and version `0.0.0` in `package.json` and removes the
  template's `author`, `license`, `keywords` and `description`;
- records the project origin in `package.json` → `templateOrigin`: variant,
  template version, generator version, creation date and docs language. The
  docs home page shows it.

The generator and the template have separate version numbers: each generator
release installs one pinned template release, shown by `--version`
(`0.3.0 (template 0.2.0)`). So
`npx create-nest-nuxt@<version>` with the same answers always creates the same
project.

## License

MIT — see [LICENSE](./LICENSE). This covers the CLI itself; projects you
generate with it carry no license from us.

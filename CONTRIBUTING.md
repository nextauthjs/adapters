# Contributing guide

Contributions and feedback on your experience of using this software are welcome.

This includes bug reports, feature requests, ideas, pull requests, and examples of how you have used this software.

Please see the [Code of Conduct](CODE_OF_CONDUCT.md) and follow any templates configured in GitHub when reporting bugs, requesting enhancements, or contributing code.

Please raise any significant new functionality or breaking change an issue for discussion before raising a Pull Request for it.

## For contributors

Anyone can be a contributor. Either you found a typo, or you have an awesome feature request you could implement, we encourage you to create a Pull Request.

### Pull Requests

- The latest changes are always in `next`, so please make your Pull Request against that branch.
- Pull Requests should be raised for any change

### Setting up local environment

The local environment consists of two pieces:

1. The top-level package.json and its dependencies, like `lerna`.
2. The package-level dependencies which can be installed via npm. Any other package specific instructions can be found in their README's or the [docs](https://next-auth.js.org/adapters/overview).

#### Testing

Testing takes place on a per-adapter basis. Each adapter in the `packages` subdirectory should have an npm test script which will setup a test environment, often consiting of a docker container of the appropriate databse, and a test-runner like jest.

## For maintainers

### Recommended Scopes

A typical conventional commit looks like this:

```
type(scope): title

body
```

Scope is the part that will help groupping the different commit types in the release notes.

Some recommened scopes are:

- **adapter** - Adapter related changes. (eg.: "feat(prisma): add prisma adapter", "docs(prisma): fix typo in X documentation"

> NOTE: If you are not sure which scope to use, you can simply ignore it. (eg.: "feat: add something"). Adding the correct type already helps a lot when analyzing the commit messages.

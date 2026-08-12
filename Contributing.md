# Contributing to Vylop

Thank you for contributing to Vylop! We welcome bug reports, feature requests, documentation improvements, and pull requests.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## How to Contribute

### 1. Reporting Bugs

Before opening a new issue, search existing issues to check whether the problem has already been reported.

When submitting a bug report, include:

* A descriptive title.
* Steps to reproduce the issue.
* Expected vs. actual behavior.
* Environment details such as:

  * Operating system
  * Node.js version
  * Java version
  * Browser and version

---

### 2. Suggesting Enhancements

Feature requests are tracked through GitHub Issues.

When proposing an enhancement, include:

* A clear description of the proposed feature.
* The problem it solves or the use case it addresses.
* Any technical design thoughts or implementation ideas you may have.

---

### 3. Submitting Pull Requests

1. Fork the repository and create your feature branch from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```

2. Keep commits atomic and use clear, descriptive commit messages.

3. Verify that the local build and test suites pass:

   **Backend:**

   ```bash
   mvn test
   ```

   **Frontend:**

   ```bash
   npm test
   ```

4. Push your branch to GitHub and open a Pull Request against `main`.

5. Link any relevant issue numbers in your Pull Request description.

---

## Branch Naming Conventions

Use the following prefixes when creating branches:

| Prefix      | Purpose                                             |
| ----------- | --------------------------------------------------- |
| `feat/`     | New features or functional improvements             |
| `fix/`      | Bug fixes                                           |
| `docs/`     | Documentation updates                               |
| `ci/`       | GitHub Actions and pipeline changes                 |
| `refactor/` | Code changes that neither fix bugs nor add features |

### Examples

```text
feat/collaborative-cursors
fix/websocket-reconnection
docs/update-installation
ci/improve-github-actions
refactor/auth-service
```

---

## Pull Request Guidelines

Before submitting a Pull Request, make sure:

* [ ] The changes are focused and related to the issue or feature.
* [ ] Existing functionality has not been unnecessarily broken.
* [ ] Tests have been added or updated where appropriate.
* [ ] The project builds successfully.
* [ ] Code follows the existing project conventions.
* [ ] Commit messages are clear and descriptive.
* [ ] The Pull Request clearly explains the changes.
* [ ] Related issues are linked.

> [!TIP]
> For larger changes, consider opening an issue first to discuss the proposed approach before spending significant time on implementation.

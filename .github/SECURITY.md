# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of JetOni seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until it has been addressed

### Please Do

1. **Email the maintainers** with details of the vulnerability
2. **Provide detailed information** including:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Allow time for a fix** - We will respond within 48 hours and aim to release a patch within 7 days

## Security Measures

### Automated Security Scanning

This project uses multiple automated security tools:

#### GitLeaks
- **Purpose**: Detect secrets, API keys, and credentials in code and git history
- **Frequency**: On every push, pull request, and weekly scheduled scan
- **Configuration**: `.gitleaks.toml`

#### CodeQL
- **Purpose**: Analyze code for security vulnerabilities and coding errors
- **Frequency**: On every push, pull request, and weekly scheduled scan
- **Languages**: JavaScript, TypeScript

#### Dependency Scanning
- **Purpose**: Monitor npm packages for known vulnerabilities
- **Frequency**: Daily scheduled scan and on every push
- **Tools**: npm audit, Snyk (optional)

#### CI/CD Pipeline
- **Purpose**: Ensure all security checks pass before code is merged
- **Checks**: Tests, linting, type checking, security scans
- **Enforcement**: Required status checks on protected branches

### Development Security

#### Local Security Checks

Before committing code, run local security checks:

```bash
# Run GitLeaks scan
make gitleaks

# Run all security checks
make security-check

# Run tests (includes security checks in CI)
make test
```

#### Installing GitLeaks Locally

**macOS:**
```bash
brew install gitleaks
```

**Linux:**
```bash
# Download latest release
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

**Windows:**
```powershell
# Using Chocolatey
choco install gitleaks

# Or download from GitHub releases
# https://github.com/gitleaks/gitleaks/releases
```

### Best Practices

#### Secrets Management

- **Never commit secrets**: API keys, tokens, passwords, or credentials
- **Use environment variables**: Store sensitive data in environment variables
- **Use GitHub Secrets**: For CI/CD workflows, use GitHub Secrets
- **Rotate secrets regularly**: Change secrets periodically
- **Use .gitignore**: Ensure sensitive files are ignored

#### Code Security

- **Input validation**: Always validate user input
- **Output encoding**: Prevent XSS attacks by encoding output
- **Dependency updates**: Keep dependencies up to date
- **Code review**: All code must be reviewed before merging
- **Principle of least privilege**: Grant minimum necessary permissions

#### Git Hygiene

- **Review before commit**: Check `git diff` before committing
- **Small commits**: Make focused, reviewable commits
- **Signed commits**: Use GPG signing for commit verification (optional)
- **Protected branches**: Main branch requires reviews and passing checks

### Security Checklist

Before submitting a pull request:

- [ ] No secrets or credentials in code
- [ ] All tests pass (`make test`)
- [ ] Security checks pass (`make security-check`)
- [ ] Dependencies are up to date
- [ ] Code has been reviewed
- [ ] No sensitive data in commit history
- [ ] `.gitignore` is properly configured

### Incident Response

If a security vulnerability is discovered:

1. **Immediate action**: Remove exposed secrets, revoke credentials
2. **Assess impact**: Determine scope and severity
3. **Develop fix**: Create and test a patch
4. **Deploy fix**: Release patch as quickly as possible
5. **Notify users**: Inform affected users if necessary
6. **Post-mortem**: Document incident and improve processes

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [GitLeaks Documentation](https://github.com/gitleaks/gitleaks)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)

## Contact

For security concerns, please contact the maintainers directly rather than opening a public issue.

## Acknowledgments

We appreciate the security research community and will acknowledge researchers who responsibly disclose vulnerabilities (with their permission).

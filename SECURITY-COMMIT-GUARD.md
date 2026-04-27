# Secret Push Protection

## One-time setup

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

## Notes

- `.env` and `.env.*` are ignored.
- Use `.env.example` for safe placeholders only.
- Rotate any secret immediately if it was committed by mistake.

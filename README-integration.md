# NEXO Branding Submodule Integration

This guide explains how to manage the **nexo-branding** submodule inside other repositories (e.g., `nexo-charge`, `nexo-hub`).

---

## 📥 Cloning with Submodules

When cloning a repo that contains `nexo-branding` as a submodule:

```bash
git clone https://github.com/<org-or-user>/<repo>.git
cd <repo>
git submodule update --init --recursive
```

---

## 🔄 Updating Branding Assets

If the `nexo-branding` repo has new commits (new logos, brand book updates):

```bash
cd branding
git fetch origin
cd ..
git submodule update --remote --merge
```

Then commit the submodule update in the parent repo:

```bash
git add branding
git commit -m "chore(branding): update branding submodule"
git push
```

---

## 📌 Notes

* Always commit the **submodule reference** after updating.
* Do not edit files directly inside `branding/` from the parent repo.
* Make changes to branding only in the **nexo-branding** repository, then update submodules.

---

✅ Following this workflow ensures that all repos always point to the latest official NEXO branding.

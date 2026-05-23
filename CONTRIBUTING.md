# 🤝 Contributing to DocDoctor

First off, thank you for taking the time to contribute to **DocDoctor**! It is developers like you who make the open-source community an amazing place to learn, inspire, and create. 

Please read through these guidelines to understand how you can help this project grow and achieve maximum reach!

---

## 🌟 How Can I Contribute?

### 1. Reporting Bugs & Issues
* **Search First**: Before opening a new issue, check if it has already been reported.
* **Be Descriptive**: Include your OS (Windows, macOS, Linux), Python version, Node.js version, and active AI engine mode (Offline/Online).
* **Provide Logs**: Copy terminal logs from the FastAPI backend or browser developer console errors.

### 2. Proposing Features & Enhancement ideas
* **Open a Discussion**: Suggest features in a GitHub Issue using the `feature-request` template.
* **Explain the Use Case**: Detail why this feature is beneficial (e.g., "Adding a Groq engine integration to support sub-second cloud summaries").

### 3. Submitting Pull Requests (PRs)
1. **Fork the Repository**: Create your own fork and branch off `main`.
2. **Respect the Structure**:
   * Keep backend endpoints modular inside [api/routes.py](file:///c:/Users/bhaskar/Desktop/DocDoctor/backend/api/routes.py).
   * Put database migrations inside [services/db_service.py](file:///c:/Users/bhaskar/Desktop/DocDoctor/backend/services/db_service.py).
   * Retain the gorgeous glassmorphism UI styles in the [frontend/components](file:///c:/Users/bhaskar/Desktop/DocDoctor/frontend/components/) directory.
3. **Verify Type Safety**:
   * Run the python compilation check: `python -m py_compile backend/main.py`.
   * Run typescript type checking: `npx tsc --noEmit` inside the `frontend/` directory.
4. **Format Your Commit Messages**:
   * `feat: add groq AI provider dynamic switch`
   * `fix: resolve ast scanner parameter type extraction error`
   * `docs: update API endpoints specs visual grid`

---

## 🚀 Coding Standards

### Backend (FastAPI / Python)
* Document all router endpoints with explicit Pydantic response schemas.
* Wrap heavy network/git actions inside FastAPI's async `BackgroundTasks` to prevent HTTP timeouts.
* Handle API errors cleanly and return appropriate HTTP status codes (e.g., `404 Not Found` when a document is still generating).

### Frontend (Next.js / TypeScript)
* Keep components strictly visual, modular, and type-safe.
* Retain state synchronization using React contexts where appropriate.
* Do not introduce ad-hoc utility styling: stick to our harmonious dark-theme/radial gradient design token guidelines.

---

## 💎 Community Guidelines

* **Be Respectful**: Encourage newcomers, provide positive code reviews, and build a collaborative space.
* **Write Beautiful Code**: Keep documentation integrity by maintaining descriptive docstrings and comments.

*Thank you for making DocDoctor the ultimate self-healing codebase intelligence agent!* 🩺✨

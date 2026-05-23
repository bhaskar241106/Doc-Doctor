import logging
from typing import Dict, Any, List
from backend.services.ai_service import ai_service

logger = logging.getLogger("doc_generator")

class DocGenerator:
    async def generate_readme(self, repo_name: str, codebase_structure: List[str], file_summaries: str) -> str:
        """Generates a stunning README.md for the repository using its structural metadata."""
        system_prompt = (
            "You are an expert technical writer and senior systems architect. "
            "Your job is to generate a comprehensive, highly professional, and beautiful README.md. "
            "Ensure the markdown has rich visual styling, clear tables, and lists of components."
        )
        
        prompt = f"""
        Generate a complete, production-grade README.md for the repository: '{repo_name}'.
        
        CODEBASE DIRECTORY FILES:
        {chr(10).join(codebase_structure)}
        
        CODE ANALYSIS & CORE COMPONENTS SUMMARY:
        {file_summaries}
        
        INSTRUCTIONS:
        1. Write a professional project overview and vision.
        2. Create a clean, visual folder structure map.
        3. Highlight the Core Architecture, and state what each main folder/module is responsible for.
        4. Provide an Quick Start/Installation section (assume standard installation for this language stack).
        5. Describe how to run, test, and build the project.
        6. Do not use placeholders or generic templates. Fill in all details based on the codebase structure provided.
        7. Use GitHub flavored markdown elements (bullet points, bold text, code blocks, alerts like [!NOTE], [!TIP]).
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
        logger.info(f"Generating README for {repo_name}...")
        return await ai_service.generate(prompt=prompt, system_prompt=system_prompt)

    async def generate_api_docs(self, repo_name: str, api_metadata: List[Dict[str, Any]]) -> str:
        """Generates beautifully structured API documentation based on parsed AST inputs."""
        system_prompt = (
            "You are a senior software engineer and API designer. "
            "Your job is to generate detailed, structured, and complete API reference documentation. "
            "Use clear headers, tables, and code snippets demonstrating usage."
        )
        
        # Format parsed API metadata (classes, functions, endpoints)
        formatted_metadata = []
        for item in api_metadata:
            filename = item.get("filename", "unknown")
            classes = item.get("classes", [])
            functions = item.get("functions", [])
            
            file_section = f"### File: {filename}\n"
            if classes:
                file_section += "#### Classes:\n"
                for cls in classes:
                    file_section += f"- **Class `{cls['name']}`** (lines {cls['start_line']}-{cls['end_line']})\n"
                    if cls.get("docstring"):
                        file_section += f"  - *Docstring*: {cls['docstring']}\n"
                    if cls.get("bases"):
                        file_section += f"  - *Bases*: `{', '.join(cls['bases'])}`\n"
            
            if functions:
                file_section += "#### Functions / Methods:\n"
                for fn in functions:
                    scope = f"Method in Class `{fn['class_name']}`" if fn.get("class_name") else "Global Function"
                    args_str = ", ".join(fn.get("arguments", []))
                    file_section += f"- **{scope} `{fn['name']}({args_str})`** (lines {fn['start_line']}-{fn['end_line']})\n"
                    if fn.get("docstring"):
                        file_section += f"  - *Docstring*: {fn['docstring']}\n"
            
            formatted_metadata.append(file_section)

        prompt = f"""
        Generate a complete API.md Reference Document for repository: '{repo_name}'.
        
        PARSED CODE STRUCTURE & ENDPOINTS DETECTED:
        {chr(10).join(formatted_metadata)}
        
        INSTRUCTIONS:
        1. Write an overview of the APIs, modules, and namespaces in this repository.
        2. Create a clean Markdown table summarizing all Core Classes and Functions.
        3. Detail each Class, its properties, inherits, and methods.
        4. Detail all major Global Functions and Endpoint hooks. Provide example mock usages or import imports.
        5. Format return types and parameters clearly in tables.
        6. Organize from highest-level controllers down to low-level utility libraries.
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
        logger.info(f"Generating API Documentation for {repo_name}...")
        return await ai_service.generate(prompt=prompt, system_prompt=system_prompt)

    async def generate_architecture_summary(self, repo_name: str, structure: List[str], rag_context: str) -> str:
        """Generates architectural explanations and insights from codebase structural analysis."""
        system_prompt = (
            "You are a Staff Software Architect. "
            "You write elegant, comprehensive, and clear systems architecture and design pattern documentations. "
            "Use clear architectural boundaries and modular diagrams."
        )
        
        prompt = f"""
        Write a systems ARCHITECTURE.md explanation for the repository '{repo_name}'.
        
        FILE LAYOUT:
        {chr(10).join(structure)}
        
        ARCHITECTURAL ANALYSIS / CODE CONTEXTS:
        {rag_context}
        
        INSTRUCTIONS:
        1. Define the Architectural Pattern (e.g. MVC, Clean Architecture, Hexagonal, Micro-services, Monolith, Modular, RAG system) used in this repository.
        2. Describe the Data Flow in detail (e.g. how a request flows from incoming webhooks or UI views down to DB models and vector layers).
        3. Break down the components into separate Logical Layers (Presentation layer, Business logic, Integration Layer, Storage layer).
        4. Explain key design patterns found (e.g. Singleton singletons, factory patterns, strategy injection, pub-sub listeners).
        5. Create a visual ASCII text-based block diagram or Mermaid structure of the system's architecture.
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
        logger.info(f"Generating Architecture Documentation for {repo_name}...")
        return await ai_service.generate(prompt=prompt, system_prompt=system_prompt)

    async def generate_onboarding_guide(self, repo_name: str, structure: List[str], file_summaries: str) -> str:
        """Generates a perfect developer onboarding guide to quickly ramp up new engineers."""
        system_prompt = (
            "You are an empathetic, world-class developer experience engineer and team lead. "
            "Your objective is to write the ultimate developer onboarding guide that explains complex systems simply."
        )
        
        prompt = f"""
        Generate a comprehensive, beautiful ONBOARDING.md developer guide for repository: '{repo_name}'.
        
        REPOSITORY FILE DIRECTORY:
        {chr(10).join(structure)}
        
        KEY MODULES ANALYSIS:
        {file_summaries}
        
        INSTRUCTIONS:
        1. Welcome the new engineer and lay out a clear "Day 1 to Week 1" onboarding path.
        2. Demystify the codebase structure: explain the main folders, entry point files, and where key features live.
        3. Provide step-by-step Local Environment Setup: explain prerequisites, virtual environment creation, npm/pip install, database initialization, and environment variable configs.
        4. Write a "How to Build Your First Feature" guide: outline where to write a new schema/endpoint, where to add UI, and how to verify code.
        5. Detail testing guidelines: how to run tests, where to write test assertions.
        6. Use highly positive, encouraging developer language. Include tips, warnings, and quick checklists.
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
        logger.info(f"Generating Onboarding Guide for {repo_name}...")
        return await ai_service.generate(prompt=prompt, system_prompt=system_prompt)

    async def generate_pr_summary(self, repo_name: str, author: str, commit_message: str, diff_files: Dict[str, List[str]]) -> str:
        """Generates a semantic PR / Commit summary for changed repository deltas."""
        system_prompt = (
            "You are an elite developer and automation system. "
            "You write concise, clean, and highly readable PR descriptions and changelogs."
        )
        
        prompt = f"""
        Generate a Pull Request / Commit Summary for repository: '{repo_name}'.
        
        COMMIT METADATA:
        - Author: {author}
        - Message: {commit_message}
        
        FILES MODIFIED:
        - Added files: {diff_files.get("added", [])}
        - Modified files: {diff_files.get("modified", [])}
        - Deleted files: {diff_files.get("deleted", [])}
        
        INSTRUCTIONS:
        1. Write a 2-3 sentence semantic summary of what this code changes.
        2. Create a checklist of Technical Changes grouped by impact (e.g. backend api routes, service helpers, schemas updates).
        3. Highlight the architectural or documentation impact of these changes (e.g. does this require an API doc refresh or new README entries?).
        4. Keep it extremely crisp, concise, and clear.
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
    async def generate_deployment_docs(self, repo_name: str, structure: List[str], infra_metadata: str) -> str:
        """Generates premium systems deployment and devops documentation."""
        system_prompt = (
            "You are a Staff DevOps and Cloud Infrastructure Engineer. "
            "Your objective is to generate elegant, precise, and robust DEPLOYMENT.md deployment operations guides."
        )
        
        prompt = f"""
        Generate a complete, production-grade DEPLOYMENT.md systems deployment guide for repository: '{repo_name}'.
        
        REPOSITORY FILES:
        {chr(10).join(structure)}
        
        DETECTED INFRASTRUCTURE & CONFIGURATION FILES:
        {infra_metadata}
        
        INSTRUCTIONS:
        1. Write a detailed systems operations and deployment guide.
        2. Describe the deployment requirements and target environments (e.g. Docker, Kubernetes, standard VM, or cloud server).
        3. Outline a step-by-step Production Setup Guide including environment variables, database setup, caching options, and network port binds.
        4. Provide an elegant, copyable `Dockerfile` or `docker-compose.yml` config illustration based on the project stack.
        5. Detail server scaling, process management (e.g. using systemd, PM2, or Gunicorn), and logging configuration guidelines.
        6. Include critical tips on security, certificates, backups, and health check monitoring.
        
        Return ONLY the raw markdown content without any wrapping quotes or preamble.
        """
        
        logger.info(f"Generating Systems Deployment Guide for {repo_name}...")
        return await ai_service.generate(prompt=prompt, system_prompt=system_prompt)

doc_generator = DocGenerator()

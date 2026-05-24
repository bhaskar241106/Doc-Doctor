"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CubeVisualization from "./CubeVisualization";

export default function LandingPage() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply theme preference from localStorage or system
    const saved = localStorage.getItem("docdoctor-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved ? saved === "dark" : prefersDark;
    
    setIsDark(shouldBeDark);
    applyTheme(shouldBeDark);
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    applyTheme(newIsDark);
    localStorage.setItem("docdoctor-theme", newIsDark ? "dark" : "light");
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #080808;
          --surface: #101010;
          --border: #1e1e1e;
          --white: #ffffff;
          --muted: #6b6b6b;
          --footer: #3a3a3a;
          --badge-bg: #2d1506;
          --badge-border: rgba(249, 115, 22, 0.35);
          --badge-text: #f97316;
          --btn-bg: #ffffff;
          --btn-text: #000000;
          --font: "Inter", system-ui, sans-serif;
        }

        :root.light {
          --bg: #fbfbfb;
          --surface: #edecec;
          --border: #e2e2e2;
          --white: #0f172a;
          --muted: #64748b;
          --footer: #94a3b8;
          --badge-bg: #fff7ed;
          --badge-border: rgba(249, 115, 22, 0.2);
          --badge-text: #ea580c;
          --btn-bg: #0f172a;
          --btn-text: #ffffff;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: var(--bg);
          font-family: var(--font);
          transition: background 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ghost-square {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          border-radius: 7px;
          background: var(--surface);
          transition: background 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: none;
        }

        nav {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 28px 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        }

        .logo-group,
        #theme-toggle {
          pointer-events: auto;
        }

        .logo-group {
          display: flex;
          flex-direction: column;
          text-decoration: none;
        }

        .logo-text {
          font-size: 17px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -0.025em;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .logo-sub {
          color: var(--footer);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-top: 2px;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #theme-toggle {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--white);
          padding: 7px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #theme-toggle:hover {
          border-color: var(--white);
          background: rgba(128, 128, 128, 0.05);
        }

        .hero {
          position: absolute;
          bottom: 130px;
          left: 44px;
          z-index: 10;
          max-width: 500px;
          pointer-events: none;
        }

        .hero * {
          pointer-events: auto;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          background: var(--badge-bg);
          border: 1px solid var(--badge-border);
          color: var(--badge-text);
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 4px;
          margin-bottom: 22px;
          letter-spacing: 0.01em;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        h1 {
          font-size: clamp(42px, 4.8vw, 62px);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.035em;
          margin: 0 0 20px 0;
        }

        .line-1 {
          color: var(--white);
          display: block;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .line-2 {
          color: var(--muted);
          display: block;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .description {
          font-size: 14.5px;
          line-height: 1.72;
          color: var(--muted);
          margin: 0 0 24px 0;
          max-width: 420px;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cta-btn {
          background: var(--btn-bg);
          color: var(--btn-text);
          font-size: 13.5px;
          font-weight: 600;
          padding: 10px 22px;
          border-radius: 6px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .cta-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        footer {
          position: absolute;
          bottom: 30px;
          left: 44px;
          right: 44px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          pointer-events: none;
        }

        footer * {
          pointer-events: auto;
        }

        .footer-right {
          display: flex;
          gap: 20px;
        }

        .legal-link {
          font-size: 11px;
          color: var(--footer);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .legal-link:hover {
          color: var(--white);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-item {
          animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .hero .badge {
          animation-delay: 0.08s;
        }
        .hero h1 {
          animation-delay: 0.18s;
        }
        .hero .description {
          animation-delay: 0.30s;
        }
        .hero .cta-btn {
          animation-delay: 0.36s;
        }
      `}</style>

      <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <CubeVisualization isDark={isDark} />

        <nav>
          <Link href="/" className="logo-group">
            <span className="logo-text">DocDoctor</span>
            <span className="logo-sub">AUTONOMOUS INTELLIGENCE</span>
          </Link>
          <button id="theme-toggle" onClick={toggleTheme}>
            <svg style={{ width: "12px", height: "12px", fill: "currentColor" }} viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
            </svg>
            <span>Theme</span>
          </button>
        </nav>

        <div className="hero">
          <div className="badge animate-item">Autonomous Synchronizer</div>
          <h1 className="animate-item">
            <span className="line-1">The AI that writes</span>
            <span className="line-2">your docs as you code</span>
          </h1>
          <p className="description animate-item">
            DocDoctor continuously parses your codebase via AST, populates ChromaDB with vector embeddings, and generates real-time synchronized markdown documentation.
          </p>
          <div>
            <Link href="/dashboard" className="cta-btn animate-item">
              Repo Dash &rarr;
            </Link>
          </div>
        </div>

        <footer>
          <div className="footer-right">
            <Link href="#" className="legal-link">
              Privacy Policy
            </Link>
            <Link href="#" className="legal-link">
              Terms of Use
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}

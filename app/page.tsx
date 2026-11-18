import Link from "next/link";
import Terminal from "@/components/terminal";
import { profile } from "@/content/profile";

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Hossein Mohammaddokht, homepage">
          <span className="brand-mark">hm<span className="brand-dot">.</span></span>
          <span className="brand-caption">PERSONAL / TERMINAL</span>
        </Link>
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/resume">View CV</Link>
          <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf" className="nav-download">Download PDF ↗</a>
        </nav>
      </header>
      <main id="main" className="landing">
        <section className="hero" aria-labelledby="hero-name">
          <div className="hero-overline"><span className="live-dot" /> AVAILABLE TO CONNECT · TEHRAN, IRAN</div>
          <h1 id="hero-name">Hossein<br/><span>Mohammaddokht</span><span className="hero-period">.</span></h1>
          <div className="hero-bottom">
            <p className="hero-role">{profile.role}<br/><span>{profile.focus}</span></p>
            <p className="hero-intro">I work with the infrastructure behind software — Linux, APIs, Kubernetes and the tools that keep services running. I&apos;m now building products around AI systems and agent workflows.</p>
          </div>
          <div className="hero-chips" aria-label="Primary focus areas">
            <span>01 / API PLATFORMS</span><span>02 / INFRASTRUCTURE</span><span>03 / AI SYSTEMS</span>
          </div>
        </section>
        <section className="terminal-section" aria-labelledby="terminal-title">
          <div className="terminal-section-top">
            <div><span className="index">[01]</span><h2 id="terminal-title">Explore my CV</h2></div>
            <p>One CV. Two ways to explore.</p>
          </div>
          <Terminal />
        </section>
        <section className="outside-terminal" aria-label="Quick access">
          <div>
            <p className="section-tag">NOT INTO TERMINALS?</p>
            <h2>No commands required.</h2>
            <p>The full resume is available as a normal web page, and the PDF is one click away.</p>
          </div>
          <div className="outside-actions"><Link href="/resume" className="primary-button">Read full CV <span aria-hidden>↗</span></Link><a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf" className="secondary-button">Get the PDF <span aria-hidden>↓</span></a></div>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span>Built with Next.js · No tracking · No shell access</span>
        <a href={`mailto:${profile.email}`}>Say hello ↗</a>
      </footer>
    </div>
  );
}

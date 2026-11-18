import Link from "next/link";
import { profile } from "@/content/profile";

export const metadata = {
  title: "Resume — Hossein Mohammaddokht",
  description: "Experience, skills, projects and education of Hossein Mohammaddokht.",
};

export default function ResumePage() {
  return (
    <div className="resume-shell">
      <a className="skip-link" href="#resume-main">Skip to resume</a>
      <header className="resume-nav">
        <Link href="/" aria-label="Back to terminal">← Terminal</Link>
        <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf" className="nav-download">Download PDF ↓</a>
      </header>
      <main id="resume-main" className="resume-document">
        <header className="resume-intro">
          <p className="section-tag">HOSSEIN / CV</p>
          <h1>{profile.name}</h1>
          <p className="resume-title">{profile.role} <span className="resume-separator">/</span> {profile.focus}</p>
          <div className="resume-contacts">
            <span>{profile.location}</span>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          </div>
        </header>
        <section className="resume-section" aria-labelledby="r-profile">
          <h2 id="r-profile"><span>01</span> Profile</h2>
          <div className="resume-body"><p>{profile.introduction}</p><p>{profile.direction}</p></div>
        </section>
        <section className="resume-section" aria-labelledby="r-skills">
          <h2 id="r-skills"><span>02</span> Skills</h2>
          <div className="resume-body skill-grid">
            {profile.skills.map((group) => (
              <div className="skill-entry" key={group.id}>
                <h3>{group.title}</h3><p>{group.items.join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="resume-section" aria-labelledby="r-experience">
          <h2 id="r-experience"><span>03</span> Work experience</h2>
          <div className="resume-body">
            {profile.experience.map((job) => (
              <article className="resume-job" key={job.id}>
                <div className="resume-job-heading"><div><h3>{job.title}</h3><p className="company-name">{job.company}</p></div><p className="dates">{job.dates}<br/>{job.location}</p></div>
                <ul>{job.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
        <section className="resume-section" aria-labelledby="r-projects">
          <h2 id="r-projects"><span>04</span> Projects</h2>
          <div className="resume-body">
            {profile.projects.map((project) => (
              <article className="resume-job" key={project.id}>
                <div className="resume-job-heading"><div><h3>{project.name}</h3><p className="company-name">{project.title}</p></div><span className="project-status">{project.status}</span></div>
                <p>{project.description}</p>
                <ul>{project.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                <div className="project-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              </article>
            ))}
          </div>
        </section>
        <section className="resume-section" aria-labelledby="r-education">
          <h2 id="r-education"><span>05</span> Education</h2>
          <div className="resume-body">
            {profile.education.map((item) => (
              <div className="education-entry" key={item.title}><div><h3>{item.title}</h3><p>{item.school}</p></div><span className="dates">{item.dates}</span></div>
            ))}
          </div>
        </section>
        <section className="resume-section" aria-labelledby="r-training">
          <h2 id="r-training"><span>06</span> Training & courses</h2>
          <div className="resume-body"><ul>{profile.training.map(item => <li key={item}>{item}</li>)}</ul></div>
        </section>
        <section className="resume-section" aria-labelledby="r-languages">
          <h2 id="r-languages"><span>07</span> Languages</h2>
          <div className="resume-body languages">
            {profile.languages.map(lang => <div key={lang.name}><strong>{lang.name}</strong><span>{lang.level}</span></div>)}
          </div>
        </section>
        <div className="resume-end"><Link href="/">← Back to terminal</Link><a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf">Download PDF ↓</a></div>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} {profile.name}</span><span>Readable without JavaScript</span></footer>
    </div>
  );
}

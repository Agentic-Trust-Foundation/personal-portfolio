import Link from "next/link";
import { Mail, MapPin, Smartphone, Linkedin } from "lucide-react";
import { profile, type Experience, type Project } from "@/content/profile";
import "./novoresume.css";

/**
 * Recreated from the user's exported Novorésumé HTML/SVG/CSS.
 * The editorial content comes exclusively from the canonical portfolio profile.
 * No editor controls, trackers, external font binaries or third-party scripts.
 */
export const metadata = {
  title: `Resume — ${profile.name}`,
  description: `${profile.name} — DevOps, API Management and AI Platform Engineering`,
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="ncv-section-title">{children}</h2>;
}

function Job({ job }: { job: Experience }) {
  return (
    <article className="ncv-job">
      <h3>{job.title}</h3>
      <p className="ncv-job-company">{job.company}</p>
      <p className="ncv-job-date">{job.dates} &nbsp; | &nbsp; {job.location}</p>
      <div className="ncv-job-label">Achievements / Tasks</div>
      <ul className="ncv-list">
        {job.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
      </ul>
    </article>
  );
}

function ProjectEntry({ project }: { project: Project }) {
  return (
    <article className="ncv-project">
      <h3>{project.name}</h3>
      <div className="ncv-project-sub">{project.title} <span className="ncv-project-state"> · {project.status}</span></div>
      <p>{project.description}</p>
    </article>
  );
}

function Footer({ number }: { number: 1 | 2 }) {
  return <footer className="ncv-footer"><span></span><span>Personal CV · HTML edition</span><span>Page {number} of 2</span></footer>;
}

export default function ResumePage() {
  return (
    <div className="ncv-shell">
      <a href="#resume-pages" className="skip-link">Skip to resume</a>
      <nav className="ncv-toolbar" aria-label="Resume navigation">
        <Link href="/">← Back to terminal</Link>
        <div className="ncv-tools">
          <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf" className="ncv-download">Download PDF ↓</a>
        </div>
      </nav>
      <main className="ncv-stack" id="resume-pages" aria-label="Two-page resume">
        <div className="ncv-page-frame">
          <article className="ncv-paper ncv-page1" aria-label="Resume page 1 of 2">
            <header className="ncv-header">
              <div className="ncv-heading">
                <h1 className="ncv-name">{profile.name}</h1>
                <p className="ncv-role">{profile.role}</p>
                <p className="ncv-summary">{profile.introduction}</p>
                <p className="ncv-summary">{profile.direction}</p>
              </div>
              <div className="ncv-contact">
                <a className="ncv-contact-line" href={`mailto:${profile.email}`}><Mail className="ncv-contact-icon" aria-hidden="true" /><span>{profile.email}</span></a>
                <a className="ncv-contact-line" href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}><Smartphone className="ncv-contact-icon" aria-hidden="true" /><span>{profile.phone}</span></a>
                <div className="ncv-contact-line"><MapPin className="ncv-contact-icon" aria-hidden="true" /><span>{profile.location}</span></div>
                <a className="ncv-contact-line" href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="ncv-contact-icon" aria-hidden="true" /><span>{profile.linkedin}</span></a>
              </div>
            </header>
            <section className="ncv-section" aria-labelledby="ncv-skills">
              <Heading>Skills</Heading>
              <div className="ncv-skill-tags" id="ncv-skills">
                {profile.skills.map((s) => <span className="ncv-skill-chip" key={s.id}><strong>{s.title}: </strong>{s.items.join(", ")}</span>)}
              </div>
            </section>
            <section className="ncv-section" aria-labelledby="ncv-work">
              <Heading>Work Experience</Heading>
              <div id="ncv-work">{profile.experience.slice(0, 3).map((job) => <Job job={job} key={job.id} />)}</div>
            </section>
            <Footer number={1} />
          </article>
        </div>
        <div className="ncv-page-frame">
          <article className="ncv-paper ncv-page2" aria-label="Resume page 2 of 2">
            <section className="ncv-section">
              <Heading>Work Experience</Heading>
              {profile.experience.slice(3).map((job) => <Job job={job} key={job.id} />)}
            </section>
            <section className="ncv-section">
              <Heading>Certificates &amp; Training</Heading>
              <div className="ncv-two-col">
                {profile.training.map((item) => <div className="ncv-cert-item" key={item}>{item}</div>)}
              </div>
            </section>
            <section className="ncv-section">
              <Heading>Education</Heading>
              <div className="ncv-two-col">
                {profile.education.map((item) => <div className="ncv-education-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <div>{item.school}</div>
                  <div className="ncv-education-meta">{item.dates} | Tehran</div>
                </div>)}
              </div>
            </section>
            <section className="ncv-section">
              <Heading>Languages</Heading>
              <div className="ncv-language-grid">
                {profile.languages.map((item) => <div className="ncv-language-item" key={item.name}>
                  <strong>• {item.name}</strong><em>{item.level}</em>
                </div>)}
              </div>
            </section>
            <section className="ncv-section">
              <Heading>Personal Projects</Heading>
              <div className="ncv-projects">{profile.projects.map((project) => <ProjectEntry key={project.id} project={project}/>)}</div>
            </section>
            <Footer number={2} />
          </article>
        </div>
      </main>
    </div>
  );
}

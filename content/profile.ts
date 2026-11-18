import source from "./profile.json";

/** Shared types; edit profile.json to update all CV surfaces. */
export interface Experience {
  id: string; title: string; company: string; dates: string;
  location: string; summary: string; bullets: string[];
}
export interface Project {
  id: string; name: string; title: string; status: string;
  short: string; description: string; bullets: string[]; tags: string[];
}
export interface Profile {
  name: string; role: string; focus: string; location: string;
  email: string; phone: string; github: string; githubUrl: string;
  linkedin: string; linkedinUrl: string; introduction: string;
  direction: string;
  skills: { id: string; title: string; items: string[] }[];
  experience: Experience[]; projects: Project[];
  education: { title: string; school: string; dates: string; location: string }[];
  training: string[]; languages: { name: string; level: string }[];
}

export const profile: Profile = source;

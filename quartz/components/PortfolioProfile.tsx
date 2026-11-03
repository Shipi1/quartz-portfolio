import { joinSegments, pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

// Keep personal details together so this header is easy to update.
export const profile = {
  name: "Martin Arias",
  role: "Sound Design & Audio Post Production",
  education: "Audio Engineering · Duoc UC Viña del Mar",
  email: "arias.martin1@gmail.com",
  github: "https://github.com/Shipi1",
  linkedin: "https://www.linkedin.com/in/martin-arias-herrera/",
  image: "static/profile.webp",
}

export default (() => {
  const PortfolioProfile: QuartzComponent = ({ fileData }) => (
    <section class="profile-hero" aria-labelledby="profile-name">
      <img
        class="profile-photo"
        src={joinSegments(pathToRoot(fileData.slug!), profile.image)}
        alt="Audio workstation with headphones"
        width="144"
        height="144"
        loading="eager"
        decoding="async"
      />
      <div class="profile-details">
        <h1 id="profile-name">{profile.name}</h1>
        <p class="profile-role">{profile.role}</p>
        <p class="profile-education">{profile.education}</p>
        <div class="profile-links">
          <a class="profile-email" href={`mailto:${profile.email}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 6 9 7 9-7" />
            </svg>
            Email
          </a>
          <a
            class="profile-social"
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 19c-4.3 1.3-4.3-2.2-6-2.5M15 22v-4a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.4-3.7 4.8 4.8 0 0 0-.1-3.6S17.7.9 15 2.6a13 13 0 0 0-6 0C6.3.9 5.2 1.2 5.2 1.2a4.8 4.8 0 0 0-.1 3.6A5.3 5.3 0 0 0 3.7 8.5c0 5.3 3.2 6.5 6.2 6.8A3.4 3.4 0 0 0 9 18v4" />
            </svg>
          </a>
          <a
            class="profile-social"
            href={profile.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="9" width="4" height="12" />
              <circle cx="5" cy="4" r="2" />
              <path d="M11 21V9h4v2a4 4 0 0 1 7 3v7h-4v-7a1.5 1.5 0 0 0-3 0v7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
  return PortfolioProfile
}) satisfies QuartzComponentConstructor

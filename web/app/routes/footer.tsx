import { Bot } from "lucide-react"
import { Separator } from "../components/ui/separator"
import { Github, Linkedin, Mail, ExternalLink, Globe } from 'lucide-react'
import { Link } from "react-router"

// const Footer = () => {
//   return (
//     <footer className="bg-background text-muted-foreground">
//       <Separator className="bg-border" />

//       {/* <div className="mx-auto grid max-w-8xl grid-cols-3 items-center px-2 sm:px-6 py-6"> */}
//         <div className="grid auto-rows-min gap-1 grid-cols-1 sm:gap-4 sm:grid-cols-3 px-2 sm:px-6 py-3">

//         {/* LEFT side (empty to balance layout) */}
//         <div></div>

//         {/* CENTER section */}
//         <div className="flex items-center justify-center gap-2 justify-center">

//           <Bot className="h-6 w-6 text-muted-foreground" />
//           <p className="text-sm whitespace-nowrap">
//             © 2025 <span className="text-foreground">Hello Friend</span>
//           </p>

//         </div>

//         {/* RIGHT side */}
//         <div className="flex items-center justify-center sm:justify-end">
//           <p className="text-sm text-muted-foreground text-right">
//             v1.1.0
//           </p>
//         </div>
//       </div>
//     </footer>
//   )
// }
      
const Footer = () => {
  const currentYear = new Date().getFullYear()
  const version = '1.5.0'

  const socialLinks = [
    {
      name: 'GitHub',
      displayName: 'github.com/hell0-fri3nd',
      url: 'https://github.com/hell0-fri3nd',
      icon: Github,
      ariaLabel: 'Visit Art Lisboa on GitHub',
    },
    {
      name: 'LinkedIn',
      displayName: 'linkedin.com/in/art-lisboa',
      url: 'https://www.linkedin.com/in/art-lisboa',
      icon: Linkedin,
      ariaLabel: 'Connect with Art Lisboa on LinkedIn',
    },
    {
      name: 'Email',
      displayName: 'lisboamillen30@gmail.com',
      url: 'mailto:lisboamillen30@gmail.com',
      icon: Mail,
      ariaLabel: 'Email Art Lisboa',
    },
  ]

  const portfolioUrl = 'https://hello-friend-00.web.app/'

  return (
    <footer className="border-t border-border bg-background" role="contentinfo">
      <div className="mx-auto w-[100%] px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid gap-8 md:grid-cols-3 md:gap-12 lg:gap-16">
          {/* Left Section - About */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">
              Art Lisboa
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Full-stack developer building software to simplify and solve everyday challenges through modern web applications.
            </p>
            <div className="pt-2">
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span className="group-hover:underline">View Portfolio</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Middle Section - Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer Navigation">
              {/* <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
              >
                Portfolio
              </a> */}
              <Link
                to="/#about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
              >
                About
              </Link>
              {/* <Link
                href="/#contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
              >
                Contact
              </Link> */}
            </nav>
          </div>

          {/* Right Section - Social Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              Connect
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Social Media Links">
              {socialLinks.map((link) => {
                const Icon = link.icon
                const isEmail = link.name === 'Email'
                return (
                  <a
                    key={link.name}
                    href={link.url}
                    aria-label={link.ariaLabel}
                    target={isEmail ? undefined : '_blank'}
                    rel={isEmail ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="group-hover:underline">{link.displayName}</span>
                    {!isEmail && (
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" aria-hidden="true" />
                    )}
                  </a>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-border" aria-hidden="true" />

        {/* Bottom Section - Copyright & Version */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="sr-only">Copyright notice:</span>
              © {currentYear} Art Lisboa
              <span className="sr-only">All rights reserved.</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Built with React.js and ShadCN UI.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Version</span>
              <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-foreground">
                v{version}
              </span>
            </div>
          </div>
        </div>

        {/* SEO - Structured Data for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Art Lisboa',
              url: 'https://www.linkedin.com/in/art-lisboa',
              sameAs: [
                'https://github.com/hell0-fri3nd',
                'https://hello-friend-00.web.app/'
              ],
              email: 'lisboamillen30@gmail.com',
              jobTitle: 'Full-Stack Developer',
              knowsAbout: [
                'Full-Stack Development',
                'Software Engineer',
                'React',
                'TypeScript',
                'Next.js',
                'Python',
                'Flask',
                'FastAPI',
                'MySQL',
                'Docker'
              ],
            }),
          }}
        />
      </div>
    </footer>
  )
}


export default Footer

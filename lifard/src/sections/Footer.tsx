import { nav, site } from '@/content/site'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer data-ground="nocturne" className="border-t border-[color:var(--color-rule-light)]">
      <div className="u-shell u-gutter py-16 sm:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="wordmark text-[1.6rem] text-[color:var(--color-vellum-strong)]">
              {site.name}
            </p>
            <p
              className="annotation-sm mt-3 opacity-65"
              lang="ar"
              dir="rtl"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {site.nameArabic}
            </p>
            <p className="u-measure mt-7 text-[0.92rem] leading-[1.75] opacity-65">
              {site.discipline}. Based in {site.contact.base}, working across {site.contact.travels}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3">
            <nav aria-label="Footer">
              <p className="annotation-sm mb-5 text-[color:var(--color-brass-text)]">Index</p>
              <ul className="space-y-3">
                {nav.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-[0.92rem] opacity-65 transition-opacity hover:opacity-100"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="annotation-sm mb-5 text-[color:var(--color-brass-text)]">Studio</p>
              <ul className="space-y-3">
                <li>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="text-[0.92rem] opacity-65 transition-opacity hover:opacity-100"
                  >
                    {site.contact.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                    className="text-[0.92rem] opacity-65 transition-opacity hover:opacity-100"
                  >
                    {site.contact.phone}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="annotation-sm mb-5 text-[color:var(--color-brass-text)]">Elsewhere</p>
              <ul className="space-y-3">
                {site.social.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      rel="noreferrer noopener"
                      target="_blank"
                      className="text-[0.92rem] opacity-65 transition-opacity hover:opacity-100"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[color:var(--color-rule-light)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="annotation-sm opacity-65">
            © {year} {site.name}. All rights reserved.
          </p>
          <a href="#top" className="annotation-sm opacity-65 transition-opacity hover:opacity-100">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  )
}

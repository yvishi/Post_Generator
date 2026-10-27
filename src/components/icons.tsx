import type { ContentType } from '@/lib/types';

const paths: Record<ContentType, React.ReactNode> = {
  blog: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 12h7M9 16h7" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  x_thread: (
    <>
      <path d="M4 5h11v7H8l-4 3z" />
      <path d="M15 9h5v8l-3-2h-6v-3" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".5" />
    </>
  ),
  meta_ads: (
    <>
      <path d="M3 10v4h3l6 4V6L6 10z" />
      <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
    </>
  ),
  google_ads: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
};

export function ChannelIcon({ type, className = 'size-4' }: { type: ContentType; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[type]}
    </svg>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

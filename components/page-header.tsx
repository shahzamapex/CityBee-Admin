/**
 * Shared admin page header — title + description on the left, actions on
 * the right. Same rhythm as the 21st.dev-style sidebar/header: clean
 * hierarchy, no extra chrome.
 */
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 font-body text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

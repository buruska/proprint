type PageLoadingProps = {
  compact?: boolean;
  label?: string;
  hint?: string;
};

export function PageLoading({
  compact = false,
  label = "Adatok betöltése folyamatban",
  hint = "Kérlek várj egy pillanatot, előkészítjük a tartalmat.",
}: PageLoadingProps) {
  const className = compact
    ? "page-loader page-loader--compact"
    : "page-loader";

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="page-loader__graphic" aria-hidden="true">
        <span className="page-loader__ring" />
        <span className="page-loader__center" />
      </div>

      <div className="page-loader__copy">
        <h2>{label}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

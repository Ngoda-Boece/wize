export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-1/2 animate-pulse rounded-lg bg-sunken" />
      <div className="h-48 animate-pulse rounded-[14px] bg-sunken" />
      <div className="h-32 animate-pulse rounded-[14px] bg-sunken" />
    </div>
  );
}

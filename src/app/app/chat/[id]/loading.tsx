export default function ChatLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Chargement de la session">
      <div className="h-5 w-1/2 animate-pulse rounded bg-sunken" />
      <div className="h-16 animate-pulse rounded-xl bg-sunken" />
      <div className="ml-auto h-10 w-2/3 animate-pulse rounded-2xl bg-sunken" />
      <div className="h-24 animate-pulse rounded-xl bg-sunken" />
    </div>
  );
}

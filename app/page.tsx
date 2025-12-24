export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 font-sans">
      <main className="flex w-full max-w-4xl flex-col gap-8">
        <h1 className="text-4xl font-bold text-text-main">Punchy Pastels Design System</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Primary Color */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-6">
            <div className="h-20 w-full rounded bg-primary" />
            <p className="font-semibold text-text-main">Primary</p>
            <p className="text-sm text-text-muted">Electric Lavender</p>
          </div>

          {/* Secondary Color */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-6">
            <div className="h-20 w-full rounded bg-secondary" />
            <p className="font-semibold text-text-main">Secondary</p>
            <p className="text-sm text-text-muted">Sunshine Pop</p>
          </div>

          {/* Accent Color */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-6">
            <div className="h-20 w-full rounded bg-accent" />
            <p className="font-semibold text-text-main">Accent</p>
            <p className="text-sm text-text-muted">Minty Fresh</p>
          </div>

          {/* Destructive Color */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-6">
            <div className="h-20 w-full rounded bg-destructive" />
            <p className="font-semibold text-text-main">Destructive</p>
            <p className="text-sm text-text-muted">Rose</p>
          </div>

          {/* Background Color */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-6">
            <div className="h-20 w-full rounded border border-gray-300 bg-background" />
            <p className="font-semibold text-text-main">Background</p>
            <p className="text-sm text-text-muted">Snow White</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-text-main">Typography Test</h2>
          <p className="text-lg text-text-main">
            This text uses the Nunito font family. The quick brown fox jumps over the lazy dog.
          </p>
          <p className="text-base text-text-muted">This is muted text for secondary information.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <button className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Primary Button
          </button>
          <button className="rounded-lg bg-secondary px-6 py-3 font-semibold text-text-main transition-opacity hover:opacity-90">
            Secondary Button
          </button>
          <button className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90">
            Accent Button
          </button>
          <button className="rounded-lg bg-destructive px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90">
            Destructive Button
          </button>
        </div>
      </main>
    </div>
  )
}

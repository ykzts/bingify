import { Skeleton } from "@/components/ui/skeleton";

export function FaqFallback() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="flex justify-center">
            <Skeleton className="h-10 w-64" />
          </div>
        </div>

        <div className="space-y-6">
          {[0, 1, 2].map((index) => (
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
              key={index}
            >
              <Skeleton className="mb-3 h-6 w-48" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

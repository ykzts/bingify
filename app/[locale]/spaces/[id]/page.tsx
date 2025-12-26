import { setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-4 font-bold text-3xl">ビンゴカード</h1>
      <p>Space ID: {id}</p>
    </div>
  );
}

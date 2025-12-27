import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">管理ダッシュボード</h1>
        <p className="mt-2 text-gray-600">
          サイト管理者用のコントロールパネル
        </p>
      </div>

      <nav className="mb-8 border-gray-200 border-b">
        <ul className="flex gap-6">
          <li>
            <Link
              href={`/${locale}/admin`}
              className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            >
              概要
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/admin/spaces`}
              className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            >
              スペース管理
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/admin/users`}
              className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            >
              ユーザー管理
            </Link>
          </li>
        </ul>
      </nav>

      {children}
    </div>
  );
}

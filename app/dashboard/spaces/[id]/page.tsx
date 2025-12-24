export default async function AdminSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">管理画面</h1>
      <p>Space ID: {id}</p>
    </div>
  )
}

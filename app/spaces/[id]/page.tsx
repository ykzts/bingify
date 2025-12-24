export default async function UserSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">ビンゴカード</h1>
      <p>Space ID: {id}</p>
    </div>
  )
}

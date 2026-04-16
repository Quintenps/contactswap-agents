type FormPageProps = {
  params: Promise<{ token: string }>;
};

export default async function FormPage({ params }: FormPageProps) {
  const { token } = await params;

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Update Your Contact Info</h1>
      <p className="mt-2 text-gray-600">Token: {token}</p>
    </main>
  );
}

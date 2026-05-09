import { redirect } from 'next/navigation';

type FormsTokenPageProps = {
  params: Promise<{ token: string }>;
};

export default async function FormsTokenPage({ params }: FormsTokenPageProps) {
  const { token } = await params;
  redirect(`/form/${token}`);
}

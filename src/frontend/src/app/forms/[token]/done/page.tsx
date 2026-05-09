import { redirect } from 'next/navigation';

type FormsTokenDonePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      query.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export default async function FormsTokenDonePage({ params, searchParams }: FormsTokenDonePageProps) {
  const { token } = await params;
  const query = toQueryString(await searchParams);
  redirect(`/form/${token}/done${query}`);
}

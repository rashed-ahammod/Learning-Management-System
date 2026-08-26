import AuthForm, { AuthLink } from '@/components/AuthForm';
import { login } from '@/lib/auth-actions';

export const metadata = { title: 'Sign in — LMS' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthForm
      title="Sign in"
      subtitle="Pick up where you left off."
      action={login}
      submitLabel="Sign in"
      next={next}
      fields={[
        { name: 'identifier', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
      ]}
      footer={<>New here? <AuthLink href="/signup">Create an account</AuthLink></>}
    />
  );
}

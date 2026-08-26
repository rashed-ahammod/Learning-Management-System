import AuthForm, { AuthLink } from '@/components/AuthForm';
import { signup } from '@/lib/auth-actions';

export const metadata = { title: 'Create an account — LMS' };

export default function SignupPage() {
  return (
    <AuthForm
      title="Create an account"
      subtitle="New accounts start as students. An admin can change that later."
      action={signup}
      submitLabel="Create account"
      fields={[
        { name: 'username', label: 'Username', type: 'text', autoComplete: 'username' },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          autoComplete: 'new-password',
          hint: 'At least 8 characters.',
        },
      ]}
      footer={<>Already have an account? <AuthLink href="/login">Sign in</AuthLink></>}
    />
  );
}

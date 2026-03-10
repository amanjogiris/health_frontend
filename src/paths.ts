export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in', signUp: '/auth/sign-up', resetPassword: '/auth/reset-password' },
  dashboard: {
    overview: '/dashboard',
    account: '/dashboard/account',
    customers: '/dashboard/customers',
    integrations: '/dashboard/integrations',
    settings: '/dashboard/settings',
    doctors: '/dashboard/doctors',
    clinics: '/dashboard/clinics',
    appointments: '/dashboard/appointments',
    admins: '/dashboard/admins',
    patients: '/dashboard/patients',
  },
  errors: { notFound: '/errors/not-found' },
} as const;

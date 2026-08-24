export const config = {
  matcher: '/(.*)',
};

export default async function middleware(request) {
  const auth = request.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = atob(encoded).split(':');
      const expectedUser = process.env.BASIC_AUTH_USER;
      const expectedPass = process.env.BASIC_AUTH_PASSWORD;
      if (expectedUser && expectedPass && user === expectedUser && pass === expectedPass) {
        return;
      }
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

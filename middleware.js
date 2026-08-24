export const config = {
  matcher: '/(.*)',
};

const COOKIE_NAME = 'site_auth';
const SITE_TITLE = '더스크그룹 경영보고';

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loginPage(showError) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${SITE_TITLE}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f2f2f0;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif}
.card{width:340px;background:#fff;border-radius:20px;box-shadow:0 8px 24px rgba(30,40,65,.08);padding:36px 32px;text-align:center}
.badge{width:48px;height:48px;border-radius:12px;background:#1c1c1e;color:#fff;font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
h1{font-size:17px;font-weight:700;color:#1c1c1e;margin-bottom:10px}
p.desc{font-size:12.5px;color:#8a8a86;line-height:1.6;margin-bottom:20px}
p.err{font-size:12.5px;color:#be1c1c;margin:-6px 0 14px}
input{width:100%;padding:13px 14px;border:1px solid #e2e2de;border-radius:10px;background:#f7f7f5;font-size:14px;margin-bottom:12px;font-family:inherit}
input:focus{outline:none;border-color:#1c1c1e}
button{width:100%;padding:13px;border:none;border-radius:10px;background:#1c1c1e;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
button:hover{background:#000}
</style>
</head>
<body>
<div class="card">
<div class="badge">D</div>
<h1>${SITE_TITLE}</h1>
<p class="desc">사내 전용 대시보드입니다.<br>접속 비밀번호를 입력하세요.</p>
${showError ? '<p class="err">비밀번호가 올바르지 않습니다.</p>' : ''}
<form method="POST">
<input type="password" name="password" placeholder="비밀번호" autofocus required>
<button type="submit">입장</button>
</form>
</div>
</body>
</html>`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const expectedPassword = process.env.SITE_PASSWORD;
  const secret = process.env.SITE_AUTH_SECRET || expectedPassword || '';
  const expectedToken = expectedPassword ? await sha256(expectedPassword + secret) : null;

  if (request.method === 'POST') {
    const form = await request.formData();
    const password = form.get('password');

    if (expectedPassword && password === expectedPassword) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname,
          'Set-Cookie': `${COOKIE_NAME}=${expectedToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }

    return new Response(loginPage(true), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));

  if (match && expectedToken && match[1] === expectedToken) {
    return;
  }

  return new Response(loginPage(false), {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

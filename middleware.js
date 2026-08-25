export const config = {
  matcher: '/(.*)',
};

const COOKIE_NAME = 'site_auth';
const ROOT_BYPASS_COOKIE = 'root_ok';
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
body{min-height:100vh;background:#eef1f8;color:#1e2841;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif}
.hdr{background:#16213e;color:#fff;padding:20px 36px}
.hdr h1{font-size:20px;font-weight:700;letter-spacing:.5px}
.hdr p{font-size:11px;color:#7a90b8;margin-top:4px}
.wrap{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 78px);padding:40px 20px}
.card{width:360px;background:#fff;border:1px solid #d8e0ee;border-radius:14px;box-shadow:0 4px 16px rgba(30,40,65,.08);padding:40px 32px;text-align:center}
.card h2{font-size:17px;font-weight:600;margin-bottom:10px;color:#1e2841}
.desc{font-size:12.5px;color:#8090b0;line-height:1.6;margin-bottom:22px}
.err{font-size:12.5px;color:#be1c1c;margin:-8px 0 16px}
input{width:100%;padding:13px 14px;border:1px solid #d8e0ee;border-radius:8px;background:#f9fafd;font-size:14px;margin-bottom:14px;font-family:inherit;color:#1e2841}
input:focus{outline:none;border-color:#16213e}
button{width:100%;padding:13px;border:none;border-radius:8px;background:#16213e;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
button:hover{background:#1e2841}
</style>
</head>
<body>
<div class="hdr">
<h1>DUSK.</h1>
<p>경영지원팀 · 경영보고 포털</p>
</div>
<div class="wrap">
<div class="card">
<h2>${SITE_TITLE}</h2>
<p class="desc">본 페이지는 내부 관계자 전용입니다.<br>안전한 열람을 위해 비밀번호를 입력해주세요.</p>
${showError ? '<p class="err">비밀번호가 올바르지 않습니다.</p>' : ''}
<form method="POST">
<input type="password" name="password" placeholder="비밀번호" autofocus required>
<button type="submit">확인</button>
</form>
</div>
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
      const headers = new Headers({ Location: url.pathname });
      headers.append('Set-Cookie', `${COOKIE_NAME}=${expectedToken}; Path=/; HttpOnly; Secure; SameSite=Lax`);
      headers.append('Set-Cookie', `${ROOT_BYPASS_COOKIE}=${expectedToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=10`);
      return new Response(null, { status: 303, headers });
    }

    return new Response(loginPage(true), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const siteAuthMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const rootOkMatch = cookieHeader.match(new RegExp(`${ROOT_BYPASS_COOKIE}=([^;]+)`));
  const siteAuthValid = siteAuthMatch && expectedToken && siteAuthMatch[1] === expectedToken;
  const rootOkValid = rootOkMatch && expectedToken && rootOkMatch[1] === expectedToken;

  if (url.pathname === '/') {
    if (rootOkValid) {
      return;
    }
  } else if (siteAuthValid) {
    return;
  }

  return new Response(loginPage(false), {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

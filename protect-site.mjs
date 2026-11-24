import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Script } from 'node:vm';

const [source, output] = process.argv.slice(2);
const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (!password) throw new Error('A password is required.');
const html = readFileSync(source, 'utf8');
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  new Script(match[1]);
}

const iterations = 600_000;
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
const payload = JSON.stringify({
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  data: encrypted.toString('base64'),
});

const script = `
  const payload = ${payload};
  const form = document.querySelector('form');
  const input = document.querySelector('input');
  const button = document.querySelector('button');
  const status = document.querySelector('[role="status"]');
  const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = '확인 중…';
    let html;
    try {
      const password = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(input.value), 'PBKDF2', false, ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: decode(payload.salt), iterations: ${iterations}, hash: 'SHA-256' },
        password, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );
      const content = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: decode(payload.iv) }, key, decode(payload.data)
      );
      html = new TextDecoder().decode(content);
    } catch {
      status.textContent = '비밀번호를 확인해 주세요.';
      button.disabled = false;
      input.select();
      return;
    }
    document.open();
    document.write(html);
    document.close();
  });
`;
new Script(script);

writeFileSync(output, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>여행 일정</title>
<style>
  body { margin: 0; padding: 24px; min-height: 100vh; box-sizing: border-box; display: grid; place-items: center; background: #f5f2ed; color: #222; font: 16px system-ui, sans-serif; }
  main { width: min(100%, 24rem); }
  form { display: grid; gap: 12px; }
  input, button { font: inherit; padding: 12px; border-radius: 8px; border: 1px solid #666; }
  button { background: #243e48; color: white; cursor: pointer; }
  [role="status"] { min-height: 1.5em; margin: 0; }
</style>
</head>
<body>
<main>
<h1>여행 일정</h1>
<form>
<label for="password">비밀번호</label>
<input id="password" type="password" autocomplete="current-password" required>
<button type="submit">일정 보기</button>
<p role="status"></p>
</form>
</main>
<script>${script}</script>
</body>
</html>
`);

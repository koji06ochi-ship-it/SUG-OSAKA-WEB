/* S.u.G WALK R7: optional Supabase email login for AI guide.
 * Safe OFF by default. Supply only the Supabase project HTTPS URL and
 * publishable key at runtime; never embed a service-role key here.
 * Sessions intentionally remain in memory until secure persistence is approved.
 */
(function () {
  'use strict';
  let session = null;
  const validConfig = () => {
    const c = window.SUGR7AuthConfig;
    if (!c || typeof c.url !== 'string' || typeof c.publishableKey !== 'string') return null;
    try {
      const url = new URL(c.url);
      if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) ||
          url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
          !c.publishableKey.startsWith('sb_publishable_')) return null;
      return {origin: url.origin, key: c.publishableKey};
    } catch { return null; }
  };
  const t = (ja, en, zh, lang) => ({ja, en, zh})[lang] || ja;
  async function loadConfig() {
    const provided=validConfig();
    if(provided)return provided;
    const endpoint=window.SUGR7AuthBootstrapURL;
    if(typeof endpoint!=='string')return null;
    try{
      const u=new URL(endpoint);
      if(u.protocol!=='https:' || !u.hostname.endsWith('.vercel.app') || u.pathname!=='/api/walk-ai' || u.search!=='?clientConfig=1' || u.hash)return null;
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
      try{
        const response=await fetch(u.href,{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
        if(!response.ok)return null;
        const data=await response.json();
        window.SUGR7AuthConfig={url:data.supabaseUrl,publishableKey:data.publishableKey};
        return validConfig();
      }finally{clearTimeout(timer)}
    }catch{return null}
  }
  async function mount(root, lang) {
    if (!root) return;
    const section = document.createElement('section');
    section.style.cssText = 'padding:12px;margin-top:12px;border:1px solid #70415f;border-radius:12px;color:#fff';
    const heading = document.createElement('strong');
    heading.textContent = t('AIログイン', 'AI sign in', 'AI登录', lang);
    section.append(heading);
    const message = document.createElement('p');
    message.setAttribute('aria-live', 'polite');
    message.style.cssText = 'font-size:12px;white-space:pre-wrap';
    section.append(message);
    const cfg = await loadConfig();
    if (!cfg) {
      message.textContent = t('ログイン設定は未接続です。観光案内と定型文通訳は引き続き利用できます。',
        'Sign-in is not configured. Offline guide and fixed translations remain available.',
        '尚未配置登录。离线导览和固定短句翻译仍可使用。', lang);
      root.append(section);
      return;
    }
    const email = document.createElement('input');
    email.type = 'email'; email.autocomplete = 'username'; email.placeholder = 'Email';
    const password = document.createElement('input');
    password.type = 'password'; password.autocomplete = 'current-password';
    password.placeholder = t('パスワード', 'Password', '密码', lang);
    for (const el of [email, password]) {
      el.style.cssText = 'display:block;box-sizing:border-box;width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ff007f;background:#151326;color:white';
      section.append(el);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ff007f;background:#28142c;color:white';
    section.append(button);
    function render() {
      const loggedIn = !!session;
      email.hidden = password.hidden = loggedIn;
      button.textContent = loggedIn ? t('ログアウト','Sign out','退出登录',lang)
        : t('ログイン','Sign in','登录',lang);
      message.textContent = loggedIn ? t('ログイン済み。AI有料通信は引き続き停止中です。',
        'Signed in. Paid AI calls remain disabled.', '已登录。付费AI调用仍处于关闭状态。', lang)
        : t('既存アカウントでログインできます。新規登録や課金は行いません。',
          'Sign in with an existing account. No registration or charges.',
          '请使用已有账户登录，不会注册或产生费用。', lang);
    }
    render();
    button.addEventListener('click', async () => {
      if (session) { session = null; render(); return; }
      if (!email.validity.valid || !email.value || !password.value) {
        message.textContent = t('メールとパスワードを確認してください。','Check email and password.','请检查邮箱和密码。',lang);
        return;
      }
      button.disabled = true;
      message.textContent = t('ログインを確認中…','Signing in…','正在登录…',lang);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(cfg.origin + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {'apikey':cfg.key,'Content-Type':'application/json'},
          body:JSON.stringify({email:email.value.trim(),password:password.value}),
          cache:'no-store', signal:controller.signal
        });
        if (!response.ok) throw new Error('AUTH_DENIED');
        const data = await response.json();
        if (typeof data.access_token !== 'string' || !data.user || typeof data.user.id !== 'string') throw new Error('INVALID_AUTH_RESPONSE');
        session = {accessToken:data.access_token, userId:data.user.id};
        password.value = '';
        render();
      } catch {
        password.value = '';
        message.textContent = t('ログインできませんでした。入力内容・認証設定を確認してください。',
          'Sign-in failed. Check credentials and configuration.',
          '登录失败，请检查账号或配置。', lang);
      } finally { clearTimeout(timer); button.disabled = false; }
    });
    root.append(section);
  }
  window.SUGR7Auth = {mount, getAccessToken:() => session && session.accessToken, signOut:() => {session=null;}};
})();
(() => {
  const endpoint = "https://grfhbtszcrwdbrphaiaw.supabase.co/rest/v1/rpc/monogatari_guestbook_admin_";
  const publishableKey = "sb_publishable_1FoCHLurAbMImr14Vnruaw_xMPoUTa6";
  const login = document.getElementById("login");
  const password = document.getElementById("password");
  const moderation = document.getElementById("moderation");
  const messages = document.getElementById("messages");
  const status = document.getElementById("status");
  const pending = document.getElementById("pending");
  const published = document.getElementById("published");
  const previous = document.getElementById("previous");
  const next = document.getElementById("next");
  const paging = next.parentElement;
  const date = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai"
  });
  const pageSize = 30;
  let token;
  let showingPublished = false;
  let offset = 0;
  let hasMore = false;
  let busy = false;

  async function rpc(operation, params) {
    const response = await fetch(endpoint + operation, {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(String(response.status));
    if (response.status !== 204) return response.json();
  }

  function showLogin() {
    token = undefined;
    messages.replaceChildren();
    moderation.hidden = true;
    login.hidden = false;
    password.focus();
  }

  function updateControls() {
    document.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
    previous.disabled = busy || offset === 0;
    next.disabled = busy || !hasMore;
    password.readOnly = busy;
  }

  async function run(task) {
    if (busy) return;
    busy = true;
    updateControls();
    status.textContent = "";
    try {
      await task();
    } catch (error) {
      if (error.message === "401") {
        showLogin();
        status.textContent = "登录已过期，请重新登录。";
      } else {
        status.textContent = "暂时无法完成，请重试。";
      }
    } finally {
      busy = false;
      updateControls();
    }
  }

  async function load(show = showingPublished, start = offset) {
    const rows = await rpc("list", { p_token: token, p_published: show, p_offset: start });
    if (!rows.length && start > 0) return load(show, Math.max(0, start - pageSize));

    showingPublished = show;
    offset = start;
    hasMore = rows.length > pageSize;
    pending.setAttribute("aria-pressed", String(!show));
    published.setAttribute("aria-pressed", String(show));
    paging.hidden = !(offset || hasMore);
    const elements = rows.slice(0, pageSize).map((row) => {
      const entry = document.createElement("li");
      const author = document.createElement("strong");
      const time = document.createElement("time");
      const message = document.createElement("p");
      const review = document.createElement("button");
      author.textContent = row.nickname;
      time.dateTime = row.created_at;
      time.textContent = date.format(new Date(row.created_at));
      message.textContent = row.message;
      review.type = "button";
      review.textContent = show ? "撤下" : "通过";
      review.dataset.review = String(!show);
      review.addEventListener("click", () => run(async () => {
        await rpc("review", { p_token: token, p_id: row.id, p_publish: !show });
        await load();
        status.textContent = show ? "留言已撤下。" : "留言已通过，现已公开。";
      }));
      entry.append(author, time, message, review);
      return entry;
    });
    messages.replaceChildren(...elements);
    status.textContent = elements.length ? "" : (show ? "暂无已公开的留言。" : "暂无待审核的留言。");
  }

  login.addEventListener("submit", (event) => {
    event.preventDefault();
    const supplied = password.value;
    password.value = "";
    void run(async () => {
      const result = await rpc("login", { p_password: supplied });
      if (result.status !== "ok") {
        status.textContent = {
          invalid: "密码不正确。",
          locked: "尝试次数过多，请稍后再试。",
          unavailable: "审核登录暂未启用。"
        }[result.status] ?? "无法登录，请重试。";
        password.focus();
        return;
      }
      token = result.token;
      login.hidden = true;
      moderation.hidden = false;
      await load(false, 0);
    });
  });

  pending.addEventListener("click", () => run(() => load(false, 0)));
  published.addEventListener("click", () => run(() => load(true, 0)));
  document.getElementById("refresh").addEventListener("click", () => run(() => load()));
  previous.addEventListener("click", () => run(() => load(showingPublished, offset - pageSize)));
  next.addEventListener("click", () => run(() => load(showingPublished, offset + pageSize)));
  document.getElementById("logout").addEventListener("click", () => run(async () => {
    const previousToken = token;
    showLogin();
    await rpc("logout", { p_token: previousToken });
    status.textContent = "已退出。";
  }));
})();

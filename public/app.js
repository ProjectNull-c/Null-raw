const API_KEY = "SQCDjYLDCvxxATBUt4226pzzFiaWIJkLl2ouUrLwKSOVFHFBlCBAPSfh97Oq";

const contentInput = document.getElementById("contentInput");
const filenameInput = document.getElementById("filenameInput");
const lineCount = document.getElementById("lineCount");
const charCount = document.getElementById("charCount");
const toPage2 = document.getElementById("toPage2");
const backToPage1 = document.getElementById("backToPage1");

const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const dot1 = document.getElementById("dot1");
const dot2 = document.getElementById("dot2");

const resultUrl = document.getElementById("resultUrl");
const resultLoadstring = document.getElementById("resultLoadstring");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const copyLoadstringBtn = document.getElementById("copyLoadstringBtn");
const rawLink = document.getElementById("rawLink");
const viewLink = document.getElementById("viewLink");
const toast = document.getElementById("toastNotification");

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

contentInput.addEventListener("input", () => {
  const val = contentInput.value;
  const lines = val ? val.split("\n").length : 1;
  const chars = val.length;
  
  lineCount.textContent = `${lines} lines`;
  charCount.textContent = `${chars} chars`;
  
  toPage2.disabled = !val.trim();
});

contentInput.addEventListener("keydown", e => {
  if (e.key === "Tab") {
    e.preventDefault();
    const s = contentInput.selectionStart;
    const end = contentInput.selectionEnd;
    contentInput.value = contentInput.value.substring(0, s) + "  " + contentInput.value.substring(end);
    contentInput.selectionStart = contentInput.selectionEnd = s + 2;
  }
});

toPage2.addEventListener("click", async () => {
  const code = contentInput.value.trim();
  if (!code) return;

  toPage2.disabled = true;
  toPage2.textContent = "発行中...";

  try {
    const res = await fetch("/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({
        filename: filenameInput.value.trim() || "script.lua",
        content: code
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "発行に失敗しました");

    resultUrl.value = data.raw_url;
    resultLoadstring.value = `loadstring(game:HttpGet("${data.raw_url}"))()`;
    
    rawLink.href = data.raw_url;
    viewLink.href = data.view_url;

    page1.classList.remove("active");
    page2.classList.add("active");
    dot1.classList.remove("active");
    dot2.classList.add("active");

    showToast("RAW URLとloadstringを発行しました！");
  } catch (err) {
    showToast(err.message);
  } finally {
    toPage2.disabled = false;
    toPage2.textContent = "RAW URLを発行する";
  }
});

backToPage1.addEventListener("click", () => {
  page2.classList.remove("active");
  page1.classList.add("active");
  dot2.classList.remove("active");
  dot1.classList.add("active");
});

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultUrl.value);
    showToast("RAW URLをコピーしました");
  } catch {
    showToast("コピーに失敗しました");
  }
});

copyLoadstringBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultLoadstring.value);
    showToast("loadstringをコピーしました");
  } catch {
    showToast("コピーに失敗しました");
  }
});
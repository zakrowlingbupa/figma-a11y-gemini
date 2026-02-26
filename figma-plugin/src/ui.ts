const proxyInput = document.getElementById('proxy') as HTMLInputElement;
const scanBtn = document.getElementById('scan') as HTMLButtonElement;
const applyBtn = document.getElementById('apply') as HTMLButtonElement;
const clearBtn = document.getElementById('clear') as HTMLButtonElement;

const issuesDiv = document.getElementById('issues')!;
const annDiv = document.getElementById('annotations')!;

let pendingAnnotations: any[] = [];

function renderIssues(items: any[]) {
  issuesDiv.innerHTML = items.map(it => {
    const cls = it.severity === 'error' ? 'err' : it.severity === 'warning' ? 'warn' : 'ok';
    return `<div class="msg ${cls}"><strong>${it.guideline}</strong><br/>${it.summary}</div>`;
  }).join('') || "<div class='msg ok'>No deterministic issues found.</div>";
}

function renderAnnotations(items: any[]) {
  annDiv.innerHTML = items.map(it => {
    const cls = it.severity === 'error' ? 'err' : it.severity === 'warning' ? 'warn' : 'ok';
    return `<div class="msg ${cls}"><strong>${it.guideline}</strong><br/>${it.message}<br/><em>Suggestion:</em> ${it.suggestion || '—'}</div>`;
  }).join('') || "<div class='msg'>No model annotations yet.</div>";
}

scanBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'scan', proxyUrl: proxyInput.value.trim() } }, '*');
};

applyBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'annotate', payload: { annotations: pendingAnnotations } } }, '*');
};

clearBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'clear-annotations' } }, '*');
};

onmessage = (e: MessageEvent) => {
  const msg = (e.data as any).pluginMessage;
  if (!msg) return;
  if (msg.type === 'scan-result') {
    renderIssues(msg.detIssues || []);
    const model = msg.model || {};
    try {
      pendingAnnotations = (model.annotations || []).slice(0, 50);
      renderAnnotations(pendingAnnotations);
    } catch {
      pendingAnnotations = [];
      annDiv.innerHTML = "<div class='msg err'>Could not parse model output.</div>";
    }
  }
  if (msg.type === 'annotate-complete') {
    annDiv.insertAdjacentHTML('afterbegin', `<div class='msg ok'>Added ${msg.count} annotations to canvas.</div>`);
  }
  if (msg.type === 'cleared') {
    annDiv.innerHTML = "<div class='msg'>Cleared annotations.</div>";
    issuesDiv.innerHTML = '';
    pendingAnnotations = [];
  }
  if (msg.type === 'error') {
    annDiv.insertAdjacentHTML('afterbegin', `<div class='msg err'>${msg.message}</div>`);
  }
};

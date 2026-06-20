(function () {
  const vscode = acquireVsCodeApi();

  // Button manifest grouped for the toolbar. Mirrors core/operations.ts.
  const GROUPS = [
    {
      label: 'JSON',
      items: [
        ['jsonXmlToolkit.json.prettify', 'Prettify'],
        ['jsonXmlToolkit.json.minify', 'Minify'],
        ['jsonXmlToolkit.json.sortKeys', 'Sort keys'],
        ['jsonXmlToolkit.json.repair', 'Repair'],
        ['jsonXmlToolkit.json.escape', 'Escape'],
        ['jsonXmlToolkit.json.unescape', 'Unescape'],
        ['jsonXmlToolkit.json.stringify', 'Stringify'],
        ['jsonXmlToolkit.json.parse', 'Parse'],
        ['jsonXmlToolkit.json.flatten', 'Flatten'],
        ['jsonXmlToolkit.json.unflatten', 'Unflatten'],
        ['jsonXmlToolkit.json.removeEmpty', 'Remove empty'],
        ['jsonXmlToolkit.json.unicodeEscape', '\\u escape'],
        ['jsonXmlToolkit.json.unicodeUnescape', '\\u decode'],
        ['jsonXmlToolkit.json.query', 'JSONPath…', true],
        ['jsonXmlToolkit.json.stats', 'Analyze']
      ]
    },
    {
      label: 'XML',
      items: [
        ['jsonXmlToolkit.xml.prettify', 'Prettify'],
        ['jsonXmlToolkit.xml.minify', 'Minify'],
        ['jsonXmlToolkit.xml.escape', 'Escape'],
        ['jsonXmlToolkit.xml.unescape', 'Unescape'],
        ['jsonXmlToolkit.xml.query', 'XPath…', true],
        ['jsonXmlToolkit.xml.stats', 'Analyze']
      ]
    },
    {
      label: 'Convert',
      items: [
        ['jsonXmlToolkit.convert.jsonToYaml', 'JSON→YAML'],
        ['jsonXmlToolkit.convert.yamlToJson', 'YAML→JSON'],
        ['jsonXmlToolkit.convert.jsonToXml', 'JSON→XML'],
        ['jsonXmlToolkit.convert.xmlToJson', 'XML→JSON'],
        ['jsonXmlToolkit.convert.jsonToCsv', 'JSON→CSV'],
        ['jsonXmlToolkit.convert.csvToJson', 'CSV→JSON'],
        ['jsonXmlToolkit.convert.jsonToTypeScript', 'JSON→TS'],
        ['jsonXmlToolkit.convert.jsonToGo', 'JSON→Go'],
        ['jsonXmlToolkit.convert.jsonToProto', 'JSON→Proto'],
        ['jsonXmlToolkit.convert.jsonToPython', 'JSON→Python']
      ]
    }
  ];

  const SAMPLE = JSON.stringify(
    {
      store: {
        book: [
          { title: 'Sayings of the Century', author: 'Nigel Rees', price: 8.95 },
          { title: 'Moby Dick', author: 'Herman Melville', price: 12.99, tags: ['classic', 'sea'] }
        ],
        open: true,
        manager: null
      }
    },
    null,
    2
  );

  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const output = $('output');
  const meta = $('meta');
  const status = $('status');
  const badge = $('format-badge');
  const queryRow = $('query-row');
  const expression = $('expression');

  let pendingQueryCommand = 'jsonXmlToolkit.json.query';
  let lastLanguage = 'json';

  // Build toolbar.
  const toolbar = $('toolbar');
  for (const group of GROUPS) {
    const wrap = document.createElement('div');
    wrap.className = 'group';
    const label = document.createElement('span');
    label.className = 'group-label';
    label.textContent = group.label;
    wrap.appendChild(label);
    for (const [id, text, needsExpr] of group.items) {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.title = id;
      btn.addEventListener('click', () => {
        if (needsExpr) {
          pendingQueryCommand = id;
          queryRow.hidden = false;
          expression.placeholder = id.includes('.xml.')
            ? '//book[@id]/title   (XPath)'
            : '$.store.book[*].author   (JSONPath)';
          expression.focus();
          setStatus('Enter an expression, then Run query.');
        } else {
          run(id);
        }
      });
      wrap.appendChild(btn);
    }
    toolbar.appendChild(wrap);
  }

  function run(commandId, expr) {
    setStatus('Working…');
    vscode.postMessage({ type: 'run', commandId, input: input.value, expression: expr });
  }

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('error', !!isError);
  }

  // Pane actions.
  document.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.getAttribute('data-act');
      if (act === 'clear') {
        input.value = '';
        output.value = '';
        meta.textContent = '';
        detect();
      } else if (act === 'paste-sample') {
        input.value = SAMPLE;
        detect();
      } else if (act === 'copy') {
        copy(output.value);
      } else if (act === 'swap') {
        input.value = output.value;
        output.value = '';
        detect();
      } else if (act === 'to-editor') {
        vscode.postMessage({ type: 'replaceEditor', input: output.value });
      } else if (act === 'to-document') {
        vscode.postMessage({ type: 'openDocument', input: output.value, language: lastLanguage });
      }
    });
  });

  $('run-query').addEventListener('click', () => {
    if (!expression.value.trim()) {
      setStatus('Expression is empty.', true);
      return;
    }
    run(pendingQueryCommand, expression.value);
  });
  expression.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      $('run-query').click();
    }
  });

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => setStatus('Copied to clipboard.'),
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    output.removeAttribute('readonly');
    output.select();
    try {
      document.execCommand('copy');
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Copy failed — select and copy manually.', true);
    }
    output.setAttribute('readonly', 'true');
    window.getSelection().removeAllRanges();
  }

  // Auto-detect format (debounced).
  let detectTimer;
  function detect() {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(() => {
      vscode.postMessage({ type: 'detect', input: input.value });
    }, 200);
  }
  input.addEventListener('input', detect);

  // Inbound messages from the extension host.
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'seed') {
      input.value = msg.input || '';
      detect();
      setStatus('Loaded selection from editor.');
    } else if (msg.type === 'detected') {
      badge.textContent = msg.format === 'unknown' ? '—' : msg.format;
    } else if (msg.type === 'result') {
      output.value = msg.output;
      lastLanguage = msg.language || 'json';
      meta.textContent = msg.meta || '';
      setStatus('Done.');
    } else if (msg.type === 'error') {
      setStatus(msg.message, true);
    }
  });

  setStatus('Ready. Paste data or click Sample.');
})();

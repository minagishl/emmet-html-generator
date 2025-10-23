import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { expandAbbreviation } from './emmet';

const examples = [
  'ul>li.item$*3',
  'nav>ul>li*3>a{Link $}',
  'section>h2{Hello}+p{Lorem ipsum dolor sit amet}',
  'form>label[for=email]{Email}+input#email[type=email]',
];

export function App() {
  const [abbreviation, setAbbreviation] = useState(examples[0]);
  const [htmlOutput, setHtmlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const { html } = expandAbbreviation(abbreviation);
      setHtmlOutput(html);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to expand abbreviation';
      setError(message);
      setHtmlOutput('');
    }
  }, [abbreviation]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const previewDocument = useMemo(() => {
    if (!htmlOutput) {
      return '';
    }
    return buildPreviewDocument(htmlOutput);
  }, [htmlOutput]);

  const handleAbbreviationInput: JSX.GenericEventHandler<HTMLTextAreaElement> = (event) => {
    setAbbreviation(event.currentTarget.value);
  };

  const handleExampleClick = (value: string) => () => {
    setAbbreviation(value);
  };

  const handleClear = () => {
    setAbbreviation('');
  };

  const handleCopy = async () => {
    if (!htmlOutput) {
      return;
    }
    if (!navigator.clipboard) {
      setError('Clipboard API is not available in this browser');
      return;
    }

    try {
      await navigator.clipboard.writeText(htmlOutput);
      setCopied(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to copy to clipboard';
      setError(message);
    }
  };

  return (
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 lg:gap-12 lg:py-16">
        <header class="space-y-4">
          <h1 class="text-3xl font-semibold text-slate-900 md:text-4xl">Generate clean HTML from Emmet abbreviations</h1>
          <p class="max-w-3xl text-sm text-slate-600 md:text-base">
            Type or paste an Emmet abbreviation and get instant, formatted HTML. Use the quick examples to explore common
            patterns, copy the output, or preview the rendered markup right away.
          </p>
        </header>

        <main class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section class="flex flex-col gap-6 border border-slate-200 bg-white p-6">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-semibold text-slate-900">Emmet Abbreviation</h2>
              <button
                type="button"
                onClick={handleClear}
                class="border border-slate-300 bg-white px-4 py-1 text-xs font-medium uppercase tracking-wider text-slate-600 transition hover:border-blue-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Clear
              </button>
            </div>
            <textarea
              spellcheck={false}
              value={abbreviation}
              onInput={handleAbbreviationInput}
              placeholder="section>h2{Title}+p{Content}"
              class="h-64 w-full resize-none border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 md:text-base"
            />
            <div class="space-y-3">
              <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Examples</p>
              <div class="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={handleExampleClick(example)}
                    class="border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <p class="text-xs leading-relaxed text-slate-600">
              Supports element nesting, siblings, ID and class shortcuts, attributes, text nodes, grouping, and repeat
              multipliers with numbering via <code class="bg-slate-200 px-1 text-slate-800">{"$"}</code>.
            </p>
            {error && (
              <div class="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </section>

          <section class="flex flex-col gap-6">
            <div class="border border-slate-200 bg-white p-6">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-lg font-semibold text-slate-900">Generated HTML</h2>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!htmlOutput}
                  class={`flex items-center gap-2 border px-4 py-1 text-xs font-semibold uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    htmlOutput
                      ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
                </button>
              </div>
              <pre class="mt-4 h-72 overflow-auto border border-slate-200 bg-slate-900/5 p-4 text-sm leading-relaxed text-slate-800">
                {htmlOutput || 'Awaiting a valid Emmet abbreviation...'}
              </pre>
            </div>
            <div class="border border-slate-200 bg-white text-slate-900">
              <div class="border-b border-slate-200 px-6 py-4">
                <h2 class="text-lg font-semibold">Live Preview</h2>
                <p class="text-xs text-slate-500">Rendered output using an isolated iframe sandbox.</p>
              </div>
              <div class="h-72 overflow-hidden">
                {previewDocument ? (
                  <iframe
                    class="h-full w-full"
                    title="HTML preview"
                    srcDoc={previewDocument}
                    sandbox=""
                  />
                ) : (
                  <div class="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
                    Preview will appear once the abbreviation is valid.
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function buildPreviewDocument(markup: string): string {
  const styles = `
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    body {
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background-color: #f8fafc;
      font-size: 16px;
      line-height: 1.5;
    }
    h1, h2, h3, h4 {
      color: #0f172a;
      margin-top: 1.5em;
    }
    a {
      color: #0369a1;
    }
    ul, ol {
      padding-left: 1.5rem;
    }
    table {
      border-collapse: collapse;
    }
    table td, table th {
      border: 1px solid #cbd5f5;
      padding: 0.5rem;
    }
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${styles}</style>
  </head>
  <body>
${markup}
  </body>
</html>`;
}

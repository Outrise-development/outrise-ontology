import React, { useMemo } from 'react';
import { useConsole } from '../context';

function changedLines(before, after) {
  const a = before.split('\n'); const b = after.split('\n');
  if (a.length * b.length > 250000) return { before: a.map((line) => ({ line, changed: !b.includes(line) })), after: b.map((line) => ({ line, changed: !a.includes(line) })) };
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const sameA = new Set(); const sameB = new Set(); let i = 0; let j = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { sameA.add(i++); sameB.add(j++); } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { before: a.map((line, index) => ({ line, changed: !sameA.has(index) })), after: b.map((line, index) => ({ line, changed: !sameB.has(index) })) };
}

export default function DiffView({ before = '', after = '', beforeLabel, afterLabel }) {
  const { t } = useConsole();
  const lines = useMemo(() => changedLines(before, after), [before, after]);
  return <div className="diff-view">{['before', 'after'].map((side) => <section key={side}><h4>{side === 'before' ? beforeLabel || t('history.before') : afterLabel || t('history.after')}</h4><div className={`diff-code diff-${side}`}>{lines[side].map(({ line, changed }, index) => <div className={changed ? 'diff-changed' : ''} key={index}><span className="line-number">{index + 1}</span><code>{line || ' '}</code></div>)}</div></section>)}</div>;
}

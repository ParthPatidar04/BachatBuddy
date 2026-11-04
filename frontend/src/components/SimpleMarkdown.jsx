// Minimal, safe renderer for assistant replies: paragraphs, "- " bullets and **bold**.
// Builds React nodes only - never injects HTML.
const inline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );

export default function SimpleMarkdown({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)/.exec(line);
    if (bullet) {
      if (!list) {
        list = { type: 'ul', items: [] };
        blocks.push(list);
      }
      list.items.push(bullet[1]);
    } else {
      list = null;
      if (line) blocks.push({ type: 'p', text: line, key: i });
    }
  });

  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        )
      )}
    </div>
  );
}
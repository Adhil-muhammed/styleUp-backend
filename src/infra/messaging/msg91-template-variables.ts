export type Msg91TextComponent = { type: 'text'; value: string };

export function toMsg91Components(
  variables: Record<string, string>,
): Record<string, Msg91TextComponent> {
  const components: Record<string, Msg91TextComponent> = {};
  const entries = Object.entries(variables).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  let namedIndex = 1;
  for (const [key, value] of entries) {
    let bodyKey: string;
    if (key.startsWith('body_')) {
      bodyKey = key;
    } else if (/^\d+$/.test(key)) {
      bodyKey = `body_${key}`;
    } else {
      bodyKey = `body_${namedIndex}`;
      namedIndex += 1;
    }
    components[bodyKey] = { type: 'text', value };
  }

  return components;
}

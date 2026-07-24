export function appendedMutationValue(before: string, after: string): string | null {
  if (after.length <= before.length) {
    return null;
  }
  if (after.startsWith(before)) {
    return after;
  }

  const insertedLength = after.length - before.length;
  for (let index = 0; index <= before.length; index += 1) {
    if (`${after.slice(0, index)}${after.slice(index + insertedLength)}` === before) {
      return `${before}${after.slice(index, index + insertedLength)}`;
    }
  }
  return null;
}

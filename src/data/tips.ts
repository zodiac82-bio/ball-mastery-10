export interface TipPart {
  text: string;
  bold: boolean;
}

/**
 * 팁 문자열을 일반/강조 조각으로 나눈다.
 * <b>…</b>만 강조로 해석하고 나머지는 전부 글자 그대로 둔다
 * (HTML로 넣지 않으므로 데이터에 다른 태그가 섞여도 실행되지 않는다).
 */
export function parseTip(tip: string): TipPart[] {
  const parts: TipPart[] = [];
  const re = /<b>([\s\S]*?)<\/b>/g;
  let last = 0;
  let m = re.exec(tip);
  while (m) {
    if (m.index > last) parts.push({ text: tip.slice(last, m.index), bold: false });
    const inner = m[1];
    if (inner) parts.push({ text: inner, bold: true });
    last = m.index + m[0].length;
    m = re.exec(tip);
  }
  if (last < tip.length) parts.push({ text: tip.slice(last), bold: false });
  return parts;
}

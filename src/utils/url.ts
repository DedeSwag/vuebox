export type EncodingMode = 'component' | 'form'

export function encodeText(text: string, mode: EncodingMode): string {
  const encoded = encodeURIComponent(text)
  return mode === 'form' ? new URLSearchParams([['v', text]]).toString().slice(2) : encoded
}

export function decodeText(text: string, mode: EncodingMode): string {
  return decodeURIComponent(mode === 'form' ? text.replace(/\+/g, ' ') : text)
}

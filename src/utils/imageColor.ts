/** 将显示位置映射至原图像素，包含右侧、底部边界的保护。 */
export function imagePixelAt(left: number, top: number, displayWidth: number, displayHeight: number, width: number, height: number) {
  if (![left, top, displayWidth, displayHeight, width, height].every(Number.isFinite) || displayWidth <= 0 || displayHeight <= 0 || width < 1 || height < 1)
    throw new Error('图片尺寸无效。')
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(left / displayWidth * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor(top / displayHeight * height))),
  }
}

export function pixelColor(bytes: Uint8ClampedArray) {
  if (bytes.length !== 4) throw new Error('像素数据无效。')
  return { r: bytes[0]!, g: bytes[1]!, b: bytes[2]!, a: bytes[3]! / 255 }
}

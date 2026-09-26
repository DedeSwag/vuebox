import test from 'node:test'
import assert from 'node:assert/strict'
import { imagePixelAt, pixelColor } from '../src/utils/imageColor.ts'
import { colorFormats } from '../src/utils/color.ts'

test('图片取色：缩放、小数尺寸与边缘位置映射到原图像素', () => {
  assert.deepEqual(imagePixelAt(150, 50, 300, 100, 1200, 400), { x: 600, y: 200 })
  assert.deepEqual(imagePixelAt(100.25, 50.125, 200.5, 100.25, 1000, 500), { x: 500, y: 250 })
  assert.deepEqual(imagePixelAt(300, 100, 300, 100, 1200, 400), { x: 1199, y: 399 })
  assert.deepEqual(imagePixelAt(-1, -1, 300, 100, 1200, 400), { x: 0, y: 0 })
  assert.throws(() => imagePixelAt(0, 0, 0, 100, 1200, 400), /尺寸/)
})

test('图片取色：保留半透明、透明像素 Alpha，转换 HEX/RGB/HSL', () => {
  const red = colorFormats(pixelColor(new Uint8ClampedArray([255, 0, 0, 255])))
  assert.equal(red.hex, '#FF0000')
  assert.equal(red.hsl, 'hsla(0, 100%, 50%, 1)')
  const translucent = colorFormats(pixelColor(new Uint8ClampedArray([0, 0, 255, 128])))
  assert.equal(translucent.hex, '#0000FF80')
  assert.equal(translucent.rgb, 'rgba(0, 0, 255, 0.502)')
  assert.equal(colorFormats(pixelColor(new Uint8ClampedArray([0, 0, 0, 0]))).hex, '#00000000')
  assert.throws(() => pixelColor(new Uint8ClampedArray(3)), /像素/)
})

export type UltrasoundQualityScores = {
  sharpnessScore: number
  brightnessScore: number
  contrastScore: number
  noiseScore: number
  sectorScore: number
  qualityScore: number
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]) {
  if (values.length === 0) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function computeQualityFromGrayscale(
  grayscale: Float32Array,
  width: number,
  height: number,
): UltrasoundQualityScores {
  const pixels = Array.from(grayscale)
  const avgBrightness = mean(pixels)
  const contrast = stdDev(pixels)

  const brightnessScore = clampScore(100 - Math.abs(avgBrightness - 128) * 0.8)

  const contrastScore = clampScore(contrast * 1.4)

  let edgeSum = 0
  let edgeCount = 0
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x
      const current = grayscale[idx]
      const right = grayscale[idx + 1]
      const down = grayscale[idx + width]
      edgeSum += Math.abs(current - right) + Math.abs(current - down)
      edgeCount += 2
    }
  }
  const sharpnessScore = clampScore((edgeSum / Math.max(edgeCount, 1)) * 2.2)

  let noiseSum = 0
  let noiseCount = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const idx = y * width + x
      noiseSum += Math.abs(grayscale[idx] - grayscale[idx + 1])
      noiseCount += 1
    }
  }
  const noiseRaw = noiseSum / Math.max(noiseCount, 1)
  const noiseScore = clampScore(100 - noiseRaw * 1.6)

  const centerXStart = Math.floor(width * 0.25)
  const centerXEnd = Math.floor(width * 0.75)
  const centerYStart = Math.floor(height * 0.25)
  const centerYEnd = Math.floor(height * 0.75)

  const centerValues: number[] = []
  const cornerValues: number[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = grayscale[y * width + x]
      const inCenter =
        x >= centerXStart && x < centerXEnd && y >= centerYStart && y < centerYEnd
      const inCorner =
        (x < width * 0.2 || x >= width * 0.8) && (y < height * 0.2 || y >= height * 0.8)

      if (inCenter) centerValues.push(value)
      if (inCorner) cornerValues.push(value)
    }
  }

  const centerAvg = mean(centerValues)
  const cornerAvg = mean(cornerValues.length > 0 ? cornerValues : pixels)
  const sectorDiff = Math.abs(centerAvg - cornerAvg)
  const sectorScore = clampScore(sectorDiff * 1.2 + 35)

  const qualityScore = clampScore(
    sharpnessScore * 0.3 +
      brightnessScore * 0.2 +
      contrastScore * 0.25 +
      noiseScore * 0.1 +
      sectorScore * 0.15,
  )

  return {
    sharpnessScore,
    brightnessScore,
    contrastScore,
    noiseScore,
    sectorScore,
    qualityScore,
  }
}

export function rgbaToGrayscale(data: Uint8ClampedArray, width: number, height: number) {
  const grayscale = new Float32Array(width * height)
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4
    grayscale[i] = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
  }
  return grayscale
}

export async function computeUltrasoundQualityFromImageFile(
  file: File,
): Promise<UltrasoundQualityScores> {
  if (typeof window === 'undefined') {
    return {
      sharpnessScore: 70,
      brightnessScore: 70,
      contrastScore: 70,
      noiseScore: 70,
      sectorScore: 70,
      qualityScore: 70,
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      try {
        const maxSize = 256
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.floor(image.width * scale))
        const height = Math.max(1, Math.floor(image.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('canvas context unavailable'))
          return
        }

        context.drawImage(image, 0, 0, width, height)
        const imageData = context.getImageData(0, 0, width, height)
        const grayscale = rgbaToGrayscale(imageData.data, width, height)
        resolve(computeQualityFromGrayscale(grayscale, width, height))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('image load failed'))
    }

    image.src = objectUrl
  })
}

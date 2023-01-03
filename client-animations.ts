// Function on client that handles calculating proper animation values.

// How it works:
// Websocket server triggers action based on some event and then sends message
// to the client with animation name, timestamp of creation and duration in miliseconds.
// Then here the proper x, y and rotation are calculated with these values for each desired part.
// Parts for player can be - "head", "armLeft" and "armRight" for example.
// Calculated x, y and rotation are then used to draw these parts properly on HTML Canvas Element.

import {
  Animation,
  OldAnimation,
  AnimationData,
  AnimationDataPart,
} from '../../types/types'
import animations from './animations'

// Return object with keys as object parts, e.g. "head", "armLeft" and "armRight",
// if object is of type player. Each key will contain an object
// with calculated values - x, y, rotation.
type ReturnedAnimatedValues = { [key: string]: AnimationDataPart }

const emptyValues: AnimationDataPart = {
  x: 0,
  y: 0,
  rotation: 0,
}

const getAnimationValues = (
  animation: Animation,
  oldAnimation: OldAnimation,
  returnKeys: string[] = []
) => {
  if (!returnKeys.length || !animation) {
    return {}
  }

  const animationData: AnimationData = animations[animation?.name]
  const oldAnimationData: AnimationData = animations[oldAnimation?.name]

  // Calculate animation progress with duration and time elapsed
  // and access proper from and to keys based on progress, e.g.
  // if keys are 40 and 60
  // and progress is 30, from is 0 and to is 40
  // and progress is 50, from is 40 and to is 60
  // and progress is 80, from is 60 and to is 0
  const {
    from,
    to,
    progress: totalProgress,
  } = getAnimationKeys(animation, animationData)
  const {
    from: oldFrom,
    to: oldTo,
    progress: oldProgress,
  } = getAnimationKeys(oldAnimation, oldAnimationData, 'old')

  const oldAnimationValues: ReturnedAnimatedValues = calculateAnimatedValues(
    oldFrom,
    oldTo,
    oldProgress,
    oldAnimation,
    oldAnimationData,
    returnKeys,
    'old',
    from
  )

  const result: ReturnedAnimatedValues = calculateAnimatedValues(
    from,
    to,
    totalProgress,
    animation,
    animationData,
    returnKeys,
    'new',
    undefined,
    oldAnimationValues
  )

  return result
}

const isOldAnimationCanceled = (oldAnimation: Animation) => {
  if (!oldAnimation) {
    return false
  }

  return Date.now() - oldAnimation.createdAt - oldAnimation.duration < 0
}

const calculateProgressBetweenKeys = (
  from: number,
  to: number,
  progress: number
): number => {
  const diff = to - from
  let progressBetween = (progress - from) / diff
  if (progressBetween > 1) progressBetween = 1
  return progressBetween
}

const getAnimationKeys = (
  animation: Animation | OldAnimation,
  animationData: AnimationData,
  type?: 'new' | 'old'
): { from: number; to: number; progress: number } => {
  if (!animation || !animationData) {
    return { from: 0, to: 0, progress: 0 }
  }

  const timeElapsed = (() => {
    if (type == 'old') {
      return (animation as OldAnimation).canceledAt - animation.createdAt
    } else {
      return Date.now() - animation.createdAt
    }
  })()

  let progress = (timeElapsed / animation.duration) * 100
  if (progress > 100) progress = 100

  const keys = Object.keys(animationData)
  let from = 0
  let to = Number(keys[0])

  keys.forEach((key, keyIndex) => {
    if (progress >= Number(key)) {
      from = Number(key)
      if (keys[keyIndex + 1]) {
        to = Number(keys[keyIndex + 1])
      } else {
        to = 100
      }
    }
  })

  return { from, to, progress }
}

const calculateAnimatedValues = (
  from: number,
  to: number,
  progress: number,
  animation: Animation | OldAnimation,
  animationData: AnimationData,
  returnKeys: string[] = [],
  type?: 'old' | 'new',
  baseFrom?: number,
  oldAnimationValues?: ReturnedAnimatedValues
): ReturnedAnimatedValues => {
  // animate from old animation only if it's the beginning of new animation
  // (meaning from is equal to 0) && old animation got canceled before it finished
  if (type == 'old' && !(baseFrom == 0 && isOldAnimationCanceled(animation))) {
    return {}
  }

  if (typeof from != 'number' || typeof to != 'number') {
    return {}
  }

  // calculate progress between current from and to, e.g.
  // 60 (to) - 40 (from) = 20 (max progress)
  // 45 (progress) - 40 (from) = 5 (progress between)
  // 5 / 20 = 0.25 is progress between 40 and 60 when progres is 45
  const progressBetween = calculateProgressBetweenKeys(from, to, progress)

  const result: ReturnedAnimatedValues = {}

  // for each return key (e.g. "head", "armLeft")
  // calculate correct data - x, y, rotation
  returnKeys.forEach((returnKey) => {
    // default everything to zero to prevent errors and later on set values
    // only if everything is calculated correctly
    result[returnKey] = { ...emptyValues }
    let fromValues: AnimationDataPart = { ...emptyValues }
    let toValues: AnimationDataPart = { ...emptyValues }

    // check wheter to animate from old animation or new one
    if (oldAnimationValues && oldAnimationValues[returnKey]) {
      fromValues = oldAnimationValues[returnKey]
    } else if (animationData[from] && animationData[from][returnKey]) {
      fromValues = animationData[from][returnKey]
    }

    // animating to values are always from the new animation ofc
    if (animationData[to] && animationData[to][returnKey]) {
      toValues = animationData[to][returnKey]
    }

    // loop trough all the data (x, y, rotation) and calculate
    // correct values for each key based on progress between keys
    let key: keyof typeof emptyValues
    for (key in emptyValues) {
      result[returnKey][key] =
        fromValues[key] + (toValues[key] - fromValues[key]) * progressBetween
    }
  })

  return result
}

export default getAnimationValues

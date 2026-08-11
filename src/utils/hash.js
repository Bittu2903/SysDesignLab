// djb2 string hash, mapped onto a 0-359 degree ring
export function hashToDegree(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash) % 360;
}

export function hashToUnit(str) {
  return hashToDegree(str) / 360;
}

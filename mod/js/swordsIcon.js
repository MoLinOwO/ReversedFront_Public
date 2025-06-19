// 雙刀圖示染色與快取工具
// 用於將 base64 PNG 動態染色為指定顏色，並快取 DataURL

const knifeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAE4AAABMCAMAAAD0vHEkAAAAMFBMVEVHcEz///////////////////////////////////////////////////////////9EPuwCAAAAD3RSTlMABxUhLT1PW2yCm7LK4PNZhUO6AAACUklEQVR42qWW25aDIAxFBblfkv//25lOmUVtQkPsedPA1qWwyXEcpmdvjy9jzliaOR4BRGg53Ec+UIDYnlcFHyFIFeqR9LwT8S8D6RWs8ESNjHdxgC+BfV7C18C4a/v19rlJi3hJPUYaXtLdFi3gNekYyXhNtzs0QOQ/kkM9z8F6Dr6nWS0N2yxWyhNWWyczMvOPZqrR0dC9lJGmrmm2I41ULyuaadLTC+7zLEfDeHlgxRH+68pDzcagxOD2HmyKyJOHid8vagfNZKSBoBki89DLA2QfUlPIZZrITXD/RVgVZYvNwJgSkKZL5vbATloXJF5nptlBI1aU47iJEk1pMxSMqOCBliY7SLaXngdaGhUWoCAkIcRENJAOfVgeDL3pY4g/iJB0yQJNm6RUiB6H/jua7Ettdyl1k+ruknS76ngcUVpTtjLl7dvERepQ3pwmy9QTMP3SJIO2X1KRfDw4yRIaUHuWQRU9DIRWqAA7osBbfrE8Bag4f1ZTslDUnGFTb0V9AlnKg/hJqFV7ZsdPAmxGYUwiS5PIw3Q0LzkraGhOdCAIzae6c/drXYq8sq3TACjxTNnWqd85VPOWTk+qS5g/juEB3bgTmcC9L996NvaINnlWL3qO4OcP7W+0Yv72W+AXUzWkY+uA4AaN7wXPFvjFWRcdIPhB451jFhpb2gz8miaH8pBZu+l+R9np6o2qjpKuv/BF95aZ3RbgfnuUmL0R7jeDgTPBfL9u79JO7nYxKpxtDG3yyqGMabyjAkya7v34hi8Mmv79+PYxDpo2tk7aD5KZkmts/PnDAAAAAElFTkSuQmCC';

const knifeColorCache = {};

/**
 * 產生染色後的雙刀圖示 DataURL，並快取
 * @param {string} color - 目標顏色（如 '#ff0000' 或 'rgb(255,0,0)'）
 * @param {function} callback - 回傳 DataURL 的 callback
 */
export function getColoredKnifeIcon(color, callback) {
  if (knifeColorCache[color]) {
    callback(knifeColorCache[color]);
    return;
  }
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7; // 染色強度可調
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    const dataUrl = canvas.toDataURL();
    knifeColorCache[color] = dataUrl;
    callback(dataUrl);
  };
  img.src = 'data:image/png;base64,' + knifeBase64;
}

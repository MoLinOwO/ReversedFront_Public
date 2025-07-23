// 共用工具函式
export function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

export function $all(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
}
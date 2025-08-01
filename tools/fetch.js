export const settings = {
    defaultTimeout: 5000,
}
export function fetchWithTimeout(url, options = {}, timeout = null) {
    if (timeout === null) {
        timeout = settings.defaultTimeout
    }
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    return fetch(url, {
        ...options,
        signal: controller.signal,
    }).finally(() => clearTimeout(id))
}
